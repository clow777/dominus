import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentUser } from "@/server/auth/session";
import { getHomePath } from "@/server/kyc/service";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect(await getHomePath(user.id));
  return (
    <AuthShell title="Criar conta" description="Cadastre-se e siga para a verificação de identidade.">
      <SignUpForm />
    </AuthShell>
  );
}
