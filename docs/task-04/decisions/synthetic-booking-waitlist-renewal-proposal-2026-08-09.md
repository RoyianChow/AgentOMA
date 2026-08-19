# Task 04 synthetic booking and waitlist implementation renewal proposal

**Task:** Task 04 — Complete the Online Booking and Waitlist Prototype

**Proposal date:** 2026-08-09

**Decision type:** Renewal / implementation authorization proposal

**Applies to:** Local synthetic Task 04 prototype only

**Implementation candidate SHA:** `04a4f27bed99dd5023390fc93bfff04a77217235`

**Parent approval:** [Task 04 synthetic sandbox scope and reviewer approvals](synthetic-sandbox-scope-approval-2026-08-02.md)

**Prior follow-up:** [Task 04 synthetic booking-management and service-catalog approval](synthetic-booking-management-and-service-catalog-approval-2026-08-04.md)

**Requested experimental expiry date:** PENDING COORDINATOR DECISION

**Requested Task 11 review-due date:** PENDING COORDINATOR DECISION

**G2 hosted preview:** NOT REQUESTED

**G3 production imports:** EMPTY

**Coordinator decision:** PENDING

This is an append-only renewal proposal for the existing Task 04 synthetic
sandbox. It does not replace either prior decision record and does not authorize
implementation until the coordinator records an explicit approval.

The prior Task 04 synthetic implementation authorization expired on 2026-08-05.
The 2026-08-04 follow-up recorded the intended booking-management contracts but
explicitly did not authorize implementation of the rescheduling or cancellation
commands.

The purpose of this proposal is to request renewed, versioned authorization for
the remaining synthetic booking-management and waitlist implementation.

## Existing implementation checkpoint

The implementation candidate identified above currently includes:

- Task 04 synthetic PostgreSQL foundation;
- booking infrastructure and strict contracts;
- public availability;
- public service catalog;
- booking creation;
- booking retrieval;
- pharmacist/staff confirmation;
- pharmacist queue backend and UI;
- deterministic synthetic delegation fixtures; and
- booking-expiry worker.

The public `/book` UI work has also been preserved separately on the remote WIP
branch:

`wip/task-04-public-book-ui`

That WIP branch is not intended for merge until its remaining authorization and
idempotency-lineage requirements are satisfied.

## Requested implementation authorization

Subject to the coordinator decisions below, this proposal requests renewed
synthetic implementation authority for:

- booking rescheduling;
- booking cancellation;
- waitlist join;
- waitlist leave;
- waitlist offer creation and lifecycle handling;
- deterministic waitlist promotion;
- offer acceptance;
- offer expiry; and
- the transaction, idempotency, audit/outbox, capacity, concurrency, and
  recovery behavior required by those commands.

This authorization request is limited to the existing local Task 01 synthetic
sandbox.

## Booking rescheduling

The requested rescheduling implementation must preserve the contract already
recorded in the 2026-08-04 decision.

A successful reschedule must atomically:

- validate the reusable booking-management capability;
- revalidate booking state and authoritative synthetic scope;
- acquire the target slot/capacity or required hold;
- create the replacement booking;
- supersede the original booking;
- record predecessor/successor lineage;
- release the original capacity or hold exactly once;
- complete idempotency evidence; and
- write minimized synthetic audit and transactional-outbox evidence.

If any required booking, capacity, hold, idempotency, audit, or outbox write
fails, the entire transaction must roll back and the original booking must
remain unchanged.

Real PostgreSQL tests must cover concurrent reschedule attempts and conflicts
with confirmation, cancellation, and expiry where applicable.

## Booking cancellation

The requested cancellation implementation must:

- validate the reusable booking-management capability;
- revalidate booking state and synthetic scope;
- transition only an eligible booking to the approved cancelled state;
- release owned capacity or an active hold exactly once;
- remain idempotent under retries;
- write minimized audit/outbox evidence in the same transaction; and
- fail closed on expired, revoked, wrong-subject, wrong-booking, or otherwise
  invalid management authority.

Real PostgreSQL tests must cover duplicate cancellation and races involving
confirmation, expiry, and rescheduling.

## Waitlist implementation

The remaining waitlist implementation may not invent business or ordering
policy.

Before implementation proceeds, the coordinator must explicitly provide or
confirm the applicable waitlist ordering and promotion policy, including any
required tie-breaking behavior.

The implementation must then preserve deterministic behavior under concurrency
and must not allow browser-controlled values to become authoritative ordering,
pharmacy, actor, subject, or capacity state.

The requested waitlist surface includes:

- join;
- leave;
- offer creation;
- promotion;
- offer acceptance;
- offer expiry; and
- safe retry/recovery behavior.

All waitlist state transitions must use strict server-side validation,
idempotency where required, minimized audit/outbox evidence, and real PostgreSQL
race tests.

## Coordinator decisions required before waitlist implementation

The following values or policies must be supplied or explicitly confirmed
rather than inferred by the implementation:

1. waitlist ordering and deterministic tie-breaking policy;
2. trusted public actor/subject/session establishment for waitlist actions;
3. waitlist idempotency authority;
4. permitted public waitlist response shape;
5. waitlist-entry expiry policy;
6. waitlist offer duration/expiry policy;
7. waitlist rate-limit threshold, window, and scope; and
8. any permitted cleanup behavior after the Task 04 lifecycle authorization
   itself expires.

If any item remains unresolved, the affected command must remain blocked rather
than using an invented default.

## Lifecycle and fail-closed behavior

The renewed sandbox must remain lifecycle-gated.

All newly authorized commands must fail closed when:

- the Task 04 approval is expired;
- the lifecycle revision is stale or contradictory;
- the sandbox kill switch is disabled;
- the request belongs to another sandbox instance;
- the actor, subject, booking, pharmacy, capability, or delegation scope does
  not match authoritative server state; or
- any required approval metadata cannot be validated.

No implementation may bypass lifecycle checks solely to make tests pass.

## Evidence and testing requirements

The renewed implementation must include evidence for:

- strict input validation;
- authorization and scope enforcement;
- idempotency and replay handling;
- deterministic lock ordering;
- transaction atomicity;
- capacity ownership and release;
- concurrency races;
- rollback behavior;
- minimized audit records;
- transactional outbox records;
- expiry/revocation behavior;
- privacy/server-client boundaries; and
- absence of production data, credentials, integrations, and external effects.

Required concurrency behavior must be exercised against real PostgreSQL rather
than mocks alone.

## Continuing prohibitions

This proposal does not request or authorize:

- production data, identities, users, credentials, or databases;
- production migrations;
- Supabase or other cloud database access;
- hosted preview access;
- production-module imports without G3 approval;
- email, SMS, push, webhook, or other external communication;
- clinical, triage, eligibility, prescribing, dispensing, billing, or claim
  behavior;
- health-card information or PHI;
- production deployment; or
- operational patient use.

All Task 04 work remains synthetic-only.

## Reviewer independence

The existing synthetic decision records disclose that the same reviewer is
currently recorded across all reviewer roles.

That consolidation is accepted only for the current synthetic stage. It must
not be treated as independent review for a later Task 11 promotion gate.

An eligible independent reviewer must be recorded before any later gate that
requires reviewer independence.

## Requested coordinator decision

The coordinator is requested to:

1. approve, reject, or amend the implementation scope above;
2. provide a new experimental expiry date;
3. provide a new Task 11 review-due date;
4. confirm the lifecycle/approval revision to bind to the renewed sandbox;
5. provide or confirm the outstanding waitlist ordering/promotion policy and
   other required waitlist decisions; and
6. identify any additional evidence or reviewer requirement that must be
   satisfied before implementation resumes.

Until that decision is recorded, the remaining reschedule, cancellation, and
waitlist commands remain unauthorized and must not be implemented.

## Current proposal status

**Status:** `PENDING_COORDINATOR_DECISION`

This file records a request for authorization only. It does not itself grant
authorization.