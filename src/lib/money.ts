/**
 * Valores monetários da Dominus.
 *
 * Regra: todo valor é um inteiro em centavos (menor unidade da moeda).
 * Nada de ponto flutuante em cálculo financeiro. Multiplicações que podem
 * estourar Number.MAX_SAFE_INTEGER são feitas em BigInt.
 */

export type CurrencyCode = "BRL";

declare const centsBrand: unique symbol;
/** Inteiro seguro em centavos. Construa apenas com `cents()` ou `parseAmount()`. */
export type Cents = number & { readonly [centsBrand]: true };

export class MoneyError extends Error {
  override name = "MoneyError";
}

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`Valor em centavos inválido: ${value}. Use um inteiro seguro.`);
  }
  return value as Cents;
}

/** Valor positivo para cobranças e reembolsos. */
export function positiveCents(value: number): Cents {
  const v = cents(value);
  if (v <= 0) throw new MoneyError("O valor deve ser maior que zero.");
  return v;
}

const AMOUNT_PATTERN = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$|^(\d+)(?:\.(\d{1,2}))$/;

/**
 * Converte texto digitado ("1.234,56", "1234,5", "1234.56", "10") em centavos.
 * Rejeita sinais, separadores ambíguos e mais de duas casas decimais.
 */
export function parseAmount(input: string): Cents {
  const raw = input.trim().replace(/^R\$\s?/, "");
  const match = AMOUNT_PATTERN.exec(raw);
  if (!match) throw new MoneyError(`Valor monetário inválido: "${input}".`);

  const [, intBr, decBr, intDot, decDot] = match;
  const integerPart = (intBr ?? intDot ?? "").replace(/\./g, "");
  const decimalPart = (decBr ?? decDot ?? "").padEnd(2, "0");

  const total = BigInt(integerPart) * 100n + BigInt(decimalPart || "0");
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new MoneyError("Valor acima do limite suportado.");
  return cents(Number(total));
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: Cents, currency: CurrencyCode = "BRL", locale = "pt-BR"): string {
  const key = `${locale}:${currency}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 });
    formatters.set(key, fmt);
  }
  // Divisão apenas para exibição; nunca reutilize o resultado em cálculo.
  return fmt.format(value / 100);
}

export function addCents(...values: Cents[]): Cents {
  let total = 0n;
  for (const v of values) total += BigInt(v);
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new MoneyError("Soma fora do limite suportado.");
  }
  return cents(Number(total));
}

export function subtractCents(a: Cents, b: Cents): Cents {
  return addCents(a, cents(-b));
}

export type RoundingMode = "half-up" | "half-even";

/** Divide n/d (d > 0) com arredondamento explícito, em BigInt. */
function divRound(n: bigint, d: bigint, mode: RoundingMode): bigint {
  const negative = n < 0n;
  const absN = negative ? -n : n;
  let q = absN / d;
  const r = absN % d;
  const twice = r * 2n;
  if (twice > d || (twice === d && (mode === "half-up" || q % 2n === 1n))) q += 1n;
  return negative ? -q : q;
}

/** Tarifa contratual: percentual em basis points (1 bp = 0,01%) + valor fixo. */
export interface FeeSchedule {
  percentBps: number;
  fixed: Cents;
  rounding: RoundingMode;
}

export function computeFee(amount: Cents, schedule: FeeSchedule): Cents {
  if (!Number.isInteger(schedule.percentBps) || schedule.percentBps < 0 || schedule.percentBps > 10_000) {
    throw new MoneyError("percentBps deve ser um inteiro entre 0 e 10000.");
  }
  if (schedule.fixed < 0) throw new MoneyError("A tarifa fixa não pode ser negativa.");
  const variable = divRound(BigInt(amount) * BigInt(schedule.percentBps), 10_000n, schedule.rounding);
  return cents(Number(variable + BigInt(schedule.fixed)));
}

/** Valor líquido = bruto − tarifa. Nunca negativo: tarifa maior que o valor é erro de configuração. */
export function computeNet(amount: Cents, schedule: FeeSchedule): { fee: Cents; net: Cents } {
  const fee = computeFee(amount, schedule);
  if (fee > amount) throw new MoneyError("A tarifa excede o valor da transação. Revise a configuração contratual.");
  return { fee, net: subtractCents(amount, fee) };
}

/**
 * Divide um valor em partes proporcionais sem perder centavos
 * (o resto vai, um centavo por vez, para as primeiras partes).
 */
export function allocate(amount: Cents, ratios: number[]): Cents[] {
  if (ratios.length === 0 || ratios.some((r) => !Number.isInteger(r) || r < 0)) {
    throw new MoneyError("As proporções devem ser inteiros não negativos.");
  }
  const sum = ratios.reduce((a, b) => a + b, 0);
  if (sum === 0) throw new MoneyError("A soma das proporções deve ser maior que zero.");
  const total = BigInt(amount);
  const parts = ratios.map((r) => (total * BigInt(r)) / BigInt(sum));
  let remainder = total - parts.reduce((a, b) => a + b, 0n);
  for (let i = 0; remainder > 0n; i = (i + 1) % parts.length) {
    if (ratios[i] === 0) continue;
    parts[i] = (parts[i] ?? 0n) + 1n;
    remainder -= 1n;
  }
  return parts.map((p) => cents(Number(p)));
}
