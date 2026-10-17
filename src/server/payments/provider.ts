import type { Cents, CurrencyCode, FeeSchedule } from "@/lib/money";
import type { TransactionStatus } from "@/server/domain/transactions/state-machine";

/**
 * Contrato que todo adaptador de provedor de pagamentos implementa.
 *
 * A Dominus não liquida nem custodia recursos por conta própria: o adaptador
 * conversa com um provedor autorizado e contratado. A disponibilidade de cada
 * método vem de `getCapabilities()` do adaptador configurado — nunca de uma
 * lista fixa na interface.
 */

export type PaymentMethod = "pix" | "credit_card" | "debit_card" | "boleto";

export interface ProviderCapabilities {
  methods: PaymentMethod[];
  refunds: boolean;
  partialRefunds: boolean;
  cancellation: boolean;
  /** Checkout hospedado ou componente seguro do provedor (cartões nunca passam pela Dominus). */
  hostedCheckout: boolean;
  recurring: boolean;
}

export interface CreateChargeInput {
  /** ID interno do PaymentIntent, enviado ao provedor como referência. */
  reference: string;
  amount: Cents;
  currency: CurrencyCode;
  method: PaymentMethod;
  description?: string;
  customer?: { name: string; email?: string; document?: string };
  expiresAt?: Date;
  /** URL de retorno já validada contra a lista de permitidas da organização. */
  returnUrl?: string;
}

export interface ProviderCharge {
  externalId: string;
  status: TransactionStatus;
  rawStatus: string;
  amount: Cents;
  currency: CurrencyCode;
  method: PaymentMethod;
  expiresAt?: Date;
  /** Pix: payload copia-e-cola e QR fornecidos pelo provedor. */
  pix?: { payload: string; qrCodeImage?: string };
  /** Checkout hospedado do provedor (cartões). */
  checkoutUrl?: string;
  failureReason?: string;
}

export interface CreateRefundInput {
  chargeExternalId: string;
  amount: Cents;
  reason: string;
}

export interface ProviderRefund {
  externalId: string;
  chargeExternalId: string;
  amount: Cents;
  status: "pending" | "succeeded" | "failed";
  rawStatus: string;
  failureReason?: string;
}

/** Evento de webhook já com assinatura verificada pelo adaptador. */
export interface VerifiedProviderEvent {
  /** ID único do evento no provedor — chave de deduplicação. */
  eventId: string;
  type: "charge.updated" | "refund.updated" | "dispute.updated" | "unknown";
  occurredAt: Date;
  chargeExternalId?: string;
  status?: TransactionStatus;
  rawStatus?: string;
  /** Payload original, guardado em ProviderEvents para auditoria. */
  raw: unknown;
}

export interface OperationContext {
  /** Repassada ao provedor quando ele suporta idempotência nativa. */
  idempotencyKey: string;
  correlationId: string;
  signal?: AbortSignal;
}

export interface PaymentProviderAdapter {
  readonly id: string;
  readonly displayName: string;

  getCapabilities(): Promise<ProviderCapabilities>;
  /** Tarifas efetivamente contratadas para o método; `null` se não configuradas. */
  getConfiguredFees(method: PaymentMethod): Promise<FeeSchedule | null>;

  createCharge(input: CreateChargeInput, ctx: OperationContext): Promise<ProviderCharge>;
  getCharge(externalId: string, ctx: Omit<OperationContext, "idempotencyKey">): Promise<ProviderCharge>;
  cancelCharge(externalId: string, ctx: OperationContext): Promise<ProviderCharge>;

  createRefund(input: CreateRefundInput, ctx: OperationContext): Promise<ProviderRefund>;
  getRefund(externalId: string, ctx: Omit<OperationContext, "idempotencyKey">): Promise<ProviderRefund>;

  /**
   * Verifica a assinatura e o timestamp do webhook e normaliza o evento.
   * Deve lançar ProviderError("WEBHOOK_SIGNATURE_INVALID") se a verificação falhar.
   * Recebe o corpo bruto: a assinatura é calculada sobre os bytes originais.
   */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedProviderEvent>;

  /** Mapeia o status textual do provedor para o modelo interno. */
  mapStatus(rawStatus: string): TransactionStatus;
}
