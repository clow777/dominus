import type { Metadata } from "next";

import { AwardsBoard } from "@/components/product/awards-board";
import { getApprovedVolume, getMonthlyRevenue } from "@/server/actions/queries";
import { requireApproved } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Premiações", robots: { index: false } };

export default async function AwardsPage() {
  const { orgId } = await requireApproved();
  const [volume, monthly] = await Promise.all([getApprovedVolume(orgId), getMonthlyRevenue(orgId)]);
  return <AwardsBoard volume={volume} months={monthly.map((m) => ({ month: m.month, volume: m.volume }))} />;
}
