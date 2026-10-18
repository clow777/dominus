import "server-only";

import { z } from "zod";

/**
 * Variáveis de ambiente do servidor, validadas na primeira leitura.
 * Segredos ficam só aqui — nunca em NEXT_PUBLIC_*.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  PAYMENT_PROVIDER: z.string().min(1).default("none"),
  /** Eleva (provedor PIX). Segredos só no servidor. */
  ELEVA_CLIENT_ID: z.string().min(1).optional(),
  ELEVA_TOKEN_SECRET: z.string().min(1).optional(),
  ELEVA_BASE_URL: z.string().url().default("https://app.elevapayments.live/api/v1"),
  /** Caminho de criação de cobrança PIX. Confirme na documentação da Eleva: POST /transactions responde 405. */
  ELEVA_CREATE_PIX_PATH: z.string().startsWith("/").default("/transactions"),
  ENCRYPTION_KEY: z.string().optional(),
  /** URL pública HTTPS para o Telegram chamar o webhook (ex.: túnel ngrok em desenvolvimento). */
  TELEGRAM_WEBHOOK_BASE_URL: z.string().url().optional(),
  /** Token do agendador externo (/api/jobs/tick) quando o app não roda como processo contínuo. */
  CRON_SECRET: z.string().min(16).optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    // Lista apenas os nomes das variáveis inválidas, nunca os valores.
    throw new Error(`Variáveis de ambiente inválidas: ${fields}`);
  }
  cached = parsed.data;
  return cached;
}

export function requireDatabaseUrl(): string {
  const url = serverEnv().DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida.");
  return url;
}

export function requireEncryptionKey(): Buffer {
  const raw = serverEnv().ENCRYPTION_KEY;
  const key = raw ? Buffer.from(raw, "base64") : null;
  if (!key || key.length !== 32) throw new Error("ENCRYPTION_KEY ausente ou inválida (esperado: 32 bytes em base64).");
  return key;
}
