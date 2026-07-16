import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Node environment — these are pure rule/logic tests with the db module mocked,
// so no jsdom and no live database. The `@` alias mirrors tsconfig paths so the
// server-action modules resolve the same way they do under Next.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
