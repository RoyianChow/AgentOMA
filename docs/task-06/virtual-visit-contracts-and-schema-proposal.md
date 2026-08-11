# Task 06 — Virtual-Visit Contracts and Schema Proposal

**No production migration is applied by this document.** Everything below is a server-only
conceptual contract for review. Production application requires the lead's explicit
`db:generate` → `db:migrate` sign-off (`AGENTS.md`), which this task does not grant.

All identifiers below are opaque (UUID-shaped or equivalent). None of them encode a name,
health-card number, address, or clinical content — per the task's explicit prohibition.

---

## 1. The orthogonal state model

Reproduced from the task brief and adopted as-is, because it is exactly correct for this
codebase's existing bias toward database-enforced, non-overloaded state (mirrors how
`assessment` already keeps `outcome`, `retain_until`, and billability evidence as separate
concerns rather than one status field):

| Dimension | Example values | Authority |
|---|---|---|
| Visit workflow | Draft, scheduled, waiting, ready, in progress, interrupted, ended | Visit service, pharmacist-controlled completion |
| Modality | Telephone, video, secure messaging, in-person fallback | Pharmacist decision + patient choice |
| Connection | Offline, connecting, connected, degraded, disconnected, failed | Technical subsystem |
| Identity/location | Pending, confirmed, failed, expired | Approved verification workflow |
| Consent | Pending, granted, withdrawn, superseded | Patient or authorized agent |
| Suitability | Pending, suitable, suitable with limitations, unsuitable, reassessment required | Pharmacist only |
| Participant authorization | Invited, waiting, admitted, denied, removed, left | Server authorization + pharmacist controls |
| Clinical assessment | Not linked, linked, in progress, completed, finalized | Existing Task 02 clinical workflow |
| Claim | Ineligible, pending existing guards, eligible, submitted, rejected | Existing billing workflow only |

**Hard rule carried into every contract below:** a transition in one dimension must never
silently transition another. `connection = disconnected` never sets `visit = completed`.
`vendor_event = meeting_ended` finalizes nothing. See the failure-and-contingency state machine
(Workstream H) for the full transition table.

---

## 2. Entity contracts

Each table lists only the fields load-bearing for this task's invariants — not necessarily
exhaustive of every column a real implementation would eventually need.

**Revision note (2026-08-11):** every entity below now carries the same 12-property treatment
`VirtualVisit` already had — Field, Meaning, Type, Nullable, Source of truth, Trusted actor,
PHI class, Client-safe?, Auth required, Retention owner, Staleness, Prod approval — instead of
an abbreviated prose or partial-table summary. This closes the gap between this document and
the task's field-by-field expectation, the same way the threat model's per-threat rework did.

### `VirtualVisit`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque visit identifier | UUID | No | Visit service | Server-generated | Not PHI itself (opaque) | Client-safe (reference only) | N/A | Visit service | N/A | Yes (migration) |
| `pharmacyId` | Custodian/pharmacy scope | UUID (FK) | No | `pharmacy` table (existing) | Server (`requirePortalUser`) | Not PHI | Server-only in queries; never client-supplied | Every read/write | Visit service | N/A | Yes |
| `patientSubjectRef` | Opaque patient-subject reference | UUID | No (once assigned) | Synthetic patient identity (prototype) / Task 05 (production) | Server | PHI-adjacent (identifies a person) | Server-only | Every read/write | Visit service | Stale if subject record deleted/merged | Yes |
| `patientActorRef` | Opaque patient-actor reference (may differ from subject for delegated access) | UUID | Yes | Same as above | Server | PHI-adjacent | Server-only | Every read/write | Visit service | Same | Yes |
| `pharmacistActorRef` | Opaque pharmacist-actor reference | UUID | Yes (null before assignment) | `user` (existing `better-auth` table) | Server (`requirePortalUser`) | Not PHI | Server-only | Every write | Visit service | N/A | Yes |
| `appointmentRef` | Optional appointment reference | UUID | Yes | Task 04 (does not exist yet — see current-state analysis) | Server | Not PHI (opaque) | Server-only | Read | Visit service | Always stale until Task 04 exists | Yes |
| `assessmentRef` | Optional assessment reference | UUID | Yes | `assessment` (existing, Task 02) | Server | Not PHI (opaque) | Server-only | Read/write per Workstream J guards | Task 02 | Rechecked at every guard point | Yes |
| `requestedModality` | Modality the patient requested | enum | No | Patient input, server-recorded | Server | Not PHI | Client-safe (own request only) | Session | Visit service | N/A | Yes |
| `approvedModality` | Modality the pharmacist approved | enum | Yes | Pharmacist, server-recorded | Server (pharmacist role only) | Not PHI | Server-only until approved | Pharmacist role | Visit service | Rechecked on every modality switch | Yes |
| `workflowState` | Visit workflow dimension | enum (see §1) | No | Visit service | Server | Not PHI | Client-safe (own visit) | Every transition | Visit service | N/A | Yes |
| `connectionState` | Connection dimension | enum | No | Technical subsystem | Server | Not PHI | Client-safe | Every transition | Visit service | Recomputed live | Yes |
| `suitabilityStateRef` | Reference to latest `ModalitySuitabilityDecision` | UUID | Yes | Suitability record | Server (pharmacist-authored) | Not PHI (reference) | Server-only | Pharmacist role | Visit service | Rechecked per §1 rule | Yes |
| `consentEventRef` | Reference to latest `VirtualCareConsentEvent` | UUID | Yes | Consent record | Server | Not PHI (reference) | Server-only | Every gate check | Visit service | Rechecked at dispatch/interaction | Yes |
| `identityLocationCheckRef` | Reference to latest `IdentityAndLocationCheck` | UUID | Yes | Identity/location record | Server | Not PHI (reference) | Server-only | Every gate check | Visit service | Rechecked per interruption/modality change | Yes |
| `contingencyPlanRef` | Reference to `ContingencyPlan` | UUID | Yes | Contingency record | Server (pharmacist) | Not PHI (reference) | Server-only | Pharmacist role | Visit service | On fallback | Yes |
| `participantRosterRef` | Reference to the participant list | Collection ref | No | `VisitParticipant` rows | Server | PHI-adjacent (who's present) | Server-only, pharmacist-visible summary only | Every admission/removal | Visit service | Live | Yes |
| `createdAt` / `scheduledAt` / `startedAt` / `interruptedAt` / `resumedAt` / `endedAt` | Lifecycle timestamps | timestamptz | Yes (except `createdAt`) | Visit service | Server | Not PHI | Client-safe (own visit) | N/A | Visit service | N/A | Yes |
| `pharmacistCompletionActorRef` / `pharmacistCompletionAt` | Who/when marked professional completion | UUID / timestamptz | Yes until completed | Visit service | Server (pharmacist role only) | Not PHI | Server-only | Pharmacist role, explicit action only | Visit service | N/A — immutable once set | Yes |
| `technicalFailureIndicator` / `technicalFailureReasonCode` | Safe, enumerated failure flag + reason | boolean / enum | Yes | Technical subsystem | Server | Not PHI (must be a safe code, never free text) | Client-safe (safe code only) | N/A | Visit service | N/A | Yes |
| `fallbackTransitionRef` | Reference to a `FallbackTransition`, if any | UUID | Yes | Fallback record | Server (pharmacist-approved) | Not PHI (reference) | Server-only | Pharmacist role | Visit service | N/A | Yes |
| `vendorSessionRef` | Reference to `VendorSessionReference` | UUID | Yes (null for telephone-only, no-vendor visits) | Vendor adapter | Server | Not PHI (opaque) | Server-only | N/A | Visit service | Vendor-side staleness possible — reconciled, never trusted blindly | Yes |
| `vendorVerificationEvidenceVersion` | Which Ontario Health verification evidence snapshot applied at visit time | string/version ref | Yes | Vendor-evaluation record (Workstream B) | Server | Not PHI | Server-only | N/A | Product/compliance | Must be re-pinned if evidence changes | Yes |
| `stateVersion` | Optimistic-concurrency token | integer | No | Visit service | Server | Not PHI | Server-only | Every write | Visit service | Incremented on every write | Yes |
| `auditRefs` | References to `VirtualVisitAuditEvent` rows | Collection ref | No | Audit service (existing pattern) | Server | Not PHI (references) | Server-only | N/A | Audit service | Append-only | Yes |

### `VisitModality`

Reference/lookup entity (mirrors the existing `ailment_group`/`pin` seeded-reference pattern —
not user-writable).

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `code` | Modality identifier (telephone/video/secure_messaging/in_person) | enum/text | No | Seeded reference table | Server (seed only, not user-writable) | Not PHI | Client-safe | N/A — public lookup | Product/config owner | Versioned, not live-recomputed | Yes (migration + seed) |
| `label` | Display label | text | No | Same | Server | Not PHI | Client-safe | N/A | Same | Same | Yes |
| `requiresVendor` | Whether a vendor session is required (false for telephone, per Workstream B's exception) | boolean | No | Same | Server | Not PHI | Client-safe | N/A | Same | Same | Yes |
| `effectiveDate` | When this modality option became available | date | No | Same | Server | Not PHI | Client-safe | N/A | Same | Same | Yes |
| `endDate` | When this modality option was retired, if applicable | date | Yes | Same | Server | Not PHI | Client-safe | N/A | Same | Same | Yes |

### `VisitParticipant`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque participant row id | UUID | No | Visit service | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | Every read/write | Visit service | N/A | Yes |
| `actorRef` | Opaque actor reference — never a name | UUID | No | Synthetic identity (prototype) / Task 05 (production) | Server | PHI-adjacent | Server-only | Every read/write | Visit service | Stale if actor record deleted/merged | Yes |
| `role` | patient / pharmacist / delegate / support-person / interpreter | enum | No | Admission decision | Server (pharmacist for non-patient roles) | Not PHI | Server-only, pharmacist-visible label only | Every action, rechecked not cached (threat #11) | Visit service | Rechecked per action | Yes |
| `authorizationRef` | FK to `ParticipantAuthorization` | UUID | No | Authorization record | Server | Not PHI (reference) | Server-only | Every admission/removal | Visit service | Live | Yes |
| `disclosedToPatientAt` | When the patient was shown this participant | timestamptz | Yes (null until disclosed) | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A — enforces "no hidden participant" | Yes |
| `joinedAt` | When this participant joined | timestamptz | Yes | Visit service | Server | Not PHI | Client-safe (own record) / pharmacist-visible (roster) | N/A | Visit service | N/A | Yes |
| `leftAt` | When this participant left | timestamptz | Yes | Visit service | Server | Not PHI | Same | N/A | Visit service | N/A | Yes |

Delegate/support-person roles are synthetic-only for this task (no Task 05).

### `ParticipantAuthorization`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque authorization row id | UUID | No | Visit service | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `participantId` | FK to `VisitParticipant` | UUID | No | Visit service | Server | Not PHI | Server-only | Every check | Visit service | N/A | Yes |
| `grantRef` | FK to a delegation grant (synthetic-only here — no Task 05) | UUID | Yes | Synthetic stub (prototype) / Task 05 (production) | Server | Not PHI (reference) | Server-only | Every check — revocation takes effect immediately (threat #9) | Visit service | Rechecked at every join/rejoin, never cached | Yes |
| `scope` | view-only / full | enum | No | Grant or pharmacist decision | Server | Not PHI | Server-only | Every action | Visit service | Rechecked per action | Yes |
| `state` | invited/waiting/admitted/denied/removed/left — matches §1's participant-authorization dimension | enum | No | Server authorization + pharmacist controls | Server | Not PHI | Server-only, pharmacist-visible | Every transition | Visit service | Live | Yes |
| `deniedReason` | Safe enumerated denial reason, never free text | enum | Yes | Server | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `decidedByActorRef` | Pharmacist who decided | UUID | Yes | Pharmacist action | Server (pharmacist role) | Not PHI | Server-only | Pharmacist role | Visit service | N/A | Yes |
| `decidedAt` | When decided | timestamptz | Yes | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |

### `VirtualCareConsentEvent`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque event id | UUID | No | Consent service | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A — append-only | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | Every gate check | Visit service | N/A | Yes |
| `subjectRef` | Patient subject | UUID | No | Synthetic identity / Task 05 | Server | PHI-adjacent | Server-only | Every gate check | Visit service | Stale if subject merged/deleted | Yes |
| `actorRef` | Who gave consent (patient or authorized agent) | UUID | No | Consent capture | Server, patient or authorized agent | PHI-adjacent | Server-only | Every gate check | Visit service | N/A | Yes |
| `agentRelationshipRef` | Reference if actor ≠ subject | UUID | Yes | Synthetic delegation grant | Server | Not PHI (reference) | Server-only | Every gate check | Visit service | Rechecked with grant | Yes |
| `modality` | Which modality this consent covers — must match `VisitModality`, modality-specific not blanket | enum | No | Patient/agent input | Server | Not PHI | Server-only | Every gate check | Visit service | Re-required per modality switch | Yes |
| `scope` | consent-to-collect-use-disclose / consent-to-modality / consent-to-participants, kept as **separate rows**, never merged | enum | No | Consent capture | Server | Not PHI | Server-only | Every gate check | Visit service | N/A | Yes |
| `noticeVersion` | Privacy-notice/wording version shown | string | No | Product/compliance | Server | Not PHI | Server-only | N/A | Product/compliance | An undated consent is invalid | Yes |
| `captureMethod` | verbal / written / in-app confirmation | enum | No | Consent capture | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `effectiveAt` | When consent became active | timestamptz | No | Consent service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `withdrawnAt` | When withdrawn, if applicable | timestamptz | Yes | Patient/agent action | Server | Not PHI | Server-only | Blocks further interaction immediately (threat #39) | Visit service | Checked before every gated action | Yes |
| `supersededByEventId` | Newer consent event, if any | UUID | Yes | Consent service | Server | Not PHI (reference) | Server-only | N/A | Visit service | History never deleted, only superseded | Yes |
| `witnessActorRef` | Pharmacist witness, where required | UUID | Yes | Pharmacist action | Server (pharmacist role) | Not PHI | Server-only | Pharmacist role | Visit service | N/A | Yes |

**Explicitly not this entity:** treatment consent (`assessment.consent_method` etc., existing,
Task 02-owned) and recording consent (recording stays disabled regardless of any consent
value — see non-negotiable invariants).

### `IdentityAndLocationCheck`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque check id | UUID | No | Identity/location service | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | Every gate check | Visit service | N/A | Yes |
| `subjectRef` | Patient subject | UUID | No | Synthetic identity / Task 05 | Server | PHI-adjacent | Server-only | Every gate check | Visit service | Stale if subject merged/deleted | Yes |
| `identityConfirmationMethod` | Safe enumerated method — never "health card number" alone, per the task's explicit prohibition list | enum | No | Approved verification workflow | Server | PHI-adjacent | Server-only | N/A | Visit service | N/A | Yes |
| `identityOutcome` | pending/confirmed/failed/expired | enum | No | Approved verification workflow | Server | Not PHI | Server-only | Every gate check | Visit service | Expires — rechecked per interruption/modality change | Yes |
| `locationStatement` | Patient/agent-stated jurisdiction value — **never IP/GPS-derived**, enforced by construction (no IP/geolocation API called anywhere in this contract) | text/enum | No | Patient/agent statement | Server (self-reported only) | PHI-adjacent | Server-only | N/A | Visit service | Rechecked on location change | Yes |
| `jurisdiction` | Required bucket: `ON` / `OTHER_CANADIAN` / `NON_CANADIAN` | enum | No | Derived from `locationStatement` | Server | Not PHI (bucketed) | Server-only | Every gate check | Visit service | Rechecked on location change | Yes |
| `crossJurisdictionalBlocked` | Whether the visit is blocked on jurisdiction, derived, never client-settable | boolean | No | Derived | Server | Not PHI | Server-only | Every gate check | Visit service | Recomputed on location change | Yes |
| `confirmedByActorRef` | Pharmacist who confirmed | UUID | Yes | Pharmacist action | Server (pharmacist role) | Not PHI | Server-only | Pharmacist role | Visit service | N/A | Yes |
| `confirmedAt` | When confirmed | timestamptz | Yes | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `safeOutcome` | Safe summary outcome exposed to downstream guards | enum | No | Derived | Server | Not PHI | Server-only | Every gate check | Visit service | N/A | Yes |

No raw location detail is retained beyond the jurisdictional bucket, per the task's
minimization instruction.

### `ModalitySuitabilityDecision`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque decision id | UUID | No | Suitability service | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | Every gate check | Visit service | N/A | Yes |
| `decidedByActorRef` | Pharmacist who decided | UUID | No | Pharmacist action | Server (pharmacist role only — enforced at the write guard, not just the UI) | Not PHI | Server-only | Pharmacist role, explicit action | Visit service | N/A | Yes |
| `state` | `PENDING \| SUITABLE \| SUITABLE_WITH_LIMITATIONS \| UNSUITABLE \| REASSESSMENT_REQUIRED` — exact enum from the task brief | enum | No | Pharmacist decision | Server (pharmacist role) | Not PHI | Server-only, pharmacist-visible | Every gate check — must be current, never client-supplied | Visit service | Rechecked per §1 rule; reassessed on trigger | Yes |
| `structuredReasonCode` | Safe enumerated reason | enum | Yes | Pharmacist decision | Server (pharmacist role) | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `clinicalRationaleRef` | Pointer into the *existing* clinical record, Task 02-owned — never stored here, never in application logs | reference (external) | Yes | Task 02 clinical record | Server (pharmacist role) | PHI (by reference only — content lives in Task 02's own tables) | Server-only, not readable from this table | Pharmacist role | Task 02 | N/A | Yes |
| `contingencyPlanRef` | FK to `ContingencyPlan` | UUID | Yes | Contingency record | Server (pharmacist) | Not PHI (reference) | Server-only | Pharmacist role | Visit service | N/A | Yes |
| `decidedAt` | When decided | timestamptz | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `reassessmentTriggerRef` | What caused a re-decision: modality change / connection degradation / participant change / location change | enum/reference | Yes | Triggering event | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |

**Write authorization: pharmacist role only, full stop — this is the one entity in this whole
schema where a client-supplied value must never be accepted for the decision itself, only the
structured facts feeding it.**

### `TechnologyReadinessResult`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque result id | UUID | No | Preflight check | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `actorRef` | Who ran the check | UUID | No | Session | Server | PHI-adjacent | Server-only | N/A | Visit service | N/A | Yes |
| `checkType` | browser/camera/microphone/speaker/network/bandwidth — matches Workstream G's preflight list | enum | No | Preflight check | Client-run, server-recorded | Not PHI | Client-safe (own check) | N/A | Visit service | N/A | Yes |
| `safeResultCategory` | pass/fail/degraded — never raw diagnostic detail | enum | No | Preflight check | Client-run, server-recorded | Not PHI | Client-safe | N/A | Visit service | N/A | Yes |
| `checkedAt` | When checked | timestamptz | No | Visit service | Server | Not PHI | Client-safe | N/A | Visit service | N/A | Yes |
| `selectedModality` | Modality selected after the check | enum | Yes | Patient/pharmacist decision | Server | Not PHI | Client-safe (own record) | N/A | Visit service | N/A | Yes |
| `fallbackOffered` | Whether a fallback was offered | boolean | No | Visit service | Server | Not PHI | Client-safe | N/A | Visit service | N/A | Yes |
| `helpRequested` | Whether the patient requested help | boolean | No | Patient action | Server | Not PHI | Client-safe (own record) | N/A | Visit service | N/A | Yes |

Explicitly excludes: device labels, hardware serials, full user-agent strings, raw SDP/ICE, IP
addresses — matches the task's retention minimization list verbatim.

### `ContingencyPlan`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque plan id | UUID | No | Contingency service | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `approvedContingency` | in-person / telephone / referral | enum | No | Pharmacist decision | Server (pharmacist role) | Not PHI | Server-only, pharmacist-visible | Pharmacist role | Visit service | N/A | Yes |
| `selectedByActorRef` | Pharmacist who selected | UUID | No | Pharmacist action | Server (pharmacist role) | Not PHI | Server-only | Pharmacist role | Visit service | N/A | Yes |
| `selectedAt` | When selected | timestamptz | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `reasonCode` | Safe enumerated reason | enum | Yes | Pharmacist decision | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |

### `ConnectionEvent`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque event id | UUID | No | Technical subsystem | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A — append-only | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `state` | offline/connecting/connected/degraded/disconnected/failed | enum | No | Technical subsystem | Server | Not PHI | Client-safe (own visit) | N/A | Visit service | Recomputed live | Yes |
| `occurredAt` | When the event occurred | timestamptz | No | Technical subsystem | Server | Not PHI | Client-safe | N/A | Visit service | N/A | Yes |
| `safeReasonCode` | Safe enumerated reason, never raw diagnostic detail | enum | Yes | Technical subsystem | Server | Not PHI | Client-safe | N/A | Visit service | N/A | Yes |

Explicitly **not** wired to any assessment/claim field — this table has no foreign key toward
completion state, by design (threat #47).

### `TechnicalFailureEvent`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque event id | UUID | No | Technical subsystem | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A — append-only | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `safeReasonCode` | Safe enumerated reason | enum | No | Technical subsystem | Server | Not PHI | Client-safe (safe code only) | N/A | Visit service | N/A | Yes |
| `occurredAt` | When it occurred | timestamptz | No | Technical subsystem | Server | Not PHI | Client-safe | N/A | Visit service | N/A | Yes |
| `precedingConnectionEventRef` | FK to the `ConnectionEvent` that preceded this failure | UUID | Yes | Technical subsystem | Server | Not PHI (reference) | Server-only | N/A | Visit service | N/A | Yes |

**Invariant enforced by contract shape, not just application logic:** this entity has no
column and no trigger path that can set `VirtualVisit.pharmacistCompletionAt` — the only writer
of that field is the explicit pharmacist-completion action.

### `VisitInterruption`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque interruption id | UUID | No | Visit service | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `startedAt` | When the interruption began | timestamptz | No | Visit service | Server | Not PHI | Client-safe (own visit) | N/A | Visit service | N/A | Yes |
| `endedAt` | When resolved, if it has been | timestamptz | Yes (null while ongoing) | Visit service | Server | Not PHI | Client-safe | N/A | Visit service | N/A | Yes |
| `triggeringEventRef` | FK to `ConnectionEvent` or `TechnicalFailureEvent` | UUID | No | Visit service | Server | Not PHI (reference) | Server-only | N/A | Visit service | N/A | Yes |
| `resumedViaFallbackTransitionRef` | FK to `FallbackTransition`, if resumed via fallback | UUID | Yes | Visit service | Server | Not PHI (reference) | Server-only | N/A | Visit service | N/A | Yes |

### `FallbackTransition`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque transition id | UUID | No | Visit service | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `fromModality` | Prior modality | enum | No | Visit service | Server | Not PHI | Client-safe (own visit) | N/A | Visit service | N/A | Yes |
| `toModality` | New modality | enum | No | Pharmacist decision | Server (pharmacist role) | Not PHI | Client-safe (own visit) | Pharmacist role | Visit service | N/A | Yes |
| `approvedByActorRef` | Pharmacist who approved, explicit | UUID | No | Pharmacist action | Server (pharmacist role) | Not PHI | Server-only | Pharmacist role, explicit action | Visit service | N/A | Yes |
| `renewedGuardsRef` | Bundle proving identity/location/consent/suitability were rechecked, not carried over | reference | No — required, no write path skips it | Guard-recheck service | Server | Not PHI (reference) | Server-only | Required before commit — makes threat #46's prevention provable, not asserted | Visit service | N/A — point-in-time proof | Yes |
| `approvedAt` | When approved | timestamptz | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |

### `SecureMessageThread`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque thread id | UUID | No | Messaging service | Server-generated | Not PHI | Server-only | N/A | Messaging service | N/A | Yes |
| `pharmacyId` | Custodian/pharmacy scope | UUID (FK) | No | `pharmacy` table | Server | Not PHI | Server-only, never client-supplied | Every read/write | Messaging service | N/A | Yes |
| `patientSubjectRef` | Opaque patient-subject reference | UUID | No | Synthetic identity / Task 05 | Server | PHI-adjacent | Server-only | Every read/write | Messaging service | Stale if subject merged/deleted | Yes |
| `patientActorRef` | Opaque patient-actor reference | UUID | Yes | Same | Server | PHI-adjacent | Server-only | Every read/write | Messaging service | Same | Yes |
| `assignedPharmacistActorRef` | Assigned pharmacist | UUID | Yes | Pharmacist assignment | Server (pharmacist role) | Not PHI | Server-only | Pharmacist role | Messaging service | N/A | Yes |
| `visitRef` | Optional FK to `VirtualVisit` — a thread need not be tied to a visit | UUID | Yes | Visit service | Server | Not PHI (reference) | Server-only | N/A | Messaging service | N/A | Yes |
| `purpose` | Thread purpose/category | enum/text | No | Thread creation | Server | Not PHI | Server-only | N/A | Messaging service | N/A | Yes |
| `state` | open/closed/withdrawn/expired — matches Task 07's thread lifecycle where it exists | enum | No | Messaging service | Server | Not PHI | Server-only, pharmacist- and patient-visible (own thread) | Every gate check | Messaging service | Live | Yes |
| `openedAt` | When opened | timestamptz | No | Messaging service | Server | Not PHI | Client-safe (own thread) | N/A | Messaging service | N/A | Yes |
| `lastActivityAt` | Last activity timestamp | timestamptz | Yes | Messaging service | Server | Not PHI | Client-safe (own thread) | N/A | Messaging service | Live | Yes |
| `closesAt` | Scheduled close time, if any | timestamptz | Yes | Messaging service | Server | Not PHI | Client-safe (own thread) | N/A | Messaging service | N/A | Yes |
| `closedAt` | When actually closed | timestamptz | Yes | Messaging service | Server | Not PHI | Client-safe (own thread) | N/A | Messaging service | N/A | Yes |
| `stateVersion` | Optimistic-concurrency token | integer | No | Messaging service | Server | Not PHI | Server-only | Every write | Messaging service | Incremented on every write | Yes |

### `SecureMessage`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque message id | UUID | No | Messaging service | Server-generated | Not PHI | Server-only | N/A | Messaging service | N/A — append-only | Yes |
| `threadId` | FK to `SecureMessageThread` | UUID | No | Messaging service | Server | Not PHI | Server-only | Every read/write, rechecked against thread scope | Messaging service | N/A | Yes |
| `authorActorRef` | Who wrote the message | UUID | No | Session | Server | PHI-adjacent | Server-only | Every write | Messaging service | N/A | Yes |
| `authorRole` | patient / pharmacist | enum | No | Session | Server | Not PHI | Server-only | N/A | Messaging service | N/A | Yes |
| `bodyEncryptedRef` | Encrypted message content — never plaintext in this table's own definition | encrypted blob/reference | No | Patient/pharmacist input | Server, encrypted at write | **High — clinical communication content** | **No — never crosses into a client prop beyond the authenticated thread view** | Every read/write, full guard recheck (Workstream J §2) | Messaging service | N/A | Yes |
| `receivedAt` | When received by the server | timestamptz | No | Messaging service | Server | Not PHI | Client-safe (own thread) | N/A | Messaging service | N/A | Yes |
| `clientIdempotencyToken` | De-duplication token for retried sends | string | Yes | Client, server-validated | Server | Not PHI | Client-safe (own record) | N/A | Messaging service | N/A | Yes |
| `correctionOfMessageId` | FK to the message this corrects, if any | UUID | Yes | Author action | Server | Not PHI (reference) | Server-only | N/A | Messaging service | Corrections supersede, never silently edit | Yes |
| `queueRoutingState` | Routing/priority state, from trusted workflow data only — **never** a field an AI/keyword classifier writes (threat #37) | enum | No | Thread type, participant role, explicit staff action only | Server | Not PHI | Server-only | N/A | Messaging service | N/A | Yes |

PHI class overall: high — this is the one entity in this whole document holding actual clinical
communication content, encrypted. Client-safe overall: **no**; queue metadata is body-free.

### `VisitAssessmentLink`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque link id | UUID | No | Visit service | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `assessmentId` | FK to `assessment` (Task 02-owned table) | UUID | No | Task 02 | Server (pharmacist role, all 28 Workstream J guards) | Not PHI (reference — the assessment row itself is Task 02-owned and PHI-bearing; this link is not) | Server-only | All 28 Workstream J guards, only from `PHARMACIST_COMPLETED` | Task 02 (assessment) / Visit service (link) | N/A | Yes |
| `linkedAt` | When linked | timestamptz | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `linkedByActorRef` | Pharmacist who linked | UUID | No | Pharmacist action | Server (pharmacist role) | Not PHI | Server-only | Pharmacist role | Visit service | N/A | Yes |
| `guardsPassedRef` | Bundle reference proving every Workstream J guard passed at link time | reference | No — required | Guard-recheck service | Server | Not PHI (reference) | Server-only | Required before write | Visit service | Point-in-time proof | Yes |

This is the **only** entity that touches Task 02's tables, and it only ever references an
assessment row; it never writes clinical or billing fields directly.

### `VirtualVisitAuditEvent`

Mirrors the existing `audit_log` shape exactly (same append-only, DB-enforced-immutable pattern
this repo already has).

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque event id | UUID | No | Audit service (existing pattern) | Server-generated | Not PHI | Server-only | N/A | Audit service | N/A — append-only, DB-enforced-immutable | Yes |
| `pharmacyId` | Custodian/pharmacy scope | UUID (FK) | No | `pharmacy` table | Server | Not PHI | Server-only | N/A | Audit service | N/A | Yes |
| `visitOrThreadRef` | Opaque visit or thread reference | UUID | No | Visit/messaging service | Server | Not PHI (reference) | Server-only | N/A | Audit service | N/A | Yes |
| `actorRef` | Opaque actor reference | UUID | No | Session | Server | PHI-adjacent | Server-only | N/A | Audit service | N/A | Yes |
| `action` | Event type (audit catalogue) | enum | No | Application code | Server | Not PHI | Server-only | N/A | Audit service | N/A | Yes |
| `outcome` | Outcome of the action | enum | No | Application code | Server | Not PHI | Server-only | N/A | Audit service | N/A | Yes |
| `safeReasonCode` | Safe enumerated reason | enum | Yes | Application code | Server | Not PHI | Server-only | N/A | Audit service | N/A | Yes |
| `metadata` | Non-PHI-only structured metadata — same constraint as existing `audit_log.metadata` ("never store health numbers or names here") | jsonb | Yes | Application code | Server | Must never be PHI — structurally constrained by convention, same as the existing table | Server-only | N/A | Audit service | N/A | Yes |
| `createdAt` | When recorded | timestamptz | No | Audit service | Server | Not PHI | Server-only | N/A | Audit service | N/A — immutable | Yes |

### `VendorSessionReference`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque reference id | UUID | No | Vendor adapter | Server-generated | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `visitId` | FK to `VirtualVisit` | UUID | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `vendorAdapterName` | Which vendor adapter is in use | string | No | Vendor selection (Workstream B — not yet decided) | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `vendorSessionIdOpaqueRef` | Internal opaque mapping — never the vendor's raw session/meeting id stored as a reusable credential | reference | No | Vendor adapter, mapped internally | Server | Not PHI (opaque) | Server-only | N/A | Visit service | Vendor-side staleness possible — reconciled, never trusted blindly | Yes |
| `createdAt` | When created | timestamptz | No | Visit service | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |
| `expiresAt` | When it expires | timestamptz | Yes | Vendor adapter | Server | Not PHI | Server-only | N/A | Visit service | N/A | Yes |

No vendor selected yet (Workstream B) — this contract exists so the adapter interface has
somewhere to write to, not because a vendor integration exists.

### `VendorWebhookReceipt`

| Field | Meaning | Type | Nullable | Source of truth | Trusted actor | PHI class | Client-safe? | Auth required | Retention owner | Staleness | Prod approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Opaque receipt id | UUID | No | Webhook receiver | Server-generated | Not PHI | Server-only | N/A | Security | N/A — append-only | Yes |
| `vendorAdapterName` | Which vendor sent this | string | No | Webhook payload (untrusted until verified) | Server, verified before trust | Not PHI | Server-only | N/A | Security | N/A | Yes |
| `eventIdOrDigest` | Deduplication key | string | No | Webhook payload | Server, verified | Not PHI | Server-only | Checked before processing | Security | N/A | Yes |
| `signatureValid` | Whether the webhook signature verified | boolean | No | Signature verification | Server | Not PHI | Server-only | Required before any processing | Security | N/A | Yes |
| `receivedAt` | When received | timestamptz | No | Webhook receiver | Server | Not PHI | Server-only | N/A | Security | N/A | Yes |
| `processedAt` | When processed, if accepted | timestamptz | Yes | Webhook receiver | Server | Not PHI | Server-only | N/A | Security | N/A | Yes |
| `outcome` | accepted/rejected/duplicate/replayed/stale/unknown | enum | No | Webhook receiver | Server | Not PHI | Server-only | N/A | Security | N/A | Yes |
| `mappedVisitRef` | Internal visit reference — only set after internal resolution, never trusts the vendor's own identifiers directly | UUID | Yes | Internal mapping | Server | Not PHI (reference) | Server-only | N/A | Visit service | Only populated post-verification | Yes |

No raw vendor payload is a column here, by design (threat #23 / non-negotiable invariants).

---

## 3. What this proposal deliberately leaves undecided

- Exact column types/precision, indexing strategy, and Drizzle schema syntax — this is a
  conceptual proposal, not a migration.
- Whether `VirtualCareConsentEvent` needs its own table or can be a specialization of a more
  general consent-event table shared with a future Task 05/07 (cross-task schema ownership is
  explicitly flagged by the program's own dependency rules as something to agree before
  editing, not something this task decides unilaterally).
- Encryption-at-rest mechanism for `SecureMessage.bodyEncryptedRef` (application-level vs.
  column-level vs. Supabase-native) — a security-reviewer decision, not assumed here.

## 4. Every field above requiring production approval

All of it. No table in this document has been applied. Applying any of it requires, at
minimum: the lead's explicit migration sign-off (`AGENTS.md`), Task 05 reaching a stable
contract (for the patient-actor/subject references to mean anything in production), and the
Workstream B vendor decision (for `VendorSessionReference` to have a real adapter behind it).
