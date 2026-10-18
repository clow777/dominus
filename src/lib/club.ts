/** Níveis do Dominus Club, por volume aprovado acumulado, em centavos. */
export const CLUB_LEVELS = [
  { name: "Bronze", threshold: 0 },
  { name: "Prata", threshold: 10_000_00 },
  { name: "Ouro", threshold: 100_000_00 },
  { name: "Platina", threshold: 1_000_000_00 },
  { name: "Diamante", threshold: 10_000_000_00 },
] as const;

export interface ClubProgress {
  current: string;
  next: string | null;
  /** 0–100 dentro do nível atual. */
  percent: number;
  remaining: number;
}

export function clubProgress(volumeCents: number): ClubProgress {
  let index = 0;
  CLUB_LEVELS.forEach((level, i) => {
    if (volumeCents >= level.threshold) index = i;
  });
  const current = CLUB_LEVELS[index]!;
  const next = CLUB_LEVELS[index + 1];
  if (!next) return { current: current.name, next: null, percent: 100, remaining: 0 };
  const span = next.threshold - current.threshold;
  return {
    current: current.name,
    next: next.name,
    percent: Math.min(100, Math.floor(((volumeCents - current.threshold) / span) * 100)),
    remaining: next.threshold - volumeCents,
  };
}
