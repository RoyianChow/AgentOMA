import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

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
    },
  }),

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
  },

  // Must stay last: lets auth.api calls made inside server actions set the
  // session cookie via Next's cookies() API.
  plugins: [nextCookies()],
});
