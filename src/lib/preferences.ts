export const NOTIFICATION_TYPES = [
  { key: "venda_aprovada", label: "Venda aprovada", description: "Avisar quando um pagamento for aprovado.", defaultOn: true },
  { key: "pix_gerado", label: "PIX gerado", description: "Avisar quando um PIX for criado.", defaultOn: false },
  { key: "pix_expirado", label: "PIX expirado", description: "Avisar quando um PIX expirar sem pagamento.", defaultOn: true },
  { key: "pagamento_recusado", label: "Pagamento recusado", description: "Avisar quando um pagamento for recusado.", defaultOn: true },
  { key: "reembolso", label: "Reembolso", description: "Avisar sobre reembolsos e estornos.", defaultOn: true },
  { key: "erro_integracao", label: "Erro de integração", description: "Avisar sobre falhas em gateways e webhooks.", defaultOn: true },
  { key: "saque", label: "Saque", description: "Avisar sobre solicitações e liquidações de saque.", defaultOn: true },
  { key: "kyc", label: "Verificação KYC", description: "Avisar sobre mudanças na verificação de identidade.", defaultOn: true },
] as const;

export type NotificationKey = (typeof NOTIFICATION_TYPES)[number]["key"];
export const NOTIFICATION_KEYS = NOTIFICATION_TYPES.map((n) => n.key) as NotificationKey[];

export const TRACKING_PLATFORMS = [
  { key: "facebook", name: "Facebook Pixel", field: "Pixel ID", description: "Eventos de conversão do Meta Ads." },
  { key: "utmify", name: "UTMIFY", field: "Token da API", description: "Rastreamento de UTMs e atribuição de vendas." },
  { key: "tiktok", name: "TikTok", field: "Pixel ID", description: "Eventos de conversão do TikTok Ads." },
  { key: "kwai", name: "Kwai", field: "Pixel ID", description: "Eventos de conversão do Kwai Ads." },
] as const;

export type TrackingKey = (typeof TRACKING_PLATFORMS)[number]["key"];
export const TRACKING_KEYS = TRACKING_PLATFORMS.map((p) => p.key) as TrackingKey[];

export const FLOW_LIMIT = 30;

export const FLOW_STEP_KINDS = [
  { key: "message", label: "Enviar mensagem", field: "text", placeholder: "Texto enviado ao cliente" },
  { key: "pix", label: "Gerar PIX", field: "amount", placeholder: "Valor em reais, ex.: 29,90" },
  { key: "wait_payment", label: "Aguardar pagamento", field: "timeoutMinutes", placeholder: "Minutos de espera, ex.: 30" },
  { key: "deliver", label: "Liberar conteúdo", field: "content", placeholder: "Link ou texto liberado após o pagamento" },
] as const;

export type FlowStepKind = (typeof FLOW_STEP_KINDS)[number]["key"];
export const FLOW_STEP_KEYS = FLOW_STEP_KINDS.map((k) => k.key) as FlowStepKind[];
