import Link from "next/link";

import { ASSESSING_ROLES, requirePortalPage } from "@/lib/auth-guard";
import { RX_CAPABILITY_ID } from "@/lib/rx-intake/contract";
import { listFixtureSummaries } from "@/lib/rx-intake/corpus";
import { RX_GATE_MESSAGES, rxIntakeGate } from "@/lib/rx-intake/gate";

import RxIntakeWorkspace from "./RxIntakeWorkspace";
import styles from "./rx-intake.module.css";

export const dynamic = "force-dynamic";

export default async function RxIntakePage() {
  await requirePortalPage(ASSESSING_ROLES);

  // UX only. The server action re-checks the gate itself; a crafted request
  // that skips this page still hits the same check.
  const gate = rxIntakeGate();

  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <div>
          <h1>Prescription intake — synthetic evaluation</h1>
          <p className={styles.headerSub}>
            Deterministic extraction over a fixed synthetic corpus. Experiment{" "}
            <code>{RX_CAPABILITY_ID}</code>.
          </p>
        </div>
        <Link href="/pharmacist" className="btn btn-secondary">
          Back to dashboard
        </Link>
      </div>

      <div className={styles.boundary}>
        <h2>What this surface is, and what it is not</h2>
        <ul>
          <li>
            <strong>Synthetic only.</strong> The documents below are invented. There is no
            upload and no free-text entry — do not attempt to run a real prescription
            through this surface.
          </li>
          <li>
            <strong>No model.</strong> Extraction is deterministic string parsing. No
            vendor receives any data, because nothing is sent anywhere.
          </li>
          <li>
            <strong>Nothing is saved.</strong> Output exists in this page only. It reaches
            no patient record, no assessment, no claim, and no audit entry.
          </li>
          <li>
            <strong>Not a chartered capability.</strong> {RX_CAPABILITY_ID} has no
            experiment charter, no frozen thresholds, and no pharmacist evaluation. It is
            not approved for any real document.
          </li>
        </ul>
      </div>

      {gate.enabled ? (
        <RxIntakeWorkspace fixtures={listFixtureSummaries()} expiresOn={gate.expiresOn} />
      ) : (
        <div className={styles.disabled}>
          <h2>Capability disabled</h2>
          <p>{RX_GATE_MESSAGES[gate.reason]}</p>
        </div>
      )}
    </div>
  );
}
