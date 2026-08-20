# Task 12 — Operational Resilience, Downtime, and Recovery

## Sprint checkpoint — 2026-08-19

**Repository state:** `NOT RUN`; no dedicated operational-resilience capability,
service health model, downtime state machine, or cross-capability recovery
evidence package exists.
**Sprint slice:** repository discovery, dependency mapping, safe observability
contract, downtime-state design, and recovery test plan only.
**Exit:** no production access, live backup, monitoring vendor, alert delivery,
automated failover, or production configuration change. Runnable synthetic
work requires a separate exact approval and Task 11 Checkpoint 1. See
[`NEXT-SPRINT-PLAN-2026-08-19.md`](NEXT-SPRINT-PLAN-2026-08-19.md).

## Role

Senior platform/reliability engineer working with an independent
Security/Privacy reviewer, Operations/SRE reviewer, Quality/Test reviewer,
pharmacist operations owner, and Task 11 reviewer.

## Priority

P1 operational foundation. P0 only where an existing production-readiness gate
explicitly assigns a bounded recovery proof to Task 02.

## Status and authority

**Status:** discovery and design may begin; implementation is approval-gated.
**Production authorization:** none.
**Synthetic runtime authorization:** none until a versioned, exact-candidate,
expiring approval and Task 11 Checkpoint 1 are recorded.

This task creates operational resilience around the product. It does not
authorize a deployment, live database access, production credentials, a hosted
preview, a monitoring vendor, an incident-management vendor, or a production
backup/restore operation.

## Why this task exists

Task 02 proves the immediate P0 assessment and migration baseline. Task 11
defines release controls and evidence validation. Neither is the long-term
owner of service degradation, payload-free observability, downtime workflows,
backup/restore runbooks, dependency failure handling, or recurring recovery
drills across Tasks 03–10.

Task 12 owns those operational contracts. It consumes Task 11's evidence
format and never weakens Task 02's approval gates.

## Objective

Design and, only after approval, prove a synthetic operational-resilience
capability that:

- distinguishes healthy, degraded, unavailable, disabled, recovering, and
  unknown states without hiding uncertainty;
- exposes no PHI, credentials, tokens, identifiers, request bodies, clinical
  content, message content, or file contents through telemetry;
- gives authorized operators bounded, server-enforced controls for disablement,
  recovery, and verification;
- preserves authoritative records and prevents partial or duplicate effects
  during dependency failure, retry, restart, or recovery;
- supports synthetic backup, restore, integrity, and restart drills against a
  fresh loopback-only PostgreSQL environment;
- documents safe downtime procedures for pharmacists without making clinical,
  billing, prescribing, dispensing, or referral decisions;
- produces exact-candidate evidence consumable by Task 11.

## Dependencies and ownership boundaries

| Dependency | Task 12 may consume | Task 12 must not own or change |
|---|---|---|
| Task 01 | Isolated synthetic workspace and boundary checks | G1/G2/G3 decisions or production-import allowlist |
| Task 02 | Approved P0 recovery findings and migration status | Migration `0018`, clinical/billing/auth/audit protected surfaces, G1-L, or G4 |
| Task 03 | Operational work-item contract | Clinical ranking or pharmacist decisions |
| Tasks 04–10 | Versioned dependency/kill-switch contracts | Their domain state machines or substantive approvals |
| Task 11 | Capability register, control IDs, evidence schema, release gates | Approval granting or self-review |

If an upstream contract is missing, contradictory, expired, or unapproved,
record the dependency as `BLOCKED`. Do not invent the missing policy.

## Non-negotiable invariants

1. **Unknown is not healthy.** Missing, stale, contradictory, unreachable, or
   malformed state is displayed and handled as unavailable or unknown.
2. **No PHI in observability.** Logs, metrics, traces, alerts, screenshots,
   evidence, dashboard URLs, browser storage, and analytics contain only safe
   event types, aggregate counters, timestamps, durations, environment class,
   component class, and reason codes.
3. **No automatic professional finality.** Recovery, failover, vendor health,
   queue replay, or an operator action cannot complete an assessment, issue a
   prescription, refer, dispense, release medication, bill, submit a claim, or
   mark patient follow-up complete.
4. **Server authority.** Environment, operator identity, role, pharmacy scope,
   capability state, lifecycle revision, kill switch, and recovery target are
   resolved and rechecked server-side immediately before action.
5. **Bounded automation.** Workers have explicit batch, retry, concurrency,
   lease, expiry, and kill-switch bounds. No unbounded scan or retry loop.
6. **Idempotent recovery.** Repeated disable, cleanup, replay, restart, and
   verification commands cannot create duplicate effects or silently rewrite
   immutable history.
7. **Backups are sensitive.** Production backups would contain PHI. This task
   may use only authored-synthetic data in disposable local storage until
   encryption, residency, access, retention, deletion, and recovery approvals
   are separately recorded.
8. **Evidence is data-minimized.** Recovery proof uses schema/catalog facts,
   safe aggregate counts, state hashes, and synthetic markers—not row contents
   or payload dumps.
9. **Kill switches preserve records.** Disablement stops new bounded effects;
   it does not delete or mutate confirmed, finalized, or immutable records.
10. **No invented promises.** RTO, RPO, availability targets, alert thresholds,
    incident severity, response times, staffing, escalation, and retention are
    decisions for named owners and reviewers.

## Workstream A — Current-state and dependency inventory

Inspect, without changing runtime:

- production and sandbox processes, routes, workers, databases, storage plans,
  integrations, queues, scheduled work, and kill switches;
- existing health checks, logs, error boundaries, audit events, retries,
  idempotency keys, leases, timeouts, and recovery scripts;
- current backup/restore assumptions and evidence;
- every dependency whose failure can produce stale, partial, duplicate, or
  misleading state;
- current owner, backup owner, reviewer, expiry, and escalation gaps.

Deliver:

- `docs/task-12/current-state-and-gap-analysis.md`;
- `docs/task-12/service-and-dependency-map.md`;
- an unresolved-decision register with named owners.

## Workstream B — Operational state and degradation model

Define separate state axes for:

- service availability;
- dependency availability;
- data freshness;
- capability enablement/kill-switch state;
- recovery state;
- evidence confidence.

Do not collapse “degraded,” “disabled,” “stale,” “recovering,” “unknown,” and
“unavailable” into one generic error. Define legal combinations, transitions,
operator-visible wording, and fail-closed behavior.

Deliver:

- `docs/task-12/operational-state-machine.md`;
- a safe reason-code catalogue;
- a transition-to-audit/evidence matrix.

## Workstream C — Payload-free observability

Define allowlisted operational signals and reject everything else. At minimum:

- component and capability class;
- safe event/reason code;
- environment class;
- lifecycle revision;
- outcome state;
- timestamp, duration bucket, bounded count, and age bucket;
- correlation reference that is opaque, short-lived where appropriate, and
  not reusable as authority.

Explicitly prohibit patient, pharmacist, pharmacy, assessment, prescription,
claim, contact, address, medication, ailment, message, uploaded-document,
token, session, credential, or raw request/response content.

Deliver:

- `docs/task-12/observability-and-alerting-contract.md`;
- log/metric/trace/alert leakage test cases;
- a vendor-neutral future integration boundary with no selected provider.

## Workstream D — Downtime and operator controls

Design authenticated, role-scoped, independently re-authorized controls for:

- inspecting safe service/dependency state;
- disabling and re-enabling one capability;
- preventing new work while preserving existing records;
- draining, cancelling, or expiring only work whose domain contract permits it;
- recording an operator reason and audit event;
- verifying that normal manual workflows remain available when automation is
  disabled;
- handling session expiry, stale action tickets, concurrent operators, and
  unknown control state.

The operator interface is not a clinical dashboard and contains no patient
queue, clinical priority, patient identifier, or patient-level record.

Deliver:

- `docs/task-12/operator-control-contract.md`;
- authorization and concurrency test plan;
- kill-switch and recovery runbook.

## Workstream E — Backup, restore, and integrity design

For the synthetic phase only:

- use fresh loopback-only PostgreSQL and authored-synthetic fixtures;
- capture exact schema/migration/configuration/image hashes;
- create a disposable backup without payload logging;
- restore into a separately named disposable target;
- verify schema, constraints, triggers, grants, migration history, safe counts,
  and deterministic state hashes;
- restart the database and reverify persistence;
- prove teardown removes only the exact container, network, volume, temporary
  artifact, and evidence location;
- record corruption, missing-backup, wrong-target, stale-backup, and partial-
  restore denial paths.

Production backup format, encryption, key custody, region, retention, legal
hold, deletion, restore authority, RPO, and RTO remain `BLOCKED` until approved.

Deliver:

- `docs/task-12/backup-restore-and-integrity-plan.md`;
- synthetic drill harness proposal;
- recovery evidence schema compatible with Task 11.

## Workstream F — Incident and continuity runbooks

Draft runbooks for:

- application unavailable;
- database unavailable or read-only;
- authentication unavailable;
- stale projections or queue backlog;
- external dependency unavailable;
- suspected PHI/credential leakage;
- suspected duplicate or partial operation;
- corrupted or unverifiable evidence;
- restore required;
- kill switch required;
- recovery verification and return to service.

Each runbook must identify detection, safe immediate action, authority,
communications boundary, evidence to preserve, prohibited actions, recovery
verification, and escalation owner. Do not invent severity levels, response
times, recipient lists, or regulator-notification rules.

Deliver:

- `docs/task-12/downtime-and-incident-runbooks.md`;
- role/responsibility matrix;
- unresolved external-notification decisions.

## Workstream G — Synthetic resilience drills

After exact implementation approval, prove at minimum:

- dependency timeout does not report success;
- unknown health state fails closed;
- stale lifecycle/action ticket cannot execute;
- kill switch blocks new bounded work and preserves finalized records;
- restart does not duplicate committed work;
- concurrent retry is idempotent;
- partial transaction rolls back domain and audit/outbox effects together;
- worker batch and retry limits hold;
- backup/restore/restart preserves approved synthetic invariants;
- wrong target, wrong environment, stale approval, or unsafe path is denied;
- planted synthetic PHI/secret markers are detected and absent from green logs,
  alerts, URLs, browser storage, bundles, and evidence;
- teardown is exact and repeatable.

Every applicable control requires an isolated safe red run and a green run.

## Workstream H — Task 11 registration and promotion boundary

Register Task 12 as a separate capability with:

- accountable and backup owners;
- risk tier and autonomy level decided by Task 11 reviewers;
- exact scope and environment;
- control IDs and evidence requirements;
- approval and expiry records;
- kill-switch and teardown owners;
- change triggers;
- production promotion explicitly not authorized by synthetic PASS.

Task 11 validates the evidence package. It does not provide the underlying
Security/Privacy, Operations/SRE, professional, product, or production
approval.

## Required tests

### Pure tests

- operational state combinations and transitions;
- safe reason-code and telemetry allowlists;
- unknown/stale state denial;
- batch/retry/lease/expiry bounds;
- idempotency and duplicate command handling;
- redaction-by-rejection for forbidden telemetry fields;
- role/action authorization matrix;
- deterministic evidence manifest hashing.

### Real PostgreSQL tests

- transaction rollback on audit/evidence failure;
- concurrent disable/execute and recover/execute races;
- restart persistence and no duplicate replay;
- backup/restore from a fresh migration chain;
- schema, trigger, constraint, grant, and migration-history parity;
- wrong-target and non-loopback denial;
- exact teardown and repeatability.

Mocks may support unit tests but cannot prove transaction, constraint,
concurrency, restart, or restore behavior.

## Mandatory stop conditions

Stop the affected workstream and record `BLOCKED` if:

- exact approval, owner, reviewer, expiry, environment, or candidate is absent;
- Docker or the loopback-only test environment cannot be verified;
- any command could reach Supabase, production storage, production credentials,
  a hosted environment, or a real monitoring/incident provider;
- a backup, log, trace, alert, URL, screenshot, or evidence artifact may contain
  PHI, credentials, tokens, identifiers, or payloads;
- the proposed action modifies migrations, clinical rules, billing/reference
  data, claim derivation, auth/orientation, audit immutability, retention, or LTC
  behavior without that protected surface's approval;
- a recovery action would rewrite immutable history or infer professional,
  clinical, billing, dispensing, or claim finality;
- RTO/RPO, severity, escalation, retention, notification, or staffing policy is
  required but not recorded;
- a required test is skipped, filtered, flaky, or unavailable;
- an independent reviewer is missing where required.

## Deliverables

1. Current-state/gap and dependency map.
2. Operational state machine and reason-code catalogue.
3. Payload-free observability contract.
4. Operator-control and kill-switch contract.
5. Backup/restore/integrity plan.
6. Downtime and incident runbooks.
7. Synthetic test and drill plan.
8. Task 11 capability registration and evidence profile.
9. Final report listing PASS, FAIL, BLOCKED, and NOT RUN controls.

## Definition of done

- The discovery/design package is complete and internally consistent.
- No operational promise or regulatory policy was invented.
- All runtime work remains blocked until the exact synthetic approval exists.
- Approved synthetic implementation, if later performed, has complete pure and
  real-PostgreSQL red/green evidence.
- No PHI, credential, production identifier, live data, or external effect is
  present in fixtures, telemetry, artifacts, or evidence.
- Kill-switch, restart, rollback, restore, and teardown behavior are proven
  against the exact candidate.
- Task 11 validation and all required independent reviews are recorded.
- Production remains not authorized.

## Final report format

The final report must state:

- exact candidate SHA and worktree state;
- approved scope, environment, owners, reviewers, expiry, and decision records;
- files and capabilities changed;
- commands, timestamps, exit codes, test counts, artifact paths, and SHA-256
  hashes;
- red/green evidence by control;
- decisions, assumptions, and unresolved blockers;
- confirmation that no production access, PHI, credential, hosted resource,
  vendor, recipient, or external effect was used;
- next owner and next authorized action;
- final status using only `PASS`, `FAIL`, `BLOCKED`, and `NOT RUN`.

Completion of Task 12 is not production authorization. Promotion requires its
own named, exact, expiring decision and Task 11 evidence review.
