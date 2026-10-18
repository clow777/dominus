"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DpCard, KebabMenu } from "@/components/dash/card";
import { Modal } from "@/components/ui/modal";
import { AUDIENCE_LABEL, type BotView, type CampaignAudience } from "@/lib/bots";
import { brl } from "@/lib/format";
import {
  cancelCampaignAction,
  connectBotAction,
  createCampaignAction,
  disconnectBotAction,
  setBotFlowAction,
  setBotPausedAction,
  updateBotTokenAction,
  type BotActionResult,
} from "@/server/actions/bots";

interface FlowOption {
  id: string;
  name: string;
}

interface CampaignRow {
  id: string;
  botId: string;
  name: string;
  status: string;
  total: number;
  sent: number;
  failed: number;
  blocked: number;
  scheduledAt: string;
}

type Dialog = { kind: "connect" } | { kind: "token" | "flow" | "campaign"; bot: BotView } | null;

const primary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-linear-to-b from-[#ff3b57] to-[#e0102e] px-4 text-sm font-semibold text-[#0a0a0a] shadow-[0_0_18px_var(--dp-glow)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
const secondary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-dp-border bg-[#1e1e21] px-4 text-sm font-semibold text-white transition hover:border-dp-primary disabled:opacity-50";
const field =
  "h-10 w-full rounded-lg border border-dp-border bg-dp-inner px-3 text-sm text-white placeholder:text-dp-dim focus:border-dp-primary focus:outline-none";

const STATUS: Record<BotView["status"], { label: string; cls: string }> = {
  online: { label: "Online", cls: "bg-dp-tint text-dp-primary" },
  offline: { label: "Offline", cls: "bg-white/5 text-dp-muted" },
  paused: { label: "Pausado", cls: "bg-amber-500/15 text-amber-400" },
};

const CAMPAIGN_STATUS: Record<string, string> = { scheduled: "Agendada", sending: "Enviando", done: "Concluída", cancelled: "Cancelada" };

function BotIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 8V4M9 13h.01M15 13h.01M9 16.5h6" />
    </svg>
  );
}

function StatIcon({ kind }: { kind: "ok" | "alert" }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      {kind === "ok" ? <path d="m8.5 12.5 2.5 2.5 4.5-5" /> : <path d="M12 8v5M12 16.5h.01" />}
    </svg>
  );
}

function Avatar({ bot }: { bot: BotView }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-dp-inner text-dp-muted">
      {broken ? (
        <BotIcon />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- rota autenticada que serve a foto sem expor o token
        <img src={`/api/bots/${bot.id}/photo`} alt="" className="size-full object-cover" onError={() => setBroken(true)} />
      )}
    </span>
  );
}

function Kpi({ icon, title, value, muted }: { icon: React.ReactNode; title: string; value: number; muted?: boolean }) {
  return (
    <DpCard>
      <div className="flex items-center gap-2.5">
        <span className={`grid size-8 place-items-center rounded-lg ${muted ? "bg-white/5 text-dp-muted" : "bg-dp-tint text-dp-primary"}`}>{icon}</span>
        <h2 className="text-[11px] font-semibold text-white">{title}</h2>
      </div>
      <p className={`mt-4 text-[28px] leading-none font-bold ${muted ? "text-dp-muted" : "text-white"}`}>
        {value} <span className="text-sm font-medium text-dp-muted">{value === 1 ? "Bot" : "Bots"}</span>
      </p>
    </DpCard>
  );
}

export function BotsView({ bots, flows, campaigns, limit }: { bots: BotView[]; flows: FlowOption[]; campaigns: CampaignRow[]; limit: number }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const full = bots.length >= limit;
  const sending = campaigns.some((c) => c.status === "sending" || c.status === "scheduled");

  useEffect(() => {
    if (!sending) return;
    const id = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(id);
  }, [sending, router]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  function run(action: () => Promise<BotActionResult>, success: string) {
    start(async () => {
      const res = await action();
      setNotice({ ok: res.ok, text: res.ok ? success : res.error });
      if (res.ok) router.refresh();
    });
  }

  const active = bots.filter((b) => b.status === "online").length;
  const connectButton = (
    <button type="button" className={primary} disabled={full} title={full ? `Limite de ${limit} bots atingido` : undefined} onClick={() => setDialog({ kind: "connect" })}>
      <BotIcon className="size-4" /> Conectar Bot ({bots.length}/{limit})
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-bold">Meus Robôs</h1>
          <p className="text-sm text-dp-muted">Gerencie seus bots do Telegram</p>
        </div>
        {connectButton}
      </header>

      {notice ? (
        <p role="status" className={`mb-4 rounded-lg border px-4 py-3 text-sm ${notice.ok ? "border-dp-primary/40 bg-dp-tint text-white" : "border-red-500/40 bg-red-500/10 text-red-300"}`}>
          {notice.text}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Kpi icon={<BotIcon />} title="Total de Bots" value={bots.length} />
        <Kpi icon={<StatIcon kind="ok" />} title="Bots Ativos" value={active} />
        <Kpi icon={<StatIcon kind="alert" />} title="Bots Inativos" value={bots.length - active} muted />
      </div>

      {bots.length === 0 ? (
        <DpCard>
          <div className="grid place-items-center gap-3 py-12 text-center">
            <BotIcon className="size-12 text-dp-dim" />
            <h2 className="text-lg font-semibold">Nenhum bot configurado</h2>
            <p className="max-w-md text-sm text-dp-muted">Conecte seu primeiro bot do Telegram para começar a automatizar suas vendas e capturar leads.</p>
            <button type="button" className={primary} onClick={() => setDialog({ kind: "connect" })}>
              <BotIcon className="size-4" /> Conectar Bot do Telegram
            </button>
          </div>
        </DpCard>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <li key={bot.id}>
              <DpCard className="h-full">
                <div className="flex items-start gap-3">
                  <Avatar bot={bot} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{bot.name}</h3>
                    <p className="truncate font-jb text-xs text-dp-muted">@{bot.username}</p>
                    <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS[bot.status].cls}`}>{STATUS[bot.status].label}</span>
                  </div>
                  <KebabMenu
                    items={[
                      ...(bot.flowId ? [{ label: "Editar fluxo vinculado", onSelect: () => router.push(`/fluxos/${bot.flowId}`) }] : []),
                      { label: bot.flowId ? "Trocar fluxo" : "Vincular fluxo", onSelect: () => setDialog({ kind: "flow", bot }) },
                      { label: "Disparar campanha", onSelect: () => setDialog({ kind: "campaign", bot }) },
                      bot.status === "paused"
                        ? { label: "Retomar", onSelect: () => run(() => setBotPausedAction(bot.id, false), "Bot retomado.") }
                        : { label: "Pausar", onSelect: () => run(() => setBotPausedAction(bot.id, true), "Bot pausado.") },
                      { label: "Atualizar token", onSelect: () => setDialog({ kind: "token", bot }) },
                      {
                        label: "Desconectar",
                        onSelect: () => {
                          if (window.confirm(`Desconectar @${bot.username}? O histórico de leads e vendas é mantido.`)) run(() => disconnectBotAction(bot.id), "Bot desconectado.");
                        },
                      },
                    ]}
                  />
                </div>
                <p className="mt-4 text-xs text-dp-muted">
                  Fluxo: <span className="text-white">{bot.flowName ?? "nenhum vinculado"}</span>
                </p>
                {bot.lastError && bot.status === "offline" ? <p className="mt-2 text-xs text-red-300">{bot.lastError}</p> : null}
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-dp-divider pt-3 text-center">
                  {[
                    ["Leads (30d)", String(bot.leads30d)],
                    ["Vendas (30d)", String(bot.sales30d)],
                    ["Receita (30d)", brl(bot.revenue30d)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[10px] text-dp-muted">{label}</dt>
                      <dd className="mt-1 truncate text-sm font-bold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </DpCard>
            </li>
          ))}
        </ul>
      )}

      {campaigns.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Campanhas recentes</h2>
          <DpCard className="p-0 md:p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="text-[11px] text-dp-muted">
                  <tr>
                    {["Campanha", "Bot", "Status", "Progresso", ""].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const bot = bots.find((b) => b.id === c.botId);
                    const open = c.status === "scheduled" || c.status === "sending";
                    return (
                      <tr key={c.id} className="border-t border-dp-divider">
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3 font-jb text-xs text-dp-muted">{bot ? `@${bot.username}` : "—"}</td>
                        <td className="px-4 py-3">
                          {CAMPAIGN_STATUS[c.status] ?? c.status}
                          {c.status === "scheduled" ? <span className="block text-[11px] text-dp-muted">{new Date(c.scheduledAt).toLocaleString("pt-BR")}</span> : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-dp-muted">
                          {c.sent}/{c.total} enviadas · {c.blocked} bloqueadas · {c.failed} falhas
                        </td>
                        <td className="px-4 py-3 text-right">
                          {open ? (
                            <button type="button" className="text-xs text-dp-primary hover:underline" onClick={() => run(() => cancelCampaignAction(c.id), "Campanha cancelada.")}>
                              Cancelar
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DpCard>
        </section>
      ) : null}

      <Modal open={dialog?.kind === "connect"} onClose={() => setDialog(null)} title="Conectar bot do Telegram">
        <ConnectForm flows={flows} onDone={(text) => { setDialog(null); setNotice({ ok: true, text }); router.refresh(); }} />
      </Modal>
      <Modal open={dialog?.kind === "token"} onClose={() => setDialog(null)} title="Atualizar token">
        {dialog?.kind === "token" ? (
          <TokenForm bot={dialog.bot} onDone={() => { setDialog(null); setNotice({ ok: true, text: "Token atualizado." }); router.refresh(); }} />
        ) : null}
      </Modal>
      <Modal open={dialog?.kind === "flow"} onClose={() => setDialog(null)} title="Fluxo vinculado">
        {dialog?.kind === "flow" ? (
          <FlowForm bot={dialog.bot} flows={flows} onDone={() => { setDialog(null); setNotice({ ok: true, text: "Fluxo atualizado." }); router.refresh(); }} />
        ) : null}
      </Modal>
      <Modal open={dialog?.kind === "campaign"} onClose={() => setDialog(null)} title="Disparar campanha">
        {dialog?.kind === "campaign" ? (
          <CampaignForm bot={dialog.bot} onDone={() => { setDialog(null); setNotice({ ok: true, text: "Campanha criada." }); router.refresh(); }} />
        ) : null}
      </Modal>
      {pending ? <span className="sr-only" role="status">Aguarde…</span> : null}
    </div>
  );
}

function FormShell({ onSubmit, error, pending, submit, children }: { onSubmit: () => void; error: string | null; pending: boolean; submit: string; children: React.ReactNode }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="grid gap-4">
      {children}
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
      <div className="flex justify-end">
        <button type="submit" className={primary} disabled={pending}>{pending ? "Aguarde…" : submit}</button>
      </div>
    </form>
  );
}

function useSubmit(onDone: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return {
    error,
    pending,
    run(action: () => Promise<BotActionResult>) {
      setError(null);
      start(async () => {
        const res = await action();
        if (res.ok) onDone();
        else setError(res.error);
      });
    },
  };
}

function ConnectForm({ flows, onDone }: { flows: FlowOption[]; onDone: (text: string) => void }) {
  const [token, setToken] = useState("");
  const [flowId, setFlowId] = useState("");
  const s = useSubmit(() => { setToken(""); setFlowId(""); onDone("Bot conectado e webhook registrado."); });
  return (
    <FormShell onSubmit={() => s.run(() => connectBotAction(token, flowId || null))} error={s.error} pending={s.pending} submit="Conectar">
      <ol className="list-decimal space-y-1 pl-5 text-xs text-dp-muted">
        <li>No Telegram, abra o <span className="text-white">@BotFather</span>.</li>
        <li>Envie <span className="font-jb text-white">/newbot</span> e siga os passos (ou <span className="font-jb text-white">/token</span> para um bot existente).</li>
        <li>Copie o token e cole abaixo.</li>
      </ol>
      <label className="grid gap-1.5 text-sm">
        Token do bot
        <input value={token} onChange={(e) => setToken(e.target.value)} className={`${field} font-jb`} placeholder="123456789:AA…" autoComplete="off" spellCheck={false} required />
      </label>
      <label className="grid gap-1.5 text-sm">
        Fluxo (opcional)
        <select value={flowId} onChange={(e) => setFlowId(e.target.value)} className={field}>
          <option value="">Vincular depois</option>
          {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>
    </FormShell>
  );
}

function TokenForm({ bot, onDone }: { bot: BotView; onDone: () => void }) {
  const [token, setToken] = useState("");
  const s = useSubmit(onDone);
  return (
    <FormShell onSubmit={() => s.run(() => updateBotTokenAction(bot.id, token))} error={s.error} pending={s.pending} submit="Atualizar">
      <p className="text-xs text-dp-muted">Cole o novo token de @{bot.username}. O token atual nunca é exibido.</p>
      <input value={token} onChange={(e) => setToken(e.target.value)} className={`${field} font-jb`} placeholder="123456789:AA…" autoComplete="off" spellCheck={false} required />
    </FormShell>
  );
}

function FlowForm({ bot, flows, onDone }: { bot: BotView; flows: FlowOption[]; onDone: () => void }) {
  const [flowId, setFlowId] = useState(bot.flowId ?? "");
  const s = useSubmit(onDone);
  return (
    <FormShell onSubmit={() => s.run(() => setBotFlowAction(bot.id, flowId || null))} error={s.error} pending={s.pending} submit="Salvar">
      {flows.length === 0 ? (
        <p className="text-sm text-dp-muted">Você ainda não tem fluxos. <Link href="/fluxos" className="text-dp-primary underline">Crie um fluxo</Link>.</p>
      ) : (
        <select value={flowId} onChange={(e) => setFlowId(e.target.value)} className={field} aria-label="Fluxo">
          <option value="">Nenhum</option>
          {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      )}
    </FormShell>
  );
}

function CampaignForm({ bot, onDone }: { bot: BotView; onDone: () => void }) {
  const [name, setName] = useState("");
  const [audience, setAudience] = useState<CampaignAudience>("all");
  const [tag, setTag] = useState("");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [buttons, setButtons] = useState<{ text: string; url: string }[]>([]);
  const [schedule, setSchedule] = useState("");
  const s = useSubmit(onDone);

  return (
    <FormShell
      onSubmit={() =>
        s.run(() =>
          createCampaignAction({
            botId: bot.id,
            name,
            audience,
            audienceTag: audience === "tag" ? tag : undefined,
            text,
            mediaUrl: mediaUrl.trim() || undefined,
            buttons: buttons.filter((b) => b.text.trim() || b.url.trim()),
            scheduledAt: schedule ? new Date(schedule).toISOString() : null,
          }),
        )
      }
      error={s.error}
      pending={s.pending}
      submit={schedule ? "Agendar" : "Enviar agora"}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Nome da campanha" aria-label="Nome da campanha" required />
      <select value={audience} onChange={(e) => setAudience(e.target.value as CampaignAudience)} className={field} aria-label="Público">
        {(Object.keys(AUDIENCE_LABEL) as CampaignAudience[]).map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
      </select>
      {audience === "tag" ? <input value={tag} onChange={(e) => setTag(e.target.value)} className={field} placeholder="Tag" aria-label="Tag" required /> : null}
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={4096} className={`${field} h-auto py-2`} placeholder="Mensagem" aria-label="Mensagem" required />
      <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className={field} placeholder="Link https da imagem (opcional)" aria-label="Imagem" />
      {buttons.map((b, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <input value={b.text} onChange={(e) => setButtons(buttons.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className={field} placeholder="Texto do botão" aria-label="Texto do botão" />
          <input value={b.url} onChange={(e) => setButtons(buttons.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} className={field} placeholder="https://…" aria-label="Link do botão" />
        </div>
      ))}
      {buttons.length < 4 ? (
        <button type="button" className={secondary} onClick={() => setButtons([...buttons, { text: "", url: "" }])}>+ Botão com link</button>
      ) : null}
      <label className="grid gap-1.5 text-xs text-dp-muted">
        Agendar (deixe vazio para enviar agora)
        <input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} className={field} />
      </label>
    </FormShell>
  );
}
