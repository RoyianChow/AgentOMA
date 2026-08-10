Task 02 — Close the P0 Assessment Production-Readiness Gap

## Next-sprint checkpoint — 2026-08-10

**Repository state:** `BLOCKED`; do not promote or apply migration `0018`.
**Sprint slice:** freeze a new exact candidate, obtain an unexpired G1-D,
complete the predecessor/restart proof, resolve S27 export reconstruction, and
obtain exact-candidate Task 11 review.
**Exit:** sanitized evidence is bound to the candidate and hashes, or the task
remains explicitly `BLOCKED`. Live work still requires recovery proof, G1-L,
post-apply verification, and G4. See
[`NEXT-SPRINT-PLAN-2026-08-10.md`](NEXT-SPRINT-PLAN-2026-08-10.md).

Version: 3.0Supersedes: Task 02 v2Date: 2026-07-30Owner profile: Senior backend/database engineer, with independent QA/security reviewPriority: P0Status: Ready for ungated inspection and bounded export work; migration execution and live writes remain approval-gatedSystem: AgentRxPrimary capability: Defensible assessment completion, immutable billability evidence, and guarded claim-draft creation

Mission

Bring the existing AgentRx assessment workflow to a reproducible, evidence-backed deployment baseline before any online-pharmacy, virtual-care, communications, fulfilment, or AI capability can depend on it.

This task is about proving the current assessment boundary. It does not authorize the agent to redesign clinical rules, infer billing policy, weaken safeguards, or declare broad production readiness.

The task succeeds only when the exact reviewed source commit and migration are shown to preserve:

Tenant and patient isolation.

Pharmacist and professional authority.

Deterministic red-flag refusal behavior.

Atomic assessment completion.

Exactly-once billability evidence.

Correct claim-draft derivation from approved reference data.

Database-enforced immutability.

Append-only audit behavior.

Authorized export and manifest coverage.

Safe failure, retry, concurrency, and recovery behavior.

PHI-free test, CI, and release evidence.

The attached research report supports a documentation-first, rules-based, human-reviewed product boundary. It does not replace repository behavior, approved Ontario billing references, pharmacist review, privacy review, or the authoritative migration and application code.

1. Binding agent contract

1.1 Instruction precedence

The agent must apply instructions in this order:

Platform and workspace safety instructions.

The nearest applicable AGENTS.md.

Explicit written approvals for the exact action, commit, migration hash, and environment.

This Task 02 specification.

Existing repository conventions and documented workflows.

The agent’s implementation judgment.

If two instructions conflict, follow the higher-priority instruction and report the conflict. Do not silently choose the more permissive interpretation.

This document is a work specification, not approval to mutate a database, deploy code, inspect PHI, or use production credentials.

1.2 Requirement language

The terms MUST, MUST NOT, REQUIRED, SHOULD, and MAY are binding as used in this document.

MUST / REQUIRED — release-blocking.

MUST NOT — prohibited.

SHOULD — expected unless a documented repository constraint prevents it.

MAY — optional and non-authorizing.

1.3 Agent operating rules

The agent must:

Read the applicable AGENTS.md completely before taking task actions.

Inspect the repository before proposing paths, commands, roles, or architecture.

Record the exact commit SHA, working-tree state, migration head, migration path, and SHA-256 hash.

Preserve unrelated user changes and stop if they overlap this task’s protected surfaces.

Use the repository’s configured migration and test workflows; do not invent a parallel migration path.

Use only configured, task-relevant credentials. Never request, print, copy, transform, or persist secrets.

Treat all production data as PHI-bearing even when a queried field appears harmless.

Restrict live verification to approved aggregates and catalog metadata.

Use unmistakably synthetic fixtures only in the disposable PostgreSQL environment.

Keep every clinical, billing, and authorization decision with its existing authoritative service or approved reference table.

Fail closed on unknown states, roles, mappings, migration history, environment identity, or approvals.

Record skipped, blocked, and unavailable checks as such. Never convert them to PASS.

Tie every evidence claim to the exact commit, migration hash, command, exit code, and environment class.

Complete safe independent work when one gated workstream is blocked.

Leave the ordinary pharmacist workflow usable if export work or test infrastructure fails.

The agent must not:

Infer approval from silence, prior discussion, job title, access, or possession of credentials.

Edit, squash, reorder, regenerate, rename, or replace an existing migration.

use an owner or superuser connection as proof of app-role behavior.

Disable a constraint, trigger, RLS policy, audit path, authorization check, or test to obtain a green result.

Read live row contents for debugging or evidence.

Copy live data into Docker, fixtures, screenshots, logs, or reports.

Hand-edit the live schema after a failed migration.

retry a failed live migration without a new investigation record and fresh written approval.

Hardcode a PIN, SSC, fee, maximum, billing outcome, or clinical result in new export logic or tests.

Change LTC or orientation behavior without the corresponding decision gate.

Add test-only bypasses that can be imported, configured, or reached in production.

Claim that Task 02 replaces pharmacist, privacy, legal, product, security, or release approval.

1.4 Closed execution loop

For every bounded implementation change allowed by this task, use this sequence:

Inspect — identify the current source of truth and existing test convention.

Specify — write the invariant and expected failure behavior.

Gate — confirm that the action is ungated or quote the exact approval.

Red — add or identify a test that fails for the missing behavior.

Implement — make the smallest in-scope change.

Green — run the narrow test and then the affected suite.

Adversarial — test wrong tenant, wrong patient, wrong role, duplicate, race, failure, and retry paths as applicable.

Evidence — record sanitized commands, exit codes, results, and artifact hashes.

Review — obtain the applicable Task 11 evidence review before promotion.

Do not start with implementation when repository discovery, an approval gate, or the expected invariant is unresolved.

2. Definitions and authoritative boundaries

2.1 Definitions

Term

Binding meaning in this task

Reviewed build

One exact source commit SHA plus its recorded working-tree state.

Migration head

The repository migration identifier that the configured runner treats as current head.

Migration hash

SHA-256 of the exact bytes of 0018_clever_mister_fear at the reviewed build.

Migration-chain digest

Deterministic digest of the ordered migration identifiers and file hashes used for replay.

Disposable PostgreSQL

A new, isolated local Docker database and volume created for this task, containing no live data or credentials and safe to destroy.

Live environment

The specifically approved Supabase/PostgreSQL project identified by non-secret project reference. “Production,” “prod,” and “live” are equivalent here.

App role

The database role actually used by the application in the target environment. A simulated role is supporting evidence only unless its grants match the target role.

Owner role

A migration/administrative role with elevated schema privileges. It must not be used to prove application authorization.

Billability evidence

The immutable assessment-completion evidence row used by the existing billing workflow.

Active claim draft

The one non-superseded claim draft produced through the existing authoritative billing service.

Completed-then-referred

A completed assessment followed by pharmacist referral. It is distinct from a red-flag refusal.

Red-flag refusal

A rules-based safety stop that prevents clinical completion and must create neither billability evidence nor a claim draft.

Failure atomicity

Required assessment, evidence, audit, and claim effects either commit together as designed or leave no forbidden partial state.

Parity

Agreement on expected migration identity and required schema/security invariants. Parity does not mean copying live data or comparing row contents.

PASS

Every mandatory criterion in the declared release scope is proven with current evidence.

BLOCKED

Required evidence or authority is unavailable, but no proven invariant is violated.

FAIL

A required invariant is demonstrably violated or a required test fails.

2.2 Authoritative systems

The agent must preserve these authority boundaries:

Decision or fact

Authority

Assessment clinical completion

Existing pharmacist-authorized assessment service

Red-flag outcome

Existing deterministic rules and approved reference data

Billability

Existing assessment/billing service and seeded approved reference data

PIN, SSC, fee, maximum, and claim mapping

Existing billing service and active reference rows

Professional judgment

Authorized pharmacist

Tenant and patient scope

Existing authenticated server context and database enforcement

Evidence and audit immutability

PostgreSQL constraints, privileges, and triggers/policies

Migration ordering and execution

Repository migration registry and configured db:migrate workflow

Export authorization

Existing server-side authorization and tenant-pinning layer

Production promotion

Task 11 release register, required evidence, and named approvers

LTC behavior

G2 decision authority

Orientation override

G3 product/compliance authority

An export, PDF, webhook, UI state, log entry, delivery event, or client-supplied field is never authoritative for clinical completion or claim creation.

2.3 Protected surfaces

The following are read-only under this task:

0018_clever_mister_fear and every earlier migration.

Migration registry and ordering.

Red-flag and triage rules.

Clinical reference data.

Claim-derivation rules.

Active PIN, SSC, fee, maximum, or intervention mappings.

Assessment-finalization behavior.

Audit semantics.

Immutability guards.

Tenant and patient authorization.

Authentication or session behavior.

LTC billing behavior.

Orientation completion and override behavior.

Production infrastructure, secrets, network policy, and vendor configuration.

A defect in a protected surface must be documented with:

Exact file/object location.

Observed behavior.

Expected invariant.

Reproduction evidence.

Safety and release impact.

Smallest recommended follow-up.

Do not fix it in-flight.

2.4 Permitted code changes

Before approval for any larger remediation, this task permits only:

Test and evidence harnesses that cannot operate against live environments.

Synthetic fixtures owned by the test environment.

Documentation.

Workstream F changes needed to include existing billability evidence in authorized PDF/export/manifest/retrieval paths.

Narrow testability seams for deterministic fault injection, only when they are impossible to enable in production and do not alter normal runtime behavior.

If export coverage requires a schema change, migration change, authorization change, billing change, or new production dependency, stop that implementation and report it as a follow-up.

3. Approval and decision gates

Approval is a recorded fact. It exists only when the named authority provides an explicit written statement for the exact action, migration head, migration hash, source commit, and environment where applicable.

Silence, credentials, access, a prior approval for different bytes, or wording such as “continue,” “looks good,” or “use your judgment” does not grant a migration gate.

3.1 Gate register

Gate

Required decision

Authority

Minimum binding scope

Blocks

G1-D

Execute the full migration chain, including 0018_clever_mister_fear, in a new disposable Docker PostgreSQL instance

Lead named by AGENTS.md

Commit SHA, migration head/hash, disposable environment only

Workstreams B, D, and real-Postgres verification of E

G1-L

Apply 0018_clever_mister_fear once to the named live project using the configured migration workflow

Lead named by AGENTS.md, plus deployment authority if repository policy requires it

Commit SHA, migration head/hash, non-secret live project reference, approved change window

Live write in Workstream C

G2

Resolve LTC billing behavior

Authoritative ODB Help Desk ruling or documented pilot-pharmacist decision, as accepted by product/compliance

Exact answerable policy question and effective scope

LTC implementation and LTC production enablement

G3

Resolve whether and how orientation can be overridden

Product/compliance authority

Authorized role, conditions, audit requirements, expiry, and effective scope

Orientation-override implementation

G4

Approve Task 02 evidence for promotion under Task 11

Named QA/security/release approvers; pharmacist/privacy reviewers where required

Exact evidence manifest and source commit

Production promotion

An existing written G1 approval may satisfy both G1-D and G1-L only when it unambiguously names both actions and all required identifiers. Otherwise, treat the narrower action as unapproved.

3.2 Gate record

For each gate, record:

Gate ID.

GRANTED, NOT GRANTED, EXPIRED, or REVOKED.

Verbatim approval or decision text.

Approver identity and authority basis.

UTC timestamp or source message timestamp.

Source commit SHA.

Migration head and SHA-256.

Environment class and live project reference where applicable.

Scope limitations.

Expiry or change triggers.

Evidence-file location.

Do not place secrets, connection strings, email addresses, or personal health information in the gate record.

3.3 Gate invalidation

Any of the following invalidates a migration approval:

Source commit changes.

Migration file bytes change.

Migration head or ordering changes.

Target project reference changes.

The configured migration runner changes materially.

The approved time window expires.

The approver revokes the decision.

A stop condition reveals materially different risk.

When invalidated, stop the affected workstream and return to approval. Never “carry forward” an approval to new bytes.

3.4 Parked decisions

G2 and G3 may remain unresolved without blocking a core, limited-scope Task 02 verification only if all of the following are proven:

LTC behavior remains fail-closed or excluded from the release cohort.

No LTC billing rule is inferred or newly implemented.

Orientation remains a hard gate.

No orientation override exists or is enabled.

The release register explicitly excludes those capabilities.

Decision notes are complete and assigned.

If the proposed release includes LTC behavior or an orientation override, unresolved G2 or G3 makes the release BLOCKED.

4. Dependencies and coordination

4.1 Required repository inputs

The agent must locate rather than assume:

Applicable AGENTS.md.

Package-manager and runtime lockfiles.

Migration directory, migration registry, and configured runner.

0018_clever_mister_fear.

Its predecessor migration and current repository head.

PostgreSQL/Docker configuration.

Application and migration role definitions.

Assessment completion service.

Billability-evidence model and table.

Claim-draft service and tables.

Audit writer and audit table.

Tenant- and patient-authorization helpers.

Reference-data seed source.

Assessment PDF generator.

Complete-patient export.

Export manifest and hashing code.

Retrieval and restore paths.

Existing test commands and CI configuration.

Existing release, compliance, status, handoff, and restore-drill documents.

Unknown or absent inputs must be recorded as gaps. Do not create fictitious paths or commands.

4.2 Task 01 relationship

Task 01’s synthetic environment should be READY or PASS before Task 02 synthetic evidence is treated as reusable release evidence.

If Task 01 is unavailable, Task 02 may still perform static review and bounded unit work. Docker execution is allowed only when the dedicated Task 02 environment independently proves:

No production credentials.

No live data.

No external integration calls.

No route to the live database.

Unmistakable synthetic fixtures.

Fail-hard behavior when a production environment is detected.

Safe teardown.

Task 02 must not declare Task 01 ready.

4.3 Task 11 relationship

Task 11 is the release-control authority for this task.

Before implementation:

Register Task 02’s test plan or record why the Task 11 bootstrap is not yet available.

Identify required CI checks.

Identify non-waivable security, privacy, database, and evidence controls.

Before promotion:

Attach the Task 02 evidence manifest to the release register.

Obtain required evidence review.

Verify every artifact belongs to the same commit.

Verify no required check is skipped, neutral, stale, or from another commit.

If Task 11 is not operational, complete safe Task 02 work but report production promotion as BLOCKED. Task 02 cannot approve itself.

4.4 Other task boundaries

Task 05 identity and tenant boundaries remain authoritative; this task tests but does not redesign them.

Task 06 virtual-care events cannot complete an assessment or create a claim.

Task 07 delivery or read receipts cannot complete an assessment or create a claim.

Task 08 fulfilment, payment, inventory, pickup, or courier events cannot complete an assessment or create a claim.

Task 10 AI output cannot set billability, generate claim values, or write immutable evidence.

Any cross-task event that bypasses the existing assessment-completion service is a release-blocking failure.

5. Mandatory stop conditions

Stop the affected action immediately, preserve safe state, and report the ID.

ID

Stop condition

S1

AGENTS.md or a higher-priority instruction conflicts with the requested operation.

S2

Existing user changes overlap a migration, protected service, security control, or file this task would modify.

S3

Commit SHA, migration head, migration ordering, or migration hash drifts after baseline or approval.

S4

G1-D or G1-L is missing, ambiguous, stale, revoked, or scoped to different bytes or a different environment.

S5

The target database cannot be identified unambiguously before connection or execution.

S6

The Docker target has any production credential, live-data route, external integration, reused production dump, or non-synthetic fixture.

S7

Static review finds destructive or out-of-scope SQL not explicitly reviewed and approved.

S8

The migration relies on an undocumented extension, owner capability, unsafe SECURITY DEFINER, mutable search_path, trigger bypass, or privilege escalation.

S9

The actual app role can update, delete, truncate, replace, or indirectly cascade-delete evidence or audit rows.

S10

Tenant or patient isolation can be bypassed through direct SQL, foreign-key substitution, missing tenant predicates, RLS, or export retrieval.

S11

Failure atomicity cannot be proven on real PostgreSQL.

S12

A red-flag refusal creates an assessment-completion evidence row, claim draft, or claim effect.

S13

A failed, duplicate, or concurrent completion creates multiple evidence rows or multiple active claim drafts.

S14

A PIN, SSC, fee, maximum, or claim outcome differs from the active seeded reference source or is hardcoded.

S15

LTC or orientation behavior would require an unresolved policy or professional decision.

S16

The live pre-apply catalog, migration history, grants, triggers, functions, tenant aggregates, or expected counts differ materially from the approved baseline.

S17

A verified backup/restore point and approved recovery plan are absent before live application.

S18

Live migration application fails, times out ambiguously, partially applies, or returns an indeterminate result.

S19

A second live apply, manual schema repair, ad hoc SQL console action, rollback, or forward fix would be required.

S20

PHI, secrets, tokens, connection strings, row contents, message bodies, or sensitive identifiers appear in logs, test output, screenshots, commands, CI artifacts, or evidence.

S21

Live verification would require reading row contents rather than approved counts, aggregates, or catalog metadata.

S22

A test-only failure hook, bypass, fixture, or credential could be enabled or imported in production.

S23

Any required guard, test, trigger, constraint, policy, or audit path is weakened, disabled, mocked, skipped, or described as temporary.

S24

Required evidence cannot be tied to one exact source commit and migration-chain digest.

S25

Task 01 synthetic isolation or Task 11 release controls are missing in a way that makes the affected evidence unsafe or promotion ungoverned.

S26

Completing the task would require new authority, a live vendor, an authentication change, a production schema change beyond the reviewed migration, or access to PHI.

S27

Export determinism or manifest-hash semantics cannot be established without changing an existing approved contract.

S28

A live query or command unexpectedly returns row contents or secrets. Stop capture, protect the material, and follow the incident/privacy process.

A stop condition does not automatically make the whole task FAIL.

Mark FAIL when a required invariant is proven false.

Mark BLOCKED(S-id) when evidence or authority is unavailable without a proven invariant violation.

Complete all safe, independent, ungated work.

Do not wait indefinitely for a gate during the same agent run.

6. Required current-state and gap analysis

Before implementation or migration execution, create:

docs/p0/task-02/current-state-and-gap-analysis.md

It must contain:

6.1 Repository state

Commit SHA.

Branch name.

Clean/dirty state.

List of overlapping task-relevant modified files, without file contents.

Applicable AGENTS.md path and relevant constraints.

Package manager, runtime, ORM/query layer, and test runner discovered.

Configured migration command and implementation path.

Current migration head and predecessor.

Exact path and SHA-256 of 0018_clever_mister_fear.

Ordered migration-chain digest.

6.2 Service and data-flow map

Identify the current path for:

Authenticated pharmacist request.

Tenant and patient resolution.

Assessment authorization.

Red-flag evaluation.

Assessment completion.

Billability determination.

Evidence insertion.

Claim-draft creation.

Audit insertion.

Transaction commit or rollback.

PDF/export generation.

Manifest hashing.

Retrieval and restore.

For each step, record:

Source file/function.

Input authority.

Database role.

Transaction ownership.

Failure behavior.

Audit behavior.

Existing tests.

Gaps or unknowns.

6.3 Database object inventory

Record relevant:

Tables and columns.

Primary, foreign, unique, exclusion, and check constraints.

Indexes.

Triggers and functions.

RLS policies if present.

Grants, revokes, and default privileges.

Migration-history table.

Reference-data tables.

Cascades and delete behavior.

App-role and owner-role differences.

Do not dump or inspect live row contents.

6.4 Gap classification

Classify every gap as:

DOCUMENTATION_ONLY

TEST_MISSING

EXPORT_IMPLEMENTATION_ALLOWED

PROTECTED_CODE_DEFECT

MIGRATION_DEFECT

POLICY_DECISION_REQUIRED

ENVIRONMENT_OR_ACCESS_BLOCKER

PRODUCTION_RELEASE_BLOCKER

Each gap needs an owner, severity, affected invariant, safe next action, and whether this task may address it.

7. Baseline lock and environment identity

7.1 Baseline artifact

Create:

artifacts/p0/task-02/baseline.json

Minimum fields:

{
  "schema_version": "1",
  "generated_at_utc": "<UTC timestamp>",
  "source_commit_sha": "<full SHA>",
  "working_tree_state": "clean|dirty",
  "migration_head": "0018_clever_mister_fear",
  "migration_path": "<repository-relative path>",
  "migration_sha256": "<sha256>",
  "migration_chain_digest": "<sha256>",
  "predecessor_migration": "<identifier>",
  "configured_migration_command_id": "<safe symbolic name>",
  "docker_image": "<name:version>",
  "docker_image_digest": "<digest or NOT VERIFIED>",
  "docker_postgres_version": "<version or NOT RUN>",
  "live_project_ref": "<non-secret ref or NOT AUTHORIZED>",
  "live_postgres_version": "<version or NOT VERIFIED>",
  "gate_states": {
    "G1-D": "GRANTED|NOT GRANTED|EXPIRED|REVOKED",
    "G1-L": "GRANTED|NOT GRANTED|EXPIRED|REVOKED",
    "G2": "DECIDED|PARKED",
    "G3": "DECIDED|BLOCKED",
    "G4": "GRANTED|NOT GRANTED"
  }
}

The artifact must be generated from repository and safe environment facts, not manually guessed.

7.2 Environment matrix

Environment

Permitted before gate

Permitted after gate

Prohibited

Repository

Read-only inspection; bounded Workstream F changes; tests that do not migrate a database

Same

Migration edits; protected behavior changes

Disposable Docker

Configuration inspection only

G1-D: create, replay, synthetic tests, schema dump, destroy

Live data, live credentials, external calls

Live database

Approved read-only catalog and aggregate preflight when access policy permits

G1-L: one configured migration apply, then read-only verification

Row-content reads, synthetic writes, fault injection, ad hoc SQL repair

CI

Static/unit checks with synthetic data; approved isolated PostgreSQL jobs

Same

Live secrets, live database access, PHI-bearing artifacts

7.3 Target identity checks

Before every database command, the harness must verify:

Environment class.

Non-secret project/container identifier.

Database engine and version.

Migration-history head.

Expected role class.

Synthetic marker for Docker.

Production-denial marker for fault injection and fixtures.

The check must occur in executable code, not only in operator instructions.

Any mismatch fails before mutation.

8. Execution sequence

Follow this order. Do not reorder gated phases for convenience.

Phase 0 — Inspect and contain

Read instructions.

Record repository and working-tree state.

Resolve the migration file and compute hashes.

Build the current-state and gap analysis.

Record gate states.

Create the baseline artifact.

Phase 1 — Ungated static review

Workstream A static SQL and migration review.

Read-only repository/live migration-history comparison, only if live read access is already authorized.

Workstream G decision notes.

Workstream F design and unit-level red tests.

If live read access is unavailable, record NOT VERIFIED; do not seek or extract credentials outside the configured workflow.

Phase 2 — Bounded export implementation

Implement only approved Workstream F coverage.

Run unit and pure integration tests.

Run forbidden-hardcode and leakage checks.

Do not claim real-PostgreSQL verification yet.

Phase 3 — Disposable PostgreSQL verification

Requires G1-D.

Revalidate commit, migration head/hash, and gate.

Create a new isolated PostgreSQL instance and volume.

Prove production-route denial.

Replay the full chain from zero.

Test upgrade from the immediate predecessor to 0018.

Run database invariant, privilege, atomicity, retry, and concurrency tests.

Run synthetic clinical validation.

Run Workstream F real-PostgreSQL verification.

Produce sanitized artifacts.

Destroy or quarantine the disposable environment according to the runbook.

Phase 4 — Live preflight

Requires safe read access, but no live write.

Revalidate source and migration hashes.

Identify the exact live project.

Capture approved catalog and aggregate baseline.

Compare expected schema and count deltas.

Verify backup/restore evidence and recovery ownership.

Confirm G1-L and change window.

Any mismatch stops the live workstream.

Phase 5 — Live apply and verification

Requires G1-L and every Docker release-blocking check green.

Revalidate all gate identifiers immediately before execution.

Apply once through the configured db:migrate workflow.

Capture the sanitized exit result.

Do not rerun on ambiguity.

Perform read-only post-apply catalog, grants, trigger, migration-history, and aggregate checks.

Compare pre/post state to the reviewed migration effects.

Phase 6 — Release evidence and handoff

Build the evidence manifest.

Update Task 11’s capability/release record.

Record unresolved decisions and excluded release scope.

Obtain evidence review where available.

Produce the final Task 02 report.

9. Workstream A — Migration and SQL review

Gate: Ungated and read-onlyDeliverable: docs/p0/task-02/sql-review.md

Review the exact bytes of 0018_clever_mister_fear.

9.1 Required review topics

DDL and DML inventory.

Objects created, altered, dropped, renamed, backfilled, or re-owned.

Transaction boundaries.

Migration-runner transaction behavior.

Lock types and likely lock duration.

Existing-row behavior for new NOT NULL, unique, or foreign-key constraints.

Defaults and backfill ordering.

Primary, foreign, unique, exclusion, and check constraints.

Tenant and patient key composition.

Cross-tenant foreign-key possibility.

Cascade and indirect-delete behavior.

RLS enablement, force state, and policies if used.

Trigger ordering and exception behavior.

Function language, volatility, ownership, SECURITY DEFINER, and fixed search_path.

Grants, revokes, ownership, sequences, and default privileges.

App-role versus migration-role capability.

Evidence and audit append-only enforcement.

Idempotency or explicit non-idempotency.

Failure and partial-application behavior.

Migration registry entry and checksum behavior.

Extension dependencies.

Rollback or forward-fix assumptions.

Expected schema and aggregate deltas.

9.2 Required conclusions

For each invariant, state:

PASS_STATIC

RUNTIME_PROOF_REQUIRED

BLOCKED

FAIL

Static review alone cannot prove transaction atomicity, concurrency, role behavior, RLS behavior, migration replay, or live parity.

9.3 SQL review output

The report must include:

Reviewed commit and migration hash.

Ordered migration-chain digest.

Object-change table.

Privilege-change table.

Trigger/function table.

Expected pre/post aggregate changes.

Destructive-operation assessment.

Lock and operational-risk assessment.

Open questions.

Gate status and verbatim approval if granted.

Stop conditions encountered.

10. Workstream B — Disposable PostgreSQL migration verification

Gate: G1-DEnvironment: New disposable Docker PostgreSQL onlyDeliverables:

docs/p0/task-02/docker-migration-evidence.md

artifacts/p0/task-02/test-report.json

artifacts/p0/task-02/docker-schema.sql

artifacts/p0/task-02/docker-catalog-fingerprint.json

10.1 Isolation requirements

The environment must:

Use the repository-supported PostgreSQL major version.

Record image tag, digest where available, and server version.

Use a new task-specific database and volume.

Contain no copied live data.

Contain no live project URL, token, key, or service credential.

Block external integrations.

Reject synthetic or fault-injection startup when a production marker is present.

Use deterministic, unmistakably synthetic fixtures.

Be safe to destroy without affecting another project.

Do not use an existing developer database as “fresh Docker” evidence.

10.2 Full-chain proof

From an empty database:

Start the configured migration workflow.

Apply the complete ordered migration chain.

Verify the migration-history table.

Verify the current head and hash registration.

Capture schema-only output.

Run repository constraint and integration tests.

Restart PostgreSQL and rerun read-only invariant checks.

The migration runner’s normal “already applied” behavior may be tested. Do not execute the raw non-idempotent migration twice merely to test idempotency.

10.3 Upgrade-path proof

In a separate fresh disposable instance or reset volume:

Apply the chain through the immediate predecessor.

Seed representative synthetic pre-migration rows using approved test fixtures.

Capture safe pre-apply counts and catalog fingerprint.

Apply 0018 once through the configured runner.

Verify expected schema and count deltas.

Verify preserved tenant and patient relationships.

Verify no unexpected data deletion, reassignment, or privilege expansion.

From-zero replay and predecessor upgrade are independent proofs; both are required.

10.4 Migration failure tests

Where the repository harness safely supports them, test:

Invalid prerequisite state.

Constraint collision.

Transaction rollback.

Migration-runner interruption before commit.

Restart after a confirmed rollback.

Do not manufacture failure by editing the migration. Use test setup, transaction controls, or an approved harness.

If interrupted execution leaves an indeterminate schema state, report FAIL for disposable migration recoverability and do not proceed live.

11. Workstream C — Live preflight, application, and verification

Gate: G1-L for live writeEnvironment: Exact approved live projectDeliverables:

docs/p0/task-02/live-preflight.md

docs/p0/task-02/live-verification.md

artifacts/p0/task-02/live-catalog-fingerprint.json

11.1 Live preflight

Before applying:

Verify exact project reference and database version.

Verify current migration head and expected predecessor.

Recompute repository migration hash.

Confirm Docker evidence belongs to the same commit and chain digest.

Capture catalog metadata and approved aggregate counts.

Verify relevant table, index, function, trigger, policy, grant, and role baselines.

Record expected post-migration changes.

Confirm no unexpected tenants or aggregate deltas.

Confirm the configured db:migrate workflow targets the named project.

Confirm named operator and observer/reviewer.

Confirm change window.

Confirm recovery owner.

No row contents may be selected.

11.2 Backup and recovery precondition

A backup listing is not, by itself, proof of restorability.

Before live apply, evidence must reference:

Backup or restore-point identifier.

Creation time.

Scope.

Retention/expiry.

Encryption and access owner.

Most recent successful restore drill or other approved restorability evidence.

Recovery objective or policy reference without inventing a new target.

Decision owner for rollback versus forward fix.

If approved policy does not provide sufficient restorability evidence, stop with S17.

11.3 Live application

The agent must:

Recheck G1-L immediately before execution.

Recheck project reference, commit, migration head, and migration hash.

Use only the configured migration workflow.

Apply once.

Capture UTC start/end, safe command identifier, exit code, and sanitized output.

Treat timeout, lost connection, or unknown exit state as indeterminate.

The agent must not:

Use a web SQL editor.

paste migration SQL manually.

change migration-history records.

use an alternate tool “because it is faster.”

rerun after an ambiguous result.

apply a rollback or repair.

11.4 Post-apply verification

Verify read-only:

Migration head and registered checksum/hash behavior.

Required tables, columns, constraints, and indexes.

Required triggers and functions.

RLS state and policy inventory where applicable.

App-role grants and revokes.

Evidence and audit immutability controls.

Expected aggregate deltas.

Tenant, patient, assessment, evidence, claim-draft, and audit counts against the approved baseline.

Absence of unexpected objects, grants, functions, triggers, or tenant-level deltas.

Do not execute destructive privilege tests against live rows. Live immutability confidence combines catalog proof and the exact Docker runtime tests for the same schema and role contract.

Any unexpected delta is a stop, not a cleanup task.

12. Workstream D — Database invariants, atomicity, retry, and concurrency

Gate: G1-DEnvironment: Disposable PostgreSQL onlyDeliverable: docs/p0/task-02/database-invariant-evidence.md

12.1 Role fidelity

Create or use a Docker app role whose grants, memberships, RLS posture, and default privileges match the discovered production app-role contract.

Record differences. If material differences remain, app-role runtime proof is BLOCKED, not PASS.

Owner/superuser success is not app-role evidence.

12.2 Immutability tests

Using the app role, prove database-level denial of:

UPDATE on assessment_billability_evidence.

DELETE on assessment_billability_evidence.

TRUNCATE on the evidence table.

Direct modification of immutable evidence fields through any exposed function.

Indirect evidence deletion through parent-row cascade.

UPDATE, DELETE, and TRUNCATE on audit_log.

Trigger disablement.

RLS bypass.

role escalation or membership acquisition.

unauthorized function execution that mutates protected rows.

Capture safe error class/code and sanitized error text.

Application-level denial alone is insufficient.

12.3 Failure atomicity tests

Use deterministic fault injection in the test environment to fail at minimum:

After assessment finalization begins but before evidence insertion.

After evidence insertion but before claim-draft insertion.

After claim-draft insertion but before required audit insertion.

Before transaction commit.

After each failure, assert the exact allowed state.

No failure may leave:

Completed assessment with missing required evidence.

Evidence without the required active claim draft for a billable completion.

Claim draft without required evidence.

Duplicate active claim drafts.

Missing required audit state.

Cross-tenant references.

If the approved design intentionally commits an audit of a failed attempt separately, document that separate transaction and prove it contains no clinical content.

12.4 Concurrency tests

Use a barrier/latch so at least two completion transactions race on the same synthetic assessment.

Record:

Number of workers.

Isolation level.

Lock/constraint mechanism.

Winner result.

Loser result and stable reason code.

Evidence-row count.

Active-claim-draft count.

Audit outcomes.

Required result:

Exactly one authorized completion wins.

Exactly one evidence row exists.

At most one active claim draft exists, and exactly one where the seeded reference data says the completion is billable.

Losing calls return a deterministic safe outcome.

No deadlock is silently retried into duplicate state.

Run enough repeated trials to expose nondeterministic behavior and record the chosen count. Do not claim proof from a single accidental ordering.

12.5 Retry and ambiguous-response tests

Cover:

Same idempotency key retried.

Different idempotency key for an already completed assessment.

Connection loss after commit but before response.

Process retry after an unknown client result.

Queue/job redelivery where applicable.

Retries must converge on the committed authoritative state without adding evidence or active claims.

13. Workstream E — Synthetic clinical and billing validation

Gate: G1-DEnvironment: The Workstream B disposable PostgreSQL instance onlyDeliverable: docs/p0/task-02/synthetic-validation.md

13.1 Fixture contract

Fixtures must:

Use a fixed clock and explicit Ontario timezone.

Use identifiers beginning with SYNTHETIC-T02-.

Use no real names, addresses, phone numbers, emails, health numbers, pharmacy identifiers, or clinical records.

Be created server-side.

Use approved synthetic tenant, pharmacy, pharmacist, patient, assessment, and reference rows.

Derive expected PINs, SSCs, fees, and outcomes from seeded reference data at test time.

Fail hard if a live/production environment marker is detected.

Make no external calls.

contain marker values used by leakage tests.

13.2 Required scenarios

ID

Scenario

Required result

CLN-01

Billable completion, prescription issued, in person

One immutable evidence row; one correct active claim draft; required audit

CLN-02

Billable completion, prescription issued, approved virtual context

Same authoritative assessment/billing behavior; virtual event itself has no claim effect

CLN-03

Billable completion, no prescription, structured rationale

One evidence row; active claim draft derived from active reference mapping

CLN-04

Completed assessment followed by referral

Billable No-Rx path with SSC 4, as established by current approved behavior

CLN-05

Rules-based red-flag refusal

Zero completion-evidence rows; zero claim rows; refusal audit event

CLN-06

Non-billable completed path

No claim draft; evidence behavior matches the existing approved contract

CLN-07

Missing required information

Completion denied; no forbidden partial state

CLN-08

Invalid or conflicting patient data

Denied; no evidence or claim

CLN-09

Patient/assessment mismatch

Denied

CLN-10

Tenant/pharmacy mismatch

Denied with no cross-tenant visibility

CLN-11

Inactive or missing reference mapping

Fail closed; no guessed PIN, fee, or claim

CLN-12

Duplicate completion, same patient/ailment group/day

Deterministic denial or convergence; no duplicate evidence/active claim

CLN-13

Concurrent completion

Workstream D invariant holds

CLN-14

Unauthorized evidence update

Database denial

CLN-15

Unauthorized evidence delete/cascade

Database denial

CLN-16

Claim-generation failure

Full required rollback; no partial completion state

CLN-17

Required audit failure

Fail according to approved atomicity contract; no unaudited forbidden completion

CLN-18

Retry after commit-response loss

Exactly-once convergence

CLN-19

Orientation incomplete

Billable completion remains blocked

CLN-20

Attempted orientation override without G3

Denied; no inferred override

CLN-21

LTC path without G2

Parked/fail-closed; no inferred LTC billing

CLN-22

Day-boundary/timezone duplicate case

Uses approved Ontario business-date rule; no duplicate caused by timezone ambiguity

CLN-23

Cross-task completion attempt from virtual care, messaging, fulfilment, or AI event

Event cannot directly complete assessment or create claim

CLN-24

Unknown state or enum

Fail closed; safe audit reason

13.3 Referral versus red-flag invariant

CLN-04 and CLN-05 must be asserted together because they are easy to confuse:

Completed-then-referred occurs only after valid pharmacist completion and follows the approved billable path.

Red-flag refusal prevents clinical completion and creates no evidence or claim.

No shared UI label, status alias, generic “referred” event, or client-supplied field may collapse these states.

13.4 Per-scenario evidence

Record:

Fixture identifier.

Fixed clock.

Authorized actor and tenant scope.

Input summary without PHI.

Active reference-row identifiers or safe version reference.

Expected result.

Observed result.

Before/after aggregate counts.

Safe audit event types.

Database role.

Test command and exit code.

PASS, FAIL, or BLOCKED.

14. Workstream F — Export, PDF, manifest, retrieval, and restore coverage

Implementation gate: Ungated only within §2.4Real-PostgreSQL verification gate: G1-DDeliverables:

Updated bounded implementation and tests.

docs/p0/task-02/export-verification.md

Updated export/manifest fixtures or schema documentation.

14.1 Required behavior

Add existing assessment_billability_evidence to:

Assessment PDF output.

Complete-patient export.

Export manifest.

Manifest hash coverage.

Authorized retrieval.

Restore/reconstruction verification.

14.2 Authorization requirements

Every export and retrieval must recheck server-side:

Authenticated actor.

Active account.

Allowed actor type.

Tenant/pharmacy scope.

Patient relationship.

Assessment relationship.

Export purpose and permission.

Current revocation state.

Client-supplied tenant, patient, assessment, evidence, or role values are untrusted.

Cross-tenant and cross-patient retrieval must be denied without revealing existence.

14.3 Data-integrity requirements

Prove:

Evidence is exported only when present and authorized.

Evidence is linked to the correct assessment and patient.

Missing evidence is omitted or represented according to the approved schema; never fabricated.

Immutable evidence fields are not rewritten for presentation.

Manifest entries use the existing canonical hashing contract.

Hashes cover the exact intended bytes or canonical payload.

Repeated exports under the existing deterministic contract produce stable results using a fixed test clock.

Restore/retrieval validates hashes before trusting artifacts.

Tampered artifacts fail verification.

Manifest ordering is deterministic.

Superseded or inactive artifacts are handled according to the existing retention contract.

If the existing format intentionally embeds non-deterministic generation metadata and has no approved canonical-content hash, stop with S27 rather than silently inventing a new hash contract.

14.4 Billing-boundary requirements

Export logic must not:

Recompute billability.

Select a PIN or SSC.

Calculate a fee or maximum.

Create or modify a claim draft.

Mark an assessment complete.

repair missing evidence.

infer values from display text.

It may serialize only authorized authoritative data already present.

14.5 Required export tests

Cover:

Authorized PDF.

Authorized complete-patient export.

Missing evidence.

Wrong assessment.

Wrong patient.

Wrong tenant/pharmacy.

Unauthorized actor.

Revoked session or authorization.

Multiple assessments with correct evidence linkage.

Deterministic manifest ordering.

Exact hash coverage.

Tampered artifact.

Retrieval.

Restore/reconstruction.

Fixed-clock repeat export.

No hardcoded PIN/SSC/fee/claim value.

No PHI in logs, telemetry, filenames, or test reports.

15. Workstream G — Decision notes

Gate: Ungated documentation onlyImplementation: Prohibited until the relevant decision is granted

15.1 LTC decision note

Create:

docs/p0/task-02/ltc-decision-note.md

Include:

Current code and reference-data behavior.

Why LTC is parked.

The exact unresolved question, phrased for the named authority.

Available options without recommending a billing rule from memory.

Consequences for evidence, claim-draft creation, reference data, tests, UI, audit, and release scope.

Required source/authority.

Decision owner and target date if supplied.

Explicit statement that no LTC behavior was inferred or implemented.

Current fail-closed evidence.

15.2 Orientation decision note

Create:

docs/p0/task-02/orientation-decision-note.md

Include:

Current hard-gate behavior.

The exact unresolved override question.

Candidate authorized roles only if product/compliance supplies them.

Required reason, scope, duration, audit, and revocation considerations.

Safety and compliance consequences.

Implementation and test impact.

Explicit statement that no override was inferred or implemented.

Current fail-closed evidence.

16. Workstream H — Threat model and trust boundaries

Gate: UngatedDeliverable: docs/p0/task-02/threat-model.md

16.1 Assets

Patient and assessment PHI.

Tenant and pharmacy boundaries.

Pharmacist authority.

Migration identity and history.

Billability evidence.

Claim drafts.

Audit records.

Reference-data integrity.

Export artifacts and hashes.

Database and application credentials.

Backup and restore points.

Release evidence.

16.2 Threat actors and failure sources

Cross-tenant authenticated user.

Compromised or over-privileged app role.

Mistaken operator targeting the wrong database.

Stale or over-broad approval.

Concurrent or duplicated request.

Application crash or connection loss.

Malformed or stale client state.

Defective migration.

Unsafe export/retrieval path.

CI or logging leakage.

Insider or support-role misuse.

Cross-task event attempting to impersonate completion.

16.3 Required threat cases

Model at minimum:

Wrong-environment migration.

Migration/hash drift after approval.

Partial migration.

Cross-tenant foreign-key injection.

RLS or server-authorization bypass.

Evidence/audit update or deletion.

Parent cascade deleting protected rows.

SECURITY DEFINER privilege escalation.

Partial assessment/evidence/claim commit.

Duplicate and race-created claims.

Red-flag/referral state confusion.

Hardcoded or stale billing mapping.

Unauthorized export.

Manifest tampering.

PHI or secret leakage into evidence.

Test fault injection enabled in production.

Backup that cannot be restored.

Cross-task event causing clinical or claim effects.

For each threat, identify prevention, detection, response, evidence, and residual risk.

16.4 Trust-boundary diagram

Use the discovered architecture, but preserve this logical separation:

flowchart TD
  A["Authenticated pharmacist"] --> B["Assessment service"]
  B --> C["Authorization and tenant boundary"]
  C --> D["PostgreSQL transaction"]
  D --> E["Immutable evidence"]
  D --> F["Authoritative claim draft"]
  D --> G["Append-only audit"]
  E --> H["Authorized export projection"]
  H --> I["PDF and manifest"]

External events and client fields must terminate at an authorization boundary and cannot connect directly to evidence or claim state.

17. Stable Task 02 control catalogue

Every control must have automated or manual evidence and a status.

Control

Requirement

T02-01

Applicable instructions and repository state recorded before action

T02-02

Exact commit, migration head/hash, predecessor, and chain digest locked

T02-03

Approval records bind exact action, bytes, and environment

T02-04

Docker and live environment identity fail closed

T02-05

Disposable environment contains no live data, credentials, or external route

T02-06

Complete migration chain replays from zero

T02-07

Predecessor-to-0018 upgrade succeeds with synthetic existing rows

T02-08

Expected catalog and aggregate deltas match

T02-09

Tenant and patient references cannot cross scope

T02-10

App role cannot mutate or delete evidence

T02-11

App role cannot mutate or delete audit records

T02-12

Trigger, RLS, function, and role escalation bypasses are denied

T02-13

Completion/evidence/claim/audit failure atomicity proven

T02-14

Duplicate, retry, and concurrent completion converge exactly once

T02-15

Red-flag refusal creates zero evidence and zero claim rows

T02-16

Completed-then-referred remains structurally distinct and follows approved billing behavior

T02-17

PIN, SSC, fee, and claim values come only from active seeded references

T02-18

Orientation remains a hard gate unless G3 is decided and separately implemented

T02-19

LTC remains parked unless G2 is decided and separately implemented

T02-20

Export and retrieval enforce server-side authorization and tenant pinning

T02-21

PDF/export includes correct evidence without recomputing clinical or billing state

T02-22

Manifest and artifact hashes are deterministic and tamper-evident under the approved contract

T02-23

Restore/retrieval verification detects tampering and preserves linkage

T02-24

Live backup/restore evidence exists before apply

T02-25

Live apply occurs once through the configured runner

T02-26

Live post-apply schema, privilege, and aggregate verification matches baseline

T02-27

No PHI, secret, token, or row content enters evidence or CI artifacts

T02-28

Test-only code cannot operate in production

T02-29

Task 11 evidence manifest ties all proofs to the exact commit

T02-30

Cross-task events cannot complete assessments or create claims

Controls may be PASS, FAIL, BLOCKED, or NOT RUN. SKIPPED is not a passing state.

18. Required tests

Use the repository’s existing test tooling. Add a new runner only when required for real PostgreSQL or deterministic concurrency and document why.

18.1 Static and policy tests

Prove:

Migration bytes match baseline.

Migration ordering and registry match.

No prohibited migration edit.

No hardcoded PIN, SSC, fee, maximum, or claim outcome in new code.

No raw production connection construction.

No live credential import in fixtures.

No test/fault-injection module in production dependency paths.

No protected-area change under this task.

No PHI-sensitive fields written to logs or evidence helpers.

18.2 Migration tests

Cover:

Empty-database full replay.

Predecessor upgrade.

Expected objects.

Expected constraints and indexes.

Expected triggers/functions.

Expected RLS state.

Expected grants/revokes.

Migration-history head.

Clean restart.

Transaction rollback on induced migration failure where safely testable.

Schema fingerprint stability.

18.3 Authorization and tenant tests

Cover:

Correct tenant/patient/assessment.

Wrong tenant.

Wrong pharmacy.

Wrong patient.

Wrong assessment.

Client-supplied tenant ignored or denied.

Client-supplied patient ignored or denied.

App role versus owner role.

Cross-tenant foreign-key attempt.

RLS bypass attempt where applicable.

Unauthorized export and retrieval.

18.4 Immutability tests

Cover:

Evidence update.

Evidence delete.

Evidence truncate.

Parent cascade.

Audit update.

Audit delete.

Audit truncate.

Trigger disable attempt.

unauthorized protected-function execution.

Role escalation.

18.5 Atomicity, idempotency, and concurrency tests

Cover:

Failure before evidence.

Failure after evidence.

Failure after claim draft.

Required-audit failure.

Failure before commit.

Duplicate submission.

Same idempotency key.

Different key after committed completion.

Connection loss after commit.

Parallel completion.

Deadlock/serialization retry behavior.

Queue redelivery if applicable.

18.6 Clinical/billing boundary tests

Cover every CLN scenario in §13, including:

Billable Rx.

Billable no-Rx.

Completed-then-referred.

Red-flag refusal.

Non-billable completion.

Missing/conflicting inputs.

Missing/inactive reference.

Orientation gate.

LTC parked path.

Ontario business-date boundary.

Cross-task event denial.

Unknown state.

18.7 Export and manifest tests

Cover every requirement in §14.5.

18.8 Evidence-leakage tests

Fail if evidence or test artifacts contain:

Synthetic marker values designated as forbidden leakage probes.

Realistic health-card patterns.

Real email, phone, address, or person data.

Connection strings.

Access or refresh tokens.

API keys or service-role keys.

Database passwords.

Raw request/response bodies.

Clinical text.

Exact live row values.

Unsanitized SQL errors containing data.

Synthetic scenario identifiers may appear only where the evidence format explicitly allows them.

18.9 Live checks

Live checks are catalog/aggregate checks, not destructive tests.

Cover:

Target identity.

Current head before apply.

Expected head after apply.

Required objects.

Required grants/revokes.

Required triggers/functions.

Expected aggregate deltas.

No unexpected tenant-level or schema-level changes.

19. Evidence contract

19.1 Evidence rules

Every evidence file must record:

UTC timestamp.

Source commit SHA.

Working-tree state.

Migration head and SHA-256.

Migration-chain digest.

Environment class and safe identifier.

PostgreSQL version where applicable.

Database role class.

Exact safe command or command identifier.

Exit code.

Sanitized observed result.

Expected invariant.

PASS, FAIL, BLOCKED, or NOT RUN.

Related control IDs.

Artifact paths and SHA-256 hashes.

Nothing counts as real-PostgreSQL proof when run only against mocks, SQLite, an in-memory adapter, or a unit-test double.

19.2 Evidence hygiene

Live evidence may include:

Counts.

Boolean existence checks.

Catalog object names already present in the repository contract.

Constraint, policy, trigger, function, index, and grant metadata.

Safe PostgreSQL error codes from Docker.

Non-secret project reference.

Live evidence must not include:

Row contents.

Patient, pharmacist, pharmacy, or staff identifiers.

Contact details.

Clinical text.

Claim contents.

Tokens or credentials.

Connection strings or hostnames beyond an approved non-secret project reference.

Full raw environment dumps.

If a command may echo a secret, use a safer invocation or redact before persistence. Do not place secrets in shell history or command arguments merely to redact them later.

19.3 Evidence manifest

Create:

artifacts/p0/task-02/evidence-manifest.json

Minimum structure:

{
  "schema_version": "1",
  "task": "02",
  "source_commit_sha": "<full SHA>",
  "migration_head": "0018_clever_mister_fear",
  "migration_sha256": "<sha256>",
  "migration_chain_digest": "<sha256>",
  "generated_at_utc": "<timestamp>",
  "controls": [
    {
      "control_id": "T02-01",
      "status": "PASS|FAIL|BLOCKED|NOT RUN",
      "evidence": ["<repository-relative path>"]
    }
  ],
  "artifacts": [
    {
      "path": "<repository-relative path>",
      "sha256": "<sha256>",
      "contains_phi": false,
      "contains_secrets": false,
      "environment": "repository|docker|live"
    }
  ],
  "approvals": {
    "G1-D": "GRANTED|NOT GRANTED|EXPIRED|REVOKED",
    "G1-L": "GRANTED|NOT GRANTED|EXPIRED|REVOKED",
    "G2": "DECIDED|PARKED",
    "G3": "DECIDED|BLOCKED",
    "G4": "GRANTED|NOT GRANTED"
  }
}

The manifest must fail validation when:

An artifact is missing.

A hash differs.

Commits or migration hashes disagree.

A required control is absent.

A mandatory control is not PASS.

An approval is stale.

PHI or secret status is unknown.

20. CI and Task 11 branch-gate contract

Task 02 must integrate with existing Task 11 controls.

Required checks, using repository-appropriate stable names:

TypeScript/build/type check where applicable.

ESLint/static analysis where applicable.

Pure/unit tests.

Migration immutability/hash check.

Fresh PostgreSQL full-chain test.

Predecessor upgrade test.

Constraint and privilege test.

Atomicity/idempotency/concurrency test.

Synthetic clinical validation.

Export/manifest test.

Secret scan.

PHI/evidence leakage scan.

Forbidden production-import check.

Evidence-manifest validation.

Rules:

Required jobs fail closed.

A missing or skipped job is not green.

CI must not receive live database credentials.

CI artifacts must be synthetic and PHI-free.

Branch protection must refer to stable job names.

A rerun must not conceal an earlier deterministic failure without a linked remediation.

Evidence must be generated from the candidate commit, not copied from another branch or commit.

Security/database failures are non-waivable unless Task 11 explicitly defines a stricter approved process; this task cannot create a waiver.

21. Operational and recovery runbook

Create or update:

docs/p0/task-02/operational-runbook.md

Include:

21.1 Docker

Preconditions.

Environment-identity check.

Create/replay/test procedure using discovered repository commands.

Production-route denial.

Evidence capture.

Failure handling.

Teardown.

21.2 Live preflight

Target verification.

Gate verification.

Backup/restore evidence.

Expected change record.

Observer and escalation contacts by role, not personal data.

Safe queries.

21.3 Live failure

On failure or ambiguity:

Stop.

Do not retry.

Record safe timestamp, command ID, exit state, and migration-history/catalog metadata.

Prevent application promotion.

Escalate to migration owner and incident/change authority.

Preserve evidence.

Decide rollback versus forward fix through a separate approved change.

21.4 Post-apply

Read-only verification.

Application health checks that do not expose PHI.

Error-rate and transaction-failure monitoring using payload-free telemetry.

Evidence-manifest update.

Release decision.

22. Deliverables

22.1 Required ungated deliverables

docs/p0/task-02/current-state-and-gap-analysis.md

docs/p0/task-02/sql-review.md

docs/p0/task-02/threat-model.md

docs/p0/task-02/ltc-decision-note.md

docs/p0/task-02/orientation-decision-note.md

docs/p0/task-02/operational-runbook.md

artifacts/p0/task-02/baseline.json

Workstream F export design, red tests, and bounded implementation where repository facts permit

22.2 G1-D deliverables

docs/p0/task-02/docker-migration-evidence.md

docs/p0/task-02/database-invariant-evidence.md

docs/p0/task-02/synthetic-validation.md

docs/p0/task-02/export-verification.md

artifacts/p0/task-02/test-report.json

artifacts/p0/task-02/docker-schema.sql

artifacts/p0/task-02/docker-catalog-fingerprint.json

22.3 G1-L deliverables

docs/p0/task-02/live-preflight.md

docs/p0/task-02/live-verification.md

artifacts/p0/task-02/live-catalog-fingerprint.json

22.4 Release and handoff deliverables

docs/p0/task-02/evidence-index.md

docs/p0/task-02/production-handoff.md

artifacts/p0/task-02/evidence-manifest.json

Updated P0 release-readiness checklist.

Updated status, compliance, migration-evidence, restore-drill, and handoff documents where applicable.

Task 11 capability/release-register entry or explicit bootstrap blocker.

Final Task 02 status report.

Every conditional deliverable that cannot be produced must be listed as NOT RUN(gate) or BLOCKED(S-id).

23. Out of scope

Editing any existing migration.

Creating an unapproved production migration.

Changing triage or red-flag rules.

Changing clinical scope or pharmacist authority.

Changing claim derivation, PINs, SSCs, fees, or maximums.

Implementing LTC behavior.

Implementing an orientation override.

Authentication, session, or tenant-model redesign.

Production data correction or deletion.

Live destructive tests.

Reading live row contents.

Production deployment or traffic enablement.

Online-pharmacy, fulfilment, payment, inventory, delivery, messaging, virtual-care, or AI integration.

Vendor selection or procurement.

Declaring legal, PHIPA, OCP, ODB, or professional compliance.

Inventing retention periods, recovery objectives, or operational policy.

Performance certification at production scale without an approved representative-volume plan.

24. Acceptance criteria

24.1 Core criteria

AC1 — Repository state, migration identity, and migration-chain digest are recorded and stable.

AC2 — Applicable instructions and approvals are explicit and bound to exact actions, bytes, and environments.

AC3 — Static review finds no unresolved destructive, privilege, tenant, transaction, or migration-history defect in the approved scope.

AC4 — The complete chain replays from zero on real disposable PostgreSQL.

AC5 — The predecessor-to-0018 upgrade path passes with synthetic existing data.

AC6 — The app role cannot update, delete, truncate, or indirectly delete evidence or audit rows.

AC7 — Tenant, pharmacy, patient, and assessment boundaries fail closed at application and database layers.

AC8 — Failure atomicity is proven by deterministic fault injection on real PostgreSQL.

AC9 — Duplicate, retry, ambiguous-response, and concurrency tests converge on exactly one authoritative completion.

AC10 — Billable completion creates exactly one immutable evidence row and the correct active claim draft from seeded reference data.

AC11 — Non-billable completion creates no claim draft.

AC12 — Completed-then-referred remains billable with the approved No-Rx/SSC 4 behavior and is structurally distinct from red-flag refusal.

AC13 — Red-flag refusal creates zero evidence rows and zero claim rows while producing the required safe audit event.

AC14 — Missing, invalid, cross-tenant, unknown, and inactive-reference cases fail closed.

AC15 — Orientation remains blocked and LTC remains parked unless their decisions are separately resolved.

AC16 — PDF, complete-patient export, manifest, retrieval, and restore include the correct authorized evidence without recomputing billing or clinical state.

AC17 — Manifest/hash behavior is deterministic and tamper-evident under the approved contract.

AC18 — No PHI, secrets, tokens, row contents, or unsafe diagnostics appear in evidence or CI artifacts.

AC19 — Test-only fixtures and fault injection cannot run in production.

AC20 — Task 11 evidence and promotion controls are satisfied or production promotion is explicitly blocked.

24.2 Live criteria

AC21 — The exact live environment is identified and matches the approved preflight baseline.

AC22 — Backup/restore evidence and recovery ownership are verified before live apply.

AC23 — The migration is applied once through the configured workflow under G1-L.

AC24 — Live migration head, required schema objects, triggers, functions, policies, grants, and revokes match the reviewed contract.

AC25 — Live aggregate deltas match expectations with no unexpected tenant, patient, assessment, evidence, claim, audit, or schema change.

24.3 Status semantics

Overall PASS requires:

AC1–AC25 in the declared live release scope.

G1-D and G1-L granted and consumed without drift.

Every required Task 02 control PASS.

No unresolved release-blocking stop condition.

G4 promotion evidence approval when claiming production promotion.

BLOCKED is required when:

Safe ungated work is complete but G1-D, G1-L, backup/restore proof, live access, Task 11 review, or other required authority/evidence is unavailable.

G2/G3 are unresolved and the proposed release includes those capabilities.

FAIL is required when:

Any mandatory safety, authorization, immutability, atomicity, clinical/billing, migration, export-integrity, or leakage invariant is proven false.

A Docker-only verification may be reported separately as PASS while overall Task 02 remains BLOCKED on live work. Never collapse a component pass into an overall pass.

25. Agent completion procedure

Before final reporting:

Recompute commit, migration, chain, and evidence hashes.

Confirm the working tree contains only intended task changes plus preserved pre-existing changes.

Confirm every deliverable exists or has an explicit conditional status.

Confirm every test command and exit code is recorded.

Confirm real-PostgreSQL claims came from real PostgreSQL.

Confirm no evidence file contains PHI, secrets, row contents, or unsafe identifiers.

Confirm no migration or protected surface changed.

Confirm test-only code is production-inaccessible.

Validate the evidence manifest.

Update the Task 11 register or record the blocker.

List all unresolved decisions and excluded capabilities.

State exactly what was and was not authorized.

Do not describe a blocker as a successful implementation. Do not describe a successful synthetic test as live verification.

26. Final report format

End the task with exactly this status block, followed by concise explanatory notes:

Task 02 overall status: PASS | BLOCKED | FAIL
Task 02 Docker verification: PASS | BLOCKED | FAIL | NOT RUN
Task 02 live verification: PASS | BLOCKED | FAIL | NOT RUN
Task 02 production-promotion status: APPROVED | BLOCKED | NOT REQUESTED

Source commit SHA:
Working tree at start: CLEAN | DIRTY
Working tree at end: CLEAN | DIRTY
Migration head:
Migration SHA-256:
Migration-chain digest:

Task 01 synthetic environment: READY | PASS | BLOCKED | NOT VERIFIED
Task 11 test-plan review: PASSED | BLOCKED | NOT VERIFIED
Task 11 evidence review: PASSED | BLOCKED | NOT VERIFIED

G1-D Docker replay approval: GRANTED ("<verbatim quote>") | NOT GRANTED | EXPIRED | REVOKED
G1-L live apply approval: GRANTED ("<verbatim quote>") | NOT GRANTED | EXPIRED | REVOKED
G2 LTC decision: DECIDED | PARKED
G3 orientation decision: DECIDED | BLOCKED
G4 promotion approval: GRANTED | NOT GRANTED | NOT REQUESTED

Current-state and gap analysis: PASS | FAIL
Static SQL review: PASS | FAIL | BLOCKED
Full-chain Docker replay: PASS | FAIL | BLOCKED | NOT RUN
Predecessor upgrade: PASS | FAIL | BLOCKED | NOT RUN
App-role immutability: PASS | FAIL | BLOCKED | NOT RUN
Tenant and patient isolation: PASS | FAIL | BLOCKED | NOT RUN
Failure atomicity: PASS | FAIL | BLOCKED | NOT RUN
Idempotency and concurrency: PASS | FAIL | BLOCKED | NOT RUN
Synthetic clinical validation: PASS | FAIL | BLOCKED | NOT RUN
Red-flag zero-row proof: PASS | FAIL | BLOCKED | NOT RUN
Referral/red-flag separation: PASS | FAIL | BLOCKED | NOT RUN
Reference-derived billing values: PASS | FAIL | BLOCKED | NOT RUN
Export and PDF coverage: PASS | FAIL | BLOCKED
Manifest and restore coverage: PASS | FAIL | BLOCKED
Live backup/restore precondition: PASS | FAIL | BLOCKED | NOT RUN
Live migration application: PASS | FAIL | BLOCKED | NOT RUN
Live catalog and aggregate verification: PASS | FAIL | BLOCKED | NOT RUN
PHI/secret leakage checks: PASS | FAIL
Evidence-manifest validation: PASS | FAIL | BLOCKED

Real PHI used: NO
Live row contents read: NO
Existing migration edited: NO
Protected clinical or billing logic changed: NO
Production authentication changed: NO
Production schema changed outside approved migration: NO
Live migration applied more than once: NO
External messages or vendor calls made: NO
Claims submitted: NO

Stop conditions fired:
Blocking issues:
Failed invariants:
Excluded release scope:
Unresolved lead decisions:
Unresolved professional or billing decisions:
Unresolved privacy/security/release decisions:
Evidence locations:
Files changed:
Tests run and results:
Rollback or recovery state:
Recommended next action:

Required final statement

If Docker verification passes but live work remains gated, report:

Task 02 Docker verification: PASS — live migration application and production readiness remain blocked pending the exact G1-L approval, verified recovery precondition, live parity checks, and Task 11 evidence approval.

If the limited core passes while LTC and orientation decisions remain parked, report:

Task 02 core assessment boundary is verified only for the explicitly declared release scope. LTC behavior remains parked and orientation override remains disabled; neither capability is approved or implemented.

Never report production readiness when migration identity, live parity, backup/restore evidence, app-role immutability, atomicity, red-flag zero-row behavior, tenant isolation, export integrity, PHI leakage checks, or Task 11 promotion review is unresolved.
