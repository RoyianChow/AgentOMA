"use server";

import { db } from "@/lib/db";
import { intakeSession, pharmacy, triageExit } from "@/lib/db/schema";
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The intake runs on the PATIENT'S OWN PHONE (no session, no device config) —
 * the pharmacy comes from the per-pharmacy QR link: /assessment?pharmacy=<uuid>.
 * That is a user-controlled URL param, so it is validated here, server-side,
 * against the pharmacy table before anything is written. It must resolve to an
 * existing row or no intake session is created.
 *
 * A pharmacy id is not PHI; the intake stays zero-PHI.
 */
export async function resolvePharmacy(
  pharmacyId: string | undefined
): Promise<{ id: string; storeName: string } | null> {
  if (!pharmacyId || !UUID_RE.test(pharmacyId)) return null;
  const [row] = await db
    .select({ id: pharmacy.id, storeName: pharmacy.storeName })
    .from(pharmacy)
    .where(eq(pharmacy.id, pharmacyId))
    .limit(1);
  return row ?? null;
}

export async function createIntakeSession(data: {
  pharmacyId: string;
  ailmentGroupCode: string;
  trail: { question: string; answer: string }[];
  priorCountSelfReport: number | null;
  existingRxSelfReport: string | null;
}) {
  try {
    // Never trust the client-supplied id blindly — re-validate on every call.
    const ph = await resolvePharmacy(data.pharmacyId);
    if (!ph) {
      console.error("createIntakeSession: unknown pharmacy id from client:", data.pharmacyId);
      return {
        success: false,
        error: "This link isn't tied to a pharmacy. Please re-scan the pharmacy's code.",
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
