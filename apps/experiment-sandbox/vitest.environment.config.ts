import { defineConfig } from "vitest/config";

import { task04SyntheticEnvironmentInput } from "./src/env/server.ts";

// Runtime-authorization check only — see src/__tests__/*.check.ts.
//
// The synthetic Task 04 variables are supplied so the check cannot fail merely
// because this machine does not set them. Vitest merges them INTO the real
// process.env rather than replacing it, so any prohibited variable the
// surrounding shell carries is still observed and still fails closed. That is
// the entire point of this command, and why it is separate from vitest.config.ts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.check.ts"],
    env: task04SyntheticEnvironmentInput(),
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
