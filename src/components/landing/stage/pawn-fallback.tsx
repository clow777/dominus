"use client";

import { motion, useMotionValue, useTransform } from "motion/react";

import { squareToPoint } from "@/lib/motion/pawn-path";
import { PawnSvg } from "./pawn-svg";
import type { Journey } from "./use-journey";

const FINAL = squareToPoint("d8");
const SQUARES = Array.from({ length: 64 }, (_, i) => {
  const rankIdx = 7 - Math.floor(i / 8); // linha de cima = fileira 8
  const fileIdx = i % 8;
  return { key: i, dark: (fileIdx + rankIdx) % 2 === 0, final: fileIdx - 3.5 === FINAL.x && 3.5 - rankIdx === FINAL.z };
});

/**
 * Versão sem WebGL: tabuleiro em CSS 3D e peão em SVG, dirigidos pela mesma
 * trajetória. Também é o que aparece enquanto o modelo 3D carrega.
 */
const START = squareToPoint("e2");

export function PawnFallback({ journey, frozen = false }: { journey: Journey; frozen?: boolean }) {
  // Modo congelado (hero mobile): peão parado em e2.
  const staticX = useMotionValue(START.x);
  const staticZ = useMotionValue(START.z);
  const zero = useMotionValue(0);

  const tx = useTransform(frozen ? staticX : journey.x, (v) => `${(v + 3.5) * 100}%`);
  // Linha a partir do topo: fileira 8 (z = -3.5) é a linha 0.
  const ty = useTransform(frozen ? staticZ : journey.z, (v) => `${(3.5 + v) * 100}%`);
  const lift = useTransform(frozen ? zero : journey.lift, (v) => `${-v * 70}%`);
  const finalGlow = frozen ? zero : journey.finalPresence;

  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden [perspective:1600px]" aria-hidden="true">
      <div className="relative aspect-square w-[min(78%,560px)] translate-y-[8%] [transform-style:preserve-3d] [transform:rotateX(56deg)]">
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 overflow-hidden rounded-[3px] outline outline-8 outline-[#070707]">
          {SQUARES.map((sq) => (
            <div key={sq.key} className={sq.dark ? "relative bg-[#0e0e0e]" : "relative bg-[#cfcfcf]"}>
              {sq.final ? <motion.div className="absolute inset-0 bg-dominus" style={{ opacity: finalGlow }} /> : null}
            </div>
          ))}
        </div>
        {/* Escurece as bordas como a névoa da cena 3D */}
        <div className="pointer-events-none absolute -inset-[2%] bg-[radial-gradient(ellipse_at_50%_60%,transparent_35%,#080808_78%)]" />
        <motion.div
          className="absolute top-0 left-0 h-[12.5%] w-[12.5%] [transform-style:preserve-3d]"
          style={{ x: tx, y: ty }}
        >
          <div className="absolute inset-x-[-20%] bottom-[45%] h-[170%] origin-bottom [transform:rotateX(-56deg)]">
            <motion.div className="h-full w-full" style={{ y: lift }}>
              <PawnSvg className="h-full w-full drop-shadow-[0_18px_24px_rgba(0,0,0,0.6)]" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
