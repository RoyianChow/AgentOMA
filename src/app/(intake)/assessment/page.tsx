import TriageFlow from "./TriageFlow";
import { getClaimMaximums } from "@/config/ailment-reference";

/**
 * Patient-facing minor ailment intake.
 *
 * Server component. Its only job is to supply reference data (claim maximums)
 * to the client flow. It holds no PHI and reads no session.
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
 * the PHIPA question.
 */
export default function AssessmentPage() {
  const claimMaximums = getClaimMaximums();

  return <TriageFlow claimMaximums={claimMaximums} />;
}
