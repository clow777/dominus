"use client";

import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-brand-red" : "bg-line-strong",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-5 rounded-full bg-paper transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")}
      />
    </button>
  );
}
