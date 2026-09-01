# Task 08 — Request and prescription-evidence workflow

**Status: WORKSTREAM E DOCUMENTATION / PROPOSED DESIGN ONLY. No route, upload, OCR, patient identity, professional decision, migration, runtime or production authority.**

## 1. Scope

This document defines the proposed request-intake, prescription-evidence, clarification and cancellation boundaries required by [Task 08](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), Workstream E. It must be read with [AGENTS.md](../../AGENTS.md), the [project overview](../PROJECT_OVERVIEW.md), the Workstream A [current-state analysis](current-state-and-gap-analysis.md) and [decision register](production-dependency-and-decision-register.md), the Workstream B [threat model](fulfilment-threat-model.md) and [trust boundaries](trust-boundaries-and-data-flows.md), the Workstream C [responsibility](professional-responsibility-matrix.md) and [authorization](role-and-transition-authorization-matrix.md) matrices, and the Workstream D [contracts proposal](fulfilment-contracts-and-schema-proposal.md).

Four categories remain separate:

1. **CURRENT:** the zero-PHI public intake and authenticated staff application described by repository evidence.
2. **PROPOSED SYNTHETIC/DESIGN:** deterministic non-PHI request and evidence-state examples that remain unimplemented and require exact future approval before execution.
3. **PROPOSED PRODUCTION:** future authenticated patient-to-pharmacy coordination whose identity, evidence, professional and source contracts are unresolved.
4. **PRODUCTION-BLOCKED:** real prescription evidence, storage/OCR, patient identity, PMS connections, professional review and every downstream physical or financial effect.

This document does not define the complete Workstream F state machine, an event registry, storage policy, accepted file type, size limit, malware product, OCR model, contact field, retention period, retry count or clinical/professional rule. Those values remain **PENDING** with their actual owners.

## 2. Current repository reality

| Current evidence | Verified boundary | Workstream E consequence |
|---|---|---|
| [Public intake actions](../../src/app/%28intake%29/assessment/actions.ts) and [AGENTS.md](../../AGENTS.md) | `/assessment` collects zero PHI and resolves only the server-configured pharmacy. | It must not be expanded into patient identity, prescription evidence, contact or upload intake. |
| [Authentication schema](../../src/lib/db/schema/auth.ts) and [server guard](../../src/lib/auth-guard.ts) | Better Auth identities and sessions are staff-facing and pharmacy-scoped. | No patient/delegate principal exists. Staff authentication must not be reused as patient authentication. |
| [Assessment schema](../../src/lib/db/schema/assessments.ts) | Clinical subjects and conditional prescription snapshots exist within the pharmacist assessment workflow. | They are not patient accounts, uploaded prescriptions, refill/renewal/transfer requests or authoritative dispensing records. |
| [Pharmacy configuration](../../src/lib/pharmacy-config.ts) | `PHARMACY_ID` is server-owned and fails closed when absent. | A requested destination can be recorded only as intent; it cannot select tenant authority. |
| [AI-RX-06 historical record](../task-10/AI-RX-06-synthetic-prescription-extraction.md) | The former extraction surface is **RETIRED** and its runtime was removed. | No active upload/OCR route or parser may be inferred or revived here. |
| [Task 07 status](../task-07/README.md) | Communications design exists; runtime has not started. | No clarification notice, contact resolution or secure message is available. |
| [Task 04 renewal](../task-04/decisions/task-04-synthetic-scope-renewal-v3-2026-08-19.md) | The renewal is DRAFT — NOT GRANTED after prior expiry. | No Task 04 identity, capability, database, idempotency receipt or runtime authority transfers to Task 08. |

Task 05 integrated patient, delegate, actor-to-subject and recipient identity is unavailable. Consequently, there is **no proposed current production patient route**, no upload surface and no safe reuse of a pharmacist session. Affected runtime behavior is **BLOCKED** under T08-D05/D06/D13/D14/D17. Independent documentation and later explicitly approved non-PHI synthetic design may proceed without pretending those dependencies exist.

## 3. Proposed synthetic/design request workflow

The following sequence is conceptual. No endpoint, schema, UI or database record exists because of this document.

| Step | Proposed behavior | Required authority and fail-closed condition |
|---|---|---|
| 1 — establish actor and subject | A patient or authorized actor identifies the intended subject through the future Task 05 actor-to-subject boundary. | A server-verified session, audience, actor, subject, relationship, action, lifecycle and revocation check is required. Unknown or unavailable identity blocks protected intake. |
| 2 — select request type | Select exactly one of the four request types below. | Selection expresses intent only. It establishes no prescription, refill, renewal or transfer authority. |
| 3 — express pharmacy choice | Choose or search/provide an intended pharmacy through the separately proposed choice boundary. | The choice is not `PHARMACY_ID`, tenant scope, accreditation proof or routing authority. Unresolved destination mapping blocks routing without forcing the configured pharmacy. |
| 4 — express fulfilment preference | Select pickup or delivery as a preference. | Preference is not feasibility, recipient authority, address verification, professional release or fulfilment approval. |
| 5 — provide evidence/contact | Supply **UNVERIFIED** prescription evidence and, only through an approved minimum-necessary flow, an existing pharmacy or prescriber contact. | No such storage/contact flow exists. Required purpose, fields, source, access, encryption and retention must be approved first. Evidence/contact never proves prescription validity. |
| 6 — review and correct | Review request facts and correct them before submission. | Corrections preserve actor/subject and choice provenance. Sensitive drafts must never be placed in URLs, logs, analytics or persistent browser storage. |
| 7 — submit once | Submit one strict, bounded, versioned request with an operation-scoped idempotency key. | The server re-derives identity, scope and trusted time. Same-key/same-payload replay may return only a validated minimized result; changed payload conflicts. No successful receipt survives rollback. |
| 8 — route for pharmacy review | Create or reference a pharmacy review task only after the future destination, relationship and source boundaries are valid. | This is a coordination task, not acceptance. Missing identity, destination authority or review ownership blocks routing. |
| 9 — clarify | The actor may respond to an authorized clarification through an approved protected channel. | A response is evidence, not professional resolution. Task 07 messaging and Task 05 access remain unavailable. |
| 10 — withdraw or cancel | Request withdrawal/cancellation under the stage-specific rules in section 8. | Cancellation records intent and accepted consequences separately; it never erases retained evidence or rewrites physical/professional truth. |

### 3.1 Required patient-facing wording

A future interface must communicate wording equivalent to all of the following:

- “This is a request for pharmacy review.”
- “An upload is not confirmed as a valid prescription.”
- “Availability, price, coverage, timing, pickup, and delivery are not confirmed until the pharmacy completes its review.”
- “A pharmacist may need to contact you, your prescriber, or another pharmacy.”
- “You may choose another pharmacy.”

The following terms are prohibited unless their exact authoritative event and every applicable current guard support them:

| Restricted term | Required boundary before display |
|---|---|
| “Order confirmed” | Do not use for a Task 08 request. No lawful order concept is defined. |
| “Prescription approved” | Current attributed pharmacy acceptance for the exact source/request/item. |
| “Refill guaranteed” | Do not promise; the authoritative pharmacy must determine validity, remaining quantity, interval and appropriateness. |
| “Covered” | Current authoritative adjudication/coverage evidence, not an estimate or patient statement. |
| “In stock” | Current authoritative inventory confirmation for the exact product/quantity, not catalogue or estimate data. |
| “Ready” | Derived only from current professional release and all operational guards; never request status alone. |
| “Shipped” | Accepted current custody evidence, not courier booking or attempted API call. |
| “Delivered” | Accepted patient/prior-authorized-recipient proof, never courier custody or provider assertion alone. |

## 4. Request-type behavior

| Request type | Permitted proposed coordination | Prohibited inference / required block |
|---|---|---|
| `NEW_PRESCRIPTION_REVIEW` | Accept unverified evidence and conceptually create/route a pharmacy review task. | Do not infer authenticity, completeness, prescriber authority or patient match. Inventory reservation, preparation, adjudication, payment, pickup and delivery remain blocked until the pharmacy supplies all required authoritative state. |
| `REFILL_REVIEW` | Record the actor's request for review and route it to an approved pharmacy workflow. | Never infer remaining quantity, interval eligibility, refill validity, prescriber status or clinical appropriateness. Require authoritative pharmacy-system or authorized-registrant confirmation. |
| `RENEWAL_REVIEW` | Record a request for professional review and route it to a separately approved professional workflow. | Do not promise renewal and do not preselect a drug, quantity, duration or prescriber. AgentRx cannot prescribe or choose the professional outcome. |
| `TRANSFER_REVIEW` | Record the request and intended receiving-pharmacy choice; permit choice change before an authoritative transfer. | A transfer request is not a transfer. Generic record copying cannot perform a legal/professional transfer or create an authorized prescription. Require an approved pharmacy-to-pharmacy workflow. Controlled-substance transfers are blocked in v1; unknown drug scope and cross-jurisdictional transfer fail closed. |

No request type changes a claim, assessment, prescription, inventory, preparation, release, custody, payment or delivery record.

## 5. Prescription-evidence lifecycle

These are independently sourced dimensions, not an automatic linear pipeline or an approved state/event registry.

| Evidence dimension | Proposed meaning | Authority boundary |
|---|---|---|
| Evidence received | A bounded evidence reference and submission provenance were accepted technically. | It is still unverified and does not prove a prescription or patient match. |
| Integrity/malware status | Future approved storage/scanner records pending, completed, failed, unavailable or unknown technical evidence. | No storage/scanner currently exists. A technical pass is not professional acceptance; unknown/failed checks block use. |
| OCR status | Future approved OCR records pending, completed, failed or unavailable, with a protected output reference and coarse confidence category. | No OCR currently exists. Output is untrusted extraction, never prescription validity or clinical truth. |
| Unreadable evidence | Authorized reviewer records that evidence cannot support review. | A technical unreadable status must not fabricate a professional rejection. Clarification or replacement remains separately controlled. |
| Duplicate evidence | A suspected or source-confirmed duplicate is linked without deleting either provenance record. | A digest alone cannot merge patients, requests or professional decisions. |
| Wrong-patient evidence | An authorized review identifies a subject mismatch. | Contain access and route to approved privacy/incident handling; never expose the other subject or silently reassign evidence. |
| Human review | An assigned authorized reviewer examines necessary evidence through an approved protected channel. | Review progress is not acceptance. Exact staff/professional permissions remain blocked under Workstream C. |
| Clarification required | A missing prerequisite or attributed pharmacy clarification is linked to the exact evidence/request revision. | AgentRx may identify workflow omissions only; it cannot create or resolve professional uncertainty. |
| Pharmacy acceptance/rejection reference | A supported reference to the actual pharmacy-owned decision and source version. | Only the authorized pharmacy/professional source establishes it. A parser, patient, admin, worker or callback cannot. Negative professional decisions also require authority. |

An upload, image, document, OCR result, patient statement, prescriber information, transfer request or refill request **NEVER establishes prescription validity**. A copied record is evidence only until the approved pharmacy workflow establishes authoritative prescription state.

## 6. Clarification boundary

Clarification may concern:

- patient/subject mismatch;
- evidence quality or completeness;
- prescriber transmission;
- refill status;
- transfer details;
- product or quantity uncertainty;
- inventory shortage;
- pickup or delivery feasibility;
- authorized recipient;
- address; or
- price or payment.

AgentRx may identify a missing **workflow prerequisite**, preserve its source and route a work item. It must not generate a clinical clarification, answer a prescriber question, resolve professional uncertainty, recommend therapy, select a product/quantity, or turn a response into G03 `CLARIFICATION_RESOLVED`. An actual authorized professional and approved source record must supply any professional clarification or resolution reference.

The future clarification read/write boundary requires the same current actor/subject/relationship/action/pharmacy/request checks as the request. A staff session is not patient authorization; a patient relationship is not professional authority. Task 07 alone would own approved notices and secure messaging. Notice delivery never means the patient understood, responded or satisfied a professional gate.

## 7. Authorization boundary

Every future protected request must derive, server-side:

- current session and audience;
- actual actor and intended subject;
- actor-to-subject relationship and exact permitted action;
- server-owned tenant/pharmacy scope;
- request, evidence and item lineage;
- current assignment, lifecycle, expiry, revocation and trusted time; and
- applicable Task 11 approval state.

The browser cannot supply a trusted role, tenant, pharmacy assignment, subject relationship, professional decision, state, source version or clock. Patient pharmacy choice remains intent and never changes `PHARMACY_ID`. Unknown roles, relationships, assignments or source ownership deny generically without a sensitive enumeration difference.

Professional acceptance, rejection, refill/renewal/transfer decisions and clarification resolution require the actual authenticated registrant/source defined by Workstream C. AgentRx validates supported references; it never impersonates a pharmacist, borrows a supervisor's identity or generates PASS/FAIL/REJECTED.

## 8. State, concurrency and cancellation behavior

Mutable request/evidence/task projections require a positive `stateVersion`, compare-and-set updates, current source/revision checks, trusted server/database time and deterministic transaction/locking rules approved later. Immutable submissions, source observations, professional references and cancellation consequences retain history. No stale tab, retry, worker or callback overwrites newer truth.

| Cancellation stage | Required proposed behavior | Prohibited consequence |
|---|---|---|
| Before pharmacy acceptance | Accept a safe closure only after current-version and ownership checks. | Do not delete request/evidence history or claim that prescription rejection occurred. |
| After professional review but before preparation | Create/notify the assigned pharmacy queue work and await authoritative acknowledgement. | Do not assume review or pharmacy-system effects reversed. |
| During or after preparation | Create a pharmacist/authorized-pharmacy work item and preserve preparation facts. | Do not infer reversibility, restock, refund, claim reversal or disposal. |
| After release | Revoke future readiness/handoff only through the approved professional/custody rules. | Never assume the product may return to stock or rewrite a release/physical event. |
| After courier pickup | Request an approved intercept/return and enter reconciliation until acknowledged. | Do not promise interception or mark pharmacy custody/receipt. |
| After patient/prior-recipient handoff | Treat cancellation as no longer being a delivery reversal; use approved return/disposal processes. | Do not undo receipt, automatically return stock or create a financial/claim effect. |
| During unknown external outcome | Open/retain reconciliation and block unsafe repeat effects. | No blind retry, guessed success, cancellation completion or terminal-state fabrication. |

Concurrency obligations:

| Race / replay | Fail-closed expectation |
|---|---|
| Duplicate submission | Actor/operation/resource/typed-payload-bound idempotency; same request produces one logical effect, changed payload conflicts, malformed stored replay fails closed. |
| Withdrawal versus acceptance | Serialize current versions. If acceptance may have committed, preserve both facts and reconcile; withdrawal cannot retroactively delete the decision. |
| Cancellation versus preparation | Recheck preparation/source state under the approved transaction boundary; create work rather than infer reversal. |
| Cancellation versus release | Serialize against release/revocation/readiness and preserve actual professional attribution. |
| Cancellation versus courier pickup | Preserve actual holder; acknowledged pickup requires intercept/return handling, not pharmacy-custody fiction. |
| Cancellation versus handoff | Accepted receipt remains physical truth; cancellation cannot become delivery reversal. |
| Stale state version | Reject generically and require a fresh authorized read; no stale overwrite. |
| Unknown external outcome | Retain `UNKNOWN`/reconciliation, query the authoritative owner under a later approved policy, and never retry an uncertain effect blindly. |

Cancellation must never delete the pharmacy record, technical/professional audit evidence, custody evidence, payment evidence or legally retained documentation. Retention and correction require separately approved field-level rules and holds; no duration or deletion trigger is invented here.

## 9. Failure and fail-closed behavior

- Missing, expired, revoked or wrong-audience Task 05 actor-to-subject authority blocks protected request intake; no staff-auth or public-intake fallback is permitted.
- Missing or unsafe evidence storage, integrity/malware status or access authorization leaves evidence unavailable. A technical failure does not become professional rejection.
- Upload/OCR completion, patient or prescriber information, a refill/renewal/transfer selection, a copied record or a clarification response remains unverified evidence and cannot establish prescription validity.
- Missing current pharmacy choice/destination mapping blocks routing without changing `PHARMACY_ID` or forcing the configured pharmacy.
- Missing professional assignment, authority, source version or current acceptance keeps review pending/unknown and blocks inventory, preparation, finance, release, pickup and delivery progression.
- Missing Task 07 runtime means no external notice or improvised communication channel. Notification failure cannot change review, cancellation or professional state.
- Wrong subject/request/evidence/source mapping is contained without reassignment or disclosure; suspected privacy/incident handling remains human-owned under an approved future procedure.
- Stale or contradictory versions are rejected generically. Unknown external commit or acknowledgement opens reconciliation and blocks blind retry.
- Cancellation uncertainty preserves the actual professional, preparation, financial and custody evidence and holder/unknown state; it never fabricates reversal, receipt, return, restock or claim action.
- Public and protected failures expose no prescription/evidence existence, subject/contact data, source-system detail, SQL/stack information or sensitive correlation value.

These failures stop only the affected behavior. Independent documentation may continue, but a missing identity, professional, storage, integration or policy authority cannot be replaced with a permissive synthetic success.

## 10. Audit expectations

A later approved closed audit catalogue may record only minimum necessary opaque request/evidence/work references, actual authorized actor where required, action/outcome/safe reason, source/policy/workflow versions, trusted time and before/after state versions. Accepted state, idempotency result and required audit must share the approved transaction boundary.

Technical audit must not contain OCR text, images, clinical rationale, medication/prescription content, subject/contact/address data, raw provider bodies, payer/payment detail, credentials, arbitrary metadata or evidence digests usable as lookup keys. Professional rationale remains in the authoritative pharmacy/clinical record. Denied-attempt evidence requires its own approved minimized contract; denial must not mutate protected business state or reveal existence.

This document does not modify or extend the protected production audit implementation.

## 11. Privacy constraints

- No clinical content or OCR text in general logs, analytics, technical audit bodies, notification bodies, tracking URLs, courier payloads, technical identifiers, idempotency keys, topics, queue names, correlation keys or metric labels.
- No PHI, contact information, prescription identifiers or reusable credentials in URLs, browser persistence, page titles, referrers, screenshots, errors or public caches.
- Evidence content, future contacts and subject relationships require approved purpose/necessity, per-read authorization, encryption, separate protected storage, retention/hold/deletion and privileged-support controls.
- Future client projections must be strict and minimized; opaque references remain PHI when their linkage reveals care.
- A future synthetic workflow uses only unmistakably fictitious, deterministic, server-owned, non-PHI references after exact scope approval. It cannot call storage, OCR, pharmacy, notification or other vendors.
- Public intake remains zero-PHI and unchanged.

## 12. Production blockers

| Decision | Current status / affected behavior |
|---|---|
| T08-D02–D04/D36/D37 | Exact synthetic scope, lifecycle, Task 01/11 evidence and release review are missing; no runnable prototype. |
| T08-D05/D17 | Prescription-evidence/PMS owner, storage/OCR and acceptance contracts are unresolved; no evidence processing. |
| T08-D06/D14 | Task 05 patient/delegate identity and protected patient access are unavailable; no patient route. |
| T08-D13/D15/D16 | Neutral choice versus singleton tenancy, current accreditation and drug/jurisdiction policy are unresolved; no routing/transfer success. |
| T08-D20 | Professional review, trainee/technician scope and actual registrant authorization remain unapproved. |
| T08-D28–D30 | No integration/vendor, idempotency/reconciliation parameters or Task 08 privacy/security approval exists. |
| T08-D31–D35 | Task 07 runtime, audit catalogue, retention, incidents and accessibility procedures remain blocked or NOT VERIFIED. |

Task 03 ownership remains unresolved; its current command-centre brief cannot be assumed to own evidence. Task 04 expired authority cannot be reused. Task 09 cannot be treated as a finance or PMS engine. No blocker is resolved by this design.

## 13. Future test obligations — not implemented or run

| ID | Later independently required assertion |
|---|---|
| E1-T01 | Strict request schema rejects unknown fields and browser-supplied identity, pharmacy/tenant, role, professional, state, source-version and clock authority. Raw-size enforcement precedes parsing. |
| E1-T02 | Missing/expired/revoked/wrong-audience actor-subject grant, wrong pharmacy/request/evidence lineage and unknown role fail generically with no mutation or enumeration. |
| E1-T03 | Each request type remains a request: upload/OCR/patient/contact/transfer/refill/renewal facts cannot establish professional acceptance, prescription validity or downstream effects. |
| E1-T04 | Required wording is present; restricted success terms appear only when independent authoritative facts and all current guards support them. |
| E1-T05 | Evidence integrity/OCR/human-review dimensions vary independently; unreadable, duplicate, wrong-subject, missing, failed and unknown evidence fail safely without fabricating professional rejection. |
| E1-T06 | AgentRx may flag missing workflow fields but cannot create clinical clarification, answer the prescriber or resolve G03. A response alone does not clear professional uncertainty. |
| E1-T07 | Same-key concurrency creates one submitted request; changed request conflicts; rollback leaves no receipt/task/audit; validated replay returns only the minimized stored response. |
| E1-T08 | Independent transaction barriers cover withdrawal/acceptance and cancellation/preparation/release/courier/handoff races; committed professional and custody evidence is preserved. |
| E1-T09 | Unknown/stale/contradictory source or external outcome enters reconciliation and cannot advance, delete evidence or trigger a blind retry. |
| E1-T10 | Cancellation at each stage preserves required request, pharmacy, audit, custody, payment and retention evidence and causes no automatic restock, refund, claim or physical effect. |
| E1-T11 | Leakage sentinels prove zero PHI/OCR/clinical/contact data in URLs, storage, logs, analytics, errors, notices, identifiers, audit/outbox or courier payloads. |
| E1-T12 | Architecture and no-egress tests reject production imports, retired AI-RX-06 reuse, staff-auth patient reuse and all network/storage/OCR/provider effects. |

## 14. Explicit non-authorization

This document grants **no implementation, professional, regulatory, legal, privacy, security, accessibility, migration, synthetic-runtime, pilot or production authority**. It creates no route, upload, OCR, identity, schema, fixture, test result, pharmacy record, message, external connection or effect. Unknown, stale, contradictory or unauthorized state fails closed. All applicable Task 08 mandatory stop conditions and Task 11 gates remain controlling.
