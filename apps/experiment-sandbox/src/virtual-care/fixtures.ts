import {
  VIRTUAL_CARE_FIXTURE_CONTRACT_VERSION,
  VIRTUAL_CARE_SCENARIOS,
  type VirtualCareScenario,
  type VirtualCareWorld,
  parseVirtualCareWorld,
  virtualCareScenarioSchema,
} from "./contracts";

/**
 * Task 06 — deterministic synthetic virtual-care fixtures.
 *
 * Covers every scenario required by docs/tasks/autonomous-pharmacy/
 * TASK-06-virtual-care.md, Workstream L "Required synthetic scenarios".
 * No real people, pharmacies, addresses, phone numbers, emails,
 * health-card numbers, meeting links, or clinical records appear anywhere
 * in this file. No vendor or network call is made. The clock and
 * synthetic Ontario timezone below are fixed, not computed from the
 * runtime environment.
 */

export const VIRTUAL_CARE_SYNTHETIC_TIMEZONE = "America/Toronto" as const;

const CREATED_AT_UTC = "2026-08-11T14:00:00.000Z";
const SCHEDULED_AT_UTC = "2026-08-11T14:30:00.000Z";
const STARTED_AT_UTC = "2026-08-11T15:00:00.000Z";
const MID_VISIT_UTC = "2026-08-11T15:10:00.000Z";
const RESUMED_AT_UTC = "2026-08-11T15:14:00.000Z";
const ENDED_AT_UTC = "2026-08-11T15:20:00.000Z";
export const VIRTUAL_CARE_FIXTURE_NOW_UTC = STARTED_AT_UTC;

const PHARMACY = "SYNTH-PHARMACY-TASK06-LOCAL";
const PATIENT_SUBJECT = "SYNTH-PATIENT-006-0001";
const WRONG_PATIENT_SUBJECT = "SYNTH-PATIENT-006-WRONG";
const PHARMACIST_ACTOR = "SYNTH-PHARMACIST-006-0001";
const DELEGATE_ACTOR = "SYNTH-DELEGATE-006-0001";
const SUPPORT_ACTOR = "SYNTH-SUPPORT-006-0001";
const INTERPRETER_ACTOR = "SYNTH-INTERPRETER-006-0001";

function slugId(scenario: VirtualCareScenario): string {
  return `SYNTH-VISIT-006-${scenario.toUpperCase().replaceAll("_", "-")}`;
}

function label(scenario: VirtualCareScenario): string {
  return `SYNTHETIC-VISIT-006 (${scenario})`;
}

type Participant = VirtualCareWorld["participants"][number];
type TechResult = VirtualCareWorld["technologyReadiness"][number];

function participant(overrides: Partial<Participant> & Pick<Participant, "actorRef" | "role">): Participant {
  return {
    id: `SYNTH-PARTICIPANT-006-${overrides.actorRef.replace(/^SYNTH-/, "")}`,
    authorizationState: "admitted",
    deniedReason: null,
    disclosedToPatientAtUtc: STARTED_AT_UTC,
    joinedAtUtc: STARTED_AT_UTC,
    leftAtUtc: null,
    grant: null,
    ...overrides,
  };
}

const DEFAULT_PARTICIPANTS: Participant[] = [
  participant({ actorRef: PATIENT_SUBJECT, role: "patient" }),
  participant({ actorRef: PHARMACIST_ACTOR, role: "pharmacist" }),
];

const DEFAULT_TECH: TechResult[] = [
  { checkType: "browser", safeResultCategory: "pass", reasonCode: null },
  { checkType: "camera", safeResultCategory: "pass", reasonCode: null },
  { checkType: "microphone", safeResultCategory: "pass", reasonCode: null },
  { checkType: "speaker", safeResultCategory: "pass", reasonCode: null },
  { checkType: "network", safeResultCategory: "pass", reasonCode: null },
  { checkType: "bandwidth", safeResultCategory: "pass", reasonCode: null },
];

function techWith(checkType: TechResult["checkType"], patch: Partial<TechResult>): TechResult[] {
  return DEFAULT_TECH.map((entry) =>
    entry.checkType === checkType ? { ...entry, ...patch } : entry,
  );
}

const DEFAULT_ASSESSMENT_GUARD: VirtualCareWorld["assessmentGuard"] = {
  attempted: false,
  allowed: false,
  denialReason: null,
};

const DEFAULT_SERVICE_AVAILABILITY: VirtualCareWorld["serviceAvailability"] = {
  task02Available: true,
  task05Available: true,
  task11ReleaseGateVerified: true,
};

function baseWorld(
  scenario: VirtualCareScenario,
  overrides: Partial<VirtualCareWorld>,
): VirtualCareWorld {
  const defaults: VirtualCareWorld = {
    fixtureContractVersion: VIRTUAL_CARE_FIXTURE_CONTRACT_VERSION,
    scenario,
    label: label(scenario),
    visitId: slugId(scenario),
    pharmacyId: PHARMACY,
    patientSubjectRef: PATIENT_SUBJECT,
    patientActorRef: PATIENT_SUBJECT,
    pharmacistActorRef: PHARMACIST_ACTOR,
    requestedModality: "video",
    approvedModality: "video",
    workflowState: "in_progress",
    connectionState: "connected",
    stateVersion: 1,
    createdAtUtc: CREATED_AT_UTC,
    scheduledAtUtc: SCHEDULED_AT_UTC,
    startedAtUtc: STARTED_AT_UTC,
    interruptedAtUtc: null,
    resumedAtUtc: null,
    endedAtUtc: null,
    pharmacistCompletionActorRef: null,
    pharmacistCompletionAtUtc: null,
    participants: DEFAULT_PARTICIPANTS,
    consent: {
      state: "granted",
      modality: "video",
      scope: ["collect_use_disclose", "modality"],
      noticeVersion: "TASK06-NOTICE-V1",
      effectiveAtUtc: CREATED_AT_UTC,
      withdrawnAtUtc: null,
    },
    identityLocation: {
      identityOutcome: "confirmed",
      jurisdiction: "ON",
      crossJurisdictionalBlocked: false,
    },
    privacyConfirmation: { confirmed: true },
    suitability: { state: "SUITABLE", modality: "video", reasonCode: null },
    technologyReadiness: DEFAULT_TECH,
    contingencyPlan: null,
    technicalFailure: null,
    fallbackTransition: null,
    vendorWebhookReceipt: null,
    messageThread: null,
    assessmentGuard: DEFAULT_ASSESSMENT_GUARD,
    claimGuard: DEFAULT_ASSESSMENT_GUARD,
    serviceAvailability: DEFAULT_SERVICE_AVAILABILITY,
    joinDenialReason: null,
    leakageMarker: "SYNTHETIC-LEAKAGE-MARKER-006",
  };
  return parseVirtualCareWorld({ ...defaults, ...overrides });
}

const TELEPHONE_TECH = DEFAULT_TECH.filter((entry) => entry.checkType !== "camera");

const FIXTURES = Object.freeze({
  authorized_patient_waiting: baseWorld("authorized_patient_waiting", {
    workflowState: "waiting",
    startedAtUtc: null,
    suitability: { state: "PENDING", modality: "video", reasonCode: null },
    participants: [participant({ actorRef: PATIENT_SUBJECT, role: "patient", authorizationState: "waiting" })],
  }),

  valid_video_visit: baseWorld("valid_video_visit", {}),

  valid_telephone_visit: baseWorld("valid_telephone_visit", {
    requestedModality: "telephone",
    approvedModality: "telephone",
    consent: {
      state: "granted",
      modality: "telephone",
      scope: ["collect_use_disclose", "modality"],
      noticeVersion: "TASK06-NOTICE-V1",
      effectiveAtUtc: CREATED_AT_UTC,
      withdrawnAtUtc: null,
    },
    suitability: { state: "SUITABLE", modality: "telephone", reasonCode: null },
    technologyReadiness: TELEPHONE_TECH,
  }),

  valid_secure_message_thread: baseWorld("valid_secure_message_thread", {
    requestedModality: "secure_messaging",
    approvedModality: "secure_messaging",
    workflowState: "ready",
    startedAtUtc: null,
    consent: {
      state: "granted",
      modality: "secure_messaging",
      scope: ["collect_use_disclose", "modality"],
      noticeVersion: "TASK06-NOTICE-V1",
      effectiveAtUtc: CREATED_AT_UTC,
      withdrawnAtUtc: null,
    },
    messageThread: {
      state: "open",
      messages: [
        { authorRole: "patient", receivedAtUtc: STARTED_AT_UTC, correctionOfMessageId: null },
        { authorRole: "pharmacist", receivedAtUtc: MID_VISIT_UTC, correctionOfMessageId: null },
      ],
    },
  }),

  patient_chooses_telephone_over_video: baseWorld("patient_chooses_telephone_over_video", {
    requestedModality: "video",
    approvedModality: "telephone",
    suitability: { state: "SUITABLE", modality: "telephone", reasonCode: "patient_preference" },
  }),

  camera_permission_denied: baseWorld("camera_permission_denied", {
    workflowState: "waiting",
    connectionState: "connecting",
    startedAtUtc: null,
    suitability: { state: "PENDING", modality: "video", reasonCode: null },
    technologyReadiness: techWith("camera", { safeResultCategory: "fail", reasonCode: "permission_denied" }),
  }),

  microphone_unavailable: baseWorld("microphone_unavailable", {
    workflowState: "waiting",
    connectionState: "connecting",
    startedAtUtc: null,
    suitability: { state: "PENDING", modality: "video", reasonCode: null },
    technologyReadiness: techWith("microphone", { safeResultCategory: "fail", reasonCode: "device_unavailable" }),
  }),

  no_speaker_output: baseWorld("no_speaker_output", {
    workflowState: "waiting",
    connectionState: "connecting",
    startedAtUtc: null,
    suitability: { state: "PENDING", modality: "video", reasonCode: null },
    technologyReadiness: techWith("speaker", { safeResultCategory: "fail", reasonCode: "no_output_device" }),
  }),

  unsupported_browser: baseWorld("unsupported_browser", {
    workflowState: "waiting",
    connectionState: "connecting",
    startedAtUtc: null,
    suitability: { state: "PENDING", modality: "video", reasonCode: null },
    technologyReadiness: techWith("browser", { safeResultCategory: "fail", reasonCode: "unsupported_browser" }),
  }),

  low_bandwidth: baseWorld("low_bandwidth", {
    workflowState: "waiting",
    connectionState: "degraded",
    startedAtUtc: null,
    suitability: { state: "PENDING", modality: "video", reasonCode: null },
    technologyReadiness: techWith("bandwidth", { safeResultCategory: "degraded", reasonCode: "low_bandwidth" }),
  }),

  video_connection_degraded: baseWorld("video_connection_degraded", {
    connectionState: "degraded",
  }),

  disconnect_before_clinical_interaction: baseWorld("disconnect_before_clinical_interaction", {
    workflowState: "waiting",
    connectionState: "disconnected",
    startedAtUtc: null,
  }),

  disconnect_during_clinical_interaction: baseWorld("disconnect_during_clinical_interaction", {
    workflowState: "interrupted",
    connectionState: "disconnected",
    interruptedAtUtc: MID_VISIT_UTC,
  }),

  successful_guarded_reconnect: baseWorld("successful_guarded_reconnect", {
    workflowState: "in_progress",
    connectionState: "connected",
    interruptedAtUtc: MID_VISIT_UTC,
    resumedAtUtc: RESUMED_AT_UTC,
  }),

  reconnect_after_expiry: baseWorld("reconnect_after_expiry", {
    workflowState: "ended",
    connectionState: "disconnected",
    endedAtUtc: ENDED_AT_UTC,
    joinDenialReason: "visit_terminal",
  }),

  duplicate_tab: baseWorld("duplicate_tab", {}),

  concurrent_device: baseWorld("concurrent_device", {}),

  wrong_patient_join: baseWorld("wrong_patient_join", {
    workflowState: "waiting",
    startedAtUtc: null,
    participants: [],
    joinDenialReason: "wrong_patient",
  }),

  wrong_pharmacy_join: baseWorld("wrong_pharmacy_join", {
    workflowState: "waiting",
    startedAtUtc: null,
    participants: [],
    joinDenialReason: "wrong_pharmacy",
  }),

  expired_join: baseWorld("expired_join", {
    workflowState: "waiting",
    startedAtUtc: null,
    participants: [],
    joinDenialReason: "expired_credential",
  }),

  replayed_join: baseWorld("replayed_join", {
    workflowState: "waiting",
    startedAtUtc: null,
    participants: [],
    joinDenialReason: "replayed_credential",
  }),

  forwarded_join: baseWorld("forwarded_join", {
    workflowState: "waiting",
    startedAtUtc: null,
    participants: [],
    joinDenialReason: "forwarded_credential",
  }),

  patient_token_at_pharmacist_boundary: baseWorld("patient_token_at_pharmacist_boundary", {
    workflowState: "waiting",
    startedAtUtc: null,
    joinDenialReason: "wrong_audience",
    participants: [
      participant({
        actorRef: PATIENT_SUBJECT,
        role: "patient",
        authorizationState: "denied",
        deniedReason: "wrong_audience",
        joinedAtUtc: null,
      }),
    ],
  }),

  pharmacist_token_at_patient_boundary: baseWorld("pharmacist_token_at_patient_boundary", {
    workflowState: "waiting",
    startedAtUtc: null,
    joinDenialReason: "wrong_audience",
    participants: [
      participant({
        actorRef: PHARMACIST_ACTOR,
        role: "patient",
        authorizationState: "denied",
        deniedReason: "wrong_audience",
        joinedAtUtc: null,
      }),
    ],
  }),

  active_delegate_correct_scope: baseWorld("active_delegate_correct_scope", {
    participants: [
      ...DEFAULT_PARTICIPANTS,
      participant({
        actorRef: DELEGATE_ACTOR,
        role: "delegate",
        grant: {
          subjectRef: PATIENT_SUBJECT,
          scope: "full",
          validFromUtc: CREATED_AT_UTC,
          expiresAtUtc: ENDED_AT_UTC,
          revokedAtUtc: null,
        },
      }),
    ],
  }),

  expired_delegate: baseWorld("expired_delegate", {
    joinDenialReason: "delegate_expired",
    participants: [
      ...DEFAULT_PARTICIPANTS,
      participant({
        actorRef: DELEGATE_ACTOR,
        role: "delegate",
        authorizationState: "denied",
        deniedReason: "delegate_expired",
        joinedAtUtc: null,
        grant: {
          subjectRef: PATIENT_SUBJECT,
          scope: "full",
          validFromUtc: CREATED_AT_UTC,
          expiresAtUtc: CREATED_AT_UTC,
          revokedAtUtc: null,
        },
      }),
    ],
  }),

  revoked_delegate: baseWorld("revoked_delegate", {
    joinDenialReason: "delegate_revoked",
    participants: [
      ...DEFAULT_PARTICIPANTS,
      participant({
        actorRef: DELEGATE_ACTOR,
        role: "delegate",
        authorizationState: "denied",
        deniedReason: "delegate_revoked",
        joinedAtUtc: null,
        grant: {
          subjectRef: PATIENT_SUBJECT,
          scope: "full",
          validFromUtc: CREATED_AT_UTC,
          expiresAtUtc: ENDED_AT_UTC,
          revokedAtUtc: MID_VISIT_UTC,
        },
      }),
    ],
  }),

  wrong_subject_delegate: baseWorld("wrong_subject_delegate", {
    joinDenialReason: "delegate_wrong_subject",
    participants: [
      ...DEFAULT_PARTICIPANTS,
      participant({
        actorRef: DELEGATE_ACTOR,
        role: "delegate",
        authorizationState: "denied",
        deniedReason: "delegate_wrong_subject",
        joinedAtUtc: null,
        grant: {
          subjectRef: WRONG_PATIENT_SUBJECT,
          scope: "full",
          validFromUtc: CREATED_AT_UTC,
          expiresAtUtc: ENDED_AT_UTC,
          revokedAtUtc: null,
        },
      }),
    ],
  }),

  unauthorized_support_person: baseWorld("unauthorized_support_person", {
    participants: [
      ...DEFAULT_PARTICIPANTS,
      participant({
        actorRef: SUPPORT_ACTOR,
        role: "support_person",
        authorizationState: "denied",
        deniedReason: "not_disclosed",
        disclosedToPatientAtUtc: null,
        joinedAtUtc: null,
      }),
    ],
  }),

  authorized_interpreter_or_support_person: baseWorld("authorized_interpreter_or_support_person", {
    participants: [
      ...DEFAULT_PARTICIPANTS,
      participant({ actorRef: INTERPRETER_ACTOR, role: "interpreter" }),
    ],
  }),

  participant_removed: baseWorld("participant_removed", {
    participants: [
      participant({ actorRef: PATIENT_SUBJECT, role: "patient" }),
      participant({
        actorRef: SUPPORT_ACTOR,
        role: "support_person",
        authorizationState: "removed",
        leftAtUtc: MID_VISIT_UTC,
      }),
    ],
  }),

  location_outside_approved_jurisdiction: baseWorld("location_outside_approved_jurisdiction", {
    workflowState: "waiting",
    startedAtUtc: null,
    identityLocation: {
      identityOutcome: "confirmed",
      jurisdiction: "NON_CANADIAN",
      crossJurisdictionalBlocked: true,
    },
  }),

  consent_pending: baseWorld("consent_pending", {
    workflowState: "waiting",
    startedAtUtc: null,
    consent: {
      state: "pending",
      modality: "video",
      scope: ["collect_use_disclose", "modality"],
      noticeVersion: "TASK06-NOTICE-V1",
      effectiveAtUtc: null,
      withdrawnAtUtc: null,
    },
  }),

  consent_withdrawn_before_visit: baseWorld("consent_withdrawn_before_visit", {
    workflowState: "waiting",
    startedAtUtc: null,
    consent: {
      state: "withdrawn",
      modality: "video",
      scope: ["collect_use_disclose", "modality"],
      noticeVersion: "TASK06-NOTICE-V1",
      effectiveAtUtc: CREATED_AT_UTC,
      withdrawnAtUtc: SCHEDULED_AT_UTC,
    },
  }),

  consent_withdrawn_during_visit: baseWorld("consent_withdrawn_during_visit", {
    workflowState: "interrupted",
    interruptedAtUtc: MID_VISIT_UTC,
    consent: {
      state: "withdrawn",
      modality: "video",
      scope: ["collect_use_disclose", "modality"],
      noticeVersion: "TASK06-NOTICE-V1",
      effectiveAtUtc: CREATED_AT_UTC,
      withdrawnAtUtc: MID_VISIT_UTC,
    },
  }),

  privacy_confirmation_incomplete: baseWorld("privacy_confirmation_incomplete", {
    workflowState: "waiting",
    startedAtUtc: null,
    privacyConfirmation: { confirmed: false },
  }),

  suitability_video_suitable: baseWorld("suitability_video_suitable", {
    workflowState: "ready",
    startedAtUtc: null,
    suitability: { state: "SUITABLE", modality: "video", reasonCode: null },
  }),

  suitability_video_suitable_with_limitations: baseWorld("suitability_video_suitable_with_limitations", {
    workflowState: "ready",
    startedAtUtc: null,
    suitability: {
      state: "SUITABLE_WITH_LIMITATIONS",
      modality: "video",
      reasonCode: "limited_visual_assessment",
    },
  }),

  suitability_video_unsuitable: baseWorld("suitability_video_unsuitable", {
    workflowState: "waiting",
    startedAtUtc: null,
    approvedModality: null,
    suitability: { state: "UNSUITABLE", modality: "video", reasonCode: "requires_in_person_exam" },
  }),

  suitability_telephone_unsuitable: baseWorld("suitability_telephone_unsuitable", {
    workflowState: "waiting",
    startedAtUtc: null,
    requestedModality: "telephone",
    approvedModality: null,
    suitability: { state: "UNSUITABLE", modality: "telephone", reasonCode: "requires_visual_assessment" },
  }),

  fallback_in_person_selected: baseWorld("fallback_in_person_selected", {
    workflowState: "ended",
    endedAtUtc: ENDED_AT_UTC,
    approvedModality: null,
    suitability: { state: "UNSUITABLE", modality: "video", reasonCode: "requires_in_person_exam" },
    contingencyPlan: { approvedContingency: "in_person", reasonCode: "video_unsuitable" },
  }),

  fallback_referral_selected: baseWorld("fallback_referral_selected", {
    workflowState: "ended",
    endedAtUtc: ENDED_AT_UTC,
    approvedModality: null,
    suitability: { state: "UNSUITABLE", modality: "video", reasonCode: "beyond_scope" },
    contingencyPlan: { approvedContingency: "referral", reasonCode: "beyond_scope" },
  }),

  technical_failure_with_approved_fallback: baseWorld("technical_failure_with_approved_fallback", {
    approvedModality: "telephone",
    technicalFailure: { reasonCode: "connection_lost", occurredAtUtc: MID_VISIT_UTC },
    fallbackTransition: {
      fromModality: "video",
      toModality: "telephone",
      approved: true,
      renewedGuardsConfirmed: true,
      approvedAtUtc: RESUMED_AT_UTC,
    },
  }),

  technical_failure_without_fallback: baseWorld("technical_failure_without_fallback", {
    workflowState: "interrupted",
    connectionState: "failed",
    interruptedAtUtc: MID_VISIT_UTC,
    technicalFailure: { reasonCode: "connection_lost", occurredAtUtc: MID_VISIT_UTC },
  }),

  patient_leaves_voluntarily: baseWorld("patient_leaves_voluntarily", {
    workflowState: "ended",
    endedAtUtc: MID_VISIT_UTC,
    participants: [
      participant({
        actorRef: PATIENT_SUBJECT,
        role: "patient",
        authorizationState: "left",
        leftAtUtc: MID_VISIT_UTC,
      }),
      participant({ actorRef: PHARMACIST_ACTOR, role: "pharmacist" }),
    ],
  }),

  visit_times_out: baseWorld("visit_times_out", {
    workflowState: "ended",
    connectionState: "offline",
    startedAtUtc: null,
    endedAtUtc: ENDED_AT_UTC,
    participants: [],
  }),

  vendor_meeting_ended_event: baseWorld("vendor_meeting_ended_event", {
    vendorWebhookReceipt: {
      eventType: "meeting_ended",
      signatureValid: true,
      outcome: "accepted",
      mappedVisitRef: slugId("vendor_meeting_ended_event"),
    },
  }),

  assessment_guard_failure: baseWorld("assessment_guard_failure", {
    assessmentGuard: { attempted: true, allowed: false, denialReason: "suitability_not_current" },
  }),

  claim_guard_failure: baseWorld("claim_guard_failure", {
    assessmentGuard: { attempted: true, allowed: true, denialReason: null },
    claimGuard: { attempted: true, allowed: false, denialReason: "visit_not_completed" },
  }),

  unknown_state: baseWorld("unknown_state", {
    workflowState: "unknown",
    connectionState: "unknown",
    joinDenialReason: "unknown_state",
  }),

  vendor_outage: baseWorld("vendor_outage", {
    workflowState: "interrupted",
    connectionState: "failed",
    interruptedAtUtc: MID_VISIT_UTC,
    technicalFailure: { reasonCode: "vendor_outage", occurredAtUtc: MID_VISIT_UTC },
  }),

  task02_unavailable: baseWorld("task02_unavailable", {
    serviceAvailability: { ...DEFAULT_SERVICE_AVAILABILITY, task02Available: false },
    assessmentGuard: { attempted: true, allowed: false, denialReason: "task02_unavailable" },
  }),

  task05_unavailable: baseWorld("task05_unavailable", {
    workflowState: "waiting",
    startedAtUtc: null,
    serviceAvailability: { ...DEFAULT_SERVICE_AVAILABILITY, task05Available: false },
    identityLocation: {
      identityOutcome: "failed",
      jurisdiction: "ON",
      crossJurisdictionalBlocked: false,
    },
  }),

  task11_release_gate_blocked: baseWorld("task11_release_gate_blocked", {
    serviceAvailability: { ...DEFAULT_SERVICE_AVAILABILITY, task11ReleaseGateVerified: false },
    assessmentGuard: { attempted: true, allowed: false, denialReason: "release_gate_not_verified" },
    claimGuard: { attempted: true, allowed: false, denialReason: "release_gate_not_verified" },
  }),
} satisfies Record<VirtualCareScenario, VirtualCareWorld>);

for (const value of Object.values(FIXTURES)) Object.freeze(value);

const SERVER_OWNED_FIXTURES = new WeakSet<object>(Object.values(FIXTURES));

export function isServerOwnedVirtualCareFixture(value: unknown): boolean {
  return typeof value === "object" && value !== null && SERVER_OWNED_FIXTURES.has(value);
}

export function virtualCareFixture(scenarioInput: unknown): VirtualCareWorld | undefined {
  const scenario = virtualCareScenarioSchema.safeParse(scenarioInput);
  return scenario.success ? FIXTURES[scenario.data] : undefined;
}

export function allVirtualCareFixtures(): readonly VirtualCareWorld[] {
  return VIRTUAL_CARE_SCENARIOS.map((scenario) => FIXTURES[scenario]);
}

export { VIRTUAL_CARE_SCENARIOS };
export const VIRTUAL_CARE_FIXTURE_COUNT = VIRTUAL_CARE_SCENARIOS.length;
