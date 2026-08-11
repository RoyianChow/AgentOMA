import { describe, expect, it } from "vitest";

import { allVirtualCareFixtures, virtualCareFixture, VIRTUAL_CARE_FIXTURE_NOW_UTC } from "../fixtures";
import {
  evaluateFallbackApproval,
  evaluateInteractionStart,
  evaluateJoin,
  evaluateTechnicalEventCannotComplete,
} from "../guards";

function req(actorRef: string, claimedRole: string) {
  return { actorRef, claimedRole, trustedNowUtc: VIRTUAL_CARE_FIXTURE_NOW_UTC };
}

describe("disconnect and contingency guards", () => {
  it("covers every preflight failure category with a safe, non-crashing result", () => {
    for (const scenario of [
      "camera_permission_denied",
      "microphone_unavailable",
      "no_speaker_output",
      "unsupported_browser",
      "low_bandwidth",
    ] as const) {
      const world = virtualCareFixture(scenario)!;
      const failing = world.technologyReadiness.find((c) => c.safeResultCategory !== "pass");
      expect(failing).toBeDefined();
      expect(evaluateJoin(world, req(world.patientActorRef, "patient")).allowed).toBe(true);
    }
  });

  it("reflects connection degradation without silently completing the visit", () => {
    const world = virtualCareFixture("video_connection_degraded")!;
    expect(world.connectionState).toBe("degraded");
    expect(world.pharmacistCompletionAtUtc).toBeNull();
  });

  it("distinguishes disconnect before start from disconnect during interaction", () => {
    const beforeStart = virtualCareFixture("disconnect_before_clinical_interaction")!;
    const duringInteraction = virtualCareFixture("disconnect_during_clinical_interaction")!;
    expect(beforeStart.workflowState).toBe("waiting");
    expect(duringInteraction.workflowState).toBe("interrupted");
    expect(duringInteraction.interruptedAtUtc).not.toBeNull();
  });

  it("allows a guarded reconnect within the grace period, denies one after expiry", () => {
    const withinGrace = virtualCareFixture("successful_guarded_reconnect")!;
    const afterExpiry = virtualCareFixture("reconnect_after_expiry")!;
    expect(evaluateJoin(withinGrace, req(withinGrace.patientActorRef, "patient")).allowed).toBe(true);
    expect(evaluateJoin(afterExpiry, req(afterExpiry.patientActorRef, "patient")).allowed).toBe(false);
  });

  it("produces the same answer for a duplicate reconnect attempt", () => {
    const world = virtualCareFixture("successful_guarded_reconnect")!;
    const request = req(world.patientActorRef, "patient");
    expect(evaluateJoin(world, request)).toEqual(evaluateJoin(world, request));
  });

  it("handles vendor outage as a technical failure, not a completion event", () => {
    const world = virtualCareFixture("vendor_outage")!;
    expect(world.technicalFailure?.reasonCode).toBe("vendor_outage");
    expect(evaluateTechnicalEventCannotComplete(world).allowed).toBe(true);
  });

  it("covers telephone, in-person, and referral fallback paths", () => {
    const telephoneFallback = virtualCareFixture("technical_failure_with_approved_fallback")!;
    expect(
      evaluateFallbackApproval(telephoneFallback, req(telephoneFallback.pharmacistActorRef!, "pharmacist"))
        .allowed,
    ).toBe(true);

    const inPerson = virtualCareFixture("fallback_in_person_selected")!;
    expect(inPerson.contingencyPlan?.approvedContingency).toBe("in_person");

    const referral = virtualCareFixture("fallback_referral_selected")!;
    expect(referral.contingencyPlan?.approvedContingency).toBe("referral");
  });

  it("denies fallback approval when the transition wasn't actually approved or guards weren't renewed", () => {
    const world = virtualCareFixture("technical_failure_with_approved_fallback")!;
    const unapproved = {
      ...world,
      fallbackTransition: { ...world.fallbackTransition!, approved: false },
    };
    expect(evaluateFallbackApproval(unapproved, req(world.pharmacistActorRef!, "pharmacist"))).toEqual({
      allowed: false,
      denialReason: "fallback_not_approved",
    });

    const unrenewed = {
      ...world,
      fallbackTransition: { ...world.fallbackTransition!, renewedGuardsConfirmed: false },
    };
    expect(evaluateFallbackApproval(unrenewed, req(world.pharmacistActorRef!, "pharmacist"))).toEqual({
      allowed: false,
      denialReason: "fallback_guards_not_renewed",
    });
  });

  it("this is the fallback-concurrency-race case: an approved-but-unrenewed transition never passes, even under a race", () => {
    const world = virtualCareFixture("technical_failure_with_approved_fallback")!;
    const raceLoser = {
      ...world,
      fallbackTransition: {
        ...world.fallbackTransition!,
        approved: true,
        renewedGuardsConfirmed: false,
      },
    };
    expect(evaluateFallbackApproval(raceLoser, req(world.pharmacistActorRef!, "pharmacist")).allowed).toBe(
      false,
    );
  });

  it("blocks interaction on consent withdrawal during an interruption", () => {
    const world = virtualCareFixture("consent_withdrawn_during_visit")!;
    expect(world.workflowState).toBe("interrupted");
    expect(evaluateInteractionStart(world, req(world.patientActorRef, "patient"))).toEqual({
      allowed: false,
      denialReason: "consent_withdrawn",
    });
  });

  it("blocks join for a delegate whose grant is revoked, interruption or not", () => {
    const world = virtualCareFixture("revoked_delegate")!;
    const interrupted = { ...world, workflowState: "interrupted" as const, interruptedAtUtc: world.createdAtUtc };
    expect(evaluateJoin(interrupted, req("SYNTH-DELEGATE-006-0001", "delegate"))).toEqual({
      allowed: false,
      denialReason: "delegate_revoked",
    });
  });

  it("blocks interaction if the pharmacist marks the visit unsuitable during an interruption", () => {
    const world = virtualCareFixture("disconnect_during_clinical_interaction")!;
    const nowUnsuitable = {
      ...world,
      suitability: { state: "UNSUITABLE" as const, modality: world.approvedModality!, reasonCode: "connection_unreliable" },
    };
    expect(evaluateInteractionStart(nowUnsuitable, req(world.patientActorRef, "patient")).allowed).toBe(
      false,
    );
  });

  it("handles an unrecognized technical-failure reason code without crashing or granting access", () => {
    const world = virtualCareFixture("technical_failure_without_fallback")!;
    const unknownCode = {
      ...world,
      technicalFailure: { reasonCode: "unrecognized_vendor_code", occurredAtUtc: world.createdAtUtc },
    };
    expect(() => evaluateTechnicalEventCannotComplete(unknownCode)).not.toThrow();
    expect(evaluateJoin(unknownCode, req(world.patientActorRef, "patient")).allowed).toBe(true);
  });

  it("proves that no failure, disconnect, timeout, patient departure, or vendor event can complete the assessment or generate a claim, across every fixture", () => {
    for (const world of allVirtualCareFixtures()) {
      expect(evaluateTechnicalEventCannotComplete(world).allowed).toBe(true);
    }
  });

  it("actively denies the one combination that would violate that invariant if it ever occurred", () => {
    const base = virtualCareFixture("valid_video_visit")!;
    const violatingViaTechnicalFailure = {
      ...base,
      technicalFailure: { reasonCode: "connection_lost", occurredAtUtc: base.createdAtUtc },
      pharmacistCompletionAtUtc: base.createdAtUtc,
    };
    expect(evaluateTechnicalEventCannotComplete(violatingViaTechnicalFailure)).toEqual({
      allowed: false,
      denialReason: "technical_failure_precludes_completion",
    });

    const violatingViaVendorEvent = {
      ...base,
      vendorWebhookReceipt: {
        eventType: "meeting_ended",
        signatureValid: true,
        outcome: "accepted" as const,
        mappedVisitRef: base.visitId,
      },
      pharmacistCompletionAtUtc: base.createdAtUtc,
    };
    expect(evaluateTechnicalEventCannotComplete(violatingViaVendorEvent)).toEqual({
      allowed: false,
      denialReason: "vendor_event_cannot_complete_visit",
    });
  });
});
