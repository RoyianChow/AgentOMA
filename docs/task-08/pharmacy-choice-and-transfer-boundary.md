# Task 08 — Pharmacy choice and transfer boundary

**Status: WORKSTREAM E DOCUMENTATION / PROPOSED DESIGN ONLY. No directory, accreditation verification, tenant routing, transfer, migration, integration or production authority.**

## 1. Scope

This document defines the proposed neutral, reversible pharmacy-choice evidence and prescription-transfer boundary required by [Task 08](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), Workstream E. It must be read with [AGENTS.md](../../AGENTS.md), the [project overview](../PROJECT_OVERVIEW.md), Workstream A's [current-state analysis](current-state-and-gap-analysis.md), [standards mapping](ontario-fulfilment-standards-and-policy-mapping.md) and [decision register](production-dependency-and-decision-register.md), the Workstream B [threat model](fulfilment-threat-model.md) and [trust-boundary flows](trust-boundaries-and-data-flows.md), the Workstream C [responsibility](professional-responsibility-matrix.md) and [authorization](role-and-transition-authorization-matrix.md) matrices, and the Workstream D [PharmacyChoice/Accreditation contracts](fulfilment-contracts-and-schema-proposal.md#4-contract-catalogue--request-evidence-and-choice).

The document distinguishes:

- **CURRENT:** a one-pharmacy application whose tenant is server-owned;
- **PROPOSED SYNTHETIC/DESIGN:** future deterministic, obviously fictitious comparison fixtures with no real accreditation, identity, directory or routing effect;
- **PROPOSED PRODUCTION:** a separately approved directory/choice/transfer design; and
- **PRODUCTION-BLOCKED:** current accreditation verification, multi-pharmacy tenant mapping, patient identity, prescription transfer and cross-jurisdictional operations.

No pharmacy, owner, reviewer, information source, freshness period, ranking policy, transfer rule or professional scope is selected or approved here.

## 2. Current repository reality

| Current evidence | Verified boundary | Consequence |
|---|---|---|
| [AGENTS.md](../../AGENTS.md), [pharmacy configuration](../../src/lib/pharmacy-config.ts) and [assessment schema](../../src/lib/db/schema/assessments.ts) | The application serves one pharmacy. `PHARMACY_ID` is server-only; a singleton database constraint prevents a second production pharmacy row. | Client choice cannot select or switch tenant scope. Multi-pharmacy production routing is unresolved. |
| [Public intake actions](../../src/app/%28intake%29/assessment/actions.ts), `resolvePharmacy` | Legacy caller pharmacy input is ignored; the server resolves only the configured pharmacy. Public intake remains zero-PHI. | Do not add a tenant selector or prescription/choice PHI to public intake. |
| [Assessment schema](../../src/lib/db/schema/assessments.ts), `patientChoiceInformedAt` | The clinical record can show that choice information was discussed. | It does not identify a destination, verify accreditation, issue a transfer or authorize cross-pharmacy access. |
| [Authentication schema](../../src/lib/db/schema/auth.ts) and [guard](../../src/lib/auth-guard.ts) | Current identities are staff-facing and assigned to the configured pharmacy. | Task 05 patient/delegate identity and cross-pharmacy patient authorization are unavailable. Staff cookies cannot stand in for them. |
| [Current-state analysis](current-state-and-gap-analysis.md) and [decision T08-D13](production-dependency-and-decision-register.md#4-product-professional-pharmacy-choice-and-financial-decisions) | The Task 08 neutral-choice requirement conflicts with current singleton tenancy. | Choice behavior and routing remain **BLOCKED** until an approved architecture preserves both boundaries. |
| [Task 04 renewal](../task-04/decisions/task-04-synthetic-scope-renewal-v3-2026-08-19.md) | Prior runtime authority expired; renewal is DRAFT — NOT GRANTED. | Task 04 pharmacies, sessions, capabilities or database are not a Task 08 multi-pharmacy fixture authority. |

No production accreditation service, pharmacy directory, transfer integration, active prescription upload/OCR system or production prescription-system integration exists. Task 03 ownership remains unresolved, Task 05 identity is unavailable and applicable Task 11 approval is missing. This document does not change those facts.

## 3. Proposed synthetic/design choice workflow

Runnable synthetic work is not authorized now. Under a later exact Task 08 scope and applicable Task 11 approval, a choice test design must satisfy all of the following:

| Stage | Proposed synthetic/design behavior | Prohibited behavior |
|---|---|---|
| Candidate presentation | Present more than one obviously synthetic pharmacy-directory candidate, with unmistakably fictitious labels and synthetic provenance. | No real pharmacy, accreditation assertion, production row, credential, network call or reused Task 04 fixture. |
| Initial state | Present **no preselected pharmacy**. | No configured-pharmacy default, visual default, hidden selection or mandatory AgentRx pharmacy. |
| Neutral comparison | Explain only approved, sourced differences such as pickup only, delivery unavailable, accessibility features, operating hours or integration unavailable. | No unsupported “recommended,” “preferred,” “best,” “fastest,” health-inferred ranking or undisclosed commercial steering. |
| Information freshness | Label source revision, observed time and expiry/freshness for accreditation, services, distance, fees, network information and delivery capability. | No source-less claim, stale-as-current claim or marketing page treated as authority. Unknown/expired data cannot establish the fact. |
| Alternatives | Allow another pharmacy to be searched or provided conceptually through a future approved directory/manual workflow. | No live directory lookup, free-text routing, cross-tenant read or forced fallback in this design. |
| Choice | Record explicit choice intent and provenance only after future Task 05 authorization. | No choice inferred from location, prior use, insurer/network, default, availability, clinical status or payment. |
| Change/withdrawal | Permit a new explicit choice or withdrawal without punitive friction; preserve former intent as superseded history. | No deletion of prior evidence, silent destination switch or fee/friction designed to prevent change. |
| Consent separation | Keep choice acknowledgement separate from optional communication, marketing, unrelated data sharing and payment consent. | No bundled consent or treating refusal as loss of access to neutral alternatives. |

“Synthetic pharmacy” means deterministic non-PHI test data only. It does not mean accredited, available, connected or production-safe. Exact fixtures, clock, lifecycle, owner and source vocabularies remain PENDING under T08-D02–D04/D15/D36.

## 4. Patient-choice evidence proposal

The minimum proposed evidence follows D08 `PharmacyChoice` and remains server-only. Every reference is opaque and scope-checked; none is tenant authority.

| Evidence | Minimum conceptual meaning | Boundary |
|---|---|---|
| Opaque choice reference | Server-issued surrogate for one choice revision. | No PHI, directory ID, commercial rationale or internal key encoded. |
| Opaque subject reference | Intended patient under Task 05. | Unavailable currently; must not be copied from public intake or inferred from staff session. |
| Acting actor reference | Actual patient or authorized actor expressing intent. | Separate from subject and recipient; requires current action-specific authorization. |
| Actor-to-subject relationship reference | Source-issued relationship and revision. | Missing, expired or revoked relationship blocks reliance. |
| Selected pharmacy reference | Intended external/directory pharmacy. | Not `PHARMACY_ID`, not a local tenant FK, and not proof of accreditation. |
| Choice timestamp | Trusted server-accepted instant. | Browser time is not authoritative. |
| Selection source/provenance | Closed approved capture method and source revision. | Not free text, URL metadata or analytics attribution. |
| Information-presented references | Bounded references to each information category actually shown. | Each binds source, source revision, observed time, expiry and exact presentation; no arbitrary JSON or clinical/ranking rationale. |
| Acknowledgement reference | Exact approved disclosure/choice acknowledgement where required. | Not marketing, unrelated sharing, messaging or payment consent. Unknown applicability blocks affected reliance. |
| Superseded-by reference | Later explicit choice revision. | Preserves immutable earlier intent and prevents two current revisions. |
| Withdrawal/change timestamp | Trusted accepted time of withdrawal or change. | Does not rewrite an already authoritative transfer or erase professional/source records. |

Names, addresses, telephone numbers, emails, health-card or prescription numbers, medication facts, payer/network identifiers and commercial ranking rationale must not appear in technical identifiers, idempotency keys, URLs, queue/topic names, log/metric labels or correlation references. Opaque linked choice evidence remains protected information.

## 5. Authorization and tenancy boundary

The following inequality is an invariant:

> **patient-selected pharmacy reference ≠ `PHARMACY_ID` tenant authority**

- `PHARMACY_ID` continues to come only from server configuration.
- Client, URL, QR, session, directory, vendor or choice input cannot alter tenant scope.
- Choice cannot grant access to another pharmacy's data or bypass server-side pharmacy assignment.
- Choice remains proposed request intent until an approved architecture maps a destination safely.
- A directory/accreditation reference is not a local tenant record or authorization capability.
- Every future read/write independently verifies server scope, session/audience, actor, subject, relationship, action, request, source version, lifecycle and revocation.
- Missing destination mapping blocks routing. The system must not silently force the server-configured pharmacy to make the request appear complete.

The current one-pharmacy architecture and Task 08 multi-pharmacy patient-choice requirement are a genuine unresolved production design conflict, T08-D13. Resolving it requires Royian/architecture, Task 05, professional, privacy/legal and operations review. This document does not select a multi-tenant model, add a pharmacy row or weaken AGENTS.md.

## 6. Accreditation and information-source boundary

Production accreditation verification is **BLOCKED** pending an approved current authoritative source, source contract, refresh/expiry rules and professional/legal review. A stale directory row is not proof. Stored pharmacy profile information, marketing/provider pages, search results, an OCP number supplied by a caller, network participation or a synthetic label are not accreditation evidence.

Pharmacy accreditation and registrant authorization are independent:

- accreditation concerns the pharmacy/source relationship under an approved current process;
- registrant authorization concerns the actual professional's identity, current scope, assignment and action;
- neither can supply the other; and
- both must be current where an affected transition requires them.

Information about services, distance, fees, network status, delivery and accessibility also requires its own owner, source revision, observed time, expiry and truthful uncertainty. Missing, stale, contradictory or unverified information is unavailable, not a reason to steer the patient toward the configured pharmacy.

## 7. Transfer boundary

| Transfer stage | Permitted proposed fact | Required fail-closed rule |
|---|---|---|
| Transfer requested | Record patient/authorized-actor intent and intended receiving pharmacy. | A request is not a transfer, prescription or source-pharmacy authorization. |
| Destination selected | Record the current reversible choice revision. | Receiving-pharmacy selection is not accreditation, tenant access or transfer authority. |
| Before authoritative transfer | Allow explicit choice change; supersede prior intent and invalidate dependent pending routing. | No punitive friction, silent switch or reuse of a stale destination. |
| Evidence copied/received | Preserve provenance as unverified evidence. | Generic data copying never performs the legal/professional transfer and the copy must never be called an authorized prescription. |
| Pharmacy-to-pharmacy review | Route only through a future approved source/receiving professional workflow. | No current integration exists. AgentRx cannot decide transferability, authenticity, remaining quantity or professional acceptance. |
| Transfer pending | Keep status pending/unknown until current authoritative source evidence and every applicable G04 guard exist. | Timeout, task completion, notice, callback or destination acknowledgement cannot establish transfer. |
| Authoritative transfer accepted | Reference the exact approved pharmacy-owned decision/source revision if a future workflow supplies it. | After this point, reversal/change requires another approved professional workflow; earlier intent withdrawal cannot rewrite the accepted fact. |

Controlled-substance transfers remain blocked in v1. Unknown drug-scope classification fails closed. Cross-jurisdictional transfer remains blocked. No inference from Ontario schedule labels, ailment/PIN reference data, a patient statement or copied metadata is permitted. Central-fill, remote, automated or other unapproved transfer models remain outside scope.

AgentRx may validate that a supported transfer-decision reference exists and matches the request/choice/source versions. It must not make, recommend, infer or automate the professional transfer decision.

## 8. State and concurrency behavior

Choice and transfer-intent records are immutable revisions with one current head. A future accepted change uses compare-and-set `stateVersion`, trusted server/database time, current Task 05 relationship and current source/choice versions. No stale client, task, worker or callback overwrites a newer choice or authoritative transfer fact.

| Race / replay | Required proposed result |
|---|---|
| Duplicate choice submission | Same actor/operation/request/typed-payload replay produces one logical choice revision and a validated minimized response; changed payload conflicts. |
| Choice change versus request submission | Serialize current versions; routing uses only the current accepted choice. If outcome is uncertain, block routing and reconcile. |
| Choice change versus transfer initiation | Supersede pending intent and invalidate stale operations before any acknowledged professional transfer; uncertain acknowledgement requires reconciliation. |
| Choice withdrawal versus authoritative transfer | Preserve both timestamps/source facts. Withdrawal cannot retroactively undo an accepted transfer; use the approved reversal/change workflow. |
| Accreditation/source expiry | Remove reliance and block new routing/transfer progression; never fall back automatically. |
| Relationship/session revocation | Deny future reads/writes; do not delete historical attributed intent or accepted professional evidence. |
| Unknown/contradictory source or external outcome | Remain pending/unknown, open reconciliation and prevent transfer, cross-scope access and blind retry. |

No exact lock order, idempotency lifetime, source freshness interval or retry policy is approved here.

## 9. Failure and fail-closed behavior

- Missing Task 05 identity/relationship: no protected choice or transfer request.
- Missing current accreditation source: no claim of accreditation or production routing.
- Unknown selected pharmacy mapping: no local tenant lookup or forced configured-pharmacy substitution.
- Stale choice: no routing or transfer progression.
- Wrong actor, subject, request, action, pharmacy scope or source version: generic denial with no sensitive enumeration.
- Unknown drug scope, controlled-substance status or jurisdiction: transfer remains blocked.
- Copied record, upload/OCR result, patient statement or receiving-pharmacy selection: remains unverified evidence, never prescription/transfer validity.
- Professional source unavailable or contradictory: status stays pending/unknown and downstream inventory, preparation, finance, release and custody effects remain blocked.
- Uncertain external result: reconciliation before any retry; no fabricated acceptance or reversal.

Failure must not expose another pharmacy's records, source identifiers, network terms, patient relationship, prescription facts or internal denial detail.

## 10. Audit expectations

A future approved audit catalogue may record only minimum opaque choice/request/transfer references, actual authorized actor where necessary, approved action/outcome/safe reason, source/presentation/policy versions, trusted time and before/after state versions. Choice, supersession and withdrawal provenance must be preserved without recording health-inferred or commercial ranking rationale.

Audit must not contain directory payloads, source documents, prescription/medication data, contact/address data, OCR text, accreditation credentials, payer/network identifiers, free text, URLs, vendor secrets or arbitrary metadata. A denied action must not mutate protected business state or reveal whether a subject/pharmacy/request exists; denied-attempt audit requires a separately approved minimized contract.

No existing production audit or governance file is modified or extended by this document.

## 11. Privacy constraints

- Pharmacy choice cannot be bundled with marketing, unrelated data sharing, communications or payment consent.
- Collect/display only approved choice information necessary for a specific decision; source/freshness labels do not justify copying full directory/vendor records.
- Keep subject, actor relationship, choice and transfer references out of URLs, browser persistence, public pages, logs, analytics, tracking links, notification bodies and courier payloads.
- No inferred health status, medication, prescription details or commercial steering rationale in ranking or technical metadata.
- Future protected reads require no-store, no-referrer and per-request authorization; minimization does not make linked choice data public.
- Public intake remains zero-PHI. No address, recipient, prescription contact or pharmacy-choice PHI is added to it.
- Future synthetic choice tests use only obvious non-PHI fakes and no real pharmacy names, credentials, endpoints or external queries.

## 12. Production blockers

| Decision | Current status / affected behavior |
|---|---|
| T08-D02–D04/D36/D37 | Exact synthetic scope/lifecycle and applicable Task 01/11 approvals are missing; no runnable choice fixtures. |
| T08-D05/D17 | Prescription/PMS and transfer-domain ownership are unresolved; no source/receiving workflow. |
| T08-D06/D14 | Patient/delegate actor-subject identity and protected patient access are unavailable. |
| T08-D13 | Neutral reversible choice conflicts with singleton `PHARMACY_ID`; production architecture is unresolved. |
| T08-D15 | Current authoritative accreditation source and Ontario interpretation/review are NOT VERIFIED. |
| T08-D16 | Controlled/high-risk drug and jurisdiction source policy is unresolved; affected transfer paths blocked. |
| T08-D20 | Professional transfer authority, actual registrant evidence and role/scope rules are unapproved. |
| T08-D28–D30 | No directory/PMS vendor contract, integration, idempotency/reconciliation parameters or privacy/security approval. |
| T08-D32–D35 | Audit, retention, incidents and accessibility review remain blocked or NOT VERIFIED. |

Task 04 expired authority is not reused. Task 03's actual evidence ownership remains unresolved. Task 07 has no runtime. Task 09 is not presumed to own transfer or finance. No production runtime authority is granted.

## 13. Future test obligations — not implemented or run

| ID | Later independently required assertion |
|---|---|
| E2-T01 | A synthetic comparison presents multiple obvious fictional candidates, no preselection and no real tenant/pharmacy row, credential, endpoint or external query. |
| E2-T02 | Neutral functional differences and source/freshness labels render without “recommended,” “preferred,” “best,” “fastest,” inferred-health ranking or undisclosed commercial steering. |
| E2-T03 | Missing/stale/contradictory accreditation, service, distance, fee, network or delivery source fails unavailable and never forces the configured pharmacy. |
| E2-T04 | Client/URL/session/QR/directory/choice values cannot alter `PHARMACY_ID`, tenant joins or server assignment; cross-pharmacy access is denied generically. |
| E2-T05 | Actor/subject/relationship/action/session expiry and revocation combinations fail closed; patient, delegate, subject, recipient and professional remain distinct. |
| E2-T06 | Choice acknowledgement is independent of marketing, data-sharing, communications and payment consent; refusing those optional purposes does not select a pharmacy. |
| E2-T07 | Same-key choice replay has one revision; changed payload conflicts; concurrent choice changes leave one current head and preserve superseded provenance. |
| E2-T08 | Choice change before acknowledged authoritative transfer invalidates stale intent/routing; a late/unknown acknowledgement enters reconciliation rather than overwriting current truth. |
| E2-T09 | Transfer request, receiving choice, copied record, upload/OCR and patient statement never establish prescription validity or transfer authorization. |
| E2-T10 | Controlled-substance, unknown classification and cross-jurisdictional transfer cases remain blocked; no generic-copy or automated-decision workaround. |
| E2-T11 | After a supported future authoritative transfer, ordinary intent withdrawal cannot rewrite the accepted fact; only a separately approved workflow may change it. |
| E2-T12 | Leakage/architecture tests prove no PHI, directory secrets, commercial rationale, internal IDs or choice references in technical identifiers, URLs, storage, logs, analytics, audit bodies or notifications, and no production/Task 04 imports. |

## 14. Explicit non-authorization

This document grants **no implementation, professional, regulatory, legal, privacy, security, accessibility, migration, synthetic-runtime, pilot or production authority**. It creates no patient route, pharmacy directory, fixture, accreditation status, tenant mapping, transfer record, schema, test result, external connection or pharmacy effect. Unknown, stale, contradictory or unauthorized state fails closed. All applicable Task 08 mandatory stop conditions and Task 11 gates remain controlling.
