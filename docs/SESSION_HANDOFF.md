# Session handoff

**Updated:** 2026-08-20

**Observed code baseline:** `origin/main`

**Observed baseline HEAD:** `1ce2c9ace894f5c2a745f15fa901fe2fc6acc138`

**Release status:** **BLOCKED - DO NOT PROMOTE**

## Start here

1. Read [`../AGENTS.md`](../AGENTS.md).
2. Read [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md).
3. Read the autonomous-program
   [`current implementation status`](tasks/autonomous-pharmacy/CURRENT-IMPLEMENTATION-STATUS.md).
4. Use the safe execution order in the current implementation status for
   sequencing only.
5. Read the assigned task brief and all exact-candidate decisions in full.

## Current verified checkpoint

At the observed HEAD:

- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run test:pure`: PASS, 22 files / 306 tests;
- `npm run build`: PASS;
- `npm run sandbox:verify`: PASS, 40 files / 606 tests plus boundary check;
- `npm run sandbox:verify-evidence`: PASS;
- `npm run sandbox:verify-production`: **FAIL**, safe reason
  `SBX_INVARIANCE_DENIED:routeShape`;
- `npm run sandbox:build`: **BLOCKED** by fail-closed environment/lifecycle
  controls; and
- real-PostgreSQL suites: NOT RUN in this pass.

Do not convert the production-invariance failure to PASS by regenerating its
baseline from this candidate. The route-shape delta requires Task 01/Task 11
review.

## Newly merged work

- `/check` beta UX and tests are merged.
- Task 04's synthetic `/book` UI is merged, but its v3 renewal remains an
  unsigned draft and the previous approval expired.
- Task 06's synthetic virtual-care prototype and documentation are merged.
- Task 11's first seven-job CI workflow slice is merged.

Merged code is not production authorization. Task 04 and Task 06 remain local,
synthetic, fail-closed capabilities with no production data, credentials,
integrations, hosted preview, or external effects.

## Production-critical Task 02

Live Supabase remains documented through `0017`; migration `0018` is not live.
Preserve the existing failed predecessor evidence and do not rerun an
evidence-bound candidate. The remaining order is:

1. Freeze a new clean candidate.
2. Obtain a new exact, expiring G1-D.
3. Run the one approved predecessor/restart harness.
4. Resolve S27 export/reconstruction semantics.
5. Obtain independent Task 11 review.
6. Complete recovery proof and obtain G1-L.
7. Apply `0018` once with `npm run db:migrate` in the approved window.
8. Verify catalog, grants, triggers, tenancy and parity, then obtain G4.

Never use `db:push`, edit migration history, substitute a developer database,
or access live Supabase under a test-only approval.

## Immediate ownership handoff

| Lane | Next action |
|---|---|
| Task 01 | Investigate the route-shape invariance failure; preserve the verifier and baseline |
| Task 02 | Prepare the next exact G1-D candidate and resolve S27 |
| Task 03 / 05 | Reconcile the existing unmerged branches before new implementation |
| Task 04 | Complete and independently sign the v3 renewal before runtime or further code |
| Task 06 | Obtain renewed sandbox authority and complete browser/accessibility and independent review evidence |
| Task 10 | Record the exact AI-RX-06 retire/rebuild disposition before changing it |
| Task 11 | Complete security, accessibility, evidence, aggregate-gate and branch-protection controls |

## Standing fences

Do not edit protected clinical content, reference billing data, migrations,
claim derivation, audit enforcement, LTC billing, pharmacist auth/orientation,
or zero-PHI public-flow boundaries without their exact approval. `/api/fhir`
stays disabled. A passing test, merged PR, or this handoff never authorizes
production use.
