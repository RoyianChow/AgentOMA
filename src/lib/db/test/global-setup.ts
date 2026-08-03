import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../schema";
import { seedReferenceData } from "../seed-reference";
import { assertRunningTestDbEnvironment } from "./docker-environment";
import { TEST_DATABASE_URL, assertLocalTestDb } from "./harness";

/**
 * Vitest globalSetup: build the throwaway test database from zero.
 *
 * This runs `db:migrate` from an EMPTY database, which is itself one of the
 * required tests: it proves the migration chain is self-sufficient — that a
 * fresh environment gets the mutex trigger and the immutability triggers from
 * the files alone. That was NOT true before 0004 (the triggers lived only in an
 * out-of-band script, so a new database silently had no race guard).
 */
export default async function setup() {
  assertLocalTestDb();
  // URL validation alone is insufficient: a stale or externally exposed
  // Postgres can still listen on localhost:5433. Prove Docker ownership,
  // current Compose bytes, loopback binding, health, image, and tmpfs before
  // opening the first database connection.
  assertRunningTestDbEnvironment();

  const client = postgres(TEST_DATABASE_URL, { max: 1 });
  try {
    const db = drizzle(client, { schema, casing: "snake_case" });

    // Fresh every run: drop and rebuild, so we always migrate from zero.
    await client.unsafe(`drop schema if exists public cascade; create schema public;`);
    await client.unsafe(`drop schema if exists drizzle cascade;`);

    await migrate(db, { migrationsFolder: "src/lib/db/migrations" });
    const counts = await seedReferenceData(db);

    console.log(
      `[test-db] migrated from zero + seeded — odb_fee_tier:${counts.feeTiers} ailment_group:${counts.groups} pin:${counts.pins} claim_rule:${counts.rules}`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}
