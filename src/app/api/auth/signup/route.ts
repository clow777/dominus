import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { signUpSchema } from "@/lib/validations/auth";
import { hashPassword } from "@/server/auth/password";
import { createSession, isSameOrigin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { kycCases, organizationMembers, organizations, roles, users } from "@/server/db/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isSameOrigin())) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const { name, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  const db = getDb();

  try {
    const userId = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ name, email, passwordHash }).returning({ id: users.id });
      const [org] = await tx
        .insert(organizations)
        .values({ publicId: `org_${randomBytes(12).toString("hex")}`, name, accountType: "individual" })
        .returning({ id: organizations.id });

      await tx
        .insert(roles)
        .values({ key: "owner", name: "Proprietário", scope: "organization" })
        .onConflictDoNothing({ target: roles.key });
      const [owner] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, "owner"));

      await tx
        .insert(organizationMembers)
        .values({ organizationId: org!.id, userId: user!.id, roleId: owner!.id, status: "active" });
      await tx.insert(kycCases).values({ organizationId: org!.id, accountType: "individual" });
      return user!.id;
    });

    await createSession(userId);
    return NextResponse.json({ redirectTo: "/kyc" }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string; cause?: { code?: string } }).code === "23505" ||
      (error as { cause?: { code?: string } }).cause?.code === "23505") {
      return NextResponse.json({ error: "Não foi possível criar a conta com esses dados." }, { status: 409 });
    }
    console.error("signup failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
