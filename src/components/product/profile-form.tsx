"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { saveProfile } from "@/server/actions/product";
import { inputClass } from "./styles";

type Initial = { name: string; email: string; phone: string; cpf: string; avatarUrl: string | null; revenue: string };

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: initial.name, phone: initial.phone, cpf: initial.cpf });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: "name" | "phone" | "cpf") => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL do blob só existe no cliente
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 5 * 1024 * 1024) {
      setMessage({ ok: false, text: "Use JPG, PNG ou WEBP de até 5 MB." });
      e.target.value = "";
      return;
    }
    setMessage(null);
    setFile(f);
  }

  const shown = preview ?? initial.avatarUrl;
  const letter = (form.name.trim().charAt(0) || "?").toUpperCase();

  return (
    <form
      className="mx-auto grid w-full max-w-xl gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        start(async () => {
          if (file) {
            const body = new FormData();
            body.set("avatar", file);
            const up = await fetch("/api/profile/avatar", { method: "POST", body });
            if (!up.ok) {
              const err = (await up.json().catch(() => null)) as { error?: string } | null;
              setMessage({ ok: false, text: err?.error ?? "Falha ao enviar a foto." });
              return;
            }
            setFile(null);
          }
          const res = await saveProfile({ name: form.name, phone: form.phone, cpf: form.cpf });
          setMessage(res.ok ? { ok: true, text: "Alterações salvas." } : { ok: false, text: res.error });
          if (res.ok) router.refresh();
        });
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Alterar foto de perfil"
          className="group relative size-32 overflow-hidden rounded-full border-2 border-ruby bg-black shadow-[0_0_28px_var(--ruby-glow)]"
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview local via blob:, não otimizável
            <img src={shown} alt="Foto de perfil" className="size-full object-cover" />
          ) : (
            <span className="ruby-neon grid size-full place-items-center text-5xl font-black text-white">{letter}</span>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Alterar foto
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} tabIndex={-1} />
        <p className="text-xs text-steel">JPG, PNG ou WEBP · até 5 MB</p>
      </div>

      <label className="grid gap-1.5 text-sm font-semibold">
        Nome
        <input value={form.name} onChange={set("name")} className={inputClass} required />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        E-mail
        <input value={initial.email} readOnly aria-describedby="email-hint" className={`${inputClass} cursor-not-allowed opacity-60`} />
        <span id="email-hint" className="text-xs font-normal text-steel">O e-mail não pode ser alterado</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold">
          CPF
          <input value={form.cpf} onChange={set("cpf")} className={inputClass} inputMode="numeric" placeholder="000.000.000-00" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Telefone
          <input value={form.phone} onChange={set("phone")} className={inputClass} inputMode="tel" placeholder="(11) 90000-0000" />
        </label>
      </div>
      <div className="grid gap-1.5 text-sm font-semibold">
        Faturamento
        <p className="rounded-md border border-line bg-ink-2 px-3 py-2.5 text-lg font-bold" data-testid="profile-revenue">
          {initial.revenue}
        </p>
      </div>

      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-center text-sm text-paper" : "text-center text-sm text-danger-text"}>
          {message.text}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md ruby-neon text-sm font-extrabold text-white hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}
