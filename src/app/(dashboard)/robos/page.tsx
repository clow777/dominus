import type { Metadata } from "next";

import { BotsView } from "@/components/bots/bots-view";
import { BOT_LIMIT } from "@/lib/bots";
import { listFlows } from "@/server/actions/queries";
import { requireApproved } from "@/server/auth/guard";
import { listBots } from "@/server/telegram/bots";
import { listRecentCampaigns } from "@/server/telegram/campaigns";

export const metadata: Metadata = { title: "Meus Robôs", robots: { index: false } };

export default async function RobosPage() {
  const { orgId } = await requireApproved();
  const [bots, flows, campaigns] = await Promise.all([listBots(orgId), listFlows(orgId), listRecentCampaigns(orgId)]);

  return (
    <BotsView
      bots={bots}
      limit={BOT_LIMIT}
      flows={flows.map((f) => ({ id: f.id, name: f.name }))}
      campaigns={campaigns.map((c) => ({ ...c, scheduledAt: c.scheduledAt.toISOString() }))}
    />
  );
}
