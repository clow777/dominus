import "server-only";

import { and, eq, lte, sql } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { domainEvents } from "@/server/db/schema";

export type DomainEventType =
  | "lead.started"
  | "pix.generated"
  | "pix.paid"
  | "pix.expired"
  | "pix.failed"
  | "pix.refunded"
  | "upsell.accepted"
  | "withdrawal.updated"
  | "bot.offline"
  | "bot.online"
  | "campaign.sent"
  | "platform.alert"
  | "award.unlocked";

export interface DomainEvent {
  id: string;
  organizationId: string;
  type: DomainEventType;
  payload: Record<string, unknown>;
}

type Handler = (event: DomainEvent) => Promise<void>;

const MAX_ATTEMPTS = 6;
const CLAIM_MS = 2 * 60_000;
const handlers = new Map<string, Handler[]>();

/** Registra um consumidor (Notificações, Trackeamento, Premiações…). */
export function onEvent(type: DomainEventType, handler: Handler) {
  handlers.set(type, [...(handlers.get(type) ?? []), handler]);
}

/** `dedupeKey` único por fato: republicar o mesmo fato não duplica o evento. */
export async function publishEvent(input: {
  organizationId: string;
  type: DomainEventType;
  dedupeKey: string;
  payload?: Record<string, unknown>;
}): Promise<boolean> {
  const rows = await getDb()
    .insert(domainEvents)
    .values({ organizationId: input.organizationId, type: input.type, dedupeKey: input.dedupeKey, payload: input.payload ?? {} })
    .onConflictDoNothing({ target: domainEvents.dedupeKey })
    .returning({ id: domainEvents.id });
  return rows.length > 0;
}

/** Processa eventos vencidos com retry e backoff exponencial. Cada evento é reivindicado antes de rodar. */
export async function processDueEvents(limit = 50): Promise<number> {
  const db = getDb();
  const now = new Date();
  const due = await db
    .select()
    .from(domainEvents)
    .where(and(eq(domainEvents.status, "pending"), lte(domainEvents.nextAttemptAt, now)))
    .limit(limit);

  let done = 0;
  for (const row of due) {
    const claimed = await db
      .update(domainEvents)
      .set({ nextAttemptAt: new Date(Date.now() + CLAIM_MS) })
      .where(and(eq(domainEvents.id, row.id), eq(domainEvents.status, "pending"), lte(domainEvents.nextAttemptAt, now)))
      .returning({ id: domainEvents.id });
    if (claimed.length === 0) continue;

    try {
      const event: DomainEvent = { id: row.id, organizationId: row.organizationId, type: row.type as DomainEventType, payload: row.payload };
      for (const handler of handlers.get(row.type) ?? []) await handler(event);
      await db.update(domainEvents).set({ status: "done", processedAt: new Date(), lastError: null }).where(eq(domainEvents.id, row.id));
      done++;
    } catch (err) {
      const attempts = row.attempts + 1;
      await db
        .update(domainEvents)
        .set({
          attempts,
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          nextAttemptAt: new Date(Date.now() + Math.min(2 ** attempts * 30_000, 3_600_000)),
          lastError: err instanceof Error ? err.message.slice(0, 500) : "erro",
        })
        .where(eq(domainEvents.id, row.id));
    }
  }
  return done;
}

export async function pendingEventCount(): Promise<number> {
  const [r] = await getDb().select({ n: sql<string>`count(*)` }).from(domainEvents).where(eq(domainEvents.status, "pending"));
  return Number(r?.n ?? 0);
}
