# Task 02 predecessor-upgrade connectivity diagnostic

**Recorded:** 2026-08-02
**Scope:** test/evidence harness only
**Execution status:** **NOT RUN — new candidate requires fresh G1-D**

## Why this exists

The two preserved predecessor-harness runs both stopped before migration or
synthetic fixture writes. The remediated run on `5b576b7b…` reported
`DATABASE_CONNECTIVITY_DENIED`, which previously conflated two distinct safe
states:

1. Docker's loopback binding never accepted a TCP connection from the host.
2. TCP was available, but the subsequent PostgreSQL readiness query did not
   complete.

The old reason did not reveal which boundary failed, and raw socket or database
errors must not be logged into evidence.

## Implemented safe boundary

`tools/task-02/predecessor-upgrade-db.ts` now performs a bounded IPv4 TCP probe
to the exact contract endpoint (`127.0.0.1:5434`) before creating a PostgreSQL
client or touching the migration view. It sends no credentials or SQL.

- A port that does not accept a connection becomes
  `LOOPBACK_TCP_DENIED`.
- Once TCP succeeds, an unsuccessful PostgreSQL identity/readiness query becomes
  `DATABASE_PROTOCOL_DENIED`.
- Wrong database identity, role, version, migration history, or unexpected
  pre-migration tables retain their existing distinct safe reasons.

The retry window is bounded, error payloads are discarded, no console output is
introduced, and all migration and fixture operations remain after both probes.

## Regression evidence

The pure regression test verifies that a synthetic connection failure is
retried, that the eventual safe denial contains no raw synthetic error value,
and that TCP and PostgreSQL readiness occur before the first migration call.

| Check | Result |
|---|---|
| Targeted predecessor-harness contract test | PASS — 17 tests |
| `npx tsc --noEmit` | PASS |
| `npm run test:pure` | PASS — 14 files, 140 tests |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| Docker predecessor/restart execution | **NOT RUN** — prior G1-D is tied to different source bytes |

## Boundary and next action

This change does not alter a migration, registry, assessment completion,
clinical/billing rule, audit behavior, authentication, production configuration,
or database data. It does not establish that the next Docker run will pass; it
only makes a future failure safely distinguishable.

Freeze this change as a clean candidate, obtain a fresh exact G1-D bound to that
commit, the reviewed migration bytes, and the disposable local Docker
environment, then run only the orchestrated predecessor-upgrade command. Do
not manually start the named-volume service or rerun either failed candidate.
