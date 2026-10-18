import { and, eq, isNull, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { formatCPF } from "@/lib/validations/cpf";
import { kycFieldsSchema } from "@/lib/validations/kyc";
import { getCurrentUser, isSameOrigin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { kycCases, kycDocuments } from "@/server/db/schema";
import { getKycState, KycFileError, removeStoredFiles, storeKycFile, type StoredFile } from "@/server/kyc/service";

export const runtime = "nodejs";

const FILE_FIELDS = [
  { field: "front", kind: "identity_front", label: "Frente do documento" },
  { field: "back", kind: "identity_back", label: "Verso do documento" },
  { field: "selfie", kind: "selfie", label: "Selfie" },
] as const;

export async function POST(request: Request) {
  if (!(await isSameOrigin())) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const state = await getKycState(user.id);
  if (!state) return NextResponse.json({ error: "Conta sem organização." }, { status: 409 });
  if (!state.canSubmit) {
    return NextResponse.json({ error: "Já existe uma verificação em análise ou aprovada.", status: state.status }, { status: 409 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const fields = kycFieldsSchema.safeParse({ documentType: form.get("documentType"), cpf: form.get("cpf") });
  if (!fields.success) {
    return NextResponse.json({ error: "Dados inválidos.", fields: fields.error.flatten().fieldErrors }, { status: 422 });
  }

  const stored: StoredFile[] = [];
  try {
    for (const { field, kind, label } of FILE_FIELDS) {
      const file = form.get(field);
      if (!(file instanceof File)) throw new KycFileError(`${label}: envie um arquivo.`);
      stored.push(await storeKycFile(user.id, kind, file, label));
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      // Trava o caso para que dois envios simultâneos não passem pela verificação de status.
      const [current] = await tx
        .select({ status: kycCases.status })
        .from(kycCases)
        .where(eq(kycCases.id, state.caseId))
        .for("update");
      if (current?.status !== "not_started" && current?.status !== "rejected") throw new KycFileError("ALREADY_SUBMITTED");

      for (const file of stored) {
        const [doc] = await tx
          .insert(kycDocuments)
          .values({
            organizationId: state.organizationId,
            caseId: state.caseId,
            type: file.kind,
            storageKey: file.storageKey,
            detectedMimeType: file.mime,
            sizeBytes: file.size,
            sha256: file.sha256,
            uploadedByUserId: user.id,
          })
          .returning({ id: kycDocuments.id });
        await tx
          .update(kycDocuments)
          .set({ supersededById: doc!.id })
          .where(
            and(
              eq(kycDocuments.caseId, state.caseId),
              eq(kycDocuments.type, file.kind),
              isNull(kycDocuments.supersededById),
              ne(kycDocuments.id, doc!.id),
            ),
          );
      }

      await tx
        .update(kycCases)
        .set({
          status: "under_review",
          currentStep: 3,
          submittedAt: new Date(),
          decidedAt: null,
          profile: { cpf: formatCPF(fields.data.cpf), documentType: fields.data.documentType },
        })
        .where(eq(kycCases.id, state.caseId));
    });

    return NextResponse.json({ status: "pending" as const }, { status: 201 });
  } catch (error) {
    await removeStoredFiles(stored);
    if (error instanceof KycFileError) {
      if (error.message === "ALREADY_SUBMITTED") {
        return NextResponse.json({ error: "Já existe uma verificação em análise ou aprovada." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("kyc submit failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
