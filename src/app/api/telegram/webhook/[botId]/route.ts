import { after, NextResponse } from "next/server";

import { authenticateWebhook, handleUpdate, type TelegramUpdate } from "@/server/telegram/bots";

const UUID = /^[0-9a-f-]{36}$/i;

/** Webhook do Telegram: valida o secret_token, responde 200 de imediato e processa depois. */
export async function POST(request: Request, ctx: { params: Promise<{ botId: string }> }) {
  const { botId } = await ctx.params;
  if (!UUID.test(botId)) return NextResponse.json({ ok: false }, { status: 404 });

  const bot = await authenticateWebhook(botId, request.headers.get("x-telegram-bot-api-secret-token"));
  if (!bot) return NextResponse.json({ ok: false }, { status: 401 });

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (!update || typeof update.update_id !== "number") return NextResponse.json({ ok: false }, { status: 400 });

  after(async () => {
    try {
      await handleUpdate(bot, update);
    } catch (err) {
      console.error("[telegram]", err);
    }
  });
  return NextResponse.json({ ok: true });
}
