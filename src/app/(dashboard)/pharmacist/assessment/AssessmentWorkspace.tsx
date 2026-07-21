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

export default function AssessmentWorkspace({
  session,
}: {
  session: IntakeSessionDTO;
}) {
  // Patient Identity
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [healthNumber, setHealthNumber] = useState("");
  const [gender, setGender] = useState<"F" | "M" | "U" | "">("");  // Clinical Workflow
  const [viewerChecked, setViewerChecked] = useState(false);
  const [systemCount, setSystemCount] = useState<number | null>(null);
  const [outcome, setOutcome] = useState("rx_issued");
  const [modality, setModality] = useState("in_person");

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

  const checkHistory = async (patientId: string, ailmentCode: string) => {
    const res = await getPatientHistoryCount(patientId, ailmentCode);
    if (res.success) {
      setSystemCount(res.count);
    }
  };

  const handleSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();




    if (!gender) {
      setError("Please select a gender.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 2. Resolve Patient (TypeScript now knows gender is "F" | "M" | "U")
      const patientRes = await upsertPatient({
        firstName,
        lastName,
        dob: new Date(dob),
        healthNumber,
        gender,
      });

      if (!patientRes.success) {
        throw new Error(patientRes.error || "Failed to save patient.");
      }

      const patientId = patientRes.patientId;
      const ailmentCode = session.ailmentGroupCode;

      // Check history just to update UI right before submit, but server will check mutex
      await checkHistory(patientId, ailmentCode);

      // 2. Create Assessment. Pharmacy + prescriber identity come from the
      // authenticated session server-side.
      const assessmentRes = await createAssessment({
        patientId,
        ailmentGroupCode: ailmentCode,
        modality,
        intakeSessionId: session.id,
        outcome,
        serviceDate: new Date(),
        isOdbRecipient,
      });

      if (!assessmentRes.success) {
        throw new Error(assessmentRes.error || "Failed to create assessment.");
      }

      // A non-billable result is NOT an error — the assessment was recorded, and
      // the panel explains why no claim was drafted.
      setClaimResult(assessmentRes.claim ?? null);
      if ("assessmentId" in assessmentRes) {
        setAssessmentId(assessmentRes.assessmentId as string);
      }
      setIsDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
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
