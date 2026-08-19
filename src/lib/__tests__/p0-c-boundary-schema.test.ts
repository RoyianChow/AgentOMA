import { describe, expect, it } from "vitest";

import { externalSessionResponseSchema } from "../auth-session-schema";
import {
  assessmentCompletionBoundarySchema,
  computeTrailingWindow,
  hasUnresolvedExistingPrescriptionEvidence,
  patientIdentityBoundarySchema,
  reduceExistingRxBlocks,
  reduceSelfOrFamily,
} from "../p0-c-boundary-schema";
import {
  acceptInvitationSchema,
  issueInvitationActionSchema,
} from "../invitation-boundary-schema";
import {
  pharmacySettingsBoundarySchema,
  prescriberIdentitySettingsSchema,
} from "../settings-boundary-schema";

describe("P0-C patient identity boundary", () => {
  it("normalizes a valid Ontario health card at the server boundary", () => {
    const result = patientIdentityBoundarySchema.parse({
      firstName: " Test ",
      lastName: " Patient ",
      dob: "2000-02-29",
      identifierType: "ohip_health_number",
      healthNumber: "1234-567-890 ab",
      gender: "U",
    });

    expect(result).toMatchObject({
      firstName: "Test",
      lastName: "Patient",
      healthNumber: "1234567890AB",
      gender: "U",
    });
  });

  it("rejects malformed, letter-first, and incomplete OHIP payloads", () => {
    for (const healthNumber of [
      "AB1234567890",
      "123456789",
      "1234567890ABC",
    ]) {
      expect(
        patientIdentityBoundarySchema.safeParse({
          firstName: "Test",
          lastName: "Patient",
          dob: "2000-01-01",
          identifierType: "ohip_health_number",
          healthNumber,
          gender: "U",
        }).success,
      ).toBe(false);
    }
  });

  it("rejects missing names, impossible DOBs, and future DOBs", () => {
    for (const input of [
      { firstName: "", dob: "2000-01-01" },
      { firstName: "Test", dob: "1900-02-29" },
      { firstName: "Test", dob: "2999-01-01" },
    ]) {
      expect(
        patientIdentityBoundarySchema.safeParse({
          firstName: input.firstName,
          lastName: "Patient",
          dob: input.dob,
          identifierType: "ohip_health_number",
          healthNumber: "1234567890",
          gender: "U",
        }).success,
      ).toBe(false);
    }
  });

  it.each(["odb_mccss", "odb_hccss"] as const)(
    "accepts a bounded %s identifier without inventing an official regex",
    (identifierType) => {
      expect(
        patientIdentityBoundarySchema.parse({
          firstName: "Test",
          lastName: "Patient",
          dob: "2000-01-01",
          identifierType,
          healthNumber: " Recipient / 42-A ",
          gender: "U",
        }).healthNumber,
      ).toBe("Recipient / 42-A");
    },
  );

  it("rejects control characters and overlong ODB identifiers", () => {
    for (const healthNumber of ["ABC\n123", "A".repeat(65)]) {
      expect(
        patientIdentityBoundarySchema.safeParse({
          firstName: "Test",
          lastName: "Patient",
          dob: "2000-01-01",
          identifierType: "odb_mccss",
          healthNumber,
          gender: "U",
        }).success,
      ).toBe(false);
    }
  });
});

describe("P0-C assessment boundary and reductions", () => {
  const valid = {
    patientId: "10000000-0000-4000-8000-000000000001",
    intakeSessionId: "10000000-0000-4000-8000-000000000002",
    modality: "in_person",
    outcome: "rx_issued",
    serviceDate: new Date("2026-07-25T00:00:00.000Z"),
    clinicalRecord: {},
    isOdbRecipient: true,
    eligibilityDocument: {
      identifierType: "ohip_health_number",
      identifierIssuer: "Ontario",
      documentInspectedAttestation: true,
    },
    selfOrFamily: "not_self_or_family",
    sameAilmentPrescription: "none",
    verificationConsultation: "not_required",
    clinicalViewer: {
      source: "ConnectingOntario",
      attestation: true,
      maximumState: "not_confirmed_met",
    },
  } as const;

  it("requires every authoritative P0-C fact", () => {
    expect(assessmentCompletionBoundarySchema.safeParse(valid).success).toBe(
      true,
    );
    expect(
      assessmentCompletionBoundarySchema.safeParse({
        ...valid,
        eligibilityDocument: undefined,
      }).success,
    ).toBe(false);
  });

  it("rejects the retired orientation-override input at the strict boundary", () => {
    expect(
      assessmentCompletionBoundarySchema.safeParse({
        ...valid,
        orientationOverrideReason: "No bypass is accepted",
      }).success,
    ).toBe(false);
  });

  it("requires document inspection and a viewer attestation", () => {
    expect(
      assessmentCompletionBoundarySchema.safeParse({
        ...valid,
        eligibilityDocument: {
          ...valid.eligibilityDocument,
          documentInspectedAttestation: false,
        },
      }).success,
    ).toBe(false);
    expect(
      assessmentCompletionBoundarySchema.safeParse({
        ...valid,
        clinicalViewer: {
          ...valid.clinicalViewer,
          attestation: false,
        },
      }).success,
    ).toBe(false);
  });

  it("reduces structured self/family facts authoritatively", () => {
    expect(reduceSelfOrFamily("not_self_or_family")).toBe(false);
    expect(reduceSelfOrFamily("self")).toBe(true);
    expect(reduceSelfOrFamily("family")).toBe(true);
  });

  it("reduces only the approved existing-prescription states to a block", () => {
    for (const sameAilmentPrescription of [
      "fillable",
      "adaptable",
      "extendable",
    ] as const) {
      expect(
        reduceExistingRxBlocks({
          sameAilmentPrescription,
          verificationConsultation: "not_required",
        }),
      ).toBe(true);
    }
    expect(
      reduceExistingRxBlocks({
        sameAilmentPrescription: "none",
        verificationConsultation: "required_prescriber_reachable",
      }),
    ).toBe(true);
    expect(
      reduceExistingRxBlocks({
        sameAilmentPrescription: "none",
        verificationConsultation: "required_prescriber_unreachable",
      }),
    ).toBe(false);
  });

  it("identifies unresolved facts without representing them as exclusions", () => {
    expect(
      hasUnresolvedExistingPrescriptionEvidence({
        sameAilmentPrescription: "unresolved",
        verificationConsultation: "not_required",
      }),
    ).toBe(true);
    expect(
      reduceExistingRxBlocks({
        sameAilmentPrescription: "unresolved",
        verificationConsultation: "not_required",
      }),
    ).toBe(false);
  });

  it("computes the exact exclusive trailing-365-day window", () => {
    expect(computeTrailingWindow(new Date("2026-07-16T23:59:59.000Z"))).toEqual(
      {
        start: "2025-07-16",
        end: "2026-07-16",
      },
    );
  });
});

describe("P0-C invitation, settings, and external boundaries", () => {
  it("normalizes invitations and rejects malformed inputs", () => {
    expect(
      issueInvitationActionSchema.parse({
        email: "PHARMACIST@EXAMPLE.COM",
        role: "pharmacist",
      }).email,
    ).toBe("pharmacist@example.com");
    expect(
      acceptInvitationSchema.safeParse({
        token: "",
        name: "Test",
        password: "a sufficiently long password",
      }).success,
    ).toBe(false);
  });

  it("preserves the PHR888 as-of-right settings path", () => {
    expect(
      prescriberIdentitySettingsSchema.safeParse({
        ocpNumber: "",
        isAsOfRight: true,
      }).success,
    ).toBe(true);
    expect(
      prescriberIdentitySettingsSchema.safeParse({
        ocpNumber: "",
        isAsOfRight: false,
      }).success,
    ).toBe(false);
  });

  it("requires existing pharmacy settings fields", () => {
    expect(
      pharmacySettingsBoundarySchema.safeParse({
        storeName: "Test Pharmacy",
        hnsAccountId: "",
        odbFeeTier: "test-tier",
        addressLine1: "",
        addressLine2: "",
        city: "Toronto",
        province: "ON",
        postalCode: "M5V 1A1",
        phone: "416-555-0100",
      }).success,
    ).toBe(false);
  });

  it("fails closed on a malformed external session response", () => {
    expect(
      externalSessionResponseSchema.safeParse({
        user: {
          id: "not-a-uuid",
          name: "Test",
          email: "test@example.com",
        },
      }).success,
    ).toBe(false);
  });
});
