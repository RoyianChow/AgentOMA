import { redirect } from "next/navigation";
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

  // Every assessment must trace back to a real, submitted intake — there is
  // no walk-in/cold-start path. No session id at all means this page was
  // reached some way other than clicking a queue row.
  if (!sessionId) {
    redirect("/pharmacist");
  }

  // Loading an intake goes through the same guarded action as typing the code
  // by hand: pharmacy scope + single-use + expiry re-checked server-side. A
  // session that doesn't resolve (expired / already consumed / wrong
  // pharmacy) sends the pharmacist back to the queue rather than rendering a
  // blank/cold-start workspace.
  const res = await getIntakeSessionById(sessionId);
  if (!res.success) {
    redirect("/pharmacist");
  }

  // Pharmacy-scoped, unconsumed, unexpired — filtered server-side in the
  // action. Holds no patient identity (the intake has none by design).
  const pending = await getPendingIntakeSessions();
  const queue = (
    <IntakeQueue intakes={pending.sessions} currentSessionId={sessionId} />
  );

  return (
    <div>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 2rem 0" }}>
        {queue}
      </div>
      {/* Keyed by intake id: switching rows REMOUNTS the workspace, so no
          state — typed identity included — survives from the previous intake. */}
      <AssessmentWorkspace key={res.session.id} session={res.session} />
    </div>
  );
}
