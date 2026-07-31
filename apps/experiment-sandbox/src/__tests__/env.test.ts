import { describe, expect, it, vi } from "vitest";

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

  it("accepts AZURE_EXTENSION_DIR as a local, non-secret CI runner path", () => {
    const extensionDir = process.platform === "win32"
      ? "C:\\hostedtoolcache\\extensions"
      : "/opt/hostedtoolcache/extensions";
    const env = parseSandboxEnv(
      { ...validEnv(), AZURE_EXTENSION_DIR: extensionDir },
      new Date("2026-08-01T00:00:00.000Z"),
    );

    expect(env.mode).toBe("synthetic");
  });

  it("rejects invalid AZURE_EXTENSION_DIR values without exposing the value", () => {
    const invalidValue = "https://runner.example.test/extension-dir";
    expect(() => parseSandboxEnv(
      { ...validEnv(), AZURE_EXTENSION_DIR: invalidValue },
      new Date("2026-08-01T00:00:00.000Z"),
    )).toThrow("SANDBOX_CONFIG_DENIED:INVALID_LOCAL_PATH:AZURE_EXTENSION_DIR");
  });

  it.each([
    "AZURE_CLIENT_SECRET",
    "AZURE_TENANT_ID",
    "AZURE_SUBSCRIPTION_ID",
    "AZURE_STORAGE_CONNECTION_STRING",
    "AZURE_OPENAI_API_KEY",
  ])("rejects production Azure credential variable %s", (key) => {
    expect(() => parseSandboxEnv(
      { ...validEnv(), [key]: "synthetic-credential-sentinel" },
      new Date("2026-08-01T00:00:00.000Z"),
    )).toThrow(`SANDBOX_CONFIG_DENIED:PROHIBITED_VARIABLE:${key}`);
  });

  it("does not print rejected values or include them in the safe denial", () => {
    const secret = "synthetic-secret-must-never-appear";
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    let thrown: unknown;
    try {
      parseSandboxEnv(
        { ...validEnv(), AZURE_CLIENT_SECRET: secret },
        new Date("2026-08-01T00:00:00.000Z"),
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(
      "SANDBOX_CONFIG_DENIED:PROHIBITED_VARIABLE:AZURE_CLIENT_SECRET",
    );
    expect((thrown as Error).message).not.toContain(secret);
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleLog.mockRestore();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });
});
