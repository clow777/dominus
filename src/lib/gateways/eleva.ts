import "server-only";

import { getDb } from "@/server/db/client";
import { gatewayLogs } from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import type { TransactionStatus } from "@/server/domain/transactions/state-machine";
import { ProviderError } from "@/server/payments/errors";

/**
 * Cliente da API da Eleva (PIX). Credenciais só no servidor (ELEVA_*).
 * Toda chamada é registrada em `gateway_logs`, sem cabeçalhos nem credenciais.
 */

export const ELEVA_PROVIDER_ID = "eleva";
const TIMEOUT_MS = 15_000;
const LOG_RESPONSE_MAX = 2_000;

export interface ElevaPix {
  transactionId: string;
  /** PIX copia e cola (EMV, começa com 000201). */
  pixCode: string;
  qrBase64: string | null;
}

export interface ElevaStatus {
  transactionId: string;
  rawStatus: string;
  /** Status interno; null quando a Eleva envia um estado que não conhecemos. */
  status: TransactionStatus | null;
  pixCode: string | null;
  amount: number | null;
}

export interface ElevaBalance {
  currency: string;
  available: number;
  total: number;
}

interface CallOptions {
  operation: string;
  organizationId?: string | null;
  /** Resumo do corpo enviado para o log (nunca segredos). */
  logRequest?: Record<string, unknown>;
}

function config() {
  const env = serverEnv();
  if (!env.ELEVA_CLIENT_ID || !env.ELEVA_TOKEN_SECRET) throw new ProviderError("PROVIDER_NOT_CONFIGURED", "ELEVA_CLIENT_ID/ELEVA_TOKEN_SECRET ausentes");
  return {
    clientId: env.ELEVA_CLIENT_ID,
    secret: env.ELEVA_TOKEN_SECRET,
    base: env.ELEVA_BASE_URL.replace(/\/+$/, ""),
    createPath: env.ELEVA_CREATE_PIX_PATH,
  };
}

export async function writeGatewayLog(entry: typeof gatewayLogs.$inferInsert): Promise<void> {
  try {
    await getDb().insert(gatewayLogs).values(entry);
  } catch (err) {
    console.error("[eleva] falha ao gravar gateway_logs:", err instanceof Error ? err.message : err);
  }
}

function errorForStatus(status: number, detail: string): ProviderError {
  if (status === 401 || status === 403) return new ProviderError("AUTHENTICATION_FAILED", detail);
  if (status === 404) return new ProviderError("CHARGE_NOT_FOUND", detail);
  if (status === 429) return new ProviderError("RATE_LIMITED", detail);
  if (status >= 500) return new ProviderError("PROVIDER_UNAVAILABLE", detail);
  return new ProviderError("INVALID_REQUEST", detail);
}

async function call(method: "GET" | "POST", path: string, opts: CallOptions, body?: unknown): Promise<Record<string, unknown>> {
  const cfg = config();
  const started = Date.now();
  const scrub = (text: string) => text.replaceAll(cfg.secret, "***").replaceAll(cfg.clientId, "<client-id>").slice(0, LOG_RESPONSE_MAX);
  const base = { organizationId: opts.organizationId ?? null, provider: ELEVA_PROVIDER_ID, operation: opts.operation, httpMethod: method, path, request: opts.logRequest ?? null };

  let res: Response;
  try {
    res = await fetch(`${cfg.base}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        // A Eleva aceita os três formatos juntos (validado com GET /balance e GET /transactions → 200).
        "x-client-id": cfg.clientId,
        "x-token-secret": cfg.secret,
        Authorization: `Bearer ${cfg.secret}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    const message = err instanceof Error ? err.message : "erro de rede";
    await writeGatewayLog({ ...base, ok: false, durationMs: Date.now() - started, error: scrub(message) });
    throw new ProviderError(timedOut ? "TIMEOUT" : "NETWORK_ERROR", scrub(message));
  }

  const text = await res.text();
  const durationMs = Date.now() - started;
  const logged = { ...base, httpStatus: res.status, durationMs, response: scrub(text) };

  if (!res.ok) {
    const detail = `HTTP ${res.status} ${method} ${path}${res.status === 405 ? " (método não permitido: confira o endpoint na documentação da Eleva)" : ""}`;
    await writeGatewayLog({ ...logged, ok: false, error: detail });
    throw errorForStatus(res.status, detail);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    await writeGatewayLog({ ...logged, ok: false, error: "resposta não é JSON" });
    throw new ProviderError("INVALID_PROVIDER_RESPONSE", "resposta não é JSON");
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    await writeGatewayLog({ ...logged, ok: false, error: "JSON inesperado" });
    throw new ProviderError("INVALID_PROVIDER_RESPONSE", "JSON inesperado");
  }
  const record = json as Record<string, unknown>;
  if (record.success === false) {
    const message = typeof record.message === "string" ? record.message : "success=false";
    await writeGatewayLog({ ...logged, ok: false, error: message });
    throw new ProviderError("INVALID_REQUEST", message);
  }
  await writeGatewayLog({ ...logged, ok: true });
  return record;
}

/** Percorre o JSON (até 4 níveis) e devolve o primeiro valor de texto para o qual `match` retorna true. */
function findString(node: unknown, match: (key: string, value: string) => boolean, depth = 0): string | null {
  if (!node || typeof node !== "object" || depth > 4) return null;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (typeof value === "string" && value && match(key.toLowerCase(), value)) return value;
  }
  for (const value of Object.values(node as Record<string, unknown>)) {
    const found = findString(value, match, depth + 1);
    if (found) return found;
  }
  return null;
}

function dataOf(record: Record<string, unknown>): Record<string, unknown> {
  return record.data && typeof record.data === "object" && !Array.isArray(record.data) ? (record.data as Record<string, unknown>) : record;
}

function transactionIdOf(record: Record<string, unknown>): string | null {
  const data = dataOf(record);
  for (const key of ["id", "transaction_id", "transactionId", "uuid"]) {
    const v = data[key];
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  return findString(record, (k) => k === "transaction_id" || k === "transactionid");
}

const STATUS_MAP: Record<string, TransactionStatus> = {
  paid: "approved",
  approved: "approved",
  completed: "approved",
  confirmed: "approved",
  succeeded: "approved",
  settled: "approved",
  pending: "awaiting_payment",
  waiting: "awaiting_payment",
  waiting_payment: "awaiting_payment",
  awaiting_payment: "awaiting_payment",
  created: "awaiting_payment",
  processing: "processing",
  expired: "expired",
  cancelled: "cancelled",
  canceled: "cancelled",
  voided: "cancelled",
  failed: "declined",
  refused: "declined",
  declined: "declined",
  rejected: "declined",
  refunded: "refunded",
  partially_refunded: "partially_refunded",
  chargeback: "disputed",
  disputed: "disputed",
};

export function mapElevaStatus(raw: string): TransactionStatus | null {
  return STATUS_MAP[raw.trim().toLowerCase()] ?? null;
}

function statusOf(record: Record<string, unknown>): string | null {
  const direct = dataOf(record).status ?? record.status;
  if (typeof direct === "string") return direct;
  return findString(record, (k) => k === "status");
}

/** Cria uma cobrança PIX. `amountInCents` é enviado como `amount`, conforme o contrato pedido. */
export async function createPix(amountInCents: number, externalId: string, opts: { organizationId?: string | null } = {}): Promise<ElevaPix> {
  if (!Number.isInteger(amountInCents) || amountInCents <= 0) throw new ProviderError("INVALID_REQUEST", "valor deve ser inteiro positivo em centavos");
  const body = { amount: amountInCents, payment_method: "pix", external_id: externalId };
  const record = await call("POST", config().createPath, { operation: "create_pix", organizationId: opts.organizationId, logRequest: body }, body);

  const transactionId = transactionIdOf(record);
  const pixCode = findString(record, (_k, v) => v.startsWith("000201"));
  if (!transactionId || !pixCode) {
    await writeGatewayLog({ organizationId: opts.organizationId ?? null, provider: ELEVA_PROVIDER_ID, operation: "create_pix", ok: false, error: "resposta sem id da transação ou sem PIX copia e cola" });
    throw new ProviderError("INVALID_PROVIDER_RESPONSE", "resposta sem id da transação ou sem PIX copia e cola");
  }
  const qrBase64 = findString(record, (k, v) => !v.startsWith("000201") && (/base64|qr.?code.?image|qr_image/.test(k) || v.startsWith("data:image")));
  return { transactionId, pixCode, qrBase64 };
}

export async function getStatus(transactionId: string, opts: { organizationId?: string | null } = {}): Promise<ElevaStatus> {
  const record = await call("GET", `/transactions/${encodeURIComponent(transactionId)}`, { operation: "get_status", organizationId: opts.organizationId });
  const rawStatus = statusOf(record);
  if (!rawStatus) throw new ProviderError("INVALID_PROVIDER_RESPONSE", "resposta sem status");
  const amount = dataOf(record).amount;
  return {
    transactionId: transactionIdOf(record) ?? transactionId,
    rawStatus,
    status: mapElevaStatus(rawStatus),
    pixCode: findString(record, (_k, v) => v.startsWith("000201")),
    amount: typeof amount === "number" ? amount : null,
  };
}

/** Saldo da conta na Eleva. Os valores são tratados como reais (decimal). */
export async function getBalance(opts: { organizationId?: string | null; operation?: string } = {}): Promise<ElevaBalance> {
  const record = await call("GET", "/balance", { operation: opts.operation ?? "get_balance", organizationId: opts.organizationId });
  const b = record.balance;
  if (!b || typeof b !== "object") throw new ProviderError("INVALID_PROVIDER_RESPONSE", "resposta sem saldo");
  const o = b as Record<string, unknown>;
  return {
    currency: typeof o.currency === "string" ? o.currency : "BRL",
    total: Number(o.balance ?? 0),
    available: Number(o.available_for_withdrawal ?? o.balance ?? 0),
  };
}

export interface ElevaWebhookEvent {
  transactionId: string;
  rawStatus: string;
  status: TransactionStatus | null;
  /** Chave de deduplicação: o mesmo status da mesma transação só é processado uma vez. */
  eventId: string;
}

/**
 * Extrai id e status do payload. O conteúdo NÃO é confiável: quem chama deve confirmar
 * o status com `getStatus` antes de alterar qualquer saldo.
 */
export function handleWebhook(payload: unknown): ElevaWebhookEvent {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new ProviderError("INVALID_PROVIDER_RESPONSE", "payload inválido");
  const record = payload as Record<string, unknown>;
  const transactionId = transactionIdOf(record);
  const rawStatus = statusOf(record);
  if (!transactionId || !rawStatus) throw new ProviderError("INVALID_PROVIDER_RESPONSE", "webhook sem id ou status");
  return { transactionId, rawStatus, status: mapElevaStatus(rawStatus), eventId: `${transactionId}:${rawStatus.toLowerCase()}` };
}
