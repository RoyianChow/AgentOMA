import { describe, expect, it, vi } from "vitest";

import {
  SANDBOX_G1_DECISION_ID,
  SANDBOX_ORIGIN,
  TASK04_APPROVAL_DECISION_VERSION,
  TASK04_APPROVED_THROUGH_DATE_UTC,
  TASK04_DEFAULT_MAX_ACCESSIBILITY_SELECTIONS,
  TASK04_DEFAULT_MAX_PAGE_SIZE,
  TASK04_DEFAULT_MAX_SLOT_CAPACITY,
  TASK04_SANDBOX_EXPIRES_AT,
  TASK04_SANDBOX_PHARMACY_ID,
  TASK04_SANDBOX_POSTGRES_URL,
  parseSandboxEnv,
  parseTask04SandboxEnv,
} from "../env/server";

const builtAt = new Date("2026-07-31T00:00:00.000Z");
const expiresAt = new Date(TASK04_SANDBOX_EXPIRES_AT);

function validEnv(): Record<string, string> {
  return {
    SANDBOX_MODE: "synthetic",
    SANDBOX_BUILT_AT: builtAt.toISOString(),
    SANDBOX_EXPIRES_AT: expiresAt.toISOString(),
    SANDBOX_INSTANCE_ID: "SYNTH-TEST-001",
    SANDBOX_ORIGIN: SANDBOX_ORIGIN,
    SANDBOX_G1_DECISION_ID: SANDBOX_G1_DECISION_ID,
    SANDBOX_DISABLED: "false",
    TASK04_APPROVAL_DECISION_VERSION,
    TASK04_SANDBOX_PHARMACY_ID,
    TASK04_SANDBOX_POSTGRES_URL: TASK04_SANDBOX_POSTGRES_URL,
    TASK04_MAX_SLOT_CAPACITY: String(TASK04_DEFAULT_MAX_SLOT_CAPACITY),
    TASK04_MAX_ACCESSIBILITY_SELECTIONS: String(
      TASK04_DEFAULT_MAX_ACCESSIBILITY_SELECTIONS,
    ),
    TASK04_MAX_PAGE_SIZE: String(TASK04_DEFAULT_MAX_PAGE_SIZE),
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

  it("normalizes the Task 04 pharmacy scope and keeps it server-owned", () => {
    const input = validEnv();
    input.TASK04_SANDBOX_PHARMACY_ID = "synth-pharmacy-task04-local";
    const env = parseTask04SandboxEnv(
      input,
      new Date("2026-08-01T00:00:00.000Z"),
    );

    expect(env.pharmacyId).toBe("SYNTH-PHARMACY-TASK04-LOCAL");
    expect(env.postgresUrl).toBe(TASK04_SANDBOX_POSTGRES_URL);
  });

  it.each([
    ["day before approval ends", "2026-08-04T23:59:59.999Z"],
    ["approved final UTC date", "2026-08-05T23:59:59.999Z"],
  ])("accepts Task 04 configuration on the %s", (_label, now) => {
    const env = parseTask04SandboxEnv(validEnv(), new Date(now));
    expect(env.approvalDecisionVersion).toBe(
      TASK04_APPROVAL_DECISION_VERSION,
    );
    expect(TASK04_APPROVED_THROUGH_DATE_UTC).toBe("2026-08-05");
  });

  it("fails closed on the first UTC date after Task 04 approval", () => {
    expect(() =>
      parseTask04SandboxEnv(
        validEnv(),
        new Date("2026-08-06T00:00:00.000Z"),
      ),
    ).toThrow("SANDBOX_CONFIG_DENIED:TASK04_APPROVAL_EXPIRED");
  });

  it("fails closed when the configured sandbox expires inside the approval window", () => {
    const expired = validEnv();
    expired.SANDBOX_EXPIRES_AT = "2026-08-04T00:00:00.000Z";

    expect(() =>
      parseTask04SandboxEnv(
        expired,
        new Date("2026-08-04T00:00:00.001Z"),
      ),
    ).toThrow("SANDBOX_CONFIG_DENIED:EXPIRED");
  });

  it("rejects an expiry or approval identity outside the fixed approval", () => {
    const lateExpiry = validEnv();
    lateExpiry.SANDBOX_EXPIRES_AT = "2026-08-06T00:00:00.000Z";
    expect(() =>
      parseTask04SandboxEnv(
        lateExpiry,
        new Date("2026-08-04T00:00:00.000Z"),
      ),
    ).toThrow("SANDBOX_CONFIG_DENIED:TASK04_APPROVAL_WINDOW_EXCEEDED");

    const wrongDecision = validEnv();
    wrongDecision.TASK04_APPROVAL_DECISION_VERSION = "unapproved";
    expect(() =>
      parseTask04SandboxEnv(
        wrongDecision,
        new Date("2026-08-04T00:00:00.000Z"),
      ),
    ).toThrow("SANDBOX_CONFIG_DENIED:TASK04_MISSING_OR_MALFORMED_VARIABLE");
  });

  it.each([
    undefined,
    "",
    "PHARMACY-TASK04-LOCAL",
    "SYNTH-PHARMACY-",
    "SYNTH-PHARMACY-TASK04 LOCAL",
    `SYNTH-PHARMACY-${"A".repeat(82)}`,
  ])("fails closed for missing or malformed Task 04 pharmacy scope %s", (value) => {
    const input: Record<string, string | undefined> = {
      ...validEnv(),
      TASK04_SANDBOX_PHARMACY_ID: value,
    };
    expect(() =>
      parseTask04SandboxEnv(input, new Date("2026-08-01T00:00:00.000Z")),
    ).toThrow("SANDBOX_CONFIG_DENIED:TASK04_MISSING_OR_MALFORMED_VARIABLE");
  });

  it("rejects any non-approved Task 04 PostgreSQL destination", () => {
    const input = validEnv();
    input.TASK04_SANDBOX_POSTGRES_URL =
      "postgresql://task04_synthetic_user:task04_synthetic_password@localhost:55404/task04_synthetic_db";
    expect(() =>
      parseTask04SandboxEnv(input, new Date("2026-08-01T00:00:00.000Z")),
    ).toThrow("SANDBOX_CONFIG_DENIED:TASK04_MISSING_OR_MALFORMED_VARIABLE");
  });

  it("uses conservative synthetic defaults and validates configured limits", () => {
    const defaults = validEnv();
    delete defaults.TASK04_MAX_SLOT_CAPACITY;
    delete defaults.TASK04_MAX_ACCESSIBILITY_SELECTIONS;
    delete defaults.TASK04_MAX_PAGE_SIZE;
    const parsedDefaults = parseTask04SandboxEnv(
      defaults,
      new Date("2026-08-04T00:00:00.000Z"),
    );
    expect(parsedDefaults.maxSlotCapacity).toBe(
      TASK04_DEFAULT_MAX_SLOT_CAPACITY,
    );
    expect(parsedDefaults.maxAccessibilitySelections).toBe(
      TASK04_DEFAULT_MAX_ACCESSIBILITY_SELECTIONS,
    );
    expect(parsedDefaults.maxPageSize).toBe(TASK04_DEFAULT_MAX_PAGE_SIZE);

    const boundary = validEnv();
    boundary.TASK04_MAX_SLOT_CAPACITY = "1";
    boundary.TASK04_MAX_ACCESSIBILITY_SELECTIONS = "1";
    boundary.TASK04_MAX_PAGE_SIZE = "1";
    const parsedBoundary = parseTask04SandboxEnv(
      boundary,
      new Date("2026-08-04T00:00:00.000Z"),
    );
    expect(parsedBoundary.maxSlotCapacity).toBe(1);
    expect(parsedBoundary.maxAccessibilitySelections).toBe(1);
    expect(parsedBoundary.maxPageSize).toBe(1);

    for (const invalid of ["0", "-1", "1.5", "not-a-number"]) {
      for (const key of [
        "TASK04_MAX_SLOT_CAPACITY",
        "TASK04_MAX_ACCESSIBILITY_SELECTIONS",
        "TASK04_MAX_PAGE_SIZE",
      ]) {
        expect(() =>
          parseTask04SandboxEnv(
            { ...validEnv(), [key]: invalid },
            new Date("2026-08-04T00:00:00.000Z"),
          ),
        ).toThrow(
          "SANDBOX_CONFIG_DENIED:TASK04_MISSING_OR_MALFORMED_VARIABLE",
        );
      }
    }
  });

  it.each([
    "PHARMACY_ID",
    "DATABASE_URL",
    "DIRECT_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "SUPABASE_URL",
    "SUPABASE_DB_URL",
    "DOCKER_HOST",
    "DOCKER_CONTEXT",
    "DOCKER_TLS",
    "DOCKER_TLS_VERIFY",
    "DOCKER_CERT_PATH",
  ])("rejects conflicting parent environment key %s", (key) => {
    expect(() =>
      parseTask04SandboxEnv(
        { ...validEnv(), [key]: "prohibited-sentinel" },
        new Date("2026-08-04T00:00:00.000Z"),
      ),
    ).toThrow(`SANDBOX_CONFIG_DENIED:PROHIBITED_VARIABLE:${key}`);
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
