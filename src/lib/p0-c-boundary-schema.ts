import { z } from "zod";

import type { ClinicalRecordInput } from "@/lib/clinical-record-types";
import type { FollowUpPlanInput } from "@/lib/follow-up-schema";
import {
  normalizeOntarioHealthCard,
  validateDateOfBirth,
  validateOntarioHealthCard,
} from "@/lib/patient-identity-validation";

const requiredText = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .refine((value) => !/[\u0000-\u001F\u007F]/.test(value));

const ontarioHealthCardSchema = z
  .string()
  .max(64)
  .transform(normalizeOntarioHealthCard)
  .refine((value) => validateOntarioHealthCard(value).success);

const dateOfBirthSchema = z
  .string()
  .refine((value) => validateDateOfBirth(value).success);

export const eligibilityIdentifierTypeSchema = z.enum([
  "ohip_health_number",
  "odb_mccss",
  "odb_hccss",
]);

const boundedDisplayedIdentifier = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((value) => !/[\u0000-\u001F\u007F]/.test(value));

const boundedIssuer = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => !/[\u0000-\u001F\u007F]/.test(value));

/**
 * Runtime boundary for the PHI-bearing patient upsert action.
 *
 * The action returns one generic error on failure; Zod details and submitted
 * values are never copied into logs or responses.
 */
export const patientIdentityBoundarySchema = z
  .object({
    firstName: requiredText,
    lastName: requiredText,
    dob: dateOfBirthSchema,
    identifierType: eligibilityIdentifierTypeSchema,
    healthNumber: z.string().max(64),
    gender: z.enum(["F", "M", "U"]),
  })
  .strict()
  .superRefine((value, context) => {
    const identifier =
      value.identifierType === "ohip_health_number"
        ? ontarioHealthCardSchema.safeParse(value.healthNumber)
        : boundedDisplayedIdentifier.safeParse(value.healthNumber);
    if (!identifier.success) {
      context.addIssue({
        code: "custom",
        path: ["healthNumber"],
        message: "Invalid eligibility identifier.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    healthNumber:
      value.identifierType === "ohip_health_number"
        ? normalizeOntarioHealthCard(value.healthNumber)
        : value.healthNumber.trim(),
  }));

export type PatientIdentityBoundary = z.infer<
  typeof patientIdentityBoundarySchema
>;

const ltcFactsSchema = z
  .object({
    isResident: z.boolean(),
    providerRole: z.enum(["primary", "secondary"]).optional(),
    isEmergency: z.boolean().optional(),
  })
  .strict();

export const selfOrFamilySchema = z.enum([
  "not_self_or_family",
  "self",
  "family",
]);

export const sameAilmentPrescriptionSchema = z.enum([
  "none",
  "fillable",
  "adaptable",
  "extendable",
  "unresolved",
]);

export const verificationConsultationSchema = z.enum([
  "not_required",
  "required_prescriber_reachable",
  "required_prescriber_unreachable",
  "unresolved",
]);

export const maximumStateSchema = z.enum([
  "not_confirmed_met",
  "at_or_near",
  "confirmed_met",
  "unknown",
]);

const eligibilityDocumentSchema = z
  .object({
    identifierType: eligibilityIdentifierTypeSchema,
    identifierIssuer: boundedIssuer,
    documentInspectedAttestation: z.literal(true),
  })
  .strict();

const clinicalViewerEvidenceSchema = z
  .object({
    source: z.enum(["ConnectingOntario", "ClinicalConnect"]),
    attestation: z.literal(true),
    maximumState: maximumStateSchema,
  })
  .strict();

/**
 * Top-level assessment boundary. P0-B's clinical payload remains owned and
 * validated by parseClinicalRecord(); this schema validates the surrounding
 * identifiers, modalities, and P0-C facts before that parser is called.
 */
export const assessmentCompletionBoundarySchema = z
  .object({
    patientId: z.uuid(),
    intakeSessionId: z.uuid(),
    modality: z.enum([
      "in_person",
      "virtual_from_pharmacy",
      "virtual_remote",
    ]),
    virtualLocation: z.string().max(500).optional(),
    remoteReason: z.string().max(2_000).optional(),
    outcome: z.enum([
      "rx_issued",
      "no_rx_referral",
      "no_rx_otc_or_nonpharm",
    ]),
    serviceDate: z.date().refine((value) => Number.isFinite(value.getTime())),
    clinicalRecord: z.custom<ClinicalRecordInput>(
      (value) => typeof value === "object" && value !== null,
    ),
    followUpPlan: z
      .custom<FollowUpPlanInput>(
        (value) => typeof value === "object" && value !== null,
      )
      .optional(),
    isOdbRecipient: z.boolean(),
    eligibilityDocument: eligibilityDocumentSchema,
    selfOrFamily: selfOrFamilySchema,
    sameAilmentPrescription: sameAilmentPrescriptionSchema,
    verificationConsultation: verificationConsultationSchema,
    patientSelfReportLocation: z
      .union([requiredText, z.null()])
      .optional(),
    clinicalViewer: clinicalViewerEvidenceSchema,
    ltc: ltcFactsSchema.optional(),
  })
  .strict();

export type AssessmentCompletionBoundary = z.infer<
  typeof assessmentCompletionBoundarySchema
>;

export const claimHistoryRequestBoundarySchema = z
  .object({
    patientId: z.uuid(),
    intakeSessionId: z.uuid(),
    serviceDate: z.date().refine((value) => Number.isFinite(value.getTime())),
  })
  .strict();

export const publicIntakeBoundarySchema = z
  .object({
    ailmentGroupCode: z.string().trim().min(1).max(100),
    trail: z
      .array(
        z
          .object({
            question: z.string().max(2_000),
            answer: z.string().max(2_000),
          })
          .strict(),
      )
      .max(100),
    priorCountSelfReport: z.number().int().nonnegative().nullable(),
    existingRxSelfReport: z
      .enum(["none", "refillable", "other_prescriber"])
      .nullable(),
  })
  .strict();

export function reduceSelfOrFamily(
  value: z.infer<typeof selfOrFamilySchema>,
): boolean {
  return value !== "not_self_or_family";
}

export function reduceExistingRxBlocks(input: {
  sameAilmentPrescription: z.infer<typeof sameAilmentPrescriptionSchema>;
  verificationConsultation: z.infer<typeof verificationConsultationSchema>;
}): boolean {
  return (
    input.sameAilmentPrescription === "fillable" ||
    input.sameAilmentPrescription === "adaptable" ||
    input.sameAilmentPrescription === "extendable" ||
    input.verificationConsultation === "required_prescriber_reachable"
  );
}

export function hasUnresolvedExistingPrescriptionEvidence(input: {
  sameAilmentPrescription: z.infer<typeof sameAilmentPrescriptionSchema>;
  verificationConsultation: z.infer<typeof verificationConsultationSchema>;
}): boolean {
  return (
    input.sameAilmentPrescription === "unresolved" ||
    input.verificationConsultation === "unresolved"
  );
}

export function computeTrailingWindow(serviceDate: Date): {
  start: string;
  end: string;
} {
  const end = serviceDate.toISOString().slice(0, 10);
  const startDate = new Date(`${end}T00:00:00.000Z`);
  startDate.setUTCDate(startDate.getUTCDate() - 365);
  return { start: startDate.toISOString().slice(0, 10), end };
}
