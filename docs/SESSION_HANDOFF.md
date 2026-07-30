# Session handoff

**Updated:** 2026-07-30

**Branch observed:** `feat/moh-compliance-migration`

**Repository head before the current PHI-lifecycle hardening:** `bf6b8e6`

## Current release state

AgentOMA is an authenticated, single-pharmacy pilot foundation, not a
production-ready clinical service. The zero-identifying-data `/check` and
zero-PHI `/assessment` surfaces are public; `/pharmacist/*` is invitation-only
and requires password plus TOTP. AgentOMA produces a read-only claim draft for
hand-entry and never submits to HNS.

P0-A, P0-B, P0-D, follow-up tracking, authentication, single-tenancy, and the
record-governance foundation are implemented. P0-C identity/eligibility,
self/family, existing-prescription, and claim-history code is merged, but its
database migration is not yet deployed. LTC billing and the orientation
break-glass policy remain unresolved production blockers.

## Migration state

- **Live Supabase and last verified fresh Docker:** through
  `0017_tense_pandemic`.
- **Repository chain:** through `0018_clever_mister_fear`.
- A read-only live query during the 2026-07-30 audit returned PostgreSQL `42P01`
  for `assessment_billability_evidence`, consistent with live Supabase still
  being at `0017`.
- `db:push` is banned. Every schema change uses `db:generate` → SQL review →
  `db:migrate`.

Important migration landmarks:

| Migration | Purpose |
|---|---|
| `0004_hardening` | Same-day insect/tick mutex and initial audit immutability/revocation |
| `0006` | Immutable claim-draft supersession and one-active-draft invariant |
| `0011_audit_hardening` | Retention trigger, non-owner app role, effective audit/claim grants |
| `0012_clinical_record_and_consent` | P0-B version-2 consent and defensible clinical/Rx record |
| `0013`–`0014` | Effective ODB fee-tier reference plus virtual/LTC fact capture |
| `0015_tidy_luke_cage` | Disposable tenant cleanup and one-pharmacy constraint |
| `0016_brown_lightspeed` | Patient-wide retention, export manifests, holds, corrections, deliberate destruction, and restore evidence |
| `0017_tense_pandemic` | Immutable follow-up plans/attempts, concurrency, retention, and grants |
| `0018_clever_mister_fear` | Immutable P0-C billability-evidence sidecar; merged, not live |

## Latest verification evidence

- `npm run test:pure`: **95/95 passing** on 2026-07-30. The added privacy
  regressions cover the complete sensitive-state reset, success/exit lifecycle,
  prohibited browser storage/telemetry/URL use, autocomplete, and pharmacist
  route response headers.
- `tsc --noEmit`, ESLint, and `next build`: clean on 2026-07-30; the build
  statically generates `/check` and lists the expected public, auth, and portal
  routes.
- The compiled routes manifest applies `Cache-Control: private, no-store`,
  no-referrer, and same-origin script/connect CSP headers to
  `/pharmacist/:path*`.
- Last full database-backed run: **135/135** on 2026-07-25, including a fresh
  Docker replay through `0017`.
- Last live tenancy inspection after `0017`: one Demo Pharmacy, no
  cross-pharmacy relationships, three preserved TOTP users, and matching
  patient-wide retention horizons.
- Docker-backed tests require Docker Desktop and local Postgres on port 5433;
  the harness refuses non-local database URLs.

Do not imply the full Docker/database suite covers `0018` until it is rerun.

## Next operator actions

1. Review `0018_clever_mister_fear.sql`, replay from zero in Docker, and run the
   full database suite.
2. Apply `0018` to Supabase with `db:migrate`; verify the table, immutability
   trigger, app-role grants, and aggregate tenancy report.
3. Smoke-test a realistic P0-C completion: inspected eligibility, self/family,
   structured existing-Rx states, patient self-report, advisory platform count,
   clinical-viewer attestation, and safe refusal paths. Re-prove red-flag exit
   writes zero claim rows.
4. Add `assessment_billability_evidence` to the assessment PDF and complete
   patient export/manifest.
5. Resolve LTC billing with the ODB Pharmacy Help Desk and resolve the
   orientation admin override; see [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).
6. Run authenticated 375px portal usability tests and the first isolated
   Canadian-region restore drill.

## Operational boundaries and landmines

- `src/config/triage.ts` is the exact hash-approved P0-A artifact. Any content
  change invalidates approval and requires a new pharmacist review.
- Never edit reference PINs or derive billing values from docs or memory.
- `src/proxy.ts` is navigation UX only; every server action independently
  rechecks session, role, TOTP, pharmacy, and the action-specific eligibility
  boundary.
- The app is single-pharmacy by construction. `PHARMACY_ID` is server-only;
  client, QR, and session data never select a tenant.
- The 365-day platform count is advisory and excludes exactly 365 days ago;
  only HNS adjudication determines payment.
- `/api/fhir` remains disabled. Its ICD-10 map is still marked for pharmacist
  review and must not be expanded.
- Necessary PHI may exist transiently only in the authenticated pharmacist
  form. It is cleared after persistence, cancellation, intake switching,
  session expiry, and sign-out, and never written to browser storage, URLs,
  logs, analytics, caches, or unnecessary client props.
- Docker Desktop must be running for constraint, concurrency, and migration
  tests. If PowerShell blocks `npm.ps1`, follow the execution-policy instruction
  in [`../AGENTS.md`](../AGENTS.md) rather than bypassing it.

## Standing fences

Do not change the approved triage/red-flag artifact, reference PIN data,
migrations, `deriveClaimDraft`, audit integrity, five-outcome structure, or
zero-PHI intake without lead sign-off. Do not resolve the LTC or orientation
questions by inference.
