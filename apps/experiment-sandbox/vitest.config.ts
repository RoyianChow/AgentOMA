import { defineConfig } from "vitest/config";

import { task04SyntheticEnvironmentInput } from "./src/env/server.ts";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.postgres.test.ts"],
    env: task04SyntheticEnvironmentInput(),
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
