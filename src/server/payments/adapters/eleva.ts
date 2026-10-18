import "server-only";

import { createPix, getStatus, handleWebhook, mapElevaStatus } from "@/lib/gateways/eleva";
import { cents } from "@/lib/money";
import { ProviderError } from "../errors";
import type { PaymentProviderAdapter, ProviderCapabilities, ProviderCharge } from "../provider";

/**
 * Adaptador da Eleva (PIX). Só PIX: cancelamento, reembolso e cartões não são
 * oferecidos por esta integração e recusam com OPERATION_NOT_SUPPORTED.
 */
export const elevaProvider: PaymentProviderAdapter = {
  id: "eleva",
  displayName: "Dominus Pay (Eleva)",

  async getCapabilities(): Promise<ProviderCapabilities> {
    return { methods: ["pix"], refunds: false, partialRefunds: false, cancellation: false, hostedCheckout: false, recurring: false };
  },

  async getConfiguredFees() {
    return null;
  },

  async createCharge(input): Promise<ProviderCharge> {
    if (input.method !== "pix") throw new ProviderError("METHOD_UNAVAILABLE");
    const pix = await createPix(input.amount, input.reference);
    return {
      externalId: pix.transactionId,
      status: "awaiting_payment",
      rawStatus: "created",
      amount: input.amount,
      currency: input.currency,
      method: "pix",
      expiresAt: input.expiresAt,
      pix: { payload: pix.pixCode, qrCodeImage: pix.qrBase64 ?? undefined },
    };
  },

  async getCharge(externalId): Promise<ProviderCharge> {
    const s = await getStatus(externalId);
    return {
      externalId: s.transactionId,
      status: s.status ?? "awaiting_payment",
      rawStatus: s.rawStatus,
      amount: cents(Math.round(s.amount ?? 0)),
      currency: "BRL",
      method: "pix",
      pix: s.pixCode ? { payload: s.pixCode } : undefined,
    };
  },

  async cancelCharge() {
    throw new ProviderError("OPERATION_NOT_SUPPORTED", "a Eleva não tem cancelamento de PIX nesta integração; cobranças não pagas expiram");
  },
  async createRefund() {
    throw new ProviderError("OPERATION_NOT_SUPPORTED");
  },
  async getRefund() {
    throw new ProviderError("OPERATION_NOT_SUPPORTED");
  },

  /**
   * A Eleva não documenta assinatura de webhook. Por isso o payload nunca é aceito como
   * verdade: o status é reconsultado na API com as nossas credenciais (um webhook forjado
   * só consegue disparar uma consulta, nunca aprovar um pagamento).
   */
  async verifyWebhook(rawBody) {
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new ProviderError("WEBHOOK_SIGNATURE_INVALID", "corpo não é JSON");
    }
    const claimed = handleWebhook(payload);
    const confirmed = await getStatus(claimed.transactionId);
    return {
      eventId: `${confirmed.transactionId}:${confirmed.rawStatus.toLowerCase()}`,
      type: "charge.updated",
      occurredAt: new Date(),
      chargeExternalId: confirmed.transactionId,
      status: confirmed.status ?? undefined,
      rawStatus: confirmed.rawStatus,
      raw: payload,
    };
  },

  mapStatus(rawStatus) {
    const status = mapElevaStatus(rawStatus);
    if (!status) throw new ProviderError("INVALID_PROVIDER_RESPONSE", `status desconhecido: ${rawStatus}`);
    return status;
  },
};
