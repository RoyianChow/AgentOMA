"use server";

import { db } from "@/lib/db";
import { intakeSession, pharmacy, triageExit } from "@/lib/db/schema";
import { env } from "@/env";
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
 * The kiosk is deliberately unauthenticated (the whole intake is zero-PHI), so
 * the pharmacy an intake belongs to is resolved SERVER-SIDE, never taken from
 * the client:
 *
 *   1. KIOSK_PHARMACY_ID (env) — per-deployment provisioning; the row must
 *      exist.
 *   2. Otherwise, exactly one pharmacy row → unambiguous, use it.
 *   3. Otherwise refuse loudly: multi-pharmacy hosting needs real per-device
 *      provisioning before the kiosk can run un-bound.
 */
async function resolveKioskPharmacyId(): Promise<string | null> {
  if (env.KIOSK_PHARMACY_ID) {
    const [row] = await db
      .select({ id: pharmacy.id })
      .from(pharmacy)
      .where(eq(pharmacy.id, env.KIOSK_PHARMACY_ID))
      .limit(1);
    return row?.id ?? null;
  }
  const rows = await db.select({ id: pharmacy.id }).from(pharmacy).limit(2);
  return rows.length === 1 ? rows[0].id : null;
}

export async function createIntakeSession(data: {
  ailmentGroupCode: string;
  trail: { question: string; answer: string }[];
  priorCountSelfReport: number | null;
  existingRxSelfReport: string | null;
}) {
  try {
    const pharmacyId = await resolveKioskPharmacyId();
    if (!pharmacyId) {
      console.error(
        "createIntakeSession: pharmacy is ambiguous (0 or 2+ rows) — kiosk provisioning required."
      );
      return { success: false, error: "This kiosk is not configured. Please speak to the pharmacist." };
    }

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
