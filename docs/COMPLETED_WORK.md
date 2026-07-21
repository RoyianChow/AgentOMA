# Completed work

**Verified through:** 2026-07-21

**Quality snapshot:** TypeScript clean · ESLint clean · 81 Vitest tests passing

This is the implementation record requested for the project. It describes capabilities present in the repository, not planned work. Remaining items are in [`NEXT_STEPS.md`](NEXT_STEPS.md).

## Platform and data foundation

- Migrated operational and PHI persistence to Supabase Postgres in Canadian region `ca-central-1` using Drizzle ORM.
- Removed Firebase and Firebase Authentication from the application stack.
- Added strict server/client environment validation with `@t3-oss/env-nextjs` and Zod.
- Reconciled migration tracking and restored the reviewed `db:generate` → `db:migrate` workflow; `db:push` was removed and banned.
- Added effective-dated, idempotently seeded reference tables for ailment groups, PINs, fees, claim maximums, and cross-ailment rules.
- Added pharmacy records with HNS account identifier and ODB dispensing-fee tier.
- Scoped patient health-number uniqueness to `(pharmacy_id, health_number)`.

## Patient intake

- Isolated `/assessment` from marketing chrome with a bare route-group layout and dedicated CSS module.
- Built a mobile, one-question-per-screen kiosk with 56px-or-larger tap targets and reduced-motion support.
- Preserved the five outcomes: emergency, assessable, referral, not funded, and unsure.
- Kept emergency/red-flag exits terminal and separate from completed assessments.
- Enforced the zero-PHI intake design: the patient device submits symptoms and self-reports only.
- Added short-lived, single-use six-character handoff sessions stored in Postgres.
- Added per-pharmacy QR links and server-side validation of the URL's pharmacy identifier before an intake row is written.

## Claim assembly and money rules

- Implemented pure `deriveClaimDraft(input)` with an injected PIN resolver and no database calls.
- Made unknown PIN lookups refuse with `UNKNOWN_PIN_LOOKUP`; there is no default or ailment fallback.
- Derived PIN, fee, prescriber reference/ID, intervention codes, carrier, quantity, and SSC from validated inputs and seeded references.
- Added conservative refusal paths for red-flag exit, claim maximum, blocking prescription, self/family assessment, ineligible remote virtual service, and unresolved LTC secondary non-emergency service.
- Persisted billable results as immutable `claim_draft` snapshots; non-billable results create no claim row.
- Added atomic supersession for corrections while retaining both the original and replacement.
- Added a read-only claim panel and printable handoff export. The interface explicitly states that nothing is submitted to HNS.

## Database-enforced safeguards

- Enforced one assessment per patient/ailment/day with a unique database index.
- Enforced the insect-bite/urticaria versus tick-bite same-day exclusion with an advisory-lock trigger that is race-safe under concurrent inserts.
- Enforced audit-log append-only behaviour with a trigger and application-role privilege revocation.
- Enforced claim-draft immutability, one active draft per assessment, and final supersession.
- Enforced `retain_until` in the database using the longer of service-plus-ten-years and the age-18 branch; the pediatric test case resolves to 2047.
- Added and verified a non-owner `agentoma_app` role so REVOKE statements are effective in normal application use.

## Pharmacist authentication and tenancy

- Added better-auth with the Drizzle adapter as the sole identity layer.
- Added email/password login, mandatory TOTP, 30-minute rolling sessions, server-side sign-out/revocation, and persistent rate limiting.
- Disabled public signup and added single-use, expiring pharmacy-admin invitations.
- Added roles for pharmacy admin, pharmacist, intern, student, and technician.
- Added pharmacist profile fields for OCP number, As-of-Right status, orientation completion, and intern/student supervision.
- Protected `/pharmacist/*`; `proxy.ts` provides navigation UX only, while each server action independently verifies session, role, and pharmacy scope.
- Removed all `MOCK_PHARMACY_ID` usage and derives pharmacy/prescriber identity from the session.
- Added orientation gating and tests, including supervisor handling for interns/students. An audited admin override currently exists and is explicitly listed as a pre-production decision in [`NEXT_STEPS.md`](NEXT_STEPS.md).

## Portal, audit, and settings

- Built server-backed dashboard statistics, pending-intake queue, recent assessments, and walk-in assessment flow.
- Moved the audit page and record detail rendering fully server-side so patient records are not sent to client components.
- Added pharmacy-scoped audit filters, record detail, CSV export, audit PDF export, and assessment-record PDF export.
- Added audit events for intake/patient creation, assessments, claim drafts, orientation actions, invitations, and export access.
- Replaced legacy local-storage pharmacy settings with authenticated, database-backed pharmacy and pharmacist profile settings.
- Added pharmacy team management and orientation recording.

## Verification and regression coverage

- Vitest runs pure unit tests and real-Postgres integration tests.
- Docker Postgres uses port 5433, is guarded against non-local database URLs, and rebuilds the migration chain from zero.
- Tests cover claim derivation combinations, refusal paths, LTC behaviour, remote-virtual tiers, retention, one-per-day, concurrent mutex enforcement, claim persistence/supersession, invitations/auth data, audit grants/triggers, and red-flag zero-claim behaviour.
- Current repository gates pass: 81 tests, `tsc --noEmit`, and ESLint.
