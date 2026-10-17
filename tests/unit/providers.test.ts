import { describe, expect, it } from "vitest";

import { cents } from "@/lib/money";
import { unconfiguredProvider } from "@/server/payments/adapters/unconfigured";
import { PROVIDER_ERROR_CODES, ProviderError } from "@/server/payments/errors";

const ctx = { idempotencyKey: "k-1", correlationId: "c-1" };

describe("adaptador sem provedor configurado", () => {
  it("não declara nenhum método disponível", async () => {
    const caps = await unconfiguredProvider.getCapabilities();
    expect(caps.methods).toEqual([]);
    expect(caps.refunds).toBe(false);
    expect(await unconfiguredProvider.getConfiguredFees("pix")).toBeNull();
  });

  it("recusa criar cobrança em vez de simular sucesso", async () => {
    await expect(
      unconfiguredProvider.createCharge(
        { reference: "pi_1", amount: cents(1000), currency: "BRL", method: "pix" },
        ctx,
      ),
    ).rejects.toMatchObject({ name: "ProviderError", code: "PROVIDER_NOT_CONFIGURED" });
  });

  it("recusa reembolsos e consultas", async () => {
    await expect(
      unconfiguredProvider.createRefund({ chargeExternalId: "x", amount: cents(1), reason: "teste" }, ctx),
    ).rejects.toBeInstanceOf(ProviderError);
    await expect(unconfiguredProvider.getCharge("x", { correlationId: "c" })).rejects.toBeInstanceOf(ProviderError);
  });

  it("rejeita todo webhook (não há segredo para verificar)", async () => {
    await expect(unconfiguredProvider.verifyWebhook("{}", new Headers())).rejects.toMatchObject({
      code: "WEBHOOK_SIGNATURE_INVALID",
    });
  });
});

describe("ProviderError", () => {
  it("marca como retentáveis apenas falhas transitórias", () => {
    expect(new ProviderError("TIMEOUT").retryable).toBe(true);
    expect(new ProviderError("RATE_LIMITED").retryable).toBe(true);
    expect(new ProviderError("INVALID_REQUEST").retryable).toBe(false);
    expect(new ProviderError("WEBHOOK_SIGNATURE_INVALID").retryable).toBe(false);
  });

  it("tem mensagem pública segura para todo código, sem o detalhe interno", () => {
    for (const code of PROVIDER_ERROR_CODES) {
      const e = new ProviderError(code, "detalhe interno com token sk_live_xyz");
      expect(e.publicMessage.length).toBeGreaterThan(10);
      expect(e.publicMessage).not.toContain("sk_live");
    }
  });
});
