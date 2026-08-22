import { describe, expect, it, vi } from "vitest";

import {
  SANDBOX_G1_DECISION_ID,
  SANDBOX_ORIGIN,
  TASK04_APPROVAL_DECISION_VERSION,
  TASK04_APPROVED_THROUGH_DATE_UTC,
  TASK04_DEFAULT_MAX_ACCESSIBILITY_SELECTIONS,
  TASK04_DEFAULT_MAX_PAGE_SIZE,
  TASK04_DEFAULT_MAX_SLOT_CAPACITY,
  TASK04_MAX_AVAILABILITY_WINDOW_DAYS,
  TASK04_MAX_REQUEST_BYTES,
  TASK04_PENDING_HOLD_MINUTES,
  TASK04_PUBLIC_LOCATION_LABEL,
  TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS,
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
    TASK04_PENDING_HOLD_MINUTES: String(
      TASK04_PENDING_HOLD_MINUTES,
    ),
    TASK04_PUBLIC_LOCATION_LABEL,
    TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS: String(
      TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS,
    ),
    TASK04_MAX_REQUEST_BYTES: String(TASK04_MAX_REQUEST_BYTES),
    TASK04_MAX_AVAILABILITY_WINDOW_DAYS: String(
      TASK04_MAX_AVAILABILITY_WINDOW_DAYS,
    ),
    TASK04_PUBLIC_SLOT_REFERENCE_SECRET:
      "SYNTHETIC_TASK04_ENV_TEST_SLOT_REFERENCE_SECRET",
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

  it("accepts NODE_ENV=production only for the explicit Next.js build phase", () => {
    const input = { ...validEnv(), NODE_ENV: "production" };
    const now = new Date("2026-08-01T00:00:00.000Z");

    expect(parseSandboxEnv(input, now, { phase: "build" }).mode).toBe(
      "synthetic",
    );
    expect(
      parseSandboxEnv(
        {
          ...input,
          NEXT_PHASE: "phase-production-build",
        },
        now,
        { phase: "startup" },
      ).mode,
    ).toBe("synthetic");
    for (const phase of [undefined, "startup", "test"] as const) {
      expect(() =>
        parseSandboxEnv(input, now, {
          ...(phase === undefined ? {} : { phase }),
        }),
      ).toThrow("SANDBOX_CONFIG_DENIED:PRODUCTION_NODE_ENV");
    }
    expect(() =>
      parseSandboxEnv(
        {
          ...input,
          NEXT_PHASE: "phase-production-server",
        },
        now,
        { phase: "startup" },
      ),
    ).toThrow("SANDBOX_CONFIG_DENIED:PRODUCTION_NODE_ENV");
  });

  it("keeps production credentials denied during a production-mode build", () => {
    const secret = "synthetic-build-secret-must-never-appear";
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    let failure: unknown;

    try {
      parseSandboxEnv(
        {
          ...validEnv(),
          NODE_ENV: "production",
          AZURE_CLIENT_SECRET: secret,
        },
        new Date("2026-08-01T00:00:00.000Z"),
        { phase: "build" },
      );
    } catch (error) {
      failure = error;
    }

    expect((failure as Error).message).toBe(
      "SANDBOX_CONFIG_DENIED:PROHIBITED_VARIABLE:AZURE_CLIENT_SECRET",
    );
    expect((failure as Error).message).not.toContain(secret);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
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

  it("requires every synthetic setting and validates configured limits", () => {
    for (const key of [
      "TASK04_MAX_SLOT_CAPACITY",
      "TASK04_MAX_ACCESSIBILITY_SELECTIONS",
      "TASK04_MAX_PAGE_SIZE",
      "TASK04_PENDING_HOLD_MINUTES",
      "TASK04_PUBLIC_LOCATION_LABEL",
      "TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS",
      "TASK04_MAX_REQUEST_BYTES",
      "TASK04_MAX_AVAILABILITY_WINDOW_DAYS",
      "TASK04_PUBLIC_SLOT_REFERENCE_SECRET",
    ]) {
      const missing = validEnv();
      delete missing[key];
      expect(() =>
        parseTask04SandboxEnv(
          missing,
          new Date("2026-08-04T00:00:00.000Z"),
        ),
      ).toThrow(
        "SANDBOX_CONFIG_DENIED:TASK04_MISSING_OR_MALFORMED_VARIABLE",
      );
    }
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

  it("accepts only the coordinator-approved synthetic values", () => {
    const parsed = parseTask04SandboxEnv(
      validEnv(),
      new Date("2026-08-04T00:00:00.000Z"),
    );
    expect(parsed).toMatchObject({
      pendingHoldMinutes: 15,
      publicLocationLabel: "Synthetic Pharmacy Location",
      publicSlotReferenceTtlSeconds: 900,
      maxRequestBytes: 16_384,
      maxAvailabilityWindowDays: 31,
      supportedDisplayTimezones: ["America/Toronto"],
    });

    for (const [key, value] of [
      ["TASK04_PENDING_HOLD_MINUTES", "14"],
      ["TASK04_PUBLIC_LOCATION_LABEL", ""],
      ["TASK04_PUBLIC_LOCATION_LABEL", "X".repeat(81)],
      ["TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS", "899"],
      ["TASK04_MAX_REQUEST_BYTES", "16383"],
      ["TASK04_MAX_AVAILABILITY_WINDOW_DAYS", "30"],
      ["TASK04_PUBLIC_SLOT_REFERENCE_SECRET", "too-short"],
    ]) {
      expect(() =>
        parseTask04SandboxEnv(
          { ...validEnv(), [key]: value },
          new Date("2026-08-04T00:00:00.000Z"),
        ),
      ).toThrow(
        "SANDBOX_CONFIG_DENIED:TASK04_MISSING_OR_MALFORMED_VARIABLE",
      );
    }
  });

  it("never prints or reflects the slot-reference secret", () => {
    const secret = "SYNTHETIC_SLOT_REFERENCE_SECRET_MUST_NOT_APPEAR";
    const input = {
      ...validEnv(),
      TASK04_PUBLIC_SLOT_REFERENCE_SECRET: secret,
      TASK04_MAX_REQUEST_BYTES: "invalid",
    };
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    let failure: unknown;
    try {
      parseTask04SandboxEnv(
        input,
        new Date("2026-08-04T00:00:00.000Z"),
      );
    } catch (error) {
      failure = error;
    }
    expect((failure as Error).message).toBe(
      "SANDBOX_CONFIG_DENIED:TASK04_MISSING_OR_MALFORMED_VARIABLE",
    );
    expect((failure as Error).message).not.toContain(secret);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("keeps the synthetic availability cache optional and bounded", () => {
    expect(
      parseTask04SandboxEnv(
        validEnv(),
        new Date("2026-08-04T00:00:00.000Z"),
      ).availabilityCacheTtlSeconds,
    ).toBeUndefined();
    expect(
      parseTask04SandboxEnv(
        {
          ...validEnv(),
          TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS: "60",
        },
        new Date("2026-08-04T00:00:00.000Z"),
      ).availabilityCacheTtlSeconds,
    ).toBe(60);
    for (const invalid of ["0", "61", "1.5", "invalid"]) {
      expect(() =>
        parseTask04SandboxEnv(
          {
            ...validEnv(),
            TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS:
              invalid,
          },
          new Date("2026-08-04T00:00:00.000Z"),
        ),
      ).toThrow(
        "SANDBOX_CONFIG_DENIED:TASK04_MISSING_OR_MALFORMED_VARIABLE",
      );
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
