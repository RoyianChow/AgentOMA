# Task 02 — close the P0 production-readiness gap

**Owner profile:** senior backend/database developer

**Priority:** P0; blocks PHI-bearing roadmap phases

**Status:** partially blocked by lead approval and two human policy decisions

## Goal

Bring the current defensible assessment workflow to a verified deployment
baseline before new online-pharmacy functionality is connected to it.

## Scope

- Review the existing `0018_clever_mister_fear` SQL and its repository tests.
- With explicit lead approval, replay the chain from zero in Docker, run the
  complete real-Postgres suite, and apply the already-reviewed migration using
  `db:migrate`.
- Verify live table presence, immutability trigger, app-role privileges,
  tenancy counts, and failure atomicity.
- Exercise a realistic synthetic P0-C completion and all safe refusal paths.
- Add `assessment_billability_evidence` to assessment PDF and complete-patient
  export/manifest retrieval.
- Re-prove that a red-flag exit creates zero assessment evidence and zero claim
  rows.
- Prepare separate decision-ready notes for the LTC and orientation questions;
  do not implement an answer by inference.

## Explicit authorization boundary

This task file does not authorize editing or applying a migration. The lead must
approve that operation separately, as required by `AGENTS.md`. It never
authorizes changes to triage, reference data, claim derivation, or audit logic.

## Dependencies

- Existing P0-C application code and migration `0018`.
- Docker Desktop/local Postgres.
- Lead migration approval.
- ODB Help Desk/pilot-pharmacist decision for LTC.
- Product/compliance decision for the orientation override.

## Deliverables

1. SQL review note and from-zero migration evidence.
2. Full test report including constraint/concurrency suites.
3. Live aggregate verification report after approved migration.
4. Export schema update with manifest/hash coverage.
5. Synthetic end-to-end pharmacist validation record.
6. Updated status, compliance, handoff, and restore-drill documentation.

## Acceptance criteria

- Repository, fresh Docker, and live Supabase report the same reviewed migration
  head.
- The app role cannot mutate/delete completion evidence.
- Billable completion stores exactly one immutable evidence row and the correct
  active claim draft; non-billable completion stores no claim draft.
- Complete patient retrieval includes the evidence used to make the decision.
- Red-flag zero-claim behaviour remains proven.
- LTC remains safely parked and the orientation issue remains blocked until
  authoritative decisions are recorded.

## Stop conditions

Stop on migration hash drift, unexpected live tables/rows/grants, destructive
SQL, production data mismatch, or any request to “temporarily” weaken a guard.
