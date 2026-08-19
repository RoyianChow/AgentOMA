import { TASK04_PUBLIC_LOCATION_LABEL } from "../../env/server";
import {
  ACCESSIBILITY_PREFERENCES,
  LANGUAGE_PREFERENCES,
} from "../../booking/contracts";
import {
  runTask04PublicBookAvailabilityAction,
  runTask04PublicBookingCreateAction,
} from "./actions";
import { loadTask04PublicBookCatalog } from "./book-server";
import type { Task04BookCatalogResult } from "./book-ui-model";
import { BookingWorkspace } from "./booking-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export function PublicBookPageContent({
  initialCatalog,
}: Readonly<{
  initialCatalog: Task04BookCatalogResult;
}>) {
  return (
    <section
      className="card booking-page"
      aria-labelledby="booking-page-title"
    >
      <header className="booking-page-header">
        <div className="eyebrow">Synthetic public booking</div>
        <h1 id="booking-page-title">Book an appointment</h1>
        <p className="booking-location">
          Location: <strong>{TASK04_PUBLIC_LOCATION_LABEL}</strong>
        </p>
        <p>
          Choose a synthetic administrative service and an available
          appointment time. This workflow is not monitored for medical
          details or emergencies.
        </p>
        <p className="footer-note">
          Appointment times use the authoritative timezone shown with
          each result.
        </p>
      </header>
      <BookingWorkspace
        initialCatalog={initialCatalog}
        searchAvailability={
          runTask04PublicBookAvailabilityAction
        }
        createBooking={runTask04PublicBookingCreateAction}
        preferenceOptions={{
          languages: LANGUAGE_PREFERENCES,
          accessibility: ACCESSIBILITY_PREFERENCES,
        }}
      />
    </section>
  );
}

export function createTask04PublicBookPage(
  loadCatalog: () => Promise<Task04BookCatalogResult> =
    loadTask04PublicBookCatalog,
) {
  return async function PublicBookPage() {
    const initialCatalog = await loadCatalog();
    return (
      <PublicBookPageContent initialCatalog={initialCatalog} />
    );
  };
}

export default createTask04PublicBookPage();
