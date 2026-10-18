import type { Metadata } from "next";
import Link from "next/link";

import { Panel } from "@/components/dashboard/dashboard-grid";
import { DeleteFlowButton, FlowActions } from "@/components/product/flow-actions";
import { grayButton } from "@/components/product/styles";
import { FLOW_LIMIT } from "@/lib/preferences";
import { listFlows } from "@/server/actions/queries";
import { requireApproved } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Meus Fluxos", robots: { index: false } };

export default async function FlowsPage() {
  const { orgId } = await requireApproved();
  const flows = await listFlows(orgId);
  const linked = flows.filter((f) => f.botId).length;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold">Meus Fluxos</h1>
          <p className="text-sm text-steel">Gerencie seus fluxos de automação e chatbots</p>
        </div>
        <FlowActions count={flows.length} limit={FLOW_LIMIT} />
      </header>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Panel title="Fluxos Vinculados"><p className="text-3xl font-semibold">{linked}</p></Panel>
        <Panel title="Fluxos Básicos"><p className="text-3xl font-semibold">{flows.filter((f) => f.kind === "basic").length}</p></Panel>
        <Panel title="Fluxos Avançados"><p className="text-3xl font-semibold">{flows.filter((f) => f.kind === "advanced").length}</p></Panel>
      </div>

      {flows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong p-12 text-center text-sm text-steel">
          Nenhum fluxo configurado. Crie ou importe o primeiro.
        </p>
      ) : (
        <ul className="grid gap-3">
          {flows.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink-2/60 p-4">
              <span>
                <span className="block font-medium">{f.name}</span>
                <span className="text-xs text-steel">
                  {f.kind === "advanced" ? "Avançado" : "Básico"} · {f.steps} passos · {f.status === "active" ? "Ativo" : "Rascunho"}
                </span>
              </span>
              <span className="flex gap-2">
                <Link href={`/fluxos/${f.id}`} className={grayButton}>Editar</Link>
                <DeleteFlowButton id={f.id} name={f.name} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
