Task 11 — Cross-Cutting Quality, Security, Privacy, and Release Control Plane

## Governance approval — 2026-08-02

Royian Chowdhury has authorized implementation of Task 11's local, synthetic
control plane as an R4 capability with autonomy level
`A3_BOUNDED_AUTOMATION`. The bounded approval and exclusions are recorded in
[`../../task-11/decisions/implementation-approval-2026-08-02.md`](../../task-11/decisions/implementation-approval-2026-08-02.md).

Implementation is authorized, but merge and promotion remain blocked pending
independent quality and security review of the resulting commit and evidence.
No production data, credentials, integrations, migrations, effects, or release
authority are granted by this approval.

Owner profile: QA/security engineerRequired reviewers: capability owner, quality, security, privacy, accessibility, operations/SRE, and the professional or legal approver required by the affected capabilityPriority: P0 foundation, then continuousStatus: ready for control-plane implementation; no roadmap capability may be promoted by assumption while required gates are absent, bypassed, stale, or unresolvedUpdated: 2026-07-30

Outcome

Create one evidence-producing release control plane for every AgentRx roadmapcapability so that no feature moves from design, synthetic experiment, or localdemonstration into a broader environment merely because:

The code compiles.

A happy-path demo works.

A test passed once.

A vendor reports success.

A pull request was approved informally.

A clinician, developer, or manager says the change appears low risk.

A feature flag exists.

The change is described as “only AI,” “only messaging,” “only analytics,”“only a migration,” or “only operational.”

The system must produce, validate, retain, and link evidence for:

Code quality.

Dependency and secret hygiene.

Synthetic-data isolation.

Authorization and tenant pinning.

Privacy and prohibited-data locations.

Database migrations and constraints.

Audit behavior.

Retention and legal holds.

Idempotency and concurrency.

Integration reconciliation.

Accessibility.

Operational reliability.

Rollout, rollback, and downtime behavior.

Kill switches and automation disablement.

Required privacy, security, accessibility, professional, legal, procurement,and product approvals.

Task 11 owns the release-control mechanism and evidence format. It does notgrant the substantive approvals recorded in that mechanism. A green Task 11gate proves that required evidence and approvals were checked under theregistered policy version; it does not independently prove clinical accuracy,professional appropriateness, legal compliance, privacy-law interpretation, orvendor suitability.

Evidence basis and interpretation

Use deep-research-report.md as project-planning context. The report supports adocumentation-first, workflow-first AgentRx position with:

Deterministic controls for safety-critical rules.

Human professional judgment for clinical, prescribing, dispensing, referral,and billing decisions.

Human confirmation of extracted or generated information.

Explicit consent and role-based access.

Strong audit and provenance.

Region- and contract-aware privacy controls.

Conservative use of AI.

Operational and safety evidence rather than vanity AI metrics.

Those principles make release governance part of the product, not a finalchecklist added after development. In particular:

A documentation-oriented product can still cause harm through authorization,data leakage, stale state, unsafe automation, downtime, or misleadinginterface behavior.

A synthetic prototype PASS does not approve PHI, production integrations,vendors, regulated claims, or professional use.

A technical test cannot replace pharmacist, privacy, legal, security,accessibility, procurement, or product review.

An approval cannot replace executable evidence that the approved control isactually present.

Vendor marketing cannot be treated as contract, subprocessor, residency,deletion, accessibility, availability, or security evidence.

No hosting or regulatory conclusion should be generalized across Ontario,the rest of Canada, the United States, Bangladesh, or another jurisdiction.

The research report is not legal, privacy, security, professional,accessibility, procurement, or regulatory approval. Before productionpromotion, the implementing agent must map applicable current official sourcesand record:

Source title.

Authority.

URL.

Version, revision, publication, or effective date.

Date accessed.

Jurisdiction.

Relevant requirement or guidance.

Affected capability and release stage.

Repository evidence.

Gap.

Required action.

Approval owner.

Review and expiry date.

Non-negotiable design principles

Evidence before promotion. A capability cannot enter the next releasestage until its required evidence bundle is complete, current, valid, andapproved.

One control plane. Every roadmap task uses the same release-state,evidence-manifest, approval, exception, rollout, and kill-switch contracts.

Capability-specific evidence. A shared CI run or platform approval may bereferenced, but it cannot silently stand in for capability-specific tests,threats, risks, ownership, or professional review.

Stable required checks. Protected branches depend on documented,stable job identifiers whose semantics cannot be weakened by renaming a jobor changing it to an unconditional success.

Fail closed. A missing, skipped, cancelled, timed-out, stale, malformed,unknown, or unreachable required check is not a pass.

No self-approval. The implementer may prepare evidence but cannot provideevery required approval for their own capability.

No silent waiver. Security, privacy, quality, or accessibility findingsrequire a named remediation owner and an explicit, scoped, expiringdisposition. Inline suppressions and informal chat approval areinsufficient.

Some controls are non-waivable. PHI or secret leakage, tenant escape,missing authorization, unsafe production enablement, absent kill switch,false professional completion, claim effects, or use of real PHI insynthetic evidence cannot be accepted as release debt.

Synthetic means deliberately authored synthetic. Redacted,pseudonymized, masked, de-identified, or copied production data is notsynthetic.

No sensitive test artifacts. Test output, screenshots, traces, databasedumps, videos, reports, logs, and CI artifacts contain no PHI, secrets,tokens, message content, exact patient location, raw media, or reusableidentifiers.

Server authority. Tenant, actor, subject, role, assignment, capabilitystate, approval state, and release state are server-derived andserver-enforced.

Real database behavior. Migration and database constraint evidence runsagainst a fresh, isolated, real local PostgreSQL instance—not mocks,SQLite, or an already-migrated developer database.

Deterministic evidence. Required test inputs, clocks, identifiers,adapters, and expected outputs are controlled and reproducible.

Payload-free observability. Operational signals describe systembehavior without request bodies, clinical content, message bodies,uploaded text, identifiers, tokens, or other sensitive payloads.

Accessibility is a release dimension. Keyboard, screen-reader, contrast,zoom, reflow, reduced motion, mobile operation, clear status, andnon-visual alternatives are tested alongside security and correctness.

Rollback is capability-specific. Every production candidate defineswhat can be disabled, rolled back, rolled forward, reconciled, or restored;“revert the deployment” is not a complete rollback plan.

Database rollback is honest. Irreversible migrations use an approvedexpand/contract and forward-fix plan. They are not labelled reversiblemerely to satisfy a template.

External state is reconciled. Webhooks, queues, payments, messages,vendors, courier events, claims, and other integrations are not assumed tomatch local state after a timeout or failure.

Kill switches are independent of the failed component. A capabilitymust be disableable from a trusted server-side control that does not dependon the vendor, model, queue, browser, or capability path being healthy.

Normal workflows survive disablement. Experimental AI, integrations,messaging, automation, and convenience features fail back to an approvednon-automated path where one exists.

Approvals expire. PIA, TRA, vendor, professional, accessibility,security, model, threat-model, and release approvals have a review date andchange triggers.

Unknown state is denied. Unknown capability, environment, policy,autonomy level, risk tier, owner, evidence type, approval state, exception,rollout cohort, or kill-switch state blocks promotion.

No production-by-default. Experimental capabilities and new externalintegrations are off unless the server verifies an approved release recordfor the requested environment and cohort.

Policy changes are code changes. Changes to required checks, scanners,allowlists, exception schemas, evidence schemas, autonomy definitions,branch rules, or release logic receive the same review and tests asapplication code.

Task 11 cannot approve itself silently. Changes that weaken or bypassTask 11 require independent security and quality review and must be visiblein the release register.

Terminology

Capability: a separately releasable behavior with an owner, boundedpurpose, entry point, effect boundary, risk tier, autonomy level, evidence,approvals, rollout cohort, and kill switch.

Capability version: the immutable combination of capability contract,source commit, schema/migrations, configuration, dependencies, policyversion, and evidence manifest proposed for promotion.

Control: a documented preventive, detective, corrective, or recoveryrequirement.

Control ID: a stable machine-readable identifier for one control.

Gate: an automated or human-reviewed condition that must pass before arelease transition.

Required check: a stable CI status required by protected-branch or releasepolicy.

Evidence item: a sanitized, attributable result proving that a definedtest, review, drill, or check ran against an identified capability version.

Evidence bundle: the immutable manifest and referenced evidence items forone capability-version and release-stage decision.

Evidence manifest: a machine-validated inventory of evidence, hashes,provenance, statuses, owners, approvals, and expiry.

Release register: the authoritative inventory of capabilities and theirrelease-control state.

Promotion: moving a capability to a broader environment, cohort, dataclass, autonomy level, or effect boundary.

Rollout cohort: the exact server-resolved population for which acapability is enabled.

Kill switch: a server-controlled mechanism that denies new capabilityexecution and defines treatment of in-flight work.

Rollback: returning code or configuration to a previously approvedbehavior.

Forward fix: a new migration or deployment that safely repairs anirreversible change.

Reconciliation: comparing local intent, external acknowledgement, andauthoritative outcome to identify and resolve divergence.

Exception: an explicitly approved, scoped, expiring departure from awaivable control.

Remediation owner: the named person accountable for resolving a finding.

Compensating control: a separately tested control that reduces the risk ofan approved temporary exception.

PIA: privacy impact assessment or the project’s approved equivalent.

TRA: threat/risk assessment or the project’s approved equivalent.

Payload-free: containing no sensitive business or health payload, directidentifiers, message content, request/response bodies, secrets, or valuesthat allow reconstruction of the underlying interaction.

Synthetic environment: an environment that is technically prevented fromusing production data, identities, credentials, integrations, or effects.

Fresh migration: applying the complete migration history to an emptyisolated PostgreSQL database.

Constraint test: a database-level test that proves the database rejectsan invalid state even if application code attempts it.

Branch gate: repository-provider configuration that prevents protectedbranch changes when required checks or reviews are absent.

Capability risk tiers

Classify each capability by its highest plausible effect. Do not reduce thetier because a feature is behind a flag or currently uses synthetic data.

Tier

Description

Examples

Minimum consequence

R0

Inert documentation or developer tooling with no runtime, data, security, release, or policy effect

Typographical documentation update

Normal review and content validation

R1

Read-only or deterministic low-impact behavior using synthetic or non-sensitive data

Synthetic UI, local report formatting

Required quality checks, owner, expiry if experimental

R2

Authenticated workflow behavior or mutable non-clinical state with limited and reversible effect

Administrative task state, approved generic reminder intent

Threat model, authorization, tenant, audit, idempotency, accessibility, rollback

R3

PHI-bearing, external integration, automated, retained, or operationally significant behavior

Secure messages, uploads, patient intake, vendor webhook, scheduled automation

PIA/TRA as applicable, integration reconciliation, incident drill, SLO, kill switch, limited rollout

R4

High-consequence professional, clinical, dispensing, prescription, referral, billing, claim, identity, infrastructure, or irreversible-data effect

Assessment completion, prescribing, release, claim action, auth-domain change, destructive retention operation

Explicit professional and specialized approvals, non-waivable evidence, separation of duties, rehearsed contingency, final release authority

When several tiers apply, use the highest. An agent may propose a tier but maynot lower an approved tier without independent quality and security review.

Capability autonomy levels

Autonomy describes what the software can do after initiation. It is independentof model use: deterministic automation can still have high autonomy.

Level

Meaning

Permitted release posture

A0_INERT

Documentation, calculation, or display with no authoritative write or external effect

May be eligible for R0/R1 controls

A1_ASSISTIVE

Produces an untrusted draft, suggestion, or read-only result for substantive human review

Requires provenance, normal workflow, rejection path, and effect separation

A2_HUMAN_TRIGGERED

A specifically authorized person triggers a bounded, validated, reversible action

Requires authorization at action time, confirmation where appropriate, audit, idempotency, rollback

A3_BOUNDED_AUTOMATION

The system schedules or executes a preapproved action without contemporaneous human confirmation

Requires explicit automation approval, prerequisites, monitoring, expiry, circuit breaker, reconciliation, kill switch, and drill

A4_PROHIBITED_AUTONOMY

The system makes or causes a final clinical, prescribing, dispensing, referral, eligibility, billing, claim, privacy-breach-reportability, or similarly high-consequence decision without the required authorized human

Must remain disabled; cannot be promoted under this task

Autonomy level changes are promotions and require a new evidence bundle.

Release stages

Use the following ordered states:

REGISTERED

DESIGN_REVIEW

SYNTHETIC_IMPLEMENTATION

SYNTHETIC_EVIDENCE_REVIEW

APPROVED_SYNTHETIC

NON_PRODUCTION_INTEGRATION

PRE_PRODUCTION_EVIDENCE_REVIEW

APPROVED_LIMITED_COHORT

LIMITED_PRODUCTION

PRODUCTION_EVIDENCE_REVIEW

APPROVED_PRODUCTION

SUSPENDED

REVOKED

EXPIRED

RETIRED

Skipping a stage requires an explicit policy rule proving the skipped stage isnot applicable. An absent record is not NOT_APPLICABLE.

Scope

P0 foundation

Current-state and gap analysis.

Capability, dependency, and authoritative-system inventory.

Stable control catalogue.

Capability risk-tier and autonomy-level classification.

Required CI workflow for TypeScript, ESLint, pure tests, policy checks,secret scanning, dependency review, build validation, and PostgreSQLmigration/constraint suites.

Protected-branch and required-status-check documentation.

Synthetic-data and artifact leakage controls.

Raw process.env, PHI logging, browser storage, protected-cache, andforbidden-integration-import checks.

Shared security, privacy, authorization, tenant, audit, retention,idempotency, concurrency, rollback, downtime, and reconciliation helpers.

Reusable threat-model, trust-boundary, data-flow, and privacy-impacttemplates.

Accessibility test matrix and evidence format.

Payload-free SLI/SLO and observability contracts.

Capability release register and evidence-manifest schema.

Approval, exception, remediation, expiry, and review-date workflow.

Rollout, feature-gate, kill-switch, rollback, and forward-fix contracts.

Incident, privacy-event, vendor-outage, downtime, data-recovery,reconciliation, and automation-disable drills.

Cross-task test-plan and promotion-evidence review protocol.

Synthetic proof that the release gate blocks invalid candidates.

Continuous operation

Review every roadmap task’s test plan before that task implements theaffected capability.

Review capability evidence before promotion.

Re-run required controls for every relevant source, dependency, migration,configuration, vendor, autonomy, data-flow, or policy change.

Maintain SLOs, error budgets, vulnerabilities, exceptions, evidence expiry,release-register accuracy, vendor review dates, kill-switch readiness, anddrill findings.

Revoke or suspend capabilities when evidence expires or required controlsregress.

Track remediation to closure.

Review Task 11 changes for weakening or bypass.

Future production enablement

Task 11 may prepare production-release mechanics. It does not itself authorize:

Live PHI processing.

Production vendors or credentials.

Production schema or authentication changes.

External messages.

Virtual visits.

Real fulfilment, payment, delivery, dispensing, prescribing, or claims.

AI processing of PHI.

A new clinical or professional workflow.

Each requires the affected task’s approvals and evidence in addition to Task11.

Out of scope

Deciding clinical accuracy, professional scope, prescribing authority,dispensing responsibility, referral suitability, or legal compliance.

Inventing consent language, retention periods, breach-reportability rules,residency conclusions, professional standards, or accessibility-policyexceptions.

Acting as the privacy officer, legal counsel, pharmacist approver, securityauthority, procurement authority, or production release authority.

Approving a vendor based on public marketing.

Capturing request bodies, response bodies, clinical text, medication data,message content, uploaded document text, identity answers, contact details,health numbers, exact locations, room secrets, tokens, raw media, SDP, ICEdata, or reusable identifiers in test or observability evidence.

Using production data to make tests realistic.

Copying production databases or object stores into CI.

Adding production credentials to CI for synthetic tests.

Treating code coverage, scanner output, or a green build as sufficientproduction evidence.

Automatically making a privacy-breach notification or legal-reportabilitydetermination.

Silently accepting security or accessibility debt.

Replacing required professional, privacy, legal, security, accessibility,product, or procurement approvals.

Dependencies and authoritative boundaries

Required dependencies

Task 01: safe deterministic synthetic environment, fixed clock, syntheticfixtures, environment separation, and hard production disablement.

Repository governance: applicable AGENTS.md, ownership rules, protectedbranch configuration, and a CI service capable of enforcing required checks.

Database tooling: an isolated local PostgreSQL service compatible withthe production major version and complete migration history.

Capability owners: one accountable owner per registered capability.

Review capacity: quality, security, privacy, accessibility, operations,and any required professional/legal approvers.

Incident ownership: an approved escalation path, even when only asynthetic drill is implemented.

Authoritative systems

The repository and immutable source commit remain authoritative for code.

The migration directory and migration ledger remain authoritative for schemahistory.

The identity service remains authoritative for actor, role, subject, tenant,session, assignment, and revocation.

The capability’s domain service remains authoritative for its business state.

The audit service remains authoritative for append-only security andworkflow events.

The approved retention service remains authoritative for retention, legalhold, archival, and deliberate destruction.

The CI provider reports execution state but does not grant product,professional, privacy, or legal approval.

The release register remains authoritative for release-stage, owner, risktier, autonomy level, evidence references, approvals, expiry, cohort, andkill-switch metadata.

The server-side release-gate service remains authoritative for runtimeenablement.

External vendors remain authoritative only for their documented externalstate; local reconciliation decides whether local state agrees.

Task 11 must not duplicate or override domain truth. It verifies that thedomain authority is preserved.

Execution instructions

Read all applicable AGENTS.md and repository instructions before makingchanges.

Inspect the current repository, CI, tests, Docker configuration, migrations,authentication, logging, storage, integrations, feature flags, deployment,and documentation before proposing paths or commands.

Reuse existing test and build tooling unless it cannot meet a requiredcontrol. Document any replacement.

Preserve existing tenant, identity, patient, pharmacist, assessment,follow-up, messaging, fulfilment, billing, audit, retention, andfinalization boundaries.

Work only with deterministic, obviously synthetic fixtures and markervalues.

Do not connect to production, copy production data, retrieve productionsecrets, apply a live migration, change production authentication, orenable a live vendor.

Create the control catalogue and capability register before claiming that agate is enforced.

Implement shared helpers before duplicating policy checks across tasks.

Give each required CI job a stable identifier and documented semanticcontract.

Ensure protected-branch enforcement treats skipped and missing requiredjobs as failure.

Add negative tests that intentionally violate each critical control andprove the gate blocks them.

Keep evidence generic, synthetic, minimal, and content-scanned beforeartifact publication.

Record tool versions, lockfile state, container image identity, PostgreSQLmajor version, migration head, policy version, source commit, and testseed in evidence.

Review every other task’s proposed test plan before implementation begins.

Review every other task’s evidence bundle before promotion.

Do not approve your own evidence when independent review is required.

Stop only the affected production or integration workstream when externalapproval is missing; continue independent synthetic control-plane workwhen safe.

End with the required final report. Do not report production readinessmerely because Task 11’s synthetic control plane passes.

Workstream A — Current-State, Gap, and Capability Inventory

Repository assessment

Inspect and document:

Repository structure and all applicable instruction files.

Package manager, lockfiles, workspace layout, TypeScript configuration,ESLint configuration, formatting tools, build commands, and test commands.

Existing unit, component, integration, end-to-end, accessibility, security,migration, and database tests.

Existing CI providers, workflows, triggers, permissions, concurrency,caching, artifacts, environments, approvals, and required-check names.

Whether untrusted pull requests can access secrets or privileged tokens.

Use of pull_request_target, privileged containers, self-hosted runners,writable repository tokens, or unpinned third-party CI actions.

Protected branches, direct-push rules, force-push rules, dismissal behavior,stale approvals, CODEOWNERS, merge queue, and administrator bypass.

Existing Dockerfiles, Compose files, database containers, health checks,volumes, migration runners, and teardown behavior.

Production PostgreSQL major version and extensions, without connecting toproduction.

Complete migration order, migration checksums, applied-head assumptions,destructive operations, locks, long transactions, extension requirements,data backfills, and rollback/forward-fix behavior.

Existing database constraints for tenant pinning, singleton assumptions,foreign keys, uniqueness, idempotency, audit immutability, retention, holds,and finalization.

Environment-variable access, configuration modules, schema validation,defaults, secret injection, client-exposed variables, and build-timesubstitution.

Logging, metrics, traces, error monitoring, analytics, session replay,breadcrumbs, request capture, SQL capture, network capture, and debug tools.

Browser storage, service workers, caches, offline behavior, query strings,page titles, referrers, notifications, and client-side state persistence.

External SDKs, integration adapters, model providers, email/SMS/pushproviders, calendar providers, payment providers, courier providers, OCR,storage, and analytics imports.

Existing server-only/client-only import boundaries.

Feature flags, environment flags, cohort rules, kill switches, circuitbreakers, configuration caches, and failure defaults.

Current release notes, release register, PIA/TRA records, threat models,accessibility evidence, incident plans, runbooks, and review dates.

Existing vulnerability handling, dependency update process, exceptionprocess, remediation owners, and expiry enforcement.

Existing SLOs, SLIs, dashboards, alerts, on-call ownership, error budgets,queue monitors, and vendor health checks.

Existing artifacts, screenshots, traces, videos, logs, database dumps, andreports for prohibited data.

Every path by which PHI, production identifiers, credentials, or externaleffects could enter CI or evidence.

Every path by which a required check can be skipped, bypassed, renamed,neutralized, or falsely reported as passing.

Do not infer that a control exists because a dependency is installed or aconfiguration file is present. Identify executable evidence.

Capability inventory

Register every independently releasable capability from Tasks 01–10 and anyexisting repository behavior. At minimum record:

Capability ID and name.

Roadmap task.

Bounded purpose.

Owner and backup owner.

Intended actors and subjects.

Authoritative service.

Entry points.

Reads.

Writes.

External effects.

Immutable effects.

Data classes.

Jurisdictions.

Vendors and subprocessors.

Risk tier.

Autonomy level.

Current release stage.

Required evidence profile.

Required approvals.

Feature gate.

Rollout cohort.

Kill switch.

Rollback or forward-fix path.

SLO and incident owner.

Review and expiry date.

Split capabilities when different behavior, data, autonomy, actors, vendors, oreffect boundaries would require different evidence. Do not register “AgentRx”as one capability.

Gap classification

Classify each gap as:

BLOCKS_FOUNDATION

BLOCKS_SYNTHETIC

BLOCKS_NON_PRODUCTION_INTEGRATION

BLOCKS_LIMITED_PRODUCTION

BLOCKS_PRODUCTION

REMEDIATION_REQUIRED

INFORMATIONAL

For every gap, record:

Gap ID.

Control ID.

Capability.

Evidence.

Consequence.

Remediation owner.

Target stage.

Due date.

Temporary containment.

Exception eligibility.

Verification method.

Status.

Deliverables

docs/task-11/current-state-and-gap-analysis.md

docs/task-11/capability-and-authority-inventory.md

docs/task-11/ci-and-evidence-reachability-analysis.md

Initial gap register

Workstream B — Control Catalogue, Evidence Profiles, and Gate Policy

Stable control catalogue

Create a machine-readable and human-readable control catalogue. Every controlmust contain:

Stable control ID.

Title.

Purpose.

Risk addressed.

Preventive, detective, corrective, or recovery type.

Applicable risk tiers.

Applicable autonomy levels.

Applicable release stages.

Required evidence type.

Automated or manual verification.

Required reviewer role.

Exception eligibility.

Non-waivable flag.

Review cadence.

Change triggers.

Related controls.

Implementation guidance.

Failure consequence.

At minimum include control families for:

QLT — type safety, lint, tests, build, coverage rationale, deterministicexecution.

SEC — secrets, dependencies, authorization, origin/CSRF, session,protected routes, supply chain, egress.

PRV — data minimization, PHI leakage, logs, telemetry, browser storage,cache, referrer, evidence, retention.

TEN — tenant pinning and cross-tenant isolation.

DB — migrations, constraints, data integrity, locking, compatibility,rollback/forward fix.

AUD — append-only audit, safe payloads, access, reconciliation.

IDM — actor, subject, role, assignment, session, revocation.

INT — adapter, webhook, idempotency, retry, ordering, reconciliation,outage.

A11Y — keyboard, semantics, focus, contrast, zoom, reflow, reduced motion,mobile, alternatives.

OPS — SLIs, SLOs, alerts, queue health, incident, downtime, recovery.

REL — evidence, approvals, register, cohort, feature gate, kill switch,rollout, rollback.

AUT — automation prerequisites, expiry, circuit breaker, human override,safe disablement.

AI — capability separation, synthetic isolation, provenance, model/promptinventory, effect boundary, global and per-capability kill switches.

PRO — required pharmacist or other professional review without attemptingto supply that review.

Evidence profiles

Define reusable evidence profiles rather than allowing each task to choosearbitrary gates. At minimum:

Profile

Default applicability

Required evidence families

EP-R0-DOCS

Inert documentation

Content validation, links if applicable, owner review

EP-R1-SYNTHETIC

Synthetic/read-only capability

Quality, synthetic isolation, accessibility where UI exists, owner, expiry

EP-R2-WORKFLOW

Authenticated mutable workflow

R1 plus authorization, tenant, audit, state, idempotency, concurrency, rollback

EP-R3-PHI-INTEGRATION

PHI, messages, uploads, vendor, queue, scheduled automation

R2 plus privacy flow, PIA/TRA as applicable, vendor, retention, reconciliation, SLO, incident, kill switch

EP-R4-HIGH-CONSEQUENCE

Professional, identity, infrastructure, irreversible, dispensing, claim, or finalization effect

R3 plus specialized approval, separation of duties, constraint proof, contingency rehearsal, limited cohort, final release authority

The capability’s profile may add controls. It may not remove a control requiredby its risk tier without a valid policy-level applicability rule or approvedexception where the control is waivable.

Gate decision contract

For each release transition, compute:

Capability-version identity.

Current policy version.

Required evidence profile.

Required controls.

Evidence validity.

Evidence freshness.

Approval validity.

Exception validity.

Unresolved findings.

Risk-tier and autonomy compatibility.

Dependency state.

Feature-gate state.

Kill-switch readiness.

Rollback readiness.

SLO readiness.

Cohort.

Decision.

Safe reason codes.

Allowed decisions:

ALLOW

DENY_MISSING_EVIDENCE

DENY_FAILED_CONTROL

DENY_STALE_EVIDENCE

DENY_MISSING_APPROVAL

DENY_EXPIRED_APPROVAL

DENY_UNRESOLVED_FINDING

DENY_INVALID_EXCEPTION

DENY_RISK_AUTONOMY_MISMATCH

DENY_DEPENDENCY

DENY_KILL_SWITCH

DENY_ROLLBACK

DENY_SLO

DENY_UNKNOWN

Only ALLOW permits promotion. The gate response must contain safe metadata,not evidence payloads or sensitive context.

Non-waivable controls

Mark at least the following as non-waivable:

Known PHI, secret, token, credential, message-content, or real-patient datain source, fixtures, logs, screenshots, traces, or evidence.

Cross-tenant or cross-patient access.

Missing server-side authorization on a protected operation.

Client-controlled actor, subject, role, tenant, pharmacy, patient,assessment, claim, approval, autonomy, or release state.

Synthetic code or credentials enableable in production.

Production credentials available to untrusted CI.

A skipped or missing required check treated as pass.

A capability without an owner, bounded purpose, expiry where experimental,or tested kill switch.

A high-consequence automation classified below its actual autonomy.

Patient departure, disconnect, timeout, vendor event, delivery receipt, modeloutput, or other non-professional event causing assessment, dispensing,referral, billing, or claim completion.

Missing database constraint when application-only enforcement could permit acritical invalid state.

Evidence containing production database content.

A public, reusable, or query-string bearer token.

Browser persistence of PHI or reusable authorization material.

Protected response configured as shared-cacheable.

Recording, transcription, session replay, or prohibited analytics on aprotected workflow.

Unapproved production migration, authentication change, vendor credential,external delivery, destructive operation, or PHI flow.

Accessibility failure that prevents completion by keyboard, screen reader,zoom/reflow, or an approved non-camera/fallback path.

Kill switch that cannot stop new work or rejects disablement when the vendoris unavailable.

Unknown release-gate state failing open.

Deliverables

docs/task-11/control-catalogue.md

config/release-controls/control-catalogue.*

docs/task-11/evidence-profiles.md

Gate-decision schema and validator

Non-waivable control tests

Workstream C — Required CI Workflow and Protected-Branch Gates

CI threat model

Before implementation, model:

Malicious or compromised dependency.

Untrusted pull request.

Forked pull request.

Workflow-file change.

Cache poisoning.

Artifact poisoning.

Secret exfiltration.

Overprivileged repository token.

Unpinned action or container mutation.

Self-hosted runner persistence.

pull_request_target misuse.

Script injection through branch names, commit messages, matrix values, paths,or generated output.

Required job skipped by path filters.

Required job renamed or converted to no-op.

Test process reaching production.

Test artifact containing PHI or secrets.

False-green aggregate job.

Concurrent workflow race.

Cancelled superseded run incorrectly satisfying a gate.

Stale result attached to a different commit.

Required job contract

Adapt names to the existing CI provider only if protected-branch identifiersremain stable and documented. The required logical jobs are:

Stable job ID

Purpose

Required behavior

quality-install

Reproducible dependency installation

Use the committed lockfile, fail on lockfile drift, record runtime/package-manager versions

quality-typescript

Type safety

Run the repository’s strict TypeScript check without emitting build artifacts

quality-eslint

Static quality rules

Run ESLint with warnings treated according to documented policy; policy rules cannot be silently disabled

quality-pure-tests

Deterministic tests

Run unit/pure tests with fixed timezone, locale, clock where needed, and no network

quality-build

Production build boundary

Build with synthetic/non-secret configuration and fail on client/server import violations

security-secrets

Secret and high-entropy credential scanning

Scan relevant history/diff and working tree according to policy; sanitize findings

security-dependencies

Dependency and lockfile review

Block prohibited licenses/severities according to approved policy; distinguish new PR risk from existing backlog

security-policy

Forbidden-pattern and configuration checks

Run raw-env, logging, storage, integration-import, protected-cache, URL/token, synthetic-production, and suppression checks

database-fresh-migrations

Empty-database migration proof

Start isolated real PostgreSQL, apply every migration from zero, and verify expected head

database-constraints

Database invariant proof

Run tenant, uniqueness, authorization-adjacent, audit, retention/hold, idempotency, and concurrency tests against PostgreSQL

accessibility-automated

Automated accessibility smoke

Run deterministic component/page checks for registered critical flows

release-evidence-validate

Manifest and register validation

Validate owners, profiles, evidence, approvals, exceptions, expiry, cohort, rollback, and kill-switch metadata

release-gate

Required aggregate decision

Fail unless every applicable required job completed successfully for the exact commit and no required result is missing, skipped, neutral, stale, or cancelled

Add framework-specific tests when present, including:

Component tests.

API contract tests.

Server-action tests.

End-to-end tests.

Migration upgrade-path tests.

Package-boundary tests.

Infrastructure validation.

Do not make the entire workflow depend on an external provider that is notrequired for deterministic CI. Use approved deterministic adapters.

Trigger and permission rules

The workflow must:

Run on pull requests affecting application code, migrations, tests,configuration, dependencies, CI, control policy, release register, evidenceschemas, or deployment logic.

Run on protected-branch pushes or merge queue commits.

Run on manual dispatch only as an additional diagnostic path, never as asubstitute for the pull-request commit’s required run.

Use least-privilege repository permissions.

Keep write permissions and secrets out of untrusted pull-request jobs.

Avoid privileged pull_request_target execution of untrusted code.

Pin third-party actions and container images according to the repository’ssupply-chain policy.

Prevent branch, path, commit, issue, or matrix data from becoming executableshell.

Use concurrency cancellation safely without allowing a cancelled run tosatisfy a gate.

Associate results with the exact commit SHA.

Prevent path filtering from skipping a required job; jobs may quicklydetermine NOT_APPLICABLE through a validated applicability rule but muststill report a checked result.

Use a network-denied or allowlisted environment for pure and policy tests.

Never expose production secrets to build previews, forks, or synthetic tests.

Branch protection

Document and, where authorized, configure:

Protected branches.

Pull-request requirement.

Required approving reviews.

CODEOWNERS for CI, security policy, release policy, authentication,migrations, retention, audit, and production deployment files.

Dismissal of stale approvals after relevant changes.

Resolution of review conversations.

Required status checks, including exact stable names.

Branches required to be up to date or merge-queue behavior.

Direct-push and force-push restrictions.

Administrator and service-account bypass policy.

Signed commit or provenance requirements if adopted by the project.

Deployment environment approvals.

Production deployment source restrictions.

Emergency/break-glass procedure, logging, expiry, and retrospective review.

If repository permissions do not allow branch-protection changes:

Produce the exact required configuration.

Record the external owner.

Mark enforcement BLOCKED.

Do not claim that PR merge prevention is active.

Artifact rules

Required artifacts must:

Use synthetic generic names.

Be generated from the exact commit.

Exclude environment dumps, database dumps, raw logs, request/responsepayloads, browser profiles, videos with sensitive content, source maps withembedded secrets, and full vendor payloads.

Pass the evidence-content scanner before publication.

Have documented retention.

Include a manifest and cryptographic hash.

Be inaccessible from public links.

Expire or be retained according to approved evidence policy.

Do not upload an artifact merely because a test tool produces it by default.

Branch-gate verification

Prove with a safe test branch or repository-provider inspection that:

A failing required job blocks merge.

A missing required job blocks merge.

A skipped required job blocks merge.

A cancelled required job blocks merge.

A stale success from another commit does not permit merge.

A workflow-only change triggers independent owner review.

An expired exception causes release-evidence-validate to fail.

A malformed release entry causes release-gate to fail.

Administrator bypass, if allowed at all, creates durable evidence andretrospective review work.

Deliverables

Required CI workflow files

docs/task-11/ci-required-checks.md

docs/task-11/branch-protection-and-merge-gates.md

docs/task-11/ci-threat-model.md

CI permissions and supply-chain review

Branch-gate verification evidence

Workstream D — Fresh PostgreSQL Migrations, Constraints, and Data Safety

Isolated database harness

Build a deterministic test harness that:

Starts a new PostgreSQL container with an empty named-for-test volume.

Pins the PostgreSQL major version compatible with production.

Pins the container image according to supply-chain policy.

Uses a test-only database, role, password, network, and port.

Uses no production database URL, credentials, snapshot, backup, logical dump,object-store export, or customer data.

Fails if an environment value resembles an approved production host,project, tenant, or credential marker.

Waits for an explicit health check.

Applies the complete migration history from zero.

Verifies the expected migration head and checksums.

Runs database constraint and integration tests.

Captures only sanitized schema/test metadata.

Tears down the isolated database and test volume.

Fails hard if teardown targets cannot be proven test-scoped.

SQLite, an ORM mock, an in-memory adapter, or a developer’s existing databasedoes not satisfy this workstream.

Fresh-migration proof

Prove:

Every migration applies in deterministic order.

A fresh database reaches the expected schema head.

Required extensions and functions are explicitly created or verified.

Migration checksums or equivalent identity are recorded.

No migration assumes synthetic seed rows already exist unless the migrationcreates them safely.

Demo or synthetic rows are unmistakable and fail hard if enabled inproduction.

No migration reaches an external network service.

No migration logs row contents or secrets.

Transaction boundaries are documented.

Long locks and table rewrites are identified.

Non-transactional operations are identified.

Irreversible operations are identified.

Required backfills are bounded, restartable, and observable without payloadlogging.

Upgrade-path proof

Where repository history permits, also test:

Upgrade from the last approved schema baseline to the proposed head.

Expand/contract compatibility between the old and new application versions.

Backfill restart after interruption.

Mixed-version reads and writes during rolling deployment.

Old-code behavior against the expanded schema.

New-code behavior before contract cleanup.

Migration idempotency where the migration framework permits rerun checks.

Safe refusal when migration preconditions are not met.

Use schema-only, generated, or deliberately authored synthetic baselines. Donot use a sanitized production dump.

Required constraint evidence

Run database-level tests for applicable capabilities:

Tenant-scoped uniqueness.

Pharmacy or custodian pinning.

Actor-to-subject and entity relationships where represented in schema.

Foreign keys and delete behavior.

Required fields and valid enums.

Checked state transitions where represented in schema.

Singleton constraints.

Idempotency keys.

Duplicate webhook or outbox event handling.

Append-only audit behavior.

Immutable completion/finalization fields.

Retention-state integrity.

Legal-hold precedence.

Deliberate-destruction approval prerequisites.

Supersession rather than destructive clinical correction where required.

Claim, message, fulfilment, or assessment boundaries where represented inschema.

Concurrent insert/update conflicts.

Stale-version rejection.

Unknown state rejection.

Application-only tests do not replace critical database constraint evidence.

Migration risk record

For every migration, record:

Migration ID and checksum.

Capability and owner.

Schema objects affected.

Data classes affected.

Estimated row and size profile without production payloads.

Lock and transaction behavior.

Backfill behavior.

Old/new application compatibility.

Rollback classification.

Forward-fix plan.

Backup/restore dependency.

Reconciliation requirement.

Downtime expectation.

Monitoring.

Kill or pause control.

Required approvals.

Evidence.

Do not claim zero downtime without a representative test and approvedoperational evidence.

Database evidence hygiene

The harness must not publish:

Row dumps.

Query parameter values.

ORM entity serialization.

SQL statements containing values.

Database URLs or credentials.

Production hostnames.

Patient, pharmacy, clinician, claim, message, or assessment identifiers.

Uploaded document metadata.

Exact retention targets or held-record identifiers.

Safe evidence may include:

PostgreSQL major version.

Migration IDs and hashes.

Schema head.

Test names.

Pass/fail state.

Duration.

Sanitized safe reason code.

Fixed synthetic marker set version.

Deliverables

Fresh PostgreSQL Docker/Compose test harness

Migration and constraint test suite

docs/task-11/database-migration-test-contract.md

docs/task-11/migration-risk-and-rollback-template.md

Sanitized fresh-migration evidence

Workstream E — Security and Privacy Policy Checks and Shared Test Helpers

Policy-check architecture

Implement policy checks as versioned repository code with:

Stable control IDs.

Deterministic inputs.

Documented scope.

Test fixtures containing safe marker values.

Positive tests.

Negative tests.

Safe findings.

Central allowlists.

Structured, expiring exceptions.

A machine-readable result.

A concise human-readable result.

A simple regular expression may be one layer, but critical controls must notdepend on one broad regex with an undocumented allowlist. Prefer:

AST-aware checks where syntax matters.

Import-graph checks for client/server and integration boundaries.

Configuration schema validation for environment access.

Runtime leakage tests for logs, URLs, caches, and storage.

Dependency graph and lockfile inspection for supply-chain rules.

Every policy-check failure must identify:

Control ID.

Safe file and line reference where appropriate.

Safe finding category.

Why it matters.

Approved remediation path.

Exception eligibility.

Never print the matched secret, PHI marker, token, or message content.

Raw environment access

Require one or more approved server-side configuration boundaries that:

Read environment variables.

Validate required values and types at startup.

Separate public and server-only values.

Reject unknown or unsafe environment combinations where appropriate.

Reject production credentials in synthetic environments.

Reject synthetic credentials or fixtures in production.

Expose typed configuration to application modules.

Redact secrets from errors and inspection.

Fail CI when raw process.env access occurs outside explicitly approved files.The allowlist must:

Name exact files or modules.

State the reason.

State allowed variable prefixes or keys where practical.

Have an owner.

Have a review date.

Fail when the referenced file no longer exists.

Also detect:

Dynamic environment-key construction.

Object spreading or serialization of the environment.

Returning configuration objects to clients.

Client-exposed prefixes containing server secrets.

Environment dumps in diagnostics.

Secret-bearing values embedded at build time.

Defaults that silently enable production vendors.

Missing startup validation.

Do not hardcode a secret merely to avoid the raw-environment rule.

PHI and sensitive logging checks

Create an approved payload-free logger with:

Static event names.

Safe enumerated reason codes.

Severity.

Service.

Environment.

Build/release version.

Short-lived correlation reference when necessary.

Duration or count.

Outcome.

The logger must reject or sanitize:

Request and response bodies.

Form data.

Uploaded text or metadata.

Clinical content.

Symptoms.

Medication or allergy information.

Assessment or care-plan content.

Message bodies.

Identity-verification answers.

Contact details.

Health numbers.

Exact patient locations.

Full URLs or query strings.

Authorization, cookie, signature, or webhook headers.

Tokens, secrets, room credentials, and signed links.

Raw vendor payloads.

Raw SQL parameters.

Raw SDP, ICE, TURN, media, or device details.

Model prompts and outputs.

Reviewer free text.

Static checks must identify:

console.* in server/runtime code outside approved tooling.

Direct logger calls with request, response, error-context, domain entity, oruser-controlled objects.

String interpolation of sensitive variables into logs.

Serialization of arbitrary exceptions.

Error-monitor breadcrumbs containing inputs.

Debug middleware that captures bodies or headers.

ORM/query logging with bound values.

Provider SDK logging enabled on protected paths.

Runtime tests must inject unmistakable synthetic forbidden markers throughevery protected flow and prove they do not appear in:

Standard output.

Standard error.

Application logs.

Structured logs.

Traces.

Metrics.

Error monitoring.

Test reports.

Screenshots.

Videos.

CI summaries.

Artifacts.

Browser storage and protected-client checks

Fail protected-flow checks when PHI, sensitive state, or reusable authorizationmaterial is written to:

localStorage.

sessionStorage.

IndexedDB.

Cache Storage.

Service-worker caches.

Browser extension messages.

Persisted client-state libraries.

Unencrypted offline databases.

URL query strings.

URL fragments.

Page titles.

Browser history state containing sensitive values.

Review:

Cookies for HttpOnly, Secure, SameSite, scope, rotation, and expiry asapplicable.

Protected responses for Cache-Control: no-store or the approved equivalent.

Shared cache headers.

Service-worker route behavior.

Referrer policy.

Clipboard behavior.

Download naming.

Notification previews.

Analytics page names.

Error boundaries.

Client hydration payloads.

Browser-storage exceptions for protected workflows are not allowed merely forconvenience. If an approved offline requirement later exists, it needs aseparate threat model, encryption/key model, retention rule, revocation model,and production approval.

Forbidden integration imports

Maintain a machine-readable import policy that identifies:

Server-only packages.

Client-only packages.

Synthetic-only adapters.

Production-only adapters.

Vendor SDKs.

Task-owned domain boundaries.

Approved shared packages.

Forbidden direct database access.

Forbidden direct audit writes.

Forbidden direct claim, messaging, payment, courier, calendar, model, OCR,or storage calls.

Fail CI when:

Client code imports a server-only module.

Synthetic code imports a production adapter or credential module.

Production code imports synthetic fixtures.

Domain code bypasses its approved adapter.

A feature imports another task’s internal implementation instead of itsapproved contract.

An AI candidate imports messaging, billing, prescribing, dispensing,referral, or tool-execution modules.

A virtual-care event imports claim-creation code.

A courier or delivery event imports pharmacist-release code.

A notification template imports PHI-bearing domain entities.

A policy check or release gate imports application code with side effects.

A test helper can resolve a production integration through defaultdependency injection.

Unknown integration packages fail the import-policy check until classified.

Secret scanning

Use an approved secret scanner and add safe custom patterns for project risks,including:

Cloud access keys.

Database URLs.

Private keys.

OAuth credentials.

Webhook secrets.

API tokens.

Signed URLs.

TURN credentials.

Vendor meeting secrets.

Model provider keys.

SMS/email/push provider credentials.

Payment and courier credentials.

Session or encryption secrets.

Health-card-like marker formats only when the rule can avoid printing orretaining matched values.

Scan:

Changed files.

Relevant commit history according to repository policy.

Lockfiles and generated configuration where secrets can be embedded.

CI workflows.

Docker and Compose configuration.

Documentation and example files.

Evidence and test artifacts before upload.

Test values must be unmistakably synthetic and scanner-approved. Do not addrealistic credentials to fixtures.

Dependency review

The dependency gate must:

Detect new direct and transitive dependencies.

Detect lockfile changes not explained by the manifest.

Record package, version, source, integrity identity, runtime/build/dev scope,owner, purpose, and affected capability.

Check approved vulnerability policy.

Check prohibited sources and unresolved Git dependencies.

Check abandoned or unmaintained critical packages according to approvedreview.

Review install scripts, native modules, postinstall behavior, and networkaccess for high-risk dependencies.

Review license policy where applicable.

Require extra review for authentication, cryptography, logging, analytics,session replay, healthcare integrations, payment, messaging, model, OCR,file parsing, and native-code packages.

Distinguish a new vulnerability introduced by a pull request from existingbacklog without hiding either.

Assign remediation owners and deadlines through policy.

Do not automatically update a dependency and claim the vulnerability resolvedwithout running applicable compatibility and security tests.

Suppression and exception checks

Fail CI for undocumented:

ESLint disable comments.

TypeScript suppression directives.

Test skips or .only.

Vulnerability ignores.

Secret-scan ignores.

Accessibility-rule disables.

Coverage excludes.

Policy-check allowlist changes.

Dependency-review overrides.

Runtime feature-gate bypasses.

An allowed suppression must reference a valid exception record containing:

Exception ID.

Exact control.

Exact scope.

Owner.

Independent approver.

Rationale.

Compensating control.

Verification.

Created date.

Expiry date.

Remediation issue.

An expired, overly broad, missing, unknown, or malformed exception fails CI.

Shared helper contracts

Provide test helpers or equivalent reusable assertions for:

assertSyntheticOnly

assertNoForbiddenMarkers

assertPayloadFreeLogs

assertNoBrowserPersistence

assertProtectedCacheHeaders

assertNoSensitiveUrl

assertServerDerivedActor

assertServerDerivedTenant

assertActorSubjectBinding

assertTenantPinned

assertCrossTenantDenied

assertProtectedRouteDefaultDeny

assertAppendOnlyAudit

assertSafeAuditEnvelope

assertIdempotent

assertStaleVersionDenied

assertConcurrentWinnerDefined

assertExternalStateReconciled

assertKillSwitchStopsNewWork

assertDelayedWorkRejectedAfterKill

assertNormalWorkflowAvailable

assertEvidenceSanitized

assertNoSharedCache

assertNoProductionAdapterReachable

Names may follow repository conventions. Semantics must remain documented andtested.

Deliverables

Security/privacy policy-check package

Shared cross-cutting test-helper package

Raw-environment policy and typed configuration boundary

Logging and telemetry safe-envelope validators

Browser-storage and protected-cache tests

Forbidden-import graph and policy

Secret-scan configuration and safe fixtures

Dependency-review policy

Suppression/exception validator

docs/task-11/security-privacy-test-helpers.md

docs/task-11/forbidden-pattern-policy.md

Workstream F — Reusable Threat Model, Trust-Boundary, and Privacy/Data-Flow Templates

Threat-model template

Create one reusable template that every R2–R4 capability completes. It mustrequire:

Capability ID and version.

Owner and reviewers.

Purpose and explicit exclusions.

Risk tier and autonomy level.

Release stage.

Intended users, actors, subjects, and administrators.

Assets.

Entry points.

Trust boundaries.

Data stores.

Data flows.

External vendors and subprocessors.

Credentials and keys.

Authoritative systems.

External and immutable effects.

Assumptions.

Dependencies.

Abuse cases.

Threats.

Existing controls.

Proposed controls.

Verification evidence.

Residual risk.

Accepted exceptions.

Incident indicators.

Kill and containment actions.

Review date.

Change triggers.

At minimum assess:

Spoofed actor, subject, role, tenant, pharmacy, patient, clinician, support,vendor, or service.

Link possession treated as authorization.

Session expiry, revocation, replay, fixation, substitution, and audienceconfusion.

Cross-tenant and cross-patient access.

Client-supplied authority.

Insecure direct object reference.

CSRF, origin, and cross-site behavior.

Injection and unsafe file/document parsing.

Mass assignment and overposting.

Race conditions and stale writes.

Duplicate events and idempotency failure.

Reordered or replayed webhooks.

Queue poison messages.

External timeout with unknown outcome.

Vendor compromise or outage.

Dependency or build compromise.

Secrets in source, CI, artifacts, or logs.

PHI in URLs, browser storage, analytics, telemetry, notifications, orevidence.

Shared caching of protected content.

Support/admin abuse.

Audit tampering.

Retention or deletion bypass.

Legal-hold violation.

Backup persistence.

Rollback re-enabling unsafe behavior.

Feature-gate or kill-switch bypass.

Synthetic implementation enabled in production.

Automation operating after approval or consent expires.

Accessibility failure causing an unsafe or misleading action.

Denial of service, queue buildup, resource exhaustion, or retry storm.

Unknown states failing open.

Trust-boundary diagram template

Require a diagram and accompanying table showing:

Browser or device.

Edge/proxy.

Application services.

Identity service.

Domain service.

Database.

Object storage.

Queue.

Audit service.

Release-gate service.

Observability path.

External vendor.

Staff/admin support boundary.

CI/build boundary.

Every edge must record:

Source and destination.

Direction.

Protocol.

Authentication.

Authorization.

Data classification.

Minimum fields.

Encryption.

Region or residency evidence where relevant.

Logging behavior.

Retry/idempotency.

Failure behavior.

Reconciliation.

Owner.

Do not draw a line labelled only “secure API.”

Privacy/data-flow template

Create one reusable field-level privacy template that requires:

Dataset and field group.

Purpose.

Collection source.

Legal authority or consent basis to be supplied by the authorized reviewer.

Necessity.

Data classification.

Whether PHI.

Direct or indirect identifier.

System of record.

Authorized roles.

Tenant/custodian scope.

Client exposure.

Vendor/subprocessor exposure.

Cross-border or region path.

Encryption in transit and at rest.

Key ownership.

Application-log behavior.

Audit behavior.

Metrics/trace behavior.

Browser-storage behavior.

Cache behavior.

Notification/calendar behavior.

Retention trigger.

Proposed retention period.

Required approval.

Deletion or archival.

Backup behavior.

Legal-hold behavior.

Data-subject access/correction behavior.

Incident containment.

Data return/vendor exit.

Evidence.

Do not invent a legally required retention period. Use TBD_APPROVAL_REQUIREDand block the relevant production stage when the responsible reviewer has notapproved one.

Data classification

At minimum distinguish:

PUBLIC

INTERNAL

CONFIDENTIAL

SECURITY_SENSITIVE

PHI

SECRET

SYNTHETIC

SYNTHETIC_FORBIDDEN_MARKER

Classification is not mutually exclusive where a synthetic marker is also usedto test a PHI sink. Do not classify de-identified production data asSYNTHETIC.

Privacy invariants

Every capability must prove applicable invariants:

Collect only the approved minimum data.

Do not use a new purpose without review.

Do not infer consent from delivery, login, or link possession.

Do not expose PHI to unrelated tenants, patients, staff, vendors, analytics,logs, or evidence.

Do not put PHI or reusable tokens in URLs.

Do not persist PHI in browser storage.

Do not place PHI in generic notifications, calendars, page titles, orreferrers.

Do not treat an opaque ID as non-sensitive merely because it is opaque.

Do not retain data indefinitely because a deletion rule is unresolved.

Do not destroy records subject to a hold.

Do not claim a privacy event is legally reportable without authorized review.

Do not claim Canadian residency without verified architecture, contract, anddata-route evidence.

Template review

Templates themselves require:

Quality review.

Security review.

Privacy review.

Accessibility review where the template produces user-facing evidence.

Versioning.

Change history.

Review date.

Backward-compatibility or migration plan for existing capability records.

Deliverables

docs/task-11/templates/threat-model-template.md

docs/task-11/templates/trust-boundary-and-data-flow-template.md

docs/task-11/templates/privacy-field-inventory-template.md

docs/task-11/templates/control-evidence-mapping-template.md

Machine-readable template schemas and validators

One completed synthetic example

Workstream G — Cross-Cutting Authorization, Integrity, Recovery, and Reconciliation Evidence

Required evidence contract

For every applicable control, evidence must state:

Capability and version.

Control ID.

Risk tier and autonomy level.

Test or review ID.

Exact source commit.

Environment classification.

Fixture-set version.

Test-tool version.

Preconditions.

Sanitized action.

Expected safe outcome.

Actual safe outcome.

Pass/fail/block status.

Timestamp.

Evidence producer.

Reviewer where required.

Artifact reference and hash.

Expiry or review date.

A screenshot without an assertion, test identity, commit, expected result, andreview context is not sufficient evidence.

Authorization evidence

For each protected read, write, transition, and external effect, test:

Unauthenticated actor.

Expired session.

Revoked session.

Wrong audience.

Wrong actor type.

Wrong role.

Inactive account.

Wrong subject.

Wrong assignment.

Wrong patient.

Wrong pharmacist.

Wrong pharmacy.

Wrong tenant.

Wrong custodian.

Wrong assessment, visit, thread, request, claim, order, or other parentobject.

Client-supplied role or scope.

Stale authorization after a state change.

Authorization change during an in-flight operation.

Unknown actor, subject, role, state, or relationship.

Prove:

Every protected route denies by default.

List endpoints and counts do not leak cross-tenant existence.

Error messages do not distinguish unauthorized existence.

UI hiding is not the control.

Background workers and webhooks re-establish server-side authority.

Support/admin access is separately authorized, time-bounded, audited, andreviewed.

Tenant-pinning evidence

Prove:

Tenant/pharmacy scope is derived from the authenticated server context or anapproved signed service context.

A client cannot select or override tenant scope.

Repository methods require tenant context.

Queries include tenant scope.

Writes preserve tenant scope.

Unique constraints include tenant where required.

Foreign-key relationships cannot cross tenant boundaries.

Object-storage paths and signed access are tenant-bound.

Queue messages contain only the minimum server-owned tenant routing reference.

Cache keys and invalidation are tenant-safe.

Audit events include safe tenant/custodian scope where necessary.

Reconciliation cannot attach an external event to the wrong tenant.

Include cross-tenant pairwise tests using unmistakable synthetic tenants.

Audit evidence

Prove:

Required security and workflow events are emitted once.

Audit records are append-only.

Corrections use supersession rather than destructive mutation where required.

Actor, subject, tenant/custodian, capability, action, outcome, reason code,policy version, correlation reference, source service, and time areserver-derived as applicable.

Audit does not contain clinical content, message bodies, identity answers,exact location, contact details, tokens, secrets, raw vendor payloads, rawmedia, or model prompts/outputs.

Denied actions are audited safely.

Duplicate or replayed events are distinguishable without duplicate effects.

Audit failure behavior is defined for high-consequence operations.

Audit access is authorized and audited.

Audit export and retention are controlled.

Do not use application logs as the audit record.

Retention and legal-hold evidence

Prove applicable behavior for:

Retention trigger.

Approved retention policy version.

Expiry calculation.

Recalculation after a relevant event.

Archive state.

Pending deletion.

Legal hold.

Hold precedence.

Release of hold.

Backup expiry.

Failed deletion.

Retry.

Reconciliation.

Data-subject access or correction preservation.

Immutable correction supersession.

Deliberate destruction approval.

Dry-run output.

Two-person approval where required by policy.

Unknown policy or state.

Use synthetic timestamps and identifiers. Do not invent or encode anunapproved legal retention period in production logic.

Idempotency evidence

For every operation that may be retried, prove:

A server-generated or validated idempotency key.

Scope to actor/tenant/capability/operation as appropriate.

Canonical request identity without retaining sensitive payload.

First accepted result.

Exact replay.

Conflicting reuse.

Concurrent duplicate.

Retry after timeout.

Retry after partial local commit.

Retry after external acknowledgement.

Expiry and cleanup.

Unknown external outcome.

Safe response without duplicate effect.

Do not assume HTTP method semantics alone provide idempotency.

Concurrency evidence

Create deterministic race tests for:

Two authorized writers.

Authorized and newly revoked writer.

Patient and pharmacist transitions.

Duplicate tabs.

Concurrent devices.

Duplicate webhook delivery.

Reordered webhook delivery.

Cancel versus send.

Consent withdrawal versus dispatch.

Kill switch versus queued work.

Rollback versus in-flight work.

Retention job versus legal hold.

Assessment completion versus authorization change.

Claim action versus visit or consent change.

Release versus delivery failure.

Two administrators approving a destructive action.

For each race, define:

Allowed winner.

Rejected loser.

Version/token behavior.

Database constraint.

Idempotency behavior.

Audit events.

Reconciliation.

User-visible outcome.

Unknown-state behavior.

Avoid tests that pass because the race did not occur. Use barriers, controlledschedulers, database locks, or equivalent deterministic synchronization.

Rollback and forward-fix evidence

For each capability prove:

Previous approved version.

Compatibility boundary.

Configuration rollback.

Code rollback.

Feature disablement.

In-flight behavior.

Queue behavior.

External-event behavior.

Cache invalidation.

Session behavior.

Database compatibility.

Forward-fix path for irreversible changes.

Reconciliation after rollback.

Evidence that the normal workflow remains usable.

A rollback rehearsal must verify system state after the rollback; a successfuldeployment command is not enough.

Downtime evidence

Model and test:

Application unavailable.

Identity unavailable.

Database unavailable.

Queue unavailable.

Object storage unavailable.

Audit service unavailable.

Release-gate service unavailable.

Observability unavailable.

External vendor unavailable.

Partial regional/network failure.

Read-only mode.

Maintenance mode.

Recovery.

Define:

Which actions fail closed.

Which safe reads remain available.

Which writes are queued, denied, or retried.

Patient and staff messages.

Non-digital or manual fallback.

Maximum queued-work age.

Duplicate prevention.

Recovery ordering.

Reconciliation.

Incident escalation.

Do not claim a manual fallback exists unless it is documented, accessible,owned, and rehearsed.

Reconciliation evidence

For every external or asynchronous integration, distinguish:

Local intent.

Dispatch attempt.

Vendor acknowledgement.

Vendor outcome.

Local authoritative outcome.

Reconciliation state.

Test:

Timeout before acknowledgement.

Timeout after external acceptance.

Duplicate acknowledgement.

Replayed event.

Reordered event.

Missing event.

Malformed event.

Unknown event.

Wrong tenant or capability.

Late event after cancellation.

Late event after consent revocation.

Late event after kill.

Vendor reports success but local commit fails.

Local reports sent but vendor has no record.

Manual correction.

Reconciliation retry.

Irreconcilable divergence.

No external receipt may silently become a clinical, dispensing, claim, or otherprofessional completion event.

Deliverables

Shared authorization and tenant-pinning suites

Shared audit and payload-safety suites

Shared retention/hold suites

Shared idempotency and deterministic race harness

Shared rollback/downtime/reconciliation harness

docs/task-11/cross-cutting-test-evidence-standard.md

docs/task-11/authorization-tenant-audit-retention-test-matrix.md

docs/task-11/idempotency-concurrency-rollback-reconciliation-matrix.md

Workstream H — Accessibility Test Matrix and Manual Evidence

Accessibility policy

Define the project’s current WCAG-aligned target using current officialsources and applicable organizational/legal review. Do not claim legalconformance based only on automated tests.

Accessibility is required for:

Patient workflows.

Pharmacist workflows.

Administrator/support workflows needed during an incident.

Consent and privacy controls.

Authentication and recovery.

Denied, expired, offline, degraded, and unknown states.

Feature-disablement and fallback states.

Release-critical internal tools where inaccessible operation could create asafety or privacy risk.

Required test matrix

For every registered critical flow, record and test:

Dimension

Required evidence

375px mobile

Completion without horizontal scrolling or clipped essential controls

Desktop

Complete workflow at the project’s supported desktop viewport

Keyboard

Logical traversal, operation, escape, and no trap

Focus

Visible, persistent focus and sensible focus restoration

Landmarks/headings

Logical regions, headings, labels, and hierarchy

Screen reader

Accessible names, roles, states, errors, status announcements, and reading order

Contrast

Text, component, state, focus, and non-text contrast against the approved target

200% zoom

Usable layout and readable content

400% zoom/reflow

Single-axis reflow where required and no loss of function

Reduced motion

Motion removed or reduced without losing state information

Colour independence

State and errors do not depend on colour alone

Touch targets

Frequent mobile actions meet the project’s 56px target

Long labels

English, Bangla, and other approved long-label fixtures do not break controls

Plain language

Errors and recovery steps are specific and understandable

Time

Absolute expiry and deadline information where ambiguity would matter

Error recovery

Errors identify the field/state and preserve safe entered work

Alternative modality

Camera, pointer, hover, audio, animation, or colour is not the sole path

Loading/degraded

Status is announced without excessive repetition

Session expiry

Warning and recovery are accessible

Kill/fallback

Disabled capability and approved alternative are accessible

Automated coverage supplements but does not replace manual evidence.

Automated accessibility checks

Implement automated checks for:

Accessible names.

Duplicate IDs.

Label relationships.

Landmark and heading basics.

ARIA validity.

Dialog naming and focus containment.

Obvious contrast failures supported by the selected tool.

Keyboard-reachable controls.

Common form errors.

Prohibited positive tabindex.

Hidden interactive content.

Target-size tokens or computed dimensions for registered frequent actions.

Reduced-motion CSS behavior where testable.

Horizontal overflow at 375px and zoom fixtures where testable.

Do not silently disable a rule because a component library produces a finding.Record and resolve or create a valid exception.

Manual evidence format

Every manual check must record:

Evidence ID.

Capability/version.

Flow and state.

Requirement.

Browser and version.

Operating system.

Assistive technology and version where applicable.

Viewport or zoom.

Language/label fixture.

Input method.

Steps.

Expected result.

Actual result.

Pass/fail/block.

Finding IDs.

Tester.

Date.

Screenshot or recording reference only when synthetic and necessary.

Reviewer.

Review date.

Use generic filenames such as:

mobile-waiting-state.png

keyboard-denied-state.md

screen-reader-form-review.md

zoom-reflow-table.md

Do not put patient, pharmacist, pharmacy, ailment, medication, appointment, oridentifier data in filenames.

Finding workflow

Every accessibility failure requires:

Finding ID.

Affected capability and flow.

Severity under approved policy.

User impact.

Reproduction.

Remediation owner.

Target release.

Test to prevent recurrence.

Status.

An accessibility finding cannot be marked NOT_APPLICABLE merely because analternative browser or staff-assisted path exists.

Accessibility release gate

Block promotion when:

A critical flow cannot be completed by keyboard.

A keyboard trap exists.

Required screen-reader names, roles, states, or errors are absent.

200% or 400% zoom causes loss of essential content or action.

375px causes essential horizontal scrolling or inaccessible controls.

Consent, privacy, denial, expiry, fallback, or emergency-related status isinaccessible.

Status depends only on colour.

Motion cannot be reduced where required.

The normal non-automated workflow is inaccessible when automation isdisabled.

A security or privacy control becomes unusable with assistive technology.

A failure has no named remediation owner or valid disposition.

Deliverables

docs/task-11/accessibility-test-matrix.md

docs/task-11/manual-accessibility-evidence-template.md

Automated accessibility test configuration

Synthetic accessibility fixtures

Accessibility finding register

Mobile, desktop, keyboard, screen-reader, zoom/reflow, reduced-motion, andlong-label evidence for Task 11’s own interfaces

Workstream I — Operational SLIs, SLOs, and Payload-Free Observability

Observability boundary

Observability must answer:

Is the service available?

Is it slow?

Are errors increasing?

Is a queue accumulating work?

Are retries or duplicates increasing?

Is an integration diverging?

Is a kill switch effective?

Is automation operating within its approved boundary?

Is a release cohort experiencing a regression?

It must not answer those questions by collecting patient or clinical payloads.

Prohibited observability data

Do not place the following in metrics, logs, traces, profiles, error monitoring,dashboards, alert notifications, or incident-chat previews:

Request or response bodies.

Clinical text.

Symptoms, medications, allergies, diagnoses, care plans, assessments, orreports.

Secure-message content.

Uploaded file text, names, or metadata beyond a safe file-category code.

Patient, clinician, pharmacy, appointment, assessment, thread, visit, order,claim, or delivery identifiers.

Contact details.

Identity-verification answers.

Exact patient location.

Full URL, path parameters containing identifiers, query string, or fragment.

Cookies, authorization headers, signatures, tokens, or secrets.

Vendor payloads.

Raw SQL parameters.

Model prompts, outputs, source facts, or reviewer notes.

Raw media, SDP, ICE, TURN, device labels, full user agent, IP address, orpersistent fingerprint.

Arbitrary exception objects or stack-local values.

If an opaque domain identifier can be joined back to a patient or encounter, itis not payload-free merely because it is opaque.

Allowed operational dimensions

Use bounded, low-cardinality dimensions such as:

Service.

Capability ID.

Capability version.

Release cohort code.

Environment.

Region code approved for operations.

Static route template, never a raw path.

Operation category.

Safe outcome.

Safe reason code.

Dependency category.

Queue name from an allowlist.

Retry bucket.

Latency bucket.

HTTP status class where appropriate.

Build version.

Kill-switch state.

Automation state.

Do not add a dimension without cardinality, privacy, retention, and operationalreview.

SLI registry

Create an SLI registry with:

SLI ID.

Capability/service.

User journey.

Good-event definition.

Total-event definition.

Data source.

Safe dimensions.

Exclusions.

Sampling.

Calculation window.

Freshness.

Owner.

Dashboard.

Alert dependency.

Privacy review.

Validation test.

Known limitations.

At minimum define SLIs for:

Authentication and authorization

Authentication request availability.

Protected-route authorization-decision availability.

Authorization-decision latency.

Session validation failures by safe reason category.

Revocation propagation delay.

Default-deny/unknown-state count.

Do not use authorization-denial counts as a proxy for malicious behaviorwithout security review; legitimate expiry and user error may dominate.

Integrations

Adapter request availability.

Adapter latency.

Timeout rate.

Retry rate.

Circuit-breaker state.

Webhook accepted/rejected/duplicate/replay-safe counts.

Unreconciled-event count and age.

Vendor health by approved coarse category.

Queues and background work

Queue enqueue availability.

Oldest eligible work age.

Processing success rate.

Retry and dead-letter counts.

Work completion latency.

Duplicate-suppression count.

Work rejected after kill/revocation/expiry.

Reconciliation backlog age.

Messages and reminders

Consent-gate decision availability.

Outbox scheduling lag.

Dispatch attempt availability.

Delivery-status reconciliation lag.

Cancel-before-send success.

Duplicate-send prevention.

Secure-thread read/write availability without content.

Delivery is not evidence that the intended patient read or understood amessage.

Automation and AI

Capability-gate decision availability.

Eligible automation attempted/completed/denied counts.

Circuit-breaker activations.

Kill-switch propagation delay.

Work rejected after expiry or kill.

Model-adapter timeout/refusal/invalid-output counts without prompts or output.

Normal-workflow availability while disabled.

Do not define clinical correctness, patient urgency, diagnosis, or pharmacistjudgment from operational telemetry.

Database and migrations

Connection availability.

Transaction success rate.

Migration duration in controlled environments.

Lock-wait category.

Queue/backfill progress as aggregate counts.

Reconciliation backlog.

Backup/restore job state where approved.

Do not enable SQL statement or parameter capture on PHI-bearing paths.

SLO registry

Every production-capable service or capability requires:

SLO ID.

Related SLIs.

User-facing purpose.

Numerical target.

Window.

Error-budget rule.

Alert policy.

Owner.

On-call or escalation owner.

Dependency assumptions.

Exclusions.

Review date.

Approval.

Consequence when budget is exhausted.

The implementation agent may create proposed targets for review but must notinvent and silently approve operational promises. Blank, placeholder, orunapproved SLOs block the applicable production stage.

At minimum establish approved SLOs for:

Authentication.

Protected authorization decisions.

Core patient and pharmacist workflows.

Integration adapters.

Queue processing.

Message outbox and secure threads.

Automation gates.

Release-gate availability.

Kill-switch propagation.

Reconciliation age.

An SLO for external vendor delivery must distinguish AgentRx dispatch behaviorfrom vendor delivery and final recipient receipt.

Error budgets and release policy

Define:

Fast- and slow-burn alerting.

Error-budget consumption.

Capability-specific and dependency-specific attribution.

Release freeze threshold.

Exception authority.

Recovery threshold.

Review process.

Relationship to vendor outage and planned maintenance.

Do not hide errors by excluding a failing cohort, retrying indefinitely, orreclassifying failures after the budget is consumed.

Payload-free tracing

If tracing is used:

Use static span names.

Use safe operation categories.

Do not capture bodies, headers, query strings, SQL parameters, or domainentities.

Use short-lived correlation references that are not persisted as patientidentity.

Apply sampling and retention policy.

Verify third-party agent configuration.

Disable automatic instrumentation that captures prohibited values unless itcan be safely configured and tested.

Test exception serialization.

Alert design

Alerts must:

Identify service, capability, environment, cohort category, safe condition,severity, start time, and runbook.

Avoid identifiers and payload.

Route to an approved operational channel.

Have an owner and escalation.

Deduplicate safely.

Resolve or update.

Link to a payload-free dashboard.

Distinguish vendor outage from internal failure.

Distinguish kill-switch activation from service failure.

Do not send PHI or secrets through email, SMS, push, calendar, ticket title, orchat alert.

Synthetic observability tests

Use deterministic events to prove:

Allowed fields are recorded.

Forbidden markers are rejected or absent.

High-cardinality values are rejected.

Raw URLs are normalized to safe route templates.

Arbitrary exception objects are sanitized.

Vendor payloads are not captured.

Kill-switch propagation can be measured without domain IDs.

Queue age and reconciliation lag are measurable without payload.

Alerts contain only safe fields.

Dashboard queries do not expose individual events where aggregation isrequired.

Observability failure does not cause a high-consequence operation to failopen.

Deliverables

docs/task-11/sli-slo-and-error-budget-policy.md

docs/task-11/payload-free-observability-contract.md

Machine-readable SLI/SLO registry

Safe metric, log, trace, and alert schemas

Observability leakage tests

Synthetic dashboards and alert evidence

Workstream J — Release Register, Evidence Manifest, and Capability Lifecycle

Release register

Create a version-controlled, schema-validated release register. Each capabilityentry must contain:

Capability ID.

Name.

Roadmap task.

Bounded purpose.

Explicit exclusions.

Owner.

Backup owner.

Risk tier.

Autonomy level.

Current release stage.

Intended actors.

Subjects.

Authoritative service.

Data classes.

Jurisdictions.

Vendors and subprocessors.

Source repository.

Source commit.

Capability version.

Schema/migration head.

Configuration version.

Dependency-set identity.

Evidence profile.

Threat-model reference/version.

Privacy/data-flow reference/version.

PIA status/reference/review date.

TRA status/reference/review date.

Professional-review status/reference/review date.

Privacy-review status/reference/review date.

Security-review status/reference/review date.

Accessibility-review status/reference/review date.

Product-review status/reference/review date.

Legal/procurement/vendor status as applicable.

Test-evidence manifest reference and hash.

Open findings.

Exceptions.

Rollout cohort.

Feature-gate key and safe default.

Kill-switch key, owner, propagation target, and last drill.

Rollback/forward-fix reference and last rehearsal.

SLOs and incident owner.

Dependency capability states.

Approval date.

Expiry/review date.

Change triggers.

Release decision.

Retirement/data-return plan where applicable.

Do not store secrets, PHI, patient identifiers, vendor credentials, orsensitive payloads in the register.

Capability identity

Define a capability-version identity from immutable inputs such as:

Capability contract version.

Source commit.

Migration head.

Configuration version.

Dependency lock identity.

Control-policy version.

Feature-gate behavior.

Vendor/model/adapter identity where applicable.

If one of those inputs changes materially, previous evidence does not silentlyapply. The register must require re-evaluation according to the change matrix.

Evidence manifest

Create a machine-validated manifest containing:

Manifest schema version.

Capability ID/version.

Release stage requested.

Evidence profile.

Source commit.

Build provenance.

Environment classification.

Fixed clock/seed/fixture version where applicable.

Policy version.

Tool/runtime/container/database versions.

Evidence items.

Artifact hashes.

Required-control mapping.

Pass/fail/block status.

Findings.

Exceptions.

Approvals.

Expiry.

Producer.

Independent reviewers.

Generated time.

Every evidence item must include:

Evidence ID.

Control ID.

Evidence type.

Test/review/drill identifier.

Status.

Safe summary.

Artifact reference.

SHA-256 or approved equivalent hash.

Produced time.

Producer.

Commit/version scope.

Expiry or NO_EXPIRY_WITH_RATIONALE.

NO_EXPIRY_WITH_RATIONALE is not permitted for vendor, PIA, TRA,professional, security, accessibility, threat-model, automation, orproduction-release reviews.

Evidence-bundle structure

Use the repository’s established evidence location. If none exists, use ageneric structure equivalent to:

evidence/<capability-id>/<capability-version>/manifest.*

evidence/<capability-id>/<capability-version>/automated/

evidence/<capability-id>/<capability-version>/manual/

evidence/<capability-id>/<capability-version>/accessibility/

evidence/<capability-id>/<capability-version>/drills/

evidence/<capability-id>/<capability-version>/approvals/

The manifest references files; it does not embed sensitive test output.

Evidence validation

CI must reject:

Unknown capability.

Unknown evidence profile.

Unknown control.

Missing owner.

Missing risk tier or autonomy level.

Missing required evidence.

Failed required evidence.

Skipped required evidence.

Evidence for a different commit or version.

Stale evidence.

Missing artifact.

Hash mismatch.

Duplicate evidence ID.

Invalid approver role.

Self-approval where separation is required.

Expired approval.

Missing review date.

Unknown or expired exception.

Open blocking finding.

Missing cohort.

Missing or untested kill switch.

Missing rollback/forward-fix.

Missing SLO or incident owner for production-capable capability.

Dependency not approved for the requested stage.

Production stage with a synthetic-only status.

A4_PROHIBITED_AUTONOMY proposed for enablement.

Release decision record

Every promotion decision must record:

Requested transition.

Requester.

Capability-version.

Evidence-manifest hash.

Policy version.

Applicable controls.

Applicable approvals.

Exceptions.

Findings.

Decision.

Decision owner.

Decision time.

Cohort.

Expiry/review date.

Conditions.

Rollback/kill readiness.

Do not rewrite an old release decision. Supersede it.

Lifecycle and expiry

The register must support:

Registration.

Design review.

Synthetic implementation.

Evidence review.

Approval.

Limited rollout.

Expansion.

Suspension.

Revocation.

Expiry.

Renewal.

Retirement.

On expiry:

New execution is denied for experimental or approval-dependentcapabilities.

In-flight behavior follows the approved expiry contract.

Owners and reviewers are alerted through payload-free channels.

Evidence is preserved according to policy.

Renewal requires current evidence.

Change-trigger matrix

At minimum define re-review for changes to:

Purpose or product claim.

Intended user.

Actor, subject, role, tenant, or authorization.

Data field or classification.

PHI flow.

Vendor, subprocessor, region, contract, or endpoint.

Model, prompt, corpus, schema, validator, or AI provider.

External effect.

Autonomy level.

Queue or retry behavior.

Retention or deletion.

Audit event.

Integration adapter or webhook.

Database migration or constraint.

Authentication/session behavior.

Browser storage, cache, analytics, logging, or observability.

Accessibility UI or workflow.

Rollout cohort.

Kill switch or rollback.

SLO.

Control policy.

CI workflow or required-check semantics.

Deliverables

config/release-controls/capability-register.*

config/release-controls/evidence-manifest.schema.*

config/release-controls/release-decision.schema.*

docs/task-11/release-register-and-evidence-standard.md

docs/task-11/capability-lifecycle-and-change-triggers.md

Manifest and register validators

One complete synthetic capability entry and evidence bundle

Workstream K — Approvals, Findings, Remediation, Exceptions, and Expiry

Approval model

Define approval types separately:

Capability owner.

Quality.

Security.

Privacy.

Accessibility.

Operations/SRE.

Product.

Pharmacist/professional.

Legal/regulatory.

Procurement/vendor.

PIA.

TRA.

Data residency/location.

Incident readiness.

Production release authority.

An approval record must contain:

Approval ID.

Capability and version.

Approval type.

Scope.

Release stage.

Approver identity and role.

Decision.

Conditions.

Evidence reviewed.

Policy/source version.

Approved date.

Expiry/review date.

Change triggers.

Superseded approval reference.

Allowed decisions:

APPROVED

APPROVED_WITH_CONDITIONS

REJECTED

BLOCKED

NOT_APPLICABLE_WITH_RATIONALE

EXPIRED

REVOKED

APPROVED_WITH_CONDITIONS must identify enforceable conditions and cannot beused to bypass a non-waivable control.

Separation of duties

At minimum:

The author of a Task 11 policy weakening cannot be its sole reviewer.

The capability implementer cannot provide the independent security,accessibility, privacy, professional, or production approval required by theevidence profile.

A destructive retention action uses the approved number and role ofapprovers.

A break-glass release requires a different retrospective reviewer.

A vendor owner cannot provide the entire vendor security/privacy/procurementapproval set.

When the project is too small to provide separation, record the governanceblocker. Do not invent identities or mark approval complete.

Finding model

Every quality, security, privacy, accessibility, operational, professional, orvendor finding must contain:

Finding ID.

Capability.

Control ID.

Category.

Severity under approved policy.

Evidence.

User or system impact.

Affected release stage.

Immediate containment.

Remediation owner.

Due date.

Verification test.

Status.

Exception eligibility.

Closure evidence.

Independent verifier where required.

Allowed statuses:

OPEN

CONTAINED

REMEDIATION_IN_PROGRESS

READY_FOR_VERIFICATION

CLOSED_VERIFIED

ACCEPTED_TEMPORARILY

BLOCKED

The implementer cannot close a finding merely by changing its description.

Exception model

Only waivable controls may receive exceptions. Every exception requires:

Exception ID.

Capability/version.

Control ID.

Exact file, route, component, dependency, environment, and cohort scope.

Risk statement.

Business/operational rationale.

Why immediate remediation is unavailable.

Compensating control.

Compensating-control evidence.

Remediation owner.

Independent approver.

Created date.

Expiry date.

Review date.

Remediation issue.

Kill/containment action.

Status.

Exceptions must be:

Narrow.

Time-bounded.

Versioned.

Visible in CI and the release register.

Automatically invalid after expiry.

Re-reviewed on material change.

Prohibit:

Permanent exceptions.

Wildcard file or directory exceptions without exceptional documented need.

“Accepted risk” without owner, evidence, compensating control, and expiry.

Inline comments as the complete exception.

Retroactive exceptions created after a failed release.

Exceptions for non-waivable controls.

Security and accessibility remediation ownership

Every security and accessibility failure must:

Create or link a tracked finding.

Name one accountable remediation owner.

Identify the affected release.

Include a regression test.

Be reviewed after remediation.

Remain visible until verified closed.

The release UI and CI output must not offer a generic “waive” button.

Expiry enforcement

Run a scheduled and release-time check for:

Capability expiry.

Evidence expiry.

Approval expiry.

Exception expiry.

Vendor review expiry.

Contract review expiry.

PIA/TRA review date.

Threat-model review date.

Accessibility evidence expiry after material UI change.

Kill-switch drill age.

Rollback rehearsal age.

Incident drill age.

SLO review date.

Dependency exception expiry.

An expiry alert does not replace server-side denial when policy requiresdenial.

Deliverables

Machine-readable approval, finding, and exception schemas

docs/task-11/approval-and-separation-of-duties-policy.md

docs/task-11/findings-remediation-and-exceptions.md

Expiry validator and safe notification design

Synthetic approval, rejection, finding, remediation, exception, and expiryscenarios

Workstream L — Feature Gates, Rollout Cohorts, Kill Switches, and Rollback

Runtime release-gate contract

Before enabling an experimental, external, PHI-bearing, automated, orhigh-consequence capability, the server must verify:

Exact capability ID/version.

Environment.

Requested action.

Authenticated server context.

Risk tier.

Autonomy level.

Current release stage.

Approved cohort.

Current approval/evidence decision.

Dependency state.

Current kill-switch state.

Expiry.

Configuration version.

Safe failure behavior.

Do not send the evidence bundle to the browser. Return only the safeallow/deny decision and approved safe reason code.

Client-side flags are presentation aids. They are not release authorization.

Feature-gate requirements

Every gated capability must have:

Server-owned key.

Owner.

Safe default.

Environment scope.

Cohort rule.

Dependency rule.

Expiry.

Audit behavior.

Cache behavior.

Change control.

Test coverage.

Safe default is normally OFF for:

Experimental capabilities.

Synthetic prototypes.

New external integrations.

AI.

Automation.

PHI-bearing flows.

Professional or financial effects.

Unknown, unavailable, stale, or malformed flag state fails closed.

Rollout cohorts

Use explicit server-derived cohorts:

DISABLED

SYNTHETIC_ONLY

INTERNAL_TEST

APPROVED_STAFF

APPROVED_SINGLE_SITE

APPROVED_LIMITED_SITES

APPROVED_PERCENTAGE

APPROVED_PRODUCTION

Not every capability must use percentage rollout. PHI, professional, pharmacy,jurisdiction, or vendor restrictions may require named approved sites instead.

Cohort assignment must not use:

Client-submitted flags.

Query parameters.

Browser storage.

Predictable patient identifiers.

Unreviewed analytics attributes.

Hidden demographic targeting.

Promotion steps

For every cohort expansion:

Freeze the capability version.

Validate the evidence manifest.

Validate approvals and expiry.

Confirm SLOs and monitoring.

Confirm incident owner.

Confirm kill-switch readiness.

Confirm rollback/forward-fix.

Confirm reconciliation.

Record the exact cohort.

Enable through approved server configuration.

Observe the defined hold period.

Review payload-free signals and findings.

Expand, hold, roll back, suspend, or revoke.

Do not expand automatically because no alert fired.

Kill-switch hierarchy

Provide, where applicable:

Global emergency disable.

Environment disable.

Capability disable.

Vendor/provider disable.

Model/prompt disable.

Integration-adapter disable.

Automation disable.

Cohort disable.

Operation-specific disable.

The hierarchy must be documented so overlapping states produce one saferesult.

Kill-switch behavior

For each switch define:

Owner.

Authorized activators.

Activation method.

Authentication.

Audit.

Propagation target.

Propagation measurement.

Cache invalidation.

New-work behavior.

In-flight behavior.

Queued-work behavior.

Scheduled-work behavior.

Late webhook/event behavior.

Patient/staff communication.

Manual fallback.

Re-enable authority.

Re-enable prerequisites.

Prove:

New work is denied within the approved propagation target.

Queued work rechecks the switch at execution.

Delayed provider/model/vendor responses are rejected after kill where theireffect is no longer valid.

Retries do not bypass kill.

A vendor outage does not prevent local disablement.

A browser with stale configuration cannot continue.

A worker with stale configuration cannot continue indefinitely.

Re-enable requires an explicit reviewed action.

Circuit breakers

For A3_BOUNDED_AUTOMATION and external integrations, define automaticcircuit-breaker inputs such as:

Error or timeout threshold.

Invalid response threshold.

Reconciliation backlog.

Duplicate/replay anomaly.

Queue age.

SLO burn.

Vendor health.

Safety policy failure.

Expired approval.

Circuit breakers:

Stop or pause the bounded operation.

Do not make a clinical or legal decision.

Produce payload-free alerts.

Create safe work for authorized staff.

Require explicit conditions for reset.

Rollback strategy

Classify rollback:

CONFIG_DISABLE

CODE_ROLLBACK

COMPATIBLE_SCHEMA_ROLLBACK

FORWARD_FIX_REQUIRED

DATA_RECONCILIATION_REQUIRED

EXTERNAL_COMPENSATION_REQUIRED

NO_SAFE_ROLLBACK_BLOCK_RELEASE

Every release candidate must document:

Previous approved version.

Rollback trigger.

Decision owner.

Procedure.

Time objective approved by operations.

Database compatibility.

Queue and scheduled work.

External effects.

Cache and sessions.

Audit.

Reconciliation.

Verification.

Patient/staff fallback.

NO_SAFE_ROLLBACK_BLOCK_RELEASE blocks production until an approvedalternative contingency exists.

Deliverables

Server-side release-gate contract and deterministic adapter

Capability/cohort/kill-switch schemas

docs/task-11/feature-gates-rollout-and-kill-switches.md

docs/task-11/rollback-forward-fix-and-reconciliation.md

Synthetic rollout, suspension, kill, delayed-work, rollback, and re-enableevidence

Workstream M — Incident, Privacy Event, Vendor Outage, Downtime, and Automation-Disable Drills

Drill principles

Drills must:

Use deliberately synthetic facts and identifiers.

Name a facilitator, participants, decision owner, observers, and recorder.

Define the capability and version.

Define the scenario and injects.

Define expected decisions and controls.

Exercise communications without sending real external patient messages.

Exercise kill, containment, fallback, recovery, and reconciliation.

Record timestamps and safe outcomes.

Produce findings and remediation owners.

Avoid deciding legal reportability, clinical correctness, or professionalresponsibility on behalf of the authorized reviewers.

Be repeated before applicable production launch and after material changes orsignificant findings according to approved cadence.

Do not mark a drill passed because participants discussed what they might do.Exercise the available controls where safely possible.

Common drill record

Record:

Drill ID.

Scenario version.

Capability/version.

Environment.

Risk tier and autonomy level.

Objectives.

Preconditions.

Participants and roles.

Synthetic injects.

Timeline.

Detection signal.

Decisions.

Control actions.

Kill-switch time.

Containment time.

Recovery time.

Reconciliation result.

Communication result.

Evidence preserved.

Expected versus actual behavior.

Findings.

Remediation owners.

Due dates.

Retest date.

Reviewer.

Final status.

Incident-response drill

Exercise:

Detection.

Initial safe classification.

Incident commander assignment.

Containment.

Capability suspension or kill.

Session/token/credential revocation where applicable.

Queue and scheduled-work pause.

Vendor/integration isolation.

Evidence preservation.

Scope assessment.

Privacy, security, operations, product, and professional escalation.

Safe internal communication.

Recovery decision.

Restore or rollback.

Reconciliation.

Monitoring.

Post-incident review.

Test at least:

Cross-tenant authorization anomaly.

Secret exposure indicator.

Prohibited payload in logs.

Untrusted dependency or build indicator.

Replayed webhook or automation anomaly.

Audit-service degradation during a high-consequence operation.

Privacy-event drill

Model a suspected privacy event without automatically deciding that it is alegally reportable breach.

Exercise:

Immediate denial or containment.

Preservation of minimal relevant evidence.

Prevention of further disclosure.

Session and credential revocation.

Vendor containment.

Data-flow and affected-system identification.

Safe record-count methodology without exporting PHI into the drill record.

Privacy-officer escalation.

Legal/professional consultation path.

Patient-notification decision ownership.

Regulator/contractual notification decision ownership.

Recovery.

Corrective action.

The application may produce facts and safe counts. It must not output“reportable” or “not reportable” as an automated legal conclusion.

Vendor-outage drill

For every production vendor category, exercise:

Vendor health signal.

Timeout with unknown external outcome.

Circuit breaker.

New-work pause.

In-flight behavior.

Retry suppression or safe retry.

Queue age and capacity.

Patient/staff fallback.

Vendor status communication.

Credential or webhook disablement if compromise is suspected.

Reconciliation after recovery.

Late events.

Duplicate events.

Vendor data-return/export dependency.

SLO/error-budget impact.

Do not let a vendor outage cause:

Authentication bypass.

Lost consent state.

Duplicate messages or effects.

Assessment completion.

Dispensing release.

Claim creation/submission.

AI free-text fallback.

Silent loss of queued work.

Automation-disable drill

Exercise:

Global automation kill.

One capability kill.

One cohort kill.

Worker with stale configuration.

Scheduled work already claimed.

Work queued before kill.

Retry after kill.

Delayed vendor/model result after kill.

Re-enable attempt without approval.

Normal human workflow.

Accessible staff messaging.

Reconciliation.

Measure kill propagation using safe synthetic events.

Downtime and recovery drill

Exercise at least:

Application outage.

Identity outage.

Database outage.

Queue outage.

Audit outage.

Object-storage outage.

Release-gate outage.

Observability outage.

Partial network failure.

For each:

Identify fail-closed operations.

Identify approved degraded behavior.

Exercise maintenance/degraded UI.

Exercise accessible manual fallback.

Prevent duplicate work.

Restore service in the approved order.

Verify migrations/configuration.

Reconcile queued and external state.

Verify audit continuity.

Verify no expired/revoked work resumes.

Close or escalate findings.

Database restore and retention drill

Where applicable and approved, exercise with synthetic data:

Backup availability.

Restore into isolated environment.

Recovery-point evidence.

Recovery-time evidence.

Key availability.

Schema/migration compatibility.

Legal-hold preservation.

Retention-state preservation.

Audit continuity.

Reconciliation with queues and external systems.

Safe destruction of the isolated drill environment.

Do not copy a production backup into a synthetic drill.

Drill pass criteria

A drill passes only when:

Required roles participated or approved substitutes are documented.

Detection worked.

Kill/containment worked.

Payload-free communication worked.

Safe fallback worked.

Recovery was verified.

Reconciliation was completed or an owned blocker recorded.

No real PHI or live external effect occurred.

Findings have named remediation owners.

Critical findings block the applicable release.

Deliverables

docs/task-11/runbooks/incident-response.md

docs/task-11/runbooks/privacy-event-response.md

docs/task-11/runbooks/vendor-outage.md

docs/task-11/runbooks/automation-disable.md

docs/task-11/runbooks/downtime-and-recovery.md

docs/task-11/runbooks/database-restore-and-retention.md

docs/task-11/drill-plan-and-evidence-template.md

Synthetic drill evidence and finding register

Workstream N — Cross-Task Test-Plan Review and Promotion Review

Review checkpoints

Task 11 establishes two mandatory checkpoints for every other roadmap task.

Checkpoint 1 — test-plan review before implementation

Before the affected implementation begins, the capability owner must provide:

Bounded purpose and exclusions.

Capability split.

Risk tier.

Autonomy level.

Actors, subjects, roles, tenant/custodian scope.

Authoritative systems.

Data classification.

Data flow.

External and immutable effects.

Threat model.

Required controls/evidence profile.

Test matrix.

Synthetic fixture plan.

Accessibility plan.

Failure, idempotency, concurrency, rollback, downtime, and reconciliationplan.

Feature gate and kill switch.

Required approvals.

Stop conditions.

Task 11 reviews whether the test plan can produce evidence. It does not approvethe task’s clinical, professional, or legal substance.

Allowed checkpoint decisions:

APPROVED_TO_IMPLEMENT_SYNTHETIC

APPROVED_WITH_REQUIRED_CHANGES

BLOCKED_MISSING_BOUNDARY

BLOCKED_MISSING_TESTS

BLOCKED_DEPENDENCY

BLOCKED_APPROVAL

APPROVED_WITH_REQUIRED_CHANGES must name enforceable preconditions and cannotbe used when a non-waivable boundary is missing.

Checkpoint 2 — evidence review before promotion

Before promotion, the capability owner must provide:

Exact capability version.

Exact source commit.

Valid evidence manifest.

Required CI results.

Threat/privacy mapping.

Authorization/tenant evidence.

Database evidence where applicable.

Audit/retention evidence.

Idempotency/concurrency evidence.

Accessibility evidence.

SLO/observability evidence.

Kill/rollback/reconciliation evidence.

Drill evidence.

Findings and exceptions.

Required approvals.

Requested cohort.

Review/expiry date.

Allowed decisions:

APPROVED_FOR_REQUESTED_STAGE

APPROVED_FOR_SMALLER_COHORT

HOLD_FOR_REMEDIATION

BLOCKED_FAILED_CONTROL

BLOCKED_MISSING_APPROVAL

BLOCKED_STALE_EVIDENCE

REJECTED

Review matrix

At minimum assign:

Concern

Evidence producer

Required reviewer

Code quality

Implementer/CI

Quality owner

Threat model

Capability/security contributor

Security owner

Privacy data flow

Capability/privacy contributor

Privacy owner

Accessibility

Implementer/tester

Accessibility owner

Operational readiness

Capability/operations contributor

Operations owner

Professional workflow

Capability team

Practising pharmacist or required professional

Legal/regulatory

Authorized project contributor

Legal/regulatory owner

Vendor/contract

Capability/vendor owner

Procurement/privacy/security as required

Release decision

Capability owner

Authorized release owner with required approvals

One person may hold several roles only when project policy allows it and therequired independence is preserved.

Review SLA and blocking behavior

Define:

Review intake.

Completeness check.

Reviewer assignment.

Target review time.

Questions and response.

Decision.

Expiry.

Escalation.

An overdue review does not become approval. The capability remains at itscurrent stage.

Cross-task consistency checks

Review that:

Task 01 synthetic isolation remains intact.

Task 02 assessment and claim authority remains intact.

Task 03 document/OCR boundaries remain intact where applicable.

Task 04 follow-up authority remains intact.

Task 05 patient/pharmacist identity domains remain separate.

Task 06 virtual-care events cannot complete assessments or claims.

Task 07 notifications remain generic and secure messages remainserver-authorized.

Task 08 coordination cannot become dispensing release, receipt, payment, orclaim truth.

Task 09 analytics does not expose patient-level or unsafe small-cell data.

Task 10 candidates remain separately bounded, source-linked, human-reviewed,and killable.

No task imports another task’s internal authority in order to bypass a gate.

Review evidence

Record:

Review ID.

Capability/version.

Checkpoint.

Materials reviewed.

Questions.

Findings.

Decision.

Conditions.

Reviewers.

Date.

Expiry.

Superseded review.

Do not place clinical or patient payload in review comments or ticket titles.

Deliverables

docs/task-11/cross-task-test-plan-review.md

docs/task-11/cross-task-promotion-review.md

Review intake, checklist, and decision schemas

Roadmap capability review register

Workstream O — Synthetic Release-Control Prototype

Fixture requirements

Create deterministic, server-owned fixtures that:

Use no real people, pharmacies, clinicians, addresses, telephone numbers,emails, health-card numbers, credentials, vendors, claims, prescriptions,messages, or clinical records.

Use unmistakable identifiers such as SYNTHETIC-CAPABILITY-011.

Use a fixed clock.

Use a fixed synthetic Ontario timezone.

Use fixed source commits and hashes that cannot be confused with productionreleases.

Use synthetic reviewer roles, never real approval claims.

Make no external network calls.

Use no live SDK or production credential.

Contain marker values for leakage tests.

Fail hard if enabled in production.

Required synthetic capabilities

Include at least:

SYNTHETIC-CAPABILITY-011-GREEN — complete R2/A2 evidence and approvals.

SYNTHETIC-CAPABILITY-011-MISSING-EVIDENCE.

SYNTHETIC-CAPABILITY-011-FAILED-SECURITY.

SYNTHETIC-CAPABILITY-011-FAILED-ACCESSIBILITY.

SYNTHETIC-CAPABILITY-011-MISSING-OWNER.

SYNTHETIC-CAPABILITY-011-EXPIRED.

SYNTHETIC-CAPABILITY-011-INVALID-EXCEPTION.

SYNTHETIC-CAPABILITY-011-SELF-APPROVED.

SYNTHETIC-CAPABILITY-011-STALE-COMMIT.

SYNTHETIC-CAPABILITY-011-HASH-MISMATCH.

SYNTHETIC-CAPABILITY-011-KILL-FAILED.

SYNTHETIC-CAPABILITY-011-ROLLBACK-MISSING.

SYNTHETIC-CAPABILITY-011-SLO-MISSING.

SYNTHETIC-CAPABILITY-011-DEPENDENCY-BLOCKED.

SYNTHETIC-CAPABILITY-011-A4-PROHIBITED.

SYNTHETIC-CAPABILITY-011-UNKNOWN.

Required interfaces

Build or document synthetic interfaces for:

Capability register.

Capability detail.

Risk/autonomy classification.

Evidence manifest status.

Required controls.

Findings and remediation.

Approvals.

Exceptions.

Expiry.

Rollout cohort.

Feature gate.

Kill switch.

Rollback.

SLO status.

Drill status.

Promotion request.

Denied, blocked, expired, suspended, revoked, and unknown states.

All state-changing controls must be server-authorized. UI hiding isinsufficient.

Synthetic gate scenarios

Prove:

Complete evidence allows only the registered stage/cohort.

Missing evidence denies.

Failed control denies.

Skipped control denies.

Stale evidence denies.

Wrong commit denies.

Hash mismatch denies.

Missing approval denies.

Expired approval denies.

Invalid self-approval denies.

Expired exception denies.

Non-waivable exception denies.

Open blocking finding denies.

Missing owner denies.

Unknown tier or autonomy denies.

A4_PROHIBITED_AUTONOMY denies.

Missing kill switch denies.

Failed kill-switch drill denies.

Missing rollback/forward-fix denies.

Missing SLO denies.

Blocked dependency denies.

Unknown state denies.

Client-supplied approval or cohort is ignored or denied.

Kill blocks new and queued work.

Delayed work after kill is denied.

Re-enable without approval is denied.

Expiry disables applicable capability.

Normal workflow remains usable.

Evidence

Capture only synthetic:

Required CI run.

Branch-gate failure and success.

Fresh migration.

Forbidden-pattern negative test.

Release-register validation.

Evidence hash mismatch.

Approval separation.

Exception expiry.

375px register/gate flow.

Desktop register/gate flow.

Keyboard walkthrough.

Screen-reader semantic inspection.

200% and 400% zoom/reflow.

Reduced motion.

Kill-switch drill.

Rollback drill.

Vendor-outage drill.

Privacy-event drill.

Deliverables

Synthetic release-control implementation

Deterministic fixtures

Synthetic capability register and evidence bundles

docs/task-11/synthetic-control-plane-evidence.md

Mobile and desktop evidence in the established repository location

Required Tests

Use the repository’s existing test tooling. Add focused tooling only when theexisting stack cannot enforce a required control.

CI and branch-gate tests

Prove:

TypeScript failure blocks.

ESLint failure blocks.

Pure-test failure blocks.

Build failure blocks.

Secret-scan failure blocks.

Dependency-review failure blocks under approved policy.

Security-policy failure blocks.

Fresh-migration failure blocks.

Constraint-test failure blocks.

Accessibility failure blocks.

Evidence-validation failure blocks.

Aggregate gate fails when any required job fails.

Aggregate gate fails when any required job is missing.

Aggregate gate fails when any required job is skipped.

Aggregate gate fails when any required job is cancelled.

Aggregate gate fails for a stale commit result.

Required job names remain stable.

Path filtering cannot bypass a required job.

Lockfile drift fails installation.

Untrusted pull requests cannot read secrets.

CI workflow changes require the configured owner review.

A neutral/no-op job cannot satisfy a required semantic check.

Branch protection actually prevents merge when a required check fails.

Supply-chain and secret tests

Cover:

Known safe synthetic secret marker.

High-entropy test fixture allowlist.

Realistic secret pattern rejected without printing the value.

Private key rejected.

Database URL rejected.

Webhook secret rejected.

Signed URL rejected.

Vendor/model token rejected.

Secret in documentation rejected.

Secret in generated artifact rejected.

Secret in commit history according to policy.

Unpinned or prohibited CI dependency.

Unexpected lockfile source.

Git or local-path runtime dependency.

Install-script policy.

Vulnerability policy.

Expired vulnerability exception.

Dependency-review override without exception.

Environment and synthetic-isolation tests

Prove:

Raw environment access outside the approved boundary fails.

Dynamic environment enumeration fails.

Environment serialization fails.

Server secret cannot enter the client bundle.

Production credential marker fails synthetic startup.

Synthetic fixture/adapter fails production startup.

Synthetic tests make no network calls.

Production adapter cannot resolve in synthetic dependency injection.

Production database host marker is denied.

Production object-store marker is denied.

Production identity/provider marker is denied.

De-identified, redacted, or copied production fixtures are not accepted assynthetic.

Unknown environment fails closed.

Logging, telemetry, and evidence-leakage tests

Inject synthetic forbidden markers and prove absence from:

Application logs.

Audit payloads.

Metrics.

Traces.

Error monitoring.

Breadcrumbs.

SQL logs.

Provider logs.

Browser console.

CI output.

Test reports.

Screenshots.

Videos.

Evidence filenames.

Evidence manifests.

Build artifacts.

Also prove:

Arbitrary error objects are sanitized.

Request/response objects are rejected by the logger.

Full URLs become safe route templates.

High-cardinality identifiers are rejected.

Alerts contain only safe fields.

Evidence-content scanner fails without printing the marker.

Browser, URL, cache, and client-boundary tests

Prove no protected workflow places prohibited data in:

Query strings.

Fragments.

Page titles.

History state.

localStorage.

sessionStorage.

IndexedDB.

Cache Storage.

Service-worker caches.

Persisted state.

Clipboard by default.

Referrers.

Analytics.

Notification previews.

Prove:

Protected responses are not shared-cacheable.

Approved session cookies have the required attributes.

Signed/download URLs are scoped, short-lived, and absent from evidence.

Client code cannot import server-only or production-only packages.

Client-supplied release state, actor, tenant, role, or cohort is denied.

Forbidden-import and architecture tests

Cover:

Client to server-only import.

Synthetic to production adapter import.

Production to synthetic fixture import.

Direct vendor SDK outside adapter.

Direct database access outside approved repository.

Direct audit-table write outside audit service.

Direct claim action outside billing service.

Direct message dispatch outside outbox/communications service.

Direct external effect from AI code.

Direct assessment/claim effect from virtual-care event.

Direct pharmacist-release effect from courier event.

PHI-bearing import into generic notification template.

Internal cross-task import bypass.

Unknown integration package.

PostgreSQL migration and constraint tests

Cover:

Empty database to migration head.

Expected migration checksums.

Required extensions.

Repeated safe harness execution.

Upgrade from approved synthetic schema baseline.

Old/new application compatibility where required.

Backfill interruption and resume.

Migration precondition failure.

Transactional and non-transactional failure behavior.

Tenant uniqueness.

Cross-tenant foreign-key rejection.

Singleton enforcement.

Append-only audit.

Immutable finalization.

Idempotency uniqueness.

Duplicate/replayed event.

Retention and hold precedence.

Destruction approval constraints.

Stale state version.

Concurrent insert/update.

Unknown enum/state.

Migration and test output contain no row values or secrets.

Authorization and tenant tests

For every registered protected capability, cover:

Unauthenticated.

Expired.

Revoked.

Wrong audience.

Wrong actor type.

Wrong role.

Wrong tenant.

Wrong pharmacy/custodian.

Wrong patient/subject.

Wrong assignment.

Wrong parent object.

Client-supplied authority.

Stale authorization.

Authorization change in flight.

Unknown role/state.

Background worker.

Webhook/service actor.

Support/admin actor.

List/count isolation.

Error-message non-enumeration.

Default deny.

Audit and retention tests

Cover:

Required allow/deny events.

Exactly-once effect with duplicate event.

Safe event envelope.

Append-only behavior.

Supersession.

Unauthorized audit access.

Audit failure behavior.

Retention trigger.

Recalculation.

Legal hold.

Hold release.

Backup expiry.

Failed deletion.

Dry run.

Required destruction approvals.

Unknown policy.

No invented retention period.

No payload in audit or retention evidence.

Idempotency and concurrency tests

Cover:

Exact replay.

Conflicting idempotency-key reuse.

Concurrent duplicate.

Timeout before acknowledgement.

Timeout after acknowledgement.

Partial local commit.

Retry after external success.

Duplicate tab.

Concurrent device.

Stale writer.

Consent revoke versus send.

Kill versus execution.

Rollback versus in-flight work.

Hold versus deletion.

Completion versus authorization change.

Duplicate/reordered webhook.

Fallback race.

Unknown race result.

Every race test must deterministically create the race.

Rollback, downtime, and reconciliation tests

Cover:

Configuration disable.

Code rollback.

Compatible schema rollback.

Forward-fix-required migration.

Cache invalidation.

Session behavior.

Queue behavior.

Scheduled work.

Late event.

Vendor success/local failure.

Local success/vendor unknown.

Application outage.

Identity outage.

Database outage.

Queue outage.

Object-storage outage.

Audit outage.

Release-gate outage.

Observability outage.

Vendor outage.

Recovery ordering.

Reconciliation.

Normal workflow.

Accessible fallback.

Release-register and evidence tests

Cover:

Valid entry.

Missing capability ID.

Missing owner.

Missing backup owner where required.

Invalid risk tier.

Invalid autonomy level.

Missing purpose/exclusions.

Missing evidence profile.

Missing threat model.

Missing privacy flow.

Missing approval.

Expired approval.

Invalid self-approval.

Missing review date.

Missing evidence.

Failed evidence.

Skipped evidence.

Stale evidence.

Wrong commit.

Hash mismatch.

Duplicate evidence ID.

Missing artifact.

Unknown control.

Unknown exception.

Expired exception.

Overbroad exception.

Non-waivable exception.

Open blocking finding.

Missing cohort.

Missing feature gate.

Missing kill switch.

Failed kill-switch drill.

Missing rollback.

Missing SLO.

Dependency blocked.

Synthetic-only record proposed for production.

A4_PROHIBITED_AUTONOMY.

Unknown state.

Feature-gate, kill-switch, and rollout tests

Cover:

Default off.

Server-side enforcement.

Client flag cannot authorize.

Wrong environment.

Wrong cohort.

Expired capability.

Suspended capability.

Revoked capability.

Dependency disabled.

Kill new work.

Kill queued work.

Kill scheduled work.

Kill in-flight work according to contract.

Stale browser.

Stale worker.

Delayed provider response.

Delayed webhook.

Retry after kill.

Re-enable without approval.

Re-enable after approved recovery.

Global versus capability switch precedence.

Circuit breaker.

Cohort expansion.

Cohort rollback.

SLI/SLO and observability tests

Cover:

Good/total event calculation.

Window calculation.

Error-budget calculation.

Safe dimensions.

Cardinality limit.

Metric absence/freshness.

Trace sanitization.

Static route template.

Queue age.

Reconciliation age.

Kill propagation.

Alert routing.

Alert deduplication.

Fast/slow burn.

Release-freeze rule.

Unapproved or placeholder SLO.

Expired SLO review.

No payload in dashboard or alert.

Accessibility and responsive tests

Cover Task 11’s own:

Capability register.

Capability detail.

Evidence status.

Findings.

Approvals.

Exceptions.

Promotion request.

Kill switch.

Rollback.

Denied.

Blocked.

Expired.

Suspended.

Revoked.

Unknown.

375px.

Desktop.

Keyboard traversal.

Focus.

Screen-reader semantics.

Status announcements.

Contrast.

200% zoom.

400% zoom/reflow.

Reduced motion.

Colour independence.

Long English and Bangla labels.

56px frequent mobile actions.

Accessible normal workflow after automation disablement.

Drill tests

Validate that each drill:

Uses synthetic data.

Names participants and decision owner.

Exercises the control.

Records detection.

Records kill/containment.

Records recovery.

Records reconciliation.

Produces safe evidence.

Creates owned findings.

Blocks release on critical failure.

Does not make a legal reportability or clinical decision automatically.

Quality, Security, Privacy, Accessibility, and Operational Validation Plan

Quality validation

Have the quality owner verify:

Required job semantics are documented and executable.

Negative tests prove failures block.

Required checks are stable.

Skipped/missing/cancelled/stale states fail.

Test fixtures are deterministic.

Migration tests use real isolated PostgreSQL.

Race tests create real deterministic races.

Evidence maps to controls.

Findings produce regression tests.

Branch protection is enforced, not merely documented.

Security validation

Have the security owner verify:

CI permissions and untrusted-code boundaries.

Supply-chain and dependency controls.

Secret scanning.

Environment isolation.

Server-only boundaries.

Authorization and tenant pinning.

Release-gate and feature-gate enforcement.

Kill-switch independence.

Threat-model completeness.

Payload-free logging and telemetry.

Incident containment and credential/session revocation.

No non-waivable control is excepted.

Privacy validation

Have the privacy owner verify:

Data-flow and field inventory.

Purpose and minimum-data mapping.

PHI locations.

Vendor/subprocessor paths.

Browser, URL, cache, analytics, logging, evidence, notification, and alertprohibitions.

Retention, backup, legal-hold, correction, and destruction proposal.

Privacy-event escalation roles.

The system does not decide legal reportability.

PIA status is represented accurately.

Residency claims are evidence-based and scoped.

Accessibility validation

Have the accessibility owner verify:

The target standard is current and documented.

Automated testing is supplemented by manual evidence.

Critical Task 11 workflows pass keyboard and screen-reader review.

375px, desktop, 200%, and 400% evidence is complete.

Contrast, focus, status, reduced motion, colour independence, long labels, and56px frequent actions pass.

Disabled/denied/expired/incident/fallback paths remain accessible.

Findings have remediation owners and cannot be silently waived.

Operational validation

Have the operations owner verify:

SLIs measure user/system behavior without payload.

SLO targets and error budgets are approved.

Alerts are safe, actionable, routed, and owned.

Queue, integration, message, automation, reconciliation, and kill behavior isvisible.

Rollback and forward-fix plans are honest.

Incident, vendor-outage, automation-disable, downtime, and recovery drillsexercise real controls safely.

On-call/escalation and manual fallback are documented.

Re-enable behavior is controlled.

Professional and legal boundary validation

Have the required authorized reviewers verify only their respective domain:

Professional reviewers approve professional workflow and responsibility.

Legal/privacy reviewers determine legal and privacy requirements.

Procurement/vendor reviewers approve contracts and vendor evidence.

Product owners approve intended use and rollout.

Task 11 records those decisions and checks their scope/expiry. It does notcreate them.

Validation deliverable

docs/task-11/quality-security-privacy-accessibility-and-operations-validation-plan.md

Implementation Sequence

Implement in the following order unless repository evidence requires a saferdependency order:

Phase 0 — inspect and contain

Read repository instructions.

Inventory current controls and capabilities.

Identify production-reachability risks.

Stop and contain any real PHI, secret, or production access found insynthetic tooling.

Record blockers.

Phase 1 — bootstrap the gate

Create control catalogue.

Create risk/autonomy definitions.

Create capability register schema.

Create evidence/approval/finding/exception schemas.

Add schema validators.

Register Task 11 itself.

The bootstrap gate must not claim independent approval before reviewers haveverified it.

Phase 2 — deterministic CI

Lock dependency installation.

Add TypeScript, ESLint, pure tests, build, secret, dependency, and policychecks.

Add stable aggregate gate.

Add negative tests.

Document branch protection.

Phase 3 — database evidence

Add isolated PostgreSQL harness.

Add fresh migration.

Add constraint and concurrency suites.

Add migration risk/rollback records.

Phase 4 — shared cross-cutting controls

Add configuration boundary.

Add safe logger and observability schemas.

Add forbidden-pattern/import checks.

Add authorization, tenant, audit, retention, idempotency, concurrency,rollback, downtime, and reconciliation helpers.

Phase 5 — accessibility and evidence

Add accessibility automation.

Create manual evidence matrix.

Create evidence bundle and hash validation.

Add findings/remediation/exception enforcement.

Phase 6 — runtime release controls

Add server-side release gate.

Add cohorts, feature gates, kill switches, expiry, circuit breakers, androllback contracts.

Prove fail-closed behavior.

Phase 7 — operational readiness

Add payload-free SLIs/SLOs.

Add dashboards and alerts.

Run synthetic incident, privacy-event, vendor-outage, automation-disable,downtime, and recovery drills.

Phase 8 — cross-task adoption

Register each roadmap capability.

Review its test plan.

Map its evidence profile.

Validate evidence before any promotion.

Track gaps without weakening the shared gate.

Mandatory Stop Conditions

Stop the entire Task 11 implementation and report the blocker if:

AGENTS.md or another applicable repository instruction conflicts with therequested operation.

Task 01’s synthetic environment is missing or unsafe and no independentnon-runtime documentation work remains.

Real PHI, real patient information, real secure-message content, realcredentials, or real production data appears in fixtures, tests, logs,screenshots, artifacts, or evidence.

Synthetic tooling can connect to production.

Untrusted CI can access production or privileged secrets.

Required checks cannot be made fail-closed.

The release gate can be bypassed by client input, environment ambiguity,missing state, or direct domain calls.

Branch or deployment enforcement would require concealing a known bypass.

A non-waivable control would need an exception.

Task 11 policy changes can self-approve and bypass independent review.

A synthetic release-control implementation could operate in production.

A kill switch cannot be made independent of the capability/vendor beingdisabled.

A normal approved workflow cannot operate when an experimental capability isdisabled.

Stop the affected workstream and report the blocker if:

Required repository or provider permissions are unavailable.

Branch protection cannot be inspected or configured.

The production PostgreSQL major version or required extension set cannot bedetermined from approved non-production evidence.

Complete migration history is missing or inconsistent.

Fresh migrations cannot run against isolated real PostgreSQL.

A destructive or irreversible migration has no approved forward-fix orcontingency.

A critical invariant can only be enforced in the UI.

A protected operation lacks an authoritative identity/tenant source.

A deterministic race cannot be created for a critical concurrency claim.

An integration lacks a specification sufficient for idempotency andreconciliation.

A vendor requires live credentials or production data for synthetic testing.

Observability requires request bodies, identifiers, message content, orclinical payload.

An accessibility requirement cannot be tested with the available supportedenvironment and no authorized reviewer can provide evidence.

A drill would require a real external patient message, real vendor effect, orproduction outage.

The responsible reviewer or approval owner cannot be identified.

A required policy decision would need to be invented by the implementationagent.

Stop the affected capability’s promotion and continue independent safe work if:

Capability owner or backup owner is missing.

Purpose or exclusions are ambiguous.

Risk tier is unresolved.

Autonomy level is unresolved.

Evidence profile is unresolved.

Threat model or privacy flow is missing.

Required evidence is missing, failed, skipped, stale, or for another commit.

Required artifact hash does not match.

A blocking finding is open.

A required approval is missing, expired, rejected, blocked, or outside scope.

PIA or TRA is required but not approved.

Professional, legal, privacy, security, accessibility, product, operations,procurement, vendor, residency, or contract review is unresolved.

An exception is expired, overly broad, self-approved, or lacks a testedcompensating control.

Security or accessibility failure lacks a remediation owner.

Kill switch, rollback, forward-fix, SLO, incident owner, or drill is missing.

Dependency capability is not approved for the requested stage.

Rollout cohort is ambiguous or client-controlled.

Evidence contains real or sensitive data.

A production migration, authentication change, vendor activation, PHI flow,external message, automation, or high-consequence effect lacks explicitapproval.

Error budget is exhausted under the approved release policy.

Evidence or approval review date has expired.

Unknown state exists.

Do not weaken tenant, identity, privacy, security, accessibility, audit,retention, assessment, prescribing, dispensing, messaging, fulfilment,billing, claim, finalization, or release controls to continue.

When external permissions block enforcement:

Complete safe local implementation and documentation.

Produce exact configuration and evidence.

Name the external owner.

Mark enforcement BLOCKED.

Do not report the acceptance criterion as passed.

Deliverables

Current-state and gap analysis.

Capability and authoritative-system inventory.

CI/evidence reachability and bypass analysis.

Capability risk-tier model.

Capability autonomy-level model.

Stable control catalogue.

Evidence profiles.

Gate-decision schema and validator.

Required CI workflow.

Stable required-job contracts.

CI threat model.

Branch-protection and merge-gate documentation.

Branch-gate verification evidence.

Secret-scan configuration and tests.

Dependency-review policy and tests.

Raw-environment policy and typed configuration boundary.

Payload-free logger and observability schemas.

PHI/sensitive logging checks.

Browser-storage, URL, referrer, notification, and protected-cache checks.

Forbidden integration-import graph and checks.

Suppression and exception checks.

Shared security/privacy test helpers.

Isolated fresh-PostgreSQL migration harness.

Fresh-migration test.

Database constraint and deterministic concurrency tests.

Migration risk, compatibility, rollback, and forward-fix template.

Threat-model template.

Trust-boundary and data-flow template.

Privacy field-inventory template.

Control-to-evidence mapping template.

Authorization and tenant-pinning evidence suite.

Audit and retention/hold evidence suite.

Idempotency and race evidence suite.

Rollback, downtime, and reconciliation evidence suite.

Accessibility test matrix.

Manual accessibility evidence format.

Automated accessibility test configuration.

Accessibility finding register.

SLI/SLO/error-budget policy.

Payload-free metrics, tracing, dashboard, and alert design.

Machine-readable SLI/SLO registry.

Capability release register.

Evidence-manifest schema.

Release-decision schema.

Capability lifecycle and change-trigger matrix.

Approval and separation-of-duties model.

Finding, remediation, exception, and expiry model.

Server-side release-gate contract.

Feature-gate and rollout-cohort contract.

Global, environment, capability, vendor, automation, and cohort killswitches as applicable.

Circuit-breaker contract.

Rollback, forward-fix, and reconciliation plan.

Incident-response runbook and drill.

Privacy-event runbook and drill.

Vendor-outage runbook and drill.

Automation-disable runbook and drill.

Downtime/recovery runbook and drill.

Database-restore/retention runbook and drill where applicable.

Cross-task pre-implementation test-plan review.

Cross-task pre-promotion evidence review.

Synthetic release-control prototype.

Deterministic Task 11 fixtures.

Synthetic evidence bundles and negative cases.

Comprehensive automated tests.

Mobile, desktop, keyboard, screen-reader, zoom/reflow, reduced-motion, andlong-label evidence.

Quality, security, privacy, accessibility, and operations validation plan.

Production enforcement handoff and unresolved-decision register.

Updated task status and repository documentation.

P0 Foundation Acceptance Criteria

Task 11’s foundation is complete only when:

Every existing and roadmap capability has an entry or an owned gap.

Every capability has a bounded purpose, owner, risk tier, autonomy level, andcurrent stage.

One versioned control catalogue defines required evidence.

CI installs from the committed lockfile.

TypeScript, ESLint, pure tests, build, secret, dependency, policy, freshmigration, constraint, automated accessibility, evidence validation, andaggregate release jobs run.

A required job cannot be skipped, cancelled, omitted, renamed, neutralized,or satisfied by another commit without blocking.

Protected branch enforcement is verified or explicitly reported BLOCKED.

Untrusted CI has no production secrets.

Pure and policy tests make no external network calls.

Fresh migrations run against isolated real PostgreSQL.

Database constraint tests prove applicable critical invariants.

No test uses production, redacted, pseudonymized, masked, de-identified, orcopied patient data.

No test output or artifact contains PHI, secrets, tokens, message content,exact location, raw media, or reusable identifiers.

Raw environment access is centralized and checked.

PHI/sensitive logging checks include static and runtime evidence.

Browser storage, URL, cache, referrer, analytics, and notification checkscover protected workflows.

Forbidden integration imports are enforced.

Suppressions require valid, scoped, expiring exception records.

Reusable threat, trust-boundary, data-flow, privacy, and evidence templatesare versioned.

Shared authorization, tenant, audit, retention, idempotency, concurrency,rollback, downtime, and reconciliation helpers pass.

The accessibility matrix covers 375px, desktop, keyboard, screen reader,contrast, 200%/400%, reduced motion, long labels, and 56px frequent actions.

Every security and accessibility finding has a remediation owner.

Payload-free SLI, SLO, metric, trace, dashboard, and alert contracts exist.

The release register contains owner, autonomy, risk, approvals, PIA/TRAstatus, evidence, cohort, kill switch, rollback, SLO, and review date.

Evidence manifests are hashed, attributable, current, and schema-valid.

Self-approval and expired approval are rejected.

Unknown or expired exceptions are rejected.

Every experimental capability has an owner, expiry, and tested kill switch.

Kill switches block new work and define queued/in-flight behavior.

Rollback or forward-fix is documented and rehearsed for the syntheticcapability.

Incident, privacy-event, vendor-outage, automation-disable, and downtimedrills produce safe evidence and owned findings.

Test plans can be reviewed before implementation.

Evidence can be reviewed before promotion.

Negative synthetic capabilities are denied for the correct safe reason.

Unknown state fails closed.

Original acceptance criteria preserved

A pull request cannot merge when required quality gates fail.

Fresh migrations and constraint tests run against real local PostgreSQL.

No test output or CI artifact contains PHI or secrets.

Every experimental capability has an owner, expiry, and kill switch.

Every production candidate links to its approvals and evidence.

Security and accessibility failures have named remediation owners and cannotbe silently waived.

Limited and Production Promotion Gates

Before non-production integration:

P0 foundation passes.

Capability test plan is approved for the requested integration.

Synthetic evidence passes.

Production adapters remain unreachable unless specifically approved for thenon-production environment.

Vendor specification is sufficient.

Test credentials and data route are approved.

Integration kill, timeout, retry, idempotency, replay, and reconciliationevidence passes.

Before a limited production cohort:

Exact capability-version is registered.

Required evidence profile passes.

Exact source commit and migration head are fixed.

Threat model and privacy flow are current.

PIA/TRA status is approved where required.

Professional, privacy, security, accessibility, product, operations,legal/procurement, vendor/contract, and residency reviews are approved whereapplicable.

No non-waivable or open blocking finding exists.

Every temporary exception is valid and visible.

SLOs, alerts, error budget, and incident owner are active.

Kill switch and rollback/forward-fix were rehearsed.

Incident and relevant vendor/automation/downtime drills pass.

Cohort is exact and server-derived.

Normal fallback is documented and accessible.

Production release authority approves the limited cohort.

Before production expansion:

Limited-cohort hold period and review are complete.

Capability-specific SLO and error-budget results are within policy.

No unexplained security, privacy, professional, operational, accessibility,or reconciliation signal remains.

Findings are closed or validly dispositioned.

Approvals and evidence remain current.

Cohort expansion is explicitly approved.

Kill, rollback, incident, and support readiness remain current.

A Task 11 PASS does not approve:

Clinical accuracy.

Professional scope.

Prescribing.

Dispensing.

Referral.

Billing or claims.

Consent language.

Legal compliance.

Privacy-breach reportability.

Vendor contract.

Data residency.

PHI use.

Production authentication or migrations.

AI model use.

A broader cohort than the recorded decision.

Final Report Format

End the task with:

Task 11 control-plane status: PASS | BLOCKED | FAIL

Task 01 synthetic environment: READY | BLOCKED | NOT VERIFIEDRepository instructions: PASSED | BLOCKED | NOT VERIFIEDCurrent-state assessment: PASS | BLOCKED | FAILCapability inventory: PASS | BLOCKED | FAILControl catalogue: PASS | FAILRisk-tier model: PASS | FAILAutonomy-level model: PASS | FAILEvidence profiles: PASS | FAILGate-decision validator: PASS | FAILCI threat model: PASS | FAILLockfile installation: PASS | FAILTypeScript gate: PASS | FAILESLint gate: PASS | FAILPure-test gate: PASS | FAILBuild gate: PASS | FAILSecret-scan gate: PASS | FAILDependency-review gate: PASS | FAILSecurity-policy gate: PASS | FAILFresh-PostgreSQL migration gate: PASS | FAILDatabase-constraint gate: PASS | FAILAutomated-accessibility gate: PASS | FAILEvidence-validation gate: PASS | FAILAggregate release gate: PASS | FAILProtected branch enforcement: ENFORCED | BLOCKED | NOT VERIFIEDMissing/skipped/cancelled required checks fail: PASS | FAILUntrusted CI secret isolation: PASS | FAILCI supply-chain review: PASS | BLOCKED | FAILRaw-environment policy: PASS | FAILPHI/sensitive logging policy: PASS | FAILBrowser-storage policy: PASS | FAILProtected-cache/referrer policy: PASS | FAILForbidden-import policy: PASS | FAILSuppression/exception policy: PASS | FAILThreat-model template: PASS | FAILPrivacy/data-flow template: PASS | FAILAuthorization evidence helpers: PASS | FAILTenant-pinning evidence helpers: PASS | FAILAudit evidence helpers: PASS | FAILRetention/hold evidence helpers: PASS | FAILIdempotency evidence helpers: PASS | FAILConcurrency/race harness: PASS | FAILRollback/forward-fix harness: PASS | FAILDowntime/recovery harness: PASS | FAILReconciliation harness: PASS | FAILAccessibility matrix: PASS | FAIL375px and desktop evidence: PASS | FAILKeyboard and screen-reader evidence: PASS | FAIL200% and 400% zoom/reflow: PASS | FAILReduced-motion evidence: PASS | FAILLong-label/Bangla fixture evidence: PASS | BLOCKED | FAIL56px frequent-action evidence: PASS | FAILAccessibility findings have owners: PASS | FAILSecurity findings have owners: PASS | FAILPayload-free observability: PASS | FAILSLI registry: PASS | FAILSLO/error-budget registry: PASS | BLOCKED | FAILRelease register: PASS | FAILEvidence manifest: PASS | FAILApproval separation: PASS | FAILFinding/remediation workflow: PASS | FAILException/expiry enforcement: PASS | FAILServer-side release gate: PASS | FAILFeature gates/cohorts: PASS | FAILGlobal kill switch: PASS | FAIL | NOT APPLICABLECapability kill switch: PASS | FAILAutomation kill switch: PASS | FAIL | NOT APPLICABLEDelayed-work rejection after kill: PASS | FAILRollback rehearsal: PASS | FAILIncident drill: PASS | BLOCKED | FAILPrivacy-event drill: PASS | BLOCKED | FAILVendor-outage drill: PASS | BLOCKED | FAIL | NOT APPLICABLEAutomation-disable drill: PASS | BLOCKED | FAIL | NOT APPLICABLEDowntime/recovery drill: PASS | BLOCKED | FAILDatabase-restore/retention drill: PASS | BLOCKED | FAIL | NOT APPLICABLECross-task test-plan review process: PASS | FAILCross-task promotion review process: PASS | FAILSynthetic release-control prototype: PASS | FAILAutomated tests: PASS | FAIL

Task 02 test-plan review: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 03 test-plan review: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 04 test-plan review: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 05 test-plan review: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 06 test-plan review: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 07 test-plan review: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 08 test-plan review: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 09 test-plan review: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 10 test-plan review: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLE

Task 02 promotion evidence: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 03 promotion evidence: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 04 promotion evidence: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 05 promotion evidence: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 06 promotion evidence: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 07 promotion evidence: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 08 promotion evidence: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 09 promotion evidence: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 10 promotion evidence: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLE

Capabilities registered: COUNTCapabilities missing owner: NONE | COUNTCapabilities missing risk tier: NONE | COUNTCapabilities missing autonomy level: NONE | COUNTExperimental capabilities missing expiry: NONE | COUNTExperimental capabilities missing kill switch: NONE | COUNTProduction candidates missing evidence: NONE | COUNTProduction candidates missing approvals: NONE | COUNTOpen blocking findings: NONE | COUNTOpen security findings: NONE | COUNTOpen accessibility findings: NONE | COUNTActive exceptions: NONE | COUNTExpired exceptions: NONE | COUNTExpired approvals/evidence: NONE | COUNTNon-waivable exceptions: NONE | FAIL

PIA status by applicable capability: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLETRA status by applicable capability: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLEProfessional review by applicable capability: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLEPrivacy review by applicable capability: APPROVED | BLOCKED | NOT VERIFIEDSecurity review by applicable capability: APPROVED | BLOCKED | NOT VERIFIEDAccessibility review by applicable capability: APPROVED | BLOCKED | NOT VERIFIEDOperations review by applicable capability: APPROVED | BLOCKED | NOT VERIFIEDLegal/regulatory review by applicable capability: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLEVendor/contract review by applicable capability: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLEResidency evidence by applicable capability: VERIFIED | BLOCKED | NOT VERIFIED | NOT APPLICABLEProduction release authority: APPROVED | BLOCKED | NOT VERIFIED | NOT APPLICABLE

Real PHI used: NO | FAILDe-identified production data used as synthetic: NO | FAILSecrets exposed in CI/evidence: NO | FAILProduction database accessed: NO | FAILProduction credentials used: NO | FAILProduction migration applied: NO | APPROVED | FAILProduction authentication changed: NO | APPROVED | FAILProduction vendor connected: NO | APPROVED | FAILExternal messages sent: NO | APPROVED | FAILReal payments/shipments/claims created: NO | APPROVED | FAILClient-controlled release authorization: NO | FAILUnknown release state fails closed: YES | FAILSecurity failures silently waived: NO | FAILAccessibility failures silently waived: NO | FAIL

Blocking issues:Unenforced repository settings:Missing capability owners:Missing or stale approvals:Open quality findings:Open security findings:Open privacy findings:Open accessibility findings:Open operational findings:Active exceptions and expiries:Unresolved professional/legal/vendor decisions:Deferred production enforcement:Evidence locations:Files changed:Tests run and results:Drills run and results:Recommended next action:

Never report production readiness while branch enforcement, required checks,synthetic isolation, owner/risk/autonomy registration, authorization, tenantpinning, database constraints, evidence integrity, security, privacy,accessibility, SLOs, kill switch, rollback, incident readiness, requiredprofessional/legal/vendor approvals, PIA/TRA, residency, or release authorityremains unresolved.

If the P0 synthetic control plane passes while production enforcement orcapability approvals remain blocked, report:

Task 11 foundation: PASS — deterministic CI, security/privacy policy checks,fresh-PostgreSQL evidence, accessibility evidence, release registration,kill-switch controls, and synthetic drills are operational; productionpromotion remains gated by repository enforcement and capability-specificprofessional, privacy, security, accessibility, legal, vendor, PIA/TRA, SLO,and release approvals.
