# Task 04 — Data Minimization and Retention Proposal

**Status:** Draft for review
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Real PHI or personal information:** Prohibited
**Database implementation:** Blocked pending revised Task 01 approval
**Task 11 Checkpoint 1:** Not yet reviewed

## 1. Purpose

This document defines the proposed field-level data inventory, collection
minimum, access boundary, client exposure, cleanup trigger, retention approach,
deletion method, backup behavior, legal-hold boundary, and approval ownership
for the synthetic Task 04 booking and waitlist prototype.

The proposal covers:

- Public availability.
- Booking drafts.
- Confirmed bookings.
- Cancelled and rescheduled bookings.
- Capacity units and temporary holds.
- Waitlist entries and offers.
- Identity and delegation references.
- Contact details.
- Language and accessibility-preparation fields.
- Idempotency records.
- Management-access tokens.
- Domain events and transactional outbox records.
- Audit records.
- Rate-limit records.
- Server logs and metrics.
- Analytics.
- Backups and restored copies.

This proposal does not establish a legally required production retention
period.

It distinguishes:

- `TECHNICAL_RECOMMENDATION`
- `PRODUCT_DECISION_REQUIRED`
- `PRIVACY_LEGAL_DECISION_REQUIRED`
- `APPROVED_PRODUCTION_POLICY`

No item is an `APPROVED_PRODUCTION_POLICY` unless the authorized owner records
that approval explicitly.

## 2. Governing principles

### DM-INV-01 — Collect only what is necessary

Task 04 must not collect or retain information merely because it might be
useful later.

Every field must have:

- A defined administrative purpose.
- A source of truth.
- An authorized user or system.
- A defined lifecycle.
- A deletion or archival outcome.
- A required approval owner.

### DM-INV-02 — Administrative booking only

Task 04 must not collect:

- Symptoms.
- Diagnoses.
- Medications.
- Allergies.
- Pregnancy information.
- Clinical urgency.
- Reason-for-visit narratives.
- Clinical notes.
- Health-card information.
- Prescription information.
- Claim information.
- Payment information.

### DM-INV-03 — Synthetic data only

The Task 01 sandbox may use only deterministic, unmistakably synthetic data.

Synthetic fixtures must not be copied, transformed, masked, redacted, or
derived from production records.

### DM-INV-04 — No unnecessary client exposure

Information must be minimized before it reaches a client component.

Hiding a field in the browser is not data minimization.

### DM-INV-05 — No raw secrets

Raw management tokens, raw idempotency keys, limiter secrets, session secrets,
and credentials must not be stored in ordinary application records, logs, or
evidence.

### DM-INV-06 — Expiry is not deletion by itself

An expired record must enter an approved cleanup, archival, or destruction
process.

### DM-INV-07 — Backups do not extend retention indefinitely

Deleted or expired information must not remain permanently available through
backups, snapshots, restored copies, or developer exports.

### DM-INV-08 — Legal hold requires authorized direction

Task 04 must not invent legal-hold criteria.

A production legal hold may suspend ordinary destruction only after an
authorized privacy or legal owner identifies:

- Scope.
- Authority.
- Start time.
- Records affected.
- Access restrictions.
- Review date.
- Release condition.

### DM-INV-09 — Audit history is distinct from payload retention

A safe audit record may need a different lifecycle than the source booking,
token, draft, log, or message-related record.

Audit records must not become copies of the original payload.

### DM-INV-10 — Unknown policy fails closed

Production data collection or retention remains disabled when the applicable
policy is missing, ambiguous, expired, or contradictory.

## 3. Classification vocabulary

### `PUBLIC_SAFE`

Information intentionally approved for public display, such as a minimized
synthetic service label and coarse slot availability.

### `INTERNAL`

Operational information that is not intended for public access.

### `PERSONAL_INFORMATION`

Information about an identifiable individual.

### `PHI_POTENTIAL`

Information that may become personal health information in a production
health-care context, even when the current fixture is synthetic.

### `SECURITY_SENSITIVE`

Tokens, digests, authorization references, session data, secrets, or records
whose exposure could permit misuse.

### `SYNTHETIC`

Deterministic non-production information created only for testing.

### `PROHIBITED_TASK04`

Information Task 04 must not collect or retain.

## 4. Retention-decision vocabulary

### `TECHNICAL_RECOMMENDATION`

An engineering proposal intended to reduce risk and storage.

It is not a legal conclusion or production policy.

### `PRODUCT_DECISION_REQUIRED`

The service owner must decide whether the information is needed and for how
long.

### `PRIVACY_LEGAL_DECISION_REQUIRED`

Privacy or legal owners must determine the applicable production purpose,
authority, hold, retention, access, and destruction requirements.

### `APPROVED_PRODUCTION_POLICY`

A documented production policy approved by the authorized owners.

No Task 04 item currently has this status.

## 5. General client and storage boundaries

Information must not be placed in:

- Query strings.
- URL fragments.
- Page titles.
- Referrers.
- Browser storage.
- Client-side persistent caches.
- Analytics.
- Session replay.
- Error-monitoring breadcrumbs.
- Client console logs.
- Public filenames.
- Screenshot filenames.
- Evidence filenames.
- Domain-event metadata beyond the approved minimum.
- Rate-limit keys in raw form.
- Notification placeholders.
- Calendar entries.

Protected responses must use safe cache headers.

Production PHI-bearing data must remain server-rendered and scoped to the
authorized actor, subject, pharmacy, and tenant.

## 6. Dataset inventory

## 6.1 Public availability

### Purpose

Allow a public user to discover coarse synthetic appointment availability.

### Proposed fields

- Public service-category label.
- Modality.
- Public location label where applicable.
- Start and end time.
- Display timezone.
- Coarse availability state.
- Opaque short-lived slot reference.

### Source of truth

Server-owned slot and service configuration.

### Classification

- `PUBLIC_SAFE`
- `SYNTHETIC`

### Collection necessity

Only fields required to let the user select a possible appointment slot.

### Authorized access

Public read access to the minimized projection only.

### Client exposure

Yes, but only the approved public projection.

### Prohibited fields

- Internal slot identifier.
- Staff identity.
- Exact remaining capacity.
- Booking count.
- Waitlist count.
- Tenant configuration.
- Private schedule.
- Patient activity.

### Retention trigger

Public projection generation or slot-reference expiry.

### Proposed retention

- Projection response: no authoritative persistence.
- Opaque slot reference: valid only for its bounded technical lifetime.
- Server source records: governed separately as slot configuration.

**Decision class:** `TECHNICAL_RECOMMENDATION`

### Cleanup method

Expired references become invalid and are removed or rendered unusable through
the approved cleanup process.

### Legal-hold behavior

Not expected to apply to ordinary public projections.

Any production exception requires authorized review.

### Backup behavior

Public projections should not be stored in backups as independent records.

### Required approvals

- Product.
- Privacy.
- Security.
- Accessibility.
- Task 11.

## 6.2 Booking drafts

### Purpose

Temporarily preserve an incomplete synthetic booking workflow before
submission.

### Proposed fields

- Opaque draft reference.
- Service category.
- Modality.
- Opaque slot reference.
- Structured language preference.
- Structured accessibility-preparation indicator.
- Synthetic actor and subject references where server-bound.
- Created and last-updated times.
- Expiry time.
- Synthetic marker.

### Source of truth

Server-owned synthetic draft store where approved.

### Classification

- `INTERNAL`
- `PHI_POTENTIAL`
- `SYNTHETIC`

### Collection necessity

Only fields necessary to resume the bounded booking workflow.

### Authorized access

The authorized synthetic actor and approved server services.

### Client exposure

Only the currently displayed minimum.

The complete draft must not enter browser storage.

### Retention trigger

- Successful booking submission.
- Explicit abandonment.
- Draft expiry.
- Session or management-path invalidation.

### Proposed retention

Synthetic technical recommendation:

- Delete immediately after successful booking creation.
- Expire abandoned drafts after a short bounded technical period.
- Do not retain drafts for analytics or future marketing.

The exact synthetic duration must be configuration-backed and clearly marked
as non-production.

Production duration requires product and privacy approval.

### Cleanup method

Hard delete the draft and revoke any draft-management reference.

Where an operational tombstone is needed, retain only:

- Opaque draft reference.
- Safe deletion reason.
- Deletion time.
- Synthetic marker.

### Legal-hold behavior

A production legal hold must not preserve an unrestricted draft automatically.

Authorized review must determine whether any minimum evidence is required.

### Backup behavior

Expired drafts may remain only until the applicable backup expires.

Restored copies must rerun draft-expiry cleanup before use.

### Required approvals

- Product.
- Privacy.
- Security.
- Task 11.

## 6.3 Confirmed bookings

### Purpose

Represent an authoritative administrative appointment.

### Proposed fields

- Opaque booking identifier.
- Pharmacy and tenant scope.
- Service-category reference.
- Slot reference.
- Modality.
- Actor reference.
- Subject reference.
- Delegation-grant reference where applicable.
- Administrative booking state.
- Creation and transition times.
- Predecessor and successor references.
- Safe reason code.
- Aggregate version.
- Synthetic marker.

### Source of truth

Task 04 booking domain service and approved PostgreSQL schema.

### Classification

- `INTERNAL`
- `PERSONAL_INFORMATION` in production.
- `PHI_POTENTIAL`
- `SYNTHETIC` in the current environment.

### Collection necessity

Required to maintain the appointment, capacity, authorization, lifecycle, and
history.

### Authorized access

- Authorized subject.
- Authorized delegate within scope.
- Authorized staff within pharmacy and tenant scope.
- Approved system workers.

### Client exposure

Only a minimum authorized projection.

The complete booking record must remain server-side.

### Retention trigger

- Appointment completion boundary defined outside Task 04.
- Cancellation.
- Rescheduling.
- Expiry.
- Production policy event.
- Account or service closure where applicable.

### Proposed retention

No production period is approved.

Technical proposal:

- Preserve active booking state while operationally required.
- After terminal state, retain only the minimum record required by approved
  product, audit, privacy, and legal policy.
- Do not retain duplicate full payloads in logs, analytics, events, or caches.

**Decision class:** `PRIVACY_LEGAL_DECISION_REQUIRED`

### Cleanup method

Potential production methods include:

- Field minimization after the operational period.
- Restricted archival.
- Deletion after approved retention expires.
- Preservation of opaque audit references without full payload duplication.

The final method requires approval.

### Legal-hold behavior

An authorized hold may suspend ordinary deletion for the exact scoped record.

### Backup behavior

Deleted booking data must age out through the approved backup lifecycle.

Restored backups must rerun expiry, deletion, revocation, and scope checks.

### Required approvals

- Product.
- Privacy.
- Legal.
- Security.
- Professional owner where applicable.
- Task 11.

## 6.4 Cancelled and rescheduled bookings

### Purpose

Preserve administrative history and prevent contradictory or duplicate
appointments.

### Proposed fields

- Booking identifier.
- Prior and resulting state.
- Cancellation or rescheduling time.
- Safe reason code.
- Predecessor or successor reference.
- Capacity-release result.
- Aggregate version.
- Opaque audit and event references.

### Source of truth

Task 04 booking domain service.

### Classification

Same as confirmed bookings.

### Collection necessity

Required for:

- Historical integrity.
- Idempotency.
- Capacity reconciliation.
- Reminder supersession.
- Dispute investigation.
- Safe recovery.

### Authorized access

Minimum necessary authorized actors and systems.

### Client exposure

Only the current authorized status and minimum historical relationship.

### Retention trigger

Terminal booking state and expiration of approved operational or recordkeeping
need.

### Proposed retention

No production period is approved.

Technical proposal:

- Do not delete or rewrite the predecessor merely because a successor exists.
- Minimize payload after the approved operational period.
- Retain only the historical relationship and safe evidence required by the
  approved policy.

**Decision class:** `PRIVACY_LEGAL_DECISION_REQUIRED`

### Cleanup method

Approved archival, minimization, or destruction after the policy period.

### Legal-hold behavior

Scoped authorized hold may suspend destruction.

### Backup behavior

Restored records must preserve predecessor/successor integrity and rerun
destruction eligibility.

### Required approvals

- Product.
- Privacy.
- Legal.
- Audit owner.
- Task 11.

## 6.5 Capacity units and temporary holds

### Purpose

Prevent overbooking and reserve capacity for bounded approved transactions.

### Proposed fields

Capacity unit:

- Slot reference.
- Opaque unit reference.
- Booking reference or hold reference.
- State version.
- Creation and transition times.

Temporary hold:

- Opaque hold identifier.
- Slot and unit references.
- Hold purpose.
- Offer reference where applicable.
- Created, expiry, consumed, and released times.
- Current state.

### Source of truth

Approved PostgreSQL capacity model.

### Classification

- `INTERNAL`
- `SYNTHETIC`
- `SECURITY_SENSITIVE` where linkage could reveal activity.

### Collection necessity

Required for transactional capacity enforcement.

### Authorized access

Task 04 domain services and authorized operational staff where necessary.

### Client exposure

No.

The client receives only a coarse availability result.

### Retention trigger

- Hold consumption.
- Hold release.
- Hold expiry.
- Booking cancellation.
- Reconciliation completion.

### Proposed retention

Synthetic technical recommendation:

- Active holds exist only until their configured expiry or transaction result.
- Expired, released, or consumed holds are removed or minimized after
  reconciliation and evidence capture.
- Capacity-unit rows may remain as slot configuration while ownership fields
  are cleared.

Production durations require operational and privacy approval.

### Cleanup method

- Release unit ownership transactionally.
- Remove or minimize terminal hold records after reconciliation.
- Preserve only safe audit references where required.

### Legal-hold behavior

Ordinary expired holds should not be preserved automatically.

A specific authorized hold may preserve minimum transition evidence.

### Backup behavior

A restored backup must immediately rerun expiry and reconciliation before
accepting new booking commands.

### Required approvals

- Engineering.
- Operations.
- Privacy.
- Security.
- Task 11.

## 6.6 Waitlist entries

### Purpose

Represent an authorized request to be considered for future availability.

### Proposed fields

- Opaque entry identifier.
- Pharmacy and tenant scope.
- Service-category reference.
- Modality preference.
- Actor and subject references.
- Delegation-grant reference where applicable.
- Current state.
- Created and transition times.
- Safe ordering metadata.
- Aggregate version.
- Synthetic marker.

### Source of truth

Task 04 waitlist domain service.

### Classification

- `INTERNAL`
- `PERSONAL_INFORMATION` in production.
- `PHI_POTENTIAL`
- `SYNTHETIC` currently.

### Collection necessity

Required for safe offer selection and lifecycle management.

### Authorized access

Authorized subject, delegate, staff, and approved workers.

### Client exposure

Only the authorized minimum.

Exact position and list length are prohibited.

### Retention trigger

- Promotion.
- Cancellation.
- Expiry.
- Service closure.
- Approved product-policy event.

### Proposed retention

Technical recommendation:

- Active entries remain only while eligible for the approved waitlist.
- Cancelled, promoted, or expired entries are minimized after operational
  reconciliation.
- No indefinite retention for analytics.

Production period requires product, privacy, and legal approval.

### Cleanup method

- Remove unnecessary preferences and access references.
- Preserve only safe terminal-state and audit linkage where approved.
- Delete after the approved retention period.

### Legal-hold behavior

Only an authorized scoped hold may suspend destruction.

### Backup behavior

Restored entries must rerun expiry, grant, eligibility, and cancellation
checks before use.

### Required approvals

- Product.
- Privacy.
- Legal.
- Operations.
- Task 11.

## 6.7 Waitlist offers

### Purpose

Provide a bounded opportunity to accept one available slot.

### Proposed fields

- Opaque offer identifier.
- Waitlist-entry reference.
- Slot reference.
- Capacity-hold reference.
- Created and expiry times.
- Offer state.
- Accepted, declined, expired, or cancelled time.
- Safe reason code.
- Aggregate version.

### Source of truth

Task 04 waitlist-offer domain service.

### Classification

- `INTERNAL`
- `SECURITY_SENSITIVE`
- `PHI_POTENTIAL`
- `SYNTHETIC`

### Collection necessity

Required for atomic promotion, expiry, recovery, and idempotency.

### Authorized access

Authorized subject or delegate, approved staff, and approved workers.

### Client exposure

Only a minimized authorized projection.

Raw management secrets are excluded.

### Retention trigger

- Acceptance.
- Decline.
- Cancellation.
- Expiry.
- Reconciliation completion.

### Proposed retention

Technical recommendation:

- Pending offers persist only until terminal state.
- Terminal offers are minimized after reconciliation.
- Full offer-management payloads are not retained indefinitely.

Production duration requires approval.

### Cleanup method

- Revoke management access.
- Release or consume the hold.
- Remove unnecessary transient fields.
- Retain safe transition evidence only where approved.

### Legal-hold behavior

Requires authorized scoped direction.

### Backup behavior

Restored offers must be re-evaluated against authoritative time and state.

Expired offers must never become active because of restoration.

### Required approvals

- Product.
- Privacy.
- Security.
- Operations.
- Task 11.

## 6.8 Identity and delegation references

### Purpose

Bind an action to the correct actor, subject, scope, and authorization grant.

### Proposed fields

- Opaque actor reference.
- Opaque subject reference.
- Opaque delegation-grant reference.
- Actor type.
- Pharmacy and tenant scope.
- Authorization-policy version.
- Safe grant-state reference where needed.

### Source of truth

Synthetic Task 01 fixtures now; future Task 05 authority in production.

### Classification

- `INTERNAL`
- `PERSONAL_INFORMATION` in production.
- `SECURITY_SENSITIVE`
- `SYNTHETIC` currently.

### Collection necessity

Required for authorization and audit attribution.

### Authorized access

Server authorization services and approved audit users.

### Client exposure

Only minimum actor context where required.

Complete identity or grant objects are prohibited.

### Retention trigger

- Booking or waitlist record lifecycle.
- Grant expiry or revocation.
- Audit-policy requirement.
- Production identity-policy event.

### Proposed retention

Task 04 must not copy full production identity or delegation records.

Technical proposal:

- Store only opaque references and policy versions necessary for the booking
  action.
- Resolve current authorization from Task 05 at action time.
- Remove unnecessary linkage after approved operational and audit needs end.

**Decision class:** `PRIVACY_LEGAL_DECISION_REQUIRED`

### Cleanup method

Delete or unlink references when the approved booking and audit retention
period ends, subject to authorized hold.

### Legal-hold behavior

Requires Task 05 and privacy/legal coordination.

### Backup behavior

Restoration must not reactivate expired, revoked, suspended, or superseded
authority.

### Required approvals

- Task 05 owner.
- Privacy.
- Security.
- Legal where applicable.
- Task 11.

## 6.9 Contact details

### Purpose

No production purpose is approved under Task 04.

Task 04 may use only non-deliverable synthetic destinations for bounded tests.

### Proposed fields

Current synthetic prototype:

- Opaque non-deliverable contact reference where strictly required.
- Synthetic channel category.

Task 04 must not store a real-format recipient merely for realism.

### Source of truth

Future approved Task 07 contact authority.

### Classification

- `PERSONAL_INFORMATION` in production.
- `SECURITY_SENSITIVE`
- `SYNTHETIC` currently.
- Raw production contacts are `PROHIBITED_TASK04`.

### Collection necessity

Task 04 does not need a production email address or telephone number to create
an appointment.

### Authorized access

No production access under Task 04.

### Client exposure

No real contact details.

### Retention trigger

End of the synthetic test or future approved Task 07 lifecycle.

### Proposed retention

- Synthetic non-deliverable references: disposable test data.
- Production contact values: not retained by Task 04.
- Domain events contain no contact details.

### Cleanup method

Delete synthetic destination fixtures with the disposable environment.

### Legal-hold behavior

Not defined by Task 04.

### Backup behavior

Synthetic contact fixtures must not enter production backups.

### Required approvals

- Task 07.
- Privacy.
- Security.
- Product.
- Task 11.

## 6.10 Language and accessibility-preparation fields

### Purpose

Support administrative preparation without requiring medical disclosure.

### Proposed fields

Language:

- `none_recorded`
- `english`
- `french`
- `interpreter_preparation_requested`
- `unknown`

Accessibility preparation:

- `none_recorded`
- `preparation_requested`
- `contact_required`
- `unknown`

### Source of truth

Authorized booking input or future approved patient-profile source.

### Classification

- `PERSONAL_INFORMATION` in production.
- `PHI_POTENTIAL`
- `SYNTHETIC` currently.

### Collection necessity

Only structured administrative indicators needed to prepare access.

### Authorized access

Authorized subject, delegate, and minimum necessary staff.

### Client exposure

Only the subject’s own authorized values and minimum staff projection.

### Prohibited content

- Diagnosis.
- Disability description.
- Medical explanation.
- Unrestricted accommodation narrative.
- Clinical language needs.

### Retention trigger

- Booking completion or terminal state.
- Supersession by a newer preference.
- Profile-source lifecycle where applicable.

### Proposed retention

Technical proposal:

- Keep booking-specific indicators only while required for that appointment
  and approved follow-up.
- Do not retain unrestricted historical preference copies in every booking.
- Use a current authoritative profile reference where a future approved design
  permits it.

Production duration requires privacy, accessibility, and product approval.

### Cleanup method

Delete or minimize appointment-specific preparation values after the approved
operational period.

### Legal-hold behavior

Requires authorized decision where applicable.

### Backup behavior

Expired values must age out through normal backup expiry and must not overwrite
newer preferences after restoration.

### Required approvals

- Accessibility owner.
- Product.
- Privacy.
- Operations.
- Task 11.

## 6.11 Idempotency records

### Purpose

Prevent duplicate booking, cancellation, rescheduling, waitlist, and
offer-acceptance effects.

### Proposed fields

- Opaque record identifier.
- Trusted command scope.
- Operation type.
- Idempotency-key digest.
- Canonical request digest.
- Command state.
- Safe response snapshot.
- Created and completion times.
- Expiry category.
- Synthetic marker.

### Source of truth

Task 04 idempotency service.

### Classification

- `INTERNAL`
- `SECURITY_SENSITIVE`
- `PHI_POTENTIAL`
- `SYNTHETIC`

### Collection necessity

Required for retry safety and unknown-outcome recovery.

### Authorized access

Task 04 command services and minimum necessary operations users.

### Client exposure

Only a safe command receipt or result.

Raw keys and stored digests are not exposed.

### Retention trigger

- Command completion.
- Terminal failure.
- Maximum approved retry/recovery window.
- Reconciliation completion.

### Proposed retention

Technical recommendation:

- Retain only long enough to cover the approved retry, timeout, and
  reconciliation window.
- Remove or minimize response snapshots after they can no longer support a
  legitimate retry.
- Never retain raw request bodies.

The exact production window requires engineering, product, privacy, and
operations approval.

### Cleanup method

Delete expired idempotency records or retain only a minimum non-reusable
tombstone where required to prevent unsafe key reuse.

### Legal-hold behavior

A scoped authorized hold may preserve the minimum record.

### Backup behavior

Restored expired records must not create new effects.

Cleanup and reconciliation run before mutable traffic resumes.

### Required approvals

- Engineering.
- Product.
- Privacy.
- Operations.
- Task 11.

## 6.12 Management-access tokens

### Purpose

Provide a bounded authorized path to one booking or waitlist workflow.

### Proposed stored fields

- Opaque token-record identifier.
- One-way token digest.
- Resource reference.
- Action scope.
- Actor or subject binding.
- Pharmacy and tenant scope.
- Issue and expiry times.
- Consumption and revocation times.
- Current state.

### Source of truth

Task 04 management-access service.

### Classification

- `SECURITY_SENSITIVE`
- `PHI_POTENTIAL`
- `SYNTHETIC`

### Collection necessity

Required only where a reviewed bounded management path is used.

### Authorized access

Server verification service and restricted security operations.

### Client exposure

The raw presented secret may exist only in the approved access flow.

The stored record and digest remain server-side.

### Retention trigger

- Consumption.
- Expiry.
- Revocation.
- Resource termination.
- Reconciliation completion.

### Proposed retention

Technical recommendation:

- Raw token: never stored.
- Active digest record: until expiry, consumption, or revocation.
- Terminal record: minimize after a short approved replay-detection and
  reconciliation period.
- Do not retain reusable access material in logs or evidence.

Production period requires security and privacy approval.

### Cleanup method

- Revoke use.
- Remove the digest after the approved security period.
- Preserve only safe terminal evidence where required.

### Legal-hold behavior

An authorized hold must never make the token usable again.

### Backup behavior

Restoration must not reactivate consumed, expired, or revoked access.

### Required approvals

- Security.
- Privacy.
- Product.
- Task 05 where identity-bound.
- Task 11.

## 6.13 Domain events and transactional outbox records

### Purpose

Record a minimum administrative fact for a future authorized consumer.

### Proposed fields

- Event identifier.
- Event type and schema version.
- Aggregate type and opaque reference.
- Aggregate version.
- Occurrence time.
- Protected pharmacy and tenant scope.
- Safe reason code.
- Synthetic marker.
- Source capability.
- Usefulness expiry where approved.
- Dispatch state.

### Source of truth

Task 04 domain transaction.

### Classification

- `INTERNAL`
- `SECURITY_SENSITIVE`
- `PHI_POTENTIAL`
- `SYNTHETIC`

### Collection necessity

Required for transactional integration evidence and future Task 07 handoff.

### Authorized access

Task 04, authorized audit/operations users, and future approved Task 07
consumer.

### Client exposure

No.

### Prohibited fields

- Name.
- Email address.
- Telephone number.
- Clinical information.
- Accessibility details.
- Language details unless specifically approved.
- Health-card information.
- Raw token.
- Message body.
- Management URL.

### Retention trigger

- Event supersession.
- Cancellation.
- Usefulness expiry.
- Consumer reconciliation.
- Approved event-retention policy.

### Proposed retention

Technical recommendation:

- Keep synthetic events only for the test and evidence lifecycle.
- Mark stale events as cancelled, superseded, or expired.
- Remove payload-bearing records after approved reconciliation and evidence
  needs end.
- Do not treat the outbox as indefinite history.

Production duration requires Task 04, Task 07, privacy, legal, audit, and
operations approval.

### Cleanup method

Delete or archive according to the approved event policy while preserving
minimum audit linkage.

### Legal-hold behavior

Requires authorized cross-task direction.

### Backup behavior

Restored outbox records must not dispatch automatically.

Current aggregate state, consent, contact, expiry, and consumer idempotency
must be rechecked.

### Required approvals

- Task 04 owner.
- Task 07 owner.
- Privacy.
- Security.
- Operations.
- Task 11.

## 6.14 Audit records

### Purpose

Provide append-only evidence of booking, waitlist, authorization, and
administrative transitions.

### Proposed fields

- Opaque audit identifier.
- Event and schema version.
- Aggregate type and reference.
- Prior and resulting state.
- Opaque actor and subject references where necessary.
- Opaque grant reference where applicable.
- Action.
- Outcome.
- Safe reason code.
- Occurrence time.
- Policy version.
- Idempotency and event references.
- Synthetic marker.

### Source of truth

Approved Task 04 audit service.

### Classification

- `INTERNAL`
- `SECURITY_SENSITIVE`
- `PHI_POTENTIAL`
- `SYNTHETIC`

### Collection necessity

Required for accountability, reconciliation, denial evidence, and release
evidence.

### Authorized access

Restricted audit, security, privacy, and operations roles.

### Client exposure

No ordinary client exposure.

### Prohibited content

- Request or response bodies.
- Clinical text.
- Contact details.
- Raw tokens.
- Raw sessions.
- Raw idempotency keys.
- Message content.
- Legal documents.
- Unrestricted notes.

### Retention trigger

Approved audit-retention policy, capability retirement, legal hold, or
authorized destruction event.

### Proposed retention

No production duration is approved.

Technical proposal:

- Retain append-only safe metadata separately from operational payloads.
- Avoid using application logs as audit records.
- Review whether opaque references remain necessary after source-record
  destruction.
- Prevent an audit record from reconstructing an unnecessary full profile.

**Decision class:** `PRIVACY_LEGAL_DECISION_REQUIRED`

### Cleanup method

Authorized archival, anonymization, reference minimization, or destruction
according to the approved audit policy.

### Legal-hold behavior

An authorized legal hold may suspend normal destruction for scoped audit
records.

### Backup behavior

Audit backups must follow the approved retention and hold lifecycle.

### Required approvals

- Audit owner.
- Privacy.
- Legal.
- Security.
- Task 11.

## 6.15 Rate-limit records

### Purpose

Prevent abuse, enumeration, flooding, scraping, and repeated unsafe requests.

### Proposed fields

- Keyed digest.
- Operation category.
- Counter or bounded state.
- Window start or expiry.
- Safe environment marker.
- Safe scope category where needed.

### Source of truth

Approved server-side rate limiter.

### Classification

- `INTERNAL`
- `SECURITY_SENSITIVE`
- `SYNTHETIC`

### Collection necessity

Required only for the active abuse-control window.

### Authorized access

Rate-limit service and restricted security/operations roles.

### Client exposure

Only a safe limited response and permitted retry timing.

### Prohibited content

- Raw IP address in ordinary application storage.
- Raw contact information.
- Raw actor, subject, booking, grant, or token identifier.
- Clinical information.
- Raw request body.

### Retention trigger

Limiter-window expiry and reconciliation of a limiter incident where required.

### Proposed retention

Technical recommendation:

- Expire automatically after the configured enforcement and short diagnostic
  window.
- Do not retain long-term behavioural profiles.
- Do not copy limiter values into application logs or analytics.

Production duration requires security, privacy, and operations approval.

### Cleanup method

Automatic time-based expiry.

### Legal-hold behavior

Ordinary limiter records should not be held without a specific authorized
incident need.

### Backup behavior

Ephemeral limiter records should not require long-term backup.

Restored stale limiter records must not create indefinite lockout.

### Required approvals

- Security.
- Privacy.
- Operations.
- Accessibility.
- Task 11.

## 6.16 Server logs, traces, and operational metrics

### Purpose

Diagnose system health, safe failures, latency, retries, and invariant
violations.

### Proposed fields

- Route or command category.
- Safe outcome category.
- Response-time bucket.
- Retry count.
- Database-conflict category.
- Synthetic environment marker.
- Payload-free correlation reference.
- Safe finding category.

### Source of truth

Approved logging and observability services.

### Classification

- `INTERNAL`
- `SECURITY_SENSITIVE`
- `SYNTHETIC`

### Collection necessity

Only metadata required for reliability, security, and incident handling.

### Authorized access

Restricted engineering, security, and operations users.

### Client exposure

No.

### Prohibited content

- Request or response bodies.
- Names.
- Contact details.
- Appointment details.
- Clinical information.
- Health-card information.
- Raw tokens.
- Raw idempotency keys.
- SQL parameter values.
- Full database URLs.
- Full booking or identity objects.

### Retention trigger

End of the approved operational troubleshooting, security, or incident window.

### Proposed retention

Technical recommendation for synthetic work:

- Keep payload-free logs only for the bounded development and evidence period.
- Prefer short retention.
- Delete evidence-unnecessary logs after review.
- Do not use logs as an audit store.

Production duration requires security, privacy, operations, and product
approval.

### Cleanup method

Automatic expiry, controlled evidence extraction, and destruction.

### Legal-hold behavior

Only an authorized incident or legal hold may suspend deletion.

### Backup behavior

Log-platform backups and exports must follow the same approved lifecycle.

### Required approvals

- Security.
- Privacy.
- Operations.
- Task 11.

## 6.17 Analytics

### Purpose

No patient-level or production analytics purpose is approved under Task 04.

### Current design

General analytics and session replay remain disabled for protected booking and
queue content.

### Classification

- `PROHIBITED_TASK04` for personal or PHI-bearing analytics.
- Limited aggregate synthetic metrics may be `INTERNAL` and `SYNTHETIC`.

### Collection necessity

Only payload-free aggregate synthetic test metrics may be considered.

### Authorized access

Approved project contributors only.

### Client exposure

No analytics identifier or event should expose booking or identity
information.

### Retention trigger

End of the synthetic evidence period.

### Proposed retention

- No patient-level analytics.
- No third-party session replay.
- No booking payload analytics.
- Aggregate synthetic metrics may be deleted after evidence review.

### Cleanup method

Delete synthetic aggregate test artifacts after their approved evidence
lifecycle.

### Legal-hold behavior

Not applicable unless an authorized owner defines a specific incident need.

### Backup behavior

No production analytics backup is authorized.

### Required approvals

- Product.
- Privacy.
- Security.
- Task 11.

## 6.18 Backups, snapshots, exports, and restored copies

### Purpose

Support approved disaster recovery without silently extending data retention.

### Proposed contents

Only data included in an approved backup scope.

### Source of truth

Approved infrastructure and disaster-recovery configuration.

### Classification

Same as the most sensitive included dataset.

### Collection necessity

Production backup necessity and scope require explicit approval.

The current synthetic database is disposable.

### Authorized access

Restricted infrastructure and recovery personnel.

### Client exposure

No.

### Retention trigger

- Backup creation time.
- Backup expiry.
- Source-record destruction.
- Legal hold.
- Environment destruction.
- Recovery exercise completion.

### Proposed retention

Synthetic technical recommendation:

- Treat Task 04 synthetic databases as disposable.
- Avoid long-lived backups unless needed for a specific reviewed drill.
- Delete drill copies after evidence is captured.
- Do not copy synthetic environments into production systems.

Production backup periods require operations, security, privacy, legal, and
product approval.

### Cleanup method

- Cryptographic destruction where applicable.
- Snapshot deletion.
- Backup expiry.
- Removal of temporary restored environments.
- Revocation of recovery credentials.

### Restored-copy rules

Before a restored copy may process commands:

1. Confirm the environment is approved.
2. Confirm the copy contains no production data in a synthetic environment.
3. Rerun retention and destruction eligibility.
4. Rerun token expiry and revocation.
5. Rerun delegation expiry and revocation.
6. Rerun hold and offer expiry.
7. Rerun idempotency reconciliation.
8. Rerun outbox supersession and usefulness checks.
9. Confirm the kill switch and feature gate.
10. Confirm no external delivery is reachable.

### Legal-hold behavior

Approved legal hold may alter backup expiry only for the exact authorized
scope.

### Required approvals

- Operations.
- Security.
- Privacy.
- Legal.
- Product.
- Task 11.

## 7. Cleanup schedule and behaviour

## 7.1 Abandoned booking drafts

Trigger:

- Draft expiry.
- Successful submission.
- Explicit abandonment.
- Session invalidation.

Action:

- Delete transient draft content.
- Revoke management references.
- Preserve only an approved safe tombstone where required.
- Remove client and server caches.

## 7.2 Expired capacity holds

Trigger:

- Hold expiry.
- Offer expiry.
- Cancellation.
- Failed transaction.
- Reconciliation finding.

Action:

- Release capacity transactionally.
- Mark the hold terminal.
- Prevent reactivation.
- Remove or minimize the terminal record after reconciliation.

## 7.3 Expired management links

Trigger:

- Expiry.
- Consumption.
- Revocation.
- Resource termination.

Action:

- Deny future use.
- Remove the token digest after the approved replay-detection period.
- Preserve only safe evidence where required.
- Never restore access from a backup.

## 7.4 Cancelled waitlist entries

Trigger:

- Authorized cancellation.
- Service closure.
- Entry expiry.

Action:

- Prevent promotion.
- Cancel or expire live offers.
- Release associated holds.
- Remove unnecessary preferences and transient access references.
- Minimize or delete after the approved reconciliation period.

## 7.5 Idempotency records

Trigger:

- End of approved retry and reconciliation window.

Action:

- Delete the safe response snapshot where no longer needed.
- Delete or minimize the record.
- Preserve a non-reusable tombstone only where technically necessary.
- Never retain raw request payloads.

## 7.6 Outbox records

Trigger:

- Supersession.
- Cancellation.
- Usefulness expiry.
- Successful approved reconciliation.
- End of approved retention.

Action:

- Mark the record terminal before cleanup.
- Ensure no external dispatch is possible.
- Preserve minimum audit linkage where approved.
- Delete or archive under the approved event policy.

## 7.7 Rate-limit keys

Trigger:

- End of rate-limit and short diagnostic window.

Action:

- Automatic expiry.
- No long-term behavioural profile.
- No copying into analytics or audit records.
- No indefinite shared-network lockout.

## 7.8 Server logs

Trigger:

- End of approved operational or incident window.

Action:

- Automatic expiration.
- Retain only sanitized evidence required for review.
- Destroy temporary exports.
- Confirm no payload or forbidden marker leakage.

## 8. Deletion and anonymization rules

### Hard deletion

Use where:

- The record is transient.
- No approved operational, audit, or legal purpose remains.
- Referential integrity can be preserved safely.
- Destruction is authorized.

### Field minimization

Use where:

- A terminal record still requires limited historical or reconciliation
  evidence.
- Identity, contact, preference, or payload fields are no longer needed.

### Anonymization

Anonymization must not be claimed merely because direct identifiers were
removed.

The project must evaluate:

- Linkability.
- Small populations.
- Unique appointment patterns.
- Opaque identifiers.
- Event correlation.
- Backup copies.
- External datasets.

### Archival

Archival requires:

- Approved purpose.
- Restricted access.
- Defined expiry.
- Hold behavior.
- Backup treatment.
- Restore controls.

Archive does not mean retain forever.

## 9. Legal-hold proposal

The synthetic prototype does not implement production legal-hold policy.

A future hold record should include only:

- Hold identifier.
- Authorized requester.
- Authority reference.
- Scope.
- Start time.
- Review date.
- Release time.
- Safe reason category.
- Audit reference.

A hold must not:

- Be created by a public user.
- Be created automatically by Task 04.
- Restore an expired token or grant.
- Enable external delivery.
- Broaden access.
- Remove ordinary authorization requirements.
- silently apply to unrelated tenants or pharmacies.

## 10. Access and role summary

| Dataset | Public | Patient/subject | Delegate | Pharmacist/staff | System worker | Privacy/security/operations |
|---|---:|---:|---:|---:|---:|---:|
| Public availability projection | Yes | Yes | Yes | Yes | Limited | Limited |
| Booking draft | No | Own authorized draft | Scoped grant | Only if separately approved | Limited | Restricted |
| Confirmed booking | No | Own authorized minimum | Scoped grant | Minimum necessary scope | Approved operations only | Restricted |
| Waitlist entry or offer | No | Own authorized minimum | Scoped grant | Minimum necessary scope | Promotion/expiry only | Restricted |
| Identity/delegation reference | No | Minimum context | Minimum context | Minimum context | Verification only | Restricted |
| Contact details | No real data | No Task 04 production access | No | No unless separately approved | No | Restricted future Task 07 boundary |
| Idempotency record | No | Safe receipt only | Safe receipt only | Safe receipt only | Service access | Restricted |
| Management-token record | No | Raw presented secret only in approved flow | Same | No ordinary access | Verification only | Restricted |
| Event/outbox record | No | No | No | No ordinary access | Approved worker only | Restricted |
| Audit record | No | No ordinary access | No | No ordinary access | Write minimum only | Restricted |
| Rate-limit record | No | Safe response only | Safe response only | Safe response only | Service only | Restricted |
| Logs and metrics | No | No | No | No | Write safe metadata | Restricted |
| Backups/restores | No | No | No | No | No | Highly restricted |

Every access remains subject to:

- Current identity.
- Current authorization.
- Pharmacy and tenant scope.
- Resource relationship.
- Purpose.
- Feature gate.
- Kill switch.
- Audit.
- Approved policy.

## 11. Production approvals required

Before production collection or retention begins, obtain:

- Product approval for each field and purpose.
- Privacy review.
- Legal review where applicable.
- Security review.
- Accessibility review for exposed fields and recovery.
- Operations approval for cleanup and backups.
- Audit-policy approval.
- Task 05 approval for identity and delegation references.
- Task 07 approval for contact and communication boundaries.
- Task 11 release approval.
- Explicit production enablement.

## 12. Required tests

### RET-01 — Prohibited-field rejection

Prove Task 04 schemas reject clinical narratives, health-card information,
medications, diagnoses, unrestricted notes, billing data, and claim data.

### RET-02 — Public projection minimum

Prove public availability contains only approved fields.

### RET-03 — Client-boundary minimum

Prove complete booking, actor, subject, delegate, grant, contact, audit, or
token records cannot enter client components.

### RET-04 — Draft expiry

Prove an abandoned draft becomes inaccessible and is cleaned up.

### RET-05 — Hold expiry

Prove an expired hold releases capacity and cannot reactivate.

### RET-06 — Management-token cleanup

Prove expired, consumed, and revoked tokens remain unusable before and after
cleanup.

### RET-07 — Waitlist cleanup

Prove cancelled and expired entries cannot be promoted.

### RET-08 — Idempotency cleanup

Prove cleanup does not permit duplicate mutation or destroy an active recovery
window.

### RET-09 — Outbox cleanup

Prove stale or terminal events cannot dispatch and retain only approved
minimum evidence.

### RET-10 — Rate-limit expiry

Prove limiter records expire and do not permanently block shared-network
users.

### RET-11 — Log leakage

Prove forbidden markers do not enter logs, traces, metrics, analytics, or
evidence.

### RET-12 — Backup restoration

Prove a restored synthetic database reruns expiry, revocation, cleanup, and
reconciliation before commands resume.

### RET-13 — No production policy claim

Prove documentation and status outputs do not label technical proposals as
approved legal or production retention policy.

### RET-14 — Synthetic destruction

Prove the disposable synthetic database, temporary evidence, and restored test
copies can be removed without affecting production systems.

## 13. Evidence requirements

Evidence must record:

- Dataset or field identifier.
- Purpose.
- Classification.
- Source of truth.
- Test identifier.
- Source commit.
- Fixture-set version.
- Environment.
- Fixed clock.
- Expected cleanup result.
- Actual cleanup result.
- Pass, fail, or blocked status.
- Sanitized artifact reference.
- Artifact hash where applicable.
- Required reviewer.
- Review date.
- Policy status.

Evidence must not contain:

- Real information.
- Raw tokens.
- Raw idempotency keys.
- Contact details.
- Clinical information.
- Full request or response bodies.
- Production identifiers.
- Secrets.
- Database credentials.
- Sensitive backup contents.

## 14. Stop conditions

Stop the affected workstream when:

- A field has no defined purpose.
- Clinical information is requested or retained.
- Health-card information is requested.
- Contact data is copied into Task 04 events.
- A raw token, key, or secret must be stored.
- A complete patient or booking object must enter a client component.
- Browser storage or public caching is required.
- Analytics or logs require patient-level payloads.
- Expired holds or offers cannot be cleaned up safely.
- Restored backups can reactivate expired or revoked state.
- A legally required retention period would need to be invented.
- Legal-hold rules would need to be guessed.
- A production record would need to enter the synthetic environment.
- Retention is extended merely because cleanup is difficult.
- Required destruction or leakage tests are skipped merely to obtain a pass.
- Existing privacy, tenant, authorization, audit, or retention controls would
  need to be weakened.

Independent synthetic design work may continue when only production approval
is blocked.

## 15. Open decisions

The following remain unresolved:

- Production booking-retention period.
- Production waitlist-retention period.
- Booking-draft expiry.
- Hold cleanup grace period.
- Offer-record retention.
- Management-token terminal-record retention.
- Idempotency retry and retention window.
- Event and outbox retention.
- Audit retention.
- Log and trace retention.
- Rate-limit diagnostic retention.
- Backup frequency and expiry.
- Restore-environment lifecycle.
- Legal-hold authority and process.
- Archival requirements.
- Anonymization standard.
- Production destruction evidence.
- Data-residency and hosting implications.
- Final accountable owner for each dataset.

These decisions must not be represented as approved until the authorized
owners record them.

## 16. Current conclusion

The Task 04 design minimizes booking and waitlist information to the fields
required for administrative scheduling, capacity, authorization, retry safety,
audit, and recovery.

Clinical narratives, health-card information, medication data, diagnosis,
billing data, claim data, unnecessary contact details, and raw secrets remain
prohibited.

Transient drafts, holds, links, offers, idempotency records, outbox rows,
rate-limit keys, logs, and synthetic restored copies require explicit cleanup
behavior.

No legally required or approved production retention period has been
established by this document.

Production collection, retention, archival, legal hold, backup, and destruction
remain blocked until the required product, privacy, legal, security,
operations, cross-task, and Task 11 approvals are recorded.