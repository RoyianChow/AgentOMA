# Codebase commentary and current-state map

**Snapshot:** 2026-08-02
**Branch:** `feat/moh-compliance-migration`
**Current revision:** run `git rev-parse HEAD` after checkout

## Why this file exists

This is a compact handoff for developers who need to understand the code's
boundaries before changing it. It records the high-value commentary added in
this pass and explains where an apparently small change can become a clinical,
billing, privacy, or evidence change.

It is not a second compliance source of truth. Regulatory rules remain in
`docs/COMPLIANCE.md` and the binding notice; repository invariants remain in
`AGENTS.md`; the architecture/status narrative remains in
`docs/PROJECT_OVERVIEW.md` and `docs/NEXT_STEPS.md`.

## Current status

The application is an authenticated pilot foundation, not a production-ready
pharmacy service. The recorded exact candidate
`dcaab91f9adba7457a85214d51d1614c8560f404` passed the TypeScript, lint, build,
123 database-free tests, and the 211-test real-PostgreSQL suite twice. That
candidate's database evidence covered audit-failure rollback, constraints,
concurrency, tenant isolation, red-flag zero-claim behaviour, referral
separation, and persisted evidence/export cases.

The current HEAD adds a database-free, fail-closed connectivity diagnostic for
the Task 02 predecessor-upgrade harness. It has not itself been used to claim a
new G1-D result. The two recorded predecessor/restart attempts failed closed
before migration or fixture writes (`DATABASE_IDENTITY_DENIED`, then
`DATABASE_CONNECTIVITY_DENIED`), and their exact-resource teardown passed.
Migration `0018` is present in the repository and verified from zero in Docker,
but remains unapplied to live Supabase, which is still at `0017`.

## Route and data-flow map

| Surface | Route | Boundary to preserve |
|---|---|---|
| Marketing site | `/` | Public content only; no patient data |
| Synthetic tour | `/demo` | Read-only, synthetic copy; no database or auth bypass |
| Public self-check | `/check` | Uses approved triage imports; answers stay in memory and PDF generation is client-side |
| Patient intake | `/assessment` | Zero-PHI kiosk; creates only a short-lived handoff session |
| Authentication | `/sign-in`, `/enroll-2fa`, `/accept-invitation` | Invitation-only better-auth with mandatory TOTP |
| Pharmacist portal | `/pharmacist/*` | Server-rendered/private; every mutation rechecks session, TOTP, role, and configured pharmacy |
| FHIR scaffold | `/api/fhir` | Authenticated/disabled boundary; do not expand the ICD-10 map without pharmacist review |

The root layout owns document structure, fonts, and global CSS. Route-group
layouts supply the marketing chrome, bare self-check, bare intake, auth shell,
and authenticated dashboard shell. `src/proxy.ts` is only an optimistic
navigation gate: a crafted request can bypass it, so authorization belongs in
the server guard and in every server action.

Runtime database access uses Drizzle and the pooled `DATABASE_URL`. The direct
connection is reserved for the migration runner. The configured
`PHARMACY_ID` is server-only and is the sole tenant selector; client input,
session input, QR parameters, and URLs cannot select a pharmacy.

## Commentary added in this pass

- `src/lib/patient-identity-validation.ts` now explains that normalization is
  formatting hygiene, not eligibility or a reason to log an identifier. It
  also records why date validation constructs UTC calendar dates.
- `src/lib/clinical-record-schema.ts` now marks the Zod object as a server
  boundary and explains the substitute-decision-maker and outcome-specific
  cross-field checks.
- `src/lib/follow-up-schema.ts` now documents date-only semantics and why the
  due-date lower bound is enforced before completion persistence.
- `src/lib/db/index.ts` now documents the pooled-runtime/direct-migration
  split and that the connection cannot be selected by client input.
- `src/lib/db/test/docker-environment.ts` now calls out the loopback, fixed
  image, and disposable-storage contract that prevents tests from touching a
  remote or stale database.
- `src/lib/self-check/model.ts` and
  `src/app/(self-check)/check/SelfCheckFlow.tsx` now make the public
  self-check's in-memory-only, zero-identifying-data model explicit. The
  restart handler is documented as the privacy reset for the whole flow.

The comments describe trust boundaries and reasons. They do not restate the
PIN table, clinical algorithms, or claim-derivation rules.

## Optimization added in this pass

`src/lib/db/verify.ts` now uses aggregate `COUNT(*)` queries for assessment
and follow-up totals instead of loading every record ID into memory. Its
pharmacy fee-tier summary now counts rows in one pass and sorts the small
aggregate deterministically. The verification script still reports aggregate
evidence only; it does not expose patient or clinical rows.

## Protected surfaces intentionally not revised

This pass did not edit:

- `src/config/triage.ts` or approved clinical reference data;
- `src/lib/db/migrations/` or migration history;
- `src/lib/claims/derive-claim-draft.ts` or PIN/fee/maximum derivation;
- assessment-finalization and audit semantics;
- `apps/experiment-sandbox/` or Task 01 evidence-bound files.

Those files were reviewed as part of the repository inventory, but even a
comment-only edit would change a protected candidate or require renewed
approval/evidence. Changes there need their own lead-approved scope.

## Safe maintenance rules for future changes

1. Start with `docs/PROJECT_OVERVIEW.md`, `docs/COMPLIANCE.md`, and
   `docs/NEXT_STEPS.md`; read the regulatory PDF only for a live compliance
   question.
2. Keep clinical and billing authority in the existing reference/config and
   derivation modules. A missing value is a refusal or a question, never a
   guessed default.
3. Keep public answers out of storage, URLs, logs, analytics, and API payloads.
   Authenticated pharmacist form state is temporary and must be cleared at
   persistence, cancellation, intake switching, session expiry, and sign-out.
4. Use `db:generate` followed by review and `db:migrate`. `db:push` is banned.
5. Treat a red-flag exit as a separate terminal path: it must not create an
   assessment, evidence row, or claim draft.
6. For corrections, append a replacement and supersede the old record. Do not
   weaken database immutability to make editing convenient.

## Next work, in dependency order

- Remediate the Task 02 database-free diagnostic path, freeze a new exact
  candidate, obtain a fresh expiring G1-D, and run the single orchestrated
  predecessor/restart proof with Docker available.
- Resolve S27 canonical export/reconstruction semantics before changing export
  hashes or calling the evidence complete.
- Obtain independent Task 11 review, recovery evidence, G1-L, live `0018`
  migration approval/execution, post-apply verification, and independent G4.
- Obtain the human LTC billing decision recorded in `OPEN_QUESTIONS.md`; the
  current conservative claim-drafting refusal remains intentional.
- Keep `/api/fhir` disabled until its authorization and pharmacist-reviewed
  mapping requirements are satisfied. Do not expand it as part of housekeeping.

## Verification note

This pass does not replace the recorded candidate evidence or authorize a live
migration. Before merging future behavioural changes, rerun the relevant
TypeScript, lint, pure, and fresh-Postgres gates and bind new evidence to the
exact resulting commit.
