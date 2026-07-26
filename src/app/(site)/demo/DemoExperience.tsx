"use client";

import Link from "next/link";
import { useState } from "react";

import { DEMO_BOUNDARY, DEMO_STAGES, PATIENT_STEPS } from "@/lib/demo/tour";
import { AILMENT_LABELS, ALL_AILMENT_IDS } from "@/config/triage";

import styles from "./DemoExperience.module.css";

// The 23 funded Ontario minor-ailment groups, in plain-language labels, sourced
// from the verified triage config (no PINs, fees, or claim maximums here).
const CONDITIONS = ALL_AILMENT_IDS.map((id) => AILMENT_LABELS[id]);

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default function DemoExperience() {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = DEMO_STAGES[stageIndex];
  const isFirst = stageIndex === 0;
  const isLast = stageIndex === DEMO_STAGES.length - 1;

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <div className={styles.introCopy}>
          <span className={styles.eyebrow}>Interactive guided demo</span>
          <h1>Ontario minor ailments, assessed at the pharmacy — start on your phone.</h1>
          <p>
            A walk-in patient begins the assessment from the waiting room, and
            the pharmacist finishes it at the desk. See the whole flow — for both
            sides of the counter — using a synthetic pink-eye example. Nothing
            here is real and nothing is saved.
          </p>
        </div>

        <div className={styles.boundaryCard} aria-label="Demo safety boundary">
          <strong>Safe demo boundary</strong>
          <ul>
            {DEMO_BOUNDARY.map((item) => (
              <li key={item}>
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.patientFlow} aria-label="How a walk-in works">
        <h2>How a walk-in works</h2>
        <ol className={styles.stepGrid}>
          {PATIENT_STEPS.map((s) => (
            <li key={s.step} className={styles.stepCard}>
              <span className={styles.stepNumber} aria-hidden="true">{s.step}</span>
              <div>
                <strong>{s.title}</strong>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.conditions} aria-label="Funded minor ailments">
        <div className={styles.conditionsHead}>
          <div>
            <span className={styles.eyebrow}>What pharmacists can assess</span>
            <h2>{CONDITIONS.length} funded Ontario minor ailments</h2>
          </div>
          <p>
            An Ontario pharmacist can assess — and, where appropriate, prescribe
            for — each of these publicly funded conditions. The self-check guides
            a walk-in patient to the right one before they reach the counter.
          </p>
        </div>
        <ul className={styles.conditionGrid}>
          {CONDITIONS.map((label) => (
            <li key={label} className={styles.conditionChip}>{label}</li>
          ))}
        </ul>
      </section>

      <div className={styles.tourIntro}>
        <span className={styles.eyebrow}>End to end</span>
        <h2>Follow one visit through the whole workflow</h2>
        <p>
          From the patient&apos;s self-check to the pharmacist&apos;s record, the
          claim draft, follow-up, and the audit trail — step through each stage.
        </p>
      </div>

      <section className={styles.tour} aria-label="AgentOMA guided demo">
        <nav className={styles.stageRail} aria-label="Demo stages">
          <div className={styles.stageRailHeader}>
            <span>Workflow</span>
            <strong>
              {stageIndex + 1}/{DEMO_STAGES.length}
            </strong>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span
              className={styles.progressFill}
              style={{
                width: `${((stageIndex + 1) / DEMO_STAGES.length) * 100}%`,
              }}
            />
          </div>
          <ol>
            {DEMO_STAGES.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${styles.stageButton} ${
                    index === stageIndex ? styles.stageButtonActive : ""
                  }`}
                  onClick={() => setStageIndex(index)}
                  aria-current={index === stageIndex ? "step" : undefined}
                >
                  <span className={styles.stageNumber}>{index + 1}</span>
                  <span>{item.navLabel}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.stageContent} aria-live="polite">
          <div className={styles.stageHeading}>
            <span>{stage.eyebrow}</span>
            <h2>{stage.title}</h2>
            <p>{stage.summary}</p>
          </div>

          <div className={styles.viewport}>
            <div className={styles.windowBar} aria-hidden="true">
              <div className={styles.windowDots}>
                <span />
                <span />
                <span />
              </div>
              <span>AgentOMA demo workspace</span>
            </div>

            <div className={styles.screen}>
              <div className={styles.screenHeader}>
                <div>
                  <span className={styles.screenLabel}>Synthetic preview</span>
                  <h3>{stage.screenTitle}</h3>
                </div>
                <span className={styles.status}>{stage.status}</span>
              </div>

              <div className={styles.fieldGrid}>
                {stage.fields.map((field) => (
                  <div className={styles.fieldCard} key={field.label}>
                    <span>{field.label}</span>
                    <strong
                      className={field.emphasis ? styles.fieldEmphasis : undefined}
                    >
                      {field.value}
                    </strong>
                  </div>
                ))}
              </div>

              <div className={styles.callout}>
                <span aria-hidden="true">i</span>
                <p>{stage.callout}</p>
              </div>
            </div>
          </div>

          <div className={styles.stageActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setStageIndex((current) => Math.max(0, current - 1))}
              disabled={isFirst}
            >
              Previous
            </button>

            {isLast ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setStageIndex(0)}
              >
                Restart demo
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() =>
                  setStageIndex((current) =>
                    Math.min(DEMO_STAGES.length - 1, current + 1),
                  )
                }
              >
                Next stage
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={styles.finish}>
        <div>
          <span>Ready for the protected workspace?</span>
          <h2>The live portal remains invitation-only.</h2>
          <p>
            Pharmacy team members sign in with email, password, and mandatory
            two-factor authentication.
          </p>
        </div>
        <Link href="/sign-in" className={styles.signInLink}>
          Pharmacist sign in
        </Link>
      </section>
    </div>
  );
}
