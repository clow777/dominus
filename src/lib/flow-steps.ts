/** Regras puras dos passos de fluxo (sem banco nem rede), para serem testadas isoladamente. */

export const DEFAULT_WAIT_MINUTES = 30;
export const MAX_WAIT_MINUTES = 24 * 60;
export const MAX_RUN_ATTEMPTS = 3;

/** Troca `{nome}` pelo primeiro nome do lead; qualquer outra chave é mantida como está. */
export function renderText(template: string, vars: { nome?: string | null }): string {
  return template.replace(/\{nome\}/gi, vars.nome?.trim() || "").replace(/[ \t]{2,}/g, " ").trim();
}

/** Minutos de espera do passo "Aguardar pagamento": padrão 30, entre 1 e 1440. */
export function parseWaitMinutes(raw: string | undefined): number {
  const n = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_WAIT_MINUTES;
  return Math.min(n, MAX_WAIT_MINUTES);
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Espera antes de nova tentativa de um passo que falhou: 30 s, 60 s, 90 s… */
export function retryDelayMs(attempt: number): number {
  return 30_000 * Math.max(1, attempt);
}
