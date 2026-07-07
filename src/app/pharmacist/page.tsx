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
  ailmentId: string;
  ailmentName: string;
  symptoms: Symptom[];
  additionalNotes: string;
  status: string; // "Pending Review", "Approved", "GP Referral", "In Progress"
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
    const matchesSearch = a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + 
        " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return isoString;
    }
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
          <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-tertiary)", padding: "0.25rem", borderRadius: "var(--radius-sm)" }}>
            {["All", "Pending", "Approved", "GP Referral"].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                style={{
                  flex: 1,
                  fontFamily: "var(--font-family)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.35rem 0",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  backgroundColor: statusFilter === filter ? "var(--bg-secondary)" : "transparent",
                  color: statusFilter === filter ? "var(--primary)" : "var(--text-secondary)",
                  boxShadow: statusFilter === filter ? "var(--shadow-sm)" : "none",
                  transition: "all var(--transition-fast)"
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
                  <span className="patient-ailment">{item.ailmentName}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: {item.id}</span>
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <h2>{selectedAssessment.patientName}</h2>
                  <span className={`badge ${getSeverityBadgeClass(selectedAssessment.severity)}`}>
                    {selectedAssessment.severity} Severity
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
                                     selectedAssessment.status === "GP Referral" ? "var(--danger-light)" : "var(--bg-secondary)"
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
              {/* Symptoms and notes card */}
              <div className="detail-section-card">
                <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  Assessment Details
                </h3>
                <div style={{ marginBottom: "1.25rem" }}>
                  <span className="ai-section-title">Primary Ailment</span>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--primary)", marginTop: "0.25rem" }}>
                    {selectedAssessment.ailmentName}
                  </div>
                </div>

                <div style={{ marginBottom: "1.25rem" }}>
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

                {selectedAssessment.symptoms.some(s => s.isRedFlag) && (
                  <div className="alert-box alert-box-danger" style={{ marginBottom: "1.25rem" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div>
                      <strong>Critical Note:</strong> Patient has selected high-severity Red Flag symptoms.
                      This requires clinical routing out of self-care and redirection to a physician.
                    </div>
                  </div>
                )}

                <div>
                  <span className="ai-section-title">Patient Consult Notes</span>
                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "1rem",
                      backgroundColor: "var(--bg-tertiary)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.9rem",
                      color: "var(--text-primary)",
                      lineHeight: "1.5",
                      border: "1px solid var(--border-color)",
                      fontStyle: selectedAssessment.additionalNotes ? "normal" : "italic"
                    }}
                  >
                    {selectedAssessment.additionalNotes || "No extra notes submitted by the patient."}
                  </div>
                </div>
              </div>

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
                  <span className="ai-section-title">Calculated Triage recommendation</span>
                  <div style={{ marginTop: "0.25rem" }}>
                    <span
                      className={`badge`}
                      style={{
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.85rem",
                        backgroundColor: selectedAssessment.triageLevel === "Referral" ? "var(--danger-light)" :
                                         selectedAssessment.triageLevel === "Pharmacist Consult" ? "var(--warning-light)" : "var(--success-light)",
                        color: selectedAssessment.triageLevel === "Referral" ? "var(--danger-text)" :
                               selectedAssessment.triageLevel === "Pharmacist Consult" ? "var(--warning-text)" : "var(--success-text)",
                        border: "1px solid currentColor"
                      }}
                    >
                      {selectedAssessment.triageLevel === "Referral" ? "RED FLAG: GP Referral" :
                       selectedAssessment.triageLevel === "Pharmacist Consult" ? "Consult Pharmacist" : "Safe for Self-Care"}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: "1.25rem" }}>
                  <span className="ai-section-title">Clinical Assessment Summary</span>
                  <div className="ai-clinical-summary">
                    {selectedAssessment.aiSuggestion}
                  </div>
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

                <div className="ai-actions-panel" style={{ marginTop: "1.5rem" }}>
                  {selectedAssessment.triageLevel === "Referral" ? (
                    <button
                      onClick={() => handleStatusChange(selectedAssessment.id, "GP Referral")}
                      className="btn btn-danger btn-sm"
                      style={{ flex: 1 }}
                    >
                      Process Referral
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedAssessment.id, "Approved")}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                      >
                        Approve OTC Plan
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedAssessment.id, "Completed")}
                        className="btn btn-secondary btn-sm"
                      >
                        Complete Case
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
