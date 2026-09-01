# Task 08 — Orthogonal state model and canonical state machine

**Status: WORKSTREAM F DOCUMENTATION / PROPOSED DESIGN ONLY. No state enum, runtime, schema, migration, professional decision or production authority.**

## 1. Scope and current repository reality

This document defines the proposed state model required by [Task 08](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), Workstream F. It must be read with [AGENTS.md](../../AGENTS.md), the [project overview](../PROJECT_OVERVIEW.md), Workstream A's [current-state analysis](current-state-and-gap-analysis.md) and [decision register](production-dependency-and-decision-register.md), Workstream B's [threat model](fulfilment-threat-model.md) and [trust boundaries](trust-boundaries-and-data-flows.md), Workstream C's [professional responsibility](professional-responsibility-matrix.md) and [authorization gates](role-and-transition-authorization-matrix.md), Workstream D's [domain contracts](fulfilment-contracts-and-schema-proposal.md), and Workstream E's [request/evidence](request-and-prescription-evidence-workflow.md) and [pharmacy-choice/transfer](pharmacy-choice-and-transfer-boundary.md) workflows.

Current repository evidence establishes no Task 08 request, evidence, inventory, preparation, professional-release, pickup, delivery, return, exception, financial or reconciliation runtime. The existing assessment, claim, follow-up and governance state belongs to protected neighbouring domains and is not reused. The isolated Task 04 booking transaction/version/idempotency patterns are study material only; its prior authority expired and its [renewal remains DRAFT — NOT GRANTED](../task-04/decisions/task-04-synthetic-scope-renewal-v3-2026-08-19.md).

Task 03 prescription-evidence/PMS ownership, Task 05 identity, Task 07 communications runtime, Task 09 financial ownership and Task 11 exact approval remain **BLOCKED / NOT VERIFIED**. The current public intake stays zero-PHI and [server-owned pharmacy scope](../../src/lib/pharmacy-config.ts) remains unchanged. Nothing in this document is a current application state, event, database column, enum or permission.

Actor/fact-owner shorthand follows Workstreams C and D: **PA** is a proposed authorized patient-side actor; **ID** is the unavailable Task 05 identity/relationship owner; **PH** is the pharmacy/professional source; **AR** is AgentRx coordination/validation only; **EV** is a future evidence custodian; **CV** is a future courier/vendor observation source; and **PY/PM** are future payer/adjudicator and payment owners. These are conceptual boundaries, not runtime identities or permissions. Only the repository role labels `pharmacy_admin`, `pharmacist`, `intern`, `student` and `technician` are verified, and none is granted Task 08 authority here.

## 2. State model summary

### 2.1 Why state must be orthogonal

A single mutable “fulfilment status” would destroy independent truth. A request can be accepted for review while evidence still needs clarification; one item can have confirmed inventory while another is unavailable; preparation can be complete while counselling is pending; a released package can be in courier custody while payment reconciliation is unresolved; a failed attempt can coexist with a verified return path. None of those facts may overwrite another.

The proposed state vector is therefore conceptual and typed:

`request × evidence[] × inventory[item] × preparation[item] × professional-gates[item] × fulfilment-mode × pickup[package] × delivery[package] × return[package] × exceptions[] × financial × custody[package] × reconciliation[]`

This notation is not a universal field or unrestricted JSON object. Each dimension has its own owner, lineage, source version, `stateVersion`, evidence and history. Multiple states across dimensions exist simultaneously. Per-item and per-package state never becomes whole-request success merely because one member succeeded.

The canonical workflow labels in section 5 are **derived projections only**. They provide minimized workflow orientation and never replace the underlying vector or authorize a transition. A cached projection, if later approved, must bind every consumed dimension/source version and be invalidated atomically when a guard changes.

### 2.2 Common transition contract

Every later executable transition must define all of the following before implementation:

| Control | Required rule for every affected dimension |
|---|---|
| Source and destination | Exact source state and exact destination state on each affected dimension; unlisted direct edges are invalid. |
| Actor and authority | Server-derived session/audience, actual actor, subject relationship, action, assignment, pharmacy/tenant scope and current lifecycle. Professional gates require the actual authorized registrant/source; client/provider assertions are never authority. |
| Evidence | Exact current request/item/package/source/policy/grant/evidence references and versions. Missing, stale, revoked, contradictory or wrong-scope evidence blocks. |
| Idempotency | Actor, pharmacy, operation, resource and strict typed payload binding; same-key/same-payload replay returns only a validated stored result, changed payload conflicts, and rollback leaves no success. Exact lifetime remains PENDING. |
| Concurrency | Compare-and-set the current `stateVersion`; lock or otherwise serialize every affected head in an approved deterministic order; recheck trusted time, source versions, revocation and approval at commit. |
| Side effects | No unlisted effect. A state change never implies a prescription, professional decision, stock change, payment, claim, message, custody event or external call. Each separately authorized effect needs acknowledged evidence and reconciliation. |
| Audit | Future approved closed action/outcome combination, actual authorized actor where necessary, typed opaque resource refs, trusted time and before/after versions in the same transaction as accepted state. No raw content or arbitrary metadata. |
| Messages | No patient, pharmacy or courier message is created here. A later committed, minimized intent must use Task 07 or another approved owner and cannot authorize state. |
| Failure and reconciliation | Generic denial with no sensitive enumeration; preserve source/material history. Unknown external/commit outcome enters reconciliation before retry. |
| Supersession/revocation | Append a new attributed revision, revocation or correction; never rewrite the original professional, physical, financial or source fact. Current projections move only through validated successor links. |

No exact lock order, isolation level, retry count, timeout, event/error name, message template, state duration or idempotency retention period is approved by this document.

## 3. Orthogonal lifecycle dimensions

For every subsection below, the valid-edge list is closed: any direct edge not listed is invalid unless a later reviewed version of this document adds it. `UNKNOWN` is a fail-closed projection for contradictory, unmapped or untrusted state; it is not a shortcut back to success.

### 3.1 Request lifecycle

The Task 08 specification's exact names remain controlling. Slice shorthand is shown only to prevent duplicate concepts: `UNDER_REVIEW` and generic `ACCEPTED` map to `ACCEPTED_FOR_REVIEW`; `CLARIFICATION_REQUIRED` maps to `NEEDS_CLARIFICATION`; accepted `WITHDRAWN` maps to `CANCELLED`. None is a second authoritative state.

| State | Meaning |
|---|---|
| `DRAFT` | Unsubmitted proposed request; no pharmacy effect. |
| `SUBMITTED` | One request submission was accepted technically; no prescription validity. |
| `ACCEPTED_FOR_REVIEW` | Pharmacy review coordination accepted (`UNDER_REVIEW` / request `ACCEPTED` shorthand only); not prescription acceptance. |
| `NEEDS_CLARIFICATION` | Missing workflow information or attributed professional clarification is pending (`CLARIFICATION_REQUIRED` shorthand). |
| `WITHDRAWAL_REQUESTED` | Actor requested withdrawal; effects and acceptability are not yet resolved. |
| `CANCELLED` | Withdrawal/cancellation was accepted and required consequences acknowledged/reconciled (`WITHDRAWN` shorthand). |
| `REJECTED` | Authorized request-level rejection; not a fabricated professional prescription decision. |
| `EXPIRED` | Approved request lifetime elapsed; no inferred downstream reversal. |
| `CLOSED` | Administrative lifecycle closed after all dependent obligations are resolved. |
| `UNKNOWN` | Contradictory/unmapped request state; no advancement. |

Valid direct edges: `DRAFT → SUBMITTED`; `DRAFT → WITHDRAWAL_REQUESTED`; `SUBMITTED → ACCEPTED_FOR_REVIEW | WITHDRAWAL_REQUESTED | EXPIRED`; `ACCEPTED_FOR_REVIEW → NEEDS_CLARIFICATION | REJECTED | WITHDRAWAL_REQUESTED | CLOSED`; `NEEDS_CLARIFICATION → ACCEPTED_FOR_REVIEW | REJECTED | WITHDRAWAL_REQUESTED | EXPIRED`; `WITHDRAWAL_REQUESTED → CANCELLED | ACCEPTED_FOR_REVIEW | UNKNOWN`; `CANCELLED | REJECTED | EXPIRED → CLOSED`; any state may fail closed to `UNKNOWN` on contradiction without erasing its last supported history.

Authority/evidence: PA may submit or request withdrawal only through Task 05; AR may accept technical submission; PH/assigned workflow supplies review/rejection/clarification references. Required evidence binds request, actor/subject, current choice intent and source revisions. Concurrency/audit: one idempotent submission, compare-and-set head, preserve draft/submission/review/withdrawal/cancellation revisions and audit only minimized transitions. Invalid examples: submission cannot accept a prescription; cancellation cannot delete evidence, undo custody or create a refund/claim.

### 3.2 Prescription-evidence/review lifecycle

`NOT_RECEIVED`, `RECEIVED` and `REVIEW_PENDING` are slice shorthand for `NOT_PROVIDED`, `EVIDENCE_RECEIVED` and `UNREVIEWED`. An integrity check may be an independent technical evidence condition, but `INTEGRITY_CHECK_PENDING` is not an additional prescription-review state and never decides the pharmacy review.

| State | Meaning |
|---|---|
| `NOT_PROVIDED` (`NOT_RECEIVED`) | No evidence reference exists. |
| `EVIDENCE_RECEIVED` (`RECEIVED`) | Evidence/provenance accepted technically, still unverified. |
| `UNREVIEWED` (`REVIEW_PENDING`) | Technical prerequisites passed or approved non-applicability was recorded; human review has not begun. |
| `REVIEW_IN_PROGRESS` | Assigned pharmacy workflow is reviewing exact evidence revisions. |
| `CLARIFICATION_REQUIRED` | Missing information/professional clarification blocks the review. |
| `ACCEPTED_BY_PHARMACY` | Projection of an actual pharmacy-owned G01 acceptance for the exact authoritative prescription/evidence/source revision; upload, OCR, request submission or AgentRx cannot create it. |
| `REJECTED_BY_PHARMACY` | Attributed pharmacy decision; a scanner/parser cannot create it. |
| `TRANSFER_PENDING` / `RENEWAL_PENDING` | Professional source decision remains pending. |
| `PROFESSIONAL_DECISION_REQUIRED` | Review cannot advance without an authorized decision. |
| `UNKNOWN` | Source, subject, integrity or professional state is contradictory/unmapped. |

Valid direct edges: `NOT_PROVIDED → EVIDENCE_RECEIVED`; `EVIDENCE_RECEIVED → UNREVIEWED | UNKNOWN`, with the projection remaining `EVIDENCE_RECEIVED` while required independent technical-integrity evidence is pending; `UNREVIEWED → REVIEW_IN_PROGRESS`; `REVIEW_IN_PROGRESS → CLARIFICATION_REQUIRED | ACCEPTED_BY_PHARMACY | REJECTED_BY_PHARMACY | TRANSFER_PENDING | RENEWAL_PENDING | PROFESSIONAL_DECISION_REQUIRED`; each pending/clarification state may return to `REVIEW_IN_PROGRESS` only with new accepted evidence and current authority; any source conflict moves the projection to `UNKNOWN`.

Authority/evidence: EV owns technical provenance/integrity facts only; PA supplies statements only; PH owns acceptance/rejection and professional review. Evidence must match subject, request, source and revision. Concurrency/audit: immutable raw/source evidence references plus versioned review head; duplicate evidence does not merge decisions; later evidence supersedes pointers without deletion. Invalid examples: upload, OCR completion, patient statement, prescriber detail, refill/renewal/transfer request or technical failure cannot establish prescription validity, acceptance/rejection or a professional FAIL.

### 3.3 Inventory lifecycle

The slice concepts `ESTIMATE_AVAILABLE`, `CONFIRMED` and `UNAVAILABLE` map to the Task 08 states below. Generic `CONFIRMED` must resolve to a specific authoritative result. `RELEASED` is not an additional inventory state: it is source-owned reservation-lifecycle evidence. An accepted reservation release requires a fresh inventory projection and never means professional medication release or automatic restock.

| State group | Meaning |
|---|---|
| `UNKNOWN` | No usable supported inventory fact, or contradictory/untrusted facts; advancement is blocked. |
| `ESTIMATE_ONLY` (`ESTIMATE_AVAILABLE`) | Non-authoritative estimate with source and expiry. |
| `CONFIRMATION_PENDING` | Current pharmacy confirmation is required. |
| `CONFIRMED_AVAILABLE` / `CONFIRMED_PARTIAL` / `CONFIRMED_UNAVAILABLE` | Exact authoritative result (`CONFIRMED`/`UNAVAILABLE` slice concepts), including product/quantity/source scope. |
| `RESERVED` / `RESERVATION_EXPIRED` | Source-owned allocation projection; no local stock authority. Release/consumption remains separate source evidence and requires re-projection. |
| `SUBSTITUTION_DECISION_REQUIRED` | Pharmacy-owned professional decision pending; no automated substitution. |
| `RECALL_OR_QUARANTINE` / `EXPIRY_EXCEPTION` / `STORAGE_EXCEPTION` / `INTEGRITY_EXCEPTION` | Blocking authoritative exception. |

Valid direct edges: a new verified source revision may establish `ESTIMATE_ONLY` or `CONFIRMATION_PENDING` from no usable projection; `ESTIMATE_ONLY → CONFIRMATION_PENDING | UNKNOWN`; `CONFIRMATION_PENDING → CONFIRMED_AVAILABLE | CONFIRMED_PARTIAL | CONFIRMED_UNAVAILABLE | SUBSTITUTION_DECISION_REQUIRED | any named exception | UNKNOWN`; `CONFIRMED_AVAILABLE → RESERVED | CONFIRMATION_PENDING | any named exception`; `CONFIRMED_PARTIAL → RESERVED | SUBSTITUTION_DECISION_REQUIRED | CONFIRMATION_PENDING`; `RESERVED → RESERVATION_EXPIRED | CONFIRMATION_PENDING | any named exception`, where release/consumption requires accepted source evidence and a fresh projection rather than a fabricated local state. Unavailable, expired and exception states require a new source revision before returning to confirmation pending.

Authority/evidence: PH inventory system/authorized personnel owns product, quantity, on-hand versus available, expiry, recall/quarantine, storage/integrity and reservation facts. AR validates exact references only. Concurrency/audit: source stock/version rechecked at commit; reservation races serialize at the authoritative owner; historical observations/allocations remain. Invalid examples: estimate/catalogue/wholesaler data cannot confirm inventory; confirmation cannot authorize preparation when another guard is missing, release medication, restore stock or create financial/claim state.

### 3.4 Preparation lifecycle

| State | Meaning |
|---|---|
| `NOT_AUTHORIZED` (`NOT_STARTED`) | Preparation has no current professional/workflow authorization. |
| `PENDING` (`PREPARATION_PENDING`) | Approved preparation task is waiting. |
| `IN_PREPARATION` (`IN_PROGRESS`) | Assigned pharmacy technical work is in progress. |
| `PREPARED` (`READY_FOR_CHECK`) | Preparation evidence complete enough for the required check; not READY. |
| `TECHNICAL_CHECK_PENDING` / `TECHNICAL_CHECK_COMPLETE` | Approved technical check lifecycle; not a pharmacist-only decision. |
| `REWORK_REQUIRED` / `STOPPED` (`FAILED`) | Rework or stop is supported; prior work remains history. |
| `UNKNOWN` | Contradictory/unmapped preparation state. |

Valid direct edges: `NOT_AUTHORIZED → PENDING` only after G08; `PENDING → IN_PREPARATION | STOPPED`; `IN_PREPARATION → PREPARED | REWORK_REQUIRED | STOPPED`; `PREPARED → TECHNICAL_CHECK_PENDING | REWORK_REQUIRED`; `TECHNICAL_CHECK_PENDING → TECHNICAL_CHECK_COMPLETE | REWORK_REQUIRED | STOPPED`; a new supported defect may move `TECHNICAL_CHECK_COMPLETE → REWORK_REQUIRED`; rework requires a new task/revision before `IN_PREPARATION`; changed prerequisites invalidate the current projection to `NOT_AUTHORIZED`, `STOPPED` or `UNKNOWN` without rewriting completed work. Generic slice shorthand `COMPLETED` is not an additional authoritative state and cannot imply professional check, release or READY.

Authority/evidence: approved PH workflow/G08 and assigned technical actor; professional implications stay PH-owned. Concurrency/audit: bind prescription/product/inventory/task/item versions; one item's completion cannot advance another; append rework/supersession. Invalid examples: request, inventory, payment, task completion, label generation or technical check cannot independently create professional PASS, release or READY.

### 3.5 Professional-check, counselling and release lifecycle

The required professional-state projection is built from independent, immutable professional gates; it is not permission to overwrite their history. A prior `PROFESSIONAL_CHECK_PASSED` decision may coexist in history with a current `COUNSELLING_PENDING` projection, and a prior `RELEASE_AUTHORIZED` decision remains evidence after a later `RELEASE_REVOKED` successor.

| State | Meaning / valid direct edges |
|---|---|
| `REVIEW_PENDING` | Required professional review has not reached the check gate. Current supported prerequisites advance a new revision to `PROFESSIONAL_CHECK_PENDING`. |
| `PROFESSIONAL_CHECK_PENDING` | The actual authorized professional decision is pending; it advances to either `PROFESSIONAL_CHECK_PASSED` or `PROFESSIONAL_CHECK_FAILED`. |
| `PROFESSIONAL_CHECK_PASSED` | Attributed pass evidence exists for exact current inputs. It advances to `COUNSELLING_PENDING` when counselling applies, or to `RELEASE_AUTHORIZED` only when all release prerequisites are independently satisfied. |
| `PROFESSIONAL_CHECK_FAILED` | Attributed failure blocks release. Rework/new source evidence starts a new linked `REVIEW_PENDING` revision rather than editing the failure. |
| `COUNSELLING_PENDING` | Applicability is unresolved or approved counselling evidence remains outstanding. Accepted `COUNSELLING_REQUIREMENT_SATISFIED` evidence may allow `RELEASE_AUTHORIZED`; changed item/policy/recipient/source starts a new pending revision. Task 07 message delivery cannot satisfy it. |
| `RELEASE_AUTHORIZED` | Actual attributed G12 decision after all current prerequisites; it advances to `RELEASE_REVOKED` when an actual authorized revocation is recorded. |
| `RELEASE_REVOKED` | Revocation blocks readiness/future handoff. Any later authorization is a new attributed release after all current prerequisites, never reversal of revocation history. |
| `UNKNOWN` | Missing, contradictory, stale or unmapped professional evidence; all professional advancement and readiness fail closed. |

Authority/evidence: only the actual authenticated, assigned, currently authorized PH actor/source under G09–G13; exact professional scope remains NOT VERIFIED. Required evidence binds authoritative prescription, product/quantity, preparation/technical-check, counselling, package/item, policy and consumed versions. Concurrency/audit: immutable attributed decisions; serialize check/rework and release/revocation against readiness/handoff; audit actual actor and minimized decision/version refs, never clinical rationale. Invalid examples: AgentRx, patient, technician/admin/support, courier, worker, webhook, payment or preparation cannot create PASS/FAIL, counselling satisfaction, release or revocation. AgentRx validates supported completeness only.

### 3.6 Fulfilment-mode lifecycle

| States | Valid direct edges and controls |
|---|---|
| `PREFERENCE_PENDING`, `PICKUP_SELECTED`, `DELIVERY_SELECTED`, `MODE_CHANGE_PENDING`, `MODE_CONFIRMED`, `MODE_UNAVAILABLE`, `UNKNOWN` | `PREFERENCE_PENDING` advances to either `PICKUP_SELECTED` or `DELIVERY_SELECTED`; a selected mode advances to `MODE_CONFIRMED`, `MODE_UNAVAILABLE` or `MODE_CHANGE_PENDING`; change pending advances to pickup/delivery selected only after new PA intent and PH feasibility review; any contradiction advances to `UNKNOWN`. PA preference is intent, PH confirms feasibility. A choice or mode never changes tenant scope, recipient authority, release, custody or financial state. Version and audit preserve previous preferences and acknowledged external plans. |

### 3.7 Pickup lifecycle

| State | Meaning |
|---|---|
| `NOT_PLANNED` | No current pickup plan. |
| `PLANNED` | Current pharmacy plan exists; readiness not implied. |
| `READY_FOR_PICKUP` | Derived package/plan projection requiring global READY and current pickup guards. |
| `PICKED_UP` | Patient/prior-authorized recipient took custody with accepted package-specific proof. |
| `FAILED` | No-show, wrong/unknown recipient, failed proof or other supported failure; not receipt. |
| `EXPIRED` | Approved pickup window/plan validity elapsed; no return/restock/refund inference. |

Valid direct edges: `NOT_PLANNED → PLANNED`; `PLANNED → READY_FOR_PICKUP | FAILED | EXPIRED`; `READY_FOR_PICKUP → PICKED_UP | PLANNED | FAILED | EXPIRED`; failed/expired requires a new approved plan revision before `PLANNED`. `PICKED_UP` is immutable physical history; correction/dispute appends evidence and reconciliation rather than regression.

Authority/evidence: PH plan/release/counselling/package plus current Task 05 recipient authorization and accepted proof. `PICKED_UP` is patient receipt only when proof requirements are satisfied; pharmacy-to-courier collection never enters this lifecycle. Concurrency/audit: serialize package custody/version, recipient grant, release/revocation and proof; one package's proof cannot complete another or a multi-package plan. Invalid examples: READY, window arrival, code/link possession, notification, payment or staff checkbox cannot create pickup/receipt.

### 3.8 Delivery lifecycle

| State | Meaning |
|---|---|
| `NOT_PLANNED` / `PLANNED` | No current plan / current pharmacy-approved plan; no courier effect. |
| `HANDED_TO_COURIER` | Accepted pharmacy-to-assigned-courier custody event; not patient receipt. |
| `IN_TRANSIT` | Package remains in approved courier custody. |
| `ATTEMPTED` | Physical attempt supported; no receipt implied. |
| `DELIVERED` | Patient/prior-authorized recipient receipt accepted by PH against proof. |
| `FAILED` | Supported failure; cannot become receipt. |
| `RETURN_PENDING` | Approved return path requested/required; correct-pharmacy receipt pending. |
| `RETURNED` | Verified physical custody at the correct pharmacy; stock disposition separate. |

Valid direct edges: `NOT_PLANNED → PLANNED`; `PLANNED → HANDED_TO_COURIER | FAILED`; `HANDED_TO_COURIER → IN_TRANSIT | FAILED | RETURN_PENDING`; `IN_TRANSIT → ATTEMPTED | DELIVERED | FAILED | RETURN_PENDING`; `ATTEMPTED → DELIVERED | FAILED | RETURN_PENDING`; `FAILED → RETURN_PENDING` or a new approved attempt/plan revision; `RETURN_PENDING → RETURNED | FAILED`. `DELIVERED` and `RETURNED` are immutable physical facts; later dispute/return appends separate evidence.

Authority/evidence: PH authorizes release/plan and accepts mapped CV observations; accepted recipient proof is required for `DELIVERED`; verified PH receipt is required for `RETURNED`. Concurrency/audit: bind package, assigned courier, release, recipient, plan, attempt, proof and custody versions; provider events are deduplicated then reconciled, never directly applied. Invalid examples: courier acceptance/custody, “delivered” webhook, failed/wrong-recipient attempt, timeout, cancellation or notice cannot establish `DELIVERED`; return never auto-restocks or creates claim/financial effects.

### 3.9 Return lifecycle

| State | Meaning |
|---|---|
| `NOT_STARTED` | No return process. |
| `REQUESTED` | Approved return intent exists; holder/custody unchanged until evidence. |
| `IN_PROGRESS` | Package follows an approved return path. |
| `RECEIVED_BY_PHARMACY` | Verified physical receipt at the correct pharmacy, including a delayed valid return. |
| `DISPOSITION_PENDING` | Package segregated; professional stock decision absent. |
| `DISPOSITION_DECIDED` | Actual authorized PH decision reference exists; execution still source-owned. |
| `CLOSED` | Return, exception, disposition and reconciliation obligations closed. |

Valid direct edges: `NOT_STARTED → REQUESTED`; `REQUESTED → IN_PROGRESS | CLOSED` only when safely withdrawn before physical effect; `IN_PROGRESS → RECEIVED_BY_PHARMACY`; `RECEIVED_BY_PHARMACY → DISPOSITION_PENDING`; `DISPOSITION_PENDING → DISPOSITION_DECIDED`; `DISPOSITION_DECIDED → CLOSED`. Wrong destination, missing custody or contradictory proof remains in progress/exception/reconciliation and cannot become received.

Authority/evidence: PH/CV sources provide physical chain; PH verifies correct-pharmacy custody and actual authorized PH/G15 decides disposition. Concurrency/audit: append custody/exception/delay evidence; one accepted receipt per package/custody version; disposition idempotency cannot duplicate source stock/financial effects. `RETURNED` derives from `RECEIVED_BY_PHARMACY`, not timeliness. Invalid examples: RETURNED is not saleable inventory; delayed receipt can still qualify, but no return automatically restocks, re-dispenses, destroys, refunds, reverses a claim or changes payment.

### 3.10 Exception lifecycle

| State | Meaning / valid direct edges |
|---|---|
| `NONE` | No active exception projection; closed history still exists. `NONE` advances to either `OPEN` or `BLOCKING`. |
| `OPEN` | Exception recorded and owned; `OPEN` advances to either `BLOCKING` or `RESOLVED`. |
| `BLOCKING` | Affected progression must stop; `BLOCKING → RESOLVED` only with source-supported containment/resolution. |
| `RESOLVED` | Resolution evidence accepted; `RESOLVED → CLOSED`. New contradictory evidence creates a new linked exception/reconciliation rather than rewriting this record. |
| `CLOSED` | Administrative closure after dependent obligations; terminal historical record. |

Authority/evidence: actual fact owner/assigned PH or operational owner; G14 for professional exceptions. Concurrency/audit: multiple independent exceptions may coexist; current blocking set is a versioned projection; no arbitrary metadata or clinical rationale in technical audit. Invalid examples: patient/courier waiver, timeout, admin closure or closed work item cannot resolve a professional/custody exception or create success.

### 3.11 Financial lifecycle

All financial states are synthetic-only concepts in v1 and remain BLOCKED by T08-D08/D21/D22. They are included because omitting them would allow another dimension to imply payment or claim truth.

| States | Valid direct edges and controls |
|---|---|
| `NOT_STARTED`, `ESTIMATE_AVAILABLE`, `ADJUDICATION_PENDING`, `ADJUDICATED`, `PATIENT_CONFIRMATION_PENDING`, `PAYMENT_NOT_REQUIRED`, `PAYMENT_PENDING`, `PAYMENT_AUTHORIZED`, `PAYMENT_CAPTURED`, `PAYMENT_FAILED`, `CANCELLATION_PENDING`, `REFUND_PENDING`, `REFUNDED`, `RECONCILIATION_REQUIRED`, `UNKNOWN` | Estimate → adjudication pending → adjudicated/patient confirmation; approved ledger policy may then select not-required or payment pending; payment pending → authorized/failed/reconciliation; authorized → captured/cancellation/reconciliation; cancellation → refund pending/not-required/reconciliation; refund pending → refunded/reconciliation. Only approved PY/PM ledger sources establish results. Amount/source changes create new revisions. No financial state authorizes prescription, preparation, release, pickup, delivery, receipt or claim; Task 08 never creates/codes/submits/reverses a claim. |

### 3.12 Custody lifecycle

This is the authoritative physical dimension underlying pickup/delivery/return projections.

| States | Core transitions and controls |
|---|---|
| `NO_PACKAGE`, `PHARMACY_CUSTODY`, `PICKUP_HANDOFF_PENDING`, `COURIER_BOOKING_PENDING`, `COURIER_ACCEPTED`, `IN_TRANSIT`, `DELIVERY_ATTEMPTED`, `PATIENT_RECEIVED`, `AUTHORIZED_AGENT_RECEIVED`, `DELIVERY_FAILED`, `CUSTODY_EXCEPTION`, `RETURN_REQUESTED`, `RETURNING_TO_PHARMACY`, `RETURNED_TO_PHARMACY`, `CUSTODY_UNKNOWN` | Package creation evidence establishes pharmacy custody; direct pickup pending → one accepted recipient receipt; courier booking pending → courier accepted → in transit → attempt → patient/agent received, failed or exception; failure/exception → return requested → returning → returned to correct pharmacy. Every transfer requires exact package, from/to holder, accepted evidence and consumed custody version. Courier custody is never patient receipt. Wrong/missing/contradictory holder becomes `CUSTODY_UNKNOWN`, not a guessed holder; later correction appends evidence. |

### 3.13 Reconciliation lifecycle

| State | Meaning / valid direct edges |
|---|---|
| `NOT_REQUIRED` | No unresolved external conflict; new uncertainty → `PENDING`. |
| `PENDING` | Case accepted; `PENDING` advances to `IN_PROGRESS`, `MANUAL_REVIEW_REQUIRED` or `UNRESOLVED`. |
| `IN_PROGRESS` | Assigned owner investigates; it advances to `RESOLVED_NO_EFFECT`, `RESOLVED_APPLIED`, `MANUAL_REVIEW_REQUIRED` or `UNRESOLVED`. |
| `RESOLVED_NO_EFFECT` | Authoritative evidence proves no effect; terminal case revision. |
| `RESOLVED_APPLIED` | Approved fact owner applied one validated effect; terminal case revision. |
| `MANUAL_REVIEW_REQUIRED` | Human owner needed; may return to `IN_PROGRESS` with assignment/evidence. |
| `UNRESOLVED` | Safely remains unresolved; may return to `IN_PROGRESS` only with new evidence/authority. |

Authority/evidence: actual source/operation owner, not callback sender; preserve original bounded evidence/digests and acknowledgements. Concurrency/audit: one issue/revision head, no collapsing independent conflicts, uncertain commit prevents retry. Resolution cannot invent a professional decision, physical event, payment, claim, restock or message receipt.

## 4. Canonical transition rules

The following register covers the minimum critical transitions. Every row inherits section 2.2. “Effect” means proposed state/evidence only; this document executes nothing. Assessment and claim effect is **always zero**.

| Critical transition | Required authority/evidence | Result and prohibited effects |
|---|---|---|
| Draft → submitted | Current PA/ID request authority; strict request, choice/preference intent, idempotency and version. | Request `SUBMITTED` only; cannot accept prescription or create review success, stock, payment, release or claim. |
| Submitted → accepted for review | Assigned PH workflow/destination relationship and request revision. | Request review coordination only; `ACCEPTED` shorthand never prescription validity. |
| Evidence received → review in progress | EV technical provenance/integrity plus assigned PH access to exact revisions. | Review begins; OCR/integrity pass cannot decide validity. |
| Review → clarification required | PH clarification reference or AR-detected missing workflow prerequisite, distinguished explicitly. | No software-generated clinical question or professional resolution. |
| Clarification response → review resumed | Current ID-authorized response/evidence and assigned PH workflow. | Returns to review; response does not itself clear professional uncertainty. |
| Review → pharmacy accepted/rejected | Actual PH decision/source/version under G01/G02. | Attributed pharmacy-owned acceptance/rejection projection; technical failure cannot fabricate either decision. |
| Pharmacy acceptance → inventory confirmation pending | Current underlying G01 authoritative prescription decision/reference plus current item linkage. | Inventory work may begin; request acceptance or technical evidence receipt alone is insufficient. |
| Inventory confirmation → precise result | PH product/quantity/source/expiry/recall/storage/integrity evidence. | Available/partial/unavailable/substitution/exception state only; no preparation/release. |
| Confirmed available → preparation pending | Current authoritative prescription, G08, inventory and item versions. | Preparation task only; no product/quantity inference or READY. |
| Preparation pending → in preparation → prepared | Assigned approved technical workflow and exact task/item/source versions. | Physical/technical progress only; no professional PASS. |
| Prepared → professional check pending → passed/failed | Actual PH G09/G10 decision after required technical evidence. | Attributed immutable decision; admin/technician/AgentRx cannot create it. |
| Passed → counselling required/satisfied or release authorized | Actual PH G11/G12, current applicability and all consumed prerequisites. | Missing counselling blocks release; message/read receipt is insufficient. |
| Release authorized → READY_FOR_PICKUP | Current derived READY plus pickup plan, recipient and package guards. | Derived pickup readiness only; no receipt/payment/claim. |
| Release authorized → courier booking pending | Current derived READY plus delivery/address/recipient/storage/package plan. | Booking intent only; no courier custody or shipment. |
| Pharmacy custody → courier accepted → in transit | Current release, assigned courier, exact package and accepted custody events. | Courier custody only; never HANDED_OFF/patient receipt. |
| In transit → attempted → patient/agent receipt, failed or exception | Exact attempt/package/recipient grant/proof/PH acceptance and custody version. | Only accepted proof creates receipt; webhook/timeout/failure cannot. |
| Failed delivery → return requested → returning | PH-approved containment/return path and actual holder. | RETURNING only; no pharmacy receipt, restock, refund or claim. |
| Returning → returned to pharmacy → disposition pending | Verified physical receipt at correct pharmacy, including supported delayed receipt. | RETURNED custody only; disposition stays separate. |
| Eligible pre-handoff state → withdrawal requested | Current PA/authorized actor intent plus state/version. | Request pending; no assumed reversal of source/external effects. |
| Withdrawal requested → cancelled/denied/reconciliation | Relevant PH/source acknowledgements and every affected dimension. | CANCELLED only when consequences are acknowledged/reconciled; retained evidence remains. |
| External timeout/unknown callback → reconciliation pending | Durable bounded operation/receipt evidence and source scope. | No blind retry or state advancement. |
| Any contradictory/unmapped event → UNKNOWN | Conflict evidence retained and owner assigned. | Fail closed; never fabricate professional, financial or physical truth. |

Invalid transitions return a generic safe refusal or unresolved result, do not mutate a protected head, do not emit a success intent and do not disclose which authority/evidence failed. If a required audit write is later approved as atomic and fails, the accepted transition and idempotency success must roll back together. A transition that may already have caused an external effect cannot be rolled back by assertion; it enters reconciliation.

## 5. Derived canonical workflow states

The canonical set is exactly:

`REQUESTED`, `VERIFICATION`, `CLARIFICATION`, `INVENTORY`, `PREPARATION`, `PHARMACIST_CHECK`, `READY`, `IN_TRANSIT`, `HANDED_OFF`, `FAILED`, `RETURNING`, `RETURNED`, `CANCELLED`, `UNKNOWN`.

| Derived state | Minimum supported condition; no additional authority implied |
|---|---|
| `REQUESTED` | Request is submitted; no prescription validity, inventory, price or fulfilment. |
| `VERIFICATION` | Authorized pharmacy workflow is reviewing identity/relationship/request/evidence; no acceptance implied. |
| `CLARIFICATION` | Missing workflow information or professional clarification is pending. |
| `INVENTORY` | Separate authoritative prescription acceptance exists and inventory is being estimated/confirmed. |
| `PREPARATION` | G08 authorized preparation and current inventory prerequisites exist; professional release absent. |
| `PHARMACIST_CHECK` | Professional check or required counselling remains pending. |
| `READY` | Every guard in section 5.1 is current. Not manually set. |
| `IN_TRANSIT` | Released package is in accepted assigned-courier custody; patient receipt absent. |
| `HANDED_OFF` | Patient/prior-authorized recipient took custody through accepted package-specific proof; courier pickup never qualifies. |
| `FAILED` | A blocking supported exception prevents the selected path and requires an explicit next step. |
| `RETURNING` | Approved return is in progress; correct-pharmacy receipt and disposition pending. |
| `RETURNED` | Verified correct-pharmacy physical custody, including valid delayed receipt; saleability/disposition separate. |
| `CANCELLED` | Cancellation accepted and every required operational consequence acknowledged/reconciled; cannot rewrite later physical facts. |
| `UNKNOWN` | Required state is contradictory, unmapped, stale beyond safe interpretation or externally uncertain; no advancement. |

Projection evaluation is deterministic but not a universal mutable state machine. First return `UNKNOWN` for contradictions/unresolved authoritative outcomes. Then preserve the most recent verified physical path (`RETURNED`, `RETURNING`, `HANDED_OFF`); a blocking exception produces `FAILED` when it does not contradict known custody; current courier custody produces `IN_TRANSIT`. `CANCELLED` applies only before a later physical truth and after consequences are resolved. `READY` and upstream workflow projections follow only after all higher-priority physical/exception/cancellation conditions are excluded. The full vector remains visible to authorized workflows regardless of projection.

### 5.1 READY derivation

`READY` is not a stored professional decision, user command, worker result or webhook state. It may be true only when all applicable items/packages satisfy all current guards:

1. authoritative prescription workflow supplies the required current G01 acceptance/reference and the prescription-review projection is `ACCEPTED_BY_PHARMACY`; request `ACCEPTED_FOR_REVIEW` or technical evidence receipt alone is insufficient;
2. inventory is current and in the exact approved available/reserved state for every included item, with no recall/quarantine/expiry/storage/integrity/substitution blocker;
3. preparation and required technical check are complete for the exact item revisions;
4. `PROFESSIONAL_CHECK_PASSED` is current and attributable to the actual authorized PH actor;
5. counselling has current accepted `COUNSELLING_REQUIREMENT_SATISFIED` evidence or is supported as not required by an approved current policy—absence/unknown never passes;
6. current `RELEASE_AUTHORIZED` exists for every included item and no `RELEASE_REVOKED` successor applies;
7. fulfilment mode/plan, package manifest and item-specific storage/security requirements are complete and current;
8. custody remains `PHARMACY_CUSTODY`, recipient/address/choice/assignment guards are current as applicable, and no accepted cancellation, blocking exception or active reconciliation exists.

If any consumed guard, source version, assignment, grant, policy, package, recipient, address, choice, release or approval becomes missing, stale, revoked, contradictory or unknown, READY immediately derives false. The prior professional release remains immutable history; revocation creates a new attributed decision, removes readiness and blocks future handoff. It cannot rewrite a physical handoff already committed.

`READY_FOR_PICKUP` is likewise derived from global READY plus a current pickup plan and package-specific recipient/proof prerequisites. Courier booking availability, payment, task completion or notification cannot create either projection.

## 6. Concurrency rules

| Scenario | Required behavior |
|---|---|
| Stale state version | Reject generically; no state, audit-success, idempotency-success or external intent. Require a fresh authorized read. |
| Competing transitions | Serialize every affected head/source version in an approved deterministic order. At most one transition consumes a version; loser re-evaluates all guards. |
| Duplicate transition | Same key and typed request returns one validated result and no duplicate evidence/effect; changed request conflicts. |
| Retry after rollback | Retry only an independently proven rollback under an approved bounded policy with fresh authorization/versions. |
| Unknown commit/external result | Do not retry blindly. Preserve operation/evidence and enter reconciliation. |
| Webhook race/replay | Durable bounded receipt, authenticate/bind/deduplicate/order-check, then map under current versions. Same source ID/different digest conflicts. Webhook never directly sets protected truth. |
| Cancellation versus preparation | Current versions decide whether safe cancellation can close or a PH work item/acknowledgement is required; preparation history remains. |
| Cancellation versus release | Serialize release/revocation/readiness/cancellation; no stale release or cancellation overwrites the other. If outcome is uncertain, reconcile. |
| Cancellation versus delivery | Preserve actual custody. Acknowledged courier pickup requires intercept/return handling; accepted recipient receipt is not reversed. |
| Release revocation versus handoff | Recheck immediately before handoff. Revocation blocks future transfer; already committed custody remains and opens containment/reconciliation as required. |
| Return versus reconciliation | Verified correct-pharmacy receipt may establish returned custody while delay/conflict evidence remains; disposition and unresolved independent cases stay pending. |
| Multi-item/package transition | Consume every applicable item/package/source version atomically or do not advance the aggregate projection; one member cannot satisfy another. |

Material request, source, professional, financial, custody, exception and reconciliation evidence is append-only or superseded by attributed revision. No silent overwrite, delete-and-recreate, last-write-wins browser update or retroactive change to physical truth is permitted.

## 7. Audit rules

A future approved audit contract must be closed and transition-specific. It may include only the actual authorized actor where required, opaque scoped resource references, approved action/outcome/safe reason, source/policy/workflow versions, trusted occurrence time and before/after state versions. The audit and accepted local state/idempotency result must be atomic where audit is required.

Audit must not contain prescription/evidence/OCR content, clinical rationale, drug/product/stock facts, subject/contact/address/recipient details, raw proof, signature, location, payer/payment values, credentials, raw vendor bodies, arbitrary metadata or sensitive identifiers. Professional rationale remains at the authoritative pharmacy source; physical evidence remains in its approved protected store. Denied-attempt evidence follows a separately approved minimized contract and cannot create a sensitive enumeration difference.

No state transition in this document creates a patient, pharmacy or courier message. A later approved transition may commit a minimized Task 07 intent in the same transaction; provider delivery remains an external observation and cannot set review, counselling, receipt or professional state. No technical audit event creates or implies a claim.

## 8. Future synthetic test obligations — not implemented or run

| ID | Later independently required assertion |
|---|---|
| F-T01 | Closed dimension schemas reject unknown states/fields and browser/provider-supplied actor, pharmacy/tenant, role, source version, professional result, state or time authority. |
| F-T02 | Every listed valid edge accepts only with exact current authority/evidence; every unlisted direct edge fails with zero state/effect and generic output. |
| F-T03 | Request submission, evidence receipt, integrity/OCR completion and request/evidence acceptance cannot create prescription validity, inventory, preparation, payment, release, pickup, delivery or claim. |
| F-T04 | Inventory estimate/confirmation/reservation/release states remain independent from preparation, professional release, saleable stock and financial/claim state. |
| F-T05 | Preparation/technical completion cannot create professional PASS, counselling satisfaction, RELEASE_AUTHORIZED or READY. |
| F-T06 | Vary every READY guard independently; missing/stale/revoked/wrong-item/wrong-package/wrong-pharmacy evidence removes readiness. One item/package cannot satisfy another. |
| F-T07 | Release revocation races READY and handoff: it removes future readiness once committed, never erases the original decision or rewrites an earlier physical transfer. |
| F-T08 | Pickup proof is package-specific; no-show, unknown/wrong recipient, partial multi-package proof, window expiry and payment/notice cannot create PICKED_UP/HANDED_OFF. |
| F-T09 | Courier acceptance/in-transit/attempted and delivered webhook cannot create patient receipt; failed/wrong-recipient delivery remains failed/exception and enters approved return handling. |
| F-T10 | Correct-pharmacy verified receipt, including delayed receipt, establishes returned custody only; missing/wrong-location evidence blocks; no automatic saleability, restock, disposal, refund or claim. |
| F-T11 | Stale-version and real competing-transition barriers prove one winner, fresh guard re-evaluation, no lost professional/custody decision and no partial aggregate state. |
| F-T12 | Same-key duplicates produce one logical transition; changed payload conflicts; malformed replay fails; rollback leaves no success/audit/outbox/effect. |
| F-T13 | Webhook replay, reordering, same ID/different digest, wrong environment/account/pharmacy/resource and timeout/unknown commit enter reconciliation without direct protected transition or blind retry. |
| F-T14 | Contradictory/unmapped vector derives UNKNOWN and blocks professional, inventory, preparation, READY, physical, financial and claim advancement while preserving actual known custody. |
| F-T15 | Cancellation races preparation/release/delivery/handoff; evidence/history remains, acknowledged effects reconcile, and no reversal/restock/refund/claim is inferred. |
| F-T16 | Financial-state permutations have zero professional, custody and claim effects; request, READY, payment, pickup, delivery, return and cancellation never create/code/submit/reverse a claim. |
| F-T17 | Audit allowlists reject impossible action/outcome/state combinations and all sensitive/extra data; required audit failure rolls back accepted local state. |
| F-T18 | Architecture/no-egress/lifecycle tests reject Task 04 authority reuse, production imports, current-auth widening, external calls and any attempted runtime outside exact future approval. |

These are obligations, not test files, commands or PASS evidence. A future approved synthetic suite must use deterministic non-PHI server-owned fixtures, fixed trusted time, independent database connections where persistence is authorized and no external effects.

## 9. Production blockers

| Decision area | Current status / blocked behavior |
|---|---|
| T08-D02–D04/D36/D37 | No exact Task 08 synthetic scope/lifecycle, Task 01 use or applicable Task 11 implementation/release approval. No runnable state machine. |
| T08-D05/D17 | Task 03 prescription-evidence/PMS owner and authoritative prescription state contract unresolved. No accepted-prescription success path. |
| T08-D06/D14 | Task 05 patient/delegate/recipient identity unavailable. No patient transition authority or protected tracking. |
| T08-D08/D21/D22 | Task 09 is not the verified finance owner; pricing/adjudication/payment/claim authority unresolved. All financial states synthetic-only. |
| T08-D13/D15/D16 | Choice versus singleton tenant, accreditation, drug classification and jurisdiction policy unresolved. Affected routing/transfer states blocked. |
| T08-D18/D29/D32 | Exact state/command/event/error registries, ownership, lock/isolation/idempotency/reconciliation and audit-denial contracts unapproved. No schema/migration. |
| T08-D19/D20 | Inventory/product/reservation, preparation/check/counselling/release/revocation and multi-item policies unapproved. No professional or READY success simulation by guess. |
| T08-D23–D28/D30–D35 | Recipient/address/courier/proof/return, external integration, privacy/security, Task 07 communications, audit/retention/incident/accessibility controls remain blocked or NOT VERIFIED. |

Patient choice never becomes tenant authority. Request never becomes prescription. Evidence never becomes validity. Inventory never becomes professional release. Payment or delivery never becomes a claim. Courier custody never becomes recipient receipt. AgentRx never creates professional decisions. Unknown, stale, contradictory or unauthorized state fails closed.

## 10. Explicit non-authorization

This document grants **no implementation, migration, schema, professional, regulatory, legal, privacy, security, accessibility, synthetic-runtime, pilot or production authorization**. It creates no enum, source file, database field, event, permission, fixture, test result, message, inventory/payment/claim/custody effect or external integration. It does not modify authentication, Drizzle, migrations, protected billing/clinical/audit behavior or any existing file. All Task 08 mandatory stop conditions remain controlling.
