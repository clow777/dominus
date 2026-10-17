import type { Metadata } from "next";

import { AccessPending } from "@/components/legal/access-pending";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function SignInPage() {
  return <AccessPending title="Entrar" />;
}
