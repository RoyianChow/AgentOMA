// Drizzle schema — versioned reference tables (seeded from the EO Notice).
//
// These carry `effective_date` (+ nullable `end_date`) so a future PIN revision
// can coexist with the July 1, 2026 set. They hold no PHI. Column names are
// snake_case (Drizzle `casing: "snake_case"` in both drizzle.config.ts and the
// runtime client), so fields are written camelCase here.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

/** Billing modality for a PIN row: in-person ($19) vs virtual ($15). */
export const billingModality = pgEnum("billing_modality", [
  "in_person",
  "virtual",
]);

export const claimRuleType = pgEnum("claim_rule_type", [
  "same_day_mutex",
  "scope_exclusion",
]);

export const redFlagQuestionType = pgEnum("red_flag_question_type", [
  "boolean",
  "choice",
  "text",
]);

/**
 * ODB dispensing-fee tier reference data.
 *
 * `dispensingFeeCents` is the ODB dispensing fee, NOT the minor-ailment
 * service fee. Minor-ailment fees continue to come only from `pin.fee_cents`.
 * The eligibility flag is named after the operative rule so postal-code or
 * other "rural" heuristics cannot silently unlock remote virtual billing.
 */
export const odbFeeTier = pgTable("odb_fee_tier", {
  code: text().primaryKey(),
  dispensingFeeCents: integer().notNull(),
  remoteVirtualEligible: boolean().notNull(),
  effectiveDate: date().notNull(),
  endDate: date(),
});

export const ailmentGroup = pgTable(
  "ailment_group",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Stable machine code, e.g. RHINITIS. */
    code: text().notNull(),
    displayName: text().notNull(),
    /** Maximum claims per rolling 365-day period (EO Notice Table 1). */
    maxClaimsPer365Days: integer().notNull(),
    effectiveDate: date().notNull(),
    endDate: date(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("ailment_group_code_effective_uq").on(t.code, t.effectiveDate)],
);

/**
 * One row per PIN: four per ailment group per effective period. This is the
 * lookup that backs PIN = f(ailment group, modality, rx issued). Fee is stored
 * per row so the $19/$15 amounts are explicit and versioned.
 */
export const pin = pgTable(
  "pin",
  {
    id: uuid().primaryKey().defaultRandom(),
    ailmentGroupId: uuid()
      .notNull()
      .references(() => ailmentGroup.id, { onDelete: "cascade" }),
    modality: billingModality().notNull(),
    rxIssued: boolean().notNull(),
    pinCode: text().notNull(),
    feeCents: integer().notNull(),
    effectiveDate: date().notNull(),
    endDate: date(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("pin_group_modality_rx_effective_uq").on(
      t.ailmentGroupId,
      t.modality,
      t.rxIssued,
      t.effectiveDate,
    ),
  ],
);

/**
 * Per-ailment red-flag questions. Content is OCP-sourced and requires pharmacist
 * sign-off, so this table is created here but seeded later with each rule marked
 * `// TODO: PHARMACIST REVIEW REQUIRED`. Never invent clinical content.
 */
export const ailmentRedFlag = pgTable("ailment_red_flag", {
  id: uuid().primaryKey().defaultRandom(),
  ailmentGroupId: uuid()
    .notNull()
    .references(() => ailmentGroup.id, { onDelete: "cascade" }),
  key: text().notNull(),
  prompt: text().notNull(),
  questionType: redFlagQuestionType().notNull(),
  /** For choice questions: array of { label, value, triggersReferral }. */
  choices: jsonb(),
  triggersReferral: boolean().notNull().default(true),
  required: boolean().notNull().default(true),
  sortOrder: integer().notNull().default(0),
  pharmacistReviewed: boolean().notNull().default(false),
  effectiveDate: date().notNull(),
  endDate: date(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Cross-ailment billing rules, encoded as data (not ad-hoc conditionals):
 * same-day mutex (insect bites ⊕ tick bites) and scope exclusion (warts on
 * face/genitals → referral).
 */
export const claimRule = pgTable("claim_rule", {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(),
  ruleType: claimRuleType().notNull(),
  description: text().notNull(),
  /** SAME_DAY_MUTEX: the ailment codes that cannot co-occur on one day. */
  ailmentCodes: jsonb().$type<string[]>(),
  /** SCOPE_EXCLUSION: the ailment the exclusion applies to. */
  ailmentCode: text(),
  params: jsonb(),
  effectiveDate: date().notNull(),
  endDate: date(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
