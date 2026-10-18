import Link from "next/link";
import type { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { brl, formatDateTime, initials, METHOD_LABELS } from "@/components/dashboard/format";
import { cn } from "@/lib/cn";
import { formatMoney, cents } from "@/lib/money";
import { PERIODS, PERIOD_LABELS, type Period } from "@/lib/period";
import type { DashboardStats } from "@/server/actions/dashboard";

export function Panel({ title, children, className, action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-line bg-ink-2/60 p-5", className)}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-steel-light">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function PeriodFilter({ current }: { current: Period }) {
  return (
    <nav aria-label="Período" className="flex flex-wrap gap-1 rounded-md border border-line p-1">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={`/dashboard?periodo=${p}`}
          aria-current={p === current ? "true" : undefined}
          className={cn(
            "rounded px-3 py-1.5 text-sm transition-colors",
            p === current ? "bg-brand-red text-paper" : "text-steel-light hover:text-paper",
          )}
        >
          {PERIOD_LABELS[p]}
        </Link>
      ))}
    </nav>
  );
}

function Metric({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Panel title={title}>
      <p className="text-3xl font-semibold tracking-tight text-paper">{value}</p>
      {hint ? <p className="mt-2 text-sm text-steel">{hint}</p> : null}
    </Panel>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-steel">{children}</p>;
}

export function DashboardGrid({ stats }: { stats: DashboardStats }) {
  const { club } = stats;
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Volume Aprovado" value={brl(stats.approvedVolume)} hint={`${stats.approvedTransactions} transações aprovadas`} />
        <Metric title="Taxa de Aprovação" value={`${stats.approvalRate.toFixed(1).replace(".", ",")}%`} hint="Aprovadas ÷ total" />
        <Metric title="Total de Transações" value={String(stats.totalTransactions)} hint="No período selecionado" />
      </div>

      <Panel title="Log de Atividade">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div><dt className="text-xs text-steel">Leads</dt><dd className="text-2xl font-semibold">{stats.activity.leads}</dd></div>
          <div><dt className="text-xs text-steel">PIX gerados</dt><dd className="text-2xl font-semibold">{stats.activity.pixGenerated}</dd></div>
          <div><dt className="text-xs text-steel">Pagamentos</dt><dd className="text-2xl font-semibold">{stats.activity.payments}</dd></div>
          <div><dt className="text-xs text-steel">Receita</dt><dd className="text-2xl font-semibold">{brl(stats.activity.revenue)}</dd></div>
        </dl>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title="Log de Transações" action={<Link href="/transacoes" className="text-sm text-steel-light underline-offset-4 hover:text-paper hover:underline">Ver todas</Link>}>
          {stats.recent.length === 0 ? (
            <Empty>Nenhum pagamento no período.</Empty>
          ) : (
            <div className="max-h-80 overflow-y-auto pr-1" tabIndex={0} aria-label="Lista de transações">
              <ul className="divide-y divide-line">
                {stats.recent.map((t) => (
                  <li key={t.id}>
                    <Link href={`/transacoes/${t.publicId}`} className="flex items-center justify-between gap-3 py-3 hover:bg-ink-3/60">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-paper">
                          Novo Pagamento · {t.customerName ?? "Cliente não identificado"}
                        </span>
                        <span className="block text-xs text-steel">
                          {METHOD_LABELS[t.method]} · {formatDateTime(t.createdAt)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="text-sm font-medium text-paper">{brl(t.amount)}</span>
                        <StatusBadge status={t.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Metas / Dominus Club">
          <p className="text-sm text-steel">Nível atual</p>
          <p className="text-2xl font-semibold text-paper">{club.current}</p>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-ink-3"
            role="progressbar"
            aria-valuenow={club.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso até o próximo nível"
          >
            <div className="h-full bg-brand-red" style={{ width: `${club.percent}%` }} />
          </div>
          <p className="mt-3 text-sm text-steel">
            {club.next
              ? `${club.percent}% até ${club.next} — faltam ${formatMoney(cents(club.remaining))} em volume aprovado.`
              : "Nível máximo alcançado."}
          </p>
          <p className="mt-1 text-xs text-steel">Volume aprovado acumulado: {brl(stats.allTimeApprovedVolume)}</p>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Ticket Médio" value={brl(stats.averageTicket)} hint="Média das transações aprovadas" />
        <Panel title="Top 5 Clientes">
          {stats.topCustomers.length === 0 ? (
            <Empty>Sem clientes com pagamentos aprovados.</Empty>
          ) : (
            <ol className="grid gap-3">
              {stats.topCustomers.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-red/20 text-xs font-semibold text-paper" aria-hidden="true">
                    {initials(c.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-paper">
                      {i + 1}. {c.name}
                    </span>
                    <span className="block text-xs text-steel">{c.transactions} transações</span>
                  </span>
                  <span className="text-sm font-medium text-paper">{brl(c.volume)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Metric title="Saldo disponível" value={brl(stats.balance)} hint="Créditos − débitos no livro-razão" />
      </div>
    </div>
  );
}

export type { Period };
