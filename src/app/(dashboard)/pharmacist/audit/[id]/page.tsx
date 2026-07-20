import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePortalPage } from "@/lib/auth-guard";
import { queryAuditRecordById } from "../query";
import RecordDetail from "../RecordDetail";
import styles from "../record.module.css";

export const dynamic = "force-dynamic";

/**
 * Full-page record view — rendered on a DIRECT visit to
 * /pharmacist/audit/[id] (refresh, deep link, print). A soft navigation from a
 * table row is intercepted into a modal instead (see @modal/(.)[id]).
 *
 * Server-rendered: patient identity never enters client props. The query is
 * scoped to the actor's pharmacy, so another store's id 404s.
 */
export default async function AuditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePortalPage();
  const { id } = await params;
  const record = await queryAuditRecordById(actor, id);
  if (!record) notFound();

  return (
    <div className={styles.pageWrap}>
      <Link href="/pharmacist/audit" className={styles.btn} style={{ display: "inline-block", marginBottom: "1rem" }}>
        ← Back to audit log
      </Link>
      <div className={styles.modalPanel}>
        <RecordDetail record={record} />
      </div>
    </div>
  );
}
