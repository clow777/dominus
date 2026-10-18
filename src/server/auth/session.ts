import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";

import { getDb } from "@/server/db/client";
import { sessions, users } from "@/server/db/schema";
import { serverEnv } from "@/server/env";

import { SESSION_COOKIE } from "./cookie-name";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();

  await getDb()
    .insert(sessions)
    .values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
      // inet recusa valores malformados; só grava IPs plausíveis.
      ip: ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null,
    });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: serverEnv().NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await getDb()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb().update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, hashToken(token)));
  }
  store.delete(SESSION_COOKIE);
}

/** Defesa contra CSRF em rotas que mudam estado: o Origin precisa existir e ser o do próprio host. */
export async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (h.get("x-forwarded-host") ?? h.get("host"));
  } catch {
    return false;
  }
}
