import { redirect } from "next/navigation";
import { getIntakeSessionById, getPendingIntakeSessions } from "../actions";
import { requirePortalPage } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { odbFeeTier, pharmacy } from "@/lib/db/schema";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import AssessmentWorkspace from "./AssessmentWorkspace";
import IntakeQueue from "./IntakeQueue";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  // UX redirect only — the server actions this page's workspace calls
  // re-verify session + role themselves. The role gates the admin
  // orientation-override affordance (also re-checked server-side).
  const actor = await requirePortalPage();
  const canOverrideOrientation = actor.role === "pharmacy_admin";
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
      <AssessmentWorkspace
        key={res.session.id}
        session={res.session}
        canOverrideOrientation={canOverrideOrientation}
        remoteVirtualEligible={feeTier.remoteVirtualEligible}
      />
    </div>
  );
}
