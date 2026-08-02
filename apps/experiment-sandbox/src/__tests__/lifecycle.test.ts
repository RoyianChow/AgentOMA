import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { parseSandboxEnv } from "../env/server";
import {
  disableSyntheticInstance,
  exactStateDirectory,
  lifecycleState,
  readLifecycleMarker,
  resetSyntheticInstance,
} from "../lifecycle/state";

const env = parseSandboxEnv(
  {
    SANDBOX_MODE: "synthetic",
    SANDBOX_BUILT_AT: "2026-07-31T00:00:00.000Z",
    SANDBOX_EXPIRES_AT: "2026-08-07T00:00:00.000Z",
    SANDBOX_INSTANCE_ID: "SYNTH-TEST-001",
    SANDBOX_ORIGIN: "http://127.0.0.1:3101",
    SANDBOX_G1_DECISION_ID: "G1-2026-07-31-task-01",
    SANDBOX_DISABLED: "false",
  },
  new Date("2026-08-01T00:00:00.000Z"),
);

let stateRoot: string;

afterEach(() => {
  rmSync(stateRoot, { recursive: true, force: true });
});

describe("sandbox lifecycle", () => {
  it("starts active, expires at the boundary, and disables by exact instance", () => {
    stateRoot = mkdtempSync(join(tmpdir(), "agentoma-sbx-state-"));
    expect(lifecycleState(env, new Date("2026-08-06T23:59:59.999Z"), stateRoot)).toEqual({
      state: "LOCAL_ACTIVE",
      reason: "G1_LOCAL_LOOPBACK",
    });
    expect(lifecycleState(env, new Date("2026-08-07T00:00:00.000Z"), stateRoot)).toEqual({
      state: "EXPIRED",
      reason: "EXPIRED",
    });

    disableSyntheticInstance(env, stateRoot);
    expect(readLifecycleMarker(env, stateRoot)).toBe("disabled\n");
    expect(lifecycleState(env, new Date("2026-08-01T00:00:00.000Z"), stateRoot)).toEqual({
      state: "DISABLED",
      reason: "DISABLE_SENTINEL",
    });

    resetSyntheticInstance(env, stateRoot);
    expect(readLifecycleMarker(env, stateRoot)).toBeNull();
    expect(lifecycleState(env, new Date("2026-08-01T00:00:00.000Z"), stateRoot).state).toBe("LOCAL_ACTIVE");
  });

  it("rejects traversal and wildcard instance targets", () => {
    expect(() => exactStateDirectory("../SYNTH-ESCAPE", stateRoot ?? tmpdir())).toThrow("SANDBOX_PATH_DENIED:INVALID_INSTANCE_ID");
    expect(() => exactStateDirectory("*", stateRoot ?? tmpdir())).toThrow("SANDBOX_PATH_DENIED:INVALID_INSTANCE_ID");
    expect(() => exactStateDirectory("SYNTH-OK1", join(tmpdir(), "..", ".."))).not.toThrow();
  });
});
