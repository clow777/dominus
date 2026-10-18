import { z } from "zod";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function checkDigit(digits: number[], length: number): number {
  let sum = 0;
  for (let i = 0; i < length; i++) sum += digits[i]! * (length + 1 - i);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

/** Valida o CPF pelo algoritmo oficial dos dois dígitos verificadores. Aceita com ou sem máscara. */
export function isValidCPF(value: string): boolean {
  if (!/^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/.test(value.trim())) return false;
  const raw = onlyDigits(value);
  // Sequências repetidas (111.111.111-11…) passam no cálculo, mas não são CPFs válidos.
  if (/^(\d)\1{10}$/.test(raw)) return false;
  const digits = [...raw].map(Number);
  return checkDigit(digits, 9) === digits[9] && checkDigit(digits, 10) === digits[10];
}

export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export const cpfSchema = z.string().refine(isValidCPF, { message: "CPF inválido" });
