import "dotenv/config";
import { defineConfig } from "drizzle-kit";

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
