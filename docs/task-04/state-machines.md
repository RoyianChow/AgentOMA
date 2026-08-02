# Task 04 — Booking and Waitlist State Machines

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

Production, G2, G3, live data, cloud databases, external effects, and
production imports remain prohibited. Royian Chowdhury holds the accountable
owner, backup owner, and Operations/SRE reviewer roles; this consolidated
coverage is non-independent. Every tenant-scoped transition uses server-only
`PHARMACY_ID`, derived only from sandbox-owned
`TASK04_SANDBOX_PHARMACY_ID`; no selector or multi-pharmacy runtime exists.

## Canonical planning references

Field/enumeration/error contracts are canonical in
[`api-and-zod-contracts.md`](api-and-zod-contracts.md). This file is canonical
for transitions. Evidence mapping is canonical in section 11.1 of
[`pre-implementation-test-plan.md`](pre-implementation-test-plan.md).

## 1. Purpose

This document defines the allowed state transitions for the synthetic booking,
waitlist, promotion-offer, capacity-hold, and management-credential workflows.

Every transition must:

1. Validate the request boundary.
2. Derive actor, subject, pharmacy, role, and authorization server-side.
3. Recheck the latest resource state.
4. Enforce idempotency.
5. Apply all related changes in one transaction.
6. Create a safe domain event and audit reference.
7. Return a minimized response.
8. Fail closed on unknown or contradictory state.

A displayed slot, management credential, actor-submitted identifier, or prior
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
| `pending_confirmation` | Request exists with one active expiring capacity hold that counts against capacity; staff confirmation is still required |
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

For every table below, an identical retry means the same trusted actor,
command, resource scope, idempotency key, and canonical fingerprint. It returns
the original minimized result without another capacity, event, or audit effect.
A reused key with another fingerprint returns `IDEMPOTENCY_KEY_CONFLICT`.
Any state not explicitly listed returns `INVALID_TRANSITION`, changes no
capacity or state, emits no domain event, and records only a safe denied-action
audit entry.

| Command | Actor | Preconditions | Previous | Result | Capacity effect | Event | Audit effect | Idempotency result | Invalid-transition result |
|---|---|---|---|---|---|---|---|---|---|
| `booking:create` without confirmation | Authorized patient/delegate | Current authority; slot/service/modality current; capacity unit available; server `PHARMACY_ID` | None | `confirmed` | Atomically assign one unit to confirmed booking | `booking.created`, `booking.confirmed` | Append both transitions with actor, previous/result state, trusted time, and safe reason | Return original confirmed booking | `SLOT_NO_LONGER_AVAILABLE` for capacity/stale slot; otherwise `INVALID_TRANSITION` |
| `booking:create` requiring confirmation | Authorized patient/delegate | Current authority; slot/service/modality current; service configured for pending confirmation; capacity unit available | None | `pending_confirmation` | Atomically create an `active` expiring hold with the booking; hold counts as one unit | `capacity_hold.created`, `booking.created` | Append hold and booking transitions | Return original pending booking and hold expiry | `SLOT_NO_LONGER_AVAILABLE` or `INVALID_TRANSITION` |
| `booking:confirm` | Authorized synthetic staff | Booking pending; associated hold active and unexpired by trusted database time; current policy/authority | `pending_confirmation` | `confirmed` | Hold becomes `consumed`; confirmed count replaces active-hold count, so total is unchanged | `capacity_hold.consumed`, `booking.confirmed` | Append hold and booking transitions | Return original confirmed booking | `INVALID_TRANSITION` |
| `booking:cancel` pending | Authorized patient/delegate/staff | Booking pending and cancellable; current authority | `pending_confirmation` | `cancelled` | Active hold becomes `released` exactly once; total use decreases by one | `capacity_hold.released`, `booking.cancelled` | Append hold and booking transitions | Return original cancellation | `INVALID_TRANSITION` |
| `booking:expire` | Synthetic expiry worker | Trusted database time is at/after pending expiry; booking and hold still active | `pending_confirmation` | `expired` | Active hold becomes `expired` exactly once; total use decreases by one | `capacity_hold.expired`, `booking.expired` | Append hold and booking transitions | Deterministic worker retry is a no-op returning the terminal state | `INVALID_TRANSITION` |
| `booking:cancel` confirmed | Authorized patient/delegate/staff | Booking confirmed and cancellation policy permits; current authority | `confirmed` | `cancelled` | Release confirmed capacity exactly once; total use decreases by one | `booking.cancelled` | Append booking transition | Return original cancellation | `INVALID_TRANSITION` |
| `booking:reschedule` confirmed | Authorized patient/delegate/staff | Original active; target slot current; target capacity secured; deterministic lock order | `confirmed` | Original `rescheduled`; successor `confirmed` or `pending_confirmation` | Atomically acquire target booking/hold and release original unit; no intermediate leak or overage | Always `booking.rescheduled`, `booking.created`; then `booking.confirmed` for an immediate successor or `capacity_hold.created` for a pending successor | Append original, successor, capacity, and credential transitions | Return original predecessor/successor result | `SLOT_NO_LONGER_AVAILABLE` leaves original unchanged; otherwise `INVALID_TRANSITION` |
| `booking:reschedule` pending | Authorized patient/delegate/staff | Original pending with active hold; target current; target capacity secured; current authority | `pending_confirmation` | Original `rescheduled`; linked successor `confirmed` or `pending_confirmation` | Atomically change original hold to `released` and acquire target booking/hold; total remains within capacity | Always `capacity_hold.released`, `booking.rescheduled`, `booking.created`; then `booking.confirmed` for an immediate successor or `capacity_hold.created` for a pending successor | Append original hold, predecessor, successor, capacity, and credential transitions | Return original predecessor/successor result | `SLOT_NO_LONGER_AVAILABLE` leaves original and hold unchanged; otherwise `INVALID_TRANSITION` |

### 3.3 Booking creation effects

A successful booking creation must atomically:

1. Revalidate the slot, service category, modality, pharmacy scope, and current
   capacity.
2. Lock or otherwise serialize the relevant capacity record.
3. Assign one capacity unit to the booking when confirmation is immediate, or
   create an `active` expiring hold atomically with a
   `pending_confirmation` booking.
4. Count the active hold against capacity.
5. Create the booking.
6. Store the idempotent result.
7. Create `booking.created`.
8. Create `booking.confirmed` when applicable.
9. Create safe audit references.

If any required step fails, no booking, event, audit reference, or capacity
change may remain.

### 3.4 Booking cancellation effects

A successful cancellation must atomically:

1. Verify current authorization.
2. Verify that the booking is still cancellable.
3. Change the booking to `cancelled`.
4. Release capacity exactly once where capacity had been consumed.
5. For `pending_confirmation`, change the one active hold to `released`
   exactly once. A confirmed booking has no active hold to transition.
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
10. Create `booking.rescheduled` and `booking.created`.
11. Create `booking.confirmed` when the successor is immediate, otherwise
    create `capacity_hold.created` for the successor.
12. Revoke the predecessor management capability and create the
    successor-bound management capability.
13. Create required audit references.
14. Store the idempotent result.

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
| `active` | Entry may satisfy the administrative `promotion_candidate` predicate |
| `offered` | One current expiring offer exists |
| `promoted` | Offer was accepted and a booking was created |
| `cancelled` | Actor or staff cancelled the entry |
| `expired` | Entry or its approved lifetime ended |

Terminal states:

- `promoted`
- `cancelled`
- `expired`

The administrative, non-clinical `promotion_candidate` predicate requires:
`active` entry state; trusted database time before entry expiry; server-only
`PHARMACY_ID` match; equal service category with waitlisting enabled; exact
modality match; active slot with one available unit; no live offer/active hold;
and
`PROPOSED_SYNTHETIC_ORDERING_PENDING_PRODUCT_CONFIRMATION` ordering by
`created_at`, then opaque internal entry identifier. Duplicate
prevention allows one `active` or `offered` entry for `(PHARMACY_ID,
subject_reference, service_category_reference, modality_preference)`.

### 4.2 Waitlist-entry transitions

| Command | Actor | Preconditions | Previous | Result | Capacity effect | Event | Audit effect | Idempotency result | Invalid-transition result |
|---|---|---|---|---|---|---|---|---|---|
| `waitlist:join` | Authorized patient/delegate | Service permits waitlisting; no duplicate in the defined live-entry scope; current authority | None | `active` | None | `waitlist.joined` | Append entry transition | Return original active entry | `INVALID_TRANSITION` |
| `waitlist:promote` delegating to `waitlist:offer:create` | Authorized synthetic worker | Exact `promotion_candidate` predicate passes; breaker enabled; no live offer | `active` | `offered` | Create one active hold atomically; total use increases by one | `capacity_hold.created`, `waitlist.offer_created` | Append entry, hold, and offer transitions | Deterministic retry returns original offer | `INVALID_TRANSITION` |
| `waitlist:leave` | Authorized patient/delegate/staff | Current authority; entry active or offered | `active` or `offered` | `cancelled` | If offered, withdraw offer and change active hold to `released` exactly once | When offered: `capacity_hold.released`, `waitlist.offer_withdrawn`; always `waitlist.cancelled` | Append all affected transitions | Return original cancellation | `INVALID_TRANSITION` |
| `waitlist:expire` | Synthetic expiry worker | Trusted database time is at/after entry expiry | `active` or `offered` | `expired` | If offered before the offer/hold deadline, withdraw the offer and change the active hold to `released` exactly once | When offered: `capacity_hold.released`, `waitlist.offer_withdrawn`; always `waitlist.expired` | Append every affected entry/offer/hold transition | Deterministic retry returns terminal state | `INVALID_TRANSITION` |
| `waitlist:offer:accept` | Authorized patient/delegate | Offer pending; hold active; offer/entry unexpired by trusted time; current authority; breaker permits acceptance | `offered` | `promoted` | Hold becomes `consumed`; confirmed booking replaces active hold, total unchanged | `capacity_hold.consumed`, `waitlist.offer_accepted`, `booking.created`, `booking.confirmed` | Append offer, hold, entry, booking, preference/acknowledgement, and credential transitions | Return original booking | `WAITLIST_OFFER_EXPIRED` for time expiry; otherwise `INVALID_TRANSITION` |
| `waitlist:offer:decline` | Authorized patient/delegate | Offer current; current authority | `offered` | `cancelled` | Offer becomes declined; active hold becomes `released` | `capacity_hold.released`, `waitlist.offer_declined`, `waitlist.cancelled` | Append offer, hold, and entry transitions | Return original decline/cancellation | `INVALID_TRANSITION` |
| Offer clock expiry through `automation:reconcile` | Synthetic expiry worker | Trusted database time is at/after offer expiry; offer pending | `offered` | `active` if entry lifetime remains; otherwise `expired` | Active hold becomes `expired` exactly once | `capacity_hold.expired`, `waitlist.offer_expired`; then `waitlist.reactivated` or `waitlist.expired` | Append offer, hold, and entry transitions | Deterministic retry returns resulting entry state | `INVALID_TRANSITION` |

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
3. Change any live offer to `cancelled` through
   `waitlist:offer:withdraw`.
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

| Command | Actor | Preconditions | Previous | Result | Capacity effect | Event | Audit effect | Idempotency result | Invalid-transition result |
|---|---|---|---|---|---|---|---|---|---|
| `waitlist:offer:create` | Authorized synthetic worker, invoked only by `waitlist:promote` | Entry passes exact `promotion_candidate`; breaker enabled; one unit available | None | `pending` | Create active hold atomically | `capacity_hold.created`, `waitlist.offer_created` | Append entry, offer, and hold transitions | Return original offer | `INVALID_TRANSITION` |
| `waitlist:offer:accept` | Authorized patient/delegate | Offer/entry/hold/current authority all current; breaker permits acceptance | `pending` | `accepted` | Hold `consumed`; create confirmed booking; total use unchanged | `capacity_hold.consumed`, `waitlist.offer_accepted`, `booking.created`, `booking.confirmed` | Append every hold, offer, entry, booking, preference/acknowledgement, and credential transition | Return original booking | `WAITLIST_OFFER_EXPIRED` or `INVALID_TRANSITION` |
| `waitlist:offer:decline` | Authorized patient/delegate | Offer pending and unexpired; current authority | `pending` | `declined` | Hold `released` exactly once | `capacity_hold.released`, `waitlist.offer_declined`, `waitlist.cancelled` | Append all transitions | Return original decline | `INVALID_TRANSITION` |
| Offer expiry through `automation:reconcile` | Synthetic expiry worker | Trusted database time at/after deadline; offer pending | `pending` | `expired` | Hold `expired` exactly once | `capacity_hold.expired`, `waitlist.offer_expired`; then `waitlist.reactivated` or `waitlist.expired` | Append offer, hold, and entry transitions | Deterministic retry returns terminal state | `INVALID_TRANSITION` |
| `waitlist:offer:withdraw` | Authorized staff/system worker | Offer pending; exact server-derived withdrawal cause applies | `pending` | `cancelled` | Hold `released` exactly once | `capacity_hold.released`, `waitlist.offer_withdrawn`; then one exact entry event below | Append offer, hold, and entry transitions | Return original cancellation | `INVALID_TRANSITION` |

Withdrawal maps its server-derived cause to one exact entry result:

| Cause | Entry result | Required entry event |
|---|---|---|
| `slot_invalidated` while the entry lifetime and authority remain current | `active` | `waitlist.reactivated` |
| `entry_left` | `cancelled` | `waitlist.cancelled` |
| `authority_revoked` | `cancelled` | `waitlist.cancelled` |
| `entry_window_expired` | `expired` | `waitlist.expired` |

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
11. Create `booking.created` and `booking.confirmed`.
12. Copy the waitlist-owned administrative preference snapshot to a new
    booking-owned snapshot and record the newly validated booking
    acknowledgements.
13. Consume/revoke the waitlist management authority as applicable and create
    the booking-bound reusable capability.
14. Create all audit references.
15. Store one idempotent result.

A retry returns the same booking reference and must not create another booking.

### 5.5 Offer expiry effects

Offer expiry must atomically:

1. Verify the offer remains `pending`.
2. Mark the offer `expired`.
3. Change the capacity hold to `expired` exactly once.
4. Return the waitlist entry to `active` when still valid, otherwise mark it
   `expired`.
5. Create `waitlist.offer_expired`.
6. Create `waitlist.reactivated` for the active result or `waitlist.expired`
   for the expired result.
7. Create an audit reference.

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

| Command | Actor | Preconditions | Previous | Result | Capacity effect | Event | Audit effect | Idempotency result | Invalid-transition result |
|---|---|---|---|---|---|---|---|---|---|
| Create hold | Authorized booking/promotion transaction | Capacity available; owning pending booking or offer created in same transaction | None | `active` | Count one unit | `capacity_hold.created` plus owning aggregate event | Append safe hold transition | Return original hold | `SLOT_NO_LONGER_AVAILABLE` or `INVALID_TRANSITION` |
| Confirm pending booking | Authorized synthetic staff | Owning booking pending; hold active/unexpired | `active` | `consumed` | Active-hold use becomes confirmed-booking use; total unchanged | `capacity_hold.consumed`, `booking.confirmed` | Append hold/booking transitions | Return original confirmation | `INVALID_TRANSITION` |
| Accept offer | Authorized patient/delegate | Offer pending; hold active/unexpired; authority current | `active` | `consumed` | Active-hold use becomes confirmed-booking use; total unchanged | `capacity_hold.consumed`, `waitlist.offer_accepted` | Append hold/offer transitions | Return original acceptance | `WAITLIST_OFFER_EXPIRED` or `INVALID_TRANSITION` |
| Early cancellation/decline/withdrawal | Authorized actor for owning aggregate | Owning pending booking/offer remains cancellable | `active` | `released` | Stop counting one unit exactly once | `capacity_hold.released` plus owning cancellation/decline event | Append hold/aggregate transitions | Return original terminal result | `INVALID_TRANSITION` |
| Clock expiry | Synthetic expiry worker | Trusted database time at/after hold deadline | `active` | `expired` | Stop counting one unit exactly once | `capacity_hold.expired` plus owning expiry event | Append hold/aggregate transitions | Deterministic retry returns terminal state | `INVALID_TRANSITION` |

A terminal hold can never become active again.

Creating, consuming, releasing, or expiring a hold must preserve:

`confirmed bookings + active holds <= configured capacity`

## 7. Management-credential state machine

### 7.1 Credential states

| State | Meaning |
|---|---|
| `active` | Credential may be presented for its narrow approved scope |
| `consumed` | One-time credential was successfully used |
| `expired` | Credential lifetime ended |
| `revoked` | Server withdrew the credential |

### 7.2 Credential transitions

| Command | Actor | Preconditions | Previous | Result | Capacity effect | Event | Audit effect | Idempotency result | Invalid-transition result |
|---|---|---|---|---|---|---|---|---|---|
| `management-credential:issue` reusable capability | Authorized booking/waitlist transaction | Current authenticated session; bounded resource/non-empty action/subject scope; trusted expiry | None | `active` | None | `management_credential.issued` | Append issuance with no raw credential | Return capability summary | `NOT_AUTHORIZED` or `INVALID_TRANSITION` |
| `management-credential:issue` one-time | Authorized current bound synthetic session | Reusable capability current and permits exactly the requested protected action | None | `active` | None | `management_credential.issued` | Append issuance with no raw credential | Return raw credential once; duplicate issuance is denied, never replayed | `ACTION_ALREADY_COMPLETED` or `RECOVERY_REQUIRED` |
| Use one-time credential | Authorized holder plus current server authorization | Digest/scope/binding/current authority match; not expired/revoked/consumed | `active` | `consumed` | Only the separately authorized domain command may affect capacity | `management_credential.consumed` plus domain event | Append credential and domain transitions | Return original command result | Generic `NOT_AUTHORIZED`/`LINK_EXPIRED`; no existence disclosure |
| Validate reusable server-session capability | Authorized current session plus current server authorization | Opaque reference/session/resource/action/scope/current authority match; reusable mode and current | `active` | `active` | Only the domain command may affect capacity | No credential state event; domain event only if command succeeds | Append safe access decision and domain transition | Return original command result | Generic `NOT_AUTHORIZED`/`LINK_EXPIRED` |
| Expire credential | Synthetic expiry worker | Trusted database time at/after deadline | `active` | `expired` | None | `management_credential.expired` | Append credential transition | Deterministic retry returns terminal state | `INVALID_TRANSITION` |
| Revoke credential | Authorized synthetic staff/system control | Credential active; revocation authority current | `active` | `revoked` | None | `management_credential.revoked` | Append credential transition | Return original revocation | `INVALID_TRANSITION` |

### 7.3 Credential rules

An active credential may proceed only when:

- Its digest matches for one-time use, or its opaque reference and current
  server-session binding match for reusable use.
- Its `usageMode` is exactly `one_time` or `reusable`.
- Its resource and action scope match.
- Its actor/subject binding matches.
- It has not expired.
- It has not been revoked or consumed.
- The underlying booking or waitlist action is still allowed.
- Current server authorization passes independently.

A one-time credential is consumed only in the transaction that successfully
commits its protected action; validation, authorization, concurrency, or
transaction failure leaves it active. A reusable capability is not consumed by
use. A credential or capability alone does not authorize an action.

Consumed, expired, revoked, malformed, guessed, or wrong-resource credentials must
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
details, or management credentials.

## 9. Domain-event behaviour

Events are created only after their corresponding transition succeeds within
the same transaction.

The exact required event union is section 4A.13 of
[`api-and-zod-contracts.md`](api-and-zod-contracts.md). Its event types include:

- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `booking.rescheduled`
- `waitlist.joined`
- `waitlist.cancelled`
- `waitlist.offer_created`
- `waitlist.offer_accepted`
- `waitlist.offer_expired`
- `waitlist.offer_declined`
- `waitlist.offer_withdrawn`
- `waitlist.reactivated`
- `waitlist.expired`
- `booking.expired`
- `capacity_hold.created`
- `capacity_hold.consumed`
- `capacity_hold.released`
- `capacity_hold.expired`
- `management_credential.issued`
- `management_credential.consumed`
- `management_credential.expired`
- `management_credential.revoked`

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

Real PostgreSQL testing is authorized only inside the approved loopback-only
synthetic sandbox. It must cover concurrent confirmation, cancellation, and
expiry of `pending_confirmation` bookings in addition to the races above.

## 11. Safe failure responses

Public and patient-facing failures use the canonical registry and
endpoint-specific subsets in
[`api-and-zod-contracts.md`](api-and-zod-contracts.md), including:

- `REQUEST_INVALID`
- `NOT_AUTHORIZED`
- `RESOURCE_UNAVAILABLE`
- `SLOT_NO_LONGER_AVAILABLE`
- `WAITLIST_OFFER_EXPIRED`
- `ACTION_ALREADY_COMPLETED`
- `REQUEST_IN_PROGRESS`
- `IDEMPOTENCY_KEY_CONFLICT`
- `RECOVERY_REQUIRED`
- `TEMPORARILY_UNAVAILABLE`
- `FEATURE_DISABLED`

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
