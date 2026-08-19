import Link from "next/link";

import { loadSandboxEnv } from "../../../env/server";
import { requireLocalActive } from "../../../lifecycle/state";
import { listVirtualCareQueueRows } from "../../../virtual-care/visit-server";
import { humanize } from "../scene-components";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function VirtualCarePharmacistQueuePage() {
  const env = loadSandboxEnv({ phase: "startup", allowExpired: true });
  requireLocalActive(env);
  const rows = listVirtualCareQueueRows();

  return (
    <section className="card queue-page" aria-labelledby="pharmacist-queue-title">
      <div className="eyebrow">Synthetic pharmacist waiting-room queue</div>
      <h1 id="pharmacist-queue-title">Virtual-care queue</h1>
      <p>
        Every row below is an independent synthetic visit. This queue is read-only; opening a
        row runs the same server-owned authorization checks as every other control in this
        prototype.
      </p>
      <ol className="queue-list">
        {rows.map((row) => (
          <li key={row.scenario} className="queue-item">
            <article aria-labelledby={`queue-${row.scenario}`}>
              <div className="queue-item-heading">
                <h3 id={`queue-${row.scenario}`}>{row.label}</h3>
                <span className="queue-status">{humanize(row.workflowState)}</span>
              </div>
              <dl className="queue-details">
                <div>
                  <dt>Connection</dt>
                  <dd>{humanize(row.connectionState)}</dd>
                </div>
                <div>
                  <dt>Requested modality</dt>
                  <dd>{humanize(row.requestedModality)}</dd>
                </div>
                <div>
                  <dt>Approved modality</dt>
                  <dd>{row.approvedModality ? humanize(row.approvedModality) : "Not yet approved"}</dd>
                </div>
              </dl>
              <Link href={`/virtual-care/pharmacist/${row.scenario}`}>Open synthetic visit</Link>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
