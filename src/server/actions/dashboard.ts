import "server-only";

import { and, count, desc, eq, gte, lt, sql, sum, type SQL } from "drizzle-orm";

import { clubProgress, type ClubProgress } from "@/lib/club";
import { periodRange, type Period } from "@/lib/period";
import { getDb } from "@/server/db/client";
import { ledgerAccounts, ledgerEntries, paymentCustomers, paymentIntents, transactions } from "@/server/db/schema";
import { getActivity } from "@/server/actions/queries";
import { getKycState } from "@/server/kyc/service";

/** Conta do livro-razão que representa o saldo a receber do lojista. */
const BALANCE_ACCOUNT = "merchant_payable";

const num = (value: string | number | null | undefined) => Number(value ?? 0);

export interface TransactionRow {
  id: string;
  publicId: string;
  customerName: string | null;
  amount: number;
  method: "pix" | "credit_card" | "debit_card" | "boleto";
  status: (typeof transactions.$inferSelect)["status"];
  createdAt: Date;
}

export interface TopCustomer {
  id: string;
  name: string;
  email: string | null;
  volume: number;
  transactions: number;
}

export interface DashboardStats {
  period: Period;
  approvedVolume: number;
  totalTransactions: number;
  approvedTransactions: number;
  /** 0–100; 0 quando não há transações. */
  approvalRate: number;
  averageTicket: number;
  balance: number;
  allTimeApprovedVolume: number;
  club: ClubProgress;
  recent: TransactionRow[];
  topCustomers: TopCustomer[];
  activity: { leads: number; pixGenerated: number; payments: number; revenue: number };
}

const transactionRow = {
  id: transactions.id,
  publicId: transactions.publicId,
  customerName: paymentCustomers.name,
  amount: transactions.amount,
  method: transactions.method,
  status: transactions.status,
  createdAt: transactions.createdAt,
};

/** Saldo disponível: créditos − débitos da conta `merchant_payable` da organização. */
export async function getBalance(organizationId: string): Promise<number> {
  const [row] = await getDb()
    .select({
      balance: sql<string>`coalesce(sum(case when ${ledgerEntries.direction} = 'credit' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end), 0)`,
    })
    .from(ledgerEntries)
    .innerJoin(ledgerAccounts, eq(ledgerAccounts.id, ledgerEntries.accountId))
    .where(and(eq(ledgerEntries.organizationId, organizationId), eq(ledgerAccounts.code, BALANCE_ACCOUNT)));
  return num(row?.balance);
}

/** Estatísticas da organização do usuário. Só considera transações em modo `live`. */
export async function getDashboardStats(userId: string, period: Period): Promise<DashboardStats> {
  const state = await getKycState(userId);
  if (!state) throw new Error("Usuário sem organização.");
  const orgId = state.organizationId;
  const db = getDb();

  const { start, end } = periodRange(period);
  const base: SQL[] = [eq(transactions.organizationId, orgId), eq(transactions.mode, "live")];
  const inRange: SQL[] = [...base];
  if (start) inRange.push(gte(transactions.createdAt, start));
  if (end) inRange.push(lt(transactions.createdAt, end));
  const approved = eq(transactions.status, "approved");

  const [totals, allTime, recent, top, balance, activity] = await Promise.all([
    db
      .select({
        total: count(),
        approvedCount: sql<string>`count(*) filter (where ${transactions.status} = 'approved')`,
        volume: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.status} = 'approved'), 0)`,
        ticket: sql<string>`coalesce(avg(${transactions.amount}) filter (where ${transactions.status} = 'approved'), 0)`,
      })
      .from(transactions)
      .where(and(...inRange)),
    db
      .select({ volume: sum(transactions.amount) })
      .from(transactions)
      .where(and(...base, approved)),
    db
      .select(transactionRow)
      .from(transactions)
      .innerJoin(paymentIntents, eq(paymentIntents.id, transactions.paymentIntentId))
      .leftJoin(paymentCustomers, eq(paymentCustomers.id, paymentIntents.customerId))
      .where(and(...inRange))
      .orderBy(desc(transactions.createdAt))
      .limit(30),
    db
      .select({
        id: paymentCustomers.id,
        name: paymentCustomers.name,
        email: paymentCustomers.email,
        volume: sum(transactions.amount),
        transactions: count(),
      })
      .from(transactions)
      .innerJoin(paymentIntents, eq(paymentIntents.id, transactions.paymentIntentId))
      .innerJoin(paymentCustomers, eq(paymentCustomers.id, paymentIntents.customerId))
      .where(and(...inRange, approved))
      .groupBy(paymentCustomers.id)
      .orderBy(desc(sum(transactions.amount)))
      .limit(5),
    getBalance(orgId),
    getActivity(orgId, period),
  ]);

  const t = totals[0];
  const total = t?.total ?? 0;
  const approvedCount = num(t?.approvedCount);
  const allTimeVolume = num(allTime[0]?.volume);

  return {
    period,
    approvedVolume: num(t?.volume),
    totalTransactions: total,
    approvedTransactions: approvedCount,
    approvalRate: total === 0 ? 0 : (approvedCount / total) * 100,
    averageTicket: Math.round(num(t?.ticket)),
    balance,
    allTimeApprovedVolume: allTimeVolume,
    club: clubProgress(allTimeVolume),
    recent,
    topCustomers: top.map((c) => ({ ...c, volume: num(c.volume) })),
    activity,
  };
}

export async function listTransactions(organizationId: string, limit = 100): Promise<TransactionRow[]> {
  return getDb()
    .select(transactionRow)
    .from(transactions)
    .innerJoin(paymentIntents, eq(paymentIntents.id, transactions.paymentIntentId))
    .leftJoin(paymentCustomers, eq(paymentCustomers.id, paymentIntents.customerId))
    .where(eq(transactions.organizationId, organizationId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

export async function getTransaction(organizationId: string, publicId: string) {
  const [row] = await getDb()
    .select({
      publicId: transactions.publicId,
      provider: transactions.provider,
      mode: transactions.mode,
      method: transactions.method,
      status: transactions.status,
      amount: transactions.amount,
      feeAmount: transactions.feeAmount,
      netAmount: transactions.netAmount,
      refundedAmount: transactions.refundedAmount,
      failureReason: transactions.failureReason,
      approvedAt: transactions.approvedAt,
      createdAt: transactions.createdAt,
      description: paymentIntents.description,
      customerName: paymentCustomers.name,
      customerEmail: paymentCustomers.email,
    })
    .from(transactions)
    .innerJoin(paymentIntents, eq(paymentIntents.id, transactions.paymentIntentId))
    .leftJoin(paymentCustomers, eq(paymentCustomers.id, paymentIntents.customerId))
    .where(and(eq(transactions.organizationId, organizationId), eq(transactions.publicId, publicId)))
    .limit(1);
  return row ?? null;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  createdAt: Date;
  blocked: boolean;
  volume: number;
  approvedCount: number;
  lastPurchaseAt: Date | null;
}

/** Clientes da organização com totais de compras aprovadas (modo live). */
export async function listCustomers(organizationId: string): Promise<CustomerRow[]> {
  const rows = await getDb()
    .select({
      id: paymentCustomers.id,
      name: paymentCustomers.name,
      email: paymentCustomers.email,
      createdAt: paymentCustomers.createdAt,
      blocked: paymentCustomers.blocked,
      volume: sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.status} = 'approved'), 0)`,
      approvedCount: sql<string>`count(${transactions.id}) filter (where ${transactions.status} = 'approved')`,
      lastMs: sql<string | null>`floor(extract(epoch from max(coalesce(${transactions.approvedAt}, ${transactions.createdAt})) filter (where ${transactions.status} = 'approved')) * 1000)`,
    })
    .from(paymentCustomers)
    .leftJoin(paymentIntents, eq(paymentIntents.customerId, paymentCustomers.id))
    .leftJoin(transactions, and(eq(transactions.paymentIntentId, paymentIntents.id), eq(transactions.mode, "live")))
    .where(eq(paymentCustomers.organizationId, organizationId))
    .groupBy(paymentCustomers.id)
    .orderBy(desc(paymentCustomers.createdAt))
    .limit(500);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    createdAt: r.createdAt,
    blocked: r.blocked,
    volume: num(r.volume),
    approvedCount: num(r.approvedCount),
    lastPurchaseAt: r.lastMs ? new Date(Number(r.lastMs)) : null,
  }));
}
