export type Task04QueueUiFilterDraft = Readonly<{
  statuses: readonly string[];
  modality: string;
  startDate: string;
  endDate: string;
  sort: string;
}>;

export type Task04QueueUiRequest = Readonly<{
  status?: readonly string[];
  modality?: string;
  startDate?: string;
  endDate?: string;
  sort: string;
  cursor?: string;
}>;

export type Task04QueueUiItem = Readonly<{
  appointmentDateLabel: string;
  appointmentTimeRangeLabel: string;
  displayTimezone: string;
  serviceCategoryLabel: string;
  modality: string;
  administrativeStatus: string;
  languagePreference: string;
  accessibilityPreferences: readonly string[];
  source: string;
  createdLabel: string;
  operationalReason: string;
  actionAvailability: string;
}>;

export type Task04QueueUiSuccess = Readonly<{
  success: true;
  data: Readonly<{
    items: readonly Task04QueueUiItem[];
    nextCursor?: string;
    resultCompleteness: string;
    unavailableSourceCategories: readonly string[];
    freshnessState: string;
    generatedAtUtc: string;
    refreshGuidance: string;
  }>;
}>;

export type Task04QueueUiFailure = Readonly<{
  success: false;
  error: Readonly<{
    code: string;
    message: string;
  }>;
}>;

export type Task04QueueUiResult =
  | Task04QueueUiSuccess
  | Task04QueueUiFailure;

export type Task04QueueUiAction = (
  input: unknown,
) => Promise<Task04QueueUiResult>;

export type Task04QueueUiFilterOptions = Readonly<{
  statuses: readonly string[];
  modalities: readonly string[];
  sorts: readonly string[];
}>;

export type Task04QueueUiRequestKind =
  | "apply"
  | "reset"
  | "next";

export type Task04QueueUiPendingRequest = Readonly<{
  id: number;
  kind: Task04QueueUiRequestKind;
  request: Task04QueueUiRequest;
}>;

export type Task04QueueUiInteractionState = Readonly<{
  draft: Task04QueueUiFilterDraft;
  appliedRequest: Task04QueueUiRequest;
  isDraftDirty: boolean;
  result: Task04QueueUiResult;
  pendingRequest?: Task04QueueUiPendingRequest;
  paginationError?: Task04QueueUiFailure;
}>;

export type Task04QueueUiInteractionEvent =
  | Readonly<{
      type: "draft_changed";
      draft: Task04QueueUiFilterDraft;
    }>
  | Readonly<{
      type: "request_started";
      pendingRequest: Task04QueueUiPendingRequest;
    }>
  | Readonly<{
      type: "request_succeeded";
      requestId: number;
      result: Task04QueueUiSuccess;
    }>
  | Readonly<{
      type: "request_failed";
      requestId: number;
      failure: Task04QueueUiFailure;
    }>;

export const TASK04_DEFAULT_QUEUE_FILTER_DRAFT =
  Object.freeze({
    statuses: Object.freeze([]) as readonly string[],
    modality: "",
    startDate: "",
    endDate: "",
    sort: "start_time_asc",
  }) satisfies Task04QueueUiFilterDraft;

export function createTask04DefaultQueueFilterDraft(): Task04QueueUiFilterDraft {
  return {
    ...TASK04_DEFAULT_QUEUE_FILTER_DRAFT,
    statuses: [],
  };
}

export function task04QueueRequestFromFilterDraft(
  draft: Task04QueueUiFilterDraft,
): Task04QueueUiRequest {
  return {
    ...(draft.statuses.length === 0
      ? {}
      : { status: [...draft.statuses] }),
    ...(draft.modality === ""
      ? {}
      : { modality: draft.modality }),
    ...(draft.startDate === ""
      ? {}
      : { startDate: draft.startDate }),
    ...(draft.endDate === ""
      ? {}
      : { endDate: draft.endDate }),
    sort: draft.sort,
  };
}

export function task04QueueNextPageRequest(
  activeRequest: Task04QueueUiRequest,
  cursor: string,
): Task04QueueUiRequest {
  return {
    ...activeRequest,
    cursor,
  };
}

export function task04QueueBaseRequest(
  request: Task04QueueUiRequest,
): Task04QueueUiRequest {
  return {
    ...(request.status === undefined
      ? {}
      : { status: [...request.status] }),
    ...(request.modality === undefined
      ? {}
      : { modality: request.modality }),
    ...(request.startDate === undefined
      ? {}
      : { startDate: request.startDate }),
    ...(request.endDate === undefined
      ? {}
      : { endDate: request.endDate }),
    sort: request.sort,
  };
}

function statusesMatch(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
): boolean {
  const leftValues = [...(left ?? [])].sort();
  const rightValues = [...(right ?? [])].sort();
  return (
    leftValues.length === rightValues.length &&
    leftValues.every(
      (value, index) => value === rightValues[index],
    )
  );
}

export function task04QueueRequestsMatch(
  left: Task04QueueUiRequest,
  right: Task04QueueUiRequest,
): boolean {
  return (
    statusesMatch(left.status, right.status) &&
    left.modality === right.modality &&
    left.startDate === right.startDate &&
    left.endDate === right.endDate &&
    left.sort === right.sort
  );
}

export function task04QueueResultWithoutCursor(
  result: Task04QueueUiResult,
): Task04QueueUiResult {
  if (!result.success || result.data.nextCursor === undefined) {
    return result;
  }
  return {
    success: true,
    data: {
      items: result.data.items,
      resultCompleteness: result.data.resultCompleteness,
      unavailableSourceCategories:
        result.data.unavailableSourceCategories,
      freshnessState: result.data.freshnessState,
      generatedAtUtc: result.data.generatedAtUtc,
      refreshGuidance: result.data.refreshGuidance,
    },
  };
}

export function createTask04QueueUiInteractionState(
  initialResult: Task04QueueUiResult,
): Task04QueueUiInteractionState {
  const draft = createTask04DefaultQueueFilterDraft();
  return {
    draft,
    appliedRequest:
      task04QueueRequestFromFilterDraft(draft),
    isDraftDirty: false,
    result: initialResult,
  };
}

export function task04QueueUiInteractionReducer(
  state: Task04QueueUiInteractionState,
  event: Task04QueueUiInteractionEvent,
): Task04QueueUiInteractionState {
  if (event.type === "draft_changed") {
    return {
      ...state,
      draft: event.draft,
      isDraftDirty: !task04QueueRequestsMatch(
        task04QueueRequestFromFilterDraft(event.draft),
        state.appliedRequest,
      ),
      result: task04QueueResultWithoutCursor(state.result),
      paginationError: undefined,
    };
  }

  if (event.type === "request_started") {
    if (state.pendingRequest !== undefined) return state;
    return {
      ...state,
      pendingRequest: event.pendingRequest,
      ...(event.pendingRequest.kind === "next"
        ? {}
        : {
            isDraftDirty: true,
            result: task04QueueResultWithoutCursor(
              state.result,
            ),
          }),
      paginationError: undefined,
    };
  }

  if (
    state.pendingRequest === undefined ||
    state.pendingRequest.id !== event.requestId
  ) {
    return state;
  }

  if (event.type === "request_failed") {
    if (state.pendingRequest.kind === "next") {
      return {
        ...state,
        result: task04QueueResultWithoutCursor(state.result),
        pendingRequest: undefined,
        paginationError: event.failure,
      };
    }
    return {
      ...state,
      isDraftDirty: true,
      result: event.failure,
      pendingRequest: undefined,
      paginationError: undefined,
    };
  }

  const successfulBaseRequest = task04QueueBaseRequest(
    state.pendingRequest.request,
  );
  const appliedRequest =
    state.pendingRequest.kind === "next"
      ? state.appliedRequest
      : successfulBaseRequest;
  const isDraftDirty = !task04QueueRequestsMatch(
    task04QueueRequestFromFilterDraft(state.draft),
    appliedRequest,
  );
  return {
    ...state,
    appliedRequest,
    isDraftDirty,
    result: isDraftDirty
      ? task04QueueResultWithoutCursor(event.result)
      : event.result,
    pendingRequest: undefined,
    paginationError: undefined,
  };
}

export function task04QueueUiCanPaginate(
  state: Task04QueueUiInteractionState,
): boolean {
  return (
    state.pendingRequest === undefined &&
    !state.isDraftDirty &&
    state.result.success &&
    state.result.data.nextCursor !== undefined &&
    task04QueueRequestsMatch(
      task04QueueRequestFromFilterDraft(state.draft),
      state.appliedRequest,
    )
  );
}

export function task04QueueUiNextRequest(
  state: Task04QueueUiInteractionState,
): Task04QueueUiRequest | undefined {
  if (
    !task04QueueUiCanPaginate(state) ||
    !state.result.success ||
    state.result.data.nextCursor === undefined
  ) {
    return undefined;
  }
  return task04QueueNextPageRequest(
    state.appliedRequest,
    state.result.data.nextCursor,
  );
}
