# Session handoff

**Updated:** 2026-08-10
**Observed branch:** `task7`
**Observed baseline HEAD:** `58fee60035988300909a158f3c91501faca89fa7`
**Worktree:** documentation-only updates are present; verify `git status` before
freezing any candidate
**Release status:** **BLOCKED — DO NOT PROMOTE**

## Start here

1. Read [`../AGENTS.md`](../AGENTS.md).
2. Read [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md).
3. Read the autonomous-program
   [`current implementation status`](tasks/autonomous-pharmacy/CURRENT-IMPLEMENTATION-STATUS.md).
4. Use the
   [`2026-08-10 sprint plan`](tasks/autonomous-pharmacy/NEXT-SPRINT-PLAN-2026-08-10.md)
   for sequencing only; it grants no authority.
5. Read the assigned task brief in full before acting.

## Product and live-data boundary

AgentOMA is an authenticated, single-pharmacy Ontario minor-ailments pilot,
not a production-ready service. Public `/check` and `/assessment` collect no
identifying data. `/pharmacist/*` requires password, TOTP, and independent
server-side session, role, orientation, and `PHARMACY_ID` checks. `proxy.ts`
performs optimistic navigation only and no authorization.

Claim drafts are persisted read-only records for hand-entry into dispensing
software. Nothing is submitted to HNS. `/api/fhir` remains disabled with 403.
Firebase is removed. `db:push` is banned.

The repository migration chain ends at `0018_clever_mister_fear`; live
Supabase remains documented through `0017_tense_pandemic`. No live migration,
production credential, PHI, external integration, or claim action occurred in
this documentation pass.

## Verification checkpoint

For baseline `58fee600…`, this documentation pass recorded:

- `npm exec tsc -- --noEmit`: PASS;
- `npm run lint`: PASS;
- `npm run test:pure`: PASS, 22 files and 305 tests;
- documentation relative-link and trailing-whitespace checks: PASS;
- Docker/database suite: **NOT RUN** because no runtime or migration file was
  changed.

The last recorded complete real-PostgreSQL evidence is exact candidate
`dcaab91f9adba7457a85214d51d1614c8560f404`: 211 tests passed twice with
fresh migration replay through `0018`, atomic audit rollback, tenant isolation,
immutability, concurrency, red-flag zero-claim, completed-referral separation,
reference-derived persistence, and billability-evidence export.

## Task 02 — production-critical blocker

Migration `0018` is not live. Later exact predecessor/restart candidates
`3a271a7d3cc941e4c8de62c630d2a75409fdc0a1` and
`4e4795145c7acccefed5df47de3113c9e56b664e` failed closed with
`LOOPBACK_TCP_DENIED` before migration or synthetic fixture writes. Preserve
their evidence under `docs/p0/task-02/evidence/runs/`; neither candidate may be
rerun.

Required order:

1. Freeze a new clean candidate after the current documentation changes are
   reviewed and committed.
2. Create a new exact, expiring G1-D approval for that SHA and environment.
3. Run only the approved predecessor/restart harness command.
4. Preserve passing evidence or an honest fail-closed result.
5. Resolve S27 canonical repeat-export and historical reconstruction semantics.
6. Obtain independent Task 11 review bound to the exact candidate and hashes.
7. Complete recovery proof, then request G1-L for a named live change window.
8. Apply `0018` once with `npm run db:migrate`, verify catalog, grants,
   triggers, tenancy aggregates, and parity, then obtain independent G4.

Do not manually operate the harness resources, edit migration history, change
an existing migration, access Supabase during G1-D, or substitute `db:push`.

## Autonomous-program checkpoint

- **Task 01:** local synthetic boundary and evidence are PASS for its recorded
  candidate. SBX-14 is not applicable because G2 was not requested and no
  hosted preview exists. G3 remains empty. A changed candidate needs fresh
  evidence.
- **Task 03:** no dedicated capability package exists; discovery/design is the
  next unowned product slice.
- **Task 04:** partial synthetic implementation exists, but its approval
  expired on 2026-08-05. The waitlist policy is approved only as a policy
  sub-decision. Runtime work remains blocked pending the complete v3 renewal
  and independent reviews.
- **Task 06:** external work has been reported but is not verified in this
  checkout. Reconcile its branch/PR before duplicate work.
- **Task 07:** documentation Workstreams A–I are complete; Workstream J
  privacy/security/audit/retention design is next. No delivery runtime or real
  recipient is authorized.
- **Task 10:** AI-RX-06 is retired, its production surface was removed, and no
  replacement was created. Expansion remains blocked pending a separately
  chartered, Task-01-isolated candidate and Task 11 review.
- **Task 11:** synthetic control-plane implementation was approved, but merge
  and promotion remain blocked pending exact-candidate independent review.
- **Tasks 12–14:** operational resilience, human factors/pilot readiness, and
  regulatory change governance are design contracts only. No runtime drill,
  participant study, automated interpretation, or production activation is
  authorized.

## Documentation updated in this pass

- refreshed the root and docs indexes;
- reconciled `PROJECT_OVERVIEW.md`, `COMPLETED_WORK.md`, `NEXT_STEPS.md`,
  `COMPLIANCE.md`, and this handoff;
- updated the autonomous task index, current-status record, sprint plan, and
  roadmap;
- added design-only Task 12, Task 13, and Task 14 contracts;
- kept planned capabilities visibly separate from implemented work.

## Standing fences

Do not edit existing migrations, migration history, triage/red-flag content,
reference PIN/fee/maximum data, `deriveClaimDraft`, audit enforcement, LTC
billing, authentication/orientation, the five outcomes, or the zero-PHI public
flows without the exact required approval. Never derive regulatory values from
memory. Never place PHI in logs, URLs, browser storage, analytics, caches, or
unnecessary client props. The 365-day platform count is advisory; only HNS
adjudication determines payment.

Passing tests, completed task briefs, product-lead implementation approval, and
this handoff do not authorize production deployment.
