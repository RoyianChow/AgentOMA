# Session handoff

**Updated:** 2026-08-02

**Branch:** `feat/moh-compliance-migration`

**Task 02 candidate:** `4f8fdd844c243f5dafcf4e78652116a9d632b222`

**Task 02 status:** **FAIL; DO NOT PROMOTE**

## Current product state

AgentOMA remains an authenticated, single-pharmacy Ontario minor-ailments pilot.
The public `/check` and `/assessment` flows collect no identifying data;
`/pharmacist/*` is invitation-only with password and TOTP. The application
creates a claim draft for hand-entry and does not submit to HNS.

The repository migration chain ends at `0018_clever_mister_fear`; the last
documented live/fresh-Docker state is still `0017_tense_pandemic`. `db:push` is
banned. No Task 02 migration or live database command was run.

## Task 02 work completed

- Baseline, static SQL review, threat model, operational runbook, LTC and
  orientation decision notes, release checklist, evidence index, manifest, and
  final handoff/report are under `docs/p0/task-02/` and
  `artifacts/p0/task-02/`.
- Existing immutable billability evidence is now serialized without defaults or
  derivation and included in the authorized record page, assessment PDF, and
  complete-patient export. Export schema version is 3.
- Evidence is missing rather than inferred when the historical sidecar is absent.
- Patient names were removed from exported filenames; server responses remain
  private/no-store; touched audit-failure logging is payload-free.
- The destructive DB harness accepts only exact local test URLs, and Docker
  Postgres is bound to loopback.
- Candidate checks: TypeScript PASS, lint PASS, 110/110 pure tests PASS, build PASS.

## Why Task 02 fails

Two mandatory invariants are proven false on surfaces protected by `AGENTS.md`:

1. The completion transaction commits assessment/evidence/claim before its
   mandatory `assessment_created` audit write. The audit write is best-effort,
   so T02-13 failure atomicity is false.
2. Current code/tests permit an admin orientation override to complete a
   billable assessment while G3 remains unresolved, so T02-18 is false.

No protected fix was attempted. A general request to complete Task 02 is not the
explicit lead sign-off required to edit completion/audit semantics.

## Verification not performed

- G1-D was not granted and Docker Desktop was not running. Full-chain replay,
  predecessor upgrade, constraints/grants, concurrency, red-flag, referral,
  and DB-backed export tests were not run.
- G1-L/G4 were not granted. No live connection, backup/restore check, migration,
  catalog query, aggregate query, or production promotion occurred.
- Existing export hashes include changing generation/history state; S27 blocks
  silently inventing a replacement canonical-hash contract.
- Task 11 has parallel uncommitted work in
  `docs/tasks/autonomous-pharmacy/TASK-11-quality-security-release.md` and
  `docs/task-11/`. It was preserved but not treated as reviewed evidence.

## Safe next sequence

1. Read `docs/p0/task-02/production-handoff.md` and `final-report.md`.
2. Obtain explicit lead approval for the protected atomic-audit remediation and
   resolve the orientation G3 policy.
3. Commit those changes and re-freeze all hashes.
4. Obtain exact, expiring G1-D approval for the new clean candidate and local
   synthetic database; start Docker Desktop and execute the complete DB suite.
5. Resolve the canonical export-hash/reconstruction contract and obtain Task 11
   review.
6. Only after those pass, establish recovery proof and request exact G1-L/G4.

## Standing fences

Do not edit approved triage/red-flag content, reference PIN data, existing
migrations, `deriveClaimDraft`, audit integrity, the five-outcome structure, or
zero-PHI intake without explicit lead sign-off. LTC remains parked. The 365-day
count stays advisory, and only HNS adjudication determines payment.
