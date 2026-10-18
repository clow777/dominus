import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { KycForm } from "@/components/kyc/kyc-form";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/session";
import { getKycState } from "@/server/kyc/service";

export const metadata: Metadata = { title: "Verificação de identidade", robots: { index: false } };

export default async function KycPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const state = await getKycState(user.id);
  if (!state) redirect("/entrar");

  if (state.status === "pending") {
    return (
      <AuthShell title="Em análise" description="Recebemos seus documentos. Nossa equipe está analisando e você será avisado quando houver uma decisão.">
        <ButtonLink href="/" variant="secondary">
          Voltar ao início
        </ButtonLink>
      </AuthShell>
    );
  }

  if (state.status === "approved") redirect("/dashboard");

  return (
    <AuthShell title="Verificação de identidade" description="Precisamos confirmar quem você é antes de liberar a conta." wide>
      <KycForm rejectionReason={state.rejectionReason} />
    </AuthShell>
  );
}
