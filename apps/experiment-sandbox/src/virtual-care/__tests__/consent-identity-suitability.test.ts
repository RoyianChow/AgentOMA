import { describe, expect, it } from "vitest";

import { virtualCareFixture, VIRTUAL_CARE_FIXTURE_NOW_UTC } from "../fixtures";
import { evaluateInteractionStart, evaluateSecureMessageSend, evaluateSuitabilityDecision } from "../guards";

function req(actorRef: string, claimedRole: string) {
  return { actorRef, claimedRole, trustedNowUtc: VIRTUAL_CARE_FIXTURE_NOW_UTC };
}

describe("consent, identity, location, and suitability guards", () => {
  it("blocks clinical interaction while identity is unconfirmed", () => {
    const world = virtualCareFixture("task05_unavailable")!;
    expect(world.identityLocation.identityOutcome).toBe("failed");
    expect(evaluateInteractionStart(world, req(world.patientActorRef, "patient")).allowed).toBe(false);
  });

  it("blocks clinical interaction while location is outside the approved jurisdiction", () => {
    const world = virtualCareFixture("location_outside_approved_jurisdiction")!;
    expect(
      evaluateInteractionStart(world, req(world.patientActorRef, "patient")),
    ).toEqual({ allowed: false, denialReason: "cross_jurisdictional_block" });
  });

  it("blocks clinical interaction while consent is pending", () => {
    const world = virtualCareFixture("consent_pending")!;
    expect(
      evaluateInteractionStart(world, req(world.patientActorRef, "patient")),
    ).toEqual({ allowed: false, denialReason: "consent_not_granted" });
  });

  it("allows clinical interaction once consent is granted and every other gate passes", () => {
    const world = virtualCareFixture("valid_video_visit")!;
    expect(evaluateInteractionStart(world, req(world.patientActorRef, "patient")).allowed).toBe(true);
  });

  it("blocks interaction on withdrawn consent, before or during the visit", () => {
    for (const scenario of ["consent_withdrawn_before_visit", "consent_withdrawn_during_visit"] as const) {
      const world = virtualCareFixture(scenario)!;
      expect(
        evaluateInteractionStart(world, req(world.patientActorRef, "patient")),
      ).toEqual({ allowed: false, denialReason: "consent_withdrawn" });
    }
  });

  it("treats a modality mismatch between consent and the approved modality as stale consent", () => {
    const world = virtualCareFixture("valid_video_visit")!;
    const staleConsentWorld = {
      ...world,
      consent: { ...world.consent, modality: "telephone" as const },
    };
    expect(evaluateInteractionStart(staleConsentWorld, req(world.patientActorRef, "patient"))).toEqual({
      allowed: false,
      denialReason: "consent_wrong_modality",
    });
  });

  it("requires participant-scoped consent for messaging, independent of the visit consent", () => {
    const world = virtualCareFixture("valid_secure_message_thread")!;
    expect(evaluateSecureMessageSend(world, req(world.patientActorRef, "patient")).allowed).toBe(true);
    const wrongMessagingConsent = { ...world, consent: { ...world.consent, modality: "video" as const } };
    expect(evaluateSecureMessageSend(wrongMessagingConsent, req(world.patientActorRef, "patient"))).toEqual({
      allowed: false,
      denialReason: "consent_wrong_modality",
    });
  });

  it("blocks interaction while privacy confirmation is incomplete", () => {
    const world = virtualCareFixture("privacy_confirmation_incomplete")!;
    expect(
      evaluateInteractionStart(world, req(world.patientActorRef, "patient")),
    ).toEqual({ allowed: false, denialReason: "privacy_not_confirmed" });
  });

  it("covers every suitability state's effect on clinical interaction", () => {
    const cases: Array<[string, boolean]> = [
      ["suitability_video_suitable", true],
      ["suitability_video_suitable_with_limitations", true],
      ["suitability_video_unsuitable", false],
      ["suitability_telephone_unsuitable", false],
    ];
    for (const [scenario, shouldStartAllowed] of cases) {
      const world = virtualCareFixture(scenario)!;
      const result = evaluateInteractionStart(world, req(world.patientActorRef, "patient"));
      expect(result.allowed).toBe(shouldStartAllowed);
    }
  });

  it("treats reassessment-required suitability as not current", () => {
    const world = virtualCareFixture("assessment_guard_failure")!;
    expect(world.suitability.state).toBe("REASSESSMENT_REQUIRED");
    expect(evaluateInteractionStart(world, req(world.patientActorRef, "patient")).allowed).toBe(false);
  });

  it("never lets anyone but the assigned pharmacist set a suitability decision", () => {
    const world = virtualCareFixture("valid_video_visit")!;
    expect(evaluateSuitabilityDecision(world, req(world.pharmacistActorRef!, "pharmacist")).allowed).toBe(
      true,
    );
    expect(evaluateSuitabilityDecision(world, req(world.patientActorRef, "patient")).allowed).toBe(false);
    expect(
      evaluateSuitabilityDecision(world, req("SYNTH-DELEGATE-006-0001", "delegate")).allowed,
    ).toBe(false);
  });

  it("blocks clinical interaction until every applicable gate passes, not just one", () => {
    const world = virtualCareFixture("valid_video_visit")!;
    const brokenOnOneGateOnly = {
      ...world,
      privacyConfirmation: { confirmed: false },
    };
    expect(evaluateInteractionStart(brokenOnOneGateOnly, req(world.patientActorRef, "patient"))).toEqual({
      allowed: false,
      denialReason: "privacy_not_confirmed",
    });
  });

  it("blocks secure-message release until every applicable gate passes", () => {
    const world = virtualCareFixture("valid_secure_message_thread")!;
    const withdrawn = {
      ...world,
      consent: { ...world.consent, withdrawnAtUtc: world.createdAtUtc },
    };
    expect(evaluateSecureMessageSend(withdrawn, req(world.patientActorRef, "patient"))).toEqual({
      allowed: false,
      denialReason: "consent_withdrawn",
    });
  });
});
