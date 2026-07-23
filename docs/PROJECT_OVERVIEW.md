# AgentOMA project overview

**Status snapshot:** 2026-07-23

**Current stage:** authenticated pilot foundation; **not production-ready**

**Verification at this snapshot:** TypeScript clean, ESLint clean, and 41/41
database-free tests pass. The live database is through `0014`, with four fee
tiers and unchanged counts of 3 pharmacies and 12 assessments. The last full
database-backed suite had 85 passing tests; the new P0-D integration tests await
an environment with Docker Desktop/CLI available.

AgentOMA supports Ontario pharmacy minor-ailment services. The Ministry of Health Executive Officer Notice effective July 1, 2026 is the source of truth for covered ailment groups, claim maximums, fees, PINs, and billing rules. See [`COMPLIANCE.md`](COMPLIANCE.md) for traceability and [`NEXT_STEPS.md`](NEXT_STEPS.md) for the remaining go-live work.

## Product surfaces

| Surface | Route | Purpose | PHI policy |
|---|---|---|---|
| Marketing site | `/` | Public product information | No PHI |
| Public self-check | `/check` | Pharmacy-agnostic symptom self-check and client-generated pre-visit/advisory PDF; development review only | Zero identifying data; nothing sent or persisted |
| Patient intake | `/assessment` | Mobile kiosk triage and six-character handoff | Collects zero PHI by design |
| Authentication | `/sign-in`, `/enroll-2fa`, `/accept-invitation` | Invitation-only portal access and mandatory TOTP | Authentication data only |
| Pharmacist portal | `/pharmacist/*` | Intake retrieval, patient identity, assessment, claim draft, audit, settings, team | Contains PHI; authenticated and pharmacy-scoped |
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

### Patient intake

The kiosk runs an emergency check, a deterministic narrowing tree, ailment-specific red-flag questions, claim-history self-report, existing-prescription self-report, consent confirmation, and a summary. It has five terminal outcomes: emergency, assessable, referral, not funded, and unsure.

An assessable flow creates a short-lived, single-use `intake_session` containing symptom answers and a handoff code—never a name, date of birth, health number, or other patient identifier. Emergency and red-flag exits remain structurally separate from completed assessments; a red-flag exit creates no assessment or claim draft.

Clinical content in `src/config/triage.ts` still requires pharmacist review. Do not treat the intake as a diagnosis.

### Public self-check

`/check` reuses the frozen narrowing tree, emergency signs, and red flags by
import from `src/config/triage.ts`. It asks for no identity or demographics,
keeps answers only in React memory, and creates the PDF in the browser without a
server request or retained browser storage. The advisory document type cannot
carry a suspected ailment; no branch contains a PIN, fee, maximum, or claim
derivation.

The route returns 404 in production until P0-A pharmacist sign-off. See
[`SELF_CHECK.md`](SELF_CHECK.md) for the approved decisions and release gate.

### Pharmacist portal

An authenticated user can retrieve a handoff or start a walk-in assessment, enter identity from the health card, view platform claim history, attest to a clinical-viewer check, record informed consent, complete the structured clinical record, choose modality/outcome, and—when issuing a prescription—record patient address, medication directions, PCP notification, and the choice-of-pharmacy discussion.

The server resolves the pharmacy and prescriber from the authenticated session. It derives a read-only `claim_draft` from seeded reference data and shows it for hand-entry into dispensing software. AgentOMA does **not** submit claims to HNS.

The portal also provides server-rendered audit records, CSV/PDF export, pharmacy settings, team invitations, and orientation recording.

## Security and authorization

- better-auth is the only identity layer. Public self-signup is unavailable.
- Invitations are single-use, expiring, pharmacy-scoped, and role-scoped.
- Supported roles are `pharmacy_admin`, `pharmacist`, `intern`, `student`, and `technician`.
- TOTP is mandatory. Sessions use a 30-minute rolling policy and server-side revocation.
- `proxy.ts` is an optimistic navigation gate only. It performs no authorization.
- Every portal server action calls the server-side guard to verify session, active role, and pharmacy scope. Billing completion also resolves the eligible prescriber and orientation record.
- `MOCK_PHARMACY_ID` has been removed.
- The application runs through a non-owner database role so audit and claim-draft grants are effective.

There is currently an audited pharmacy-admin break-glass path around the orientation record. That policy conflicts with the intended hard eligibility gate and must be resolved before production; see [`NEXT_STEPS.md`](NEXT_STEPS.md).

## Data model

Reference data is effective-dated and seeded idempotently:

- `ailment_group`: funded groups and trailing-365-day maximums.
- `pin`: four modality/outcome PIN rows per group with fee cents.
- `claim_rule`: data-driven same-day mutex and scope rules.
- `odb_fee_tier`: effective-dated dispensing-fee rows with an explicit remote-virtual eligibility flag.
- `ailment_red_flag`: schema for reviewed clinical rules; clinical content remains gated on pharmacist approval.

Operational and PHI data:

- `pharmacy`: store identity, HNS account identifier, and foreign key to the current ODB fee-tier code.
- `patient`: pharmacy-scoped identity and health-card fields.
- `intake_session`: zero-PHI handoff state.
- `triage_exit`: terminal non-billable exits.
- `assessment`: versioned service snapshot containing consent, structured complaint/history/findings/plan, coded no-Rx rationale, outcome-specific prescription/PCP fields, modality/outcome, virtual location/reason, LTC facts, and retention date.
- `claim_draft`: immutable billing snapshot with supersession for corrections.
- `audit_log`: append-only activity trail.

Authentication data:

- `user`, `account`, `session`, `verification`, `two_factor`, `rate_limit`, and `invitation`.

## Database guarantees

- One assessment per patient, ailment group, and service day is enforced by a unique index.
- Insect-bite/urticaria and tick-bite same-day exclusion is enforced by an advisory-lock database trigger and tested under concurrency.
- `retain_until` is recomputed by a database trigger using the longer adult/minor retention branch.
- `audit_log` rejects updates and deletes, and the application role lacks those privileges.
- `claim_draft` rejects deletion and field mutation. Corrections insert a replacement and permanently set `superseded_by_id`; only one active draft can exist per assessment at commit.

## Migration state

The live database is applied through `0014`:

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

Use `db:generate` then `db:migrate`. Never use `db:push`. `db:seed` is reference-only; local demo records require the separate `db:seed:demo` command, which must never run against production.

## What is complete and what is not

Implemented work is recorded in [`COMPLETED_WORK.md`](COMPLETED_WORK.md). The
highest-priority gaps are clinical-content sign-off (which also gates `/check`),
unresolved LTC billing guidance, server-enforced
eligibility/existing-prescription/history gates, and
removal or approval of the orientation override. See
[`NEXT_STEPS.md`](NEXT_STEPS.md) for an ordered plan and
[`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) for decisions that must come from a
pharmacist or ODB.
