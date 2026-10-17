import { StatusBadge } from "@/components/ui/status-badge";
import { cents, formatMoney } from "@/lib/money";
import type { TransactionStatus } from "@/server/domain/transactions/state-machine";

/*
 * Ilustração do painel para a landing page. Valores fictícios, identificados
 * como tal na legenda. O painel real (Fase 5) lê tudo do backend.
 */

const KPIS = [
  { label: "Volume bruto processado", value: formatMoney(cents(18_432_050)), note: "Soma das transações aprovadas" },
  { label: "Transações", value: "1.284", note: "Criadas no período" },
  { label: "Taxa de aprovação", value: "92,4%", note: "Aprovadas ÷ tentativas concluídas" },
  { label: "Ticket médio", value: formatMoney(cents(14_355)), note: "Volume ÷ aprovadas" },
] as const;

const ROWS: { id: string; customer: string; method: string; amount: number; status: TransactionStatus }[] = [
  { id: "txn_8f2a", customer: "Cliente A", method: "Pix", amount: 24_900, status: "approved" },
  { id: "txn_8f29", customer: "Cliente B", method: "Cartão de crédito", amount: 118_000, status: "processing" },
  { id: "txn_8f27", customer: "Cliente C", method: "Boleto", amount: 45_990, status: "awaiting_payment" },
  { id: "txn_8f24", customer: "Cliente D", method: "Pix", amount: 9_900, status: "partially_refunded" },
];

// Série diária fictícia (centavos) para o gráfico de volume.
const SERIES = [41, 38, 52, 47, 61, 58, 66, 72, 64, 79, 83, 77, 91, 88];

function areaPath(values: number[], w: number, h: number) {
  const max = Math.max(...values) * 1.1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - (v / max) * h] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return { line, area: `${line} L${w} ${h} L0 ${h} Z` };
}

export function DashboardPreview() {
  const { line, area } = areaPath(SERIES, 600, 120);
  return (
    <figure className="m-0">
      <div className="overflow-hidden rounded-lg border border-line bg-ink-2 shadow-(--shadow-raise)">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="text-sm font-medium text-paper">Visão geral</p>
          <p className="text-[0.8125rem] text-steel">Últimos 14 dias</p>
        </div>

        <dl className="grid grid-cols-2 border-b border-line sm:grid-cols-4">
          {KPIS.map((k, i) => (
            <div
              key={k.label}
              className={`px-5 py-4 ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""} border-line`}
            >
              <dt className="text-[0.75rem] text-steel">{k.label}</dt>
              <dd className="tabular mt-1.5 text-[1.0625rem] font-semibold tracking-tight text-paper">{k.value}</dd>
              <dd className="mt-1 text-[0.6875rem] leading-snug text-steel">{k.note}</dd>
            </div>
          ))}
        </dl>

        <div className="px-5 pt-5 pb-3">
          <svg viewBox="0 0 600 120" className="h-28 w-full" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="dash-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[30, 60, 90].map((y) => (
              <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#262626" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={area} fill="url(#dash-area)" />
            <path d={line} fill="none" stroke="#f5f5f5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[0.8125rem]">
            <thead className="text-steel">
              <tr className="border-y border-line">
                <th scope="col" className="px-5 py-2.5 font-normal">Transação</th>
                <th scope="col" className="px-5 py-2.5 font-normal">Método</th>
                <th scope="col" className="px-5 py-2.5 font-normal">Status</th>
                <th scope="col" className="px-5 py-2.5 text-right font-normal">Valor</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3">
                    <span className="text-paper">{r.customer}</span>
                    <span className="ml-2 text-steel">{r.id}</span>
                  </td>
                  <td className="px-5 py-3 text-steel-light">{r.method}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="tabular px-5 py-3 text-right text-paper">{formatMoney(cents(r.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <figcaption className="mt-3 text-[0.8125rem] text-steel">
        Ilustração da interface com valores fictícios.
      </figcaption>
    </figure>
  );
}
