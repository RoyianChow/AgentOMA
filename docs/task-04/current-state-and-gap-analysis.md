# Task 04 — Current-State and Gap Analysis

**Status:** Partial synthetic runtime; `BLOCKED_MISSING_RENEWAL_APPROVAL`
**Observed branch:** `task7`
**Observed candidate:** `58fee60035988300909a158f3c91501faca89fa7`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Synthetic scope:** The 2026-08-02 implementation scope expired on 2026-08-05
**Task 11 Checkpoint 1:** historical approval recorded; current renewal and
exact-candidate independent review are incomplete
**Risk/autonomy:** `R3`; `A3_BOUNDED_AUTOMATION`
**Current renewal:** not granted
**Governance roles:** Accountable owner, backup owner, and Operations/SRE
reviewer: Royian Chowdhury (consolidated, non-independent)

The approval is limited to the exact local synthetic scope in
[`decisions/synthetic-sandbox-scope-approval-2026-08-02.md`](decisions/synthetic-sandbox-scope-approval-2026-08-02.md).
Production, G2 hosted preview, G3 production imports, live or production-derived
data, cloud databases, external effects, and production deployment remain
prohibited. The accountable owner, backup owner, and Operations/SRE reviewer
are Royian Chowdhury; these are consolidated, non-independent roles. The
approval expired on 2026-08-05. The waitlist policy sub-decision recorded on
2026-08-10 does not renew implementation. No further runtime, migration,
Docker, evidence-promotion, or merge work is authorized until the completed v3
renewal and independent reviews are committed.

## Canonical planning references

Shared request/response, queue, enum, synthetic-contact, event-envelope, error,
and permission contracts are canonical in
[`api-and-zod-contracts.md`](api-and-zod-contracts.md). State transitions are
canonical in [`state-machines.md`](state-machines.md), and the single
control-to-evidence matrix is section 11.1 of
[`pre-implementation-test-plan.md`](pre-implementation-test-plan.md). The
append-only approval record controls governance if any planning text conflicts.

## 1. Scope

Task 04 will create a synthetic online-booking and waitlist prototype for:

- Public appointment-slot discovery.
- Appointment requests.
- Cancellation and rescheduling.
- Waitlist joining and cancellation.
- Expiring waitlist offers.
- A minimum-necessary pharmacist booking queue.
- Safe recovery from stale slots, expired links, retries, and interrupted operations.

The workflow is administrative only. It must not collect clinical narratives,
health-card numbers, medications, diagnoses, symptoms, or reasons for seeking
care.

## 2. Repository discovery completed

The following repository materials were reviewed:

- `AGENTS.md`
- `docs/PROJECT_OVERVIEW.md`
- `docs/tasks/autonomous-pharmacy/README.md`
- `docs/tasks/autonomous-pharmacy/TASK-04-booking-and-waitlist.md`
- `docs/task-01/README.md`
- `docs/task-01/runbook.md`
- `docs/task-01/experimental-sandbox-design.md`
- `docs/OPEN_QUESTIONS.md`
- `docs/NEXT_STEPS.md`
- `apps/experiment-sandbox/package.json`
- Existing sandbox routes, fixtures, identity helpers, lifecycle controls,
  architecture tests, and security tests

Task 04 planning is isolated on the `task-04-booking-waitlist` branch. No claim
about a clean working tree is a design control; the current tree must be
verified with `git status --short` whenever evidence is captured.

## 3. Current implementation state

### Production AgentOMA application

The maintained project overview does not list a booking or waitlist route,
service, domain model, or database schema as an implemented production
capability.

No production booking implementation will be added or modified under this task.

### Task 01 synthetic sandbox

The approved synthetic workspace exists at:

`apps/experiment-sandbox/`

It currently provides the Task 01 controls plus a partial Task 04 runtime:

- A separate Next.js application.
- Deterministic synthetic fixtures.
- A server-owned synthetic reviewer identity.
- Local lifecycle and kill-switch controls.
- Denied production adapters and network access.
- Security headers.
- Production-import and browser-storage boundary tests.
- Isolated TypeScript, lint, Vitest, and architecture checks.
- A loopback-only PostgreSQL schema with capacity-hold constraints.
- Public availability and service-catalog services.
- Booking create, retrieve, confirm, and expiry operations.
- Transactional synthetic audit/outbox records.
- Synthetic delegation fixtures and server-owned authorization context.
- A server-rendered pharmacist queue backend and UI.
- Idempotency, public-reference, and failure-path tests for implemented slices.

The public `/book` UI, cancellation, rescheduling, waitlist runtime, promotion
worker, and their complete race/accessibility/recovery evidence are not present.

### Persistence and database state

The original Task 01 sandbox baseline has no database or object storage.

Task 04 requires real PostgreSQL concurrency testing for capacity,
idempotency, cancellation, rescheduling, and waitlist promotion. Approval has
now been granted to add a separate loopback-only Docker PostgreSQL database,
schema, migrations, lifecycle controls, and deterministic synthetic fixtures
inside `apps/experiment-sandbox/`. That approval does not permit a cloud
database, production migration, production import, or live data.

The future synthetic implementation must load its single pharmacy scope from
the sandbox-owned server configuration key `TASK04_SANDBOX_PHARMACY_ID`.
The sandbox loader validates the exact `SYNTH-PHARMACY-[A-Z0-9_-]+` form and
exposes it to Task 04 domain services as canonical server-only `PHARMACY_ID`.
It must not inherit the production application’s pharmacy identifier or accept
scope from a browser, URL, session claim, credential, QR code, or request.
Missing or malformed configuration fails startup closed. Task 04 introduces no
pharmacy selector, tenant selector, or multi-pharmacy runtime. Cross-pharmacy
records may exist only as database-level negative-test fixtures and must never
select runtime scope.

## 4. Identified gaps

| Area | Current state | Required Task 04 state | Status |
|---|---|---|---|
| Public availability | Implemented and tested in the synthetic sandbox | Synthetic slot discovery with coarse availability | Partial PASS; final evidence pending |
| Public availability cache | Server cache implementation exists | Short-lived server projection cache with no-store HTTP response and transactional revalidation | Implemented; final evidence pending |
| Booking workflow | Create, retrieve, confirm, and expiry exist; public `/book`, cancel, and reschedule do not | Create, retrieve, cancel, and reschedule | Partial; renewal blocked |
| Waitlist workflow | Policy approved; runtime absent | Join, leave, offer, accept, and expire | Blocked on renewal |
| Domain model | Booking, slot, capacity, hold, credential, event, and audit schema exists; waitlist execution remains incomplete | Complete domain model | Partial |
| State machines | Contracts documented; implemented booking subset only | Complete transition contracts | Partial |
| Database capacity | Loopback PostgreSQL constraints and transaction helpers exist | PostgreSQL-enforced capacity and transactions | Implemented for current booking subset; broader race evidence pending |
| Idempotency | Implemented for current booking commands | Retry-safe commands and stored outcomes | Partial; cancel/reschedule/waitlist absent |
| Concurrency tests | PostgreSQL tests exist for implemented booking slices | Independent PostgreSQL connections and race barriers | Partial; waitlist and remaining races absent |
| Zod boundaries | Availability, catalog, booking, queue, and safe-error contracts exist | Strict schemas for every command and response | Partial |
| Delegated access | Deterministic synthetic grant fixtures exist | Synthetic grants; production integration remains blocked by Task 05 | Synthetic fixture slice implemented |
| Domain events | Synthetic transactional audit/outbox infrastructure exists; external dispatch remains stubbed | Transactional outbox with `dispatch_status: not_dispatched` and no delivery | Partial |
| Pharmacist queue | Server-rendered synthetic queue backend and UI exist | Server-rendered minimum-necessary synthetic queue | Implemented; final evidence pending |
| Accessibility | Draft evidence plan documented; runtime evidence not produced | Keyboard, screen-reader, mobile, zoom, reflow, and contrast evidence | Evidence pending |
| Timezone and DST | Draft documented; runtime not implemented | UTC storage and explicit Ontario timezone/DST handling | Implementation pending |
| Abuse prevention | Draft documented; review/correction in progress; runtime not implemented | Enumeration, flooding, replay, and rate-limit controls | Implementation pending |
| Ontario guidance mapping | Draft documented; verification in progress | Current first-party booking-guidance mapping | Human verification pending |
| Production integration | Prohibited | Documented future handoff only | Intentionally blocked |

## 5. Existing boundaries that must remain unchanged

Task 04 must not:

- Import production application modules.
- Connect to production databases, authentication, storage, or integrations.
- Use real or production-derived patient data.
- Add production routes or mutations.
- Change production migrations.
- Modify assessment, triage, billing, claims, audit, or clinical-reference logic.
- Send email, SMS, push, webhook, or calendar notifications.
- Accept tenant, pharmacy, patient, caregiver, role, capacity, or authorization
  values from untrusted client input.
- Store booking or contact information in URLs, browser storage, analytics, or
  logs.
- Treat a displayed slot as confirmed before the server commits the booking.
- Treat booking as a clinical assessment or eligibility decision.

## 6. Current blockers and required decisions

### Synthetic implementation approval

The exact synthetic database and workflow scope was approved on 2026-08-02.
Implementation must stay inside the Task 01 local sandbox, use deterministic
synthetic data, derive server-only `PHARMACY_ID` exclusively from
`TASK04_SANDBOX_PHARMACY_ID`, and fail closed after the 2026-08-05 expiry
unless the approval is extended.

The later registration block in the approval record resolves the fields that
its earlier narrative described as unresolved. Planning uses the later values:
`APPROVED_TO_IMPLEMENT_SYNTHETIC`, `R3`, `A3_BOUNDED_AUTOMATION`, Royian
Chowdhury for the three named owner/reviewer roles, and 2026-08-05 for both
expiry and review due. The decision file remains append-only.

### Task 11 review

Task 11 Checkpoint 1 is `APPROVED_TO_IMPLEMENT_SYNTHETIC`. Checkpoint 2 evidence
review is not granted and remains required before any promotion.

### Production dependencies

Production booking remains blocked by:

- Task 02 production readiness.
- Task 05 patient identity and delegated-access decisions.
- Task 07 consented communications.
- Task 11 quality, security, privacy, accessibility, and release review.

These dependencies do not prevent independent synthetic design work.

## 7. Work permitted by the synthetic approval

The following work may proceed within the exact approved synthetic boundary:

- Domain-model design.
- Booking and waitlist state-transition tables.
- Zod request and response contracts.
- Idempotency and safe-error design.
- Synthetic fixture definitions.
- Database and transaction design documentation.
- Concurrency test planning.
- Privacy and abuse-prevention design.
- Accessibility, timezone, and localization planning.
- Ontario online-booking guidance mapping.
- Task 11-compatible implementation and test plan.

## 8. Recommended next steps

1. Define the Task 04 domain model.
2. Define booking and waitlist state machines.
3. Define Zod command and response contracts.
4. Prepare the concurrency, idempotency, privacy, and accessibility test plan.
5. Implement only inside the approved loopback-only sandbox after rechecking
   approval expiry and lifecycle gates.
6. Produce the planned accessibility/timezone/localization evidence and the
   Task 11 Checkpoint 2 evidence package.

## 9. Planned future deliverables

| Deliverable | Owner | Checkpoint | Prerequisites | Current state |
|---|---|---|---|---|
| `docs/task-04/accessibility-timezone-localization-evidence.md` | Task 04 capability owner (Royian Chowdhury) | Task 11 Checkpoint 2 | Runnable synthetic UI, approved copy, automated and manual accessibility results | Planned |
| Production-integration handoff | Task 04 capability owner with Tasks 02, 05, 07, and 11 owners | Production handoff; not authorized by this approval | Separate production approvals, independent role coverage where required, production identity/communication/retention decisions, G2/G3 as applicable | Planned and blocked |
| Final Task 04 status/update | Task 04 capability owner (Royian Chowdhury) | Task 11 Checkpoint 2 | Source commit, verification artifacts, evidence manifest, findings, expiry review | Planned |
