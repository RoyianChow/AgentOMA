import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";

import { env } from "../env";
import { db, schema } from "./db";

/**
 * The sole identity layer (better-auth + Drizzle adapter — not Supabase Auth,
 * not Firebase). This portal reaches PHI, so auth policy is deliberately
 * conservative; later slices add mandatory TOTP, invitations, and role checks.
 *
 * NOTE: `auth.api.*` calls made from server actions/components must pass the
 * request headers (`await headers()`) — better-auth reads the session cookie
 * from them.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
      rateLimit: schema.rateLimit,
    },
  }),

  // 30-minute idle timeout with rolling refresh: any request more than
  // `updateAge` after the last refresh pushes expiry out another `expiresIn`.
  // Sign-out deletes the session row server-side (better-auth default), so
  // revocation is immediate, not cookie-dependent.
  session: {
    expiresIn: 60 * 30,
    updateAge: 60 * 5,
  },

  // Brute-force protection. better-auth ships special rules for /sign-in/* and
  // /request-password-reset; the explicit rules below pin the policy in code
  // and extend it to the TOTP endpoints. Database storage so counts survive
  // restarts and are shared across instances.
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 900, max: 3 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/two-factor/verify-backup-code": { window: 60, max: 3 },
    },
  },

  emailAndPassword: {
    enabled: true,
    // Policy choice for a PHI-reaching portal (not an EO Notice requirement):
    // longer than better-auth's default of 8.
    minPasswordLength: 12,
  },

  user: {
    additionalFields: {
      // input: false — a signup/update payload can NEVER set these. They are
      // assigned server-side (invitation flow, slice 3). Without this, any
      // caller could hand themselves pharmacy_admin in the signup body.
      role: {
        type: "string",
        required: false,
        defaultValue: "technician",
        input: false,
      },
      pharmacyId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  advanced: {
    // Auth ids are Postgres UUIDs so they join cleanly against
    // assessment.pharmacist_user_id / audit_log.actor_user_id (both uuid).
    database: { generateId: "uuid" },
    // Cookies: better-auth defaults are already httpOnly, sameSite=lax,
    // path=/, and secure (+ __Secure- prefix) whenever BETTER_AUTH_URL is
    // https — i.e. everywhere except local http dev. Nothing to override.
  },

  plugins: [
    // TOTP. Enrollment is MANDATORY to reach PHI — enforced at the session
    // boundary in requireAuth (slice 4), not here; the plugin only makes
    // sign-in challenge for enrolled users and handles attempt lockout
    // (failed_verification_count / locked_until).
    twoFactor({
      issuer: "AgentOMA",
      // Pharmacy terminals are shared machines: cap "trust this device" at 8h
      // (a shift) instead of the 30-day default. The sign-in UI additionally
      // never offers the trust-device option.
      trustDeviceMaxAge: 60 * 60 * 8,
    }),
    // Must stay last: lets auth.api calls made inside server actions set the
    // session cookie via Next's cookies() API.
    nextCookies(),
  ],
});
