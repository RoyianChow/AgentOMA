import Link from "next/link";

import { loadSandboxEnv } from "../../env/server";
import { requireLocalActive } from "../../lifecycle/state";
import { listVirtualCareScenarios } from "../../virtual-care/visit-server";
import { humanize } from "./scene-components";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function VirtualCareIndexPage() {
  const env = loadSandboxEnv({ phase: "startup", allowExpired: true });
  requireLocalActive(env);
  const scenarios = listVirtualCareScenarios();

  return (
    <section className="card" aria-labelledby="virtual-care-title">
      <div className="eyebrow">Task 06 — synthetic prototype</div>
      <h1 id="virtual-care-title">Synthetic pharmacist-led virtual care</h1>
      <p>
        Every scenario below is a deterministic, server-owned synthetic visit. No real people,
        pharmacies, or clinical records exist anywhere in this feature, and no vendor or network
        call is made. Every control shown is backed by a server-side authorization check — the UI
        never decides what is allowed on its own.
      </p>
      <div className="actions">
        <Link className="button" href="/virtual-care/pharmacist">
          Open synthetic pharmacist queue
        </Link>
      </div>
      <h2>Scenarios ({scenarios.length})</h2>
      <ul className="scenario-index">
        {scenarios.map((scenario) => (
          <li key={scenario}>
            <span>{humanize(scenario)}</span>
            <Link href={`/virtual-care/patient/${scenario}`}>Patient view</Link>
            <Link href={`/virtual-care/pharmacist/${scenario}`}>Pharmacist view</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
