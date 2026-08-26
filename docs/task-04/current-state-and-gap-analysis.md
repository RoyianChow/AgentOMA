# Task 04 - Current State and Gap Analysis

**Reconciled:** 2026-08-26

**Observed HEAD:** `02b0a5cf08a56714a2d175556557a49f8813b77f`

**Status:** `PARTIAL_IMPLEMENTATION_MERGED / BLOCKED_MISSING_RENEWAL_APPROVAL`
**Risk/autonomy:** `R3` / `A3_BOUNDED_AUTOMATION`
**Production authorization:** none

## Controlling decision state

The 2026-08-02 synthetic implementation approval expired on 2026-08-05. The
2026-08-10 waitlist policy is a policy decision only. The current
[`Task 04 v3 renewal record`](decisions/task-04-synthetic-scope-renewal-v3-2026-08-19.md)
is `DRAFT - NOT GRANTED`; its scope, owners, future dates, independent reviews,
and Task 11 checkpoint are incomplete.

Task 04 code has nevertheless been merged into the isolated sandbox. Presence
in `main`, passing tests, or a policy approval does not authorize runtime,
migrations, Docker, evidence promotion, hosted preview, external effects, or
production use. The fail-closed lifecycle must remain active.

## Implemented in the synthetic sandbox

- Separate `apps/experiment-sandbox/` workspace and Task 01 boundaries.
- Loopback PostgreSQL schema and migration for synthetic booking, slots,
  capacity, holds, credentials, idempotency, audit, outbox, waitlist tables,
  preference snapshots, and lifecycle state.
- Server-owned pharmacy/context configuration and synthetic fixtures.
- Public service catalogue and availability projection.
- Booking create, retrieve, confirm, and expiry worker.
- Public opaque slot references and safe error registry.
- Database-backed idempotency and capacity-hold enforcement for implemented
  booking commands.
- Deterministic synthetic delegation fixtures.
- Server-rendered pharmacist queue and safe client projection.
- Public sandbox `/book` UI for catalogue selection, availability search,
  appointment selection, administrative acknowledgements, accessibility/
  language preferences, and booking creation.
- Unit/architecture/UI tests plus PostgreSQL tests for the previously
  implemented database slices.

The public booking UI derives synthetic contact and idempotency material on the
server, sends no clinical reason, and treats confirmed versus
`pending_confirmation` as distinct outcomes. It is an administrative
prototype, not a clinical intake or appointment guarantee.

## Not implemented or not proven

| Area | Current state |
|---|---|
| Cancellation command | Not implemented |
| Rescheduling command and predecessor/successor capability rotation | Not implemented |
| Bootstrap credential exchange | Deferred in the v3 draft |
| Waitlist join/leave/offer/accept/decline/withdraw/expiry commands | Schema/contracts exist; runtime not implemented |
| Promotion worker and 10-minute offer lifecycle | Policy exists; runtime not implemented |
| Cancellation/reschedule/waitlist concurrency evidence | Not produced |
| Abuse/rate-limit runtime | Design only |
| Timezone/DST evidence | Partial display formatting; complete evidence pending |
| Manual accessibility/mobile evidence | Pending |
| Recovery and exact teardown evidence | Pending |
| Exact-candidate Task 11 review | Pending |
| Production identity, communications, or integration | Prohibited and absent |

## Verification at the merged candidate

- `npm run sandbox:verify`: PASS - typecheck, lint, 40 files / 614
  non-Postgres tests, and sandbox boundary verification.
- `npm run sandbox:verify-evidence`: PASS for the committed evidence manifest.
- `npm run sandbox:verify-production`: PASS for the current technical
  invariance baseline.
- `npm run sandbox:build`: PASS as a build check; this does not authorize the
  expired Task 04 runtime.
- Task 04 real-PostgreSQL suite: NOT RUN in the 2026-08-19 merge review.

These results do not renew the expired authorization. Current Task 01 changes
also remain blocked from promotion pending independent Task 11 review.

## Required renewal package

Before any Task 04 runtime or additional implementation:

1. Freeze a clean exact candidate and independently verify source, migration,
   and Compose hashes.
2. Select each permitted capability, including lineage, reusable capability,
   bootstrap exchange, cancellation, rescheduling, waitlist, service catalog,
   workers, Docker and evidence operations.
3. Record accountable and backup owners, kill-switch/teardown operators,
   future start/expiry/review timestamps, and role-consolidation disclosures.
4. Obtain independent Security/Privacy, Operations/SRE, Quality/Test,
   Accessibility, and Task 11 decisions.
5. Preserve G2 as not requested and G3 as empty unless separately approved.
6. Commit the decision separately; any subsequent source/configuration change
   creates a new candidate.

## Boundaries that remain absolute

- Authored-synthetic data only; no real or production-derived identities.
- Loopback-only PostgreSQL; no Supabase, cloud database, production migration,
  production module import, or credential.
- No email, SMS, push, webhook, calendar, payment, vendor, model, HNS, FHIR,
  dispensing, claim, or other external effect.
- No symptoms, diagnoses, medications, health numbers, clinical narratives, or
  reason-for-visit fields.
- No client-selected actor, subject, pharmacy, capacity, time, lifecycle, or
  authorization state.
- No unsafe values in URLs, browser storage, logs, analytics, caches, bundles,
  or evidence.
- Booking state never implies assessment, prescription, eligibility, payment,
  claim, or professional completion.

## Next executable step

Complete and independently sign the v3 renewal. Until then, Task 04's allowed
work is read-only review, documentation correction, and preparation of the
approval/evidence package.
