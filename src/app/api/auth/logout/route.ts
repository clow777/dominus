import { NextResponse } from "next/server";

import { destroySession, isSameOrigin } from "@/server/auth/session";

export const runtime = "nodejs";

export async function POST() {
  if (!(await isSameOrigin())) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  await destroySession();
  return NextResponse.json({ ok: true });
}
