import { z } from "zod";

import {
  assertTask04AuthoritativeContext,
  type Task04AuthoritativeTransactionContext,
} from "../db/authoritative-context";
import {
  managementActionSchema,
  opaqueReferenceSchema,
  sandboxPharmacyIdSchema,
  syntheticActorTypeSchema,
  syntheticSubjectTypeSchema,
  utcInstantSchema,
} from "./contracts";

export type Task04AuthorizationResult =
  | { authorized: true; reasonCode: "AUTHORIZED" }
  | {
      authorized: false;
      reasonCode: "NOT_AUTHORIZED" | "LINK_EXPIRED";
    };

const denied = (
  reasonCode: "NOT_AUTHORIZED" | "LINK_EXPIRED" =
    "NOT_AUTHORIZED",
): Task04AuthorizationResult => ({ authorized: false, reasonCode });

const authorized = (): Task04AuthorizationResult => ({
  authorized: true,
  reasonCode: "AUTHORIZED",
});

export const reusableCapabilityRecordSchema = z
  .object({
    usageMode: z.literal("reusable"),
    capabilityReference: opaqueReferenceSchema,
    bookingReference: opaqueReferenceSchema,
    permittedActions: z
      .array(managementActionSchema)
      .min(1)
      .max(8)
      .refine((values) => new Set(values).size === values.length),
    actorReference: opaqueReferenceSchema,
    subjectReference: opaqueReferenceSchema,
    subjectType: syntheticSubjectTypeSchema,
    serverSessionBinding: opaqueReferenceSchema,
    pharmacyId: sandboxPharmacyIdSchema,
    state: z.enum(["active", "expired", "revoked"]),
    expiresAtUtc: utcInstantSchema,
  })
  .strict();

export const reusableCapabilityRequestSchema = z
  .object({
    capabilityReference: opaqueReferenceSchema,
    bookingReference: opaqueReferenceSchema,
    requiredAction: managementActionSchema,
    actorType: z.enum(["synthetic_patient", "synthetic_delegate"]),
    actorReference: opaqueReferenceSchema,
    subjectReference: opaqueReferenceSchema,
    subjectType: syntheticSubjectTypeSchema,
    serverSessionBinding: opaqueReferenceSchema,
  })
  .strict();

export type ReusableCapabilityRecord = z.infer<
  typeof reusableCapabilityRecordSchema
>;
export type ReusableCapabilityRequest = z.infer<
  typeof reusableCapabilityRequestSchema
>;

export function evaluateReusableManagementCapability(
  recordInput: unknown,
  requestInput: unknown,
  authoritativeContext: Task04AuthoritativeTransactionContext,
): Task04AuthorizationResult {
  try {
    assertTask04AuthoritativeContext(authoritativeContext);
  } catch {
    return denied();
  }
  const request = reusableCapabilityRequestSchema.safeParse(requestInput);
  const record = reusableCapabilityRecordSchema.safeParse(recordInput);
  if (!request.success || !record.success) return denied();

  if (
    record.data.capabilityReference !==
      request.data.capabilityReference ||
    record.data.bookingReference !== request.data.bookingReference ||
    record.data.pharmacyId !== authoritativeContext.pharmacyId ||
    record.data.actorReference !== request.data.actorReference ||
    record.data.subjectReference !== request.data.subjectReference ||
    record.data.subjectType !== request.data.subjectType ||
    record.data.serverSessionBinding !==
      request.data.serverSessionBinding ||
    !record.data.permittedActions.includes(request.data.requiredAction)
  ) {
    return denied();
  }

  if (record.data.state === "revoked") return denied();
  if (
    record.data.state === "expired" ||
    Date.parse(record.data.expiresAtUtc) <=
      Date.parse(authoritativeContext.nowUtc)
  ) {
    return denied("LINK_EXPIRED");
  }
  if (record.data.state !== "active") return denied();

  return authorized();
}

export const staffBookingConfirmationFactsSchema = z
  .object({
    actorType: syntheticActorTypeSchema,
    actorReference: opaqueReferenceSchema,
    subjectType: syntheticSubjectTypeSchema,
    sessionReference: opaqueReferenceSchema,
    sessionActive: z.boolean(),
    permissions: z
      .array(z.literal("booking:confirm"))
      .max(1)
      .refine((values) => new Set(values).size === values.length),
  })
  .strict();

export type StaffBookingConfirmationFacts = z.infer<
  typeof staffBookingConfirmationFactsSchema
>;

export function authorizeStaffBookingConfirmation(
  authoritativeContext: Task04AuthoritativeTransactionContext,
  factsInput: unknown,
): Task04AuthorizationResult {
  try {
    assertTask04AuthoritativeContext(authoritativeContext);
  } catch {
    return denied();
  }
  const facts =
    staffBookingConfirmationFactsSchema.safeParse(factsInput);
  if (
    !facts.success ||
    facts.data.actorType !== "synthetic_staff" ||
    !facts.data.sessionActive ||
    !facts.data.permissions.includes("booking:confirm")
  ) {
    return denied();
  }

  return authorized();
}

export const staffPharmacistQueueFactsSchema = z
  .object({
    actorType: z.literal("synthetic_staff"),
    actorReference: opaqueReferenceSchema,
    sessionReference: opaqueReferenceSchema,
    sessionActive: z.boolean(),
    pharmacyId: sandboxPharmacyIdSchema,
    permissions: z
      .array(z.literal("queue:read"))
      .max(1)
      .refine((values) => new Set(values).size === values.length),
  })
  .strict();

export type StaffPharmacistQueueFacts = z.infer<
  typeof staffPharmacistQueueFactsSchema
>;

export function authorizeStaffPharmacistQueue(
  authoritativeContext: Task04AuthoritativeTransactionContext,
  factsInput: unknown,
): Task04AuthorizationResult {
  try {
    assertTask04AuthoritativeContext(authoritativeContext);
  } catch {
    return denied();
  }
  const facts =
    staffPharmacistQueueFactsSchema.safeParse(factsInput);
  if (
    !facts.success ||
    !facts.data.sessionActive ||
    facts.data.pharmacyId !== authoritativeContext.pharmacyId ||
    !facts.data.permissions.includes("queue:read")
  ) {
    return denied();
  }
  return authorized();
}
