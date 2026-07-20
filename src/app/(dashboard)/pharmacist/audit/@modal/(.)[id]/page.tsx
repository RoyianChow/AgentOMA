import { notFound } from "next/navigation";

import { requirePortalPage } from "@/lib/auth-guard";
import { queryAuditRecordById } from "../../query";
import RecordDetail from "../../RecordDetail";
import RecordModal from "../../RecordModal";

export const dynamic = "force-dynamic";

/**
 * Intercepting route: on a soft navigation from a table row this renders the
 * record inside the modal overlay (the `@modal` slot) on top of the audit
 * table. `(.)[id]` intercepts the sibling `[id]` route.
 *
 * The record is fetched and rendered on the SERVER (RecordDetail); it is passed
 * as children into the client RecordModal shell, so patient identity stays out
 * of client-side props entirely.
 */
export default async function AuditRecordModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePortalPage();
  const { id } = await params;
  const record = await queryAuditRecordById(actor, id);
  if (!record) notFound();

  return (
    <RecordModal>
      <RecordDetail record={record} />
    </RecordModal>
  );
}
