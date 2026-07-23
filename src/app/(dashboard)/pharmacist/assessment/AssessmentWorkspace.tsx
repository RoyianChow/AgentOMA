"use client";

import { useState } from "react";
import Link from "next/link";
import {
  upsertPatient,
  createAssessment,
  getPatientHistoryCount,
  type IntakeSessionDTO,
} from "../actions";
import ClaimDraftPanel, { type ClaimResult } from "./ClaimDraftPanel";
import {
  NO_RX_RATIONALE_LABELS,
  PCP_NOTIFICATION_METHOD_LABELS,
  SYMPTOM_COURSE_LABELS,
  type ConsentGivenBy,
  type ConsentMethod,
  type NoRxRationaleCode,
  type PcpNotificationMethod,
  type SymptomCourse,
} from "@/lib/clinical-record-types";
import {
  validateDateOfBirth,
  validateOntarioHealthCard,
} from "@/lib/patient-identity-validation";

const PATIENT_IDENTITY_VALIDATION_ERROR =
  "Correct the highlighted patient identity fields before signing.";

function emptyClinicalForm() {
  return {
    consentMethod: "",
    consentGivenBy: "",
    consentObtainedAt: "",
    sdmName: "",
    sdmRelationship: "",
    primaryConcern: "",
    symptomOnset: "",
    symptomDuration: "",
    symptomCourse: "",
    associatedSymptoms: "",
    aggravatingFactors: "",
    relievingFactors: "",
    treatmentsTried: "",
    healthHistory: "",
    medicationHistory: "",
    allergies: "",
    assessmentFindings: "",
    sharedDecisionMaking: "",
    carePlan: "",
    followUpPlan: "",
    noRxRationaleCode: "",
    noRxRationaleNotes: "",
    prescribedOn: "",
    patientAddressLine1: "",
    patientAddressLine2: "",
    patientCity: "",
    patientProvince: "ON",
    patientPostalCode: "",
    drugName: "",
    strength: "",
    quantity: "",
    directionsDose: "",
    directionsFrequency: "",
    directionsRoute: "",
    pcpNotificationAt: "",
    pcpNotificationMethod: "",
    patientChoiceInformedAt: "",
  };
}

export default function AssessmentWorkspace({
  session,
  canOverrideOrientation = false,
  remoteVirtualEligible,
}: {
  session: IntakeSessionDTO;
  /** True only for pharmacy admins — gates the audited orientation override
   * affordance. The override is ALSO re-verified server-side. */
  canOverrideOrientation?: boolean;
  /** Non-PHI pharmacy configuration resolved from seeded reference data. */
  remoteVirtualEligible: boolean;
}) {
  // Patient Identity
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [healthNumber, setHealthNumber] = useState("");
  const [dobError, setDobError] = useState<string | null>(null);
  const [healthNumberError, setHealthNumberError] = useState<string | null>(null);
  const [gender, setGender] = useState<"F" | "M" | "U" | "">("");  // Clinical Workflow
  const [viewerChecked, setViewerChecked] = useState(false);
  const [systemCount, setSystemCount] = useState<number | null>(null);
  const [outcome, setOutcome] = useState("rx_issued");
  const [modality, setModality] = useState<
    "in_person" | "virtual_from_pharmacy" | "virtual_remote"
  >("in_person");
  const [virtualLocation, setVirtualLocation] = useState("");
  const [remoteReason, setRemoteReason] = useState("");
  const [ltcResident, setLtcResident] = useState(false);
  const [ltcProviderRole, setLtcProviderRole] = useState<
    "" | "primary" | "secondary"
  >("");
  const [ltcIsEmergency, setLtcIsEmergency] = useState(false);
  const [clinical, setClinical] = useState(emptyClinicalForm);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  // Claim inputs. Derived fields are never typed — but ODB coverage is a FACT
  // about the patient the derivation needs, so it is collected, not guessed.
  // Prescriber identity is NOT collected here: it comes from the signed-in
  // pharmacist's profile server-side (the supervisor's for interns/students).
  const [isOdbRecipient, setIsOdbRecipient] = useState(true);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  // Admin orientation-override state. `orientationBlock` is set when the server
  // refuses on the gate AND the current user can override; the admin then types
  // a reason and re-submits with it.
  const [orientationBlock, setOrientationBlock] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const setClinicalField = (field: keyof ReturnType<typeof emptyClinicalForm>, value: string) => {
    setClinical((current) => ({ ...current, [field]: value }));
  };

  const commonClinicalReady = [
    clinical.consentMethod,
    clinical.consentGivenBy,
    clinical.consentObtainedAt,
    clinical.primaryConcern,
    clinical.symptomOnset,
    clinical.symptomDuration,
    clinical.symptomCourse,
    clinical.associatedSymptoms,
    clinical.aggravatingFactors,
    clinical.relievingFactors,
    clinical.treatmentsTried,
    clinical.healthHistory,
    clinical.medicationHistory,
    clinical.allergies,
    clinical.assessmentFindings,
    clinical.sharedDecisionMaking,
    clinical.carePlan,
    clinical.followUpPlan,
  ].every((value) => value.trim().length > 0);
  const consentReady =
    clinical.consentGivenBy !== "substitute_decision_maker" ||
    (clinical.sdmName.trim().length > 0 && clinical.sdmRelationship.trim().length > 0);
  const prescriptionReady =
    outcome !== "rx_issued" ||
    [
      clinical.prescribedOn,
      clinical.patientAddressLine1,
      clinical.patientCity,
      clinical.patientProvince,
      clinical.patientPostalCode,
      clinical.drugName,
      clinical.strength,
      clinical.quantity,
      clinical.directionsDose,
      clinical.directionsFrequency,
      clinical.directionsRoute,
      clinical.pcpNotificationAt,
      clinical.pcpNotificationMethod,
      clinical.patientChoiceInformedAt,
    ].every((value) => value.trim().length > 0);
  const noRxReady = outcome === "rx_issued" || clinical.noRxRationaleCode.length > 0;
  const clinicalReady = commonClinicalReady && consentReady && prescriptionReady && noRxReady;

  const checkHistory = async (patientId: string, ailmentCode: string) => {
    const res = await getPatientHistoryCount(patientId, ailmentCode);
    if (res.success) {
      setSystemCount(res.count);
    }
  };

  // Core submit. `overrideReason` is only passed on the admin break-glass
  // re-submit; a normal submit passes nothing and the server enforces the gate.
  const runSubmit = async (overrideReason?: string) => {
    const dobResult = validateDateOfBirth(dob);
    const healthNumberResult = validateOntarioHealthCard(healthNumber);
    setDobError(dobResult.success ? null : dobResult.error);
    setHealthNumberError(healthNumberResult.success ? null : healthNumberResult.error);

    if (!dobResult.success || !healthNumberResult.success) {
      setError(PATIENT_IDENTITY_VALIDATION_ERROR);
      return;
    }
    if (!gender) {
      setError("Please select a gender.");
      return;
    }
    if (!clinicalReady) {
      setError("Complete every required consent and clinical-record field before signing.");
      return;
    }
    if (modality !== "in_person" && !virtualLocation.trim()) {
      setError("Record your physical location for every virtual assessment.");
      return;
    }
    if (modality === "virtual_remote" && !remoteReason.trim()) {
      setError(
        "Record why on-site staff cannot meet demand for this remote virtual assessment.",
      );
      return;
    }
    if (ltcResident && !ltcProviderRole) {
      setError(
        "Select whether this pharmacy is the LTC home's primary or secondary provider.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Resolve Patient (TypeScript now knows gender is "F" | "M" | "U")
      const patientRes = await upsertPatient({
        firstName,
        lastName,
        dob: dobResult.value,
        healthNumber: healthNumberResult.value,
        gender,
      });

      if (!patientRes.success) {
        throw new Error(patientRes.error || "Failed to save patient.");
      }

      const patientId = patientRes.patientId;
      const ailmentCode = session.ailmentGroupCode;

      // Check history just to update UI right before submit, but server will check mutex
      await checkHistory(patientId, ailmentCode);

      // Create Assessment. Pharmacy + prescriber identity come from the
      // authenticated session server-side.
      const assessmentRes = await createAssessment({
        patientId,
        ailmentGroupCode: ailmentCode,
        modality,
        virtualLocation:
          modality === "in_person" ? undefined : virtualLocation,
        remoteReason:
          modality === "virtual_remote" ? remoteReason : undefined,
        intakeSessionId: session.id,
        outcome,
        serviceDate: new Date(),
        clinicalRecord: {
          consent: {
            method: clinical.consentMethod as ConsentMethod,
            givenBy: clinical.consentGivenBy as ConsentGivenBy,
            obtainedAt: new Date(clinical.consentObtainedAt).toISOString(),
            substituteDecisionMakerName:
              clinical.consentGivenBy === "substitute_decision_maker"
                ? clinical.sdmName
                : undefined,
            substituteDecisionMakerRelationship:
              clinical.consentGivenBy === "substitute_decision_maker"
                ? clinical.sdmRelationship
                : undefined,
          },
          presentingComplaint: {
            primaryConcern: clinical.primaryConcern,
            onset: clinical.symptomOnset,
            duration: clinical.symptomDuration,
            course: clinical.symptomCourse as SymptomCourse,
            associatedSymptoms: clinical.associatedSymptoms,
            aggravatingFactors: clinical.aggravatingFactors,
            relievingFactors: clinical.relievingFactors,
            treatmentsTried: clinical.treatmentsTried,
          },
          healthHistory: clinical.healthHistory,
          medicationHistory: clinical.medicationHistory,
          allergies: clinical.allergies,
          assessmentFindings: clinical.assessmentFindings,
          sharedDecisionMaking: clinical.sharedDecisionMaking,
          carePlan: clinical.carePlan,
          followUpPlan: clinical.followUpPlan,
          noRxRationaleCode:
            outcome === "rx_issued"
              ? undefined
              : (clinical.noRxRationaleCode as NoRxRationaleCode),
          noRxRationaleNotes: clinical.noRxRationaleNotes || undefined,
          prescription:
            outcome === "rx_issued"
              ? {
                  prescribedOn: clinical.prescribedOn,
                  patientAddressLine1: clinical.patientAddressLine1,
                  patientAddressLine2: clinical.patientAddressLine2 || undefined,
                  patientCity: clinical.patientCity,
                  patientProvince: clinical.patientProvince,
                  patientPostalCode: clinical.patientPostalCode,
                  drugName: clinical.drugName,
                  strength: clinical.strength,
                  quantity: clinical.quantity,
                  directionsDose: clinical.directionsDose,
                  directionsFrequency: clinical.directionsFrequency,
                  directionsRoute: clinical.directionsRoute,
                  pcpNotificationAt: new Date(clinical.pcpNotificationAt).toISOString(),
                  pcpNotificationMethod:
                    clinical.pcpNotificationMethod as PcpNotificationMethod,
                  patientChoiceInformedAt: new Date(
                    clinical.patientChoiceInformedAt,
                  ).toISOString(),
                }
              : undefined,
        },
        isOdbRecipient,
        ltc: ltcResident
          ? {
              isResident: true,
              providerRole: ltcProviderRole as "primary" | "secondary",
              isEmergency:
                ltcProviderRole === "secondary"
                  ? ltcIsEmergency
                  : undefined,
            }
          : { isResident: false },
        orientationOverrideReason: overrideReason,
      });

      if (!assessmentRes.success) {
        // Orientation gate: if THIS user can override, surface the audited
        // override panel instead of a dead-end error. Otherwise show the error.
        const orientationRequired =
          "orientationRequired" in assessmentRes && assessmentRes.orientationRequired;
        const canOverride =
          "canOverride" in assessmentRes && assessmentRes.canOverride;
        if (orientationRequired && canOverride && canOverrideOrientation) {
          setOrientationBlock(true);
          return;
        }
        throw new Error(assessmentRes.error || "Failed to create assessment.");
      }

      // A non-billable result is NOT an error — the assessment was recorded, and
      // the panel explains why no claim was drafted.
      setClaimResult(assessmentRes.claim ?? null);
      if ("assessmentId" in assessmentRes) {
        setAssessmentId(assessmentRes.assessmentId as string);
      }
      // PHI exists only in this necessary pharmacist form while it is being
      // completed. Clear it immediately after the server confirms persistence;
      // nothing is copied to browser storage or returned as client props.
      setFirstName("");
      setLastName("");
      setDob("");
      setHealthNumber("");
      setGender("");
      setClinical(emptyClinicalForm());
      setIsDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSubmit();
  };

  if (isDone) {
    return (
      <div style={{ maxWidth: "540px", margin: "6rem auto", padding: "0 1.5rem" }}>
        <div className="detail-section-card" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
          <h2 style={{ marginBottom: "0.75rem" }}>Assessment recorded</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            The assessment has been signed and saved, and the patient&apos;s
            intake has been marked as completed. It is now visible in the
            audit log.
          </p>
          {claimResult && (
            <div style={{ textAlign: "left", marginBottom: "1.5rem" }}>
              <ClaimDraftPanel result={claimResult} />
              {claimResult.billable && assessmentId && (
                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                  <Link href={`/pharmacist/assessment/${assessmentId}/export`} className="btn btn-primary">
                    🖨️ Print claim draft for dispensing software
                  </Link>
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <Link href="/pharmacist" className="btn btn-primary">
              Back to Dashboard
            </Link>
            <Link href="/pharmacist/audit" className="btn btn-secondary">
              Audit Log
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Patient Assessment</h1>
        <Link href="/pharmacist" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Left Column: Identity & Clinical Decision */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="detail-section-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Patient Identity</h3>
              <Link href="/pharmacist" className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}>
                Cancel
              </Link>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Key this strictly from the physical health card to prevent drift.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label" htmlFor="patient-ailment-group">
                  Minor Ailment Group
                </label>
                <input
                  id="patient-ailment-group"
                  type="text"
                  className="form-input"
                  value={session.ailmentGroupCode}
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <div>
                <label className="form-label">First Name</label>
                <input type="text" className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <input type="text" className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
              <div>
                <label className="form-label" htmlFor="patient-dob">DOB (YYYY-MM-DD)</label>
                <input
                  id="patient-dob"
                  type="date"
                  className="form-input"
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    setDobError(null);
                    setError((currentError) =>
                      currentError === PATIENT_IDENTITY_VALIDATION_ERROR ? null : currentError,
                    );
                  }}
                  onBlur={() => {
                    const result = validateDateOfBirth(dob);
                    setDobError(result.success ? null : result.error);
                  }}
                  aria-invalid={dobError ? true : undefined}
                  aria-describedby={dobError ? "patient-dob-error" : undefined}
                  required
                />
                {dobError && (
                  <div id="patient-dob-error" role="alert" style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                    {dobError}
                  </div>
                )}
              </div>
              <div>
                <label className="form-label" htmlFor="patient-health-number">Health Card Number</label>
                <input
                  id="patient-health-number"
                  type="text"
                  className="form-input"
                  value={healthNumber}
                  onChange={(e) => {
                    setHealthNumber(e.target.value);
                    setHealthNumberError(null);
                    setError((currentError) =>
                      currentError === PATIENT_IDENTITY_VALIDATION_ERROR ? null : currentError,
                    );
                  }}
                  onBlur={() => {
                    const result = validateOntarioHealthCard(healthNumber);
                    if (result.success) {
                      setHealthNumber(result.value);
                      setHealthNumberError(null);
                    } else {
                      setHealthNumberError(result.error);
                    }
                  }}
                  placeholder="1234567890 AB"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={healthNumberError ? true : undefined}
                  aria-describedby={healthNumberError ? "patient-health-number-error" : undefined}
                  required
                />
                {healthNumberError && (
                  <div id="patient-health-number-error" role="alert" style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                    {healthNumberError}
                  </div>
                )}
              </div>
              <div>
                <div>
                  <label className="form-label">Gender</label>
                  <select
                    className="form-input"
                    value={gender}
                    // 1. Cast the generic string to your specific allowed types
                    onChange={e => setGender(e.target.value as "F" | "M" | "U" | "")}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                    {/* 2. Change "X" to "U" to match your TypeScript definition */}
                    <option value="U">U</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-section-card">
            <h3 style={{ marginBottom: "0.35rem" }}>Consent &amp; clinical record</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Record what was obtained and assessed during this encounter. Enter “None” where
              a reviewed history item has no findings; do not leave required sections blank.
            </p>

            <h4 style={{ marginBottom: "0.65rem" }}>Informed consent</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label className="form-label">Method</label>
                <select className="form-input" value={clinical.consentMethod} onChange={(e) => setClinicalField("consentMethod", e.target.value)}>
                  <option value="">Select...</option>
                  <option value="verbal">Verbal</option>
                  <option value="written">Written</option>
                </select>
              </div>
              <div>
                <label className="form-label">Consent given by</label>
                <select className="form-input" value={clinical.consentGivenBy} onChange={(e) => setClinicalField("consentGivenBy", e.target.value)}>
                  <option value="">Select...</option>
                  <option value="patient">Patient</option>
                  <option value="substitute_decision_maker">Substitute decision-maker</option>
                </select>
              </div>
              <div>
                <label className="form-label">Consent obtained at</label>
                <input type="datetime-local" className="form-input" value={clinical.consentObtainedAt} onChange={(e) => setClinicalField("consentObtainedAt", e.target.value)} />
              </div>
            </div>
            {clinical.consentGivenBy === "substitute_decision_maker" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                <div>
                  <label className="form-label">SDM name</label>
                  <input className="form-input" value={clinical.sdmName} onChange={(e) => setClinicalField("sdmName", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Relationship to patient</label>
                  <input className="form-input" value={clinical.sdmRelationship} onChange={(e) => setClinicalField("sdmRelationship", e.target.value)} />
                </div>
              </div>
            )}

            <h4 style={{ margin: "1.4rem 0 0.65rem" }}>Presenting complaint</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Primary concern and symptom description</label>
                <textarea className="form-input" rows={3} value={clinical.primaryConcern} onChange={(e) => setClinicalField("primaryConcern", e.target.value)} />
              </div>
              <div>
                <label className="form-label">Onset</label>
                <input className="form-input" value={clinical.symptomOnset} onChange={(e) => setClinicalField("symptomOnset", e.target.value)} placeholder="When and how it began" />
              </div>
              <div>
                <label className="form-label">Duration</label>
                <input className="form-input" value={clinical.symptomDuration} onChange={(e) => setClinicalField("symptomDuration", e.target.value)} />
              </div>
              <div>
                <label className="form-label">Course</label>
                <select className="form-input" value={clinical.symptomCourse} onChange={(e) => setClinicalField("symptomCourse", e.target.value)}>
                  <option value="">Select...</option>
                  {Object.entries(SYMPTOM_COURSE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {([
              ["associatedSymptoms", "Associated symptoms"],
              ["aggravatingFactors", "Aggravating factors"],
              ["relievingFactors", "Relieving factors"],
              ["treatmentsTried", "Treatments already tried and response"],
            ] as const).map(([field, label]) => (
              <div key={field} style={{ marginTop: "0.8rem" }}>
                <label className="form-label">{label}</label>
                <textarea className="form-input" rows={2} value={clinical[field]} onChange={(e) => setClinicalField(field, e.target.value)} />
              </div>
            ))}

            <h4 style={{ margin: "1.4rem 0 0.65rem" }}>History, findings &amp; plan</h4>
            {([
              ["healthHistory", "Relevant health history"],
              ["medicationHistory", "Current and recent medication history"],
              ["allergies", "Allergies and intolerances"],
              ["assessmentFindings", "Findings that verify the self-diagnosis"],
              ["sharedDecisionMaking", "Shared decision-making notes"],
              ["carePlan", "Care plan"],
              ["followUpPlan", "Follow-up and monitoring plan"],
            ] as const).map(([field, label]) => (
              <div key={field} style={{ marginTop: "0.8rem" }}>
                <label className="form-label">{label}</label>
                <textarea className="form-input" rows={3} value={clinical[field]} onChange={(e) => setClinicalField(field, e.target.value)} />
              </div>
            ))}
          </div>

          <div className="detail-section-card">
            <h3 style={{ marginBottom: "1rem" }}>Clinical Decision & Billing</h3>
            {error && <div style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "0.9rem", padding: "0.5rem", background: "var(--danger-light)", borderRadius: "var(--radius-sm)" }}>{error}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "0.6rem 0.75rem", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)" }}>
                The prescriber on the claim is taken from your signed-in profile
                (for interns and students, your supervising pharmacist&apos;s OCP
                number) — it is never typed here.
              </div>
              <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.9rem" }}>
                <input
                  type="checkbox"
                  checked={isOdbRecipient}
                  onChange={(e) => setIsOdbRecipient(e.target.checked)}
                />
                Patient has ODB coverage
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  (non-ODB adds intervention code ML and Carrier ID S)
                </span>
              </label>
              <div>
                <label className="form-label">Outcome</label>
                <select
                  className="form-input"
                  value={outcome}
                  onChange={(e) => {
                    const next = e.target.value;
                    setOutcome(next);
                    setClinical((current) => ({
                      ...current,
                      noRxRationaleCode:
                        next === "no_rx_referral"
                          ? "referral_to_other_provider"
                          : next === "rx_issued" ||
                              current.noRxRationaleCode === "referral_to_other_provider"
                            ? ""
                            : current.noRxRationaleCode,
                    }));
                  }}
                >
                  <option value="rx_issued">Prescription Issued</option>
                  <option value="no_rx_referral">No Rx - Referral</option>
                  <option value="no_rx_otc_or_nonpharm">No Rx - OTC / Non-Pharm</option>
                </select>
              </div>

              {outcome !== "rx_issued" && (
                <div style={{ padding: "1rem", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)" }}>
                  <h4 style={{ marginBottom: "0.75rem" }}>Structured no-Rx rationale</h4>
                  <label className="form-label">Rationale code</label>
                  <select
                    className="form-input"
                    value={clinical.noRxRationaleCode}
                    onChange={(e) => setClinicalField("noRxRationaleCode", e.target.value)}
                    disabled={outcome === "no_rx_referral"}
                  >
                    {outcome === "no_rx_referral" ? (
                      <option value="referral_to_other_provider">
                        {NO_RX_RATIONALE_LABELS.referral_to_other_provider}
                      </option>
                    ) : (
                      <>
                        <option value="">Select...</option>
                        {Object.entries(NO_RX_RATIONALE_LABELS)
                          .filter(([value]) => value !== "referral_to_other_provider")
                          .map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                      </>
                    )}
                  </select>
                  <label className="form-label" style={{ marginTop: "0.75rem" }}>
                    Supplementary rationale notes (optional)
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={clinical.noRxRationaleNotes}
                    onChange={(e) => setClinicalField("noRxRationaleNotes", e.target.value)}
                  />
                </div>
              )}

              {outcome === "rx_issued" && (
                <div style={{ padding: "1rem", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)" }}>
                  <h4 style={{ marginBottom: "0.75rem" }}>Prescription record</h4>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "0.8rem" }}>
                    Prescriber name, OCP status, practice address, and phone are snapshotted
                    server-side from the authenticated profile and pharmacy settings.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label className="form-label">Date prescribed</label>
                      <input type="date" className="form-input" value={clinical.prescribedOn} onChange={(e) => setClinicalField("prescribedOn", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Drug name</label>
                      <input className="form-input" value={clinical.drugName} onChange={(e) => setClinicalField("drugName", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Strength</label>
                      <input className="form-input" value={clinical.strength} onChange={(e) => setClinicalField("strength", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Quantity</label>
                      <input className="form-input" value={clinical.quantity} onChange={(e) => setClinicalField("quantity", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Dose</label>
                      <input className="form-input" value={clinical.directionsDose} onChange={(e) => setClinicalField("directionsDose", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Frequency</label>
                      <input className="form-input" value={clinical.directionsFrequency} onChange={(e) => setClinicalField("directionsFrequency", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Route</label>
                      <input className="form-input" value={clinical.directionsRoute} onChange={(e) => setClinicalField("directionsRoute", e.target.value)} />
                    </div>
                  </div>

                  <h4 style={{ margin: "1rem 0 0.65rem" }}>Patient address on prescription</h4>
                  <input className="form-input" value={clinical.patientAddressLine1} onChange={(e) => setClinicalField("patientAddressLine1", e.target.value)} placeholder="Street address" />
                  <input className="form-input" value={clinical.patientAddressLine2} onChange={(e) => setClinicalField("patientAddressLine2", e.target.value)} placeholder="Unit / suite (optional)" style={{ marginTop: "0.5rem" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.8fr", gap: "0.75rem", marginTop: "0.5rem" }}>
                    <input className="form-input" value={clinical.patientCity} onChange={(e) => setClinicalField("patientCity", e.target.value)} placeholder="City" />
                    <input className="form-input" value={clinical.patientProvince} onChange={(e) => setClinicalField("patientProvince", e.target.value)} placeholder="Province" />
                    <input className="form-input" value={clinical.patientPostalCode} onChange={(e) => setClinicalField("patientPostalCode", e.target.value)} placeholder="Postal code" />
                  </div>

                  <h4 style={{ margin: "1rem 0 0.65rem" }}>PCP notification &amp; choice of pharmacy</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label className="form-label">PCP notified at</label>
                      <input type="datetime-local" className="form-input" value={clinical.pcpNotificationAt} onChange={(e) => setClinicalField("pcpNotificationAt", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Notification method</label>
                      <select className="form-input" value={clinical.pcpNotificationMethod} onChange={(e) => setClinicalField("pcpNotificationMethod", e.target.value)}>
                        <option value="">Select...</option>
                        {Object.entries(PCP_NOTIFICATION_METHOD_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="form-label">
                        Patient informed they may fill at any pharmacy — timestamp
                      </label>
                      <input type="datetime-local" className="form-input" value={clinical.patientChoiceInformedAt} onChange={(e) => setClinicalField("patientChoiceInformedAt", e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">Modality</label>
                <select
                  className="form-input"
                  value={modality}
                  onChange={(event) =>
                    setModality(
                      event.target.value as
                        | "in_person"
                        | "virtual_from_pharmacy"
                        | "virtual_remote",
                    )
                  }
                >
                  <option value="in_person">In Person</option>
                  <option value="virtual_from_pharmacy">Virtual (From Pharmacy)</option>
                  {remoteVirtualEligible && (
                    <option value="virtual_remote">Virtual (Remote Exception)</option>
                  )}
                </select>
              </div>

              {modality !== "in_person" && (
                <div>
                  <label className="form-label">
                    Pharmacist&apos;s physical location
                  </label>
                  <input
                    className="form-input"
                    value={virtualLocation}
                    onChange={(event) => setVirtualLocation(event.target.value)}
                    placeholder="Specific location where the assessment was conducted"
                  />
                </div>
              )}

              {modality === "virtual_remote" && (
                <div>
                  <label className="form-label">
                    Why on-site staff cannot meet virtual demand
                  </label>
                  <textarea
                    className="form-input"
                    value={remoteReason}
                    onChange={(event) => setRemoteReason(event.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: "1rem",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    gap: "0.65rem",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={ltcResident}
                    onChange={(event) => {
                      setLtcResident(event.target.checked);
                      if (!event.target.checked) {
                        setLtcProviderRole("");
                        setLtcIsEmergency(false);
                      }
                    }}
                  />
                  <span className="form-label" style={{ margin: 0 }}>
                    Patient is a long-term-care home resident
                  </span>
                </label>

                {ltcResident && (
                  <div
                    style={{
                      display: "grid",
                      gap: "0.75rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    <div>
                      <label className="form-label">
                        This pharmacy&apos;s provider role
                      </label>
                      <select
                        className="form-input"
                        value={ltcProviderRole}
                        onChange={(event) => {
                          const role = event.target.value as
                            | ""
                            | "primary"
                            | "secondary";
                          setLtcProviderRole(role);
                          if (role !== "secondary") {
                            setLtcIsEmergency(false);
                          }
                        }}
                      >
                        <option value="">Select...</option>
                        <option value="primary">Primary provider</option>
                        <option value="secondary">Secondary provider</option>
                      </select>
                    </div>

                    {ltcProviderRole === "secondary" && (
                      <label
                        style={{
                          display: "flex",
                          gap: "0.65rem",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={ltcIsEmergency}
                          onChange={(event) =>
                            setLtcIsEmergency(event.target.checked)
                          }
                        />
                        <span>Emergency service</span>
                      </label>
                    )}

                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--warning-light)",
                        color: "var(--warning-text)",
                        fontSize: "0.85rem",
                      }}
                    >
                      The assessment will be recorded, but no claim draft will
                      be created while ministry LTC billing guidance is
                      pending. Talk to Royian before taking billing action.
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitAssessment}
                disabled={
                  isSubmitting ||
                  !firstName ||
                  !lastName ||
                  !dob ||
                  !healthNumber ||
                  !gender ||
                  !viewerChecked ||
                  !clinicalReady ||
                  (modality !== "in_person" && !virtualLocation.trim()) ||
                  (modality === "virtual_remote" && !remoteReason.trim()) ||
                  (ltcResident && !ltcProviderRole)
                }
                style={{ marginTop: "1rem" }}
              >
                {isSubmitting ? "Saving..." : "Sign & Create Assessment"}
              </button>
              {(!viewerChecked) && (
                <div style={{ fontSize: "0.8rem", color: "var(--warning-text)" }}>You must attest to checking the clinical viewer below before signing.</div>
              )}
              {!clinicalReady && (
                <div style={{ fontSize: "0.8rem", color: "var(--warning-text)" }}>
                  Complete every required consent, clinical, and outcome-specific record field.
                </div>
              )}

              {/* Admin orientation override (break-glass). Only appears when the
                  server refused on the gate AND this user is an admin. It is an
                  AUDITED override, not a silent bypass. */}
              {orientationBlock && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--danger-light)",
                    border: "1px solid var(--danger)",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--danger-text)", marginBottom: "0.4rem" }}>
                    Orientation not on file
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--danger-text)", marginBottom: "0.6rem", lineHeight: 1.45 }}>
                    The prescribing pharmacist has no recorded OCP Mandatory Orientation
                    completion. The compliant fix is to record it on their profile. As an
                    admin you may override this once, with a reason — this is <strong>logged
                    to the audit trail</strong> and does not change that completing the module
                    is a billing precondition.
                  </p>
                  <label className="form-label">Reason for override (no patient identifiers)</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Module completed 2026-07-20, OCP record pending upload"
                  />
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                      // Same clinical-viewer attestation gate as the primary
                      // submit — the break-glass path must not be weaker.
                      disabled={isSubmitting || !viewerChecked || !clinicalReady || overrideReason.trim().length < 4}
                      onClick={() => runSubmit(overrideReason.trim())}
                    >
                      {isSubmitting ? "Saving..." : "Override & sign assessment"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={isSubmitting}
                      onClick={() => { setOrientationBlock(false); setOverrideReason(""); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Intake Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="detail-section-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Intake: {session.ailmentGroupCode}</h3>
              <span className="badge badge-accent">Ref: {session.code}</span>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "-0.5rem", marginBottom: "1rem" }}>
              {session.consentCapturedAt
                ? `Consent captured on the patient's device at ${new Date(session.consentCapturedAt).toLocaleString()}. Re-confirm in person.`
                : "No consent timestamp on this intake — obtain and record consent in person."}
            </p>

            {session.trail ? (
              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Triage Trail</h4>
                <ul style={{ listStyleType: "none", padding: 0, margin: 0, fontSize: "0.88rem" }}>
                  {session.trail.map((t, i) => (
                    <li key={i} style={{ padding: "0.5rem", borderBottom: "1px solid var(--border-color)", background: i % 2 === 0 ? "var(--bg-tertiary)" : "transparent" }}>
                      <strong>Q:</strong> {t.question}<br />
                      <span style={{ color: "var(--text-secondary)" }}><strong>A:</strong> {t.answer}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ marginBottom: "1.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                No digital intake provided. Collect clinical history verbally.
              </div>
            )}

            <div style={{ borderTop: "2px solid var(--border-color)", paddingTop: "1rem" }}>
              <h4 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>Claim Limits & History</h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ padding: "0.75rem", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Patient Self-Report (Count)</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    {session?.priorCountSelfReport !== null && session?.priorCountSelfReport !== undefined
                      ? session.priorCountSelfReport
                      : "Not Sure / N/A"}
                  </div>
                </div>

                <div style={{ padding: "0.75rem", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Patient Self-Report (Rx)</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                    {session?.existingRxSelfReport || "N/A"}
                  </div>
                </div>

                <div style={{ padding: "0.75rem", background: "var(--primary-light)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--primary)" }}>Platform 365-Day Count</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary-dark)" }}>
                    {systemCount !== null ? systemCount : "-"}
                  </div>
                </div>
              </div>

              <label style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "1rem", background: "var(--warning-light)", borderRadius: "var(--radius-md)", border: "1px solid var(--warning-border)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={viewerChecked}
                  onChange={(e) => setViewerChecked(e.target.checked)}
                  style={{ marginTop: "0.2rem" }}
                />
                <div style={{ fontSize: "0.85rem", color: "var(--warning-text)", lineHeight: 1.4 }}>
                  <strong>Clinical Viewer Attestation</strong><br />
                  I confirm that I have checked the provincial clinical viewer and verified the patient has not exceeded the funded maximums for this ailment group in the trailing 365 days.
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
