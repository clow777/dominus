"use client";

import { useState, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { KebabIcon } from "./icons";

/** Cartão base: borda 1px, raio 14 e leve gradiente interno escuro. */
export function DpCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-dp-border bg-dp-card bg-linear-to-b from-white/[0.015] to-transparent p-5 font-inter md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <DpCard className={className}>
      <Skeleton className="h-8 w-8" />
      <Skeleton className="mt-4 h-7 w-32" />
      <Skeleton className="mt-6 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-full" />
    </DpCard>
  );
}

export function CardError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  return (
    <DpCard className={className}>
      <div role="alert" className="grid place-items-center gap-3 py-6 text-center">
        <p className="text-xs text-dp-muted">Não foi possível carregar os dados.</p>
        <button type="button" onClick={onRetry} className="rounded-md border border-dp-border px-3 py-1.5 text-xs font-semibold text-white hover:border-dp-primary">
          Tentar novamente
        </button>
      </div>
    </DpCard>
  );
}

export interface MenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
}

/** Menu kebab simples; fecha ao escolher um item ou ao clicar fora. */
export function KebabMenu({ items, label = "Mais opções" }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) setOpen(false);
        }}
        className="grid size-7 place-items-center rounded-md text-dp-muted hover:text-white"
      >
        <KebabIcon />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-40 rounded-lg border border-dp-border bg-dp-inner p-1 shadow-xl"
          onBlur={(e) => {
            if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) setOpen(false);
          }}
        >
          {items.map((item) => {
            const cls = "block w-full rounded-md px-3 py-2 text-left text-xs text-white hover:bg-white/5";
            return item.href ? (
              <a key={item.label} role="menuitem" href={item.href} download className={cls} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={cls}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
