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

const successfulAuditInputSchema = z.discriminatedUnion("operation", [
  successfulBookingCreateAuditSchema,
  successfulBookingConfirmAuditSchema,
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
): "BOOKING_CREATE" | "BOOKING_CONFIRM" {
  return operation === "booking:create"
    ? "BOOKING_CREATE"
    : "BOOKING_CONFIRM";
}
