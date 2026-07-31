import { loadSandboxEnv } from "../env/server";
import { getSyntheticFixture } from "../fixtures/synthetic";
import { getSyntheticActor } from "../identity/actor";
import { requireLocalActive } from "../lifecycle/state";

export default function SandboxHomePage() {
  const env = loadSandboxEnv({ phase: "startup", allowExpired: true });
  requireLocalActive(env);
  const actor = getSyntheticActor(env);
  const fixture = getSyntheticFixture();

  return (
    <section className="card" aria-labelledby="sandbox-title">
      <div className="eyebrow">Separate local workspace</div>
      <h1 id="sandbox-title">Synthetic workflow laboratory</h1>
      <p>This page is a non-operational shell for future experiments. It does not diagnose, prescribe, dispense, submit claims, message anyone, or connect to a pharmacy system.</p>
      <div className="fixture" aria-label="Synthetic fixture">
        <strong>{fixture.title}</strong>
        <span>{fixture.summary}</span>
        <code>{fixture.id}</code>
        <span>{fixture.status}</span>
      </div>
      <h2>Server-owned reviewer</h2>
      <p>{actor.displayName} ({actor.role}) is assigned by the local server. Client role, subject, pharmacy, and capability values do not grant authority.</p>
      <div className="actions">
        <a className="button" href="/sample-artifact">Download marked sample artifact</a>
      </div>
    </section>
  );
}
