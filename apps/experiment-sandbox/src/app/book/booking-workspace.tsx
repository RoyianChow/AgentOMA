"use client";

import {
  useReducer,
  useRef,
  useTransition,
  type FormEvent,
} from "react";

import {
  createTask04BookInteractionState,
  task04BookCanSearch,
  task04BookCanSubmitBooking,
  task04BookInteractionReducer,
  task04BookSelectedService,
  type Task04BookAcknowledgements,
  type Task04BookAvailabilityAction,
  type Task04BookAvailabilityActionInput,
  type Task04BookAvailabilityItem,
  type Task04BookCatalogResult,
  type Task04BookCreateAction,
  type Task04BookCreateActionInput,
  type Task04BookInteractionEvent,
  type Task04BookPreferencesDraft,
  type Task04BookPreferenceOptions,
  type Task04BookSearchDraft,
  type Task04BookUiFailure,
} from "./book-ui-model";

const NO_AVAILABILITY_MESSAGE =
  "No times are currently available for this service in the selected date range.";
const TEMPORARY_FAILURE_MESSAGE =
  "This service is temporarily unavailable.";

const ACKNOWLEDGEMENT_OPTIONS = [
  {
    key: "administrativeOnly",
    label: "I understand this is an administrative booking service.",
  },
  {
    key: "notMonitored",
    label:
      "I understand this request is not monitored for symptoms or emergencies.",
  },
  {
    key: "noMedicalDetails",
    label: "I will not enter medical details in this booking flow.",
  },
  {
    key: "notClinicalAssessment",
    label:
      "I understand submitting this request is not a clinical assessment.",
  },
  {
    key: "statusControlsConfirmation",
    label:
      "I understand the appointment is not confirmed unless its status says confirmed.",
  },
] as const satisfies readonly Readonly<{
  key: keyof Task04BookAcknowledgements;
  label: string;
}>[];

function humanize(value: string): string {
  return value
    .split("_")
    .map(
      (word) =>
        `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ");
}

function safeFailure(): Task04BookUiFailure {
  return {
    success: false,
    kind: "unavailable",
    message: TEMPORARY_FAILURE_MESSAGE,
  };
}

function SearchForm({
  state,
  isPending,
  isBookingPending,
  onDraftChange,
  onSubmit,
  onReset,
}: Readonly<{
  state: ReturnType<typeof createTask04BookInteractionState>;
  isPending: boolean;
  isBookingPending: boolean;
  onDraftChange: (draft: Task04BookSearchDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
}>) {
  const selectedService = task04BookSelectedService(state);
  const services = state.catalog.success
    ? state.catalog.items
    : [];
  return (
    <form
      className="booking-search"
      onSubmit={onSubmit}
      aria-busy={isPending}
    >
      <fieldset
        className="booking-fieldset"
        disabled={isBookingPending || !state.catalog.success}
      >
        <legend>Find an appointment</legend>
        <div className="booking-form-grid">
          <div className="booking-control booking-service-control">
            <label htmlFor="booking-service">Service</label>
            <select
              id="booking-service"
              value={state.searchDraft.serviceCategoryRef}
              onChange={(event) =>
                onDraftChange({
                  ...state.searchDraft,
                  serviceCategoryRef:
                    event.currentTarget.value,
                  modality: "",
                })
              }
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option
                  key={service.serviceCategoryRef}
                  value={service.serviceCategoryRef}
                >
                  {service.serviceCategoryLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="booking-control">
            <label htmlFor="booking-modality">Modality</label>
            <select
              id="booking-modality"
              value={state.searchDraft.modality}
              disabled={selectedService === undefined}
              onChange={(event) =>
                onDraftChange({
                  ...state.searchDraft,
                  modality: event.currentTarget.value,
                })
              }
            >
              <option value="">Select a modality</option>
              {(selectedService?.supportedModalities ?? []).map(
                (modality) => (
                  <option key={modality} value={modality}>
                    {humanize(modality)}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="booking-control">
            <label htmlFor="booking-start-date">
              Inclusive start date
            </label>
            <input
              id="booking-start-date"
              type="date"
              value={state.searchDraft.startDate}
              onInput={(event) =>
                onDraftChange({
                  ...state.searchDraft,
                  startDate: event.currentTarget.value,
                })
              }
            />
          </div>

          <div className="booking-control">
            <label htmlFor="booking-end-date">
              Inclusive end date
            </label>
            <input
              id="booking-end-date"
              type="date"
              value={state.searchDraft.endDate}
              onInput={(event) =>
                onDraftChange({
                  ...state.searchDraft,
                  endDate: event.currentTarget.value,
                })
              }
            />
          </div>
        </div>
        <p className="booking-form-note">
          Search dates are inclusive and may cover at most 31 calendar
          days.
        </p>
        <div className="booking-form-actions">
          <button
            type="submit"
            disabled={isPending || !task04BookCanSearch(state)}
          >
            Search times
          </button>
          <button
            type="button"
            className="booking-button-secondary"
            disabled={isBookingPending}
            onClick={onReset}
          >
            Reset
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function AppointmentDetails({
  item,
}: Readonly<{ item: Task04BookAvailabilityItem }>) {
  return (
    <span className="booking-appointment-details">
      <strong>{item.appointmentDateLabel}</strong>
      <span>{item.appointmentTimeRangeLabel}</span>
      <span>{item.serviceCategoryLabel}</span>
      <span>{humanize(item.modality)}</span>
      <span>{item.publicLocationLabel}</span>
      <span className="booking-timezone">
        Timezone: {item.displayTimezone}
      </span>
    </span>
  );
}

function AvailabilityResults({
  state,
  isPending,
  onSelect,
}: Readonly<{
  state: ReturnType<typeof createTask04BookInteractionState>;
  isPending: boolean;
  onSelect: (slotReference: string) => void;
}>) {
  if (state.screen === "no_availability") {
    return (
      <section
        className="booking-results"
        aria-labelledby="booking-results-heading"
      >
        <h2 id="booking-results-heading">Available times</h2>
        <p className="booking-empty">{NO_AVAILABILITY_MESSAGE}</p>
      </section>
    );
  }
  if (state.availabilityItems.length === 0) return null;
  return (
    <section
      className="booking-results"
      aria-labelledby="booking-results-heading"
    >
      <h2 id="booking-results-heading">Available times</h2>
      <fieldset className="booking-appointment-fieldset">
        <legend>Select one appointment</legend>
        <div className="booking-appointment-list">
          {state.availabilityItems.map((item, index) => (
            <label
              className="booking-appointment-option"
              key={`${item.appointmentDateLabel}-${item.appointmentTimeRangeLabel}-${index}`}
            >
              <input
                type="radio"
                name="booking-appointment"
                value={String(index)}
                checked={
                  state.selectedSlotReference ===
                  item.slotReference
                }
                readOnly
                disabled={isPending}
                onClick={() => onSelect(item.slotReference)}
              />
              <AppointmentDetails item={item} />
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

function BookingForm({
  preferences,
  preferenceOptions,
  isPending,
  canSubmit,
  onPreferencesChange,
  onSubmit,
}: Readonly<{
  preferences: Task04BookPreferencesDraft;
  preferenceOptions: Task04BookPreferenceOptions;
  isPending: boolean;
  canSubmit: boolean;
  onPreferencesChange: (
    preferences: Task04BookPreferencesDraft,
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}>) {
  return (
    <form
      className="booking-preferences"
      onSubmit={onSubmit}
      aria-busy={isPending}
    >
      <fieldset className="booking-fieldset" disabled={isPending}>
        <legend>Administrative booking preferences</legend>
        <div className="booking-form-grid">
          <div className="booking-control">
            <label htmlFor="booking-language">
              Language preparation
            </label>
            <select
              id="booking-language"
              value={preferences.languagePreference}
              onChange={(event) =>
                onPreferencesChange({
                  ...preferences,
                  languagePreference:
                    event.currentTarget.value,
                })
              }
            >
              {preferenceOptions.languages.map((preference) => (
                <option key={preference} value={preference}>
                  {humanize(preference)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="booking-choice-fieldset">
          <legend>Accessibility preparation</legend>
          <div className="booking-choice-list">
            {preferenceOptions.accessibility.map((preference) => (
              <label
                key={preference}
                className="booking-choice"
              >
                <input
                  type="radio"
                  name="booking-accessibility"
                  value={preference}
                  checked={
                    preferences.accessibilityPreference ===
                    preference
                  }
                  readOnly
                  onClick={() =>
                    onPreferencesChange({
                      ...preferences,
                      accessibilityPreference: preference,
                    })
                  }
                />
                <span>{humanize(preference)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset
          className="booking-choice-fieldset"
          aria-describedby="booking-acknowledgement-note"
        >
          <legend>Required administrative acknowledgements</legend>
          <p
            id="booking-acknowledgement-note"
            className="booking-form-note"
          >
            Each statement is required. These acknowledgements are not
            clinical or legal consent.
          </p>
          <div className="booking-choice-list">
            {ACKNOWLEDGEMENT_OPTIONS.map((option) => (
              <label
                key={option.key}
                className="booking-choice"
              >
                <input
                  id={`booking-ack-${option.key}`}
                  type="checkbox"
                  checked={
                    preferences.administrativeAcknowledgements[
                      option.key
                    ]
                  }
                  readOnly
                  onClick={(event) =>
                    onPreferencesChange({
                      ...preferences,
                      administrativeAcknowledgements: {
                        ...preferences.administrativeAcknowledgements,
                        [option.key]:
                          event.currentTarget.checked,
                      },
                    })
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="booking-form-actions">
          <button type="submit" disabled={!canSubmit || isPending}>
            Book appointment
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function BookingResult({
  result,
}: Readonly<{
  result: NonNullable<
    ReturnType<
      typeof createTask04BookInteractionState
    >["bookingResult"]
  >;
}>) {
  const pending = result.status === "pending_confirmation";
  return (
    <section
      className="booking-outcome"
      aria-labelledby="booking-outcome-heading"
    >
      <h2 id="booking-outcome-heading">
        {pending ? "Booking request received" : "Booking confirmed"}
      </h2>
      <dl className="booking-outcome-details">
        <div>
          <dt>Service</dt>
          <dd>{result.serviceCategoryLabel}</dd>
        </div>
        <div>
          <dt>Appointment</dt>
          <dd>
            {result.appointmentDateLabel},{" "}
            {result.appointmentTimeRangeLabel}
          </dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>{result.displayTimezone}</dd>
        </div>
        <div>
          <dt>Modality</dt>
          <dd>{humanize(result.modality)}</dd>
        </div>
        <div>
          <dt>Synthetic location</dt>
          <dd>{result.publicLocationLabel}</dd>
        </div>
      </dl>
      {pending ? (
        <div className="booking-pending-notice" role="status">
          <p>
            This booking request is pending pharmacist confirmation. It
            is not yet confirmed.
          </p>
          <p>
            The temporary appointment hold expires at{" "}
            <strong>{result.confirmationDeadlineLabel}</strong>{" "}
            {result.displayTimezone}.
          </p>
        </div>
      ) : (
        <p className="booking-confirmed-notice" role="status">
          This synthetic appointment is confirmed. No external message
          was sent.
        </p>
      )}
    </section>
  );
}

export function BookingWorkspace({
  initialCatalog,
  searchAvailability,
  createBooking,
  preferenceOptions,
}: Readonly<{
  initialCatalog: Task04BookCatalogResult;
  searchAvailability: Task04BookAvailabilityAction;
  createBooking: Task04BookCreateAction;
  preferenceOptions: Task04BookPreferenceOptions;
}>) {
  const [interactionState, reactDispatch] = useReducer(
    task04BookInteractionReducer,
    initialCatalog,
    createTask04BookInteractionState,
  );
  const interactionStateRef = useRef(
    createTask04BookInteractionState(initialCatalog),
  );
  const requestId = useRef(0);
  const activeRequest = useRef(false);
  const [isTransitionPending, startTransition] =
    useTransition();

  function dispatchInteraction(
    event: Task04BookInteractionEvent,
  ): void {
    interactionStateRef.current =
      task04BookInteractionReducer(
        interactionStateRef.current,
        event,
      );
    reactDispatch(event);
  }

  function invalidatePendingResponse(): void {
    requestId.current += 1;
  }

  function changeSearchDraft(
    draft: Task04BookSearchDraft,
  ): void {
    if (
      interactionStateRef.current.screen ===
      "submitting_booking"
    ) {
      return;
    }
    invalidatePendingResponse();
    dispatchInteraction({
      type: "search_draft_changed",
      draft,
    });
  }

  function reset(): void {
    if (
      interactionStateRef.current.screen ===
      "submitting_booking"
    ) {
      return;
    }
    invalidatePendingResponse();
    dispatchInteraction({ type: "reset" });
  }

  function search(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const currentState = interactionStateRef.current;
    if (
      activeRequest.current ||
      !task04BookCanSearch(currentState)
    ) {
      return;
    }
    const request: Task04BookAvailabilityActionInput = {
      ...currentState.searchDraft,
    };
    requestId.current += 1;
    const currentRequestId = requestId.current;
    activeRequest.current = true;
    dispatchInteraction({
      type: "request_started",
      pendingRequest: {
        id: currentRequestId,
        kind: "search",
        searchRequest: request,
      },
    });
    startTransition(async () => {
      try {
        const result = await searchAvailability(request);
        if (requestId.current !== currentRequestId) return;
        dispatchInteraction(
          result.success
            ? {
                type: "search_succeeded",
                requestId: currentRequestId,
                result,
              }
            : {
                type: "request_failed",
                requestId: currentRequestId,
                failure: result,
              },
        );
      } catch {
        if (requestId.current !== currentRequestId) return;
        dispatchInteraction({
          type: "request_failed",
          requestId: currentRequestId,
          failure: safeFailure(),
        });
      } finally {
        activeRequest.current = false;
      }
    });
  }

  function selectAppointment(slotReference: string): void {
    if (activeRequest.current) return;
    dispatchInteraction({
      type: "appointment_selected",
      slotReference,
    });
  }

  function changePreferences(
    preferences: Task04BookPreferencesDraft,
  ): void {
    if (activeRequest.current) return;
    dispatchInteraction({
      type: "preferences_changed",
      preferences,
    });
  }

  function submitBooking(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();
    const currentState = interactionStateRef.current;
    if (
      activeRequest.current ||
      !task04BookCanSubmitBooking(currentState) ||
      currentState.selectedSlotReference === undefined
    ) {
      return;
    }
    const request: Task04BookCreateActionInput = {
      slotReference: currentState.selectedSlotReference,
      languagePreference:
        currentState.preferences.languagePreference,
      accessibilityPreferences: [
        currentState.preferences.accessibilityPreference,
      ],
      administrativeAcknowledgements: {
        ...currentState.preferences.administrativeAcknowledgements,
      },
    };
    requestId.current += 1;
    const currentRequestId = requestId.current;
    activeRequest.current = true;
    dispatchInteraction({
      type: "request_started",
      pendingRequest: {
        id: currentRequestId,
        kind: "booking",
      },
    });
    startTransition(async () => {
      try {
        const result = await createBooking(request);
        if (requestId.current !== currentRequestId) return;
        dispatchInteraction(
          result.success
            ? {
                type: "booking_succeeded",
                requestId: currentRequestId,
                result: result.data,
              }
            : {
                type: "request_failed",
                requestId: currentRequestId,
                failure: result,
              },
        );
      } catch {
        if (requestId.current !== currentRequestId) return;
        dispatchInteraction({
          type: "request_failed",
          requestId: currentRequestId,
          failure: safeFailure(),
        });
      } finally {
        activeRequest.current = false;
      }
    });
  }

  const state = interactionState;
  const isPending =
    isTransitionPending || state.pendingRequest !== undefined;
  const isBookingPending =
    state.screen === "submitting_booking";
  const liveMessage = isPending
    ? isBookingPending
      ? "Submitting the synthetic booking request."
      : "Searching synthetic appointment times."
    : state.screen === "available_results" ||
        state.screen === "selected_appointment"
      ? "Available appointment times updated."
      : state.screen === "no_availability"
        ? NO_AVAILABILITY_MESSAGE
        : state.screen === "confirmed"
          ? "Booking confirmed."
          : state.screen === "pending_confirmation"
            ? "Booking request received and pending confirmation."
            : state.message ?? "";

  if (!state.catalog.success) {
    return (
      <div className="booking-workspace">
        <p className="booking-error" role="alert">
          {state.catalog.message}
        </p>
      </div>
    );
  }

  return (
    <div className="booking-workspace">
      <SearchForm
        state={state}
        isPending={isPending}
        isBookingPending={isBookingPending}
        onDraftChange={changeSearchDraft}
        onSubmit={search}
        onReset={reset}
      />
      <div
        className="booking-live-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage}
      </div>
      {state.message === undefined ? null : (
        <div className="booking-error" role="alert">
          <p>{state.message}</p>
          {state.screen === "stale_availability" ? (
            <p>
              Search again to choose a current appointment time.
            </p>
          ) : null}
        </div>
      )}
      <AvailabilityResults
        state={state}
        isPending={isPending}
        onSelect={selectAppointment}
      />
      {state.selectedSlotReference === undefined ? null : (
        <BookingForm
          preferences={state.preferences}
          preferenceOptions={preferenceOptions}
          isPending={isPending}
          canSubmit={task04BookCanSubmitBooking(state)}
          onPreferencesChange={changePreferences}
          onSubmit={submitBooking}
        />
      )}
      {state.bookingResult === undefined ? null : (
        <BookingResult result={state.bookingResult} />
      )}
    </div>
  );
}
