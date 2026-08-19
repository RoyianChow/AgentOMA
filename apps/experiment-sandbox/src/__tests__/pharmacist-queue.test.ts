import { describe, expect, it } from "vitest";

import {
  authorizeStaffPharmacistQueue,
  staffPharmacistQueueFactsSchema,
} from "../booking/authorization";
import { createTask04PharmacistQueueSchemas } from "../booking/pharmacist-queue-contracts";
import type { Task04AuthoritativeTransactionContext } from "../db/authoritative-context";
import { createTask04PharmacistQueueReferenceService } from "../db/pharmacist-queue-reference";

const PHARMACY_ID = "SYNTH-PHARMACY-TASK04-LOCAL";
const OTHER_PHARMACY_ID = "SYNTH-PHARMACY-TASK04-OTHER";
const SECRET =
  "SYNTHETIC_TASK04_TEST_SLOT_REFERENCE_SECRET_2026_08_02";
const QUERY_FINGERPRINT = "a".repeat(64);

function schemas() {
  return createTask04PharmacistQueueSchemas({
    maxAccessibilitySelections: 3,
    maxAvailabilityWindowDays: 31,
    maxPageSize: 10,
    supportedDisplayTimezones: ["America/Toronto"],
  });
}

function validItem() {
  return {
    queueItemReference: "SYNTH-QUEUE-ITEM-REFERENCE-0001",
    appointmentStartUtc: "2026-08-04T14:00:00.000Z",
    appointmentEndUtc: "2026-08-04T14:30:00.000Z",
    displayTimezone: "America/Toronto",
    serviceCategoryLabel: "Synthetic administrative service",
    modality: "in_person",
    administrativeStatus: "pending_confirmation",
    languagePreference: "english",
    accessibilityPreferences: ["none"],
    source: "booking",
    createdAtUtc: "2026-08-02T12:00:00.000Z",
    operationalReason: "confirmation_required",
    actionAvailability: "not_permitted",
  } as const;
}

describe("Task 04 pharmacist queue request contract", () => {
  it("accepts only the canonical administrative filters", () => {
    const parsed = schemas().pharmacistQueueRequestSchema.parse({
      status: ["pending_confirmation", "confirmed"],
      serviceCategoryRef:
        "SYNTH-SERVICE-CATEGORY-REFERENCE-0001",
      modality: "telephone",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      sort: "created_at_asc",
      cursor: "SYNTH-QUEUE-CURSOR-REFERENCE-0001",
      pageSize: 10,
    });
    expect(parsed).toEqual({
      status: ["pending_confirmation", "confirmed"],
      serviceCategoryRef:
        "SYNTH-SERVICE-CATEGORY-REFERENCE-0001",
      modality: "telephone",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      sort: "created_at_asc",
      cursor: "SYNTH-QUEUE-CURSOR-REFERENCE-0001",
      pageSize: 10,
    });
    expect(
      schemas().pharmacistQueueRequestSchema.parse({}),
    ).toEqual({ sort: "start_time_asc" });
  });

  it.each([
    "pharmacyId",
    "tenantId",
    "staffId",
    "role",
    "permission",
    "actorId",
    "patientId",
    "subjectId",
    "caregiverId",
    "bookingId",
    "slotId",
    "holdId",
    "capacity",
    "remainingCapacity",
    "authorizationState",
    "symptoms",
    "diagnosis",
    "medications",
    "healthCardNumber",
    "clinicalNotes",
    "freeText",
    "metadata",
    "timezone",
  ])("rejects prohibited or unknown field %s", (field) => {
    expect(
      schemas().pharmacistQueueRequestSchema.safeParse({
        [field]: "SYNTHETIC-FORBIDDEN",
      }).success,
    ).toBe(false);
  });

  it.each([
    { status: ["cancelled"] },
    { status: ["expired"] },
    { status: ["confirmed", "confirmed"] },
    { status: [] },
    { modality: "mail" },
    { sort: "clinical_priority_desc" },
    { pageSize: 0 },
    { pageSize: 11 },
    { cursor: "not valid" },
    { startDate: "2026-08-01" },
    { endDate: "2026-08-01" },
    { startDate: "2026-08-02", endDate: "2026-08-01" },
    { startDate: "2026-02-29", endDate: "2026-03-01" },
    { startDate: "2026-08-01", endDate: "2026-09-01" },
  ])("rejects malformed or unbounded query %#", (request) => {
    expect(
      schemas().pharmacistQueueRequestSchema.safeParse(request)
        .success,
    ).toBe(false);
  });

  it("accepts the inclusive 31-day date boundary", () => {
    expect(
      schemas().pharmacistQueueRequestSchema.safeParse({
        startDate: "2026-08-01",
        endDate: "2026-08-31",
      }).success,
    ).toBe(true);
  });
});

describe("Task 04 pharmacist queue minimized response", () => {
  it("accepts the exact administrative projection without an identity label", () => {
    const data = schemas().pharmacistQueueResponseDataSchema.parse({
      items: [validItem()],
      resultCompleteness: "complete",
      unavailableSourceCategories: [],
      freshnessState: "fresh",
      generatedAtUtc: "2026-08-02T12:00:00.000Z",
      refreshGuidance: "none",
    });
    expect(Object.keys(data.items[0]!).sort()).toEqual(
      [
        "accessibilityPreferences",
        "actionAvailability",
        "administrativeStatus",
        "appointmentEndUtc",
        "appointmentStartUtc",
        "createdAtUtc",
        "displayTimezone",
        "languagePreference",
        "modality",
        "operationalReason",
        "queueItemReference",
        "serviceCategoryLabel",
        "source",
      ].sort(),
    );
    expect(data.items[0]).not.toHaveProperty(
      "syntheticSubjectLabel",
    );
  });

  it.each([
    "bookingId",
    "subjectReference",
    "actorReference",
    "caregiverReference",
    "contact",
    "phone",
    "email",
    "credential",
    "sessionReference",
    "pharmacyId",
    "tenantId",
    "slotId",
    "holdId",
    "capacity",
    "remainingCapacity",
    "symptoms",
    "diagnosis",
    "medications",
    "healthCardNumber",
    "notes",
    "metadata",
  ])("rejects prohibited queue item field %s", (field) => {
    expect(
      schemas().pharmacistQueueItemSchema.safeParse({
        ...validItem(),
        [field]: "SYNTHETIC-FORBIDDEN",
      }).success,
    ).toBe(false);
  });

  it("requires supported IANA timezone and matching administrative reason", () => {
    for (const displayTimezone of [
      "America/Vancouver",
      "Ontario/Nowhere",
      " America/Toronto ",
    ]) {
      expect(
        schemas().pharmacistQueueItemSchema.safeParse({
          ...validItem(),
          displayTimezone,
        }).success,
      ).toBe(false);
    }
    expect(
      schemas().pharmacistQueueItemSchema.safeParse({
        ...validItem(),
        administrativeStatus: "confirmed",
      }).success,
    ).toBe(false);
  });

  it("rejects contradictory completeness and freshness metadata", () => {
    const response = {
      items: [],
      resultCompleteness: "complete",
      unavailableSourceCategories: [],
      freshnessState: "fresh",
      generatedAtUtc: "2026-08-02T12:00:00.000Z",
      refreshGuidance: "none",
    };
    expect(
      schemas().pharmacistQueueResponseDataSchema.safeParse({
        ...response,
        unavailableSourceCategories: ["booking_projection"],
      }).success,
    ).toBe(false);
    expect(
      schemas().pharmacistQueueResponseDataSchema.safeParse({
        ...response,
        freshnessState: "stale",
      }).success,
    ).toBe(false);
    expect(
      schemas().pharmacistQueueResponseDataSchema.safeParse({
        ...response,
        resultCompleteness: "partial",
      }).success,
    ).toBe(false);
  });
});

describe("Task 04 pharmacist queue opaque references", () => {
  it("issues stable non-reversible queue references", () => {
    const service =
      createTask04PharmacistQueueReferenceService({
        pharmacyId: PHARMACY_ID,
        secret: SECRET,
      });
    const first = service.issueQueueItemReference(
      "SYNTH-BOOKING-REFERENCE-0001",
    );
    const replay = service.issueQueueItemReference(
      "SYNTH-BOOKING-REFERENCE-0001",
    );
    const second = service.issueQueueItemReference(
      "SYNTH-BOOKING-REFERENCE-0002",
    );
    expect(first).toBe(replay);
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toContain("BOOKING");
    expect(
      Buffer.from(first, "base64url").toString("utf8"),
    ).not.toContain("SYNTH-BOOKING");
  });

  it("encrypts and binds the exact keyset cursor boundary", () => {
    const service =
      createTask04PharmacistQueueReferenceService({
        pharmacyId: PHARMACY_ID,
        secret: SECRET,
      });
    const boundary = {
      orderingInstantUtc: "2026-08-02T12:00:00.123456Z",
      bookingId: "SYNTH-BOOKING-CURSOR-BOUNDARY-0001",
    };
    const cursor = service.issueCursor(
      QUERY_FINGERPRINT,
      boundary,
    );
    const replayCursor = service.issueCursor(
      QUERY_FINGERPRINT,
      boundary,
    );
    expect(
      service.resolveCursor(cursor, QUERY_FINGERPRINT),
    ).toEqual(boundary);
    expect(cursor).not.toBe(replayCursor);
    expect(cursor).not.toContain(boundary.bookingId);
    expect(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ).not.toContain(boundary.bookingId);
    expect(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ).not.toContain(boundary.orderingInstantUtc);
    expect(() =>
      service.resolveCursor(cursor, "b".repeat(64)),
    ).toThrow("TASK04_QUEUE_REFERENCE_DENIED");
    expect(() =>
      createTask04PharmacistQueueReferenceService({
        pharmacyId: OTHER_PHARMACY_ID,
        secret: SECRET,
      }).resolveCursor(cursor, QUERY_FINGERPRINT),
    ).toThrow("TASK04_QUEUE_REFERENCE_DENIED");
  });

  it("rejects malformed and tampered cursors generically", () => {
    const service =
      createTask04PharmacistQueueReferenceService({
        pharmacyId: PHARMACY_ID,
        secret: SECRET,
      });
    const cursor = service.issueCursor(QUERY_FINGERPRINT, {
      orderingInstantUtc: "2026-08-02T12:00:00.123456Z",
      bookingId: "SYNTH-BOOKING-CURSOR-TAMPER-0001",
    });
    const last = cursor.at(-1);
    const tampered = `${cursor.slice(0, -1)}${
      last === "A" ? "B" : "A"
    }`;
    for (const candidate of ["not valid", tampered]) {
      expect(() =>
        service.resolveCursor(candidate, QUERY_FINGERPRINT),
      ).toThrow("TASK04_QUEUE_REFERENCE_DENIED");
    }
  });
});

describe("Task 04 pharmacist queue staff boundary", () => {
  const staffFacts = {
    actorType: "synthetic_staff",
    actorReference: "SYNTH-PHARMACIST-TASK04-0001",
    sessionReference: "SYNTH-STAFF-SESSION-TASK04-QUEUE-0001",
    sessionActive: true,
    pharmacyId: PHARMACY_ID,
    permissions: ["queue:read"],
  } as const;

  it("accepts only the exact server-owned queue facts shape", () => {
    expect(
      staffPharmacistQueueFactsSchema.safeParse(staffFacts).success,
    ).toBe(true);
    for (const field of [
      "role",
      "tenantId",
      "managementAuthorization",
      "patientCredential",
      "nowUtc",
      "approvalState",
    ]) {
      expect(
        staffPharmacistQueueFactsSchema.safeParse({
          ...staffFacts,
          [field]: "SYNTHETIC-FORBIDDEN",
        }).success,
      ).toBe(false);
    }
  });

  it("fails unknown, inactive, or forged staff context generically", () => {
    const forgedContext = {
      pharmacyId: PHARMACY_ID,
      nowUtc: "2026-08-02T12:00:00.000Z",
    } as Task04AuthoritativeTransactionContext;
    for (const facts of [
      staffFacts,
      { ...staffFacts, sessionActive: false },
      { ...staffFacts, pharmacyId: OTHER_PHARMACY_ID },
      { ...staffFacts, permissions: [] },
    ]) {
      expect(
        authorizeStaffPharmacistQueue(forgedContext, facts),
      ).toEqual({
        authorized: false,
        reasonCode: "NOT_AUTHORIZED",
      });
    }
  });
});
