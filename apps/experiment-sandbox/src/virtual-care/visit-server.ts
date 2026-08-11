import { virtualCareFixture } from "./fixtures";
import {
  evaluateAssessmentLink,
  evaluateClaimAction,
  evaluateFallbackApproval,
  evaluateInteractionStart,
  evaluateJoin,
  evaluateParticipantAdmission,
  evaluateSecureMessageSend,
  evaluateSuitabilityDecision,
  evaluateTechnicalEventCannotComplete,
  type VirtualCareGuardResult,
} from "./guards";
import { virtualCareScenarioSchema, type VirtualCareWorld } from "./contracts";

/**
 * Task 06 — server-owned virtual-care scene orchestration.
 *
 * This is the only module that reads the fixture set and calls the guard
 * functions together. It never returns raw participant references,
 * consent/location detail, or message content — only the safe, opaque
 * summary fields a UI is allowed to render. Callers (server actions in
 * actions.ts, and eventually the L3 UI) never see a fixture object
 * directly.
 */

export const VIRTUAL_CARE_GUARD_NAMES = [
  "join",
  "interactionStart",
  "participantAdmission",
  "suitabilityDecision",
  "fallbackApproval",
  "secureMessageSend",
  "assessmentLink",
  "claimAction",
] as const;

export type VirtualCareGuardName = (typeof VIRTUAL_CARE_GUARD_NAMES)[number];

export type VirtualCareSceneSnapshot = {
  scenario: string;
  label: string;
  visitId: string;
  workflowState: string;
  connectionState: string;
  requestedModality: string;
  approvedModality: string | null;
  suitabilityState: string;
  suitabilityReasonCode: string | null;
  consentState: string;
  consentModality: string;
  consentWithdrawn: boolean;
  identityOutcome: string;
  crossJurisdictionalBlocked: boolean;
  privacyConfirmed: boolean;
  technicalFailureReasonCode: string | null;
  fallbackToModality: string | null;
  fallbackApproved: boolean | null;
  messageThreadState: string | null;
  messageCount: number;
  pharmacistCompletionRecorded: boolean;
  serviceAvailability: VirtualCareWorld["serviceAvailability"];
  participantCount: number;
  admittedParticipantRoles: readonly string[];
};

function safeSceneSnapshot(world: VirtualCareWorld): VirtualCareSceneSnapshot {
  return {
    scenario: world.scenario,
    label: world.label,
    visitId: world.visitId,
    workflowState: world.workflowState,
    connectionState: world.connectionState,
    requestedModality: world.requestedModality,
    approvedModality: world.approvedModality,
    suitabilityState: world.suitability.state,
    suitabilityReasonCode: world.suitability.reasonCode,
    consentState: world.consent.state,
    consentModality: world.consent.modality,
    consentWithdrawn: world.consent.withdrawnAtUtc !== null,
    identityOutcome: world.identityLocation.identityOutcome,
    crossJurisdictionalBlocked: world.identityLocation.crossJurisdictionalBlocked,
    privacyConfirmed: world.privacyConfirmation.confirmed,
    technicalFailureReasonCode: world.technicalFailure?.reasonCode ?? null,
    fallbackToModality: world.fallbackTransition?.toModality ?? null,
    fallbackApproved: world.fallbackTransition?.approved ?? null,
    messageThreadState: world.messageThread?.state ?? null,
    messageCount: world.messageThread?.messages.length ?? 0,
    pharmacistCompletionRecorded: world.pharmacistCompletionAtUtc !== null,
    serviceAvailability: world.serviceAvailability,
    participantCount: world.participants.filter((p) => p.authorizationState === "admitted").length,
    admittedParticipantRoles: world.participants
      .filter((p) => p.authorizationState === "admitted")
      .map((p) => p.role),
  };
}

export type VirtualCareSceneResult =
  | { found: true; snapshot: VirtualCareSceneSnapshot; guards: Record<VirtualCareGuardName, VirtualCareGuardResult> }
  | { found: false };

/**
 * Loads a scenario by name and evaluates every guard against the same
 * requester facts. Unknown scenarios return `{ found: false }` rather than
 * throwing — a denied/unknown-scenario UI state is itself one of the
 * required synthetic interfaces (Workstream L "denied, expired,
 * unavailable, and unknown states").
 */
export function evaluateVirtualCareScene(
  scenarioInput: unknown,
  requestInput: unknown,
): VirtualCareSceneResult {
  const scenario = virtualCareScenarioSchema.safeParse(scenarioInput);
  if (!scenario.success) return { found: false };
  const world = virtualCareFixture(scenario.data);
  if (!world) return { found: false };

  const guards: Record<VirtualCareGuardName, VirtualCareGuardResult> = {
    join: evaluateJoin(world, requestInput),
    interactionStart: evaluateInteractionStart(world, requestInput),
    participantAdmission: evaluateParticipantAdmission(world, requestInput),
    suitabilityDecision: evaluateSuitabilityDecision(world, requestInput),
    fallbackApproval: evaluateFallbackApproval(world, requestInput),
    secureMessageSend: evaluateSecureMessageSend(world, requestInput),
    assessmentLink: evaluateAssessmentLink(world, requestInput),
    claimAction: evaluateClaimAction(world, requestInput),
  };

  return { found: true, snapshot: safeSceneSnapshot(world), guards };
}

export function virtualCareTechnicalEventInvariantHolds(scenarioInput: unknown): boolean {
  const scenario = virtualCareScenarioSchema.safeParse(scenarioInput);
  if (!scenario.success) return false;
  const world = virtualCareFixture(scenario.data);
  if (!world) return false;
  return evaluateTechnicalEventCannotComplete(world).allowed;
}

export function listVirtualCareScenarios(): readonly string[] {
  return virtualCareScenarioSchema.options;
}
