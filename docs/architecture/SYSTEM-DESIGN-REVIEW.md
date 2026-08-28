# AgentOMA — System Architecture Review (Workstream 1: Current State)

**Nature:** documentation and analysis only. No protected clinical, billing, migration, or audit
behavior is modified by this document, and none of its findings imply approval to change any of
it.

**Baseline verified against:** `origin/main` as checked out on the `docs/architecture-system-review`
branch, cross-referenced against `docs/PROJECT_OVERVIEW.md`, `docs/COMPLIANCE.md`,
`docs/NEXT_STEPS.md`, and `docs/tasks/autonomous-pharmacy/CURRENT-IMPLEMENTATION-STATUS.md`
(snapshot dated 2026-08-26), plus direct inspection of `src/env.ts`, `src/lib/db/index.ts`,
`drizzle.config.ts`, `src/proxy.ts`, `package.json`, `.github/workflows/ci.yml`,
`docker-compose.yml`, and `docs/RESTORE_DRILL.md`.

**Method note, per the task's own instruction:** the task brief that requested this review
asserted a baseline including "Vercel hosting." That claim was checked against the repository,
not assumed — see §9. Every other baseline item in the brief was independently verified; where
verification confirms the claim, this document says so and cites the source; where it doesn't,
this document says that too.

---

## 1. Application boundaries and route groups

Next.js 16 App Router with route groups that isolate layout without changing URLs
(`docs/PROJECT_OVERVIEW.md` lines 47–54, confirmed against `src/app/`):

| Group | Purpose | PHI |
|---|---|---|
| `(site)` | Public marketing (`/`), public header/footer | None |
| `(self-check)` | Bare layout, `/check` — client-side symptom self-check | None (client memory only, nothing sent) |
| `(intake)` | Bare kiosk layout, `/assessment` — patient triage handoff | Zero PHI by design (symptom/handoff state only) |
| `(auth)` | `/sign-in`, `/enroll-2fa`, `/accept-invitation` | Auth data only |
| `(dashboard)` | `/pharmacist/*` — the pharmacist portal | Contains PHI; authenticated, pharmacy-scoped |
| `api/` | `/api/auth/[...all]` (better-auth), `/api/fhir` (disabled, 403) | N/A |

This is a clean boundary: the zero-PHI public surfaces and the PHI-bearing authenticated surface
are structurally separate route trees, not a single tree gated by a runtime check. That
separation is a genuine architectural strength — a routing mistake in the public site cannot by
itself expose `/pharmacist/*`.

## 2. Authentication and authorization boundaries

Two distinct layers, and the repository is explicit that they are not interchangeable:

1. **`src/proxy.ts`** (32 lines, read in full) — checks only for the *presence* of a session
   cookie via `getSessionCookie` and redirects to `/sign-in` if absent, scoped to
   `/pharmacist/:path*`. Its own header comment states, verbatim: *"OPTIMISTIC UX GATE ONLY —
   THIS FILE PERFORMS NO AUTHORIZATION."* It cannot verify the session is valid, unexpired, or
   belongs to an active user — a forged or stale cookie passes this gate.
2. **`requirePortalUser()` / `requirePortalPage()`** (`src/lib/auth-guard.ts`) — the actual
   boundary. Every portal server action independently re-verifies the better-auth session,
   active role, mandatory TOTP, and assignment to the server-configured `PHARMACY_ID`
   (`docs/PROJECT_OVERVIEW.md` lines 249–253). A session cannot select or switch pharmacies —
   `PHARMACY_ID` is server-only, never client-supplied.

Identity is better-auth only (no parallel auth mechanism), invitation-only (no public sign-up),
role set is `pharmacy_admin | pharmacist | intern | student | technician`, sessions use a
30-minute rolling policy with server-side revocation, and TOTP is mandatory with no override
path.

**Architectural assessment:** this two-layer design (cheap optimistic redirect + expensive
authoritative recheck on every server action) is the correct pattern for Next.js Server
Components/Actions, where middleware cannot safely be the sole gate. The risk surface is not the
pattern itself but *discipline*: every new server action must remember to call the guard. This is
presently enforced by convention and code review, not by a structural mechanism that would make
forgetting the guard impossible — see §11 (missing abstractions).

## 3. PHI and non-PHI data flows

| Surface | Collects | Persists | PHI class |
|---|---|---|---|
| `/` marketing | Nothing | Nothing | None |
| `/demo` | Nothing (read-only tour) | Nothing | None |
| `/check` | Symptom answers, in browser memory only | Nothing — client-generated PDF, no network send | None |
| `/assessment` (kiosk intake) | Symptom answers, red-flag responses | `intake_session` (zero-PHI by design — no name, DOB, health number) | None |
| `/pharmacist/*` | Health-card identity, clinical record, consent, prescription, billing | `patient`, `assessment`, `assessment_billability_evidence`, `claim_draft`, `follow_up`, `audit_log` | High — the only PHI-bearing surface |

The necessary-PHI boundary is narrow and explicit: transient PHI exists only as authenticated
assessment-form state, and the codebase's own convention (verified in `docs/PROJECT_OVERVIEW.md`
lines 238–243, consistent with this repo's `AGENTS.md`-equivalent conventions) is to clear that
state after persistence, cancellation, intake switching, session expiry, or sign-out — never
writing it to browser storage, URLs, logs, or analytics. `/pharmacist/*` responses are
`Cache-Control: private, no-store` with a same-origin-only CSP and no-referrer policy.

**Trust transition point:** the six-character handoff code linking a zero-PHI `intake_session` to
a pharmacist-entered PHI record is the one place non-PHI and PHI data flows meet. It is a
short-lived, single-use code — worth a dedicated diagram (Workstream 4, item 7).

## 4. Database schema and transaction boundaries

Supabase Postgres, `ca-central-1` (Canadian region — required for PHIPA, per
`docs/COMPLIANCE.md` line 128, which grades this ✅). Drizzle ORM, `postgres-js` driver.

**Connection topology** (`src/lib/db/index.ts`, `drizzle.config.ts`, both read in full):
- **Runtime** uses the *pooled* connection (`DATABASE_URL`, Supabase's pgBouncer transaction
  pooler, port 6543), with `prepare: false` because pgBouncer's transaction mode doesn't support
  prepared statements, and `ssl: "require"`.
- **Migrations** use the *direct* connection (`DIRECT_URL`, port 5432, falling back to
  `DATABASE_URL` if unset) — `drizzle-kit` must bypass the pooler.
- The client is a singleton cached on `globalThis` in non-production, specifically to survive
  Next.js dev hot-reload without exhausting connections — a deliberate, documented workaround for
  a well-known Next.js dev-mode pitfall, not an oversight.

**Migration discipline:** 19 file-based migrations (`0000` through `0018`) under
`src/lib/db/migrations/`. `db:push` is not merely discouraged in docs — the `db:push` npm script
has been physically removed from `package.json`, and `drizzle.config.ts`'s own header comment
explains why in operational terms (a past incident where the live DB drifted from migration
history via `push`, since reconciled). The sanctioned path is `db:generate` → review the SQL →
`db:migrate`, enforced by convention (no CI gate currently blocks a stray `db:push` invocation,
since the script no longer exists to invoke — see §11 for the residual risk this doesn't fully
close).

**Schema shape** (from `docs/PROJECT_OVERVIEW.md` §"Data model", cross-checked against migration
count and table names, not independently re-derived from raw SQL for this pass): reference data
(`ailment_group`, `pin`, `claim_rule`, `odb_fee_tier`, `ailment_red_flag`); operational/PHI data
(`pharmacy`, `patient`, `intake_session`, `triage_exit`, `assessment`,
`assessment_billability_evidence`, `claim_draft`, `follow_up`, `audit_log`, `retention_policy`,
`patient_record_retention`, `record_hold`, `export_manifest`,
`access_correction_request`/`record_correction`, `destruction_run`,
`restore_drill`/`audit_write_failure`); auth data (`user`, `account`, `session`, `verification`,
`two_factor`, `rate_limit`, `invitation`).

**Transactional guarantees, database-enforced (not application-trusted):**
- One assessment per patient/ailment-group/service-day — unique index.
- Insect-bite/urticaria vs. tick-bite same-day exclusion — advisory-lock trigger, tested under
  concurrency.
- `retain_until` recomputation — database trigger, longer-of-two-branches logic.
- `audit_log` and `claim_draft` reject UPDATE/DELETE at the database privilege level (the
  application's own Postgres role lacks those grants — not merely application-layer refusal).
- `follow_up` uses final supersession with a deferrable one-active-plan-per-assessment
  constraint, serializing simultaneous "reached" submissions.
- Single-tenancy is a database constraint, not an application assumption: a `CHECK` plus unique
  singleton key on `pharmacy` makes a second row unrepresentable.

This is a notably strong pattern: money-rule and immutability guarantees live in the database
(triggers, privilege revocation, constraints), not solely in application code that a future
change could accidentally weaken. `AGENTS.md`-style repo convention requires money-rule tests to
run against real Postgres rather than mocks for exactly this reason.

## 5. Audit, retention, correction, and export design

- **Audit:** append-only `audit_log`, database-enforced immutable (trigger + revoked
  UPDATE/DELETE privilege on the app role). `docs/COMPLIANCE.md` line 116 notes the
  assessment-created event now shares the completion transaction (real-Postgres rollback proof
  exists; execution gate G1-D is still pending per that doc).
- **Retention:** ten years from last service, or ten years after age 18, whichever is later —
  computed by a database trigger, and the *newest* service extends retention across every prior
  assessment for that patient (claim drafts and patient-linked audit events inherit the
  recomputed horizon).
- **Correction:** `access_correction_request` / `record_correction` implement layered,
  immutable-overlay corrections with supersession — source records are never rewritten in place.
- **Export:** server-only, schema-versioned complete export with per-artifact SHA-256 hashes
  (`export_manifest`), authenticated download route.
- **Holds and destruction:** active patient- or record-scoped holds block destruction at the
  database-trigger level. Destruction itself requires an elapsed retention horizon, no active
  hold, and a second administrator — never automatic, no cron path exists that could trigger it
  (consistent with §7's finding that no scheduler exists in this codebase at all).

This is a mature, database-first design for a regulated-data system. The one substantive gap is
operational rather than architectural: **the backup/restore drill runbook exists in full detail
(`docs/RESTORE_DRILL.md`) but has never actually been executed** — `docs/NEXT_STEPS.md` §1.1 and
§P1.5 both name "the first isolated restore drill" as still-outstanding. A well-designed,
unexercised recovery procedure is a real risk, not a theoretical one — see §11.

## 6. Background jobs and future asynchronous work

**None exist in code.** A repository-wide search for queue, worker, cron, and scheduler patterns
found no matches beyond incidental naming (a UI component called `IntakeQueue.tsx` for a
pharmacist worklist view, unrelated to job infrastructure). No queue library, cron dependency, or
worker process is declared in `package.json` or present in `src/`.

Everything that resembles "background work" today is actually synchronous, request-scoped
server-action logic: follow-up due/overdue status is computed on read, not by a scheduled sweep;
destruction requires an administrator to explicitly run the dry-run/execute flow, not a cron job.

This is consistent with the product's current pilot scale (`docs/PROJECT_OVERVIEW.md`: "Firebase
is no longer part of the stack... Future Rx/referral document storage is planned... but is not
implemented") and is not, on its own, a defect — see §11 for where this becomes a real
scalability question versus where it's appropriately deferred.

## 7. Production versus synthetic-sandbox boundaries

`apps/experiment-sandbox/` is a separate npm workspace with its own `package.json`,
`next.config.ts`, build, and test suite. Boundary enforcement is layered, not just documentation:

- **`security:forbidden-imports`** (CI job `security-policy`, `.github/workflows/ci.yml` lines
  135–142) — AST-based, fails if any `src/` file imports from `apps/experiment-sandbox/`, or any
  sandbox file imports unreviewed production code. No allowlist; the check states this boundary
  "has no legitimate exception."
- **`sandbox:verify-production`** — a separate, sandbox-owned check (referenced in
  `CURRENT-IMPLEMENTATION-STATUS.md` line 32) that hashes the production build's route manifest,
  scripts, and dependencies against a frozen baseline, so building or including the sandbox
  workspace cannot silently perturb the production app's own build output. (This is the exact
  mechanism that caught unrelated route drift during the Task 06 branch's own CI run — see that
  task's final report for a live example of this control firing correctly.)
- **Environment isolation:** the sandbox's own env schema (separate from `src/env.ts`) explicitly
  prohibits reading production-shaped variable names (e.g. `DATABASE_URL`, `SUPABASE_*`,
  `BETTER_AUTH_*`) — a sandbox process cannot accidentally pick up production credentials from a
  shared shell environment.

This is a genuinely strong isolation design for allowing experimental/prototype work
(booking, virtual-care) to exist and be reviewed in the same repository without any path to
production effect. The residual risk is entirely about *authority*, not *isolation*: multiple
sandbox capabilities (Task 04 booking, Task 06 virtual-care) are merged and passing tests but
explicitly blocked from even running by expired or ungranted approval windows
(`CURRENT-IMPLEMENTATION-STATUS.md` — Task 04 "DRAFT — NOT GRANTED," Task 06 "runnable sandbox
authority" expired). That is a governance gap, not an architecture gap, and this review does not
attempt to close it.

## 8. Deployment, networking, secrets, backups, and recovery

**Deployment:** No deployment step exists anywhere in `.github/workflows/ci.yml` (confirmed by
full read — the workflow's jobs are `quality-install/typescript/eslint/pure-tests/build`,
`security-policy`, `security-dependencies`, `database-fresh-migrations`,
`database-constraints`; none publish or deploy anything). Deployment is therefore handled
**entirely outside this repository's CI**, most plausibly via a platform's git-integration
(auto-deploy-on-push), but nothing in-repo names or configures that platform. See §9 for the
specific "Vercel" baseline claim.

**Networking:** the app connects to Supabase Postgres over TLS (`ssl: "require"`), through the
pooler at runtime and direct for migrations. No VPC peering, private networking, or IP-allowlist
configuration is present in the repository — if the deployment platform and Supabase project
aren't on the same private network, traffic is public-internet-with-TLS rather than a private
link. This can't be assessed further without knowing the actual hosting platform (§9).

**Secrets:** `src/env.ts` (71 lines, read in full) is the single validated source — 14 server
variables (`DATABASE_URL`, `DIRECT_URL`, `PHARMACY_ID`, three bootstrap-admin variables,
`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`, `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/
`SUPABASE_STORAGE_BUCKET`, `CLINICAL_VIEWER_BASE_URL`, `NODE_ENV`) plus one client variable
(`NEXT_PUBLIC_APP_URL`), via `@t3-oss/env-nextjs` + Zod. This is not a documentation-only
convention: CI's `security-policy` job runs an AST-based checker
(`tools/security-policy/check-raw-env-access.mjs`) across `src/`, `tools/`, and
`apps/experiment-sandbox/src/`, failing the build if any file reads `process.env` directly
outside `src/env.ts`. No secret-scanning tool (gitleaks, trufflehog, or GitHub's own secret
scanning) is yet wired into CI — `CURRENT-IMPLEMENTATION-STATUS.md` names this as an open Task 11
item.

**Backups and recovery:** Supabase manages backup/PITR for the database. The repository has a
detailed, Canadian-region-aware restore-drill runbook (`docs/RESTORE_DRILL.md`, summarized in
§5) — but per `docs/NEXT_STEPS.md`, **no drill has ever actually been executed.** Storage-object
backup/recovery is explicitly out of scope until Rx/referral document storage exists (currently
unimplemented).

## 9. Vercel hosting — baseline claim checked, not confirmed

The task brief that requested this review asserted "Vercel hosting" as part of the current
baseline. Checked directly against the repository:

- No `vercel.json`, no `.vercel/` directory, anywhere in the repo.
- `docs/PROJECT_OVERVIEW.md`'s own "Technology and deployment" table (lines 56–68) — which
  explicitly lists Framework, Database, ORM, Authentication, Validation, Tests, and Exports —
  **has no hosting row at all.**
- `README.md` only states a Canadian-region Supabase project is required "for
  development/deployment," naming no application-hosting platform.
- No Vercel-specific adapter, edge-runtime configuration, or Vercel environment-variable pattern
  (e.g. `VERCEL_URL`) appears in `src/env.ts` or `next.config.ts`.

**Conclusion: hosting platform is undetermined from repository evidence.** This review does not
assume Vercel is correct, and does not assume it's wrong — it's simply unverifiable from what's
committed. Workstream 3 (hosting options) treats "confirm the actual current host with the
product/infra lead" as a prerequisite finding, not a formality, because several of that
workstream's comparison criteria (current cost, current region configuration, current deployment
rollback behavior) cannot be evaluated at all without first knowing the real current platform.

## 10. Current scalability and availability assumptions

- **Single-tenant, single-pharmacy, pilot-scale.** The `PHARMACY_ID` singleton and `pharmacy`
  table's DB-enforced one-row constraint are deliberate pilot-stage choices (§4), not scale
  limits per se — but they mean today's architecture has never been exercised for multi-tenant
  load, and no sharding/tenancy-partitioning design exists to evaluate.
- **No horizontal-scaling evidence either way.** Next.js Server Components/Actions and a pooled
  Postgres connection are compatible with serverless horizontal scaling in principle, but nothing
  in the repo demonstrates concurrent-instance behavior beyond the database's own
  concurrency-tested triggers (§4).
- **No load, capacity, or availability-target documentation exists.** There is no stated RTO/RPO,
  no documented expected concurrent-user count, and no capacity plan. This is reasonable for a
  single-pharmacy pilot and would become a real gap at the point multi-pharmacy or production
  scale is actually proposed.
- **Availability depends entirely on two managed services** (the hosting platform and Supabase)
  whose SLAs aren't discussed anywhere in the repository.

## 11. Identified risks (as requested by the task brief)

| Category | Finding |
|---|---|
| **Single points of failure** | (a) The unnamed hosting platform is a SPOF with no documented failover. (b) Supabase Postgres is a SPOF for both PHI storage and auth-session storage (better-auth uses the same database) — a Supabase outage takes down authentication *and* data simultaneously, with no documented fallback. |
| **Tight coupling** | better-auth's session/account/TOTP tables live in the same database and schema as clinical data. This is operationally convenient (one connection, one transaction domain) but means an auth-schema migration and a clinical-schema migration share failure blast radius — a bad `db:migrate` run risks both simultaneously. |
| **Missing abstractions** | The `requirePortalUser()` authorization boundary is enforced by *convention* (every new server action must remember to call it) rather than by a structural mechanism (e.g., a typed wrapper that makes an ungated server action a compile-time error). This has apparently held so far, but it is a discipline-dependent control, not a structurally guaranteed one. |
| **Transactional consistency risks** | None found within the database boundary itself — triggers/constraints are real and tested (§4). The residual risk is at the *edge* of the transaction boundary: e.g., if Rx/referral document storage (Supabase Storage, planned but unimplemented) is added later, storage writes and database writes will not share a transaction, and that dual-write consistency problem has no design yet. |
| **Connection-pooling risks** | The pooled/direct split (§4) is correctly designed for Supabase's pgBouncer, but the singleton-on-`globalThis` pattern is explicitly scoped to `NODE_ENV !== "production"` (dev hot-reload only) — worth confirming the production runtime's own connection-reuse behavior under the actual hosting platform's execution model (e.g., whether each invocation is a fresh serverless function instance, which would make per-invocation pool creation a real cost/limit concern that can't be assessed without knowing the host — see §9). |
| **Recovery and disaster-recovery gaps** | The restore-drill runbook is thorough but **has never been executed even once** (§5, §8). An untested recovery procedure is not proven to work; this is the single clearest actionable gap this review found. |
| **Observability gaps** | No error-tracking (Sentry or equivalent), no structured logging library, and no APM tooling exists anywhere in `package.json` or `src/`. For a PHI-handling system, this means production incidents currently rely on whatever the hosting platform's own default logs capture — worth explicit confirmation of what that actually is, since it can't be determined from this repository alone. |
| **Privacy/PHIPA risks** | No new risk found beyond what `docs/COMPLIANCE.md` already tracks in detail (P0-C evidence pending migration `0018`; the platform-count limitation is disclosed, not hidden). The database-first immutability/retention design (§4–5) is a genuine strength for PHIPA posture. |
| **Cost and vendor-lock-in concerns** | Supabase (Postgres + likely Auth-adjacent features unused, since better-auth is the identity layer, not Supabase Auth) and an unconfirmed hosting platform are the two paid dependencies. Drizzle ORM and file-based migrations are portable (not Supabase-specific), which limits lock-in on the ORM layer even if the hosting/DB vendor changes — this materially affects Workstream 2's switching-cost analysis. |
| **Over-engineered for the current pilot** | The `assessment_billability_evidence` sidecar table and its full immutability/trigger apparatus (migration `0018`) are built to production-grade rigor for a single-pharmacy pilot that hasn't gone live on that schema version yet. This is arguably *appropriate* front-loading given the regulatory stakes (PHIPA, billing accuracy) rather than true over-engineering — flagged for discussion, not asserted as a defect. |

---

## Cross-references

Baseline verification detail (hosting, DB pooling, migrations, background jobs, observability,
secrets, CI, route/proxy boundaries) was independently gathered via repository search and direct
file reads before this document was written, per the task's own instruction not to assume the
brief's baseline is accurate. Workstream 2 (database options), Workstream 3 (hosting options), and
Workstream 4 (diagrams) build directly on the findings in §4, §8, §9, and §11 above.
