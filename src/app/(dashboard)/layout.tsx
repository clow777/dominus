import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { brl } from "@/components/dashboard/format";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { getCurrentUser } from "@/server/auth/session";
import { getBalance } from "@/server/actions/dashboard";
import { getApprovedVolume, getOrgRank, getProfile } from "@/server/actions/queries";
import { getKycState } from "@/server/kyc/service";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const kyc = await getKycState(user.id);
  if (kyc?.status !== "approved") redirect("/kyc");
  const [balance, revenue, profile] = await Promise.all([
    getBalance(kyc.organizationId),
    getApprovedVolume(kyc.organizationId),
    getProfile(user.id),
  ]);
  const rank = await getOrgRank(revenue);

  return (
    <div className="theme-ruby flex min-h-svh bg-black text-white">
      <DashboardSidebar userName={user.name} balance={brl(balance)} revenue={brl(revenue)} rank={rank} avatarUrl={profile.avatarUrl} />
      <main id="conteudo" className="min-w-0 flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
