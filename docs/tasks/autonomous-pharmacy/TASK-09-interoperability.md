Task 09 — Production-Grade Authenticated Interoperability and Reviewed System Handoff

## Next-sprint checkpoint — 2026-08-10

**Repository state:** `BLOCKED` from enablement; `/api/fhir` remains a disabled
`403` scaffold and no consumer or endpoint is approved.
**Sprint slice:** standards analysis and persisted-final-snapshot export,
consumer, consent, endpoint, credential, and acknowledgement contracts only.
**Exit:** every interop route stays disabled, allowlists stay empty, and export
never recomputes clinical or billing logic. No live conformance or external
handoff is authorized. See
[`NEXT-SPRINT-PLAN-2026-08-10.md`](NEXT-SPRINT-PLAN-2026-08-10.md).

Version: 3.0Supersedes: Task 09 v2Date: 2026-07-30System: AgentRxOwner profile: senior integration/platform engineerRequired reviewers: security/privacy reviewer, QA engineer, pharmacist reviewer, and Task 11 release authorityPriority: P2; production-blocking for any interoperability capabilityStatus: repository discovery, standards analysis, schemas, and synthetic conformance work may begin within the gates belowProduction authorization: noneRequired end state: every production interoperability route, including /api/fhir, remains fail-closed and returns the approved disabled response; no live consumer, vendor, HNS, dispensing, claim, or clinical-record effect is enabled

Mission

Build a production-quality but disabled-by-default interoperability capabilitythat can:

Expose a narrowly profiled, authenticated, minimum-necessary,read-only clinical export to an explicitly approved consumer.

Produce a reviewed draft handoff for a pharmacy or dispensing systemwithout creating clinical, dispensing, prescribing, billing, adjudication, orclaim finality.

Validate every outbound artifact and every inbound acknowledgement attransport, FHIR/profile, terminology, business, authorization, tenant, andconsent-policy layers.

Preserve immutable source fidelity and provenance.

Survive duplicate delivery, timeout, replay, reordering, partial failure,revocation, credential rotation, vendor outage, and uncertain outcomes.

Produce commit-bound, machine-checkable evidence for a future per-consumerrelease decision.

The task is complete when the production-candidate design and syntheticimplementation are defensible, not when a route is enabled. A successful taskends with production interoperability still disabled.

The pharmacy system remains authoritative for dispensing and claim submission.The existing AgentRx assessment and claim services remain authoritative fortheir records. Task 09 does not submit to HNS and does not authorize anyexternal system to mutate AgentRx clinical, assessment, evidence, claim, audit,or retention state.

Use the attached deep-research report as product-planning context. Itscontrolling boundary applies here: AgentRx is a documentation, workflow, andclinician-handoff system with explicit human accountability, visibleprovenance, conservative safety controls, and strong privacy boundaries. Thereport does not replace repository behavior, an approved consumerspecification, official standards, pharmacist judgment, privacy/legal review,or Task 11 release evidence.

The safest valid result is sometimes BLOCKED. Never weaken a boundary, inventa vendor contract, infer consent, or enable a route to produce a demo or aPASS.

1. Binding Agent Execution Contract

1.1 Instruction precedence

Before taking task actions, the implementation agent MUST read completely:

The nearest applicable AGENTS.md, including parent-scope instructions.

PROJECT_OVERVIEW.md, if present.

EXPERIMENTAL_SANDBOX.md, if present.

AUTONOMOUS_PHARMACY_ROADMAP.md, if present.

The final reports and evidence references for Tasks 01, 02, 04, 05, 08, and11 where those tasks exist or are required by the workstream.

Repository package, build, test, migration, authentication, authorization,audit, deployment, and release configuration relevant to Task 09.

This specification.

Apply instructions in this order:

Platform and workspace safety rules.

Applicable AGENTS.md.

Explicit written approval for the exact action, environment, endpoint,consumer, scope, commit, and credential class.

This Task 09 specification.

Existing repository conventions.

Agent implementation judgment.

If requirements conflict, follow the stricter higher-priority requirement andtrigger S00 when the conflict prevents safe continuation. Do not silentlyselect the more permissive interpretation.

This document is a work specification. It is not permission to:

Access production PHI.

Use production credentials.

apply a production migration;

change production authentication;

contact an external endpoint;

register a vendor client;

disclose information;

enable /api/fhir;

create a prescription, dispensing event, payment, claim, or HNS submission;

deploy or promote code.

1.2 Requirement language

The terms MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT,SHOULD, and MAY are binding.

MUST / SHALL / REQUIRED — release-blocking.

MUST NOT / SHALL NOT — prohibited.

SHOULD — expected unless a documented repository constraint prevents it.

MAY — optional and non-authorizing.

Unknown, missing, stale, malformed, or unverified state MUST fail closed.

1.3 Authorized activity by default

Without any Task 09 approval, the agent MAY:

Inspect the repository read-only.

Record the current commit, working-tree state, migration head, dependency-lockidentity, and production-gate configuration without revealing secrets.

Run existing safe local checks.

Produce current-state, gap, authority, standards, threat-model, and proposedchange documents.

Inspect public primary standards sources.

Draft schemas, contracts, test plans, and deterministic synthetic fixturesthat cannot execute.

The agent MAY implement synthetic code only when:

Task 01 is verified ready for the required synthetic environment.

G1 is granted.

Task 11 pre-implementation test-plan review is passed or explicitly recordedas an unresolved bootstrap dependency under the rules in §3.

No production module, live data source, live credential, or external networkendpoint is required.

The agent MUST NOT contact any vendor or consumer endpoint, including asandbox or test endpoint, without G4 for that exact endpoint and credentialhandling.

The agent MUST NOT enable a production data path under this task. G5 isoutside the authorized execution scope.

1.4 Agent operating rules

The agent MUST:

Inspect before editing. Do not assume the framework, package manager,database, queue, FHIR library, validator, identity provider, hosting platform,or CI provider.

Preserve unrelated user changes and stop if they overlap protected Task 09surfaces in a way that cannot be safely reconciled.

Reuse repository architecture and test tooling unless a documented gap andapproved design require an additive component.

Make the smallest change that satisfies the approved design.

Add the enforcement test with the enforcement control.

Use deterministic, unmistakably synthetic fixtures only.

Keep all live endpoint allowlists and credential allowlists empty unlessexplicitly approved.

Derive actor, tenant, pharmacy, consumer, subject, purpose, and authorizationfrom authenticated server context and approved server-owned records.

Treat tokens, OAuth scopes, FHIR profiles, consent records, and possession ofan identifier as necessary inputs where applicable, never as sufficientauthorization by themselves.

Preserve the existing assessment, claim, audit, retention, identity, andtenant authorities.

Validate after final serialization as well as before domain conversion.

Record all skipped, cancelled, flaky, stale, not-selected, and unavailablechecks as NOT RUN or BLOCKED, never PASS.

Bind every evidence claim to the exact source commit, build, configuration,schema/migration head, package lock, fixture version, and environment class.

Keep logs, telemetry, traces, dashboards, screenshots, test output, andevidence free of PHI, secrets, payload bodies, raw URLs, and reusablecredentials.

Continue independent safe work when one gated consumer or workstream isblocked.

Leave the ordinary AgentRx pharmacist workflow usable when interoperabilityis disabled, degraded, killed, or unavailable.

The agent MUST NOT:

Infer approval from access, credentials, a prior conversation, an existingvendor account, a green build, or silence.

Invent an implementation guide, FHIR profile, terminology binding, consentrule, retention period, data-sharing authority, vendor acknowledgementmeaning, or professional workflow.

Treat base FHIR conformance as proof of authorization, privacy compliance, orbusiness correctness.

Treat a Zod/JSON schema check as the sole FHIR conformance validator.

Claim exactly-once external delivery.

Retry an uncertain external outcome blindly.

Put PHI, subject identifiers, query criteria, tokens, or room/consumer secretsin URLs, logs, metrics, trace baggage, analytics, browser storage, evidence,filenames, or notification content.

Accept a client-supplied role, tenant, pharmacy, patient, consumer, purpose,consent, or finalized-state claim.

Let a webhook, HTTP success, transport acknowledgement, delivery receipt,vendor completion event, or reconciliation action create clinical or fiscalfinality.

Use a browser-held client secret or expose server-to-server credentials to aclient component.

Add a generic network proxy, arbitrary callback URL, arbitrary destination,open redirect, or user-controlled vendor endpoint.

Enable FHIR batch, transaction, history, _include, _revinclude,$everything, bulk export, write interactions, or wildcard scopes unless afuture per-consumer approval explicitly names them.

Remove PHARMACIST REVIEW REQUIRED or add/modify a clinical code map withoutG2.

Apply a production schema or authentication change under this task.

Weaken Task 01, Task 02, Task 05, Task 08, or Task 11 controls.

1.5 Closed execution loop

For every bounded change:

Inspect — locate the current authoritative service, route, policy,database, adapter, and test convention.

Baseline — record commit, worktree, configuration identity, migrationhead, route behavior, and current tests.

Specify — write the invariant, trust boundary, allowed inputs, allowedoutputs, and safe failure.

Gate — verify the action is permitted and quote the exact approval whererequired.

Red — add or identify a controlled synthetic test that demonstrates themissing or violated control.

Implement — make the smallest in-scope change.

Green — run the narrow test, affected suite, and root-required gates.

Adversarial — test wrong actor, tenant, pharmacy, subject, consumer,scope, purpose, profile, version, consent, status, duplicate, replay, race,timeout, outage, and kill-switch paths as applicable.

Conformance — validate exact serialized artifacts using the pinnedvalidator and implementation-guide packages.

Evidence — hash and register sanitized evidence against the exactcapability version.

Review — obtain the applicable Task 11 evidence review.

Contain — confirm production remains disabled and no external effectoccurred.

Do not leave security tests, failure recovery, evidence, or rollback until theend.

2. Definitions and Authoritative Boundaries

2.1 Definitions

Term

Binding meaning

Consumer

One specifically identified external organization/system instance approved to receive a specifically bounded data flow. A vendor name alone is not a consumer identity.

Consumer profile

The versioned per-consumer record that binds purpose, environment, endpoint, authentication, scopes, tenant/pharmacy coverage, data minimum, FHIR version, implementation guide, operations, acknowledgement semantics, agreements, and release state.

Interoperability route

Any API, worker, export, callback, webhook, file-transfer, or adapter surface that can move or expose data across a trust boundary.

Read-only clinical boundary

A boundary in which the consumer cannot create, update, patch, delete, complete, or otherwise mutate AgentRx clinical, assessment, evidence, claim, audit, or retention records.

Export snapshot

An immutable, versioned representation of an authorized finalized source record prepared for one approved purpose and consumer profile.

Draft handoff

A reviewed advisory transfer that a pharmacy system may accept for human review. It is not a prescription, dispensing authorization, professional check, release, adjudication, or claim submission.

Transport acknowledgement

Evidence that bytes or an event reached a transport or endpoint. It says nothing about semantic acceptance or professional action.

Business acknowledgement

A consumer-defined, validated status that the handoff was accepted, rejected, duplicated, or queued for review. It still creates no clinical or fiscal finality in AgentRx.

Uncertain outcome

A state in which AgentRx cannot prove whether the consumer accepted or processed the transmission. It requires reconciliation before another potentially duplicating effect.

Reconciliation

A controlled process that resolves local and consumer state without inventing, overwriting, or silently inferring an external outcome.

FHIR conformance

Conformance to one pinned FHIR version, approved implementation guide/profile set, terminology package set, capability declaration, and interaction contract. “Valid JSON” is not FHIR conformance.

Consent authority

The approved internal policy and record that authorizes or denies a disclosure for a recipient, purpose, scope, and time. A FHIR Consent representation is not automatically the legal source of truth.

Provenance

Who, what, when, source, and transformation history for an exported artifact. It is distinct from security audit.

Security audit

Append-only evidence of access, authorization, disclosure, configuration, and integration actions for security/privacy review.

Production

Any environment, data source, identity, credential, endpoint, domain, build, queue, storage, vendor, or workflow capable of serving a real user or creating an operational effect.

Synthetic harness

A deterministic, server-owned, network-denied test system using no real people, organizations, credentials, endpoints, or records.

Fail closed

Deny startup, access, export, transition, send, retry, acknowledgement, disclosure, or promotion on missing, stale, malformed, unsupported, unverified, or unknown state.

2.2 Authoritative systems

Decision or fact

Authority

Task 09 may do

Task 09 must not do

Actor identity and session

Task 05 identity service

Consume verified server context

Reconstruct identity from request fields

Tenant/pharmacy scope

Task 05 authorization and tenant policy

Enforce a narrower consumer scope

Broaden or infer scope

Assessment completion

Task 02 assessment service

Export a persisted finalized snapshot

Complete or alter an assessment

Red-flag result

Existing deterministic rules and approved references

Preserve the persisted result

Recompute or reinterpret it

Claim draft

Task 02 claim-draft service and approved references

Transfer a labeled persisted draft where separately approved

Create, recompute, submit, or adjudicate a claim

Prescription validity

Authorized pharmacy professional and pharmacy system

Create a review draft only where approved

Assert validity

Dispensing, substitution, professional check, counselling, and release

Accredited pharmacy personnel and pharmacy system

Receive bounded non-authoritative status for reconciliation

Perform or infer the professional action

HNS submission and payer outcome

Existing approved pharmacy/billing systems

None under this task

Submit or claim payment

Consent/legal authority

Approved Task 04/privacy policy and custodian record

Enforce current approved authority

Invent implied/express-consent rules

Consumer identity and agreement

Approved integration registry and executed documents

Pin the exact consumer profile

Trust a URL, token subject, or vendor name alone

FHIR version/profile/terminology

Approved per-consumer standards decision

Implement the pinned package set

Use “latest,” silently coerce, or guess

Audit immutability

Existing audit service/database controls

Add safe event types through the authoritative path

Rewrite or delete audit history

Retention/legal hold

Existing approved retention service/policy

Attach approved class/trigger metadata

Invent a retention period or bypass a hold

Release/promotion

Task 11 control plane and named authorities

Produce evidence

Self-approve or enable

2.3 Supported exchange patterns

Task 09 defines three separate patterns. They MUST NOT be collapsed into onegeneric adapter:

Consumer pull / read-only export

An authenticated consumer reads an approved immutable export snapshot.

The consumer cannot write to AgentRx clinical records.

The route supports only explicitly allowlisted resources, profiles,operations, and search parameters.

AgentRx push / reviewed draft handoff

AgentRx transmits one approved draft envelope through a per-consumeradapter.

The external effect is limited to creating or updating a consumer-sidereview item only where the consumer contract proves that meaning.

No acknowledgement creates professional or fiscal finality.

Inbound acknowledgement/status

External traffic enters an integration inbox.

It is authenticated, bounded, persisted, deduplicated, validated, andprocessed asynchronously.

It can update only Task 09 transport, acknowledgement, or reconciliationstate.

It cannot directly write Task 02, Task 05, Task 08, clinical, dispensing,audit-history, billing, or claim state.

2.4 Non-negotiable invariants

Production is disabled by default.

Missing or unknown release state is disabled.

/api/fhir remains disabled in production at task end.

All external endpoint allowlists are empty by default.

A route gate is enforced at the outer route and at the domain/serviceboundary.

Authentication is required on every data route.

Authorization is server-derived and evaluated on every access or disclosure.

Tenant, pharmacy, consumer, subject, purpose, data minimum, finality, consentauthority, and release stage are separate gates.

Consent does not replace authorization.

OAuth scope does not replace authorization.

FHIR profile conformance does not replace authorization.

A resource identifier, handoff identifier, URL, or correlation key grants noauthority.

Only finalized, persisted source snapshots can export.

Export never recomputes clinical or claim content.

Every exported field is allowlisted for that consumer and purpose.

A request exceeding the approved data minimum is denied, not silentlyover-served.

A response or acknowledgement is not trusted until all validation layers pass.

A timeout is not a failure proof and not a success proof.

An HTTP 2xx is not business acceptance.

Business acceptance is not pharmacist approval.

Vendor “complete” is not assessment completion.

A draft handoff is not a valid prescription, dispensing release, claim, or HNSsubmission.

No external event creates clinical or fiscal finality.

Disclosed data cannot be “rolled back”; corrections use a new, linked,auditable supersession or reconciliation workflow.

All production-facing behavior is killable without disabling the normalpharmacist workflow.

3. Dependencies, Gates, and Coordination

3.1 Dependency register

The agent MUST create docs/task-09/dependency-and-approval-register.md andrecord each dependency as VERIFIED, BLOCKED, NOT PRESENT, orNOT APPLICABLE.

Dependency

Required for

Minimum evidence

Task 01

Any synthetic executable or fixture

Synthetic environment identity, network denial, production import denial, fixture policy, evidence reference

Task 02

Export of assessments, evidence, or claim drafts

Verified authoritative source contract, finalized-state rules, immutability/fidelity evidence, claim boundary

Task 04

Any consent-dependent disclosure

Approved consent authority, purpose/scope/recipient/time model, revocation behavior, policy version

Task 05

Every authenticated route or consumer service identity

Separate actor/subject domains, tenant and pharmacy pinning, revocation, role policy

Task 08

Dispensing-system draft handoff or fulfilment status

Reviewed-draft boundary, professional authority, status semantics, claim boundary

Task 11

Implementation gate, CI, evidence, release stages, kill switch, promotion

P0 control plane or documented bootstrap status, pre-implementation review, evidence profile, promotion review

Rules:

A dependency is verified only from its final report and referenced evidence,not from a filename or claimed status.

Verify the exact capability used, not the whole task name.

If a dependency is absent, complete independent design work and block onlythe affected implementation or promotion.

Task 10 is not a dependency. No AI or model call is permitted in Task 09.

Task 07 is used only if a future approved design creates generic staffnotifications. Integration failures MUST remain visible in the authenticatedoperations queue even when Task 07 is unavailable.

3.2 Approval gates

Approval is a current written fact, not an inference. Every approval record MUSTname:

Gate.

Exact task and capability version.

Exact source commit or clearly bounded pre-commit design scope.

Consumer and environment where applicable.

Endpoint where applicable.

Data classes and purpose.

Permitted operations.

Conditions.

Approver identity and authority.

Decision time.

Expiry/review date.

Verbatim decision.

Gate

Decision

Authority

Blocks

G1 — Design and test-plan approval

Approve current-state analysis, authority matrix, trust boundaries, standards/profile decision, threat model, data minimum, proposed schema, route surface, tests, and change manifest

Product/engineering lead plus security/privacy reviewer; Task 11 checkpoint 1

Executable implementation beyond inert schemas and fixtures

G2 — Clinical/terminology mapping approval

Approve exact code systems, versions, mappings, semantics, and removal of any review marker

Reviewing pharmacist plus applicable clinical/reference-data owner

Any enabled use of an unapproved clinical map or removal of PHARMACIST REVIEW REQUIRED

G3 — Per-consumer governance and procurement approval

Approve purpose, custodian/agent roles, consent policy, PIA, TRA, data-sharing agreement, vendor/subprocessor review, residency, retention, accessibility, and incident obligations for one consumer and scope

Privacy/legal/procurement plus applicable custodian authority

Any real-data flow to that consumer

G4 — Exact external non-production connectivity approval

Approve one named non-production endpoint, DNS/TLS identity, credentials class, egress path, test data class, support owner, expiry, and teardown

Engineering lead plus security/privacy and vendor owner

Any network contact with a vendor or consumer, including test/sandbox

G5 — Per-consumer production enablement

Approve exact capability version, endpoint, consumer, tenant/pharmacy cohort, data minimum, operations, evidence manifest, SLOs, kill switch, rollback/forward-fix, support, and expiry

Task 11 release authority plus all required professional/privacy/security/legal/product/operations authorities

Any production route or real external effect

G5 is not requested or exercised by this task.

3.3 Gate behavior

An approval for one consumer does not approve another.

An approval for test does not approve production.

An approval for pull does not approve push.

An approval for one FHIR profile, field set, purpose, pharmacy, or tenant doesnot approve another.

An approval for one endpoint does not approve redirects, aliases, new DNSresults, regional endpoints, or webhook destinations.

An approval expires on its recorded date.

A material change triggers re-evaluation under §25.

The implementation author cannot self-approve security, privacy,accessibility, professional, or production promotion.

A green test suite is evidence, not approval.

3.4 Task 11 coordination

Before implementation, Task 11 checkpoint 1 MUST review:

Stable Task 09 controls.

Threat model.

Test plan.

Synthetic isolation.

Required CI jobs.

Evidence profile.

Proposed migration and rollback/forward-fix plan.

Before any stage promotion, Task 11 checkpoint 2 MUST review:

Exact capability version.

Evidence-manifest hash.

Open findings and exceptions.

Required approvals.

Kill-switch and rollback rehearsal.

SLO/error-budget status.

Consumer-specific dependencies.

If Task 11 is not yet fully implemented:

Task 09 may complete safe analysis and synthetic design.

It may implement synthetic code only if the stricter applicable repositoryand Task 01 controls plus G1 are present.

It MUST create Task 11-compatible evidence.

It MUST NOT self-approve or promote.

Production readiness remains BLOCKED.

4. Mandatory Stop Conditions

Stop the affected workstream, preserve sanitized evidence, continue onlyindependent safe work, and report the stop ID.

S00 — Instruction conflict: applicable instructions conflict or a requiredauthority document is missing.

S01 — Unsafe repository state: unrelated changes overlap protectedsurfaces and cannot be preserved safely.

S02 — Dependency unverified: a required Task 01, 02, 04, 05, 08, or 11boundary cannot be verified.

S03 — Production identity unknown: the target environment, route,database, credential class, or deployment cannot be unambiguously classified.

S04 — Unauthorized production probe: a live route probe would requireauthority not explicitly granted.

S05 — Production enablement risk: a change could make a production routeserve data or contact an external system under this task.

S06 — External endpoint required: implementation requires a vendor orconsumer endpoint without G4.

S07 — Live credential required: a synthetic or local test requires a realcredential, certificate, secret, client registration, or token.

S08 — Real data required: meaningful progress appears to require real,redacted, de-identified, pseudonymized, copied, or production-derived data.

S09 — Consumer identity ambiguous: the legal/technical recipient or itsenvironment cannot be pinned exactly.

S10 — Missing vendor specification: acknowledgement, idempotency,callback, retry, data-field, or failure semantics would need to be guessed.

S11 — Standards profile unresolved: FHIR version, implementation guide,profile, resource/operation allowlist, or terminology package is missing orconflicting.

S12 — Conformance validator unavailable: the selected profiles cannot bevalidated with a pinned, reproducible validator.

S13 — Unsupported semantics: the only available FHIR mapping would implyprescribing, dispensing, claim, or other finality not authorized here.

S14 — Clinical map unapproved: a review marker would be removed or aclinical/ICD mapping would change without G2.

S15 — Consent policy unknown: disclosure authority, purpose, recipient,scope, withdrawal, or timing would need to be invented.

S16 — G3 missing: real PHI would flow to a consumer without currentper-consumer governance approval.

S17 — Cross-jurisdiction unknown: residency, cross-border, custodian/agent,or disclosure authority is unresolved.

S18 — Authorization incomplete: actor, service identity, tenant, pharmacy,subject, consumer, purpose, scope, finality, or consent cannot be derived fromauthoritative server state.

S19 — Confused deputy risk: one consumer credential could access anotherconsumer, tenant, pharmacy, purpose, or data class.

S20 — Link or identifier authority: possession of a URL, identifier,correlation key, resource ID, or room/handoff reference is treated asauthorization.

S21 — URL leakage: the required protocol would put PHI, reusable tokens,sensitive search criteria, or unapproved identifiers in a URL, referrer, orshared cache.

S22 — Logging leakage: payloads, PHI, secrets, identifiers, consentcontent, or sensitive URLs would enter logs, traces, metrics, analytics,dashboards, screenshots, or evidence.

S23 — Browser secret: a server credential, private key, long-lived token,or privileged FHIR scope would be exposed to a browser/client component.

S24 — Arbitrary egress: a user, request, tenant, or untrusted vendor eventcan control the destination URL, redirect, DNS target, callback, or protocol.

S25 — External reference fetch: validating or rendering FHIR content wouldrequire fetching an untrusted external reference or narrative resource.

S26 — Unknown modifier semantics: an unsupported modifierExtension,profile, code, version, or reference would be ignored or coerced.

S27 — Unbounded exchange: batch, bulk, wildcard, include/revinclude,history, pagination, payload, attachment, or search behavior cannot be safelybounded.

S28 — Source fidelity unavailable: the export cannot be proven identicalto an approved persisted finalized snapshot.

S29 — External finality: an acknowledgement, webhook, transport event, orhandoff would create clinical, professional, dispensing, claim, HNS, orpayment finality.

S30 — Exactly-once assumption: safe behavior relies on an unverified claimof exactly-once external processing.

S31 — Uncertain outcome unsafe: a timeout or disconnect would be retriedwithout reconciliation and could duplicate an external effect.

S32 — Reconciliation impossible: the consumer provides no safe means toestablish or manually resolve uncertain status.

S33 — Race unsafe: revocation, kill, credential rotation, retry, webhook,or concurrent worker behavior can bypass the current gate.

S34 — Dead-letter leakage: failure handling requires retaining or showingpayload content outside an approved encrypted store.

S35 — Retention invented: payload, acknowledgement, audit, or disclosureretention would require the agent to invent a legal/professional period.

S36 — Audit weakened: required behavior would mutate, suppress, or deleteexisting audit history.

S37 — Production migration/auth change: a live schema, migration, identity,client-registration, or authentication change lacks separate approval.

S38 — Rollback fiction: a proposed rollback assumes an already disclosedexternal artifact can be erased or un-seen.

S39 — Kill switch ineffective: new work, queued work, retries, or directcalls can continue after the capability is killed.

S40 — Normal workflow coupled: disabling interoperability makes the normalpharmacist workflow unusable.

S41 — Required red evidence unavailable: a new critical control cannot bedemonstrated to fail safely when violated.

S42 — Required test/evidence contaminated: fixtures or evidence containreal or plausible PHI, secrets, production URLs, or reusable identifiers.

S43 — Required check unavailable: a non-waivable security, privacy,tenant, conformance, accessibility, or production-invariance check cannot run.

S44 — Blocking finding: a required test fails or an open finding violatesa non-waivable control.

S45 — Approval stale or mismatched: an approval or evidence item appliesto another commit, capability version, consumer, scope, endpoint, or date.

A stop is not automatically a task failure. Report BLOCKED for the affectedscope and complete safe independent phases.

5. Required Current-State and Gap Analysis

Create:

docs/task-09/current-state-and-gap-analysis.md

5.1 Repository discovery

Record:

Applicable instructions read.

Repository root and relevant workspaces.

Commit SHA.

Branch.

Clean/dirty state and overlapping user changes.

Package manager and lockfile identity.

Runtime and framework versions.

Test, lint, type, build, migration, and CI commands.

Database engine/version and migration head from approved local evidence.

Authentication and authorization entry points.

Tenant/pharmacy derivation.

Audit and retention services.

Existing integration/FHIR routes, methods, middleware, imports, and featureflags.

Existing /api/fhir behavior under production-like local configuration.

Existing adapters, outbox/inbox tables, workers, webhooks, dead letters, anddashboards.

Existing FHIR libraries, versions, validators, profiles, terminologypackages, and licenses.

Existing clinical mapping files and everyPHARMACIST REVIEW REQUIRED marker.

Existing tests and evidence coverage.

Existing deployment and network-egress controls.

Existing Task 11 capability/release entries.

Do not print environment-variable values, secrets, connection strings,credentials, certificates, tokens, production URLs, or PHI.

5.2 Baseline identity

Create one baseline record containing:

Source commit.

Working-tree digest/status.

Dependency-lock digest.

Migration-chain identity.

Configuration schema version.

Build identifier.

Route manifest hash.

Existing test results.

Existing disabled-gate result.

Fixed synthetic clock and fixture version.

If an authorized production probe is not explicitly granted, do not issue one.Record:

LIVE_PROBE: NOT AUTHORIZED

Always prove the production configuration locally or in approved CI:

Every method under /api/fhir is denied.

No capability metadata is disclosed.

No external adapter is reachable.

Missing/unknown flags remain disabled.

If a live probe is separately authorized, record only:

Approved route alias, not a secret/raw URL.

Method.

UTC time.

Status.

safe response class;

correlation reference.

Never capture a response payload, token, cookie, IP address, or server headerthat is not required for the denial proof.

5.3 Route and operation map

For every existing or proposed route, record:

Route template.

Methods.

Authentication middleware.

Authorization policy.

Consumer-profile lookup.

Tenant/pharmacy binding.

Supported FHIR/resource/profile version.

Data source.

Response fields.

Cache behavior.

rate and size limits;

client/server boundary;

release gate;

direct service entry point;

external effect;

audit event;

tests;

current status.

Unknown routes or operations are denied.

5.4 Data-source authority map

For every proposed exported field, record:

Domain meaning.

Source table/service.

Source field/version.

Source authority.

PHI classification.

Minimum-necessary purpose.

Consumer.

FHIR path or handoff field.

Transformation.

code system/version;

null/unknown behavior;

provenance;

review requirement;

retention class;

finality prerequisite.

Do not create a field because a FHIR resource permits it. Include it only whenthe approved purpose requires it and an authoritative source exists.

5.5 Gap classification

Classify every gap as:

MISSING_CONTROL

MISSING_TEST

MISSING_EVIDENCE

MISSING_STANDARD_DECISION

MISSING_VENDOR_SPEC

MISSING_DEPENDENCY

MISSING_APPROVAL

MISSING_OPERATIONAL_OWNER

OUT_OF_SCOPE

CONFLICT

Each gap requires:

Owner.

Severity.

Blocking stage.

Proposed resolution.

Approval needed.

Evidence needed.

Status.

5.6 Proposed change manifest

Before implementation, create:

docs/task-09/proposed-change-manifest.md

For each proposed file:

Repository-relative path.

Add/modify.

Purpose.

Protected boundary touched.

Migration or runtime impact.

Production-build impact.

External-network impact.

Tests.

rollback/forward-fix;

approval gate.

Any implementation change not in the approved manifest is BLOCKED until themanifest and review are updated.

6. Execution Sequence

Phases are ordered. A later phase MUST NOT make an earlier unresolved gateirrelevant.

Phase 0 — Inspect and contain

Complete §5.

Establish baseline identity.

Confirm production-disabled behavior in production-like local/CIconfiguration.

Verify dependencies.

Produce gap and change manifests.

Exit: repository state known; no production or external effect.

Phase 1 — Standards, authority, and threat contracts

Complete §§7–10.

Select or explicitly leave undecided each consumer’s FHIR and securityprofile.

Define data minimum, authority, and route/operation allowlists.

Create threat model, diagrams, schema proposal, and test plan.

Obtain G1 and Task 11 checkpoint 1 before executable implementation.

Exit: approved design or BLOCKED(G1).

Phase 2 — Controlled red tests and synthetic fixtures

Build deterministic Task 01 fixtures.

Add controlled negative/mutation cases for critical controls.

Prove external network denial.

Prove production imports and credentials are unreachable.

Exit: required red evidence captured without committing an unsafe runtime.

Phase 3 — Domain ledger, migration, and policies

Implement additive source migrations only in the repository.

Run fresh and upgrade-path migrations against isolated real PostgreSQL.

Add constraints, state-version checks, immutable snapshot behavior,outbox/inbox uniqueness, and authorization policies.

Do not apply a live migration.

Exit: database and policy tests pass.

Phase 4 — Conformance and export boundary

Implement pinned validator packages and package lock.

Implement per-consumer capability and operation allowlists.

Implement exact serialized-output validation.

Implement immutable finalized-only export against synthetic sources.

Keep production gate disabled.

Exit: conformance, fidelity, authorization, and leakage tests pass.

Phase 5 — Draft handoff, outbox/inbox, and reconciliation

Implement synthetic adapter interface only.

Implement transactional outbox, bounded worker, acknowledgement inbox,webhook verifier abstraction, dead-letter metadata, and reconciliation.

Implement no live vendor adapter.

Exit: duplicate, timeout, replay, race, reordering, outage, kill, anduncertain-outcome tests pass.

Phase 6 — Operations and accessible interfaces

Implement metadata-only staff queue and safe patient disclosure/historysurface only where approved.

Implement payload-free observability, SLO proposal, kill switch, incident,outage, credential-rotation, and reconciliation runbooks.

Capture accessibility evidence.

Exit: operational and accessibility controls pass.

Phase 7 — Full verification and handoff

Run IOP suite, root checks, production-invariance scans, migration tests,conformance validator, fuzz/boundary tests, and Task 11 evidence validation.

Confirm production remains disabled.

Produce mapping review package without approving it.

Produce per-consumer production enablement checklist without exercising it.

Exit: synthetic/conformance PASS, BLOCKED, or FAIL; production remainsdisabled.

7. Standards and Conformance Profile

Create:

docs/task-09/standards-profile-decision.md

docs/task-09/fhir-api-and-conformance-contract.md

docs/task-09/fhir-package-lock.json

7.1 Evidence basis

Use current primary sources and record access date/version. At minimum, evaluate:

HL7 FHIR RESTful API

HL7 FHIR security

HL7 FHIR Provenance

HL7 FHIR AuditEvent

HL7 FHIR Consent

SMART App Launch and Backend Services

OAuth 2.0 Security Best Current Practice, RFC 9700

Canadian FHIR Registry

Pan-Canadian FHIR Exchange / CA

Ontario Personal Health Information Protection Act, 2004

IPC Ontario digital-health overview under PHIPA

Current applicable Ontario Health and consumer-specific implementation guides.

These sources inform technical design. They do not decide the legal basis,professional scope, consent policy, or consumer contract.

7.2 Per-consumer standards decision

For each consumer, record:

FHIR release and exact version.

Implementation guide name, canonical URL, package ID, and version.

Resource profiles.

Extensions and modifier extensions.

Code systems, value sets, and terminology versions.

Interaction and operation allowlist.

Search parameter allowlist.

Content types.

Capability statement.

Authentication/security profile.

Vendor deviations.

Validation tools.

Conformance-test version.

Migration/compatibility strategy.

Owner and review date.

Never use latest as a package version. Never assume that a provincial orpan-Canadian profile applies merely because the consumer is in Canada.

If the consumer has no authoritative implementation guide:

Define a versioned AgentRx profile package only after G1.

Keep it minimal.

Mark it experimental.

Do not claim regional, provincial, national, or vendor conformance.

Production promotion remains blocked until the consumer accepts the contract.

7.3 Package lock

The package lock MUST contain:

FHIR base package.

Implementation-guide packages.

Terminology packages.

Validator identity and version.

Canonical URL.

package version;

integrity hash;

source;

license/status;

resolved dependency graph;

retrieval date;

review owner.

Validation in CI MUST use pinned local packages and MUST NOT fetch mutableprofiles or terminology from the network.

7.4 Capability declaration

Produce one CapabilityStatement per supported consumer-profile version.

It MUST declare only implemented and approved:

FHIR version.

formats;

resources;

profiles;

interactions;

search parameters;

operations;

security expectations;

implementation-guide references.

Rules:

Capability metadata does not authorize access.

The production-disabled outer gate MUST deny capability discovery unless afuture approved design explicitly allows safe metadata.

A declared capability MUST have a passing test.

An undeclared operation MUST be denied.

No generic CRUD or wildcard support.

7.5 Initial interaction policy

Unless a per-consumer decision explicitly approves otherwise:

Allow only application/fhir+json.

Deny XML.

Deny create, update, patch, delete, history, batch, transaction, GraphQL,custom operations, bulk data, subscriptions, and write-capable messaging.

Deny _include, _revinclude, _has, $everything, wildcard search,unbounded _count, and arbitrary sorting.

Deny client-selected _elements when it could bypass the approved dataminimum.

Deny arbitrary external references.

Deny unknown profiles, extensions, and modifier extensions.

7.6 Validation pipeline

Every outbound serialized artifact and inbound payload MUST pass, in order:

Transport envelope

Allowed method.

Allowed content type and charset.

Byte-size limit.

decompression limit;

encoding;

parser safety;

field/depth/count limits.

FHIR/base syntax

Selected FHIR version.

Resource type.

base invariants;

references;

primitive formats.

Profile/implementation guide

Required meta.profile.

cardinality;

slicing;

invariant;

extension and modifier-extension allowlist;

terminology bindings.

AgentRx business contract

Consumer profile.

tenant/pharmacy/subject match;

finalized state;

source snapshot;

data minimum;

purpose;

consent authority;

mapping review;

draft/advisory marker;

supported acknowledgement transition.

Authorization and release

Current service identity.

current credential state;

current release stage;

current cohort;

current kill state;

current approval validity.

No layer may silently repair, coerce, drop, or reinterpret unsupported clinicalcontent. Safe normalization of transport syntax, if any, MUST be explicit,tested, and incapable of changing meaning.

7.7 Typed schemas

Runtime TypeScript/Zod schemas MAY provide:

Fast boundary checks.

Typed domain conversion.

safe error classification;

stable internal contracts.

They MUST NOT be the sole proof of:

FHIR profile conformance.

terminology validity;

implementation-guide invariants;

business authorization;

clinical meaning.

Generated schemas MUST be pinned to the same package lock as the conformancevalidator.

7.8 Terminology and mapping

For every coded field:

Record code system canonical URL.

Version.

value set;

binding strength;

display provenance;

source license;

mapping owner;

review status;

unknown-code behavior.

Rules:

Unknown, inactive, ambiguous, or version-missing codes fail closed wheremeaning affects disclosure or handoff.

Display text is not a code.

No free-text-to-code inference.

No model-generated code.

No silent crosswalk.

No terminology-server network call in the synthetic harness.

The ICD-10/clinical map remains frozen unless G2 is granted.

Every PHARMACIST REVIEW REQUIRED marker remains visible and test-protected.

7.9 Narrative, reference, and document safety

Generate narrative only from trusted templates.

Do not render untrusted XHTML without approved sanitization.

Reject or safely strip unsupported active content without changing clinicalmeaning.

Do not dereference external URLs during validation or display.

References MUST resolve only through approved local or per-consumer rules.

Attachment URLs MUST NOT contain bearer tokens or PHI.

PDFs/documents MUST have bounded size/type, safe generation, minimal metadata,malware/content controls where applicable, and immutable digests.

Unsupported contained resources or references fail closed.

8. Threat Model, Trust Boundaries, and Data Flows

Create:

docs/task-09/trust-boundary-and-data-flow.md

docs/task-09/interoperability-threat-model.md

8.1 Required actors

Model:

Patient.

Authorized delegate, if applicable.

Pharmacist.

Pharmacy staff.

AgentRx application service.

AgentRx authorization/policy service.

AgentRx source-of-truth services.

Integration worker.

Validator.

Consumer service identity.

Consumer system.

Vendor operator.

AgentRx support/operations.

Privacy/security auditor.

Release authority.

Attacker with no credentials.

Attacker with stolen or over-scoped credentials.

Compromised consumer or webhook sender.

Misconfigured tenant or deployment.

8.2 Required assets

Model:

Source clinical/assessment records.

Finalized snapshots.

Claim drafts.

Consent authority.

Consumer profiles.

FHIR/profile packages.

Terminology packages.

Service identities and key references.

Access tokens and certificates.

Export payloads.

Handoff payloads.

Payload digests.

Outbox/inbox records.

Webhook receipts.

Acknowledgements.

Reconciliation cases.

Audit records.

Release registers.

Evidence.

Logs/metrics/traces.

8.3 Trust boundaries

At minimum:

Browser to AgentRx server.

AgentRx route to authorization/policy service.

Authorization service to authoritative source services.

Source services to snapshot/export builder.

Export builder to validator.

Validator to outbox.

Worker to approved egress boundary.

Egress boundary to consumer.

Consumer webhook to ingress boundary.

Ingress boundary to inbox/validator.

Inbox to Task 09 reconciliation service.

Task 09 to audit/observability.

CI/synthetic harness to production isolation boundary.

flowchart TD
  A["Authoritative AgentRx sources"] --> B["Policy + immutable snapshot"]
  B --> C["Profile validation + outbox"]
  C --> D["Approved consumer"]
  D --> E["Authenticated inbox"]
  E --> F["Reconciliation ledger"]
  F -. "No clinical or claim mutation" .-> A

The diagram is conceptual. Repository discovery decides actual componentboundaries.

8.4 Required threat cases

Model and mitigate:

Broken object-level authorization.

Cross-tenant or cross-pharmacy disclosure.

Consumer credential used for another consumer.

Client credential theft.

Token audience, issuer, subject, scope, expiry, or replay failure.

Key rotation race.

Stale authorization cache.

Stale consent or withdrawal race.

Purpose expansion.

Over-broad resource/profile/search request.

Identifier enumeration.

Existence and timing leakage.

PHI in FHIR GET query strings or access logs.

Shared/proxy/CDN cache disclosure.

Capability metadata leakage.

Browser credential exposure.

CORS misconfiguration.

CSRF where browser flows exist.

SSRF, DNS rebinding, private-address access, redirect escape, and protocolsmuggling.

TLS downgrade or hostname/certificate failure.

Profile/version downgrade.

Unknown/unsafe modifierExtension.

FHIR narrative XSS.

XML external entity or expansion if XML is ever approved.

External reference fetch.

Bundle/batch/transaction abuse.

_include, _revinclude, history, bulk, or pagination exfiltration.

Compression bomb, oversized payload, deep nesting, and parser exhaustion.

Malformed JSON/FHIR and validator denial of service.

Terminology drift and mapping ambiguity.

Export from draft/in-progress/withdrawn source.

Recalculation drift from authoritative snapshot.

Payload tampering between validation and send.

Duplicate send.

Duplicate acknowledgement.

Reordered acknowledgement.

forged webhook;

expired webhook timestamp;

webhook replay;

wrong environment/account/consumer webhook;

timeout with external success;

partial multi-item acceptance;

consumer outage;

local worker crash;

two workers claiming the same item;

dead-letter payload leakage;

reconciliation action inventing success;

vendor status creating professional finality;

kill switch not stopping queued/retry work;

production flag enabled without release record;

synthetic adapter imported in production;

production adapter imported in synthetic build;

evidence or screenshot leakage;

dependency/package compromise;

unreviewed profile or terminology package update.

For every threat, record:

Asset.

actor;

precondition;

attack/failure path;

impact;

preventive control;

detective control;

recovery;

stable control/test IDs;

residual risk;

owner.

9. Integration Inventory and Consumer Onboarding

Create:

docs/task-09/integration-inventory.md

docs/task-09/consumer-onboarding-and-offboarding-runbook.md

docs/task-09/vendor-assessment-scorecard.md

9.1 Master integration record

No integration work exists outside a versioned master record. One record perconsumer/environment MUST contain:

Opaque consumer ID.

Legal organization identity.

Technical system identity.

Environment.

Jurisdiction and residency.

custodian/agent/recipient roles;

purpose;

direction;

exchange pattern;

authoritative systems;

approved tenant/pharmacy cohort;

subject population;

data-class and field allowlist;

FHIR/profile/package versions;

operations and search parameters;

endpoint alias and approved exact endpoint reference;

DNS/TLS/certificate requirements;

authentication profile;

credential/key reference, never value;

token audience/issuer/scopes;

webhook profile;

acknowledgement meanings;

idempotency capability;

retry and rate limits;

reconciliation method;

SLO/support contacts;

outage behavior;

data-sharing agreement;

PIA/TRA;

vendor/subprocessor review;

accessibility evidence;

consent policy;

retention/hold/backup behavior;

incident obligations;

release stage;

kill switch;

owner and backup owner;

approval and expiry;

offboarding/data-return/destruction plan.

9.2 Endpoint safety

Endpoints are configured server-side from approved records.

Request input cannot select or alter an endpoint.

Redirects are disabled unless explicitly required and every redirect target isrevalidated against the same allowlist.

Resolve and validate scheme, hostname, port, DNS/IP class, certificate, andenvironment.

Deny loopback, link-local, private, metadata-service, Unix socket, file, FTP,and unsupported protocols unless a specific safe local synthetic harnessrequires loopback.

Pin egress to the consumer/environment identity.

An endpoint change disables the integration until re-approved.

Test and production credentials, keys, DNS names, queues, and data stores areseparate.

9.3 Authentication profile

Where the consumer supports SMART Backend Services:

Use the approved published version.

Prefer asymmetric private_key_jwt.

Use short-lived access tokens.

Validate issuer, audience, subject/client, signature algorithm, key ID,expiry, not-before, issued-at, and replay identifier as applicable.

Request only approved least-privilege scopes.

Keep private keys in approved server-side secret/key management.

Define rotation, overlap, revocation, and compromise behavior.

Where SMART does not apply:

Select an approved alternative based on the consumer specification and TRA.

OAuth 2.0 implementations MUST account for current RFC 9700 guidance.

Shared API keys or static bearer tokens require explicit risk acceptance andMUST NOT be used merely for convenience.

mTLS, DPoP, or other sender-constrained mechanisms are considered wheresupported and required by the threat model.

No authentication choice alone grants data access; §10 authorization stillapplies.

9.4 Onboarding conformance

Before a future consumer can progress past synthetic:

Verify exact endpoint identity.

Verify capability/configuration metadata where applicable.

Verify supported profiles and operations.

Verify authentication and key rotation.

Verify maximum payload and rate limits.

Verify idempotency behavior with controlled synthetic cases.

Verify transport and business acknowledgement semantics.

Verify replay and reordering behavior.

Verify outage and uncertain-outcome reconciliation.

Verify notification and support escalation.

Verify contract, PIA/TRA, residency, retention, accessibility, and incidentevidence.

Record deviations and blocking gaps.

No test endpoint is contacted without G4.

9.5 Offboarding

Define:

Disable new access.

Revoke/rotate credentials.

Stop and quarantine queued work.

Resolve in-flight/uncertain items.

Disable webhooks.

preserve required audit/evidence;

execute approved data-return/destruction;

verify backups/retention/holds;

update capability and release registers;

confirm no remaining route or egress authorization.

10. Identity, Authorization, Consent, and Purpose Contract

Create:

docs/task-09/identity-authorization-consent-and-purpose-contract.md

10.1 Server-derived access context

Every protected request or send decision MUST produce a server-owned context:

Environment.

Authenticated actor/service identity.

Identity type.

Credential/session version.

consumer;

tenant;

pharmacy;

subject;

source record;

purpose;

requested data class;

requested operation;

consumer profile/version;

release stage/cohort;

consent authority/version;

policy version;

correlation reference;

current time.

Client-supplied values may be used only as opaque lookup requests. They MUST bematched against the authoritative context before use.

10.2 Authorization gates

All applicable gates MUST pass immediately before disclosure or send:

Environment is approved.

Capability is enabled for the requested stage.

Global and consumer kill switches are clear.

Credential/session is valid and current.

Consumer identity matches the configured endpoint/account.

Tenant and pharmacy are approved for the consumer.

Subject is in the authorized tenant/pharmacy scope.

Actor/service is permitted for the operation.

Purpose is approved and current.

Resource/record is finalized and exportable.

Requested resource/profile/operation is allowlisted.

Requested fields are within the consumer data minimum.

Consent/legal authority is valid for recipient, purpose, scope, and time.

Mapping/professional review requirements are satisfied or review markersremain.

Evidence/approval records have not expired.

Rate, size, and concurrency limits permit the action.

Re-evaluate the current gates:

At snapshot preparation.

Immediately before first disclosure.

Before every retry that may disclose again.

Before an authenticated read.

Before an acknowledgement changes Task 09 state.

Before a reconciliation action.

10.3 Consent authority

Do not infer express versus implied consent.

Use only the approved Task 04/privacy contract.

Record recipient, purpose, data scope, effective time, expiry, withdrawal,policy version, and source authority.

A FHIR Consent resource, if exposed, is a derivative/representation unlessprivacy/legal explicitly designates it as the binding record.

Missing, stale, ambiguous, revoked, or purpose-mismatched authority blocks anew disclosure.

Withdrawal cannot undo data already disclosed. It stops future access/sendsand creates the approved reconciliation/correction work.

Consent answers and documents MUST NOT appear in application logs oroperational telemetry.

10.4 Scope and data minimization

Use resource-level, operation-level, field-level, tenant-level,pharmacy-level, consumer-level, subject-level, and purpose-level controls.

Wildcard scopes are prohibited by default.

A token scope is an upper bound, not the final authorization decision.

Search results MUST be filtered by authoritative scope before serialization.

Post-filtering an over-broad database query is insufficient where the queryitself could expose or log data.

Empty and denied responses MUST not disclose record existence throughdifferent schemas, details, totals, timing, or pagination.

10.5 Denial behavior

The production-disabled outer gate:

Returns the approved constant disabled status, currently 403.

Does not expose FHIR version, profiles, resource existence, tenant, consumer,or field names.

Applies consistently to all methods, including HEAD and OPTIONS.

Produces safe no-store headers.

Inside a future approved enabled boundary:

Authentication and authorization errors use the approved constant safe errorcontract.

Any FHIR OperationOutcome MUST be generic and payload-free for denials.

Internal validation detail is restricted to authorized staff metadata andcontains no submitted content.

11. Domain Contracts and Schema Proposal

Create:

docs/task-09/domain-contracts-and-schema-proposal.md

docs/task-09/database-migration-and-recovery-plan.md

Repository discovery decides exact names. At minimum, model:

Entity

Purpose

Key invariants

IntegrationConsumer

Stable consumer identity

One opaque identity; no credential values

IntegrationProfile

Versioned purpose, scope, standards, endpoint, and release contract

Immutable once used; exact consumer/environment binding

ProfilePackageLock

Pinned FHIR/IG/terminology/validator set

Version and hash required

ConsumerCredentialReference

Reference to managed key/credential

No secret material in database or evidence; environment-bound

DisclosureAuthoritySnapshot

Current approved authority evaluated for a disclosure

Recipient, purpose, scope, time, policy version

ExportSnapshot

Immutable serialized-source snapshot

Finalized source version, consumer profile, content digest, provenance

Handoff

One logical draft handoff

Stable logical ID and idempotency scope

HandoffAttempt

One transport attempt

Attempt number, safe outcome class, no payload in logs

AcknowledgementInbox

Persisted inbound acknowledgement/event

Signature state, event ID, digest, received time, deduplication

ReconciliationCase

Uncertain or conflicting state resolution

No invented success; owner and terminal disposition

IntegrationAuditReference

Link to authoritative audit event

Opaque references and safe reason codes

IntegrationFinding

Security/operations/conformance issue

Severity, owner, blocker, evidence

11.1 Common fields

Use opaque identifiers. Common records SHOULD include:

ID.

schema version;

state version;

consumer/profile ID;

environment;

tenant/pharmacy scope where required;

opaque subject/source reference where required;

purpose code;

created/updated time;

current state;

safe reason/error class;

correlation ID;

idempotency key or digest;

policy/approval references;

audit reference.

Do not duplicate clinical content into integration-control tables unless theapproved immutable payload strategy requires it.

11.2 Snapshot and payload strategy

Choose and document one:

Store an encrypted immutable export payload with approved retention and keycontrols.

Store a versioned immutable source snapshot from which exact bytes can bedeterministically serialized.

Requirements:

Do not recompute from mutable live clinical state on retry.

Bind the payload to source version, profile/package version, consumer, andpurpose.

Validate exact final bytes.

Record a digest of exact transmitted bytes.

Treat digests as sensitive operational metadata.

Keep payloads out of dead-letter metadata and staff queues.

Do not invent production retention. If retention is unresolved, productionuse is blocked.

11.3 Immutability and history

A used consumer-profile version is immutable.

An exported snapshot is immutable.

An acknowledgement receipt is append-only.

Reconciliation resolution appends history; it does not rewrite originalevents.

Corrections produce a new linked snapshot/handoff.

State transitions use compare-and-swap or equivalent version checking.

Direct database updates cannot bypass authorized transition services.

11.4 Migration rules

Use the repository’s migration system.

Add a new migration; never edit, squash, reorder, or replace an appliedmigration.

Run fresh-from-zero and upgrade-path tests on isolated real PostgreSQL.

Test constraints, indexes, privileges, tenant isolation, uniqueness,concurrency, and rollback/forward-fix behavior.

Do not apply the migration to production under this task.

A destructive or irreversible change requires an approved forward-fix andrecovery plan before merge.

Test-only/synthetic data paths must fail hard in production.

12. Read-Only Export Contract

Create:

docs/task-09/read-only-export-contract.md

12.1 Eligibility

An export snapshot is eligible only when:

The source is in an approved finalized state.

The source version is fixed.

Tenant, pharmacy, and subject scope are valid.

Consumer and purpose are current.

Data minimum is approved.

Consent/legal authority is current.

Required professional review is complete or explicit review markers arepreserved.

Selected FHIR/profile package versions are current for the capability.

Production release and cohort would be current in a future enabled stage.

Draft, in-progress, interrupted, withdrawn, invalidated, superseded withoutdisclosure rules, red-flag-refused, or unknown records do not export unless anexplicit approved contract defines a safe representation.

12.2 Fidelity

Export from the persisted source-of-truth output.

Do not recompute deriveClaimDraft() or equivalent logic at export time.

Preserve source uncertainty, missingness, and review markers.

Do not “correct” values during mapping.

Map unknown to an explicit approved representation or fail closed.

Record source service, source record/version, source time, transformationversion, consumer profile, FHIR/profile version, and payload digest.

12.3 Resource IDs and references

Use opaque, non-semantic resource IDs.

Do not embed health numbers, email, phone, names, pharmacy identifiers,clinical facts, or internal database keys in IDs.

Define per-consumer identifier translation.

Do not allow one consumer’s opaque identifier to be used by another.

Avoid externally resolvable references unless explicitly required.

No bearer tokens in reference URLs.

12.4 Search and pagination

Each allowed search parameter MUST have:

Purpose.

type;

maximum cardinality;

maximum result size;

authorization behavior;

tenant/subject constraint;

URL/logging risk;

index;

timeout;

evidence.

Rules:

Prefer opaque IDs and server-owned cursors.

PHI-bearing GET query strings are prohibited.

If FHIR search is required, use an approved pattern that prevents PHI fromentering URLs/access logs, such as a tightly controlled authenticatedPOST [type]/_search, only when the consumer profile permits it.

Page cursors are opaque, scoped, expiring, integrity-protected, and contain noPHI.

Bundle.total, paging links, and empty results MUST not leak unauthorizedexistence or counts.

Pagination cannot escape the original authorization snapshot.

Maximum page size and total retrieval are bounded.

12.5 HTTP and cache controls

For protected responses:

TLS is required in future approved environments.

Cache-Control: no-store, private.

X-Content-Type-Options: nosniff.

No shared CDN/proxy caching.

Referrer-Policy: no-referrer for related user-facing surfaces.

No analytics/session replay on protected routes.

CORS is deny-by-default and per approved origin where browser use exists.

Route logging uses normalized templates, not raw paths or query strings.

Error pages and titles contain no PHI or resource identifiers.

Content disposition filenames are generic and safe.

12.6 Version negotiation

No silent version coercion.

Unsupported FHIR, profile, schema, or media versions receive a safe explicitunsupported-version result inside an authorized boundary.

Downgrade attempts are denied.

Capability/profile change creates a new version and re-evaluation trigger.

Old versions have an explicit support and retirement plan.

13. Reviewed Dispensing-System Handoff

Create:

docs/task-09/reviewed-draft-handoff-contract.md

13.1 Boundary

The handoff is:

A reviewed draft transfer.

Directed to one approved pharmacy/consumer.

Minimum necessary.

Versioned and provenance-complete.

Explicitly labeled DRAFT — PROFESSIONAL REVIEW REQUIRED.

Incapable of creating a prescription, dispensing release, substitution,counselling completion, claim, HNS submission, adjudication, or paymenteligibility in AgentRx.

13.2 Mapping decision

For every handoff element, record:

AgentRx source field/version.

Consumer field/resource path.

semantic equivalence;

transformation;

required/optional;

null behavior;

terminology;

review marker;

consumer interpretation;

authoritative owner;

G2 status where clinical.

Do not use a FHIR MedicationRequest, MedicationDispense, Claim, Task, orother resource merely because its name appears convenient. The selectedresource/profile MUST match the approved consumer meaning and MUST not imply anunauthorized order or final event.

Where a document-based exchange is safer, evaluate an approved document profileand CA applicability. Do not claim CA conformance unless the exactpublished profile/version and required tests are satisfied.

13.3 Required visible language

Every applicable payload, document, and staff UI MUST state:

Draft/advisory status.

Source and version.

professional review required;

known missing/uncertain fields;

that the receiving pharmacy system and authorized personnel remainauthoritative;

that no HNS submission or payment decision has occurred.

13.4 Acknowledgement meanings

Consumer acknowledgement values MUST be documented and tested. At minimum,distinguish:

Transport received.

Queued.

accepted for human review;

duplicate recognized;

rejected as malformed;

rejected as unsupported;

rejected as unauthorized;

temporarily unavailable;

permanent failure;

unknown.

None means:

Prescription valid.

Pharmacist approved.

Product selected.

Dispensed.

Counselled.

Picked up/delivered.

Claim submitted.

Payment approved.

14. Orthogonal State Model

Create:

docs/task-09/orthogonal-state-and-transition-model.md

Do not use one overloaded status field.

14.1 Capability state

disabled

synthetic_local

synthetic_ci

approved_nonprod

limited_production

production

killed

expired

unknown

unknown behaves as disabled.

14.2 Disclosure-authority state

not_evaluated

valid

revoked

expired

scope_mismatch

purpose_mismatch

recipient_mismatch

unknown

Only valid permits a new disclosure.

14.3 Snapshot state

not_prepared

preparing

validated

invalid

available

access_disabled

superseded

expired

superseded does not erase disclosure history.

14.4 Logical handoff state

draft

approved_for_transmission

queued

in_progress

awaiting_acknowledgement

terminal_acknowledged

terminal_rejected

terminal_cancelled_before_send

reconciliation_required

closed

Professional approval to transmit a draft is not dispensing approval.

14.5 Attempt/transport state

not_started

claimed

sending

transport_accepted

transport_rejected

timed_out_unknown

connection_failed_before_send

response_invalid

retry_scheduled

exhausted

14.6 Business acknowledgement state

not_received

pending

accepted_for_review

duplicate

rejected_invalid

rejected_unsupported

rejected_unauthorized

temporary_failure

permanent_failure

conflicting

unknown

14.7 Reconciliation state

not_required

pending

in_progress

waiting_consumer

waiting_authorized_staff

resolved_no_external_item

resolved_existing_external_item

resolved_rejected

resolved_superseded

unresolved_escalated

14.8 Transition contract

Every transition MUST define:

From-state.

to-state;

triggering command/event;

authorized actor/service;

preconditions;

current release/kill check;

current disclosure-authority check where applicable;

state-version check;

database transaction;

idempotency rule;

audit event;

external effect;

timeout;

retry;

safe failure;

reconciliation;

tests.

Critical invariants:

Transport and business acknowledgement never update clinical/claim state.

State cannot regress on reordered events.

Duplicate events return the existing result.

Concurrent workers cannot create two logical sends.

Revocation or kill before bytes leave blocks the send.

Revocation after a completed disclosure is recorded and prevents futureaccess/retry; it does not rewrite history.

timed_out_unknown always requires reconciliation before another send thatcould duplicate an effect.

Unknown events and states fail closed.

15. Outbox, Inbox, Idempotency, Webhooks, and Reconciliation

Create:

docs/task-09/outbox-inbox-idempotency-and-reconciliation.md

docs/task-09/webhook-security-contract.md

15.1 Transactional outbox

Creating the immutable snapshot, logical handoff, and first outbox intent MUSTbe atomic where the workflow requires all three.

The outbox stores no secret.

Payload storage follows §11.2.

Workers claim with a database-enforced concurrency mechanism.

Claim leases have bounded expiry and safe recovery.

The worker rechecks release, kill, credential, consumer, consent authority,and source validity immediately before disclosure.

A worker crash before send is distinguishable from a timeout after possiblesend.

15.2 Idempotency

Define one logical idempotency key scoped to:

Capability/profile version.

consumer;

environment;

tenant/pharmacy;

operation;

immutable source/snapshot version;

purpose.

Requirements:

Key contains no PHI.

Duplicate callers receive the existing logical handoff result.

Reusing a key with different immutable input is rejected.

Attempts reuse the consumer-approved idempotency identifier where supported.

Expiry cannot silently permit a duplicate external item.

Consumer idempotency behavior is technically verified before reliance.

If consumer idempotency is absent or ambiguous, uncertain automatic retry isdisabled and reconciliation/manual review is required.

This task claims one logical AgentRx handoff with idempotent processing andreconciliation, not exactly-once delivery.

15.3 Retry

Classify failures as safe-to-retry, unsafe/unknown-to-retry, permanent, orpolicy-blocked.

Retry only safe classes.

Use bounded attempts, backoff, jitter, and deadline.

Reuse the logical idempotency context.

Re-evaluate current gates before each retry.

Retry scheduling cannot outlive credential, consent, approval, profile, orcapability expiry.

Exhaustion creates a staff-visible metadata-only work item.

15.4 Webhook/inbound event processing

Require:

Exact ingress route and consumer/environment binding.

TLS in approved environments.

signature/client authentication;

key version;

timestamp tolerance;

replay protection;

event ID;

content-type and byte limits;

raw-body integrity verification before parsing where the protocol requires it;

payload digest;

schema/profile version;

event-type allowlist;

persistence to inbox before asynchronous processing;

deduplication;

ordering/regression rules;

tenant/pharmacy/subject mapping through opaque approved references;

safe response;

body-free audit and logs.

The external response to a valid duplicate MUST be deterministic and must notreprocess an effect.

No webhook may directly:

Complete an assessment.

create/alter claim evidence;

create/submit a claim;

validate a prescription;

select/substitute a product;

pass a professional check;

authorize release;

mark counselling complete;

mark pickup/delivery complete;

mutate an immutable clinical or audit record.

15.5 Reconciliation

Create workflows for:

Timeout after possible send.

Connection failure before send.

HTTP success without business acknowledgement.

Duplicate acknowledgement.

Reordered acknowledgement.

Invalid acknowledgement.

Partial multi-item acceptance.

Consumer says duplicate but local state lacks acknowledgement.

Local send record but consumer cannot find item.

Revocation during send/retry.

Credential rotation during in-flight work.

Consumer outage.

Local outage.

Kill switch during queued/in-flight work.

Profile/version mismatch.

Correction/supersession after disclosure.

Wrong-consumer or wrong-tenant event.

Reconciliation MUST:

Avoid a second external effect until safe.

Preserve original attempts and digests.

Use an approved query/status method only where the consumer contract providesone.

Create an authorized manual work item when automation cannot prove outcome.

Require reason and evidence for resolution.

Never invent an external professional or fiscal event.

Append a resolution event instead of rewriting history.

15.6 Dead letter

Store metadata separately from payload.

Staff UI shows only consumer alias, state, timestamps, safe error class,attempts, opaque correlation reference, and owner.

Payload access, if production policy permits it, requires a separateauthorized diagnostic flow and audit.

Dead-letter replay rechecks all current gates and never bypassesreconciliation.

Bulk replay is disabled by default and separately approved.

16. Privacy, Security, Retention, Audit, and Provenance

Create:

docs/task-09/privacy-security-and-retention-plan.md

docs/task-09/audit-event-catalogue.md

docs/task-09/provenance-contract.md

docs/task-09/interoperability-incident-response.md

16.1 Field-level inventory

For every dataset, document:

Purpose.

source of truth;

fields;

PHI/personal/sensitive classification;

collection/use/disclosure authority;

consumer;

authorized roles;

client exposure;

encryption;

residency;

processors/subprocessors;

retention trigger;

approved retention period or UNRESOLVED;

deletion/archive;

legal hold;

backup behavior;

correction/supersession;

approval.

Cover:

Consumer registry.

credential references;

consent/disclosure authority;

export snapshots;

handoff payloads;

attempts;

acknowledgements;

webhook inbox;

reconciliation;

dead letters;

audits;

provenance;

application logs;

metrics/traces;

evidence;

backups.

Do not invent legally required retention periods. UNRESOLVED blocksproduction use of the affected dataset.

16.2 Data-location prohibitions

PHI, payloads, secrets, and reusable identifiers MUST NOT appear in:

URL query strings.

Browser history.

browser storage;

client-side caches;

page titles;

referrers;

analytics;

session replay;

telemetry attributes;

trace baggage;

error breadcrumbs;

application logs;

reverse-proxy/CDN logs without approved safe normalization;

metrics labels;

dashboards;

alerts;

notification bodies;

calendars;

evidence;

screenshot filenames;

source maps or build artifacts;

CI output.

16.3 Secret and key controls

Centralize configuration through the repository-approved typed boundary.

No raw process.env outside the approved configuration module.

Store secret values only in approved secret/key management.

Database records contain references, not secret values.

Separate test and production keys.

Define key generation, activation, overlap, rotation, revocation, compromise,and destruction.

Never log tokens, assertions, private/public key material beyond approved keyIDs, certificates, signatures, webhook secrets, or authorization headers.

Redact before data enters logging or tracing libraries.

16.4 Audit

Use the existing authoritative append-only audit service. Safe Task 09 auditevents include:

Consumer/profile created, approved, disabled, expired, or changed.

Credential/key reference changed.

route denied;

export authorized/denied;

snapshot prepared/invalidated;

handoff approved/queued/sent/failed;

acknowledgement accepted/rejected;

replay denied;

reconciliation opened/resolved;

dead-letter access requested/denied;

kill switch activated/cleared;

production gate decision;

profile/package change;

consent authority changed/blocked;

disclosure/access-history request.

Audit fields MAY include:

Opaque actor/service reference.

opaque subject reference where required;

opaque tenant/pharmacy/consumer reference;

action;

outcome;

safe reason code;

policy/profile version;

correlation reference;

source service;

time.

Audit MUST NOT include:

Clinical content.

payloads;

health numbers;

contact details;

consent answers/documents;

exact request URLs;

tokens/secrets;

raw vendor responses;

attachment content.

FHIR AuditEvent MAY be used as a representation only if approved. It does notreplace the repository’s authoritative immutable audit controls.

16.5 Provenance

For every export/handoff, capture:

Source system.

source resource/version;

source time;

extraction actor/service;

transformation version;

FHIR/profile/package version;

consumer profile;

purpose;

snapshot creation time;

payload digest;

author/reviewer where applicable;

supersession/correction links.

FHIR Provenance MAY represent this information where the approved profilerequires it. Security-audit events remain separate.

16.6 Access/disclosure history

Where approved privacy policy requires patient or staff access history:

Generate it from authoritative audit/disclosure records.

Do not expose raw security audit logs.

Show understandable consumer/purpose/time/outcome information.

Avoid exposing internal identifiers, security details, or other subjects.

Denied/nonexistent records cannot leak through search.

Accessibility requirements apply.

16.7 Incident response

Model:

Detect.

Disable affected consumer/capability.

Stop new work and quarantine queued retries.

Revoke/rotate credentials.

Disable ingress/egress.

Preserve safe evidence.

Identify exposed consumers, purposes, profiles, and time window.

Reconcile in-flight/uncertain items.

Escalate to security/privacy/operations/custodian/vendor.

Assess notification/reporting obligations through authorized humans.

Correct/supersede where required.

Recover through reviewed configuration.

Monitor.

Conduct post-incident review.

The application MUST NOT decide automatically that an event is a legallyreportable breach.

17. Payload-Free Observability and Operations

Create:

docs/task-09/observability-slo-and-alert-contract.md

docs/task-09/integration-operations-runbook.md

docs/task-09/vendor-outage-and-kill-switch-runbook.md

docs/task-09/credential-rotation-runbook.md

17.1 Allowed operational dimensions

Metrics/traces MAY use:

Capability version.

consumer alias or opaque low-cardinality ID;

environment class;

operation class;

profile version;

outcome class;

HTTP status class;

validation layer;

retry number bucket;

queue-age bucket;

latency bucket;

reconciliation state;

kill state.

They MUST NOT use:

Subject, patient, assessment, prescription, claim, encounter, handoff, orpayload identifiers.

Raw route/path/query.

clinical/medication content;

contact data;

exact location;

token claims beyond approved aggregate classes;

high-cardinality correlation IDs as metric labels.

17.2 Required SLIs

Define:

Authorization-denial rate by safe class.

Export-validation success/failure.

Outbox queue age.

worker claim latency;

send attempt latency;

transport acknowledgement latency;

business acknowledgement latency;

retry/exhaustion rate;

uncertain-outcome count/age;

reconciliation count/age;

invalid/replayed webhook rate;

consumer outage state;

kill-switch propagation time;

conformance validator failure rate;

production-disabled denial check.

Do not invent production SLO thresholds. Propose them with rationale and obtainoperations/product/consumer approval before G5.

17.3 Alerts

Alerts MUST:

Be payload-free.

Name the capability/consumer and safe condition.

identify owner and escalation;

link to runbook;

distinguish local outage, consumer outage, authentication failure,conformance drift, queue lag, replay attack, and privacy/security signal.

Never include raw payload, URL, subject, clinical fact, or token in an alert.

17.4 Runbooks

Cover:

Consumer outage.

Local worker outage.

webhook outage;

queue backlog;

conformance/package failure;

credential expiry/rotation/compromise;

endpoint/certificate change;

replay/forgery signal;

cross-tenant denial anomaly;

uncertain-outcome reconciliation;

dead-letter review;

consent withdrawal after disclosure;

correction/supersession;

kill switch;

rollback/forward-fix;

consumer offboarding;

evidence expiry.

18. Staff and Patient Interfaces

Create:

docs/task-09/interface-and-accessibility-contract.md

18.1 Staff integration queue

Show metadata only:

Consumer alias.

operation class;

safe state;

created/last-attempt time;

attempt count;

safe error class;

acknowledgement/reconciliation state;

owner;

opaque correlation reference;

available safe actions.

Do not show raw payload, full vendor response, secret, token, health number,contact data, or clinical content in the queue.

Sensitive payload inspection, if ever approved, is a separate auditedleast-privilege flow and is not part of the initial prototype.

18.2 Safe staff actions

Actions may include:

Open metadata details.

assign reconciliation;

cancel an unsent item;

request approved status reconciliation;

acknowledge a resolved operational item;

activate the authorized consumer kill switch;

open a runbook.

Manual resend MUST NOT be a blind button. It requires:

Current authorization.

current release and consent gates;

known outcome or reconciliation result;

idempotency safety;

reason;

audit.

18.3 Patient disclosure history

Only if approved:

Show who/what organization received data, purpose, date/time, and safe status.

Explain that technical delivery is not proof a clinician reviewed it.

Show corrections/supersessions clearly.

Provide an approved path for questions/correction requests.

18.4 Accessibility

Cover:

375px and desktop.

Keyboard-only use.

logical focus order;

visible focus;

screen-reader names, roles, states, and live announcements;

no color-only meaning;

contrast;

200% and 400% zoom/reflow;

reduced motion;

long translated labels;

loading, empty, denied, expired, killed, degraded, outage, reconciliation, andunknown states;

56px targets for frequent mobile actions where Task 11 requires them;

plain-language error text;

no auto-refresh that steals focus;

status updates announced without excessive interruption.

19. Deterministic Synthetic Conformance Harness

Create a synthetic implementation only within the verified Task 01 boundary.

19.1 Fixture contract

Fixtures MUST:

Use no real people, pharmacies, vendors, organizations, endpoints,credentials, identifiers, or records.

Use unmistakable markers such as SYNTHETIC-T09-.

Use reserved example domains and non-routable/local harness addresses.

Use a fixed clock, timezone, random seed, key set, and package lock.

Be server-owned.

Make no external network calls.

Include no production modules or credentials.

Include marker values for leakage scans.

Use deterministic payload bytes and digests.

Fail hard if imported or enabled in production.

Remain visibly labeled in every UI and artifact.

19.2 Required synthetic consumers

Include:

Valid pull consumer.

Valid draft-handoff consumer.

Consumer with wrong tenant.

Consumer with wrong pharmacy.

Consumer with over-broad scope.

Consumer with expired credential.

Consumer with rotated key.

Consumer with unsupported FHIR version.

Consumer with missing implementation-guide package.

Consumer without idempotency support.

Consumer with inconsistent acknowledgement semantics.

Killed consumer.

Unknown consumer.

19.3 Required scenarios

Production and route gate

Production route disabled for all methods.

Missing flag.

malformed flag;

unknown capability state;

direct domain-service call while disabled;

queued work when killed;

synthetic import attempted in production.

Authorization and disclosure

Anonymous.

wrong role;

wrong service identity;

wrong consumer;

wrong tenant;

wrong pharmacy;

wrong subject;

wrong purpose;

over-broad resource;

over-broad fields;

missing consent authority;

expired authority;

revoked authority;

authority revoked immediately before send;

stale authorization cache;

valid minimum-necessary export.

FHIR conformance

Valid selected profile.

Unsupported FHIR version.

unsupported profile;

missing required profile;

invalid cardinality;

invalid terminology;

unknown code;

unsupported extension;

unsupported modifierExtension;

external reference;

unsafe narrative;

malformed JSON;

oversized payload;

deep nesting;

prohibited batch/transaction;

prohibited include/history/bulk operation;

version downgrade.

Source fidelity

Finalized snapshot.

draft source;

in-progress source;

changed source after snapshot;

exact persisted claim-draft fidelity;

unknown/null field;

review marker preserved;

map entry count unchanged;

correction/supersession.

Delivery and acknowledgement

Successful transport and accepted-for-review acknowledgement.

Transport success with no business acknowledgement.

Connection failure before send.

Timeout after possible send.

Bounded safe retry.

Duplicate logical request.

Duplicate transport event.

Duplicate webhook.

Reordered webhook.

forged webhook;

expired webhook;

wrong environment webhook;

wrong consumer webhook;

invalid schema;

business-inconsistent response;

partial multi-item failure;

consumer duplicate response;

consumer outage;

local worker crash;

two-worker race;

dead-letter exhaustion;

reconciliation resolved with existing item;

reconciliation resolved with no item;

unresolved escalation.

Finality boundary

Vendor “completed” event.

Transport delivered event.

Business accepted event.

Patient-viewed event.

Handoff accepted for review.

Attempt to complete assessment.

attempt to create/submit claim;

attempt to mark dispensed;

attempt to mark paid.

Every attempted finality effect MUST be denied.

Privacy and leakage

PHI marker in URL.

PHI marker in log.

PHI marker in metric label.

PHI marker in trace/breadcrumb.

PHI marker in browser storage.

PHI marker in page title.

PHI marker in cache key.

PHI marker in screenshot filename.

secret/token marker in evidence;

payload in dead-letter UI.

19.4 Required interfaces

Build:

Synthetic capability/consumer registry.

Synthetic authenticated export endpoint.

Synthetic conformance-validator view.

Synthetic outbox/inbox worker.

Synthetic webhook receiver.

Synthetic integration operations queue.

Synthetic reconciliation view.

Synthetic kill-switch exercise.

Synthetic access/disclosure history where approved.

Disabled, denied, invalid, expired, killed, outage, dead-letter,reconciliation, and unknown states.

All controls are server-enforced. UI hiding is not authorization.

19.5 Evidence

Capture:

Production-like disabled-route proof.

Valid conformance validation.

Invalid profile denial.

Cross-tenant denial.

Revocation race denial.

Timeout/uncertain reconciliation.

Duplicate/reordered webhook.

Kill-switch queued-work behavior.

Desktop staff queue.

375px staff queue.

Keyboard walkthrough.

screen-reader semantic inspection;

200% and 400% zoom/reflow;

reduced motion;

long-label state;

payload/log/evidence scans.

Use only generic filenames and synthetic content.

20. Stable Task 09 Control Catalogue

Create:

docs/task-09/control-catalogue.md

Use these stable IDs:

Control

Required invariant

T09-001

Applicable instructions, repository baseline, and working-tree state are recorded before edits

T09-002

Task 01, 02, 04, 05, 08, and 11 dependencies are explicitly verified or blocked by scope

T09-003

Production route and direct service gate default to disabled on missing/unknown state

T09-004

Every /api/fhir method returns the approved disabled response in production configuration

T09-005

No external endpoint or live credential is reachable without exact approval

T09-006

Per-consumer integration/profile registry is authoritative and versioned

T09-007

Actor/service, tenant, pharmacy, subject, consumer, purpose, scope, and consent are independently enforced

T09-008

Client-supplied authority fields are ignored or denied

T09-009

Cross-consumer, cross-tenant, cross-pharmacy, and cross-subject access fails closed

T09-010

FHIR/package/validator versions and hashes are pinned

T09-011

Capability statements expose only implemented approved interactions

T09-012

Transport, FHIR/profile, terminology, business, and authorization validation all pass before use

T09-013

Unsupported versions, profiles, extensions, modifiers, codes, and references fail closed

T09-014

Search, pagination, fields, payload size, depth, and operations are bounded

T09-015

PHI-bearing URL/search patterns are prohibited

T09-016

Protected responses are no-store and cannot enter shared caches or analytics

T09-017

Only finalized, authorized, minimum-necessary immutable snapshots export

T09-018

Export bytes are traceable to the exact persisted source version and transformation

T09-019

Claim drafts are exported from persisted Task 02 output without recomputation

T09-020

Review markers and frozen clinical map are preserved absent G2

T09-021

Draft handoff is visibly advisory and cannot imply prescription, dispensing, HNS, or claim finality

T09-022

Transport and business acknowledgement are separate from professional and fiscal state

T09-023

Transactional outbox preserves one logical handoff intent

T09-024

Idempotency keys are scoped, PHI-free, and reject payload mismatch

T09-025

Uncertain outcomes enter reconciliation before potentially duplicating retry

T09-026

Retries are bounded and recheck current authorization, consent, release, and kill state

T09-027

Webhooks are authenticated, replay-protected, environment-bound, persisted, and deduplicated

T09-028

Reordered/duplicate events cannot regress state or duplicate processing

T09-029

Concurrent workers cannot produce duplicate logical external effects

T09-030

External events cannot mutate clinical, assessment, claim, dispensing, or immutable audit state

T09-031

Dead-letter and staff queues are payload-free

T09-032

Reconciliation appends history and never invents success

T09-033

Consent authority is current at disclosure; withdrawal stops future disclosure

T09-034

FHIR Consent representation is not silently treated as binding legal authority

T09-035

Audit and provenance are distinct, append-only, and payload-free where required

T09-036

PHI/secrets are absent from URLs, logs, traces, metrics, browser storage, evidence, and filenames

T09-037

Server secrets and credentials never enter client bundles

T09-038

Egress destinations are server-owned, allowlisted, and resistant to SSRF/redirect escape

T09-039

Kill switches stop new, queued, retry, and direct-call work with defined in-flight handling

T09-040

Normal pharmacist workflow operates when interoperability is disabled

T09-041

Repository migrations pass fresh and upgrade paths on isolated real PostgreSQL

T09-042

Synthetic fixtures, adapters, and credentials fail hard in production

T09-043

Production adapters and credentials are unreachable from the synthetic harness

T09-044

Required accessibility states and evidence pass

T09-045

Payload-free SLIs, alerts, owners, and runbooks exist

T09-046

Evidence is commit/version-bound, hashed, machine-valid, and free of sensitive content

T09-047

Production schema, authentication, endpoints, and route enablement remain unchanged

T09-048

Every material standards, consumer, endpoint, schema, credential, policy, or code-map change triggers re-evaluation

Controls T09-003 through T09-009, T09-012 through T09-021, T09-023 throughT09-040, T09-042, T09-043, T09-046, and T09-047 are non-waivable for Task 09synthetic PASS.

21. Required Tests

Use repository tooling. Add specialized FHIR conformance tooling only throughthe approved design and pinned package lock.

Preserve the original IOP-01 through IOP-19 semantics and add the productionquality cases below.

21.1 Original core cases

ID

Required proof

IOP-01

Every interoperability route, including /api/fhir, returns 403 in production configuration; this task creates no production enablement record

IOP-02

Anonymous request is denied with a uniform safe error

IOP-03

Authenticated wrong-role request is denied

IOP-04

Cross-pharmacy and cross-tenant request is denied

IOP-05

Expired, revoked, malformed, wrong-audience, or wrong-environment credential is denied

IOP-06

Over-broad resource, field, record, search, or operation request is denied

IOP-07

Consent/authority-required export is blocked when authority is absent, stale, revoked, or mismatched

IOP-08

Only finalized approved records export; draft/in-progress records never appear

IOP-09

Replayed logical idempotency key returns the existing result and does not create another logical handoff

IOP-10

Malformed external response fails closed without partial business state

IOP-11

Schema-valid but business-inconsistent response fails closed

IOP-12

Unknown/unsupported FHIR, profile, schema, or media version is rejected, never coerced

IOP-13

Timeout uses bounded safe retry only when outcome is known safe; uncertain outcome reconciles before resend

IOP-14

Partial multi-record failure remains explicit and reconcilable; no silent partial success

IOP-15

Every item reaches a terminal or explicitly owned unresolved-reconciliation state within the approved synthetic SLO; zero limbo rows

IOP-16

Export has full provenance and is field-identical to the persisted approved source/draft; no export-time recomputation

IOP-17

Logs, dashboards, dead-letter metadata, traces, metrics, client bundles, screenshots, and evidence contain no PHI, secrets, or payload bodies

IOP-18

Removing a PHARMACIST REVIEW REQUIRED marker or changing the frozen clinical-map digest without G2 fails CI

IOP-19

Handoff payload/UI state draft/advisory status; no text or event asserts HNS submission, dispensing, adjudication, or payment eligibility

21.2 Production-gate and architecture tests

IOP-20 — GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, andunsupported methods all fail at the production-disabled outer gate.

IOP-21 — Direct domain-service invocation cannot bypass the route gate.

IOP-22 — Missing, malformed, expired, killed, or unknown release state isdisabled.

IOP-23 — Client-controlled flags, headers, query values, cookies, tenantvalues, or feature state cannot enable the capability.

IOP-24 — Synthetic imports fail the production build or startup.

IOP-25 — Production adapters/credentials are unreachable in the syntheticbuild and test environment.

IOP-26 — Normal assessment/pharmacist workflow remains functional whileTask 09 is disabled or killed.

21.3 FHIR and standards conformance tests

IOP-27 — Declared CapabilityStatement matches implemented allowlist.

IOP-28 — Undeclared resources, operations, search parameters, and formatsare denied.

IOP-29 — Exact serialized valid fixtures pass the pinned FHIR/profilevalidator.

IOP-30 — Cardinality, invariant, slicing, terminology, and referenceviolations fail.

IOP-31 — Unsupported extension or modifierExtension fails closed.

IOP-32 — Unsafe narrative, external reference, and active document contentare denied or handled by the approved safe policy.

IOP-33 — Package hash/version drift fails CI.

IOP-34 — Validator/schema package mismatch fails CI.

IOP-35 — XML, batch, transaction, history, include/revinclude, bulk,wildcard, and other prohibited operations fail.

IOP-36 — Oversized, compressed, deeply nested, excessively cardinal, andmalformed payloads fail within bounded resource use.

IOP-37 — Property/fuzz cases never bypass authorization or crash into afail-open response.

21.4 Authorization, consent, and privacy tests

IOP-38 — One consumer credential cannot access another consumer profile.

IOP-39 — Client-supplied actor, role, tenant, pharmacy, patient, consumer,purpose, consent, finalized state, or source version is ignored or denied.

IOP-40 — Scope is necessary but insufficient; underlying tenant,subject, purpose, and data-minimum policy still denies.

IOP-41 — Revocation immediately before disclosure wins a deterministicrace.

IOP-42 — Authorization/consent cache expiry cannot permit stale access.

IOP-43 — FHIR Consent derivative cannot override the authoritativeinternal consent-policy decision.

IOP-44 — Search, page cursor, count, timing, and denial schema do not leakunauthorized existence.

IOP-45 — Protected responses are not shared-cacheable and include approvedprivacy headers.

IOP-46 — PHI/token markers in URL, raw path, query, referrer, title,browser storage, analytics, telemetry, logs, traces, metrics, errors, orevidence fail CI/runtime scans.

21.5 Snapshot and fidelity tests

IOP-47 — Source mutation after snapshot does not alter the snapshot orretry payload.

IOP-48 — Payload digest matches exact validated transmitted bytes.

IOP-49 — Reusing an idempotency key with different immutable input isdenied.

IOP-50 — Correction creates a linked superseding artifact and preservesoriginal disclosure history.

IOP-51 — Unknown/null/uncertain values remain explicit and are notinvented.

IOP-52 — Per-consumer field allowlist prevents accidental extra FHIRelements.

21.6 Outbox, concurrency, failure, and reconciliation tests

IOP-53 — Snapshot, logical handoff, and outbox intent are atomic.

IOP-54 — Crash before send recovers without duplicate logical handoff.

IOP-55 — Two workers racing claim/process one logical item once.

IOP-56 — Transport success is distinct from business acknowledgement.

IOP-57 — HTTP 2xx without valid business acknowledgement remainspending/reconcilable.

IOP-58 — Timeout after possible send cannot auto-resend when consumeridempotency/outcome is unknown.

IOP-59 — Duplicate webhook/event is acknowledged deterministically andprocessed once.

IOP-60 — Reordered event cannot regress state.

IOP-61 — Kill switch blocks new, queued, retry, and direct service work andapplies the approved in-flight policy.

IOP-62 — Credential rotation race accepts only the approved overlap anddenies expired keys.

IOP-63 — Retry cannot outlive approval, profile, consent, credential, orcapability expiry.

IOP-64 — Dead-letter UI/storage metadata contains no payload.

IOP-65 — Reconciliation cannot mark success without approved evidence.

IOP-66 — Consumer outage and local outage preserve recoverable state andnormal AgentRx workflow.

21.7 Webhook and egress security tests

IOP-67 — Valid signature/authentication succeeds only for the boundconsumer/environment.

IOP-68 — Invalid signature, stale timestamp, replay, wrong key, wrongaccount, wrong consumer, and wrong environment are denied.

IOP-69 — Event ID and payload digest mismatch is denied and investigated.

IOP-70 — Request-controlled endpoint, redirect escape, DNS rebinding,private/link-local/metadata address, and unsupported protocol are denied.

IOP-71 — TLS hostname/certificate failure is fail-closed.

IOP-72 — Raw webhook and authorization secrets are absent from logs anderrors.

21.8 Clinical, dispensing, and claim-boundary tests

IOP-73 — Vendor “complete,” accepted, delivered, viewed, or acknowledgedevents cannot complete an assessment.

IOP-74 — No external event can create billability evidence or a claimdraft.

IOP-75 — No Task 09 path can submit a claim or HNS transaction.

IOP-76 — No Task 09 path can validate a prescription, substitute a drug,pass professional check, mark counselling complete, or authorize release.

IOP-77 — Pharmacy-system draft handoff preserves professional-reviewmarkers and authority language.

21.9 Database and migration tests

IOP-78 — Fresh migration succeeds on isolated supported PostgreSQL.

IOP-79 — Upgrade path from the repository baseline succeeds.

IOP-80 — Uniqueness, foreign key, state, immutability, and tenantconstraints reject invalid direct writes.

IOP-81 — App role cannot bypass transition, tenant, audit, or immutablesnapshot controls.

IOP-82 — Rollback/forward-fix rehearsal preserves prior functionality anddoes not imply external disclosure rollback.

21.10 Accessibility and operational tests

IOP-83 — Staff queue and reconciliation work at 375px and desktop.

IOP-84 — Keyboard, visible focus, screen-reader semantics, announcements,contrast, zoom/reflow, reduced motion, and long labels pass.

IOP-85 — Loading, empty, denied, expired, killed, outage, dead-letter,reconciliation, and unknown states are usable.

IOP-86 — Payload-free SLIs, alerts, and runbook links behave as designed.

IOP-87 — Kill, outage, credential-rotation, and reconciliation drillsproduce safe evidence.

21.11 Evidence and production-invariance tests

IOP-88 — Evidence manifest validates against Task 11 schema.

IOP-89 — Evidence/artifact hashes match and refer to the exact commit andcapability version.

IOP-90 — Missing, skipped, stale, wrong-commit, or contaminated evidencefails the gate.

IOP-91 — Production route manifest, environment schema, authenticationbehavior, external allowlist, and adapter registry remain disabled/unchangedas required.

IOP-92 — Final production-like local/CI probe confirms /api/fhir remainsdisabled; live probe is performed only if separately authorized.

21.12 Red/green evidence

For every newly implemented non-waivable control:

Capture a controlled synthetic red run using a mutation fixture, negativeharness, or pre-control commit.

Do not commit an exploitable bypass solely to create red evidence.

Capture the green run on the reviewed code.

Record command, exit code, commit, fixture version, environment, and safesummary.

Existing controls may use historical/current denial evidence when the Task 11reviewer accepts it as current and equivalent.

22. CI and Task 11 Gate Contract

Task 09 required jobs MUST include:

Repository formatting/lint.

TypeScript/type checks.

Unit/domain tests.

Route/authorization tests.

Isolated real-PostgreSQL migration and constraint tests.

Deterministic concurrency tests.

FHIR/profile conformance validation.

Package-lock integrity.

Terminology/map freeze.

Outbox/inbox/idempotency/reconciliation tests.

Webhook/egress security tests.

Privacy/log/browser/cache leakage scans.

Client-bundle secret/import scans.

Synthetic network-denial and production-import tests.

Production-invariance tests.

Automated accessibility checks.

Evidence-manifest validation.

Aggregate Task 09 release gate.

Rules:

Stable job names.

Required jobs cannot be skipped, neutralized, renamed, or satisfied by anothercommit.

Untrusted CI has no production credentials or network access.

Conformance packages are pinned and local.

Test artifacts contain synthetic/payload-free evidence only.

Security, privacy, authorization, tenant, conformance, clinical/claimboundary, production isolation, and critical accessibility controls arenon-waivable.

An implementation author cannot approve an exception alone.

A green CI run does not enable production.

23. Evidence Contract

Create:

docs/task-09/evidence/manifest.json

docs/task-09/requirement-evidence-matrix.md

docs/task-09/findings-register.md

Use the Task 11 schema where available.

23.1 Manifest minimum

Include:

Manifest schema version.

Task/capability ID and version.

requested stage;

source commit;

worktree state;

build provenance;

environment classification;

dependency-lock digest;

migration head/digest;

configuration version;

route-manifest hash;

FHIR/profile/package-lock hash;

validator identity/version;

fixed clock/seed/fixture version;

Task 01/02/04/05/08/11 evidence references;

controls;

tests;

artifacts and hashes;

findings;

stops;

approvals;

exceptions;

producer;

independent reviewers;

generated time;

expiry;

production-invariance result.

Every evidence item includes:

Evidence ID.

stable control/test ID;

status;

safe summary;

command/manual procedure;

start/end time;

tool/version;

environment;

commit/capability scope;

artifact path;

SHA-256 or approved digest;

producer/reviewer;

expiry or approved rationale.

23.2 Evidence prohibitions

Do not include:

PHI or plausible patient data.

payload bodies;

raw request/response bodies;

production URLs;

tenant/pharmacy/patient identifiers;

names, contact details, health numbers;

secrets/tokens/cookies/certificates/private keys;

raw environment values;

full IP addresses;

device fingerprints;

workstation usernames;

browser tabs, bookmarks, notifications, or unrelated desktop content.

23.3 Requirement mapping

Map every:

T09 control.

IOP test.

acceptance criterion.

deliverable.

stop condition encountered.

phase exit.

Statuses:

PASS

FAIL

BLOCKED

NOT RUN

NOT APPLICABLE

Every non-PASS value requires a reason and owner.

23.4 Artifact naming

Use generic names such as:

route-disabled.txt

valid-profile.txt

invalid-profile.txt

cross-tenant-denied.txt

timeout-reconciliation.png

mobile-queue.png

desktop-queue.png

keyboard-review.md

Do not encode consumer, pharmacy, subject, clinical, or credential informationin filenames.

24. Operational Validation Plan

Create:

docs/task-09/privacy-security-accessibility-professional-and-operational-validation-plan.md

Use only synthetic cases under this task.

24.1 Pharmacist/professional validation

Validate:

Draft status is unmistakable.

Review markers remain visible.

Handoff does not imply prescription validity or dispensing approval.

Missing/uncertain fields are usable.

Consumer acknowledgement cannot be confused with pharmacist approval.

Corrections/supersessions are clear.

The ordinary workflow works during outage or kill.

24.2 Privacy/security validation

Validate:

Minimum necessary per consumer/purpose.

Custodian/agent/recipient assumptions are explicit and approved.

Consent and withdrawal behavior is understandable.

Access/disclosure history is accurate and safe.

Logs/evidence are payload-free.

Credential, endpoint, replay, and reconciliation controls are operable.

Incident and consumer offboarding procedures are usable.

24.3 Accessibility validation

Validate the §18 matrix with:

Automated checks.

Keyboard review.

screen-reader semantic review;

zoom/reflow;

contrast;

reduced motion;

long text;

375px and desktop;

error/outage/reconciliation states.

24.4 Operational validation

Validate:

Onboarding checklist.

Key rotation.

consumer outage;

local outage;

queue backlog;

uncertain outcome;

dead-letter triage;

kill switch;

rollback/forward-fix;

correction;

offboarding;

evidence expiry.

24.5 Production review

Before G5, require current:

Consumer contract.

PIA.

TRA.

data-sharing authority;

consent policy;

vendor/subprocessor review;

Canadian/provincial residency evidence where required;

professional review;

security review;

accessibility review;

legal/procurement review;

operations/support review;

SLOs and incident ownership;

kill/rollback rehearsal;

exact evidence manifest.

Synthetic validation does not approve production.

25. Release Stages, Kill Switches, Rollback, and Change Triggers

25.1 Release stages

Stage

Allowed behavior

R0 — Disabled

Production and all external adapters disabled

R1 — Local synthetic

Deterministic Task 01 harness, no external network

R2 — Synthetic CI/conformance

Pinned validator and synthetic tests, no external network

R3 — Approved external non-production

Exact G4 endpoint with synthetic data only

R4 — Limited production read-only pull

Exact G5 consumer/cohort/data minimum; no push

R5 — Limited production draft handoff

Exact G5 reviewed-draft scope with reconciliation

R6 — Approved expansion

Explicitly approved additional cohort/scope after hold and review

RX — Killed/expired

No new access/send/retry; defined in-flight containment

This task may complete R1 and R2 only.

25.2 Feature/release gates

Server-side.

deny by default;

exact capability version;

exact environment;

exact consumer/profile;

exact tenant/pharmacy cohort;

exact operation/data minimum;

current approval and expiry;

current evidence-manifest hash;

current dependencies;

independent kill switch.

No client flag can enable a stage.

25.3 Kill switch

Define global, environment, consumer, credential, profile, operation, and cohortkill levels.

Activation MUST:

Deny new reads/exports/handoffs.

Stop unstarted and retry work.

Quarantine queued items.

Apply the documented policy to in-flight connections.

Disable affected ingress where appropriate.

Preserve evidence.

Alert the owner without payload.

Leave the normal pharmacist workflow operational.

Clearing a kill requires:

Root cause/status known.

Current approvals/evidence.

reconciliation of affected items;

credential/profile validity;

authorized decision;

audit.

25.4 Rollback and forward-fix

Code/config rollback:

Restores the previous disabled or known-safe capability.

Does not delete audit/history.

does not retry uncertain items;

does not claim to retract disclosed data.

Database changes:

Prefer additive compatibility.

Document rollback or approved forward-fix.

Test on isolated PostgreSQL.

External disclosures:

Cannot be rolled back.

Use correction, supersession, consumer notification, or reconciliation asapproved.

25.5 Material change triggers

Re-evaluate evidence and approvals when any changes:

Source commit.

domain contract;

database migration/schema;

FHIR version;

implementation guide/profile;

terminology/code map;

validator/package;

resource/operation/search allowlist;

field/data minimum;

consumer;

endpoint/DNS/region;

authentication/token/key profile;

credential/key;

webhook semantics;

acknowledgement meaning;

idempotency behavior;

retry/reconciliation logic;

consent policy;

purpose;

tenant/pharmacy cohort;

retention/backup/residency;

vendor/subprocessor/contract;

SLO/support/incident plan;

kill/rollback behavior;

dependency task status;

production route/deployment architecture.

Material change invalidates stale evidence for the affected scope.

26. Deliverables

Use existing repository locations when explicitly established. Otherwise create:

docs/task-09/current-state-and-gap-analysis.md

docs/task-09/dependency-and-approval-register.md

docs/task-09/proposed-change-manifest.md

docs/task-09/standards-profile-decision.md

docs/task-09/fhir-api-and-conformance-contract.md

docs/task-09/fhir-package-lock.json

docs/task-09/trust-boundary-and-data-flow.md

docs/task-09/interoperability-threat-model.md

docs/task-09/integration-inventory.md

docs/task-09/consumer-onboarding-and-offboarding-runbook.md

docs/task-09/vendor-assessment-scorecard.md

docs/task-09/identity-authorization-consent-and-purpose-contract.md

docs/task-09/domain-contracts-and-schema-proposal.md

docs/task-09/database-migration-and-recovery-plan.md

docs/task-09/read-only-export-contract.md

docs/task-09/reviewed-draft-handoff-contract.md

docs/task-09/orthogonal-state-and-transition-model.md

docs/task-09/outbox-inbox-idempotency-and-reconciliation.md

docs/task-09/webhook-security-contract.md

docs/task-09/privacy-security-and-retention-plan.md

docs/task-09/audit-event-catalogue.md

docs/task-09/provenance-contract.md

docs/task-09/interoperability-incident-response.md

docs/task-09/observability-slo-and-alert-contract.md

docs/task-09/integration-operations-runbook.md

docs/task-09/vendor-outage-and-kill-switch-runbook.md

docs/task-09/credential-rotation-runbook.md

docs/task-09/interface-and-accessibility-contract.md

docs/task-09/control-catalogue.md

docs/task-09/privacy-security-accessibility-professional-and-operational-validation-plan.md

docs/task-09/mapping-review-package.md

docs/task-09/production-enablement-handoff.md

Deterministic synthetic fixtures and conformance harness.

Synthetic export route and validator.

Synthetic outbox, inbox, webhook, and reconciliation implementation.

Metadata-only synthetic staff interface.

Source migration(s), if required, tested but not applied to production.

Comprehensive IOP-01 through IOP-92 tests.

docs/task-09/evidence/manifest.json

docs/task-09/requirement-evidence-matrix.md

docs/task-09/findings-register.md

Sanitized automated/manual/accessibility/drill evidence.

Updated Task 11 capability/release entry in source form, without productionenablement.

Updated repository documentation and final report.

The original v2 deliverables remain binding and map as follows:

Original v2 deliverable

v3 implementation output

Integration inventory and authority/data-flow matrix

Deliverables 7, 8, 9, and 12

Versioned read-only API contract and threat model

Deliverables 4, 5, 7, 8, 12, and 15

Authenticated synthetic conformance harness and IOP suite

Deliverables 33, 34, 38, 39, and 40

Reliability pipeline with metadata-only dead-letter/reconciliation dashboard

Deliverables 17, 18, 35, and 36

Mapping review package with markers preserved

Deliverable 31

Baseline/final disabled-route probes, scans, and evidence pack

Deliverables 1 and 38 through 42; a live production probe is performed only with separate explicit authority

mapping-review-package.md MUST:

Inventory current mappings and versions.

list every review marker;

identify open questions;

state the exact G2 decision required;

make no mapping change or approval.

production-enablement-handoff.md MUST:

List every unresolved per-consumer decision.

include the G3/G4/G5 checklists;

identify exact code/config/migration steps a future authorized release wouldrequire;

include kill, rollback/forward-fix, support, and reconciliation readiness;

explicitly state that this task did not execute them.

27. Out of Scope

Production route enablement.

Production migration execution.

Production authentication/client registration.

Live PHI.

Real consumer/vendor connectivity.

HNS submission.

Claim creation, submission, adjudication, payment, or eligibility.

Prescription creation or validation.

Prescribing.

dispensing;

substitution;

professional check;

counselling;

release;

pickup/delivery completion.

External clinical-record writes.

Bidirectional clinical synchronization.

FHIR bulk-data export.

FHIR subscriptions in production.

Generic FHIR CRUD.

Patient-controlled arbitrary data sharing.

Expanding/approving the ICD-10 or clinical map.

AI mapping, summarization, coding, or reconciliation.

Inventing privacy, legal, consent, retention, residency, or professionalpolicy.

Claiming compliance, certification, or regional/vendor conformance withoutthe exact approved evidence.

28. Acceptance Criteria

28.1 Synthetic/conformance acceptance

Task 09 synthetic/conformance status is PASS only when:

Applicable instructions and repository state were inspected and recorded.

Dependencies are verified or safely isolated by workstream.

G1 and the applicable Task 11 pre-implementation review were satisfied forexecutable work.

Every production interoperability route and direct service gate is disabledby default.

/api/fhir returns the approved disabled result in production-like local/CIconfiguration for all methods.

No production or external credential, endpoint, data source, or module isreachable from the synthetic harness.

One per-consumer standards/profile contract drives each synthetic path.

FHIR, implementation-guide, terminology, and validator packages are pinned.

Exact serialized artifacts pass a real profile validator plus business andauthorization validation.

Unsupported versions, profiles, operations, fields, codes, extensions,modifiers, references, and payload sizes fail closed.

Actor, service identity, consumer, tenant, pharmacy, subject, purpose, dataminimum, finality, consent authority, release stage, and kill state areindependently enforced server-side.

Only finalized immutable source snapshots export.

Export fidelity and provenance are proven.

Claim drafts are never recomputed at export.

Review markers remain intact and the clinical-map digest is unchanged.

Handoff is visibly draft/advisory.

No acknowledgement or external event can create clinical, dispensing, claim,HNS, or payment finality.

Outbox/inbox/idempotency/reconciliation handle duplicate, timeout, replay,reordering, partial failure, race, outage, kill, and uncertain outcome.

No exactly-once claim is made.

Consent withdrawal and kill races fail safely.

No PHI, payload, secret, token, sensitive URL, or reusable identifier appearsin prohibited locations.

Staff and patient-approved interfaces meet accessibility requirements.

Every required non-waivable IOP test passes.

Root repository TypeScript, ESLint, pure-test, build, and architecture gatesrequired by Task 11 pass.

Controlled red and green evidence exists for newly implemented criticalcontrols.

Evidence manifest is current, hashed, machine-valid, and tied to the exactcapability version.

Production schema, authentication, external allowlists, adapters, and routeenablement were not changed.

No real PHI or external effect occurred.

28.2 Production-candidate status

READY_FOR_G5_REVIEW requires, for one exact consumer:

Synthetic/conformance PASS.

Successful approved R3 conformance under G4.

Current G2 where mappings require it.

Current G3.

Complete consumer/vendor specification.

exact endpoint/authentication/key profile;

verified idempotency and acknowledgement semantics;

PIA/TRA/data-sharing agreement;

residency, retention, backup, and incident evidence;

professional, privacy, security, accessibility, legal/procurement, product,and operations approvals;

current SLOs, support, kill, rollback/forward-fix, and drills;

no open blocking findings;

current Task 11 evidence-manifest review.

This task does not achieve or claim that status unless every listed item isactually present. It does not execute G5.

28.3 Production acceptance

Production is not accepted by this task.

Never report production readiness while any required:

Consumer identity.

vendor specification;

contract;

PIA;

TRA;

consent policy;

data-sharing authority;

professional mapping review;

security review;

accessibility review;

residency;

retention;

support/SLO;

kill/rollback;

Task 11 release approval

is missing, stale, blocked, or applies to another scope.

28.4 Original v2 acceptance criteria preserved

The full denial matrix covers anonymous, wrong-role, wrong-consumer,wrong-pharmacy, wrong-tenant, wrong-subject, expired/revoked credential,replay, over-broad request, and missing/invalid disclosure authority.

Export is finalized-only, minimum-necessary, provenance-complete, andidentical to its approved persisted source.

External content fails closed at transport, FHIR/profile, terminology,business, and authorization layers; versions are never coerced.

Retry and replay cannot create a second logical handoff, and uncertainoutcomes reconcile before another potentially duplicating effect.

Every handoff has a terminal or explicitly owned unresolved-reconciliationoutcome; partial success is never silent.

Logs, dashboards, dead-letter metadata, traces, metrics, client bundles, andevidence contain no PHI, secrets, or payload bodies.

Clinical mappings remain frozen, review markers remain intact, and thepharmacist review package is delivered.

The handoff remains advisory; the pharmacy system stays authoritative andnothing claims HNS submission, dispensing, adjudication, or payment.

/api/fhir remains disabled in production at task end.

Every applicable critical control has current denial/red evidence and greenevidence, and the repository/Task 11 gates pass.

If the synthetic implementation passes while production dependencies remainblocked, report:

Task 09 synthetic/conformance implementation: PASS — productioninteroperability, PHI disclosure, external connectivity, dispensing-systemhandoff, HNS, and claim effects remain disabled and gated.

29. Agent Completion Procedure

Before final reporting:

Re-read applicable instructions.

Confirm changes match the approved manifest.

Confirm unrelated user changes were preserved.

Run narrow and root-required checks.

Run fresh/upgrade PostgreSQL tests where schema changed.

Run the pinned FHIR/profile validator.

Run authorization, tenant, consent, idempotency, race, webhook, leakage,accessibility, and production-invariance tests.

Validate evidence and hashes.

Confirm production route and direct service gates remain disabled.

Confirm external endpoint allowlist is empty unless a separately authorizedG4 test occurred.

Confirm no production credentials, PHI, external messages, vendor effects,clinical writes, dispensing effects, HNS, or claims occurred.

Update findings, stops, decision register, and recommended next action.

Obtain Task 11 evidence review where available.

Produce the final report exactly as §30 requires.

Do not use PASS to mean “the code looks good,” “the happy path works,” or“production could probably be enabled.”

30. Final Report Format

End the task with:

Task 09 synthetic/conformance status: PASS | BLOCKED | FAIL
Task 09 production-candidate status: READY_FOR_G5_REVIEW | BLOCKED | FAIL | NOT REQUESTED
Production enabled: NO

Capability ID/version:
Source commit:
Working-tree state:
Build/configuration identity:
Migration head/digest:
FHIR base/version:
Implementation guide/package versions:
Validator/version:
FHIR package-lock hash:
Evidence-manifest hash:

Task 01 synthetic environment: READY | BLOCKED | NOT VERIFIED
Task 02 source/claim boundary: PASSED | BLOCKED | NOT VERIFIED | NOT APPLICABLE
Task 04 consent authority: PASSED | BLOCKED | NOT VERIFIED | NOT APPLICABLE
Task 05 identity/tenant boundary: PASSED | BLOCKED | NOT VERIFIED
Task 08 dispensing-handoff boundary: PASSED | BLOCKED | NOT VERIFIED | NOT APPLICABLE
Task 11 pre-implementation review: PASSED | BLOCKED | NOT VERIFIED
Task 11 evidence/promotion review: PASSED | BLOCKED | NOT VERIFIED | NOT REQUESTED

G1 design/test-plan approval: GRANTED ("<verbatim decision>") | NOT GRANTED
G2 clinical/terminology approval: GRANTED ("<verbatim decision>") | PENDING | NOT APPLICABLE
G3 per-consumer governance approval: per consumer — GRANTED | BLOCKED | NOT REQUESTED
G4 exact non-production connectivity: per consumer — GRANTED | BLOCKED | NOT REQUESTED
G5 production enablement: NOT REQUESTED (required end state)

Consumer profiles:
- <opaque consumer/profile>: SYNTHETIC PASS | BLOCKED | FAIL

Phases 0–7: each PASS | BLOCKED(S-id) | FAIL | NOT RUN(gate)
Controls T09-001..T09-048: each PASS | BLOCKED | FAIL | NOT RUN | NOT APPLICABLE
Tests IOP-01..IOP-92: each PASS | BLOCKED | FAIL | NOT RUN | NOT APPLICABLE

Production-like /api/fhir disabled proof: PASS | FAIL
Authorized live production probe: 403 CONFIRMED | NOT AUTHORIZED | FAIL
Direct-service bypass test: PASS | FAIL
External endpoint allowlist at task end: EMPTY | APPROVED NONPROD ONLY
FHIR/profile conformance: PASS | BLOCKED | FAIL
Authorization and tenant isolation: PASS | FAIL
Consent/purpose enforcement: PASS | BLOCKED | FAIL
Finalized-only snapshot fidelity: PASS | FAIL
Clinical-map/review-marker freeze: PASS | FAIL
Draft-handoff boundary: PASS | FAIL | NOT APPLICABLE
Idempotency/outbox/inbox: PASS | FAIL
Uncertain-outcome reconciliation: PASS | FAIL
Webhook/egress security: PASS | FAIL
Clinical/dispensing/claim boundary: PASS | FAIL
PHI/secret leakage scans: PASS | FAIL
Accessibility evidence: PASS | BLOCKED | FAIL
Kill/rollback/outage drills: PASS | BLOCKED | FAIL
Evidence validation: PASS | FAIL

Real or production-derived PHI used: NO
Production data accessed: NO
Production schema changed/applied: NO
Production authentication changed: NO
Production route enabled: NO
Production vendor/consumer connected: NO
External message or payload sent: NO
Prescription created/validated: NO
Dispensing/professional action performed: NO
HNS transaction submitted: NO
Claim created or submitted: NO
Clinical or fiscal finality created by Task 09: NO

Stop conditions fired:
Blocking issues:
Open findings:
Unresolved consumer/vendor decisions:
Unresolved professional/terminology decisions:
Unresolved privacy/legal/consent decisions:
Unresolved security/residency/retention decisions:
Deferred production work:
Evidence locations:
Files changed:
Tests run and results:
Recommended next action:

PASS requires every synthetic/conformance acceptance criterion and everyapplicable non-waivable control to pass. READY_FOR_G5_REVIEW is not productionapproval. The required task end state is production disabled.
