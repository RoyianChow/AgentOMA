"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  ASSESSING_ROLES,
  AuthorizationError,
  requirePortalUser,
} from "@/lib/auth-guard";
import {
  FollowUpWorkflowError,
  recordFollowUpAttempt,
  supersedeFollowUp,
} from "@/lib/follow-ups";
import {
  FOLLOW_UP_METHODS,
  FOLLOW_UP_NEXT_STEPS,
} from "@/lib/follow-up-schema";

const uuid = z.string().uuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

class FollowUpActionInputError extends Error {}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function attemptedDate(value: string): Date {
  const parsed = dateOnly.safeParse(value);
  if (!parsed.success) {
    throw new FollowUpActionInputError("Choose a valid attempted date.");
  }
  const date = new Date(`${parsed.data}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new FollowUpActionInputError("Choose a valid attempted date.");
  }
  return date;
}

function safeMessage(error: unknown): string {
  if (error instanceof AuthorizationError) {
    return "Your session or role no longer permits this action.";
  }
  if (
    error instanceof FollowUpWorkflowError ||
    error instanceof FollowUpActionInputError
  ) {
    return error.message;
  }
  if (error instanceof z.ZodError) {
    return "The follow-up details are incomplete or invalid.";
  }
  return "The follow-up record could not be saved.";
}

function followUpRedirect(
  result: "recorded" | "corrected" | "error",
  message?: string,
): never {
  const query = new URLSearchParams({ status: result });
  if (message) query.set("message", message);
  redirect(`/pharmacist/follow-ups?${query.toString()}`);
}

function revalidateFollowUps(): void {
  revalidatePath("/pharmacist");
  revalidatePath("/pharmacist/follow-ups");
  revalidatePath("/pharmacist/audit");
}

export async function recordFollowUpAction(formData: FormData): Promise<never> {
  try {
    // proxy.ts is navigation UX only. This mutation re-verifies session, TOTP,
    // role, and configured-pharmacy assignment inside the server action.
    const actor = await requirePortalUser(ASSESSING_ROLES);
    const planId = uuid.parse(text(formData, "planId"));
    const reached = text(formData, "reached") === "yes";
    const nextStep = z
      .enum(FOLLOW_UP_NEXT_STEPS)
      .parse(text(formData, "nextStep"));

    await recordFollowUpAttempt(actor, {
      planId,
      attempt: {
        attemptedAt: attemptedDate(text(formData, "attemptedDate")),
        reached,
        evaluation: text(formData, "evaluation"),
        nextStep,
        note: text(formData, "note"),
      },
    });
    revalidateFollowUps();
  } catch (error) {
    followUpRedirect("error", safeMessage(error));
  }
  followUpRedirect("recorded");
}

export async function correctFollowUpPlanAction(
  formData: FormData,
): Promise<never> {
  try {
    const actor = await requirePortalUser(ASSESSING_ROLES);
    await supersedeFollowUp(actor, {
      followUpId: uuid.parse(text(formData, "followUpId")),
      correctionReason: text(formData, "correctionReason"),
      kind: "plan",
      plan: {
        dueDate: text(formData, "dueDate"),
        method: z
          .enum(FOLLOW_UP_METHODS)
          .parse(text(formData, "method")),
        monitoringParameters: text(formData, "monitoringParameters"),
      },
    });
    revalidateFollowUps();
  } catch (error) {
    followUpRedirect("error", safeMessage(error));
  }
  followUpRedirect("corrected");
}

export async function correctFollowUpAttemptAction(
  formData: FormData,
): Promise<never> {
  try {
    const actor = await requirePortalUser(ASSESSING_ROLES);
    const reached = text(formData, "reached") === "yes";
    await supersedeFollowUp(actor, {
      followUpId: uuid.parse(text(formData, "followUpId")),
      correctionReason: text(formData, "correctionReason"),
      kind: "attempt",
      attempt: {
        attemptedAt: attemptedDate(text(formData, "attemptedDate")),
        reached,
        evaluation: text(formData, "evaluation"),
        nextStep: z
          .enum(FOLLOW_UP_NEXT_STEPS)
          .parse(text(formData, "nextStep")),
        note: text(formData, "note"),
      },
    });
    revalidateFollowUps();
  } catch (error) {
    followUpRedirect("error", safeMessage(error));
  }
  followUpRedirect("corrected");
}
