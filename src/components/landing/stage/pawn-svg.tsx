import { useId } from "react";

import { PAWN_HEIGHT, silhouettePath } from "@/lib/motion/pawn-profile";

const PATH = silhouettePath(100);
const H = Math.ceil(PAWN_HEIGHT * 100) + 6;

/** Peão em SVG com faixas de reflexo cromado. Mesmo perfil do modelo 3D. */
export function PawnSvg({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox={`-46 ${-H} 92 ${H + 4}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-chrome`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#030303" />
          <stop offset="0.06" stopColor="#4a0a12" />
          <stop offset="0.12" stopColor="#0a0a0a" />
          <stop offset="0.3" stopColor="#2c2c2c" />
          <stop offset="0.42" stopColor="#0b0b0b" />
          <stop offset="0.5" stopColor="#a6a6a6" />
          <stop offset="0.56" stopColor="#1c1c1c" />
          <stop offset="0.78" stopColor="#0a0a0a" />
          <stop offset="0.93" stopColor="#5b5b5b" />
          <stop offset="1" stopColor="#0d0d0d" />
        </linearGradient>
        <radialGradient id={`${uid}-spec`} cx="0.42" cy="0.18" r="0.22">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.8" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="1" rx="44" ry="7" fill={`url(#${uid}-shadow)`} />
      <path d={PATH} fill={`url(#${uid}-chrome)`} />
      <path d={PATH} fill={`url(#${uid}-spec)`} />
      <path d={PATH} fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="0.6" />
    </svg>
  );
}
