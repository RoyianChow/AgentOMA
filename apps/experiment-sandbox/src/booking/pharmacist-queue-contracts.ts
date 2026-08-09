import { z } from "zod";

import { task04CalendarDateSchema } from "./availability-contracts";
import {
  ACCESSIBILITY_PREFERENCES,
  appointmentModalitySchema,
  languagePreferenceSchema,
  opaqueReferenceSchema,
  task04IanaTimezoneIsValid,
  utcInstantSchema,
} from "./contracts";

export const TASK04_PHARMACIST_QUEUE_STATUSES = [
  "pending_confirmation",
  "confirmed",
  "rescheduled",
] as const;
export const TASK04_PHARMACIST_QUEUE_SORTS = [
  "start_time_asc",
  "created_at_asc",
] as const;

const task04PharmacistQueueStatusSchema = z.enum(
  TASK04_PHARMACIST_QUEUE_STATUSES,
);
const task04PharmacistQueueSortSchema = z.enum(
  TASK04_PHARMACIST_QUEUE_SORTS,
);
const task04PharmacistQueueCursorSchema = z
  .string()
  .min(16)
  .max(320)
  .regex(/^[A-Za-z0-9_-]+$/);

export type Task04PharmacistQueueContractLimits = Readonly<{
  maxAccessibilitySelections: number;
  maxAvailabilityWindowDays: number;
  maxPageSize: number;
  supportedDisplayTimezones: readonly string[];
}>;

function calendarDayNumber(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Math.trunc(Date.UTC(year!, month! - 1, day!) / 86_400_000);
}

export function createTask04PharmacistQueueSchemas(
  limits: Task04PharmacistQueueContractLimits,
) {
  const supportedDisplayTimezones = [
    ...limits.supportedDisplayTimezones,
  ];
  if (
    !Number.isSafeInteger(limits.maxAccessibilitySelections) ||
    limits.maxAccessibilitySelections <= 0 ||
    !Number.isSafeInteger(limits.maxAvailabilityWindowDays) ||
    limits.maxAvailabilityWindowDays <= 0 ||
    !Number.isSafeInteger(limits.maxPageSize) ||
    limits.maxPageSize <= 0 ||
    supportedDisplayTimezones.length === 0 ||
    new Set(supportedDisplayTimezones).size !==
      supportedDisplayTimezones.length ||
    supportedDisplayTimezones.some(
      (timezone) =>
        timezone.length > 64 ||
        !task04IanaTimezoneIsValid(timezone),
    )
  ) {
    throw new Error("TASK04_QUEUE_SCHEMA_CONFIG_DENIED");
  }

  const supportedDisplayTimezoneSchema = z
    .string()
    .min(1)
    .max(64)
    .refine(task04IanaTimezoneIsValid)
    .refine((timezone) =>
      supportedDisplayTimezones.includes(timezone),
    );
  const accessibilityPreferencesSchema = z
    .array(z.enum(ACCESSIBILITY_PREFERENCES))
    .min(1)
    .max(limits.maxAccessibilitySelections)
    .superRefine((values, context) => {
      if (
        new Set(values).size !== values.length ||
        (values.includes("none") && values.length !== 1)
      ) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_ACCESSIBILITY_SELECTIONS",
        });
      }
    });

  const pharmacistQueueRequestSchema = z
    .object({
      status: z
        .array(task04PharmacistQueueStatusSchema)
        .min(1)
        .max(TASK04_PHARMACIST_QUEUE_STATUSES.length)
        .refine(
          (values) => new Set(values).size === values.length,
        )
        .optional(),
      serviceCategoryRef: opaqueReferenceSchema.optional(),
      modality: appointmentModalitySchema.optional(),
      startDate: task04CalendarDateSchema.optional(),
      endDate: task04CalendarDateSchema.optional(),
      sort: task04PharmacistQueueSortSchema
        .default("start_time_asc"),
      cursor: task04PharmacistQueueCursorSchema.optional(),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(limits.maxPageSize)
        .optional(),
    })
    .strict()
    .superRefine((request, context) => {
      const hasStart = request.startDate !== undefined;
      const hasEnd = request.endDate !== undefined;
      if (hasStart !== hasEnd) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_QUEUE_RANGE",
        });
        return;
      }
      if (
        request.startDate !== undefined &&
        request.endDate !== undefined
      ) {
        const startDay = calendarDayNumber(request.startDate);
        const endDay = calendarDayNumber(request.endDate);
        if (
          endDay < startDay ||
          endDay - startDay + 1 >
            limits.maxAvailabilityWindowDays
        ) {
          context.addIssue({
            code: "custom",
            message: "TASK04_INVALID_QUEUE_RANGE",
          });
        }
      }
    });

  const pharmacistQueueItemSchema = z
    .object({
      queueItemReference: opaqueReferenceSchema,
      appointmentStartUtc: utcInstantSchema,
      appointmentEndUtc: utcInstantSchema,
      displayTimezone: supportedDisplayTimezoneSchema,
      serviceCategoryLabel: z.string().min(1).max(80),
      modality: appointmentModalitySchema,
      administrativeStatus:
        task04PharmacistQueueStatusSchema,
      languagePreference: languagePreferenceSchema,
      accessibilityPreferences:
        accessibilityPreferencesSchema,
      source: z.enum(["booking", "waitlist_promotion"]),
      createdAtUtc: utcInstantSchema,
      operationalReason: z.enum([
        "confirmation_required",
        "appointment_upcoming",
        "recently_rescheduled",
      ]),
      actionAvailability: z.enum([
        "permitted",
        "not_permitted",
        "temporarily_blocked",
      ]),
    })
    .strict()
    .superRefine((item, context) => {
      if (
        Date.parse(item.appointmentEndUtc) <=
        Date.parse(item.appointmentStartUtc)
      ) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_QUEUE_ITEM",
        });
      }
      const expectedReason =
        item.administrativeStatus === "pending_confirmation"
          ? "confirmation_required"
          : item.administrativeStatus === "confirmed"
            ? "appointment_upcoming"
            : "recently_rescheduled";
      if (item.operationalReason !== expectedReason) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_QUEUE_ITEM",
        });
      }
    });

  const pharmacistQueueResponseDataSchema = z
    .object({
      items: z
        .array(pharmacistQueueItemSchema)
        .max(limits.maxPageSize),
      nextCursor: task04PharmacistQueueCursorSchema.optional(),
      resultCompleteness: z.enum(["complete", "partial"]),
      unavailableSourceCategories: z
        .array(
          z.enum([
            "booking_projection",
            "waitlist_promotion_projection",
          ]),
        )
        .max(2)
        .refine(
          (values) => new Set(values).size === values.length,
        ),
      freshnessState: z.enum(["fresh", "stale"]),
      generatedAtUtc: utcInstantSchema,
      refreshGuidance: z.enum([
        "none",
        "refresh_available",
        "retry_later",
        "reauthenticate",
      ]),
    })
    .strict()
    .superRefine((response, context) => {
      const unavailableCount =
        response.unavailableSourceCategories.length;
      if (
        (response.resultCompleteness === "complete" &&
          unavailableCount !== 0) ||
        (response.resultCompleteness === "partial" &&
          unavailableCount === 0) ||
        (response.freshnessState === "fresh" &&
          response.resultCompleteness === "complete" &&
          response.refreshGuidance !== "none") ||
        ((response.freshnessState === "stale" ||
          response.resultCompleteness === "partial") &&
          response.refreshGuidance === "none")
      ) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_QUEUE_RESPONSE",
        });
      }
    });

  const pharmacistQueueResponseSchema = z
    .object({
      success: z.literal(true),
      data: pharmacistQueueResponseDataSchema,
    })
    .strict();

  return Object.freeze({
    pharmacistQueueRequestSchema,
    pharmacistQueueItemSchema,
    pharmacistQueueResponseDataSchema,
    pharmacistQueueResponseSchema,
  });
}

export type Task04PharmacistQueueSchemas = ReturnType<
  typeof createTask04PharmacistQueueSchemas
>;
export type Task04PharmacistQueueRequest = z.infer<
  Task04PharmacistQueueSchemas["pharmacistQueueRequestSchema"]
>;
export type Task04PharmacistQueueItem = z.infer<
  Task04PharmacistQueueSchemas["pharmacistQueueItemSchema"]
>;
export type Task04PharmacistQueueResponseData = z.infer<
  Task04PharmacistQueueSchemas["pharmacistQueueResponseDataSchema"]
>;
