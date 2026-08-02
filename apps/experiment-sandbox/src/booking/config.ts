import { z } from "zod";

const positiveSafeInteger = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

const supportedDisplayTimezonesSchema = z
  .array(z.string().min(1).max(64))
  .min(1)
  .max(16)
  .refine((values) => new Set(values).size === values.length);

const unresolvedSyntheticConfigurationSchema = z
  .object({
    TASK04_PENDING_HOLD_MINUTES: positiveSafeInteger,
    TASK04_PUBLIC_LOCATION_LABEL: z.string().min(1).max(80),
    TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS: positiveSafeInteger,
    TASK04_MAX_REQUEST_BYTES: positiveSafeInteger,
    TASK04_MAX_PAGE_SIZE: positiveSafeInteger,
    TASK04_MAX_AVAILABILITY_WINDOW_DAYS: positiveSafeInteger,
    TASK04_SUPPORTED_DISPLAY_TIMEZONES:
      supportedDisplayTimezonesSchema,
  })
  .strict();

export const TASK04_UNRESOLVED_CONFIGURATION_KEYS = [
  "TASK04_PENDING_HOLD_MINUTES",
  "TASK04_PUBLIC_LOCATION_LABEL",
  "TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS",
  "TASK04_MAX_REQUEST_BYTES",
  "TASK04_MAX_PAGE_SIZE",
  "TASK04_MAX_AVAILABILITY_WINDOW_DAYS",
  "TASK04_SUPPORTED_DISPLAY_TIMEZONES",
] as const;

export type Task04CommandConfiguration = {
  pendingHoldMinutes: number;
  publicLocationLabel: string;
  publicSlotReferenceTtlSeconds: number;
  maxRequestBytes: number;
  maxPageSize: number;
  maxAvailabilityWindowDays: number;
  supportedDisplayTimezones: readonly string[];
};

export function parseTask04CommandConfiguration(
  input: unknown,
): Task04CommandConfiguration {
  const parsed = unresolvedSyntheticConfigurationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("TASK04_COMMAND_CONFIG_DENIED");
  }

  return {
    pendingHoldMinutes: parsed.data.TASK04_PENDING_HOLD_MINUTES,
    publicLocationLabel: parsed.data.TASK04_PUBLIC_LOCATION_LABEL,
    publicSlotReferenceTtlSeconds:
      parsed.data.TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS,
    maxRequestBytes: parsed.data.TASK04_MAX_REQUEST_BYTES,
    maxPageSize: parsed.data.TASK04_MAX_PAGE_SIZE,
    maxAvailabilityWindowDays:
      parsed.data.TASK04_MAX_AVAILABILITY_WINDOW_DAYS,
    supportedDisplayTimezones:
      parsed.data.TASK04_SUPPORTED_DISPLAY_TIMEZONES,
  };
}
