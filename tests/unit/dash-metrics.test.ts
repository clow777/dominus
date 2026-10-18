import { describe, expect, it } from "vitest";

import { averageTicket, conversionRate, positionOf, variation } from "@/lib/dash-math";
import { dashPeriodDays, dashPeriodStart, monthRanges, parseDashPeriod } from "@/lib/dash-period";
import { brl, brlDot, brlK, dayLabel, pct, rank } from "@/lib/format";

describe("fórmulas do painel", () => {
  it("conversão e ticket médio são 0 sem base", () => {
    expect(conversionRate(3, 0)).toBe(0);
    expect(conversionRate(1, 4)).toBe(25);
    expect(averageTicket(0, 0)).toBe(0);
    expect(averageTicket(30000, 3)).toBe(10000);
  });

  it("variação segue as regras do brief", () => {
    expect(variation(5, 0)).toBe(100);
    expect(variation(0, 0)).toBe(0);
    expect(variation(0, 10)).toBe(-100);
    expect(variation(15, 10)).toBe(50);
  });

  it("posição fora do ranking fica depois de quem vendeu", () => {
    expect(positionOf("b", [{ id: "a" }, { id: "b" }])).toBe(2);
    expect(positionOf("x", [{ id: "a" }, { id: "b" }])).toBe(3);
  });
});

describe("períodos (fuso de São Paulo)", () => {
  const now = new Date("2026-10-17T02:30:00Z"); // ainda 16/10 às 23:30 em SP

  it("parse com padrão em hoje", () => {
    expect(parseDashPeriod(undefined)).toBe("today");
    expect(parseDashPeriod("xyz")).toBe("today");
    expect(parseDashPeriod("30d")).toBe("30d");
  });

  it("today tem um dia; 7d e 30d incluem hoje", () => {
    expect(dashPeriodDays("today", now)).toEqual(["2026-10-16"]);
    const d7 = dashPeriodDays("7d", now);
    expect(d7).toHaveLength(7);
    expect(d7[0]).toBe("2026-10-10");
    expect(d7.at(-1)).toBe("2026-10-16");
    expect(dashPeriodDays("30d", now)).toHaveLength(30);
    expect(dashPeriodStart("today", now).toISOString()).toBe("2026-10-16T03:00:00.000Z");
  });

  it("intervalos do mês", () => {
    const { current, previous } = monthRanges(now);
    expect(current.start.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(current.end.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(previous.start.toISOString()).toBe("2026-09-01T03:00:00.000Z");
  });
});

describe("formatadores", () => {
  it("seguem os formatos do brief", () => {
    expect(brl(29119289)).toBe("R$ 291.192,89");
    expect(brl(0)).toBe("R$ 0,00");
    expect(brlDot(0)).toBe("R$ 0.00");
    expect(brlK(0, 0)).toBe("R$ 0K");
    expect(brlK(1234567, 1)).toBe("R$ 12.3K");
    expect(pct(0)).toBe("0.0%");
    expect(pct(0, 2)).toBe("0.00%");
    expect(dayLabel("2026-10-17")).toBe("17/10");
    expect(rank(1)).toBe("RNK-01");
    expect(rank(653)).toBe("RNK-653");
  });
});
