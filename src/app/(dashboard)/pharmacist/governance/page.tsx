import Link from "next/link";

import { requirePortalPage } from "@/lib/auth-guard";
import { getGovernanceReport } from "@/lib/governance";

import SignOutButton from "../SignOutButton";
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
    timeZone: "America/Toronto",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function showState(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
      <a className={styles.skipLink} href="#governance-content">
        Skip to governance workflows
      </a>

      <header className={styles.header}>
        <div className={styles.portalBar}>
          <Link href="/pharmacist" className={styles.backLink}>
            <span aria-hidden="true">←</span> Pharmacist dashboard
          </Link>
          <div className={styles.sessionActions}>
            <span className={styles.roleBadge}>Pharmacy administrator</span>
            <SignOutButton />
          </div>
        </div>

        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>Compliance workspace</p>
          <h1>Record governance</h1>
          <p className={styles.intro}>
            Review record health, respond to patient access and correction
            requests, manage holds, and carry out controlled governance tasks.
            Record sets remain server-rendered and are not sent to a client
            component.
          </p>
        </div>

        <div
          className={styles.statusBanner}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className={styles.statusDot} aria-hidden="true" />
          <span>
            Current governance report loaded. Times below are shown in Ontario
            Eastern Time.
          </span>
        </div>
      </header>

      <nav className={styles.workflowNav} aria-label="Governance page sections">
        <ul>
          <li>
            <a href="#overview">Overview</a>
          </li>
          <li>
            <a href="#access-corrections">Access &amp; corrections</a>
          </li>
          <li>
            <a href="#holds">Holds</a>
          </li>
          <li>
            <a href="#exports">Exports</a>
          </li>
          <li>
            <a href="#destruction">Destruction</a>
          </li>
          <li>
            <a href="#restore">Restore evidence</a>
          </li>
          <li>
            <a href="#audit-failures">Audit failures</a>
          </li>
        </ul>
      </nav>

      <div id="governance-content" className={styles.content} tabIndex={-1}>
        <section id="overview" className={styles.section} aria-labelledby="overview-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>Monitor</p>
              <h2 id="overview-title">Governance overview</h2>
            </div>
            <p>Current record, retention, and request indicators.</p>
          </div>

          <div className={styles.metricGrid}>
            <article className={styles.metricCard}>
              <h3>Record completeness</h3>
              <p className={styles.metricValue}>{completeness.total}</p>
              <p className={styles.metricLabel}>Total assessments</p>
              <dl className={styles.factList}>
                <div>
                  <dt>Version 2 complete</dt>
                  <dd>{completeness.version_2_complete}</dd>
                </div>
                <div>
                  <dt>Legacy version 1</dt>
                  <dd>{completeness.legacy_version_1}</dd>
                </div>
                <div>
                  <dt>Active claim draft</dt>
                  <dd>{completeness.with_active_claim_draft}</dd>
                </div>
              </dl>
            </article>

            <article className={styles.metricCard}>
              <h3>Retention and holds</h3>
              <p className={styles.metricValue}>{retention.patients_with_policy}</p>
              <p className={styles.metricLabel}>Patients with a retention policy</p>
              <dl className={styles.factList}>
                <div>
                  <dt>Eligible for reviewed destruction today</dt>
                  <dd>{retention.eligible_now}</dd>
                </div>
                <div>
                  <dt>Active holds</dt>
                  <dd>{retention.active_holds}</dd>
                </div>
                <div>
                  <dt>Earliest horizon</dt>
                  <dd>{retention.next_eligible_on ?? "—"}</dd>
                </div>
              </dl>
            </article>

            <article className={styles.metricCard}>
              <h3>Access and correction requests</h3>
              <p className={styles.metricValue}>
                {report.requestStatuses.reduce((total, row) => total + row.count, 0)}
              </p>
              <p className={styles.metricLabel}>Requests recorded</p>
              <ul className={styles.compactList}>
                {report.requestStatuses.length === 0 ? (
                  <li>No requests recorded.</li>
                ) : (
                  report.requestStatuses.map((row) => (
                    <li key={row.status}>
                      <span>{showState(row.status)}</span>
                      <strong>{row.count}</strong>
                    </li>
                  ))
                )}
              </ul>
            </article>

            <article className={styles.metricCard}>
              <h3>Audit write failures</h3>
              <p
                className={`${styles.metricValue} ${
                  report.failures.length > 0 ? styles.metricAttention : ""
                }`}
              >
                {report.failures.length}
              </p>
              <p className={styles.metricLabel}>Recent records, maximum 20</p>
              <a className={styles.inlineLink} href="#audit-failures">
                Review failure records
              </a>
            </article>
          </div>
        </section>

        <section
          id="access-corrections"
          className={styles.section}
          aria-labelledby="access-corrections-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>Patient rights</p>
              <h2 id="access-corrections-title">Access and corrections</h2>
            </div>
            <p>
              Record the request first, then document its decision or add an
              immutable correction overlay.
            </p>
          </div>

          <div className={styles.workflowGrid}>
            <article className={styles.actionCard}>
              <div className={styles.cardHeading}>
                <span className={styles.stepBadge}>Step 1</span>
                <h3 id="create-request-title">Record a patient request</h3>
              </div>
              <p id="create-request-help" className={styles.cardIntro}>
                Capture the verified requester, requested scope, and identity
                verification method before a decision is made.
              </p>
              <form
                action={createRequestAction}
                className={styles.form}
                autoComplete="off"
                aria-labelledby="create-request-title"
                aria-describedby="create-request-help create-request-required"
              >
                <p id="create-request-required" className={styles.requiredNote}>
                  Fields marked <span aria-hidden="true">*</span> are required.
                </p>
                <div className={styles.field}>
                  <label htmlFor="request-patient-id">
                    Patient record ID <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="request-patient-id"
                    name="patientId"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="request-patient-id-hint"
                  />
                  <span id="request-patient-id-hint" className={styles.fieldHint}>
                    Enter the complete UUID from the authenticated patient record.
                  </span>
                </div>
                <div className={styles.field}>
                  <label htmlFor="request-kind">
                    Request type <span aria-hidden="true">*</span>
                  </label>
                  <select id="request-kind" name="requestKind" defaultValue="access" required>
                    <option value="access">Access</option>
                    <option value="correction">Correction</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="requester-type">
                    Requester <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="requester-type"
                    name="requesterType"
                    defaultValue="patient"
                    required
                  >
                    <option value="patient">Patient</option>
                    <option value="substitute_decision_maker">
                      Substitute decision-maker
                    </option>
                    <option value="legal_representative">Legal representative</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="requester-description">Requester description</label>
                  <input
                    id="requester-description"
                    name="requesterDescription"
                    autoComplete="off"
                    aria-describedby="requester-description-hint"
                  />
                  <span id="requester-description-hint" className={styles.fieldHint}>
                    Add only when needed to clarify a representative relationship.
                  </span>
                </div>
                <div className={styles.field}>
                  <label htmlFor="identity-verification-method">
                    Identity verification method <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="identity-verification-method"
                    name="identityVerificationMethod"
                    required
                    autoComplete="off"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="request-scope">
                    Requested scope <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="request-scope"
                    name="scope"
                    required
                    autoComplete="off"
                  />
                </div>
                <button type="submit">Record request</button>
              </form>
            </article>

            <article className={styles.actionCard}>
              <div className={styles.cardHeading}>
                <span className={styles.stepBadge}>Step 2</span>
                <h3 id="decide-request-title">Record a request decision</h3>
              </div>
              <p id="decide-request-help" className={styles.cardIntro}>
                Use the existing request ID and record the reviewed disposition.
              </p>
              <form
                action={decideRequestAction}
                className={styles.form}
                autoComplete="off"
                aria-labelledby="decide-request-title"
                aria-describedby="decide-request-help"
              >
                <div className={styles.field}>
                  <label htmlFor="decision-request-id">
                    Request ID <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="decision-request-id"
                    name="requestId"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="request-status">
                    Status <span aria-hidden="true">*</span>
                  </label>
                  <select id="request-status" name="status" defaultValue="approved" required>
                    <option value="approved">Approved</option>
                    <option value="partially_approved">Partially approved</option>
                    <option value="denied">Denied</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="request-decision">
                    Decision <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="request-decision"
                    name="decision"
                    required
                    autoComplete="off"
                  />
                </div>
                <button type="submit">Record decision</button>
              </form>
            </article>

            <article className={`${styles.actionCard} ${styles.wideCard}`}>
              <div className={styles.cardHeading}>
                <span className={styles.stepBadge}>When approved</span>
                <h3 id="correction-title">Add an immutable correction overlay</h3>
              </div>
              <p id="correction-help" className={styles.cardIntro}>
                The source record remains unchanged. A later correction may
                supersede this row; it does not rewrite history.
              </p>
              <form
                action={addCorrectionAction}
                className={`${styles.form} ${styles.twoColumnForm}`}
                autoComplete="off"
                aria-labelledby="correction-title"
                aria-describedby="correction-help correction-json-hint"
              >
                <div className={styles.field}>
                  <label htmlFor="correction-request-id">
                    Correction request ID <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="correction-request-id"
                    name="requestId"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="correction-target-type">
                    Target type <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="correction-target-type"
                    name="targetEntityType"
                    defaultValue="assessment"
                    required
                  >
                    <option value="patient">Patient</option>
                    <option value="assessment">Assessment</option>
                    <option value="claim_draft">Claim draft</option>
                    <option value="intake_session">Intake session</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="correction-target-id">
                    Target record ID <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="correction-target-id"
                    name="targetEntityId"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="superseded-correction-id">
                    Superseded correction ID
                  </label>
                  <input
                    id="superseded-correction-id"
                    name="supersedesCorrectionId"
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="superseded-correction-hint"
                  />
                  <span id="superseded-correction-hint" className={styles.fieldHint}>
                    Leave blank when this correction does not replace an earlier one.
                  </span>
                </div>
                <div className={`${styles.field} ${styles.fullField}`}>
                  <label htmlFor="correction-patch">
                    Corrected fields (JSON object) <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="correction-patch"
                    name="patch"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    defaultValue={'{"field":"corrected value"}'}
                    aria-describedby="correction-json-hint"
                  />
                  <span id="correction-json-hint" className={styles.fieldHint}>
                    Advanced structured entry: provide one valid JSON object only.
                  </span>
                </div>
                <div className={`${styles.field} ${styles.fullField}`}>
                  <label htmlFor="correction-reason">
                    Reason <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="correction-reason"
                    name="reason"
                    required
                    autoComplete="off"
                  />
                </div>
                <button type="submit" className={styles.fullField}>
                  Create immutable correction
                </button>
              </form>
            </article>
          </div>
        </section>

        <section id="holds" className={styles.section} aria-labelledby="holds-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>Protect records</p>
              <h2 id="holds-title">Hold management</h2>
            </div>
            <p>Active holds prevent governed destruction until formally released.</p>
          </div>

          <div className={styles.workflowGrid}>
            <article className={styles.recordCard}>
              <div className={styles.cardHeading}>
                <span className={styles.countBadge}>{report.activeHolds.length}</span>
                <h3>Active holds</h3>
              </div>
              <ul className={styles.recordList}>
                {report.activeHolds.length === 0 ? (
                  <li className={styles.emptyState}>No active holds.</li>
                ) : (
                  report.activeHolds.map((hold) => (
                    <li key={hold.id} className={styles.recordItem}>
                      <div className={styles.recordHeader}>
                        <span className={styles.stateBadge}>Active</span>
                        <span className={styles.code}>{hold.id}</span>
                      </div>
                      <dl className={styles.recordFacts}>
                        <div>
                          <dt>Patient record</dt>
                          <dd className={styles.code}>{hold.patientId}</dd>
                        </div>
                        <div>
                          <dt>Reason</dt>
                          <dd>{hold.reason}</dd>
                        </div>
                      </dl>
                    </li>
                  ))
                )}
              </ul>
            </article>

            <div className={styles.stackedCards}>
              <article className={styles.actionCard}>
                <h3 id="place-hold-title">Place a hold</h3>
                <p id="place-hold-help" className={styles.cardIntro}>
                  Leave both record fields blank to protect the whole patient record.
                </p>
                <form
                  action={placeHoldAction}
                  className={styles.form}
                  autoComplete="off"
                  aria-labelledby="place-hold-title"
                  aria-describedby="place-hold-help"
                >
                  <div className={styles.field}>
                    <label htmlFor="hold-patient-id">
                      Patient record ID <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="hold-patient-id"
                      name="patientId"
                      required
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="hold-record-type">Specific record type</label>
                    <input id="hold-record-type" name="recordType" autoComplete="off" />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="hold-record-id">Specific record ID</label>
                    <input
                      id="hold-record-id"
                      name="recordId"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="hold-reason">
                      Authorized reason <span aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="hold-reason"
                      name="reason"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <button type="submit">Place database-enforced hold</button>
                </form>
              </article>

              <article className={styles.actionCard}>
                <h3 id="release-hold-title">Release a hold</h3>
                <p id="release-hold-help" className={styles.cardIntro}>
                  Confirm the active hold ID above and document why protection ends.
                </p>
                <form
                  action={releaseHoldAction}
                  className={styles.form}
                  autoComplete="off"
                  aria-labelledby="release-hold-title"
                  aria-describedby="release-hold-help"
                >
                  <div className={styles.field}>
                    <label htmlFor="release-hold-id">
                      Hold ID <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="release-hold-id"
                      name="holdId"
                      required
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="release-reason">
                      Release reason <span aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="release-reason"
                      name="releaseReason"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <button type="submit">Release hold</button>
                </form>
              </article>
            </div>
          </div>
        </section>

        <section id="exports" className={styles.section} aria-labelledby="exports-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>Patient access</p>
              <h2 id="exports-title">Complete exports</h2>
            </div>
            <p>Generate a reviewed patient bundle and track its stored manifest.</p>
          </div>

          <div className={styles.workflowGrid}>
            <article className={styles.actionCard}>
              <h3 id="export-title">Download a secure export</h3>
              <p id="export-help" className={styles.cardIntro}>
                Generates a server-assembled JSON record with a stored manifest
                and SHA-256 hash for every artifact.
              </p>
              <form
                action={startExportAction}
                className={styles.form}
                autoComplete="off"
                aria-labelledby="export-title"
                aria-describedby="export-help"
              >
                <div className={styles.field}>
                  <label htmlFor="export-patient-id">
                    Patient record ID <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="export-patient-id"
                    name="patientId"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <button type="submit">Download secure export</button>
              </form>
            </article>

            <article className={styles.recordCard}>
              <div className={styles.cardHeading}>
                <span className={styles.countBadge}>{report.exports.length}</span>
                <h3>Recent export manifests</h3>
              </div>
              <ul className={styles.recordList}>
                {report.exports.length === 0 ? (
                  <li className={styles.emptyState}>No export manifests recorded.</li>
                ) : (
                  report.exports.map((manifest) => (
                    <li key={manifest.id} className={styles.recordItem}>
                      <div className={styles.recordHeader}>
                        <span className={styles.code}>{manifest.id}</span>
                        <span className={styles.stateBadge}>
                          {manifest.artifacts.length} artifacts
                        </span>
                      </div>
                      <p className={styles.recordMeta}>
                        Generated {showDate(manifest.generatedAt)}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </article>
          </div>
        </section>

        <section
          id="destruction"
          className={`${styles.section} ${styles.dangerZone}`}
          aria-labelledby="destruction-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.dangerKicker}>Protected operations</p>
              <h2 id="destruction-title">Reviewed destruction</h2>
            </div>
            <p>
              Preparation is review-only. Execution is irreversible and remains
              subject to all existing server and database controls.
            </p>
          </div>

          <div className={styles.workflowGrid}>
            <article className={`${styles.actionCard} ${styles.reviewCard}`}>
              <div className={styles.cardHeading}>
                <span className={styles.reviewBadge}>Review only</span>
                <h3 id="dry-run-title">Prepare a destruction dry run</h3>
              </div>
              <p id="dry-run-help" className={styles.warning}>
                This does not delete records. It records counts and hashes,
                checks the retention horizon and active holds, and creates a
                reviewable run.
              </p>
              <form
                action={prepareDestructionAction}
                className={styles.form}
                autoComplete="off"
                aria-labelledby="dry-run-title"
                aria-describedby="dry-run-help"
              >
                <div className={styles.field}>
                  <label htmlFor="destruction-patient-id">
                    Patient record ID <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="destruction-patient-id"
                    name="patientId"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <button type="submit" className={styles.reviewButton}>
                  Prepare dry run
                </button>
              </form>
            </article>

            <article className={`${styles.actionCard} ${styles.irreversibleCard}`}>
              <div className={styles.cardHeading}>
                <span className={styles.irreversibleBadge}>Irreversible</span>
                <h3 id="execute-destruction-title">Execute reviewed destruction</h3>
              </div>
              <p id="execute-destruction-help" className={styles.dangerWarning}>
                Requires an eligible dry run, no active hold, and a second
                pharmacy administrator. The database writes the destruction
                audit event before removing governed records.
              </p>
              <form
                action={executeDestructionAction}
                className={styles.form}
                autoComplete="off"
                aria-labelledby="execute-destruction-title"
                aria-describedby="execute-destruction-help destruction-confirmation-hint"
              >
                <div className={styles.field}>
                  <label htmlFor="destruction-run-id">
                    Reviewed dry-run ID <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="destruction-run-id"
                    name="runId"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <label className={styles.confirmation}>
                  <input type="checkbox" required />
                  <span>
                    I have reviewed this dry run and understand that execution
                    permanently removes the governed records.
                  </span>
                </label>
                <span id="destruction-confirmation-hint" className={styles.fieldHint}>
                  This acknowledgement supports human review; server and database
                  authorization remain authoritative.
                </span>
                <button type="submit" className={styles.dangerButton}>
                  Execute irreversible destruction
                </button>
              </form>
            </article>

            <article className={`${styles.recordCard} ${styles.wideCard}`}>
              <div className={styles.cardHeading}>
                <span className={styles.countBadge}>{report.destructionRuns.length}</span>
                <h3>Destruction reviews</h3>
              </div>
              <ul className={`${styles.recordList} ${styles.multiColumnList}`}>
                {report.destructionRuns.length === 0 ? (
                  <li className={styles.emptyState}>No destruction reviews recorded.</li>
                ) : (
                  report.destructionRuns.map((run) => (
                    <li key={run.id} className={styles.recordItem}>
                      <div className={styles.recordHeader}>
                        <span className={styles.code}>{run.id}</span>
                        <span className={styles.stateBadge}>{showState(run.status)}</span>
                      </div>
                      <p className={styles.recordMeta}>Eligible {run.eligibleOn}</p>
                    </li>
                  ))
                )}
              </ul>
            </article>
          </div>
        </section>

        <section id="restore" className={styles.section} aria-labelledby="restore-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>Recovery assurance</p>
              <h2 id="restore-title">Restore drill evidence</h2>
            </div>
            <p>Record the status and evidence location for an isolated restore exercise.</p>
          </div>

          <div className={styles.workflowGrid}>
            <article className={styles.actionCard}>
              <h3 id="restore-form-title">Record drill evidence</h3>
              <p id="restore-form-help" className={styles.cardIntro}>
                Date and time fields follow the existing server-action behavior.
                Review operational timestamps in Ontario Eastern Time.
              </p>
              <form
                action={recordRestoreDrillAction}
                className={styles.form}
                autoComplete="off"
                aria-labelledby="restore-form-title"
                aria-describedby="restore-form-help"
              >
                <div className={styles.field}>
                  <label htmlFor="backup-identifier">
                    Backup identifier <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="backup-identifier"
                    name="backupIdentifier"
                    required
                    autoComplete="off"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="isolated-environment">
                    Isolated environment <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="isolated-environment"
                    name="isolatedEnvironment"
                    required
                    autoComplete="off"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="restore-status">
                    Status <span aria-hidden="true">*</span>
                  </label>
                  <select id="restore-status" name="status" defaultValue="planned" required>
                    <option value="planned">Planned</option>
                    <option value="running">Running</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="restore-started-at">
                    Started at <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="restore-started-at"
                    name="startedAt"
                    type="datetime-local"
                    required
                    autoComplete="off"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="restore-completed-at">Completed at</label>
                  <input
                    id="restore-completed-at"
                    name="completedAt"
                    type="datetime-local"
                    autoComplete="off"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="restore-evidence-location">Evidence location</label>
                  <input
                    id="restore-evidence-location"
                    name="evidenceLocation"
                    autoComplete="off"
                  />
                </div>
                <button type="submit">Record drill</button>
              </form>
            </article>

            <article className={styles.recordCard}>
              <div className={styles.cardHeading}>
                <span className={styles.countBadge}>{report.restoreDrills.length}</span>
                <h3>Recent restore drills</h3>
              </div>
              <ul className={styles.recordList}>
                {report.restoreDrills.length === 0 ? (
                  <li className={styles.emptyState}>No drill evidence recorded.</li>
                ) : (
                  report.restoreDrills.map((drill) => (
                    <li key={drill.id} className={styles.recordItem}>
                      <div className={styles.recordHeader}>
                        <strong>{drill.backupIdentifier}</strong>
                        <span className={styles.stateBadge}>{showState(drill.status)}</span>
                      </div>
                      <p className={styles.recordMeta}>
                        Started {showDate(drill.startedAt)}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </article>
          </div>
        </section>

        <section
          id="audit-failures"
          className={styles.section}
          aria-labelledby="audit-failures-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>Operational attention</p>
              <h2 id="audit-failures-title">Recent audit write failures</h2>
            </div>
            <p>Unfiltered recent safe failure records, maximum 20.</p>
          </div>

          <div className={styles.failurePanel}>
            <p
              className={styles.failureSummary}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {report.failures.length === 0
                ? "No recent audit write failures."
                : `${report.failures.length} recent audit write ${
                    report.failures.length === 1 ? "failure requires" : "failures require"
                  } review.`}
            </p>
            {report.failures.length === 0 ? (
              <p className={styles.emptyState}>No failure records to display.</p>
            ) : (
              <ul className={styles.failureList}>
                {report.failures.map((failure) => (
                  <li key={failure.id}>
                    <div>
                      <strong>{showState(failure.attemptedAction)}</strong>
                      <span className={styles.failureCode}>
                        {showState(failure.failureCode)}
                      </span>
                    </div>
                    <time dateTime={new Date(failure.occurredAt).toISOString()}>
                      {showDate(failure.occurredAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
