import type { Metadata } from "next";

import { Panel } from "@/components/dashboard/dashboard-grid";
import { redButton } from "@/components/product/styles";
import { getPixStatus24h } from "@/server/actions/queries";
import { requireApproved } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Status PIX", robots: { index: false } };

const DOWNDETECTOR_URL = "https://downdetector.com.br/fora-do-ar/pix/";

export default async function PixStatusPage() {
  const { orgId } = await requireApproved();
  const s = await getPixStatus24h(orgId);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-title font-semibold">Status PIX</h1>

      <Panel
        title="Status do PIX nacional"
        className="mb-4"
        action={
          <a href={DOWNDETECTOR_URL} target="_blank" rel="noopener noreferrer" className={redButton}>
            Abrir Downdetector
          </a>
        }
      >
        <p className="text-sm text-steel">Verifique no Downdetector se há instabilidade no PIX em todo o país.</p>
      </Panel>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel title="Operacionais"><p className="text-3xl font-semibold">{s.ok}</p></Panel>
        <Panel title="Instáveis"><p className="text-3xl font-semibold">{s.unstable}</p></Panel>
        <Panel title="Fora do Ar"><p className="text-3xl font-semibold">{s.down}</p></Panel>
        <Panel title="Conversão 24h"><p className="text-3xl font-semibold">{s.conversion.toFixed(1).replace(".", ",")}%</p></Panel>
      </div>

      <Panel title="Transações PIX (24h)">
        <p className="py-8 text-center text-sm text-steel">
          {s.total === 0 ? "Nenhuma transação nas últimas 24h." : `${s.total} transações PIX nas últimas 24h.`}
        </p>
      </Panel>
    </div>
  );
}
