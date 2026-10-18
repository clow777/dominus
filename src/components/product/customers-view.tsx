"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { brl, formatDateTime, initials } from "@/components/dashboard/format";
import { redButton } from "@/components/product/styles";
import { cn } from "@/lib/cn";
import { customerMetrics, segmentOf, statusOf, toCsv, type CustomerSegment, type CustomerStatus } from "@/lib/customers";
import { getCustomerHistory, setCustomerBlocked, type CustomerPurchase } from "@/server/actions/customers";

export interface CustomerItem {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  blocked: boolean;
  volume: number;
  approvedCount: number;
  lastPurchaseAt: string | null;
}

const STATUS_LABEL: Record<CustomerStatus, string> = { ativo: "Ativo", inativo: "Inativo", bloqueado: "Bloqueado" };
const STATUS_STYLE: Record<CustomerStatus, string> = {
  ativo: "border-white/30 text-white",
  inativo: "border-ruby-dark/40 text-zinc-500",
  bloqueado: "border-ruby/60 text-white",
};
const SEGMENTS: { key: CustomerSegment; label: string }[] = [
  { key: "novo", label: "Novos" },
  { key: "recorrente", label: "Recorrentes" },
  { key: "vip", label: "VIP" },
];

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
function relative(iso: string | null, now: number): string {
  if (!iso) return "—";
  const diffMin = Math.round((new Date(iso).getTime() - now) / 60_000);
  const abs = Math.abs(diffMin);
  if (abs < 60) return rtf.format(diffMin, "minute");
  if (abs < 60 * 24) return rtf.format(Math.round(diffMin / 60), "hour");
  return rtf.format(Math.round(diffMin / 1440), "day");
}

const card = "rounded-xl border border-[#222] bg-[#151515]";

export function CustomersView({ customers, approvedTransactions, now }: { customers: CustomerItem[]; approvedTransactions: number; now: number }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [selected, setSelected] = useState<CustomerItem | null>(null);

  const enriched = useMemo(
    () =>
      customers.map((c) => {
        const last = c.lastPurchaseAt ? new Date(c.lastPurchaseAt) : null;
        return { ...c, last, status: statusOf({ lastPurchaseAt: last, blocked: c.blocked }, new Date(now)), segment: segmentOf(c) };
      }),
    [customers, now],
  );
  const metrics = useMemo(
    () => customerMetrics(enriched.map((c) => ({ volume: c.volume, approvedCount: c.approvedCount, lastPurchaseAt: c.last, blocked: c.blocked })), approvedTransactions, new Date(now)),
    [enriched, approvedTransactions, now],
  );

  const visible = enriched.filter((c) => {
    const q = query.trim().toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !(c.email ?? "").toLowerCase().includes(q)) return false;
    if (filter === "ativo") return c.status === "ativo";
    if (filter === "inativo") return c.status !== "ativo";
    return true;
  });

  function exportCsv() {
    const csv = toCsv(
      ["Nome", "E-mail", "Total gasto (R$)", "Compras aprovadas", "Última compra", "Status"],
      visible.map((c) => [c.name, c.email ?? "", (c.volume / 100).toFixed(2).replace(".", ","), c.approvedCount, c.lastPurchaseAt ?? "", STATUS_LABEL[c.status]]),
    );
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = [
    { label: "Total de Clientes", value: String(metrics.total) },
    { label: "Clientes Ativos (24h)", value: String(metrics.active24h) },
    { label: "LTV Médio", value: brl(metrics.ltv) },
    { label: "Ticket Médio", value: brl(metrics.ticket) },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mb-6 text-title font-extrabold">Clientes</h1>

      <dl className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={cn(card, "p-4")}>
            <dt className="text-xs text-zinc-400">{s.label}</dt>
            <dd className="mt-1 text-2xl font-black text-white" data-testid={`metric-${s.label}`}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <div className="grid min-w-0 content-start gap-4">
          <section className={cn(card, "p-5")} aria-labelledby="funnel-title">
            <h2 id="funnel-title" className="mb-4 text-sm font-bold text-white">Funil de clientes</h2>
            <div className="grid grid-cols-3 gap-4">
              {SEGMENTS.map((s) => (
                <div key={s.key}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-400">{s.label}</span>
                    <span className="text-xs font-bold text-zinc-300">{metrics.segmentPercent[s.key]}%</span>
                  </div>
                  <p className="text-2xl font-black text-white">{metrics.segments[s.key]}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#222]" role="progressbar" aria-valuenow={metrics.segmentPercent[s.key]} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.label}: ${metrics.segmentPercent[s.key]}%`}>
                    <div className="ruby-neon h-full rounded-full" style={{ width: `${metrics.segmentPercent[s.key]}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-zinc-500">Seus clientes aparecerão aqui assim que alguém pagar via PIX.</p>
          </section>

          <section className={cn(card, "overflow-hidden")} aria-label="Lista de clientes">
            <div className="flex flex-wrap items-center gap-3 border-b border-[#222] p-4">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                aria-label="Buscar clientes"
                className="h-9 min-w-48 flex-1 rounded-md border border-ruby-dark/40 bg-black px-3 text-sm text-white placeholder:text-zinc-600 focus:border-ruby focus:outline-none"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                aria-label="Filtrar por status"
                className="h-9 rounded-md border border-ruby-dark/40 bg-black px-2 text-sm text-white"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
              <button type="button" onClick={exportCsv} className="h-9 rounded-md border border-ruby-dark/40 px-3 text-sm font-semibold text-white hover:border-ruby">
                Exportar CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="border-b border-ruby-dark/40 text-xs text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Foto</th>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">E-mail / Telegram</th>
                    <th className="px-4 py-3 text-right font-medium">Total gasto</th>
                    <th className="px-4 py-3 font-medium">Última compra</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {customers.length === 0 ? (
                    <tr aria-hidden="true" className="opacity-20 select-none">
                      <td className="px-4 py-3"><span className="grid size-8 place-items-center rounded-full bg-[#2a2a2a] text-xs">?</span></td>
                      <td className="px-4 py-3">João Exemplo</td>
                      <td className="px-4 py-3">@joao</td>
                      <td className="px-4 py-3 text-right">R$ 97,00</td>
                      <td className="px-4 py-3">há 2h</td>
                      <td className="px-4 py-3">Ativo</td>
                      <td className="px-4 py-3">Ver</td>
                    </tr>
                  ) : null}
                  {visible.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <span className="ruby-neon grid size-8 place-items-center rounded-full text-xs font-bold text-white">{initials(c.name)}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">{c.name}</td>
                      <td className="px-4 py-3 text-zinc-400">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-white">{brl(c.volume)}</td>
                      <td className="px-4 py-3 text-zinc-400">{relative(c.lastPurchaseAt, now)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold", STATUS_STYLE[c.status])}>{STATUS_LABEL[c.status]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setSelected(c)} className="text-xs font-bold text-white underline-offset-2 hover:underline">
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {customers.length === 0 ? (
              <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
                <svg viewBox="0 0 48 48" className="size-14 text-[#3a3a3a]" fill="currentColor" aria-hidden="true">
                  <circle cx="24" cy="16" r="7" />
                  <circle cx="10" cy="20" r="5" />
                  <circle cx="38" cy="20" r="5" />
                  <path d="M10 40c0-8 6-14 14-14s14 6 14 14zM0 38c0-6 4-10 9-10 1.700 0 3 .4 4.300 1.100C10 32 8 35 8 38zM48 38c0-6-4-10-9-10-1.700 0-3 .4-4.300 1.100C38 32 40 35 40 38z" />
                </svg>
                <h2 className="text-lg font-extrabold text-white">Sua base de clientes está sendo construída</h2>
                <p className="max-w-md text-sm text-zinc-400">Assim que seu fluxo do Telegram vender, os clientes aparecem aqui automaticamente.</p>
                <Link href="/fluxos" className="mt-2 rounded-md border border-ruby-dark/40 px-4 py-2 text-sm font-bold text-white hover:border-ruby">
                  Como capturar clientes?
                </Link>
              </div>
            ) : visible.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">Nenhum cliente encontrado com esses filtros.</p>
            ) : null}
          </section>
        </div>

        <aside className={cn(card, "h-fit p-5")} aria-labelledby="how-title">
          <h2 id="how-title" className="mb-4 text-sm font-bold text-white">Como funciona?</h2>
          <ol className="grid gap-3 text-sm text-zinc-300">
            {["Crie um Fluxo", "Gere o link do Bot", "Quando o cliente pagar, ele vira cliente aqui"].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="ruby-neon grid size-6 shrink-0 place-items-center rounded-md text-xs font-black text-white">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <Link href="/fluxos" className={cn(redButton, "mt-5 w-full justify-center text-center")}>
            Criar meu primeiro Fluxo
          </Link>
        </aside>
      </div>

      {selected ? <CustomerDialog customer={selected} now={now} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function CustomerDialog({ customer, now, onClose }: { customer: CustomerItem; now: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [purchases, setPurchases] = useState<CustomerPurchase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(customer.blocked);
  const [pending, start] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    let alive = true;
    getCustomerHistory(customer.id).then((res) => {
      if (!alive) return;
      if (res.ok) setPurchases(res.purchases);
      else setError(res.error);
    });
    return () => {
      alive = false;
    };
  }, [customer.id]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="customer-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl card-neon p-0 text-white backdrop:bg-black/70"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="customer-title" className="text-lg font-extrabold">{customer.name}</h2>
            <p className="text-sm text-zinc-400">{customer.email ?? "Sem e-mail"} · cliente desde {formatDateTime(new Date(customer.createdAt))}</p>
          </div>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Fechar" className="text-zinc-400 hover:text-white">✕</button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#222] bg-[#151515] p-3">
            <dt className="text-xs text-zinc-400">Valor total</dt>
            <dd className="text-lg font-black">{brl(customer.volume)}</dd>
          </div>
          <div className="rounded-lg border border-[#222] bg-[#151515] p-3">
            <dt className="text-xs text-zinc-400">Compras aprovadas</dt>
            <dd className="text-lg font-black">{customer.approvedCount}</dd>
          </div>
        </dl>

        <h3 className="mt-5 mb-2 text-sm font-bold">Histórico de compras</h3>
        <div className="max-h-56 overflow-y-auto rounded-lg border border-[#222]">
          {error ? (
            <p role="alert" className="p-4 text-sm text-white">{error}</p>
          ) : purchases === null ? (
            <p className="p-4 text-sm text-zinc-500">Carregando…</p>
          ) : purchases.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Nenhuma compra registrada.</p>
          ) : (
            <ul className="divide-y divide-[#222] text-sm">
              {purchases.map((p) => (
                <li key={p.publicId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <Link href={`/transacoes/${p.publicId}`} className="text-zinc-300 hover:text-white">{formatDateTime(new Date(p.createdAt))}</Link>
                  <span className="text-xs text-zinc-500">{p.status}</span>
                  <span className="font-bold">{brl(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-600">Atualizado em {relative(new Date(now).toISOString(), now)}.</p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await setCustomerBlocked(customer.id, !blocked);
                if (res.ok) setBlocked(!blocked);
                else setError(res.error);
              })
            }
            className="h-9 rounded-md border border-ruby/60 px-4 text-sm font-bold text-white hover:bg-ruby/10 disabled:opacity-60"
          >
            {pending ? "Salvando…" : blocked ? "Desbloquear cliente" : "Bloquear cliente"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
