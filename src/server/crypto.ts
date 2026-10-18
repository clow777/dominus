import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { requireEncryptionKey } from "@/server/env";

/** AES-256-GCM. Formato: v1:iv:tag:dados (base64). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", requireEncryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Segredo cifrado em formato inválido.");
  const decipher = createDecipheriv("aes-256-gcm", requireEncryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

/** Mostra só o final do segredo, para o usuário reconhecer o que cadastrou. */
export function maskSecret(plain: string): string {
  return plain.length <= 4 ? "••••" : `••••${plain.slice(-4)}`;
}
