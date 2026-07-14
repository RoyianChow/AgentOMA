import Link from "next/link";
import { getIntakeSessionById } from "../actions";
import { MOCK_PHARMACY_ID } from "@/lib/constants";
import AssessmentWorkspace from "./AssessmentWorkspace";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session: sessionId } = await searchParams;

  if (!sessionId) {
    return <AssessmentWorkspace session={null} />;
  }

  const res = await getIntakeSessionById(sessionId, MOCK_PHARMACY_ID);

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
