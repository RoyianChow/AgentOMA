import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

import type { SandboxEnv } from "../env/server";

export type LifecycleState =
  | "UNCONFIGURED"
  | "LOCAL_ACTIVE"
  | "HOSTED_ACTIVE"
  | "DISABLED"
  | "EXPIRED"
  | "TORN_DOWN"
  | "UNKNOWN";

export type LifecycleSnapshot = {
  state: LifecycleState;
  reason: string;
};

export const STATE_ROOT = resolve(process.cwd(), ".sandbox-state");
const EPOCH_FILE = "epoch";

export function assertSyntheticInstanceId(instanceId: string): void {
  if (!/^SYNTH-[A-Z0-9-]{3,64}$/.test(instanceId)) {
    throw new Error("SANDBOX_PATH_DENIED:INVALID_INSTANCE_ID");
  }
}

export function exactStateDirectory(instanceId: string, stateRoot = STATE_ROOT): string {
  assertSyntheticInstanceId(instanceId);
  const canonicalRoot = resolve(stateRoot);
  const target = resolve(canonicalRoot, instanceId);
  const rel = relative(canonicalRoot, target);
  if (!isAbsolute(canonicalRoot) || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("SANDBOX_PATH_DENIED:OUTSIDE_STATE_ROOT");
  }
  return target;
}

function disabledSentinel(env: SandboxEnv, stateRoot = STATE_ROOT): string {
  return join(exactStateDirectory(env.instanceId, stateRoot), "disabled");
}

function lifecycleEpochFile(env: SandboxEnv, stateRoot = STATE_ROOT): string {
  return join(exactStateDirectory(env.instanceId, stateRoot), EPOCH_FILE);
}

function parseEpoch(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const epoch = Number(value.trim());
  return Number.isSafeInteger(epoch) && epoch >= 0 ? epoch : null;
}

/**
 * Returns null for missing or malformed lifecycle state. Callers that hold a
 * queued action must treat null as unknown and deny the action.
 */
export function readLifecycleEpoch(env: SandboxEnv, stateRoot = STATE_ROOT): number | null {
  const directory = exactStateDirectory(env.instanceId, stateRoot);
  const epochFile = lifecycleEpochFile(env, stateRoot);
  if (!existsSync(directory) || !existsSync(epochFile)) return null;
  return parseEpoch(readFileSync(epochFile, "utf8"));
}

export function ensureLifecycleEpoch(env: SandboxEnv, stateRoot = STATE_ROOT): number {
  const directory = exactStateDirectory(env.instanceId, stateRoot);
  mkdirSync(directory, { recursive: true });
  const current = readLifecycleEpoch(env, stateRoot);
  if (current !== null) return current;
  const epochFile = lifecycleEpochFile(env, stateRoot);
  if (existsSync(epochFile)) throw new Error("SANDBOX_LIFECYCLE_DENIED:INVALID_REVISION");
  writeFileSync(epochFile, "0\n", { encoding: "utf8", flag: "wx" });
  return 0;
}

function bumpLifecycleEpoch(env: SandboxEnv, stateRoot = STATE_ROOT): number {
  const current = ensureLifecycleEpoch(env, stateRoot);
  if (current === Number.MAX_SAFE_INTEGER) {
    throw new Error("SANDBOX_LIFECYCLE_DENIED:REVISION_EXHAUSTED");
  }
  const next = current + 1;
  writeFileSync(lifecycleEpochFile(env, stateRoot), `${next}\n`, { encoding: "utf8", flag: "w" });
  return next;
}

export function lifecycleState(
  env: SandboxEnv,
  now = new Date(),
  stateRoot = STATE_ROOT,
): LifecycleSnapshot {
  if (env.disabled) return { state: "DISABLED", reason: "CONFIG_DISABLED" };
  if (now >= env.expiresAt) return { state: "EXPIRED", reason: "EXPIRED" };
  if (existsSync(disabledSentinel(env, stateRoot))) {
    return { state: "DISABLED", reason: "DISABLE_SENTINEL" };
  }
  const directory = exactStateDirectory(env.instanceId, stateRoot);
  if (existsSync(directory) && readLifecycleEpoch(env, stateRoot) === null) {
    return { state: "UNKNOWN", reason: "INVALID_OR_MISSING_REVISION" };
  }
  return { state: "LOCAL_ACTIVE", reason: "G1_LOCAL_LOOPBACK" };
}

export function requireLocalActive(env: SandboxEnv, now = new Date(), stateRoot = STATE_ROOT): void {
  const snapshot = lifecycleState(env, now, stateRoot);
  if (snapshot.state !== "LOCAL_ACTIVE") {
    throw new Error(`SANDBOX_LIFECYCLE_DENIED:${snapshot.reason}`);
  }
}

export function disableSyntheticInstance(env: SandboxEnv, stateRoot = STATE_ROOT): void {
  const directory = exactStateDirectory(env.instanceId, stateRoot);
  mkdirSync(directory, { recursive: true });
  if (!existsSync(disabledSentinel(env, stateRoot))) bumpLifecycleEpoch(env, stateRoot);
  writeFileSync(disabledSentinel(env, stateRoot), "disabled\n", { encoding: "utf8", flag: "w" });
}

export function resetSyntheticInstance(env: SandboxEnv, stateRoot = STATE_ROOT): void {
  const directory = exactStateDirectory(env.instanceId, stateRoot);
  if (!existsSync(directory)) return;
  const sentinel = disabledSentinel(env, stateRoot);
  if (existsSync(sentinel)) bumpLifecycleEpoch(env, stateRoot);
  rmSync(sentinel, { force: true });
}

export function readLifecycleMarker(env: SandboxEnv, stateRoot = STATE_ROOT): string | null {
  const sentinel = disabledSentinel(env, stateRoot);
  return existsSync(sentinel) ? readFileSync(sentinel, "utf8") : null;
}
