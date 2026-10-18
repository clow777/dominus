import type { Metadata } from "next";

import { DpCard } from "@/components/dash/card";
import { brl, rank } from "@/lib/format";
import { requireApproved } from "@/server/auth/guard";
import { getRanking } from "@/server/dash/metrics";

export const metadata: Metadata = { title: "Ranking de Vendas", robots: { index: false } };

export default async function RankingPage() {
  const { orgId } = await requireApproved();
  const { top, voce } = await getRanking(orgId, 50);
  return (
    <div className="mx-auto max-w-3xl font-inter">
      <h1 className="text-title font-semibold">Ranking de Vendas</h1>
      <p className="mb-6 text-sm text-dp-muted">Receita confirmada no mês corrente. Sua posição: {rank(voce.posicao)} · {brl(voce.valor)}</p>
      <DpCard>
        {top.length === 0 ? (
          <p className="py-8 text-center text-sm text-dp-muted">Sem vendas confirmadas no mês.</p>
        ) : (
          <ol className="divide-y divide-dp-divider">
            {top.map((p) => (
              <li key={p.posicao} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="font-jb text-xs text-dp-dim">{rank(p.posicao)}</span>
                <span className="min-w-0 flex-1 truncate font-bold uppercase">{p.nome}</span>
                <span className="font-jb font-bold text-dp-primary">{brl(p.valor)}</span>
              </li>
            ))}
          </ol>
        )}
      </DpCard>
    </div>
  );
}
