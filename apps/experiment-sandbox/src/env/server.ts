import { z } from "zod";

import {
  TASK04_MAX_AVAILABILITY_WINDOW_DAYS,
  TASK04_MAX_REQUEST_BYTES,
  TASK04_PENDING_HOLD_MINUTES,
  TASK04_PUBLIC_LOCATION_LABEL,
  TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS,
  TASK04_SYNTHETIC_SUPPORTED_DISPLAY_TIMEZONES,
} from "../booking/config.ts";

export {
  TASK04_MAX_AVAILABILITY_WINDOW_DAYS,
  TASK04_MAX_REQUEST_BYTES,
  TASK04_PENDING_HOLD_MINUTES,
  TASK04_PUBLIC_LOCATION_LABEL,
  TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS,
  TASK04_SYNTHETIC_SUPPORTED_DISPLAY_TIMEZONES,
} from "../booking/config.ts";

export const SANDBOX_G1_DECISION_ID = "G1-2026-07-31-task-01" as const;
export const SANDBOX_ORIGIN = "http://127.0.0.1:3101" as const;
export const TASK04_APPROVAL_DECISION_VERSION =
  "Task 04 synthetic sandbox scope v1" as const;
export const TASK04_APPROVED_THROUGH_DATE_UTC = "2026-08-05" as const;
export const TASK04_SANDBOX_BUILT_AT = "2026-08-01T00:00:00.000Z" as const;
export const TASK04_SANDBOX_EXPIRES_AT = "2026-08-05T23:59:59.999Z" as const;
export const TASK04_SANDBOX_PHARMACY_ID =
  "SYNTH-PHARMACY-TASK04-LOCAL" as const;
export const TASK04_SANDBOX_POSTGRES_URL =
  "postgresql://task04_synthetic_runtime:task04_synthetic_runtime_password@127.0.0.1:55404/task04_synthetic_db" as const;
export const TASK04_SANDBOX_OWNER_POSTGRES_URL =
  "postgresql://task04_synthetic_owner:task04_synthetic_owner_password@127.0.0.1:55404/task04_synthetic_db" as const;
export const TASK04_DEFAULT_MAX_SLOT_CAPACITY = 2 as const;
export const TASK04_DEFAULT_MAX_ACCESSIBILITY_SELECTIONS = 3 as const;
export const TASK04_DEFAULT_MAX_PAGE_SIZE = 10 as const;
const TASK04_SYNTHETIC_TEST_PUBLIC_SLOT_REFERENCE_SECRET =
  "SYNTHETIC_TASK04_TEST_SLOT_REFERENCE_SECRET_2026_08_02";
const MAX_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

const requiredSchema = z.object({
  SANDBOX_MODE: z.literal("synthetic"),
  SANDBOX_BUILT_AT: z.string().datetime({ offset: true }),
  SANDBOX_EXPIRES_AT: z.string().datetime({ offset: true }),
  SANDBOX_INSTANCE_ID: z
    .string()
    .regex(/^SYNTH-[A-Z0-9-]{3,64}$/, "must use the SYNTH- prefix"),
  SANDBOX_ORIGIN: z.literal(SANDBOX_ORIGIN),
  SANDBOX_G1_DECISION_ID: z.literal(SANDBOX_G1_DECISION_ID),
  SANDBOX_DISABLED: z.enum(["true", "false"]),
});

export const sandboxPharmacyIdSchema = z
  .string()
  .min(16)
  .max(96)
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^SYNTH-PHARMACY-[A-Z0-9_-]+$/))
  .brand<"SandboxPharmacyId">();

export type SandboxPharmacyId = z.infer<typeof sandboxPharmacyIdSchema>;

function positiveIntegerSetting() {
  return z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .refine(Number.isSafeInteger);
}

export const task04PublicSlotReferenceSecretSchema = z
  .string()
  .min(32)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

const task04RequiredSchema = z.object({
  TASK04_APPROVAL_DECISION_VERSION: z.literal(
    TASK04_APPROVAL_DECISION_VERSION,
  ),
  TASK04_SANDBOX_PHARMACY_ID: sandboxPharmacyIdSchema,
  TASK04_SANDBOX_POSTGRES_URL: z.literal(TASK04_SANDBOX_POSTGRES_URL),
  TASK04_MAX_SLOT_CAPACITY: positiveIntegerSetting(),
  TASK04_MAX_ACCESSIBILITY_SELECTIONS: positiveIntegerSetting(),
  TASK04_MAX_PAGE_SIZE: positiveIntegerSetting(),
  TASK04_PENDING_HOLD_MINUTES: z
    .literal(String(TASK04_PENDING_HOLD_MINUTES))
    .transform(Number),
  TASK04_PUBLIC_LOCATION_LABEL: z.literal(
    TASK04_PUBLIC_LOCATION_LABEL,
  ),
  TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS: z
    .literal(String(TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS))
    .transform(Number),
  TASK04_MAX_REQUEST_BYTES: z
    .literal(String(TASK04_MAX_REQUEST_BYTES))
    .transform(Number),
  TASK04_MAX_AVAILABILITY_WINDOW_DAYS: z
    .literal(String(TASK04_MAX_AVAILABILITY_WINDOW_DAYS))
    .transform(Number),
  TASK04_PUBLIC_SLOT_REFERENCE_SECRET:
    task04PublicSlotReferenceSecretSchema,
  TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .refine((value) => Number.isSafeInteger(value) && value <= 60)
    .optional(),
});

const TASK04_ALLOWED_ENVIRONMENT_KEYS = new Set([
  "TASK04_APPROVAL_DECISION_VERSION",
  "TASK04_SANDBOX_PHARMACY_ID",
  "TASK04_SANDBOX_POSTGRES_URL",
  "TASK04_MAX_SLOT_CAPACITY",
  "TASK04_MAX_ACCESSIBILITY_SELECTIONS",
  "TASK04_MAX_PAGE_SIZE",
  "TASK04_PENDING_HOLD_MINUTES",
  "TASK04_PUBLIC_LOCATION_LABEL",
  "TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS",
  "TASK04_MAX_REQUEST_BYTES",
  "TASK04_MAX_AVAILABILITY_WINDOW_DAYS",
  "TASK04_PUBLIC_SLOT_REFERENCE_SECRET",
  "TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS",
]);

const PROHIBITED_EXACT_ENVIRONMENT_KEYS = new Set([
  "PHARMACY_ID",
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_URL",
  "SUPABASE_DB_URL",
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
  "NEXT_PUBLIC_APP_URL",
  "SKIP_ENV_VALIDATION",
]);

const PROHIBITED_ENVIRONMENT_MARKERS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "BETTER_AUTH",
  "BOOTSTRAP_ADMIN",
  "SUPABASE",
  "FIREBASE",
  "GOOGLE_APPLICATION",
  "SERVICE_ROLE",
  "PRIVATE_KEY",
  "AWS_",
  "GCP_",
  "SMTP",
  "SENDGRID",
  "TWILIO",
  "STRIPE",
  "PAYMENT",
  "COURIER",
  "CALENDAR",
  "VIDEO",
  "FHIR",
  "HNS",
  "ODB",
  "CLINICAL_VIEWER",
  "MODEL",
  "OPENAI",
  "ANTHROPIC",
  "SENTRY",
  "POSTHOG",
  "SEGMENT",
  "MIXPANEL",
  "ANALYTICS",
  "TELEMETRY",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
  "PROXY",
  "ENDPOINT",
] as const;
const PROHIBITED_AZURE_VARIABLES = new Set([
  "AZURE_API_KEY",
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "AZURE_FEDERATED_TOKEN_FILE",
  "AZURE_OPENAI_API_KEY",
  "AZURE_STORAGE_ACCOUNT_KEY",
  "AZURE_STORAGE_CONNECTION_STRING",
  "AZURE_SUBSCRIPTION_ID",
  "AZURE_TENANT_ID",
]);

function isProhibitedEnvironmentKey(key: string): boolean {
  const normalizedKey = key.toUpperCase();
  if (TASK04_ALLOWED_ENVIRONMENT_KEYS.has(normalizedKey)) return false;
  return (
    PROHIBITED_EXACT_ENVIRONMENT_KEYS.has(normalizedKey) ||
    PROHIBITED_ENVIRONMENT_MARKERS.some((marker) => normalizedKey.includes(marker)) ||
    PROHIBITED_AZURE_VARIABLES.has(normalizedKey)
  );
}

export type SandboxPhase = "build" | "startup" | "test";

type SandboxParseOptions = {
  phase?: SandboxPhase;
  allowExpired?: boolean;
};

export type SandboxEnv = {
  mode: "synthetic";
  builtAt: Date;
  expiresAt: Date;
  instanceId: string;
  origin: typeof SANDBOX_ORIGIN;
  g1DecisionId: typeof SANDBOX_G1_DECISION_ID;
  disabled: boolean;
};

export type Task04SandboxEnv = SandboxEnv & {
  approvalDecisionVersion: typeof TASK04_APPROVAL_DECISION_VERSION;
  pharmacyId: SandboxPharmacyId;
  postgresUrl: typeof TASK04_SANDBOX_POSTGRES_URL;
  maxSlotCapacity: number;
  maxAccessibilitySelections: number;
  maxPageSize: number;
  pendingHoldMinutes: number;
  publicLocationLabel: string;
  publicSlotReferenceTtlSeconds: number;
  maxRequestBytes: number;
  maxAvailabilityWindowDays: number;
  supportedDisplayTimezones:
    typeof TASK04_SYNTHETIC_SUPPORTED_DISPLAY_TIMEZONES;
  publicSlotReferenceSecret: string;
  availabilityCacheTtlSeconds?: number;
};

function createSandboxConfigDeniedError(reason: string): Error {
  return new Error(`SANDBOX_CONFIG_DENIED:${reason}`);
}

function isLocalPath(value: string): boolean {
  if (value.length === 0 || value.includes("\0")) return false;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return false;
  return value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value);
}

function assertEnvironmentIsAllowed(
  input: Record<string, string | undefined>,
  phase?: SandboxPhase,
): void {
  const isNextProductionBuild =
    phase === "build" ||
    input.NEXT_PHASE === "phase-production-build";
  for (const [key, value] of Object.entries(input)) {
    // npm adds npm_config_* launcher metadata to script children. It is not
    // forwarded by sandboxChildEnvironment and never configures the app.
    if (/^npm_config_/i.test(key)) continue;
    // Next.js sets NODE_ENV=production while compiling. That framework mode
    // does not grant production deployment authority: only the trusted build
    // call path may accept it, and every synthetic/lifecycle/credential check
    // below still applies. Startup, tests, and unknown callers fail closed.
    if (
      key.toUpperCase() === "NODE_ENV" &&
      value === "production" &&
      !isNextProductionBuild
    ) {
      throw createSandboxConfigDeniedError("PRODUCTION_NODE_ENV");
    }
    if (key.toUpperCase() === "AZURE_EXTENSION_DIR") {
      if (value !== undefined && !isLocalPath(value)) {
        throw createSandboxConfigDeniedError("INVALID_LOCAL_PATH:AZURE_EXTENSION_DIR");
      }
      continue;
    }
    if (
      value !== undefined &&
      isProhibitedEnvironmentKey(key)
    ) {
      throw createSandboxConfigDeniedError(`PROHIBITED_VARIABLE:${key}`);
    }
  }
}

function assertDateWindow(
  builtAt: Date,
  expiresAt: Date,
  now: Date,
  allowExpired: boolean,
): void {
  if (!Number.isFinite(builtAt.getTime()) || !Number.isFinite(expiresAt.getTime())) {
    throw createSandboxConfigDeniedError("INVALID_TIMESTAMP");
  }
  if (expiresAt <= builtAt) throw createSandboxConfigDeniedError("EXPIRY_NOT_AFTER_BUILD");
  if (expiresAt.getTime() - builtAt.getTime() > MAX_LIFETIME_MS) {
    throw createSandboxConfigDeniedError("EXPIRY_OVER_30_DAYS");
  }
  if (!allowExpired && expiresAt <= now) throw createSandboxConfigDeniedError("EXPIRED");
}

export function parseSandboxEnv(
  input: Record<string, string | undefined>,
  now = new Date(),
  options: SandboxParseOptions = {},
): SandboxEnv {
  assertEnvironmentIsAllowed(input, options.phase);

  const parsed = requiredSchema.safeParse(input);
  if (!parsed.success) throw createSandboxConfigDeniedError("MISSING_OR_MALFORMED_VARIABLE");

  const builtAt = new Date(parsed.data.SANDBOX_BUILT_AT);
  const expiresAt = new Date(parsed.data.SANDBOX_EXPIRES_AT);
  assertDateWindow(builtAt, expiresAt, now, options.allowExpired === true);

  return {
    mode: "synthetic",
    builtAt,
    expiresAt,
    instanceId: parsed.data.SANDBOX_INSTANCE_ID,
    origin: SANDBOX_ORIGIN,
    g1DecisionId: SANDBOX_G1_DECISION_ID,
    disabled: parsed.data.SANDBOX_DISABLED === "true",
  };
}

export function loadSandboxEnv(
  options: SandboxParseOptions & { now?: Date } = {},
): SandboxEnv {
  // This is the only sandbox source file permitted to read process.env.
  return parseSandboxEnv(process.env, options.now ?? new Date(), options);
}

export function parseTask04SandboxEnv(
  input: Record<string, string | undefined>,
  now = new Date(),
  options: SandboxParseOptions = {},
): Task04SandboxEnv {
  const sandbox = parseSandboxEnv(input, now, {
    ...options,
    allowExpired: true,
  });
  const parsed = task04RequiredSchema.safeParse(input);
  if (!parsed.success) {
    throw createSandboxConfigDeniedError("TASK04_MISSING_OR_MALFORMED_VARIABLE");
  }
  if (sandbox.expiresAt.getTime() > Date.parse(TASK04_SANDBOX_EXPIRES_AT)) {
    throw createSandboxConfigDeniedError("TASK04_APPROVAL_WINDOW_EXCEEDED");
  }
  if (
    !Number.isFinite(now.getTime()) ||
    now.toISOString().slice(0, 10) > TASK04_APPROVED_THROUGH_DATE_UTC
  ) {
    throw createSandboxConfigDeniedError("TASK04_APPROVAL_EXPIRED");
  }
  if (
    options.allowExpired !== true &&
    sandbox.expiresAt.getTime() < now.getTime()
  ) {
    throw createSandboxConfigDeniedError("EXPIRED");
  }

  return {
    ...sandbox,
    approvalDecisionVersion: TASK04_APPROVAL_DECISION_VERSION,
    pharmacyId: parsed.data.TASK04_SANDBOX_PHARMACY_ID,
    postgresUrl: TASK04_SANDBOX_POSTGRES_URL,
    maxSlotCapacity: parsed.data.TASK04_MAX_SLOT_CAPACITY,
    maxAccessibilitySelections:
      parsed.data.TASK04_MAX_ACCESSIBILITY_SELECTIONS,
    maxPageSize: parsed.data.TASK04_MAX_PAGE_SIZE,
    pendingHoldMinutes:
      parsed.data.TASK04_PENDING_HOLD_MINUTES,
    publicLocationLabel:
      parsed.data.TASK04_PUBLIC_LOCATION_LABEL,
    publicSlotReferenceTtlSeconds:
      parsed.data.TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS,
    maxRequestBytes: parsed.data.TASK04_MAX_REQUEST_BYTES,
    maxAvailabilityWindowDays:
      parsed.data.TASK04_MAX_AVAILABILITY_WINDOW_DAYS,
    supportedDisplayTimezones:
      TASK04_SYNTHETIC_SUPPORTED_DISPLAY_TIMEZONES,
    publicSlotReferenceSecret:
      parsed.data.TASK04_PUBLIC_SLOT_REFERENCE_SECRET,
    ...(parsed.data
      .TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS === undefined
      ? {}
      : {
          availabilityCacheTtlSeconds:
            parsed.data
              .TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS,
        }),
  };
}

export function loadTask04SandboxEnv(
  options: SandboxParseOptions & { now?: Date } = {},
): Task04SandboxEnv {
  return parseTask04SandboxEnv(process.env, options.now ?? new Date(), options);
}

export function sandboxChildEnvironment(env: SandboxEnv): NodeJS.ProcessEnv {
  const child = {} as NodeJS.ProcessEnv;
  for (const key of [
    "PATH",
    "Path",
    "PATHEXT",
    "SystemRoot",
    "WINDIR",
    "ComSpec",
    "TEMP",
    "TMP",
    "HOME",
    "USERPROFILE",
    "CI",
    "TERM",
    "NO_COLOR",
  ]) {
    const value = process.env[key];
    if (value !== undefined) child[key] = value;
  }
  child.SANDBOX_MODE = env.mode;
  child.SANDBOX_BUILT_AT = env.builtAt.toISOString();
  child.SANDBOX_EXPIRES_AT = env.expiresAt.toISOString();
  child.SANDBOX_INSTANCE_ID = env.instanceId;
  child.SANDBOX_ORIGIN = env.origin;
  child.SANDBOX_G1_DECISION_ID = env.g1DecisionId;
  child.SANDBOX_DISABLED = String(env.disabled);
  return child;
}

export function task04SyntheticEnvironmentInput(): Record<string, string> {
  return {
    SANDBOX_MODE: "synthetic",
    SANDBOX_BUILT_AT: TASK04_SANDBOX_BUILT_AT,
    SANDBOX_EXPIRES_AT: TASK04_SANDBOX_EXPIRES_AT,
    SANDBOX_INSTANCE_ID: "SYNTH-TASK04-POSTGRES",
    SANDBOX_ORIGIN,
    SANDBOX_G1_DECISION_ID,
    SANDBOX_DISABLED: "false",
    TASK04_APPROVAL_DECISION_VERSION,
    TASK04_SANDBOX_PHARMACY_ID,
    TASK04_SANDBOX_POSTGRES_URL,
    TASK04_MAX_SLOT_CAPACITY: String(TASK04_DEFAULT_MAX_SLOT_CAPACITY),
    TASK04_MAX_ACCESSIBILITY_SELECTIONS: String(
      TASK04_DEFAULT_MAX_ACCESSIBILITY_SELECTIONS,
    ),
    TASK04_MAX_PAGE_SIZE: String(TASK04_DEFAULT_MAX_PAGE_SIZE),
    TASK04_PENDING_HOLD_MINUTES: String(
      TASK04_PENDING_HOLD_MINUTES,
    ),
    TASK04_PUBLIC_LOCATION_LABEL,
    TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS: String(
      TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS,
    ),
    TASK04_MAX_REQUEST_BYTES: String(TASK04_MAX_REQUEST_BYTES),
    TASK04_MAX_AVAILABILITY_WINDOW_DAYS: String(
      TASK04_MAX_AVAILABILITY_WINDOW_DAYS,
    ),
    TASK04_PUBLIC_SLOT_REFERENCE_SECRET:
      TASK04_SYNTHETIC_TEST_PUBLIC_SLOT_REFERENCE_SECRET,
  };
}

export type Task04RunnerEnvironment = {
  task04: Task04SandboxEnv;
  child: NodeJS.ProcessEnv;
  npmExecPath: string;
};

export function loadTask04RunnerEnvironment(
  now = new Date(),
): Task04RunnerEnvironment {
  assertEnvironmentIsAllowed(process.env, "test");
  const npmExecPath = process.env.npm_execpath;
  if (!npmExecPath || !isLocalPath(npmExecPath)) {
    throw new Error(
      "TASK04_INFRASTRUCTURE_COMMAND_UNAVAILABLE:npm_execpath",
    );
  }
  const task04 = parseTask04SandboxEnv(task04SyntheticEnvironmentInput(), now);
  const child = sandboxChildEnvironment(task04);
  Object.assign(child, task04SyntheticEnvironmentInput());
  return {
    task04,
    child,
    npmExecPath,
  };
}
