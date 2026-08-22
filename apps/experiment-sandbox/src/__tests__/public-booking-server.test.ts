import { TextDecoder } from "node:util";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  TASK04_SAFE_ERROR_MESSAGES,
  Task04KnownFailure,
} from "../booking/safe-errors";
import {
  mapTask04SafeError,
} from "../booking/safe-errors";
import {
  createTask04PublicBookServer,
  task04PublicBookAppointmentLabels,
} from "../app/book/book-server";
import {
  createTask04PublicBookPage,
  PublicBookPageContent,
} from "../app/book/page";
import type { Task04AvailabilityResponseData } from "../booking/availability-contracts";
import type { Task04SandboxSql } from "../db/client";
import type { Task04BookingCreateCommandResult } from "../db/booking-create";
import type { Task04ServiceCatalogResult } from "../db/service-catalog";
import {
  parseTask04SandboxEnv,
  task04SyntheticEnvironmentInput,
  type Task04SandboxEnv,
} from "../env/server";

const SERVICE_REFERENCE = "S".repeat(43);
const SECOND_SERVICE_REFERENCE = "T".repeat(43);
const SLOT_REFERENCE = "L".repeat(43);
const BOOKING_REFERENCE = "B".repeat(43);
const CAPABILITY_REFERENCE = "C".repeat(43);
const RECEIPT_REFERENCE = "R".repeat(43);
const environment = parseTask04SandboxEnv(
  task04SyntheticEnvironmentInput(),
  new Date("2026-08-04T12:00:00.000Z"),
);
const sql = { synthetic: true } as unknown as Task04SandboxSql;
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

function catalogSuccess(): Task04ServiceCatalogResult {
  return {
    success: true,
    data: {
      items: [
        {
          serviceCategoryRef: SERVICE_REFERENCE,
          serviceCategoryLabel:
            "Synthetic administrative service",
          supportedModalities: ["in_person", "telephone"],
        },
        {
          serviceCategoryRef: SECOND_SERVICE_REFERENCE,
          serviceCategoryLabel: "Synthetic no-slot service",
          supportedModalities: ["video"],
        },
      ],
    },
  };
}

function availabilitySuccess(): Task04AvailabilityResponseData {
  return {
    items: [
      {
        serviceCategoryRef: SERVICE_REFERENCE,
        serviceCategoryLabel:
          "Synthetic administrative service",
        modality: "in_person",
        publicLocationLabel: "Synthetic Pharmacy Location",
        startTimeUtc: "2026-08-04T14:00:00.000Z",
        endTimeUtc: "2026-08-04T14:30:00.000Z",
        displayTimezone: "America/Toronto",
        availabilityState: "available",
        slotReference: SLOT_REFERENCE,
        slotReferenceExpiresAtUtc:
          "2026-08-04T14:15:00.000Z",
      },
    ],
  };
}

function bookingSuccess(
  status: "confirmed" | "pending_confirmation" = "confirmed",
): Task04BookingCreateCommandResult {
  return {
    success: true,
    data: {
      bookingReference: BOOKING_REFERENCE,
      status,
      serviceCategoryLabel:
        "Synthetic administrative service",
      modality: "in_person",
      startTimeUtc: "2026-08-04T14:00:00.000Z",
      endTimeUtc: "2026-08-04T14:30:00.000Z",
      displayTimezone: "America/Toronto",
      ...(status === "pending_confirmation"
        ? {
            confirmationExpiresAtUtc:
              "2026-08-04T14:15:00.000Z",
          }
        : {}),
      managementCapability: {
        capabilityReference: CAPABILITY_REFERENCE,
        usageMode: "reusable",
        permittedActions: ["booking:view"],
        expiresAtUtc: "2026-08-05T23:59:59.999Z",
      },
      syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
    },
    receiptId: RECEIPT_REFERENCE,
  };
}

function dependencies() {
  const createSql = vi.fn<
    (environment: Task04SandboxEnv) => Task04SandboxSql
  >(() => sql);
  const closeSql = vi.fn<
    (sql: Task04SandboxSql) => Promise<void>
  >(async () => undefined);
  const readCatalog = vi.fn<
    (
      sql: Task04SandboxSql,
      environment: Task04SandboxEnv,
    ) => Promise<Task04ServiceCatalogResult>
  >(async () => catalogSuccess());
  const readAvailability = vi.fn<
    (
      sql: Task04SandboxSql,
      environment: Task04SandboxEnv,
      input: unknown,
    ) => Promise<Task04AvailabilityResponseData>
  >(async () => availabilitySuccess());
  const createBooking = vi.fn<
    (
      sql: Task04SandboxSql,
      environment: Task04SandboxEnv,
      authoritativeRawRequest: Uint8Array,
    ) => Promise<Task04BookingCreateCommandResult>
  >(async () => bookingSuccess());
  return {
    loadEnvironment: vi.fn(() => environment),
    createSql,
    closeSql,
    readCatalog,
    readAvailability,
    createBooking,
  };
}

function validSearch() {
  return {
    serviceCategoryRef: SERVICE_REFERENCE,
    modality: "in_person",
    startDate: "2026-08-04",
    endDate: "2026-08-04",
  } as const;
}

function validBooking() {
  return {
    slotReference: SLOT_REFERENCE,
    languagePreference: "english",
    accessibilityPreferences: ["none"],
    administrativeAcknowledgements: {
      administrativeOnly: true,
      notMonitored: true,
      noMedicalDetails: true,
      notClinicalAssessment: true,
      statusControlsConfirmation: true,
    },
  } as const;
}

describe("Task 04 public booking server UI boundary", () => {
  it("loads and server-renders the committed minimized catalog, including a service with no slots", async () => {
    const boundary = dependencies();
    const server = createTask04PublicBookServer(boundary);
    const catalog = await server.loadCatalog();
    const loadCatalog = vi.fn(async () => catalog);
    const page = await createTask04PublicBookPage(loadCatalog)();
    const html = renderToStaticMarkup(page);

    expect(boundary.readCatalog).toHaveBeenCalledOnce();
    expect(boundary.createSql).toHaveBeenCalledWith(environment);
    expect(boundary.closeSql).toHaveBeenCalledWith(sql);
    expect(loadCatalog).toHaveBeenCalledOnce();
    expect(html).toContain("<h1");
    expect(html).toContain("Book an appointment");
    expect(html).toContain("Synthetic Pharmacy Location");
    expect(html).toContain(
      "Synthetic administrative service",
    );
    expect(html).toContain("Synthetic no-slot service");
    expect(html).not.toMatch(
      /(?:serviceCategoryId|pharmacyId|maxPageSize|capacity|SYNTH-PHARMACY)/,
    );
  });

  it("fails initial approval or lifecycle loading closed with one generic public message", async () => {
    const boundary = dependencies();
    boundary.loadEnvironment.mockImplementation(() => {
      throw new Error("TASK04_APPROVAL_INTERNAL_DETAIL");
    });
    const result = await createTask04PublicBookServer(
      boundary,
    ).loadCatalog();
    const html = renderToStaticMarkup(
      createElement(PublicBookPageContent, {
        initialCatalog: result,
      }),
    );

    expect(result).toEqual({
      success: false,
      message:
        TASK04_SAFE_ERROR_MESSAGES.TEMPORARILY_UNAVAILABLE,
    });
    expect(html).toContain(
      TASK04_SAFE_ERROR_MESSAGES.TEMPORARILY_UNAVAILABLE,
    );
    expect(html).not.toContain(
      "TASK04_APPROVAL_INTERNAL_DETAIL",
    );
    expect(boundary.createSql).not.toHaveBeenCalled();
  });

  it("adds only authoritative timezone and pagination bounds to the exact minimized availability request", async () => {
    const boundary = dependencies();
    const result = await createTask04PublicBookServer(
      boundary,
    ).searchAvailability(validSearch());

    expect(boundary.readAvailability).toHaveBeenCalledWith(
      sql,
      environment,
      {
        ...validSearch(),
        timezone: "America/Toronto",
        pageSize: 10,
      },
    );
    expect(result).toEqual({
      success: true,
      items: [
        {
          appointmentDateLabel: "August 4, 2026",
          appointmentTimeRangeLabel:
            "10:00 AM to 10:30 AM",
          displayTimezone: "America/Toronto",
          serviceCategoryLabel:
            "Synthetic administrative service",
          modality: "in_person",
          publicLocationLabel: "Synthetic Pharmacy Location",
          slotReference: SLOT_REFERENCE,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toMatch(
      /(?:startTimeUtc|endTimeUtc|slotReferenceExpiresAtUtc|nextCursor|remainingCapacity|pharmacyId)/,
    );
    expect(boundary.closeSql).toHaveBeenCalledWith(sql);
  });

  it.each([
    ["pharmacy scope", { pharmacyId: "SYNTH-PHARMACY-FORGED" }],
    ["actor identity", { actorId: "SYNTH-ACTOR-FORGED" }],
    ["trusted time", { nowUtc: "2026-08-04T00:00:00.000Z" }],
    ["timezone authority", { timezone: "America/Vancouver" }],
    ["capacity", { remainingCapacity: 1 }],
    ["pagination cursor", { cursor: "C".repeat(32) }],
  ])(
    "rejects browser-supplied %s before querying availability",
    async (_label, prohibitedField) => {
      const boundary = dependencies();
      const result = await createTask04PublicBookServer(
        boundary,
      ).searchAvailability({
        ...validSearch(),
        ...prohibitedField,
      });

      expect(result).toEqual({
        success: false,
        kind: "validation",
        message: TASK04_SAFE_ERROR_MESSAGES.REQUEST_INVALID,
      });
      expect(boundary.readAvailability).not.toHaveBeenCalled();
      expect(boundary.createSql).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      startDate: "2026-08-05",
      endDate: "2026-08-04",
    },
    {
      startDate: "2026-08-04",
      endDate: "2026-09-04",
    },
  ])(
    "uses the committed calendar-range validation for $startDate through $endDate",
    async ({ startDate, endDate }) => {
      const boundary = dependencies();
      const result = await createTask04PublicBookServer(
        boundary,
      ).searchAvailability({
        ...validSearch(),
        startDate,
        endDate,
      });
      expect(result).toEqual({
        success: false,
        kind: "validation",
        message: TASK04_SAFE_ERROR_MESSAGES.REQUEST_INVALID,
      });
      expect(boundary.readAvailability).not.toHaveBeenCalled();
    },
  );

  it("formats Ontario spring and fall DST examples only at the server boundary", () => {
    expect(
      task04PublicBookAppointmentLabels(
        "2026-03-08T06:30:00.000Z",
        "2026-03-08T07:30:00.000Z",
        "America/Toronto",
      ),
    ).toEqual({
      appointmentDateLabel: "March 8, 2026",
      appointmentTimeRangeLabel: "1:30 AM to 3:30 AM",
    });
    expect(
      task04PublicBookAppointmentLabels(
        "2026-11-01T05:30:00.000Z",
        "2026-11-01T07:30:00.000Z",
        "America/Toronto",
      ),
    ).toEqual({
      appointmentDateLabel: "November 1, 2026",
      appointmentTimeRangeLabel: "1:30 AM to 2:30 AM",
    });
  });

  it("derives stable server-owned booking idempotency and contact fields while stripping command authority", async () => {
    const boundary = dependencies();
    const server = createTask04PublicBookServer(boundary);
    const first = await server.createBooking(validBooking());
    const second = await server.createBooking(validBooking());
    await server.createBooking({
      ...validBooking(),
      languagePreference: "french",
    });
    const rawRequests = boundary.createBooking.mock.calls.map(
      (call) =>
        JSON.parse(
          utf8Decoder.decode(call[2] as Uint8Array),
        ) as Record<string, unknown>,
    );

    expect(rawRequests[0]).toMatchObject({
      ...validBooking(),
      syntheticContactReference:
        "SYNTH-CONTACT-TASK04-0001",
    });
    expect(rawRequests[0]!.idempotencyKey).toEqual(
      rawRequests[1]!.idempotencyKey,
    );
    expect(rawRequests[2]!.idempotencyKey).not.toEqual(
      rawRequests[0]!.idempotencyKey,
    );
    expect(rawRequests[0]!.idempotencyKey).toMatch(
      /^[A-Za-z0-9_-]{16,128}$/,
    );
    expect(first).toEqual(second);
    expect(first).toEqual({
      success: true,
      data: {
        status: "confirmed",
        appointmentDateLabel: "August 4, 2026",
        appointmentTimeRangeLabel:
          "10:00 AM to 10:30 AM",
        displayTimezone: "America/Toronto",
        serviceCategoryLabel:
          "Synthetic administrative service",
        modality: "in_person",
        publicLocationLabel: "Synthetic Pharmacy Location",
      },
    });
    expect(JSON.stringify(first)).not.toMatch(
      new RegExp(
        [
          BOOKING_REFERENCE,
          CAPABILITY_REFERENCE,
          RECEIPT_REFERENCE,
          "managementCapability",
          "receiptId",
          "syntheticNotice",
          "idempotencyKey",
          "syntheticContactReference",
        ].join("|"),
      ),
    );
  });

  it.each([
    ["actor", { actorId: "SYNTH-ACTOR-FORGED" }],
    ["subject", { subjectId: "SYNTH-SUBJECT-FORGED" }],
    ["session", { sessionId: "SYNTH-SESSION-FORGED" }],
    ["pharmacy", { pharmacyId: "SYNTH-PHARMACY-FORGED" }],
    ["role", { role: "pharmacist" }],
    ["capacity", { configuredCapacity: 2 }],
    ["status", { status: "confirmed" }],
    ["trusted time", { nowUtc: "2026-08-04T00:00:00.000Z" }],
    [
      "synthetic contact",
      {
        syntheticContactReference:
          "SYNTH-CONTACT-CALLER-CONTROLLED",
      },
    ],
    ["idempotency key", { idempotencyKey: "I".repeat(32) }],
    [
      "management capability",
      { capabilityReference: "C".repeat(43) },
    ],
  ])(
    "rejects browser-supplied booking %s authority before command execution",
    async (_label, prohibitedField) => {
      const boundary = dependencies();
      const result = await createTask04PublicBookServer(
        boundary,
      ).createBooking({
        ...validBooking(),
        ...prohibitedField,
      });
      expect(result).toEqual({
        success: false,
        kind: "validation",
        message: TASK04_SAFE_ERROR_MESSAGES.REQUEST_INVALID,
      });
      expect(boundary.createBooking).not.toHaveBeenCalled();
      expect(boundary.createSql).not.toHaveBeenCalled();
    },
  );

  it("requires every committed administrative acknowledgement without inventing a new consent", async () => {
    const boundary = dependencies();
    const result = await createTask04PublicBookServer(
      boundary,
    ).createBooking({
      ...validBooking(),
      administrativeAcknowledgements: {
        ...validBooking().administrativeAcknowledgements,
        notMonitored: false,
      },
    });
    expect(result).toEqual({
      success: false,
      kind: "validation",
      message: TASK04_SAFE_ERROR_MESSAGES.REQUEST_INVALID,
    });
    expect(boundary.createBooking).not.toHaveBeenCalled();
  });

  it("projects the pending deadline and preserves stale-slot versus generic public handling", async () => {
    const pendingBoundary = dependencies();
    pendingBoundary.createBooking.mockResolvedValue(
      bookingSuccess("pending_confirmation"),
    );
    await expect(
      createTask04PublicBookServer(
        pendingBoundary,
      ).createBooking(validBooking()),
    ).resolves.toEqual({
      success: true,
      data: {
        status: "pending_confirmation",
        appointmentDateLabel: "August 4, 2026",
        appointmentTimeRangeLabel:
          "10:00 AM to 10:30 AM",
        displayTimezone: "America/Toronto",
        serviceCategoryLabel:
          "Synthetic administrative service",
        modality: "in_person",
        publicLocationLabel: "Synthetic Pharmacy Location",
        confirmationDeadlineLabel:
          "August 4, 2026 at 10:15 AM",
      },
    });

    const staleBoundary = dependencies();
    staleBoundary.createBooking.mockResolvedValue(
      mapTask04SafeError(
        "booking:create",
        new Task04KnownFailure("SLOT_NO_LONGER_AVAILABLE"),
      ),
    );
    const stale = await createTask04PublicBookServer(
      staleBoundary,
    ).createBooking(validBooking());
    expect(stale).toEqual({
      success: false,
      kind: "stale_availability",
      message:
        TASK04_SAFE_ERROR_MESSAGES.SLOT_NO_LONGER_AVAILABLE,
    });

    staleBoundary.createBooking.mockRejectedValueOnce(
      new Error("SQL secret_table"),
    );
    const generic = await createTask04PublicBookServer(
      staleBoundary,
    ).createBooking(validBooking());
    expect(generic).toEqual({
      success: false,
      kind: "unavailable",
      message:
        TASK04_SAFE_ERROR_MESSAGES.TEMPORARILY_UNAVAILABLE,
    });
    expect(JSON.stringify(generic)).not.toMatch(/SQL|secret_table/);
  });
});
