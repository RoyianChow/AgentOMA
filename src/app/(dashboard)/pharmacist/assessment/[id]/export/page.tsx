import { db } from "@/lib/db";
import { assessment, patient, claimDraft, pharmacy } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requirePortalPage } from "@/lib/auth-guard";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./export.module.css";
import PrintButton from "./PrintButton";

export default async function ClaimDraftExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Page guard: redirects signed-out/insufficient sessions rather than throwing.
  // The query is scoped to this actor's pharmacy, so another store's assessment
  // simply does not resolve (notFound below). No patient identity is rendered
  // by any client component — this whole sheet is server-rendered.
  const actor = await requirePortalPage();

  // Fetch assessment, patient, and active claim draft
  const data = await db
    .select({
      assessment,
      patient,
      claimDraft,
      pharmacy,
    })
    .from(assessment)
    .innerJoin(patient, eq(assessment.patientId, patient.id))
    .innerJoin(pharmacy, eq(assessment.pharmacyId, pharmacy.id))
    .leftJoin(
      claimDraft,
      and(
        eq(claimDraft.assessmentId, assessment.id),
        isNull(claimDraft.supersededById)
      )
    )
    .where(
      and(
        eq(assessment.id, id),
        eq(assessment.pharmacyId, actor.pharmacyId)
      )
    )
    .limit(1);

  if (data.length === 0) {
    notFound();
  }

  const record = data[0];
  const draft = record.claimDraft;

  if (!draft) {
    return (
      <div className={styles.exportPage}>
        <div className={styles.actions}>
          <Link href={`/pharmacist`} className={`${styles.btn} ${styles.btnBack}`}>
            ← Back to Dashboard
          </Link>
        </div>
        <div className={styles.unsupported}>
          This assessment does not have a billable claim draft.
        </div>
      </div>
    );
  }

  const isLtcUnsupported =
    draft.feeCents === 0 ||
    (draft.interventionCodes as string[]).includes("LT");

  if (isLtcUnsupported) {
    return (
      <div className={styles.exportPage}>
        <div className={styles.actions}>
          <Link href={`/pharmacist`} className={`${styles.btn} ${styles.btnBack}`}>
            ← Back to Dashboard
          </Link>
        </div>
        <div className={styles.unsupported}>
          <h3>LTC Claim Export Unsupported</h3>
          <p>
            LTC claims (capitation/$0 fee or secondary emergency) are currently parked pending ODB Help Desk clarification.
            Please verify billing manually for this assessment.
          </p>
        </div>
      </div>
    );
  }

  const fee = `$${(draft.feeCents / 100).toFixed(2)}`;
  const serviceDateStr = record.assessment.serviceDate
    ? new Date(record.assessment.serviceDate).toISOString().split("T")[0]
    : "";

  return (
    <div className={styles.exportPage}>
      <div className={styles.actions}>
        <Link href={`/pharmacist`} className={`${styles.btn} ${styles.btnBack}`}>
          ← Back to Dashboard
        </Link>
        <PrintButton />
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Minor Ailment Claim Draft</h1>
        <div style={{ textAlign: "right", color: "#555" }}>
          <div>{record.pharmacy.storeName}</div>
          <div>Assessment Date: {serviceDateStr}</div>
        </div>
      </div>

      <div className={styles.draftNotice}>
        This is a draft for hand-off — it is not submitted to HNS and does not guarantee payment.
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Patient Information</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>Name</span>
            <span className={styles.value}>
              {record.patient.firstName} {record.patient.lastName}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Health Card Number</span>
            <span className={`${styles.value} ${styles.valueMono}`}>
              {record.patient.healthNumber}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Date of Birth</span>
            <span className={styles.value}>
              {record.patient.dob ? new Date(record.patient.dob).toISOString().split("T")[0] : ""}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Gender</span>
            <span className={styles.value}>{record.patient.gender}</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Claim Details</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>PIN</span>
            <span className={`${styles.value} ${styles.valueMono}`}>{draft.pinCode}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Professional Fee</span>
            <span className={styles.value}>{fee}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Prescriber ID Reference</span>
            <span className={`${styles.value} ${styles.valueMono}`}>{draft.prescriberIdReference}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Prescriber ID</span>
            <span className={`${styles.value} ${styles.valueMono}`}>{draft.prescriberId}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Intervention Codes</span>
            <span className={`${styles.value} ${styles.valueMono}`}>
              {(draft.interventionCodes as string[]).join(", ") || "—"}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Carrier ID</span>
            <span className={`${styles.value} ${styles.valueMono}`}>{draft.carrierId ?? "—"}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Quantity</span>
            <span className={styles.value}>{draft.quantity}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>SSC</span>
            <span className={`${styles.value} ${styles.valueMono}`}>{draft.ssc ?? "—"}</span>
          </div>
        </div>
      </div>

      <div className={styles.draftNotice}>
        These values are derived from the ministry reference data — do not hand-enter a
        PIN or fee. Eligibility is advisory only: HNS adjudicates on submission with a
        365-day look-back, so verify the patient&apos;s remaining maximum in the clinical
        viewer. This sheet does not confirm the claim will be paid.
      </div>
    </div>
  );
}
