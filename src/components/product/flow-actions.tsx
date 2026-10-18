"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Modal } from "@/components/ui/modal";
import { createFlow, deleteFlow, importFlow } from "@/server/actions/product";
import { grayButton, inputClass, redButton } from "./styles";

export function FlowActions({ count, limit }: { count: number; limit: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "import" | null>(null);
  const [name, setName] = useState("");
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const full = count >= limit;

  function close() {
    setMode(null);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = mode === "import" ? await importFlow(json) : await createFlow(name, "basic");
      if (!res.ok) return setError(res.error);
      router.push(`/fluxos/${res.id}`);
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={grayButton} onClick={() => setMode("import")} disabled={full}>
          Importar Fluxo
        </button>
        <button type="button" className={redButton} onClick={() => setMode("create")} disabled={full}>
          Criar Fluxo ({count}/{limit})
        </button>
      </div>
      <Modal open={mode !== null} onClose={close} title={mode === "import" ? "Importar fluxo" : "Criar fluxo"}>
        <form onSubmit={submit} className="grid gap-4">
          {mode === "import" ? (
            <label className="grid gap-1.5 text-sm">
              JSON do fluxo
              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                rows={8}
                className="rounded-md border border-line-strong bg-ink p-3 font-mono text-xs text-paper focus:border-paper focus:outline-none"
                placeholder='{ "name": "Boas-vindas", "steps": [{ "kind": "message", "config": { "text": "Olá!" } }] }'
                required
              />
            </label>
          ) : (
            <label className="grid gap-1.5 text-sm">
              Nome do fluxo
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
            </label>
          )}
          {error ? <p role="alert" className="text-sm text-danger-text">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" className={grayButton} onClick={close}>
              Cancelar
            </button>
            <button type="submit" className={redButton} disabled={pending}>
              {pending ? "Aguarde…" : mode === "import" ? "Importar" : "Criar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function DeleteFlowButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={grayButton}
      disabled={pending}
      aria-label={`Excluir fluxo ${name}`}
      onClick={() => {
        if (!window.confirm(`Excluir o fluxo "${name}"?`)) return;
        start(async () => {
          await deleteFlow(id);
          router.refresh();
        });
      }}
    >
      Excluir
    </button>
  );
}
