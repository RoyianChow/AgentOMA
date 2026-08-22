import { redirect } from "next/navigation";
import { getIntakeSessionById, getPendingIntakeSessions } from "../actions";
import { requirePortalPage } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { odbFeeTier, pharmacy } from "@/lib/db/schema";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import AssessmentWorkspace from "./AssessmentWorkspace";
import IntakeQueue from "./IntakeQueue";
import IntakeRecovery from "./IntakeRecovery";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  // UX redirect only — the server actions this page's workspace calls
  // re-verify session, role, pharmacy, and orientation themselves.
  const actor = await requirePortalPage();
  const { session: sessionId } = await searchParams;
  const pending = await getPendingIntakeSessions();

  // Every assessment must trace back to a real, submitted intake — there is
  // no walk-in/cold-start path. Missing and unavailable identifiers share one
  // recovery page so the route never reveals whether a particular intake
  // existed, expired, or was already consumed.
  if (!sessionId) {
    return <IntakeRecovery intakes={pending.sessions} />;
  }

  // Loading an intake goes through the guarded queue-selection action:
  // pharmacy scope + single-use + expiry are re-checked server-side. A
  // session that doesn't resolve (malformed / expired / already consumed /
  // wrong pharmacy) renders the same generic recovery state.
  const res = await getIntakeSessionById(sessionId);
  if (!res.success) {
    return <IntakeRecovery intakes={pending.sessions} />;
  }

  const [feeTier] = await db
    .select({
      remoteVirtualEligible: odbFeeTier.remoteVirtualEligible,
    })
    .from(pharmacy)
    .innerJoin(odbFeeTier, eq(pharmacy.odbFeeTierCode, odbFeeTier.code))
    .where(
      and(
        eq(pharmacy.id, actor.pharmacyId),
        lte(
          odbFeeTier.effectiveDate,
          new Date().toISOString().slice(0, 10),
        ),
        or(
          isNull(odbFeeTier.endDate),
          gte(
            odbFeeTier.endDate,
            new Date().toISOString().slice(0, 10),
          ),
        ),
      ),
    )
    .limit(1);
  if (!feeTier) {
    redirect("/pharmacist/settings");
  }

  // Pharmacy-scoped, unconsumed, unexpired — filtered server-side in the
  // action. Holds no patient identity (the intake has none by design).
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
      <AssessmentWorkspace
        key={res.session.id}
        session={res.session}
        remoteVirtualEligible={feeTier.remoteVirtualEligible}
      />
    </div>
  );
}
