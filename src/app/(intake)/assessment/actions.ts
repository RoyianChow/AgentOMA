"use server";

import { db } from "@/lib/db";
import { intakeSession, pharmacy, triageExit } from "@/lib/db/schema";
import { getConfiguredPharmacyId } from "@/lib/pharmacy-config";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Helper to generate a 6-character ambiguous-free code
function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // No 0/O, 1/I/L
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
}

/**
 * The intake runs on the PATIENT'S OWN PHONE (no session, no device config) —
 * the QR keeps /assessment?pharmacy=<uuid> for compatibility, but that
 * user-controlled value never selects a tenant. The server always resolves
 * the one configured PHARMACY_ID. Missing configuration fails closed.
 *
 * A pharmacy id is not PHI; the intake stays zero-PHI.
 */
export async function resolvePharmacy(
  requestedPharmacyId?: string
): Promise<{ id: string; storeName: string } | null> {
  // Kept only for legacy QR compatibility; deliberately never used to query.
  void requestedPharmacyId;
  const configuredPharmacyId = getConfiguredPharmacyId();
  if (!configuredPharmacyId) return null;
  const [row] = await db
    .select({ id: pharmacy.id, storeName: pharmacy.storeName })
    .from(pharmacy)
    .where(eq(pharmacy.id, configuredPharmacyId))
    .limit(1);
  return row ?? null;
}

export async function createIntakeSession(data: {
  ailmentGroupCode: string;
  trail: { question: string; answer: string }[];
  priorCountSelfReport: number | null;
  existingRxSelfReport: string | null;
}) {
  try {
    // Re-resolve server configuration on every write; no client tenant exists.
    const ph = await resolvePharmacy();
    if (!ph) {
      return {
        success: false,
        error: "This pharmacy intake is not configured. Please ask pharmacy staff for help.",
      };
    }
    const pharmacyId = ph.id;

    const code = generateCode();
    
    // Set expiration to 2 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    const [session] = await db
      .insert(intakeSession)
      .values({
        code,
        pharmacyId,
        ailmentGroupCode: data.ailmentGroupCode,
        trail: data.trail,
        priorCountSelfReport: data.priorCountSelfReport,
        existingRxSelfReport: data.existingRxSelfReport,
        consentCapturedAt: new Date(),
        expiresAt,
      })
      .returning();

    // Best-effort audit. No actor — the kiosk is the patient's own phone —
    // and no PHI exists to leak: the metadata is the ailment code only.
    try {
      const { writeAudit } = await import("@/lib/audit");
      await writeAudit({
        pharmacyId,
        action: "intake.created",
        entityType: "intake_session",
        entityId: session.id,
        metadata: { ailmentGroupCode: data.ailmentGroupCode },
      });
    } catch (auditErr) {
      console.error("AUDIT WRITE FAILED for intake_session", session.id, auditErr);
    }

    return { success: true, code: session.code };
  } catch (err) {
    console.error("Failed to create intake session:", err);
    return { success: false, error: "Failed to create intake session" };
  }
}

export async function logTriageExit(data: {
  ailmentGroupCode: string;
  reason: string;
}) {
  try {
    await db.insert(triageExit).values({
      ailmentGroupCode: data.ailmentGroupCode,
      reason: data.reason,
    });
    return { success: true };
  } catch (err) {
    console.error("Failed to log triage exit:", err);
    return { success: false, error: "Failed to log triage exit" };
  }
}
