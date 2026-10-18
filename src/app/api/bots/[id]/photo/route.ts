import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/session";
import { decryptSecret } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import { bots } from "@/server/db/schema";
import { getKycState } from "@/server/kyc/service";
import { getProfilePhotoPath, telegramFileUrl } from "@/server/telegram/api";

/** Foto do bot servida pelo servidor: a URL do Telegram contém o token e nunca vai ao navegador. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const kyc = await getKycState(user.id);
  if (kyc?.status !== "approved" || !/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });

  const [bot] = await getDb()
    .select({ token: bots.tokenEncrypted, telegramBotId: bots.telegramBotId })
    .from(bots)
    .where(and(eq(bots.id, id), eq(bots.organizationId, kyc.organizationId), ne(bots.status, "disconnected")))
    .limit(1);
  if (!bot?.token) return new NextResponse(null, { status: 404 });

  try {
    const token = decryptSecret(bot.token);
    const path = await getProfilePhotoPath(token, bot.telegramBotId);
    if (!path) return new NextResponse(null, { status: 404 });
    const file = await fetch(telegramFileUrl(token, path), { signal: AbortSignal.timeout(10_000) });
    if (!file.ok) return new NextResponse(null, { status: 404 });
    return new NextResponse(file.body, {
      headers: { "Content-Type": file.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
