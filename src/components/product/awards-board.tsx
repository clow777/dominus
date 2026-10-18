"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { brl } from "@/components/dashboard/format";
import { cn } from "@/lib/cn";
import { AWARDS, monthlyMilestones, type PieceKind } from "@/lib/awards";

const GOLD = "#FFD700";
const STORAGE_KEY = "dominus:awards:volume";

/** Peças desenhadas à mão em viewBox 64x64. */
export function Piece({ kind, color, className, size, x, y }: { kind: PieceKind; color: string; className?: string; size?: number; x?: number; y?: number }) {
  const base = <path d="M13 53h38v6H13z" />;
  return (
    <svg viewBox="0 0 64 64" className={className} fill={color} aria-hidden="true" width={size} height={size} x={x} y={y}>
      {kind === "pawn" && (
        <>
          <circle cx="32" cy="16" r="8" />
          <path d="M26 25h12l-1 5h-10zM24 30h16c0 7 3 12 7 16l-3 7H20l-3-7c4-4 7-9 7-16z" />
          {base}
        </>
      )}
      {kind === "rook" && (
        <>
          <path d="M17 8h8v7h5V8h4v7h5V8h8v19l-6 5v13l6 8H17l6-8V32l-6-5z" />
          {base}
        </>
      )}
      {kind === "bishop" && (
        <>
          <circle cx="32" cy="7" r="3.5" />
          <path d="M32 11c-7 5-11 11-11 18 0 4 3 7 7 8v4h8v-4c4-1 7-4 7-8 0-7-4-13-11-18z" />
          <path d="M22 41h20v4H22zM25 45h14l3 8H22z" />
          {base}
        </>
      )}
      {kind === "knight" && (
        <>
          <path d="M18 53c0-11 3-17 8-22-5 1-9 4-12 8l-5-5c3-8 9-15 19-18l1-6 6 5c10 3 16 12 16 26v12z" />
          <circle cx="36" cy="19" r="2" fill="#0a0a0a" />
          {base}
        </>
      )}
      {kind === "queen" && (
        <>
          <circle cx="12" cy="17" r="3.2" />
          <circle cx="22" cy="10" r="3.2" />
          <circle cx="32" cy="8" r="3.2" />
          <circle cx="42" cy="10" r="3.2" />
          <circle cx="52" cy="17" r="3.2" />
          <path d="M12 21l8 22h24l8-22-10 11-6-16-6 16z" />
          <path d="M19 43h26l3 10H16z" />
          {base}
        </>
      )}
      {kind === "king" && (
        <>
          <path d="M30 3h4v5h5v4h-5v5h-4v-5h-5V8h5z" />
          <path d="M32 19c-9 0-15 5-15 12 0 4 3 7 7 8l-3 14h22l-3-14c4-1 7-4 7-8 0-7-6-12-14-12z" />
          {base}
        </>
      )}
    </svg>
  );
}

const noop = () => () => {};

export interface MonthPoint {
  month: string;
  volume: number;
}

const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
const shortMonth = (ym: string) => monthFmt.format(new Date(`${ym}-01T00:00:00Z`)).replace(".", "");

export function AwardsBoard({ volume, months }: { volume: number; months: MonthPoint[] }) {
  const reachedCount = AWARDS.filter((a) => volume >= a.goal).length;
  const [selected, setSelected] = useState(Math.min(reachedCount, AWARDS.length - 1));

  // Progresso salvo no navegador; o banco continua sendo a fonte de verdade.
  const saved = useSyncExternalStore(
    noop,
    () => window.localStorage.getItem(STORAGE_KEY),
    () => null,
  );
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(volume));
  }, [volume]);
  const previous = saved === null ? null : Number(saved);
  const gained = previous !== null && Number.isFinite(previous) && volume > previous ? volume - previous : 0;

  // Posição do preenchimento da trilha: cada peça fica no centro de uma coluna (10%, 30%, ... 90%).
  const prevGoal = reachedCount === 0 ? 0 : AWARDS[reachedCount - 1]!.goal;
  const nextGoal = AWARDS[reachedCount]?.goal;
  const partial = nextGoal ? Math.min(1, (volume - prevGoal) / (nextGoal - prevGoal)) : 1;
  const fill = reachedCount === 0 ? 10 * partial : reachedCount >= AWARDS.length ? 90 : 10 + (reachedCount - 1) * 20 + 20 * partial;

  const asc = [...months].reverse();
  const baseline = Math.max(0, volume - asc.reduce((s, m) => s + m.volume, 0));
  const points = monthlyMilestones(asc, baseline);
  const maxVol = Math.max(1, ...points.map((p) => p.volume));

  const award = AWARDS[selected]!;
  const awardReached = volume >= award.goal;
  const awardPercent = Math.min(100, Math.floor((volume / award.goal) * 100));

  return (
    <div
      className="-mx-6 -my-8 min-h-svh px-6 py-8"
      style={{ background: "repeating-conic-gradient(#0a0a0a 0% 25%, #141414 0% 50%) 0 0 / 56px 56px" }}
    >
      <header className="mb-6">
        <h1 className="text-title font-extrabold">Premiações</h1>
        <p className="text-sm text-steel">Corrida de faturamento no tabuleiro Dominus</p>
      </header>

      <section aria-labelledby="trail-title" className="rounded-2xl card-neon bg-black/80 p-5 backdrop-blur-sm sm:p-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="trail-title" className="text-xs font-bold tracking-[0.2em] text-steel uppercase">Trilha do Rei</h2>
            <p className="mt-1 text-3xl font-black text-white" data-testid="awards-volume">{brl(volume)}</p>
            <p className="text-xs text-steel">Faturamento aprovado acumulado</p>
          </div>
          {gained > 0 ? (
            <p className="rounded-full border border-ruby/40 px-3 py-1 text-xs font-bold text-white">+{brl(gained)} desde sua última visita</p>
          ) : null}
        </div>

        <div className="relative">
          <div className="absolute inset-x-[10%] top-[2.1rem] h-1.5 rounded-full bg-[#222]" aria-hidden="true" />
          <div
            className="absolute top-[2.1rem] left-[10%] h-1.5 rounded-full ruby-neon transition-[width] duration-700"
            style={{ width: `${Math.max(0, fill - 10)}%` }}
            aria-hidden="true"
          />
          <ol className="relative grid grid-cols-5">
            {AWARDS.map((a, i) => {
              const reached = volume >= a.goal;
              const pct = Math.min(100, Math.floor((volume / a.goal) * 100));
              return (
                <li key={a.key} className="flex flex-col items-center text-center">
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-pressed={selected === i}
                    aria-label={`${a.title} — ${a.label}`}
                    className={cn(
                      "group grid size-[4.5rem] place-items-center rounded-full border-2 bg-[#0d0d0d] transition-all duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:scale-110",
                      selected === i ? "border-ruby" : "border-ruby-dark/40 hover:border-ruby-dark",
                    )}
                    style={reached ? { boxShadow: `0 0 22px ${GOLD}66` } : undefined}
                  >
                    <Piece
                      kind={a.piece}
                      color={reached ? GOLD : "#3a3a3a"}
                      className={cn("size-11 drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)]", reached && "drop-shadow-[0_0_8px_rgba(255,215,0,0.7)]")}
                    />
                  </button>
                  <span className="mt-2 text-sm font-extrabold text-white">{a.label}</span>
                  <span className={cn("mt-0.5 text-[11px] leading-tight font-semibold", reached ? "text-[#FFD700]" : "text-steel-light")}>
                    {reached ? "META BATIDA!" : `Falta ${brl(a.goal - volume)} - ${pct}%`}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-steel">
          <Piece kind="king" color={reachedCount >= AWARDS.length ? GOLD : "#3a3a3a"} className="size-7" />
          <span>Rei: conquistado ao bater 5 milhões</span>
        </div>
      </section>

      <section
        aria-live="polite"
        className="mt-5 grid gap-6         rounded-2xl card-neon bg-linear-to-br from-[#0a0a0a] to-black p-6 sm:grid-cols-[auto_1fr] sm:items-center"
                style={{ boxShadow: "0 0 40px rgba(199,0,0,0.2)" }}
      >
        <div className="grid size-32 place-items-center justify-self-center rounded-2xl bg-black/60">
          <Piece
            kind={award.piece}
            color={awardReached ? GOLD : "#444"}
            className="size-24 drop-shadow-[0_8px_10px_rgba(0,0,0,0.9)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:scale-110"
          />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white">
            {award.title} <span className="text-ruby">- {award.label}</span>
          </h3>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-steel-light">
              <span>Progresso</span>
              <span>{awardPercent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#222]" role="progressbar" aria-valuenow={awardPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso até ${award.label}`}>
              <div className="ruby-neon h-full rounded-full transition-[width] duration-700" style={{ width: `${awardPercent}%` }} />
            </div>
            <p className="mt-2 text-sm font-semibold text-white">
              {awardReached ? "META BATIDA!" : `Falta ${brl(award.goal - volume)}`}
            </p>
          </div>
          <p className="mt-4 rounded-lg border border-line bg-black/50 px-4 py-3 text-sm">
            <span className="font-bold text-white">Desbloqueia:</span> {award.reward}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-2xl card-neon bg-black/80 p-5 sm:p-7" aria-labelledby="monthly-title">
        <h2 id="monthly-title" className="mb-4 text-lg font-extrabold">Faturamento por mês</h2>
        {points.length === 0 ? (
          <p className="py-8 text-center text-sm text-steel">Nenhum faturamento aprovado ainda.</p>
        ) : (
          <MonthlyChart points={points} maxVol={maxVol} />
        )}
      </section>
    </div>
  );
}

function MonthlyChart({ points, maxVol }: { points: ReturnType<typeof monthlyMilestones>; maxVol: number }) {
  const W = 640;
  const H = 260;
  const top = 44;
  const bottom = 28;
  const slot = W / Math.max(points.length, 6);
  const barW = Math.min(46, slot * 0.6);
  const plotH = H - top - bottom;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Faturamento aprovado por mês">
      <defs>
        <linearGradient id="awards-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C70000" />
          <stop offset="1" stopColor="#8B0000" />
        </linearGradient>
      </defs>
      <line x1="0" y1={H - bottom} x2={W} y2={H - bottom} stroke="#2a2a2a" />
      {points.map((p, i) => {
        const h = Math.max(2, (p.volume / maxVol) * plotH);
        const x = i * slot + (slot - barW) / 2;
        const y = H - bottom - h;
        return (
          <g key={p.month}>
            <title>{`${shortMonth(p.month)}: ${brl(p.volume)}`}</title>
            <rect x={x} y={y} width={barW} height={h} rx="4" fill="url(#awards-bar)" />
            <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#8a8a8a">{shortMonth(p.month)}</text>
            {p.hit ? (
              <Piece kind={p.hit.piece} color={GOLD} size={28} x={x + barW / 2 - 14} y={Math.max(0, y - 32)} />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
