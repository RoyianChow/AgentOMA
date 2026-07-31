import { z } from "zod";

import type { SandboxEnv } from "../env/server";
import { safeLog } from "../security/logger";
import {
  ensureLifecycleEpoch,
  lifecycleState,
  readLifecycleEpoch,
  requireLocalActive,
} from "./state";

export const SAFE_ACTION_TYPES = ["SYNTHETIC_REVIEW"] as const;
export type SafeActionType = (typeof SAFE_ACTION_TYPES)[number];

const actionTicketSchema = z
  .object({
    instanceId: z.string().regex(/^SYNTH-[A-Z0-9-]{3,64}$/),
    lifecycleRevision: z.number().int().nonnegative(),
    expiresAt: z.string().datetime({ offset: true }),
    actionType: z.literal(SAFE_ACTION_TYPES[0]),
  })
  .strict();

export type ActionTicket = Readonly<z.infer<typeof actionTicketSchema>>;

export type QueuedActionResult =
  | { status: "EXECUTED"; actionType: SafeActionType }
  | { status: "DENIED"; reasonCode: "SBX_STALE_ACTION_DENIED" }
  | { status: "CANCELLED"; alreadyCancelled: boolean };

const cancelledTickets = new Set<string>();

function ticketKey(ticket: ActionTicket): string {
  return `${ticket.instanceId}|${ticket.lifecycleRevision}|${ticket.expiresAt}|${ticket.actionType}`;
}

function denied(): QueuedActionResult {
  safeLog({
    eventType: "STALE_ACTION_DENIED",
    source: "LIFECYCLE",
    outcome: "DENIED",
    reasonCode: "SBX_STALE_ACTION_DENIED",
  });
  return { status: "DENIED", reasonCode: "SBX_STALE_ACTION_DENIED" };
}

export function issueActionTicket(
  env: SandboxEnv,
  actionType: SafeActionType,
  now = new Date(),
  stateRoot?: string,
): ActionTicket {
  if (!SAFE_ACTION_TYPES.includes(actionType)) {
    throw new Error("SANDBOX_ACTION_DENIED:UNKNOWN_ACTION");
  }
  requireLocalActive(env, now, stateRoot);
  const lifecycleRevision = ensureLifecycleEpoch(env, stateRoot);
  return Object.freeze({
    instanceId: env.instanceId,
    lifecycleRevision,
    expiresAt: env.expiresAt.toISOString(),
    actionType,
  });
}

export function cancelQueuedAction(ticket: ActionTicket): QueuedActionResult {
  const parsed = actionTicketSchema.safeParse(ticket);
  if (!parsed.success) throw new Error("SANDBOX_ACTION_DENIED:INVALID_TICKET");
  const key = ticketKey(parsed.data);
  const alreadyCancelled = cancelledTickets.has(key);
  cancelledTickets.add(key);
  return { status: "CANCELLED", alreadyCancelled };
}

export function executeQueuedAction(
  ticket: ActionTicket,
  env: SandboxEnv,
  effect: () => void,
  now = new Date(),
  stateRoot?: string,
): QueuedActionResult {
  const parsed = actionTicketSchema.safeParse(ticket);
  if (!parsed.success) return denied();
  const queued = parsed.data;
  const expiryMatches = queued.expiresAt === env.expiresAt.toISOString();
  const ticketIsUnexpired = now < new Date(queued.expiresAt);
  const environmentIsUnexpired = now < env.expiresAt;
  const instanceMatches = queued.instanceId === env.instanceId;
  const currentState = lifecycleState(env, now, stateRoot);
  const currentRevision = readLifecycleEpoch(env, stateRoot);
  const wasCancelled = cancelledTickets.has(ticketKey(queued));

  // This is intentionally the final gate before the callback. It re-reads
  // lifecycle state and revision so delayed work cannot act on stale authority.
  if (
    !expiryMatches ||
    !ticketIsUnexpired ||
    !environmentIsUnexpired ||
    !instanceMatches ||
    currentState.state !== "LOCAL_ACTIVE" ||
    currentRevision === null ||
    currentRevision !== queued.lifecycleRevision ||
    wasCancelled
  ) {
    return denied();
  }

  effect();
  return { status: "EXECUTED", actionType: queued.actionType };
}
