import { describe, expect, it } from "vitest";

import {
  createTask04BookingConfirmFingerprint,
  createTask04BookingCreateFingerprint,
  digestTask04IdempotencyKey,
  digestTask04ResourceScope,
  type Task04BookingConfirmFingerprintInput,
  type Task04BookingCreateFingerprintInput,
} from "../booking/idempotency";
import { classifyTask04DatabaseFailure } from "../db/transaction";

const ACKNOWLEDGEMENTS = {
  administrativeOnly: true,
  notMonitored: true,
  noMedicalDetails: true,
  notClinicalAssessment: true,
  statusControlsConfirmation: true,
} as const;

const FINGERPRINT_INPUT: Task04BookingCreateFingerprintInput = {
  operation: "booking:create",
  actorReference: "SYNTH-PATIENT-TASK04-0001",
  resourceScopeReference: "SYNTH-SLOT-PUBLIC-REF-0001",
  request: {
    slotReference: "SYNTH-SLOT-PUBLIC-REF-0001",
    languagePreference: "english",
    accessibilityPreferences: ["none"],
    syntheticContactReference: "SYNTH-CONTACT-TASK04-0001",
    administrativeAcknowledgements: ACKNOWLEDGEMENTS,
    idempotencyKey: "SYNTH-IDEMPOTENCY-KEY-0001",
  },
};

describe("Task 04 typed idempotency fingerprints", () => {
  it("is deterministic across object-key order", () => {
    const first =
      createTask04BookingCreateFingerprint(FINGERPRINT_INPUT);
    const second = createTask04BookingCreateFingerprint({
      request: {
        idempotencyKey: "SYNTH-IDEMPOTENCY-KEY-0001",
        administrativeAcknowledgements: {
          statusControlsConfirmation: true,
          notClinicalAssessment: true,
          noMedicalDetails: true,
          notMonitored: true,
          administrativeOnly: true,
        },
        syntheticContactReference:
          "SYNTH-CONTACT-TASK04-0001",
        accessibilityPreferences: ["none"],
        languagePreference: "english",
        slotReference: "SYNTH-SLOT-PUBLIC-REF-0001",
      },
      resourceScopeReference: "SYNTH-SLOT-PUBLIC-REF-0001",
      actorReference: "SYNTH-PATIENT-TASK04-0001",
      operation: "booking:create",
    });
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes for materially different safe requests", () => {
    expect(
      createTask04BookingCreateFingerprint(FINGERPRINT_INPUT),
    ).not.toBe(
      createTask04BookingCreateFingerprint({
        ...FINGERPRINT_INPUT,
        request: {
          ...FINGERPRINT_INPUT.request,
          languagePreference: "french",
        },
      }),
    );
    expect(
      createTask04BookingConfirmFingerprint({
        operation: "booking:confirm",
        actorReference: "SYNTH-PHARMACIST-TASK04-0001",
        resourceScopeReference:
          "SYNTH-BOOKING-REFERENCE-0001",
        request: {
          bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
          expectedAggregateVersion: 1,
          idempotencyKey: "SYNTH-IDEMPOTENCY-KEY-0001",
        },
      }),
    ).not.toBe(
      createTask04BookingConfirmFingerprint({
        operation: "booking:confirm",
        actorReference: "SYNTH-PHARMACIST-TASK04-0001",
        resourceScopeReference:
          "SYNTH-BOOKING-REFERENCE-0001",
        request: {
          bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
          expectedAggregateVersion: 2,
          idempotencyKey: "SYNTH-IDEMPOTENCY-KEY-0001",
        },
      }),
    );
  });

  it.each([
    new Date("2026-08-02T00:00:00.000Z"),
    new Map([["safe", "value"]]),
    new Set(["safe"]),
    /synthetic/u,
    Object.create(null),
    Object.create({ synthetic: true }),
    new (class SyntheticClass {})(),
    () => "synthetic",
    undefined,
  ])("fails closed for unsupported request value %#", (request) => {
    expect(() =>
      createTask04BookingCreateFingerprint({
        ...FINGERPRINT_INPUT,
        request:
          request as unknown as Task04BookingCreateFingerprintInput["request"],
      }),
    ).toThrow("TASK04_FINGERPRINT_INPUT_DENIED");
  });

  it("rejects a fully populated booking:create class instance", () => {
    class SyntheticBookingCreateEnvelope {
      readonly operation = "booking:create" as const;
      readonly actorReference =
        FINGERPRINT_INPUT.actorReference;
      readonly resourceScopeReference =
        FINGERPRINT_INPUT.resourceScopeReference;
      readonly request = FINGERPRINT_INPUT.request;
    }

    expect(() =>
      createTask04BookingCreateFingerprint(
        new SyntheticBookingCreateEnvelope(),
      ),
    ).toThrow("TASK04_FINGERPRINT_INPUT_DENIED");
  });

  it("rejects fully populated class-instance nested requests", () => {
    class SyntheticBookingCreateRequest {
      readonly slotReference =
        FINGERPRINT_INPUT.request.slotReference;
      readonly languagePreference =
        FINGERPRINT_INPUT.request.languagePreference;
      readonly accessibilityPreferences =
        FINGERPRINT_INPUT.request.accessibilityPreferences;
      readonly syntheticContactReference =
        FINGERPRINT_INPUT.request.syntheticContactReference;
      readonly administrativeAcknowledgements =
        FINGERPRINT_INPUT.request.administrativeAcknowledgements;
      readonly idempotencyKey =
        FINGERPRINT_INPUT.request.idempotencyKey;
    }

    expect(() =>
      createTask04BookingCreateFingerprint({
        ...FINGERPRINT_INPUT,
        request: new SyntheticBookingCreateRequest(),
      }),
    ).toThrow("TASK04_FINGERPRINT_INPUT_DENIED");
  });

  it("rejects a fully populated booking:confirm class instance", () => {
    class SyntheticBookingConfirmEnvelope {
      readonly operation = "booking:confirm" as const;
      readonly actorReference =
        "SYNTH-PHARMACIST-TASK04-0001";
      readonly resourceScopeReference =
        "SYNTH-BOOKING-REFERENCE-0001";
      readonly request = {
        bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
        expectedAggregateVersion: 1,
        idempotencyKey: "SYNTH-IDEMPOTENCY-KEY-0001",
      } satisfies Task04BookingConfirmFingerprintInput["request"];
    }

    expect(() =>
      createTask04BookingConfirmFingerprint(
        new SyntheticBookingConfirmEnvelope(),
      ),
    ).toThrow("TASK04_FINGERPRINT_INPUT_DENIED");
  });

  it.each([
    ["email", "synthetic@example.invalid"],
    ["phoneNumber", "5550100"],
    ["healthCardNumber", "0000000000"],
    ["symptoms", ["synthetic"]],
    ["metadata", { arbitrary: true }],
    ["pharmacyId", "SYNTH-PHARMACY-TASK04-OTHER"],
  ])("rejects unsupported command field %s", (field, value) => {
    expect(() =>
      createTask04BookingCreateFingerprint({
        ...FINGERPRINT_INPUT,
        request: {
          ...FINGERPRINT_INPUT.request,
          [field]: value,
        } as Task04BookingCreateFingerprintInput["request"],
      }),
    ).toThrow("TASK04_FINGERPRINT_INPUT_DENIED");
  });

  it("binds the resource scope to the command resource", () => {
    expect(() =>
      createTask04BookingCreateFingerprint({
        ...FINGERPRINT_INPUT,
        resourceScopeReference: "SYNTH-SLOT-PUBLIC-REF-OTHER",
      }),
    ).toThrow("TASK04_FINGERPRINT_INPUT_DENIED");
  });

  it("digests idempotency keys and resource scope independently", () => {
    const keyDigest = digestTask04IdempotencyKey(
      "SYNTH-IDEMPOTENCY-KEY-0001",
    );
    const scopeDigest = digestTask04ResourceScope(
      "SYNTH-SLOT-PUBLIC-REF-0001",
    );
    expect(keyDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(scopeDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(keyDigest).not.toBe(scopeDigest);
  });
});

describe("Task 04 database retry classification", () => {
  it("classifies only PostgreSQL serialization and deadlock codes as retryable", () => {
    expect(classifyTask04DatabaseFailure({ code: "40001" })).toBe(
      "retryable_serialization",
    );
    expect(classifyTask04DatabaseFailure({ code: "40P01" })).toBe(
      "retryable_deadlock",
    );
    expect(classifyTask04DatabaseFailure({ code: "23505" })).toBe(
      "not_retryable",
    );
    expect(
      classifyTask04DatabaseFailure(new Error("synthetic")),
    ).toBe("not_retryable");
  });
});
