import type { Metadata } from "next";

import { CustomersView } from "@/components/product/customers-view";
import { requireApproved } from "@/server/auth/guard";
import { listCustomers } from "@/server/actions/dashboard";

export const metadata: Metadata = { title: "Clientes", robots: { index: false } };
export const dynamic = "force-dynamic";

const currentTime = () => Date.now();

export default async function CustomersPage() {
  const { orgId } = await requireApproved();
  const rows = await listCustomers(orgId);
  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    createdAt: r.createdAt.toISOString(),
    blocked: r.blocked,
    volume: r.volume,
    approvedCount: r.approvedCount,
    lastPurchaseAt: r.lastPurchaseAt?.toISOString() ?? null,
  }));
  return <CustomersView customers={items} approvedTransactions={rows.reduce((s, r) => s + r.approvedCount, 0)} now={currentTime()} />;
}
