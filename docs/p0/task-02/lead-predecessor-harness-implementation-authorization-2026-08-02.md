# Task 02 predecessor-upgrade harness implementation authorization

**Decision date:** 2026-08-02

**Approver:** Royian Chowdhury

**Decision:** IMPLEMENTATION AUTHORIZED; EXECUTION NOT AUTHORIZED

**Repository state when recorded:**
`8fc82f76f1a8d7b16449e2f3e031a5afa69c2292`

## Verbatim authorization

> I, Royian Chowdhury, authorize implementation of a Task 02 test-only
> predecessor-upgrade and restart-persistence harness. It may use loopback-only
> Docker PostgreSQL 16 with synthetic data and a disposable volume. It must
> migrate through 0017 using the repository migration runner, seed synthetic
> existing rows, apply the unmodified 0018, verify preservation/catalog/grants,
> restart PostgreSQL, verify persistence, and destroy the exact
> container/network/volume afterward. No production credentials, Supabase
> access, PHI, external integrations, db:push, manual migration-history edits,
> or existing-migration changes are authorized. This authorizes implementation
> only—not G1-D execution, live migration, Task 11 approval, or production
> promotion.

## Authorized repository work

- Add a test-only, fail-closed harness for the exact `0017` to `0018` upgrade.
- Add a separate loopback-only PostgreSQL 16 Compose service backed by a named,
  disposable test volume so persistence can be checked across a restart.
- Use the repository Drizzle migration runner for both the predecessor and head
  phases without editing migration bytes or migration-history rows.
- Add unmistakably synthetic fixtures, safe count/catalog/grant checks,
  teardown verification, and database-free tests for the harness contract.
- Update Task 02 documentation and scripts to describe the new, still-gated
  execution path.

## Explicit limits

This record does **not** grant G1-D and therefore does not authorize starting
the new Docker service or running the predecessor/restart proof. It does not
grant G1-L, Task 11 approval, G4, Supabase access, live migration, production
deployment, PHI use, external calls, or claims. Existing migrations and the
migration registry remain immutable; `db:push` and manual migration-history
changes remain prohibited.

After implementation and database-free verification, the repository must be
frozen at a new clean candidate. Running the harness requires a separate G1-D
approval bound to that exact candidate, migration hash, environment, and UTC
window.
