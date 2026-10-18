import "server-only";

import { getDb } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";

/** Registra ação sensível. Nunca passe tokens, chaves ou senhas em `metadata`. */
export async function audit(input: {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await getDb().insert(auditLogs).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata ?? {},
  });
}
