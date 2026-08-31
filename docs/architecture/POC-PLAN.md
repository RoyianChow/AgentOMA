# AgentOMA — Documented Proof of Concept Plan (Workstream 5)

**Status: PLAN ONLY. Nothing described in this document has been implemented or run.**

Per the task brief: *"Wait for Product Lead and Security/Privacy approval before writing or
running the PoC."* This document is that checkpoint. No PoC file has been created, no dependency
installed, no Docker container started, and no resource of any kind provisioned as part of
producing this plan.

## Why this PoC compares the current architecture against a *practice*, not a *vendor*

Workstream 5's brief asks for a PoC "comparing the current architecture with the recommended
alternative." The evidence-based recommendation from this review
([`TARGET-ARCHITECTURE.md`](TARGET-ARCHITECTURE.md), ADR-001, ADR-002) is **to retain the current
database and, conditionally, the current hosting platform** — there is no alternative vendor to
build a comparative PoC against, because none was recommended. Forcing a database-migration PoC
here would misrepresent the review's own conclusion.

The actual "recommended alternative" this review produced is a **practice change**: go from
*"a restore/recovery runbook exists but has never been executed"* to *"the runbook has been
executed and its mechanics are proven, synthetically, before ever touching production."* This PoC
is designed around that — it is the most direct, evidence-grounded thing a PoC could validate
given this review's actual findings, and it exercises exactly the properties Workstream 5's own
"PoC measurements" list asks for (migration replay from zero, backup/restore, failure recovery,
query latency, transactional write behavior) using the existing architecture, not a hypothetical
new one.

## PoC scope

1. Stand up a **loopback-only Docker Postgres container** (mirroring the pattern already used by
   this repo's own `docker-compose.yml` test database — tmpfs storage, `127.0.0.1`-only binding,
   never internet-reachable).
2. Replay the full existing migration history (`0000` through `0018`) from zero, using the
   existing, already-sanctioned `db:generate`/`db:migrate` tooling — no new migration tooling is
   introduced.
3. Seed **synthetic-only** representative data at a volume roughly matching a busy single-pharmacy
   day (order-of-magnitude, not a load test) using the existing reference-seed script pattern.
4. Exercise the database-enforced guarantees already claimed in
   [`SYSTEM-DESIGN-REVIEW.md`](SYSTEM-DESIGN-REVIEW.md) §4 under concurrency: the same-day
   exclusion advisory-lock trigger, `audit_log`/`claim_draft` immutability (attempted
   UPDATE/DELETE under the application role, expected to fail), and the deferrable
   one-active-follow-up-plan constraint.
5. Take a logical backup (`pg_dump`) of the synthetic database, **destroy the container**, stand
   up a fresh one, and restore from the backup — a synthetic, loopback-only rehearsal of the same
   integrity checks `docs/RESTORE_DRILL.md` specifies for the real drill (migration-chain
   position, row counts, trigger presence, privilege checks), scaled down to fit a laptop/CI
   runner rather than a real isolated Supabase project.
6. Record timing for each phase (see "PoC measurements" below).

## Files to be added (none yet added)

- `docs/architecture/poc/docker-compose.poc.yml` — a second, PoC-scoped compose file (not a
  modification of the existing `docker-compose.yml`), loopback-only, clearly named and comment-
  marked as synthetic/temporary.
- `docs/architecture/poc/seed-poc-data.ts` — synthetic-only seed script, reusing the existing
  seed script's patterns (`src/lib/db/seed.ts`, `seed-demo.ts`) rather than inventing a new data
  shape.
- `docs/architecture/poc/run-poc.ts` — orchestration script: migrate → seed → concurrency checks →
  backup → destroy → restore → verify → report timings → teardown.
- `docs/architecture/POC-RESULTS.md` — populated only after an approved run, per the deliverables
  list.

No existing file is modified to build this PoC. No import from `src/lib/db/*` beyond what's
already exported for the existing test harness is required.

## Dependencies

None beyond what's already in the repository: Docker (already required for local dev per
`README.md`), the existing `postgres`/`drizzle-orm`/`drizzle-kit`/`tsx` dependencies already in
`package.json`. No new npm package is proposed.

## Docker or hosted resources required

**Docker only, loopback-only, ephemeral.** No hosted/cloud resource of any kind — no new Supabase
project, no cloud database, no cloud compute. This directly satisfies the brief's "Prefer a
loopback-only Docker PoC" instruction; no hosted-PoC approval is being requested.

## Network behavior

The PoC container binds to `127.0.0.1` only (mirroring the existing `test-db` service), performs
no outbound network calls, and has no path to the internet or to production Supabase. This
mirrors `src/lib/db/test/harness.ts`'s existing `assertLocalTestDb` production-denial guard
pattern — the PoC orchestration script would use the same style of guard to fail closed if pointed
at anything other than the loopback PoC container.

## Test-data design

Fully synthetic, generated by the PoC's own seed script — no data sourced from any existing
environment, no real patient/pharmacy records, no data copied from `db:seed:demo`'s fixtures
(a fresh, clearly-marked synthetic set is generated instead, to avoid any ambiguity about
provenance). All identifiers would follow this repository's established synthetic-marker
convention (e.g., clearly non-real health-card-shaped values), matching the pattern already used
in the sandbox workspace's own fixtures.

## Expected cost

**$0.** Loopback Docker only, run locally or in an existing CI runner already provisioned for
this repository's other Docker-based test jobs (`database-fresh-migrations`,
`database-constraints` in `.github/workflows/ci.yml`). No cloud resource is created, so no cloud
billing is incurred.

## Cleanup procedure

1. Stop and remove the PoC's own Docker container and any named volume (`docker compose -f
   docs/architecture/poc/docker-compose.poc.yml down -v`).
2. Delete any local backup file produced during the run.
3. Confirm no `docs/architecture/poc/` file was accidentally left holding a real value (a review
   step, since the whole point of the PoC is to prove the review's own synthetic-data discipline
   holds).
4. Record completion of teardown in `POC-RESULTS.md`.

Because this PoC never leaves loopback Docker, cleanup is a single command, not a resource-deletion
workflow across a cloud console.

## Security boundaries

- No PHI, ever — synthetic data only, generated fresh by the PoC's own script.
- No production credentials — the PoC connects only to its own loopback container using a fixed,
  non-secret local development password (matching the existing `test-db` pattern).
- No Supabase connection of any kind, production or otherwise.
- No import from protected clinical or billing modules beyond what the existing real-Postgres
  test suite already imports for the same purpose (money-rule verification) — no new access
  boundary is proposed.
- No weakening of Task 01's sandbox isolation — this PoC is not part of `apps/experiment-sandbox/`
  and does not touch it.
- No `db:push` — migration replay uses the existing `db:migrate` path exclusively.

## PoC measurements

Per the task's required list, all measured against the loopback PoC container, all reported with
explicit disclosure that these are microbenchmarks on a synthetic, small dataset — **not**
production capacity guarantees:

| Measurement | What's recorded |
|---|---|
| Connection startup and pooling | Time to first successful query after container start; behavior of the pooled-vs-direct connection split under the PoC's own light concurrency |
| Transactional write behavior | Time and success/failure of the assessment→evidence→claim→audit multi-table transaction (diagram 6) |
| Concurrent updates and race handling | Two simultaneous same-day-exclusion attempts; confirm exactly one succeeds, the advisory-lock trigger behaves as documented |
| Migration replay from zero | Wall-clock time for `db:migrate` to reach `0018` from an empty database |
| Backup and restore | Wall-clock time for `pg_dump` and for restore-to-fresh-container; confirm identical row counts and trigger/constraint presence post-restore |
| Failure recovery | Deliberately kill the container mid-write; confirm the restored backup reflects only committed transactions, nothing partial |
| Query latency using synthetic representative records | Simple read-path timing at the PoC's seeded data volume — explicitly not a load test |
| Operational setup complexity | A plain description of the steps a new engineer would need to run this PoC themselves, as a proxy for how approachable the existing migration/backup discipline actually is |

## What this PoC would prove and what it would not

**Would prove:** that this repository's existing backup/restore/migration discipline works
end-to-end when actually exercised — directly derisking the real restore drill
(`docs/RESTORE_DRILL.md`) before it's run against an isolated real Supabase project for the first
time.

**Would not prove:** anything about a different database or hosting vendor (none is being
tested, consistent with the "stay with current stack" recommendation), anything about production
capacity or load behavior (explicitly out of scope per the task's own "do not present
microbenchmarks as production guarantees" instruction), or anything about real Supabase PITR
specifically (a loopback Docker Postgres does not have Supabase's managed PITR feature — this PoC
validates the *logical backup/restore discipline* this app's own migrations enable, which is a
different and complementary thing to confirming Supabase PITR is turned on).

---

**This PoC does not proceed to implementation without explicit Product Lead and Security/Privacy
approval, recorded separately from this document.**
