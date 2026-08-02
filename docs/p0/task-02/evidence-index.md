# Task 02 evidence index

**Recorded:** 2026-08-02

**Candidate implementation commit:** `4f8fdd844c243f5dafcf4e78652116a9d632b222`

**Overall status:** **FAIL** — two mandatory invariants are proven false on protected surfaces.

**Docker verification:** **NOT RUN**

**Live verification:** **NOT RUN**

**Production promotion:** **BLOCKED**

This index records what was actually reviewed or executed. It does not treat a
static finding as PostgreSQL proof, a pure test as an integration test, or a
missing approval as permission.

## Identity and approvals

| Item | Recorded value |
|---|---|
| Starting repository commit | `76098acad4afee5e80aa0dc71074d7ec97e14cf3` |
| Candidate implementation commit | `4f8fdd844c243f5dafcf4e78652116a9d632b222` |
| Branch | `feat/moh-compliance-migration` |
| Migration head | `0018_clever_mister_fear` |
| Migration SHA-256 | `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c` |
| Ordered chain digest | `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb` |
| G1-D | NOT GRANTED |
| G1-L | NOT GRANTED |
| G2 | PARKED |
| G3 | BLOCKED |
| G4 | NOT GRANTED |
| Task 01 synthetic environment | PASS, per its committed evidence manifest |
| Task 11 test-plan/evidence review | NOT VERIFIED; parallel uncommitted work was preserved and not modified |

The worktree was dirty at the start because a separate developer had changes in
`docs/tasks/autonomous-pharmacy/TASK-11-quality-security-release.md` and
`docs/task-11/`. Those paths remain outside Task 02's changes.

## Commands actually run

| Command | UTC start → end | Exit | Evidence |
|---|---|---:|---|
| `npx tsc --noEmit` | 2026-08-02T02:41:08.3773582Z → 2026-08-02T02:41:15.4802488Z | 0 | `artifacts/p0/task-02/runs/4f8fdd844c243f5dafcf4e78652116a9d632b222/quality-gates.json` |
| `npm run lint` | 2026-08-02T02:41:08.3999039Z → 2026-08-02T02:41:29.1328716Z | 0 | Same artifact |
| `npm run test:pure` | 2026-08-02T02:41:08.4056732Z → 2026-08-02T02:41:16.0421484Z | 0; 12 files, 110 tests, none skipped | Same artifact |
| `npm run build` | 2026-08-02T02:41:36.1194924Z → 2026-08-02T02:42:21.0637860Z | 0 | Same artifact |
| `docker version --format '{{json .}}'` | 2026-08-02T02:42:27.5689647Z → 2026-08-02T02:42:27.8273376Z | 1 | `artifacts/p0/task-02/runs/4f8fdd844c243f5dafcf4e78652116a9d632b222/docker-availability.json` |

The Docker command was an availability check only. No container, database,
migration, connection, or teardown command ran. `npm test` was not run because
it includes destructive real-PostgreSQL tests and G1-D was not granted.

Workstream F has a focused red/green record at
`artifacts/p0/task-02/runs/4f8fdd844c243f5dafcf4e78652116a9d632b222/workstream-f-red-green.json`.

## Control map

| Control | Status | Evidence and reason |
|---|---|---|
| T02-01 | PASS | `artifacts/p0/task-02/baseline.json`; instructions and pre-existing changes recorded before action. |
| T02-02 | PASS | Baseline, `sql-review.md`, and this index lock the commit, migration, predecessor, migration hash, and chain digest. |
| T02-03 | BLOCKED | G1-D, G1-L, G3, and G4 were not granted; no action was taken as though they were. |
| T02-04 | BLOCKED | Local guard was strengthened and pure-tested, but gated Docker/live identity was not executed. |
| T02-05 | NOT RUN | Disposable PostgreSQL environment was neither authorized nor started. |
| T02-06 | NOT RUN | G1-D missing; full-chain replay not executed. |
| T02-07 | NOT RUN | G1-D missing; predecessor upgrade not executed. |
| T02-08 | NOT RUN | No disposable or live catalog/aggregate comparison was authorized. |
| T02-09 | NOT RUN | Real-PostgreSQL tenant/patient constraint tests were not executed. |
| T02-10 | NOT RUN | App-role evidence immutability was not executed against PostgreSQL. |
| T02-11 | NOT RUN | App-role audit immutability was not executed against PostgreSQL. |
| T02-12 | NOT RUN | Trigger/RLS/function/role bypass suite was not executed. |
| T02-13 | FAIL | Static review proves required assessment-created audit is best-effort after the completion transaction; audit failure cannot roll back assessment/evidence/claim. See `current-state-and-gap-analysis.md`. |
| T02-14 | NOT RUN | Duplicate/retry/concurrency database suite was not authorized. |
| T02-15 | NOT RUN | Existing tests were reviewed, but the required real-PostgreSQL zero-row proof was not rerun. |
| T02-16 | NOT RUN | Existing structural separation was reviewed; gated database proof was not rerun. |
| T02-17 | NOT RUN | Pure money-rule tests passed, but active-reference database proof was not rerun. |
| T02-18 | FAIL | Existing completion tests explicitly permit an admin orientation override to reach billable completion while G3 is unresolved. See `orientation-decision-note.md`. |
| T02-19 | PASS | Every LTC path remains parked with the existing safe reason; no LTC billing behavior changed. See `ltc-decision-note.md`. |
| T02-20 | BLOCKED | Server-side authorization and tenant predicates were statically reviewed; new cross-tenant DB assertions were added but not executed. |
| T02-21 | BLOCKED | Evidence serialization/projection passed pure tests and is wired into PDF/export, but DB-backed retrieval tests were not executed. |
| T02-22 | BLOCKED | Existing export hash includes non-canonical generated/history fields; S27 prevents inventing a new contract. |
| T02-23 | BLOCKED | No approved stored-bundle reconstruction/tamper verifier exists. |
| T02-24 | NOT RUN | G1-L missing; no live backup/restore evidence was requested or captured. |
| T02-25 | NOT RUN | G1-L missing; migration not applied live. |
| T02-26 | NOT RUN | No live apply occurred; no live post-apply verification. |
| T02-27 | PASS | Task 02 artifacts use metadata, hashes, counts, and synthetic-only summaries; final scans recorded in the manifest. |
| T02-28 | PASS | The destructive DB harness permits only exact local test URLs, and negative pure tests pass. |
| T02-29 | BLOCKED | Task 11 work exists in parallel but its test-plan/evidence review is not committed or verified by Task 02. |
| T02-30 | NOT RUN | No approved cross-task implementation was introduced or exercised by this task. |

## Conditional deliverables

| Deliverable | Status |
|---|---|
| `docs/p0/task-02/docker-migration-evidence.md` | NOT RUN (G1-D) |
| `docs/p0/task-02/database-invariant-evidence.md` | NOT RUN (G1-D) |
| `docs/p0/task-02/synthetic-validation.md` | NOT RUN (G1-D) |
| `artifacts/p0/task-02/test-report.json` | NOT RUN (G1-D) |
| `artifacts/p0/task-02/docker-schema.sql` | NOT RUN (G1-D) |
| `artifacts/p0/task-02/docker-catalog-fingerprint.json` | NOT RUN (G1-D) |
| `docs/p0/task-02/live-preflight.md` | NOT RUN (G1-L) |
| `docs/p0/task-02/live-verification.md` | NOT RUN (G1-L) |
| `artifacts/p0/task-02/live-catalog-fingerprint.json` | NOT RUN (G1-L) |
| Task 11 release-register entry/review | BLOCKED (S25; parallel Task 11 work not verified) |

These files were not created as empty placeholders because that would make
missing evidence look present.
