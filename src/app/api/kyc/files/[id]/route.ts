import { readFile } from "node:fs/promises";
import path from "node:path";

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { kycDocuments, organizationMembers } from "@/server/db/schema";
import { KYC_STORAGE_ROOT } from "@/server/kyc/service";

export const runtime = "nodejs";

/** Serve um documento KYC somente a membros ativos da organização dona dele. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const [doc] = await getDb()
    .select({ storageKey: kycDocuments.storageKey, mime: kycDocuments.detectedMimeType })
    .from(kycDocuments)
    .innerJoin(
      organizationMembers,
      and(
        eq(organizationMembers.organizationId, kycDocuments.organizationId),
        eq(organizationMembers.userId, user.id),
        eq(organizationMembers.status, "active"),
      ),
    )
    .where(eq(kycDocuments.id, id))
    .limit(1);
  if (!doc) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const resolved = path.resolve(KYC_STORAGE_ROOT, doc.storageKey);
  if (!resolved.startsWith(KYC_STORAGE_ROOT + path.sep)) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  try {
    const data = await readFile(resolved);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": doc.mime,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }
}
