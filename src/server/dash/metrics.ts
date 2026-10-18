import "server-only";

import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import { averageTicket, conversionRate, positionOf, variation } from "@/lib/dash-math";
import { dashPeriodDays, dashPeriodStart, monthRanges, type DashPeriod } from "@/lib/dash-period";
import type {
  DesempenhoResponse,
  KpisResponse,
  MetricasMesResponse,
  RankingResponse,
} from "@/lib/dash-types";
import { getDb } from "@/server/db/client";
import { botStarts, organizations, transactions } from "@/server/db/schema";

/** Conta cada /start (false) ou um por usuário do Telegram por dia (true). */
export const DEDUPE_STARTS_PER_DAY = false;

const num = (v: string | number | null | undefined) => Number(v ?? 0);
const SP = sql.raw("'America/Sao_Paulo'"); // literal fixo: como parâmetro, select e group by não casam

/** Instante em que a venda foi paga (aprovada). */
const paidAt = sql`coalesce(${transactions.approvedAt}, ${transactions.createdAt})`;
const live = (orgId: string) => and(eq(transactions.organizationId, orgId), eq(transactions.mode, "live"));
const approved = eq(transactions.status, "approved");

const startsCount = DEDUPE_STARTS_PER_DAY
  ? sql<string>`count(distinct (${botStarts.telegramUserId}, (${botStarts.createdAt} at time zone ${SP})::date))`
  : sql<string>`count(*)`;

/* Cache em memória por vendedor/período. Com várias instâncias, trocar por Redis. */
const TTL_MS = 20_000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(orgId: string, key: string, load: () => Promise<T>): Promise<T> {
  const k = `${orgId}:${key}`;
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await load();
  cache.set(k, { at: Date.now(), value });
  return value;
}

/** Chamar quando um pagamento for confirmado, para os cards refletirem na hora. */
export function invalidateDashboardCache(orgId: string) {
  for (const k of cache.keys()) if (k.startsWith(`${orgId}:`)) cache.delete(k);
}

async function summary(orgId: string, from: Date, to: Date | null = null) {
  const db = getDb();
  const created = [live(orgId), gte(transactions.createdAt, from), ...(to ? [lt(transactions.createdAt, to)] : [])];
  const paid = [live(orgId), approved, gte(paidAt, from), ...(to ? [lt(paidAt, to)] : [])];
  const startFilters = [eq(botStarts.organizationId, orgId), gte(botStarts.createdAt, from), ...(to ? [lt(botStarts.createdAt, to)] : [])];
  const [[s], [g], [p]] = await Promise.all([
    db.select({ n: startsCount }).from(botStarts).where(and(...startFilters)),
    db.select({ v: sql<string>`coalesce(sum(${transactions.amount}), 0)` }).from(transactions).where(and(...created)),
    db
      .select({ v: sql<string>`coalesce(sum(${transactions.amount}), 0)`, n: sql<string>`count(*)` })
      .from(transactions)
      .where(and(...paid)),
  ]);
  return { starts: num(s?.n), generated: num(g?.v), confirmed: num(p?.v), sales: num(p?.n) };
}

export function getKpis(orgId: string, period: DashPeriod): Promise<KpisResponse> {
  return cached(orgId, `kpis:${period}`, async () => {
    const [cur, d7, d30] = await Promise.all([
      summary(orgId, dashPeriodStart(period)),
      summary(orgId, dashPeriodStart("7d")),
      summary(orgId, dashPeriodStart("30d")),
    ]);
    const conv = (x: typeof cur) => conversionRate(x.sales, x.starts);
    return {
      starts: { atual: cur.starts, d7: d7.starts, d30: d30.starts },
      receitaGerada: { atual: cur.generated, d7: d7.generated, d30: d30.generated },
      receitaConfirmada: { atual: cur.confirmed, d7: d7.confirmed, d30: d30.confirmed },
      conversao: { atual: conv(cur), d7: conv(d7), d30: conv(d30), semDados: cur.starts === 0 },
    };
  });
}

export function getDesempenho(orgId: string, period: DashPeriod): Promise<DesempenhoResponse> {
  return cached(orgId, `desempenho:${period}`, async () => {
    const db = getDb();
    const from = dashPeriodStart(period);
    const dayOf = (col: unknown) => sql<string>`to_char((${col}) at time zone ${SP}, 'YYYY-MM-DD')`;

    const startDay = dayOf(botStarts.createdAt);
    const genDay = dayOf(transactions.createdAt);
    const paidDay = dayOf(paidAt);

    const [starts, generated, paid] = await Promise.all([
      db
        .select({ day: startDay, n: startsCount })
        .from(botStarts)
        .where(and(eq(botStarts.organizationId, orgId), gte(botStarts.createdAt, from)))
        .groupBy(startDay),
      db
        .select({ day: genDay, v: sql<string>`sum(${transactions.amount})` })
        .from(transactions)
        .where(and(live(orgId), gte(transactions.createdAt, from)))
        .groupBy(genDay),
      db
        .select({ day: paidDay, v: sql<string>`sum(${transactions.amount})` })
        .from(transactions)
        .where(and(live(orgId), approved, gte(paidAt, from)))
        .groupBy(paidDay),
    ]);

    const byDay = <T extends { day: string }>(rows: T[], pick: (r: T) => number) => new Map(rows.map((r) => [r.day, pick(r)]));
    const sMap = byDay(starts, (r) => num(r.n));
    const gMap = byDay(generated, (r) => num(r.v));
    const pMap = byDay(paid, (r) => num(r.v));

    const serie = dashPeriodDays(period).map((data) => ({
      data,
      starts: sMap.get(data) ?? 0,
      vendasGeradas: gMap.get(data) ?? 0,
      vendasPagas: pMap.get(data) ?? 0,
    }));
    const totais = serie.reduce(
      (t, p) => ({ starts: t.starts + p.starts, vendasGeradas: t.vendasGeradas + p.vendasGeradas, vendasPagas: t.vendasPagas + p.vendasPagas }),
      { starts: 0, vendasGeradas: 0, vendasPagas: 0 },
    );
    return { serie, totais };
  });
}

/** Ranking do mês entre todos os vendedores. Expõe só nome de exibição e valor confirmado. */
export function getRanking(orgId: string, limit = 5): Promise<RankingResponse> {
  return cached(orgId, `ranking:${limit}`, async () => {
    const { current } = monthRanges();
    const total = sql<string>`sum(${transactions.amount})`;
    const rows = await getDb()
      .select({ id: organizations.id, nome: organizations.name, valor: total })
      .from(transactions)
      .innerJoin(organizations, eq(organizations.id, transactions.organizationId))
      .where(and(eq(transactions.mode, "live"), approved, gte(paidAt, current.start), lt(paidAt, current.end)))
      .groupBy(organizations.id)
      .orderBy(desc(total), organizations.id);

    const ordered = rows.map((r) => ({ id: r.id, nome: r.nome, valor: num(r.valor) }));
    const mine = ordered.find((r) => r.id === orgId);
    const [self] = await getDb().select({ nome: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);

    return {
      top: ordered.slice(0, limit).map((r, i) => ({
        posicao: i + 1,
        nome: r.nome,
        avatarUrl: null,
        valor: r.valor,
        tier: i === 0 ? ("ALPHA" as const) : null,
      })),
      voce: {
        posicao: positionOf(orgId, ordered),
        nome: self?.nome ?? "VOCÊ",
        avatarUrl: null,
        valor: mine?.valor ?? 0,
        tier: "OPERADOR REGISTRADO" as const,
      },
    };
  });
}

/** Mês corrente (dia 01 até o último dia) contra o mês anterior. */
export function getMetricasMes(orgId: string): Promise<MetricasMesResponse> {
  return cached(orgId, "metricas-mes", async () => {
    const { current, previous } = monthRanges();
    const [cur, prev] = await Promise.all([summary(orgId, current.start, current.end), summary(orgId, previous.start, previous.end)]);
    const m = (x: typeof cur) => ({
      conversao: conversionRate(x.sales, x.starts),
      ticket: averageTicket(x.confirmed, x.sales),
      sales: x.sales,
    });
    const a = m(cur);
    const b = m(prev);
    return {
      conversao: { valor: a.conversao, variacao: variation(a.conversao, b.conversao) },
      ticketMedio: { valor: a.ticket, variacao: variation(a.ticket, b.ticket) },
      totalVendas: { valor: a.sales, variacao: variation(a.sales, b.sales) },
    };
  });
}
