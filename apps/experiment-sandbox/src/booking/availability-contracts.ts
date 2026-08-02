import { z } from "zod";

import {
  appointmentModalitySchema,
  opaqueReferenceSchema,
  task04IanaTimezoneIsValid,
  utcInstantSchema,
} from "./contracts";

export const TASK04_AVAILABILITY_PROJECTION_VERSION =
  "TASK04_PUBLIC_AVAILABILITY_V1" as const;

export const task04CoarseAvailabilityStateSchema = z.enum([
  "available",
  "limited",
  "waitlist_only",
  "unavailable",
]);

export const task04CalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [yearText, monthText, dayText] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isSafeInteger(year) &&
      year >= 1 &&
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  });

const task04CursorSchema = z
  .string()
  .min(16)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);

export type Task04AvailabilityContractLimits = Readonly<{
  maxPageSize: number;
  maxAvailabilityWindowDays: number;
  publicLocationLabel: string;
  supportedDisplayTimezones: readonly string[];
}>;

function calendarDayNumber(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Math.trunc(Date.UTC(year!, month! - 1, day!) / 86_400_000);
}

export function createTask04AvailabilitySchemas(
  limits: Task04AvailabilityContractLimits,
) {
  const supportedDisplayTimezones = [
    ...limits.supportedDisplayTimezones,
  ];
  if (
    !Number.isSafeInteger(limits.maxPageSize) ||
    limits.maxPageSize <= 0 ||
    !Number.isSafeInteger(limits.maxAvailabilityWindowDays) ||
    limits.maxAvailabilityWindowDays <= 0 ||
    limits.publicLocationLabel.length === 0 ||
    limits.publicLocationLabel.length > 80 ||
    supportedDisplayTimezones.length === 0 ||
    new Set(supportedDisplayTimezones).size !==
      supportedDisplayTimezones.length ||
    supportedDisplayTimezones.some(
      (timezone) =>
        timezone.length > 64 ||
        !task04IanaTimezoneIsValid(timezone),
    )
  ) {
    throw new Error("TASK04_AVAILABILITY_SCHEMA_CONFIG_DENIED");
  }

  const supportedTimezoneSchema = z
    .string()
    .min(1)
    .max(64)
    .refine(task04IanaTimezoneIsValid)
    .refine((timezone) =>
      supportedDisplayTimezones.includes(timezone),
    );

  const availabilityRequestSchema = z
    .object({
      serviceCategoryRef: opaqueReferenceSchema.optional(),
      modality: appointmentModalitySchema.optional(),
      startDate: task04CalendarDateSchema,
      endDate: task04CalendarDateSchema,
      timezone: supportedTimezoneSchema,
      cursor: task04CursorSchema.optional(),
      pageSize: z.number().int().min(1).max(limits.maxPageSize).optional(),
    })
    .strict()
    .superRefine((request, context) => {
      const startDay = calendarDayNumber(request.startDate);
      const endDay = calendarDayNumber(request.endDate);
      if (
        endDay < startDay ||
        endDay - startDay + 1 >
          limits.maxAvailabilityWindowDays
      ) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_AVAILABILITY_RANGE",
        });
      }
    });

  const availabilityItemSchema = z
    .object({
      serviceCategoryRef: opaqueReferenceSchema,
      serviceCategoryLabel: z.string().min(1).max(80),
      modality: appointmentModalitySchema,
      publicLocationLabel: z
        .literal(limits.publicLocationLabel)
        .optional(),
      startTimeUtc: utcInstantSchema,
      endTimeUtc: utcInstantSchema,
      displayTimezone: supportedTimezoneSchema,
      availabilityState: task04CoarseAvailabilityStateSchema,
      slotReference: opaqueReferenceSchema.optional(),
      slotReferenceExpiresAtUtc: utcInstantSchema.optional(),
    })
    .strict()
    .superRefine((item, context) => {
      if (
        Date.parse(item.endTimeUtc) <= Date.parse(item.startTimeUtc)
      ) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_AVAILABILITY_ITEM",
        });
      }
      const requiresLocation = item.modality === "in_person";
      if (
        requiresLocation !==
        (item.publicLocationLabel !== undefined)
      ) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_AVAILABILITY_ITEM",
        });
      }
      const requiresReference =
        item.availabilityState === "available" ||
        item.availabilityState === "limited";
      if (
        requiresReference !== (item.slotReference !== undefined) ||
        requiresReference !==
          (item.slotReferenceExpiresAtUtc !== undefined)
      ) {
        context.addIssue({
          code: "custom",
          message: "TASK04_INVALID_AVAILABILITY_ITEM",
        });
      }
    });

  const availabilityResponseDataSchema = z
    .object({
      items: z.array(availabilityItemSchema).max(limits.maxPageSize),
      nextCursor: task04CursorSchema.optional(),
    })
    .strict();

  const availabilityResponseSchema = z
    .object({
      success: z.literal(true),
      data: availabilityResponseDataSchema,
    })
    .strict();

  return Object.freeze({
    availabilityRequestSchema,
    availabilityItemSchema,
    availabilityResponseDataSchema,
    availabilityResponseSchema,
  });
}

export type Task04AvailabilityRequest = z.infer<
  ReturnType<
    typeof createTask04AvailabilitySchemas
  >["availabilityRequestSchema"]
>;

export type Task04AvailabilityItem = z.infer<
  ReturnType<
    typeof createTask04AvailabilitySchemas
  >["availabilityItemSchema"]
>;

export type Task04AvailabilityResponseData = z.infer<
  ReturnType<
    typeof createTask04AvailabilitySchemas
  >["availabilityResponseDataSchema"]
>;

export function sortTask04AvailabilityItems(
  items: readonly Task04AvailabilityItem[],
): Task04AvailabilityItem[] {
  return [...items].sort(
    (left, right) =>
      left.startTimeUtc.localeCompare(right.startTimeUtc) ||
      left.endTimeUtc.localeCompare(right.endTimeUtc) ||
      left.serviceCategoryRef.localeCompare(
        right.serviceCategoryRef,
      ) ||
      left.modality.localeCompare(right.modality),
  );
}
