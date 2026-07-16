// Applies the idempotent hardening SQL (schema additions, mutex trigger, audit
// immutability + REVOKE) directly to the database.
//
//   npm run db:harden
//
// Applied out-of-band from drizzle-kit migrate because the DB was built with
// `drizzle-kit push`, so migrate's tracking is out of sync. Safe to re-run.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
const raw = (process.env.DIRECT_URL ?? process.env.DATABASE_URL)!;
const url = raw.includes("sslmode=") ? raw : raw + (raw.includes("?") ? "&" : "?") + "sslmode=require";
const sql = postgres(url, { max: 1 });

async function main() {
  const file = join(here, "sql", "0003_hardening.sql");
  const ddl = readFileSync(file, "utf8");
  // .simple() → simple query protocol, which allows multiple statements and
  // dollar-quoted plpgsql bodies in one round trip.
  await sql.unsafe(ddl).simple();
  console.log(`Applied ${file}`);
  await sql.end();
}

main().catch(async (e) => {
  console.error("harden failed:", e);
  await sql.end();
  process.exit(1);
});
