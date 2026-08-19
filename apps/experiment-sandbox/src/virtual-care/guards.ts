import { z } from "zod";

import { opaqueRefSchema, type VirtualCareWorld } from "./contracts";

/**
 * Task 06 — synthetic virtual-care guards.
 *
 * Structural reimplementation of docs/task-06/assessment-and-claim-
 * integration-boundary.md §1's guard list and docs/task-06/
 * failure-and-contingency-state-machine.md's transition rules, scoped to
 * what this synthetic prototype needs to prove. Every function here
 * DERIVES its answer from current world state — none of them merely echo
 * a fixture's pre-labelled expected outcome. Deny-by-default: any
 * unrecognized, malformed, or ambiguous input is denied, never allowed.
 */

export type VirtualCareGuardResult =
  | { allowed: true }
  | { allowed: false; denialReason: string };

function denied(denialReason: string): VirtualCareGuardResult {
  return { allowed: false, denialReason };
}

const ALLOWED: VirtualCareGuardResult = { allowed: true };

export const virtualCareActorRoleSchema = z.enum([
  "patient",
  "pharmacist",
  "delegate",
  "support_person",
  "interpreter",
]);

export const virtualCareActionRequestSchema = z
  .object({
    actorRef: opaqueRefSchema,
    claimedRole: virtualCareActorRoleSchema,
    trustedNowUtc: z.string(),
  })
  .strict();

export type VirtualCareActionRequest = z.infer<typeof virtualCareActionRequestSchema>;

function parseRequest(input: unknown): VirtualCareActionRequest | undefined {
  const parsed = virtualCareActionRequestSchema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

function isPharmacist(world: VirtualCareWorld, request: VirtualCareActionRequest): boolean {
  return (
    request.claimedRole === "pharmacist" &&
    world.pharmacistActorRef !== null &&
    request.actorRef === world.pharmacistActorRef
  );
}

function isPatient(world: VirtualCareWorld, request: VirtualCareActionRequest): boolean {
  return request.claimedRole === "patient" && request.actorRef === world.patientActorRef;
}

function matchingParticipant(world: VirtualCareWorld, request: VirtualCareActionRequest) {
  return world.participants.find(
    (participant) =>
      participant.actorRef === request.actorRef && participant.role === request.claimedRole,
  );
}

function grantIsCurrentlyValid(
  grant: NonNullable<VirtualCareWorld["participants"][number]["grant"]>,
  world: VirtualCareWorld,
  trustedNowUtc: string,
): boolean {
  const now = Date.parse(trustedNowUtc);
  return (
    grant.subjectRef === world.patientSubjectRef &&
    grant.revokedAtUtc === null &&
    Date.parse(grant.validFromUtc) <= now &&
    now < Date.parse(grant.expiresAtUtc)
  );
}

/**
 * Pre-admission join gate. Mirrors Workstream J §2 "Waiting-room entry"
 * (guards 1-9, 12-15): identity of the requester, visit/tenant scope,
 * and participant authorization — not yet consent, suitability, or
 * assessment/claim state, which are irrelevant before anyone is admitted.
 */
export function evaluateJoin(
  world: VirtualCareWorld,
  requestInput: unknown,
): VirtualCareGuardResult {
  const request = parseRequest(requestInput);
  if (!request) return denied("malformed_request");

  if (world.workflowState === "ended") return denied("visit_terminal");
  if (world.workflowState === "unknown" || world.connectionState === "unknown") {
    return denied("unknown_state");
  }
  if (world.joinDenialReason !== null) return denied(world.joinDenialReason);

  if (request.claimedRole === "patient") {
    return isPatient(world, request) ? ALLOWED : denied("wrong_patient");
  }

  if (request.claimedRole === "pharmacist") {
    return isPharmacist(world, request) ? ALLOWED : denied("wrong_audience");
  }

  if (request.claimedRole === "delegate") {
    const participant = matchingParticipant(world, request);
    if (!participant || !participant.grant) return denied("delegate_not_found");
    if (participant.grant.revokedAtUtc !== null) return denied("delegate_revoked");
    if (participant.grant.subjectRef !== world.patientSubjectRef) {
      return denied("delegate_wrong_subject");
    }
    if (!grantIsCurrentlyValid(participant.grant, world, request.trustedNowUtc)) {
      return denied("delegate_expired");
    }
    return participant.authorizationState === "denied"
      ? denied(participant.deniedReason ?? "delegate_denied")
      : ALLOWED;
  }

  // support_person / interpreter
  const participant = matchingParticipant(world, request);
  if (!participant) return denied("not_disclosed");
  if (participant.disclosedToPatientAtUtc === null) return denied("not_disclosed");
  if (participant.authorizationState === "denied") {
    return denied(participant.deniedReason ?? "not_authorized");
  }
  if (participant.authorizationState === "removed") return denied("participant_removed");
  return ALLOWED;
}

/**
 * Admission/removal control. Pharmacist-only, full stop — mirrors the
 * "host impersonation" and "role escalation" threats (threat model #7, #11,
 * #15): no participant may promote or admit themselves.
 */
export function evaluateParticipantAdmission(
  world: VirtualCareWorld,
  requestInput: unknown,
): VirtualCareGuardResult {
  const request = parseRequest(requestInput);
  if (!request) return denied("malformed_request");
  if (!isPharmacist(world, request)) return denied("wrong_audience");
  return ALLOWED;
}

/**
 * Full gate before substantive clinical interaction, secure-message
 * release, or assessment/claim access — mirrors Workstream J §2's "before
 * starting clinical interaction" row: all applicable guards, rechecked
 * from current state, never cached.
 */
export function evaluateInteractionStart(
  world: VirtualCareWorld,
  requestInput: unknown,
): VirtualCareGuardResult {
  const request = parseRequest(requestInput);
  if (!request) return denied("malformed_request");

  const joinResult = evaluateJoin(world, requestInput);
  if (!joinResult.allowed) return joinResult;

  if (world.consent.withdrawnAtUtc !== null) return denied("consent_withdrawn");
  if (world.consent.state !== "granted") return denied("consent_not_granted");
  if (world.approvedModality !== null && world.consent.modality !== world.approvedModality) {
    return denied("consent_wrong_modality");
  }

  if (world.identityLocation.identityOutcome !== "confirmed") return denied("identity_not_confirmed");
  if (world.identityLocation.crossJurisdictionalBlocked) return denied("cross_jurisdictional_block");

  if (!world.privacyConfirmation.confirmed) return denied("privacy_not_confirmed");

  if (
    world.suitability.state !== "SUITABLE" &&
    world.suitability.state !== "SUITABLE_WITH_LIMITATIONS"
  ) {
    return denied("not_suitable");
  }
  if (world.approvedModality !== null && world.suitability.modality !== world.approvedModality) {
    return denied("suitability_wrong_modality");
  }

  if (world.approvedModality === null) return denied("no_approved_modality");
  if (world.workflowState !== "in_progress" && world.workflowState !== "ready") {
    return denied("visit_not_active");
  }

  void request;
  return ALLOWED;
}

/**
 * Suitability decisions are pharmacist-authored only — the one entity
 * where a client-supplied value for the decision itself must never be
 * accepted (docs/task-06/virtual-visit-contracts-and-schema-proposal.md,
 * `ModalitySuitabilityDecision`).
 */
export function evaluateSuitabilityDecision(
  world: VirtualCareWorld,
  requestInput: unknown,
): VirtualCareGuardResult {
  const request = parseRequest(requestInput);
  if (!request) return denied("malformed_request");
  if (!isPharmacist(world, request)) return denied("wrong_audience");
  return ALLOWED;
}

/**
 * A fallback may only be approved by the pharmacist, and only commits if
 * every guard for the new modality was rechecked, not carried over
 * (threat #46). This guard checks the *shape* of the recorded transition,
 * not just who is asking — an unrenewed transition is denied even if the
 * pharmacist is the one asking.
 */
export function evaluateFallbackApproval(
  world: VirtualCareWorld,
  requestInput: unknown,
): VirtualCareGuardResult {
  const request = parseRequest(requestInput);
  if (!request) return denied("malformed_request");
  if (!isPharmacist(world, request)) return denied("wrong_audience");
  if (!world.fallbackTransition) return denied("no_fallback_recorded");
  if (!world.fallbackTransition.approved) return denied("fallback_not_approved");
  if (!world.fallbackTransition.renewedGuardsConfirmed) return denied("fallback_guards_not_renewed");
  return ALLOWED;
}

/**
 * A technical event alone must never complete a visit or generate a
 * claim (threat #47, #48). This guard exists so a caller cannot reach
 * pharmacistCompletionAtUtc through any technical-event path — there is
 * no argument to this function that represents one.
 */
export function evaluateTechnicalEventCannotComplete(world: VirtualCareWorld): VirtualCareGuardResult {
  if (world.technicalFailure !== null && world.pharmacistCompletionAtUtc !== null) {
    return denied("technical_failure_precludes_completion");
  }
  if (world.vendorWebhookReceipt !== null && world.pharmacistCompletionAtUtc !== null) {
    return denied("vendor_event_cannot_complete_visit");
  }
  return ALLOWED;
}

export function evaluateSecureMessageSend(
  world: VirtualCareWorld,
  requestInput: unknown,
): VirtualCareGuardResult {
  const request = parseRequest(requestInput);
  if (!request) return denied("malformed_request");
  if (request.claimedRole !== "patient" && request.claimedRole !== "pharmacist") {
    return denied("wrong_audience");
  }
  if (!(isPatient(world, request) || isPharmacist(world, request))) return denied("wrong_audience");

  if (!world.messageThread) return denied("no_thread");
  if (world.messageThread.state !== "open") return denied("thread_not_open");
  if (world.consent.withdrawnAtUtc !== null) return denied("consent_withdrawn");
  if (world.consent.modality !== "secure_messaging") return denied("consent_wrong_modality");
  if (world.consent.state !== "granted") return denied("consent_not_granted");
  if (world.identityLocation.crossJurisdictionalBlocked) return denied("cross_jurisdictional_block");
  return ALLOWED;
}

/**
 * Mirrors docs/task-06/assessment-and-claim-integration-boundary.md §1's
 * "before assessment completion" row: all applicable guards, plus the
 * visit must actually be pharmacist-completed. This function never writes
 * to Task 02's tables and never could — it only decides whether the
 * (synthetic) link may be recorded.
 */
export function evaluateAssessmentLink(
  world: VirtualCareWorld,
  requestInput: unknown,
): VirtualCareGuardResult {
  const request = parseRequest(requestInput);
  if (!request) return denied("malformed_request");
  if (!isPharmacist(world, request)) return denied("wrong_audience");

  if (!world.serviceAvailability.task02Available) return denied("task02_unavailable");
  if (!world.serviceAvailability.task11ReleaseGateVerified) return denied("release_gate_not_verified");

  const technicalGuard = evaluateTechnicalEventCannotComplete(world);
  if (!technicalGuard.allowed) return technicalGuard;

  if (world.pharmacistCompletionAtUtc === null) return denied("visit_not_completed");

  if (
    world.suitability.state !== "SUITABLE" &&
    world.suitability.state !== "SUITABLE_WITH_LIMITATIONS"
  ) {
    return denied("suitability_not_current");
  }
  if (world.consent.state !== "granted" || world.consent.withdrawnAtUtc !== null) {
    return denied("consent_not_current");
  }
  if (world.identityLocation.identityOutcome !== "confirmed") return denied("identity_not_current");
  if (world.identityLocation.crossJurisdictionalBlocked) return denied("cross_jurisdictional_block");

  return ALLOWED;
}

/**
 * Claim actions require the assessment link to already be allowed AND the
 * visit to be in its terminal, pharmacist-completed state
 * (workflowState === "ended"). This is the last gate before Task 02's own,
 * unchanged claim-derivation flow would run — this function never derives
 * a claim itself.
 */
export function evaluateClaimAction(
  world: VirtualCareWorld,
  requestInput: unknown,
): VirtualCareGuardResult {
  const assessmentResult = evaluateAssessmentLink(world, requestInput);
  if (!assessmentResult.allowed) return assessmentResult;
  if (world.workflowState !== "ended") return denied("visit_not_completed");
  return ALLOWED;
}
