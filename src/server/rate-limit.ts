import "server-only";

const buckets = new Map<string, number[]>();

/** Janela deslizante em memória (por instância). Retorna false quando o limite estourou. */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
