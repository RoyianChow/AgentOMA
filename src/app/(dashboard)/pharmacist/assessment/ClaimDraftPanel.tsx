"use client";

import type { ClaimDraft, NotBillableReason } from "@/lib/claims/derive-claim-draft";

/**
 * Read-only view of the derived claim draft.
 *
 * Every field here is DERIVED by deriveClaimDraft — the pharmacist types none of
 * them, and nothing on this panel is editable. That is the point: a hand-typed
 * PIN or fee is how improper claims happen.
 *
 * The boundary is stated on the panel itself, not buried in a doc: this is for
 * hand-entry into the dispensing software. Nothing is submitted to HNS.
 */
export type ClaimResult =
  | { billable: true; draft: ClaimDraft }
  | { billable: false; reason: NotBillableReason; message: string };

const MODALITY_LABELS: Record<ClaimDraft["modality"], string> = {
  in_person: "In person",
  virtual_from_pharmacy: "Virtual (from pharmacy)",
  virtual_remote: "Virtual (remote)",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="claim-field">
      <span className="claim-field-label">{label}</span>
      <span className="claim-field-value">{value}</span>
    </div>
  );
}

export default function ClaimDraftPanel({ result }: { result: ClaimResult }) {
  // Not billable is a normal, expected outcome — not an error. Say why, plainly.
  if (!result.billable) {
    return (
      <div className="detail-section-card claim-panel claim-panel-nobill">
        <h3 className="claim-panel-title">No claim for this assessment</h3>
        <p className="claim-panel-reason">{result.message}</p>
        <p className="claim-panel-note">
          The assessment itself has been recorded. No claim draft was created, and nothing was
          submitted to HNS. HNS adjudication remains authoritative for any claim submitted outside
          AgentOMA.
        </p>
      </div>
    );
  }

  const d = result.draft;
  const fee = `$${(d.feeCents / 100).toFixed(2)}`;

  return (
    <div className="detail-section-card claim-panel">
      <h3 className="claim-panel-title">Advisory claim draft handoff</h3>

      <div className="claim-grid">
        <Field label="PIN" value={d.pinCode} />
        <Field label="Professional fee" value={fee} />
        <Field label="Modality" value={MODALITY_LABELS[d.modality]} />
        <Field label="Prescriber ID Reference" value={d.prescriberIdReference} />
        <Field label="Prescriber ID" value={d.prescriberId} />
        <Field label="Intervention codes" value={d.interventionCodes.join(", ")} />
        <Field label="Carrier ID" value={d.carrierId ?? "—"} />
        <Field label="Quantity" value={String(d.quantity)} />
        <Field label="SSC" value={d.ssc === null ? "—" : String(d.ssc)} />
      </div>

      <p className="claim-panel-boundary">
        Advisory draft for hand-entry into your dispensing software. This claim was not submitted
        to HNS. HNS adjudication remains authoritative.
      </p>
      <p className="claim-panel-note">
        These values are derived from the ministry reference data and cannot be edited. If something
        is wrong, correct the assessment — a new draft supersedes this one and both are kept.
      </p>
    </div>
  );
}
