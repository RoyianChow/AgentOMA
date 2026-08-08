import { TextEncoder } from "node:util";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MANAGEMENT_ACTIONS,
  createTask04BookingSchemas,
} from "../booking/contracts";
import {
  createTask04BookingConfirmFingerprint,
} from "../booking/idempotency";
import {
  TASK04_SAFE_ERROR_MESSAGES,
} from "../booking/safe-errors";
import {
  buildTask04BookingConfirmEvidence,
  executeTask04BookingConfirm,
  TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY,
} from "../db/booking-confirm";
import { executeTask04BookingRetrieve } from "../db/booking-retrieve";
import type { Task04SandboxSql } from "../db/client";
import {
  parseTask04SandboxEnv,
  task04SyntheticEnvironmentInput,
} from "../env/server";
import { TASK04_SYNTHETIC_REFERENCES } from "../fixtures/synthetic";

const encoder = new TextEncoder();
const environment = parseTask04SandboxEnv(
  task04SyntheticEnvironmentInput(),
  new Date("2026-08-02T00:00:00.000Z"),
);
const schemas = createTask04BookingSchemas({
  maxAccessibilitySelections:
    environment.maxAccessibilitySelections,
  supportedDisplayTimezones:
    environment.supportedDisplayTimezones,
});
const bookingReference = "SYNTH-BOOKING-TASK04-CONFIRM-0001";
const validConfirmRequest = Object.freeze({
  bookingReference,
  expectedAggregateVersion: 1,
  idempotencyKey: "SYNTH-IDEMPOTENCY-CONFIRM-0001",
});
const validRetrieveRequest = Object.freeze({
  bookingReference,
  managementAuthorization: {
    channel: "server_session_bound" as const,
    capabilityReference:
      "SYNTH-CAPABILITY-TASK04-RETRIEVE-0001",
  },
});

function unavailableSql(): Task04SandboxSql {
  return Object.freeze({}) as Task04SandboxSql;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Task 04 booking:retrieve boundary", () => {
  it("accepts only the exact reusable-capability request", () => {
    expect(
      schemas.bookingRetrieveRequestSchema.parse(
        validRetrieveRequest,
      ),
    ).toEqual(validRetrieveRequest);
    for (const field of [
      "pharmacyId",
      "tenantId",
      "actorReference",
      "subjectReference",
      "sessionBinding",
      "status",
      "capacity",
      "role",
      "clinicalNotes",
    ]) {
      expect(
        schemas.bookingRetrieveRequestSchema.safeParse({
          ...validRetrieveRequest,
          [field]: "SYNTHETIC-FORBIDDEN",
        }).success,
      ).toBe(false);
    }
  });

  it("returns only the exact minimized booking display contract", () => {
    const data = {
      bookingReference,
      status: "pending_confirmation",
      serviceCategoryLabel: "Synthetic administrative service",
      modality: "in_person",
      startTimeUtc: "2026-08-04T14:00:00.000Z",
      endTimeUtc: "2026-08-04T14:30:00.000Z",
      displayTimezone: "America/Toronto",
      allowedActions: ["none"],
      syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
    };
    expect(
      schemas.bookingRetrieveResponseDataSchema.parse(data),
    ).toEqual(data);
    for (const prohibitedField of [
      "slotId",
      "capacityUnitId",
      "holdId",
      "pharmacyId",
      "staffReference",
      "credentialDigest",
      "serverSessionBinding",
      "syntheticContactReference",
    ]) {
      expect(
        schemas.bookingRetrieveResponseDataSchema.safeParse({
          ...data,
          [prohibitedField]: "SYNTHETIC-FORBIDDEN",
        }).success,
      ).toBe(false);
    }
  });

  it("rejects invalid requests before database access without logging them", async () => {
    const consoleSpies = [
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
    ];
    const malformed = await executeTask04BookingRetrieve(
      unavailableSql(),
      environment,
      {
        ...validRetrieveRequest,
        internalSlotId: "SYNTH-SLOT-FORBIDDEN-0001",
      },
    );
    expect(malformed).toEqual({
      success: false,
      error: {
        code: "REQUEST_INVALID",
        message: TASK04_SAFE_ERROR_MESSAGES.REQUEST_INVALID,
      },
    });
    for (const spy of consoleSpies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});

describe("Task 04 booking:confirm boundary", () => {
  it("keeps the trusted staff identity and permission server-owned", () => {
    expect(TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY).toEqual({
      actorType: "synthetic_staff",
      actorReference: TASK04_SYNTHETIC_REFERENCES.pharmacist,
      subjectType: "synthetic_patient",
      sessionReference:
        "SYNTH-STAFF-SESSION-TASK04-0001",
      sessionActive: true,
      permissions: ["booking:confirm"],
    });
    expect(
      TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY.actorReference,
    ).not.toBe(TASK04_SYNTHETIC_REFERENCES.patient);
    expect(MANAGEMENT_ACTIONS).not.toContain("booking:confirm");
  });

  it("accepts only the exact canonical confirm request", () => {
    expect(
      schemas.bookingConfirmRequestSchema.parse(
        validConfirmRequest,
      ),
    ).toEqual(validConfirmRequest);
    for (const field of [
      "pharmacyId",
      "tenantId",
      "actorReference",
      "subjectReference",
      "staffReference",
      "role",
      "permission",
      "bookingStatus",
      "holdStatus",
      "capacity",
      "clinicalNotes",
      "metadata",
      "managementAuthorization",
    ]) {
      expect(
        schemas.bookingConfirmRequestSchema.safeParse({
          ...validConfirmRequest,
          [field]: "SYNTHETIC-FORBIDDEN",
        }).success,
      ).toBe(false);
    }
  });

  it("uses the canonical operation-specific idempotency fingerprint", () => {
    const fingerprint = createTask04BookingConfirmFingerprint({
      operation: "booking:confirm",
      actorReference:
        TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY.actorReference,
      resourceScopeReference: bookingReference,
      request: validConfirmRequest,
    });
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain(bookingReference);
    expect(fingerprint).not.toContain(
      validConfirmRequest.idempotencyKey,
    );
    expect(
      createTask04BookingConfirmFingerprint({
        operation: "booking:confirm",
        actorReference:
          TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY.actorReference,
        resourceScopeReference: bookingReference,
        request: {
          ...validConfirmRequest,
          expectedAggregateVersion: 2,
        },
      }),
    ).not.toBe(fingerprint);
  });

  it("builds only the canonical minimized result, audit, and event", () => {
    const evidence = buildTask04BookingConfirmEvidence({
      bookingReference,
      subjectReference: TASK04_SYNTHETIC_REFERENCES.patient,
      aggregateVersion: 2,
      receiptId: "SYNTH-IDEM-TASK04-CONFIRM-0001",
      auditId: "SYNTH-AUDIT-TASK04-CONFIRM-0001",
      eventId: "SYNTH-EVENT-TASK04-CONFIRM-0001",
      maxAccessibilitySelections:
        environment.maxAccessibilitySelections,
      maxPageSize: environment.maxPageSize,
      supportedDisplayTimezones:
        environment.supportedDisplayTimezones,
    });
    expect(evidence.responseData).toEqual({
      bookingReference,
      status: "confirmed",
      holdStatus: "consumed",
    });
    expect(evidence.audit).toMatchObject({
      operation: "booking:confirm",
      actorType: "synthetic_staff",
      priorState: "pending_confirmation",
      resultingState: "confirmed",
      safeReasonCode: "STAFF_CONFIRMED",
      aggregateVersion: 2,
    });
    expect(evidence.outbox).toEqual({
      eventId: "SYNTH-EVENT-TASK04-CONFIRM-0001",
      eventType: "booking.confirmed",
      eventSchemaVersion: 1,
      aggregateType: "booking",
      aggregateId: bookingReference,
      aggregateVersion: 2,
      actorType: "synthetic_staff",
      safeReasonCode: "STAFF_CONFIRMED",
      payload: {
        previousState: "pending_confirmation",
        resultingState: "confirmed",
        capacityOwner: "booking",
      },
    });
    expect(JSON.stringify(evidence)).not.toMatch(
      /contact|accessibility|credential|token|clinical|sql|metadata/i,
    );
  });

  it("enforces raw bytes and strict parsing before database access without logging", async () => {
    const consoleSpies = [
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "error").mockImplementation(() => undefined),
    ];
    const prohibited = await executeTask04BookingConfirm(
      unavailableSql(),
      environment,
      encoder.encode(
        JSON.stringify({
          ...validConfirmRequest,
          role: "synthetic_staff",
        }),
      ),
    );
    expect(prohibited).toEqual({
      success: false,
      error: {
        code: "REQUEST_INVALID",
        message: TASK04_SAFE_ERROR_MESSAGES.REQUEST_INVALID,
      },
    });
    const oversized = await executeTask04BookingConfirm(
      unavailableSql(),
      environment,
      new Uint8Array(environment.maxRequestBytes + 1),
    );
    expect(oversized).toEqual(prohibited);
    for (const spy of consoleSpies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });

});
