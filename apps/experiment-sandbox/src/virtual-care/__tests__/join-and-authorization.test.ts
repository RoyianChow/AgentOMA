import { describe, expect, it } from "vitest";

import { virtualCareFixture, VIRTUAL_CARE_FIXTURE_NOW_UTC } from "../fixtures";
import {
  evaluateAssessmentLink,
  evaluateClaimAction,
  evaluateFallbackApproval,
  evaluateInteractionStart,
  evaluateJoin,
  evaluateParticipantAdmission,
  evaluateSecureMessageSend,
  evaluateSuitabilityDecision,
} from "../guards";

const world = virtualCareFixture("valid_video_visit")!;

function request(overrides: Record<string, unknown> = {}) {
  return {
    actorRef: world.patientActorRef,
    claimedRole: "patient",
    trustedNowUtc: VIRTUAL_CARE_FIXTURE_NOW_UTC,
    ...overrides,
  };
}

describe("join and authorization guards", () => {
  it("denies an unauthenticated (malformed/empty) join attempt", () => {
    expect(evaluateJoin(world, {}).allowed).toBe(false);
    expect(evaluateJoin(world, undefined).allowed).toBe(false);
    expect(evaluateJoin(world, null).allowed).toBe(false);
  });

  it("denies an expired join credential", () => {
    const expired = virtualCareFixture("expired_join")!;
    expect(evaluateJoin(expired, request({ actorRef: expired.patientActorRef }))).toEqual({
      allowed: false,
      denialReason: "expired_credential",
    });
  });

  it("denies a revoked delegate session", () => {
    const revoked = virtualCareFixture("revoked_delegate")!;
    const result = evaluateJoin(
      revoked,
      request({ actorRef: "SYNTH-DELEGATE-006-0001", claimedRole: "delegate" }),
    );
    expect(result).toEqual({ allowed: false, denialReason: "delegate_revoked" });
  });

  it("denies a wrong-patient join", () => {
    const wrongPatient = virtualCareFixture("wrong_patient_join")!;
    expect(evaluateJoin(wrongPatient, request({ actorRef: wrongPatient.patientActorRef }))).toEqual({
      allowed: false,
      denialReason: "wrong_patient",
    });
  });

  it("denies a wrong-pharmacy (wrong-tenant) actor", () => {
    const wrongPharmacy = virtualCareFixture("wrong_pharmacy_join")!;
    expect(
      evaluateJoin(wrongPharmacy, request({ actorRef: wrongPharmacy.patientActorRef })),
    ).toEqual({ allowed: false, denialReason: "wrong_pharmacy" });
  });

  it("never lets a patient session act as pharmacist", () => {
    const result = evaluateJoin(
      world,
      request({ actorRef: world.patientActorRef, claimedRole: "pharmacist" }),
    );
    expect(result).toEqual({ allowed: false, denialReason: "wrong_audience" });
    expect(evaluateSuitabilityDecision(world, request({ claimedRole: "pharmacist" })).allowed).toBe(
      false,
    );
  });

  it("never lets a pharmacist session act as patient", () => {
    const result = evaluateJoin(
      world,
      request({ actorRef: world.pharmacistActorRef!, claimedRole: "patient" }),
    );
    expect(result).toEqual({ allowed: false, denialReason: "wrong_patient" });
  });

  it("grants no authority from a forwarded link", () => {
    const forwarded = virtualCareFixture("forwarded_join")!;
    expect(evaluateJoin(forwarded, request({ actorRef: forwarded.patientActorRef }))).toEqual({
      allowed: false,
      denialReason: "forwarded_credential",
    });
  });

  it("grants no authority merely from possessing the visit/room identifier", () => {
    // Presenting the visit id itself as if it were an actor reference must
    // not be treated as identity — it simply fails the patient-match check.
    const result = evaluateJoin(world, request({ actorRef: world.visitId }));
    expect(result.allowed).toBe(false);
  });

  it("denies a replayed join", () => {
    const replayed = virtualCareFixture("replayed_join")!;
    expect(evaluateJoin(replayed, request({ actorRef: replayed.patientActorRef }))).toEqual({
      allowed: false,
      denialReason: "replayed_credential",
    });
  });

  it("denies a stale rejoin against a terminal visit", () => {
    const expired = virtualCareFixture("reconnect_after_expiry")!;
    expect(evaluateJoin(expired, request({ actorRef: expired.patientActorRef }))).toEqual({
      allowed: false,
      denialReason: "visit_terminal",
    });
  });

  it("never lets a removed participant rejoin", () => {
    const removed = virtualCareFixture("participant_removed")!;
    const result = evaluateJoin(
      removed,
      request({ actorRef: "SYNTH-SUPPORT-006-0001", claimedRole: "support_person" }),
    );
    expect(result).toEqual({ allowed: false, denialReason: "participant_removed" });
  });

  it("denies a delegate with expired scope", () => {
    const expiredDelegate = virtualCareFixture("expired_delegate")!;
    const result = evaluateJoin(
      expiredDelegate,
      request({ actorRef: "SYNTH-DELEGATE-006-0001", claimedRole: "delegate" }),
    );
    expect(result).toEqual({ allowed: false, denialReason: "delegate_expired" });
  });

  it("ignores a client-supplied actor value that doesn't match server state", () => {
    const result = evaluateJoin(world, request({ actorRef: "SYNTH-CLIENT-SUPPLIED-FAKE" }));
    expect(result).toEqual({ allowed: false, denialReason: "wrong_patient" });
  });

  it("rejects a request carrying unrecognized extra fields rather than silently accepting them", () => {
    const result = evaluateJoin(
      world,
      request({ pharmacyId: "SYNTH-PHARMACY-TASK06-OTHER", role: "admin" }),
    );
    expect(result.allowed).toBe(false);
  });

  it("fails closed on an unknown participant role", () => {
    const result = evaluateJoin(world, request({ claimedRole: "system_administrator" }));
    expect(result).toEqual({ allowed: false, denialReason: "malformed_request" });
  });

  it("denies by default on every protected guard when given no facts at all", () => {
    const guards = [
      evaluateJoin,
      evaluateInteractionStart,
      evaluateParticipantAdmission,
      evaluateSuitabilityDecision,
      evaluateFallbackApproval,
      evaluateSecureMessageSend,
      evaluateAssessmentLink,
      evaluateClaimAction,
    ];
    for (const guard of guards) {
      expect(guard(world, {}).allowed).toBe(false);
    }
  });
});
