# Session handoff

**Updated:** 2026-08-22

**Observed code baseline:** `origin/main`

**Observed baseline HEAD:** `e1c7973086a0223e72ac90e01c33cd85fa407b67`

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
- `npm run test:pure`: PASS, 15 files / 152 tests;
- `npm run build`: PASS;
- `npm run sandbox:verify`: PASS, 40 files / 614 tests plus boundary check;
- `npm run sandbox:verify-evidence`: PASS;
- `npm run sandbox:verify-production`: PASS for Task 01 implementation
  candidate `2358570a...`;
- `npm run sandbox:build`: PASS with `NODE_ENV=production` limited to the
  exact Next.js build phase; startup/runtime remains denied; and
- real-PostgreSQL suites: NOT RUN in this pass.

PR #56 derived its production-runtime-script hash from original baseline
`7737ef26...`, not the changed candidate. Its technical checks and red/green
evidence pass, but promotion remains blocked pending exact-candidate Task 11
review. No independent PR review was recorded on #56.

## Newly merged work

- `/check` beta UX and tests are merged.
- Task 04's synthetic `/book` UI is merged, but its v3 renewal remains an
  unsigned draft and the previous approval expired.
- Task 06's synthetic virtual-care prototype and documentation are merged.
- Task 11's eight-job incremental CI workflow is merged, including the
  raw-environment policy check.

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
| Task 01 | Complete Task 11 review of candidate `2358570a...` and its SBX-04/SBX-13 evidence; do not transfer the historical PASS |
| Task 02 | Prepare the next exact G1-D candidate and resolve S27 |
| Task 03 / 05 | Reconcile the existing unmerged branches before new implementation |
| Task 04 | Complete and independently sign the v3 renewal before runtime or further code |
| Task 06 | Obtain renewed sandbox authority and complete browser/accessibility and independent review evidence |
| Task 10 | AI-RX-06 is retired; preserve the removal and require a new decision for any future candidate |
| Task 11 | Complete remaining security, accessibility, evidence and aggregate-gate controls; configure required checks and admin enforcement on `main` |

## Standing fences

Do not edit protected clinical content, reference billing data, migrations,
claim derivation, audit enforcement, LTC billing, pharmacist auth/orientation,
or zero-PHI public-flow boundaries without their exact approval. `/api/fhir`
stays disabled. A passing test, merged PR, or this handoff never authorizes
production use.
