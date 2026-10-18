"use server";

import { revalidatePath } from "next/cache";

import { createPix, getBalance } from "@/lib/gateways/eleva";
import { requireApprovedForAction } from "@/server/auth/guard";
import { ProviderError } from "@/server/payments/errors";
import { invalidateElevaSummary } from "@/server/payments/eleva-summary";

export interface TestConnectionResult {
  ok: boolean;
  balanceOk: boolean;
  pixOk: boolean;
  message: string;
}

const TEST_AMOUNT_CENTS = 100; // R$ 1,00
const COOLDOWN_MS = 30_000;
const lastRun = new Map<string, number>();

const describe = (err: unknown) => (err instanceof ProviderError ? err.publicMessage : "Erro inesperado.");

/** Valida credenciais (saldo) e a criação de PIX (R$ 1,00, nunca pago: expira sozinho). Tudo vai para gateway_logs. */
export async function testElevaConnection(): Promise<TestConnectionResult> {
  const { orgId } = await requireApprovedForAction();
  const now = Date.now();
  if (now - (lastRun.get(orgId) ?? 0) < COOLDOWN_MS) return { ok: false, balanceOk: false, pixOk: false, message: "Aguarde alguns segundos antes de testar de novo." };
  lastRun.set(orgId, now);

  try {
    await getBalance({ organizationId: orgId, operation: "test_connection" });
  } catch (err) {
    return { ok: false, balanceOk: false, pixOk: false, message: `Credenciais: ${describe(err)}` };
  }

  try {
    await createPix(TEST_AMOUNT_CENTS, `dominus-test-${orgId.slice(0, 8)}-${now}`, { organizationId: orgId });
  } catch (err) {
    return { ok: false, balanceOk: true, pixOk: false, message: `Credenciais válidas, mas a criação do PIX falhou: ${describe(err)} Detalhes em gateway_logs.` };
  }

  invalidateElevaSummary();
  revalidatePath("/gateways");
  return { ok: true, balanceOk: true, pixOk: true, message: "Eleva conectado: credenciais válidas e PIX de R$ 1,00 criado (expira sem cobrança)." };
}
