import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import {
  ACCESSIBILITY_PREFERENCES,
  administrativeAcknowledgementsSchema,
  idempotencyKeySchema,
  languagePreferenceSchema,
  opaqueReferenceSchema,
  syntheticContactReferenceSchema,
} from "./contracts";

export const TASK04_SUPPORTED_IDEMPOTENT_OPERATIONS = [
  "booking:create",
  "booking:confirm",
  "booking:expire",
] as const;

export type Task04SupportedIdempotentOperation =
  (typeof TASK04_SUPPORTED_IDEMPOTENT_OPERATIONS)[number];

const bookingCreateFingerprintInputSchema = z
  .object({
    operation: z.literal("booking:create"),
    actorReference: opaqueReferenceSchema,
    resourceScopeReference: opaqueReferenceSchema,
    request: z
      .object({
        slotReference: opaqueReferenceSchema,
        languagePreference: languagePreferenceSchema,
        accessibilityPreferences: z
          .array(z.enum(ACCESSIBILITY_PREFERENCES))
          .min(1)
          .max(ACCESSIBILITY_PREFERENCES.length)
          .refine((values) => new Set(values).size === values.length)
          .refine(
            (values) =>
              !values.includes("none") || values.length === 1,
          ),
        syntheticContactReference:
          syntheticContactReferenceSchema,
        administrativeAcknowledgements:
          administrativeAcknowledgementsSchema,
        idempotencyKey: idempotencyKeySchema,
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      value.resourceScopeReference === value.request.slotReference,
  );

const bookingConfirmFingerprintInputSchema = z
  .object({
    operation: z.literal("booking:confirm"),
    actorReference: opaqueReferenceSchema,
    resourceScopeReference: opaqueReferenceSchema,
    request: z
      .object({
        bookingReference: opaqueReferenceSchema,
        expectedAggregateVersion: z.number().int().positive(),
        idempotencyKey: idempotencyKeySchema,
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      value.resourceScopeReference === value.request.bookingReference,
  );

const bookingExpireFingerprintInputSchema = z
  .object({
    operation: z.literal("booking:expire"),
    actorReference: opaqueReferenceSchema,
    resourceScopeReference: opaqueReferenceSchema,
    request: z
      .object({
        bookingReference: opaqueReferenceSchema,
        expectedAggregateVersion: z.number().int().positive(),
        idempotencyKey: idempotencyKeySchema,
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      value.resourceScopeReference === value.request.bookingReference,
  );

export type Task04BookingCreateFingerprintInput = z.input<
  typeof bookingCreateFingerprintInputSchema
>;
export type Task04BookingConfirmFingerprintInput = z.input<
  typeof bookingConfirmFingerprintInputSchema
>;
export type Task04BookingExpireFingerprintInput = z.input<
  typeof bookingExpireFingerprintInputSchema
>;

export type Task04SupportedIdempotencyInput =
  | Task04BookingCreateFingerprintInput
  | Task04BookingConfirmFingerprintInput
  | Task04BookingExpireFingerprintInput;

export function sha256Task04Value(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isTask04PlainFingerprintValue(value: unknown): boolean {
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  ) {
    return false;
  }
  if (value === null || typeof value !== "object") {
    return true;
  }

  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        return false;
      }
      const keys = Object.keys(value);
      if (
        keys.length !== value.length ||
        keys.some((key, index) => key !== String(index))
      ) {
        return false;
      }
      return value.every(isTask04PlainFingerprintValue);
    }

    if (Object.getPrototypeOf(value) !== Object.prototype) {
      return false;
    }
    if (Object.getOwnPropertySymbols(value).length !== 0) {
      return false;
    }
    return Object.values(
      Object.getOwnPropertyDescriptors(value),
    ).every(
      (descriptor) =>
        descriptor.enumerable === true &&
        "value" in descriptor &&
        isTask04PlainFingerprintValue(descriptor.value),
    );
  } catch {
    return false;
  }
}

function parseFingerprintInput<T>(
  schema: z.ZodType<T>,
  input: T,
): T {
  if (!isTask04PlainFingerprintValue(input)) {
    throw new Error("TASK04_FINGERPRINT_INPUT_DENIED");
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error("TASK04_FINGERPRINT_INPUT_DENIED");
  }
  return parsed.data;
}

export function createTask04BookingCreateFingerprint(
  input: Task04BookingCreateFingerprintInput,
): string {
  const parsed = parseFingerprintInput(
    bookingCreateFingerprintInputSchema,
    input,
  );
  const projection = {
    actorReference: parsed.actorReference,
    operation: parsed.operation,
    resourceScopeReference: parsed.resourceScopeReference,
    safeCommandFacts: {
      accessibilityPreferences: [
        ...parsed.request.accessibilityPreferences,
      ].sort(),
      administrativeAcknowledgements: {
        administrativeOnly:
          parsed.request.administrativeAcknowledgements.administrativeOnly,
        noMedicalDetails:
          parsed.request.administrativeAcknowledgements.noMedicalDetails,
        notClinicalAssessment:
          parsed.request.administrativeAcknowledgements
            .notClinicalAssessment,
        notMonitored:
          parsed.request.administrativeAcknowledgements.notMonitored,
        statusControlsConfirmation:
          parsed.request.administrativeAcknowledgements
            .statusControlsConfirmation,
      },
      languagePreference: parsed.request.languagePreference,
      slotReference: parsed.request.slotReference,
      syntheticContactReference:
        parsed.request.syntheticContactReference,
    },
  };
  return sha256Task04Value(JSON.stringify(projection));
}

export function createTask04BookingConfirmFingerprint(
  input: Task04BookingConfirmFingerprintInput,
): string {
  const parsed = parseFingerprintInput(
    bookingConfirmFingerprintInputSchema,
    input,
  );
  const projection = {
    actorReference: parsed.actorReference,
    operation: parsed.operation,
    resourceScopeReference: parsed.resourceScopeReference,
    safeCommandFacts: {
      bookingReference: parsed.request.bookingReference,
      expectedAggregateVersion:
        parsed.request.expectedAggregateVersion,
    },
  };
  return sha256Task04Value(JSON.stringify(projection));
}

export function createTask04BookingExpireFingerprint(
  input: Task04BookingExpireFingerprintInput,
): string {
  const parsed = parseFingerprintInput(
    bookingExpireFingerprintInputSchema,
    input,
  );
  const projection = {
    actorReference: parsed.actorReference,
    operation: parsed.operation,
    resourceScopeReference: parsed.resourceScopeReference,
    safeCommandFacts: {
      bookingReference: parsed.request.bookingReference,
      expectedAggregateVersion:
        parsed.request.expectedAggregateVersion,
    },
  };
  return sha256Task04Value(JSON.stringify(projection));
}

export function createTask04SupportedCommandFingerprint(
  input: Task04SupportedIdempotencyInput,
): string {
  switch (input.operation) {
    case "booking:create":
      return createTask04BookingCreateFingerprint(input);
    case "booking:confirm":
      return createTask04BookingConfirmFingerprint(input);
    case "booking:expire":
      return createTask04BookingExpireFingerprint(input);
  }
}

export function digestTask04IdempotencyKey(key: string): string {
  return sha256Task04Value(idempotencyKeySchema.parse(key));
}

export function digestTask04ResourceScope(
  resourceScopeReference: string,
): string {
  return sha256Task04Value(
    opaqueReferenceSchema.parse(resourceScopeReference),
  );
}

export function createTask04ReceiptReference(): string {
  return `SYNTH-IDEM-${randomBytes(18).toString("base64url")}`;
}
