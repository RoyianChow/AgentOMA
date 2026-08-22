# Autonomous Pharmacy - Current Implementation Status

**Purpose:** Start here before working on Tasks 01-14. This file reports what
is present in the maintained checkout; it is not an implementation approval or
production release decision.

**Snapshot date:** 2026-08-22

**Observed implementation candidate:**
`2358570aa9eae45b7b4403fe0a262f06c9dc36c0` on
`codex/task-01-ci-gates`, based on
`af2473c546b11c5097597733530be698f7b8588a`

**Documentation branch:** `codex/task-01-ci-gates`

**Worktree at capture:** clean before this documentation audit

## Verification performed for this snapshot

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:pure` | PASS - 15 files, 152 tests |
| `npm run build` | PASS - production route manifest generated |
| `npm run sandbox:verify` | PASS - typecheck, lint, 40 files / 614 non-Postgres tests, boundary verification |
| `npm run sandbox:verify-evidence` | PASS - 18 controls accepted by the committed evidence validator |
| `npm run sandbox:verify-production` | PASS - production runtime script hash is derived from original baseline `7737ef26...`; production routes, artifacts, dependencies, build and start scripts remain invariant |
| `npm run sandbox:build` | PASS - `NODE_ENV=production` is accepted only during the exact Next.js build phase; startup/runtime remains denied |
| Root and sandbox real-PostgreSQL suites | NOT RUN in this documentation pass |

The Task 01 CI remediation is implemented and locally verified. Separate
SBX-04 and SBX-13 red/green evidence is bound to candidate `2358570a...`.
Promotion remains **BLOCKED** pending changed-candidate Task 11 review. The
historical Task 01 manifest remains unchanged and its PASS does not transfer
to this candidate.

## Merge review - 2026-08-19

| Merge | What is now present | Status consequence |
|---|---|---|
| PR #46 | `/check` beta UX, tests, documentation, and the Task 02A governance brief | Public self-check remains zero-identifying-data and test-clean |
| PR #47 | Task 04 renewal proposal and v3 review draft | Renewal remains `DRAFT - NOT GRANTED` |
| PR #48 | Synthetic `/book` catalog, availability, booking UI, server actions, and tests | Code is merged but runtime remains blocked by expired/missing approval |
| PR #44 | Task 06 synthetic virtual-care routes, fixtures, guards, UI, docs, and tests | Synthetic implementation is merged; production and promotion remain blocked |
| PR #31 | First Task 11 CI workflow slice | Seven quality/database jobs now exist; the full control plane does not |

PR #49 subsequently merged the 2026-08-19 documentation reconciliation only.
No additional runtime capability was introduced after the verified
`87bdb1b9...` code candidate; today’s checks were rerun against the resulting
`origin/main` baseline above.

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
| 01 - Sandbox | Historical evidence candidate PASS; CI remediation candidate `2358570a...` passes sandbox build and production invariance with red/green SBX-04/SBX-13 evidence | Obtain exact-candidate Task 11 review before promotion; do not transfer or rewrite the historical PASS |
| 02 - P0 readiness | BLOCKED - code and `0018` are merged but live deployment gates remain | Follow the exact G1-D -> predecessor/restart -> S27 -> Task 11 -> recovery -> G1-L -> live verify -> G4 sequence |
| 03 - Command centre | NOT MERGED as a dedicated capability; a separate local branch exists | Reconcile/review that branch before duplicate work; keep the maintained checkout status `NOT RUN` |
| 04 - Booking/waitlist | PARTIAL SYNTHETIC IMPLEMENTATION MERGED; `/book` now exists in the sandbox | Complete an exact, signed, unexpired v3 renewal and independent reviews before any runtime, migration, Docker, evidence-promotion, or further implementation |
| 05 - Patient portal | NOT MERGED; a separate local design branch exists | Review/reconcile that branch; no production patient identity domain exists |
| 06 - Virtual care | SYNTHETIC PROTOTYPE MERGED; routes, guards, fixtures and tests are present | Renew runnable sandbox authority; complete manual accessibility/browser evidence, Task 05 identity dependency, PIA/TRA/vendor decisions, and independent Task 11 review |
| 07 - Messaging | DOCUMENTATION A-I COMPLETE | Workstream J privacy/security/audit/retention design; no provider or recipient runtime |
| 08 - Fulfilment | NOT RUN | Contracts/state machines and approved synthetic tests only |
| 09 - Interoperability | DISABLED / DESIGN ONLY | Keep `/api/fhir` at 403 and all allowlists empty |
| 10 - Bounded AI | AI-RX-06 `RETIRED`; production route, navigation, runtime, config, tests and scorecard removed | Preserve retirement; any future experiment requires a new Task 10 decision and belongs in the isolated sandbox |
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

1. Obtain Task 11 review for Task 01 remediation candidate `2358570a...`;
   production promotion remains blocked until that review is recorded.
2. Keep Task 02 and the remaining Task 11 controls as release-critical lanes.
3. Complete Task 04 v3 renewal and independent reviews before running or
   extending booking code.
4. Reconcile the unmerged Task 03 and Task 05 branches before assigning new
   work in those areas.
5. Renew the sandbox and complete Task 06 browser/accessibility evidence only
   under an exact approval.
6. Preserve the completed Task 10A retirement; no replacement is authorized.
7. Continue Task 07 Workstream J and design-only Tasks 08, 12, 13, and 14
   within their stated boundaries.

## Documentation disposition

- The binding `TASK-*.md` contracts remain separate because their authority,
  stop conditions, evidence, and reviewer requirements differ.
- Task 02A and Task 10A remain narrow remediation briefs under their parent
  tasks; folding them into already-large parent contracts would hide their
  explicit approval gates.
- Current status and sequencing now live in this file. The dated
  `NEXT-SPRINT-PLAN-2026-08-19.md` was removed as duplicate status.
- The stale Task 02 continuation note was consolidated into the maintained
  production handoff.
- Task 06’s duplicate final report was consolidated into its maintained
  current-state report. Its production-integration handoff remains separate
  because it serves a different future audience.
- Signed decisions, failed and passing evidence, historical reports, and
  regulatory provenance were retained unchanged.

**This status file grants no authority.** Verify the current SHA, worktree,
decision records, evidence, and assigned task brief before acting.
