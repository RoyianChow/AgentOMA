# Task 01 current-state and gap analysis

**Captured:** 2026-07-31
**Baseline commit:** `7737ef26f09fec858d23337885ca7d31e9ccbc64`
**Branch:** `feat/moh-compliance-migration`
**Dirty worktree at baseline capture:** no
**Scope:** baseline repository discovery plus the G1 implementation delta
**Production authorization:** none

Sections labelled baseline describe the pre-implementation state; the
implementation delta and evidence status at the end are the current status.
This analysis contains no secret values, patient data, production data, or
production resource identifiers. Environment inspection was limited to
variable names.

## Authority read

The following files were read completely before this analysis:

1. [`../../AGENTS.md`](../../AGENTS.md)
2. [`../PROJECT_OVERVIEW.md`](../PROJECT_OVERVIEW.md)
3. [`../EXPERIMENTAL_SANDBOX.md`](../EXPERIMENTAL_SANDBOX.md)
4. [`../AUTONOMOUS_PHARMACY_ROADMAP.md`](../AUTONOMOUS_PHARMACY_ROADMAP.md)
5. [`../tasks/autonomous-pharmacy/TASK-01-sandbox-enforcement.md`](../tasks/autonomous-pharmacy/TASK-01-sandbox-enforcement.md)

The Ontario minor-ailments agent skill was also read because the sandbox must
not weaken the production clinical, billing, PHI, authentication, audit,
retention, or migration boundaries.

No child `AGENTS.md` exists. The repository root file applies to the entire
proposed `apps/experiment-sandbox/` tree.

## Baseline toolchain

| Concern | Observed state |
|---|---|
| Operating system | Windows |
| Node | `v24.18.0` |
| npm | `11.16.0` |
| Package manager | npm; `package-lock.json` lockfile version 3 |
| Documented runtime | Root README says Node 22; the current machine is Node 24 |
| Root package | Single private package named `website` |
| npm workspace | None; `workspaces` and `packageManager` fields are absent |
| Framework | Next.js `16.2.10`, React `19.2.4`, App Router, Turbopack build |
| TypeScript | Strict, no emit; root glob currently includes every repository `.ts`, `.tsx`, and `.mts` file |
| Tests | Vitest 4; pure and fresh-Postgres configurations |
| Database test runtime | Docker Compose Postgres 16 on loopback port 5433, tmpfs-backed |
| Docker availability | **Blocked:** `docker` is not available on this machine's PATH |
| CI | Additive `.github/workflows/sandbox-boundary.yml` now covers production and sandbox gates |
| Deployment | No tracked Vercel, Sites, Netlify, container, or other production deployment definition |

The Node 22/24 discrepancy must be resolved or made explicit in the G1 decision
before sandbox evidence is treated as reproducible.

## Existing commands and baseline results

| Command | Result at baseline |
|---|---|
| `npm exec -- tsc --noEmit` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `npm run test:pure` | PASS, 10 files and 95 tests |
| `npm run build` | PASS, exit 0; Next production build completed |
| `npm run test` | NOT RUN — Docker CLI unavailable |
| `npm ls --omit=dev --depth=0` | Exit 1; expected dependencies resolved, with several extraneous optional WASM packages in local `node_modules` |
| Branch-protection checks | NOT VERIFIED — no workflow or repository-local protection evidence |

The full database suite remains mandatory after Docker is available. A pure
suite is not a substitute for the database-backed production gate.

## Production build baseline

The baseline production build writes to `.next/`. The comparison source is:

- `.next/server/app-paths-manifest.json`;
- `.next/routes-manifest.json`;
- `.next/server/middleware-manifest.json`;
- `.next/next-server.js.nft.json`;
- `.next/required-server-files.json`;
- root `package.json` scripts and production dependencies; and
- scans of production JavaScript, HTML, JSON, source-map, route, and deployment
  output for sandbox paths, package names, variables, and markers.

Normalized baseline:

| Measure | Value |
|---|---|
| Internal app paths | 25 |
| App-path key hash | `1468b42d588c5872f0435fc6ef5f87f4975fa051ad748c20b3bcc405add51332` |
| Public route-shape hash | `13ebe378ec425e86184d9754a1ca7871db804822d38e2c0a7749c4164db3b656` |
| Next runtime trace files | 625 |
| Sorted runtime-trace hash | `68060eb9bcecbf8224da0751ec287ea623693d76c36b3a44548fb0d4314b2766` |
| Required server files | 17 |
| Sorted required-files hash | `d7dedc3f77d68dd716aee4b8c97e870db7f84477ff8d53144b677a20f6ca4476` |
| Production-dependency map hash | `91bb6d914541815b48bb79d180774543d44f6cf914f676bbae008214c3a646a1` |
| Production-script map hash | `eb0976e856d63aaacaaf8d9eb00fd289dd8ecb060d917662816c1651e4cefb3b` |
| Task 01 markers in output | None |

Hashes are SHA-256 over sorted JSON structures, not raw files. This avoids
timestamps, ordering, build IDs, and other nondeterministic bytes. The
post-change verifier must reproduce this normalization and print only hashes,
counts, and route names.

Current public route shape:

```text
/
/_global-error
/_not-found
/accept-invitation
/api/auth/[...all]
/api/fhir
/assessment
/check
/demo
/enroll-2fa
/icon.png
/pharmacist
/pharmacist/assessment
/pharmacist/assessment/[id]/export
/pharmacist/audit
/pharmacist/audit/(.)[id]
/pharmacist/audit/[id]
/pharmacist/audit/[id]/pdf
/pharmacist/audit/export
/pharmacist/follow-ups
/pharmacist/governance
/pharmacist/governance/patient/[patientId]/export
/pharmacist/settings
/pharmacist/team
/sign-in
```

`/demo` is an existing production, read-only guided tour. It is not the Task 01
sandbox. It imports a narrow approved-label surface from production triage and
has its own architecture test. Task 01 must not expand, repurpose, or treat that
route as the separate experimental application.

## Production source and entry points

| Area | Location and boundary |
|---|---|
| Next application | `src/app/`; route groups for site, self-check, intake, auth, and dashboard |
| Production proxy | `src/proxy.ts`; pharmacist navigation gate only |
| Environment | `src/env.ts`, imported by `next.config.ts`; Drizzle additionally loads `.env` before importing the typed module |
| Database | `src/lib/db/index.ts`; Postgres.js pooled Supabase connection |
| Authentication | `src/lib/auth.ts`; better-auth with Drizzle and TOTP |
| Authorization | `src/lib/auth-guard.ts`; server-side session, TOTP, role, and configured-pharmacy checks |
| Clinical source | Protected production modules; unavailable to sandbox without exact G3 approval |
| Billing source | Protected production modules; unavailable to sandbox without exact G3 approval |
| Production build | Root `next build`, output `.next/` |
| Production test build | Root Vitest configurations and Docker test database |

The better-auth default cookie prefix is `better-auth`. The installed package
constructs `better-auth.session_token` on local HTTP and applies the
`__Secure-` prefix on HTTPS. Session-data, account-data, and don't-remember
cookies use the same production prefix. Task 01 must neither read nor transform
any of them.

## Environment-loading inventory

Tracked environment definitions:

- `.env.example`;
- `src/env.ts`;
- `next.config.ts`;
- `drizzle.config.ts`; and
- Vitest configuration/test harnesses.

The local `.env` contains these key classes; values were not read or printed:

```text
BETTER_AUTH_SECRET
BETTER_AUTH_URL
CLINICAL_VIEWER_BASE_URL
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_APP_URL
PHARMACY_ID
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
SUPABASE_URL
```

Production raw environment access is centralized in `src/env.ts`. The existing
database-test harness directly reads `TEST_DATABASE_URL`; Task 01 does not
change that production test path.

The sandbox must not inherit or load the root `.env`. Presence of any prohibited
production variable class in the sandbox process must refuse execution before
Next, an adapter, or a fixture initializes.

## Data, adapter, and external-effect inventory

| Category | Current production state relevant to isolation |
|---|---|
| Database | Supabase Postgres through Postgres.js and Drizzle |
| Storage | Supabase Storage variables exist; no storage client implementation was found |
| Authentication | better-auth production users, TOTP, and database sessions |
| FHIR/Kroll | `/api/fhir` returns 403 before parsing a body; preserved disabled implementation contains operational-shaped output and must not be imported |
| Clinical viewer | Optional link-out base URL only |
| Email/SMS/push | No provider adapter found |
| Payment/courier/calendar/video | No provider adapter found |
| Model/AI provider | No provider adapter found |
| Analytics/telemetry/replay | No provider SDK found |
| Runtime browser fetch | Public self-check fetches same-origin `/logo.png` only |
| Server logs | Direct `console` calls exist in production paths; no centralized structured logger |

The sandbox therefore starts with an empty external-integration allowlist and
must implement only throwing or metadata-only in-memory adapters. It must not
reuse production DB, auth, FHIR, export, logger, or route modules.

## Browser, header, and indexing baseline

- Production pharmacist routes receive private/no-store caching, no-referrer,
  noindex, a same-origin CSP, frame denial, and restrictive permissions through
  `next.config.ts`.
- Those headers do not apply to every public production route.
- `/check` has route metadata for indexing posture.
- No root `robots.ts`, `sitemap.ts`, or tracked static robots/sitemap file was
  found.
- The production root uses `next/font/google`; Next bundles the resulting font
  assets. The sandbox must use local/system assets only and must not depend on
  production font code.
- The marketing navbar uses local storage for a non-sensitive theme. Sandbox
  code must not import it and will prohibit browser storage.
- Production URLs use query parameters for invitation, queue, filtering, and
  non-PHI status handling. The sandbox must define a stricter URL contract and
  keep all synthetic identifiers and state out of URLs.

## Export and artifact inventory

Production currently contains:

- server-generated audit PDF/CSV;
- server-generated record PDF;
- complete-patient JSON export;
- printable assessment handoff;
- browser-generated public self-check PDF; and
- ordinary screenshots/build artifacts outside the application.

None is approved for sandbox import. Task 01 needs a separate, deliberately
non-operational sample renderer whose only purpose is testing persistent
synthetic marking and fail-closed watermark verification.

## Fixture and database-test inventory

Existing fixture-like sources:

- `src/lib/db/seed.ts`;
- `src/lib/db/seed-reference.ts`;
- `src/lib/db/seed-demo.ts`; and
- `src/lib/demo/tour.ts`.

These are production-repository sources and are not sandbox fixtures. The
sandbox initial G3 allowlist remains empty.

The existing Docker database is deliberately destructive, loopback-guarded,
tmpfs-backed, and migrated from zero. It is suitable for production integration
tests when Docker is available, but it must not become the sandbox database.
Task 01 initially requires no persistence. Any later need for persistence is a
new G1-reviewed design change with a sandbox-owned schema and compose profile.

## CI, branch, and deployment state

- There is no tracked `.github/workflows/` configuration.
- Required check names and branch protection cannot be verified from repository
  evidence.
- `.vercel/` is ignored and no tracked deployment project file exists.
- `.claude/launch.json` starts only the production app and uses automatic port
  assignment.
- No production file currently references `experiment-sandbox`, `sandbox:*`,
  or the required `SANDBOX_*` variables.

The proposed CI workflow location is `.github/workflows/sandbox-boundary.yml`.
G1 must approve adding that workflow. Branch protection remains **NOT VERIFIED**
until a repository administrator supplies evidence.

## Gap-to-control map

| Control | Current gap |
|---|---|
| SBX-01 | No separate application or production-output exclusion check |
| SBX-02 | No rule preventing production from importing a future sandbox |
| SBX-03 | No empty-by-default sandbox import allowlist or graph scan |
| SBX-04 | No typed sandbox environment or production-credential classifier |
| SBX-05 | No server/browser egress-denial layer |
| SBX-06 | No sandbox-owned identity boundary or production-cookie rejection |
| SBX-07 | No sandbox expiry enforcement |
| SBX-08 | No persistent synthetic shell for every state |
| SBX-09 | No sandbox artifact renderer or watermark verifier |
| SBX-10 | No sandbox fixture, source, bundle, or evidence leakage scan |
| SBX-11 | No sandbox URL/storage/log/telemetry prohibition |
| SBX-12 | No sandbox-scoped kill switch or teardown |
| SBX-13 | Baseline captured, but no automated post-change invariance verifier |
| SBX-14 | No hosted preview; local-only must remain enforced until G2 |
| SBX-15 | No all-route sandbox header contract |
| SBX-16 | No sandbox lifecycle, adapter, operation, actor, or role deny-by-default model |
| SBX-17 | No evidence schema, red-run harness, manifest validator, or commit binding |
| SBX-18 | No deterministic reset/expiry/disable/teardown/race tests |

## Proposed post-G1 repository changes

The exact design is in
[`experimental-sandbox-design.md`](experimental-sandbox-design.md). The planned
production-root changes are intentionally limited to:

- add npm workspace registration and additive `sandbox:*` scripts;
- update the lockfile for the new workspace;
- exclude only `apps/experiment-sandbox/**` from the production TypeScript and
  ESLint commands, with tests proving no pre-existing production file is
  excluded;
- ignore sandbox build/runtime scratch output;
- add a separate sandbox CI workflow without renaming or replacing any existing
  check; and
- add task-specific documentation and evidence.

No `src/` file, production route, `next.config.ts`, `src/env.ts`, proxy,
database schema, migration, production auth, clinical, billing, audit,
retention, export, storage, or deployment file is proposed for modification.

## Approval and implementation state

| Item | State |
|---|---|
| G1 product-lead approval | GRANTED by Royian Chowdhury on 2026-07-31 |
| G1 security/privacy approval | GRANTED by Royian Chowdhury on 2026-07-31 |
| G2 hosted preview | NOT REQUESTED |
| G3 production import allowlist | EMPTY |
| S0 | Not fired; required authority files exist. CI location needs G1 approval. |
| S1 | Not fired at design time; a separate npm/Next workspace appears feasible. |
| S3 | Avoided; no production import is proposed. |
| S7 | Avoided; no protected production area is proposed for modification. |
| S8 | Implemented locally; checked-in evidence manifest remains PENDING. |
| S11 | Baseline captured; local production-invariance proof passes. |

## Decisions required for G1

The product lead and security/privacy reviewer must explicitly approve or reject:

1. the separate npm workspace and root-file change list;
2. local loopback-only operation on the proposed distinct port;
3. no database and no hosted preview in the initial implementation;
4. the empty G3 import allowlist;
5. the typed environment and prohibited-variable classification;
6. the Node preload plus browser CSP/static-scan egress model;
7. the server-owned local lifecycle sentinel, kill switch, and contained
   teardown model;
8. the deterministic non-operational artifact approach;
9. the production-invariance normalization and evidence model;
10. `.github/workflows/sandbox-boundary.yml` as the additive CI location; and
11. whether Node 22 or Node 24 is the required evidence runtime.

The required approvals are recorded verbatim in
[`decisions/G1-design-approval.md`](decisions/G1-design-approval.md). The
implementation is authorized only within the G1 local synthetic boundary;
G2 is not granted and G3 remains empty.

## Implementation delta after G1

The approved workspace now exists at `apps/experiment-sandbox/`. It contains
strict typed configuration, lifecycle state, synthetic identity and fixtures,
deny-by-default adapters, loopback-only transport controls, a marked sample
artifact route, all-route privacy headers, architecture tests, and production
invariance tooling. It does not import production `src/` modules or initialize
any database, storage, auth provider, external SDK, analytics, or deployment.

Local evidence currently recorded: sandbox typecheck PASS, lint PASS, 17 unit
tests PASS, boundary scan PASS, artifact check PASS, production build PASS,
production-invariance PASS, and evidence-schema PASS. Browser accessibility
matrix, commit-bound red/green evidence capture, branch protection, and Docker
production regression remain follow-up evidence tasks.
