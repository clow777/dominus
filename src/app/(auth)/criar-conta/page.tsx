import type { Metadata } from "next";

import { AccessPending } from "@/components/legal/access-pending";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default function SignUpPage() {
  return <AccessPending title="Criar conta" />;
}
