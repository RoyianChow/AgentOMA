# Task 08 — Fulfilment threat model

**Status: WORKSTREAM B DOCUMENTATION / PROPOSED DESIGN ONLY. No runtime, test PASS, risk acceptance, or production approval.**

## 1. Scope, evidence, and authority

Prepared against branch `task-08-fulfilment-delivery`, HEAD `14403be91075d71d7b13549f55f7d56ed63a86b8`, with a clean tree before this two-document slice. The only changes between the Workstream A audit baseline `89f7611203057c2cf4feb192faa2cba86233aea7` and this HEAD are the three Workstream A documents. Their implementation inventory therefore remains the source baseline; their historical evidence dates and checks are not new runtime results.

Read with [AGENTS.md](../../AGENTS.md), the full [Task 08 specification](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), [project overview](../PROJECT_OVERVIEW.md), [current state and gaps](current-state-and-gap-analysis.md), [standards mapping](ontario-fulfilment-standards-and-policy-mapping.md), and [decision register](production-dependency-and-decision-register.md). The companion [trust boundaries and data flows](trust-boundaries-and-data-flows.md) defines flows F1–F6 and boundaries TB1–TB9 used below.

This document addresses Workstream B, not the later responsibility matrix, schema proposal, transition register, incident runbooks, or prototype. Control descriptions are design requirements or proposals for later review, not selected production procedures. No code, authentication, database, migration, vendor, prescription, PHI, fixture, or external effect is introduced. No network, infrastructure, or runtime test is used for this preparation.

### Implementation categories

| Category | Repository-grounded meaning | Authority limit |
|---|---|---|
| CURRENT production-oriented code | Staff authentication, zero-PHI intake, clinical assessment, advisory claim draft, follow-up documentation and governed records in the root application. | Code presence is not deployment verification. These are not fulfilment, dispensing, patient-portal, pickup or courier services. |
| EXISTING SYNTHETIC / EXPERIMENTAL | Task 01 isolation and Task 04 booking/capability/transaction examples in `apps/experiment-sandbox/`; virtual-care fixtures and deny-only integration adapters. | No production identity or physical/financial authority. Task 04's prior runtime approval expired; its v3 renewal remains DRAFT — NOT GRANTED. No execution or extension is authorized here. |
| PROPOSED Task 08 | All fulfilment actors not already mapped, request/evidence workflows, state guards, adapters, tracking, custody, tests and operational controls below. | Not implemented. Missing policy is an explicit block, not a configurable default or guessed success path. |
| PRODUCTION-BLOCKED | Real evidence processing, inventory, professional preparation/check/release, adjudication, payment, pickup release, courier, shipment, receipt, notifications and integrations. | Separate source, identity, professional, privacy, security, accessibility, vendor and Task 11 approvals required. No live pilot is authorized. |

Task 08 calls the proposed coordinator AgentRx; the repository is AgentOMA. This document does not rename the product (T08-D38). Ontario sources and interpretations retain the Workstream A **NOT VERIFIED** status. Task 08 records the OCP Operating Internet Sites Policy as under review at its update; its current external status is not newly verified. No universal Canadian-hosting requirement is attributed to PHIPA.

### Evidence catalogue — existing controls, not Task 08 implementations

| ID | Exact repository evidence | What it supports, and what it does not |
|---|---|---|
| E01 | [Pharmacy configuration](../../src/lib/pharmacy-config.ts), `getConfiguredPharmacyId`; [staff guard](../../src/lib/auth-guard.ts), `requirePortalUser`; [auth schema](../../src/lib/db/schema/auth.ts); [public intake actions](../../src/app/(intake)/assessment/actions.ts), `resolvePharmacy`, `createIntakeSession`. | Server-owned pharmacy, current staff/session/role guards and zero-PHI intake. No patient/delegate/courier authority or patient-selected tenant. |
| E02 | [Assessment schema](../../src/lib/db/schema/assessments.ts); [clinical record types](../../src/lib/clinical-record-types.ts); [pharmacist actions](../../src/app/(dashboard)/pharmacist/actions.ts), `createAssessment`, `resolvePrescriberIdentity`; [boundary schemas](../../src/lib/p0-c-boundary-schema.ts). | Current clinical subjects, version-2 prescription snapshot and structured completion guards. Not uploaded prescription validity, dispensing or release. Preserve existing as-of-right prescriber handling without inventing Task 08 privileges. |
| E03 | [Claim derivation](../../src/lib/claims/derive-claim-draft.ts), `deriveClaimDraft`; [draft panel](../../src/app/(dashboard)/pharmacist/assessment/ClaimDraftPanel.tsx). | Protected reference-driven advisory draft; explicitly not HNS submission. No payer/payment/dispensing integration; no copying of PINs, fees or maximums. |
| E04 | [Audit](../../src/lib/audit.ts), `writeAuditWith`; [governance](../../src/lib/governance.ts); [retention](../../src/lib/retention.ts); [governance schema](../../src/lib/db/schema/governance.ts). | Existing clinical/records audit, holds, correction, export and controlled destruction patterns. Not Task 08 event approval, delivery retention or stock disposal; protected files stay unchanged. |
| E05 | [Protected-route policy](../../src/lib/phi-route-security.ts); [AssessmentWorkspace](../../src/app/(dashboard)/pharmacist/assessment/AssessmentWorkspace.tsx); Workstream A §1.5 logging inventory. | Existing cache/referrer/CSP and transient clinical-form patterns. Not proof every legacy error logger is safe for future upload/address data. |
| E06 | [Task 01 README](../task-01/README.md), [G1 decision](../task-01/decisions/G1-design-approval.md); sandbox [deny adapters](../../apps/experiment-sandbox/src/integrations/adapters.ts), [import allowlist](../../apps/experiment-sandbox/src/integrations/production-import-allowlist.ts), [egress guard](../../apps/experiment-sandbox/tools/deny-egress.cjs), [boundary verification](../../apps/experiment-sandbox/tools/verify-boundary.mjs). | Existing isolation/deny patterns, not authorization for later capabilities, hosted preview, production imports or a Task 08 database. No claim of complete OS-level network isolation. |
| E07 | Sandbox [transaction](../../apps/experiment-sandbox/src/db/transaction.ts), [authoritative context](../../apps/experiment-sandbox/src/db/authoritative-context.ts), [idempotency](../../apps/experiment-sandbox/src/db/idempotency.ts), [outbox](../../apps/experiment-sandbox/src/db/outbox.ts), [authorization](../../apps/experiment-sandbox/src/booking/authorization.ts), [delegation fixtures](../../apps/experiment-sandbox/src/booking/synthetic-delegation-fixtures.ts); [Task 04 renewal](../task-04/decisions/task-04-synthetic-scope-renewal-v3-2026-08-19.md). | Booking-only trusted-time, transaction, replay, session-bound capability and non-dispatched outbox patterns. Booking capacity is not medication stock, grants are not recipient authorization, and local idempotency is not external exactly-once delivery. |
| E08 | [Task 07 README](../task-07/README.md); Workstream A §4 dependency table; [Task 11 specification](../tasks/autonomous-pharmacy/TASK-11-quality-security-release.md). | Task 07 A–J design, not runtime; Task 05 patient identity absent; Task 03 is command-centre scope and Task 09 disabled interoperability rather than proven Rx/financial services. Task 11 controls are partial, with Task 08 scope/Checkpoint 1 pending. |
| E09 | [Retired AI-RX-06 record](../task-10/AI-RX-06-synthetic-prescription-extraction.md); Workstream A §§1.1–1.3. | Rx extraction is RETIRED. No active upload/OCR/refill/renewal/transfer, inventory, payment, fulfilment or courier runtime established by the audit. Do not revive it. |

### Existing test precedents

These files exist; **none was run for this slice**, and none proves Task 08 fulfilment behaviour. References below identify patterns to study only, not a proposal to change protected tests or modules.

| ID | Existing file evidence | Limited precedent |
|---|---|---|
| V01 | [Boundary-schema tests](../../src/lib/__tests__/p0-c-boundary-schema.test.ts); [claim database tests](../../src/lib/db/__tests__/claim-rules.db.test.ts). | Current validation, scoped clinical transactions and race/rollback assertions, not Task 08 prescription/release validation. |
| V02 | [Audit hardening tests](../../src/lib/db/__tests__/audit-hardening.db.test.ts); [governance tests](../../src/lib/db/__tests__/governance.db.test.ts). | Existing audit/governed-record invariants, not Task 08 retention or event coverage. |
| V03 | [Booking infrastructure PostgreSQL tests](../../apps/experiment-sandbox/src/__tests__/postgres-booking-infrastructure.postgres.test.ts). | Real database transaction, trusted-time, idempotency, authorization and atomicity examples in an unrelated synthetic domain. |
| V04 | [Delegation fixture tests](../../apps/experiment-sandbox/src/__tests__/synthetic-delegation-fixtures.test.ts). | Synthetic booking grant authenticity, scope and expiry examples, not legal agent status or medication-recipient verification. |
| V05 | [Sandbox architecture tests](../../apps/experiment-sandbox/src/__tests__/architecture.test.ts); E06 boundary tooling. | Server/client and production-import isolation examples, not an approved Task 08 runtime or end-to-end containment result. |

## 2. Actors, assets, and entry points

### Actors and mappings

| Actor group | Current mapping / trust distinction | Missing mapping or authority |
|---|---|---|
| Patient actor and patient subject | E02 clinical subject exists; acting staff user is separate. | Task 05 patient principal/session and actor-to-subject relationship are missing. Never identify the subject by request input alone. |
| Caregiver, delegate, SDM, authorized agent | E02 SDM documentation; E07 booking-only synthetic fixtures. | A recorded relationship is not an access grant. Legal authority, scope, expiry, revocation and permitted actions need Task 05/professional review. |
| Authorized pickup/delivery recipient | Conceptually separate from initiating actor, subject and courier. | No current grant or identity-check model. Authorization to view a request does not authorize receipt. |
| Pharmacist; pharmacy technician; intern/student | E01–E02 existing distinct staff roles and clinical supervision. | Task 08 assignment, assurance and action-specific professional scope pending; no automatic transfer of clinical permissions. |
| Pharmacy assistant/administrative staff | Map only if an existing approved role and professional policy permit the action. | No invented assistant role or implicit pharmacist authority. Unknown mapping denies access. |
| Designated Manager; pharmacy owner/operations administrator | Conceptual professional/operational accountability; an administrative account is not a professional decision. | Exact role mapping, assignment and review responsibility pending. |
| Technical support | No production fulfilment support principal found. | No impersonation or default clinical/data access; support scope, approval and revocation pending. |
| AgentRx patient, pharmacy and operations applications | Proposed Task 08 surfaces, not existing deployments. | Separate audiences and minimized views; none may supply authoritative scope or professional state. |
| Task 03, Task 05, Task 07, Task 09, Task 11 services/owners | E08 records actual dependency status and ownership mismatches. | Labels are logical dependencies, not five implemented services. Rx/PMS and finance ownership must be identified by Royian. |
| Accredited pharmacy; approved PMS; inventory/wholesaler | Proposed professional/source-system boundaries. Wholesaler availability is not pharmacy stock. | Accreditation, vendor, API and fact-specific authority unverified. Pharmacy accreditation does not prove a registrant's authorization. |
| Payer/adjudicator; payment provider/finance ledger | Separate proposed financial authorities. | No current provider or ledger; neither may make a professional or claim decision for Task 08. |
| Courier dispatcher, delivery agent and webhook sender | Separate transport/assignment/event-source actors; raw events are untrusted. | No active courier identity/integration. None is the patient's agent or an authorized professional. |
| Address-verification provider | Optional proposed external source, not selected. | Verification does not establish recipient authority or pharmacy scope; no GPS/IP-based guessing. |
| Audit service; reconciliation worker; telemetry/error service | E04 has current audit; E07 has synthetic patterns. Task 08 worker and telemetry flow do not exist. | Reconciliation cannot invent an event; observability is not a PHI sink. |
| Adversaries | Unauthenticated attacker; authenticated cross-patient/cross-tenant user; excessive-access insider; compromised patient device or pharmacy workstation; compromised pharmacy, payer, payment, courier or subprocessor account. | Authentication, vendor signatures and network origin alone cannot establish truth, professional authority or physical custody. |

### Asset inventory

All Task 08 assets below are **proposed logical assets**, not existing tables. E01–E09 identify neighbouring records only. No real values are included.

| ID | Assets | Confidentiality / integrity interest |
|---|---|---|
| A01 | Actor, subject, delegate/agent relationships, recipient grants/revocation, staff session/role/assignment, pharmacy/tenant bindings. | Authorization-sensitive; linked references can be personal information or PHI. |
| A02 | Pharmacy-choice provenance, withdrawal/supersession, alternatives/disclosures, accreditation snapshot and verification evidence. | Choice integrity; sensitive health relationship; directory freshness is not tenant authority. |
| A03 | Unverified prescription evidence/upload provenance, OCR output/confidence, authoritative Rx references, refill/renewal/clarification/transfer requests. | Potential PHI and malicious content; provenance does not confer validity. |
| A04 | Review tasks/decisions, preparation/technical-check references, professional check, counselling and release/revocation references. | Professional attribution, source/state version, patient/item binding and freshness. |
| A05 | Inventory estimates/confirmations, reservation/expiry, product/quantity/lot/storage/recall/integrity/exception references. | Commercially sensitive and potentially PHI when linked; authoritative physical-stock truth. |
| A06 | Price/coverage estimates; adjudication, payment, refund and claim references. | Financial/health confidentiality; separate state and source authorities. No raw card data. |
| A07 | Pickup plan/recipient authorization; delivery address and verification; contact and accommodation references. | Personal information/PHI; minimum disclosure and field encryption require review. |
| A08 | Package/outer label, pharmacy-only item manifest, route/custody/scan/temperature/tamper/security evidence. | Physical safety, correct joins and minimum transport disclosure. |
| A09 | Proof of handoff, failure/dispute/return/quarantine and stock-disposition references. | Evidence integrity and minimum collection; receipt and saleability are distinct decisions. |
| A10 | Vendor credentials, API tokens, webhook secrets/signing keys, service identity and support access. | Server-only secrets and bounded privileges; no credentials provisioned here. |
| A11 | Idempotency keys, state/source versions, inbox receipts, outbox events, acknowledgements, reconciliation evidence. | Replay/concurrency correctness without PHI in technical identifiers or payload fingerprints. |
| A12 | Notification intents, authenticated tracking references, patient/staff projections. | Confidentiality, truthful state and no authorizing public links. |
| A13 | Audit, incident, retention, holds, correction/export/deletion, backups and synthetic evidence. | Accountability, availability, necessary retention and controlled disposal. |

### Entry-point inventory

| ID | Entry point considered | Status / trust boundary |
|---|---|---|
| P01 | Patient/agent request, evidence/upload/OCR, clarification, choice/mode/address/recipient changes, cancellation/dispute and tracking read. | Proposed only; browser/device is untrusted (TB1–TB3). Existing zero-PHI intake must not be expanded. |
| P02 | Pharmacy queue, inventory/preparation tasks, professional decision/revocation, pickup/release/return handling, operations/support console. | Proposed only; session, assignment and action rechecked server-side (TB1, TB4). |
| P03 | PMS/inventory responses/imports; adjudicator/payment callbacks. | Blocked external vendor boundary (TB5), not source truth until authenticated, scoped, validated and reconciled by the proper owner. |
| P04 | Courier booking acknowledgement, driver scan, webhook, signature/proof, address-provider response. | Blocked vendor and physical-world boundaries (TB5–TB6). A signature-valid message is not proof of receipt. |
| P05 | Worker retry, scheduler, inbox/outbox consumer, manual reconciliation, duplicate tab or concurrent device. | Proposed only (TB7); no production worker or Task 08 transaction service exists. |
| P06 | Notice dispatch, portal response, labels/manifests, logs/metrics/traces/errors, analytics/replay, support export, retention/deletion/restore. | Proposed Task 08 paths (TB8–TB9); current adjacent audit/governance remains protected. |
| P07 | Configuration, fixture imports, dependency activation, credentials, runtime/lifecycle gates. | Existing sandbox examples, but Task 08 activation is unapproved (TB9). |

## 3. Risk method and non-negotiable control floor

Each threat card supplies scenario, entry/assets, preconditions, likelihood/impact, preventive/detective/response controls, test evidence, residual risk and approval owner. Grouped variants share those fields; they are not omitted from review.

- **L0** means likelihood **NOT ASSESSED**: there is no Task 08 runtime, operational dataset or approved scoring method. No probability, severity score, risk tier, autonomy level or acceptance threshold is invented.
- Impacts are engineering risk hypotheses for specialist review, not determinations of clinical harm, legal breach, reportability, claim fraud or drug suitability.
- Every `T08-B-Tnn` is a **PLANNED test obligation — NOT IMPLEMENTED / NOT RUN**. No Task 08 test path or passing evidence exists. Existing V01–V05 files are precedents only.
- Every approval-owner field identifies required reviewer **functions**, not appointed people. Named owner, accountable approver, independent reviewer, backup, review/expiry dates and risk acceptance remain **PENDING** under T08-D02/D37. Royian coordinates assignments; specialist authority is not attributed to Royian by inference.
- Residual risks are **UNACCEPTED / NOT VERIFIED**. The absence of runtime reduces present exposure but is not evidence that a proposed control works.

**Control floor for every proposed flow:** derive identity, subject relationship, audience, action, pharmacy scope, assignment and trusted time server-side; reauthorize each read/mutation and reject unknown fields/state. Future browser-facing mutations also need approved CSRF/origin protections; session possession alone is insufficient. A choice reference is untrusted intent, never tenant authority. Use strict minimized responses and generic anti-enumeration errors; do not echo raw failures. Preserve current-version professional facts, per-item guards, lifecycle approval and append-only provenance. Unknown/conflicting/stale prerequisites block advancement and require authorized reconciliation. An unavailable dependency is not a successful fallback.

Requests, images, OCR, patient statements, refill/renewal/transfer selections and clinical record copies never establish prescription validity. Preparation, technical completion, payment or transport never authorizes release. Courier custody never equals patient receipt. Delivery, payment, return or cancellation never creates, codes, submits or reverses a claim. Returns never auto-restock or authorize re-dispensing. No PIN, fee, maximum, professional rule, timeout or retention period is chosen here.

## 4. Threat register

### R01 — Evidence becomes prescription authority (F1)

- **Scenario / entry / assets:** P01/P03; A03–A04. Upload/OCR success, patient statement, refill selection, renewal request, transfer copy or supplied prescriber details is treated as a valid/dispensable prescription or remaining quantity.
- **Preconditions; likelihood / impact:** Evidence input or copied clinical data reaches a future workflow; L0. Unauthorized prescribing/dispensing assertions and unsafe downstream progression could result.
- **Prevent:** Keep evidence unreviewed; require separately authenticated pharmacy-owned acceptance and authoritative Rx/source/version references. No automated authenticity, renewal, transfer or clinical clarification. E02/E09 do not supply this integration.
- **Detect / respond:** Flag attempted authority promotion or missing provenance with a minimized denial; block inventory reservation/preparation/financial/handoff advancement and create a professional-review need, not an automated clinical answer.
- **Test evidence:** T08-B-T01: every request/evidence type, including successful OCR and a copied record, remains unverified; patient input, worker inference or a raw provider event cannot itself accept it. A separately verified pharmacy-owned acceptance reference is a different boundary. V01 is adjacent validation precedent only.
- **Residual / approval owner:** Pharmacy process and source authenticity remain unverified. Prescription-domain owner PENDING, pharmacist/Designated Manager (DM), privacy/security; T08-D05/D17/D20.

### R02 — Malicious or misleading evidence provenance (F1)

- **Scenario / entry / assets:** P01/P03; A03/A11. Forged, altered, duplicate, stale, unreadable, incomplete or wrong-patient evidence; malicious files and OCR content cross a trust boundary.
- **Preconditions; likelihood / impact:** A future upload/import parser or evidence store exists; L0. Misassociation, compromise or disclosure may corrupt review.
- **Prevent:** Proposed bounded file/type/content validation, malware isolation, server-owned storage references, integrity/provenance and duplicate checks; OCR text remains data, never instructions or authority. Exact limits/scanning/storage approval PENDING; no current upload runtime (E09).
- **Detect / respond:** Reject malformed/oversized content generically; quarantine suspect evidence, preserve only approved evidence and route authenticity/quality uncertainty to pharmacy review. Do not claim engineering detects all forgery.
- **Test evidence:** T08-B-T02: wrong-subject, changed digest, duplicate/stale/unreadable file, malformed/oversized content and instruction-like OCR cannot progress or leak through errors.
- **Residual / approval owner:** Forgery detection and storage security unverified. Prescription owner, pharmacist/DM, security/privacy; T08-D17/D28/D30.

### R03 — Cross-subject, cross-pharmacy and object substitution (F1–F6)

- **Scenario / entry / assets:** P01–P06; A01–A11. Wrong patient, subject, prescriber, pharmacy, tenant, request, Rx, product, package, claim, payment, shipment or recipient is joined; browser role/subject/scope/product/quantity/price/state/release substitution enables BOLA/IDOR.
- **Preconditions; likelihood / impact:** An identifier crosses a future read/write boundary; L0. Disclosure or effects against another person's/pharmacy's records.
- **Prevent:** Apply TB1/TB2; server-derived scope, relationship/action checks and matching object lineage for every reference. Reject authority-bearing input and unknown fields; references alone never authorize access. E01's singleton scope must survive.
- **Detect / respond:** Minimized scope/relationship denial, no existence differences; contain affected operations and refer suspicious joins for security review without exposing internal IDs.
- **Test evidence:** T08-B-T03: independently vary each join and injected field; cross-subject/tenant/request/item denials match nonexistent-resource errors and leave no effects. V01/V03 are precedents.
- **Residual / approval owner:** Task 05 and future schema relationships absent. Identity/security/domain owners and privacy; T08-D06/D13/D14/D18.

### R04 — Audience confusion and professional role escalation (F1–F5)

- **Scenario / entry / assets:** P01/P02/P04/P05; A01/A04. Patient token accepted at staff boundary or reverse; technician, assistant, admin, support, courier or worker performs a pharmacist-only action.
- **Preconditions; likelihood / impact:** Existing staff roles are reused without action-specific mapping; L0. Unattributable or unauthorized professional decisions.
- **Prevent:** Separate audiences, session/registration/assignment checks and actual authenticated registrant attribution; unknown roles deny. No pharmacy-domain email, IP, tenant membership or generic pharmacy actor substitutes for professional authorization. E01/E02 are not a Task 08 release matrix.
- **Detect / respond:** Record approved minimized denials; suspend the affected permission/session and escalate to identity/security plus pharmacist/DM. Do not auto-determine legal scope.
- **Test evidence:** T08-B-T04: every conceptual non-professional actor denied protected decisions; swapped audiences, expired session, wrong assignment and client role denied; legitimate action-specific professional case remains attributable.
- **Residual / approval owner:** Registration evidence and exact role matrix PENDING. Task 05, pharmacist/DM, technician, security; T08-D06/D14/D20.

### R05 — Delegation and recipient revocation bypass (F1, F4–F6)

- **Scenario / entry / assets:** P01/P02/P04; A01/A07/A09. Expired/revoked/wrong-scope grants, a consent label or booking capability grants medication access/receipt; courier self-appoints as agent.
- **Preconditions; likelihood / impact:** A relationship reference is trusted without current evaluation; L0. Unauthorized disclosure or collection.
- **Prevent:** Distinguish initiator, subject, delegate and recipient; revalidate source-issued grant, action, request, pharmacy, effective/expiry time and revocation at use, including immediately before handoff. No widened E07 booking grant or SDM record becomes Task 08 authority.
- **Detect / respond:** Generic denial and revocation-race signal; stop access/handoff, retain custody and seek an approved recipient/identity resolution.
- **Test evidence:** T08-B-T05: exact-expiry, revoked, wrong actor/subject/action/pharmacy/request and concurrent revocation; copied/widened grant denied. V03/V04 only illustrate test patterns.
- **Residual / approval owner:** Legal-agent and assurance procedures unresolved. Task 05, pharmacist/DM, privacy/legal; T08-D06/D23/D24/D26.

### R06 — Pharmacy-choice manipulation and stale accreditation (F1)

- **Scenario / entry / assets:** P01/P02/P03; A02/A01. Preselection, hidden alternatives, impractical transfer, bundled consent, undisclosed compensation/ranking or stale/false accreditation steers choice; selected pharmacy becomes tenant authority.
- **Preconditions; likelihood / impact:** A proposed directory/choice UI is added; L0. Loss of patient choice, misleading affiliation or cross-scope access.
- **Prevent:** Preserve explicit reversible neutral choice and source/freshness disclosures; no inferred health-based ranking or default pharmacy. Keep choice as non-authorizing intent; **do not implement destination routing until the singleton/choice conflict is resolved** (E01).
- **Detect / respond:** Review choice provenance, disclosed alternatives and accreditation expiry; block uncertain selection/routing rather than silently reroute or force AgentRx's pharmacy.
- **Test evidence:** T08-B-T06: neutral no-default choices, change/withdrawal, stale accreditation and unavailable destination; request choice never changes tenant scope. Success-policy tests await approval.
- **Residual / approval owner:** Directory, neutrality and architecture decisions unresolved. Royian, Task 05/architecture, pharmacist/DM, legal/privacy/operations; T08-D13/D15.

### R07 — Inventory estimate promoted to confirmed stock (F2)

- **Scenario / entry / assets:** P01–P03; A05/A12. Cache, wholesaler, catalogue or historical stock is shown as confirmed/reserved, including on-hand confused with available-to-dispense.
- **Preconditions; likelihood / impact:** A future inventory/status projection is displayed; L0. Misleading availability or progression without stock evidence.
- **Prevent:** Source/observation/expiry labels and explicit estimate status; current pharmacy confirmation for the correct item and available quantity. An estimate cannot enable preparation/capture/handoff; appointment capacity is not inventory (E07).
- **Detect / respond:** Detect stale/missing/contradictory confirmations and estimate-as-final wording; remove confirmed projection, deny advancement and request authoritative confirmation.
- **Test evidence:** T08-B-T07: stale cache, distributor-only data, missing source/time, partial/unavailable and on-hand-only responses do not become confirmed or exact patient-visible stock.
- **Residual / approval owner:** Source, freshness and minimum confirmation facts unresolved. PMS/inventory owner, pharmacist/technician/DM, operations; T08-D19.

### R08 — Reservation and physical-stock races (F2)

- **Scenario / entry / assets:** P02/P03/P05; A05/A11. Confirmation/reservation races with dispensing elsewhere, expiry, shortage, recall, cancellation or manual stock use; stale local state reallocates stock.
- **Preconditions; likelihood / impact:** Concurrent pharmacy and coordinator operations; L0. Duplicate allocation or false availability.
- **Prevent:** Pharmacy system owns reservation; scoped idempotency, source version, expiry and acknowledgement; recheck after conflicting stock events. A reservation is not sale, ownership, dispense or release. No TTL or quantity rule selected.
- **Detect / respond:** Reconcile confirmation/reservation mismatch and unknown acknowledgements; stop preparation/fulfilment based on disputed inventory, without inventing a replacement reservation.
- **Test evidence:** T08-B-T08: independent concurrent actors, expiry/recall/manual-use races and timeout; one acknowledged logical reservation, no stale overwrite or unapproved duplicate. V03 is transaction precedent only.
- **Residual / approval owner:** Vendor atomicity and other stock consumers unverified. PMS/inventory owner, operations, pharmacist/DM, database/security; T08-D19/D29.

### R09 — Product, storage or substitution uncertainty ignored (F2, F4–F5)

- **Scenario / entry / assets:** P02/P03/P04; A04/A05/A08. Wrong DIN, strength, form, quantity, manufacturer, package or storage category; automatic substitute/product choice; expiry, recall, quarantine, damage/tamper or temperature exception ignored.
- **Preconditions; likelihood / impact:** Incomplete item data is accepted as suitable; L0. Wrong or unsuitable product may enter preparation/handoff.
- **Prevent:** Authoritative product/quantity/integrity references and professional resolution of uncertainty; no software substitution, quantity calculation or suitability decision. Unknown drug classification/controlled/high-risk or jurisdiction scope blocks; no generic scheduled flag.
- **Detect / respond:** Detect manifest/source mismatch and missing/failed evidence; block advancement, request segregation/quarantine through pharmacy procedure and professional review.
- **Test evidence:** T08-B-T09: vary every identity/suitability fact; missing classification, recall, expiry, storage and substitution-required cases cannot advance or trigger a recommendation.
- **Residual / approval owner:** Exact scope, product limits and professional procedures PENDING. Pharmacist/DM, technician, legal, inventory/operations; T08-D16/D19/D25/D27.

### R10 — Preparation, technical completion or payment implies release (F2–F4)

- **Scenario / entry / assets:** P01–P05; A04/A05/A08/A12. Preparation starts early; prepared/technical check is shown as professional PASS; stale release, missing counselling, or one released item makes an entire partial request READY.
- **Preconditions; likelihood / impact:** A derived state or shortcut skips professional prerequisites; L0. False readiness or unauthorized release.
- **Prevent:** Pharmacy-owned preparation/check/counselling decisions with actual actor, source/state versions and revocation; independent item guards, approved partial plan and server-only manifest. READY requires current release, pharmacy custody and every operational guard. No PASS/FAIL/RELEASE recommendation.
- **Detect / respond:** Detect inconsistent READY or stale decisions; remove readiness, block future handoff, preserve newer decisions and obtain pharmacy review. Never reverse an actual custody event by editing a status.
- **Test evidence:** T08-B-T10: prepared/technical/payment/courier-only inputs fail; release expiry/revocation, counselling pending, partial item and stale tab cases remove or deny READY.
- **Residual / approval owner:** Professional responsibility and release validity unapproved. Pharmacist/DM, technician, Task 05, operations; T08-D18/D20/D23.

### R11 — Price or coverage estimate becomes a guarantee (F3)

- **Scenario / entry / assets:** P01/P03/P06; A06/A12. Estimate presented as final/covered/free, hidden fee assumptions, stale payer/product/pharmacy facts or price used to steer pharmacy/product selection.
- **Preconditions; likelihood / impact:** Unconfirmed financial information is projected to a patient; L0. Financial harm hypothesis and misleading consent/choice.
- **Prevent:** Separate source/freshness and included/unknown components; expire changed estimates and require confirmation after material change. Payer acceptance is not a clinical instruction. Existing E03 minor-ailment values are not dispensing prices.
- **Detect / respond:** Check guaranteed wording and source/version discrepancies; withdraw finality, request financial review and preserve choice; no raw payer rejection text in general errors.
- **Test evidence:** T08-B-T11: unknown coverage, expired/changed estimates, acceptance/rejection/reversal/duplicate/stale responses and undisclosed fees cannot create guarantees or clinical effects.
- **Residual / approval owner:** Pricing, payer and patient-confirmation policy unresolved. Finance/payer, pharmacist/DM, existing billing owner, legal; T08-D08/D21.

### R12 — Duplicate or uncertain payment and refund effects (F3, F5)

- **Scenario / entry / assets:** P01/P03/P05; A06/A11. Duplicate charge, premature capture, post-cancellation charge, failed refund/chargeback or provider timeout interpreted as no effect.
- **Preconditions; likelihood / impact:** A future provider/ledger integration exists; L0. Duplicate loss or false financial finality.
- **Prevent:** Separate authoritative ledger; scoped operation/payload idempotency and versioned acknowledgement; no raw card data. Timing, partial fulfilment and refund policies PENDING. Unknown outcomes reconcile before retry; payment cannot release.
- **Detect / respond:** Compare ledger/operation acknowledgement and disputed/late outcomes; hold dependent effects and create finance reconciliation, not automatic refund/capture or blind replay.
- **Test evidence:** T08-B-T12: duplicate/concurrent attempts, cancellation races, uncertain authorization/capture/refund, late response and changed payload leave no duplicate acknowledged effect; fake adapter only in a later scope.
- **Residual / approval owner:** No provider, ledger or verified vendor idempotency. Finance/payment, operations, security/procurement; T08-D22/D28/D29.

### R13 — Fulfilment creates or mutates a claim (F3–F5)

- **Scenario / entry / assets:** P01–P06; A06/A04. Requested, prepared, READY, payment, shipment, pickup, delivery, cancellation or return implies dispense/completion and creates, codes, submits or reverses a claim.
- **Preconditions; likelihood / impact:** Coordination events are wired to protected billing writers; L0. Improper claim or corruption of clinical evidence.
- **Prevent:** No Task 08 claim writer or callable claim-effect adapter. Existing billing retains independent professional/patient/pharmacy/reference-rule checks; E03 is advisory draft only. Never derive PIN/fee/maximum from fulfilment data.
- **Detect / respond:** Future isolation tests detect any claim/assessment side effect; stop the integration and refer to billing/Task 11 owners. No Task 08 corrective claim transaction.
- **Test evidence:** T08-B-T13: every financial/custody/return outcome has zero claim/assessment writes and no eligibility/code/submission/reversal request; protected baseline remains unchanged. No protected test edit proposed.
- **Residual / approval owner:** Future claim integration ownership unresolved. Existing billing owner, pharmacist/DM, finance/payer and Task 11; T08-D08/D21/D37.

### R14 — Wrong pickup recipient or unattended handoff (F4)

- **Scenario / entry / assets:** P01/P02; A01/A04/A07–A09. Screen/QR/OTP/phone/email/DOB/address/link alone is treated as identity; replayed code, revoked recipient, missed counselling or expired pickup bypasses handoff guards.
- **Preconditions; likelihood / impact:** Future pickup is performed using convenience proof alone; L0. Wrong-person handoff or false receipt.
- **Prevent:** Pharmacy checks current release, request/package, approved identity method and independent recipient grant, counselling, integrity and applicable financial guards. No courier-as-patient pickup, unattended locker, remote/third-party pickup or unapproved curbside model.
- **Detect / respond:** Detect mismatches/replayed proof/no-show; keep pharmacy custody and block receipt. Window expiry creates review/recheck, not automatic restock/refund/destruction.
- **Test evidence:** T08-B-T14: wrong recipient/package, each sole-factor proof, replay, grant/release expiry, no-show and counselling pending deny; approved accessible alternatives require later policy fixtures.
- **Residual / approval owner:** Identity, code/window and alternative procedures PENDING. Task 05, pharmacist/DM, privacy/accessibility/operations; T08-D23/D26/D35.

### R15 — Address and recipient-plan substitution (F4)

- **Scenario / entry / assets:** P01/P03/P04; A07/A08. Guessed GPS/IP/history address, unverified/incomplete/changed/unsafe/out-of-area address, courier-created recipient or cross-jurisdiction delivery.
- **Preconditions; likelihood / impact:** A delivery plan is accepted without current evidence; L0. Misdelivery or unnecessary disclosure.
- **Prevent:** Patient/authorized-agent confirmation plus approved verification, source/time/service-area and grant checks; re-confirm material changes. Field encryption and minimum courier disclosure; no automatic geolocation inference or courier grant changes.
- **Detect / respond:** Detect stale/mismatched plan, assignment or jurisdiction; stop booking/handoff and seek secure correction. Preserve known custody, not a guessed destination.
- **Test evidence:** T08-B-T15: changed address/recipient after approval, missing source, outside service area and forged provider verification fail; manual accessible entry does not weaken checks.
- **Residual / approval owner:** Address policy, encryption, service area and vendor necessity unresolved. Task 05, privacy/security, pharmacy operations/DM, accessibility; T08-D24/D28/D30.

### R16 — Courier pickup misbound or treated as patient receipt (F4)

- **Scenario / entry / assets:** P02/P04; A01/A04/A08/A09. Wrong courier/package/shipment, enumerated custody ID, pickup before release, or courier custody interpreted as authorized-agent/patient receipt.
- **Preconditions; likelihood / impact:** Transport handoff crosses pharmacy custody; L0. Diversion or false completion.
- **Prevent:** Validate assigned courier/account/environment and package-to-item/request manifest under current release before physical handoff; opaque non-reused identifiers, no possession-only access. Record transport custody separately from recipient grant and HANDED_OFF.
- **Detect / respond:** Validate scans and custody continuity; deny mismatches, preserve holder or CUSTODY_UNKNOWN and escalate to pharmacy/operations. No provider pickup event establishes receipt.
- **Test evidence:** T08-B-T16: wrong assignment/package/pharmacy/environment, enumeration and revoked release denied; valid simulated courier acceptance reaches transport custody only, never HANDED_OFF.
- **Residual / approval owner:** Physical verification and vendor assignment controls unverified. Pharmacist/DM, courier/operations, identity/security; T08-D25/D26/D28.

### R17 — Route, package integrity and temperature compromise (F4–F5)

- **Scenario / entry / assets:** P04; A05/A08/A09. Unapproved stops, delay, relay/depot/locker/subcontractor; lost/stolen/opened/diverted/substituted/damaged/tampered package; missing/stale/unreadable/fabricated logger or excursion.
- **Preconditions; likelihood / impact:** Package is in transport, including offline devices/weather delay; L0. Custody loss or unsuitable product may be concealed.
- **Prevent:** Approved direct-route, packaging/security/storage evidence and exception gates; approved exceptions only. No continuous location or full route history by default; no software suitability verdict or guessed temperature/transit limit.
- **Detect / respond:** Reconcile scans/integrity and missing evidence; block further handoff/use pending pharmacy containment and professional review, preserve custody and arrange authorized return when indicated.
- **Test evidence:** T08-B-T17: each loss/integrity/route/logger variant fails closed; fabricated or stale evidence cannot clear a blocker or mark product suitable.
- **Residual / approval owner:** Physical-world fraud, limits and vendor operating procedure unresolved. Pharmacist/DM, courier/operations, security/procurement; T08-D25/D27/D34.

### R18 — Forged proof or vendor-delivered status becomes receipt (F4–F5)

- **Scenario / entry / assets:** P01/P02/P04; A01/A09. Copied/replayed/wrong-recipient signature; excessive photo/ID capture; unattended preference/waiver; delivered webhook without matching proof or disputed receipt.
- **Preconditions; likelihood / impact:** Provider evidence is accepted as final patient handoff; L0. False receipt, privacy intrusion and unresolved custody.
- **Prevent:** Prior recipient authorization, approved identity/signature or professionally approved accessible exception, package/attempt/time binding, integrity and pharmacy acceptance. No default facial/ID image, raw signature/photo or exact location retention; provider status alone is insufficient.
- **Detect / respond:** Detect proof/event mismatches, replay and disputes; block receipt projection, preserve conflicting evidence under approved access and require pharmacy reconciliation. Never rewrite history to invent a physical event.
- **Test evidence:** T08-B-T18: delivered-without-proof, proof-without-event, wrong/copy/replay, revoked agent, waiver/unattended and dispute fail; only approved matched evidence supports acceptance.
- **Residual / approval owner:** Proof sufficiency, exceptions and dispute authority unresolved. Pharmacist/DM, Task 05, legal/privacy/accessibility/operations; T08-D26/D27/D33.

### R19 — Failed delivery or timeout silently completes or retries (F5)

- **Scenario / entry / assets:** P04/P05; A04/A07–A09/A11. Recipient absence, identity mismatch, unsafe/inaccessible address, window expiry or signature failure becomes received; automatic second attempt ignores release/storage/recipient changes.
- **Preconditions; likelihood / impact:** Failure handler applies a success/retry default; L0. False receipt or unsafe repeated attempt.
- **Prevent:** DELIVERY_FAILED/CUSTODY_EXCEPTION with actual holder, or CUSTODY_UNKNOWN; no timeout/notice-driven receipt. Retry only after approved pharmacy policy and current plan, integrity, storage, release, financial and timing rechecks.
- **Detect / respond:** Detect missing acknowledgement/holder and contradictory success; create pharmacy work item, generic Task 07 notice only if later available, and approved return/containment rather than guessed retry.
- **Test evidence:** T08-B-T19: each failure/timeout denies receipt; no second attempt without refreshed guards; Task 07 unavailable does not change custody or bypass its boundary.
- **Residual / approval owner:** Retry and escalation procedures unapproved. Pharmacist/DM, operations/courier, Task 07, privacy; T08-D27/D29/D31/D34.

### R20 — Return loses custody or automatically restores stock (F5)

- **Scenario / entry / assets:** P02/P04/P05; A05/A08/A09/A13. Wrong pharmacy return, delayed/lost return, cancellation or confirmed RETURNED treated as saleable, re-dispensable, destroyed, refunded or claim-reversed.
- **Preconditions; likelihood / impact:** Physical return is conflated with professional/financial disposition; L0. Untraceable or inappropriate stock use and evidence loss.
- **Prevent:** Authorized destination, holder/return scans and verified pharmacy receipt; segregation pending pharmacist/approved-professional disposition. RETURNED means pharmacy custody only. Keep financial/claim consequences independent; no automatic restock, reuse, destruction or write-off.
- **Detect / respond:** Detect incomplete chain/wrong destination; preserve CUSTODY_UNKNOWN when necessary, contain/segregate through pharmacy procedure and seek professional/operations reconciliation.
- **Test evidence:** T08-B-T20: wrong-destination returns or missing verified pharmacy-receipt evidence cannot establish RETURNED. A delayed return may become RETURNED after verified physical receipt at the correct pharmacy; preserve delay/exception evidence and keep disposition pending, with no automatic restock, claim, or financial effect.
- **Residual / approval owner:** Return acceptance, stock disposition and preservation policy PENDING. Pharmacist/DM, operations, finance/privacy; T08-D27/D33/D34.

### R21 — Stale state and cancellation/mode-change races (F1–F6)

- **Scenario / entry / assets:** P01–P05; A04–A11. Tabs/devices/workers race preparation, release/revocation, courier pickup, payment, receipt or cancellation; old event overwrites a newer professional/terminal state.
- **Preconditions; likelihood / impact:** Concurrent commands span orthogonal dimensions; L0. Duplicate effects, lost revocation or contradictory custody.
- **Prevent:** Current-version checks, deterministic lock order, actor/resource/payload-bound idempotency and validated replay; atomically record accepted state plus approved audit/outbox. Recheck after retry. Cancellation after physical handoff is not a delivery reversal; mode change after booking may require reconciliation.
- **Detect / respond:** Detect version/source/terminal conflicts, reject stale commands generically and reconcile acknowledged external effects before any retry. No history rewrite or successful receipt on rollback.
- **Test evidence:** T08-B-T21: independent connections/barriers for every named race, duplicate workers, changed payload, malformed replay and rollback; inspect committed effects, not return values alone. V03 only precedent.
- **Residual / approval owner:** No Task 08 state/locking contract or cross-system atomicity. Domain/database/security owners, pharmacist/DM, operations; T08-D18/D29/D32.

### R22 — Outage or unknown side effect retried as if absent (F1–F6)

- **Scenario / entry / assets:** P03–P05; A05/A06/A08/A11. Pharmacy closure/local outage, PMS/inventory/payer/payment/courier or upstream task unavailable; timeout after vendor acceptance triggers duplicate operation or fabricated completion.
- **Preconditions; likelihood / impact:** Lost/delayed acknowledgement or uncertain outcome; L0. Duplicate stock/financial/transport effect or unsafe availability assumption.
- **Prevent:** Explicit acknowledged/uncertain operation state; durable intent/receipt design, safe bounded retries only after proven retryability, trusted time and authoritative reconciliation. No exactly-once claim; windows/leases/backoff/retention PENDING.
- **Detect / respond:** Detect overdue/unmatched acknowledgements without PHI telemetry; stop dependent progression, use manual owner review when requery cannot prove outcome, preserve original event/digest. No invented professional/physical/financial event.
- **Test evidence:** T08-B-T22: response lost after synthetic provider effect, crash/restart, task unavailable and late duplicate acknowledgement yield one resolved effect or unresolved manual state, never blind retry.
- **Residual / approval owner:** Vendor behaviour and recovery SLOs unverified. Integration/operations/domain owners, finance/courier, Task 11; T08-D28/D29/D34/D37.

### R23 — Spoofed, replayed or contradictory webhook (F2–F5)

- **Scenario / entry / assets:** P03/P04/P05; A10/A11. Bad signature/timestamp, duplicate/reordered/delayed/replayed/oversized/malformed event, wrong environment/account/tenant/request/package, unknown type/version or terminal regression.
- **Preconditions; likelihood / impact:** A future callback consumer exists; L0. Forged facts or unauthorized progression.
- **Prevent:** Authenticate bounded raw bytes under an approved signing protocol, strict content/schema/version/type allowlists, replay and scope binding; durable deduplicated inbox before domain processing. Separate source mapping from professional, financial and receipt acceptance. No webhook can directly release, counsel, claim, restock or accept a prescription.
- **Detect / respond:** Body-free rejection/quarantine and reconciliation for contradictions; revoke compromised keys/accounts through authorized incident handling, without revealing raw reason/body publicly.
- **Test evidence:** T08-B-T23: all listed variants, re-signing wrong-scope events, identical ID/changed payload, terminal mutation and valid-signature/invalid-domain cases; no unauthorized state effect.
- **Residual / approval owner:** Signing/replay windows, inbox contract and vendor proof PENDING. Integration/security/domain owners, procurement; T08-D28/D29/D32.

### R24 — PHI leaks through tracking, notices or observability (F1–F6)

- **Scenario / entry / assets:** P01–P06; A03/A06–A13. Clinical content, address/contact, signature/ID/location, payer/card information or secrets escape into URLs/titles/history/referrers, storage/cache, notifications, labels/manifests/maps/courier apps/metadata, analytics/replay, logs/traces/metrics/errors/support tickets or screenshot filenames.
- **Preconditions; likelihood / impact:** Detailed source data crosses a projection/telemetry boundary; L0. Unauthorized disclosure and linkable health relationships, even using opaque references.
- **Prevent:** Closed minimum-necessary projections, authenticated/re-authorized tracking, no-store/referrer/CSP, no authorizing URL tokens, no PHI browser persistence, generic notices via Task 07, approved outer-label fields only. No clinical content in courier/payment/address/support metadata; do not copy legacy exception-object logging (E05).
- **Detect / respond:** Synthetic sentinel scanning across response/DOM/storage/headers/events/logs/artifacts and disclosure review; contain the channel, revoke exposed credentials and preserve minimal incident evidence under authorized review, not raw logs.
- **Test evidence:** T08-B-T24: all listed surfaces, failures and cross-user caching; opaque-reference possession cannot read; generic notice has no sensitive relationship/detail; provider delivery is not read/understood/receipt.
- **Residual / approval owner:** Field necessity/encryption, recipients and telemetry/vendor contracts unapproved. Privacy/security, Task 05/07/11, pharmacist/DM; T08-D30/D31/D34.

### R25 — Vendor, insider or support compromise (F2–F6)

- **Scenario / entry / assets:** P02–P07; A01/A03/A07–A10/A13. Excessive support/vendor-admin access, workstation/device compromise, stolen API keys, unsafe subprocessors or data reused for advertising, profiling, unrelated analytics or AI training.
- **Preconditions; likelihood / impact:** Privilege or vendor disclosure exists; L0. Cross-domain disclosure, impersonation or forged operational facts.
- **Prevent:** Least privilege and assignment expiry, no support impersonation, strong service/vendor account authentication/MFA, field encryption and key rotation ownership; approve subprocessor/support/geography/data-use/exit contracts before connection. Client/network origin is not authority.
- **Detect / respond:** Minimized privileged-access review and account/key-change monitoring; contain vendor/service sessions, pause effects, preserve evidence and perform human privacy/security/professional assessment. No automatic breach/reportability judgement.
- **Test evidence:** T08-B-T25: compromised low-privilege/support principal cannot widen access; revoked service key/session denies; fixtures/exports contain no secrets; tabletop vendor compromise/exit before any live approval.
- **Residual / approval owner:** Vendor evidence, keys and contractual enforcement absent. Security/privacy/legal/procurement, DM/operations, Task 11; T08-D28/D30/D34/D37.

### R26 — Enumeration, flooding and resource abuse (F1–F6)

- **Scenario / entry / assets:** P01/P03/P04/P05; A02/A05/A07/A11/A12. Request flooding, oversized evidence, stock hoarding/reservation abuse, price scraping or package/recipient enumeration exhausts resources or reveals sensitive facts.
- **Preconditions; likelihood / impact:** Public/protected endpoint or worker becomes callable; L0. Availability loss and privacy/business inference.
- **Prevent:** Approved bounded request/result/queue sizes and server-derived rate scopes, generic anti-enumeration, no exact-stock disclosure, safe backpressure and reservation expiry. Thresholds and retention are PENDING, not copied from booking/catalog limits.
- **Detect / respond:** Body-free aggregate abuse signals with approved label cardinality; reject safely and pause affected operations without choosing a pharmacy or bypassing professional controls.
- **Test evidence:** T08-B-T26: concurrent limits, bounded memory/cleanup, huge inputs, repeated reservation attempts and nonexistent/forbidden resource equivalence; no new effect on failure.
- **Residual / approval owner:** Capacity, fairness and incident thresholds unapproved. Security/operations, inventory owner, privacy/Task 11; T08-D19/D29/D30/D37.

### R27 — Audit gaps, fabricated evidence or unsafe audit payloads (F1–F6)

- **Scenario / entry / assets:** P02–P06; A04/A09/A11/A13. Partial commit, missing audit, mutated history, arbitrary metadata or clinical payload hides/reveals an event; denied-action logging works around schema ownership.
- **Preconditions; likelihood / impact:** New transitions use legacy best-effort audit or unapproved events; L0. Lost accountability, privacy leakage and false evidence.
- **Prevent:** Proposed closed event/action/outcome/reason/version/reference catalogue; approved atomic required audit/outbox with state, immutable provenance and no raw source bodies. Any unresolved denied-action policy/schema conflict must block that integration, not be silently bypassed; E04 is protected.
- **Detect / respond:** Reconcile event/state versions and audit-write failures; fail the required transaction, stop progression, preserve approved failure evidence and escalate to audit owner. Do not invent success/history.
- **Test evidence:** T08-B-T27: audit/outbox failure rolls back accepted transition/receipt; invalid semantic combinations/extra fields/PHI denied; replay cannot duplicate evidence. V02/V03 are precedents only.
- **Residual / approval owner:** Task 08 audit integration and failure semantics PENDING. Audit/governance owner, privacy/security, Task 11/domain owners; T08-D32.

### R28 — Retention or deletion destroys live/held evidence (F1–F6)

- **Scenario / entry / assets:** P05/P06; A03–A13. Deletion races delivery/return, incident, complaint, chargeback, legal hold or professional record duty; vendor/backups retain excess copies or restore deleted data without controls.
- **Preconditions; likelihood / impact:** Dataset disposal/export/restore is introduced; L0. Evidence loss or excessive retention/disclosure.
- **Prevent:** Field-level purpose/source/role/encryption/trigger/period/hold/backup/vendor mapping, reviewed independently by dataset. Do not reuse clinical retention universally or alter protected governance exports/destruction (E04); no automatic return disposal.
- **Detect / respond:** Approved hold/deletion manifests and custody/reconciliation blockers; pause destruction, preserve required records and escalate to records/privacy/professional owner. No invented statutory period.
- **Test evidence:** T08-B-T28: active return/delivery, late incident/hold, complaint/chargeback, backup restore and vendor deletion uncertainty prevent unsafe disposal; cross-scope export denied. V02 only precedent.
- **Residual / approval owner:** Periods, triggers, vendor copies and governance inclusion unapproved. Records/Task 02/governance, privacy/legal, pharmacist/DM, security; T08-D33/D34.

### R29 — Accessibility failure changes choice or prevents safe receipt (F1, F4–F6)

- **Scenario / entry / assets:** P01/P02/P04/P06; A02/A07/A09/A12. Map/camera/GPS/biometric-only flow, inaccessible controls/signature/error, ambiguous timezone or hidden state causes wrong pharmacy/address/mode, missed exception or inability to collect/dispute.
- **Preconditions; likelihood / impact:** Future UI/proof flow is inaccessible; L0. Exclusion, incorrect consent/choice or unsafe handoff hypothesis.
- **Prevent:** Task 08 keyboard/focus/labels/live status, 375px, 200%/400% reflow, reduced motion, long/Bangla labels, frequent-action 56px targets and explicit timezone; map-free and telephone/in-person alternatives. Professional approval of identity/signature accommodations must preserve assurance.
- **Detect / respond:** Independent keyboard/screen-reader/reflow and professional usability review, not only snapshots; offer approved human alternative and block unsupported handoff instead of lowering guards.
- **Test evidence:** T08-B-T29: all named interactions including cancellation/dispute/unknown state, long labels and alternative proof; no inaccessible fallback or success by omitted verification. No Task 08 UI/evidence exists.
- **Residual / approval owner:** Applicability/WCAG target and accommodation policy unverified. Accessibility, pharmacist/DM, operations, privacy/legal; T08-D23/D26/D35.

### R30 — Synthetic scope or lifecycle becomes production permission (F1–F6)

- **Scenario / entry / assets:** P07; A01–A13. Existing adapter name, expired Task 04 approval, copied fixture/production import, real credential or historical PASS enables Task 08 in production, expands pharmacy scope or bypasses a missing dependency.
- **Preconditions; likelihood / impact:** Documentation/pattern reuse is mistaken for runtime authority; L0. Real PHI or physical/financial external effects without approval.
- **Prevent:** Exact-candidate Task 08 scope/Task 11 Checkpoint 1 before runtime; server-owned fixed-clock synthetic fixtures, lifecycle fail-hard and no-network/production-import controls under later approval. G1 and expired Task 04 authority do not transfer. No fallback to root auth, database or external SDK.
- **Detect / respond:** Architecture/configuration/provenance checks; deny unsafe enablement and stop affected work on real data, unknown scope or mandatory stop condition. Preserve protected baselines, billing, audit and triage untouched.
- **Test evidence:** T08-B-T30: production environment, missing/expired lifecycle, forged fixtures, direct/transitive production/client imports and attempted external effects all fail hard; V05 illustrates patterns only.
- **Residual / approval owner:** No Task 08 runtime/lifecycle or independent acceptance. Royian coordinates Task 01/11/security/privacy and domain owners; T08-D02–D04/D10/D36/D37.

## 5. Coverage, evidence acceptance and unresolved decisions

### Flow-to-threat coverage

| Flow in companion document | Principal threats | Cross-cutting threats also apply |
|---|---|---|
| F1 — request to pharmacy review | R01–R06, R29 | R21–R30 |
| F2 — PMS status synchronization | R03–R04, R07–R10 | R21–R30 |
| F3 — price/adjudication/payment/claim separation | R10–R13 | R03–R04, R21–R28, R30 |
| F4 — release, transport and recipient receipt; pickup branch | R05, R09–R10, R14–R18, R29 | R03–R04, R13, R21–R28, R30 |
| F5 — failure and controlled return | R13, R17–R20 | R03–R05, R21–R30 |
| F6 — notification and authenticated tracking | R03–R05, R24–R26, R29 | R21–R23, R27–R28, R30 |

The thirty matching T08-B-T01–T30 obligations form a **planned coverage index**, not implemented tests or executable contracts. A future approved test plan must include positive cases with authentic server-owned synthetic authority, negative permutations, time boundaries with fixed clock/approved Ontario timezone, real transaction/concurrency assertions where required, rollback/effect counts, leakage sentinels and reviewer-led operational/accessibility cases. Unsafe successes cannot be simulated by inventing missing professional or legal policy. Test filenames, fixtures, schemas and execution are deferred.

For later acceptance, each obligation needs exact test/evidence path, candidate SHA, command, environment, result and independent reviewer. Audit/input tests must verify real behaviour, not mirror schemas; races need independent connections/barriers and committed-state assertions. No test of an in-memory adapter can establish a vendor's real idempotency, physical custody, professional competence or legal compliance. None of that evidence is supplied by this documentation slice.

### Decisions and stop handling

Existing [T08-D01–D38](production-dependency-and-decision-register.md) remain unchanged. In particular:

- T08-D02–D04/D10/D36/D37: exact runtime scope, lifecycle, named reviewers, risk assessment and Task 11 checkpoints remain PENDING/BLOCKED. Workstream B authorization is documentation only.
- T08-D05–D08/D11: Rx/PMS and finance ownership mismatches, missing patient identity, Task 07 runtime and missing planning source remain unresolved. Do not invent a substitute service.
- T08-D13–D17/D20: pharmacy choice versus singleton scope, patient PHI boundary, source/accreditation/Internet-site review, excluded drug/jurisdiction scope and professional powers remain unresolved.
- T08-D19/D21–D29: inventory/price/payment policies, recipient/proof/route/return rules, vendors, idempotency/timeout/retry limits and reconciliation authority require their specialist owners. No numeric values or vendor decisions are selected.
- T08-D30–D35: minimum fields, encryption/key custody, external geography, notice/label policy, audit semantics, dataset retention, incident reportability and accessibility alternatives require review. This is not a PIA, approved TRA or approved professional procedure.

On a mandatory stop trigger, deny the affected transition/integration and report the decision ID; preserve actual custody or explicitly unknown custody, newer professional facts and approved evidence. Do not auto-classify breach, harm, medication incident, controlled-substance loss or claim fraud. Human pharmacy/DM, privacy/security/legal and relevant finance/vendor owners decide containment and reporting under future approved runbooks. Independent safe documentation may continue; real operations and unapproved synthetic successes may not.

**Workstream B outcome:** threat inventory and proposed control/test coverage only. Task 08 runtime and synthetic prototype tests are **NOT IMPLEMENTED / NOT RUN**; professional validation, risk acceptance, integrations, pilot and production remain **BLOCKED / NOT VERIFIED**. No Workstream A decision is closed by this document.
