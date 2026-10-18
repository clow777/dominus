import "server-only";

import { getBalance } from "@/lib/gateways/eleva";
import { serverEnv } from "@/server/env";
import { ProviderError } from "@/server/payments/errors";

export interface ElevaSummary {
  configured: boolean;
  /** Saldo disponível em centavos; null se a consulta falhou. */
  balanceCents: number | null;
  error: string | null;
}

const TTL_MS = 30_000;
let cache: { at: number; value: ElevaSummary } | null = null;

/** Saldo da conta Eleva para o painel, com cache curto (a Eleva bloqueia excesso de requisições). */
export async function getElevaSummary(organizationId: string): Promise<ElevaSummary> {
  const env = serverEnv();
  if (!env.ELEVA_CLIENT_ID || !env.ELEVA_TOKEN_SECRET) return { configured: false, balanceCents: null, error: null };
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let value: ElevaSummary;
  try {
    const b = await getBalance({ organizationId });
    value = { configured: true, balanceCents: Math.round(b.available * 100), error: null };
  } catch (err) {
    value = { configured: true, balanceCents: null, error: err instanceof ProviderError ? err.publicMessage : "Falha ao consultar a Eleva." };
  }
  cache = { at: Date.now(), value };
  return value;
}

export function invalidateElevaSummary() {
  cache = null;
}

/** Log único na subida do servidor: confirma que as credenciais da Eleva funcionam. */
export async function announceEleva(): Promise<void> {
  const env = serverEnv();
  if (env.PAYMENT_PROVIDER !== "eleva" || !env.ELEVA_CLIENT_ID || !env.ELEVA_TOKEN_SECRET) return;
  try {
    await getBalance({ operation: "boot_check" });
    console.warn("[eleva] Eleva conectado");
  } catch (err) {
    console.warn("[eleva] não foi possível validar a conexão:", err instanceof ProviderError ? err.message : "erro");
  }
}
