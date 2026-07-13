"use server";

import { db } from "@/lib/db";
import { intakeSession, assessment, patient, ailmentGroup, claimRule } from "@/lib/db/schema";
import { eq, and, sql, desc, or, isNull } from "drizzle-orm";

export async function claimIntakeSession(code: string, pharmacyId: string) {
  try {
    const session = await db.query.intakeSession.findFirst({
      where: and(
        eq(intakeSession.code, code.toUpperCase()),
        eq(intakeSession.pharmacyId, pharmacyId),
        isNull(intakeSession.consumedAt),
        sql`${intakeSession.expiresAt} > now()`
      )
    });

    if (!session) {
      return { success: false, error: "Invalid, expired, or already consumed code." };
    }

    return { success: true, session };
  } catch (err) {
    console.error("Failed to claim intake session:", err);
    return { success: false, error: "Database error" };
  }
}

export async function checkSameDayMutex(patientId: string, ailmentGroupCode: string, serviceDate: Date) {
  // Find if there are any same_day_mutex claim rules
  const rules = await db.query.claimRule.findMany({
    where: eq(claimRule.ruleType, "same_day_mutex")
  });

  for (const rule of rules) {
    const codes = rule.ailmentCodes as string[];
    if (codes && codes.includes(ailmentGroupCode)) {
      // Check if patient had any of the OTHER codes in the mutex group today
      const otherCodes = codes.filter(c => c !== ailmentGroupCode);
      for (const otherCode of otherCodes) {
        const existing = await db.query.assessment.findFirst({
          where: and(
            eq(assessment.patientId, patientId),
            eq(assessment.ailmentGroupCode, otherCode),
            eq(assessment.serviceDate, serviceDate)
          )
        });
        if (existing) {
          return {
            allowed: false,
            reason: `Patient already assessed for ${otherCode} today. ${rule.description}`
          };
        }
      }
    }
  }

  return { allowed: true };
}

// Ensure patient exists or create new
export async function upsertPatient(data: {
  firstName: string;
  lastName: string;
  dob: Date;
  healthNumber: string;
  gender: string;
}) {
  try {
    const existing = await db.query.patient.findFirst({
      where: eq(patient.healthNumber, data.healthNumber)
    });

    if (existing) {
      return { success: true, patientId: existing.id };
    }

    const [newPatient] = await db.insert(patient).values({
      firstName: data.firstName,
      lastName: data.lastName,
      dob: new Date(data.dob),
      healthNumber: data.healthNumber,
      gender: data.gender,
    }).returning({ id: patient.id });

    return { success: true, patientId: newPatient.id };
  } catch (err) {
    console.error("Failed to upsert patient:", err);
    return { success: false, error: "Failed to save patient" };
  }
}

export async function createAssessment(data: {
  pharmacyId: string;
  pharmacistUserId?: string;
  patientId: string;
  ailmentGroupCode: string;
  modality: string;
  virtualLocation?: string;
  remoteReason?: string;
  intakeSessionId?: string;
  outcome: string;
  noRxRationaleCode?: string;
  serviceDate: Date;
}) {
  try {
    // 1. Check same day mutex
    const mutexCheck = await checkSameDayMutex(data.patientId, data.ailmentGroupCode, new Date(data.serviceDate));
    if (!mutexCheck.allowed) {
      return { success: false, error: mutexCheck.reason };
    }

    // Retain for 10 years
    const retainUntil = new Date(data.serviceDate);
    retainUntil.setFullYear(retainUntil.getFullYear() + 10);

    // 2. Insert Assessment
    const [newAssessment] = await db.insert(assessment).values({
      pharmacyId: data.pharmacyId,
      pharmacistUserId: data.pharmacistUserId || null,
      patientId: data.patientId,
      ailmentGroupCode: data.ailmentGroupCode,
      modality: data.modality,
      virtualLocation: data.virtualLocation || null,
      remoteReason: data.remoteReason || null,
      intakeSessionId: data.intakeSessionId || null,
      outcome: data.outcome,
      noRxRationaleCode: data.noRxRationaleCode || null,
      serviceDate: new Date(data.serviceDate),
      retainUntil,
    }).returning({ id: assessment.id });

    // 3. Consume intake session if provided
    if (data.intakeSessionId) {
      await db.update(intakeSession)
        .set({
          consumedAt: new Date(),
          consumedByAssessmentId: newAssessment.id,
        })
        .where(eq(intakeSession.id, data.intakeSessionId));
    }

    return { success: true, assessmentId: newAssessment.id };
  } catch (err: any) {
    console.error("Failed to create assessment:", err);
    if (err.code === "23505") { // Unique violation in Postgres
      return { success: false, error: "Patient already has an assessment for this ailment today." };
    }
    return { success: false, error: "Database error" };
  }
}

export async function getPatientHistoryCount(patientId: string, ailmentGroupCode: string) {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const countResult = await db.query.assessment.findMany({
      where: and(
        eq(assessment.patientId, patientId),
        eq(assessment.ailmentGroupCode, ailmentGroupCode),
        sql`${assessment.serviceDate} >= ${oneYearAgo.toISOString().split('T')[0]}::date`
      )
    });
    return { success: true, count: countResult.length };
  } catch (err) {
    console.error("Failed to get patient history:", err);
    return { success: false, count: 0 };
  }
}

export async function getAllAssessments() {
  try {
    const data = await db
      .select({
        id: assessment.id,
        patientName: sql<string>`${patient.firstName} || ' ' || ${patient.lastName}`,
        dob: patient.dob,
        healthNumber: patient.healthNumber,
        ailmentGroupCode: assessment.ailmentGroupCode,
        outcome: assessment.outcome,
        serviceDate: assessment.serviceDate,
        createdAt: assessment.createdAt,
      })
      .from(assessment)
      .innerJoin(patient, eq(assessment.patientId, patient.id))
      .orderBy(desc(assessment.createdAt));
      
    // Stringify and parse to convert Dates
    return JSON.parse(JSON.stringify(data));
  } catch (err) {
    console.error("Failed to fetch all assessments from Supabase:", err);
    return [];
  }
}
