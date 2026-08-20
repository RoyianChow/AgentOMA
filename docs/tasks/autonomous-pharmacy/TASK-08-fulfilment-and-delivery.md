Task 08 — Online Fulfilment, Pickup, and Delivery Coordination

## Sprint checkpoint — 2026-08-19

**Repository state:** `NOT RUN`; no fulfilment, pickup, delivery, payment,
inventory, courier, or pharmacy-request runtime exists.
**Sprint slice:** contracts and state-machine review only if upstream identity,
messaging, patient-choice, and professional-authority decisions are available.
**Exit:** product language remains “request,” never “order”; payment, courier,
or vendor events cannot authorize professional release or patient receipt. No
external adapter is authorized. See
[`NEXT-SPRINT-PLAN-2026-08-19.md`](NEXT-SPRINT-PLAN-2026-08-19.md).

Owner profile: pharmacy-operations developerSupporting reviewers: practising Ontario pharmacist, Designated Manager, pharmacy technician, privacy, security, accessibility, operations, finance, legal/procurementPriority: P2; P1 only for boundaries that protect professional responsibility, patient choice, privacy, and releaseStatus: research, contracts, deterministic synthetic workflow, and tests may proceed; real prescription processing, inventory, adjudication, payment, pickup release, courier activity, and dispensing integration remain blockedUpdated: 2026-07-30

Outcome

Build a fail-closed coordination layer that:

Accepts a patient’s prescription, refill, renewal, or transfer request without asserting that an upload, message, image, or patient statement is a valid prescription.

Preserves the patient’s right to choose an accredited pharmacy and records that choice without steering, exclusivity, or a mandatory AgentRx pharmacy.

Gives authorized pharmacy personnel a clear queue for verification, clarification, inventory confirmation, preparation, professional checking, pickup, delivery, failure, and return.

Keeps prescription authenticity, validity, therapeutic decisions, substitution, dispensing, counselling, final release, and stock disposition with authorized registrants practising through the accredited pharmacy.

Treats inventory, price, coverage, timing, and delivery information as estimates until confirmed by the authoritative pharmacy, adjudicator, payment, or courier system.

Maintains auditable custody from pharmacy release through receipt by the patient or an authorized agent.

Prevents a failed, delayed, lost, damaged, temperature-exposed, misdirected, or returned delivery from being marked received or silently returned to saleable stock.

Makes every external effect acknowledged, idempotent, versioned, audited, and reconcilable.

Exposes no PHI, prescription facts, medication facts, internal identifiers, or reusable credentials through tracking URLs, notifications, courier labels beyond approved necessity, analytics, or logs.

Cannot create a real order, payment, shipment, claim, prescription record, dispensing event, or professional release in the synthetic prototype.

This task coordinates pharmacy operations. It is not an online pharmacy by itself, a prescription validator, a pharmacy practice management system, an inventory source of truth, a claims engine, a courier, or a substitute for professional judgement.

Evidence basis and interpretation

Use deep-research-report.md as product-planning context. Its controlling boundary applies here: AgentRx should remain a documentation, workflow, and clinician-handoff system with explicit human accountability, conservative safety controls, visible uncertainty, and strong privacy boundaries.

Use current official Ontario sources as the production review baseline, including:

OCP Operating Internet Sites Policy, which is explicitly under review as of this update.

OCP Delivery of Prescriptions Fact Sheet.

OCP Standards of Operation for Pharmacies.

OCP Community Pharmacy Assessment Criteria.

OCP Code of Ethics.

OCP Prescription Transfers Fact Sheet.

OCP Medication Procurement and Inventory Management Policy.

OCP Protecting the Cold Chain Guideline.

Ontario Regulation 264/16 under the Drug and Pharmacies Regulation Act.

Ontario Drug Benefit Program: Health Network System, where applicable.

These sources do not constitute legal, privacy, security, accessibility, professional, payer, vendor, or procurement approval. Before production:

Reconfirm every source, version, effective date, and interpretation.

Record the source title, authority, URL, revision or effective date, access date, requirement, repository evidence, gap, action, approval owner, and blocking level.

Resolve the implications of the Operating Internet Sites Policy being under review.

Separate a pharmacy’s accreditation from a registrant’s authorization and scope.

Reconcile legislation, standards, policies, fact sheets, payer rules, pharmacy procedures, and vendor contracts instead of treating any one source as complete.

Separate Ontario requirements from other provinces, federal controlled-substance rules, the United States, Bangladesh, or other jurisdictions.

Do not claim that PHIPA universally mandates Canadian hosting.

Do not rely on marketing pages as evidence of accreditation, inventory, price, coverage, delivery capability, security, accessibility, residency, or contractual controls.

Non-negotiable design principles

A request is not a prescription. An upload, refill selection, transfer request, renewal request, OCR result, patient statement, or prescriber detail does not establish prescription authenticity, validity, completeness, remaining quantity, or dispensability.

AgentRx does not dispense. It may coordinate tasks and display authoritative external status, but it does not prescribe, adapt, renew, transfer, substitute, prepare, check, release, counsel, or submit a claim.

The accredited pharmacy owns pharmacy practice. Its authorized registrants and approved systems remain authoritative for professional and dispensing decisions.

Patient choice is active and reversible. No default, ranking, commercial relationship, interface treatment, or technical dependency may imply that the patient must use AgentRx’s pharmacy.

Inventory is uncertain until confirmed. Search, cache, catalogue, distributor, historical, or patient-visible availability is only an estimate.

Price and coverage are uncertain until adjudicated. A displayed amount is not a promise of coverage, copayment, reimbursement, eligibility, or final price.

Professional release is explicit. Preparation, technical completion, payment, courier availability, or a vendor event cannot authorize release.

Ready means professionally releasable. The patient must not see “ready for pickup” or “out for delivery” until the required professional release and all applicable operational guards are recorded.

Courier custody is not patient receipt. Pharmacy-to-courier handoff must never set the patient handoff state.

The courier is not the patient’s agent. An authorized recipient must be specified independently under the pharmacy’s approved process.

Failure preserves responsibility. Unsuccessful delivery leaves the medication in a controlled, traceable custody state until successful handoff or confirmed return and pharmacist-directed disposition.

Returns do not silently become inventory. No return, cancellation, failed pickup, or failed delivery automatically restocks or makes medication saleable.

External facts are untrusted until mapped and reconciled. A provider webhook, scan, status page, or callback cannot directly produce a clinical, dispensing, release, receipt, payment, or claim effect.

No PHI in public tracking surfaces. A URL, page title, referrer, notification preview, courier event, label, analytics record, log, screenshot filename, or support ticket must not reveal a medication, ailment, prescription, pharmacy relationship, or patient identifier beyond separately approved necessity.

High-risk scope fails closed. Federally controlled substances and any additional policy-designated drug class remain excluded. Do not confuse federal controlled-substance status with Ontario Schedule I, II, or III classification.

Cross-jurisdictional fulfilment is blocked. The patient, pharmacy, prescriber, pickup, and delivery jurisdiction must remain inside the approved scope.

Unknown or contradictory state fails closed. It cannot advance to preparation, ready, release, pickup, delivery, receipt, financial settlement, or claim action.

Terminology

Fulfilment request: a patient- or authorized-agent-initiated request for pharmacy review. It is not an order to dispense.

Prescription evidence: an uploaded image, document, reference, patient statement, prescriber transmission reference, or transfer request awaiting authorized pharmacy review.

Authoritative prescription record: the record accepted and maintained by the accredited pharmacy in its approved pharmacy system.

Professional decision: a decision requiring a pharmacist or another authorized registrant acting within approved scope and pharmacy policy.

Professional check: the pharmacy’s required clinical and dispensing review before release. AgentRx stores only a safe decision reference, not a substitute check.

Release authorization: an explicit, current, pharmacy-owned decision that the prepared item may proceed to the approved pickup or delivery handoff.

Inventory estimate: non-authoritative availability information with source, scope, confidence category, and expiry.

Inventory confirmation: a current pharmacy-system or authorized-pharmacy-personnel confirmation addressing the approved minimum facts.

Price estimate: a non-binding amount or range that has not been finally adjudicated.

Coverage estimate: a non-binding indication that does not prove benefit eligibility or final patient responsibility.

Adjudication: the authoritative payer or pharmacy-system response to a properly submitted transaction. Production adjudication is outside this task.

Patient agent or authorized recipient: a person specified in advance under the pharmacy’s approved process to receive the medication for the patient.

Courier: a pharmacy vendor responsible for transport. The courier is not the patient’s agent.

Proof of handoff: minimum approved evidence that the patient or authorized recipient took custody.

Custody event: a time-ordered, append-only record of a physical handoff, scan, exception, or return.

Reconciliation: a controlled process for resolving uncertain or conflicting external and internal state without inventing a new professional or physical event.

Synthetic: deterministic, obviously fictitious, server-owned, isolated from production, and incapable of external effect.

Required boundary summary

Concern

AgentRx authority

Authoritative source

Production status

Patient request

Create and route a coordination request

AgentRx request service

Synthetic only

Prescription authenticity and validity

None; display pending or pharmacy-provided result

Accredited pharmacy and approved pharmacy system

Blocked

Refill quantity or transferability

None

Accredited pharmacy and approved pharmacy system

Blocked

Renewal or prescribing

None

Authorized prescriber or pharmacist acting within approved scope

Blocked

Inventory

Estimate display and confirmation task only

Pharmacy system and authorized pharmacy personnel

Blocked

Product, quantity, expiry, storage, substitution

None beyond safe task status

Pharmacy system and authorized registrant

Blocked

Preparation

Coordinate a task/reference only

Accredited pharmacy workflow

Synthetic only

Professional check and release

Record an explicit external decision reference only

Authorized pharmacy professional

Blocked

Price and coverage

Clearly labelled estimate only

Pharmacy system, payer, adjudicator, and approved policy

Synthetic only

Payment

No real authorization, capture, refund, or card handling

Approved payment provider and finance policy

Blocked

Claim

No creation, eligibility, code, PIN, or submission

Existing billing/claim service

Blocked

Pickup handoff

Synthetic status and evidence contract

Accredited pharmacy

Synthetic only

Delivery transport

Synthetic adapter and custody contract

Approved courier under pharmacy control

Blocked

Patient receipt

Record only approved proof mapped to the correct request

Pharmacy-owned custody process

Synthetic only

Notifications

Request generic Task 07 notices

Task 07 communication service

Stubbed

Scope

P1 synthetic and design scope

Current-state and gap assessment.

Current Ontario standards, legislation, policy, privacy, accessibility, professional, payer, and vendor mapping.

Professional-responsibility and role-separation matrix.

Patient request, pharmacy choice, pickup, delivery, authorized-recipient, cancellation, and return models.

Orthogonal state model plus required canonical workflow states.

Deterministic state-transition service with authorization, guards, evidence, optimistic concurrency, idempotency, and audit.

Prescription-evidence and clarification workflow that never asserts validity.

Inventory estimate, confirmation, reservation-reference, expiry, shortage, substitution-required, and exception contracts.

Price and coverage estimate contracts with truthful uncertainty.

Synthetic preparation, professional-check, release, ready, pickup, courier, handoff, failure, and return states.

Chain-of-custody and delivery-exception model.

Synthetic pharmacy-system, adjudicator, payment, courier, and notification adapters with no network calls.

External-contract, webhook, idempotency, reconciliation, and outage design.

Privacy, security, tracking, labelling, audit, retention, incident, accessibility, and operational runbooks.

Deterministic fixtures, tests, and responsive evidence.

Production handoff and unresolved-decision register.

P2 production scope after approval

Read-only or controlled write integration with an approved pharmacy practice management system.

Approved inventory confirmation and reservation functions.

Approved adjudication and final-price workflow.

Approved payment authorization, capture, cancellation, and refund workflow.

Approved pickup operations.

Approved courier booking, custody-event, proof-of-handoff, exception, and return integration.

Approved Task 07 notifications.

Production monitoring, reconciliation, incident response, and support.

Every P2 item remains blocked until the applicable production gates pass.

Out of scope

Automated prescription authenticity, validity, completeness, or forgery decisions.

Treating an uploaded prescription image or OCR result as an authorized prescription.

Prescribing, renewing, adapting, therapeutic interchange, product selection, substitution, or clinical clarification by AgentRx.

Automated drug-utilization review, interaction resolution, therapeutic decision, counselling, dispensing check, final verification, or release.

Automatic partial-fill, split-fill, emergency-supply, balance-owing, compliance-pack, specialty, compounding, or central-fill decisions.

Federally controlled substances, narcotics, controlled drugs, benzodiazepines, targeted substances, monitored-drug-specific workflows, and any additional high-risk class not expressly approved.

Centralized prescription processing, remote dispensing locations, automated pharmacy systems, pickup lockers, unattended collection, or other remote-dispensing models.

Cross-provincial, cross-territorial, international, or otherwise unapproved cross-jurisdictional service.

Real inventory, distributor, pharmacy system, adjudicator, insurer, payment, bank, courier, mapping, address-verification, identity-verification, or notification integration before approval.

Live prescription orders, transfers, claims, payments, shipments, courier pickups, or patient deliveries.

Storing raw payment-card data.

Automatic restocking, redispensing, reuse, destruction, or financial write-off of returned medication.

Marketing, preferred-pharmacy steering, sponsored placement, behavioural pricing, or exclusivity.

Clinical advice or medication details in unsecured notifications.

Production migration, authentication change, or release.

Live patient pilot.

Dependencies and integration boundaries

Required dependencies

Task 01: safe synthetic environment, fixed clock, deterministic fixtures, and production isolation.

Task 03: authoritative prescription-request, document, OCR, prescription-evidence, or intake boundary, as actually implemented.

Task 05: separate patient, subject, delegate, authorized agent, pharmacist, pharmacy technician, administrator, support, tenant, session, and revocation boundaries.

Task 07: generic external notifications and secure portal messaging.

Task 09: authoritative billing, claim, pricing, adjudication, or financial boundary, according to the repository’s actual scope.

Task 11: security, protected-route, vendor, feature-gate, and production-release controls.

Do not assume these tasks are complete or that their numbers describe their final implementation. Inspect repository evidence and record PASSED, BLOCKED, or NOT VERIFIED. Continue independent synthetic work when a production dependency is unavailable.

Authoritative systems

The accredited pharmacy and its approved pharmacy system remain authoritative for the prescription record, transfer, refill status, inventory, preparation, check, release, counselling, and stock disposition.

Task 05 remains authoritative for identity, session, role, actor-to-subject relationship, delegate or agent grant, tenant, pharmacy assignment, and revocation.

Task 07 remains authoritative for communication consent, contact verification, generic external notifications, and secure portal messages.

The payer or adjudicator remains authoritative for coverage and adjudication.

The approved payment provider and finance ledger remain authoritative for payment state.

The approved courier remains the source of raw transport events, but the pharmacy-owned fulfilment service remains authoritative for whether a raw event is accepted and what operational state follows.

The existing billing service remains authoritative for claim eligibility, code selection, generation, submission, reversal, and reconciliation.

AgentRx is authoritative only for its coordination request, safe internal tasks, synthetic adapter state, and append-only audit events.

Execution instructions

Read every applicable repository instruction, including AGENTS.md.

Inspect the current implementation before proposing schemas, endpoints, roles, or adapters.

Preserve all existing tenant, identity, privacy, audit, retention, assessment, prescription, pharmacy, inventory, billing, and finalization boundaries.

Use deterministic, obviously synthetic data only.

Do not apply a production migration.

Do not add a live SDK, credential, pharmacy connection, payer connection, payment account, courier account, recipient, address, telephone number, email address, tracking number, or webhook secret.

Implement authorization and transitions server-side. UI hiding is not authorization.

Require a current state version or equivalent concurrency control for every mutation.

Use safe feature gates that fail hard if a synthetic adapter is enabled outside the synthetic environment.

Continue synthetic work when only production policy, vendor, contract, or approval is blocked.

Stop the affected workstream on any mandatory stop condition.

End with the required status report.

Workstream A — Current-state, gap, and standards assessment

Repository assessment

Document:

Existing request, prescription, upload, OCR, assessment, refill, renewal, transfer, pharmacy, inventory, order, fulfilment, pickup, delivery, billing, claim, payment, notification, and audit models.

Every current state name, transition, event source, actor, guard, side effect, and terminal-state assumption.

Whether any UI or API calls an upload a “prescription,” “approved,” “ordered,” “filled,” “ready,” “paid,” “covered,” “shipped,” or “delivered” without authoritative evidence.

Existing patient, subject, actor, delegate, agent, caregiver, pharmacist, pharmacy technician, staff, administrator, support, pharmacy, and tenant relationships.

Existing pharmacy accreditation and registrant-status verification.

Existing patient pharmacy selection, defaults, rankings, network restrictions, transfer paths, and consent.

Existing product catalogue, DIN or other drug identifiers, availability, quantity, expiry, lot, storage, reservation, substitution, shortage, and recall data.

Existing pharmacy-system, wholesaler, adjudicator, payer, payment, courier, mapping, address, identity, and notification integrations.

Existing queue, worker, cron, event, retry, lock, outbox, inbox, idempotency, webhook, dead-letter, and reconciliation behavior.

Existing price, coverage, copayment, deductible, dispensing fee, service fee, delivery fee, tax, payment, refund, and claim logic.

Existing pickup, delivery, recipient, signature, proof, return, loss, theft, tamper, route, and temperature controls.

Existing labels, receipts, manifests, tracking pages, notification templates, page titles, URLs, browser storage, analytics, logs, traces, error reports, and support tooling.

Existing encryption, key management, network controls, caching, access review, break-glass, incident, and vendor-support access.

Existing record-retention, legal-hold, export, disposal, backup, and incident-preservation behavior.

Existing accessibility, mobile, language, address-entry, identity-check, signature, and alternative-handoff patterns.

Existing synthetic fixtures, test adapters, production gates, and evidence.

Architectural conflicts and unsafe assumptions.

Standards and policy mapping

For each applicable source, record:

Source title.

Issuing authority.

URL.

Version, revision, publication, or effective date.

Date accessed.

Exact requirement or recommendation.

Applicable actor, drug class, pharmacy type, channel, and jurisdiction.

Current repository evidence.

Gap.

Required action.

Approval owner.

Whether it blocks synthetic prototype, internal validation, pilot, or production.

Whether the source is under review, superseded, contract-dependent, or interpretation-dependent.

At minimum, assess current official requirements or guidance concerning:

Accreditation and operation of an Ontario pharmacy.

Operating an Internet pharmacy site, including the current policy review status.

Designated Manager and owner responsibilities.

Standards of operation and standards of practice.

Prescription authenticity, transmission, records, and professional review.

Prescription refill, renewal, transfer, and patient-choice requirements.

Schedule I, II, and III sales and the pharmacist’s required involvement.

Federal controlled substances and the precise v1 exclusion.

Medication procurement, inventory management, shortages, recalls, expiry, integrity, security, and disposal.

Protecting cold-chain products in storage and transit.

Preparation, dispensing records, technical checks, pharmacist checks, counselling, release, and documentation.

Delivery traceability, auditability, signatures, patient agents, exceptions, unsuccessful attempts, return, and retention.

Pickup, curbside, proxy pickup, unattended pickup, and remote-dispensing implications.

Central fill, remote dispensing, automated pharmacy systems, and why they remain excluded.

Cross-jurisdictional pharmacy services and delivery.

Patient choice, preferred-provider networks, transparency, conflicts of interest, fees, and transfers.

Price display, usual and customary fees, delivery fees, payer rules, ODB/HNS adjudication, reversals, and recordkeeping.

PHIPA collection, use, disclosure, agents, service providers, safeguards, access, correction, breach, and audit requirements.

Accessibility for Ontarians with Disabilities Act requirements and the approved WCAG target.

Courier contracts, privacy, security, training, insurance, subcontractors, location data, incident reporting, return, and exit.

Data residency, cross-border access, subprocessors, vendor support, retention, deletion, and backups.

Do not label the mapping legal, privacy, security, accessibility, professional, payer, or procurement approval.

Evidence interpretation notes

The OCP Internet Sites Policy states that it is under review. Treat its current text as a planning baseline, not a stable implementation specification.

OCP distinguishes an accredited pharmacy from registered pharmacy professionals. Use the correct concept in roles and UI.

OCP delivery guidance distinguishes pharmacy-to-courier custody from patient or patient-agent receipt. Preserve that distinction in state and language.

OCP delivery guidance discusses delivery-record retention separately from broader pharmacy care records. Do not infer one retention period for every dataset; obtain field-level approval.

Patient choice applies even when commercial networks, integrations, or fees make one pharmacy more convenient.

Controlled-substance scope requires exact federal and provincial review. Do not infer it from a generic scheduled flag.

Deliverables

docs/task-08/current-state-and-gap-analysis.md

docs/task-08/ontario-fulfilment-standards-and-policy-mapping.md

docs/task-08/production-dependency-and-decision-register.md

Workstream B — Threat model, trust boundaries, and data flows

Create a threat model covering request intake, prescription evidence, pharmacy choice, professional review, inventory, preparation, release, price and coverage, payment, pickup, courier booking, custody, tracking, handoff, failure, return, reconciliation, notifications, audit, and retention.

Required actors

Model at minimum:

Patient actor.

Patient subject.

Verified caregiver, delegate, substitute decision-maker, or authorized agent where applicable.

Authorized pickup or delivery recipient.

Pharmacist.

Pharmacy technician.

Pharmacy assistant or administrative staff member, if an existing approved role maps to it.

Designated Manager.

Pharmacy owner or authorized operations administrator.

Technical support staff.

AgentRx patient application.

AgentRx pharmacy application.

AgentRx operations application.

Task 03 prescription-evidence or intake service.

Task 05 identity and authorization service.

Task 07 communication service.

Task 09 billing, adjudication, or financial service.

Task 11 security and release service.

Accredited pharmacy.

Pharmacy practice management system.

Inventory or wholesaler system.

Payer or adjudicator.

Payment provider.

Courier dispatcher.

Courier delivery agent.

Courier webhook sender.

Address-verification provider, if proposed.

Audit service.

Reconciliation worker.

Error-monitoring and telemetry service.

Malicious unauthenticated user.

Cross-patient or cross-tenant authenticated user.

Compromised patient device.

Compromised pharmacy workstation.

Insider with excessive access.

Compromised pharmacy, payer, payment, courier, or subprocessor account.

Do not invent production roles. Map conceptual actors to existing roles or mark the mapping blocked.

Required assets

Include:

Patient actor-to-subject and delegate or agent relationships.

Pharmacy and tenant assignments.

Pharmacy choice and its provenance.

Pharmacy accreditation snapshot and verification evidence.

Prescription evidence and upload provenance.

OCR output and confidence metadata.

Authoritative prescription references.

Refill, renewal, clarification, and transfer requests.

Professional review tasks and decisions.

Inventory estimates, confirmations, reservations, expiry, lot, storage, and exception references.

Preparation and technical-check references.

Professional-check and release references.

Price, coverage, adjudication, payment, refund, and claim references.

Pickup plan and pickup-recipient authorization.

Delivery address and verification evidence.

Authorized-recipient grant and revocation state.

Package and outer-label data.

Route, custody, scan, temperature, tamper, and security data.

Proof of handoff.

Failure, return, quarantine, and stock-disposition records.

Vendor credentials, API tokens, webhook secrets, and signing keys.

Idempotency keys, state versions, inbox receipts, outbox events, and reconciliation evidence.

Notification intents and tracking links.

Audit, incident, retention, legal-hold, and deletion records.

Required threats

Assess at minimum:

Upload or OCR output treated as a valid prescription.

Patient-created refill, renewal, or transfer data treated as authoritative.

Forged, altered, duplicated, stale, unreadable, incomplete, or wrong-patient prescription evidence.

Wrong patient, subject, prescriber, pharmacy, tenant, request, prescription, product, package, claim, payment, shipment, or recipient.

Client-supplied role, subject, pharmacy, product, quantity, price, state, release, or recipient substitution.

Cross-tenant BOLA or IDOR.

Patient token accepted at a pharmacy-professional boundary or the reverse.

Pharmacy technician, assistant, administrator, support user, or courier performing a pharmacist-only action.

Expired or revoked delegate or authorized-recipient grant.

Patient choice overridden, hidden, preselected, manipulated, or made impractical.

False or stale accreditation information.

Pharmacy ranking influenced by undisclosed compensation.

Inventory cache, distributor availability, or historical stock shown as confirmed.

Race between confirmation, reservation, dispensing, cancellation, shortage, recall, expiry, or stock use.

Wrong DIN, strength, dosage form, quantity, manufacturer, package, or storage category.

Automatic substitution or product selection.

Product expiry, recall, damage, tamper, or temperature exception ignored.

Preparation starting before required verification.

Prepared status presented as professionally checked.

Ready status set without current release authorization.

Stale professional decision overwritten by a patient, worker, webhook, or duplicate tab.

Partial fulfilment misrepresented as complete.

Price estimate displayed as final.

Coverage estimate displayed as approved or guaranteed.

Adjudication, payment, and claim state conflated.

Duplicate charge, capture before approval, failed refund, uncertain payment, or charge after cancellation.

Claim created or submitted because of request, ready, delivery, or payment state.

Pickup by the wrong patient or unauthorized person.

OTP, telephone number, email, date of birth, address, or link possession used as sole identity proof.

Counselling or required professional interaction bypassed by pickup or delivery convenience.

Courier treated as the patient’s agent.

Courier collects a package before release.

Wrong package attached to a shipment.

Package or custody identifier enumeration.

Unapproved route stop, delay, relay, locker, depot, or subcontractor.

Lost, stolen, damaged, tampered, opened, diverted, or substituted package.

Temperature excursion, missing logger, stale logger, or fabricated temperature result.

Delivery to an unverified, changed, incomplete, unsafe, or out-of-scope address.

Unattended delivery without an approved exception.

Forged, replayed, copied, or wrong-recipient signature.

Handoff photo or identity document collecting excessive personal information.

Courier marks delivered without valid receipt evidence.

Patient disputes receipt after a provider-delivered event.

Failed delivery silently marked received.

Failed delivery or return silently restocked.

Return sent to the wrong pharmacy or custody lost during return.

Cancellation racing with preparation, release, courier pickup, payment, or delivery.

Pharmacy closure, courier outage, payer outage, payment outage, or system outage.

Provider timeout with an unknown side effect.

Duplicate, delayed, reordered, malformed, oversized, spoofed, or replayed webhook.

Vendor event for the wrong tenant, request, package, or environment.

Vendor status regression or mutation after terminal state.

PHI in URLs, page titles, notifications, labels beyond necessity, manifests, maps, tracking pages, courier apps, provider metadata, logs, traces, analytics, error reports, support tickets, screenshots, filenames, or referrers.

Raw address, signature, identification, location history, medication, prescription, or message content in general logs.

Vendor use of data for advertising, unrelated analytics, profiling, or AI training.

Support impersonation or excessive vendor-administrator access.

Denial-of-service, request flooding, stock hoarding, reservation abuse, price scraping, or recipient enumeration.

Retention deletion racing with active delivery, return, incident, chargeback, complaint, legal hold, or professional record obligation.

Accessibility failure causing wrong address, wrong pharmacy, wrong modality, missed exception, or inability to receive medication.

For every threat, document:

Scenario.

Entry point.

Asset.

Preconditions.

Likelihood.

Impact.

Preventive controls.

Detective controls.

Response controls.

Test evidence.

Residual risk.

Approval owner.

Trust-boundary diagrams

Create compact diagrams for:

Patient request to pharmacy review.

Pharmacy system to AgentRx status synchronization.

Price, adjudication, payment, and claim separation.

Pharmacy release to courier custody to patient or agent receipt.

Failure and return.

Notifications and authenticated tracking.

The diagrams must label:

PHI-bearing flows.

Opaque-reference-only flows.

Professional-decision boundaries.

External vendor boundaries.

Authoritative source for each state.

Synthetic-only adapters.

Blocked production connections.

Deliverables

docs/task-08/fulfilment-threat-model.md

docs/task-08/trust-boundaries-and-data-flows.md

Workstream C — Professional-responsibility and role-separation matrix

Required responsibility model

Create a matrix for every action with:

Responsible actor.

Accountable professional or operational owner.

Consulted role.

Informed role.

Required authorization.

Required evidence.

Whether professional judgement is involved.

Whether delegation is permitted.

Whether the action is available in the synthetic prototype.

Whether production approval is required.

At minimum, map the following:

Action

Patient or authorized agent

AgentRx

Pharmacy staff

Pharmacy technician

Pharmacist

Designated Manager

Courier

Initiate request

May request

Records and routes

May assist under policy

May assist within scope

May assist or review

Sets policy

None

Choose pharmacy

Chooses and may change

Records choice without steering

Must respect choice

Must respect choice

Must respect and facilitate choice

Ensures workflow supports choice

None

Upload evidence

May provide

Stores as unverified evidence

May receive

May process technical data within scope

Determines professional implications

Sets secure process

None

Determine prescription authenticity or validity

None

Cannot decide

Cannot independently decide unless authorized by law and policy

Only within established scope; map explicitly

Accountable professional decision

Ensures process

None

Clarify with prescriber or patient

Provides information

Coordinates task only

Administrative assistance only

Within approved scope

Makes professional determination

Ensures policy and staffing

None

Confirm inventory facts

May receive result

Records source-labelled confirmation

May count or retrieve under policy

May perform technical inventory work

Resolves clinical/product implications

Accountable for inventory policy

None

Select substitute or change therapy

May consent or decline

Cannot recommend or select

Cannot select

Cannot make therapeutic decision

Pharmacist-only professional decision unless law expressly provides otherwise

Ensures safeguards

None

Prepare product

None

Tracks task reference only

Only as permitted

May perform authorized technical work

Supervises or performs as required

Ensures staffing and procedures

None

Technical check

None

Cannot perform

No

Only where authorized and mapped

May perform

Ensures policy

None

Clinical or final professional check

None

Cannot perform

No

No pharmacist-only clinical judgement

Pharmacist-only

Ensures policy

None

Authorize release

Accepts terms but cannot self-release

Records explicit current decision only

Cannot self-authorize

Cannot perform pharmacist-only release

Pharmacist-only unless an exact approved rule states otherwise

Ensures policy

None

Mark ready

Receives notice only

Derives only after all guards

May stage after release

May stage within scope

Authorizes underlying release

Oversees operations

None

Hand package to courier

None

Records custody event

Authorized staff may perform

May perform under policy

Must have authorized release

Ensures courier procedure

Accepts pharmacy custody

Deliver package

Receives

Displays safe status

Monitors exception

Monitors technical issues

Controls professional exceptions

Owns vendor procedure

Performs transport only

Confirm patient receipt

Accepts or disputes

Records approved evidence

Reconciles

May assist

Resolves exceptions

Oversees procedure

Supplies raw handoff evidence

Decide return disposition

None

Never auto-restocks

Segregates item

May perform technical handling under policy

Makes or approves required professional disposition

Ensures return policy

Returns to pharmacy

Submit claim

None

Cannot submit

None

None

Existing authorized workflow only

Oversees compliance

None

This table is a planning baseline. Replace broad role labels with verified repository roles and current Ontario scope evidence. If a role cannot be mapped safely, block the action rather than granting it.

Required professional gates

Only the approved pharmacy workflow may set:

PRESCRIPTION_ACCEPTED

PRESCRIPTION_REJECTED

CLARIFICATION_RESOLVED

TRANSFER_AUTHORIZED

RENEWAL_AUTHORIZED

SUBSTITUTION_DECIDED

PRODUCT_AND_QUANTITY_CONFIRMED

PREPARATION_AUTHORIZED

PROFESSIONAL_CHECK_PASSED

PROFESSIONAL_CHECK_FAILED

COUNSELLING_REQUIREMENT_SATISFIED

RELEASE_AUTHORIZED

RELEASE_REVOKED

DELIVERY_EXCEPTION_APPROVED

RETURN_DISPOSITION_DECIDED

AgentRx may validate that an authenticated, assigned, authorized professional supplied a supported decision with required evidence. It may not recommend or infer the decision.

Critical role invariants

A patient cannot approve prescription validity, inventory, substitution, preparation, professional check, release, delivery exception, return disposition, or claim action.

A courier cannot approve pharmacy, clinical, dispensing, financial, or recipient-authorization state.

An administrator or support user cannot impersonate a pharmacist.

A pharmacy technician role cannot be silently promoted to pharmacist.

A pharmacist session cannot be inferred from a pharmacy-domain email, workstation, IP address, or tenant membership.

A professional decision remains attributable to the actual authenticated registrant and cannot be replaced by a generic pharmacy actor.

The Designated Manager’s operational accountability does not make every action a Designated Manager action.

Unknown roles fail closed.

Deliverables

docs/task-08/professional-responsibility-matrix.md

docs/task-08/role-and-transition-authorization-matrix.md

Workstream D — Domain contracts and schema proposal

Do not apply a production migration.

Produce server-only conceptual contracts for:

FulfilmentRequest

FulfilmentRequestItem

RequestType

PrescriptionEvidence

PrescriptionReviewTask

PrescriptionReviewDecisionReference

ClarificationCase

PharmacyChoice

PharmacyAccreditationSnapshot

FulfilmentPreference

InventoryEstimate

InventoryConfirmation

InventoryReservationReference

ProductException

PreparationTaskReference

TechnicalCheckReference

ProfessionalCheckReference

CounsellingRequirementReference

ReleaseAuthorization

PriceEstimate

CoverageEstimate

AdjudicationReference

PaymentReference

PickupPlan

PickupRecipientAuthorization

PickupHandoff

DeliveryPlan

DeliveryAddress

DeliveryAddressVerification

AuthorizedRecipientGrant

CustodyPackage

CustodyEvent

StorageAndSecurityRequirement

TemperatureEvidence

DeliveryAttempt

ProofOfHandoff

FulfilmentException

ReturnCase

StockDispositionReference

ExternalOperation

ExternalWebhookReceipt

ReconciliationCase

FulfilmentWorkItem

FulfilmentAuditEvent

Field-documentation rule

For every field, document:

Meaning.

Type and permitted values.

Nullable behavior.

Source of truth.

Trusted actor.

Whether it is PHI, personal information, commercially sensitive, security-sensitive, or non-sensitive.

Client-safe or server-only status.

Authorization requirement.

Encryption and tokenization requirement.

Retention owner and trigger.

Staleness and supersession behavior.

Concurrency behavior.

Audit behavior.

Whether production approval is required.

Do not place names, addresses, telephone numbers, email addresses, health-card numbers, prescription numbers, DINs, drug names, clinical content, payer identifiers, internal database IDs, or vendor secrets inside technical identifiers, idempotency keys, URLs, topics, queue names, log labels, metric labels, or correlation keys.

Minimum fulfilment-request fields

Opaque request identifier.

Opaque pharmacy or custodian scope.

Opaque patient-subject reference.

Opaque initiating-actor reference.

Actor-to-subject relationship reference.

Request type: NEW_PRESCRIPTION_REVIEW, REFILL_REVIEW, RENEWAL_REVIEW, or TRANSFER_REVIEW.

Requested pharmacy-choice reference.

Pickup or delivery preference.

Request source and provenance.

Prescription-evidence references.

Authoritative prescription reference, nullable until supplied by the pharmacy.

Canonical workflow state.

Orthogonal state references.

Current state version.

Created, submitted, last-transitioned, expired, cancelled, and closed times.

Assigned pharmacy queue and professional-review references.

Safe blocking reason codes.

Audit references.

The object name and UI must use “request,” not “order,” until an approved pharmacy integration defines a lawful order concept.

Minimum prescription-evidence fields

Opaque evidence identifier.

Evidence kind.

Server-owned storage reference.

Submitted-by actor and subject relationship.

Submitted time.

Source and provenance.

File integrity and malware-scan status.

OCR status, output reference, and confidence category.

Human-review status.

Pharmacy-system import status, if later approved.

Safe rejection or clarification reason.

Retention and deletion state.

OCR text, images, and clinical content must not enter general logs, analytics, audit events, notifications, or courier payloads.

Minimum pharmacy-choice fields

Opaque choice identifier.

Patient-subject and acting-actor references.

Selected accredited-pharmacy reference.

Selection source.

Whether alternatives were available and presented neutrally.

Choice time.

Supersession or withdrawal time.

Transfer implication.

Network, price, distance, delivery, or accessibility information shown, with source and expiry.

Consent or acknowledgement reference where required.

Do not store a ranking rationale based on inferred health status or undisclosed commercial preference.

Minimum inventory fields

Estimate

Opaque estimate identifier.

Pharmacy scope.

Opaque product candidate reference.

Safe availability category.

Approximate quantity category, only if approved.

Source.

Observed time.

Expires time.

Confidence category.

Explicit NOT_CONFIRMED indicator.

Disclaimer version.

Confirmation

Opaque confirmation identifier.

Authoritative pharmacy-system or authorized-actor reference.

Product identity reference.

Strength, form, quantity, manufacturer, and package confirmation references as required.

On-hand and available-to-dispense distinction.

Expiry acceptability.

Recall and quarantine status.

Storage and integrity status.

Substitution or clarification requirement.

Reservation reference and expiry, if supported.

Confirmation time and state version.

Client views should receive the minimum safe availability result, not raw pharmacy stock data.

Minimum professional-check and release fields

Opaque decision identifier.

Request and item references.

Pharmacy and tenant scope.

Authenticated registrant reference.

Registrant type and current authorization evidence.

Assigned-pharmacy evidence.

Decision: pass, fail, revoke, or pending.

Safe structured reason code.

Decision time.

Policy and workflow version.

Source system and source record version.

State version consumed.

Superseded-by reference.

Audit reference.

Do not copy clinical rationale into technical events or audit records. Store clinically necessary rationale only in the authoritative pharmacy or clinical record.

Minimum price and coverage fields

Opaque estimate identifier.

Source.

Estimate type.

Currency.

Amount, range, or unavailable status.

Included and excluded fee categories.

Assumptions.

Observed and expiry times.

Adjudication status.

Patient responsibility status.

Finality indicator fixed to ESTIMATE until authoritative adjudication.

Disclaimer version.

Do not store payer credentials, full policy numbers, raw health-card numbers, or card data in this domain.

Minimum pickup fields

Opaque pickup-plan identifier.

Pharmacy reference.

Request and package references.

Readiness and release references.

Pickup window expressed as a safe range.

Patient or authorized-recipient reference.

Recipient-authorization status and expiry.

Counselling or consultation requirement reference.

Accessibility accommodation reference.

Handoff status.

Safe proof reference.

Failed or expired pickup state.

Return or disposition reference.

Minimum delivery and custody fields

Opaque delivery-plan, package, and shipment references.

Pharmacy and tenant scope.

Request and package relationship.

Delivery-address reference, encrypted separately.

Address-verification state and time.

Approved service area and jurisdiction.

Authorized-recipient reference.

Release-authorization reference.

Storage, temperature, security, and direct-route requirement category.

Courier and service-level reference.

Courier-booking reference.

Current custody holder.

Current custody state and version.

Package-seal or tamper-evidence reference.

Pickup, in-transit, attempted, handoff, failure, return-started, and return-confirmed times.

Proof-of-handoff reference.

Exception and reconciliation references.

Do not store medication or clinical content in courier-facing package identifiers or tracking metadata.

Minimum proof-of-handoff fields

Opaque proof identifier.

Package and delivery-attempt references.

Recipient type: patient or pre-authorized agent.

Recipient authorization reference.

Identity-check method category and safe result.

Signature-required status.

Signature captured status.

Approved exception reference, if no signature.

Handoff time and timezone.

Delivery-agent reference.

Coarse outcome.

Evidence-integrity digest.

Pharmacy acceptance and reconciliation state.

Do not retain identity-document images, facial images, biometric templates, raw signatures, handoff photos, or exact geolocation unless a separately approved necessity, privacy, retention, and vendor review permits the specific field.

Deliverable

docs/task-08/fulfilment-contracts-and-schema-proposal.md

Workstream E — Request intake, pharmacy choice, and prescription-evidence workflow

Request intake

The patient or authorized agent may:

Select a request type.

Identify the intended patient through the Task 05 actor-to-subject boundary.

Choose a pharmacy.

Select pickup or delivery as a preference.

Provide unverified prescription evidence.

Provide an existing pharmacy or prescriber contact through an approved, minimum-necessary workflow.

Review and correct their request.

Submit once.

Withdraw or cancel when cancellation remains operationally safe.

Respond to a clarification request.

The patient-facing interface must state:

“This is a request for pharmacy review.”

“An upload is not confirmed as a valid prescription.”

“Availability, price, coverage, timing, pickup, and delivery are not confirmed until the pharmacy completes its review.”

“A pharmacist may need to contact you, your prescriber, or another pharmacy.”

“You may choose another pharmacy.”

Do not use:

“Order confirmed.”

“Prescription approved.”

“Refill guaranteed.”

“Covered.”

“In stock.”

“Ready.”

“Shipped.”

“Delivered.”

unless the precise authoritative event and all guards support the wording.

Request-type behavior

New prescription review

Accept evidence only.

Do not infer authenticity, completeness, prescriber authority, or patient match.

Create a pharmacy review task.

Block inventory reservation, preparation, adjudication, payment, pickup, and delivery until the approved pharmacy workflow supplies the required state.

Refill review

Treat the patient’s selection as a request.

Do not infer remaining quantity, interval eligibility, refill validity, prescriber status, or clinical appropriateness.

Require the pharmacy system or authorized registrant to confirm.

Renewal review

Treat renewal as a request for professional review.

Do not promise that the pharmacist or prescriber can or will renew.

Do not preselect a drug, quantity, duration, or prescriber.

Route to the approved professional workflow.

Transfer review

Record the patient’s request and chosen receiving pharmacy.

Preserve the patient’s right to change the choice before the transfer becomes authoritative.

Do not perform the legal or professional transfer through a generic data copy.

Do not call a copy an authorized prescription.

Require the approved pharmacy-to-pharmacy workflow.

Keep controlled-substance transfers blocked in v1.

Pharmacy choice

The synthetic workflow must:

Present more than one obviously synthetic accredited-pharmacy fixture where choice is being tested.

Avoid a preselected pharmacy.

Explain any functional difference such as pickup only, delivery unavailable, accessibility feature, operating hours, or unavailable integration.

Show the source and freshness of any accreditation, service, distance, fee, network, or delivery information.

Avoid “recommended,” “preferred,” “best,” or “fastest” labels without an approved, transparent, non-steering policy.

Allow the patient to search or provide another pharmacy.

Record the patient’s choice and its provenance.

Permit change or transfer without punitive friction.

Avoid bundling pharmacy choice with consent to marketing, data sharing, or payment.

Production accreditation must be verified against an approved current source. A stale directory entry must not be treated as proof.

Clarification

Clarification may concern:

Patient or subject mismatch.

Evidence quality or completeness.

Prescriber transmission.

Refill status.

Transfer details.

Product or quantity uncertainty.

Inventory shortage.

Pickup or delivery feasibility.

Authorized recipient.

Address.

Price or payment.

The system may identify missing workflow prerequisites. It must not generate a clinical clarification, answer a prescriber question, or resolve professional uncertainty.

Cancellation

Cancellation behavior must depend on the current orthogonal states:

Before pharmacy acceptance: close the request safely.

After professional review but before preparation: notify the pharmacy queue and await acknowledgement.

During or after preparation: create a pharmacist or authorized-pharmacy work item.

After release: do not assume the product can be returned to stock.

After courier pickup: request an approved intercept or return, but do not promise it.

After handoff: cancellation is no longer a delivery reversal; use the approved pharmacy return or disposal process.

During uncertain external state: enter reconciliation.

Patient cancellation never deletes the pharmacy record, audit trail, custody evidence, payment evidence, or legally retained documentation.

Deliverables

docs/task-08/request-and-prescription-evidence-workflow.md

docs/task-08/pharmacy-choice-and-transfer-boundary.md

Workstream F — Orthogonal state model and canonical state machine

Do not implement one mutable status field as the only source of truth. Use orthogonal state dimensions with a derived canonical workflow state.

Required state dimensions

Request state

DRAFT

SUBMITTED

ACCEPTED_FOR_REVIEW

NEEDS_CLARIFICATION

WITHDRAWAL_REQUESTED

CANCELLED

REJECTED

EXPIRED

CLOSED

UNKNOWN

Prescription-review state

NOT_PROVIDED

EVIDENCE_RECEIVED

UNREVIEWED

REVIEW_IN_PROGRESS

CLARIFICATION_REQUIRED

ACCEPTED_BY_PHARMACY

REJECTED_BY_PHARMACY

TRANSFER_PENDING

RENEWAL_PENDING

PROFESSIONAL_DECISION_REQUIRED

UNKNOWN

Inventory state

UNKNOWN

ESTIMATE_ONLY

CONFIRMATION_PENDING

CONFIRMED_AVAILABLE

CONFIRMED_PARTIAL

CONFIRMED_UNAVAILABLE

RESERVED

RESERVATION_EXPIRED

SUBSTITUTION_DECISION_REQUIRED

RECALL_OR_QUARANTINE

EXPIRY_EXCEPTION

STORAGE_EXCEPTION

INTEGRITY_EXCEPTION

Preparation state

NOT_AUTHORIZED

PENDING

IN_PREPARATION

PREPARED

TECHNICAL_CHECK_PENDING

TECHNICAL_CHECK_COMPLETE

REWORK_REQUIRED

STOPPED

UNKNOWN

Professional state

REVIEW_PENDING

PROFESSIONAL_CHECK_PENDING

PROFESSIONAL_CHECK_PASSED

PROFESSIONAL_CHECK_FAILED

COUNSELLING_PENDING

RELEASE_AUTHORIZED

RELEASE_REVOKED

UNKNOWN

Fulfilment-mode state

PREFERENCE_PENDING

PICKUP_SELECTED

DELIVERY_SELECTED

MODE_CHANGE_PENDING

MODE_CONFIRMED

MODE_UNAVAILABLE

UNKNOWN

Financial state

NOT_STARTED

ESTIMATE_AVAILABLE

ADJUDICATION_PENDING

ADJUDICATED

PATIENT_CONFIRMATION_PENDING

PAYMENT_NOT_REQUIRED

PAYMENT_PENDING

PAYMENT_AUTHORIZED

PAYMENT_CAPTURED

PAYMENT_FAILED

CANCELLATION_PENDING

REFUND_PENDING

REFUNDED

RECONCILIATION_REQUIRED

UNKNOWN

All financial states are synthetic in v1.

Custody state

NO_PACKAGE

PHARMACY_CUSTODY

PICKUP_HANDOFF_PENDING

COURIER_BOOKING_PENDING

COURIER_ACCEPTED

IN_TRANSIT

DELIVERY_ATTEMPTED

PATIENT_RECEIVED

AUTHORIZED_AGENT_RECEIVED

DELIVERY_FAILED

CUSTODY_EXCEPTION

RETURN_REQUESTED

RETURNING_TO_PHARMACY

RETURNED_TO_PHARMACY

CUSTODY_UNKNOWN

Reconciliation state

NOT_REQUIRED

PENDING

IN_PROGRESS

RESOLVED_NO_EFFECT

RESOLVED_APPLIED

MANUAL_REVIEW_REQUIRED

UNRESOLVED

Required canonical workflow states

The product must expose the original required states with precise definitions:

REQUESTED: a request was submitted; no prescription validity, inventory, price, or fulfilment is implied.

VERIFICATION: an authorized pharmacy workflow is reviewing prescription evidence, patient relationships, or request eligibility.

CLARIFICATION: required information is missing or professional clarification is pending.

INVENTORY: authoritative product and availability facts are pending or being confirmed.

PREPARATION: the pharmacy has authorized and begun its preparation workflow; release is not implied.

PHARMACIST_CHECK: the required professional check or counselling gate is pending.

READY: current professional release is authorized, the item remains in pharmacy custody, and the approved pickup or delivery prerequisites are complete.

IN_TRANSIT: the released package is in approved courier custody; patient or authorized-agent receipt is not implied.

HANDED_OFF: the patient or pre-authorized agent took custody through an accepted proof-of-handoff event. Pharmacy-to-courier handoff does not qualify.

FAILED: the requested path cannot safely continue and requires an explicit next step.

RETURNING: the package is moving through an approved return path; receipt by the pharmacy and stock disposition are still pending.

RETURNED: physical custody is confirmed back at the pharmacy; stock disposition remains separate.

CANCELLED: cancellation was accepted and all required operational consequences are acknowledged or reconciled.

UNKNOWN: contradictory or unmapped state; fail closed.

Required transition register

For every transition, document:

Source state on every affected dimension.

Destination state on every affected dimension.

Permitted actor.

Required session, role, assignment, pharmacy, tenant, and subject checks.

Required professional and external evidence.

Idempotency behavior.

State-version and concurrency behavior.

Side effects.

Audit event.

Patient message.

Pharmacy message.

Courier message, if any.

Inventory effect.

Financial effect.

Custody effect.

Assessment and claim effect.

Invalid-transition behavior.

Reconciliation behavior.

Critical transitions

At minimum, implement and test:

Draft to submitted.

Submitted to accepted for review.

Evidence received to review in progress.

Review to clarification required.

Clarification response to review resumed.

Review to pharmacy accepted or rejected.

Pharmacy accepted to inventory confirmation pending.

Inventory confirmation to available, partial, unavailable, substitution required, or exception.

Confirmed available to preparation pending.

Preparation pending to in preparation.

In preparation to prepared.

Prepared to professional check pending.

Professional check pending to passed or failed.

Passed to counselling pending or release authorized.

Release authorized to ready for pickup.

Release authorized to courier booking pending.

Pharmacy custody to courier accepted.

Courier accepted to in transit.

In transit to delivery attempted.

Delivery attempted to patient received, authorized-agent received, failed, or custody exception.

Failed delivery to return requested.

Return requested to returning.

Returning to returned to pharmacy.

Returned to stock-disposition pending.

Any eligible pre-handoff state to cancellation requested.

Cancellation requested to cancelled, denied, or reconciliation required.

Any external timeout to reconciliation pending.

Any unknown or contradictory event to fail-closed unknown.

Critical transition rules

Prove that:

Request submission cannot accept a prescription.

OCR completion cannot accept a prescription.

Prescription acceptance cannot confirm inventory.

Inventory confirmation cannot authorize preparation when another professional guard remains incomplete.

Preparation cannot pass professional check.

Technical check cannot substitute for a pharmacist-only clinical or final professional decision.

Payment cannot authorize release.

Courier availability cannot authorize release.

A pharmacy staff member, patient, courier, worker, or webhook cannot self-create a pharmacist release.

READY cannot exist without a current release authorization.

Release revocation removes readiness and blocks future handoff.

Pharmacy-to-courier handoff cannot create HANDED_OFF.

A delivered webhook cannot create patient receipt without valid mapping, proof, and pharmacy acceptance.

Failed delivery cannot create patient receipt.

Patient absence, timeout, cancellation, or notification delivery cannot create receipt.

A return cannot automatically restore available inventory.

A claim cannot be created by request, preparation, ready, payment, shipment, delivery, return, or cancellation state.

A stale browser or duplicated worker cannot overwrite a newer professional, custody, financial, or cancellation decision.

Unknown states fail closed.

Deliverables

docs/task-08/orthogonal-state-model.md

docs/task-08/fulfilment-state-machine.md

Workstream G — Inventory, preparation, professional check, and release

Inventory estimates

An estimate must:

Be labelled “estimate” or “availability not confirmed.”

Identify the pharmacy scope.

Record its source and observed time.

Expire quickly under an approved policy.

Avoid exposing exact stock counts to patients by default.

Avoid implying reservation.

Avoid implying product, strength, dosage form, manufacturer, package, expiry, or storage suitability.

Never enable preparation, payment capture, or fulfilment by itself.

Inventory confirmation

Production confirmation must come from:

An approved pharmacy-system response; or

An authenticated, assigned, authorized pharmacy actor using an approved procedure.

The confirmation workflow must address:

Correct pharmacy.

Correct patient request and authoritative prescription.

Correct product identity.

Strength and dosage form.

Required quantity.

On-hand versus available-to-dispense quantity.

Expiry.

Recall, quarantine, or damaged status.

Storage and integrity.

Reservation or allocation.

Shortage.

Partial availability.

Substitution or prescriber-clarification requirement.

Confirmation time and expiry.

The system may identify that facts are incomplete. It must not recommend a substitute, alternate strength, alternate formulation, split quantity, transfer, or clinical response.

Reservation

If a production pharmacy system supports reservation:

The pharmacy system remains authoritative.

A reservation is not a dispense, professional check, release, sale, or patient ownership event.

Reservations require opaque identifiers and expiry.

Duplicate reservation requests must be idempotent.

Expiry, cancellation, shortage, recall, use by another workflow, and manual release must reconcile.

Patient-visible wording must remain truthful.

Reservation abuse and stock hoarding must be rate-limited and monitored.

Preparation

AgentRx may:

Create or display an approved preparation task reference.

Receive safe status from the pharmacy system.

Prevent contradictory transitions.

Record assigned workflow references and audit events.

AgentRx must not:

Generate dispensing labels.

Select the drug product.

Calculate or change quantity.

Direct compounding.

Direct repackaging.

Perform technical or clinical checks.

Decide counselling.

Mark a prescription dispensed.

Authorize release.

Professional check and release

Release requires:

Current authenticated professional session.

Correct professional audience and actor type.

Active registration or approved current authorization evidence.

Correct pharmacy and tenant.

Current assignment.

Correct patient and request relationship.

Authoritative prescription reference.

Complete inventory and preparation prerequisites.

Required technical and professional checks.

Required counselling or consultation plan.

No active recall, expiry, storage, integrity, substitution, clarification, or custody blocker.

Current state version.

Task 11 production gate.

The system may show missing prerequisites. It must not recommend PASS, FAIL, RELEASE, or a clinical reason.

Readiness

READY must be derived server-side from:

RELEASE_AUTHORIZED.

Valid fulfilment mode.

Package still in pharmacy custody.

No cancellation, revocation, exception, or reconciliation blocker.

Valid pickup recipient or approved delivery plan.

Current time within approved release validity.

If any guard changes, readiness must be removed or marked stale.

Multiple request items

Each item requires independent professional and inventory state.

The overall request may be ready only when every included item is ready or an authorized pharmacist records an approved split or partial plan.

The patient must see which items are included without receiving misleading completeness language.

One item’s release must not release another item.

A package-to-item manifest remains server-only and pharmacy-controlled.

Deliverables

docs/task-08/inventory-confirmation-and-reservation-contract.md

docs/task-08/preparation-check-and-release-boundary.md

Workstream H — Price, coverage, adjudication, payment, and claim boundary

Price and coverage estimates

Every estimate must:

Say that the amount is not final.

Show source and freshness.

Distinguish drug cost, dispensing fee, professional service fee, delivery fee, tax where applicable, and unknown components.

Avoid a guaranteed “covered” or “free” label.

State that payer rules, eligibility, deductible, copayment, formulary, quantity, product, prescriber, pharmacy network, coordination of benefits, and adjudication can change the amount.

Expire when the prescription, product, quantity, pharmacy, payer, date, or policy changes.

Require patient confirmation after material change.

Do not use an estimate to:

Choose a drug or substitute.

Select a pharmacy automatically.

Suppress a transfer option.

Begin preparation contrary to pharmacy policy.

Authorize payment capture.

Mark a claim eligible.

Promise reimbursement.

Adjudication

Production adjudication remains blocked. The contract must:

Keep request, estimate, adjudication, claim, payment, and receipt states separate.

Use an opaque pharmacy-owned transaction reference.

Prevent raw payer identifiers from entering logs or URLs.

Handle accepted, rejected, reversed, duplicate, timeout, uncertain, and stale responses.

Reconcile late responses and reversals.

Treat payer messages as financial information, not clinical instructions.

Avoid exposing raw payer rejection text to an unauthorized patient or general support user.

Preserve the existing billing service’s authority.

Payment

The synthetic model may include:

PAYMENT_NOT_REQUIRED

PAYMENT_PENDING

PAYMENT_AUTHORIZED

PAYMENT_CAPTURED

PAYMENT_FAILED

CANCELLATION_PENDING

REFUND_PENDING

REFUNDED

RECONCILIATION_REQUIRED

Production policy must decide:

Whether and when authorization is permitted.

Whether and when capture is permitted.

What happens when price changes.

How partial fulfilment is handled.

What happens after preparation but before handoff.

What happens after failed pickup or delivery.

How cancellation, refund, chargeback, and dispute work.

Whether delivery fees are refundable.

How accessibility accommodations affect fees.

Which ledger is authoritative.

AgentRx must not store raw card details or security codes.

Claim boundary

A fulfilment event must never itself:

Create a claim.

Mark a claim eligible.

Set a billing code or PIN.

Submit a claim.

Reverse a claim.

Infer professional-service completion.

Infer that a prescription was dispensed.

Before any future claim action, the existing billing service must recheck:

Current professional completion.

Current prescription and patient relationships.

Current pharmacy and registrant authorization.

Applicable payer rules.

Required documentation.

Current cancellation and return state.

Current state version.

Task 11 release gate.

Deliverables

docs/task-08/price-coverage-payment-and-claim-boundary.md

docs/task-08/financial-reconciliation-runbook.md

Workstream I — Pickup workflow

Patient pickup

The patient may receive a ready notice only after:

Professional release is current.

The package is secured in pharmacy custody.

Required counselling or consultation arrangements are satisfied or clearly scheduled under approved policy.

The pickup location and safe window are current.

No cancellation, revocation, storage, integrity, recall, or reconciliation blocker exists.

At pickup, the pharmacy workflow must verify:

Correct request and package.

Correct patient or current authorized recipient.

Approved identity-check method.

Current release authorization.

Required counselling or consultation.

Any payment requirement.

Package integrity.

Handoff time.

Do not treat a portal screen, QR code, pickup code, telephone number, email address, date of birth, address, or link possession alone as sufficient identity proof.

Authorized pickup recipient

The authorization model must include:

Patient-subject reference.

Acting patient or legally authorized agent.

Recipient reference.

Relationship category.

Scope.

Pharmacy and request scope.

Effective and expiry times.

Revocation.

Capture method.

Pharmacy confirmation where required.

Do not expose the patient’s medication or ailment to the recipient beyond the approved care and consent boundary.

Pickup failure and expiry

If the patient or authorized recipient does not collect the package:

Do not mark it handed off.

Keep it secured in pharmacy custody.

Expire the pickup window under pharmacy policy.

Create an approved pharmacy work item.

Recheck product integrity, expiry, storage, counselling, price, payment, and release before rescheduling.

Do not automatically restock, refund, destroy, or re-dispense.

Use Task 07 only for approved generic notices.

Excluded pickup models

The synthetic prototype must not activate:

Unattended lockers.

Curbside handoff without an approved professional and custody procedure.

Third-party retail pickup points.

Remote dispensing locations.

Automated pharmacy systems.

Delivery-agent pickup represented as patient pickup.

Deliverable

docs/task-08/pickup-and-authorized-recipient-workflow.md

Workstream J — Delivery, chain of custody, exceptions, failure, and return

Delivery eligibility

Before courier booking, recheck:

Correct authenticated pharmacy actor.

Correct pharmacy, tenant, patient, request, and package.

Current professional release.

Current delivery preference.

Current address and service area.

Current patient or authorized-recipient plan.

Approved delivery method.

Storage, temperature, security, tamper, and timing requirements.

No excluded drug class.

No cross-jurisdictional blocker.

No cancellation, recall, expiry, integrity, payment, or reconciliation blocker.

Current state version.

Approved courier and contract version.

Task 11 production gate.

Address verification

The design must:

Let the patient or authorized agent provide and confirm the address.

Avoid inferring an exact address from GPS, IP address, device location, or prior history.

Record address source, verification method, confirmation time, service area, and jurisdiction.

Require reconfirmation after material change or expiry.

Keep the raw address encrypted and access-controlled.

Send only the minimum necessary address data to the approved courier.

Keep exact address out of audit events, logs, metrics, analytics, notifications, evidence filenames, and public tracking pages.

Provide an accessible manual alternative to address autocomplete or maps.

Authorized delivery recipient

The recipient must:

Be specified in advance under the pharmacy’s approved process.

Be distinct from the courier.

Have current request and pharmacy scope.

Have an effective, non-revoked authorization.

Be subject to the approved identity and signature process.

Do not let the courier create, change, or self-approve a recipient authorization.

Package and label

The design must distinguish:

The legally and professionally required prescription container label controlled by the pharmacy.

The outer courier label and transport metadata controlled by the approved minimum-necessary policy.

The outer label and courier payload must not include medication, strength, dosage, ailment, prescriber, health number, assessment, or other clinical content unless a specific legal or operational necessity is documented and approved.

Package controls must address:

Opaque package identifier.

Package-to-request manifest stored server-side.

Tamper evidence.

Light, moisture, temperature, orientation, and security category where applicable.

No reuse of an identifier across patients.

Scan validation at each custody transfer.

Segregation of excluded or exceptional products.

Custody lifecycle

Model:

Package secured in pharmacy custody.

Courier booking requested.

Courier booking acknowledged.

Authorized courier agent arrives.

Pharmacy validates courier and package.

Courier accepts custody.

Direct transit begins.

Approved route event or exception occurs.

Recipient identity and authorization are checked.

Signature or approved exception evidence is captured.

Patient or agent takes custody.

Pharmacy accepts and reconciles the proof.

If unsuccessful, custody remains traceable through return.

The pharmacy remains responsible under its approved process until valid patient or agent receipt is established.

Direct route and stops

Default to direct pharmacy-to-recipient delivery.

Stops, delays, relays, depots, subcontractors, lockers, or route changes require an approved model and pharmacist or pharmacy authorization where required.

Do not expose continuous courier location to the patient unless necessity, privacy, security, and vendor review approve it.

Do not store full route history by default.

Record only safe route-event categories and required evidence.

Temperature and storage

The contract must support:

Required temperature category.

Approved packaging method reference.

Packaging time.

Maximum approved transit duration.

Logger or evidence requirement.

Safe result category.

Excursion or missing-evidence state.

Pharmacist review.

Quarantine and return.

The system must not decide that a temperature-exposed product remains suitable. It may block handoff or future use pending pharmacist review.

Proof of handoff

Default Schedule I delivery behavior must reflect the current approved Ontario review, including traceability, auditability, and receipt evidence.

The synthetic workflow must support:

Patient signature.

Pre-authorized agent signature.

Accessible witnessed mark.

Pharmacist-approved no-signature exception with structured reason and required documentation.

Handoff denial.

Recipient not available.

Recipient identity mismatch.

Recipient authorization expired or revoked.

Patient disputes receipt.

An unattended-drop preference or advance waiver must not bypass the approved signature and exception policy.

Failed delivery

Failure must:

Preserve the current custody holder.

Preserve package integrity and storage requirements.

Set DELIVERY_FAILED or CUSTODY_EXCEPTION, never receipt.

Create a pharmacy work item.

Prevent an automatic second attempt unless the approved policy and product conditions permit it.

Recheck recipient, address, product integrity, storage, release, payment, and time before another attempt.

Notify the patient only through an approved generic Task 07 message.

Begin an approved return when retry is unsafe or unavailable.

Return

The return lifecycle must:

Create a return case.

Identify the current custody holder.

Confirm return authorization and destination.

Maintain storage, security, tamper, and temperature requirements.

Record return transit.

Confirm physical receipt at the correct pharmacy.

Segregate the returned package.

Create a pharmacist or approved pharmacy-professional disposition task.

Keep saleable inventory unchanged until an authoritative disposition.

Address refund, claim reversal, complaint, incident, and patient follow-up separately.

Custody exceptions

Model at minimum:

Courier no-show.

Wrong courier.

Wrong package.

Package not released.

Route delay.

Unapproved stop.

Recipient unavailable.

Wrong recipient.

Identity mismatch.

Recipient authorization expired or revoked.

Address inaccessible or unsafe.

Delivery attempted outside approved window.

Signature failure.

Provider says delivered but proof is missing.

Patient disputes delivery.

Lost package.

Theft.

Tamper.

Damage.

Temperature excursion.

Logger missing or unreadable.

Weather or outage delay.

Courier device offline.

Duplicate scan.

Reordered event.

Return delayed.

Return to wrong location.

Custody unknown.

For each exception, document:

Immediate fail-closed state.

Who currently has custody.

Required containment.

Required pharmacy review.

Patient communication.

Courier escalation.

Privacy or security escalation.

Medication-incident or quality-improvement assessment owner.

Financial and claim hold.

Evidence-preservation requirement.

Resume, retry, replace, return, quarantine, or close conditions.

The application must not automatically decide that an event is a reportable privacy breach, medication incident, controlled-substance loss, or legally reportable event.

Deliverables

docs/task-08/delivery-and-chain-of-custody-model.md

docs/task-08/delivery-exception-and-return-runbook.md

Workstream K — External integration contracts, idempotency, webhooks, and reconciliation

Required adapter boundaries

Design separate adapters for:

Pharmacy practice management system.

Inventory system.

Payer or adjudicator.

Payment provider.

Courier.

Address-verification service.

Task 07 notifications.

Existing billing or claim service.

The synthetic prototype must use deterministic local adapters and make no network calls.

Contract documentation

For every external operation, document:

Purpose.

Direction.

Authoritative source.

Request schema.

Response schema.

PHI and personal-information fields.

Minimum-necessary transformation.

Authentication.

Authorization.

Encryption.

Idempotency key.

Correlation reference.

Timeout behavior.

Retry behavior.

Ordering assumptions.

Acknowledgement semantics.

Uncertain-outcome behavior.

Webhook behavior.

Reconciliation method.

Cancellation behavior.

Retention.

Audit.

Safe error mapping.

Production approval owner.

Idempotency

Prove:

One patient submission creates one logical request.

Duplicate clicks, refreshes, tabs, devices, workers, events, and retries do not create duplicate requests or side effects.

The idempotency key is scoped to authenticated actor, tenant, operation, and resource.

Idempotency keys contain no PHI.

Reusing a key with a different payload is rejected.

Completed responses can be replayed safely.

In-progress operations return a safe deterministic status.

Expiry cannot permit an unsafe duplicate external effect.

A provider timeout with uncertain outcome enters reconciliation before retry.

A vendor’s idempotency claim is verified technically and contractually before reliance.

Webhook processing

Require:

Signature verification.

Timestamp tolerance.

Replay protection.

Environment binding.

Vendor, account, tenant, and pharmacy binding.

Content type and size limits.

Schema versioning.

Event-type allowlist.

Inbox persistence before processing.

Event-ID deduplication.

Payload-integrity digest.

Safe mapping from vendor reference to opaque internal reference.

Ordering and regression rules.

Retry-safe processing.

Dead-letter handling.

Reconciliation.

Body-free audit events.

No webhook may directly:

Accept or reject a prescription.

Confirm a professional clarification.

Select a product or substitute.

Pass a professional check.

Authorize release.

Mark counselling complete.

Create or submit a claim.

Mark payment final without the financial source-of-truth workflow.

Mark patient receipt without accepted handoff evidence.

Restock a return.

Reconciliation

Create reconciliation workflows for:

Request submission with unknown pharmacy acknowledgement.

Inventory confirmation mismatch.

Reservation timeout.

Preparation or release status conflict.

Price or adjudication mismatch.

Payment authorization, capture, cancellation, or refund uncertainty.

Courier booking uncertainty.

Courier pickup mismatch.

Delivered event without proof.

Proof received without delivered event.

Patient receipt dispute.

Failed return.

Duplicate or reordered webhook.

Vendor outage.

Local outage.

State-version conflict.

Reconciliation must:

Avoid a second external effect until safe.

Preserve the original event and digest.

Requery an approved authoritative source where available.

Use a safe manual work item where automation cannot prove the outcome.

Record resolution without rewriting history.

Never invent a professional, physical-custody, financial, or claim event.

Deliverables

docs/task-08/integration-contracts.md

docs/task-08/idempotency-webhook-and-reconciliation-design.md

docs/task-08/vendor-assessment-scorecard.md

Workstream L — Privacy, security, tracking, notifications, and vendor controls

Data minimization

Collect and disclose only what is necessary for:

Pharmacy review.

Approved inventory and fulfilment coordination.

Patient choice.

Pickup verification.

Delivery address and recipient authorization.

Courier transport.

Proof of handoff.

Failure, return, payment, and reconciliation.

Do not send clinical content to a courier, payment provider, address provider, analytics service, general support tool, or unsecured communication channel.

Tracking

Patient tracking must:

Require an authenticated Task 05 session.

Reauthorize every read.

Use an opaque internal reference.

Expose only the minimum safe state.

Avoid medication, prescription, ailment, prescriber, pharmacy relationship, recipient, or exact address in page titles and URLs.

Avoid reusable bearer tokens in query strings.

Use Cache-Control: no-store and approved protected-route cache controls.

Use a strict referrer policy.

Avoid third-party analytics and session replay.

Avoid browser storage of PHI.

Avoid public courier-tracking links unless a separately approved design proves they are non-authorizing and minimum necessary.

Notifications

All external notices must go through Task 07 and remain generic. Examples:

“There is an update in your secure account.”

“Please sign in to review an action.”

Do not include:

Pharmacy name where it reveals a health relationship unless approved.

Medication or prescription.

Pickup or delivery contents.

Price, coverage, payment, or claim detail.

Address.

Recipient name.

Courier name or tracking number if that creates a sensitive link.

Failure reason.

Message excerpt.

Bearer token.

Provider delivery is not proof that the patient read or understood the notice.

Courier data

The production review must define:

Minimum recipient name or pseudonym requirements.

Minimum address and contact information.

Whether a telephone number is necessary.

Whether the courier may contact the recipient directly.

Approved message scripts.

Outer-label content.

Driver-visible information.

Dispatcher-visible information.

Subcontractor access.

Location and route retention.

Proof-of-handoff evidence.

Support access.

Incident handling.

Data return and deletion.

Security controls

Define:

Encryption in transit and at rest.

Field-level encryption for address, contact, and proof data.

Key ownership and rotation.

Service-to-service authentication.

Least privilege.

Tenant and pharmacy isolation.

Role and assignment checks.

CSRF and origin protections.

Webhook signing and replay prevention.

Secret storage and rotation.

Vendor account MFA.

Vendor support access approval and audit.

Protected-route caching.

Content Security Policy.

Referrer policy.

Rate limits and abuse controls.

Vulnerability and dependency management.

Availability monitoring.

Backup encryption and expiry.

Incident containment and credential revocation.

Vendor outage and exit.

Subprocessor-change handling.

Prohibited data locations

Enforce tests that prevent PHI, personal data, or secrets in:

URLs and query strings.

Page titles.

Browser history.

Browser storage.

Analytics.

Session replay.

Metric labels.

Traces and spans.

Application logs.

Error breadcrumbs.

Support tickets.

Queue names and routing keys.

Idempotency keys.

Webhook event IDs.

Notification previews.

Calendar entries.

Screenshot and evidence filenames.

Public tracking pages.

Courier labels beyond approved necessity.

Courier custom metadata.

Payment metadata.

Vendor review

For every proposed pharmacy, payer, payment, courier, address, or notification vendor, obtain:

Contract and data-processing terms.

Confidentiality terms.

Security evidence.

Accessibility evidence.

Residency and cross-border data-flow evidence.

Subprocessor list.

Support-access model.

Retention, deletion, backup, and exit terms.

Incident-notification obligations.

Audit rights.

Availability and disaster-recovery evidence.

Idempotency and reconciliation behavior.

Webhook security.

Data-use and AI-training restrictions.

Insurance and operational responsibility.

Do not rank vendors using unverified marketing claims.

Deliverables

docs/task-08/privacy-and-security-plan.md

docs/task-08/tracking-notification-and-labelling-controls.md

docs/task-08/vendor-verification-and-procurement-gates.md

Workstream M — Audit, retention, incident response, and operational runbooks

Audit catalogue

Define append-only events for:

Request drafted, submitted, accepted, rejected, withdrawn, cancelled, expired, or closed.

Pharmacy selected, changed, or transfer requested.

Prescription evidence received, scanned, reviewed, rejected, or clarification requested.

Professional review decision referenced.

Inventory estimate created, expired, or displayed.

Inventory confirmation accepted, rejected, expired, or contradicted.

Reservation created, expired, released, or reconciled.

Preparation started, stopped, completed, or rework requested.

Professional check passed, failed, revoked, or denied.

Counselling gate satisfied or blocked.

Release authorized, revoked, or denied.

Ready state entered or removed.

Price or coverage estimate created, changed, expired, or acknowledged.

Adjudication, payment, refund, or claim action allowed, denied, or reconciled.

Pickup recipient authorized, revoked, verified, denied, or handed off.

Delivery address confirmed, changed, expired, or denied.

Delivery recipient authorized, revoked, verified, or denied.

Courier booking requested, acknowledged, failed, cancelled, or uncertain.

Package custody transferred.

In-transit, delay, stop, attempted, handoff, failure, exception, return, and return-received events.

Proof of handoff accepted, rejected, disputed, or reconciled.

Temperature, tamper, damage, loss, theft, or route exception.

Stock-disposition task created and decision referenced.

External webhook accepted, rejected, duplicated, replayed, reordered, or unmapped.

Reconciliation opened, resolved, escalated, or left unresolved.

Administrative or support access.

Suspicious access or transition attempt.

Every audit event should contain only:

Event ID.

Event type and schema version.

Time.

Opaque actor reference.

Opaque subject reference only where necessary.

Opaque pharmacy or tenant scope.

Opaque request, package, or reconciliation reference.

Action.

Outcome.

Safe reason code.

Policy version.

Correlation reference.

Source service.

State version before and after.

Never include:

Prescription image or OCR text.

Medication, strength, directions, quantity, ailment, or clinical rationale.

Health-card or payer information.

Raw address or contact details.

Raw signature, identification, photograph, or exact location.

Payment-card data.

Tokens or secrets.

Courier route history.

Vendor webhook body.

Retention inventory

Create a field-level retention proposal for:

Fulfilment requests.

Request items.

Prescription evidence and OCR data.

Pharmacy-choice events.

Professional-review references.

Inventory estimates and confirmations.

Reservation references.

Preparation and check references.

Release decisions.

Price and coverage estimates.

Adjudication and payment references.

Pickup plans and proof.

Delivery addresses.

Recipient authorizations.

Package and custody events.

Temperature and security evidence.

Proof of handoff.

Failed delivery and return records.

Stock-disposition references.

Vendor metadata and webhook receipts.

Reconciliation cases.

Audit events.

Application logs.

Analytics.

Backups.

Synthetic fixtures and evidence.

For every dataset, document:

Purpose.

Source of truth.

PHI classification.

Collection necessity.

Authorized roles.

Client exposure.

Vendor exposure.

Encryption.

Retention trigger.

Proposed period.

Deletion or archival.

Legal-hold behavior.

Incident-preservation behavior.

Backup behavior.

Required approval.

Do not invent a legally required period. Specifically reconcile:

Delivery receipt and tracking records.

Pharmacy care and dispensing records.

Financial and claim records.

Privacy and security audit records.

Incident evidence.

Vendor retention and backups.

Incident response

Model:

Detection.

Immediate transition denial or containment.

Package, inventory, payment, claim, and notification hold.

Session, credential, webhook, or vendor-account revocation.

Courier contact and route or return containment.

Pharmacy and Designated Manager escalation.

Professional review.

Evidence preservation.

Patient-safety assessment by authorized professionals.

Privacy and security scope assessment.

Vendor and insurer escalation.

Medication-incident, controlled-substance, law-enforcement, regulator, payer, or privacy-notification decision by the authorized owner.

Recovery.

Reconciliation.

Post-incident review and quality improvement.

The application must not automatically decide legal reportability, clinical harm, medication-incident classification, claim fraud, or controlled-substance loss.

Required runbooks

Create runbooks for:

Invalid or unclear prescription evidence.

Prescriber or pharmacy clarification delay.

Patient changes pharmacy.

Inventory shortage.

Reservation expiry.

Recall, expiry, damage, or quarantine.

Professional check failure or release revocation.

Price change.

Adjudication rejection or reversal.

Payment uncertainty, refund, or chargeback.

Pickup no-show or wrong recipient.

Address change.

Courier no-show or outage.

Delivery delay.

Wrong recipient.

Missing signature.

Delivered event without proof.

Patient receipt dispute.

Loss, theft, tamper, or damage.

Temperature excursion.

Failed delivery.

Return delay or wrong return location.

Custody unknown.

Vendor compromise.

Privacy breach suspicion.

Accessibility accommodation failure.

Deliverables

docs/task-08/audit-event-catalogue.md

docs/task-08/retention-and-disposal-mapping.md

docs/task-08/incident-response-and-operational-runbooks.md

Workstream N — Accessibility, language, and user experience

Patient experience

The synthetic patient must be able to:

Understand that they are making a request, not placing a confirmed order.

Choose a pharmacy without steering.

Choose pickup or delivery.

Use an authorized agent where approved.

Review uncertainty in inventory, price, coverage, and timing.

Correct an address without a map.

Understand every pending, blocked, failed, cancelled, returned, and unknown state.

Access pharmacist or pharmacy contact options through the approved secure path.

Cancel where operationally safe.

Dispute a delivery or pickup handoff.

Use the flow without camera, GPS, biometrics, or a smartphone-only feature.

Pharmacy experience

Authorized users must be able to:

See only assigned pharmacy requests.

Distinguish request, prescription evidence, authoritative prescription, and pharmacy-system state.

See missing prerequisites without an automated professional recommendation.

Request clarification.

Record or import inventory confirmation.

See stale estimates and confirmations.

Track preparation and check references.

Record pharmacist-only decisions through server-enforced controls.

Revoke release.

Prepare pickup or delivery.

Manage recipient and address exceptions.

Track custody.

Stop fulfilment.

Handle failure and return.

Open reconciliation.

Document a safe operational outcome.

Courier experience

The synthetic courier view must:

Show only assigned packages.

Show minimum necessary address and recipient instructions.

Hide prescription and clinical content.

Prevent access after assignment expiry or revocation.

Support accessible custody scans and safe failure reasons.

Prevent the courier from changing pharmacy, patient, professional, product, price, payment, or claim state.

Offer no patient-medication view.

Accessibility requirements

Verify:

375px operation without horizontal scrolling.

Desktop operation.

Keyboard access to every control.

Visible focus.

Logical headings and landmarks.

Screen-reader names, descriptions, errors, and status announcements.

No essential hover-only behavior.

No keyboard trap.

Status not dependent on colour.

Reduced-motion support.

200% and 400% zoom and reflow.

Long translated labels and Bangla-script rendering.

Plain-language uncertainty and exception wording.

56px targets for frequent mobile actions.

Clear absolute dates and times with timezone.

Accessible pharmacy-choice comparison.

Accessible pickup or delivery selection.

Address entry without map-only interaction.

Signature and identity-check alternatives under approved policy.

No camera, GPS, or biometric requirement.

A telephone or in-person pharmacy alternative.

Error recovery that preserves entered information safely.

Dark-pattern prohibitions

Do not:

Preselect AgentRx’s pharmacy.

Make other pharmacies visually secondary.

Use countdowns or scarcity without authoritative evidence.

Imply medication risk to force a choice.

Hide fees or delivery limitations.

Bundle consent.

Use a disabled-looking alternative that remains technically clickable.

Make cancellation harder than submission without operational justification.

Use “covered,” “approved,” “in stock,” “ready,” or “delivered” without evidence.

Deliverable

docs/task-08/accessibility-language-and-user-experience.md

Workstream O — Synthetic prototype

Use deterministic, obviously synthetic, server-owned fixtures.

Fixture requirements

Fixtures must:

Use no real person, pharmacy, prescriber, address, telephone number, email, health-card number, payer number, prescription, medication record, payment method, courier, tracking number, or clinical record.

Use unmistakable identifiers such as SYNTHETIC-FULFILMENT-008.

Use a fixed clock.

Use a fixed synthetic Ontario timezone.

Use opaque synthetic actor, subject, pharmacy, request, package, and vendor identifiers.

Remain server-owned.

Make no network calls.

Contain no live SDK credential.

Be visibly labelled synthetic.

Fail hard if enabled in production.

Avoid prohibited client-side fixture imports.

Include marker values for leakage tests.

Use deterministic adapter outcomes.

Never create a real prescription, order, inventory reservation, adjudication, payment, shipment, claim, or notification.

Required synthetic scenarios

Request and prescription evidence

New prescription-review request.

Refill-review request.

Renewal-review request.

Transfer-review request.

Upload received but unreviewed.

Unreadable upload.

Wrong-patient upload.

Duplicate upload.

OCR complete but still unverified.

Prescription evidence rejected.

Clarification requested.

Clarification resolved by authorized professional reference.

Refill unavailable.

Renewal requires professional decision.

Transfer requested to another pharmacy.

Controlled-substance transfer blocked.

Unknown drug-scope classification blocked.

Patient choice

Patient selects one synthetic pharmacy.

Patient changes pharmacy before review.

Patient requests transfer after review.

No pharmacy preselected.

Pharmacy accreditation evidence current.

Pharmacy accreditation evidence stale.

Pharmacy unavailable.

Patient chooses pickup.

Patient chooses delivery.

Patient changes mode before release.

Mode change after courier booking enters reconciliation.

Identity and authorization

Authorized patient.

Active delegate with correct scope.

Expired delegate.

Revoked delegate.

Wrong-subject delegate.

Wrong pharmacy.

Wrong tenant.

Patient token at pharmacist boundary.

Pharmacist token at patient boundary.

Technician attempts pharmacist-only release.

Administrator attempts professional check.

Courier attempts patient receipt or release.

Unknown role.

Inventory and preparation

Estimate only.

Stale estimate.

Confirmation pending.

Confirmed available.

Confirmed partial.

Confirmed unavailable.

Reservation created.

Reservation expired.

Concurrent reservation conflict.

Substitution required.

Recall or quarantine.

Expiry exception.

Storage exception.

Integrity exception.

Preparation not authorized.

In preparation.

Prepared.

Technical check complete.

Professional check pending.

Professional check failed.

Professional check passed.

Counselling pending.

Release authorized.

Release revoked.

Ready denied because a guard is stale.

Price, coverage, payment, and claim

Price estimate available.

Estimate expires.

Estimate changes after product confirmation.

Coverage unknown.

Synthetic adjudication accepted.

Synthetic adjudication rejected.

Synthetic adjudication reversed.

Payment authorization succeeds.

Payment authorization fails.

Payment timeout is uncertain.

Duplicate payment attempt is idempotent.

Refund pending.

Refund complete.

Claim action denied.

Delivery event cannot create a claim.

Pickup

Ready for pickup.

Patient pickup succeeds.

Authorized-agent pickup succeeds.

Wrong recipient.

Expired recipient authorization.

Revoked recipient authorization.

Pickup code replay.

Counselling pending blocks handoff.

Release revoked before pickup.

Pickup no-show.

Pickup window expired.

Cancellation after preparation.

Returned-to-pharmacy state with disposition pending.

Delivery and custody

Valid delivery plan.

Address pending.

Address changed.

Address out of approved service area.

Cross-jurisdictional address blocked.

Courier booking succeeds.

Courier booking timeout.

Courier no-show.

Package not released.

Courier accepts custody.

Direct in-transit event.

Unapproved stop.

Route delay.

Duplicate scan.

Reordered scan.

Successful patient signature.

Successful authorized-agent signature.

Accessible witnessed mark.

No-signature exception pending pharmacist approval.

No-signature exception approved.

Unattended-drop request denied.

Recipient unavailable.

Wrong recipient.

Identity mismatch.

Delivered webhook without proof.

Proof without matching event.

Patient disputes receipt.

Failed delivery.

Second attempt requires recheck.

Lost package.

Stolen package.

Tampered package.

Damaged package.

Temperature excursion.

Temperature evidence missing.

Return requested.

Returning to pharmacy.

Return delayed.

Return to wrong pharmacy.

Return confirmed.

Stock disposition pending.

Automatic restock denied.

Custody unknown.

External systems and failures

Pharmacy-system outage.

Inventory-system outage.

Task 03 unavailable.

Task 05 unavailable.

Task 07 stub unavailable.

Task 09 unavailable.

Task 11 release gate blocked.

Payment-provider outage.

Courier outage.

Invalid webhook signature.

Expired webhook timestamp.

Replayed webhook.

Wrong environment.

Wrong tenant.

Wrong package.

Unknown event type.

External status regression.

Reconciliation resolved with no effect.

Reconciliation requires manual review.

Unknown canonical state.

Required interfaces

Build:

Synthetic patient request-type selection.

Synthetic prescription-evidence upload summary.

Synthetic pharmacy-choice screen.

Synthetic pickup or delivery preference screen.

Synthetic price, coverage, inventory, and timing estimate screen.

Synthetic patient request-status timeline.

Synthetic authorized-recipient management.

Synthetic address confirmation.

Synthetic cancellation and dispute paths.

Synthetic pharmacy review queue.

Synthetic prescription-evidence review task.

Synthetic clarification workflow.

Synthetic inventory confirmation control.

Synthetic preparation and check status.

Synthetic pharmacist-only release and revocation control.

Synthetic pickup handoff control.

Synthetic delivery-plan and package control.

Synthetic courier custody view.

Synthetic delivery-exception control.

Synthetic return and disposition-pending view.

Synthetic reconciliation queue.

Synthetic denied, expired, failed, cancelled, returned, unavailable, and unknown states.

All controls must use server-owned authorization and transitions. UI hiding alone is insufficient.

Evidence

Capture:

375px patient request and pharmacy-choice flow.

375px pharmacy queue and release controls.

375px courier custody flow.

Desktop patient flow.

Desktop pharmacy flow.

Desktop operations and reconciliation flow.

Keyboard walkthrough.

Screen-reader semantic inspection.

200% and 400% zoom and reflow.

Reduced motion.

Long English and Bangla labels.

56px frequent-action targets.

Pickup path.

Authorized-recipient path.

Delivery path.

Failed-delivery and return path.

Release-revocation path.

Patient-choice change.

Price-change acknowledgement.

Inventory-stale state.

Unknown-state fail closure.

Evidence must contain only synthetic information and use generic filenames.

Deliverables

Synthetic fulfilment coordination implementation.

Deterministic server-owned fixtures.

docs/task-08/accessibility-and-responsive-evidence.md

Mobile and desktop evidence in the established repository location.

Required tests

Use the repository’s existing test tooling.

Request and prescription-boundary tests

Prove:

An upload remains prescription evidence.

OCR success does not validate a prescription.

A patient cannot mark a prescription valid.

Refill selection does not prove remaining quantity.

Renewal selection does not authorize prescribing.

Transfer request does not transfer a prescription.

A prescription copy is not treated as an authorized prescription.

Duplicate submission is idempotent.

Wrong patient, pharmacy, or tenant is denied.

Client-supplied prescription, product, quantity, pharmacy, or state is ignored or denied.

Controlled-substance and unknown high-risk scope fail closed.

Cross-jurisdictional scope fails closed.

Patient-choice tests

Cover:

No preselected pharmacy.

Neutral presentation.

Change of pharmacy.

Transfer request.

Stale accreditation evidence.

Unavailable pharmacy.

Preferred-provider or network information presented truthfully.

Fee and delivery differences disclosed.

No commercial steering.

No bundled consent.

AgentRx pharmacy is not mandatory.

Professional-authorization tests

Prove:

Patient cannot set professional state.

Courier cannot set professional state.

Assistant cannot perform pharmacist action.

Technician cannot perform pharmacist-only action.

Administrator cannot perform pharmacist action.

Support cannot impersonate pharmacy personnel.

Pharmacist must be assigned to the correct pharmacy and request.

Expired or revoked professional session is denied.

Client-supplied role is denied.

Unknown role fails closed.

Release decision is attributable to the actual professional.

Release can be revoked.

Stale professional state cannot be overwritten.

Inventory and preparation tests

Cover:

Estimate is visibly non-authoritative.

Estimate expiry.

Confirmation source and freshness.

On-hand versus available distinction.

Reservation idempotency.

Reservation expiry.

Concurrent reservation conflict.

Partial availability.

Shortage.

Substitution-required block.

Recall or quarantine.

Expiry.

Storage.

Integrity.

Preparation authorization.

Prepared is not checked.

Technical check is not professional release.

Professional check failure.

Counselling pending.

Release authorization.

Release revocation.

Multi-item independence.

Ready derivation and removal.

State and concurrency tests

Cover:

Every valid transition.

Every invalid transition.

Duplicate event.

Duplicate tab.

Concurrent device.

Duplicate worker.

State-version conflict.

Cancellation race with preparation.

Cancellation race with release.

Cancellation race with courier pickup.

Mode-change race.

Inventory change after confirmation.

Release revocation after ready.

Late webhook after terminal state.

Status regression.

Unknown state.

Prove no stale actor or event can overwrite a newer professional, financial, custody, return, or cancellation decision.

Price, coverage, payment, and claim tests

Cover:

Estimate labelling.

Estimate expiry.

Price change.

Coverage unknown.

Adjudication acceptance, rejection, reversal, duplicate, timeout, and stale response.

Payment authorization, capture, failure, cancellation, refund, duplicate, timeout, and reconciliation.

No raw card data.

No payer identifier in logs.

Payment cannot release.

Delivery cannot create claim.

Pickup cannot create claim.

Return cannot silently reverse or create claim.

Existing billing service remains authoritative.

Pickup tests

Cover:

Ready guard.

Correct patient.

Authorized agent.

Wrong recipient.

Expired or revoked authorization.

Replayed pickup code.

Counselling pending.

Release revoked.

Package mismatch.

No-show.

Pickup expiry.

Cancellation.

Accessibility alternative.

Handoff evidence.

Return-to-pharmacy disposition pending.

Delivery and custody tests

Cover:

Delivery eligibility guards.

Address confirmation.

Address change.

Service area.

Cross-jurisdictional denial.

Authorized recipient.

Courier assignment.

Courier pickup after release only.

Package scan and manifest mapping.

Direct route.

Unapproved stop.

Delay.

Duplicate and reordered events.

Patient signature.

Agent signature.

Accessible witnessed mark.

No-signature exception.

Unattended-drop denial.

Recipient unavailable.

Identity mismatch.

Delivered without proof.

Proof mismatch.

Patient dispute.

Lost, stolen, tampered, damaged, or temperature-exposed package.

Failed delivery.

Retry guard.

Return authorization.

Return transit.

Correct pharmacy receipt.

Stock disposition pending.

Automatic restock denial.

Custody unknown.

Prove:

Courier custody is not patient receipt.

IN_TRANSIT cannot be displayed as HANDED_OFF, received, or delivered to the patient.

Failed delivery cannot mark received.

A provider-delivered event cannot alone mark received.

Return cannot silently restore inventory.

Custody is always explicit or fail-closed unknown.

Adapter, webhook, and reconciliation tests

Cover:

Valid signature.

Invalid signature.

Expired timestamp.

Replay.

Duplicate event.

Reordered event.

Unknown event.

Wrong environment.

Wrong tenant.

Wrong pharmacy.

Wrong request.

Wrong package.

Schema violation.

Oversized payload.

Timeout.

Safe retry.

Idempotency.

Status regression.

Reconciliation query.

Manual reconciliation.

Dead-letter handling.

No external event may directly create prescription acceptance, substitution, professional check, release, claim, receipt, or stock disposition.

Privacy and leakage tests

Add enforceable tests that fail if:

PHI appears in URLs or query strings.

A reusable token appears in a URL.

PHI appears in page titles or browser history.

PHI appears in browser storage.

PHI appears in analytics or session replay.

PHI appears in metrics, traces, logs, errors, or support fixtures.

Prescription images or OCR text appear in logs.

Medication, ailment, prescriber, or health-card data appears in notifications.

Address, contact, signature, identity result, or exact location appears in technical logs.

Medication or clinical content appears in courier metadata or outer labels.

Raw payment-card data is stored.

Payer identifiers appear in idempotency or correlation keys.

Vendor secrets appear in logs.

PHI appears in screenshot or evidence filenames.

Protected responses are shared-cacheable.

Third-party analytics or replay loads on protected routes.

Synthetic code can be enabled in production.

Accessibility and responsive tests

Cover:

Request selection.

Upload status.

Pharmacy choice.

Pickup or delivery choice.

Estimate language.

Address confirmation.

Authorized recipient.

Patient status.

Pharmacy queue.

Professional release.

Pickup handoff.

Courier custody.

Failure.

Return.

Reconciliation.

Cancellation.

Denial.

Unknown state.

375px.

Desktop.

Keyboard.

Screen reader.

Visible focus.

56px targets.

200% and 400% zoom.

Reduced motion.

Long translated labels.

Bangla script.

No map-only flow.

No camera, GPS, or biometric dependency.

Professional, privacy, accessibility, and operational validation plan

Produce a synthetic validation plan reviewed before production by:

Practising Ontario pharmacists.

An Ontario Designated Manager.

A pharmacy technician.

Pharmacy operations staff.

Privacy and security reviewers.

Accessibility reviewers.

Finance and payer specialists.

Courier and procurement reviewers.

Legal or regulatory counsel where required.

Validate:

Whether request wording avoids implying a valid prescription or order.

Whether the pharmacist can stop or revoke release at any time.

Whether role separation reflects actual practice.

Whether staff can distinguish preparation, technical check, professional check, release, ready, courier custody, and patient receipt.

Whether patient choice is real and understandable.

Whether transfer and renewal workflows avoid false promises.

Whether inventory estimates are useful without misleading.

Whether product, expiry, storage, and substitution uncertainty is visible to pharmacy staff.

Whether price and coverage uncertainty is understandable.

Whether payment timing and refund handling are operationally safe.

Whether pickup identity and recipient workflows are usable.

Whether counselling remains available and cannot be bypassed.

Whether courier data is minimum necessary.

Whether chain-of-custody evidence is sufficient.

Whether failure, dispute, loss, tamper, temperature, and return workflows are usable.

Whether returned stock remains segregated pending professional disposition.

Whether notifications and tracking reveal no PHI.

Whether the interface works under realistic pharmacy workload.

Whether frequent actions work one-handed on mobile.

Whether accessibility alternatives work without camera, GPS, biometrics, maps, or smartphone-only controls.

Use only synthetic cases. Do not conduct a live patient, pharmacy, payment, courier, or prescription pilot under this task.

Deliverable

docs/task-08/privacy-accessibility-security-and-operational-validation-plan.md

Mandatory stop conditions

Stop the affected workstream and report the blocker if:

AGENTS.md conflicts with the requested operation.

Task 01’s synthetic environment is missing or unsafe.

Task 03’s prescription-evidence boundary cannot be preserved.

Task 05 does not separate patient, subject, delegate, agent, pharmacist, technician, staff, administrator, support, pharmacy, tenant, and session.

Task 07 generic-notification and secure-message boundary would be bypassed.

Task 09’s billing, adjudication, payment, or claim authority would be bypassed.

Task 11’s protected-route or release gate is missing or bypassed.

Real PHI, prescription, patient, pharmacy, address, recipient, payer, payment, courier, or tracking data appears in fixtures, tests, logs, screenshots, or artifacts.

A production migration or authentication change lacks approval.

A live pharmacy, inventory, payer, payment, courier, address, or notification account or credential is required.

An uploaded image, OCR output, patient statement, refill selection, renewal request, or transfer request would be treated as a valid prescription.

Prescription authenticity, validity, substitution, therapeutic decision, dispensing check, counselling, or release would be automated.

Patient choice would be restricted, hidden, preselected, or commercially steered.

Pharmacy accreditation cannot be verified.

The Operating Internet Sites Policy review creates an unresolved production requirement.

An Internet pharmacy service would operate outside an accredited pharmacy.

Professional responsibility is unclear.

A non-pharmacist could perform a pharmacist-only transition.

A patient, courier, administrator, support user, worker, or webhook could set professional release.

Controlled-substance scope or high-risk-drug classification is unclear.

Central fill, remote dispensing, unattended pickup, or cross-jurisdictional service would be required.

Inventory source, product identity, quantity, expiry, recall, storage, integrity, or substitution requirement cannot be confirmed.

An inventory estimate would be displayed as confirmed.

A price or coverage estimate would be displayed as final or guaranteed.

A real payment or claim would be required.

Payment, shipment, delivery, or receipt could create a claim.

Preparation or payment could bypass professional release.

Pickup could bypass identity, recipient authorization, counselling, or current release.

Courier pickup could occur before release.

Courier custody could be treated as patient receipt.

The courier would be treated as the patient’s agent.

Delivery address or recipient identity would need to be guessed.

Unattended delivery would be enabled without approved professional and legal review.

A failed delivery could be marked received.

Loss, theft, tamper, damage, or temperature exception could be ignored.

A return could silently restore inventory or authorize re-dispensing.

Custody cannot be determined or safely set to unknown.

A vendor lacks safe idempotency, acknowledgement, reconciliation, security, privacy, accessibility, retention, incident, or exit behavior.

A provider timeout could cause an unsafe duplicate.

PHI, personal data, tokens, medication data, address, signature, exact location, or raw payment data would enter URLs, browser storage, notifications, labels beyond necessity, vendor metadata, logs, analytics, traces, support tickets, referrers, or evidence.

An accessible pickup, delivery, recipient, address, signature, dispute, or pharmacy-contact alternative cannot be provided.

The synthetic implementation could operate in production.

Existing tenant, identity, privacy, audit, retention, pharmacy, billing, claim, or finalization controls would need to be weakened.

Continue independent synthetic work when only production integration, policy, vendor, contract, accreditation, payer, courier, or professional approval is blocked.

Deliverables

Current-state and gap analysis.

Ontario fulfilment standards and policy mapping.

Production dependency and decision register.

Fulfilment threat model.

Trust-boundary and data-flow diagrams.

Professional-responsibility matrix.

Role and transition authorization matrix.

Fulfilment contracts and schema proposal.

Request and prescription-evidence workflow.

Pharmacy-choice and transfer boundary.

Orthogonal state model.

Canonical fulfilment state machine.

Inventory estimate and confirmation contract.

Reservation contract.

Preparation, check, counselling, and release boundary.

Price, coverage, adjudication, payment, and claim boundary.

Pickup and authorized-recipient workflow.

Delivery and chain-of-custody model.

Delivery exception and return runbook.

External integration contracts.

Idempotency, webhook, and reconciliation design.

Vendor assessment scorecard.

Privacy and security plan.

Tracking, notification, and labelling controls.

Vendor verification and procurement gates.

Audit-event catalogue.

Retention and disposal mapping.

Incident-response and operational runbooks.

Accessibility, language, and user-experience design.

Deterministic synthetic fixtures.

Synthetic patient, pharmacy, courier, and operations interfaces.

Security, authorization, privacy, leakage, state-transition, idempotency, race, custody, financial, and accessibility tests.

Mobile and desktop evidence.

Professional, privacy, accessibility, security, and operational validation plan.

Production integration handoff.

Updated task status and repository documentation.

Synthetic prototype acceptance criteria

The synthetic prototype is complete only when:

A request is never represented as a valid prescription or confirmed order.

Uploads and OCR remain unverified evidence until the pharmacy supplies an authorized result.

Prescription acceptance, refill, renewal, transfer, substitution, preparation, professional check, counselling, and release remain pharmacy-owned.

The patient can choose and change an accredited pharmacy without steering.

Pharmacy accreditation evidence is source-labelled and freshness-controlled.

Patient, subject, delegate, agent, recipient, pharmacist, technician, staff, administrator, support, courier, pharmacy, and tenant remain distinct.

Only an authenticated, assigned, authorized professional can make protected professional transitions.

Inventory estimates remain estimates.

Product, quantity, expiry, recall, storage, integrity, and substitution facts require authoritative confirmation.

Price and coverage estimates remain estimates until adjudication.

Adjudication, payment, claim, and fulfilment state remain separate.

Payment cannot authorize release.

Preparation and technical check cannot authorize release.

READY requires current professional release and all operational guards.

Release revocation removes readiness and blocks handoff.

Pickup verifies the correct patient or authorized recipient under approved policy.

Courier pickup requires current release.

Courier custody is not patient receipt.

In-transit status does not imply patient or authorized-agent handoff.

Patient or authorized-agent receipt requires accepted proof.

Delivery failure cannot mark medication received or silently discard, destroy, restock, or otherwise dispose of stock.

A delivered webhook alone cannot mark medication received.

Failed, lost, stolen, damaged, tampered, or temperature-exposed packages fail closed.

Return custody remains auditable.

Returned medication is never silently restocked or re-dispensed.

Every external effect is acknowledged, idempotent, versioned, audited, and reconcilable.

Unknown provider outcomes enter reconciliation before retry.

No fulfilment event creates or submits a claim.

Controlled substances, central fill, remote dispensing, unattended pickup, and cross-jurisdictional service remain blocked.

No PHI, medication, prescription, address, recipient, signature, exact location, payer, payment, token, or vendor secret appears in prohibited surfaces.

Tracking requires authentication and exposes minimum safe state.

Notifications remain generic under Task 07.

The experience works at 375px and desktop.

Keyboard, screen-reader, zoom, reflow, reduced-motion, long-label, Bangla-script, map-free, camera-free, and 56px-target requirements pass.

Fixtures and evidence contain only deterministic synthetic data.

Synthetic adapters fail hard outside the synthetic environment.

Production pharmacy, inventory, payer, payment, courier, address, notification, prescription, shipment, and claim effects remain disabled.

A synthetic PASS does not approve a production online pharmacy, pharmacy workflow, professional-responsibility model, Internet-site interpretation, inventory integration, payer rule, payment flow, courier, pickup method, delivery method, retention period, patient-choice presentation, or live patient service.

Production gates

Production fulfilment remains blocked until all applicable items are approved or verified:

Current Ontario legal and OCP standards mapping.

Operating Internet Sites Policy interpretation and review-status resolution.

Pharmacy accreditation and Designated Manager approval.

Professional-responsibility and delegation matrix.

Prescription, refill, renewal, transfer, and clarification policy.

Controlled-substance and high-risk-drug exclusion policy.

Patient-choice, transfer, network, fee, and conflict-of-interest review.

Central-fill, remote-dispensing, unattended-pickup, and cross-jurisdictional exclusions.

Inventory, shortage, recall, expiry, storage, integrity, reservation, and substitution policy.

Pharmacy-system specification and contract.

Preparation, technical-check, professional-check, counselling, release, and revocation policy.

Price, coverage, fee, adjudication, cancellation, reversal, and refund policy.

Task 09 billing, payment, and claim integration verification.

Pickup identity, authorized-recipient, counselling, no-show, cancellation, and return policy.

Delivery address, service area, recipient, signature, exception, direct-route, temperature, security, loss, theft, tamper, failure, dispute, return, and stock-disposition policy.

Courier selection and operational due diligence.

Vendor contract, privacy, security, accessibility, incident, retention, deletion, subprocessor, residency, audit, insurance, and exit review.

Task 05 identity, delegate, recipient, pharmacist, technician, and revocation verification.

Task 07 notification and secure-message verification.

Task 11 security and production-release approval.

PIA approval.

TRA approval.

Accessibility review.

Privacy review.

Security review.

Legal and regulatory review.

Pharmacist and Designated Manager professional review.

Finance, payer, and claim review.

Retention and legal-hold approval.

Incident and medication-safety runbook approval.

Production schema migration approval.

Production secrets, keys, and vendor-account approval.

Staged non-PHI integration testing.

Reconciliation rehearsal.

Explicit go-live authorization.

Final report format

End the task with:

Task 08 synthetic prototype status: PASS | BLOCKED | FAIL

Task 01 synthetic environment: READY | BLOCKEDTask 03 prescription-evidence integration: PASSED | BLOCKED | NOT VERIFIEDTask 05 identity integration: PASSED | BLOCKED | NOT VERIFIEDTask 07 notifications: STUBBED | PASSED | BLOCKED | NOT VERIFIEDTask 09 billing/financial integration: PASSED | BLOCKED | NOT VERIFIEDTask 11 security/release gate: PASSED | BLOCKED | NOT VERIFIEDCurrent-state assessment: PASS | BLOCKED | FAILOCP standards mapping: PASS | BLOCKED | FAILOperating Internet Sites review: PASS | BLOCKED | NOT VERIFIEDProfessional-responsibility matrix: PASS | BLOCKED | FAILPatient-choice model: PASS | BLOCKED | FAILPrescription-request boundary: PASS | FAILTransfer and renewal boundary: PASS | BLOCKED | FAILControlled-substance exclusion: PASS | BLOCKED | FAILCross-jurisdictional exclusion: PASS | FAILOrthogonal state model: PASS | FAILState-transition authorization: PASS | FAILInventory estimate boundary: PASS | FAILInventory confirmation model: PASS | BLOCKED | FAILPreparation boundary: PASS | FAILProfessional check and release: PASS | FAILReady-state derivation: PASS | FAILPrice and coverage estimates: PASS | FAILAdjudication boundary: PASS | BLOCKED | FAILPayment boundary: PASS | BLOCKED | FAILClaim boundary: PASS | FAILPickup workflow: PASS | BLOCKED | FAILAuthorized-recipient model: PASS | BLOCKED | FAILDelivery eligibility guards: PASS | FAILChain of custody: PASS | FAILProof of handoff: PASS | BLOCKED | FAILDelivery failure behavior: PASS | FAILReturn and stock-disposition boundary: PASS | FAILIdempotency: PASS | FAILWebhook security: PASS | FAILExternal reconciliation: PASS | FAILTracking privacy: PASS | FAILNotification payloads: PASS | FAILCourier payload minimization: PASS | FAILPHI leakage tests: PASS | FAILAudit mapping: PASS | FAILRetention mapping: PASS | BLOCKED | FAILIncident runbooks: PASS | BLOCKED | FAILAccessibility evidence: PASS | FAIL375px and desktop evidence: PASS | FAILKeyboard and screen-reader evidence: PASS | FAIL200% and 400% zoom/reflow: PASS | FAILBangla and long-label evidence: PASS | FAIL56px frequent-action targets: PASS | FAILAutomated tests: PASS | FAILPharmacy system selected: NONE | NAME | BLOCKEDPharmacy system review: PASSED | BLOCKED | NOT VERIFIEDPayer/adjudicator selected: NONE | NAME | BLOCKEDPayment provider selected: NONE | NAME | BLOCKEDCourier selected: NONE | NAME | BLOCKEDVendor review: PASSED | BLOCKED | NOT VERIFIEDContract review: APPROVED | BLOCKED | NOT VERIFIEDCanadian-residency evidence: VERIFIED | BLOCKED | NOT VERIFIED | NOT APPLICABLEPIA approval: APPROVED | BLOCKED | NOT VERIFIEDTRA approval: APPROVED | BLOCKED | NOT VERIFIEDProfessional review: APPROVED | BLOCKED | NOT VERIFIEDDesignated Manager approval: APPROVED | BLOCKED | NOT VERIFIEDPrivacy review: APPROVED | BLOCKED | NOT VERIFIEDSecurity review: APPROVED | BLOCKED | NOT VERIFIEDAccessibility review: APPROVED | BLOCKED | NOT VERIFIEDFinance and payer review: APPROVED | BLOCKED | NOT VERIFIEDReal PHI used: NOReal prescription used: NOProduction schema changed: NOProduction authentication changed: NOProduction pharmacy system connected: NOReal inventory reserved: NOReal adjudication performed: NOReal payment created: NOReal courier connected: NOReal shipment created: NOExternal notification sent: NOPrescription validated by AgentRx: NOMedication released by AgentRx: NOReturned stock automatically restored: NOClaim created or submitted: NO

Blocking issues:Unresolved professional decisions:Unresolved Internet-site/accreditation decisions:Unresolved patient-choice decisions:Unresolved pharmacy-system and inventory decisions:Unresolved payer, payment, and claim decisions:Unresolved courier and chain-of-custody decisions:Unresolved privacy/legal/security decisions:Unresolved accessibility decisions:Deferred production work:Evidence locations:Files changed:Tests run and results:Recommended next action:

Never report production readiness while pharmacy accreditation, Internet-site review, professional responsibility, patient choice, controlled-substance scope, prescription processing, pharmacy-system integration, inventory truth, release, payer, payment, claim, courier, chain of custody, return disposition, privacy, security, accessibility, PIA, TRA, retention, contracts, or Task 11 approval remains unresolved.

If the synthetic prototype passes while production dependencies remain blocked, report:

Task 08 synthetic prototype: PASS — real prescription processing, inventory confirmation, preparation, professional release, adjudication, payment, pickup, delivery, courier integration, PHI processing, and claim effects remain gated.
