"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Symptom {
  id: string;
  label: string;
  isRedFlag?: boolean;
  description?: string;
}

interface Ailment {
  id: string;
  name: string;
  description: string;
  symptoms: Symptom[];
}

const AILMENTS: Ailment[] = [
  {
    id: "allergies",
    name: "Allergic Rhinitis (Allergies)",
    description: "Sneezing, runny or blocked nose, itchy red watery eyes.",
    symptoms: [
      { id: "sneezing", label: "Frequent sneezing" },
      { id: "itchy_eyes", label: "Itchy, red, or watery eyes" },
      { id: "nasal_congestion", label: "Blocked or runny nose" },
      { id: "post_nasal_drip", label: "Mucus dripping down throat" },
      {
        id: "red_flag_breathing",
        label: "Difficulty breathing or wheezing",
        isRedFlag: true,
        description: "Signs of acute bronchial constriction or severe asthma flare.",
      },
      {
        id: "red_flag_swelling",
        label: "Swelling of lips, tongue, or face",
        isRedFlag: true,
        description: "Signs of angioedema or severe anaphylactic response.",
      },
    ],
  },
  {
    id: "skin_rash",
    name: "Mild Skin Conditions & Rashes",
    description: "Dry, red, itchy skin rashes or localized dermatitis.",
    symptoms: [
      { id: "itching", label: "Mild to moderate skin itching" },
      { id: "dryness", label: "Dry, scaly, or flaky skin patches" },
      { id: "redness", label: "Mild redness or localized inflammation" },
      { id: "hives", label: "Raised, itchy bumps (hives) limited to one area" },
      {
        id: "red_flag_blistering",
        label: "Painful peeling, blistering, or open sores",
        isRedFlag: true,
        description: "Signs of severe drug reactions (SJS) or deep tissue infection.",
      },
      {
        id: "red_flag_spread_fever",
        label: "Rapidly spreading rash with fever or body chills",
        isRedFlag: true,
        description: "Potential systemic infection or cellulitis needing emergency care.",
      },
    ],
  },
  {
    id: "cold_flu",
    name: "Cold, Cough & Flu Symptoms",
    description: "Sore throat, body aches, runny nose, cough, or mild fever.",
    symptoms: [
      { id: "sore_throat", label: "Pain or scratching feeling in throat" },
      { id: "cough", label: "Dry or chesty cough (no blood)" },
      { id: "congestion", label: "Sinus congestion or runny nose" },
      { id: "aches", label: "Mild muscle aches or headache" },
      {
        id: "red_flag_neck_stiff",
        label: "Severe headache with neck stiffness and light sensitivity",
        isRedFlag: true,
        description: "Warning indicators for Meningitis.",
      },
      {
        id: "red_flag_chest_pain",
        label: "Severe chest pain, coughing up blood, or rapid breathing",
        isRedFlag: true,
        description: "Indicators for pneumonia, pulmonary embolism, or cardiac event.",
      },
    ],
  },
  {
    id: "acid_reflux",
    name: "Heartburn & Acid Reflux",
    description: "Burning chest pain after eating, regurgitation, bloating.",
    symptoms: [
      { id: "heartburn", label: "Burning sensation in chest or throat" },
      { id: "regurgitation", label: "Sour taste in mouth from rising acid" },
      { id: "bloating", label: "Mild stomach bloating or burping" },
      { id: "nausea", label: "Mild nausea after meals" },
      {
        id: "red_flag_swallowing",
        label: "Pain or difficulty swallowing food (dysphagia)",
        isRedFlag: true,
        description: "Could indicate esophageal narrowing or ulceration.",
      },
      {
        id: "red_flag_bleeding",
        label: "Vomiting blood or passing black, tarry stools",
        isRedFlag: true,
        description: "Signs of gastrointestinal bleeding requiring immediate treatment.",
      },
    ],
  },
];

export default function AssessmentPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [healthNumber, setHealthNumber] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [selectedAilmentId, setSelectedAilmentId] = useState("");
  const [consultedIn365Days, setConsultedIn365Days] = useState<"yes" | "no">("no");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedAssessmentId, setSavedAssessmentId] = useState("");

  const currentAilment = AILMENTS.find((a) => a.id === selectedAilmentId);

  // Auto reset selected symptoms when ailment changes
  useEffect(() => {
    setSelectedSymptoms([]);
  }, [selectedAilmentId]);

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId)
        ? prev.filter((id) => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const hasRedFlagsSelected = () => {
    if (!currentAilment) return false;
    return selectedSymptoms.some((id) => {
      const sym = currentAilment.symptoms.find((s) => s.id === id);
      return sym?.isRedFlag === true;
    });
  };

  const maskHealthNumber = (num: string) => {
    const clean = num.replace(/[\s-]/g, "");
    if (clean.length <= 4) return "****";
    return "*".repeat(clean.length - 4) + clean.slice(-4);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name || !age || !gender || !healthNumber) {
        alert("Please fill in all patient details, including your Health Card Number.");
        return;
      }
      const cleanHN = healthNumber.replace(/[\s-]/g, "");
      const hnRegex = /^\d{10}[A-Za-z]{0,2}$/;
      if (!hnRegex.test(cleanHN)) {
        alert("Please enter a valid Ontario Health Card Number (10 digits plus optional 2-letter version code, e.g. 1234567890 AB).");
        return;
      }
      if (!consentGiven) {
        alert("Informed consent is required to proceed with this virtual assessment.");
        return;
      }
    }
    if (step === 2 && !selectedAilmentId) {
      alert("Please select an ailment.");
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !gender || !selectedAilmentId || !healthNumber) return;

    setIsSubmitting(true);

    // Simulate clinical triage calculation
    const criticalFlag = hasRedFlagsSelected();
    const redFlagCount = selectedSymptoms.filter((id) =>
      currentAilment?.symptoms.find((s) => s.id === id)?.isRedFlag
    ).length;
    const normalSymptomCount = selectedSymptoms.length - redFlagCount;

    let triageLevel: "Referral" | "Pharmacist Consult" | "Self Care" = "Self Care";
    let severity: "CRITICAL" | "MODERATE" | "MILD" = "MILD";
    let aiSuggestion = "";
    let recommendedActions: string[] = [];

    if (criticalFlag) {
      triageLevel = "Referral";
      severity = "CRITICAL";
      aiSuggestion =
        "WARNING: Red flag symptoms detected. The patient requires immediate medical referral. Under Ontario guidelines, no minor ailment claim can be submitted for cases presenting with Red Flags.";
      recommendedActions = [
        "Refer patient to the nearest Emergency Department or Urgent Care Centre immediately",
        "Advise patient not to drive themselves if feeling unwell",
        "Provide emergency contact numbers (e.g. 999, 911)",
      ];
    } else if (normalSymptomCount >= 3 || notes.length > 50) {
      triageLevel = "Pharmacist Consult";
      severity = "MODERATE";
      aiSuggestion =
        "Pharmacist review recommended. Symptoms indicate moderate severity. Suitable for OTC intervention after a face-to-face or compliant virtual consultation.";
      
      if (selectedAilmentId === "allergies") {
        recommendedActions = [
          "Offer second-generation antihistamine (e.g. Cetirizine 10mg or Loratadine 10mg)",
          "Recommend steroid nasal spray (e.g. Fluticasone propionate) if nasal symptoms dominate",
          "Counsel on allergen avoidance (pollen tracking, washing hair after being outdoors)",
        ];
      } else if (selectedAilmentId === "skin_rash") {
        recommendedActions = [
          "Recommend mild topical hydrocortisone 1% cream (apply twice daily for max 7 days)",
          "Offer emollient creams for dry patches",
          "Advise to avoid perfumed soaps and triggers",
        ];
      } else if (selectedAilmentId === "cold_flu") {
        recommendedActions = [
          "Advise rest, fluids, and paracetamol (500mg-1000mg every 4-6 hours) for pain/fever",
          "Recommend saline nasal sprays or decongestants for temporary nasal relief",
          "Warn against request for antibiotics (viral infection)",
        ];
      } else {
        recommendedActions = [
          "Recommend H2-antagonists (e.g. Famotidine) or PPIs (e.g. Omeprazole 20mg daily)",
          "Offer antacids or alginates (e.g. Gaviscon) for rapid symptom relief",
          "Counsel on lifestyle modifications (eating smaller meals, avoiding lying down for 3 hours after food)",
        ];
      }
    } else {
      triageLevel = "Self Care";
      severity = "MILD";
      aiSuggestion =
        "Self-Care suitable. Symptoms are mild and localized. Standard over-the-counter options and lifestyle measures are appropriate.";
      
      if (selectedAilmentId === "allergies") {
        recommendedActions = ["Standard OTC antihistamine", "Keep windows closed during high pollen counts"];
      } else if (selectedAilmentId === "skin_rash") {
        recommendedActions = ["Keep area clean and moisturized", "Avoid scratching to prevent infection"];
      } else if (selectedAilmentId === "cold_flu") {
        recommendedActions = ["Adequate hydration and rest", "Sore throat lozenges"];
      } else {
        recommendedActions = ["Avoid spicy, fatty foods and caffeine", "Take OTC alginates as needed after meals"];
      }
    }

    const newAssessment = {
      id: "OMA-" + Math.floor(1000 + Math.random() * 9000),
      patientName: name,
      age: parseInt(age),
      gender: gender,
      healthNumber: healthNumber.replace(/[\s-]/g, "").toUpperCase(),
      consentGiven: true,
      consultedIn365Days: consultedIn365Days,
      ailmentId: selectedAilmentId,
      ailmentName: currentAilment?.name || "",
      symptoms: selectedSymptoms.map((id) => {
        const s = currentAilment?.symptoms.find((sym) => sym.id === id);
        return {
          id: id,
          label: s?.label || id,
          isRedFlag: s?.isRedFlag || false,
        };
      }),
      additionalNotes: notes,
      status: criticalFlag ? "GP Referral" : "Pending Review",
      triageLevel,
      severity,
      aiSuggestion,
      recommendedActions,
      submittedAt: new Date().toISOString(),
    };

    // Save to localStorage
    try {
      const existingRaw = localStorage.getItem("oma_assessments");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem("oma_assessments", JSON.stringify([newAssessment, ...existing]));
      setSavedAssessmentId(newAssessment.id);
    } catch (err) {
      console.error("Error writing to localStorage", err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1200);
  };

  const progressPercentage = Math.round((step / 4) * 100);

  if (isSuccess) {
    const isCritical = hasRedFlagsSelected();
    return (
      <div className="container assessment-layout animate-fade-in">
        <div className="assessment-card success-state">
          <div className="success-icon-wrapper" style={{
            backgroundColor: isCritical ? "var(--danger-light)" : "var(--success-light)",
            color: isCritical ? "var(--danger)" : "var(--success)"
          }}>
            {isCritical ? (
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
            {isCritical ? "Urgent Action Required" : "Assessment Submitted Successfully"}
          </h2>
          <p style={{ maxWidth: "500px", margin: "0.5rem 0 1.5rem" }}>
            {isCritical
              ? "Based on your symptoms, we strongly recommend that you seek immediate medical care. Please contact emergency services or visit a hospital. Your details have been triaged as Critical."
              : `Your assessment has been registered under case ID: ${savedAssessmentId}. It has been forwarded to the Pharmacist for review. You can visit the Pharmacist Portal to see your triaged status.`}
          </p>

          {isCritical && (
            <div className="alert-box alert-box-danger" style={{ textAlign: "left", width: "100%", marginBottom: "1.5rem" }}>
              <div>
                <strong>Emergency Guidelines:</strong>
                <ul style={{ listStyleType: "disc", marginLeft: "1.25rem", marginTop: "0.5rem" }}>
                  <li>Call emergency services immediately.</li>
                  <li>Do not take any new medication before speaking to a doctor.</li>
                  <li>Keep a friend or family member notified of your condition.</li>
                </ul>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem" }}>
            <Link href="/" className="btn btn-secondary">
              Back to Home
            </Link>
            <Link href="/pharmacist" className="btn btn-primary">
              View Pharmacist Portal
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
            <h2 style={{ marginBottom: "1.5rem" }}>Patient Information</h2>
            <div className="form-group">
              <label className="form-label" htmlFor="patient-name">
                Full Name
              </label>
              <input
                id="patient-name"
                type="text"
                className="form-input"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="options-grid" style={{ marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="patient-age">
                  Age (years)
                </label>
                <input
                  id="patient-age"
                  type="number"
                  className="form-input"
                  placeholder="e.g. 35"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="patient-gender">
                  Gender
                </label>
                <select
                  id="patient-gender"
                  className="form-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="health-number">
                Ontario Health Card Number (OHIP / ODB Eligibility)
              </label>
              <input
                id="health-number"
                type="text"
                className="form-input"
                placeholder="10 digits plus optional 2-letter version code (e.g. 1234567890 AB)"
                value={healthNumber}
                onChange={(e) => setHealthNumber(e.target.value)}
              />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                Mandatory for virtual service billing under Ontario guidelines.
              </span>
            </div>

            <div className="form-group" style={{ flexDirection: "row", alignItems: "flex-start", gap: "0.75rem", marginTop: "1.5rem" }}>
              <input
                id="informed-consent"
                type="checkbox"
                className="symptom-checkbox"
                style={{ marginTop: "0.2rem" }}
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
              />
              <label htmlFor="informed-consent" className="symptom-label">
                <strong>Patient Informed Consent</strong>
                <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                  I consent to the collection of my clinical history and details to perform this virtual minor ailment assessment.
                </span>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <h2 style={{ marginBottom: "1.5rem" }}>Select Primary Ailment</h2>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              Select the condition that matches your primary symptom area.
            </p>
            <div className="options-grid">
              {AILMENTS.map((ailment) => (
                <div
                  key={ailment.id}
                  onClick={() => setSelectedAilmentId(ailment.id)}
                  className={`option-box ${
                    selectedAilmentId === ailment.id ? "selected" : ""
                  }`}
                >
                  <span className="option-title">{ailment.name}</span>
                  <span className="option-desc">{ailment.description}</span>
                </div>
              ))}
            </div>

            {selectedAilmentId && (
              <div className="form-group" style={{ marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
                <label className="form-label">
                  Annual Assessment Limits Verification
                </label>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                  Have you consulted a pharmacist or physician for this specific ailment in the last 365 days?
                </p>
                <div style={{ display: "flex", gap: "1.5rem", flexDirection: "column" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="limit-check"
                      checked={consultedIn365Days === "no"}
                      onChange={() => setConsultedIn365Days("no")}
                      style={{ accentColor: "var(--primary)", width: "1.1rem", height: "1.1rem" }}
                    />
                    No, this is my first assessment for this condition in 365 days.
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="limit-check"
                      checked={consultedIn365Days === "yes"}
                      onChange={() => setConsultedIn365Days("yes")}
                      style={{ accentColor: "var(--primary)", width: "1.1rem", height: "1.1rem" }}
                    />
                    Yes, I have received a consultation for this in the last 365 days.
                  </label>
                </div>
                {consultedIn365Days === "yes" && (
                  <div className="alert-box alert-box-info" style={{ marginTop: "1rem" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <div>
                      <strong>Note:</strong> Under Ontario rules, subsidized virtual claims are subject to maximum annual limits. 
                      You can still submit, but the pharmacist will verify eligibility.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && currentAilment && (
          <div className="animate-slide-up">
            <h2 style={{ marginBottom: "0.5rem" }}>Symptom Checklist</h2>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Ailment: <strong style={{ color: "var(--primary)" }}>{currentAilment.name}</strong>. Check all symptoms that apply.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {currentAilment.symptoms.map((symptom) => (
                <div
                  key={symptom.id}
                  className="symptom-item"
                  style={{
                    border: symptom.isRedFlag ? "1px dashed rgba(239, 68, 68, 0.2)" : "1px solid var(--border-color)",
                    backgroundColor: selectedSymptoms.includes(symptom.id)
                      ? (symptom.isRedFlag ? "var(--danger-light)" : "var(--bg-tertiary)")
                      : "transparent"
                  }}
                >
                  <input
                    id={symptom.id}
                    type="checkbox"
                    className="symptom-checkbox"
                    checked={selectedSymptoms.includes(symptom.id)}
                    onChange={() => toggleSymptom(symptom.id)}
                  />
                  <label htmlFor={symptom.id} className="symptom-label">
                    <strong style={{ color: symptom.isRedFlag ? "var(--danger)" : "var(--text-primary)" }}>
                      {symptom.label}
                      {symptom.isRedFlag && " (Red Flag Indicator)"}
                    </strong>
                    {symptom.description && (
                      <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        {symptom.description}
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>

            {hasRedFlagsSelected() && (
              <div className="alert-box alert-box-danger animate-slide-up">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <strong>Critical Warning:</strong> You have selected one or more Red Flag symptoms.
                  These suggest a serious underlying clinical condition.
                  We recommend that you do not submit this as a minor ailment, and seek immediate emergency care.
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="animate-slide-up">
            <h2 style={{ marginBottom: "1.5rem" }}>Review & Submit</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="hero-card-item">
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Patient Details</div>
                <div style={{ fontWeight: 600 }}>{name}, {age} years ({gender})</div>
              </div>

              <div className="hero-card-item">
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Ontario Billing Eligibility</div>
                <div style={{ fontWeight: 600, display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
                  <div>Health Card Number: <span className="billing-pin-display">{maskHealthNumber(healthNumber)}</span></div>
                  <div>Informed Consent: <span style={{ color: "var(--success-text)" }}>Given (Checked)</span></div>
                  <div>Within 365-Day Claim Limit: <span>{consultedIn365Days === "yes" ? "⚠️ Needs verification (Prior consult reported)" : "✅ Yes (No prior consult)"}</span></div>
                </div>
              </div>

              <div className="hero-card-item">
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Selected Ailment</div>
                <div style={{ fontWeight: 600, color: "var(--primary)" }}>{currentAilment?.name}</div>
              </div>

              <div className="hero-card-item">
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Checked Symptoms ({selectedSymptoms.length})</div>
                {selectedSymptoms.length === 0 ? (
                  <div style={{ fontStyle: "italic", fontSize: "0.9rem" }}>No symptoms selected</div>
                ) : (
                  <ul style={{ listStyleType: "disc", marginLeft: "1.25rem", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
                    {selectedSymptoms.map((id) => {
                      const s = currentAilment?.symptoms.find((sym) => sym.id === id);
                      return (
                        <li key={id} style={{ color: s?.isRedFlag ? "var(--danger)" : "var(--text-primary)" }}>
                          {s?.label} {s?.isRedFlag && "⚠️"}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="additional-notes">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="additional-notes"
                  className="form-textarea"
                  placeholder="Tell us about symptom onset, medications tried, or past medical history..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {hasRedFlagsSelected() && (
              <div className="alert-box alert-box-danger" style={{ marginBottom: "1.5rem" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <div>
                  <strong>Emergency Disclaimer:</strong> Triage is set to Critical. By submitting, you acknowledge
                  you are advised to seek emergency professional medical help immediately.
                </div>
              </div>
            )}
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
              disabled={isSubmitting}
              className={`btn ${hasRedFlagsSelected() ? "btn-danger" : "btn-accent"}`}
            >
              {isSubmitting ? "Submitting..." : (hasRedFlagsSelected() ? "Submit Emergency Case" : "Submit Assessment")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
