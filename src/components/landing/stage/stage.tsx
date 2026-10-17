"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";

import { useJourneyContext } from "./journey-context";
import { PawnFallback } from "./pawn-fallback";
import type { StageMode } from "./pawn-scene";

// three.js e a cena só são baixados no cliente, depois que a página já pintou.
const PawnScene = dynamic(() => import("./pawn-scene"), { ssr: false });

type GlState = "checking" | "supported" | "unsupported";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function whenIdle(cb: () => void): () => void {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(cb, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(cb, 200);
  return () => clearTimeout(id);
}

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.error("Cena 3D falhou; usando a versão 2D.", error);
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Stage({ mode }: { mode: StageMode }) {
  const journey = useJourneyContext();
  const container = useRef<HTMLDivElement>(null);
  const [gl, setGl] = useState<GlState>("checking");
  const [load3d, setLoad3d] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const ok = supportsWebGL();
    setGl(ok ? "supported" : "unsupported");
    if (!ok) return;
    return whenIdle(() => setLoad3d(true));
  }, []);

  // Expõe a parada atual no DOM (sem re-renderizar) para testes e depuração.
  useEffect(() => {
    const write = () => {
      const el = container.current;
      const s = journey.sampleRef.current;
      if (!el) return;
      el.dataset.stop = String(mode === "hero" ? 0 : s.stop);
      el.dataset.moving = s.t > 0 && s.t < 1 && mode !== "hero" ? "true" : "false";
    };
    write();
    return journey.subscribe(write);
  }, [journey, mode]);

  // Para de renderizar quando o palco sai da tela (mobile: hero rolado para cima).
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true), {
      rootMargin: "100px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const show3d = gl === "supported" && load3d;

  return (
    <div ref={container} className="relative h-full w-full" data-stage-mode={mode} data-stage-ready={ready || undefined}>
      <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: ready ? 0 : 1 }}>
        <PawnFallback journey={journey} frozen={mode === "hero"} />
      </div>
      {show3d ? (
        <SceneBoundary onError={() => setGl("unsupported")}>
          <div
            aria-hidden="true"
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: ready ? 1 : 0 }}
          >
            <PawnScene
              journey={journey}
              mode={mode}
              active={visible}
              onReady={() => setReady(true)}
              onFailure={() => {
                setReady(false);
                setGl("unsupported");
              }}
            />
          </div>
        </SceneBoundary>
      ) : null}
    </div>
  );
}
