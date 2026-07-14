"use server";

import { db } from "@/lib/db";
import { intakeSession, assessment, patient, ailmentGroup, pin, claimRule } from "@/lib/db/schema";
import { eq, and, sql, desc, isNull, count } from "drizzle-orm";

export type PendingIntake = {
  id: string;
  code: string;
  ailmentGroupCode: string;
  createdAt: string;
  expiresAt: string;
  priorCountSelfReport: number | null;
  existingRxSelfReport: string | null;
  trailLength: number;
};

export type IntakeSessionDTO = {
  id: string;
  code: string;
  pharmacyId: string;
  ailmentGroupCode: string;
  trail: { question: string; answer: string }[] | null;
  priorCountSelfReport: number | null;
  existingRxSelfReport: string | null;
};

export type DashboardStats = {
  todayAssessments: number;
  todayRevenueCents: number;
  pendingIntakes: number;
};

export type RecentAssessment = {
  id: string;
  patientName: string;
  ailmentGroupCode: string;
  outcome: string;
  serviceDate: string;
  createdAt: string;
};

const pendingPredicate = (pharmacyId: string) =>
  and(
    eq(intakeSession.pharmacyId, pharmacyId),
    isNull(intakeSession.consumedAt),
    sql`${intakeSession.expiresAt} > now()`
  );

export async function getPendingIntakeSessions(pharmacyId: string): Promise<{
  success: boolean;
  sessions: PendingIntake[];
}> {
  try {
    const rows = await db.query.intakeSession.findMany({
      where: pendingPredicate(pharmacyId),
      orderBy: desc(intakeSession.createdAt),
    });

    return {
      success: true,
      sessions: rows.map((s) => ({
        id: s.id,
        code: s.code,
        ailmentGroupCode: s.ailmentGroupCode,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        priorCountSelfReport: s.priorCountSelfReport,
        existingRxSelfReport: s.existingRxSelfReport,
        trailLength: s.trail?.length ?? 0,
      })),
    };
  } catch (err) {
    console.error("Failed to fetch pending intake sessions:", err);
    return { success: false, sessions: [] };
  }
}

export async function getIntakeSessionById(
  id: string,
  pharmacyId: string
): Promise<
  | { success: true; session: IntakeSessionDTO }
  | { success: false; error: string }
> {
  try {
    const session = await db.query.intakeSession.findFirst({
      where: and(eq(intakeSession.id, id), pendingPredicate(pharmacyId)),
    });

    if (!session) {
      return {
        success: false,
        error: "This intake is no longer available — it may have expired or already been completed.",
      };
    }

    return {
      success: true,
      session: {
        id: session.id,
        code: session.code,
        pharmacyId: session.pharmacyId,
        ailmentGroupCode: session.ailmentGroupCode,
        trail: session.trail,
        priorCountSelfReport: session.priorCountSelfReport,
        existingRxSelfReport: session.existingRxSelfReport,
      },
    };
  } catch (err) {
    console.error("Failed to load intake session:", err);
    return { success: false, error: "Database error" };
  }
}

export async function getDashboardStats(pharmacyId: string): Promise<DashboardStats> {
  try {
    const today = new Date();

    const [todayRows, [pending], pinRows] = await Promise.all([
      db
        .select({
          ailmentGroupCode: assessment.ailmentGroupCode,
          modality: assessment.modality,
          outcome: assessment.outcome,
        })
        .from(assessment)
        .where(
          and(
            eq(assessment.pharmacyId, pharmacyId),
            eq(assessment.serviceDate, today)
          )
        ),
      db
        .select({ value: count() })
        .from(intakeSession)
        .where(pendingPredicate(pharmacyId)),
      db
        .select({
          code: ailmentGroup.code,
          modality: pin.modality,
          rxIssued: pin.rxIssued,
          feeCents: pin.feeCents,
        })
        .from(pin)
        .innerJoin(ailmentGroup, eq(pin.ailmentGroupId, ailmentGroup.id))
        .where(isNull(pin.endDate)),
    ]);

    const feeByKey = new Map(
      pinRows.map((p) => [`${p.code}|${p.modality}|${p.rxIssued}`, p.feeCents])
    );

    const todayRevenueCents = todayRows.reduce((sum, a) => {
      const billingModality = a.modality === "in_person" ? "in_person" : "virtual";
      const rxIssued = a.outcome === "rx_issued";
      return sum + (feeByKey.get(`${a.ailmentGroupCode}|${billingModality}|${rxIssued}`) ?? 0);
    }, 0);

    return {
      todayAssessments: todayRows.length,
      todayRevenueCents,
      pendingIntakes: pending.value,
    };
  } catch (err) {
    console.error("Failed to compute dashboard stats:", err);
    return { todayAssessments: 0, todayRevenueCents: 0, pendingIntakes: 0 };
  }
}

export async function getRecentAssessments(limit = 8): Promise<RecentAssessment[]> {
  try {
    const data = await db
      .select({
        id: assessment.id,
        patientName: sql<string>`${patient.firstName} || ' ' || ${patient.lastName}`,
        ailmentGroupCode: assessment.ailmentGroupCode,
        outcome: assessment.outcome,
        serviceDate: assessment.serviceDate,
        createdAt: assessment.createdAt,
      })
      .from(assessment)
      .innerJoin(patient, eq(assessment.patientId, patient.id))
      .orderBy(desc(assessment.createdAt))
      .limit(limit);

    return data.map((a) => ({
      ...a,
      serviceDate: a.serviceDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("Failed to fetch recent assessments:", err);
    return [];
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
      // patient.dob is a plain date column (string mode) — YYYY-MM-DD only
      dob: new Date(data.dob).toISOString().slice(0, 10),
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
  } catch (err: unknown) {
    console.error("Failed to create assessment:", err);
    // Unique violation in Postgres
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
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
