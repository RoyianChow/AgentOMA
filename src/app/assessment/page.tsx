"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AILMENT_CONFIGS } from "@/config/ailments";
import { AilmentType, ClinicalQuestion, QuestionChoice } from "@/types/assessment";
import { buildClinicalValidationSchema } from "@/schemas/clinical";

export default function AssessmentPage() {
  const [step, setStep] = useState(1);

  // Demographic form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dobInput, setDobInput] = useState(""); // captured as date input "YYYY-MM-DD"
  const [gender, setGender] = useState<"F" | "M" | "U" | "">("");
  const [healthNumber, setHealthNumber] = useState("");
  const [isOdbRecipient, setIsOdbRecipient] = useState<boolean | null>(null);
  const [pastYearAttempt, setPastYearAttempt] = useState<"YES" | "NO" | "NOT_SURE" | "">("");
  const [selectedAilment, setSelectedAilment] = useState<AilmentType | "">("");

  // Clinical answers state (dynamic keys based on question config)
  const [clinicalAnswers, setClinicalAnswers] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");

  const [consentGiven, setConsentGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedCaseId, setSavedCaseId] = useState("");

  // Get active config
  const activeConfig = selectedAilment ? AILMENT_CONFIGS[selectedAilment] : null;

  // Reset clinical answers whenever selected ailment changes
  useEffect(() => {
    setClinicalAnswers({});
  }, [selectedAilment]);

  // Format DOB from date picker input "YYYY-MM-DD" to ministry "YYYYMMDD"
  const getFormattedDOB = () => {
    if (!dobInput) return "";
    return dobInput.replace(/[-]/g, ""); // YYYYMMDD
  };

  // Format DOB from YYYYMMDD back to DD-MM-YYYY for display in reviews
  const formatDOBForDisplay = (yyyyMMDD: string) => {
    if (yyyyMMDD.length !== 8) return yyyyMMDD;
    return `${yyyyMMDD.slice(6, 8)}-${yyyyMMDD.slice(4, 6)}-${yyyyMMDD.slice(0, 4)}`;
  };

  const calculatedAge = () => {
    if (!dobInput) return 0;
    const today = new Date();
    const birthDate = new Date(dobInput);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Evaluates clinical boundaries in the background (Circuit Breaker)
  const evaluateRedFlags = (): { requiresReferral: boolean; reasons: string[] } => {
    if (!activeConfig) return { requiresReferral: false, reasons: [] };
    const reasons: string[] = [];

    // Demographic Hard Stop: Male sex UTI checks
    if (selectedAilment === "URINARY_TRACT_INFECTION" && gender === "M") {
      reasons.push("Male UTI (Excluded from minor ailments protocols)");
    }

    // Check Question specific flags
    activeConfig.questions.forEach((q) => {
      const answer = clinicalAnswers[q.id];
      if (q.triggerRedFlagOnTrue && answer === true) {
        reasons.push(q.label);
      }
      if (q.choices && typeof answer === "string") {
        const choice = q.choices.find((c) => c.value === answer);
        if (choice?.triggerRedFlag) {
          reasons.push(`${q.label}: ${choice.label}`);
        }
      }
    });

    return {
      requiresReferral: reasons.length > 0,
      reasons,
    };
  };

  const maskHealthNumber = (num: string) => {
    const clean = num.replace(/[\s-]/g, "").toUpperCase();
    if (clean.length <= 4) return "****";
    return "*".repeat(clean.length - 4) + clean.slice(-4);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!firstName || !lastName || !dobInput || !gender || !healthNumber || isOdbRecipient === null || !pastYearAttempt || !selectedAilment) {
        alert("Please fill in all demographic details and select an ailment.");
        return;
      }
      
      // Health Card Format check (10 digits plus optional 1-2 letters version code)
      const cleanHN = healthNumber.replace(/[\s-]/g, "").toUpperCase();
      const hnRegex = /^\d{10}[A-Z]{0,2}$/;
      if (!hnRegex.test(cleanHN)) {
        alert("Please enter a valid Ontario Health Card (e.g. 10 digits plus 1-2 version letters like 1234567890 AB).");
        return;
      }

      // DOB length check
      const dobFormatted = getFormattedDOB();
      if (dobFormatted.length !== 8) {
        alert("Please enter a valid Date of Birth.");
        return;
      }
    }

    if (step === 2 && activeConfig) {
      // Validate dynamic questions using clinical schema parser
      try {
        const schema = buildClinicalValidationSchema(activeConfig.questions);
        const parsed = schema.safeParse(clinicalAnswers);
        if (!parsed.success) {
          // Find first validation error
          const firstErr = parsed.error.issues[0]?.message || "Please fill in all symptoms questions.";
          alert(firstErr);
          return;
        }
      } catch (err) {
        console.error(err);
      }
    }

    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !dobInput || !gender || !selectedAilment || !healthNumber || isOdbRecipient === null || !pastYearAttempt) return;

    setIsSubmitting(true);

    const { requiresReferral, reasons } = evaluateRedFlags();
    const cleanHealthNumber = healthNumber.replace(/[\s-]/g, "").toUpperCase();
    const dobFormatted = getFormattedDOB();

    // Map payload according to FullAssessmentPayloadSchema
    const newPayload = {
      id: "OMA-" + Math.floor(1000 + Math.random() * 9000),
      pharmacyId: "PHARM-ONTARIO-1", // Multi-tenant tag
      timestamp: Date.now(),
      status: requiresReferral ? "GP Referral" : "Pending Review",
      triageLevel: requiresReferral ? "Referral" : "Pharmacist Consult",
      severity: requiresReferral ? "CRITICAL" : "MILD",
      requiresReferral,
      referralReasons: reasons,
      submittedAt: new Date().toISOString(),
      
      // Demographics block matching DemographicsSchema
      demographics: {
        firstName,
        lastName,
        dateOfBirth: dobFormatted,
        gender,
        healthCardNumber: cleanHealthNumber,
        isOdbRecipient,
        pastYearAssessmentAttempt: pastYearAttempt,
        ailmentType: selectedAilment,
      },
      
      // Dynamically built clinical answers block
      clinicalAnswers: {
        ...clinicalAnswers,
        additionalNotes: notes,
      },
      
      // Legacy fields for pharmacist compatibility
      patientName: `${firstName} ${lastName}`,
      age: calculatedAge(),
      dob: dobInput,
      genderDisplay: gender === "M" ? "Male" : gender === "F" ? "Female" : "Unknown",
      healthNumber: cleanHealthNumber,
      ailmentId: selectedAilment,
      ailmentName: activeConfig?.displayName || selectedAilment,
      additionalNotes: notes,
      symptoms: Object.keys(clinicalAnswers).map((key) => {
        const q = activeConfig?.questions.find((quest) => quest.id === key);
        const ans = clinicalAnswers[key];
        
        let labelAns = ans === true ? "Yes" : ans === false ? "No" : ans;
        if (q?.choices) {
          const choice = q.choices.find((c) => c.value === ans);
          if (choice) labelAns = choice.label;
        }

        return {
          id: key,
          label: `${q?.label || key}: ${labelAns}`,
          isRedFlag: q?.triggerRedFlagOnTrue && ans === true ? true : false,
        };
      }),
      aiSuggestion: requiresReferral
        ? `CRITICAL: ${reasons.join(", ")}. Patient requires immediate doctor referral. Do not prescribe.`
        : `Assessment suitable for clinical counseling. Dynamic triage cap checks recommended. Maximum ${activeConfig?.maxClaimsPerYear} claims yearly.`,
      recommendedActions: requiresReferral
        ? ["Refer to Primary Care Physician immediately", "Log referral status in store files", "Issue referral notice"]
        : ["Counsel on symptom relief", "Assess for OTC therapy", "Detail follow-up timeline"],
    };

    // ── SECURITY (Step 1) ─────────────────────────────────────────────────
    // Client-side persistence of PHI has been REMOVED. This flow previously
    // wrote the full assessment payload (health number, name, DOB, clinical
    // answers) straight to Firestore / localStorage from the browser. PHIPA
    // and the working agreement forbid client-side PHI persistence. Persistence
    // is deferred to the authenticated server-action flow (assessment rebuild
    // step). Until then, nothing is stored. Do NOT reintroduce a client write.

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setSavedCaseId(newPayload.id);
    }, 1200);
  };

  const progressPercentage = Math.round((step / 4) * 100);

  if (isSuccess) {
    const { requiresReferral } = evaluateRedFlags();
    return (
      <div className="container assessment-layout animate-fade-in">
        <div className="assessment-card success-state">
          <div className="success-icon-wrapper" style={{
            backgroundColor: requiresReferral ? "var(--danger-light)" : "var(--success-light)",
            color: requiresReferral ? "var(--danger)" : "var(--success)"
          }}>
            {requiresReferral ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <h2>
            {requiresReferral ? "Assessment Registered" : "Intake Sent Successfully"}
          </h2>
          
          <div style={{ padding: "1.25rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-color)", margin: "1rem 0", width: "100%", textAlign: "left" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "var(--primary)" }}>Waiting Room Instructions</h3>
            <p style={{ fontSize: "0.92rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
              Your assessment intake details have been securely sent. **The pharmacist will call your name shortly.**
            </p>
            {requiresReferral ? (
              <p style={{ fontSize: "0.92rem", lineHeight: "1.5", color: "var(--danger-text)", marginTop: "0.75rem", fontWeight: 700 }}>
                ⚠️ Please note: Based on your symptoms and complicating factors, the pharmacist may need to refer you directly to a physician or primary care provider.
              </p>
            ) : (
              <p style={{ fontSize: "0.92rem", lineHeight: "1.5", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                Case Registration ID: <strong style={{ color: "var(--text-primary)" }}>{savedCaseId}</strong>. The pharmacist is triaging your file.
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <Link href="/" className="btn btn-secondary">
              Back to Home
            </Link>
            <Link href="/pharmacist" className="btn btn-primary">
              Open Pharmacist Desk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container assessment-layout animate-fade-in">
      <div className="progress-container">
        <div className="progress-header">
          <span className="progress-steps-label">Step {step} of 4</span>
          <span className="progress-pct">{progressPercentage}% Complete</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="assessment-card">
        {step === 1 && (
          <div className="animate-slide-up">
            <h2 style={{ marginBottom: "1.5rem" }}>Gateway Patient Intake</h2>

            <div className="options-grid" style={{ marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="first-name">
                  Legal First Name (on Health Card)
                </label>
                <input
                  id="first-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="last-name">
                  Legal Last Name (on Health Card)
                </label>
                <input
                  id="last-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="options-grid" style={{ marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="dob">
                  Date of Birth
                </label>
                <input
                  id="dob"
                  type="date"
                  className="form-input"
                  value={dobInput}
                  onChange={(e) => setDobInput(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="patient-gender">
                  Gender Identification (MOH Options)
                </label>
                <select
                  id="patient-gender"
                  className="form-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                >
                  <option value="">Select...</option>
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="U">Unknown / Other (U)</option>
                </select>
              </div>
            </div>

            <div className="options-grid" style={{ marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="health-number">
                  Ontario Health Card Number
                </label>
                <input
                  id="health-number"
                  type="text"
                  className="form-input"
                  placeholder="10 digits + version code (e.g. 1234567890 AB)"
                  value={healthNumber}
                  onChange={(e) => setHealthNumber(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="odb-status">
                  Are you an ODB Recipient?
                </label>
                <select
                  id="odb-status"
                  className="form-select"
                  value={isOdbRecipient === null ? "" : isOdbRecipient ? "yes" : "no"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIsOdbRecipient(val === "" ? null : val === "yes" ? true : false);
                  }}
                >
                  <option value="">Select...</option>
                  <option value="yes">Yes, I have Ontario Drug Benefit card</option>
                  <option value="no">No, standard public/private coverage</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="attempt-tracking">
                Have you been assessed by a pharmacist for this specific condition in the last 365 days?
              </label>
              <select
                id="attempt-tracking"
                className="form-select"
                value={pastYearAttempt}
                onChange={(e) => setPastYearAttempt(e.target.value as any)}
              >
                <option value="">Select...</option>
                <option value="NO">No, this is my first assessment for this condition in 365 days</option>
                <option value="YES">Yes, I was assessed for this condition recently</option>
                <option value="NOT_SURE">I am not sure</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label className="form-label" htmlFor="ailment-selection">
                Select Minor Ailment Condition
              </label>
              <select
                id="ailment-selection"
                className="form-select"
                value={selectedAilment}
                onChange={(e) => setSelectedAilment(e.target.value as any)}
              >
                <option value="">Select condition...</option>
                {Object.keys(AILMENT_CONFIGS).map((key) => (
                  <option key={key} value={key}>
                    {AILMENT_CONFIGS[key as AilmentType].displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 2 && activeConfig && (
          <div className="animate-slide-up">
            <h2 style={{ marginBottom: "0.5rem" }}>Symptom & Clinical History</h2>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Condition: <strong style={{ color: "var(--primary)" }}>{activeConfig.displayName}</strong>.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {activeConfig.questions.map((q) => (
                <div key={q.id} className="form-group" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem", marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: "0.5rem" }}>
                    {q.label} {q.required && <span style={{ color: "var(--danger)" }}>*</span>}
                  </label>

                  {q.type === "BOOLEAN" && (
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button
                        type="button"
                        onClick={() => setClinicalAnswers((prev) => ({ ...prev, [q.id]: true }))}
                        className={`btn btn-sm ${clinicalAnswers[q.id] === true ? "btn-primary" : "btn-secondary"}`}
                        style={{ width: "80px" }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setClinicalAnswers((prev) => ({ ...prev, [q.id]: false }))}
                        className={`btn btn-sm ${clinicalAnswers[q.id] === false ? "btn-primary" : "btn-secondary"}`}
                        style={{ width: "80px" }}
                      >
                        No
                      </button>
                    </div>
                  )}

                  {q.type === "CHOICE" && q.choices && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {q.choices.map((choice) => (
                        <label key={choice.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={`choice-${q.id}`}
                            value={choice.value}
                            checked={clinicalAnswers[q.id] === choice.value}
                            onChange={() => setClinicalAnswers((prev) => ({ ...prev, [q.id]: choice.value }))}
                            style={{ accentColor: "var(--primary)", width: "1.1rem", height: "1.1rem" }}
                          />
                          {choice.label}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "TEXT" && (
                    <input
                      type="text"
                      className="form-input"
                      value={clinicalAnswers[q.id] || ""}
                      onChange={(e) => setClinicalAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Please specify details..."
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up">
            <h2 style={{ marginBottom: "1.25rem" }}>Consultation Notes</h2>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Provide any additional information about symptom onset, timeline, past treatments tried, or allergies.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="additional-notes">
                Consult Notes (Optional)
              </label>
              <textarea
                id="additional-notes"
                className="form-textarea"
                rows={5}
                placeholder="Timeline, medication dosage tried, or pre-existing conditions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Warn user silently of referral but don't block them */}
            {evaluateRedFlags().requiresReferral && (
              <div className="alert-box alert-box-info">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div>
                  <strong>Note:</strong> Based on clinical guidelines, your symptoms or demographics indicate a GP referral might be required. 
                  You may still proceed; the pharmacist will verify final suitability.
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="animate-slide-up">
            <h2 style={{ marginBottom: "1.5rem" }}>Review & Consent</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="hero-card-item">
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Demographics</div>
                <div style={{ fontWeight: 600 }}>{firstName} {lastName}, {calculatedAge()} years ({gender === "M" ? "Male" : gender === "F" ? "Female" : "Unknown"})</div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                  DOB: {formatDOBForDisplay(getFormattedDOB())} | OHIP: {maskHealthNumber(healthNumber)} {isOdbRecipient ? "(ODB)" : ""}
                </div>
              </div>

              <div className="hero-card-item">
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Ailment Selection</div>
                <div style={{ fontWeight: 600, color: "var(--primary)" }}>{activeConfig?.displayName}</div>
              </div>

              <div className="hero-card-item">
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Intake Symptom Summary</div>
                <ul style={{ listStyleType: "disc", marginLeft: "1.25rem", fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
                  {activeConfig?.questions.map((q) => {
                    const ans = clinicalAnswers[q.id];
                    let displayAns = ans === true ? "Yes" : ans === false ? "No" : ans || "Unanswered";
                    if (q.choices && typeof ans === "string") {
                      const choice = q.choices.find((c) => c.value === ans);
                      if (choice) displayAns = choice.label;
                    }
                    
                    const isRed = q.triggerRedFlagOnTrue && ans === true ? true : false;

                    return (
                      <li key={q.id} style={{ color: isRed ? "var(--danger)" : "var(--text-primary)" }}>
                        {q.label}: <strong>{displayAns}</strong> {isRed && "⚠️"}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {notes && (
                <div className="hero-card-item">
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Additional Notes</div>
                  <div style={{ fontSize: "0.85rem", fontStyle: "italic" }}>&ldquo;{notes}&rdquo;</div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ flexDirection: "row", alignItems: "flex-start", gap: "0.75rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem", marginTop: "1rem" }}>
              <input
                id="final-consent"
                type="checkbox"
                className="symptom-checkbox"
                style={{ marginTop: "0.2rem" }}
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
              />
              <label htmlFor="final-consent" className="symptom-label">
                <strong>Informed Consent</strong>
                <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                  I certify that all details submitted are accurate. I consent to the pharmacist reviewing this information and sharing it with my primary care provider if a prescription is issued.
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="form-actions">
          {step > 1 ? (
            <button type="button" onClick={handleBack} className="btn btn-secondary">
              Back
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button type="button" onClick={handleNext} className="btn btn-primary">
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !consentGiven}
              className={`btn ${evaluateRedFlags().requiresReferral ? "btn-danger" : "btn-accent"}`}
            >
              {isSubmitting ? "Submitting..." : (evaluateRedFlags().requiresReferral ? "Register Case (GP Referral)" : "Submit Intake")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
