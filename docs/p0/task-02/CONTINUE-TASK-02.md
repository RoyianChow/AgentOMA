# Task 02 continuation handoff

**Recorded:** 2026-08-03  
**Branch:** `feat/moh-compliance-migration`  
**Status:** **BLOCKED — DO NOT PROMOTE**  
**Next developer:** continue from this file, then read `AGENTS.md`,
`docs/p0/task-02/g1-d-predecessor-upgrade-approval-contract.md`, and the
assigned Task 02 brief in `docs/tasks/autonomous-pharmacy/`.

## Current repository state

- Current HEAD: `c560fabb3c5c5780fc4896725c39e8ebeb34a2da`.
- This commit records the latest failed G1-D evidence only; no production code,
  migration SQL, migration history, or live database was changed by that run.
- Migration head remains `0018_clever_mister_fear`.
- Predecessor remains `0017_tense_pandemic`.
- Migration SHA-256 remains
  `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c`.
- Ordered migration-chain digest remains
  `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb`.
- Live Supabase is still at migration `0017`; do not apply `0018` in this
  workstream until G1-L and the required release decisions exist.
- The worktree was clean immediately before this handoff was created.

## What is already complete

- The P0-C atomicity and orientation-gate changes were proven against real
  disposable PostgreSQL in the passing candidate
  `dcaab91f9adba7457a85214d51d1614c8560f404`.
- The full from-zero suite passed twice: 20 test files, 211 tests, no skipped
  or focused tests.
- Passing coverage includes required-audit rollback atomicity, migration replay,
  tenancy isolation, evidence/audit immutability, claim and follow-up races,
  red-flag zero-claim behaviour, completed-referral separation, and persisted
  evidence export.
- The predecessor/restart runner is fail-closed, synthetic-only, loopback-only,
  and owns creation and destruction of its exact container, network, and named
  volume.
- The runner now distinguishes loopback TCP denial from PostgreSQL protocol or
  identity denial without recording raw errors.
- The ordinary test database preflight and runtime inspection passed as
  `T02-04`; this does not by itself prove Task 02 port `5434` is reachable.

## Latest G1-D evidence

The latest exact candidate was `4e4795145c7acccefed5df47de3113c9e56b664e`.
Its approval was accepted, but its single runtime attempt failed closed:

```text
T02-07/T02-08: FAIL
Reason: LOOPBACK_TCP_DENIED
Evidence SHA-256: 55ecdf1e01eb5dbccd9a542e37ad58949d7dc207675ad9a8d5116d0a49ecf8ec
Teardown: PASS
```

Evidence:

`docs/p0/task-02/evidence/runs/4e4795145c7acccefed5df47de3113c9e56b664e/predecessor-upgrade-run.json`

The run did not reach PostgreSQL identity, migration `0017`, fixture insertion,
`0018`, catalog/grant checks, or restart persistence. It used no PHI,
production credentials, Supabase access, external integration, `db:push`, or
manual migration-history edit. The exact candidate `4e479514...` must not be
rerun.

Earlier predecessor-run candidates are also closed and must not be rerun:

| Candidate | Result | Reason |
|---|---|---|
| `dd503a14da24ea80a0f0e046e179f6b4b4e77b3c` | FAIL | `DATABASE_IDENTITY_DENIED` |
| `5b576b7ba8be6917c133590aee5e1fa0d33368d4` | FAIL | `DATABASE_CONNECTIVITY_DENIED` |
| `3a271a7d3cc941e4c8de62c630d2a75409fdc0a1` | FAIL | `LOOPBACK_TCP_DENIED` |
| `4e4795145c7acccefed5df47de3113c9e56b664e` | FAIL | `LOOPBACK_TCP_DENIED` |

## Immediate next investigation

Do not start the Task 02 named service manually. First determine whether
Docker's ordinary loopback forwarding works while the ordinary test database
is actually running:

```powershell
npm run test:db:up
```

In a second PowerShell window:

```powershell
docker port agentoma-test-db
Test-NetConnection -ComputerName 127.0.0.1 -Port 5433 -InformationLevel Detailed
```

Then return to the first window:

```powershell
npm run test:db:down
```

Interpretation:

- `TcpTestSucceeded: False` means Docker Desktop host-port forwarding needs
  repair before another Task 02 attempt.
- `TcpTestSucceeded: True` means ordinary Docker loopback works; investigate
  the Task 02 `5434` binding/readiness path in
  `docker-compose.task-02-upgrade.yml` and
  `tools/task-02/predecessor-upgrade-db.ts`.

The post-run `Test-NetConnection` result is not useful after the gated runner
tears down its resources. The check must run while its target is alive.

## Candidate and approval rules

The current HEAD is an evidence-preservation commit, not a passing G1-D proof.
After the investigation:

1. If a harness/Compose change is necessary, make only the narrowly scoped
   database-free fix. Add or update safe tests, then run `tsc`, pure tests,
   lint, and build before committing.
2. Freeze a new clean candidate and record its full 40-character SHA.
3. Obtain a new exact G1-D JSON approval for that SHA. The Markdown contract
   is not an approval file.
4. Use the exact installed image ID from `docker image inspect postgres:16-alpine
   --format "{{.Id}}"`.
5. Set `approved_at_utc` to an actual UTC time that is not in the future and
   set a later `expires_at_utc`.
6. Run the harness exactly once with:

```powershell
npm run test:db:upgrade -- --approval-file <absolute-path-to-approval.json>
```

The harness must be the only process that starts, restarts, or destroys the
Task 02 service. A denied approval is safe to correct and retry; a runtime
failure that writes evidence consumes that candidate and cannot be rerun.

## If G1-D eventually passes

Preserve the non-overwriting evidence and verify its SHA-256. Then continue
only in this order:

1. Resolve S27 export canonical-hash/reconstruction semantics; do not invent
   a contract.
2. Obtain independent Task 11 review bound to the exact candidate, migration
   bytes, approval, and G1-D evidence.
3. Complete recovery proof and obtain G1-L for the approved live change window.
4. Apply migration `0018` once with `npm run db:migrate`; never use
   `db:push`, manual SQL, or manual migration-history edits.
5. Verify migration state, triggers, grants, tenancy aggregates, and safe
   post-apply parity.
6. Obtain independent G4 approval. A passing test is not production approval.

## Non-negotiable fences

- No production credentials, Supabase connection, PHI, live row, external
  integration, hosted preview, or real notification.
- No `db:push`.
- No edits to existing migration SQL or migration history.
- No changes to triage content, reference PIN/fee/maximum data,
  `deriveClaimDraft`, LTC billing behaviour, or audit semantics under this
  handoff without the required explicit authority.
- Never relabel `FAIL`, `BLOCKED`, or `NOT RUN` as `PASS`.
- Never delete failed evidence to make the gate appear green.

The correct status at handoff is **Task 02 BLOCKED pending a valid, passing,
exact-candidate G1-D predecessor/restart run**.
