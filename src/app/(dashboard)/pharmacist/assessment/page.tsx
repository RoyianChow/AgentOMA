import Link from "next/link";
import { getIntakeSessionById } from "../actions";
import { requirePortalPage } from "@/lib/auth-guard";
import AssessmentWorkspace from "./AssessmentWorkspace";

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

  if (!sessionId) {
    return <AssessmentWorkspace session={null} />;
  }

  // Pharmacy scoping happens inside the action, from the session.
  const res = await getIntakeSessionById(sessionId);

  if (!res.success) {
    return (
      <div style={{ maxWidth: "540px", margin: "6rem auto", padding: "0 1.5rem" }}>
        <div className="detail-section-card" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
          <h2 style={{ marginBottom: "0.75rem" }}>Intake unavailable</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{res.error}</p>
          <Link href="/pharmacist" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <AssessmentWorkspace session={res.session} />;
}
