import { z } from "zod";

export const SANDBOX_G1_DECISION_ID = "G1-2026-07-31-task-01" as const;
export const SANDBOX_ORIGIN = "http://127.0.0.1:3101" as const;
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

const PROHIBITED_ENVIRONMENT = /(?:DATABASE_URL|DIRECT_URL|BETTER_AUTH|SUPABASE|FIREBASE|GOOGLE_APPLICATION|SERVICE_ROLE|PRIVATE_KEY|AWS_|AZURE_|GCP_|SMTP|SENDGRID|TWILIO|STRIPE|PAYMENT|COURIER|CALENDAR|VIDEO|FHIR|HNS|ODB|CLINICAL_VIEWER|MODEL|OPENAI|ANTHROPIC|SENTRY|POSTHOG|SEGMENT|MIXPANEL|ANALYTICS|TELEMETRY|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY|PROXY|ENDPOINT)/i;

export type SandboxPhase = "build" | "startup" | "test";

export type SandboxEnv = {
  mode: "synthetic";
  builtAt: Date;
  expiresAt: Date;
  instanceId: string;
  origin: typeof SANDBOX_ORIGIN;
  g1DecisionId: typeof SANDBOX_G1_DECISION_ID;
  disabled: boolean;
};

function safeReason(reason: string): Error {
  return new Error(`SANDBOX_CONFIG_DENIED:${reason}`);
}

function assertDateWindow(builtAt: Date, expiresAt: Date, now: Date): void {
  if (!Number.isFinite(builtAt.getTime()) || !Number.isFinite(expiresAt.getTime())) {
    throw safeReason("INVALID_TIMESTAMP");
  }
  if (expiresAt <= builtAt) throw safeReason("EXPIRY_NOT_AFTER_BUILD");
  if (expiresAt.getTime() - builtAt.getTime() > MAX_LIFETIME_MS) {
    throw safeReason("EXPIRY_OVER_30_DAYS");
  }
  if (expiresAt <= now) throw safeReason("EXPIRED");
}

export function parseSandboxEnv(
  input: Record<string, string | undefined>,
  now = new Date(),
  options: { allowExpired?: boolean } = {},
): SandboxEnv {
  for (const [key, value] of Object.entries(input)) {
    // npm adds npm_config_* launcher metadata to script children. It is not
    // forwarded by sandboxChildEnvironment and never configures the app.
    if (/^npm_config_/i.test(key)) continue;
    if (value !== undefined && PROHIBITED_ENVIRONMENT.test(key)) {
      throw safeReason(`PROHIBITED_VARIABLE:${key}`);
    }
  }

  const parsed = requiredSchema.safeParse(input);
  if (!parsed.success) throw safeReason("MISSING_OR_MALFORMED_VARIABLE");

  const builtAt = new Date(parsed.data.SANDBOX_BUILT_AT);
  const expiresAt = new Date(parsed.data.SANDBOX_EXPIRES_AT);
  if (options.allowExpired) {
    if (!Number.isFinite(builtAt.getTime()) || !Number.isFinite(expiresAt.getTime())) {
      throw safeReason("INVALID_TIMESTAMP");
    }
    if (expiresAt <= builtAt) throw safeReason("EXPIRY_NOT_AFTER_BUILD");
    if (expiresAt.getTime() - builtAt.getTime() > MAX_LIFETIME_MS) {
      throw safeReason("EXPIRY_OVER_30_DAYS");
    }
  } else {
    assertDateWindow(builtAt, expiresAt, now);
  }

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
  options: { phase?: SandboxPhase; now?: Date; allowExpired?: boolean } = {},
): SandboxEnv {
  // This is the only sandbox source file permitted to read process.env.
  return parseSandboxEnv(process.env, options.now ?? new Date(), options);
}

export function sandboxChildEnvironment(env: SandboxEnv): NodeJS.ProcessEnv {
  const child = {} as NodeJS.ProcessEnv;
  for (const key of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "ComSpec", "PATHEXT"]) {
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
