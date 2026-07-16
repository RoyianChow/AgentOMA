import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// ⛔ NEVER run `drizzle-kit push` against this project.
//
// This database holds PHI. `push` diffs the schema against the live DB and will
// happily DROP a column it thinks is gone — there is no review step and no
// migration file to audit. It also bypasses __drizzle_migrations, which is
// exactly how this repo's migration tracking drifted in the first place (the DB
// was push-built while drizzle only ever recorded 0000; `migrate` then failed
// because it tried to re-create existing tables). That has been reconciled: the
// chain is baselined and file-based again.
//
// The ONLY sanctioned schema-change path is:  db:generate  →  review the SQL  →  db:migrate
// Triggers/grants aren't modelled by drizzle — add them as a custom migration
// (`db:generate --custom`), never as an out-of-band script.
// The `db:push` and `db:harden` scripts have been removed from package.json.

// dotenv loads .env before the validated env module reads it. Using `env` here
// (instead of raw process.env) keeps env access centralised in src/env.ts.
import { env } from "./src/env";

// Migrations use the DIRECT connection (DIRECT_URL, port 5432) — drizzle-kit
// must not go through the pgBouncer transaction pooler used at runtime.
function withSsl(url: string): string {
  if (url.includes("sslmode=")) return url;
  return url + (url.includes("?") ? "&" : "?") + "sslmode=require";
}

const migrationUrl = env.DIRECT_URL ?? env.DATABASE_URL;

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: { url: withSsl(migrationUrl) },
  strict: true,
  verbose: true,
});
