# Completed work

**Verified through:** 2026-07-23

**Quality snapshot:** TypeScript clean · ESLint clean · 41/41 database-free
tests passing · 85 tests passed in the last full database-backed run. The new
P0-D integration tests still await an environment with Docker Desktop/CLI.

This is the implementation record requested for the project. It describes capabilities present in the repository, not planned work. Remaining items are in [`NEXT_STEPS.md`](NEXT_STEPS.md).

## Platform and data foundation

- Migrated operational and PHI persistence to Supabase Postgres in Canadian region `ca-central-1` using Drizzle ORM.
- Removed Firebase and Firebase Authentication from the application stack.
- Added strict server/client environment validation with `@t3-oss/env-nextjs` and Zod.
- Reconciled migration tracking and restored the reviewed `db:generate` → `db:migrate` workflow; `db:push` was removed and banned.
- Added effective-dated, idempotently seeded reference tables for ailment groups, PINs, fees, claim maximums, and cross-ailment rules.
- Added pharmacy records with HNS account identifier and an effective-dated ODB dispensing-fee reference linked through a pharmacy foreign key.
- Scoped patient health-number uniqueness to `(pharmacy_id, health_number)`.

## Patient intake

- Isolated `/assessment` from marketing chrome with a bare route-group layout and dedicated CSS module.
- Built a mobile, one-question-per-screen kiosk with 56px-or-larger tap targets and reduced-motion support.
- Preserved the five outcomes: emergency, assessable, referral, not funded, and unsure.
- Kept emergency/red-flag exits terminal and separate from completed assessments.
- Enforced the zero-PHI intake design: the patient device submits symptoms and self-reports only.
- Added short-lived, single-use six-character handoff sessions stored in Postgres.
- Added per-pharmacy QR links and server-side validation of the URL's pharmacy identifier before an intake row is written.

## Public self-check and pre-visit PDF

- Added a pharmacy-agnostic `/check` route with its own bare layout; it is not
  cross-wired to the marketing site, QR intake, portal, or a pharmacy record.
- Reused `src/config/triage.ts` by import for the narrowing tree, emergency
  signs, and red flags without copying or changing clinical content.
- Kept the flow genuinely non-identifying: no name, health number, DOB, age,
  sex, gender, pharmacy, or other demographic field.
- Kept all answers in React memory and generated the PDF in the browser. The
  path has no server action, DB/storage/cache write, browser storage, analytics,
  or payload logging.
- Added separate typed pre-visit and advisory document branches. The advisory
  type has no ailment field; neither branch contains PINs, fees, maximums, or
  claim derivation.
- Added tests for document boundaries, absence of identifying/billing fields,
  shared triage imports, forbidden persistence APIs, and silent PDF failure
  handling.
- Hard-blocked `/check` in production pending P0-A clinical sign-off. See
  [`SELF_CHECK.md`](SELF_CHECK.md).

## Claim assembly and money rules

- Implemented pure `deriveClaimDraft(input)` with an injected PIN resolver and no database calls.
- Made unknown PIN lookups refuse with `UNKNOWN_PIN_LOOKUP`; there is no default or ailment fallback.
- Derived PIN, fee, prescriber reference/ID, intervention codes, carrier, quantity, and SSC from validated inputs and seeded references.
- Added conservative refusal paths for red-flag exit, claim maximum, blocking prescription, self/family assessment, ineligible remote virtual service, and every LTC-resident scenario pending ministry clarification.
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

## Defensible clinical record and consent (P0-B)

- Added version-2 assessment snapshots with database-enforced completeness while preserving readable legacy version-1 records.
- Added informed-consent method, giver, timestamp, and conditional substitute decision-maker name/relationship.
- Added separately queryable presenting complaint, onset/duration/course, associated symptoms, aggravating/relieving factors, treatments tried, health/medication/allergy history, findings, shared decision-making, care plan, and follow-up plan.
- Added outcome-compatible coded no-Rx rationale; optional narrative cannot replace the required code.
- Added complete Rx snapshots: patient address, date, drug/strength/quantity, dose/frequency/route, server-derived prescriber identity/practice contact, PCP notification timestamp/method, and choice-of-pharmacy information timestamp.
- Added authenticated server-rendered review and PDF output. Clinical PHI remains in necessary local form state only, is cleared after persistence, and is never written to browser storage or passed into the audit modal's client props.
- Added pharmacy practice address/phone settings used server-side for prescription snapshots.
- Added real-Postgres tests for complete persistence/readback, SDM consent, coded no-Rx records, server refusal, and direct database constraint refusal.

## Virtual/LTC fact capture and fee-tier reference (P0-D)

- Applied `0013_p0_d_odb_fee_tier_reference` with effective dates, fee cents, and an explicit `remote_virtual_eligible` rule; applied `0014_p0_d_ltc_fact_capture` with LTC and virtual-documentation checks.
- Updated the workspace and server action to capture virtual physical location, remote-demand reason, LTC residency, provider role, and emergency status.
- Made remote-virtual visibility and enforcement depend on the active reference row rather than a hardcoded set of fee-tier names.
- Parked all LTC claim drafting with `LTC_PENDING_MINISTRY_CLARIFICATION`; the assessment persists and no claim draft is created.
- Added pure and database test coverage, including a data-driven remote eligibility flip. Live verification confirmed four fee tiers, all three checks, and unchanged counts of 3 pharmacies and 12 assessments. Fresh-Docker replay of the new tests remains outstanding because Docker is unavailable in the current environment.
- Split production reference seeding from local demo fixtures: `db:seed` writes reference rows only, while `db:seed:demo` is explicitly development-only.

## Verification and regression coverage

- Vitest runs pure unit tests and real-Postgres integration tests.
- Docker Postgres uses port 5433, is guarded against non-local database URLs, and rebuilds the migration chain from zero.
- Tests cover claim derivation combinations, refusal paths, LTC behaviour, remote-virtual tiers, retention, one-per-day, concurrent mutex enforcement, claim persistence/supersession, invitations/auth data, audit grants/triggers, and red-flag zero-claim behaviour.
- TypeScript and ESLint are clean for the current tree. The last full
  database-backed suite had 85 passing tests; database-free logic can also run
  independently through `npm run test:pure`.
