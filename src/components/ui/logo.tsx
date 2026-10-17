import { cn } from "@/lib/cn";

/**
 * Marca Dominus: silhueta de peão reduzida a três formas (cabeça, colar, base)
 * sobre uma casa de tabuleiro. Original, sem referência a marcas de terceiros.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <defs>
        <linearGradient id="dominus-chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#9a9a9a" />
          <stop offset="0.55" stopColor="#d9d9d9" />
          <stop offset="1" stopColor="#5a5a5a" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#111111" stroke="#262626" />
      <circle cx="16" cy="9.5" r="3.6" fill="url(#dominus-chrome)" />
      <path d="M11.6 14.6h8.8l-1.6 2.2c.9 2.6 1.5 5 1.9 7.2h-9.4c.4-2.2 1-4.6 1.9-7.2z" fill="url(#dominus-chrome)" />
      <rect x="8.5" y="24.6" width="15" height="3.2" rx="1.2" fill="url(#dominus-chrome)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="text-[1.0625rem] font-semibold tracking-[0.14em] text-paper">DOMINUS</span>
        <span className="text-[0.6875rem] font-medium tracking-[0.18em] text-steel">PAYMENTS</span>
      </span>
    </span>
  );
}
