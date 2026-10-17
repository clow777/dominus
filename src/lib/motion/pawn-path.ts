/**
 * Trajetória do peão — funções puras, sem DOM e sem three.js.
 *
 * O caminho é uma partida legal de peão: e2 → e4 (avanço duplo) → e5 → e6
 * → captura em diagonal para d7 → promoção em d8. Cada parada está presa a
 * uma seção da landing page. Entre duas paradas o peão fica parado e só se
 * move numa janela de rolagem logo antes de a próxima seção chegar — assim
 * cada rolagem parece um movimento planejado, não um deslizamento contínuo.
 *
 * Todo valor aqui é derivado do scrollY real: a mesma posição de rolagem
 * produz sempre a mesma pose, sem saltos.
 */

export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Square = `${File}${Rank}`;

export interface PathStop {
  /** id do elemento <section> que ancora esta parada. */
  sectionId: string;
  square: Square;
}

export const PAWN_PATH: readonly PathStop[] = [
  { sectionId: "inicio", square: "e2" },
  { sectionId: "pagamentos", square: "e4" },
  { sectionId: "produto", square: "e5" },
  { sectionId: "seguranca", square: "e6" },
  { sectionId: "desenvolvedores", square: "d7" },
  { sectionId: "comecar", square: "d8" },
] as const;

/** Índices das paradas com efeitos próprios na cena. */
export const STOP = {
  security: 3,
  integrations: 4,
  final: 5,
} as const;

export interface BoardPoint {
  /** Coluna centrada: a = -3.5 … h = 3.5 (unidades = casas). */
  x: number;
  /** Fileira centrada, crescendo para longe da câmera: 1 = 3.5 … 8 = -3.5. */
  z: number;
}

export function squareToPoint(square: Square): BoardPoint {
  const file = square.charCodeAt(0) - 97; // a → 0
  const rank = Number(square[1]); // 1..8
  if (file < 0 || file > 7 || rank < 1 || rank > 8) throw new Error(`Casa inválida: ${square}`);
  return { x: file - 3.5, z: 3.5 - (rank - 1) };
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Posição de rolagem (px) em que cada parada é alcançada, já ordenada
 * e estritamente crescente. Calculada uma vez por resize, nunca por quadro.
 */
export type Anchors = readonly number[];

/**
 * Converte o topo absoluto de cada seção em âncoras.
 * A parada é alcançada quando o topo da seção cruza `viewportRatio` da altura da janela.
 * A primeira âncora é sempre 0 (peão já em e2 no carregamento).
 */
export function computeAnchors(sectionTops: readonly number[], viewportHeight: number, viewportRatio = 0.55): Anchors {
  const out: number[] = [];
  sectionTops.forEach((top, i) => {
    const raw = i === 0 ? 0 : Math.max(0, top - viewportHeight * viewportRatio);
    const prev = out[i - 1];
    // Garante ordem estrita mesmo se seções forem muito curtas ou o layout mudar.
    out.push(prev === undefined ? raw : Math.max(raw, prev + 1));
  });
  return out;
}

export interface PathSample {
  x: number;
  z: number;
  /** Altura do salto durante um movimento (0 parado). */
  lift: number;
  /** Índice da última parada alcançada. */
  stop: number;
  /** Progresso do movimento em direção à próxima parada (0–1, já suavizado). */
  t: number;
  /** Posição contínua ao longo das paradas: stop + t. Usada pela trilha mobile. */
  along: number;
  /** Presença (0–1) de cada parada: 1 enquanto o peão está nela, com rampas de entrada e saída. */
  presence: number[];
}

export interface SampleOptions {
  /** Distância de rolagem (px) que um movimento ocupa antes de cada âncora. */
  moveDistance: number;
  /** Altura máxima do salto, em casas. */
  hop?: number;
}

/** Progresso suavizado do movimento que termina na âncora `i` (i ≥ 1). */
function arrival(scrollY: number, anchors: Anchors, i: number, moveDistance: number): number {
  const end = anchors[i]!;
  const prev = anchors[i - 1]!;
  const span = Math.min(moveDistance, end - prev);
  const start = end - span;
  return easeInOutCubic(clamp01((scrollY - start) / span));
}

export function samplePath(
  scrollY: number,
  anchors: Anchors,
  options: SampleOptions,
  path: readonly PathStop[] = PAWN_PATH,
): PathSample {
  if (anchors.length !== path.length || path.length === 0) {
    throw new Error("O número de âncoras precisa ser igual ao número de paradas.");
  }
  const hop = options.hop ?? 0.35;
  const n = path.length;

  // Progresso de chegada em cada parada (a primeira está sempre alcançada).
  const arrived = path.map((_, i) => (i === 0 ? 1 : arrival(scrollY, anchors, i, options.moveDistance)));

  // Última parada totalmente alcançada.
  let stop = 0;
  for (let i = 1; i < n; i++) if (arrived[i]! >= 1) stop = i;
  const t = stop < n - 1 ? arrived[stop + 1]! : 0;

  const from = squareToPoint(path[stop]!.square);
  const to = stop < n - 1 ? squareToPoint(path[stop + 1]!.square) : from;
  const distance = Math.hypot(to.x - from.x, to.z - from.z);

  const presence = path.map((_, i) => {
    const enter = arrived[i]!;
    const leave = i < n - 1 ? arrived[i + 1]! : 0;
    return clamp01(enter - leave);
  });

  return {
    x: from.x + (to.x - from.x) * t,
    z: from.z + (to.z - from.z) * t,
    // Salto proporcional à distância: o avanço duplo sobe um pouco mais que o simples.
    lift: Math.sin(Math.PI * t) * hop * Math.min(1.4, Math.max(distance, 1) ** 0.5),
    stop,
    t,
    along: stop + t,
    presence,
  };
}

/** Pose discreta para prefers-reduced-motion: sem salto, sem interpolação. */
export function snapPath(scrollY: number, anchors: Anchors, path: readonly PathStop[] = PAWN_PATH): PathSample {
  let stop = 0;
  for (let i = 1; i < anchors.length; i++) if (scrollY >= anchors[i]!) stop = i;
  const p = squareToPoint(path[stop]!.square);
  return {
    x: p.x,
    z: p.z,
    lift: 0,
    stop,
    t: 0,
    along: stop,
    presence: path.map((_, i) => (i === stop ? 1 : 0)),
  };
}

/**
 * Amortecimento exponencial independente de taxa de quadros.
 * Usado na cena para suavizar a pose quando a rolagem salta (clique em âncora).
 */
export function damp(current: number, target: number, lambda: number, dtSeconds: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dtSeconds));
}
