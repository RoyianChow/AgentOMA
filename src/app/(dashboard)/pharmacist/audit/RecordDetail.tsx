import {
  MODALITY_LABELS,
  OUTCOME_LABELS,
  type AuditRecordDetail,
} from "./query";
import styles from "./record.module.css";

/**
 * SERVER component — this is where the PHI is rendered. It is passed as
 * `children` into the client modal shell, so patient identity is server-
 * rendered HTML and never becomes readable client-side props. The full-page
 * route renders the same component directly.
 *
 * The PIN comes from the persisted claim draft (record.claim.pinCode) — never
 * derived or hardcoded here.
 */

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={`${styles.fieldValue} ${mono ? styles.mono : ""}`}>{value}</span>
    </div>
  );
}

function ailmentLabel(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function RecordDetail({ record }: { record: AuditRecordDetail }) {
  const claim = record.claim;

  return (
    <div className={styles.record}>
      <div className={styles.header}>
        <div>
          {/* id is referenced by RecordModal's aria-labelledby to name the
              dialog. Static id is fine — only one modal is open at a time. */}
          <h2 id="audit-record-title" className={styles.title}>{record.patient.name}</h2>
          <p className={styles.subtitle}>
            {ailmentLabel(record.ailmentGroupCode)} · service {record.serviceDate}
          </p>
        </div>
      </div>

      {/* PIN — the number that goes into Kroll. Loudest element on the record. */}
      {claim ? (
        <div className={styles.pinCard}>
          <div>
            <div className={styles.pinLabel}>PIN — enter in Kroll</div>
            <div className={styles.pinValue}>{claim.pinCode}</div>
          </div>
          <div className={styles.pinMeta}>
            <div className={styles.pinMetaFee}>${(claim.feeCents / 100).toFixed(2)}</div>
            <div>{MODALITY_LABELS[record.modality] ?? record.modality}</div>
            <div>{OUTCOME_LABELS[record.outcome] ?? record.outcome}</div>
          </div>
        </div>
      ) : (
        <div className={styles.noClaim}>
          No claim was drafted for this assessment (not billable) — there is no PIN to
          submit. The assessment is still on the permanent record below.
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Patient (from health card)</div>
        <div className={styles.grid}>
          <Field label="Name" value={record.patient.name} />
          <Field label="Health card number" value={record.patient.healthNumber} mono />
          <Field label="Date of birth" value={record.patient.dob} mono />
          <Field label="Gender" value={record.patient.gender} />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Assessment</div>
        <div className={styles.grid}>
          <Field label="Ailment group" value={ailmentLabel(record.ailmentGroupCode)} />
          <Field label="Modality" value={MODALITY_LABELS[record.modality] ?? record.modality} />
          <Field label="Outcome" value={OUTCOME_LABELS[record.outcome] ?? record.outcome} />
          <Field label="Service date" value={record.serviceDate} mono />
          <Field label="Recorded" value={new Date(record.createdAt).toLocaleString("en-CA")} />
          {record.virtualLocation && (
            <Field label="Pharmacist location" value={record.virtualLocation} />
          )}
        </div>
      </div>

      {claim && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Claim draft (for Kroll entry)</div>
          <div className={styles.grid}>
            <Field label="PIN" value={claim.pinCode} mono />
            <Field label="Professional fee" value={`$${(claim.feeCents / 100).toFixed(2)}`} />
            <Field label="Prescriber ID reference" value={claim.prescriberIdReference} mono />
            <Field label="Prescriber ID" value={claim.prescriberId} mono />
            <Field
              label="Intervention codes"
              value={claim.interventionCodes.length ? claim.interventionCodes.join(", ") : "—"}
              mono
            />
            <Field label="Carrier ID" value={claim.carrierId ?? "—"} mono />
            <Field label="Quantity" value={String(claim.quantity)} />
            <Field label="SSC" value={claim.ssc === null ? "—" : String(claim.ssc)} mono />
          </div>
        </div>
      )}

      <div className={styles.actions}>
        {/* Server-generated PDF — the browser receives a finished file; no PHI
            crosses into client JS to build it. */}
        <a className={`${styles.btn} ${styles.btnPrimary}`} href={`/pharmacist/audit/${record.id}/pdf`}>
          ⬇ Download PDF
        </a>
      </div>

      <p className={styles.footnote}>
        Draft for hand-entry into the dispensing software — nothing here is submitted to HNS,
        and eligibility is advisory (HNS adjudicates on submission). Retained per OCP for 10
        years (or to age 28, whichever is longer).
      </p>
    </div>
  );
}
