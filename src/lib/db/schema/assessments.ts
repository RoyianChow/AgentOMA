import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Define a minimal pharmacy table since pharmacy_id must be a UUID FK
export const pharmacy = pgTable("pharmacy", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeName: text("store_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const patient = pgTable("patient", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dob: date("dob").notNull(),
  healthNumber: text("health_number").notNull().unique(),
  gender: text("gender").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
