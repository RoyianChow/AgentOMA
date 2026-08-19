import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { virtualCareFixture, VIRTUAL_CARE_FIXTURE_NOW_UTC } from "../fixtures";
import { evaluateJoin, evaluateParticipantAdmission } from "../guards";
import { evaluateVirtualCareScene } from "../visit-server";

const contractsSource = readFileSync(
  fileURLToPath(new URL("../contracts.ts", import.meta.url)),
  "utf8",
);

function req(actorRef: string, claimedRole: string) {
  return { actorRef, claimedRole, trustedNowUtc: VIRTUAL_CARE_FIXTURE_NOW_UTC };
}

describe("waiting-room and participant guards", () => {
  it("assigns the pharmacist and lets only that pharmacist admit participants", () => {
    const waiting = virtualCareFixture("authorized_patient_waiting")!;
    expect(waiting.pharmacistActorRef).not.toBeNull();
    expect(
      evaluateParticipantAdmission(waiting, req(waiting.pharmacistActorRef!, "pharmacist")).allowed,
    ).toBe(true);
    expect(
      evaluateParticipantAdmission(waiting, req(waiting.patientActorRef, "patient")).allowed,
    ).toBe(false);
  });

  it("admits an authorized, disclosed interpreter or support person", () => {
    const world = virtualCareFixture("authorized_interpreter_or_support_person")!;
    expect(evaluateJoin(world, req("SYNTH-INTERPRETER-006-0001", "interpreter")).allowed).toBe(true);
  });

  it("denies an undisclosed support person — additional-participant consent is required", () => {
    const world = virtualCareFixture("unauthorized_support_person")!;
    const result = evaluateJoin(world, req("SYNTH-SUPPORT-006-0001", "support_person"));
    expect(result).toEqual({ allowed: false, denialReason: "not_disclosed" });
  });

  it("shows the participant roster as safe role labels, never raw actor references", () => {
    const scene = evaluateVirtualCareScene("valid_video_visit", req("SYNTH-PATIENT-006-0001", "patient"));
    expect(scene.found).toBe(true);
    if (!scene.found) return;
    expect(scene.snapshot.admittedParticipantRoles).toEqual(
      expect.arrayContaining(["patient", "pharmacist"]),
    );
    for (const value of Object.values(scene.snapshot)) {
      expect(String(value)).not.toMatch(/^SYNTH-(PATIENT|PHARMACIST|DELEGATE|SUPPORT|INTERPRETER)-/);
    }
  });

  it("only a pharmacist may remove or admit — no participant can self-promote", () => {
    const world = virtualCareFixture("valid_video_visit")!;
    expect(evaluateParticipantAdmission(world, req("SYNTH-SUPPORT-006-0001", "support_person")).allowed).toBe(
      false,
    );
    expect(evaluateParticipantAdmission(world, req(world.patientActorRef, "patient")).allowed).toBe(false);
  });

  it("join is idempotent across duplicate tabs and concurrent devices", () => {
    const world = virtualCareFixture("duplicate_tab")!;
    const request = req(world.patientActorRef, "patient");
    const first = evaluateJoin(world, request);
    const second = evaluateJoin(world, request);
    expect(first).toEqual(second);
  });

  it("treats voluntary patient departure as a terminal, non-rejoinable state", () => {
    const world = virtualCareFixture("patient_leaves_voluntarily")!;
    expect(evaluateJoin(world, req(world.patientActorRef, "patient")).allowed).toBe(false);
  });

  it("denies rejoin after waiting-room/visit expiry", () => {
    const world = virtualCareFixture("reconnect_after_expiry")!;
    expect(evaluateJoin(world, req(world.patientActorRef, "patient"))).toEqual({
      allowed: false,
      denialReason: "visit_terminal",
    });
  });

  it("denies join once a visit has timed out with nobody admitted", () => {
    const world = virtualCareFixture("visit_times_out")!;
    expect(evaluateJoin(world, req(world.patientActorRef, "patient")).allowed).toBe(false);
    expect(world.participants).toEqual([]);
  });

  it("has no media, recording, or streaming field anywhere in the contract — no pre-admission media is possible by construction", () => {
    expect(contractsSource.toLowerCase()).not.toMatch(/media|recording|(?<!main)stream|transcript/);
  });

  it("requires explicit disclosure before any participant can be admitted — no hidden participants", () => {
    const world = virtualCareFixture("unauthorized_support_person")!;
    const hiddenParticipant = world.participants.find((p) => p.actorRef === "SYNTH-SUPPORT-006-0001");
    expect(hiddenParticipant?.disclosedToPatientAtUtc).toBeNull();
    expect(evaluateJoin(world, req("SYNTH-SUPPORT-006-0001", "support_person")).allowed).toBe(false);
  });
});
