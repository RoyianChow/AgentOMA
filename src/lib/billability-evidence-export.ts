import type { assessmentBillabilityEvidence } from "@/lib/db/schema";

/**
 * The authoritative, immutable completion evidence as stored by migration
 * 0018. Export code serializes this row; it must never infer missing evidence
 * or recompute eligibility, claim maximums, PINs, fees, or claim state.
 */
export type BillabilityEvidenceSource =
  typeof assessmentBillabilityEvidence.$inferSelect;

export type BillabilityEvidenceRecord = Omit<
  BillabilityEvidenceSource,
  "viewerAttestedAt" | "verifiedAt" | "createdAt"
> & {
  viewerAttestedAt: string;
  verifiedAt: string;
  createdAt: string;
};

export function serializeBillabilityEvidence(
  source: BillabilityEvidenceSource,
): BillabilityEvidenceRecord {
  return {
    id: source.id,
    assessmentId: source.assessmentId,
    pharmacyId: source.pharmacyId,
    evidenceVersion: source.evidenceVersion,
    patientSelfReportStatus: source.patientSelfReportStatus,
    patientSelfReportApproximateCount:
      source.patientSelfReportApproximateCount,
    patientSelfReportLocation: source.patientSelfReportLocation,
    platformAssessmentCount: source.platformAssessmentCount,
    trailingWindowStart: source.trailingWindowStart,
    trailingWindowEnd: source.trailingWindowEnd,
    viewerSource: source.viewerSource,
    viewerAttestation: source.viewerAttestation,
    viewerAttestedAt: source.viewerAttestedAt.toISOString(),
    viewerPharmacistId: source.viewerPharmacistId,
    maximumState: source.maximumState,
    selfOrFamily: source.selfOrFamily,
    sameAilmentPrescription: source.sameAilmentPrescription,
    verificationConsultation: source.verificationConsultation,
    identifierType: source.identifierType,
    identifierIssuer: source.identifierIssuer,
    identifierNumber: source.identifierNumber,
    healthCardVersionCode: source.healthCardVersionCode,
    nameExactlyAsDisplayed: source.nameExactlyAsDisplayed,
    dateOfBirth: source.dateOfBirth,
    documentInspectedAttestation: source.documentInspectedAttestation,
    verifyingPharmacistId: source.verifyingPharmacistId,
    verifiedAt: source.verifiedAt.toISOString(),
    isOdbRecipient: source.isOdbRecipient,
    gender: source.gender,
    createdAt: source.createdAt.toISOString(),
  };
}

export type BillabilityEvidenceDisplaySection = {
  title: string;
  rows: Array<[label: string, value: string]>;
};

function codeLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

/**
 * Shared server-rendered presentation contract for the record view and PDF.
 * Values come directly from the immutable row. Human-readable labels do not
 * change, complete, or interpret the underlying evidence.
 */
export function billabilityEvidenceDisplaySections(
  evidence: BillabilityEvidenceRecord,
): BillabilityEvidenceDisplaySection[] {
  return [
    {
      title: "Public-service identity evidence",
      rows: [
        ["Identifier type", codeLabel(evidence.identifierType)],
        ["Issuer", evidence.identifierIssuer],
        ["Identifier number", evidence.identifierNumber],
        ["Health-card version", evidence.healthCardVersionCode ?? "Not applicable"],
        ["Name exactly as displayed", evidence.nameExactlyAsDisplayed],
        ["Date of birth", evidence.dateOfBirth],
        ["ODB recipient", yesNo(evidence.isOdbRecipient)],
        ["Gender for non-ODB claim", evidence.gender ?? "Not applicable"],
        ["Document inspected", yesNo(evidence.documentInspectedAttestation)],
        ["Verified at", evidence.verifiedAt],
        ["Verifying pharmacist user ID", evidence.verifyingPharmacistId],
      ],
    },
    {
      title: "Claim-history evidence (advisory)",
      rows: [
        ["Patient self-report", codeLabel(evidence.patientSelfReportStatus)],
        [
          "Approximate prior count",
          evidence.patientSelfReportApproximateCount === null
            ? "Not provided"
            : String(evidence.patientSelfReportApproximateCount),
        ],
        ["Prior location", evidence.patientSelfReportLocation ?? "Not provided"],
        ["Platform assessment count", String(evidence.platformAssessmentCount)],
        [
          "Platform trailing window",
          `${evidence.trailingWindowStart} (exclusive) to ${evidence.trailingWindowEnd} (exclusive)`,
        ],
        ["Clinical viewer", evidence.viewerSource],
        ["Viewer check attested", yesNo(evidence.viewerAttestation)],
        ["Viewer attested at", evidence.viewerAttestedAt],
        ["Viewer pharmacist user ID", evidence.viewerPharmacistId],
        ["Maximum state", codeLabel(evidence.maximumState)],
      ],
    },
    {
      title: "Billability gates recorded at completion",
      rows: [
        ["Self / family check", codeLabel(evidence.selfOrFamily)],
        [
          "Existing same-ailment prescription",
          codeLabel(evidence.sameAilmentPrescription),
        ],
        [
          "Verification / consultation",
          codeLabel(evidence.verificationConsultation),
        ],
      ],
    },
    {
      title: "Evidence provenance",
      rows: [
        ["Evidence record ID", evidence.id],
        ["Assessment ID", evidence.assessmentId],
        ["Pharmacy ID", evidence.pharmacyId],
        ["Evidence version", String(evidence.evidenceVersion)],
        ["Recorded at", evidence.createdAt],
      ],
    },
  ];
}
