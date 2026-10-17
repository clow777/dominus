"use client";

import { useMotionValue, useMotionValueEvent, useScroll, type MotionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  PAWN_PATH,
  computeAnchors,
  samplePath,
  snapPath,
  squareToPoint,
  type Anchors,
  type PathSample,
} from "@/lib/motion/pawn-path";

export interface Journey {
  /** Amostra mais recente da trajetória. Lida pela cena 3D a cada quadro. */
  sampleRef: React.RefObject<PathSample>;
  /** Avisa ouvintes (ex.: invalidate do three) quando a amostra muda. */
  subscribe: (listener: () => void) => () => void;
  reducedMotion: boolean;
  /** Valores para a versão 2D e a trilha mobile. */
  x: MotionValue<number>;
  z: MotionValue<number>;
  lift: MotionValue<number>;
  along: MotionValue<number>;
  finalPresence: MotionValue<number>;
}

const MOVE_RATIO = 0.7; // movimento ocupa ~70% de uma altura de janela antes da seção

function initialSample(): PathSample {
  const presence = PAWN_PATH.map((_, i) => (i === 0 ? 1 : 0));
  const start = squareToPoint(PAWN_PATH[0]!.square);
  return { x: start.x, z: start.z, lift: 0, stop: 0, t: 0, along: 0, presence };
}

export function useJourney(reducedMotion: boolean): Journey {
  const { scrollY } = useScroll();
  const anchorsRef = useRef<Anchors | null>(null);
  const viewportRef = useRef(800);
  const sampleRef = useRef<PathSample>(initialSample());
  const listeners = useRef(new Set<() => void>());

  const x = useMotionValue(sampleRef.current.x);
  const z = useMotionValue(sampleRef.current.z);
  const lift = useMotionValue(0);
  const along = useMotionValue(0);
  const finalPresence = useMotionValue(0);

  const update = useCallback(
    (y: number) => {
      const anchors = anchorsRef.current;
      if (!anchors) return;
      const s = reducedMotion
        ? snapPath(y, anchors)
        : samplePath(y, anchors, { moveDistance: viewportRef.current * MOVE_RATIO });
      sampleRef.current = s;
      x.set(s.x);
      z.set(s.z);
      lift.set(s.lift);
      along.set(s.along);
      finalPresence.set(s.presence[s.presence.length - 1] ?? 0);
      listeners.current.forEach((l) => l());
    },
    [reducedMotion, x, z, lift, along, finalPresence],
  );

  // Mede as seções uma vez por mudança de layout — nunca a cada quadro de rolagem.
  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight;
      viewportRef.current = vh;
      const tops = PAWN_PATH.map((stop) => {
        const el = document.getElementById(stop.sectionId);
        return el ? el.getBoundingClientRect().top + window.scrollY : 0;
      });
      anchorsRef.current = computeAnchors(tops, vh);
      update(window.scrollY);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [update]);

  useMotionValueEvent(scrollY, "change", update);

  const subscribe = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return useMemo(
    () => ({ sampleRef, subscribe, reducedMotion, x, z, lift, along, finalPresence }),
    [subscribe, reducedMotion, x, z, lift, along, finalPresence],
  );
}
