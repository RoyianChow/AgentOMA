"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import styles from "./SignIn.module.css";

/**
 * Sign-in for the pharmacist portal — UI layer only; the auth calls and their
 * ordering are unchanged (better-auth email+password, then the mandatory TOTP
 * challenge as its own deliberate step).
 *
 * Error copy is mapped CLIENT-SIDE and is deliberately generic: a failed
 * sign-in never reveals whether the email exists, and a rate-limited attempt
 * gets a calm notice instead of a raw server message. There is NO signup
 * link anywhere on this page — access is by admin invitation only.
 */

type SignInError =
  | { kind: "credentials"; message: string }
  | { kind: "totp"; message: string }
  | { kind: "throttle"; message: string };

const GENERIC_CREDENTIALS_ERROR =
  "That email or password is incorrect. Check both and try again.";
const GENERIC_TOTP_ERROR =
  "That code wasn't accepted. Enter the current 6-digit code from your authenticator app.";
const THROTTLE_MESSAGE =
  "Too many attempts in a short time. This pauses briefly for security — wait a minute, then try again.";

function BrandMark() {
  return (
    <svg
      className={styles.brandMark}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1.5" y="1.5" width="37" height="37" rx="10" fill="currentColor" />
      <path
        d="M20 10.5v19M10.5 20h19"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<SignInError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return; // belt on top of the disabled button — no double-submit
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) {
      setError(
        res.error.status === 429
          ? { kind: "throttle", message: THROTTLE_MESSAGE }
          : { kind: "credentials", message: GENERIC_CREDENTIALS_ERROR }
      );
      return;
    }
    if (res.data && "twoFactorRedirect" in res.data) {
      setCode("");
      setError(null);
      setStep("totp");
      return;
    }
    router.push("/pharmacist");
  }

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (res.error) {
      setError(
        res.error.status === 429
          ? { kind: "throttle", message: THROTTLE_MESSAGE }
          : { kind: "totp", message: GENERIC_TOTP_ERROR }
      );
      return;
    }
    router.push("/pharmacist");
  }

  const credentialsError = error?.kind === "credentials" ? error.message : null;
  const totpError = error?.kind === "totp" ? error.message : null;
  const throttleNotice = error?.kind === "throttle" ? error.message : null;

  return (
    <div className={styles.shell}>
      <div className={styles.column}>
        <div className={styles.brand}>
          <BrandMark />
          <div>
            <span className={styles.brandName}>AgentOMA</span>
            <span className={styles.brandSub}>Pharmacist Portal</span>
          </div>
        </div>

        <div className={styles.card}>
          {step === "credentials" ? (
            <>
              <span className={styles.stepTag}>Sign in · Step 1 of 2</span>
              <h1 className={styles.heading}>Sign in to your pharmacy</h1>
              <p className={styles.lede}>
                Use your pharmacy account. A verification code from your
                authenticator app is required after your password.
              </p>

              {throttleNotice && (
                <p className={styles.notice} role="alert" style={{ marginBottom: "1.1rem" }}>
                  {throttleNotice}
                </p>
              )}

              <form onSubmit={submitCredentials} className={styles.form} noValidate>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`${styles.input} ${credentialsError ? styles.inputInvalid : ""}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    aria-invalid={credentialsError ? true : undefined}
                    aria-describedby={credentialsError ? "credentials-error" : undefined}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className={`${styles.input} ${credentialsError ? styles.inputInvalid : ""}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    aria-invalid={credentialsError ? true : undefined}
                    aria-describedby={credentialsError ? "credentials-error" : undefined}
                  />
                  {credentialsError && (
                    <p id="credentials-error" className={styles.errorText} role="alert">
                      {credentialsError}
                    </p>
                  )}
                </div>
                <button type="submit" className={styles.submit} disabled={busy}>
                  {busy ? "Signing in…" : "Continue"}
                </button>
              </form>
            </>
          ) : (
            <>
              <span className={styles.stepTag}>Sign in · Step 2 of 2</span>
              <h1 className={styles.heading}>Two-step verification</h1>
              <p className={styles.lede}>
                Enter the 6-digit code from the authenticator app on your
                phone. Codes refresh every 30 seconds.
              </p>

              {throttleNotice && (
                <p className={styles.notice} role="alert" style={{ marginBottom: "1.1rem" }}>
                  {throttleNotice}
                </p>
              )}

              <form onSubmit={submitTotp} className={styles.form} noValidate>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="totp">Verification code</label>
                  <input
                    id="totp"
                    name="totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    className={`${styles.totpInput} ${totpError ? styles.inputInvalid : ""}`}
                    value={code}
                    // Paste-friendly: "123 456", "123-456" etc. normalize to digits.
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    autoComplete="one-time-code"
                    autoFocus
                    aria-invalid={totpError ? true : undefined}
                    aria-describedby={totpError ? "totp-error" : undefined}
                  />
                  {totpError && (
                    <p id="totp-error" className={styles.errorText} role="alert">
                      {totpError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className={styles.submit}
                  disabled={busy || code.length !== 6}
                >
                  {busy ? "Verifying…" : "Verify and sign in"}
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => {
                    setStep("credentials");
                    setCode("");
                    setError(null);
                  }}
                >
                  ← Back to email and password
                </button>
              </form>
            </>
          )}
        </div>

        <p className={styles.footnote}>
          Access is by invitation from your pharmacy admin — there is no public
          sign-up. Locked out? Ask your pharmacy admin.
        </p>
      </div>
    </div>
  );
}
