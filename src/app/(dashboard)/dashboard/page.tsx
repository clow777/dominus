import type { Metadata } from "next";

import { DashboardPage } from "@/components/dash/dashboard-page";
import { parseDashPeriod } from "@/lib/dash-period";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  // O layout já barra quem não está autenticado ou aprovado.
  const period = parseDashPeriod((await searchParams).periodo);
  return <DashboardPage initialPeriod={period} />;
}
