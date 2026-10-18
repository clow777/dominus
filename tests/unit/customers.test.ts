import { describe, expect, it } from "vitest";

import { csvCell, customerMetrics, segmentOf, statusOf, toCsv } from "@/lib/customers";

const now = new Date("2026-01-31T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("customers", () => {
  it("segmenta em novo, recorrente e VIP", () => {
    expect(segmentOf({ volume: 0, approvedCount: 0 })).toBe("novo");
    expect(segmentOf({ volume: 9_700, approvedCount: 1 })).toBe("novo");
    expect(segmentOf({ volume: 20_000, approvedCount: 2 })).toBe("recorrente");
    expect(segmentOf({ volume: 100_000, approvedCount: 1 })).toBe("vip");
  });

  it("status: ativo até 30 dias, inativo depois, bloqueado sempre vence", () => {
    expect(statusOf({ lastPurchaseAt: hoursAgo(2), blocked: false }, now)).toBe("ativo");
    expect(statusOf({ lastPurchaseAt: hoursAgo(24 * 31), blocked: false }, now)).toBe("inativo");
    expect(statusOf({ lastPurchaseAt: null, blocked: false }, now)).toBe("inativo");
    expect(statusOf({ lastPurchaseAt: hoursAgo(1), blocked: true }, now)).toBe("bloqueado");
  });

  it("métricas com 0 clientes não dividem por zero", () => {
    expect(customerMetrics([], 0, now)).toMatchObject({ total: 0, active24h: 0, ltv: 0, ticket: 0, segmentPercent: { novo: 0, recorrente: 0, vip: 0 } });
  });

  it("calcula LTV, ticket e ativos em 24h", () => {
    const rows = [
      { volume: 10_000, approvedCount: 1, lastPurchaseAt: hoursAgo(3), blocked: false },
      { volume: 30_000, approvedCount: 3, lastPurchaseAt: hoursAgo(100), blocked: false },
    ];
    const m = customerMetrics(rows, 4, now);
    expect(m).toMatchObject({ total: 2, active24h: 1, ltv: 20_000, ticket: 10_000 });
    expect(m.segmentPercent).toEqual({ novo: 50, recorrente: 50, vip: 0 });
  });

  it("CSV escapa e neutraliza fórmulas", () => {
    expect(csvCell('a "b"; c')).toBe('"a ""b""; c"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(toCsv(["Nome"], [])).toBe("Nome");
  });
});
