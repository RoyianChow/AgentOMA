# Autonomous Pharmacy — Current Implementation Status

**Purpose:** Start here before working on Tasks 01–14. This is a verified
implementation handoff, not a task specification, approval, or production
release decision.

**Snapshot date:** 2026-08-10
**Observed branch:** `task7`
**Observed HEAD:** `58fee60035988300909a158f3c91501faca89fa7`
**Worktree at capture:** clean before the next-sprint documentation update
**Sprint plan:**
[`NEXT-SPRINT-PLAN-2026-08-10.md`](NEXT-SPRINT-PLAN-2026-08-10.md)

## Read before changing anything

1. [`AGENTS.md`](../../../AGENTS.md) — canonical repository rules.
2. [`PROJECT_OVERVIEW.md`](../../PROJECT_OVERVIEW.md) — maintained product map.
3. [`COMPLIANCE.md`](../../COMPLIANCE.md) — Ontario rule mapping.
4. [`OPEN_QUESTIONS.md`](../../OPEN_QUESTIONS.md) — unresolved human decisions.
5. [`NEXT_STEPS.md`](../../NEXT_STEPS.md) — P0 and release blockers.
6. [`NEXT-SPRINT-PLAN-2026-08-10.md`](NEXT-SPRINT-PLAN-2026-08-10.md) — the
   current sequencing checkpoint, not an approval.
7. The complete brief for the assigned task in this directory.

Task briefs describe requirements; they do not prove implementation or grant
production authorization. Use committed code, tests, evidence, and decision
records to establish status. If a brief, status document, and code disagree,
record the conflict and stop the affected protected workstream until the lead
resolves it.

## Release posture

AgentOMA is an authenticated, single-pharmacy Ontario minor-ailment pilot. It
is **not production-ready**. No autonomous-pharmacy task grants permission to
use production data, production credentials, live integrations, or real
recipients.

- Supabase Postgres is the primary store in `ca-central-1`.
- Drizzle file migrations are the only schema path. `db:push` is banned.
- Firebase is removed and must not return.
- `proxy.ts` is an optimistic UX gate only; server actions re-check session,
  role, pharmacy scope, and any required orientation gate.
- `/api/fhir` remains disabled with `403`; do not enable it without the Task 09
  approvals and reviewed ICD-10 mapping.
- Experimental code belongs in `apps/experiment-sandbox/`, not in the
  production application. The sandbox must use synthetic data, loopback-only
  resources, and fail closed when configuration or approval is missing.

## P0 and core product status

| Area | Status | What remains |
|---|---|---|
| P0-A clinical triage | **PASS** | Current `triage.ts` approval is recorded. Do not alter clinical content without new pharmacist review. |
| P0-B clinical record and consent | **PASS** | Version-2 structured record, consent, prescription, and PCP fields are implemented and tested. |
| P0-C eligibility/evidence | **IMPLEMENTED / BLOCKED** | Migration `0018` is not live. Predecessor upgrade/restart proof, S27 export semantics, independent Task 11 review, recovery, G1-L, live parity, and G4 remain. |
| P0-D virtual/LTC facts | **FACT CAPTURE COMPLETE / BILLING BLOCKED** | Virtual location, remote-demand reason, fee tier, and LTC facts exist. LTC billing remains parked pending the ODB Help Desk decision in `OPEN_QUESTIONS.md`. |
| Follow-up tracking | **PASS** | Required plans, due/overdue worklist, attempts, supersession, audit, retention, and export coverage are implemented through migration `0017`. |

## Autonomous task status

### Task 01 — Experimental sandbox

**Technical status: PASS for the local synthetic boundary.** The evidence
manifest records 17 applicable controls as PASS and SBX-14 as
`NOT_APPLICABLE` because G2 was not requested. G3 production-import allowlist
is empty. No hosted preview or production capability is authorized.

The [Task 01 README](../../task-01/README.md) is reconciled with the
[evidence manifest](../../task-01/evidence/evidence-manifest.json) and
[final report](../../task-01/evidence/final-report.md). Later sandbox changes
must produce evidence for their own exact candidate; they do not inherit PASS.

### Task 02 — P0 production readiness

**Status: BLOCKED — DO NOT PROMOTE.** The complete from-zero Docker suite and
pure suite have passed on the recorded candidate, but the predecessor-upgrade
and restart proof has not passed. The latest repository evidence includes
fail-closed runs for candidates `3a271a7d` and `4e479514`; they stopped before
migration or fixture writes with `LOOPBACK_TCP_DENIED`.

Remaining order:

1. Freeze a new clean candidate.
2. Obtain a new exact, expiring G1-D approval for that SHA.
3. Run the single approved predecessor/restart harness.
4. Resolve S27 canonical repeat-export and reconstruction semantics.
5. Obtain independent Task 11 review bound to the exact candidate and hashes.
6. Complete recovery proof and obtain G1-L.
7. Apply `0018` once with `npm run db:migrate`, never `db:push`.
8. Verify live catalog, grants, triggers, tenancy aggregates, and post-apply
   parity, then obtain independent G4.

### Task 03 — Command centre

**Status: NOT STARTED as a dedicated capability.** No Task 03 status/evidence
package or dedicated command-centre route/module exists. The production
pharmacist dashboard and the Task 04 synthetic pharmacist queue are not a
completed Task 03 command centre.

Remaining work is discovery, operational work-item contracts, synthetic
command-centre UI, server-only projections, action authorization,
accessibility evidence, failure-state tests, and Task 11 evidence. It must not
rank clinical urgency, diagnose, triage, establish billability, or submit
claims.

### Task 04 — Booking and waitlist

**Status: PARTIAL IMPLEMENTATION; CURRENT APPROVAL EXPIRED.** The synthetic
workspace contains more runtime than the older gap analysis records:

- loopback PostgreSQL schema and capacity-hold constraints;
- public availability and service-catalog endpoint;
- booking create, retrieve, and confirm operations;
- expiry worker;
- transactional outbox and synthetic audit contracts;
- synthetic delegation fixtures;
- pharmacist queue backend and UI;
- idempotency and authoritative server-context helpers.

The implementation is visible under `apps/experiment-sandbox/src/booking`,
`apps/experiment-sandbox/src/db`, and
`apps/experiment-sandbox/src/app/pharmacist-queue`.

Still missing or unproven:

- public `/book` workflow;
- booking cancellation runtime;
- booking rescheduling runtime;
- waitlist join/leave/offer/accept/decline/withdraw/expiry operations;
- promotion and capacity-race completion evidence;
- final capability/lineage/bootstrap-credential decisions and renewal metadata;
- accessibility, mobile, timezone/DST, abuse, and recovery evidence;
- verified Ontario booking-guidance mapping;
- final Task 04 evidence and Task 11 review.

The recorded synthetic scope expired on 2026-08-05. Do not continue or merge
new Task 04 implementation until a superseding, versioned approval records the
scope, expiry, review date, and remaining unresolved reschedule/cancellation
policies. The waitlist policy is recorded separately below. Production,
hosted preview, production imports, external messages, and cloud databases
remain prohibited.

The waitlist and promotion policy sub-decision is now recorded as approved for
the local synthetic scope in
[`task-04-waitlist-promotion-policy-approval-2026-08-10.md`](../../task-04/decisions/task-04-waitlist-promotion-policy-approval-2026-08-10.md).
That record resolves the policy values but does not extend the expired
implementation approval or authorize runtime changes.

#### Renewal checkpoint — 2026-08-10

The next planned step is renewal of the expired synthetic approval. The existing
records remain limited to 2026-08-05:

- `docs/task-04/decisions/synthetic-sandbox-scope-approval-2026-08-02.md`;
- `docs/task-04/decisions/synthetic-booking-management-and-service-catalog-approval-2026-08-04.md`.

No superseding renewal record was found. Current status is therefore
`BLOCKED_MISSING_RENEWAL_APPROVAL`. The old approvals must not be inferred to
extend themselves from the presence of code, a developer request, a passing
test, or a product discussion.

A new approval package must bind, at minimum:

1. the exact clean candidate commit and worktree state;
2. the precise local synthetic scope, including any booking capability,
   lineage-token, bootstrap-credential, cancellation, rescheduling, waitlist,
   and service-catalog changes;
3. accountable owner, backup owner, Operations/SRE reviewer, and any required
   independent reviewers;
4. an explicit experimental expiry timestamp and Task 11 review timestamp;
5. the remaining unresolved rescheduling decisions and renewal metadata,
   rather than silently choosing defaults; the waitlist policy is recorded in
   the separate decision above;
6. the continuing prohibitions on production data, credentials, cloud
   databases, hosted preview, production imports, and external effects; and
7. fail-closed lifecycle, teardown, audit, outbox, capacity, and concurrency
   evidence requirements.

Until that record exists, the only safe Task 04 work is read-only inspection,
documentation, test-plan maintenance, and preparation of a review package.
No Task 04 implementation, migration, Docker database run, evidence PASS, or
merge is authorized by this status file.

### Task 05 — Patient portal

**Status: NOT STARTED beyond existing pharmacist-side identity helpers and
governance exports.** No separate patient identity domain, patient session,
patient portal route, caregiver portal, or synthetic portal prototype exists.

Remaining work includes identity separation, proofing/recovery design,
delegated access, finalized-record read-only views, access/correction/consent
contracts, privacy leakage tests, accessibility evidence, and an isolated
synthetic prototype. Patient auth must never reuse pharmacist cookies, roles,
sessions, invitations, or TOTP configuration.

### Task 06 — Virtual care

**Status: NOT STARTED.** No virtual-care route, waiting room, visit state
machine, vendor-neutral adapter prototype, participant controls, or virtual
care evidence package exists.

Remaining work is documentation, vendor/build assessment, threat model,
synthetic preflight and waiting-room prototype, consent/location/suitability
gates, disconnect/fallback tests, accessibility evidence, and Task 11 review.
No recording, transcription, meeting AI, external vendor, or real visit is
authorized.

### Task 07 — Messaging and reminders

**Status: DOCUMENTATION ONLY.** Workstreams A–I are documented. Runtime
communications, reminders, secure message threads, provider adapters, webhook
reconciliation, and real delivery are not implemented.

The sandbox outbox code currently visible is Task 04 booking infrastructure;
it is not a Task 07 messaging implementation. The next safe documentation
slice is Workstream J (privacy, security, audit, and retention), followed by a
versioned Task 07 scope/owner/reviewer approval, Task 11 Checkpoint 1, and an
isolated synthetic prototype.

### Task 08 — Fulfilment and delivery

**Status: NOT STARTED.** No fulfilment, pickup, delivery, courier, payment,
inventory, or pharmacy-request runtime exists. Remaining work is contracts,
state machines, synthetic local adapters, professional release boundaries,
patient-choice rules, privacy tests, and evidence. The product language must
remain “request,” not “order”; payment or courier events must never authorize
professional release.

### Task 09 — Interoperability

**Status: DISABLED / DESIGN ONLY.** `/api/fhir` exists only as a preserved
disabled scaffold returning `403`. No approved consumer, endpoint, credential,
FHIR conformance, or clinical-map integration exists.

Remaining work is standards analysis, persisted-snapshot export contracts,
synthetic conformance, endpoint/credential governance, reviewed ICD-10 mapping,
and Task 11 evidence. Keep every interop route disabled and keep endpoint
allowlists empty unless a separate exact approval is recorded.

### Task 10 — Bounded AI

**Status: AI-RX-06 RETIRED; TASK 10 EXPANSION BLOCKED.** Task 10A Slice A
removed the production pharmacist route, production modules, synthetic
fixtures and tests, evaluator tooling, navigation, and feature-specific
configuration. No sandbox replacement or other bounded-AI runtime was created.

Any future Task 10 candidate still requires candidate boundaries, evaluator
approval, a frozen evaluation charter, Task 01 sandbox isolation,
privacy/security review, and Task 11 evidence before implementation.

### Task 11 — Quality, security, and release control

**Status: IMPLEMENTATION/REVIEW INCOMPLETE.** The Task 11 approval authorizes
synthetic implementation, not promotion or self-approval. The CI workflow
described by the Task 11 gap analysis is not present in the current checkout
or `origin/main`; only the sandbox workflow is present.

Remaining work includes the required CI workflow, security/privacy/accessibility
jobs, capability register, control catalogue, evidence schema, aggregate gate,
independent quality/security/privacy/operations/accessibility review, protected
branch verification, and exact-candidate release evidence. Task 11 records
approvals; it cannot grant or self-approve them.

### Task 12 — Operational resilience, downtime, and recovery

**Status: NOT RUN / DESIGN ONLY.** No dedicated service-health model, downtime
state machine, payload-free observability contract, operator-control surface,
or cross-capability backup/restore evidence package exists.

The next authorized slice is repository discovery, dependency mapping,
operational-state design, observability allowlists, and a synthetic recovery
test plan. Runtime, Docker drills, monitoring vendors, production access,
backups, alert delivery, or configuration changes require a separate exact
Task 12 approval and Task 11 Checkpoint 1. Task 02 retains ownership of its P0
migration and live-recovery gates.

### Task 13 — Human factors, training, and controlled pilot readiness

**Status: NOT RUN / DESIGN ONLY.** No cross-capability human-factors hazard
register, safety case, role-based training framework, synthetic simulation
catalogue, usability study plan, or controlled-pilot readiness record exists.

The next authorized slice is role/task analysis, hazard discovery, competency
framework design, synthetic scenario planning, and study/pilot gate design.
No participant study, recording, production account, real patient, PHI, live
workflow, clinical/billing change, or pilot is authorized. Runnable studies
require a separate exact Task 13 approval and Task 11 Checkpoint 1.

### Task 14 — Regulatory change and clinical knowledge governance

**Status: NOT RUN / DESIGN ONLY.** The repository has protected clinical and
billing sources, versioned reference rows, regulatory PDFs, and compliance
mapping, but no dedicated recurring source register, change-intake process,
impact traceability, effective-date transition contract, or stale-source and
rollback evidence package.

The next authorized slice is source-register and provenance design, change-
intake and interpretation templates, an impact matrix, an approval/separation-
of-duties model, effective-date and historical-reconstruction planning, and a
Task 11 evidence profile. No protected source, rule, migration, derivation,
consent text, or production behavior may change under this design slice.
Runnable tooling requires a separate exact Task 14 approval and Task 11
Checkpoint 1.

## Protected surfaces and stop conditions

Do not modify these without explicit lead sign-off and the assigned brief’s
approval path:

- `src/config/triage.ts` and red-flag content;
- reference PIN/fee/claim-maximum data;
- `src/lib/db/migrations/` or migration history;
- `deriveClaimDraft` and billability derivation;
- audit-log enforcement;
- LTC billing behaviour;
- pharmacist authentication/orientation behaviour;
- the zero-PHI `/assessment` and `/check` boundaries.

Never:

- use real PHI, production credentials, or production-derived fixtures;
- connect an experiment to Supabase, Firebase, HNS, FHIR consumers, vendors,
  email, SMS, push, payment, courier, storage, or model providers;
- add PHI to URLs, browser storage, logs, analytics, caches, or unnecessary
  client props;
- interpret a passing test, task checkbox, or product-lead implementation
  approval as production authorization;
- invent missing clinical, billing, retention, consent, waitlist, or
  regulatory policy.

## Documentation maintenance

The Task 01 README, Task 04 gap analysis, root/docs indexes,
`PROJECT_OVERVIEW.md`, `COMPLETED_WORK.md`, `NEXT_STEPS.md`, `COMPLIANCE.md`,
`OPEN_QUESTIONS.md`, and `SESSION_HANDOFF.md` were refreshed in the 2026-08-10
documentation pass. The following records still need task-owner updates before
the next release candidate:

- [Task 02 evidence index](../../p0/task-02/evidence-index.md), final report,
  and session handoff: add the later `3a271a7d` and `4e479514` fail-closed
  predecessor runs.
- Add a dedicated Task 03 status/evidence record when Task 03 begins.
- Reconcile any external Task 06 and Task 11 branch/PR evidence before marking
  those capabilities implemented in the maintained product docs.

## Safe next order

1. Keep Task 02 and Task 11 as the release-critical lanes; do not widen
   production scope while either remains blocked.
2. **BLOCKED:** obtain a superseding Task 04 approval with the renewal fields
   above before the other developer continues.
3. After renewal, freeze a clean candidate, finish and test Task 04 inside the
   isolated sandbox, then capture evidence.
4. Update the Task 02 evidence records and obtain a new exact G1-D when ready.
5. Complete independent Task 11 review and merge its approved CI/control work.
6. Start Task 03 discovery/design as the next unowned capability.
7. Begin Tasks 05, 06, 08, 09, remaining Task 10 work, any Task 12 runtime,
   any Task 13 study, and any Task 14 tooling only under exact approvals and
   Task 01/Task 11 gates.

**This file is a status aid, not an authorization.** Every agent must verify
the current commit, worktree, approvals, evidence, and task-specific stop
conditions before acting.
