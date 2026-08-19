# Task 06 — Audit Event Catalogue

Every event below is an instance of `VirtualVisitAuditEvent` (Workstream D), which deliberately
mirrors this repo's existing `audit_log` shape: append-only, DB-enforced-immutable (same
REVOKE + trigger pattern documented in `docs/PROJECT_OVERVIEW.md` §7), opaque references and
safe metadata only. Task 06 does not invent a second audit mechanism.

## Universal envelope (every event, no exceptions)

Event ID · event type + schema version · time (UTC) · opaque actor reference · opaque subject
reference (only where necessary) · opaque pharmacy/custodian scope · opaque visit or thread
reference · action · outcome · safe reason code · policy version · correlation reference ·
source service.

**Never present, in any event, under any circumstance:** clinical content · message bodies ·
identity-verification answers · exact patient location · contact details · tokens · room
secrets · media · transcripts · raw SDP or ICE data · TURN credentials · vendor webhook secrets
· full IP addresses · device fingerprints.

This list is enforced the same way the rest of this task enforces leakage prohibitions:
Workstream D's field definitions simply don't include these as loggable values anywhere, so an
event *cannot* carry them without someone adding a new field first — which is exactly the kind
of change this catalogue exists to make conspicuous.

## Event catalogue

| Category | Events |
|---|---|
| Visit lifecycle | `visit_created` · `visit_scheduled` · `visit_started` · `visit_cancelled` · `visit_no_show` · `visit_expired` |
| Join/waiting room | `join_allowed` · `join_denied` · `waiting_room_entry` |
| Admission | `pharmacist_admission` · `pharmacist_admission_denied` |
| Identity/location | `identity_confirmed` · `identity_failed` · `location_confirmed` · `cross_jurisdictional_block` |
| Consent | `consent_captured` · `consent_withdrawn` · `consent_superseded` |
| Privacy | `privacy_confirmed` |
| Suitability | `suitability_decided` · `suitability_reassessed` |
| Participants | `participant_admitted` · `participant_denied` · `participant_removed` · `participant_left` · `participant_grant_revoked` |
| Connection/technical | `connection_degraded` · `connection_recovered` · `visit_interrupted` · `technical_failure` |
| Reconnect | `reconnect_attempted` · `reconnect_succeeded` · `reconnect_denied` |
| Fallback | `fallback_offered` · `fallback_approved` · `contingency_selected` |
| Completion | `pharmacist_ended` · `pharmacist_completed` |
| Assessment/claim linkage | `assessment_link_allowed` · `assessment_link_denied` · `assessment_completion_denied_visit_state` · `claim_action_denied_visit_state` |
| Secure messaging | `secure_message_sent` · `secure_message_delivery_failed` · `secure_message_read` · `secure_message_denied` · `thread_closed` · `thread_withdrawn` · `thread_expired` |
| Vendor/webhook | `vendor_webhook_accepted` · `vendor_webhook_rejected` · `vendor_webhook_duplicate` · `vendor_webhook_replayed` |
| Session | `session_expired` |
| Security | `suspicious_join_activity` · `administrative_support_access` |

Every category above maps one-for-one to the required list in the task brief — nothing on that
list was dropped, and nothing here was invented beyond it (the visit-lifecycle,
identity/consent/suitability, and completion events also directly mirror Workstream H's state
table, so an auditor reading this catalogue alongside that state machine can verify each
transition really does produce an event).

## Two events worth calling out specifically

- **`assessment_completion_denied_visit_state`** and **`claim_action_denied_visit_state`** exist
  specifically so that a *denial* caused by Workstream J's guards is itself auditable — proving
  the boundary held, not just assuming it did because nothing bad happened.
- **`technical_failure`** is a distinct event type from `pharmacist_completed` in every possible
  reading of the schema — there is no shared "outcome" enum value that could make these two
  look the same in an audit export, which is precisely the confusion Workstream H's threat
  model (Group D) identifies as the highest-likelihood real mistake in this whole task.

## What this catalogue does not include

No recording/transcription events (nothing to log — Workstream K §2), no AI-summary events
(none exist), no external-notification delivery events (Task 07's own audit catalogue owns
those — this document only logs the Task 06-side facts Task 07 reads, not Task 07's own
dispatch/delivery lifecycle).
