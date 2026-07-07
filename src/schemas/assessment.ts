import { z } from "zod";
import { DemographicsSchema } from "./demographics";

export const FullAssessmentPayloadSchema = z.object({
  pharmacyId: z.string().min(1, "Missing target organization metadata"),
  timestamp: z.number(), // Unix millisecond epoch for strict audit logs
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REFERRAL"]),
  demographics: DemographicsSchema,
  clinicalAnswers: z.record(z.string(), z.any()), // Validated downstream via dynamic schema
  requiresReferral: z.boolean(), // Calculated serverless trigger flag
});

export type FullAssessmentPayload = z.infer<typeof FullAssessmentPayloadSchema>;
