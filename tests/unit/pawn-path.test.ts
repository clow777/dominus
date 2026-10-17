import { describe, expect, it } from "vitest";

import {
  PAWN_PATH,
  STOP,
  computeAnchors,
  damp,
  easeInOutCubic,
  samplePath,
  snapPath,
  squareToPoint,
} from "@/lib/motion/pawn-path";
import { BODY_PROFILE, HEAD, PAWN_HEIGHT, headArc, silhouettePath } from "@/lib/motion/pawn-profile";

const VH = 900;
const MOVE = VH * 0.7;
// Seções fictícias: topo de cada parada, bem espaçadas.
const TOPS = [0, 1200, 2600, 5200, 7000, 10000];
const anchors = computeAnchors(TOPS, VH);

describe("casas do tabuleiro", () => {
  it("mapeia cantos e centro", () => {
    expect(squareToPoint("a1")).toEqual({ x: -3.5, z: 3.5 });
    expect(squareToPoint("h8")).toEqual({ x: 3.5, z: -3.5 });
    expect(squareToPoint("e2")).toEqual({ x: 0.5, z: 2.5 });
  });
  it("rejeita casa inválida", () => {
    expect(() => squareToPoint("i9" as never)).toThrow();
  });
});

describe("caminho do peão", () => {
  it("é uma sequência legal de peão: avanço duplo, simples, captura diagonal e promoção", () => {
    const squares = PAWN_PATH.map((s) => s.square);
    expect(squares).toEqual(["e2", "e4", "e5", "e6", "d7", "d8"]);
    for (let i = 1; i < PAWN_PATH.length; i++) {
      const a = squareToPoint(PAWN_PATH[i - 1]!.square);
      const b = squareToPoint(PAWN_PATH[i]!.square);
      const forward = a.z - b.z; // sempre para frente
      const sideways = Math.abs(b.x - a.x);
      expect(forward).toBeGreaterThan(0);
      expect(sideways).toBeLessThanOrEqual(1);
      if (sideways === 1) expect(forward).toBe(1); // captura: uma casa na diagonal
      if (forward === 2) expect(i).toBe(1); // avanço duplo só no primeiro lance
    }
  });

  it("termina na última fileira (promoção)", () => {
    expect(PAWN_PATH.at(-1)!.square.endsWith("8")).toBe(true);
  });
});

describe("computeAnchors", () => {
  it("começa em zero e é estritamente crescente", () => {
    expect(anchors[0]).toBe(0);
    for (let i = 1; i < anchors.length; i++) expect(anchors[i]!).toBeGreaterThan(anchors[i - 1]!);
  });
  it("mantém a ordem mesmo com seções sobrepostas ou fora de ordem", () => {
    const a = computeAnchors([0, 100, 90, 90, 2000, 1500], VH);
    for (let i = 1; i < a.length; i++) expect(a[i]!).toBeGreaterThan(a[i - 1]!);
  });
});

describe("samplePath", () => {
  const sample = (y: number) => samplePath(y, anchors, { moveDistance: MOVE });

  it("no topo o peão está parado em e2", () => {
    const s = sample(0);
    expect(s.stop).toBe(0);
    expect({ x: s.x, z: s.z }).toEqual(squareToPoint("e2"));
    expect(s.lift).toBe(0);
    expect(s.presence[0]).toBe(1);
  });

  it("em cada âncora o peão está exatamente na casa da parada", () => {
    PAWN_PATH.forEach((stop, i) => {
      const s = sample(anchors[i]!);
      expect(s.stop).toBe(i);
      expect(s.x).toBeCloseTo(squareToPoint(stop.square).x, 10);
      expect(s.z).toBeCloseTo(squareToPoint(stop.square).z, 10);
      expect(s.lift).toBeCloseTo(0, 10);
    });
  });

  it("fica parado entre movimentos (segura a casa até a janela do próximo lance)", () => {
    const holdY = anchors[1]! + 10;
    const before = anchors[2]! - MOVE - 1;
    expect(sample(holdY).z).toBeCloseTo(sample(before).z, 10);
  });

  it("é contínuo: passos pequenos de rolagem geram passos pequenos de posição", () => {
    let prev = sample(0);
    const end = anchors.at(-1)! + 500;
    for (let y = 1; y <= end; y += 4) {
      const s = sample(y);
      expect(Math.hypot(s.x - prev.x, s.z - prev.z)).toBeLessThan(0.05);
      expect(Math.abs(s.lift - prev.lift)).toBeLessThan(0.05);
      prev = s;
    }
  });

  it("é determinístico: mesma rolagem, mesma pose", () => {
    expect(sample(4321)).toEqual(sample(4321));
  });

  it("salta no meio do movimento e pousa no fim", () => {
    const mid = anchors[1]! - MOVE / 2;
    expect(sample(mid).lift).toBeGreaterThan(0.2);
    expect(sample(anchors[1]!).lift).toBeCloseTo(0, 10);
  });

  it("along vai de 0 ao número de paradas − 1 sem recuar", () => {
    let prev = -1;
    for (let y = 0; y <= anchors.at(-1)! + 100; y += 25) {
      const a = sample(y).along;
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
    expect(prev).toBe(PAWN_PATH.length - 1);
  });

  it("presenças ficam entre 0 e 1 e somam no máximo 1 (+ folga numérica)", () => {
    for (let y = 0; y <= anchors.at(-1)! + 100; y += 50) {
      const p = sample(y).presence;
      for (const v of p) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(p.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("acende segurança, integrações e a casa final nas seções certas", () => {
    expect(sample(anchors[STOP.security]! + 5).presence[STOP.security]).toBe(1);
    expect(sample(anchors[STOP.integrations]! + 5).presence[STOP.integrations]).toBe(1);
    expect(sample(anchors[STOP.final]! + 5).presence[STOP.final]).toBe(1);
    expect(sample(0).presence[STOP.final]).toBe(0);
  });

  it("valida o número de âncoras", () => {
    expect(() => samplePath(0, [0, 1], { moveDistance: 10 })).toThrow();
  });
});

describe("snapPath (prefers-reduced-motion)", () => {
  it("nunca interpola nem salta", () => {
    for (let y = 0; y <= anchors.at(-1)! + 100; y += 37) {
      const s = snapPath(y, anchors);
      expect(s.lift).toBe(0);
      expect(s.t).toBe(0);
      expect(Number.isInteger(s.along)).toBe(true);
      const sq = squareToPoint(PAWN_PATH[s.stop]!.square);
      expect({ x: s.x, z: s.z }).toEqual(sq);
    }
  });
});

describe("funções auxiliares", () => {
  it("easeInOutCubic fixa as pontas e é monotônica", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    let prev = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      const v = easeInOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
  });

  it("damp converge sem ultrapassar o alvo, independente do passo", () => {
    let a = 0;
    let b = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 1, 14, 1 / 60);
    for (let i = 0; i < 30; i++) b = damp(b, 1, 14, 1 / 30);
    expect(a).toBeLessThanOrEqual(1);
    expect(Math.abs(a - b)).toBeLessThan(1e-9);
    expect(a).toBeGreaterThan(0.99);
  });
});

describe("perfil do peão", () => {
  it("o corpo sobe sem voltar e o pescoço encontra a cabeça", () => {
    for (let i = 1; i < BODY_PROFILE.length; i++) {
      expect(BODY_PROFILE[i]![1]).toBeGreaterThanOrEqual(BODY_PROFILE[i - 1]![1]);
    }
    const head = headArc(24);
    expect(head[0]![0]).toBeCloseTo(BODY_PROFILE.at(-1)![0], 6);
    expect(head.at(-1)).toEqual([0, HEAD.centerY + HEAD.radius]);
  });

  it("cabe numa casa (base com raio < 0,5) e tem proporção de peão", () => {
    const maxR = Math.max(...BODY_PROFILE.map(([r]) => r));
    expect(maxR).toBeLessThan(0.5);
    expect(PAWN_HEIGHT / (maxR * 2)).toBeGreaterThan(1.2);
    expect(PAWN_HEIGHT / (maxR * 2)).toBeLessThan(1.8);
  });

  it("gera um caminho SVG fechado e simétrico", () => {
    const d = silhouettePath(100);
    expect(d.startsWith("M0 0")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d).not.toContain("NaN");
  });
});
