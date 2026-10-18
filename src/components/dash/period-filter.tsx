"use client";

import { DASH_PERIODS, DASH_PERIOD_LABELS, type DashPeriod } from "@/lib/dash-period";
import { cn } from "@/lib/cn";

export function PeriodFilter({ value, onChange }: { value: DashPeriod; onChange: (p: DashPeriod) => void }) {
  return (
    <div role="group" aria-label="Período" className="flex gap-2 font-inter">
      {DASH_PERIODS.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(p)}
            className={cn(
              "h-[26px] rounded-md border px-3 text-[11px] font-semibold transition-colors",
              active
                ? "border-dp-primary bg-dp-primary text-black shadow-[0_0_18px_var(--dp-glow)]"
                : "border-dp-border bg-transparent text-white hover:border-dp-muted",
            )}
          >
            {DASH_PERIOD_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}
