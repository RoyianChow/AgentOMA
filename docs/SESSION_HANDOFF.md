# Session handoff

For a fresh agent with an empty context window. Read this + `AGENTS.md` and you can resume
without re-reading the repo. Architecture lives in `PROJECT_OVERVIEW.md`; rules in
`COMPLIANCE.md`; unresolved ambiguities in `OPEN_QUESTIONS.md`.

**Last updated:** after Part 3 core (`deriveClaimDraft`) landed and was proven on real Postgres.

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
- **58/58 tests green** (`npm run test`, needs Docker up), including the **two-transaction
  insect/tick race** (exactly one survives), one-per-day, 365-day lookback, supersede atomicity,
  and immutability.

---

## 4. What is NOT done — resume here

1. **Part 3 remainder — claim_draft persist + UI seam** *(small)*
   - Wire `deriveClaimDraft` into the assessment-completion server action
     (`src/app/(dashboard)/pharmacist/actions.ts` → `createAssessment`). On `{ billable: true }`
     insert the `claim_draft` row; on `{ billable: false }` **persist nothing** and surface the reason.
   - Read-only claim-draft panel in `AssessmentWorkspace.tsx`: show every derived field (PIN, fee,
     prescriber ref `09`, prescriber ID, intervention codes, quantity, SSC), nothing editable, with
     the boundary stated in the panel: *"For hand-entry into your dispensing software. Nothing is
     submitted to HNS from here."* A `{ billable: false }` result shows the reason plainly, not as an
     error state.
   - Test: billable → exactly one active draft; non-billable → zero; **a red-flag exit still writes
     zero claim rows** (must stay provable).
2. **Part 4 — auth. Build in committable slices; commit after each.** A half-removed
   `MOCK_PHARMACY_ID` is worse than none — do not start slice 4 unless you can finish it.
   1. Schema + better-auth core (Drizzle adapter; user/session/account/verification via
      `db:generate` → `db:migrate`); email + password.
   2. TOTP (mandatory) + 30-min rolling sessions + server-side revocation + rate-limited
      sign-in/reset.
   3. Invitations (no public signup; pharmacy-admin, single-use, expiring) + roles
      `pharmacy_admin` / `pharmacist` / `intern` / `student` / `technician`.
   4. Route protection + **kill `MOCK_PHARMACY_ID`**. `proxy.ts` is an **optimistic UX gate only**
      (Next 16 renamed `middleware` → `proxy`); **every server action re-verifies session + role +
      orientation attestation** — comment that where the checks live.
   5. **Orientation gate** — no recorded module completion → the completion action refuses **before
      `deriveClaimDraft` is ever called**. Server-side, not UI. Test it.
3. **Part 5 — audit page.** Move `src/app/(dashboard)/pharmacist/audit/page.tsx` fully server-side;
   it currently pulls PHI (name/DOB/health number) to the client via `getAllAssessments()`. Also
   clears the `no-explicit-any` at `audit/page.tsx:182`. Verify the audit `REVOKE`/trigger are live
   on the **real** DB, not just in the migration.

### `MOCK_PHARMACY_ID` — every use (slice 4 must clear all of them)
`src/lib/constants.ts` (definition) · `src/app/(intake)/assessment/TriageFlow.tsx` ·
`src/app/(dashboard)/pharmacist/page.tsx` · `src/app/(dashboard)/pharmacist/assessment/AssessmentWorkspace.tsx` ·
`src/lib/db/seed.ts` (seed may legitimately keep a fixed demo pharmacy — decide deliberately).

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
than baseline (6 errors, 1 warning — all pre-existing** in `audit/page.tsx`, `api/fhir/route.ts`,
`settings/page.tsx`, `Navbar.tsx`, `(site)/page.tsx`, `(intake)/assessment/actions.ts`**)** · no new
`process.env` outside `src/env.ts` · no PHI in client components or logs.

**No PR until Part 3-complete + Part 4 stand together.** Part 5 can follow.
