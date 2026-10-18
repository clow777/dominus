import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, isSameOrigin, type CurrentUser } from "@/server/auth/session";
import { getKycState } from "@/server/kyc/service";

export interface ApprovedContext {
  user: CurrentUser;
  orgId: string;
}

/** Exige login e KYC aprovado; caso contrário redireciona. Usado por páginas e server actions. */
export async function requireApproved(): Promise<ApprovedContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const kyc = await getKycState(user.id);
  if (kyc?.status !== "approved") redirect("/kyc");
  return { user, orgId: kyc.organizationId };
}

/** Variante para server actions: valida a origem antes de aceitar a mutação. */
export async function requireApprovedForAction(): Promise<ApprovedContext> {
  if (!(await isSameOrigin())) throw new Error("Origem inválida.");
  return requireApproved();
}
