import { describe, expect, it } from "vitest";

import { cpfSchema, formatCPF, isValidCPF } from "@/lib/validations/cpf";

describe("isValidCPF", () => {
  it("aceita CPFs válidos com e sem máscara", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
    expect(isValidCPF("111.444.777-35")).toBe(true);
  });

  it("recusa dígitos verificadores errados", () => {
    expect(isValidCPF("529.982.247-24")).toBe(false);
    expect(isValidCPF("529.982.247-35")).toBe(false);
  });

  it("recusa sequências repetidas e formatos inválidos", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
    expect(isValidCPF("1234567890")).toBe(false);
    expect(isValidCPF("529.982.247-255")).toBe(false);
    expect(isValidCPF("abc")).toBe(false);
  });
});

describe("cpfSchema / formatCPF", () => {
  it("usa a mensagem esperada", () => {
    const r = cpfSchema.safeParse("123.456.789-00");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("CPF inválido");
  });

  it("formata progressivamente", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
    expect(formatCPF("5299")).toBe("529.9");
  });
});
