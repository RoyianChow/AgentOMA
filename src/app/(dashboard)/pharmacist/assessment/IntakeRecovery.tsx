import Link from "next/link";

import type { PendingIntake } from "../actions";
import IntakeQueue from "./IntakeQueue";
import styles from "./IntakeRecovery.module.css";

/**
 * Generic recovery for missing and unavailable handoffs. It intentionally
 * receives no attempted identifier or failure reason, so the rendered page
 * cannot disclose whether a supplied intake ever existed.
 */
export default function IntakeRecovery({ intakes }: { intakes: PendingIntake[] }) {
  return (
    <main className={styles.page}>
      <section className={styles.notice} aria-labelledby="intake-recovery-title">
        <span className={styles.eyebrow}>Intake unavailable</span>
        <h1 id="intake-recovery-title">Choose a waiting intake</h1>
        <p>
          This link can&apos;t be opened. It may be incomplete or no longer active.
          For privacy, the portal does not identify which situation applies.
        </p>
        <p>
          Select another waiting intake below. If the patient&apos;s reference is not
          listed, ask them to restart from the pharmacy&apos;s assessment QR code.
        </p>
        <div className={styles.actions}>
          <form action="/pharmacist/assessment" method="get" className={styles.refreshForm}>
            <button type="submit" className={styles.primaryAction}>
              Refresh waiting intakes
            </button>
          </form>
          <Link href="/pharmacist" className={styles.secondaryAction}>
            Return to dashboard
          </Link>
        </div>
      </section>

      <IntakeQueue intakes={intakes} currentSessionId={null} />
    </main>
  );
}
