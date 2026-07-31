import { describe, expect, it } from "vitest";

import {
  SANDBOX_G1_DECISION_ID,
  SANDBOX_ORIGIN,
  parseSandboxEnv,
} from "../env/server";

const builtAt = new Date("2026-07-31T00:00:00.000Z");
const expiresAt = new Date("2026-08-07T00:00:00.000Z");

function validEnv(): Record<string, string> {
  return {
    SANDBOX_MODE: "synthetic",
    SANDBOX_BUILT_AT: builtAt.toISOString(),
    SANDBOX_EXPIRES_AT: expiresAt.toISOString(),
    SANDBOX_INSTANCE_ID: "SYNTH-TEST-001",
    SANDBOX_ORIGIN: SANDBOX_ORIGIN,
    SANDBOX_G1_DECISION_ID: SANDBOX_G1_DECISION_ID,
    SANDBOX_DISABLED: "false",
  };
}

describe("sandbox environment contract", () => {
  it("accepts only a future, loopback synthetic configuration", () => {
    const env = parseSandboxEnv(validEnv(), new Date("2026-08-01T00:00:00.000Z"));
    expect(env.mode).toBe("synthetic");
    expect(env.origin).toBe(SANDBOX_ORIGIN);
    expect(env.instanceId).toBe("SYNTH-TEST-001");
  });

  it("denies missing or malformed configuration", () => {
    const input = validEnv();
    delete input.SANDBOX_G1_DECISION_ID;
    expect(() => parseSandboxEnv(input, new Date("2026-08-01T00:00:00.000Z"))).toThrow(
      "SANDBOX_CONFIG_DENIED:MISSING_OR_MALFORMED_VARIABLE",
    );
  });

  it("denies expired configuration unless a runtime guard explicitly requests inspection", () => {
    expect(() => parseSandboxEnv(validEnv(), new Date("2026-08-08T00:00:00.000Z"))).toThrow(
      "SANDBOX_CONFIG_DENIED:EXPIRED",
    );
    expect(parseSandboxEnv(validEnv(), new Date("2026-08-08T00:00:00.000Z"), { allowExpired: true }).expiresAt).toEqual(expiresAt);
  });

  it("denies lifetimes longer than thirty days and non-loopback origins", () => {
    const longLived = validEnv();
    longLived.SANDBOX_EXPIRES_AT = "2026-09-01T00:00:00.000Z";
    expect(() => parseSandboxEnv(longLived, builtAt)).toThrow("SANDBOX_CONFIG_DENIED:EXPIRY_OVER_30_DAYS");

    const hosted = validEnv();
    hosted.SANDBOX_ORIGIN = "https://preview.example.test";
    expect(() => parseSandboxEnv(hosted, new Date("2026-08-01T00:00:00.000Z"))).toThrow(
      "SANDBOX_CONFIG_DENIED:MISSING_OR_MALFORMED_VARIABLE",
    );
  });

  it("denies production credential, proxy, and destination variable classes", () => {
    for (const key of ["DATABASE_URL", "BETTER_AUTH_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "HTTP_PROXY", "CLINICAL_VIEWER_BASE_URL"]) {
      expect(() => parseSandboxEnv({ ...validEnv(), [key]: "synthetic-sentinel" }, new Date("2026-08-01T00:00:00.000Z"))).toThrow(
        `SANDBOX_CONFIG_DENIED:PROHIBITED_VARIABLE:${key}`,
      );
    }
  });
});
