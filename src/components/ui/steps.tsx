import { cn } from "@/lib/cn";

/** Indicador de etapas acessível (o shadcn/ui não traz um componente Steps). */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Etapas">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium",
                done && "border-dominus bg-dominus text-paper",
                active && "border-paper text-paper",
                !done && !active && "border-line text-steel",
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={cn("hidden text-sm sm:inline", active ? "text-paper" : "text-steel")}>{label}</span>
            {i < steps.length - 1 ? <span className={cn("h-px flex-1", done ? "bg-dominus" : "bg-line")} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
