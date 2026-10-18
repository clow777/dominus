import type { Metadata } from "next";

import { getCurrentUser } from "@/server/auth/session";
import { getKycState } from "@/server/kyc/service";

export const metadata: Metadata = { title: "Pendências KYC", robots: { index: false } };

const LABELS = { not_started: "Não iniciado", pending: "Em análise", approved: "Aprovado", rejected: "Recusado" } as const;

export default async function KycPendingPage() {
  const user = (await getCurrentUser())!;
  const kyc = (await getKycState(user.id))!;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-title font-semibold">Pendências KYC</h1>
      <div className="rounded-lg border border-line p-5">
        <p className="text-sm text-steel">Verificação de identidade</p>
        <p className="mt-1 text-xl font-semibold text-paper">{LABELS[kyc.status]}</p>
        <p className="mt-3 text-sm text-steel-light">Não há pendências. Sua conta está liberada para operar.</p>
      </div>
    </div>
  );
}
