import "server-only";

import { randomBytes } from "node:crypto";

import { and, asc, eq, inArray, lte } from "drizzle-orm";

import { DEFAULT_WAIT_MINUTES, isHttpUrl, MAX_RUN_ATTEMPTS, parseWaitMinutes, renderText, retryDelayMs } from "@/lib/flow-steps";
import { MoneyError, parseAmount, positiveCents } from "@/lib/money";
import { decryptSecret } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import { bots, flowRuns, flows, flowSteps, leads, paymentIntents, transactionEvents, transactions } from "@/server/db/schema";
import { publishEvent } from "@/server/events";
import { ProviderError } from "@/server/payments/errors";
import { getPaymentProvider } from "@/server/payments/registry";
import { sendMessage, TelegramError } from "@/server/telegram/api";

type Run = typeof flowRuns.$inferSelect;
type Outcome = "continue" | "wait" | "done";

/** Falha sem conserto por nova tentativa (config inválida, provedor ausente). `leadMessage` é avisado ao cliente. */
class FatalStepError extends Error {
  constructor(
    message: string,
    readonly leadMessage?: string,
  ) {
    super(message);
  }
}

const UNAVAILABLE_TO_LEAD = "Não foi possível gerar o pagamento agora. Tente novamente mais tarde.";
const CLAIM_MS = 2 * 60_000;
const BATCH = 20;
const publicId = (prefix: string) => `${prefix}_${randomBytes(12).toString("hex")}`;

/** Cria a execução do fluxo vinculado ao bot para este lead. Devolve o id, ou null se não há o que executar. */
export async function startFlowRun(botId: string, leadId: string): Promise<string | null> {
  const db = getDb();
  const [bot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
  if (!bot || bot.status === "paused" || bot.status === "disconnected" || !bot.tokenEncrypted) return null;
  const [lead] = await db.select({ blocked: leads.blocked }).from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead || lead.blocked) return null;

  const [flow] = await db
    .select({ id: flows.id })
    .from(flows)
    .where(and(eq(flows.botId, botId), eq(flows.organizationId, bot.organizationId)))
    .orderBy(asc(flows.createdAt))
    .limit(1);
  if (!flow) return null;
  const [step] = await db.select({ id: flowSteps.id }).from(flowSteps).where(eq(flowSteps.flowId, flow.id)).limit(1);
  if (!step) return null;

  const [run] = await db
    .insert(flowRuns)
    .values({ organizationId: bot.organizationId, flowId: flow.id, botId, leadId })
    .onConflictDoNothing()
    .returning({ id: flowRuns.id });
  return run?.id ?? null;
}

async function ensureCharge(run: Run, amountText: string) {
  const db = getDb();
  const provider = getPaymentProvider();

  // Reexecução depois de falha ao enviar a mensagem: reaproveita a cobrança já criada.
  if (run.transactionId) {
    const [t] = await db.select({ externalId: transactions.externalId }).from(transactions).where(eq(transactions.id, run.transactionId)).limit(1);
    if (t?.externalId) return provider.getCharge(t.externalId, { correlationId: run.id });
  }

  let amount;
  try {
    amount = positiveCents(parseAmount(amountText));
  } catch (err) {
    throw new FatalStepError(err instanceof MoneyError ? err.message : "Valor do PIX inválido.", UNAVAILABLE_TO_LEAD);
  }

  const caps = await provider.getCapabilities();
  if (!caps.methods.includes("pix")) throw new ProviderError("PROVIDER_NOT_CONFIGURED");

  const [intent] = await db
    .insert(paymentIntents)
    .values({
      organizationId: run.organizationId,
      publicId: publicId("pi"),
      mode: "live",
      amount,
      method: "pix",
      description: "Venda via Telegram",
      expiresAt: new Date(Date.now() + DEFAULT_WAIT_MINUTES * 60_000),
      metadata: { botId: run.botId, leadId: run.leadId, flowRunId: run.id },
    })
    .returning({ id: paymentIntents.id, expiresAt: paymentIntents.expiresAt });
  if (!intent) throw new Error("Falha ao registrar a intenção de pagamento.");

  const charge = await provider.createCharge(
    { reference: intent.id, amount, currency: "BRL", method: "pix", description: "Venda via Telegram", expiresAt: intent.expiresAt ?? undefined },
    { idempotencyKey: `flowrun:${run.id}:${run.currentStep}`, correlationId: run.id },
  );

  const transactionId = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(transactions)
      .values({
        organizationId: run.organizationId,
        publicId: publicId("txn"),
        paymentIntentId: intent.id,
        provider: provider.id,
        externalId: charge.externalId,
        mode: "live",
        method: "pix",
        status: charge.status,
        amount: charge.amount,
        botId: run.botId,
      })
      .returning({ id: transactions.id });
    if (!t) throw new Error("Falha ao registrar a transação.");
    await tx.insert(transactionEvents).values({
      organizationId: run.organizationId,
      transactionId: t.id,
      toStatus: charge.status,
      source: "api",
      note: "Gerada pelo fluxo do bot",
    });
    await tx.update(flowRuns).set({ transactionId: t.id }).where(eq(flowRuns.id, run.id));
    return t.id;
  });

  await publishEvent({
    organizationId: run.organizationId,
    type: "pix.generated",
    dedupeKey: `pix.generated:${transactionId}`,
    payload: { transactionId, botId: run.botId, leadId: run.leadId, amount },
  });
  return charge;
}

async function executeStep(
  run: Run,
  step: typeof flowSteps.$inferSelect,
  ctx: { token: string; chatId: string; firstName: string | null },
): Promise<Outcome> {
  const db = getDb();
  const config = step.config;

  switch (step.kind) {
    case "message": {
      const text = renderText(config.text ?? "", { nome: ctx.firstName });
      if (text) await sendMessage(ctx.token, ctx.chatId, text);
      return "continue";
    }
    case "pix": {
      const charge = await ensureCharge(run, config.amount ?? "");
      const payload = charge.pix?.payload;
      if (!payload) throw new FatalStepError("O provedor não devolveu o código PIX.", UNAVAILABLE_TO_LEAD);
      await sendMessage(ctx.token, ctx.chatId, `Pague com PIX copia e cola:\n\n${payload}`);
      return "continue";
    }
    case "wait_payment": {
      if (!run.transactionId) throw new FatalStepError('O passo "Aguardar pagamento" precisa vir depois de "Gerar PIX".');
      const [t] = await db.select({ status: transactions.status }).from(transactions).where(eq(transactions.id, run.transactionId)).limit(1);
      if (t?.status === "approved") return "continue";
      const until = new Date(Date.now() + parseWaitMinutes(config.timeoutMinutes) * 60_000);
      await db
        .update(flowRuns)
        .set({ status: "waiting_payment", waitUntil: until, currentStep: run.currentStep + 1, attempts: 0, updatedAt: new Date() })
        .where(eq(flowRuns.id, run.id));
      return "wait";
    }
    case "deliver": {
      const content = (config.content ?? "").trim();
      if (!content) return "done";
      if (isHttpUrl(content)) await sendMessage(ctx.token, ctx.chatId, "Pagamento confirmado! Acesse seu conteúdo:", [{ text: "Acessar conteúdo", url: content }]);
      else await sendMessage(ctx.token, ctx.chatId, content);
      return "done";
    }
    default:
      throw new FatalStepError(`Tipo de passo desconhecido: ${step.kind}`);
  }
}

async function finish(runId: string, status: "completed" | "failed" | "cancelled", error?: string) {
  await getDb()
    .update(flowRuns)
    .set({ status, lastError: error?.slice(0, 500) ?? null, finishedAt: new Date(), updatedAt: new Date() })
    .where(eq(flowRuns.id, runId));
}

/** Executa os passos de uma execução até ela terminar, pausar (aguardando pagamento) ou falhar. */
export async function advanceRun(runId: string): Promise<void> {
  const db = getDb();
  const now = new Date();
  const [claimed] = await db
    .update(flowRuns)
    .set({ nextRunAt: new Date(now.getTime() + CLAIM_MS) })
    .where(and(eq(flowRuns.id, runId), eq(flowRuns.status, "running"), lte(flowRuns.nextRunAt, now)))
    .returning();
  if (!claimed) return;
  let run: Run = claimed;

  const [bot] = await db.select().from(bots).where(eq(bots.id, run.botId)).limit(1);
  const [lead] = await db.select().from(leads).where(eq(leads.id, run.leadId)).limit(1);
  if (!bot?.tokenEncrypted || bot.status === "disconnected" || !lead || lead.blocked) return finish(run.id, "cancelled", "Bot desconectado ou lead bloqueado.");
  if (bot.status === "paused") {
    await db.update(flowRuns).set({ nextRunAt: new Date(Date.now() + 60_000) }).where(eq(flowRuns.id, run.id));
    return;
  }

  const token = decryptSecret(bot.tokenEncrypted);
  const steps = await db.select().from(flowSteps).where(eq(flowSteps.flowId, run.flowId)).orderBy(asc(flowSteps.position));
  const ctx = { token, chatId: lead.telegramId, firstName: lead.firstName };

  try {
    for (;;) {
      const step = steps[run.currentStep];
      if (!step) return finish(run.id, "completed");

      const outcome = await executeStep(run, step, ctx);
      if (outcome === "wait") return;
      if (outcome === "done") return finish(run.id, "completed");

      // Relê a execução: o passo PIX grava o transactionId que os próximos passos usam.
      const [next] = await db
        .update(flowRuns)
        .set({ currentStep: run.currentStep + 1, attempts: 0, lastError: null, updatedAt: new Date() })
        .where(eq(flowRuns.id, run.id))
        .returning();
      if (!next) return;
      run = next;
    }
  } catch (err) {
    if (err instanceof TelegramError && err.blocked) {
      await db.update(leads).set({ blocked: true }).where(eq(leads.id, lead.id));
      return finish(run.id, "cancelled", "O lead bloqueou o bot.");
    }
    if (err instanceof TelegramError && err.code === 429) {
      await db.update(flowRuns).set({ nextRunAt: new Date(Date.now() + (err.retryAfter ?? 5) * 1000) }).where(eq(flowRuns.id, run.id));
      return;
    }

    const fatal = err instanceof FatalStepError || (err instanceof ProviderError && !err.retryable);
    const message = err instanceof ProviderError ? err.publicMessage : err instanceof Error ? err.message : "erro";
    const attempts = run.attempts + 1;
    if (fatal || attempts >= MAX_RUN_ATTEMPTS) {
      const leadMessage = err instanceof FatalStepError ? err.leadMessage : err instanceof ProviderError ? UNAVAILABLE_TO_LEAD : undefined;
      if (leadMessage) await sendMessage(token, lead.telegramId, leadMessage).catch(() => null);
      if (steps[run.currentStep]?.kind === "pix") {
        await publishEvent({
          organizationId: run.organizationId,
          type: "pix.failed",
          dedupeKey: `pix.failed:${run.id}`,
          payload: { botId: run.botId, leadId: run.leadId, flowRunId: run.id, reason: message },
        });
      }
      console.error("[flows]", run.id, message);
      return finish(run.id, "failed", message);
    }
    await db
      .update(flowRuns)
      .set({ attempts, lastError: message.slice(0, 500), nextRunAt: new Date(Date.now() + retryDelayMs(attempts)) })
      .where(eq(flowRuns.id, run.id));
  }
}

/** Retoma execuções cuja transação foi aprovada e encerra as que estouraram o prazo de pagamento. */
async function settleWaitingRuns(): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db
    .update(flowRuns)
    .set({ status: "running", waitUntil: null, nextRunAt: now, updatedAt: now })
    .where(
      and(
        eq(flowRuns.status, "waiting_payment"),
        inArray(flowRuns.transactionId, db.select({ id: transactions.id }).from(transactions).where(eq(transactions.status, "approved"))),
      ),
    );

  const expired = await db
    .update(flowRuns)
    .set({ status: "expired", finishedAt: now, updatedAt: now })
    .where(and(eq(flowRuns.status, "waiting_payment"), lte(flowRuns.waitUntil, now)))
    .returning();

  for (const run of expired) {
    const [row] = await db
      .select({ token: bots.tokenEncrypted, telegramId: leads.telegramId })
      .from(bots)
      .innerJoin(leads, eq(leads.id, run.leadId))
      .where(eq(bots.id, run.botId))
      .limit(1);
    if (row?.token) await sendMessage(decryptSecret(row.token), row.telegramId, "O tempo para pagar acabou. Envie /start para gerar um novo PIX.").catch(() => null);
    await publishEvent({
      organizationId: run.organizationId,
      type: "pix.expired",
      dedupeKey: `pix.expired:${run.id}`,
      payload: { botId: run.botId, leadId: run.leadId, transactionId: run.transactionId },
    });
  }
}

/** Libera na hora a execução que aguardava este pagamento (entrega do conteúdo no Telegram). */
export async function resumeRunsForTransaction(transactionId: string): Promise<number> {
  const now = new Date();
  const resumed = await getDb()
    .update(flowRuns)
    .set({ status: "running", waitUntil: null, nextRunAt: now, updatedAt: now })
    .where(and(eq(flowRuns.transactionId, transactionId), eq(flowRuns.status, "waiting_payment")))
    .returning({ id: flowRuns.id });
  for (const run of resumed) await advanceRun(run.id);
  return resumed.length;
}

export async function runFlowTick(): Promise<void> {
  await settleWaitingRuns();
  const due = await getDb()
    .select({ id: flowRuns.id })
    .from(flowRuns)
    .where(and(eq(flowRuns.status, "running"), lte(flowRuns.nextRunAt, new Date())))
    .orderBy(asc(flowRuns.nextRunAt))
    .limit(BATCH);
  for (const r of due) {
    try {
      await advanceRun(r.id);
    } catch (err) {
      console.error("[flows]", r.id, err);
    }
  }
}
