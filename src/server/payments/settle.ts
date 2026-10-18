import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import { and, desc, eq, gte, inArray } from "drizzle-orm";

import { getStatus } from "@/lib/gateways/eleva";
import { getDb } from "@/server/db/client";
import { ledgerAccounts, ledgerEntries, leads, paymentCustomers, paymentIntents, providerEvents, transactionEvents, transactions } from "@/server/db/schema";
import { decideProviderUpdate, type TransactionStatus } from "@/server/domain/transactions/state-machine";
import { publishEvent } from "@/server/events";
import { resumeRunsForTransaction } from "@/server/flows/engine";
import type { VerifiedProviderEvent } from "./provider";

/**
 * Aplica no banco uma atualização de status já confirmada junto ao provedor.
 * Idempotente: o mesmo evento nunca lança duas vezes (provider_events + source_key do ledger).
 */

export type SettleResult = "applied" | "duplicate" | "ignored" | "unknown_charge" | "review";

/** Estados que a integração PIX aplica sozinha. Estornos e disputas exigem revisão humana (o ledger não é revertido automaticamente). */
const AUTO_APPLY: ReadonlySet<TransactionStatus> = new Set(["awaiting_payment", "processing", "approved", "declined", "cancelled", "expired"]);

const publicId = (prefix: string) => `${prefix}_${randomBytes(12).toString("hex")}`;

export async function applyProviderEvent(provider: string, event: VerifiedProviderEvent, source: "webhook" | "poll"): Promise<SettleResult> {
  const db = getDb();

  await db
    .insert(providerEvents)
    .values({ provider, externalEventId: event.eventId, type: event.type, payload: event.raw as object, signatureValid: true })
    .onConflictDoNothing();
  const [pe] = await db
    .select({ id: providerEvents.id, processedAt: providerEvents.processedAt })
    .from(providerEvents)
    .where(and(eq(providerEvents.provider, provider), eq(providerEvents.externalEventId, event.eventId)))
    .limit(1);
  if (!pe) throw new Error("Falha ao registrar o evento do provedor.");
  if (pe.processedAt) return "duplicate";

  const finish = async (result: SettleResult, error?: string) => {
    if (result === "unknown_charge") return result; // pode ser corrida com a criação da transação: reprocessa depois
    await db.update(providerEvents).set({ processedAt: new Date(), processingError: error ?? null, attempts: 1 }).where(eq(providerEvents.id, pe.id));
    return result;
  };

  if (!event.chargeExternalId || !event.status) return finish("ignored", "evento sem cobrança ou status reconhecido");

  const [txn] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.provider, provider), eq(transactions.externalId, event.chargeExternalId)))
    .limit(1);
  if (!txn) return finish("unknown_charge");

  const decision = decideProviderUpdate(txn.status, event.status);
  if (decision.action === "ignore") return finish("ignored", decision.reason);
  if (decision.action === "review" || !AUTO_APPLY.has(decision.to)) return finish("review", `transição ${txn.status} → ${event.status} requer revisão manual`);

  const to = decision.to;
  const applied = await db.transaction(async (tx) => {
    const now = new Date();
    const [updated] = await tx
      .update(transactions)
      .set({
        status: to,
        updatedAt: now,
        ...(to === "approved" ? { approvedAt: now, feeAmount: 0, netAmount: txn.amount } : {}),
      })
      .where(and(eq(transactions.id, txn.id), eq(transactions.status, txn.status)))
      .returning({ id: transactions.id });
    if (!updated) return false; // outro processo já aplicou

    await tx.insert(transactionEvents).values({
      organizationId: txn.organizationId,
      transactionId: txn.id,
      fromStatus: txn.status,
      toStatus: to,
      source,
      providerEventId: pe.id,
      note: `Eleva: ${event.rawStatus ?? to}`,
    });

    if (to === "approved") {
      await postLedger(tx, txn);
      await linkCustomer(tx, txn);
    }
    return true;
  });
  if (!applied) return finish("ignored", "já aplicado por outro processo");

  if (to === "approved") {
    await publishEvent({
      organizationId: txn.organizationId,
      type: "pix.paid",
      dedupeKey: `pix.paid:${txn.id}`,
      payload: { transactionId: txn.id, botId: txn.botId, amount: txn.amount },
    });
    // Entrega imediata do fluxo; se falhar, o tick do motor retoma (settleWaitingRuns).
    await resumeRunsForTransaction(txn.id).catch((err) => console.error("[settle] entrega do fluxo:", err instanceof Error ? err.message : err));
  }
  return finish("applied");
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/** Partidas dobradas: débito em recebível do provedor, crédito no saldo do lojista. */
async function postLedger(tx: Tx, txn: typeof transactions.$inferSelect) {
  const codes = ["receivable_provider", "merchant_payable"] as const;
  await tx
    .insert(ledgerAccounts)
    .values(codes.map((code) => ({ organizationId: txn.organizationId, code, currency: txn.currency })))
    .onConflictDoNothing();
  const accounts = await tx
    .select({ id: ledgerAccounts.id, code: ledgerAccounts.code })
    .from(ledgerAccounts)
    .where(and(eq(ledgerAccounts.organizationId, txn.organizationId), inArray(ledgerAccounts.code, [...codes]), eq(ledgerAccounts.currency, txn.currency)));
  const receivable = accounts.find((a) => a.code === "receivable_provider");
  const payable = accounts.find((a) => a.code === "merchant_payable");
  if (!receivable || !payable) throw new Error("Contas do ledger não encontradas.");

  const journalId = randomUUID();
  const sourceKey = `txn:${txn.id}:approved`;
  await tx.insert(ledgerEntries).values([
    { organizationId: txn.organizationId, journalId, accountId: receivable.id, direction: "debit", amount: txn.amount, currency: txn.currency, sourceKey, description: "PIX aprovado (Eleva)" },
    { organizationId: txn.organizationId, journalId, accountId: payable.id, direction: "credit", amount: txn.amount, currency: txn.currency, sourceKey, description: "PIX aprovado (Eleva)" },
  ]);
}

/**
 * Cria (ou reaproveita) o cliente da venda feita pelo bot e marca o lead como pagante.
 * Total gasto, nº de compras, última compra e segmento (novo/recorrente/VIP) são derivados
 * das transações aprovadas, então ficam sempre consistentes com o ledger.
 */
async function linkCustomer(tx: Tx, txn: typeof transactions.$inferSelect) {
  const [intent] = await tx.select({ id: paymentIntents.id, metadata: paymentIntents.metadata, customerId: paymentIntents.customerId }).from(paymentIntents).where(eq(paymentIntents.id, txn.paymentIntentId)).limit(1);
  if (!intent) return;
  await tx.update(paymentIntents).set({ status: "succeeded", updatedAt: new Date() }).where(eq(paymentIntents.id, intent.id));

  const leadId = intent.metadata.leadId;
  if (!leadId || intent.customerId) return;
  const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return;

  const reference = `tg:${lead.id}`;
  const [existing] = await tx
    .select({ id: paymentCustomers.id })
    .from(paymentCustomers)
    .where(and(eq(paymentCustomers.organizationId, txn.organizationId), eq(paymentCustomers.externalReference, reference)))
    .limit(1);
  let customerId = existing?.id;
  if (!customerId) {
    const [created] = await tx
      .insert(paymentCustomers)
      .values({
        organizationId: txn.organizationId,
        publicId: publicId("cus"),
        name: (lead.firstName ?? (lead.username ? `@${lead.username}` : `Telegram ${lead.telegramId}`)).slice(0, 200),
        externalReference: reference,
      })
      .returning({ id: paymentCustomers.id });
    customerId = created?.id;
  }
  if (customerId) await tx.update(paymentIntents).set({ customerId }).where(eq(paymentIntents.id, intent.id));
  await tx.update(leads).set({ hasPaid: true }).where(eq(leads.id, lead.id));
}

const POLL_BATCH = 5;
const POLL_WINDOW_MS = 3 * 60 * 60_000;
const POLL_EVERY_MS = 20_000;
let lastPoll = 0;

/**
 * Rede de segurança do webhook (que precisa de URL pública): consulta na Eleva as cobranças
 * ainda pendentes e aplica o resultado. Também cobre webhooks perdidos.
 * Espaçado para não pressionar a API da Eleva (que bloqueia tráfego em excesso).
 */
export async function pollPendingElevaCharges(): Promise<number> {
  if (!process.env.ELEVA_TOKEN_SECRET || Date.now() - lastPoll < POLL_EVERY_MS) return 0;
  lastPoll = Date.now();
  const pending = await getDb()
    .select({ externalId: transactions.externalId, organizationId: transactions.organizationId })
    .from(transactions)
    .where(
      and(
        eq(transactions.provider, "eleva"),
        inArray(transactions.status, ["created", "awaiting_payment", "processing"]),
        gte(transactions.createdAt, new Date(Date.now() - POLL_WINDOW_MS)),
      ),
    )
    .orderBy(desc(transactions.createdAt))
    .limit(POLL_BATCH);

  let applied = 0;
  for (const p of pending) {
    if (!p.externalId) continue;
    try {
      const s = await getStatus(p.externalId, { organizationId: p.organizationId });
      const result = await applyProviderEvent(
        "eleva",
        {
          eventId: `${s.transactionId}:${s.rawStatus.toLowerCase()}`,
          type: "charge.updated",
          occurredAt: new Date(),
          chargeExternalId: s.transactionId,
          status: s.status ?? undefined,
          rawStatus: s.rawStatus,
          raw: { source: "poll", id: s.transactionId, status: s.rawStatus },
        },
        "poll",
      );
      if (result === "applied") applied++;
    } catch (err) {
      console.error("[eleva] poll:", p.externalId, err instanceof Error ? err.message : err);
    }
  }
  return applied;
}
