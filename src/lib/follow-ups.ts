import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";

import { writeAuditWith } from "@/lib/audit";
import type { PortalUser } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import {
  assessment,
  followUp,
  patient,
} from "@/lib/db/schema";
import {
  followUpAttemptSchema,
  parseFollowUpPlan,
  type FollowUpAttemptInput,
  type FollowUpMethod,
  type FollowUpNextStep,
  type FollowUpPlanInput,
} from "@/lib/follow-up-schema";
import { requireConfiguredPharmacyId } from "@/lib/pharmacy-config";

const FOLLOW_UP_ROLES = new Set(["pharmacy_admin", "pharmacist"]);

export class FollowUpWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FollowUpWorkflowError";
  }
}

function assertFollowUpActor(actor: PortalUser): string {
  const pharmacyId = requireConfiguredPharmacyId();
  if (
    actor.pharmacyId !== pharmacyId ||
    !FOLLOW_UP_ROLES.has(actor.role)
  ) {
    throw new FollowUpWorkflowError("This account cannot manage follow-ups.");
  }
  return pharmacyId;
}

export function torontoToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export type FollowUpAttemptDTO = {
  id: string;
  attemptedAt: string;
  completedAt: string | null;
  reached: boolean;
  evaluation: string | null;
  nextStep: FollowUpNextStep;
  note: string | null;
  recordedByUserId: string;
  correctionReason: string | null;
  createdAt: string;
};

export type FollowUpWorkItem = {
  id: string;
  assessmentId: string;
  patientId: string;
  patientName: string;
  ailmentGroupCode: string;
  serviceDate: string;
  dueDate: string;
  method: FollowUpMethod;
  monitoringParameters: string;
  retainUntil: string;
  correctionReason: string | null;
  createdAt: string;
  attempts: FollowUpAttemptDTO[];
  isOpen: boolean;
  isOverdue: boolean;
};

/**
 * Server-only worklist assembly. Callers pass an already verified actor; the
 * function repeats role/pharmacy assertions because it returns patient names.
 */
export async function listFollowUps(
  actor: PortalUser,
  limit = 50,
): Promise<FollowUpWorkItem[]> {
  const pharmacyId = assertFollowUpActor(actor);
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const completedSort = sql<number>`
    CASE WHEN EXISTS (
      SELECT 1
      FROM follow_up AS recorded_attempt
      WHERE recorded_attempt.plan_id = ${followUp.id}
        AND recorded_attempt.superseded_by_id IS NULL
        AND recorded_attempt.completed_at IS NOT NULL
    ) THEN 1 ELSE 0 END
  `;

  const plans = await db
    .select({
      id: followUp.id,
      assessmentId: followUp.assessmentId,
      patientId: assessment.patientId,
      patientName: sql<string>`${patient.firstName} || ' ' || ${patient.lastName}`,
      ailmentGroupCode: assessment.ailmentGroupCode,
      serviceDate: assessment.serviceDate,
      dueDate: followUp.dueDate,
      method: followUp.method,
      monitoringParameters: followUp.monitoringParameters,
      retainUntil: followUp.retainUntil,
      correctionReason: followUp.correctionReason,
      createdAt: followUp.createdAt,
    })
    .from(followUp)
    .innerJoin(assessment, eq(followUp.assessmentId, assessment.id))
    .innerJoin(patient, eq(assessment.patientId, patient.id))
    .where(
      and(
        eq(assessment.pharmacyId, pharmacyId),
        isNull(followUp.planId),
        isNull(followUp.supersededById),
      ),
    )
    .orderBy(asc(completedSort), asc(followUp.dueDate), asc(followUp.createdAt))
    .limit(safeLimit);

  const planIds = plans.map((plan) => plan.id);
  const attempts = planIds.length
    ? await db
        .select({
          id: followUp.id,
          planId: followUp.planId,
          attemptedAt: followUp.attemptedAt,
          completedAt: followUp.completedAt,
          reached: followUp.reached,
          evaluation: followUp.evaluation,
          nextStep: followUp.nextStep,
          note: followUp.note,
          recordedByUserId: followUp.recordedByUserId,
          correctionReason: followUp.correctionReason,
          createdAt: followUp.createdAt,
        })
        .from(followUp)
        .where(
          and(
            inArray(followUp.planId, planIds),
            isNull(followUp.supersededById),
          ),
        )
        .orderBy(desc(followUp.attemptedAt), desc(followUp.createdAt))
    : [];

  const today = torontoToday();
  return plans.map((plan) => {
    const planAttempts = attempts
      .filter((attempt) => attempt.planId === plan.id)
      .flatMap((attempt) =>
        attempt.attemptedAt &&
        attempt.reached !== null &&
        attempt.nextStep
          ? [{
              id: attempt.id,
              attemptedAt: attempt.attemptedAt.toISOString(),
              completedAt: attempt.completedAt?.toISOString() ?? null,
              reached: attempt.reached,
              evaluation: attempt.evaluation,
              nextStep: attempt.nextStep as FollowUpNextStep,
              note: attempt.note,
              recordedByUserId: attempt.recordedByUserId,
              correctionReason: attempt.correctionReason,
              createdAt: attempt.createdAt.toISOString(),
            }]
          : [],
      );
    const isOpen = !planAttempts.some((attempt) => attempt.completedAt !== null);
    return {
      id: plan.id,
      assessmentId: plan.assessmentId,
      patientId: plan.patientId,
      patientName: plan.patientName,
      ailmentGroupCode: plan.ailmentGroupCode,
      serviceDate: plan.serviceDate.toISOString().slice(0, 10),
      dueDate: plan.dueDate,
      method: plan.method as FollowUpMethod,
      monitoringParameters: plan.monitoringParameters,
      retainUntil: plan.retainUntil,
      correctionReason: plan.correctionReason,
      createdAt: plan.createdAt.toISOString(),
      attempts: planAttempts,
      isOpen,
      isOverdue: isOpen && plan.dueDate < today,
    };
  });
}

export async function recordFollowUpAttempt(
  actor: PortalUser,
  input: {
    planId: string;
    attempt: FollowUpAttemptInput;
  },
) {
  const pharmacyId = assertFollowUpActor(actor);
  const parsed = followUpAttemptSchema.safeParse(input.attempt);
  if (!parsed.success) {
    throw new FollowUpWorkflowError(
      parsed.error.issues[0]?.message ?? "The follow-up attempt is incomplete.",
    );
  }
  if (parsed.data.attemptedAt.getTime() > Date.now() + 5 * 60_000) {
    throw new FollowUpWorkflowError("The attempted date cannot be in the future.");
  }

  return db.transaction(async (tx) => {
    // Serialize attempts for one plan. Without this lock, two browser submits
    // can both observe "not complete" and create duplicate reached records.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${input.planId}, 0))`,
    );
    const [plan] = await tx
      .select({
        id: followUp.id,
        assessmentId: followUp.assessmentId,
        patientId: assessment.patientId,
        serviceDate: assessment.serviceDate,
        dueDate: followUp.dueDate,
        method: followUp.method,
        monitoringParameters: followUp.monitoringParameters,
        retainUntil: followUp.retainUntil,
      })
      .from(followUp)
      .innerJoin(assessment, eq(followUp.assessmentId, assessment.id))
      .where(
        and(
          eq(followUp.id, input.planId),
          eq(assessment.pharmacyId, pharmacyId),
          isNull(followUp.planId),
          isNull(followUp.supersededById),
        ),
      )
      .limit(1);
    if (!plan) throw new FollowUpWorkflowError("Active follow-up plan not found.");

    if (
      parsed.data.attemptedAt <
      new Date(`${plan.serviceDate.toISOString().slice(0, 10)}T00:00:00.000Z`)
    ) {
      throw new FollowUpWorkflowError(
        "The attempted date cannot be before the service date.",
      );
    }

    const [alreadyCompleted] = await tx
      .select({ id: followUp.id })
      .from(followUp)
      .where(
        and(
          eq(followUp.planId, plan.id),
          isNull(followUp.supersededById),
          sql`${followUp.completedAt} IS NOT NULL`,
        ),
      )
      .limit(1);
    if (alreadyCompleted) {
      throw new FollowUpWorkflowError("This follow-up is already complete.");
    }

    const [attempt] = await tx
      .insert(followUp)
      .values({
        assessmentId: plan.assessmentId,
        planId: plan.id,
        dueDate: plan.dueDate,
        method: plan.method,
        monitoringParameters: plan.monitoringParameters,
        attemptedAt: parsed.data.attemptedAt,
        // Not reached is valid evidence of an attempt, but it does not close
        // the plan; a later attempt remains due until one reaches the patient.
        completedAt: parsed.data.reached ? new Date() : null,
        reached: parsed.data.reached,
        evaluation: parsed.data.reached ? parsed.data.evaluation : null,
        nextStep: parsed.data.nextStep,
        note: parsed.data.note ?? null,
        recordedByUserId: actor.userId,
        retainUntil: plan.retainUntil,
      })
      .returning();

    await writeAuditWith(tx, {
      pharmacyId,
      patientId: plan.patientId,
      actorUserId: actor.userId,
      action: "follow_up.recorded",
      entityType: "follow_up",
      entityId: attempt.id,
      source: "follow_up_portal",
      metadata: {
        reached: parsed.data.reached,
        nextStep: parsed.data.nextStep,
      },
    });
    return attempt;
  });
}

export async function supersedeFollowUp(
  actor: PortalUser,
  input:
    | {
        followUpId: string;
        correctionReason: string;
        kind: "plan";
        plan: FollowUpPlanInput;
      }
    | {
        followUpId: string;
        correctionReason: string;
        kind: "attempt";
        attempt: FollowUpAttemptInput;
      },
) {
  const pharmacyId = assertFollowUpActor(actor);
  const correctionReason = input.correctionReason.trim();
  if (!correctionReason || correctionReason.length > 2_000) {
    throw new FollowUpWorkflowError("A concise correction reason is required.");
  }

  return db.transaction(async (tx) => {
    const [original] = await tx
      .select({
        id: followUp.id,
        assessmentId: followUp.assessmentId,
        planId: followUp.planId,
        patientId: assessment.patientId,
        serviceDate: assessment.serviceDate,
        dueDate: followUp.dueDate,
        method: followUp.method,
        monitoringParameters: followUp.monitoringParameters,
        retainUntil: followUp.retainUntil,
      })
      .from(followUp)
      .innerJoin(assessment, eq(followUp.assessmentId, assessment.id))
      .where(
        and(
          eq(followUp.id, input.followUpId),
          eq(assessment.pharmacyId, pharmacyId),
          isNull(followUp.supersededById),
        ),
      )
      .limit(1);
    if (!original) {
      throw new FollowUpWorkflowError("Active follow-up record not found.");
    }

    let replacementValues: typeof followUp.$inferInsert;
    if (original.planId === null) {
      if (input.kind !== "plan") {
        throw new FollowUpWorkflowError(
          "A plan must be corrected with plan fields.",
        );
      }
      const [attempt] = await tx
        .select({ id: followUp.id })
        .from(followUp)
        .where(
          and(
            eq(followUp.planId, original.id),
            isNull(followUp.supersededById),
          ),
        )
        .limit(1);
      if (attempt) {
        throw new FollowUpWorkflowError(
          "A plan with recorded attempts cannot be replaced. Correct the attempt record instead.",
        );
      }
      const parsed = parseFollowUpPlan(input.plan, original.serviceDate);
      if (!parsed.success) throw new FollowUpWorkflowError(parsed.error);
      replacementValues = {
        assessmentId: original.assessmentId,
        dueDate: parsed.data.dueDate,
        method: parsed.data.method,
        monitoringParameters: parsed.data.monitoringParameters,
        recordedByUserId: actor.userId,
        retainUntil: original.retainUntil,
        correctionReason,
      };
    } else {
      if (input.kind !== "attempt") {
        throw new FollowUpWorkflowError(
          "An attempt must be corrected with attempt fields.",
        );
      }
      const parsed = followUpAttemptSchema.safeParse(input.attempt);
      if (!parsed.success) {
        throw new FollowUpWorkflowError(
          parsed.error.issues[0]?.message ??
            "The corrected follow-up attempt is incomplete.",
        );
      }
      if (
        parsed.data.attemptedAt <
        new Date(
          `${original.serviceDate.toISOString().slice(0, 10)}T00:00:00.000Z`,
        )
      ) {
        throw new FollowUpWorkflowError(
          "The attempted date cannot be before the service date.",
        );
      }
      if (parsed.data.attemptedAt.getTime() > Date.now() + 5 * 60_000) {
        throw new FollowUpWorkflowError(
          "The attempted date cannot be in the future.",
        );
      }
      replacementValues = {
        assessmentId: original.assessmentId,
        planId: original.planId,
        dueDate: original.dueDate,
        method: original.method,
        monitoringParameters: original.monitoringParameters,
        attemptedAt: parsed.data.attemptedAt,
        completedAt: parsed.data.reached ? new Date() : null,
        reached: parsed.data.reached,
        evaluation: parsed.data.reached ? parsed.data.evaluation : null,
        nextStep: parsed.data.nextStep,
        note: parsed.data.note ?? null,
        recordedByUserId: actor.userId,
        retainUntil: original.retainUntil,
        correctionReason,
      };
    }

    // Corrections preserve both versions. Insert first, then set the original's
    // one permitted mutable field in the same transaction; the deferrable
    // active-record constraint validates the final supersession graph.
    const [replacement] = await tx
      .insert(followUp)
      .values(replacementValues)
      .returning();
    const superseded = await tx
      .update(followUp)
      .set({ supersededById: replacement.id })
      .where(
        and(
          eq(followUp.id, original.id),
          isNull(followUp.supersededById),
        ),
      )
      .returning({ id: followUp.id });
    if (superseded.length !== 1) {
      throw new FollowUpWorkflowError(
        "The follow-up record changed before correction completed.",
      );
    }

    await writeAuditWith(tx, {
      pharmacyId,
      patientId: original.patientId,
      actorUserId: actor.userId,
      action: "follow_up.superseded",
      entityType: "follow_up",
      entityId: replacement.id,
      source: "follow_up_portal",
      metadata: {
        supersededFollowUpId: original.id,
        kind: input.kind,
      },
    });
    return replacement;
  });
}
