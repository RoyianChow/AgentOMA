import { requirePortalPage } from "@/lib/auth-guard";
import { getGovernanceReport } from "@/lib/governance";

import {
  addCorrectionAction,
  createRequestAction,
  decideRequestAction,
  executeDestructionAction,
  placeHoldAction,
  prepareDestructionAction,
  recordRestoreDrillAction,
  releaseHoldAction,
  startExportAction,
} from "./actions";
import styles from "./governance.module.css";

export const dynamic = "force-dynamic";

function showDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function GovernancePage() {
  const actor = await requirePortalPage(["pharmacy_admin"]);
  const report = await getGovernanceReport(actor);
  const completeness = report.completeness ?? {
    total: 0,
    version_2_complete: 0,
    legacy_version_1: 0,
    with_active_claim_draft: 0,
  };
  const retention = report.retention ?? {
    patients_with_policy: 0,
    eligible_now: 0,
    active_holds: 0,
    next_eligible_on: null,
  };

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <h1>Record governance</h1>
        <p>
          Server-rendered compliance controls for retention, patient access,
          correction overlays, legal holds, reviewed destruction, exports, and
          restore evidence. No record set is sent to a client component.
        </p>
      </header>

      <section className={styles.grid} aria-label="Compliance reports">
        <article className={styles.card}>
          <h2>Record completeness</h2>
          <div className={styles.metric}>{completeness.total}</div>
          <p>Total assessments</p>
          <ul className={styles.list}>
            <li>Version 2 complete: {completeness.version_2_complete}</li>
            <li>Legacy version 1: {completeness.legacy_version_1}</li>
            <li>Active claim draft: {completeness.with_active_claim_draft}</li>
          </ul>
        </article>

        <article className={styles.card}>
          <h2>Retention and holds</h2>
          <div className={styles.metric}>{retention.patients_with_policy}</div>
          <p>Patients with a computed retention policy</p>
          <ul className={styles.list}>
            <li>Eligible for reviewed destruction today: {retention.eligible_now}</li>
            <li>Active holds: {retention.active_holds}</li>
            <li>Earliest horizon: {retention.next_eligible_on ?? "—"}</li>
          </ul>
        </article>

        <article className={styles.card}>
          <h2>Audit write failures</h2>
          <div className={styles.metric}>{report.failures.length}</div>
          <p>Unfiltered recent failure records (maximum 20).</p>
          <ul className={styles.list}>
            {report.failures.map((failure) => (
              <li key={failure.id}>
                {failure.attemptedAction} · {failure.failureCode} ·{" "}
                {showDate(failure.occurredAt)}
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <h2>Access/correction requests</h2>
          <ul className={styles.list}>
            {report.requestStatuses.length === 0 ? (
              <li>No requests recorded.</li>
            ) : (
              report.requestStatuses.map((row) => (
                <li key={row.status}>
                  {row.status}: {row.count}
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      <section className={styles.grid} aria-label="Governance actions">
        <article className={styles.card}>
          <h2>Complete patient export</h2>
          <p>
            Generates a server-assembled JSON record with a stored manifest and
            SHA-256 hash for every artifact.
          </p>
          <form action={startExportAction} className={styles.form}>
            <label>
              Patient record ID
              <input name="patientId" required />
            </label>
            <button type="submit">Download secure export</button>
          </form>
        </article>

        <article className={styles.card}>
          <h2>Place a hold</h2>
          <form action={placeHoldAction} className={styles.form}>
            <label>
              Patient record ID
              <input name="patientId" required />
            </label>
            <label>
              Specific record type (blank means whole patient)
              <input name="recordType" />
            </label>
            <label>
              Specific record ID
              <input name="recordId" />
            </label>
            <label>
              Authorized reason
              <textarea name="reason" required />
            </label>
            <button type="submit">Place database-enforced hold</button>
          </form>
        </article>

        <article className={styles.card}>
          <h2>Release a hold</h2>
          <form action={releaseHoldAction} className={styles.form}>
            <label>
              Hold ID
              <input name="holdId" required />
            </label>
            <label>
              Release reason
              <textarea name="releaseReason" required />
            </label>
            <button type="submit">Release hold</button>
          </form>
        </article>

        <article className={styles.card}>
          <h2>Record access/correction request</h2>
          <form action={createRequestAction} className={styles.form}>
            <label>
              Patient record ID
              <input name="patientId" required />
            </label>
            <label>
              Request type
              <select name="requestKind" defaultValue="access">
                <option value="access">Access</option>
                <option value="correction">Correction</option>
              </select>
            </label>
            <label>
              Requester
              <select name="requesterType" defaultValue="patient">
                <option value="patient">Patient</option>
                <option value="substitute_decision_maker">SDM</option>
                <option value="legal_representative">Legal representative</option>
              </select>
            </label>
            <label>
              Requester description (when needed)
              <input name="requesterDescription" />
            </label>
            <label>
              Identity verification method
              <input name="identityVerificationMethod" required />
            </label>
            <label>
              Scope
              <textarea name="scope" required />
            </label>
            <button type="submit">Record request</button>
          </form>
        </article>

        <article className={styles.card}>
          <h2>Decide a request</h2>
          <form action={decideRequestAction} className={styles.form}>
            <label>
              Request ID
              <input name="requestId" required />
            </label>
            <label>
              Status
              <select name="status" defaultValue="approved">
                <option value="approved">Approved</option>
                <option value="partially_approved">Partially approved</option>
                <option value="denied">Denied</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </label>
            <label>
              Decision
              <textarea name="decision" required />
            </label>
            <button type="submit">Record decision</button>
          </form>
        </article>

        <article className={styles.card}>
          <h2>Add correction overlay</h2>
          <p>The source record remains unchanged. A later correction supersedes this row.</p>
          <form action={addCorrectionAction} className={styles.form}>
            <label>
              Correction request ID
              <input name="requestId" required />
            </label>
            <label>
              Target type
              <select name="targetEntityType" defaultValue="assessment">
                <option value="patient">Patient</option>
                <option value="assessment">Assessment</option>
                <option value="claim_draft">Claim draft</option>
                <option value="intake_session">Intake session</option>
              </select>
            </label>
            <label>
              Target record ID
              <input name="targetEntityId" required />
            </label>
            <label>
              Corrected fields (JSON object)
              <textarea name="patch" required defaultValue={'{"field":"corrected value"}'} />
            </label>
            <label>
              Reason
              <textarea name="reason" required />
            </label>
            <label>
              Correction ID this supersedes (optional)
              <input name="supersedesCorrectionId" />
            </label>
            <button type="submit">Create immutable correction</button>
          </form>
        </article>

        <article className={`${styles.card} ${styles.danger}`}>
          <h2>Destruction dry run</h2>
          <p className={styles.warning}>
            This does not delete. It records counts and hashes, checks the
            retention horizon and active holds, and creates a reviewable run.
          </p>
          <form action={prepareDestructionAction} className={styles.form}>
            <label>
              Patient record ID
              <input name="patientId" required />
            </label>
            <button type="submit">Prepare dry run</button>
          </form>
        </article>

        <article className={`${styles.card} ${styles.danger}`}>
          <h2>Execute reviewed destruction</h2>
          <p className={styles.warning}>
            Requires an eligible dry run, no active hold, and a second pharmacy
            administrator. The database writes the destruction audit event
            before removing the governed records.
          </p>
          <form action={executeDestructionAction} className={styles.form}>
            <label>
              Dry-run ID
              <input name="runId" required />
            </label>
            <button type="submit">Execute irreversible destruction</button>
          </form>
        </article>

        <article className={styles.card}>
          <h2>Record restore drill evidence</h2>
          <form action={recordRestoreDrillAction} className={styles.form}>
            <label>
              Backup identifier
              <input name="backupIdentifier" required />
            </label>
            <label>
              Isolated environment
              <input name="isolatedEnvironment" required />
            </label>
            <label>
              Status
              <select name="status" defaultValue="planned">
                <option value="planned">Planned</option>
                <option value="running">Running</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label>
              Started at
              <input name="startedAt" type="datetime-local" required />
            </label>
            <label>
              Completed at
              <input name="completedAt" type="datetime-local" />
            </label>
            <label>
              Evidence location
              <input name="evidenceLocation" />
            </label>
            <button type="submit">Record drill</button>
          </form>
        </article>
      </section>

      <section className={styles.grid} aria-label="Recent governance records">
        <article className={styles.card}>
          <h2>Active holds</h2>
          <ul className={styles.list}>
            {report.activeHolds.length === 0 ? (
              <li>None.</li>
            ) : (
              report.activeHolds.map((hold) => (
                <li key={hold.id}>
                  <span className={styles.code}>{hold.id}</span> · patient{" "}
                  <span className={styles.code}>{hold.patientId}</span> · {hold.reason}
                </li>
              ))
            )}
          </ul>
        </article>

        <article className={styles.card}>
          <h2>Recent export manifests</h2>
          <ul className={styles.list}>
            {report.exports.length === 0 ? (
              <li>None.</li>
            ) : (
              report.exports.map((manifest) => (
                <li key={manifest.id}>
                  <span className={styles.code}>{manifest.id}</span> ·{" "}
                  {manifest.artifacts.length} artifacts ·{" "}
                  {showDate(manifest.generatedAt)}
                </li>
              ))
            )}
          </ul>
        </article>

        <article className={styles.card}>
          <h2>Destruction reviews</h2>
          <ul className={styles.list}>
            {report.destructionRuns.length === 0 ? (
              <li>None.</li>
            ) : (
              report.destructionRuns.map((run) => (
                <li key={run.id}>
                  <span className={styles.code}>{run.id}</span> · {run.status} ·{" "}
                  eligible {run.eligibleOn}
                </li>
              ))
            )}
          </ul>
        </article>

        <article className={styles.card}>
          <h2>Restore drills</h2>
          <ul className={styles.list}>
            {report.restoreDrills.length === 0 ? (
              <li>No drill evidence recorded.</li>
            ) : (
              report.restoreDrills.map((drill) => (
                <li key={drill.id}>
                  {drill.backupIdentifier} · {drill.status} ·{" "}
                  {showDate(drill.startedAt)}
                </li>
              ))
            )}
          </ul>
        </article>
      </section>
    </main>
  );
}
