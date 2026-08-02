# Task 02 current-state and gap analysis

**Recorded:** 2026-08-02
**Initial baseline:** `76098acad4afee5e80aa0dc71074d7ec97e14cf3`
**Tested code candidate:** `dcaab91f9adba7457a85214d51d1614c8560f404`
**Branch:** `feat/moh-compliance-migration`
**Assessment:** **BLOCKED — DO NOT PROMOTE**

The two authorized P0 defects are remediated and now proven by real PostgreSQL.
The exact candidate passed the complete from-zero suite twice: 20 test files,
211 tests, zero skipped or focused tests. Task 02 remains blocked because the
predecessor upgrade, restart-persistence contract, S27 export reconstruction,
Task 11 review, recovery, G1-L, live verification, and G4 remain incomplete.

## Locked identity

| Fact | Value |
|---|---|
| Migration head | `0018_clever_mister_fear` |
| Predecessor | `0017_tense_pandemic` |
| Migration SHA-256 | `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c` |
| Ordered chain digest | `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb` |
| G1-D approval | Exact, expiring, granted by Royian Chowdhury; execution complete |
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

Do not weaken tmpfs or substitute reload for restart. Resolve this through a
separately reviewed persistence-capable disposable harness (for example, an
ephemeral volume with exact ownership and teardown controls) or an independent
decision changing the evidence contract.

## Remaining gap register

| ID | Status | Gap / next action |
|---|---|---|
| GAP-01 | RESOLVED | Completion/audit atomicity passed fault injection on real PostgreSQL. |
| GAP-02 | RESOLVED | Orientation override removed; hard gate passed. |
| GAP-03 | BLOCKED | From-zero and runtime matrix pass; independent `0017 → 0018` upgrade, full bypass matrix, and restart-persistence proof remain. |
| GAP-04 | BLOCKED | S27: approve canonical export-hash and reconstruction semantics; do not invent them. |
| GAP-05 | BLOCKED | G1-L/S17: recovery proof, exact live target, preflight, one-time apply, and parity evidence absent. |
| GAP-06 | BLOCKED | S25: independent Task 11 review has not examined this candidate/evidence. |

No production command, credential, live row, PHI, external integration, claim,
or deployment was used. The correct overall status remains **BLOCKED**.
