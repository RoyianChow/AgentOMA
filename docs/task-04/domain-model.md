# Task 04 — Booking and Waitlist Domain Model

**Status:** Draft documented; review/correction in progress; runtime not implemented
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Synthetic implementation:** Approved on 2026-08-02 through 2026-08-05
**Task 11 Checkpoint 1:** `APPROVED_TO_IMPLEMENT_SYNTHETIC`
**Risk/autonomy:** `R3`; `A3_BOUNDED_AUTOMATION`
**Expiry/review due:** 2026-08-05
**Governance roles:** Accountable owner, backup owner, and Operations/SRE
reviewer: Royian Chowdhury (consolidated, non-independent)

The synthetic approval excludes production, G2, G3, live data, cloud databases,
external effects, and production imports. Royian Chowdhury is the accountable
owner, backup owner, and Operations/SRE reviewer; these are consolidated,
non-independent roles. The sandbox loader validates
`TASK04_SANDBOX_PHARMACY_ID` and exposes it to Task 04 as server-only
`PHARMACY_ID`. No pharmacy selector, tenant selector, or multi-pharmacy runtime
is introduced; cross-pharmacy rows are negative-test fixtures only.

## Canonical planning references

Shared boundary names and field contracts are canonical in
[`api-and-zod-contracts.md`](api-and-zod-contracts.md); transitions are
canonical in [`state-machines.md`](state-machines.md); evidence mapping is
canonical in section 11.1 of
[`pre-implementation-test-plan.md`](pre-implementation-test-plan.md).

## 1. Purpose

This document defines the synthetic Task 04 booking and waitlist domain before
workflow or database implementation begins.

The system supports administrative appointment scheduling only. It does not:

- Collect symptoms, diagnoses, medications, health-card numbers, or clinical notes.
- Perform clinical triage or determine appointment eligibility.
- Guarantee availability before a booking transaction succeeds.
- Send email, SMS, push, calendar, or other external notifications.
- Allow client input to select a pharmacy, tenant, patient, caregiver, role,
  capacity value, waitlist position, or authorization outcome.

## 2. Core design principles

1. Actor identity and appointment subject identity remain separate.
2. Pharmacy scope is server-only `PHARMACY_ID`, derived exclusively from
   sandbox-owned `TASK04_SANDBOX_PHARMACY_ID`; it is never selected by a
   client, token, fixture, or session input.
3. Displayed availability is not proof that capacity still exists.
4. Capacity must eventually be enforced transactionally by PostgreSQL.
5. Retried commands must not duplicate bookings, waitlist entries, events, or
   audit records.
6. Historical booking and waitlist states must not be silently rewritten.
7. Rescheduling creates a replacement relationship rather than deleting the
   original booking.
8. Waitlist promotion uses the safer prototype model of an expiring offer and
   temporary capacity hold.
9. Domain events are internal synthetic records only and cause no external
   delivery.
10. Unknown or contradictory state fails closed.

## 3. Domain concepts

### 3.1 Service category

Represents the administrative type of appointment offered.

Minimum properties:

- Opaque service-category identifier.
- Public synthetic label.
- Supported modalities.
- Whether staff confirmation is required.
- Whether waitlisting is available.
- Active or unavailable status.

A service category must not:

- Encode a diagnosis.
- Prove clinical eligibility.
- Contain billing or claim information.
- Contain private staffing information.

### 3.2 Appointment modality

Supported administrative appointment formats:

- `in_person`
- `telephone`
- `video`

The selected modality does not prove that the modality is clinically suitable.
Any future professional suitability decision remains outside Task 04.

### 3.3 Public availability projection

A minimized, public-safe representation of appointment availability.

Minimum properties:

- Service-category public label.
- Modality.
- Public location label, where applicable.
- Start time.
- End time.
- Display timezone.
- Coarse availability state.
- Opaque, short-lived slot reference.

The projection must not expose:

- Internal slot identifiers.
- Staff identities.
- Staffing levels.
- Exact remaining capacity.
- Appointment counts.
- Waitlist counts.
- Other patients’ activity.
- Tenant or pharmacy configuration.
- Internal errors or operational notes.

A rendered availability projection is advisory. The server must revalidate the
slot and current capacity when a booking command is submitted.

### 3.4 Slot and capacity inventory

Represents the server-owned capacity available for a service, modality, and
time range.

Minimum properties:

- Internal opaque slot identifier.
- Server-owned pharmacy scope.
- Service-category reference.
- Modality.
- Start and end timestamps stored in UTC.
- Display timezone.
- Configured capacity.
- Current lifecycle status.
- Version or concurrency-control value.

Capacity consumption includes:

- Confirmed bookings.
- Active temporary capacity holds.

Required invariant:

`confirmed bookings + active holds <= configured capacity`

Capacity must never become negative.

### 3.5 Temporary capacity hold

Temporarily reserves one capacity unit for an expiring waitlist offer or a
`pending_confirmation` booking.

Minimum properties:

- Opaque hold identifier.
- Slot reference.
- Hold purpose.
- Creation time.
- Expiry time.
- Current status.
- Waitlist-offer reference, where applicable.
- Pending-booking reference, where applicable.
- Consumed or released time.

Canonical hold statuses:

- `active`
- `consumed`
- `released`
- `expired`

A hold is created atomically with its offer or pending booking and counts
against capacity while `active`. Confirmation or offer acceptance atomically
changes it to `consumed`; clock expiry changes it to `expired`; early
cancellation, decline, or withdrawal changes it to `released`. Each terminal
transition occurs exactly once using trusted server/database time, and no
terminal hold can reserve capacity again.

### 3.6 Booking

Represents one administrative appointment request or confirmed appointment.

Minimum properties:

- Opaque booking identifier.
- Server-owned pharmacy scope.
- Service-category reference.
- Slot reference.
- Modality.
- Actor reference.
- Subject reference.
- Delegation-grant reference, when applicable.
- Current booking state.
- Capacity-hold reference and confirmation deadline when
  `pending_confirmation`.
- Created time.
- Last transition time.
- Predecessor booking reference, when rescheduled.
- Successor booking reference, when superseded.
- Safe reason code.
- Version or concurrency-control value.

Required booking states:

- `pending_confirmation`
- `confirmed`
- `cancelled`
- `rescheduled`
- `expired`

The prototype may move directly to `confirmed` where staff confirmation is not
required.

A rescheduled booking is preserved as historical state and linked to its
replacement. It must not be deleted or silently edited into a different slot.

### 3.7 Booking participant or subject reference

Represents the person for whom the administrative appointment exists.

This is an opaque server-owned reference.

The client must not be trusted to submit an authoritative:

- Patient identifier.
- Subject identifier.
- Caregiver identifier.
- Relationship.
- Authorization outcome.

The synthetic prototype uses deterministic synthetic references only.

### 3.8 Actor reference

Represents the person or system performing a command.

Possible synthetic actor types:

- `synthetic_patient`
- `synthetic_delegate`
- `synthetic_staff`
- `synthetic_system_worker`

Minimum properties:

- Opaque actor identifier.
- Actor type.
- Server-derived role.
- Server-derived pharmacy scope.
- Synthetic marker.

An actor is not automatically the appointment subject.

### 3.9 Delegation-grant reference

Represents authority for one actor to manage another subject’s booking.

Minimum properties for the proposed contract:

- Opaque grant identifier.
- Actor reference.
- Subject reference.
- Approved scope.
- Effective time.
- Expiry time.
- Revocation state.
- Issuing authority reference.

The prototype must not allow a user to create authority by selecting a generic
“I am their caregiver” checkbox.

Production delegation rules remain owned by Task 05 and must not be invented
under Task 04.

### 3.10 Waitlist entry

Represents a request to be considered when it satisfies the administrative,
non-clinical `promotion_candidate` predicate for an available slot.

Minimum properties:

- Opaque waitlist-entry identifier.
- Server-owned pharmacy scope.
- Service-category reference.
- Modality preference.
- Actor reference.
- Subject reference.
- Delegation-grant reference, when applicable.
- Current waitlist state.
- Created time.
- Last transition time.
- Safe ordering metadata.
- Version or concurrency-control value.

Required waitlist states:

- `active`
- `offered`
- `promoted`
- `cancelled`
- `expired`

A cancelled or expired entry cannot receive a promotion offer.

The prototype must not expose exact waitlist position publicly.

The exact `promotion_candidate` predicate is:

1. the entry is `active`;
2. trusted database time is earlier than the entry expiry;
3. the entry and slot use the server-derived `PHARMACY_ID`;
4. the service category matches and the service currently permits waitlisting;
5. the modality preference exactly matches the slot modality;
6. the slot is active and has an available capacity unit;
7. the entry has no live offer or active hold; and
8. selection follows
   `PROPOSED_SYNTHETIC_ORDERING_PENDING_PRODUCT_CONFIRMATION`: ascending
   `created_at`, then the opaque internal entry identifier, with no clinical
   or identity-derived priority.

Duplicate prevention permits at most one entry in `active` or `offered` for
`(PHARMACY_ID, subject_reference, service_category_reference,
modality_preference)`. Cross-pharmacy duplicate rows may be constructed only
as database negative-test fixtures.

### 3.11 Waitlist offer

Represents a temporary opportunity for one waitlist entry to accept a released
slot.

Minimum properties:

- Opaque offer identifier.
- Waitlist-entry reference.
- Slot reference.
- Capacity-hold reference.
- Created time.
- Expiry time.
- Current offer status.
- Accepted time, where applicable.
- Safe reason code.

Canonical offer statuses:

- `pending`
- `accepted`
- `declined`
- `expired`
- `cancelled`

Only one live offer may exist for the same waitlist entry.

Accepting an offer must atomically:

1. Validate the offer and authorization.
2. Validate the active capacity hold.
3. Create or confirm the booking.
4. Consume the hold.
5. Mark the waitlist entry as promoted.
6. Record the domain event.
7. Record the audit reference.
8. Store the idempotent command result.

### 3.12 Management-access credential

Provides a bounded way to manage one synthetic booking or waitlist workflow.

The stored record contains:

- Opaque credential-record identifier.
- Usage mode: `one_time` or `reusable`.
- Hash or digest of the presented token for `one_time`; a reusable
  server-session capability stores no bearer secret.
- Opaque capability reference.
- Authorized resource reference.
- Non-empty allowlisted authorized-action scope.
- Actor or subject binding.
- Synthetic server-session binding for `reusable`.
- Issue time.
- Expiry time.
- Consumption time.
- Revocation time.
- Current status.

Canonical credential statuses:

- `active`
- `consumed`
- `expired`
- `revoked`

The raw credential must not be stored in the database, logs, analytics, evidence, or
domain events.

The initial booking or waitlist transaction creates a reusable capability
bound to the current synthetic server session. A one-time credential may be
issued later for exactly one protected action and returned exactly once
through its HTTPS POST response. It is consumed only when that mutation
commits. Possession of either a reference or credential is not sufficient
authority by itself. Server-side session, actor/subject/delegation, resource,
action, expiry, revocation, and pharmacy scope must still be checked.

### 3.13 Idempotency record

Stores the authoritative result of a retry-safe command.

Minimum properties:

- Opaque idempotency-record identifier.
- Server-owned scope.
- Command type.
- Idempotency key digest.
- Canonical request digest.
- Command status.
- Safe response snapshot.
- Created time.
- Completion time.
- Expiry or retention category, to be decided by approved policy.

Canonical idempotency statuses:

- `in_progress`
- `completed`
- `failed_retryable`
- `failed_terminal`

Required behavior:

- Reusing the same key with the same request returns the original result.
- Reusing the same key with a different request fails safely.
- Concurrent use of the same key cannot duplicate side effects.
- Unknown client-side outcomes can be checked without repeating the operation.

### 3.14 Administrative preference snapshot

Persists only the non-clinical administrative fields that the staff queue and
successor workflows require:

- Opaque snapshot identifier.
- Exactly one owner: booking or waitlist entry.
- Structured language preference.
- Bounded structured accessibility preferences.
- Synthetic contact reference, never raw contact data.
- Trusted creation time.
- Optional source snapshot reference for an immutable transfer.

`booking:create` and `waitlist:join` each create their own snapshot.
Rescheduling creates a successor-booking snapshot copied from the predecessor
request plus the new validated request fields; it never mutates the predecessor
snapshot. Offer acceptance creates a booking-owned snapshot copied from the
waitlist entry. A snapshot is never shared as mutable state, and it cannot
change aggregate ownership. Cancellation, expiry, or revocation does not copy
it elsewhere.

### 3.15 Administrative acknowledgement record

Persists evidence for the exact acknowledgement version used by a successful
administrative command:

- Opaque acknowledgement-record identifier.
- Owning booking or waitlist-entry reference.
- Canonical acknowledgement-version identifier.
- The five literal-true acknowledgement flags.
- Trusted acceptance time.
- Safe actor type and delegation-grant reference where applicable.
- Command receipt reference.

No free text, signature image, contact value, clinical fact, or raw request is
stored. Booking creation, waitlist joining, rescheduling, and offer acceptance
write a record from their validated request in the same transaction.

Joining a waitlist is an explicit `waitlist:join` command. Booking creation
does not collect or persist a `waitlistOptIn` flag.

### 3.16 Domain event and transactional outbox record

Represents an internal fact created by a successful domain transition.

Minimum properties:

- Opaque event identifier.
- Event type.
- Aggregate type.
- Opaque aggregate identifier (`aggregateId` at the API boundary;
  `aggregate_id` in persistence).
- Event schema version.
- Aggregate version.
- Occurred time.
- Protected server-only pharmacy scope derived from `PHARMACY_ID`.
- Safe actor type.
- Safe reason code.
- Synthetic marker and source capability.
- Dispatch status, always `not_dispatched` in Task 04.
- Strict event-type-specific payload.
- Cleanup metadata: `aggregate_version_superseded` and optional
  `cleanup_eligible_at_utc`; neither is a dispatch state.

The exact event catalogue and payloads are the section 4A.13 discriminated
union in [`api-and-zod-contracts.md`](api-and-zod-contracts.md). Representative
types include:

- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `booking.rescheduled`
- `waitlist.joined`
- `waitlist.cancelled`
- `waitlist.offer_created`
- `waitlist.offer_expired`
- `waitlist.offer_accepted`

Domain events must not contain:

- Contact details.
- Clinical details.
- Health-card details.
- Tokens.
- Patient names.
- Appointment purpose.
- External-recipient information.

Task 04 events do not send messages. Future external communication remains
owned by Task 07.

### 3.17 Audit reference

Represents safe transition evidence without storing sensitive payloads.

Minimum properties:

- Opaque audit identifier.
- Aggregate type and opaque reference.
- Prior state.
- Resulting state.
- Actor type.
- Transition time.
- Safe action code.
- Safe reason code.
- Idempotency-record reference.
- Domain-event reference.
- Synthetic marker.

Audit history must be append-only. Historical transitions cannot be changed or
deleted to hide prior state.

## 4. Command model

The canonical command/action/permission registry is section 4B of
[`api-and-zod-contracts.md`](api-and-zod-contracts.md). It includes the public
and protected reads plus:

- `booking:create`, `booking:confirm`, `booking:cancel`,
  `booking:reschedule`, and `booking:expire`.
- `waitlist:join`, `waitlist:leave`, `waitlist:promote`, and
  `waitlist:expire`.
- `waitlist:offer:create`, `waitlist:offer:accept`,
  `waitlist:offer:decline`, and `waitlist:offer:withdraw`.
- `management-credential:issue`, `management-credential:consume`, and
  `management-credential:revoke`.
- `queue:read`.
- `automation:reconcile`, `automation:disable`, and `automation:enable`.

Every command must:

1. Validate its Zod boundary.
2. Derive actor, subject, pharmacy, and authority server-side.
3. Revalidate current resource state.
4. Revalidate capacity where applicable.
5. Enforce idempotency.
6. Commit all required state changes atomically.
7. Record a safe event and audit reference.
8. Return a minimized safe response.

## 5. Relationship summary

```text
ServiceCategory
    └── Slot
          ├── Booking
          ├── CapacityHold
          └── WaitlistOffer
                 └── WaitlistEntry

Actor ── performs command
Subject ── receives appointment
DelegationGrant ── may authorize Actor for Subject

Booking ── may reference predecessor/successor Booking
Command ── protected by IdempotencyRecord
Successful transition ── creates DomainEvent and AuditReference
ManagementAccessCredential ── supports a bounded, reverified management path
Booking/WaitlistEntry ── owns immutable AdministrativePreferenceSnapshot
Booking/WaitlistEntry ── owns AdministrativeAcknowledgementRecord
```

## 6. Required invariants

The final implementation must prove:

- Confirmed bookings plus active holds never exceed capacity.
- Capacity never becomes negative.
- Cancellation releases capacity exactly once.
- Failed rescheduling leaves the original booking unchanged.
- Successful rescheduling does not consume both old and new capacity.
- Only one live promotion offer exists for one waitlist entry.
- Cancelled or expired waitlist entries cannot be promoted.
- Expired, revoked, or consumed tokens cannot be reused.
- Exact command retries do not duplicate domain effects.
- Conflicting idempotency-key reuse fails safely.
- Every state transition records prior state, resulting state, actor type,
  time, and safe reason code.
- Historical state cannot be rewritten to hide previous activity.
- No external notification occurs.
- No clinical or billing state is created or changed.

## 7. Data minimization

The synthetic booking workflow may represent only:

- Service category.
- Modality preference.
- Structured language preference.
- Structured accessibility need.
- Server-owned `SyntheticContactReference`, never a raw contact destination.
- Explicit waitlist-entry state created only by `waitlist:join`.
- Required administrative acknowledgement.
- Server-owned actor and subject references.

The workflow must not provide unrestricted fields such as:

- Reason for visit.
- Symptoms.
- Medical notes.
- Diagnoses.
- Medication details.
- Health-card information.
- Pregnancy or allergy information.
- Clinical history.

Where accommodation needs cannot be represented safely, the interface may use
a neutral option such as:

`Please contact me about an accommodation.`

## 8. Deferred decisions and blockers

The following are intentionally unresolved:

- Production identity and delegated-access policy — Task 05.
- Production communication and reminders — Task 07.
- Production response-time wording.
- Production retention periods.
- Production waitlist-priority policy.
- Production database migration.
- Production authentication integration.
- Hosted preview or deployment.
- Whether any production service requires staff confirmation.

The synthetic prototype uses an expiring waitlist offer because automatic
promotion policy has not been approved.

## 9. Database implementation boundary

The exact loopback-only synthetic PostgreSQL scope was approved on 2026-08-02.
Any future implementation must be reviewed against this domain model, remain
inside `apps/experiment-sandbox/`, use deterministic synthetic data, and fail
closed after 2026-08-05 unless review extends the approval. Production schema,
production migration, cloud database, G2/G3, production import, and live-data
work remain prohibited.
