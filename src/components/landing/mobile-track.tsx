"use client";

import { motion, useTransform } from "motion/react";

import { PAWN_PATH } from "@/lib/motion/pawn-path";
import { useJourneyContext } from "./stage/journey-context";
import { PawnSvg } from "./stage/pawn-svg";

const LAST = PAWN_PATH.length - 1;

/**
 * Versão mobile da jornada: as seis casas do caminho do peão numa faixa do
 * cabeçalho. O peão percorre a faixa conforme a rolagem — mesma trajetória,
 * desenho simplificado, sem cobrir conteúdo.
 */
export function MobileTrack() {
  const { along, finalPresence } = useJourneyContext();
  const x = useTransform(along, (v) => `${v * 100}%`);

  return (
    <div aria-hidden="true" className="relative mx-4 mb-2 h-7 sm:mx-8 lg:hidden">
      <div className="grid h-full grid-cols-6 overflow-hidden rounded-sm border border-line">
        {PAWN_PATH.map((stop, i) => (
          <div
            key={stop.square}
            className={`relative flex items-end justify-end px-1 pb-0.5 text-[0.625rem] ${
              i % 2 === 0 ? "bg-ink-3 text-steel" : "bg-ink-2 text-steel"
            }`}
          >
            {i === LAST ? <motion.span className="absolute inset-0 bg-dominus" style={{ opacity: finalPresence }} /> : null}
            <span className="relative">{stop.square}</span>
          </div>
        ))}
      </div>
      <motion.div className="pointer-events-none absolute top-0 left-0 flex h-full w-1/6 justify-center" style={{ x }}>
        <PawnSvg className="-mt-1.5 h-8 w-8" />
      </motion.div>
    </div>
  );
}
