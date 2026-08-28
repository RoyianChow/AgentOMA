# Task 07 — Communication Audit Event Catalogue

**Workstream:** J (part 1 of 3) — append-only audit event catalogue

**Prepared:** 2026-08-27

**Repository design baseline:** `808fbe73219336544a4d72aef6676444a100ee2f`

**Migration/runtime effect:** none

**Production approval:** not granted

**Depends on:** [`communication-contracts-and-schema-proposal.md`](communication-contracts-and-schema-proposal.md)
(`CommunicationAuditEvent`, Contract 26) · [`consent-contact-and-preference-model.md`](consent-contact-and-preference-model.md)
· [`suppression-and-contact-change-policy.md`](suppression-and-contact-change-policy.md)
· [`outbox-and-delivery-state-machine.md`](outbox-and-delivery-state-machine.md) (every `E-*` transition's
`Audit` column) · [`webhook-and-reconciliation-design.md`](webhook-and-reconciliation-design.md)
· [`secure-portal-messaging-contract.md`](secure-portal-messaging-contract.md) and
[`secure-message-authorization-matrix.md`](secure-message-authorization-matrix.md)

## Decision summary

This document enumerates every `event_type` value the brief requires for
`CommunicationAuditEvent` (Contract 26), assigns each an allowlisted
`SafeCode<CommunicationAuditType>`, and states — per event type — the exact
fields Contract 26 permits it to carry. It invents no new table, endpoint, or
runtime effect, and it does not restate Contract 26's field list; it is the
enumeration Contract 26 left as `SafeCode<CommunicationAuditType>` without
naming its members.

Contract 26 already fixes what an audit event may **never** contain (no body,
excerpt, contact, challenge, token, provider raw payload, free-text note, or
recipient field) and what it always carries (opaque `entity_ref`, safe
`outcome_code`, safe `reason_code`, policy/template version references,
append-only, database-enforced). This document does not repeat those rules
except where a specific event type needs a narrower one.

## 1. Naming convention

Every event type follows `<domain>.<fact>`, matching the transition-log style
already used in Workstream E's `Audit` column (`intent.created`,
`dispatch.attempt_started`, `delivery.accepted`, and so on). This catalogue is
the authoritative list; Workstream E's own table is a subset of it repeated
for local readability and must not drift from this one. Where the two
disagree, this document governs, and the discrepancy is `UNRESOLVED(T07-D40)`
until reconciled in a follow-up edit.

## 2. Contact and verification events

| Event type | `entity_type` | Fires on | Permitted event-specific data | Never carries |
|---|---|---|---|---|
| `contact.added` | `ContactPoint` | New contact-point version created. | `channel`, `source_code` category (via `entity_ref` resolution, not inline). | Raw email/phone value, keyed-match digest, encrypted value. |
| `contact.verification_challenged` | `ContactVerificationChallenge` | Challenge issued. | `method` code (resolved via entity, not inlined here — Contract 26 has no `method` column; the reader follows `entity_ref`). | Challenge digest, code, or destination. |
| `contact.verified` | `ContactVerificationEvent` | Challenge consumed successfully. | Outcome only. | Code, digest, attempt count. |
| `contact.verification_failed` | `ContactVerificationEvent` | Attempt failed, rate-limited, or locked. | `outcome_code`, `safe_reason_code`. | Code, attempted value, requester IP. |
| `contact.superseded` | `ContactPoint` | Material change creates a new version. | Link is via `entity_ref` to the new version; the old version's own row states its terminal `invalidated_at`, not this event. | Old or new raw value. |
| `contact.disputed` | `ContactPoint` | Wrong-number/wrong-recipient or other dispute recorded. | `safe_reason_code`. | Reporter identity beyond `actor_ref`, dispute narrative. |
| `contact.suppressed` | `ContactPoint` | Contact-level suppression applied (cross-referenced with §4). | `safe_reason_code`. | — |

## 3. Consent events

| Event type | `entity_type` | Fires on | Permitted event-specific data | Never carries |
|---|---|---|---|---|
| `consent.captured` | `CommunicationConsentEvent` | `event_type = GRANTED`. | `purpose_ref`, `channel`, `policy_version`. | Notice wording, capture transcript. |
| `consent.expired` | `CommunicationConsentGrant` | Projection reaches `EXPIRED` at read or scheduled sweep. | `purpose_ref`, `channel`. | — |
| `consent.revoked` | `CommunicationConsentEvent` | `event_type = REVOKED`. | `purpose_ref`, `channel`, `safe_reason_code` (via the consent event's `revocation_reason_code`, resolved through `entity_ref`). | Revocation narrative. |
| `consent.withdrawn` | `CommunicationConsentEvent` | `event_type = WITHDRAWN`, patient/agent-initiated. | `purpose_ref`, `channel`. | — |
| `consent.superseded` | `CommunicationConsentEvent` | `event_type = SUPERSEDED`. | Link via `entity_ref`. | — |
| `consent.denied` | *(read-time, no row unless a decision was attempted)* | An orchestrator or staff action attempted to rely on consent that was not `ACTIVE` for the exact tuple. | `purpose_ref`, `channel`, `outcome_code = DENIED`. | The attempted contact value. |

`consent.denied` is the one consent event type that is not itself an entry in
`CommunicationConsentEvent` — it is what fires when *another* service's DAQ
term fails on the consent axis. It is included here because the brief lists
"consent ... denied" as a required audit fact and Contract 26's own
`event_type` enum is shared across all domain services, not owned by the
consent service alone.

## 4. Preference, quiet-hours, and suppression events

| Event type | `entity_type` | Fires on | Permitted event-specific data | Never carries |
|---|---|---|---|---|
| `preference.changed` | `CommunicationPreferenceProfile` | New profile version effective. | — | Accessibility/accommodation codes are on the entity, not duplicated here. |
| `quiet_hours.changed` | `QuietHoursPolicy` | New quiet-hours version effective. | — | Window times themselves (read via `entity_ref`). |
| `suppression.created` | `SuppressionEntry` | New entry, any `scope_code`. | `channel` (if scoped), `purpose_ref` (if scoped), `safe_reason_code`. | Contact value, complaint/bounce body. |
| `suppression.lifted` | `SuppressionEntry` | `E-I05`-adjacent authorized, evidenced unsuppression. | `safe_reason_code = AUTHORIZED_LIFT`. | Evidence narrative (see `evidence_ref` on the entity, itself opaque). |
| `suppression.lift_denied` | `SuppressionEntry` | An automatic or unauthorized unsuppression attempt (e.g. from a provider delivery event) is rejected. | `outcome_code = DENIED`. | — |

## 5. Message intent, dispatch, and delivery events

These are the audit rows Workstream E's transition catalogue already names in
its `Audit` column (§2.2–§2.5 of `outbox-and-delivery-state-machine.md`). They
are restated here as the authoritative enumeration, grouped by axis, with no
new field beyond what Contract 26 defines:

| Axis | Event types |
|---|---|
| Intent | `intent.created`, `intent.held`, `intent.released`, `intent.suppressed`, `intent.unsuppressed`, `intent.cancelled`, `intent.expired`, `intent.unknown`, `intent.completed`, `intent.superseded` |
| Dispatch/outbox | `outbox.created`, `outbox.claimed`, `outbox.released`, `dispatch.attempt_started`, `dispatch.denied`, `dispatch.sent`, `dispatch.failed_retryable`, `dispatch.failed_final`, `dispatch.uncertain`, `outbox.requeued`, `dispatch.reconciled_sent`, `dispatch.reconciled_not_sent`, `dispatch.unresolved` |
| Delivery | `delivery.accepted`, `delivery.delivered`, `delivery.failed`, `delivery.complaint`, `delivery.event_ignored_stale` |
| Webhook | `webhook.quarantined`, `webhook.accepted`, `webhook.duplicate`, `webhook.replayed`, `webhook.stale`, `webhook.reordered`, `webhook.unknown` |

`state.invalid_transition` (§2.6 of the state-machine document) is also a
member of this catalogue and fires for any of the four axes; its
`entity_type` is whichever axis the invalid attempt targeted, and it carries
the axis name, the observed source state, and the attempted destination as
allowlisted codes — never as free text, per §2.6's own rule.

Every row in this section maps 1:1 to a transition already defined elsewhere;
this catalogue adds no new transition and reclassifies none.

## 6. Work item and reconciliation events

| Event type | `entity_type` | Fires on |
|---|---|---|
| `work_item.created` | `CommunicationWorkItem` | E-I04 review branch, E-D08, E-D13, or any other transition whose `Work item` column is non-empty. |
| `work_item.assigned` | `CommunicationWorkItem` | Claim or explicit assignment. |
| `work_item.reviewed` | `CommunicationWorkItem` | Staff records a disposition without closing. |
| `work_item.resolved` | `CommunicationWorkItem` | `state → COMPLETED`. |
| `work_item.escalated` | `CommunicationWorkItem` | Approved escalation path taken (e.g. to privacy/security). |
| `reconciliation.opened` | `ReconciliationCase` | `E-R01`. |
| `reconciliation.assigned` | `ReconciliationCase` | `E-R02`. |
| `reconciliation.resolved_sent` | `ReconciliationCase` | `E-R03` → `RECONCILED_SENT`. |
| `reconciliation.resolved_not_sent` | `ReconciliationCase` | `E-R03` → `RECONCILED_NOT_SENT`. |
| `reconciliation.unresolved` | `ReconciliationCase` | `E-R04`. |
| `reconciliation.corrected` | `ReconciliationCase` | `E-R05`. |

## 7. Secure thread and message events

| Event type | `entity_type` | Fires on | Permitted event-specific data | Never carries |
|---|---|---|---|---|
| `thread.opened` | `SecureMessageThread` | New thread created and eligibility passed. | `thread_purpose_ref`. | Any thread content. |
| `thread.access_denied` | `SecureMessageThread` | Any of the thirteen eligibility checks (H's authorization list) fails on read or write. | `safe_reason_code`. | Which specific PHI field triggered the failure, if that itself would leak information; the reason code set is reviewed for this before production (`T07-D41`). |
| `thread.paused_authorization_changed` | `SecureMessageThread` | State → `PAUSED_AUTHORIZATION_CHANGED`. | — | — |
| `thread.paused_consent_withdrawn` | `SecureMessageThread` | State → `PAUSED_CONSENT_WITHDRAWN`. | — | — |
| `thread.marked_unsuitable` | `SecureMessageThread` | Pharmacist marks messaging unsuitable. | `actor_role_code = PHARMACIST`. | Clinical rationale text. |
| `thread.closed` | `SecureMessageThread` | State → `CLOSED`. | `safe_reason_code`. | — |
| `thread.withdrawn` | `SecureMessageThread` | Patient/agent withdraws. | — | — |
| `thread.expired` | `SecureMessageThread` | `expires_at` passed. | — | — |
| `thread.reopened` | `SecureMessageThread` | Approved reopening path, if one exists. | — | — |
| `participant.added` | `SecureThreadParticipant` | New participant version. | `participant_role_code`. | — |
| `participant.changed` | `SecureThreadParticipant` | Role or authorization reference changed. | `participant_role_code`. | — |
| `participant.revoked` | `SecureThreadParticipant` | Authorization revoked. | — | — |
| `assignment.changed` | `SecureMessageThread` | Pharmacist reassignment. | — | Outgoing/incoming pharmacist identity is available only via `entity_ref` resolution by an authorized reviewer, never inline as a name. |
| `message.sent` | `SecureMessage` | New message committed. | `author_participant_role`, `queue_routing_code`. | Body, subject, excerpt. |
| `message.denied` | `SecureMessage` | Send attempt failed authorization, size, or sanitization checks. | `safe_reason_code`. | The rejected content. |
| `message.superseded` | `SecureMessage` | Correction recorded. | Link via `entity_ref`. | — |
| `acknowledgement.recorded` | `SecureMessageAcknowledgement` | Any of `PRESENTED`/`OPENED`/`EXPLICITLY_ACKNOWLEDGED`. | `acknowledgement_type`. | — |
| `queue_item.routed` | `SecureMessageQueueItem` | New queue item created. | `route_code`. | The message body that produced the route (routing itself is structural per H, never content-derived — see §9). |
| `queue_item.claimed` | `SecureMessageQueueItem` | Staff claim. | — | — |
| `queue_item.completed` | `SecureMessageQueueItem` | Review completed. | — | — |
| `export.allowed` | `SecureMessage` or `SecureMessageThread` | Approved transfer to the clinical record occurs. | — | The exported content itself — the audit event proves the transfer happened and who authorized it, not what moved. |
| `export.denied` | `SecureMessage` or `SecureMessageThread` | Unauthorized export attempted. | `safe_reason_code`. | — |

## 8. Access and administrative events

| Event type | `entity_type` | Fires on |
|---|---|---|
| `access.staff_support_view` | *(whatever entity was viewed)* | Technical support or administrative staff views any record — required because Workstream H denies technical support message-body access by default; this event is how that denial (or an approved narrow exception) becomes auditable. |
| `access.denied_cross_scope` | *(whatever entity was targeted)* | Cross-patient, cross-pharmacy, cross-tenant, or wrong-audience access attempt of any kind, across any Task 07 surface. |
| `lifecycle.kill_switch_engaged` | *(service-level, no single entity)* | Task 11 kill switch halts synthetic or (once approved) production dispatch. |
| `lifecycle.kill_switch_released` | *(service-level)* | Kill switch lifted by an authorized operator. |

`access.denied_cross_scope` is deliberately broad: it is the single event
type that a leakage/authorization test suite can grep for across every
surface in Task 07, rather than trusting that each surface remembered to log
its own denial under a differently spelled name.

## 9. What routing events prove, and what they do not

`queue_item.routed` and `work_item.created` prove that a routing decision was
made and record its `SafeCode<QueueRoute>`/`SafeCode<CommunicationWorkType>`
value. Per Workstream H and the brief's own mandatory stop condition, that
code must be derivable from trusted structural signals only (thread type,
participant role, explicit patient-selected administrative category, staff
action) and never from AI, NLP, keyword, or sentiment analysis of message
content. This catalogue does not enforce that rule — the architecture test
named in `logging-and-leakage-control.md` §5 does — but it records the
routing fact so that a later audit can confirm the enforced rule and the
audited outcome never diverged.

## 10. Retention classification is not decided here

Every event type above inherits Contract 26's `retention_classification` and
`retain_until` fields. This document assigns no period, no per-type retention
exception, and no deletion trigger — that mapping is
`privacy-security-and-retention-plan.md` §4, driven by the same
`UNRESOLVED(T07-D27)` decision every other Workstream A–I document already
defers to. An audit event without a resolved classification is retained under
the conservative default (indefinite, hold-aware) stated there, never deleted
by a guessed schedule.

## 11. Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D27 | Communication record classification and retention (existing, reused) | §10, and every event type's `retention_classification` |
| T07-D40 | Whether Workstream E's inline `Audit` column and this catalogue are kept in sync by convention or by a generated check | §1 |
| T07-D41 | Whether `thread.access_denied`'s reason-code set needs narrowing before production, to avoid the reason itself becoming a side-channel (e.g. distinguishing "wrong patient" from "wrong pharmacy" could leak scope information to a probing actor) | §7 |

## Workstream J (part 1) acceptance check

- Every event type the brief's Workstream J audit-catalogue list requires
  (§"Audit catalogue" of the task brief) has a named `SafeCode` entry above,
  grouped by the same domains the brief lists.
- No event type carries a forbidden field per Contract 26 or the brief's
  audit-catalogue exclusion list; each table's "Never carries" column states
  the specific temptation for that domain rather than repeating the generic
  rule.
- Routing-decision events are shown to prove the fact of a structural
  decision, never its content-derived justification, consistent with the
  architecture test required by the brief and named in
  `logging-and-leakage-control.md`.
- No new table, column, endpoint, or retention period was invented; the one
  new field-shape observation (`consent.denied` is not a row in
  `CommunicationConsentEvent`) is called out rather than silently assumed.
- This document adds no TypeScript, SQL, migration, or runtime effect.

## Current disposition

**Workstream J, part 1 — communication audit event catalogue: complete as
design documentation.**

- **Audit mapping:** PASS as documentation; BLOCKED on T07-D02 (Task 07 scope
  approval and Task 11 Checkpoint 1) for any runnable emission of these
  events, and on T07-D27 for retention duration.
- **Real PHI, contact data, or runtime emission:** NO.
- **Production schema, authentication, or vendor changed:** NO.

Continue to
[`privacy-security-and-retention-plan.md`](privacy-security-and-retention-plan.md)
for the retention mapping this catalogue defers to, and
[`logging-and-leakage-control.md`](logging-and-leakage-control.md) for the
application-log rules that keep this same class of content out of
general-purpose logs, not just out of the audit trail.
