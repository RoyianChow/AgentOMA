# Task 04 — Booking and Waitlist State Machines

**Status:** Draft for review
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Database implementation:** Blocked pending revised Task 01 approval

## 1. Purpose

This document defines the allowed state transitions for the synthetic booking,
waitlist, promotion-offer, capacity-hold, and management-token workflows.

Every transition must:

1. Validate the request boundary.
2. Derive actor, subject, pharmacy, role, and authorization server-side.
3. Recheck the latest resource state.
4. Enforce idempotency.
5. Apply all related changes in one transaction.
6. Create a safe domain event and audit reference.
7. Return a minimized response.
8. Fail closed on unknown or contradictory state.

A displayed slot, management token, actor-submitted identifier, or prior
response does not prove current authority or availability.

## 2. Actor categories

The synthetic model recognizes:

| Actor | Permitted purpose |
|---|---|
| `synthetic_patient` | Manage their own authorized synthetic booking or waitlist entry |
| `synthetic_delegate` | Manage a subject only through an active, scoped synthetic delegation grant |
| `synthetic_staff` | Perform approved administrative confirmation or cancellation actions |
| `synthetic_system_worker` | Expire holds/offers and create promotion offers using deterministic server rules |

No actor may:

- Select their own tenant or pharmacy.
- Promote themselves to staff.
- Submit authoritative subject, role, capacity, or waitlist-rank values.
- Make clinical, billing, prescribing, or eligibility decisions.

## 3. Booking state machine

### 3.1 Booking states

| State | Meaning |
|---|---|
| `pending_confirmation` | Request exists but an approved staff confirmation is still required |
| `confirmed` | Appointment capacity has been successfully committed |
| `cancelled` | Appointment was cancelled and capacity was released exactly once |
| `rescheduled` | Historical booking was replaced by a linked successor booking |
| `expired` | A time-limited unconfirmed request expired before confirmation |

Terminal states:

- `cancelled`
- `rescheduled`
- `expired`

A terminal booking cannot return to an active state.

### 3.2 Booking transitions

| Current state | Command | Resulting state | Required actor | Preconditions |
|---|---|---|---|---|
| None | Create booking without staff confirmation | `confirmed` | Authorized patient or delegate | Slot reference valid; current capacity available; service/modality permitted |
| None | Create booking requiring confirmation | `pending_confirmation` | Authorized patient or delegate | Slot valid; request policy permits pending state |
| `pending_confirmation` | Confirm booking | `confirmed` | Authorized synthetic staff | Request current; capacity available; policy still permits confirmation |
| `pending_confirmation` | Cancel booking | `cancelled` | Authorized patient, delegate, or staff | Booking active; actor authorized |
| `pending_confirmation` | Expire request | `expired` | Synthetic system worker | Expiry reached; request still pending |
| `confirmed` | Cancel booking | `cancelled` | Authorized patient, delegate, or staff | Booking active; cancellation policy permits action |
| `confirmed` | Reschedule booking | `rescheduled` with successor `confirmed` or `pending_confirmation` | Authorized patient, delegate, or staff | Original active; replacement slot valid; replacement capacity secured |
| `pending_confirmation` | Reschedule booking | `rescheduled` with linked successor | Authorized patient, delegate, or staff | Original active; replacement command succeeds atomically |

### 3.3 Booking creation effects

A successful booking creation must atomically:

1. Revalidate the slot, service category, modality, pharmacy scope, and current
   capacity.
2. Lock or otherwise serialize the relevant capacity record.
3. Consume one available capacity unit when confirmation is immediate.
4. Create the booking.
5. Store the idempotent result.
6. Create `booking.created`.
7. Create `booking.confirmed` when applicable.
8. Create safe audit references.

If any required step fails, no booking, event, audit reference, or capacity
change may remain.

### 3.4 Booking cancellation effects

A successful cancellation must atomically:

1. Verify current authorization.
2. Verify that the booking is still cancellable.
3. Change the booking to `cancelled`.
4. Release capacity exactly once where capacity had been consumed.
5. Cancel or supersede related active holds or internal reminder intents.
6. Create `booking.cancelled`.
7. Create an audit reference.
8. Store the idempotent result.

Retrying the same cancellation returns the original successful response without
releasing capacity again.

### 3.5 Booking rescheduling effects

A successful reschedule must atomically:

1. Verify authorization for the original booking.
2. Lock the original and replacement capacity records in deterministic order.
3. Verify that the original booking is still active.
4. Revalidate the replacement slot.
5. Secure capacity for the replacement.
6. Create the successor booking.
7. Mark the original booking `rescheduled`.
8. Link predecessor and successor records.
9. Release the original capacity exactly once.
10. Create `booking.rescheduled`.
11. Create required audit references.
12. Store the idempotent result.

A failed reschedule must leave the original booking and original capacity
unchanged.

### 3.6 Invalid booking transitions

The following must fail safely:

- Confirming a cancelled, rescheduled, expired, or already confirmed booking.
- Cancelling a cancelled, rescheduled, or expired booking as a new operation.
- Rescheduling a cancelled, rescheduled, or expired booking.
- Rescheduling into a stale, unavailable, or mismatched slot.
- Acting through an expired or revoked delegation grant.
- Supplying a different subject, pharmacy, role, or booking state from the client.
- Reusing an idempotency key with different request content.
- Attempting an unknown transition or reason code.

Safe responses must not reveal whether an unrelated booking or subject exists.

## 4. Waitlist-entry state machine

### 4.1 Waitlist-entry states

| State | Meaning |
|---|---|
| `active` | Entry is eligible to be considered for an offer |
| `offered` | One current expiring offer exists |
| `promoted` | Offer was accepted and a booking was created |
| `cancelled` | Actor or staff cancelled the entry |
| `expired` | Entry or its approved lifetime ended |

Terminal states:

- `promoted`
- `cancelled`
- `expired`

### 4.2 Waitlist-entry transitions

| Current state | Command | Resulting state | Required actor | Preconditions |
|---|---|---|---|---|
| None | Join waitlist | `active` | Authorized patient or delegate | Service permits waitlisting; no conflicting active entry |
| `active` | Create promotion offer | `offered` | Synthetic system worker or authorized staff | Capacity available; entry eligible; no live offer already exists |
| `active` | Cancel waitlist entry | `cancelled` | Authorized patient, delegate, or staff | Entry active; actor authorized |
| `active` | Expire waitlist entry | `expired` | Synthetic system worker | Approved expiry reached |
| `offered` | Accept offer | `promoted` | Authorized patient or delegate | Offer active; hold active; offer not expired; authorization current |
| `offered` | Decline or cancel | `cancelled` | Authorized patient, delegate, or staff | Offer still current |
| `offered` | Offer expires | `active` or `expired` | Synthetic system worker | Offer expiry reached; policy determines whether entry returns active |
| `offered` | Accept after entry expiry | Denied | None | Entry is no longer eligible |

The synthetic prototype should return an expired offer to `active` only when the
waitlist entry itself remains valid. Otherwise, it becomes `expired`.

### 4.3 Join-waitlist effects

A successful join must atomically:

1. Verify actor and subject authorization.
2. Verify that waitlisting is enabled for the service.
3. Prevent a conflicting duplicate active entry.
4. Create the waitlist entry.
5. Create `waitlist.joined`.
6. Create an audit reference.
7. Store the idempotent result.

No exact public waitlist position may be returned.

### 4.4 Cancel-waitlist effects

A successful cancellation must atomically:

1. Verify authorization.
2. Mark the entry `cancelled`.
3. Cancel any live offer.
4. Release any related active capacity hold.
5. Create `waitlist.cancelled`.
6. Create an audit reference.
7. Store the idempotent result.

Retrying the command must not release the hold or create events twice.

## 5. Waitlist-offer state machine

### 5.1 Offer states

| State | Meaning |
|---|---|
| `pending` | Offer is active and awaiting an authorized response |
| `accepted` | Offer created a booking and consumed its hold |
| `declined` | Authorized actor declined the offer |
| `expired` | Offer lifetime ended |
| `cancelled` | Offer was withdrawn because the entry, slot, or authority became invalid |

All states except `pending` are terminal.

### 5.2 Offer transitions

| Current state | Command | Resulting state | Required actor | Preconditions |
|---|---|---|---|---|
| None | Create offer | `pending` | Staff or synthetic system worker | Entry active; capacity available; no live offer |
| `pending` | Accept offer | `accepted` | Authorized patient or delegate | Offer, entry, hold, delegation, slot, and policy all current |
| `pending` | Decline offer | `declined` | Authorized patient or delegate | Offer still active |
| `pending` | Expire offer | `expired` | Synthetic system worker | Expiry reached |
| `pending` | Cancel offer | `cancelled` | Authorized staff or system worker | Entry, authority, or slot no longer valid |

### 5.3 Offer creation effects

Offer creation must atomically:

1. Lock the waitlist entry and slot capacity.
2. Verify that the entry is `active`.
3. Verify that no live offer exists.
4. Verify capacity is available.
5. Create an active capacity hold.
6. Create the offer.
7. Change the entry to `offered`.
8. Create `waitlist.offer_created`.
9. Create an audit reference.

### 5.4 Offer acceptance effects

Offer acceptance must atomically:

1. Verify the current actor and subject relationship.
2. Verify the offer is `pending`.
3. Verify the offer has not expired.
4. Verify the capacity hold is `active`.
5. Verify the entry remains `offered`.
6. Create the booking.
7. Consume the hold.
8. Mark the offer `accepted`.
9. Mark the entry `promoted`.
10. Create `waitlist.offer_accepted`.
11. Create the booking events and audit references.
12. Store one idempotent result.

A retry returns the same booking reference and must not create another booking.

### 5.5 Offer expiry effects

Offer expiry must atomically:

1. Verify the offer remains `pending`.
2. Mark the offer `expired`.
3. Release the capacity hold exactly once.
4. Return the waitlist entry to `active` when still valid, otherwise mark it
   `expired`.
5. Create `waitlist.offer_expired`.
6. Create an audit reference.

## 6. Capacity-hold state machine

### 6.1 Hold states

| State | Meaning |
|---|---|
| `active` | Temporarily consumes one capacity unit |
| `consumed` | Converted into a confirmed booking |
| `released` | Explicitly released without booking |
| `expired` | Automatically released after expiry |

All states except `active` are terminal.

### 6.2 Hold transitions

| Current state | Command | Resulting state |
|---|---|---|
| None | Create hold | `active` |
| `active` | Accept associated offer | `consumed` |
| `active` | Cancel associated offer | `released` |
| `active` | Expiry worker runs after deadline | `expired` |

A terminal hold can never become active again.

Creating, consuming, releasing, or expiring a hold must preserve:

`confirmed bookings + active holds <= configured capacity`

## 7. Management-token state machine

### 7.1 Token states

| State | Meaning |
|---|---|
| `active` | Token may be presented for its narrow approved scope |
| `consumed` | One-time token was successfully used |
| `expired` | Token lifetime ended |
| `revoked` | Server withdrew the token |

### 7.2 Token rules

An active token may proceed only when:

- Its digest matches.
- Its resource and action scope match.
- Its actor/subject binding matches.
- It has not expired.
- It has not been revoked or consumed.
- The underlying booking or waitlist action is still allowed.
- Current server authorization passes independently.

A token alone does not authorize an action.

Consumed, expired, revoked, malformed, guessed, or wrong-resource tokens must
return a generic safe recovery response.

## 8. Idempotency state machine

### 8.1 Idempotency states

| State | Meaning |
|---|---|
| `in_progress` | One authorized execution currently owns the command |
| `completed` | The command finished and its safe response is stored |
| `failed_retryable` | No forbidden partial effect remains and retry may be allowed |
| `failed_terminal` | The request cannot safely be retried with the same operation |

### 8.2 Idempotency behaviour

| Situation | Required result |
|---|---|
| Same key and same request after completion | Return the original safe response |
| Same key and same request during execution | Return controlled in-progress/unknown response |
| Same key with different request digest | Reject safely |
| Concurrent identical requests | Exactly one execution produces domain effects |
| Timeout after commit | Result can be recovered without repeating effects |
| Failure before commit | No booking, hold, event, or audit partial state remains |

Idempotency keys must not contain raw contact information, patient data, booking
details, or management tokens.

## 9. Domain-event behaviour

Events are created only after their corresponding transition succeeds within
the same transaction.

Required event examples:

- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `booking.rescheduled`
- `waitlist.joined`
- `waitlist.cancelled`
- `waitlist.offer_created`
- `waitlist.offer_accepted`
- `waitlist.offer_expired`

Events are internal synthetic facts only.

They must not:

- Send notifications.
- Complete assessments.
- Generate claims.
- Contain contact, clinical, token, or health-card information.
- Trigger production systems.

## 10. Concurrency requirements

The database-backed implementation must eventually prove:

- Two simultaneous booking requests cannot exceed capacity.
- Two simultaneous cancellations release capacity once.
- Two simultaneous reschedules cannot create duplicate successors.
- A cancellation racing an offer acceptance produces one valid final state.
- Two promotion workers cannot create two live offers for one entry.
- Offer acceptance racing expiry produces one valid final result.
- Identical concurrent idempotent commands produce one effect.
- Conflicting commands cannot deadlock indefinitely.
- Failed transactions leave no partial event, audit, hold, or booking records.

Real PostgreSQL testing remains blocked until the revised Task 01 database
approval is recorded.

## 11. Safe failure responses

Public and patient-facing failures must use generic categories such as:

- `REQUEST_INVALID`
- `NOT_AUTHORIZED`
- `RESOURCE_UNAVAILABLE`
- `SLOT_NO_LONGER_AVAILABLE`
- `OFFER_EXPIRED`
- `ACTION_ALREADY_COMPLETED`
- `REQUEST_IN_PROGRESS`
- `RECOVERY_REQUIRED`
- `TEMPORARILY_UNAVAILABLE`

Errors must not reveal:

- Whether another patient or booking exists.
- Exact remaining capacity.
- Waitlist position.
- Staff identity.
- Internal database identifiers.
- Tenant or pharmacy configuration.
- Raw PostgreSQL, Zod, or integration errors.

## 12. Unresolved decisions

The following remain blocked for production review:

- Whether any service requires staff confirmation.
- Production cancellation deadlines.
- Production response-time wording.
- Waitlist ordering and priority policy.
- Offer lifetime.
- Retention periods.
- Production delegated-access rules.
- Production notification behaviour.

Synthetic values must be visibly marked and must not be presented as approved
production policy.