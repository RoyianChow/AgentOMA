# Task 02 migration, verification, and recovery runbook

This is an operator runbook, not approval. **Do not execute a mutating command
unless the gate record names the exact candidate commit, migration hash and
environment.** `db:push`, manual SQL editors, migration-history edits, live
synthetic writes, and ambiguous retries are prohibited.

## Immutable identifiers

- Migration head: `0018_clever_mister_fear`
- Migration path: `src/lib/db/migrations/0018_clever_mister_fear.sql`
- Reviewed migration SHA-256:
  `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c`
- Reviewed chain digest:
  `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb`
- Configured live command ID: `npm:db:migrate`

Recompute these from the frozen candidate. A mismatch invalidates approval and
stops the run.

## G1-D — disposable Docker

### Required approval wording and preconditions

The lead must explicitly grant execution of the complete chain through 0018
for the full candidate SHA and migration SHA above, **only** against a newly
created disposable local Docker PostgreSQL database. The record must say that
no live URL, credentials, data, or external route is authorized.

Before execution:

1. Freeze a clean candidate commit and record full SHA.
2. Confirm Docker Desktop is running with `docker version`; both client and
   server must respond.
3. Confirm no existing `agentoma-test-db` container is being reused. If one
   exists, stop and determine ownership; do not destroy another developer's
   environment.
4. Review `docker compose config`: image must be `postgres:16-alpine`, host
   binding `127.0.0.1:5433`, database `agentoma_test`, tmpfs storage, and no
   live environment/secret mount.
5. Re-run the pure endpoint-guard tests. They accept only
   `localhost|127.0.0.1:5433/agentoma_test` or the internal
   `test-db:5432/agentoma_test` endpoint.
6. Record image digest and PostgreSQL server version after startup.

### From-zero run

After revalidating G1-D and hashes:

```powershell
npm run test:db:up
npm test
```

`npm test` invokes the repository global setup, which calls the executable
local-only guard, drops/recreates only the disposable `public` and `drizzle`
schemas, runs the full file-based migration chain, and seeds deterministic
reference fixtures. A non-zero or ambiguous result is FAIL; do not relabel a
partial run as evidence.

Record sanitized command ID, UTC start/end, exit code, test totals, server
version, candidate SHA, migration/chain hashes, and safe catalog/count results.
Never persist raw SQL errors, connection URLs, fixture row contents, or clinical
payloads.

After the test, run read-only catalog/invariant checks before teardown. The
current exact environment **cannot provide restart-persistence proof**:

- restarting the container clears its required tmpfs database; and
- PostgreSQL is PID 1 in `postgres:16-alpine`, so `pg_ctl restart` stops the
  container before PostgreSQL can restart.

Both behaviors were observed and retained in
`evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/restart-persistence.json`.
Do not weaken tmpfs, silently add a volume, or relabel reload as restart. A
separately reviewed persistence-capable disposable harness, with exact
ownership and teardown controls, is required before this proof can be PASS.

### Predecessor-upgrade run

The current generic Vitest setup always rebuilds from zero. It is not an
independent predecessor-upgrade proof. Until a reviewed local-only runner can:

1. migrate an empty disposable instance through 0017;
2. seed unmistakably synthetic pre-migration patient/assessment rows;
3. capture safe counts/catalog fingerprint;
4. apply the unmodified repository 0018 once through Drizzle; and
5. compare preserved counts, new objects, grants and zero evidence rows,

report predecessor upgrade as **NOT RUN**, not PASS. Do not simulate it by
editing 0018 or manually changing `__drizzle_migrations`.

### Docker failure and teardown

On a confirmed failure, preserve only sanitized evidence, stop, and keep or
destroy the isolated instance according to the investigation owner's decision.
On success and evidence capture:

```powershell
npm run test:db:down
```

Confirm the exact task container/network is gone. The command is destructive;
run it only after verifying the target belongs to this task.

## G1-L — live preflight and one-time apply

G1-L is distinct from G1-D. It must bind the candidate SHA, migration SHA,
non-secret Supabase project reference, named operator, observer/reviewer, and
approved UTC change window. All Docker release-blocking checks must already be
green.

### Read-only preflight

Using only the configured, authorized workflow and catalog/aggregate queries:

- verify Canadian project/region through approved provider metadata;
- verify PostgreSQL version and current head is exactly 0017;
- verify the runtime application connection role is non-owner `agentoma_app`;
- compare required tables, constraints, triggers, functions, policies and
  grants to the reviewed predecessor baseline;
- capture counts only for tenant, patient, assessment, evidence, claim and
  audit tables—never row contents;
- expect evidence table absent before apply and evidence-row delta zero after;
- verify no unexpected tenant or schema delta;
- bind current Docker evidence to the same commit and chain digest; and
- verify backup/restore preconditions below.

Stop if the live head is not exactly the approved predecessor, if 0018 appears
partially present, if the runtime is owner, or if any target/hash/aggregate is
unexpected.

### Backup/recovery precondition

Before live mutation, record an approved restore point/backup identifier,
creation time, scope, retention/expiry, encryption/access owner, latest
successful isolated restore-drill evidence, applicable recovery-policy
reference, recovery owner, and the authority who chooses rollback versus
forward fix. A backup listing alone is insufficient. Missing restorability is
stop condition S17.

### One-time live application

Immediately before execution, recompute candidate/migration/chain hashes,
recheck project identity, G1-L and window. Then run exactly:

```powershell
npm run db:migrate
```

Capture UTC start/end, command ID and sanitized exit status. Apply once. Do not
use `db:push`, Supabase SQL editor, pasted SQL, alternate migration tools, a
history repair, rollback, or a second run after timeout/lost connection.

### Live failure or ambiguity

Stop, do not retry, block application promotion, preserve safe catalog/history
metadata, and escalate to the migration owner plus incident/change authority.
The separately authorized owner decides rollback versus forward fix. Task 02
does not authorize either.

### Post-apply read-only verification

Verify migration head/history, table/columns, all checks/FKs/indexes, trigger
and function state, RLS inventory, exact app-role grants/revokes, expected zero
row delta for evidence, unchanged patient/assessment/claim/audit aggregates,
and absence of unexpected objects or privilege expansion. Live immutability is
catalog proof plus exact Docker runtime evidence; never run destructive tests
against live rows.

## Promotion and handoff

Update the evidence manifest, Task 11 capability/release record, compliance and
handoff status. Promotion requires G4 from the independent reviewers against
the exact evidence manifest and source commit. Assessment audit atomicity and
the orientation hard gate were remediated under the scoped 2026-08-02 lead
approval; their real-PostgreSQL tests must pass under G1-D before any
production-readiness claim is possible.
