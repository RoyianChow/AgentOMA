# Session handoff

**Updated:** 2026-07-25  
**Branch:** `feat/moh-compliance-migration`  
**Repository status:** working tree clean after the documentation/comment audit;
branch is three commits ahead of `origin/feat/moh-compliance-migration` and has
not been pushed.
**Stopping point:** follow-up tracking is implemented, Docker-verified, and
live in Supabase through migration `0017`

## Database state

- Supabase, the repository, and the fresh-Docker test path are applied through
  `0017_tense_pandemic`, which adds:
  - immutable follow-up plan and attempt rows linked to assessments;
  - a deferrable one-active-plan exclusion constraint;
  - link validation, retention inheritance/recomputation, and
    supersede-not-edit triggers;
  - app-role `UPDATE`/`DELETE` revocation with only
    `superseded_by_id` update permission.
- `0015_tidy_luke_cage`:
  - deleted the two approved disposable TEST tenants and their dependent
    clinical rows;
  - preserved Demo Pharmacy's three auth users and TOTP enrollments;
  - removed the known cross-TEST-pharmacy assessment/patient defect;
  - added a checked unique singleton key, so a second pharmacy cannot exist.
- `0016_brown_lightspeed`:
  - patient-wide retention recomputation;
  - export manifests and SHA-256 artifact hashes;
  - database-enforced holds;
  - access/correction requests and immutable correction supersession;
  - dry-run-first, two-admin, hold-aware deliberate destruction;
  - restore-drill and audit-write-failure evidence;
  - source-record immutability and app-role revokes.
- All 18 migration timestamps are recorded. `0015` and `0016` match their
  checked-in hashes exactly. The stored `0012` hash matches the same checked-in
  SQL rendered with CRLF line endings; the checkout is LF, so this is an
  encoding representation difference, not SQL drift.
- `db:push` remains banned. Use `db:generate` → SQL review → `db:migrate`.

## Live post-migration tenancy evidence

`npm run db:inspect-tenancy` returned `clean: true`:

| Pharmacy | Patients | Intakes | Assessments | Audits at inspection | Users |
|---|---:|---:|---:|---:|---:|
| Demo | 8 | 12 | 7 | 28 | 3 |

- Pharmacy rows: 1.
- Cross-pharmacy duplicate health-number groups: 0.
- Assessment/patient tenant mismatches: 0.
- Users outside Demo or without a pharmacy: 0.
- TOTP rows: 3; users marked TOTP-enabled: 3.
- Audit counts are append-only and may grow after this snapshot.

## Live governance and retention evidence

- The previously verified money-rule, immutability, retention, hold, and
  correction triggers remain installed; `0017` adds and live verification
  confirms all three follow-up triggers.
- The runtime database connection identifies as non-owner `agentoma_app`; it
  owns no public tables.
- `agentoma_app` cannot update/delete `audit_log` or delete patient,
  assessment, intake, or claim-draft rows through ordinary table privileges.
- The role can update only the approved hold-release/correction-supersession
  columns and can execute the controlled-destruction function.
- Controlled destruction is `SECURITY DEFINER`; `PUBLIC` has no execute grant.
- All nine governance tables are live.
- Seven patients with services have seven retention rows; no patient-wide or
  assessment horizon mismatch exists. The synthetic child retains through
  2047.
- Reference verification reports 4 ODB tiers, 23 ailment groups, 92 PINs, and
  2 claim rules.
- Live `follow_up` verification reports zero pre-existing rows, all three
  expected triggers, a deferrable active-plan exclusion constraint, runtime
  role `agentoma_app`, no DELETE or ordinary field UPDATE permission, and only
  the approved `superseded_by_id` UPDATE grant.

## Implemented application boundary

- `.env` has `PHARMACY_ID` set to Demo; `.env.example` documents it.
- Portal guards require the session user to match the configured pharmacy.
- Intake retains the legacy `?pharmacy=` query but ignores it for tenancy.
- Invitations, audit writes, bootstrap, and demo seed use the configured ID.
- `npm run db:inspect-tenancy` is read-only and emits aggregate tenancy evidence
  only.
- `/pharmacist/governance` is pharmacy-admin-only and fully server-rendered.
- Billable assessment completion requires a structured follow-up due date,
  phone/in-person method, and monitoring parameters before any clinical or
  claim row is written.
- `/pharmacist/follow-ups` is server-rendered and pharmacy-scoped. It records
  reached and not-reached attempts, safety/efficacy evaluation, disposition,
  notes, and immutable corrections. The dashboard shows open/overdue items.
- Follow-up create/record/supersede actions are audited, and complete-patient
  export schema v2 includes all follow-up rows.

## Verification

- Docker Postgres: `localhost:5433`, guarded against non-local URLs.
- Fresh migration replay from zero through `0017`: green; the same migration
  is live in Supabase.
- `tsc --noEmit`: green.
- ESLint: green.
- Vitest: 13 files, 133 tests, all green.
- Governance tests prove retention extension, hold-blocked destruction,
  second-admin execution, immutable correction supersession, and hashed export
  manifests.
- Follow-up tests prove the completion requirement, not-reached handling,
  reached closure, supersession/rollback, grant-level immutability, retention
  extension, export/destruction inclusion, and one-winner concurrent closure.

## Next operator steps

1. Smoke-test sign-in/TOTP for all intended roles and
   `/pharmacist/governance` against synthetic records.
2. Exercise a synthetic billable completion and both reached/not-reached
   follow-up paths, then confirm assessment PDF and patient export output.
3. Exercise complete export, patient and record holds, request decision,
   correction supersession, destruction dry run, and second-admin refusal.
   Do not execute destruction against retained records.
4. Perform and record the first isolated Canadian-region restore drill using
   [`RESTORE_DRILL.md`](RESTORE_DRILL.md).
5. Continue the P0 clinical, LTC, orientation, eligibility, prescription, and
   claim-history blockers in [`NEXT_STEPS.md`](NEXT_STEPS.md).

## Fences

Do not change triage/red flags (including the unverified tick-bite 72-hour
value), reference PINs, `deriveClaimDraft`, the five outcomes, or zero-PHI
intake without lead sign-off. LTC claim drafting remains parked; see
[`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).
