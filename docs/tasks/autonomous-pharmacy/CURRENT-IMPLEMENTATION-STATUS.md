# Autonomous Pharmacy - Current Implementation Status

**Purpose:** Start here before working on Tasks 01-14. This file reports what
is present in the maintained checkout; it is not an implementation approval or
production release decision.

**Snapshot date:** 2026-08-26

**Observed code baseline:** `origin/main` at
`02b0a5cf08a56714a2d175556557a49f8813b77f`

**Task 01 remediation implementation candidate:**
`2358570aa9eae45b7b4403fe0a262f06c9dc36c0`

**Dependency/invariance amendment implementation candidate:**
`72b3ed6218bd2a06b03a99a7eac0d2753fe774b9`

**Documentation branch:** `codex/update-project-docs-2026-08-26`

**Worktree at capture:** clean before this documentation audit

## Verification performed for this snapshot

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:pure` | PASS - 20 files, 180 tests |
| `npm run build` | PASS - production route manifest generated |
| `npm run sandbox:verify` | PASS - typecheck, lint, 40 files / 614 non-Postgres tests, boundary verification |
| `npm run sandbox:verify-evidence` | PASS - 18 controls accepted by the committed evidence validator |
| `npm run sandbox:verify-production` | PASS - production runtime script hash is derived from original baseline `7737ef26...`; production routes, artifacts, dependencies, build and start scripts remain invariant |
| `npm run sandbox:build` | PASS - `NODE_ENV=production` is accepted only during the exact Next.js build phase; startup/runtime remains denied |
| `npm run security:dependencies` | PASS - exact advisory policy accepts the current zero-finding audit state |
| `npm audit` / `npm audit --omit=dev` | PASS - zero current findings |
| Root from-zero real-PostgreSQL suite | PASS - 27 files / 269 tests through `0018`; stale-container reuse denied, disposable resources removed |
| Sandbox Task 04 real-PostgreSQL suite | NOT RUN - runnable Task 04 authority remains expired/ungranted |

The Task 01 CI remediation is implemented and locally verified. Separate
SBX-04 and SBX-13 red/green evidence is bound to candidate `2358570a...`.
PR #56 merged it as `e1c79730...`, and every reported PR check passed.
Promotion remains **BLOCKED** pending changed-candidate Task 11 review. No PR
review was recorded on #56, so merge is not evidence of independent review.
The historical Task 01 manifest remains unchanged and its PASS does not
transfer to this candidate.

## Merge review - through 2026-08-26

| Merge | What is now present | Status consequence |
|---|---|---|
| PR #46 | `/check` beta UX, tests, documentation, and the Task 02A governance brief | Public self-check remains zero-identifying-data and test-clean |
| PR #47 | Task 04 renewal proposal and v3 review draft | Renewal remains `DRAFT - NOT GRANTED` |
| PR #48 | Synthetic `/book` catalog, availability, booking UI, server actions, and tests | Code is merged but runtime remains blocked by expired/missing approval |
| PR #44 | Task 06 synthetic virtual-care routes, fixtures, guards, UI, docs, and tests | Synthetic implementation is merged; production and promotion remain blocked |
| PR #31 | First Task 11 CI workflow slice | Initially established seven stable quality/database job identities; the full control plane still does not exist |
| PR #55 | Governance information architecture, responsive/dark-mode and accessibility slice | Low-risk UX work is merged; protected retention, audit, export, authorization and migration work remains gated |
| PR #56 | Task 01 build-phase env boundary and production-runtime-script invariance remediation | CI is green and candidate-bound SBX-04/SBX-13 evidence exists; promotion remains blocked pending Task 11 review |
| PR #58 | Authenticated assessment handoff recovery | Missing/expired/consumed intake identifiers fail closed without identifier disclosure |
| PR #61 | Task 11 forbidden-import boundary | BND-01 is merged into the stable security-policy job |
| PR #63 | Guided demo improvements | Public demo is clearer while remaining synthetic, read-only, and unable to create a session |
| PR #64 | Next.js 16.3.3 and dependency-security remediation | Audit findings are cleared and the stable dependency gate is merged; independent candidate review remains outstanding |

PR #49 merged the 2026-08-19 documentation reconciliation only. The later
merges listed above are included in the current `origin/main` baseline and in
this status review.

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
| Governance remediation (Task 02A) | LOW-RISK UX/A11Y SLICE MERGED / PROTECTED WORK OPEN | Preserve the merged presentation improvements; integrity, authorization, audit/export and migration changes still require exact protected-surface approval. |

## Autonomous task matrix

| Task | Current repository state | Next authorized or required step |
|---|---|---|
| 01 - Sandbox | Historical evidence candidate PASS; remediation is merged and CI-green with candidate-bound SBX-04/SBX-13 evidence | Obtain exact-candidate Task 11 review before promotion; do not transfer or rewrite the historical PASS |
| 02 - P0 readiness | BLOCKED - code and `0018` are merged but live deployment gates remain | Follow the exact G1-D -> predecessor/restart -> S27 -> Task 11 -> recovery -> G1-L -> live verify -> G4 sequence |
| 03 - Command centre | NOT MERGED as a dedicated capability; a separate local branch exists | Reconcile/review that branch before duplicate work; keep the maintained checkout status `NOT RUN` |
| 04 - Booking/waitlist | PARTIAL SYNTHETIC IMPLEMENTATION MERGED; `/book` now exists in the sandbox | Complete an exact, signed, unexpired v3 renewal and independent reviews before any runtime, migration, Docker, evidence-promotion, or further implementation |
| 05 - Patient portal | NOT MERGED; a separate local design branch exists | Review/reconcile that branch; no production patient identity domain exists |
| 06 - Virtual care | SYNTHETIC PROTOTYPE MERGED; routes, guards, fixtures and tests are present | Renew runnable sandbox authority; complete manual accessibility/browser evidence, Task 05 identity dependency, PIA/TRA/vendor decisions, and independent Task 11 review |
| 07 - Messaging | DOCUMENTATION A-I COMPLETE | Workstream J privacy/security/audit/retention design; no provider or recipient runtime |
| 08 - Fulfilment | NOT RUN | Contracts/state machines and approved synthetic tests only |
| 09 - Interoperability | DISABLED / DESIGN ONLY | Keep `/api/fhir` at 403 and all allowlists empty |
| 10 - Bounded AI | AI-RX-06 `RETIRED`; production route, navigation, runtime, config, tests and scorecard removed | Preserve retirement; any future experiment requires a new Task 10 decision and belongs in the isolated sandbox |
| 11 - Release control | INCREMENTAL CI + RAW-ENV + FORBIDDEN-IMPORT + DEPENDENCY GATES MERGED | Complete repository-owned secret scanning, PHI/logging and unsafe-enable policy, accessibility, evidence validation, aggregate release gate, catalogues, independent review, and required-check branch protection |
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

The code passes the current non-Postgres sandbox suite and the sandbox build,
but running the capability or collecting browser evidence is blocked by the
expired sandbox lifecycle and missing production prerequisites. No PIA, TRA,
vendor approval, patient identity
integration, production migration, or release approval is inferred.

## Task 11 detail

`.github/workflows/ci.yml` now runs lockfile install, TypeScript, ESLint, pure
tests, production build, raw-environment/forbidden-import policy,
dependency-security scanning, fresh-migration tests, and database-constraint
tests on pull requests and pushes to `main`. The workflow uses read-only
repository permissions and cancels stale runs.

It does not yet implement the full Task 11 contract: repository-owned secret
scanning, the remaining PHI/logging and unsafe-enable policy controls, automated
accessibility, release-evidence validation, aggregate release gate,
capability/control catalogues, and exact-candidate independent promotion
review remain open.

Repository settings were read through the GitHub API on 2026-08-22. `main`
requires one approving review and blocks force-pushes and deletion, but it has
no required status-check contexts and does not enforce protection for admins.
Branch protection is therefore verified as **incomplete**, not PASS.

## Safe next order

1. Obtain independent Task 11 review for the Task 01 remediation and
   dependency/invariance amendment candidates; production promotion remains
   blocked until those reviews are recorded.
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
