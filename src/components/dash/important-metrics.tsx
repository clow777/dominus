import type { ReactNode } from "react";

import type { MetricaMes, MetricasMesResponse } from "@/lib/dash-types";
import { brlDot, pct } from "@/lib/format";
import { DpCard } from "./card";
import { CartIcon, DollarIcon, TargetIcon, TrendDownIcon, TrendUpIcon } from "./icons";

function Variation({ value }: { value: number }) {
  const abs = Math.abs(value);
  if (value === 0) return <span className="text-[11px] font-semibold text-dp-muted">— {pct(0)}</span>;
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-dp-neg">
        <TrendDownIcon className="size-3.5" /> {pct(abs)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-dp-primary">
      <TrendUpIcon className="size-3.5" /> {pct(abs)}
    </span>
  );
}

function MetricBox({ icon, title, value, metric }: { icon: ReactNode; title: string; value: string; metric: MetricaMes }) {
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-dp-border bg-dp-inner p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-dp-tint text-dp-primary">{icon}</span>
      <div>
        <p className="text-[11px] font-semibold text-white">{title}</p>
        <p className="text-xl leading-tight font-bold text-white">{value}</p>
        <Variation value={metric.variacao} />
      </div>
    </div>
  );
}

export function ImportantMetrics({ data }: { data: MetricasMesResponse }) {
  return (
    <DpCard className="lg:col-span-3">
      <h2 className="text-base font-bold text-white">Métricas Importantes</h2>
      <p className="mb-4 text-[10px] text-dp-muted">01 ao último dia do mês</p>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricBox icon={<TargetIcon />} title="Taxa de Conversão" value={pct(data.conversao.valor, 2)} metric={data.conversao} />
        <MetricBox icon={<DollarIcon />} title="Ticket Médio" value={brlDot(data.ticketMedio.valor)} metric={data.ticketMedio} />
        <MetricBox icon={<CartIcon />} title="Total de Vendas" value={String(data.totalVendas.valor)} metric={data.totalVendas} />
      </div>
    </DpCard>
  );
}
