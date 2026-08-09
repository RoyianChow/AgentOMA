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
(Workstream H, next) for the full transition table.

---

## 2. Entity contracts

Each table lists only the fields load-bearing for this task's invariants — not necessarily
exhaustive of every column a real implementation would eventually need.

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
not user-writable). Fields: `code` (telephone/video/secure_messaging/in_person), `label`,
`requiresVendor` (boolean — false for telephone per the Workstream B exception), `effectiveDate`,
`endDate`. Not PHI. Client-safe (it's just a lookup list). Seeded, versioned, same as
`ailment_group`. Production approval: yes (migration + seed).

### `VisitParticipant`

| Field | Meaning | Type | PHI class | Client-safe? | Notes |
|---|---|---|---|---|---|
| `id` | Opaque participant row id | UUID | Not PHI | Server-only | |
| `visitId` | FK to `VirtualVisit` | UUID | Not PHI | Server-only | |
| `actorRef` | Opaque actor reference | UUID | PHI-adjacent | Server-only | Never a name |
| `role` | patient / pharmacist / delegate / support-person / interpreter | enum | Not PHI | Server-only, pharmacist-visible label only | Delegate/support-person are synthetic-only for this task (no Task 05) |
| `authorizationRef` | FK to `ParticipantAuthorization` | UUID | Not PHI (reference) | Server-only | |
| `disclosedToPatientAt` | When the patient was shown this participant | timestamptz | Not PHI | Server-only | Enforces "no hidden participant" |
| `joinedAt` / `leftAt` | Presence timestamps | timestamptz | Not PHI | Server-only | |

### `ParticipantAuthorization`

Fields: `id`, `participantId` (FK), `grantRef` (FK to a Task-05-shaped delegation grant —
synthetic-only here), `scope` (enum: view-only / full), `state` (invited/waiting/admitted/
denied/removed/left — matches §1's participant-authorization dimension exactly), `deniedReason`
(safe enum, never free text), `decidedByActorRef` (pharmacist), `decidedAt`. All server-only,
not PHI beyond the actor reference. Every state change requires re-checking the current grant
(delegation revocation must take effect immediately, per the threat model Group A).

### `VirtualCareConsentEvent`

| Field | Meaning | Type | Notes |
|---|---|---|---|
| `id` | Opaque event id | UUID | |
| `visitId` | FK | UUID | |
| `subjectRef` | Patient subject | UUID | PHI-adjacent |
| `actorRef` | Who gave consent (patient or authorized agent) | UUID | PHI-adjacent |
| `agentRelationshipRef` | If actor ≠ subject | UUID, nullable | References a synthetic delegation grant |
| `modality` | Which modality this consent covers | enum | Must match `VisitModality` — consent is modality-specific, not blanket |
| `scope` | consent-to-collect-use-disclose / consent-to-modality / consent-to-participants (kept as **separate rows**, never merged — see non-negotiable invariants) | enum | |
| `noticeVersion` | Privacy-notice/wording version shown | string | Required — an undated consent is invalid |
| `captureMethod` | verbal / written / in-app confirmation | enum | |
| `effectiveAt` | When consent became active | timestamptz | |
| `withdrawnAt` | When withdrawn, if applicable | timestamptz, nullable | Withdrawal blocks further interaction immediately (threat model Group C) |
| `supersededByEventId` | Newer consent event, if any | UUID, nullable | History is never deleted, only superseded |
| `witnessActorRef` | Pharmacist witness, where required | UUID, nullable | |

**Explicitly not this entity:** treatment consent (`assessment.consent_method` etc., existing,
Task 02-owned) and recording consent (recording stays disabled regardless of any consent
value — see non-negotiable invariants).

### `IdentityAndLocationCheck`

Fields: `id`, `visitId`, `subjectRef`, `identityConfirmationMethod` (safe enum — never "health
card number" alone, per the task's explicit prohibition list), `identityOutcome`
(pending/confirmed/failed/expired), `locationStatement` (patient/agent-stated jurisdiction
value only — **never IP/GPS-derived**, enforced by construction: no IP or geolocation API is
called anywhere in this contract), `jurisdiction` (required enum value, e.g. `ON` vs.
`OTHER_CANADIAN` vs. `NON_CANADIAN`), `crossJurisdictionalBlocked` (boolean, derived, not
client-settable), `confirmedByActorRef` (pharmacist), `confirmedAt`, `safeOutcome`. All
PHI-adjacent, server-only, no raw location detail retained beyond the jurisdictional bucket
(per the task's minimization instruction).

### `ModalitySuitabilityDecision`

Fields: `id`, `visitId`, `decidedByActorRef` (pharmacist-role only — enforced at the write
guard, not just the UI), `state` (`PENDING | SUITABLE | SUITABLE_WITH_LIMITATIONS | UNSUITABLE
| REASSESSMENT_REQUIRED` — exact enum from the task brief), `structuredReasonCode` (safe enum),
`clinicalRationaleRef` (pointer into the *existing* clinical record, Task 02-owned — never
stored here, never in application logs), `contingencyPlanRef`, `decidedAt`,
`reassessmentTriggerRef` (what caused a re-decision: modality change / connection degradation /
participant change / location change). **Write authorization: pharmacist role only, full stop
— this is the one entity in this whole schema where a client-supplied value must never be
accepted for the decision itself, only the structured facts feeding it.**

### `TechnologyReadinessResult`

Fields: `id`, `visitId`, `actorRef`, `checkType` (browser/camera/microphone/speaker/network/
bandwidth — matches Workstream G's preflight list), `safeResultCategory` (pass/fail/degraded —
never raw diagnostic detail), `checkedAt`, `selectedModality`, `fallbackOffered` (boolean),
`helpRequested` (boolean). Explicitly excludes: device labels, hardware serials, full
user-agent strings, raw SDP/ICE, IP addresses — matches the task's retention minimization list
verbatim.

### `ContingencyPlan`

Fields: `id`, `visitId`, `approvedContingency` (in-person / telephone / referral — enum),
`selectedByActorRef` (pharmacist), `selectedAt`, `reasonCode`. Not PHI beyond the reference.

### `ConnectionEvent`

Fields: `id`, `visitId`, `state` (offline/connecting/connected/degraded/disconnected/failed),
`occurredAt`, `safeReasonCode`. Explicitly **not** wired to any assessment/claim field — this
table has no foreign key toward completion state, by design (threat model Group D).

### `TechnicalFailureEvent`

Fields: `id`, `visitId`, `safeReasonCode`, `occurredAt`, `precedingConnectionEventRef`.
**Invariant enforced by contract shape, not just application logic:** this entity has no
column and no trigger path that can set `VirtualVisit.pharmacistCompletionAt` — the only writer
of that field is the explicit pharmacist-completion action.

### `VisitInterruption`

Fields: `id`, `visitId`, `startedAt`, `endedAt` (nullable while ongoing), `triggeringEventRef`
(FK to `ConnectionEvent` or `TechnicalFailureEvent`), `resumedViaFallbackTransitionRef`
(nullable).

### `FallbackTransition`

Fields: `id`, `visitId`, `fromModality`, `toModality`, `approvedByActorRef` (pharmacist,
explicit), `renewedGuardsRef` (a bundle of references proving identity/location/consent/
suitability were *rechecked*, not carried over — this is the field that makes "an approved
fallback may continue the encounter only after all applicable guards are rechecked" provable
rather than asserted), `approvedAt`.

### `SecureMessageThread`

Fields: `id`, `pharmacyId`, `patientSubjectRef`, `patientActorRef`, `assignedPharmacistActorRef`,
`visitRef` (nullable — a thread need not be tied to a specific visit), `purpose`, `state`
(matches Task 07's thread lifecycle shape where it exists — otherwise a minimal open/closed/
withdrawn/expired set for this task's synthetic prototype), `openedAt`, `lastActivityAt`,
`closesAt`, `closedAt`, `stateVersion`.

### `SecureMessage`

Fields: `id`, `threadId`, `authorActorRef`, `authorRole`, `bodyEncryptedRef` (never plaintext
in this table's own definition — encryption is a contract requirement, not an implementation
detail left implicit), `receivedAt`, `clientIdempotencyToken`, `correctionOfMessageId`
(nullable — corrections supersede, never silently edit), `queueRoutingState` (from trusted
workflow data only — **never** a field an AI classifier writes). PHI class: high (this is the
one entity in this whole document holding actual clinical communication content, encrypted).
Client-safe: **no** — message body never crosses into a client prop beyond the authenticated
thread view itself; queue metadata is body-free.

### `VisitAssessmentLink`

Fields: `id`, `visitId`, `assessmentId` (FK, Task 02-owned table), `linkedAt`, `linkedByActorRef`,
`guardsPassedRef` (bundle reference proving every Workstream J guard passed at link time — see
next workstream). This is the **only** entity that touches Task 02's tables, and it only ever
references an assessment row; it never writes clinical or billing fields directly.

### `VirtualVisitAuditEvent`

Mirrors the existing `audit_log` shape exactly (same append-only, DB-enforced-immutable pattern
this repo already has). Fields: `id`, `pharmacyId`, `visitOrThreadRef`, `actorRef`, `action`,
`outcome`, `safeReasonCode`, `metadata` (jsonb, non-PHI only — same constraint as the existing
`audit_log.metadata` comment: *"never store health numbers or names here"*), `createdAt`.

### `VendorSessionReference`

Fields: `id`, `visitId`, `vendorAdapterName`, `vendorSessionIdOpaqueRef` (never the vendor's raw
session/meeting identifier stored as a reusable credential — always mapped through an internal
opaque reference), `createdAt`, `expiresAt`. No vendor selected yet (Workstream B) — this
contract exists so the adapter interface has somewhere to write to, not because a vendor
integration exists.

### `VendorWebhookReceipt`

Fields: `id`, `vendorAdapterName`, `eventIdOrDigest` (for deduplication), `signatureValid`
(boolean), `receivedAt`, `processedAt`, `outcome` (accepted/rejected/duplicate/replayed/stale/
unknown), `mappedVisitRef` (nullable — only set after internal reference resolution, never
trusts the vendor's own identifiers directly). No raw vendor payload is a column here, by
design (threat model Group F / non-negotiable invariants).

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
