import { SYNTHETIC_BANNER } from "../security/headers";

export default function NotFound() {
  return (
    <section className="card" aria-labelledby="not-found-title">
      <div className="banner">{SYNTHETIC_BANNER}</div>
      <h1 id="not-found-title">Synthetic page not found</h1>
      <p>No operational record or patient content exists in this workspace.</p>
    </section>
  );
}
