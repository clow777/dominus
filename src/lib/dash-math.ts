/** Conversão em %: vendas pagas ÷ starts (0 sem starts). */
export const conversionRate = (sales: number, starts: number) => (starts === 0 ? 0 : (sales / starts) * 100);

/** Ticket médio em centavos (0 sem vendas). */
export const averageTicket = (confirmedCents: number, sales: number) => (sales === 0 ? 0 : Math.round(confirmedCents / sales));

/** Variação % contra o período anterior; anterior 0 e atual > 0 → 100. */
export function variation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/** Posição da organização no ranking; sem vendas, fica depois de quem vendeu. */
export function positionOf(orgId: string, ordered: { id: string }[]): number {
  const i = ordered.findIndex((r) => r.id === orgId);
  return i === -1 ? ordered.length + 1 : i + 1;
}
