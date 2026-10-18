"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export const THEME_STORAGE_KEY = "dominus-theme";
// Cada bolinha seleciona uma variação de rubi: a interface nunca sai da paleta Black Ruby.
export const THEME_COLORS = [
  { name: "Azul", value: "#3B82F6", dark: "#6B0000", bright: "#C70000" },
  { name: "Ciano", value: "#06B6D4", dark: "#7A0020", bright: "#D10A3A" },
  { name: "Rubi", value: "#8B0000", dark: "#8B0000", bright: "#C70000" },
  { name: "Verde", value: "#10B981", dark: "#5E0000", bright: "#B3001B" },
  { name: "Rubi vivo", value: "#C70000", dark: "#8B0000", bright: "#E00000" },
  { name: "Laranja", value: "#F59E0B", dark: "#7A1400", bright: "#C72A00" },
  { name: "Rosa", value: "#EC4899", dark: "#7A0026", bright: "#C7003F" },
] as const;
const DEFAULT_COLOR = "#8B0000";

type ThemeValue = { color: string; setColor: (color: string) => void };
const ThemeContext = createContext<ThemeValue | null>(null);

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readStored(): string {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v && THEME_COLORS.some((c) => c.value === v) ? v : DEFAULT_COLOR;
  } catch {
    return DEFAULT_COLOR;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const color = useSyncExternalStore(subscribe, readStored, () => DEFAULT_COLOR);

  useEffect(() => {
    const root = document.documentElement.style;
    const ruby = THEME_COLORS.find((c) => c.value === color) ?? THEME_COLORS[2];
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(ruby.bright.slice(i, i + 2), 16));
    root.setProperty("--ruby-dark", ruby.dark);
    root.setProperty("--ruby-bright", ruby.bright);
    root.setProperty("--ruby-glow", `rgba(${r},${g},${b},0.6)`);
    root.setProperty("--primary", ruby.bright);
    root.setProperty("--primary-glow", `rgba(${r},${g},${b},0.6)`);
    // Faz o tema alcançar os componentes que usam os tokens do dashboard.
    root.setProperty("--color-dp-primary", ruby.bright);
    root.setProperty("--dp-glow", `rgba(${r},${g},${b},0.6)`);
    root.setProperty("--dp-soft", `rgba(${r},${g},${b},0.15)`);
  }, [color]);

  const setColor = useCallback((next: string) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* armazenamento indisponível: a cor vale só até recarregar */
    }
    listeners.forEach((l) => l());
  }, []);

  const value = useMemo(() => ({ color, setColor }), [color, setColor]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}
