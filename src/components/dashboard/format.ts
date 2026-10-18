import { cents, formatMoney } from "@/lib/money";

export const brl = (value: number) => formatMoney(cents(Math.round(value)));

export const METHOD_LABELS = {
  pix: "PIX IN",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  boleto: "Boleto",
} as const;

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
export const formatDateTime = (d: Date) => dateFmt.format(d);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
