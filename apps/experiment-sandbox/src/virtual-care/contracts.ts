import { z } from "zod";

/**
 * Task 06 — synthetic virtual-care contracts.
 *
 * Mirrors docs/task-06/virtual-visit-contracts-and-schema-proposal.md's
 * orthogonal state model (§1) and entity contracts (§2). This module makes
 * no vendor or network calls, reads no environment variables, and imports
 * nothing from ../booking or ../env — it is self-contained so it cannot
 * entangle with Task 04's sandbox lifecycle or its narrowly-scoped
 * architecture tests.
 */

export const VIRTUAL_CARE_FIXTURE_CONTRACT_VERSION =
  "TASK06_SYNTHETIC_VIRTUAL_CARE_FIXTURE_V1" as const;

export const VIRTUAL_CARE_WORKFLOW_STATES = [
  "draft",
  "scheduled",
  "waiting",
  "ready",
  "in_progress",
  "interrupted",
  "ended",
  "unknown",
] as const;

export const VIRTUAL_CARE_MODALITIES = [
  "telephone",
  "video",
  "secure_messaging",
  "in_person",
] as const;

export const VIRTUAL_CARE_CONNECTION_STATES = [
  "offline",
  "connecting",
  "connected",
  "degraded",
  "disconnected",
  "failed",
  "unknown",
] as const;

export const VIRTUAL_CARE_IDENTITY_OUTCOMES = [
  "pending",
  "confirmed",
  "failed",
  "expired",
] as const;

export const VIRTUAL_CARE_JURISDICTIONS = [
  "ON",
  "OTHER_CANADIAN",
  "NON_CANADIAN",
] as const;

export const VIRTUAL_CARE_CONSENT_STATES = [
  "pending",
  "granted",
  "withdrawn",
  "superseded",
] as const;

export const VIRTUAL_CARE_CONSENT_SCOPES = [
  "collect_use_disclose",
  "modality",
  "participants",
] as const;

export const VIRTUAL_CARE_SUITABILITY_STATES = [
  "PENDING",
  "SUITABLE",
  "SUITABLE_WITH_LIMITATIONS",
  "UNSUITABLE",
  "REASSESSMENT_REQUIRED",
] as const;

export const VIRTUAL_CARE_PARTICIPANT_ROLES = [
  "patient",
  "pharmacist",
  "delegate",
  "support_person",
  "interpreter",
] as const;

export const VIRTUAL_CARE_PARTICIPANT_AUTH_STATES = [
  "invited",
  "waiting",
  "admitted",
  "denied",
  "removed",
  "left",
] as const;

export const VIRTUAL_CARE_TECH_CHECK_TYPES = [
  "browser",
  "camera",
  "microphone",
  "speaker",
  "network",
  "bandwidth",
] as const;

export const VIRTUAL_CARE_TECH_RESULT_CATEGORIES = [
  "pass",
  "fail",
  "degraded",
] as const;

export const VIRTUAL_CARE_CONTINGENCIES = [
  "in_person",
  "telephone",
  "referral",
] as const;

export const VIRTUAL_CARE_MESSAGE_THREAD_STATES = [
  "open",
  "closed",
  "withdrawn",
  "expired",
] as const;

export const VIRTUAL_CARE_VENDOR_WEBHOOK_OUTCOMES = [
  "accepted",
  "rejected",
  "duplicate",
  "replayed",
  "stale",
  "unknown",
] as const;

export const VIRTUAL_CARE_JOIN_DENIAL_REASONS = [
  "wrong_patient",
  "wrong_pharmacy",
  "wrong_audience",
  "expired_credential",
  "replayed_credential",
  "forwarded_credential",
  "delegate_expired",
  "delegate_revoked",
  "delegate_wrong_subject",
  "visit_terminal",
  "unknown_state",
] as const;

export const VIRTUAL_CARE_SCENARIOS = [
  "authorized_patient_waiting",
  "valid_video_visit",
  "valid_telephone_visit",
  "valid_secure_message_thread",
  "patient_chooses_telephone_over_video",
  "camera_permission_denied",
  "microphone_unavailable",
  "no_speaker_output",
  "unsupported_browser",
  "low_bandwidth",
  "video_connection_degraded",
  "disconnect_before_clinical_interaction",
  "disconnect_during_clinical_interaction",
  "successful_guarded_reconnect",
  "reconnect_after_expiry",
  "duplicate_tab",
  "concurrent_device",
  "wrong_patient_join",
  "wrong_pharmacy_join",
  "expired_join",
  "replayed_join",
  "forwarded_join",
  "patient_token_at_pharmacist_boundary",
  "pharmacist_token_at_patient_boundary",
  "active_delegate_correct_scope",
  "expired_delegate",
  "revoked_delegate",
  "wrong_subject_delegate",
  "unauthorized_support_person",
  "authorized_interpreter_or_support_person",
  "participant_removed",
  "location_outside_approved_jurisdiction",
  "consent_pending",
  "consent_withdrawn_before_visit",
  "consent_withdrawn_during_visit",
  "privacy_confirmation_incomplete",
  "suitability_video_suitable",
  "suitability_video_suitable_with_limitations",
  "suitability_video_unsuitable",
  "suitability_telephone_unsuitable",
  "fallback_in_person_selected",
  "fallback_referral_selected",
  "technical_failure_with_approved_fallback",
  "technical_failure_without_fallback",
  "patient_leaves_voluntarily",
  "visit_times_out",
  "vendor_meeting_ended_event",
  "assessment_guard_failure",
  "claim_guard_failure",
  "unknown_state",
  "vendor_outage",
  "task02_unavailable",
  "task05_unavailable",
  "task11_release_gate_blocked",
] as const;

export const virtualCareScenarioSchema = z.enum(VIRTUAL_CARE_SCENARIOS);
export type VirtualCareScenario = z.infer<typeof virtualCareScenarioSchema>;

/** Matches the SYNTH- opaque-reference convention already used across this sandbox. */
export const opaqueRefSchema = z
  .string()
  .min(8)
  .max(160)
  .regex(/^SYNTH-[A-Z0-9-]+$/);

export const pharmacyIdSchema = z
  .string()
  .min(16)
  .max(96)
  .regex(/^SYNTH-PHARMACY-[A-Z0-9_-]+$/);

export const utcInstantSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  .refine((value) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
  });

export const safeReasonCodeSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/);

const grantSchema = z
  .object({
    subjectRef: opaqueRefSchema,
    scope: z.enum(["view_only", "full"]),
    validFromUtc: utcInstantSchema,
    expiresAtUtc: utcInstantSchema,
    revokedAtUtc: utcInstantSchema.nullable(),
  })
  .strict();

const participantSchema = z
  .object({
    id: opaqueRefSchema,
    actorRef: opaqueRefSchema,
    role: z.enum(VIRTUAL_CARE_PARTICIPANT_ROLES),
    authorizationState: z.enum(VIRTUAL_CARE_PARTICIPANT_AUTH_STATES),
    deniedReason: z.string().min(1).max(64).nullable(),
    disclosedToPatientAtUtc: utcInstantSchema.nullable(),
    joinedAtUtc: utcInstantSchema.nullable(),
    leftAtUtc: utcInstantSchema.nullable(),
    grant: grantSchema.nullable(),
  })
  .strict();

const consentEventSchema = z
  .object({
    state: z.enum(VIRTUAL_CARE_CONSENT_STATES),
    modality: z.enum(VIRTUAL_CARE_MODALITIES),
    scope: z.array(z.enum(VIRTUAL_CARE_CONSENT_SCOPES)).min(1),
    noticeVersion: z.string().min(1).max(32),
    effectiveAtUtc: utcInstantSchema.nullable(),
    withdrawnAtUtc: utcInstantSchema.nullable(),
  })
  .strict();

const identityLocationSchema = z
  .object({
    identityOutcome: z.enum(VIRTUAL_CARE_IDENTITY_OUTCOMES),
    jurisdiction: z.enum(VIRTUAL_CARE_JURISDICTIONS),
    crossJurisdictionalBlocked: z.boolean(),
  })
  .strict();

const privacyConfirmationSchema = z
  .object({
    confirmed: z.boolean(),
  })
  .strict();

const suitabilityDecisionSchema = z
  .object({
    state: z.enum(VIRTUAL_CARE_SUITABILITY_STATES),
    modality: z.enum(VIRTUAL_CARE_MODALITIES),
    reasonCode: safeReasonCodeSchema.nullable(),
  })
  .strict();

const technologyReadinessResultSchema = z
  .object({
    checkType: z.enum(VIRTUAL_CARE_TECH_CHECK_TYPES),
    safeResultCategory: z.enum(VIRTUAL_CARE_TECH_RESULT_CATEGORIES),
    reasonCode: safeReasonCodeSchema.nullable(),
  })
  .strict();

const contingencyPlanSchema = z
  .object({
    approvedContingency: z.enum(VIRTUAL_CARE_CONTINGENCIES),
    reasonCode: safeReasonCodeSchema.nullable(),
  })
  .strict();

const technicalFailureSchema = z
  .object({
    reasonCode: safeReasonCodeSchema,
    occurredAtUtc: utcInstantSchema,
  })
  .strict();

const fallbackTransitionSchema = z
  .object({
    fromModality: z.enum(VIRTUAL_CARE_MODALITIES),
    toModality: z.enum(VIRTUAL_CARE_MODALITIES),
    approved: z.boolean(),
    renewedGuardsConfirmed: z.boolean(),
    approvedAtUtc: utcInstantSchema.nullable(),
  })
  .strict();

const vendorWebhookReceiptSchema = z
  .object({
    eventType: z.string().min(1).max(64),
    signatureValid: z.boolean(),
    outcome: z.enum(VIRTUAL_CARE_VENDOR_WEBHOOK_OUTCOMES),
    mappedVisitRef: opaqueRefSchema.nullable(),
  })
  .strict();

const secureMessageSchema = z
  .object({
    authorRole: z.enum(["patient", "pharmacist"]),
    receivedAtUtc: utcInstantSchema,
    correctionOfMessageId: opaqueRefSchema.nullable(),
  })
  .strict();

const secureMessageThreadSchema = z
  .object({
    state: z.enum(VIRTUAL_CARE_MESSAGE_THREAD_STATES),
    messages: z.array(secureMessageSchema),
  })
  .strict();

const assessmentGuardOutcomeSchema = z
  .object({
    attempted: z.boolean(),
    allowed: z.boolean(),
    denialReason: safeReasonCodeSchema.nullable(),
  })
  .strict();

const serviceAvailabilitySchema = z
  .object({
    task02Available: z.boolean(),
    task05Available: z.boolean(),
    task11ReleaseGateVerified: z.boolean(),
  })
  .strict();

export const virtualCareWorldSchema = z
  .object({
    fixtureContractVersion: z.literal(VIRTUAL_CARE_FIXTURE_CONTRACT_VERSION),
    scenario: virtualCareScenarioSchema,
    label: z.string().min(1).max(120),
    visitId: opaqueRefSchema,
    pharmacyId: pharmacyIdSchema,
    patientSubjectRef: opaqueRefSchema,
    patientActorRef: opaqueRefSchema,
    pharmacistActorRef: opaqueRefSchema.nullable(),
    requestedModality: z.enum(VIRTUAL_CARE_MODALITIES),
    approvedModality: z.enum(VIRTUAL_CARE_MODALITIES).nullable(),
    workflowState: z.enum(VIRTUAL_CARE_WORKFLOW_STATES),
    connectionState: z.enum(VIRTUAL_CARE_CONNECTION_STATES),
    stateVersion: z.number().int().positive(),
    createdAtUtc: utcInstantSchema,
    scheduledAtUtc: utcInstantSchema.nullable(),
    startedAtUtc: utcInstantSchema.nullable(),
    interruptedAtUtc: utcInstantSchema.nullable(),
    resumedAtUtc: utcInstantSchema.nullable(),
    endedAtUtc: utcInstantSchema.nullable(),
    pharmacistCompletionActorRef: opaqueRefSchema.nullable(),
    pharmacistCompletionAtUtc: utcInstantSchema.nullable(),
    participants: z.array(participantSchema),
    consent: consentEventSchema,
    identityLocation: identityLocationSchema,
    privacyConfirmation: privacyConfirmationSchema,
    suitability: suitabilityDecisionSchema,
    technologyReadiness: z.array(technologyReadinessResultSchema),
    contingencyPlan: contingencyPlanSchema.nullable(),
    technicalFailure: technicalFailureSchema.nullable(),
    fallbackTransition: fallbackTransitionSchema.nullable(),
    vendorWebhookReceipt: vendorWebhookReceiptSchema.nullable(),
    messageThread: secureMessageThreadSchema.nullable(),
    assessmentGuard: assessmentGuardOutcomeSchema,
    claimGuard: assessmentGuardOutcomeSchema,
    serviceAvailability: serviceAvailabilitySchema,
    joinDenialReason: z.enum(VIRTUAL_CARE_JOIN_DENIAL_REASONS).nullable(),
    leakageMarker: z.literal("SYNTHETIC-LEAKAGE-MARKER-006"),
  })
  .strict();

export type VirtualCareWorld = z.infer<typeof virtualCareWorldSchema>;

export function parseVirtualCareWorld(input: unknown): VirtualCareWorld {
  const parsed = virtualCareWorldSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("TASK06_INVALID_VIRTUAL_CARE_FIXTURE");
  }
  return parsed.data;
}
