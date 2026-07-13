"use server";

import { db } from "@/lib/db";
import { intakeSession, triageExit } from "@/lib/db/schema";
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

export async function createIntakeSession(data: {
  pharmacyId: string;
  ailmentGroupCode: string;
  trail: { question: string; answer: string }[];
  priorCountSelfReport: number | null;
  existingRxSelfReport: string | null;
}) {
  try {
    const code = generateCode();
    
    // Set expiration to 2 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    const [session] = await db
      .insert(intakeSession)
      .values({
        code,
        pharmacyId: data.pharmacyId,
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
