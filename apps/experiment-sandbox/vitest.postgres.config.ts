import { defineConfig } from "vitest/config";

import { task04SyntheticEnvironmentInput } from "./src/env/server.ts";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.postgres.test.ts"],
    env: task04SyntheticEnvironmentInput(),
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
