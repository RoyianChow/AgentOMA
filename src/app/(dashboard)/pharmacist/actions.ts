"use server";

import { db } from "@/lib/db";
import { intakeSession, assessment, patient, pharmacy, ailmentGroup, pin, claimRule, claimDraft } from "@/lib/db/schema";
import { user } from "@/lib/db/schema/auth";
import { eq, and, sql, desc, isNull, count } from "drizzle-orm";
import { computeRetainUntil } from "@/lib/retention";
import { writeAudit } from "@/lib/audit";
import {
  requirePortalUser,
  AuthorizationError,
  ASSESSING_ROLES,
  type PortalUser,
} from "@/lib/auth-guard";
import {
  deriveClaimDraft,
  NOT_BILLABLE_MESSAGES,
  type ResolvePin,
  type AssessmentModality,
  type Outcome,
  type OdbFeeTier,
} from "@/lib/claims/derive-claim-draft";

// SECURITY MODEL — why every action below starts with requirePortalUser():
// proxy.ts only performs an optimistic cookie-presence redirect for UX; a
// crafted request bypasses it entirely. Server actions are directly invokable
// HTTP endpoints, so THE authorization check has to live here, inside each
// action, where the action runs. requirePortalUser re-verifies the session
// against the database (revocable, 30-min rolling), requires TOTP enrollment,
// and pins the actor to their pharmacy — which is also where tenancy comes
// from: pharmacyId is never accepted from the client.

/** Roles that may record an assessment: pharmacists/admins on their own OCP
 * number, interns/students under their supervising pharmacist's. Technicians
 * never record assessments. */
const RECORDING_ROLES = [...ASSESSING_ROLES, "intern", "student"] as const;

function refusalMessage(e: AuthorizationError): string {
  switch (e.reason) {
    case "UNAUTHENTICATED":
      return "You are signed out. Sign in and try again.";
    case "TOTP_ENROLLMENT_REQUIRED":
      return "Two-factor authentication must be set up before using the portal.";
    case "NO_PHARMACY":
      return "Your account is not assigned to a pharmacy. Ask your pharmacy admin.";
    case "FORBIDDEN_ROLE":
      return "Your role does not permit this action.";
  }
}

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
  /** When the patient ticked consent on their own phone; the pharmacist still
   * re-confirms in person. */
  consentCapturedAt: string | null;
  createdAt: string;
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

export async function getPendingIntakeSessions(): Promise<{
  success: boolean;
  sessions: PendingIntake[];
}> {
  try {
    // Session + role re-verified here, not in proxy.ts (see SECURITY MODEL).
    const actor = await requirePortalUser();
    const rows = await db.query.intakeSession.findMany({
      where: pendingPredicate(actor.pharmacyId),
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
    if (err instanceof AuthorizationError) return { success: false, sessions: [] };
    console.error("Failed to fetch pending intake sessions:", err);
    return { success: false, sessions: [] };
  }
}

export async function getIntakeSessionById(
  id: string
): Promise<
  | { success: true; session: IntakeSessionDTO }
  | { success: false; error: string }
> {
  try {
    // Session + role re-verified here, not in proxy.ts (see SECURITY MODEL).
    // Tenancy: the lookup is scoped to the actor's pharmacy, so an id from
    // another pharmacy simply doesn't resolve.
    const actor = await requirePortalUser();
    const session = await db.query.intakeSession.findFirst({
      where: and(eq(intakeSession.id, id), pendingPredicate(actor.pharmacyId)),
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
        consentCapturedAt: session.consentCapturedAt?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: refusalMessage(err) };
    }
    console.error("Failed to load intake session:", err);
    return { success: false, error: "Database error" };
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Session + role re-verified here, not in proxy.ts (see SECURITY MODEL).
    const { pharmacyId } = await requirePortalUser();
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
    if (err instanceof AuthorizationError) {
      return { todayAssessments: 0, todayRevenueCents: 0, pendingIntakes: 0 };
    }
    console.error("Failed to compute dashboard stats:", err);
    return { todayAssessments: 0, todayRevenueCents: 0, pendingIntakes: 0 };
  }
}

export async function getRecentAssessments(limit = 8): Promise<RecentAssessment[]> {
  try {
    // Session + role re-verified here, not in proxy.ts (see SECURITY MODEL).
    // Also scopes to the actor's pharmacy — this query joins patient names.
    const { pharmacyId } = await requirePortalUser();
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
      .where(eq(assessment.pharmacyId, pharmacyId))
      .orderBy(desc(assessment.createdAt))
      .limit(limit);

    return data.map((a) => ({
      ...a,
      serviceDate: a.serviceDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
    }));
  } catch (err) {
    if (err instanceof AuthorizationError) return [];
    console.error("Failed to fetch recent assessments:", err);
    return [];
  }
}

// Internal (not exported): exported functions in a "use server" file are
// public HTTP endpoints, and this one takes a raw patientId. createAssessment
// calls it after the guard.
async function checkSameDayMutex(patientId: string, ailmentGroupCode: string, serviceDate: Date) {
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

export async function upsertPatient(data: {
  firstName: string;
  lastName: string;
  dob: Date;
  healthNumber: string;
  gender: "F" | "M" | "U";
}): Promise<
  { success: true; patientId: string } | { success: false; error: string }
> {
  try {
    // Session + role re-verified here, not in proxy.ts (see SECURITY MODEL).
    // The patient row lands in the ACTOR's pharmacy — never a caller-supplied
    // one.
    const { pharmacyId, userId } = await requirePortalUser();

    const existing = await db.query.patient.findFirst({
      where: and(
        eq(patient.pharmacyId, pharmacyId),
        eq(patient.healthNumber, data.healthNumber)
      ),
    });
    if (existing) return { success: true, patientId: existing.id };

    const [row] = await db
      .insert(patient)
      .values({
        pharmacyId,
        firstName: data.firstName,
        lastName: data.lastName,
        // Convert the Date object to a YYYY-MM-DD string for Postgres
        dob: data.dob.toISOString().split("T")[0],
        healthNumber: data.healthNumber,
        gender: data.gender,
      })
      .returning({ id: patient.id });

    // Best-effort audit; the row reference only — never name/DOB/health number.
    try {
      await writeAudit({
        pharmacyId,
        actorUserId: userId,
        action: "patient.created",
        entityType: "patient",
        entityId: row.id,
      });
    } catch (auditErr) {
      console.error("AUDIT WRITE FAILED for patient", row.id, auditErr);
    }

    return { success: true, patientId: row.id };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: refusalMessage(err) };
    }
    console.error("Failed to upsert patient:", err);
    return { success: false, error: "Database error" };
  }
}

/**
 * The prescriber identity that goes on a claim. NEVER typed into a form:
 * pharmacists/admins bill on their own profile's OCP number (or PHR888 under
 * As-of-Right); interns/students bill on their SUPERVISING pharmacist's. The
 * rows are read fresh from the database — not from the session snapshot — so
 * a profile fix takes effect immediately.
 */
async function resolvePrescriberIdentity(
  actor: PortalUser
): Promise<
  | {
      ok: true;
      ocpNumber: string | null;
      isAsOfRight: boolean;
      orientationCompletedAt: Date | null;
    }
  | { ok: false; error: string }
> {
  if (actor.role === "intern" || actor.role === "student") {
    if (!actor.supervisingPharmacistId) {
      return {
        ok: false,
        error:
          "No supervising pharmacist is linked to your account. An intern or student records assessments under a supervising pharmacist, whose OCP number goes on the claim.",
      };
    }
    const supervisor = await db.query.user.findFirst({
      where: eq(user.id, actor.supervisingPharmacistId),
    });
    const supervisorOk =
      supervisor &&
      supervisor.pharmacyId === actor.pharmacyId &&
      (supervisor.role === "pharmacist" || supervisor.role === "pharmacy_admin");
    if (!supervisorOk) {
      return {
        ok: false,
        error: "Your supervising pharmacist is not valid for this pharmacy. Ask your pharmacy admin.",
      };
    }
    return {
      ok: true,
      ocpNumber: supervisor.ocpNumber,
      isAsOfRight: supervisor.isAsOfRight,
      orientationCompletedAt: supervisor.orientationCompletedAt,
    };
  }

  const self = await db.query.user.findFirst({ where: eq(user.id, actor.userId) });
  return {
    ok: true,
    ocpNumber: self?.ocpNumber ?? null,
    isAsOfRight: self?.isAsOfRight ?? false,
    orientationCompletedAt: self?.orientationCompletedAt ?? null,
  };
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
  patientId: string;
  ailmentGroupCode: string;
  modality: string;
  virtualLocation?: string;
  remoteReason?: string;
  intakeSessionId: string;
  outcome: string;
  noRxRationaleCode?: string;
  serviceDate: Date;
  // --- claim inputs: facts about the patient/visit, not the prescriber.
  // Prescriber identity comes from the authenticated profile below.
  isOdbRecipient?: boolean;
  ltc?: { isResident: boolean; providerRole?: "primary" | "secondary"; isEmergency?: boolean };
}) {
  try {
    // 0. AUTHORIZATION — here, in the action, not in proxy.ts (see SECURITY
    //    MODEL above). Pharmacy and pharmacist identity both come from the
    //    verified session: the caller cannot bill as someone else or into
    //    another pharmacy. Technicians cannot record assessments.
    const actor = await requirePortalUser(RECORDING_ROLES);
    const pharmacyId = actor.pharmacyId;

    const prescriber = await resolvePrescriberIdentity(actor);
    if (!prescriber.ok) {
      return { success: false, error: prescriber.error };
    }

    // 0a. ORIENTATION GATE. The prescriber on the claim (the supervisor, for
    //     an intern/student) must have a recorded OCP "Mandatory Orientation
    //     for Minor Ailments Module" completion. This refuses HERE — server-
    //     side, before ANY row is written and before deriveClaimDraft is ever
    //     called. A UI-only gate is not a gate.
    if (!prescriber.orientationCompletedAt) {
      return {
        success: false,
        error:
          "The prescribing pharmacist has no recorded completion of OCP's Mandatory Orientation for Minor Ailments Module. A billable assessment cannot be completed until a pharmacy admin records it on their profile.",
      };
    }

    // 0b. Tenancy: the patient must belong to the actor's pharmacy.
    const pat = await db.query.patient.findFirst({
      where: and(eq(patient.id, data.patientId), eq(patient.pharmacyId, pharmacyId)),
    });
    if (!pat) {
      return { success: false, error: "Patient not found" };
    }

    // 1. Remote-virtual eligibility (#5). Only rural-fee-tier pharmacies may
    //    provide remote virtual services, and the location/reason must be on file.
    if (data.modality === "virtual_remote") {
      const ph = await db.query.pharmacy.findFirst({
        where: eq(pharmacy.id, pharmacyId),
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
    //    (Patient row already loaded — and pharmacy-scoped — in step 0b.)
    const retainUntil = computeRetainUntil(new Date(data.serviceDate), new Date(pat.dob));

    // 3b. Every assessment must trace back to a real, submitted intake — no
    //     walk-in/cold-start path. It must belong to this pharmacy.
    const intake = await db.query.intakeSession.findFirst({
      where: and(
        eq(intakeSession.id, data.intakeSessionId),
        eq(intakeSession.pharmacyId, pharmacyId)
      ),
    });
    if (!intake) {
      return { success: false, error: "Intake session not found for this pharmacy." };
    }

    // 4. Insert Assessment. The recording user is the ACTOR (audit truth —
    //    who performed the work), even when the claim's prescriber is their
    //    supervisor.
    const [newAssessment] = await db.insert(assessment).values({
      pharmacyId,
      pharmacistUserId: actor.userId,
      patientId: data.patientId,
      ailmentGroupCode: data.ailmentGroupCode,
      modality: data.modality,
      virtualLocation: data.virtualLocation || null,
      remoteReason: data.remoteReason || null,
      intakeSessionId: data.intakeSessionId,
      outcome: data.outcome,
      noRxRationaleCode: data.noRxRationaleCode || null,
      serviceDate: new Date(data.serviceDate),
      retainUntil,
    }).returning({ id: assessment.id });

    // 5. Consume the intake session — single-use.
    await db.update(intakeSession)
      .set({
        consumedAt: new Date(),
        consumedByAssessmentId: newAssessment.id,
      })
      .where(eq(intakeSession.id, data.intakeSessionId));

    // 6. Derive the claim draft. The assessment itself is recorded either way —
    //    the pharmacist did the work — but a NON-BILLABLE result persists NO
    //    claim_draft row. deriveClaimDraft stays pure: we do the PIN lookup here
    //    and pass it in. Prescriber identity is the PROFILE's (resolved in
    //    step 0 — the supervisor's for interns/students), never caller input.
    const ph = await db.query.pharmacy.findFirst({ where: eq(pharmacy.id, pharmacyId) });
    const claim = deriveClaimDraft({
      ailmentGroupCode: data.ailmentGroupCode,
      modality: data.modality as AssessmentModality,
      outcome: data.outcome as Outcome,
      resolvePin: await loadResolvePin(),
      prescriber: {
        ocpRegistrationNumber: prescriber.ocpNumber,
        isAsOfRightWithoutOntarioLicence: prescriber.isAsOfRight,
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
        pharmacyId,
        actorUserId: actor.userId,
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
    if (err instanceof AuthorizationError) {
      return { success: false, error: refusalMessage(err) };
    }
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
    // Session + role re-verified here, not in proxy.ts (see SECURITY MODEL).
    // The count is computed only for a patient of the actor's own pharmacy.
    const { pharmacyId } = await requirePortalUser();
    const pat = await db.query.patient.findFirst({
      where: and(eq(patient.id, patientId), eq(patient.pharmacyId, pharmacyId)),
    });
    if (!pat) return { success: false, count: 0 };

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
    if (err instanceof AuthorizationError) return { success: false, count: 0 };
    console.error("Failed to get patient history:", err);
    return { success: false, count: 0 };
  }
}

// getAllAssessments is GONE on purpose: it was a public "use server" endpoint
// returning patient identity for a client component to render. The audit page
// is now fully server-rendered (audit/page.tsx + audit/query.ts), so the
// endpoint had zero callers and shipping PHI to browser JS is exactly what
// the definition of done forbids.
