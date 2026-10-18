"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApprovedForAction } from "@/server/auth/guard";
import { getDb } from "@/server/db/client";
import { paymentCustomers, paymentIntents, transactions } from "@/server/db/schema";

const uuid = z.string().uuid();

export interface CustomerPurchase {
  publicId: string;
  amount: number;
  status: string;
  createdAt: string;
}

/** Histórico de compras de um cliente da própria organização. */
export async function getCustomerHistory(customerId: string): Promise<{ ok: true; purchases: CustomerPurchase[] } | { ok: false; error: string }> {
  const { orgId } = await requireApprovedForAction();
  if (!uuid.safeParse(customerId).success) return { ok: false, error: "Cliente inválido." };
  const rows = await getDb()
    .select({ publicId: transactions.publicId, amount: transactions.amount, status: transactions.status, createdAt: transactions.createdAt })
    .from(transactions)
    .innerJoin(paymentIntents, eq(paymentIntents.id, transactions.paymentIntentId))
    .innerJoin(paymentCustomers, eq(paymentCustomers.id, paymentIntents.customerId))
    .where(and(eq(paymentCustomers.id, customerId), eq(paymentCustomers.organizationId, orgId), eq(transactions.organizationId, orgId), eq(transactions.mode, "live")))
    .orderBy(desc(transactions.createdAt))
    .limit(50);
  return { ok: true, purchases: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) };
}

export async function setCustomerBlocked(customerId: string, blocked: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const { orgId } = await requireApprovedForAction();
  if (!uuid.safeParse(customerId).success) return { ok: false, error: "Cliente inválido." };
  const updated = await getDb()
    .update(paymentCustomers)
    .set({ blocked: blocked === true, updatedAt: new Date() })
    .where(and(eq(paymentCustomers.id, customerId), eq(paymentCustomers.organizationId, orgId)))
    .returning({ id: paymentCustomers.id });
  if (updated.length === 0) return { ok: false, error: "Cliente não encontrado." };
  revalidatePath("/clientes");
  return { ok: true };
}
