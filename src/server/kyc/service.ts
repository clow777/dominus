import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { and, desc, eq } from "drizzle-orm";

import { KYC_MAX_FILE_BYTES } from "@/lib/validations/kyc";
import { getDb } from "@/server/db/client";
import { kycCases, kycReviews, organizationMembers } from "@/server/db/schema";

/** Armazenamento privado, fora de public/. Os arquivos só saem por /api/kyc/files/[id]. */
export const KYC_STORAGE_ROOT = path.join(process.cwd(), "uploads-privados");

export type KycUiStatus = "not_started" | "pending" | "approved" | "rejected";

export interface KycState {
  caseId: string;
  organizationId: string;
  status: KycUiStatus;
  canSubmit: boolean;
  rejectionReason: string | null;
}

/** Estados do caso (9 valores) agrupados nos 4 que a interface mostra. */
function toUiStatus(status: (typeof kycCases.$inferSelect)["status"]): KycUiStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "under_review":
    case "suspended":
    case "reassessment_required":
      return "pending";
    default:
      return "not_started";
  }
}

export async function getKycState(userId: string): Promise<KycState | null> {
  const db = getDb();
  const [row] = await db
    .select({ caseId: kycCases.id, organizationId: kycCases.organizationId, status: kycCases.status })
    .from(organizationMembers)
    .innerJoin(kycCases, eq(kycCases.organizationId, organizationMembers.organizationId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
    .orderBy(organizationMembers.createdAt)
    .limit(1);
  if (!row) return null;

  const status = toUiStatus(row.status);
  let rejectionReason: string | null = null;
  if (status === "rejected") {
    const [review] = await db
      .select({ justification: kycReviews.justification })
      .from(kycReviews)
      .where(and(eq(kycReviews.caseId, row.caseId), eq(kycReviews.decision, "reject")))
      .orderBy(desc(kycReviews.createdAt))
      .limit(1);
    rejectionReason = review?.justification ?? null;
  }

  return {
    caseId: row.caseId,
    organizationId: row.organizationId,
    status,
    canSubmit: status === "not_started" || status === "rejected",
    rejectionReason,
  };
}

/** Destino padrão de quem está autenticado: painel se o KYC foi aprovado, verificação caso contrário. */
export async function getHomePath(userId: string): Promise<"/dashboard" | "/kyc"> {
  const state = await getKycState(userId);
  return state?.status === "approved" ? "/dashboard" : "/kyc";
}

export type DetectedImage = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

/** Identifica o formato pelos bytes (magic number); o Content-Type enviado pelo cliente não é confiável. */
export function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (bytes.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) {
    return { mime: "image/png", ext: "png" };
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export type KycFileKind = "identity_front" | "identity_back" | "selfie";

export interface StoredFile {
  kind: KycFileKind;
  storageKey: string;
  mime: DetectedImage["mime"];
  size: number;
  sha256: string;
}

export class KycFileError extends Error {}

/** Valida e grava um arquivo. Lança KycFileError com mensagem segura para o usuário. */
export async function storeKycFile(userId: string, kind: KycFileKind, file: File, label: string): Promise<StoredFile> {
  if (file.size === 0) throw new KycFileError(`${label}: arquivo vazio.`);
  if (file.size > KYC_MAX_FILE_BYTES) throw new KycFileError(`${label}: o arquivo deve ter no máximo 5 MB.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = detectImage(bytes);
  if (!image) throw new KycFileError(`${label}: use JPG, PNG ou WebP.`);

  const storageKey = `kyc/${userId}/${randomUUID()}.${image.ext}`;
  const target = path.join(KYC_STORAGE_ROOT, storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
  return { kind, storageKey, mime: image.mime, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

export async function removeStoredFiles(files: StoredFile[]): Promise<void> {
  await Promise.all(files.map((f) => rm(path.join(KYC_STORAGE_ROOT, f.storageKey), { force: true })));
}
