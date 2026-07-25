import Link from "next/link";

import {
  ASSESSING_ROLES,
  requirePortalPage,
} from "@/lib/auth-guard";
import {
  FOLLOW_UP_METHOD_LABELS,
  FOLLOW_UP_NEXT_STEP_LABELS,
} from "@/lib/follow-up-schema";
import {
  listFollowUps,
  torontoToday,
  type FollowUpAttemptDTO,
  type FollowUpWorkItem,
} from "@/lib/follow-ups";

import {
  correctFollowUpAttemptAction,
  correctFollowUpPlanAction,
  recordFollowUpAction,
} from "./actions";
import styles from "./follow-ups.module.css";

export const dynamic = "force-dynamic";

function ailmentLabel(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function dateLabel(value: string): string {
  return new Date(`${value}T12:00:00.000Z`).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "America/Toronto",
  });
}

function attemptDate(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function AttemptRecord({ attempt }: { attempt: FollowUpAttemptDTO }) {
  return (
    <div className={styles.attempt}>
      <strong>
        {attempt.reached ? "Patient reached" : "Attempted — not reached"}
      </strong>
      <div className={styles.meta}>
        <span>{dateLabel(attemptDate(attempt.attemptedAt))}</span>
        <span>{FOLLOW_UP_NEXT_STEP_LABELS[attempt.nextStep]}</span>
      </div>
      {attempt.evaluation && <p>{attempt.evaluation}</p>}
      {attempt.note && <p className={styles.muted}>{attempt.note}</p>}

      <details className={styles.details}>
        <summary>Correct this attempt</summary>
        <form action={correctFollowUpAttemptAction} className={styles.correctionForm}>
          <input type="hidden" name="followUpId" value={attempt.id} />
          <div>
            <label htmlFor={`attempted-${attempt.id}`}>Attempted date</label>
            <input
              id={`attempted-${attempt.id}`}
              name="attemptedDate"
              type="date"
              defaultValue={attemptDate(attempt.attemptedAt)}
              required
            />
          </div>
          <div>
            <label htmlFor={`reached-${attempt.id}`}>Reached?</label>
            <select
              id={`reached-${attempt.id}`}
              name="reached"
              defaultValue={attempt.reached ? "yes" : "no"}
              required
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label htmlFor={`next-${attempt.id}`}>Next step</label>
            <select
              id={`next-${attempt.id}`}
              name="nextStep"
              defaultValue={attempt.nextStep}
              required
            >
              {Object.entries(FOLLOW_UP_NEXT_STEP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className={styles.full}>
            <label htmlFor={`evaluation-${attempt.id}`}>
              Safety and efficacy evaluation (required when reached)
            </label>
            <textarea
              id={`evaluation-${attempt.id}`}
              name="evaluation"
              defaultValue={attempt.evaluation ?? ""}
            />
          </div>
          <div className={styles.full}>
            <label htmlFor={`note-${attempt.id}`}>Follow-up note</label>
            <textarea
              id={`note-${attempt.id}`}
              name="note"
              defaultValue={attempt.note ?? ""}
            />
          </div>
          <div className={styles.full}>
            <label htmlFor={`reason-${attempt.id}`}>Correction reason</label>
            <textarea id={`reason-${attempt.id}`} name="correctionReason" required />
          </div>
          <div className={styles.actions}>
            <button className="btn btn-secondary" type="submit">
              Supersede attempt
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

function FollowUpCard({
  item,
  today,
}: {
  item: FollowUpWorkItem;
  today: string;
}) {
  return (
    <article
      className={[
        styles.card,
        item.isOverdue ? styles.cardOverdue : "",
        !item.isOpen ? styles.cardComplete : "",
      ].join(" ")}
    >
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.patient}>{item.patientName}</div>
          <div className={styles.meta}>
            <span>{ailmentLabel(item.ailmentGroupCode)}</span>
            <span>Due {dateLabel(item.dueDate)}</span>
            <span>{FOLLOW_UP_METHOD_LABELS[item.method]}</span>
            <Link href={`/pharmacist/audit/${item.assessmentId}`}>
              Assessment record
            </Link>
          </div>
        </div>
        <span
          className={`${styles.status} ${
            item.isOverdue ? styles.statusOverdue : ""
          }`}
        >
          {item.isOverdue ? "Overdue" : item.isOpen ? "Open" : "Completed"}
        </span>
      </div>

      <div className={styles.monitoring}>
        <strong>Monitoring parameters</strong>
        <br />
        {item.monitoringParameters}
      </div>

      {item.attempts.length > 0 && (
        <>
          <div className={styles.subheading}>Recorded attempts</div>
          {item.attempts.map((attempt) => (
            <AttemptRecord key={attempt.id} attempt={attempt} />
          ))}
        </>
      )}

      {item.isOpen && (
        <>
          <div className={styles.subheading}>Record an attempt</div>
          <form action={recordFollowUpAction} className={styles.form}>
            <input type="hidden" name="planId" value={item.id} />
            <div>
              <label htmlFor={`date-${item.id}`}>Attempted date</label>
              <input
                id={`date-${item.id}`}
                name="attemptedDate"
                type="date"
                defaultValue={today}
                required
              />
            </div>
            <div>
              <label htmlFor={`reached-new-${item.id}`}>Reached?</label>
              <select id={`reached-new-${item.id}`} name="reached" required>
                <option value="yes">Yes</option>
                <option value="no">No — attempted, not reached</option>
              </select>
            </div>
            <div>
              <label htmlFor={`next-new-${item.id}`}>Next step</label>
              <select id={`next-new-${item.id}`} name="nextStep" required>
                {Object.entries(FOLLOW_UP_NEXT_STEP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className={styles.full}>
              <label htmlFor={`evaluation-new-${item.id}`}>
                Safety and efficacy evaluation (required when reached)
              </label>
              <textarea
                id={`evaluation-new-${item.id}`}
                name="evaluation"
                placeholder="Evaluate the care plan's safety and efficacy."
              />
            </div>
            <div className={styles.full}>
              <label htmlFor={`note-new-${item.id}`}>Follow-up note</label>
              <textarea id={`note-new-${item.id}`} name="note" />
            </div>
            <div className={styles.actions}>
              <button className="btn btn-primary" type="submit">
                Record follow-up
              </button>
            </div>
          </form>
        </>
      )}

      {item.attempts.length === 0 && (
        <details className={styles.details}>
          <summary>Correct this follow-up plan</summary>
          <form action={correctFollowUpPlanAction} className={styles.correctionForm}>
            <input type="hidden" name="followUpId" value={item.id} />
            <div>
              <label htmlFor={`due-${item.id}`}>Due date</label>
              <input
                id={`due-${item.id}`}
                name="dueDate"
                type="date"
                defaultValue={item.dueDate}
                required
              />
            </div>
            <div>
              <label htmlFor={`method-${item.id}`}>Method</label>
              <select
                id={`method-${item.id}`}
                name="method"
                defaultValue={item.method}
                required
              >
                {Object.entries(FOLLOW_UP_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className={styles.full}>
              <label htmlFor={`monitor-${item.id}`}>Monitoring parameters</label>
              <textarea
                id={`monitor-${item.id}`}
                name="monitoringParameters"
                defaultValue={item.monitoringParameters}
                required
              />
            </div>
            <div className={styles.full}>
              <label htmlFor={`plan-reason-${item.id}`}>Correction reason</label>
              <textarea
                id={`plan-reason-${item.id}`}
                name="correctionReason"
                required
              />
            </div>
            <div className={styles.actions}>
              <button className="btn btn-secondary" type="submit">
                Supersede plan
              </button>
            </div>
          </form>
        </details>
      )}
    </article>
  );
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; message?: string }>;
}) {
  const actor = await requirePortalPage(ASSESSING_ROLES);
  const items = await listFollowUps(actor);
  const open = items.filter((item) => item.isOpen);
  const completed = items.filter((item) => !item.isOpen);
  const { status, message } = await searchParams;
  const today = torontoToday();

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Follow-up tracking</h1>
          <p className={styles.muted}>
            Record monitoring, safety, efficacy, and next steps for completed
            assessments.
          </p>
        </div>
        <Link href="/pharmacist" className="btn btn-secondary">
          Back to dashboard
        </Link>
      </div>

      <div className={styles.notice}>
        Follow-up remains the assessing pharmacy&apos;s responsibility even when
        the prescription is filled at another pharmacy. A documented
        not-reached attempt is retained, and the item stays open for another
        attempt.
      </div>

      {status === "error" && message && (
        <div className={styles.alert}>{message}</div>
      )}
      {(status === "recorded" || status === "corrected") && (
        <div className={styles.success}>
          Follow-up {status === "recorded" ? "recorded" : "corrected"}.
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Open and due</h2>
          <span className={styles.muted}>{open.length} open</span>
        </div>
        {open.length > 0 ? (
          <div className={styles.list}>
            {open.map((item) => (
              <FollowUpCard key={item.id} item={item} today={today} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No follow-ups are currently open.</div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Completed</h2>
          <span className={styles.muted}>{completed.length} shown</span>
        </div>
        {completed.length > 0 ? (
          <div className={styles.list}>
            {completed.map((item) => (
              <FollowUpCard key={item.id} item={item} today={today} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>No completed follow-ups yet.</div>
        )}
      </section>
    </main>
  );
}
