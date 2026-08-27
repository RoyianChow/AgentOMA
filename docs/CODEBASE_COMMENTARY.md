# Codebase commentary and current-state map

**Snapshot reconciled:** 2026-08-26
**Observed branch:** `origin/main`
**Observed baseline:** `02b0a5cf08a56714a2d175556557a49f8813b77f`

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
pharmacy service. Exact candidate `dcaab91f9adba7457a85214d51d1614c8560f404`
remains the last complete database-tested candidate: 211 real-PostgreSQL tests
passed twice through migration `0018`. The current merged baseline
`02b0a5cf…` is TypeScript- and ESLint-clean, passes 180 pure production tests,
builds successfully with Next.js 16.3.3, and passes 614 non-Postgres sandbox
tests, sandbox build, evidence validation, production invariance, and the
dependency-security gate. The current Docker suite rebuilt from zero through
`0018` and passed 27 files / 269 tests after its preflight rejected a stale
test container. Cleanup removed the disposable database and network.

Migration `0018` remains unapplied to live Supabase, which is documented at
`0017`. The newest preserved predecessor/restart candidates, `3a271a7d…` and
`4e479514…`, failed closed with `LOOPBACK_TCP_DENIED` before migration or
synthetic fixture writes. Use the maintained
[`current implementation status`](tasks/autonomous-pharmacy/CURRENT-IMPLEMENTATION-STATUS.md)
instead of this commentary file for evolving task status.

The current Task 01 production-invariance check passes, but the changed
candidates still lack independent promotion review. Task 04's `/book` UI and
Task 06's synthetic virtual-care prototype are merged, but sandbox runtime
authority is expired and Task 04's v3 renewal is not granted. Task 11 now has
raw-environment, forbidden-import, and dependency-security controls; its full
control plane remains incomplete.

## Evaluation conclusions

The codebase has strong fail-closed boundaries for its current pilot stage:
public intake remains zero-PHI, pharmacist mutations use server-side guards,
claim values come from reference data, red-flag exits remain separated from
claims, immutable records use supersession, and experimental code is isolated
from production builds and data.

The main risks are deployment and governance gaps rather than missing core UI:

1. live Supabase is still documented at migration `0017`, so P0-C completion
   must not be treated as deployed until the exact `0018` gates finish;
2. Task 01 and the dependency/invariance amendment lack independent
   exact-candidate promotion review;
3. branch protection has no required status-check contexts and no admin
   enforcement;
4. Task 11 still lacks repository-owned secret scanning, PHI/logging and
   unsafe-enable policy, accessibility automation, evidence validation, and an
   aggregate release gate; and
5. Task 04/06 code is synthetic and technically testable, but its runnable
   authority is expired or incomplete.

During this audit the sandbox rejected an inherited `OPENAI_API_KEY` without
printing its value, then built successfully after the prohibited variable was
removed from the child process and the approved synthetic build variables were
supplied. That is the intended containment behavior.

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

The public self-check PDF renderer now deduplicates concurrent logo loads and
reuses a successful logo rasterization in module memory for repeat downloads.
Failed loads remain retryable, and no report data enters the cache or the
browser's persistent storage.

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

- Freeze a new exact Task 02 candidate, obtain a fresh expiring G1-D, and run
  the single orchestrated predecessor/restart proof with Docker available.
- Resolve S27 canonical export/reconstruction semantics before changing export
  hashes or calling the evidence complete.
- Obtain independent Task 11 review, recovery evidence, G1-L, live `0018`
  migration approval/execution, post-apply verification, and independent G4.
- Obtain the human LTC billing decision recorded in `OPEN_QUESTIONS.md`; the
  current conservative claim-drafting refusal remains intentional.
- Keep `/api/fhir` disabled until its authorization and pharmacist-reviewed
  mapping requirements are satisfied. Do not expand it as part of housekeeping.
- Obtain independent Task 11 review for the Task 01 remediation and
  dependency/invariance amendment candidates; do not transfer the historical
  Task 01 PASS.
- Keep Task 04 fail-closed until its v3 scope is exact, signed, unexpired, and
  independently reviewed.
- Treat Task 06 as a merged synthetic review prototype; renew its runtime scope
  and complete manual accessibility, privacy/security, professional, vendor,
  and Task 11 evidence before promotion discussion.
- Complete Task 11's security, policy, accessibility, evidence-validation,
  aggregate-gate, and branch-protection controls.
- Treat Tasks 12–14 as design-only until each has exact approval and Task 11
  Checkpoint 1. Their briefs do not authorize runtime, studies, clinical or
  billing changes, automated interpretation, or production activation.

## Verification note

This pass does not replace the recorded candidate evidence or authorize a live
migration. Before merging future behavioural changes, rerun the relevant
TypeScript, lint, pure, and fresh-Postgres gates and bind new evidence to the
exact resulting commit.
