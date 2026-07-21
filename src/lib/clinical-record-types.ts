export const CONSENT_METHODS = ["verbal", "written"] as const;
export const CONSENT_GIVERS = ["patient", "substitute_decision_maker"] as const;
export const SYMPTOM_COURSES = [
  "acute_new",
  "recurrent",
  "improving",
  "unchanged",
  "worsening",
  "intermittent",
] as const;

// Documentation codes only. They describe the recorded no-Rx outcome; they do
// not add clinical rules or change billability.
export const NO_RX_RATIONALE_CODES = [
  "referral_to_other_provider",
  "otc_recommended",
  "non_pharmacologic_recommended",
  "otc_and_non_pharmacologic",
] as const;

export const PCP_NOTIFICATION_METHODS = [
  "fax",
  "phone",
  "secure_electronic",
  "mail",
  "other",
] as const;

export type ConsentMethod = (typeof CONSENT_METHODS)[number];
export type ConsentGivenBy = (typeof CONSENT_GIVERS)[number];
export type SymptomCourse = (typeof SYMPTOM_COURSES)[number];
export type NoRxRationaleCode = (typeof NO_RX_RATIONALE_CODES)[number];
export type PcpNotificationMethod = (typeof PCP_NOTIFICATION_METHODS)[number];

export type ClinicalRecordInput = {
  consent: {
    method: ConsentMethod;
    givenBy: ConsentGivenBy;
    obtainedAt: string;
    substituteDecisionMakerName?: string;
    substituteDecisionMakerRelationship?: string;
  };
  presentingComplaint: {
    primaryConcern: string;
    onset: string;
    duration: string;
    course: SymptomCourse;
    associatedSymptoms: string;
    aggravatingFactors: string;
    relievingFactors: string;
    treatmentsTried: string;
  };
  healthHistory: string;
  medicationHistory: string;
  allergies: string;
  assessmentFindings: string;
  sharedDecisionMaking: string;
  carePlan: string;
  followUpPlan: string;
  noRxRationaleCode?: NoRxRationaleCode;
  noRxRationaleNotes?: string;
  prescription?: {
    prescribedOn: string;
    patientAddressLine1: string;
    patientAddressLine2?: string;
    patientCity: string;
    patientProvince: string;
    patientPostalCode: string;
    drugName: string;
    strength: string;
    quantity: string;
    directionsDose: string;
    directionsFrequency: string;
    directionsRoute: string;
    pcpNotificationAt: string;
    pcpNotificationMethod: PcpNotificationMethod;
    patientChoiceInformedAt: string;
  };
};

export const NO_RX_RATIONALE_LABELS: Record<NoRxRationaleCode, string> = {
  referral_to_other_provider: "Referred to another health-care provider",
  otc_recommended: "OTC therapy recommended",
  non_pharmacologic_recommended: "Non-pharmacologic care recommended",
  otc_and_non_pharmacologic: "OTC and non-pharmacologic care recommended",
};

export const SYMPTOM_COURSE_LABELS: Record<SymptomCourse, string> = {
  acute_new: "New / acute",
  recurrent: "Recurrent",
  improving: "Improving",
  unchanged: "Unchanged",
  worsening: "Worsening",
  intermittent: "Intermittent",
};

export const PCP_NOTIFICATION_METHOD_LABELS: Record<PcpNotificationMethod, string> = {
  fax: "Fax",
  phone: "Phone",
  secure_electronic: "Secure electronic message",
  mail: "Mail",
  other: "Other documented method",
};
