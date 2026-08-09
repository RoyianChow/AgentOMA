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

import {
  PharmacistQueuePageContent,
} from "../app/pharmacist-queue/page";
import PharmacistQueueLoading from "../app/pharmacist-queue/loading";
import {
  QueueFilterForm,
  QueueWorkspace,
} from "../app/pharmacist-queue/queue-workspace";
import {
  createTask04QueueUiInteractionState,
  createTask04DefaultQueueFilterDraft,
  task04QueueResultWithoutCursor,
  task04QueueNextPageRequest,
  task04QueueRequestFromFilterDraft,
  task04QueueUiCanPaginate,
  task04QueueUiInteractionReducer,
  task04QueueUiNextRequest,
  type Task04QueueUiFilterDraft,
  type Task04QueueUiInteractionState,
  type Task04QueueUiRequest,
  type Task04QueueUiResult,
  type Task04QueueUiSuccess,
} from "../app/pharmacist-queue/queue-ui-model";

const CURSOR = "SYNTHETIC_OPAQUE_CURSOR_VALUE_00000001";
const NEXT_CURSOR =
  "SYNTHETIC_OPAQUE_CURSOR_VALUE_00000002";
const QUEUE_REFERENCE =
  "SYNTHETIC_OPAQUE_QUEUE_REFERENCE_MUST_NOT_RENDER";
const FILTER_OPTIONS = {
  statuses: [
    "pending_confirmation",
    "confirmed",
    "rescheduled",
  ],
  modalities: ["in_person", "telephone", "video"],
  sorts: ["start_time_asc", "created_at_asc"],
} as const;

function queueItem(
  administrativeStatus:
    | "pending_confirmation"
    | "confirmed",
  index: number,
) {
  return {
    appointmentDateLabel: "August 4, 2026",
    appointmentTimeRangeLabel:
      index === 1
        ? "10:00 AM to 10:30 AM"
        : "11:00 AM to 11:30 AM",
    displayTimezone: "America/Toronto",
    serviceCategoryLabel:
      index === 1
        ? "Synthetic administrative service"
        : "Synthetic follow-up service",
    modality: index === 1 ? "in_person" : "telephone",
    administrativeStatus,
    languagePreference: index === 1 ? "english" : "french",
    accessibilityPreferences:
      index === 1 ? ["none"] : ["mobility_preparation"],
    source: "booking",
    createdLabel: "August 2, 2026 at 8:00 AM",
    operationalReason:
      administrativeStatus === "pending_confirmation"
        ? "confirmation_required"
        : "appointment_upcoming",
    actionAvailability: "not_permitted",
  } as const;
}

function successResult(options: {
  empty?: boolean;
  next?: boolean;
  partial?: boolean;
  stale?: boolean;
  serviceLabel?: string;
  nextCursor?: string;
} = {}): Task04QueueUiResult {
  const items = options.empty
    ? []
    : [
        {
          ...queueItem("pending_confirmation", 1),
          ...(options.serviceLabel === undefined
            ? {}
            : {
                serviceCategoryLabel:
                  options.serviceLabel,
              }),
        },
        queueItem("confirmed", 2),
      ];
  return {
    success: true,
    data: {
      items,
      ...(options.next
        ? { nextCursor: options.nextCursor ?? CURSOR }
        : {}),
      resultCompleteness: options.partial
        ? "partial"
        : "complete",
      unavailableSourceCategories: options.partial
        ? ["booking_projection"]
        : [],
      freshnessState: options.stale ? "stale" : "fresh",
      generatedAtUtc: "2026-08-02T12:00:00.000Z",
      refreshGuidance:
        options.partial || options.stale
          ? "refresh_available"
          : "none",
    },
  };
}

const runQueueAction = vi.fn(async () => successResult());

function renderWorkspace(result: Task04QueueUiResult): string {
  return renderToStaticMarkup(
    createElement(QueueWorkspace, {
      initialResult: result,
      runQueueAction,
      unavailableMessage:
        "This service is temporarily unavailable.",
      filterOptions: FILTER_OPTIONS,
    }),
  );
}

describe("Task 04 pharmacist queue server-rendered presentation", () => {
  it("renders pending and confirmed minimized items with explicit authoritative timezone", () => {
    const html = renderToStaticMarkup(
      createElement(PharmacistQueuePageContent, {
        initialResult: successResult(),
      }),
    );

    expect(html).toContain("<h1");
    expect(html).toContain("Synthetic pharmacist queue");
    expect(html).toContain("Synthetic Pharmacy Location");
    expect(html).toContain("Pending Confirmation");
    expect(html).toContain("Confirmed");
    expect(html).toContain(
      "Synthetic administrative service",
    );
    expect(html).toContain("August 4, 2026");
    expect(html).toContain("10:00 AM to 10:30 AM");
    expect(html).toContain("Timezone: America/Toronto");
    expect(html).toContain("Language preparation");
    expect(html).toContain("Accessibility preparation");
    expect(html).toContain("No administrative action is available");
  });

  it("renders a safe empty state and canonical generic error without treating failure as empty", () => {
    const emptyHtml = renderWorkspace(
      successResult({ empty: true }),
    );
    expect(emptyHtml).toContain(
      "No matching synthetic administrative booking items",
    );
    expect(emptyHtml).not.toContain("role=\"alert\"");

    const failureHtml = renderWorkspace({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
    expect(failureHtml).toContain("role=\"alert\"");
    expect(failureHtml).toContain(
      "This service is temporarily unavailable.",
    );
    expect(failureHtml).not.toContain(
      "No matching synthetic administrative booking items",
    );
  });

  it("never renders opaque references, cursor values, or prohibited source fields", () => {
    const unsafeFixture = {
      ...successResult({ next: true }),
      queueItemReference: QUEUE_REFERENCE,
      bookingId: "SYNTH-INTERNAL-BOOKING-ID",
      subjectReference: "SYNTH-INTERNAL-SUBJECT",
      contact: "synthetic@example.invalid",
      configuredCapacity: 99,
      clinicalNotes: "SYNTHETIC_FORBIDDEN_MARKER_T04_QUEUE",
    } as unknown as Task04QueueUiResult;
    const html = renderWorkspace(unsafeFixture);

    for (const prohibitedValue of [
      CURSOR,
      QUEUE_REFERENCE,
      "SYNTH-INTERNAL-BOOKING-ID",
      "SYNTH-INTERNAL-SUBJECT",
      "synthetic@example.invalid",
      "SYNTHETIC_FORBIDDEN_MARKER_T04_QUEUE",
    ]) {
      expect(html).not.toContain(prohibitedValue);
    }
    expect(html).not.toMatch(/href=/i);
    expect(html).toContain("Next page");
  });

  it("omits pagination on the final page", () => {
    expect(renderWorkspace(successResult())).not.toContain(
      "Next page",
    );
  });

  it("renders partial and stale response states with accessible status messaging", () => {
    const partialHtml = renderWorkspace(
      successResult({ partial: true }),
    );
    expect(partialHtml).toContain(
      "This is a partial administrative view.",
    );
    expect(partialHtml).toContain('role="status"');
    expect(partialHtml).toContain('aria-live="polite"');

    const staleHtml = renderWorkspace(
      successResult({ stale: true }),
    );
    expect(staleHtml).toContain(
      "These administrative results may be out of date.",
    );
    expect(staleHtml).toContain('role="status"');
    expect(staleHtml).toContain('aria-live="polite"');
  });

  it("renders the route-level loading state accessibly", () => {
    const html = renderToStaticMarkup(
      createElement(PharmacistQueueLoading),
    );
    expect(html).toContain(
      "<h1 id=\"queue-loading-title\">Synthetic pharmacist queue</h1>",
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});

describe("Task 04 pharmacist queue filter and cursor interaction state", () => {
  it("builds only the approved safe filter projection and resets to the default request", () => {
    const request = task04QueueRequestFromFilterDraft({
      statuses: ["pending_confirmation", "confirmed"],
      modality: "telephone",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      sort: "created_at_asc",
    });
    expect(request).toEqual({
      status: ["pending_confirmation", "confirmed"],
      modality: "telephone",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      sort: "created_at_asc",
    });
    expect(
      task04QueueRequestFromFilterDraft(
        createTask04DefaultQueueFilterDraft(),
      ),
    ).toEqual({ sort: "start_time_asc" });
    expect(request).not.toHaveProperty("pharmacyId");
    expect(request).not.toHaveProperty("staffId");
    expect(request).not.toHaveProperty("permission");
  });

  it("keeps the validated filters and ordering bound to the opaque next-page cursor", () => {
    const activeRequest = {
      status: ["confirmed"],
      modality: "video",
      startDate: "2026-08-01",
      endDate: "2026-08-12",
      sort: "start_time_asc",
    } as const;
    expect(
      task04QueueNextPageRequest(activeRequest, CURSOR),
    ).toEqual({
      ...activeRequest,
      cursor: CURSOR,
    });
    expect(activeRequest).not.toHaveProperty("cursor");
  });

  function interactionStateWithCursor(): Task04QueueUiInteractionState {
    return createTask04QueueUiInteractionState(
      successResult({ next: true }),
    );
  }

  function draftWith(
    changes: Partial<Task04QueueUiFilterDraft>,
  ): Task04QueueUiFilterDraft {
    return {
      ...createTask04DefaultQueueFilterDraft(),
      ...changes,
    };
  }

  function startRequest(
    state: Task04QueueUiInteractionState,
    options: {
      id: number;
      kind: "apply" | "reset" | "next";
      request: Task04QueueUiRequest;
    },
  ): Task04QueueUiInteractionState {
    return task04QueueUiInteractionReducer(state, {
      type: "request_started",
      pendingRequest: options,
    });
  }

  function successfulResult(
    state: Task04QueueUiInteractionState,
    requestId: number,
    result: Task04QueueUiSuccess,
  ): Task04QueueUiInteractionState {
    return task04QueueUiInteractionReducer(state, {
      type: "request_succeeded",
      requestId,
      result,
    });
  }

  it.each([
    ["status", { statuses: ["confirmed"] }],
    ["modality", { modality: "video" }],
    ["start date", { startDate: "2026-08-02" }],
    ["end date", { endDate: "2026-08-31" }],
    ["sort", { sort: "created_at_asc" }],
  ])("immediately invalidates pagination after a %s edit", (_label, changes) => {
    const initial = interactionStateWithCursor();
    expect(task04QueueUiCanPaginate(initial)).toBe(true);

    const edited = task04QueueUiInteractionReducer(initial, {
      type: "draft_changed",
      draft: draftWith(changes),
    });
    expect(edited.isDraftDirty).toBe(true);
    expect(task04QueueUiCanPaginate(edited)).toBe(false);
    expect(task04QueueUiNextRequest(edited)).toBeUndefined();
    expect(edited.result).toEqual(
      task04QueueResultWithoutCursor(initial.result),
    );
  });

  it("reset invalidates pagination before submitting the default first page", () => {
    const filteredDraft = draftWith({
      statuses: ["confirmed"],
      sort: "created_at_asc",
    });
    const filteredRequest =
      task04QueueRequestFromFilterDraft(filteredDraft);
    let state = task04QueueUiInteractionReducer(
      interactionStateWithCursor(),
      { type: "draft_changed", draft: filteredDraft },
    );
    state = startRequest(state, {
      id: 1,
      kind: "apply",
      request: filteredRequest,
    });
    state = successfulResult(
      state,
      1,
      successResult({ next: true }) as Task04QueueUiSuccess,
    );
    expect(task04QueueUiCanPaginate(state)).toBe(true);

    const resetDraft =
      createTask04DefaultQueueFilterDraft();
    state = task04QueueUiInteractionReducer(state, {
      type: "draft_changed",
      draft: resetDraft,
    });
    expect(task04QueueUiCanPaginate(state)).toBe(false);
    expect(state.result).toEqual(
      task04QueueResultWithoutCursor(
        successResult({ next: true }),
      ),
    );

    const resetRequest =
      task04QueueRequestFromFilterDraft(resetDraft);
    expect(resetRequest).toEqual({
      sort: "start_time_asc",
    });
    expect(resetRequest).not.toHaveProperty("cursor");
    state = startRequest(state, {
      id: 2,
      kind: "reset",
      request: resetRequest,
    });
    expect(state.pendingRequest?.request).toEqual(
      resetRequest,
    );
  });

  it("successful Apply replaces the first page and stores only its validated base request", () => {
    const draft = draftWith({
      modality: "telephone",
      sort: "created_at_asc",
    });
    const request =
      task04QueueRequestFromFilterDraft(draft);
    let state = task04QueueUiInteractionReducer(
      interactionStateWithCursor(),
      { type: "draft_changed", draft },
    );
    state = startRequest(state, {
      id: 1,
      kind: "apply",
      request,
    });
    expect(state.result).toEqual(
      task04QueueResultWithoutCursor(
        successResult({ next: true }),
      ),
    );
    const replacement = successResult({
      next: true,
      serviceLabel: "Replacement first page",
    }) as Task04QueueUiSuccess;
    state = successfulResult(state, 1, replacement);

    expect(state.result).toEqual(replacement);
    expect(state.appliedRequest).toEqual(request);
    expect(state.appliedRequest).not.toHaveProperty("cursor");
    expect(state.isDraftDirty).toBe(false);
    expect(task04QueueUiCanPaginate(state)).toBe(true);
  });

  it("failed Apply shows a generic failure and cannot retain a stale cursor", () => {
    const draft = draftWith({ modality: "video" });
    const request =
      task04QueueRequestFromFilterDraft(draft);
    let state = task04QueueUiInteractionReducer(
      interactionStateWithCursor(),
      { type: "draft_changed", draft },
    );
    state = startRequest(state, {
      id: 1,
      kind: "apply",
      request,
    });
    state = task04QueueUiInteractionReducer(state, {
      type: "request_failed",
      requestId: 1,
      failure: {
        success: false,
        error: {
          code: "TEMPORARILY_UNAVAILABLE",
          message:
            "This service is temporarily unavailable.",
        },
      },
    });
    expect(state.result).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
    expect(task04QueueUiCanPaginate(state)).toBe(false);
  });

  it("uses the applied request for Next, replaces a successful page, and rejects rapid duplicates", () => {
    const initial = interactionStateWithCursor();
    const nextRequest = task04QueueUiNextRequest(initial);
    expect(nextRequest).toEqual({
      sort: "start_time_asc",
      cursor: CURSOR,
    });

    const pending = startRequest(initial, {
      id: 1,
      kind: "next",
      request: nextRequest!,
    });
    expect(task04QueueUiCanPaginate(pending)).toBe(false);
    const duplicate = startRequest(pending, {
      id: 2,
      kind: "next",
      request: nextRequest!,
    });
    expect(duplicate).toBe(pending);
    expect(duplicate.pendingRequest?.id).toBe(1);

    const finalPage = successResult({
      serviceLabel: "Final replacement page",
    }) as Task04QueueUiSuccess;
    const completed = successfulResult(
      duplicate,
      1,
      finalPage,
    );
    expect(completed.result).toEqual(finalPage);
    expect(task04QueueUiCanPaginate(completed)).toBe(false);
    expect(task04QueueUiNextRequest(completed)).toBeUndefined();
  });

  it("preserves the last successful page after pagination failure while invalidating its cursor", () => {
    const initial = interactionStateWithCursor();
    const pending = startRequest(initial, {
      id: 1,
      kind: "next",
      request: task04QueueUiNextRequest(initial)!,
    });
    const failed = task04QueueUiInteractionReducer(
      pending,
      {
        type: "request_failed",
        requestId: 1,
        failure: {
          success: false,
          error: {
            code: "REQUEST_INVALID",
            message: "We could not process that request.",
          },
        },
      },
    );
    expect(failed.result).toEqual(
      task04QueueResultWithoutCursor(initial.result),
    );
    expect(failed.paginationError?.error.message).toBe(
      "We could not process that request.",
    );
    expect(task04QueueUiCanPaginate(failed)).toBe(false);
  });

  it("cannot mix an edited draft or a second request with an in-flight cursor request", () => {
    const initial = interactionStateWithCursor();
    const pending = startRequest(initial, {
      id: 1,
      kind: "next",
      request: task04QueueUiNextRequest(initial)!,
    });
    const edited = task04QueueUiInteractionReducer(pending, {
      type: "draft_changed",
      draft: draftWith({ modality: "telephone" }),
    });
    const competingReset = startRequest(edited, {
      id: 2,
      kind: "reset",
      request: { sort: "start_time_asc" },
    });
    expect(competingReset.pendingRequest?.id).toBe(1);

    const completed = successfulResult(
      competingReset,
      1,
      successResult({ next: true }) as Task04QueueUiSuccess,
    );
    expect(completed.isDraftDirty).toBe(true);
    expect(task04QueueUiCanPaginate(completed)).toBe(false);
    expect(task04QueueUiNextRequest(completed)).toBeUndefined();
  });

  it("disables native filter actions while a request is pending", () => {
    const html = renderToStaticMarkup(
      createElement(QueueFilterForm, {
        draft: createTask04DefaultQueueFilterDraft(),
        filterOptions: FILTER_OPTIONS,
        isPending: true,
        invalid: false,
        onDraftChange: vi.fn(),
        onSubmit: vi.fn(),
        onReset: vi.fn(),
      }),
    );
    expect(html).toContain("<fieldset");
    expect(html).toContain("disabled=\"\"");
    expect(html.match(/<button[^>]*disabled=""/g)).toHaveLength(2);
    expect(html).toContain("aria-busy=\"true\"");
  });
});

describe("Task 04 pharmacist queue accessibility and time display", () => {
  it("renders associated labels, grouped filters, structured results, and a live region", () => {
    const html = renderWorkspace(successResult());
    expect(html).toContain('for="queue-modality"');
    expect(html).toContain('for="queue-start-date"');
    expect(html).toContain('for="queue-end-date"');
    expect(html).toContain('for="queue-sort"');
    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend>Status</legend>");
    expect(html).toContain("<ol");
    expect(html).toContain("<article");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toMatch(
      /<(?:button|a)[^>]*>(?:Reschedule|Cancel|Confirm|Contact)/i,
    );
  });

  it("renders server-provided deterministic display strings unchanged with the explicit timezone", () => {
    const html = renderWorkspace(successResult());
    expect(html).toContain("August 4, 2026");
    expect(html).toContain("10:00 AM to 10:30 AM");
    expect(html).toContain(
      "August 2, 2026 at 8:00 AM America/Toronto",
    );
    expect(html).toContain("Timezone: America/Toronto");
  });
});

type Task04DomListener = (event: Task04DomEvent) => void;

class Task04DomEvent {
  readonly bubbles = true;
  readonly cancelable = true;
  readonly isTrusted = false;
  readonly timeStamp = Date.now();
  target: Task04DomNode | null = null;
  currentTarget: Task04DomNode | null = null;
  defaultPrevented = false;
  cancelBubble = false;
  returnValue = true;

  constructor(readonly type: string) {}

  preventDefault(): void {
    this.defaultPrevented = true;
    this.returnValue = false;
  }

  stopPropagation(): void {
    this.cancelBubble = true;
  }

  stopImmediatePropagation(): void {
    this.cancelBubble = true;
  }
}

class Task04DomFormData {}

class Task04DomNode {
  parentNode: Task04DomNode | null = null;
  readonly childNodes: Task04DomNode[] = [];
  nodeValue: string | null = null;
  private readonly listeners =
    new Map<string, Task04DomListener[]>();

  constructor(
    readonly nodeType: number,
    readonly nodeName: string,
    readonly ownerDocument: Task04DomDocument,
  ) {}

  appendChild<T extends Task04DomNode>(child: T): T {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore<T extends Task04DomNode>(
    child: T,
    before: Task04DomNode | null,
  ): T {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    const beforeIndex =
      before === null ? -1 : this.childNodes.indexOf(before);
    this.childNodes.splice(
      beforeIndex < 0 ? this.childNodes.length : beforeIndex,
      0,
      child,
    );
    return child;
  }

  removeChild<T extends Task04DomNode>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  addEventListener(
    type: string,
    listener: Task04DomListener,
  ): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: string,
    listener: Task04DomListener,
  ): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter(
        (candidate) => candidate !== listener,
      ),
    );
  }

  dispatchEvent(event: Task04DomEvent): boolean {
    event.target ??= this;
    const previousWindowEvent =
      this.ownerDocument.defaultView.event;
    this.ownerDocument.defaultView.event = event;
    try {
      const eventPath: Task04DomNode[] = [this];
      for (
        let pathNode: Task04DomNode | null = this.parentNode;
        pathNode !== null;
        pathNode = pathNode.parentNode
      ) {
        eventPath.push(pathNode);
      }
      for (const currentNode of eventPath) {
        event.currentTarget = currentNode;
        for (const listener of [
          ...(currentNode.listeners.get(event.type) ?? []),
        ]) {
          listener(event);
          if (event.cancelBubble) break;
        }
        if (event.cancelBubble) break;
      }
    } finally {
      event.currentTarget = null;
      this.ownerDocument.defaultView.event =
        previousWindowEvent;
    }
    return !event.defaultPrevented;
  }

  contains(candidate: Task04DomNode | null): boolean {
    let current = candidate;
    while (current !== null) {
      if (current === this) return true;
      current = current.parentNode;
    }
    return false;
  }

  get firstChild(): Task04DomNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): Task04DomNode | null {
    return this.childNodes.at(-1) ?? null;
  }

  get nextSibling(): Task04DomNode | null {
    if (this.parentNode === null) return null;
    const index = this.parentNode.childNodes.indexOf(this);
    return this.parentNode.childNodes[index + 1] ?? null;
  }

  get textContent(): string {
    if (this.nodeType === 3 || this.nodeType === 8) {
      return this.nodeValue ?? "";
    }
    return this.childNodes
      .map((child) => child.textContent)
      .join("");
  }

  set textContent(value: string) {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes.splice(0);
    if (value !== "") {
      this.appendChild(
        this.ownerDocument.createTextNode(value),
      );
    }
  }
}

class Task04DomElement extends Task04DomNode {
  readonly tagName: string;
  readonly namespaceURI: string;
  readonly style: Record<string, string> = {};
  value = "";
  checked = false;
  selected = false;
  disabled = false;
  multiple = false;
  className = "";
  id = "";
  type = "";
  name = "";
  private readonly attributes = new Map<string, string>();

  constructor(
    name: string,
    ownerDocument: Task04DomDocument,
    namespaceURI = "http://www.w3.org/1999/xhtml",
  ) {
    const normalizedName = name.toUpperCase();
    super(1, normalizedName, ownerDocument);
    this.tagName = normalizedName;
    this.namespaceURI = namespaceURI;
  }

  setAttribute(name: string, value: string): void {
    const normalizedName = name.toLowerCase();
    const normalizedValue = String(value);
    this.attributes.set(normalizedName, normalizedValue);
    if (normalizedName === "class") this.className = normalizedValue;
    if (normalizedName === "id") this.id = normalizedValue;
    if (normalizedName === "type") this.type = normalizedValue;
    if (normalizedName === "name") this.name = normalizedValue;
    if (normalizedName === "value") this.value = normalizedValue;
    if (normalizedName === "disabled") this.disabled = true;
    if (normalizedName === "multiple") this.multiple = true;
  }

  setAttributeNS(
    _namespace: string | null,
    name: string,
    value: string,
  ): void {
    this.setAttribute(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase());
  }

  removeAttribute(name: string): void {
    const normalizedName = name.toLowerCase();
    this.attributes.delete(normalizedName);
    if (normalizedName === "disabled") this.disabled = false;
    if (normalizedName === "multiple") this.multiple = false;
  }

  removeAttributeNS(
    _namespace: string | null,
    name: string,
  ): void {
    this.removeAttribute(name);
  }

  get options(): Task04DomElement[] {
    return task04DomElementsUnder(this).filter(
      (element) => element.tagName === "OPTION",
    );
  }

  focus(): void {
    this.ownerDocument.activeElement = this;
  }

  blur(): void {
    if (this.ownerDocument.activeElement === this) {
      this.ownerDocument.activeElement =
        this.ownerDocument.body;
    }
  }
}

class Task04DomDocument extends Task04DomNode {
  readonly documentElement: Task04DomElement;
  readonly body: Task04DomElement;
  activeElement: Task04DomElement;
  defaultView!: Task04DomWindow;

  constructor() {
    super(
      9,
      "#document",
      undefined as unknown as Task04DomDocument,
    );
    Object.defineProperty(this, "ownerDocument", {
      configurable: false,
      enumerable: true,
      value: this,
    });
    this.documentElement = this.createElement("html");
    this.body = this.createElement("body");
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
    this.activeElement = this.body;
  }

  createElement(name: string): Task04DomElement {
    return new Task04DomElement(name, this);
  }

  createElementNS(
    namespaceURI: string,
    name: string,
  ): Task04DomElement {
    return new Task04DomElement(name, this, namespaceURI);
  }

  createTextNode(value: string): Task04DomNode {
    const node = new Task04DomNode(3, "#text", this);
    node.nodeValue = value;
    return node;
  }

  createComment(value: string): Task04DomNode {
    const node = new Task04DomNode(8, "#comment", this);
    node.nodeValue = value;
    return node;
  }

  getElementById(id: string): Task04DomElement | null {
    return (
      task04DomElementsUnder(this).find(
        (element) => element.id === id,
      ) ?? null
    );
  }
}

type Task04DomWindow = {
  document: Task04DomDocument;
  Node: typeof Task04DomNode;
  Element: typeof Task04DomElement;
  HTMLElement: typeof Task04DomElement;
  HTMLIFrameElement: new () => object;
  event?: Task04DomEvent;
  addEventListener: () => void;
  removeEventListener: () => void;
  getSelection: () => null;
};

function task04DomElementsUnder(
  root: Task04DomNode,
): Task04DomElement[] {
  return root.childNodes.flatMap((child) => [
    ...(child instanceof Task04DomElement ? [child] : []),
    ...task04DomElementsUnder(child),
  ]);
}

function task04ElementById(
  root: Task04DomNode,
  id: string,
): Task04DomElement {
  const element = task04DomElementsUnder(root).find(
    (candidate) => candidate.id === id,
  );
  if (element === undefined) {
    throw new Error(`TASK04_TEST_ELEMENT_NOT_FOUND:${id}`);
  }
  return element;
}

function task04ButtonByText(
  root: Task04DomNode,
  label: string,
): Task04DomElement {
  const button = task04DomElementsUnder(root).find(
    (element) =>
      element.tagName === "BUTTON" &&
      element.textContent === label,
  );
  if (button === undefined) {
    throw new Error(`TASK04_TEST_BUTTON_NOT_FOUND:${label}`);
  }
  return button;
}

function task04MaybeButtonByText(
  root: Task04DomNode,
  label: string,
): Task04DomElement | undefined {
  return task04DomElementsUnder(root).find(
    (element) =>
      element.tagName === "BUTTON" &&
      element.textContent === label,
  );
}

function task04ElementIsDisabled(
  element: Task04DomElement,
): boolean {
  let current: Task04DomNode | null = element;
  while (current !== null) {
    if (
      current instanceof Task04DomElement &&
      current.disabled &&
      (current === element || current.tagName === "FIELDSET")
    ) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

function task04DispatchChange(
  element: Task04DomElement,
  value: string,
): void {
  if (task04ElementIsDisabled(element)) return;
  flushSync(() => {
    element.value = value;
    element.dispatchEvent(new Task04DomEvent("change"));
  });
}

function task04Click(element: Task04DomElement): void {
  if (task04ElementIsDisabled(element)) return;
  flushSync(() => {
    const clickEvent = new Task04DomEvent("click");
    element.dispatchEvent(clickEvent);
    if (
      clickEvent.defaultPrevented ||
      element.tagName !== "BUTTON" ||
      (element.type || element.getAttribute("type")) === "button"
    ) {
      return;
    }
    let form: Task04DomNode | null = element.parentNode;
    while (
      form instanceof Task04DomElement &&
      form.tagName !== "FORM"
    ) {
      form = form.parentNode;
    }
    if (
      form instanceof Task04DomElement &&
      form.tagName === "FORM"
    ) {
      form.dispatchEvent(new Task04DomEvent("submit"));
    }
  });
}

type Task04Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}>;

function task04Deferred<T>(): Task04Deferred<T> {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

async function task04Eventually(
  assertion: () => void,
): Promise<void> {
  let lastFailure: unknown;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      assertion();
      return;
    } catch (failure) {
      lastFailure = failure;
      await new Promise<void>((resolvePromise) => {
        setTimeout(resolvePromise, 0);
      });
    }
  }
  throw lastFailure;
}

type Task04MountedQueue = Readonly<{
  container: Task04DomElement;
  root: Root;
}>;

const task04MountedQueues: Task04MountedQueue[] = [];
const task04GlobalDescriptors = new Map<
  string,
  PropertyDescriptor | undefined
>();
let task04TestDocument: Task04DomDocument;
let task04CreateRoot:
  typeof import("react-dom/client")["createRoot"];

function task04InstallDomGlobal(
  name: string,
  value: unknown,
): void {
  task04GlobalDescriptors.set(
    name,
    Object.getOwnPropertyDescriptor(globalThis, name),
  );
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
}

function mountTask04QueueWorkspace(
  initialResult: Task04QueueUiResult,
  action: (input: unknown) => Promise<Task04QueueUiResult>,
): Task04MountedQueue {
  const container = task04TestDocument.createElement("div");
  task04TestDocument.body.appendChild(container);
  const root = task04CreateRoot(
    container as unknown as Element,
  );
  flushSync(() => {
    root.render(
      createElement(QueueWorkspace, {
        initialResult,
        runQueueAction: action,
        unavailableMessage:
          "This service is temporarily unavailable.",
        filterOptions: FILTER_OPTIONS,
      }),
    );
  });
  const mounted = { container, root };
  task04MountedQueues.push(mounted);
  return mounted;
}

describe("Task 04 mounted pharmacist queue interactions", () => {
  beforeAll(async () => {
    task04TestDocument = new Task04DomDocument();
    class Task04DomIFrameElement {}
    const task04TestWindow: Task04DomWindow = {
      document: task04TestDocument,
      Node: Task04DomNode,
      Element: Task04DomElement,
      HTMLElement: Task04DomElement,
      HTMLIFrameElement: Task04DomIFrameElement,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      getSelection: () => null,
    };
    task04TestDocument.defaultView = task04TestWindow;
    task04InstallDomGlobal("window", task04TestWindow);
    task04InstallDomGlobal("document", task04TestDocument);
    task04InstallDomGlobal("Node", Task04DomNode);
    task04InstallDomGlobal("Element", Task04DomElement);
    task04InstallDomGlobal("HTMLElement", Task04DomElement);
    task04InstallDomGlobal("FormData", Task04DomFormData);
    task04CreateRoot = (await import("react-dom/client")).createRoot;
  });

  afterEach(async () => {
    while (task04MountedQueues.length > 0) {
      const mounted = task04MountedQueues.pop()!;
      flushSync(() => mounted.root.unmount());
      mounted.container.parentNode?.removeChild(mounted.container);
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
    for (const [name, descriptor] of task04GlobalDescriptors) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(globalThis, name);
      } else {
        Object.defineProperty(globalThis, name, descriptor);
      }
    }
    task04GlobalDescriptors.clear();
  });

  it("applies the visible draft once and cannot submit its stale cursor or a competing operation", async () => {
    const applyResponse = task04Deferred<Task04QueueUiResult>();
    const nextResponse = task04Deferred<Task04QueueUiResult>();
    const action = vi
      .fn<(input: unknown) => Promise<Task04QueueUiResult>>()
      .mockReturnValueOnce(applyResponse.promise)
      .mockReturnValueOnce(nextResponse.promise);
    const { container } = mountTask04QueueWorkspace(
      successResult({ next: true }),
      action,
    );
    const staleNext = task04ButtonByText(container, "Next page");
    const modality = task04ElementById(
      container,
      "queue-modality",
    );

    task04DispatchChange(modality, "telephone");
    expect(
      task04MaybeButtonByText(container, "Next page"),
    ).toBeUndefined();
    task04Click(staleNext);
    expect(action).not.toHaveBeenCalled();

    const apply = task04ButtonByText(container, "Apply filters");
    const reset = task04ButtonByText(container, "Reset filters");
    task04Click(apply);
    expect(action).toHaveBeenCalledOnce();
    expect(action).toHaveBeenLastCalledWith({
      modality: "telephone",
      sort: "start_time_asc",
    });
    expect(action.mock.calls[0]![0]).not.toHaveProperty("cursor");
    expect(task04ElementIsDisabled(apply)).toBe(true);

    task04Click(apply);
    task04Click(reset);
    task04Click(staleNext);
    expect(action).toHaveBeenCalledOnce();

    applyResponse.resolve(
      successResult({
        next: true,
        nextCursor: NEXT_CURSOR,
        serviceLabel: "Applied telephone page",
      }),
    );
    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "Applied telephone page",
      );
      const next = task04ButtonByText(container, "Next page");
      expect(task04ElementIsDisabled(next)).toBe(false);
    });

    task04Click(task04ButtonByText(container, "Next page"));
    expect(action).toHaveBeenCalledTimes(2);
    expect(action).toHaveBeenLastCalledWith({
      modality: "telephone",
      sort: "start_time_asc",
      cursor: NEXT_CURSOR,
    });
    nextResponse.resolve(
      successResult({
        serviceLabel: "Applied final page",
      }),
    );
    await task04Eventually(() => {
      expect(container.textContent).toContain("Applied final page");
    });
  });

  it("resets to the exact default request and blocks rapid Reset or Next competition", async () => {
    const resetResponse = task04Deferred<Task04QueueUiResult>();
    const action = vi
      .fn<(input: unknown) => Promise<Task04QueueUiResult>>()
      .mockReturnValue(resetResponse.promise);
    const { container } = mountTask04QueueWorkspace(
      successResult({ next: true }),
      action,
    );
    const staleNext = task04ButtonByText(container, "Next page");
    task04DispatchChange(
      task04ElementById(container, "queue-modality"),
      "video",
    );
    const reset = task04ButtonByText(container, "Reset filters");
    task04Click(reset);

    expect(action).toHaveBeenCalledOnce();
    expect(action).toHaveBeenLastCalledWith({
      sort: "start_time_asc",
    });
    expect(action.mock.calls[0]![0]).not.toHaveProperty("cursor");
    expect(
      task04MaybeButtonByText(container, "Next page"),
    ).toBeUndefined();

    task04Click(reset);
    task04Click(staleNext);
    expect(action).toHaveBeenCalledOnce();

    resetResponse.resolve(
      successResult({
        serviceLabel: "Default reset page",
      }),
    );
    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "Default reset page",
      );
    });
  });

  it("uses each successful opaque cursor once and removes pagination on the final page", async () => {
    const secondPage = task04Deferred<Task04QueueUiResult>();
    const finalPage = task04Deferred<Task04QueueUiResult>();
    const action = vi
      .fn<(input: unknown) => Promise<Task04QueueUiResult>>()
      .mockReturnValueOnce(secondPage.promise)
      .mockReturnValueOnce(finalPage.promise);
    const { container } = mountTask04QueueWorkspace(
      successResult({ next: true }),
      action,
    );

    const firstNext = task04ButtonByText(container, "Next page");
    task04Click(firstNext);
    expect(action).toHaveBeenCalledOnce();
    expect(action).toHaveBeenLastCalledWith({
      sort: "start_time_asc",
      cursor: CURSOR,
    });
    task04Click(firstNext);
    expect(action).toHaveBeenCalledOnce();

    secondPage.resolve(
      successResult({
        next: true,
        nextCursor: NEXT_CURSOR,
        serviceLabel: "Second queue page",
      }),
    );
    await task04Eventually(() => {
      expect(container.textContent).toContain("Second queue page");
      expect(container.textContent).not.toContain(
        "Synthetic administrative service",
      );
      expect(
        task04ElementIsDisabled(
          task04ButtonByText(container, "Next page"),
        ),
      ).toBe(false);
    });
    expect(
      container.textContent.split("Second queue page"),
    ).toHaveLength(2);

    const secondNext = task04ButtonByText(container, "Next page");
    task04Click(secondNext);
    expect(action).toHaveBeenCalledTimes(2);
    expect(action).toHaveBeenLastCalledWith({
      sort: "start_time_asc",
      cursor: NEXT_CURSOR,
    });
    task04Click(secondNext);
    expect(action).toHaveBeenCalledTimes(2);

    finalPage.resolve(
      successResult({ serviceLabel: "Final queue page" }),
    );
    await task04Eventually(() => {
      expect(container.textContent).toContain("Final queue page");
      expect(
        task04MaybeButtonByText(container, "Next page"),
      ).toBeUndefined();
    });
  });

  it("fails Apply generically without exposing details or retaining pagination", async () => {
    const applyResponse = task04Deferred<Task04QueueUiResult>();
    const action = vi
      .fn<(input: unknown) => Promise<Task04QueueUiResult>>()
      .mockReturnValue(applyResponse.promise);
    const { container } = mountTask04QueueWorkspace(
      successResult({ next: true }),
      action,
    );
    task04DispatchChange(
      task04ElementById(container, "queue-modality"),
      "telephone",
    );
    task04Click(task04ButtonByText(container, "Apply filters"));
    applyResponse.reject(
      new Error("TASK04_INTERNAL_APPLY_DETAIL"),
    );

    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "This service is temporarily unavailable.",
      );
    });
    expect(container.textContent).not.toContain(
      "TASK04_INTERNAL_APPLY_DETAIL",
    );
    expect(
      task04MaybeButtonByText(container, "Next page"),
    ).toBeUndefined();
    expect(action).toHaveBeenCalledOnce();
  });

  it("preserves visible items after failed pagination and cannot reuse the failed cursor", async () => {
    const nextResponse = task04Deferred<Task04QueueUiResult>();
    const action = vi
      .fn<(input: unknown) => Promise<Task04QueueUiResult>>()
      .mockReturnValue(nextResponse.promise);
    const { container } = mountTask04QueueWorkspace(
      successResult({ next: true }),
      action,
    );
    const failedNext = task04ButtonByText(container, "Next page");
    expect(container.textContent).toContain(
      "Synthetic administrative service",
    );
    task04Click(failedNext);
    nextResponse.reject(
      new Error("TASK04_INTERNAL_PAGINATION_DETAIL"),
    );

    await task04Eventually(() => {
      expect(container.textContent).toContain(
        "This service is temporarily unavailable.",
      );
    });
    expect(container.textContent).toContain(
      "Synthetic administrative service",
    );
    expect(container.textContent).not.toContain(
      "TASK04_INTERNAL_PAGINATION_DETAIL",
    );
    expect(
      task04MaybeButtonByText(container, "Next page"),
    ).toBeUndefined();
    task04Click(failedNext);
    expect(action).toHaveBeenCalledOnce();
  });
});
