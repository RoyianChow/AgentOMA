# Task 04 — Concurrency and Capacity Design

**Status:** Draft for review
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Database implementation:** Blocked pending revised Task 01 approval
**Task 11 Checkpoint 1:** Not yet reviewed

## 1. Purpose

This document defines the proposed concurrency, capacity, transaction,
idempotency, retry, and rollback design for the synthetic Task 04 booking and
waitlist prototype.

The design must prove that concurrent operations cannot create:

- Overbooked slots.
- Negative capacity.
- Duplicate bookings.
- Duplicate waitlist promotions.
- Multiple live offers for one waitlist entry.
- Capacity leakage.
- Duplicate audit records.
- Duplicate transactional outbox events.
- A successful idempotency receipt for a rolled-back transaction.
- Silent loss of booking or waitlist history.

This document defines the intended PostgreSQL behavior only.

No database schema, migration, Docker configuration, PostgreSQL dependency, or
runnable database code may be added until the revised Task 01 approval and the
required Task 11 review are recorded.

## 2. Scope

This design covers:

- Appointment-slot capacity.
- Confirmed bookings.
- Temporary capacity holds.
- Booking creation.
- Booking cancellation.
- Booking rescheduling.
- Waitlist entry.
- Waitlist promotion offers.
- Offer acceptance.
- Offer expiry.
- Idempotent retries.
- Transactional audit records.
- Transactional outbox records.
- Deadlock and serialization-failure recovery.
- Unknown client-side outcomes.
- Real PostgreSQL concurrency testing.

This design does not cover:

- Production migrations.
- Production data.
- Production identity.
- Clinical prioritization.
- Clinical eligibility.
- Diagnosis or symptom collection.
- Live email, SMS, push, webhook, or calendar delivery.
- Production retention policy.
- Production waitlist-priority policy.
- Billing or claims.
- Prescription activity.

## 3. Required invariants

The implementation must preserve the following invariants under normal,
duplicate, delayed, retried, concurrent, and failed requests.

### CAP-INV-01 — Capacity ceiling

For every slot:

```text
confirmed bookings + active capacity holds <= configured capacity
```

### CAP-INV-02 — Non-negative capacity

Available capacity must never be negative.

### CAP-INV-03 — One capacity owner

One capacity unit may be assigned to only one live booking or one active hold
at a time.

### CAP-INV-04 — Exact cancellation release

Cancelling one confirmed booking releases its capacity exactly once.

Repeated cancellation must not release additional capacity.

### CAP-INV-05 — Safe failed rescheduling

When a target slot cannot be acquired, the original booking remains confirmed
and unchanged.

### CAP-INV-06 — Atomic successful rescheduling

A successful reschedule must:

- Acquire target capacity.
- Create or confirm the successor booking.
- Mark the original booking as rescheduled.
- Release or reassign the original capacity.
- Preserve the predecessor and successor relationship.

All effects must commit together.

### CAP-INV-07 — One live offer

Only one live promotion offer may exist for one waitlist entry.

### CAP-INV-08 — Valid promotion only

A cancelled, expired, promoted, or otherwise ineligible waitlist entry cannot
receive a new offer.

### CAP-INV-09 — Offer and hold agreement

A pending offer must have one valid active hold.

An accepted offer must consume that hold.

An expired, declined, or cancelled offer must release or expire that hold.

### CAP-INV-10 — Idempotent command effects

The same command and idempotency key must create no more than one authoritative
domain effect.

### CAP-INV-11 — Conflicting key reuse

The same idempotency key used with a different canonical request must fail
safely.

### CAP-INV-12 — Atomic evidence

A successful state change, idempotency result, audit record, and outbox event
must commit in the same transaction.

### CAP-INV-13 — No partial success

When any required operation fails, none of the transaction’s effects may
remain.

### CAP-INV-14 — Historical integrity

Cancellation, rescheduling, promotion, expiry, and retry activity must not
silently delete or rewrite previous authoritative history.

### CAP-INV-15 — Scope isolation

Capacity, bookings, holds, waitlist entries, and offers from one pharmacy or
tenant scope must never satisfy or modify a command in another scope.

## 4. Proposed PostgreSQL capacity model

### 4.1 Capacity-unit design

The proposed design represents each configured slot capacity unit as one
database row.

Conceptual structure:

```text
Slot
 ├── CapacityUnit 1
 ├── CapacityUnit 2
 ├── CapacityUnit 3
 └── ...
```

A capacity unit may be:

- Available.
- Assigned to one confirmed booking.
- Assigned to one active capacity hold.

A capacity unit cannot be assigned to both a booking and a hold.

This approach is proposed because PostgreSQL row locking, uniqueness
constraints, and check constraints can prove the capacity ceiling without
depending on an application-maintained counter.

### 4.2 Proposed conceptual records

The exact schema remains subject to approval, but the design anticipates:

- `booking_slots`
- `booking_capacity_units`
- `bookings`
- `capacity_holds`
- `waitlist_entries`
- `waitlist_offers`
- `booking_idempotency_records`
- `booking_audit_events`
- `booking_outbox_events`

All identifiers must be opaque and scoped to the trusted synthetic pharmacy or
tenant context.

### 4.3 Capacity-unit ownership

A capacity-unit row may contain:

- Slot reference.
- Unit sequence or opaque unit reference.
- Booking reference, when assigned to a confirmed booking.
- Hold reference, when assigned to an active hold.
- State version.
- Creation and last-transition time.

Required database rule:

```text
A capacity unit cannot have both a booking owner and a hold owner.
```

A unit with neither owner is available.

### 4.4 Why an application counter is insufficient

The implementation must not perform:

1. Read current count.
2. Decide capacity is available in application code.
3. Insert a booking without a protected database operation.

Two concurrent requests could read the same available value and both succeed.

Capacity acquisition must instead be protected by PostgreSQL through:

- Row locking.
- Conditional updates.
- Uniqueness constraints.
- Check constraints.
- Transaction isolation.
- Another reviewed database-backed mechanism proving the same invariants.

## 5. Proposed database constraints

The approved schema should provide database-level equivalents of these rules.

### DB-CAP-01

Capacity-unit identity is unique within one slot.

### DB-CAP-02

A capacity unit cannot reference both a booking and a hold.

### DB-CAP-03

One confirmed booking cannot own multiple units unless the service explicitly
requires more than one unit and that behavior is separately approved.

The current prototype assumes one unit per booking.

### DB-CAP-04

One active hold cannot own multiple units unless separately approved.

The current prototype assumes one unit per offer.

### DB-CAP-05

A booking cannot reference a slot from another pharmacy or tenant scope.

### DB-CAP-06

A hold cannot reference a slot or offer from another pharmacy or tenant scope.

### DB-CAP-07

Only one live offer may exist for one waitlist entry.

### DB-CAP-08

Only one active waitlist entry may exist for the same approved
subject-service-modality scope where duplicate entry prevention applies.

### DB-CAP-09

The predecessor and successor booking relationship must not cross pharmacy or
tenant scope.

### DB-CAP-10

A booking cannot reference itself as its predecessor or successor.

### DB-CAP-11

An idempotency key digest is unique within its trusted command scope and
operation.

### DB-CAP-12

Audit and outbox records must reference the same trusted aggregate scope as the
domain transition.

### DB-CAP-13

Terminal state values must be allowlisted.

### DB-CAP-14

Database relationships must reject cross-pharmacy and cross-tenant references
even when application authorization fails.

## 6. Transaction isolation and locking strategy

### 6.1 Proposed baseline

High-risk mutation commands should use:

- A PostgreSQL transaction.
- Explicit row locks.
- Deterministic lock ordering.
- Database constraints.
- A bounded retry policy for retryable PostgreSQL failures.

The proposed isolation level for booking, rescheduling, promotion, and offer
acceptance is `SERIALIZABLE`, subject to real PostgreSQL validation.

An implementation may use another reviewed isolation level only when the
required constraints, locks, and concurrency tests prove the same invariants.

### 6.2 Deterministic lock order

To reduce deadlocks, transactions must acquire related records in a consistent
order.

Proposed order:

1. Idempotency record.
2. Booking or waitlist aggregate.
3. Slot records in canonical identifier order.
4. Capacity-unit records in canonical identifier order.
5. Capacity hold.
6. Waitlist offer.
7. Audit record insertion.
8. Outbox record insertion.

For a reschedule involving two slots, the source and target slot locks must be
acquired in canonical order rather than request order.

### 6.3 Lock duration

Locks must be held only for the transaction.

The transaction must not:

- Wait for user input.
- Call an external provider.
- Perform network delivery.
- Render a page.
- Perform long-running analytics.
- Sleep for application-controlled timing.
- Hold a transaction open while waiting for another application request.

## 7. Booking transaction

A successful booking command must atomically:

1. Validate the strict Zod request boundary.
2. Derive actor, subject, pharmacy, tenant, and authority server-side.
3. Acquire or create the idempotency record.
4. Revalidate the service, slot, modality, policy, and slot-reference expiry.
5. Lock the authoritative slot.
6. Acquire one available capacity unit.
7. Create or transition the booking.
8. Assign the capacity unit to the booking.
9. Store the completed idempotency result.
10. Insert the append-only audit record.
11. Insert the stubbed transactional outbox event.
12. Commit.

If no capacity unit can be acquired, the command must return a safe
`SLOT_NO_LONGER_AVAILABLE` result.

It must not create:

- A booking.
- An audit event claiming success.
- An outbox event claiming success.
- A successful idempotency receipt.

### 7.1 Last-capacity race

When two independent requests compete for the final capacity unit:

- Exactly one transaction may acquire the unit.
- Exactly one booking may succeed.
- The other request must fail safely or retry and then observe no capacity.
- The slot must not become overbooked.
- No partial booking, audit, or outbox state may remain for the losing command.

## 8. Cancellation transaction

A successful cancellation command must atomically:

1. Validate the request.
2. Derive authorization and scope.
3. Acquire or validate the idempotency record.
4. Lock the booking.
5. Confirm that cancellation is currently permitted.
6. Transition the booking to `cancelled`.
7. Release its capacity exactly once or transfer the released unit into a
   valid promotion hold.
8. Update historical transition fields.
9. Store the idempotency result.
10. Insert the audit record.
11. Insert the outbox event.
12. Commit.

A repeated cancellation using the same request must return the original safe
result.

A cancellation using a different key after the booking is already cancelled
must return the documented terminal-state result without releasing capacity
again.

## 9. Cancellation and waitlist promotion transaction

When the synthetic policy permits promotion after cancellation, cancellation
and promotion must be handled in the same transaction.

The transaction must:

1. Lock the booking.
2. Cancel it only when cancellation is permitted.
3. Identify the released capacity unit.
4. Lock the applicable waitlist scope.
5. Select one eligible waitlist entry.
6. Lock the selected entry.
7. Revalidate its current state and authorization-independent eligibility.
8. Create one capacity hold using the released unit.
9. Create one pending waitlist offer.
10. Transition the waitlist entry to `offered`.
11. Record cancellation and offer audit events.
12. Record cancellation and offer outbox events.
13. Store required idempotency outcomes.
14. Commit all effects together.

When no eligible waitlist entry exists:

- Cancellation must still complete.
- The unit becomes available.
- No offer or hold is created.
- Capacity must not be leaked.

## 10. Synthetic waitlist ordering

Task 04 must not invent a production clinical or legal priority policy.

For deterministic synthetic testing only, proposed ordering is:

1. Earliest eligible synthetic entry creation time.
2. Stable opaque entry identifier as a tie-breaker.

The synthetic ordering must be labelled:

`SYNTHETIC NON-CLINICAL ORDER — NOT PRODUCTION POLICY`

Ordering must never use:

- Symptoms.
- Diagnosis.
- Medication.
- Medical history.
- Health status.
- Predicted urgency.
- Age-based clinical inference.
- AI or language-model scoring.
- Sentiment analysis.
- Free-text content.

Production waitlist priority remains a documented product, professional,
privacy, and legal decision.

## 11. Concurrent promotion workers

When more than one worker attempts promotion:

- Each worker must use an independent database connection.
- Eligible entries must be locked before an offer is created.
- A worker may use PostgreSQL `FOR UPDATE SKIP LOCKED` or another reviewed
  pattern that prevents duplicate selection.
- A database constraint must still prevent multiple live offers for one entry.
- The selected entry must be revalidated inside the transaction.
- A worker finding no eligible entry must complete without changing capacity.

A worker lock is not a replacement for the unique live-offer constraint.

Both controls are required because application workers may:

- Retry.
- Crash.
- Run concurrently.
- Receive duplicate jobs.
- Process stale candidate lists.

## 12. Rescheduling transaction

A reschedule must preserve the original booking unless the complete replacement
succeeds.

The transaction must:

1. Validate the strict request boundary.
2. Derive authorization and trusted scope.
3. Acquire or validate the idempotency record.
4. Lock the original booking.
5. Revalidate that rescheduling is permitted.
6. Identify the source and target slots.
7. Lock both slots in canonical order.
8. Revalidate the target slot, modality, policy, and capacity.
9. Acquire one target capacity unit.
10. Create the successor booking.
11. Assign target capacity to the successor.
12. Mark the original booking as `rescheduled`.
13. Link predecessor and successor.
14. Release or promote the source capacity.
15. Store the idempotency result.
16. Insert required audit records.
17. Insert required outbox events.
18. Commit.

When target capacity cannot be acquired:

- The entire transaction rolls back.
- The original booking remains confirmed.
- The original capacity remains assigned.
- No successor remains.
- No success audit or outbox event remains.
- No successful idempotency result remains.

## 13. Rescheduling races

### 13.1 Two reschedules for one booking

When two commands attempt to reschedule the same booking:

- The booking row lock serializes the state transition.
- One valid final successor may be created.
- The losing transaction must observe that the original booking is no longer
  eligible for a second reschedule.
- Duplicate successor bookings must not remain.

### 13.2 Two bookings targeting the final unit

When two different bookings reschedule into the final target capacity unit:

- Exactly one may acquire it.
- The losing original booking remains unchanged.
- No source capacity from the losing command is released.

### 13.3 Cancellation racing rescheduling

When cancellation and rescheduling target the same booking:

- Both commands lock the booking.
- Exactly one valid transition may commit.
- The other command returns a safe terminal-state conflict.
- Capacity is released or moved exactly once.
- The booking cannot become both cancelled and rescheduled.

## 14. Waitlist-offer acceptance transaction

A successful offer acceptance must atomically:

1. Validate the strict request boundary.
2. Derive actor, subject, delegation, pharmacy, and tenant scope.
3. Acquire or validate the idempotency record.
4. Lock the waitlist offer.
5. Lock the waitlist entry.
6. Lock the capacity hold.
7. Lock the held capacity unit.
8. Revalidate offer state and expiry.
9. Revalidate entry state.
10. Revalidate current authorization.
11. Revalidate the active hold and slot.
12. Create or confirm the booking.
13. Assign the held unit to the booking.
14. Consume the hold.
15. Mark the offer `accepted`.
16. Mark the waitlist entry `promoted`.
17. Store the idempotency result.
18. Insert audit records.
19. Insert outbox events.
20. Commit.

A repeated acceptance with the same key and request must return the same
booking result.

A second different command must not create a second booking.

## 15. Offer expiry transaction

The expiry worker must:

1. Select a bounded batch of candidate offers.
2. Lock each offer before transition.
3. Revalidate the authoritative database time and offer state.
4. Lock the corresponding hold and capacity unit.
5. Mark the offer `expired`.
6. Mark the hold `expired` or `released`.
7. Release the capacity unit.
8. Return the waitlist entry to the approved synthetic state or mark it
   expired according to the reviewed state machine.
9. Insert audit and outbox records.
10. Commit.

The expiry worker must use database time or a reviewed deterministic clock.

It must not trust a browser clock.

## 16. Acceptance and expiry race

Acceptance and expiry may occur concurrently.

Both operations must lock the authoritative offer and hold.

### When acceptance commits first

- The offer becomes `accepted`.
- The hold becomes `consumed`.
- The unit becomes booking-owned.
- The expiry worker observes a terminal offer and performs no release.

### When expiry commits first

- The offer becomes `expired`.
- The hold is released.
- The acceptance command returns `OFFER_EXPIRED`.
- No booking is created.

Both commands must not succeed.

The unit must not be both released and assigned.

## 17. Cancellation and promotion race

When cancellation and a promotion worker run concurrently:

- The cancellation transaction owns the authoritative release of the booking’s
  capacity.
- Promotion may use only a unit released or transferred through the protected
  transaction.
- Two workers cannot create two offers for the same released unit.
- A cancelled or otherwise ineligible waitlist entry must be skipped.
- A unique constraint and row locks must prevent duplicate live offers.

## 18. Two slots becoming available concurrently

When two slots become available at the same time:

- Workers must lock candidate waitlist entries before assignment.
- One entry cannot receive two live offers.
- Distinct eligible entries may receive distinct offers.
- Each offer must reference one active hold and one capacity unit.
- The final state must remain valid regardless of worker execution order.

If only one eligible entry exists, at most one offer may be created.

The other unit remains available or is offered to another eligible entry.

## 19. Selected entry becoming ineligible

A worker may identify an entry that becomes cancelled, expired, promoted, or
otherwise ineligible before offer creation.

The worker must revalidate the entry after obtaining its lock.

When the entry is no longer eligible:

- No offer is created.
- No hold is created.
- No unit is leaked.
- The worker may select another eligible entry within the reviewed bounded
  process.
- The rejected candidate is recorded only through safe metadata where needed.

## 20. Idempotency design

### 20.1 Idempotency scope

Each mutable command must be bound to:

- Trusted pharmacy or tenant scope.
- Trusted actor scope.
- Operation type.
- Resource scope where applicable.
- Idempotency-key digest.
- Canonical request digest.

Raw idempotency keys must not appear in:

- Logs.
- URLs.
- Analytics.
- Audit events.
- Outbox events.
- Screenshots.
- Evidence artifacts.

### 20.2 Record states

Proposed states:

- `in_progress`
- `completed`
- `failed_retryable`
- `failed_terminal`

### 20.3 Same key and same request

When a completed record exists with the same canonical request digest:

- Return the stored safe response.
- Do not repeat the domain mutation.
- Do not create another audit event.
- Do not create another outbox event.

### 20.4 Same key and changed request

When the key exists with a different canonical request digest:

- Reject the command.
- Return `IDEMPOTENCY_KEY_CONFLICT`.
- Perform no domain mutation.
- Do not expose the original request or result.

### 20.5 Concurrent identical requests

Concurrent requests using the same key must be serialized through:

- The unique idempotency constraint.
- An idempotency-record row lock.
- The surrounding database transaction.

At most one request performs the mutation.

### 20.6 Unknown client-side outcome

A client may lose the response after the transaction commits.

The client may retry using the same key.

The server returns the stored completed result without repeating the operation.

### 20.7 Transaction rollback

A successful idempotency result must be committed in the same transaction as
the domain change.

When the transaction rolls back:

- No completed result remains.
- No booking or waitlist effect remains.
- No success audit event remains.
- No success outbox event remains.

## 21. Audit and transactional outbox behavior

Every successful transition must insert:

- An append-only audit record.
- A versioned transactional outbox event.

Both records must be part of the same PostgreSQL transaction as the domain
state change.

Outbox records remain explicitly:

- `stubbed`
- `not_dispatched`

Task 04 must not:

- Connect an email provider.
- Connect an SMS provider.
- Connect a push provider.
- Connect a webhook.
- Create a calendar invitation.
- Mark an event delivered.
- Include contact details or clinical information in an event.

A retried outbox consumer must deduplicate by event identifier and must not
change booking state.

## 22. Failure and rollback behavior

| Failure point | Required result |
|---|---|
| Validation failure | No transaction effect |
| Authorization failure | No transaction effect |
| Slot stale or expired | No capacity change |
| No available unit | No booking created |
| Booking insertion failure | Capacity acquisition rolls back |
| Hold insertion failure | Unit assignment rolls back |
| Waitlist transition failure | Promotion rolls back |
| Audit insertion failure | Entire domain transaction rolls back |
| Outbox insertion failure | Entire domain transaction rolls back |
| Idempotency completion failure | Entire domain transaction rolls back |
| Serialization failure | Entire attempt rolls back and may be retried safely |
| Deadlock | Entire attempt rolls back and may be retried safely |
| Connection loss before commit | Treat outcome as unknown and recover through idempotency |
| Connection loss after commit | Retry returns the committed stored result |
| Worker crash before commit | PostgreSQL rolls back the transaction |
| Worker crash after commit | Retry observes terminal authoritative state |

## 23. Deadlock prevention and retry handling

### 23.1 Prevention

The implementation must:

- Use deterministic lock ordering.
- Keep transactions short.
- Avoid external calls inside transactions.
- Lock only required rows.
- Avoid locking rows in browser-provided order.
- Avoid unbounded worker batches.
- Index selection and foreign-key paths used by transactions.

### 23.2 Retryable PostgreSQL outcomes

The implementation may retry only reviewed transient database outcomes, such
as:

- Serialization failure.
- Deadlock detected.

Retries must be:

- Bounded.
- Jittered where appropriate.
- Performed with a fresh transaction.
- Performed with the same idempotency key.
- Logged using safe metadata only.

The exact retry count and delay remain a reviewed technical configuration.

### 23.3 Non-retryable outcomes

The server must not automatically retry:

- Authorization denial.
- Invalid state transition.
- Expired offer.
- Stale slot reference.
- Conflicting idempotency-key payload.
- Invalid request.
- Cross-pharmacy attempt.
- No remaining capacity unless a fresh user action or approved recovery path
  applies.

## 24. Safe error contract

Concurrency and capacity failures must map to stable safe errors such as:

- `SLOT_NO_LONGER_AVAILABLE`
- `SLOT_REFERENCE_EXPIRED`
- `BOOKING_STATE_CONFLICT`
- `WAITLIST_STATE_CONFLICT`
- `OFFER_EXPIRED`
- `OFFER_NO_LONGER_AVAILABLE`
- `IDEMPOTENCY_KEY_CONFLICT`
- `REQUEST_IN_PROGRESS`
- `RETRYABLE_DATABASE_CONFLICT`
- `TEMPORARILY_UNAVAILABLE`
- `ACCESS_DENIED`

Errors must not reveal:

- Exact capacity.
- Waitlist length.
- Another patient’s booking.
- Staff schedules.
- Internal database identifiers.
- Lock state.
- SQL text.
- PostgreSQL error details.
- Whether an unrelated resource exists.

## 25. Real PostgreSQL concurrency test design

Concurrency evidence must use:

- A fresh isolated PostgreSQL instance.
- The approved PostgreSQL major version.
- Independent database connections.
- Real transactions.
- A synchronization barrier.
- Deterministic synthetic fixtures.
- A clean database state.
- Recorded image tag and database version.

Concurrency coverage must not be claimed using:

- Mocks.
- SQLite.
- In-memory repositories.
- Sequential promises.
- One reused connection.
- Application-only counters.
- Tests that do not overlap transaction execution.

## 26. Required concurrency scenarios

### RACE-01 — Final capacity unit

Two requests compete for the final unit.

Expected:

- One success.
- One safe capacity failure.
- One confirmed booking.
- No overbooking.

### RACE-02 — Requests exceed capacity

More concurrent requests are issued than configured capacity.

Expected:

- Successful bookings equal no more than capacity.
- Remaining requests fail safely.
- No negative availability.

### RACE-03 — Duplicate cancellation

Two cancellation commands run concurrently.

Expected:

- One capacity release.
- One authoritative cancelled state.
- No duplicate promotion.

### RACE-04 — Cancellation versus rescheduling

Expected:

- One valid final booking transition.
- No double capacity release.
- No booking in contradictory states.

### RACE-05 — Duplicate rescheduling

Expected:

- At most one successor.
- Original history preserved.
- No leaked source or target capacity.

### RACE-06 — Two reschedules into final target unit

Expected:

- One reschedule succeeds.
- The losing original booking remains confirmed.

### RACE-07 — Duplicate promotion workers

Expected:

- One live offer per selected entry.
- One hold per offer.
- No unit assigned twice.

### RACE-08 — Cancellation versus offer creation

Expected:

- Cancelled entry receives no offer.
- Capacity remains valid.

### RACE-09 — Offer acceptance versus expiry

Expected:

- Exactly one terminal offer outcome.
- Capacity is either booking-owned or available, never both.

### RACE-10 — Offer acceptance versus entry cancellation

Expected:

- One valid final state.
- No booking from a cancelled entry unless acceptance committed first under the
  reviewed transition rules.

### RACE-11 — Two slots become available

Expected:

- One entry does not receive two live offers.
- Distinct eligible entries may receive distinct offers.

### RACE-12 — Same idempotency key

Expected:

- One domain effect.
- Repeated requests receive the same safe result.

### RACE-13 — Same key with changed payload

Expected:

- One request may succeed.
- Conflicting request returns `IDEMPOTENCY_KEY_CONFLICT`.

### RACE-14 — Audit insertion failure

Expected:

- Booking or waitlist mutation rolls back.
- Capacity remains unchanged.
- No outbox event remains.

### RACE-15 — Outbox insertion failure

Expected:

- Domain state and capacity roll back.
- No completed idempotency result remains.

### RACE-16 — Deadlock or serialization failure

Expected:

- Failed attempt leaves no partial state.
- A bounded retry reaches one valid result or returns safe temporary failure.

## 27. Test synchronization method

Concurrency tests must deliberately overlap critical transaction sections.

Proposed test approach:

1. Create deterministic fixtures.
2. Open two or more independent PostgreSQL connections.
3. Begin separate transactions.
4. Use a test-only synchronization barrier.
5. Pause each transaction immediately before the contested lock or capacity
   acquisition.
6. Release the barrier.
7. Allow transactions to compete.
8. Await all results.
9. Query authoritative final state using a separate verification connection.
10. Assert domain, capacity, idempotency, audit, and outbox invariants.

The barrier must be test-only and impossible to enable in production.

Tests must use bounded timeouts and must fail when required overlap cannot be
proven.

## 28. Evidence requirements

Concurrency and capacity evidence must record:

- Test identifier.
- Source commit.
- Schema or migration hash.
- PostgreSQL image tag.
- PostgreSQL server version.
- Fixture-set version.
- Number of independent connections.
- Transaction isolation level.
- Synchronization method.
- Expected final state.
- Actual final state.
- Retry count.
- Safe PostgreSQL outcome category.
- Pass, fail, or blocked result.
- Sanitized artifact reference.
- Artifact hash where applicable.

Evidence must not contain:

- Real data.
- Contact information.
- Raw tokens.
- Raw idempotency keys.
- SQL containing sensitive values.
- Connection credentials.
- Full database URLs.
- Production identifiers.

## 29. Recovery and reconciliation

After an interrupted or unknown operation, reconciliation must compare:

- Idempotency status.
- Booking or waitlist status.
- Capacity-unit ownership.
- Hold status.
- Offer status.
- Audit records.
- Outbox records.

The system must detect:

- Booking without capacity.
- Capacity assigned without a booking or valid hold.
- Accepted offer without a booking.
- Active hold past expiry.
- Completed idempotency result without matching domain state.
- Domain state without required audit or outbox evidence.
- More live bookings and holds than configured capacity.
- Multiple live offers for one entry.
- In-progress command past its approved lifetime.

The synthetic reconciliation process may:

- Report the inconsistency.
- Fail closed.
- Block additional mutations.
- Require reviewed repair.

It must not silently invent or rewrite authoritative history.

## 30. Capacity-configuration changes

Changing configured slot capacity is outside the initial patient workflow and
must use a separately authorized staff command.

A capacity reduction must not be permitted below the number of currently
assigned bookings and active holds.

Capacity increases may create additional capacity-unit rows only through a
reviewed transaction.

Capacity configuration must not be accepted from a public client request.

## 31. Abuse and denial-of-service considerations

Database constraints protect correctness but do not by themselves prevent
abuse.

The surrounding design must also address:

- Slot scraping.
- Slot hoarding.
- Repeated booking attempts.
- Waitlist flooding.
- Replayed commands.
- Oversized requests.
- Token guessing.
- Distributed requests.

Rate limiting must not replace:

- Authorization.
- Idempotency.
- PostgreSQL constraints.
- Transaction locking.
- Capacity invariants.

When a rate limiter is unavailable, booking must fail according to the reviewed
safe-failure policy rather than bypassing required abuse controls.

## 32. Observability

Safe operational metrics may include:

- Command type.
- Safe outcome category.
- Transaction duration bucket.
- Retry count.
- Serialization-failure count.
- Deadlock count.
- Capacity-conflict count.
- Expired-offer count.
- Reconciliation finding count.
- Synthetic environment marker.

Logs and metrics must not include:

- Names.
- Contact details.
- Appointment purpose.
- Symptoms.
- Health-card information.
- Raw identifiers.
- Raw tokens.
- Raw request bodies.
- Raw idempotency keys.
- SQL parameter values containing personal information.

## 33. Kill-switch behavior

When the Task 04 kill switch is active:

- New booking commands are denied.
- New reschedule commands are denied.
- New waitlist joins are denied.
- New promotion offers are denied.
- Offer acceptance behavior follows the reviewed safe shutdown policy.
- Automated promotion workers stop.
- Expiry and reconciliation behavior must be explicitly defined so capacity is
  not leaked.
- Existing committed state remains preserved.
- No production or external fallback is attempted.

The kill switch must be server-owned and fail closed.

## 34. Approval boundary

Before implementing this design, the project requires:

- Revised Task 01 approval for loopback-only synthetic PostgreSQL.
- Confirmation of the approved PostgreSQL version.
- Confirmation of permitted Docker configuration.
- Confirmation of permitted schema and migration location.
- Task 11 Checkpoint 1 review.
- Security review.
- Privacy review.
- Quality review.
- Accessibility review where affected.
- Confirmation that no production imports, credentials, data, or migrations
  are involved.

## 35. Stop conditions

Stop implementation and report the blocker when:

- PostgreSQL cannot enforce capacity transactionally.
- The design depends on an unprotected application read followed by a write.
- A race permits overbooking.
- A race creates duplicate promotion.
- Capacity can be released more than once.
- A failed reschedule modifies the original booking.
- Acceptance and expiry can both succeed.
- Audit or outbox failure leaves committed domain state.
- A completed idempotency result can exist after rollback.
- Cross-pharmacy relationships are possible.
- A production migration or database would be required.
- A production policy would need to be invented.
- Clinical information would influence waitlist ordering.
- Required concurrency tests cannot use independent real PostgreSQL
  connections.
- A test is made sequential or mocked merely to obtain a pass.

## 36. Open decisions

The following remain subject to approval:

- Final PostgreSQL major version.
- Final schema names.
- Final migration mechanism.
- Final transaction isolation level.
- Final bounded retry configuration.
- Final command timeout.
- Final worker batch size.
- Final hold duration.
- Final offer duration.
- Final idempotency retention.
- Final waitlist ordering policy.
- Final behavior after kill-switch activation.
- Final reconciliation and repair authority.
- Final production capacity-management policy.

Synthetic values must be visibly marked and must not be represented as
approved production policy.

## 37. Current conclusion

The proposed design uses PostgreSQL capacity-unit rows, explicit locks,
constraints, transactional idempotency, deterministic lock ordering, atomic
audit and outbox writes, and real-database race testing to protect booking and
waitlist correctness.

The design has not yet been implemented or proven.

Database-backed implementation remains blocked until the revised Task 01
approval and Task 11 review are recorded.