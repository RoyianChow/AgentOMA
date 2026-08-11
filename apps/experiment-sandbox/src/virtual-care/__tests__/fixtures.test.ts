import { describe, expect, it } from "vitest";

import {
  VIRTUAL_CARE_FIXTURE_COUNT,
  VIRTUAL_CARE_SCENARIOS,
  allVirtualCareFixtures,
  isServerOwnedVirtualCareFixture,
  virtualCareFixture,
} from "../fixtures";
import { parseVirtualCareWorld } from "../contracts";

describe("virtual-care synthetic fixtures", () => {
  it("defines exactly one fixture per required scenario", () => {
    expect(VIRTUAL_CARE_FIXTURE_COUNT).toBe(VIRTUAL_CARE_SCENARIOS.length);
    expect(allVirtualCareFixtures()).toHaveLength(VIRTUAL_CARE_SCENARIOS.length);
  });

  it("gives every fixture a unique, unmistakably synthetic visit id", () => {
    const ids = allVirtualCareFixtures().map((world) => world.visitId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^SYNTH-VISIT-006-/);
    }
  });

  it("round-trips every fixture through its own schema", () => {
    for (const world of allVirtualCareFixtures()) {
      expect(() => parseVirtualCareWorld(world)).not.toThrow();
    }
  });

  it("carries the required leakage-test marker on every fixture", () => {
    for (const world of allVirtualCareFixtures()) {
      expect(world.leakageMarker).toBe("SYNTHETIC-LEAKAGE-MARKER-006");
    }
  });

  it("uses a fixed clock — every fixture's timestamps fall on 2026-08-11", () => {
    for (const world of allVirtualCareFixtures()) {
      expect(world.createdAtUtc.startsWith("2026-08-11")).toBe(true);
    }
  });

  it("is server-owned: only fixtures produced by this module pass the ownership check", () => {
    for (const world of allVirtualCareFixtures()) {
      expect(isServerOwnedVirtualCareFixture(world)).toBe(true);
    }
    expect(isServerOwnedVirtualCareFixture({ ...allVirtualCareFixtures()[0] })).toBe(false);
    expect(isServerOwnedVirtualCareFixture(null)).toBe(false);
    expect(isServerOwnedVirtualCareFixture("valid_video_visit")).toBe(false);
  });

  it("returns undefined for an unknown or malformed scenario name", () => {
    expect(virtualCareFixture("not_a_real_scenario")).toBeUndefined();
    expect(virtualCareFixture(undefined)).toBeUndefined();
    expect(virtualCareFixture({ scenario: "valid_video_visit" })).toBeUndefined();
  });

  it("never uses real-looking identifiers — every opaque reference is SYNTH-prefixed", () => {
    const rawSuspects: string[] = [];
    for (const world of allVirtualCareFixtures()) {
      for (const ref of [world.patientSubjectRef, world.patientActorRef, world.pharmacistActorRef]) {
        if (ref !== null && !ref.startsWith("SYNTH-")) rawSuspects.push(ref);
      }
      for (const participant of world.participants) {
        if (!participant.actorRef.startsWith("SYNTH-")) rawSuspects.push(participant.actorRef);
      }
    }
    expect(rawSuspects).toEqual([]);
  });
});
