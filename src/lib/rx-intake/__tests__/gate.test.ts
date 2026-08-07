import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * AI-RX-06 availability gate.
 *
 * `@/env` is mocked rather than driven through real environment variables:
 * the pure test config sets SKIP_ENV_VALIDATION, so t3-env passes raw strings
 * straight through and `"false"` would arrive as a truthy string. Mocking the
 * resolved module tests the precedence logic itself, which is the part that can
 * actually be got wrong.
 */

const envMock = vi.hoisted(() => ({
  AI_KILL_SWITCH: false as boolean,
  RX_INTAKE_SYNTHETIC_ENABLED: false as boolean,
  RX_INTAKE_EXPIRES_ON: undefined as string | undefined,
}));

vi.mock("@/env", () => ({ env: envMock }));

function configure(overrides: Partial<typeof envMock>) {
  envMock.AI_KILL_SWITCH = false;
  envMock.RX_INTAKE_SYNTHETIC_ENABLED = false;
  envMock.RX_INTAKE_EXPIRES_ON = undefined;
  Object.assign(envMock, overrides);
}

const { rxIntakeGate, assertRxIntakeEnabled, RxCapabilityDisabledError } = await import(
  "../gate"
);

afterEach(() => vi.clearAllMocks());

describe("default posture", () => {
  it("is disabled when nothing is configured", () => {
    configure({});
    expect(rxIntakeGate()).toMatchObject({ enabled: false, reason: "DISABLED" });
  });

  it("is enabled only by an explicit flag", () => {
    configure({ RX_INTAKE_SYNTHETIC_ENABLED: true });
    expect(rxIntakeGate().enabled).toBe(true);
  });
});

describe("precedence", () => {
  it("the kill switch beats an enabled flag", () => {
    configure({ RX_INTAKE_SYNTHETIC_ENABLED: true, AI_KILL_SWITCH: true });
    expect(rxIntakeGate()).toMatchObject({ enabled: false, reason: "KILL_SWITCH" });
  });

  it("the kill switch beats a valid expiry", () => {
    configure({
      RX_INTAKE_SYNTHETIC_ENABLED: true,
      AI_KILL_SWITCH: true,
      RX_INTAKE_EXPIRES_ON: "2099-01-01",
    });
    expect(rxIntakeGate()).toMatchObject({ enabled: false, reason: "KILL_SWITCH" });
  });

  it("expiry beats an enabled flag", () => {
    configure({
      RX_INTAKE_SYNTHETIC_ENABLED: true,
      RX_INTAKE_EXPIRES_ON: "2020-01-01",
    });
    expect(rxIntakeGate()).toMatchObject({ enabled: false, reason: "EXPIRED" });
  });
});

describe("expiry boundary", () => {
  const EXPIRES = "2026-08-07";

  it("is live throughout the expiry day in Toronto", () => {
    configure({ RX_INTAKE_SYNTHETIC_ENABLED: true, RX_INTAKE_EXPIRES_ON: EXPIRES });
    // 23:30 Toronto on the expiry date = 03:30 UTC the following day. A naive
    // UTC comparison would already call this expired; it must not.
    expect(rxIntakeGate(new Date("2026-08-08T03:30:00Z")).enabled).toBe(true);
  });

  it("is dead once Toronto rolls past the expiry day", () => {
    configure({ RX_INTAKE_SYNTHETIC_ENABLED: true, RX_INTAKE_EXPIRES_ON: EXPIRES });
    // 00:30 Toronto on the 8th = 04:30 UTC on the 8th.
    expect(rxIntakeGate(new Date("2026-08-08T04:30:00Z"))).toMatchObject({
      enabled: false,
      reason: "EXPIRED",
    });
  });

  it("reports the expiry date even while disabled", () => {
    configure({ RX_INTAKE_EXPIRES_ON: EXPIRES });
    expect(rxIntakeGate().expiresOn).toBe(EXPIRES);
  });
});

describe("assertRxIntakeEnabled", () => {
  it("throws a typed refusal carrying the reason", () => {
    configure({ AI_KILL_SWITCH: true });
    expect(() => assertRxIntakeEnabled()).toThrowError(RxCapabilityDisabledError);
    try {
      assertRxIntakeEnabled();
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as InstanceType<typeof RxCapabilityDisabledError>).reason).toBe(
        "KILL_SWITCH",
      );
    }
  });

  it("is silent when enabled", () => {
    configure({ RX_INTAKE_SYNTHETIC_ENABLED: true });
    expect(() => assertRxIntakeEnabled()).not.toThrow();
  });
});
