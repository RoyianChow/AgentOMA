import Link from "next/link";

import { requirePortalPage } from "@/lib/auth-guard";
import { listTeam } from "./actions";
import InviteForm from "./InviteForm";

export const dynamic = "force-dynamic";

// Admin-only team management: current members + invitation issuance.
export default async function TeamPage() {
  await requirePortalPage(["pharmacy_admin"]);
  const team = await listTeam();
  const supervisors = team.filter(
    (m) => m.role === "pharmacist" || m.role === "pharmacy_admin"
  );

  return (
    <div className="animate-fade-in" style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Team</h1>
        <Link href="/pharmacist" className="btn btn-secondary">Back to Dashboard</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        <div className="detail-section-card">
          <h3 style={{ marginBottom: "1rem" }}>Members</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {team.map((m) => (
              <li key={m.id} style={{ padding: "0.6rem 0", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{m.email}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="badge badge-accent">{m.role}</span>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      {m.ocpNumber ? `OCP ${m.ocpNumber}` : "no OCP # on file"}
                      {" · "}
                      {m.twoFactorEnabled ? "2FA ✓" : "2FA pending"}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <InviteForm
          supervisors={supervisors.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </div>
  );
}
