"use client";

import { useState, useTransition } from "react";

import {
  RX_FIELD_CONFIDENCE_THRESHOLD,
  RX_FIELD_LABELS,
  type RxExtraction,
  type RxField,
  type RxFieldKey,
  type RxReviewDecision,
} from "@/lib/rx-intake/contract";

import { extractSyntheticPrescriptionAction } from "./actions";
import styles from "./rx-intake.module.css";

/**
 * The reviewer surface for AI-RX-06.
 *
 * State lives in React memory and nowhere else — no browser storage, no URL
 * parameters, no logging. That is the same rule the assessment workspace
 * follows, and the pharmacist PHI-boundary test enforces it across every client
 * component under /pharmacist. The corpus here is synthetic, but the rule holds
 * regardless: this surface should be indistinguishable in behaviour from one
 * that does handle PHI, so that nothing has to change if it ever earns a
 * charter.
 *
 * The reviewer cannot skip a decision. There is no "save for later" and no
 * default disposition — every draft ends in accept, edit, or reject, and that
 * disposition terminates the flow rather than feeding anything downstream.
 */

type FixtureSummary = { id: string; label: string; intent: string };

type Props = {
  fixtures: FixtureSummary[];
  expiresOn: string | null;
};

const DECISION_LABELS: Record<RxReviewDecision, string> = {
  accepted: "Accepted as read",
  edited: "Accepted with corrections",
  rejected: "Rejected",
};

function confidenceTone(field: RxField): string {
  if (field.value === null) return styles.toneMissing;
  return field.confidence < RX_FIELD_CONFIDENCE_THRESHOLD
    ? styles.toneLow
    : styles.toneOk;
}

function FieldRow({
  field,
  draftValue,
  onChange,
  disabled,
}: {
  field: RxField;
  draftValue: string;
  onChange: (key: RxFieldKey, value: string) => void;
  disabled: boolean;
}) {
  const edited = draftValue !== (field.value ?? "");

  return (
    <div className={styles.fieldRow}>
      <div className={styles.fieldHead}>
        <label htmlFor={`field-${field.key}`}>{RX_FIELD_LABELS[field.key]}</label>
        <span className={`${styles.confidence} ${confidenceTone(field)}`}>
          {field.value === null
            ? "not found"
            : `parse signal ${(field.confidence * 100).toFixed(0)}%`}
        </span>
      </div>

      <input
        id={`field-${field.key}`}
        className={styles.fieldInput}
        value={draftValue}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        placeholder={field.value === null ? "Not found — enter manually" : undefined}
        onChange={(event) => onChange(field.key, event.target.value)}
      />

      <div className={styles.fieldMeta}>
        {field.sourceLine !== null && <span>source line {field.sourceLine}</span>}
        {edited && <span className={styles.editedTag}>edited</span>}
      </div>

      {field.notes.map((note) => (
        <p key={note} className={styles.fieldNote}>
          {note}
        </p>
      ))}
    </div>
  );
}

export default function RxIntakeWorkspace({ fixtures, expiresOn }: Props) {
  const [selectedId, setSelectedId] = useState(fixtures[0]?.id ?? "");
  const [extraction, setExtraction] = useState<RxExtraction | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [decision, setDecision] = useState<RxReviewDecision | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = fixtures.find((fixture) => fixture.id === selectedId);

  function reset() {
    setExtraction(null);
    setDrafts({});
    setDecision(null);
    setRejectReason("");
    setError(null);
  }

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await extractSyntheticPrescriptionAction({
        corpusFixtureId: selectedId,
      });
      if (!result.ok) {
        setExtraction(null);
        setError(result.message);
        return;
      }
      setExtraction(result.extraction);
      setDrafts(
        Object.fromEntries(
          result.extraction.fields.map((field) => [field.key, field.value ?? ""]),
        ),
      );
      setDecision(null);
      setRejectReason("");
    });
  }

  function updateDraft(key: RxFieldKey, value: string) {
    setDrafts((current) => ({ ...current, [key]: value }));
  }

  const hasEdits =
    extraction?.fields.some(
      (field) => (drafts[field.key] ?? "") !== (field.value ?? ""),
    ) ?? false;

  return (
    <div className={styles.workspace}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>1. Choose a synthetic document</h2>
          {expiresOn && <span className={styles.expiry}>experiment expires {expiresOn}</span>}
        </div>

        <div className={styles.pickerRow}>
          <select
            aria-label="Synthetic document"
            className={styles.select}
            value={selectedId}
            disabled={isPending}
            onChange={(event) => {
              setSelectedId(event.target.value);
              reset();
            }}
          >
            {fixtures.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={run}
            disabled={isPending || !selectedId}
          >
            {isPending ? "Extracting…" : "Run extraction"}
          </button>
        </div>

        {selected && <p className={styles.intent}>{selected.intent}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </section>

      {extraction && (
        <>
          <section className={styles.panel}>
            <div className={styles.untrusted}>
              <strong>Untrusted draft — synthetic.</strong> Every value below was read by a
              deterministic parser from an invented document. The percentage is a parse
              signal describing how cleanly a pattern matched, not a measure of clinical
              correctness. Nothing here is saved.
            </div>

            <div className={styles.summary}>
              <div>
                <span className={styles.summaryLabel}>Status</span>
                <span className={styles.summaryValue}>requires human review</span>
              </div>
              <div>
                <span className={styles.summaryLabel}>Type</span>
                <span className={styles.summaryValue}>
                  {extraction.prescriptionType.replace(/_/g, " ")}
                </span>
              </div>
              <div>
                <span className={styles.summaryLabel}>Signature</span>
                <span className={styles.summaryValue}>
                  {extraction.signaturePresent ? "present" : "not found"}
                </span>
              </div>
              <div>
                <span className={styles.summaryLabel}>Mean parse signal</span>
                <span className={styles.summaryValue}>
                  {(extraction.confidence.overallScore * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {extraction.warnings.length > 0 && (
              <ul className={styles.warnings}>
                {extraction.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </section>

          {extraction.integrityIndicators.length > 0 && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Document integrity — points to check</h2>
              </div>
              <p className={styles.integrityIntro}>
                These are observations about the document itself, not conclusions about
                it. Each has an ordinary explanation as well as a concerning one —
                confirm against the original before drawing any inference.
              </p>
              <ul className={styles.integrityList}>
                {extraction.integrityIndicators.map((indicator) => (
                  <li key={`${indicator.id}-${indicator.detail}`}>
                    <span className={styles.integrityDetail}>{indicator.detail}</span>
                    {indicator.sourceLine !== null && (
                      <span className={styles.integrityLine}>
                        line {indicator.sourceLine}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>2. Verify each field against the source</h2>
            </div>
            <div className={styles.fields}>
              {extraction.fields.map((field) => (
                <FieldRow
                  key={field.key}
                  field={field}
                  draftValue={drafts[field.key] ?? ""}
                  onChange={updateDraft}
                  disabled={decision !== null}
                />
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>3. Record your disposition</h2>
            </div>

            {decision === null ? (
              <>
                <p className={styles.dispositionHint}>
                  This draft cannot proceed on its own. Choose one — the decision ends here
                  and is not written anywhere.
                </p>
                <div className={styles.decisionRow}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setDecision(hasEdits ? "edited" : "accepted")}
                  >
                    {hasEdits ? "Accept with my corrections" : "Accept as read"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDecision("rejected")}
                  >
                    Reject this extraction
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.outcome}>
                <p>
                  <strong>{DECISION_LABELS[decision]}.</strong> Recorded in this page only —
                  no record was created and nothing was sent.
                </p>

                {decision === "rejected" && (
                  <div className={styles.rejectBlock}>
                    <label htmlFor="reject-reason">
                      What was wrong with it? (evaluation notes, not saved)
                    </label>
                    <textarea
                      id="reject-reason"
                      className={styles.textarea}
                      rows={3}
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                    />
                  </div>
                )}

                <button type="button" className="btn btn-secondary" onClick={reset}>
                  Clear and start over
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
