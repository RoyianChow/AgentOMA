# Task 08 — Pickup, delivery, custody, and handoff workflow

**Status: WORKSTREAM H DOCUMENTATION / PROPOSED DESIGN ONLY. No runtime, schema, migration, identity grant, professional decision, physical handoff, courier connection, external effect, or production authority.**

## 1. Scope and reading boundary

This document defines the proposed workflow after pharmacy-owned release authorization. It must be read with [AGENTS.md](../../AGENTS.md), the full [Task 08 specification](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), and completed Workstreams A–G:

- [Current state and gap analysis](current-state-and-gap-analysis.md), [Ontario standards and policy mapping](ontario-fulfilment-standards-and-policy-mapping.md), and [production dependency and decision register](production-dependency-and-decision-register.md).
- [Fulfilment threat model](fulfilment-threat-model.md) and [trust boundaries and data flows](trust-boundaries-and-data-flows.md).
- [Professional responsibility matrix](professional-responsibility-matrix.md) and [role and transition authorization matrix](role-and-transition-authorization-matrix.md).
- [Fulfilment contracts and schema proposal](fulfilment-contracts-and-schema-proposal.md).
- [Request and prescription-evidence workflow](request-and-prescription-evidence-workflow.md) and [pharmacy-choice and transfer boundary](pharmacy-choice-and-transfer-boundary.md).
- [Orthogonal state model and state machine](orthogonal-state-model-and-state-machine.md) and [inventory, preparation, professional-check, and release workflow](inventory-preparation-and-release-workflow.md).

The coordinator calls this bounded document **Workstream H**. The full Task 08 specification labels its financial boundary Workstream H and its related pickup and delivery sections Workstreams I and J. This document does not complete or rename those specification workstreams: it consolidates only the requested post-release design and creates no financial-boundary deliverable.

Four categories remain distinct:

1. **CURRENT:** the root application has staff authentication, zero-PHI public intake, clinical assessment, advisory claim drafts, follow-up documentation, and governed records. It has no Task 08 pickup, delivery, package, recipient, courier, proof, return, or stock-disposition runtime.
2. **EXISTING SYNTHETIC / EXPERIMENTAL:** Task 01 isolation and Task 04 booking/capability/transaction patterns are study material only. Task 04 authority expired and its renewal remains DRAFT — NOT GRANTED; booking confirmation is not professional release or medication custody.
3. **PROPOSED TASK 08 DESIGN:** every state, actor, evidence item, control, and test obligation below. None is implemented or approved.
4. **PRODUCTION-BLOCKED:** real patient/delegate/recipient identity, pharmacy release, pickup, courier booking/transport, delivery, proof collection, return, external notification, and vendor integration.

The governing sequence is:

```text
RELEASE_AUTHORIZED
        |
        v
PICKUP HANDOFF OR ASSIGNED-COURIER CUSTODY
        |
        v
PATIENT OR PRE-AUTHORIZED RECIPIENT RECEIPT
```

These are separate facts. `RELEASE_AUTHORIZED` is an attributable professional decision, not READY or physical transfer. Pharmacy-to-courier transfer establishes courier custody only. Patient or pre-authorized-recipient receipt requires accepted, package-specific proof. AgentRx may validate supported references and completeness; it never creates professional, identity, physical-custody, financial, or claim truth.

## 2. Common authority and evidence controls

Every future protected read or transition must independently derive and verify server-side:

- current session and audience;
- actual actor, intended subject, actor-to-subject relationship, and exact action;
- server-owned pharmacy/tenant scope—patient choice, URL, QR, session, provider, or courier input never selects `PHARMACY_ID`;
- current staff, recipient, courier, plan, request, item, package, and attempt assignments as applicable;
- current professional release, counselling, product/inventory, preparation, integrity, storage, mode, plan, address, recipient, any independently owned payment-policy requirement where applicable, cancellation, exception, and reconciliation guards;
- trusted server/database time, applicable policy/source versions, local `stateVersion`, lifecycle approval, and Task 11 gate; and
- strict type, scope, lineage, version, expiry, revocation, and provenance for every reference.

Unknown, missing, expired, revoked, stale, contradictory, wrong-scope, or externally uncertain facts fail closed. A reference, screen, QR code, pickup code, phone number, email, OTP, date of birth, address, link, vendor signature, scan, or webhook is never sufficient authority by possession alone. The exact identity, signature, exception, storage, route, window, retry, and retention policies remain **PENDING** with their approved owners.

No transition in this document creates, codes, submits, reverses, or implies a claim; changes a PIN, fee, or maximum; establishes prescription validity; authorizes dispensing; or creates a payment/financial effect. Existing protected clinical, billing, audit, governance, retention, authentication, database, and reference-data behavior remains outside this slice.

## 3. Pickup workflow

### 3.1 State and condition mapping

The exact Workstream F pickup states remain authoritative. Requested workflow phrases are mapped rather than introduced as competing mutable states.

| Workflow phrase | Exact orthogonal state or condition | Meaning and fail-closed rule |
|---|---|---|
| Pickup not planned | `NOT_PLANNED` | No current pickup plan; no readiness, recipient, or handoff is implied. |
| Pickup planned | `PLANNED` | A current pharmacy-owned plan exists; release/readiness and recipient verification remain independent. |
| Ready for pickup | `READY_FOR_PICKUP` | Derived only from global READY plus current pickup-plan, package, recipient, counselling, window, integrity, and no-blocker guards. It is never manually set. |
| Recipient verification pending | Guard condition, not a new pickup state | The plan/package remains `PLANNED` or `READY_FOR_PICKUP` only if otherwise supported, but handoff is blocked until the current recipient grant, identity method/result, and proof prerequisites pass. |
| Picked up | `PICKED_UP` | Patient or pre-authorized recipient physically took the exact package and the pharmacy accepted package-specific proof. A scan or staff checkbox alone cannot create it. |
| Failed pickup | `FAILED` | No-show, wrong/unknown recipient, failed verification/proof, integrity issue, or another supported failure. It is not receipt. |
| Expired pickup | `EXPIRED` | The approved pickup window/plan expired. No restock, refund, disposal, re-dispensing, or claim effect follows. |
| Return initiated | Return `REQUESTED`, not a pickup state | A separately authorized return path has begun; holder/custody remains the last supported physical truth until evidence changes it. |

Valid direct pickup edges remain `NOT_PLANNED → PLANNED`; `PLANNED → READY_FOR_PICKUP | FAILED | EXPIRED`; and `READY_FOR_PICKUP → PICKED_UP | PLANNED | FAILED | EXPIRED`. A failed or expired plan needs a new approved revision before `PLANNED`. `PICKED_UP` is immutable physical history; correction or dispute appends evidence and reconciliation rather than regressing the state.

### 3.2 Pickup lifecycle responsibilities

| Stage | Responsible conceptual actor | Required evidence and authorization | Audit and concurrency |
|---|---|---|---|
| Create or revise plan | Authorized pharmacy operations actor under an approved current role mapping; professional owner supplies any required policy decision | Exact request/package, current release/counselling, pickup mode, location/window, recipient-authorization plan, integrity/storage requirements, assignment, policy/source versions | Append plan revision; compare-and-set plan/package versions; audit only opaque plan/action/version references. No current runtime role is granted by this document. |
| Derive ready for pickup | AgentRx coordination validator only | Every global READY guard plus current package-specific plan, release, recipient, window, counselling, integrity, storage, exception, cancellation, and reconciliation fact | Derived projection binds consumed versions and is removed when any guard changes. No independent READY command or audit claim of professional judgment. |
| Verify recipient | Authorized pharmacy handoff actor under an approved procedure; Task 05 would supply identity/relationship facts | Exact patient or pre-authorized recipient, current action-specific grant, approved identity-check method and safe result, package/plan/request/pharmacy scope, trusted time, expiry and revocation | Serialize recipient grant/revocation, release/revocation, plan/package and handoff attempt. Audit outcome/reference only—no identity details or reason disclosure. |
| Satisfy counselling/consultation | Actual authorized professional under G11 | Current counselling requirement and accepted satisfaction/approved arrangement reference for the exact item/package; Task 07 delivery/read status is insufficient | Preserve actual professional attribution and source version. No counselling content in technical audit. |
| Transfer package | Authorized pharmacy handoff actor and patient/pre-authorized recipient | Current release, package manifest and integrity; accepted recipient verification; any separately governed payment-policy requirement where applicable; exact package-specific proof; supported handoff time; no blocker | One accepted physical transfer per package/custody version. Proof for package A cannot transfer package B. Required state, proof acceptance, and minimized audit commit atomically where later approved. Payment remains separate and never creates release, receipt, or claim authority. |
| Handle no-show/failure/expiry | Assigned pharmacy workflow; professional owner for any required exception/recheck | Preserve pharmacy custody, failure/expiry evidence and current package state; create an approved work item; recheck release, counselling, product/integrity/storage, price/payment policy, recipient and window before a new plan | Append failure/expiry and later plan revisions. No last-write-wins success, deletion, automatic refund/restock/destruction, or notification bypass. |

The patient may receive a future ready notice only after current professional release, secured pharmacy custody, counselling/consultation arrangements, current pickup location/window, and absence of cancellation, revocation, storage, integrity, recall, or reconciliation blockers. Any notice would use Task 07's separately approved generic contract; it cannot authorize access, pickup, or receipt.

Excluded models remain blocked: unattended lockers, third-party retail collection, remote dispensing locations, automated pharmacy systems, delivery-agent collection represented as patient pickup, and curbside handoff without separately approved professional and custody procedures.

## 4. Recipient authorization

Patient, initiating actor, delegate, authorized recipient, and courier are distinct:

| Concept | Proposed boundary |
|---|---|
| Patient subject | Person for whom the request/medication is being handled; not necessarily the actor or recipient. No integrated Task 05 patient identity exists. |
| Authorized delegate/actor | Person authorized for a specific action on behalf of the subject. Request/view authority does not automatically include receipt authority. |
| Authorized recipient | Patient or separately pre-authorized person permitted to receive a specific package/request under the pharmacy's approved procedure. The grant is action-, request-, pharmacy-, and time-scoped. |
| Courier | Assigned transport actor only. Never the patient's agent, recipient-authority issuer, pharmacist, or source of professional/claim truth. |

The minimum conceptual recipient authorization evidence is server-only and includes:

- opaque authorization/grant reference;
- opaque patient-subject reference;
- opaque authorizing-actor reference and actor-to-subject relationship reference;
- opaque intended-recipient reference, with recipient type `PATIENT` or `PRE_AUTHORIZED_AGENT`;
- exact request, package where applicable, pharmacy, and receiving-action scope—no wildcard;
- effective and expiry times from trusted time;
- capture method and provenance references under an approved procedure;
- pharmacy confirmation reference where required;
- current source/version and revocation state; and
- approved audit/decision references without raw identity evidence.

Phone number, email, OTP, link possession, date of birth, address, screen, QR code, pickup code, caller assertion, or courier statement cannot establish authority alone. For a patient recipient, future Task 05 evidence must bind recipient to subject. For an agent recipient, prior independent authorization is mandatory. A recipient grant cannot change pharmacy tenancy, confer patient-portal or professional access, waive counselling/signature policy, or authorize another package.

Task 05 patient/delegate/recipient integration remains **BLOCKED / NOT VERIFIED**. No new identity method, assurance level, grant issuer, duration, revocation process, or runtime role is selected here.

An authorized recipient receives only the minimum information needed for the approved handoff. Recipient authority does not expose the patient's medication, prescription, ailment, or other clinical information beyond a separately approved care-and-consent boundary.

## 5. Delivery workflow

### 5.1 Delivery eligibility before courier booking

Before even proposing courier booking, recheck the correct authenticated pharmacy actor; server-owned pharmacy scope; patient/request/item/package lineage; current per-item professional release; current delivery preference and plan; current confirmed address, service area, jurisdiction, and recipient grant; approved delivery method; complete item-specific storage/security/temperature/tamper/timing requirements; approved combined packaging/handling suitability decision where policy requires it; no excluded drug/jurisdiction; no cancellation, recall, expiry, integrity, payment-policy, exception, or reconciliation blocker; current state/source versions; approved courier/contract version; and the applicable Task 11 gate.

A patient-supplied address is not identity or verification. It must not be guessed from GPS, IP address, device location, or history. A future approved flow must preserve the address source, confirmation/verification evidence, service area and jurisdiction; encrypt and restrict the raw address; send only minimum necessary fields to an approved courier; and provide a manual accessible alternative to maps/autocomplete.

### 5.2 Delivery lifecycle

| State | Responsible conceptual actor | Required evidence / valid transition | Invalid transition, audit, and concurrency rule |
|---|---|---|---|
| `NOT_PLANNED` | Pharmacy coordination workflow | No current plan. It may advance only to `PLANNED` through an approved current plan revision. | No courier/address/recipient fact inferred. Plan creation consumes current lineage/version and logs only opaque plan references. |
| `PLANNED` | Authorized pharmacy operations actor; professional owner retains release authority | Current release, package/manifest, address/recipient, storage/security, mode, service area, courier policy, assignment and no-blocker evidence. It may advance to `HANDED_TO_COURIER` only through a physical accepted transfer, or `FAILED`. | A booking request/acknowledgement is not custody. Serialize plan/package/release/assignment versions; uncertain booking enters reconciliation. |
| `HANDED_TO_COURIER` | Authorized pharmacy handoff actor and assigned courier agent | Pharmacy validates current release, courier assignment and exact package; courier accepts physical custody through a supported `CustodyEvent`. | Never `DELIVERED` or patient receipt. Recheck release immediately before transfer; append transfer evidence and one holder projection. |
| `IN_TRANSIT` | Approved assigned courier supplies raw observations; pharmacy workflow accepts safe mapped events | Accepted direct-transit event for the exact assigned package and current custody chain. | No receipt inference. Duplicate/reordered/late events are retained/deduplicated/reconciled under source and custody versions. |
| `ATTEMPTED` | Assigned courier supplies attempt evidence; pharmacy accepts the mapped attempt | Exact plan/package/assignment, supported attempt time, recipient/proof state, current release and storage/integrity context. | Attempt is not receipt. Append attempt; never overwrite a failure into success. |
| `DELIVERED` | Patient/pre-authorized recipient physically accepts; pharmacy workflow accepts matched proof | Exact package/attempt, current grant and release, approved identity result/signature or package-specific approved exception, supported handoff time, integrity digest, and pharmacy acceptance. | Courier/provider “delivered” status, wrong/unknown recipient, failure, timeout, cancellation, or notice cannot establish it. Proof/acceptance is append-only and package-specific. |
| `FAILED` | Fact owner supplies supported failure; pharmacy workflow owns containment/review | Failure evidence, current known holder or explicit `CUSTODY_UNKNOWN`, package integrity/storage state and assigned work item. It may lead to a new approved attempt/plan revision or `RETURN_PENDING`. | Never receipt. Preserve prior attempt/custody; no automatic retry, refund, claim change, disposal, or restock. |
| `RETURN_PENDING` | Authorized pharmacy return process | Approved return intent/destination, actual holder, current package/storage/security requirements and return work/reconciliation evidence. | It cannot become `RETURNED` on dispatch or provider status. One return receipt cannot serve another package. |
| `RETURNED` | Correct receiving pharmacy verifies physical custody | Accepted correct-pharmacy receipt event and segregation evidence. Delay is allowed; delay/exception evidence remains. | Stock disposition is separate. Wrong destination, missing receipt, or unknown custody blocks. Append receipt; no automatic saleability, restock, re-dispensing, refund, claim, or financial effect. |

The valid Workstream F delivery edges remain: `NOT_PLANNED → PLANNED`; `PLANNED → HANDED_TO_COURIER | FAILED`; `HANDED_TO_COURIER → IN_TRANSIT | FAILED | RETURN_PENDING`; `IN_TRANSIT → ATTEMPTED | DELIVERED | FAILED | RETURN_PENDING`; `ATTEMPTED → DELIVERED | FAILED | RETURN_PENDING`; `FAILED → RETURN_PENDING` or a new approved attempt/plan revision; and `RETURN_PENDING → RETURNED | FAILED`. `DELIVERED` and `RETURNED` are immutable physical facts; disputes and later returns append separate evidence.

## 6. Custody model

### 6.1 Chain of custody

```text
PHARMACY CUSTODY
      |
      | accepted assigned-courier transfer (not recipient receipt)
      v
COURIER CUSTODY
      |
      | accepted package-specific recipient proof
      v
PATIENT OR PRE-AUTHORIZED RECIPIENT CUSTODY

Failed handoff branch:
COURIER CUSTODY → RETURNING → VERIFIED CORRECT-PHARMACY CUSTODY
```

Direct pickup uses `PHARMACY CUSTODY → PATIENT/PRE-AUTHORIZED RECIPIENT CUSTODY` and still requires the same package-specific release, recipient, counselling, integrity, proof, and pharmacy-acceptance boundaries. Courier custody is never patient receipt.

Every physical custody transition requires:

- opaque package reference and current server-only package-to-item manifest version;
- opaque from-holder and to-holder references, or an explicit unknown holder where evidence cannot support one;
- actual responsible actor/assignment reference;
- supported physical occurrence timestamp and explicit timezone, distinct from receiver acceptance time;
- exact evidence/proof/acceptance references and integrity digest;
- previous accepted custody event, source event/version, and consumed local custody `stateVersion`;
- current release/plan/recipient/storage/security facts applicable to that transition; and
- append-only minimized audit event with event type/version, opaque scope/resources, safe outcome, policy/source versions, and before/after state versions.

`CustodyEvent` observations are append-only. Raw courier evidence remains untrusted until authenticated, scoped, type/size/version checked, deduplicated, ordered, mapped to the exact package and accepted or reconciled by the pharmacy-owned workflow. Software status cannot overwrite physical evidence. When the holder cannot be established, use `CUSTODY_UNKNOWN`; do not guess pharmacy, courier, or recipient custody.

Package/outer identifiers contain no patient, prescription, medication, clinical, address, or internal database information. The pharmacy-owned prescription container label remains separate from an approved minimum-necessary outer courier label. A multi-item manifest requires current item-specific storage/security coverage for every item; one item's requirement cannot satisfy another, and AgentRx cannot infer combined handling suitability.

## 7. Proof-of-handoff rules

The minimum proposed proof is a server-only, heightened-protection evidence record containing:

| Required field | Rule |
|---|---|
| Opaque proof identifier | Non-authorizing, non-sequential surrogate; no person, package database key, or clinical value encoded. |
| Package and branch reference | Exact package plus exactly one delivery-attempt or pickup-handoff reference. Proof for package A cannot establish package B. |
| Recipient type | Exactly `PATIENT` or `PRE_AUTHORIZED_AGENT`; courier is not a recipient type. |
| Recipient authorization reference | Current exact grant matching subject, request, pharmacy, action, package/plan, time, and revocation state. |
| Identity-check method category | Closed approved category only; no raw identity document or unrestricted detail. Exact policy PENDING. |
| Safe identity-check result | Coarse bounded outcome, separately protected; never included in technical audit or public errors. |
| Signature required/captured status | Separate policy applicability and evidence-form statuses. A status is not the raw signature. |
| Approved exception reference | Actual G14 professional exception for an accepted no-signature case; mandatory when applicable. An advance waiver/unattended preference/courier choice cannot create it. |
| Handoff time and timezone | Supported physical transfer time, not webhook receipt or browser time. |
| Delivery-agent reference | Assigned courier for delivery only; null for direct pickup and never recipient authority. |
| Coarse result | Bounded claimed/denied/unavailable/disputed/unknown observation, separate from pharmacy acceptance. |
| Evidence-integrity digest | Binds exact package, attempt/handoff and approved evidence revision; digest/replay match is not acceptance by itself. |
| Pharmacy acceptance/reconciliation | Separate pending/accepted/rejected/disputed/reconciliation state and current version. Only accepted proof can establish receipt. |

No identity-document images, facial images, biometric templates, raw signatures, handoff photographs, or exact geolocation are required or retained by this design. Any future proposal for one of those fields needs separately approved necessity, privacy, security, retention, accessibility, vendor, and professional review. The design must support approved accessible alternatives such as a witnessed mark without lowering recipient assurance; no camera, GPS, biometric, smartphone-only, or map-only dependency is selected.

Proof is package-specific. One accepted proof cannot complete a multi-package pickup or delivery plan. Whole-plan completion may be derived only after every required package has its own accepted applicable proof or a separately approved package-specific exception, while each package's recipient authorization, professional release, custody, integrity, and version guards remain independently current. Partial, ambiguous, or unknown proof fails closed.

## 8. Failure handling

| Failure category | Immediate fail-closed state and custody | Required containment / owner / evidence | Prohibited result |
|---|---|---|---|
| Courier no-show, wrong/unassigned courier, wrong package, or package not currently released | Remain `PLANNED` in pharmacy custody when no transfer occurred; otherwise `CUSTODY_EXCEPTION` with the last supported holder | Deny transfer; preserve safe assignment/package/release mismatch evidence; refresh courier assignment, exact package, professional release, plan and versions through the pharmacy-owned process | No courier custody, recipient receipt, substitution, or guessed assignment |
| Recipient unavailable | `FAILED`/`DELIVERY_FAILED`; preserve courier custody unless supported evidence says otherwise | Assigned courier/pharmacy event, package/attempt, current holder, work item; pharmacy decides approved retry or return after all guards are refreshed | Not delivered/received; no automatic second attempt |
| Wrong or unknown recipient, expired/revoked authorization, or identity mismatch | `FAILED` or `CUSTODY_EXCEPTION`; preserve holder or `CUSTODY_UNKNOWN` | Deny handoff; preserve minimized mismatch/proof evidence; pharmacy/Task 05/professional review under approved procedure | Never receipt; no recipient substitution or sensitive enumeration |
| Attempt outside the approved window or required signature/approved exception absent | `FAILED`; preserve courier custody | Deny handoff; preserve safe timing/proof category; pharmacy rechecks recipient, release, payment policy, product integrity, storage and time before any approved retry or return | No receipt, retroactive proof, advance-waiver bypass, or automatic retry |
| Damaged, opened, tampered, lost, or stolen package | `CUSTODY_EXCEPTION`; known holder or `CUSTODY_UNKNOWN` | Contain/segregate if available; preserve package, custody, integrity, incident and source evidence; assigned PH/DM/security/operations review | No handoff, suitability, disposal, restock, refund, claim, or reportability inference |
| Unsafe or inaccessible conditions | `FAILED`/`CUSTODY_EXCEPTION`; retain current holder | Stop attempt; preserve safe category and timing; pharmacy/operations/accessibility review; current address/recipient/route recheck before any retry | No unattended drop, guessed address, bypassed accessible alternative, or receipt |
| Address missing, changed, wrong, outside service area, or wrong jurisdiction | `FAILED` before/at attempt; retain current holder | Require explicit patient/authorized-actor correction and approved verification; reauthorize/reconfirm plan and jurisdiction | No GPS/IP/history inference, cross-jurisdictional progression, or courier-made correction |
| Temperature/storage/logger issue | `CUSTODY_EXCEPTION`; preserve package and custody | Preserve exact requirement/evidence revision; quarantine/block handoff and future use pending actual PH review | AgentRx never decides suitability; no use, handoff, disposition, or restock |
| Route or weather delay, unapproved stop/relay/depot/subcontractor, device or provider outage | `FAILED`/`CUSTODY_EXCEPTION` or reconciliation; preserve actual holder | Retain safe event sequence, storage/timing facts and source uncertainty; assigned pharmacy/vendor review; no retry while outcome unknown | No status regression, blind duplicate effect, continuous location exposure, or receipt inference |
| Delivered event without proof, proof without matching event, or receipt dispute | Reconciliation; no new receipt projection | Preserve raw evidence in protected approved store and minimized digest/refs; exact package/attempt/grant/source/version review by pharmacy | Provider status or proof alone cannot establish/erase receipt |

The application must not decide that any event is a reportable privacy breach, medication incident, controlled-substance loss, legal report, clinical harm, or claim fraud. Those determinations belong to later approved human professional, privacy/security/legal, pharmacy/DM, finance, insurer, regulator, or operational processes. Task 07 remains the only proposed generic-notification owner; missing communications never changes custody or relaxes a guard.

## 9. Return rules

The return lifecycle from Workstream F remains:

| Requested stage | Exact state/evidence interpretation | Required rule |
|---|---|---|
| Return requested | `REQUESTED` | Approved intent exists; current holder/custody is unchanged until physical evidence. |
| Return approved | Required return-authorization evidence, not a competing state | Actual authorized pharmacy process confirms destination, scope, package, storage/security and return method before movement. Missing approval blocks. |
| Return in progress | `IN_PROGRESS` | Package follows the approved return path with append-only custody, delay, storage, security, tamper, and temperature evidence. |
| Received by pharmacy | `RECEIVED_BY_PHARMACY` | Correct pharmacy verifies physical custody. A delayed return may reach this state; delay/exception evidence remains. Wrong destination or missing proof cannot. |
| Disposition pending | `DISPOSITION_PENDING` | Returned package is segregated; G15 professional decision is absent. `RETURNED` canonical state may derive from verified receipt, not saleability. |
| Disposition decided | `DISPOSITION_DECIDED` | Actual authorized PH decision reference exists for the exact package/item/return and current integrity/storage facts. AgentRx does not choose or execute the outcome. |
| Closed | `CLOSED` | Return, exception, disposition, reconciliation, evidence-preservation, and required independent operational obligations are resolved under approved policy. |

Valid direct return edges remain `NOT_STARTED → REQUESTED`; `REQUESTED → IN_PROGRESS | CLOSED` only when safely withdrawn before physical effect; `IN_PROGRESS → RECEIVED_BY_PHARMACY`; `RECEIVED_BY_PHARMACY → DISPOSITION_PENDING`; `DISPOSITION_PENDING → DISPOSITION_DECIDED`; and `DISPOSITION_DECIDED → CLOSED`. `RETURNED` is the canonical custody projection derived from verified correct-pharmacy receipt, including valid delayed receipt. It is not a shortcut over `DISPOSITION_PENDING`.

Return requirements:

- create one package-scoped `ReturnCase` with current authorization, destination, holder, state/source versions, work/reconciliation references, and append-only evidence;
- maintain every applicable storage, security, tamper, direct-route, temperature/logger, and package-integrity requirement through return;
- verify physical receipt at the correct pharmacy, preserve actual receiving actor and timestamp, and segregate the package;
- preserve wrong-location, delay, failure, dispute, loss, tamper, damage, temperature, and custody-unknown evidence;
- create an assigned pharmacist or separately approved pharmacy-professional G15 disposition task; and
- address any complaint, patient follow-up, refund, adjudication, payment, claim, or claim reversal through independent approved owners and state, never as an automatic return effect.

`RETURNED` requires verified physical custody at the correct pharmacy. It does **not** mean saleable inventory, automatic restock, re-dispensing, destruction, financial reversal, refund, or claim action. A delayed return may still become `RETURNED` after verified receipt. Disposition remains separate, and no return may silently restore inventory.

## 10. Concurrency and external-event rules

| Race / duplicate | Required behavior |
|---|---|
| Release racing pickup/courier handoff | Serialize current release/revocation, package/custody, plan and recipient/assignment versions; recheck immediately before transfer. Committed revocation blocks a future transfer; an already committed physical event remains history and enters containment/reconciliation rather than being erased. |
| Pickup racing cancellation | Preserve actual custody. Before physical transfer, accepted cancellation/revocation may block handoff; after transfer, cancellation cannot undo receipt or fabricate pharmacy custody. |
| Courier webhook replay/reordering | Authenticate bounded raw bytes under a future approved contract, bind environment/account/pharmacy/package/type/version, persist/deduplicate before mapping, compare event ID plus digest, and reconcile regressions. It cannot directly set delivery, receipt, return, payment, claim, or restock. |
| Duplicate delivery/custody/proof event | Actor/source/operation/package/attempt and strict payload-bound idempotency yields one logical accepted effect. Same key/event with changed payload conflicts; copied proof cannot transfer another package. |
| Failed delivery racing return | Preserve failure and current holder; require an explicit current return authorization/destination before return progression. A late attempt success or failure is appended and reconciled, never last-write-wins. |
| Return racing reconciliation | Verified correct-pharmacy physical receipt may establish returned custody while delay/conflict evidence and other reconciliation cases remain. It cannot auto-close disposition, finance, claim, incident, or complaint obligations. |
| Unknown provider or commit outcome | Preserve bounded operation/receipt evidence, set reconciliation/unknown state, and prohibit repeat external effect until an authoritative query or assigned human review proves the outcome. |
| Multi-package completion | Consume every package's current release, recipient, proof/exception, custody, integrity, and plan versions atomically for the aggregate projection, or do not mark the plan complete. |

Every mutable head requires compare-and-set `stateVersion`, deterministic approved lock/isolation ordering, trusted time, fresh authorization, and source revision recheck. Every physical/professional/source observation remains append-only or is superseded by an attributable revision. No silent overwrite, delete-and-recreate history, browser last-write-wins update, unsafe retry, or claimed external exactly-once effect is permitted.

## 11. Audit and privacy rules

A future approved audit catalogue must cover plan creation/change/expiry, recipient authorization/revocation/verification/denial, release and readiness recheck, package secured/transferred, courier assignment/acceptance, transit/attempt/failure/exception, proof accepted/rejected/disputed/reconciled, return requested/authorized/in progress/received, segregation, and disposition referenced. Required accepted state, idempotency result, minimized audit, and any non-dispatched synthetic intent must commit atomically where persistence is later approved. Denied-attempt audit evidence follows its separately approved minimized contract and cannot create a sensitive enumeration difference.

Audit may contain only approved event/schema version, trusted time, opaque actor/subject only where necessary, server-owned pharmacy scope, opaque request/package/attempt/return/reconciliation references, approved action/outcome/safe reason, policy/source versions, correlation reference, source service, and before/after state versions.

Do not put names, addresses, phone numbers, emails, health-card numbers, prescription numbers/content, medication/clinical information, recipient identity details, raw authorization evidence, identity-check results, raw signatures, identity documents, photos, exact location, route history, courier tracking secrets, webhook bodies, payer/payment data, tokens, or vendor secrets in:

- technical identifiers, idempotency/correlation keys, URLs or query strings;
- page titles, browser history, browser/client storage, caches, referrers, analytics, or session replay;
- logs, traces, metrics/labels, error breadcrumbs, support tickets, queue/topic names, or screenshot/evidence filenames;
- technical audit/outbox bodies, notifications, public tracking, courier custom metadata, or outer labels beyond separately approved necessity.

Detailed custody/proof/address records, if later approved, require purpose-limited server-only access, encryption in transit/at rest, field-level protection where applicable, segregated keys/reference mappings, field-specific retention/holds/backup/disposal policy, and audited least privilege. Opaque references remain sensitive and never act as bearer authorization.

Task 07 alone would own approved contact/consent, generic notices, and secure messages. Task 05 alone would own protected patient/delegate/recipient authentication and authorization. No public tracking route or notification link is created here. Notification delivery is never proof of read, understanding, counselling, pickup, delivery, or receipt.

## 12. Future tests — not implemented or run

| ID | Later independently required assertion |
|---|---|
| H-T01 — Pickup guards | Vary release, counselling, plan/window, package, recipient grant, identity result, integrity/storage, cancellation, exception, reconciliation, trusted time, and versions independently. Missing/stale/revoked/wrong-scope evidence blocks READY_FOR_PICKUP and handoff. |
| H-T02 — Recipient distinction | Patient, subject, initiating actor, delegate, pre-authorized recipient, courier, pharmacist, technician/admin/support, and unknown roles remain distinct. Phone/email/OTP/link/DOB/address/code alone never authorizes receipt. |
| H-T03 — Package-specific pickup proof | Patient and pre-authorized-agent positive cases require accepted proof. Wrong/unknown/expired/revoked recipient, replayed code/proof, no-show, expired window, pending counselling, revoked release, and package mismatch cannot create PICKED_UP. |
| H-T04 — Multi-package pickup | Traverse partial proof: package A proof cannot complete package B or the plan; every required package needs accepted applicable proof or a separately approved package-specific exception with independent current release/recipient guards. Unknown/partial proof fails closed. |
| H-T05 — Delivery eligibility | Independently vary pharmacy/request/package, release, address/verification/service area/jurisdiction, recipient, method, storage/security/temperature, excluded scope, payment-policy blocker, courier contract/assignment, lifecycle and Task 11 gate. No booking/custody effect on failure. |
| H-T06 — Custody chain | Assert explicit holder and append-only event/version at pharmacy→courier, courier→recipient and return→pharmacy boundaries. Courier acceptance/IN_TRANSIT/ATTEMPTED never equals recipient receipt; unknown holder becomes CUSTODY_UNKNOWN. |
| H-T07 — Proof and accessibility | Patient signature, agent signature, witnessed mark, and separately approved no-signature exception obey the exact package/attempt/grant/procedure. No raw signature, ID image, biometric, photo, or exact GPS is required/stored; accessible alternative does not lower assurance. |
| H-T08 — Delivery failures | Courier no-show/wrong courier/wrong package/unreleased package, recipient unavailable/wrong/unknown/expired/revoked, outside-window attempt, signature/exception failure, unsafe/address issue, damage/tamper/loss/theft, weather/route delay/unapproved stop, temperature/logger issue, delivered-without-proof, proof mismatch, dispute, and provider/device outage never establish receipt; current custody and work/containment evidence persist. |
| H-T09 — Return and disposition | Wrong destination or missing verified pharmacy receipt cannot establish RETURNED. Delayed correct-pharmacy receipt can, with delay evidence preserved, segregation and disposition pending. Zero automatic restock, reuse, disposal, refund, financial, assessment, or claim effect. |
| H-T10 — Races and idempotency | Use later-approved real transactions/independent barriers for release/revoke/handoff, cancellation/pickup, duplicate/reordered courier events, failure/return, return/reconciliation, grant revocation, and multi-package completion. Same-key replay has one effect; changed payload conflicts; rollback leaves no success/evidence leak. |
| H-T11 — Webhook/reconciliation | Invalid signature/timestamp, replay, duplicate, reordered, wrong environment/account/pharmacy/package, unknown type/version, same ID/different digest, timeout, late terminal event, and status regression remain untrusted and cannot directly establish professional, custody, receipt, payment, claim, or stock truth. |
| H-T12 — Audit/privacy leakage | Closed schemas reject extra/impossible/sensitive fields. Sentinels prove no PHI, address, recipient/proof detail, medication, tracking secret, raw vendor body, token, or internal ID in prohibited client/URL/log/audit/notification/label/metric surfaces. Required audit failure rolls back accepted local state. |
| H-T13 — Human validation | Actual pharmacist/DM/technician, Task 05 identity, privacy/security/legal, accessibility, records, operations/courier/procurement, finance, Task 07, and Task 11 reviewers validate exact identity/signature/exception/route/storage/return procedures. Technical tests cannot prove Ontario professional scope or physical custody. |
| H-T14 — Synthetic isolation | Exact future scope/lifecycle, deterministic non-PHI server-owned fixtures and no-network adapters fail hard outside approved synthetic use. No Task 04 authority/import, production auth/database, live vendor, real address/person/pharmacy/prescription/package, or external effect. |

These are planned obligations only—no test file, command, fixture, database, infrastructure, runtime, or PASS evidence is created. Exact state/event/error registries, limits, time windows, lock order, idempotency lifetime, retry policy, vendor protocol, and retention schedule remain PENDING.

## 13. Production blockers and unresolved decisions

| Decision area | Current status and blocked behavior |
|---|---|
| T08-D02–D04/D10/D36/D37 | No exact runnable Task 08 synthetic scope/candidate/lifecycle, Task 01 use, risk metadata, reviewer assignment, or applicable Task 11 approval. No synthetic or production workflow may run. |
| T08-D06/D14 | Task 05 patient/delegate/recipient identity, assurance, grant, audience, revocation, and protected tracking are unavailable. Pickup/recipient/proof success is blocked. |
| T08-D15/D16/D20 | Current accreditation, Internet-site interpretation, controlled/high-risk and jurisdiction scope, registrant verification, professional release/counselling/exception/return-disposition authority are NOT VERIFIED/BLOCKED. |
| T08-D18/D29/D32 | Exact command/state/event/error contracts, transaction ownership, lock/isolation order, idempotency/retry/reconciliation, source time/version acceptance, and minimized audit/denial contracts are unapproved. No persistence is authorized. |
| T08-D19/D20/D25 | Product/package, per-item storage/security/temperature, combined-handling suitability, release/revocation, and delivery eligibility policy remain pharmacy-owned and unapproved. |
| T08-D23/D26 | Pickup recipient, identity/signature/witnessed-mark/no-signature exception, counselling, window/no-show, accessible alternative, and proof-acceptance procedures are unapproved. |
| T08-D24/D25/D28 | Address/service-area/jurisdiction, courier selection/assignment/contract, direct route/stops/relay/subcontractor, outer label, minimum data, security/tamper/temperature, acknowledgement and vendor controls are absent. No live courier or address service. |
| T08-D27/D34 | Retry, failure containment, loss/theft/tamper/damage/temperature handling, return destination/receipt/segregation, incident/reportability, disposition and dispute procedures require human owners. No automated recovery or classification. |
| T08-D07/D31 | Task 07 has design only and no runtime/provider/recipient. No notification or secure-message integration; missing notices cannot bypass another guard. |
| T08-D08/D21/D22 | Task 09 is not verified as the financial owner. Payment, adjudication, price, refund, and claim remain separate and blocked; none is created by pickup/delivery/return. |
| T08-D30/D33/D35 | PIA/TRA, minimum fields, encryption/key/support/vendor access, field-level retention/hold/backup/disposal, privacy/security and accessible alternatives remain NOT VERIFIED/BLOCKED. |

No courier, address/identity vendor, route model, package policy, signature method, exception reason, service area, delivery/pickup window, freshness period, retry limit, retention period, reviewer name, approval date, or production threshold is invented here. The OCP Operating Internet Sites Policy remains recorded as under review in Task 08; current Ontario source versions and interpretations remain NOT VERIFIED. PHIPA is not described as universally requiring Canadian hosting.

Independent documentation/design may continue when only production-only dependencies remain blocked. Runnable synthetic work still requires exact synthetic-scope approval and applicable Task 11 approval. A missing professional, identity, custody, privacy, or accessible-procedure decision may be represented only as unavailable/denied; it cannot be guessed into a successful path. Apply the complete Task 08 mandatory stop conditions to the affected slice.

## 14. Explicit non-authorization

This document grants **no implementation, migration, schema, authentication, professional, regulatory, legal, privacy, security, accessibility, synthetic-runtime, pilot, external-integration, or production authorization**. It creates no route, UI, role, permission, table, Drizzle declaration, migration, fixture, test result, worker, queue, webhook, notification, prescription, inventory/reservation, payment, claim, package, pickup, courier, shipment, proof, receipt, return, stock-disposition, audit, or external effect.

Current protected production files and systems are not modified. Public intake remains zero-PHI. Patient choice remains separate from server-owned tenant authority. Courier custody remains distinct from patient receipt. Failed delivery cannot become delivered or received. `RETURNED` requires verified physical custody at the correct pharmacy, delayed return remains eligible after verified receipt, disposition stays separate, and no return automatically restocks or creates a claim/financial effect.
