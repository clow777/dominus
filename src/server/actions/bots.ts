"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApprovedForAction } from "@/server/auth/guard";
import { allow } from "@/server/rate-limit";
import {
  connectBot,
  disconnectBot,
  setBotFlow,
  setBotPaused,
  updateBotToken,
  type ServiceResult,
} from "@/server/telegram/bots";
import { cancelCampaign, createCampaign } from "@/server/telegram/campaigns";

export type BotActionResult = ServiceResult;
const fail = (error: string): BotActionResult => ({ ok: false, error });
const uuid = z.string().uuid();

function done(res: BotActionResult): BotActionResult {
  if (res.ok) revalidatePath("/robos");
  return res;
}

export async function connectBotAction(token: string, flowId: string | null): Promise<BotActionResult> {
  const { orgId, user } = await requireApprovedForAction();
  if (!allow(`bot-connect:${orgId}`, 5, 60_000)) return fail("Muitas tentativas. Aguarde um minuto.");
  const flow = flowId ? uuid.safeParse(flowId) : null;
  if (flow && !flow.success) return fail("Fluxo inválido.");
  return done(await connectBot({ orgId, userId: user.id, token, flowId }));
}

export async function updateBotTokenAction(botId: string, token: string): Promise<BotActionResult> {
  const { orgId, user } = await requireApprovedForAction();
  if (!uuid.safeParse(botId).success) return fail("Bot inválido.");
  if (!allow(`bot-token:${orgId}`, 5, 60_000)) return fail("Muitas tentativas. Aguarde um minuto.");
  return done(await updateBotToken({ orgId, userId: user.id, botId, token }));
}

export async function setBotPausedAction(botId: string, paused: boolean): Promise<BotActionResult> {
  const { orgId, user } = await requireApprovedForAction();
  if (!uuid.safeParse(botId).success) return fail("Bot inválido.");
  return done(await setBotPaused({ orgId, userId: user.id, botId, paused }));
}

export async function disconnectBotAction(botId: string): Promise<BotActionResult> {
  const { orgId, user } = await requireApprovedForAction();
  if (!uuid.safeParse(botId).success) return fail("Bot inválido.");
  return done(await disconnectBot({ orgId, userId: user.id, botId }));
}

export async function setBotFlowAction(botId: string, flowId: string | null): Promise<BotActionResult> {
  const { orgId, user } = await requireApprovedForAction();
  if (!uuid.safeParse(botId).success || (flowId && !uuid.safeParse(flowId).success)) return fail("Dados inválidos.");
  return done(await setBotFlow({ orgId, userId: user.id, botId, flowId }));
}

export async function createCampaignAction(input: unknown): Promise<BotActionResult> {
  const { orgId, user } = await requireApprovedForAction();
  if (!allow(`campaign:${orgId}`, 10, 60 * 60_000)) return fail("Limite de campanhas por hora atingido.");
  const res = await createCampaign(orgId, user.id, input);
  return res.ok ? done({ ok: true }) : res;
}

export async function cancelCampaignAction(campaignId: string): Promise<BotActionResult> {
  const { orgId, user } = await requireApprovedForAction();
  if (!uuid.safeParse(campaignId).success) return fail("Campanha inválida.");
  return done((await cancelCampaign(orgId, user.id, campaignId)) ? { ok: true } : fail("Campanha não pode ser cancelada."));
}
