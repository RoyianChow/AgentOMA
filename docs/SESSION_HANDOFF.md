# Session handoff

For a fresh agent with an empty context window. Read this + `AGENTS.md` and you can resume
without re-reading the repo. Architecture lives in `PROJECT_OVERVIEW.md`; rules in
`COMPLIANCE.md`; unresolved ambiguities in `OPEN_QUESTIONS.md`.

**Last updated:** **Part 4 (auth) is COMPLETE — all five slices, committed one per slice.**
better-auth 1.6.23: email+password on the Drizzle adapter · mandatory TOTP ·
30-min rolling sessions + DB-backed rate limits · invitation-only onboarding with
roles + supervisor links · `proxy.ts` (UX only) with `requirePortalUser()` inside
every server action as the real boundary · `MOCK_PHARMACY_ID` fully gone (grep is
empty; kiosk resolves its pharmacy server-side via `KIOSK_PHARMACY_ID` env or the
single row) · prescriber OCP comes from the profile (supervisor's for
interns/students) · orientation gate refuses completion before `deriveClaimDraft`.
**67/67 green. Next: Part 5 — audit page server-side.** Nothing is half-finished.

---

## 1. Landmines — read before running anything

- **Use Git Bash, not PowerShell.** PowerShell has script execution disabled (`npm.ps1 cannot be
  loaded`), so every `npm` call fails there. The user must run this **once**, in PowerShell, to fix
  their own terminal — it is a user action, do not try to change execution policy from a tool call:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```
- **Node is not on the Bash PATH.** Prefix every command:
  ```bash
  export PATH="$HOME/AppData/Local/nvm/v22.22.2:$PATH"   # node 22.22.2 / npm 10.9.7
  ```
- **`npx` does not exist here.** Use `npm run <script>` or `node ./node_modules/<pkg>/bin/...`
  (e.g. `node ./node_modules/typescript/bin/tsc --noEmit`).
- **Docker is not on the Bash PATH either**, and **Docker Desktop must be RUNNING** for the
  constraint tests:
  ```bash
  export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"
  ```
- **`gh` CLI is not installed.** You cannot open a PR; hand the user
  `https://github.com/RoyianChow/AgentOMA/pull/new/<branch>`.
- **Drizzle wraps driver errors** in `DrizzleQueryError` — the Postgres SQLSTATE is on `.cause`,
  not the top-level error. Tests use a `pgErrorCode()` helper to unwrap. Don't assert
  `rejects.toMatchObject({ code })` against `db.execute`.

---

## 2. Database state

**Live (Supabase, `ca-central-1`) is at `0006`. All 7 migrations recorded. Data is real — do not
truncate it** (patient=5, assessment=7+, audit_log, pharmacy=3).

| Migration | What it does |
|---|---|
| `0000` | Reference tables: `ailment_group`, `pin`, `ailment_red_flag`, `claim_rule` |
| `0001`/`0002` | Operational + PHI: `pharmacy`, `patient`, `intake_session`, `assessment`, `triage_exit`; `assessment_one_per_day` unique index |
| `0003` | `odb_fee_tier` enum + `pharmacy.odb_fee_tier`/`hns_account_id`; `audit_log`; patient uniqueness scoped to `(pharmacy_id, health_number)` |
| **`0004_hardening`** | **same-day mutex trigger** on `assessment` (per-patient `pg_advisory_xact_lock` + reads `claim_rule`; raises **`23P01`**) · **`audit_log` immutability trigger** (raises **`0A000`** on UPDATE/DELETE) · `REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC` |
| `0005` | `claim_draft` table |
| **`0006`** | `claim_draft` **deferrable partial EXCLUDE** (one active draft per assessment; `23P01`) · `claim_draft` immutability trigger (`0A000`) · `REVOKE DELETE` |
| `0007` | better-auth core: `user` (with `role` enum + `pharmacy_id`), `session`, `account`, `verification` — uuid PKs |
| `0008` | `two_factor` + `rate_limit` tables; `user.two_factor_enabled` |
| `0009` | `invitation` table (token **hash** only, single-use, expiring); `user.supervising_pharmacist_id` |
| `0010` | `user.ocp_number` / `is_as_of_right` / `orientation_completed_at` |

**Live is at `0010`.**

### Rules that are not negotiable
- **`db:push` is BANNED and removed from `package.json`.** It drops columns on a PHI database and
  bypasses migration tracking — which is exactly how this repo drifted once already. The only path
  is **`db:generate` → review the SQL → `db:migrate`**. `drizzle.config.ts` documents this.
- **Triggers/grants aren't modelled by Drizzle.** Add them via `db:generate --custom`
  (see `0004`, `0006`) — **never** an out-of-band script. The old `db:harden` script is deleted;
  when it existed, a fresh database silently had **no mutex trigger**.
- Migration tracking was previously drifted (push-built; only `0000` recorded). It was baselined by
  computing Drizzle's own hash (`sha256` of the raw `.sql` file content, `created_at` = journal
  `when`) — **verified against Drizzle's existing `0000` row before inserting**. It is healthy now:
  `db:migrate` is a no-op, `db:generate` reports "No schema changes".

---

## 3. What's DONE

- **Parts 0–2:** toolchain verified; dead code deleted (`config/ailments.ts` — which held 13 wrong
  claim maximums — plus `types/assessment.ts`, `schemas/*`, `firebase.ts` and the `firebase` dep,
  −1,970 lines); migrations back on the file-based path.
- **`deriveClaimDraft`** — `src/lib/claims/derive-claim-draft.ts`. **Pure**: no DB, no literals.
  `resolvePin` is **injected** — *the caller does the DB lookup against the seeded `pin` table and
  passes it in.* Keep it that way.
  - Returns `{ billable: true; draft } | { billable: false; reason }`. **It refuses; it never
    defaults.** An unknown PIN lookup → `UNKNOWN_PIN_LOOKUP` (the pre-Drizzle `pinMap` silently fell
    back to Rhinitis for 18 ailments — there is a test whose only job is to be that bug's tombstone).
  - `NOT_BILLABLE_MESSAGES` holds the pharmacist-facing text for each reason.
- **Test harness** — `docker-compose.yml` (postgres:16, **tmpfs**, port **5433**).
  `npm run test:db:up` / `test:db:down`. `src/lib/db/test/harness.ts` has `assertLocalTestDb()`
  which **refuses any non-localhost/Supabase URL** (the tests truncate). `global-setup.ts` **drops
  and migrates from zero every run**, which is itself the proof that the migration chain is
  self-sufficient. Seeding is shared with `db:seed` via `seed-reference.ts`.
- **Part 3 COMPLETE.** `createAssessment` derives the claim (caller does the `resolvePin` lookup
  over `pin` where `end_date IS NULL`), inserts **exactly one** `claim_draft` on billable and
  **nothing** on non-billable. `ClaimDraftPanel.tsx` renders it read-only with the HNS boundary on
  the panel. A non-billable result is shown as a plain reason, not an error.
- **56/56 tests green** (`npm run test`, **needs Docker up**), across 4 files: pure derivation, pure
  retention, real-PG constraints, real-PG completion action. Includes the **two-transaction
  insect/tick race** (exactly one survives), one-per-day, 365-day lookback, supersede atomicity,
  immutability, and **a red-flag exit writing ZERO claim rows**.

### Test-harness gotchas learned the hard way
- **`fileParallelism: false`** in `vitest.config.ts` is load-bearing. The DB test files share one
  database and truncate between tests; in parallel, one file's reset wipes another's fixtures and
  the failures masquerade as rule bugs.
- The old `src/lib/db/__tests__/assessment-rules.test.ts` was **deleted**. It mocked the db, so its
  "one-per-day" test only proved a hand-thrown `{ code: "23505" }` got formatted nicely. Don't
  reintroduce mocked constraint tests.
- **Docker Desktop stops on its own.** If tests fail with `ECONNREFUSED ::1:5433`, the engine is
  down — relaunch `"/c/Program Files/Docker/Docker/Docker Desktop.exe"`, wait for `docker ps`, then
  `npm run test:db:up`.

---

## 4. What is NOT done — resume here

1. **Part 5 — audit page (NEXT).** Move `src/app/(dashboard)/pharmacist/audit/page.tsx` fully
   server-side; it still pulls PHI (name/DOB/health number) to the client via
   `getAllAssessments()` — the action is now auth-gated and pharmacy-scoped (Part 4), but the
   client-side PHI transfer remains. Also clears the `no-explicit-any` at `audit/page.tsx:182`.
   Verify the audit `REVOKE`/trigger are live on the **real** DB, not just in the migration.

2. **Smaller follow-ups discovered/left by Part 4** (none block Part 5):
   - Settings page still uses the localStorage profile (`usePharmacyConfig`) — unify with the DB
     `pharmacy` row.
   - Kiosk provisioning: with 2+ pharmacy rows the kiosk needs `KIOSK_PHARMACY_ID` set (env) or it
     refuses intakes by design. Real per-device provisioning is future work.
   - Post-TOTP-verify redirect: after the enroll-2fa verify succeeds, the client-side
     `router.push("/pharmacist")` can appear to stay on the enroll page (Next dev router cache);
     a fresh navigation lands correctly. Cosmetic; revisit with an eye on `router.refresh()`.
   - Password reset needs an email transport before `requestPasswordReset` does anything useful
     (rate limits are already in place). Admin-driven re-invite is the interim answer.
   - The old baseline lint warning is gone (now 6 errors / 0 warnings, all pre-existing).
   - Orientation completion is recorded by a pharmacy admin on /pharmacist/team; there is no
     evidence upload — it is an attestation. Decide later if OCP evidence needs storing.

### Part 4 auth — where things live (for the next session)
- `src/lib/auth.ts` — better-auth instance (TOTP plugin, 30-min/5-min rolling sessions,
  DB-backed rate limits, `disableSignUp`, `generateId: "uuid"`, `nextCookies` last).
- `src/lib/auth-guard.ts` — **`requirePortalUser()` is THE security boundary**; every portal
  server action calls it. `requirePortalPage()` is the redirecting page variant. `proxy.ts` is
  an optimistic cookie check only.
- `src/lib/invitations.ts` — issue/accept (token hash only, atomic single-use claim,
  better-auth-compatible credential rows). `src/lib/db/bootstrap-admin.ts` +
  `npm run auth:bootstrap-admin` creates the FIRST admin only.
- Tests stub `@/lib/auth-guard` (no HTTP session in unit tests) but hit real Postgres for
  everything else; vitest sets `SKIP_ENV_VALIDATION=1`.
- `MOCK_PHARMACY_ID` no longer exists anywhere; the seed's demo pharmacy id lives as a local
  constant in `seed.ts` only.

---

## 5. Fences — off-limits without the lead's sign-off

- **Red-flag content and the triage tree** (`src/config/triage.ts`). The **tick-bite 72-hour
  threshold is a GUESS** and is flagged as such — do not "improve" it. All clinical content is
  `PHARMACIST REVIEW REQUIRED`.
- **Reference PIN data** (`src/config/ailment-reference.ts`, `src/lib/reference/*`, seeded tables).
  **Never derive a PIN, fee, claim maximum, or intervention code from memory.**
- **The five-outcome structure and the terminal red-flag exit.** A red-flag exit writes **zero**
  claim rows — this is an invariant, and `deriveClaimDraft` refuses `RED_FLAG_EXIT` as a backstop.
- **The zero-PHI patient intake.** `TriageFlow.tsx` must never collect name/DOB/health card.
- **Migrations, `deriveClaimDraft`, the audit log** — changes need explicit sign-off.
- See **`docs/OPEN_QUESTIONS.md`**: the LTC secondary/non-emergency ambiguity (we refuse,
  conservatively, pending the ODB Help Desk — **do not resolve it by reasoning**), the tick-bite
  threshold, and the unreviewed triage content.

---

## 6. Definition of done for any commit

`tsc --noEmit` clean · `npm run test` green (Docker up for the constraint tests) · lint **no worse
than baseline (now 6 errors, 0 warnings — all pre-existing** in `audit/page.tsx`,
`api/fhir/route.ts`, `settings/page.tsx`, `Navbar.tsx`, `(site)/page.tsx`**)** · no new
`process.env` outside `src/env.ts` · no PHI in client components or logs.

**Part 3 + Part 4 now stand together — the branch is PR-able.** Part 5 can follow in the same PR
or the next one; the audit page's client-side PHI pull is the one thing to weigh before opening it.
