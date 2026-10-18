"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { saveTracking, setTrackingEnabled } from "@/server/actions/product";
import { grayButton, inputClass, redButton } from "./styles";

interface Props {
  platform: string;
  name: string;
  field: string;
  enabled: boolean;
  configured: boolean;
}

export function TrackingControls({ platform, name, field, enabled, configured }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(next: boolean) {
    setError(null);
    start(async () => {
      const res = await setTrackingEnabled(platform, next);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3 text-sm">
          <Switch checked={enabled} onChange={toggle} label={`${enabled ? "Desativar" : "Ativar"} ${name}`} disabled={pending} />
          <span className={enabled ? "text-paper" : "text-steel"}>{enabled ? "ATIVADO" : "DESATIVADO"}</span>
        </span>
        <button type="button" className={configured ? grayButton : redButton} onClick={() => setOpen(true)}>
          Configurar
        </button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-danger-text">{error}</p> : null}
      <Modal open={open} onClose={() => setOpen(false)} title={`Configurar ${name}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await saveTracking(platform, value);
              if (!res.ok) return setError(res.error);
              setValue("");
              setOpen(false);
              router.refresh();
            });
          }}
          className="grid gap-4"
        >
          <label className="grid gap-1.5 text-sm">
            {field}
            <input type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} required />
          </label>
          <p className="text-xs text-steel">O valor é cifrado ao salvar. Depois de configurar, use o interruptor para ativar.</p>
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
    </div>
  );
}
