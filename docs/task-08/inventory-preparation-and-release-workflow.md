# Task 08 — Inventory, preparation, professional-check, and release workflow

**Status: WORKSTREAM G DOCUMENTATION / PROPOSED DESIGN ONLY. No runtime, schema, migration, inventory effect, professional decision, release, dispensing, external integration, or production authority.**

## 1. Workflow summary

This document defines the proposed pharmacy-owned workflow required by [Task 08](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), Workstream G. It must be read with [AGENTS.md](../../AGENTS.md), the [project overview](../PROJECT_OVERVIEW.md), Workstream A's [current-state analysis](current-state-and-gap-analysis.md) and [decision register](production-dependency-and-decision-register.md), Workstream B's [threat model](fulfilment-threat-model.md) and [trust boundaries](trust-boundaries-and-data-flows.md), Workstream C's [professional responsibility matrix](professional-responsibility-matrix.md) and [authorization gates](role-and-transition-authorization-matrix.md), Workstream D's [domain contracts](fulfilment-contracts-and-schema-proposal.md), Workstream E's [request/evidence workflow](request-and-prescription-evidence-workflow.md) and [pharmacy-choice boundary](pharmacy-choice-and-transfer-boundary.md), and Workstream F's [orthogonal state model](orthogonal-state-model-and-state-machine.md).

The current repository has **no Task 08 inventory, preparation, technical-check, professional-check, counselling, release, READY, dispensing, PMS, or production integration runtime**. Existing assessment prescriptions, ailment reference data, booking capacity, clinical roles, and claim drafts are neighbouring-domain evidence only. They are not drug inventory, preparation tasks, professional-release authority, or a permission to change protected clinical, billing, audit, authentication, or database behavior.

The proposed coordination path is:

1. retain an `InventoryEstimate` only as an expiring, explicitly unconfirmed observation;
2. require a current pharmacy-authoritative `InventoryConfirmation` for the exact accepted prescription item;
3. resolve every shortage, product, quantity, substitution, expiry, recall, quarantine, storage, integrity, reservation, and source conflict through its actual owner;
4. require an explicit G08 `PREPARATION_AUTHORIZED` reference before pharmacy-owned preparation begins;
5. receive only bounded progress references from the pharmacy workflow;
6. require an independently attributed technical check where approved policy makes it applicable;
7. require an actual authorized professional's G09 PASS or G10 FAIL and current G11 `COUNSELLING_REQUIREMENT_SATISFIED` evidence or approved current non-applicability/arrangement;
8. accept G12 `RELEASE_AUTHORIZED` only after every current prerequisite is revalidated; and
9. derive READY separately under Workstream F. Release, preparation, payment, a task status, or courier availability never sets READY by itself.

### 1.1 Authority and responsibility boundary

| Conceptual owner | Permitted proposed responsibility | Prohibited inference |
|---|---|---|
| Pharmacy system / inventory source (**PH**) | Supply current product, quantity, stock, reservation, expiry, recall/quarantine, storage, integrity, and source-version facts under an approved contract. | A service response alone is not professional attribution, product selection, substitution, check, counselling, release, dispensing, or patient ownership. |
| Actual authenticated pharmacy professional (**P**) | Supply only decisions within separately verified current action scope, assignment, pharmacy, patient/request/item lineage, and approved policy. | The existing `pharmacist` role label, OCP/profile data, email domain, orientation, assessment permission, or generic pharmacy identity does not grant Task 08 authority. |
| Authorized technical performer (**T**) | Perform only a separately approved technical task/check scope with actual identity, assignment, procedure, and item/preparation references. | The existing `technician`, `intern`, or `student` label does not establish scope; technical work never becomes clinical judgment or release. |
| AgentRx coordinator (**AR**) | Validate strict references, lineage, required fields, workflow order, versions, expiry, and supported outcomes; coordinate bounded tasks and minimized projections. | AR never selects therapy/product/quantity, recommends or approves substitution, prepares/dispenses, performs a technical or professional check, decides counselling, or authorizes/revokes release. |
| Patient-side actor (**PA**) | Supply intent or clarification only through future Task 05 authority. | A statement, preference, payment, acknowledgement, or request does not establish stock, professional truth, or release. |

Every protected future boundary must independently derive and verify the current session/audience, actual actor, action, assignment, server-owned `PHARMACY_ID`, subject/request/item lineage, lifecycle approval, trusted time, source versions, and applicable Task 11 gate. Patient pharmacy choice remains separate intent and never becomes tenant authority. Unknown role, scope, source, state, relationship, or policy fails closed.

### 1.2 State separation

The exact Workstream F dimensions remain controlling. Inventory, preparation, professional check, counselling, release, READY, financial, and custody facts are independent and may coexist. No single fulfilment status overwrites them. In particular:

- an estimate is not confirmation or reservation;
- confirmation is not preparation authorization;
- preparation/technical completion is not professional PASS;
- professional PASS is not counselling satisfaction or release;
- release is not READY, dispensing, pickup, courier custody, or patient receipt; and
- request, inventory, preparation, release, READY, payment, pickup, delivery, return, or cancellation never creates, codes, submits, reverses, or implies a claim.

## 2. Inventory rules

### 2.1 `InventoryEstimate`

`InventoryEstimate` follows Workstream D D11 and is **informational only**. It must be labelled “estimate” or “availability not confirmed.” It is never confirmed stock, a reservation, a patient promise, or evidence that the pharmacy can dispense.

| Required proposed property | Rule |
|---|---|
| Scope and lineage | Bind an opaque item reference and server-owned pharmacy scope. A patient choice, browser value, pharmacy directory result, or Task 04 scope cannot select tenancy. |
| Source and observation | Record an approved opaque source reference, observed time, source/version evidence, and explicit `NOT_CONFIRMED` indicator. Raw vendor records are not exposed. |
| Freshness | Require `observedAt` and `expiresAt` under an approved short-lived policy. No duration is chosen here. At expiry or source supersession, remove the usable projection while preserving the historical observation. |
| Product uncertainty | A candidate product reference remains unconfirmed. The estimate cannot imply product identity, strength, form, manufacturer, package, expiry, storage suitability, reservation, or required quantity. |
| Patient/client projection | Prefer a bounded approved category, uncertainty label, freshness/disclaimer version, and no exact stock count. Exact quantities, raw source payloads, product details, internal IDs, and commercial configuration remain server-only. |
| Effects | Zero preparation authorization, reservation, payment capture, release, READY, handoff, dispensing, assessment, or claim effect. |

Missing source, observed time, approved disclaimer, current scope, item lineage, or freshness makes the estimate unavailable. A stale estimate may remain immutable history but cannot support a current UI claim or downstream guard.

### 2.2 `InventoryConfirmation`

`InventoryConfirmation` follows Workstream D D12. Production truth must come from an approved pharmacy-system response or an actual authenticated, assigned, authorized pharmacy actor following an approved procedure. AR consumes and validates the reference; it does not originate the inventory or professional fact.

The confirmation is valid only for the exact pharmacy, request, authoritative prescription, item, product candidate, source revision, and consumed item `stateVersion`. It must distinguish:

| Required fact/reference | Proposed rule and fail-closed condition |
|---|---|
| Product identity | Opaque pharmacy-owned product reference; no embedded DIN, name, or client-supplied product choice. Missing or mismatched identity blocks. |
| Strength and dosage form | Separate source evidence references. Unknown or contradictory facts block; AR never selects an alternate strength/form. |
| Required quantity | Pharmacy-owned quantity evidence, not a local calculation or patient statement. Quantity mismatch blocks and opens an owned exception. |
| Manufacturer and package | Separate applicable source references. Null is permitted only under an explicitly approved non-applicability rule; unknown blocks. |
| On-hand versus available to dispense | Separate evidence. On-hand stock alone cannot establish available-to-dispense quantity or suitability. |
| Expiry acceptability | Named current source fact under an approved policy. Unknown/expired evidence blocks. No shelf-life policy is invented here. |
| Recall and quarantine | Current authoritative source status. Flagged, quarantined, stale, or unknown status blocks progression. |
| Storage and integrity | Separate current completeness/support facts. Missing, failed, contradictory, or wrong-item evidence blocks. Suitability remains pharmacy-owned. |
| Reservation/allocation | Optional opaque `InventoryReservationReference` plus source expiry where supported. Its absence never implies a reservation. |
| Confirmation and validity time | Source `confirmedAt`, `observedAt`, `expiresAt`, acceptance time, and source/policy versions. Browser time is never authority. Exact freshness duration remains PENDING. |
| Consumed version | Positive current item `stateVersion` and every source revision consumed. A later item, prescription, stock, recall, or reservation revision invalidates stale reliance. |
| Professional product decision | G07/G06 reference where product, quantity, substitution, or clinical implications require it. A technical inventory response cannot create that decision. |

The inventory projection must use the exact Workstream F states: `UNKNOWN`, `ESTIMATE_ONLY`, `CONFIRMATION_PENDING`, `CONFIRMED_AVAILABLE`, `CONFIRMED_PARTIAL`, `CONFIRMED_UNAVAILABLE`, `RESERVED`, `RESERVATION_EXPIRED`, `SUBSTITUTION_DECISION_REQUIRED`, `RECALL_OR_QUARANTINE`, `EXPIRY_EXCEPTION`, `STORAGE_EXCEPTION`, and `INTEGRITY_EXCEPTION`. Generic “confirmed” is forbidden unless it resolves to the exact supported category.

Only `CONFIRMED_AVAILABLE` or an independently approved `RESERVED` source state may satisfy the inventory portion of later guards, and only after all other required facts are complete and current. `CONFIRMED_PARTIAL` requires an explicit approved split/partial plan and any necessary professional decision; AR must not infer one. `CONFIRMED_UNAVAILABLE` and every exception state block preparation/release.

### 2.3 Reservation boundary

Where a future approved pharmacy system supports reservation, that system remains authoritative. A reservation is an allocation reference, not a dispense, sale, product selection, professional check, release, patient ownership, or guarantee.

- Require an opaque source allocation reference, confirmation reference, source state/version, expiry, and idempotent external-operation reference.
- Bind the operation to actor, pharmacy, request/item, operation, resource, and strict typed payload without PHI or raw product data in the key/fingerprint.
- Reconcile expiry, cancellation, shortage, recall, use by another workflow, manual release, source timeout, and same-event/different-payload conflict.
- Never retry an unknown allocation outcome blindly. A local timeout cannot fabricate absence or release.
- Do not invent reservation lifetime, quantity-splitting, hoarding threshold, retry count, or rate limit. Those require approved source and operational policy.
- Expired/released/consumed source evidence requires a fresh inventory projection. It does not automatically restore availability.

### 2.4 Inventory failure and exception handling

| Condition | Required proposed behavior | Prohibited result |
|---|---|---|
| Unavailable inventory | Project exact unavailable state, preserve source/version, assign pharmacy follow-up, and present only truthful minimized uncertainty. | No substitute, transfer, patient promise, preparation, or READY. |
| Stale inventory/expired reservation | Invalidate dependent guards, preserve prior evidence, request authoritative refresh, and reconcile any unknown source effect. | No reuse of cached confirmation or automatic re-reservation. |
| Conflicting inventory sources | Retain each source observation, mark confirmation `UNKNOWN`/reconciliation required, identify the fact owner, and block progression. | No last-write-wins selection or “best” source chosen by AR. |
| Recall/quarantine | Enter the named blocking state, preserve confirmation/reservation lineage, and route to the approved pharmacy procedure. | No preparation, release, substitution, restock, or silent clearing. |
| Incorrect item/product | Deny the join generically, preserve evidence, and require current authoritative item/product mapping and any G06/G07 decision. | Another item/request/pharmacy's evidence cannot be reused. |
| Quantity mismatch/partial availability | Record the exact source category and create an owned exception/professional-decision need. | No local recalculation, split, partial-fill promise, or automatic progression. |
| Expiry/storage/integrity problem | Block the affected item and create an attributed `ProductException` with bounded evidence reference. | No AR suitability decision, waiver, or software-generated professional FAIL. |
| Unknown/contradictory state | Fail closed, retain actual supported facts, and open reconciliation or pharmacy work as approved. | Never READY, release authorization, patient guarantee, stock effect, or claim effect. |

Each `ProductException` requires the exact item/confirmation scope, closed category, protected evidence reference, assigned owner/work reference, current state, source/version, and—where judgment is required—an actual professional resolution reference. Resolving one exception does not clear another. History is appended/superseded, never deleted or silently overwritten.

## 3. Preparation rules

### 3.1 Preparation authorization and lifecycle

Preparation is pharmacy-owned. AR may create/display an approved opaque task reference, validate workflow order, receive a bounded source status, and coordinate an assigned work reference. It must not generate dispensing labels, select product, calculate/change quantity, direct compounding/repackaging, perform checks, mark dispensed, or authorize release.

The exact Workstream F preparation states and slice wording map as follows:

| Slice concept | Exact state / meaning | Required evidence and transition rule |
|---|---|---|
| Preparation not started | `NOT_AUTHORIZED` | No current G08 authorization. Only an actual approved pharmacy workflow can supply G08 after accepted prescription, current G07/product/quantity/inventory facts, assignment, and policy checks. |
| Preparation pending | `PENDING` | G08, exact item, authoritative prescription, current inventory confirmation, source task, and assignment exist. No physical/professional completion implied. |
| Preparation in progress | `IN_PREPARATION` | Assigned technical workflow acknowledged start against the current task/item/source versions. |
| Ready for technical check | `PREPARED`, followed by `TECHNICAL_CHECK_PENDING` when applicable | Pharmacy source reports the exact prepared revision. This is not READY or professional PASS. |
| Technical check failed | `REWORK_REQUIRED` or `STOPPED`, only from supported pharmacy-owned technical-check evidence | Preserve failed check and prepared revision; create a new rework task/revision. Missing prerequisites produce technical denial/pending, not fabricated professional or technical FAIL. |
| Preparation completed | `TECHNICAL_CHECK_COMPLETE` where the approved check applies; otherwise the exact approved source projection remains `PREPARED` pending the next gate | Generic `COMPLETED` is not an additional authoritative Workstream F state and never implies professional approval, release, dispensing, or receipt. |
| Contradictory/unsupported | `UNKNOWN` | Block all dependent progression and reconcile; never guess the latest state. |

Valid progression is `NOT_AUTHORIZED → PENDING → IN_PREPARATION → PREPARED → TECHNICAL_CHECK_PENDING → TECHNICAL_CHECK_COMPLETE`, with `REWORK_REQUIRED`, `STOPPED`, and `UNKNOWN` as supported blocking outcomes under Workstream F. Rework starts a new linked task/preparation revision; it does not edit the earlier work. Any unlisted direct edge is invalid.

For every transition, require the actual actor/source, current session/audience/action, pharmacy and assignment, correct request/item/prescription/product lineage, G08/task/procedure references, consumed source and local versions, trusted time, idempotency where repeat submission is possible, and an approved minimized audit combination. Missing, stale, wrong-scope, revoked, or contradictory evidence denies without a protected state mutation.

Preparation completion must never mean professional approval, release authorization, READY, payment, pickup, courier custody, patient receipt, dispense, assessment completion, or claim creation.

### 3.2 Technical-check boundary

The technical check is a pharmacy-owned verification step under an approved procedure and actual authorized technical scope. The repository has role labels, including `technician`, but **no Task 08 technical-check permission or trainee/supervision rule is verified**. Unknown scope blocks; no borrowed pharmacist/supervisor identity.

An approved technical check may conceptually verify only the facts in its procedure, such as:

- exact prepared-item and preparation-revision reference;
- quantity/count evidence supplied by the pharmacy workflow, without AR calculation;
- packaging completeness;
- approved label/packaging requirement reference; and
- current storage/security requirement coverage.

It must store/reference the actual checker, assignment/current authorization evidence, exact preparation/item, technical procedure version, supported PASS/FAIL outcome, trusted occurrence time, consumed state/source versions, optional rework reference, and approved minimized audit reference. Clinical/product content and rationale remain at the pharmacy source.

A technical PASS only moves the preparation dimension to `TECHNICAL_CHECK_COMPLETE`. It cannot establish prescription validity, therapeutic appropriateness, substitution, counselling, professional PASS, release, READY, dispensing, or receipt. A technical FAIL preserves evidence, blocks professional/release progression, and creates a pharmacy-owned rework/correction workflow. Correction and recheck are new linked revisions; a later PASS does not erase the FAIL.

## 4. Professional gate rules

### 4.1 Professional check

The professional check is the pharmacy-owned G09/G10 gate. A supported professional decision requires:

| Required element | Proposed rule |
|---|---|
| Actual actor and session | Current authenticated professional session, correct audience/actor type, actual registrant attribution, expiry/revocation check, and no proxy/shared/supervisor identity. |
| Pharmacy and assignment | Server-derived `PHARMACY_ID`, current pharmacy accreditation/source relationship where applicable, and current action-specific professional assignment. |
| Current authorization evidence | Approved active-registration/current-action-scope evidence with source, observed/accepted time, expiry, and revocation handling. None exists today. |
| Lineage | Exact subject, request, accepted authoritative prescription, item, product, quantity, inventory confirmation, preparation revision, and applicable technical-check reference. |
| Decision | Actual G09 PASS or G10 FAIL supplied by the professional source. A missing prerequisite is pending/denial, not an invented FAIL. |
| Time and versions | Trusted decision time, consumed item/preparation/check/source/policy versions, current `stateVersion`, and resulting revision. Browser/provider time is not authoritative. |
| Audit | Approved opaque actual-actor, action/outcome, item/check/source/policy versions, trusted time, and before/after version reference; never rationale or clinical/product content. |

The Workstream F projection uses `REVIEW_PENDING`, `PROFESSIONAL_CHECK_PENDING`, `PROFESSIONAL_CHECK_PASSED`, `PROFESSIONAL_CHECK_FAILED`, `COUNSELLING_PENDING`, `RELEASE_AUTHORIZED`, `RELEASE_REVOKED`, and `UNKNOWN`. “Revoked professional check” is successor/revocation evidence targeting an earlier check; it does not invent a separate state. Rework or new source evidence begins a new linked `REVIEW_PENDING`/`PROFESSIONAL_CHECK_PENDING` revision. Prior PASS, FAIL, and revocation evidence remains immutable.

A genuine supported FAIL blocks release, preserves its source/evidence and actual decision-maker, and creates the required pharmacy-owned rework, clarification, exception, or follow-up reference under approved policy. It does not delete earlier preparation or generate clinical advice. A stale, unauthenticated, wrong-item, or malformed FAIL is denied as unsupported and must not be recorded as professional truth.

### 4.2 AgentRx validation boundary

AR may validate that required fields and typed references exist, references resolve to the same item/request/pharmacy, the workflow order is supported, source/local versions are current, and the decision value is contract-compatible. AR must not decide or recommend:

- clinical appropriateness or therapy suitability;
- product, strength, form, manufacturer, package, or quantity;
- equivalence, substitution, split quantity, partial fill, or alternate therapy;
- PASS, FAIL, counselling requirement/outcome, release, or revocation; or
- a clinical reason, response to a prescriber, or patient promise.

### 4.3 Substitution and other exceptions

Substitution is an explicit G06 pharmacy/professional decision. Inventory shortage, estimate category, price, patient preference, technician input, catalogue data, or software matching cannot recommend/select a replacement or infer equivalence.

| Exception | Owner and required evidence | Resolution boundary |
|---|---|---|
| Shortage/partial availability | PH inventory source plus assigned pharmacy owner; exact item/confirmation/source version. | Remains blocked until current inventory evidence and any explicit G06/split/transfer decision; AR supplies no option. |
| Unclear/wrong product information | PH/professional owner; authoritative prescription/product facts and clarification source. | No preparation while identity/strength/form/quantity is unknown or mismatched. |
| Packaging/label issue | Approved PH technical/professional procedure owner; exact preparation/package/procedure evidence. | Rework/recheck as new revisions; no technical shortcut to release. |
| Storage/integrity/expiry/recall | PH source and professional owner; current item/package/storage evidence and policy. | Block and contain under approved procedure; no AR suitability, waiver, disposal, or restock decision. |
| Missing or contradictory information | Actual fact owner and assigned pharmacy workflow; preserve all source revisions. | Pending/UNKNOWN plus reconciliation; no software-generated professional negative decision. |

Every exception needs a closed category, current state, exact item/request/pharmacy scope, evidence/source/policy versions, assigned owner/work item, resolution or pending reference, state version, and minimized audit trail. Multiple exceptions coexist; resolving one never clears the others. Clinical rationale remains in the authoritative pharmacy/professional record.

## 5. Release rules

### 5.1 G12 authorization

Release is an explicit, attributable professional decision, never a derived convenience flag. A new G12 `RELEASE_AUTHORIZED` requires all applicable guards to be current for each item:

1. actual authenticated, assigned professional and separately verified current action scope;
2. server-owned pharmacy/tenant and correct patient/request/item relationship;
3. authoritative accepted prescription reference and current G01 decision;
4. complete current product/quantity and `InventoryConfirmation`, with no partial/unavailable, expired reservation, substitution, clarification, recall, quarantine, expiry, storage, or integrity blocker;
5. current G08 preparation authorization and exact prepared revision;
6. applicable `TECHNICAL_CHECK_COMPLETE` evidence under approved procedure;
7. current attributed `PROFESSIONAL_CHECK_PASSED` and no newer FAIL/revocation/rework/source change;
8. current G11 `COUNSELLING_REQUIREMENT_SATISFIED` evidence or approved current non-applicability/arrangement—message sent/delivered/read never satisfies it;
9. exact independently releasable request/item lineage and any item-specific storage/integrity blocker evidence required by the approved professional release policy;
10. no cancellation, release revocation, blocking exception, or active reconciliation affecting the professional decision;
11. current trusted time within an approved release-validity policy, with no permissive default duration;
12. current local/source/policy/assignment/approval versions and applicable Task 11 gate; and
13. an immutable release reference and required approved minimized audit evidence accepted atomically with local state/idempotency evidence where persistence is later authorized.

No missing guard may be inferred or treated as optional. One item's release cannot release another. An overall multi-item request can derive ready only when every included item satisfies its own release/READY guards or an actual authorized professional supplies a separately approved split/partial plan; AR cannot create the plan. The package-to-item manifest remains server-only and pharmacy-controlled.

`RELEASE_AUTHORIZED` does **not** mean READY, dispensed, sold, paid, picked up, handed to a courier, delivered, received, claimed, or submitted to HNS. Fulfilment mode, pickup recipient, delivery address/plan, courier assignment, and handoff proof are not created or satisfied by G12. READY remains the server-derived Workstream F projection and additionally requires valid mode/plan, pharmacy custody, recipient/address/choice/assignment guards, package/storage coverage, current release validity, and no cancellation/revocation/exception/reconciliation blocker. If any consumed guard changes, READY immediately derives false or stale; it is never manually set.

### 5.2 G13 revocation

An actual authorized professional may record G13 `RELEASE_REVOKED` against the exact prior release under an approved current revocation policy. Triggering facts may include a stale prerequisite, changed professional decision, new exception, invalid inventory/reservation, recall/quarantine/expiry/storage/integrity evidence, cancellation conflict, or identified safety concern. These facts identify a need for authorized review; AR does not decide that revocation occurred.

Revocation requires the actual revoker/current authority, original release reference and author attribution, exact item/request/pharmacy/custody lineage, trusted time, current versions, explicit source/policy reference, and approved minimized audit evidence. It removes future readiness and blocks future handoff. It preserves the original authorization and all consumed evidence. If custody already changed, revocation cannot fabricate pharmacy custody or undo physical receipt; preserve the physical fact and open approved containment/reconciliation.

## 6. Concurrency rules

| Race or replay | Required proposed behavior |
|---|---|
| Inventory changes during preparation | Revalidate source inventory/reservation, item, prescription, exception, and preparation versions. Invalidate stale dependent authorization/readiness; stop/rework under PH control. Never assume stock remains available or rewrite completed evidence. |
| Preparation finishes after cancellation | Preserve actual preparation evidence. Serialize against cancellation/current work state; block professional/release progression and create required PH acknowledgement/reconciliation. Do not infer restock/refund/claim reversal. |
| Professional check races release | Lock or equivalently serialize item, preparation/check, counselling, release, and blocker heads in an approved deterministic order. Release consumes only the winning current PASS and versions. |
| Release races revocation/courier pickup | Recheck immediately before handoff. Committed revocation blocks future transfer; an already accepted physical custody event remains and enters containment/reconciliation rather than being reversed. |
| Duplicate preparation events | Source event/version plus scoped operation idempotency produces one logical projection. Same event/different digest conflicts; duplicate evidence cannot multiply tasks/audit/outbox effects. |
| Duplicate professional decisions | Actor, pharmacy, operation, item/resource, and strict payload-bound key permits one validated result. Changed decision/payload conflicts; malformed stored replay fails closed. |
| Stale state/source version | Generic denial with no protected state, audit-success, idempotency-success, release, READY, or external intent. Require fresh authorized read/source evidence. |
| Webhook/external update | Authenticate bounded raw bytes under a future approved contract, bind environment/account/pharmacy/resource/type/version, durably deduplicate and order-check, then reconcile under current versions. Never directly set inventory confirmation, PASS/FAIL, counselling, release, READY, dispensing, payment, receipt, or claim. |
| Unknown commit or external outcome | Do not retry blindly. Preserve bounded operation/evidence, mark unresolved, assign reconciliation, and prevent dependent progression until the authoritative owner resolves it. |
| Multi-item update | Consume every affected item's independent versions atomically where aggregate advancement is intended; otherwise advance none. One item/reference cannot satisfy another. |

Every mutable head uses compare-and-set `stateVersion`; every immutable observation/decision retains its source revision. Safe replay is permitted only after stored response validation. Proven local rollback may be retried under a later approved bounded policy with all authorization and evidence rechecked. No exact lock order, isolation level, retry count, timeout, lease, freshness duration, or idempotency lifetime is approved here.

No silent overwrite, last-write-wins browser update, delete-and-recreate history, retroactive decision change, or assumed external atomicity is permitted. Material source, preparation, technical/professional, release/revocation, exception, and reconciliation evidence is append-only or superseded through explicit attributed links.

## 7. Audit rules

A future approved closed audit catalogue must cover accepted inventory confirmations/reservations, preparation authorization/progress, technical checks/rework, professional PASS/FAIL/revocation evidence, counselling references, release authorization/revocation, and exception opening/resolution. Where audit is required, the accepted local transition, validated idempotency result, and audit evidence must commit atomically; audit failure rolls back that accepted local transaction.

Permitted audit data is limited to the actual authorized actor where required, opaque scoped request/item/task/source/decision references, approved action/outcome/safe-reason code, source/procedure/policy/workflow versions, trusted occurrence time, and before/after state versions. Denied-attempt audit evidence requires a separately approved minimized contract and must not cause a sensitive enumeration difference or fabricate a successful event.

Technical audit, outbox, logs, metrics, traces, analytics, errors, URLs, notifications, and correlation/idempotency labels must not contain clinical rationale, OCR/prescription content, drug/product/strength/form/quantity/manufacturer/package/stock facts, exact counts, subject/contact/address data, professional credentials, raw authorization evidence, raw source/vendor bodies, arbitrary metadata, or other unnecessary PHI. Professional/technical rationale and detailed evidence remain only at the approved authoritative pharmacy/protected source. Opaque references remain sensitive and require authorization.

No audit event proves prescription validity, stock, technical/professional success, counselling, release, dispensing, custody, receipt, payment, or claim. No existing production audit/governance implementation is modified or extended by this document.

## 8. Future test obligations — not implemented or run

| ID | Later independently required synthetic assertion |
|---|---|
| G-T01 | Stale estimate/confirmation, expired reservation, superseded item/source, or browser-controlled time cannot satisfy inventory or READY; historical evidence remains. |
| G-T02 | Conflicting inventory sources, on-hand-only, partial/unavailable, recall/quarantine, expiry/storage/integrity unknown, wrong item/pharmacy, and quantity mismatch fail closed without a substitute, promise, preparation, release, or claim. |
| G-T03 | Estimate output stays explicitly unconfirmed, bounded, category-based, and contains no exact stock, raw product/source/internal data; it has zero downstream effects. |
| G-T04 | Failed technical check blocks professional/release progression, preserves the failure, creates one linked rework revision, and a later PASS does not erase it. Technical PASS cannot set professional PASS. |
| G-T05 | Genuine attributed professional FAIL blocks release and creates required PH follow-up; missing/unauthorized evidence remains pending/denied and cannot fabricate FAIL. |
| G-T06 | Parameterize every G12 prerequisite independently. Missing/stale/revoked/wrong-item/wrong-pharmacy evidence rejects release; payment, preparation completion, notice, courier availability, or one released item cannot pass another guard. |
| G-T07 | G13 revocation removes future READY/handoff, preserves the original release/actor/evidence, and does not rewrite already committed custody. |
| G-T08 | Same-key preparation/professional/release replay creates one logical result/evidence set; changed payload conflicts, malformed replay fails, and rollback leaves no success/audit/outbox/effect. |
| G-T09 | Real competing transactions/barriers cover stock change during preparation, cancellation after preparation, PASS/FAIL versus release, release versus revocation/handoff, and multi-item independence. One winner consumes each version; no silent overwrite. |
| G-T10 | Exception tests require owner/state/evidence/resolution/audit, keep independent exceptions separate, and prove shortage/unclear product/packaging/storage/missing-information cases cannot trigger AR recommendation or professional success. |
| G-T11 | Webhook replay/reordering, same ID/different digest, wrong source/environment/pharmacy/item, and unknown external outcome enter reconciliation and cannot directly set protected facts. |
| G-T12 | Audit/privacy allowlists reject clinical rationale, OCR/Rx/product/quantity/stock/identity/credential/vendor content and impossible action/outcome combinations; required audit failure rolls back accepted local state. |
| G-T13 | Architecture/lifecycle tests prove zero production/PMS/vendor/network/physical effects, no Task 04 authority reuse, no current-auth widening, no migration/schema change, and zero assessment/claim effects. |
| G-T14 | Human professional/technical/privacy/security/accessibility reviewers assess the exact procedures, role/supervision scope, wording, evidence sufficiency, and revocation behavior; automated tests cannot establish Ontario professional approval. |

These are obligations only—not test files, commands, PASS evidence, implementation authority, or approval. Any later runnable synthetic suite requires exact Task 08 scope/lifecycle and applicable Task 11 approval, deterministic non-PHI server-owned fixtures, approved fixed trusted time, isolated persistence where authorized, and no external effect.

## 9. Production blockers

| Decision area | Current status / behavior blocked |
|---|---|
| T08-D02–D04/D10/D36/D37 | Exact Task 08 synthetic candidate, scope/lifecycle, Task 01 use, risk/autonomy metadata, owners/reviewers, and applicable Task 11 approval are absent. No runnable workflow/tests. |
| T08-D05/D17 | Task 03 prescription-evidence/PMS ownership and authoritative prescription/source synchronization contract are unresolved. No accepted-prescription, PMS, or inventory integration success path. |
| T08-D06/D14 | Task 05 patient/delegate identity, professional context, audience, relationship, and protected access are unavailable. No patient or Task 08 professional runtime authorization. |
| T08-D08/D21/D22 | Task 09 is not the verified finance owner. Pricing, adjudication, payment, refund, and claim authority remain independent and blocked; none gates or creates release. |
| T08-D15/D16 | Pharmacy accreditation, authoritative product/drug classification, controlled/high-risk scope, jurisdiction, and Internet-site/professional interpretation remain NOT VERIFIED/BLOCKED. |
| T08-D18/D29 | Exact command/event/error/state registries, inventory/PMS/vendor contracts, freshness/timeout/retry/idempotency/rate limits, reconciliation, transaction ownership, and lock/isolation rules are unapproved. |
| T08-D19/D20 | Inventory/product/quantity/reservation, preparation/technical-check, professional-check, counselling, release/revocation, substitution, split/partial, multi-item, supervision, and role-scope policies are unapproved. No successful professional/READY case may be invented. |
| T08-D23–D35 | Recipient/package/storage/custody dependencies, Task 07 communications, privacy/security, audit/retention/incident/accessibility, vendor/procurement, and PIA/TRA reviews remain blocked or NOT VERIFIED. |

Task 04's isolated booking patterns are architectural study material only; its expired authority and draft renewal are not Task 08 authority. Booking capacity is not medication inventory. The public intake remains zero-PHI. Patient pharmacy choice never changes server-owned `PHARMACY_ID`. No real prescription, stock/reservation, preparation, professional decision, counselling, release, dispensing, payment, claim, courier, patient receipt, message, or external effect is permitted.

## 10. Explicit non-authorization

This document grants **no implementation, professional, regulatory, legal, privacy, security, accessibility, synthetic-runtime, migration, schema, authentication, pilot, or production authorization**. It creates no source file, enum, database field/table, Drizzle change, migration, role/permission, fixture, test result, audit event, inventory/reservation/preparation/check/release/READY/dispensing/custody/payment/claim effect, provider account, credential, network call, or external integration. It does not modify any existing file or protected Task 01/03/04/05/07/09/11, clinical, billing, reference, audit, governance, authentication, database, or infrastructure behavior.

Unknown, stale, contradictory, mismatched, unauthorized, or externally uncertain state fails closed. AgentRx may coordinate and validate supported evidence only. It never dispenses, selects therapy/product/quantity, recommends or approves substitution, performs technical/professional checks, resolves counselling, authorizes/revokes release, replaces pharmacist judgment, or claims production readiness.
