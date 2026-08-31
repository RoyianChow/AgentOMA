# Task 08 — Fulfilment contracts and schema proposal

**Status: WORKSTREAM D DOCUMENTATION / PROPOSED DESIGN ONLY. No implementation, migration, professional approval or production authorization.**

## 1. Scope, provenance and current evidence

Prepared on `task-08-fulfilment-delivery` at HEAD `166a2b784ef88384f566f56163dd8e8aeab46c7a`, with a clean working tree before this one-file slice. Only the seven Workstream A–C documents separate this HEAD from implementation-audit baseline `89f7611203057c2cf4feb192faa2cba86233aea7`. No historical test result is transferred to this candidate. No database, Docker, external source, vendor, credential or patient record was accessed.

Authorities, read together:

- [AGENTS.md](../../AGENTS.md) and [project overview](../PROJECT_OVERVIEW.md).
- Complete [Task 08 specification](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), particularly Workstream D, Workstreams F–M, Mandatory stop conditions and Production gates.
- Workstream A: [current state and gaps](current-state-and-gap-analysis.md), [Ontario standards mapping](ontario-fulfilment-standards-and-policy-mapping.md), [dependency and decision register](production-dependency-and-decision-register.md).
- Workstream B: [threat model](fulfilment-threat-model.md), [trust boundaries and six data flows](trust-boundaries-and-data-flows.md).
- Workstream C: [professional responsibilities](professional-responsibility-matrix.md), [role and transition authorization](role-and-transition-authorization-matrix.md), including S1–S4, V1, A1, L1 and G01–G15.

All 44 contracts below are **PROPOSED server-only logical records**, not TypeScript, Drizzle declarations, API permissions, approved event names or implemented tables. AgentRx is the task's coordination-system name, not a repository rename. No existing file is a modification target. **DO NOT APPLY A PRODUCTION MIGRATION.** This proposal also authorizes no synthetic migration or runnable prototype. Workstream F's complete transition register, K's operation-specific integrations and M's audit/retention policies remain separate work.

### 1.1 Evidence and non-transferable patterns

| Category / source | Locally verified evidence | Limit for this proposal |
|---|---|---|
| CURRENT persistence | [Database client](../../src/lib/db/index.ts), `db`: Drizzle over postgres.js; [migration configuration](../../drizzle.config.ts) and [schema exports](../../src/lib/db/schema/index.ts): PostgreSQL and file-based Drizzle migrations. | No Task 08 entity or connection is introduced. Schema/configuration presence is not live deployment verification. |
| CURRENT scoping | [Assessment schema](../../src/lib/db/schema/assessments.ts), `pharmacy`, `patient`, `assessment`: singleton pharmacy check/unique index, scoped patient identity and composite assessment identity. [Pharmacy configuration](../../src/lib/pharmacy-config.ts), `getConfiguredPharmacyId`. | `PHARMACY_ID` stays server-owned. A selected destination is not tenant authority; no second production pharmacy row or routing workaround is proposed. |
| CURRENT identity | [Auth schema](../../src/lib/db/schema/auth.ts), `userRole`, `user`, `session`; [guard](../../src/lib/auth-guard.ts), `requirePortalUser`. Five staff roles, session/TOTP/known-role/configured-pharmacy checks. | No Task 05 patient/delegate/recipient integration, courier identity, current registration verification or fulfilment permissions follows. Assessment role lists cannot authorize dispensing/checking/release. |
| CURRENT evidence separation | [Billability evidence schema](../../src/lib/db/schema/billability-evidence.ts), `assessmentBillabilityEvidence`: separately versioned sidecar, one assessment association, composite tenant-safe foreign key and explicit checks. | Study relational separation only. Do not copy PHI fields, change P0-B semantics, alter the sidecar, or reuse minor-ailment evidence as prescription/inventory truth. |
| CURRENT history/governance | [Governance schema](../../src/lib/db/schema/governance.ts), `followUp`, `recordHold`, `retentionPolicy`: supersession, complete lifecycle shapes, indexes and policy references; [compliance map](../COMPLIANCE.md). | Existing clinical retention, exports, record destruction and audit are protected, not Task 08 stock disposition or universal retention policy. No audit/governance integration is approved here. |
| EXISTING SYNTHETIC patterns | Sandbox [transaction helpers](../../apps/experiment-sandbox/src/db/transaction.ts), [idempotency persistence](../../apps/experiment-sandbox/src/db/idempotency.ts), [outbox insertion](../../apps/experiment-sandbox/src/db/outbox.ts), [schema vocabulary](../../apps/experiment-sandbox/src/db/schema.ts). | Trusted database time, validated replay, transaction cleanup and fixed `not_dispatched` outbox are booking patterns only. No Task 04 import, grant, table or appointment-capacity reuse. |
| EXISTING SYNTHETIC authority | [Task 01 safeguards](../task-01/README.md); [Task 04 v3 renewal](../task-04/decisions/task-04-synthetic-scope-renewal-v3-2026-08-19.md). | Historical infrastructure approval is not Task 08 authority. Task 04 renewal remains DRAFT — NOT GRANTED after prior expiry. |
| CURRENT gaps | Workstream A §§1–5; [Task 07 design status](../task-07/README.md); [retired AI-RX-06 record](../task-10/AI-RX-06-synthetic-prescription-extraction.md). | No active prescription-upload/OCR, inventory, fulfilment, courier, adjudication/payment or Task 08 notification integration is established. Public intake remains zero-PHI; retired extraction stays retired. |
| PROPOSED / PRODUCTION-BLOCKED | This document and [Task 11](../tasks/autonomous-pharmacy/TASK-11-quality-security-release.md), Checkpoint 1 and release controls. | Contracts may be reviewed now; runnable synthetic scope, professional procedures, real integrations and production authorization remain ungranted. |

Ontario source versions, dates, scope interpretations and approvals remain **NOT VERIFIED** under Workstream A. The OCP Operating Internet Sites Policy is recorded by Task 08 as under review at its update; current external status is not newly verified. PHIPA is not described as universally requiring Canadian hosting. No legal, payer, professional, privacy, security, accessibility or procurement conclusion is supplied.

## 2. How to read every field contract

The field tables are joined contracts, not abbreviated optional guidance. For **every field**, read: its local row (meaning, type, permitted values, nullability, source and trusted actor), its data/control profile, its lifecycle profile, the contract's retention profile and the common requirements in this section. That combination specifies all fourteen Workstream D field attributes. No field inherits a permissive default.

### 2.1 Types, trust and null semantics

| Notation | Exact conceptual meaning / permitted values |
|---|---|
| `Ref<T>` | Server-issued opaque surrogate resolving to exactly one scoped, type-correct T. Never a raw database/vendor/prescription identifier, encoded clinical value, URL or bearer secret. Generation format/entropy and mapping-store ownership PENDING under T08-D18/D29/D30. |
| `Refs<T>` | Bounded, duplicate-free set of `Ref<T>`; cardinality limit PENDING. Empty is permitted only where explicitly stated, never evidence that a required prerequisite passed. Join rows rather than arbitrary metadata. |
| `Instant` / `Zone` | Valid UTC instant / valid approved IANA timezone. Server/database acceptance time is distinct from source-observed event time. Approved synthetic fixed clock and Ontario timezone values PENDING; no browser clock authority. |
| `Version` | Positive monotonically increasing local integer; contract and workflow versions are distinct from record state versions. Initial number/schema negotiation PENDING. External versions are opaque bounded source-issued tokens, not locally incremented. |
| `Code<registry>` | One member of a named, closed, versioned allowlist. Where the list is PENDING, no production or policy-dependent successful value is permitted until approval. Not free text, arbitrary JSON or an open enum. Unknown values fail closed. |
| `Fact` | Proposed technical evidence category: `CONFIRMED`, `NOT_CONFIRMED`, `UNKNOWN`. No clinical conclusion; only the authorized source can confirm its named fact. |
| `Decision` | `PASS`, `FAIL`, `REVOKE`, `PENDING` as conceptual representations of the specification's pass/fail/revoke/pending. Only action-compatible values after professional approval; never a software-generated professional FAIL. |
| `Money` | Non-negative exact decimal amount with separately explicit currency, or a pair of lower/upper amounts with lower no greater than upper. Precision, currency allowlist and limits PENDING; no floating-point calculation or invented amount. |
| `Digest` | Algorithm-tagged integrity commitment to approved evidence, not reversible content or a public lookup key. Algorithm/keying/rotation policy PENDING; do not hash low-entropy PHI as an identifier or fingerprint. |
| `N` / `Y(condition)` | N = required non-null. Y = null only for the stated absence/pending/not-applicable condition. Null, absent field, empty string, false and UNKNOWN are never interchangeable. Conditional requiredness must be checked in the later strict schema. |

No names, addresses, telephone numbers, emails, health-card numbers, prescription numbers, DINs, drug names, clinical content, payer identifiers, internal database IDs or vendor secrets may appear **inside technical identifiers, idempotency keys, URLs, topics, queue names, log labels, metric labels or correlation keys**. A field called `Ref` is a surrogate mapping, not permission to embed those values. Local relational keys remain inside protected persistence; external references are separate surrogates. Opacity does not anonymize a linked health relationship.

### 2.2 Source of truth and trusted actors

These labels describe future trust requirements, not existing roles/services. A field's `source / actor` cell names both. A source response is not trusted merely because transport authentication succeeds.

| Label | Source / actor meaning and authorization requirement |
|---|---|
| AR | Proposed AgentRx coordinator, authoritative only for recorded intent/provenance, coordination tasks, accepted local versions and minimized evidence. Trusted service derives context internally and acts only within approved scope. Cannot decide professional or physical facts. |
| ID | Future Task 05 authority for actor/subject, audience, session, relationship, assignment, recipient grant and revocation. **BLOCKED**; no patient-cookie reuse or new runtime role. |
| PA | Separately authenticated patient or authorized actor for the subject. Authoritative for expressed intent/statement only; ID must verify exact action and relationship. Not necessarily the recipient. |
| PH | Accredited pharmacy and approved pharmacy system for pharmacy-owned facts. Actual authenticated, assigned registrant supplies professional decisions under Workstream C; technical personnel only under explicit approved scope. PMS service identity alone is insufficient. |
| EV | Proposed evidence-domain custodian/scanner/import receiver, owner PENDING (Task 03 mismatch). Technical provenance/scan facts only; never prescription validity. |
| PY | Approved pharmacy/payer adjudication source, finance owner PENDING (Task 09 mismatch). Financial facts only, not clinical instructions or release. |
| PM | Approved payment provider and authoritative finance ledger. **BLOCKED**, no card data or payment effect here. |
| CV | Approved courier/assigned transport agent or other contracted external source; raw observations untrusted until scoped, validated and accepted by PH or the relevant fact owner. Never patient agent or professional authority. |
| GOV | Records/privacy/audit/security owner under separately approved policy. No existing root writer or retention policy is extended by this label. |

All reads/writes also require server-derived pharmacy scope, current audience/session/action/assignment and subject/request lineage, current lifecycle approval and applicable Task 11 gate. Professional fields additionally require S1–S4 and G01–G15 from Workstream C. Unknown roles deny. Staff roles `pharmacy_admin`, `pharmacist`, `intern`, `student`, `technician` are verified labels only; none acquires new authority here. Preserve existing as-of-right clinical behavior without inferring Task 08 scope or substituting a supervisor's identity.

### 2.3 Field data/control profiles

Classification describes the future linked record conservatively; no real data is collected. Every field is **server-only** in these domain contracts. Future client-safe projections require separate strict schemas, field necessity, per-read authorization and no-store controls; none is granted by this proposal, even for a non-sensitive constant.

| Profile | Data classification | Authorization, encryption/tokenization | Audit behavior for this field |
|---|---|---|---|
| H | PHI when linked to the request/subject, including opaque references and health-service status | Assigned care/coordination purpose plus actor/subject checks; encryption in transit/at rest and opaque reference mapping. Additional field encryption necessity/key design PENDING. Never raw content in technical surfaces. | Only an explicitly approved minimized reference/category may be used; never content. Omission preferred when unnecessary. |
| I | Personal information; also PHI where patient linkage reveals care | ID-scoped purpose/relationship plus need-to-know; tokenized actor/recipient references; encryption in transit/at rest. | No names, identity details or contact; actual actor reference only where approved. |
| C | Commercially sensitive; also PHI when request-linked | Assigned pharmacy/finance purpose; encryption and source-reference tokenization. No raw stock disclosure or financial payload in telemetry. | Only source/decision reference and safe outcome, not stock/amount/product detail. |
| S | Security sensitive; linked resource references may additionally be PHI/personal information | Trusted service/GOV access and exact scope; encryption, segregated reference mapping, least privilege. Never store secrets/credentials in these fields. | Approved correlation, versions or actor reference only; no reusable capability, secret, digest corpus or raw authorization evidence. |
| N | Non-sensitive contract vocabulary or marker in isolation; contextual copies inherit the enclosing record's H/I/C protection | Server policy/configuration ownership; integrity/version controls and transport/at-rest encryption for enclosing records. | Only approved static vocabulary; no dynamic labels or arbitrary metadata. |
| E | PHI/personal information with heightened evidence/address/proof protection | Separate protected store, field-level encryption for address/contact/proof and controlled evidence encryption; segregated keys and tokenized references, access logging under approved policy. Key/backup/vendor details PENDING. | Never raw field value, OCR, image, signature, address, contact, exact location or clinical rationale. Only separately approved opaque evidence reference. |

**For every field, production approval is required: YES — BLOCKED.** Applicable domain, PH/DM, ID, privacy/security/legal, retention, vendor and Task 11 reviews must approve its necessity, access and persistence. Named people, dates, periods and thresholds remain PENDING. Server-only does not mean universally staff-readable; each field inherits its source/actor restriction and the common checks.

### 2.4 Lifecycle, concurrency and retention profiles

| Field lifecycle | Staleness / supersession / revocation | Concurrency and audit behavior |
|---|---|---|
| L0 | Identity/provenance or immutable observation; never edited to rewrite past truth. A correction is a new attributed revision. | Write once in accepted transaction; duplicate source/version denied or safely deduplicated. Correction links and versions audited under approved catalogue. |
| L1 | Current coordination projection or pointer; invalidated by changed prerequisites. History retained separately. | Compare-and-set current stateVersion; deterministic locking/equivalent isolation; required state/audit/idempotency atomic. No stale overwrite. |
| L2 | Immutable source snapshot/decision/grant; validity expires or a later attributed revision revokes/supersedes it. | Revalidate source and local versions, validity, revocation and current authority at use/commit. Serialized successor publication; no self-link/cycle/two-current successor. |
| L3 | Append-only physical/financial/event observation; receipt of observation is not acceptance of truth. | Deduplicate source event/version; validate sequence and scope; separate acceptance/reconciliation revisions. Never erase real custody or rewrite a professional decision. |

No distributed atomicity is promised. A local transaction cannot prove a vendor side effect absent. Proven rolled-back database work may be retried only under an approved bounded policy with all guards rechecked; unknown commits or external outcomes require reconciliation before repeat effects. Exact lock order, time freshness at commit, leases, retry/timeout windows and idempotency lifetimes are **PENDING** for Workstreams F/K. Effective interval proposal is effectiveAt inclusive and expiresAt exclusive; no duration is invented and source semantics must be reviewed.

| Retention profile | Owner function — appointment PENDING | Proposed review trigger, not a retention duration |
|---|---|---|
| RQ | Pharmacy request-process custodian with records/privacy reviewers | Request closure/cancellation/expiry and dependent-work closure; disposition blocked while delivery, return, dispute or reconciliation remains active. |
| RE | Prescription-evidence custodian, pharmacy professional and records/privacy | Evidence rejection, replacement, accepted source import or request closure; decide source-record obligations independently. No automatic deletion on rejection. |
| RP | Pharmacy professional-record custodian, DM and records/legal | Professional decision/source-record completion or supersession; preserve attribution and revocation chain. Not the existing assessment retention formula by default. |
| RC | Patient-choice/identity custodian and privacy/records | Choice/preference withdrawal, grant revocation/expiry or request closure, subject to decision/custody evidence obligations. |
| RI | Pharmacy inventory/process owner and records/DM | Observation expiry/replacement, reservation resolution and related request closure. Expired evidence may remain needed for professional/custody reconstruction. |
| RF | Authoritative finance/payer/payment owner and records/legal | Final reconciliation, dispute/chargeback closure and source-ledger obligation; no automatic deletion on payment failure. |
| RD | Pharmacy custody/delivery owner, privacy/records and DM | Verified handoff or correct-pharmacy return, exception/dispute closure and disposition review; address necessity assessed separately from receipt evidence. |
| RT | Integration/security/operations with records/privacy | Operation definitively reconciled and replay/dedup risk closed; vendor copies/backups need their own disposition evidence. |
| RA | Audit/governance/security with records/legal | Event occurrence plus linked legal/incident/professional obligations; no automatic expiry based on request closure. |

Every field inherits its contract's retention profile, including identifiers, status, timestamps and nested fields. `retentionPolicyRef` must resolve an approved **field/dataset-specific schedule** before any real collection; profile codes here do not authorize retention. Period, deletion/archive method, backup treatment and vendor deletion are PENDING under T08-D33. Legal holds, incidents, complaints, chargebacks and active custody block unsafe disposal. No blanket clinical period, unreviewed cascade deletion or indefinitely retained production data is proposed. Synthetic artifact disposal separately needs exact scope/lifecycle approval.

## 3. Shared field sets

These are named field sets expanded into each applicable contract, not new services or automatically shared production tables. Local field rows narrow these rules; a contradiction must block implementation, not silently override a control.

### 3.1 B — Record envelope

Every contract except the RequestType value object and the explicitly closed FulfilmentAuditEvent payload uses B. Its ID is the contract's opaque identifier, not a readable internal key. Request linkage is supplied by the local row or parent relationship. All fields inherit that contract's retention profile.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| id — opaque identity of this record | `Ref<this contract>`; N | AR issuer / AR | S / L0 |
| pharmacyScopeRef — custodian scope independent of choice | `Ref<server scope>`; N | Server configuration / AR; ID verifies assignment | S / L0 |
| contractVersion — exact schema vocabulary | Version; N | Approved contract registry / AR | N / L0 |
| stateVersion — current accepted local revision | Version; N | Transactional record / AR | S / L1 |
| createdAt — server receipt/creation time | Instant; N | Trusted server/database clock / AR | H / L0 |
| recordedByActorRef — actual actor or scoped service, not impersonation | `Ref<actor>`; N | ID for people, approved service identity for ingestion / AR | I / L0 |
| sourceSystemRef — origin system or local synthetic source | `Ref<source registry>`; N | Approved source registry / AR | S / L0 |
| sourceRecordRef — mapped source record, never raw vendor/Rx ID | `Ref<source record>`; Y(no external/source record exists) | Named fact owner / authorized receiver | H / L0 |
| sourceRecordVersion — version of the source evidence | Bounded source version token; Y(no versioned source record); required for relied-on imported facts | Named fact owner / authorized receiver | S / L0 |
| retentionPolicyRef — field/dataset schedule approval reference | `Ref<approved schedule>`; Y(design or approved synthetic-only placeholder); mandatory before real collection | GOV / GOV | S / L2 |
| retentionTriggerAt — accepted trigger for schedule evaluation | Instant; Y(trigger not yet established); never a deletion command | GOV based on fact owner / GOV | H / L1 |
| retentionState — proposed lifecycle evidence, not permission to destroy | `Code<retention lifecycle: retained, held, review pending, authorized disposal evidenced>`; N; exact registry PENDING | GOV / GOV | S / L1 |

Synthetic instance, approval version, lifecycle validity, environment and trusted time are authoritative execution-context requirements, not browser fields or hidden production defaults. Exact Task 08 context contract remains T08-D02/D18/D36. No copied Task 04 configuration values.

### 3.2 V — Validity and successor evidence

All source snapshots, preferences, grants, decisions and plans below explicitly include V. Physical/event records use later acceptance/correction records rather than retroactive revocation of the physical event.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| observedAt — when the source observed its fact | Instant; N | Contract fact owner / authenticated receiver | H / L0 |
| effectiveAt — first permitted reliance time | Instant; N | Approved policy and fact owner / AR validation | H / L0 |
| expiresAt — last reliance boundary, exclusive | Instant; Y(approved non-expiring evidence only); unknown required expiry blocks reliance | Fact owner under approved policy / AR validation | H / L0 |
| supersedesRef — prior revision replaced by this record | `Ref<same contract>`; Y(first revision) | Fact owner / AR transaction | H / L0 |
| supersededByRef — successor, derived from validated successor relation | `Ref<same contract>`; Y(no successor) | Accepted revision chain / AR | H / L1 |
| revokedAt — accepted revocation time | Instant; Y(not revoked) | Authorized fact owner / AR | H / L2 |
| revokedByActorRef — actual revoker | `Ref<actor>`; Y(exactly when revokedAt null) | ID and fact owner / authorized revoker | I / L2 |
| revocationReasonCode — minimized supported reason | `Code<revocation reasons>`; Y(exactly when revokedAt null) | Fact owner / authorized revoker | H / L2 |

Revocation is append-only evidence with a current projection; it must not mutate original decision content. A nullable expiry is never unlimited permission by omission. Same-type, same-scope, same-lineage successor links and a single current revision need database and transaction enforcement after design approval.

### 3.3 P — Attributed professional decision reference

P includes B and V. Used only where a local contract explicitly adopts it. It supplies a **reference to a pharmacy-owned decision**, never permission for AgentRx to perform the decision. Source synchronization also needs independently verifiable actual professional provenance; a PMS login does not replace S1–S4.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — exact parent request | `Ref<FulfilmentRequest>`; N | AR lineage / PH with assignment | H / L0 |
| itemRef — exact affected request item | `Ref<FulfilmentRequestItem>`; Y(request-level review only); N for check/release/disposition | AR lineage + PH decision / PH | H / L0 |
| registrantRef — actual authenticated decision-maker | `Ref<registrant>`; N; not supervisor substitution | ID and professional authority source / PH | I / L0 |
| registrantType — separately verified professional type | `Code<approved professional types>`; N; NOT inferred from staff role enum | Professional authority source / PH; ID validation | S / L0 |
| currentAuthorizationEvidenceRef — current action-specific scope proof | `Ref<authorization evidence>`; N | Approved professional source / PH; ID validation | S / L2 |
| assignedPharmacyEvidenceRef — current assignment for scope/action | `Ref<assignment evidence>`; N | ID / PH; AR checks server scope | S / L2 |
| decision — supported pass/fail/revoke/pending reference | Decision; N; gate-compatible subset required | Pharmacy professional record / actual PH | H / L2 |
| safeReasonCode — supported reason without clinical rationale | `Code<gate-specific safe reasons>`; Y(approved outcome permits omission) | PH / PH | H / L2 |
| decisionAt — professional decision time, not ingestion time | Instant; N | Verifiable pharmacy decision / PH | H / L0 |
| policyVersion — procedure version relied on | `Ref<approved policy revision>`; N | PH policy owner / PH | S / L0 |
| workflowVersion — transition contract consumed | `Ref<approved workflow revision>`; N | Approved workflow / PH and AR | S / L0 |
| consumedStateVersion — local version checked for this decision | Version; N | Transactional request/item / AR with PH submission | S / L0 |
| auditRef — required attributed decision evidence | `Ref<FulfilmentAuditEvent>`; N on accepted persistence | Approved audit transaction / AR | S / L0 |

P's sourceSystemRef/sourceRecordRef/sourceRecordVersion are mandatory for every accepted professional decision reference, including an imported decision; no null source-version success path. Clinical rationale remains solely in the approved pharmacy/clinical record. `PENDING` records no successful professional gate. Revocation targets an existing valid lineage and cannot fabricate return custody. Required state, decision reference, idempotency and audit evidence commit atomically or not at all; audit-contract uncertainty blocks affected persistence.

## 4. Contract catalogue — request, evidence and choice

Contract labels D01–D44 are documentary row IDs, distinct from the existing **T08-Dnn decision register**. Each contract has the common controls above and the specified retention owner/trigger. `Audit` describes a proposed minimized obligation, not an approved event registry. Every contract is PROPOSED/SYNTHETIC-ONLY CANDIDATE and PRODUCTION BLOCKED.

### D01 — FulfilmentRequest

Purpose/authority: AR owns coordination intent and accepted projection only; PH owns prescription validity and downstream professional facts. Includes B; retention RQ. Relationships: one request to many items/evidence/tasks and independently versioned state records; ID owns subject/actor relationship.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| patientSubjectRef — subject, not necessarily submitter | `Ref<ID subject>`; N | ID / AR | H / L0 |
| initiatingActorRef — original requester | `Ref<ID actor>`; N | ID / PA through AR | I / L0 |
| actorSubjectRelationshipRef — action-specific authority | `Ref<ID relationship>`; N | ID / AR | S / L2 |
| requestType — review requested, not a dispense instruction | RequestType; N | PA intent / AR strict validation | H / L0 |
| pharmacyChoiceRef — recorded requested destination | `Ref<PharmacyChoice>`; Y(draft has no choice); required before approved routing | PA intent / AR; routing BLOCKED | H / L1 |
| fulfilmentPreferenceRef — pickup/delivery preference | `Ref<FulfilmentPreference>`; Y(not yet expressed) | PA / AR | H / L1 |
| requestSource — capture channel, not inferred authority | `Code<approved request channels>`; N | AR provenance / AR | S / L0 |
| provenanceRef — source submission evidence | `Ref<provenance record>`; N | Authenticated receiver / AR | S / L0 |
| prescriptionEvidenceRefs — evidence associations | `Refs<PrescriptionEvidence>`; N; empty only before evidence received | EV and AR / authorized receiver | H / L1 |
| authoritativePrescriptionRef — pharmacy-accepted source record | `Ref<PH prescription>`; Y(until supported PH decision); cannot be supplied as browser authority | PH / PH; AR verifies decision | H / L2 |
| requestState — request dimension | `Code<Task 08 F request states>`; N | AR guarded transition / AR | H / L1 |
| canonicalWorkflowState — derived workflow projection | `Code<Task 08 F canonical states>`; N; UNKNOWN on contradiction; no client setter | Versioned dimension guard projection / AR | H / L1 |
| orthogonalStateRefs — dimension records, not one status authority | Fixed named slots in §8; each nullable only before its dimension exists | Respective fact owners / AR validates | H / L1 |
| submittedAt — accepted submission time | Instant; Y(not submitted) | Trusted clock / AR | H / L0 |
| lastTransitionedAt — latest accepted coordination transition | Instant; Y(no transition yet) | Trusted clock / AR | H / L1 |
| expiredAt — accepted request expiry | Instant; Y(not expired); no silent TTL | Approved policy + trusted clock / AR | H / L1 |
| cancelledAt — accepted cancellation, not mere request | Instant; Y(not reconciled/accepted as cancelled) | Applicable fact-owner acknowledgements / AR | H / L1 |
| closedAt — completed coordination closure | Instant; Y(open obligations) | Guarded closure / AR | H / L1 |
| assignedQueueRef — internal pharmacy work allocation | `Ref<approved queue>`; Y(not assigned); static queue name has no identifiers | PH assignment / AR | S / L1 |
| reviewTaskRefs — professional review work | `Refs<PrescriptionReviewTask>`; N; empty before task allocation | PH/AR / assigned reviewer | H / L1 |
| blockingReasonCodes — supported safe prerequisite failures | Bounded `set<Code<blocking registry>>`; N; empty is not proof of eligibility | Validated guard results / AR | H / L1 |
| auditRefs — accepted history, not payloads | `Refs<FulfilmentAuditEvent>`; N; linked atomically for accepted writes | Audit transaction / AR | S / L0 |

Invariants/failure: use REQUEST, never order; upload or patient statement cannot accept a prescription. Choice cannot select tenancy. Draft may lack evidence/choice but cannot route or progress on missing authority. Multi-item readiness is not inferred from one item. Concurrency/supersession: B/L1 current-version transition, current referenced revisions and idempotent submission; cancellations preserve records and trigger only separately approved consequence review. Audit: submission/transition references and versions, no evidence content. Blockers: T08-D05/D06/D13/D14/D17/D18/D29/D32; all global approvals remain open.

### D02 — FulfilmentRequestItem

Purpose/authority: AR owns item association; PH supplies accepted prescription/product and independent professional state. B; RQ. No drug/quantity chosen by coordinator.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — parent request | `Ref<FulfilmentRequest>`; N | AR lineage / AR | H / L0 |
| sourcePrescriptionItemRef — authoritative item mapping | `Ref<PH prescription item>`; Y(before PH acceptance) | PH / PH | H / L2 |
| evidenceRefs — unverified item evidence | `Refs<PrescriptionEvidence>`; N; may be empty pending source | EV/PH / assigned reviewer | H / L1 |
| productDecisionRef — product/quantity professional decision | `Ref<PrescriptionReviewDecisionReference>`; Y(not decided) | PH / PH | H / L2 |
| itemStateRefs — independent dimension references | Fixed slots §8, excluding request dimension; nullable only before existence | Dimension owners / AR | H / L1 |
| includedPackageRefs — package association/manifest | `Refs<CustodyPackage>`; N; empty before packaging | PH manifest / PH | H / L1 |
| partialPlanRef — separately authorized split/partial plan | `Ref<PH plan>`; Y(no such approved plan); absent does not authorize splitting | PH / PH | H / L2 |

Invariants/failure: mismatched request, product, item or package denies; no automatic partial/split quantity or substitution. Concurrency/supersession: item version and current source revision rechecked with each dependent guard; changed source invalidates stale readiness rather than rewriting accepted history. Audit: item/version association, never medication/quantity. Blockers: T08-D17–D20/D27/D32.

### D03 — RequestType

Purpose/authority: AR strictly records PA's request category. PROPOSED value object, not a production enum migration or validity decision. No B; RQ through enclosing request.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| value — requested review kind | Exactly NEW_PRESCRIPTION_REVIEW, REFILL_REVIEW, RENEWAL_REVIEW, TRANSFER_REVIEW; N | PA intent / AR | H / L0 |
| vocabularyVersion — exact approved interpretation | Version; N | Contract registry / AR | N / L0 |

Invariants/failure: unknown/extra values reject; none proves remaining quantity, renewal, transfer or validity. Concurrency/supersession: part of parent version/fingerprint; material correction requires versioned request review, not silent reclassification. Audit: approved category only. Blockers: T08-D05/D17/D18; exact command rules deferred.

### D04 — PrescriptionEvidence

Purpose/authority: EV owns technical receipt/provenance, PA owns the statement, PH alone owns professional acceptance. B; RE. Evidence is not an authoritative prescription.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — protected parent | `Ref<FulfilmentRequest>`; N | AR / EV | H / L0 |
| evidenceKind — input category | `Code<image, document, patient statement, transmission reference, transfer request>`; N; final closed registry PENDING | Observed input / EV | H / L0 |
| storageRef — separately protected original | `Ref<server evidence store>`; Y(reference-only kind without local content) | EV storage / EV | E / L0 |
| submittedActorRef — original contributor | `Ref<ID actor>`; N | ID / EV | I / L0 |
| subjectRelationshipRef — verified submitting relationship | `Ref<ID relationship>`; N | ID / EV | S / L0 |
| submittedAt — receiver-accepted submission time | Instant; N | Trusted clock / EV | H / L0 |
| provenanceRef — acquisition/source history | `Ref<evidence provenance>`; N | EV / EV | E / L0 |
| integrityStatus — file/reference integrity result | Fact; N; UNKNOWN blocks reliance | Technical evidence verifier / EV | S / L1 |
| malwareScanStatus — technical isolation result | `Code<pending, passed, failed, unknown, approved not-applicable>`; N; exact applicability PENDING | Approved scanner / EV | S / L1 |
| ocrStatus — extraction processing only | `Code<not requested, pending, complete, failed, unavailable>`; N; no OCR runtime exists | Approved evidence processor / EV | H / L1 |
| ocrOutputRef — protected extraction output | `Ref<protected OCR result>`; Y(no output); never inline text | EV / authorized reviewer | E / L0 |
| confidenceCategory — source-labelled extraction uncertainty | `Code<approved OCR confidence>`; Y(no OCR output); thresholds PENDING | EV processor / EV | H / L0 |
| humanReviewStatus — technical/professional review progress, not acceptance | `Code<unreviewed, in review, clarification required, review referenced>`; N | PH review process / PH | H / L1 |
| reviewDecisionRef — separate attributed decision | `Ref<PrescriptionReviewDecisionReference>`; Y(no decision) | PH / PH | H / L2 |
| pharmacyImportStatus — source import acknowledgement | `Code<not attempted, pending, acknowledged, rejected, unknown>`; N; real import BLOCKED | PH source acknowledgement / EV validates | H / L1 |
| safeReasonCode — minimized rejection/clarification category | `Code<evidence reasons>`; Y(no supported reason) | EV technical or PH professional source / relevant actor | H / L1 |

B.retentionState covers retention/deletion evidence, not a delete-on-reject rule. Invariants/failure: original image/text/OCR stays protected, never logs/analytics/audit bodies/notifications/courier payloads. Scanner/OCR completion, import or a transfer copy never establishes validity. Concurrency/supersession: technical status tied to exact immutable content revision; changed content creates a new record; duplicate digest is evidence for review, not authority to delete or accept. Audit: receipt/scan/review references only. Blockers: T08-D05/D14/D17/D28/D30/D33; no replacement for retired AI-RX-06.

### D05 — PrescriptionReviewTask

Purpose/authority: AR coordinates work; PH owns assignment and review. B; RP.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — request under review | `Ref<FulfilmentRequest>`; N | AR / PH | H / L0 |
| itemRef — item-specific work | `Ref<FulfilmentRequestItem>`; Y(request-level review) | PH / PH | H / L0 |
| evidenceRefs — exact reviewed revisions | `Refs<PrescriptionEvidence>`; N; empty only for explicit missing-evidence task | EV/PH / PH | H / L0 |
| assignmentRef — approved reviewer assignment | `Ref<ID assignment>`; Y(unassigned task); no review completion until assigned | ID/PH / PH | S / L1 |
| reviewState — progress, not professional result | `Code<Task 08 F prescription-review states>`; N | PH progress / AR validation | H / L1 |
| decisionRefs — attributed outcomes | `Refs<PrescriptionReviewDecisionReference>`; N; empty before decision | PH / PH | H / L1 |
| clarificationRefs — unresolved questions | `Refs<ClarificationCase>`; N; may be empty | PH / PH | H / L1 |

Invariants/failure: queue assignment or task completion cannot accept evidence itself. Concurrency/supersession: compare current task/evidence/assignment versions; reassignment preserves earlier actor/progress and invalidates stale writes. Audit: allocation/progress/decision references. Blockers: T08-D05/D06/D17/D20/D32.

### D06 — PrescriptionReviewDecisionReference

Purpose/authority: PH-authoritative, external-reference-only decision consumed by AR. Includes P; RP. G01–G08 as applicable remain independently checked.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| gate — kind of supported professional decision | One applicable G01–G08 canonical name from Workstream C; N | PH / actual PH | H / L0 |
| reviewTaskRef — work that requested review | `Ref<PrescriptionReviewTask>`; N | PH/AR / PH | H / L0 |
| reviewedEvidenceRefs — exact provenance reviewed | `Refs<PrescriptionEvidence>`; N; empty only under approved source-record review contract | PH / PH | H / L0 |
| authoritativePrescriptionRef — accepted pharmacy record | `Ref<PH prescription>`; Y(not accepted/created by source); N for acceptance reliance | PH / PH | H / L2 |
| supportingDecisionRefs — transfer/renewal/substitution/clarification support | `Refs<PH decision>`; N; conditional members required by gate | PH / PH | H / L2 |

Invariants/failure: gate/Decision pairing must be explicitly approved; no parser, patient, service or administrative negative decision. Transfer needs source/receiving authority and choice, not record copying. Concurrency/supersession: P current source/local revision; append replacement/revocation. Audit: P.auditRef and gate outcome only. Blockers: T08-D05/D13/D16/D17/D20/D28/D32.

### D07 — ClarificationCase

Purpose/authority: AR owns coordination; PH owns professional question/resolution. B; RP; communication content remains outside this contract.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| reviewTaskRef — parent review and request lineage | `Ref<PrescriptionReviewTask>`; N | PH / PH | H / L0 |
| category — missing prerequisite versus professional uncertainty | `Code<approved clarification categories>`; N | PH; AR only detects missing technical prerequisites / authorized creator | H / L0 |
| questionRecordRef — protected source question | `Ref<PH clinical record or approved Task 07 thread>`; N | PH/Task 07 / PH | E / L0 |
| responseRecordRefs — received answers, not resolution | `Refs<protected response>`; N; empty pending response | PA/prescriber/PH through approved channel / PH verifies | E / L1 |
| caseState — coordination progress | `Code<open, awaiting response, review pending, resolution referenced, unknown>`; N; PROPOSED | AR with PH source / AR | H / L1 |
| resolutionDecisionRef — explicit G03 decision | `Ref<PrescriptionReviewDecisionReference>`; Y(unresolved) | PH / PH | H / L2 |

Invariants/failure: response receipt, timeout or generated text never resolves professional uncertainty. Concurrency/supersession: source question/response versions bound; new issue cannot be cleared by older response; append resolution/correction. Audit: body-free opening/response/resolution references. Blockers: T08-D05/D07/D17/D20/D31/D32.

### D08 — PharmacyChoice

Purpose/authority: PA-authoritative choice intent recorded by AR, **not** tenancy or verified accreditation. B+V; RC. Choice/destination routing remains BLOCKED by T08-D13.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| patientSubjectRef — person whose choice is recorded | `Ref<ID subject>`; N | ID / PA through AR | H / L0 |
| actingActorRef — patient or authorized choosing actor | `Ref<ID actor>`; N | ID / PA | I / L0 |
| relationshipRef — choice-specific authority | `Ref<ID relationship>`; N | ID / AR | S / L2 |
| selectedAccreditedPharmacyRef — intended destination, not local tenant | `Ref<directory pharmacy>`; N for a choice record; never preselected | Explicit PA selection / AR; PH accreditation review separate | H / L0 |
| accreditationSnapshotRef — source-labelled verification evidence | `Ref<PharmacyAccreditationSnapshot>`; Y(unverified destination); no routing reliance then | Approved accreditation source / PH validates | S / L2 |
| selectionSource — how explicit choice was captured | `Code<approved selection methods>`; N | PA/receiver / AR | S / L0 |
| alternativesAvailable — presentation fact | Fact; N | Neutral presentation record / AR | H / L0 |
| neutralAlternativesEvidenceRef — actual alternatives/disclosures shown | `Ref<approved presentation snapshot>`; N; no inferred ranking rationale | AR presentation provenance / AR | H / L0 |
| informationShownRefs — source/version/expiry of each disclosure | `Refs<approved network, price, distance, delivery, accessibility disclosure>`; N; may be empty when none shown; each source/expiry required | Approved information sources / AR | H / L0 |
| chosenAt — server-accepted explicit choice time | Instant; N | Trusted clock / PA through AR | H / L0 |
| withdrawnAt — withdrawal, independent of transfer completion | Instant; Y(not withdrawn) | PA with current authority / AR | H / L2 |
| transferImplication — source-labelled requirement/uncertainty | `Code<none established, review required, transfer requested, unknown>`; N; PROPOSED | PH for professional implications / PH; PA may request only | H / L2 |
| acknowledgementRef — required disclosure/choice acknowledgement | `Ref<approved acknowledgement>`; Y(policy requires none); policy unknown blocks affected reliance | PA / AR validates exact presentation | H / L0 |

Invariants/failure: no commercial steering, health-inferred ranking or bundled consent. Missing/stale accreditation blocks reliance, not a forced fallback pharmacy. InformationShownRefs are separate finite records, not arbitrary metadata or embedded PHI. Concurrency/supersession: V change/withdrawal preserves presentation and former intent; revalidate current choice before any later approved routing/transfer. Audit: choice/change/withdrawal reference, never ranking based on clinical content. Blockers: T08-D06/D13/D15/D17/D30/D32.

### D09 — PharmacyAccreditationSnapshot

Purpose/authority: external-reference-only approved accreditation source, PH-reviewed; AR cannot verify by profile alone. B+V; RC.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| directoryPharmacyRef — pharmacy described, not tenant selector | `Ref<directory pharmacy>`; N | Approved directory / PH receiver | S / L0 |
| accreditationEvidenceRef — independently sourced evidence | `Ref<accreditation evidence>`; N | Approved authority / PH | S / L0 |
| verificationStatus — accepted verification result | Fact; N; UNKNOWN blocks reliance | Approved source and PH verification / PH | S / L2 |
| jurisdictionRef — reviewed operating jurisdiction | `Ref<approved jurisdiction>`; N | Source evidence / PH | N / L2 |
| procedureVersion — verification/freshness policy | `Ref<approved procedure>`; N | PH/legal reviewer / PH | S / L0 |

Invariants/failure: marketing, stored OCP/HNS/profile data and an expired directory entry prove neither accreditation nor registrant authority. Concurrency/supersession: V source refresh/revocation; no stale choice/routing use. Audit: source verification reference/status only. Blockers: T08-D13/D15/D16/D28; source, freshness and policy NOT VERIFIED.

### D10 — FulfilmentPreference

Purpose/authority: PA intent recorded by AR, not an approved fulfilment plan. B+V; RC.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — parent request/subject | `Ref<FulfilmentRequest>`; N | AR / PA with ID grant | H / L0 |
| mode — explicit preference | PICKUP or DELIVERY; N; absence represented by no preference record | PA / AR | H / L0 |
| acknowledgementRef — relevant disclosure acceptance | `Ref<approved acknowledgement>`; Y(not required by approved policy) | PA / AR | H / L0 |
| accommodationRef — protected accessibility need, not free-text metadata | `Ref<approved accommodation record>`; Y(none supplied) | PA through approved channel / authorized PH | E / L2 |
| approvedPlanRef — independently approved operational plan | `Ref<PickupPlan or DeliveryPlan>`; Y(no matching current plan) | PH / PH | H / L2 |

Invariants/failure: preference never waives signature, counselling, fees or release; no inferred mode. Concurrency/supersession: V revisions, version check, late mode change enters applicable review/reconciliation, not automatic courier cancellation. Audit: mode/preference reference only; accommodation content excluded. Blockers: T08-D06/D18/D23/D24/D26/D35.

## 5. Contract catalogue — inventory and professional boundaries

### D11 — InventoryEstimate

Purpose/authority: external-reference-only observation; AR may label uncertainty, never confirm stock. B+V; RI.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| itemRef — candidate request item | `Ref<FulfilmentRequestItem>`; N | AR lineage / authorized PH | H / L0 |
| productCandidateRef — unconfirmed product mapping | `Ref<PH product candidate>`; N | PH source / PH; not PA selection authority | H / L0 |
| availabilityCategory — minimized source observation | `Code<approved estimate availability>`; N; UNKNOWN permitted, values PENDING | Inventory observation / authorized receiver | C / L2 |
| approximateQuantityCategory — optional coarse range | `Code<approved quantity categories>`; Y(not specifically approved); exact quantities prohibited here | Approved inventory source / PH | C / L2 |
| confidenceCategory — source uncertainty label | `Code<approved estimate confidence>`; N; thresholds PENDING | Inventory source / PH | C / L2 |
| confirmationIndicator — explicit non-authority | Exactly NOT_CONFIRMED; N | Contract constant / AR | N / L0 |
| disclaimerVersion — truthful estimate wording | `Ref<approved disclaimer>`; N | PH/product/privacy review / AR | N / L0 |

Invariants/failure: V.observedAt/expiresAt required for estimate reliance; no estimate activates reservation, preparation, capture or handoff. On-hand, wholesaler or catalogue data is not dispensable stock. Concurrency/supersession: source/product/choice change or expiry removes usable projection; preserve prior observation. Audit: estimate creation/expiry/display category under later catalogue, no raw stock. Blockers: T08-D19/D29/D30.

### D12 — InventoryConfirmation

Purpose/authority: PH authoritative inventory confirmation, AR reference consumer. B+V; RI. Technical facts do not resolve professional product/substitution judgment; G07 remains separate where required.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| itemRef — exact accepted item | `Ref<FulfilmentRequestItem>`; N | PH/AR lineage / PH | H / L0 |
| confirmingSourceRef — approved pharmacy system or actual authorized actor | `Ref<PH source or actor>`; N | PH/ID / assigned PH receiver | S / L0 |
| authoritativePrescriptionRef — record supporting item | `Ref<PH prescription>`; N | PH / PH | H / L0 |
| productIdentityRef — confirmed identity, no embedded DIN | `Ref<PH product>`; N | PH inventory / PH | H / L0 |
| strengthConfirmationRef — source strength fact | `Ref<PH strength evidence>`; N | PH / authorized confirmer | H / L0 |
| formConfirmationRef — dosage form fact | `Ref<PH form evidence>`; N | PH / authorized confirmer | H / L0 |
| quantityConfirmationRef — required quantity fact, not local calculation | `Ref<PH quantity evidence>`; N | PH / authorized confirmer | H / L0 |
| manufacturerConfirmationRef — applicable manufacturer fact | `Ref<PH manufacturer evidence>`; Y(explicit approved non-applicability); unknown blocks | PH / authorized confirmer | H / L0 |
| packageConfirmationRef — applicable product package fact | `Ref<PH package evidence>`; Y(explicit approved non-applicability); unknown blocks | PH / authorized confirmer | H / L0 |
| onHandEvidenceRef — physical stock observation | `Ref<PH on-hand evidence>`; N | PH inventory / authorized confirmer | C / L0 |
| availableToDispenseEvidenceRef — distinct allocatable quantity/suitability evidence | `Ref<PH availability evidence>`; N | PH inventory / authorized confirmer | C / L0 |
| confirmationState — inventory dimension | `Code<Task 08 F inventory states>`; N; only source-supported confirmation subset | PH / PH; AR validates | H / L2 |
| expiryAcceptability — named expiry check | Fact; N | PH / authorized confirmer | H / L2 |
| recallStatus — recall evidence | `Code<clear, flagged, unknown>`; N; PROPOSED technical fact labels | PH authoritative recall source / PH | H / L2 |
| quarantineStatus — quarantine evidence | `Code<clear, quarantined, unknown>`; N; PROPOSED | PH / PH | H / L2 |
| storageStatus — storage evidence complete/supported | Fact; N | PH / PH | H / L2 |
| integrityStatus — package/product integrity evidence | Fact; N | PH / PH | H / L2 |
| substitutionRequirement — unresolved clinical/product issue | `Code<not required, decision required, unknown>`; N; never a recommendation | PH / PH | H / L2 |
| clarificationRequirement — unresolved source question | `Code<not required, required, unknown>`; N | PH / PH | H / L2 |
| reservationRef — independent source-owned allocation | `Ref<InventoryReservationReference>`; Y(not supported/not created); no implied reservation | PH inventory / PH | C / L2 |
| reservationExpiresAt — copied source expiry for guard validation | Instant; Y(no reservation); must match current reservation | PH inventory / AR verifies | C / L2 |
| confirmedAt — source confirmation time | Instant; N | PH / PH | H / L0 |
| consumedStateVersion — item version checked | Version; N | AR transaction with PH source / AR | S / L0 |
| productDecisionRef — required G07 professional confirmation | `Ref<PrescriptionReviewDecisionReference>`; Y(pending); required wherever professional guard applies | PH / actual PH | H / L2 |

Invariants/failure: incomplete, stale, partial, recalled/quarantined or contradictory evidence cannot become full available inventory. V.expiresAt required under approved freshness policy; unknown policy blocks reliance. Concurrency/supersession: revalidate source stock/version after reservations, other dispensing, recall or item change; local state cannot lock a remote vendor's stock. Audit: reference/source/time and safe outcome only. Blockers: T08-D16/D19/D20/D28/D29.

### D13 — InventoryReservationReference

Purpose/authority: external-reference-only PH allocation acknowledgement, never local stock authority. B+V; RI.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| confirmationRef — source facts being reserved | `Ref<InventoryConfirmation>`; N | PH / PH | C / L0 |
| allocationRef — mapped pharmacy-system allocation | `Ref<PH allocation>`; N | PH inventory / authorized receiver | C / L0 |
| reservationState — source lifecycle | `Code<requested, acknowledged, expired, release pending, released, consumed, unknown>`; N; PROPOSED mapping | PH source / PH; AR validates | C / L2 |
| externalOperationRef — idempotent intent/acknowledgement | `Ref<ExternalOperation>`; N | AR operation / AR | S / L0 |
| reconciliationRef — unknown or conflicting allocation | `Ref<ReconciliationCase>`; Y(no uncertainty) | AR/PH / assigned owner | H / L1 |

Invariants/failure: source expiry mandatory; reservation is not dispense, sale, release or ownership. No retries on unknown allocation; recall/shortage/manual use rechecked. Concurrency/supersession: duplicate operation scoped to actor/pharmacy/item; source version/expiry/release acknowledged independently, not overwritten by local timeout. Audit: reservation lifecycle reference only. Blockers: T08-D19/D28/D29.

### D14 — ProductException

Purpose/authority: PH owns product fact and resolution; AR records blocker/task only. B; RI.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| itemRef — affected item | `Ref<FulfilmentRequestItem>`; N | PH / PH | H / L0 |
| confirmationRef — affected stock revision | `Ref<InventoryConfirmation>`; Y(no valid confirmation) | PH / PH | C / L0 |
| category — product blocker | `Code<shortage, partial availability, substitution required, recall, quarantine, expiry, storage, integrity, unknown>`; N; vocabulary review PENDING | PH/source or missing-fact detector / relevant receiver | H / L0 |
| evidenceRef — protected supporting fact | `Ref<PH exception evidence>`; N | PH / PH | E / L0 |
| resolutionDecisionRef — explicit professional outcome if required | `Ref<PH decision>`; Y(unresolved) | PH / actual PH | H / L2 |
| workItemRef — assigned response | `Ref<FulfilmentWorkItem>`; N after accepted opening | AR/PH / AR | H / L1 |

Invariants/failure: no substitute, quantity split or suitability inference; missing evidence remains blocked. Concurrency/supersession: append exception/resolution history and compare current item/source state; resolving one does not clear others. Audit: safe exception/action references, no product details. Blockers: T08-D16/D19/D20/D34.

### D15 — PreparationTaskReference

Purpose/authority: external-reference-only PH preparation workflow; AR tracks progress, not product work. B+V; RP.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| itemRef — item being prepared | `Ref<FulfilmentRequestItem>`; N | PH / PH | H / L0 |
| preparationAuthorizationRef — explicit G08 prerequisite | `Ref<PrescriptionReviewDecisionReference>`; Y(not authorized); mandatory before start | PH / actual PH | H / L2 |
| sourceTaskRef — pharmacy-owned task | `Ref<PH preparation task>`; N | PH / authorized PH receiver | H / L0 |
| assignmentRef — authorized technical performer assignment | `Ref<ID assignment>`; Y(unassigned); no execution then | ID/PH / PH | S / L2 |
| preparationState — source progress | `Code<Task 08 F preparation states>`; N | PH workflow / PH | H / L2 |
| confirmationRef — inventory revision consumed | `Ref<InventoryConfirmation>`; Y(not authorized); mandatory before start | PH / PH | H / L2 |

Invariants/failure: no AgentRx label generation, product selection, quantity calculation, compounding, check or dispensing. Concurrency/supersession: changed item/stock/cancellation invalidates stale start/completion; rework new revision, not history edit. Audit: task/source/state versions only. Blockers: T08-D17/D19/D20/D28.

### D16 — TechnicalCheckReference

Purpose/authority: PH technical check only within reviewed scope. Includes P, with registrantType/current authorization explicitly technical where permitted; RP. This does not give the existing technician role new permission.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| preparationRef — exact prepared revision checked | `Ref<PreparationTaskReference>`; N | PH / authorized actual checker | H / L0 |
| technicalProcedureRef — exact approved check scope | `Ref<PH procedure>`; N | PH professional/technical scope owner / checker | S / L0 |
| reworkReference — source-owned response to failed check | `Ref<PH rework task>`; Y(no rework required by source) | PH / PH | H / L2 |

Invariants/failure: technical PASS never substitutes for clinical/final professional check, counselling or release; unverified scope denies. Concurrency/supersession: P; stale preparation cannot be checked, correction/recheck is a new attributed decision. Audit: P.auditRef, no technical/clinical content. Blockers: T08-D15/D20; trainee/technician/supervision rules NOT VERIFIED.

### D17 — ProfessionalCheckReference

Purpose/authority: PH actual professional supplies G09/G10; AR validates reference only. P; RP; itemRef non-null.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| preparationRef — independently prepared item revision | `Ref<PreparationTaskReference>`; N | PH / actual PH | H / L0 |
| technicalCheckRef — required current technical check | `Ref<TechnicalCheckReference>`; Y(approved policy says not applicable); unknown blocks | PH / actual PH | H / L2 |
| gate — exact final-check outcome being referenced | PROFESSIONAL_CHECK_PASSED or PROFESSIONAL_CHECK_FAILED; Y(PENDING or REVOKE targeting prior check); pairing strictly validated | PH / actual PH | H / L2 |

Invariants/failure: prerequisite absence is technical denial/pending, not invented FAIL. Actual authenticated registrant attribution and current authorization required. Concurrency/supersession: P protects current prepared version and PASS/FAIL/revocation chain, never stale overwrite. Audit: P.auditRef and supported outcome only; rationale source-only. Blockers: T08-D15/D20/D28/D32.

### D18 — CounsellingRequirementReference

Purpose/authority: PH determines and satisfies counselling/consultation requirement; AR only references it. P; RP.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requirementRecordRef — source-owned requirement | `Ref<PH counselling requirement>`; N | PH / actual PH | E / L0 |
| arrangementRef — approved consultation plan where policy permits | `Ref<PH counselling plan>`; Y(no approved arrangement); never a waiver by default | PH / PH | E / L2 |
| satisfactionRef — supported G11 decision | `Ref<PH satisfaction decision>`; Y(pending); required for satisfied projection | PH / actual PH | H / L2 |
| communicationRef — Task 07 channel reference, not completion proof | `Ref<approved secure interaction>`; Y(not used) | Task 07/PH / authorized PH | E / L0 |

Invariants/failure: sent/delivered/read notice, patient acknowledgement, payment or courier arrival cannot satisfy professional duty. Concurrency/supersession: P; item/recipient/plan change revalidates current requirement. Audit: requirement/satisfaction references only. Blockers: T08-D07/D20/D23/D26/D31/D35; timing/accessible alternatives PENDING.

### D19 — ReleaseAuthorization

Purpose/authority: PH explicit G12/G13 decision; AR cannot release. P; RP; request/item refs mandatory. READY is a separate derived projection.

For G12 authorization, the prerequisite references below must be current. For G13 revocation, V.supersedesRef is required and identifies the exact prior release; the prerequisite references preserve the evidence that release originally consumed. Current revoker authority, affected-item/custody facts and version checks remain mandatory, but expired or failed historical release prerequisites must not prevent an otherwise authorized revocation. This follows Workstream C G13, not a new professional permission.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| authoritativePrescriptionRef — current accepted source | `Ref<PH prescription>`; N | PH / actual PH | H / L2 |
| inventoryConfirmationRef — exact current inventory revision | `Ref<InventoryConfirmation>`; N | PH / actual PH | H / L2 |
| preparationRef — exact prepared item | `Ref<PreparationTaskReference>`; N | PH / actual PH | H / L2 |
| technicalCheckRef — applicable technical check | `Ref<TechnicalCheckReference>`; Y(approved non-applicability only) | PH / actual PH | H / L2 |
| professionalCheckRef — required current final check | `Ref<ProfessionalCheckReference>`; N | PH / actual PH | H / L2 |
| counsellingRef — current requirement/approved satisfaction or plan | `Ref<CounsellingRequirementReference>`; N | PH / actual PH | H / L2 |
| releaseGate — explicit professional result | RELEASE_AUTHORIZED or RELEASE_REVOKED; Y(PENDING/FAIL means no successful release gate) | PH / actual PH | H / L2 |
| prerequisiteVersionRefs — closed set of consumed evidence revisions | `Refs<typed prerequisites listed above and current plan/custody>`; N; no arbitrary metadata | Guarded transaction/source proof / AR with PH | S / L0 |

Invariants/failure: new G12 authorization requires all G12 guards and current approved validity; no missing source/registration or permissive null expiry. G13 uses the separate revocation requirements above. Payment/preparation/courier cannot release. One item never releases another. Concurrency/supersession: serialize current release/revocation with all affected handoffs; revoke readiness immediately, preserve actual prior physical custody and open reconciliation when needed. Audit: P.auditRef; immutable actual author and revoker. Blockers: T08-D18–D20/D23–D29/D32; no release duration selected.

## 6. Contract catalogue — financial separation

### 6.1 F — Shared estimate fields

PriceEstimate and CoverageEstimate each include B+V and the following fields; RF applies to every field. They remain immutable estimates even if later linked to adjudication; final financial truth lives in AdjudicationReference, not by rewriting an old estimate's finality.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| itemRef — exact item/quantity/pharmacy assumptions | `Ref<FulfilmentRequestItem>`; N | PH / authorized PY receiver | H / L0 |
| estimateType — price versus coverage | PRICE or COVERAGE respectively; N | Contract constant / AR | N / L0 |
| currency — explicitly sourced currency | `Code<approved currencies>`; Y(amount unavailable); required whenever amount/range exists | PH/PY / finance receiver | C / L0 |
| amount — one estimated exact amount | Money scalar; Y(range or unavailable); cannot coexist with range | PH/PY / finance receiver | C / L0 |
| rangeLower — lower estimate bound | Money scalar; Y(no range); present iff rangeUpper present | PH/PY / finance receiver | C / L0 |
| rangeUpper — upper estimate bound | Money scalar; Y(no range); at least rangeLower | PH/PY / finance receiver | C / L0 |
| amountStatus — selects one amount shape | AMOUNT, RANGE or UNAVAILABLE; N; PROPOSED structural union | PH/PY / finance receiver | C / L0 |
| includedFeeCategories — disclosed covered components, not fee values | Bounded `set<Code<approved cost/fee/tax components>>`; N; empty permitted | PH/PY / finance receiver | C / L0 |
| excludedFeeCategories — absent/unknown components disclosed | Bounded `set<Code<approved cost/fee/tax components>>`; N; cannot contradict included set | PH/PY / finance receiver | C / L0 |
| assumptionsRefs — source/policy/product/quantity/payer/date dependencies | `Refs<protected assumption evidence>`; N; no raw policy/payer identifiers | PH/PY / authorized finance receiver | E / L0 |
| adjudicationStatus — relationship to later authoritative review | `Code<not adjudicated, pending, separately referenced, unknown>`; N; no finality implied | PY / AR verifies source | C / L2 |
| patientResponsibilityStatus — known uncertainty, not promise | `Code<unknown, estimated, authoritative result elsewhere>`; N; PROPOSED | PY / finance receiver | C / L2 |
| finalityIndicator — non-final label | Exactly ESTIMATE; N | Contract constant / AR | N / L0 |
| disclaimerVersion — approved uncertainty wording | `Ref<approved financial disclaimer>`; N | PH/finance/product review / AR | N / L0 |
| adjudicationRef — separate authoritative result if any | `Ref<AdjudicationReference>`; Y(no matched result) | PY / finance receiver | C / L2 |

V supplies source observation/effective/expiry; expiry required before estimate reliance. No currency, amount, fee, tax, copayment, deductible, PIN, code or maximum is selected here. Raw payer credentials, full policy numbers, health-card numbers and payment-card data are excluded from **all** Task 08 contracts.

### D20 — PriceEstimate

Purpose/authority: external-reference-only PH pricing estimate; AR displays only later-approved uncertainty. B+V+F; RF. No additional fields. Invariants/failure: amount/range/unavailable strict union, fee assumptions explicit, no guaranteed final price or automatic pharmacy/product choice. Concurrency/supersession: expire on changed source/prescription/product/quantity/pharmacy/payer/date/policy; new estimate and required material-change acknowledgement, never silent rewrite. Audit: estimate reference/expiry/change, not amount or payer content. Blockers: T08-D08/D21/D22/D28.

### D21 — CoverageEstimate

Purpose/authority: external-reference-only PY/PH coverage estimate, never eligibility or payment guarantee. B+V+F; RF. No additional fields. Invariants/failure: unknown coverage stays unknown; no covered/free promise, clinical instruction or claim eligibility. Concurrency/supersession: same F source/expiry rules, independent record from PriceEstimate. Audit: estimate status/reference only. Blockers: T08-D08/D21/D28; payer sources and rules NOT VERIFIED.

### D22 — AdjudicationReference

Purpose/authority: external-reference-only PY authoritative adjudication after approved reconciliation, not Task 08 execution. B; RF.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| itemRef — exact financial item lineage | `Ref<FulfilmentRequestItem>`; N | PH/PY / finance receiver | H / L0 |
| pharmacyTransactionRef — surrogate of source transaction | `Ref<PY transaction>`; N | PY / authorized receiver | C / L0 |
| resultCategory — minimized source outcome | `Code<accepted, rejected, reversed, duplicate, timeout, uncertain, stale>`; N; mappings PENDING | PY / finance owner accepts | C / L3 |
| authoritativeResultRef — protected final facts elsewhere | `Ref<PY result>`; Y(no definitive result); not card/policy data | PY / finance owner | E / L3 |
| sourceOccurredAt — source response time | Instant; N | PY / receiver validates | C / L0 |
| operationRef — request/acknowledgement association | `Ref<ExternalOperation>`; N | AR/PY / AR | S / L0 |
| reconciliationRef — conflict/uncertainty resolution | `Ref<ReconciliationCase>`; Y(no uncertainty) | Finance owner / finance owner | C / L1 |

Invariants/failure: accepted adjudication is not payment, release, dispensing or a Task 08 claim. Raw payer rejection text never becomes public error. Concurrency/supersession: append source outcomes/reversal links via operation/receipt, compare source version, preserve late conflicts; no local forced finality. Audit: reference and safe outcome only. Blockers: T08-D08/D21/D28/D29; production adjudication BLOCKED.

### D23 — PaymentReference

Purpose/authority: external-reference-only PM/finance-ledger facts. B; RF. No provider or ledger selected.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — exact request scope | `Ref<FulfilmentRequest>`; N | AR/PM / finance owner | H / L0 |
| ledgerTransactionRef — mapped source financial record | `Ref<PM ledger transaction>`; Y(no transaction/uncertain); cannot imply success | PM / finance receiver | C / L0 |
| paymentState — separate financial dimension | `Code<Task 08 H synthetic payment states, plus UNKNOWN>`; N; accepted source mapping required | PM/finance ledger / finance owner | C / L3 |
| authorizationPolicyRef — allowed timing/patient confirmation policy | `Ref<approved finance policy>`; N before simulated policy-dependent success | Finance/PH owner / finance receiver | S / L0 |
| patientConfirmationRef — approval of current financial terms if required | `Ref<approved acknowledgement>`; Y(policy permits none); unknown policy blocks | PA through ID / finance receiver | H / L0 |
| operationRef — idempotent requested effect/acknowledgement | `Ref<ExternalOperation>`; N | AR/PM / AR | S / L0 |
| priorPaymentRef — cancellation/refund/dispute lineage | `Ref<PaymentReference>`; Y(first financial observation) | PM ledger / finance receiver | C / L0 |
| reconciliationRef — uncertainty requiring owner decision | `Ref<ReconciliationCase>`; Y(no uncertainty) | Finance / finance owner | C / L1 |

Invariants/failure: payment never authorizes release/receipt or creates/submits/reverses a claim. No raw card/CVV/payer data. Concurrency/supersession: append source ledger observations; unknown capture/refund result blocks retry, late outcomes reconcile without overwriting history. Audit: operation/payment reference and safe outcome, no payment details. Blockers: T08-D08/D21/D22/D28/D29; all real financial effects BLOCKED.

## 7. Contract catalogue — pickup, delivery and custody

### D24 — PickupPlan

Purpose/authority: PH operational plan recorded by AR, separate from PA preference and professional release. B+V; RD.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — request to collect | `Ref<FulfilmentRequest>`; N | AR / PH | H / L0 |
| packageRefs — exact pharmacy-controlled packages | `Refs<CustodyPackage>`; N; empty only during planning | PH manifest / PH | H / L2 |
| releaseRefs — per-item current authorization | `Refs<ReleaseAuthorization>`; N; empty while unready only | PH / PH | H / L2 |
| readinessVersionRef — derived current guard evaluation | `Ref<versioned readiness projection>`; Y(not ready); not a professional decision | AR using current PH/ID facts / AR | H / L1 |
| windowStart — safe pickup range start | Instant; Y(window not approved); paired with windowEnd | PH schedule/policy / PH | H / L2 |
| windowEnd — safe pickup range end | Instant; Y(window not approved); strictly after start | PH schedule/policy / PH | H / L2 |
| timezone — authoritative display zone | Zone; N | Approved pharmacy configuration / AR | N / L0 |
| recipientAuthorizationRef — current receiving authority | `Ref<PickupRecipientAuthorization>`; Y(not verified); no handoff then | ID/PH / PH | S / L2 |
| counsellingRefs — applicable consultation requirements | `Refs<CounsellingRequirementReference>`; N; approved applicability determines completeness | PH / PH | H / L2 |
| accommodationRef — protected accessibility arrangement | `Ref<approved accommodation>`; Y(none required/supplied) | PA/PH / authorized PH | E / L2 |
| handoffState — plan progress, not self-approved receipt | `Code<pending, ready derived, handoff pending, proof review, completed, failed, expired, unknown>`; N; PROPOSED | PH custody acceptance / AR | H / L1 |
| proofRefs — accepted handoff evidence mapped to exact packages | `Refs<ProofOfHandoff>`; N; may be empty while pending; each accepted proof covers only its referenced package | PH / PH | E / L2 |
| completionExceptionRefs — separately approved package-specific completion exceptions | `Refs<PH approved pickup completion exception>`; N; may be empty; never establishes receipt for a package without accepted proof | Actual PH / PH | H / L2 |
| returnRef — independent return process | `Ref<ReturnCase>`; Y(no return) | PH / PH | H / L1 |
| dispositionRef — independent professional disposition | `Ref<StockDispositionReference>`; Y(no disposition) | PH / PH | H / L2 |

Invariants/failure: no window, identity, counselling or release shortcut; no-show/expiry is not receipt/restock/refund. No unattended, remote or unapproved curbside pickup. Proof and any separately approved exception are package-specific: proof for package A cannot complete package B, and one package cannot complete a multi-package plan. Plan completion is derived only after every required package has accepted applicable proof or a separately approved exception; an exception does not fabricate physical receipt. Current recipient authorization and professional release requirements remain independently satisfied for every applicable package. Unknown, partial, mismatched or unaccepted proof fails closed. Concurrency/supersession: V plan revision, current release/recipient/package/proof/exception versions and expiry rechecked immediately before handoff and completion; stale plan loses readiness. Audit: plan/window lifecycle and per-package accepted proof/exception references, no accommodation/address. Blockers: T08-D06/D20/D23/D26/D27/D35.

### D25 — PickupRecipientAuthorization

Purpose/authority: ID relationship/grant plus PH-approved pickup assurance; no new identity service. B+V; RC.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| pickupPlanRef — exact plan/request/pharmacy scope | `Ref<PickupPlan>`; N | AR/PH / PH | H / L0 |
| patientSubjectRef — patient represented | `Ref<ID subject>`; N | ID / ID receiver | H / L0 |
| authorizingActorRef — patient or legally authorized actor | `Ref<ID actor>`; N | ID / PA through approved procedure | I / L0 |
| recipientRef — person who may receive, not courier | `Ref<ID recipient>`; N | ID/PH procedure / PH | I / L0 |
| relationshipCategory — supported relationship evidence category | `Code<approved recipient relationships>`; N; not free text | ID / PH verifies | I / L0 |
| grantRef — independent receiving authority | `Ref<AuthorizedRecipientGrant>`; N, including patient-receipt assurance as applicable | ID and PH procedure / PH | S / L2 |
| captureMethod — approved means of obtaining authorization | `Code<approved capture methods>`; N | ID/PH / authorized receiver | S / L0 |
| pharmacyConfirmationRef — required pickup procedure confirmation | `Ref<PH recipient verification>`; Y(pending/approved non-applicability); no reliance if required and absent | PH / PH | S / L2 |
| authorizationStatus — current accepted verification projection | Fact; N | ID plus PH / PH | S / L2 |

Invariants/failure: phone/email/OTP/link/DOB/address possession alone never establishes identity or recipient authority; request/view grant is not receipt scope. Concurrency/supersession: V effective/expiry/revocation mandatory, recheck under handoff serialization; old grant cannot authorize new plan. Audit: grant/plan/outcome only. Blockers: T08-D06/D14/D23/D26/D30.

### D26 — PickupHandoff

Purpose/authority: PH records actual direct pickup custody; AR validates evidence, not physical truth by inference. B; RD.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| pickupPlanRef — current plan | `Ref<PickupPlan>`; N | PH / PH | H / L0 |
| packageRef — exact physical package | `Ref<CustodyPackage>`; N | PH manifest / PH | H / L0 |
| recipientAuthorizationRef — verified current recipient | `Ref<PickupRecipientAuthorization>`; N | ID/PH / PH | S / L2 |
| releaseRefs — current item releases consumed | `Refs<ReleaseAuthorization>`; N; all included items required | PH / actual authorized handoff staff | H / L0 |
| proofRef — accepted recipient receipt evidence | `Ref<ProofOfHandoff>`; Y(no successful handoff); required for success | PH / PH | E / L3 |
| result — physical outcome, not preparation status | `Code<received, denied, not collected, unknown>`; N; PROPOSED, receipt requires proof | PH physical process / PH | H / L3 |
| handoffAt — actual supported time | Instant; Y(no actual transfer) | PH evidence / PH | H / L0 |
| exceptionRef — failure or disputed handoff | `Ref<FulfilmentException>`; Y(no exception) | PH / PH | H / L3 |

Invariants/failure: direct recipient pickup is not courier collection; wrong/unknown recipient cannot receive. Concurrency/supersession: one accepted physical transfer per package custody version; append correction/dispute, do not delete event or fabricate reversal. Audit: custody/proof references and before/after versions atomically. Blockers: T08-D20/D23/D26/D29/D32.

### D27 — DeliveryPlan

Purpose/authority: PH owns approved transport plan; CV is transport source only, AR coordinator. B+V; RD.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — parent request | `Ref<FulfilmentRequest>`; N | AR / PH | H / L0 |
| packageRefs — exact manifest-bound packages | `Refs<CustodyPackage>`; N; empty only while planning | PH / PH | H / L2 |
| preferenceRef — current explicit delivery choice | `Ref<FulfilmentPreference>`; N | PA via ID / PH verifies | H / L2 |
| addressRef — separately encrypted destination | `Ref<DeliveryAddress>`; N | PA/PH / PH | E / L2 |
| addressVerificationRef — exact address revision verified | `Ref<DeliveryAddressVerification>`; Y(pending); mandatory before booking | Approved verification procedure / PH | S / L2 |
| serviceAreaRef — approved service area | `Ref<approved area>`; N before relying on plan | PH policy / PH | N / L2 |
| jurisdictionRef — approved jurisdiction, not inferred GPS | `Ref<approved jurisdiction>`; N | PH policy/source evidence / PH | N / L2 |
| recipientGrantRef — prior authorized patient/agent receipt | `Ref<AuthorizedRecipientGrant>`; Y(pending); mandatory before handoff | ID/PH / PH | S / L2 |
| releaseRefs — current per-item release | `Refs<ReleaseAuthorization>`; N; empty in planning only | PH / PH | H / L2 |
| storageSecurityRefs — bounded complete item-specific requirements for every package manifest | `Refs<StorageAndSecurityRequirement>`; N; non-empty before reliance; exact bound PENDING approval | PH requirement set / PH | H / L2 |
| courierRef — approved provider mapping | `Ref<approved CV provider>`; Y(not assigned) | Approved vendor registry / PH | S / L2 |
| serviceLevelRef — contracted service, not guessed SLA | `Ref<approved CV service level>`; Y(not assigned) | Contract registry / PH | C / L2 |
| courierBookingRef — acknowledged booking, not attempted call | `Ref<ExternalOperation>`; Y(not acknowledged) | CV + reconciled operation / PH | S / L2 |
| shipmentRef — mapped transport record, no public tracking number | `Ref<CV shipment>`; Y(no confirmed shipment) | CV validated mapping / PH | S / L0 |
| windowStart — approved delivery range start | Instant; Y(not scheduled) | PH/CV approved plan / PH | H / L2 |
| windowEnd — approved delivery range end | Instant; Y(not scheduled); paired and after start | PH/CV / PH | H / L2 |
| timezone — approved pharmacy/display zone | Zone; N | Server configuration / AR | N / L0 |
| exceptionRefs — blocking/contained exceptions | `Refs<FulfilmentException>`; N; may be empty | PH/AR / assigned owner | H / L1 |
| reconciliationRefs — unknown booking/transport outcomes | `Refs<ReconciliationCase>`; N; may be empty | PH/AR / assigned owner | H / L1 |

Invariants/failure: no booking before current release and all J eligibility guards; courier identity/contract/access is currently absent. Changed/unverified address, excluded class/jurisdiction or unknown policy blocks. Every applicable item in every package manifest requires a current item-specific storage/security requirement matching the exact request, item, package and pharmacy scope; missing, stale, contradictory or mismatched coverage blocks, and one item's requirement cannot satisfy another. Combined packaging/handling suitability is a PH-owned decision; AR validates only completeness, consistency and current references and never infers clinical or storage suitability. Concurrency/supersession: V plan/recipient/address/release/package/requirement source versions bound; changes after uncertain/acknowledged booking reconcile rather than auto-rebook. Audit: plan/source/operation and minimized requirement-reference coverage, no address, medication, handling content or courier metadata. Blockers: T08-D06/D16/D20/D24–D30.

### D28 — DeliveryAddress

Purpose/authority: PA-provided destination, not identity or address-verification proof. Separate protected evidence object; B+V; RD with address-specific necessity/retention review.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| patientSubjectRef — subject, independently authorized | `Ref<ID subject>`; N | ID / AR | H / L0 |
| suppliedByActorRef — actual contributor | `Ref<ID actor>`; N | ID / PA | I / L0 |
| line1 — necessary delivery address line | Bounded Unicode text; N for complete address; approved size/character policy PENDING | Explicit PA input / authorized receiver | E / L0 |
| line2 — necessary unit/address continuation | Bounded Unicode text; Y(not applicable); no clinical/free-form instructions | Explicit PA input / authorized receiver | E / L0 |
| locality — address locality | Bounded Unicode text; N | PA / authorized receiver | E / L0 |
| region — supplied jurisdiction component | `Code<approved address regions>`; N; never pharmacy authority | PA statement / PH verification | E / L0 |
| postalCode — address postal component | Bounded text under approved jurisdiction validator; N; exact format policy PENDING | PA / PH verification | E / L0 |
| countryCode — supplied country, later scope-checked | `Code<approved jurisdiction countries>`; N; no default | PA / PH verification | E / L0 |
| sourceCategory — explicit capture method | `Code<approved manual/assisted input>`; N; GPS/IP/history inference forbidden | Receiver provenance / AR | S / L0 |
| confirmedByActorRef — subject-authorized confirmation | `Ref<ID actor>`; Y(not confirmed) | ID / PA | I / L0 |
| confirmedAt — accepted confirmation time | Instant; Y(not confirmed); paired with confirming actor | Trusted clock / AR | H / L0 |

Invariants/failure: no name/contact/clinical instructions bundled into address fields; reject control/extra data under later limits. Address, including its postal components, is field-encrypted and separately access-controlled; no URLs/logs/audit/analytics. Concurrency/supersession: V immutable revision; material change invalidates verification/plan, reconfirmation mandatory. Audit: opaque revision/confirmation reference only. Blockers: T08-D06/D14/D24/D30/D33/D35; no real address collection now.

### D29 — DeliveryAddressVerification

Purpose/authority: reference-only approved verification procedure/source plus PA confirmation; not recipient authority. B+V; RD.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| addressRef — exact immutable address revision | `Ref<DeliveryAddress>`; N | AR / PH | E / L0 |
| methodCategory — approved manual/provider evidence method | `Code<address verification methods>`; N; no method selected here | Approved procedure / PH | S / L0 |
| verificationStatus — current source-supported result | Fact; N | Approved verifier / PH accepts | S / L2 |
| verifiedAt — source verification time | Instant; Y(not verified); required when CONFIRMED | Verification source / PH | H / L0 |
| serviceAreaRef — evaluated area | `Ref<approved area>`; N | PH policy / verifier | N / L0 |
| jurisdictionRef — evaluated jurisdiction | `Ref<approved jurisdiction>`; N | PH policy / verifier | N / L0 |
| verificationEvidenceRef — protected source proof | `Ref<address verification evidence>`; Y(pending); required for confirmation | Approved verifier / PH | E / L0 |

Invariants/failure: source success cannot override wrong jurisdiction/unknown recipient; manual accessible alternative must meet approved assurance. Concurrency/supersession: V expires on address/material policy change, compare exact address revision. Audit: status/method/reference only, never address. Blockers: T08-D24/D28/D30/D35.

### D30 — AuthorizedRecipientGrant

Purpose/authority: future ID authority for relationship plus PH receiving policy; proposed reference contract, not a fabricated grant or courier credential. B+V; RC.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| patientSubjectRef — person for whom receipt is authorized | `Ref<ID subject>`; N | ID / authorized ID receiver | H / L0 |
| authorizingActorRef — patient or legally authorized actor | `Ref<ID actor>`; N | ID / PA under approved procedure | I / L0 |
| actorSubjectRelationshipRef — grant-creation authority | `Ref<ID relationship>`; N | ID / PH validates | S / L2 |
| recipientRef — distinct receiving person | `Ref<ID recipient>`; N | ID / PH verifies | I / L0 |
| recipientType — patient versus specified agent | PATIENT or PRE_AUTHORIZED_AGENT; N | ID + PH procedure / PH | I / L0 |
| requestRef — precise request scope | `Ref<FulfilmentRequest>`; N | AR / ID and PH | H / L0 |
| actionScope — receiving action only | `Code<approved pickup receipt or delivery receipt scopes>`; N; exact names PENDING, no wildcard | ID issued grant / PH validates | S / L2 |
| relationshipCategory — reviewed relationship basis | `Code<approved relationship categories>`; N; not self-asserted legal authority | ID / PH | I / L0 |
| captureMethod — evidence of prior designation | `Code<approved grant methods>`; N | ID/PH / authorized receiver | S / L0 |
| pharmacyConfirmationRef — required receiving-policy assurance | `Ref<PH confirmation>`; Y(pending/approved non-applicability only) | PH / PH | S / L2 |

Invariants/failure: V effective/expiry/revocation and required source evidence must be present; no courier self-grant, phone/OTP/link/DOB shortcut, request/view grant reuse or automatic legal-agent inference. For PATIENT, ID evidence must bind recipient to subject; for agent, independent pre-authorization is mandatory. Concurrency/supersession: serialize grant/revocation with handoff using current trusted time and lineage; append revocation, never widen an existing grant. Audit: grant/revocation/denial reference under approved catalogue. Blockers: T08-D06/D14/D23/D24/D26/D30.

### D31 — CustodyPackage

Purpose/authority: PH owns physical package and manifest; AR projects accepted custody only. B; RD.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — exact request, no cross-subject reuse | `Ref<FulfilmentRequest>`; N | PH manifest / PH | H / L0 |
| itemRefs — server-only item manifest | `Refs<FulfilmentRequestItem>`; N; non-empty before package activation | PH / PH | H / L0 |
| manifestVersion — immutable included-item revision | Version; N | PH / PH | S / L0 |
| deliveryPlanRef — applicable transport plan | `Ref<DeliveryPlan>`; Y(pickup or no plan yet) | PH / PH | H / L2 |
| pickupPlanRef — applicable direct collection plan | `Ref<PickupPlan>`; Y(delivery or no plan yet); active mode mutually exclusive | PH / PH | H / L2 |
| sealEvidenceRef — tamper/security evidence | `Ref<PH seal evidence>`; Y(unpackaged/pending); required if policy requires before handoff | PH / authorized handler | E / L2 |
| storageSecurityRefs — bounded item-specific requirement set for the complete manifest | `Refs<StorageAndSecurityRequirement>`; N; non-empty before activation; exact bound PENDING approval | PH requirement set / PH | H / L2 |
| combinedHandlingSuitabilityRef — PH-owned decision for the exact package manifest and requirement revisions | `Ref<PH combined packaging/handling suitability decision>`; Y(pending or approved non-applicability); required whenever approved policy requires the decision | Actual PH / PH | H / L2 |
| currentHolderRef — accepted current custody actor/location class | `Ref<authorized custodian>`; Y(holder genuinely unknown); not a patient guess | PH accepted custody chain / AR projection | I / L1 |
| custodyState — orthogonal physical state | `Code<Task 08 F custody states>`; N; CUSTODY_UNKNOWN when unproven | Accepted PH custody evidence / AR | H / L1 |
| latestCustodyEventRef — accepted source for current projection | `Ref<CustodyEvent>`; Y(no accepted event yet) | PH / AR | H / L1 |

Invariants/failure: package ID/outer metadata contains no medication or identity; manifest cannot mix patients. Every manifest item must have complete current requirements matching the exact request, item, package and pharmacy scope; missing, stale, contradictory or mismatched coverage blocks activation/progression, and one item's requirement never stands in for another. AR validates coverage and reference consistency only; combined packaging/handling suitability remains PH-owned and AR never infers clinical or storage suitability. Unknown holder requires CUSTODY_UNKNOWN, not implicit pharmacy custody. Concurrency/supersession: versioned accepted event sequence, one current holder projection; package/manifest/requirement/decision revisions rechecked together and corrected history never overwritten. Audit: package/event/manifest-version and minimized requirement/decision refs only, never requirement content. Blockers: T08-D18/D20/D25/D27/D30.

### D32 — CustodyEvent

Purpose/authority: append-only physical observation; PH accepts/reconciles source evidence. CV raw scans alone cannot establish patient receipt. B; RD.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| packageRef — physical package | `Ref<CustodyPackage>`; N | PH mapping / validated receiver | H / L0 |
| eventCategory — exact physical observation | `Code<pharmacy secured, courier pickup, transit, attempt, recipient handoff, failure, return started, return pharmacy receipt, exception, unknown>`; N; PROPOSED | PH/CV observation / PH acceptance | H / L3 |
| previousAcceptedEventRef — prior verified chain link | `Ref<CustodyEvent>`; Y(initial chain); cannot self-link | PH accepted chain / AR | H / L0 |
| fromHolderRef — supported previous custodian | `Ref<custodian>`; Y(initial/unknown holder only) | Physical evidence / PH | I / L3 |
| toHolderRef — supported receiving custodian | `Ref<custodian>`; Y(no transfer/unknown holder only) | Physical evidence / PH | I / L3 |
| occurredAt — source physical event time | Instant; N; unverified time cannot advance state | PH/CV evidence / PH validates | H / L0 |
| eventTimezone — source/approved zone for evidence display | Zone; N | Evidence and approved configuration / PH | H / L0 |
| proofRef — recipient proof where event requires it | `Ref<ProofOfHandoff>`; Y(non-recipient event); required for accepted recipient receipt | PH / PH | E / L3 |
| evidenceDigest — integrity of minimized approved evidence | Digest; N | Authenticated receiver / PH acceptance | S / L0 |
| acceptanceRef — separate scoped PH acceptance/reconciliation | `Ref<PH custody acceptance>`; Y(not accepted) | PH / authorized PH | H / L3 |
| consumedCustodyVersion — version against which acceptance was applied | Version; Y(unaccepted observation); required for projection change | AR transaction / PH-authorized AR | S / L0 |

Invariants/failure: receipt, pickup/in-transit, attempted/handoff/failure, return-started and return-confirmed times are separate events, not one delivered timestamp. Event receipt time is B.createdAt. No claim or pharmacy-label effect. Concurrency/supersession: L3 dedup/version/order checks; late contradictory observations retained/reconciled, not applied retroactively over current truth. Audit: accepted event/state versions, not scan/raw body. Blockers: T08-D25–D29/D32.

### D33 — StorageAndSecurityRequirement

Purpose/authority: PH-approved product handling policy; AR records requirement reference, never product suitability. B+V; RD.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — exact request whose item/package relationship is covered | `Ref<FulfilmentRequest>`; N | PH manifest / PH | H / L0 |
| packageRef — exact package whose manifest contains the item | `Ref<CustodyPackage>`; N | PH manifest / PH | H / L0 |
| itemRef — item with requirements | `Ref<FulfilmentRequestItem>`; N | PH / PH | H / L0 |
| temperatureCategory — source-approved category | `Code<approved storage temperatures>`; N; no numeric range selected | PH approved product policy / PH | H / L2 |
| lightMoistureOrientationRefs — individually required handling facts | `Refs<PH handling requirements>`; N; approved applicability controls empty set | PH / PH | H / L2 |
| securityCategory — seal/security/access requirement | `Code<approved security categories>`; N | PH / PH | H / L2 |
| directRouteRequirementRef — permitted transport model | `Ref<approved direct-route policy>`; N; deviations require separate exception | PH/DM / PH | H / L2 |
| packagingMethodRef — approved method, no instructions generated | `Ref<PH packaging policy>`; N | PH / PH | H / L2 |
| packagedAt — evidenced packaging time | Instant; Y(not yet packaged) | PH handler / PH | H / L0 |
| maximumTransitPolicyRef — source-owned permitted duration | `Ref<approved duration policy>`; N before transport; value PENDING | PH/DM / PH | H / L2 |
| loggerRequirement — explicit evidence need | `Code<required, approved not required, unknown>`; N | PH / PH | H / L2 |

Invariants/failure: each requirement applies only to its exact same-scope request/item/package/pharmacy relationship. Every applicable manifest item requires complete coverage; missing, stale, contradictory or mismatched requirements block, and one item's requirement cannot satisfy another item. Combined packaging/handling suitability remains a PH-owned decision; AR validates completeness and consistency only and does not infer clinical, product, storage or transport suitability. No guessed cold-chain limits, stops or relay. Concurrency/supersession: V current request/item/package/product/policy revision and involved state versions, invalidate dependent stale package/plan. Audit: requirement/policy and matched lineage references, no drug or handling content. Blockers: T08-D16/D19/D25/D27/D28.

### D34 — TemperatureEvidence

Purpose/authority: source observation only; PH evaluates exceptions/suitability. B; RD.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| packageRef — monitored package | `Ref<CustodyPackage>`; N | PH/CV mapping / PH | H / L0 |
| requirementRef — exact policy consumed | `Ref<StorageAndSecurityRequirement>`; N | PH / PH | H / L0 |
| sourceEvidenceRef — protected logger/evidence record | `Ref<approved temperature evidence>`; Y(missing/unreadable evidence) | Approved logger/CV/PH / PH verifier | E / L0 |
| observationStart — observed interval start | Instant; Y(no reliable interval) | Evidence source / PH | H / L0 |
| observationEnd — observed interval end | Instant; Y(no reliable interval); paired and not before start | Evidence source / PH | H / L0 |
| resultCategory — technical evidence result | `Code<source within approved limits, excursion, missing, stale, unreadable, unknown>`; N; PROPOSED | Approved verifier / PH | H / L3 |
| professionalReviewRef — disposition/exception determination | `Ref<PH decision>`; Y(pending); never inferred from technical success | PH / actual PH | H / L2 |
| exceptionRef — preserved excursion/missing-evidence issue | `Ref<FulfilmentException>`; Y(no issue) | PH/AR / authorized receiver | H / L3 |

Invariants/failure: technical category never declares exposed product suitable; missing/fabricated evidence blocks handoff/use pending PH review. Concurrency/supersession: immutable interval/source version, append corrected observation; compare package/current requirements and preserve exception. Audit: coarse result/reference only, no logger corpus. Blockers: T08-D25/D27/D28/D33.

### D35 — DeliveryAttempt

Purpose/authority: PH-approved attempt with CV observations, no independent courier authority. B; RD.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| deliveryPlanRef — exact current plan | `Ref<DeliveryPlan>`; N | PH / PH | H / L0 |
| packageRef — exact package | `Ref<CustodyPackage>`; N | PH manifest / PH | H / L0 |
| courierAssignmentRef — separately verified agent assignment | `Ref<approved CV assignment>`; N | CV contract + PH acceptance / PH | S / L2 |
| attemptedAt — actual evidence time | Instant; Y(not yet attempted) | CV/PH evidence / PH validates | H / L0 |
| resultCategory — coarse observation | `Code<pending, proof pending, failed, custody exception, receipt accepted, unknown>`; N; PROPOSED | CV observation, PH accepts / PH | H / L3 |
| proofRef — matched receipt evidence | `Ref<ProofOfHandoff>`; Y(no proof) | PH / PH | E / L3 |
| priorAttemptRef — linked earlier attempt | `Ref<DeliveryAttempt>`; Y(first attempt) | PH / PH | H / L0 |
| retryAuthorizationRef — explicit policy/current-guard approval | `Ref<PH retry approval>`; Y(first attempt/no retry); required before later attempt | PH / PH | S / L2 |
| exceptionRef — failure/unknown custody detail reference | `Ref<FulfilmentException>`; Y(no exception) | PH/CV evidence / PH | H / L3 |

Invariants/failure: failed attempt is not receipt and cannot become a success by timeout; any later successful attempt requires its own matched proof and pharmacy acceptance. No automatic second attempt. Concurrency/supersession: current release/address/recipient/storage/time/payment policy rechecked; append attempts, never overwrite a failed attempt to conceal it. Audit: attempt/ref/outcome, no address or tracking number. Blockers: T08-D20/D24–D29.

### D36 — ProofOfHandoff

Purpose/authority: minimum evidence of physical recipient receipt; PH alone accepts/reconciles under approved procedure. B; RD; not proof by webhook assertion.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| packageRef — exact delivered/collected package | `Ref<CustodyPackage>`; N | PH manifest / PH | H / L0 |
| deliveryAttemptRef — transport attempt | `Ref<DeliveryAttempt>`; Y(direct pickup); exactly one of attempt or pickupHandoffRef | CV/PH mapping / PH | H / L0 |
| pickupHandoffRef — direct pickup evidence | `Ref<PickupHandoff>`; Y(delivery); exactly one branch | PH / PH | H / L0 |
| recipientType — patient versus prior authorized agent | PATIENT or PRE_AUTHORIZED_AGENT; N | ID/PH / PH | I / L0 |
| recipientAuthorizationRef — correct currently valid receiving grant | `Ref<AuthorizedRecipientGrant>`; N | ID/PH / PH | S / L2 |
| identityCheckMethodCategory — approved method, not raw identity data | `Code<approved identity methods>`; N | PH procedure / authorized verifier | S / L0 |
| identityCheckResult — coarse assurance outcome | `Code<matched, not matched, unavailable, unknown>`; N; PROPOSED | Approved verification / PH accepts | E / L3 |
| signatureRequiredStatus — policy applicability | `Code<required, exception under review, approved exception>`; N; no default waiver | PH policy / PH | H / L2 |
| signatureCapturedStatus — evidence form without raw mark | `Code<patient signature evidenced, agent signature evidenced, witnessed mark evidenced, not captured, unknown>`; N; PROPOSED | Approved evidence procedure / PH | E / L3 |
| approvedExceptionRef — explicit G14 exception if applicable | `Ref<PH exception decision>`; Y(not needed); mandatory for accepted no-signature exception | Actual PH / PH | H / L2 |
| handoffAt — actual supported custody-transfer time | Instant; Y(no successful physical event); required for accepted receipt | PH/CV evidence / PH | H / L0 |
| handoffTimezone — explicit time context | Zone; N | Approved source/configuration / PH | H / L0 |
| deliveryAgentRef — assigned courier for delivery only | `Ref<CV agent>`; Y(direct pickup); never recipient identity | Approved assignment / PH validates | I / L0 |
| coarseResult — submitted observation | `Code<receipt claimed, denied, recipient unavailable, disputed, unknown>`; N; PROPOSED | Physical evidence / PH validates | H / L3 |
| evidenceIntegrityDigest — bound package/attempt/proof integrity | Digest; N | Approved evidence verifier / PH | S / L0 |
| pharmacyAcceptanceState — separate accepted truth | `Code<pending, accepted, rejected, disputed, reconciliation required>`; N; PROPOSED | PH custody procedure / PH | H / L3 |
| reconciliationRef — disputed/unmatched proof handling | `Ref<ReconciliationCase>`; Y(no uncertainty/dispute) | PH / PH | H / L1 |

Invariants/failure: unknown/wrong/expired/revoked recipient or incomplete proof cannot establish receipt. Proof is valid only for its exact package and custody transition; package A proof cannot complete package B or an entire multi-package plan. Plan completion requires accepted applicable proof for every required package or a separately approved package-specific exception, while recipient authorization and professional release remain independently current for each package; unknown or partial proof fails closed. Courier is not patient agent. No retained identity-document/facial images, biometric templates, raw signatures, handoff photos or exact geolocation; any such proposal needs separate necessity/privacy/retention/vendor approval. A signature-status fact is not permission to store the signature. Concurrency/supersession: immutable submitted proof plus append-only acceptance/dispute decisions; match exact attempt/package/version and current grant, deduplicate copied evidence; later review cannot invent physical handoff. Audit: proof/acceptance refs only, never identity result or raw evidence. Blockers: T08-D06/D23/D26/D27/D30/D33/D35.

### D37 — FulfilmentException

Purpose/authority: AR coordinates containment; PH and each fact owner decide professional/physical/financial response. B; RD (finance-specific evidence stays RF at source).

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — affected request | `Ref<FulfilmentRequest>`; N | AR / authorized receiver | H / L0 |
| packageRef — affected package if any | `Ref<CustodyPackage>`; Y(pre-package exception) | PH / PH | H / L0 |
| category — safe bounded issue | `Code<Task 08 J custody exceptions and approved operational blockers>`; N; exact registry PENDING | Fact owner / AR accepts safe category | H / L0 |
| evidenceRef — protected minimal source evidence | `Ref<approved exception evidence>`; N | Fact owner / authorized receiver | E / L0 |
| containmentState — current required coordination hold | `Code<pending review, held, response authorized, reconciled, unknown>`; N; PROPOSED | Relevant owner / AR | H / L1 |
| professionalDecisionRef — G14 or other exact professional decision | `Ref<PH decision>`; Y(pending/not professional) | Actual PH / PH | H / L2 |
| workItemRef — accountable follow-up | `Ref<FulfilmentWorkItem>`; N | AR/PH / AR | H / L1 |
| reconciliationRef — conflicting external/physical state | `Ref<ReconciliationCase>`; Y(no uncertainty) | Fact owner / AR | H / L1 |

Invariants/failure: no automatic harm, breach/reportability, medication-incident, claim-fraud or suitability classification; missing evidence never clears a blocker. Concurrency/supersession: preserve original exception, append containment/resolution against current state; linked active blockers remain independent. Audit: minimized containment/decision reference. Blockers: T08-D20/D25–D29/D32–D35.

### D38 — ReturnCase

Purpose/authority: PH controls authorized destination and verifies physical return; CV supplies raw transport observations. B; RD.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| packageRef — original package/item lineage | `Ref<CustodyPackage>`; N | PH manifest / PH | H / L0 |
| returnAuthorizationRef — approved return procedure decision | `Ref<PH return authorization>`; N before return movement | PH / PH | S / L2 |
| destinationPharmacyRef — correct receiving pharmacy, not tenant authority | `Ref<approved return destination>`; N | PH original custody/source mapping / PH | H / L0 |
| currentHolderRef — actual holder or explicitly unknown | `Ref<custodian>`; Y(CUSTODY_UNKNOWN only) | Accepted custody chain / PH | I / L1 |
| returnState — return-specific progression | `Code<requested, authorized, returning, returned, custody unknown>`; N; PROPOSED; canonical mapping per §8 | PH accepted custody / AR | H / L1 |
| returnStartedAt — supported physical return start | Instant; Y(not begun) | PH/CV accepted event / PH | H / L0 |
| pharmacyReceiptEventRef — verified correct-pharmacy receipt | `Ref<CustodyEvent>`; Y(not physically verified); mandatory for returned | Receiving PH / authorized PH | H / L3 |
| returnConfirmedAt — verified physical receipt time | Instant; Y(not verified); match receipt evidence | Receiving PH / PH | H / L0 |
| delayExceptionRefs — preserved delays/wrong-location incidents | `Refs<FulfilmentException>`; N; empty only when none | PH/CV evidence / PH | H / L3 |
| segregationEvidenceRef — pharmacy quarantine/separation | `Ref<PH segregation evidence>`; Y(pending receipt/segregation); required before disposition relies on it | Receiving PH / PH | E / L3 |
| dispositionRef — independent stock decision | `Ref<StockDispositionReference>`; Y(pending); never inferred from returned | Actual PH / PH | H / L2 |

Invariants/failure: **RETURNED requires verified physical custody at the correct pharmacy. A delayed return may still become RETURNED after verified physical receipt; delay/exception evidence remains and disposition stays separate.** Wrong/missing receipt cannot establish returned. Return never auto-restocks, re-dispenses, destroys, refunds or creates/reverses a claim. Concurrency/supersession: source/custody versions checked, append movement/receipt/exception evidence; one receipt cannot be replayed for another package. Audit: actual receiving actor and receipt/disposition references, no content. Blockers: T08-D25/D27/D29/D32/D33/D34.

### D39 — StockDispositionReference

Purpose/authority: PH-authoritative G15, external-reference-only; AR never executes stock disposition. P; RP; itemRef mandatory.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| returnCaseRef — verified return/segregation lineage | `Ref<ReturnCase>`; N | PH / actual PH | H / L0 |
| custodyReceiptRef — correct-pharmacy physical receipt | `Ref<CustodyEvent>`; N | Receiving PH / actual PH | H / L0 |
| sourceDispositionRef — authoritative disposition decision | `Ref<PH stock disposition>`; Y(pending); required for decided state | Actual PH / actual PH | H / L2 |
| dispositionCategory — minimum supported source outcome | `Code<approved disposition categories>`; N; PENDING/UNKNOWN until exact policy approved | PH / actual PH | H / L2 |
| sourceExecutionEvidenceRef — evidence of any separately authorized source action | `Ref<PH execution evidence>`; Y(not executed/unknown); never a Task 08 command | PH inventory source / PH | C / L3 |

Invariants/failure: confirmed pharmacy return is not saleable inventory. No software reuse/destruction/restock or inferred financial consequence, even after decision receipt. Concurrency/supersession: P binds current return/item/storage/integrity versions; append correction/revocation, source execution independently reconciled. Audit: G15 source/actor/outcome reference only. Blockers: T08-D19/D20/D27/D28/D33/D34.

## 8. Contract catalogue — external operations, reconciliation and work

### D40 — ExternalOperation

Purpose/authority: AR owns durable coordination intent, attempt/acknowledgement tracking and safe replay; the named external fact owner owns any actual effect. B; RT. All proposed adapters are local synthetic doubles only under future scope; this document creates none.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| operationKind — approved fact-specific operation | `Code<operation registry>`; N; PMS/inventory/payer/payment/courier/address/Task 07 kept separate; names PENDING | Approved integration contract / AR | N / L0 |
| direction — intent versus response handling | OUTBOUND or INBOUND; N; PROPOSED | Contract registry / AR | N / L0 |
| requestRef — owning coordination request | `Ref<FulfilmentRequest>`; N | AR scoped lineage / AR | H / L0 |
| resourceRef — exact item/package/plan/reconciliation target | `Ref<typed resource>`; N; operation-specific type only | AR verified lineage / AR | S / L0 |
| initiatingActorRef — authenticated initiator, not body-selected | `Ref<actor>`; N | ID or scoped service identity / AR | I / L0 |
| endpointContractRef — approved schema/auth/limits/mapping | `Ref<approved adapter contract>`; N; no endpoint URL or secret | Integration/security owner / AR | S / L0 |
| vendorAccountRef — scoped surrogate account/environment mapping | `Ref<approved account>`; N; synthetic source only until approved | Server source registry / AR | S / L0 |
| idempotencyKeyDigest — commitment to opaque random key | Digest; N; key contains no data or identifiers | Controlled key receipt / AR | S / L0 |
| canonicalRequestDigest — operation-specific projection binding | Digest; N; only approved references, immutable revision tokens and non-sensitive intent codes; no raw PHI/contact/clinical data | Strict canonical projection / AR | S / L0 |
| consumedStateVersion — current resource version | Version; N | Transactional resource / AR | S / L0 |
| operationState — effect certainty, not domain success | `Code<planned, in progress, acknowledged, definitively failed, uncertain, reconciliation required>`; N; PROPOSED | Accepted operation evidence / AR | S / L1 |
| acknowledgementRef — validated source response | `Ref<approved source acknowledgement>`; Y(no acknowledgement) | Fact owner / authorized receiver | S / L3 |
| safeReplayResponseRef — strict minimized stored response | `Ref<operation-specific validated response snapshot>`; Y(not completed); no raw body | AR committed result / AR | S / L0 |
| correlationRef — independent random non-authorizing reference | `Ref<correlation>`; N; no subject/resource ID embedded | AR issuer / AR | S / L0 |
| attemptOrdinal — bounded attempt sequence | Non-negative integer; N; limits PENDING | AR accepted attempt record / AR | S / L1 |
| lastAttemptAt — trusted attempt acceptance time | Instant; Y(no attempt) | Trusted clock / AR | H / L1 |
| nextEligibleAttemptAt — approved retry scheduling evidence | Instant; Y(no approved retry); never for uncertain effect without reconciliation | Reviewed retry policy + trusted clock / AR | S / L1 |
| leaseEvidenceRef — prospective worker ownership/fencing | `Ref<approved lease/fence>`; Y(no worker claim); no lease policy exists yet | Transactional lease owner / AR | S / L1 |
| reconciliationRef — uncertainty resolution | `Ref<ReconciliationCase>`; Y(no uncertainty); required when uncertain | Fact owner/AR / assigned owner | H / L1 |
| dispatchState — synthetic no-effect boundary | Exactly not_dispatched for future synthetic records; N | Server-owned synthetic context / AR | N / L0 |

Invariants/failure: one logical actor/pharmacy/operation/resource/key scope, changed strict payload conflicts, identical completed response revalidated before storage and replay, authorization rechecked on replay. Immutable referenced payload revisions bind material changes without storing/hashing raw PHI into fingerprints. An expired key cannot justify a duplicate effect. No outbound claim writer or submission operation is allowed; future claim-related references cannot invoke protected billing. Unknown result means reconciliation before retry, not assumed failure/success.

Concurrency/supersession: unique receipt plus resource-version lock/CAS and atomic approved intent/audit/result, fenced attempt ownership; proven rollback leaves no successful receipt. Actual external attempt ledger must be append-only even when operationState is a current projection. No exactly-once vendor claim, no one-size-fits-all timeout/backoff. Audit: operation/correlation/versions/safe outcome only. Blockers: T08-D07/D08/D18/D28/D29/D31/D32; operation request/response/receipt schemas, vendor idempotency and lifecycle values PENDING.

### D41 — ExternalWebhookReceipt

Purpose/authority: AR owns evidence that a bounded event was received; external source remains untrusted until mapped and reconciled. B; RT. Not a webhook route or acknowledgement implementation.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| vendorAccountRef — server-bound sender/account/environment | `Ref<approved account>`; N for accepted inbox row; unknown sender goes only to separately approved minimal denial evidence | Server registry + verified sender / AR | S / L0 |
| eventIdRef — opaque mapped vendor event identity | `Ref<source event>`; N; raw event ID not copied into technical labels/keys | Authenticated receiver / AR | S / L0 |
| eventType — allowlisted vendor contract member | `Code<versioned vendor event registry>`; N; unknown rejected | Approved contract / AR | N / L0 |
| eventSchemaVersion — validated external schema version | Bounded approved source version token; N | Vendor contract / AR | S / L0 |
| payloadIntegrityDigest — digest of authenticated bounded bytes | Digest; N; server-only evidence, not correlation/lookup key | Verified raw-byte receiver / AR | S / L0 |
| authenticationEvidenceRef — protocol/timestamp/replay validation proof | `Ref<approved verification evidence>`; N; contains no key/signature secret | Security protocol / AR | S / L0 |
| sourceOccurredAt — signed/source event time | Instant; N; tolerance policy PENDING | Verified source envelope / AR | H / L0 |
| mappedOperationRef — exactly scoped existing operation | `Ref<ExternalOperation>`; Y(unmapped event); no business processing until resolved | Server mapping / AR | S / L1 |
| safeFactProjectionRef — strictly minimized mapped facts | `Ref<approved fact-specific projection>`; Y(unmapped/invalid); no general raw-body store | Approved parser/mapper / AR | S / L0 |
| processingState — receipt processing, not professional truth | `Code<received, duplicate, mapping pending, processed, rejected, dead letter, reconciliation required>`; N; PROPOSED | Durable inbox processor / AR | S / L1 |
| reconciliationRef — disagreement/order/unknown outcome | `Ref<ReconciliationCase>`; Y(no uncertainty) | Fact owner/AR / assigned owner | H / L1 |

Invariants/failure: verify raw size/content-type before parsing, signing protocol, timestamp, replay, environment/account/pharmacy, type/version and payload. Durable valid inbox precedes domain processing; same event/different digest is conflict, not overwrite. No webhook directly establishes prescription acceptance/rejection, clarification resolution, product/therapy, check, counselling, release, patient receipt, final payment, claim or restock. Raw bodies are not logs or audit; any necessary preserved original stays with an approved source/evidence custodian, not an arbitrary inbox JSON column.

Concurrency/supersession: source-event uniqueness and transactional processing claim, append attempts/acceptance records; reordered/late/terminal-regressing events reconcile, not overwrite. Audit: body-free receipt disposition only, minimal rejected-attempt path requires separate approval. Blockers: T08-D28/D29/D30/D32/D33; no live webhook secret, route or receiver exists.

### D42 — ReconciliationCase

Purpose/authority: AR coordinates uncertain facts; PH/PY/PM/CV fact owners provide evidence and authorized resolution. B; RT; source professional/financial/custody records keep their own retention schedules.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — affected request | `Ref<FulfilmentRequest>`; N | AR / assigned owner | H / L0 |
| operationRefs — uncertain operations | `Refs<ExternalOperation>`; N; empty for non-operation state dispute | AR / assigned owner | S / L0 |
| evidenceRefs — original references/digests, no raw bodies | `Refs<typed approved evidence>`; N; unavailable evidence explicitly blocks resolution | Source owners / authorized receiver | E / L0 |
| disputedResourceRef — exact item/plan/package/payment | `Ref<typed resource>`; N | AR lineage / assigned owner | H / L0 |
| category — reason for reconciliation | `Code<Task 08 K reconciliation categories>`; N; exact registry PENDING | AR detected conflict or fact owner / AR | H / L0 |
| reconciliationState — independent dimension | `Code<Task 08 F reconciliation states>`; N | Assigned fact owner / AR validation | H / L1 |
| assignmentRef — actual accountable source-domain reviewer | `Ref<approved assignment>`; Y(unassigned); no resolution then | PH/finance/operations with ID / AR | S / L2 |
| resolutionEvidenceRef — supported authoritative resolution | `Ref<approved source resolution>`; Y(unresolved) | Relevant fact owner; professional decisions require PH / AR validates | E / L3 |
| resolutionAt — accepted resolution time | Instant; Y(unresolved) | Trusted clock / AR with owner | H / L0 |

Invariants/failure: no second effect until safety proven; query authoritative source only under later approval, otherwise remain manual/unresolved. Reconciliation cannot invent professional decisions, physical custody, money settlement or claim events. Concurrency/supersession: current disputed/source versions and assignment, append resolutions/corrections; reopen on new contradiction without erasing original evidence. Audit: case/source/actor/versions and safe disposition. Blockers: T08-D05/D08/D18/D27–D29/D32/D34.

### D43 — FulfilmentWorkItem

Purpose/authority: AR owns administrative task; PH/other actual domain owner controls required decision. B; RQ.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| requestRef — parent request | `Ref<FulfilmentRequest>`; N | AR / assigned owner | H / L0 |
| relatedResourceRef — one exact issue/item/package/case | `Ref<typed resource>`; N | AR lineage / AR | H / L0 |
| taskCategory — bounded administrative next step | `Code<review, clarify, confirm inventory, preparation reference, check reference, release review, pickup, delivery exception, return review, reconciliation>`; N; PROPOSED | Approved workflow / AR | H / L0 |
| requiredGateRef — professional prerequisite when applicable | `Ref<approved G01–G15 gate definition>`; Y(non-professional task) | Workflow owner / AR | S / L0 |
| assignmentRef — current actual permitted actor/queue | `Ref<approved assignment>`; Y(unassigned) | ID/PH/domain owner / AR | S / L1 |
| workState — task lifecycle, not clinical state | `Code<open, assigned, blocked, evidence referenced, closed, unknown>`; N; PROPOSED | AR with supported owner action / AR | H / L1 |
| dueAt — policy-supported review deadline | Instant; Y(no approved deadline); no invented SLA | Approved operational policy / AR | H / L1 |
| completionEvidenceRef — supporting source reference | `Ref<approved outcome evidence>`; Y(open/incomplete); required for claimed completion | Actual fact owner / AR validates | H / L3 |

Invariants/failure: closing a work item cannot set a professional gate, receipt or financial finality. No free-text clinical task body or identity data in queue names. Concurrency/supersession: current assignment/version checked; stale worker cannot close newer issue; append task actions. Audit: assignment/progress/evidence references only. Blockers: T08-D06/D18/D20/D29/D32/D34.

### D44 — FulfilmentAuditEvent

Purpose/authority: AR authoritative only for a minimized technical record of an accepted action or separately approved denial; underlying professional/physical truth remains source-owned. RA. **Closed audit payload below replaces B**: B retention/version envelope may exist only as separate protected record-management metadata, not extra event-body fields. No audit-of-audit recursion, arbitrary metadata or audit-file changes are proposed.

| Field / meaning | Type and nullability | Source / trusted actor | Data / lifecycle |
|---|---|---|---|
| eventId — opaque independent event identity | `Ref<this event>`; N | Audit issuer / AR | S / L0 |
| eventType — approved semantic event | `Code<Task 08 M event registry>`; N; exact names PENDING | Approved audit catalogue / AR | N / L0 |
| eventSchemaVersion — payload contract version | Version; N | Approved audit catalogue / AR | N / L0 |
| occurredAt — trusted action/acceptance time | Instant; N; distinct source time stays in source record | Trusted transaction clock / AR | H / L0 |
| actorRef — actual actor or authentic scoped service | `Ref<actor>`; N for attributed accepted event; denial absence rules PENDING | ID/service identity / AR | I / L0 |
| subjectRef — only if necessary and safely resolved | `Ref<ID subject>`; Y(unnecessary/unresolved); never attacker-selected | Authorized source relationship / AR | H / L0 |
| pharmacyScopeRef — authoritative custodian scope | `Ref<server scope>`; N for domain event | Server configuration / AR | S / L0 |
| requestRef — authorized linked request | `Ref<FulfilmentRequest>`; Y(unnecessary/unresolved) | Scoped transaction / AR | H / L0 |
| packageRef — authorized linked package | `Ref<CustodyPackage>`; Y(unnecessary/unresolved) | Scoped transaction / AR | H / L0 |
| reconciliationRef — authorized linked reconciliation | `Ref<ReconciliationCase>`; Y(unnecessary/unresolved) | Scoped transaction / AR | H / L0 |
| action — exact allowed action | `Code<approved action registry>`; N | Accepted command definition / AR | N / L0 |
| outcome — semantically compatible result | `Code<approved outcomes>`; N | Accepted transaction or approved denial path / AR | H / L0 |
| safeReasonCode — minimized optional cause | `Code<action/outcome-specific safe reasons>`; Y(registry permits none) | Validated guard/owner outcome / AR | H / L0 |
| policyVersion — approved governing policy | `Ref<approved policy revision>`; N | Trusted policy context / AR | S / L0 |
| correlationRef — safe independent technical correlation | `Ref<correlation>`; N; never embedded resource/identity values | AR issuer / AR | S / L0 |
| sourceService — bounded approved service label | `Code<approved service registry>`; N | Trusted execution context / AR | N / L0 |
| stateVersionBefore — consumed resource version | Version; Y(create or no safely resolved resource) | Scoped transaction / AR | S / L0 |
| stateVersionAfter — accepted resulting resource version | Version; Y(no accepted transition); denial cannot invent advancement | Scoped transaction / AR | S / L0 |

Invariants/failure: source body, OCR, clinical rationale, medication/quantity, payer/card data, address/contact, identity result, raw signature/photo/location, tokens/secrets and route history are forbidden. Valid type/action/outcome/reason/version combinations need a closed catalogue. Minimal opaque joins remain sensitive; no public audit or correlation enumeration. Concurrency/supersession: append-only, immutable; accepted transition and required event atomic; correction is a separately attributable event, not update/delete. Audit failure aborts required state/idempotency commit. **No protected business-state mutation or sensitive enumeration difference on denial; any denied-attempt audit evidence must follow the separately approved minimized audit contract.** Unknown subject/scope cannot be fabricated to fit an accepted-event schema. Blockers: T08-D18/D29/D30/D32/D33; denied-event/schema conflict remains explicitly unimplemented.

### 8.1 Orthogonal state references and canonical projection

The following expands D01.orthogonalStateRefs and D02.itemStateRefs into a fixed typed structure. Each named slot is a field: meaning is the dimension named; type is the exact reference shown; null is permitted only before that dimension exists, never proof of satisfied guards. Source/trusted actor, H/server-only classification and L1 concurrency/audit apply per row; retention RQ for request copies, authoritative source schedule retained separately. Production approval YES/BLOCKED for every slot.

| Field / dimension | Permitted reference target | Source / trusted actor | Failure / stale behavior |
|---|---|---|---|
| prescriptionReviewRef | PrescriptionReviewTask plus referenced PH decisions | PH / PH with AR projection | No accepted prescription on absent/stale review |
| inventoryRef | InventoryEstimate or InventoryConfirmation, discriminator mandatory | PH inventory source / PH | Estimate never satisfies confirmation |
| preparationRef | PreparationTaskReference | PH / PH | No prepared inference from task allocation |
| professionalRef | Current professional check, counselling and release references as separate typed members | PH / actual PH | No aggregate PASS substitutes for any missing member |
| fulfilmentModeRef | FulfilmentPreference plus current PickupPlan or DeliveryPlan, mode-discriminated | PA intent, PH plan / AR validates | Preference is not plan approval |
| financialRef | Separate PriceEstimate, CoverageEstimate, AdjudicationReference and PaymentReference members | PY/PM/PH / finance owner | No one financial state implies another or claim authority |
| custodyRef | CustodyPackage/current accepted CustodyEvent | PH physical acceptance / AR | Unknown remains CUSTODY_UNKNOWN; courier never recipient |
| reconciliationRef | ReconciliationCase references for all active conflicts | Actual fact owner / AR | One resolved case cannot clear other blockers |

For compound slots, each named member independently uses `Ref<its exact target>`, nullable only when no such evidence yet; every member inherits its row's authorization/classification/retention/L1 controls. Cardinality limits and per-item membership are PENDING, never unbounded arrays. Request state is D01.requestState. No extra property is allowed. These references index independently versioned evidence; they are not a proposed unrestricted JSON status bag.

Canonical states are exactly those required by Task 08 F: REQUESTED, VERIFICATION, CLARIFICATION, INVENTORY, PREPARATION, PHARMACIST_CHECK, READY, IN_TRANSIT, HANDED_OFF, FAILED, RETURNING, RETURNED, CANCELLED, UNKNOWN. They are **derived**, not independent professional decisions. Workstream F must later approve full precedence and transition effects; conflicting or unmapped evidence yields UNKNOWN/no advancement rather than inventing a transition.

READY requires current release for every included item (or a separately approved professional partial plan), valid mode, pharmacy custody, valid recipient/approved delivery plan, approved release validity and no cancellation, revocation, exception or reconciliation blocker. Invalidate it whenever a guard/version changes. HANDED_OFF requires accepted patient/prior-agent physical receipt, never courier pickup. RETURNED requires verified correct-pharmacy physical receipt even after delay, not stock saleability. No state triggers a claim.

## 9. Conceptual PostgreSQL / Drizzle mapping — proposal only

Nothing here is SQL, a Drizzle schema declaration, a generated migration, a migration number, a database grant or permission to execute tooling. Physical names below are **candidate design labels**, not existing tables. No table belongs in the current production schema or Task 04 schema under this authorization. Any future synthetic namespace/role/database and exact approval binding must be separately chosen; production migration requires explicit lead sign-off and its own review.

### 9.1 Common persistence proposals

| Concern | Candidate mapping / invariant | Approval or limit |
|---|---|---|
| Keys | Internal random surrogate primary key plus unique opaque contract reference; separate typed reference mapping. UUID is a candidate internal representation consistent with inspected Drizzle patterns, not a public identifier contract. Never expose or encode that internal key inside external technical references. | Reference format, entropy, namespace and key ownership T08-D18/D29/D30 PENDING. No identifier encodes subject, Rx, product, payer, vendor or tenant data. |
| Scope and relationships | Required server-owned pharmacy scope on every local record and join; candidate unique `(id, pharmacy_scope)` before composite child foreign keys. Validate subject/request/item/package lineage and typed reference target. | Scope from server only, never choice/session/browser/provider. No directory-pharmacy reference becomes local tenant FK. T08-D13 unresolved. |
| Strong types | Requiredness, enum allowlists, lengths, paired-null lifecycle fields and chronological constraints modeled in later strict server schema and database checks. Time instants as timezone-aware timestamps; exact Money as fixed precision; policy-controlled bounded codes. | No unrestricted JSON, stringly typed polymorphic FK, secret or clinical payload in event bodies. Precision/limits/registry values require approval; no schema defaults chosen here. |
| Versions | B.stateVersion on current coordination heads; immutable records carry their creation/consumed version. Source version stored separately. | Candidate compare-and-set plus deterministic lock order; exact isolation/order and approval-time recheck design deferred to F/K. |
| Snapshots and successors | Immutable original rows; append revision/revocation/acceptance records; current pointers are guarded projections. Candidate uniqueness of current head per scoped lineage; same-type scoped predecessor/successor, no cycles/self-links. | Could use an explicit head relation to avoid requiring immutability exceptions for pointer writes. Choice of mechanism requires database/governance review, not inherited Task 04 triggers. |
| Association sets | Typed bounded join relations for evidence, request items, package manifests, prerequisite versions and audit links; unique parent/child/scope tuple. | Multi-item membership must not imply partial-fill authorization. Atomic create-time cyclic proof/plan links need deferred constraints or explicit validated link records; no temporarily permissive foreign keys. |
| Authorization | Least-privilege future runtime role, independent server authorization and scoped queries. Candidate grants/constraints protect immutable evidence; no client direct database access. | Exact Task 05/service identity and professional permission design BLOCKED. This is not a row-level-security implementation or auth change. |
| Indexes | Scope-first query indexes with a unique final tie-breaker for pagination; filtered current-head/open-work indexes where supported; source/event dedup unique keys. | No plaintext PHI/address/clinical-content search or public count endpoint. Index types/predicates measured in future tests, not claimed tuned now. |
| Retention | Contract-specific RQ/RE/RP/RC/RI/RF/RD/RT/RA schedule; field exceptions and source/vendor/backups mapped explicitly. No cascading destruction of dependent evidence. | GOV-approved hold/incident-aware disposal only. No Task 02 export, retention, audit or destruction code modified. |
| Scope of future existence | Every entity below is a **synthetic-only candidate** under new exact approval; a future production counterpart is BLOCKED pending its own domain, schema and release decisions. | Same-shaped synthetic evidence never becomes real PHI/source truth or production import authority. No automatic promotion/migration. |

### 9.2 Per-contract persistence, relationships, uniqueness and access paths

Every row inherits the key/scope/version/retention/existence rules above and the matching D-contract field controls. `Head` = mutable current projection with immutable evidence; `Snapshot` = immutable source record plus append-only successor/revocation; `Event` = immutable observation plus separate acceptance/correction. These labels define candidate mutability, not actual tables. All candidate indexes begin with pharmacy scope unless expressly a public, non-patient vocabulary. All source uniqueness includes source system/account/environment so different issuers cannot collide.

| Contract / candidate entity | Key and foreign/reference relationships | Candidate uniqueness and common-access indexes | Version, lifecycle / deletion owner |
|---|---|---|---|
| D01 FulfilmentRequest / fulfilment_request | Opaque request ref; ID subject/actor/relationship mappings; choice, preference and review associations | Unique opaque ref; submission receipt scope; indexes `(scope, request_state, created_at, id)` and authorized subject/request lookup | Head; stateVersion; closure does not delete; RQ |
| D02 FulfilmentRequestItem / fulfilment_request_item | Opaque item ref; composite scoped request FK; PH prescription-item reference | Unique accepted source-item mapping within request/revision where source guarantees it; `(scope, request_id, id)` | Head plus immutable source revisions; item stateVersion; RQ |
| D03 RequestType / request_type value | No independent PHI table required; closed field with vocabulary version on request | Four-value check and version support; no separate index unless justified by workload | Immutable value per request revision; enclosing version/retention RQ |
| D04 PrescriptionEvidence / prescription_evidence | Opaque evidence ref; scoped request FK; protected EV store/actor relationships | Unique source evidence revision where meaningful; digest is non-unique detection index only, never auto-merge authority; `(scope, request_id, created_at, id)` | Immutable content + technical Head; stateVersion; no rejection-triggered deletion; RE |
| D05 PrescriptionReviewTask / prescription_review_task | Opaque task ref; request/item/evidence and assignment mappings | No assumed one-review-per-request rule; dedup by approved task purpose/revision; `(scope, assignment_ref, review_state, created_at, id)` | Head with append-only progress; stateVersion; RP |
| D06 PrescriptionReviewDecisionReference / prescription_review_decision_reference | Opaque decision ref; scoped task/request/item plus professional/source refs | Unique source decision/version/gate mapping; `(scope, item_id, gate, decision_at, id)`; current-head lineage uniqueness | Snapshot; P consumed/local versions, supersession/revocation; RP |
| D07 ClarificationCase / clarification_case | Opaque case ref; scoped review task, protected question/responses, resolution | Unique source case revision; `(scope, review_task_id, case_state, created_at, id)` | Head plus immutable response/resolution evidence; stateVersion; RP |
| D08 PharmacyChoice / pharmacy_choice | Opaque choice ref; ID subject/actor and non-tenant directory pharmacy mapping | Candidate one current choice per approved choice lineage; not one fixed pharmacy forever; `(scope, subject_ref, chosen_at, id)` | Snapshot + current head, withdrawal/supersession; stateVersion; RC |
| D09 PharmacyAccreditationSnapshot / pharmacy_accreditation_snapshot | Opaque snapshot ref; directory-pharmacy/source evidence, not new production tenant | Unique source/pharmacy/revision; `(scope, directory_ref, observed_at, id)` and expiry review | Snapshot; V plus stateVersion; RC |
| D10 FulfilmentPreference / fulfilment_preference | Opaque preference ref; request, acknowledgement and accommodation mappings | One current accepted preference per request lineage; `(scope, request_id, observed_at, id)` | Snapshot + current head; V/stateVersion; RC |
| D11 InventoryEstimate / inventory_estimate | Opaque estimate ref; item and source product candidate | Source revision dedup only; `(scope, item_id, observed_at, id)` and expiry | Snapshot; fixed NOT_CONFIRMED, V/stateVersion; RI |
| D12 InventoryConfirmation / inventory_confirmation | Opaque confirmation ref; item, PH facts and reservation/decision relationships | Source confirmation revision unique; `(scope, item_id, confirmed_at, id)`; current-head uniqueness | Snapshot; V/stateVersion and consumed item version; RI |
| D13 InventoryReservationReference / inventory_reservation_reference | Opaque reservation ref; confirmation, PH allocation and operation | Unique source allocation revision plus operation idempotency; `(scope, confirmation_id, reservation_state, id)` and expiry review | Snapshot/source lifecycle Head; V/stateVersion; RI; no local stock mutation |
| D14 ProductException / product_exception | Opaque exception ref; item/confirmation/evidence and work item | Source occurrence dedup; do not collapse independent exceptions; `(scope, item_id, created_at, id)` | Event plus resolution Head; stateVersion; RI |
| D15 PreparationTaskReference / preparation_task_reference | Opaque task ref; item, G08, confirmation and PH source task | Unique PH task/revision; `(scope, item_id, preparation_state, id)` | Snapshot/source progress Head; V/stateVersion; RP |
| D16 TechnicalCheckReference / technical_check_reference | Opaque check ref; prepared revision, actual checker and PH procedure | Unique source check revision, not blanket one-check limit; `(scope, preparation_id, decision_at, id)` | Snapshot; P consumed/local versions; replacement/revocation; RP |
| D17 ProfessionalCheckReference / professional_check_reference | Opaque check ref; preparation/technical check/current registrant | Unique source decision revision; scoped current check head; `(scope, item_id, decision_at, id)` | Snapshot; P, revoke/replace without rewriting; RP |
| D18 CounsellingRequirementReference / counselling_requirement_reference | Opaque requirement ref; item, PH requirement/satisfaction and optional Task 07 reference | Unique source requirement revision; `(scope, item_id, decision_at, id)` | Snapshot; P/current head; no message-derived completion; RP |
| D19 ReleaseAuthorization / release_authorization | Opaque release ref; item and every consumed prerequisite revision | Unique source release revision; single accepted current head per item/release lineage; `(scope, item_id, decision_at, id)` and expiry/revocation checks | Snapshot; P; append revoke/supersede, readiness invalidation; RP |
| D20 PriceEstimate / price_estimate | Opaque estimate ref; item, assumption/source/disclaimer and adjudication mapping | Unique source estimate revision; `(scope, item_id, observed_at, id)` and expiry | Snapshot; B/V/F, no conversion to final record; RF |
| D21 CoverageEstimate / coverage_estimate | Opaque estimate ref; item and distinct coverage source | Unique source coverage revision; `(scope, item_id, observed_at, id)` | Snapshot; B/V/F, separate from price; RF |
| D22 AdjudicationReference / adjudication_reference | Opaque adjudication ref; item, source transaction, operation, reconciliation | Unique source transaction/result revision; `(scope, operation_id, created_at, id)` | Event plus accepted finance projection; stateVersion/source version; RF |
| D23 PaymentReference / payment_reference | Opaque payment ref; request, PM ledger, operation and prior payment observation | Unique ledger observation revision; `(scope, operation_id, created_at, id)` and reconciliation state | Event plus current finance projection; stateVersion; never erase refunds/disputes; RF |
| D24 PickupPlan / pickup_plan | Opaque plan ref; request; bounded package/release joins; recipient authorization; package-specific accepted-proof and approved-exception joins | One current plan per approved request/mode lineage; unique scoped plan/package/proof-or-exception association; `(scope, handoff_state, window_start, id)` | Snapshot/Head; V/stateVersion; derive completion only after complete per-package coverage; expire/recheck, no auto-disposal; RD |
| D25 PickupRecipientAuthorization / pickup_recipient_authorization | Opaque authorization ref; plan, ID grant and PH confirmation | Unique grant/plan revision; no recipient names in key; `(scope, pickup_plan_id, id)` | Snapshot; V/stateVersion, revocation recheck; RC |
| D26 PickupHandoff / pickup_handoff | Opaque handoff ref; plan/package/recipient/proof, scoped cycle resolved atomically | Candidate one accepted recipient transfer per package custody version; source receipt dedup; `(scope, package_id, handoff_at, id)` | Event; consumed custody/local version, correction/dispute appended; RD |
| D27 DeliveryPlan / delivery_plan | Opaque plan ref; request/packages/address/recipient/release, CV operation mappings; bounded plan/package/item requirement association | Current plan uniqueness by approved lineage; unique scoped plan/package/item/current-requirement revision association; `(scope, request_id, observed_at, id)` and window review | Snapshot/Head; V/stateVersion; complete current per-item coverage required; changes reconcile booked effects; RD |
| D28 DeliveryAddress / delivery_address | Opaque address ref; ID subject/actor; encrypted fields separate from public projection | Unique opaque revision only; no plaintext address index or identity dedup; `(scope, subject_ref, id)` for authorized reads | Snapshot; V/stateVersion, material change replaces; RD address-specific schedule |
| D29 DeliveryAddressVerification / delivery_address_verification | Opaque verification ref; exact address revision and approved source | Unique source/address verification revision; `(scope, address_id, verified_at, id)` | Snapshot; V/stateVersion, invalidate on address/policy change; RD |
| D30 AuthorizedRecipientGrant / authorized_recipient_grant_reference | Opaque grant ref; ID source grant, subject/actor/recipient, request scope | Unique ID grant revision; `(scope, request_id, expires_at, id)`; no manufacture of ID authority | Snapshot/reference only; V/stateVersion; expiry/revocation serialized at use; RC |
| D31 CustodyPackage / custody_package | Opaque package ref; request and immutable item manifest, current event/plan mappings; bounded package/item/current-requirement join; PH suitability-decision reference where applicable | No cross-subject ID reuse; unique scoped package/item/current-requirement revision association; unique current event/version head; `(scope, request_id, id)` and custody worklist | Head + immutable manifest/requirement associations; stateVersion; requirement and suitability revisions invalidate reliance; physical evidence retained; RD |
| D32 CustodyEvent / custody_event | Opaque event ref; package, prior event, holders, proof/acceptance mapping | Unique source event revision; unique accepted package sequence; `(scope, package_id, occurred_at, id)` | Event; consumed custody/local version; separate correction/acceptance; RD |
| D33 StorageAndSecurityRequirement / storage_security_requirement | Opaque requirement ref; composite-scoped request/item/package lineage and PH packaging/temperature/route policy; joined one-to-many from package/plan | Unique source requirement revision for exact scoped request/item/package; unique current revision per scoped lineage; `(scope, package_id, item_id, observed_at, id)` | Snapshot; V/stateVersion; source, manifest or policy change invalidates reliance; RD |
| D34 TemperatureEvidence / temperature_evidence | Opaque observation ref; package/requirement/source evidence | Unique source observation interval/revision; `(scope, package_id, observation_start, id)` | Event; state/source version; append correction/review; RD |
| D35 DeliveryAttempt / delivery_attempt | Opaque attempt ref; delivery plan/package/assignment/prior attempt/proof | Unique acknowledged source attempt; `(scope, package_id, attempted_at, id)`; no duplicate active attempt for same approved attempt intent | Event + controlled attempt Head; stateVersion; immutable failure preserved; RD |
| D36 ProofOfHandoff / proof_of_handoff | Opaque proof ref; package and exactly one delivery attempt or pickup handoff, grant/acceptance; joined to pickup plan through exact package | Unique accepted physical proof mapping per package custody transition; unique scoped plan/package/proof association; digest detects replay, not sufficient acceptance; `(scope, package_id, created_at, id)` | Event + append acceptance/dispute; stateVersion; plan completion derives from complete package coverage, never one proof; heightened evidence retention; RD |
| D37 FulfilmentException / fulfilment_exception | Opaque exception ref; request/package/evidence/work item | Source occurrence dedup; preserve separate active issues; `(scope, containment_state, created_at, id)` | Event + containment Head; stateVersion; preserve incident/hold; RD |
| D38 ReturnCase / return_case | Opaque return ref; package/destination/receipt/segregation/disposition | Unique acknowledged return intent; one accepted receipt per return/custody version; `(scope, return_state, created_at, id)` | Head + append physical events; stateVersion; delay never deletes receipt possibility; RD |
| D39 StockDispositionReference / stock_disposition_reference | Opaque disposition ref; return/item/physical receipt and PH decision | Unique source decision revision; `(scope, return_case_id, decision_at, id)` | Snapshot; P/stateVersion; source execution separate, no restock writer; RP |
| D40 ExternalOperation / external_operation | Opaque operation ref; actor/request/typed resource, source account and acknowledgement | Unique `(scope, actor_ref, operation_kind, resource_ref, idempotency_key_digest)`; `(scope, operation_state, next_eligible_attempt_at, id)` | Head + append attempt/ack records; stateVersion and future fence; RT |
| D41 ExternalWebhookReceipt / external_webhook_receipt | Opaque receipt ref; approved source event/account/environment, operation mapping | Unique scoped source event identity; same identity/different digest conflicts; `(scope, processing_state, created_at, id)` | Immutable receipt + processing Head/history; stateVersion; durable dedup retention RT |
| D42 ReconciliationCase / reconciliation_case | Opaque case ref; disputed resource, operations/evidence/owner | Dedup one issue/revision, not collapse independent conflicts; `(scope, reconciliation_state, created_at, id)` | Head + append resolutions; stateVersion; definitive resolution before retry; RT |
| D43 FulfilmentWorkItem / fulfilment_work_item | Opaque work ref; request/typed issue/current assignment/outcome | Unique approved task purpose+issue revision; `(scope, assignment_ref, work_state, due_at, id)` | Head + action history; stateVersion; close does not erase source obligation; RQ |
| D44 FulfilmentAuditEvent / fulfilment_audit_event | Opaque event ref; necessary authorized actor/subject/request/package/reconciliation mappings | Unique accepted action/event identity; `(scope, occurred_at, id)`; authorized resource-history access index | Event; immutable before/after versions, correction event only; RA, separate retention metadata |

No proposed uniqueness policy limits legitimate new requests, repeat reviews, repeated physical attempts or independent exceptions merely because the subject/item matches. Logical replay is identified by the approved operation and immutable source revision, not by PHI-derived hashes or a guessed one-per-day rule.

### 9.3 Referenced dependencies and supporting persistence

References to ID actors/grants/assignments, PH prescription/product/clinical records, directory/accreditation evidence, EV storage/OCR, PY/PM ledgers, approved policy/disclosure/acknowledgement records and CV sources are **external dependency contracts**, not new local authoritative stores. Their raw field schemas and owners remain unresolved. A reference must not resolve successfully until that owner and exact contract are approved; no stand-in production table or copied assessment field is proposed.

Choice disclosure evidence must, at its approved owner, bind each information category actually shown to its source revision, observed time and expiry, as well as neutral alternatives and acknowledgement. The local `informationShownRefs` is only a bounded association to those immutable records. Missing source contracts block implementation rather than allow an arbitrary JSON presentation snapshot.

Potential supporting persistence below is limited to these named associations and technical receipts; none expands the 44 authoritative domain objects or authorizes runtime:

| Concept | Field-level proposal / relationship | Uniqueness, version, lifecycle, scope and retention |
|---|---|---|
| Typed relationship link | Opaque link ref, server pharmacy scope, typed parent/child refs and consumed parent/child versions; each non-null, AR from validated lineage; H/S server-only controls, L0; no content | Composite scoped foreign keys and unique parent/child/revision; parent contract retention/hold owner; append revision link, no unsafe cascade. Exact link tables PENDING. |
| Current-head / acceptance link | Opaque link ref, scope, exact lineage, current revision ref and stateVersion; each non-null, accepted transaction/fact-owner evidence; H/S server-only L1 | Single head per scoped typed lineage, compare-and-set; referenced source history immutable. Retention follows owning contract. No current head invented on missing evidence. |
| Idempotency/replay receipt | D40 scope, actor, operation, resource, key digest, canonical digest, consumed/resulting version and validated response reference; strict response projection owned by future operation contract | Candidate unique tuple in D40; replay validation before storage and retrieval; no success survives rollback; RT schedule must outlast unsafe duplicate risk. No raw PHI in key/fingerprint or response metadata. |
| Attempt/lease evidence | D40 operation ref, opaque attempt ref, stateVersion/fence, trusted attempt time and validated acknowledgement ref (nullable until known); S/H server-only L0/L3, AR source | Unique scoped operation/attempt; approved fencing before worker execution; uncertain result blocks retry. No timeout/lease/retry value chosen. RT schedule. |
| Transactional synthetic intent/outbox | Opaque intent ref, scope, approved event/schema version, typed resource/version, trusted occurrence time and fixed `not_dispatched`; S/N server-only L0. A later payload contains only its approved bounded projection | Unique scoped accepted effect/event intent; same transaction as state/audit/receipt. No external dispatch or Task 07 delivery. RT/RA schedule by field, not copied Task 04 retention. |

For each supporting field above: nullable only where stated; source/trusted actor AR accepted transaction unless fact-owner acknowledgement is specified; all server-only with the H/S/N profiles and per-read authorization, encryption/tokenization, minimized audit and approval YES/BLOCKED. Actual physical definitions, exact replay/event payloads, lifecycle metadata and audit-denial shape must be reviewed under T08-D18/D29/D32/D33 before any persistence slice. This is not a completed Workstream K or M implementation contract.

## 10. Key invariants

1. A request, image, upload, OCR result, patient statement, refill/renewal selection or transfer copy never establishes prescription validity, remaining quantity, dispensing or professional authority. AI-RX-06 remains retired; zero-PHI public intake is not an upload surface.
2. Patient subject, initiating actor, delegate, authorized recipient, actual registrant, technical staff and courier are distinct. Unknown or unverified roles/actions deny. No technician/admin/support/trainee/courier/system promotion to pharmacist authority or borrowed supervisor identity.
3. Patient choice stays explicit, neutral and reversible, but never selects tenant scope. Server-only PHARMACY_ID remains unchanged. Unresolved destination/choice architecture blocks affected routing, not by forcing the server pharmacy.
4. Inventory estimate is fixed NOT_CONFIRMED. PH source confirmation must distinguish on-hand from dispensable availability and cover product/quantity/expiry/recall/quarantine/storage/integrity. No local stock allocation, substitute selection or source-of-truth invention.
5. Professional check, counselling, release and revocation require actual attributable PH decisions. READY is derived from all current guards; preparation, technical completion, payment, queue closure and courier readiness cannot release medication.
6. Price/coverage remain estimates; adjudication, payment and claim remain independent. Request, pickup, delivery, READY, return, cancellation or reconciliation never creates, codes, submits, reverses or implies a claim or dispensing event. Existing protected claim/reference behavior is untouched.
7. Pharmacy-to-courier custody is never patient receipt; courier is not patient agent. Failed or unknown delivery cannot become received. Patient/prior-agent receipt requires matched accepted proof and current authority; disputes remain explicit.
8. RETURNED depends on verified physical custody at the correct pharmacy, not timely arrival alone. Delayed return may be accepted after verified receipt; preserve delay/exception evidence. Saleability, restock, re-dispensing, disposal, refunds and claim consequences stay separate, never automatic.
9. Every mutation consumes current state/source versions and current authorization; idempotency binds actor/pharmacy/operation/resource/payload without raw PHI. Unknown external or commit outcome reconciles before repeat effects. No exactly-once vendor guarantee.
10. Raw vendor events remain untrusted even if correctly signed. No webhook directly creates professional acceptance/rejection/clarification/product decisions, check, counselling, release, final payment, patient receipt, claim or restock.
11. All domain records are server-only. No PHI, clinical content, identity/contact/address, payment/payer data or secrets in URLs, browser storage, technical identifiers, logs, analytics, metric/queue labels, notifications, unsafe errors or arbitrary event metadata. Opaque references remain sensitive.
12. Required audit is minimized, append-only and atomic with accepted state; denial evidence follows its separately approved contract. Retention/disposal is field/owner/hold-specific, not an inherited clinical duration or return-triggered deletion.
13. Unknown/contradictory/stale required facts block progression; preserve actual custody or CUSTODY_UNKNOWN rather than fabricate a professional negative decision or physical event. Apply all Task 08 mandatory stop conditions.

## 11. Unresolved decisions and blockers

These refine the existing register, not new approvals. Owner labels are required functions; named assignments, approval decisions and dates remain PENDING.

| Existing decision IDs | Required decision / precise question | Owner/reviewer function | Affected stage |
|---|---|---|---|
| T08-D02–D04/D10/D36/D37 | What exact Task 08 synthetic scope, candidate, lifecycle, risk/autonomy metadata, runtime/DB isolation and independent Task 11 approval are granted? No Task 04 expiry/renewal inheritance. | Royian coordinates Task 01/11 and required specialists | Runnable synthetic work and later promotion; not this design |
| T08-D05/D11/D17 | Who owns the absent prescription-evidence/PMS/OCR boundary and missing planning artifact? Which immutable source references, review/provenance, storage/scan and import contracts are accepted? | Royian, prescription-domain owner PENDING, PH/DM, privacy/security | Integrated evidence/professional-success behavior; production |
| T08-D06/D14/D20 | Which exact ID actors, audiences, subject/delegate/recipient grants, assignments and professional authorization sources exist? What scope/supervision/as-of-right/current-registration evidence is valid for each gate? | Task 05, PH/DM/technician, professional/legal/security | Affected authorization and professional simulation; all real access |
| T08-D13/D15/D16 | How is neutral choice represented without tenant selection? Which accreditation, jurisdiction and drug-class sources/policies are current? How is Internet Sites Policy review resolved? | Royian/architecture, PH/DM, legal/privacy | Choice/routing/classification success and production operation |
| T08-D18/D29/D32 | Approve exact state/command/event/error registries, row ownership, typed links, head/supersession mechanism, lock order/isolation, raw-byte limits, identifier formats, idempotency scope/lifetimes, time/lease/retry and minimized denied-action audit shape. | Domain/database/audit/security/Task 11 | Affected runtime/persistence; no migration authorized |
| T08-D19/D20 | Which PH product/quantity/reservation source, freshness, technical-check, counselling, release/revocation and multi-item policy governs? What current source revision invalidates each dependent guard? | PH/DM, technician, inventory/PMS owner | Inventory/professional/READY success and production |
| T08-D08/D21/D22 | Identify actual finance/PMS/claim owners; Task 09 interoperability is not a finance engine. Approve money precision/currency, estimates, fees, patient acknowledgement, finality, cancellation/refund and ledger reconciliation. | Royian, billing/finance/payer/PH/legal | Policy-dependent financial simulations and real finance |
| T08-D23–D27/D35 | Which pickup/recipient/address/service-area, courier assignment/route, storage/temperature, identity/signature/accessible exception, retry/return/segregation/disposition rules are approved? | PH/DM, Task 05, operations, privacy/legal/accessibility, courier review | Policy-dependent handoff/transport/return success; production |
| T08-D07/D28/D30/D31 | Which strict external schemas, source identities, vendor/security/PHI field disclosures, key/backup/residency/support controls and Task 07 producer contract are approved? | Task 07/domain owners, privacy/security/procurement/legal | External adapters, real data, notifications and protected tracking |
| T08-D09/D32–D34 | Who owns each field's retention trigger/period/hold/archive/disposal/export/vendor/backup evidence? How does new audit/evidence integrate without protected root changes or fabricated denial events? | Records/Task 02/governance, PH/DM, privacy/legal/security | Affected persistence/retention/incident behavior and production |
| T08-D12/D37/D38 | Resolve status freshness, named independent reviewers, exact-candidate evidence and final product wording without inheriting historical PASS. | Royian, documentation/domain owners, Task 11 | Review claims, public wording and release |

No source date, retention duration, pharmacy/courier, fee, maximum, identity method, numeric threshold, reviewer name or approval is invented. Workstreams E–N retain their own detailed deliverables; naming a prerequisite here does not mark those workstreams complete.

## 12. Proposed synthetic implementation boundary

This document is reviewable now. A later bounded slice may implement only contracts whose applicable source, identity, professional-policy and schema decisions are resolved, using exact synthetic-scope and applicable Task 11 approval. Independent synthetic work may continue while production-only dependencies remain blocked; unresolved policies may be represented as explicit unavailable/denied cases, not guessed successful professional outcomes. Production-only approvals are not blanket prerequisites for unrelated documentation/design.

Any later approved prototype must use unmistakably synthetic, server-owned records, fixed clock and approved Ontario timezone, separate scoped reference namespaces, strict client/server boundaries, fail-hard lifecycle/production checks and no-network local adapters. No real person, pharmacy, drug record, prescription, address, recipient, payer/payment account, courier, tracking identifier or clinical data. No production imports or replacement of Task 05/07 authorities with staff auth or another SDK. A runnable test harness, database, migration, fixture, script, route, UI, worker or command requires its own scope; none is created here.

## 13. Production-blocked items

All real prescription processing/validation, refill/renewal/transfer, pharmacy accreditation/registration reliance, inventory confirmation/reservation, product preparation/check/counselling/release, adjudication/payment/claim effects, pickup release, courier booking, transport, patient receipt, return/stock disposition and external notices remain BLOCKED. No hosted preview, live patient pilot, vendor account, credential, cloud database, external SDK or network effect is authorized.

Task 03 ownership, Task 05 identity, Task 07 communication runtime, Task 09 actual financial ownership and Task 11 exact approvals remain BLOCKED/NOT VERIFIED as recorded in A–C. Existing assessment permissions, single-pharmacy configuration, public zero-PHI intake, protected triage, reference data, claim derivation, audit, retention, governance, migrations and production-invariance baselines are not modification targets.

Apply the full Task 08 Mandatory stop conditions. Stop only the affected slice/stage when one applies; never bypass it using a placeholder that grants authority, client tenancy, fake physical receipt, silent restock, unsafe retry or fabricated audit success.

## 14. Candidate future test obligations — NOT IMPLEMENTED / NOT RUN

These obligations extend Workstream B T08-B-T01–T30 and Workstream C C-T01–C-T10. No test file, command execution, infrastructure approval or runtime PASS is supplied by this document.

| Obligation | Contracts / existing threat trace | Independent evidence required in a later approved slice |
|---|---|---|
| D-T01 — Closed field and vocabulary contracts | D01–D44; R03/R24/R30 | Parameterize every allowed/unknown field, enum/version, null/paired-null shape, size limit and typed reference. Missing approved configuration fails closed. No raw authority/body fields sneak into a projection. |
| D-T02 — Identifier and privacy boundary | All; R03/R24/R26 | Sentinels for identity, address, OCR, Rx/DIN/drug, payer/card and secrets cannot appear in technical IDs/keys/URLs/topics/queues/log/metric/correlation labels, client storage, errors, notices or event bodies. Test opaque refs are not encoded database keys or bearer authorization. |
| D-T03 — Request and evidence non-authority | D01–D07; R01/R02 | Each request type, forged/unreadable/wrong-subject/duplicate upload, scan pass and OCR complete remains unaccepted without separate PH decision. Technical refusal never fabricates professional FAIL. |
| D-T04 — Identity, professional and choice isolation | D01/D06/D08–D10/D16–D19/D25/D30; R03–R06 | Independently vary actor, subject, pharmacy, audience, action, assignment, expiry/revocation and source registration evidence. Choice never changes tenant; no required-pharmacy fallback. Actual PH attribution, no admin/technician/supervisor shortcut. |
| D-T05 — Inventory and multi-item freshness | D02/D11–D19/D27/D31/D33; R07–R10 | Estimate NOT_CONFIRMED immutable; on-hand alone insufficient; every product/expiry/recall/storage/quantity fact and source version tested. A multi-item package with complete current same-scope item requirements can reach only the applicable non-professional validation stage. Missing, stale or contradictory requirements block; another item/package/pharmacy requirement cannot be reused; one item's requirement cannot satisfy another. AR validation never creates PH handling/suitability decisions. One ready item cannot release another; source change removes stale readiness; no quantity/substitution inference. |
| D-T06 — Financial separation | D20–D23/D40–D42; R11–R13 | Exact amount/range/unavailable union, expired/changed estimates, accepted/reversed/uncertain adjudication, authorization/capture/refund ambiguity. Zero claim/assessment/dispense/release effects across every payment or transport outcome. |
| D-T07 — Pickup identity and custody | D24–D26/D30/D31/D36; R05/R14 | Correct recipient/grant/plan/package/release/counselling and at-expiry denial; sole-factor possession insufficient; no-show leaves custody unchanged; approved accessible alternative only. Traverse a multi-package plan with partial accepted proof and prove it remains incomplete: package A proof cannot complete package B or the plan, unknown/partial proof fails closed, and completion derives only after every package has accepted applicable proof or a separately approved package-specific exception while release/recipient guards remain independently current. Replay cannot create second physical handoff. |
| D-T08 — Delivery, proof and exceptions | D27–D37; R15–R19 | Address revision/service area, courier assignment, direct-route/storage/temperature evidence, recipient/proof match and PH acceptance independently varied. Courier pickup is not receipt; failed attempt remains failed; webhook proof alone insufficient. No raw proof/ID retention. |
| D-T09 — Delayed return and disposition | D38/D39; R20 | Wrong destination or missing verified PH receipt cannot establish RETURNED. Delayed correct-pharmacy physical receipt can; delay evidence persists, disposition pending, zero restock/financial/claim effect. Duplicate return cannot duplicate disposition evidence. |
| D-T10 — Real transaction races and rollback | All persisted heads/decisions; R08/R21/R27 | Approved disposable real PostgreSQL, independent connections/barriers and committed-state assertions. Race request replay, stock/source updates, release/revoke/handoff, recipient revoke, address/mode/cancellation and return. Required audit failure rolls back accepted state/receipt; no leaked connection or partial successful response. |
| D-T11 — Idempotency and uncertain outcomes | D40–D42; R21–R23 | Same-key concurrency one logical effect, changed typed projection conflicts, malformed stored response fails before replay, source revision change bound. Lost acknowledgement/crash/unknown commit never blind-retries; verify approved lease/fence and no expiry-driven duplicate. |
| D-T12 — Webhook inbox and reconciliation | D41/D42; R22/R23 | Bounded raw bytes, signature/timestamp/environment/account/scope, same event/different digest, unknown type/version, reordering and terminal regression. Durable inbox before processing, no direct professional/receipt/payment/claim/restock transition. Original evidence retained safely; manual unresolved outcome valid. |
| D-T13 — Persistence invariants and governance | All mappings; R27/R28 | Tenant-safe composite relationships, parent uniqueness before FK, single current head, no cycles/self-links, immutable source content, scoped joins, paired lifecycle fields and index-supported bounded worklists. Field schedules/holds prevent unsafe disposal; audit-denial tests require separately approved contract, never a schema workaround. |
| D-T14 — Synthetic lifecycle and source boundaries | All; R30 | Missing/expired/revoked scope, production environment, forged fixtures, direct/transitive client or production imports, attempted network/vendor/claim effects all fail hard. Do not reuse Task 04 permissions, credentials, database or expired approval. |
| D-T15 — Human contract validation | All; R04/R10/R29 | Actual PH/DM/technician, identity, privacy/security/legal/accessibility, finance and operations reviewers verify source authority, professional scope, field necessity, truthful uncertainty and accessible procedures. Technical tests do not verify Ontario law, physical custody or professional competence. |

## 15. Explicit non-authorization statement

This document is **not implementation, a migration, professional approval, or production authorization**. It creates no runtime contract, database record, source integration, permission, fixture, test execution or external effect. Workstream D supplies all 44 conceptual contracts and their joined field/persistence control proposals for review; executable completeness, domain decisions, professional validation, synthetic runtime approval and all production gates remain separate. No Workstream A–C decision is closed by this proposal.
