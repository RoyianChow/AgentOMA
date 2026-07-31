import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseSandboxEnv, type SandboxEnv } from "../env/server";
import {
  cancelQueuedAction,
  executeQueuedAction,
  issueActionTicket,
} from "../lifecycle/actions";
import {
  disableSyntheticInstance,
  exactStateDirectory,
  resetSyntheticInstance,
} from "../lifecycle/state";

const expiresAt = new Date("2026-08-07T00:00:00.000Z");
const now = new Date("2026-08-01T00:00:00.000Z");
let stateRoot: string;

function testEnv(instanceId: string): SandboxEnv {
  return parseSandboxEnv(
    {
      SANDBOX_MODE: "synthetic",
      SANDBOX_BUILT_AT: "2026-07-31T00:00:00.000Z",
      SANDBOX_EXPIRES_AT: expiresAt.toISOString(),
      SANDBOX_INSTANCE_ID: instanceId,
      SANDBOX_ORIGIN: "http://127.0.0.1:3101",
      SANDBOX_G1_DECISION_ID: "G1-2026-07-31-task-01",
      SANDBOX_DISABLED: "false",
    },
    now,
  );
}

afterEach(() => {
  if (stateRoot) rmSync(stateRoot, { recursive: true, force: true });
});

describe("sandbox queued-action lifecycle enforcement", () => {
  it("denies work queued before disablement and never calls the effect", () => {
    stateRoot = mkdtempSync(join(tmpdir(), "agentoma-sbx-action-disable-"));
    const env = testEnv("SYNTH-ACTION-DISABLE");
    const ticket = issueActionTicket(env, "SYNTHETIC_REVIEW", now, stateRoot);
    const effect = vi.fn();

    disableSyntheticInstance(env, stateRoot);
    const result = executeQueuedAction(ticket, env, effect, now, stateRoot);

    expect(result).toEqual({ status: "DENIED", reasonCode: "SBX_STALE_ACTION_DENIED" });
    expect(effect).not.toHaveBeenCalled();
  });

  it("denies work at the expiry boundary", () => {
    stateRoot = mkdtempSync(join(tmpdir(), "agentoma-sbx-action-expiry-"));
    const env = testEnv("SYNTH-ACTION-EXPIRY");
    const ticket = issueActionTicket(env, "SYNTHETIC_REVIEW", now, stateRoot);
    const effect = vi.fn();

    const result = executeQueuedAction(ticket, env, effect, expiresAt, stateRoot);

    expect(result.status).toBe("DENIED");
    expect(effect).not.toHaveBeenCalled();
  });

  it("denies a ticket from the old revision after disable and reactivation", () => {
    stateRoot = mkdtempSync(join(tmpdir(), "agentoma-sbx-action-revision-"));
    const env = testEnv("SYNTH-ACTION-REVISION");
    const ticket = issueActionTicket(env, "SYNTHETIC_REVIEW", now, stateRoot);
    const effect = vi.fn();

    disableSyntheticInstance(env, stateRoot);
    resetSyntheticInstance(env, stateRoot);
    const result = executeQueuedAction(ticket, env, effect, now, stateRoot);

    expect(result.status).toBe("DENIED");
    expect(effect).not.toHaveBeenCalled();
  });

  it("makes duplicate cancellation idempotent", () => {
    stateRoot = mkdtempSync(join(tmpdir(), "agentoma-sbx-action-cancel-"));
    const env = testEnv("SYNTH-ACTION-CANCEL");
    const ticket = issueActionTicket(env, "SYNTHETIC_REVIEW", now, stateRoot);
    const effect = vi.fn();

    const first = cancelQueuedAction(ticket);
    const second = cancelQueuedAction(ticket);
    const result = executeQueuedAction(ticket, env, effect, now, stateRoot);

    expect(first).toEqual({ status: "CANCELLED", alreadyCancelled: false });
    expect(second).toEqual({ status: "CANCELLED", alreadyCancelled: true });
    expect(result.status).toBe("DENIED");
    expect(effect).not.toHaveBeenCalled();
  });

  it("denies missing lifecycle state and malformed revisions as unknown", () => {
    stateRoot = mkdtempSync(join(tmpdir(), "agentoma-sbx-action-unknown-"));
    const env = testEnv("SYNTH-ACTION-UNKNOWN");
    const ticket = issueActionTicket(env, "SYNTHETIC_REVIEW", now, stateRoot);
    const effect = vi.fn();

    rmSync(exactStateDirectory(env.instanceId, stateRoot), { recursive: true, force: true });
    expect(executeQueuedAction(ticket, env, effect, now, stateRoot).status).toBe("DENIED");
    expect(effect).not.toHaveBeenCalled();

    const secondEnv = testEnv("SYNTH-ACTION-MALFORMED");
    const secondTicket = issueActionTicket(secondEnv, "SYNTHETIC_REVIEW", now, stateRoot);
    writeFileSync(join(exactStateDirectory(secondEnv.instanceId, stateRoot), "epoch"), "unknown\n");
    expect(executeQueuedAction(secondTicket, secondEnv, effect, now, stateRoot).status).toBe("DENIED");
    expect(effect).not.toHaveBeenCalled();
  });

  it("logs only safe denial metadata", () => {
    stateRoot = mkdtempSync(join(tmpdir(), "agentoma-sbx-action-log-"));
    const env = testEnv("SYNTH-ACTION-LOG");
    const ticket = issueActionTicket(env, "SYNTHETIC_REVIEW", now, stateRoot);
    const effect = vi.fn();
    const writes: string[] = [];
    const write = vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);

    disableSyntheticInstance(env, stateRoot);
    executeQueuedAction(ticket, env, effect, now, stateRoot);
    write.mockRestore();

    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0])).toEqual({
      eventType: "STALE_ACTION_DENIED",
      source: "LIFECYCLE",
      outcome: "DENIED",
      reasonCode: "SBX_STALE_ACTION_DENIED",
    });
    expect(writes[0]).not.toContain("SYNTH-ACTION-LOG");
    expect(effect).not.toHaveBeenCalled();
  });

  it("executes active work exactly once when the final recheck passes", () => {
    stateRoot = mkdtempSync(join(tmpdir(), "agentoma-sbx-action-active-"));
    const env = testEnv("SYNTH-ACTION-ACTIVE");
    const ticket = issueActionTicket(env, "SYNTHETIC_REVIEW", now, stateRoot);
    const effect = vi.fn();

    const result = executeQueuedAction(ticket, env, effect, now, stateRoot);

    expect(result).toEqual({ status: "EXECUTED", actionType: "SYNTHETIC_REVIEW" });
    expect(effect).toHaveBeenCalledTimes(1);
  });
});
