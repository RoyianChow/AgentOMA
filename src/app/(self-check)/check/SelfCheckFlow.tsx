"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AILMENT_LABELS,
  EMERGENCY_SIGNS,
  NODES,
  RED_FLAGS,
  TRIAGE_ROOT,
  type AilmentId,
  type TriageOption,
} from "@/config/triage";
import {
  createAdvisorySummary,
  createPreVisitSummary,
  type SelfCheckSummary,
  type SelfReportedAnswer,
} from "@/lib/self-check/model";
import { safelyDownloadSelfCheckPdf } from "@/lib/self-check/pdf";
import styles from "./SelfCheckFlow.module.css";

type Phase =
  | "intro"
  | "emergency"
  | "triage"
  | "red_flags"
  | "result";

const PROGRESS_BY_PHASE: Partial<
  Record<Phase, { current: number; label: string }>
> = {
  emergency: { current: 1, label: "Immediate safety" },
  triage: { current: 2, label: "Your concern" },
  red_flags: { current: 3, label: "Safety review" },
};

function BrandHeader() {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand} aria-label="AgentOMA self-check beta">
        <span className={styles.brandMark} aria-hidden="true" />
        <span className={styles.brandText}>
          <span className={styles.brandName}>AgentOMA</span>
          <span className={styles.brandProduct}>Ontario self-check</span>
        </span>
        <span className={styles.betaBadge}>Beta</span>
      </div>
      <Link
        href="/"
        className={styles.exitLink}
        aria-label="Exit the self-check and return home"
      >
        Exit
      </Link>
    </header>
  );
}

function FlowProgress({ phase }: Readonly<{ phase: Phase }>) {
  const progress = PROGRESS_BY_PHASE[phase];
  if (!progress) return null;

  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-label="Self-check progress"
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={progress.current}
      aria-valuetext={`Step ${progress.current} of 3: ${progress.label}`}
    >
      <div className={styles.progressMeta}>
        <span>Step {progress.current} of 3</span>
        <span>{progress.label}</span>
      </div>
      <div className={styles.progressTrack} aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={
              step <= progress.current
                ? `${styles.progressSegment} ${styles.progressSegmentActive}`
                : styles.progressSegment
            }
          />
        ))}
      </div>
    </div>
  );
}

export default function SelfCheckFlow() {
  // This is a public, pharmacy-agnostic flow. State is deliberately transient
  // React memory: no answer is written to storage, put in a URL, sent to an
  // application endpoint, or included in analytics.
  const [phase, setPhase] = useState<Phase>("intro");
  const [nodeId, setNodeId] = useState(TRIAGE_ROOT);
  const [nodeStack, setNodeStack] = useState<string[]>([]);
  const [answers, setAnswers] = useState<SelfReportedAnswer[]>([]);
  const [emergencyChecks, setEmergencyChecks] = useState<string[]>([]);
  const [ailment, setAilment] = useState<AilmentId | null>(null);
  const [redFlagsHit, setRedFlagsHit] = useState<string[]>([]);
  const [summary, setSummary] = useState<SelfCheckSummary | null>(null);
  const [downloadState, setDownloadState] = useState<
    "idle" | "working" | "failed"
  >("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Announce each new screen to keyboard and screen-reader users and return a
  // long checkbox screen to its heading after the person advances.
  useEffect(() => {
    headingRef.current?.focus();
  }, [nodeId, phase]);

  // Restart is also the privacy reset: leaving a completed result or starting
  // over must discard every answer and generated summary from this tab.
  function restart() {
    setPhase("intro");
    setNodeId(TRIAGE_ROOT);
    setNodeStack([]);
    setAnswers([]);
    setEmergencyChecks([]);
    setAilment(null);
    setRedFlagsHit([]);
    setSummary(null);
    setDownloadState("idle");
  }

  function recordEmergencyResult() {
    if (emergencyChecks.length > 0) {
      const emergencyAnswer = {
        question: "Emergency warning signs",
        answer: emergencyChecks.join("; "),
      };
      setSummary(
        createAdvisorySummary({
          reason: "emergency",
          answers: [emergencyAnswer],
          flaggedItems: emergencyChecks,
        }),
      );
      setPhase("result");
      return;
    }

    setAnswers([
      {
        question: "Emergency warning signs",
        answer: "None selected",
      },
    ]);
    setPhase("triage");
  }

  function chooseOption(option: TriageOption) {
    const node = NODES[nodeId];
    if (!node) return;

    const nextAnswers = [
      ...answers,
      {
        question: node.title,
        answer: option.label,
      },
    ];
    setAnswers(nextAnswers);

    if (option.next) {
      setNodeStack((current) => [...current, nodeId]);
      setNodeId(option.next);
      return;
    }

    if (option.ailment) {
      setNodeStack((current) => [...current, nodeId]);
      setAilment(option.ailment);
      setPhase("red_flags");
      return;
    }

    const reason = option.outcome === "unsure" ? "unsure" : "out_of_scope";
    setSummary(
      createAdvisorySummary({
        reason,
        answers: nextAnswers,
        flaggedItems: [
          reason === "unsure"
            ? "The answers did not narrow to one supported self-check path."
            : "The selected path is outside this pharmacy self-check.",
        ],
      }),
    );
    setPhase("result");
  }

  function backFromTriage() {
    const previousNode = nodeStack.at(-1);
    if (!previousNode) {
      setPhase("emergency");
      setAnswers([]);
      return;
    }

    setNodeId(previousNode);
    setNodeStack((current) => current.slice(0, -1));
    setAnswers((current) => current.slice(0, -1));
  }

  function backFromRedFlags() {
    const previousNode = nodeStack.at(-1) ?? TRIAGE_ROOT;
    setNodeId(previousNode);
    setNodeStack((current) => current.slice(0, -1));
    setAnswers((current) => current.slice(0, -1));
    setAilment(null);
    setRedFlagsHit([]);
    setPhase("triage");
  }

  function finishRedFlags() {
    if (!ailment) return;

    const redFlagAnswers = RED_FLAGS[ailment].map((question) => ({
      question,
      answer: redFlagsHit.includes(question) ? "Yes" : "No",
    }));

    if (redFlagsHit.length > 0) {
      setSummary(
        createAdvisorySummary({
          reason: "red_flag",
          answers: [...answers, ...redFlagAnswers],
          flaggedItems: redFlagsHit,
        }),
      );
    } else {
      setSummary(
        createPreVisitSummary({
          ailmentId: ailment,
          ailmentLabel: AILMENT_LABELS[ailment],
          answers,
          redFlagQuestions: RED_FLAGS[ailment],
        }),
      );
    }

    setPhase("result");
  }

  async function downloadPdf() {
    if (!summary || downloadState === "working") return;
    setDownloadState("working");
    const result = await safelyDownloadSelfCheckPdf(summary);
    setDownloadState(result.ok ? "idle" : "failed");
  }

  const node = NODES[nodeId];

  return (
    <div className={styles.root}>
      <div className={styles.phone}>
        <BrandHeader />

        <noscript>
          <div className={`${styles.panel} ${styles.panelCaution}`}>
            This self-check needs JavaScript to move through the questions and
            create your private PDF. No answers are sent to a server.
          </div>
        </noscript>

        {phase === "intro" && (
          <section className={`${styles.screen} ${styles.introScreen}`}>
            <h1 ref={headingRef} tabIndex={-1} className={styles.question}>
              Could an Ontario pharmacist help with this concern?
            </h1>
            <p className={styles.sub}>
              Answer a few plain-language questions about one health concern.
              You will get next steps and, when appropriate, a private summary
              to bring to any Ontario pharmacy.
            </p>

            <p className={styles.introCaution}>
              This is not a diagnosis or prescription. If you think this is an
              emergency, call 911 or go to an emergency department.
            </p>

            <div
              className={`${styles.actions} ${styles.singleAction} ${styles.introActions}`}
            >
              <button
                type="button"
                className={styles.cta}
                onClick={() => setPhase("emergency")}
              >
                Start self-check
              </button>
            </div>

            <h2 className={styles.sectionTitle}>What to expect</h2>

            <ul className={styles.promiseList} aria-label="What to expect">
              <li>
                <span className={styles.promiseIcon} aria-hidden="true">
                  1
                </span>
                <span>
                  <strong>Safety first</strong>
                  <small>We start by checking for warning signs.</small>
                </span>
              </li>
              <li>
                <span className={styles.promiseIcon} aria-hidden="true">
                  2
                </span>
                <span>
                  <strong>No identifying details</strong>
                  <small>No name, date of birth, or health-card number.</small>
                </span>
              </li>
              <li>
                <span className={styles.promiseIcon} aria-hidden="true">
                  3
                </span>
                <span>
                  <strong>Useful next steps</strong>
                  <small>Save a summary or learn where to seek care.</small>
                </span>
              </li>
            </ul>

            <div className={`${styles.panel} ${styles.panelGreen}`}>
              <strong>Nothing is sent or saved.</strong>
              <p className={styles.panelText}>
                Your answers stay only in this tab until you leave or start
                over. A downloaded PDF stays on your device and is yours to
                share.
              </p>
            </div>
          </section>
        )}

        {phase === "emergency" && (
          <section className={`${styles.screen} ${styles.screenWithDock}`}>
            <FlowProgress phase={phase} />
            <h1 ref={headingRef} tabIndex={-1} className={styles.question}>
              Are any of these happening right now?
            </h1>
            <p className={styles.sub}>
              Select every statement that applies. If none apply, leave them
              unselected and continue.
            </p>
            <div className={styles.stack}>
              {EMERGENCY_SIGNS.map((sign) => {
                const checked = emergencyChecks.includes(sign);
                return (
                  <label
                    key={sign}
                    className={
                      checked
                        ? `${styles.check} ${styles.checkOn}`
                        : styles.check
                    }
                  >
                    <input
                      type="checkbox"
                      className={styles.boxAlarm}
                      checked={checked}
                      onChange={() =>
                        setEmergencyChecks((current) =>
                          checked
                            ? current.filter((item) => item !== sign)
                            : [...current, sign],
                        )
                      }
                    />
                    <span>{sign}</span>
                  </label>
                );
              })}
            </div>
            <p className={styles.selectionStatus} aria-live="polite">
              {emergencyChecks.length === 0
                ? "No warning signs selected"
                : `${emergencyChecks.length} warning ${
                    emergencyChecks.length === 1 ? "sign" : "signs"
                  } selected`}
            </p>
            <div className={`${styles.actions} ${styles.dockedActions}`}>
              <button type="button" className={styles.back} onClick={restart}>
                Back
              </button>
              <button
                type="button"
                className={
                  emergencyChecks.length > 0
                    ? `${styles.cta} ${styles.ctaAlarm}`
                    : styles.cta
                }
                onClick={recordEmergencyResult}
              >
                {emergencyChecks.length > 0
                  ? "Get emergency guidance"
                  : "None of these — continue"}
              </button>
            </div>
          </section>
        )}

        {phase === "triage" && node && (
          <section className={styles.screen} key={nodeId}>
            <FlowProgress phase={phase} />
            <h1 ref={headingRef} tabIndex={-1} className={styles.question}>
              {node.title}
            </h1>
            {node.help && <p className={styles.sub}>{node.help}</p>}
            <div className={styles.stack}>
              {node.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className={
                    option.urgent
                      ? `${styles.opt} ${styles.optUrgent}`
                      : styles.opt
                  }
                  onClick={() => chooseOption(option)}
                >
                  <span className={styles.optLabel}>{option.label}</span>
                  {option.sub && (
                    <span className={styles.optSub}>{option.sub}</span>
                  )}
                  <span className={styles.optArrow} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.back}
                onClick={backFromTriage}
              >
                Back
              </button>
            </div>
          </section>
        )}

        {phase === "red_flags" && ailment && (
          <section className={`${styles.screen} ${styles.screenWithDock}`}>
            <FlowProgress phase={phase} />
            <h1 ref={headingRef} tabIndex={-1} className={styles.question}>
              Do any of these apply?
            </h1>
            <p className={styles.sub}>
              Select every statement that applies. If none apply, leave them
              unselected and continue.
            </p>
            <div className={styles.stack}>
              {RED_FLAGS[ailment].map((flag) => {
                const checked = redFlagsHit.includes(flag);
                return (
                  <label
                    key={flag}
                    className={
                      checked
                        ? `${styles.check} ${styles.checkOn}`
                        : styles.check
                    }
                  >
                    <input
                      type="checkbox"
                      className={styles.boxAlarm}
                      checked={checked}
                      onChange={() =>
                        setRedFlagsHit((current) =>
                          checked
                            ? current.filter((item) => item !== flag)
                            : [...current, flag],
                        )
                      }
                    />
                    <span>{flag}</span>
                  </label>
                );
              })}
            </div>
            <p className={styles.selectionStatus} aria-live="polite">
              {redFlagsHit.length === 0
                ? "No safety concerns selected"
                : `${redFlagsHit.length} safety ${
                    redFlagsHit.length === 1 ? "concern" : "concerns"
                  } selected`}
            </p>
            <div className={`${styles.actions} ${styles.dockedActions}`}>
              <button
                type="button"
                className={styles.back}
                onClick={backFromRedFlags}
              >
                Back
              </button>
              <button
                type="button"
                className={
                  redFlagsHit.length > 0
                    ? `${styles.cta} ${styles.ctaAlarm}`
                    : styles.cta
                }
                onClick={finishRedFlags}
              >
                {redFlagsHit.length > 0
                  ? "Show next steps"
                  : "None of these — continue"}
              </button>
            </div>
          </section>
        )}

        {phase === "result" && summary && (
          <section className={`${styles.screen} ${styles.resultScreen}`}>
            <div
              className={`${styles.resultStatus} ${
                summary.kind === "pre_visit"
                  ? styles.resultStatusGo
                  : summary.reason === "emergency"
                    ? styles.resultStatusStop
                    : styles.resultStatusCaution
              }`}
            >
              <span className={styles.resultIcon} aria-hidden="true">
                {summary.kind === "pre_visit" ? (
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="m5 12.5 4.1 4L19 7" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M12 7v6" />
                    <path d="M12 17h.01" />
                  </svg>
                )}
              </span>
              <span>
                {summary.kind === "pre_visit"
                  ? "Self-check complete"
                  : "Advisory"}
              </span>
            </div>
            {summary.kind === "pre_visit" ? (
              <>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className={styles.question}
                >
                  A pharmacist may be able to assess this.
                </h1>
                <p className={styles.sub}>
                  Your answers point toward{" "}
                  <strong>{summary.suspectedAilment.label}</strong>. This is
                  preparation for a conversation, not a diagnosis. A
                  pharmacist must perform their own assessment.
                </p>
                <div className={`${styles.panel} ${styles.panelGreen}`}>
                  <strong>Your next step</strong>
                  <p className={styles.panelText}>
                    Download the summary and bring it to any Ontario pharmacy.
                    Consider calling ahead to ask whether a pharmacist is
                    available for a minor ailment assessment.
                  </p>
                </div>
                <div className={styles.nextSteps}>
                  <h2>What happens next</h2>
                  <ol>
                    <li>
                      <span aria-hidden="true">1</span>
                      <p>
                        <strong>Save your summary.</strong> It contains the
                        answers you entered, with no identity or billing data.
                      </p>
                    </li>
                    <li>
                      <span aria-hidden="true">2</span>
                      <p>
                        <strong>Speak with a pharmacist.</strong> Show the PDF
                        or keep this screen open when you arrive.
                      </p>
                    </li>
                    <li>
                      <span aria-hidden="true">3</span>
                      <p>
                        <strong>Expect a fresh assessment.</strong> The
                        pharmacist will confirm whether the service and any
                        treatment are appropriate.
                      </p>
                    </li>
                  </ol>
                </div>
              </>
            ) : (
              <>
                <h1
                  ref={headingRef}
                  tabIndex={-1}
                  className={styles.question}
                >
                  {summary.reason === "emergency"
                    ? "Call 911, or go to an emergency department."
                    : "Please be seen before relying on this self-check."}
                </h1>
                <p className={styles.sub}>
                  {summary.reason === "emergency"
                    ? "The warning signs you selected need emergency care."
                    : "A response you selected means this self-check cannot determine that a pharmacy assessment is appropriate. See a pharmacist in person, a physician, or a nurse practitioner."}
                </p>
                <div
                  className={
                    summary.reason === "emergency"
                      ? `${styles.panel} ${styles.panelStop}`
                      : `${styles.panel} ${styles.panelCaution}`
                  }
                >
                  <strong>What was flagged</strong>
                  <ul className={styles.recap}>
                    {summary.flaggedItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <div
              className={`${styles.pdfCard} ${
                summary.kind === "pre_visit"
                  ? styles.pdfCardGo
                  : summary.reason === "emergency"
                    ? styles.pdfCardStop
                    : styles.pdfCardCaution
              }`}
            >
              <span className={styles.pdfIcon} aria-hidden="true">
                PDF
              </span>
              <p>
                <strong>Private, downloadable summary</strong>
                <span>
                  Created in this browser. Nothing is submitted to a pharmacy
                  or the Ontario health system.
                </span>
              </p>
            </div>

            <p className={styles.disclaimer}>
              Not a diagnosis. Not a prescription. Nothing has been billed or
              submitted.
            </p>

            {downloadState === "failed" && (
              <div
                className={`${styles.panel} ${styles.panelCaution}`}
                role="status"
              >
                The PDF could not be created. Your answers have not been sent
                anywhere. You can try again or show this screen when you are
                seen.
              </div>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.back} onClick={restart}>
                Start over
              </button>
              <button
                type="button"
                className={styles.cta}
                disabled={downloadState === "working"}
                aria-busy={downloadState === "working"}
                onClick={() => void downloadPdf()}
              >
                {downloadState === "working"
                  ? "Creating PDF…"
                  : summary.kind === "pre_visit"
                    ? "Download pre-visit PDF"
                    : "Download advisory PDF"}
              </button>
            </div>
            <p className={styles.downloadStatus} aria-live="polite">
              {downloadState === "working"
                ? "Creating your private PDF."
                : downloadState === "failed"
                  ? "PDF creation failed. No answers were sent."
                  : ""}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
