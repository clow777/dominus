import type { Metadata } from "next";
import Link from "next/link";

import { brl, formatDateTime, METHOD_LABELS } from "@/components/dashboard/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/server/auth/session";
import { listTransactions } from "@/server/actions/dashboard";
import { getKycState } from "@/server/kyc/service";

export const metadata: Metadata = { title: "Transações", robots: { index: false } };

export default async function TransactionsPage() {
  const user = (await getCurrentUser())!;
  const kyc = (await getKycState(user.id))!;
  const rows = await listTransactions(kyc.organizationId);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-title font-semibold">Transações</h1>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-line p-10 text-center text-sm text-steel">Nenhuma transação ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-steel">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-ink-2">
                  <td className="px-4 py-3">
                    <Link href={`/transacoes/${t.publicId}`} className="text-paper underline-offset-4 hover:underline">
                      {t.publicId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-steel-light">{t.customerName ?? "—"}</td>
                  <td className="px-4 py-3 text-steel-light">{METHOD_LABELS[t.method]}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-paper">{brl(t.amount)}</td>
                  <td className="px-4 py-3 text-steel-light">{formatDateTime(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
