# Task 08 - Operational readiness, observability, monitoring, and failure recovery

**Status: WORKSTREAM J DOCUMENTATION / PROPOSED DESIGN ONLY. No runtime, monitoring stack, dashboard, alert, runbook approval, recovery execution, schema, migration, external integration, or production authority.**

## 1. Scope and reading boundary

This document defines proposed operational controls for a future Task 08 fulfilment-coordination capability. It must be read with [AGENTS.md](../../AGENTS.md), the [project overview](../PROJECT_OVERVIEW.md), the full [Task 08 specification](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), and completed Workstreams A-I:

- [Current state and gap analysis](current-state-and-gap-analysis.md), [Ontario standards and policy mapping](ontario-fulfilment-standards-and-policy-mapping.md), and [production dependency and decision register](production-dependency-and-decision-register.md).
- [Fulfilment threat model](fulfilment-threat-model.md) and [trust boundaries and data flows](trust-boundaries-and-data-flows.md).
- [Professional responsibility matrix](professional-responsibility-matrix.md) and [role and transition authorization matrix](role-and-transition-authorization-matrix.md).
- [Fulfilment contracts and schema proposal](fulfilment-contracts-and-schema-proposal.md).
- [Request and prescription-evidence workflow](request-and-prescription-evidence-workflow.md) and [pharmacy-choice and transfer boundary](pharmacy-choice-and-transfer-boundary.md).
- [Orthogonal state model and state machine](orthogonal-state-model-and-state-machine.md), [inventory, preparation, professional-check, and release workflow](inventory-preparation-and-release-workflow.md), and [pickup, delivery, custody, and handoff workflow](pickup-delivery-custody-and-handoff-workflow.md).
- [External integrations, webhooks, idempotency, and reconciliation](external-integrations-webhooks-and-reconciliation.md).

The coordinator calls this bounded document **Workstream J**. The full Task 08 specification uses Workstream J for delivery and Workstream M for audit, retention, incident response, and runbooks. This document does not rename or claim completion of either specification workstream. It records only the requested operational-readiness and observability proposal, without runnable behaviour.

Four categories remain distinct:

1. **CURRENT:** the root application has protected staff workflows, assessment and follow-up transactions, advisory claim drafts, append-only audit controls, governance records, and documented recovery work. The Workstream A audit found no Task 08 fulfilment runtime, worker, queue, webhook consumer, reconciliation engine, monitoring dashboard, or alerting system.
2. **EXISTING SYNTHETIC / EXPERIMENTAL:** Task 01 containment and Task 04 transaction, idempotency, outbox, trusted-time, and test patterns are study material only. Task 04 authority expired and its renewal remains DRAFT - NOT GRANTED. No Task 04 grant, runtime, table, worker, metric, or operational authority transfers to Task 08.
3. **PROPOSED TASK 08 DESIGN:** every signal, metric, alert, incident step, recovery rule, runbook obligation, backup control, ownership profile, and future test below. None is implemented, approved, or verified.
4. **PRODUCTION-BLOCKED:** every real prescription/PMS, inventory, payer, payment, courier, address, notification, identity, webhook, monitoring, support, backup, recovery, or vendor connection and operational effect.

This proposal does not authorize implementation. It supplies no provider, service, endpoint, SDK, account, credential, key, monitoring vendor, dashboard, threshold, service-level objective, on-call rota, retention period, recovery-point objective, recovery-time objective, incident owner, or production runbook.

## 2. Operational invariants

The following rules govern every later implementation and operation:

1. **Monitoring is observation, not authority.** A metric, log, trace, alert, dashboard, ticket, health check, vendor status, or operator acknowledgement cannot establish prescription validity, professional judgment, inventory truth, release, custody, receipt, payment finality, claim authority, return receipt, or saleable stock.
2. **Audit is not application logging.** Required protected business evidence uses the separately approved minimized audit contract. Technical logging cannot replace it, and audit records cannot become unrestricted diagnostic payload storage.
3. **Unknown remains unknown.** Missing, stale, contradictory, out-of-order, unauthenticated, ambiguous, or inaccessible state fails closed at the affected transition. A green dashboard, cleared alert, process restart, replay, restore, or vendor recovery cannot convert unknown state into success.
4. **Recovery does not invent facts.** Recovery restores a service's ability to evaluate current authoritative evidence. It does not fabricate professional decisions, physical custody, patient receipt, financial finality, notification delivery, or external-provider outcomes.
5. **No silent overwrite or silent recovery.** Material attempts, observations, discrepancies, containment actions, recovery actions, failures, retries, and human resolutions remain attributable and versioned under the approved evidence and retention contracts.
6. **Patient choice is not tenancy.** No telemetry attribute, dashboard filter, alert payload, incident ticket, recovery input, URL, session value, or restored record may replace server-owned `PHARMACY_ID` with a patient-selected pharmacy reference.
7. **No fulfilment event creates a claim.** Request, READY, release, payment, pickup, delivery, receipt, return, alert, incident, retry, reconciliation, or recovery state cannot create, code, submit, reverse, or promise a claim.
8. **Custody remains physical truth.** Courier status is not patient receipt. Failed delivery is not receipt. `RETURNED` requires verified physical receipt at the correct pharmacy; it does not automatically restore inventory or cause a financial/claim effect.
9. **Professional and technical ownership remain separate.** Technical operators may restore system health and execute separately approved containment/recovery procedures. They cannot make or impersonate pharmacy-owned professional decisions. Pharmacy staff cannot bypass technical security, evidence, or recovery controls.
10. **The affected slice stops safely.** Independent documentation may continue while production-only dependencies remain blocked. Runnable synthetic work requires exact synthetic-scope, candidate, lifecycle, and applicable Task 11 approval. Production requires its own complete gates.

## 3. Three distinct evidence planes

| Plane | Purpose | Proposed content | Authorized consumers | Explicitly not authoritative for |
|---|---|---|---|---|
| Technical telemetry | Diagnose service, database, worker, queue, adapter, and dependency health. | Bounded low-cardinality counters, duration/age distributions, safe error classes, health status, opaque non-sensitive correlation references, deployment/contract version. | Approved technical operations and security roles under least privilege. | Business state, audit completeness by itself, patient identity, professional decisions, physical/financial finality. |
| Workflow observations | Detect blocked, stale, contradictory, delayed, or unreconciled administrative workflow conditions. | Aggregate counts and age buckets by approved non-sensitive state class, operation class, integration class, and server-owned environment/scope category. Protected drill-down occurs only in the authorized application, not in metric labels or alerts. | Assigned pharmacy operations, technical operations, and fact owners with minimum access. | Transition approval, professional judgment, release, proof acceptance, return disposition, retry permission, reportability. |
| Protected audit evidence | Attribute authorized or denied protected actions, state-version changes, source acceptance, containment, reconciliation, and recovery where the approved event catalogue requires it. | Closed event/action/outcome/safe-reason combination, trusted time, actual authorized actor/service where necessary, opaque references, policy/source/contract versions, before/after state versions. | Approved audit, governance, privacy/security, pharmacy, and investigation roles under purpose-limited access. | Raw payload storage, OCR/prescription/clinical rationale, diagnostics, analytics, arbitrary metadata, or automatic legal/professional conclusions. |

The planes may share a server-generated opaque correlation reference only if its format, purpose, scope, access, lifetime, and non-sensitive nature are separately approved. Sharing a correlation reference does not make technical telemetry an audit record. A dashboard must link an authorized user to a protected application view rather than reproduce protected content in a metric, alert, URL, or ticket.

## 4. Logging and tracing rules

### 4.1 Permitted technical fields

A future closed logging schema may contain only fields necessary for diagnosis and approved operations, such as:

- trusted server timestamp and environment/service/component version;
- closed operation, subsystem, dependency, and safe outcome/error classes;
- bounded duration, attempt ordinal, retry classification, and current technical health class;
- server-generated opaque correlation, operation, receipt, or reconciliation references that are non-semantic, non-reversible, scoped, and not usable as credentials;
- approved state-class and version-conflict indicators without business content;
- approved server-derived environment or scope category where necessary, never browser-supplied tenancy; and
- redaction/sanitization status sufficient to prove the logging boundary ran.

Every field requires a closed allowlist and size bound. Raw request/response objects, caught exception objects, SQL statements with values, provider payloads, headers, cookies, authorization material, form bodies, file names supplied by users, and arbitrary metadata are not logging inputs. User-facing errors remain stable, generic, non-enumerating, and free of stack, SQL, internal identifier, scope, authorization, or correlation details unless a separately approved safe support-reference contract permits a non-sensitive reference.

### 4.2 Prohibited content and locations

The following must not enter logs, traces, span names/attributes/events, analytics, replay tools, metric names/labels, alert bodies, dashboard labels, error messages, incident titles, ticket subjects, URLs/query strings/fragments, queue/topic/routing names, idempotency/correlation keys, notification previews, calendars, screenshots, or support-chat transcripts:

- names, addresses, phone numbers, email addresses, health-card/eligibility numbers, patient/subject/delegate/recipient identity facts, or staff identity beyond a separately required protected audit actor reference;
- prescription content, medication/product names, quantities, directions, OCR text/output, uploaded evidence, clinical facts, professional/clinical rationale, counselling content, or accessibility accommodation details;
- payer/member identifiers, adjudication details, card/payment data, price breakdowns tied to a person, claim details, or financial account data;
- package contents, exact delivery address, route, exact location, proof/signature content, identity documents, biometrics, photos, exact GPS, tracking secrets, reusable public tracking references, or recipient contact details;
- cookies, session identifiers, bearer/capability references, one-time codes, hashes/digests used for authorization, API keys, webhook signing secrets, encryption keys, database credentials, provider credentials, or raw authentication headers;
- raw internal database identifiers, patient-selected pharmacy references, server-only `PHARMACY_ID`, vendor account identifiers, raw payloads, message bodies, or arbitrary metadata.

No client-side monitoring, analytics, session replay, error reporter, or browser persistence is proposed. Any future browser observability requires separate privacy/security review and must prove that protected props, form state, rendered content, URLs, cookies, storage, DOM capture, screenshots, and network bodies remain excluded. No production telemetry SDK or external monitoring provider is selected here.

### 4.3 Correlation and tracing

- Correlation references are generated server-side, random/opaque, bounded, scoped to one approved purpose, non-reversible, non-sequential, and never carry identity, medication, pharmacy-choice, claim, payment, delivery, or clinical meaning.
- Correlation references are not authentication, authorization, tenancy, idempotency, tracking, or record identifiers and cannot be used to retrieve protected data without a fresh authorized application request.
- Trace propagation across a future vendor boundary requires a separately approved minimum-data contract. A third-party trace ID cannot become an authoritative operation identity or idempotency key.
- Trace sampling, export destination, retention, deletion, legal hold, support access, residency, encryption, and redaction verification remain PENDING. Sampling must never preferentially expose exceptional PHI-bearing cases.
- A diagnostic stack or internal error may be available only in an approved protected technical system after sanitization; it is never returned to the browser or copied into a general-purpose alert/ticket.

## 5. Proposed metrics

All metrics are aggregate and low cardinality. Dimensions may include only approved closed values such as environment, component, operation class, safe result class, integration class, workflow state class, and deployment/contract version. They must not include patient, actor, prescription, item, package, booking, pharmacy choice, exact pharmacy/tenant identifier, contact, provider account, claim, payment, tracking, reconciliation-case, internal database, or correlation values.

### 5.1 Technical health metrics

| Metric family | Proposed observation | Safety boundary |
|---|---|---|
| Request health | Count and bounded duration distributions for supported server operations by safe result class. | No endpoint body, URL parameter, actor, subject, item, or resource label. |
| Database health | Connection/transaction availability, commit/rollback class, serialization/deadlock retry class, lock-wait and state-version conflict distributions. | No SQL text/value, table row identifier, record content, or claim/business conclusion. |
| Worker/queue health | Future processing claim/lease health, queue-depth and oldest-age buckets, retry/dead-letter classes, duplicate/fence outcomes. | No queue/topic name containing protected data; no message body or resource identifier. No worker exists now. |
| Adapter health | Future dependency reachability, validation/authentication class, latency bucket, timeout/unknown-outcome count, circuit/degraded-state class. | Provider status remains observation only; threshold and vendor contract are PENDING. |
| Webhook/inbox health | Future receipt, authentication/validation, duplicate, order conflict, mapping, dead-letter, and reconciliation-required counts. | No event body, provider event identifier, signature, account, resource, or person in labels. |
| Audit-control health | Required-audit commit success/failure class and audit pipeline availability. | Does not claim an action occurred; protected audit remains the authoritative evidence. |
| Backup/recovery health | Future backup verification and isolated restore-drill success/failure/age classes. | No backup contents, object/location names, credentials, retention or RPO/RTO value in labels. |
| Telemetry health | Export/drop/redaction/schema-rejection and clock-health classes. | A telemetry failure cannot be interpreted as workflow success or absence of an incident. |

### 5.2 Workflow safety metrics

| Metric family | Proposed observation | Operational use | Non-authority rule |
|---|---|---|---|
| Stuck workflow | Aggregate count and age buckets for records unable to progress under the approved state machine. | Assign protected review through the application. | Age never auto-advances, cancels, releases, or closes a record. |
| Invalid/stale transition | Rejected invalid-transition, stale-version, contradictory-source, and authorization/lifecycle classes. | Detect regressions, misuse, races, or integration drift. | Rejection count does not reveal resource existence or authorize override. |
| Reconciliation backlog | Aggregate open/oldest-age buckets by approved discrepancy class and owner category. | Staff resourcing and incident escalation. | Queue clearance cannot overwrite discrepancy evidence or invent finality. |
| Inventory/preparation exception | Aggregate unavailable/stale/conflicting/recall/quarantine/quantity/reservation-expiry classes. | Prompt pharmacy-owned review. | Metric cannot confirm inventory, substitute, prepare, release, or derive READY. |
| Release/custody exception | Aggregate revoked/blocked release, unknown custody, package-integrity, handoff-proof, wrong/missing recipient, and return-receipt exception classes. | Prompt pharmacy/professional/custody response. | Alert cannot authorize handoff, proof acceptance, receipt, return disposition, or restock. |
| Delivery failure | Aggregate attempt-failure, delay, wrong-recipient, missing-proof, loss/tamper/damage/temperature, and failed-return classes. | Initiate the applicable approved incident/runbook. | Failed delivery never becomes receipt; courier data remains an observation. |
| Financial discrepancy | Aggregate uncertain/mismatched/reversed adjudication/payment classes. | Assign finance reconciliation. | Metric cannot charge, refund, release, deliver, receipt, or create/reverse a claim. |
| Communication backlog | Aggregate future notice-intent and provider-status age/result classes. | Task 07 operational handoff after approval. | Notice sent/delivered/read cannot prove understanding, counselling, receipt, or follow-up. |

Exact metric names, aggregation windows, buckets, cardinality limits, collection intervals, sampling, alert thresholds, retention, access, and dashboard ownership are **PENDING**. No patient-level operational metric is approved. Protected investigation uses authenticated application views with current authorization, not labels or exported telemetry.

## 6. Alerting design

An alert is a request for an authorized human or technical process to inspect a condition. It cannot mutate a protected business state, approve a retry, override a version, make a professional decision, create a claim, establish custody/receipt, clear reconciliation, or close an incident.

| Condition requiring a future alert | Minimum safe response | Required fact owner / escalation | Alert cannot do |
|---|---|---|---|
| Sustained error or latency degradation | Validate telemetry health, contain the affected entry point under an approved procedure, preserve accepted work, and assess failed/uncertain operations. | Technical operations; affected domain owner. | Mark requests failed/successful based only on HTTP or process health. |
| Database transaction/connection failure | Stop unsafe writes, distinguish proven rollback from uncertain outcome, preserve attempts, and reconcile before retry. | Database/technical owner plus affected domain owner. | Assume commit or rollback, replay blindly, or repair rows manually without an approved path. |
| External dependency or vendor failure | Enter approved degraded/blocked mode, suppress unsafe new effects, preserve acknowledgements/unknown outcomes, and invoke vendor/exit procedure. | Integration/vendor owner; pharmacy/finance/communications owner as applicable. | Treat dependency recovery as business success or automatically repeat an uncertain external effect. |
| Webhook authentication/validation/replay anomaly | Reject or quarantine the observation, preserve minimized receipt evidence, assess credential/source compromise, and reconcile affected operations. | Security and integration owner. | Apply provider state, reveal whether a protected resource exists, or rotate/revoke credentials without approved authority. |
| Worker/queue stalled, duplicated, or dead-letter backlog | Fence duplicate processing, preserve attempts, pause dependent transitions if required, and assign recovery. | Technical operations and workflow owner. | Drain by bypassing authorization/version/idempotency or dropping messages/evidence. |
| Stuck workflow or reconciliation backlog | Open/assign a protected work item and escalate based on approved age/severity policy. | Pharmacy operations or the exact fact owner; technical operations for service causes. | Auto-complete, cancel, release, reconcile, or delete. |
| Invalid transition, stale-version conflict, or contradictory state spike | Preserve rejection/conflict evidence, investigate source/version/authorization, and contain a defective producer. | Technical/security and domain owner. | Accept last-write-wins or expose enumeration details. |
| Release, custody, delivery, proof, or return exception | Fail closed, preserve actual/unknown custody, contain package movement where an approved actor directs it, and escalate to pharmacy/DM and incident owners. | Pharmacy/Designated Manager, professional, operations, privacy/security as applicable. | Mark delivered/received/returned/saleable, infer recipient authority, or restock. |
| Audit-control write failure or integrity anomaly | Stop affected protected acceptance where the approved atomic contract requires audit, preserve technical failure evidence, and escalate governance/security. | Audit/governance and security owners. | Continue with best-effort audit or write sensitive payloads as a substitute. |
| Suspected sensitive-data leakage or secret compromise | Stop affected export/integration, restrict access, preserve minimized forensic evidence, and start approved privacy/security assessment. | Privacy/security and authorized incident owner. | Copy leaked content into the alert/ticket or auto-decide breach/reportability/harm. |
| Backup verification or restore-drill failure | Protect current data, stop reliance on the failed recovery path, investigate integrity/access/key dependencies, and escalate recovery readiness. | Infrastructure, security, records/governance, Task 11. | Claim recoverability, change RPO/RTO, or restore into production without approval. |

Alert delivery requires an approved minimum-data operational channel, access model, owner/backup, acknowledgement path, escalation path, suppression/deduplication rule, maintenance handling, test cadence, and lifecycle. Alert details must remain generic; protected drill-down requires a fresh authenticated and authorized application view. Suppression, acknowledgement, or dashboard clearance does not resolve the underlying workflow, discrepancy, custody, safety, privacy, professional, or financial condition.

No threshold, deadline, severity mapping, paging service, email/chat integration, phone roster, support account, or automated remediation is selected. Task 07 concerns approved patient communications; it is not implicitly an operations-paging system.

## 7. Incident lifecycle

Every later Task 08 incident process follows **Detection -> Containment -> Investigation -> Resolution -> Review**. The actual incident category, response owner, backup, severity, timing, communication, regulator/insurer/payer/vendor obligation, and decision authority remain PENDING.

| Phase | Required activity and evidence | Ownership boundary | Fail-closed rule |
|---|---|---|---|
| Detection | Record the trusted detection time, safe signal class, affected component/workflow class, source reliability, initial scope uncertainty, and opaque incident reference. Validate that telemetry itself is healthy. | Technical operations detects system signals; pharmacy/professional, privacy/security, finance, vendor, or records owners may detect domain facts. | Detection does not establish harm, breach, medication incident, loss, fraud, custody, or final business state. |
| Containment | Apply only pre-approved, least-privilege, reversible controls: deny affected transitions, pause unsafe outbound effects, fence workers, restrict compromised access, hold package/inventory/financial/claim/notification progression, and escalate physical custody to the pharmacy. | Technical owner contains system paths; actual pharmacy/DM/professional owner controls medication safety, release, package and custody decisions; privacy/security controls access/credentials under approved authority. | Monitoring alone cannot trigger a protected decision. Preserve current physical facts and use `UNKNOWN` where custody/outcome is uncertain. |
| Investigation | Preserve immutable/minimized attempts, versions, observations, audit, containment actions, recovery actions, source acknowledgements, and discrepancies. Reconstruct chronology without placing protected content in general logs/tickets. | Assigned incident lead coordinates; each fact owner assesses its domain. Legal/privacy/professional determinations remain human and separately accountable. | Do not delete/rewrite evidence, expose it to broad support roles, or infer a missing professional/external fact. |
| Resolution | Correct the technical cause through approved change/recovery controls; reconcile each external/physical/financial fact; obtain required pharmacy/professional decisions; verify authorization, versions, custody, audit, and dependent states before resuming. | Technical owner restores service; domain owners resolve facts; Task 11 controls validation/release. | Service recovery, alert clearance, restore, replay, or vendor statement cannot by itself close protected state. |
| Review | Record root/contributing causes, control effectiveness, evidence integrity, patient-safety/privacy/security/accessibility/financial/vendor findings by authorized reviewers, required follow-ups, and verified closure. | Independent quality/security/privacy/professional/operations review as applicable; named owners remain PENDING. | Do not auto-decide legal reportability, clinical harm, medication incident, controlled-substance loss, claim fraud, or professional accountability. |

### 7.1 Incident communication

- Internal operational communication uses an approved minimum-necessary channel and opaque incident reference. It must not reproduce PHI, prescriptions, OCR, clinical rationale, addresses, payment, proof, tracking, or credential data.
- Patient/delegate/recipient communication requires Task 05 audience authorization and Task 07 contact, consent, template, delivery, and secure-message controls. A generic notification cannot prove receipt, understanding, counselling, or resolution.
- Pharmacy, Designated Manager, professional, privacy, security, legal, records, finance/payer, insurer, regulator, law-enforcement, vendor, and affected-custodian notifications occur only when the authorized human owner determines they are applicable. This document does not make that legal or professional determination.
- Public status or support copy cannot reveal patient/resource existence, pharmacy scope, medication, delivery, incident detail, or protective-control thresholds.

### 7.2 Required incident classes

Future approved runbooks and rehearsals must cover at least:

- prescription/evidence integrity, wrong subject/pharmacy/tenant, identity/delegation/recipient, role escalation, professional attribution, and unauthorized release;
- inventory uncertainty, shortage, recall, quarantine, expiry, storage/integrity, reservation failure, preparation/check conflict, and release revocation;
- price/adjudication/payment/claim separation failures and uncertain external financial outcomes;
- pickup/recipient/proof disputes, courier outage/delay, loss/theft/tamper/damage/temperature, wrong or failed delivery, unknown custody, failed/delayed return, correct-pharmacy return receipt, and separate stock disposition;
- PMS/inventory/payer/payment/courier/address/notification vendor compromise, outage, replay, stale/contradictory data, contract exit, and unavailable authoritative query;
- suspected privacy/security incident, credential compromise, inappropriate support access, retention/hold/deletion/backup failure, telemetry leakage, and audit-control failure; and
- inaccessible workflow or unavailable manual/telephone/in-person alternative.

This catalogue is not an approved runbook. Each runbook still needs trigger, scope, assigned owner/backup, authority, containment, evidence, communication, recovery validation, reconciliation, accessibility alternative, kill/rollback control, rehearsal, and Task 11 acceptance.

## 8. Failure-recovery rules

| Failure | Required proposed recovery behavior | Evidence preserved | Unsafe behavior prohibited |
|---|---|---|---|
| Application/service outage | Deny unavailable operations safely; preserve committed state; restart only under approved deployment/health checks; revalidate authorization, lifecycle, trusted time, versions, and dependencies before new work. | Deployment/version, safe failure class, committed/unknown operation status, recovery actions. | Treating an interrupted response as rollback/success, replaying browser input blindly, or advancing state from cache. |
| Database connection/transaction failure | Distinguish proven rollback, committed success, and unknown commit outcome using authoritative database evidence; reconcile unknown outcomes before retry. | Attempt/fence/idempotency evidence, transaction result where authoritative, versions, required audit status. | Guessing commit status, manual last-write-wins repair, duplicate protected effects. |
| External dependency outage | Enter blocked/degraded state for the affected integration; keep source truth unknown or last-supported-and-stale; use only approved authoritative query/manual path. | Attempts, acknowledgements, last accepted source/version/time, outage and discrepancy evidence. | Converting last-known data to current truth, fabricating success, selecting another vendor without approval. |
| Webhook failure, replay, or authentication uncertainty | Reject/quarantine safely, deduplicate scoped identity/digest, preserve minimized receipt status, and process only after current validation/ordering/mapping checks. | Receipt/authentication/validation/mapping/retry/reconciliation revisions; no raw body in technical surfaces. | Applying the event directly, weakening validation, trusting “delivered/paid/available,” or disclosing resource existence. |
| Worker or queue interruption | Use later-approved transactional claim/lease/fencing, bounded retry classification, current versions, and idempotent validated response replay. Recover oldest safe work first under an approved policy. | Claim/lease/fence attempts, retry/dead-letter/reconciliation state, causal versions. | Multiple workers applying one effect, unbounded retry, deleting poison work, bypassing authorization or audit. |
| Stale or contradictory external state | Reject it from progression, preserve all observations and versions, mark the exact fact unresolved, and assign reconciliation to the fact owner. | Source/local revisions, order, discrepancy, mapping, human resolution. | Last-write-wins, silently discarding newer or physical evidence, auto-selecting a “best” fact. |
| Reconciliation subsystem outage/backlog | Keep affected outcomes blocked/unknown, retain discrepancies and assignments, alert the authorized owners, and use only an approved protected manual procedure. | Backlog age/class, original observations/attempts, assignment/recovery actions. | Closing discrepancies for queue health, retrying uncertain effects, or treating manual notes as authority without contract. |
| Notification/communications failure | Preserve committed notice intent and delivery observation separately; retry only through Task 07 policy after current consent/contact/audience/revocation checks. | Intent/version, provider observation, retry/reconciliation evidence. | Treating send/read as understanding/receipt or exposing protected content in fallback channels. |
| Courier/delivery failure or unknown custody | Preserve actual last verified custody or `UNKNOWN`; block receipt/completion; apply pharmacy-owned containment and return workflow; reconcile proof/package/attempt/recipient/release. | Custody chain, attempts, proof references, exceptions, return receipt/disposition revisions. | Marking delivered/received from webhook, guessing recipient/custody, automatic return/restock/refund/claim effect. |
| Payment/adjudication uncertainty | Keep ledger/adjudication state uncertain, block unsafe repeat/capture/refund dependence, and reconcile with the approved financial authority. | Attempts, acknowledgements, accepted ledger/source revisions, discrepancy/resolution. | Charging/refunding blindly, releasing medication, marking fulfilment final, creating/reversing a claim. |
| Required audit-control failure | Roll back affected local protected acceptance and success receipt when the approved atomic contract requires audit; stop the affected path and escalate. | Sanitized technical failure, transaction result, later approved audit-write-failure evidence. | Best-effort continuation, logging the protected payload as substitute evidence. |
| Telemetry/alerting failure | Treat observability as degraded, use approved independent health checks/manual controls, and do not claim absence of incidents. | Telemetry health, gap interval, recovery validation and missed-signal review. | Assuming green health, disabling fail-closed workflow guards, or backfilling invented measurements. |
| Backup or restore failure | Stop reliance on the failed recovery point/path, preserve current systems, validate integrity/key/access dependencies in isolation, and escalate to records/security/Task 11 owners. | Backup verification, restore attempt, integrity/reconciliation and approval evidence. | Destructive production restore, overwriting newer evidence, or claiming recovery without reconciliation. |

### 8.1 Replay and retry

- A retry is a new technical attempt against the same approved logical operation, not permission to repeat a physical, financial, professional, notification, or vendor effect.
- Before replay, revalidate current authentication/authorization, server-owned pharmacy scope, actor/subject/assignment, lifecycle/approval, trusted time, state/source versions, idempotency projection, cancellation/revocation, and current dependency contract.
- Same-key/same-projection replay may return only a previously validated minimized response. Same key with changed scope, actor, resource, operation, or projection conflicts safely.
- A timeout or lost acknowledgement with possible external effect remains unknown and enters reconciliation before another attempt. Local rollback cannot assert external rollback.
- Backoff, attempt limits, leases, dead-letter policy, replay lifetime, recovery order, and escalation threshold remain PENDING. No “exactly once” distributed guarantee is claimed.

## 9. Backup, restore, and continuity proposal

The current repository includes governance/recovery design for existing records, including [RESTORE_DRILL.md](../RESTORE_DRILL.md). That evidence does not establish Task 08 backup coverage, approved recovery objectives, successful Task 08 restoration, or production readiness.

A future Task 08 recovery design must document for every applicable current, historical, audit, inbox/outbox, external-operation, reconciliation, identity/authorization reference, evidence, log, and backup dataset:

- authoritative owner, purpose, classification, PHI/personal/professional/financial/custody sensitivity, and minimum necessary fields;
- source, storage location, approved geography as a project/contract decision, encryption, key custody/rotation, privileged/support access, and segregation;
- backup inclusion/exclusion, backup frequency, integrity verification, immutability where required, legal/record hold, retention trigger/period, expiry, deletion, vendor exit, and destruction evidence;
- dependency and recovery order, schema/application/contract compatibility, state/version integrity, audit completeness, idempotency/inbox/outbox fencing, and external-source reconciliation;
- recovery-point objective, recovery-time objective, maximum data-loss/operational-interruption acceptance, degradation behavior, manual alternative, escalation, and communication; and
- isolated restore test, synthetic/non-PHI rehearsal data, access review, evidence of result, discrepancy handling, corrective action, re-test, and independent Task 11 acceptance.

No RPO, RTO, backup frequency, retention period, restore deadline, recovery tier, or acceptable-loss value is selected here. Those values require records/governance, pharmacy/DM, privacy/security, infrastructure, vendor, business-continuity, legal and Task 11 review as applicable.

A restore cannot overwrite newer immutable/material evidence without an approved reconciliation plan. It cannot make external provider state current, revive expired/revoked authority, un-cancel a request, restore professional release, prove custody/receipt/payment/claim, or make a returned item saleable. After restore, affected mutable projections remain blocked until authorization, lifecycle, versions, audit integrity, external acknowledgements, custody, and discrepancies are reconciled from authoritative sources.

## 10. Operational ownership and separation of duties

The following are conceptual owner profiles, not new runtime roles or named assignments. Existing repository roles (`pharmacy_admin`, `pharmacist`, `intern`, `student`, `technician`) do not gain Task 08 operational or professional permissions from this document.

| Conceptual owner | Proposed responsibility | Must not do by virtue of this responsibility | Status |
|---|---|---|---|
| Technical service owner / on-call | Service health, deployment, database/worker/queue/adapter diagnosis, approved technical containment, recovery execution and evidence. | Make professional, identity, custody, inventory, payment, claim, recipient, return-disposition, legal-reportability, or patient-communication decisions. | Owner, backup, access, rota, and authority PENDING. |
| Incident lead | Coordinate phases, owners, chronology, containment dependencies, evidence and review. | Replace each domain fact owner or classify clinical harm/breach/reportability automatically. | Appointment and severity authority PENDING. |
| Pharmacy operations owner | Administrative workflow health, assignment, local continuity, package/custody escalation and approved manual process. | Impersonate a pharmacist, bypass professional gates, accept a claim/payment/provider fact, or weaken security/evidence controls. | Task 08 mapping PENDING. |
| Pharmacist / Designated Manager / accountable professional | Actual pharmacy-owned professional decisions, medication-safety assessment, release/revocation, custody/return/disposition oversight, and applicable professional incident decisions. | Treat DM accountability as performance of every action; delegate outside approved scope; use monitoring as decision evidence. | Scope, registration verification, trainee supervision, delegation and named reviewers NOT VERIFIED/BLOCKED. |
| Privacy / security owner | Access containment, credential/key response, forensic boundary, privacy/security assessment and approved notification/escalation decisions. | Copy protected content into general tools or automatically decide legal reportability, clinical harm, or professional action. | Named owners, PIA/TRA and process PENDING. |
| Records / governance owner | Dataset inventory, holds, retention, export/deletion/backup controls, audit access and evidence preservation. | Reuse existing retention periods automatically, erase material evidence, or direct clinical/physical/financial state. | Task 08 policy PENDING under T08-D32/D33. |
| Integration / vendor owner | Contract health, service identity, acknowledgement/finality contract, retry/reconciliation and vendor escalation/exit. | Accept provider observations as protected state or change vendors/accounts/credentials without approval. | No provider selected; BLOCKED. |
| Finance / payer owner | Adjudication/payment ledger facts, discrepancy resolution and approved financial incident response. | Make professional release/custody decisions or create/reverse a claim from fulfilment state. | Authority/system NOT VERIFIED/BLOCKED. |
| Task 05 identity owner | Future patient/delegate/recipient authentication, relationship, audience and revocation contract. | Select tenant/pharmacy scope or confer professional/courier authority. | Runtime absent; BLOCKED. |
| Task 07 communications owner | Future contact/consent/template/dispatch/delivery evidence and communication incident response. | Treat notice status as receipt/understanding or mutate fulfilment. | Runtime/provider absent; BLOCKED. |
| Task 09 / actual interoperability owner | Future reviewed handoff/export boundary where separately authorized. | Become PMS, payer/payment, claim, inventory, or delivery authority by task number. | Actual ownership unresolved; BLOCKED. |
| Task 11 independent reviewers / release authority | Review exact candidate, threat/privacy/security/accessibility, failure evidence, runbook rehearsal, rollback/kill controls and release gates. | Supply missing professional/legal/vendor/business policy or waive mandatory stops implicitly. | Applicable checkpoints BLOCKED/PENDING. |

Access to monitoring, audit, dashboards, incident cases, backups, production support, and recovery controls must be independently approved, least privilege, purpose limited, time bounded where applicable, attributable, reviewable, and revocable. Support access does not imply pharmacist, patient, tenant, records, privacy, or security authority. Unknown roles fail closed.

## 11. Runbook requirements

Every later operational runbook must include:

1. exact trigger and affected stage/scope;
2. current and backup owner, required role/authorization, approval version, and escalation contacts;
3. safe detection evidence and how telemetry health is verified;
4. immediate technical containment versus pharmacy/professional/physical containment;
5. protected states/effects blocked and facts that must remain `UNKNOWN`;
6. minimum evidence preserved, prohibited data locations, access, legal/record hold, and audit contract;
7. dependency/vendor communication and uncertain-effect handling;
8. patient/actor communication only through approved Task 05/07 boundaries and accessible alternatives;
9. safe recovery sequence, idempotency/fencing/version checks, reconciliation, authorization revalidation, and rollback/kill criteria;
10. verification that no duplicate, silent overwrite, custody/receipt, professional, financial, claim, notification, or restock error occurred;
11. closure authority, unresolved-risk acceptance, post-incident review, corrective work and re-test; and
12. rehearsal method using deterministic synthetic/non-PHI data plus independent Task 11 evidence review.

Required runbook groups are listed in Section 7.2. A runbook may block only the affected slice/stage when independent work has no dependency on it. Runnable synthetic work still needs exact synthetic-scope/lifecycle and applicable Task 11 approval; production behaviour needs every applicable professional, identity, integration, privacy/security, accessibility, retention, incident, backup/recovery, vendor and release decision.

## 12. Future test obligations - not implemented or run

| Test ID | Planned evidence |
|---|---|
| J-T01 - Logging leakage | Seed unmistakably synthetic sentinel values for identity, prescription/OCR/clinical, address/contact, payment/claim, package/proof/location, credentials/tokens and internal IDs; verify they are absent from logs, traces, analytics, metrics/labels, alerts, errors, URLs, queue/topic names, correlation/idempotency keys, tickets and screenshots. |
| J-T02 - Closed telemetry schemas | Reject unknown fields, arbitrary metadata, high-cardinality labels, user/browser-supplied scope/time, raw payloads/exceptions and unapproved state/error classes. Verify opaque references are non-semantic and cannot authorize retrieval. |
| J-T03 - Missing technical alerts | Deterministically trigger approved error-rate, latency, database, dependency, webhook, worker/queue, audit-control and telemetry-health conditions; prove one bounded alert reaches the assigned synthetic sink and absence is detected. Threshold values await approval. |
| J-T04 - Missing workflow alerts | Trigger stuck workflow, reconciliation backlog, invalid transition, stale conflict, delivery/custody/return and financial discrepancy classes; prove bounded deduplicated alerts without resource enumeration or protected payloads. |
| J-T05 - Alert non-authority | Prove alert creation, acknowledgement, suppression, clearance, paging failure and dashboard state create no request, prescription, inventory, preparation, release, custody, receipt, payment, claim, return, restock, audit substitution or reconciliation resolution. |
| J-T06 - Failed and duplicate recovery | Inject recovery failure, process restart, duplicate operator action, duplicate worker, lost acknowledgement and repeated replay. Prove fencing/idempotency/current-version validation prevents duplicate local/external effects and preserves every attempt/result. |
| J-T07 - Database uncertainty | Exercise proven rollback, committed success and unknown commit outcome with independent connections/barriers. Unknown outcome reconciles before retry; no success receipt or duplicate effect is invented. |
| J-T08 - Dependency outage | Fail each synthetic deny-only adapter, authoritative query and acknowledgement path. Dependent transitions fail closed; last-known state becomes stale rather than current; recovery does not create business truth. |
| J-T09 - Webhook/queue recovery | Exercise invalid authentication, replay, reordering, poison input, lease expiry, two workers, dead-letter and backlog recovery. One validated observation may be accepted at most once; raw body and sensitive fields remain excluded. |
| J-T10 - Stale workflow and reconciliation backlog | Use trusted time and fixed fixtures to verify age calculation, escalation, pagination/assignment and recovery without auto-advancement, dropped discrepancies, gaps, duplicates or full-queue loading. Exact time thresholds remain PENDING. |
| J-T11 - Delivery/custody recovery | Exercise courier outage, wrong/failed delivery, missing proof, unknown custody, loss/tamper/damage/temperature, delayed/wrong-destination return and reconciliation. Failed delivery never becomes receipt; delayed return can become `RETURNED` only after verified correct-pharmacy custody; no auto-restock/claim/financial effect. |
| J-T12 - Audit failure | Force required audit-control failure and prove the affected protected local acceptance and success receipt roll back atomically, with no payload copied into technical logs. Denied-attempt evidence follows only the approved minimized contract. |
| J-T13 - Backup and restore | Restore synthetic/non-PHI fixtures into an isolated environment; verify encryption/access/integrity evidence, contract/schema compatibility, immutable history, current authorization/lifecycle, versions, inbox/outbox/idempotency fences and required external reconciliation. Restore cannot revive authority or physical/financial truth. |
| J-T14 - Incident lifecycle | Rehearse Detection -> Containment -> Investigation -> Resolution -> Review with separate technical and pharmacy/professional owners, minimized communication, evidence preservation, failed escalation, accessible alternative, rollback/kill control and independent review. |
| J-T15 - Tenant/role isolation | Cross-pharmacy and unauthorized support/technical/staff actors cannot access protected drill-down, audit, incident, backup or recovery controls. Browser-supplied pharmacy/tenant/time/role cannot influence scope or labels. Unknown roles fail closed. |
| J-T16 - Review and promotion | Exact candidate tests, privacy/security/professional/operations/records/accessibility/vendor review, production-invariance controls, runbook/rollback/recovery rehearsal and applicable Task 11 checkpoint evidence remain required. A technical PASS cannot grant production authority. |

These are planned obligations only. No test, fixture, telemetry sink, dashboard, alert route, worker, queue, database, backup, restore, incident, external call, command, or PASS evidence is created or run by this document.

## 13. Unresolved decisions and stage blockers

| Decision references | Unresolved requirement | Affected stage |
|---|---|---|
| T08-D02-D04, D10, D36-D37 | Exact synthetic capability/candidate/exclusions, risk/autonomy level, owner/backup, lifecycle expiry/review, kill/rollback authority, deterministic environment, production invariance and applicable Task 11 checkpoints. | Runnable SYN; validation/pilot/production. Documentation may continue independently. |
| T08-D05-D08, D14, D17, D21-D22, D31 | Actual prescription/PMS, patient identity/delegation/recipient, Task 07 communications, finance/payer/payment/claim and Task 09 ownership/authority contracts. | Affected integrated SYN; validation/pilot/production. |
| T08-D18, D29, D32 | Closed state/event/error/operation schemas, inbox/outbox/idempotency, trusted time, lock/fence/retry/reconciliation, minimized audit and denied-attempt contracts. | Any runnable protected transition, worker, webhook or recovery path. |
| T08-D28, D30 | Vendor selection/contracts, minimum data, service authentication, encryption/key custody, support access, geography/subprocessors, incident/availability/exit, PIA/TRA and monitoring-provider approval. | Any vendor-backed SYN where applicable; validation/pilot/production. |
| T08-D33 | Field-level retention, hold, export, backup inclusion, backup expiry/deletion, log/trace/metric/incident evidence retention and destruction authority. No duration is approved. | Any persistence/telemetry/backup implementation; validation/pilot/production. |
| T08-D34 | Incident owner/backup, severity/classification, containment authority, pharmacy/DM/professional escalation, patient-safety/privacy/security/legal/finance/vendor assessment, communication, reportability, recovery, reconciliation and post-review. | Operational readiness; validation/pilot/production. Synthetic rehearsal must represent missing decisions honestly. |
| T08-D35 | Applicable accessibility standard/target and approved manual/telephone/in-person alternatives for every affected failure and recovery path. | UI/operational validation, pilot/production; policy-dependent SYN. |
| T08-D37 | Metric/alert/SLO thresholds, dashboard and on-call ownership, support model, RPO/RTO, backup/restore evidence, runbook/kill/rollback rehearsals, monitoring/abuse controls and explicit go-live. | Pilot/production. No value is inferred here. |

No reviewer names, owners, thresholds, deadlines, time windows, RPO/RTO, retention periods, service levels, retry counts, alert channels, vendors, professional policies, legal interpretations, incident classifications, reportability decisions, production systems, or approvals are invented.

## 14. Stage-specific readiness

| Stage | Minimum operational evidence before the affected work may proceed | Current status |
|---|---|---|
| Documentation/design | Accurate current/proposed/blocked separation; no real data/effects; explicit unresolved decisions and stop conditions. | This document is prepared for review only; no approval claim. |
| Runnable synthetic slice | Exact candidate/scope/exclusions, deterministic non-PHI fixtures, no-egress/production fail-hard controls, approved technical signals, safe error/log schema, applicable recovery tests, owner/lifecycle/kill path, and applicable Task 11 Checkpoint 1. | **BLOCKED / PENDING.** No runtime created. |
| Validation/pilot | Approved identity, professional, integration, privacy/security, accessibility, records, incident, backup/recovery, vendor and operational procedures for the affected slice; exact evidence, rehearsals and independent Task 11 review. | **BLOCKED.** |
| Production | All applicable Task 08 production gates, vendor contracts, source authorities, PIA/TRA, monitoring/support/on-call, SLO/RPO/RTO, alert/runbook/rollback/kill/recovery rehearsals, independent professional/DM/technician/operations/privacy/security/legal/accessibility/finance/payer/courier review, and explicit go-live authority. | **BLOCKED.** |

Production-only decisions are not blanket prerequisites for unrelated documentation or separately approved independent synthetic work. A missing decision still blocks every slice and stage that depends on it. No mandatory stop condition is weakened by this stage distinction.

## 15. Explicit non-authorization

This document grants **no implementation, monitoring, logging, tracing, analytics, dashboard, alerting, paging, incident-response, backup, restore, recovery, runbook, schema, migration, authentication, identity, professional, pharmacy, privacy, security, legal, accessibility, vendor, procurement, integration, synthetic-runtime, pilot, or production authorization**.

It creates no runtime behaviour, external connection, real prescription, PHI flow, inventory effect, preparation/check/release, pickup, courier activity, delivery, proof/receipt, return, restock, adjudication/payment, claim, notification, worker, queue, webhook, inbox/outbox, audit event, retention rule, support access, credential, secret, account, threshold, RPO/RTO, SLA/SLO, or readiness evidence. Monitoring remains non-authoritative; unknown or contradictory state fails closed; public intake remains zero-PHI; server-owned pharmacy scope remains authoritative; and all production Task 08 functionality remains blocked.
