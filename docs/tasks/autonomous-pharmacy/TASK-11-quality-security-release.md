# Task 11 — cross-cutting quality, security, and release controls

**Owner profile:** QA/security engineer

**Priority:** P0 foundation, then continuous

**Status:** ready

## Goal

Create one evidence-producing release system for every roadmap capability so a
feature cannot move from synthetic experiment to production by assumption.

## Scope

- Add CI for TypeScript, ESLint, pure tests, and fresh-Docker migration/database
  suites.
- Add secret scanning, dependency review, and checks for raw `process.env`, PHI
  logging, browser storage, and forbidden integration imports.
- Define a reusable threat-model and privacy/data-flow template.
- Define test evidence for authorization, tenant pinning, audit, retention,
  idempotency, concurrency, rollback, downtime, and reconciliation.
- Establish accessibility checks for WCAG-aligned keyboard, screen-reader,
  contrast, zoom, reduced-motion, and 375px use.
- Define operational SLOs and payload-free observability for auth,
  integrations, queues, messages, and automation.
- Add a release register containing owner, capability autonomy level, approvals,
  PIA/TRA status, test evidence, rollout cohort, kill switch, and review date.
- Build incident, privacy-breach, vendor-outage, and automation-disable drills.

## Out of scope

- Deciding clinical accuracy, professional scope, or legal compliance.
- Capturing request bodies, clinical text, identifiers, or message content in
  test/observability evidence.

## Deliverables

1. Required CI workflow and branch-gate documentation.
2. Security/privacy test helpers and forbidden-pattern checks.
3. Release-evidence template and capability register.
4. Accessibility test matrix and manual evidence format.
5. Incident/downtime/kill-switch runbooks.

## Acceptance criteria

- A PR cannot merge when required quality gates fail.
- Fresh migrations and constraint tests run against real local Postgres.
- No test output or CI artifact contains PHI or secrets.
- Every experimental capability has an owner, expiry, and kill switch.
- Every production candidate links to its approvals and evidence.
- Security and accessibility failures have named remediation owners and cannot
  be silently waived.

## Coordination

Review every other task's test plan before implementation and its evidence
before promotion. This task does not replace pharmacist, privacy, legal, or
product approval.
