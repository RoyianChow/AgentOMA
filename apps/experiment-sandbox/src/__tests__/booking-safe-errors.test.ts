import { describe, expect, it } from "vitest";

import {
  TASK04_SAFE_ERROR_CODES,
  TASK04_SAFE_ERROR_MESSAGES,
  TASK04_SAFE_ERROR_SUBSETS,
  Task04KnownFailure,
  createTask04CorrelationReference,
  mapTask04SafeError,
} from "../booking/safe-errors";

const EXPECTED_SAFE_ERROR_MESSAGES = {
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
} as const;

const EXPECTED_SAFE_ERROR_SUBSETS = {
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
} as const;

const EXPECTED_SAFE_ERROR_CODES = Object.keys(
  EXPECTED_SAFE_ERROR_MESSAGES,
) as (keyof typeof EXPECTED_SAFE_ERROR_MESSAGES)[];

describe("Task 04 canonical safe errors", () => {
  it("matches the independently transcribed documented registry and subsets", () => {
    expect(TASK04_SAFE_ERROR_CODES).toEqual(
      EXPECTED_SAFE_ERROR_CODES,
    );
    expect(TASK04_SAFE_ERROR_MESSAGES).toEqual(
      EXPECTED_SAFE_ERROR_MESSAGES,
    );
    expect(TASK04_SAFE_ERROR_SUBSETS).toEqual(
      EXPECTED_SAFE_ERROR_SUBSETS,
    );
  });

  it.each(EXPECTED_SAFE_ERROR_CODES)(
    "uses the exact documented code/message pair for %s",
    (code) => {
      const boundary = Object.entries(
        EXPECTED_SAFE_ERROR_SUBSETS,
      ).find(([, codes]) => codes.includes(code as never))?.[0] as
        | keyof typeof EXPECTED_SAFE_ERROR_SUBSETS
        | undefined;
      expect(boundary).toBeDefined();
      const mapped = mapTask04SafeError(
        boundary!,
        new Task04KnownFailure(code),
        "SYNTH-CORR-REFERENCE-0001",
      );
      expect(mapped).toEqual({
        success: false,
        error: {
          code,
          message: EXPECTED_SAFE_ERROR_MESSAGES[code],
          correlationId: "SYNTH-CORR-REFERENCE-0001",
        },
      });
      expect(JSON.stringify(mapped)).not.toMatch(
        /(?:sql|stack|column|table|contact|token|pharmacy|tenant)/i,
      );
    },
  );

  it.each([
    "unknown",
    "revoked",
    "consumed",
    "wrong-session",
    "inaccessible",
    "ambiguous",
  ])(
    "keeps %s management credentials anti-enumerated",
    () => {
      expect(
        mapTask04SafeError(
          "booking:view",
          new Task04KnownFailure("NOT_AUTHORIZED"),
          "SYNTH-CORR-REFERENCE-0001",
        ),
      ).toEqual({
        success: false,
        error: {
          code: "NOT_AUTHORIZED",
          message: "This action is not available.",
          correlationId: "SYNTH-CORR-REFERENCE-0001",
        },
      });
    },
  );

  it("enforces boundary-specific subsets", () => {
    expect(
      mapTask04SafeError(
        "booking:confirm",
        new Task04KnownFailure("LINK_EXPIRED"),
      ),
    ).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
    expect(
      mapTask04SafeError(
        "booking:view",
        new Task04KnownFailure("LINK_EXPIRED"),
      ),
    ).toEqual({
      success: false,
      error: {
        code: "LINK_EXPIRED",
        message: "This access path is no longer active.",
      },
    });
  });

  it("maps unknown failures without reflecting details", () => {
    const mapped = mapTask04SafeError(
      "booking:create",
      new Error(
        "relation secret_table failed for SYNTH-CONTACT-TASK04-0001",
      ),
    );
    expect(mapped).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
  });

  it("generates opaque correlations and omits malformed values", () => {
    const first = createTask04CorrelationReference();
    const second = createTask04CorrelationReference();
    expect(first).toMatch(/^SYNTH-CORR-[A-Za-z0-9_-]{24}$/);
    expect(second).not.toBe(first);
    expect(first).not.toMatch(
      /(?:booking|patient|contact|pharmacy|tenant|sql)/i,
    );
    expect(
      mapTask04SafeError(
        "booking:view",
        new Task04KnownFailure("NOT_AUTHORIZED"),
        "unsafe correlation with spaces",
      ),
    ).toEqual({
      success: false,
      error: {
        code: "NOT_AUTHORIZED",
        message: "This action is not available.",
      },
    });
  });
});
