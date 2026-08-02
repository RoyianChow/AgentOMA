import { describe, expect, it } from "vitest";

import {
  TASK04_UNRESOLVED_CONFIGURATION_KEYS,
  parseTask04CommandConfiguration,
} from "../booking/config";
import {
  createTask04BookingSchemas,
  parseTask04Request,
} from "../booking/contracts";
import { assertTask04AuthoritativeRawRequestWithinLimit } from "../db/transaction";

const TEST_CONFIGURATION = Object.freeze({
  TASK04_PENDING_HOLD_MINUTES: 12,
  TASK04_PUBLIC_LOCATION_LABEL: "Synthetic local test location",
  TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS: 90,
  TASK04_MAX_REQUEST_BYTES: 4_096,
  TASK04_MAX_PAGE_SIZE: 10,
  TASK04_MAX_AVAILABILITY_WINDOW_DAYS: 14,
  TASK04_SUPPORTED_DISPLAY_TIMEZONES: ["America/Toronto"],
});

const VALID_ACKNOWLEDGEMENTS = Object.freeze({
  administrativeOnly: true,
  notMonitored: true,
  noMedicalDetails: true,
  notClinicalAssessment: true,
  statusControlsConfirmation: true,
});

function schemas() {
  const configuration = parseTask04CommandConfiguration(TEST_CONFIGURATION);
  return {
    configuration,
    ...createTask04BookingSchemas({
      maxAccessibilitySelections: 3,
      supportedDisplayTimezones:
        configuration.supportedDisplayTimezones,
    }),
  };
}

function validBookingCreateRequest() {
  return {
    slotReference: "SYNTH-SLOT-PUBLIC-REF-0001",
    languagePreference: "english",
    accessibilityPreferences: ["none"],
    syntheticContactReference: "synth-contact-task04-0001",
    administrativeAcknowledgements: VALID_ACKNOWLEDGEMENTS,
    idempotencyKey: "SYNTH-IDEMPOTENCY-KEY-0001",
  };
}

describe("Task 04 unresolved command configuration", () => {
  it("requires every unresolved value and applies no defaults", () => {
    for (const key of TASK04_UNRESOLVED_CONFIGURATION_KEYS) {
      const incomplete = { ...TEST_CONFIGURATION };
      delete incomplete[key];
      expect(() => parseTask04CommandConfiguration(incomplete)).toThrow(
        "TASK04_COMMAND_CONFIG_DENIED",
      );
    }
  });

  it("normalizes an explicitly injected test configuration", () => {
    expect(parseTask04CommandConfiguration(TEST_CONFIGURATION)).toEqual({
      pendingHoldMinutes: 12,
      publicLocationLabel: "Synthetic local test location",
      publicSlotReferenceTtlSeconds: 90,
      maxRequestBytes: 4_096,
      maxPageSize: 10,
      maxAvailabilityWindowDays: 14,
      supportedDisplayTimezones: ["America/Toronto"],
    });
  });
});

describe("Task 04 strict booking schemas", () => {
  it("normalizes the approved booking:create request", () => {
    const { bookingCreateRequestSchema } = schemas();
    expect(
      parseTask04Request(
        bookingCreateRequestSchema,
        validBookingCreateRequest(),
      ),
    ).toEqual({
      ...validBookingCreateRequest(),
      syntheticContactReference: "SYNTH-CONTACT-TASK04-0001",
    });
  });

  it.each([
    "clinicalFreeText",
    "symptoms",
    "diagnoses",
    "medications",
    "healthCardNumber",
    "notes",
    "pharmacyId",
    "tenantId",
    "role",
    "capacity",
    "confirmed",
    "actorType",
    "subjectType",
    "serviceCategory",
    "modality",
  ])("rejects prohibited booking:create field %s", (field) => {
    const { bookingCreateRequestSchema } = schemas();
    expect(
      bookingCreateRequestSchema.safeParse({
        ...validBookingCreateRequest(),
        [field]: "SYNTHETIC-FORBIDDEN-VALUE",
      }).success,
    ).toBe(false);
  });

  it("enforces acknowledgement and accessibility allowlists", () => {
    const { bookingCreateRequestSchema } = schemas();
    expect(
      bookingCreateRequestSchema.safeParse({
        ...validBookingCreateRequest(),
        administrativeAcknowledgements: {
          ...VALID_ACKNOWLEDGEMENTS,
          noMedicalDetails: false,
        },
      }).success,
    ).toBe(false);
    expect(
      bookingCreateRequestSchema.safeParse({
        ...validBookingCreateRequest(),
        accessibilityPreferences: ["none", "mobility_preparation"],
      }).success,
    ).toBe(false);
    expect(
      bookingCreateRequestSchema.safeParse({
        ...validBookingCreateRequest(),
        accessibilityPreferences: ["clinical_explanation"],
      }).success,
    ).toBe(false);
  });

  it.each([
    "clinicalFreeText",
    "symptoms",
    "healthCardNumber",
    "pharmacyId",
    "tenantId",
    "role",
    "capacity",
    "state",
  ])("rejects prohibited booking:retrieve field %s", (field) => {
    const { bookingRetrieveRequestSchema } = schemas();
    expect(
      bookingRetrieveRequestSchema.safeParse({
        bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
        managementAuthorization: {
          channel: "server_session_bound",
          capabilityReference: "SYNTH-CAPABILITY-REFERENCE-0001",
        },
        [field]: "SYNTHETIC-FORBIDDEN-VALUE",
      }).success,
    ).toBe(false);
  });

  it.each([
    "clinicalFreeText",
    "symptoms",
    "healthCardNumber",
    "pharmacyId",
    "tenantId",
    "role",
    "capacity",
    "state",
    "managementAuthorization",
  ])("rejects prohibited booking:confirm field %s", (field) => {
    const { bookingConfirmRequestSchema } = schemas();
    expect(
      bookingConfirmRequestSchema.safeParse({
        bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
        expectedAggregateVersion: 1,
        idempotencyKey: "SYNTH-IDEMPOTENCY-KEY-0001",
        [field]: "SYNTHETIC-FORBIDDEN-VALUE",
      }).success,
    ).toBe(false);
  });

  it("validates conditional booking:create response fields", () => {
    const { bookingCreateResponseDataSchema } = schemas();
    const common = {
      bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
      serviceCategoryLabel: "Synthetic administrative service",
      modality: "in_person",
      startTimeUtc: "2026-08-04T14:00:00.000Z",
      endTimeUtc: "2026-08-04T14:30:00.000Z",
      displayTimezone: "America/Toronto",
      managementCapability: {
        capabilityReference: "SYNTH-CAPABILITY-REFERENCE-0001",
        usageMode: "reusable",
        permittedActions: ["booking:view"],
        expiresAtUtc: "2026-08-05T00:00:00.000Z",
      },
      syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
    };
    expect(
      bookingCreateResponseDataSchema.safeParse({
        ...common,
        status: "confirmed",
      }).success,
    ).toBe(true);
    expect(
      bookingCreateResponseDataSchema.safeParse({
        ...common,
        status: "pending_confirmation",
      }).success,
    ).toBe(false);
    expect(
      bookingCreateResponseDataSchema.safeParse({
        ...common,
        status: "pending_confirmation",
        confirmationExpiresAtUtc: "2026-08-04T14:05:00.000Z",
      }).success,
    ).toBe(true);
  });

  it.each([
    ["supported Ontario timezone", "America/Toronto", true],
    ["valid but unsupported timezone", "America/Vancouver", false],
    ["invalid timezone", "Ontario/Nowhere", false],
    ["empty timezone", "", false],
    ["malformed timezone", " America/Toronto ", false],
  ])("validates %s", (_label, displayTimezone, expected) => {
    const { bookingCreateResponseDataSchema } = schemas();
    expect(
      bookingCreateResponseDataSchema.safeParse({
        bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
        status: "confirmed",
        serviceCategoryLabel: "Synthetic administrative service",
        modality: "in_person",
        startTimeUtc: "2026-08-04T14:00:00.000Z",
        endTimeUtc: "2026-08-04T14:30:00.000Z",
        displayTimezone,
        managementCapability: {
          capabilityReference: "SYNTH-CAPABILITY-REFERENCE-0001",
          usageMode: "reusable",
          permittedActions: ["booking:view"],
          expiresAtUtc: "2026-08-05T00:00:00.000Z",
        },
        syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
      }).success,
    ).toBe(expected);
  });

  it("keeps booking:retrieve management-bound and minimized", () => {
    const {
      bookingRetrieveRequestSchema,
      bookingRetrieveResponseSchema,
    } = schemas();
    expect(
      bookingRetrieveRequestSchema.safeParse({
        bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
        managementAuthorization: {
          channel: "server_session_bound",
          capabilityReference: "SYNTH-CAPABILITY-REFERENCE-0001",
        },
      }).success,
    ).toBe(true);
    expect(
      bookingRetrieveRequestSchema.safeParse({
        bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
        capabilityReference: "SYNTH-CAPABILITY-REFERENCE-0001",
      }).success,
    ).toBe(false);
    expect(
      bookingRetrieveResponseSchema.safeParse({
        success: true,
        data: {
          bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
          status: "confirmed",
          serviceCategoryLabel: "Synthetic administrative service",
          modality: "telephone",
          startTimeUtc: "2026-08-04T14:00:00.000Z",
          endTimeUtc: "2026-08-04T14:30:00.000Z",
          displayTimezone: "America/Toronto",
          allowedActions: ["none"],
          syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
        },
      }).success,
    ).toBe(true);
  });

  it("keeps booking:confirm strict and staff authorization out of request data", () => {
    const {
      bookingConfirmRequestSchema,
      bookingConfirmResponseSchema,
    } = schemas();
    const request = {
      bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
      expectedAggregateVersion: 1,
      idempotencyKey: "SYNTH-IDEMPOTENCY-KEY-0001",
    };
    expect(bookingConfirmRequestSchema.safeParse(request).success).toBe(true);
    expect(
      bookingConfirmRequestSchema.safeParse({
        ...request,
        managementAuthorization: {
          channel: "server_session_bound",
          capabilityReference: "SYNTH-CAPABILITY-REFERENCE-0001",
        },
      }).success,
    ).toBe(false);
    expect(
      bookingConfirmResponseSchema.safeParse({
        success: true,
        data: {
          bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
          status: "confirmed",
          holdStatus: "consumed",
        },
        receiptId: "SYNTH-IDEMPOTENCY-RECEIPT-0001",
      }).success,
    ).toBe(true);
  });
});

describe("Task 04 pre-parse request-size guard", () => {
  it("counts padded whitespace and duplicate-key JSON as raw bytes", () => {
    const padded = Buffer.from("       {}", "utf8");
    const duplicateKeys = Buffer.from('{"a":1,"a":2}', "utf8");
    expect(() =>
      assertTask04AuthoritativeRawRequestWithinLimit(
        padded,
        padded.byteLength,
      ),
    ).not.toThrow();
    expect(() =>
      assertTask04AuthoritativeRawRequestWithinLimit(
        duplicateKeys,
        duplicateKeys.byteLength,
      ),
    ).not.toThrow();
  });

  it("counts UTF-8 bytes rather than JavaScript characters", () => {
    const multibyte = Buffer.from('"é"', "utf8");
    expect(multibyte.byteLength).toBeGreaterThan('"é"'.length);
    expect(() =>
      assertTask04AuthoritativeRawRequestWithinLimit(
        multibyte,
        multibyte.byteLength,
      ),
    ).not.toThrow();
    expect(() =>
      assertTask04AuthoritativeRawRequestWithinLimit(
        multibyte,
        multibyte.byteLength - 1,
      ),
    ).toThrow("TASK04_INVALID_REQUEST");
  });

  it("accepts the exact byte limit and rejects one byte over", () => {
    const body = Buffer.from('{"synthetic":true}', "utf8");
    expect(() =>
      assertTask04AuthoritativeRawRequestWithinLimit(
        body,
        body.byteLength,
      ),
    ).not.toThrow();
    expect(() =>
      assertTask04AuthoritativeRawRequestWithinLimit(
        Buffer.concat([body, Buffer.from(" ")]),
        body.byteLength,
      ),
    ).toThrow("TASK04_INVALID_REQUEST");
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])(
    "fails closed for invalid max-request configuration %s",
    (limit) => {
      expect(() =>
        assertTask04AuthoritativeRawRequestWithinLimit(
          Buffer.from("{}"),
          limit,
        ),
      ).toThrow("TASK04_REQUEST_CONFIG_DENIED");
    },
  );

  it("accepts an authoritative pre-parse raw byte count", () => {
    expect(() =>
      assertTask04AuthoritativeRawRequestWithinLimit(4_096, 4_096),
    ).not.toThrow();
    expect(() =>
      assertTask04AuthoritativeRawRequestWithinLimit(4_097, 4_096),
    ).toThrow("TASK04_INVALID_REQUEST");
  });
});
