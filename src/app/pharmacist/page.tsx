"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";

interface Symptom {
  id: string;
  label: string;
  isRedFlag: boolean;
}

interface Assessment {
  id: string;
  patientName: string;
  firstName: string;
  lastName: string;
  dob: string;
  age: number;
  gender: string;
  healthNumber: string;
  consentGiven: boolean;
  consultedIn365Days: "yes" | "no";
  ailmentId: string;
  ailmentName: string;
  symptoms: Symptom[];
  additionalNotes: string;
  status: string; // "PENDING", "IN_PROGRESS", "COMPLETED", "ARCHIVED", "GP Referral"
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
    firstName: "Sarah",
    lastName: "Jenkins",
    dob: "1998-05-14",
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
    status: "PENDING",
    triageLevel: "Self Care",
    severity: "MILD",
    aiSuggestion: "Self-Care suitable. Symptoms are mild and localized. Standard over-the-counter antihistamines (Cetirizine 10mg daily) and nasal steroids (Fluticasone) are appropriate.",
    recommendedActions: [
      "Standard OTC antihistamines or steroid nasal sprays",
      "Counsel patient to keep windows closed during high pollen counts",
      "Wash hair and change clothes after returning from outdoors",
    ],
    submittedAt: new Date(Date.now() - 3600000 * 0.1).toISOString(), // 6 minutes ago (recently submitted, pending)
  },
  {
    id: "OMA-8172",
    patientName: "David Vance",
    firstName: "David",
    lastName: "Vance",
    dob: "1964-07-22",
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
    aiSuggestion: "CRITICAL: Complicating factor detected (Dysphagia in patient aged >55 / Male patient presenting complicated reflux symptoms). Patient requires immediate doctor referral. Do not prescribe.",
    recommendedActions: [
      "Refer patient urgently to GP or Specialist for endoscopy investigation",
      "Do not initiate PPI therapy until investigated (may mask severe disease)",
      "Provide patient with written referral letter outlining dysphagia symptoms",
    ],
    submittedAt: new Date(Date.now() - 3600000 * 0.4).toISOString(), // 24 minutes ago (Trigger visual urgency flag >15min!)
  },
  {
    id: "OMA-1982",
    patientName: "Emma Watson",
    firstName: "Emma",
    lastName: "Watson",
    dob: "1992-02-12",
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
    status: "IN_PROGRESS",
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
  
  // Real-time queue filters: Pending, In Progress, Completed
  const [activeQueueTab, setActiveQueueTab] = useState<"PENDING" | "IN_PROGRESS" | "COMPLETED">("PENDING");

  // Ontario virtual billing states
  const [isRxIssued, setIsRxIssued] = useState<boolean>(false);
  const [isInsidePharmacy, setIsInsidePharmacy] = useState<boolean>(true);
  const [ruralShortageVerified, setRuralShortageVerified] = useState<boolean>(false);
  const [ruralSecureAccessVerified, setRuralSecureAccessVerified] = useState<boolean>(false);

  // Workflow Checklist Checked map (key: patientId-checklistIdx)
  const [checklistMap, setChecklistMap] = useState<{ [key: string]: boolean }>({});

  // Simulated Billing Submission states
  const [billingSubmittingMap, setBillingSubmittingMap] = useState<{ [key: string]: boolean }>({});
  const [billingResultMap, setBillingResultMap] = useState<{ [key: string]: { authCode: string; status: string; date: string } }>({});

  // Click-to-copy copied key state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Real-time listener setup with Firestore or localStorage polling fallback
  useEffect(() => {
    const hasFirebase = db !== null;
    
    if (hasFirebase) {
      let unsubscribe: () => void = () => {};
      const setupFirebaseListener = async () => {
        try {
          const { collection, query, where, onSnapshot, orderBy } = await import("firebase/firestore");
          const q = query(
            collection(db, "assessments"),
            where("pharmacyId", "==", "PHARM-ONTARIO-1"),
            orderBy("submittedAt", "desc")
          );

          unsubscribe = onSnapshot(q, (snapshot: any) => {
            const patientList = snapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data()
            }));
            setAssessments(patientList);
            if (patientList.length > 0 && !selectedId) {
              setSelectedId(patientList[0].id);
            }
          }, (err: any) => {
            console.error("Firestore onSnapshot error, falling back to local simulation", err);
            setupLocalSimulation();
          });
        } catch (err) {
          console.error("Failed to load firestore client, using local simulation", err);
          setupLocalSimulation();
        }
      };

      setupFirebaseListener();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      const cleanup = setupLocalSimulation();
      return cleanup;
    }
  }, [selectedId]);

  const setupLocalSimulation = () => {
    const loadData = () => {
      try {
        const stored = localStorage.getItem("oma_assessments");
        if (stored) {
          const parsed = JSON.parse(stored);
          setAssessments(parsed);
          if (parsed.length > 0 && !selectedId) {
            setSelectedId(parsed[0].id);
          }
        } else {
          localStorage.setItem("oma_assessments", JSON.stringify(MOCK_ASSESSMENTS));
          setAssessments(MOCK_ASSESSMENTS);
          setSelectedId(MOCK_ASSESSMENTS[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadData();
    // Poll every 2 seconds to simulate active socket/listener when submitting intake form on other tabs
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  };

  // Reset compliance and location checkboxes when assessment changes
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
      
      // If Firebase configured, write update to database
      const hasFirebase = db !== null;
      if (hasFirebase) {
        const { doc, updateDoc } = require("firebase/firestore");
        updateDoc(doc(db, "assessments", id), { status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const selectedAssessment = getSelectedAssessment();

  // Filter assessments based on active Tab and Search Query
  const filteredQueue = assessments.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ailmentName.toLowerCase().includes(searchQuery.toLowerCase());

    const statusMatch =
      (activeQueueTab === "PENDING" && (a.status === "PENDING" || a.status === "Pending Review")) ||
      (activeQueueTab === "IN_PROGRESS" && (a.status === "IN_PROGRESS" || a.status === "In Progress" || a.status === "GP Referral")) ||
      (activeQueueTab === "COMPLETED" && (a.status === "COMPLETED" || a.status === "Completed" || a.status === "ARCHIVED"));

    return matchesSearch && statusMatch;
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

  // Wait time calculation in minutes
  const getWaitTimeMinutes = (submittedAt: string) => {
    try {
      const diffMs = Date.now() - new Date(submittedAt).getTime();
      return Math.max(0, Math.floor(diffMs / 60000));
    } catch (e) {
      return 0;
    }
  };

  // DOB Formatter for Kroll (DD-MM-YYYY)
  const formatDOBForKroll = (dobString: string) => {
    if (!dobString) return "";
    const parts = dobString.split("-"); // YYYY-MM-DD
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
    }
    return dobString;
  };

  // Clipboard copy handler
  const handleCopyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey(null);
      }, 1200);
    });
  };

  // Clinical workflow checklist
  const WORKFLOW_CHECKLIST = [
    { label: "Obtained Patient Informed Consent", id: "consent" },
    { label: "Gathered & Reviewed Medication History", id: "history" },
    { label: "Verified Patient Self-Diagnosis Criteria", id: "clinical" },
    { label: "Shared Care Plan & Treatment Decisions", id: "shared" },
    { label: "Executed Care Plan / GP Notification", id: "implement" },
    { label: "Defined Follow-up Efficacy Parameters", id: "followup" },
  ];

  const isChecklistComplete = (patientId: string) => {
    return WORKFLOW_CHECKLIST.every((item) => checklistMap[`${patientId}-${item.id}`] === true);
  };

  const toggleChecklistItem = (patientId: string, itemId: string) => {
    const key = `${patientId}-${itemId}`;
    setChecklistMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Ontario virtual billing rules
  const getBillingEligibility = (assessment: Assessment) => {
    const hasRedFlags = assessment.symptoms.some((s) => s.isRedFlag) || (assessment.gender === "Male" && assessment.ailmentId === "acid_reflux");
    if (hasRedFlags) {
      return { eligible: false, reason: "Complicating factor/Red Flag detected (Referral only, no claim allowed)" };
    }
    if (!assessment.healthNumber) {
      return { eligible: false, reason: "Missing valid Ontario Health Number" };
    }
    if (!isInsidePharmacy && (!ruralShortageVerified || !ruralSecureAccessVerified)) {
      return { eligible: false, reason: "Rural exception criteria unverified" };
    }
    return { eligible: true };
  };

  // Dynamic PIN mapping based on Ailment type, Modality, and Outcome
  const getPINDetails = (ailmentId: string) => {
    const modality = isInsidePharmacy ? "In-Person" : "Virtual";
    const outcome = isRxIssued ? "Rx Issued" : "No Rx";

    // Dynamic PIN calculations
    const pinMap: { [key: string]: { [mod: string]: { [out: string]: string } } } = {
      allergies: {
        "In-Person": { "Rx Issued": "99120151", "No Rx": "99120152" },
        Virtual: { "Rx Issued": "99120251", "No Rx": "99120252" }
      },
      cold_flu: {
        "In-Person": { "Rx Issued": "99120153", "No Rx": "99120154" },
        Virtual: { "Rx Issued": "99120253", "No Rx": "99120254" }
      },
      skin_rash: {
        "In-Person": { "Rx Issued": "99120155", "No Rx": "99120156" },
        Virtual: { "Rx Issued": "99120255", "No Rx": "99120256" }
      },
      acid_reflux: {
        "In-Person": { "Rx Issued": "99120157", "No Rx": "99120158" },
        Virtual: { "Rx Issued": "99120257", "No Rx": "99120258" }
      }
    };

    const currentMap = pinMap[ailmentId] || pinMap["allergies"];
    return currentMap[modality][outcome];
  };

  const getQuantityCode = () => {
    if (isInsidePharmacy) return 1;
    if (ruralShortageVerified && ruralSecureAccessVerified) return 2;
    return 0; // Invalid
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
      handleStatusChange(assessment.id, "ARCHIVED"); // Moves to archived status, compliance audit leaves underlying data
    }, 1500);
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      
      {/* ====================================================================
         PANEL 1: Real-Time Live Queue (Left Column)
         ==================================================================== */}
      <div className="sidebar-panel">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <h2>Live Intake Queue</h2>
            <span className="badge badge-accent">
              {assessments.filter((a) => a.status === "PENDING" || a.status === "Pending Review").length} Live
            </span>
          </div>

          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Search patient name, ID..."
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

          {/* Real-time Tabs: Pending, In Progress, Completed/Archived */}
          <div
            style={{
              display: "flex",
              gap: "0.25rem",
              background: "var(--bg-tertiary)",
              padding: "0.25rem",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {[
              { label: "Pending", val: "PENDING" },
              { label: "Active", val: "IN_PROGRESS" },
              { label: "Archived", val: "COMPLETED" },
            ].map((tab) => (
              <button
                key={tab.val}
                onClick={() => setActiveQueueTab(tab.val as any)}
                style={{
                  flex: 1,
                  fontFamily: "var(--font-family)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.4rem 0",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  backgroundColor: activeQueueTab === tab.val ? "var(--bg-secondary)" : "transparent",
                  color: activeQueueTab === tab.val ? "var(--primary)" : "var(--text-secondary)",
                  boxShadow: activeQueueTab === tab.val ? "var(--shadow-sm)" : "none",
                  transition: "all var(--transition-fast)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Patient List */}
        <div className="patient-list">
          {filteredQueue.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Queue is empty. Waiting for QR-intakes...
            </div>
          ) : (
            filteredQueue.map((item) => {
              const waitMins = getWaitTimeMinutes(item.submittedAt);
              const isUrgent = (item.status === "PENDING" || item.status === "Pending Review") && waitMins >= 15;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`patient-card ${selectedId === item.id ? "selected" : ""} ${isUrgent ? "urgent-highlight" : ""}`}
                >
                  <div className="patient-card-header">
                    <div className="patient-name">
                      {item.patientName}
                      {isUrgent && <span style={{ color: "var(--danger)", marginLeft: "0.35rem" }}>⚠️</span>}
                    </div>
                    <div className="patient-time" style={{ color: isUrgent ? "var(--danger-text)" : "var(--text-muted)", fontWeight: isUrgent ? 700 : 500 }}>
                      {waitMins}m wait
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="patient-ailment" style={{ flex: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {item.ailmentName}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.age} {item.gender[0]}</span>
                  </div>
                  <div className="patient-card-footer">
                    <span className={`badge badge-sm ${getSeverityBadgeClass(item.severity)}`}>
                      {item.severity}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {item.id}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ====================================================================
         PANEL 2: Clinical Workspace (Center Column)
         ==================================================================== */}
      <div className="detail-panel" style={{ borderRight: "1px solid var(--border-color)" }}>
        {!selectedAssessment ? (
          <div className="detail-placeholder">
            <div className="detail-placeholder-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2>No Intake Case Selected</h2>
            <p style={{ maxWidth: "350px" }}>
              Select a patient card from the Real-Time live queue to populate the clinical assessment workspace.
            </p>
          </div>
        ) : (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            {/* Red Flag & Complicating Factor Alert Box */}
            {(() => {
              const isMaleReflux = selectedAssessment.gender === "Male" && selectedAssessment.ailmentId === "acid_reflux";
              const hasRedFlags = selectedAssessment.symptoms.some((s) => s.isRedFlag);
              
              if (isMaleReflux) {
                return (
                  <div className="red-flags-banner">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginTop: "0.15rem" }}>
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div>
                      <div className="red-flags-title">CRITICAL: Complicating factor detected</div>
                      Patient is a male selecting acid reflux indicators. High cardiac/ulcer override risk. Patient requires immediate doctor referral. Do not prescribe.
                    </div>
                  </div>
                );
              } else if (hasRedFlags) {
                return (
                  <div className="red-flags-banner">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginTop: "0.15rem" }}>
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div>
                      <div className="red-flags-title">CRITICAL: Red Flag Symptoms Detected</div>
                      Patient has checked red flag clinical exclusions. Do not treat under minor ailment protocol. Refer patient to Primary Doctor or Urgent Care.
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Assessment Header */}
            <div className="detail-section-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.45rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {selectedAssessment.patientName}
                    <span className={`badge ${getSeverityBadgeClass(selectedAssessment.severity)}`}>
                      {selectedAssessment.severity}
                    </span>
                  </h2>
                  <div className="detail-patient-meta" style={{ marginTop: "0.25rem" }}>
                    <span>Case ID: <strong>{selectedAssessment.id}</strong></span>
                    <span>Gender: <strong>{selectedAssessment.gender}</strong></span>
                    <span>Triage: <strong>{selectedAssessment.triageLevel}</strong></span>
                  </div>
                </div>

                <div className="workflow-status-controls">
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>Set Status:</span>
                  <select
                    value={selectedAssessment.status}
                    onChange={(e) => handleStatusChange(selectedAssessment.id, e.target.value)}
                    className="status-select"
                  >
                    <option value="PENDING">Pending Review</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="GP Referral">GP Referral</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived (compliance check)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Patient Clinical History & Intake Form Results */}
            <div className="detail-section-card">
              <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
                Patient Symptoms Intake
              </h3>
              <span className="ai-section-title">Selected Ailment</span>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--primary)", marginBottom: "1rem" }}>
                {selectedAssessment.ailmentName}
              </div>

              <span className="ai-section-title">Symptoms Bullet List</span>
              <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0 1rem 0", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {selectedAssessment.symptoms.map((symptom) => (
                  <li key={symptom.id} style={{ fontSize: "0.9rem", color: symptom.isRedFlag ? "var(--danger)" : "var(--text-primary)", fontWeight: symptom.isRedFlag ? 700 : 400 }}>
                    {symptom.label} {symptom.isRedFlag ? "(⚠️ Red Flag)" : ""}
                  </li>
                ))}
              </ul>

              <span className="ai-section-title">Consult Notes / History Details</span>
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
                }}
              >
                {selectedAssessment.additionalNotes || "No consult notes submitted by the patient."}
              </div>
            </div>

            {/* Structured Pharmacist Documentation Block */}
            <div className="detail-section-card">
              <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
                Pharmacist Documentation & Care Plan
              </h3>
              <div className="workflow-checklist" style={{ margin: "0.5rem 0 1rem" }}>
                {WORKFLOW_CHECKLIST.map((item) => {
                  const isChecked = checklistMap[`${selectedAssessment.id}-${item.id}`] === true;
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleChecklistItem(selectedAssessment.id, item.id)}
                      className={`checklist-item ${isChecked ? "checked" : ""}`}
                    >
                      <input type="checkbox" checked={isChecked} readOnly className="checklist-checkbox" />
                      <span style={{ textDecoration: isChecked ? "line-through" : "none" }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              <span className="ai-section-title">Clinical Decision / Treatment Notes</span>
              <textarea
                className="form-textarea"
                placeholder="Write your clinical notes here (e.g. drug details, counseling parameters)..."
                style={{ width: "100%", minHeight: "80px", fontSize: "0.85rem", marginTop: "0.35rem" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
         PANEL 3: 10-Second Billing Panel (Right Column)
         ==================================================================== */}
      <div className="sidebar-panel" style={{ width: "360px", backgroundColor: "var(--bg-primary)" }}>
        {!selectedAssessment ? (
          <div className="detail-placeholder">
            <h2>HNS Billing</h2>
            <p>Select a patient card to calculate Ministry billing values.</p>
          </div>
        ) : (
          <div className="animate-slide-up" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            {/* Title */}
            <div>
              <h3 style={{ fontSize: "1.15rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                10-Second Billing Panel
              </h3>
              <span className="ai-section-title" style={{ marginTop: "0.35rem", display: "block" }}>Ontario MOH Claims Gateway</span>
            </div>

            {/* Click-to-Copy Action Elements */}
            <div className="detail-section-card" style={{ padding: "1rem" }}>
              <strong style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.75rem" }}>
                Kroll Transcription Helpers
              </strong>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <span className="billing-detail-label">Patient Health Card</span>
                  <div className="copy-field-container">
                    <span>{selectedAssessment.healthNumber}</span>
                    <button
                      onClick={() => handleCopyToClipboard(selectedAssessment.healthNumber, "hc")}
                      className="copy-btn-icon"
                      title="Copy Health Card Number"
                    >
                      {copiedKey === "hc" ? <span className="copy-success-tooltip">Copied!</span> : null}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="billing-detail-label">Date of Birth (Kroll Format)</span>
                  <div className="copy-field-container">
                    <span>{formatDOBForKroll(selectedAssessment.dob || "1990-01-01")}</span>
                    <button
                      onClick={() => handleCopyToClipboard(formatDOBForKroll(selectedAssessment.dob || "1990-01-01"), "dob")}
                      className="copy-btn-icon"
                      title="Copy DOB (DD-MM-YYYY)"
                    >
                      {copiedKey === "dob" ? <span className="copy-success-tooltip">Copied!</span> : null}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="billing-detail-label">Dynamic HNS PIN</span>
                  <div className="copy-field-container">
                    <span>{getPINDetails(selectedAssessment.ailmentId)}</span>
                    <button
                      onClick={() => handleCopyToClipboard(getPINDetails(selectedAssessment.ailmentId), "pin")}
                      className="copy-btn-icon"
                      title="Copy 8-digit HNS PIN"
                    >
                      {copiedKey === "pin" ? <span className="copy-success-tooltip">Copied!</span> : null}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Billing Indicators */}
            {(() => {
              const isReferred = selectedAssessment.status === "GP Referral" || selectedAssessment.triageLevel === "Referral";
              const isNonODB = !selectedAssessment.healthNumber.endsWith("AB") && !selectedAssessment.healthNumber.endsWith("CD"); // Mock ODB vs non-ODB based on ending
              
              if (isReferred || isNonODB) {
                return (
                  <div className="detail-section-card" style={{ padding: "1rem", borderLeft: "4px solid var(--accent)" }}>
                    <strong style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>
                      Kroll Integration Actions
                    </strong>
                    {isReferred && (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 700, marginBottom: "0.4rem", display: "flex", gap: "0.35rem" }}>
                        <span>📍</span>
                        <span>Enter &apos;4&apos; in the SSC field in Kroll.</span>
                      </div>
                    )}
                    {isNonODB && (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 700, display: "flex", gap: "0.35rem" }}>
                        <span>📍</span>
                        <span>Use Intervention Codes: PS and ML.</span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {/* Ontario Virtual Billing Calculator & HNS Submitter */}
            {(() => {
              const billInfo = getBillingEligibility(selectedAssessment);
              const isSubmitted = billingResultMap[selectedAssessment.id] !== undefined;
              const isSubmitting = billingSubmittingMap[selectedAssessment.id] === true;
              const quantity = getQuantityCode();
              const pin = getPINDetails(selectedAssessment.ailmentId);

              return (
                <div className={`billing-panel ${billInfo.eligible ? "eligible" : "ineligible"}`} style={{ margin: 0 }}>
                  <div className="billing-status-header">
                    <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>HNS Billing Summary</span>
                    <span className={`badge ${billInfo.eligible ? "badge-success" : "badge-danger"}`}>
                      {billInfo.eligible ? "Eligible" : "Ineligible"}
                    </span>
                  </div>

                  {billInfo.eligible ? (
                    <>
                      <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                        <label className="form-label" style={{ fontSize: "0.78rem" }}>
                          Assessment Conduct Location
                        </label>
                        <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column", marginTop: "0.25rem" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer" }}>
                            <input
                              type="radio"
                              name="conduct-location-portal"
                              checked={isInsidePharmacy === true}
                              onChange={() => setIsInsidePharmacy(true)}
                              style={{ accentColor: "var(--primary)" }}
                            />
                            Inside Pharmacy (Store)
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer" }}>
                            <input
                              type="radio"
                              name="conduct-location-portal"
                              checked={isInsidePharmacy === false}
                              onChange={() => setIsInsidePharmacy(false)}
                              style={{ accentColor: "var(--primary)" }}
                            />
                            Remote Work (Rural Exception)
                          </label>
                        </div>
                      </div>

                      {!isInsidePharmacy && (
                        <div className="rural-exception-card" style={{ padding: "0.75rem", marginBottom: "0.75rem" }}>
                          <strong style={{ fontSize: "0.75rem", color: "var(--warning-text)" }}>
                            Rural Exception Verification:
                          </strong>
                          <div className="rural-checkbox-row" style={{ fontSize: "0.75rem" }}>
                            <input
                              type="checkbox"
                              id="rural-shortage-p"
                              className="symptom-checkbox"
                              style={{ width: "0.85rem", height: "0.85rem", marginTop: "0.1rem" }}
                              checked={ruralShortageVerified}
                              onChange={(e) => setRuralShortageVerified(e.target.checked)}
                            />
                            <label htmlFor="rural-shortage-p">On-site staffing shortage / surge verified</label>
                          </div>
                          <div className="rural-checkbox-row" style={{ fontSize: "0.75rem" }}>
                            <input
                              type="checkbox"
                              id="rural-secure-p"
                              className="symptom-checkbox"
                              style={{ width: "0.85rem", height: "0.85rem", marginTop: "0.1rem" }}
                              checked={ruralSecureAccessVerified}
                              onChange={(e) => setRuralSecureAccessVerified(e.target.checked)}
                            />
                            <label htmlFor="rural-secure-p">Secure HNS connection established</label>
                          </div>
                        </div>
                      )}

                      <div className="form-group" style={{ marginBottom: "0.75rem", flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                        <input
                          type="checkbox"
                          id="rx-issued-p"
                          className="symptom-checkbox"
                          style={{ width: "1rem", height: "1rem" }}
                          checked={isRxIssued}
                          onChange={(e) => setIsRxIssued(e.target.checked)}
                        />
                        <label htmlFor="rx-issued-p" style={{ fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                          Prescription Issued?
                        </label>
                      </div>

                      <div className="billing-grid" style={{ margin: "0.5rem 0" }}>
                        <div className="billing-detail-row">
                          <span className="billing-detail-label">Quantity</span>
                          <span className="billing-detail-value" style={{ color: quantity === 0 ? "var(--danger)" : "var(--text-primary)" }}>
                            {quantity === 0 ? "Invalid" : quantity}
                          </span>
                        </div>
                        <div className="billing-detail-row">
                          <span className="billing-detail-label">Claim Rate</span>
                          <span className="billing-detail-value">$15.00</span>
                        </div>
                      </div>

                      {isSubmitted ? (
                        <div
                          style={{
                            padding: "0.75rem",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--success-light)",
                            border: "1px solid var(--success)",
                            color: "var(--success-text)",
                            fontSize: "0.8rem",
                            marginTop: "0.5rem",
                          }}
                        >
                          <strong>HNS Authorized Successfully:</strong>
                          <ul style={{ listStyleType: "none", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                            <li>• Auth Code: {billingResultMap[selectedAssessment.id].authCode}</li>
                            <li>• Time: {billingResultMap[selectedAssessment.id].date}</li>
                            <li>• Qty {quantity} / PIN {pin.split(" ")[0]} logged</li>
                          </ul>
                        </div>
                      ) : (
                        <button
                          disabled={isSubmitting || quantity === 0}
                          onClick={() => handleBillingSubmit(selectedAssessment)}
                          className="btn btn-accent btn-sm"
                          style={{ width: "100%", marginTop: "0.5rem" }}
                        >
                          {isSubmitting ? "Transmitting to HNS..." : `Submit Claim ($15.00)`}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="alert-box alert-box-danger" style={{ marginTop: "0.5rem", padding: "0.75rem" }}>
                      <div style={{ fontSize: "0.8rem" }}>
                        <strong>Rejection Reason:</strong>
                        <div style={{ marginTop: "0.15rem" }}>{billInfo.reason}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        )}
      </div>

    </div>
  );
}
