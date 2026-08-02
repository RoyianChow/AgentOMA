import { z } from "zod";

export const TASK04_PENDING_HOLD_MINUTES = 15 as const;
export const TASK04_PUBLIC_LOCATION_LABEL =
  "Synthetic Pharmacy Location" as const;
export const TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS = 900 as const;
export const TASK04_MAX_REQUEST_BYTES = 16_384 as const;
export const TASK04_MAX_AVAILABILITY_WINDOW_DAYS = 31 as const;
export const TASK04_SYNTHETIC_SUPPORTED_DISPLAY_TIMEZONES = [
  "America/Toronto",
] as const;

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

const approvedSyntheticConfigurationSchema = z
  .object({
    TASK04_PENDING_HOLD_MINUTES: z.literal(
      TASK04_PENDING_HOLD_MINUTES,
    ),
    TASK04_PUBLIC_LOCATION_LABEL: z.literal(
      TASK04_PUBLIC_LOCATION_LABEL,
    ),
    TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS: z.literal(
      TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS,
    ),
    TASK04_MAX_REQUEST_BYTES: z.literal(
      TASK04_MAX_REQUEST_BYTES,
    ),
    TASK04_MAX_PAGE_SIZE: positiveSafeInteger,
    TASK04_MAX_AVAILABILITY_WINDOW_DAYS: z.literal(
      TASK04_MAX_AVAILABILITY_WINDOW_DAYS,
    ),
    TASK04_SUPPORTED_DISPLAY_TIMEZONES:
      supportedDisplayTimezonesSchema.refine(
        (values) =>
          values.length ===
            TASK04_SYNTHETIC_SUPPORTED_DISPLAY_TIMEZONES.length &&
          values.every(
            (value, index) =>
              value ===
              TASK04_SYNTHETIC_SUPPORTED_DISPLAY_TIMEZONES[index],
          ),
      ),
    TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS: z
      .number()
      .int()
      .min(1)
      .max(60)
      .optional(),
  })
  .strict();

export const TASK04_REQUIRED_CONFIGURATION_KEYS = [
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
  availabilityCacheTtlSeconds?: number;
};

export function parseTask04CommandConfiguration(
  input: unknown,
): Task04CommandConfiguration {
  const parsed = approvedSyntheticConfigurationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("TASK04_COMMAND_CONFIG_DENIED");
  }

  return Object.freeze({
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
    ...(parsed.data
      .TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS === undefined
      ? {}
      : {
          availabilityCacheTtlSeconds:
            parsed.data
              .TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS,
        }),
  });
}

type Task04EnvironmentConfigurationSource = Readonly<{
  pendingHoldMinutes: number;
  publicLocationLabel: string;
  publicSlotReferenceTtlSeconds: number;
  maxRequestBytes: number;
  maxPageSize: number;
  maxAvailabilityWindowDays: number;
  supportedDisplayTimezones: readonly string[];
  availabilityCacheTtlSeconds?: number;
}>;

export function task04CommandConfigurationFromEnvironment(
  environment: Task04EnvironmentConfigurationSource,
): Task04CommandConfiguration {
  return parseTask04CommandConfiguration({
    TASK04_PENDING_HOLD_MINUTES:
      environment.pendingHoldMinutes,
    TASK04_PUBLIC_LOCATION_LABEL:
      environment.publicLocationLabel,
    TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS:
      environment.publicSlotReferenceTtlSeconds,
    TASK04_MAX_REQUEST_BYTES: environment.maxRequestBytes,
    TASK04_MAX_PAGE_SIZE: environment.maxPageSize,
    TASK04_MAX_AVAILABILITY_WINDOW_DAYS:
      environment.maxAvailabilityWindowDays,
    TASK04_SUPPORTED_DISPLAY_TIMEZONES: [
      ...environment.supportedDisplayTimezones,
    ],
    ...(environment.availabilityCacheTtlSeconds === undefined
      ? {}
      : {
          TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS:
            environment.availabilityCacheTtlSeconds,
        }),
  });
}
