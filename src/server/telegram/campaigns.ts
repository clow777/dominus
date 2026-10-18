import "server-only";

import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";

import type { CampaignAudience } from "@/lib/bots";
import { audit } from "@/server/audit";
import { decryptSecret } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import { bots, campaignDeliveries, campaigns, leads } from "@/server/db/schema";
import { publishEvent } from "@/server/events";
import { sendMessage, sendPhoto, TelegramError } from "@/server/telegram/api";

const httpsUrl = z.string().trim().url().refine((u) => u.startsWith("https://"), "Use um link https://.");

export const campaignSchema = z.object({
  botId: z.string().uuid(),
  name: z.string().trim().min(2, "Dê um nome à campanha.").max(120),
  audience: z.enum(["all", "not_paid", "paid", "tag"]),
  audienceTag: z.string().trim().max(48).optional(),
  text: z.string().trim().min(1, "Escreva a mensagem.").max(4096, "A mensagem passa de 4096 caracteres."),
  mediaUrl: httpsUrl.max(2048).optional(),
  buttons: z.array(z.object({ text: z.string().trim().min(1).max(64), url: httpsUrl.max(2048) })).max(4),
  /** Nulo = enviar agora. */
  scheduledAt: z.coerce.date().nullable(),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

export async function createCampaign(orgId: string, userId: string, raw: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const c = parsed.data;
  if (c.audience === "tag" && !c.audienceTag) return { ok: false, error: "Informe a tag do público." };
  if (c.mediaUrl && c.text.length > 1024) return { ok: false, error: "Com mídia, a mensagem (legenda) vai até 1024 caracteres." };

  const db = getDb();
  const [bot] = await db
    .select({ id: bots.id, status: bots.status })
    .from(bots)
    .where(and(eq(bots.id, c.botId), eq(bots.organizationId, orgId)))
    .limit(1);
  if (!bot || bot.status === "disconnected") return { ok: false, error: "Bot não encontrado." };
  if (c.scheduledAt && c.scheduledAt.getTime() < Date.now() - 60_000) return { ok: false, error: "A data de envio está no passado." };

  const [row] = await db
    .insert(campaigns)
    .values({
      organizationId: orgId,
      botId: c.botId,
      name: c.name,
      audience: c.audience,
      audienceTag: c.audience === "tag" ? c.audienceTag : null,
      text: c.text,
      mediaUrl: c.mediaUrl ?? null,
      buttons: c.buttons,
      scheduledAt: c.scheduledAt ?? new Date(),
    })
    .returning({ id: campaigns.id });
  await audit({ organizationId: orgId, actorUserId: userId, action: "campaign.created", targetType: "campaign", targetId: row!.id });
  return { ok: true, id: row!.id };
}

function audienceFilter(c: typeof campaigns.$inferSelect) {
  const base = [eq(leads.botId, c.botId), eq(leads.organizationId, c.organizationId), eq(leads.blocked, false)];
  const audience = c.audience as CampaignAudience;
  if (audience === "not_paid") base.push(eq(leads.hasPaid, false));
  if (audience === "paid") base.push(eq(leads.hasPaid, true));
  if (audience === "tag") base.push(sql`${leads.tags} @> ${JSON.stringify([c.audienceTag ?? ""])}::jsonb`);
  return and(...base);
}

/** Campanhas vencidas: materializa os destinatários e passa para "sending". */
async function startDueCampaigns() {
  const db = getDb();
  const due = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.status, "scheduled"), lte(campaigns.scheduledAt, new Date())));
  for (const c of due) {
    const claimed = await db.update(campaigns).set({ status: "sending" }).where(and(eq(campaigns.id, c.id), eq(campaigns.status, "scheduled"))).returning({ id: campaigns.id });
    if (claimed.length === 0) continue;
    const audience = await db.select({ id: leads.id }).from(leads).where(audienceFilter(c));
    for (let i = 0; i < audience.length; i += 500) {
      await db
        .insert(campaignDeliveries)
        .values(audience.slice(i, i + 500).map((l) => ({ campaignId: c.id, leadId: l.id })))
        .onConflictDoNothing();
    }
    await db.update(campaigns).set({ total: audience.length }).where(eq(campaigns.id, c.id));
  }
}

const BATCH = 25;
const SPACING_MS = 40;
const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendDueDeliveries() {
  const db = getDb();
  const sending = await db.select().from(campaigns).where(eq(campaigns.status, "sending"));
  for (const c of sending) {
    const [bot] = await db.select().from(bots).where(eq(bots.id, c.botId)).limit(1);
    if (!bot?.tokenEncrypted || bot.status === "disconnected") continue;
    if (bot.status !== "paused") {
      const token = decryptSecret(bot.tokenEncrypted);
      const batch = await db
        .select({ id: campaignDeliveries.id, attempts: campaignDeliveries.attempts, leadId: campaignDeliveries.leadId, telegramId: leads.telegramId })
        .from(campaignDeliveries)
        .innerJoin(leads, eq(leads.id, campaignDeliveries.leadId))
        .where(and(eq(campaignDeliveries.campaignId, c.id), eq(campaignDeliveries.status, "pending"), lte(campaignDeliveries.nextAttemptAt, new Date())))
        .limit(BATCH);

      for (const d of batch) {
        try {
          if (c.mediaUrl) await sendPhoto(token, d.telegramId, c.mediaUrl, c.text, c.buttons);
          else await sendMessage(token, d.telegramId, c.text, c.buttons);
          await db.update(campaignDeliveries).set({ status: "sent", attempts: d.attempts + 1, error: null }).where(eq(campaignDeliveries.id, d.id));
        } catch (err) {
          if (err instanceof TelegramError && err.code === 429) {
            // Limite do Telegram: respeita retry_after e adia toda a campanha.
            const at = new Date(Date.now() + (err.retryAfter ?? 5) * 1000);
            await db.update(campaignDeliveries).set({ nextAttemptAt: at }).where(and(eq(campaignDeliveries.campaignId, c.id), eq(campaignDeliveries.status, "pending")));
            break;
          }
          if (err instanceof TelegramError && err.blocked) {
            await db.update(campaignDeliveries).set({ status: "blocked", attempts: d.attempts + 1, error: err.message }).where(eq(campaignDeliveries.id, d.id));
            await db.update(leads).set({ blocked: true }).where(eq(leads.id, d.leadId));
          } else {
            const attempts = d.attempts + 1;
            await db
              .update(campaignDeliveries)
              .set({
                attempts,
                status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
                nextAttemptAt: new Date(Date.now() + 60_000 * attempts),
                error: err instanceof Error ? err.message.slice(0, 300) : "erro",
              })
              .where(eq(campaignDeliveries.id, d.id));
          }
        }
        await sleep(SPACING_MS);
      }
    }
    await refreshCampaign(c);
  }
}

/** Recalcula contadores e encerra a campanha quando não há mais pendentes. */
async function refreshCampaign(c: typeof campaigns.$inferSelect) {
  const db = getDb();
  const rows = await db
    .select({ status: campaignDeliveries.status, n: sql<string>`count(*)` })
    .from(campaignDeliveries)
    .where(eq(campaignDeliveries.campaignId, c.id))
    .groupBy(campaignDeliveries.status);
  const n = (s: string) => Number(rows.find((r) => r.status === s)?.n ?? 0);
  const pending = n("pending");
  const finished = pending === 0;
  await db
    .update(campaigns)
    .set({ sent: n("sent"), failed: n("failed"), blocked: n("blocked"), ...(finished ? { status: "done", finishedAt: new Date() } : {}) })
    .where(eq(campaigns.id, c.id));
  if (finished) {
    await publishEvent({
      organizationId: c.organizationId,
      type: "campaign.sent",
      dedupeKey: `campaign.sent:${c.id}`,
      payload: { campaignId: c.id, sent: n("sent"), failed: n("failed"), blocked: n("blocked") },
    });
  }
}

export async function runCampaignTick(): Promise<void> {
  await startDueCampaigns();
  await sendDueDeliveries();
}

export async function cancelCampaign(orgId: string, userId: string, campaignId: string): Promise<boolean> {
  const db = getDb();
  const [c] = await db
    .update(campaigns)
    .set({ status: "cancelled", finishedAt: new Date() })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.organizationId, orgId), inArray(campaigns.status, ["scheduled", "sending"])))
    .returning({ id: campaigns.id });
  if (!c) return false;
  await db.delete(campaignDeliveries).where(and(eq(campaignDeliveries.campaignId, campaignId), eq(campaignDeliveries.status, "pending")));
  await audit({ organizationId: orgId, actorUserId: userId, action: "campaign.cancelled", targetType: "campaign", targetId: campaignId });
  return true;
}

export async function listRecentCampaigns(orgId: string) {
  return getDb()
    .select({
      id: campaigns.id,
      botId: campaigns.botId,
      name: campaigns.name,
      status: campaigns.status,
      total: campaigns.total,
      sent: campaigns.sent,
      failed: campaigns.failed,
      blocked: campaigns.blocked,
      scheduledAt: campaigns.scheduledAt,
    })
    .from(campaigns)
    .where(eq(campaigns.organizationId, orgId))
    .orderBy(sql`${campaigns.createdAt} desc`)
    .limit(15);
}
