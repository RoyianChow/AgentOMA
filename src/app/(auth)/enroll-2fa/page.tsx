"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

function secretFromTotpUri(uri: string): string | null {
  const m = /[?&]secret=([^&]+)/.exec(uri);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Mandatory TOTP enrollment. A freshly invited user lands here after their
 * first sign-in: the portal's server-side guard refuses every portal action
 * and page until enrollment is verified, so this screen is the only thing a
 * single-factor session can reach.
 */
export default function EnrollTwoFactorPage() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "verify">("password");
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function begin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Could not start enrollment.");
      return;
    }
    setTotpUri(res.data.totpURI);
    setBackupCodes(res.data.backupCodes);
    setStep("verify");
  }

  async function verify(e: React.FormEvent) {
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

  const secret = totpUri ? secretFromTotpUri(totpUri) : null;

  return (
    <div style={{ maxWidth: "480px", margin: "5rem auto", padding: "0 1.5rem" }}>
      <div className="detail-section-card" style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>Set up two-factor authentication</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          This portal reaches patient health information. Two-factor
          authentication is required — you cannot use the portal without it.
        </p>

        {error && (
          <div style={{ color: "var(--danger)", marginBottom: "1rem", fontSize: "0.9rem" }}>{error}</div>
        )}

        {step === "password" ? (
          <form onSubmit={begin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="form-label" htmlFor="pw">Confirm your password</label>
              <input id="pw" type="password" className="form-input" value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Starting…" : "Begin setup"}
            </button>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <div className="form-label">1 · Add this account to your authenticator app</div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                In Google Authenticator / Aegis / 1Password choose &ldquo;enter a
                setup key&rdquo; and paste this secret (account: AgentOMA, type:
                time-based):
              </p>
              <code style={{ display: "block", padding: "0.6rem", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", fontSize: "0.95rem", wordBreak: "break-all", userSelect: "all" }}>
                {secret ?? totpUri}
              </code>
            </div>
            <div>
              <div className="form-label">2 · Save your backup codes</div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Each works once if you lose your device. Store them somewhere safe — they are not shown again.
              </p>
              <code style={{ display: "block", padding: "0.6rem", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", whiteSpace: "pre-wrap", userSelect: "all" }}>
                {backupCodes.join("\n")}
              </code>
            </div>
            <form onSubmit={verify} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="form-label" htmlFor="code">3 · Enter the 6-digit code to finish</label>
                <input id="code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  className="form-input" value={code} onChange={(e) => setCode(e.target.value)}
                  required autoComplete="one-time-code" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Verifying…" : "Verify & finish"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
