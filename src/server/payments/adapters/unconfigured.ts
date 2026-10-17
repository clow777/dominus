import { ProviderError } from "../errors";
import type { PaymentProviderAdapter, ProviderCapabilities } from "../provider";

/**
 * Adaptador usado quando PAYMENT_PROVIDER=none.
 *
 * Não simula nada: declara que nenhum método está disponível e recusa toda
 * operação com PROVIDER_NOT_CONFIGURED. A interface usa as capacidades
 * vazias para mostrar os métodos como "pendentes de conexão".
 */
export const unconfiguredProvider: PaymentProviderAdapter = {
  id: "none",
  displayName: "Nenhum provedor conectado",

  async getCapabilities(): Promise<ProviderCapabilities> {
    return {
      methods: [],
      refunds: false,
      partialRefunds: false,
      cancellation: false,
      hostedCheckout: false,
      recurring: false,
    };
  },

  async getConfiguredFees() {
    return null;
  },

  async createCharge() {
    throw new ProviderError("PROVIDER_NOT_CONFIGURED");
  },
  async getCharge() {
    throw new ProviderError("PROVIDER_NOT_CONFIGURED");
  },
  async cancelCharge() {
    throw new ProviderError("PROVIDER_NOT_CONFIGURED");
  },
  async createRefund() {
    throw new ProviderError("PROVIDER_NOT_CONFIGURED");
  },
  async getRefund() {
    throw new ProviderError("PROVIDER_NOT_CONFIGURED");
  },
  async verifyWebhook() {
    // Sem provedor não há segredo para verificar: todo webhook é rejeitado.
    throw new ProviderError("WEBHOOK_SIGNATURE_INVALID", "nenhum provedor configurado");
  },
  mapStatus(rawStatus: string) {
    throw new ProviderError("PROVIDER_NOT_CONFIGURED", `status recebido sem provedor: ${rawStatus}`);
  },
};
