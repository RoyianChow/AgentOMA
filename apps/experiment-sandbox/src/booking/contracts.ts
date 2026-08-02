import { z } from "zod";

export const APPOINTMENT_MODALITIES = [
  "in_person",
  "telephone",
  "video",
] as const;
export const LANGUAGE_PREFERENCES = [
  "no_preference",
  "english",
  "french",
  "interpretation_coordination_requested",
] as const;
export const ACCESSIBILITY_PREFERENCES = [
  "none",
  "mobility_preparation",
  "hearing_preparation",
  "vision_preparation",
  "communication_preparation",
  "contact_about_accommodation",
] as const;
export const SYNTHETIC_ACTOR_TYPES = [
  "synthetic_patient",
  "synthetic_delegate",
  "synthetic_staff",
  "synthetic_system_worker",
] as const;
export const SYNTHETIC_SUBJECT_TYPES = ["synthetic_patient"] as const;
export const BOOKING_STATES = [
  "pending_confirmation",
  "confirmed",
  "cancelled",
  "rescheduled",
  "expired",
] as const;
export const MANAGEMENT_ACTIONS = [
  "booking:view",
  "booking:cancel",
  "booking:reschedule",
  "waitlist:view",
  "waitlist:leave",
  "waitlist:offer:accept",
  "waitlist:offer:decline",
  "management:recover",
] as const;

export const opaqueReferenceSchema = z
  .string()
  .min(16)
  .max(160)
  .regex(/^[A-Za-z0-9_-]+$/);
export const idempotencyKeySchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
export const syntheticContactReferenceSchema = z
  .string()
  .min(16)
  .max(96)
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^SYNTH-CONTACT-[A-Z0-9_-]+$/));
export const utcInstantSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  )
  .refine((value) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
  });
export const sandboxPharmacyIdSchema = z
  .string()
  .min(16)
  .max(96)
  .regex(/^SYNTH-PHARMACY-[A-Z0-9_-]+$/);

export function task04IanaTimezoneIsValid(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value }).format(
      new Date(0),
    );
    return true;
  } catch {
    return false;
  }
}

export const syntheticActorTypeSchema = z.enum(SYNTHETIC_ACTOR_TYPES);
export const syntheticSubjectTypeSchema = z.enum(SYNTHETIC_SUBJECT_TYPES);
export const appointmentModalitySchema = z.enum(APPOINTMENT_MODALITIES);
export const languagePreferenceSchema = z.enum(LANGUAGE_PREFERENCES);
export const bookingStateSchema = z.enum(BOOKING_STATES);
export const managementActionSchema = z.enum(MANAGEMENT_ACTIONS);

export const administrativeAcknowledgementsSchema = z
  .object({
    administrativeOnly: z.literal(true),
    notMonitored: z.literal(true),
    noMedicalDetails: z.literal(true),
    notClinicalAssessment: z.literal(true),
    statusControlsConfirmation: z.literal(true),
  })
  .strict();

export const managementAuthorizationSchema = z.discriminatedUnion("channel", [
  z
    .object({
      channel: z.literal("server_session_bound"),
      capabilityReference: opaqueReferenceSchema,
    })
    .strict(),
  z
    .object({
      channel: z.literal("presented_credential"),
      credential: z
        .string()
        .min(32)
        .max(256)
        .regex(/^[A-Za-z0-9_-]+$/),
    })
    .strict(),
]);

export type Task04BookingContractLimits = {
  maxAccessibilitySelections: number;
  supportedDisplayTimezones: readonly string[];
};

function accessibilityPreferencesSchema(maximum: number) {
  return z
    .array(z.enum(ACCESSIBILITY_PREFERENCES))
    .min(1)
    .max(maximum)
    .superRefine((values, context) => {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_ACCESSIBILITY_SELECTIONS",
        });
      }
      if (values.includes("none") && values.length !== 1) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_ACCESSIBILITY_SELECTIONS",
        });
      }
    });
}

export function createTask04BookingSchemas(
  limits: Task04BookingContractLimits,
) {
  const supportedDisplayTimezones = [
    ...limits.supportedDisplayTimezones,
  ];
  if (
    !Number.isSafeInteger(limits.maxAccessibilitySelections) ||
    limits.maxAccessibilitySelections <= 0 ||
    supportedDisplayTimezones.length === 0 ||
    new Set(supportedDisplayTimezones).size !==
      supportedDisplayTimezones.length ||
    supportedDisplayTimezones.some(
      (timezone) =>
        timezone.length === 0 ||
        timezone.length > 64 ||
        !task04IanaTimezoneIsValid(timezone),
    )
  ) {
    throw new Error("TASK04_BOOKING_SCHEMA_CONFIG_DENIED");
  }
  const supportedDisplayTimezoneSchema = z
    .string()
    .min(1)
    .max(64)
    .refine(task04IanaTimezoneIsValid)
    .refine((value) => supportedDisplayTimezones.includes(value));

  const managementCapabilitySummarySchema = z
    .object({
      capabilityReference: opaqueReferenceSchema,
      usageMode: z.literal("reusable"),
      permittedActions: z
        .array(managementActionSchema)
        .min(1)
        .max(8)
        .refine((values) => new Set(values).size === values.length),
      expiresAtUtc: utcInstantSchema,
    })
    .strict();

  const bookingCreateRequestSchema = z
    .object({
      slotReference: opaqueReferenceSchema,
      languagePreference: languagePreferenceSchema,
      accessibilityPreferences: accessibilityPreferencesSchema(
        limits.maxAccessibilitySelections,
      ),
      syntheticContactReference: syntheticContactReferenceSchema,
      administrativeAcknowledgements:
        administrativeAcknowledgementsSchema,
      idempotencyKey: idempotencyKeySchema,
    })
    .strict();

  const bookingCreateResponseDataSchema = z
    .object({
      bookingReference: opaqueReferenceSchema,
      status: z.enum(["pending_confirmation", "confirmed"]),
      serviceCategoryLabel: z.string().min(1).max(80),
      modality: appointmentModalitySchema,
      startTimeUtc: utcInstantSchema,
      endTimeUtc: utcInstantSchema,
      displayTimezone: supportedDisplayTimezoneSchema,
      confirmationExpiresAtUtc: utcInstantSchema.optional(),
      managementCapability: managementCapabilitySummarySchema,
      syntheticNotice: z.literal(
        "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
      ),
    })
    .strict()
    .superRefine((value, context) => {
      const hasExpiry = value.confirmationExpiresAtUtc !== undefined;
      if (
        (value.status === "pending_confirmation" && !hasExpiry) ||
        (value.status === "confirmed" && hasExpiry)
      ) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_BOOKING_RESPONSE",
        });
      }
      if (
        new Date(value.endTimeUtc).getTime() <=
        new Date(value.startTimeUtc).getTime()
      ) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_BOOKING_RESPONSE",
        });
      }
    });

  const bookingRetrieveRequestSchema = z
    .object({
      bookingReference: opaqueReferenceSchema,
      managementAuthorization: managementAuthorizationSchema,
    })
    .strict();

  const allowedBookingActionsSchema = z
    .array(z.enum(["booking:cancel", "booking:reschedule", "none"]))
    .min(1)
    .max(2)
    .refine((values) => new Set(values).size === values.length)
    .refine(
      (values) => !values.includes("none") || values.length === 1,
    );

  const bookingRetrieveResponseDataSchema = z
    .object({
      bookingReference: opaqueReferenceSchema,
      status: bookingStateSchema,
      serviceCategoryLabel: z.string().min(1).max(80),
      modality: appointmentModalitySchema,
      startTimeUtc: utcInstantSchema,
      endTimeUtc: utcInstantSchema,
      displayTimezone: supportedDisplayTimezoneSchema,
      allowedActions: allowedBookingActionsSchema,
      syntheticNotice: z.literal(
        "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
      ),
    })
    .strict();

  const bookingConfirmRequestSchema = z
    .object({
      bookingReference: opaqueReferenceSchema,
      expectedAggregateVersion: z.number().int().positive(),
      idempotencyKey: idempotencyKeySchema,
    })
    .strict();

  const bookingConfirmResponseDataSchema = z
    .object({
      bookingReference: opaqueReferenceSchema,
      status: z.literal("confirmed"),
      holdStatus: z.literal("consumed"),
    })
    .strict();

  const bookingCreateResponseSchema = z
    .object({
      success: z.literal(true),
      data: bookingCreateResponseDataSchema,
      receiptId: opaqueReferenceSchema,
    })
    .strict();
  const bookingRetrieveResponseSchema = z
    .object({
      success: z.literal(true),
      data: bookingRetrieveResponseDataSchema,
    })
    .strict();
  const bookingConfirmResponseSchema = z
    .object({
      success: z.literal(true),
      data: bookingConfirmResponseDataSchema,
      receiptId: opaqueReferenceSchema,
    })
    .strict();

  return {
    bookingCreateRequestSchema,
    bookingCreateResponseDataSchema,
    bookingCreateResponseSchema,
    bookingRetrieveRequestSchema,
    bookingRetrieveResponseDataSchema,
    bookingRetrieveResponseSchema,
    bookingConfirmRequestSchema,
    bookingConfirmResponseDataSchema,
    bookingConfirmResponseSchema,
    managementCapabilitySummarySchema,
  };
}

export type Task04BookingSchemas = ReturnType<
  typeof createTask04BookingSchemas
>;
export type Task04BookingCreateRequest = z.infer<
  Task04BookingSchemas["bookingCreateRequestSchema"]
>;
export type Task04BookingConfirmRequest = z.infer<
  Task04BookingSchemas["bookingConfirmRequestSchema"]
>;
export type Task04BookingCreateResponseData = z.infer<
  Task04BookingSchemas["bookingCreateResponseDataSchema"]
>;
export type Task04BookingConfirmResponseData = z.infer<
  Task04BookingSchemas["bookingConfirmResponseDataSchema"]
>;

export function parseTask04Request<T>(
  schema: z.ZodType<T>,
  input: unknown,
): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error("TASK04_INVALID_REQUEST");
  }
  return parsed.data;
}
