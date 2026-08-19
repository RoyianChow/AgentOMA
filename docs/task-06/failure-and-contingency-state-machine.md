# Task 06 — Failure and Contingency State Machine

This is `VirtualVisit.workflowState` (Workstream D) made explicit and exhaustive. It composes
with, but never overrides, the other 8 orthogonal dimensions (modality, connection, identity/
location, consent, suitability, participant authorization, assessment, claim) — a workflow
transition here never silently moves one of those other dimensions. That rule, and why it's the
single most important property of this whole document, is covered in §3.

## States

`SCHEDULED · PREFLIGHT_PENDING · PREFLIGHT_FAILED · WAITING · IDENTITY_PENDING ·
LOCATION_PENDING · CONSENT_PENDING · SUITABILITY_PENDING · READY · IN_PROGRESS ·
CONNECTION_DEGRADED · INTERRUPTED · RECONNECTING · FALLBACK_PENDING · RESUMED_BY_VIDEO ·
RESUMED_BY_TELEPHONE · IN_PERSON_REQUIRED · REFERRED · CONSENT_WITHDRAWN · PATIENT_LEFT ·
PHARMACIST_ENDED · PHARMACIST_COMPLETED · CANCELLED · NO_SHOW · EXPIRED · TECHNICAL_FAILURE ·
ACCESS_DENIED · UNKNOWN`

## 1. Transition table

Columns match the task's exact requirement. "Guards" references Workstream E/J gates by name
rather than repeating their full definition.

### Phase 1 — Pre-visit gating

| From → To | Permitted actor | Server guards | Required evidence | Idempotency | Concurrency | Audit event | Patient message | Pharmacist message | Assessment effect | Claim effect | Invalid-transition behavior |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `SCHEDULED → PREFLIGHT_PENDING` | Patient (join attempt) or system (visit start) | Session validity, actor/audience check | None yet | Safe to repeat | Single-writer per visit (state-version check) | `preflight_started` | "Let's check your setup" | — | None | None | Retrying from any later state is a no-op, not an error |
| `PREFLIGHT_PENDING → PREFLIGHT_FAILED` | System (result of `TechnologyReadinessResult`) | None beyond the check itself | `TechnologyReadinessResult` row | Safe | N/A | `preflight_failed` | Plain-language failure + fallback offer | — | None | None | — |
| `PREFLIGHT_FAILED → WAITING` | Patient (retry) or system (fallback accepted) | Re-run preflight, or accept telephone fallback | Updated `TechnologyReadinessResult`, or `ContingencyPlan` | Safe | Single-writer | `preflight_retry` / `fallback_accepted` | — | — | None | None | — |
| `PREFLIGHT_PENDING/FAILED → WAITING` | Patient | Preflight passed (or telephone selected, which needs no device check) | — | Safe | Single-writer | `waiting_room_entry` | Non-PHI status only | — | None | None | — |
| `WAITING → IDENTITY_PENDING` | System | Pharmacist admits (`ParticipantAuthorization.state = admitted`) | Admission record | Safe | Pharmacist-actor-only write | `pharmacist_admission` | — | Minimum-necessary waiting-room info only | None | None | A patient cannot self-admit — enforced by the write guard, not just UI |
| `IDENTITY_PENDING → LOCATION_PENDING` | Pharmacist | `IdentityAndLocationCheck.identityOutcome = confirmed` | Identity check row | Safe | Pharmacist-actor-only | `identity_confirmed` | — | — | None | None | Identity failure → `ACCESS_DENIED` (§Phase 4) |
| `LOCATION_PENDING → CONSENT_PENDING` | Pharmacist | Location confirmed, jurisdiction bucket recorded, cross-jurisdictional check passes | Location check row | Safe | Pharmacist-actor-only | `location_confirmed` | — | — | None | None | Cross-jurisdictional block → `ACCESS_DENIED` |
| `CONSENT_PENDING → SUITABILITY_PENDING` | Patient (grants) + pharmacist (privacy confirmation) | `VirtualCareConsentEvent` granted for the requested modality + privacy checklist complete | Consent event, privacy-confirmation record | Safe | Patient writes consent; pharmacist writes privacy confirmation — two separate actors, both required | `consent_captured`, `privacy_confirmed` | Plain-language consent request | Privacy checklist | None | None | Withdrawal at this stage → `CONSENT_WITHDRAWN` directly |
| `SUITABILITY_PENDING → READY` | Pharmacist | `ModalitySuitabilityDecision.state ∈ {SUITABLE, SUITABLE_WITH_LIMITATIONS}` | Suitability decision row | Safe | Pharmacist-actor-only, explicit write | `suitability_decided` | — | — | None | None | `UNSUITABLE` → `IN_PERSON_REQUIRED`/`REFERRED` directly, never `READY` |

### Phase 2 — Active visit

| From → To | Permitted actor | Server guards | Required evidence | Idempotency | Concurrency | Audit event | Patient message | Pharmacist message | Assessment effect | Claim effect | Invalid-transition behavior |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `READY → IN_PROGRESS` | Pharmacist (starts interaction) | All Phase-1 gates still current (rechecked, not just previously true) | — | Safe | Pharmacist-actor-only | `visit_started` | — | — | None yet | None yet | Starting with any stale gate re-fails to the relevant `*_PENDING` state |
| `IN_PROGRESS → CONNECTION_DEGRADED` | System (technical subsystem) | Connection-quality signal | `ConnectionEvent` | Safe | N/A — connection state is independent of workflow writes | `connection_degraded` | "Your connection seems unstable" | Same | **None** | **None** | — |
| `CONNECTION_DEGRADED → IN_PROGRESS` | System | Connection recovers | `ConnectionEvent` | Safe | N/A | `connection_recovered` | — | — | None | None | — |
| `IN_PROGRESS/CONNECTION_DEGRADED → INTERRUPTED` | System | Disconnect or `TechnicalFailureEvent` | `ConnectionEvent` or `TechnicalFailureEvent` | Safe | N/A | `visit_interrupted` | "You've been disconnected. Reconnecting..." | Same | **None — explicitly not a completion** | **None** | This edge is the single most safety-critical row in this table; see §3 |
| `INTERRUPTED → RECONNECTING` | Patient (rejoin attempt) | Full rejoin authorization (Workstream F §5) — not a cache hit | New session/participant check | Safe | Single-writer | `reconnect_attempted` | — | — | None | None | — |
| `RECONNECTING → IN_PROGRESS` | System | Rejoin succeeds, **all Phase-1 gates rechecked** (not carried over) | Fresh gate evidence | Safe | Single-writer | `reconnect_succeeded` | — | — | None | None | Any stale gate on rejoin denies back to the relevant `*_PENDING` state, never silently proceeds |
| `RECONNECTING → FALLBACK_PENDING` | Pharmacist (offers) or system (rejoin exhausted) | — | — | Safe | Pharmacist-actor-only for pharmacist-initiated | `fallback_offered` | — | — | None | None | — |

### Phase 3 — Fallback and contingency

| From → To | Permitted actor | Server guards | Required evidence | Idempotency | Concurrency | Audit event | Patient message | Pharmacist message | Assessment effect | Claim effect | Invalid-transition behavior |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `FALLBACK_PENDING → RESUMED_BY_TELEPHONE` | Pharmacist (explicit approval) | `FallbackTransition` with `renewedGuardsRef` proving identity/location/consent/suitability rechecked for the **new** modality | `FallbackTransition` row | Safe | Pharmacist-actor-only | `fallback_approved` | Non-PHI phone instructions | — | None | None | Approving without renewed guards is structurally impossible — no write path skips `renewedGuardsRef` |
| `FALLBACK_PENDING → RESUMED_BY_VIDEO` | Pharmacist | Same as above, modality = video | Same | Safe | Pharmacist-actor-only | `fallback_approved` | — | — | None | None | Same |
| `FALLBACK_PENDING → IN_PERSON_REQUIRED` | Pharmacist | `ContingencyPlan.approvedContingency = in_person` | Contingency record | Safe | Pharmacist-actor-only | `contingency_selected` | Plain-language next step | — | **None — visit ends without completion** | **None** | — |
| `FALLBACK_PENDING → REFERRED` | Pharmacist | `ContingencyPlan.approvedContingency = referral` | Contingency record | Safe | Pharmacist-actor-only | `contingency_selected` | Plain-language next step | — | **None by itself** — a subsequent, separate, ordinary Task-02 assessment-completion action may record a completed-then-referred outcome, exactly as it already does for in-person visits | Only via the existing Task 02 path, never from this state transition directly | — |
| `RESUMED_BY_TELEPHONE/VIDEO → IN_PROGRESS` | System | Resumed session confirmed active | — | Safe | N/A | `visit_resumed` | — | — | None | None | — |

### Phase 4 — Terminal states

| From → To | Permitted actor | Server guards | Required evidence | Idempotency | Concurrency | Audit event | Patient message | Pharmacist message | Assessment effect | Claim effect | Invalid-transition behavior |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `Any active state → CONSENT_WITHDRAWN` | Patient (or authorized agent) | Withdrawal event recorded | `VirtualCareConsentEvent.withdrawnAt` set | Safe (withdrawal is terminal, repeat calls no-op) | Highest priority — pre-empts any concurrent pharmacist action | `consent_withdrawn` | Confirmation of withdrawal | Immediate notice | **None** | **None** | Blocks further interaction immediately even if `connection = connected` (non-negotiable invariant) |
| `Any active state → PATIENT_LEFT` | Patient (voluntary departure) | `VisitParticipant.leftAt` set | — | Safe | N/A | `patient_left` | — | Notice that patient left | **None — explicitly not completion** | **None** | This is the second most safety-critical row; see §3 |
| `Any active state → PHARMACIST_ENDED` | Pharmacist (ends without completing) | Explicit pharmacist action | — | Safe | Pharmacist-actor-only | `pharmacist_ended` | — | — | **None — ended ≠ completed, deliberately two different states** | **None** | — |
| `READY/IN_PROGRESS/IN_PERSON_REQUIRED/REFERRED → PHARMACIST_COMPLETED` | **Pharmacist only, explicit action** | All applicable gates current at time of completion (Workstream J) | Completion record | **Not idempotent by accident** — a second completion attempt is denied, not silently repeated, to avoid ambiguity about which attempt is authoritative | Pharmacist-actor-only, single-writer via state-version check | `pharmacist_completed` | — | Confirmation | **Only here** does the existing Task 02 assessment-completion path become reachable, via `VisitAssessmentLink` | **Only here**, and only through Task 02's own existing, unchanged guards | This is the **only** row in the entire table that may lead to assessment/claim effects — every other row explicitly does not |
| `SCHEDULED/WAITING → CANCELLED` | Pharmacist or patient | Explicit cancellation | — | Safe | Either actor, first write wins | `visit_cancelled` | Notice | Notice | None | None | — |
| `SCHEDULED → NO_SHOW` | System (timeout with no join) | Absolute expiry reached with zero participant joins | — | Safe | N/A | `visit_no_show` | — | Notice | None | None | — |
| `WAITING/any pending state → EXPIRED` | System | Absolute expiry reached | — | Safe | N/A | `visit_expired` | Expired notice | — | None | None | A stale room cannot be reopened (Workstream F §3) — expiry is one-way |
| `Any state → TECHNICAL_FAILURE` | System | `TechnicalFailureEvent` with safe reason code | — | Safe | N/A | `technical_failure` | Plain-language notice | Same | **None** | **None** | Explicitly cannot transition directly to `PHARMACIST_COMPLETED` — must route through `FALLBACK_PENDING` or a terminal state instead |
| `IDENTITY_PENDING/LOCATION_PENDING → ACCESS_DENIED` | System | Identity/location check fails, or cross-jurisdictional block | Failed check record | Safe | N/A | `access_denied` | Generic denial (never reveals *why* in a way that could confirm another patient/visit exists) | Denial reason (pharmacist-visible only) | None | None | — |
| Any unrecognized or malformed state | — | — | — | — | — | `unknown_state_denied` | Generic error | Generic error | **None** | **None** | **Fails closed by definition — `UNKNOWN` is a terminal, denial-only state, never a pass-through** |

## 2. Concurrency and staleness — the general rule

Every write to `VirtualVisit.workflowState` carries `stateVersion` (Workstream D) as an
optimistic-concurrency token. A write against a stale version is rejected, not merged or
retried automatically — **"a stale browser cannot overwrite a newer pharmacist decision"** is
enforced by this mechanism directly, not by hoping the UI stays in sync.

## 3. Critical transition rules — proven, not asserted

| Rule | Where the proof lives |
|---|---|
| Patient departure cannot complete a visit | `PATIENT_LEFT` has no row in this table leading toward `PHARMACIST_COMPLETED`; the only write path to `pharmacistCompletionAt` is the pharmacist's own explicit action (Workstream D) |
| Disconnect cannot complete a visit | `INTERRUPTED`/`TECHNICAL_FAILURE` share the same property — no transition row from either leads to `PHARMACIST_COMPLETED` |
| Timeout cannot complete a visit | `EXPIRED`/`NO_SHOW` are both dead-end states with no outgoing edge toward completion |
| Vendor "meeting ended" cannot complete a visit | A vendor webhook can only ever produce a `ConnectionEvent`/`TechnicalFailureEvent` (Workstream D — `VendorWebhookReceipt` has no write path to `VirtualVisit.pharmacistCompletionAt`), which routes through `INTERRUPTED`, same as any other disconnect |
| A technical failure cannot complete an assessment | `TECHNICAL_FAILURE`'s "Assessment effect" column reads **None**, full stop, in every row it appears |
| A technical failure cannot trigger a claim | Same — "Claim effect: None" |
| A patient cannot mark pharmacist suitability | Every suitability-adjacent transition in Phase 1/3 lists "Pharmacist-actor-only" as a hard concurrency/actor constraint, not a UI convention |
| A patient cannot select the clinical fallback outcome | `FALLBACK_PENDING → {RESUMED_BY_*, IN_PERSON_REQUIRED, REFERRED}` are all pharmacist-actor-only rows |
| The pharmacist may stop without finalizing the assessment | `PHARMACIST_ENDED` exists as a distinct, reachable terminal state separate from `PHARMACIST_COMPLETED` |
| A modality switch requires rechecking every applicable guard | `FALLBACK_PENDING`'s transitions all require `renewedGuardsRef`, structurally, not by convention |
| A fallback may preserve already-documented clinical information without pretending the failed modality completed | The failed modality's own state (`INTERRUPTED`/`TECHNICAL_FAILURE`) stays recorded and visible in the audit trail; `FallbackTransition` references it rather than erasing it |
| Reconnect after expiry is denied | `EXPIRED` has no outgoing edge back into any active state — a "reconnect" from there is, by definition, a brand-new `VirtualVisit` |
| Reconnect after consent withdrawal is denied | `CONSENT_WITHDRAWN` is reachable from "any active state" and has no outgoing edge — the non-negotiable invariant that withdrawal blocks further interaction even on an active connection is enforced by this state having no exit |
| Reconnect after pharmacist-unsuitable is denied unless a new approved modality transition exists | `UNSUITABLE` routes to `IN_PERSON_REQUIRED`/`REFERRED`, both terminal for *this* visit; a genuinely new modality requires a new `ModalitySuitabilityDecision`, i.e., effectively a fresh Phase-1 pass, not a reconnect |
| Reconnect after delegate revocation is denied | Rejoin re-runs full authorization (Workstream F §5), which includes the delegate-grant check — a revoked grant fails there, before reaching `RECONNECTING → IN_PROGRESS` |
| A stale browser cannot overwrite a newer pharmacist decision | §2's `stateVersion` mechanism |
| Unknown states fail closed | The `UNKNOWN` row above — denial-only, no legitimate outgoing edge |

## 4. Cross-reference to Workstream D's non-negotiable examples

The task brief's own worked examples all check out against this table:

- `connection = disconnected` → `visit = completed`: **impossible** (Phase 2, `INTERRUPTED` row).
- `patient_participant = left` → `assessment = completed`: **impossible** (Phase 4,
  `PATIENT_LEFT` row).
- `visit = ended` → `claim = eligible`: **impossible** (`PHARMACIST_ENDED`'s claim effect is
  None; only `PHARMACIST_COMPLETED` ever reaches the claim boundary, and only through Task 02's
  own existing guards).
- `vendor_event = meeting_ended` → finalizes anything: **impossible** (routes through
  `TECHNICAL_FAILURE`/`INTERRUPTED` only).
- `modality = telephone` → implies video failed: **not implied** — `RESUMED_BY_TELEPHONE` is
  reachable from a clean `FALLBACK_PENDING` decision, not only from a failure path (a patient
  can choose telephone from the start, per Workstream G's "video is not mandatory").
- `technical_failure = true` blocking a *separately approved* fallback: `TECHNICAL_FAILURE →
  FALLBACK_PENDING` is a valid edge — the failure doesn't prevent starting a new, guarded
  fallback transition, it just can't complete anything on its own.
- `consent = withdrawn` blocking interaction even if the connection stays active: proven above
  — `CONSENT_WITHDRAWN` has no exit edge, regardless of `connectionState`.
