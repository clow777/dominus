import { describe, expect, it } from "vitest";

import { awardProgress, monthlyMilestones } from "@/lib/awards";

describe("awards", () => {
  it("calcula o que falta e marca metas batidas", () => {
    const [p10k, p100k] = awardProgress(2_000_00);
    expect(p10k).toMatchObject({ reached: false, percent: 20, missing: 8_000_00 });
    expect(p100k?.missing).toBe(98_000_00);
    expect(awardProgress(10_000_00)[0]).toMatchObject({ reached: true, missing: 0 });
  });

  it("indica em qual mês cada meta foi batida", () => {
    const res = monthlyMilestones(
      [
        { month: "2025-01", volume: 6_000_00 },
        { month: "2025-02", volume: 5_000_00 },
        { month: "2025-03", volume: 1_000_00 },
      ],
      0,
    );
    expect(res.map((r) => r.hit?.key ?? null)).toEqual([null, "10k", null]);
  });

  it("considera o faturamento anterior à janela", () => {
    const [m] = monthlyMilestones([{ month: "2025-01", volume: 2_000_00 }], 9_000_00);
    expect(m?.hit?.key).toBe("10k");
  });
});
