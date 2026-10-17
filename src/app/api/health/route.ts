import { NextResponse } from "next/server";

/** Verificação de vida para balanceadores e monitoramento. Não expõe versões nem configuração. */
export function GET() {
  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
