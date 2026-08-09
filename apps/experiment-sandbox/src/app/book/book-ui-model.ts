export type Task04BookCatalogItem = Readonly<{
  serviceCategoryRef: string;
  serviceCategoryLabel: string;
  supportedModalities: readonly string[];
}>;

export type Task04BookCatalogResult =
  | Readonly<{
      success: true;
      items: readonly Task04BookCatalogItem[];
    }>
  | Readonly<{
      success: false;
      message: string;
    }>;

export type Task04BookPreferenceOptions = Readonly<{
  languages: readonly string[];
  accessibility: readonly string[];
}>;

export type Task04BookSearchDraft = Readonly<{
  serviceCategoryRef: string;
  modality: string;
  startDate: string;
  endDate: string;
}>;

export type Task04BookAvailabilityActionInput =
  Task04BookSearchDraft;

export type Task04BookAvailabilityItem = Readonly<{
  appointmentDateLabel: string;
  appointmentTimeRangeLabel: string;
  displayTimezone: string;
  serviceCategoryLabel: string;
  modality: string;
  publicLocationLabel: string;
  slotReference: string;
}>;

export type Task04BookUiFailure = Readonly<{
  success: false;
  kind: "validation" | "stale_availability" | "unavailable";
  message: string;
}>;

export type Task04BookAvailabilityActionResult =
  | Readonly<{
      success: true;
      items: readonly Task04BookAvailabilityItem[];
    }>
  | Task04BookUiFailure;

export type Task04BookAcknowledgements = Readonly<{
  administrativeOnly: boolean;
  notMonitored: boolean;
  noMedicalDetails: boolean;
  notClinicalAssessment: boolean;
  statusControlsConfirmation: boolean;
}>;

export type Task04BookPreferencesDraft = Readonly<{
  languagePreference: string;
  accessibilityPreference: string;
  administrativeAcknowledgements: Task04BookAcknowledgements;
}>;

export type Task04BookCreateActionInput = Readonly<{
  slotReference: string;
  languagePreference: string;
  accessibilityPreferences: readonly string[];
  administrativeAcknowledgements: Task04BookAcknowledgements;
}>;

export type Task04BookResult = Readonly<{
  status: "confirmed" | "pending_confirmation";
  appointmentDateLabel: string;
  appointmentTimeRangeLabel: string;
  displayTimezone: string;
  serviceCategoryLabel: string;
  modality: string;
  publicLocationLabel: string;
  confirmationDeadlineLabel?: string;
}>;

export type Task04BookCreateActionResult =
  | Readonly<{
      success: true;
      data: Task04BookResult;
    }>
  | Task04BookUiFailure;

export type Task04BookAvailabilityAction = (
  input: Task04BookAvailabilityActionInput,
) => Promise<Task04BookAvailabilityActionResult>;

export type Task04BookCreateAction = (
  input: Task04BookCreateActionInput,
) => Promise<Task04BookCreateActionResult>;

export type Task04BookScreen =
  | "initial"
  | "catalog_error"
  | "editing_search"
  | "searching"
  | "available_results"
  | "no_availability"
  | "selected_appointment"
  | "submitting_booking"
  | "confirmed"
  | "pending_confirmation"
  | "stale_availability"
  | "generic_error";

export type Task04BookPendingRequest = Readonly<{
  id: number;
  kind: "search" | "booking";
  searchRequest?: Task04BookAvailabilityActionInput;
}>;

export type Task04BookInteractionState = Readonly<{
  screen: Task04BookScreen;
  catalog: Task04BookCatalogResult;
  searchDraft: Task04BookSearchDraft;
  preferences: Task04BookPreferencesDraft;
  availabilityItems: readonly Task04BookAvailabilityItem[];
  selectedSlotReference?: string;
  appliedSearch?: Task04BookAvailabilityActionInput;
  pendingRequest?: Task04BookPendingRequest;
  bookingResult?: Task04BookResult;
  message?: string;
}>;

export type Task04BookInteractionEvent =
  | Readonly<{
      type: "search_draft_changed";
      draft: Task04BookSearchDraft;
    }>
  | Readonly<{ type: "reset" }>
  | Readonly<{
      type: "request_started";
      pendingRequest: Task04BookPendingRequest;
    }>
  | Readonly<{
      type: "search_succeeded";
      requestId: number;
      result: Extract<
        Task04BookAvailabilityActionResult,
        { success: true }
      >;
    }>
  | Readonly<{
      type: "request_failed";
      requestId: number;
      failure: Task04BookUiFailure;
    }>
  | Readonly<{
      type: "appointment_selected";
      slotReference: string;
    }>
  | Readonly<{
      type: "preferences_changed";
      preferences: Task04BookPreferencesDraft;
    }>
  | Readonly<{
      type: "booking_succeeded";
      requestId: number;
      result: Task04BookResult;
    }>;

export const TASK04_DEFAULT_BOOK_SEARCH_DRAFT =
  Object.freeze({
    serviceCategoryRef: "",
    modality: "",
    startDate: "",
    endDate: "",
  }) satisfies Task04BookSearchDraft;

export const TASK04_DEFAULT_BOOK_PREFERENCES =
  Object.freeze({
    languagePreference: "no_preference",
    accessibilityPreference: "none",
    administrativeAcknowledgements: Object.freeze({
      administrativeOnly: false,
      notMonitored: false,
      noMedicalDetails: false,
      notClinicalAssessment: false,
      statusControlsConfirmation: false,
    }),
  }) satisfies Task04BookPreferencesDraft;

export function createTask04BookSearchDraft(): Task04BookSearchDraft {
  return { ...TASK04_DEFAULT_BOOK_SEARCH_DRAFT };
}

export function createTask04BookPreferencesDraft(): Task04BookPreferencesDraft {
  return {
    ...TASK04_DEFAULT_BOOK_PREFERENCES,
    administrativeAcknowledgements: {
      ...TASK04_DEFAULT_BOOK_PREFERENCES.administrativeAcknowledgements,
    },
  };
}

export function createTask04BookInteractionState(
  catalog: Task04BookCatalogResult,
): Task04BookInteractionState {
  return {
    screen: catalog.success ? "initial" : "catalog_error",
    catalog,
    searchDraft: createTask04BookSearchDraft(),
    preferences: createTask04BookPreferencesDraft(),
    availabilityItems: [],
    ...(catalog.success ? {} : { message: catalog.message }),
  };
}

function pendingRequestMatches(
  state: Task04BookInteractionState,
  requestId: number,
  kind: Task04BookPendingRequest["kind"],
): boolean {
  return (
    state.pendingRequest?.id === requestId &&
    state.pendingRequest.kind === kind
  );
}

export function task04BookInteractionReducer(
  state: Task04BookInteractionState,
  event: Task04BookInteractionEvent,
): Task04BookInteractionState {
  if (event.type === "search_draft_changed") {
    if (!state.catalog.success) return state;
    return {
      ...state,
      screen: "editing_search",
      searchDraft: event.draft,
      availabilityItems: [],
      selectedSlotReference: undefined,
      appliedSearch: undefined,
      pendingRequest: undefined,
      bookingResult: undefined,
      message: undefined,
    };
  }

  if (event.type === "reset") {
    return {
      ...createTask04BookInteractionState(state.catalog),
      preferences: createTask04BookPreferencesDraft(),
    };
  }

  if (event.type === "request_started") {
    if (state.pendingRequest !== undefined) return state;
    return event.pendingRequest.kind === "search"
      ? {
          ...state,
          screen: "searching",
          availabilityItems: [],
          selectedSlotReference: undefined,
          appliedSearch: undefined,
          pendingRequest: event.pendingRequest,
          bookingResult: undefined,
          message: undefined,
        }
      : {
          ...state,
          screen: "submitting_booking",
          pendingRequest: event.pendingRequest,
          message: undefined,
        };
  }

  if (event.type === "search_succeeded") {
    if (
      !pendingRequestMatches(state, event.requestId, "search") ||
      state.pendingRequest?.searchRequest === undefined
    ) {
      return state;
    }
    return {
      ...state,
      screen:
        event.result.items.length === 0
          ? "no_availability"
          : "available_results",
      availabilityItems: event.result.items,
      selectedSlotReference: undefined,
      appliedSearch: state.pendingRequest.searchRequest,
      pendingRequest: undefined,
      message: undefined,
    };
  }

  if (event.type === "request_failed") {
    if (state.pendingRequest?.id !== event.requestId) return state;
    if (state.pendingRequest.kind === "search") {
      return {
        ...state,
        screen: "generic_error",
        availabilityItems: [],
        selectedSlotReference: undefined,
        appliedSearch: undefined,
        pendingRequest: undefined,
        message: event.failure.message,
      };
    }
    if (event.failure.kind === "stale_availability") {
      return {
        ...state,
        screen: "stale_availability",
        availabilityItems: [],
        selectedSlotReference: undefined,
        appliedSearch: undefined,
        pendingRequest: undefined,
        message: event.failure.message,
      };
    }
    if (event.failure.kind === "validation") {
      return {
        ...state,
        screen: "generic_error",
        availabilityItems: [],
        selectedSlotReference: undefined,
        appliedSearch: undefined,
        pendingRequest: undefined,
        bookingResult: undefined,
        message: event.failure.message,
      };
    }
    return {
      ...state,
      screen: "generic_error",
      pendingRequest: undefined,
      message: event.failure.message,
    };
  }

  if (event.type === "appointment_selected") {
    if (
      state.pendingRequest !== undefined ||
      !state.availabilityItems.some(
        (item) => item.slotReference === event.slotReference,
      )
    ) {
      return state;
    }
    return {
      ...state,
      screen: "selected_appointment",
      selectedSlotReference: event.slotReference,
      bookingResult: undefined,
      message: undefined,
    };
  }

  if (event.type === "preferences_changed") {
    return {
      ...state,
      preferences: event.preferences,
      message: undefined,
      screen:
        state.selectedSlotReference === undefined
          ? state.screen
          : "selected_appointment",
    };
  }

  if (
    !pendingRequestMatches(state, event.requestId, "booking")
  ) {
    return state;
  }
  return {
    ...state,
    screen:
      event.result.status === "confirmed"
        ? "confirmed"
        : "pending_confirmation",
    availabilityItems: [],
    selectedSlotReference: undefined,
    appliedSearch: undefined,
    pendingRequest: undefined,
    bookingResult: event.result,
    message: undefined,
  };
}

export function task04BookSelectedService(
  state: Task04BookInteractionState,
): Task04BookCatalogItem | undefined {
  if (!state.catalog.success) return undefined;
  return state.catalog.items.find(
    (item) =>
      item.serviceCategoryRef ===
      state.searchDraft.serviceCategoryRef,
  );
}

export function task04BookCanSearch(
  state: Task04BookInteractionState,
): boolean {
  const selectedService = task04BookSelectedService(state);
  return (
    state.pendingRequest === undefined &&
    selectedService !== undefined &&
    selectedService.supportedModalities.includes(
      state.searchDraft.modality,
    ) &&
    state.searchDraft.startDate !== "" &&
    state.searchDraft.endDate !== ""
  );
}

export function task04BookAcknowledgementsComplete(
  acknowledgements: Task04BookAcknowledgements,
): boolean {
  return (
    acknowledgements.administrativeOnly &&
    acknowledgements.notMonitored &&
    acknowledgements.noMedicalDetails &&
    acknowledgements.notClinicalAssessment &&
    acknowledgements.statusControlsConfirmation
  );
}

export function task04BookCanSubmitBooking(
  state: Task04BookInteractionState,
): boolean {
  return (
    state.pendingRequest === undefined &&
    state.selectedSlotReference !== undefined &&
    state.preferences.languagePreference !== "" &&
    state.preferences.accessibilityPreference !== "" &&
    task04BookAcknowledgementsComplete(
      state.preferences.administrativeAcknowledgements,
    )
  );
}
