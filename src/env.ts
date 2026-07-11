import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Typed, validated environment access. Import `env` from here instead of reading
 * `process.env` directly anywhere in the app.
 *
 * Wired into next.config.ts so that a build FAILS FAST if any required variable
 * is missing or malformed. Set SKIP_ENV_VALIDATION=1 to bypass (e.g. for tooling
 * that doesn't need a live environment); never set it in production builds.
 *
 * No secrets are exposed to the client: the `client` block contains only
 * NEXT_PUBLIC_* values, and no service-account/service-role keys appear there.
 */
export const env = createEnv({
  server: {
    // --- Primary datastore (Supabase Postgres, region ca-central-1) ---------
    // Pooled connection string used by the running app.
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    // Direct (non-pooled) connection string used by migrations / drizzle-kit.
    // Optional: falls back to DATABASE_URL when unset.
    DIRECT_URL: z.string().min(1).optional(),

    // --- better-auth (the sole identity layer) ------------------------------
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL"),

    // --- Supabase Storage (Rx / referral PDFs) ------------------------------
    // Used server-side only, via the service role key. Not for auth.
    SUPABASE_URL: z.url("SUPABASE_URL must be a valid URL"),
    SUPABASE_SERVICE_ROLE_KEY: z
      .string()
      .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default("clinical-documents"),

    // --- Clinical viewer stub (ConnectingOntario / ClinicalConnect link-out) -
    CLINICAL_VIEWER_BASE_URL: z
      .url("CLINICAL_VIEWER_BASE_URL must be a valid URL")
      .optional(),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  },

  /**
   * Next.js inlines client vars at build time, so they must be destructured
   * here explicitly. Server vars are read from process.env at runtime.
   */
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
