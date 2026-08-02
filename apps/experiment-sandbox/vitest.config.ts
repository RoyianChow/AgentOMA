import { defineConfig } from "vitest/config";

const builtAt = new Date().toISOString();
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      SANDBOX_MODE: "synthetic",
      SANDBOX_BUILT_AT: builtAt,
      SANDBOX_EXPIRES_AT: expiresAt,
      SANDBOX_INSTANCE_ID: "SYNTH-TEST-001",
      SANDBOX_ORIGIN: "http://127.0.0.1:3101",
      SANDBOX_G1_DECISION_ID: "G1-2026-07-31-task-01",
      SANDBOX_DISABLED: "false",
    },
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
