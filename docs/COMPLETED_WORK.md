# Completed work

**Verified through:** 2026-07-30

**Quality snapshot:** the current tree is TypeScript- and ESLint-clean, passes
90/90 database-free tests, and completes a production build with `/check`
statically generated. The last complete database-backed run on 2026-07-25
passed 135/135 tests, including a fresh Docker Postgres migration replay through
`0017`. Supabase is live through `0017`; repository migration `0018` is pending
deployment and a new full database-suite run.

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
- Kept the legacy pharmacy QR parameter for link compatibility while removing
  its tenant-selection power: the server always uses `PHARMACY_ID`, and a
  forged/malformed/absent query value resolves only to the configured pharmacy.

## Public guided demo

- Added `/demo` as a public, interactive five-stage tour covering handoff,
  structured assessment, claim handoff, follow-up, and record governance.
- Kept the tour fully synthetic and in memory. It accepts no patient input,
  opens no authenticated portal session, and has no database, browser-storage,
  clinical-routing, red-flag, claim-derivation, or HNS path. It reuses only the
  approved public ailment IDs and labels rather than duplicating them.
- Omitted PINs, fees, claim maximums, and clinical recommendations while still
  explaining which live boundaries derive and protect those records.
- Added architecture tests that fail if the demo imports persistence/auth
  layers, any triage export beyond `AILMENT_LABELS` and `ALL_AILMENT_IDS`, claim
  derivation, browser storage, identifying fields, or PIN-like values.

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
- Reworked both PDFs into a modern AgentOMA-branded report with structured
  response cards and bottom-of-page fine print. Removed repetitive
  `self-reported` labels while retaining one clear statement that answers are
  unverified; emergency guidance stays prominent.
- Added tests for document boundaries, absence of identifying/billing fields,
  shared triage imports, forbidden persistence APIs, and silent PDF failure
  handling.
- Recorded P0-A clinical approval for the complete current `triage.ts` artifact,
  including tick-bite and UTI content, with a line-ending-stable SHA-256
  tombstone test. See [`CLINICAL_APPROVAL.md`](CLINICAL_APPROVAL.md).
- Removed the production-only 404 after sign-off; `/check` is now publicly
  available under the same zero-identifying-data and no-persistence boundary.

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
- Made successful password/TOTP authentication perform a fresh browser
  navigation after the httpOnly session cookie is issued, preventing stale
  pre-auth route state from trapping users on the verification screen. Auth
  transport failures now restore the form with safe, non-sensitive feedback.
- Disabled public signup and added single-use, expiring pharmacy-admin invitations.
- Added roles for pharmacy admin, pharmacist, intern, student, and technician.
- Added pharmacist profile fields for OCP number, As-of-Right status, orientation completion, and intern/student supervision.
- Protected `/pharmacist/*`; `src/proxy.ts` provides navigation UX only, while each server action independently verifies session, role, and pharmacy scope.
- Removed all `MOCK_PHARMACY_ID` usage and derives pharmacy/prescriber identity from the session.
- Added orientation gating and tests, including supervisor handling for interns/students. An audited admin override currently exists and is explicitly listed as a pre-production decision in [`NEXT_STEPS.md`](NEXT_STEPS.md).

## Portal, audit, and settings

- Built server-backed dashboard statistics, pending-intake queue, recent assessments, and walk-in assessment flow.
- Moved the audit page and record detail rendering fully server-side so patient records are not sent to client components.
- Added pharmacy-scoped audit filters, record detail, CSV export, audit PDF export, and assessment-record PDF export.
- Added audit events for intake/patient creation, assessments, claim drafts, orientation actions, invitations, and export access.
- Replaced legacy local-storage pharmacy settings with authenticated, database-backed pharmacy and pharmacist profile settings.
- Added pharmacy team management and orientation recording.

## Follow-up tracking

- Made a structured follow-up plan part of billable completion: due date,
  phone/in-person method, and monitoring parameters are required before the
  assessment, intake consumption, claim draft, or follow-up row is committed.
- Added the server-rendered `/pharmacist/follow-ups` worklist and a compact
  dashboard due list with visible overdue state.
- Added reached and attempted-not-reached records, safety/efficacy evaluation,
  next-step disposition, and notes. A not-reached attempt remains open.
- Added an explicit reminder that the assessing pharmacy retains follow-up
  responsibility when the prescription is filled elsewhere.
- Made plan and attempt records append-only. Corrections insert a replacement
  and permanently supersede the original; duplicate simultaneous completion
  is serialized.
- Added audit events for plan creation, attempt recording, and supersession.
  Assessment detail/PDF and complete-patient export schema v2 include the
  follow-up record.
- Added retention inheritance and patient-wide horizon extension for follow-up
  rows, app-role grant restrictions, and governed-destruction coverage.
- Generated `0017_tense_pandemic` through `db:generate`, passed a fresh Docker
  migration replay, then applied it to Supabase after explicit SQL approval.
  Live checks confirm all three triggers, the deferrable exclusion constraint,
  and least-privilege `agentoma_app` grants.

## Single-tenant boundary and record governance

- Added validated server-only `PHARMACY_ID` configuration and pinned portal,
  intake, invitation, audit, bootstrap, and demo-seed writes to it.
- Added a database singleton constraint that makes a second pharmacy row
  unrepresentable while retaining `pharmacy_id` filters as defence in depth.
- Added a read-only tenancy inspection command that reports only pharmacy
  identity, aggregate counts, duplicate-health-number groups, and cross-pharmacy
  relationship defects.
- Applied the approved cleanup migration: the two disposable TEST tenants and
  their clinical rows were deleted, Demo Pharmacy's three auth/TOTP users were
  preserved, and the known cross-pharmacy relationship defect was removed.
- Added effective retention policy tables and a database recomputation path:
  the latest service extends all prior assessment horizons for a returning
  patient.
- Added complete server-assembled patient export with a stored manifest,
  per-artifact SHA-256 hashes, and a patient-linked audit event.
- Added patient- and record-scoped holds whose active state blocks destruction
  in database triggers.
- Added PHIPA access/correction request tracking and immutable correction
  overlays with final supersession.
- Added deliberate destruction dry runs with counts/hashes. Execution requires
  elapsed retention, no active hold, a different pharmacy administrator, and a
  database-written audit event before governed records are removed. No cron or
  automatic deletion exists.
- Added restore-drill and audit-write-failure evidence models, admin-only
  server-rendered aggregate reports, and [`RESTORE_DRILL.md`](RESTORE_DRILL.md).
- Applied governance migrations `0015`–`0016` to Supabase after from-zero Docker
  verification. Live checks confirmed one pharmacy, clean tenancy, all required
  triggers, effective app-role revocations, nine governance tables, and
  patient-wide retention horizons with the pediatric case at 2047.

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
- Added pure and database test coverage, including a data-driven remote
  eligibility flip. Fresh-Docker replay is now green.
- Split production reference seeding from local demo fixtures: `db:seed` writes reference rows only, while `db:seed:demo` is explicitly development-only.

## Server-enforced eligibility and completion evidence (P0-C)

- Added Zod-validated server boundaries for inspected public-service identity
  evidence and required card fields; absent eligibility evidence fails closed.
- Added authoritative self/family and structured existing-prescription facts to
  the pharmacist workflow and completion action. Blocking and unresolved states
  cannot reach claim derivation.
- Added immutable `assessment_billability_evidence` snapshots containing the
  patient's same-condition self-report, exact advisory platform trailing-window
  count, and pharmacist-attested clinical-viewer source, timestamp, and maximum
  state.
- Extended typed boundary validation for assessment completion, invitations,
  pharmacy settings, and external intake-session responses with non-PHI-safe
  errors.
- Added pure and real-Postgres coverage for the schemas, workflow gates,
  evidence persistence, immutability, tenant isolation, and failure atomicity.
- The application code and `0018_clever_mister_fear` migration are merged, but
  this capability is not live until `0018` is reviewed, migrated, and verified.
  The evidence sidecar also remains to be added to complete-patient export.

## Verification and regression coverage

- Vitest runs pure unit tests and real-Postgres integration tests.
- Docker Postgres uses port 5433, is guarded against non-local database URLs, and rebuilds the migration chain from zero.
- Tests cover claim derivation combinations, refusal paths, LTC behaviour, remote-virtual tiers, retention, one-per-day, concurrent mutex enforcement, claim persistence/supersession, follow-up completion/supersession/concurrency/export, invitations/auth data, audit grants/triggers, and red-flag zero-claim behaviour.
- TypeScript, ESLint, and the production build are clean for the current tree.
  The last fully recorded database-backed suite has 135 passing tests through
  `0017`; 90 database-free tests currently run independently through
  `npm run test:pure`.
