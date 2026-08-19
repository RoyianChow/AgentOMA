import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../../env";
import * as schema from "./schema";

// Singleton client. Next.js dev hot-reload re-imports modules, which would
// otherwise open a new pool on every reload and exhaust connections; cache the
// underlying postgres.js client on globalThis to reuse it.
const globalForDb = globalThis as unknown as {
  __sqlClient?: ReturnType<typeof postgres>;
};

// Runtime uses the POOLED connection (DATABASE_URL, port 6543). Supabase's
// transaction pooler (pgBouncer) does not support prepared statements, so they
// must be disabled. `ssl: "require"` because Supabase requires TLS.
const client =
  globalForDb.__sqlClient ??
  postgres(env.DATABASE_URL, { prepare: false, ssl: "require" });

// DIRECT_URL belongs to the migration runner in drizzle.config.ts. Runtime
// requests intentionally stay on the pooled URL and never choose a database
// connection from client input.
if (env.NODE_ENV !== "production") {
  globalForDb.__sqlClient = client;
}

export const db = drizzle(client, { schema, casing: "snake_case" });

export { schema };
