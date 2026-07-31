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
  writeFileSync(disabledSentinel(env, stateRoot), "disabled\n", { encoding: "utf8", flag: "w" });
}

export function resetSyntheticInstance(env: SandboxEnv, stateRoot = STATE_ROOT): void {
  const directory = exactStateDirectory(env.instanceId, stateRoot);
  if (!existsSync(directory)) return;
  const sentinel = disabledSentinel(env, stateRoot);
  rmSync(sentinel, { force: true });
}

export function readLifecycleMarker(env: SandboxEnv, stateRoot = STATE_ROOT): string | null {
  const sentinel = disabledSentinel(env, stateRoot);
  return existsSync(sentinel) ? readFileSync(sentinel, "utf8") : null;
}
