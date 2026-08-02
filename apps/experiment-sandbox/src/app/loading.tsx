import { SYNTHETIC_BANNER } from "../security/headers";

export default function Loading() {
  return (
    <section className="card" aria-live="polite">
      <div className="banner">{SYNTHETIC_BANNER}</div>
      <p>Loading the local synthetic workspace.</p>
    </section>
  );
}
