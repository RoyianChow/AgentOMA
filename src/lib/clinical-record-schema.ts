import { z } from "zod";

import {
  CONSENT_GIVERS,
  CONSENT_METHODS,
  NO_RX_RATIONALE_CODES,
  PCP_NOTIFICATION_METHODS,
  SYMPTOM_COURSES,
  type ClinicalRecordInput,
} from "./clinical-record-types";

const shortText = z.string().trim().min(1).max(500);
const narrative = z.string().trim().min(1).max(4_000);
const optionalNarrative = z.string().trim().max(4_000).optional();
const isoTimestamp = z.string().datetime({ offset: true });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const schema = z.object({
  consent: z.object({
    method: z.enum(CONSENT_METHODS),
    givenBy: z.enum(CONSENT_GIVERS),
    obtainedAt: isoTimestamp,
    substituteDecisionMakerName: z.string().trim().max(200).optional(),
    substituteDecisionMakerRelationship: z.string().trim().max(200).optional(),
  }),
  presentingComplaint: z.object({
    primaryConcern: narrative,
    onset: shortText,
    duration: shortText,
    course: z.enum(SYMPTOM_COURSES),
    associatedSymptoms: narrative,
    aggravatingFactors: narrative,
    relievingFactors: narrative,
    treatmentsTried: narrative,
  }),
  healthHistory: narrative,
  medicationHistory: narrative,
  allergies: narrative,
  assessmentFindings: narrative,
  sharedDecisionMaking: narrative,
  carePlan: narrative,
  followUpPlan: narrative,
  noRxRationaleCode: z.enum(NO_RX_RATIONALE_CODES).optional(),
  noRxRationaleNotes: optionalNarrative,
  prescription: z
    .object({
      prescribedOn: isoDate,
      patientAddressLine1: shortText,
      patientAddressLine2: z.string().trim().max(500).optional(),
      patientCity: shortText,
      patientProvince: z.string().trim().min(2).max(100),
      patientPostalCode: z.string().trim().min(3).max(20),
      drugName: shortText,
      strength: shortText,
      quantity: shortText,
      directionsDose: shortText,
      directionsFrequency: shortText,
      directionsRoute: shortText,
      pcpNotificationAt: isoTimestamp,
      pcpNotificationMethod: z.enum(PCP_NOTIFICATION_METHODS),
      patientChoiceInformedAt: isoTimestamp,
    })
    .optional(),
});

export function parseClinicalRecord(
  outcome: string,
  input: unknown,
): { success: true; data: ClinicalRecordInput } | { success: false; error: string } {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Complete every required consent and clinical-record field before signing.",
    };
  }

  const record = parsed.data;
  const isSdm = record.consent.givenBy === "substitute_decision_maker";
  if (
    isSdm &&
    (!record.consent.substituteDecisionMakerName ||
      !record.consent.substituteDecisionMakerRelationship)
  ) {
    return {
      success: false,
      error: "Record the substitute decision-maker's name and relationship.",
    };
  }

  if (outcome === "rx_issued") {
    if (!record.prescription) {
      return { success: false, error: "Complete the prescription and PCP-notification record." };
    }
    if (record.noRxRationaleCode) {
      return { success: false, error: "A prescription outcome cannot include a no-Rx rationale." };
    }
  } else if (outcome === "no_rx_referral") {
    if (record.noRxRationaleCode !== "referral_to_other_provider") {
      return {
        success: false,
        error: "A completed referral requires the structured referral rationale code.",
      };
    }
    if (record.prescription) {
      return { success: false, error: "A no-prescription outcome cannot include prescription fields." };
    }
  } else if (outcome === "no_rx_otc_or_nonpharm") {
    if (
      !record.noRxRationaleCode ||
      record.noRxRationaleCode === "referral_to_other_provider"
    ) {
      return {
        success: false,
        error: "Select the structured OTC/non-pharmacologic no-Rx rationale.",
      };
    }
    if (record.prescription) {
      return { success: false, error: "A no-prescription outcome cannot include prescription fields." };
    }
  } else {
    return { success: false, error: "Select a valid assessment outcome." };
  }

  return { success: true, data: record as ClinicalRecordInput };
}
