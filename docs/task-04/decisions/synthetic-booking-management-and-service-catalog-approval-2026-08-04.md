# Task 04 synthetic booking-management and service-catalog approval

**Task:** Task 04 — Complete the Online Booking and Waitlist Prototype

**Decision date:** 2026-08-04

**Decision type:** Coordinator follow-up approval

**Applies to:** Local synthetic Task 04 prototype only

**Parent approval:** [Task 04 synthetic sandbox scope and reviewer approvals](synthetic-sandbox-scope-approval-2026-08-02.md)

**Experimental expiry date:** 2026-08-05

**G2 hosted preview:** NOT AUTHORIZED

**G3 production imports:** EMPTY

This append-only decision record narrows and clarifies the approved synthetic
prototype scope. It does not replace the parent approval, extend its expiry, or
define production authorization policy.

## Reusable booking capability

Booking creation may establish a reusable, server-owned, session-bound
capability containing exactly:

- `booking:view`;
- `booking:reschedule`; and
- `booking:cancel`.

The capability must be bound to the synthetic actor, synthetic subject,
booking lineage, sandbox instance and lifecycle, and an expiry. It must be
revocable, inaccessible to client modification, and revalidated server-side
on every action.

Possessing the capability never bypasses booking-state or capacity checks.
This approval records the contract; it does not authorize implementation of
rescheduling or cancellation commands in the service-catalog slice.

## Delegation fixtures

The prototype may use deterministic, server-owned delegation fixtures for:

- active;
- expired;
- revoked;
- wrong-subject; and
- wrong-scope cases.

No delegation table is approved for the prototype. Production caregiver
access remains blocked pending Task 05.

## Bootstrap management credential

A later synthetic slice may implement a single-use bootstrap management
credential that exchanges into the reusable session capability. Its required
cases are active, expired, consumed, revoked, wrong-actor, and replay.

No email or SMS delivery is authorized.

## Rescheduling evidence

A later rescheduling command must atomically record safe audit and outbox
evidence for:

- the original booking becoming superseded;
- the replacement booking being created;
- target capacity or hold acquisition; and
- original capacity or hold release.

Both bookings and their predecessor/successor relationship must be preserved.
Only opaque identifiers, approved event types, and safe reason codes may be
used.

If any booking, capacity, hold, audit, outbox, or idempotency write fails, the
entire transaction must roll back and the original booking must remain
unchanged.

## Public service catalog

A small synthetic public service-catalog boundary is approved. It may return
only:

- active service labels;
- supported modalities; and
- opaque, non-sequential service references.

The catalog uses fixed server-defined ordering, no pagination for the bounded
synthetic list, a strict maximum response size, `Cache-Control: no-store`,
generic safe errors, rate and enumeration protection, and server-side
revalidation at availability and booking time.

Service choices must not be derived from availability results. A service with
no available slots remains visible in the catalog, while its availability
response is an empty bounded result. The later UI must display exactly:

> No times are currently available for this service in the selected date
> range.

Availability pagination and date navigation remain independent of the
catalog.

## Continuing prohibitions

This follow-up does not authorize:

- production data or production authorization policy;
- a hosted preview;
- external communication;
- production imports;
- clinical behavior;
- live integrations; or
- any broader interpretation of this approval.

The sandbox must continue to fail closed when its approval or lifecycle
expires.
