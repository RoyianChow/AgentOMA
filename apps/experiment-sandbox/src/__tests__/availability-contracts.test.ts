import { describe, expect, it } from "vitest";

import {
  createTask04AvailabilitySchemas,
  sortTask04AvailabilityItems,
  type Task04AvailabilityItem,
} from "../booking/availability-contracts";
import { task04PharmacyCalendarWindow } from "../db/pharmacy-calendar";

const LIMITS = Object.freeze({
  maxPageSize: 10,
  maxAvailabilityWindowDays: 31,
  publicLocationLabel: "Synthetic Pharmacy Location",
  supportedDisplayTimezones: ["America/Toronto"],
});

function schemas() {
  return createTask04AvailabilitySchemas(LIMITS);
}

function validRequest() {
  return {
    serviceCategoryRef: "SYNTH-SERVICE-TASK04-0001",
    modality: "in_person",
    startDate: "2026-08-03",
    endDate: "2026-08-04",
    timezone: "America/Toronto",
    pageSize: 10,
  };
}

function validItem(
  overrides: Record<string, unknown> = {},
): Task04AvailabilityItem {
  return {
    serviceCategoryRef: "SYNTH-SERVICE-TASK04-0001",
    serviceCategoryLabel: "Synthetic administrative service",
    modality: "in_person",
    publicLocationLabel: "Synthetic Pharmacy Location",
    startTimeUtc: "2026-08-04T14:00:00.000Z",
    endTimeUtc: "2026-08-04T14:30:00.000Z",
    displayTimezone: "America/Toronto",
    availabilityState: "available",
    slotReference:
      "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_slot",
    slotReferenceExpiresAtUtc: "2026-08-02T12:15:00.000Z",
    ...overrides,
  } as Task04AvailabilityItem;
}

describe("Task 04 public availability contracts", () => {
  it("accepts only the strict canonical request", () => {
    const { availabilityRequestSchema } = schemas();
    expect(availabilityRequestSchema.parse(validRequest())).toEqual(
      validRequest(),
    );
  });

  it.each([
    "pharmacyId",
    "tenantId",
    "staffId",
    "staffing",
    "capacity",
    "remainingCapacity",
    "status",
    "bookingCount",
    "waitlistCount",
    "role",
    "actorReference",
    "subjectReference",
    "authorizationResult",
    "clinicalFreeText",
    "symptoms",
    "notes",
  ])("rejects prohibited availability field %s", (field) => {
    const { availabilityRequestSchema } = schemas();
    expect(
      availabilityRequestSchema.safeParse({
        ...validRequest(),
        [field]: "SYNTHETIC_FORBIDDEN_MARKER_T04",
      }).success,
    ).toBe(false);
  });

  it("accepts same-day and rejects invalid, reversed, and over-31-day ranges", () => {
    const { availabilityRequestSchema } = schemas();
    for (const request of [
      { ...validRequest(), startDate: "2026-02-30" },
      { ...validRequest(), startDate: "2025-02-29" },
      {
        ...validRequest(),
        startDate: "2026-08-05",
        endDate: "2026-08-04",
      },
      {
        ...validRequest(),
        startDate: "2026-08-01",
        endDate: "2026-09-01",
      },
    ]) {
      expect(availabilityRequestSchema.safeParse(request).success).toBe(
        false,
      );
    }
    expect(
      availabilityRequestSchema.safeParse({
        ...validRequest(),
        startDate: "2026-08-04",
        endDate: "2026-08-04",
      }).success,
    ).toBe(true);
    expect(
      availabilityRequestSchema.safeParse({
        ...validRequest(),
        startDate: "2026-08-01",
        endDate: "2026-08-31",
      }).success,
    ).toBe(true);
    expect(
      availabilityRequestSchema.safeParse({
        ...validRequest(),
        startDate: "2024-02-29",
        endDate: "2024-03-01",
      }).success,
    ).toBe(true);
  });

  it.each([
    ["supported timezone", "America/Toronto", true],
    ["valid but unlisted timezone", "America/Vancouver", false],
    ["invalid timezone", "Ontario/Nowhere", false],
    ["empty timezone", "", false],
  ])("validates %s", (_label, timezone, expected) => {
    expect(
      schemas().availabilityRequestSchema.safeParse({
        ...validRequest(),
        timezone,
      }).success,
    ).toBe(expected);
  });

  it("bounds pagination and rejects arbitrary sorting", () => {
    const { availabilityRequestSchema } = schemas();
    expect(
      availabilityRequestSchema.safeParse({
        ...validRequest(),
        pageSize: 1,
      }).success,
    ).toBe(true);
    expect(
      availabilityRequestSchema.safeParse({
        ...validRequest(),
        pageSize: 11,
      }).success,
    ).toBe(false);
    expect(
      availabilityRequestSchema.safeParse({
        ...validRequest(),
        sort: "remainingCapacity",
      }).success,
    ).toBe(false);
  });

  it("accepts only the minimized conditional response shape", () => {
    const { availabilityResponseSchema } = schemas();
    expect(
      availabilityResponseSchema.safeParse({
        success: true,
        data: { items: [validItem()] },
      }).success,
    ).toBe(true);
    for (const field of [
      "slotId",
      "databaseId",
      "staffId",
      "remainingCapacity",
      "configuredCapacity",
      "bookingCount",
      "waitlistCount",
      "pharmacyId",
      "tenantConfiguration",
      "operationalNotes",
    ]) {
      expect(
        availabilityResponseSchema.safeParse({
          success: true,
          data: {
            items: [
              validItem({
                [field]: "SYNTHETIC_FORBIDDEN_MARKER_T04",
              }),
            ],
          },
        }).success,
      ).toBe(false);
    }
  });

  it("uses pharmacy calendar days across Ontario spring DST", () => {
    const window = task04PharmacyCalendarWindow({
      trustedNowUtc: "2026-03-07T05:00:00.000Z",
      timezone: "America/Toronto",
      inclusiveDays: 2,
    });
    expect(window).toEqual({
      startDate: "2026-03-07",
      endExclusiveDate: "2026-03-09",
      startUtc: "2026-03-07T05:00:00.000Z",
      endExclusiveUtc: "2026-03-09T04:00:00.000Z",
    });
    expect(
      Date.parse(window.endExclusiveUtc) -
        Date.parse(window.startUtc),
    ).toBe(47 * 60 * 60 * 1_000);
  });

  it("uses pharmacy calendar days across Ontario fall DST", () => {
    const window = task04PharmacyCalendarWindow({
      trustedNowUtc: "2026-10-31T04:00:00.000Z",
      timezone: "America/Toronto",
      inclusiveDays: 2,
    });
    expect(window).toEqual({
      startDate: "2026-10-31",
      endExclusiveDate: "2026-11-02",
      startUtc: "2026-10-31T04:00:00.000Z",
      endExclusiveUtc: "2026-11-02T05:00:00.000Z",
    });
    expect(
      Date.parse(window.endExclusiveUtc) -
        Date.parse(window.startUtc),
    ).toBe(49 * 60 * 60 * 1_000);
  });

  it("includes the trailing instant of 31 calendar days and excludes the next instant", () => {
    const window = task04PharmacyCalendarWindow({
      trustedNowUtc: "2026-10-15T04:00:00.000Z",
      timezone: "America/Toronto",
      inclusiveDays: 31,
    });
    const trailingSlotStart =
      Date.parse(window.endExclusiveUtc) - 1;
    const outsideSlotStart = Date.parse(window.endExclusiveUtc);
    expect(trailingSlotStart).toBeLessThan(
      Date.parse(window.endExclusiveUtc),
    );
    expect(outsideSlotStart).not.toBeLessThan(
      Date.parse(window.endExclusiveUtc),
    );
    expect(window.endExclusiveDate).toBe("2026-11-15");
  });

  it("enforces location and slot-reference conditional fields", () => {
    const { availabilityItemSchema } = schemas();
    expect(
      availabilityItemSchema.safeParse(
        validItem({ publicLocationLabel: undefined }),
      ).success,
    ).toBe(false);
    expect(
      availabilityItemSchema.safeParse(
        validItem({
          modality: "telephone",
          publicLocationLabel: undefined,
        }),
      ).success,
    ).toBe(true);
    expect(
      availabilityItemSchema.safeParse(
        validItem({
          availabilityState: "unavailable",
          slotReference: undefined,
          slotReferenceExpiresAtUtc: undefined,
        }),
      ).success,
    ).toBe(true);
  });

  it("sorts the minimized projection deterministically", () => {
    const later = validItem({
      startTimeUtc: "2026-08-04T15:00:00.000Z",
      endTimeUtc: "2026-08-04T15:30:00.000Z",
      slotReference:
        "LaterEfGhIjKlMnOpQrStUvWxYz0123456789_slot",
    });
    const earlier = validItem();
    expect(
      sortTask04AvailabilityItems([later, earlier]).map(
        (item) => item.startTimeUtc,
      ),
    ).toEqual([
      "2026-08-04T14:00:00.000Z",
      "2026-08-04T15:00:00.000Z",
    ]);
  });
});
