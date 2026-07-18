"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

/**
 * Sign-in for the pharmacist portal. Two steps when the account has TOTP
 * enrolled: password, then the 6-digit code. There is deliberately NO
 * "trust this device" option — pharmacy terminals are shared machines.
 *
 * A signed-in user who has not yet enrolled TOTP is bounced to /enroll-2fa by
 * the portal's server-side guard; nothing PHI-adjacent renders before then.
 */
export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Sign-in failed.");
      return;
    }
    if (res.data && "twoFactorRedirect" in res.data) {
      setStep("totp");
      return;
    }
    router.push("/pharmacist");
  }

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "That code was not accepted.");
      return;
    }
    router.push("/pharmacist");
  }

  return (
    <div style={{ maxWidth: "420px", margin: "6rem auto", padding: "0 1.5rem" }}>
      <div className="detail-section-card" style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>AgentOMA Portal</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          {step === "credentials"
            ? "Sign in with your pharmacy account."
            : "Enter the 6-digit code from your authenticator app."}
        </p>

        {error && (
          <div style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {step === "credentials" ? (
          <form onSubmit={submitCredentials} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="form-input" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="form-input" value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitTotp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="form-label" htmlFor="totp">Authenticator code</label>
              <input id="totp" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                className="form-input" value={code} onChange={(e) => setCode(e.target.value)}
                required autoComplete="one-time-code" autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Verifying…" : "Verify"}
            </button>
          </form>
        )}

        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "1.5rem" }}>
          No account? Access is by invitation from your pharmacy admin only.
        </p>
      </div>
    </div>
  );
}
