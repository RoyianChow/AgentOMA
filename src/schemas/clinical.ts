import { z } from "zod";
import { ClinicalQuestion } from "@/types/assessment";

export function buildClinicalValidationSchema(questions: ClinicalQuestion[]) {
  const dynamicFields: Record<string, z.ZodTypeAny> = {};

  questions.forEach((question) => {
    let fieldSchema: z.ZodTypeAny;

    switch (question.type) {
      case "BOOLEAN":
        fieldSchema = z.boolean({
          message: `Please answer: "${question.label}"`,
        });
        break;

      case "CHOICE":
        fieldSchema = z.string({
          message: "Please select an option",
        });
        break;

      case "TEXT":
        fieldSchema = z.string({
          message: "This field cannot be blank",
        }).min(1, "This field cannot be blank");
        break;

      default:
        fieldSchema = z.any();
    }

    if (!question.required) {
      fieldSchema = fieldSchema.optional();
    }

    dynamicFields[question.id] = fieldSchema;
  });

  return z.object(dynamicFields);
}
