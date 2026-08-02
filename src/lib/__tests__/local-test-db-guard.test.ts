import { describe, expect, it } from "vitest";

import { assertLocalTestDb } from "@/lib/db/test/harness";

describe("destructive PostgreSQL test guard", () => {
  it.each([
    "postgres://postgres@localhost:5433/agentoma_test",
    "postgresql://postgres@127.0.0.1:5433/agentoma_test",
    "postgres://postgres@test-db:5432/agentoma_test",
  ])("accepts only a supported local Docker endpoint: %s", (url) => {
    expect(() => assertLocalTestDb(url)).not.toThrow();
  });

  it.each([
    "not-a-url",
    "postgres://postgres@example.test:5433/agentoma_test",
    "postgres://postgres@localhost:5432/agentoma_test",
    "postgres://postgres@localhost:5433/postgres",
    "postgres://other@localhost:5433/agentoma_test",
    "postgres://postgres:synthetic-password@localhost:5433/agentoma_test",
    "postgres://postgres@localhost:5433/agentoma_test?sslmode=require",
    "https://localhost:5433/agentoma_test",
    "postgres://postgres@synthetic.supabase.test:5433/agentoma_test",
  ])("fails closed for any other endpoint: %s", (url) => {
    expect(() => assertLocalTestDb(url)).toThrow(/^REFUSING/);
  });
});
