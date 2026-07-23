"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function SelfCheckFlow() {
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
        {phase === "intro" && (
          <section className={styles.screen}>
            <span className={`${styles.eyebrow} ${styles.eyebrowGo}`}>
              Private self-check
            </span>
            <h1 className={styles.question}>
              Check whether a pharmacist may be able to help.
            </h1>
            <p className={styles.sub}>
              This helps you prepare for a pharmacy visit. It is not a
              diagnosis, not a prescription, and does not bill anything. A
              pharmacist must perform the actual assessment.
            </p>
            <div className={`${styles.panel} ${styles.panelGreen}`}>
              <strong>Nothing is sent or saved.</strong>
              <p className={styles.panelText}>
                Do not enter your name, health-card number, date of birth, or
                other identifying information. Your answers stay in this tab
                until you leave or start over.
              </p>
            </div>
            <div className={styles.actions}>
              <Link href="/" className={styles.back}>
                Back to home
              </Link>
              <button
                type="button"
                className={styles.cta}
                onClick={() => setPhase("emergency")}
              >
                Start self-check
              </button>
            </div>
          </section>
        )}

        {phase === "emergency" && (
          <section className={styles.screen}>
            <span className={`${styles.eyebrow} ${styles.eyebrowStop}`}>
              Safety first
            </span>
            <h1 className={styles.question}>
              Are any of these happening right now?
            </h1>
            <p className={styles.sub}>Select every statement that applies.</p>
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
            <div className={styles.actions}>
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
                  ? "Show urgent guidance"
                  : "None of these — continue"}
              </button>
            </div>
          </section>
        )}

        {phase === "triage" && node && (
          <section className={styles.screen} key={nodeId}>
            <span className={styles.eyebrow}>Self-reported symptoms</span>
            <h1 className={styles.question}>{node.title}</h1>
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
          <section className={styles.screen}>
            <span className={`${styles.eyebrow} ${styles.eyebrowCaution}`}>
              Safety questions
            </span>
            <h1 className={styles.question}>Do any of these apply?</h1>
            <p className={styles.sub}>
              Select every statement that applies. These answers help decide
              whether this self-check should stop.
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
            <div className={styles.actions}>
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
          <section className={styles.screen}>
            {summary.kind === "pre_visit" ? (
              <>
                <span className={`${styles.eyebrow} ${styles.eyebrowGo}`}>
                  Pre-visit summary
                </span>
                <h1 className={styles.question}>
                  A pharmacist may be able to assess this.
                </h1>
                <p className={styles.sub}>
                  Your answers point toward{" "}
                  <strong>{summary.suspectedAilment.label}</strong>. This is
                  self-reported and is not a diagnosis. The pharmacist must
                  perform and document their own assessment.
                </p>
                <div className={`${styles.panel} ${styles.panelGreen}`}>
                  <strong>Bring the PDF to any Ontario pharmacy.</strong>
                  <p className={styles.panelText}>
                    It contains your answers only. It has no health-card number
                    or billing details, and it does not guarantee a prescription
                    or publicly funded service.
                  </p>
                </div>
              </>
            ) : (
              <>
                <span
                  className={`${styles.eyebrow} ${
                    summary.reason === "emergency"
                      ? styles.eyebrowStop
                      : styles.eyebrowCaution
                  }`}
                >
                  Advisory
                </span>
                <h1 className={styles.question}>
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

            <p className={styles.disclaimer}>
              Not a diagnosis. Not a prescription. Nothing has been billed or
              submitted.
            </p>

            {downloadState === "failed" && (
              <div className={`${styles.panel} ${styles.panelCaution}`}>
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
                onClick={() => void downloadPdf()}
              >
                {downloadState === "working"
                  ? "Creating PDF…"
                  : summary.kind === "pre_visit"
                    ? "Download pre-visit PDF"
                    : "Download advisory PDF"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
