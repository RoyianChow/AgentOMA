import { describe, expect, it } from "vitest";

import { virtualCareFixture, VIRTUAL_CARE_FIXTURE_NOW_UTC } from "../fixtures";
import { evaluateAssessmentLink, evaluateClaimAction } from "../guards";

function req(actorRef: string, claimedRole: string) {
  return { actorRef, claimedRole, trustedNowUtc: VIRTUAL_CARE_FIXTURE_NOW_UTC };
}

function pharmacistReq(world: { pharmacistActorRef: string | null }) {
  return req(world.pharmacistActorRef ?? "SYNTH-NONE", "pharmacist");
}

describe("assessment and claim integration guards", () => {
  it("links a valid, fully-completed assessment", () => {
    const world = virtualCareFixture("claim_guard_failure")!; // pharmacistCompletionAtUtc is set here
    expect(evaluateAssessmentLink(world, pharmacistReq(world)).allowed).toBe(true);
  });

  it("denies linking for the wrong patient, pharmacy, or assessment (wrong audience/tenant)", () => {
    const world = virtualCareFixture("wrong_patient_join")!;
    expect(evaluateAssessmentLink(world, pharmacistReq(world)).allowed).toBe(false);
    const wrongPharmacy = virtualCareFixture("wrong_pharmacy_join")!;
    expect(evaluateAssessmentLink(wrongPharmacy, pharmacistReq(wrongPharmacy)).allowed).toBe(false);
  });

  it("denies linking on missing consent, location confirmation, or identity confirmation", () => {
    const consentPending = virtualCareFixture("consent_pending")!;
    expect(
      evaluateAssessmentLink({ ...consentPending, pharmacistCompletionAtUtc: consentPending.createdAtUtc }, pharmacistReq(consentPending)),
    ).toEqual({ allowed: false, denialReason: "consent_not_current" });

    const blockedLocation = virtualCareFixture("location_outside_approved_jurisdiction")!;
    expect(
      evaluateAssessmentLink(
        { ...blockedLocation, pharmacistCompletionAtUtc: blockedLocation.createdAtUtc },
        pharmacistReq(blockedLocation),
      ),
    ).toEqual({ allowed: false, denialReason: "cross_jurisdictional_block" });

    const failedIdentity = virtualCareFixture("task05_unavailable")!;
    expect(
      evaluateAssessmentLink(
        { ...failedIdentity, pharmacistCompletionAtUtc: failedIdentity.createdAtUtc },
        pharmacistReq(failedIdentity),
      ),
    ).toEqual({ allowed: false, denialReason: "identity_not_current" });
  });

  it("denies linking without a current pharmacist suitability decision", () => {
    const world = virtualCareFixture("assessment_guard_failure")!;
    expect(evaluateAssessmentLink(world, pharmacistReq(world))).toEqual({
      allowed: false,
      denialReason: "suitability_not_current",
    });
  });

  it("denies linking on an expired or interrupted visit", () => {
    const expired = virtualCareFixture("reconnect_after_expiry")!;
    expect(evaluateAssessmentLink(expired, pharmacistReq(expired)).allowed).toBe(false);
    const interrupted = virtualCareFixture("disconnect_during_clinical_interaction")!;
    expect(evaluateAssessmentLink(interrupted, pharmacistReq(interrupted)).allowed).toBe(false);
  });

  it("denies linking after a technical failure or an approved fallback that hasn't completed", () => {
    const failure = virtualCareFixture("technical_failure_without_fallback")!;
    expect(evaluateAssessmentLink(failure, pharmacistReq(failure)).allowed).toBe(false);
    const fallback = virtualCareFixture("technical_failure_with_approved_fallback")!;
    expect(evaluateAssessmentLink(fallback, pharmacistReq(fallback)).allowed).toBe(false);
  });

  it("denies linking after consent withdrawal or delegate revocation", () => {
    const withdrawn = virtualCareFixture("consent_withdrawn_during_visit")!;
    expect(
      evaluateAssessmentLink({ ...withdrawn, pharmacistCompletionAtUtc: withdrawn.createdAtUtc }, pharmacistReq(withdrawn)),
    ).toEqual({ allowed: false, denialReason: "consent_not_current" });

    const revoked = virtualCareFixture("revoked_delegate")!;
    // Delegate revocation doesn't touch the patient's own consent/identity state,
    // but the assessment link guard is pharmacist-authored and unaffected by a
    // third party's revoked grant — it must still require the visit's own guards.
    expect(evaluateAssessmentLink(revoked, pharmacistReq(revoked)).allowed).toBe(false);
  });

  it("re-evaluates fresh at every checkpoint — an authorization change between start and write is caught", () => {
    const world = virtualCareFixture("claim_guard_failure")!;
    const linkedOk = evaluateAssessmentLink(world, pharmacistReq(world));
    expect(linkedOk.allowed).toBe(true);

    const suitabilityChangedMidway = {
      ...world,
      suitability: { state: "UNSUITABLE" as const, modality: world.approvedModality!, reasonCode: "reassessed" },
    };
    expect(evaluateAssessmentLink(suitabilityChangedMidway, pharmacistReq(world))).toEqual({
      allowed: false,
      denialReason: "suitability_not_current",
    });
  });

  it("re-checks guards again before assessment completion, not just at link time", () => {
    const world = virtualCareFixture("claim_guard_failure")!;
    const consentWithdrawnBeforeCompletion = {
      ...world,
      consent: { ...world.consent, withdrawnAtUtc: world.createdAtUtc },
    };
    expect(evaluateAssessmentLink(consentWithdrawnBeforeCompletion, pharmacistReq(world))).toEqual({
      allowed: false,
      denialReason: "consent_not_current",
    });
  });

  it("re-checks guards again before the claim action, not just before assessment completion", () => {
    const world = virtualCareFixture("claim_guard_failure")!;
    expect(evaluateClaimAction(world, pharmacistReq(world))).toEqual({
      allowed: false,
      denialReason: "visit_not_completed",
    });
    const releaseGateRevokedLater = { ...world, serviceAvailability: { ...world.serviceAvailability, task11ReleaseGateVerified: false } };
    expect(evaluateClaimAction(releaseGateRevokedLater, pharmacistReq(world)).allowed).toBe(false);
  });

  it("never lets a vendor completion webhook substitute for pharmacist completion", () => {
    const world = virtualCareFixture("vendor_meeting_ended_event")!;
    expect(world.pharmacistCompletionAtUtc).toBeNull();
    expect(evaluateAssessmentLink(world, pharmacistReq(world)).allowed).toBe(false);
  });

  it("never lets a patient-end event substitute for pharmacist completion", () => {
    const world = virtualCareFixture("patient_leaves_voluntarily")!;
    expect(world.pharmacistCompletionAtUtc).toBeNull();
    expect(evaluateAssessmentLink(world, pharmacistReq(world)).allowed).toBe(false);
  });

  it("only the pharmacist's explicit completion opens the assessment link", () => {
    const world = virtualCareFixture("claim_guard_failure")!;
    expect(world.pharmacistCompletionAtUtc).not.toBeNull();
    expect(world.pharmacistCompletionActorRef).toBe(world.pharmacistActorRef);
    expect(evaluateAssessmentLink(world, pharmacistReq(world)).allowed).toBe(true);
  });
});
