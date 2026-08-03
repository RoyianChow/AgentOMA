# Task 02 current-state and gap analysis

**Recorded:** 2026-08-02
**Initial baseline:** `76098acad4afee5e80aa0dc71074d7ec97e14cf3`
**Tested code candidate:** `dcaab91f9adba7457a85214d51d1614c8560f404`
**Failed predecessor-harness candidate:** `dd503a14da24ea80a0f0e046e179f6b4b4e77b3c`
**Branch:** `feat/moh-compliance-migration`

**Latest predecessor-harness update (2026-08-02):** after the first failed
candidate, `5b576b7ba8be6917c133590aee5e1fa0d33368d4` received a fresh exact
local G1-D from Royian Chowdhury. Its single run failed closed with
`DATABASE_CONNECTIVITY_DENIED` before migration or synthetic fixture writes;
teardown passed. The record is
`evidence/runs/5b576b7ba8be6917c133590aee5e1fa0d33368d4/predecessor-upgrade-run.json`.
This current update supersedes any later wording that says the remediated
candidate still needs its first G1-D execution.

**Current database-free remediation:** the harness now separates exact
loopback TCP unreachability from a failed PostgreSQL readiness query using only
safe reason codes. This is permitted test/evidence-harness work and has passed
its pure regressions, TypeScript, lint, and build. It is not a database proof:
the updated source requires a new clean candidate and fresh exact G1-D before
the Docker predecessor/restart run may occur. See
`predecessor-upgrade-connectivity-diagnostic-2026-08-02.md`.
**Assessment:** **BLOCKED — DO NOT PROMOTE**

The two authorized P0 defects are remediated and now proven by real PostgreSQL.
The exact candidate passed the complete from-zero suite twice: 20 test files,
211 tests, zero skipped or focused tests. A separate, fail-closed predecessor
upgrade/restart harness was run once under an exact G1-D and failed closed at
its initial database identity probe. It has no passing predecessor/restart
runtime proof. Task 02 remains blocked on a remediated, newly approved run,
S27 export reconstruction, Task 11 review, recovery, G1-L, live verification,
and G4.

## Locked identity

| Fact | Value |
|---|---|
| Migration head | `0018_clever_mister_fear` |
| Predecessor | `0017_tense_pandemic` |
| Migration SHA-256 | `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c` |
| Ordered chain digest | `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb` |
| G1-D approval | Consumed by failed candidate `dd503a14…`; a new candidate requires a new approval |
| G1-L / G4 | NOT GRANTED |

No migration, triage rule, reference PIN/fee/maximum, claim derivation, LTC
billing behavior, authentication architecture, or live database state changed.

## Proven on disposable PostgreSQL

- Full chain migrated from zero through `0018` twice.
- Required-audit insertion failure rolled back assessment, evidence, claim,
  follow-up, intake consumption, and audit together.
- Cross-pharmacy patient/evidence/intake/export references were denied.
- Evidence and audit immutability, active-draft supersession, governed
  destruction, retention, and follow-up constraints passed.
- One-per-day and insect/tick mutex rules passed, including concurrency.
- Concurrent completion and invitation/follow-up races converged exactly once.
- Red-flag exit wrote zero claim rows; completed-then-referred remained a
  distinct billable outcome.
- Unknown PIN lookup refused; seeded-reference and remote-eligibility paths
  passed without changing claim derivation or reference data.
- Orientation remained a hard server gate with no admin override.
- Persisted billability evidence appeared in tenant-pinned export artifacts;
  missing evidence was not fabricated.

Evidence: `docs/p0/task-02/evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/`.

## Restart-persistence finding

The approved environment requires tmpfs. Restarting the container therefore
clears the database. Attempting `pg_ctl restart` also cannot prove persistence
because PostgreSQL is PID 1; stopping it exits the container before restart.
Both failed attempts are preserved as **BLOCKED**, not relabelled PASS.

Do not weaken tmpfs or substitute reload for restart. The approved
implementation now supplies a separate loopback-only PostgreSQL 16 service with
an internal network, named disposable volume, exact ownership checks, restart
verification and finally-block teardown. Its first approved database run failed
closed with `DATABASE_IDENTITY_DENIED` before migration or fixture writes; its
teardown passed. See `predecessor-upgrade-failure-dd503a14-2026-08-02.md`.
The remediation adds bounded read-only readiness and granular safe diagnostics;
the resulting candidate still needs a fresh G1-D before runtime execution.

## Remaining gap register

| ID | Status | Gap / next action |
|---|---|---|
| GAP-01 | RESOLVED | Completion/audit atomicity passed fault injection on real PostgreSQL. |
| GAP-02 | RESOLVED | Orientation override removed; hard gate passed. |
| GAP-03 | BLOCKED | From-zero and runtime matrix pass. The first independent predecessor/restart run failed closed before migration. Preserve its evidence, finish the harness remediation, then obtain a fresh exact-candidate G1-D; the full bypass matrix also remains incomplete. |
| GAP-04 | BLOCKED | S27: approve canonical export-hash and reconstruction semantics; do not invent them. |
| GAP-05 | BLOCKED | G1-L/S17: recovery proof, exact live target, preflight, one-time apply, and parity evidence absent. |
| GAP-06 | BLOCKED | S25: independent Task 11 review has not examined this candidate/evidence. |

No production command, credential, live row, PHI, external integration, claim,
or deployment was used. The correct overall status remains **BLOCKED**.
