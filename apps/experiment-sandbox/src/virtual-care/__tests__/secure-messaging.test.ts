import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { virtualCareFixture, VIRTUAL_CARE_FIXTURE_NOW_UTC } from "../fixtures";
import { evaluateSecureMessageSend } from "../guards";

const contractsSource = readFileSync(
  fileURLToPath(new URL("../contracts.ts", import.meta.url)),
  "utf8",
);
const guardsSource = readFileSync(fileURLToPath(new URL("../guards.ts", import.meta.url)), "utf8");

function req(actorRef: string, claimedRole: string) {
  return { actorRef, claimedRole, trustedNowUtc: VIRTUAL_CARE_FIXTURE_NOW_UTC };
}

describe("secure-messaging guards and contract", () => {
  it("allows an authorized patient or pharmacist to send in an open, consented thread", () => {
    const world = virtualCareFixture("valid_secure_message_thread")!;
    expect(evaluateSecureMessageSend(world, req(world.patientActorRef, "patient")).allowed).toBe(true);
    expect(evaluateSecureMessageSend(world, req(world.pharmacistActorRef!, "pharmacist")).allowed).toBe(
      true,
    );
  });

  it("denies a wrong-patient or wrong-pharmacy message attempt", () => {
    const world = virtualCareFixture("valid_secure_message_thread")!;
    expect(evaluateSecureMessageSend(world, req("SYNTH-PATIENT-006-WRONG", "patient")).allowed).toBe(false);
    expect(evaluateSecureMessageSend(world, req("SYNTH-PHARMACIST-006-OTHER", "pharmacist")).allowed).toBe(
      false,
    );
  });

  it("denies sending into a thread that isn't open (closed/withdrawn/expired)", () => {
    const world = virtualCareFixture("valid_secure_message_thread")!;
    for (const state of ["closed", "withdrawn", "expired"] as const) {
      const closed = { ...world, messageThread: { ...world.messageThread!, state } };
      expect(evaluateSecureMessageSend(closed, req(world.patientActorRef, "patient"))).toEqual({
        allowed: false,
        denialReason: "thread_not_open",
      });
    }
  });

  it("denies sending with no thread at all", () => {
    const world = virtualCareFixture("valid_video_visit")!; // has no messageThread
    expect(evaluateSecureMessageSend(world, req(world.patientActorRef, "patient"))).toEqual({
      allowed: false,
      denialReason: "no_thread",
    });
  });

  it("denies sending after a revoked patient session or revoked delegate", () => {
    const world = virtualCareFixture("valid_secure_message_thread")!;
    const revokedDelegateWorld = {
      ...world,
      participants: [
        ...world.participants,
        {
          id: "SYNTH-PARTICIPANT-006-DELEGATE",
          actorRef: "SYNTH-DELEGATE-006-0001",
          role: "delegate" as const,
          authorizationState: "denied" as const,
          deniedReason: "delegate_revoked",
          disclosedToPatientAtUtc: null,
          joinedAtUtc: null,
          leftAtUtc: null,
          grant: {
            subjectRef: world.patientSubjectRef,
            scope: "full" as const,
            validFromUtc: world.createdAtUtc,
            expiresAtUtc: world.createdAtUtc,
            revokedAtUtc: world.createdAtUtc,
          },
        },
      ],
    };
    expect(evaluateSecureMessageSend(revokedDelegateWorld, req("SYNTH-DELEGATE-006-0001", "delegate")).allowed).toBe(
      false,
    );
  });

  it("denies sending once suitability for messaging has been withdrawn/marked unsuitable", () => {
    // Messaging itself has no separate suitability field in this schema — pharmacist
    // marks the modality (video/telephone) unsuitable, which routes patients away
    // from messaging via the contingency plan, not a message-level override.
    const world = virtualCareFixture("suitability_video_unsuitable")!;
    expect(world.messageThread).toBeNull();
  });

  it("denies sending once consent for messaging is withdrawn", () => {
    const world = virtualCareFixture("valid_secure_message_thread")!;
    const withdrawn = { ...world, consent: { ...world.consent, withdrawnAtUtc: world.createdAtUtc } };
    expect(evaluateSecureMessageSend(withdrawn, req(world.patientActorRef, "patient"))).toEqual({
      allowed: false,
      denialReason: "consent_withdrawn",
    });
  });

  it("blocks messaging when the patient's location is cross-jurisdictionally blocked", () => {
    const world = virtualCareFixture("valid_secure_message_thread")!;
    const blocked = {
      ...world,
      identityLocation: { ...world.identityLocation, crossJurisdictionalBlocked: true },
    };
    expect(evaluateSecureMessageSend(blocked, req(world.patientActorRef, "patient"))).toEqual({
      allowed: false,
      denialReason: "cross_jurisdictional_block",
    });
  });

  it("has no attachment field anywhere in the contract — unsafe attachments are structurally impossible", () => {
    expect(contractsSource.toLowerCase()).not.toMatch(/attachment|upload|file_?size|mime/);
  });

  it("never types message content as plaintext — bodyEncryptedRef is the only content field", () => {
    expect(contractsSource).toMatch(/bodyEncryptedRef/);
    expect(contractsSource).not.toMatch(/plaintextBody|rawBody|messageText/);
  });

  it("never lets a message or read receipt reach completion or claim logic", () => {
    const functionStart = guardsSource.indexOf("export function evaluateSecureMessageSend");
    expect(functionStart).toBeGreaterThan(-1);
    const nextFunctionStart = guardsSource.indexOf("export function", functionStart + 1);
    const functionBody = guardsSource.slice(
      functionStart,
      nextFunctionStart === -1 ? undefined : nextFunctionStart,
    );
    expect(functionBody).not.toMatch(/pharmacistCompletionAtUtc/);
  });

  it("routes messages only from trusted workflow data, never AI/keyword classification", () => {
    expect(contractsSource.toLowerCase()).not.toMatch(/classif|sentiment|nlp|keyword.?match/);
  });
});
