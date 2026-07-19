import Link from "next/link";
import { getIntakeSessionById, getPendingIntakeSessions } from "../actions";
import { requirePortalPage } from "@/lib/auth-guard";
import AssessmentWorkspace from "./AssessmentWorkspace";
import IntakeQueue from "./IntakeQueue";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  // UX redirect only — the server actions this page's workspace calls
  // re-verify session + role themselves.
  await requirePortalPage();

  const { session: sessionId } = await searchParams;

  // Pharmacy-scoped, unconsumed, unexpired — filtered server-side in the
  // action. Holds no patient identity (the intake has none by design).
  const pending = await getPendingIntakeSessions();
  const queue = (
    <IntakeQueue intakes={pending.sessions} currentSessionId={sessionId ?? null} />
  );

  // Loading an intake goes through the same guarded action as typing the code
  // by hand: pharmacy scope + single-use + expiry re-checked server-side.
  const res = sessionId ? await getIntakeSessionById(sessionId) : null;

  if (res && !res.success) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        {queue}
        <div className="detail-section-card" style={{ maxWidth: "540px", margin: "2rem auto", textAlign: "center", padding: "2.5rem 2rem" }}>
          <h2 style={{ marginBottom: "0.75rem" }}>Intake unavailable</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{res.error}</p>
          <Link href="/pharmacist" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const session = res?.success ? res.session : null;

  return (
    <div>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 2rem 0" }}>
        {queue}
      </div>
      {/* Keyed by intake id: switching rows REMOUNTS the workspace, so no
          state — typed identity included — survives from the previous intake. */}
      <AssessmentWorkspace key={session?.id ?? "walk-in"} session={session} />
    </div>
  );
}
