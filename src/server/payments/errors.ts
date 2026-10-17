/** Códigos de erro normalizados entre provedores. A API pública expõe só o código e uma mensagem segura. */
export const PROVIDER_ERROR_CODES = [
  "PROVIDER_NOT_CONFIGURED",
  "METHOD_UNAVAILABLE",
  "OPERATION_NOT_SUPPORTED",
  "INVALID_REQUEST",
  "AUTHENTICATION_FAILED",
  "RATE_LIMITED",
  "TIMEOUT",
  "NETWORK_ERROR",
  "PROVIDER_UNAVAILABLE",
  "CHARGE_NOT_FOUND",
  "REFUND_NOT_ALLOWED",
  "WEBHOOK_SIGNATURE_INVALID",
  "INVALID_PROVIDER_RESPONSE",
  "UNKNOWN",
] as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];

const RETRYABLE: ReadonlySet<ProviderErrorCode> = new Set([
  "RATE_LIMITED",
  "TIMEOUT",
  "NETWORK_ERROR",
  "PROVIDER_UNAVAILABLE",
]);

const SAFE_MESSAGES: Record<ProviderErrorCode, string> = {
  PROVIDER_NOT_CONFIGURED: "Nenhum provedor de pagamentos está conectado a esta conta.",
  METHOD_UNAVAILABLE: "Este método de pagamento não está disponível.",
  OPERATION_NOT_SUPPORTED: "O provedor conectado não oferece esta operação.",
  INVALID_REQUEST: "A solicitação foi recusada pelo provedor. Revise os dados enviados.",
  AUTHENTICATION_FAILED: "As credenciais do provedor foram recusadas. Revise a configuração.",
  RATE_LIMITED: "O provedor limitou as requisições. Tente novamente em instantes.",
  TIMEOUT: "O provedor não respondeu a tempo. O status será confirmado por consulta.",
  NETWORK_ERROR: "Falha de comunicação com o provedor. O status será confirmado por consulta.",
  PROVIDER_UNAVAILABLE: "O provedor está indisponível no momento.",
  CHARGE_NOT_FOUND: "Cobrança não encontrada no provedor.",
  REFUND_NOT_ALLOWED: "O reembolso não é permitido para esta cobrança.",
  WEBHOOK_SIGNATURE_INVALID: "Assinatura do webhook inválida.",
  INVALID_PROVIDER_RESPONSE: "O provedor retornou uma resposta inesperada.",
  UNKNOWN: "Erro inesperado no provedor.",
};

export class ProviderError extends Error {
  override name = "ProviderError";
  readonly retryable: boolean;

  constructor(
    readonly code: ProviderErrorCode,
    /** Detalhe interno para logs. Nunca inclua segredos ou dados de cartão. */
    detail?: string,
    readonly providerCode?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.retryable = RETRYABLE.has(code);
  }

  /** Mensagem segura para exibir ao usuário ou devolver na API. */
  get publicMessage(): string {
    return SAFE_MESSAGES[this.code];
  }
}
