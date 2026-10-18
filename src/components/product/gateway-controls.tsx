"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Modal } from "@/components/ui/modal";
import { testElevaConnection, type TestConnectionResult } from "@/server/actions/eleva";
import { connectGateway, disconnectGateway, setGatewayActive } from "@/server/actions/product";
import { grayButton, inputClass, redButton } from "./styles";

export function TestElevaButton() {
  const [result, setResult] = useState<TestConnectionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <button type="button" className={redButton} disabled={pending} onClick={() => start(async () => setResult(await testElevaConnection()))}>
        {pending ? "Testando…" : "Testar Conexão"}
      </button>
      {result ? (
        <p role="status" className={result.ok ? "text-xs text-paper" : "text-xs text-danger-text"}>
          {result.message}
        </p>
      ) : null}
    </div>
  );
}

export function ConnectGatewayButton({ gatewayKey, name, status }: { gatewayKey: string; name: string; status: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const connected = status !== "inactive";
  const active = status === "active";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Falha na operação.");
      after?.();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={redButton} onClick={() => setOpen(true)}>
          {connected ? "Reconfigurar" : "Conectar"}
        </button>
        {connected ? (
          <>
            <button type="button" className={grayButton} disabled={pending} onClick={() => run(() => setGatewayActive(gatewayKey, !active))}>
              {active ? "Desativar" : "Ativar"}
            </button>
            <button type="button" className={grayButton} disabled={pending} onClick={() => run(() => disconnectGateway(gatewayKey))}>
              Remover
            </button>
          </>
        ) : null}
      </div>
      {error && !open ? <p role="alert" className="mt-2 text-xs text-danger-text">{error}</p> : null}
      <Modal open={open} onClose={() => setOpen(false)} title={`Conectar ${name}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => connectGateway(gatewayKey, apiKey), () => {
              setApiKey("");
              setOpen(false);
            });
          }}
          className="grid gap-4"
        >
          <label className="grid gap-1.5 text-sm">
            API Key
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={inputClass}
              placeholder="Cole a chave do gateway"
              required
            />
          </label>
          <p className="text-xs text-steel">A chave é cifrada antes de ser salva e nunca é exibida novamente.</p>
          {error ? <p role="alert" className="text-sm text-danger-text">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" className={grayButton} onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className={redButton} disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function SandboxButton({ active }: { active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={active ? grayButton : redButton}
      onClick={() =>
        start(async () => {
          await setGatewayActive("dominus_test", !active);
          router.refresh();
        })
      }
    >
      {active ? "Desativar" : "Ativar"}
    </button>
  );
}
