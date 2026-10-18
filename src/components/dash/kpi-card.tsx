import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { DpCard } from "./card";

interface KpiCardProps {
  icon: ReactNode;
  title: string;
  /** Conteúdo principal: texto do valor ou o gauge. */
  children: ReactNode;
  d7: string;
  d30: string;
  featured?: boolean;
}

export function KpiCard({ icon, title, children, d7, d30, featured }: KpiCardProps) {
  return (
    <DpCard>
      {featured ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-[radial-gradient(circle,var(--color-dp-primary)_0%,transparent_70%)] opacity-[0.08]"
        />
      ) : null}
      <div className="relative flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg",
            featured ? "bg-dp-primary text-black shadow-[0_0_18px_var(--dp-glow)]" : "bg-dp-tint text-dp-primary",
          )}
        >
          {icon}
        </span>
        <h2 className="text-[11px] font-semibold text-white">{title}</h2>
      </div>
      <div className="relative mt-4 min-h-10 text-[28px] leading-none font-bold text-white">{children}</div>
      <dl className="relative mt-4 grid gap-1.5 border-t border-dp-divider pt-3 text-[11px]">
        <div className="flex justify-between">
          <dt className="text-dp-muted">7 Dias:</dt>
          <dd className="font-bold text-white">{d7}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-dp-muted">30 Dias:</dt>
          <dd className="font-bold text-white">{d30}</dd>
        </div>
      </dl>
    </DpCard>
  );
}
