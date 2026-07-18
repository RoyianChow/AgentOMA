"use client";

import { useState } from "react";
import Link from "next/link";

import { acceptInvitationAction } from "./actions";

export default function AcceptInvitationForm({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await acceptInvitationAction({ token, name, password });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div style={{ maxWidth: "420px", margin: "6rem auto", padding: "0 1.5rem" }}>
        <div className="detail-section-card" style={{ padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Account created</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Sign in with your email and new password. You will then set up
            two-factor authentication — it is required before you can use the
            portal.
          </p>
          <Link href="/sign-in" className="btn btn-primary">Go to sign-in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "420px", margin: "6rem auto", padding: "0 1.5rem" }}>
      <div className="detail-section-card" style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>Join your pharmacy on AgentOMA</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Choose the name colleagues will see and a password (12+ characters).
        </p>

        {error && (
          <div style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "0.9rem" }}>{error}</div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="form-label" htmlFor="name">Full name</label>
            <input id="name" type="text" className="form-input" value={name}
              onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
          <div>
            <label className="form-label" htmlFor="pw">Password</label>
            <input id="pw" type="password" className="form-input" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={12}
              autoComplete="new-password" />
          </div>
          <div>
            <label className="form-label" htmlFor="pw2">Confirm password</label>
            <input id="pw2" type="password" className="form-input" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required minLength={12}
              autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
