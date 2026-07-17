import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  bigint,
  integer,
  timestamp,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { pharmacy } from "./assessments";

// Portal roles. Only `pharmacist` (and `pharmacy_admin` when they are also a
// pharmacist) can complete a billable assessment; interns/students work under a
// supervising pharmacist whose OCP number goes on the claim; technicians never
// bill. Enforced in server actions — the enum just makes bad data unrepresentable.
export const userRole = pgEnum("user_role", [
  "pharmacy_admin",
  "pharmacist",
  "intern",
  "student",
  "technician",
]);

// better-auth core tables (Drizzle adapter). Field names (TS keys) must match
// better-auth's model fields exactly — the adapter resolves columns by key.
// Column names follow the repo's snake_case convention. IDs are uuid to match
// the rest of the schema (assessment.pharmacist_user_id, audit_log.actor_user_id);
// better-auth is configured with `advanced.database.generateId: "uuid"`.

export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Domain fields, declared as better-auth additionalFields with `input: false`
  // so a signup payload can never set them. Default is the least-privileged
  // role; the invitation flow assigns the real role and pharmacy.
  role: userRole("role").notNull().default("technician"),
  pharmacyId: uuid("pharmacy_id").references(() => pharmacy.id),
  // Set by the twoFactor plugin once TOTP enrollment is verified. Mandatory
  // TOTP is enforced at the session boundary (requireAuth, slice 4): a session
  // whose user has not enabled TOTP never reaches PHI.
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  // Interns and students practise under a supervising pharmacist — it is the
  // SUPERVISOR's OCP number that goes on any claim, never the trainee's.
  supervisingPharmacistId: uuid("supervising_pharmacist_id").references(
    (): AnyPgColumn => user.id
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("session_user_id_idx").on(t.userId)]
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)]
);

// twoFactor plugin table (better-auth 1.6.23 shape: includes verified /
// failed_verification_count / locked_until — the plugin implements TOTP
// attempt lockout itself).
export const twoFactor = pgTable(
  "two_factor",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [
    index("two_factor_secret_idx").on(t.secret),
    index("two_factor_user_id_idx").on(t.userId),
  ]
);

// Invitation-only onboarding: there is NO public signup (emailAndPassword.
// disableSignUp). A pharmacy admin issues a single-use, expiring invitation;
// only the SHA-256 hash of the token is stored — a database leak does not leak
// usable invitations. Acceptance claims the row atomically (UPDATE … WHERE
// used_at IS NULL) and creates the user + credential account in the same
// transaction.
export const invitation = pgTable("invitation", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacy.id),
  email: text("email").notNull(),
  role: userRole("role").notNull(),
  // Required (app-enforced) when role is intern/student.
  supervisingPharmacistId: uuid("supervising_pharmacist_id").references(
    () => user.id
  ),
  tokenHash: text("token_hash").notNull().unique(),
  invitedByUserId: uuid("invited_by_user_id")
    .notNull()
    .references(() => user.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedByUserId: uuid("used_by_user_id").references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// better-auth rate limiting with storage: "database" — persistent and shared
// across instances, unlike the in-memory default which silently resets on
// every restart (and never fires on serverless).
export const rateLimit = pgTable("rate_limit", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)]
);
