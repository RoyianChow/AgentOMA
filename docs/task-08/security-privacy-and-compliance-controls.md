# Task 08 - Security, privacy, and compliance control model

**Status: WORKSTREAM K DOCUMENTATION / PROPOSED DESIGN ONLY. No runtime control, security middleware, identity system, authentication change, schema, migration, vendor connection, compliance finding, security approval, or production authority.**

## Scope, evidence, and authority boundary

This document translates Task 08 risks into proposed security, privacy, and accountability controls. It must be read with [AGENTS.md](../../AGENTS.md), the [project overview](../PROJECT_OVERVIEW.md), the full [Task 08 specification](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), and completed Workstreams A-J:

- [Current state and gap analysis](current-state-and-gap-analysis.md), [Ontario standards and policy mapping](ontario-fulfilment-standards-and-policy-mapping.md), and [production dependency and decision register](production-dependency-and-decision-register.md).
- [Fulfilment threat model](fulfilment-threat-model.md) and [trust boundaries and data flows](trust-boundaries-and-data-flows.md).
- [Professional responsibility matrix](professional-responsibility-matrix.md) and [role and transition authorization matrix](role-and-transition-authorization-matrix.md).
- [Fulfilment contracts and schema proposal](fulfilment-contracts-and-schema-proposal.md).
- [Request and prescription-evidence workflow](request-and-prescription-evidence-workflow.md) and [pharmacy-choice and transfer boundary](pharmacy-choice-and-transfer-boundary.md).
- [Orthogonal state model and state machine](orthogonal-state-model-and-state-machine.md), [inventory, preparation, professional-check, and release workflow](inventory-preparation-and-release-workflow.md), and [pickup, delivery, custody, and handoff workflow](pickup-delivery-custody-and-handoff-workflow.md).
- [External integrations, webhooks, idempotency, and reconciliation](external-integrations-webhooks-and-reconciliation.md) and [operational readiness and observability](operational-readiness-and-observability.md).

The coordinator calls this bounded document **Workstream K**. The full Task 08 specification labels external integrations as Workstream K and privacy/security/vendor controls as Workstream L. This document does not rename or claim completion of either specification workstream. It supplies the requested non-runnable control model; Workstream I already documents the external-integration design boundary.

Four categories remain distinct:

1. **CURRENT:** AgentOMA has invitation-only staff authentication through Better Auth, mandatory TOTP, database sessions, server-side pharmacy/role/assignment guards, server-owned `PHARMACY_ID`, protected-route no-store/referrer/CSP controls, append-only audit infrastructure, governance controls, and a zero-PHI public intake. These are current controls for existing surfaces, not evidence that Task 08 is implemented or compliant.
2. **EXISTING SYNTHETIC / EXPERIMENTAL:** Task 01 containment and Task 04 capability, trusted-context, idempotency, audit/outbox, and no-network patterns are study material only. Task 04 authority expired and its renewal remains DRAFT - NOT GRANTED. No grant, identity, permission, database, credential, control result, or production authority transfers to Task 08.
3. **PROPOSED TASK 08 DESIGN:** every control, role profile, test obligation, and response principle below. None is implemented, independently assessed, approved, certified, or production-ready.
4. **PRODUCTION-BLOCKED:** Task 08 patient/delegate/recipient identity; professional authorization; PMS, inventory, payer/payment, courier, address, notification, monitoring, support, and other vendor integrations; real PHI/prescription/custody/financial processing; and every production migration, secret, account, or external effect.

This document is not a compliance determination, PIA, TRA, penetration test, legal opinion, regulatory interpretation, professional procedure, pharmacy-governance approval, security assessment, vendor assessment, certification, or release record. It grants no authority.

## 1. Security model summary

### 1.1 Control objectives

| Control family | Objective | Proposed control identifiers | Current Task 08 status |
|---|---|---|---|
| Identity and access | Establish who or what is acting, with current assurance, assignment, session, lifecycle, and revocation evidence. | `K-IA-*` | Task 08 patient/delegate/recipient/courier/provider identities are BLOCKED or NOT VERIFIED. |
| Authorization | Permit only an exact actor/service, action, resource, scope, state version, and evidence combination at the server boundary. | `K-AU-*` | Proposed only; no Task 08 server boundary exists. |
| Data protection | Minimize, isolate, encrypt where approved, restrict, retain, hold, and dispose of each data class safely. | `K-DP-*` | Field policy, encryption/key design, retention, deletion, backup, and vendor handling are PENDING. |
| Audit and accountability | Preserve minimized attributable evidence for protected actions without turning audit into a payload store or technical log. | `K-AA-*` | Existing audit is adjacent; a closed Task 08 catalogue and failure semantics are BLOCKED. |
| Secure integrations | Treat every provider as untrusted until authenticated, authorized, validated, mapped, versioned, and reconciled. | `K-SI-*` | No Task 08 provider, credential, endpoint, SDK, account, or connection exists. |
| Privacy protection | Enforce necessity, purpose limitation, controlled disclosure, safe presentation, and prohibited-data-location controls. | `K-PP-*` | Task 08 PIA/TRA and field-by-field necessity review are NOT VERIFIED/BLOCKED. |
| Operational security | Detect, contain, investigate, recover, reconcile, and review without creating professional or business truth. | `K-OS-*` | Proposed in Workstream J; owners, runbooks, thresholds, rehearsals, and approval remain PENDING. |

### 1.2 Non-negotiable control floor

- **Authentication is not authorization.** A valid login, session, API credential, webhook signature, capability reference, one-time code, or device state does not permit an action by itself.
- Derive identity, actor/subject relationship, professional or service role, audience, pharmacy/tenant, assignment, lifecycle, approval, and trusted time from approved server-side sources. Never accept these facts from browser input, URLs, QR codes, provider payloads, patient choice, or display state.
- Reauthorize every protected read and mutation against the exact action, resource lineage, current state/source version, required evidence, cancellation/revocation, and server-owned pharmacy scope.
- Reject unknown fields, roles, actions, scopes, contracts, states, events, sources, versions, identities, relationships, or evidence. Missing, stale, revoked, contradictory, ambiguous, or unverifiable facts fail closed without a sensitive enumeration difference.
- Preserve separation among request, prescription evidence, authoritative prescription, inventory, preparation, technical check, professional check, counselling, release, READY, custody, receipt, payment, claim, return, and stock disposition.
- Use least privilege, separation of duties, current lifecycle checks, minimized responses, and attributable evidence. UI hiding, optimistic routing, monitoring, support access, or a generic administrator role is never authorization.
- A technical control may validate completeness and enforce denial. It cannot supply the missing professional, identity, physical, inventory, payment, claim, or legal fact.
- Public intake remains zero-PHI. Necessary future Task 08 PHI requires a separately approved authenticated boundary; it cannot be added to `/assessment` or browser persistence.
- No claim code, PIN, fee, maximum, eligibility result, or claim action is derived, copied, or invented by Task 08.

### 1.3 Operational security requirements

- `K-OS-01 - Browser and route security`: every future browser-facing protected mutation requires approved CSRF and origin enforcement in addition to authentication/authorization. Protected reads and responses require approved no-store caching, referrer, content-security, method/content-type, and safe-error controls. Exact policy values remain PENDING.
- `K-OS-02 - Abuse and availability`: bounded inputs/results/work, server-derived rate and abuse scope, fail-closed dependency handling, health monitoring, alerting, and protected manual recovery must not expose thresholds or create business authority.
- `K-OS-03 - Vulnerability and dependency management`: maintain an approved dependency inventory, lockfile and source-integrity controls, vulnerability review, patch/change process, build provenance, forbidden-import/unsafe-enable controls, and independent Task 11 evidence for the exact candidate. Existing incremental controls are not a Task 08 PASS.
- `K-OS-04 - Environment and service separation`: separate production, synthetic, test, provider account, credential, key, network, data, and support boundaries. Synthetic enablement, imports, credentials, data, or external effects fail hard outside the exact approved environment and lifecycle.
- `K-OS-05 - Recovery and exit`: backup encryption/expiry, isolated restore, vendor outage/exit, subprocessor change, credential revocation, rollback/kill, reconciliation, and incident runbooks require assigned owners and rehearsal before the affected stage.
- `K-OS-06 - Non-authority`: monitoring, alerting, support, deployment, recovery, vulnerability scanning, or vendor status can deny/contain an affected technical path under approved authority but cannot create a professional, identity, custody, inventory, financial, claim, receipt, or return-disposition fact.

## 2. Identity controls

### 2.1 Actor classes and identity boundaries

| Actor class | Proposed identity requirements | Authority limit | Repository status |
|---|---|---|---|
| Authenticated patient/user | Approved Task 05 identity proofing, authentication, current session, subject/audience binding, revocation, and protected read/mutation checks. | May submit or manage supported requests and choices for the authorized subject only; cannot establish prescription validity, inventory, professional decisions, release, receipt, payment, or claim. | No Task 08 patient identity runtime; BLOCKED under T08-D06/D14. |
| Delegate or patient agent | Separate actor and subject; approved grant source, scope, action, pharmacy/request lineage, assurance, validity period, revocation, and per-use reauthorization. | Cannot widen its grant, become the subject, select tenancy, delegate professional authority, or become a courier by implication. | Task 05 grant model absent; BLOCKED. |
| Authorized recipient | Package/request-specific authorization, current recipient plan, approved identity-check evidence, current release/counselling guards, expiry/revocation, and proof mapping. | Authorization to receive one applicable package is not patient login, general delegation, courier authority, or permission for another package. | Identity/proof policy NOT VERIFIED/BLOCKED. |
| Professional actor | Actual authenticated actor; current registrant/role/scope/assignment/pharmacy/session/orientation or supervision evidence as applicable; exact professional action; current evidence and state version. | Existing assessment roles/permissions do not become dispensing, substitution, checking, counselling, release, return-disposition, or claim authority. | Existing staff auth is real but Task 08 registration, professional scope, supervision, delegation, and permissions are NOT VERIFIED/BLOCKED. |
| Technician, intern, or student | Actual authenticated actor with a separately approved scope, assignment, supervision, action, and evidence contract. | Cannot silently become a pharmacist or perform pharmacist-only decisions. Unknown or unsupported scope denies. | Current role labels exist; Task 08 permissions are not approved. |
| Administrator or support actor | Named individual identity, least-privilege operational action, reason/purpose, time-bound access where applicable, approval, revocation, monitoring, and minimized audit. | Cannot impersonate patient/pharmacist, create professional facts, read broad PHI by default, select tenant, override state/evidence, or bypass denial. | Task 08 support/break-glass model absent; BLOCKED. |
| Technical operator or worker | Separately attributable human or workload identity, environment/account/service audience, exact operation, least privilege, lifecycle, credential rotation/revocation, and approved deployment/runbook. | Cannot make clinical/professional, recipient, physical-custody, inventory, financial, claim, or reportability decisions. | No Task 08 worker/service identity; proposed only. |
| External provider | Provider/service identity bound to approved environment, account, contract version, operation, pharmacy/tenant, source object, and credential lifecycle. | Authentication proves source possession only. It does not make the provider event authoritative business state. | No provider selected or connected; BLOCKED. |

### 2.2 Conceptual identity control requirements

- `K-IA-01 - Identity source`: each actor/service class has one approved authoritative identity source and assurance model. Self-asserted names, email, phone, DOB, address, OTP, link possession, browser state, courier scan, or provider account text is insufficient by itself.
- `K-IA-02 - Actor/subject separation`: persist and validate actual actor separately from patient/subject, delegate, recipient, professional, support user, courier, workload, and fact owner. A courier is never the patient's agent by implication.
- `K-IA-03 - Role and assignment`: roles are closed and server-derived. Each action requires current pharmacy/tenant assignment and, where professional, current approved professional-scope evidence. Unknown role or assignment fails closed.
- `K-IA-04 - Session boundary`: validate current session, assurance, lifecycle, audience, revocation, and appropriate reauthentication policy at every protected server boundary. Exact session duration and step-up rules require Task 05/security approval; none is invented here.
- `K-IA-05 - Credential lifecycle`: issue, store, rotate, revoke, expire, recover, and destroy credentials through approved least-privilege procedures. Raw secrets, reusable bearer references, authorization digests, cookies, or one-time values never enter URLs, logs, analytics, audit payloads, notifications, or client storage.
- `K-IA-06 - Revocation`: patient/delegate/recipient/professional/support/service/provider revocation is checked before every affected read, transition, retry, replay, notice, and handoff. Revocation blocks future action but does not erase prior attributable or physical evidence.
- `K-IA-07 - Privileged access`: administrative, production support, break-glass, backup, audit, key, and incident access is separately approved, purpose-limited, time-bounded where applicable, attributable, reviewed, and revocable. It never inherits pharmacist authority.
- `K-IA-08 - Anti-enumeration`: unknown, inactive, revoked, expired, wrong-subject, wrong-session, wrong-pharmacy, wrong-actor, wrong-action, inaccessible, or ambiguous cases expose the same generic safe result where the contract requires it.

Task 05 remains authoritative for future patient, subject, delegate, agent, recipient, audience, assurance, session, relationship, and revocation contracts. This document does not create or substitute that identity model.

## 3. Authorization controls

### 3.1 Boundary matrix

| Possession or access | Does not grant | Required authoritative boundary |
|---|---|---|
| Patient-selected pharmacy reference | Server tenant/pharmacy selection | Server-owned `PHARMACY_ID` remains authoritative for current tenant reads/writes; the unresolved neutral-choice/destination model cannot overwrite it. |
| Authenticated session | General Task 08 access | Exact actor, subject, audience, role, assignment, action, resource, lifecycle, evidence, and version checks. |
| Request create/read access | Prescription authenticity, acceptance, refill/renewal/transfer, preparation, release, payment, or claim authority | Accredited pharmacy and its approved system/professional workflow. |
| Prescription-evidence access | Professional judgment or authority to accept/reject/clarify | Actual authorized professional decision/reference under the approved pharmacy process. |
| Inventory query/estimate/confirmation access | Product suitability, substitution, preparation, READY, or release | Approved inventory source plus separately attributable pharmacy/professional decisions. |
| Preparation or technical-check access | Clinical/final check, counselling completion, release, or receipt | Current professional gates remain independent and attributable. |
| Release decision access | Pickup, courier handoff, recipient proof, receipt, return disposition, or claim | Each later package/recipient/custody/proof gate remains independently authorized. |
| Courier assignment, scan, or API access | Patient identity, recipient authority, professional release, proof acceptance, patient receipt, return acceptance, or restock | Pharmacy-owned custody/proof/return workflow after provider observation validation. |
| Payment/adjudication access | Prescription/professional authority, release, pickup, delivery, receipt, or claim creation | Finance/payer ledger facts remain separate; existing billing authority remains separate. |
| Administrative, support, monitoring, database, backup, or technical access | Clinical/professional action, broad PHI access, tenancy change, physical truth, or business override | Exact approved operational action and minimum access only; domain fact owners remain authoritative. |
| Signed/authenticated webhook | Trusted business state | Source, scope, contract, event, object, order/version, mapping, current authorization, domain guards, and fact-owner acceptance/reconciliation. |

### 3.2 Server-enforced authorization profile

Every future protected boundary must enforce:

1. strict request-size and content-type limits before parsing where applicable, followed by strict schema/unknown-field rejection;
2. current authenticated actor or approved workload/provider identity, plus approved CSRF/origin checks for browser mutations;
3. separately validated subject, delegate/recipient relationship, professional role/scope, audience, session, and assignment as applicable;
4. server-owned environment, pharmacy/tenant, trusted time, approval/lifecycle, and policy/contract versions;
5. exact action, resource lineage, request/item/package/source ownership, and operation-specific permission;
6. current mutable state/source version, cancellation, supersession, revocation, expiry, exception, reconciliation, and required evidence;
7. generic safe denial before sensitive existence, identity, scope, authorization, source, or state detail is exposed;
8. transaction, deterministic lock/fence order, idempotency, required minimized audit, and validated replay response where a write is later approved; and
9. minimized, strictly validated output containing no internal database identifier, authorization material, unnecessary PHI, professional rationale, secret, exact capacity, or arbitrary metadata.

The root `src/proxy.ts` remains only an optimistic UX gate; any future Task 08 server action, route, worker, or adapter must independently authorize. No client field, hidden control, route access, session possession, status display, or upstream service assertion replaces this profile.

### 3.3 AgentRx authority

AgentRx may:

- validate a closed request/response/event contract;
- check that approved required references and evidence are present, current, consistently scoped, and non-contradictory;
- reject stale, unauthorized, incomplete, unsupported, or unsafe transitions;
- coordinate an administrative work item, exception, or reconciliation case; and
- display a minimized accepted authoritative status with its uncertainty and source boundary.

AgentRx must not:

- determine prescription authenticity, validity, completeness, remaining quantity, refill/renewal/transfer outcome, or dispensability;
- prescribe, recommend therapy, adapt, substitute, select a product, resolve clinical clarification, or make a clinical/professional decision;
- perform or attest a technical/professional check, determine counselling completion, authorize/revoke release, or infer READY without all authoritative guards;
- establish patient/delegate/recipient identity, physical custody/receipt, inventory suitability, payment finality, claim authority, return acceptance, or stock disposition; or
- convert an alert, administrative note, support action, webhook, worker result, retry, reconciliation status, or restored record into a protected fact.

## 4. Data protection controls

### 4.1 Data classes and handling objectives

| Data class | Minimum proposed controls | Prohibited shortcut | Status |
|---|---|---|---|
| Patient/subject information | Purpose/field allowlist, approved authenticated boundary, actor-subject authorization, field-level access, encryption expectations, no-store response, retention/hold mapping. | Public intake, URL, browser persistence, broad support access, analytics, or copied profile data. | Task 05/PIA/TRA unresolved. |
| Prescription evidence and OCR | Evidence-only status, provenance, malware/type/size controls, isolated protected storage, source/version integrity, professional access, no general logging/audit body. | Treat as a prescription; expose raw content to courier/payment/analytics/support; revive retired AI extraction. | Source/storage/OCR ownership BLOCKED. |
| Delegate/recipient/identity evidence | Separate actor/subject/grant/recipient scope, minimum proof category/result, expiry/revocation, package/request binding, restricted access. | Raw identity document, photo, biometric, signature, exact location, or single-factor possession unless separately approved. | Task 05 and proof policy BLOCKED. |
| Professional records/decisions | Actual actor attribution, action/scope evidence, source/policy version, state version, immutable/superseding history, restricted access. | Clinical rationale in technical audit/logs or a system-generated professional result. | Professional policy and Task 08 audit contract BLOCKED. |
| Address, contact, package, custody, proof | Field minimization per recipient/vendor, field-level encryption expectation, package-specific scope, current authorization, protected display, no public tracking leakage. | Exact address/route/location or package content in logs, metrics, notifications, outer labels beyond approved necessity, or provider custom metadata. | Necessity/encryption/vendor/proof policies BLOCKED. |
| Inventory and financial references | Minimum source/reference/version/finality fields, separate domain authorization, no raw payment card data, no claim coupling. | Patient-linked product/price/payer/payment details in identifiers, logs, courier/notification payloads, or general analytics. | Source/finance systems NOT VERIFIED/BLOCKED. |
| Audit and governance evidence | Closed minimized schema, append-only/immutable controls, role-limited access, approved retention/hold/export/destruction and failure semantics. | Raw request/provider body, OCR/prescription content, clinical rationale, arbitrary metadata, tokens, or audit-as-debug-log. | Existing controls are adjacent; Task 08 catalogue BLOCKED. |
| Integration receipts and reconciliation | Bounded raw-byte custody decision, minimized receipt/mapping/status, source/account/environment binding, append-only attempt/conflict history, restricted access. | General JSON payload store, provider body in logs/audit, or external observation treated as truth. | No Task 08 inbox/reconciliation runtime. |
| Technical telemetry, incident evidence, and backups | Closed safe schema, access separation, redaction validation, encryption expectation, field-level retention/hold/backup/expiry mapping, isolated restore tests. | PHI/secrets in labels/tickets/traces; reuse of a clinical retention period; unreviewed third-party export. | T08-D30/D33/D34/D37 unresolved. |

### 4.2 Protection requirements

- `K-DP-01 - Minimization`: collect, derive, retain, display, export, and disclose only fields necessary for the exact approved purpose, actor, source, recipient, stage, and duration. Closed schemas reject extra and arbitrary metadata.
- `K-DP-02 - Encryption expectations`: require approved encryption in transit and at rest, plus separately reviewed field-level protection for address, contact, proof, identity, and any other high-risk field. Algorithms, libraries, key services, vendors, and certifications remain PENDING and are not invented here.
- `K-DP-03 - Key separation`: key ownership, creation, storage, access, environment separation, rotation, revocation, backup, incident response, and destruction require an approved security design. Application data, logs, audit, code, repository files, fixtures, and client bundles never carry raw keys.
- `K-DP-04 - Access restrictions`: authorize each read/export/download against current purpose, actor, subject, role, assignment, server scope, lifecycle, and resource lineage. Avoid broad list/read access; protect against cross-subject, cross-pharmacy, object-substitution, insecure direct-object reference, and support-role access.
- `K-DP-05 - Client/cache boundary`: protected responses use approved no-store/referrer/CSP/cache controls. No PHI, evidence, identity, address, recipient, proof, payment, or secret data enters URL/query/fragment, page title, browser history, browser storage, analytics, session replay, or unnecessary client props.
- `K-DP-06 - Retention and holds`: define purpose, source, classification, trigger, proposed duration, access, encryption, legal/record hold, incident preservation, backup, archival/deletion, vendor copy, and approval separately for every Task 08 dataset. No duration or universal clinical period is selected here.
- `K-DP-07 - Controlled deletion`: deletion requires current authorization, hold/incident/complaint/chargeback/custody/return/professional-record checks, affected-source and backup behavior, attributable evidence, and approved disposal. It cannot erase immutable history or make a return saleable.
- `K-DP-08 - Recovery`: backup and restore preserve confidentiality, integrity, access separation, lifecycle/revocation, immutable evidence, state versions, and required reconciliation. Restore does not revive expired authority or external/physical/financial truth.

## 5. Audit controls

Audit and technical logging are separate systems with different purposes, schemas, access, failure handling, and retention. Logging diagnoses technical health. Audit preserves approved accountability evidence for protected actions. Neither can substitute for the other.

### 5.1 Proposed audit coverage

A future approved Task 08 event catalogue must cover, where applicable:

- authentication/session/assurance outcomes, authorization allow/deny, role/assignment/grant/revocation changes, privileged/support access, and suspicious attempts;
- actual professional decision references, prescription-evidence review, clarification, preparation/check/counselling/release/revocation gates, and denied professional transitions;
- request, choice/transfer, inventory, reservation, preparation, READY, pickup, delivery, exception, return, stock-disposition, financial, cancellation, supersession, and reconciliation state-version transitions;
- package/recipient/release/proof-bound custody transfers, delivery attempts/failures, proof acceptance/rejection/dispute, return receipt, and separate stock disposition;
- external operation intent/attempt/acknowledgement/uncertainty, webhook validation/replay/order/mapping, retry/dead-letter, reconciliation assignment/resolution, vendor/support/credential incidents; and
- administrative access, export, hold, correction, approved deletion/destruction, backup/restore, containment, recovery, and incident review actions where the approved catalogue requires them.

### 5.2 Audit record and integrity rules

- Use only an approved closed combination of event type/schema version, trusted time, opaque actor/service and subject reference where necessary, opaque server-owned scope/resource references, action, outcome, safe reason, policy/source/contract version, correlation reference, and state version before/after.
- Do not include prescription image/content, OCR text/output, medication/product/quantity/directions, ailment, patient statement, clinical/professional rationale, health-card/payer information, raw address/contact/signature/identity/photo/biometric/location, card/payment data, courier route, webhook body, notification body, token, credential, secret, internal database identifier, or arbitrary metadata.
- Accepted state, validated idempotency response, required audit, and relevant outbox/inbox revision commit atomically where later approved. Required audit failure rolls back the protected local acceptance and success receipt; it does not fall back to a best-effort log.
- Preserve append-only or immutable/superseding history, sequence/version integrity, least-privilege write/read/export access, separation from application-owner bypass, tamper detection, and governed hold/retention/destruction.
- A denied attempt cannot create a protected business mutation or sensitive enumeration difference. Any denied-attempt evidence follows the separately approved minimized audit contract; no workaround event or arbitrary metadata is permitted.
- Audit access is itself purpose-limited and attributable. A valid audit role does not grant general PHI, professional, tenant, support, backup, or operational authority.

Current AgentOMA audit/governance controls are evidence of adjacent mechanisms only. They are not a Task 08 audit catalogue, complete privacy assessment, or permission to modify protected audit files.

## 6. Integration security controls

### 6.1 Provider boundaries

| Integration | Source may provide | Source cannot establish | Required additional owner |
|---|---|---|---|
| Pharmacy/PMS | Versioned source observation or acknowledgement from the approved pharmacy system. | Prescription validity/acceptance, refill/renewal/transfer, check, counselling, release, dispense, or claim without the exact pharmacy-owned authoritative contract and actor evidence. | Pharmacy/PMS and authorized professional owner. |
| Inventory | Product/allocation/reservation observation from an approved source. | Confirmed suitability, substitution, preparation, READY, release, saleable return, or current truth after expiry/contradiction. | Inventory source and pharmacy/professional fact owner. |
| Courier | Booking, assignment, pickup, route, attempt, failure, delivery, or return observation. | Recipient identity/authority, proof acceptance, patient receipt, professional release, return acceptance, restock, payment, or claim. | Pharmacy custody/proof/return owner. |
| Payer/payment | Adjudication or ledger acknowledgement/observation. | Prescription/professional authority, release, pickup/delivery/receipt, claim creation, or finality outside the approved finance workflow. | Payer/finance owner and existing billing authority. |
| Task 07 notification | Generic notice intent/delivery observation after an approved producer contract. | Identity, understanding, counselling, clarification, pickup/delivery/receipt, or workflow mutation. | Task 05 audience and Task 07 consent/contact/communications owner. |
| Address/identity provider | Bounded source validation result under an approved contract. | Patient/delegate/recipient authority, tenancy, pharmacy choice, service eligibility, or delivery success by itself. | Task 05 and privacy/pharmacy fact owner. |

### 6.2 Common provider controls

- `K-SI-01 - Contract and trust`: no provider is trusted or selected by name without approved functional contract, source/finality semantics, data-processing/confidentiality terms, security/accessibility/residency/subprocessor/support evidence, retention/deletion/backup/exit, incident notice, audit rights, insurance, availability/DR, AI/data-use restrictions, and responsible owner.
- `K-SI-02 - Service authentication`: use a separately approved service-to-service authentication and transport design bound to environment, provider account, service audience, operation, pharmacy/tenant, resource, contract version, and credential lifecycle. No protocol or algorithm is selected here.
- `K-SI-03 - Authorization`: authenticate first, then independently authorize the service/action/resource/scope. Provider identity never inherits patient, professional, courier-recipient, finance, claim, support, or tenant authority.
- `K-SI-04 - Strict validation`: bound raw bytes, content type, event/operation allowlist, schema/version, timestamp/order rules, environment/account/scope/resource mapping, source revision, and unknown-field rejection occur before domain acceptance. Unknown or oversized input fails closed.
- `K-SI-05 - Replay and duplication`: approved signature/source validation, event identity/digest, replay/order controls, scoped deduplication, idempotency, current state/source versions, and transactional processing prevent duplicate effects. Exact algorithms, windows, tolerances, and lifetimes remain PENDING.
- `K-SI-06 - Secret handling`: credentials and signing/encryption material are server-only, environment-separated, least privilege, rotated/revoked under approved ownership, excluded from code/repository/client/output/log/audit/support/fixtures, and inaccessible to unrelated services. No credential exists here.
- `K-SI-07 - Failure isolation`: dependency failure, timeout, bad authentication, contradiction, stale source, or unknown outcome blocks only the affected path, preserves evidence, and enters approved reconciliation. It cannot degrade into guessed success or bypass Task 05/07/09/professional controls.
- `K-SI-08 - Safe retry`: retry only after current authorization/versions/guards and authoritative evidence prove retry safety. Possible external effect with missing acknowledgement remains unknown and reconciles before another attempt. No distributed exactly-once claim is made.
- `K-SI-09 - Minimum disclosure`: outbound and inbound projections contain only approved fields for the exact operation/recipient. No clinical content goes to courier, payment, address, analytics, general support, or unsecured communications.
- `K-SI-10 - Operational security`: vendor MFA/support access, secret/key response, rate/abuse limits, outage/exit, subprocessor changes, incident escalation, monitoring, rollback/kill and recovery rehearsals require approval before the affected stage.

External facts remain observations until the correct authorized fact owner accepts a supported current mapping. A signature, HTTP success, provider dashboard, scan, webhook, worker status, or reconciliation queue state cannot directly create prescription acceptance, professional judgment, release, receipt, payment finality, claim authority, return receipt, or stock disposition.

## 7. Privacy controls

### 7.1 Privacy principles

| Principle | Proposed Task 08 requirement | Approval status |
|---|---|---|
| Minimum necessary | Enumerate each field, source, recipient, purpose, stage, display, vendor disclosure, and duration; reject extra fields. | PIA/field inventory PENDING. |
| Purpose limitation | Use information only for the approved coordination, professional, custody, financial, governance, or incident purpose; no secondary analytics/AI/training/marketing use by inference. | Vendor/data-use review BLOCKED. |
| Transparency and choice | Use truthful request/evidence/estimate language, disclose applicable data recipients/purpose, preserve neutral reversible pharmacy choice, and provide approved accessible alternatives. | Patient identity/choice/copy/legal review BLOCKED. |
| Access and correction | Reauthorize every protected read; separate actor/subject; provide future approved access/correction/export pathways without broadening current governance automatically. | Task 05 and Task 02/governance ownership unresolved. |
| Controlled sharing | Disclose the minimum projection only to an approved pharmacy/provider/recipient for the exact operation and current authorization. | No production provider contract. |
| Evidence preservation | Preserve material professional, custody, external, audit, incident, complaint, hold, and reconciliation evidence under approved access/retention without over-retaining unrelated content. | Field retention/hold policy BLOCKED. |
| Data lifecycle | Define collection, active use, archival/hold, vendor copy, backup, deletion, destruction, incident preservation, and exit independently per dataset. | No duration or destruction approval. |
| Accountability | Assign actual human/service owners, record minimized attributable decisions, review privileged/vendor access, and retain evidence of control operation. | Owners/reviewers PENDING. |

### 7.2 Prohibited data locations and disclosures

PHI, personal data, prescription/OCR/medication/clinical content, patient statements, address/contact/recipient/proof/location, payer/payment/claim data, identity evidence, internal identifiers, credentials, tokens, and vendor secrets must not enter:

- URLs, query strings, fragments, page titles, browser history, browser storage, referrers, public tracking, reusable public links, calendars, or filenames;
- analytics, session replay, client error reporting, metric labels, traces/spans, application logs, error breadcrumbs, general support tickets/chats, screenshots, or arbitrary metadata;
- queue/topic/routing names, idempotency/correlation keys, webhook event identifiers, notification previews/bodies beyond separately approved generic content, courier custom metadata, or payment metadata;
- outer courier labels/manifests beyond separately approved minimum necessity; or
- unapproved client props, caches, exports, vendor dashboards, testing artifacts, development fixtures, or evidence packages.

Technical identifiers are opaque, non-semantic, non-reversible, non-authorizing, scoped, bounded, and never derived by hashing raw sensitive data into a fingerprint. Protected drill-down requires a fresh authorized application read, not information embedded in a metric, alert, URL, ticket, or identifier.

Task 07 alone would own approved contact, consent, generic external notices, secure messages, and provider-delivery evidence. Task 05 alone would own future authenticated patient/delegate/recipient reads. No universal claim that PHIPA requires Canadian hosting is made; geography, cross-border support, residency, subprocessors, and backups require source-specific privacy/security/legal and project review.

## 8. Threat mitigation mapping

The following table maps Workstream B risks to **proposed** controls. “Mapped” does not mean mitigated, tested, accepted, or approved; residual decisions remain open.

| Workstream B threat | Proposed preventive controls | Proposed detective/response controls | Residual status / owner functions |
|---|---|---|---|
| R01-R02 - Evidence becomes prescription authority; malicious provenance | `K-AU` professional boundary, evidence-only contract, strict provenance/version/schema, protected storage/access, no AI professional inference. | Contradiction/provenance alerts, professional review queue, immutable evidence and safe rejection. | Prescription owner, pharmacist/DM, Task 03, privacy/security; BLOCKED. |
| R03 - Cross-subject/pharmacy/object substitution | `K-IA-02/03`, server-owned pharmacy scope, exact lineage/action/resource checks, opaque references, anti-IDOR, current authorization. | Generic denial, cross-scope isolation tests, minimized suspicious-attempt audit. | Task 05/architecture/security; BLOCKED. |
| R04 - Audience confusion or privilege escalation | Closed roles/permissions, actual professional attribution, assignment/scope/supervision checks, least privilege, no admin/support impersonation. | Role/action anomaly detection, access review, denial/audit under approved contract. | Professional/identity/security policy NOT VERIFIED. |
| R05 - Delegate/recipient revocation bypass | Scoped Task 05 grant, actor-subject separation, expiry/revocation and per-use reauthorization; package-specific proof. | Revoked/stale/wrong-subject/package denial and grant-use review. | Task 05/proof policy BLOCKED. |
| R06 - Pharmacy-choice manipulation or stale accreditation | Separate choice from tenancy, neutral source-labelled information, freshness/accreditation revalidation, reversible choice. | Choice/version/conflict review without commercial ranking. | Royian, Task 05, pharmacist/DM, legal/privacy; BLOCKED. |
| R07-R09 - Inventory estimate, race, product/storage/substitution uncertainty | Estimate/confirmation separation, approved source/version/expiry, reservation fencing, per-item guards, pharmacy-owned suitability/substitution. | Stale/contradictory/recall/quarantine exceptions and reconciliation. | Inventory/professional/vendor policy BLOCKED. |
| R10 - Preparation/technical/payment implies release | Independent professional-check/counselling/release gates, actual actor, current evidence/version, explicit revocation and READY derivation. | Invalid-transition denial, release/revocation audit and race tests. | Professional scope and release policy BLOCKED. |
| R11-R13 - Estimate guarantees, duplicate money effect, fulfilment creates claim | Strict estimate language, finance/source separation, scoped idempotency/fencing, existing billing authority, no claim coupling. | Ledger/source reconciliation, duplicate/unknown-outcome alerts, zero-claim-effect tests. | Task 09/finance/payer/billing owners; BLOCKED. |
| R14-R15 - Wrong recipient or address substitution | Task 05 recipient grant, approved identity-check category, exact address revision, package/request/release binding, minimum access/encryption. | Wrong/revoked/mismatched/expired denial, proof/address conflict review. | Identity/address/proof/privacy policy BLOCKED. |
| R16-R20 - Courier/receipt, integrity, forged proof, failed delivery, return/restock | Courier as untrusted source, release-before-custody, package-specific proof, explicit custody, failure/return states, correct-pharmacy receipt, separate stock disposition. | Proof/event/custody discrepancies, incident containment, return reconciliation, append-only evidence. | Courier/proof/return/professional policy BLOCKED. |
| R21-R22 - Races, outage, unsafe retry | State/source versions, deterministic locks/fences, scoped idempotency, validated replay, unknown-outcome reconciliation, no silent recovery. | Conflict/backlog alerts, attempt/acknowledgement evidence, recovery tests. | Runtime/retry/vendor/SLO design PENDING. |
| R23 - Spoofed/replayed/contradictory webhook | `K-SI-02` through `K-SI-08`: approved source authentication, raw-byte/schema/size/scope checks, replay/order/dedup, current authorization. | Reject/quarantine, credential/source incident response, reconciliation; no direct domain effect. | Provider protocol/windows/credentials BLOCKED. |
| R24 - Sensitive-data leakage | `K-DP`, `K-PP`, closed projections, field encryption expectation, no-store/referrer/CSP, safe errors, prohibited-location policy. | Synthetic sentinel scans, redaction/schema rejection, privacy/security incident response. | PIA/TRA/field/vendor/telemetry decisions BLOCKED. |
| R25 - Vendor/insider/support compromise | Distinct identities, least privilege, MFA where approved, time-bound support, secret/key lifecycle, access audit, vendor contract/exit. | Access/credential monitoring, containment/revocation, evidence preservation, human assessment. | Vendor/security/privacy/procurement evidence absent. |
| R26 - Enumeration/flooding/resource abuse | Generic denial, strict bounds, authenticated scopes, rate/abuse controls, workload isolation and bounded queues. | Aggregate safe anomaly metrics and approved escalation without exposing thresholds/resources. | Limits/fairness/capacity policy PENDING. |
| R27 - Audit gaps or unsafe audit payload | `K-AA` closed schema, required atomic audit, immutable/superseding history, restricted writes, no arbitrary metadata. | Integrity/sequence/failure monitoring and transaction rollback. | Audit owner/schema/failure semantics BLOCKED. |
| R28 - Retention/deletion destroys evidence | Field lifecycle inventory, holds/incidents/complaints/custody checks, controlled deletion, backup/vendor exit mapping. | Hold/destruction manifests, discrepancy review, isolated restore tests. | Records/privacy/legal/professional approval BLOCKED. |
| R29 - Accessibility failure changes choice or receipt | Approved alternatives, accessible authentication/recipient/proof/recovery, no camera/GPS/biometric/smartphone-only dependency by default. | Accessibility failure incident and independent Task 11 evidence. | Applicability/target/accommodation policy NOT VERIFIED. |
| R30 - Synthetic capability becomes production permission | Exact scope/candidate/lifecycle, no-egress/production fail-hard/import/env/dependency controls, no real data/accounts/effects, Task 11 gates. | Architecture/provenance/evidence validation and kill/rollback review. | Task 08 runtime approval absent; BLOCKED. |

## 9. Security testing obligations - not implemented or run

| Test ID | Planned future evidence |
|---|---|
| K-T01 - Unauthenticated and expired session | Every protected read/mutation/worker support path denies without a current approved identity/session and returns the same generic minimized result. |
| K-T02 - Authentication is not authorization | Valid sessions, provider credentials, OTP/link possession, technical accounts and signed webhooks cannot perform actions outside exact role/action/resource/scope/evidence permissions. |
| K-T03 - Privilege escalation | Patient, delegate, recipient, courier, technician, trainee, administrator, support, worker and provider cannot obtain pharmacist-only or another actor's authority through request fields, UI state, re-export, role substitution or internal endpoint access. |
| K-T04 - Revoked and stale access | Session, role, assignment, delegate/recipient grant, professional scope, support grant, service credential, provider credential and lifecycle revocation/expiry are rechecked before reads, transitions, replay, retry, notice and handoff. |
| K-T05 - Tenant/subject/object isolation | Cross-patient, cross-subject, cross-pharmacy, wrong-resource, wrong-item/package/source and ambiguous-reference cases deny generically; patient choice and browser/provider scope never select tenancy. |
| K-T06 - Unauthorized state transition | Every professional, inventory, READY, custody, receipt, financial, claim, return and disposition transition rejects missing/unsupported actor, evidence, state/source version, guard or policy without partial effects. |
| K-T07 - Sensitive logging and exposure | Synthetic sentinels prove zero PHI/prescription/OCR/clinical/address/recipient/proof/payment/claim/credential/secret/internal-ID leakage across URLs, titles/history/storage, caches, analytics/replay, logs/traces/metrics/errors, alerts/tickets, queue/topic/key names, notices, labels/metadata, screenshots and evidence filenames. |
| K-T08 - Strict data minimization | Request, response, event, audit, log, vendor and export schemas reject unknown, extra, high-cardinality, arbitrary, prohibited and semantically impossible fields; responses remain bounded and minimized. |
| K-T09 - Webhook authentication/replay | Invalid/missing authentication, wrong environment/account/pharmacy/resource, expired/reordered/duplicate/replayed/oversized/unknown events and changed digest fail closed; no event directly creates protected state. |
| K-T10 - External failure isolation | PMS/inventory/courier/payment/notification/address/identity adapter outage, timeout, contradiction or unknown outcome blocks only affected progression, preserves evidence, and cannot trigger unsafe fallback or duplicate effect. |
| K-T11 - Secret and credential ownership | Architecture/configuration scans prevent client, log, audit, fixture, source, artifact or unrelated-service access to server-only credential/key material; rotation/revocation behavior follows the approved synthetic contract. |
| K-T12 - Idempotency and concurrency | Actor/service-operation-resource-projection binding, current versions, real transaction/barrier tests, rollback, duplicate workers, replay validation and unknown-outcome reconciliation prove no duplicate/partial effect. |
| K-T13 - Audit integrity and tampering | Direct update/delete, invalid combinations, extra/sensitive fields, replay duplication, unauthorized readers/writers and missing required audit are rejected; required audit failure rolls back protected acceptance. |
| K-T14 - Privileged/support access | Unknown, over-broad, expired, cross-scope, unapproved-purpose, concurrent revocation and attempted impersonation fail closed; permitted access is minimized and attributable. |
| K-T15 - Retention, hold, deletion and restore | Active hold/incident/complaint/custody/return/professional obligation blocks unsafe deletion; restore preserves isolation, history, revocation and reconciliation and does not recreate external truth. Durations remain policy fixtures only after approval. |
| K-T16 - Tracking, notification and client privacy | Protected tracking reauthorizes every read, is no-store and minimum-state; generic Task 07 notices and opaque references reveal no health relationship or reusable authority; no third-party analytics/replay loads. |
| K-T17 - Abuse and enumeration | Bounded inputs/results/queues, generic errors, rate/abuse controls and concurrent probes cannot reveal existence, scope, role, capacity, recipient, workflow or protective thresholds. Exact limits require approval. |
| K-T18 - Incident and recovery | Deterministic synthetic exercises cover detection, containment/revocation, evidence preservation, investigation, recovery/reconciliation, failed escalation, duplicate recovery, corrective action and independent review without automatic reportability or professional decisions. |
| K-T19 - Synthetic/production isolation | Production environment/import/dependency/credential/data/network enablement fails hard; Task 04 authority cannot be reused; exact candidate/lifecycle/Task 11 evidence is required. |
| K-T20 - Independent acceptance | Exact-candidate privacy/security/professional/accessibility/operations/vendor review validates real control behavior and artifacts. Technical tests alone cannot establish compliance, certification, legal interpretation, professional approval, or production readiness. |

All tests are future obligations. No test, fixture, route, middleware, identity, provider, credential, database, migration, Docker service, network call, security scan result, PASS evidence, or approval is created or run by this document.

## 10. Incident response principles

A future Task 08 security/privacy incident process follows **Detection -> Containment -> Investigation -> Recovery -> Review**. Resolution and reconciliation of affected professional, physical, external, identity, financial, and governance facts occur within recovery before the affected workflow resumes.

| Phase | Required proposed actions | Authority and evidence boundary |
|---|---|---|
| Detection | Validate the signal and telemetry health; record trusted detection time, safe category, affected component/workflow class, source reliability, initial uncertainty, and opaque incident reference. | Detection does not establish breach, harm, medication incident, fraud, loss, custody, or final business state. |
| Containment | Deny affected transitions; pause unsafe outbound effects; fence workers; restrict/revoke compromised session, credential, webhook or vendor-account access under approved authority; hold package/inventory/payment/claim/notification progression; escalate physical custody to the pharmacy. | Technical/security owners contain systems/access. Pharmacy/DM/professional owners control medication safety, release, package/custody and professional decisions. Monitoring alone is not authority. |
| Investigation | Preserve minimized immutable attempts, source observations, versions, audit, access, containment, recovery, discrepancies and chronology; restrict evidence access; assess patient-safety, privacy/security, professional, vendor and financial scope through authorized humans. | Do not copy protected content into general logs/tickets or auto-decide legal reportability, clinical harm, medication incident, controlled-substance loss, claim fraud, or professional accountability. |
| Recovery | Correct the technical cause through approved change controls; rotate/revoke/reissue access where authorized; restore safely; reconcile external/physical/financial facts; obtain required professional decisions; revalidate authorization/lifecycle/versions/audit/custody before resuming. | Service recovery, credential rotation, alert clearance, replay, restore or vendor statement cannot create protected truth. Unknown state remains blocked. |
| Review | Record root/contributing causes, control effectiveness, evidence integrity, communication, corrective actions, owner/deadline after actual assignment, re-test, residual-risk decision and independent review. | Named owners, timing, notification/reporting obligations and risk acceptance remain PENDING; no value or approval is inferred. |

Communication uses an approved minimum-necessary operational channel and opaque incident reference. Patient/delegate/recipient communication requires Task 05 audience authorization and Task 07 contact/consent/template/secure-message controls. Pharmacy, Designated Manager, privacy/security, legal, records, finance/payer, insurer, regulator, law enforcement, vendor, and affected-custodian communication occurs only when the authorized owner determines it is applicable. No regulatory reporting timeline is invented.

Evidence preservation follows the approved audit, retention, hold, backup, access, and incident contracts. It must not create a second unsafe PHI store. Corrective action cannot delete history, weaken a guard, guess custody/receipt, restock a return, retry an uncertain external effect, create/reverse a claim, or substitute technical recovery for professional judgment.

## 11. Production blockers and unresolved decisions

| Decision references | Unresolved security/privacy requirement | Blocked stage |
|---|---|---|
| T08-D02-D04, D10, D36-D37 | Exact synthetic candidate/scope/exclusions, risk/autonomy level, owners/backups, lifecycle/review/kill/rollback, no-egress/production fail-hard controls, Task 01 use and applicable Task 11 checkpoints. | Runnable SYN; validation/pilot/production. Independent documentation may continue. |
| T08-D05-D06, D14, D17 | Actual prescription-evidence owner/storage boundary and Task 05 patient/subject/delegate/recipient identity, assurance, session, audience, assignment and revocation contract. Existing staff auth is not patient identity. | Affected integrated SYN; every patient-side PHI/protected tracking flow; pilot/production. |
| T08-D07, D31 | Task 07 runtime, producer contract, contact/consent, generic templates, secure messaging, provider and communication incident/retention controls. | Notification/tracking integration; pilot/production. |
| T08-D08, D21-D22 | Actual PMS/finance/payer/payment/claim ownership, finality, minimum data, ledger, idempotency/reconciliation and security contracts. Task 09 does not gain that authority by task number. | Financial integration; pilot/production. |
| T08-D13-D16, D20, D23-D27 | Choice versus server tenancy, accreditation/Internet-site review, professional/trainee scope, high-risk/jurisdiction exclusions, recipient/address/proof/courier/return/disposition policy. | Policy-dependent SYN; validation/pilot/production. |
| T08-D18, D29, D32 | Closed authorization/state/event/error/audit contracts; state/source versions; locks/fences; idempotency/inbox/outbox; replay/retry/reconciliation; denied-action and audit failure semantics. | Any runnable protected state or integration. |
| T08-D28, D30 | Provider/vendor selection and contract, data minimization, service authentication, encryption/key custody, privileged/support access, geography/subprocessors/backups, incident/exit, PIA/TRA and security/privacy assessment. | Any vendor-backed work where applicable; validation/pilot/production. |
| T08-D33-D35 | Field retention/hold/deletion/backup, incident/reporting/runbooks, and accessible alternatives/targets. No duration, reporting timeline or compliance conclusion is approved. | Persistence/operations/UI validation; pilot/production. |
| T08-D37 | Exact-candidate independent professional/DM/privacy/security/legal/accessibility/finance/vendor evidence, monitoring/abuse/support/recovery, secrets/schema approval, reconciliation rehearsal and explicit go-live. | Validation/pilot/production. |

Task 08 has no production patient/delegate/recipient/courier/provider identity system, security middleware, privacy/security control implementation, monitoring stack, provider integration, or compliance certification. Existing AgentOMA staff security and governance remain protected adjacent systems, not Task 08 completion evidence. Task 05 identity, Task 07 communications, Task 09/actual financial ownership, Task 11 checkpoints, professional scope, PIA, TRA, privacy/security review, vendor contracts, retention, incident procedures, and production authorization remain BLOCKED or NOT VERIFIED as recorded above.

Production-only decisions are not blanket prerequisites for unrelated documentation or a separately approved independent synthetic slice. A missing identity, authority, source, privacy/security, professional, vendor, retention, incident, accessibility, or Task 11 control still blocks every affected slice and stage. Every Task 08 mandatory stop condition remains controlling.

## 12. Explicit non-authorization

This document grants **no implementation, security approval, privacy approval, compliance finding, certification, regulatory approval, legal interpretation, professional approval, pharmacy-governance approval, risk acceptance, vendor/procurement approval, identity or authentication authority, schema, migration, middleware, dependency, credential, secret, account, integration, network call, synthetic-runtime, pilot, or production authorization**.

It creates no real or synthetic runtime, route, server action, worker, queue, webhook, identity, role, permission, professional decision, prescription, PHI flow, inventory effect, release, pickup, courier activity, delivery, proof/receipt, return, restock, payment/adjudication, claim, notification, audit event, retention/deletion rule, monitoring control, security evidence, test result, or external effect. Public intake remains zero-PHI; server-owned pharmacy scope remains authoritative; AgentRx remains non-professional; external systems remain untrusted observations; unknown or contradictory state fails closed; and all production Task 08 functionality remains blocked.
