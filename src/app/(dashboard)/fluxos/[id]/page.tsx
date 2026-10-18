import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { FlowEditor } from "@/components/product/flow-editor";
import { getFlow } from "@/server/actions/queries";
import { requireApproved } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Editar fluxo", robots: { index: false } };

export default async function FlowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await requireApproved();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getFlow(orgId, id);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/fluxos" className="text-sm text-steel-light underline-offset-4 hover:text-paper hover:underline">
        ← Meus Fluxos
      </Link>
      <h1 className="mt-2 mb-6 text-title font-semibold">Editor de fluxo</h1>
      <FlowEditor
        flowId={data.flow.id}
        initialName={data.flow.name}
        initialSteps={data.steps.map((s) => ({ kind: s.kind, config: s.config }))}
      />
    </div>
  );
}
