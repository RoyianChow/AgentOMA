/**
 * Setter contract for the authenticated assessment form's transient PHI.
 *
 * Keeping this list explicit makes omissions visible in review and lets the
 * privacy regression test prove every sensitive branch returns to a safe
 * default. Persisted claim output is deliberately not part of this contract:
 * it is the necessary, read-only result rendered after the form is cleared.
 */
export type SensitiveAssessmentResetters = {
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setDob: (value: string) => void;
  setHealthNumber: (value: string) => void;
  setIdentifierType: (
    value: "ohip_health_number" | "odb_mccss" | "odb_hccss",
  ) => void;
  setIdentifierIssuer: (value: string) => void;
  setDocumentInspected: (value: boolean) => void;
  setDobError: (value: string | null) => void;
  setHealthNumberError: (value: string | null) => void;
  setGender: (value: "F" | "M" | "U" | "") => void;
  setViewerChecked: (value: boolean) => void;
  setViewerSource: (
    value: "" | "ConnectingOntario" | "ClinicalConnect",
  ) => void;
  setMaximumState: (
    value: "" | "not_confirmed_met" | "at_or_near" | "confirmed_met" | "unknown",
  ) => void;
  setSystemCount: (value: number | null) => void;
  setSystemMaximum: (value: number | null) => void;
  setOutcome: (
    value: "rx_issued" | "no_rx_referral" | "no_rx_otc_or_nonpharm",
  ) => void;
  setModality: (
    value: "in_person" | "virtual_from_pharmacy" | "virtual_remote",
  ) => void;
  setVirtualLocation: (value: string) => void;
  setRemoteReason: (value: string) => void;
  setLtcResident: (value: boolean) => void;
  setLtcProviderRole: (value: "" | "primary" | "secondary") => void;
  setLtcIsEmergency: (value: boolean) => void;
  resetClinical: () => void;
  setIsOdbRecipient: (value: "" | "yes" | "no") => void;
  setSelfOrFamily: (
    value: "" | "not_self_or_family" | "self" | "family",
  ) => void;
  setSameAilmentPrescription: (
    value: "" | "none" | "fillable" | "adaptable" | "extendable" | "unresolved",
  ) => void;
  setVerificationConsultation: (
    value:
      | ""
      | "not_required"
      | "required_prescriber_reachable"
      | "required_prescriber_unreachable"
      | "unresolved",
  ) => void;
  setPatientSelfReportLocation: (value: string) => void;
  setError: (value: string | null) => void;
};

/** Reset every patient/encounter-specific value held by the browser form. */
export function resetSensitiveAssessmentState(
  setters: SensitiveAssessmentResetters,
): void {
  setters.setFirstName("");
  setters.setLastName("");
  setters.setDob("");
  setters.setHealthNumber("");
  setters.setIdentifierType("ohip_health_number");
  setters.setIdentifierIssuer("");
  setters.setDocumentInspected(false);
  setters.setDobError(null);
  setters.setHealthNumberError(null);
  setters.setGender("");

  setters.setViewerChecked(false);
  setters.setViewerSource("");
  setters.setMaximumState("");
  setters.setSystemCount(null);
  setters.setSystemMaximum(null);

  setters.setOutcome("rx_issued");
  setters.setModality("in_person");
  setters.setVirtualLocation("");
  setters.setRemoteReason("");
  setters.setLtcResident(false);
  setters.setLtcProviderRole("");
  setters.setLtcIsEmergency(false);
  setters.resetClinical();

  setters.setIsOdbRecipient("");
  setters.setSelfOrFamily("");
  setters.setSameAilmentPrescription("");
  setters.setVerificationConsultation("");
  setters.setPatientSelfReportLocation("");

  setters.setError(null);
}
