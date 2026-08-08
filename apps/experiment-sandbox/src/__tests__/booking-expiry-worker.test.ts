import { describe, expect, it } from "vitest";

import {
  createTask04BookingExpiryWorkerSchemas,
} from "../booking/booking-expiry-contracts";
import {
  createTask04BookingExpireFingerprint,
} from "../booking/idempotency";
import {
  task04ErrorCodeIsAllowed,
} from "../booking/safe-errors";
import {
  buildTask04BookingExpiryEvidence,
} from "../db/booking-expiry-worker";
import {
  task04ApprovalAndLifecycleAreActive,
} from "../db/authoritative-context";
import {
  parseTask04SandboxEnv,
  task04SyntheticEnvironmentInput,
} from "../env/server";
import { TASK04_SYNTHETIC_REFERENCES } from "../fixtures/synthetic";

const LIMITS = Object.freeze({ maxBatchSize: 10 });
const REFERENCE = "SYNTH-BOOKING-EXPIRY-REFERENCE-0001";
const HOLD_REFERENCE = "SYNTH-HOLD-EXPIRY-REFERENCE-0001";
const RECEIPT = "SYNTH-IDEM-EXPIRY-RECEIPT-0001";
const LIFECYCLE_EXPIRY = "2026-08-05T23:59:59.999Z";

function environment() {
  return parseTask04SandboxEnv(
    task04SyntheticEnvironmentInput(),
    new Date("2026-08-04T00:00:00.000Z"),
  );
}

describe("Task 04 booking expiry worker contracts", () => {
  it("accepts only strict bounded server-owned controls", () => {
    const schemas = createTask04BookingExpiryWorkerSchemas(LIMITS);

    expect(
      schemas.workerControlSchema.parse({ maxBatchSize: 10 }),
    ).toEqual({ maxBatchSize: 10 });
    for (const invalid of [
      {},
      { maxBatchSize: 0 },
      { maxBatchSize: 11 },
      { maxBatchSize: 1, bookingId: REFERENCE },
      { maxBatchSize: 1, trustedTime: LIFECYCLE_EXPIRY },
      { maxBatchSize: 1, pharmacyId: "SYNTH-PHARMACY-OTHER" },
    ]) {
      expect(
        schemas.workerControlSchema.safeParse(invalid).success,
      ).toBe(false);
    }
  });

  it("returns only internally consistent minimized counts", () => {
    const schema =
      createTask04BookingExpiryWorkerSchemas(
        LIMITS,
      ).workerSuccessSchema;
    const result = schema.parse({
      success: true,
      data: { examined: 3, expired: 2, skipped: 1 },
    });

    expect(result).toEqual({
      success: true,
      data: { examined: 3, expired: 2, skipped: 1 },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /booking|hold|capacity|actor|subject|slot|service|time|sql/i,
    );
    expect(
      schema.safeParse({
        success: true,
        data: {
          examined: 1,
          expired: 1,
          skipped: 0,
          bookingId: REFERENCE,
        },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        success: true,
        data: { examined: 1, expired: 1, skipped: 1 },
      }).success,
    ).toBe(false);
  });

  it("builds the exact approved booking and hold expiry evidence", () => {
    const evidence = buildTask04BookingExpiryEvidence({
      bookingReference: REFERENCE,
      bookingVersion: 2,
      holdReference: HOLD_REFERENCE,
      holdVersion: 2,
      subjectReference: TASK04_SYNTHETIC_REFERENCES.patient,
      receiptId: RECEIPT,
      bookingAuditId: "SYNTH-AUDIT-BOOKING-EXPIRY-0001",
      bookingEventId: "SYNTH-EVENT-BOOKING-EXPIRY-0001",
      holdAuditId: "SYNTH-AUDIT-HOLD-EXPIRY-0001",
      holdEventId: "SYNTH-EVENT-HOLD-EXPIRY-0001",
      maxAccessibilitySelections: 3,
      maxPageSize: 10,
      supportedDisplayTimezones: ["America/Toronto"],
    });

    expect(evidence.responseData).toEqual({
      bookingReference: REFERENCE,
      status: "expired",
      holdStatus: "expired",
    });
    expect(evidence.booking.outbox).toMatchObject({
      eventType: "booking.expired",
      aggregateType: "booking",
      actorType: "synthetic_system_worker",
      safeReasonCode: "CONFIRMATION_WINDOW_EXPIRED",
      payload: {
        previousState: "pending_confirmation",
        resultingState: "expired",
      },
    });
    expect(evidence.hold.outbox).toMatchObject({
      eventType: "capacity_hold.expired",
      aggregateType: "capacity_hold",
      actorType: "synthetic_system_worker",
      safeReasonCode: "HOLD_WINDOW_EXPIRED",
      payload: {
        ownerType: "pending_booking",
        resultingState: "expired",
      },
    });
    expect(evidence.booking.audit).toMatchObject({
      operation: "booking:expire",
      aggregateType: "booking",
      priorState: "pending_confirmation",
      resultingState: "expired",
    });
    expect(evidence.hold.audit).toMatchObject({
      operation: "booking:expire",
      aggregateType: "capacity_hold",
      priorState: "active",
      resultingState: "expired",
    });
  });

  it("binds worker idempotency to operation, actor, resource, and version", () => {
    const base = {
      operation: "booking:expire" as const,
      actorReference: TASK04_SYNTHETIC_REFERENCES.systemWorker,
      resourceScopeReference: REFERENCE,
      request: {
        bookingReference: REFERENCE,
        expectedAggregateVersion: 1,
        idempotencyKey: "SYNTH-IDEMPOTENCY-EXPIRY-0001",
      },
    };
    const first = createTask04BookingExpireFingerprint(base);

    expect(createTask04BookingExpireFingerprint(base)).toBe(first);
    expect(
      createTask04BookingExpireFingerprint({
        ...base,
        request: {
          ...base.request,
          expectedAggregateVersion: 2,
        },
      }),
    ).not.toBe(first);
    expect(() =>
      createTask04BookingExpireFingerprint({
        ...base,
        resourceScopeReference:
          "SYNTH-BOOKING-EXPIRY-OTHER-0001",
      }),
    ).toThrow("TASK04_FINGERPRINT_INPUT_DENIED");
  });

  it("enforces approval and lifecycle boundaries without an exception", () => {
    const activeEnvironment = environment();
    expect(
      task04ApprovalAndLifecycleAreActive(
        activeEnvironment,
        "2026-08-05T23:59:59.998Z",
      ),
    ).toBe(true);
    expect(
      task04ApprovalAndLifecycleAreActive(
        activeEnvironment,
        LIFECYCLE_EXPIRY,
      ),
    ).toBe(false);
    expect(
      task04ApprovalAndLifecycleAreActive(
        activeEnvironment,
        "2026-08-06T00:00:00.000Z",
      ),
    ).toBe(false);
  });

  it("uses only the canonical generic worker error subset", () => {
    expect(
      task04ErrorCodeIsAllowed("booking:expire", "FEATURE_DISABLED"),
    ).toBe(true);
    expect(
      task04ErrorCodeIsAllowed(
        "booking:expire",
        "TEMPORARILY_UNAVAILABLE",
      ),
    ).toBe(true);
    expect(
      task04ErrorCodeIsAllowed(
        "booking:expire",
        "SLOT_NO_LONGER_AVAILABLE",
      ),
    ).toBe(false);
  });
});
