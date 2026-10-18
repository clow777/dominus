import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/session";
import { getKycState } from "@/server/kyc/service";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const state = await getKycState(user.id);
  if (!state) return NextResponse.json({ error: "Conta sem organização." }, { status: 404 });

  return NextResponse.json(
    { status: state.status, canSubmit: state.canSubmit, rejectionReason: state.rejectionReason },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
