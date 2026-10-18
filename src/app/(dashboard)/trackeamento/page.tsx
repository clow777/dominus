import type { Metadata } from "next";

import { Panel } from "@/components/dashboard/dashboard-grid";
import { TrackingControls } from "@/components/product/tracking-controls";
import { TRACKING_PLATFORMS } from "@/lib/preferences";
import { getTrackingStates } from "@/server/actions/queries";
import { requireApproved } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Trackeamento", robots: { index: false } };

export default async function TrackingPage() {
  const { orgId } = await requireApproved();
  const states = await getTrackingStates(orgId);
  const list = Object.values(states);
  const activeConfigs = list.filter((s) => s.enabled).length;
  const eventsSent = list.reduce((sum, s) => sum + s.eventsSent, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-title font-semibold">Pixel e conversão</h1>
      <p className="mb-6 text-sm text-steel">Trackeamento</p>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Panel title="Configs ativas"><p className="text-3xl font-semibold">{activeConfigs}</p></Panel>
        <Panel title="Eventos enviados"><p className="text-3xl font-semibold">{eventsSent}</p></Panel>
        <Panel title="Plataformas usadas"><p className="text-3xl font-semibold">{list.filter((s) => s.configured).length}</p></Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TRACKING_PLATFORMS.map((p) => {
          const s = states[p.key];
          return (
            <Panel key={p.key} title={p.name}>
              <p className="mb-4 text-sm text-steel">{p.description}</p>
              <TrackingControls platform={p.key} name={p.name} field={p.field} enabled={s?.enabled ?? false} configured={s?.configured ?? false} />
            </Panel>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-steel">A configuração é salva e pode ser ativada agora; o envio de eventos aos provedores será habilitado em uma próxima etapa.</p>
    </div>
  );
}
