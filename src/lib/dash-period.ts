import { startOfDaySP } from "@/lib/period";

export const DASH_PERIODS = ["today", "7d", "30d"] as const;
export type DashPeriod = (typeof DASH_PERIODS)[number];

export const DASH_PERIOD_LABELS: Record<DashPeriod, string> = {
  today: "Hoje",
  "7d": "7 Dias",
  "30d": "30 Dias",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

export function parseDashPeriod(value: string | string[] | null | undefined): DashPeriod {
  const v = Array.isArray(value) ? value[0] : value;
  return (DASH_PERIODS as readonly string[]).includes(v ?? "") ? (v as DashPeriod) : "today";
}

/** Início do período (00:00 em São Paulo). `today` = hoje; `7d`/`30d` incluem hoje. */
export function dashPeriodStart(period: DashPeriod, now: Date = new Date()): Date {
  const today = startOfDaySP(now);
  const days = period === "today" ? 0 : period === "7d" ? 6 : 29;
  return new Date(today.getTime() - days * DAY_MS);
}

/** Dias (YYYY-MM-DD, fuso de São Paulo) do início do período até hoje. */
export function dashPeriodDays(period: DashPeriod, now: Date = new Date()): string[] {
  const start = dashPeriodStart(period, now).getTime();
  const today = startOfDaySP(now).getTime();
  const days: string[] = [];
  for (let t = start; t <= today; t += DAY_MS) {
    days.push(new Date(t - SP_OFFSET_MS).toISOString().slice(0, 10));
  }
  return days;
}

/** [início, fim) do mês corrente e do anterior, em São Paulo. */
export function monthRanges(now: Date = new Date()) {
  const local = new Date(now.getTime() - SP_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const at = (year: number, month: number) => new Date(Date.UTC(year, month, 1) + SP_OFFSET_MS);
  return {
    current: { start: at(y, m), end: at(y, m + 1) },
    previous: { start: at(y, m - 1), end: at(y, m) },
  };
}
