"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AILMENT_LABELS,
  ALL_AILMENT_IDS,
  EMERGENCY_SIGNS,
  NODES,
  RED_FLAGS,
  TRIAGE_ROOT,
  computePool,
  type AilmentId,
  type TriageOption,
} from "@/config/triage";
import { createIntakeSession, logTriageExit } from "./actions";
import styles from "./TriageFlow.module.css";

/**
 * Patient triage flow.
 *
 * Holds NO PHI. Everything in this component's state is a symptom answer or a
 * self-report. Nothing here identifies the patient. That is deliberate — see
 * the note in page.tsx. Do not add a name, DOB, or health card field here; if
 * identity is ever needed on this screen, the whole flow has to move behind a
 * server action first.
 *
 * Nothing is persisted. The handoff at the end is a TODO seam.
 *
 * Presentation lives entirely in TriageFlow.module.css. No site classes, no
 * inline style objects — only the dynamic progress-bar width is bound inline.
 */

type Phase =
  | "emergency"
  | "emergency_out"
  | "triage"
  | "redflags"
  | "refer"
  | "not_funded"
  | "unsure"
  | "history"
  | "rx"
  | "consent"
  | "summary";

type PriorCount = 0 | 1 | 2 | 3 | -1;
type ExistingRx = "none" | "refillable" | "other_prescriber" | "unsure";

interface Props {
  claimMaximums: Record<AilmentId, number>;
  /** From the per-pharmacy QR link, validated by the page AND re-validated by
   * the server action. Which pharmacy gets the intake — never who the patient is. */
  pharmacyId: string;
}

export default function TriageFlow({ claimMaximums, pharmacyId }: Props) {
  const [phase, setPhase] = useState<Phase>("emergency");
  const [emergencyChecks, setEmergencyChecks] = useState<string[]>([]);
  const [nodeId, setNodeId] = useState<string>(TRIAGE_ROOT);
  const [stack, setStack] = useState<{ phase: Phase; nodeId: string }[]>([]);
  const [trail, setTrail] = useState<string[]>([]);
  const [ailment, setAilment] = useState<AilmentId | null>(null);
  const [flagsHit, setFlagsHit] = useState<string[]>([]);
  const [notFundedReason, setNotFundedReason] = useState("");
  const [priorCount, setPriorCount] = useState<PriorCount | null>(null);
  const [existingRx, setExistingRx] = useState<ExistingRx | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [poolOpen, setPoolOpen] = useState(false);
  const [intakeCode, setIntakeCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inPlay = useMemo<Set<AilmentId>>(() => {
    if (ailment) return new Set([ailment]);
    if (phase !== "triage") return new Set(ALL_AILMENT_IDS);
    return computePool(nodeId);
  }, [nodeId, ailment, phase]);

  const max = ailment ? claimMaximums[ailment] : 0;
  const label = ailment ? AILMENT_LABELS[ailment] : "";
  const ruledOut = ALL_AILMENT_IDS.length - inPlay.size;
  const pct = Math.round((ruledOut / (ALL_AILMENT_IDS.length - 1)) * 100);

  function push() {
    setStack((s) => [...s, { phase, nodeId }]);
  }

  function choose(opt: TriageOption) {
    push();
    setTrail((t) => [...t, opt.label]);

    if (opt.ailment) {
      setAilment(opt.ailment);
      setPhase("redflags");
    } else if (opt.next) {
      setNodeId(opt.next);
      setPhase("triage");
    } else if (opt.outcome === "not_funded") {
      setNotFundedReason(opt.reason ?? "");
      setPhase("not_funded");
    } else if (opt.outcome === "unsure") {
      setPhase("unsure");
    }
  }

  function back() {
    const prev = stack[stack.length - 1];
    if (!prev) return;
    setStack((s) => s.slice(0, -1));
    setTrail((t) => t.slice(0, -1));
    setPhase(prev.phase);
    setNodeId(prev.nodeId);
    setAilment(null);
    setFlagsHit([]);
  }

  function restart() {
    setPhase("emergency");
    setEmergencyChecks([]);
    setNodeId(TRIAGE_ROOT);
    setStack([]);
    setTrail([]);
    setAilment(null);
    setFlagsHit([]);
    setPriorCount(null);
    setExistingRx(null);
    setConsentGiven(false);
    setIntakeCode(null);
  }

  // The summary screen keys off intakeCode alone: it only renders after this
  // has completed (Finish awaits it), so a null code there MEANS the handoff
  // failed and the error panel shows.
  async function handoff() {
    setIsSubmitting(true);
    try {
      // pharmacyId came from the QR link; the action re-validates it against
      // the pharmacy table before writing anything.
      const res = await createIntakeSession({
        pharmacyId,
        ailmentGroupCode: ailment || "",
        trail: stack.map((s, i) => {
          const node = NODES[s.nodeId];
          return { question: node ? node.title : "Question", answer: trail[i] };
        }),
        priorCountSelfReport: priorCount === -1 ? null : priorCount,
        existingRxSelfReport: existingRx === "unsure" ? null : existingRx,
      });
      // Success ONLY with a real code in hand — a missing code is a failure,
      // and the summary screen must never pretend otherwise.
      if (res.success && res.code) {
        setIntakeCode(res.code);
      } else {
        if (!res.success) console.error(res.error);
        setIntakeCode(null);
      }
    } catch (err) {
      console.error("Handoff failed:", err);
      setIntakeCode(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRedFlagReferral() {
    if (ailment) {
      await logTriageExit({
        ailmentGroupCode: ailment,
        reason: "Red flags selected: " + flagsHit.join(", "),
      });
    }
    setPhase("refer");
  }

  const advisory =
    (priorCount !== null && priorCount >= 0 && priorCount >= max) ||
    existingRx === "refillable" ||
    existingRx === "other_prescriber";

  return (
    <div className={styles.root}>
      <div className={styles.phone}>
        {/* ── The narrowing pool. Shown only while narrowing. ───────────────── */}
        {phase === "triage" && (
          <div className={styles.pool}>
            <div className={styles.poolHead}>
              <button
                type="button"
                className={styles.poolBtn}
                onClick={() => setPoolOpen((o) => !o)}
              >
                <span className={styles.poolCount}>{inPlay.size}</span>
                <span className={styles.poolLabel}>
                  {inPlay.size === 1 ? "condition still fits" : "conditions still fit"}
                </span>
              </button>
              <span className={styles.poolToggle}>{poolOpen ? "Hide" : "Show"}</span>
            </div>
            <div className={styles.track}>
              <div className={styles.trackFill} style={{ width: `${Math.max(0, pct)}%` }} />
            </div>

            {poolOpen && (
              <div className={styles.chips}>
                {ALL_AILMENT_IDS.map((id) => {
                  const on = inPlay.has(id);
                  return (
                    <span
                      key={id}
                      className={on ? styles.chip : `${styles.chip} ${styles.chipOff}`}
                    >
                      {AILMENT_LABELS[id]}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Emergency gate. Always first. ──────────────────────────────── */}
        {phase === "emergency" && (
          <div className={styles.screen}>
            <h1 className={styles.question}>First — any of these right now?</h1>
            <p className={styles.sub}>
              If any of these are happening, this isn&apos;t the right place. Tick anything that
              applies.
            </p>
            <div className={styles.stack}>
              {EMERGENCY_SIGNS.map((s) => {
                const on = emergencyChecks.includes(s);
                return (
                  <label
                    key={s}
                    className={on ? `${styles.check} ${styles.checkOn}` : styles.check}
                  >
                    <input
                      type="checkbox"
                      className={`${styles.box} ${styles.boxAlarm}`}
                      checked={on}
                      onChange={() =>
                        setEmergencyChecks((c) =>
                          on ? c.filter((x) => x !== s) : [...c, s]
                        )
                      }
                    />
                    <span>{s}</span>
                  </label>
                );
              })}
            </div>
            <div className={styles.actions}>
              <Link href="/" className={styles.back}>
                Cancel
              </Link>
              {emergencyChecks.length > 0 ? (
                <button
                  type="button"
                  className={`${styles.cta} ${styles.ctaAlarm}`}
                  onClick={() => setPhase("emergency_out")}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.cta}
                  onClick={() => setPhase("triage")}
                >
                  None of these — continue
                </button>
              )}
            </div>
          </div>
        )}

        {phase === "emergency_out" && (
          <div className={styles.screen}>
            <span className={`${styles.eyebrow} ${styles.eyebrowStop}`}>Stop</span>
            <h1 className={styles.question}>Call 911, or go to an emergency department.</h1>
            <p className={styles.sub}>
              What you&apos;ve described needs urgent medical care, not a pharmacy assessment.
              Please don&apos;t wait. If you&apos;re in the pharmacy now, tell a staff member
              straight away.
            </p>
            <div className={styles.noteStop}>
              <span className={styles.noteHead}>You ticked</span>
              {emergencyChecks.map((s) => (
                <div key={s} className={styles.noteItem}>
                  · {s}
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.back} onClick={restart}>
                Start over
              </button>
            </div>
          </div>
        )}

        {/* ── Narrowing ──────────────────────────────────────────────────── */}
        {phase === "triage" && NODES[nodeId] && (
          <div className={styles.screen} key={nodeId}>
            <h1 className={styles.question}>{NODES[nodeId].title}</h1>
            {NODES[nodeId].help && <p className={styles.sub}>{NODES[nodeId].help}</p>}

            <div className={styles.stack}>
              {NODES[nodeId].options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => choose(opt)}
                  className={opt.urgent ? `${styles.opt} ${styles.optUrgent}` : styles.opt}
                >
                  <span className={styles.optLabel}>{opt.label}</span>
                  {opt.sub && <span className={styles.optSub}>{opt.sub}</span>}
                </button>
              ))}
            </div>

            {stack.length > 0 && (
              <div className={styles.actions}>
                <button type="button" className={styles.back} onClick={back}>
                  Back
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Red flags. A hit is TERMINAL. No claim. ────────────────────── */}
        {phase === "redflags" && ailment && (
          <div className={styles.screen}>
            <h1 className={styles.question}>That sounds like {label.toLowerCase()}.</h1>
            <p className={styles.sub}>
              Before the pharmacist sees you — do any of these apply? Tick anything that does.
              Be honest; nothing here means you&apos;re in trouble.
            </p>
            <div className={styles.stack}>
              {RED_FLAGS[ailment].map((f) => {
                const on = flagsHit.includes(f);
                return (
                  <label
                    key={f}
                    className={on ? `${styles.check} ${styles.checkOn}` : styles.check}
                  >
                    <input
                      type="checkbox"
                      className={`${styles.box} ${styles.boxAlarm}`}
                      checked={on}
                      onChange={() =>
                        setFlagsHit((c) => (on ? c.filter((x) => x !== f) : [...c, f]))
                      }
                    />
                    <span>{f}</span>
                  </label>
                );
              })}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.back} onClick={back}>
                Back
              </button>
              {flagsHit.length > 0 ? (
                <button
                  type="button"
                  className={`${styles.cta} ${styles.ctaAlarm}`}
                  onClick={handleRedFlagReferral}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.cta}
                  onClick={() => setPhase("history")}
                >
                  None of these — continue
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Red flag fired → refer. NO CLAIM. Terminal. ────────────────── */}
        {phase === "refer" && ailment && (
          <div className={styles.screen}>
            <span className={`${styles.eyebrow} ${styles.eyebrowStop}`}>
              See a doctor or nurse practitioner
            </span>
            <h1 className={styles.question}>The pharmacist can&apos;t treat this one.</h1>
            <p className={styles.sub}>
              What you&apos;ve described needs a doctor or nurse practitioner to look at it. The
              pharmacist will still talk with you and can help you work out where to go — but
              they can&apos;t assess or prescribe for this today.
            </p>
            <div className={styles.noteStop}>
              <span className={styles.noteHead}>Why</span>
              {flagsHit.map((f) => (
                <div key={f} className={styles.noteItem}>
                  · {f}
                </div>
              ))}
            </div>
            <p className={styles.sub}>
              Show this screen to the pharmacist. It tells them what you flagged, so you
              don&apos;t have to repeat yourself.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.back} onClick={restart}>
                Start over
              </button>
            </div>
          </div>
        )}

        {/* ── Not on the funded list. Real, but not billable. ────────────── */}
        {phase === "not_funded" && (
          <div className={styles.screen}>
            <span className={`${styles.eyebrow} ${styles.eyebrowCaution}`}>
              Talk to the pharmacist
            </span>
            <h1 className={styles.question}>Not on Ontario&apos;s funded list.</h1>
            <p className={styles.sub}>{notFundedReason}</p>
            <p className={styles.sub}>
              This doesn&apos;t mean nothing can be done. It means it isn&apos;t one of the
              conditions Ontario pays pharmacists to assess and prescribe for. Go ahead and
              talk to them.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.back} onClick={restart}>
                Start over
              </button>
            </div>
          </div>
        )}

        {/* ── Couldn't narrow it. ────────────────────────────────────────── */}
        {phase === "unsure" && (
          <div className={styles.screen}>
            <span className={`${styles.eyebrow} ${styles.eyebrowCaution}`}>
              Talk to the pharmacist
            </span>
            <h1 className={styles.question}>Let&apos;s not guess.</h1>
            <p className={styles.sub}>
              Nothing here fit well enough to narrow it down, and it&apos;s better to say so
              than to force it. Speak to the pharmacist directly — they&apos;ll take it from
              here.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.back} onClick={restart}>
                Start over
              </button>
            </div>
          </div>
        )}

        {/* ── Claim history. Self-report. ADVISORY ONLY. ─────────────────── */}
        {phase === "history" && ailment && (
          <div className={styles.screen}>
            <h1 className={styles.question}>Have you been assessed for this before?</h1>
            <p className={styles.sub}>
              In the last 12 months, at <strong>any</strong> pharmacy — not just this one.
              Ontario funds up to {max} assessment{max === 1 ? "" : "s"} for{" "}
              {label.toLowerCase()} in a 12-month period.
            </p>
            <div className={styles.stack}>
              {(
                [
                  [0, "No, this is the first time"],
                  [1, "Once"],
                  [2, "Twice"],
                  [3, "Three times or more"],
                  [-1, "I'm not sure"],
                ] as [PriorCount, string][]
              ).map(([v, l]) => (
                <button
                  key={l}
                  type="button"
                  className={styles.opt}
                  onClick={() => {
                    push();
                    setPriorCount(v);
                    setPhase("rx");
                  }}
                >
                  <span className={styles.optLabel}>{l}</span>
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.back} onClick={back}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* ── Existing prescription. Either "yes" blocks the claim. ──────── */}
        {phase === "rx" && ailment && (
          <div className={styles.screen}>
            <h1 className={styles.question}>Do you already have a prescription for this?</h1>
            <p className={styles.sub}>
              One that hasn&apos;t been used up, or that came from a doctor recently.
            </p>
            <div className={styles.stack}>
              {(
                [
                  ["none", "No", ""],
                  [
                    "refillable",
                    "Yes — but it's run out of refills, or the dose seems wrong",
                    "",
                  ],
                  [
                    "other_prescriber",
                    "Yes — from another prescriber, and there's a problem with it",
                    "For example, the medication isn't available",
                  ],
                  ["unsure", "I'm not sure", ""],
                ] as [ExistingRx, string, string][]
              ).map(([v, l, s]) => (
                <button
                  key={v}
                  type="button"
                  className={styles.opt}
                  onClick={() => {
                    push();
                    setExistingRx(v);
                    setPhase("consent");
                  }}
                >
                  <span className={styles.optLabel}>{l}</span>
                  {s && <span className={styles.optSub}>{s}</span>}
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.back} onClick={back}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* ── Consent. The pharmacist still confirms this in person. ─────── */}
        {phase === "consent" && ailment && (
          <div className={styles.screen}>
            <h1 className={styles.question}>One last thing.</h1>
            <p className={styles.sub}>
              The pharmacist will go over this with you in person as well — this is just so
              there&apos;s a record.
            </p>
            <label
              className={
                consentGiven ? `${styles.check} ${styles.consentOn}` : styles.check
              }
            >
              <input
                type="checkbox"
                className={styles.box}
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
              />
              <span>
                <strong>I agree to the pharmacist assessing me for this.</strong>
                <span className={styles.optSub}>
                  I understand they may write me a prescription, and that they may let my
                  family doctor know if they do.
                </span>
              </span>
            </label>
            <div className={styles.actions}>
              <button type="button" className={styles.back} onClick={back}>
                Back
              </button>
              <button
                type="button"
                className={styles.cta}
                disabled={!consentGiven || isSubmitting}
                onClick={async () => {
                  await handoff();
                  setPhase("summary");
                }}
              >
                {isSubmitting ? "Submitting..." : "Finish"}
              </button>
            </div>
          </div>
        )}

        {/* ── Summary / handoff ──────────────────────────────────────────── */}
        {phase === "summary" && ailment && (
          <div className={styles.screen}>
            <span className={`${styles.eyebrow} ${styles.eyebrowGo}`}>
              Ready for the pharmacist
            </span>
            <h1 className={styles.question}>{label}</h1>
            <p className={styles.sub}>
              From what you&apos;ve told us, this could be {label.toLowerCase()}.{" "}
              <strong>This is not a diagnosis.</strong> The pharmacist will go through it with
              you and confirm — that&apos;s their job, and it&apos;s the part that counts.
            </p>

            {intakeCode ? (
              <div className={`${styles.panel} ${styles.panelGreen}`}>
                <span className={`${styles.eyebrow} ${styles.eyebrowGo}`}>
                  Your reference code
                </span>
                <div className={styles.code}>{intakeCode}</div>
                <p className={styles.sub}>
                  Your intake has been sent to the pharmacy and is waiting in their queue. Show
                  this reference code at the counter so the pharmacist can match you to it.
                </p>
              </div>
            ) : (
              // The handoff did NOT reach the pharmacy — say so. Never show an
              // empty code as if it succeeded, never claim it was queued.
              <div className={styles.panel}>
                <span className={`${styles.eyebrow} ${styles.eyebrowStop}`}>
                  Not sent yet
                </span>
                <p className={styles.sub}>
                  Something went wrong sending this to the pharmacy. Your answers are still on
                  this screen — please show them to the pharmacist directly, or try again.
                </p>
                <button
                  type="button"
                  className={styles.cta}
                  disabled={isSubmitting}
                  onClick={() => void handoff()}
                >
                  {isSubmitting ? "Sending…" : "Try again"}
                </button>
              </div>
            )}

            <div className={styles.panel}>
              <span className={styles.eyebrow}>What you told us</span>
              <ul className={styles.recap}>
                {trail.map((t, i) => (
                  <li key={i} className={styles.recapItem}>
                    {t}
                  </li>
                ))}
                <li className={styles.recapItem}>
                  Assessed before:{" "}
                  <strong>
                    {priorCount === -1
                      ? "Not sure"
                      : priorCount === 0
                        ? "No"
                        : `${priorCount}× in 12 months`}
                  </strong>
                </li>
                <li className={styles.recapItem}>
                  Existing prescription:{" "}
                  <strong>
                    {existingRx === "none"
                      ? "None"
                      : existingRx === "unsure"
                        ? "Not sure"
                        : "Yes — needs review"}
                  </strong>
                </li>
              </ul>
            </div>

            {advisory ? (
              <div className={styles.noteCaution}>
                <span className={styles.noteHead}>For the pharmacist</span>
                <div className={styles.noteItem}>
                  {priorCount !== null && priorCount >= 0 && priorCount >= max
                    ? `Patient self-reports ${priorCount} prior assessment${priorCount === 1 ? "" : "s"
                    } — at or above the ${max}-per-year maximum. Check the clinical viewer before proceeding.`
                    : "Patient reports an existing prescription for this. Check whether it can be filled, adapted, or extended within scope — if it can, no claim."}
                </div>
              </div>
            ) : null}

            <p className={styles.sub}>
              We can only see assessments done through this pharmacy. Ontario counts every
              pharmacy you&apos;ve been to, so treat this as a guide, not a guarantee — the
              pharmacist will check properly.
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.back} onClick={restart}>
                Start over
              </button>
              <Link href="/" className={styles.cta}>
                Done
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
