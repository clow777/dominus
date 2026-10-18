import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { brl, formatDateTime, METHOD_LABELS } from "@/components/dashboard/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/server/auth/session";
import { getTransaction } from "@/server/actions/dashboard";
import { getKycState } from "@/server/kyc/service";

export const metadata: Metadata = { title: "Transação", robots: { index: false } };

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const kyc = (await getKycState(user.id))!;
  // A consulta filtra pela organização do usuário: ids de outras contas retornam 404.
  const t = await getTransaction(kyc.organizationId, id);
  if (!t) notFound();

  const rows: [string, string][] = [
    ["Método", METHOD_LABELS[t.method]],
    ["Cliente", t.customerName ? `${t.customerName}${t.customerEmail ? ` · ${t.customerEmail}` : ""}` : "—"],
    ["Descrição", t.description ?? "—"],
    ["Valor", brl(t.amount)],
    ["Tarifa", t.feeAmount === null ? "—" : brl(t.feeAmount)],
    ["Líquido", t.netAmount === null ? "—" : brl(t.netAmount)],
    ["Reembolsado", brl(t.refundedAmount)],
    ["Provedor", t.provider],
    ["Modo", t.mode === "live" ? "Produção" : "Teste"],
    ["Criada em", formatDateTime(t.createdAt)],
    ["Aprovada em", t.approvedAt ? formatDateTime(t.approvedAt) : "—"],
    ["Motivo da falha", t.failureReason ?? "—"],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/transacoes" className="text-sm text-steel-light hover:text-paper">
        ← Transações
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title font-semibold">{t.publicId}</h1>
        <StatusBadge status={t.status} />
      </div>
      <dl className="mt-6 divide-y divide-line rounded-lg border border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-steel">{k}</dt>
            <dd className="text-right text-paper">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
