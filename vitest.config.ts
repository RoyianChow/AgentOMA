import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// The money-rule tests split in two:
//   *.test.ts     pure logic (deriveClaimDraft, retention) — no database
//   *.db.test.ts  constraint-backed rules — REAL Postgres, because indexes and
//                 triggers are the thing under test and a mock only tests itself
//
// The DB tests need the throwaway docker Postgres:  npm run test:db:up
// globalSetup rebuilds it from zero and migrates, which also proves the
// migration chain is self-sufficient (triggers included).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["src/lib/db/test/global-setup.ts"],
    // Tests never read the live environment (the db module is mocked to the
    // local test database), but some modules under test import src/env.ts at
    // module scope — skip zod validation rather than demand a full .env in CI.
    env: { SKIP_ENV_VALIDATION: "1" },
    // The DB test files share ONE database and truncate between tests, so they
    // must not run in parallel with each other — otherwise one file's reset
    // wipes another's fixtures mid-test and the failures look like rule bugs.
    fileParallelism: false,
    // Concurrency/advisory-lock tests need more than the 5s default.
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
