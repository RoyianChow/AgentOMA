import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { assessment, pharmacy } from "./assessments";
import { user } from "./auth";

/**
 * Immutable facts known at assessment completion.
 *
 * This is deliberately separate from the P0-B clinical record. P0-B remains
 * record_version=2; evidence_version is independently versioned from 1.
 * Counts are advisory snapshots. HNS adjudication remains authoritative.
 */
export const assessmentBillabilityEvidence = pgTable(
  "assessment_billability_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id").notNull(),
    pharmacyId: uuid("pharmacy_id").notNull(),
    evidenceVersion: integer("evidence_version").notNull().default(1),

    patientSelfReportStatus: text("patient_self_report_status").notNull(),
    patientSelfReportApproximateCount: integer(
      "patient_self_report_approximate_count",
    ),
    patientSelfReportLocation: text("patient_self_report_location"),

    platformAssessmentCount: integer("platform_assessment_count").notNull(),
    trailingWindowStart: date("trailing_window_start", {
      mode: "string",
    }).notNull(),
    trailingWindowEnd: date("trailing_window_end", {
      mode: "string",
    }).notNull(),

    viewerSource: text("viewer_source").notNull(),
    viewerAttestation: boolean("viewer_attestation").notNull(),
    viewerAttestedAt: timestamp("viewer_attested_at", {
      withTimezone: true,
    }).notNull(),
    viewerPharmacistId: uuid("viewer_pharmacist_id")
      .notNull()
      .references(() => user.id),

    maximumState: text("maximum_state").notNull(),
    selfOrFamily: text("self_or_family").notNull(),
    sameAilmentPrescription: text("same_ailment_prescription").notNull(),
    verificationConsultation: text("verification_consultation").notNull(),

    identifierType: text("identifier_type").notNull(),
    identifierIssuer: text("identifier_issuer").notNull(),
    identifierNumber: text("identifier_number").notNull(),
    healthCardVersionCode: text("health_card_version_code"),
    nameExactlyAsDisplayed: text("name_exactly_as_displayed").notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    documentInspectedAttestation: boolean(
      "document_inspected_attestation",
    ).notNull(),
    verifyingPharmacistId: uuid("verifying_pharmacist_id")
      .notNull()
      .references(() => user.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    isOdbRecipient: boolean("is_odb_recipient").notNull(),
    gender: text("gender"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("assessment_billability_evidence_assessment_unique").on(
      t.assessmentId,
    ),
    foreignKey({
      columns: [t.assessmentId, t.pharmacyId],
      foreignColumns: [assessment.id, assessment.pharmacyId],
      name: "assessment_billability_evidence_tenant_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.pharmacyId],
      foreignColumns: [pharmacy.id],
      name: "assessment_billability_evidence_pharmacy_fk",
    }),
    check(
      "assessment_billability_evidence_version_check",
      sql`${t.evidenceVersion} = 1`,
    ),
    check(
      "assessment_billability_evidence_self_report_status_check",
      sql`${t.patientSelfReportStatus} IN ('no', 'yes', 'not_sure')`,
    ),
    check(
      "assessment_billability_evidence_self_report_count_check",
      sql`${t.patientSelfReportApproximateCount} IS NULL OR ${t.patientSelfReportApproximateCount} >= 0`,
    ),
    check(
      "assessment_billability_evidence_self_report_location_check",
      sql`${t.patientSelfReportLocation} IS NULL OR (
        CHAR_LENGTH(BTRIM(${t.patientSelfReportLocation})) BETWEEN 1 AND 200
        AND ${t.patientSelfReportLocation} !~ '[[:cntrl:]]'
      )`,
    ),
    check(
      "assessment_billability_evidence_platform_count_check",
      sql`${t.platformAssessmentCount} >= 0`,
    ),
    check(
      "assessment_billability_evidence_window_check",
      sql`${t.trailingWindowStart} = (${t.trailingWindowEnd} - 365) AND ${t.trailingWindowStart} < ${t.trailingWindowEnd}`,
    ),
    check(
      "assessment_billability_evidence_viewer_check",
      sql`${t.viewerSource} IN ('ConnectingOntario', 'ClinicalConnect')
        AND ${t.viewerAttestation} IS TRUE`,
    ),
    check(
      "assessment_billability_evidence_maximum_state_check",
      sql`${t.maximumState} IN ('not_confirmed_met', 'at_or_near', 'confirmed_met', 'unknown')`,
    ),
    check(
      "assessment_billability_evidence_self_family_check",
      sql`${t.selfOrFamily} IN ('not_self_or_family', 'self', 'family')`,
    ),
    check(
      "assessment_billability_evidence_prescription_check",
      sql`${t.sameAilmentPrescription} IN ('none', 'fillable', 'adaptable', 'extendable', 'unresolved')
        AND ${t.verificationConsultation} IN (
          'not_required',
          'required_prescriber_reachable',
          'required_prescriber_unreachable',
          'unresolved'
        )`,
    ),
    check(
      "assessment_billability_evidence_identifier_type_check",
      sql`${t.identifierType} IN ('ohip_health_number', 'odb_mccss', 'odb_hccss')`,
    ),
    check(
      "assessment_billability_evidence_identifier_issuer_check",
      sql`CHAR_LENGTH(BTRIM(${t.identifierIssuer})) BETWEEN 1 AND 100
        AND ${t.identifierIssuer} !~ '[[:cntrl:]]'`,
    ),
    check(
      "assessment_billability_evidence_identifier_number_check",
      sql`(
        ${t.identifierType} = 'ohip_health_number'
        AND ${t.identifierNumber} ~ '^[0-9]{10}$'
        AND (
          ${t.healthCardVersionCode} IS NULL
          OR ${t.healthCardVersionCode} ~ '^[A-Z]{1,2}$'
        )
      ) OR (
        ${t.identifierType} IN ('odb_mccss', 'odb_hccss')
        AND CHAR_LENGTH(BTRIM(${t.identifierNumber})) BETWEEN 1 AND 64
        AND ${t.identifierNumber} !~ '[[:cntrl:]]'
        AND ${t.healthCardVersionCode} IS NULL
      )`,
    ),
    check(
      "assessment_billability_evidence_displayed_name_check",
      sql`CHAR_LENGTH(BTRIM(${t.nameExactlyAsDisplayed})) BETWEEN 1 AND 200
        AND ${t.nameExactlyAsDisplayed} !~ '[[:cntrl:]]'`,
    ),
    check(
      "assessment_billability_evidence_document_check",
      sql`${t.documentInspectedAttestation} IS TRUE`,
    ),
    check(
      "assessment_billability_evidence_gender_check",
      sql`(${t.gender} IS NULL OR ${t.gender} IN ('F', 'M', 'U'))
        AND (${t.isOdbRecipient} OR ${t.gender} IN ('F', 'M', 'U'))`,
    ),
  ],
);
