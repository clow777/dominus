import { describe, expect, it } from "vitest";

import { clubProgress } from "@/lib/club";
import { parsePeriod, periodRange, startOfDaySP } from "@/lib/period";

describe("período (America/Sao_Paulo)", () => {
  // 17/10/2026 02:00 UTC = 16/10 23:00 em São Paulo: ainda é dia 16 lá.
  const now = new Date("2026-10-17T02:00:00Z");

  it("o início do dia usa o fuso de São Paulo", () => {
    expect(startOfDaySP(now).toISOString()).toBe("2026-10-16T03:00:00.000Z");
  });

  it("hoje, ontem, 7 e 30 dias", () => {
    expect(periodRange("hoje", now)).toEqual({ start: new Date("2026-10-16T03:00:00Z"), end: null });
    expect(periodRange("ontem", now)).toEqual({
      start: new Date("2026-10-15T03:00:00Z"),
      end: new Date("2026-10-16T03:00:00Z"),
    });
    expect(periodRange("7dias", now).start).toEqual(new Date("2026-10-10T03:00:00Z"));
    expect(periodRange("30dias", now).start).toEqual(new Date("2026-09-17T03:00:00Z"));
    expect(periodRange("total", now)).toEqual({ start: null, end: null });
  });

  it("parsePeriod recusa valores desconhecidos", () => {
    expect(parsePeriod("hoje")).toBe("hoje");
    expect(parsePeriod("x")).toBe("30dias");
    expect(parsePeriod(undefined)).toBe("30dias");
  });
});

describe("Dominus Club", () => {
  it("sem volume fica no primeiro nível", () => {
    expect(clubProgress(0)).toEqual({ current: "Bronze", next: "Prata", percent: 0, remaining: 10_000_00 });
  });
  it("calcula o progresso até o próximo nível", () => {
    expect(clubProgress(5_000_00).percent).toBe(50);
    expect(clubProgress(10_000_00).current).toBe("Prata");
  });
  it("no último nível não há próximo", () => {
    expect(clubProgress(20_000_000_00)).toMatchObject({ current: "Diamante", next: null, percent: 100 });
  });
});
