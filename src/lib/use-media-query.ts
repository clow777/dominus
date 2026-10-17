"use client";

import { useSyncExternalStore } from "react";

/** `null` durante a renderização no servidor; boolean depois da hidratação. */
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}

export const DESKTOP_QUERY = "(min-width: 1024px)";
