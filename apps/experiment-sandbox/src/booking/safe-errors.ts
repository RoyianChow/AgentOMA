import { randomBytes } from "node:crypto";

import { z } from "zod";

export const TASK04_SAFE_ERROR_MESSAGES = Object.freeze({
  REQUEST_INVALID: "We could not process that request.",
  NOT_AUTHORIZED: "This action is not available.",
  RESOURCE_UNAVAILABLE: "The requested item is unavailable.",
  SLOT_NO_LONGER_AVAILABLE:
    "That appointment time is no longer available.",
  INVALID_TRANSITION:
    "This action is not available in the current state.",
  LINK_EXPIRED: "This access path is no longer active.",
  ACTION_ALREADY_COMPLETED: "This action was already completed.",
  REQUEST_IN_PROGRESS: "This request is still being processed.",
  IDEMPOTENCY_KEY_CONFLICT: "This request key cannot be reused.",
  WAITLIST_OFFER_EXPIRED: "This offer is no longer active.",
  RATE_LIMIT_REACHED:
    "Too many requests were made. Please try again later.",
  RECOVERY_REQUIRED: "Use the available recovery option to continue.",
  TEMPORARILY_UNAVAILABLE: "This service is temporarily unavailable.",
  FEATURE_DISABLED: "This service is currently unavailable.",
} as const);

export const TASK04_SAFE_ERROR_CODES = Object.freeze(
  Object.keys(
    TASK04_SAFE_ERROR_MESSAGES,
  ) as (keyof typeof TASK04_SAFE_ERROR_MESSAGES)[],
);

export type Task04SafeErrorCode = (typeof TASK04_SAFE_ERROR_CODES)[number];

export const TASK04_SAFE_ERROR_SUBSETS = Object.freeze({
  "availability:query": [
    "REQUEST_INVALID",
    "RATE_LIMIT_REACHED",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "booking:create": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "SLOT_NO_LONGER_AVAILABLE",
    "REQUEST_IN_PROGRESS",
    "IDEMPOTENCY_KEY_CONFLICT",
    "RATE_LIMIT_REACHED",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "booking:view": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "LINK_EXPIRED",
    "RESOURCE_UNAVAILABLE",
    "RATE_LIMIT_REACHED",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "booking:confirm": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "INVALID_TRANSITION",
    "ACTION_ALREADY_COMPLETED",
    "REQUEST_IN_PROGRESS",
    "IDEMPOTENCY_KEY_CONFLICT",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "booking:expire": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "INVALID_TRANSITION",
    "ACTION_ALREADY_COMPLETED",
    "REQUEST_IN_PROGRESS",
    "IDEMPOTENCY_KEY_CONFLICT",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "booking:cancel": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "LINK_EXPIRED",
    "INVALID_TRANSITION",
    "SLOT_NO_LONGER_AVAILABLE",
    "ACTION_ALREADY_COMPLETED",
    "REQUEST_IN_PROGRESS",
    "IDEMPOTENCY_KEY_CONFLICT",
    "RATE_LIMIT_REACHED",
    "RECOVERY_REQUIRED",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "waitlist:join": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "INVALID_TRANSITION",
    "ACTION_ALREADY_COMPLETED",
    "REQUEST_IN_PROGRESS",
    "IDEMPOTENCY_KEY_CONFLICT",
    "RATE_LIMIT_REACHED",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "waitlist:leave": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "LINK_EXPIRED",
    "INVALID_TRANSITION",
    "ACTION_ALREADY_COMPLETED",
    "REQUEST_IN_PROGRESS",
    "IDEMPOTENCY_KEY_CONFLICT",
    "RATE_LIMIT_REACHED",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "waitlist:offer:accept": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "LINK_EXPIRED",
    "WAITLIST_OFFER_EXPIRED",
    "INVALID_TRANSITION",
    "ACTION_ALREADY_COMPLETED",
    "REQUEST_IN_PROGRESS",
    "IDEMPOTENCY_KEY_CONFLICT",
    "RATE_LIMIT_REACHED",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "management-credential:issue": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "LINK_EXPIRED",
    "ACTION_ALREADY_COMPLETED",
    "REQUEST_IN_PROGRESS",
    "IDEMPOTENCY_KEY_CONFLICT",
    "RECOVERY_REQUIRED",
    "RATE_LIMIT_REACHED",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "management:recover": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "LINK_EXPIRED",
    "RECOVERY_REQUIRED",
    "REQUEST_IN_PROGRESS",
    "IDEMPOTENCY_KEY_CONFLICT",
    "RATE_LIMIT_REACHED",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
  "queue:read": [
    "REQUEST_INVALID",
    "NOT_AUTHORIZED",
    "RATE_LIMIT_REACHED",
    "TEMPORARILY_UNAVAILABLE",
    "FEATURE_DISABLED",
  ],
} as const satisfies Readonly<
  Record<string, readonly Task04SafeErrorCode[]>
>);

export type Task04SafeErrorBoundary =
  keyof typeof TASK04_SAFE_ERROR_SUBSETS;

const correlationReferenceSchema = z
  .string()
  .min(16)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/);

export type Task04SafeError = {
  success: false;
  error: {
    code: Task04SafeErrorCode;
    message: (typeof TASK04_SAFE_ERROR_MESSAGES)[Task04SafeErrorCode];
    correlationId?: string;
  };
};

export class Task04KnownFailure extends Error {
  readonly code: Task04SafeErrorCode;

  constructor(code: Task04SafeErrorCode) {
    super("TASK04_COMMAND_FAILED");
    this.name = "Task04KnownFailure";
    this.code = code;
  }
}

export function createTask04CorrelationReference(): string {
  return `SYNTH-CORR-${randomBytes(18).toString("base64url")}`;
}

export function task04ErrorCodeIsAllowed(
  boundary: Task04SafeErrorBoundary,
  code: Task04SafeErrorCode,
): boolean {
  return TASK04_SAFE_ERROR_SUBSETS[boundary].some(
    (allowedCode) => allowedCode === code,
  );
}

export function mapTask04SafeError(
  boundary: Task04SafeErrorBoundary,
  failure: unknown,
  correlationId?: string,
): Task04SafeError {
  const requestedCode =
    failure instanceof Task04KnownFailure
      ? failure.code
      : "TEMPORARILY_UNAVAILABLE";
  const code = task04ErrorCodeIsAllowed(boundary, requestedCode)
    ? requestedCode
    : "TEMPORARILY_UNAVAILABLE";
  const parsedCorrelationId =
    correlationId === undefined
      ? undefined
      : correlationReferenceSchema.safeParse(correlationId);

  return {
    success: false,
    error: {
      code,
      message: TASK04_SAFE_ERROR_MESSAGES[code],
      ...(parsedCorrelationId?.success
        ? { correlationId: parsedCorrelationId.data }
        : {}),
    },
  };
}
