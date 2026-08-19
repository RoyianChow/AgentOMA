# Task 04 Waitlist and Promotion Policy Approval

**Decision date:** 2026-08-10  
**Approver:** Royian Chowdhury  
**Scope:** Local synthetic Task 04 prototype only  
**Decision:** APPROVED FOR SYNTHETIC POLICY SCOPE

This record approves the following waitlist and promotion policy for the
synthetic-only Task 04 design. It does **not** renew or extend the expired
Task 04 implementation approval. Runtime changes, database migrations, Docker
runs, evidence promotion, and merge remain blocked until a superseding,
versioned Task 04 approval is completed.

## Approved policy

### Ordering and duplicates

- Waitlist order is the server-created UTC timestamp ascending.
- The opaque waitlist-entry ID is the deterministic tie-breaker.
- Clinical priority must never affect ordering.
- There is one active entry per synthetic subject, service, and appointment
  category. Duplicate requests are rejected idempotently.

### Leaving and cancellation

- A subject may leave while an entry is `ACTIVE` or `OFFERED`.
- Leaving changes the entry to `CANCELLED`.
- Any offer and capacity hold are released atomically.

### Offers and trusted time

- An offer is created only when a confirmed slot is available and the entry is
  the earliest eligible active entry.
- Offer expiry is 10 minutes, measured by the database transaction clock.
- Client-provided timestamps are never trusted.

Allowed transitions:

```text
ACTIVE   -> OFFERED
OFFERED  -> CONFIRMED  (acceptance)
OFFERED  -> DECLINED   (decline)
OFFERED  -> WITHDRAWN  (subject leaves)
OFFERED  -> EXPIRED    (trusted expiry)
```

### Capacity and races

- A capacity hold is created atomically with the offer.
- Confirmation consumes the hold atomically.
- Decline, withdrawal, expiry, cancellation, or failed confirmation releases
  the hold exactly once.
- When confirmation and expiry race, the transaction that confirms while the
  hold is valid wins. If expiry commits first, confirmation fails closed.
- The design must not permit double booking.

### Promotion worker and kill switch

- There is at most one promotion worker per service and appointment category.
- A run processes at most 25 entries.
- Retries are bounded; no unbounded retry loop is permitted.
- A server-side kill switch blocks new offers and does not alter existing
  confirmed bookings.

## Safe event codes

The approved codes are:

```text
WAITLIST_JOINED
WAITLIST_DUPLICATE_REJECTED
WAITLIST_LEFT
WAITLIST_CANCELLED
WAITLIST_OFFER_CREATED
WAITLIST_OFFER_ACCEPTED
WAITLIST_OFFER_DECLINED
WAITLIST_OFFER_WITHDRAWN
WAITLIST_OFFER_EXPIRED
WAITLIST_HOLD_CREATED
WAITLIST_HOLD_CONSUMED
WAITLIST_HOLD_RELEASED
WAITLIST_PROMOTION_BLOCKED
WAITLIST_PROMOTION_KILL_SWITCHED
```

Every audit and outbox record contains only opaque identifiers, timestamps,
state, and a safe reason code. It must never contain names, contact details,
clinical information, or message payloads. External notifications remain
stubbed pending Task 07.

## Boundaries still in force

- Synthetic fixtures and synthetic data only.
- No production imports, credentials, PHI, Supabase/cloud database access,
  hosted preview, or external notifications.
- No production capability is authorized by this policy record.
- G2 is not granted and G3 remains empty.
- The full Task 04 renewal package must still bind a clean candidate,
  implementation scope, owners/reviewers, expiry and review timestamps, and
  evidence requirements for capability, lifecycle, authorization, recovery,
  concurrency, and teardown.

Until that renewal exists, this is a documentation decision only. It does not
authorize code, schema, dependency, Docker, migration, evidence, or merge
work.
