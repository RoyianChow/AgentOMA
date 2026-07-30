# AgentOMA project overview

**Status snapshot:** 2026-07-30

**Current stage:** authenticated pilot foundation; **not production-ready**

**Verification at this snapshot:** the current tree is TypeScript-clean,
ESLint-clean, passes all 95 database-free tests, and completes a production
build with `/check` statically generated. The last complete database-backed
suite run on 2026-07-25
passed 135/135 tests and rebuilt a fresh Docker Postgres database from zero
through migration `0017`. Supabase is also live through `0017`; post-migration
inspection reports one Demo Pharmacy, no cross-pharmacy relationships, three
preserved users with TOTP, and matching patient-wide retention horizons.
Migration `0018` and its P0-C application code are merged but are not yet live.

AgentOMA supports Ontario pharmacy minor-ailment services. The Ministry of Health Executive Officer Notice effective July 1, 2026 is the source of truth for covered ailment groups, claim maximums, fees, PINs, and billing rules. See [`COMPLIANCE.md`](COMPLIANCE.md) for traceability and [`NEXT_STEPS.md`](NEXT_STEPS.md) for the remaining go-live work.

## Product surfaces

| Surface | Route | Purpose | PHI policy |
|---|---|---|---|
| Marketing site | `/` | Public product information | No PHI |
| Guided demo | `/demo` | Interactive synthetic tour of intake, assessment, claim handoff, follow-up, and governance | No inputs, persistence, auth bypass, clinical advice, or billing values |
| Public self-check | `/check` | Clinically approved, pharmacy-agnostic symptom self-check and client-generated pre-visit/advisory PDF | Zero identifying data; nothing sent or persisted |
| Patient intake | `/assessment` | Mobile kiosk triage and six-character handoff | Collects zero PHI by design |
| Authentication | `/sign-in`, `/enroll-2fa`, `/accept-invitation` | Invitation-only portal access and mandatory TOTP | Authentication data only |
| Pharmacist portal | `/pharmacist/*` | Intake retrieval, patient identity, assessment, claim draft, follow-up, audit, settings, team | Contains PHI; authenticated, pharmacy-scoped, private/no-store, and same-origin-script only |
| Follow-up worklist | `/pharmacist/follow-ups` | Due/overdue plans, attempts, evaluation, disposition, and immutable correction | Server-rendered; pharmacist/admin role and pharmacy scope rechecked on every mutation |
| Record governance | `/pharmacist/governance` | Admin-only retention, export, hold, correction, destruction-review, audit-failure, and restore-drill controls | Server-rendered; complete exports use an authenticated download route |
| FHIR route | `/api/fhir` | Preserved export scaffold | Disabled with `403`; not available to clients |

Next.js route groups isolate layouts without changing URLs:

- `(site)` supplies public header and footer.
- `(self-check)` is a bare, pharmacy-agnostic layout for `/check`.
- `(intake)` is a bare kiosk layout with an isolated CSS module and large tap targets.
- `(auth)` contains sign-in, invitation acceptance, and TOTP enrollment.
- `(dashboard)` contains the pharmacist portal without marketing chrome.
- The root layout contains only document structure, fonts, and global CSS.

## Technology and deployment

| Concern | Current choice |
|---|---|
| Framework | Next.js 16.2 App Router, React 19, strict TypeScript |
| Database | Supabase Postgres in `ca-central-1` |
| ORM and migrations | Drizzle ORM; file-based migrations only |
| Authentication | better-auth 1.6 with Drizzle, email/password, TOTP, database sessions and rate limits |
| Validation | Zod and `@t3-oss/env-nextjs` |
| Tests | Vitest; database tests use a fresh Docker Postgres on port 5433 |
| Exports | Server-rendered claim handoff, audit CSV/PDF, assessment-record PDF; browser-generated public self-check PDF |

Firebase is no longer part of the stack. PHI and operational data use Canadian-region Postgres. Future Rx/referral document storage is planned for Supabase Storage but is not implemented.

## Current workflows

### Guided product demo

`/demo` is a public, read-only product tour under the marketing layout. Five
synthetic stages explain the zero-PHI handoff, structured pharmacist record,
reference-derived claim boundary, follow-up obligation, and immutable
audit/governance history. It accepts no user data and has no database, auth,
clinical-routing, red-flag, claim-derivation, browser-storage, or HNS
integration. It imports only `AILMENT_LABELS` and `ALL_AILMENT_IDS` from the
approved triage module to avoid duplicating the public condition names.
Architecture tests enforce that narrow import boundary; the real pharmacist portal remains
invitation-only with mandatory TOTP.

### Patient intake

The kiosk runs an emergency check, a deterministic narrowing tree, ailment-specific red-flag questions, claim-history self-report, existing-prescription self-report, consent confirmation, and a summary. It has five terminal outcomes: emergency, assessable, referral, not funded, and unsure.

An assessable flow creates a short-lived, single-use `intake_session` containing symptom answers and a handoff code—never a name, date of birth, health number, or other patient identifier. Emergency and red-flag exits remain structurally separate from completed assessments; a red-flag exit creates no assessment or claim draft.

The current `src/config/triage.ts` artifact received P0-A clinical approval on
2026-07-26. The approval is hash-bound in
[`CLINICAL_APPROVAL.md`](CLINICAL_APPROVAL.md); changed clinical content requires
a new pharmacist review. The intake remains a routing aid, not a diagnosis.

### Public self-check

`/check` reuses the frozen narrowing tree, emergency signs, and red flags by
import from `src/config/triage.ts`. It asks for no identity or demographics,
keeps answers only in React memory, and creates a branded PDF in the browser
without sending report data or using retained browser storage. Its only asset
request is for the public company logo. The advisory document type cannot carry
a suspected ailment; no branch contains a PIN, fee, maximum, or claim
derivation. Report limitations appear as bottom-of-page fine print, while
emergency and next-step guidance remains prominent.

The P0-A gate was satisfied on 2026-07-26, and the route is available in
production. See [`SELF_CHECK.md`](SELF_CHECK.md) for its approved privacy and
product boundaries.

### Pharmacist portal

An authenticated user can retrieve a handoff or start a walk-in assessment, enter identity from the health card, view platform claim history, attest to a clinical-viewer check, record informed consent, complete the structured clinical record, choose modality/outcome, and—when issuing a prescription—record patient address, medication directions, PCP notification, and the choice-of-pharmacy discussion.

The server resolves the prescriber from the authenticated session and pins every
read/write to the server-configured `PHARMACY_ID`. It derives a read-only
`claim_draft` from seeded reference data and shows it for hand-entry into
dispensing software. AgentOMA does **not** submit claims to HNS.

The merged P0-C completion boundary validates the inspected public-service
identifier and card fields, self/family attestation, structured
existing-prescription scenarios, patient claim-history self-report, the exact
advisory platform lookback, and clinical-viewer attestation. It fails closed on
missing or unresolved evidence. The immutable evidence sidecar requires
migration `0018`, which is not yet live; production completion must not be
treated as deployed until that migration and its database tests are verified.

For every billable completion, the same transaction now requires and creates a
structured follow-up plan with due date, intended method, and monitoring
parameters. The server-rendered follow-up worklist shows open/overdue items and
records reached or not-reached attempts, safety/efficacy evaluation, next
steps, and notes. Corrections insert replacements and supersede the original;
they never edit clinical history. Migration `0017` is live and has also passed
a from-zero Docker replay.

The portal also provides server-rendered audit records, CSV/PDF export, pharmacy
settings, team invitations, orientation recording, and an admin-only governance
surface. Governance can create complete patient exports with per-artifact
hashes, place database-enforced holds, layer immutable corrections, prepare
destruction dry runs, and record restore-drill evidence. Actual destruction is
never automatic: it requires an elapsed retention horizon, no active hold, and
a second administrator.

## Security and authorization

- better-auth is the only identity layer. Public self-signup is unavailable.
- Invitations are single-use, expiring, pharmacy-scoped, and role-scoped.
- Supported roles are `pharmacy_admin`, `pharmacist`, `intern`, `student`, and `technician`.
- TOTP is mandatory. Sessions use a 30-minute rolling policy and server-side revocation.
- Necessary pharmacist-entered PHI exists only as transient authenticated form
  state. The assessment workspace explicitly clears identity, clinical,
  consent, eligibility, history/viewer, virtual/LTC, override, and validation
  state after persistence, cancellation, intake switching, session expiry, or
  sign-out. It never writes those values to browser storage, URLs, logs, or
  analytics.
- Every `/pharmacist/*` response is `Cache-Control: private, no-store`, uses a
  no-referrer policy, and applies a same-origin-only script/connect CSP. The
  assessment form disables autocomplete at both form and sensitive-field level.
- Password and TOTP success use a full browser navigation after the httpOnly
  session cookie is set, avoiding a stale App Router state after sign-in.
- `src/proxy.ts` is an optimistic navigation gate only. It performs no authorization.
- Every portal server action calls the server-side guard to verify session,
  active role, TOTP, and assignment to the configured `PHARMACY_ID`. A session
  cannot select or switch pharmacies. Billing completion also resolves the
  eligible prescriber and orientation record.
- The legacy `?pharmacy=` QR parameter is ignored for tenancy; it always resolves
  the configured pharmacy or safe-fails when configuration is absent.
- `MOCK_PHARMACY_ID` has been removed.
- The application runs through a non-owner database role so audit and claim-draft grants are effective.

There is currently an audited pharmacy-admin break-glass path around the orientation record. That policy conflicts with the intended hard eligibility gate and must be resolved before production; see [`NEXT_STEPS.md`](NEXT_STEPS.md).

## Data model

Reference data is effective-dated and seeded idempotently:

- `ailment_group`: funded groups and trailing-365-day maximums.
- `pin`: four modality/outcome PIN rows per group with fee cents.
- `claim_rule`: data-driven same-day mutex and scope rules.
- `odb_fee_tier`: effective-dated dispensing-fee rows with an explicit remote-virtual eligibility flag.
- `ailment_red_flag`: schema for reviewed clinical rules; future clinical-content changes require renewed approval.

Operational and PHI data:

- `pharmacy`: the single configured store identity, HNS account identifier, and
  current ODB fee-tier code. A check plus unique singleton key makes a second
  row unrepresentable after migration `0015`.
- `patient`: pharmacy-scoped identity and health-card fields.
- `intake_session`: zero-PHI handoff state.
- `triage_exit`: terminal non-billable exits.
- `assessment`: versioned service snapshot containing consent, structured complaint/history/findings/plan, coded no-Rx rationale, outcome-specific prescription/PCP fields, modality/outcome, virtual location/reason, LTC facts, and retention date.
- `assessment_billability_evidence`: immutable one-to-one version-1 completion
  evidence containing the inspected eligibility document, structured
  self/family and existing-prescription gates, patient self-report, advisory
  platform assessment count with its exact exclusive trailing window, and
  pharmacist-attested clinical-viewer maximum state. It does not change the
  P0-B assessment record-version-2 contract. This table is checked in as
  migration `0018` but is not yet present in live Supabase.
- `claim_draft`: immutable billing snapshot with supersession for corrections.
- `follow_up`: immutable plan and attempt records linked one-to-many to an
  assessment; reached attempts close the work item, while not-reached attempts
  remain open. Rows inherit and recompute the assessment retention horizon.
- `audit_log`: append-only activity trail.
- `retention_policy` and `patient_record_retention`: effective policy plus the
  patient-wide horizon recomputed from the latest service.
- `record_hold`: patient- or record-scoped hold history; active rows block
  destruction in database triggers.
- `export_manifest`: complete-export artifact IDs and SHA-256 hashes.
- `access_correction_request` and `record_correction`: access workflow and
  immutable correction overlays with supersession.
- `destruction_run`: dry-run evidence and two-admin execution status.
- `restore_drill` and `audit_write_failure`: recovery evidence and non-PHI
  secondary audit-failure records.

Authentication data:

- `user`, `account`, `session`, `verification`, `two_factor`, `rate_limit`, and `invitation`.

## Database guarantees

- One assessment per patient, ailment group, and service day is enforced by a unique index.
- Insect-bite/urticaria and tick-bite same-day exclusion is enforced by an advisory-lock database trigger and tested under concurrency.
- `retain_until` is recomputed by a database trigger using the longer adult/minor retention branch.
- `audit_log` rejects updates and deletes, and the application role lacks those privileges.
- `claim_draft` rejects deletion and field mutation. Corrections insert a replacement and permanently set `superseded_by_id`; only one active draft can exist per assessment at commit.
- `follow_up` rejects deletion and field mutation. Plan/attempt corrections use
  final supersession; only one active plan exists per assessment, and
  simultaneous reached submissions are serialized.
- The newest service extends retention across every prior assessment for that
  patient; claim drafts and patient-linked audit events inherit that horizon.
- Patient and assessment source records are immutable; corrections are layered,
  not rewritten. Intake rows permit only their one-time consumption update.
- Active patient-wide or record-specific holds block destruction at the
  database layer.
- Reviewed destruction writes its audit event first, refuses the preparing
  administrator as executor, and is the only database path allowed to remove
  governed records.

## Migration state

The live Supabase database and last verified from-zero Docker database are
applied through `0017`. The repository migration chain continues through
`0018`:

| Range | Purpose |
|---|---|
| `0000`–`0003` | Reference data, removal of the legacy prototype table, operational tables, pharmacy fee/HNS fields, pharmacy-scoped patients |
| `0004_hardening` | Same-day mutex trigger and initial audit immutability |
| `0005`–`0006` | Claim-draft schema, immutable supersession, one-active-draft constraint |
| `0007`–`0010` | better-auth core, TOTP/rate limits, invitations/roles, pharmacist profile fields |
| `0011_audit_hardening` | Database retention trigger, non-owner app role, effective audit/claim grants |
| `0012_clinical_record_and_consent` | P0-B version-2 consent/clinical/prescription snapshot, completeness checks, pharmacy practice contact |
| `0013_p0_d_odb_fee_tier_reference` | Effective-dated ODB dispensing-fee reference table and pharmacy foreign-key migration |
| `0014_p0_d_ltc_fact_capture` | LTC assessment facts plus virtual/LTC database completeness checks |
| `0015_tidy_luke_cage` | Deleted the two approved disposable TEST tenants, preserved Demo auth/TOTP rows, and enforced one pharmacy |
| `0016_brown_lightspeed` | Patient-wide retention, export manifests, holds, correction overlays, deliberate destruction, restore evidence, governance audit/reporting |
| `0017_tense_pandemic` | Follow-up plans/attempts, immutable supersession, one-active-plan constraint, retention propagation, and app-role grants |
| `0018_clever_mister_fear` | Immutable P0-C billability-evidence sidecar and its application-role immutability grants; checked in but pending live migration and fresh-Docker verification |

Use `db:generate`, review the SQL, then `db:migrate`. Never use `db:push`.
`db:seed` is reference-only. `db:seed:demo` attaches synthetic records to
`PHARMACY_ID`; it was run after the live single-tenant migration and remains
idempotent.

## What is complete and what is not

Implemented work is recorded in [`COMPLETED_WORK.md`](COMPLETED_WORK.md). The
highest-priority operational step is reviewing and applying migration `0018`,
then proving the P0-C completion boundary against fresh Docker and live
Supabase. Remaining policy blockers are unresolved LTC billing guidance and
removal or approval of the orientation override. The P0-C evidence sidecar also
needs inclusion in complete-patient export/retrieval after deployment, and a
first isolated restore drill remains outstanding. See
[`NEXT_STEPS.md`](NEXT_STEPS.md) for an ordered plan and
[`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) for decisions that must come from a
pharmacist or ODB.
