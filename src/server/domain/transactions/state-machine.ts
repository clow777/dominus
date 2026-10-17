/**
 * Estados internos normalizados de uma transação e as transições válidas.
 *
 * Todo adaptador de provedor mapeia seus próprios estados para estes.
 * Nenhuma camada (API, webhook, painel) altera o status de uma transação
 * sem passar por `applyStatusUpdate`.
 */

export const TRANSACTION_STATUSES = [
  "created",
  "awaiting_payment",
  "processing",
  "approved",
  "declined",
  "cancelled",
  "partially_refunded",
  "refunded",
  "disputed",
  "expired",
] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const STATUS_LABELS_PT: Record<TransactionStatus, string> = {
  created: "Criada",
  awaiting_payment: "Aguardando pagamento",
  processing: "Em processamento",
  approved: "Aprovada",
  declined: "Recusada",
  cancelled: "Cancelada",
  partially_refunded: "Reembolsada parcialmente",
  refunded: "Reembolsada",
  disputed: "Em disputa",
  expired: "Expirada",
};

const TRANSITIONS: Record<TransactionStatus, readonly TransactionStatus[]> = {
  created: ["awaiting_payment", "processing", "approved", "declined", "cancelled", "expired"],
  awaiting_payment: ["processing", "approved", "declined", "cancelled", "expired"],
  processing: ["approved", "declined", "cancelled"],
  approved: ["partially_refunded", "refunded", "disputed"],
  partially_refunded: ["partially_refunded", "refunded", "disputed"],
  disputed: ["approved", "partially_refunded", "refunded"],
  declined: [],
  cancelled: [],
  expired: [],
  refunded: [],
};

/** Ordem de progresso usada para descartar eventos atrasados do mesmo estágio. */
const STAGE: Record<TransactionStatus, number> = {
  created: 0,
  awaiting_payment: 1,
  processing: 2,
  approved: 3,
  declined: 3,
  cancelled: 3,
  expired: 3,
  partially_refunded: 4,
  disputed: 4,
  refunded: 5,
};

export function isTerminal(status: TransactionStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  override name = "InvalidTransitionError";
  constructor(
    readonly from: TransactionStatus,
    readonly to: TransactionStatus,
  ) {
    super(`Transição inválida: ${from} → ${to}`);
  }
}

export function assertTransition(from: TransactionStatus, to: TransactionStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/**
 * Decide o que fazer com uma atualização de status vinda de um provedor
 * (webhook ou consulta). Webhooks chegam duplicados e fora de ordem.
 *
 * - "apply": transição válida, aplicar e registrar evento.
 * - "ignore": duplicado ou evento atrasado já superado; registrar e não alterar.
 * - "review": combinação que não deveria acontecer (ex.: pagamento confirmado
 *   depois de expirado/cancelado). Não alterar o status; abrir item de
 *   conciliação para análise humana.
 */
export type UpdateDecision =
  | { action: "apply"; to: TransactionStatus }
  | { action: "ignore"; reason: "duplicate" | "stale" }
  | { action: "review"; reason: "unexpected_transition" };

export function decideProviderUpdate(current: TransactionStatus, incoming: TransactionStatus): UpdateDecision {
  if (current === incoming && incoming !== "partially_refunded") {
    return { action: "ignore", reason: "duplicate" };
  }
  if (canTransition(current, incoming)) return { action: "apply", to: incoming };
  if (STAGE[incoming] < STAGE[current] && !(current === "disputed" && incoming === "approved")) {
    return { action: "ignore", reason: "stale" };
  }
  return { action: "review", reason: "unexpected_transition" };
}
