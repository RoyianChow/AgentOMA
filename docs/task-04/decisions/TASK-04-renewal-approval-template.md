# Task 04 Synthetic Scope Renewal — Approval Template

> **APPROVAL.** Use this file to continue implementation,
> run migrations, start a database, create evidence, merge code, or access any
> production system. Replace every bracketed placeholder and record explicit
> reviewer decisions before relying on this document.

**Task:** Task 04 — Booking and Waitlist Synthetic Prototype  
**Decision version:** `v2
**Decision date:** `[2026-08-10]`  
**Decision status:** `GRANTED`  
**Parent records:**

- `docs/task-04/decisions/synthetic-sandbox-scope-approval-2026-08-02.md`
- `docs/task-04/decisions/synthetic-booking-management-and-service-catalog-approval-2026-08-04.md`

This record supersedes the parent records when it is explicitly signed,
versioned, exact-scope bound, and unexpired. It authorizes production
use, hosted preview, production imports, or external effects.

## 1. Exact candidate binding

The approval applies only to the candidate below. use a dirty worktree,
short SHA, moving branch, or later commit.

| Field | Value to complete |
|---|---|
| Full candidate commit SHA | `[40-character SHA]` |
| Branch/ref at capture | `[branch and ref]` |
| Worktree clean at capture | `[YES — attach command output / evidence path]` |
| Candidate captured at UTC | `[YYYY-MM-DDTHH:mm:ssZ]` |
| Sandbox source hash | `[SHA-256 or repository evidence path]` |
| Sandbox migration hash | `[SHA-256 of exact migration bytes, or NOT APPLICABLE]` |
| Docker/compose configuration hash | `[SHA-256 or evidence path]` |
| Approval artifact path | `[repository path]` |

The candidate must be frozen before approval. Any source, migration, fixture,
dependency, Docker, configuration, or script change creates a new candidate
and invalidates this approval.

## 2. Decision requested

Select exactly one and delete the other:

- `[ ] APPROVED_TO_IMPLEMENT_SYNTHETIC`
- `[ ] NOT GRANTED`

If approved, the authorization is limited to the exact candidate and scope in
this record. It is not a production-readiness, clinical, legal, privacy,
professional, G2, G3, G1-L, or G4 approval.

## 3. Capability scope

The approvers explicitly authorize the following **local synthetic-only** work:

- `[ ]` Synthetic patient, caregiver/delegate, pharmacist, and contact fixtures.
- `[ ]` Loopback-only Docker PostgreSQL 16 and sandbox-owned schema/migrations.
- `[ ]` Synthetic audit records and transactional outbox records.
- `[ ]` Bounded retention, expiry, cleanup, teardown, and kill-switch workers.
- `[ ]` Docker configuration, dependencies, and sandbox scripts.
- `[ ]` Public availability and service catalog.
- `[ ]` Booking creation, retrieval, confirmation, cancellation, and rescheduling.
- `[ ]` Waitlist join, leave, offer, accept, decline, withdraw, expiry, and promotion.
- `[ ]` Server-owned session-bound booking capabilities.
- `[ ]` Short-lived lineage token used only for server-side idempotency.
- `[ ]` Single-use bootstrap credential exchange, if approved in Section 5.
- `[ ]` Real-PostgreSQL transaction, constraint, idempotency, and concurrency tests.
- `[ ]` Pharmacist queue projection and synthetic UI evidence.

Unselected items are not authorized. No scope may be inferred from an earlier
record, existing code, a developer request, or a passing test.

## 4. Non-negotiable exclusions

The following remain prohibited even if this renewal is granted:

- production data, PHI, production-derived or de-identified fixtures;
- production credentials, pharmacist accounts, TOTP seeds, cookies, or sessions;
- Supabase, cloud databases, production storage, or production migrations;
- production-module imports without a separate exact G3 decision;
- hosted preview or non-loopback access without a separate G2 decision;
- email, SMS, push, webhook, calendar, payment, courier, vendor, model, HNS,
  FHIR, dispensing, claim, or other external effects;
- symptoms, diagnoses, health numbers, medications, clinical narratives, or
  reason-for-visit data in the booking workflow;
- client-selected pharmacy, tenant, actor, subject, role, capacity, or
  authorization state;
- PHI, contact details, tokens, credentials, or identifiers in URLs, browser
  storage, analytics, logs, cache entries, or evidence artifacts;
- any implication that a booking is a clinical assessment, prescription,
  claim, payment, eligibility decision, or completed professional service.

## 5. Explicit policy decisions

### 5.1 Reusable booking capability

Decision: `[APPROVED / NOT APPROVED / DEFERRED]`

If approved, the capability contains exactly:

- `booking:view`
- `booking:reschedule`
- `booking:cancel`

It must be server-owned, session-bound, bound to actor, subject, pharmacy,
booking lineage, sandbox instance, lifecycle revision, and expiry; revocation
and state/capacity checks are revalidated server-side for every action.

### 5.2 Synthetic delegation fixtures

Decision: `[APPROVED / NOT APPROVED / DEFERRED]`

Approved fixture cases, if any: `[active, expired, revoked, wrong-subject,
wrong-scope — confirm or amend]`.

No production delegation table or patient identity integration is authorized by
this record.

### 5.3 Bootstrap credential exchange

Decision: `[APPROVED / NOT APPROVED / DEFERRED]`

If approved, record all of the following:

- source-less, single-use bootstrap credential: `[YES/NO]`;
- allowed exchange purpose: `[exact purpose]`;
- actor/subject/pharmacy binding: `[exact binding]`;
- sandbox instance/lifecycle/approval binding: `[exact binding]`;
- expiry: `[duration or timestamp]`;
- consumption and replay behaviour: `[exact rule]`;
- minimized audit evidence: `[safe event/reason codes only]`;
- external delivery: `NOT AUTHORIZED`.

### 5.4 Rescheduling

Decision: `[APPROVED / NOT APPROVED / DEFERRED]`

Record the exact policy for:

- eligible source booking states: `[decision]`;
- target-slot selection and capacity reservation: `[decision]`;
- original booking state: `[decision]`;
- predecessor/successor relationship: `[decision]`;
- capability and idempotency behaviour: `[decision]`;
- audit events: `[safe event types/reason codes]`;
- outbox events: `[safe event types/reason codes]`;
- rollback if any write fails: `[must be atomic or state why not]`.

### 5.5 Cancellation

Decision: `[APPROVED / NOT APPROVED / DEFERRED]`

Record the exact policy for:

- eligible source booking states: `[decision]`;
- who may cancel: `[capability/role decision]`;
- hold/capacity release: `[decision]`;
- idempotent repeat cancellation: `[decision]`;
- audit and outbox evidence: `[safe event types/reason codes]`;
- rollback if any write fails: `[decision]`.

### 5.6 Waitlist and promotion

Decision: `APPROVED — POLICY SUB-DECISION ONLY`

The complete policy is recorded once in
[`task-04-waitlist-promotion-policy-approval-2026-08-10.md`](task-04-waitlist-promotion-policy-approval-2026-08-10.md),
approved by Royian Chowdhury for the local synthetic scope. That record is the
source for ordering, duplicate handling, transitions, trusted expiry, atomic
capacity holds, race handling, worker bounds, kill-switch behaviour, and safe
event codes. Do not copy the policy here; attach or reference that decision
record when this renewal is finalized.

This sub-decision does not authorize implementation. The full renewal must
still select the scope, bind an exact candidate, name reviewers, and set future
expiry and Task 11 review timestamps.

### 5.7 Public service catalog

Decision: `[APPROVED / NOT APPROVED / DEFERRED]`

If approved, confirm: active labels only; supported modalities; opaque
non-sequential references; fixed server ordering; bounded response; no-store
response; generic safe errors; rate/enumeration controls; and independent
availability lookup. A service with no available times remains visible.

## 6. Owners and reviewers

| Role | Named person | Independent of implementer? | Decision |
|---|---|---:|---|
| Product lead | `[name]` | `[YES/NO]` | `[APPROVED / NOT APPROVED]` |
| Accountable capability owner | `[name]` | `[YES/NO]` | `[ACCEPTED / NOT ACCEPTED]` |
| Backup capability owner | `[name]` | `[YES/NO]` | `[ACCEPTED / NOT ACCEPTED]` |
| Security/privacy reviewer | `[name]` | `[YES/NO]` | `[APPROVED / NOT APPROVED]` |
| Operations/SRE reviewer | `[name]` | `[YES/NO]` | `[APPROVED / NOT APPROVED]` |
| Quality/test reviewer | `[name]` | `[YES/NO]` | `[APPROVED / NOT APPROVED]` |
| Accessibility reviewer | `[name]` | `[YES/NO]` | `[APPROVED / NOT APPROVED]` |
| Task 11 Checkpoint reviewer | `[name]` | `[YES/NO]` | `[APPROVED_TO_IMPLEMENT_SYNTHETIC / NOT APPROVED]` |

If one person holds multiple roles, disclose the consolidation. Consolidated
roles do not count as independent review or independent backup coverage.

## 7. Expiry and review

| Field | Value to complete |
|---|---|
| Experimental expiry UTC | `[YYYY-MM-DDTHH:mm:ssZ]` |
| Task 11 review due UTC | `[YYYY-MM-DDTHH:mm:ssZ]` |
| Kill-switch operator | `[name]` |
| Teardown owner | `[name]` |
| Renewal required before | `[timestamp or condition]` |

After expiry, all implementation and runtime paths must fail closed. Expiry
cannot be extended by editing configuration, a comment, or this template.

## 8. Required evidence before synthetic PASS

- `[ ]` Clean candidate and exact approval hashes recorded.
- `[ ]` Fresh loopback-only Docker environment verified.
- `[ ]` From-zero schema/migration replay passes.
- `[ ]` Capacity, hold, expiry, cancellation, rescheduling, and promotion
  concurrency tests pass against real PostgreSQL.
- `[ ]` Idempotency and replay tests pass.
- `[ ]` Audit and outbox writes are atomic with domain writes.
- `[ ]` Stale lifecycle, wrong actor, wrong subject, wrong scope, expired,
  revoked, and unknown-state actions fail closed.
- `[ ]` No external transport is reachable.
- `[ ]` No PHI, credentials, payloads, or unsafe identifiers appear in logs,
  URLs, storage, browser state, bundles, or evidence.
- `[ ]` Accessibility and responsive evidence is captured.
- `[ ]` Exact Task 11 evidence review is complete.
- `[ ]` Teardown removes only the exact disposable resources.

## 9. Approval statement

> I, `[approver name]`, acting as `[role]`, approve / do not approve
> (`[choose one]`) the exact Task 04 synthetic scope described in this record
> for candidate `[full SHA]`, from `[start UTC]` through `[expiry UTC]`.
> This decision authorizes only the selected local synthetic actions. It does
> not authorize production data, PHI, production credentials, cloud databases,
> hosted preview, production imports, external integrations, production
> migrations, or promotion. Unknown, expired, contradictory, or out-of-scope
> conditions must fail closed.

**Approver:** `[full name]`  
**Role:** `[role]`  
**Decision:** `[APPROVED_TO_IMPLEMENT_SYNTHETIC / NOT GRANTED]`  
**Signed at UTC:** `[YYYY-MM-DDTHH:mm:ssZ]`  
**Signature/reference:** `[recorded approval reference]`

## 10. Final validation

Before changing `Decision status` from `DRAFT — NOT GRANTED`, confirm:

- every bracketed placeholder is completed or explicitly marked
  `NOT APPLICABLE` with a reason;
- the candidate worktree is clean and the full SHA is recorded;
- the expiry and review timestamps are in the future at signing time;
- unresolved policies are explicitly deferred rather than guessed; the
  waitlist policy is resolved by the referenced sub-decision;
- required independent reviews are present or clearly marked blocked;
- the approval is committed separately from implementation where practical;
- no production, hosted, external, PHI, or credential authority was granted.

**Final status:** `[DRAFT — NOT GRANTED / APPROVED_TO_IMPLEMENT_SYNTHETIC]`  
**Evidence directory:** `[docs/task-04/evidence/... ]`

> **DRAFT — NOT AN APPROVAL.** This template does not authorize implementation
> until completed, explicitly approved, committed, and bound to an unexpired
> exact candidate.
