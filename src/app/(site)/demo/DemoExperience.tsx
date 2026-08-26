"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";

import { AILMENT_LABELS, ALL_AILMENT_IDS } from "@/config/triage";
import { DEMO_BOUNDARY, DEMO_STAGES, PATIENT_STEPS } from "@/lib/demo/tour";

import styles from "./DemoExperience.module.css";

// Public labels only. The demo intentionally imports no clinical rules,
// billing values, persistence, or authentication code.
const CONDITIONS = ALL_AILMENT_IDS.map((id) => AILMENT_LABELS[id]);

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

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
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const stage = DEMO_STAGES[stageIndex];
  const isFirst = stageIndex === 0;
  const isLast = stageIndex === DEMO_STAGES.length - 1;

  function moveToStage(nextIndex: number) {
    const boundedIndex = Math.min(
      DEMO_STAGES.length - 1,
      Math.max(0, nextIndex),
    );
    setStageIndex(boundedIndex);
    requestAnimationFrame(() => stageHeadingRef.current?.focus());
  }

  function handleStageKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveToStage(stageIndex + 1);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveToStage(stageIndex - 1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      moveToStage(0);
    }
    if (event.key === "End") {
      event.preventDefault();
      moveToStage(DEMO_STAGES.length - 1);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Interactive product tour</span>
          <h1>See a pharmacy visit move from phone to follow-up.</h1>
          <p className={styles.heroLede}>
            Follow one made-up walk-in visit through AgentOMA—from a private
            patient handoff to the pharmacist&apos;s defensible record. No account
            is needed, and nothing in this tour is saved.
          </p>

          <div className={styles.heroActions}>
            <a href="#guided-tour" className={styles.primaryLink}>
              Start the guided tour
              <ArrowIcon />
            </a>
            <Link href="/check" className={styles.secondaryLink}>
              Try the public self-check
            </Link>
          </div>

          <dl className={styles.heroFacts} aria-label="Demo facts">
            <div>
              <dd>{DEMO_STAGES.length}</dd>
              <dt>guided stages</dt>
            </div>
            <div>
              <dd>0</dd>
              <dt>real records</dt>
            </div>
            <div>
              <dd>No</dd>
              <dt>login required</dt>
            </div>
          </dl>
        </div>

        <div className={styles.heroPanel} aria-label="Demo journey and safety boundary">
          <div className={styles.heroPanelTop}>
            <span>One visit, end to end</span>
            <strong>Synthetic preview</strong>
          </div>
          <ol className={styles.miniJourney}>
            <li>
              <span>01</span>
              <div>
                <strong>Patient prepares</strong>
                <small>No identifying details on their phone</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Pharmacist assesses</strong>
                <small>Professional verification stays central</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Pharmacy follows through</strong>
                <small>Claim handoff, follow-up, and audit history</small>
              </div>
            </li>
          </ol>
          <ul className={styles.boundaryList}>
            {DEMO_BOUNDARY.map((item) => (
              <li key={item}>
                <CheckIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="guided-tour" className={styles.tourSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>The complete workflow</span>
            <h2>Step through the visit</h2>
          </div>
          <p>
            Use the stage controls or your arrow keys. Each screen explains
            what happens, what is recorded, and where the safety boundary sits.
          </p>
        </div>

        <div className={styles.tour} aria-label="AgentOMA guided demo">
          <nav
            className={styles.stageRail}
            aria-label="Demo stages"
            onKeyDown={handleStageKeys}
          >
            <div className={styles.stageRailHeader}>
              <span>Visit progress</span>
              <strong>
                {stageIndex + 1} of {DEMO_STAGES.length}
              </strong>
            </div>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label="Guided tour progress"
              aria-valuemin={1}
              aria-valuemax={DEMO_STAGES.length}
              aria-valuenow={stageIndex + 1}
              aria-valuetext={`Stage ${stageIndex + 1} of ${DEMO_STAGES.length}`}
            >
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
                    onClick={() => moveToStage(index)}
                    aria-current={index === stageIndex ? "step" : undefined}
                    aria-controls="demo-stage-panel"
                  >
                    <span className={styles.stageNumber}>{index + 1}</span>
                    <span className={styles.stageButtonCopy}>
                      <strong>{item.navLabel}</strong>
                      <small>{item.actor}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div id="demo-stage-panel" className={styles.stageContent}>
            <div className={styles.stageHeading}>
              <div className={styles.stageMeta}>
                <span>{stage.eyebrow}</span>
                <span>{stage.actor}</span>
              </div>
              <h2 ref={stageHeadingRef} tabIndex={-1}>
                {stage.title}
              </h2>
              <p>{stage.summary}</p>
            </div>

            <div className={styles.viewport}>
              <div className={styles.windowBar} aria-hidden="true">
                <div className={styles.windowDots}>
                  <span />
                  <span />
                  <span />
                </div>
                <span>AgentOMA · Synthetic workspace</span>
                <span className={styles.windowStage}>0{stageIndex + 1}</span>
              </div>

              <div className={styles.screen} aria-live="polite">
                <div className={styles.screenHeader}>
                  <div>
                    <span className={styles.screenLabel}>Made-up example</span>
                    <h3>{stage.screenTitle}</h3>
                  </div>
                  <span className={styles.status}>{stage.status}</span>
                </div>

                <div className={styles.fieldGrid}>
                  {stage.fields.map((field) => (
                    <div className={styles.fieldCard} key={field.label}>
                      <span>{field.label}</span>
                      <strong
                        className={
                          field.emphasis ? styles.fieldEmphasis : undefined
                        }
                      >
                        {field.value}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className={styles.stageResult}>
                  <span>What this stage delivers</span>
                  <strong>{stage.result}</strong>
                </div>

                <div className={styles.callout}>
                  <span aria-hidden="true">i</span>
                  <div>
                    <strong>Safety boundary</strong>
                    <p>{stage.callout}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.stageActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => moveToStage(stageIndex - 1)}
                disabled={isFirst}
              >
                Previous
              </button>

              {isLast ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => moveToStage(0)}
                >
                  Restart tour
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => moveToStage(stageIndex + 1)}
                >
                  Next: {DEMO_STAGES[stageIndex + 1]?.navLabel}
                  <ArrowIcon />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.patientFlow} aria-labelledby="walk-in-heading">
        <div className={styles.sectionHeadingCompact}>
          <span className={styles.eyebrow}>For a walk-in patient</span>
          <h2 id="walk-in-heading">Three simple steps at the pharmacy</h2>
        </div>
        <ol className={styles.stepGrid}>
          {PATIENT_STEPS.map((item) => (
            <li key={item.step} className={styles.stepCard}>
              <span className={styles.stepNumber} aria-hidden="true">
                {item.step}
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.conditions} aria-label="Funded minor ailments">
        <details>
          <summary>
            <div>
              <span className={styles.eyebrow}>Publicly funded service groups</span>
              <h2>{CONDITIONS.length} minor ailments in the current program</h2>
              <p>
                View the plain-language list used by the public experience.
                A pharmacist still verifies eligibility, scope, and suitability.
              </p>
            </div>
            <span className={styles.summaryAction}>View all</span>
          </summary>
          <ul className={styles.conditionGrid}>
            {CONDITIONS.map((label) => (
              <li key={label} className={styles.conditionChip}>
                <CheckIcon />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className={styles.finish}>
        <div>
          <span className={styles.eyebrow}>Choose your next step</span>
          <h2>Explore safely or enter the protected workspace.</h2>
          <p>
            The public self-check uses no identifying data. The live pharmacy
            portal remains invitation-only with mandatory two-factor sign-in.
          </p>
        </div>
        <div className={styles.finishActions}>
          <Link href="/check" className={styles.secondaryLink}>
            Try the self-check
          </Link>
          <Link href="/sign-in" className={styles.primaryLink}>
            Pharmacist sign in
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}
