# Task 02 predecessor-upgrade failure record — `5b576b7b`

**Recorded:** 2026-08-02
**Execution status:** **FAIL — fail closed**
**Overall Task 02 status:** **BLOCKED — DO NOT PROMOTE**

## Bound run

| Fact | Value |
|---|---|
| Candidate | `5b576b7ba8be6917c133590aee5e1fa0d33368d4` |
| G1-D approver | Royian Chowdhury |
| Approval window | 2026-08-02T08:53:26Z to 2026-08-02T12:53:26Z |
| Migration head | `0018_clever_mister_fear` |
| Migration SHA-256 | `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c` |
| Chain digest | `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb` |
| Command | `npm run test:db:upgrade -- --approval-file <external G1-D record>` |
| Result | Exit 1 — `DATABASE_CONNECTIVITY_DENIED` |
| Evidence | `docs/p0/task-02/evidence/runs/5b576b7ba8be6917c133590aee5e1fa0d33368d4/predecessor-upgrade-run.json` |
| Evidence SHA-256 | `7f866b65138cdb9d0c231d120c739e9e5c7a10defaf838b77978f32519fb8649` |

## Observed safe state

The gated runner verified the local Docker image, loopback binding, internal
network, and disposable named-volume configuration. Its bounded, read-only host
connection probe then denied execution with `DATABASE_CONNECTIVITY_DENIED`.
PostgreSQL version, migration history, fixtures, migration application, catalog
checks, and restart verification were not reached.

No database migration or synthetic fixture write occurred. The run did not use
Supabase, PHI, production credentials, external integrations, `db:push`, or
manual migration-history edits. Finally-block teardown passed; the exact
container, network, and volume were absent after the run.

## Impact and next action

T02-07 and T02-08 still have no passing predecessor-upgrade/restart runtime
proof. This evidence path is non-overwriting, so candidate `5b576b7b…` must not
be rerun.

Do not manually start the named-volume Compose service. Diagnose or change the
harness only under a separately scoped, database-free implementation decision;
then freeze a new clean candidate and obtain a fresh exact G1-D before another
single orchestrated run. S27, independent Task 11 review, recovery, G1-L, and
G4 remain outside this approval.
