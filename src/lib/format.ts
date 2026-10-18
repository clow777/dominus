const nf = (digits: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Centavos → `R$ 1.234,56`. */
export const brl = (cents: number) => `R$ ${nf(2).format(cents / 100)}`;

/** Centavos → `R$ 1234.56` (ponto decimal, sem milhar). */
export const brlDot = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;

/** Centavos → `R$ 12K` / `R$ 0.0K` (ponto decimal). */
export const brlK = (cents: number, digits = 0) => `R$ ${(cents / 100000).toFixed(digits)}K`;

/** `0.0%` ou `0.00%`, com ponto decimal. */
export const pct = (value: number, digits = 1) => `${value.toFixed(digits)}%`;

/** `2026-10-17` → `17/10`. */
export const dayLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** `1` → `RNK-01`. */
export const rank = (position: number) => `RNK-${String(position).padStart(2, "0")}`;
