import { cn } from "@/lib/cn";

/** Peão de xadrez em SVG, herda a cor de `currentColor`. */
export function Pawn({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-6", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="12" cy="6.2" r="3.2" />
      <path d="M9.6 10.4h4.8c0 1.8.7 3.2 1.9 4.4H7.7c1.2-1.2 1.9-2.6 1.9-4.4Z" />
      <path d="M7 16h10l1.3 3.2H5.7L7 16Z" />
      <rect x="4.6" y="19.8" width="14.8" height="2" rx="1" />
    </svg>
  );
}
