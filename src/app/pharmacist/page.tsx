"use client";

import { useState, useEffect } from "react";

interface Symptom {
  id: string;
  label: string;
  isRedFlag: boolean;
}

interface Assessment {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  healthNumber: string;
  consentGiven: boolean;
  consultedIn365Days: "yes" | "no";
  ailmentId: string;
  ailmentName: string;
  symptoms: Symptom[];
  additionalNotes: string;
  status: string; // "Pending Review", "Approved", "GP Referral", "Completed"
  triageLevel: "Referral" | "Pharmacist Consult" | "Self Care";
  severity: "CRITICAL" | "MODERATE" | "MILD";
  aiSuggestion: string;
  recommendedActions: string[];
  submittedAt: string;
}

const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: "OMA-4029",
    patientName: "Sarah Jenkins",
    age: 28,
    gender: "Female",
    healthNumber: "4192038102AB",
    consentGiven: true,
    consultedIn365Days: "no",
    ailmentId: "allergies",
    ailmentName: "Allergic Rhinitis (Allergies)",
    symptoms: [
      { id: "sneezing", label: "Frequent sneezing", isRedFlag: false },
      { id: "itchy_eyes", label: "Itchy, red, or watery eyes", isRedFlag: false },
      { id: "nasal_congestion", label: "Blocked or runny nose", isRedFlag: false },
    ],
    additionalNotes: "Symptoms are worse in the morning and when going outdoors. Tried generic antihistamine with little relief.",
    status: "Pending Review",
    triageLevel: "Self Care",
    severity: "MILD",
    aiSuggestion: "Self-Care suitable. Symptoms are mild and localized. Standard over-the-counter antihistamines (Cetirizine 10mg daily) and nasal steroids (Fluticasone) are appropriate.",
    recommendedActions: [
      "Standard OTC antihistamines or steroid nasal sprays",
      "Counsel patient to keep windows closed during high pollen counts",
      "Wash hair and change clothes after returning from outdoors",
    ],
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: "OMA-8172",
    patientName: "David Vance",
    age: 62,
    gender: "Male",
    healthNumber: "1028301822CD",
    consentGiven: true,
    consultedIn365Days: "no",
    ailmentId: "acid_reflux",
    ailmentName: "Heartburn & Acid Reflux",
    symptoms: [
      { id: "heartburn", label: "Burning sensation in chest or throat", isRedFlag: false },
      { id: "red_flag_swallowing", label: "Pain or difficulty swallowing food (dysphagia)", isRedFlag: true },
    ],
    additionalNotes: "Have been having food get stuck in my throat for the past week. Painful to swallow hot drinks.",
    status: "GP Referral",
    triageLevel: "Referral",
    severity: "CRITICAL",
    aiSuggestion: "WARNING: Red flag symptoms detected (Dysphagia/Difficulty Swallowing in patient aged >55). High risk of esophageal pathology. Do not treat under minor ailments. Urgent GP referral required.",
    recommendedActions: [
      "Refer patient urgently to GP or Specialist for endoscopy investigation",
      "Do not initiate PPI therapy until investigated (may mask severe disease)",
      "Provide patient with written referral letter outlining dysphagia symptoms",
    ],
    submittedAt: new Date(Date.now() - 3600000 * 4.5).toISOString(), // 4.5 hours ago
  },
  {
    id: "OMA-1982",
    patientName: "Emma Watson",
    age: 34,
    gender: "Female",
    healthNumber: "8821908210XY",
    consentGiven: true,
    consultedIn365Days: "yes",
    ailmentId: "cold_flu",
    ailmentName: "Cold, Cough & Flu Symptoms",
    symptoms: [
      { id: "sore_throat", label: "Pain or scratching feeling in throat", isRedFlag: false },
      { id: "cough", label: "Dry or chesty cough (no blood)", isRedFlag: false },
      { id: "aches", label: "Mild muscle aches or headache", isRedFlag: false },
      { id: "congestion", label: "Sinus congestion or runny nose", isRedFlag: false },
    ],
    additionalNotes: "Feels like a very heavy chest cold. Slight fever of 37.8°C. Sore throat started 3 days ago.",
    status: "Pending Review",
    triageLevel: "Pharmacist Consult",
    severity: "MODERATE",
    aiSuggestion: "Pharmacist review recommended. Sore throat and heavy chest cough without breathing difficulties. Viral etiology highly probable. Symptomatic OTC care and warning signs counseling appropriate.",
    recommendedActions: [
      "Recommend paracetamol (500mg-1000mg every 4-6 hours) for fever and muscle aches",
      "Offer honey and demulcents for cough soothing",
      "Advise rest and high fluid intake",
      "Counsel on red flag signs (stiff neck, breathing trouble) which require emergency review",
    ],
    submittedAt: new Date(Date.now() - 3600000 * 18).toISOString(), // 18 hours ago
  },
];

export default function PharmacistDashboard() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Ontario compliance virtual assessment states
  const [isRxIssued, setIsRxIssued] = useState<boolean>(false);
  const [isInsidePharmacy, setIsInsidePharmacy] = useState<boolean>(true);
  const [ruralShortageVerified, setRuralShortageVerified] = useState<boolean>(false);
  const [ruralSecureAccessVerified, setRuralSecureAccessVerified] = useState<boolean>(false);

  // Workflow Checklist Checked map (key: patientId-checklistIdx)
  const [checklistMap, setChecklistMap] = useState<{ [key: string]: boolean }>({});

  // Simulated Billing Submission states
  const [billingSubmittingMap, setBillingSubmittingMap] = useState<{ [key: string]: boolean }>({});
  const [billingResultMap, setBillingResultMap] = useState<{ [key: string]: { authCode: string; status: string; date: string } }>({});

  // Load from localstorage and seed if empty
  useEffect(() => {
    const loadData = () => {
      try {
        const stored = localStorage.getItem("oma_assessments");
        if (stored) {
          const parsed = JSON.parse(stored);
          setAssessments(parsed);
          if (parsed.length > 0) {
            setSelectedId(parsed[0].id);
          }
        } else {
          // Seed mock assessments
          localStorage.setItem("oma_assessments", JSON.stringify(MOCK_ASSESSMENTS));
          setAssessments(MOCK_ASSESSMENTS);
          setSelectedId(MOCK_ASSESSMENTS[0].id);
        }
      } catch (err) {
        console.error("Failed to load assessments from localStorage", err);
        setAssessments(MOCK_ASSESSMENTS);
        setSelectedId(MOCK_ASSESSMENTS[0].id);
      }
    };
    loadData();
  }, []);

  // Reset checklist, location selection and Rx selection when selected case changes
  useEffect(() => {
    setIsRxIssued(false);
    setIsInsidePharmacy(true);
    setRuralShortageVerified(false);
    setRuralSecureAccessVerified(false);
  }, [selectedId]);

  const getSelectedAssessment = () => {
    return assessments.find((a) => a.id === selectedId);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    const updated = assessments.map((a) => {
      if (a.id === id) {
        return { ...a, status: newStatus };
      }
      return a;
    });
    setAssessments(updated);
    try {
      localStorage.setItem("oma_assessments", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save updated status", err);
    }
  };

  const selectedAssessment = getSelectedAssessment();

  // Filter assessments
  const filteredAssessments = assessments.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ailmentName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Pending" && a.status === "Pending Review") ||
      (statusFilter === "Approved" && a.status === "Approved") ||
      (statusFilter === "GP Referral" && a.status === "GP Referral") ||
      (statusFilter === "Completed" && a.status === "Completed");

    return matchesSearch && matchesStatus;
  });

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "badge-danger";
      case "MODERATE":
        return "badge-warning";
      case "MILD":
      default:
        return "badge-success";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Approved":
        return "badge-success";
      case "GP Referral":
        return "badge-danger";
      case "Pending Review":
      default:
        return "badge-warning";
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return (
        date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " " +
        date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      );
    } catch (e) {
      return isoString;
    }
  };

  // Checklist items
  const CHECKLIST_ITEMS = [
    { label: "1. Consent: Patient informed consent verified", id: "consent" },
    { label: "2. History: Patient medical & drug history reviewed", id: "history" },
    { label: "3. Clinical check: Patient self-diagnosis verified", id: "clinical" },
    { label: "4. Share Plan: Treatment options agreed with patient", id: "shared" },
    { label: "5. Implement: Issue plan, counsel, and notify GP", id: "implement" },
    { label: "6. Follow-up: Treatment safety & monitoring defined", id: "followup" },
  ];

  const isChecklistComplete = (patientId: string) => {
    return CHECKLIST_ITEMS.every((item) => checklistMap[`${patientId}-${item.id}`] === true);
  };

  const toggleChecklistItem = (patientId: string, itemId: string) => {
    const key = `${patientId}-${itemId}`;
    setChecklistMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Ontario virtual billing checks
  const getBillingEligibility = (assessment: Assessment) => {
    const hasRedFlags = assessment.symptoms.some((s) => s.isRedFlag);
    if (hasRedFlags) {
      return { eligible: false, reason: "Red flag symptoms present (Must refer, no claim allowed)" };
    }
    if (!assessment.healthNumber) {
      return { eligible: false, reason: "Missing valid Ontario Health Number" };
    }
    if (!isInsidePharmacy && (!ruralShortageVerified || !ruralSecureAccessVerified)) {
      return { eligible: false, reason: "Rural exception criteria unverified" };
    }
    if (assessment.consultedIn365Days === "yes") {
      return { eligible: true, warning: "Annual limit check: Check past 365-day claim counts" };
    }
    return { eligible: true };
  };

  const getQuantityCode = () => {
    if (isInsidePharmacy) return 1;
    if (ruralShortageVerified && ruralSecureAccessVerified) return 2;
    return 0; // Invalid
  };

  const getBillingPIN = () => {
    return isRxIssued ? "99120251 (Virtual - Rx)" : "99120252 (Virtual - No Rx)";
  };

  const handleBillingSubmit = (assessment: Assessment) => {
    const key = assessment.id;
    setBillingSubmittingMap((prev) => ({ ...prev, [key]: true }));

    setTimeout(() => {
      setBillingSubmittingMap((prev) => ({ ...prev, [key]: false }));
      setBillingResultMap((prev) => ({
        ...prev,
        [key]: {
          authCode: "HNS-AUTH-" + Math.floor(100000 + Math.random() * 900000),
          status: "Claim Accepted",
          date: new Date().toLocaleTimeString(),
        },
      }));
      handleStatusChange(assessment.id, "Completed");
    }, 1500);
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      {/* Sidebar List Panel */}
      <div className="sidebar-panel">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <h2>Patient Inbox</h2>
            <span className="badge badge-accent">
              {assessments.filter((a) => a.status === "Pending Review").length} Pending
            </span>
          </div>

          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Search patient, ID, ailment..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              className="search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          {/* Filter tabs */}
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              background: "var(--bg-tertiary)",
              padding: "0.25rem",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {["All", "Pending", "Approved", "GP Referral", "Completed"].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                style={{
                  flex: 1,
                  fontFamily: "var(--font-family)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  padding: "0.35rem 0",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  backgroundColor: statusFilter === filter ? "var(--bg-secondary)" : "transparent",
                  color: statusFilter === filter ? "var(--primary)" : "var(--text-secondary)",
                  boxShadow: statusFilter === filter ? "var(--shadow-sm)" : "none",
                  transition: "all var(--transition-fast)",
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Cards list */}
        <div className="patient-list">
          {filteredAssessments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              No cases match criteria.
            </div>
          ) : (
            filteredAssessments.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`patient-card ${selectedId === item.id ? "selected" : ""}`}
              >
                <div className="patient-card-header">
                  <div className="patient-name">{item.patientName}</div>
                  <div className="patient-time">{formatTime(item.submittedAt)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="patient-ailment" style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {item.ailmentName}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "0.5rem" }}>ID: {item.id}</span>
                </div>
                <div className="patient-card-footer">
                  <span className={`badge badge-sm ${getSeverityBadgeClass(item.severity)}`}>
                    {item.severity}
                  </span>
                  <span className={`badge badge-sm ${getStatusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail view Panel */}
      <div className="detail-panel">
        {!selectedAssessment ? (
          <div className="detail-placeholder animate-fade-in">
            <div className="detail-placeholder-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2>No Patient Case Selected</h2>
            <p style={{ maxWidth: "350px" }}>
              Please select a patient assessment card from the left panel to review symptoms, Red Flags, and AI clinical guidelines.
            </p>
          </div>
        ) : (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Header Card */}
            <div className="detail-section-card detail-header">
              <div className="detail-header-info">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <h2>{selectedAssessment.patientName}</h2>
                  <span className={`badge ${getSeverityBadgeClass(selectedAssessment.severity)}`}>
                    {selectedAssessment.severity} Severity
                  </span>
                  <span className="badge badge-accent" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
                    OHIP: {selectedAssessment.healthNumber || "MISSING"}
                  </span>
                </div>
                <div className="detail-patient-meta">
                  <span>Age: <strong>{selectedAssessment.age}</strong></span>
                  <span>Gender: <strong>{selectedAssessment.gender}</strong></span>
                  <span>Submitted: <strong>{formatTime(selectedAssessment.submittedAt)}</strong></span>
                  <span>Case ID: <strong>{selectedAssessment.id}</strong></span>
                </div>
              </div>

              <div className="workflow-status-controls">
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>Workflow Status:</span>
                <select
                  value={selectedAssessment.status}
                  onChange={(e) => handleStatusChange(selectedAssessment.id, e.target.value)}
                  className="status-select"
                  style={{
                    borderColor: selectedAssessment.status === "Approved" ? "var(--success)" :
                                 selectedAssessment.status === "GP Referral" ? "var(--danger)" : "var(--border-color)",
                    color: selectedAssessment.status === "Approved" ? "var(--success-text)" :
                           selectedAssessment.status === "GP Referral" ? "var(--danger-text)" : "var(--text-primary)",
                    backgroundColor: selectedAssessment.status === "Approved" ? "var(--success-light)" :
                                     selectedAssessment.status === "GP Referral" ? "var(--danger-light)" : "var(--bg-secondary)",
                  }}
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                  <option value="GP Referral">GP Referral</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Split layout for Symptoms & AI suggestions */}
            <div className="clinical-grid">
              {/* Symptoms, Notes, and OCP clinical workflow checklist */}
              <div className="detail-section-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
                    Assessment Details
                  </h3>
                  <span className="ai-section-title">Primary Ailment</span>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--primary)", marginTop: "0.15rem" }}>
                    {selectedAssessment.ailmentName}
                  </div>
                </div>

                <div>
                  <span className="ai-section-title">Reported Symptoms</span>
                  <div className="symptom-tag-container">
                    {selectedAssessment.symptoms.length === 0 ? (
                      <span style={{ fontStyle: "italic", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                        No specific symptoms selected.
                      </span>
                    ) : (
                      selectedAssessment.symptoms.map((symptom) => (
                        <span
                          key={symptom.id}
                          className={`symptom-tag ${symptom.isRedFlag ? "symptom-tag-critical" : ""}`}
                        >
                          {symptom.isRedFlag && "⚠️ "}
                          {symptom.label}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {selectedAssessment.symptoms.some((s) => s.isRedFlag) && (
                  <div className="alert-box alert-box-danger">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div>
                      <strong>Red Flag Symptoms Present:</strong> Under Ontario regulations, this patient is ineligible for billing. 
                      You must refer the patient and mark the case as a referral.
                    </div>
                  </div>
                )}

                <div>
                  <span className="ai-section-title">Patient Consult Notes</span>
                  <div
                    style={{
                      marginTop: "0.35rem",
                      padding: "0.75rem 1rem",
                      backgroundColor: "var(--bg-tertiary)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      lineHeight: "1.4",
                      border: "1px solid var(--border-color)",
                      fontStyle: selectedAssessment.additionalNotes ? "normal" : "italic",
                    }}
                  >
                    {selectedAssessment.additionalNotes || "No extra notes submitted by the patient."}
                  </div>
                </div>

                {/* OCP Mandatory Workflow Checklist */}
                <div>
                  <span className="ai-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    OCP Virtual Care Checklist
                    {isChecklistComplete(selectedAssessment.id) ? (
                      <span style={{ color: "var(--success)", fontSize: "0.75rem", fontWeight: 700 }}>🟢 COMPLIANT</span>
                    ) : (
                      <span style={{ color: "var(--warning-text)", fontSize: "0.75rem", fontWeight: 700 }}>🟡 INCOMPLETE</span>
                    )}
                  </span>
                  <div className="workflow-checklist">
                    {CHECKLIST_ITEMS.map((item) => {
                      const isChecked = checklistMap[`${selectedAssessment.id}-${item.id}`] === true;
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleChecklistItem(selectedAssessment.id, item.id)}
                          className={`checklist-item ${isChecked ? "checked" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="checklist-checkbox"
                          />
                          <span style={{ textDecoration: isChecked ? "line-through" : "none" }}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Pane: AI suggestions & Ontario Virtual Billing details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* AgentOMA Diagnostic Assistance Panel */}
                <div className="ai-diagnosis-card">
                  <div className="ai-card-glow"></div>
                  <div className="ai-header">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    AgentOMA AI Triager
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <span className="ai-section-title">Calculated Triage Recommendation</span>
                    <div style={{ marginTop: "0.25rem" }}>
                      <span
                        className={`badge`}
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.85rem",
                          backgroundColor:
                            selectedAssessment.triageLevel === "Referral"
                              ? "var(--danger-light)"
                              : selectedAssessment.triageLevel === "Pharmacist Consult"
                              ? "var(--warning-light)"
                              : "var(--success-light)",
                          color:
                            selectedAssessment.triageLevel === "Referral"
                              ? "var(--danger-text)"
                              : selectedAssessment.triageLevel === "Pharmacist Consult"
                              ? "var(--warning-text)"
                              : "var(--success-text)",
                          border: "1px solid currentColor",
                        }}
                      >
                        {selectedAssessment.triageLevel === "Referral"
                          ? "RED FLAG: GP Referral"
                          : selectedAssessment.triageLevel === "Pharmacist Consult"
                          ? "Consult Pharmacist"
                          : "Safe for Self-Care"}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <span className="ai-section-title">Clinical Assessment Summary</span>
                    <div className="ai-clinical-summary">{selectedAssessment.aiSuggestion}</div>
                  </div>

                  <div>
                    <span className="ai-section-title">Pharmacist Action Protocol</span>
                    <div className="ai-recommendations-list">
                      {selectedAssessment.recommendedActions.map((action, idx) => (
                        <div key={idx} className="ai-recommendation-item">
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ontario Billing Claims simulation Panel */}
                {(() => {
                  const billInfo = getBillingEligibility(selectedAssessment);
                  const isSubmitted = billingResultMap[selectedAssessment.id] !== undefined;
                  const isSubmitting = billingSubmittingMap[selectedAssessment.id] === true;
                  const quantity = getQuantityCode();

                  return (
                    <div className={`billing-panel ${billInfo.eligible ? "eligible" : "ineligible"}`}>
                      <div className="billing-status-header">
                        <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>HNS Billing Submission (Ontario)</span>
                        <span className={`badge ${billInfo.eligible ? "badge-success" : "badge-danger"}`}>
                          {billInfo.eligible ? "Eligible" : "Ineligible"}
                        </span>
                      </div>

                      {billInfo.eligible ? (
                        <>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                            Conduct virtual assessment details below. PIN updates dynamically based on Rx outcomes.
                          </div>

                          <div className="form-group" style={{ marginBottom: "1rem" }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>
                              Modality & Virtual Location Conducted From
                            </label>
                            <div style={{ display: "flex", gap: "1rem", flexDirection: "column", marginTop: "0.25rem" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                                <input
                                  type="radio"
                                  name="conduct-location"
                                  checked={isInsidePharmacy === true}
                                  onChange={() => setIsInsidePharmacy(true)}
                                  style={{ accentColor: "var(--primary)" }}
                                />
                                Inside Pharmacy (Physical Store Location)
                              </label>
                              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
                                <input
                                  type="radio"
                                  name="conduct-location"
                                  checked={isInsidePharmacy === false}
                                  onChange={() => setIsInsidePharmacy(false)}
                                  style={{ accentColor: "var(--primary)" }}
                                />
                                Remote Work (Rural Pharmacy Exception)
                              </label>
                            </div>
                          </div>

                          {!isInsidePharmacy && (
                            <div className="rural-exception-card">
                              <strong style={{ fontSize: "0.78rem", color: "var(--warning-text)" }}>
                                OCP Rural Exception Requirements Checklist:
                              </strong>
                              <div className="rural-checkbox-row">
                                <input
                                  type="checkbox"
                                  id="rural-shortage"
                                  className="symptom-checkbox"
                                  style={{ width: "0.9rem", height: "0.9rem" }}
                                  checked={ruralShortageVerified}
                                  onChange={(e) => setRuralShortageVerified(e.target.checked)}
                                />
                                <label htmlFor="rural-shortage">
                                  On-site staff are unable to meet demand due to staffing shortages or sudden volume increases.
                                </label>
                              </div>
                              <div className="rural-checkbox-row">
                                <input
                                  type="checkbox"
                                  id="rural-secure"
                                  className="symptom-checkbox"
                                  style={{ width: "0.9rem", height: "0.9rem" }}
                                  checked={ruralSecureAccessVerified}
                                  onChange={(e) => setRuralSecureAccessVerified(e.target.checked)}
                                />
                                <label htmlFor="rural-secure">
                                  Pharmacist is securely connected to the pharmacy computer software and is submitting to the HNS.
                                </label>
                              </div>
                            </div>
                          )}

                          <div className="form-group" style={{ marginBottom: "1rem", flexDirection: "row", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
                            <input
                              type="checkbox"
                              id="rx-issued"
                              className="symptom-checkbox"
                              style={{ width: "1.1rem", height: "1.1rem" }}
                              checked={isRxIssued}
                              onChange={(e) => setIsRxIssued(e.target.checked)}
                            />
                            <label htmlFor="rx-issued" style={{ fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
                              Prescription Issued during assessment?
                            </label>
                          </div>

                          <div className="billing-grid">
                            <div className="billing-detail-row">
                              <span className="billing-detail-label">Health Card</span>
                              <span className="billing-detail-value" style={{ fontFamily: "var(--font-mono)" }}>
                                {selectedAssessment.healthNumber}
                              </span>
                            </div>
                            <div className="billing-detail-row">
                              <span className="billing-detail-label">Billing Rate</span>
                              <span className="billing-detail-value">$15.00</span>
                            </div>
                            <div className="billing-detail-row">
                              <span className="billing-detail-label">Virtual PIN</span>
                              <span className="billing-detail-value" style={{ fontSize: "0.75rem" }}>
                                <span className="billing-pin-display">{getBillingPIN()}</span>
                              </span>
                            </div>
                            <div className="billing-detail-row">
                              <span className="billing-detail-label">Quantity Code</span>
                              <span
                                className="billing-detail-value"
                                style={{ color: quantity === 0 ? "var(--danger)" : "var(--text-primary)" }}
                              >
                                {quantity === 0 ? "INVALID (Rural checks missing)" : quantity}
                              </span>
                            </div>
                          </div>

                          {billInfo.warning && (
                            <div className="alert-box alert-box-info" style={{ margin: "0.5rem 0 1rem", padding: "0.75rem" }}>
                              <div style={{ fontSize: "0.78rem" }}>{billInfo.warning}</div>
                            </div>
                          )}

                          {isSubmitted ? (
                            <div
                              style={{
                                padding: "1rem",
                                borderRadius: "var(--radius-md)",
                                backgroundColor: "var(--success-light)",
                                border: "1px solid var(--success)",
                                color: "var(--success-text)",
                                fontSize: "0.85rem",
                                marginTop: "1rem",
                              }}
                            >
                              <strong>HNS Submission Status:</strong>
                              <ul style={{ listStyleType: "disc", marginLeft: "1.25rem", marginTop: "0.35rem" }}>
                                <li>Status: {billingResultMap[selectedAssessment.id].status}</li>
                                <li>Auth Code: {billingResultMap[selectedAssessment.id].authCode}</li>
                                <li>Transmitted At: {billingResultMap[selectedAssessment.id].date}</li>
                                <li>Qty Code Recorded: {quantity} (Location logged in pharmacy files)</li>
                              </ul>
                            </div>
                          ) : (
                            <button
                              disabled={isSubmitting || quantity === 0}
                              onClick={() => handleBillingSubmit(selectedAssessment)}
                              className="btn btn-accent btn-sm"
                              style={{ width: "100%", marginTop: "0.5rem" }}
                            >
                              {isSubmitting ? "Transmitting Claim to HNS..." : "Submit Claim to HNS ($15.00)"}
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="alert-box alert-box-danger" style={{ marginTop: "0.5rem" }}>
                          <div>
                            <strong>Billing Rejection Reason:</strong>
                            <div style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}>{billInfo.reason}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
