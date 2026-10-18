import "server-only";

import { and, count, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";

import { FLOW_LIMIT, NOTIFICATION_TYPES } from "@/lib/preferences";
import { periodRange, type Period } from "@/lib/period";
import { getDb } from "@/server/db/client";
import {
  flows,
  flowSteps,
  notificationPreferences,
  paymentCustomers,
  paymentIntents,
  platformGateways,
  trackingConfigs,
  transactions,
  userProfiles,
} from "@/server/db/schema";

const num = (value: string | number | null | undefined) => Number(value ?? 0);

export async function getGatewayStatuses(orgId: string): Promise<Record<string, string>> {
  const rows = await getDb()
    .select({ key: platformGateways.gatewayKey, status: platformGateways.status })
    .from(platformGateways)
    .where(eq(platformGateways.organizationId, orgId));
  return Object.fromEntries(rows.map((r) => [r.key, r.status]));
}

export async function getTrackingStates(orgId: string) {
  const rows = await getDb()
    .select({
      platform: trackingConfigs.platform,
      enabled: trackingConfigs.enabled,
      configured: sql<boolean>`${trackingConfigs.valueEncrypted} is not null`,
      eventsSent: trackingConfigs.eventsSent,
    })
    .from(trackingConfigs)
    .where(eq(trackingConfigs.organizationId, orgId));
  return Object.fromEntries(rows.map((r) => [r.platform, r]));
}

export async function getNotificationPrefs(userId: string): Promise<Record<string, boolean>> {
  const rows = await getDb()
    .select({ key: notificationPreferences.key, enabled: notificationPreferences.enabled })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.enabled]));
  return Object.fromEntries(NOTIFICATION_TYPES.map((n) => [n.key, saved[n.key] ?? n.defaultOn]));
}

export async function getProfile(userId: string) {
  const [row] = await getDb().select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return { phone: row?.phone ?? "", cpf: row?.cpf ?? "", avatarUrl: row?.avatarUrl ?? null };
}

export async function listFlows(orgId: string) {
  return getDb()
    .select({
      id: flows.id,
      name: flows.name,
      kind: flows.kind,
      status: flows.status,
      botId: flows.botId,
      steps: count(flowSteps.id),
    })
    .from(flows)
    .leftJoin(flowSteps, eq(flowSteps.flowId, flows.id))
    .where(eq(flows.organizationId, orgId))
    .groupBy(flows.id)
    .orderBy(desc(flows.createdAt))
    .limit(FLOW_LIMIT);
}

export async function getFlow(orgId: string, flowId: string) {
  const db = getDb();
  const [flow] = await db
    .select()
    .from(flows)
    .where(and(eq(flows.organizationId, orgId), eq(flows.id, flowId)))
    .limit(1);
  if (!flow) return null;
  const steps = await db.select().from(flowSteps).where(eq(flowSteps.flowId, flow.id)).orderBy(flowSteps.position);
  return { flow, steps };
}

/** Volume aprovado live acumulado, em centavos. */
export async function getApprovedVolume(orgId: string): Promise<number> {
  const [row] = await getDb()
    .select({ v: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.organizationId, orgId), eq(transactions.mode, "live"), eq(transactions.status, "approved")));
  return num(row?.v);
}

/** Posição global por faturamento aprovado (1 = maior). Null enquanto a organização não faturou. */
export async function getOrgRank(volume: number): Promise<number | null> {
  if (volume <= 0) return null;
  const db = getDb();
  const totals = db
    .select({ v: sql<string>`sum(${transactions.amount})`.as("v") })
    .from(transactions)
    .where(and(eq(transactions.mode, "live"), eq(transactions.status, "approved")))
    .groupBy(transactions.organizationId)
    .as("totals");
  const [row] = await db.select({ n: count() }).from(totals).where(sql`${totals.v} > ${volume}`);
  return (row?.n ?? 0) + 1;
}

/** Faturamento aprovado por mês (fuso de São Paulo), do mais recente ao mais antigo. */
export async function getMonthlyRevenue(orgId: string) {
  const month = sql<string>`to_char(${transactions.createdAt} at time zone 'America/Sao_Paulo', 'YYYY-MM')`;
  const rows = await getDb()
    .select({ month, volume: sql<string>`sum(${transactions.amount})`, count: count() })
    .from(transactions)
    .where(and(eq(transactions.organizationId, orgId), eq(transactions.mode, "live"), eq(transactions.status, "approved")))
    .groupBy(month)
    .orderBy(desc(month))
    .limit(12);
  return rows.map((r) => ({ month: r.month, volume: num(r.volume), count: r.count }));
}

/** Atividade do período: leads (clientes novos), PIX gerados, pagamentos aprovados e receita. */
export async function getActivity(orgId: string, period: Period) {
  const db = getDb();
  const { start, end } = periodRange(period);
  const tx: SQL[] = [eq(transactions.organizationId, orgId), eq(transactions.mode, "live")];
  const leads: SQL[] = [eq(paymentCustomers.organizationId, orgId)];
  if (start) {
    tx.push(gte(transactions.createdAt, start));
    leads.push(gte(paymentCustomers.createdAt, start));
  }
  if (end) {
    tx.push(lt(transactions.createdAt, end));
    leads.push(lt(paymentCustomers.createdAt, end));
  }
  const [[t], [l]] = await Promise.all([
    db
      .select({
        pix: sql<string>`count(*) filter (where ${transactions.method} = 'pix')`,
        payments: sql<string>`count(*) filter (where ${transactions.status} = 'approved')`,
        revenue: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.status} = 'approved'), 0)`,
      })
      .from(transactions)
      .where(and(...tx)),
    db
      .select({ n: count() })
      .from(paymentCustomers)
      .where(and(...leads)),
  ]);
  return { leads: l?.n ?? 0, pixGenerated: num(t?.pix), payments: num(t?.payments), revenue: num(t?.revenue) };
}

/** Saúde do PIX nas últimas 24h, a partir das transações da própria organização. */
export async function getPixStatus24h(orgId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await getDb()
    .select({
      total: count(),
      ok: sql<string>`count(*) filter (where ${transactions.status} = 'approved')`,
      unstable: sql<string>`count(*) filter (where ${transactions.status} in ('processing','awaiting_payment','created'))`,
      down: sql<string>`count(*) filter (where ${transactions.status} in ('declined','expired'))`,
    })
    .from(transactions)
    .innerJoin(paymentIntents, eq(paymentIntents.id, transactions.paymentIntentId))
    .where(and(eq(transactions.organizationId, orgId), eq(transactions.method, "pix"), gte(transactions.createdAt, since)));
  const total = row?.total ?? 0;
  const ok = num(row?.ok);
  return { total, ok, unstable: num(row?.unstable), down: num(row?.down), conversion: total === 0 ? 0 : (ok / total) * 100 };
}
