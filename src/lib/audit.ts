import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

/**
 * Append a row to the append-only audit trail.
 *
 * The table is immutable at the database level (a trigger blocks UPDATE/DELETE
 * and the app role has those privileges revoked), so this only ever inserts.
 * `metadata` must contain references and non-PHI context only — never health
 * numbers, names, or dates of birth.
 */
export async function writeAudit(entry: {
  pharmacyId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditLog).values({
    pharmacyId: entry.pharmacyId ?? null,
    actorUserId: entry.actorUserId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? null,
  });
}
