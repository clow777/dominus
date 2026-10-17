import { describe, expect, it } from "vitest";

import {
  InvalidTransitionError,
  STATUS_LABELS_PT,
  TRANSACTION_STATUSES,
  assertTransition,
  canTransition,
  decideProviderUpdate,
  isTerminal,
} from "@/server/domain/transactions/state-machine";

describe("transições de transação", () => {
  it("todo status tem rótulo em pt-BR", () => {
    for (const s of TRANSACTION_STATUSES) expect(STATUS_LABELS_PT[s]).toBeTruthy();
  });

  it("percorre o caminho feliz", () => {
    expect(canTransition("created", "awaiting_payment")).toBe(true);
    expect(canTransition("awaiting_payment", "approved")).toBe(true);
    expect(canTransition("approved", "partially_refunded")).toBe(true);
    expect(canTransition("partially_refunded", "refunded")).toBe(true);
  });

  it("permite reembolsos parciais sucessivos", () => {
    expect(canTransition("partially_refunded", "partially_refunded")).toBe(true);
  });

  it("estados finais não saem do lugar", () => {
    for (const s of ["declined", "cancelled", "expired", "refunded"] as const) {
      expect(isTerminal(s)).toBe(true);
      for (const to of TRANSACTION_STATUSES) expect(canTransition(s, to)).toBe(false);
    }
  });

  it("não aprova uma cobrança expirada nem cancelada", () => {
    expect(canTransition("expired", "approved")).toBe(false);
    expect(canTransition("cancelled", "approved")).toBe(false);
  });

  it("não reembolsa o que não foi aprovado", () => {
    expect(canTransition("awaiting_payment", "refunded")).toBe(false);
    expect(canTransition("declined", "refunded")).toBe(false);
  });

  it("assertTransition lança erro tipado", () => {
    expect(() => assertTransition("refunded", "approved")).toThrow(InvalidTransitionError);
    expect(() => assertTransition("created", "awaiting_payment")).not.toThrow();
  });
});

describe("decideProviderUpdate (webhooks duplicados e fora de ordem)", () => {
  it("aplica uma transição válida", () => {
    expect(decideProviderUpdate("awaiting_payment", "approved")).toEqual({ action: "apply", to: "approved" });
  });

  it("ignora o mesmo status repetido", () => {
    expect(decideProviderUpdate("approved", "approved")).toEqual({ action: "ignore", reason: "duplicate" });
  });

  it("ignora evento atrasado de estágio anterior", () => {
    // "processing" chegou depois de "approved"
    expect(decideProviderUpdate("approved", "processing")).toEqual({ action: "ignore", reason: "stale" });
    expect(decideProviderUpdate("refunded", "approved")).toEqual({ action: "ignore", reason: "stale" });
  });

  it("manda para revisão um pagamento confirmado depois de expirar", () => {
    expect(decideProviderUpdate("expired", "approved")).toEqual({ action: "review", reason: "unexpected_transition" });
  });

  it("manda para revisão aprovação após cancelamento", () => {
    expect(decideProviderUpdate("cancelled", "approved")).toEqual({ action: "review", reason: "unexpected_transition" });
  });

  it("disputa ganha volta para aprovada", () => {
    expect(decideProviderUpdate("disputed", "approved")).toEqual({ action: "apply", to: "approved" });
  });

  it("toda combinação produz uma decisão, sem exceções", () => {
    for (const a of TRANSACTION_STATUSES) {
      for (const b of TRANSACTION_STATUSES) {
        expect(["apply", "ignore", "review"]).toContain(decideProviderUpdate(a, b).action);
      }
    }
  });
});
