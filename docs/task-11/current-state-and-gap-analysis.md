# Task 11 — Current-State and Gap Analysis

**Scope of this document:** the ungated first slice of Task 11 (Workstream C's
required-check contract) that this repository can run today. It does not
attempt the full Task 11 specification's capability register, control
catalogue, or evidence-manifest schema — those remain open gaps, listed below.

**Authorization:** [`decisions/implementation-approval-2026-08-02.md`](decisions/implementation-approval-2026-08-02.md)
— Royian Chowdhury, Product Lead, `APPROVED_TO_IMPLEMENT_SYNTHETIC`, R4 /
`A3_BOUNDED_AUTOMATION`. Production release authority: **not granted**. This
document's implementation stays inside that scope: no production data,
credentials, migrations, or live-data mutation; no weakening of a required
check to obtain a passing result.

**Baseline commit:** `230c0d8` (`main`, merge of PR #36)
**Branch:** `feature/task-11-gap-analysis`
**Working tree:** clean at capture time
**Related PR:** [#31](https://github.com/RoyianChow/AgentOMA/pull/31) (the CI
workflow itself) — merge state `BLOCKED_PENDING_INDEPENDENT_REVIEW` per the
approval record above, and separately blocked on 3 open findings (§3).

## 1. Repository baseline

| Item | Value |
|---|---|
| Package manager | npm (lockfile-pinned; `npm ci` is the CI-required install path) |
| Runtime | Node 22 |
| Framework | Next.js 16.2, App Router |
| Test runner | Vitest 4 (`test:pure` — no DB; `test` — full suite incl. `*.db.test.ts`) |
| Database | PostgreSQL 16 (Docker, `docker-compose.yml`, tmpfs, port 5433) |
| Migration tool | `drizzle-kit`; migrations at `src/lib/db/migrations/`, currently through `0018_clever_mister_fear.sql` |
| Lint | ESLint 9 flat config |
| Type check | `tsc --noEmit` (PR #31 adds `npm run typecheck`; on `main` today it's still invoked via `npx tsc`) |
| CI provider | GitHub Actions — no workflow exists on `main` yet; `.github/workflows/ci.yml` is only on PR #31 |
| Sandbox workspace | `apps/experiment-sandbox/` (Task 01), npm workspace, own CI check (`Sandbox boundary / Production invariance`) |
| Third-party CI already present | GitGuardian (secret scanning), SonarCloud Code Analysis, Vercel preview |

## 2. What already exists

- **On PR #31** (not yet merged): `.github/workflows/ci.yml` — 7 jobs with
  stable IDs matching Task 11's required-job contract: `quality-install`,
  `quality-typescript`, `quality-eslint`, `quality-pure-tests`,
  `quality-build`, `database-fresh-migrations`, `database-constraints`. All
  use `npm ci --ignore-scripts` (SonarCloud-clean supply-chain hardening) and
  `npm run typecheck` rather than `npx tsc` for the same reason.
- `database-fresh-migrations` / `database-constraints` reuse the existing
  isolated-Postgres pattern (`docker-compose.yml`,
  `src/lib/db/test/global-setup.ts`, `src/lib/db/test/harness.ts`) — full
  migration replay from zero on every run, plus a hard `assertLocalTestDb`
  guard that refuses to run against anything that isn't the local throwaway
  database (blocks the live Supabase project by construction).
- GitGuardian and SonarCloud were already wired at the repo level (not part of
  this task, but now visible as required-check-equivalents on every PR).
- Task 01's sandbox workspace ships its own production-invariance check
  (`apps/experiment-sandbox/tools/verify-production-invariance.mjs`),
  independently enforcing that this repo's `package.json` production scripts,
  dependencies, and build output match a reviewed, Royian-approved baseline
  (`docs/task-01/evidence/baseline-production.json`, captured at commit
  `7737ef2`).

## 3. Gap classification

| Gap | Classification | Owner | Notes |
|---|---|---|---|
| No CI workflow on `main` at all | `MISSING_CONTROL` | Resolved by PR #31, pending merge | Repo had zero required checks before this task |
| No `security-secrets` / `security-dependencies` CI jobs (beyond GitGuardian, which isn't Task-11-owned) | `MISSING_CONTROL` | Task 11 implementer | Natural next slice; doesn't need branch-protection admin access |
| No `security-policy` job (raw-`process.env`, forbidden-import, PHI/logging leakage checks per AGENTS.md) | `MISSING_CONTROL` | Task 11 implementer | Highest-value next control given this repo's PHI/billing surface |
| No `accessibility-automated` job | `MISSING_CONTROL` | Task 11 implementer | Not yet scoped |
| No `release-evidence-validate` / `release-gate` aggregate job | `MISSING_CONTROL` | Task 11 implementer | Depends on the control catalogue existing first |
| No capability register / control catalogue / evidence-manifest schema | `MISSING_CONTROL` | Task 11 implementer | Full Task 11 spec's Workstream B; not started |
| Branch protection does not yet require these CI checks | `MISSING_APPROVAL` | Royian (repo admin) | Explicitly deferred — this is a repo-admin action that changes what blocks every future PR merge, not a code change |
| `database-fresh-migrations` / `database-constraints` fail on PR #31 on a pre-existing Task 02 test bug | `PROTECTED_CODE_DEFECT` (not owned by Task 11) | Task 02 owner | `create-assessment.db.test.ts`, `"preserves the P0-B version-2..."` — `patientSelfReportStatus` assertion doesn't match the shared fixture's derived value. Reported to Royian; CI is correctly surfacing a bug that predates this task, not causing one |
| `Sandbox boundary / Production invariance` fails on PR #31 on `productionScriptsHash` drift | `MISSING_APPROVAL` (not a defect) | Royian | PR #31 legitimately changes `package.json` scripts (`typecheck`, `test:pure` fix). The check is correctly detecting drift from the G1-approved baseline captured before those changes. Fix is Royian recapturing/re-approving the baseline against that branch — not weakening the verifier, which the implementation-approval record explicitly forbids |
| `retention.test.ts` "takes whichever branch is longer, at the boundary" fails (`expected 2045, got 2046`) | `TEST_MISSING` / stale fixture | Unowned | Confirmed via `git stash` to predate all of this task's changes; date-boundary test likely needs a fixed clock rather than wall-clock-relative dates |

## 4. What this document is not

This is not the full Task 11 capability inventory (every Task 01–10
capability, risk-tiered and autonomy-classified), not the stable control
catalogue with per-control evidence profiles, and not the evidence-manifest
schema. Those are real, larger gaps — tracked above as `MISSING_CONTROL` —
and are the natural next slices once PR #31's three open findings are
resolved.
