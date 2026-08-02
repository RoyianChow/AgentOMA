# Task 01 experimental sandbox design

**Version:** proposed G1 design, 2026-07-31
**Status:** G1 GRANTED; implementation evidence in progress
**Hosted preview:** not requested
**Production-module import allowlist:** empty

This document proposes the smallest separately built local sandbox that can
support later synthetic prototypes. It changes no production clinical,
billing, PHI, authentication, database, migration, audit, retention, export, or
deployment path.

## Design goals

1. A production build cannot contain or expose sandbox code.
2. A sandbox process cannot initialize when production-like configuration is
   present.
3. The sandbox has no production imports, database, provider, recipient, or
   external effect.
4. Production identities and cookies have no meaning in the sandbox.
5. Every page and artifact is unmistakably synthetic.
6. Expiry, disablement, reset, and teardown are server-controlled and
   fail-closed.
7. Every control has repeatable controlled-red and final-green evidence.

## Proposed structure

```text
apps/
  experiment-sandbox/
    package.json
    tsconfig.json
    eslint.config.mjs
    next.config.ts
    vitest.config.ts
    src/
      app/
        error.tsx
        global-error.tsx
        layout.tsx
        loading.tsx
        not-found.tsx
        page.tsx
        robots.ts
        sample-artifact/route.ts
      env/server.ts
      evidence/
      fixtures/
      identity/
      integrations/
      lifecycle/
      security/
      __tests__/
    tools/
      capture-evidence.mjs
      deny-egress.cjs
      disable.mjs
      reset.mjs
      teardown.mjs
      verify-artifact.mjs
      verify-boundary.mjs
      verify-evidence.mjs
      verify-production-invariance.mjs
      red-run.mjs
docs/
  task-01/
    current-state-and-gap-analysis.md
    experimental-sandbox-design.md
    experimental-sandbox-threat-model.md
    experimental-sandbox-data-flow.md
    runbook.md
    decisions/
    evidence/
  experiments/
    TEMPLATE.md
```

The root package becomes an npm workspace with exactly
`apps/experiment-sandbox`. Root scripts are additive:

```text
sandbox:dev
sandbox:build
sandbox:test
sandbox:verify-boundary
sandbox:verify
```

The existing production script values remain byte-for-byte unchanged.

## Build and dependency boundary

- Production stays at the repository root and builds to `.next/`.
- Sandbox source is rooted at `apps/experiment-sandbox/`, uses its own Next
  config, and builds to `apps/experiment-sandbox/.next-sandbox/`.
- Sandbox development uses loopback port `3101`; port 3000 remains the
  production default.
- The root TypeScript and ESLint configurations exclude only the new sandbox
  subtree. The sandbox has independent strict TypeScript and lint commands.
- A boundary test snapshots the pre-existing production file set and proves no
  prior production file is removed from type-check or lint coverage.
- Production source cannot import the sandbox package, path, or build output.
- Sandbox imports cannot resolve outside its own root except Node built-ins and
  declared package dependencies.
- The G3 allowlist is an explicit version-controlled empty array. Any future
  entry needs an exact module/export approval, transitive dependency report,
  and dedicated architecture test.
- Production and sandbox package dependencies are compared separately.
  Workspace lockfile additions are permitted; the production dependency map
  and runtime NFT trace may not gain an unexplained sandbox dependency.

No sandbox file is added beneath `src/app`, production navigation, the
production proxy matcher, production sitemap/robots output, or production
deployment inputs.

## Production invariance

`verify-production-invariance.mjs` will:

1. require a clean baseline commit and record it;
2. run the unchanged production build command;
3. normalize and sort app paths, public routes, runtime NFT files, required
   server files, root scripts, and root production dependencies;
4. scan production output for `apps/experiment-sandbox`, the sandbox package
   name, `SANDBOX_*`, the synthetic banner, sandbox cookies, port 3101, and
   sandbox build paths;
5. compare the normalized result with the approved baseline;
6. fail on every unexplained difference; and
7. print counts, hashes, and safe route names only.

Timestamp, build ID, source-map offsets, and ordering differences are excluded.
Routes, runtime modules, dependency edges, environment names, middleware/proxy
behavior, headers, deployment inputs, and script semantics are not excluded.

The existing `/demo` route is intentionally part of the production baseline and
is not treated as the Task 01 sandbox.

## Environment contract

One module, `src/env/server.ts`, owns all sandbox environment reads. No client
module may import it. The initial required values are:

| Variable | Rule |
|---|---|
| `SANDBOX_MODE` | Exactly `synthetic` |
| `SANDBOX_BUILT_AT` | ISO-8601 UTC build timestamp |
| `SANDBOX_EXPIRES_AT` | Future UTC timestamp, no more than 30 days after build time |
| `SANDBOX_INSTANCE_ID` | `SYNTH-` prefix plus a restricted opaque suffix |
| `SANDBOX_ORIGIN` | Exactly `http://127.0.0.1:3101` for the initial local build |
| `SANDBOX_G1_DECISION_ID` | Must match the granted version-controlled G1 record |
| `SANDBOX_DISABLED` | Required `true` or `false`; unknown or missing denies |

There are no default security values. The command wrapper passes an allowlisted
environment to the sandbox process rather than forwarding the parent
environment wholesale.

Before Next or any application module initializes, validation rejects:

- missing, malformed, expired, unknown, or contradictory sandbox values;
- non-loopback origins or any G2/hosted state;
- every production database, auth, Supabase, storage, clinical-viewer,
  deployment, email, SMS, push, payment, courier, calendar, video, model,
  analytics, telemetry, or error-reporting credential class;
- destination or proxy variables outside the empty destination allowlist; and
- client-exposed variables other than immutable banner/expiry presentation
  generated by the server.

Errors contain only the variable name and a reason code. Values are never
logged. The validator runs from the command wrapper, Next config, test setup,
server startup, every server action, artifact generation, and lifecycle tool.

## Local-only hosting model

The initial implementation is local loopback only:

- origin `http://127.0.0.1:3101`;
- no preview provider or deployment configuration;
- no production domain, Supabase project, cookie, credential, or account;
- no non-loopback bind;
- Host/Origin checks fail closed;
- no tunnel, reverse proxy, LAN bind, or link-only access; and
- every hosted lifecycle state is denied because G2 is absent.

G2 is not needed for local implementation. Any non-loopback preview is a new
design decision specifying provider, named-reviewer authentication, expiry,
teardown owner, network policy, and evidence.

## Identity and session isolation

The initial local sandbox has no login, password, TOTP, OAuth, user table, or
production session adapter. It assigns one server-owned synthetic reviewer
actor after the local origin and lifecycle checks pass.

- The actor ID and display label use the `SYNTH-` marker.
- Client role, user, pharmacy, subject, and capability inputs are ignored.
- All cookies with the production `better-auth` or
  `__Secure-better-auth` prefixes are rejected and never transformed.
- If a later prototype needs role simulation, roles are selected only from
  server-owned synthetic fixture state and use an `sbx_` cookie namespace.
- A hosted preview would additionally require named-reviewer authentication at
  the hosting boundary under G2.

Loopback access is not production authentication and grants no authority
outside the local synthetic process.

## Fixtures and optional persistence

The first implementation is stateless and uses deterministic server-owned
fixtures:

- fixed clock and documented timezone;
- fixed seed and reset;
- `SYNTH-` in every identifier and display label;
- reserved example domains and, only if needed later, reserved fictional phone
  ranges;
- no seven-digit `985...` values, contiguous ten-digit tokens, health-card
  shapes, OCP/pharmacy/prescription/claim shapes, real addresses, postal codes,
  URLs, or production seed overlap; and
- only minimal view models sent to client components.

Production seed and demo files are scan inputs only. They are not imported,
copied, rendered, or used to make synthetic records realistic.

No database or object storage is proposed. Persistence requires a revised G1
design and a separate loopback-only Docker profile with a `synth_` database and
schema.

## Integration and egress denial

All represented integrations bind to one of:

- a throwing adapter that returns `SBX_EXTERNAL_EFFECT_DENIED`; or
- an in-memory recorder that stores only adapter name, safe synthetic event
  type, UTC time, outcome, and safe reason code.

The initial destination allowlist is empty.

Server denial has two layers:

1. a Node preload used by every sandbox build/dev/start/test tool denies
   outbound `fetch`, HTTP(S), DNS, TCP client, TLS client, UDP, WebSocket, and
   EventSource operations before transport; and
2. architecture scans reject direct network APIs, SDKs, dynamic external
   imports, and adapter bypasses outside the reviewed security module.

The preload must not interfere with the server's inbound loopback listener.
Tests instrument DNS/socket functions and prove denial occurs before either is
called. If Next requires an unclassifiable outbound connection, S10 or S13
fires; the control is not relaxed.

Browser denial uses:

- `connect-src 'self'` plus no external asset origins;
- local/system fonts and local generated visuals only;
- no analytics, telemetry, replay, error reporting, service worker, WebSocket,
  EventSource, or browser storage;
- static architecture scans for direct dispatch/storage APIs; and
- browser tests that inspect requests, storage, history, console, and error
  paths.

Same-origin requests are limited to sandbox routes and still recheck lifecycle
state before work.

## Lifecycle, kill switch, and teardown

Lifecycle is derived from validated configuration, G1 evidence, current time,
and a sandbox-owned local state directory:

```text
apps/experiment-sandbox/.sandbox-state/<SANDBOX_INSTANCE_ID>/
```

Only a strict `SYNTH-` identifier may form the final path segment. Every tool
resolves the absolute target and proves it remains beneath `.sandbox-state`
before reading, creating, or removing anything.

- Missing or contradictory state is `UNCONFIGURED`/`UNKNOWN` and denies.
- `SANDBOX_DISABLED=true` or an idempotent disabled sentinel denies content.
- Current time at or after expiry returns a marked `410 Gone`.
- Every action rechecks state, so a stale tab or queued operation cannot run.
- `sandbox:disable` creates only the exact instance's disabled sentinel.
- `sandbox:reset` resets only in-memory fixture generation and that exact local
  synthetic state.
- `sandbox:teardown` removes only the exact contained synthetic instance
  directory after validation; repeated execution is a no-op.
- No command accepts a wildcard, unresolved variable, arbitrary path, root
  directory, production resource, or remote target.

There is no UI-only reactivation. A disabled or expired instance needs a new
validated build, new instance ID/expiry, and applicable approval.

## Visual and response safety

Every normal, loading, empty, denied, disabled, expired, not-found, and error
state uses one server-owned shell containing:

> EXPERIMENT — SYNTHETIC DATA — NOT FOR PATIENT CARE

The warning remains visible at 375px, desktop, 200%/400% reflow, print, and
artifact layouts.

All routes receive:

- `Cache-Control: private, no-store`;
- `Pragma: no-cache` and expired `Expires`;
- `Referrer-Policy: no-referrer`;
- `X-Robots-Tag: noindex, nofollow, noarchive`;
- frame and MIME-sniffing denial;
- restrictive CSP and Permissions Policy; and
- no shared-cache eligibility.

The sandbox owns a disallow-all robots response and no sitemap. URLs, titles,
history, and filenames contain no synthetic record IDs, role names, clinical
meaning, tokens, or state.

## Sample artifact

The only initial export is a deterministic, non-operational, two-page sample
report generated inside the sandbox:

- generic workflow-copy blocks, not a prescription, claim, health card,
  pharmacy label, or clinical form;
- filename begins `SYNTHETIC-NOT-FOR-CARE-`;
- every page has the required visible watermark;
- metadata identifies the artifact as synthetic;
- a verifier parses the generated pages and checks every watermark before the
  response is returned; and
- generation or verification failure returns a marked generic refusal and no
  bytes.

The sandbox declares its own direct PDF dependency. Production cannot import
the renderer, and production runtime traces must remain unchanged.

## Logging and evidence

One structured logger accepts only:

- UTC time;
- sandbox instance reference;
- safe event type;
- source component;
- outcome;
- safe reason code; and
- correlation reference.

The API does not accept arbitrary context objects or error instances. Browser
errors are generic. Tests scan source, output, captured console, URLs,
artifacts, and evidence for fixture contents, identifiers, bodies, prompts,
clinical text, credentials, tokens, connection strings, and stack/path leaks.

## Red/green evidence model

Each SBX control has:

1. a controlled violation generated in the operating-system temporary
   directory or an isolated in-memory fixture;
2. the real control run against that violation, expected to exit nonzero for
   the specific safe reason;
3. a final run against repository code, expected to exit zero; and
4. payload-free output containing the control ID, command, exit code, hash, and
   safe summary.

No unsafe production path is committed, even temporarily. Red fixtures cannot
be included in a runtime build.

The checked-in evidence manifest is initially `PENDING` and contains schema and
expected controls only. CI generates the commit-bound manifest after checkout
and retains it as the PR evidence artifact. This avoids the impossible
self-reference of committing a file that claims the hash of the commit
containing itself. Final PASS must reference the CI-generated manifest for the
tested implementation commit.

## CI design

The proposed additive workflow is
`.github/workflows/sandbox-boundary.yml`. It does not rename, replace, filter,
or make optional an existing check.

Independent jobs:

1. unchanged production type-check, lint, pure tests, build, and route/runtime
   invariance;
2. fresh-Postgres production suite when Docker service support is available;
3. sandbox type-check, lint, unit, integration, architecture, browser, artifact,
   and lifecycle tests;
4. boundary and prohibited-pattern scans;
5. SBX-01–SBX-18 red/green evidence generation;
6. evidence-manifest and leakage validation.

Production jobs receive no sandbox variables. Sandbox jobs receive only
synthetic sentinels created in the job. No job receives production secrets.
Evidence artifacts are scanned before upload.

Repository branch-protection enforcement cannot be claimed until an
administrator supplies evidence that the required job names are required.

## Accessibility evidence

After G1, browser evidence will cover:

- 375px and desktop;
- keyboard-only flow, visible focus, and logical order;
- screen-reader semantics for the persistent warning;
- 200% and 400% zoom/reflow;
- reduced motion;
- contrast/high-contrast behavior;
- loading, empty, denied, expired, disabled, error, and not-found states; and
- long synthetic copy.

Later experimental capabilities retain their own accessibility obligations.

## Rollback

Rollback removes only:

- the `apps/experiment-sandbox/` workspace;
- additive root sandbox scripts/workspace registration;
- sandbox-specific TypeScript/ESLint ignores;
- sandbox build/state ignore entries;
- the additive sandbox workflow;
- `docs/task-01/` implementation/evidence files; and
- `docs/experiments/TEMPLATE.md`.

No database, production storage, user, session, route, deployment, migration,
or external resource exists to clean up. The post-rollback production
invariance check must match the captured baseline.

## Implementation status after G1

| Phase | Implementation slice | Exit evidence |
|---|---|---|
| P2 | Complete: workspace, import graph, production baseline verifier | Boundary and production-invariance checks pass locally |
| P3 | Complete: typed environment, lifecycle, expiry | Unit tests pass; stale/expired/disabled paths deny |
| P4 | Complete: synthetic identity and deterministic fixture | No client authority or production-shaped data |
| P5 | Complete: throwing adapters and transport preload | External DNS/socket test denies before transport |
| P6 | Complete: marked shell, headers, artifact | Two-page watermark verifier and response headers pass |
| P7 | Complete: exact lifecycle mutation tools | Containment and idempotency tests pass |
| P8 | CI, evidence integrity, full production regression | SBX-01–18, reviewer sign-off |

P8 is implemented locally: the additive CI workflow and pending evidence
manifest are present. Local sandbox verification and production-invariance
checks pass; CI execution, branch protection, and reviewer evidence remain
pending.

Each slice adds its red test, control, green run, evidence record, and
production regression in the same change.

## Residual risks requiring G1 acceptance

1. npm workspaces share installation/lockfile resolution even though source and
   builds are separate; runtime NFT and import-graph checks are the compensating
   proof.
2. Node-level egress patching is application-process containment, not a cloud
   network firewall. Local-only scope and an empty destination allowlist reduce
   the residual risk. Hosted work requires a G2 infrastructure policy.
3. The additive CI workflow is present, but branch-protection enforcement and a
   completed CI evidence run remain unverified until an administrator requires
   the job and CI produces the signed evidence artifacts.
4. The current machine uses Node 24 while the README documents Node 22.
5. The root production build contains an existing `/demo` route; tests must
   distinguish that fixed production tour from the separate sandbox.
6. Docker-backed production regression cannot be captured on the current
   machine until Docker is installed/available.

G1 approval is recorded in
[`decisions/G1-design-approval.md`](decisions/G1-design-approval.md). G2 hosted
preview and G3 production imports remain unapproved.
