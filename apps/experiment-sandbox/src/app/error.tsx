"use client";

import { SYNTHETIC_BANNER } from "../security/headers";

type SandboxErrorProps = Readonly<{ reset: () => void }>;

export default function SandboxError({ reset }: SandboxErrorProps) {
  return (
    <section className="card" aria-labelledby="error-title">
      <div className="banner">{SYNTHETIC_BANNER}</div>
      <h1 id="error-title">Synthetic workspace unavailable</h1>
      <p>The request was denied safely. No payload or error details are shown.</p>
      <button type="button" onClick={reset}>Try again</button>
    </section>
  );
}
