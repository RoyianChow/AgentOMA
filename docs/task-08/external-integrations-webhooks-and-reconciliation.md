# Task 08 — External integrations, webhooks, idempotency, and reconciliation

**Status: WORKSTREAM I DOCUMENTATION / PROPOSED DESIGN ONLY. No adapter, webhook route, worker, schema, migration, credential, external call, professional decision, physical effect, financial effect, claim effect, or production authority.**

## 1. Scope and reading boundary

This document defines how a future Task 08 coordination boundary could receive and reconcile external observations safely. It must be read with [AGENTS.md](../../AGENTS.md), the [project overview](../PROJECT_OVERVIEW.md), the full [Task 08 specification](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), and completed Workstreams A–H:

- [Current state and gap analysis](current-state-and-gap-analysis.md), [Ontario standards and policy mapping](ontario-fulfilment-standards-and-policy-mapping.md), and [production dependency and decision register](production-dependency-and-decision-register.md).
- [Fulfilment threat model](fulfilment-threat-model.md) and [trust boundaries and data flows](trust-boundaries-and-data-flows.md).
- [Professional responsibility matrix](professional-responsibility-matrix.md) and [role and transition authorization matrix](role-and-transition-authorization-matrix.md).
- [Fulfilment contracts and schema proposal](fulfilment-contracts-and-schema-proposal.md).
- [Request and prescription-evidence workflow](request-and-prescription-evidence-workflow.md) and [pharmacy-choice and transfer boundary](pharmacy-choice-and-transfer-boundary.md).
- [Orthogonal state model and state machine](orthogonal-state-model-and-state-machine.md), [inventory, preparation, professional-check, and release workflow](inventory-preparation-and-release-workflow.md), and [pickup, delivery, custody, and handoff workflow](pickup-delivery-custody-and-handoff-workflow.md).

The coordinator calls this bounded document **Workstream I**. The full Task 08 specification labels its pickup workflow Workstream I and its external-integration work Workstream K. This document does not rename or claim completion of either specification workstream. It consolidates only the requested external trust, webhook, idempotency, and reconciliation design in one non-runnable document.

Four categories remain distinct:

1. **CURRENT:** the root application has protected assessment, advisory claim-draft, follow-up, audit, and governance workflows. It has no Task 08 PMS, prescription, inventory, payer, payment, courier, address, notification, webhook, inbox, external-operation, or reconciliation runtime.
2. **EXISTING SYNTHETIC / EXPERIMENTAL:** Task 01 isolation and Task 04 no-network adapter, transaction, idempotency, and outbox patterns are study material only. Task 04 authority expired and its renewal remains DRAFT — NOT GRANTED. No Task 04 import, grant, table, credential, or runtime authority transfers to Task 08.
3. **PROPOSED TASK 08 DESIGN:** every adapter boundary, record, lifecycle, control, and test obligation below. None is implemented or approved.
4. **PRODUCTION-BLOCKED:** every real pharmacy/PMS, inventory, payer/adjudicator, payment, courier, address, notification, billing/claim, webhook, query, or other vendor connection and effect.

No production integration currently exists for Task 08. The current protected claim-draft path is not an HNS submission API, finance engine, or integration precedent. The public intake remains zero-PHI, and no external identifier, callback, request body, provider account, patient choice, URL, QR code, or session may select or replace server-owned `PHARMACY_ID`.

## 2. External trust model

External systems provide **observations and acknowledgements only**. Even a correctly authenticated, signed, timely, well-formed event is untrusted business evidence until the correct internal fact-owner workflow validates its source, scope, lineage, version, ordering, current authorization, and consistency with existing evidence.

AgentRx may validate a closed contract, map supported facts, detect discrepancies, coordinate a work item, and enforce that required evidence exists. It must not supply missing professional, identity, custody, financial, claim, or inventory truth. Acceptance belongs to the separately approved pharmacy, professional, finance, custody, identity, or communications fact owner for that domain.

An external request, response, import, callback, webhook, poll result, scan, status, or provider dashboard must never directly establish:

- prescription acceptance or rejection;
- prescription authenticity or validity;
- clarification resolution;
- product, substitution, therapy, technical-check, professional-check, counselling, release, or return-disposition decisions;
- patient or pre-authorized-recipient identity or receipt;
- final payment, a claim, claim submission, or claim reversal;
- saleability, restock, re-dispensing, or disposal of a return; or
- any other protected state whose fact owner has not accepted current supporting evidence.

Unknown, missing, stale, expired, revoked, reordered, contradictory, wrong-environment, wrong-account, wrong-pharmacy, wrong-tenant, wrong-resource, wrong-version, unauthorized, unmapped, or uncertain external state fails closed. It cannot be converted to success by a timeout, retry, worker, administrator, support user, courier, patient, webhook, or generic “processed” flag.

## 3. Proposed adapter boundaries

These are conceptual boundaries, not selected products or connections:

| Adapter boundary | Purpose and direction | External fact ownership | Permitted future use after internal validation | Direct effects that remain prohibited |
|---|---|---|---|---|
| Pharmacy or PMS | Outbound coordination intent and inbound acknowledgement/source observation | Approved pharmacy/PMS source owns its source record; actual professional author remains separately attributable | Reference a current source record/revision and supported professional evidence for pharmacy-owned review | Prescription validity, acceptance, clarification resolution, substitution, checks, counselling, release, dispense, claim |
| Inventory | Outbound bounded query/reservation intent and inbound stock/allocation observations | Approved inventory source owns raw source facts; pharmacy owns fulfilment reliance and suitability | Create an expiring estimate or support a pharmacy-authoritative confirmation/reconciliation | Confirmed stock, substitution, preparation authorization, release, READY, saleable return |
| Payer/adjudicator | Outbound approved adjudication request and inbound source result/reversal observation | Approved payer/adjudicator owns its adjudication ledger | Reference an accepted, versioned adjudication fact after finance reconciliation | Payment finality, release, delivery, receipt, therapy, claim submission |
| Payment provider | Outbound approved payment operation and inbound ledger acknowledgement/observation | Approved payment provider and finance owner control their ledger facts | Reference accepted authorization, capture, failure, cancellation, refund, or dispute evidence | Claim, professional decision, release, pickup, delivery, receipt |
| Courier | Outbound booking/cancellation intent and inbound booking, custody, attempt, failure, or return observations | Courier owns raw transport observations; pharmacy owns assignment, custody acceptance, proof acceptance, and return receipt | Support a pharmacy-owned custody projection or reconciliation after package, assignment, release, recipient, proof, and versions pass | Recipient identity, proof acceptance, patient receipt, professional release, fulfilment completion, claim |
| Address verification | Outbound minimum-necessary address verification request and inbound bounded verification observation | Patient/authorized actor supplies and confirms address; approved source supplies only its verification result | Support an approved service-area/jurisdiction check against the exact address revision | Identity, recipient authority, tenancy, pharmacy choice, delivery success |
| Task 07 communications | Outbound generic notice intent and inbound delivery-status observation | Task 07 would own approved contact, consent, template, and delivery evidence | Show a generic communication status after Task 07 and Task 05 authorization | Read/understanding, counselling, clarification resolution, pickup, delivery, receipt |
| Existing billing or claim service | Reference-only boundary until independently approved; no Task 08 outbound claim operation | Existing protected billing owner remains authoritative | At most preserve an independently authorized opaque reference | Claim creation, coding, submission, reversal, PIN/fee/maximum derivation, payment or fulfilment inference |

Each actual operation requires its own approved contract. No shared “vendor event” object may erase source-specific authority, privacy, ordering, acknowledgement, or finality semantics.

For every future external operation, the contract must explicitly record and approve:

| Contract element | Required rule |
|---|---|
| Purpose and direction | One narrow operation and INBOUND or OUTBOUND direction; no generic pass-through. |
| Authoritative source and acceptance owner | Name the source that owns the observation and the internal fact owner permitted to accept it. A source signature is not professional attribution. |
| Strict request and response schemas | Versioned, bounded, unknown-field rejecting, operation-specific schemas. Exact schemas remain PENDING. |
| PHI/personal fields and minimum transformation | Enumerate necessary fields, omit everything else, and keep protected values out of technical identifiers and generic metadata. |
| Authentication and authorization | Approved service identity/protocol plus server-derived environment, account, pharmacy, tenant, operation, resource, actor/service audience, assignment, lifecycle, and Task 11 checks. |
| Encryption and secret ownership | Approved transport/at-rest controls, key custody, rotation, least privilege, and incident path. No credential exists or is authorized here. |
| Idempotency and correlation | Separate random non-authorizing values, scoped to actor/service, pharmacy, operation, resource, and strict non-sensitive projection. |
| Timeout, retry, and ordering | Source-specific reviewed limits and ordering guarantees. No timeout, tolerance, backoff, lease, or retry count is invented here. |
| Acknowledgement and uncertain outcome | Define what proves accepted receipt versus completed effect. Unknown outcome enters reconciliation before retry. |
| Webhook and polling behavior | Approved authentication, raw-byte limits, schema/type allowlist, replay/order handling, durable receipt, mapping, and reconciliation. |
| Cancellation | State what can be requested, what acknowledgement is authoritative, and how a race preserves the actual external effect. |
| Retention and evidence custody | Field-level retention, hold, backup, disposal, source-body custody, and contract exit. No duration is selected here. |
| Audit and safe errors | Body-free minimized events and generic safe error mapping; no vendor/SQL/secret/identity enumeration. |
| Production approval owner | Actual named owner/reviewer and approval evidence are PENDING; this document grants none. |

## 4. Webhook lifecycle

### 4.1 Conceptual receipt fields

The proposed receipt follows D41 in the [contract proposal](fulfilment-contracts-and-schema-proposal.md#d41--externalwebhookreceipt). It is evidence of receipt and processing, not evidence that a business fact is true.

| Required concept | Proposed safe representation and rule |
|---|---|
| External event identifier | Opaque mapped `eventIdRef`, scoped to provider/account/environment/pharmacy; raw IDs do not become public identifiers or labels. |
| Provider reference | Server-bound `vendorAccountRef`; no browser-selected provider, tenant, pharmacy, account, or environment. |
| Received timestamp | Shared `B.createdAt` supplies the trusted server/database receipt time (the `receivedAt` concept), distinct from signed `sourceOccurredAt` and from any business-effective time. |
| Event type and version | Closed allowlisted `eventType` plus bounded `eventSchemaVersion`; unknown type/version is rejected or reconciled, never loosely parsed. |
| Payload integrity | Server-only digest of the authenticated bounded raw bytes; a digest proves byte equality, not truth. |
| Authentication status | Approved `authenticationEvidenceRef` and safe validation category; never the signature, key, credential, or detailed public failure reason. |
| Processing status | Closed projection such as received, duplicate, mapping pending, processed, rejected, dead letter, or reconciliation required. “Processed” means processing completed, not protected state accepted. |
| Reconciliation state | Optional exact `ReconciliationCase` reference when mapping, ordering, source, evidence, or outcome remains uncertain. |
| Retry state | Link to the exact append-only external-operation attempt/fence and any approved next-eligible time; no retry while effect certainty is unknown. |
| Mapped internal references | Exactly scoped existing `ExternalOperation`, request/resource, and minimized fact-projection references. Unmapped events cannot perform domain work. |

No general raw-body JSON column is proposed. Any original body that an approved evidence policy requires must remain with a separately approved protected source/evidence custodian; it never enters technical audit, logs, errors, analytics, support tools, or arbitrary metadata.

### 4.2 Processing sequence

1. **Reject before parsing:** enforce approved method, content type, exact raw-byte size, transport, endpoint, and environment boundaries.
2. **Authenticate source:** validate the approved signature or equivalent protocol, timestamp tolerance, replay controls, vendor/account/environment and server-owned pharmacy/tenant scope. Exact protocols and tolerances remain PENDING.
3. **Parse strictly:** validate the allowlisted event type, schema version, field bounds, semantic combinations, source occurrence time, and payload integrity.
4. **Persist safe receipt first:** store the bounded valid inbox evidence and digest before domain processing. Unknown senders or unauthenticated bodies receive only separately approved minimal denial evidence, never a fabricated accepted receipt.
5. **Deduplicate and order:** match the scoped event identity and digest. Same identity with different bytes is a conflict; reordered, late, or terminal-regressing observations enter reconciliation.
6. **Map safely:** resolve only a server-known provider account, existing operation, opaque internal resource, exact source revision, and minimum fact projection. No provider-supplied internal identifier becomes authority.
7. **Reauthorize and recheck:** validate current service identity, pharmacy, tenant, resource lineage, assignment, lifecycle, Task 11 gate, trusted time, local `stateVersion`, source revision, and all domain-specific guards.
8. **Accept observation or reconcile:** the correct fact-owner workflow may accept one supported observation; otherwise reject, dead-letter, or open/retain reconciliation. AgentRx never supplies the missing fact.
9. **Commit local evidence atomically:** accepted local projection, idempotency result, required minimized audit, and processing revision commit together where later approved. A local transaction cannot claim atomicity with the external provider.

Webhook receipt is never equivalent to trusted business state. Unknown or unsafe events fail closed without a protected mutation, success intent, sensitive enumeration difference, or blind retry.

## 5. Idempotency rules

Application-command idempotency, external-operation attempt control, and provider-event deduplication are related but distinct. They must not share a generic key or projection that loses actor, resource, provider, or fact-specific meaning.

Core requirements:

- Generate/accept only an opaque random operation key through the approved protected boundary; persist a digest rather than exposing it.
- Bind the key to current authenticated actor or approved service identity, server-owned pharmacy/tenant, exact operation, exact resource, contract version, and a strict operation-specific non-sensitive request projection.
- Do not put names, addresses, contact data, health-card data, prescription/medication/clinical data, payer/payment data, provider secrets, raw payloads, or internal database IDs into a key, canonical fingerprint, or correlation reference. Do not “hide” raw PHI by hashing it into a fingerprint.
- Same key, same strict request, and completed result may return only a stored response that is revalidated against the current minimized response schema. Authorization and lifecycle are rechecked on replay.
- Same key with any changed projected request conflicts generically. It must not create another operation or effect.
- An in-progress operation returns a safe deterministic status. A malformed stored replay fails closed.
- Proven local rollback leaves no successful receipt. An external attempt with unknown outcome is not proven rollback and must reconcile before another effect.
- Event deduplication binds provider/account/environment/pharmacy, event identity, schema/type, resource/operation, and payload digest. Same identity and different digest is a conflict, never an overwrite.
- Every mutable projection consumes a current local `stateVersion` and source revision. Every attempt, acknowledgement, raw-observation reference, acceptance, conflict, and resolution remains append-only or is superseded by an attributable revision.
- No exactly-once vendor guarantee is assumed. A vendor idempotency claim requires technical and contractual verification before reliance.

| Scenario | Required result |
|---|---|
| Duplicate webhook or provider replay | Same scoped identity and digest produces no second domain effect; changed digest opens conflict/reconciliation. |
| Duplicate delivery/custody event | One accepted observation per exact package/attempt/custody version; never another receipt or proof. |
| Duplicate payment event | One accepted ledger observation revision; never a second charge/refund, claim, release, or receipt. |
| Duplicate inventory update | One source observation revision; it cannot duplicate reservation or make an estimate authoritative. |
| Retry after timeout | Retry only after authoritative query or assigned reconciliation proves no effect and the approved policy permits a new fenced attempt. |
| Duplicate browser/worker/device request | Actor/service, operation, resource, strict projection, authorization, and state version yield one logical local intent. |

The **deduplication window/lifetime is a required contract concept but remains PENDING** for every provider and operation. No duration is invented. Expiry of an application key or inbox retention window must never by itself authorize a duplicate external effect; durable source-operation evidence, authoritative query, and reconciliation must prevent unsafe repetition under the approved retention and exit policy.

## 6. Reconciliation process

### 6.1 Requested labels mapped to the canonical Workstream F lifecycle

The requested phrases are represented without adding a competing state machine:

| Requested label | Canonical representation | Rule |
|---|---|---|
| No discrepancy | `NOT_REQUIRED` | No active unresolved conflict for the exact fact/revision. A later contradiction opens `PENDING`; it does not rewrite the prior observation. |
| Suspected mismatch | `PENDING` | One exact issue/revision is recorded with bounded evidence and no repeat external effect. |
| Under review | `IN_PROGRESS` | An actual accountable source-domain owner is assigned and investigates current versions. `MANUAL_REVIEW_REQUIRED` is used when human evidence/authority is required; `UNRESOLVED` remains safe when truth cannot be proved. |
| Resolved | `RESOLVED_NO_EFFECT` or `RESOLVED_APPLIED` | Authoritative evidence proves no effect, or the approved fact owner applies one validated effect under fresh authorization/version checks. These are terminal case revisions. |
| Closed | Administrative closure condition, not a second `ReconciliationCase` state | A linked work item may close only after a terminal resolution and every dependent obligation is resolved. Original case/evidence remains immutable; a new contradiction creates a linked case. |

### 6.2 Workflow

1. Detect an acknowledgement, observation, local/source-version, ordering, or outcome discrepancy.
2. Persist the original safe evidence references/digests and create or link one issue/revision without collapsing independent conflicts.
3. Block repeat external effects and every protected transition that depends on the disputed fact.
4. Assign the correct pharmacy, professional, finance, custody, identity, communications, or integration fact owner. An unassigned case cannot resolve successfully.
5. Requery an approved authoritative source only under a later approved contract. Otherwise retain a safe manual work item and unresolved state.
6. Compare the exact provider operation, acknowledgement, source event/version, local evidence, current resource versions, authorization, and trusted time.
7. Accept either `RESOLVED_NO_EFFECT` or one `RESOLVED_APPLIED` revision only from the authorized fact owner. Reconciliation cannot invent missing professional, custody, payment, claim, message-receipt, or inventory truth.
8. Record minimized audit and resolution evidence without rewriting the original event, attempt, acknowledgement, conflict, failure, or prior physical/professional fact.
9. Close only the administrative work after all dependent exception, return, complaint, incident, finance, privacy/security, retention, and notification obligations are independently resolved.

### 6.3 Required cases

| Discrepancy | Fail-closed handling |
|---|---|
| Courier webhook says delivered but no accepted proof exists | Keep recipient receipt unestablished; preserve courier observation and custody; reconcile package, attempt, grant, proof, release, source and versions. |
| Proof exists without a matching delivered/attempt event | Do not infer delivery; retain protected proof reference and open reconciliation for the exact package/attempt. |
| Payment provider says complete but internal accepted ledger state disagrees | Keep payment uncertain/reconciliation required; do not release, fulfil, claim, retry payment, refund, or overwrite either source. |
| Inventory becomes unavailable after reservation/confirmation | Mark reliance stale/blocking, invalidate dependent READY, and require the pharmacy/inventory owner to reconcile current product, quantity, allocation, recall, expiry, storage and versions. No automatic substitute. |
| External state arrives out of order or regresses a terminal projection | Append/deduplicate the observation, preserve the newer supported state, and reconcile; never last-write-wins. |
| Duplicate event | Same scoped identity/digest has no second effect; same identity/different digest is a conflict. |
| Expected event is missing | Keep outcome unknown, block dependent progression/retry, and query only an approved authoritative source or assign manual review. Absence is not failure or success. |
| Stale event or source revision | Reject it from current progression; preserve it as historical evidence where required and reconcile any contradiction. |
| Request, reservation, payment, courier booking, cancellation, or return acknowledgement is unknown after timeout | Preserve the attempted operation and uncertain outcome; prohibit another effect until authoritative evidence resolves it. |

Unknown or conflicting external state fails closed. Reconciliation adds attributable evidence and current projections; it never silently overwrites internal evidence or changes an immutable professional, physical, financial, or claim fact.

## 7. Courier integration boundaries

Courier events are raw transport observations only:

| Courier observation | Maximum permitted interpretation after validation | Still cannot establish |
|---|---|---|
| Picked up | Evidence that the assigned courier may have accepted the exact package; the pharmacy workflow must validate current release, assignment, package, physical transfer, custody chain and versions before `HANDED_TO_COURIER`. | Patient pickup, authorized recipient, proof, receipt, fulfilment completion |
| In transit | Bounded route/custody observation for the exact assigned package after accepted courier custody. | Patient receipt, product suitability, professional release |
| Attempted | Evidence that a supported attempt may have occurred for the exact package/plan/assignment. | Recipient identity, proof acceptance, delivered/received state |
| Delivered | Provider assertion requiring exact package/attempt, current recipient grant, identity/proof evidence, release, custody, integrity and pharmacy acceptance/reconciliation. | Patient or agent receipt by itself, claim, payment, restock |

The courier cannot create/change recipient authorization, act as the patient's agent, accept its own evidence as proof, select pharmacy/tenant scope, create professional decisions, or convert a failure/unknown event into receipt. Wrong recipient, unknown recipient, missing proof, disputed receipt, wrong package, wrong assignment, invalid release, unknown custody, or stale source/version remains failed, blocked, or in reconciliation.

No courier provider, account, credential, agent identity model, booking API, webhook, route, device, tracking page, external recipient, or shipment exists or is selected.

## 8. Financial integration boundaries

Coverage estimates, adjudication, payment, fulfilment, and claims remain independent dimensions with independent fact owners and evidence:

- A payer/adjudicator event may support only an accepted versioned adjudication reference after the approved finance workflow reconciles source, request/item, amount/currency, status, reversal and versions.
- A payment-provider event may support only an accepted versioned ledger observation after approved finance reconciliation. Authorization is not capture; capture is not final claim or fulfilment truth; failure/timeout remains uncertain until reconciled.
- No payment, adjudication, refund, pickup, delivery, receipt, return, READY, request, webhook, or reconciliation state creates, codes, submits, reverses, or implies a claim.
- Payment cannot authorize prescription acceptance, preparation, professional release, pickup, delivery, recipient receipt, product substitution, or restock.
- The existing protected billing/claim path remains outside Task 08 and must independently reverify its own professional, patient, pharmacy, reference-data, eligibility, and claim rules. No PIN, fee, maximum, or intervention code is copied or inferred here.
- Do not collect or store payment-card data, security codes, bank credentials, payer/provider secrets, raw health-card information, or unrestricted payer response bodies. Necessary approved references remain server-only, purpose-limited, encrypted, and independently authorized.

Task 09 is not verified as the financial owner, payer, payment service, or claim engine. No payer, adjudicator, payment provider, account, contract, credential, SDK, network call, real transaction, refund, or claim effect is authorized.

## 9. Prescription, PMS, inventory, and communications boundaries

### 9.1 Prescription and PMS

An external prescription/PMS event, imported record, scan, upload, OCR result, refill/renewal/transfer request, patient statement, or system status cannot establish prescription authenticity, validity, professional acceptance/rejection, clarification resolution, dispensing authorization, product/substitution, checks, counselling, release, or claim authority.

Any future accepted professional reference must preserve the actual authenticated professional author, approved scope/assignment, correct pharmacy/request/item, source system/record/version, decision type, current registration/authorization evidence, trusted time, revocation/supersession, and the exact professional gate. A service signature proves only the service message under its approved protocol; it cannot replace professional attribution. AgentRx may validate that the supported reference is complete and current, not make the decision.

Task 03 prescription/PMS/evidence ownership remains unresolved. There is no production PMS, prescription import, upload, OCR, transfer, refill, renewal, or professional-decision integration.

### 9.2 Inventory

Inventory estimates remain informational. A source update cannot make an estimate a pharmacy-authoritative confirmation, substitute a product, authorize preparation/release, derive READY alone, or restore returned stock. Reservation acknowledgement, expiry, shortage, recall, quantity, product, storage, integrity, and source-version conflicts require the approved pharmacy/inventory fact owner and reconciliation. There is no production inventory integration or real reservation.

### 9.3 Task 07 communications

Task 07 alone would own approved contact/consent, templates, dispatch and delivery observations. A delivered/read notification cannot prove identity, understanding, clarification resolution, counselling, pickup, delivery, receipt, payment, or claim. Task 07 runtime remains unresolved; no notification provider, recipient, secure-message connection, or external notice is created.

## 10. Audit rules

A future closed, approved audit catalogue must cover:

- external operation planned, attempted, acknowledged, definitively failed, uncertain, or sent to reconciliation;
- webhook received, authenticated/validation result, rejected, duplicated, replayed, reordered, unmapped, processed, dead-lettered, or reconciled;
- mapping accepted/rejected and exact safe source/resource/version result;
- retry considered, permitted, started, blocked, completed, or left uncertain;
- reconciliation opened, assigned, progressed, manually reviewed, resolved with no effect, resolved with one applied effect, left unresolved, or administratively closed; and
- manual resolution actor, fact-owner evidence reference, trusted time, before/after versions, and safe disposition.

Audit may include only approved event/schema version, trusted time, opaque operation/event/correlation/resource/reconciliation references, actual authorized actor/service identity where necessary, server-owned pharmacy scope, contract/source/policy versions, safe action/outcome/reason, and before/after state versions.

Do not put full payloads, webhook bodies, OCR or prescription content, medication/clinical information, names, addresses, phone numbers, emails, health-card or payer identifiers, card/payment data, recipient/proof/signature/identity details, exact location/route, provider credentials, tokens, tracking secrets, internal database IDs, or arbitrary metadata into audit bodies, logs, traces, analytics, metrics/labels, queue/topic names, correlation/idempotency keys, URLs, support tools, errors, notification bodies, or screenshots.

Accepted local state, idempotency result, validated replay response, required audit, and receipt-processing revision must commit atomically where later approved. Required audit failure rolls back the local acceptance and success receipt. A provider effect cannot be rolled back by local assertion; an uncertain external outcome enters reconciliation. Denied-attempt audit evidence requires its separately approved minimized contract and cannot create a sensitive enumeration difference.

## 11. Concurrency rules

| Race or duplicate | Required behavior |
|---|---|
| Duplicate webhook/provider replay | Scoped event uniqueness plus digest produces one processing effect. Different bytes under the same identity conflict and reconcile. |
| Out-of-order or late webhook | Do not regress a newer state or rewrite history. Preserve the observation and compare source/local versions; reconcile terminal or ordering conflicts. |
| Webhook during cancellation | Recheck cancellation and every affected source/resource version before applying an observation. Preserve an already acknowledged external/physical effect; cancellation cannot fabricate reversal. |
| Webhook during release or revocation | A webhook cannot create either decision. Serialize the accepted source observation with current professional and package/item versions; revocation blocks future handoff but cannot erase prior physical custody. |
| Webhook during return | Preserve actual holder, return destination/receipt, storage/integrity, disposition and source versions. Provider “returned” cannot establish correct-pharmacy receipt or restock. |
| Provider retry after timeout | Do not repeat while outcome is uncertain. Requery only under an approved contract or assign reconciliation; a fresh attempt needs an approved fence, authorization, current versions and proof of no prior effect. |
| Local commit fails after possible external acknowledgement | Do not assume rollback of the provider effect. Preserve available attempt/acknowledgement evidence, mark uncertain and reconcile before retry. |
| Two workers process one receipt | Transactional processing claim/fence, event uniqueness, current `stateVersion` and append-only attempts permit at most one accepted local effect. |
| Reconciliation resolution races a new contradiction | Resolve only the consumed case/source/resource versions. New evidence creates/reopens a linked current case; it cannot be silently cleared by the older resolution. |

Every mutable current projection requires compare-and-set `stateVersion`, current source revision, trusted server/database time, current authorization/lifecycle, and a later-approved deterministic lock/isolation/fencing order. Every attempt, observation, acknowledgement, mapping, acceptance, failure, conflict, correction, and resolution is append-only or superseded by an attributable revision. No last-write-wins browser/provider update, silent overwrite, delete-and-recreate history, blind retry, or claimed distributed exactly-once transaction is permitted.

## 12. Future test obligations — not implemented or run

| ID | Later independently required assertion |
|---|---|
| I-T01 — Adapter isolation | Strict operation-specific adapters reject unknown fields and cross-domain operations; deterministic no-network synthetic doubles fail hard outside an exact approved scope. No Task 04/production import, SDK, credential, DNS, or external call. |
| I-T02 — Raw webhook boundary | Enforce method/content type/raw-byte limit before parsing; validate signature/protocol, timestamp, replay, environment, account, server-owned pharmacy, type/version, semantic combinations and payload digest. Invalid cases have zero protected effect. |
| I-T03 — Durable receipt and mapping | Valid bounded inbox evidence precedes processing; unknown provider/resource/internal identifier cannot map; processed status cannot mean business acceptance; same event/different digest conflicts. |
| I-T04 — Event deduplication | Real concurrent independent transactions/barriers prove duplicate provider events create one receipt/processing effect, changed bytes conflict, rollback leaves no success, and no connection/lease leaks. |
| I-T05 — Command idempotency | Same key/same strict projection returns one revalidated minimized response; changed request conflicts; in-progress is deterministic; malformed replay fails closed; authorization/lifecycle rechecked. |
| I-T06 — Timeout and retention boundary | Proven local rollback differs from uncertain external outcome; no retry before reconciliation. Expired application key/inbox window cannot cause a duplicate external effect. Exact durations await approval. |
| I-T07 — Reconciliation lifecycle | Cover `NOT_REQUIRED`, `PENDING`, `IN_PROGRESS`, both resolved outcomes, `MANUAL_REVIEW_REQUIRED`, and `UNRESOLVED`; administrative closure preserves case/evidence and cannot clear another blocker. |
| I-T08 — Required discrepancies | Delivered-without-proof, proof-without-event, payment mismatch, inventory loss after reservation, reordered/duplicate/missing/stale event, unknown acknowledgement and provider/local outage all fail closed and preserve evidence. |
| I-T09 — Courier observations | Picked-up/in-transit/attempted/delivered observations cannot directly establish recipient, proof, receipt, release, completion or claim; wrong package/assignment/recipient/scope/version remains generic failure/reconciliation. |
| I-T10 — Financial separation | Adjudication/payment acceptance, rejection, reversal, duplicate, timeout, capture, cancellation, refund and dispute never create release, fulfilment or claim. Sentinels prove no raw card, payer secret or health-card data. |
| I-T11 — PMS and inventory authority | Imported/changed/stale source records cannot create prescription validity/professional decisions, confirmed stock, substitution, preparation, release, READY, claim or restock without exact accepted source and fact-owner evidence. |
| I-T12 — Races | Independent barriers cover webhook versus cancellation/release/revocation/return, two workers, late terminal event, source regression, resolution/new contradiction and possible provider effect/local rollback. No silent overwrite or duplicate effect. |
| I-T13 — Audit and privacy leakage | Closed schemas reject extra/impossible/sensitive fields. Sentinels prove zero PHI, body, prescription/clinical/payment/address/recipient/tracking/secret/internal-ID leakage into prohibited identifiers, URLs, logs, audit, metrics, queues/topics, errors or support surfaces. |
| I-T14 — Tenant and authorization isolation | Cross-pharmacy, wrong-tenant, wrong-account/environment, browser-selected scope, revoked lifecycle, wrong audience/service and stale assignment fail generically. Only server-owned pharmacy scope reaches mapping. |
| I-T15 — Human/vendor verification | Actual pharmacy/PMS, inventory, payer/payment, courier/address, Task 05/07/09, privacy/security/legal/accessibility/records/procurement and Task 11 owners validate contracts, finality, retry/reconciliation, retention, incident and exit behavior. Technical PASS cannot grant production authority. |

These are planned obligations only. No test file, fixture, route, handler, worker, queue, inbox, outbox, database, migration, Docker service, command, network call, or PASS evidence is created. Exact schemas, event/error registries, sizes, timestamp tolerance, timeouts, retry/backoff limits, leases, lock order, idempotency/deduplication lifetimes, retention, provider protocols, and safe response details remain PENDING.

## 13. Production blockers and unresolved decisions

| Decision area | Current status and blocked behavior |
|---|---|
| T08-D02–D04/D10/D36/D37 | No exact runnable Task 08 synthetic scope/candidate/lifecycle, Task 01 use, risk metadata, owner/reviewer assignment, or applicable Task 11 approval. No synthetic or production adapter may run. |
| T08-D05/D17 | Task 03 prescription-evidence/PMS owner, source system, professional attribution and synchronization contract remain unresolved. No prescription/PMS integration. |
| T08-D06/D14 | Task 05 patient/delegate/recipient/professional/service audiences, grants, assignments and revocation are unavailable. No protected patient or courier identity substitution. |
| T08-D07/D31 | Task 07 communication runtime, contact/consent, templates, provider, recipient and secure-message contract are unavailable. No notification integration. |
| T08-D08/D21/D22 | Task 09 is not verified as the finance, payer, payment or claim owner. No financial integration or claim operation. |
| T08-D18/D29/D32 | Exact operation/command/state/event/error registries, schemas, identifiers, acknowledgement/finality, lock/isolation/fencing, idempotency/deduplication lifetime, timeout/retry, reconciliation authority and minimized audit/denial contracts are unapproved. No persistence or handler. |
| T08-D19/D20/D23–D27 | Pharmacy source, inventory/product, professional release, courier/address/recipient/proof/storage/return policies and fact-owner acceptance procedures remain unapproved. No protected success can be inferred. |
| T08-D28/D30 | No provider/vendor selection, contract, SDK, endpoint, credential, service identity, encryption/key, minimum-data, privacy/security/accessibility, subprocessor, residency, audit, insurance or exit approval. No network connection. |
| T08-D33/D34/D35 | Field-level retention/hold/backup/disposal, incident/reportability/response, support access, monitoring and accessible manual procedures remain NOT VERIFIED/BLOCKED. |

No provider, endpoint, account, credential, secret, signature method, authentication protocol, event schema, payload size, timestamp tolerance, idempotency lifetime, deduplication window, timeout, retry/backoff, lease, dead-letter threshold, retention period, reconciliation SLA, reviewer name, approval date, or production threshold is invented here. No vendor is selected or approved. Current Ontario source versions, legal interpretations, professional scope, privacy/security conclusions, PIA, TRA, residency evidence, procurement, and Task 11 approval remain NOT VERIFIED/BLOCKED where recorded in Workstreams A–H.

Independent documentation/design may continue when only production-only dependencies remain blocked. Runnable synthetic work still requires an exact synthetic-scope/candidate/lifecycle approval and applicable Task 11 approval. A missing source, authority, policy, contract, security, privacy, accessibility, retention, incident, or reconciliation decision may be represented only as rejected, unavailable, blocked, unknown, or unresolved; it cannot be guessed into a successful path. Apply every applicable Task 08 mandatory stop condition to the affected slice.

## 14. Explicit non-authorization

This document grants **no implementation, migration, schema, authentication, professional, regulatory, legal, privacy, security, accessibility, vendor, procurement, synthetic-runtime, pilot, external-integration, or production authorization**. It creates no route, webhook receiver, API client, SDK, dependency, credential, key, secret, account, adapter, worker, scheduler, queue, topic, inbox, outbox, table, Drizzle declaration, migration, fixture, test result, network call, prescription/PMS import, inventory/reservation effect, payment/adjudication/refund, courier booking/transport, address verification, notification, claim, audit record, reconciliation case, or other external effect.

Current protected production files and systems are not modified. Public intake remains zero-PHI. Patient choice remains separate from server-owned tenant authority. External events remain observations until the correct authorized fact owner accepts current evidence. No webhook or reconciliation can invent prescription validity, professional judgment, release, recipient identity, physical receipt, payment finality, claim authority, or return saleability/restock.
