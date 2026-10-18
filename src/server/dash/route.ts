import "server-only";

import { NextResponse } from "next/server";

import { parseDashPeriod, type DashPeriod } from "@/lib/dash-period";
import { getCurrentUser } from "@/server/auth/session";
import { getKycState } from "@/server/kyc/service";

/** Autentica a rota de API do painel: 401 sem sessão, 403 sem KYC aprovado. */
export async function dashRoute<T>(
  request: Request,
  handler: (ctx: { orgId: string; period: DashPeriod; params: URLSearchParams }) => Promise<T>,
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const kyc = await getKycState(user.id);
  if (kyc?.status !== "approved") return NextResponse.json({ error: "Verificação pendente." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  try {
    const data = await handler({ orgId: kyc.organizationId, period: parseDashPeriod(params.get("periodo")), params });
    return data instanceof Response ? data : NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("[dash]", err);
    return NextResponse.json({ error: "Falha ao carregar os dados." }, { status: 500 });
  }
}
