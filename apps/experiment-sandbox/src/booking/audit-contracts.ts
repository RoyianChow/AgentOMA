import { z } from "zod";

import {
  opaqueReferenceSchema,
  syntheticSubjectTypeSchema,
} from "./contracts";

const successfulBookingCreateAuditSchema = z
  .object({
    operation: z.literal("booking:create"),
    auditId: opaqueReferenceSchema,
    aggregateType: z.literal("booking"),
    aggregateId: opaqueReferenceSchema,
    aggregateVersion: z.number().int().positive(),
    actorType: z.enum([
      "synthetic_patient",
      "synthetic_delegate",
    ]),
    subjectReference: opaqueReferenceSchema,
    subjectType: syntheticSubjectTypeSchema,
    priorState: z.literal("none"),
    resultingState: z.enum([
      "pending_confirmation",
      "confirmed",
    ]),
    safeReasonCode: z.literal("BOOKING_REQUESTED"),
    idempotencyRecordId: opaqueReferenceSchema,
    outboxRecordId: opaqueReferenceSchema,
  })
  .strict();

const successfulBookingConfirmAuditSchema = z
  .object({
    operation: z.literal("booking:confirm"),
    auditId: opaqueReferenceSchema,
    aggregateType: z.literal("booking"),
    aggregateId: opaqueReferenceSchema,
    aggregateVersion: z.number().int().positive(),
    actorType: z.literal("synthetic_staff"),
    subjectReference: opaqueReferenceSchema,
    subjectType: syntheticSubjectTypeSchema,
    priorState: z.literal("pending_confirmation"),
    resultingState: z.literal("confirmed"),
    safeReasonCode: z.literal("STAFF_CONFIRMED"),
    idempotencyRecordId: opaqueReferenceSchema,
    outboxRecordId: opaqueReferenceSchema,
  })
  .strict();

const successfulBookingExpireAuditSchema = z
  .object({
    operation: z.literal("booking:expire"),
    auditId: opaqueReferenceSchema,
    aggregateType: z.enum(["booking", "capacity_hold"]),
    aggregateId: opaqueReferenceSchema,
    aggregateVersion: z.number().int().positive(),
    actorType: z.literal("synthetic_system_worker"),
    subjectReference: opaqueReferenceSchema,
    subjectType: syntheticSubjectTypeSchema,
    priorState: z.enum(["pending_confirmation", "active"]),
    resultingState: z.literal("expired"),
    safeReasonCode: z.enum([
      "CONFIRMATION_WINDOW_EXPIRED",
      "HOLD_WINDOW_EXPIRED",
    ]),
    idempotencyRecordId: opaqueReferenceSchema,
    outboxRecordId: opaqueReferenceSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const bookingTransition =
      value.aggregateType === "booking" &&
      value.priorState === "pending_confirmation" &&
      value.safeReasonCode === "CONFIRMATION_WINDOW_EXPIRED";
    const holdTransition =
      value.aggregateType === "capacity_hold" &&
      value.priorState === "active" &&
      value.safeReasonCode === "HOLD_WINDOW_EXPIRED";
    if (!bookingTransition && !holdTransition) {
      context.addIssue({
        code: "custom",
        message: "TASK04_AUDIT_INPUT_DENIED",
      });
    }
  });

const successfulAuditInputSchema = z.discriminatedUnion("operation", [
  successfulBookingCreateAuditSchema,
  successfulBookingConfirmAuditSchema,
  successfulBookingExpireAuditSchema,
]);

export type Task04AuditInput = z.infer<
  typeof successfulAuditInputSchema
>;

export const TASK04_DENIED_AUDIT_PERSISTENCE_BLOCKER =
  "DENIED_ACTION_AUDIT_REQUIRES_NULLABLE_OUTBOX_REFERENCE" as const;

export function parseTask04AuditInput(
  input: unknown,
): Task04AuditInput {
  const parsed = successfulAuditInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("TASK04_AUDIT_INPUT_DENIED");
  }
  return parsed.data;
}

export function task04AuditActionCode(
  operation: Task04AuditInput["operation"],
): "BOOKING_CREATE" | "BOOKING_CONFIRM" | "BOOKING_EXPIRE" {
  switch (operation) {
    case "booking:create":
      return "BOOKING_CREATE";
    case "booking:confirm":
      return "BOOKING_CONFIRM";
    case "booking:expire":
      return "BOOKING_EXPIRE";
  }
}
