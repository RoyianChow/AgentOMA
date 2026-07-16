import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "../schema";

/** Matches docker-compose.yml. Overridable, but see assertLocal() below. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5433/agentoma_test";

/**
 * Hard guard. These tests TRUNCATE and insert concurrently. If TEST_DATABASE_URL
 * were ever pointed at the live Supabase database — which holds PHI — they would
 * destroy real patient records. Refuse anything that isn't a local throwaway.
 */
export function assertLocalTestDb(url: string = TEST_DATABASE_URL): void {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "test-db";
  if (!isLocal) {
    throw new Error(
      `REFUSING to run destructive tests against non-local host "${host}". ` +
        `TEST_DATABASE_URL must point at the throwaway docker Postgres (npm run test:db:up).`,
    );
  }
  if (/supabase|pooler\./i.test(url)) {
    throw new Error("REFUSING: TEST_DATABASE_URL looks like a Supabase database.");
  }
}

export type TestDb = PostgresJsDatabase<typeof schema>;

export function makeTestDb(): { db: TestDb; client: postgres.Sql; close: () => Promise<void> } {
  assertLocalTestDb();
  const client = postgres(TEST_DATABASE_URL, { max: 5 });
  const db = drizzle(client, { schema, casing: "snake_case" });
  return { db, client, close: () => client.end({ timeout: 5 }) };
}

/**
 * Wipe operational/PHI tables between tests. Reference tables (ailment_group,
 * pin, claim_rule) are left seeded — they're the fixture, and the mutex trigger
 * reads claim_rule.
 */
export async function resetOperationalTables(db: TestDb): Promise<void> {
  assertLocalTestDb();
  // claim_draft has a DELETE-blocking trigger; TRUNCATE bypasses row triggers,
  // which is exactly why it's used here (and why it's local-only).
  await db.execute(
    sql`truncate table claim_draft, audit_log, assessment, intake_session, patient, triage_exit restart identity cascade`,
  );
}
