"use client";

import { useState } from "react";

import type { DesempenhoResponse, SeriePoint } from "@/lib/dash-types";
import { brl, brlK, dayLabel } from "@/lib/format";
import { DpCard, KebabMenu } from "./card";

const W = 800;
const H = 230;
const M = { l: 58, r: 46, t: 14, b: 30 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;
const TICKS = 5;

type SeriesKey = "starts" | "vendasGeradas" | "vendasPagas";

const SERIES: { key: SeriesKey; label: string; color: string; axis: "left" | "right" }[] = [
  { key: "starts", label: "/starts", color: "var(--color-dp-starts)", axis: "right" },
  { key: "vendasGeradas", label: "Vendas Geradas", color: "var(--color-dp-alt)", axis: "left" },
  { key: "vendasPagas", label: "Vendas Pagas", color: "var(--color-dp-primary)", axis: "left" },
];

/** Arredonda para cima para 1, 2, 5 × 10ⁿ; nunca abaixo de `min`. */
function niceMax(value: number, min: number) {
  if (value <= min) return min;
  const mag = 10 ** Math.floor(Math.log10(value));
  const n = value / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

const fmtCount = (v: number) => String(+v.toFixed(2));

interface Props {
  data: DesempenhoResponse;
  csvHref: string;
  onRefresh: () => void;
}

export function PerformanceChart({ data, csvHref, onRefresh }: Props) {
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set());
  const [hover, setHover] = useState<number | null>(null);
  const { serie, totais } = data;
  const n = serie.length;

  const maxMoney = niceMax(Math.max(0, ...serie.flatMap((p) => [p.vendasGeradas, p.vendasPagas])), 400_000);
  const maxStarts = niceMax(Math.max(0, ...serie.map((p) => p.starts)), 1);

  const x = (i: number) => (n === 1 ? M.l + PW / 2 : M.l + (i * PW) / (n - 1));
  const y = (key: SeriesKey, v: number) => {
    const max = key === "starts" ? maxStarts : maxMoney;
    return M.t + PH - (v / max) * PH;
  };
  const path = (key: SeriesKey) => serie.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(key, p[key]).toFixed(1)}`).join(" ");

  const toggle = (key: SeriesKey) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHover(best);
  }

  const labelEvery = Math.max(1, Math.ceil(n / 10));
  const active: SeriePoint | null = hover !== null ? (serie[hover] ?? null) : null;

  return (
    <DpCard className="lg:col-span-2">
      <span aria-hidden="true" className="pointer-events-none absolute -top-20 -left-20 size-56 rounded-full bg-[radial-gradient(circle,var(--color-dp-primary)_0%,transparent_70%)] opacity-[0.08]" />
      <div className="relative mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-white">Seu Desempenho</h2>
        <KebabMenu
          label="Opções do gráfico"
          items={[{ label: "Atualizar", onSelect: onRefresh }, { label: "Exportar CSV", href: csvHref }]}
        />
      </div>

      <div className="relative overflow-x-auto">
        <div className="relative min-w-[560px]">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full touch-pan-x"
            role="img"
            aria-label={`Gráfico de desempenho: ${totais.starts} starts, ${brl(totais.vendasGeradas)} gerados e ${brl(totais.vendasPagas)} pagos no período.`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <filter id="dp-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* eixos */}
            <line x1={M.l} x2={M.l} y1={M.t} y2={M.t + PH} stroke="var(--color-dp-divider)" />
            <line x1={W - M.r} x2={W - M.r} y1={M.t} y2={M.t + PH} stroke="var(--color-dp-divider)" />
            <line x1={M.l} x2={W - M.r} y1={M.t + PH} y2={M.t + PH} stroke="var(--color-dp-divider)" />
            {Array.from({ length: TICKS }, (_, i) => {
              const f = i / (TICKS - 1);
              const ty = M.t + PH - f * PH;
              return (
                <g key={i} className="font-jb" fontSize="10" fill="var(--color-dp-muted)">
                  <text x={M.l - 8} y={ty + 3} textAnchor="end">
                    {brlK(maxMoney * f, 0)}
                  </text>
                  <text x={W - M.r + 8} y={ty + 3} textAnchor="start">
                    {fmtCount(maxStarts * f)}
                  </text>
                </g>
              );
            })}
            {serie.map((p, i) =>
              i % labelEvery === 0 ? (
                <text key={p.data} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-dp-muted)" className="font-jb">
                  {dayLabel(p.data)}
                </text>
              ) : null,
            )}

            {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + PH} stroke="var(--color-dp-muted)" strokeDasharray="4 4" /> : null}

            {SERIES.filter((s) => !hidden.has(s.key)).map((s) => (
              <g key={s.key}>
                {n > 1 ? <path d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : null}
                {(s.key !== "vendasGeradas" || n === 1 ? serie : []).map((p, i) => (
                  <circle
                    key={p.data}
                    cx={x(i)}
                    cy={y(s.key, p[s.key])}
                    r={s.key === "vendasPagas" ? 4 : 3}
                    fill={s.key === "starts" ? "var(--color-dp-card)" : s.color}
                    stroke={s.color}
                    strokeWidth="2"
                    filter={s.key === "vendasPagas" ? "url(#dp-glow)" : undefined}
                  />
                ))}
                {hover !== null && active && s.key === "vendasGeradas" ? (
                  <circle cx={x(hover)} cy={y(s.key, active[s.key])} r="3" fill={s.color} />
                ) : null}
              </g>
            ))}
          </svg>

          {active && hover !== null ? (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 w-44 rounded-lg border border-dp-border bg-dp-inner p-2.5 text-[11px] text-white shadow-xl"
              style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% - 88px), calc(100% - 176px))` }}
            >
              <p className="mb-1 font-bold">{dayLabel(active.data)}</p>
              <p className="flex justify-between"><span className="text-dp-muted">/starts</span>{active.starts}</p>
              <p className="flex justify-between"><span className="text-dp-muted">Vendas Geradas</span>{brl(active.vendasGeradas)}</p>
              <p className="flex justify-between"><span className="text-dp-muted">Vendas Pagas</span>{brl(active.vendasPagas)}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={!hidden.has(s.key)}
            onClick={() => toggle(s.key)}
            className="flex items-center gap-1.5 text-[11px] text-white aria-[pressed=false]:opacity-40"
          >
            <svg width="22" height="10" aria-hidden="true">
              <line x1="0" x2="22" y1="5" y2="5" stroke={s.color} strokeWidth="2" />
              <circle cx="11" cy="5" r="3" fill="var(--color-dp-card)" stroke={s.color} strokeWidth="2" />
            </svg>
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <SummaryBox label="Total /starts" value={String(totais.starts)} />
        <SummaryBox label="Vendas Geradas" value={brlK(totais.vendasGeradas, 1)} color="var(--color-dp-alt)" />
        <SummaryBox label="Vendas Pagas" value={brlK(totais.vendasPagas, 1)} color="var(--color-dp-primary)" />
      </div>
    </DpCard>
  );
}

function SummaryBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-dp-inner px-2 py-3">
      <p className="text-[10px] text-dp-muted">{label}</p>
      <p className="mt-1 text-sm font-bold" style={{ color: color ?? "#fff" }}>
        {value}
      </p>
    </div>
  );
}
