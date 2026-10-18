import { pct } from "@/lib/format";

/** Semicírculo de 180°: trilho `dp-divider`, preenchimento vermelho com glow proporcional à %. */
export function ConversionGauge({ value, noData }: { value: number; noData: boolean }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative -mt-1 w-full max-w-[150px]" role="img" aria-label={`Taxa de conversão ${pct(value)}`}>
      <svg viewBox="0 0 120 66" className="w-full">
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="var(--color-dp-divider)" strokeWidth="10" strokeLinecap="round" pathLength={100} />
        {clamped > 0 ? (
          <path
            d="M10 60 A50 50 0 0 1 110 60"
            fill="none"
            stroke="var(--color-dp-primary)"
            strokeWidth="10"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${clamped} 100`}
            style={{ filter: `drop-shadow(0 0 ${2 + clamped / 12}px var(--dp-glow))` }}
          />
        ) : null}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center font-jb">
        <p className="text-[18px] leading-none font-bold text-white">{pct(value)}</p>
        {noData ? <p className="mt-1 text-[9px] font-normal text-dp-dim">sem dados no período</p> : null}
      </div>
    </div>
  );
}
