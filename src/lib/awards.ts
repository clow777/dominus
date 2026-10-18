export type PieceKind = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";

export interface Award {
  key: string;
  label: string;
  /** Meta em centavos de volume aprovado. */
  goal: number;
  piece: PieceKind;
  title: string;
  reward: string;
}

export const AWARDS: readonly Award[] = [
  { key: "10k", label: "10 MIL", goal: 10_000_00, piece: "pawn", title: "Peão Dominus", reward: "Saque em 30min + Selo Peão" },
  { key: "100k", label: "100 MIL", goal: 100_000_00, piece: "knight", title: "Cavalo Dominus", reward: "Selo Cavalo Dominus" },
  { key: "500k", label: "500 MIL", goal: 500_000_00, piece: "bishop", title: "Bispo Dominus", reward: "Selo Bispo Dominus" },
  { key: "1m", label: "1 MILHÃO", goal: 1_000_000_00, piece: "rook", title: "Torre Dominus", reward: "Gerente exclusivo + Troféu Torre" },
  { key: "5m", label: "5 MILHÕES", goal: 5_000_000_00, piece: "queen", title: "Rainha Dominus", reward: "Anel Dominus + Viagem Dubai + Selo Rei" },
];

export function awardProgress(volume: number) {
  return AWARDS.map((a) => ({
    ...a,
    reached: volume >= a.goal,
    percent: Math.min(100, Math.floor((volume / a.goal) * 100)),
    /** Quanto falta para a meta, em centavos (0 quando batida). */
    missing: Math.max(0, a.goal - volume),
  }));
}

/**
 * Para cada mês (do mais antigo ao mais novo), a meta que foi batida nele, se houver.
 * `baseline` é o faturamento anterior à janela de meses informada.
 */
export function monthlyMilestones(months: readonly { month: string; volume: number }[], baseline: number) {
  let total = baseline;
  return months.map((m) => {
    const before = total;
    total += m.volume;
    const hit = AWARDS.filter((a) => before < a.goal && total >= a.goal).at(-1) ?? null;
    return { ...m, cumulative: total, hit };
  });
}
