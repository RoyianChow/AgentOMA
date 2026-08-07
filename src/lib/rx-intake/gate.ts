// SERVER-ONLY. This module reads server env; importing it from a client
// component would pull flag state into the bundle. `server-only` is not a
// dependency of this repo (see the same note in src/config/ailment-reference.ts),
// so the boundary test in __tests__/boundary.test.ts enforces it instead: no
// "use client" file under src/ may import this module.
import { env } from "@/env";

import { RX_CAPABILITY_ID } from "./contract";

/**
 * The AI-RX-06 availability gate.
 *
 * Flag state lives on the server, so it cannot be read, inferred, or overridden
 * from the client. Every entry point — the page and the server action — calls
 * `assertRxIntakeEnabled` independently. The page check is UX; the action check
 * is the enforcement, exactly as `auth-guard.ts` splits them.
 *
 * Precedence, strictest first:
 *   1. kill switch  — global, outranks everything
 *   2. expiry       — an experiment past its date is off, flag or no flag
 *   3. feature flag — per-capability, default off
 */

export type RxGateRefusal = "KILL_SWITCH" | "EXPIRED" | "DISABLED";

export type RxGateState =
  | { enabled: true; expiresOn: string | null }
  | { enabled: false; reason: RxGateRefusal; expiresOn: string | null };

export class RxCapabilityDisabledError extends Error {
  constructor(public readonly reason: RxGateRefusal) {
    super(`${RX_CAPABILITY_ID} disabled: ${reason}`);
    this.name = "RxCapabilityDisabledError";
  }
}

export const RX_GATE_MESSAGES: Record<RxGateRefusal, string> = {
  KILL_SWITCH:
    "All bounded-AI capabilities are disabled by the global kill switch. Contact the product lead before re-enabling.",
  EXPIRED:
    "This experiment has passed its authorized expiry date. It requires renewed sign-off before it can be switched back on.",
  DISABLED:
    "This experiment is switched off in this environment. It is a synthetic evaluation surface and is off by default.",
};

/**
 * Compares against the Toronto civil date rather than UTC. `expiresOn` is a
 * calendar date an approver wrote down, so it should end when the day ends here
 * — not at 19:00 the evening before, which is what a naive UTC compare gives.
 */
function torontoToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** `now` is injectable so the expiry boundary is testable without a fake clock. */
export function rxIntakeGate(now: Date = new Date()): RxGateState {
  const expiresOn = env.RX_INTAKE_EXPIRES_ON ?? null;

  if (env.AI_KILL_SWITCH) {
    return { enabled: false, reason: "KILL_SWITCH", expiresOn };
  }
  if (expiresOn && torontoToday(now) > expiresOn) {
    return { enabled: false, reason: "EXPIRED", expiresOn };
  }
  if (!env.RX_INTAKE_SYNTHETIC_ENABLED) {
    return { enabled: false, reason: "DISABLED", expiresOn };
  }
  return { enabled: true, expiresOn };
}

export function assertRxIntakeEnabled(now: Date = new Date()): void {
  const gate = rxIntakeGate(now);
  if (!gate.enabled) throw new RxCapabilityDisabledError(gate.reason);
}
