import "server-only";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { and, count, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";

import { BOT_LIMIT, BOT_TOKEN_RE, type BotView } from "@/lib/bots";
import { audit } from "@/server/audit";
import { decryptSecret, encryptSecret } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import { botStarts, bots, campaignDeliveries, campaigns, flows, leads, transactions } from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { publishEvent } from "@/server/events";
import { advanceRun, startFlowRun } from "@/server/flows/engine";
import { deleteWebhook, getMe, getWebhookInfo, setWebhook, TelegramError } from "@/server/telegram/api";

export type ServiceResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** O Telegram só aceita webhook em HTTPS público. */
function webhookUrl(botId: string): string | null {
  const base = serverEnv().TELEGRAM_WEBHOOK_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return null;
  const url = new URL(`/api/telegram/webhook/${botId}`, base);
  return url.protocol === "https:" ? url.toString() : null;
}

const NO_PUBLIC_URL =
  "O Telegram exige uma URL pública com HTTPS para o webhook. Defina TELEGRAM_WEBHOOK_BASE_URL (ex.: um túnel ngrok) ou publique o app.";

function telegramMessage(err: unknown): string {
  if (err instanceof TelegramError) {
    if (err.unauthorized) return "Token inválido ou revogado. Gere um novo no @BotFather.";
    return `Telegram: ${err.message}`;
  }
  return "Erro inesperado ao falar com o Telegram.";
}

async function activeBotCount(orgId: string): Promise<number> {
  const [r] = await getDb()
    .select({ n: count() })
    .from(bots)
    .where(and(eq(bots.organizationId, orgId), ne(bots.status, "disconnected")));
  return r?.n ?? 0;
}

async function linkFlow(orgId: string, botId: string, flowId: string | null): Promise<boolean> {
  const db = getDb();
  await db.update(flows).set({ botId: null }).where(and(eq(flows.organizationId, orgId), eq(flows.botId, botId)));
  if (!flowId) return true;
  const linked = await db
    .update(flows)
    .set({ botId })
    .where(and(eq(flows.id, flowId), eq(flows.organizationId, orgId)))
    .returning({ id: flows.id });
  return linked.length > 0;
}

export async function connectBot(input: { orgId: string; userId: string; token: string; flowId: string | null }): Promise<ServiceResult<{ id: string }>> {
  const token = input.token.trim();
  if (!BOT_TOKEN_RE.test(token)) return fail("Token em formato inválido. Copie-o inteiro do @BotFather.");
  if ((await activeBotCount(input.orgId)) >= BOT_LIMIT) return fail(`Limite de ${BOT_LIMIT} bots atingido.`);

  const db = getDb();
  const tokenHash = sha256(token);
  const [dup] = await db.select({ id: bots.id }).from(bots).where(eq(bots.tokenHash, tokenHash)).limit(1);
  if (dup) return fail("Este bot já está conectado.");

  let me;
  try {
    me = await getMe(token);
  } catch (err) {
    return fail(telegramMessage(err));
  }
  if (!me.is_bot || !me.username) return fail("O token não pertence a um bot.");

  const id = randomUUID();
  const url = webhookUrl(id);
  if (!url) return fail(NO_PUBLIC_URL);

  const secret = randomBytes(24).toString("base64url");
  await db.insert(bots).values({
    id,
    organizationId: input.orgId,
    telegramBotId: String(me.id),
    username: me.username,
    name: me.first_name,
    tokenEncrypted: encryptSecret(token),
    tokenHash,
    webhookSecretEncrypted: encryptSecret(secret),
    status: "offline",
  });

  try {
    await setWebhook(token, url, secret);
  } catch (err) {
    await db.delete(bots).where(eq(bots.id, id));
    return fail(telegramMessage(err));
  }

  await db.update(bots).set({ status: "online", lastCheckedAt: new Date() }).where(eq(bots.id, id));
  if (input.flowId) await linkFlow(input.orgId, id, input.flowId);
  await audit({ organizationId: input.orgId, actorUserId: input.userId, action: "bot.connected", targetType: "bot", targetId: id, metadata: { username: me.username } });
  await publishEvent({ organizationId: input.orgId, type: "bot.online", dedupeKey: `bot.online:${id}:connected`, payload: { botId: id } });
  return { ok: true, id };
}

async function loadOwnBot(orgId: string, botId: string) {
  const [bot] = await getDb()
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.organizationId, orgId), ne(bots.status, "disconnected")))
    .limit(1);
  return bot ?? null;
}

export async function updateBotToken(input: { orgId: string; userId: string; botId: string; token: string }): Promise<ServiceResult> {
  const bot = await loadOwnBot(input.orgId, input.botId);
  if (!bot) return fail("Bot não encontrado.");
  const token = input.token.trim();
  if (!BOT_TOKEN_RE.test(token)) return fail("Token em formato inválido.");
  const tokenHash = sha256(token);
  const [dup] = await getDb().select({ id: bots.id }).from(bots).where(and(eq(bots.tokenHash, tokenHash), ne(bots.id, bot.id))).limit(1);
  if (dup) return fail("Este token já está em uso por outro bot.");

  let me;
  try {
    me = await getMe(token);
  } catch (err) {
    return fail(telegramMessage(err));
  }
  if (String(me.id) !== bot.telegramBotId) return fail("Este token pertence a outro bot. Para trocar de bot, desconecte este e conecte o novo.");
  const url = webhookUrl(bot.id);
  if (!url) return fail(NO_PUBLIC_URL);

  const secret = randomBytes(24).toString("base64url");
  try {
    await setWebhook(token, url, secret);
  } catch (err) {
    return fail(telegramMessage(err));
  }
  await getDb()
    .update(bots)
    .set({ tokenEncrypted: encryptSecret(token), tokenHash, webhookSecretEncrypted: encryptSecret(secret), status: bot.status === "paused" ? "paused" : "online", lastError: null, lastCheckedAt: new Date() })
    .where(eq(bots.id, bot.id));
  await audit({ organizationId: input.orgId, actorUserId: input.userId, action: "bot.token_updated", targetType: "bot", targetId: bot.id });
  return { ok: true };
}

export async function setBotPaused(input: { orgId: string; userId: string; botId: string; paused: boolean }): Promise<ServiceResult> {
  const bot = await loadOwnBot(input.orgId, input.botId);
  if (!bot) return fail("Bot não encontrado.");
  await getDb().update(bots).set({ status: input.paused ? "paused" : "offline" }).where(eq(bots.id, bot.id));
  if (!input.paused) await checkBotHealth(bot.id);
  await audit({ organizationId: input.orgId, actorUserId: input.userId, action: input.paused ? "bot.paused" : "bot.resumed", targetType: "bot", targetId: bot.id });
  return { ok: true };
}

export async function disconnectBot(input: { orgId: string; userId: string; botId: string }): Promise<ServiceResult> {
  const bot = await loadOwnBot(input.orgId, input.botId);
  if (!bot) return fail("Bot não encontrado.");
  const db = getDb();
  if (bot.tokenEncrypted) {
    try {
      await deleteWebhook(decryptSecret(bot.tokenEncrypted));
    } catch {
      // Token já revogado: o webhook morreu junto; seguimos com a desconexão local.
    }
  }
  await db
    .update(bots)
    .set({ status: "disconnected", tokenEncrypted: null, tokenHash: null, webhookSecretEncrypted: null, lastError: null })
    .where(eq(bots.id, bot.id));
  await db.update(flows).set({ botId: null }).where(and(eq(flows.organizationId, input.orgId), eq(flows.botId, bot.id)));
  const open = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.botId, bot.id), inArray(campaigns.status, ["scheduled", "sending"])));
  if (open.length > 0) {
    const ids = open.map((c) => c.id);
    await db.delete(campaignDeliveries).where(and(inArray(campaignDeliveries.campaignId, ids), eq(campaignDeliveries.status, "pending")));
    await db.update(campaigns).set({ status: "cancelled", finishedAt: new Date() }).where(inArray(campaigns.id, ids));
  }
  await audit({ organizationId: input.orgId, actorUserId: input.userId, action: "bot.disconnected", targetType: "bot", targetId: bot.id });
  return { ok: true };
}

export async function setBotFlow(input: { orgId: string; userId: string; botId: string; flowId: string | null }): Promise<ServiceResult> {
  const bot = await loadOwnBot(input.orgId, input.botId);
  if (!bot) return fail("Bot não encontrado.");
  if (!(await linkFlow(input.orgId, bot.id, input.flowId))) return fail("Fluxo não encontrado.");
  await audit({ organizationId: input.orgId, actorUserId: input.userId, action: "bot.flow_linked", targetType: "bot", targetId: bot.id, metadata: { flowId: input.flowId } });
  return { ok: true };
}

/* ── Saúde ── */

const PENDING_LIMIT = 100;
const RECENT_ERROR_MS = 10 * 60_000;

/** Verifica token, webhook e fila do bot; publica bot.offline/bot.online só quando o estado muda. */
export async function checkBotHealth(botId: string): Promise<void> {
  const db = getDb();
  const [bot] = await db.select().from(bots).where(eq(bots.id, botId)).limit(1);
  if (!bot?.tokenEncrypted || bot.status === "paused" || bot.status === "disconnected") return;

  let problem: string | null = null;
  try {
    const token = decryptSecret(bot.tokenEncrypted);
    await getMe(token);
    const info = await getWebhookInfo(token);
    const expected = webhookUrl(bot.id);
    if (!info.url && expected && bot.webhookSecretEncrypted) {
      await setWebhook(token, expected, decryptSecret(bot.webhookSecretEncrypted));
    } else if (!info.url) {
      problem = "Webhook não registrado.";
    } else if (info.last_error_date && Date.now() - info.last_error_date * 1000 < RECENT_ERROR_MS) {
      problem = `Webhook com erro: ${info.last_error_message ?? "desconhecido"}`;
    } else if (info.pending_update_count > PENDING_LIMIT) {
      problem = `${info.pending_update_count} atualizações pendentes na fila do Telegram.`;
    }
  } catch (err) {
    problem = err instanceof TelegramError && err.unauthorized ? "Token revogado ou inválido." : err instanceof TelegramError ? err.message : "Falha ao verificar o bot.";
  }

  const next = problem ? "offline" : "online";
  await db.update(bots).set({ status: next, lastError: problem, lastCheckedAt: new Date() }).where(eq(bots.id, bot.id));
  if (next !== bot.status) {
    const type = next === "offline" ? "bot.offline" : "bot.online";
    await publishEvent({ organizationId: bot.organizationId, type, dedupeKey: `${type}:${bot.id}:${Date.now()}`, payload: { botId: bot.id, reason: problem } });
  }
}

const HEALTH_EVERY_MS = 5 * 60_000;

export async function checkDueBots(): Promise<void> {
  const rows = await getDb()
    .select({ id: bots.id, lastCheckedAt: bots.lastCheckedAt })
    .from(bots)
    .where(and(inArray(bots.status, ["online", "offline"]), isNotNull(bots.tokenEncrypted)));
  for (const b of rows) {
    if (!b.lastCheckedAt || Date.now() - b.lastCheckedAt.getTime() >= HEALTH_EVERY_MS) await checkBotHealth(b.id);
  }
}

/* ── Webhook de entrada ── */

export interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string; username?: string; language_code?: string; is_bot?: boolean };
  };
  my_chat_member?: { chat: { id: number; type: string }; new_chat_member: { status: string } };
}

/** Compara o header com o segredo do bot em tempo constante. Devolve o bot só se o segredo bater. */
export async function authenticateWebhook(botId: string, headerSecret: string | null) {
  if (!headerSecret) return null;
  const [bot] = await getDb().select().from(bots).where(eq(bots.id, botId)).limit(1);
  if (!bot?.webhookSecretEncrypted || bot.status === "disconnected") return null;
  const expected = Buffer.from(decryptSecret(bot.webhookSecretEncrypted));
  const given = Buffer.from(headerSecret);
  return given.length === expected.length && timingSafeEqual(given, expected) ? bot : null;
}

export async function handleUpdate(bot: typeof bots.$inferSelect, update: TelegramUpdate): Promise<void> {
  const db = getDb();

  const member = update.my_chat_member;
  if (member && member.chat.type === "private" && member.new_chat_member.status === "kicked") {
    await db.update(leads).set({ blocked: true }).where(and(eq(leads.botId, bot.id), eq(leads.telegramId, String(member.chat.id))));
    return;
  }

  const msg = update.message;
  if (!msg || msg.chat.type !== "private" || !msg.from || msg.from.is_bot || bot.status === "paused") return;
  const telegramId = String(msg.from.id);
  const text = msg.text ?? "";
  const isStart = /^\/start(@\w+)?(\s|$)/.test(text);

  const profile = { firstName: msg.from.first_name ?? null, username: msg.from.username ?? null, language: msg.from.language_code ?? null };
  const startPayload = isStart ? (text.split(/\s+/)[1]?.slice(0, 64) ?? null) : null;

  const [lead] = await db
    .insert(leads)
    .values({ organizationId: bot.organizationId, botId: bot.id, telegramId, ...profile, startPayload })
    .onConflictDoUpdate({
      target: [leads.botId, leads.telegramId],
      set: { ...profile, blocked: false, lastSeenAt: new Date(), ...(startPayload ? { startPayload } : {}) },
    })
    .returning({ id: leads.id });

  if (!isStart || !lead) return;
  // Reentrega do mesmo update pelo Telegram não pode contar dois starts.
  const first = await publishEvent({
    organizationId: bot.organizationId,
    type: "lead.started",
    dedupeKey: `lead.started:${bot.id}:${update.update_id}`,
    payload: { botId: bot.id, leadId: lead.id, startPayload },
  });
  if (first) {
    await db.insert(botStarts).values({ organizationId: bot.organizationId, botId: bot.id, telegramUserId: telegramId });
    // Dispara o fluxo vinculado ao bot; só o primeiro processamento do update chega aqui.
    const runId = await startFlowRun(bot.id, lead.id);
    if (runId) await advanceRun(runId);
  }
}

/* ── Leitura para a página ── */

export async function listBots(orgId: string): Promise<BotView[]> {
  const db = getDb();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await db
    .select()
    .from(bots)
    .where(and(eq(bots.organizationId, orgId), ne(bots.status, "disconnected")))
    .orderBy(bots.createdAt);
  if (rows.length === 0) return [];
  const ids = rows.map((b) => b.id);

  const [leadRows, saleRows, flowRows] = await Promise.all([
    db
      .select({ botId: leads.botId, n: count() })
      .from(leads)
      .where(and(eq(leads.organizationId, orgId), inArray(leads.botId, ids), sql`${leads.startedAt} >= ${since}`))
      .groupBy(leads.botId),
    db
      .select({ botId: transactions.botId, n: count(), v: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, orgId),
          inArray(transactions.botId, ids),
          eq(transactions.status, "approved"),
          eq(transactions.mode, "live"),
          sql`coalesce(${transactions.approvedAt}, ${transactions.createdAt}) >= ${since}`,
        ),
      )
      .groupBy(transactions.botId),
    db.select({ id: flows.id, name: flows.name, botId: flows.botId }).from(flows).where(and(eq(flows.organizationId, orgId), inArray(flows.botId, ids))),
  ]);

  return rows.map((b) => {
    const flow = flowRows.find((f) => f.botId === b.id);
    const sales = saleRows.find((s) => s.botId === b.id);
    return {
      id: b.id,
      name: b.name,
      username: b.username,
      status: b.status as BotView["status"],
      lastError: b.lastError,
      flowId: flow?.id ?? null,
      flowName: flow?.name ?? null,
      leads30d: leadRows.find((l) => l.botId === b.id)?.n ?? 0,
      sales30d: sales?.n ?? 0,
      revenue30d: Number(sales?.v ?? 0),
    };
  });
}
