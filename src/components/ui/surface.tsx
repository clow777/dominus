import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Superfície base para cartões e painéis. Raio maior que o de controles, para marcar hierarquia. */
export function Surface({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cn("rounded-lg border border-line bg-ink-2 shadow-(--shadow-raise)", className)} {...rest} />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-sm bg-[linear-gradient(90deg,var(--color-ink-3)_0%,var(--color-line)_50%,var(--color-ink-3)_100%)]",
        "animate-shimmer bg-size-[200%_100%]",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="board-texture grid place-items-center gap-3 rounded-lg border border-dashed border-line px-6 py-14 text-center">
      <p className="text-title text-paper">{title}</p>
      <p className="max-w-sm text-sm text-steel">{description}</p>
      {action}
    </div>
  );
}
