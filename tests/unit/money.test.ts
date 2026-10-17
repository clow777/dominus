import { describe, expect, it } from "vitest";

import {
  MoneyError,
  addCents,
  allocate,
  cents,
  computeFee,
  computeNet,
  formatMoney,
  parseAmount,
  positiveCents,
  subtractCents,
} from "@/lib/money";

describe("cents", () => {
  it("aceita inteiros seguros", () => {
    expect(cents(0)).toBe(0);
    expect(cents(123)).toBe(123);
  });
  it("rejeita frações, NaN e valores inseguros", () => {
    expect(() => cents(1.5)).toThrow(MoneyError);
    expect(() => cents(Number.NaN)).toThrow(MoneyError);
    expect(() => cents(Number.MAX_SAFE_INTEGER + 2)).toThrow(MoneyError);
  });
  it("positiveCents rejeita zero e negativos", () => {
    expect(() => positiveCents(0)).toThrow(MoneyError);
    expect(() => positiveCents(-1)).toThrow(MoneyError);
  });
});

describe("parseAmount", () => {
  it.each([
    ["10", 1000],
    ["10,5", 1050],
    ["10,05", 1005],
    ["1.234,56", 123456],
    ["1.234.567,89", 123456789],
    ["1234.56", 123456],
    ["12.5", 1250],
    ["R$ 99,90", 9990],
    ["  0,01 ", 1],
  ])("converte %s em %i centavos", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it("interpreta ponto com três dígitos como separador de milhar (pt-BR)", () => {
    expect(parseAmount("1.234")).toBe(123400);
  });

  it.each(["", "abc", "-10", "10,123", "1,234.56", "1.23.4", "10,", ",50", "1e3"])("rejeita %j", (input) => {
    expect(() => parseAmount(input)).toThrow(MoneyError);
  });

  it("não perde precisão onde float perderia", () => {
    // 0,1 + 0,2 em float = 0,30000000000000004
    expect(addCents(parseAmount("0,10"), parseAmount("0,20"))).toBe(30);
  });
});

describe("formatMoney", () => {
  it("formata em BRL pt-BR", () => {
    const out = formatMoney(cents(123456)).replace(/ /g, " ");
    expect(out).toBe("R$ 1.234,56");
  });
  it("formata negativos", () => {
    expect(formatMoney(cents(-500)).replace(/ /g, " ")).toMatch(/-\s?R\$ 5,00/);
  });
});

describe("soma e subtração", () => {
  it("soma vários valores", () => {
    expect(addCents(cents(1), cents(2), cents(3))).toBe(6);
  });
  it("subtrai", () => {
    expect(subtractCents(cents(1000), cents(1))).toBe(999);
  });
  it("detecta estouro", () => {
    expect(() => addCents(cents(Number.MAX_SAFE_INTEGER), cents(1))).toThrow(MoneyError);
  });
});

describe("computeFee / computeNet", () => {
  it("aplica percentual em basis points mais tarifa fixa", () => {
    // 3,99% de R$ 100,00 + R$ 0,39 = R$ 4,38
    expect(computeFee(cents(10_000), { percentBps: 399, fixed: cents(39), rounding: "half-up" })).toBe(438);
  });

  it("arredonda meio centavo para cima em half-up", () => {
    // 1,5% de R$ 1,01 = 1,515 centavo → 2
    expect(computeFee(cents(101), { percentBps: 150, fixed: cents(0), rounding: "half-up" })).toBe(2);
  });

  it("arredonda meio centavo para o par em half-even", () => {
    // 2,5 → 2 ; 3,5 → 4
    expect(computeFee(cents(100), { percentBps: 250, fixed: cents(0), rounding: "half-even" })).toBe(2);
    expect(computeFee(cents(100), { percentBps: 350, fixed: cents(0), rounding: "half-even" })).toBe(4);
  });

  it("não estoura em valores altos (BigInt interno)", () => {
    const big = cents(9_000_000_000_000); // R$ 90 bilhões
    expect(computeFee(big, { percentBps: 10_000, fixed: cents(0), rounding: "half-up" })).toBe(big);
  });

  it("rejeita configuração inválida", () => {
    expect(() => computeFee(cents(100), { percentBps: 10_001, fixed: cents(0), rounding: "half-up" })).toThrow();
    expect(() => computeFee(cents(100), { percentBps: 1.5, fixed: cents(0), rounding: "half-up" })).toThrow();
    expect(() => computeFee(cents(100), { percentBps: 100, fixed: cents(-1), rounding: "half-up" })).toThrow();
  });

  it("líquido = bruto − tarifa e nunca negativo", () => {
    expect(computeNet(cents(10_000), { percentBps: 399, fixed: cents(39), rounding: "half-up" })).toEqual({
      fee: 438,
      net: 9562,
    });
    expect(() => computeNet(cents(10), { percentBps: 0, fixed: cents(50), rounding: "half-up" })).toThrow(MoneyError);
  });
});

describe("allocate", () => {
  it("distribui o resto sem perder centavos", () => {
    const parts = allocate(cents(100), [1, 1, 1]);
    expect(parts).toEqual([34, 33, 33]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("respeita proporções e ignora partes zeradas no resto", () => {
    expect(allocate(cents(101), [0, 1, 1])).toEqual([0, 51, 50]);
  });
  it("rejeita proporções inválidas", () => {
    expect(() => allocate(cents(100), [])).toThrow();
    expect(() => allocate(cents(100), [0, 0])).toThrow();
    expect(() => allocate(cents(100), [-1, 2])).toThrow();
  });
});
