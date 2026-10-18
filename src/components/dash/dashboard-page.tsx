"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DesempenhoResponse, KpisResponse, MetricasMesResponse, RankingResponse } from "@/lib/dash-types";
import type { DashPeriod } from "@/lib/dash-period";
import { brl, pct } from "@/lib/format";
import { CardError, CardSkeleton } from "./card";
import { ConversionGauge } from "./conversion-gauge";
import { CartIcon, DollarIcon, ZapIcon } from "./icons";
import { ImportantMetrics } from "./important-metrics";
import { KpiCard } from "./kpi-card";
import { PerformanceChart } from "./performance-chart";
import { PeriodFilter } from "./period-filter";
import { TopPlayers } from "./top-players";
import { useEndpoint } from "./use-endpoint";
import { TargetIcon } from "./icons";

export function DashboardPage({ initialPeriod }: { initialPeriod: DashPeriod }) {
  const router = useRouter();
  const [period, setPeriod] = useState(initialPeriod);

  const kpis = useEndpoint<KpisResponse>(`/api/dashboard/kpis?periodo=${period}`);
  const perf = useEndpoint<DesempenhoResponse>(`/api/dashboard/desempenho?periodo=${period}`);
  const ranking = useEndpoint<RankingResponse>("/api/dashboard/ranking?limite=5");
  const month = useEndpoint<MetricasMesResponse>("/api/dashboard/metricas-mes");

  function changePeriod(next: DashPeriod) {
    setPeriod(next);
    router.replace(`/dashboard?periodo=${next}`, { scroll: false });
  }

  function refreshAll() {
    kpis.reload();
    perf.reload();
    ranking.reload();
    month.reload();
  }

  const k = kpis.data;
  const kpiSkeletons = [0, 1, 2, 3].map((i) => <CardSkeleton key={i} />);

  return (
    <div className="mx-auto grid max-w-7xl gap-4 font-inter">
      <h1 className="sr-only">Dashboard DominusPay</h1>
      <PeriodFilter value={period} onChange={changePeriod} />

      {kpis.error ? (
        <CardError onRetry={kpis.reload} />
      ) : !k ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpiSkeletons}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard featured icon={<ZapIcon />} title="Total de Starts" d7={String(k.starts.d7)} d30={String(k.starts.d30)}>
            {k.starts.atual}
          </KpiCard>
          <KpiCard icon={<DollarIcon />} title="Receita Gerada" d7={brl(k.receitaGerada.d7)} d30={brl(k.receitaGerada.d30)}>
            {brl(k.receitaGerada.atual)}
          </KpiCard>
          <KpiCard icon={<CartIcon />} title="Receita Confirmada" d7={brl(k.receitaConfirmada.d7)} d30={brl(k.receitaConfirmada.d30)}>
            {brl(k.receitaConfirmada.atual)}
          </KpiCard>
          <KpiCard icon={<TargetIcon />} title="Taxa de Conversão" d7={pct(k.conversao.d7)} d30={pct(k.conversao.d30)}>
            <ConversionGauge value={k.conversao.atual} noData={k.conversao.semDados} />
          </KpiCard>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {perf.error ? (
          <CardError onRetry={perf.reload} className="lg:col-span-2" />
        ) : !perf.data ? (
          <CardSkeleton className="lg:col-span-2" />
        ) : (
          <PerformanceChart data={perf.data} csvHref={`/api/dashboard/desempenho/export?periodo=${period}`} onRefresh={refreshAll} />
        )}

        {ranking.error ? (
          <CardError onRetry={ranking.reload} />
        ) : !ranking.data ? (
          <CardSkeleton />
        ) : (
          <TopPlayers data={ranking.data} onRefresh={ranking.reload} />
        )}

        {month.error ? (
          <CardError onRetry={month.reload} className="lg:col-span-3" />
        ) : !month.data ? (
          <CardSkeleton className="lg:col-span-3" />
        ) : (
          <ImportantMetrics data={month.data} />
        )}
      </div>
    </div>
  );
}
