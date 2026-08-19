import { TextEncoder } from "node:util";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  task04CommandConfigurationFromEnvironment,
} from "../booking/config";
import {
  createTask04BookingSchemas,
  type Task04BookingCreateRequest,
} from "../booking/contracts";
import {
  createTask04BookingCreateFingerprint,
} from "../booking/idempotency";
import {
  buildTask04BookingCreateEvidence,
  executeTask04BookingCreate,
  TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY,
} from "../db/booking-create";
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
const acknowledgements = Object.freeze({
  administrativeOnly: true,
  notMonitored: true,
  noMedicalDetails: true,
  notClinicalAssessment: true,
  statusControlsConfirmation: true,
});
const validRequest = Object.freeze({
  slotReference: "SYNTH-SLOT-REFERENCE-CREATE-0001",
  languagePreference: "english" as const,
  accessibilityPreferences: ["none"] as const,
  syntheticContactReference:
    TASK04_SYNTHETIC_REFERENCES.contact,
  administrativeAcknowledgements: acknowledgements,
  idempotencyKey: "SYNTH-IDEMPOTENCY-CREATE-0001",
});

function raw(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value));
}

function evidenceInput(
  status: "confirmed" | "pending_confirmation",
) {
  return {
    status,
    bookingReference: "SYNTH-BOOKING-CREATE-RESULT-0001",
    receiptId: "SYNTH-IDEMPOTENCY-RECEIPT-0001",
    auditId: "SYNTH-AUDIT-CREATE-RESULT-0001",
    eventId: "SYNTH-EVENT-CREATE-RESULT-0001",
    serviceCategoryLabel: "Synthetic administrative service",
    modality: "in_person" as const,
    startTimeUtc: "2026-08-04T14:00:00.000Z",
    endTimeUtc: "2026-08-04T14:30:00.000Z",
    displayTimezone: "America/Toronto",
    ...(status === "pending_confirmation"
      ? {
          confirmationExpiresAtUtc:
            "2026-08-02T00:15:00.000Z",
        }
      : {}),
    capabilityReference:
      "SYNTH-CAPABILITY-CREATE-RESULT-0001",
    capabilityExpiresAtUtc: "2026-08-05T23:59:59.999Z",
    maxAccessibilitySelections:
      environment.maxAccessibilitySelections,
    maxPageSize: environment.maxPageSize,
    supportedDisplayTimezones:
      environment.supportedDisplayTimezones,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Task 04 booking:create command contracts", () => {
  it("accepts only the canonical slotReference-based request", () => {
    expect(
      schemas.bookingCreateRequestSchema.parse(validRequest),
    ).toEqual(validRequest);
    for (const prohibited of [
      "slotId",
      "serviceCategoryId",
      "pharmacyId",
      "tenantId",
      "actorReference",
      "subjectReference",
      "staffId",
      "role",
      "capacity",
      "holdExpiry",
      "status",
      "symptoms",
      "diagnosis",
      "medications",
      "healthCardNumber",
      "clinicalNotes",
      "reasonForVisit",
      "metadata",
    ]) {
      expect(
        schemas.bookingCreateRequestSchema.safeParse({
          ...validRequest,
          [prohibited]: "PROHIBITED",
        }).success,
        prohibited,
      ).toBe(false);
    }
  });

  it("keeps trusted actor and subject distinct and server-owned", () => {
    expect(TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY).toEqual({
      actorType: "synthetic_delegate",
      actorReference: TASK04_SYNTHETIC_REFERENCES.delegate,
      subjectType: "synthetic_patient",
      subjectReference: TASK04_SYNTHETIC_REFERENCES.patient,
      delegationGrantReference:
        TASK04_SYNTHETIC_REFERENCES.delegationGrant,
      serverSessionBinding:
        "SYNTH-SESSION-TASK04-BOOKING-0001",
    });
    expect(
      TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorReference,
    ).not.toBe(
      TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.subjectReference,
    );
    expect(validRequest).not.toHaveProperty("actorReference");
    expect(validRequest).not.toHaveProperty("subjectReference");
  });

  it("builds the exact minimized immediate-confirmation result and event", () => {
    const evidence = buildTask04BookingCreateEvidence(
      evidenceInput("confirmed"),
    );
    expect(evidence.responseData).toEqual({
      bookingReference: "SYNTH-BOOKING-CREATE-RESULT-0001",
      status: "confirmed",
      serviceCategoryLabel: "Synthetic administrative service",
      modality: "in_person",
      startTimeUtc: "2026-08-04T14:00:00.000Z",
      endTimeUtc: "2026-08-04T14:30:00.000Z",
      displayTimezone: "America/Toronto",
      managementCapability: {
        capabilityReference:
          "SYNTH-CAPABILITY-CREATE-RESULT-0001",
        usageMode: "reusable",
        permittedActions: ["booking:view"],
        expiresAtUtc: "2026-08-05T23:59:59.999Z",
      },
      syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
    });
    expect(evidence.outbox).toMatchObject({
      eventType: "booking.confirmed",
      aggregateType: "booking",
      safeReasonCode: "IMMEDIATE_CONFIRMATION",
      payload: {
        previousState: "none",
        resultingState: "confirmed",
        capacityOwner: "booking",
      },
    });
  });

  it("builds the exact minimized pending-confirmation result and event", () => {
    const evidence = buildTask04BookingCreateEvidence(
      evidenceInput("pending_confirmation"),
    );
    expect(evidence.responseData).toMatchObject({
      status: "pending_confirmation",
      confirmationExpiresAtUtc:
        "2026-08-02T00:15:00.000Z",
    });
    expect(evidence.outbox).toMatchObject({
      eventType: "booking.created",
      safeReasonCode: "BOOKING_REQUESTED",
      payload: {
        resultingState: "pending_confirmation",
        modality: "in_person",
        startTimeUtc: "2026-08-04T14:00:00.000Z",
        endTimeUtc: "2026-08-04T14:30:00.000Z",
      },
    });
  });

  it("builds only the supported successful audit combination", () => {
    for (const status of [
      "confirmed",
      "pending_confirmation",
    ] as const) {
      expect(
        buildTask04BookingCreateEvidence(
          evidenceInput(status),
        ).audit,
      ).toEqual({
        operation: "booking:create",
        auditId: "SYNTH-AUDIT-CREATE-RESULT-0001",
        aggregateType: "booking",
        aggregateId: "SYNTH-BOOKING-CREATE-RESULT-0001",
        aggregateVersion: 1,
        actorType: "synthetic_delegate",
        subjectReference:
          TASK04_SYNTHETIC_REFERENCES.patient,
        subjectType: "synthetic_patient",
        priorState: "none",
        resultingState: status,
        safeReasonCode: "BOOKING_REQUESTED",
        idempotencyRecordId:
          "SYNTH-IDEMPOTENCY-RECEIPT-0001",
        outboxRecordId: "SYNTH-EVENT-CREATE-RESULT-0001",
      });
    }
  });

  it("keeps contact, token, clinical, and slot-reference data out of evidence", () => {
    const serialized = JSON.stringify(
      buildTask04BookingCreateEvidence(
        evidenceInput("pending_confirmation"),
      ),
    );
    expect(serialized).not.toContain(
      TASK04_SYNTHETIC_REFERENCES.contact,
    );
    expect(serialized).not.toMatch(
      /(?:token|credentialDigest|clinical|slotReference|accessibility)/i,
    );
  });

  it("creates a deterministic projection digest without storing raw safe fields", () => {
    const fingerprintRequest: Task04BookingCreateRequest = {
      ...validRequest,
      accessibilityPreferences: [
        "hearing_preparation",
        "mobility_preparation",
      ],
    };
    const fingerprintInput = {
      operation: "booking:create" as const,
      actorReference:
        TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorReference,
      resourceScopeReference: validRequest.slotReference,
      request: fingerprintRequest,
    };
    const reordered = {
      ...fingerprintInput,
      request: {
        ...fingerprintInput.request,
        accessibilityPreferences: [
          "mobility_preparation",
          "hearing_preparation",
        ] satisfies Task04BookingCreateRequest["accessibilityPreferences"],
      },
    };
    const digest =
      createTask04BookingCreateFingerprint(fingerprintInput);
    expect(digest).toBe(
      createTask04BookingCreateFingerprint(reordered),
    );
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain(
      validRequest.syntheticContactReference,
    );
    expect(digest).not.toContain(validRequest.slotReference);
    expect(
      createTask04BookingCreateFingerprint({
        ...fingerprintInput,
        request: {
          ...fingerprintInput.request,
          languagePreference: "french",
        },
      }),
    ).not.toBe(digest);
  });

  it("returns the canonical safe error for invalid raw input without logging it", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const warn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const secret = "SYNTHETIC_SECRET_MUST_NOT_BE_LOGGED";
    const result = await executeTask04BookingCreate(
      {} as Task04SandboxSql,
      environment,
      raw({ ...validRequest, arbitraryToken: secret }),
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: "REQUEST_INVALID",
        message: "We could not process that request.",
      },
    });
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("enforces the approved raw-byte limit before database access", async () => {
    const result = await executeTask04BookingCreate(
      {} as Task04SandboxSql,
      environment,
      new Uint8Array(environment.maxRequestBytes + 1),
    );
    expect(result).toEqual({
      success: false,
      error: {
        code: "REQUEST_INVALID",
        message: "We could not process that request.",
      },
    });
  });

  it("has no unresolved command configuration defaults", () => {
    expect(
      task04CommandConfigurationFromEnvironment(environment),
    ).toEqual({
      pendingHoldMinutes: 15,
      publicLocationLabel: "Synthetic Pharmacy Location",
      publicSlotReferenceTtlSeconds: 900,
      maxRequestBytes: 16_384,
      maxPageSize: 10,
      maxAvailabilityWindowDays: 31,
      supportedDisplayTimezones: ["America/Toronto"],
    });
  });

  it("fails the approved synthetic scope closed after expiry", () => {
    expect(() =>
      parseTask04SandboxEnv(
        task04SyntheticEnvironmentInput(),
        new Date("2026-08-06T00:00:00.000Z"),
      ),
    ).toThrow("SANDBOX_CONFIG_DENIED:TASK04_APPROVAL_EXPIRED");
  });
});
