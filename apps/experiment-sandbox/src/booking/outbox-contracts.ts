import { z } from "zod";

import {
  appointmentModalitySchema,
  managementActionSchema,
  opaqueReferenceSchema,
  syntheticActorTypeSchema,
  utcInstantSchema,
} from "./contracts";

const strictPayload = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).strict();

const bookingCreatedPayload = strictPayload({
  resultingState: z.enum(["pending_confirmation", "confirmed"]),
  modality: appointmentModalitySchema,
  startTimeUtc: utcInstantSchema,
  endTimeUtc: utcInstantSchema,
});
const bookingConfirmedPayload = strictPayload({
  previousState: z.enum(["pending_confirmation", "none"]),
  resultingState: z.literal("confirmed"),
  capacityOwner: z.literal("booking"),
});
const bookingCancelledPayload = strictPayload({
  previousState: z.enum(["pending_confirmation", "confirmed"]),
  resultingState: z.literal("cancelled"),
});
const bookingRescheduledPayload = strictPayload({
  predecessorBookingReference: opaqueReferenceSchema,
  successorBookingReference: opaqueReferenceSchema,
  successorState: z.enum(["pending_confirmation", "confirmed"]),
});
const bookingExpiredPayload = strictPayload({
  previousState: z.literal("pending_confirmation"),
  resultingState: z.literal("expired"),
});
const waitlistJoinedPayload = strictPayload({
  resultingState: z.literal("active"),
  modalityPreference: appointmentModalitySchema,
});
const waitlistCancelledPayload = strictPayload({
  previousState: z.enum(["active", "offered"]),
  resultingState: z.literal("cancelled"),
});
const waitlistReactivatedPayload = strictPayload({
  previousState: z.literal("offered"),
  resultingState: z.literal("active"),
});
const waitlistExpiredPayload = strictPayload({
  previousState: z.enum(["active", "offered"]),
  resultingState: z.literal("expired"),
});
const offerCreatedPayload = strictPayload({
  waitlistReference: opaqueReferenceSchema,
  capacityHoldReference: opaqueReferenceSchema,
  resultingState: z.literal("pending"),
  expiresAtUtc: utcInstantSchema,
});
const offerAcceptedPayload = strictPayload({
  waitlistReference: opaqueReferenceSchema,
  bookingReference: opaqueReferenceSchema,
  resultingOfferState: z.literal("accepted"),
  resultingEntryState: z.literal("promoted"),
});
const offerDeclinedPayload = strictPayload({
  waitlistReference: opaqueReferenceSchema,
  resultingOfferState: z.literal("declined"),
  resultingEntryState: z.literal("cancelled"),
});
const offerWithdrawnPayload = strictPayload({
  waitlistReference: opaqueReferenceSchema,
  resultingOfferState: z.literal("cancelled"),
  resultingEntryState: z.enum(["active", "cancelled", "expired"]),
});
const offerExpiredPayload = strictPayload({
  waitlistReference: opaqueReferenceSchema,
  resultingOfferState: z.literal("expired"),
  resultingEntryState: z.enum(["active", "expired"]),
});
const holdCreatedPayload = strictPayload({
  ownerType: z.enum(["pending_booking", "waitlist_offer"]),
  ownerReference: opaqueReferenceSchema,
  resultingState: z.literal("active"),
  expiresAtUtc: utcInstantSchema,
});
const holdConsumedPayload = strictPayload({
  ownerType: z.enum(["pending_booking", "waitlist_offer"]),
  bookingReference: opaqueReferenceSchema,
  resultingState: z.literal("consumed"),
});
const holdReleasedPayload = strictPayload({
  ownerType: z.enum(["pending_booking", "waitlist_offer"]),
  releaseCause: z.enum([
    "early_booking_cancellation",
    "reschedule_replacement",
    "offer_decline",
    "offer_withdrawal",
    "waitlist_leave",
  ]),
  resultingState: z.literal("released"),
});
const holdExpiredPayload = strictPayload({
  ownerType: z.enum(["pending_booking", "waitlist_offer"]),
  resultingState: z.literal("expired"),
});
const managementCredentialIssuedPayload = strictPayload({
  credentialReference: opaqueReferenceSchema,
  usageMode: z.enum(["one_time", "reusable"]),
  permittedActions: z.array(managementActionSchema).min(1).max(8),
  channel: z.enum(["server_session_bound", "one_time_response"]),
  expiresAtUtc: utcInstantSchema,
});
const managementCredentialConsumedPayload = strictPayload({
  credentialReference: opaqueReferenceSchema,
  consumedByAction: z.enum([
    "booking:cancel",
    "booking:reschedule",
    "waitlist:leave",
    "waitlist:offer:accept",
    "waitlist:offer:decline",
  ]),
  resultingState: z.literal("consumed"),
});
const managementCredentialTerminalPayload = strictPayload({
  credentialReference: opaqueReferenceSchema,
  resultingState: z.enum(["revoked", "expired"]),
});
const automationReconciledPayload = strictPayload({
  reconciliationRunReference: opaqueReferenceSchema,
  resultingState: z.enum(["completed", "no_changes"]),
  processedCount: z
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER),
});
const automationControlPayload = strictPayload({
  previousState: z.enum(["enabled", "disabled"]),
  resultingState: z.enum(["enabled", "disabled"]),
  controlVersion: z.number().int().positive(),
});

type EventContract = {
  aggregateType:
    | "booking"
    | "waitlist_entry"
    | "waitlist_offer"
    | "capacity_hold"
    | "management_credential"
    | "automation_control";
  reasons: readonly string[];
  payload: z.ZodType;
  refine?: (reason: string, payload: Record<string, unknown>) => boolean;
};

const EVENT_CONTRACTS = {
  "booking.created": {
    aggregateType: "booking",
    reasons: ["BOOKING_REQUESTED"],
    payload: bookingCreatedPayload,
  },
  "booking.confirmed": {
    aggregateType: "booking",
    reasons: ["IMMEDIATE_CONFIRMATION", "STAFF_CONFIRMED"],
    payload: bookingConfirmedPayload,
    refine: (reason, payload) =>
      (payload.previousState === "none" &&
        reason === "IMMEDIATE_CONFIRMATION") ||
      (payload.previousState === "pending_confirmation" &&
        reason === "STAFF_CONFIRMED"),
  },
  "booking.cancelled": {
    aggregateType: "booking",
    reasons: ["ACTOR_CANCELLED"],
    payload: bookingCancelledPayload,
  },
  "booking.rescheduled": {
    aggregateType: "booking",
    reasons: ["REPLACEMENT_COMMITTED"],
    payload: bookingRescheduledPayload,
  },
  "booking.expired": {
    aggregateType: "booking",
    reasons: ["CONFIRMATION_WINDOW_EXPIRED"],
    payload: bookingExpiredPayload,
  },
  "waitlist.joined": {
    aggregateType: "waitlist_entry",
    reasons: ["WAITLIST_REQUESTED"],
    payload: waitlistJoinedPayload,
  },
  "waitlist.cancelled": {
    aggregateType: "waitlist_entry",
    reasons: [
      "ACTOR_LEFT_WAITLIST",
      "ACTOR_DECLINED_OFFER",
      "AUTHORITY_REVOKED",
    ],
    payload: waitlistCancelledPayload,
  },
  "waitlist.reactivated": {
    aggregateType: "waitlist_entry",
    reasons: [
      "OFFER_WINDOW_EXPIRED_ENTRY_ELIGIBLE",
      "OFFER_WITHDRAWN_ENTRY_ELIGIBLE",
    ],
    payload: waitlistReactivatedPayload,
  },
  "waitlist.expired": {
    aggregateType: "waitlist_entry",
    reasons: ["ENTRY_WINDOW_EXPIRED"],
    payload: waitlistExpiredPayload,
  },
  "waitlist.offer_created": {
    aggregateType: "waitlist_offer",
    reasons: ["CAPACITY_BECAME_AVAILABLE"],
    payload: offerCreatedPayload,
  },
  "waitlist.offer_accepted": {
    aggregateType: "waitlist_offer",
    reasons: ["ACTOR_ACCEPTED_OFFER"],
    payload: offerAcceptedPayload,
  },
  "waitlist.offer_declined": {
    aggregateType: "waitlist_offer",
    reasons: ["ACTOR_DECLINED_OFFER"],
    payload: offerDeclinedPayload,
  },
  "waitlist.offer_withdrawn": {
    aggregateType: "waitlist_offer",
    reasons: [
      "SLOT_INVALIDATED",
      "ENTRY_LEFT",
      "AUTHORITY_REVOKED",
      "ENTRY_WINDOW_EXPIRED",
    ],
    payload: offerWithdrawnPayload,
    refine: (reason, payload) =>
      (reason === "SLOT_INVALIDATED" &&
        payload.resultingEntryState === "active") ||
      (["ENTRY_LEFT", "AUTHORITY_REVOKED"].includes(reason) &&
        payload.resultingEntryState === "cancelled") ||
      (reason === "ENTRY_WINDOW_EXPIRED" &&
        payload.resultingEntryState === "expired"),
  },
  "waitlist.offer_expired": {
    aggregateType: "waitlist_offer",
    reasons: ["OFFER_WINDOW_EXPIRED"],
    payload: offerExpiredPayload,
  },
  "capacity_hold.created": {
    aggregateType: "capacity_hold",
    reasons: [
      "PENDING_CONFIRMATION_RESERVED",
      "WAITLIST_OFFER_RESERVED",
    ],
    payload: holdCreatedPayload,
    refine: (reason, payload) =>
      (payload.ownerType === "pending_booking" &&
        reason === "PENDING_CONFIRMATION_RESERVED") ||
      (payload.ownerType === "waitlist_offer" &&
        reason === "WAITLIST_OFFER_RESERVED"),
  },
  "capacity_hold.consumed": {
    aggregateType: "capacity_hold",
    reasons: [
      "CONFIRMATION_COMMITTED",
      "OFFER_ACCEPTANCE_COMMITTED",
    ],
    payload: holdConsumedPayload,
    refine: (reason, payload) =>
      (payload.ownerType === "pending_booking" &&
        reason === "CONFIRMATION_COMMITTED") ||
      (payload.ownerType === "waitlist_offer" &&
        reason === "OFFER_ACCEPTANCE_COMMITTED"),
  },
  "capacity_hold.released": {
    aggregateType: "capacity_hold",
    reasons: [
      "EARLY_CANCELLATION",
      "RESCHEDULE_REPLACEMENT",
      "OFFER_DECLINED",
      "OFFER_WITHDRAWN",
      "WAITLIST_LEFT",
    ],
    payload: holdReleasedPayload,
    refine: (reason, payload) =>
      ({
        early_booking_cancellation: "EARLY_CANCELLATION",
        reschedule_replacement: "RESCHEDULE_REPLACEMENT",
        offer_decline: "OFFER_DECLINED",
        offer_withdrawal: "OFFER_WITHDRAWN",
        waitlist_leave: "WAITLIST_LEFT",
      })[String(payload.releaseCause)] === reason,
  },
  "capacity_hold.expired": {
    aggregateType: "capacity_hold",
    reasons: ["HOLD_WINDOW_EXPIRED"],
    payload: holdExpiredPayload,
  },
  "management_credential.issued": {
    aggregateType: "management_credential",
    reasons: [
      "SERVER_SESSION_CAPABILITY_CREATED",
      "ONE_TIME_ACCESS_ISSUED",
    ],
    payload: managementCredentialIssuedPayload,
    refine: (reason, payload) => {
      const actions = payload.permittedActions;
      if (!Array.isArray(actions) || new Set(actions).size !== actions.length) {
        return false;
      }
      if (payload.usageMode === "one_time") {
        return (
          payload.channel === "one_time_response" &&
          actions.length === 1 &&
          reason === "ONE_TIME_ACCESS_ISSUED" &&
          [
            "booking:cancel",
            "booking:reschedule",
            "waitlist:leave",
            "waitlist:offer:accept",
            "waitlist:offer:decline",
          ].includes(String(actions[0]))
        );
      }
      return (
        payload.usageMode === "reusable" &&
        payload.channel === "server_session_bound" &&
        reason === "SERVER_SESSION_CAPABILITY_CREATED"
      );
    },
  },
  "management_credential.consumed": {
    aggregateType: "management_credential",
    reasons: ["PROTECTED_ACTION_COMMITTED"],
    payload: managementCredentialConsumedPayload,
  },
  "management_credential.revoked": {
    aggregateType: "management_credential",
    reasons: [
      "AUTHORITY_REVOKED",
      "RESOURCE_TERMINAL",
      "SUCCESSOR_ROTATED",
    ],
    payload: managementCredentialTerminalPayload.refine(
      (payload) => payload.resultingState === "revoked",
    ),
  },
  "management_credential.expired": {
    aggregateType: "management_credential",
    reasons: ["CREDENTIAL_WINDOW_EXPIRED"],
    payload: managementCredentialTerminalPayload.refine(
      (payload) => payload.resultingState === "expired",
    ),
  },
  "automation.reconciled": {
    aggregateType: "automation_control",
    reasons: ["RECONCILIATION_COMPLETED"],
    payload: automationReconciledPayload,
  },
  "automation.disabled": {
    aggregateType: "automation_control",
    reasons: ["AUTHORIZED_DISABLE"],
    payload: automationControlPayload,
    refine: (_reason, payload) =>
      payload.previousState === "enabled" &&
      payload.resultingState === "disabled",
  },
  "automation.enabled": {
    aggregateType: "automation_control",
    reasons: ["AUTHORIZED_ENABLE"],
    payload: automationControlPayload,
    refine: (_reason, payload) =>
      payload.previousState === "disabled" &&
      payload.resultingState === "enabled",
  },
} as const satisfies Record<string, EventContract>;

export const TASK04_EVENT_TYPES = Object.keys(
  EVENT_CONTRACTS,
) as (keyof typeof EVENT_CONTRACTS)[];

const eventInsertionInputSchema = z
  .object({
    eventId: opaqueReferenceSchema,
    eventType: z.enum(TASK04_EVENT_TYPES),
    eventSchemaVersion: z.literal(1),
    aggregateType: z.enum([
      "booking",
      "waitlist_entry",
      "waitlist_offer",
      "capacity_hold",
      "management_credential",
      "automation_control",
    ]),
    aggregateId: opaqueReferenceSchema,
    aggregateVersion: z.number().int().positive(),
    actorType: syntheticActorTypeSchema,
    safeReasonCode: z.string().min(1).max(64),
    usefulnessExpiresAtUtc: utcInstantSchema.optional(),
    payload: z.unknown(),
  })
  .strict()
  .superRefine((value, context) => {
    const contract: EventContract = EVENT_CONTRACTS[value.eventType];
    if (
      value.aggregateType !== contract.aggregateType ||
      !contract.reasons.includes(value.safeReasonCode as never)
    ) {
      context.addIssue({
        code: "custom",
        message: "TASK04_EVENT_CONTRACT_DENIED",
      });
      return;
    }

    const parsedPayload = contract.payload.safeParse(value.payload);
    if (!parsedPayload.success) {
      context.addIssue({
        code: "custom",
        message: "TASK04_EVENT_CONTRACT_DENIED",
      });
      return;
    }
    if (
      contract.refine &&
      !contract.refine(
        value.safeReasonCode,
        parsedPayload.data as unknown as Record<string, unknown>,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "TASK04_EVENT_CONTRACT_DENIED",
      });
    }
  });

export type Task04OutboxEventInput = z.infer<
  typeof eventInsertionInputSchema
>;

export function parseTask04OutboxEventInput(
  input: unknown,
  maxPageSize: number,
): Task04OutboxEventInput {
  if (!Number.isSafeInteger(maxPageSize) || maxPageSize <= 0) {
    throw new Error("TASK04_EVENT_CONFIG_DENIED");
  }
  const parsed = eventInsertionInputSchema.safeParse(input);
  if (
    !parsed.success ||
    (parsed.data.eventType === "automation.reconciled" &&
      (parsed.data.payload as { processedCount: number })
        .processedCount > maxPageSize)
  ) {
    throw new Error("TASK04_EVENT_CONTRACT_DENIED");
  }
  return parsed.data;
}
