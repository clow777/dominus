/** Classificação e métricas de clientes (funções puras, testáveis sem banco). */

export const VIP_MIN_VOLUME_CENTS = 1_000_00;
export const ACTIVE_WINDOW_DAYS = 30;

export interface CustomerFacts {
  volume: number;
  approvedCount: number;
  lastPurchaseAt: Date | null;
  blocked: boolean;
}

export type CustomerSegment = "novo" | "recorrente" | "vip";
export type CustomerStatus = "ativo" | "inativo" | "bloqueado";

export function segmentOf(c: Pick<CustomerFacts, "volume" | "approvedCount">): CustomerSegment {
  if (c.volume >= VIP_MIN_VOLUME_CENTS) return "vip";
  return c.approvedCount >= 2 ? "recorrente" : "novo";
}

/** Ativo = comprou nos últimos 30 dias e não está bloqueado. */
export function statusOf(c: Pick<CustomerFacts, "lastPurchaseAt" | "blocked">, now = new Date()): CustomerStatus {
  if (c.blocked) return "bloqueado";
  if (!c.lastPurchaseAt) return "inativo";
  return now.getTime() - c.lastPurchaseAt.getTime() <= ACTIVE_WINDOW_DAYS * 86_400_000 ? "ativo" : "inativo";
}

export function customerMetrics(rows: CustomerFacts[], approvedTransactions: number, now = new Date()) {
  const total = rows.length;
  const volume = rows.reduce((s, r) => s + r.volume, 0);
  const active24h = rows.filter((r) => r.lastPurchaseAt && now.getTime() - r.lastPurchaseAt.getTime() <= 86_400_000).length;
  const seg = { novo: 0, recorrente: 0, vip: 0 };
  for (const r of rows) seg[segmentOf(r)]++;
  return {
    total,
    active24h,
    ltv: total === 0 ? 0 : Math.round(volume / total),
    ticket: approvedTransactions === 0 ? 0 : Math.round(volume / approvedTransactions),
    segments: seg,
    segmentPercent: {
      novo: total === 0 ? 0 : Math.round((seg.novo / total) * 100),
      recorrente: total === 0 ? 0 : Math.round((seg.recorrente / total) * 100),
      vip: total === 0 ? 0 : Math.round((seg.vip / total) * 100),
    },
  };
}

/** Evita injeção de fórmulas ao abrir o CSV no Excel e escapa aspas, vírgulas e quebras de linha. */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number)[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
}
