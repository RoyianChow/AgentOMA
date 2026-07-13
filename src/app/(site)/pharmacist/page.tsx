"use client";

import { useState } from "react";
import Link from "next/link";
import { claimIntakeSession, upsertPatient, createAssessment, getPatientHistoryCount } from "./actions";

// Use a mock pharmacy ID for now
const MOCK_PHARMACY_ID = "00000000-0000-0000-0000-000000000000";

type IntakeSession = {
  id: string;
  code: string;
  pharmacyId: string;
  ailmentGroupCode: string;
  trail: { question: string; answer: string }[] | null;
  priorCountSelfReport: number | null;
  existingRxSelfReport: string | null;
};

export default function PharmacistDashboard() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<IntakeSession | null>(null);
  const [isColdStart, setIsColdStart] = useState(false);
  const [coldStartAilment, setColdStartAilment] = useState("RHINITIS"); // Default for cold start dropdown

  // Patient Identity
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [healthNumber, setHealthNumber] = useState("");
  const [gender, setGender] = useState("");

  // Clinical Workflow
  const [viewerChecked, setViewerChecked] = useState(false);
  const [systemCount, setSystemCount] = useState<number | null>(null);
  const [outcome, setOutcome] = useState("rx_issued");
  const [modality, setModality] = useState("in_person");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError("Please enter a 6-character code.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    
    try {
      const res = await claimIntakeSession(code, MOCK_PHARMACY_ID);
      if (res.success && res.session) {
        setSession(res.session);
        setIsColdStart(false);
      } else {
        setError(res.error || "Failed to claim intake.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleColdStart = () => {
    setSession(null);
    setIsColdStart(true);
    setError(null);
    setSuccessMsg(null);
  };

  const checkHistory = async (patientId: string, ailmentCode: string) => {
    const res = await getPatientHistoryCount(patientId, ailmentCode);
    if (res.success) {
      setSystemCount(res.count);
    }
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 1. Resolve Patient
      const patientRes = await upsertPatient({
        firstName,
        lastName,
        dob: new Date(dob),
        healthNumber,
        gender
      });

      if (!patientRes.success || !patientRes.patientId) {
        throw new Error(patientRes.error || "Failed to save patient.");
      }

      const patientId = patientRes.patientId;
      const ailmentCode = session ? session.ailmentGroupCode : coldStartAilment;
      
      // Check history just to update UI right before submit, but server will check mutex
      await checkHistory(patientId, ailmentCode);

      // 2. Create Assessment
      const assessmentRes = await createAssessment({
        pharmacyId: MOCK_PHARMACY_ID,
        patientId,
        ailmentGroupCode: ailmentCode,
        modality,
        intakeSessionId: session ? session.id : undefined,
        outcome,
        serviceDate: new Date(),
      });

      if (!assessmentRes.success) {
        throw new Error(assessmentRes.error || "Failed to create assessment.");
      }

      setSuccessMsg("Assessment successfully recorded!");
      // Clear form
      setSession(null);
      setIsColdStart(false);
      setCode("");
      setFirstName("");
      setLastName("");
      setDob("");
      setHealthNumber("");
      setGender("");
      
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-layout animate-fade-in" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Pharmacist Desk</h1>
        <Link href="/pharmacist/audit" className="btn btn-secondary">Audit Log</Link>
      </div>

      {!session && !isColdStart ? (
        <div style={{ display: "flex", gap: "2rem", flexDirection: "column", maxWidth: "500px", margin: "0 auto", marginTop: "4rem" }}>
          
          <div className="hero-card-item" style={{ textAlign: "center", padding: "2rem" }}>
            <h2 style={{ marginBottom: "1rem" }}>Load Patient Intake</h2>
            <form onSubmit={handleClaim} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="6-Char Code" 
                maxLength={6}
                style={{ 
                  fontSize: "2rem", 
                  textAlign: "center", 
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  border: "2px solid var(--border-color)"
                }} 
              />
              <button type="submit" className="btn btn-primary" disabled={isLoading || code.length !== 6}>
                {isLoading ? "Loading..." : "Retrieve Intake"}
              </button>
            </form>
            {error && <div style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</div>}
          </div>

          <div style={{ textAlign: "center" }}>
            <span style={{ color: "var(--text-muted)", margin: "0 1rem" }}>or</span>
          </div>

          <div style={{ textAlign: "center" }}>
            <button type="button" className="btn btn-secondary" onClick={handleColdStart} style={{ width: "100%" }}>
              Start Walk-in Assessment (No Code)
            </button>
          </div>

          {successMsg && (
            <div style={{ padding: "1rem", background: "var(--success-light)", color: "var(--success-text)", borderRadius: "var(--radius-md)", textAlign: "center" }}>
              {successMsg}
            </div>
          )}

        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          
          {/* Left Column: Identity & Clinical Decision */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="detail-section-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3>Patient Identity</h3>
                <button type="button" className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }} onClick={() => { setSession(null); setIsColdStart(false); }}>
                  Cancel
                </button>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Key this strictly from the physical health card to prevent drift.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="form-label">First Name</label>
                  <input type="text" className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Last Name</label>
                  <input type="text" className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">DOB (YYYY-MM-DD)</label>
                  <input type="date" className="form-input" value={dob} onChange={e => setDob(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Health Card Number</label>
                  <input type="text" className="form-input" value={healthNumber} onChange={e => setHealthNumber(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <select className="form-input" value={gender} onChange={e => setGender(e.target.value)} required>
                    <option value="">Select...</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                    <option value="X">X</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="detail-section-card">
              <h3 style={{ marginBottom: "1rem" }}>Clinical Decision & Billing</h3>
              {error && <div style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "0.9rem", padding: "0.5rem", background: "var(--danger-light)", borderRadius: "var(--radius-sm)" }}>{error}</div>}
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {isColdStart && (
                  <div>
                    <label className="form-label">Ailment Group</label>
                    <select className="form-input" value={coldStartAilment} onChange={e => setColdStartAilment(e.target.value)}>
                      <option value="RHINITIS">Rhinitis</option>
                      <option value="HERPES_LABIALIS">Herpes Labialis</option>
                      <option value="DERMATITIS">Dermatitis</option>
                      <option value="GERD">GERD</option>
                      <option value="URINARY_TRACT_INFECTION">Urinary Tract Infection</option>
                      <option value="INSECT_BITES">Insect Bites</option>
                      <option value="TICK_BITES">Tick Bites</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="form-label">Outcome</label>
                  <select className="form-input" value={outcome} onChange={e => setOutcome(e.target.value)}>
                    <option value="rx_issued">Prescription Issued</option>
                    <option value="no_rx_referral">No Rx - Referral</option>
                    <option value="no_rx_otc_or_nonpharm">No Rx - OTC / Non-Pharm</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Modality</label>
                  <select className="form-input" value={modality} onChange={e => setModality(e.target.value)}>
                    <option value="in_person">In Person</option>
                    <option value="virtual_from_pharmacy">Virtual (From Pharmacy)</option>
                    <option value="virtual_remote">Virtual (Remote Exception)</option>
                  </select>
                </div>
                
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleSubmitAssessment}
                  disabled={isSubmitting || !firstName || !lastName || !dob || !healthNumber || !gender || !viewerChecked}
                  style={{ marginTop: "1rem" }}
                >
                  {isSubmitting ? "Saving..." : "Sign & Create Assessment"}
                </button>
                {(!viewerChecked) && (
                  <div style={{ fontSize: "0.8rem", color: "var(--warning-text)" }}>You must attest to checking the clinical viewer below before signing.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Intake Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="detail-section-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3>{session ? `Intake: ${session.ailmentGroupCode}` : "Walk-in Assessment"}</h3>
                {session && <span className="badge badge-accent">Code: {session.code}</span>}
              </div>

              {session && session.trail ? (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Triage Trail</h4>
                  <ul style={{ listStyleType: "none", padding: 0, margin: 0, fontSize: "0.88rem" }}>
                    {session.trail.map((t, i) => (
                      <li key={i} style={{ padding: "0.5rem", borderBottom: "1px solid var(--border-color)", background: i % 2 === 0 ? "var(--bg-tertiary)" : "transparent" }}>
                        <strong>Q:</strong> {t.question}<br/>
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
                    <strong>Clinical Viewer Attestation</strong><br/>
                    I confirm that I have checked the provincial clinical viewer and verified the patient has not exceeded the funded maximums for this ailment group in the trailing 365 days.
                  </div>
                </label>
              </div>

            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
