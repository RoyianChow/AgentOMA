import { describe, expect, it } from "vitest";

import {
  TASK04_DENIED_AUDIT_PERSISTENCE_BLOCKER,
  parseTask04AuditInput,
} from "../booking/audit-contracts";
import {
  TASK04_EVENT_TYPES,
  parseTask04OutboxEventInput,
} from "../booking/outbox-contracts";

const OCCURRED_AT = "2026-08-04T12:00:00.000Z";
const EXPIRES_AT = "2026-08-05T00:00:00.000Z";
const REFERENCE = "SYNTH-REFERENCE-TASK04-0001";

type PositiveEventFixture = {
  eventType: (typeof TASK04_EVENT_TYPES)[number];
  aggregateType:
    | "booking"
    | "waitlist_entry"
    | "waitlist_offer"
    | "capacity_hold"
    | "management_credential"
    | "automation_control";
  safeReasonCode: string;
  payload: Record<string, unknown>;
};

const POSITIVE_EVENT_FIXTURES: readonly PositiveEventFixture[] = [
  {
    eventType: "booking.created",
    aggregateType: "booking",
    safeReasonCode: "BOOKING_REQUESTED",
    payload: {
      resultingState: "confirmed",
      modality: "in_person",
      startTimeUtc: OCCURRED_AT,
      endTimeUtc: EXPIRES_AT,
    },
  },
  {
    eventType: "booking.confirmed",
    aggregateType: "booking",
    safeReasonCode: "STAFF_CONFIRMED",
    payload: {
      previousState: "pending_confirmation",
      resultingState: "confirmed",
      capacityOwner: "booking",
    },
  },
  {
    eventType: "booking.cancelled",
    aggregateType: "booking",
    safeReasonCode: "ACTOR_CANCELLED",
    payload: {
      previousState: "confirmed",
      resultingState: "cancelled",
    },
  },
  {
    eventType: "booking.rescheduled",
    aggregateType: "booking",
    safeReasonCode: "REPLACEMENT_COMMITTED",
    payload: {
      predecessorBookingReference: REFERENCE,
      successorBookingReference: "SYNTH-REFERENCE-TASK04-0002",
      successorState: "confirmed",
    },
  },
  {
    eventType: "booking.expired",
    aggregateType: "booking",
    safeReasonCode: "CONFIRMATION_WINDOW_EXPIRED",
    payload: {
      previousState: "pending_confirmation",
      resultingState: "expired",
    },
  },
  {
    eventType: "waitlist.joined",
    aggregateType: "waitlist_entry",
    safeReasonCode: "WAITLIST_REQUESTED",
    payload: {
      resultingState: "active",
      modalityPreference: "telephone",
    },
  },
  {
    eventType: "waitlist.cancelled",
    aggregateType: "waitlist_entry",
    safeReasonCode: "ACTOR_LEFT_WAITLIST",
    payload: {
      previousState: "active",
      resultingState: "cancelled",
    },
  },
  {
    eventType: "waitlist.reactivated",
    aggregateType: "waitlist_entry",
    safeReasonCode: "OFFER_WINDOW_EXPIRED_ENTRY_ELIGIBLE",
    payload: {
      previousState: "offered",
      resultingState: "active",
    },
  },
  {
    eventType: "waitlist.expired",
    aggregateType: "waitlist_entry",
    safeReasonCode: "ENTRY_WINDOW_EXPIRED",
    payload: {
      previousState: "active",
      resultingState: "expired",
    },
  },
  {
    eventType: "waitlist.offer_created",
    aggregateType: "waitlist_offer",
    safeReasonCode: "CAPACITY_BECAME_AVAILABLE",
    payload: {
      waitlistReference: REFERENCE,
      capacityHoldReference: "SYNTH-REFERENCE-TASK04-0002",
      resultingState: "pending",
      expiresAtUtc: EXPIRES_AT,
    },
  },
  {
    eventType: "waitlist.offer_accepted",
    aggregateType: "waitlist_offer",
    safeReasonCode: "ACTOR_ACCEPTED_OFFER",
    payload: {
      waitlistReference: REFERENCE,
      bookingReference: "SYNTH-REFERENCE-TASK04-0002",
      resultingOfferState: "accepted",
      resultingEntryState: "promoted",
    },
  },
  {
    eventType: "waitlist.offer_declined",
    aggregateType: "waitlist_offer",
    safeReasonCode: "ACTOR_DECLINED_OFFER",
    payload: {
      waitlistReference: REFERENCE,
      resultingOfferState: "declined",
      resultingEntryState: "cancelled",
    },
  },
  {
    eventType: "waitlist.offer_withdrawn",
    aggregateType: "waitlist_offer",
    safeReasonCode: "SLOT_INVALIDATED",
    payload: {
      waitlistReference: REFERENCE,
      resultingOfferState: "cancelled",
      resultingEntryState: "active",
    },
  },
  {
    eventType: "waitlist.offer_expired",
    aggregateType: "waitlist_offer",
    safeReasonCode: "OFFER_WINDOW_EXPIRED",
    payload: {
      waitlistReference: REFERENCE,
      resultingOfferState: "expired",
      resultingEntryState: "active",
    },
  },
  {
    eventType: "capacity_hold.created",
    aggregateType: "capacity_hold",
    safeReasonCode: "PENDING_CONFIRMATION_RESERVED",
    payload: {
      ownerType: "pending_booking",
      ownerReference: REFERENCE,
      resultingState: "active",
      expiresAtUtc: EXPIRES_AT,
    },
  },
  {
    eventType: "capacity_hold.consumed",
    aggregateType: "capacity_hold",
    safeReasonCode: "CONFIRMATION_COMMITTED",
    payload: {
      ownerType: "pending_booking",
      bookingReference: REFERENCE,
      resultingState: "consumed",
    },
  },
  {
    eventType: "capacity_hold.released",
    aggregateType: "capacity_hold",
    safeReasonCode: "EARLY_CANCELLATION",
    payload: {
      ownerType: "pending_booking",
      releaseCause: "early_booking_cancellation",
      resultingState: "released",
    },
  },
  {
    eventType: "capacity_hold.expired",
    aggregateType: "capacity_hold",
    safeReasonCode: "HOLD_WINDOW_EXPIRED",
    payload: {
      ownerType: "pending_booking",
      resultingState: "expired",
    },
  },
  {
    eventType: "management_credential.issued",
    aggregateType: "management_credential",
    safeReasonCode: "SERVER_SESSION_CAPABILITY_CREATED",
    payload: {
      credentialReference: REFERENCE,
      usageMode: "reusable",
      permittedActions: ["booking:view"],
      channel: "server_session_bound",
      expiresAtUtc: EXPIRES_AT,
    },
  },
  {
    eventType: "management_credential.consumed",
    aggregateType: "management_credential",
    safeReasonCode: "PROTECTED_ACTION_COMMITTED",
    payload: {
      credentialReference: REFERENCE,
      consumedByAction: "booking:cancel",
      resultingState: "consumed",
    },
  },
  {
    eventType: "management_credential.revoked",
    aggregateType: "management_credential",
    safeReasonCode: "AUTHORITY_REVOKED",
    payload: {
      credentialReference: REFERENCE,
      resultingState: "revoked",
    },
  },
  {
    eventType: "management_credential.expired",
    aggregateType: "management_credential",
    safeReasonCode: "CREDENTIAL_WINDOW_EXPIRED",
    payload: {
      credentialReference: REFERENCE,
      resultingState: "expired",
    },
  },
  {
    eventType: "automation.reconciled",
    aggregateType: "automation_control",
    safeReasonCode: "RECONCILIATION_COMPLETED",
    payload: {
      reconciliationRunReference: REFERENCE,
      resultingState: "completed",
      processedCount: 10,
    },
  },
  {
    eventType: "automation.disabled",
    aggregateType: "automation_control",
    safeReasonCode: "AUTHORIZED_DISABLE",
    payload: {
      previousState: "enabled",
      resultingState: "disabled",
      controlVersion: 2,
    },
  },
  {
    eventType: "automation.enabled",
    aggregateType: "automation_control",
    safeReasonCode: "AUTHORIZED_ENABLE",
    payload: {
      previousState: "disabled",
      resultingState: "enabled",
      controlVersion: 3,
    },
  },
];

function outboxInput(fixture = POSITIVE_EVENT_FIXTURES[0]) {
  return {
    eventId: "SYNTH-EVENT-TASK04-BOOKING-0001",
    eventType: fixture!.eventType,
    eventSchemaVersion: 1,
    aggregateType: fixture!.aggregateType,
    aggregateId: "SYNTH-BOOKING-TASK04-0001",
    aggregateVersion: 1,
    actorType: "synthetic_patient",
    safeReasonCode: fixture!.safeReasonCode,
    payload: fixture!.payload,
  };
}

function validAuditInput() {
  return {
    operation: "booking:create",
    auditId: "SYNTH-AUDIT-TASK04-BOOKING-0001",
    aggregateType: "booking",
    aggregateId: "SYNTH-BOOKING-TASK04-0001",
    aggregateVersion: 1,
    actorType: "synthetic_patient",
    subjectReference: "SYNTH-PATIENT-TASK04-0001",
    subjectType: "synthetic_patient",
    priorState: "none",
    resultingState: "confirmed",
    safeReasonCode: "BOOKING_REQUESTED",
    idempotencyRecordId: "SYNTH-IDEM-TASK04-BOOKING-0001",
    outboxRecordId: "SYNTH-EVENT-TASK04-BOOKING-0001",
  };
}

describe("Task 04 outbox insertion contract", () => {
  it("accepts every canonical minimized event member", () => {
    expect(POSITIVE_EVENT_FIXTURES).toHaveLength(
      TASK04_EVENT_TYPES.length,
    );
    for (const fixture of POSITIVE_EVENT_FIXTURES) {
      expect(
        parseTask04OutboxEventInput(outboxInput(fixture), 10)
          .eventType,
        fixture.eventType,
      ).toBe(fixture.eventType);
    }
  });

  it.each([
    ["occurredAtUtc", OCCURRED_AT],
    [
      "protectedScope",
      {
        pharmacyId: "SYNTH-PHARMACY-TASK04-LOCAL",
        environment: "synthetic",
      },
    ],
    ["dispatchStatus", "not_dispatched"],
    ["aggregateVersionSuperseded", false],
    ["syntheticMarker", "SYNTHETIC_TASK_04_EVENT"],
    [
      "sourceCapability",
      "TASK04_BOOKING_WAITLIST_SYNTHETIC",
    ],
  ])("rejects caller-supplied server field %s", (field, value) => {
    expect(() =>
      parseTask04OutboxEventInput(
        { ...outboxInput(), [field]: value },
        10,
      ),
    ).toThrow("TASK04_EVENT_CONTRACT_DENIED");
  });

  it.each([
    ["email", "synthetic@example.invalid"],
    ["telephone", "5550100"],
    ["rawToken", "SYNTHETIC-RAW-TOKEN"],
    ["messageBody", "Synthetic message"],
    ["url", "https://example.invalid"],
    ["metadata", { arbitrary: true }],
  ])("rejects prohibited payload field %s", (field, value) => {
    const valid = outboxInput();
    expect(() =>
      parseTask04OutboxEventInput(
        {
          ...valid,
          payload: { ...valid.payload, [field]: value },
        },
        10,
      ),
    ).toThrow("TASK04_EVENT_CONTRACT_DENIED");
  });

  it("rejects unsupported events and mismatched reasons", () => {
    expect(() =>
      parseTask04OutboxEventInput(
        {
          ...outboxInput(),
          eventType: "booking.notification_sent",
        },
        10,
      ),
    ).toThrow("TASK04_EVENT_CONTRACT_DENIED");
    expect(() =>
      parseTask04OutboxEventInput(
        {
          ...outboxInput(),
          safeReasonCode: "STAFF_CONFIRMED",
        },
        10,
      ),
    ).toThrow("TASK04_EVENT_CONTRACT_DENIED");
  });

  it("enforces the configured reconciliation page limit", () => {
    const automation = POSITIVE_EVENT_FIXTURES.find(
      ({ eventType }) => eventType === "automation.reconciled",
    )!;
    expect(() =>
      parseTask04OutboxEventInput(
        {
          ...outboxInput(automation),
          payload: {
            ...automation.payload,
            processedCount: 11,
          },
        },
        10,
      ),
    ).toThrow("TASK04_EVENT_CONTRACT_DENIED");
  });
});

describe("Task 04 successful synthetic audit contract", () => {
  it("accepts only an explicit valid booking transition", () => {
    expect(parseTask04AuditInput(validAuditInput())).toEqual(
      validAuditInput(),
    );
  });

  it.each([
    ["email", "synthetic@example.invalid"],
    ["telephone", "5550100"],
    ["rawRequest", outboxInput()],
    ["token", "SYNTHETIC-RAW-TOKEN"],
    ["symptoms", ["synthetic"]],
    ["diagnosis", "synthetic"],
    ["sqlError", "relation unavailable"],
    ["metadata", { arbitrary: true }],
    ["occurredAtUtc", OCCURRED_AT],
    ["pharmacyId", "SYNTH-PHARMACY-TASK04-LOCAL"],
  ])("rejects prohibited audit field %s", (field, value) => {
    expect(() =>
      parseTask04AuditInput({
        ...validAuditInput(),
        [field]: value,
      }),
    ).toThrow("TASK04_AUDIT_INPUT_DENIED");
  });

  it.each([
    { aggregateType: "automation_control" },
    { operation: "booking:confirm" },
    { resultingState: "denied" },
    { safeReasonCode: "STAFF_CONFIRMED" },
    { actorType: "synthetic_staff" },
    { priorState: "confirmed" },
  ])("rejects a semantically impossible combination %#", (change) => {
    expect(() =>
      parseTask04AuditInput({
        ...validAuditInput(),
        ...change,
      }),
    ).toThrow("TASK04_AUDIT_INPUT_DENIED");
  });

  it("keeps denied-action persistence explicitly blocked", () => {
    expect(TASK04_DENIED_AUDIT_PERSISTENCE_BLOCKER).toBe(
      "DENIED_ACTION_AUDIT_REQUIRES_NULLABLE_OUTBOX_REFERENCE",
    );
  });
});
