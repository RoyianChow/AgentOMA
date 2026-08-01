# Task 04 — Current-State and Gap Analysis

**Status:** In progress
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Database-extension approval:** Pending

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

The working tree was clean before Task 04 work began. Work is isolated on the
`task-04-booking-waitlist` branch.

## 3. Current implementation state

### Production AgentOMA application

The maintained project overview does not list a booking or waitlist route,
service, domain model, or database schema as an implemented production
capability.

No production booking implementation will be added or modified under this task.

### Task 01 synthetic sandbox

The approved synthetic workspace exists at:

`apps/experiment-sandbox/`

It currently provides:

- A separate Next.js application.
- Deterministic synthetic fixtures.
- A server-owned synthetic reviewer identity.
- Local lifecycle and kill-switch controls.
- Denied production adapters and network access.
- Security headers.
- Production-import and browser-storage boundary tests.
- Isolated TypeScript, lint, Vitest, and architecture checks.

No Task 04-specific routes, components, fixtures, services, or tests were found
during inspection of the sandbox source tree.

### Persistence and database state

The currently approved Task 01 sandbox has no database or object storage.

Its architecture tests currently prohibit imports involving PostgreSQL,
Drizzle ORM, Supabase, and other production-oriented persistence packages.

Task 04 requires real PostgreSQL concurrency testing for capacity,
idempotency, cancellation, rescheduling, and waitlist promotion. Approval has
therefore been requested to add a separate loopback-only Docker PostgreSQL
database using synthetic data.

No database dependency, schema, migration, Docker configuration, or persistence
code will be added until that approval is recorded.

## 4. Identified gaps

| Area | Current state | Required Task 04 state | Status |
|---|---|---|---|
| Public availability | Not implemented | Synthetic slot discovery with coarse availability | Gap |
| Booking workflow | Not implemented | Create, retrieve, cancel, and reschedule | Gap |
| Waitlist workflow | Not implemented | Join, leave, offer, accept, and expire | Gap |
| Domain model | Not defined | Booking, slot, capacity, waitlist, token, event, and audit concepts | Gap |
| State machines | Not defined | Explicit booking and waitlist transitions | Gap |
| Database capacity | No sandbox database | PostgreSQL-enforced capacity and transactions | Blocked pending approval |
| Idempotency | Not implemented | Retry-safe commands and stored outcomes | Gap |
| Concurrency tests | Not implemented | Independent PostgreSQL connections and race barriers | Blocked pending approval |
| Zod boundaries | Not implemented | Strict schemas for every command and response | Gap |
| Delegated access | Not implemented | Synthetic grant contract; production integration remains blocked by Task 05 | Gap |
| Domain events | Not implemented | Stubbed transactional outbox with no external delivery | Gap |
| Pharmacist queue | Not implemented | Server-rendered minimum-necessary synthetic queue | Gap |
| Accessibility | Shared shell only | Booking-specific keyboard, screen-reader, mobile, zoom, and reflow evidence | Gap |
| Timezone and DST | Not implemented | UTC storage and explicit Ontario timezone/DST handling | Gap |
| Abuse prevention | Not implemented | Enumeration, flooding, replay, and rate-limit design | Gap |
| Ontario guidance mapping | Not started | Current first-party booking-guidance mapping | Gap |
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

### Database-extension approval

Approval is pending to extend the Task 01 sandbox with a loopback-only Docker
PostgreSQL database for Task 04.

Until approval is granted:

- No database dependencies will be installed.
- No schema or migration will be created.
- No PostgreSQL or Drizzle imports will be added.
- No database-backed workflow implementation will begin.

### Task 11 review

The bounded implementation and test plan must be prepared for Task 11
checkpoint review before the affected implementation is treated as approved.

### Production dependencies

Production booking remains blocked by:

- Task 02 production readiness.
- Task 05 patient identity and delegated-access decisions.
- Task 07 consented communications.
- Task 11 quality, security, privacy, accessibility, and release review.

These dependencies do not prevent independent synthetic design work.

## 7. Safe work permitted while approval is pending

The following work may proceed without adding persistence:

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
5. Record the database-extension approval or blocker.
6. Begin database-backed implementation only after the required approval.