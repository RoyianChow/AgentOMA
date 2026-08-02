# Task 01 experimental sandbox threat model

**Version:** proposed G1 threat model, 2026-07-31
**Status:** G1 GRANTED; implementation evidence in progress
**System:** local-only, separate synthetic Next.js workspace
**Data classification:** deterministic synthetic metadata only

## Security objective

The sandbox may demonstrate synthetic interfaces and state transitions, but it
must have no path to production data, identities, systems, credentials,
domains, clinical/billing authority, external recipients, or ambiguous
artifacts. Unknown classification always denies.

## Assets to protect

- Production source and build semantics.
- Production environment values and resource identifiers.
- Production users, sessions, cookies, TOTP material, and roles.
- Production database, storage, clinical, billing, audit, and retention state.
- Real patients, pharmacists, pharmacies, recipients, and operational records.
- Reviewers from misleading or unmarked experimental artifacts.
- Evidence integrity and the approval record.

## Trust boundaries

1. Reviewer browser to local sandbox server.
2. Sandbox server to server-owned fixtures and lifecycle state.
3. Sandbox application code to integration adapters.
4. Sandbox workspace to production repository source.
5. Build/test process to parent environment and package installation.
6. Evidence process to logs, artifacts, and CI retention.
7. Local-only runtime to any future hosting platform.

## Assumptions

- G1 is granted in writing before runnable code exists.
- Initial runtime is loopback only and G2 is not requested.
- Initial G3 import allowlist is empty.
- Initial implementation has no database or object storage.
- npm registry access is development dependency installation, not sandbox
  runtime egress; installed versions remain lockfile-bound.
- A repository administrator is required to configure branch protection.

An unverified assumption does not become a control.

## Threat catalogue

| ID | Threat | Proposed prevention | Detection/evidence | Fail-closed result |
|---|---|---|---|---|
| T01 | Sandbox route or module ships in AgentOMA | Separate workspace/build; no production route/config import | Production route, bundle, NFT, dependency, env, navigation, sitemap, robots, and deployment scans | Production gate fails |
| T02 | Runtime flag, role, URL, cookie, or row reveals sandbox in production | No sandbox code in production graph | Negative architecture and production-output tests | Build fails |
| T03 | Production imports sandbox code | Bidirectional graph scanner and root-boundary rules | Controlled import violation | CI fails |
| T04 | Sandbox imports DB/auth/clinical/billing/audit/retention/export code | Empty G3 allowlist; path and transitive graph enforcement | One test per forbidden category | Sandbox build fails |
| T05 | Root `.env` or shell supplies production credentials | Allowlisted child environment; prohibited-variable classifier before Next loads | Per-class synthetic sentinel tests; output-value leakage scan | Startup/build refuses |
| T06 | Lookalike origin or encoded destination bypasses classification | Parsed canonical URLs; exact loopback origin; empty destination allowlist | Hostname, user-info, redirect, IPv4/IPv6, encoding, and alias tests | Configuration refuses |
| T07 | Network API bypasses integration stubs | Node preload denial plus import/API scanner | DNS/socket spies prove no transport call | Operation refuses before transport |
| T08 | Browser dispatches to analytics, assets, APIs, or replay vendors | CSP, local assets, architecture scan, browser request inspection | Zero unexpected requests; header evidence | Browser blocks; test fails |
| T09 | Production session authenticates to sandbox | No production auth adapter; reject production cookie prefixes | Cookie matrix and client-actor tampering tests | Access denies |
| T10 | Link possession or client role grants authority | Local loopback boundary plus server-owned actor; no client authority | Role/subject/header/query/body tampering | Authority unchanged or request denied |
| T11 | Fixture resembles a real patient, pharmacy, claim, or identifier | Restricted deterministic generator and overlap/shape scans | Source, bundle, screenshot, artifact, and seed-overlap scans | Build/evidence fails |
| T12 | Complete fixture corpus enters client bundle | Server-only fixture module and bundle scan | Canary fixture absent from client chunks | Build fails |
| T13 | Screen or error loses synthetic warning | One required shell plus explicit error/loading/not-found states | Route/state browser matrix at responsive/zoom settings | UI test fails |
| T14 | Artifact resembles an operational record or loses watermark | Non-operational template; per-page verifier before response | Corrupted-render controlled red; page and metadata scan | No download returned |
| T15 | PHI-like data, tokens, bodies, prompts, or errors enter logs/evidence | Closed structured logger API and leakage scanner | Compile-time/API tests plus captured output scans | Test/evidence fails |
| T16 | Browser stores identifiers or state | Storage APIs forbidden and inspected | localStorage/sessionStorage/IndexedDB/cookie/service-worker tests | Test fails |
| T17 | Expired or disabled stale tab performs work | Lifecycle check on every action and before delayed execution | Fake-clock and stale-tab tests | Action denies |
| T18 | Kill races queued work | Recheck state immediately before execution; idempotent cancellation | Deterministic deferred-work race | Work cancels |
| T19 | Teardown path expands to repository or production | Strict synthetic ID, canonical path containment, no arbitrary path/glob | Traversal, empty, wildcard, root, repeated teardown tests | Teardown refuses/no-op |
| T20 | Hosted preview is exposed without named-reviewer controls | No hosted deployment config; non-loopback origins denied | Build and repository scan | Build/start refuses |
| T21 | Evidence claims wrong commit or omits red proof | Schema validation, commit binding, red/green pairing, artifact hashes | Manifest validator | PASS unavailable |
| T22 | Evidence manifest self-reference produces false binding | CI-generated commit-bound manifest; checked-in pending schema only | SHA comparison in CI | Final status blocked |
| T23 | Sandbox dependency changes production runtime graph | Production dependency/NFT baseline comparison | Hash and file-diff report | Promotion blocked |
| T24 | Root lint/type excludes existing production files | Exact sandbox-only exclude and source-set regression test | Pre/post production file-set comparison | Production gate fails |
| T25 | Required tests are skipped or silently filtered | Expected-test/control catalogue and report-count validation | SBX-01–18 completeness check | CI fails |
| T26 | Existing production `/demo` is mistaken for the sandbox | Fixed route baseline and distinct package/banner/origin/build names | Route comparison and docs | Review blocks ambiguity |
| T27 | Unknown adapter, lifecycle state, role, operation, or fixture version succeeds | Exhaustive tagged unions and deny-by-default runtime branches | Unknown-value tests | Request refuses |
| T28 | Framework-generated error response lacks headers or marking | Global error/not-found shell and all-path response headers | Forced framework error and 404 tests | Release gate fails |
| T29 | External font/script/source map leaks request or source | Local/system assets; no browser source maps; response and build scans | Network and output inspection | Build/test fails |
| T30 | Red-run fixture becomes runnable or committed | Generate only in OS temp/in-memory; runtime/build exclusion scan | Git/source/output scan | Evidence capture fails |

## Abuse cases

### Production variable plus synthetic claim

An operator sets `SANDBOX_MODE=synthetic` while a production database or auth
secret remains in the process environment. Classification occurs before mode
acceptance; the process returns only the offending variable name and safe
reason code. Synthetic mode never overrides a prohibited class.

### Client-supplied reviewer role

A request adds a role in a query, body, cookie, or header. The server does not
read those values for authority. The server-owned local reviewer remains the
only actor, or the request is denied if lifecycle/origin checks fail.

### Direct raw fetch

A future task imports raw `fetch` outside the reviewed adapter boundary. The
architecture test fails. If it escapes static detection, the Node preload or
browser CSP denies transport before DNS/socket/payload transmission.

### Expiry during delayed work

A request begins while active, then the clock reaches expiry before a delayed
operation executes. The operation rechecks lifecycle state at the execution
boundary and records only `SBX_EXPIRED`; no represented effect is recorded as
successful.

### Teardown traversal

An operator supplies an empty identifier, wildcard, path separator, encoded
traversal, or repository path. Identifier validation or canonical containment
fails before any filesystem mutation. Repeating a valid teardown is a no-op.

## Privacy analysis

The sandbox has no lawful or technical need for PHI:

- no real, de-identified, pseudonymized, copied, or realistically shaped
  records;
- no health number, date of birth, address, licence, pharmacy, prescription,
  claim, message, or recipient data;
- no production analytics, logs, traces, or error reporting;
- no browser persistence;
- no database or storage;
- no production seed import; and
- no hosted preview in the initial scope.

If a later task cannot function without data outside that boundary, stop
condition S2 applies; Task 01 is not widened silently.

## Availability and lifecycle analysis

Sandbox availability is lower priority than containment. Missing configuration,
approval, lifecycle state, clock certainty, fixture version, adapter
classification, or evidence yields denial. There is no fallback actor, fixture,
origin, expiry, credential, adapter, artifact, or success response.

## Evidence threats

Evidence is itself an artifact and can create risk. Evidence tools therefore:

- accept no arbitrary payload;
- capture only safe summaries and hashes;
- use deterministic synthetic controls;
- scan their own output before retention;
- mark dirty-worktree evidence as non-final;
- distinguish NOT RUN, BLOCKED, FAIL, and PASS;
- require one red and one green result for each SBX control; and
- cannot convert absent reviewer approval into a technical PASS.

## Residual risk

| Risk | Initial treatment |
|---|---|
| Local process containment is weaker than infrastructure egress policy | Local-only scope; empty destination list; Node/browser/static controls; hosted G2 requires platform egress controls |
| npm workspace shares install resolution | Lockfile review plus production dependency/NFT invariance |
| Node 22 vs 24 evidence mismatch | G1 must choose the supported evidence runtime |
| No current branch protection | Report NOT VERIFIED; administrator must configure required checks |
| Docker unavailable on current host | Database production gate remains NOT RUN/BLOCKED |
| Existing production `/demo` may cause reviewer confusion | Keep fixed in production baseline; distinct sandbox origin, package, banner, and documentation |

## Review triggers

Re-open this threat model before:

- any G3 production import;
- persistence or a database;
- hosted preview or G2;
- a new package with native/network behavior;
- a provider SDK or external destination;
- authentication beyond the local server-owned actor;
- file upload or a new export type;
- service workers, browser storage, telemetry, or analytics;
- AI/model work;
- production deployment work; or
- a change to the lifecycle, kill switch, teardown, or evidence model.

## Current decision

G1 is **GRANTED** by both required reviewers in
[`decisions/G1-design-approval.md`](decisions/G1-design-approval.md). The
approval authorizes only the separately built, local synthetic workspace. G2 is
not granted, G3 remains empty, and no production capability, data, credential,
integration, hosted preview, or production-module import is authorized.
