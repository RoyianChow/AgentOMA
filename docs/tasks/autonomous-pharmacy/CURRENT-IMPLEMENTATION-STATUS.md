# Autonomous Pharmacy - Current Implementation Status

**Purpose:** Start here before working on Tasks 01-14. This file reports what
is present in the maintained checkout; it is not an implementation approval or
production release decision.

**Snapshot date:** 2026-08-19  
**Observed branch:** `task7`  
**Observed HEAD:** `87bdb1b99840f56a34046254065071c3d5a755c1`  
**Worktree at capture:** clean before this documentation update  
**Current sprint plan:**
[`NEXT-SPRINT-PLAN-2026-08-19.md`](NEXT-SPRINT-PLAN-2026-08-19.md)

## Verification performed for this snapshot

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:pure` | PASS - 22 files, 306 tests |
| `npm run build` | PASS - production route manifest generated |
| `npm run sandbox:verify` | PASS - typecheck, lint, 40 files / 606 non-Postgres tests, boundary verification |
| `npm run sandbox:verify-evidence` | PASS for the committed evidence-manifest schema and artifacts |
| `npm run sandbox:verify-production` | **FAIL - `SBX_INVARIANCE_DENIED:routeShape`** |
| `npm run sandbox:build` | **BLOCKED** - sandbox environment/lifecycle controls failed closed; the embedded Task 04 approval window is expired |
| Root and sandbox real-PostgreSQL suites | NOT RUN in this documentation pass |

The production-invariance failure is an active Task 01/Task 11 review item. Do
not recapture the baseline from the current candidate merely to make it pass.
Identify and approve the legitimate production-route delta, or remove the
unauthorized delta, then regenerate evidence through the Task 01 process.

## Merge review - 2026-08-19

| Merge | What is now present | Status consequence |
|---|---|---|
| PR #46 | `/check` beta UX, tests, documentation, and the Task 02A governance brief | Public self-check remains zero-identifying-data and test-clean |
| PR #47 | Task 04 renewal proposal and v3 review draft | Renewal remains `DRAFT - NOT GRANTED` |
| PR #48 | Synthetic `/book` catalog, availability, booking UI, server actions, and tests | Code is merged but runtime remains blocked by expired/missing approval |
| PR #44 | Task 06 synthetic virtual-care routes, fixtures, guards, UI, docs, and tests | Synthetic implementation is merged; production and promotion remain blocked |
| PR #31 | First Task 11 CI workflow slice | Seven quality/database jobs now exist; the full control plane does not |

## Release posture

AgentOMA remains an authenticated, single-pharmacy pilot and is **not
production-ready**. Live Supabase is documented through migration `0017`;
`0018` remains unapplied and gated by Task 02. `/api/fhir` remains disabled
with `403`. `db:push` remains banned. Experimental code stays in
`apps/experiment-sandbox/` and must never use production data, credentials,
accounts, services, or external effects.

## P0 and core product

| Area | Status | Remaining work |
|---|---|---|
| P0-A clinical triage | PASS | Current hash-bound clinical approval remains controlling. |
| P0-B clinical record and consent | PASS | Maintain the version-2 record and privacy boundaries. |
| P0-C eligibility/evidence | IMPLEMENTED / BLOCKED | Complete Task 02 predecessor/restart, S27, independent review, recovery, G1-L, live `0018`, parity, and G4. |
| P0-D virtual/LTC fact capture | FACT CAPTURE COMPLETE / BILLING BLOCKED | LTC billing remains parked pending the recorded human decision. |
| Follow-up tracking | PASS | Preserve required plans, immutable attempts, retention, audit, and export coverage. |
| Public `/check` | BETA-READY IN CODE | Complete real-device/browser testing; retain zero identity, zero persistence, and no billing values. |
| Governance remediation (Task 02A) | BRIEF ONLY | Requires exact protected-surface approval before implementation. |

## Autonomous task matrix

| Task | Current repository state | Next authorized or required step |
|---|---|---|
| 01 - Sandbox | Prior evidence candidate PASS; current changed candidate has green unit/boundary checks but production invariance FAILS and runtime approval is expired | Investigate route-shape delta without weakening the verifier; renew exact scope before runtime; produce new candidate-bound evidence |
| 02 - P0 readiness | BLOCKED - code and `0018` are merged but live deployment gates remain | Follow the exact G1-D -> predecessor/restart -> S27 -> Task 11 -> recovery -> G1-L -> live verify -> G4 sequence |
| 03 - Command centre | NOT MERGED as a dedicated capability; a separate local branch exists | Reconcile/review that branch before duplicate work; keep the maintained checkout status `NOT RUN` |
| 04 - Booking/waitlist | PARTIAL SYNTHETIC IMPLEMENTATION MERGED; `/book` now exists in the sandbox | Complete an exact, signed, unexpired v3 renewal and independent reviews before any runtime, migration, Docker, evidence-promotion, or further implementation |
| 05 - Patient portal | NOT MERGED; a separate local design branch exists | Review/reconcile that branch; no production patient identity domain exists |
| 06 - Virtual care | SYNTHETIC PROTOTYPE MERGED; routes, guards, fixtures and tests are present | Renew runnable sandbox authority; complete manual accessibility/browser evidence, Task 05 identity dependency, PIA/TRA/vendor decisions, and independent Task 11 review |
| 07 - Messaging | DOCUMENTATION A-I COMPLETE | Workstream J privacy/security/audit/retention design; no provider or recipient runtime |
| 08 - Fulfilment | NOT RUN | Contracts/state machines and approved synthetic tests only |
| 09 - Interoperability | DISABLED / DESIGN ONLY | Keep `/api/fhir` at 403 and all allowlists empty |
| 10 - Bounded AI | AI-RX-06 remains in the production tree, default-off | Record the exact retire-or-rebuild decision; do not expand the route |
| 11 - Release control | FIRST CI SLICE MERGED | Add security policy/secret/dependency checks, accessibility, evidence validation, aggregate release gate, independent review, and verified branch-protection configuration |
| 12 - Resilience | DESIGN ONLY | Discovery and synthetic test-plan work under its task gates |
| 13 - Human factors | DESIGN ONLY | Hazard/training/study design; no participants or pilot without approval |
| 14 - Regulatory change | DESIGN ONLY | Source/provenance/impact design; no automated interpretation or protected-source changes |

## Task 04 detail

The merged sandbox includes a loopback PostgreSQL schema, availability,
service catalog, booking create/retrieve/confirm/expiry, synthetic audit and
outbox contracts, delegation fixtures, pharmacist queue, and a public `/book`
UI for catalog, availability search, selection, acknowledgements, and booking
creation. Cancellation, rescheduling, bootstrap exchange, waitlist command
runtime, promotion workers, and their complete PostgreSQL race evidence are
not implemented.

The current decision file
[`task-04-synthetic-scope-renewal-v3-2026-08-19.md`](../../task-04/decisions/task-04-synthetic-scope-renewal-v3-2026-08-19.md)
is a draft with pending scope, owners, dates, independent approvals, and Task
11 review. Merge presence and passing tests do not grant authority.

## Task 06 detail

The sandbox now contains deterministic pharmacist/patient virtual-care scenes,
server-owned guard evaluation, identity/location/consent/suitability checks,
waiting-room and participant controls, disconnect/fallback behavior, secure
message stubs, assessment/claim separation, and explicit prohibitions on
recording, transcription, model use, vendors, and external transport. It is a
synthetic review prototype, not a telehealth service.

The code passes the current non-Postgres sandbox suite, but successful runtime
build/browser evidence is blocked by the expired sandbox lifecycle and missing
production prerequisites. No PIA, TRA, vendor approval, patient identity
integration, production migration, or release approval is inferred.

## Task 11 detail

`.github/workflows/ci.yml` now runs lockfile install, TypeScript, ESLint, pure
tests, production build, fresh-migration tests, and database-constraint tests
on pull requests and pushes to `main`. The workflow uses read-only repository
permissions and cancels stale runs.

It does not yet implement the full Task 11 contract: secret/dependency/policy
scanning, automated accessibility, release-evidence validation, aggregate
release gate, capability/control catalogues, or exact-candidate independent
promotion review remain open.

## Safe next order

1. Resolve the current Task 01 production-invariance failure without
   rebaselining from an unapproved candidate.
2. Keep Task 02 and the remaining Task 11 controls as release-critical lanes.
3. Complete Task 04 v3 renewal and independent reviews before running or
   extending booking code.
4. Reconcile the unmerged Task 03 and Task 05 branches before assigning new
   work in those areas.
5. Renew the sandbox and complete Task 06 browser/accessibility evidence only
   under an exact approval.
6. Record and execute the Task 10A retire-or-rebuild decision in a separate
   reviewed change.
7. Continue Task 07 Workstream J and design-only Tasks 08, 12, 13, and 14
   within their stated boundaries.

**This status file grants no authority.** Verify the current SHA, worktree,
decision records, evidence, and assigned task brief before acting.
