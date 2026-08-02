import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "../schema";

/** Matches docker-compose.yml. Overridable, but see assertLocal() below. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres@localhost:5433/agentoma_test";

/**
 * Hard guard. These tests TRUNCATE and insert concurrently. If TEST_DATABASE_URL
 * were ever pointed at the live Supabase database — which holds PHI — they would
 * destroy real patient records. Refuse anything that isn't a local throwaway.
 */
export function assertLocalTestDb(url: string = TEST_DATABASE_URL): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("REFUSING: TEST_DATABASE_URL is not a valid URL.");
  }

  const expectedPort = parsed.hostname === "test-db" ? "5432" : "5433";
  const isAllowedEndpoint =
    (parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "test-db") &&
    parsed.port === expectedPort &&
    parsed.pathname === "/agentoma_test" &&
    parsed.username === "postgres" &&
    parsed.password === "" &&
    parsed.search === "" &&
    parsed.hash === "" &&
    (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:");

  if (!isAllowedEndpoint) {
    throw new Error(
      "REFUSING to run destructive tests outside the exact throwaway " +
        "agentoma_test Docker endpoint (npm run test:db:up).",
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
  // "user" is quoted because it's a reserved word; cascade covers the
  // dependent auth tables' FKs.
  await db.execute(
    sql`truncate table destruction_run, audit_write_failure, restore_drill, record_correction, access_correction_request, export_manifest, record_hold, patient_record_retention, follow_up, claim_draft, audit_log, assessment, intake_session, patient, triage_exit, invitation, two_factor, rate_limit, session, account, verification, "user", pharmacy restart identity cascade`,
  );
}
