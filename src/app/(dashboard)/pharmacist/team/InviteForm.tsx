"use client";

import { useState } from "react";

import type { PortalRole } from "@/lib/auth-guard";
import { issueInvitationAction } from "./actions";

const ROLE_OPTIONS: { value: PortalRole; label: string }[] = [
  { value: "pharmacist", label: "Pharmacist" },
  { value: "pharmacy_admin", label: "Pharmacy admin" },
  { value: "intern", label: "Intern" },
  { value: "student", label: "Student" },
  { value: "technician", label: "Technician" },
];

export default function InviteForm({
  supervisors,
}: {
  supervisors: { id: string; name: string }[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PortalRole>("pharmacist");
  const [supervisorId, setSupervisorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const needsSupervisor = role === "intern" || role === "student";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInviteUrl(null);
    const res = await issueInvitationAction({
      email,
      role,
      supervisingPharmacistId: needsSupervisor ? supervisorId || null : null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setInviteUrl(res.inviteUrl);
    setEmail("");
  }

  return (
    <div className="detail-section-card">
      <h3 style={{ marginBottom: "0.5rem" }}>Invite someone</h3>
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
        Single-use link, expires in 7 days. Share it with the invitee yourself —
        it is shown once, below, and never stored.
      </p>

      {error && (
        <div style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "0.9rem" }}>{error}</div>
      )}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label className="form-label" htmlFor="inv-email">Email</label>
          <input id="inv-email" type="email" className="form-input" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="form-label" htmlFor="inv-role">Role</label>
          <select id="inv-role" className="form-input" value={role}
            onChange={(e) => setRole(e.target.value as PortalRole)}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        {needsSupervisor && (
          <div>
            <label className="form-label" htmlFor="inv-supervisor">Supervising pharmacist</label>
            <select id="inv-supervisor" className="form-input" value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)} required>
              <option value="">Select…</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              The supervisor&apos;s OCP number is the one that goes on any claim.
            </span>
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Issuing…" : "Issue invitation"}
        </button>
      </form>

      {inviteUrl && (
        <div style={{ marginTop: "1.25rem" }}>
          <div className="form-label">Invitation link (copy it now)</div>
          <code style={{ display: "block", padding: "0.6rem", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", wordBreak: "break-all", userSelect: "all" }}>
            {inviteUrl}
          </code>
        </div>
      )}
    </div>
  );
}
