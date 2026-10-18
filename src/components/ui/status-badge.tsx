import { cn } from "@/lib/cn";
import { STATUS_LABELS_PT, type TransactionStatus } from "@/server/domain/transactions/state-machine";

type Tone = "neutral" | "positive" | "attention" | "negative";

const TONE_BY_STATUS: Record<TransactionStatus, Tone> = {
  created: "neutral",
  awaiting_payment: "attention",
  processing: "attention",
  approved: "positive",
  declined: "negative",
  cancelled: "neutral",
  partially_refunded: "neutral",
  refunded: "neutral",
  disputed: "negative",
  expired: "neutral",
};

const toneClasses: Record<Tone, string> = {
  neutral: "text-steel-light before:bg-steel",
  positive: "text-paper before:bg-brand-red",
  attention: "text-warning-text before:bg-warning",
  negative: "text-danger-text before:bg-dominus",
};

/** Status com ponto colorido + texto: a cor nunca é o único portador de significado. */
export function StatusBadge({ status, className }: { status: TransactionStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.8125rem] font-medium",
        "before:size-1.5 before:rounded-full before:content-['']",
        toneClasses[TONE_BY_STATUS[status]],
        className,
      )}
    >
      {STATUS_LABELS_PT[status]}
    </span>
  );
}
