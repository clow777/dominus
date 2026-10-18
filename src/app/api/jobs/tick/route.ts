import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/server/env";
import { runTick } from "@/server/jobs";

/** Agendador externo (cron) para ambientes sem processo contínuo. */
export async function POST(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  await runTick();
  return NextResponse.json({ ok: true });
}
