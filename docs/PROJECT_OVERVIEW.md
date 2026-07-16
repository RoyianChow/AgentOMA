# AgentOMA — Project Overview

_A snapshot of what this website is and everything that has been built into it so far._
_Companion to [`docs/COMPLIANCE.md`](COMPLIANCE.md), which maps each rule to the source regulation._

---

## 1. What it is

**AgentOMA is a web platform for Ontario pharmacies to run publicly-funded _minor ailment_ assessments** — the program where a pharmacist can assess and prescribe for ~23 common conditions (rhinitis, UTI, cold sores, pink eye, etc.) and bill the Ministry of Health.

It is deliberately **two-sided**:

| Side | Who | Where | Holds PHI? |
|---|---|---|---|
| **Patient intake** | A patient on their phone in the pharmacy (possibly unwell, possibly holding a sick child) | `/assessment` — a bare kiosk screen | **No.** By design — only symptom answers, never name/DOB/health card |
| **Pharmacist portal** | The pharmacist at the counter | `/pharmacist/*` | Yes — identity is attached here, keyed from the physical health card |
| **Marketing site** | Public | `/` | No |

The core idea: the patient does a **guided, zero-PHI triage** on their own phone that narrows "something is wrong with me" down to one funded ailment (or routes them safely to 911 / a doctor / "talk to the pharmacist"). It ends in a **6-character handoff code**. The pharmacist types that code into their dashboard, reads the triage trail, adds identity from the health card, and records a compliant, billable assessment.

The whole thing is governed by a real regulation — the Ontario MoH **Executive Officer Notice: Funding for Minor Ailment Services, effective July 1 2026** (the PDF lives in [`docs/regulatory/`](regulatory/)). That notice is the source of truth for the ailment list, the PINs (billing codes), claim maximums, fees, and billing rules. Getting these wrong costs the pharmacy real money on a Ministry post-payment review, which is why so much of the work below is about **provable correctness**.

---

## 2. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2** (App Router, Turbopack) | ⚠️ Breaking changes vs older Next — e.g. middleware is renamed `proxy.ts`. See `AGENTS.md`. |
| UI | React 19, CSS Modules + one big `globals.css` | Intake uses an isolated CSS module; portal/marketing use `globals.css` utility classes |
| Language | TypeScript (strict) | `tsc --noEmit` is clean |
| Datastore | **Supabase Postgres** (region `ca-central-1`, for PHIPA residency) | |
| ORM | **Drizzle** | Chosen over Prisma (a Prisma request came in as a template paste and was reconciled back to Drizzle) |
| Env | `@t3-oss/env-nextjs` + zod, wired into `next.config.ts` | Fails the build on missing/invalid vars; no raw `process.env` in app code |
| Tests | **Vitest** | Unit tests for the money rules |
| PDF export | `jspdf` + `jspdf-autotable` | Audit-log export |
| Identity | **better-auth** (planned, not yet installed) | Firebase Auth explicitly removed |
| File storage | Supabase Storage (planned, for Rx/referral PDFs) | |

**Firebase is effectively gone.** `src/lib/firebase.ts` still exists and `firebase` is still in `package.json`, but **nothing imports it** — it is dead code scheduled for deletion.

---

## 3. Repository map

```
src/
  env.ts                         Typed/validated env (server+client split)
  app/
    layout.tsx                   Root: <html>/<body> + fonts + globals.css only. No chrome.
    globals.css                  ~2,500 lines. Marketing + portal design system.
    (site)/                      Route group WITH header/footer chrome
      layout.tsx                   <Navbar/> <main/> <Footer/>
      page.tsx                     Marketing home ("/")
    (intake)/                    Route group — BARE kiosk shell
      layout.tsx                   just <main>{children}</main>
      assessment/
        page.tsx                   Server component; passes claim maximums to the flow
        TriageFlow.tsx             The whole patient wizard (zero-PHI, client)
        TriageFlow.module.css      Isolated kiosk styling (own palette + fonts)
        actions.ts                 createIntakeSession / logTriageExit (server actions)
    (dashboard)/                 Route group — BARE portal shell (no site chrome)
      pharmacist/
        page.tsx                   Dashboard (server component): stats, intake queue, recents
        DashboardRefresher.tsx     Auto-refresh of the queue
        Dashboard.module.css
        actions.ts                 The portal's server actions (see §6)
        assessment/
          page.tsx                 Loads an intake session by id
          AssessmentWorkspace.tsx  Pharmacist records the assessment (identity + outcome)
        audit/page.tsx             Ministry audit log view + CSV/PDF export
        settings/page.tsx          Pharmacy settings (localStorage-backed — legacy)
    api/fhir/route.ts            FHIR/Kroll export — GATED (returns 403) pending auth
  components/                    Navbar, Footer (marketing chrome)
  config/
    triage.ts                    THE TRIAGE TREE: nodes, options, red flags, emergency signs
    ailment-reference.ts         SERVER-ONLY reference data (PINs, fees, maxes) — seed input
    ailments.ts                  ⚠️ LEGACY / DEAD (old prototype config, unused)
  lib/
    db/
      index.ts                   Drizzle singleton (pooled Supabase connection)
      schema/                    reference.ts + assessments.ts (+ barrel index.ts)
      migrations/                Drizzle migrations 0000–0003 (tracking is DRIFTED — see §8)
      sql/0003_hardening.sql     Hand-written idempotent hardening (triggers, REVOKE, fee tier)
      seed.ts                    npm run db:seed — reference data + "Sam Child" retention row
      verify.ts / harden.ts      Connection smoke test / applies the hardening SQL
      __tests__/                 Vitest money-rule tests
    reference/minor-ailment-reference.ts   Adversarially-verified PIN/fee/max source (seed)
    reference/types.ts
    retention.ts                 computeRetainUntil (the 10y / age-18 clock)
    audit.ts                     writeAudit() append-only helper
    constants.ts                 MOCK_PHARMACY_ID (placeholder until onboarding/auth)
    firebase.ts                  ⚠️ DEAD (no importers)
  hooks/usePharmacyConfig.ts     ⚠️ LEGACY (localStorage pharmacy profile; used by settings)
  schemas/*.ts, types/assessment.ts   ⚠️ LEGACY / DEAD (old zod schemas + types)
docs/
  COMPLIANCE.md                  Rule → EO Notice section mapping
  PROJECT_OVERVIEW.md            (this file)
  regulatory/…pdf                The EO Notice (source of truth)
```

---

## 4. The three route groups (URLs unchanged by the grouping)

Next.js route groups `(name)` don't affect the URL — they let different sections have different layouts:

- **`(site)`** → header + footer. Serves `/` (marketing home) and formerly the portal.
- **`(intake)`** → bare `<main>`. Serves `/assessment`. No nav, no exit links — it's a kiosk. `TriageFlow` paints its own full-viewport background so the marketing site's `globals.css` body styles don't bleed in.
- **`(dashboard)`** → bare shell (no site chrome). Serves `/pharmacist/*`. The dashboard supplies its own UI via `Dashboard.module.css` + `globals.css` utility classes.

The root `layout.tsx` is intentionally minimal: `<html>`/`<body>`, five loaded fonts (Geist for the site; **Bricolage Grotesque / IBM Plex Sans / IBM Plex Mono** for the intake kiosk), and the `globals.css` import.

---

## 5. Data model (Drizzle → Supabase Postgres)

**Reference tables** (`schema/reference.ts`) — seeded, versioned with `effective_date`/`end_date` so a future PIN revision can coexist:

- `ailment_group` — the 23 groups + `max_claims_per_365_days`
- `pin` — 4 PINs per group (in-person/virtual × Rx/no-Rx), each with `fee_cents`
- `ailment_red_flag` — table exists, seeded later (clinical content needs pharmacist sign-off)
- `claim_rule` — cross-ailment rules **as data**: insect⊕tick same-day mutex, warts-scope exclusion

**Operational / PHI tables** (`schema/assessments.ts`):

- `pharmacy` — `store_name`, **`odb_fee_tier`** (`regular_8_83`/`rural_9_93`/`rural_12_14`/`rural_13_25`), `hns_account_id`
- `patient` — name, `dob`, `health_number`, `gender`. **PHI.** Unique on **`(pharmacy_id, health_number)`** (single-tenant-safe scoping)
- `intake_session` — the zero-PHI handoff: `code`, `trail` (jsonb), self-reports, `expires_at`, single-use `consumed_at`
- `assessment` — the billable record: `modality`, `outcome`, `service_date`, **`retain_until`**; unique **`one_per_day`** index on `(patient_id, ailment_group_code, service_date)`
- `triage_exit` — logged when a red flag / emergency ends the flow (no claim)
- `audit_log` — **append-only** event trail (immutable at the DB level — see §7)

---

## 6. The two user flows

### 6a. Patient intake (`/assessment`, `TriageFlow.tsx`)

A guarded, single-question-per-screen wizard. **Holds no PHI.** Phases:

1. **emergency** — always first, never skippable. Any tick → `emergency_out` (call 911). No claim.
2. **triage** — walks the narrowing tree in `config/triage.ts` ("Where's the problem?" → … → one ailment). A live counter shows how many of the 23 conditions still fit.
3. **redflags** — per-ailment red-flag checklist. A hit is **terminal** → `refer` (see a doctor, **no claim**).
4. **history** — "assessed for this in the last 12 months, at _any_ pharmacy?" (self-report, advisory only).
5. **rx** — "do you already have a prescription for this?" (either "yes" blocks a claim).
6. **consent** — records that consent was given (the pharmacist re-confirms in person).
7. **summary** — shows the **6-character handoff code** + a triage recap.

Five outcomes, not two: **emergency / assessable / refer / not_funded / unsure**. The distinction between _red-flag exit_ (no claim) and _completed-then-referred_ (billable, SSC=4) is kept structurally separate — it's the one most likely to cause an improper claim.

On finish, `createIntakeSession` writes an `intake_session` (code, trail, self-reports, 2-hour expiry). **Nothing that identifies the patient is stored.**

### 6b. Pharmacist portal (`/pharmacist/*`)

- **Dashboard** (`page.tsx`, server component): today's assessment count, pending-intake count, **estimated revenue today** (computed from the seeded PIN fees), the live **intake queue**, and recent assessments. Auto-refreshes.
- **Assessment workspace** (`assessment/AssessmentWorkspace.tsx`): opened from a queue item (or as a walk-in). Pharmacist keys **identity from the physical health card**, sees the triage trail + self-reports + the platform's 365-day count, must tick a **clinical-viewer attestation**, picks outcome + modality, and signs. This calls `upsertPatient` then `createAssessment`.
- **Audit log** (`audit/page.tsx`): searchable/filterable table of all assessments with CSV + PDF export, and a 10-year-retention banner.
- **Settings** (`settings/page.tsx`): pharmacy profile — currently backed by **localStorage** via `usePharmacyConfig` (legacy; not yet the DB `pharmacy` row).

**Server actions** (`(dashboard)/pharmacist/actions.ts`) are the data layer: `getDashboardStats`, `getPendingIntakeSessions`, `getIntakeSessionById`, `checkSameDayMutex`, `upsertPatient`, `createAssessment`, `getPatientHistoryCount`, `getAllAssessments`.

---

## 7. Compliance & correctness (the parts that cost money)

Everything here maps back to the EO Notice in [`COMPLIANCE.md`](COMPLIANCE.md).

- **Reference data is a single, verified source.** All 23 ailments' PINs/fees/maxes live in `lib/reference/minor-ailment-reference.ts`, transcribed from Table 1 and **adversarially verified** (three independent agents re-extracted the PDF table and diffed it — this caught that the old prototype had 13 wrong claim-maximums and non-existent PINs). Acne's odd `9858250` No-Rx PIN is preserved exactly.
- **One claim per person / ailment / day** — a `UNIQUE` index (`assessment_one_per_day`), not app logic. A concurrent duplicate gets `23505` → friendly message.
- **Insect⊕tick same-day mutex** — enforced by a **database trigger** (`assessment_same_day_mutex_trg`) that takes a per-patient `pg_advisory_xact_lock` (serialising concurrent inserts to close a real race the app-level check couldn't) and reads the rule from `claim_rule` (data-driven). Verified live: tick-after-insect is rejected `23P01`.
- **Retention clock** — `computeRetainUntil = max(service + 10y, (dob + 18y) + 10y)`. The age-18 branch is the one everyone forgets; a seeded minor ("Sam Child", born 2019, assessed 2026) correctly lands on **2047**, not 2036 — unit-tested and verified in the DB.
- **Audit log is append-only as a _property_** — a trigger raises on any `UPDATE`/`DELETE` (verified: both rejected `0A000`), plus `REVOKE UPDATE, DELETE … FROM PUBLIC`. `createAssessment` writes an `assessment.created` audit row (no PHI in the metadata).
- **Remote-virtual fee-tier gate** — `createAssessment` hard-blocks `virtual_remote` unless the pharmacy is a rural fee tier **and** location + reason are recorded.
- **365-day count is advisory only** — the UI never says a claim _will_ be paid; the platform can't see other pharmacies' claims, so it's framed as a guide + a clinical-viewer attestation.

**Tested** (`npm run test`, 10 passing): mutex pre-check, one-per-day handling, retain age-18 branch, fee-tier gate (block + allow), intake-session expiry, red-flag exit.

---

## 8. What has been done — timeline

1. **Security triage.** Closed two live PHI-exposure holes first: the FHIR route (accepted PHI from any unauthenticated caller — now `403`) and the old assessment page (wrote the full payload to Firestore/localStorage from the browser — removed).
2. **Reference data + compliance map.** Verified PIN/fee/max source file; `docs/COMPLIANCE.md`; the EO Notice added under `docs/regulatory/`.
3. **Typed env.** `src/env.ts` (@t3-oss) wired into the build; `.env.example`; Firebase Auth removed.
4. **Drizzle + Supabase.** Connection singleton, reference schema, first migration + idempotent seed, verified end-to-end.
5. **Intake rebuilt** as the zero-PHI `TriageFlow` (route groups isolate it from site chrome; own CSS module + kiosk fonts; ≥56px tap targets; usable one-handed at 375px).
6. **Pharmacist portal rebuilt** on server actions (dashboard, walk-in workspace, audit, intake-session handoff via the 6-char code).
7. **Money-rule hardening.** Vitest installed + tests running; DB-level mutex trigger; audit-log immutability + REVOKE; `pharmacy.odb_fee_tier`/`hns_account_id` + the remote-virtual gate; per-pharmacy patient uniqueness; the age-18 retention branch.

---

## 9. Known gaps & tech debt (what's _not_ done)

**Big rocks still open:**

- **No authentication yet.** better-auth is planned but not installed. `/pharmacist/*` is **unprotected**, and everything uses `MOCK_PHARMACY_ID`. No login, no roles, no 2FA, no invitations, no `proxy.ts`, no orientation-attestation billing gate. This is the largest missing piece.
- **Claim assembly (`deriveClaimDraft`) not built.** The pieces exist (PIN reference data, fee tier, the fee/PIN lookup), but the actual `ClaimDraft` — deriving PIN + fee + prescriber ID (`09` / `PHR888`) + intervention codes (`PS`/`ML`) + quantity + `SSC=4` — and persisting/exporting it is not yet implemented.
- **LTC branch** (capitation / `$0` / secondary-provider `LT`) is not implemented.

**Compliance/quality gaps:**

- **Clinical content is unvalidated.** Every triage question and red flag in `config/triage.ts` is marked **PHARMACIST REVIEW REQUIRED**. The **tick-bite 72-hour** threshold is explicitly a _guess_ and must be replaced with OCP's Lyme PEP algorithm before go-live (it's time-critical).
- **Audit page pulls PHI to the client.** `getAllAssessments()` returns patient name/DOB/health number to the browser audit table. Fine functionally, but there's no auth gate and it's client-side PHI.
- **`retain_until` isn't DB-enforced.** It's computed correctly in the app + seed, but a direct insert could set it wrong (a computed-column/trigger backstop would harden it).
- **Audit coverage is thin.** Only `assessment.created` is written; most actions don't emit audit events, and the write is best-effort (not in the same transaction as the assessment).
- **Pharmacy config is split.** Settings uses a **localStorage** profile (`usePharmacyConfig`) while the real fee tier lives in the DB `pharmacy` row — these should be unified.

**Housekeeping:**

- **Migration tracking is drifted.** The DB was built with `drizzle-kit push`, so `__drizzle_migrations` is out of sync and `drizzle-kit migrate` will fail. Schema/trigger changes are currently applied via the idempotent **`npm run db:harden`**. Needs a one-time **baseline** to make `migrate` usable again.
- **Dead code to delete:** `src/config/ailments.ts`, `src/types/assessment.ts`, `src/schemas/*`, `src/lib/firebase.ts`, and the `firebase` dependency. The FHIR route's `buildFhirResponse` is preserved but unreachable.
- **`README.md` is still the create-next-app boilerplate** (this file is the real overview).

---

## 10. Running it

Requires Node (Node 22 known-good) and a Supabase Postgres instance.

```bash
cp .env.example .env.local          # fill in DATABASE_URL / DIRECT_URL (+ others)
npm install
npm run db:harden                   # apply schema additions + triggers + REVOKE (idempotent)
npm run db:seed                     # reference data + Sam Child retention row (idempotent)
npm run dev                         # http://localhost:3000
```

**Scripts:** `dev` · `build` · `start` · `lint` · `test` / `test:watch` · `db:generate` · `db:migrate` _(drifted — see §9)_ · `db:push` · `db:studio` · `db:seed` · `db:verify` · `db:harden`.

**Env vars** (validated in `src/env.ts`): `DATABASE_URL` (pooled, 6543), `DIRECT_URL` (direct, 5432), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `CLINICAL_VIEWER_BASE_URL`, `NEXT_PUBLIC_APP_URL`.

**Verify the hardening** (mutex + audit immutability) any time by re-running the DB checks; the money rules are covered by `npm run test`.
