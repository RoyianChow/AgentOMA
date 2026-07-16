import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ODB dispensing fee tier. The rural tiers ($9.93 / $12.14 / $13.25) are the
// only ones permitted to provide remote virtual services; a regular-fee
// pharmacy ($8.83) selecting virtual_remote must be hard-blocked (see
// createAssessment). Stored, never hardcoded.
export const odbFeeTier = pgEnum("odb_fee_tier", [
  "regular_8_83",
  "rural_9_93",
  "rural_12_14",
  "rural_13_25",
]);

// Define a minimal pharmacy table since pharmacy_id must be a UUID FK
export const pharmacy = pgTable("pharmacy", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeName: text("store_name").notNull(),
  hnsAccountId: text("hns_account_id"),
  odbFeeTier: odbFeeTier("odb_fee_tier").notNull().default("regular_8_83"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});


export const patient = pgTable(
  "patient",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pharmacyId: uuid("pharmacy_id").notNull().references(() => pharmacy.id),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    // { mode: "string" } is what makes dob accept "YYYY-MM-DD".
    // Without it Drizzle demands a Date object — that's your build error.
    dob: date("dob", { mode: "string" }).notNull(),
    healthNumber: text("health_number").notNull(),
    gender: text("gender").notNull(), // F | M | U
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Scoped per pharmacy, not globally. Single-tenant today, and this is
    // what keeps you out of HINP territory if a second pharmacy ever lands.
    healthNumberPerPharmacy: uniqueIndex("patient_health_number_per_pharmacy")
      .on(t.pharmacyId, t.healthNumber),
  })
);

export const intakeSession = pgTable("intake_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  pharmacyId: uuid("pharmacy_id").notNull().references(() => pharmacy.id),
  ailmentGroupCode: text("ailment_group_code").notNull(), // text reference to ailment_group.code (app-level since composite unique)
  trail: jsonb("trail").$type<{ question: string; answer: string }[]>(),
  priorCountSelfReport: integer("prior_count_self_report"),
  existingRxSelfReport: text("existing_rx_self_report"), // none | refillable | other_prescriber | unsure
  consentCapturedAt: timestamp("consent_captured_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  consumedByAssessmentId: uuid("consumed_by_assessment_id"),
});

export const assessment = pgTable("assessment", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id").notNull().references(() => pharmacy.id),
  pharmacistUserId: uuid("pharmacist_user_id"), // Nullable until auth is fully hooked up
  patientId: uuid("patient_id").notNull().references(() => patient.id),
  ailmentGroupCode: text("ailment_group_code").notNull(),
  modality: text("modality").notNull(), // in_person | virtual_from_pharmacy | virtual_remote
  virtualLocation: text("virtual_location"),
  remoteReason: text("remote_reason"),
  intakeSessionId: uuid("intake_session_id").references(() => intakeSession.id),
  outcome: text("outcome").notNull(), // rx_issued | no_rx_referral | no_rx_otc_or_nonpharm
  noRxRationaleCode: text("no_rx_rationale_code"),
  serviceDate: date("service_date", { mode: "date" }).notNull(),
  retainUntil: date("retain_until", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("assessment_one_per_day").on(t.patientId, t.ailmentGroupCode, t.serviceDate),
]);

export const triageExit = pgTable("triage_exit", {
  id: uuid("id").primaryKey().defaultRandom(),
  ailmentGroupCode: text("ailment_group_code").notNull(),
  reason: text("reason").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only audit trail. Immutability is enforced at the DATABASE level (a
// migration REVOKEs UPDATE/DELETE from the app role AND installs a trigger that
// raises on UPDATE/DELETE) — not by application convention. `metadata` holds
// references and non-PHI context only; never store health numbers or names here.
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id").references(() => pharmacy.id),
  actorUserId: uuid("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
