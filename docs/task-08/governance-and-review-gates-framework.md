# Task 08 — Governance and review gates framework

**Status:** PROPOSED GOVERNANCE DESIGN ONLY — NO GATE PASSED; NO APPROVAL OR AUTHORIZATION GRANTED.

This document defines how Task 08 design decisions would be proposed, reviewed, challenged, owned, superseded, and evidenced. It does not approve a design, implementation, test run, migration, authentication change, professional procedure, vendor, integration, pilot, deployment, or production release. It does not prove compliance or replace pharmacy governance, a Designated Manager, an actual authorized professional, legal/regulatory review, privacy/security review, accessibility review, records governance, procurement, payer/finance review, or Task 11.

The framework is grounded in [AGENTS.md](../../AGENTS.md), the [Task 08 specification](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), and completed Task 08 Workstreams A–L:

- Workstream A: [current-state and gap analysis](./current-state-and-gap-analysis.md), [Ontario standards mapping](./ontario-fulfilment-standards-and-policy-mapping.md), and [dependency/decision register](./production-dependency-and-decision-register.md);
- Workstream B: [threat model](./fulfilment-threat-model.md) and [trust boundaries/data flows](./trust-boundaries-and-data-flows.md);
- Workstream C: [professional responsibility](./professional-responsibility-matrix.md) and [transition authorization](./role-and-transition-authorization-matrix.md);
- Workstream D: [contracts and schema proposal](./fulfilment-contracts-and-schema-proposal.md);
- Workstreams E–H: [request/evidence](./request-and-prescription-evidence-workflow.md), [pharmacy choice](./pharmacy-choice-and-transfer-boundary.md), [orthogonal state](./orthogonal-state-model-and-state-machine.md), [inventory/release](./inventory-preparation-and-release-workflow.md), and [pickup/delivery/return](./pickup-delivery-custody-and-handoff-workflow.md);
- Workstreams I–L: [integration/reconciliation](./external-integrations-webhooks-and-reconciliation.md), [operational readiness](./operational-readiness-and-observability.md), [security/privacy](./security-privacy-and-compliance-controls.md), and [testing/validation](./testing-and-validation-framework.md).

The “Workstream M” label identifies this bounded governance document. It does not rename the Task 08 specification's workstreams, replace its checkpoints, or authorize later work.

Four categories remain distinct:

1. **CURRENT:** the repository's existing protected assessment, advisory claim-draft, audit, and governance behavior. It is not a Task 08 fulfilment runtime or approval precedent.
2. **EXISTING SYNTHETIC / EXPERIMENTAL:** Task 01 safeguards and Task 04 patterns are study material only. Task 04 authority is non-transferable and cannot approve Task 08.
3. **PROPOSED TASK 08 DESIGN:** every ownership rule, gate, status, register field, change process, escalation, and test obligation below.
4. **PRODUCTION-BLOCKED:** every real prescription, patient identity, inventory, pharmacy/PMS, adjudication/payment, courier, notification, professional workflow, schema, authentication, vendor, or external effect.

## 1. Governance principles

1. **Clear ownership.** Every material decision needs one accountable decision-owner role, named reviewer roles, defined scope, and an escalation owner. “The team,” AgentRx, a webhook, a vendor, or an automated process is not an accountable human owner.
2. **Separation of duties.** Technical, pharmacy/professional, privacy/security, business, finance, accessibility, records, vendor/procurement, and independent release responsibilities do not collapse into one approval. The person who authors evidence must not be assumed to approve it.
3. **Documented decisions.** A decision is not authoritative until its approved record identifies the exact question, alternatives, rationale, evidence, owner, reviewers, scope, candidate/version, status, dependencies, conditions, effective time, review/expiry rules, and supersession path.
4. **Evidence-based review.** Assertions require source-linked evidence for the exact candidate and stage. Meeting notes, document existence, test execution, a technical PASS, vendor marketing, or absence of a reported incident is not approval evidence by itself.
5. **Reversible where possible.** Prefer bounded, time-limited, feature-gated, killable, rollback-capable decisions. Irreversible physical, professional, privacy, financial, migration, retention/destruction, or external effects require their own explicit authority and cannot rely on application rollback.
6. **No hidden authority.** Browser input, patient choice, `PHARMACY_ID`, role labels, existing assessment permissions, Task 04 artifacts, a system status, payment, courier state, or an approved lower gate cannot silently authorize another domain or stage.
7. **Visible unresolved blockers.** `PENDING`, `BLOCKED`, `DEFERRED`, `NOT VERIFIED`, expired, revoked, contradictory, and missing evidence remain visible. They cannot be converted to approval through a default, timeout, majority vote, status label, or omission from a summary.
8. **Stage-specific proportionality.** Resolve the blockers applicable to the affected slice and stage. Independent documentation/design may continue while production-only decisions remain blocked; runnable synthetic work still needs exact synthetic-scope and applicable Task 11 approval.
9. **Fail closed on ambiguity.** Conflicting owners, unclear scope, stale evidence, unverified source versions, missing professional authority, uncertain external finality, or unknown approval lifecycle blocks the affected protected action.
10. **Preserve history.** Approved, rejected, deferred, expired, revoked, challenged, and superseded decisions remain attributable. Corrections append or supersede; they do not silently rewrite material evidence.

The server-only pharmacy invariant remains authoritative: patient choice is reversible intent and never supplies tenant authority. Any proposal to change the one-pharmacy `PHARMACY_ID` model requires explicit lead-approved changes to the governing invariant and every affected security/data boundary; this document grants none.

## 2. Ownership model

### 2.1 Responsibility classes

| Owner/reviewer class | Responsible for | Cannot authorize by itself |
|---|---|---|
| Technical owners | Architecture, implementation quality, data/transaction design, reliability, operability, testability, rollback, production invariance, and technical evidence | Pharmacy judgment, dispensing/release policy, professional scope, compliance, privacy, production release, vendor finality, or business priority |
| Pharmacy/professional owners | Professional decision boundaries, prescription evidence review, inventory/preparation/check/counselling/release procedures, exceptions, custody/return disposition, and accountable workflow validation | Source code quality, security assessment, privacy approval, legal interpretation, production infrastructure, or payer policy by themselves |
| Privacy/security owners | Necessity and proportionality, access and disclosure, threat/control review, PIA/TRA inputs, encryption/key/support/vendor controls, logging/telemetry, incident and security evidence | Professional decisions, product priority, payer/claim rules, or production release alone |
| Business/product owners | Product scope, user outcomes, priorities, funding, operational feasibility, and acceptance criteria within approved boundaries | Professional, regulatory, privacy/security, accessibility, tenant, claim, or release authority |
| Governance/review owners | Gate criteria, reviewer independence, decision-register integrity, evidence completeness, challenge/escalation handling, unresolved-blocker visibility, and checkpoint outcome recording | Replacing the fact owner, inventing missing policy, or overriding a failed professional/privacy/security/Task 11 gate |
| Legal/regulatory reviewer | Review of applicable law, regulation, standards, Internet-site/accreditation questions, contracts, and formal interpretations | Clinical/professional decisions, technical correctness, or approval outside the recorded mandate |
| Accessibility reviewer and affected-user validation | Applicable standard/target, accessible journeys, alternatives, language, reflow, assistive technology, and evidence | Weakened identity, privacy, custody, professional, or security controls |
| Records/governance owner | Record classes, retention triggers/periods, legal/record holds, correction, export, backup, deletion/destruction, audit access, and restore implications | Professional judgment, operational convenience deletion, or broad reuse of an existing retention period |
| Finance/payer/claim owner | Price/coverage/adjudication/payment/claim ownership, finality, reversal, reconciliation, and approved money-rule evidence | Prescription validity, release, custody, receipt, or claim authority through payment/fulfilment state |
| Vendor/procurement owner | Vendor selection, contract, data processing, security/accessibility/residency/subprocessor evidence, support, availability, insurance, incident, retention/exit, and service acceptance | Internal fact ownership, professional decisions, patient receipt, or production approval beyond the contract |
| Task 11 independent reviewer | Candidate-bound quality, security, protected-route, vendor, feature-gate, production-invariance, evidence, rollback, and release-gate review | Inventing upstream decisions or converting a synthetic result into professional/regulatory/production authority |

### 2.2 Decision-accountability rules

- Each decision has exactly one accountable owner role for its scope. Multiple responsible contributors are allowed; ambiguous co-ownership is not.
- The actual named owner, delegated authority, backup, reviewer, and conflict-of-interest treatment must be recorded before approval. This document does not invent names.
- A conceptual Task 08 actor is not automatically mapped to a current runtime role. Current assessment permissions do not grant dispensing, counselling, professional-check, release, recipient, courier, finance, governance, or production authority.
- Designated Manager accountability does not mean the Designated Manager performs every action. The actual authenticated professional remains attributable for each professional decision.
- Engineering may validate that supported evidence exists; AgentRx cannot make, infer, recommend, or approve a professional decision.
- An approval service, system process, alert, test, or workflow engine may enforce a recorded gate but cannot be the human decision owner.
- Unknown roles, expired delegation, stale assignment, or absent proof of authority fail closed.

### 2.3 RACI-style decision record

Every decision record must distinguish:

- **Accountable:** one owner who may decide within documented authority;
- **Responsible:** contributors who prepare options/evidence or implement an approved decision;
- **Consulted:** independent domain reviewers whose approval or advice is required;
- **Informed:** affected owners who receive the minimized decision/outcome;
- **Challenger:** an identified reviewer who can raise a safety, privacy, security, professional, accessibility, operational, or evidence concern without being the implementation author.

Being informed or consulted never grants decision authority. A challenger does not unilaterally replace a fact owner; an unresolved challenge blocks the affected gate until disposition is documented by the correct owner(s).

## 3. Approval boundaries

| Boundary | What it may establish | What it does not establish |
|---|---|---|
| Design review | A document is internally coherent enough for its stated planning scope and unresolved issues are visible | Implementation approval, correctness of code, approved professional procedure, compliance, synthetic execution, deployment, or production readiness |
| Implementation approval | An exact file/candidate scope may be implemented under recorded constraints, stop conditions, ownership, and rollback | Test PASS, professional/regulatory acceptance, migration execution, external connection, pilot, or production deployment |
| Synthetic execution approval | An exact candidate, fixtures, environment, commands, no-network boundary, lifecycle, expiry/revocation, destruction, and evidence capture may run | Real patient/pharmacy/professional/vendor authority, production integration, production data, physical/financial effect, or production readiness |
| Validation acceptance | Candidate-bound evidence satisfies specified technical or reviewer criteria for one stage | Broader compliance, other owner approvals, future candidates, production migration, or release by implication |
| Professional/regulatory approval | The actual authorized owner accepts the explicitly recorded professional procedure or interpretation within scope and lifecycle | Technical quality, privacy/security acceptance, vendor selection, or production release outside that mandate |
| Production approval | An exact candidate may enter a defined production stage after every applicable independent gate, runbook, rollback/kill control, monitoring, incident, migration, vendor, and Task 11 condition is satisfied | Permanent authority, unreviewed future changes, clinical autonomy for AgentRx, or waiver of ongoing controls |

A reviewed, merged, or committed document means only that the document exists in version control. It does **not** mean code, database changes, deployment, pharmacy process, legal/regulatory interpretation, privacy/security posture, accessibility, vendor use, or compliance has been approved.

### 3.1 Approval evidence profile

A future approval record must contain, at minimum:

- stable decision/gate identifier and contract/version;
- exact scope, environment, candidate commit/hash and covered files or artifacts;
- accountable owner and required reviewer identities/roles, with authority evidence;
- evidence references and integrity/provenance, including source versions and test/assessment results;
- rationale, considered alternatives, known limitations, residual risk, conditions, and stop/rollback criteria;
- dependency decisions and their accepted versions;
- decision status, decision/effective time, review-due trigger/date where approved, expiry, revocation, and supersession fields;
- explicit exclusions, affected stage, and permitted actions/effects; and
- immutable or append-only challenge, amendment, revocation, expiry, and supersession history.

No owner, date, expiry, threshold, approval outcome, or evidence result is populated by this document. Missing lifecycle evidence means no active approval.

## 4. Review gates

No gate below is recorded as passed. A lower gate never implies a higher gate, and evidence is invalidated when its candidate, scope, dependency, source, contract, or lifecycle changes.

| Gate | Required review | Minimum entry/evidence | Pass meaning | Mandatory block examples |
|---|---|---|---|---|
| Gate 1 — Architecture review | Boundaries, ownership, authority sources, orthogonal states, data flows, safety invariants, dependency graph, failure modes, reversibility | Current-state evidence; Workstreams A–F; exact proposed scope; unresolved decisions; architecture/threat challenge | Design is coherent enough for the stated next design stage only | Request/evidence becomes prescription; patient choice changes tenant; payment/delivery creates claim; AgentRx creates professional decisions; missing owner or contradictory state model |
| Gate 2 — Security/privacy review | Identity/authorization, least privilege, minimization, encryption/key expectations, vendor/tracking, audit/log separation, retention/incident, abuse and privacy risk | Workstreams B, D, I–K; data inventory/flows; threat/control mapping; PIA/TRA inputs where applicable; exact candidate | Security/privacy design evidence is acceptable for the specified stage only | Task 05 identity absent for protected patient flow; PHI in public/client/technical surfaces; browser-selected scope; unapproved vendor/secret/network; missing retention or incident owner for affected persistence |
| Gate 3 — Professional workflow review | Prescription authority, preparation/check/counselling/release/revocation, inventory/product/storage, custody/proof, exception/return disposition and actor accountability | Workstreams C–H; actual professional source/policy; role/transition matrix; pharmacy/DM evidence; unresolved scope exclusions | The authorized professional owner accepts the explicitly bounded workflow/procedure only | Unverified professional scope; technician/admin/system gains pharmacist authority; upload/OCR treated as prescription; inventory/technical/payment status creates release; recipient/courier evidence substitutes professional action |
| Gate 4 — Implementation readiness review | Dependencies, exact slice, contracts, implementation/test plan, environment/isolation, ownership, stop conditions, rollback/kill, evidence capture, production invariance | Gates 1–3 evidence applicable to the slice; Workstream L plan; exact synthetic/implementation approval; applicable Task 11 checkpoint; no unresolved slice blocker | The exact bounded candidate may be implemented or tested only as separately authorized | Missing Task 03/05/07/09 contract used in success path; no exact synthetic scope; unapproved schema/auth/audit change; tests cannot prove required invariants; Task 04 authority reused |
| Gate 5 — Production readiness review | Operations, monitoring, incident/recovery, backup/restore, support, vendor/procurement, migration/deployment, accessibility, privacy/security, professional, finance, legal/regulatory and independent release evidence | Exact releasable candidate; prior gates; production-like validation; runbooks/rehearsals; rollback/kill; every applicable named owner approval; Task 11 production gate | Only the exact candidate may proceed to the explicitly approved production stage and conditions | Any unresolved mandatory stop condition; missing real integration/vendor/professional/privacy/security/accessibility/records/finance evidence; Internet-site/accreditation issue unresolved; production migration/auth change unapproved |

### 4.1 Gate status vocabulary

| Status | Meaning |
|---|---|
| `NOT_ASSESSED` | Gate review has not started; no authority exists. |
| `READY_FOR_REVIEW` | Required entry evidence appears complete enough for review; no approval is implied. |
| `IN_REVIEW` | Assigned reviewers are evaluating the exact scope; no protected action may rely on a future outcome. |
| `BLOCKED` | A required owner, dependency, evidence item, control, or challenge remains unresolved. |
| `CHANGES_REQUIRED` | Review found remediations that must be evidenced before reconsideration. |
| `PASSED_FOR_SCOPE` | The assigned owners accepted the exact recorded scope, candidate, conditions, and lifecycle. It does not pass another gate. |
| `DEFERRED` | The owner intentionally postponed the decision; affected behavior remains unavailable. |
| `EXPIRED` / `REVOKED` / `SUPERSEDED` | Prior evidence is inactive for new action; history remains attributable. |

Only assigned authorized reviewers may set a gate result. This document initializes no gate status and provides no approval evidence.

### 4.2 Gate challenge and re-review triggers

Re-review is required when an affected candidate, dependency, contract, authoritative source, role/scope, data field, state/event/error vocabulary, professional procedure, vendor/subprocessor, retention/incident policy, threat/control, test result, migration, authentication boundary, environment, or rollback/kill mechanism changes. A material incident, control failure, source-policy review, expiry, regulator/professional direction, or new contradictory evidence also triggers re-review.

Until the correct owners classify the change and accept updated evidence, the affected approval is stale or blocked. Unaffected independent documentation/design may continue.

## 5. Decision register

### 5.1 Required register fields

| Field | Requirement |
|---|---|
| Decision ID and version | Stable identifier plus immutable revision/supersession lineage. |
| Decision/question | One precise choice, policy, boundary, or unresolved fact; no bundled hidden authority. |
| Accountable owner | Actual authorized owner role and named individual when assigned; `PENDING` if absent. |
| Required reviewers/challenger | Independent roles and actual assignments; conflicts and recusals recorded. |
| Status | Controlled vocabulary: `PENDING`, `PROPOSED`, `NOT VERIFIED`, `BLOCKED`, `DEFERRED`, `APPROVED_FOR_SCOPE`, `REJECTED`, `EXPIRED`, `REVOKED`, or `SUPERSEDED`. |
| Evidence and rationale | Source-linked, candidate-bound evidence, alternatives, limitations, residual risk, and decision rationale. |
| Dependencies | Decision IDs/versions, source contracts, gates, and external owners that must remain current. |
| Impact and stage blocked | Safety, professional, privacy/security, accessibility, operational, financial, technical, vendor and data impact; affected design/SYN/validation/pilot/production stage. |
| Scope and exclusions | Exact behaviors, actors, data, environment, candidate, effects, and explicit non-authority. |
| Decision/effective/review dates | Actual recorded values only after owner action; otherwise `PENDING`. Review may be trigger-based where approved. |
| Expiry/revocation/supersession | Exact lifecycle and who may act; absent values never become unlimited approval. |
| Challenge/disposition | Concern, reporter role, evidence, assigned owner, status, resolution/rationale, and retained history. |

### 5.2 Current unresolved examples

These rows summarize existing blockers; they are not new decisions or approvals. Existing T08 decision IDs remain authoritative in the [dependency and decision register](./production-dependency-and-decision-register.md).

| Decision area | Accountable owner/reviewers | Current evidence/status | Affected stage |
|---|---|---|---|
| Task 03 prescription evidence, source, PMS and professional-record ownership | Task 03 owner plus pharmacy/professional, records, privacy/security and integration reviewers; actual named owner `PENDING` | `BLOCKED` / `NOT VERIFIED`; upload/OCR/request cannot become prescription authority | Any prescription success path or PMS integration |
| Task 05 patient, subject, delegate and recipient identity | Task 05 owner plus security/privacy, pharmacy and accessibility reviewers; actual named owner `PENDING` | `BLOCKED`; no Task 08 patient/delegate/recipient runtime | Protected patient workflow, choice management, pickup/delivery receipt, tracking |
| Task 07 communications runtime and producer/recipient contract | Task 07 owner plus Task 05, privacy/security and accessibility reviewers; actual named owner `PENDING` | `BLOCKED` / `NOT VERIFIED`; no Task 08 notification or secure-message runtime | Any real notice, consent/contact routing, receipt or tracking communication |
| Task 09 price, adjudication, payment, finance and claim ownership | Task 09/finance/payer/claim owners plus pharmacy, security/privacy and Task 11; actual named owner `PENDING` | `BLOCKED` / `NOT VERIFIED`; financial states remain orthogonal and cannot create claims | Real estimate, adjudication, payment, refund, financial reconciliation or claim integration |
| Pharmacy tenancy and patient choice | Lead/architecture/security owner plus product and pharmacy reviewers; actual named owner `PENDING` for any future change | Current invariant remains server-only `PHARMACY_ID`; patient choice is reversible intent, never tenant authority | Any multi-pharmacy or patient-selected production routing; current invariant cannot be bypassed |
| Professional scope, accreditation and Internet-site policy interpretation | Actual pharmacy/DM, professional, legal/regulatory and Task 11 reviewers; names `PENDING` | `NOT VERIFIED` / `BLOCKED`; Internet-site policy remains under review | Professional, release, delivery/return, pilot and production decisions |
| Vendor selection and contracts | Business/procurement, integration, privacy/security, accessibility, legal, operations and fact owner; names `PENDING` | No approved production PMS, inventory, payer/payment, courier, address, identity or notification vendor | Vendor-backed SYN where applicable, validation, pilot and production |
| Production integrations and external effects | Integration/fact owner, security/privacy, operations, professional/finance as applicable, Task 11; names `PENDING` | `BLOCKED`; no real integration or external effect authorized | All live external connections and effects |
| Exact Task 08 synthetic candidate and lifecycle | Coordinator/product, technical/security reviewers and applicable Task 11 reviewer; names `PENDING` | No approval granted here; Task 04 authority non-transferable | Any runnable Task 08 synthetic implementation or test |
| State/event/error, transaction, idempotency, audit and persistence contracts | Architecture/data/security/governance plus affected fact owners; names `PENDING` | Proposed only; no Task 08 schema/migration/audit change authorized | Any protected Task 08 persistence, worker, integration or command |
| Privacy, security, retention, incident, accessibility and operational policies | Applicable privacy/security, records, incident, accessibility, operations and Task 11 owners; names `PENDING` | `PENDING`, `BLOCKED`, or `NOT VERIFIED` by affected decision | Affected persistent/operational SYN and all validation/pilot/production |

Every row requires a separate approved decision record before its affected behavior becomes available. A blank review date, owner, status, or evidence reference means unresolved, not accepted.

## 6. Change management

### 6.1 Proposed change lifecycle

1. **Register the proposal.** Record change ID, author, purpose, exact files/contracts/behaviors, affected candidate/stage, dependencies, reversibility, requested authority, and explicit exclusions.
2. **Classify impact.** Map affected Workstreams, threat IDs, controls, tests, decision records, actors, data, states, professional/physical/financial effects, integrations, migrations/authentication, operations, and Task 11 gates.
3. **Assign owners and challengers.** Confirm accountable fact owner and independent required reviewers. Missing or conflicting ownership sets the change to `BLOCKED`.
4. **Review safety and authority.** Recheck AGENTS.md invariants, prescription/evidence, tenant, professional, custody/receipt, claim/payment, privacy, security, accessibility, retention/audit, failure and external-trust boundaries.
5. **Update design and evidence.** Supersede affected documents/contracts, update Requirement → Risk → Control → Test → Evidence traceability, and preserve prior rationale/history.
6. **Obtain stage-specific approval.** Only the correct owners may approve the exact candidate/scope. Approval for documentation does not authorize implementation; implementation does not authorize production.
7. **Implement and validate only if authorized.** Follow exact scope, stop conditions, production invariance, rollback/kill, environment and evidence capture. New conflicts stop the affected work.
8. **Review outcome and lifecycle.** Record results, deviations, residual risk, conditions, expiry/review triggers, operational ownership, challenge disposition and next gate. Do not silently widen approval.

### 6.2 Changes that always require explicit impact review

- actor, role, permission, identity, delegation, recipient, professional attribution or tenant/pharmacy authority;
- prescription evidence/validity, inventory, preparation/check/counselling/release, custody/proof/return, financial/claim, or derived-state logic;
- schema, migration, authentication/session, audit, retention/destruction, encryption/key, support/break-glass, backup/restore or incident behavior;
- external provider, SDK, credential, network path, webhook, queue/worker, idempotency/retry/reconciliation, tracking, notification or data recipient;
- data field, classification, client/API response, URL/identifier, log/metric/audit payload, retention trigger, accessibility behavior or public language;
- test expectation, synthetic fixture/scope, approval condition, stop/rollback/kill control, production-invariance boundary or Task 11 evidence.

### 6.3 Prohibited change behavior

No change may silently:

- convert patient choice into tenant authority or permit client/provider-selected pharmacy scope;
- convert request/upload/OCR/patient statement into prescription validity;
- assign professional authority to AgentRx, technician, admin, support, patient, courier, worker, webhook, alert, payment, or system status;
- merge preparation, professional release, READY, pickup, courier custody, recipient receipt, return, stock disposition, payment, or claim;
- weaken denial, evidence, version, idempotency, reconciliation, audit, privacy, accessibility or cross-tenant controls;
- treat a document review, merge, test PASS, lower gate, expired approval, emergency, or vendor statement as broader authority.

An urgent incident may invoke only a separately approved containment/kill/rollback procedure. It cannot bypass professional, privacy/security, evidence, audit, migration, or production gates. Any emergency action remains attributable and requires the approved post-action review; “emergency” does not create missing authority.

## 7. Escalation process

```text
Detection
   ↓
Review and safe containment
   ↓
Owner assignment and conflict check
   ↓
Decision by the correct authorized owner(s)
   ↓
Documentation, evidence, notification, and follow-up
```

| Trigger | Immediate response | Required owner path | Until resolved |
|---|---|---|---|
| Conflicting or missing ownership | Stop the affected decision; preserve alternatives and scope | Governance assigns the accountable domain owner; affected independent reviewers confirm their mandates | `BLOCKED`; no majority-vote or product/engineering default |
| Unresolved safety or professional concern | Prevent affected professional/physical advancement; preserve evidence without clinical rationale in technical surfaces | Actual pharmacy/DM/professional owner, safety/incident owner and legal/regulatory reviewer as applicable | Fail closed; AgentRx does not decide the concern |
| Security risk or control failure | Contain affected access/integration, revoke/kill only under approved authority, preserve minimized forensic evidence | Security owner with technical, privacy, vendor and Task 11 escalation as applicable | No weakened authorization, unsafe workaround, or sensitive ticket/log payload |
| Privacy concern or suspected disclosure | Stop affected collection/disclosure/export where safely authorized; restrict access; preserve minimized evidence | Privacy/security, records, legal and incident owners determine the approved process | No independent breach/reportability conclusion or broad data copy |
| Professional ambiguity or scope conflict | Block the affected check/release/exception/return decision | Actual authorized pharmacy/professional/DM and legal/regulatory owner | Missing professional truth remains pending/unknown, never system-inferred |
| Implementation blocker or dependency failure | Stop affected implementation; identify exact missing contract/evidence and safe independent work | Technical owner plus dependency owner, coordinator and applicable Gate 4/Task 11 reviewer | No invented interface, fixture authority, production import, or bypass |
| Contradictory external/physical/financial state | Preserve all observations, actual last-supported state and versions; open/retain reconciliation | Correct fact owner plus integration/operations and professional/finance owner as applicable | Unknown state remains blocked; no last-write-wins or blind retry |
| Reviewer disagreement or challenge | Record each position, evidence and conflict; avoid editing prior records | Governance routes to the owner(s) whose independent authority is required | The affected gate cannot pass until each mandatory concern has a documented disposition |

Escalation does not transfer professional, legal, privacy, security, financial, accessibility, vendor, or release authority to governance. If multiple independent approvals are required, one owner cannot overrule another owner's unresolved mandatory gate.

## 8. Traceability

The core governance chain is:

> **Threats (B) → Controls (K) → Tests (L) → Approval decisions and gates (M)**

Every material decision must retain its owner, evidence, rationale, status, dependency versions, scope, lifecycle and challenge history. The full chain is:

> **Requirement → Risk/threat → Control → Test obligation → Candidate-bound evidence → Owner/reviewer decision → Gate status → Operational follow-up**

| Design evidence | Governance use | Required M outcome |
|---|---|---|
| Workstream A current state, standards and dependencies | Prevent unsupported current-state or policy claims; identify blockers and source freshness | Owner and status for every dependency; source review remains visible |
| Workstream B threats and trust boundaries | Establish risk, asset, actor, entry point and residual-risk ownership | Threat/control owner; accepted/deferred risk only by the authorized owner |
| Workstream C professional/role matrices | Preserve actual professional accountability and unknown-role denial | Professional owner and role/transition decision; no runtime permission inferred |
| Workstream D proposed contracts/schema | Define fields, authority, privacy, concurrency, retention and persistence questions | Field/contract owners and explicit proposal status; no migration authority |
| Workstreams E–H workflows/states/custody | Define professional, physical, identity and fail-closed invariants | Applicable pharmacy/identity/operations decisions before affected success paths |
| Workstream I external/reconciliation | Define provider observation, idempotency, retry, finality and fact-owner boundaries | Approved provider contract and reconciliation owner before live integration |
| Workstream J operations | Define monitoring, incident, recovery, backup and ownership obligations | Runbook/threshold/owner/rehearsal evidence before affected stage |
| Workstream K controls | Map threats to identity, authorization, data, audit, vendor, privacy and security controls | Security/privacy owner disposition and stage-specific control evidence |
| Workstream L tests | Define how the exact candidate could demonstrate technical behavior and limitations | Candidate-bound evidence and independent review; PASS never grants another authority |

A broken or stale link in this chain blocks the affected gate. A changed threat, control, test, source, dependency, candidate, or owner invalidates downstream evidence until re-reviewed.

## 9. Governance test obligations

These are future validation scenarios only. No governance runtime, test, fixture, command, or PASS evidence exists here.

| ID | Scenario | Required future assertion |
|---|---|---|
| M-T01 | Missing owner | A material decision without one authorized accountable owner remains `BLOCKED`; a group label, AgentRx, vendor, test, or implementation author cannot substitute. |
| M-T02 | Missing approval evidence | Gate cannot pass without exact candidate/scope, required reviewers, source/test evidence, conditions and lifecycle. Document existence or verbal/blank evidence fails closed. |
| M-T03 | Conflicting decisions | Contradictory active records, reviewer outcomes, scopes, versions or fact owners are detected; affected action/gate remains blocked and both histories are preserved. |
| M-T04 | Outdated, expired, revoked or superseded approval | Changed candidate/dependency/source/contract or inactive lifecycle cannot authorize new action; prior evidence remains attributable and re-review is required. |
| M-T05 | Unauthorized change | A change outside approved files/scope/actor/stage or without required professional/privacy/security/Task 11 authority is rejected, recorded safely and causes no protected effect. |
| M-T06 | Unresolved blocker bypass | Defaults, omission, timeout, feature flag, role claim, emergency label, lower gate, test PASS or business priority cannot convert `PENDING`/`BLOCKED`/`NOT VERIFIED` into success. |
| M-T07 | Missing review or challenge evidence | Required independent reviewer/challenge/disposition absent means the affected gate cannot pass; no sensitive denial detail or hidden override is created. |
| M-T08 | Separation of duties | Author, implementer, technical reviewer, professional owner, privacy/security owner and production releaser retain their approved independent responsibilities; one identity cannot silently self-approve all layers. |
| M-T09 | Scope and tenant protection | Approval for one candidate, environment, pharmacy, operation, item/package, vendor, stage or time cannot be replayed cross-scope. Patient choice never supplies `PHARMACY_ID`. |
| M-T10 | Professional non-delegation | Governance, product, engineering, test results, system state, technician/admin/support, webhook or vendor cannot create professional acceptance, check, counselling, release, exception or return-disposition decisions. |
| M-T11 | Decision immutability and supersession | Amend/reject/revoke/expire/supersede appends attributable evidence; prior rationale, conditions, challenge and decision are not silently overwritten or deleted. |
| M-T12 | Gate independence | Passing architecture, security/privacy, professional, implementation or synthetic review does not automatically pass another gate or production readiness. |
| M-T13 | Change-impact traceability | A material contract/role/data/state/vendor/policy change identifies affected B–L artifacts, controls/tests/evidence, owners and re-review gates; stale downstream evidence is rejected. |
| M-T14 | Escalation | Each trigger follows Detection → Review/containment → Owner assignment → Decision → Documentation; unresolved multi-owner concerns remain blocked without authority transfer. |
| M-T15 | Task 04 and production isolation | Expired/non-transferable Task 04 records, production credentials/imports/databases, or unrelated approvals cannot authorize Task 08 synthetic or production action. |
| M-T16 | Privacy-safe governance evidence | Decision IDs, errors, metrics, tickets, evidence filenames, notifications and registers contain no PHI, prescription/clinical content, addresses/contact details, proof/payment data, tokens, secrets or unnecessary internal IDs. |

Future governance validation must use synthetic, non-PHI records and an exact approved scope. Technical automation may detect missing fields or incompatible statuses but cannot decide professional, regulatory, privacy, security, legal, financial, accessibility, vendor, or production acceptance.

## 10. Production blockers

| Blocker | Status in this framework | Blocks |
|---|---|---|
| Task 03 prescription evidence/PMS/professional-record ownership | `BLOCKED` / `NOT VERIFIED` | Prescription acceptance, transfer/refill/renewal authority, PMS integration |
| Task 05 patient/delegate/recipient identity and authorization | `BLOCKED` | Protected patient journeys, delegation, receipt, tracking |
| Task 07 communications runtime and contract | `BLOCKED` / `NOT VERIFIED` | Real notifications, secure messages, routing, delivery/receipt behavior |
| Task 09 price/adjudication/payment/financial/claim ownership | `BLOCKED` / `NOT VERIFIED` | Real financial integrations, finality and reconciliation; fulfilment never creates a claim |
| Task 11 checkpoints and independent production release | Required; not granted here | Applicable runnable synthetic checkpoint and every production/release decision |
| Exact Task 08 synthetic candidate/scope/lifecycle | Not granted here | Any runnable Task 08 synthetic implementation/test; Task 04 cannot substitute |
| Professional scope, registrant verification, accreditation and Internet-site review | `NOT VERIFIED` / `BLOCKED` | Professional/release, pilot and production success paths |
| Inventory/product/preparation/release/custody/proof/return policies | Proposed or unresolved | Affected synthetic success paths and all production behavior |
| Vendor/provider selection, contracts and finality | No approved production integration | Any live PMS, inventory, payer/payment, courier, address/identity or notification connection |
| Privacy/security, PIA/TRA, retention, audit, incident, accessibility and procurement | Pending applicable owners | Affected persistent/operational synthetic stage and all pilot/production promotion |
| Production schema/migration, authentication, secrets/keys and deployment | No authority granted | Every production data-path, authentication, infrastructure and deployment change |

No Gate 1–5 result, Task 08 implementation approval, synthetic execution approval, professional authorization, regulatory/legal approval, privacy/security approval, accessibility approval, vendor approval, migration approval, or production authorization is established by the completed documentation or this framework.

## 11. Explicit non-authorization statement

This document grants **no design approval, implementation approval, testing approval, synthetic-scope approval, professional or pharmacy authorization, regulatory/legal interpretation, compliance finding, privacy/security/accessibility/records/vendor/finance approval, schema or migration authorization, authentication change, infrastructure use, external integration, pilot, deployment, production readiness, or production authorization**.

It creates no runtime workflow, approval service, role, permission, user, credential, database record, audit event, governance action, test result, professional decision, real prescription, PHI flow, inventory/preparation/release, pickup/courier/delivery/return effect, adjudication/payment/claim, notification, vendor account, network call, monitoring, incident, retention rule, migration, or deployment. Unknown, stale, contradictory, unauthorized, expired, revoked, or unverified state remains fail-closed. Public intake remains zero-PHI; server-owned `PHARMACY_ID` remains authoritative; Task 04 remains non-authoritative; and all production Task 08 functionality remains blocked.
