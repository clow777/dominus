import { useId, type ComponentProps } from "react";

import { cn } from "@/lib/cn";

interface FieldProps extends ComponentProps<"input"> {
  label: string;
  hint?: string;
  error?: string;
}

/** Campo com label, dica e erro ligados por aria-describedby. */
export function Field({ label, hint, error, className, id, ...rest }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-paper-soft">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={cn(
          "h-11 rounded-md border bg-ink-2 px-3.5 text-[0.9375rem] text-paper placeholder:text-steel",
          "transition-colors duration-(--duration-fast) focus:outline-none focus-visible:outline-2",
          error ? "border-danger-text" : "border-line hover:border-line-strong focus:border-steel",
        )}
        {...rest}
      />
      {hint && !error ? (
        <p id={hintId} className="text-sm text-steel">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
