# Task 04 synthetic sandbox scope and reviewer approvals

**Task:** Task 04 — Complete the Online Booking and Waitlist Prototype  
**Decision date:** 2026-08-02  
**Decision version:** Task 04 synthetic sandbox scope v1  
**Implementation stage:** Synthetic implementation authorized  
**Task 11 risk tier:** R3  
**Task 11 autonomy level:** A3_BOUNDED_AUTOMATION  
**Experimental expiry date:** 2026-08-05  
**Task 11 review-due date:** 2026-08-05  
**G2 hosted preview:** NOT REQUESTED  
**G3 production imports:** EMPTY

This is an append-only Task 04 scope addendum. It does not replace or rewrite
the original [Task 01 G1 approval](../../task-01/decisions/G1-design-approval.md).

## Approved synthetic scope

Royian Chowdhury approves the proposed Task 04 synthetic sandbox capability,
subject to the unresolved registration fields and implementation gate below.
The approved design scope includes:

- deterministic synthetic patient, delegate, pharmacist, and contact fixtures;
- a sandbox-only PostgreSQL schema and migrations;
- Docker PostgreSQL bound explicitly to a loopback host address;
- synthetic audit and transactional-outbox records;
- bounded retention, expiry, teardown, and cleanup behavior;
- Docker configuration, dependencies, and sandbox scripts;
- bounded expiry and waitlist-promotion workers;
- real-PostgreSQL transaction, constraint, idempotency, and concurrency tests;
- a server-side kill switch and fail-closed handling of missing, contradictory,
  expired, or disabled lifecycle state; and
- a temporary expiring capacity hold for `pending_confirmation` bookings.

The capacity hold must be created atomically with the pending booking, count
against capacity, use trusted server/database time, be consumed atomically on
confirmation, and release exactly once on cancellation or expiry. Concurrent
confirmation, cancellation, and expiry must be tested against real PostgreSQL.

## Explicit exclusions

This approval does not authorize:

- production data, identities, users, credentials, databases, or integrations;
- Supabase or any other cloud database connection;
- a production migration or modification of live data;
- production-module imports without a separately granted G3 approval;
- a hosted preview or other G2 activity;
- email, SMS, push, webhook, or any other external communication;
- clinical, eligibility, prescribing, dispensing, billing, or claim behavior;
- collection of health-card numbers, symptoms, medications, diagnoses, or
  unrestricted medical notes; or
- production deployment or operational patient use.

## Reviewer decisions

### Product Lead and accountable capability owner

**Reviewer:** Royian Chowdhury  
**Role:** Product Lead / Accountable Capability Owner  
**Decision:** APPROVED

Royian Chowdhury approves the bounded purpose, exclusions, R3 classification,
synthetic-only capability split, temporary-capacity-hold policy, and requirement
for server-side lifecycle and kill-switch enforcement.

### Security/Privacy Reviewer

**Reviewer:** Royian Chowdhury  
**Role:** Security/Privacy Reviewer  
**Decision:** APPROVED

Royian Chowdhury approves the proposed synthetic-data boundary, loopback-only
database boundary, production credential and integration denial, payload-safe
audit/outbox design, bounded retention and cleanup design, and fail-closed
security requirements.

### Operations/SRE Reviewer

**Reviewer:** Royian Chowdhury  
**Role:** Operations/SRE Reviewer  
**Decision:** APPROVED

Royian Chowdhury approves the proposed local Docker lifecycle, loopback binding,
database isolation, worker shutdown, teardown targeting, recovery testing, and
kill-switch operability requirements.

### Quality/Test Reviewer

**Reviewer:** Royian Chowdhury  
**Role:** Quality/Test Reviewer  
**Decision:** APPROVED

Royian Chowdhury approves the proposed real-PostgreSQL test strategy covering
capacity constraints, idempotency, transaction atomicity, hold consumption,
expiry, cancellation, waitlist promotion, and deterministic race conditions.

### Accessibility Reviewer

**Reviewer:** Royian Chowdhury  
**Role:** Accessibility Reviewer  
**Decision:** APPROVED FOR THE SYNTHETIC DESIGN STAGE

Royian Chowdhury approves inclusion of the Task 04 accessibility test plan for
the synthetic user-facing workflow. Implementation evidence remains required
before any later promotion decision.

### Task 11 Checkpoint Reviewer

**Reviewer:** Royian Chowdhury  
**Role:** Task 11 Checkpoint Reviewer  
**Decision:** APPROVED_TO_IMPLEMENT_SYNTHETIC

Royian Chowdhury approves Task 11 Checkpoint 1 for the exact synthetic scope in
this record. Task 04 is registered as R3 with autonomy level
`A3_BOUNDED_AUTOMATION`. This decision authorizes synthetic implementation only
through the experimental expiry date and does not authorize production,
hosted-preview, external-integration, or production-import activity.

## Role consolidation disclosure

Royian Chowdhury is recorded in every reviewer role above, as accountable owner,
and as backup owner at his explicit direction. These are not represented as
independent reviews or independent operational coverage. Any later production
or promotion gate that requires reviewer independence or independent backup
coverage must remain blocked until an eligible independent person supplies it
or an authorized governance policy explicitly permits the consolidation.

## Task 11 registration metadata

- **Accountable capability owner:** Royian Chowdhury.
- **Backup capability owner:** Royian Chowdhury.
- **Operations/SRE reviewer:** Royian Chowdhury.
- **Security/Privacy reviewer:** Royian Chowdhury.
- **Quality/Test reviewer:** Royian Chowdhury.
- **Accessibility reviewer:** Royian Chowdhury.
- **Task 11 Checkpoint reviewer:** Royian Chowdhury.
- **Experimental `expires_at`:** 2026-08-05.
- **Task 11 `review_due_at`:** 2026-08-05.
- **Risk tier:** R3.
- **Autonomy level:** `A3_BOUNDED_AUTOMATION`.
- **Kill-switch operator and consolidated backup coverage:** Royian Chowdhury.

## Current authorization

**Status:** `APPROVED_TO_IMPLEMENT_SYNTHETIC`

Documentation, design, and implementation of the exact local synthetic scope in
this record are authorized through 2026-08-05. The capability must fail closed
after expiry unless a new review extends it. Production data, credentials,
systems, deployment, imports, hosted access, and external effects remain
prohibited.
