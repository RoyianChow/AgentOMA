import { describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/auth-guard";

/**
 * End-to-end wiring for the AI-RX-06 route.
 *
 * The parser, gate, and metrics each have their own unit tests. This file tests
 * the seam they meet at — the server action — because that is where a working
 * parser and a working gate can still be assembled wrongly: checked in the wrong
 * order, refusing the wrong roles, or quietly accepting input it should not.
 *
 * Both `@/env` and `@/lib/auth-guard` are mocked. The action's job is to call
 * them in the right order and honour their answers; whether the real guard is
 * correct is `auth-guard`'s own concern.
 */

const envMock = vi.hoisted(() => ({
  AI_KILL_SWITCH: false as boolean,
  RX_INTAKE_SYNTHETIC_ENABLED: true as boolean,
  RX_INTAKE_EXPIRES_ON: undefined as string | undefined,
}));

const authMock = vi.hoisted(() => ({
  requirePortalUser: vi.fn(),
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>();
  return { ...actual, requirePortalUser: authMock.requirePortalUser };
});

const { extractSyntheticPrescriptionAction } = await import("../actions");

function signedInAs(role: string) {
  authMock.requirePortalUser.mockReset();
  authMock.requirePortalUser.mockResolvedValue({
    userId: "user-1",
    pharmacyId: "pharmacy-1",
    role,
    name: "Test Pharmacist",
    email: "test@example.com",
    supervisingPharmacistId: null,
  });
}

function configure(overrides: Partial<typeof envMock> = {}) {
  envMock.AI_KILL_SWITCH = false;
  envMock.RX_INTAKE_SYNTHETIC_ENABLED = true;
  envMock.RX_INTAKE_EXPIRES_ON = undefined;
  Object.assign(envMock, overrides);
}

describe("happy path", () => {
  it("returns a real extraction for a corpus fixture", async () => {
    configure();
    signedInAs("pharmacist");

    const result = await extractSyntheticPrescriptionAction({
      corpusFixtureId: "clean-001",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.extraction.corpusFixtureId).toBe("clean-001");
    expect(result.extraction.synthetic).toBe(true);
    expect(result.extraction.status).toBe("requires_human_review");

    // The parser genuinely ran — not a stub returning an empty shell.
    const medication = result.extraction.fields.find((f) => f.key === "medicationName");
    expect(medication?.value).toBe("Amoxicillin");
    expect(medication?.sourceLine).toBeGreaterThan(0);
  });

  it("serves every fixture in the corpus", async () => {
    configure();
    signedInAs("pharmacy_admin");

    for (const id of [
      "clean-001",
      "noisy-002",
      "missing-003",
      "controlled-004",
      "contradictory-005",
    ]) {
      const result = await extractSyntheticPrescriptionAction({ corpusFixtureId: id });
      expect(result.ok, id).toBe(true);
    }
  });
});

describe("the gate is checked before the session", () => {
  // A disabled capability must not confirm its own existence to an
  // unauthenticated caller, and the kill switch must not depend on a session
  // lookup succeeding. Order is the property under test.

  it("refuses on the kill switch without ever calling the auth guard", async () => {
    configure({ AI_KILL_SWITCH: true });
    signedInAs("pharmacist");

    const result = await extractSyntheticPrescriptionAction({
      corpusFixtureId: "clean-001",
    });

    expect(result.ok).toBe(false);
    expect(authMock.requirePortalUser).not.toHaveBeenCalled();
  });

  it("refuses when the flag is off, without calling the auth guard", async () => {
    configure({ RX_INTAKE_SYNTHETIC_ENABLED: false });
    signedInAs("pharmacist");

    const result = await extractSyntheticPrescriptionAction({
      corpusFixtureId: "clean-001",
    });

    expect(result.ok).toBe(false);
    expect(authMock.requirePortalUser).not.toHaveBeenCalled();
  });

  it("refuses when the experiment has expired", async () => {
    configure({ RX_INTAKE_EXPIRES_ON: "2020-01-01" });
    signedInAs("pharmacist");

    const result = await extractSyntheticPrescriptionAction({
      corpusFixtureId: "clean-001",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/expiry/i);
  });
});

describe("authorization", () => {
  it("requires the assessing roles", async () => {
    configure();
    signedInAs("pharmacist");

    await extractSyntheticPrescriptionAction({ corpusFixtureId: "clean-001" });

    const [roles] = authMock.requirePortalUser.mock.calls[0];
    expect(roles).toEqual(["pharmacy_admin", "pharmacist"]);
  });

  it("returns a refusal — not a throw — when the guard rejects", async () => {
    configure();
    authMock.requirePortalUser.mockReset();
    authMock.requirePortalUser.mockRejectedValue(
      new AuthorizationError("FORBIDDEN_ROLE"),
    );

    const result = await extractSyntheticPrescriptionAction({
      corpusFixtureId: "clean-001",
    });

    expect(result).toEqual({ ok: false, message: "Not authorized." });
  });

  it("does not leak an unexpected error to the client", async () => {
    configure();
    authMock.requirePortalUser.mockReset();
    authMock.requirePortalUser.mockRejectedValue(new Error("database on fire"));

    // A non-authorization failure must propagate rather than be swallowed into
    // a friendly refusal that hides a real fault.
    await expect(
      extractSyntheticPrescriptionAction({ corpusFixtureId: "clean-001" }),
    ).rejects.toThrow("database on fire");
  });
});

describe("input is confined to the built-in corpus", () => {
  it("refuses an unknown fixture id", async () => {
    configure();
    signedInAs("pharmacist");

    const result = await extractSyntheticPrescriptionAction({
      corpusFixtureId: "does-not-exist",
    });

    expect(result).toEqual({ ok: false, message: "Unknown synthetic fixture." });
  });

  it("refuses raw document text — there is no path for caller-supplied input", async () => {
    configure();
    signedInAs("pharmacist");

    // The shape a PHI leak would take: someone passing a real prescription
    // instead of a fixture id. It must not parse, and must not be echoed back.
    const result = await extractSyntheticPrescriptionAction({
      text: "Patient: Real Person\nDOB: 1980-01-01\nRx: Amoxicillin 500 mg",
      corpusFixtureId: "clean-001\nPatient: Real Person",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe("Unknown synthetic fixture.");
    expect(JSON.stringify(result)).not.toMatch(/Real Person/);
  });

  it.each([null, undefined, 42, "clean-001", { corpusFixtureId: "" }, {}])(
    "rejects malformed input %s",
    async (input) => {
      configure();
      signedInAs("pharmacist");
      const result = await extractSyntheticPrescriptionAction(input);
      expect(result.ok).toBe(false);
    },
  );

  it("refuses an over-long id rather than parsing it", async () => {
    configure();
    signedInAs("pharmacist");
    const result = await extractSyntheticPrescriptionAction({
      corpusFixtureId: "x".repeat(500),
    });
    expect(result).toEqual({ ok: false, message: "Invalid request." });
  });
});
