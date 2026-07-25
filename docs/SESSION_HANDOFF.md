# Session handoff

**Updated:** 2026-07-25  
**Branch:** `feat/moh-compliance-migration`  
**Stopping point:** code and Docker verification complete; live migration not applied

## Database state

- Supabase is live through `0014_p0_d_ltc_fact_capture`.
- `0015_tidy_luke_cage.sql` is staged:
  - keeps Demo Pharmacy `00000000-0000-0000-0000-000000000000`;
  - refuses to alter any user outside Demo (protects the three enrolled
    auth/TOTP accounts);
  - removes the two approved disposable TEST tenants and their patients,
    assessments, claim drafts, intakes, invitations, and tenant-linked audits;
  - removes the known cross-TEST-pharmacy assessment/patient defect;
  - adds a checked unique singleton key so a second pharmacy cannot exist.
- `0016_brown_lightspeed.sql` is staged:
  - patient-wide retention recomputation;
  - export manifests and SHA-256 artifact hashes;
  - database-enforced holds;
  - access/correction requests and immutable correction supersession;
  - dry-run-first, two-admin, hold-aware deliberate destruction;
  - restore-drill and audit-write-failure evidence;
  - source-record immutability and app-role revokes.
- `db:push` remains banned. Use `db:generate` → SQL review → `db:migrate`.

## Live pre-migration tenancy audit

| Pharmacy | Patients | Intakes | Assessments | Audits | Users |
|---|---:|---:|---:|---:|---:|
| Demo | 8 | 12 | 7 | 28 | 3 |
| TEST Pilot | 3 | 0 | 4 | 0 | 0 |
| TEST Rural | 0 | 0 | 1 | 0 | 0 |

One assessment links the TEST Rural pharmacy to a TEST Pilot patient. Both
records are in the approved deletion set; nothing is reassigned.

## Implemented application boundary

- `.env` has `PHARMACY_ID` set to Demo; `.env.example` documents it.
- Portal guards require the session user to match the configured pharmacy.
- Intake retains the legacy `?pharmacy=` query but ignores it for tenancy.
- Invitations, audit writes, bootstrap, and demo seed use the configured ID.
- `npm run db:inspect-tenancy` is read-only and emits aggregate tenancy evidence
  only.
- `/pharmacist/governance` is pharmacy-admin-only and fully server-rendered.

## Verification

- Docker Postgres: `localhost:5433`, guarded against non-local URLs.
- Fresh migration replay from zero through `0016`: green.
- `tsc --noEmit`: green.
- ESLint: green.
- Vitest: 12 files, 124 tests, all green.
- Governance tests prove retention extension, hold-blocked destruction,
  second-admin execution, immutable correction supersession, and hashed export
  manifests.

## Next operator steps

1. Review the complete SQL in migrations `0015` and `0016`.
2. Take/verify a Supabase backup.
3. After explicit approval, run `npm run db:migrate`.
4. Run `npm run db:seed:demo` to reseed synthetic data under Demo.
5. Run `npm run db:inspect-tenancy`; require exactly one pharmacy, three Demo
   users, no cross-pharmacy mismatch, and clean counts.
6. Smoke-test sign-in/TOTP and `/pharmacist/governance`.
7. Perform and record the first isolated restore drill using
   [`RESTORE_DRILL.md`](RESTORE_DRILL.md).

## Fences

Do not change triage/red flags (including the unverified tick-bite 72-hour
value), reference PINs, `deriveClaimDraft`, the five outcomes, or zero-PHI
intake without lead sign-off. LTC claim drafting remains parked; see
[`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).
