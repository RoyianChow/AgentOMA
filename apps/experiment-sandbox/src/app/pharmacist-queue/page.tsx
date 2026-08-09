import {
  TASK04_PUBLIC_LOCATION_LABEL,
} from "../../env/server";
import {
  TASK04_SAFE_ERROR_MESSAGES,
} from "../../booking/safe-errors";
import {
  APPOINTMENT_MODALITIES,
} from "../../booking/contracts";
import {
  TASK04_PHARMACIST_QUEUE_SORTS,
  TASK04_PHARMACIST_QUEUE_STATUSES,
} from "../../booking/pharmacist-queue-contracts";
import { runTask04PharmacistQueueUiAction } from "./actions";
import { QueueWorkspace } from "./queue-workspace";
import { executeTask04QueueUiRequest } from "./queue-server";
import type { Task04QueueUiResult } from "./queue-ui-model";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FILTER_OPTIONS = Object.freeze({
  statuses: TASK04_PHARMACIST_QUEUE_STATUSES,
  modalities: APPOINTMENT_MODALITIES,
  sorts: TASK04_PHARMACIST_QUEUE_SORTS,
});

export function PharmacistQueuePageContent({
  initialResult,
}: Readonly<{ initialResult: Task04QueueUiResult }>) {
  return (
    <section className="card queue-page" aria-labelledby="queue-title">
      <header className="queue-page-header">
        <div className="eyebrow">Read-only administrative view</div>
        <h1 id="queue-title">Synthetic pharmacist queue</h1>
        <p className="queue-location">
          Location: <strong>{TASK04_PUBLIC_LOCATION_LABEL}</strong>
        </p>
        <p>
          This page shows synthetic administrative scheduling
          information only. It does not perform clinical review or
          authorize a booking action.
        </p>
        <p className="footer-note">
          Appointment times use the authoritative timezone printed on
          each queue item.
        </p>
      </header>
      <QueueWorkspace
        initialResult={initialResult}
        runQueueAction={runTask04PharmacistQueueUiAction}
        unavailableMessage={
          TASK04_SAFE_ERROR_MESSAGES.TEMPORARILY_UNAVAILABLE
        }
        filterOptions={FILTER_OPTIONS}
      />
    </section>
  );
}

export default async function PharmacistQueuePage() {
  const initialResult = await executeTask04QueueUiRequest({
    sort: "start_time_asc",
  });
  return (
    <PharmacistQueuePageContent initialResult={initialResult} />
  );
}
