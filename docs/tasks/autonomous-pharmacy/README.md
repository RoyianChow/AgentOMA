# Autonomous pharmacy developer tasks

**Program status:** research and staged implementation

**Source roadmap:** [`../../AUTONOMOUS_PHARMACY_ROADMAP.md`](../../AUTONOMOUS_PHARMACY_ROADMAP.md)

**Experiment boundary:** [`../../EXPERIMENTAL_SANDBOX.md`](../../EXPERIMENTAL_SANDBOX.md)

These files divide the roadmap into independently assignable developer streams.
They are implementation briefs, not authorization to provide patient care or
bypass regulation.

## Mandatory reading

Before taking a task, read:

1. [`../../../AGENTS.md`](../../../AGENTS.md)
2. [`../../PROJECT_OVERVIEW.md`](../../PROJECT_OVERVIEW.md)
3. [`../../COMPLIANCE.md`](../../COMPLIANCE.md) when the task touches PHI,
   clinical care, virtual care, records, or billing
4. The roadmap and sandbox policy linked above

Do not copy clinical rules, billing data, or repository invariants into a task.
Follow their canonical sources.

## Execution waves

| Wave | Tasks | May begin | Production condition |
|---|---|---|---|
| 0 — foundations | 01, 02, 11 | Now | Task 02 P0 evidence complete; Task 11 release controls active |
| 1 — experience prototypes | 03, 04, 05 | In the synthetic sandbox | Privacy/identity design approved before PHI or production persistence |
| 2 — connected operations | 06, 07, 08, 09 | Interface design and stubs only | Each external vendor/regulatory/privacy gate approved separately |
| 3 — bounded intelligence | 10 | Synthetic evaluation only | PIA/TRA, model governance, shadow-mode evidence, pharmacist approval |

## Task index

| Task | Suggested owner | Scope |
|---|---|---|
| [`TASK-01-sandbox-enforcement.md`](TASK-01-sandbox-enforcement.md) | Platform/security developer | Enforce synthetic-only experiment isolation |
| [`TASK-02-p0-production-readiness.md`](TASK-02-p0-production-readiness.md) | Senior backend/database developer | Close the current P0 deployment and retrieval gap |
| [`TASK-03-command-centre-dashboard.md`](TASK-03-command-centre-dashboard.md) | Frontend/product developer | Pharmacist command-centre redesign |
| [`TASK-04-booking-and-waitlist.md`](TASK-04-booking-and-waitlist.md) | Full-stack developer | Online booking, waitlist, and cancellation workflow |
| [`TASK-05-patient-portal.md`](TASK-05-patient-portal.md) | Identity/full-stack developer | Patient identity, portal, delegated access, records |
| [`TASK-06-virtual-care.md`](TASK-06-virtual-care.md) | Virtual-care integration developer | Secure pharmacist-led virtual visits |
| [`TASK-07-messaging-and-reminders.md`](TASK-07-messaging-and-reminders.md) | Backend/communications developer | Consented secure messaging and reminders |
| [`TASK-08-fulfilment-and-delivery.md`](TASK-08-fulfilment-and-delivery.md) | Pharmacy-operations developer | Prescription request, fulfilment, pickup, delivery |
| [`TASK-09-interoperability.md`](TASK-09-interoperability.md) | Integration developer | Authenticated read-only FHIR and system handoff |
| [`TASK-10-bounded-ai.md`](TASK-10-bounded-ai.md) | Applied-AI developer | Synthetic evaluation and pharmacist-reviewed assistance |
| [`TASK-11-quality-security-release.md`](TASK-11-quality-security-release.md) | QA/security engineer | CI, privacy, accessibility, threat and release gates |

## Shared engineering contract

- Work in logical commits and do not mix task scopes.
- Use npm, strict TypeScript, Zod at every boundary, Drizzle, and file-based
  migrations only. `db:push` is banned.
- `src/proxy.ts` is navigation UX only. Every mutation re-authorizes on the
  server.
- No PHI in logs, URLs, browser storage, unnecessary client props, analytics,
  test snapshots, or non-Canadian services.
- External effects use idempotency, acknowledgement, audit, timeout, retry, and
  reconciliation states. Never silently default.
- Experimental work uses synthetic data and cannot connect to production.
- Do not touch approved clinical content, reference billing data,
  `deriveClaimDraft`, migrations, or audit integrity without explicit lead
  sign-off.

## Shared definition of done

- Acceptance criteria in the assigned task are demonstrated.
- `tsc --noEmit`, ESLint, and relevant Vitest suites pass.
- Database work passes fresh-Docker migration and real-Postgres tests.
- Authorization, tenant pinning, failure atomicity, audit, retention, and
  supersession are tested where applicable.
- Mobile use is tested at 375px; keyboard, screen-reader, reduced-motion, and
  visible-focus behaviour are recorded.
- No production secrets or real patient/pharmacist records are used.
- Documentation and the task's evidence section are updated in the same PR.

## Global stop conditions

Stop and escalate if the work needs a new clinical rule, billing value,
professional-scope interpretation, production migration without sign-off,
external system specification that has not been supplied, or any weakening of
authentication, audit, retention, red-flag, zero-PHI, or single-pharmacy
controls.
