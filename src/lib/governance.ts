import { createHash } from "node:crypto";

import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { writeAuditWith } from "@/lib/audit";
import type { PortalUser } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import {
  accessCorrectionRequest,
  assessment,
  auditLog,
  auditWriteFailure,
  claimDraft,
  destructionRun,
  exportManifest,
  intakeSession,
  patient,
  patientRecordRetention,
  recordCorrection,
  recordHold,
  restoreDrill,
  type DestructionArtifactCount,
  type ExportArtifact,
} from "@/lib/db/schema";
import { requireConfiguredPharmacyId } from "@/lib/pharmacy-config";

type DeliveryMethod = "secure_download" | "printed" | "secure_transfer" | "other";

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function configuredActor(actor: PortalUser): string {
  const pharmacyId = requireConfiguredPharmacyId();
  if (actor.pharmacyId !== pharmacyId) {
    throw new Error("Foreign pharmacy context refused.");
  }
  return pharmacyId;
}

export class PatientRecordNotFoundError extends Error {
  constructor() {
    super("Patient record not found.");
    this.name = "PatientRecordNotFoundError";
  }
}

/**
 * Complete, server-only patient record assembly. Nothing here is logged and no
 * client component receives this object. The dedicated authenticated export
 * route is the only browser boundary.
 */
export async function collectPatientRecord(actor: PortalUser, patientId: string) {
  const pharmacyId = configuredActor(actor);
  const [patientRow] = await db
    .select()
    .from(patient)
    .where(and(eq(patient.id, patientId), eq(patient.pharmacyId, pharmacyId)))
    .limit(1);
  if (!patientRow) throw new PatientRecordNotFoundError();

  const assessments = await db
    .select()
    .from(assessment)
    .where(
      and(
        eq(assessment.patientId, patientId),
        eq(assessment.pharmacyId, pharmacyId),
      ),
    );
  const assessmentIds = assessments.map((row) => row.id);
  const intakeIds = assessments
    .map((row) => row.intakeSessionId)
    .filter((id): id is string => Boolean(id));

  const [
    claimDrafts,
    intakeSessions,
    retentionRows,
    holds,
    requests,
    corrections,
    priorManifests,
  ] = await Promise.all([
    assessmentIds.length
      ? db
          .select()
          .from(claimDraft)
          .where(inArray(claimDraft.assessmentId, assessmentIds))
      : [],
    intakeIds.length
      ? db
          .select()
          .from(intakeSession)
          .where(
            and(
              inArray(intakeSession.id, intakeIds),
              eq(intakeSession.pharmacyId, pharmacyId),
            ),
          )
      : [],
    db
      .select()
      .from(patientRecordRetention)
      .where(eq(patientRecordRetention.patientId, patientId)),
    db
      .select()
      .from(recordHold)
      .where(
        and(
          eq(recordHold.pharmacyId, pharmacyId),
          eq(recordHold.patientId, patientId),
        ),
      ),
    db
      .select()
      .from(accessCorrectionRequest)
      .where(
        and(
          eq(accessCorrectionRequest.pharmacyId, pharmacyId),
          eq(accessCorrectionRequest.patientId, patientId),
        ),
      ),
    db
      .select()
      .from(recordCorrection)
      .where(
        and(
          eq(recordCorrection.pharmacyId, pharmacyId),
          eq(recordCorrection.patientId, patientId),
        ),
      ),
    db
      .select()
      .from(exportManifest)
      .where(
        and(
          eq(exportManifest.pharmacyId, pharmacyId),
          eq(exportManifest.patientId, patientId),
        ),
      ),
  ]);
  const relatedEntityIds = [
    patientId,
    ...assessmentIds,
    ...intakeIds,
    ...claimDrafts.map((row) => row.id),
  ];
  const auditEntries = await db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.pharmacyId, pharmacyId),
        or(
          eq(auditLog.patientId, patientId),
          inArray(auditLog.entityId, relatedEntityIds),
        ),
      ),
    );

  return {
    patient: patientRow,
    assessments,
    claimDrafts,
    intakeSessions,
    auditEntries,
    retention: retentionRows[0] ?? null,
    holds,
    accessCorrectionRequests: requests,
    corrections,
    priorExportManifests: priorManifests,
  };
}

function recordArtifacts(
  record: Awaited<ReturnType<typeof collectPatientRecord>>,
): { artifacts: ExportArtifact[]; destructionArtifacts: DestructionArtifactCount[] } {
  const groups: Array<[string, Array<Record<string, unknown>>]> = [
    ["patient", [record.patient]],
    ["assessment", record.assessments],
    ["claim_draft", record.claimDrafts],
    ["intake_session", record.intakeSessions],
    ["audit_log", record.auditEntries],
    ["retention", record.retention ? [record.retention] : []],
    ["record_hold", record.holds],
    ["access_correction_request", record.accessCorrectionRequests],
    ["record_correction", record.corrections],
    ["export_manifest", record.priorExportManifests],
  ];
  const artifacts = groups.flatMap(([recordType, rows]) =>
    rows.map((row) => ({
      recordType,
      recordId:
        typeof row.id === "string"
          ? row.id
          : typeof row.patientId === "string"
            ? row.patientId
            : record.patient.id,
      sha256: sha256(row),
    })),
  );
  const destructionArtifacts = groups.map(([recordType, rows]) => ({
    recordType,
    count: rows.length,
    sha256: sha256(rows),
  }));
  return { artifacts, destructionArtifacts };
}

export async function assemblePatientExport(
  actor: PortalUser,
  patientId: string,
  deliveryMethod: DeliveryMethod,
) {
  const pharmacyId = configuredActor(actor);
  const record = await collectPatientRecord(actor, patientId);
  const { artifacts } = recordArtifacts(record);
  const generatedAt = new Date();
  const bundle = {
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    record,
  };
  const bundleSha256 = sha256(bundle);

  const [manifest] = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(exportManifest)
      .values({
        pharmacyId,
        patientId,
        generatedByUserId: actor.userId,
        deliveryMethod,
        artifacts,
        bundleSha256,
        generatedAt,
      })
      .returning();

    await writeAuditWith(tx, {
      pharmacyId,
      patientId,
      actorUserId: actor.userId,
      action: "record.exported",
      entityType: "export_manifest",
      entityId: rows[0].id,
      source: "governance_export",
      metadata: {
        deliveryMethod,
        artifactCount: artifacts.length,
      },
    });
    return rows;
  });

  return {
    manifest,
    bundle,
  };
}

export async function placeRecordHold(
  actor: PortalUser,
  input: {
    patientId: string;
    recordType?: string;
    recordId?: string;
    reason: string;
  },
) {
  const pharmacyId = configuredActor(actor);
  await collectPatientRecord(actor, input.patientId);
  return db.transaction(async (tx) => {
    const [hold] = await tx
      .insert(recordHold)
      .values({
        pharmacyId,
        patientId: input.patientId,
        recordType: input.recordType ?? null,
        recordId: input.recordId ?? null,
        reason: input.reason,
        authorizedByUserId: actor.userId,
      })
      .returning();
    await writeAuditWith(tx, {
      pharmacyId,
      patientId: input.patientId,
      actorUserId: actor.userId,
      action: "record.hold.placed",
      entityType: "record_hold",
      entityId: hold.id,
      source: "governance_portal",
      metadata: { scope: input.recordType ?? "patient" },
    });
    return hold;
  });
}

export async function releaseRecordHold(
  actor: PortalUser,
  holdId: string,
  releaseReason: string,
) {
  const pharmacyId = configuredActor(actor);
  return db.transaction(async (tx) => {
    const [hold] = await tx
      .update(recordHold)
      .set({
        releasedAt: new Date(),
        releasedByUserId: actor.userId,
        releaseReason,
      })
      .where(
        and(
          eq(recordHold.id, holdId),
          eq(recordHold.pharmacyId, pharmacyId),
          isNull(recordHold.releasedAt),
        ),
      )
      .returning();
    if (!hold) throw new Error("Active hold not found.");
    await writeAuditWith(tx, {
      pharmacyId,
      patientId: hold.patientId,
      actorUserId: actor.userId,
      action: "record.hold.released",
      entityType: "record_hold",
      entityId: hold.id,
      source: "governance_portal",
    });
    return hold;
  });
}

export async function createAccessCorrectionRequest(
  actor: PortalUser,
  input: {
    patientId: string;
    requestKind: "access" | "correction";
    requesterType: "patient" | "substitute_decision_maker" | "legal_representative";
    requesterDescription?: string;
    identityVerificationMethod: string;
    scope: string;
  },
) {
  const pharmacyId = configuredActor(actor);
  await collectPatientRecord(actor, input.patientId);
  return db.transaction(async (tx) => {
    const [request] = await tx
      .insert(accessCorrectionRequest)
      .values({
        pharmacyId,
        patientId: input.patientId,
        requestKind: input.requestKind,
        requesterType: input.requesterType,
        requesterDescription: input.requesterDescription ?? null,
        identityVerificationMethod: input.identityVerificationMethod,
        scope: input.scope,
      })
      .returning();
    await writeAuditWith(tx, {
      pharmacyId,
      patientId: input.patientId,
      actorUserId: actor.userId,
      action: `${input.requestKind}.request.received`,
      entityType: "access_correction_request",
      entityId: request.id,
      source: "governance_portal",
      metadata: { requestKind: input.requestKind },
    });
    return request;
  });
}

export async function decideAccessCorrectionRequest(
  actor: PortalUser,
  input: {
    requestId: string;
    status: "approved" | "partially_approved" | "denied" | "fulfilled" | "withdrawn";
    decision: string;
  },
) {
  const pharmacyId = configuredActor(actor);
  return db.transaction(async (tx) => {
    const now = new Date();
    const [request] = await tx
      .update(accessCorrectionRequest)
      .set({
        status: input.status,
        decision: input.decision,
        decidedAt: now,
        fulfilledAt: input.status === "fulfilled" ? now : null,
        handledByUserId: actor.userId,
      })
      .where(
        and(
          eq(accessCorrectionRequest.id, input.requestId),
          eq(accessCorrectionRequest.pharmacyId, pharmacyId),
        ),
      )
      .returning();
    if (!request) throw new Error("Request not found.");
    await writeAuditWith(tx, {
      pharmacyId,
      patientId: request.patientId,
      actorUserId: actor.userId,
      action: `${request.requestKind}.request.decided`,
      entityType: "access_correction_request",
      entityId: request.id,
      source: "governance_portal",
      metadata: { status: input.status },
    });
    return request;
  });
}

export async function addRecordCorrection(
  actor: PortalUser,
  input: {
    requestId: string;
    targetEntityType: "patient" | "assessment" | "claim_draft" | "intake_session";
    targetEntityId: string;
    patch: Record<string, unknown>;
    reason: string;
    supersedesCorrectionId?: string;
  },
) {
  const pharmacyId = configuredActor(actor);
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(accessCorrectionRequest)
      .where(
        and(
          eq(accessCorrectionRequest.id, input.requestId),
          eq(accessCorrectionRequest.pharmacyId, pharmacyId),
          eq(accessCorrectionRequest.requestKind, "correction"),
        ),
      )
      .limit(1);
    if (!request) throw new Error("Correction request not found.");

    const [correction] = await tx
      .insert(recordCorrection)
      .values({
        pharmacyId,
        patientId: request.patientId,
        requestId: request.id,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        patch: input.patch,
        reason: input.reason,
        createdByUserId: actor.userId,
      })
      .returning();

    if (input.supersedesCorrectionId) {
      const superseded = await tx
        .update(recordCorrection)
        .set({ supersededById: correction.id })
        .where(
          and(
            eq(recordCorrection.id, input.supersedesCorrectionId),
            eq(recordCorrection.pharmacyId, pharmacyId),
            eq(recordCorrection.patientId, request.patientId),
            isNull(recordCorrection.supersededById),
          ),
        )
        .returning({ id: recordCorrection.id });
      if (superseded.length !== 1) {
        throw new Error("Active correction to supersede was not found.");
      }
    }

    await writeAuditWith(tx, {
      pharmacyId,
      patientId: request.patientId,
      actorUserId: actor.userId,
      action: "record.correction.created",
      entityType: "record_correction",
      entityId: correction.id,
      source: "governance_portal",
      metadata: {
        targetEntityType: input.targetEntityType,
        supersedes: Boolean(input.supersedesCorrectionId),
      },
    });
    return correction;
  });
}

export async function recordRestoreDrill(
  actor: PortalUser,
  input: {
    backupIdentifier: string;
    isolatedEnvironment: string;
    status: "planned" | "running" | "passed" | "failed";
    rowCounts?: Record<string, number>;
    integrityHashes?: Record<string, string>;
    evidenceLocation?: string;
    startedAt: Date;
    completedAt?: Date;
  },
) {
  const pharmacyId = configuredActor(actor);
  return db.transaction(async (tx) => {
    const [drill] = await tx
      .insert(restoreDrill)
      .values({
        pharmacyId,
        ...input,
        rowCounts: input.rowCounts ?? null,
        integrityHashes: input.integrityHashes ?? null,
        evidenceLocation: input.evidenceLocation ?? null,
        completedAt: input.completedAt ?? null,
        performedByUserId: actor.userId,
      })
      .returning();
    await writeAuditWith(tx, {
      pharmacyId,
      actorUserId: actor.userId,
      action: "restore_drill.recorded",
      entityType: "restore_drill",
      entityId: drill.id,
      source: "governance_portal",
      metadata: { status: input.status },
    });
    return drill;
  });
}

export async function prepareDestructionDryRun(
  actor: PortalUser,
  patientId: string,
) {
  const pharmacyId = configuredActor(actor);
  const record = await collectPatientRecord(actor, patientId);
  if (!record.retention) {
    throw new Error("The patient has no retention horizon.");
  }
  const { destructionArtifacts } = recordArtifacts(record);
  const activeHold = record.holds.some((hold) => hold.releasedAt === null);
  const eligible = record.retention.retainUntil <= new Date().toISOString().slice(0, 10);
  const status = activeHold || !eligible ? "blocked" : "dry_run";

  return db.transaction(async (tx) => {
    const [run] = await tx
      .insert(destructionRun)
      .values({
        pharmacyId,
        patientId,
        status,
        eligibleOn: record.retention!.retainUntil,
        artifacts: destructionArtifacts,
        preparedByUserId: actor.userId,
      })
      .returning();
    await writeAuditWith(tx, {
      pharmacyId,
      patientId,
      actorUserId: actor.userId,
      action: "record.destruction.dry_run",
      entityType: "destruction_run",
      entityId: run.id,
      source: "governance_portal",
      metadata: {
        status,
        recordCount: destructionArtifacts.reduce(
          (total, artifact) => total + artifact.count,
          0,
        ),
      },
    });
    return run;
  });
}

export async function executeDestruction(
  actor: PortalUser,
  destructionRunId: string,
): Promise<void> {
  configuredActor(actor);
  await db.execute(
    sql`select governance_execute_destruction(
      ${destructionRunId}::uuid,
      ${actor.userId}::uuid
    )`,
  );
}

export async function getGovernanceReport(actor: PortalUser) {
  const pharmacyId = configuredActor(actor);
  const [
    completeness,
    retention,
    exports,
    failures,
    requestStatuses,
    activeHolds,
    restoreDrills,
    destructionRuns,
  ] = await Promise.all([
    db.execute<{
      total: number;
      version_2_complete: number;
      legacy_version_1: number;
      with_active_claim_draft: number;
    }>(sql`
      select
        count(*)::int as total,
        count(*) filter (where a.record_version >= 2)::int as version_2_complete,
        count(*) filter (where a.record_version < 2)::int as legacy_version_1,
        count(*) filter (
          where exists (
            select 1 from claim_draft cd
            where cd.assessment_id = a.id and cd.superseded_by_id is null
          )
        )::int as with_active_claim_draft
      from assessment a
      where a.pharmacy_id = ${pharmacyId}::uuid
    `),
    db.execute<{
      patients_with_policy: number;
      eligible_now: number;
      active_holds: number;
      next_eligible_on: string | null;
    }>(sql`
      select
        count(*)::int as patients_with_policy,
        count(*) filter (where r.retain_until <= current_date)::int as eligible_now,
        count(*) filter (
          where exists (
            select 1 from record_hold h
            where h.patient_id = r.patient_id and h.released_at is null
          )
        )::int as active_holds,
        min(r.retain_until)::text as next_eligible_on
      from patient_record_retention r
      join patient p on p.id = r.patient_id
      where p.pharmacy_id = ${pharmacyId}::uuid
    `),
    db
      .select()
      .from(exportManifest)
      .where(eq(exportManifest.pharmacyId, pharmacyId))
      .orderBy(desc(exportManifest.generatedAt))
      .limit(20),
    db
      .select()
      .from(auditWriteFailure)
      .where(eq(auditWriteFailure.pharmacyId, pharmacyId))
      .orderBy(desc(auditWriteFailure.occurredAt))
      .limit(20),
    db.execute<{ status: string; count: number }>(sql`
      select status, count(*)::int as count
      from access_correction_request
      where pharmacy_id = ${pharmacyId}::uuid
      group by status
      order by status
    `),
    db
      .select()
      .from(recordHold)
      .where(
        and(
          eq(recordHold.pharmacyId, pharmacyId),
          isNull(recordHold.releasedAt),
        ),
      )
      .orderBy(desc(recordHold.startsAt)),
    db
      .select()
      .from(restoreDrill)
      .where(eq(restoreDrill.pharmacyId, pharmacyId))
      .orderBy(desc(restoreDrill.createdAt))
      .limit(20),
    db
      .select()
      .from(destructionRun)
      .where(eq(destructionRun.pharmacyId, pharmacyId))
      .orderBy(desc(destructionRun.preparedAt))
      .limit(20),
  ]);

  return {
    completeness: completeness[0],
    retention: retention[0],
    exports,
    failures,
    requestStatuses,
    activeHolds,
    restoreDrills,
    destructionRuns,
  };
}
