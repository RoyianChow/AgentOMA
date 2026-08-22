# Task 04 Synthetic Scope Renewal v3 — Draft Review Record

> **DRAFT — NOT GRANTED.** This document records an exact implementation
> candidate and the decisions still required from authorized reviewers. It
> does not authorize implementation, migrations, Docker or database use,
> evidence promotion, merge, deployment, production use, hosted preview,
> production imports, or external effects.

**Task:** Task 04 — Booking and Waitlist Synthetic Prototype

**Decision version:** `v3`

**Decision date:** `PENDING — reviewer-controlled`

**Decision status:** `DRAFT — NOT GRANTED`

**Existing Task 11 classification:** `R3` / `A3_BOUNDED_AUTOMATION`

**Renewal of that classification:** `PENDING — reviewer confirmation required`

> **Merge review note (updated 2026-08-20):** this draft is bound to candidate
> `04a4f27bed99dd5023390fc93bfff04a77217235`. The maintained checkout is now
> `1ce2c9ace894f5c2a745f15fa901fe2fc6acc138` and includes the merged `/book`
> UI. This draft cannot authorize the newer candidate without new hashes,
> scope review, dates, and signatures.

## 1. Authority and source records

This draft must be read with the following records on `origin/main`:

- [`synthetic-sandbox-scope-approval-2026-08-02.md`](synthetic-sandbox-scope-approval-2026-08-02.md)
- [`synthetic-booking-management-and-service-catalog-approval-2026-08-04.md`](synthetic-booking-management-and-service-catalog-approval-2026-08-04.md)
- `origin/main:docs/task-04/decisions/task-04-waitlist-promotion-policy-approval-2026-08-10.md`
- [`../api-and-zod-contracts.md`](../api-and-zod-contracts.md)
- [`../concurrency-and-capacity-design.md`](../concurrency-and-capacity-design.md)
- [`../domain-model.md`](../domain-model.md)
- [`../identity-and-delegation-contract.md`](../identity-and-delegation-contract.md)
- [`../state-machines.md`](../state-machines.md)
- [`../domain-events-and-task-07-handoff.md`](../domain-events-and-task-07-handoff.md)
- [`../pre-implementation-test-plan.md`](../pre-implementation-test-plan.md)

The 2026-08-02 implementation approval expired on 2026-08-05. The 2026-08-04
follow-up did not extend that expiry. The 2026-08-10 waitlist record approved a
synthetic policy sub-decision only and expressly did not renew implementation,
runtime, migration, Docker, evidence-promotion, or merge authority.

Accordingly, the earlier records and design documents supply contract history
and review inputs only. They do not make this renewal effective. If this draft
conflicts with an approved source record, the approved source record controls;
the conflict must be resolved before any decision is granted.

## 2. Exact candidate binding

The requested review is bound only to the following frozen candidate and
recorded evidence. The hashes below are reproduced exactly from the supplied
capture; this documentation pass did not recompute or independently attest to
them.

| Field | Recorded value |
|---|---|
| Full candidate commit SHA | `04a4f27bed99dd5023390fc93bfff04a77217235` |
| Branch/ref at capture | `task-04-booking-waitlist` at `04a4f27bed99dd5023390fc93bfff04a77217235` |
| Worktree clean at capture | `YES — reported by the candidate capture evidence` |
| Candidate captured at UTC | `2026-08-19T04:51:36Z` |
| Sandbox source SHA-256 | `f3a0ae4c1e401941647b187b7be7a224f1ff249abe7463c445e304e01926d50a` |
| Sandbox migration SHA-256 | `c5675cbbb76aa93d7159dc68e34c4ec5e07831cf2f69a874263d9638d928d3d0` |
| Docker/compose configuration SHA-256 | `b45e236ec7a707a86f1dcfa3fef416e31ad14adb425a3b68c219105a3cafa8b1` |
| Approval artifact path | `docs/task-04/decisions/task-04-synthetic-scope-renewal-v3-2026-08-19.md` |

Any source, migration, fixture, dependency, Docker, configuration, or script
change creates a different candidate and requires new hashes and review. A
branch name, short SHA, moving ref, or dirty worktree is not a substitute for
the exact binding above.

## 3. Decision requested

No reviewer decision is recorded in this draft.

- `[ ] APPROVED_TO_IMPLEMENT_SYNTHETIC`
- `[ ] NOT APPROVED`

**Current effective result:** `NOT GRANTED`

An authorized reviewer must select and record exactly one outcome. Until then,
the candidate has no authority from this document. A future approval, if any,
would remain limited to the exact selected local synthetic scope and would not
constitute production-readiness, clinical, legal, privacy, professional, G2,
G3, G1-L, or G4 approval.

## 4. Requested capability scope

Every scope item remains unselected pending explicit reviewer action.

| Potential local synthetic scope | Renewal decision |
|---|---|
| Deterministic synthetic patient, delegate, pharmacist, and contact fixtures | `PENDING` |
| Loopback-only Docker PostgreSQL 16 and sandbox-owned schema/migrations | `PENDING` |
| Synthetic audit records and transactional outbox records | `PENDING` |
| Bounded retention, expiry, cleanup, teardown, and kill-switch workers | `PENDING` |
| Docker configuration, dependencies, and sandbox scripts | `PENDING` |
| Public availability and service catalog | `PENDING` |
| Booking creation, retrieval, confirmation, cancellation, and rescheduling | `PENDING` |
| Waitlist join, leave, offer, accept, decline, withdraw, expiry, and promotion | `PENDING` |
| Server-owned, session-bound booking capabilities | `PENDING` |
| Short-lived lineage material used only for server-side idempotency | `PENDING` |
| Single-use bootstrap credential exchange | `DEFERRED — see Section 6.3` |
| Real-PostgreSQL transaction, constraint, idempotency, and concurrency tests | `PENDING` |
| Pharmacist queue projection and synthetic UI evidence | `PENDING` |

Unselected or deferred items are not authorized. No authority may be inferred
from existing code, prior expired approval, a design contract, a developer
request, or a passing test.

## 5. Non-negotiable exclusions

These exclusions remain in force even if a later reviewer grants a subset of
the requested local synthetic scope:

- production data, PHI, production-derived data, or de-identified production
  fixtures;
- production identities, credentials, pharmacist accounts, TOTP seeds,
  cookies, or sessions;
- Supabase, cloud databases, production storage, production migrations, or
  production configuration;
- production-module imports without a separate exact G3 decision;
- hosted preview or non-loopback access without a separate G2 decision;
- email, SMS, push, webhook, calendar, payment, courier, vendor, model, HNS,
  FHIR, dispensing, claim, or any other external effect;
- symptoms, diagnoses, health numbers, medications, clinical narratives, or
  reason-for-visit data in the booking workflow;
- client-selected pharmacy, tenant, actor, subject, role, capacity, trusted
  time, lifecycle, approval, or authorization state;
- PHI, contact details, tokens, credentials, or unsafe identifiers in URLs,
  browser storage, analytics, logs, caches, or evidence artifacts; and
- any representation that a booking is a clinical assessment, prescription,
  claim, payment, eligibility decision, or completed professional service.

## 6. Existing contract baselines and pending renewal decisions

The entries below identify already documented synthetic contracts. They avoid
reopening or silently changing those contracts, but they do not approve their
implementation or operation under this renewal.

### 6.1 Reusable booking capability

**Existing contract source:** the 2026-08-04 follow-up,
`identity-and-delegation-contract.md`, and `api-and-zod-contracts.md`.

**Renewal decision:** `PENDING`

The documented reusable capability is server-owned and session-bound and
contains exactly:

- `booking:view`;
- `booking:reschedule`; and
- `booking:cancel`.

The existing contract requires authoritative actor, subject/delegation,
pharmacy, booking-lineage, sandbox-instance, lifecycle, expiry, revocation,
resource, and action checks at every protected server boundary. Possession of
an opaque capability reference is not authority by itself. No broader action
set is requested or implied here.

### 6.2 Synthetic delegation fixtures

**Existing contract source:** the 2026-08-04 follow-up and
`identity-and-delegation-contract.md`.

**Renewal decision:** `PENDING`

The previously recorded deterministic fixture cases are exactly:

- `active`;
- `expired`;
- `revoked`;
- `wrong_subject`; and
- `wrong_scope`.

This draft does not authorize a delegation table or production caregiver
access. Production identity and delegation semantics remain owned by Task 05.

### 6.3 Bootstrap credential exchange

**Existing contract source:** the 2026-08-04 follow-up and the management
credential boundaries in `api-and-zod-contracts.md`.

**Renewal decision:** `DEFERRED`

The repository documents a possible single-use synthetic bootstrap exchange
and its fail-closed scenarios, but this renewal does not have an explicit
reviewer decision completing every approval-controlled field. Whether it is
source-less remains `PENDING` rather than being inferred from the template.
The following remain `PENDING`:

- exact approved exchange purpose;
- exact actor, subject, pharmacy, sandbox-instance, lifecycle, and approval
  binding for this renewal;
- renewal-specific expiry;
- consumption, replay, and recovery decision;
- minimized audit evidence approved for the exchange; and
- reviewer authorization to include the exchange in the candidate scope.

External delivery remains `NOT AUTHORIZED`.

### 6.4 Rescheduling

**Existing contract source:** the 2026-08-04 follow-up,
`state-machines.md`, `api-and-zod-contracts.md`, and
`concurrency-and-capacity-design.md`.

**Renewal decision:** `PENDING`

The documented synthetic baseline permits only a currently authorized pending
or confirmed source booking. The server revalidates the replacement slot and
secures target capacity before atomically preserving the predecessor as
`rescheduled`, creating and linking the successor, releasing original
capacity, rotating predecessor/successor capability authority, storing the
idempotent safe result, and writing the documented safe audit/outbox evidence.
A failed reschedule leaves the original booking and capacity unchanged. This
paragraph records the existing contract; it does not grant renewal authority.

### 6.5 Cancellation

**Existing contract source:** `state-machines.md`,
`api-and-zod-contracts.md`, and `concurrency-and-capacity-design.md`.

**Renewal decision:** `PENDING`

The documented synthetic baseline permits cancellation only through current
scoped patient/delegate authority or exact staff permission and only while the
booking remains cancellable. A successful transaction changes the booking to
`cancelled`, releases a pending hold or confirmed capacity exactly once,
stores the idempotent safe result, and writes the documented safe audit/outbox
evidence. Any required-write failure rolls back the entire transaction.

### 6.6 Waitlist and promotion

**Policy decision:** `APPROVED FOR SYNTHETIC POLICY SCOPE` in
`origin/main:docs/task-04/decisions/task-04-waitlist-promotion-policy-approval-2026-08-10.md`.

**Renewal implementation/runtime decision:** `PENDING`

That record remains the single source for ordering, duplicate handling,
transitions, trusted expiry, atomic capacity holds, races, worker bounds,
kill-switch behavior, and safe event codes. This draft does not copy, amend,
or reopen those policy decisions. As that record states, its policy approval
does not renew implementation, migration, Docker, runtime, evidence-promotion,
or merge authority.

### 6.7 Public service catalog

**Existing contract source:** the 2026-08-04 follow-up and
`api-and-zod-contracts.md`.

**Renewal decision:** `PENDING`

The documented catalog is local synthetic only and exposes active public
labels, supported modalities, and opaque non-sequential references. It uses
fixed server ordering, bounded output, no pagination, `Cache-Control:
no-store`, generic safe errors, rate/enumeration controls, and independent
availability and booking-time revalidation. Services with no available slots
remain visible. No broader catalog contract is introduced here.

### 6.8 Idempotency and minimized safe responses

**Existing contract source:** `api-and-zod-contracts.md`,
`state-machines.md`, and `concurrency-and-capacity-design.md`.

**Renewal decision:** `PENDING`

The existing contract binds database-backed idempotency to the trusted actor,
operation, resource scope, idempotency-key digest, and canonical request
fingerprint. Identical committed retries return the original validated safe
result; changed requests conflict safely; active execution returns the
canonical in-progress result; concurrent identical requests create one domain
effect; and rollback leaves no successful receipt. Raw keys, credentials,
contact data, clinical information, PHI, SQL details, and internal failure
reasons are excluded from stored or returned safe material. Endpoint errors
remain restricted to the exact documented safe-error registry.

### 6.9 Lifecycle and fail-closed boundary

**Existing contract source:** the 2026-08-02 scope record, Task 01 sandbox
controls, and the Task 04 design documents.

**Renewal decision:** `PENDING`

All Task 04 paths must continue to use authoritative server/database context
and fail closed for missing, malformed, contradictory, disabled, stale, or
expired approval/lifecycle state. A renewal expiry cannot be inferred from an
earlier record or extended by configuration, comments, this draft, or passing
tests. Any new expiry, review-due date, owner, operator, and teardown authority
must be supplied explicitly in Sections 7 and 8.

## 7. Owners and reviewers

Prior records identify historical reviewers for their own decisions. This v3
draft does not infer or carry those assignments forward.

| Role | Named person | Independent of implementer? | Decision |
|---|---|---:|---|
| Product lead | `PENDING` | `PENDING` | `PENDING` |
| Accountable capability owner | `PENDING` | `PENDING` | `PENDING` |
| Backup capability owner | `PENDING` | `PENDING` | `PENDING` |
| Security/privacy reviewer | `PENDING` | `PENDING` | `PENDING` |
| Operations/SRE reviewer | `PENDING` | `PENDING` | `PENDING` |
| Quality/test reviewer | `PENDING` | `PENDING` | `PENDING` |
| Accessibility reviewer | `PENDING` | `PENDING` | `PENDING` |
| Task 11 Checkpoint reviewer | `PENDING` | `PENDING` | `PENDING` |

Any role consolidation must be disclosed. Consolidated roles do not count as
independent review or independent backup coverage.

## 8. Expiry and review controls

| Field | Status |
|---|---|
| Experimental start UTC | `PENDING — reviewer-controlled` |
| Experimental expiry UTC | `PENDING — reviewer-controlled` |
| Task 11 review due UTC | `PENDING — reviewer-controlled` |
| Kill-switch operator | `PENDING — reviewer-controlled` |
| Teardown owner | `PENDING — reviewer-controlled` |
| Renewal required before | `PENDING — reviewer-controlled` |

No runtime or implementation is authorized while these fields are pending.
If approval is later granted, every implementation and runtime path must fail
closed at the recorded boundary. No grace period or authority is implied.

## 9. Evidence status before any synthetic PASS

- `[x]` Full candidate SHA recorded from supplied capture evidence.
- `[x]` Clean-worktree-at-capture statement recorded from supplied evidence.
- `[x]` Candidate UTC and the three supplied SHA-256 values recorded exactly.
- `[ ]` Authorized reviewer independently verifies the exact candidate and
  hashes.
- `[ ]` Reviewer selects the exact permitted capability scope.
- `[ ]` Required owners, reviewers, independence disclosures, expiry, and
  review-due fields are complete.
- `[ ]` Fresh loopback-only Docker environment evidence is reviewed.
- `[ ]` From-zero schema/migration replay evidence is reviewed.
- `[ ]` Required real-PostgreSQL capacity, hold, expiry, cancellation,
  rescheduling, promotion, idempotency, rollback, concurrency, and
  tenant-isolation evidence is reviewed.
- `[ ]` Audit and outbox atomicity evidence is reviewed.
- `[ ]` Stale lifecycle, wrong actor, wrong subject, wrong scope, expired,
  revoked, and unknown-state fail-closed evidence is reviewed.
- `[ ]` No-external-transport and production-invariance evidence is reviewed.
- `[ ]` Privacy evidence confirms no PHI, contact details, credentials,
  payloads, or unsafe identifiers in prohibited sinks.
- `[ ]` Accessibility and responsive evidence is reviewed.
- `[ ]` Exact Task 11 checkpoint evidence review is complete.
- `[ ]` Teardown evidence proves only exact disposable resources are removed.

Checked items above mean only that the supplied values were transcribed into
this draft. They are not reviewer verification, approval, or a claim that
infrastructure or tests were run during this documentation pass.

## 10. Approval record

No approval statement or signature is recorded.

| Field | Value |
|---|---|
| Approver | `PENDING` |
| Role | `PENDING` |
| Decision | `PENDING — no approval granted` |
| Signed at UTC | `PENDING` |
| Signature/reference | `PENDING` |

An authorized reviewer must provide an explicit statement bound to the full
candidate SHA, exact selected scope, start time, expiry time, and exclusions.
This draft cannot provide that statement on the reviewer's behalf.

## 11. Final validation gate

Before changing the status from `DRAFT — NOT GRANTED`, all of the following
must be true:

- every `PENDING` or `DEFERRED` field is resolved or explicitly excluded with
  a reviewer-approved reason;
- the exact candidate and supplied hashes are independently verified;
- the reviewer selects an exact local synthetic scope;
- all named owners and reviewers, independence disclosures, expiry, and review
  times are recorded;
- the approved 2026-08-10 waitlist policy is referenced without being copied,
  broadened, or reopened;
- every required Task 11 checkpoint and evidence review is complete;
- no production, hosted, cloud, external-effect, PHI, credential, clinical, or
  production-import authority is introduced; and
- the final approval is explicit, signed, exact-candidate-bound, and unexpired.

**Final status:** `DRAFT — NOT GRANTED`

**Evidence directory:** `PENDING — reviewer/evidence owner to record`

> **DRAFT — NOT AN APPROVAL.** Recording an implementation candidate and
> existing contract baselines does not authorize any action.
