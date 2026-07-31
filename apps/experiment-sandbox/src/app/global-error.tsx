"use client";

const BANNER = "EXPERIMENT — SYNTHETIC DATA — NOT FOR PATIENT CARE";

type GlobalErrorProps = Readonly<{ reset: () => void }>;

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 24, fontFamily: "Arial, sans-serif" }}>
        <div style={{ border: "2px solid #a9701a", padding: 20 }} role="alert">
          <strong>{BANNER}</strong>
          <h1>Sandbox unavailable</h1>
          <p>The request was denied safely.</p>
          <button type="button" onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  );
}
