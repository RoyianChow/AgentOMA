"use server";

import { db } from "@/lib/db";
import { intakeSession, assessment, patient, pharmacy, ailmentGroup, pin, claimRule, claimDraft } from "@/lib/db/schema";
import { eq, and, sql, desc, isNull, count } from "drizzle-orm";
import { computeRetainUntil } from "@/lib/retention";
import { writeAudit } from "@/lib/audit";
import {
  deriveClaimDraft,
  NOT_BILLABLE_MESSAGES,
  type ResolvePin,
  type AssessmentModality,
  type Outcome,
  type OdbFeeTier,
} from "@/lib/claims/derive-claim-draft";

// ODB fee tiers permitted to provide remote virtual services (EO Notice). A
// regular-fee pharmacy ($8.83) selecting virtual_remote is hard-blocked.
const RURAL_FEE_TIERS = ["rural_9_93", "rural_12_14", "rural_13_25"];

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
} export async function upsertPatient(data: {
  pharmacyId: string;
  firstName: string;
  lastName: string;
  dob: Date;
  healthNumber: string;
  gender: "F" | "M" | "U";
}) {
  const existing = await db.query.patient.findFirst({
    where: and(
      eq(patient.pharmacyId, data.pharmacyId),
      eq(patient.healthNumber, data.healthNumber)
    ),
  });
  if (existing) return { success: true, patientId: existing.id };

  // Convert the Date object to a YYYY-MM-DD string for Postgres
  const insertData = {
    ...data,
    dob: data.dob.toISOString().split('T')[0],
  };

  const [row] = await db.insert(patient).values(insertData).returning({ id: patient.id });
  return { success: true, patientId: row.id };
}

/**
 * Builds a `resolvePin` over the SEEDED reference tables.
 *
 * deriveClaimDraft is pure and takes this as an argument — the DB lookup lives
 * here, in the caller, on purpose. Only currently-effective PIN rows are loaded
 * (end_date IS NULL), so a future revision can coexist without being picked up
 * early. If a combination has no row, the map returns undefined and
 * deriveClaimDraft REFUSES; it must never fall back to a default.
 */
async function loadResolvePin(): Promise<ResolvePin> {
  const rows = await db
    .select({
      code: ailmentGroup.code,
      modality: pin.modality,
      rxIssued: pin.rxIssued,
      pinCode: pin.pinCode,
      feeCents: pin.feeCents,
    })
    .from(pin)
    .innerJoin(ailmentGroup, eq(pin.ailmentGroupId, ailmentGroup.id))
    .where(isNull(pin.endDate));

  const byKey = new Map(
    rows.map((r) => [`${r.code}|${r.modality}|${r.rxIssued}`, { pinCode: r.pinCode, feeCents: r.feeCents }]),
  );
  return (code, modality, rxIssued) => byKey.get(`${code}|${modality}|${rxIssued}`);
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
  // --- claim inputs ---
  // TODO(auth, Part 4): prescriber identity must come from the authenticated
  // session's pharmacist profile, not the caller. Passed in until auth lands.
  prescriberOcpNumber?: string;
  isAsOfRightWithoutOntarioLicence?: boolean;
  isOdbRecipient?: boolean;
  ltc?: { isResident: boolean; providerRole?: "primary" | "secondary"; isEmergency?: boolean };
}) {
  try {
    // 1. Remote-virtual eligibility (#5). Only rural-fee-tier pharmacies may
    //    provide remote virtual services, and the location/reason must be on file.
    if (data.modality === "virtual_remote") {
      const ph = await db.query.pharmacy.findFirst({
        where: eq(pharmacy.id, data.pharmacyId),
      });
      if (!ph || !RURAL_FEE_TIERS.includes(ph.odbFeeTier)) {
        return {
          success: false,
          error:
            "Remote virtual assessments are only permitted for rural-fee-tier pharmacies ($9.93 / $12.14 / $13.25). This pharmacy is on the regular ODB fee tier ($8.83).",
        };
      }
      if (!data.remoteReason || !data.virtualLocation) {
        return {
          success: false,
          error:
            "A remote virtual assessment must record the pharmacist's physical location and the reason on-site staff cannot meet demand.",
        };
      }
    }

    // 2. Same-day mutex pre-check for a friendly message. The DATABASE trigger
    //    (assessment_same_day_mutex_trg) is the race-safe backstop; this only
    //    improves the common-case UX.
    const mutexCheck = await checkSameDayMutex(data.patientId, data.ailmentGroupCode, new Date(data.serviceDate));
    if (!mutexCheck.allowed) {
      return { success: false, error: mutexCheck.reason };
    }

    // 3. Retention (#7): max(service + 10y, (dob + 18y) + 10y). The age-18
    //    branch is why a child's record outlives the flat 10-year clock.
    const pat = await db.query.patient.findFirst({
      where: eq(patient.id, data.patientId),
    });
    if (!pat) {
      return { success: false, error: "Patient not found" };
    }
    const retainUntil = computeRetainUntil(new Date(data.serviceDate), new Date(pat.dob));

    // 4. Insert Assessment
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

    // 5. Consume intake session if provided
    if (data.intakeSessionId) {
      await db.update(intakeSession)
        .set({
          consumedAt: new Date(),
          consumedByAssessmentId: newAssessment.id,
        })
        .where(eq(intakeSession.id, data.intakeSessionId));
    }

    // 6. Derive the claim draft. The assessment itself is recorded either way —
    //    the pharmacist did the work — but a NON-BILLABLE result persists NO
    //    claim_draft row. deriveClaimDraft stays pure: we do the PIN lookup here
    //    and pass it in.
    const ph = await db.query.pharmacy.findFirst({ where: eq(pharmacy.id, data.pharmacyId) });
    const claim = deriveClaimDraft({
      ailmentGroupCode: data.ailmentGroupCode,
      modality: data.modality as AssessmentModality,
      outcome: data.outcome as Outcome,
      resolvePin: await loadResolvePin(),
      prescriber: {
        ocpRegistrationNumber: data.prescriberOcpNumber,
        isAsOfRightWithoutOntarioLicence: data.isAsOfRightWithoutOntarioLicence,
      },
      isOdbRecipient: data.isOdbRecipient ?? true,
      pharmacyFeeTier: (ph?.odbFeeTier ?? "regular_8_83") as OdbFeeTier,
      virtualLocation: data.virtualLocation,
      remoteReason: data.remoteReason,
      ltc: data.ltc,
    });

    if (claim.billable) {
      await db.insert(claimDraft).values({
        assessmentId: newAssessment.id,
        ailmentGroupCode: claim.draft.ailmentGroupCode,
        modality: claim.draft.modality,
        billingModality: claim.draft.billingModality,
        rxIssued: claim.draft.rxIssued,
        pinCode: claim.draft.pinCode,
        feeCents: claim.draft.feeCents,
        prescriberIdReference: claim.draft.prescriberIdReference,
        prescriberId: claim.draft.prescriberId,
        interventionCodes: claim.draft.interventionCodes,
        carrierId: claim.draft.carrierId,
        quantity: claim.draft.quantity,
        ssc: claim.draft.ssc,
      });
    }

    // 7. Audit (append-only). Best-effort: a failed audit write must not undo a
    //    created assessment, but it is logged loudly. No PHI in metadata.
    try {
      await writeAudit({
        pharmacyId: data.pharmacyId,
        actorUserId: data.pharmacistUserId,
        action: claim.billable ? "assessment.created.claim_drafted" : "assessment.created.no_claim",
        entityType: "assessment",
        entityId: newAssessment.id,
        metadata: {
          ailmentGroupCode: data.ailmentGroupCode,
          modality: data.modality,
          outcome: data.outcome,
          billable: claim.billable,
          ...(claim.billable ? { pinCode: claim.draft.pinCode } : { notBillableReason: claim.reason }),
        },
      });
    } catch (auditErr) {
      console.error("AUDIT WRITE FAILED for assessment", newAssessment.id, auditErr);
    }

    return {
      success: true,
      assessmentId: newAssessment.id,
      claim: claim.billable
        ? { billable: true as const, draft: claim.draft }
        : {
            billable: false as const,
            reason: claim.reason,
            message: NOT_BILLABLE_MESSAGES[claim.reason],
          },
    };
  } catch (err: unknown) {
    console.error("Failed to create assessment:", err);
    const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: string }).code : undefined;
    // One claim per person / ailment / day (unique index).
    if (code === "23505") {
      return { success: false, error: "Patient already has an assessment for this ailment today." };
    }
    // Same-day mutex trigger fired on a concurrent insert (23P01).
    if (code === "23P01") {
      return {
        success: false,
        error: "This patient was already assessed today for a condition that can't be claimed alongside this one (e.g. insect bites and tick bites).",
      };
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
