"use client";

import { SYNTHETIC_BANNER } from "../security/headers";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void reset;
  return (
    <section className="card" aria-labelledby="error-title">
      <div className="banner">{SYNTHETIC_BANNER}</div>
      <h1 id="error-title">Synthetic workspace unavailable</h1>
      <p>The request was denied safely. No payload or error details are shown.</p>
    </section>
  );
}
