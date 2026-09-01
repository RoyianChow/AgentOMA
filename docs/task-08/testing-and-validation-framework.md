# Task 08 — Testing and validation framework

**Status:** PROPOSED DESIGN ONLY — NOT IMPLEMENTED, NOT RUN, NOT APPROVED FOR PRODUCTION.

This document defines the testing and validation strategy that would be required before any Task 08 workflow could be considered reliable. It does not create a Task 08 runtime, test suite, synthetic-scope approval, migration, integration, professional decision, regulatory interpretation, or production authorization. A test result, including a technical PASS, cannot grant professional, privacy, security, legal, payer, procurement, migration, integration, or production authority.

The framework is grounded in [AGENTS.md](../../AGENTS.md), the [Task 08 specification](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), and the completed Task 08 design work:

- [current-state and gap analysis](./current-state-and-gap-analysis.md) and [production dependency and decision register](./production-dependency-and-decision-register.md);
- [threat model](./fulfilment-threat-model.md) and [trust-boundary/data-flow design](./trust-boundaries-and-data-flows.md);
- [professional responsibility](./professional-responsibility-matrix.md) and [transition authorization](./role-and-transition-authorization-matrix.md);
- [contract and schema proposal](./fulfilment-contracts-and-schema-proposal.md);
- [request/evidence](./request-and-prescription-evidence-workflow.md), [pharmacy choice](./pharmacy-choice-and-transfer-boundary.md), [orthogonal state](./orthogonal-state-model-and-state-machine.md), [inventory/release](./inventory-preparation-and-release-workflow.md), and [pickup/delivery/return](./pickup-delivery-custody-and-handoff-workflow.md) designs;
- [external integration/reconciliation](./external-integrations-webhooks-and-reconciliation.md), [operational readiness](./operational-readiness-and-observability.md), and [security/privacy](./security-privacy-and-compliance-controls.md) controls.

The “Workstream L” label here identifies this bounded testing-strategy document. It does not replace the Task 08 specification's checkpoints or independently authorize a later runnable synthetic slice.

## 1. Testing principles

1. **Safety over convenience.** A workflow must stop when authority, evidence, scope, freshness, identity, custody, or external finality is missing or contradictory. A convenient fallback is not a safe default.
2. **Fail closed on uncertainty.** Unknown commit outcomes, stale versions, unrecognized events, ambiguous references, missing proof, and unresolved reconciliation cannot advance a protected state.
3. **Negative testing is mandatory.** Every positive transition requires tests for missing, stale, revoked, wrong-scope, contradictory, duplicate, reordered, and unauthorized variants.
4. **Protected states require attributable evidence.** A return value alone is insufficient. Tests must inspect the authoritative committed state, required evidence, version increments, audit outcome, idempotency record, and queued effect where applicable.
5. **External events are observations, not authority.** An authenticated webhook still requires schema, scope, reference, order, version, transition, and reconciliation validation. It cannot directly establish prescription validity, a professional decision, release, receipt, payment finality, a claim, or restock.
6. **Concurrency is part of correctness.** State-version checks, idempotency, locking, transaction isolation, rollback, and reconciliation must be exercised with real competing transactions where persistence exists.
7. **Professional decisions cannot be automated.** Tests may provide a synthetic reference representing an externally supplied professional decision and validate its attribution and workflow effect. They must not have AgentRx infer, recommend, fabricate, or grade the clinical decision.
8. **Orthogonal states remain orthogonal.** Request, prescription evidence, inventory, preparation, professional/release, pickup, delivery, return, custody, financial, exception, and reconciliation states must be varied independently.
9. **Minimized outputs are part of the contract.** Assertions must reject extra fields and sensitive details, not merely check that expected fields exist.
10. **Deterministic evidence beats mirrored assertions.** Fixtures, trusted time, ordering, and failure injection must be controlled. Expected outcomes must come from the documented contract, not from reusing the implementation under test.
11. **Tenant and actor isolation are first-class.** Cross-pharmacy, wrong-subject, wrong-actor, wrong-session, wrong-role, and wrong-package cases must be negative tests. Patient pharmacy choice never supplies `PHARMACY_ID` or tenant authority.
12. **Synthetic evidence is non-transferable.** Synthetic identities, decisions, custody records, and adapter observations cannot represent a real patient, prescription, pharmacy authorization, professional act, inventory fact, payment, claim, or physical handoff.

All future test evidence must identify the exact candidate, environment, configuration version, schema/migration version where applicable, commands, outcomes, and reviewer. No thresholds, clocks, retention periods, vendor semantics, professional policy, or approval dates may be invented by a fixture.

## 2. Test levels

| Level | Proposed scope | Required proof | Boundary |
|---|---|---|---|
| Unit | Closed schemas, pure transition guards, derived `READY`, typed idempotency projections, safe-error mapping, authorization predicates, reference parsing, payload minimization | Deterministic table-driven positive and negative cases; unknown fields and impossible combinations rejected | No database, network, wall-clock dependence, real identity, or professional decision |
| Integration | Proposed PostgreSQL transactions, tenant-safe relationships, concurrency, inbox/outbox, idempotency, reconciliation, audit atomicity, and deny-only adapter coordination | Isolated disposable real PostgreSQL when a persistence design is approved; committed-state assertions; runtime-role access; rollback and connection cleanup | No production database, migration, credential, vendor call, PHI, or mocked money/state rule presented as proof |
| End-to-end | Synthetic request-to-review, preparation/release, pickup, delivery, exception, and return journeys | Browser/server/database assertions across the approved synthetic surface, including accessibility and minimized client state | No real patient, prescription, inventory, courier, payment, claim, notification, or professional authority |
| Security | Authentication/authorization separation, privilege and tenant boundaries, revocation, reference integrity, request size, leakage, audit tampering, architecture boundaries | Adversarial inputs, cross-scope fixtures, secret/PHI sentinels, direct/transitive import checks, generic-denial comparison | No credential harvesting, production scanning, external target, or security-certification claim |
| Operational | Outage, retry, replay, worker/queue failure, database uncertainty, reconciliation backlog, telemetry loss, alerting, restore, and incident rehearsal | Deterministic failure injection, recovery evidence, no duplicate effect, preserved audit/reconciliation, assigned human review | No production monitoring, dashboard, backup, RPO/RTO, retention, alert threshold, or incident-timeline claim |

### 2.1 Evidence quality gates

- Unit tests must assert both accepted output and rejection surface; snapshot-only testing is insufficient.
- Persistence tests must use independent database connections and explicit barriers for genuine races. Sequential promises are not concurrency evidence.
- Assertions must count and scope affected rows so unrelated fixtures cannot satisfy them.
- A successful response must be parsed through the public minimized response schema before storage and again on replay.
- Failure tests must prove zero unauthorized business mutation and no unsafe detail in the outward error. Denied-attempt audit evidence is allowed only under a separately approved minimized audit contract.
- Test clocks must use an injected deterministic clock for pure code or trusted PostgreSQL time for database behavior. Browser time cannot establish authority or expiry.
- Every test must clean up or use an isolated disposable environment. Flaky sleep-based timing and dependence on pre-existing rows are unacceptable.

## 3. State validation tests

The following IDs are proposed obligations, not implemented tests.

| ID | State or transition | Required validation |
|---|---|---|
| L-ST01 | Request submission | A strict valid request may enter the submitted request state once; missing or unknown fields, wrong subject/scope, duplicate changed payload, or unauthorized actor fails with no protected downstream state. Submission is not an order, prescription, claim, payment, release, pickup, or delivery. |
| L-ST02 | Review progression | Evidence receipt, integrity scanning, OCR processing, patient statements, refill/renewal requests, and transfer requests never establish prescription validity. Only a current, attributed, separately authorized professional decision reference can progress the applicable review state. |
| L-ST03 | Preparation progression | Current authoritative inventory confirmation, request/item scope, preparation authority, and state version are required. Estimate-only, unavailable, recalled/quarantined, stale, conflicting, substituted-without-decision, or quantity-mismatched input blocks progression. |
| L-ST04 | Professional and release progression | Technical completion cannot create professional-check PASS, counselling satisfaction, `RELEASE_AUTHORIZED`, or release-derived readiness. Release requires all current item/package guards and an authenticated, attributable authorized professional decision. |
| L-ST05 | Pickup and delivery progression | Release authorization, package-specific recipient authority, custody evidence, and current versions are required. Courier custody, OTP/link/contact possession, payment, a delivered observation, or another package's proof cannot establish receipt. |
| L-ST06 | Return progression | Failed delivery is not receipt. `RETURNED` requires verified physical custody at the correct pharmacy. A delayed return may become `RETURNED` after that receipt; wrong destination or missing receipt blocks it. Return never auto-restocks or creates a claim or financial reversal. |
| L-ST07 | Invalid direct transitions | Reject release without professional approval, delivery/courier transfer without release, receipt without accepted package-specific proof, return without correct-pharmacy receipt, and every unlisted direct edge. Preserve material evidence and return a minimized generic denial. |
| L-ST08 | Derived `READY` | Vary every guard independently. `READY` cannot be manually written and disappears when any required current guard is missing, stale, revoked, wrong-item, wrong-package, wrong-pharmacy, or contradictory. It does not create prescription validity, inventory ownership, release authority, payment, custody, or a claim. |
| L-ST09 | Stale, duplicate, and conflicting transitions | Stale expected versions fail; same-key/same-payload retry yields one logical result; changed payload conflicts; concurrent incompatible transitions have one valid winner; no silent overwrite or partial aggregate persists. |
| L-ST10 | Revocation and supersession | Revoked release, recipient grant, professional authority, pharmacy choice, or evidence cannot authorize later action. Superseded records remain attributable and immutable; revocation does not rewrite a physical event that already occurred. |
| L-ST11 | Exception and unknown vectors | Missing mappings, contradictory orthogonal dimensions, impossible custody, and unknown external finality create or preserve a bounded exception/reconciliation state and block dependent advancement. |
| L-ST12 | Financial isolation | All request, `READY`, payment, adjudication, pickup, delivery, return, and cancellation permutations have zero authority to code, create, submit, reverse, or promise a claim. PINs, fees, and claim maximums are outside Task 08 and may not be invented. |

## 4. Workflow tests

### 4.1 Request and prescription-evidence workflow

| ID | Scenario | Expected validation |
|---|---|---|
| L-W01 | Valid synthetic request | Accepted only as a request for review, with explicit reversible pharmacy choice and server-owned tenant scope kept separate; no prescription or fulfilment authority is created. |
| L-W02 | Incomplete request | Missing required workflow prerequisites produce a bounded clarification/incomplete result without clinical inference or enumeration. |
| L-W03 | Cancellation by stage | Before acceptance, during review/preparation, after release, after courier pickup, after receipt, and while external state is uncertain follow the stage-specific rules; cancellation never erases evidence or invents reversal, restock, refund, or claim effects. |
| L-W04 | Clarification | AgentRx may identify missing workflow prerequisites and record an attributed response; it cannot answer a prescriber question, resolve clinical uncertainty, or make a therapeutic decision. |
| L-W05 | Missing, invalid, or conflicting evidence | Missing, unreadable, forged, wrong-subject, wrong-pharmacy, superseded, or contradictory evidence blocks professional acceptance. Technical validation failure does not fabricate a professional rejection. |
| L-W06 | Four request types | `NEW_PRESCRIPTION_REVIEW`, `REFILL_REVIEW`, `RENEWAL_REVIEW`, and `TRANSFER_REVIEW` retain separate prerequisites and never infer acceptance, renewal, transfer, or therapy outcomes. Unknown type fails closed. |

### 4.2 Inventory, preparation, professional, and release workflow

| ID | Scenario | Expected validation |
|---|---|---|
| L-W07 | Inventory unavailable, stale, or conflicting | Estimate remains informational; confirmation is pharmacy-authoritative. Unavailable, changed, expired, recalled/quarantined, wrong-item, wrong-pharmacy, quantity-mismatched, or contradictory facts block dependent progression. |
| L-W08 | Preparation failed or incomplete | Failure/incompletion retains evidence and cannot create technical-check success, professional approval, release, pickup, delivery, or patient receipt. |
| L-W09 | Missing professional authorization | Wrong role, session, pharmacy assignment, subject/request relationship, action, registration evidence, expiry, revocation, or approval lifecycle fails closed. Existing assessment permissions are not dispensing or release authority. |
| L-W10 | Failed professional check | An attributed externally supplied FAIL blocks release; AgentRx validates the supported record but does not generate the outcome or expose clinical rationale in technical surfaces. |
| L-W11 | Revoked approval or release | A committed revocation invalidates future dependent readiness and handoff, preserves original/revocation evidence, and cannot rewrite an already completed physical transfer. |
| L-W12 | Missing release and readiness guards | Independently omit each applicable G12 professional release guard, including professional check, counselling requirement, current inventory, preparation/technical evidence, applicable item-specific storage/integrity evidence, or current version; the pharmacy-owned `RELEASE_AUTHORIZED` decision and therefore `READY` remain blocked. Separately omit each additional fulfilment-readiness guard, including the applicable recipient authorization, fulfilment plan, address, assignment, or downstream handoff prerequisite; `READY` and handoff remain blocked, but the missing downstream guard does not invalidate or prevent an otherwise valid independent professional `RELEASE_AUTHORIZED` decision. |
| L-W13 | Multi-item storage/security | A package with complete, current, non-contradictory item-specific requirements may reach only the applicable non-professional validation stage. Missing/stale/mismatched requirements block; one item/package/pharmacy requirement cannot satisfy another. Combined handling suitability remains a pharmacy-owned decision. |

### 4.3 Pickup, delivery, custody, and return workflow

| ID | Scenario | Expected validation |
|---|---|---|
| L-W14 | Valid synthetic pickup | Current release, package-specific recipient authorization, applicable counselling, proof, custody, pharmacy scope, and versions produce one synthetic handoff record; no claim/payment/dispensing effect. |
| L-W15 | Invalid or missing recipient authority | Wrong, unknown, revoked, expired, or missing recipient/delegate authority and sole-factor OTP/link/contact/DOB/address possession fail generically. Patient, delegate, authorized recipient, and courier remain distinct. |
| L-W16 | Failed or expired pickup | No-show, failed verification, revoked release, expired window, or uncertain proof leaves pharmacy custody and preserves exception evidence. It cannot become receipt. |
| L-W17 | Successful synthetic delivery | Requires current release, assigned package/courier observation, internal custody chain, authorized recipient, and accepted package-specific proof. This is a synthetic state exercise, not proof of a real delivery. |
| L-W18 | Failed/wrong-recipient delivery | Failure, wrong or unknown recipient, missing authorization, tamper/damage/temperature exception, or missing proof cannot become receipt/delivered completion. |
| L-W19 | Duplicate courier event and missing proof | Duplicate/replayed/out-of-order courier observations deduplicate or reconcile; a provider “delivered” event without accepted proof remains unresolved and creates no protected completion. |
| L-W20 | Multi-package proof | Package A proof cannot complete package B or the whole plan. Partial or unknown proof fails closed; plan completion derives only after every applicable package has accepted proof or a separately approved package-specific exception. |
| L-W21 | Delayed, wrong-destination, and missing-receipt return | Delay evidence is preserved; verified later receipt at the correct pharmacy may establish `RETURNED`. Wrong destination or missing verified pharmacy receipt cannot. Disposition stays pending until separately decided. |

## 5. Integration tests

These are proposed adapter and persistence tests. They must use deterministic no-network doubles until exact synthetic scope is approved; they cannot validate a real vendor or production contract.

| ID | Integration case | Required validation |
|---|---|---|
| L-I01 | Invalid webhook | Enforce method, content type, raw-byte limit before parsing, authentication/integrity where applicable, timestamp/replay window, environment/account, event type/version, server-owned pharmacy, referenced object, transition, and semantic combination. Invalid input has zero protected effect. |
| L-I02 | Duplicate and replayed webhook | Same provider event and digest yields at most one durable receipt/processing effect; same event ID with different bytes conflicts; replay cannot duplicate audit, outbox, custody, payment, inventory, or workflow effects. |
| L-I03 | Out-of-order or stale event | Preserve receipt/evidence, reject state regression, and enter bounded reconciliation where needed. Do not overwrite newer internal truth. |
| L-I04 | Unknown event or mismatched reference | Unknown type/version/provider object, wrong environment/account/pharmacy/package/payment/resource, or ambiguous mapping fails closed and cannot enumerate internal records. |
| L-I05 | Protected-state non-authority | Parameterize every adapter observation to prove it cannot directly establish prescription validity, professional decision, counselling, release, recipient identity, receipt, payment finality, claim, return disposition, or restock. |
| L-I06 | Reconciliation | Exercise missing event, conflicting state, delivered-without-proof, proof-without-event, payment mismatch, inventory mismatch, unknown commit, and dependency outage. No discrepancy is silently closed or discarded. |
| L-I07 | Inbox/outbox and audit atomicity | Exercise the established two-stage durability model where later approved. **Stage 1:** durably persist the external webhook receipt as a minimized validated inbox observation before domain processing. **Stage 2:** in a later transaction, atomically commit the accepted local state changes, idempotency result, required audit record, receipt-processing revision, and any undispatched outbox record. Initial external-receipt durability and later domain-processing atomicity are separate stages; the test must not imply that webhook receipt and domain processing occur in one transaction. Required evidence failure rolls back the later local acceptance, not the already durable initial receipt. |
| L-I08 | Money separation | Adjudication/payment accept, reject, reverse, refund, dispute, duplicate, and timeout have zero claim, release, pickup, delivery, receipt, or restock authority. Money-rule proof requires real isolated PostgreSQL, not mocks, if such rules enter scope. |
| L-I09 | PMS/prescription and inventory adapters | Imported source facts cannot create prescription validity, professional acceptance, substitution, preparation, release, `READY`, claim, or restock without the separately approved owner and evidence contract. |
| L-I10 | Communications adapter | Task 07-compatible notice intent remains minimized and non-authoritative; no prescription/OCR/clinical/payment content, tracking secret, recipient grant, or protected-state mutation enters the notification payload. |

## 6. Security tests

| ID | Security case | Required validation |
|---|---|---|
| L-S01 | Unauthorized access | Missing/invalid session, wrong audience/action/subject/resource, and inaccessible reference return the same bounded generic result and make no protected mutation. |
| L-S02 | Privilege escalation | Patient, delegate, recipient, courier, support, administrator, technician, intern, student, system process, webhook, and worker cannot silently gain pharmacist/professional authority. Unknown roles fail closed. |
| L-S03 | Revoked or expired access | Revoked/expired session, capability, assignment, approval, recipient grant, release, synthetic scope, or lifecycle is rechecked at every protected boundary using trusted time. |
| L-S04 | Tenant and pharmacy isolation | Cross-pharmacy reads/writes/references fail; browser, patient choice, QR, session payload, webhook, or URL cannot choose tenant scope. The server-only `PHARMACY_ID` invariant remains intact. |
| L-S05 | Reference and request abuse | Opaque references resist tampering, substitution, ambiguity, cross-purpose use, and readable internal IDs. Raw-byte limits precede parsing; unknown fields and arbitrary metadata are rejected. |
| L-S06 | Sensitive-data leakage | Distinct synthetic sentinels for identity, contact/address, prescription/OCR/clinical, payer/payment/claim, package/proof/location, credentials/tokens, and internal IDs are absent from prohibited outputs and technical surfaces. |
| L-S07 | Insecure logging and telemetry | Logs, traces, metrics/labels, dashboards, alerts, URLs, queue/topic names, correlation/idempotency keys, errors, analytics, support artifacts, and screenshots reject prohibited content and high-cardinality sensitive labels. |
| L-S08 | Audit tampering | Unauthorized update/delete, impossible actor/action/outcome/state combinations, extra fields, and sensitive payloads fail. Required audit-control failure prevents the associated accepted local transition. Governed destruction requires separately approved authority and evidence. |
| L-S09 | Invalid state mutation | Direct database/API attempts to write derived, professional, custody, financial, or reconciled state without the required authoritative path fail closed. |
| L-S10 | Architecture and egress | Direct and transitive client imports of server configuration, database, credentials, authorization, decision, integration, and complete-record modules fail. Production imports, external SDKs/calls, and Task 04 authority reuse fail hard. |

Security testing demonstrates behavior of an exact candidate only; it is not a penetration-test certification, privacy approval, professional approval, or compliance attestation.

## 7. Concurrency tests

When a later approved design persists these workflows, the database cases below require disposable real PostgreSQL, independent connections, deterministic barriers, trusted database time, and assertions over committed state. Application-only promises, mocks, or sequential calls are not sufficient evidence.

| ID | Race | Required invariant |
|---|---|---|
| L-C01 | Cancellation vs preparation | One version-valid transition wins; cancellation and acknowledged preparation evidence remain attributable; no silent deletion, release, refund, restock, or claim is inferred. |
| L-C02 | Preparation vs release | Release rechecks preparation, inventory, professional, counselling, storage, item/package, authority, and version guards under the approved lock order. Stale preparation cannot release. |
| L-C03 | Release/revocation vs pickup | A committed revocation prevents future handoff; a completed physical transfer is not rewritten. Unknown ordering enters reconciliation rather than guessing custody. |
| L-C04 | Delivery/failure vs return | Failed delivery cannot race into receipt; return requires correct-pharmacy custody evidence. Competing courier/return events preserve both observations and reconcile one valid state. |
| L-C05 | Duplicate commands/events | Same-key/same-projection creates one logical effect; changed projection conflicts; malformed replay fails closed; duplicate webhook/worker/courier events cannot duplicate evidence or protected state. |
| L-C06 | Webhook retries and unknown commit | Proven rollback may retry safely; uncertain external or database outcome must reconcile before retry. Expiry of a local idempotency window cannot make an external effect safe to repeat. |
| L-C07 | Inventory change vs preparation | A source-version change makes the prior confirmation/reservation stale and removes dependent readiness; no oversell, substitution, or quantity inference. |
| L-C08 | Professional check vs release | Release cannot observe a partial or superseded decision. Actual actor attribution and revocation evidence persist; AgentRx never supplies the decision. |
| L-C09 | Multi-item/package updates | Locks and scoped versions prevent one item, package, storage requirement, recipient grant, or proof from satisfying another. Partial aggregate state cannot be exposed as complete. |
| L-C10 | Reconciliation resolution vs new contradiction | A stale resolver cannot close a newer discrepancy; versioned append-only evidence preserves both the attempted resolution and the new observation. |

Every race test must verify state versions, typed idempotency scope and fingerprint, append-only evidence, required audit/outbox atomicity, reconciliation status, rollback, connection cleanup, and the absence of duplicate effects.

## 8. Privacy tests

### 8.1 Prohibited-surface sentinel suite

Use unmistakably synthetic, category-specific sentinels and assert that sensitive data does not appear in:

- browser persistence, URLs, query parameters, fragments, cookies, page metadata, client props beyond the approved minimum, or caches;
- logs, traces, analytics, metrics/labels, dashboards, alerts, error bodies, stack output, screenshots, support tickets, or correlation labels;
- identifiers, opaque-reference plaintext, idempotency keys, event/topic/queue names, filenames, object keys, or notification routing labels;
- technical audit bodies, outbox payloads, courier payloads, notification bodies, or arbitrary metadata.

Sentinel categories must include names and identity data; addresses and contact data; health-card and prescription identifiers; prescription/OCR/clinical content; product/medication content; professional rationale; payment/payer/claim details; raw handoff/signature/photo/identity-document/biometric/exact-location data; credentials, tokens, secrets, and internal database IDs.

### 8.2 Privacy cases

| ID | Privacy case | Required validation |
|---|---|---|
| L-P01 | Minimum necessary response | Strict public, patient, staff, courier, support, audit, notification, and vendor projections reject extra fields and expose only the approved purpose-specific minimum. |
| L-P02 | Access restriction | Direct object/reference access is tested across actor, subject, delegate/recipient, role, pharmacy, session, action, package, and purpose. Authorization is rechecked rather than inferred from reference possession. |
| L-P03 | Unauthorized disclosure and enumeration | Unknown and inaccessible objects have indistinguishable safe errors, timing/cache treatment where feasible, and no internal reason, scope, actor, contact, or existence signal. |
| L-P04 | Excessive collection | Schema and UI contract tests reject unapproved identity documents, biometrics, facial images, raw signatures, photos, exact geolocation, free text, arbitrary metadata, and unnecessary proof content. |
| L-P05 | Retention and destruction boundary | Approved schedules, holds, evidence lineage, backup behavior, and governed destruction are tested only after record owners approve them. No test invents a retention duration or deletes material evidence to satisfy cleanup. |
| L-P06 | Tracking and third parties | No unapproved analytics, tracking pixels, third-party fonts/scripts, SDKs, vendor recipients, or external network requests appear in the synthetic candidate. |
| L-P07 | Accessibility and privacy | Accessible alternatives do not disclose more data, weaken authorization, require public PHI, or turn sole-factor contact/link/OTP possession into recipient authority. |

## 9. Synthetic testing boundaries

### 9.1 Permitted only after exact approval

A future runnable synthetic slice may use deterministic, visibly synthetic:

- actor, subject, delegate/recipient, pharmacy, professional, courier, package, request, item, evidence, payment, inventory, event, and reconciliation references;
- records containing no real name, contact detail, health number, prescription number, medication, address, payer credential, tracking secret, or PHI;
- fixed clocks, non-secret fixture keys, controlled failure cases, deny-only adapters, and isolated disposable local infrastructure;
- synthetic professional-decision **references** that exercise attribution and gates without asking AgentRx to create or assess the decision.

Before any runnable synthetic implementation, the exact candidate, files, environment variables, network prohibition, database isolation, fixture set, expiry/revocation, commands, evidence capture, destruction plan, and rollback must receive explicit synthetic-scope approval and the applicable Task 11 checkpoint approval. A prior or expired Task 04 approval, fixture, credential, capability, database, or role cannot authorize Task 08.

### 9.2 What synthetic testing cannot establish

Synthetic results cannot establish:

- a real patient, delegate, recipient, courier, registrant, pharmacy assignment, accreditation, prescription, professional decision, counselling act, inventory fact, preparation, release, custody transfer, receipt, return, restock, adjudication, payment, claim, notification, or vendor acknowledgement;
- Ontario legal or regulatory compliance, professional scope or competence, accessibility conformance, privacy approval, security certification, records approval, procurement approval, payer approval, or production readiness;
- real vendor authentication, availability, ordering, finality, retries, retention, incident response, or exit behavior.

Production-shaped identifiers, credentials, datasets, databases, network endpoints, imports, SDKs, and external recipients remain prohibited. No real PHI or prescription data may be introduced.

## 10. Traceability model

Every future test record must maintain this chain:

> **Requirement → Risk → Control → Test → Evidence → Reviewer decision**

The reviewer decision is separate from execution status. A PASS means only that the exact candidate met the stated assertion in the recorded environment.

| Requirement/design source | Principal risk | Proposed control | Proposed tests |
|---|---|---|---|
| Workstream B: [threat model](./fulfilment-threat-model.md) R01–R06 | Evidence becomes prescription; wrong actor/subject/pharmacy; role escalation; manipulated choice | Evidence non-authority, strict scope/authorization, reversible neutral choice | L-ST01–L-ST02, L-W01–L-W06, L-S01–L-S04 |
| Workstream B R07–R10 and Workstream G: [inventory/release](./inventory-preparation-and-release-workflow.md) | Estimate, preparation, technical check, or system inference creates release | Authoritative confirmation, separate professional gate, guard re-evaluation | L-ST03–L-ST04, L-W07–L-W13, L-C02/L-C07/L-C08 |
| Workstream B R11–R13 and Workstream D: [contracts](./fulfilment-contracts-and-schema-proposal.md) D20–D23 | Estimate/payment/fulfilment creates a claim or promised outcome | Orthogonal financial state; claim boundary outside Task 08 | L-ST12, L-I08, L-P01/L-P06 |
| Workstream B R14–R20 and Workstream H: [pickup/delivery](./pickup-delivery-custody-and-handoff-workflow.md) | Wrong recipient, courier event becomes receipt, unsafe return/restock | Package-specific authority/proof, explicit custody, correct-pharmacy return evidence | L-ST05–L-ST06, L-W14–L-W21, L-C03–L-C04/L-C09 |
| Workstream B R21–R23 and Workstream I: [integrations](./external-integrations-webhooks-and-reconciliation.md) | Races, retries, webhook spoof/replay, unknown finality | Versioning, typed idempotency, durable receipt, reconciliation, no blind retry | L-ST09/L-ST11, L-I01–L-I10, L-C01–L-C10 |
| Workstream B R24–R28 and Workstream K: [security/privacy](./security-privacy-and-compliance-controls.md) | Leakage, insider/vendor misuse, enumeration, audit/retention failure | Minimized closed schemas, least privilege, generic errors, evidence separation | L-S01–L-S10, L-P01–L-P07 |
| Workstream B R29 | Inaccessible workflow causes unsafe bypass or disclosure | Accessible alternatives with equivalent authority and privacy guards | L-P07 plus future synthetic E2E keyboard, focus, semantics, status, error, zoom/reflow, and small-viewport cases |
| Workstream B R30 | Synthetic work is mistaken for production authority | Exact time-bounded approval, no production imports/egress, non-transferable fixtures | L-S10 and Section 9 approval-boundary tests |
| Workstream C: [responsibility](./professional-responsibility-matrix.md) and [transition authorization](./role-and-transition-authorization-matrix.md) | AgentRx or an unverified role makes a professional decision | Attributable external decision references; fail-closed role mapping | L-W09–L-W12, L-S01–L-S03, L-C08 |
| Workstream D: [contracts/schema proposal](./fulfilment-contracts-and-schema-proposal.md) | Loose fields, unsafe cardinality, stale evidence, persistence mismatch | Closed schemas, item/package-scoped relationships, versioned immutable evidence | L-ST08–L-ST11, L-W13/L-W20, L-S05/L-S09, L-C09 |
| Workstream E: [request/evidence](./request-and-prescription-evidence-workflow.md) and [choice](./pharmacy-choice-and-transfer-boundary.md) | Request/transfer/OCR gains authority; choice changes tenancy | Explicit request boundary, evidence-only processing, server-owned tenant | L-W01–L-W06, L-S04 |
| Workstream F: [orthogonal state model](./orthogonal-state-model-and-state-machine.md) | Universal status hides missing guards or contradictory truth | Independent machines, derived `READY`, versioned transitions, UNKNOWN | L-ST01–L-ST12, L-C01–L-C10 |
| Workstream J: [operational readiness](./operational-readiness-and-observability.md) | Failure/recovery silently changes state or loses evidence | Failure injection, alerts without authority, replay/recovery controls | L-I06–L-I07, L-C06/L-C10, proposed operational-level exercises in Section 2 |

Trace records must cite the exact requirement and control version. If a design changes, affected tests and evidence become stale until revalidated; passing unrelated tests cannot satisfy the changed requirement.

## 11. Ownership

| Owner/reviewer class | Testing responsibility | Must not be treated as authority for |
|---|---|---|
| Engineering | Implement deterministic tests; verify schemas, transactions, concurrency, idempotency, retries, reconciliation, minimization, runtime-role behavior, accessibility mechanics, and recovery | Professional/clinical decisions, legal interpretation, privacy approval, vendor finality, production promotion |
| Pharmacy/professional reviewers | Validate professional workflow, attribution, checking/counselling/release/revocation responsibilities, exception handling, and safe operational language | Test implementation, security approval, privacy policy, or production infrastructure approval by themselves |
| Privacy and security reviewers | Validate minimum-necessary fields, disclosure surfaces, access/revocation, cryptographic/security design, logging/telemetry, vendor privacy, incident and test-data controls | Professional judgment, payer/claim rules, or accessibility approval |
| Accessibility reviewer and affected-user validation | Validate keyboard, focus, semantics, feedback, reflow, assistive-technology and accessible-alternative behavior | Weakened identity/authorization/privacy controls or professional decisions |
| Integration/vendor owner | Validate actual supported contract, source authority, authentication, finality, retry/reconciliation, retention, incident and exit semantics | Internal professional decisions, receipt, claim, or production approval beyond that contract |
| Finance/payer owner | Validate estimate/adjudication/payment/claim separation and approved financial finality | Release, custody, receipt, professional decision, or unapproved billing rule |
| Records/governance owner | Approve retention, legal hold, evidence preservation, governed destruction, audit access/export, and restore implications | Clinical/professional decisions or technical security acceptance alone |
| Product/coordinator | Own scope and unresolved cross-task decisions; authorize a precisely bounded synthetic candidate when appropriate | Regulatory, professional, privacy, security, payer, vendor, or independent release approval |
| Task 11 independent reviewer | Evaluate candidate-bound evidence at the applicable checkpoint and release gate | Inventing missing policy, professional decisions, or upstream dependency approval |

No owner may self-approve all layers. Engineering PASS, pharmacy workflow acceptance, security review, and Task 11 release evidence remain distinct.

## 12. Production blockers and unresolved decisions

| Blocker | Current status | Blocks |
|---|---|---|
| No Task 08 runtime or automated test suite exists | Confirmed by the completed current-state review; this document does not change it | Test execution and every runtime/release claim |
| Exact Task 08 synthetic candidate/scope/lifecycle approval | NOT GRANTED by this document; Task 04 authority is non-transferable | Any runnable synthetic Task 08 code, tests requiring new runtime/infrastructure, fixture authority, or evidence claim |
| Task 03 prescription-source and professional record ownership | Unresolved/blocked in the dependency register | Prescription evidence integration, authoritative prescription review, PMS behavior |
| Task 05 patient/delegate/recipient identity and authorization | Unresolved/blocked | Patient authentication, delegation, recipient authority, production pickup/delivery access tests |
| Task 07 communications contract/runtime | Unresolved/blocked | Real notification, secure-message, routing, receipt, or patient tracking tests |
| Task 09 adjudication/payment/financial ownership and finality | Unresolved/blocked | Real price, payer, adjudication, payment, refund, reconciliation, or claim-boundary integration tests |
| Ontario source verification and professional policy | NOT VERIFIED or reviewer-controlled as recorded in Workstream A | Production professional, prescription, preparation, counselling, release, delivery/return, and policy conformance claims |
| Inventory, PMS, courier, payment, address, accreditation, tracking and other vendor contracts | No approved production integration exists | Network contract tests, vendor finality, production reconciliation and operational readiness |
| Privacy, security, retention, audit, incident, accessibility and procurement decisions | Pending applicable owners; no values may be invented | Affected synthetic stage where required and all production promotion |
| Schema/migration and production authentication authority | Not granted | Any Task 08 schema/migration, production data path, or authentication change |
| Task 11 checkpoints and independent release evidence | Required and not granted by this document | Applicable runnable synthetic checkpoint and every production/release decision |

Only blockers applicable to the affected slice and stage must be resolved before that slice proceeds. Independent documentation/design can continue while production-only dependencies remain blocked. Runnable synthetic implementation still requires exact synthetic-scope and applicable Task 11 approval; production-only approval cannot be inferred from synthetic evidence.

## 13. Explicit non-authorization

This document grants **no implementation approval, testing approval, test execution, synthetic-scope approval, migration or schema authorization, authentication change, infrastructure use, external connection, vendor integration, professional decision, regulatory/legal interpretation, privacy/security/accessibility approval, production readiness, release approval, or production authorization**.

No Task 08 automated test is created, run, or passed by this document. No Task 08 runtime, production integration, patient identity runtime, PMS/OCR/inventory/courier/payment/notification connection, professional verification, physical effect, financial effect, claim, or dispensing effect is asserted to exist. Unknown, stale, contradictory, unauthorized, or unverified state remains fail-closed.
