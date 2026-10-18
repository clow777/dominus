import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { signInSchema } from "@/lib/validations/auth";
import { burnPasswordCheck, verifyPassword } from "@/server/auth/password";
import { createSession, isSameOrigin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { getHomePath } from "@/server/kyc/service";

export const runtime = "nodejs";

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const INVALID = { error: "E-mail ou senha incorretos." };

export async function POST(request: Request) {
  if (!(await isSameOrigin())) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });

  const parsed = signInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(INVALID, { status: 401 });
  const { email, password } = parsed.data;
  const db = getDb();

  const [user] = await db.select().from(users).where(eq(sql`lower(${users.email})`, email)).limit(1);
  if (!user) {
    await burnPasswordCheck(password);
    return NextResponse.json(INVALID, { status: 401 });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json({ error: "Conta temporariamente bloqueada. Tente novamente em alguns minutos." }, { status: 429 });
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failures = user.failedLoginCount + 1;
    await db
      .update(users)
      .set(
        failures >= MAX_FAILURES
          ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MS) }
          : { failedLoginCount: failures },
      )
      .where(eq(users.id, user.id));
    return NextResponse.json(INVALID, { status: 401 });
  }

  await db.update(users).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  return NextResponse.json({ redirectTo: await getHomePath(user.id) });
}
