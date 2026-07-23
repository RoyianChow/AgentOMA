import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  uniqueIndex,
  check,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { odbFeeTier } from "./reference";

// Define a minimal pharmacy table since pharmacy_id must be a UUID FK
export const pharmacy = pgTable("pharmacy", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeName: text("store_name").notNull(),
  hnsAccountId: text("hns_account_id"),
  odbFeeTierCode: text("odb_fee_tier_code")
    .notNull()
    .default("regular_8_83")
    .references(() => odbFeeTier.code),
  // Practice contact is snapshotted onto every issued prescription. These are
  // nullable for legacy pharmacies; an Rx completion refuses until an admin
  // fills them in through Settings.
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  phone: text("phone"),
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
  ltcResident: boolean("ltc_resident").notNull().default(false),
  ltcProviderRole: text("ltc_provider_role"),
  ltcIsEmergency: boolean("ltc_is_emergency"),
  intakeSessionId: uuid("intake_session_id").references(() => intakeSession.id),
  outcome: text("outcome").notNull(), // rx_issued | no_rx_referral | no_rx_otc_or_nonpharm
  noRxRationaleCode: text("no_rx_rationale_code"),
  noRxRationaleNotes: text("no_rx_rationale_notes"),

  // P0-B owns record_version=2 and every field through
  // patient_choice_informed_at. P0-C may add eligibility fields in a later
  // migration, but must not weaken these clinical-record checks.
  recordVersion: integer("record_version").notNull().default(1),
  consentMethod: text("consent_method"),
  consentGivenBy: text("consent_given_by"),
  consentObtainedAt: timestamp("consent_obtained_at", { withTimezone: true }),
  sdmName: text("sdm_name"),
  sdmRelationship: text("sdm_relationship"),

  presentingComplaint: text("presenting_complaint"),
  symptomOnset: text("symptom_onset"),
  symptomDuration: text("symptom_duration"),
  symptomCourse: text("symptom_course"),
  associatedSymptoms: text("associated_symptoms"),
  aggravatingFactors: text("aggravating_factors"),
  relievingFactors: text("relieving_factors"),
  treatmentsTried: text("treatments_tried"),
  healthHistory: text("health_history"),
  medicationHistory: text("medication_history"),
  allergies: text("allergies"),
  assessmentFindings: text("assessment_findings"),
  sharedDecisionMaking: text("shared_decision_making"),
  carePlan: text("care_plan"),
  followUpPlan: text("follow_up_plan"),

  prescribedOn: date("prescribed_on", { mode: "string" }),
  prescriptionPatientAddressLine1: text("prescription_patient_address_line1"),
  prescriptionPatientAddressLine2: text("prescription_patient_address_line2"),
  prescriptionPatientCity: text("prescription_patient_city"),
  prescriptionPatientProvince: text("prescription_patient_province"),
  prescriptionPatientPostalCode: text("prescription_patient_postal_code"),
  prescriptionDrugName: text("prescription_drug_name"),
  prescriptionStrength: text("prescription_strength"),
  prescriptionQuantity: text("prescription_quantity"),
  prescriptionDose: text("prescription_dose"),
  prescriptionFrequency: text("prescription_frequency"),
  prescriptionRoute: text("prescription_route"),
  prescriberName: text("prescriber_name"),
  prescriberAddressLine1: text("prescriber_address_line1"),
  prescriberAddressLine2: text("prescriber_address_line2"),
  prescriberCity: text("prescriber_city"),
  prescriberProvince: text("prescriber_province"),
  prescriberPostalCode: text("prescriber_postal_code"),
  prescriberPhone: text("prescriber_phone"),
  prescriberOcpNumber: text("prescriber_ocp_number"),
  prescriberIsAsOfRight: boolean("prescriber_is_as_of_right"),
  pcpNotificationAt: timestamp("pcp_notification_at", { withTimezone: true }),
  pcpNotificationMethod: text("pcp_notification_method"),
  patientChoiceInformedAt: timestamp("patient_choice_informed_at", { withTimezone: true }),

  serviceDate: date("service_date", { mode: "date" }).notNull(),
  retainUntil: date("retain_until", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("assessment_one_per_day").on(t.patientId, t.ailmentGroupCode, t.serviceDate),
  check(
    "assessment_virtual_documentation_complete",
    sql`(
      ${t.modality} NOT IN ('virtual_from_pharmacy', 'virtual_remote')
      OR NULLIF(BTRIM(${t.virtualLocation}), '') IS NOT NULL
    ) AND (
      ${t.modality} <> 'virtual_remote'
      OR NULLIF(BTRIM(${t.remoteReason}), '') IS NOT NULL
    )`,
  ),
  check(
    "assessment_ltc_provider_role_valid",
    sql`${t.ltcProviderRole} IS NULL OR ${t.ltcProviderRole} IN ('primary', 'secondary')`,
  ),
  check(
    "assessment_non_ltc_facts_null",
    sql`${t.ltcResident} OR (
      ${t.ltcProviderRole} IS NULL
      AND ${t.ltcIsEmergency} IS NULL
    )`,
  ),
  check(
    "assessment_v2_clinical_record_complete",
    sql`${t.recordVersion} < 2 OR (
      ${t.consentMethod} IN ('verbal', 'written')
      AND ${t.consentGivenBy} IN ('patient', 'substitute_decision_maker')
      AND ${t.consentObtainedAt} IS NOT NULL
      AND (${t.consentGivenBy} <> 'substitute_decision_maker' OR (
        NULLIF(BTRIM(${t.sdmName}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.sdmRelationship}), '') IS NOT NULL
      ))
      AND NULLIF(BTRIM(${t.presentingComplaint}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.symptomOnset}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.symptomDuration}), '') IS NOT NULL
      AND ${t.symptomCourse} IN ('acute_new', 'recurrent', 'improving', 'unchanged', 'worsening', 'intermittent')
      AND NULLIF(BTRIM(${t.associatedSymptoms}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.aggravatingFactors}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.relievingFactors}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.treatmentsTried}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.healthHistory}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.medicationHistory}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.allergies}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.assessmentFindings}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.sharedDecisionMaking}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.carePlan}), '') IS NOT NULL
      AND NULLIF(BTRIM(${t.followUpPlan}), '') IS NOT NULL
    )`,
  ),
  check(
    "assessment_v2_outcome_record_complete",
    sql`${t.recordVersion} < 2 OR (
      (${t.outcome} = 'rx_issued'
        AND ${t.noRxRationaleCode} IS NULL
        AND ${t.prescribedOn} IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriptionPatientAddressLine1}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriptionPatientCity}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriptionPatientProvince}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriptionPatientPostalCode}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriptionDrugName}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriptionStrength}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriptionQuantity}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriptionDose}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriptionFrequency}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriptionRoute}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriberName}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriberAddressLine1}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriberCity}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriberProvince}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriberPostalCode}), '') IS NOT NULL
        AND NULLIF(BTRIM(${t.prescriberPhone}), '') IS NOT NULL
        AND ${t.prescriberIsAsOfRight} IS NOT NULL
        AND (${t.prescriberIsAsOfRight} OR NULLIF(BTRIM(${t.prescriberOcpNumber}), '') IS NOT NULL)
        AND ${t.pcpNotificationAt} IS NOT NULL
        AND ${t.pcpNotificationMethod} IN ('fax', 'phone', 'secure_electronic', 'mail', 'other')
        AND ${t.patientChoiceInformedAt} IS NOT NULL)
      OR (${t.outcome} = 'no_rx_referral'
        AND ${t.noRxRationaleCode} = 'referral_to_other_provider'
        AND ${t.prescribedOn} IS NULL)
      OR (${t.outcome} = 'no_rx_otc_or_nonpharm'
        AND ${t.noRxRationaleCode} IN ('otc_recommended', 'non_pharmacologic_recommended', 'otc_and_non_pharmacologic')
        AND ${t.prescribedOn} IS NULL)
    )`,
  ),
]);

export const triageExit = pgTable("triage_exit", {
  id: uuid("id").primaryKey().defaultRandom(),
  ailmentGroupCode: text("ailment_group_code").notNull(),
  reason: text("reason").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The billing record: the output of deriveClaimDraft(), snapshotted.
 *
 * IMMUTABLE, with supersession. A draft is never edited — if the pharmacist got
 * something wrong (picked the wrong modality, say), a NEW row is inserted and
 * the old one's `superseded_by_id` is pointed at it, in the same transaction. A
 * DB trigger blocks DELETE and blocks UPDATE of every column except
 * `superseded_by_id`, so "the mistake" and "the correction" both survive — which
 * is the entire point of an audit trail in a post-payment review.
 *
 * There is intentionally NO unique constraint on assessment_id: that would make
 * supersession impossible. Exactly one ACTIVE (non-superseded) draft per
 * assessment is instead guaranteed by a partial, DEFERRABLE exclusion
 * constraint, added in migration 0006 because Drizzle cannot model it:
 *
 *   EXCLUDE USING btree (assessment_id WITH =) WHERE (superseded_by_id IS NULL)
 *     DEFERRABLE INITIALLY DEFERRED
 *
 * Deferred matters. A supersede inserts the replacement and then marks the
 * original, so mid-transaction there are briefly two active drafts. A
 * non-deferred index rejects that at INSERT, which would force callers into a
 * fragile pre-generate-the-id-and-update-first dance. Deferring checks the
 * invariant at COMMIT, so it holds at every boundary an observer can see, and
 * the obvious ordering just works.
 *
 * Export and UI show only non-superseded drafts.
 *
 * Nothing here is submitted to HNS. It is produced for hand-entry.
 */
export const claimDraft = pgTable(
  "claim_draft",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessment.id),
    ailmentGroupCode: text("ailment_group_code").notNull(),
    modality: text("modality").notNull(),
    billingModality: text("billing_modality").notNull(),
    rxIssued: boolean("rx_issued").notNull(),
    /** From the seeded `pin` table. Never a literal. */
    pinCode: text("pin_code").notNull(),
    feeCents: integer("fee_cents").notNull(),
    /** Always '09'. '01'/'99' reject with "60 – Prescriber License Code Error". */
    prescriberIdReference: text("prescriber_id_reference").notNull(),
    /** OCP registration number, or PHR888 for As-of-Right without a licence. */
    prescriberId: text("prescriber_id").notNull(),
    /** PS always; ML for non-ODB. LTC claim drafting is parked pending ministry clarification. */
    interventionCodes: jsonb("intervention_codes").$type<string[]>().notNull(),
    carrierId: text("carrier_id"),
    quantity: integer("quantity").notNull(),
    /** 4 only for a completed assessment that ended in referral. */
    ssc: integer("ssc"),
    supersededById: uuid("superseded_by_id").references((): AnyPgColumn => claimDraft.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // The one-active-draft invariant is a deferrable partial EXCLUDE constraint in
  // migration 0006 — see the note above. Drizzle can't express it, so it must
  // not be declared here or `db:generate` would fight the migration.
);

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
