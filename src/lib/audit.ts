import { db } from "@/lib/db";
import { auditLog, auditWriteFailure } from "@/lib/db/schema";
import { requireConfiguredPharmacyId } from "@/lib/pharmacy-config";

/**
 * Append a row to the append-only audit trail.
 *
 * The table is immutable at the database level (a trigger blocks UPDATE/DELETE
 * and the app role has those privileges revoked), so this only ever inserts.
 * `metadata` must contain references and non-PHI context only — never health
 * numbers, names, or dates of birth.
 */
export type AuditEntry = {
  pharmacyId?: string;
  patientId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

type AuditWriter = Pick<typeof db, "insert">;

export async function writeAuditWith(
  writer: AuditWriter,
  entry: AuditEntry,
): Promise<void> {
  const pharmacyId = requireConfiguredPharmacyId();
  if (entry.pharmacyId && entry.pharmacyId !== pharmacyId) {
    throw new Error("Refusing to write an audit event for a foreign pharmacy.");
  }

  await writer.insert(auditLog).values({
    pharmacyId,
    patientId: entry.patientId ?? null,
    actorUserId: entry.actorUserId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    source: entry.source ?? "server",
    metadata: entry.metadata ?? null,
  });
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  await writeAuditWith(db, entry);
}

/**
 * Best-effort non-PHI evidence when an audit insert fails. A total database
 * outage can defeat both writes, so callers still fail closed for governance
 * actions; this table captures partial/constraint failures for review.
 */
export async function recordAuditWriteFailure(
  entry: Pick<AuditEntry, "action" | "entityType" | "entityId" | "source">,
  error: unknown,
): Promise<void> {
  const pharmacyId = requireConfiguredPharmacyId();
  const failureCode = (() => {
    let cursor: unknown = error;
    while (cursor && typeof cursor === "object") {
      const code = (cursor as { code?: unknown }).code;
      if (typeof code === "string") return code;
      cursor = (cursor as { cause?: unknown }).cause;
    }
    return "UNKNOWN";
  })();

  try {
    await db.insert(auditWriteFailure).values({
      pharmacyId,
      attemptedAction: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      failureCode,
      source: entry.source ?? "server",
    });
  } catch {
    // No payload, PHI, or original exception is logged here.
  }
}
