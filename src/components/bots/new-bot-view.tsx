"use client";

import { ArrowLeft, Bot, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { connectBotAction } from "@/server/actions/bots";

function CopyButton({ text, label, className = "" }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-[#E5E5E5] transition hover:bg-ruby/20 hover:text-white ${className}`}
    >
      {copied ? <Check className="size-4 text-white" /> : <Copy className="size-4" />}
    </button>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="ruby-neon grid size-7 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white">
      {n}
    </span>
  );
}

function Step({ n, title, children, highlight = false }: { n: number; title: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <li
      className="card-neon relative rounded-2xl p-5"
      style={highlight ? { borderColor: "var(--ruby-bright)", boxShadow: "0 0 28px var(--ruby-glow)" } : undefined}
    >
      <div className="mb-3 flex items-center gap-3">
        <StepNumber n={n} />
        <h2 className="text-neon flex-1 text-[15px] font-bold">{title}</h2>
        {highlight && <Check className="size-5 text-ruby" aria-hidden />}
      </div>
      <div className="space-y-3 text-[14px] leading-relaxed text-[#E5E5E5]">{children}</div>
    </li>
  );
}

function Code({ children, color = "text-white", bg = "bg-black", copy }: { children: string; color?: string; bg?: string; copy?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border border-ruby-dark/40 ${bg} px-4 py-3`}>
      <code className={`min-w-0 flex-1 break-all font-mono text-[13px] ${color}`}>{children}</code>
      {copy && <CopyButton text={children} label={`Copiar ${children}`} />}
    </div>
  );
}

export function NewBotView() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ready = /^\d{6,}:[\w-]{30,}$/.test(token.trim());

  function submit() {
    setError(null);
    start(async () => {
      const res = await connectBotAction(token.trim(), null);
      if (res.ok) router.push("/robos");
      else setError(res.error);
    });
  }

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col bg-black text-white">
      <div className="mx-auto w-full max-w-xl flex-1 pb-8">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/robos" aria-label="Voltar" className="card-neon grid size-10 place-items-center rounded-xl text-white transition hover:border-ruby">
            <ArrowLeft className="size-5" />
          </Link>
          <span className="ruby-neon grid size-10 place-items-center rounded-xl text-white">
            <Bot className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-neon text-lg font-extrabold leading-tight">Criar Novo Bot</h1>
            <p className="text-[13px] text-[#E5E5E5]">Configure seu bot do Telegram</p>
          </div>
        </header>

        <ol className="space-y-4">
          <Step n={1} title="Abra o BotFather no Telegram">
            <p>Clique no link ou procure por <span className="font-semibold text-white">@BotFather</span>.</p>
            <Code color="text-[#3B82F6]" copy>https://telegram.me/BotFather</Code>
          </Step>

          <Step n={2} title="Envie o comando /newbot">
            <CopyButton text="/newbot" label="Copiar /newbot" className="absolute right-4 top-4" />
            <p>No chat com o BotFather aberto, dê <span className="font-mono text-white">/start</span> e envie o comando.</p>
            <Code>/newbot</Code>
          </Step>

          <Step n={3} title="Defina o nome do bot">
            <p>O BotFather perguntará: <em>&quot;Alright, a new bot. How are we going to call it?&quot;</em></p>
            <p>Digite o <strong className="font-bold text-white">nome completo</strong> do seu bot (ex: &quot;Meu Bot de Vendas&quot;).</p>
          </Step>

          <Step n={4} title="Defina o username do bot">
            <p>O BotFather pedirá um username único que termine com <span className="font-mono text-white">bot</span>. Exemplos válidos:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Code>empresa123_bot</Code>
              <Code>dominus_bot</Code>
            </div>
          </Step>

          <Step n={5} title="Copie o token" highlight>
            <p>O BotFather enviará uma mensagem com o token do bot. Copie e cole no campo solicitado!</p>
            <Code bg="bg-[#1a0000]" color="text-white">1234567890:ABCdefGHIjklMNOpqrsTUVwxyz</Code>
            <label className="grid gap-1.5 text-[13px] font-semibold text-white">
              Token do bot
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole o token aqui"
                autoComplete="off"
                spellCheck={false}
                className="                rounded-xl border border-ruby-dark/40 bg-black px-4 py-3 font-mono text-[13px] text-white outline-none placeholder:text-zinc-600 focus:border-ruby"
              />
            </label>
            {error && <p role="alert" className="text-[13px] text-red-400">{error}</p>}
          </Step>
        </ol>
      </div>

      <div className="sticky bottom-0 z-30 -mx-6 -mb-8 border-t border-ruby-dark/50 bg-black/90 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <p className="text-[13px] text-zinc-500">{ready ? "Tudo pronto para criar" : "Preencha os dados do bot"}</p>
          <button
            type="button"
            disabled={!ready || pending}
            onClick={submit}
            className="ruby-neon inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Bot className="size-4" aria-hidden /> {pending ? "Criando…" : "Criar Bot"}
          </button>
        </div>
      </div>
    </div>
  );
}
