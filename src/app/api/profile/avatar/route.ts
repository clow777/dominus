import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser, isSameOrigin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { userProfiles } from "@/server/db/schema";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;

function detectExt(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8) return "jpeg";
  if (b.subarray(0, 8).toString("hex").startsWith("89504e47")) return "png";
  if (b.subarray(0, 4).toString() === "RIFF") return "webp";
  return null;
}

export async function POST(req: Request) {
  if (!(await isSameOrigin())) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("avatar");
  if (!(file instanceof File)) return NextResponse.json({ error: "Envie uma imagem." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Até 5MB." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = detectExt(bytes);
  if (!ext) return NextResponse.json({ error: "Use JPG, PNG ou WEBP." }, { status: 400 });

  const base64 = bytes.toString("base64");
  const avatarUrl = `data:image/${ext};base64,${base64}`;

  const db = getDb();
  await db.insert(userProfiles).values({ userId: user.id, avatarUrl }).onConflictDoUpdate({ target: userProfiles.userId, set: { avatarUrl, updatedAt: new Date() } });

  revalidatePath("/");
  return NextResponse.json({ url: avatarUrl });
}