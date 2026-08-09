"use client";

import {
  useReducer,
  useRef,
  useTransition,
  type FormEvent,
} from "react";

import {
  createTask04QueueUiInteractionState,
  createTask04DefaultQueueFilterDraft,
  task04QueueRequestFromFilterDraft,
  task04QueueUiCanPaginate,
  task04QueueUiInteractionReducer,
  task04QueueUiNextRequest,
  type Task04QueueUiAction,
  type Task04QueueUiFailure,
  type Task04QueueUiFilterDraft,
  type Task04QueueUiFilterOptions,
  type Task04QueueUiInteractionEvent,
  type Task04QueueUiItem,
  type Task04QueueUiRequest,
  type Task04QueueUiRequestKind,
  type Task04QueueUiResult,
} from "./queue-ui-model";

type QueueFilterFormProps = Readonly<{
  draft: Task04QueueUiFilterDraft;
  filterOptions: Task04QueueUiFilterOptions;
  isPending: boolean;
  invalid: boolean;
  onDraftChange: (draft: Task04QueueUiFilterDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
}>;

function humanize(value: string): string {
  return value
    .split("_")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function toggleStatus(
  statuses: readonly string[],
  value: string,
  checked: boolean,
): readonly string[] {
  if (checked) {
    return statuses.includes(value)
      ? statuses
      : [...statuses, value];
  }
  return statuses.filter((status) => status !== value);
}

export function QueueFilterForm({
  draft,
  filterOptions,
  isPending,
  invalid,
  onDraftChange,
  onSubmit,
  onReset,
}: QueueFilterFormProps) {
  const errorDescription = invalid
    ? "queue-filter-error"
    : undefined;
  return (
    <form
      className="queue-filters"
      onSubmit={onSubmit}
      aria-busy={isPending}
    >
      <fieldset
        className="queue-filter-fieldset"
        disabled={isPending}
        aria-describedby={errorDescription}
      >
        <legend>Administrative filters</legend>
        <div className="queue-filter-grid">
          <fieldset className="queue-status-options">
            <legend>Status</legend>
            {filterOptions.statuses.map((value) => (
              <label key={value} className="queue-check">
                <input
                  type="checkbox"
                  checked={draft.statuses.includes(value)}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      statuses: toggleStatus(
                        draft.statuses,
                        value,
                        event.currentTarget.checked,
                      ),
                    })
                  }
                />
                <span>{humanize(value)}</span>
              </label>
            ))}
          </fieldset>

          <div className="queue-control">
            <label htmlFor="queue-modality">Modality</label>
            <select
              id="queue-modality"
              value={draft.modality}
              aria-describedby={errorDescription}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  modality: event.currentTarget.value,
                })
              }
            >
              <option value="">All modalities</option>
              {filterOptions.modalities.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="queue-control">
            <label htmlFor="queue-start-date">
              Inclusive start date
            </label>
            <input
              id="queue-start-date"
              type="date"
              value={draft.startDate}
              aria-invalid={invalid || undefined}
              aria-describedby={errorDescription}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  startDate: event.currentTarget.value,
                })
              }
            />
          </div>

          <div className="queue-control">
            <label htmlFor="queue-end-date">
              Inclusive end date
            </label>
            <input
              id="queue-end-date"
              type="date"
              value={draft.endDate}
              aria-invalid={invalid || undefined}
              aria-describedby={errorDescription}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  endDate: event.currentTarget.value,
                })
              }
            />
          </div>

          <div className="queue-control queue-sort-control">
            <label htmlFor="queue-sort">Sort order</label>
            <select
              id="queue-sort"
              value={draft.sort}
              aria-describedby={errorDescription}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  sort: event.currentTarget.value,
                })
              }
            >
              {filterOptions.sorts.map((value) => (
                <option key={value} value={value}>
                  {value === "start_time_asc"
                    ? "Appointment time (earliest first)"
                    : "Created time (earliest first)"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="queue-filter-actions">
          <button type="submit" disabled={isPending}>
            Apply filters
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={isPending}
            onClick={onReset}
          >
            Reset filters
          </button>
        </div>
      </fieldset>
    </form>
  );
}

function actionAvailabilityText(value: string): string {
  if (value === "permitted") {
    return "An administrative action may be available in a separately authorized workflow.";
  }
  if (value === "temporarily_blocked") {
    return "Administrative actions are temporarily unavailable.";
  }
  return "No administrative action is available in this read-only queue.";
}

function QueueItem({
  item,
  index,
}: Readonly<{ item: Task04QueueUiItem; index: number }>) {
  const headingId = `queue-item-${index + 1}-heading`;
  return (
    <li className="queue-item">
      <article aria-labelledby={headingId}>
        <div className="queue-item-heading">
          <h3 id={headingId}>{item.serviceCategoryLabel}</h3>
          <span className="queue-status">
            {humanize(item.administrativeStatus)}
          </span>
        </div>
        <p className="queue-appointment">
          <strong>{item.appointmentDateLabel}</strong>
          <span>{item.appointmentTimeRangeLabel}</span>
          <span className="queue-timezone">
            Timezone: {item.displayTimezone}
          </span>
        </p>
        <dl className="queue-details">
          <div>
            <dt>Modality</dt>
            <dd>{humanize(item.modality)}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{humanize(item.source)}</dd>
          </div>
          <div>
            <dt>Administrative reason</dt>
            <dd>{humanize(item.operationalReason)}</dd>
          </div>
          <div>
            <dt>Language preparation</dt>
            <dd>{humanize(item.languagePreference)}</dd>
          </div>
          <div>
            <dt>Accessibility preparation</dt>
            <dd>
              {item.accessibilityPreferences
                .map(humanize)
                .join(", ")}
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{item.createdLabel} {item.displayTimezone}</dd>
          </div>
        </dl>
        <p className="queue-action-note">
          {actionAvailabilityText(item.actionAvailability)}
        </p>
      </article>
    </li>
  );
}

function QueueResults({
  result,
  isPending,
  paginationError,
  showNextPage,
  onNextPage,
}: Readonly<{
  result: Task04QueueUiResult;
  isPending: boolean;
  paginationError?: Task04QueueUiFailure;
  showNextPage: boolean;
  onNextPage: () => void;
}>) {
  if (!result.success) {
    return (
      <section
        className="queue-results"
        aria-labelledby="queue-results-heading"
      >
        <h2 id="queue-results-heading">Queue results</h2>
        <p id="queue-filter-error" className="queue-error" role="alert">
          {result.error.message}
        </p>
      </section>
    );
  }

  const { data } = result;
  return (
    <section
      className="queue-results"
      aria-labelledby="queue-results-heading"
      aria-busy={isPending}
    >
      <h2 id="queue-results-heading">Queue results</h2>
      {paginationError === undefined ? null : (
        <p className="queue-error" role="alert">
          {paginationError.error.message}
        </p>
      )}
      {data.resultCompleteness === "partial" ||
      data.freshnessState === "stale" ? (
        <div
          className="queue-response-notices"
          role="status"
          aria-live="polite"
        >
          {data.resultCompleteness === "partial" ? (
            <p className="queue-notice">
              This is a partial administrative view. Some approved
              source categories are temporarily unavailable.
            </p>
          ) : null}
          {data.freshnessState === "stale" ? (
            <p className="queue-notice">
              These administrative results may be out of date.
              Refresh before relying on action availability.
            </p>
          ) : null}
        </div>
      ) : null}
      {data.items.length === 0 ? (
        <p className="queue-empty">
          No matching synthetic administrative booking items were found
          for the current authorized scope and filters.
        </p>
      ) : (
        <ol className="queue-list">
          {data.items.map((item, index) => (
            <QueueItem
              key={`${item.appointmentDateLabel}-${item.appointmentTimeRangeLabel}-${index}`}
              item={item}
              index={index}
            />
          ))}
        </ol>
      )}
      {!showNextPage ? null : (
        <div className="queue-pagination">
          <button
            type="button"
            disabled={isPending}
            onClick={onNextPage}
          >
            Next page
          </button>
        </div>
      )}
    </section>
  );
}

export function QueueWorkspace({
  initialResult,
  runQueueAction,
  unavailableMessage,
  filterOptions,
}: Readonly<{
  initialResult: Task04QueueUiResult;
  runQueueAction: Task04QueueUiAction;
  unavailableMessage: string;
  filterOptions: Task04QueueUiFilterOptions;
}>) {
  const [interactionState, reactDispatch] = useReducer(
    task04QueueUiInteractionReducer,
    initialResult,
    createTask04QueueUiInteractionState,
  );
  const interactionStateRef = useRef(
    createTask04QueueUiInteractionState(initialResult),
  );
  const requestId = useRef(0);
  const [isTransitionPending, startTransition] =
    useTransition();

  function dispatchInteraction(
    event: Task04QueueUiInteractionEvent,
  ): void {
    interactionStateRef.current =
      task04QueueUiInteractionReducer(
        interactionStateRef.current,
        event,
      );
    reactDispatch(event);
  }

  function temporaryFailure(): Task04QueueUiFailure {
    return {
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: unavailableMessage,
      },
    };
  }

  function runRequest(
    kind: Task04QueueUiRequestKind,
    request: Task04QueueUiRequest,
  ): boolean {
    if (
      interactionStateRef.current.pendingRequest !== undefined
    ) {
      return false;
    }
    requestId.current += 1;
    const currentRequestId = requestId.current;
    dispatchInteraction({
      type: "request_started",
      pendingRequest: {
        id: currentRequestId,
        kind,
        request,
      },
    });
    startTransition(async () => {
      try {
        const nextResult = await runQueueAction(request);
        if (nextResult.success) {
          dispatchInteraction({
            type: "request_succeeded",
            requestId: currentRequestId,
            result: nextResult,
          });
        } else {
          dispatchInteraction({
            type: "request_failed",
            requestId: currentRequestId,
            failure: nextResult,
          });
        }
      } catch {
        dispatchInteraction({
          type: "request_failed",
          requestId: currentRequestId,
          failure: temporaryFailure(),
        });
      }
    });
    return true;
  }

  function changeDraft(
    draft: Task04QueueUiFilterDraft,
  ): void {
    dispatchInteraction({
      type: "draft_changed",
      draft,
    });
  }

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    runRequest(
      "apply",
      task04QueueRequestFromFilterDraft(
        interactionStateRef.current.draft,
      ),
    );
  }

  function resetFilters(): void {
    if (
      interactionStateRef.current.pendingRequest !== undefined
    ) {
      return;
    }
    const resetDraft = createTask04DefaultQueueFilterDraft();
    changeDraft(resetDraft);
    runRequest(
      "reset",
      task04QueueRequestFromFilterDraft(resetDraft),
    );
  }

  function nextPage(): void {
    const nextRequest = task04QueueUiNextRequest(
      interactionStateRef.current,
    );
    if (nextRequest === undefined) return;
    runRequest("next", nextRequest);
  }

  const isPending =
    isTransitionPending ||
    interactionState.pendingRequest !== undefined;
  const { draft, result } = interactionState;
  const invalid =
    !result.success && result.error.code === "REQUEST_INVALID";
  const liveMessage = isPending
    ? "Loading synthetic queue results."
    : interactionState.paginationError !== undefined
      ? interactionState.paginationError.error.message
      : result.success
        ? result.data.items.length === 0
          ? "No matching synthetic queue items."
          : "Synthetic queue results updated."
        : result.error.message;

  return (
    <div className="queue-workspace">
      <QueueFilterForm
        draft={draft}
        filterOptions={filterOptions}
        isPending={isPending}
        invalid={invalid}
        onDraftChange={changeDraft}
        onSubmit={applyFilters}
        onReset={resetFilters}
      />
      <div
        className="queue-live-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage}
      </div>
      <QueueResults
        result={result}
        isPending={isPending}
        paginationError={interactionState.paginationError}
        showNextPage={task04QueueUiCanPaginate(
          interactionState,
        )}
        onNextPage={nextPage}
      />
    </div>
  );
}
