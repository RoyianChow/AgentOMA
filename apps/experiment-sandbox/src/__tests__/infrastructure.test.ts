import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  TASK04_SANDBOX_OWNER_POSTGRES_URL,
  TASK04_SANDBOX_POSTGRES_URL,
  parseTask04SandboxEnv,
  task04SyntheticEnvironmentInput,
} from "../env/server";

const composePath = fileURLToPath(
  new URL("../../docker-compose.yml", import.meta.url),
);

describe("Task 04 local PostgreSQL boundary", () => {
  it("binds PostgreSQL only to the explicit IPv4 loopback address", () => {
    const compose = readFileSync(composePath, "utf8");

    expect(compose).toContain('"127.0.0.1:55404:5432"');
    expect(compose).not.toMatch(/0\.0\.0\.0|::|network_mode:\s*host/i);
    expect(compose).toContain("task04_synthetic_db");
    expect(compose).toContain("task04_synthetic_owner");
    expect(compose).toContain("task04_synthetic_owner_password");
    expect(compose).toContain("postgres:16.14-alpine");
    expect(compose).toContain("/var/lib/postgresql/data");
  });

  it("uses only the dedicated sandbox PostgreSQL variable", () => {
    expect(TASK04_SANDBOX_POSTGRES_URL).toBe(
      "postgresql://task04_synthetic_runtime:task04_synthetic_runtime_password@127.0.0.1:55404/task04_synthetic_db",
    );
    expect(TASK04_SANDBOX_OWNER_POSTGRES_URL).toBe(
      "postgresql://task04_synthetic_owner:task04_synthetic_owner_password@127.0.0.1:55404/task04_synthetic_db",
    );
    expect(TASK04_SANDBOX_POSTGRES_URL).not.toMatch(
      /supabase|cloud|production/i,
    );
  });

  it.each(["DATABASE_URL", "DIRECT_URL", "SUPABASE_DATABASE_URL"])(
    "rejects production database variable %s even when Task 04 config is present",
    (key) => {
      const now = new Date("2026-08-01T00:00:00.000Z");
      const input = {
        ...task04SyntheticEnvironmentInput(),
        [key]: "prohibited-sentinel",
      };

      expect(() => parseTask04SandboxEnv(input, now)).toThrow(
        `SANDBOX_CONFIG_DENIED:PROHIBITED_VARIABLE:${key}`,
      );
    },
  );
});
