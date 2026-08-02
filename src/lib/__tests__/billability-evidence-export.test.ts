import { describe, expect, it } from "vitest";

import {
  billabilityEvidenceDisplaySections,
  serializeBillabilityEvidence,
  type BillabilityEvidenceSource,
} from "@/lib/billability-evidence-export";

const SOURCE: BillabilityEvidenceSource = {
  id: "00000000-0000-4000-8000-000000000201",
  assessmentId: "00000000-0000-4000-8000-000000000202",
  pharmacyId: "00000000-0000-4000-8000-000000000000",
  evidenceVersion: 1,
  patientSelfReportStatus: "no",
  patientSelfReportApproximateCount: null,
  patientSelfReportLocation: null,
  platformAssessmentCount: 0,
  trailingWindowStart: "2025-07-16",
  trailingWindowEnd: "2026-07-16",
  viewerSource: "ConnectingOntario",
  viewerAttestation: true,
  viewerAttestedAt: new Date("2026-07-16T14:00:00.000Z"),
  viewerPharmacistId: "00000000-0000-4000-8000-000000000203",
  maximumState: "not_confirmed_met",
  selfOrFamily: "not_self_or_family",
  sameAilmentPrescription: "none",
  verificationConsultation: "not_required",
  identifierType: "odb_mccss",
  identifierIssuer: "Synthetic eligibility fixture",
  identifierNumber: "SYNTHETIC-ELIGIBILITY-001",
  healthCardVersionCode: null,
  nameExactlyAsDisplayed: "Synthetic Patient",
  dateOfBirth: "1980-01-01",
  documentInspectedAttestation: true,
  verifyingPharmacistId: "00000000-0000-4000-8000-000000000203",
  verifiedAt: new Date("2026-07-16T14:01:00.000Z"),
  isOdbRecipient: true,
  gender: null,
  createdAt: new Date("2026-07-16T14:02:00.000Z"),
};

describe("billability-evidence export serialization", () => {
  it("copies every authoritative field without deriving or defaulting values", () => {
    expect(serializeBillabilityEvidence(SOURCE)).toEqual({
      ...SOURCE,
      viewerAttestedAt: "2026-07-16T14:00:00.000Z",
      verifiedAt: "2026-07-16T14:01:00.000Z",
      createdAt: "2026-07-16T14:02:00.000Z",
    });
  });

  it("preserves absent optional evidence as null instead of fabricating it", () => {
    const serialized = serializeBillabilityEvidence(SOURCE);

    expect(serialized.patientSelfReportApproximateCount).toBeNull();
    expect(serialized.patientSelfReportLocation).toBeNull();
    expect(serialized.healthCardVersionCode).toBeNull();
    expect(serialized.gender).toBeNull();
  });

  it("builds PDF and record-view rows only from the persisted evidence", () => {
    const serialized = serializeBillabilityEvidence(SOURCE);
    const sections = billabilityEvidenceDisplaySections(serialized);
    const rows = sections.flatMap((section) => section.rows);

    expect(sections.map((section) => section.title)).toEqual([
      "Public-service identity evidence",
      "Claim-history evidence (advisory)",
      "Billability gates recorded at completion",
      "Evidence provenance",
    ]);
    expect(rows).toContainEqual([
      "Identifier number",
      "SYNTHETIC-ELIGIBILITY-001",
    ]);
    expect(rows).toContainEqual(["Platform assessment count", "0"]);
    expect(rows).toContainEqual([
      "Platform trailing window",
      "2025-07-16 (exclusive) to 2026-07-16 (exclusive)",
    ]);
    expect(rows).toContainEqual([
      "Existing same-ailment prescription",
      "none",
    ]);
    expect(JSON.stringify(sections)).not.toMatch(/\b(?:PIN|fee|SSC)\b/i);
  });
});
