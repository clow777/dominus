/**
 * Perfil do peão Dominus (meia silhueta, raio × altura, em casas do tabuleiro).
 * O mesmo perfil gera o sólido de revolução 3D e o desenho SVG de fallback,
 * para que as duas versões sejam o mesmo objeto.
 *
 * Proporções inspiradas no padrão Staunton, desenhadas do zero:
 * base com dois anéis, corpo cônico côncavo, colar fino e cabeça esférica.
 */

export type ProfilePoint = readonly [radius: number, height: number];

/** Corpo: da base ao pescoço. Pontos de controle suavizados por spline na cena 3D. */
export const BODY_PROFILE: readonly ProfilePoint[] = [
  [0.0, 0.0],
  [0.355, 0.0],
  [0.375, 0.012],
  [0.38, 0.05],
  [0.37, 0.078],
  [0.338, 0.094],
  [0.326, 0.106],
  [0.33, 0.124],
  [0.318, 0.142],
  [0.27, 0.168],
  [0.226, 0.21],
  [0.196, 0.272],
  [0.172, 0.352],
  [0.152, 0.45],
  [0.136, 0.548],
  [0.128, 0.612],
  [0.2, 0.628],
  [0.214, 0.646],
  [0.206, 0.664],
  [0.15, 0.676],
  [0.108, 0.69],
  [0.098, 0.712],
];

export const HEAD = { centerY: 0.858, radius: 0.168 } as const;

/** Ângulo (rad, a partir do equador) onde o pescoço encontra a cabeça. */
export const HEAD_START_ANGLE = -Math.acos(BODY_PROFILE[BODY_PROFILE.length - 1]![0] / HEAD.radius);

export const PAWN_HEIGHT = HEAD.centerY + HEAD.radius;

/** Arco da cabeça, do pescoço até o topo. */
export function headArc(segments = 24): ProfilePoint[] {
  const pts: ProfilePoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = HEAD_START_ANGLE + ((Math.PI / 2 - HEAD_START_ANGLE) * i) / segments;
    const r = Math.max(0, Math.cos(a) * HEAD.radius);
    pts.push([i === segments ? 0 : r, HEAD.centerY + Math.sin(a) * HEAD.radius]);
  }
  return pts;
}

/**
 * Caminho SVG da silhueta completa, centrado em x=0 com a base em y=0
 * e altura crescendo para cima (y negativo no SVG).
 */
export function silhouettePath(scale = 100): string {
  const half = [...BODY_PROFILE.slice(1), ...headArc(16)];
  const right = half.map(([r, h]) => `${(r * scale).toFixed(2)} ${(-h * scale).toFixed(2)}`);
  const left = [...half].reverse().map(([r, h]) => `${(-r * scale).toFixed(2)} ${(-h * scale).toFixed(2)}`);
  return `M0 0 L${right.join(" L")} L${left.join(" L")} Z`;
}
