Task 03 — Build the Pharmacist “Today” Command Centre

Version: 3 · supersedes the attached Task 03 draft · 2026-07-30Owner profile: frontend/product engineerRequired reviewers: pharmacist product reviewer, privacy/security reviewer,accessibility reviewer, and Task 11 release reviewerPriority: P1 product foundationStatus: repository discovery and design may start; runnable implementationrequires the approved Task 01 synthetic environmentProduction authorization: none

Mission

Design, implement, and verify a calm, accessible, synthetic pharmacistcommand-centre prototype that answers:

What operational work needs attention today?

Why is each item present?

Where did it originate?

When was it received, scheduled, or made due?

Is its source current, stale, unavailable, or unknown?

Is the work ready for pharmacist review, blocked, or unavailable?

What non-destructive action is permitted for the current synthetic role?

The command centre organizes work. It does not diagnose, triage, prescribe,dispense, establish clinical urgency, determine billing eligibility, submit aclaim, or make professional decisions.

The safest valid outcome is sometimes BLOCKED. Never weaken authentication,tenant pinning, privacy, audit, assessment, billing, or sandbox boundaries toproduce a demo or a PASS.

1. Binding Agent Contract

1.1 Instruction precedence

Before changing code, read completely, in this order:

The nearest applicable AGENTS.md and every parent-scope AGENTS.md.

PROJECT_OVERVIEW.md, if present.

EXPERIMENTAL_SANDBOX.md.

AUTONOMOUS_PHARMACY_ROADMAP.md.

The approved Task 01 specification and current Task 01 status/evidence.

The current Task 02 status and production-readiness decision.

The Task 11 test-plan, evidence, and release-control requirements.

Relevant package, route, build, test, CI, security, deployment, design-system,and accessibility configuration.

Repository instructions override this task when they are stricter. If twoinstructions cannot be satisfied together, trigger T03-S01, stop theaffected workstream, and document the conflict. Do not guess which instructionwas intended.

The attached deep-research report is product context, not legal, clinical,privacy, security, or production approval. It supports a documentation-first,pharmacist-workflow design but cannot authorize production data use or aclinical conclusion.

1.2 Requirement language

MUST / MUST NOT are release-blocking requirements.

SHOULD / SHOULD NOT require a written rationale and reviewer dispositionif not followed.

MAY indicates an optional implementation choice.

A skipped, cancelled, flaky, selected-out, or unavailable check is NOT RUN orBLOCKED, never PASS.

1.3 Authorized activity

The agent may:

Perform read-only repository and architecture discovery.

Produce information architecture, wireframes, contracts, threat models, testplans, and production-integration proposals.

Implement deterministic synthetic UI only inside the Task 01-approvedenvironment.

Add prototype-only routes, components, fixtures, tests, and evidence that areisolated from production.

Use existing pure design-system modules only when Task 01 permits the exactimport.

Run existing safe local tests and builds.

The agent must not:

Connect real patient, pharmacist, pharmacy, clinical, claim, inventory,appointment, message, or integration data.

use production accounts, sessions, credentials, hosts, storage, databases,APIs, analytics, or error-monitoring projects;

add or enable a production mutation, background job, webhook, message,notification, appointment, fulfilment action, or integration;

change production authentication, authorization, tenant, audit, retention,assessment, billing, prescribing, or claim behavior;

add clinical ranking, risk scoring, triage, diagnosis, treatment,prescribing, billing, reimbursement, or claim logic;

activate Patient Care, Automation Review, Fulfilment, Governance, or anyunfinished destination;

apply Task 02 migrations or modify Task 02 migration history;

create a hosted preview without the exact Task 01 approval required for it;

treat a prototype review or Task 03 PASS as production approval.

1.4 Agent operating rules

Inspect before editing; do not assume the framework, router, package manager,test runner, CI provider, component library, authorization model, ordeployment layout.

Preserve unrelated user changes and existing required checks.

Reuse repository conventions when they satisfy this specification.

Do not introduce a new framework, state library, component library, datelibrary, icon set, or test system unless the current stack cannot meet arequirement and the decision is documented.

Keep the implementation additive and reversible.

Keep fixtures and fixture adapters server-owned and synthetic-only.

Derive actor and pharmacy scope only from the approved server-side syntheticsession context.

Fail closed on unknown roles, states, reason codes, actions, filters, orconfiguration.

Add the controlling test in the same change as each security, privacy, orarchitecture boundary.

Use synthetic marker values in negative leakage tests.

Never print a payload, secret, token, patient-like value, or clientserialization when a test fails.

Never edit generated files directly when the repository has a sourcegenerator.

Do not claim evidence that was not actually produced at the recorded commit.

1.5 Closed execution loop

For every control or workstream:

Inspect the current implementation and applicable authority.

Record the baseline and gap.

State the exact invariant and expected failure mode.

Add a controlled red test where technically safe and appropriate.

Implement the smallest compliant change.

Run the focused green test.

Run affected regression, production-invariance, and leakage checks.

Record evidence, command, result, and commit in the evidence manifest.

Update the requirement-to-evidence matrix.

Stop or continue according to the documented result.

Do not defer boundary tests, evidence hygiene, or rollback notes until the end.

2. Definitions and Authoritative Boundaries

2.1 Definitions

Today workspace: the authenticated pharmacist landing experience createdby this task.

Work item: a minimal, server-composed representation of an operationalitem requiring attention or awareness. It is not the underlying clinicalrecord.

Queue family: one of intake, booked visit, follow-up, prescriptionrequest, integration failure, or manual-review exception.

Operational reason: an allowlisted, source-supported reason the item isdisplayed. It is not a diagnosis, clinical urgency, or predicted outcome.

Display order: server- or fixture-supplied presentation metadata. It mustnot be calculated in the browser or inferred from clinical facts.

Operationally overdue: an explicit non-clinical deadline has passed. Itdoes not mean clinically urgent.

Freshness: whether a source has been verified within its declaredoperational freshness policy.

Blocked: the next action is not available because a named operational gateis incomplete or unavailable.

Partial failure: one or more sources failed while other source resultsremain available and are visibly qualified.

Prototype destination: a visibly unavailable, non-operational navigationdestination used only to communicate future information architecture.

Client-safe value: a value explicitly allowlisted for browserserialization after classification and minimization.

PHI-bearing value: any direct or indirect patient information, includingcombinations that can identify a person or reveal care activity.

Production invariance: production builds, routes, bundles, data sources,behavior, and external effects are unchanged by the prototype.

Synthetic: deterministic, visibly marked, and incapable of being mistakenfor a real person, pharmacy, clinical record, prescription, or operationalevent.

Unknown classification is treated as sensitive and server-only.

2.2 Authoritative systems

The command centre is not authoritative for clinical or operational sourcerecords.

Concern

Authority during prototype

Future production authority

Actor and role

Task 01-approved synthetic server session

Existing authenticated identity and authorization service

Pharmacy/tenant scope

Task 01-approved synthetic server context

Existing server-side tenant context

Queue item facts

Deterministic server-owned fixtures

Named source service for each queue

Display order

Explicit fixture metadata

Approved server-side orchestration contract

Clinical conclusions

None

Authorized pharmacist and existing clinical services

Assessment state

Synthetic display state only

Existing assessment service

Billing or claim state

None

Existing billing/claim service

Audit record

Synthetic evidence only

Existing append-only audit service

Clock and timezone

Fixed injected clock and declared synthetic timezone

Server clock and pharmacy configuration

Production release

None

Task 11 plus required product, pharmacist, privacy, security, and other approvals

The dashboard may summarize authoritative facts in the future, but it must notsilently become their source of truth.

2.3 Orthogonal state axes

Do not collapse independent facts into one ambiguous status field. Model anddisplay these axes separately:

Queue family: what kind of operational work this is.

Source health: available, partially available, unavailable, or unknown.

Freshness: current, stale, not verifiable, or not applicable.

Workflow state: new, ready for review, needs pharmacist review, blocked,completed, cancelled, or unknown.

Timing state: no due time, upcoming, due, operationally overdue, orunknown.

Verification state: verified, needs verification, failed verification,or not applicable.

Action state: allowed, unavailable, denied, or unknown.

One axis must never silently set another. In particular:

overdue must not imply urgent;

ready must not imply safe, clinically appropriate, billable, fillable,eligible, or approved;

source available must not imply verified;

integration recovered must not imply clinical completion;

completed in a source must not create an assessment, claim, prescription,dispensing, or follow-up effect;

a count must not grant item access;

a visible action must not grant server authorization.

2.4 Protected surfaces

Treat these as protected even in the synthetic prototype:

The Today route and layout.

Server-composed queue and aggregate data.

Synthetic role and pharmacy scope.

Filter validation.

Client serialization and hydration data.

Route parameters, search parameters, and navigation targets.

Page titles, metadata, referrers, caches, logs, analytics, telemetry, andevidence.

Fixtures, screenshots, test artifacts, and built bundles.

Future production data contracts.

3. Dependencies, Gates, and Coordination

3.1 Dependency register

Dependency

Required state

Permitted response if unresolved

Repository instructions

Read and non-conflicting

Complete only independent analysis

Task 01 synthetic environment

READY, with exact approved workspace/build named

Do not implement runnable UI

Task 02 production gate

Any state may be documented

Keep all production data integration blocked unless separately approved after PASSED

Task 11 checkpoint 1

Test plan reviewed before implementation

Produce plan; do not self-approve

Existing role model

Discoverable and unambiguous, or safe Task 01 synthetic roles defined

Stop role-dependent implementation

Existing design/test conventions

Discoverable

Document gap before adding tooling

Production source contracts

Not required for prototype

Propose contracts only

Task 05 identity boundary, if present

Required only for future production integration

Record as production dependency

Tasks 07/08/10 capabilities

Not required

Show only unavailable destinations; do not import

3.2 Task 01 relationship

Runnable work is allowed only in the exact Task 01-approved syntheticenvironment.

Record the Task 01 evidence reference and approved workspace/build.

Use no production identity, data, database, storage, credentials, hostnames,or integration modules.

Keep network denial and production-import controls intact.

If a shared production design-system import is needed, follow Task 01’s exactpure-module approval process.

If Task 01 is absent, expired, unsafe, or cannot prove production invariance,complete documents and wireframes only and report BLOCKED.

Task 03 cannot approve Task 01.

3.3 Task 02 relationship

Task 02 does not block the synthetic prototype, but it blocks production dataconnection.

Read Task 02 status without applying or changing migrations.

Do not query a production-like assessment or claim database.

Do not infer that a Task 02 PASS authorizes Task 03 production integration.

Future connection requires Task 02 PASSED, source-contract approval,authorization tests, privacy review, and Task 11 promotion approval.

If Task 02 is unresolved, the correct completion statement may still be:Task 03 prototype: PASS — production integration remains blocked by Task 02.

3.4 Task 11 relationship

Submit the Task 03 test plan for Task 11 checkpoint-1 review beforeimplementation.

Register the prototype capability, owner, expiry, kill switch, evidencelocation, and review date when the Task 11 register exists.

Use Task 11’s stable required-check names and evidence schema when available.

Do not silently waive security, privacy, or accessibility findings.

A Task 03 implementation agent cannot approve its own promotion.

Before any shared preview or later production candidate, complete Task 11checkpoint-2 evidence review.

3.5 Approval record

Every referenced approval must record:

Approval identifier.

Scope and exact artifact/commit reviewed.

Decision: APPROVED, APPROVED_WITH_CONDITIONS, BLOCKED, or EXPIRED.

Conditions.

Named authority and role.

Decision time and expiry, if applicable.

Superseded decision, if any.

Silence, an old approval for another task, a successful test, or an informal“looks good” is not approval.

4. Mandatory Stop Conditions

Stop the affected workstream, preserve safe evidence, continue only independentwork, and report the stop ID.

T03-S01 — Conflicting authority: an applicable AGENTS.md, projectinstruction, or approval conflicts with the requested operation.

T03-S02 — Unsafe or missing sandbox: Task 01 is missing, expired, unsafe,or does not name the approved prototype environment.

T03-S03 — Production reachability: the prototype can reach productiondata, identity, storage, network, credentials, hosts, or integrations.

T03-S04 — Real or ambiguous data: real, de-identified, pseudonymized,copied, or plausibly real PHI appears in fixtures, tests, logs, screenshots,or artifacts.

T03-S05 — Unapproved production import: implementation requires aproduction module not permitted by Task 01.

T03-S06 — Production integration: work would connect production databefore Task 02 and all later release gates pass.

T03-S07 — Tenant scope from client: pharmacy or tenant scope can beselected, broadened, or supplied by a URL, browser state, or client component.

T03-S08 — Ambiguous role: current roles cannot be mapped without inventingproduction permissions or risking unauthorized access.

T03-S09 — PHI client crossing: a full patient, queue, assessment,prescription, medication, document, or other PHI-rich object must cross theclient boundary.

T03-S10 — Clinical inference: a required display or order would needdiagnosis, triage, clinical urgency, treatment, prescribing, dispensing,billing, reimbursement, or claim logic.

T03-S11 — Opaque ranking: display order cannot be traced to explicitfixture/server metadata and a safe reason.

T03-S12 — Unauthorized mutation: a production mutation or external effectwould be enabled without its own server authorization and tests.

T03-S13 — Deceptive prototype control: an unavailable destination ordisabled control performs an action, navigates to a live capability, orappears operational.

T03-S14 — Unsafe fixture activation: synthetic fixtures can be enabled in,imported by, or silently substituted for a production build.

T03-S15 — Cache or telemetry leakage: PHI or synthetic marker values canenter shared caches, browser storage, analytics, session replay, referrers,client logs, or telemetry.

T03-S16 — Evidence leakage: evidence cannot be captured without exposingreal information, identifiers, tokens, secrets, or unsafe filenames.

T03-S17 — Unusable responsive design: required content or action cannotreflow at 375px or 400% zoom without horizontal scrolling or lost meaning.

T03-S18 — Accessibility blocker: a critical keyboard, screen-reader,focus, target-size, contrast, or motion defect cannot be fixed within scope.

T03-S19 — Source failure disguised as empty: implementation cannotdistinguish unavailable/stale source data from a genuinely empty queue.

T03-S20 — Unknown state opens authority: an unknown role, code, filter,action, or state defaults to access or an enabled action.

T03-S21 — Baseline cannot be preserved: unrelated user changes orproduction behavior cannot be separated from this task.

T03-S22 — Test evidence unsafe or unavailable: a required boundary cannotbe tested without live data, secrets, or production effects.

T03-S23 — Hosted preview unapproved: a non-loopback preview lacks theexact Task 01 hosting approval, access control, expiry, and teardown owner.

T03-S24 — Existing protections weakened: completion would weaken tenant,authentication, authorization, audit, assessment, claim, privacy, retention,or release controls.

When only production integration is blocked, continue all safe synthetic work.

5. Required Current-State and Gap Analysis

Before implementation, create:

docs/task-03/current-state-and-gap-analysis.md

If repository conventions require another location, use it and record theresolved path in the evidence manifest.

5.1 Repository baseline

Record:

Repository root and current commit.

Working tree status and unrelated changes that must be preserved.

Applicable instruction files.

Package manager and lockfile.

Framework, router, rendering model, and route conventions.

Existing build, lint, type-check, unit, component, integration, end-to-end,accessibility, and visual-test commands.

Existing CI required checks.

Existing evidence/artifact locations.

Current pharmacist landing route and route guards.

Current layout, navigation, design-system primitives, icons, typography,spacing, breakpoints, and motion conventions.

Existing server/client boundaries.

Existing error, loading, empty, and access-denied patterns.

Existing cache, metadata, referrer, analytics, telemetry, and loggingbehavior on protected routes.

Task 01, Task 02, and Task 11 status references.

Do not print secret or environment values. Record only variable names,classification, source, and whether a safe synthetic value exists.

5.2 Current route and access map

Document:

Entry route.

Authentication and role checks.

Source of actor and pharmacy scope.

Server-rendered and client-rendered regions.

Data fetches and module dependencies.

Navigation destinations.

Mutations or server actions reachable from the page.

Cache and prefetch behavior.

Error and session-expiry behavior.

Use a compact trust-boundary or request-flow diagram where it clarifies theroute.

5.3 Gap classification

Classify each requirement as:

SATISFIED

PARTIAL

MISSING

CONFLICT

NOT APPLICABLE

BLOCKED

For every non-satisfied requirement, record:

Evidence.

Risk.

Smallest proposed change.

Files likely affected.

Test required.

Approval or dependency required.

Rollback approach.

5.4 Proposed change manifest

Before editing, list:

Files to add.

Files to modify.

Files explicitly out of bounds.

Routes affected.

Imports proposed.

New dependencies, ideally none.

Test files.

Documentation and evidence paths.

Production-invariance checks.

Update the manifest if implementation diverges. Do not silently expand scope.

6. Baseline Lock and Environment Identity

Create a baseline record before implementation with:

Commit SHA.

Dirty-worktree summary without file contents.

Task 01 environment identifier.

Build target and route root.

Synthetic mode identifier.

Fixed clock identifier.

Synthetic timezone.

Test command versions.

Existing required checks.

Hashes of relevant task specifications and fixture schemas.

The prototype must fail closed when:

The expected synthetic build target is absent.

Task 01’s required environment marker is missing or malformed.

A production hostname, credential namespace, data adapter, or integrationmodule is selected.

The fixture manifest is absent, unversioned, or not marked synthetic.

The runtime mode is unknown.

Do not rely on a client-visible feature flag, query parameter, hidden route, orsecret URL as the environment boundary.

7. Execution Sequence

Phase 0 — Inspect and contain

Read required instructions and task states.

Record repository baseline and uncommitted work.

Resolve the Task 01 synthetic environment.

Confirm no production data, identity, network, or integration is needed.

Produce current-state, gap, and proposed-change documents.

Draft the Task 11 checkpoint-1 test plan.

Phase 1 — Design and contracts

Produce information architecture.

Produce annotated 375px and desktop wireframes.

Define orthogonal state and queue-item contracts.

Define safe queue reasons and labels.

Define server/client serialization allowlists.

Define role/action and navigation matrices.

Define failure-state and accessibility matrices.

Produce threat model and privacy/data-flow map.

Phase 2 — Deterministic fixtures

Define fixture schema, version, fixed clock, and timezone.

Add every required queue/state scenario.

Add leakage marker values and production-denial tests.

Prove fixtures are server-owned, deterministic, and network-free.

Prove unknown fixture values fail closed.

Phase 3 — Synthetic implementation

Implement server-composed Today data.

Implement summary, filters, queue/list, provenance, and timestamps.

Implement role-safe prototype navigation.

Implement loading, stale, partial-failure, total-failure, blocked, denied,expired, and unknown states.

Keep all production mutations and destinations absent or inert.

Phase 4 — Verification

Run component, route, architecture, tenant, leakage, determinism, andproduction-invariance tests.

Verify keyboard and screen-reader semantics.

Verify 375px, desktop, 200%, and 400% reflow.

Verify reduced motion, long labels, and 56px frequent-action targets.

Capture synthetic evidence and update the manifest.

Phase 5 — Handoff

Produce production-integration boundary and unresolved-dependency record.

Complete requirement-to-evidence mapping.

Submit Task 11 checkpoint-2 evidence when promotion is requested.

Update task status and final report.

Do not wait for Task 02 to finish Phases 0–4.

8. Workstream A — Information Architecture and Wireframes

Design the authenticated pharmacist landing experience around Today.

8.1 Required page regions

The information architecture must include:

A single clear page heading.

Today’s date calculated in the configured synthetic pharmacy timezone.

Current pharmacy context as a non-editable label.

Last successful refresh or data-as-of timestamp.

Clear synthetic/prototype identification.

A concise authorized workload summary.

Allowlisted workload filters scoped to the current pharmacy.

One understandable worklist or clearly separated queue groups.

Role-appropriate prototype destinations for Patient Care, Automation Review,Fulfilment, and Governance.

Clear loading, refreshing, empty, filtered-empty, stale, partial-failure,total-failure, session-expired, and access-denied states.

Do not add a pharmacy switcher unless an existing authorized server-sideswitching workflow already exists and Task 01 provides an equivalent safesynthetic contract. A static selector that changes tenant scope is prohibited.

8.2 Work-item content order

Each work item must show, in a consistent reading order:

Minimal synthetic subject/work reference.

Queue family.

Operational state.

Explainable queue reason.

Source label and source health.

Absolute timestamp.

Optional relative time derived from the same injected clock.

Freshness or last-verified state.

Due/overdue information, when an explicit operational due time exists.

Blocked reason, when blocked.

Next permitted non-destructive action or why none is available.

Do not rely on badges alone. Status text must remain understandable withoutcolor, icon, layout position, or motion.

8.3 Wireframes

Produce annotated wireframes for:

375px mobile.

The repository’s standard desktop viewport.

Annotate:

Landmark, reading, and focus order.

Heading hierarchy.

Responsive reflow.

Server-rendered sensitive regions.

Client-interactive regions.

56px frequent-action targets.

Status announcements and live-region behavior.

Filter validation and navigation behavior.

Loading, empty, stale, partial-failure, and failure transitions.

Long labels and translated-text growth.

Absolute and relative time presentation.

Non-operational destination behavior.

A desktop table may become cards or a list on mobile, but information order,meaning, relationships, and action availability must remain equivalent. Do notrequire horizontal scrolling at 375px or 400% zoom.

8.4 Deliverable

docs/task-03/information-architecture-and-wireframes.md

9. Workstream B — Queue and State Contract

9.1 Required queue families

Represent all six workload families:

Intake.

Booked visits.

Follow-ups.

Prescription requests.

Integration failures.

Manual-review exceptions.

9.2 Common queue-item contract

Define at minimum:

Field

Rule

itemRef

Opaque, non-secret, synthetic work-item reference; never grants authority

family

Allowlisted queue family

displayOrder

Server-supplied stable ordering metadata

orderReasonCode

Allowlisted operational explanation, not a clinical score

sourceType / sourceLabel

Safe source provenance

sourceEventAt

Source event timestamp, if known

receivedAt

Time AgentRx received/created the work item

pharmacyTimezone

Server-supplied configured timezone

sourceHealth

Available, partial, unavailable, or unknown

freshnessState

Current, stale, unverifiable, or not applicable

workflowState

Ready, needs review, blocked, completed, cancelled, or unknown

timingState

Upcoming, due, overdue, none, or unknown

verificationState

Verified, needs verification, failed, or not applicable

queueReasonCode

Allowlisted reason for inclusion

queueReasonLabel

Human-readable safe label

blockedReasonCode

Allowlisted nullable code

blockedReasonLabel

Safe nullable explanation

dueAt

Nullable operational due time

lastVerifiedAt

Nullable source verification time

permittedAction

Server-derived allowlisted navigation/action metadata

subjectDisplay

Minimum server-rendered synthetic display value

provenanceState

Verified, extracted-needs-review, source-unavailable, or unknown

schemaVersion

Contract version used to fail closed on incompatible data

For every field, document:

Meaning and data type.

Required/nullable behavior.

Allowed values.

Source of truth.

PHI classification.

Server-only or client-safe classification.

Staleness behavior.

Authorization expectation.

Unknown-value behavior.

Whether it may influence order or action.

9.3 Queue-specific additions

Intake: submission time, confirmation state, intake source, verificationstate.

Booked visit: scheduled time and operational visit state.

Follow-up: due time and recorded operational follow-up reason.

Prescription request: request category, receipt time, and verificationrequirement. Never imply prescription validity, prescribability, fillability,stock availability, coverage, or release.

Integration failure: originating system, failure time, safe errorcategory, retry/reconciliation state, and whether manual review is required.Never expose raw payloads, stack traces, identifiers, or secrets.

Manual-review exception: exception category, creation time, recorded safereason, and responsible review role.

9.4 Allowed operational reasons

Create an allowlisted catalogue. At minimum, it must distinguish:

New intake received; pharmacist review required.

Scheduled visit approaching.

Recorded follow-up due.

Prescription request received; verification required.

Source integration requires operational review.

Manual-review exception created by an authoritative source.

Required confirmation missing.

Source data stale.

Source unavailable.

Unknown or unsupported state; no action available.

Labels must not say or imply:

urgent, low risk, safe, unsafe, diagnosed, recommended,approved, eligible, covered, billable, fillable,ready to prescribe, or ready to dispense;

unless a future authoritative contract, professional policy, and separateproduction approval explicitly permit that exact conclusion.

9.5 Ordering invariants

The fixture/server supplies display order and a safe order reason.

The browser never computes rank from age, symptoms, medications, pregnancy,documents, red flags, clinical text, or inferred severity.

Sort stability is deterministic.

Ties use a non-clinical deterministic key.

Unknown order metadata fails to a safe stable position withNeeds pharmacist review or Unsupported state; it must not float to afalsely high or low clinical position.

Filtering must not recompute clinical or patient-based priority.

The UI must not label display order as urgency, risk, severity, or clinicalpriority.

9.6 Deliverable

docs/task-03/server-data-contracts.md

10. Workstream C — Deterministic Synthetic Fixtures

10.1 Fixture contract

Fixtures must:

Use unmistakable values such as SYNTHETIC-WORK-003-001 andSYNTHETIC-PHARMACY-003.

Use no real names, initials copied from real people, addresses, phone numbers,emails, health numbers, prescription numbers, pharmacy identifiers, orclinical records.

Be deterministic and versioned.

Use a fixed injectable clock.

Use a declared synthetic pharmacy timezone.

Remain server-owned.

Make no network, vendor, model, analytics, or telemetry calls.

Contain no live SDK, integration, storage, database, or authenticationcredentials.

Be visibly labelled synthetic in development, test, screenshots, andevidence.

Include unique marker values used by leakage and bundle tests.

Fail hard if selected by a production build or unknown environment.

Avoid import by client modules.

Avoid random identifiers or current-clock behavior unless a seededdeterministic generator is required and recorded.

10.2 Required fixture scenarios

Include:

One item for each queue family.

Ready for pharmacist review.

Needs pharmacist review.

Blocked with a visible safe reason.

Operationally due.

Operationally overdue.

Stale source data.

Source unavailable.

Partial source failure with remaining data qualified.

Multiple source failures.

Total dashboard failure.

Action unavailable for the current role.

Empty unfiltered workspace.

No results for selected filters.

Unknown queue family.

Unknown workflow state.

Unknown source-health code.

Unknown reason code.

Malformed nullable field.

Missing required field.

Expired synthetic session.

Unauthorized synthetic role.

Duplicate item reference.

Equal-order tie.

Timezone day-boundary case.

Daylight-saving-time transition case if the configured timezone observes it.

Long labels and translated-text expansion.

Leakage-marker subject and source values that must never reach client bundlesor logs.

10.3 Fixture production-denial proof

Add enforceable tests proving:

Production entry points cannot import fixture modules.

Production builds do not contain fixture marker values.

A production-like runtime mode refuses to start or render with fixtures.

A query parameter, cookie, header, browser flag, or local storage value cannotenable fixtures.

Unknown runtime mode fails closed.

Removing the synthetic manifest fails the prototype safely.

No fixture code can initiate an external effect.

11. Workstream D — Server/Client and Serialization Boundary

11.1 Server ownership

Use the repository’s server-rendering mechanism for:

Actor and role resolution.

Pharmacy/tenant scope.

Fixture selection.

Queue composition.

Ordering.

Filter validation.

PHI-bearing or patient-identifying display fields.

Work-item authorization.

Permitted-action derivation.

Absolute/relative time calculation when necessary to avoid client-clock drift.

Error and freshness qualification.

11.2 Client allowlist

Client components may receive only values required for non-PHI interaction,such as:

Allowlisted filter identifiers and labels.

Current validated filter selection.

Safe aggregate counts when explicitly classified and authorized.

Non-PHI presentation preferences.

UI open/closed state for non-PHI controls.

Safe status-announcement text that contains no subject information.

Do not pass:

A queue array or work-item record.

A patient, assessment, prescription, medication, allergy, visit, follow-up,message, document, claim, or pharmacy object.

Date of birth, address, health number, contact detail, free-text reason, oruploaded-document metadata.

Server authorization state that the client can modify.

Tenant or pharmacy identifiers used for access decisions.

Hidden sensitive fields merely because the component does not display them.

11.3 Serialization rules

Define explicit server-to-client DTOs or props; do not spread domain objects.

Deny fields by default.

Enforce runtime validation at the boundary where repository conventionssupport it.

Treat framework hydration payloads, route data, prefetch responses, sourcemaps, and error overlays as client exposure.

Scan built client artifacts for synthetic leakage markers and forbidden fieldnames/values.

Do not place sensitive content in client caches, service workers, offlinestores, or browser history.

11.4 Filter design

Prefer URL-backed, server-validated, non-PHI filters that trigger a serverrender, provided the repository’s privacy and routing model permits them.

Allow only:

Queue family.

Operational state.

Safe time window.

Rules:

Allowlist and validate each filter on the server.

Unknown values fail safely and visibly.

Filter parameters must contain no actor, patient, work-item, tenant, pharmacy,clinical, or source identifiers.

Pharmacy scope comes only from authenticated server context.

Clearing filters retains the same pharmacy scope.

Filters cannot request a broader worklist.

Filtering must not require sending all records to the browser.

Browser back/forward behavior must remain understandable.

Filter changes must have an accessible loading/result announcement.

11.5 Protected-route privacy controls

Verify or propose, without weakening repository policy:

Protected responses are private and not shared-cacheable.

Sensitive route data uses no-store or the repository’s equivalent.

Page titles and metadata contain no subject, ailment, medication, or work-iteminformation.

Referrer policy prevents sensitive route leakage.

Analytics and session replay are absent on protected prototype routes.

Console and error breadcrumbs contain no fixtures, subject values, orserialized records.

No sensitive data enters localStorage, sessionStorage, IndexedDB, cookiesnot designed for it, or service-worker caches.

Prefetch behavior does not expose unauthorized item content.

11.6 Deliverable

Include the server/client boundary in:

docs/task-03/server-data-contracts.md

12. Workstream E — Roles, Actions, and Navigation

12.1 Role derivation

Derive production role names only from the existing authorization model. Do notinvent production roles or permissions.

For the synthetic prototype:

Use only Task 01-approved synthetic role contexts.

Map each synthetic role to a documented existing-role concept where safe.

Keep actor, pharmacist professional role, support role, and pharmacy scopedistinct.

Unknown, expired, revoked, or unauthorized roles fail closed.

12.2 Role/action matrix

For every discovered role, document:

Today route visibility.

Visible queue families.

Whether an item may be opened.

Permitted non-destructive navigation.

Hidden or disabled actions.

Visible prototype destinations.

Response to unknown, expired, revoked, or unauthorized access.

Server-side authorization requirement for future connection.

UI visibility is not authorization.

12.3 Prototype actions

Permitted prototype interactions are limited to:

Apply/clear safe filters.

Expand/collapse non-PHI explanatory content.

Open an authorized synthetic detail route if implemented wholly inside thesandbox.

Navigate to a visibly unavailable prototype destination.

Until an action has a real, separately approved server mutation andauthorization tests:

Omit it, or

Render a genuinely disabled control with a visible explanation.

A control that looks disabled but remains focusable/clickable as an activeaction is prohibited. A disabled control must not emit a mutation, networkrequest, navigation to a live route, or audit effect.

12.4 Future destinations

Patient Care, Automation Review, Fulfilment, and Governance must:

Be visually distinct and role-appropriate.

Be labelled Prototype, Unavailable, or equivalent.

Explain that the capability is not active.

Remain non-operational.

Avoid dead links, deceptive controls, and blank production pages.

Avoid importing Tasks 07, 08, or 10 implementations.

Avoid implying that messaging, fulfilment, AI, billing, or governance actionsare enabled.

12.5 Deliverable

docs/task-03/role-action-matrix.md

13. Workstream F — State and Failure Catalogue

Create and implement a catalogue covering:

Initial loading.

Refreshing while prior content remains visible.

No work today.

No matches for current filters.

Stale dashboard data.

One source unavailable.

Multiple sources unavailable.

Complete dashboard failure.

Unauthorized role.

Expired or revoked session.

Blocked work item.

Missing required source data.

Malformed source data.

Unknown queue family.

Unknown status, reason, source-health, freshness, or action code.

Retry unavailable.

Prototype destination unavailable.

Fixed-clock/timezone failure.

Synthetic configuration failure.

For each state, document:

Stable state code.

Trigger and detection point.

User-facing message.

Whether prior data remains visible.

How stale or partial data is qualified.

Permitted next action.

Screen-reader announcement and focus behavior.

Safe log/audit expectation.

PHI exposure risk.

Recovery behavior.

Retry/idempotency expectation.

Test and evidence reference.

Invariants:

A failed source is not shown as an empty queue.

Stale data is never presented as current.

Partial data is visibly qualified.

Technical errors, identifiers, stack traces, raw payloads, and secrets neverappear in user-facing messages.

Retry does not broaden scope or duplicate work.

Unknown state disables item actions.

Expired access removes protected content without exposing it in the denialpage.

Deliverable

docs/task-03/failure-state-catalogue.md

14. Workstream G — Synthetic Command-Centre Implementation

14.1 Header and context

Implement:

Page title and Today date.

Non-editable synthetic pharmacy context.

Last-successful-refresh/data-as-of time.

Visible synthetic/prototype banner.

A safe explanation that the page organizes operational work and does not makeclinical decisions.

The date and relative times must use the same injected clock and server-suppliedtimezone. Avoid server/client hydration drift.

14.2 Workload summary

Counts must be server-composed and authorized.

Counts must match the visible authorized scope.

Partial or stale counts must be visibly qualified.

A failed source must not contribute a false zero.

Counts must not be interpreted as clinical severity.

Counts must not expose hidden queue families to an unauthorized role.

14.3 Worklist

Show every required field in the defined content order.

Use semantic list/table/card structures appropriate to the viewport.

Preserve item relationships for assistive technology.

Give every status a textual label.

Expose source and freshness.

Expose absolute time whenever relative time is shown.

Explain blocked and unavailable actions.

Use stable keys and deterministic order.

Avoid animation that suggests urgency.

14.4 Loading and refresh

Use the repository’s safe server loading pattern.

Do not reveal prior-role or prior-tenant data during transitions.

When refreshing with prior data visible, identify it as existing data andannounce the refresh.

On failure, retain prior data only if policy permits and label it stale.

Avoid indefinite skeletons without a failure path.

Skeletons must not resemble real patient content in evidence.

14.5 Empty and failure states

No work today is used only after all required sources have successfullyreported no items.

No matches is distinct from No work today.

Partial failure identifies unavailable source families without exposingtechnical details.

Total failure provides a safe next step and no false counts.

Access-denied and expired-session states expose no queue content.

14.6 No external effects

The implementation must not:

Persist filter or item data in browser storage.

Write clinical or operational records.

Send messages or notifications.

create appointments, fulfilment requests, prescriptions, claims, exports, oraudit records;

call a model or vendor;

retry a real integration;

open a real patient or assessment route;

mutate production or synthetic source records.

15. Workstream H — Threat Model and Privacy/Data Flow

Create:

docs/task-03/threat-model-and-data-flow.md

15.1 Assets

Include:

Actor and role context.

Pharmacy scope.

Queue membership and counts.

Work-item subject display.

Source provenance and freshness.

Server/client boundary.

Route/search parameters.

Fixtures and marker values.

Build artifacts and evidence.

Production source contracts.

15.2 Threat actors and failures

Include:

Unauthenticated user.

Wrong-role user.

Cross-pharmacy actor.

Malicious or malformed URL.

Compromised browser extension or shared workstation.

Client-side manipulation.

Stale session.

Source adapter returning malformed/unknown data.

Developer accidentally importing production or fixture modules across thewrong boundary.

Analytics, telemetry, cache, prefetch, source-map, or error-boundary leakage.

Screenshot or CI-artifact leakage.

Supply-chain or dependency behavior that creates network calls.

15.3 Required threat cases

Model at minimum:

Client-supplied pharmacy or tenant scope.

Hidden queue content serialized to the client.

Full record passed through a client component.

Cross-role queue exposure.

Unknown state enabling an action.

Failed source shown as empty.

Stale source shown as current.

Display order mistaken for clinical urgency.

Prototype destination reaching a live route.

Fixture import in production.

Production import in sandbox.

Synthetic marker in a production bundle.

PHI or identifiers in URLs, page metadata, logs, analytics, caches, orevidence.

Browser back/prefetch revealing prior authorized content after expiry.

Duplicate or malformed work-item reference.

For each threat, record:

Entry point.

Trust boundary.

Existing control.

Proposed control.

Test.

Residual risk.

Owner.

Stop condition.

15.4 Data-flow diagram

Show at minimum:

Synthetic authenticated request.

Server role and pharmacy resolution.

Server-owned fixture adapter.

Queue composition and filter validation.

Server-rendered protected response.

Minimal client interaction data.

Payload-free test/evidence output.

Show blocked production and external-integration paths explicitly.

16. Workstream I — Accessibility, Responsive Design, and One-Handed Use

16.1 Requirements

Verify:

Logical landmarks and one clear h1.

Correct heading hierarchy.

Semantic queue/list/table relationships.

Keyboard access to every enabled control.

Visible focus indicators.

Meaningful accessible names.

Status and reason text independent of color or icon.

Loading, filter-result, stale, failure, and refresh announcements.

Minimum 56px targets for frequent mobile actions.

No essential hover-only interaction.

No keyboard trap.

No unexpected focus movement.

No auto-focus that skips context.

Usability at 375px.

Usability at the repository’s desktop viewport.

Reflow at 200% and 400% zoom.

No loss of content or function.

Reduced-motion support.

Sufficient contrast.

Absolute timestamps when relative time is displayed.

Touch spacing suitable for one-handed counter use.

Long labels and translated-text expansion.

Error and empty states with equivalent semantics.

16.2 Focus and announcement rules

Filter submission announces result count or failure without moving focusunexpectedly.

On route navigation, focus follows the repository’s established accessibleroute pattern.

A partial source failure is announced once and remains discoverable.

Refresh status does not repeatedly interrupt screen-reader users.

Expired-session handling moves to a clear heading and removes protectedcontent.

Disabled/unavailable actions include a programmatically associated reason.

16.3 Evidence

Capture:

375px default and failure states.

Desktop default and failure states.

Keyboard-only walkthrough.

Screen-reader or semantic-tree inspection.

Visible focus.

200% and 400% reflow.

Reduced motion.

Long-label/translated-text stress case.

56px measurements for frequent actions.

Loading, stale, partial-failure, denied, and empty announcements.

Evidence must use only deterministic synthetic values and generic filenames.

16.4 Deliverable

docs/task-03/accessibility-and-responsive-evidence.md

Use the repository’s established evidence/artifact location for images andrecord every path in the manifest.

17. Stable Task 03 Control Catalogue

Use these stable IDs in tests, evidence, findings, and the final report.

Control

Required invariant

T03-C01

Applicable instructions and task dependencies are resolved before editing

T03-C02

Runnable implementation exists only in the Task 01-approved synthetic environment

T03-C03

Production builds cannot select or import Task 03 fixtures

T03-C04

Prototype code cannot reach production data, identity, storage, credentials, hosts, or integrations

T03-C05

Fixtures are deterministic, versioned, server-owned, visibly synthetic, and network-free

T03-C06

Actor, role, and pharmacy scope come only from approved server context

T03-C07

Client or URL input cannot select or broaden tenant/pharmacy scope

T03-C08

All six required queue families are represented

T03-C09

Every item shows source, time, state, freshness, and explainable reason

T03-C10

Operational timing remains distinct from clinical urgency

T03-C11

Display order is explicit server/fixture metadata, never client clinical ranking

T03-C12

Unknown role, state, reason, action, or filter fails closed

T03-C13

Failed and stale sources cannot appear empty or current

T03-C14

Full records and PHI-rich objects never cross the client boundary

T03-C15

Server/client DTOs are allowlisted and deny by default

T03-C16

Synthetic leakage markers are absent from client bundles, hydration, logs, analytics, and storage

T03-C17

Protected route titles, URLs, caches, referrers, and telemetry contain no sensitive data

T03-C18

Prototype destinations are visible where appropriate but non-operational

T03-C19

Production mutations and external effects are absent

T03-C20

Role/action behavior is server-authorized and documented

T03-C21

Empty, filtered-empty, loading, refreshing, stale, partial-failure, total-failure, blocked, denied, expired, and unknown states are usable

T03-C22

Fixed clock and timezone produce deterministic date/time output without hydration drift

T03-C23

Counts reflect authorized scope and visibly qualify partial/stale data

T03-C24

375px and desktop layouts preserve information and function

T03-C25

Keyboard and screen-reader semantics pass

T03-C26

200%/400% reflow and reduced motion pass

T03-C27

Frequent mobile targets meet 56px

T03-C28

Evidence contains only synthetic information and is tied to the tested commit

T03-C29

Required tests run using repository tooling and produce no PHI or secrets

T03-C30

Task 02 production integration remains blocked unless separately approved

T03-C31

Task 11 test-plan and promotion review boundaries are preserved

T03-C32

Production behavior, bundles, routes, and required checks remain invariant

Every control must map to:

Implementation or document location.

Test ID/command.

Evidence artifact.

Result.

Finding or exception, if any.

Reviewer where required.

18. Required Tests

Use the repository’s existing tooling. Do not add placeholder tests that alwayspass or snapshot sensitive payloads.

18.1 Component and route tests

Cover:

Every queue family.

Every orthogonal work-state axis.

Every discovered/synthetic role.

Summary counts.

Empty and filtered-empty.

Loading and refreshing.

Stale data.

One-source, multi-source, and total failure.

Blocked work item.

Unknown and malformed codes.

Unavailable navigation.

Disabled or absent production actions.

Fixed timezone and deterministic time rendering.

Session expiry and access denial.

18.2 Scope and filter tests

Prove:

Pharmacy scope cannot be selected from query parameters, path parameters,headers controlled by the browser, client props, cookies not owned by theserver session, or browser storage.

A supplied pharmacyId, tenantId, or equivalent is ignored or denied.

Unknown filter values fail safely.

Clearing filters retains server pharmacy scope.

The client cannot request a broader worklist.

Hidden queue families do not influence unauthorized counts.

Back/forward navigation does not restore unauthorized content after sessionexpiry.

18.3 Authorization tests

Cover:

Unauthenticated access.

Expired session.

Revoked session if the synthetic identity model supports it.

Wrong role.

Unknown role.

Wrong pharmacy.

Cross-tenant item reference.

Client-supplied role.

Client-supplied permitted action.

Deep link to unauthorized synthetic item.

Prototype destination visibility by role.

Production mutations must be absent. Do not create fake authorization tests fornonexistent production mutations.

18.4 Queue and ordering tests

Prove:

All families render.

Each item exposes required provenance.

Order is stable and fixture supplied.

Equal-rank ties are deterministic.

Filtering does not infer or recalculate clinical priority.

Unknown ranking metadata fails safely.

Operational overdue is labelled without clinical urgency.

Source health and freshness remain independent.

A failed source does not contribute a false zero.

18.5 Server/client architecture tests

Add enforceable tests that fail if:

A full patient or queue record is passed to a client component.

Prohibited fields appear in serialized props, route data, hydration, or clientstate.

Server-only types or fixture adapters are imported by client modules.

Client code imports production source services.

Client code computes order from clinical or subject data.

Tenant/pharmacy scope enters client-controlled filter state.

A production entry imports Task 03 fixtures.

Do not rely only on naming conventions or code-review comments.

18.6 Privacy and leakage tests

Fail if:

PHI-like or synthetic marker values appear in URLs, page titles, metadata,referrers, browser storage, service-worker caches, analytics, telemetry,breadcrumbs, console output, or error pages.

Queue or subject records appear in shared caches.

Fixture markers appear in a production build.

Server-only marker values appear in a client bundle or hydration payload.

Evidence filenames contain subject, pharmacy, ailment, medication, queue-item,or source identifiers.

Screenshots contain real or ambiguous data.

A protected response is shared-cacheable.

Session replay loads on the protected route.

18.7 Failure and resilience tests

Cover:

Missing required field.

Malformed field.

Unknown schema version.

Source timeout fixture.

Stale source.

Partial response.

Multiple failures.

Total failure.

Retry unavailable.

Duplicate item reference.

Clock unavailable.

Invalid timezone.

Unknown runtime mode.

No failure may enable an action, broaden scope, or show failed data as empty orcurrent.

18.8 Accessibility and responsive tests

Cover:

Automated accessibility checks where supported.

Keyboard traversal.

Screen-reader semantics.

Visible focus.

Loading and filter announcements.

Stale and failure announcements.

375px mobile.

Desktop.

200% and 400% reflow.

Reduced motion.

56px target verification.

Long labels and translated-text growth.

Color-independent status meaning.

Absolute timestamp discoverability.

18.9 Determinism tests

Prove:

Repeated runs produce the same fixture IDs, order, dates, labels, andscreenshots except for approved rendering tolerances.

The browser clock and timezone cannot change server meaning.

Tests do not depend on current date, random values, network availability, orexecution order.

Parallel test execution does not share mutable fixture state.

18.10 Production-invariance tests

Compare before and after:

Production routes.

Production entry points and bundle dependency graph.

Production data adapters.

Environment-variable allowlists.

Network destinations.

Database migrations/schema.

Authentication/authorization behavior.

Required production tests.

Deployment configuration.

Any unexplained change is BLOCKED, not accepted as collateral work.

19. Evidence Contract

19.1 Evidence rules

Every claimed PASS must point to evidence generated from the exact testedcommit.

Evidence must record:

Stable control/test ID.

Requirement.

Commit SHA.

Environment/build identifier.

Command or manual procedure.

Start/end time.

Tool/version.

Result.

Artifact path and SHA-256 hash where practical.

Reviewer and review state where required.

Related finding, stop condition, or exception.

Do not include:

Real or plausible PHI.

Secrets, tokens, cookies, credentials, raw environment values, or internalURLs.

Full request/response bodies.

Source maps containing sensitive paths.

Raw client serialization.

Usernames or workstation-specific paths when a generic reference suffices.

19.2 Evidence manifest

Create:

docs/task-03/evidence/manifest.json

Use the Task 11 schema if available. Otherwise include at minimum:

schemaVersion

taskId

capabilityId

commitSha

generatedAt

syntheticEnvironmentId

fixedClockId

timezone

task01EvidenceRef

task02StatusRef

task11ReviewRefs

controls

tests

artifacts

findings

stops

productionInvariance

approvals

Manifest entries must use repository-relative artifact paths and hashes. Do notmark missing artifacts as passed.

19.3 Requirement-to-evidence matrix

Create:

docs/task-03/requirement-evidence-matrix.md

Map every:

Stable control.

Acceptance criterion.

Mandatory test group.

Deliverable.

Stop condition encountered.

Each row must contain status and evidence. NOT RUN, BLOCKED, andNOT APPLICABLE require a reason.

19.4 Screenshot rules

Use generic filenames such as mobile-default.png anddesktop-partial-failure.png.

Keep the visible synthetic banner in frame where practical.

Do not encode subject, item, pharmacy, medication, or clinical facts in thefilename.

Capture only the browser content needed for evidence.

Exclude developer tools, notifications, other tabs, bookmarks, OS accountnames, and unrelated desktop content.

Record viewport, zoom, color scheme, and reduced-motion setting.

20. CI and Task 11 Gate Contract

Where Task 11 is implemented, add Task 03 checks to its stable required jobs.At minimum, the gate must include:

Formatting/lint/type checks required by the repository.

Pure unit/component/route tests.

Task 03 architecture-boundary tests.

Tenant/filter tests.

Fixture-isolation and network-denial tests.

Client-bundle/hydration leakage scan.

Production fixture-import denial.

Protected-cache and browser-storage tests.

Automated accessibility checks.

Determinism checks.

Production-invariance checks.

Evidence-manifest validation.

Rules:

Required checks use stable names.

A skipped required check fails the gate.

CI artifacts contain only synthetic and payload-free evidence.

Findings identify a remediation owner.

Security, privacy, tenant, PHI-boundary, production-isolation, and criticalaccessibility controls are non-waivable for prototype PASS.

An exception cannot be approved by the implementation author alone.

A green CI run does not authorize production integration.

21. Production Integration Boundary

Create:

docs/task-03/production-integration-handoff.md

The handoff is a proposal only.

21.1 Required future source contracts

For each queue family, identify:

Authoritative service.

Authorization method.

Tenant-pinning method.

Data classification and minimum necessary fields.

Read consistency/freshness semantics.

Pagination and ordering.

Timeout and partial-failure behavior.

Idempotency/reconciliation behavior where relevant.

Audit expectations.

Retention and caching expectations.

Source owner.

Required approvals.

Do not invent an endpoint, table, event, or production field as though italready exists.

21.2 Required future gates

Production connection remains blocked until:

Task 01/Task 03 synthetic evidence is complete.

Task 02 is PASSED where assessment/claim boundaries are involved.

Task 05 or the current identity/authorization boundary is verified.

Source contracts are approved by their owners.

Tenant and role tests pass server-side.

Minimum-necessary PHI fields are approved.

Privacy/data-flow review is approved.

Security threat-model findings are closed.

Accessibility evidence passes.

Task 11 checkpoint-2 promotion review passes.

Rollout cohort, kill switch, monitoring, rollback, owner, and review date arerecorded.

21.3 Forbidden future shortcuts

Never:

Connect the UI directly to database tables from the browser.

Accept pharmacy scope from a filter.

reuse fixture types as a silent production adapter;

infer display order from clinical fields;

treat client hiding as authorization;

expose raw integration errors;

let the dashboard update clinical, assessment, prescription, dispensing,billing, claim, message, or fulfilment state;

enable all queues because one source contract passed.

Each production queue source must be approved and released independently.

22. Deliverables

Use repository conventions where they exist and record resolved paths.

docs/task-03/current-state-and-gap-analysis.md

docs/task-03/information-architecture-and-wireframes.md

docs/task-03/server-data-contracts.md

docs/task-03/role-action-matrix.md

docs/task-03/failure-state-catalogue.md

docs/task-03/threat-model-and-data-flow.md

docs/task-03/accessibility-and-responsive-evidence.md

docs/task-03/production-integration-handoff.md

docs/task-03/requirement-evidence-matrix.md

docs/task-03/evidence/manifest.json

Synthetic Today implementation in the Task 01-approved location.

Deterministic server-owned fixture manifest and required scenarios.

Component, route, authorization, scope, architecture, privacy, leakage,failure, accessibility, determinism, and production-invariance tests.

Mobile and desktop evidence in the established artifact location.

Updated capability/task status and repository documentation.

Do not create empty placeholder deliverables and mark them complete.

23. Out of Scope

Real patient, pharmacist, pharmacy, assessment, claim, prescription,appointment, message, inventory, fulfilment, or integration data.

Production queue aggregation.

Production mutations or server actions.

Clinical urgency, risk scoring, diagnosis, triage, treatment, prescribing,dispensing, substitution, billing, reimbursement, or claim logic.

AI-generated priority or queue reasons.

Real appointments, messaging, reminders, fulfilment, delivery, automation, orgovernance workflows.

New production roles or permissions.

Live vendor, model, analytics, monitoring, or network integration.

Applying or altering Task 02 migrations.

Production release or hosted preview without separate approvals.

Legal, clinical, privacy, or professional-policy decisions.

Document adjacent needs; do not implement them under Task 03.

24. Prototype Acceptance Criteria

The synthetic prototype is complete only when:

The implementation runs only in the Task 01-approved synthetic environment.

Production imports, data, identity, network, credentials, and integrationsremain unreachable.

A pharmacist can identify the next permitted non-destructive action withoutopening every item.

All six workload families are represented.

Every item displays source, absolute time, operational state, freshness, andexplainable reason.

Needs pharmacist review and Blocked are explicit text states.

Operationally overdue is not presented as clinical urgency.

No label implies diagnosis, treatment, safety, prescribing, dispensing,coverage, billing eligibility, or claim outcome.

Display order comes from explicit server/fixture metadata.

The client does not calculate clinical or patient-based rank.

Filters cannot select, alter, or broaden pharmacy scope.

Actor, role, and pharmacy scope remain server derived.

Unknown roles, states, reasons, actions, and filters fail closed.

Failed sources are not displayed as empty.

Stale and partial data are visibly qualified.

Full patient/queue records and PHI-rich objects do not reach clientcomponents, bundles, or hydration.

URLs, page titles, caches, browser storage, analytics, telemetry, logs,referrers, and evidence contain no sensitive data.

Prototype destinations are accessible where appropriate butnon-operational.

Production mutations and external effects remain absent.

Empty, filtered-empty, loading, refreshing, stale, partial-failure,total-failure, blocked, denied, expired, and unknown states are usable.

Fixed time and timezone behavior is deterministic.

The interface works at 375px and desktop.

Frequent one-handed actions meet the 56px target requirement.

Keyboard, screen-reader, focus, zoom, reflow, contrast, reduced-motion, andlong-text requirements pass.

Tests and evidence are reproducible and contain only synthetic data.

Production routes, bundles, schema, auth, deployment, and required checksremain invariant.

Every control and criterion maps to evidence from the tested commit.

Task 02 production integration remains blocked unless separately approved.

Task 11 review and release boundaries remain intact.

PASS means only that the synthetic Task 03 prototype meets this specification.It does not approve production data, clinical use, a pharmacist workflow,professional policy, privacy compliance, or production release.

25. Agent Completion Procedure

Before reporting completion:

Re-read applicable instructions and confirm no scope expansion.

Review the working tree and separate unrelated changes.

Run every required focused and regression check.

Confirm required checks were not skipped.

Validate the evidence manifest and artifact hashes.

Scan evidence and builds for secrets, PHI-like values, and fixture leakage.

Confirm production invariance.

Update requirement-to-evidence status.

Record open findings, stop conditions, owners, and next actions.

Confirm Task 02 remains unmodified.

Confirm no production mutation, data source, vendor, or external effect wasenabled.

Produce the final report exactly as specified below.

If evidence is incomplete, report BLOCKED or FAIL; do not describe the taskas substantially complete.

26. Final Report Format

End the task with:

Task 03 synthetic prototype status: PASS | BLOCKED | FAIL

Repository baseline: PASS | BLOCKED
Applicable instructions: PASS | BLOCKED
Task 01 synthetic environment: READY | BLOCKED | NOT VERIFIED
Task 01 evidence reference: VALUE | NONE
Task 02 production gate: PASSED | BLOCKED | NOT VERIFIED
Task 11 checkpoint 1: APPROVED | BLOCKED | NOT VERIFIED
Task 11 checkpoint 2: APPROVED | BLOCKED | NOT REQUESTED | NOT VERIFIED
Current-state and gap analysis: PASS | FAIL
Information architecture: PASS | FAIL
375px wireframe: PASS | FAIL
Desktop wireframe: PASS | FAIL
Synthetic implementation: PASS | FAIL
Fixture determinism and isolation: PASS | FAIL
Six queue families: PASS | FAIL
Queue/state coverage: PASS | FAIL
Ordering/provenance model: PASS | FAIL
Server/client PHI boundary: PASS | FAIL
Tenant and filter pinning: PASS | FAIL
Role/action matrix: PASS | FAIL
Failure-state catalogue: PASS | FAIL
Threat model and data flow: PASS | FAIL
Privacy and leakage controls: PASS | FAIL
Protected cache/referrer controls: PASS | FAIL
Accessibility evidence: PASS | FAIL
375px responsive evidence: PASS | FAIL
One-handed 56px evidence: PASS | FAIL
Keyboard/screen-reader evidence: PASS | FAIL
200%/400% reflow evidence: PASS | FAIL
Reduced-motion evidence: PASS | FAIL
Automated tests: PASS | FAIL
Production-invariance tests: PASS | FAIL
Evidence manifest: PASS | FAIL
Requirement-evidence matrix: PASS | FAIL

Real PHI used: NO
Production data connected: NO
Production authentication changed: NO
Production authorization changed: NO
Production schema or migrations changed: NO
Production mutations enabled: NO
Production vendor or network connected: NO
External messages or actions sent: NO
Clinical ranking added: NO
Clinical, prescribing, billing, or claim logic added: NO
Prototype fixtures available in production: NO

Blocking issues:
Stop conditions triggered:
Unresolved product decisions:
Unresolved pharmacist/professional decisions:
Unresolved privacy/security decisions:
Unresolved accessibility decisions:
Deferred production work:
Evidence locations:
Files changed:
Tests run and results:
Production-invariance result:
Recommended next action:

Never report PASS when a mandatory prototype criterion, non-waivable control,or required test is missing.

If the prototype passes while Task 02 remains unresolved, use:

Task 03 synthetic prototype: PASS — production data integration, mutations,clinical effects, and external integrations remain blocked.