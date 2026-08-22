Task 01 — Enforce the Experimental Sandbox

## Sprint checkpoint — 2026-08-20

**Repository state:** the historical evidence candidate is `PASS`; the current
changed candidate does not inherit it. Unit/boundary checks pass, but
production invariance fails on route shape and runtime authority is expired.
**Sprint slice:** identify the route delta, preserve the verifier/baseline,
renew exact scope, and produce candidate-bound boundary, artifact, evidence,
runtime, and production-invariance results.
**Exit:** documentation agrees with evidence and any new candidate has complete
red/green and root verification. No hosted preview or production import is in
scope. See [`CURRENT-IMPLEMENTATION-STATUS.md`](CURRENT-IMPLEMENTATION-STATUS.md)
for current sequencing.

Version: 3 · supersedes Task 01 v2 · 2026-07-30Owner profile: platform/security developerRequired reviewers: product lead and security/privacy reviewerPriority: P0 foundation — blocks every later experimental capabilityStatus: repository discovery may start; implementation is approval-gatedProduction authorization: none

Mission

Build and prove a separately compiled, separately configured, synthetic-onlyenvironment in which later AgentRx roadmap capabilities can be demonstratedwithout any path to:

Production data, databases, storage, users, sessions, credentials, domains, orintegrations.

Real patients, pharmacists, pharmacies, clinical records, prescriptions,claims, messages, payments, shipments, or appointments.

Unmarked screenshots, exports, logs, or other artifacts that could be mistakenfor operational records.

Production clinical, billing, identity, audit, retention, or release effects.

This task implements the controls in EXPERIMENTAL_SANDBOX.md. It does not waiveAGENTS.md, authorize patient care, approve a vendor, or promote any experimentto production.

The safest valid result is sometimes BLOCKED. Never weaken a boundary toproduce a demo or a PASS.

1. Binding agent execution contract

1.1 Instruction precedence

Before changing code, read these repository files completely and in this order:

The nearest applicable AGENTS.md, including every parent-scopeAGENTS.md.

PROJECT_OVERVIEW.md.

EXPERIMENTAL_SANDBOX.md.

AUTONOMOUS_PHARMACY_ROADMAP.md.

The repository's package, build, test, CI, deployment, and securityconfiguration relevant to this task.

Repository instructions override this task when they are stricter. If theyconflict in a way that cannot be satisfied simultaneously, trigger S0 andstop the affected work.

Do not infer missing policy from filenames, comments, earlier conversations, orsimilar code. Record unknowns as unknowns and fail closed.

1.2 Permitted actions before approval

Before G1, the agent may:

Inspect the repository read-only.

Run existing non-mutating tests and builds with safe local configuration.

Produce the current-state analysis, gap analysis, diagrams, threat model, andproposed change list.

Create only an empty, non-runnable workspace shell if explicitly permitted byAGENTS.md.

Before G1, the agent must not:

Build a functioning sandbox route or server.

add a database, authentication flow, integration adapter, deploymentconfiguration, or hosted preview;

import production application modules;

change a production build, deployment, migration, authentication, clinical,billing, audit, or retention path.

1.3 Working rules

Inspect before editing. Do not assume a framework, package manager, monorepostructure, test runner, CI provider, or deployment platform.

Preserve unrelated user changes and existing required checks.

Make the smallest additive production-repository change needed to create theseparate sandbox build.

Add each boundary test in the same change as the boundary it protects.

Every required boundary test needs both a controlled red run and a green run.

Never use a live credential, production hostname, real identifier, or realrecipient to test a denial path.

Never print secret values or submitted payloads, including in failures.

Never create a hosted preview unless G2 is explicitly granted.

Never add a production-module import before G3 is explicitly granted forthat exact module and export.

Do not interpret a successful build, demo, unit test, or code review asproduction approval.

If a required check is skipped, cancelled, not selected, flaky, or unable torun, record it as NOT RUN or BLOCKED; never convert it to PASS.

1.4 Required implementation rhythm

For each control:

Identify the threat and the exact invariant.

Add a test that fails when the invariant is violated.

Capture the controlled red run using synthetic values on a scratch branch orisolated test fixture.

Implement the smallest control.

Capture the green run against the intended code.

Add the evidence entry to the manifest.

Re-run affected production and sandbox checks.

Do not leave tests, evidence, or rollback work to the end.

2. Definitions

Use these definitions consistently:

Production: any environment, build, domain, resource, credential,integration, dataset, identity, or workflow capable of serving real users orcreating an operational effect.

Sandbox: the separately built synthetic application created by this task.A feature flag, hidden route, route group, secret URL, or admin-only productionpage is not a sandbox.

Synthetic data: deterministic, visibly marked data intentionally createdfor testing and incapable of being confused with a real person, pharmacy,prescription, clinical record, or claim.

External effect: any network call, message, file upload, model call,payment, shipment, calendar item, vendor session, claim action, or write to anon-sandbox resource.

Production module: code that can read or mutate production data, identity,storage, clinical, billing, audit, retention, integration, configuration, ordeployment state.

Approved pure module: a side-effect-free production module whose exactimport was approved under G3 and pinned by an architecture test.

Artifact: a screenshot, video, report, export, download, test fixture,evidence file, build output, log, trace, or CI attachment.

Fail closed: deny startup, build, access, transition, export, or externalaction when configuration, authorization, state, or classification is missing,stale, malformed, or unknown.

If an item cannot confidently be classified as synthetic or production-safe,treat it as production and deny it.

3. Approval gates

Approval is a recorded fact, not an inference. It exists only when the namedauthority provides an explicit written decision for this task and the decisionis quoted verbatim in the evidence record. Silence, prior approval for anothertask, a meeting summary, or “looks fine” is NOT GRANTED.

Gate

Required decision

Authority

Blocks

G1

Approve the design note, trust boundaries, data flow, threat model, environment contract, hosting/network model, and planned repository changes

Product lead and security/privacy reviewer

All implementation beyond permitted pre-G1 work

G2

Approve a specific non-loopback preview, named-reviewer access control, hosting boundary, expiry, and teardown owner

Product lead

Any hosted preview

G3

Approve one exact production-module import and exported surface after purity and side-effect review

Security/privacy reviewer

That import

G3 rules

The initial allowlist is empty.

Approval applies only to the exact module path and exports reviewed.

Transitive dependencies are part of the review.

An approval for one import does not approve a sibling module or futureversion.

Every allowed import has a dedicated architecture test and approval reference.

Removing a module from the allowlist must fail safely without weakening theproduction application.

4. Dependencies and coordination

4.1 Required repository inputs

The following must exist and be usable before implementation:

Applicable AGENTS.md.

PROJECT_OVERVIEW.md.

EXPERIMENTAL_SANDBOX.md.

AUTONOMOUS_PHARMACY_ROADMAP.md.

Existing production build and test commands.

A way to inspect production route and dependency outputs.

Existing CI configuration or an approved location for additive CI.

If a required input is absent, trigger S0, finish safe analysis that does notdepend on it, and report the missing authority or baseline.

4.2 Relationship to Task 11

Task 01 is the bootstrap boundary for synthetic experiments and must not dependon Task 11 already being complete.

If Task 11 exists, its stricter CI, evidence, accessibility, exception, andrelease controls augment this task.

If Task 11 does not exist, implement the Task 01 checks without inventingwaivers or self-approval.

Task 01 cannot mark its own security/privacy review as approved.

Once Task 11 is available, register the sandbox as a capability with an owner,expiry, kill switch, evidence reference, and review date.

Task 11 promotion controls never convert this sandbox into a productionenvironment.

5. Mandatory stop conditions

Stop the affected workstream, preserve safe evidence, continue only independentwork, and report the stop ID.

S0 — Missing or conflicting authority: a required repository instruction,policy, roadmap, baseline command, or approval authority is missing orcontradictory.

S1 — Separate build infeasible: the sandbox cannot be a separate workspace,build, and deployment target without altering the production runtime.

S2 — Non-synthetic data required: a prototype needs real, de-identified,pseudonymized, copied, or realistically shaped patient, pharmacist, pharmacy,clinical, prescription, or claim data.

S3 — Production import proposed: a production module is needed and G3has not been granted for the exact import.

S4 — Hosted access unsafe: a hosted preview cannot enforce named-revieweraccess, expiry, isolation, and teardown at the hosting boundary.

S5 — Live integration required: implementation needs a real vendor,recipient, model endpoint, database, object store, pharmacy system, HNS/payer,payment, courier, email/SMS/push, calendar, or analytics service.

S6 — Artifact ambiguity: a screen or artifact cannot be made unmistakablysynthetic on every page and viewport.

S7 — Protected area affected: implementation would modify a protectedclinical, billing, authentication, migration, audit, retention, privacy, orproduction-release area contrary to repository authority.

S8 — Red run unavailable: an SBX test cannot be shown detecting a controlledsynthetic violation.

S9 — Existing gate weakened: success requires deleting, renaming,bypassing, relaxing, or making optional an existing production check.

S10 — Denial occurs too late: a credential, payload, token, or request couldreach an external transport before the sandbox denies it.

S11 — Production invariance unprovable: the agent cannot establish therequired baseline or cannot explain a production build difference.

S12 — Synthetic lifecycle unsafe: expiry, disablement, or teardown cannot beenforced without relying on a hidden UI control or best-effort manual action.

S13 — Unknown classification: an environment, dependency, dataset, import,host, credential class, or artifact cannot be classified safely.

S14 — Real sensitive material discovered: PHI, credentials, real contactdata, or production exports appear in sandbox source, fixtures, logs,screenshots, build output, or evidence.

For S14, do not copy the material into the task report. Stop processing it,record only a safe reason code and location reference permitted by policy, andfollow the repository incident/escalation procedure.

A stop is not automatically a task failure. Report BLOCKED when safe work iscomplete but an approval or prerequisite remains unresolved.

6. Required current-state and gap analysis

Create:

docs/task-01/current-state-and-gap-analysis.md

The analysis must record, without secret values:

Baseline commit SHA and dirty-worktree status.

Applicable instruction files and their scopes.

Package manager, lockfile, workspace state, runtime versions, and build system.

Current production build, lint, type-check, test, database-test, and CIcommands.

Current required CI check names and branch-protection assumptions that can beverified from the repository.

Production route manifest location and normalized comparison method.

Production source, entry points, dependency graph, and build-output locations.

Environment-loading locations and every direct raw environment access pattern.

Authentication/session boundaries and cookie names or prefixes, withoutvalues.

Database, storage, vendor, messaging, payment, courier, model, analytics,telemetry, and logging adapters.

Existing CSP, cache, referrer, permissions, robots, sitemap, and indexingbehavior.

Existing export, report, screenshot, and artifact-generation paths.

Existing Docker/database test setup and whether it can be isolated safely.

Existing fixture and seed locations.

Proposed files to add or modify.

Every identified gap mapped to an SBX control.

Unresolved questions, required gates, stop conditions, and owners.

Do not change code until the analysis and design note are ready for G1.

7. Required design package

Create:

docs/task-01/experimental-sandbox-design.md

docs/task-01/experimental-sandbox-threat-model.md

docs/task-01/experimental-sandbox-data-flow.md

docs/task-01/decisions/

The design must show these trust boundaries:

flowchart TD
    B["Reviewer browser"] -->|synthetic requests only| S["Separate sandbox server"]
    S --> F["Server-owned synthetic fixtures"]
    S --> D["Optional isolated local test database"]
    S --> A["Throwing or in-memory adapters"]
    S --> E["Payload-free evidence"]
    A -. "external transport denied" .-> X["No production or vendor resource"]

The diagram is descriptive, not proof. The architecture and runtime tests mustenforce every boundary.

Required design decisions

Document:

Why a separate build is feasible.

Sandbox-to-production and production-to-sandbox import rules.

Environment validation and credential classification.

Local database isolation, if persistence is genuinely necessary.

Identity/session isolation.

Browser and server egress denial.

Synthetic fixture ownership and reset.

Artifact marking and export blocking.

Preview access, expiry, disablement, and teardown.

Evidence capture without payloads.

Production invariance comparison.

Rollback of every repository change.

Residual risks and decisions requiring approval.

Do not select a live vendor, integration, or production hosting configuration inthis task.

8. Default repository architecture

Use the following layout unless G1 approves a repository-specificalternative:

apps/
  experiment-sandbox/
    package.json
    next.config.ts
    src/
      app/
      env/
      fixtures/
      identity/
      integrations/
      lifecycle/
      security/
      evidence/
      __tests__/
docs/
  task-01/
    current-state-and-gap-analysis.md
    experimental-sandbox-design.md
    experimental-sandbox-threat-model.md
    experimental-sandbox-data-flow.md
    runbook.md
    evidence/
      evidence-manifest.json
    decisions/
  experiments/
    TEMPLATE.md

If the repository is not a compatible workspace, do not force this layout.Trigger S1, document a minimal alternative, and obtain G1 beforeimplementation.

Structural requirements

The default sandbox root is exactly apps/experiment-sandbox/.

The sandbox has a distinct package name, build command, build output, dev port,origin, cookie namespace, deployment target, and dependency boundary.

It is never placed inside the production route tree.

Root scripts are additive. Preferred logical commands are:sandbox:dev, sandbox:build, sandbox:test, andsandbox:verify-boundary.

Do not change the command behind an existing script key or the semantics of anexisting CI check. Adding the sandbox commands is not permission to rewriteproduction commands.

The repository keeps its existing package manager and lockfile.

Production cannot import sandbox code.

Sandbox cannot import production code unless the exact import has G3.

The sandbox is absent from production navigation, routes, server actions,middleware matchers, sitemap, robots output, client chunks, server chunks,source maps, and deployment configuration.

No runtime flag, environment toggle, query parameter, role, secret URL, ordatabase value can reveal or enable the sandbox inside production.

9. Production invariance contract

“Production unchanged” must be demonstrated, not asserted.

Capture the baseline before workspace or lockfile edits and compare it with thepost-change production build.

At minimum prove:

The same production build command still succeeds.

The normalized production route manifest is identical.

No sandbox route, module, package path, environment key, middleware branch, ordeployment target appears in production output.

Existing production scripts and required CI jobs retain their meaning andpass/fail behavior.

Existing production tests are not skipped, filtered, moved to optional status,or supplied fallback configuration.

Production environment validation and dependency resolution are not weakened.

No new sandbox dependency enters a production runtime bundle.

Workspace and lockfile changes are explained and limited to the separatepackage.

The rollback removes the sandbox without modifying production data orresources.

Do not require byte-for-byte build equality when the framework embeds timestampsor nondeterministic identifiers. Instead, document and approve a normalizedcomparison of routes, runtime modules, dependency edges, environment contract,and deployment inputs. Any unexplained difference triggers S11.

10. Environment contract

Implement one typed, server-only sandbox environment module. No other sandboxfile may read raw environment variables.

Required variables

SANDBOX_MODE — exactly synthetic.

SANDBOX_EXPIRES_AT — a valid future UTC timestamp no more than 30 days afterthe build time.

SANDBOX_INSTANCE_ID — an opaque synthetic instance identifier beginningSYNTH-.

SANDBOX_ORIGIN — loopback by default; a specific approved origin only afterG2.

The design may add narrowly scoped variables after G1, but must not addfallback values for missing security configuration.

Validation behavior

Validation runs:

At development startup.

At build time.

At test startup.

At server startup.

Before any optional persistence or adapter initialization.

The process must refuse to start or build when:

A required sandbox variable is missing, malformed, unknown, or expired.

SANDBOX_MODE is not exactly synthetic.

The expiry is more than 30 days after build time.

The origin is not loopback and G2 evidence is absent.

A destination is not on the version-controlled synthetic allowlist.

A production credential class or resource identifier is present.

At minimum, deny known production classes such as:

Production DATABASE_URL or DIRECT_URL.

Production authentication secrets or project identifiers, includingBETTER_AUTH_SECRET where present.

Service-role or storage credentials.

Email, SMS, push, payment, courier, calendar, video, model, analytics, ortelemetry credentials.

Production deployment or domain identifiers.

Detection must use classes, approved fingerprints, and structural validationwithout logging the value. Failure messages name only the variable and a safereason code.

No secret may use a client-exposed environment prefix. No client module mayimport the server environment module. Client-visible configuration is limitedto non-secret sandbox branding, instance marking, and expiry metadata.

11. Data and identity isolation

11.1 Fixture rules

Default to server-owned, in-memory, deterministic fixtures.

Every fixture set must:

Use a fixed clock and explicitly documented synthetic timezone.

Use a fixed seed and deterministic reset.

Carry SYNTH- in every identifier and display name.

Include a synthetic-only marker used by leakage tests.

Use example.com or .test email domains.

Omit phone values unless a scenario requires them. For a North Americanfixture, use only the reserved 555-0100 through 555-0199 fictional range.

Contain no contiguous 10-digit numeric token and no seven-digit numeric tokenbeginning with 985.

Avoid real street addresses, postal codes, health numbers, licence numbers,pharmacy numbers, prescription numbers, claim numbers, meeting links, andproduction reference values.

Avoid copied, de-identified, pseudonymized, or “realistic” production records.

Remain server-owned; prohibited client bundles must not contain the completefixture corpus.

Fail hard if loaded outside the validated sandbox runtime.

The source and built output must be scanned for:

Plausible health-card and contact-number shapes.

OCP-, pharmacy-, prescription-, and claim-shaped identifiers.

Production seed overlap.

Real domains and non-reserved contact data.

Tokens, secrets, connection strings, and room identifiers.

Unmarked clinical or operational artifacts.

The sandbox may read a production seed file only through an approved, read-onlytest that compares values for accidental overlap. It must not import, render, orcopy the seed into fixtures.

11.2 Persistence

Use persistence only when an experiment genuinely requires it.

If persistence is approved:

Use a sandbox-only Docker profile or compose file.

Bind only to loopback and a documented non-production port.

Use a unique database and schema beginning synth_.

Reject remote hosts, TLS identities, project references, and connectionpatterns not explicitly approved as synthetic.

Provide deterministic reset and teardown.

Prove reset and teardown cannot target a production host or an unresolvedvariable.

Never run production migrations against the sandbox unless the exact migrationboundary is separately authorized; prefer sandbox-owned schema.

11.3 Identity and sessions

Do not use production authentication adapters, user tables, password hashes,TOTP secrets, session rows, OAuth clients, or cookies.

Use sandbox-owned synthetic actors and server-owned authorization checks.

Keep patient, pharmacist, reviewer, and support roles distinct when a laterexperiment requires them.

Use a distinct cookie prefix such as sbx_.

Production cookies must be ignored and must fail authentication.

Client-supplied actor, role, subject, tenant, pharmacy, or capability valuesgrant no authority.

Hosted preview access at the platform boundary and in-app synthetic rolesimulation are separate controls; neither substitutes for the other.

Universal passwords, shared production accounts, hidden admin bypasses, andpossession of a URL are prohibited.

12. Integration and network-denial contract

Define interfaces for every integration category that a later experiment mightrepresent:

Email, SMS, and push.

Video, voice, and secure messaging.

Pharmacy/dispensing systems.

HNS, payer, billing, and claims.

Payment.

Courier and delivery.

Calendar.

FHIR or other health-data exchange.

Object storage.

AI/model providers.

Analytics, telemetry, and session replay.

Bind only:

A throwing adapter that denies the operation; or

An in-memory recorder that stores an approved safe event type and syntheticresult without the request body.

Required behavior

Unknown adapters and operations fail closed.

No adapter silently reports success.

Denial happens before DNS resolution, socket creation, SDK initialization,payload serialization to a transport, or browser dispatch.

Stubs record only adapter name, synthetic event type, timestamp, outcome, andsafe reason code.

Stubs never record bodies, prompts, generated clinical text, answers,credentials, tokens, destinations, or identifiers.

Browser assets are local; no third-party fonts, pixels, scripts, analytics, orsession replay.

Browser CSP uses connect-src 'self' unless G1 approves a narrowersynthetic dependency.

Server egress is denied by testable runtime or infrastructure policy inaddition to code-level adapters where the platform supports it.

Dynamic import, direct SDK use, raw fetch, raw HTTP clients, sockets, DNS,email transports, and model clients are forbidden outside the reviewedboundary module.

Tests must prove the denial occurs before transmission, not merely that a remoteserver returned an error.

13. Sandbox lifecycle and access state model

Lifecycle state is server-owned and fail-closed.

State

Meaning

Content served

UNCONFIGURED

Required configuration or approval evidence is absent

None

LOCAL_ACTIVE

Valid synthetic configuration on loopback after G1

Synthetic application

HOSTED_ACTIVE

G1 and G2 are recorded; named-reviewer access and expiry pass

Synthetic application

DISABLED

Kill switch activated

None

EXPIRED

Current time is at or beyond expiry

None; return 410 Gone where applicable

TORN_DOWN

Deployment and synthetic resources removed

None

UNKNOWN

Unrecognized or inconsistent state

None

Transition rules

UNCONFIGURED → LOCAL_ACTIVE requires valid synthetic configuration and G1.

LOCAL_ACTIVE → HOSTED_ACTIVE requires G2 for the exact preview.

Any active state → DISABLED requires the authorized kill-switch action.

Any active state → EXPIRED happens automatically at expiry.

DISABLED or EXPIRED cannot be reactivated by changing a browser value,query parameter, cookie, database fixture, or stale deployment.

Reactivation requires a new validated build, new expiry, and any applicableapprovals.

DISABLED or EXPIRED → TORN_DOWN removes only identified syntheticresources.

Unknown, contradictory, stale, or concurrent lifecycle state denies content.

The kill switch must be server- or platform-enforced and idempotent. A hidden UIbutton alone is insufficient.

14. Visual, browser, and artifact safety

14.1 Required persistent marking

Every rendered state must show:

EXPERIMENT — SYNTHETIC DATA — NOT FOR PATIENT CARE

The marking must remain visible:

At 375px and desktop.

At 200% and 400% zoom/reflow.

In modal, full-screen, error, denied, expired, loading, and empty states.

On every printed or exported page.

14.2 Required response controls

Every route and artifact response must use the applicable controls:

noindex, nofollow, and noarchive.

Strict no-referrer policy.

private, no-store caching.

A restrictive Content Security Policy.

A restrictive Permissions Policy.

No shared-cache eligibility.

No sandbox route in a production sitemap or robots output.

Page titles, URLs, query strings, browser history, and filenames must contain noPHI, tokens, contact data, room secrets, or clinically meaningful content.

14.3 Downloads and evidence

Download names begin SYNTHETIC-NOT-FOR-CARE-.

Every page of a multi-page artifact has a visible watermark.

Artifact metadata identifies it as synthetic.

Export fails closed if marking or watermark verification fails.

Do not reproduce a real prescription, claim, health-card, pharmacy label, orother operational form closely enough to be mistaken for a valid document.

Screenshots and videos use generic filenames and synthetic-only content.

Browser storage APIs are prohibited unless a narrowly scoped, non-sensitiveuse is approved by G1 and tested. PHI-like or token-like content is alwaysprohibited.

15. Logging, observability, and evidence contract

15.1 Payload-free logging

Allowed log fields:

UTC time.

Sandbox instance reference.

Safe event type.

Source component.

Outcome.

Safe reason code.

Correlation reference.

Prohibited log fields:

Request or response bodies.

Fixture contents.

Names, addresses, contact details, or identifiers.

Tokens, cookies, secrets, credentials, or URLs containing state.

Clinical, prescription, claim, message, prompt, or generated text.

Raw environment values.

Full IP addresses or device fingerprints.

Errors exposed to the browser must be generic and must not reveal configuration,paths, stacks, rejected values, or dependency internals.

15.2 Evidence manifest

Create:

docs/task-01/evidence/evidence-manifest.json

Each evidence record must contain:

Control ID and schema version.

Baseline and tested commit SHA.

UTC timestamp.

Exact command.

Exit code.

Environment: local or ci.

Red-run evidence path.

Green-run evidence path.

Evidence artifact hash.

Safe result summary.

Test owner.

Reviewer status.

Never store secrets, payloads, PHI, real identifiers, signed URLs, or liveresource names in the manifest.

Evidence must be reproducible from the referenced commit. If evidence wascaptured from a dirty worktree, record that fact and do not use it for finalPASS.

16. Binding threat model

Threat

Required control

Fail-closed outcome

Sandbox ships with production

Separate workspace/build/deploy target plus route, bundle, and dependency checks

Production build gate fails

Sandbox code is enabled by a flag or secret URL

No sandbox code in the production route/runtime graph

Route/build check fails

Production code imports sandbox code

Bidirectional architecture rules

CI fails

Sandbox imports a side-effecting production module

Empty allowlist by default; G3 plus transitive review

Build and CI fail

Production database or credential supplied

Typed classification before initialization

Process refuses startup/build

External SDK or network call bypasses stubs

Central adapter boundary plus browser/server egress denial

Operation rejected before transmission

Production session reaches sandbox

Separate origin, cookie namespace, and auth domain

Authentication denied

Link possession grants access

Named-reviewer hosting boundary plus server authorization

Access denied

Real or plausible identifiers enter fixtures

Deterministic synthetic generator and source/build scan

Build and CI fail

Output is mistaken for a real record

Persistent banner, watermark, metadata, and export verification

Export/render blocked

Preview remains online

Build/runtime expiry, kill switch, owner, and teardown

Content denied or deployment removed

Sensitive data enters logs or evidence

Allowlisted structured logging and leakage scans

Test/CI fails

Browser persists sensitive state

Storage prohibition and browser inspection

Test/CI fails

Unknown lifecycle or adapter state succeeds

Exhaustive state handling with deny-by-default branch

Request denied

Kill races with queued work

State recheck before every delayed action and idempotent cancellation

Delayed work denied

Workspace conversion alters production

Baseline and normalized post-change comparison

Promotion blocked

Update the threat model when architecture changes. A passing old threat modeldoes not approve a new dependency, route, adapter, or hosting design.

17. Execution phases

A phase exits only when its required controls are implemented, its tests havered and green evidence, and no unresolved blocking stop condition applies.

Phase

Work

Exit requirement

P0

Read authority files; capture baseline and worktree state

Baseline evidence complete

P1

Current-state analysis, design, data flow, threat model, proposed diff

G1 granted

P2

Separate workspace and production invariance controls

SBX-01, 02, 03, 13 green

P3

Typed environment and lifecycle guards

SBX-04, 07, 16 green

P4

Synthetic fixtures, identity, optional local persistence

SBX-06, 10, 18 green

P5

Stub adapters and browser/server egress denial

SBX-05, 11, 16 green

P6

Marking, headers, artifact safety, accessibility

SBX-08, 09, 15 green

P7

Access, expiry, kill switch, teardown; hosted preview only if G2

SBX-12, 14, 18 green

P8

CI assembly, evidence integrity, full regression, final report

SBX-01 through 18 green and reviewer sign-off

P3–P7 may interleave after G1. Without G1, complete P0 and P1 only.

18. Required security and boundary tests

Use the repository's existing test tooling where possible. Do not replace atest framework merely for this task.

SBX control catalogue

ID

Required proof

SBX-01

Production route, middleware, action, sitemap, robots, manifest, and deployment output contain no sandbox entry

SBX-02

Production code cannot import sandbox source or package exports

SBX-03

Sandbox cannot import production DB, auth, storage, integration, clinical, billing, audit, migration, retention, or deployment modules; each G3 exception is exact and tested

SBX-04

Missing/malformed/unknown config and every prohibited credential or destination class refuse build/startup before initialization without logging values

SBX-05

Unknown or external integration/network operations fail before DNS, socket, SDK, browser, or payload transmission

SBX-06

Production cookies, users, sessions, OAuth callbacks, TOTP material, and client-supplied roles cannot authenticate or authorize in the sandbox

SBX-07

Missing, malformed, stale, or over-30-day expiry denies build/start/content; expiry during use denies the next server action

SBX-08

Every route and state shows the persistent synthetic banner at required viewports and zoom levels

SBX-09

Every artifact page is marked and watermarked; renderer or verification failure blocks export

SBX-10

Source, fixtures, client bundles, build output, screenshots, and evidence contain no plausible real identifiers, production seed overlap, PHI, or secrets

SBX-11

No PHI-like data, tokens, bodies, prompts, message text, clinical text, or identifiers enter URLs, page titles, browser storage, analytics, telemetry, logs, errors, source maps, or evidence

SBX-12

Kill switch and teardown are authorized, idempotent, rehearsed, and affect only explicitly identified synthetic resources

SBX-13

Production build invariance contract passes; every difference is normalized, explained, and approved

SBX-14

Anonymous, unlisted, expired, disabled, removed, and link-only hosted access is denied; named-reviewer access is enforced at the hosting boundary

SBX-15

No-store, no-referrer, indexing, CSP, Permissions Policy, and shared-cache denial apply to every normal and error response

SBX-16

Unknown lifecycle states, adapter names, operations, fixture versions, actor roles, and authorization outcomes fail closed

SBX-17

Every evidence item is tied to the tested commit, hashed, payload-free, and paired with a controlled red run and real-code green run

SBX-18

Reset, expiry, disablement, teardown, duplicate request, and kill-versus-delayed-work races are deterministic and cannot touch production

Additional negative tests

Prove that:

NODE_ENV, a URL path, query parameter, cookie, header, role, feature flag, ordatabase row cannot enable the sandbox in production.

A production credential fails even when another variable claims theenvironment is synthetic.

A lookalike hostname, encoded address, redirect, DNS alias, IPv6 form, oruser-info URL cannot bypass destination validation.

A client bundle cannot access server environment values or the entire fixturecorpus.

A production session cannot be transformed into a sandbox session.

A sandbox actor cannot reach a production authorization boundary.

A failed stub cannot be interpreted as successful delivery, payment,dispensing, claim, message, model, or storage action.

A stale tab cannot act after expiry or disablement.

Work queued before disablement rechecks lifecycle state before execution.

A duplicate teardown does not broaden its target.

An unresolved environment variable, wildcard, glob, or broad directory cannotbecome a teardown target.

A framework error page cannot omit the synthetic marking or safe headers.

Screenshot and export filenames remain generic and synthetic.

No external font, image, script, source map, analytics, or error-reportingservice loads.

Red-run rules

For every SBX control:

Introduce one controlled, synthetic violation in an isolated fixture or scratchbranch.

Prove the relevant test fails for the intended reason.

Remove the violation.

Prove the same test passes against the final code.

Do not commit real credentials, PHI-shaped data, or an enabled unsafe path eventemporarily.

Do not upload an unsafe build or red-run preview.

19. CI and branch-gate contract

Add stable logical checks for:

Production regression build and normal repository gates.

Sandbox type-check, lint, unit, integration, and architecture tests.

Boundary and forbidden-pattern scans.

Browser security/header/storage tests.

Optional guarded local-Docker database tests.

Artifact-marking and leakage scans.

Evidence-manifest validation.

CI requirements

Production and sandbox build independently.

Production jobs receive no sandbox variables or secrets.

Sandbox jobs receive synthetic sentinel configuration only.

Pull requests from untrusted contexts do not receive credentials.

Required checks fail when a test is skipped, filtered, cancelled, or producesno expected report.

CI logs and artifacts are scanned for secrets and PHI-like marker leakagebefore retention.

No required production check is renamed or replaced without explicitrepository authority.

Branch protection or its documented equivalent must require the relevantchecks before merge.

A green sandbox job does not override a failed production job.

A green production job does not override a failed sandbox boundary.

If the agent cannot verify branch protection from available repository evidence,report it as NOT VERIFIED; do not claim enforcement.

20. Accessibility and responsive evidence

The sandbox warning and controls must not create an inaccessible experiment.

Capture synthetic-only evidence for:

375px patient/reviewer-facing view.

Desktop view.

Keyboard-only navigation.

Logical focus order and visible focus.

Screen-reader semantics for the persistent warning.

200% and 400% zoom/reflow.

Reduced-motion behavior.

High-contrast or contrast-check results.

Loading, denied, expired, disabled, error, and empty states.

Long translated text where localization infrastructure exists.

Accessibility evidence proves only the sandbox shell tested here. Each laterexperimental capability remains responsible for its own accessibility evidence.

21. Operational runbook

Create:

docs/task-01/runbook.md

Document:

Local startup prerequisites and safe validation.

Fixture reset.

Optional local-database reset.

How to identify the exact sandbox instance.

Hosted-preview creation only after G2.

Named-reviewer access verification.

Expiry verification.

One-command or one-operation disablement.

Idempotent teardown using explicit synthetic resource identifiers.

Verification that production resources were not affected.

Evidence collection and redaction.

Failure escalation.

Recovery from a partial sandbox deployment.

Removal or rotation of sandbox-only credentials, if any were approved.

Never place credentials, signed URLs, production resource names, or broaddestructive shell examples in the runbook.

22. Deliverables

docs/task-01/current-state-and-gap-analysis.md.

docs/task-01/experimental-sandbox-design.md.

docs/task-01/experimental-sandbox-threat-model.md.

docs/task-01/experimental-sandbox-data-flow.md.

G1, G2, and G3 decision records as applicable.

Separate sandbox application/workspace.

Typed environment and lifecycle guard.

Deterministic server-owned synthetic fixtures.

Sandbox-only identity and authorization boundary.

Throwing and in-memory integration adapters.

Browser and server network-denial controls.

Persistent synthetic marking and safe response headers.

A deterministic, non-operational, multi-page sample artifact withfail-closed watermark verification.

Fixture, source, bundle, log, URL, storage, and artifact leakage scans.

SBX-01 through SBX-18 automated tests.

Red-run and green-run evidence for every SBX control.

CI and branch-gate documentation.

docs/task-01/evidence/evidence-manifest.json.

docs/task-01/runbook.md.

Updated experiment template and repository task status.

Final implementation report in the format below.

Do not create a general-purpose export subsystem solely to satisfy item 13. Atest-only sample renderer is sufficient, but every page must be visiblywatermarked and renderer or verification failure must block the download.

23. Out of scope

Production deployment, production domain, production database, or live users.

Real, de-identified, pseudonymized, or copied PHI.

Live vendors, integrations, recipients, model calls, payments, shipments,messages, meetings, calendar events, claims, or storage.

Clinical rules, prescribing, dispensing, referral urgency, diagnosis, billing,PIN selection, claim derivation, or clinical/fiscal finality.

Production authentication, migration, audit, retention, privacy-policy, orclinical-record changes.

Hidden bypasses, universal passwords, admin overrides, permissive serveractions, fallback secrets, or production database grants.

Building the later roadmap capabilities. This task creates and proves only theenvironment in which their synthetic prototypes may be built.

Production-readiness approval.

24. Acceptance criteria

AC1 — Separate boundary: the sandbox is a distinct workspace, build,runtime, origin, identity domain, configuration, and deployment target.

AC2 — Production exclusion: production routes, bundles, middleware,navigation, deployment inputs, and dependency graph contain no sandbox code.

AC3 — Production invariance: the normalized production baseline comparisonpasses with no unexplained difference or weakened gate.

AC4 — Fail-closed configuration: missing, malformed, unknown, stale, orproduction-like configuration prevents build/startup before initialization.

AC5 — No external effect: no sandbox action can reach a real network,vendor, recipient, model, database, storage, payment, shipment, message,calendar, claim, or production resource.

AC6 — Identity isolation: production identities and sessions cannotauthenticate; client values and link possession grant no authority.

AC7 — Synthetic-only data: fixtures are deterministic, server-owned,visibly synthetic, and free of plausible identifiers, production overlap, PHI,and secrets.

AC8 — Safe artifacts: every screen and applicable artifact is persistentlymarked; failed marking blocks export.

AC9 — Safe browser behavior: protected content is not indexed, referred,shared-cached, persisted in browser storage, or sent to analytics, telemetry,replay, or external assets.

AC10 — Lifecycle enforcement: expiry, disablement, queued-work denial,reset, and teardown are server/platform enforced, deterministic, andidempotent.

AC11 — Evidence quality: every SBX control has a controlled red run, afinal-code green run, commit binding, hash, exact command, and payload-freeevidence.

AC12 — CI enforcement: all existing production gates and all requiredsandbox gates pass and are required before merge.

AC13 — Accessibility: required responsive, keyboard, screen-reader, zoom,reflow, focus, contrast, and reduced-motion evidence passes.

AC14 — Approval integrity: G1 and final reviewer sign-off are recorded; G2and G3 are used only when applicable and only within their exact scope.

AC15 — No prohibited change: no production schema, authentication,clinical, billing, audit, retention, vendor, messaging, or deployment behavioris enabled or weakened.

PASS requires every applicable acceptance criterion and SBX control to pass,with required approvals and evidence. A skipped or unverified mandatory itemprevents PASS.

25. Evidence required in the pull request

Current-state and gap analysis.

G1-approved design package and decision record.

Baseline and post-change production invariance report.

Normalized production route, bundle, dependency, environment, and deploymentcomparisons.

SBX-01 through SBX-18 red-run and green-run outputs.

Architecture test output for the empty or G3-approved import allowlist.

Redacted configuration-denial evidence.

Network-denial proof showing rejection before transport.

Fixture and production-seed-overlap scans.

Source, bundle, log, URL, browser-storage, analytics, telemetry, source-map,screenshot, and artifact leakage scans.

375px, desktop, keyboard, screen-reader, zoom/reflow, contrast, andreduced-motion evidence.

Multi-page watermark evidence if exports exist.

Expiry, disablement, queued-work denial, reset, and teardown rehearsal.

CI and branch-gate results.

Evidence manifest bound to the final commit.

Reviewer sign-off.

Evidence must contain only deterministic synthetic information.

26. Agent completion procedure

Before reporting completion:

Re-read the applicable AGENTS.md and confirm the final diff remains withinscope.

Confirm every changed file is listed.

Confirm unrelated worktree changes were preserved.

Run the repository's required production checks.

Run all sandbox checks and SBX-01 through SBX-18.

Validate the evidence manifest against the tested commit.

Verify no test is skipped or silently filtered.

Run the leakage and secret scans last against source, build output, logs, andevidence.

Rehearse disablement and teardown against explicitly identified synthetictargets.

Obtain the required reviewer sign-off.

Update task and repository documentation.

Produce the final report exactly in the following format.

27. Final report format

Task 01 experimental sandbox status: PASS | BLOCKED | FAIL

Commit SHA:
Baseline SHA:
Dirty worktree at evidence capture: NO | YES

Repository authority files: VERIFIED | BLOCKED
Current-state analysis: PASS | BLOCKED
G1 design approval: GRANTED ("<verbatim approval>") | NOT GRANTED
G2 hosted preview: GRANTED ("<verbatim approval>") | NOT REQUESTED | NOT GRANTED
G3 production-import allowlist: EMPTY | <exact imports and approval references> | BLOCKED
Final security/privacy review: APPROVED | PENDING | BLOCKED

Separate workspace/build: PASS | FAIL
Production route/bundle exclusion: PASS | FAIL
Production invariance: PASS | BLOCKED | FAIL
Environment fail-closed behavior: PASS | FAIL
Production credential denial: PASS | FAIL
External network/integration denial: PASS | FAIL
Production identity/session isolation: PASS | FAIL
Synthetic fixture controls: PASS | FAIL
Persistent synthetic marking: PASS | FAIL
Artifact watermarking: PASS | FAIL
Browser storage and URL leakage controls: PASS | FAIL
Logging and evidence leakage controls: PASS | FAIL
Lifecycle and expiry: PASS | FAIL
Kill switch: PASS | FAIL
Teardown rehearsal: PASS | FAIL
Accessibility evidence: PASS | FAIL
CI/branch gates: PASS | BLOCKED | NOT VERIFIED | FAIL

Phases P0–P8: <each PASS | BLOCKED(S-id) | NOT RUN(gate) | FAIL>
SBX-01 through SBX-18: <each PASS | FAIL | NOT RUN, with red/green evidence references>

Real PHI used: NO
Production data accessed: NO
Production schema changed: NO
Production authentication changed: NO
Production clinical/billing/audit/retention logic changed: NO
Production vendor connected: NO
External messages or actions created: NO
Live model called: NO
Production deployment changed: NO

Stop conditions fired:
Blocking issues:
Required lead decisions:
Required security/privacy decisions:
Unresolved risks:
Evidence locations:
Files changed:
Tests run and results:
Rollback procedure:
Recommended next action:

Never report PASS while a required gate, SBX control, acceptance criterion,production comparison, reviewer sign-off, or evidence item is unresolved.

If the technical sandbox is complete but an approval remains open, report:

Task 01 technical controls: COMPLETE — overall status BLOCKED pending the namedapproval; no production capability is authorized.

28. Handoff to later roadmap tasks

Tasks 03–10 named by the current roadmap, and any later task that consumes thesandbox, may begin synthetic UI and workflow implementation only after:

Task 01 is merged.

The required boundary checks are active in CI.

The sandbox has not expired or been disabled.

The later task has its own approved scope, deterministic synthetic fixtures,authorization model, stop conditions, and evidence plan.

Each later task must:

Use the sandbox through its public, approved extension boundary.

Obtain G3 before importing any production module.

Add its own external-effect stubs and leakage tests.

Recheck expiry and kill-switch state before delayed work.

Preserve the persistent synthetic marking.

Produce capability-specific security, privacy, accessibility, and failureevidence.

Remain separately gated from production under Task 11 or the applicable releaseprocess.

Passing Task 01 proves only that the experimental boundary was implemented andtested. It does not approve a production vendor, hosting model, consent policy,clinical workflow, AI capability, data residency position, professional scope,or patient-facing release.
