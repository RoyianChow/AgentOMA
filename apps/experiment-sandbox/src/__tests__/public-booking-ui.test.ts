import { createElement } from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { PublicBookPageContent } from "../app/book/page";
import {
  createTask04BookInteractionState,
  task04BookInteractionReducer,
  type Task04BookAvailabilityActionResult,
  type Task04BookCatalogResult,
  type Task04BookCreateActionResult,
} from "../app/book/book-ui-model";
import { BookingWorkspace } from "../app/book/booking-workspace";
import {
  installTask04TestDom,
  task04ButtonByText,
  task04Click,
  task04Deferred,
  task04DispatchChange,
  task04DispatchChecked,
  task04ElementById,
  task04ElementIsDisabled,
  task04ElementsByName,
  task04Eventually,
  task04MaybeButtonByText,
  type Task04DomDocument,
  type Task04DomElement,
} from "./support/task04-test-dom";

const SERVICE_REFERENCE = "S".repeat(43);
const NO_SLOT_SERVICE_REFERENCE = "N".repeat(43);
const SLOT_REFERENCE = "L".repeat(43);
const SECOND_SLOT_REFERENCE = "M".repeat(43);
const PREFERENCE_OPTIONS = {
  languages: [
    "no_preference",
    "english",
    "french",
    "interpretation_coordination_requested",
  ],
  accessibility: [
    "none",
    "mobility_preparation",
    "hearing_preparation",
    "vision_preparation",
    "communication_preparation",
    "contact_about_accommodation",
  ],
} as const;
const CATALOG: Task04BookCatalogResult = {
  success: true,
  items: [
    {
      serviceCategoryRef: SERVICE_REFERENCE,
      serviceCategoryLabel:
        "Synthetic administrative service",
      supportedModalities: ["in_person", "telephone"],
    },
    {
      serviceCategoryRef: NO_SLOT_SERVICE_REFERENCE,
      serviceCategoryLabel: "Synthetic no-slot service",
      supportedModalities: ["video"],
    },
  ],
};

function availability(
  slotReference = SLOT_REFERENCE,
): Extract<
  Task04BookAvailabilityActionResult,
  { success: true }
> {
  return {
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
        slotReference,
      },
    ],
  };
}

function availabilityWithTwoChoices(): Extract<
  Task04BookAvailabilityActionResult,
  { success: true }
> {
  const first = availability().items[0]!;
  return {
    success: true,
    items: [
      first,
      {
        ...first,
        appointmentTimeRangeLabel:
          "11:00 AM to 11:30 AM",
        slotReference: SECOND_SLOT_REFERENCE,
      },
    ],
  };
}

function confirmed(): Task04BookCreateActionResult {
  return {
    success: true,
    data: {
      status: "confirmed",
      appointmentDateLabel: "August 4, 2026",
      appointmentTimeRangeLabel: "10:00 AM to 10:30 AM",
      displayTimezone: "America/Toronto",
      serviceCategoryLabel:
        "Synthetic administrative service",
      modality: "in_person",
      publicLocationLabel: "Synthetic Pharmacy Location",
    },
  };
}

function pending(): Task04BookCreateActionResult {
  return {
    success: true,
    data: {
      status: "pending_confirmation",
      appointmentDateLabel: "August 4, 2026",
      appointmentTimeRangeLabel: "10:00 AM to 10:30 AM",
      displayTimezone: "America/Toronto",
      serviceCategoryLabel:
        "Synthetic administrative service",
      modality: "in_person",
      publicLocationLabel: "Synthetic Pharmacy Location",
      confirmationDeadlineLabel:
        "August 4, 2026 at 10:15 AM",
    },
  };
}

describe("Task 04 public booking presentation and state model", () => {
  it("renders one accessible page heading, the complete catalog, and only safe initial controls", () => {
    const html = renderToStaticMarkup(
      createElement(PublicBookPageContent, {
        initialCatalog: CATALOG,
      }),
    );

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Book an appointment");
    expect(html).toContain("Synthetic Pharmacy Location");
    expect(html).toContain(
      "Synthetic administrative service",
    );
    expect(html).toContain("Synthetic no-slot service");
    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend>Find an appointment</legend>");
    expect(html).toContain('type="date"');
    expect(html).toContain('role="status"');
    expect(html).not.toMatch(
      /(?:bookingReference|managementCapability|credential|receiptId|idempotencyKey|SYNTH-PHARMACY|remainingCapacity)/,
    );
  });

  it("renders catalog failure as one generic public alert without interactive unavailable actions", () => {
    const html = renderToStaticMarkup(
      createElement(PublicBookPageContent, {
        initialCatalog: {
          success: false,
          message: "This service is temporarily unavailable.",
        },
      }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain(
      "This service is temporarily unavailable.",
    );
    expect(html).not.toContain("Search times");
    expect(html).not.toContain("Book appointment");
  });

  it("invalidates old selection and ignores superseded responses by request identity", () => {
    let state = createTask04BookInteractionState(CATALOG);
    state = task04BookInteractionReducer(state, {
      type: "search_draft_changed",
      draft: {
        serviceCategoryRef: SERVICE_REFERENCE,
        modality: "in_person",
        startDate: "2026-08-04",
        endDate: "2026-08-04",
      },
    });
    state = task04BookInteractionReducer(state, {
      type: "request_started",
      pendingRequest: {
        id: 1,
        kind: "search",
        searchRequest: state.searchDraft,
      },
    });
    state = task04BookInteractionReducer(state, {
      type: "search_succeeded",
      requestId: 1,
      result: availabilityWithTwoChoices(),
    });
    state = task04BookInteractionReducer(state, {
      type: "appointment_selected",
      slotReference: SLOT_REFERENCE,
    });
    expect(state.screen).toBe("selected_appointment");
    state = task04BookInteractionReducer(state, {
      type: "appointment_selected",
      slotReference: SECOND_SLOT_REFERENCE,
    });
    expect(state.selectedSlotReference).toBe(
      SECOND_SLOT_REFERENCE,
    );

    state = task04BookInteractionReducer(state, {
      type: "search_draft_changed",
      draft: {
        ...state.searchDraft,
        endDate: "2026-08-05",
      },
    });
    expect(state.selectedSlotReference).toBeUndefined();
    expect(state.availabilityItems).toEqual([]);

    state = task04BookInteractionReducer(state, {
      type: "request_started",
      pendingRequest: {
        id: 2,
        kind: "search",
        searchRequest: state.searchDraft,
      },
    });
    state = task04BookInteractionReducer(state, {
      type: "search_succeeded",
      requestId: 2,
      result: availability(SECOND_SLOT_REFERENCE),
    });
    const finalState = task04BookInteractionReducer(state, {
      type: "request_failed",
      requestId: 1,
      failure: {
        success: false,
        kind: "unavailable",
        message: "This service is temporarily unavailable.",
      },
    });
    expect(finalState.availabilityItems).toEqual(
      availability(SECOND_SLOT_REFERENCE).items,
    );
    expect(finalState.screen).toBe("available_results");
  });
});

type MountedBooking = Readonly<{
  container: Task04DomElement;
  root: Root;
}>;

let testDocument: Task04DomDocument;
let createRoot: typeof import("react-dom/client")["createRoot"];
let restoreDom: (() => void) | undefined;
const mountedBookings: MountedBooking[] = [];

function mountBooking(
  searchAvailability: (
    input: unknown,
  ) => Promise<Task04BookAvailabilityActionResult>,
  createBooking: (
    input: unknown,
  ) => Promise<Task04BookCreateActionResult>,
): MountedBooking {
  const container = testDocument.createElement("div");
  testDocument.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  flushSync(() => {
    root.render(
      createElement(BookingWorkspace, {
        initialCatalog: CATALOG,
        searchAvailability,
        createBooking,
        preferenceOptions: PREFERENCE_OPTIONS,
      }),
    );
  });
  const mounted = { container, root };
  mountedBookings.push(mounted);
  return mounted;
}

function fillSearch(
  container: Task04DomElement,
  options: Readonly<{
    serviceReference?: string;
    modality?: string;
    startDate?: string;
    endDate?: string;
  }> = {},
): void {
  task04DispatchChange(
    task04ElementById(container, "booking-service"),
    options.serviceReference ?? SERVICE_REFERENCE,
  );
  task04DispatchChange(
    task04ElementById(container, "booking-modality"),
    options.modality ?? "in_person",
  );
  task04DispatchChange(
    task04ElementById(container, "booking-start-date"),
    options.startDate ?? "2026-08-04",
  );
  task04DispatchChange(
    task04ElementById(container, "booking-end-date"),
    options.endDate ?? "2026-08-04",
  );
}

async function selectOnlyAppointment(
  container: Task04DomElement,
): Promise<void> {
  await task04Eventually(() => {
    const radios = task04ElementsByName(
      container,
      "booking-appointment",
    );
    expect(radios).toHaveLength(1);
    expect(task04ElementIsDisabled(radios[0]!)).toBe(false);
  });
  task04DispatchChecked(
    task04ElementsByName(
      container,
      "booking-appointment",
    )[0]!,
    true,
  );
}

function acceptAcknowledgements(
  container: Task04DomElement,
): void {
  for (const key of [
    "administrativeOnly",
    "notMonitored",
    "noMedicalDetails",
    "notClinicalAssessment",
    "statusControlsConfirmation",
  ]) {
    task04DispatchChecked(
      task04ElementById(container, `booking-ack-${key}`),
      true,
    );
  }
}

describe("Task 04 mounted public booking interactions", () => {
  beforeAll(async () => {
    const installed = installTask04TestDom();
    testDocument = installed.document;
    restoreDom = installed.restore;
    createRoot = (await import("react-dom/client")).createRoot;
  });

  afterEach(async () => {
    while (mountedBookings.length > 0) {
      const mounted = mountedBookings.pop()!;
      flushSync(() => mounted.root.unmount());
      mounted.container.parentNode?.removeChild(
        mounted.container,
      );
    }
    await new Promise<void>((resolvePromise) => {
      setTimeout(resolvePromise, 0);
    });
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolvePromise) => {
      setTimeout(resolvePromise, 0);
    });
    restoreDom?.();
  });

  it("constrains modality, sends one minimized same-day search, selects one radio, and submits one minimized booking", async () => {
    const searchResponse =
      task04Deferred<Task04BookAvailabilityActionResult>();
    const bookingResponse =
      task04Deferred<Task04BookCreateActionResult>();
    const searchAction = vi.fn<
      (input: unknown) => Promise<Task04BookAvailabilityActionResult>
    >(() => searchResponse.promise);
    const bookingAction = vi.fn<
      (input: unknown) => Promise<Task04BookCreateActionResult>
    >(() => bookingResponse.promise);
    const { container } = mountBooking(
      searchAction,
      bookingAction,
    );

    fillSearch(container);
    expect(
      task04ElementById(container, "booking-modality")
        .options.map((option) => option.value),
    ).toEqual(["", "in_person", "telephone"]);
    const searchButton = task04ButtonByText(
      container,
      "Search times",
    );
    expect(
      task04ElementById(container, "booking-service").value,
    ).toBe(SERVICE_REFERENCE);
    expect(
      task04ElementById(container, "booking-modality").value,
    ).toBe("in_person");
    expect(
      task04ElementById(container, "booking-start-date").value,
    ).toBe("2026-08-04");
    expect(
      task04ElementById(container, "booking-end-date").value,
    ).toBe("2026-08-04");
    expect(task04ElementIsDisabled(searchButton)).toBe(false);
    task04Click(searchButton);
    task04Click(searchButton);
    expect(searchAction).toHaveBeenCalledOnce();
    expect(searchAction).toHaveBeenCalledWith({
      serviceCategoryRef: SERVICE_REFERENCE,
      modality: "in_person",
      startDate: "2026-08-04",
      endDate: "2026-08-04",
    });
    expect(searchAction.mock.calls[0]![0]).not.toMatchObject({
      pharmacyId: expect.anything(),
      timezone: expect.anything(),
      actorId: expect.anything(),
      capacity: expect.anything(),
    });
    expect(task04ElementIsDisabled(searchButton)).toBe(true);

    searchResponse.resolve(availability());
    await task04Eventually(() => {
      expect(container.textContent).toContain("August 4, 2026");
      expect(container.textContent).toContain(
        "10:00 AM to 10:30 AM",
      );
      expect(container.textContent).toContain(
        "Timezone: America/Toronto",
      );
    });
    expect(container.textContent).not.toContain(SLOT_REFERENCE);
    expect(
      task04ElementsByName(
        container,
        "booking-appointment",
      ).some(
        (element) =>
          element.value === SLOT_REFERENCE ||
          element.getAttribute("href") === SLOT_REFERENCE,
      ),
    ).toBe(false);
    await selectOnlyAppointment(container);
    const bookButton = task04ButtonByText(
      container,
      "Book appointment",
    );
    expect(task04ElementIsDisabled(bookButton)).toBe(true);
    acceptAcknowledgements(container);
    expect(task04ElementIsDisabled(bookButton)).toBe(false);

    task04Click(bookButton);
    task04Click(bookButton);
    expect(bookingAction).toHaveBeenCalledOnce();
    expect(bookingAction).toHaveBeenCalledWith({
      slotReference: SLOT_REFERENCE,
      languagePreference: "no_preference",
      accessibilityPreferences: ["none"],
      administrativeAcknowledgements: {
        administrativeOnly: true,
        notMonitored: true,
        noMedicalDetails: true,
        notClinicalAssessment: true,
        statusControlsConfirmation: true,
      },
    });
    expect(bookingAction.mock.calls[0]![0]).not.toMatchObject({
      idempotencyKey: expect.anything(),
      syntheticContactReference: expect.anything(),
      actorId: expect.anything(),
      subjectId: expect.anything(),
      sessionId: expect.anything(),
      pharmacyId: expect.anything(),
    });
    expect(task04ElementIsDisabled(bookButton)).toBe(true);

    bookingResponse.resolve(confirmed());
    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "Booking confirmed",
      );
      expect(container.textContent).toContain(
        "No external message was sent.",
      );
    });
    expect(container.textContent).not.toContain(SLOT_REFERENCE);
    expect(
      task04MaybeButtonByText(container, "Book appointment"),
    ).toBeUndefined();
  });

  it("supports a multi-day request, exact no-availability wording, and Reset without retaining a slot", async () => {
    const searchAction = vi
      .fn<
        (
          input: unknown,
        ) => Promise<Task04BookAvailabilityActionResult>
      >()
      .mockResolvedValueOnce(availability())
      .mockResolvedValueOnce({ success: true, items: [] });
    const { container } = mountBooking(
      searchAction,
      vi.fn(async () => confirmed()),
    );

    fillSearch(container, { endDate: "2026-08-10" });
    task04Click(task04ButtonByText(container, "Search times"));
    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "10:00 AM to 10:30 AM",
      );
    });
    await selectOnlyAppointment(container);
    expect(
      task04MaybeButtonByText(container, "Book appointment"),
    ).toBeDefined();

    task04Click(task04ButtonByText(container, "Reset"));
    expect(
      task04ElementIsDisabled(
        task04ButtonByText(container, "Search times"),
      ),
    ).toBe(true);
    expect(
      task04MaybeButtonByText(container, "Book appointment"),
    ).toBeUndefined();
    expect(container.textContent).not.toContain(SLOT_REFERENCE);

    fillSearch(container, {
      serviceReference: NO_SLOT_SERVICE_REFERENCE,
      modality: "video",
      endDate: "2026-08-10",
    });
    task04Click(task04ButtonByText(container, "Search times"));
    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "No times are currently available for this service in the selected date range.",
      );
    });
    expect(searchAction).toHaveBeenLastCalledWith({
      serviceCategoryRef: NO_SLOT_SERVICE_REFERENCE,
      modality: "video",
      startDate: "2026-08-04",
      endDate: "2026-08-10",
    });
  });

  it.each([
    {
      label: "reversed",
      startDate: "2026-08-05",
      endDate: "2026-08-04",
    },
    {
      label: "over 31 days",
      startDate: "2026-08-04",
      endDate: "2026-09-04",
    },
  ])(
    "renders only the generic validation result for a $label date range",
    async ({ startDate, endDate }) => {
      const searchAction = vi.fn(async () => ({
        success: false as const,
        kind: "validation" as const,
        message: "We could not process that request.",
      }));
      const { container } = mountBooking(
        searchAction,
        vi.fn(async () => confirmed()),
      );
      fillSearch(container, { startDate, endDate });
      task04Click(
        task04ButtonByText(container, "Search times"),
      );

      await task04Eventually(() => {
        expect(container.textContent).toContain(
          "We could not process that request.",
        );
      });
      expect(searchAction).toHaveBeenCalledWith({
        serviceCategoryRef: SERVICE_REFERENCE,
        modality: "in_person",
        startDate,
        endDate,
      });
      expect(
        task04MaybeButtonByText(
          container,
          "Book appointment",
        ),
      ).toBeUndefined();
    },
  );

  it("invalidates an in-flight search on Reset so its older success cannot restore results", async () => {
    const response =
      task04Deferred<Task04BookAvailabilityActionResult>();
    const searchAction = vi.fn<
      (input: unknown) => Promise<Task04BookAvailabilityActionResult>
    >(() => response.promise);
    const { container } = mountBooking(
      searchAction,
      vi.fn(async () => confirmed()),
    );
    fillSearch(container);
    task04Click(task04ButtonByText(container, "Search times"));
    task04Click(task04ButtonByText(container, "Reset"));
    expect(
      task04ElementIsDisabled(
        task04ButtonByText(container, "Search times"),
      ),
    ).toBe(true);

    response.resolve(availability());
    await new Promise<void>((resolvePromise) => {
      setTimeout(resolvePromise, 0);
    });
    expect(container.textContent).not.toContain(
      "10:00 AM to 10:30 AM",
    );
    expect(searchAction).toHaveBeenCalledOnce();
  });

  it("renders pending confirmation honestly and never offers unavailable management actions", async () => {
    const searchResponse =
      task04Deferred<Task04BookAvailabilityActionResult>();
    const { container } = mountBooking(
      vi.fn(() => searchResponse.promise),
      vi.fn(async () => pending()),
    );
    fillSearch(container);
    task04Click(task04ButtonByText(container, "Search times"));
    searchResponse.resolve(availability());
    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "10:00 AM to 10:30 AM",
      );
    });
    await selectOnlyAppointment(container);
    acceptAcknowledgements(container);
    task04Click(
      task04ButtonByText(container, "Book appointment"),
    );
    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "Booking request received",
      );
      expect(container.textContent).toContain(
        "It is not yet confirmed.",
      );
      expect(container.textContent).toContain(
        "August 4, 2026 at 10:15 AM America/Toronto",
      );
    });
    expect(container.textContent).not.toContain(
      "Booking confirmed",
    );
    expect(container.textContent).not.toMatch(
      /(?:Cancel|Reschedule|Manage booking|credential|capability)/i,
    );
  });

  it("forces a fresh search after stale booking failure and exposes only generic unexpected failures", async () => {
    const searchResponse =
      task04Deferred<Task04BookAvailabilityActionResult>();
    const bookingAction = vi
      .fn<
        (
          input: unknown,
        ) => Promise<Task04BookCreateActionResult>
      >()
      .mockResolvedValueOnce({
        success: false,
        kind: "stale_availability",
        message: "That appointment time is no longer available.",
      });
    const { container } = mountBooking(
      vi.fn(() => searchResponse.promise),
      bookingAction,
    );
    fillSearch(container);
    task04Click(task04ButtonByText(container, "Search times"));
    searchResponse.resolve(availability());
    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "10:00 AM to 10:30 AM",
      );
    });
    await selectOnlyAppointment(container);
    acceptAcknowledgements(container);
    task04Click(
      task04ButtonByText(container, "Book appointment"),
    );
    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "That appointment time is no longer available.",
      );
      expect(container.textContent).toContain(
        "Search again to choose a current appointment time.",
      );
    });
    expect(
      task04MaybeButtonByText(container, "Book appointment"),
    ).toBeUndefined();
    expect(container.textContent).not.toContain(SLOT_REFERENCE);

    const failingSearch = vi.fn(async () => {
      throw new Error("SQL INTERNAL SECRET");
    });
    const failedMount = mountBooking(
      failingSearch,
      vi.fn(async () => confirmed()),
    );
    fillSearch(failedMount.container);
    task04Click(
      task04ButtonByText(
        failedMount.container,
        "Search times",
      ),
    );
    await task04Eventually(() => {
      expect(failedMount.container.textContent).toContain(
        "This service is temporarily unavailable.",
      );
    });
    expect(failedMount.container.textContent).not.toContain(
      "SQL INTERNAL SECRET",
    );
  });

  it("invalidates a selected slot after booking validation failure while preserving only explicit temporary retry state", async () => {
    const validationBooking = vi.fn(async () => ({
      success: false as const,
      kind: "validation" as const,
      message: "We could not process that request.",
    }));
    const validationMount = mountBooking(
      vi.fn(async () => availability()),
      validationBooking,
    );
    fillSearch(validationMount.container);
    task04Click(
      task04ButtonByText(
        validationMount.container,
        "Search times",
      ),
    );
    await selectOnlyAppointment(validationMount.container);
    acceptAcknowledgements(validationMount.container);
    expect(
      task04ElementIsDisabled(
        task04ButtonByText(
          validationMount.container,
          "Book appointment",
        ),
      ),
    ).toBe(false);

    task04Click(
      task04ButtonByText(
        validationMount.container,
        "Book appointment",
      ),
    );
    await task04Eventually(() => {
      expect(validationMount.container.textContent).toContain(
        "We could not process that request.",
      );
      expect(
        task04MaybeButtonByText(
          validationMount.container,
          "Book appointment",
        ),
      ).toBeUndefined();
    });
    expect(validationBooking).toHaveBeenCalledOnce();
    expect(validationBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        slotReference: SLOT_REFERENCE,
      }),
    );
    expect(validationMount.container.textContent).not.toContain(
      SLOT_REFERENCE,
    );
    expect(validationMount.container.textContent).not.toContain(
      "INTERNAL_VALIDATION_REASON",
    );
    await task04Eventually(() => {
      expect(
        task04ElementIsDisabled(
          task04ButtonByText(
            validationMount.container,
            "Search times",
          ),
        ),
      ).toBe(false);
    });

    const temporaryBooking = vi.fn<
      (input: unknown) => Promise<Task04BookCreateActionResult>
    >(async () => ({
      success: false,
      kind: "unavailable",
      message: "This service is temporarily unavailable.",
    }));
    const temporaryMount = mountBooking(
      vi.fn(async () => availability(SECOND_SLOT_REFERENCE)),
      temporaryBooking,
    );
    fillSearch(temporaryMount.container);
    task04Click(
      task04ButtonByText(temporaryMount.container, "Search times"),
    );
    await selectOnlyAppointment(temporaryMount.container);
    acceptAcknowledgements(temporaryMount.container);
    task04Click(
      task04ButtonByText(
        temporaryMount.container,
        "Book appointment",
      ),
    );
    await task04Eventually(() => {
      expect(temporaryMount.container.textContent).toContain(
        "This service is temporarily unavailable.",
      );
      const retryButton = task04MaybeButtonByText(
        temporaryMount.container,
        "Book appointment",
      );
      expect(retryButton).toBeDefined();
      expect(task04ElementIsDisabled(retryButton!)).toBe(false);
    });
    expect(temporaryBooking).toHaveBeenCalledOnce();
    task04Click(
      task04ButtonByText(
        temporaryMount.container,
        "Book appointment",
      ),
    );
    await task04Eventually(() => {
      expect(temporaryBooking).toHaveBeenCalledTimes(2);
    });
    expect(temporaryBooking.mock.calls[1]![0]).toEqual(
      temporaryBooking.mock.calls[0]![0],
    );
  });
});
