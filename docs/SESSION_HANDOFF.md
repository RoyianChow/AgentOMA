# Session handoff

**Updated:** 2026-08-02

**Branch:** `feat/moh-compliance-migration`

**Task 02 candidate:** `813e360546f6dc1b4c03ead5de7d22002f063759`

**Task 02 status:** **BLOCKED; DO NOT PROMOTE**

## Current product state

AgentOMA is an authenticated, single-pharmacy Ontario minor-ailments pilot, not
a production-ready service. Public `/check` and `/assessment` collect no
identifying data; `/pharmacist/*` requires password, TOTP, and server-side role
and pharmacy checks. Claim drafts are for hand-entry and are never submitted to
HNS from this application.

The repository migration chain ends at `0018_clever_mister_fear`; the last
documented live/fresh-Docker state remains `0017_tense_pandemic`. `db:push` is
banned. No Task 02 database or live command ran.

## Task 02 remediation completed

Royian Chowdhury granted narrow lead authorization for two protected fixes. The
decision is recorded at
`docs/p0/task-02/lead-remediation-authorization-2026-08-02.md`.

1. `createAssessment()` now writes the required assessment-created audit inside
   the same transaction as assessment, immutable billability evidence, claim
   draft, follow-up, and intake consumption. Audit failure propagates and rolls
   the transaction back.
2. G3 is decided as **HARD GATE; NO ADMIN OVERRIDE**. The request field, admin
   branch, workspace override UI/state, and override audit event were removed.

The candidate adds a real-PostgreSQL failure-injection test that rejects the
required assessment audit and expects every completion row to remain absent and
the intake unconsumed. Pure regressions enforce the transaction placement and
absence of client/server override symbols.

Candidate verification: TypeScript PASS, lint PASS, 113/113 pure tests PASS,
production build PASS. No migration, triage, reference data, claim derivation,
LTC, authentication architecture, live data, claim, or external system changed.

## Why Task 02 remains blocked

- G1-D was not granted and Docker Desktop is unavailable. The new transaction
  test and all migration/constraint/role/concurrency/clinical DB tests are NOT
  RUN.
- Export canonical-hash and reconstruction semantics remain blocked by S27.
- Task 11 has not reviewed the exact candidate/evidence.
- Recovery evidence, G1-L, live apply/parity, and G4 are absent.

No mandatory invariant is currently proven false; assessment-audit atomicity is
implemented but still requires real-PostgreSQL proof.

## Safe next sequence

1. Keep candidate `813e3605…` unchanged and obtain exact, expiring G1-D bound
   to its full SHA, migration hash, chain digest, Docker identity, and commands.
2. Start Docker Desktop and run the complete suite, including the new required
   assessment-audit failure test and from-zero/0017→0018 replays.
3. Rebind evidence and obtain Task 11 review.
4. Resolve S27 under an approved export/reconstruction contract.
5. Establish recovery proof, then separately obtain G1-L and G4.

## Standing fences

Do not edit triage/red-flag content, reference PIN data, existing migrations,
`deriveClaimDraft`, LTC behavior, the five-outcome structure, or zero-PHI intake
without separate explicit authorization. The 365-day count remains advisory;
only HNS adjudication determines payment.
