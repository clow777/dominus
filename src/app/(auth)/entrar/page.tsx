import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/server/auth/session";
import { getHomePath } from "@/server/kyc/service";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect(await getHomePath(user.id));
  return (
    <AuthShell title="Entrar">
      <SignInForm />
    </AuthShell>
  );
}
