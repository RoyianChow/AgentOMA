import TriageFlow from "./TriageFlow";
import { getClaimMaximums } from "@/config/ailment-reference";
import { resolvePharmacy } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Patient-facing minor ailment intake — runs on the PATIENT'S OWN PHONE.
 *
 * Server component. It supplies reference data (claim maximums) to the client
 * flow and resolves which pharmacy this intake belongs to from the
 * per-pharmacy QR link (/assessment?pharmacy=<uuid>) — validated against the
 * pharmacy table. No (or an unknown) pharmacy → a "scan your pharmacy's code"
 * screen, never the triage flow: there would be nothing to attach the intake
 * to. The action re-validates the id server-side on submission.
 *
 * TODO(reference tables): once `ailment_group` is seeded, replace
 * getClaimMaximums() with a DB query filtered on effective_date, so a future
 * EO Notice revision doesn't require a deploy.
 *
 * The client flow below collects NO PHI — no name, no date of birth, no health
 * card number. It produces a self-reported symptom profile only. Identity is
 * attached on the pharmacist's authenticated desk, reading the physical health
 * card, because the EO Notice requires the name exactly as it appears there and
 * a patient thumb-typing it on a phone is a worse source. This also means the
 * patient's device never holds PHI, which is the cheapest possible answer to
 * the PHIPA question. (A pharmacy id in the URL is not PHI.)
 */
export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ pharmacy?: string }>;
}) {
  const { pharmacy: pharmacyParam } = await searchParams;
  const pharmacy = await resolvePharmacy(pharmacyParam);

  if (!pharmacy) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#101418",
          color: "#f4f1ea",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "26rem" }}>
          <h1
            style={{
              fontSize: "clamp(1.4rem, 6vw, 1.6rem)",
              marginBottom: "0.75rem",
              color: "#f4f1ea",
            }}
          >
            Scan your pharmacy&apos;s code to get started
          </h1>
          <p style={{ opacity: 0.75, fontSize: "1rem", lineHeight: 1.5, color: "#f4f1ea" }}>
            This assessment needs to know which pharmacy you&apos;re visiting.
            Scan the QR code posted in the pharmacy — or ask the pharmacist for
            the link — and you&apos;ll be brought right back here.
          </p>
        </div>
      </div>
    );
  }

  const claimMaximums = getClaimMaximums();

  return <TriageFlow claimMaximums={claimMaximums} pharmacyId={pharmacy.id} />;
}
