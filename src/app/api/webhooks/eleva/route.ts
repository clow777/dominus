import { NextResponse } from "next/server";

import { writeGatewayLog } from "@/lib/gateways/eleva";
import { elevaProvider } from "@/server/payments/adapters/eleva";
import { ProviderError } from "@/server/payments/errors";
import { applyProviderEvent } from "@/server/payments/settle";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

/**
 * Webhook da Eleva. O corpo recebido nunca é tomado como verdade: o adaptador reconsulta o
 * status da cobrança na API com nossas credenciais antes de qualquer alteração de saldo.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });

  const log = (ok: boolean, httpStatus: number, error?: string) =>
    writeGatewayLog({ provider: "eleva", operation: "webhook", httpMethod: "POST", path: "/api/webhooks/eleva", httpStatus, ok, response: raw.slice(0, 2_000), error: error ?? null });

  try {
    const event = await elevaProvider.verifyWebhook(raw, request.headers);
    const result = await applyProviderEvent("eleva", event, "webhook");
    await log(true, result === "unknown_charge" ? 202 : 200, result);
    // 202: cobrança ainda não registrada (corrida com a criação); o polling aplica depois.
    return NextResponse.json({ ok: true, result }, { status: result === "unknown_charge" ? 202 : 200 });
  } catch (err) {
    if (err instanceof ProviderError) {
      const status = err.code === "WEBHOOK_SIGNATURE_INVALID" || err.code === "INVALID_PROVIDER_RESPONSE" ? 400 : err.code === "CHARGE_NOT_FOUND" ? 404 : err.retryable ? 503 : 500;
      await log(false, status, err.message);
      return NextResponse.json({ ok: false, error: err.code }, { status });
    }
    console.error("[webhook:eleva]", err instanceof Error ? err.message : err);
    await log(false, 500, err instanceof Error ? err.message : "erro");
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
