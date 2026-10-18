"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FLOW_STEP_KINDS } from "@/lib/preferences";
import { saveFlow } from "@/server/actions/product";
import { grayButton, inputClass, redButton } from "./styles";

interface Step {
  uid: number;
  kind: string;
  config: Record<string, string>;
}

let nextUid = 1;

export function FlowEditor({
  flowId,
  initialName,
  initialSteps,
}: {
  flowId: string;
  initialName: string;
  initialSteps: { kind: string; config: Record<string, string> }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [steps, setSteps] = useState<Step[]>(() => initialSteps.map((s) => ({ ...s, uid: nextUid++ })));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const kindOf = (key: string) => FLOW_STEP_KINDS.find((k) => k.key === key) ?? FLOW_STEP_KINDS[0];

  const add = (kind: string) => setSteps((s) => [...s, { uid: nextUid++, kind, config: {} }]);
  const remove = (uid: number) => setSteps((s) => s.filter((x) => x.uid !== uid));
  const move = (i: number, dir: -1 | 1) =>
    setSteps((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });
  const setField = (uid: number, field: string, value: string) =>
    setSteps((s) => s.map((x) => (x.uid === uid ? { ...x, config: { ...x.config, [field]: value } } : x)));

  function save() {
    setMessage(null);
    start(async () => {
      const res = await saveFlow(flowId, { name, steps: steps.map(({ kind, config }) => ({ kind, config })) });
      setMessage(res.ok ? { ok: true, text: "Fluxo salvo." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <label className="grid gap-1.5 text-sm">
        Nome do fluxo
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>

      {steps.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong p-8 text-center text-sm text-steel">
          Nenhum passo ainda. Adicione o primeiro abaixo.
        </p>
      ) : (
        <ol className="grid gap-3">
          {steps.map((s, i) => {
            const meta = kindOf(s.kind)!;
            return (
              <li key={s.uid} className="rounded-lg border border-line bg-ink-2/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="grid size-6 place-items-center rounded-full bg-brand-red text-xs">{i + 1}</span>
                    {meta.label}
                  </span>
                  <span className="flex gap-1">
                    <button type="button" className={grayButton + " h-8 px-2"} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para cima">
                      ↑
                    </button>
                    <button type="button" className={grayButton + " h-8 px-2"} onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Mover para baixo">
                      ↓
                    </button>
                    <button type="button" className={grayButton + " h-8 px-2"} onClick={() => remove(s.uid)} aria-label="Remover passo">
                      ✕
                    </button>
                  </span>
                </div>
                <input
                  value={s.config[meta.field] ?? ""}
                  onChange={(e) => setField(s.uid, meta.field, e.target.value)}
                  className={inputClass}
                  placeholder={meta.placeholder}
                  aria-label={`${meta.label}: ${meta.placeholder}`}
                />
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap gap-2">
        {FLOW_STEP_KINDS.map((k) => (
          <button key={k.key} type="button" className={grayButton} onClick={() => add(k.key)}>
            + {k.label}
          </button>
        ))}
      </div>

      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-paper" : "text-sm text-danger-text"}>
          {message.text}
        </p>
      ) : null}
      <div>
        <button type="button" className={redButton} onClick={save} disabled={pending}>
          {pending ? "Salvando…" : "Salvar fluxo"}
        </button>
      </div>
    </div>
  );
}
