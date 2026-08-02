# Task 02 predecessor-upgrade failure record — `dd503a14`

**Recorded:** 2026-08-02  
**Execution status:** **FAIL — fail closed**  
**Overall Task 02 status:** **BLOCKED — DO NOT PROMOTE**

## Bound run

| Fact | Value |
|---|---|
| Candidate | `dd503a14da24ea80a0f0e046e179f6b4b4e77b3c` |
| Migration head | `0018_clever_mister_fear` |
| Migration SHA-256 | `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c` |
| Chain digest | `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb` |
| Command | `npm run test:db:upgrade -- --approval-file <external G1-D record>` |
| UTC window | 2026-08-02T08:21:32Z to 2026-08-02T12:21:32Z |
| Result | Exit 1 — `DATABASE_IDENTITY_DENIED` |
| Evidence | `docs/p0/task-02/evidence/runs/dd503a14da24ea80a0f0e046e179f6b4b4e77b3c/predecessor-upgrade-run.json` |
| Evidence SHA-256 | `8700c9fd1aa6572ea144cd1b9cbb7ca0657ed673fa7dd50c80ec6a5e8c019e24` |

## Observed safe state

The exact loopback-only PostgreSQL 16 container reached the harness runtime
checks. The first database identity probe then denied execution. No migration,
fixture write, database-row inspection, Supabase connection, PHI, production
credential, external integration, `db:push`, or manual migration-history edit
occurred. Finally-block teardown passed and the exact container, network, and
volume were absent after the run.

## Impact and remediation

T02-07 and T02-08 have **no passing runtime proof** for this candidate. The
non-overwriting evidence path means this candidate must not be rerun.

The harness now has a bounded, read-only loopback readiness probe and granular
safe reasons for connectivity, identity shape, principal, PostgreSQL version,
migration history, and unexpected pre-migration tables. This does not alter
the migration, source data, or Docker isolation. Freeze a new clean candidate,
obtain a new exact G1-D approval, then run the single orchestrated command.

No live or promotion gate is authorized by this record.
