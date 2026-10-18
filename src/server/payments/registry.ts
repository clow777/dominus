import "server-only";

import { serverEnv } from "@/server/env";
import { elevaProvider } from "./adapters/eleva";
import { unconfiguredProvider } from "./adapters/unconfigured";
import type { PaymentProviderAdapter } from "./provider";

/**
 * Adaptadores registrados. Para conectar um provedor real:
 * 1. Implemente PaymentProviderAdapter em ./adapters/<provedor>.ts
 * 2. Registre aqui com o mesmo id usado em PAYMENT_PROVIDER
 * 3. Adicione as credenciais em src/server/env.ts (nunca no cliente)
 * Ver docs/PROVIDERS.md.
 */
const ADAPTERS: Record<string, PaymentProviderAdapter> = {
  none: unconfiguredProvider,
  eleva: elevaProvider,
};

export function getPaymentProvider(): PaymentProviderAdapter {
  const id = serverEnv().PAYMENT_PROVIDER;
  const adapter = ADAPTERS[id];
  if (!adapter) {
    throw new Error(`PAYMENT_PROVIDER="${id}" não tem adaptador registrado em src/server/payments/registry.ts.`);
  }
  return adapter;
}
