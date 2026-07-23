import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Fast, database-free logic checks. The full `npm run test` suite remains the
 * acceptance gate and still uses fresh Docker Postgres for constraint-backed
 * money rules.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.db.test.ts"],
    env: { SKIP_ENV_VALIDATION: "1" },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
