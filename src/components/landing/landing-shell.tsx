"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { JourneyProvider } from "./stage/journey-context";
import { Stage } from "./stage/stage";

/**
 * Desktop: duas colunas — texto à esquerda, palco 3D fixo (sticky) à direita.
 * O peão vive numa coluna própria e nunca cobre textos, formulários ou botões.
 * Mobile: sem palco fixo; a cena aparece no hero e a jornada segue na trilha do cabeçalho.
 */
export function LandingShell({ header, children, footer }: { header: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <JourneyProvider>
        {header}
        <div className="mx-auto max-w-[1520px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
          <main id="conteudo" className="min-w-0">
            {children}
          </main>
          <aside aria-hidden="true" className="relative hidden lg:block">
            <div className="sticky top-0 h-svh">
              <DesktopStage />
            </div>
          </aside>
        </div>
        {footer}
      </JourneyProvider>
    </MotionConfig>
  );
}

function DesktopStage() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  return isDesktop ? <Stage mode="journey" /> : null;
}

/** Colocado dentro do hero: só monta a cena no mobile. */
export function HeroStage() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  if (isDesktop !== false) return null;
  return (
    <div aria-hidden="true" className="relative -mx-4 mt-10 h-[62svh] max-h-[560px] sm:-mx-8">
      <Stage mode="hero" />
    </div>
  );
}
