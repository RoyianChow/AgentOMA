import { describe, expect, it, vi } from "vitest";

import {
  createTask04AvailabilitySchemas,
  type Task04AvailabilityRequest,
} from "../booking/availability-contracts";
import {
  createTask04AvailabilityCacheKey,
  createTask04AvailabilityCachePolicy,
} from "../db/availability-cache";
import {
  createTask04PublicSlotReferenceService,
  task04ConstantTimeSignatureMatches,
} from "../db/public-slot-reference";
import { sandboxPharmacyIdSchema } from "../env/server";

const PHARMACY_ID = "SYNTH-PHARMACY-TASK04-LOCAL";
const OTHER_PHARMACY_ID = "SYNTH-PHARMACY-TASK04-OTHER";
const SECRET =
  "SYNTHETIC_TASK04_SLOT_REFERENCE_UNIT_TEST_SECRET";
const NOW = "2026-08-02T12:00:00.000Z";
const BINDING = Object.freeze({
  slotId: "SYNTH-SLOT-TASK04-0001",
  serviceCategoryId: "SYNTH-SERVICE-TASK04-0001",
  modality: "in_person" as const,
});
const NONCE = new Uint8Array(16).fill(7);

function service(pharmacyId = PHARMACY_ID) {
  return createTask04PublicSlotReferenceService({
    pharmacyId,
    secret: SECRET,
    ttlSeconds: 900,
  });
}

function resolutionRequest(slotReference: string) {
  return { slotReference };
}

describe("Task 04 public slot references", () => {
  it("encodes only fixed version, expiry, nonce, and authenticator fields", () => {
    const issued = service().issue(BINDING, NOW, NONCE);
    expect(issued.slotReference).toMatch(/^[A-Za-z0-9_-]{16,160}$/);
    expect(issued.expiresAtUtc).toBe("2026-08-02T12:15:00.000Z");
    const bytes = Buffer.from(issued.slotReference, "base64url");
    expect(bytes).toHaveLength(1 + 8 + 16 + 32);
    expect(bytes.readUInt8(0)).toBe(1);
    expect(Number(bytes.readBigUInt64BE(1))).toBe(
      Date.parse(issued.expiresAtUtc),
    );
    expect(bytes.subarray(9, 25)).toEqual(Buffer.from(NONCE));
    expect(bytes.subarray(25)).toHaveLength(32);
    expect(bytes.subarray(25).every((byte) => byte === 0)).toBe(
      false,
    );
    expect(issued.slotReference).not.toContain(BINDING.slotId);
    expect(issued.slotReference).not.toContain(PHARMACY_ID);
    expect(issued.slotReference).not.toContain(
      BINDING.serviceCategoryId,
    );
    expect(bytes.includes(Buffer.from(BINDING.slotId))).toBe(false);
    expect(issued.slotReference).not.toContain(
      Buffer.from(BINDING.slotId).toString("base64url"),
    );
  });

  it("uses fresh nonces for the same slot and trusted instant", () => {
    const first = service().issue(BINDING, NOW);
    const second = service().issue(BINDING, NOW);
    const firstBytes = Buffer.from(first.slotReference, "base64url");
    const secondBytes = Buffer.from(
      second.slotReference,
      "base64url",
    );
    expect(first.slotReference).not.toBe(second.slotReference);
    expect(firstBytes.subarray(9, 25)).not.toEqual(
      secondBytes.subarray(9, 25),
    );
  });

  it("keeps service-category references opaque and scope bound", () => {
    const categoryReference =
      service().issueServiceCategoryReference(
        BINDING.serviceCategoryId,
      );
    expect(categoryReference).toMatch(/^[A-Za-z0-9_-]{16,160}$/);
    expect(categoryReference).not.toContain(
      BINDING.serviceCategoryId,
    );
    expect(
      service().resolveServiceCategoryReference(
        categoryReference,
        [BINDING.serviceCategoryId],
      ),
    ).toBe(BINDING.serviceCategoryId);
  });

  it("resolves the exact bound slot using only slotReference", () => {
    const issued = service().issue(BINDING, NOW, NONCE);
    expect(
      service().resolve(
        resolutionRequest(issued.slotReference),
        [BINDING],
        "2026-08-02T12:14:59.999Z",
      ),
    ).toEqual(BINDING);
  });

  it.each([
    ["malformed", "not+base64url"],
    ["truncated", "AbCdEfGhIjKlMnOp"],
  ])("fails generically for a %s reference", (_label, reference) => {
    expect(() =>
      service().resolve(
        resolutionRequest(reference),
        [BINDING],
        NOW,
      ),
    ).toThrow("TASK04_SLOT_REFERENCE_DENIED");
  });

  it("fails generically for tampered and expired references", () => {
    const issued = service().issue(BINDING, NOW, NONCE);
    const lastCharacter = issued.slotReference.at(-1);
    const tampered = `${issued.slotReference.slice(0, -1)}${
      lastCharacter === "A" ? "B" : "A"
    }`;
    for (const [reference, now] of [
      [tampered, NOW],
      [issued.slotReference, "2026-08-02T12:15:00.000Z"],
    ]) {
      expect(() =>
        service().resolve(
          resolutionRequest(reference),
          [BINDING],
          now,
        ),
      ).toThrow("TASK04_SLOT_REFERENCE_DENIED");
    }
  });

  it("fails generically across scope, service, modality, and stale candidates", () => {
    const issued = service().issue(BINDING, NOW, NONCE);
    const cases = [
      () =>
        service(OTHER_PHARMACY_ID).resolve(
          resolutionRequest(issued.slotReference),
          [BINDING],
          NOW,
        ),
      () =>
        service().resolve(
          resolutionRequest(issued.slotReference),
          [
            {
              ...BINDING,
              serviceCategoryId:
                "SYNTH-SERVICE-TASK04-OTHER",
            },
          ],
          NOW,
        ),
      () =>
        service().resolve(
          resolutionRequest(issued.slotReference),
          [{ ...BINDING, modality: "telephone" }],
          NOW,
        ),
      () =>
        service().resolve(
          resolutionRequest(issued.slotReference),
          [],
          NOW,
        ),
    ];
    for (const resolve of cases) {
      expect(resolve).toThrow("TASK04_SLOT_REFERENCE_DENIED");
    }
  });

  it("fails closed on ambiguous candidate matches", () => {
    const issued = service().issue(BINDING, NOW, NONCE);
    expect(() =>
      service().resolve(
        resolutionRequest(issued.slotReference),
        [BINDING, { ...BINDING }],
        NOW,
      ),
    ).toThrow("TASK04_SLOT_REFERENCE_DENIED");
  });

  it("rejects any caller-supplied selection facts", () => {
    const issued = service().issue(BINDING, NOW, NONCE);
    for (const field of [
      "serviceCategoryRef",
      "modality",
      "pharmacyId",
      "slotId",
    ]) {
      expect(() =>
        service().resolve(
          {
            slotReference: issued.slotReference,
            [field]: "SYNTHETIC_CALLER_SELECTION",
          },
          [BINDING],
          NOW,
        ),
      ).toThrow("TASK04_SLOT_REFERENCE_DENIED");
    }
  });

  it("uses the constant-time comparison path for equal-length signatures", () => {
    const expected = new Uint8Array(32).fill(1);
    const same = new Uint8Array(32).fill(1);
    const different = new Uint8Array(32).fill(1);
    different[31] = 2;
    expect(task04ConstantTimeSignatureMatches(same, expected)).toBe(true);
    expect(
      task04ConstantTimeSignatureMatches(different, expected),
    ).toBe(false);
    expect(
      task04ConstantTimeSignatureMatches(
        new Uint8Array(31),
        expected,
      ),
    ).toBe(false);
  });

  it("issues opaque availability cursors bound to scope and query", () => {
    const queryFingerprint = "a".repeat(64);
    const otherQueryFingerprint = "b".repeat(64);
    const cursor = service().issueAvailabilityCursor(
      queryFingerprint,
      10,
    );
    expect(cursor).toMatch(/^[A-Za-z0-9_-]{16,160}$/);
    expect(cursor).not.toContain(PHARMACY_ID);
    expect(
      service().resolveAvailabilityCursor(
        cursor,
        queryFingerprint,
      ),
    ).toBe(10);

    const lastCharacter = cursor.at(-1);
    const tampered = `${cursor.slice(0, -1)}${
      lastCharacter === "A" ? "B" : "A"
    }`;
    for (const resolve of [
      () =>
        service().resolveAvailabilityCursor(
          cursor,
          otherQueryFingerprint,
        ),
      () =>
        service(OTHER_PHARMACY_ID).resolveAvailabilityCursor(
          cursor,
          queryFingerprint,
        ),
      () =>
        service().resolveAvailabilityCursor(
          tampered,
          queryFingerprint,
        ),
    ]) {
      expect(resolve).toThrow("TASK04_SLOT_REFERENCE_DENIED");
    }
  });

  it("never logs or reflects the secret or reference", () => {
    const issued = service().issue(BINDING, NOW, NONCE);
    const consoleLog = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    let failure: unknown;
    try {
      service().resolve(
        resolutionRequest(`${issued.slotReference}A`),
        [BINDING],
        NOW,
      );
    } catch (error) {
      failure = error;
    }
    expect((failure as Error).message).toBe(
      "TASK04_SLOT_REFERENCE_DENIED",
    );
    expect((failure as Error).message).not.toContain(SECRET);
    expect((failure as Error).message).not.toContain(
      issued.slotReference,
    );
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleLog.mockRestore();
    consoleError.mockRestore();
  });
});

describe("Task 04 availability cache policy", () => {
  it("never outlives a slot reference and keeps HTTP no-store", () => {
    expect(
      createTask04AvailabilityCachePolicy({
        configuredTtlSeconds: 60,
        trustedNowUtc: NOW,
        earliestSlotReferenceExpiresAtUtc:
          "2026-08-02T12:00:30.000Z",
        resultKind: "success",
        containsCorrelationReference: false,
      }),
    ).toEqual({
      serverCache: "eligible",
      ttlSeconds: 30,
      httpCacheControl: "no-store",
      cacheErrors: false,
      bookingRevalidationRequired: true,
    });
  });

  it("bypasses errors even without correlation references", () => {
    expect(
      createTask04AvailabilityCachePolicy({
        configuredTtlSeconds: 60,
        trustedNowUtc: NOW,
        earliestSlotReferenceExpiresAtUtc:
          "2026-08-02T12:15:00.000Z",
        resultKind: "error",
        containsCorrelationReference: false,
      }),
    ).toMatchObject({
      serverCache: "bypass",
      ttlSeconds: 0,
      cacheErrors: false,
    });
  });

  it("bypasses successful results containing a correlation-like field", () => {
    expect(
      createTask04AvailabilityCachePolicy({
        configuredTtlSeconds: 60,
        trustedNowUtc: NOW,
        earliestSlotReferenceExpiresAtUtc:
          "2026-08-02T12:15:00.000Z",
        resultKind: "success",
        containsCorrelationReference: true,
      }),
    ).toMatchObject({
      serverCache: "bypass",
      ttlSeconds: 0,
    });
  });

  it("bypasses missing TTL and stale references", () => {
    for (const input of [
      {
        resultKind: "success" as const,
        containsCorrelationReference: false,
        earliestSlotReferenceExpiresAtUtc:
          "2026-08-02T12:15:00.000Z",
      },
      {
        configuredTtlSeconds: 60,
        resultKind: "success" as const,
        containsCorrelationReference: false,
        earliestSlotReferenceExpiresAtUtc: NOW,
      },
    ]) {
      expect(
        createTask04AvailabilityCachePolicy({
          trustedNowUtc: NOW,
          ...input,
        }).serverCache,
      ).toBe("bypass");
    }
  });

  it("never gives the server cache a lifetime beyond reference expiry", () => {
    const policy = createTask04AvailabilityCachePolicy({
      configuredTtlSeconds: 60,
      trustedNowUtc: "2026-08-02T12:00:00.999Z",
      earliestSlotReferenceExpiresAtUtc:
        "2026-08-02T12:00:30.001Z",
      resultKind: "success",
      containsCorrelationReference: false,
    });
    expect(policy.ttlSeconds).toBe(29);
    expect(policy.ttlSeconds * 1_000).toBeLessThanOrEqual(
      Date.parse("2026-08-02T12:00:30.001Z") -
        Date.parse("2026-08-02T12:00:00.999Z"),
    );
  });

  it("builds a deterministic scope- and query-bound cache key", () => {
    const availabilityRequestSchema =
      createTask04AvailabilitySchemas({
        maxPageSize: 10,
        maxAvailabilityWindowDays: 31,
        publicLocationLabel: "Synthetic Pharmacy Location",
        supportedDisplayTimezones: ["America/Toronto"],
      }).availabilityRequestSchema;
    const request = availabilityRequestSchema.parse({
      serviceCategoryRef: BINDING.serviceCategoryId,
      modality: BINDING.modality,
      startDate: "2026-08-02",
      endDate: "2026-08-04",
      timezone: "America/Toronto",
      pageSize: 10,
    }) satisfies Task04AvailabilityRequest;
    const pharmacyId = sandboxPharmacyIdSchema.parse(PHARMACY_ID);
    const first = createTask04AvailabilityCacheKey({
      pharmacyId,
      request,
      resolvedPageSize: 10,
    });
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(
      createTask04AvailabilityCacheKey({
        pharmacyId,
        request,
        resolvedPageSize: 10,
      }),
    ).toBe(first);
    expect(
      createTask04AvailabilityCacheKey({
        pharmacyId,
        request: { ...request, modality: "telephone" },
        resolvedPageSize: 10,
      }),
    ).not.toBe(first);
  });
});
