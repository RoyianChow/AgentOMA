import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { patient, pharmacy } from "./assessments";
import { user } from "./auth";

export type ExportArtifact = {
  recordType: string;
  recordId: string;
  sha256: string;
};

/** Effective-dated policy rather than a magic duration in application code. */
export const retentionPolicy = pgTable("retention_policy", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  serviceYears: integer("service_years").notNull(),
  ageOfMajority: integer("age_of_majority").notNull(),
  postMajorityYears: integer("post_majority_years").notNull(),
  effectiveDate: date("effective_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("retention_policy_positive_durations", sql`
    ${t.serviceYears} > 0
    AND ${t.ageOfMajority} > 0
    AND ${t.postMajorityYears} > 0
  `),
]);

/**
 * One recomputed retention horizon per patient. Assessment rows carry the same
 * horizon as a denormalized enforcement/export convenience; claim drafts and
 * patient-linked audit rows inherit it through their assessment/patient link.
 */
export const patientRecordRetention = pgTable("patient_record_retention", {
  patientId: uuid("patient_id")
    .primaryKey()
    .references(() => patient.id, { onDelete: "cascade" }),
  policyId: text("policy_id")
    .notNull()
    .references(() => retentionPolicy.id),
  lastServiceDate: date("last_service_date", { mode: "string" }).notNull(),
  retainUntil: date("retain_until", { mode: "string" }).notNull(),
  recomputedAt: timestamp("recomputed_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Holds intentionally retain the stable subject UUID even after an authorized
 * destruction. That preserves evidence that a hold existed without retaining
 * the destroyed clinical content.
 */
export const recordHold = pgTable("record_hold", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacy.id),
  patientId: uuid("patient_id").notNull(),
  recordType: text("record_type"),
  recordId: uuid("record_id"),
  reason: text("reason").notNull(),
  authorizedByUserId: uuid("authorized_by_user_id")
    .notNull()
    .references(() => user.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  releasedByUserId: uuid("released_by_user_id").references(() => user.id),
  releaseReason: text("release_reason"),
}, (t) => [
  index("record_hold_patient_idx").on(t.patientId),
  check("record_hold_scope_pair", sql`
    (${t.recordType} IS NULL AND ${t.recordId} IS NULL)
    OR (${t.recordType} IS NOT NULL AND ${t.recordId} IS NOT NULL)
  `),
  check("record_hold_release_complete", sql`
    (${t.releasedAt} IS NULL AND ${t.releasedByUserId} IS NULL AND ${t.releaseReason} IS NULL)
    OR (
      ${t.releasedAt} IS NOT NULL
      AND ${t.releasedByUserId} IS NOT NULL
      AND NULLIF(BTRIM(${t.releaseReason}), '') IS NOT NULL
    )
  `),
]);

export const exportManifest = pgTable("export_manifest", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacy.id),
  patientId: uuid("patient_id").notNull(),
  generatedByUserId: uuid("generated_by_user_id")
    .notNull()
    .references(() => user.id),
  deliveryMethod: text("delivery_method").notNull(),
  artifacts: jsonb("artifacts").$type<ExportArtifact[]>().notNull(),
  bundleSha256: text("bundle_sha256").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("export_manifest_patient_idx").on(t.patientId),
  check("export_manifest_delivery_method", sql`
    ${t.deliveryMethod} IN ('secure_download', 'printed', 'secure_transfer', 'other')
  `),
]);

export const accessCorrectionRequest = pgTable("access_correction_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacy.id),
  patientId: uuid("patient_id").notNull(),
  requestKind: text("request_kind").notNull(),
  requesterType: text("requester_type").notNull(),
  requesterDescription: text("requester_description"),
  identityVerificationMethod: text("identity_verification_method").notNull(),
  scope: text("scope").notNull(),
  status: text("status").notNull().default("received"),
  decision: text("decision"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  handledByUserId: uuid("handled_by_user_id").references(() => user.id),
}, (t) => [
  index("access_correction_request_patient_idx").on(t.patientId),
  check("access_correction_request_kind", sql`
    ${t.requestKind} IN ('access', 'correction')
  `),
  check("access_correction_requester_type", sql`
    ${t.requesterType} IN ('patient', 'substitute_decision_maker', 'legal_representative')
  `),
  check("access_correction_request_status", sql`
    ${t.status} IN ('received', 'in_review', 'approved', 'partially_approved', 'denied', 'fulfilled', 'withdrawn')
  `),
]);

/**
 * Corrections are immutable overlays. The original record remains untouched;
 * replacing a correction inserts another row and permanently links the former
 * row through superseded_by_id.
 */
export const recordCorrection = pgTable("record_correction", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacy.id),
  patientId: uuid("patient_id").notNull(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => accessCorrectionRequest.id),
  targetEntityType: text("target_entity_type").notNull(),
  targetEntityId: uuid("target_entity_id").notNull(),
  patch: jsonb("patch").$type<Record<string, unknown>>().notNull(),
  reason: text("reason").notNull(),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => user.id),
  supersededById: uuid("superseded_by_id").references(
    (): AnyPgColumn => recordCorrection.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("record_correction_patient_idx").on(t.patientId),
  check("record_correction_target_type", sql`
    ${t.targetEntityType} IN ('patient', 'assessment', 'claim_draft', 'intake_session')
  `),
]);

export const restoreDrill = pgTable("restore_drill", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacy.id),
  backupIdentifier: text("backup_identifier").notNull(),
  isolatedEnvironment: text("isolated_environment").notNull(),
  status: text("status").notNull(),
  rowCounts: jsonb("row_counts").$type<Record<string, number>>(),
  integrityHashes: jsonb("integrity_hashes").$type<Record<string, string>>(),
  evidenceLocation: text("evidence_location"),
  performedByUserId: uuid("performed_by_user_id")
    .notNull()
    .references(() => user.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("restore_drill_status", sql`
    ${t.status} IN ('planned', 'running', 'passed', 'failed')
  `),
]);

/** Secondary, non-PHI evidence for audit insert failures. */
export const auditWriteFailure = pgTable("audit_write_failure", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id").references(() => pharmacy.id),
  attemptedAction: text("attempted_action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  failureCode: text("failure_code").notNull(),
  source: text("source").notNull().default("server"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedByUserId: uuid("acknowledged_by_user_id").references(() => user.id),
});

export type DestructionArtifactCount = {
  recordType: string;
  count: number;
  sha256: string;
};

export const destructionRun = pgTable("destruction_run", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacyId: uuid("pharmacy_id")
    .notNull()
    .references(() => pharmacy.id),
  patientId: uuid("patient_id").notNull(),
  status: text("status").notNull().default("dry_run"),
  eligibleOn: date("eligible_on", { mode: "string" }).notNull(),
  artifacts: jsonb("artifacts").$type<DestructionArtifactCount[]>().notNull(),
  preparedByUserId: uuid("prepared_by_user_id")
    .notNull()
    .references(() => user.id),
  executedByUserId: uuid("executed_by_user_id").references(() => user.id),
  preparedAt: timestamp("prepared_at", { withTimezone: true }).notNull().defaultNow(),
  executedAt: timestamp("executed_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("destruction_run_one_execution").on(t.id, t.executedAt),
  check("destruction_run_status", sql`
    ${t.status} IN ('dry_run', 'blocked', 'executed')
  `),
]);
