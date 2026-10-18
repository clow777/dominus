"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FLOW_LIMIT, FLOW_STEP_KEYS, NOTIFICATION_KEYS, TRACKING_KEYS } from "@/lib/preferences";
import { SANDBOX_KEY, THIRD_PARTY_KEYS } from "@/lib/gateways";
import { isValidCPF, onlyDigits, formatCPF } from "@/lib/validations/cpf";
import { requireApprovedForAction } from "@/server/auth/guard";
import { encryptSecret } from "@/server/crypto";
import { getDb } from "@/server/db/client";
import {
  flows,
  flowSteps,
  notificationPreferences,
  platformGateways,
  trackingConfigs,
  userProfiles,
  users,
} from "@/server/db/schema";

export type ActionResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const OK: ActionResult = { ok: true };

/* ── Gateways ── */

const apiKeySchema = z.string().trim().min(8, "API Key muito curta.").max(512, "API Key muito longa.");

export async function connectGateway(gatewayKey: string, apiKey: string): Promise<ActionResult> {
  const { orgId } = await requireApprovedForAction();
  if (!THIRD_PARTY_KEYS.includes(gatewayKey)) return fail("Gateway desconhecido.");
  const parsed = apiKeySchema.safeParse(apiKey);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "API Key inválida.");
  const apiKeyEncrypted = encryptSecret(parsed.data);
  await getDb()
    .insert(platformGateways)
    .values({ organizationId: orgId, gatewayKey, status: "configured", apiKeyEncrypted })
    .onConflictDoUpdate({
      target: [platformGateways.organizationId, platformGateways.gatewayKey],
      set: { status: "configured", apiKeyEncrypted, updatedAt: new Date() },
    });
  revalidatePath("/gateways");
  return OK;
}

export async function disconnectGateway(gatewayKey: string): Promise<ActionResult> {
  const { orgId } = await requireApprovedForAction();
  if (!THIRD_PARTY_KEYS.includes(gatewayKey)) return fail("Gateway desconhecido.");
  await getDb()
    .delete(platformGateways)
    .where(and(eq(platformGateways.organizationId, orgId), eq(platformGateways.gatewayKey, gatewayKey)));
  revalidatePath("/gateways");
  return OK;
}

/** Ativa/desativa o sandbox ou um gateway de terceiros já configurado. */
export async function setGatewayActive(gatewayKey: string, active: boolean): Promise<ActionResult> {
  const { orgId } = await requireApprovedForAction();
  const db = getDb();
  if (gatewayKey === SANDBOX_KEY) {
    await db
      .insert(platformGateways)
      .values({ organizationId: orgId, gatewayKey, status: active ? "active" : "inactive" })
      .onConflictDoUpdate({
        target: [platformGateways.organizationId, platformGateways.gatewayKey],
        set: { status: active ? "active" : "inactive", updatedAt: new Date() },
      });
  } else if (THIRD_PARTY_KEYS.includes(gatewayKey)) {
    const updated = await db
      .update(platformGateways)
      .set({ status: active ? "active" : "configured", updatedAt: new Date() })
      .where(and(eq(platformGateways.organizationId, orgId), eq(platformGateways.gatewayKey, gatewayKey), sql`${platformGateways.apiKeyEncrypted} is not null`))
      .returning({ id: platformGateways.id });
    if (updated.length === 0) return fail("Conecte o gateway com uma API Key primeiro.");
  } else {
    return fail("Gateway desconhecido.");
  }
  revalidatePath("/gateways");
  return OK;
}

/* ── Trackeamento ── */

export async function saveTracking(platform: string, value: string): Promise<ActionResult> {
  const { orgId } = await requireApprovedForAction();
  if (!(TRACKING_KEYS as string[]).includes(platform)) return fail("Plataforma desconhecida.");
  const parsed = z.string().trim().min(3, "Valor muito curto.").max(512, "Valor muito longo.").safeParse(value);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Valor inválido.");
  const valueEncrypted = encryptSecret(parsed.data);
  await getDb()
    .insert(trackingConfigs)
    .values({ organizationId: orgId, platform, valueEncrypted })
    .onConflictDoUpdate({
      target: [trackingConfigs.organizationId, trackingConfigs.platform],
      set: { valueEncrypted, updatedAt: new Date() },
    });
  revalidatePath("/trackeamento");
  return OK;
}

export async function setTrackingEnabled(platform: string, enabled: boolean): Promise<ActionResult> {
  const { orgId } = await requireApprovedForAction();
  if (!(TRACKING_KEYS as string[]).includes(platform)) return fail("Plataforma desconhecida.");
  const updated = await getDb()
    .update(trackingConfigs)
    .set({ enabled, updatedAt: new Date() })
    .where(
      and(
        eq(trackingConfigs.organizationId, orgId),
        eq(trackingConfigs.platform, platform),
        sql`${trackingConfigs.valueEncrypted} is not null`,
      ),
    )
    .returning({ id: trackingConfigs.id });
  if (updated.length === 0) return fail("Configure a plataforma antes de ativar.");
  revalidatePath("/trackeamento");
  return OK;
}

/* ── Notificações ── */

export async function setNotification(key: string, enabled: boolean): Promise<ActionResult> {
  const { user } = await requireApprovedForAction();
  if (!(NOTIFICATION_KEYS as string[]).includes(key)) return fail("Notificação desconhecida.");
  await getDb()
    .insert(notificationPreferences)
    .values({ userId: user.id, key, enabled })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.key],
      set: { enabled, updatedAt: new Date() },
    });
  revalidatePath("/notificacoes");
  return OK;
}

/* ── Perfil ── */

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  phone: z
    .string()
    .trim()
    .transform((v) => onlyDigits(v))
    .refine((v) => v === "" || (v.length >= 10 && v.length <= 13), "Telefone inválido."),
  cpf: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidCPF(v), "CPF inválido."),
});

export async function saveProfile(input: { name: string; phone: string; cpf: string }): Promise<ActionResult> {
  const { user } = await requireApprovedForAction();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const { name, phone, cpf } = parsed.data;
  const cpfValue = cpf === "" ? null : formatCPF(cpf);
  const db = getDb();
  await db.update(users).set({ name }).where(eq(users.id, user.id));
  await db
    .insert(userProfiles)
    .values({ userId: user.id, phone: phone || null, cpf: cpfValue })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { phone: phone || null, cpf: cpfValue, updatedAt: new Date() },
    });
  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  return OK;
}

/* ── Fluxos ── */

const stepSchema = z.object({
  kind: z.enum(FLOW_STEP_KEYS as [string, ...string[]]),
  config: z.record(z.string().max(2000), z.string().max(2000)),
});

export async function createFlow(name: string, kind: "basic" | "advanced"): Promise<ActionResult & { id?: string }> {
  const { orgId } = await requireApprovedForAction();
  const parsed = z.string().trim().min(2, "Informe um nome.").max(120).safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nome inválido.");
  if (kind !== "basic" && kind !== "advanced") return fail("Tipo inválido.");
  const db = getDb();
  const [counted] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(flows)
    .where(eq(flows.organizationId, orgId));
  if ((counted?.n ?? 0) >= FLOW_LIMIT) return fail(`Limite de ${FLOW_LIMIT} fluxos atingido.`);
  const [row] = await db.insert(flows).values({ organizationId: orgId, name: parsed.data, kind }).returning({ id: flows.id });
  revalidatePath("/fluxos");
  return { ok: true, id: row!.id };
}

export async function deleteFlow(flowId: string): Promise<ActionResult> {
  const { orgId } = await requireApprovedForAction();
  await getDb().delete(flows).where(and(eq(flows.organizationId, orgId), eq(flows.id, flowId)));
  revalidatePath("/fluxos");
  return OK;
}

export async function saveFlow(
  flowId: string,
  input: { name: string; steps: { kind: string; config: Record<string, string> }[] },
): Promise<ActionResult> {
  const { orgId } = await requireApprovedForAction();
  const parsed = z
    .object({ name: z.string().trim().min(2, "Informe um nome.").max(120), steps: z.array(stepSchema).max(50, "Máximo de 50 passos.") })
    .safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Fluxo inválido.");
  const db = getDb();
  const [owned] = await db
    .select({ id: flows.id })
    .from(flows)
    .where(and(eq(flows.organizationId, orgId), eq(flows.id, flowId)))
    .limit(1);
  if (!owned) return fail("Fluxo não encontrado.");
  const { name, steps } = parsed.data;
  await db.transaction(async (tx) => {
    await tx
      .update(flows)
      .set({ name, kind: steps.length > 3 ? "advanced" : "basic", updatedAt: new Date() })
      .where(eq(flows.id, flowId));
    await tx.delete(flowSteps).where(eq(flowSteps.flowId, flowId));
    if (steps.length > 0) {
      await tx.insert(flowSteps).values(steps.map((s, i) => ({ flowId, position: i, kind: s.kind, config: s.config })));
    }
  });
  revalidatePath("/fluxos");
  revalidatePath(`/fluxos/${flowId}`);
  return OK;
}

export async function importFlow(json: string): Promise<ActionResult & { id?: string }> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return fail("JSON inválido.");
  }
  const parsed = z
    .object({ name: z.string().trim().min(2).max(120), steps: z.array(stepSchema).max(50) })
    .safeParse(data);
  if (!parsed.success) return fail("Formato inválido. Esperado: { name, steps: [{ kind, config }] }.");
  const created = await createFlow(parsed.data.name, "basic");
  if (!created.ok || !created.id) return created;
  const saved = await saveFlow(created.id, parsed.data);
  return saved.ok ? { ok: true, id: created.id } : saved;
}
