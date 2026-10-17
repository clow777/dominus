import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { requireDatabaseUrl } from "@/server/env";
import * as schema from "./schema";

declare global {
  // Reaproveita o pool entre recargas do servidor de desenvolvimento.
  var __dominusPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString: requireDatabaseUrl(),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
  });
}

export function getDb() {
  const pool = globalThis.__dominusPool ?? createPool();
  if (process.env.NODE_ENV !== "production") globalThis.__dominusPool = pool;
  return drizzle(pool, { schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof getDb>;
