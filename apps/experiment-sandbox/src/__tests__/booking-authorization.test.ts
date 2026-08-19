import { describe, expect, it } from "vitest";

import {
  authorizeStaffBookingConfirmation,
  evaluateReusableManagementCapability,
  reusableCapabilityRecordSchema,
  reusableCapabilityRequestSchema,
  staffBookingConfirmationFactsSchema,
} from "../booking/authorization";
import type { Task04AuthoritativeTransactionContext } from "../db/authoritative-context";

const CAPABILITY_REQUEST = Object.freeze({
  capabilityReference: "SYNTH-CAPABILITY-REFERENCE-0001",
  bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
  requiredAction: "booking:view",
  actorType: "synthetic_patient",
  actorReference: "SYNTH-PATIENT-TASK04-0001",
  subjectReference: "SYNTH-PATIENT-TASK04-0001",
  subjectType: "synthetic_patient",
  serverSessionBinding: "SYNTH-SESSION-TASK04-0001",
});

describe("Task 04 reusable management capability boundary", () => {
  it.each(["pharmacyId", "tenantId", "nowUtc", "role", "state"])(
    "rejects caller-supplied authoritative field %s",
    (field) => {
      expect(
        reusableCapabilityRequestSchema.safeParse({
          ...CAPABILITY_REQUEST,
          [field]: "SYNTHETIC-FORBIDDEN",
        }).success,
      ).toBe(false);
    },
  );

  it("does not model consumed as a reusable-capability state", () => {
    expect(
      reusableCapabilityRecordSchema.safeParse({
        usageMode: "reusable",
        capabilityReference:
          "SYNTH-CAPABILITY-REFERENCE-0001",
        bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
        permittedActions: ["booking:view"],
        actorReference: "SYNTH-PATIENT-TASK04-0001",
        subjectReference: "SYNTH-PATIENT-TASK04-0001",
        subjectType: "synthetic_patient",
        serverSessionBinding: "SYNTH-SESSION-TASK04-0001",
        pharmacyId: "SYNTH-PHARMACY-TASK04-LOCAL",
        state: "consumed",
        expiresAtUtc: "2026-08-05T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("fails closed without an internally recognized context", () => {
    const forgedContext = {
      pharmacyId: "SYNTH-PHARMACY-TASK04-LOCAL",
      nowUtc: "2026-08-04T12:00:00.000Z",
    } as Task04AuthoritativeTransactionContext;
    expect(
      evaluateReusableManagementCapability(
        {},
        CAPABILITY_REQUEST,
        forgedContext,
      ),
    ).toEqual({
      authorized: false,
      reasonCode: "NOT_AUTHORIZED",
    });
  });
});

describe("Task 04 staff-only booking confirmation facts", () => {
  const staffFacts = Object.freeze({
    actorType: "synthetic_staff",
    actorReference: "SYNTH-PHARMACIST-TASK04-0001",
    subjectType: "synthetic_patient",
    sessionReference: "SYNTH-STAFF-SESSION-TASK04-0001",
    sessionActive: true,
    permissions: ["booking:confirm"],
  });

  it.each([
    "pharmacyId",
    "resourcePharmacyId",
    "nowUtc",
    "approvalState",
    "role",
  ])("rejects caller-supplied authoritative staff field %s", (field) => {
    expect(
      staffBookingConfirmationFactsSchema.safeParse({
        ...staffFacts,
        [field]: "SYNTHETIC-FORBIDDEN",
      }).success,
    ).toBe(false);
  });

  it("fails closed without an internally recognized context", () => {
    expect(
      authorizeStaffBookingConfirmation(
        {} as Task04AuthoritativeTransactionContext,
        staffFacts,
      ),
    ).toEqual({
      authorized: false,
      reasonCode: "NOT_AUTHORIZED",
    });
  });
});
