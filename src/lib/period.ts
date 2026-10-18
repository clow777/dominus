export const PERIODS = ["hoje", "ontem", "7dias", "30dias", "total"] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABELS: Record<Period, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "7dias": "7 dias",
  "30dias": "30 dias",
  total: "Total",
};

export function parsePeriod(value: string | string[] | undefined): Period {
  const v = Array.isArray(value) ? value[0] : value;
  return (PERIODS as readonly string[]).includes(v ?? "") ? (v as Period) : "30dias";
}

const DAY_MS = 24 * 60 * 60 * 1000;
// America/Sao_Paulo é UTC-3 fixo desde que o horário de verão acabou (2019).
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Início (00:00 em São Paulo) do dia que contém `now`, como instante UTC. */
export function startOfDaySP(now: Date): Date {
  const local = now.getTime() - SP_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS + SP_OFFSET_MS);
}

/** Intervalo [start, end) do período. `null` em um lado significa sem limite. */
export function periodRange(period: Period, now: Date = new Date()): { start: Date | null; end: Date | null } {
  const today = startOfDaySP(now);
  switch (period) {
    case "hoje":
      return { start: today, end: null };
    case "ontem":
      return { start: new Date(today.getTime() - DAY_MS), end: today };
    case "7dias":
      return { start: new Date(today.getTime() - 6 * DAY_MS), end: null };
    case "30dias":
      return { start: new Date(today.getTime() - 29 * DAY_MS), end: null };
    case "total":
      return { start: null, end: null };
  }
}
