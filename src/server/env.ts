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
