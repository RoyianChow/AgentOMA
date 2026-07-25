import { z } from "zod";

export const FOLLOW_UP_METHODS = ["phone", "in_person"] as const;
export type FollowUpMethod = (typeof FOLLOW_UP_METHODS)[number];

export const FOLLOW_UP_NEXT_STEPS = [
  "resolved",
  "continue",
  "refer",
  "new_assessment_needed",
] as const;
export type FollowUpNextStep = (typeof FOLLOW_UP_NEXT_STEPS)[number];

export const FOLLOW_UP_METHOD_LABELS: Record<FollowUpMethod, string> = {
  phone: "Phone",
  in_person: "In person",
};

export const FOLLOW_UP_NEXT_STEP_LABELS: Record<FollowUpNextStep, string> = {
  resolved: "Resolved",
  continue: "Continue current plan",
  refer: "Refer to another provider",
  new_assessment_needed: "New assessment needed",
};

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid follow-up due date.")
  .refine(
    (value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()),
    "Choose a valid follow-up due date.",
  );

const requiredNarrative = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(8_000, `${label} is too long.`);

const optionalNarrative = z
  .string()
  .trim()
  .max(8_000, "The note is too long.")
  .optional()
  .transform((value) => value || undefined);

export const followUpPlanSchema = z.object({
  dueDate: dateOnly,
  method: z.enum(FOLLOW_UP_METHODS),
  monitoringParameters: requiredNarrative("Monitoring parameters"),
});

export type FollowUpPlanInput = z.input<typeof followUpPlanSchema>;
export type FollowUpPlan = z.output<typeof followUpPlanSchema>;

export const followUpAttemptSchema = z
  .object({
    attemptedAt: z.date(),
    reached: z.boolean(),
    evaluation: optionalNarrative,
    nextStep: z.enum(FOLLOW_UP_NEXT_STEPS),
    note: optionalNarrative,
  })
  .superRefine((value, context) => {
    if (value.reached && !value.evaluation) {
      context.addIssue({
        code: "custom",
        path: ["evaluation"],
        message: "Safety and efficacy evaluation is required when the patient is reached.",
      });
    }
    if (!value.reached && value.evaluation) {
      context.addIssue({
        code: "custom",
        path: ["evaluation"],
        message: "Leave evaluation blank when the patient was not reached.",
      });
    }
  });

export type FollowUpAttemptInput = z.input<typeof followUpAttemptSchema>;
export type FollowUpAttempt = z.output<typeof followUpAttemptSchema>;

export function parseFollowUpPlan(
  input: unknown,
  serviceDate: Date,
):
  | { success: true; data: FollowUpPlan }
  | { success: false; error: string } {
  const parsed = followUpPlanSchema.safeParse(input);
  if (!parsed.success) {
    if (input === null || typeof input !== "object") {
      return {
        success: false,
        error:
          "A follow-up plan is required before a billable assessment can be completed.",
      };
    }
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Complete the follow-up plan before finishing the assessment.",
    };
  }

  const serviceDay = serviceDate.toISOString().slice(0, 10);
  if (parsed.data.dueDate < serviceDay) {
    return {
      success: false,
      error: "The follow-up due date cannot be before the service date.",
    };
  }

  return { success: true, data: parsed.data };
}
