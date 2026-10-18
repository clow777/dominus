import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentUser, isSameOrigin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { userProfiles } from "@/server/db/schema";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const DIR = path.join(process.cwd(), "public", "avatars");

/** Detecta o tipo pelos bytes do arquivo, sem confiar no nome nem no Content-Type enviados. */
function detectExt(b: Buffer): "jpg" | "png" | "webp" | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

export async function POST(req: Request) {
  if (!(await isSameOrigin())) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("avatar");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie uma imagem." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "A imagem deve ter até 5 MB." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = detectExt(bytes);
  if (!ext) return NextResponse.json({ error: "Use JPG, PNG ou WEBP." }, { status: 400 });

  const name = `${user.id}-${randomBytes(6).toString("hex")}.${ext}`;
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, name), bytes);

  const db = getDb();
  const [prev] = await db.select({ url: userProfiles.avatarUrl }).from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
  const url = `/avatars/${name}`;
  await db
    .insert(userProfiles)
    .values({ userId: user.id, avatarUrl: url })
    .onConflictDoUpdate({ target: userProfiles.userId, set: { avatarUrl: url, updatedAt: new Date() } });

  // Remove a foto anterior apenas se for um arquivo deste usuário.
  if (prev?.url?.startsWith(`/avatars/${user.id}-`)) {
    await unlink(path.join(DIR, path.basename(prev.url))).catch(() => null);
  }

  revalidatePath("/perfil");
  return NextResponse.json({ url });
}
