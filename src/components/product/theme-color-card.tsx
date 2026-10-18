"use client";

import { Check, Palette } from "lucide-react";

import { THEME_COLORS, useTheme } from "@/contexts/ThemeContext";

export function ThemeColorCard() {
  const { color, setColor } = useTheme();
  return (
    <section className="card-neon mb-4 rounded-2xl p-5" aria-labelledby="theme-title">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#111] text-ruby">
          <Palette className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="theme-title" className="text-neon text-[14px] font-bold">Cor do Tema</h2>
          <p className="text-[12px] text-[#E5E5E5]">Personalize a interface</p>
        </div>
      </header>
      <div role="radiogroup" aria-label="Cor do tema" className="flex flex-wrap items-center gap-4 px-1 py-1">
        {THEME_COLORS.map((c) => {
          const selected = c.value === color;
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={c.name}
              onClick={() => setColor(c.value)}
              className="relative grid size-12 place-items-center rounded-full outline-offset-4 transition-transform hover:scale-105 focus-visible:outline-2"
              style={{
                backgroundColor: c.value,
                outline: selected ? `2px solid ${c.value}` : undefined,
                outlineOffset: selected ? 4 : undefined,
              }}
            >
              {selected && (
                <span className="absolute inset-0 grid place-items-center rounded-full bg-black/20">
                  <Check className="size-5 text-white" strokeWidth={3} aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
