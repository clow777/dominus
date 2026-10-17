"use client";

import { useReducedMotion } from "motion/react";
import { createContext, useContext, type ReactNode } from "react";

import { useJourney, type Journey } from "./use-journey";

const JourneyContext = createContext<Journey | null>(null);

/** Uma única medição de seções e uma única assinatura de rolagem para toda a landing. */
export function JourneyProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  const journey = useJourney(reduced);
  return <JourneyContext.Provider value={journey}>{children}</JourneyContext.Provider>;
}

export function useJourneyContext(): Journey {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error("useJourneyContext precisa estar dentro de <JourneyProvider>.");
  return ctx;
}
