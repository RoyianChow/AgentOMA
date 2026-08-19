import { TextDecoder } from "node:util";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTask04PharmacistQueueSchemas } from "../booking/pharmacist-queue-contracts";

const testDoubles = vi.hoisted(() => {
  const sql = { synthetic: true };
  return {
    sql,
    createSql: vi.fn(() => sql),
    closeSql: vi.fn(async () => undefined),
    executeQueue: vi.fn(),
  };
});

vi.mock("../db/client", () => ({
  createTask04SandboxSql: testDoubles.createSql,
}));

vi.mock("../db/transaction", () => ({
  closeTask04SandboxSql: testDoubles.closeSql,
}));

vi.mock("../db/pharmacist-queue", () => ({
  executeTask04PharmacistQueue: testDoubles.executeQueue,
}));

vi.mock("../env/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../env/server")>();
  const { withControlledTask04Environment } = await import(
    "./helpers/controlled-environment"
  );
  return withControlledTask04Environment(actual);
});

import { executeTask04QueueUiRequest } from "../app/pharmacist-queue/queue-server";
import PharmacistQueuePage from "../app/pharmacist-queue/page";

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const QUEUE_REFERENCE =
  "SYNTH-QUEUE-ITEM-REFERENCE-SERVER-TEST-0001";
const CURSOR = "SYNTH-QUEUE-CURSOR-SERVER-TEST-0001";

// These cases exercise the UI server boundary, not the lifecycle gate, but they
// reach loadTask04SandboxEnv() through the adapter — which resolves the sandbox
// lifecycle from the wall clock and rejects any prohibited variable present in
// the surrounding shell. Both are made deterministic here so the cases answer
// "is the code correct?" rather than "what machine and what day is this?":
//
//   - the clock is pinned to a fixed instant inside the approved Task 04 window
//     (TASK04_SANDBOX_BUILT_AT 2026-08-01T00:00:00.000Z through
//     TASK04_APPROVED_THROUGH_DATE_UTC 2026-08-05), which the synthetic-fixture
//     rule requires regardless; and
//   - the environment comes from applyControlledTask04Environment(), restored
//     after every case.
//
// Neither relaxes a runtime control. Fail-closed behaviour past the approved
// window is asserted by the final case below rather than left to the calendar,
// and a contaminated real environment is reported by the separate
// `npm run sandbox:verify-environment` command.
const TASK04_APPROVED_WINDOW_INSTANT = "2026-08-04T12:00:00.000Z";
const TASK04_AFTER_APPROVAL_INSTANT = "2026-08-06T00:00:00.000Z";

function backendSuccess() {
  return {
    success: true,
    data: {
      items: [
        {
          queueItemReference: QUEUE_REFERENCE,
          appointmentStartUtc: "2026-08-04T14:00:00.000Z",
          appointmentEndUtc: "2026-08-04T14:30:00.000Z",
          displayTimezone: "America/Toronto",
          serviceCategoryLabel:
            "Synthetic administrative service",
          modality: "in_person",
          administrativeStatus: "pending_confirmation",
          languagePreference: "english",
          accessibilityPreferences: ["none"],
          source: "booking",
          createdAtUtc: "2026-08-02T12:00:00.000Z",
          operationalReason: "confirmation_required",
          actionAvailability: "not_permitted",
        },
      ],
      nextCursor: CURSOR,
      resultCompleteness: "complete",
      unavailableSourceCategories: [],
      freshnessState: "fresh",
      generatedAtUtc: "2026-08-02T12:00:00.000Z",
      refreshGuidance: "none",
    },
  } as const;
}

function queueSchemas() {
  return createTask04PharmacistQueueSchemas({
    maxAccessibilitySelections: 3,
    maxAvailabilityWindowDays: 31,
    maxPageSize: 10,
    supportedDisplayTimezones: ["America/Toronto"],
  });
}

describe("Task 04 pharmacist queue UI server boundary", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(
      new Date(TASK04_APPROVED_WINDOW_INSTANT),
    );
    vi.clearAllMocks();
    testDoubles.executeQueue.mockResolvedValue(
      backendSuccess(),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes the initial and filtered request to the existing backend and closes the connection", async () => {
    const request = {
      status: ["pending_confirmation", "confirmed"],
      modality: "telephone",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      sort: "created_at_asc",
    };
    const result = await executeTask04QueueUiRequest(request);

    expect(testDoubles.createSql).toHaveBeenCalledOnce();
    expect(testDoubles.executeQueue).toHaveBeenCalledOnce();
    const [sql, environment, rawRequest] =
      testDoubles.executeQueue.mock.calls[0]!;
    expect(sql).toBe(testDoubles.sql);
    expect(environment).toMatchObject({
      mode: "synthetic",
      pharmacyId: "SYNTH-PHARMACY-TASK04-LOCAL",
    });
    expect(
      JSON.parse(
        utf8Decoder.decode(rawRequest as Uint8Array),
      ),
    ).toEqual(request);
    expect(testDoubles.closeSql).toHaveBeenCalledWith(
      testDoubles.sql,
    );
    expect(result.success).toBe(true);
  });

  it("has the default server page invoke the queue adapter for the initial request", async () => {
    const page = await PharmacistQueuePage();
    const html = renderToStaticMarkup(page);

    expect(testDoubles.executeQueue).toHaveBeenCalledOnce();
    const rawRequest =
      testDoubles.executeQueue.mock.calls[0]![2] as Uint8Array;
    expect(
      JSON.parse(utf8Decoder.decode(rawRequest)),
    ).toEqual({ sort: "start_time_asc" });
    expect(html).toContain("Synthetic pharmacist queue");
    expect(html).toContain(
      "Synthetic administrative service",
    );
  });

  it("removes the opaque item reference before the server-to-client UI boundary", async () => {
    const result = await executeTask04QueueUiRequest({
      sort: "start_time_asc",
    });
    expect(result).toMatchObject({
      success: true,
      data: {
        nextCursor: CURSOR,
        items: [
          {
            serviceCategoryLabel:
              "Synthetic administrative service",
            displayTimezone: "America/Toronto",
          },
        ],
      },
    });
    if (result.success) {
      expect(result.data.items[0]).not.toHaveProperty(
        "queueItemReference",
      );
      expect(result.data.items[0]).toMatchObject({
        appointmentDateLabel: "August 4, 2026",
        appointmentTimeRangeLabel:
          "10:00 AM to 10:30 AM",
        createdLabel: "August 2, 2026 at 8:00 AM",
        displayTimezone: "America/Toronto",
      });
      expect(result.data.items[0]).not.toHaveProperty(
        "appointmentStartUtc",
      );
      expect(result.data.items[0]).not.toHaveProperty(
        "appointmentEndUtc",
      );
      expect(result.data.items[0]).not.toHaveProperty(
        "createdAtUtc",
      );
      expect(JSON.stringify(result.data.items)).not.toContain(
        QUEUE_REFERENCE,
      );
    }
  });

  it("formats the Ontario DST boundary on the server with fixed punctuation and day periods", async () => {
    const response = backendSuccess();
    testDoubles.executeQueue.mockResolvedValue({
      ...response,
      data: {
        ...response.data,
        items: [
          {
            ...response.data.items[0],
            appointmentStartUtc:
              "2026-03-08T06:30:00.000Z",
            appointmentEndUtc:
              "2026-03-08T07:30:00.000Z",
          },
        ],
      },
    });
    const result = await executeTask04QueueUiRequest({
      sort: "start_time_asc",
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        items: [
          {
            appointmentDateLabel: "March 8, 2026",
            appointmentTimeRangeLabel:
              "1:30 AM to 3:30 AM",
            displayTimezone: "America/Toronto",
          },
        ],
      },
    });
  });

  it.each([
    {
      label: "browser-supplied pharmacy scope",
      request: {
        sort: "start_time_asc",
        pharmacyId: "SYNTH-PHARMACY-FORGED",
      },
    },
    {
      label: "excessive inclusive date range",
      request: {
        sort: "start_time_asc",
        startDate: "2026-08-01",
        endDate: "2026-09-01",
      },
    },
    {
      label: "malformed opaque cursor",
      request: {
        sort: "start_time_asc",
        cursor: "not a valid cursor",
      },
    },
  ])("fails $label through the strict committed schema", async ({ request }) => {
    testDoubles.executeQueue.mockImplementation(
      async (_sql, environment, rawRequest: Uint8Array) => {
        const parsed = queueSchemas().pharmacistQueueRequestSchema.safeParse(
          JSON.parse(utf8Decoder.decode(rawRequest)),
        );
        return parsed.success
          ? backendSuccess()
          : {
              success: false,
              error: {
                code: "REQUEST_INVALID",
                message: "We could not process that request.",
              },
            };
      },
    );

    await expect(
      executeTask04QueueUiRequest(request),
    ).resolves.toEqual({
      success: false,
      error: {
        code: "REQUEST_INVALID",
        message: "We could not process that request.",
      },
    });
  });

  it("maps backend exceptions and connection-close failures to the canonical generic error", async () => {
    testDoubles.executeQueue.mockRejectedValueOnce(
      new Error("SYNTHETIC_INTERNAL_DETAIL"),
    );
    const backendFailure = await executeTask04QueueUiRequest({
      sort: "start_time_asc",
    });
    expect(backendFailure).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
    expect(JSON.stringify(backendFailure)).not.toContain(
      "SYNTHETIC_INTERNAL_DETAIL",
    );
    expect(testDoubles.closeSql).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    testDoubles.executeQueue.mockResolvedValue(backendSuccess());
    testDoubles.closeSql.mockRejectedValueOnce(
      new Error("SYNTHETIC_CLOSE_DETAIL"),
    );
    const closeFailure = await executeTask04QueueUiRequest({
      sort: "start_time_asc",
    });
    expect(closeFailure).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
    expect(JSON.stringify(closeFailure)).not.toContain(
      "SYNTHETIC_CLOSE_DETAIL",
    );
  });

  it("fails closed past the approved Task 04 window without reaching the queue adapter or leaking the lifecycle reason", async () => {
    vi.setSystemTime(
      new Date(TASK04_AFTER_APPROVAL_INSTANT),
    );

    const result = await executeTask04QueueUiRequest({
      sort: "start_time_asc",
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
    expect(testDoubles.createSql).not.toHaveBeenCalled();
    expect(testDoubles.executeQueue).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(
      "SANDBOX_CONFIG_DENIED",
    );
    expect(JSON.stringify(result)).not.toContain(
      "TASK04_APPROVAL_EXPIRED",
    );
  });
});
