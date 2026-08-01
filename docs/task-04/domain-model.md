# Task 04 — Booking and Waitlist Domain Model

**Status:** Draft for review
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Database implementation:** Blocked pending revised Task 01 approval

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
2. Pharmacy and tenant scope are derived from trusted server context.
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

Temporarily reserves one capacity unit during an approved transaction, such as
an expiring waitlist offer.

Minimum properties:

- Opaque hold identifier.
- Slot reference.
- Hold purpose.
- Creation time.
- Expiry time.
- Current status.
- Waitlist-offer reference, where applicable.
- Consumed or released time.

Suggested statuses:

- `active`
- `consumed`
- `released`
- `expired`

An expired, released, or consumed hold cannot reserve capacity again.

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

Represents a request to be considered when an eligible slot becomes available.

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

Suggested statuses:

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

### 3.12 Management-access token

Provides a bounded way to manage one synthetic booking or waitlist workflow.

The stored record contains:

- Opaque token-record identifier.
- Hash or digest of the presented token.
- Authorized resource reference.
- Authorized action scope.
- Actor or subject binding.
- Issue time.
- Expiry time.
- Consumption time.
- Revocation time.
- Current status.

Suggested statuses:

- `active`
- `consumed`
- `expired`
- `revoked`

The raw token must not be stored in the database, logs, analytics, evidence, or
domain events.

Possession of a token is not sufficient authority by itself. Server-side scope
and authorization must still be checked.

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

Suggested command statuses:

- `in_progress`
- `completed`
- `failed_retryable`
- `failed_terminal`

Required behavior:

- Reusing the same key with the same request returns the original result.
- Reusing the same key with a different request fails safely.
- Concurrent use of the same key cannot duplicate side effects.
- Unknown client-side outcomes can be checked without repeating the operation.

### 3.14 Domain event and transactional outbox record

Represents an internal fact created by a successful domain transition.

Minimum properties:

- Opaque event identifier.
- Event type.
- Aggregate type.
- Opaque aggregate reference.
- Event version.
- Occurred time.
- Safe actor type.
- Safe reason code.
- Synthetic marker.
- Dispatch status.

Potential event types include:

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

### 3.15 Audit reference

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

The domain must eventually support these commands:

- Query public availability.
- Create booking.
- Retrieve authorized booking.
- Cancel booking.
- Reschedule booking.
- Join waitlist.
- Cancel waitlist entry.
- Create waitlist offer.
- Accept waitlist offer.
- Expire waitlist offer.
- Recover from an expired or revoked management path.
- Query the synthetic pharmacist queue.

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
ManagementAccessToken ── authorizes a bounded management path
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
- Minimum necessary synthetic contact method.
- Waitlist choice.
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

No database schema, migration, Docker configuration, PostgreSQL dependency, or
Drizzle dependency will be added until the revised Task 01 sandbox approval is
recorded.

Once approved, the proposed schema must be reviewed against this domain model
and implemented only inside the loopback-only synthetic environment.