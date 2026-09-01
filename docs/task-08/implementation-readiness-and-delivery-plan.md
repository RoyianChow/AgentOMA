# Task 08 — Implementation readiness and delivery plan

**Status:** PROPOSED READINESS CRITERIA AND DELIVERY PLAN ONLY — NO IMPLEMENTATION OR PRODUCTION AUTHORIZATION.

This document defines what would need to be true before an affected Task 08 implementation slice could safely begin, progress, or be considered for a later gate. It does not authorize implementation, tests, infrastructure, schema work, migration generation or execution, authentication changes, integrations, pilot use, deployment, or production. It does not replace pharmacy/professional, legal/regulatory, privacy/security, accessibility, records, vendor/procurement, finance/payer, governance, or Task 11 review, and it proves no compliance or production readiness.

The plan is grounded in [AGENTS.md](../../AGENTS.md), the [Task 08 specification](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), and completed Task 08 Workstreams A–M:

- Workstream A: [current state and gaps](./current-state-and-gap-analysis.md), [Ontario standards mapping](./ontario-fulfilment-standards-and-policy-mapping.md), and [dependency/decision register](./production-dependency-and-decision-register.md);
- Workstream B: [threat model](./fulfilment-threat-model.md) and [trust boundaries/data flows](./trust-boundaries-and-data-flows.md);
- Workstream C: [professional responsibility](./professional-responsibility-matrix.md) and [transition authorization](./role-and-transition-authorization-matrix.md);
- Workstream D: [contracts and conceptual schema](./fulfilment-contracts-and-schema-proposal.md);
- Workstreams E–H: [request/evidence](./request-and-prescription-evidence-workflow.md), [pharmacy choice](./pharmacy-choice-and-transfer-boundary.md), [orthogonal state](./orthogonal-state-model-and-state-machine.md), [inventory/release](./inventory-preparation-and-release-workflow.md), and [pickup/delivery/return](./pickup-delivery-custody-and-handoff-workflow.md);
- Workstreams I–M: [integration/reconciliation](./external-integrations-webhooks-and-reconciliation.md), [operational readiness](./operational-readiness-and-observability.md), [security/privacy](./security-privacy-and-compliance-controls.md), [testing/validation](./testing-and-validation-framework.md), and [governance/review gates](./governance-and-review-gates-framework.md).

The “Workstream N” label identifies this bounded planning document. It does not rename the specification's workstreams, mark a phase complete, or grant a Gate 4 implementation-readiness result.

Four categories remain separate:

1. **CURRENT:** existing production-oriented assessment, advisory claim-draft, audit, and governance behavior; none is a Task 08 fulfilment runtime.
2. **EXISTING SYNTHETIC / EXPERIMENTAL:** Task 01 safeguards and Task 04 patterns are study material only. Task 04 authority is expired/non-transferable and cannot authorize Task 08.
3. **PROPOSED TASK 08:** all contracts, readiness criteria, phases, tasks, blockers, and evidence described below.
4. **PRODUCTION-BLOCKED:** every real prescription, patient/delegate/recipient identity flow, inventory or preparation effect, professional release, pickup/courier/delivery/return effect, adjudication/payment/claim, notification, vendor integration, schema/authentication change, or deployment.

## 1. Readiness principles

1. **Implement only approved scope.** An implementation task must identify the exact candidate, files, environment, allowed behavior/effects, excluded behavior, dependencies, owners, lifecycle, stop conditions, rollback/kill path, tests and evidence. Approval cannot be inferred from this plan.
2. **Preserve authority boundaries.** A request is not an order or prescription; upload/OCR/patient statement is evidence only; patient choice is not tenant authority; AgentRx does not make professional decisions; inventory/preparation/payment does not authorize release; courier custody is not patient receipt; fulfilment never creates a claim.
3. **Resolve applicable blocking dependencies first.** A missing Task 03/05/07/09, professional, policy, vendor, privacy/security, or Task 11 decision blocks every success path that consumes it. Do not invent an adapter, role, fixture, default, or status to bypass the owner.
4. **Maintain end-to-end traceability.** Every implementation task must link requirement, design version, risk, control, test obligation, owner, dependency, gate, candidate and evidence. A changed upstream decision makes downstream evidence stale until re-reviewed.
5. **Avoid premature production assumptions.** Synthetic references, no-network doubles, conceptual schemas, provider-shaped interfaces, technical PASS results and local infrastructure do not establish real authority, finality, scale, operations, compliance, or production readiness.
6. **Separate documentation from implementation.** A reviewed or committed document does not authorize code. Design completeness, implementation readiness, synthetic execution, validation acceptance, professional approval and production approval remain different decisions.
7. **Fail closed on uncertainty.** Missing owner, stale approval, contradictory contract, unknown external outcome, unavailable identity, unverified professional scope, ambiguous custody, or incomplete evidence blocks only the affected action while preserving known facts and safe independent work.
8. **Deliver in independently reviewable slices.** Each slice must have one bounded purpose, minimal dependencies, explicit negative behavior, no hidden cross-task ownership, and a separately reviewable diff/evidence package.
9. **Protect current production invariants.** Public intake remains zero-PHI; server-only `PHARMACY_ID` selects the one pharmacy; existing billing/audit/triage/reference/retention and protected task boundaries are unchanged unless separately authorized by their owners.
10. **No phase completion by declaration.** Entry, exit and evidence criteria must be independently assessed for the exact candidate. A status, checklist, merge, elapsed time or lower gate cannot substitute.

Only blockers applicable to an affected slice and stage must be resolved. Independent documentation/design may continue while production-only dependencies remain blocked. Any runnable synthetic slice still requires exact synthetic-scope/candidate/lifecycle approval and the applicable Task 11 checkpoint.

## 2. Readiness categories

No category below is currently declared ready. The criteria are proposed and must be assessed against the exact future slice.

### 2.1 Product and workflow readiness

| Area | Required clarity before affected implementation | Fail-closed evidence of not ready |
|---|---|---|
| Request workflow | Supported request types, actor/subject relationship, purpose, strict inputs, state/version rules, cancellation/clarification behavior, owner and minimized outputs | Request is described as order/prescription; Task 05 identity assumed; unknown type or incomplete evidence allowed to progress |
| Prescription evidence | Accepted evidence sources, provenance/integrity, storage/retention, professional review owner, clarification/rejection/supersession, Task 03/PMS boundary | Upload/OCR/patient statement/transfer/refill/renewal request establishes prescription validity or professional result |
| Pharmacy choice | Neutral information, explicit reversible choice, change/transfer process and conflict/accreditation review, while server-owned tenant scope stays separate | Preselection/steering or client/session/QR/provider choice changes `PHARMACY_ID` |
| Inventory | Estimate versus authoritative confirmation, source/version/freshness, product/quantity, reservation, recall/quarantine/expiry/storage/integrity, conflicts and owner | Estimate/on-hand-only/unknown source authorizes preparation, substitute, READY, release or promise |
| Preparation and technical check | G08 authority, task assignment, item/version/evidence, failure/rework, technical versus professional check, multi-item independence | Completion implies clinical approval, counselling, release or another item's success |
| Professional check and release | Actual actor/scope/assignment, authoritative inputs, G09–G13 evidence, counselling applicability, revocation, audit, policy and current versions | AgentRx, technician/admin, payment, preparation, notification or system state creates professional decision/release |
| Pickup and delivery | Mode/plan, package manifest, release/readiness, Task 05 recipient, address/assignment, custody, proof, failure/exception and package-specific completion | Courier custody/event or code/link/contact possession establishes recipient authority or receipt |
| Returns | Failed-delivery path, actual holder, correct-pharmacy receipt, delay/wrong-destination handling, segregation, disposition owner, finance/claim separation | Failed delivery becomes receipt; return auto-restocks, restores saleability, reverses money or creates claim |

Each workflow requires defined owners, valid/invalid transitions, prerequisites, evidence, exceptions, state-version/idempotency rules, audit requirements, privacy boundaries, accessible alternatives, operational failures and unresolved-policy references. A `PENDING`, `BLOCKED`, `NOT VERIFIED`, contradictory or unknown policy is represented as unavailable—not guessed into a positive case.

### 2.2 Technical readiness

An affected technical slice is ready for implementation review only when:

- the architecture and trust boundaries are accepted for that scope under Gate 1;
- server-owned actor, subject, pharmacy/tenant, assignment, approval/lifecycle and trusted-time sources are identified without browser/provider authority;
- strict request/response, state/event/error, reference and safe-error contracts are versioned and owned;
- dependencies and allowed imports are known, with direct/transitive architecture boundaries and no production/Task 04 authority reuse;
- transaction ownership, isolation/lock ordering, compare-and-set versions, idempotency projection/lifetime, retry classification, uncertain-commit behavior, inbox/outbox, reconciliation and audit atomicity are defined where applicable;
- failure, rollback/kill, cancellation, recovery, no-egress, privacy and production-invariance behavior is specified;
- integrations are either explicitly unavailable or defined through approved deny-only synthetic adapters; no real SDK, endpoint, account or credential is assumed; and
- exact errors, limits, clocks, pagination/bounds and operational thresholds are approved or the affected positive behavior remains unavailable.

None of these requirements is claimed to exist in production for Task 08. Existing root or Task 04 implementation patterns may inform design but do not supply authority, compatibility or readiness evidence.

### 2.3 Data and schema readiness

The [Workstream D mapping](./fulfilment-contracts-and-schema-proposal.md) is **conceptual only**. No Task 08 schema or migration exists, has been generated, reviewed, applied or authorized.

Before any affected persistence implementation:

- D01–D44 field contracts and shared envelopes must be reviewed by their fact, privacy/security, professional, finance, records and integration owners as applicable;
- every field must have source of truth, classification, necessity, scope, authorized readers/writers, integrity/version rules, null semantics, retention/hold/backup/destruction owner, audit treatment and safe output projection;
- identities and opaque references must remain separate from authorization; tenant-safe relationships must bind server-owned pharmacy scope;
- item/package cardinality, item-specific storage requirements, package-specific proof, immutable/superseding history and orthogonal mutable heads must be internally consistent;
- uniqueness, foreign keys, check constraints, indexes, bounded work access, concurrency, deletion/immutability and migration/rollback/restore effects must be reviewed;
- schema ownership and overlap with Tasks 02/03/05/07/09/11 and existing production data must be explicitly resolved;
- a migration plan must identify exact approved tooling, candidate, generated SQL review, data/backfill impact, locks/downtime, tenant isolation, rollback/forward recovery, backup/restore and independent Task 11 evidence; and
- production schema authority and lead sign-off must exist before touching `src/lib/db/migrations/` or production Drizzle schema.

No production migration is proposed by this document. `db:push` remains banned by AGENTS.md and must never be used or suggested.

### 2.4 Security and privacy readiness

Required before an affected protected or persistent slice:

- Task 05 identity/session/delegation/recipient contract where patient/delegate access is involved;
- operation-specific server-enforced authorization, tenant isolation, professional attribution and revocation/expiry at every protected boundary;
- minimum-necessary data inventory and purpose, disclosure, client/cache/URL/log/metric/audit/outbox/notification/vendor restrictions;
- Gate 2 threat/control review, PIA/TRA inputs and decisions where applicable, with approved encryption/key/secret/support/break-glass/vendor controls;
- raw-byte-before-parse, strict schemas, opaque non-authorizing references, rate/abuse/enumeration controls and safe generic errors;
- approved audit catalogue and denied-attempt contract, separate from technical telemetry, with integrity/access/retention ownership;
- field-level retention, legal/record hold, backup/restore, deletion/destruction, incident and vendor-exit decisions; and
- accessibility/privacy-compatible alternatives that do not weaken identity, recipient, custody or professional safeguards.

No production security, privacy, PIA, TRA, identity, authorization, audit, retention, accessibility or compliance approval exists for Task 08.

### 2.5 Testing readiness

Before test implementation or execution for a future runnable slice:

- the [Workstream L strategy](./testing-and-validation-framework.md) and affected test obligations are accepted for the exact scope;
- engineering, pharmacy/professional, privacy/security, accessibility, operations, integration/vendor, records, finance and Task 11 test/review ownership is assigned as applicable;
- deterministic visibly synthetic identities/records, fixed clocks, no-network doubles, database isolation, lifecycle/expiry/revocation and cleanup/destruction strategy are approved;
- positive, negative, stale, revoked, cross-scope, rollback, malformed-replay, privacy-sentinel, accessibility and failure-recovery acceptance criteria are derived independently from approved contracts;
- persistence/money/concurrency tests use later-approved isolated real PostgreSQL, independent connections/barriers and committed-state assertions rather than mocks presented as proof;
- exact commands, environment allowlist, expected artifacts, candidate/hash capture, evidence storage and reviewer disposition are defined; and
- limitations are explicit: synthetic tests cannot establish professional competence, physical custody, vendor finality, compliance or production readiness.

No Task 08 automated test is implemented, run or passed by this document.

### 2.6 Operational readiness

Before the affected operational or production stage, owners must approve and rehearse:

- technical, workflow, reconciliation and audit evidence separation;
- minimum-data logs/traces/metrics, telemetry health, dashboards, thresholds, alert routing, ownership/backup, acknowledgement, escalation and suppression;
- application, database, dependency, webhook, worker/queue, reconciliation, notification, courier/custody, payment, audit and telemetry failure behavior;
- idempotent retry/replay, lease/fencing, dead-letter/poison handling, unknown-commit reconciliation and rollback/kill controls;
- incident Detection → Containment → Investigation → Resolution/Recovery → Review, including professional/privacy/security/vendor/finance escalation;
- backup, restore, schema/contract compatibility, idempotency/inbox/outbox fencing, external reconciliation, RPO/RTO and business-continuity ownership;
- support/break-glass, privileged/vendor access, credential/key lifecycle, deployment rollback and vendor exit; and
- accessible degraded/manual alternatives that do not invent authority or expose PHI.

No production Task 08 monitoring, alerting, on-call, runbook, worker/queue, backup coverage, restore evidence, RPO/RTO, SLA/SLO, support model or operational approval exists.

### 2.7 Governance readiness

Gate 4 implementation readiness requires the [Workstream M framework](./governance-and-review-gates-framework.md) to be applied to the exact slice:

- one accountable owner per decision scope, required independent reviewers and challenge/escalation path;
- current decision records with evidence, rationale, dependencies, impact, candidate, conditions, lifecycle and explicit exclusions;
- applicable Gate 1–3 evidence, exact implementation/synthetic approval and Task 11 checkpoint;
- no unresolved mandatory stop condition consumed by a success path;
- change-impact and traceability mapping across Workstreams A–M;
- rollback/kill, evidence capture, review-due/expiry/revocation and supersession process; and
- explicit gate result by authorized reviewers—never inferred from this document, a merge or a lower gate.

No Task 08 governance gate or implementation-readiness approval is recorded as passed here.

## 3. Dependency map

“Required before implementation” means before the **affected runnable slice**, not before unrelated documentation/design. A dependency may be represented by a strict unavailable/blocked negative path without inventing its positive behavior, but it cannot be bypassed in a success path.

| Dependency | Accountable owner/reviewers | Current status | Impact | Required before implementation? |
|---|---|---|---|---|
| Task 03 prescription/PMS/professional-record ownership | Task 03 owner plus pharmacy/professional, records, integration and privacy/security; named owner `PENDING` | `BLOCKED` / `NOT VERIFIED` | Prescription evidence source, review, refill/renewal/transfer and PMS authority unavailable | **Yes** before any success path consuming prescription/PMS authority; no for independent docs or deny-only boundary tests |
| Task 05 identity, session, delegation and recipient authorization | Task 05 owner plus privacy/security, pharmacy and accessibility; named owner `PENDING` | `BLOCKED` | No authenticated patient/delegate/recipient authority or protected tracking | **Yes** before protected patient/delegate/recipient success paths; no for strict unavailable-state tests |
| Task 07 communications | Task 07 owner plus Task 05, privacy/security and accessibility; named owner `PENDING` | `BLOCKED` / `NOT VERIFIED` | No approved contact/consent, notification, secure message, provider or receipt runtime | **Yes** before any real communication path; no for minimized intent contract design/no-network negative tests |
| Task 09 finance/payer/payment/claim ownership | Task 09, finance/payer/claim owners plus pharmacy, privacy/security and Task 11; names `PENDING` | `BLOCKED` / `NOT VERIFIED` | Price/adjudication/payment/refund/finality/reconciliation unavailable; fulfilment cannot create claims | **Yes** before financial success/integration; no for orthogonality and zero-claim negative tests |
| Task 11 checkpoints and release gates | Task 11 independent reviewer plus applicable owners; names `PENDING` | Required; no Task 08 gate passed | Candidate evidence, protected boundaries, vendors, feature gates, production invariance and release control unavailable | **Yes** at each applicable runnable synthetic, validation and production stage |
| Exact Task 08 synthetic scope/candidate/lifecycle | Coordinator/product, technical/security and Task 11 reviewers; names `PENDING` | Not granted; Task 04 non-transferable | No Task 08 runtime, fixtures, database, commands or evidence capture authorized | **Yes** before any runnable synthetic implementation or test |
| Pharmacy tenancy model and patient choice | Lead/architecture/security plus product/pharmacy; named owner `PENDING` for any change | Current one-pharmacy server-only `PHARMACY_ID` invariant; future model unresolved | Patient choice cannot route tenant; multi-pharmacy behavior unavailable | Current invariant is mandatory for every slice; **yes** before any proposed change/multi-pharmacy implementation with explicit lead authorization |
| Professional scope, policies, accreditation and Internet-site interpretation | Actual pharmacy/DM/professional and legal/regulatory owners; names `PENDING` | `BLOCKED` / `NOT VERIFIED` | Prescription, product, preparation, counselling, release, delivery/return and pilot/production success policy unavailable | **Yes** before affected professional success simulation and every pilot/production path |
| Contract/state/event/error/audit/transaction decisions | Technical/data/security/governance plus affected fact owners; names `PENDING` | Proposed only | No approved runnable command, persistence, idempotency, concurrency or audit contract | **Yes** before each affected implementation; exact subset may be approved per slice |
| Task 08 data/schema and migration ownership | Lead/data/records/security plus overlapping Task owners and Task 11; names `PENDING` | Conceptual D01–D44 only; **no Task 08 migration exists** | Persistent model, constraints, indexes, migration/rollback/restore unavailable | **Yes** before persistent implementation; separate lead sign-off before protected production schema/migrations |
| Vendor/provider selection and contracts | Business/procurement, integration, privacy/security, accessibility, legal, operations and fact owner; names `PENDING` | No approved production PMS, inventory, payer/payment, courier, address/identity or notification vendor | Protocol, finality, authentication, retry, retention, incident, support and exit unknown | **Yes** before vendor-backed behavior; no for approved deterministic no-network deny-only adapter design |
| Security/privacy/PIA/TRA | Privacy/security plus data/fact owners and Task 11; names `PENDING` | Proposed controls only; production approval absent | Identity/access, data fields, encryption/keys, vendors, support, tracking and incident not approved | **Yes** before affected protected/persistent SYN and all validation/pilot/production stages |
| Retention/audit/incident/accessibility/operations | Records/governance, audit, incident, accessibility, operations and Task 11; names `PENDING` | `PENDING`, `BLOCKED` or `NOT VERIFIED` by decision | Evidence lifecycle, denial audit, recovery, support and accessible alternatives incomplete | **Yes** before affected persistence/operations and all pilot/production stages |
| Production integration/deployment authority | Fact owners, operations/platform, security/privacy, professional/finance/vendor owners and Task 11 | `BLOCKED`; none exists | No real endpoint, SDK, credential, account, external effect, hosted Task 08 runtime or deployment | **Yes** before any live integration, pilot or production effect |

Dependency statuses must be revalidated at the exact future candidate. An owner name, decision date, contract version, review date, expiry or result not recorded in authoritative evidence remains `PENDING` or `NOT VERIFIED`; this plan invents none.

## 4. Implementation phases

No phase is completed, started or authorized by this plan. Phases describe ordering and gate expectations; a phase may be split into smaller independently approved slices.

| Phase | Proposed purpose and permitted scope | Entry criteria | Exit evidence | Stop conditions |
|---|---|---|---|---|
| Phase 0 — Design validation | Review Workstreams A–N; resolve exact slice, owners, source authority, decisions, contracts, risks, controls, tests and exclusions; no runtime | Documentation authority only; current repository evidence; no external/PHI action | Candidate-specific requirement/design/dependency/traceability review; applicable Gate 1–3 disposition; unresolved items explicitly blocked/deferred | Contradictory authority, missing owner, unsupported current-state claim, hidden production assumption, mandatory stop condition omitted |
| Phase 1 — Foundation implementation | After exact approval, minimal synthetic-only pure contracts/guards/safe errors/authoritative-context interfaces and, only if separately approved, isolated synthetic persistence foundations; no workflow success or external effect | Gate 4 for exact slice; synthetic scope/lifecycle; strict contracts; no-egress/production invariance; applicable Task 11 checkpoint | Type/lint/unit/architecture and later-approved persistence/security evidence for exact candidate; zero production files/systems outside scope | Production import/credential/data, Task 04 authority reuse, unapproved migration/auth/audit, client scope/time/role authority, missing rollback/expiry |
| Phase 2 — Workflow implementation | Bounded synthetic request/evidence, inventory, preparation/release, pickup/delivery/return negative and approved positive paths, each fact-owner controlled | Phase 1 evidence plus every consumed Task 03/05/professional/policy/contract decision and per-slice Gate 3/4 approval | State/workflow/concurrency/privacy/accessibility evidence; professional decisions remain externally supplied synthetic references; no physical/financial effect | Guessing prescription/identity/professional/inventory/recipient/custody/return policy; one dimension creates another; unknown state advances |
| Phase 3 — Integration implementation | Start with approved deterministic no-network adapters and reconciliation; real integrations only under separate future production-capable authority | Approved operation-specific contract, vendor/source owner, security/privacy, credentials/network/environment, retry/finality/reconciliation and Task 11 evidence | Adapter/webhook/idempotency/reconciliation/outage evidence; source remains observation until fact-owner acceptance; vendor/human review | Unapproved SDK/account/network/recipient; blind retry; webhook creates protected state; missing vendor/privacy/security/procurement authority |
| Phase 4 — Validation | Execute exact approved Workstream L unit/integration/E2E/security/operational plan using synthetic data and candidate-bound evidence | Approved candidate/environment/fixtures/commands; test owners; applicable dependencies/gates; isolated infrastructure | Results, limitations, failures/remediation, independent professional/privacy/security/accessibility/operations/vendor/finance review as applicable | Real PHI/prescription/effect, flaky or mirrored evidence, mocked money/state rule claimed as proof, stale candidate, failed mandatory control |
| Phase 5 — Production readiness review | Assess—not assume—operations, support, monitoring, incident/recovery, backup/restore, vendor/contracts, migration/deployment, accessibility, professional, regulatory, privacy/security, finance and Task 11 evidence | Exact release candidate; prior gate evidence; every applicable production decision and owner assigned | Gate 5 decision for exact scope with conditions, lifecycle, rollback/kill and explicit remaining blockers; no automatic deployment | Any unresolved Task 08 mandatory stop condition, owner/approval/evidence gap, policy under review, uncertain integration/finality or unapproved schema/auth/deployment |

### 4.1 Slice rules

Every implementation slice must:

- have one primary outcome and a closed file/module boundary;
- list included and excluded states, actors, data, integrations and effects;
- identify dependencies as consumed, unavailable, stubbed only under approval, or not applicable;
- enforce negative behavior before adding an approved positive path;
- contain no PHI, real prescription, live vendor, production credential or hidden external effect;
- define safe errors, authorization, tenant scope, trusted time, version/idempotency, audit/privacy and cleanup behavior where applicable;
- include acceptance and stop criteria, rollback/kill, evidence commands and independent reviewers; and
- stop rather than widen scope when an implementation defect exposes a missing decision or cross-task ownership conflict.

Parallel slices may proceed only when their data, ownership, migration, state, lock, event/error and review boundaries are demonstrably independent. Shared contracts or schemas require an explicit integration owner and sequencing decision.

## 5. Blocker management

### 5.1 Blocker record

| Field | Requirement |
|---|---|
| Blocker ID and version | Stable identifier with append-only/superseding history. |
| Detected condition | Exact missing, stale, contradictory, failed or unauthorized requirement; no sensitive payload. |
| Affected scope/phase | Candidate, files, behavior, actor, data, dependency and phase/gate blocked. |
| Accountable owner | Correct domain owner and backup; `PENDING` when unassigned, which itself remains blocking. |
| Impact | Safety, professional, privacy/security, accessibility, technical, operational, financial, vendor, records and schedule consequences. |
| Resolution criteria | Specific authority/evidence/contract/control/test needed; no vague “team agreement.” |
| Safe work allowed | Independent documentation, denied-state tests or unrelated slices that do not consume the blocker. |
| Escalation path | Governance routing plus required fact, professional, privacy/security, legal, finance/vendor or Task 11 owners. |
| Status/lifecycle | `OPEN`, `IN_REVIEW`, `BLOCKED`, `DEFERRED`, `RESOLVED_FOR_SCOPE`, `REOPENED`, `EXPIRED` or `SUPERSEDED`; exact time and reviewer evidence when set. |
| Traceability | Requirement, decision, risk, control, test and delivery-task references invalidated or awaiting evidence. |

### 5.2 Process

1. Detect and record the blocker without copying PHI, prescription/clinical content, credentials or other protected payloads.
2. Stop the affected success path and preserve current known state/evidence; unknown outcomes enter reconciliation where applicable.
3. Assign the correct owner and independent reviewers. Product or engineering cannot assume professional/privacy/security/finance authority.
4. Classify affected phases, slices and dependencies; identify safe independent work rather than applying a blanket halt.
5. Define objective resolution and revalidation criteria, candidate scope and lifecycle.
6. Escalate unresolved ownership, safety, security, privacy, professional, vendor or implementation conflicts through Workstream M.
7. Resolve only when the authoritative record and required evidence are accepted for the exact scope; update traceability and re-review stale downstream work.
8. Preserve blocker and resolution history. Reopen on changed evidence, source, candidate, contract, owner, incident, expiry or contradiction.

### 5.3 Anti-bypass controls

The following never resolve a blocker:

- coding around an absent owner or dependency;
- inventing an interface, rule, threshold, role, approval, fixture authority, vendor behavior or professional decision;
- representing `PENDING`, `NOT VERIFIED`, timeout, empty result, warning, TODO or feature flag as success;
- importing Task 04/production modules or broadening current auth/tenant/public-intake boundaries;
- using client/session/QR/provider input for pharmacy, actor, role, subject, state, time, capacity, product, recipient, release or approval authority;
- merging documentation, passing unrelated tests, accepting business risk, or applying emergency language as cross-domain approval; or
- suppressing the blocker from a status report, backlog, UI or evidence package.

## 6. Traceability

The delivery chain is:

> **Requirement → Workstream design → Risk/threat → Control → Test obligation → Implementation task → Candidate evidence → Governance gate**

| Workstream evidence | Implementation-planning use | Required delivery linkage |
|---|---|---|
| A — Current state, standards, dependencies | Distinguish current, synthetic, proposed and production-blocked behavior | Source path/version, gap, dependency, blocker and affected phase |
| B — Threats and trust boundaries | Identify assets, actors, entry points, risks and external/professional boundaries | Threat ID, preventive/detective/response controls and residual-risk owner |
| C — Responsibility and transition authorization | Preserve actual professional and role authority | Gate/transition ID, actor mapping, required evidence and owner; unknown role denial |
| D — Contracts and conceptual schema | Define strict fields, sources, privacy, lifecycle, concurrency and persistence proposal | Contract/field version, source owner, schema decision, migration status and tests |
| E — Request/evidence and pharmacy choice | Keep request/evidence/choice non-authoritative | Workflow requirement, Task 03/05/tenant dependency and negative behavior |
| F — Orthogonal state model | Prevent universal status and invalid cross-dimension effects | State/transition/guard/version, invalid edges and reconciliation behavior |
| G — Inventory/preparation/professional release | Separate inventory/technical facts from professional G08–G13 decisions | Fact-owner evidence, G-gate version, release/READY distinction and tests |
| H — Pickup/delivery/custody/return | Preserve recipient, package proof, custody and disposition boundaries | Package/plan/grant/proof/return guards, Task 05/vendor dependencies and races |
| I — External integrations/reconciliation | Keep provider facts observational and retries safe | Operation/event contract, source/finality owner, inbox/idempotency/reconciliation tests |
| J — Operations | Define failure, monitoring, incident, recovery, support and continuity | Runbook/metric/alert/recovery owner, threshold decision, rehearsal evidence |
| K — Security/privacy controls | Map identity, authorization, data, audit, integration and privacy controls | Control ID, data field/surface, owner, threat mapping and verification |
| L — Testing framework | Define independent proof and limitations | Test ID/level/fixture/environment/candidate/result/reviewer; no authority inferred |
| M — Governance gates | Define owners, decisions, challenges and stage approval | Decision/gate ID, scope, lifecycle, dependencies and unresolved blocker disposition |

Each future delivery ticket must cite the exact versions it consumes. A changed upstream source, decision, owner, contract, control, test or candidate invalidates affected downstream readiness until reviewed. Implementation code must not become the undocumented source of a healthcare, identity, tenant, financial, privacy or professional rule.

## 7. Delivery risks

| Risk | Consequence | Required mitigation/owner | Delivery effect while unresolved |
|---|---|---|---|
| Unclear or conflicting ownership | Engineering/product/vendor silently decides professional, identity, finance, privacy or custody truth | Workstream M decision owner/challenger assignment and preserved conflict; governance plus domain owners | Block affected slice; independent work only |
| Premature implementation | Code encodes guessed rules, creates unsafe migration/integration coupling or is mistaken for readiness | Exact Gate 4 scope, dependency review, negative-first slice and production invariance; technical/governance/Task 11 | No runnable work without approval |
| Missing Task 05 identity model | Wrong actor/subject/delegate/recipient, enumeration or unauthorized disclosure/handoff | Task 05, privacy/security, pharmacy and accessibility contract | Protected patient, recipient, receipt and tracking success blocked |
| Prescription/PMS ownership uncertainty | Upload/OCR/request becomes prescription or professional truth | Task 03 and pharmacy/professional source/record decision | Prescription acceptance and PMS success blocked |
| Integration/vendor uncertainty | Spoof/replay, unknown finality, blind retry, excessive disclosure, lock-in or outage failure | Operation-specific contract, vendor/procurement/security/privacy/operations owner, reconciliation | Live integration blocked; only approved no-network negative/double work |
| Policy/professional ambiguity | Unsafe inventory, preparation, counselling, release, delivery, exception or return disposition | Pharmacy/DM/professional and legal/regulatory review; no AgentRx inference | Affected professional/physical positive path blocked |
| Tenant/pharmacy-choice conflict | Cross-tenant access or patient-controlled routing | Preserve server-only `PHARMACY_ID`; explicit lead/architecture/security decision for any change | Multi-pharmacy/patient-routed implementation blocked |
| Security/privacy gap | PHI/secret leakage, privilege escalation, unsafe vendor/support access, missing evidence lifecycle | Gate 2, K controls, PIA/TRA and data/retention/incident owners | Affected protected/persistent slice blocked |
| Schema/concurrency uncertainty | Lost updates, broken tenant isolation, duplicate external/financial/physical effects, irrecoverable migration | Reviewed contracts, real PostgreSQL tests, lock/version/idempotency/reconciliation and migration/restore plan | Persistent success path blocked |
| Insufficient or mirrored testing | False confidence; races, rollback, privacy or invalid states unproven | Workstream L, independent expected outcomes, real database barriers and human/vendor validation | Gate 4/5 cannot pass |
| Operational/support gap | Silent stuck states, unsafe recovery, duplicate effects, lost evidence or inaccessible fallback | Workstream J owners, runbooks, monitoring/incident/recovery/backup rehearsals | Pilot/production blocked; affected operational SYN blocked where required |
| Scope creep/cross-task modification | Protected Task 01/02/03/04/05/07/09/11 or billing/audit behavior changes without owner | Slice file allowlist, architecture tests, diff review, explicit handoff and stop condition | Stop and obtain owner approval |
| Synthetic-to-production promotion error | Fake identities/decisions/custody/finality treated as real authority | Exact environment/lifecycle/kill, Task 11, no-egress/production-invariance and governance evidence | No promotion; production remains blocked |

Schedule pressure, sunk cost, a demo deadline, a clean build or technical test PASS does not reduce these risks or grant authority. Delivery reporting must state blocked paths and evidence limitations honestly.

## 8. Production blockers

The following remain production-blocking and are not resolved by this plan:

| Blocker | Current state | Required before affected production stage |
|---|---|---|
| Task 03 prescription/PMS authority | `BLOCKED` / `NOT VERIFIED` | Actual source/record owner, contract, professional review and integration evidence |
| Task 05 patient/delegate/recipient identity | `BLOCKED` | Approved identity/session/relationship/assurance/revocation and protected access model |
| Task 07 communications | `BLOCKED` / `NOT VERIFIED` | Approved contact/consent/audience/provider/notice/secure-message contract and runtime evidence |
| Task 09 finance/payer/payment/claims | `BLOCKED` / `NOT VERIFIED` | Actual owners, finality/reversal/reconciliation contract; claims remain outside fulfilment authority |
| Task 11 quality/security/release gates | Required, not passed here | Exact candidate checkpoint, independent evidence and production release decision |
| Pharmacy/professional/regulatory policy | `NOT VERIFIED` / `BLOCKED` | Accreditation/Internet-site, scope, registrant, preparation/release/custody/return and applicable legal/professional review |
| Task 08 schema and migration | No schema/migration exists or is authorized | Approved model, migration SQL/data/lock/rollback/restore review, lead sign-off and Task 11 evidence |
| Security/privacy/accessibility/records | Proposed only | PIA/TRA, minimum fields, keys/access, retention/hold/destruction, incident, accessibility and independent approvals |
| Vendors and production integrations | None approved | Selection, contracts, source/finality, credentials/network, privacy/security/accessibility/procurement/operations and reconciliation evidence |
| Monitoring, incident, support and recovery | No production Task 08 capability | Approved owners, thresholds, runbooks, alerts, rollback/kill, backup/restore and rehearsals |
| Production deployment and authentication | No authority or Task 08 runtime | Approved candidate, infrastructure, secrets, authentication/protected routes, migration/deployment/rollback and Gate 5 decision |

No Task 08 runtime, production implementation, Task 08 migration, production integration, implemented test suite, production monitoring or implementation approval is established in the current repository by this document. Existing assessment, claim-draft, audit, governance and Task 04 code must not be described as Task 08 implementation.

## 9. Explicit non-authorization statement

This document grants **no design approval, implementation approval, test implementation/execution, synthetic-scope approval, professional or pharmacy authorization, regulatory/legal interpretation, compliance finding, privacy/security/accessibility/records/vendor/finance approval, schema or migration authorization, authentication change, infrastructure use, external integration, pilot, deployment, production readiness or production authorization**.

It creates no code, schema, migration, route, action, worker, queue, webhook, database, fixture, test, approval record, role, permission, user, credential, secret, vendor account, network call, real prescription, PHI flow, inventory/preparation/release, pickup/courier/delivery/return effect, adjudication/payment/claim, notification, monitoring, incident, retention rule or deployment. Unknown, stale, contradictory, unauthorized, expired, revoked or unverified state remains fail-closed. Public intake remains zero-PHI; server-only `PHARMACY_ID` remains authoritative; Task 04 remains non-authoritative; and every production Task 08 capability remains blocked.
