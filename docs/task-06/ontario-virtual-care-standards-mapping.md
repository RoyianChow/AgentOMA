# Task 06 — Ontario Virtual-Care Standards Mapping

**Date accessed (all sources below):** 2026-08-03
**This mapping is not legal or professional approval.** It records what each source currently
says, where repository evidence stands today, and what remains a gap. Ambiguities are flagged
for professional/privacy/legal review, not resolved here.

Two required sources (IPC) could not be retrieved by automated fetch — see §9. Their absence is
recorded as a gap, not filled from memory.

---

## 1. OCP Virtual Care Policy

| Field | Value |
|---|---|
| Title | Virtual Care Policy |
| Authority | Ontario College of Pharmacists (OCP) |
| URL | https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/virtual-care-policy/ |
| Version / effective date | 1.10, effective 2025-09-30 |
| Applicable modality | Telephone, video, secure messaging (professional interactions generally) |

**Requirements extracted:**

- Virtual care must meet the same quality standard as in-person service.
- Providing virtual care must be judged in the patient's best interest; the pharmacist weighs benefit vs. risk per patient/service.
- The modality must suit the patient's health status and needs.
- Patient must be offered a choice of modality.
- Express consent (verbal/written) when the *registrant* initiates; implied consent acceptable when the *patient* initiates. Consent must be documented in the patient file.
- Patient identity **and location** must be confirmed before each interaction.
- Technology must have privacy/security protocols compliant with Ontario legislation; PHI encrypted in transit and at rest.
- The registrant must be in a private environment; the patient must be advised to use one; the registrant must explain how privacy is protected.
- The delivery method must be documented.
- Technical functionality must be verified before the interaction; a contingency plan for technical failure is required.
- If medication administration is being observed, a plan for managing adverse events is required.

**Repository evidence:** none yet — no virtual-care code exists (§1–2 of the current-state analysis).

**Gap → required action → owner → blocking effect:**

| Gap | Required action | Owner | Blocks |
|---|---|---|---|
| No modality-suitability recording mechanism | Build the `ModalitySuitabilityDecision` contract (Workstream E) — pharmacist-only, structured reason, reassessment support | Task 06 implementer | Prototype |
| No consent-vs-modality distinction in code (existing `assessment.consent_method` is treatment consent only, per current-state §3) | Build `VirtualCareConsentEvent` as a distinct model from treatment consent | Task 06 implementer | Prototype |
| No identity/location confirmation step exists for any flow | Build `IdentityAndLocationCheck` (Workstream E) | Task 06 implementer | Prototype |
| No technical-readiness/contingency capture | Build `TechnologyReadinessResult` / `ContingencyPlan` (Workstream D/G) | Task 06 implementer | Prototype |
| "Best interest" / benefit-risk judgment is inherently professional, not something to encode as logic | None — must remain a pharmacist decision the UI supports, never computes (matches the task's own Authority Boundary) | N/A | Production (permanently — not a gap to close, a boundary to preserve) |

---

## 2. OCP Supplemental Guidance to the Virtual Care Policy

| Field | Value |
|---|---|
| Title | Supplemental Guidance to the Virtual Care Policy |
| Authority | OCP |
| URL | https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/virtual-care-policy/supplemental-guidance-to-the-virtual-care-policy/ |
| Version / date | 1.00, published 2025-10-15, last reviewed 2025-10-15 |
| Applicable modality | All; explicitly distinguishes telephone from video |

**Requirements extracted:**

- OCP does **not** approve specific platforms — registrants must exercise their own due diligence (peer consultation, vendor material review, legal advice on contracts). Directly confirms the task's own instruction: *"Do not treat OCP as approving specific technologies."*
- **Video is not mandatory.** A telephone interaction qualifies as virtual care when it involves professional services (counselling, medication management, condition assessment) — *not* for routine administrative calls. This directly supports Workstream G's requirement to treat telephone as a first-class, not degraded, modality.
- Remote access to workplace patient records must use secure transmission, access control, and must not store unencrypted PHI on the registrant's device.
- "Reasonable efforts" to confirm identity — even for existing/known patients — including verifying demographic information. Notably weaker language than a hard proofing standard; this repo's task brief already goes further (explicitly rejecting DOB/address/health-card-alone as sufficient), which is a **stricter-than-minimum internal design choice**, not a gap.
- Consent required both for virtual care itself and for PHI collection under PHIPA — two separate consents.
- Dispensing/compounding must stay in the accredited pharmacy; cognitive services (assessment, counselling) may occur elsewhere if professional/legal responsibilities are met.

**Repository evidence:** none.

**Gap → action → owner → blocking effect:** covered by the same rows as §1 (this document adds interpretive detail, not new required contracts).

---

## 3. OCP Cross-Jurisdictional Pharmacy Services Policy

| Field | Value |
|---|---|
| Title | Cross-Jurisdictional Pharmacy Services Policy |
| Authority | OCP |
| URL | https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/cross-jurisdictional-pharmacy-services-policy/ |
| Version / date | 2.00, published 2022-08-25 |
| Applicable modality | All, when patient or pharmacist is outside Ontario |

**Requirements extracted:**

- An Ontario-licensed pharmacist serving an out-of-province patient must comply with **both** OCP's requirements **and** the destination jurisdiction's requirements; informed consent is mandatory and must be documented.
- An out-of-province practitioner serving an Ontario patient must hold registration from another Canadian jurisdiction and comply with both OCP standards and their home regulator's.
- Registrants must not dispense against a prescription from a practitioner without valid Canadian registration; due diligence on prescription authenticity and the prescriber-patient therapeutic relationship is required.

**Repository evidence:** none. The current single-tenant design has no location field on any table.

**Gap → action → owner → blocking effect:**

| Gap | Required action | Owner | Blocks |
|---|---|---|---|
| No jurisdiction-determination mechanism exists | Build `IdentityAndLocationCheck`'s jurisdiction field (Workstream E) — patient/agent statement only, never IP/GPS-inferred, per the task's own explicit prohibition | Task 06 implementer | Prototype (synthetic version only — no real cross-jurisdictional enablement under any circumstance this task authorizes) |
| No policy exists for what happens when jurisdiction ≠ Ontario | Cross-jurisdictional care stays hard-blocked in the synthetic prototype; production enablement requires a **separate** review this task does not grant | Product/compliance lead | Production (permanently gated) |

---

## 4. Ontario Health Virtual Visits Verification Standard

| Field | Value |
|---|---|
| Title | Virtual Visits Verification Standard |
| Authority | Ontario Health, with the Ministry of Health and OntarioMD |
| URL | https://www.ontariohealth.ca/digital/standards/virtual-visits.html |
| Version / date | Last updated 2026-06-04 |
| Applicable modality | Video and secure messaging (verified separately per the standard's own structure) |

**Requirements extracted:**

- Verification requires a current PIA and TRA summary, or a SOC 2 Type II audit, plus attestation and scenario-based validation testing against the standard's mandatory requirements.
- **Ontario Health explicitly disclaims endorsement**: verification is "a review process," not approval, and providers are told to do their own due diligence. Directly confirms the task's instruction not to treat verification as legal/PHIPA approval.
- The public summary does not itself enumerate identity-verification, waiting-room, host-control, encryption, or recording-default specifics — those live in the full standard document, which is not publicly mirrored at this URL and was not independently retrieved here.

**Repository evidence:** none.

**Gap → action → owner → blocking effect:**

| Gap | Required action | Owner | Blocks |
|---|---|---|---|
| Full standard text (beyond this summary) not yet obtained | Request the complete Virtual Visits Verification Standard document from Ontario Health if/when Workstream B (vendor evaluation) proceeds toward a real vendor decision | Task 06 implementer / product lead | Production vendor selection (not the synthetic prototype) |
| No vendor has been evaluated against it | Workstream B build-vs-integrate decision, once produced | Task 06 implementer | Production |

---

## 5. Ontario Health Verified Virtual Visit Solutions

| Field | Value |
|---|---|
| Title | Verified Virtual Visit Solutions |
| Authority | Ontario Health |
| URL | https://www.ontariohealth.ca/digital/standards/virtual-visits/solutions-verified.html |
| Version / date | Last updated 2026-06-04 |
| Applicable modality | Video and/or secure messaging — the list labels each solution by which it covers |

**Requirements extracted:**

- 38 solutions listed as of the access date (e.g., Maple, Zoom for Healthcare, Webex Meetings by Cisco, Telus Health MyCare, OTN eVisit, Ocean, Microsoft Teams + Bookings, and others) — each tagged Video, Secure Messaging, or both.
- Explicit disclaimer: **"Ontario Health performs a review of privacy and security documentation, not an assessment"** — providers must independently confirm legislative compliance. This is a materially weaker claim than "approved" and must never be described otherwise in this repo's documentation (matches the task's own prohibition).
- No per-solution expiry date is shown on the page itself.

**Repository evidence:** none — no vendor has been selected or evaluated (per this task's own scope, procurement is explicitly not authorized).

**Gap → action → owner → blocking effect:** feeds directly into Workstream B's vendor scorecard (separate deliverable) — not a gap in this document, this *is* the raw input to that workstream.

---

## 6. Ontario Health Accessibility Guidance for Virtual Visits

| Field | Value |
|---|---|
| Title | Accessibility Guidance for Virtual Visits |
| Authority | Ontario Health |
| URL | https://ontariohealth.ca/digital/standards/virtual-visits/accessibility.html |
| Version / date | 2026-06-04 |
| Applicable modality | Video, secure messaging, remote care management generally |

**Requirements extracted:**

- Recommends: font resizing, keyboard navigation, dark/high-contrast modes, closed captions (auto/manual/third-party), screen-reader compatibility, multi-pin video enlargement, caller ID, online booking.
- Solutions must conform to **AODA / WCAG 2.0 Level AA**. Non-compliance can carry fines up to $100,000/day for a corporation — this is a hard legal floor, not a suggestion.
- Live captioning and pre-recorded audio description are explicitly **not** required for live video calls under this guidance.
- Low-bandwidth behavior and alternative-format support are not addressed by this specific page (a gap in the source itself, not in this repo).

**Repository evidence:** the task's own accessibility requirements (Workstream G) already meet or exceed this — 375px, keyboard, screen-reader, 200%/400% zoom, reduced motion, 56px targets, camera-free operation, telephone fallback. No conflict found; this source confirms the floor, doesn't add a new requirement beyond what Workstream G already specifies.

**Gap:** none identified beyond what's already planned in Workstream G.

---

## 7. PHIPA and its regulations

Not independently re-derived here — this repo's `docs/COMPLIANCE.md` and the existing `AGENTS.md` invariants (audit immutability, tenant isolation, PHI-minimization) already encode PHIPA-driven design decisions for the assessment/claim boundary. Task 06 inherits those same principles (encryption, minimum-necessary logging, no PHI in URLs/logs/analytics) rather than re-deriving PHIPA from first principles. **This mapping explicitly does not claim PHIPA requires Canadian data residency** — per the task's own instruction, residency is a project/procurement/contract/risk decision requiring its own evidence, not a blanket legal reading.

## 8. Health Care Consent Act

Applies wherever Task 06 collects consent to treatment (as opposed to consent to the virtual modality). This repo's existing `assessment.consent_method`/`consent_given_by` (patient vs. substitute decision-maker) fields already implement an HCCA-aware treatment-consent model at assessment completion (migration `0012_clinical_record_and_consent.sql`). Task 06's `VirtualCareConsentEvent` is additive and must not weaken or duplicate that existing treatment-consent capture.

## 9. IPC sources — NOT independently verified (recorded as a gap, not guessed)

| Field | Value |
|---|---|
| Title | Privacy and Security Considerations for Virtual Health Care Visits (PDF) |
| Authority | Information and Privacy Commissioner of Ontario |
| URL | https://www.ipc.on.ca/sites/default/files/legacy/2021/02/virtual-health-care-visits.pdf |
| Access result | **HTTP 403 — automated fetch blocked** |

| Field | Value |
|---|---|
| Title | Privacy and Virtual Health Care |
| Authority | IPC Ontario |
| URL | https://www.ipc.on.ca/en/covid-19-information-and-resources/privacy-and-virtual-health-care |
| Access result | **HTTP 403 — automated fetch blocked** (retried at an alternate path, same result) |

**Gap:** both required IPC sources return HTTP 403 to automated fetching (likely bot protection on `ipc.on.ca`, not an authentication requirement). Their content is **not** reconstructed from training-data memory, per the task's explicit instruction against inventing policy. **Required action:** a human reviewer needs to retrieve these two documents directly (browser, not automated fetch) before Workstream K/L's privacy-and-security controls can be described as verified against IPC guidance rather than against OCP/Ontario Health sources alone. **Owner:** privacy/security reviewer. **Blocks:** does not block the synthetic prototype (which doesn't depend on IPC-specific detail beyond general PHIPA/encryption/minimization principles already reflected in existing repo conventions), but **does block** claiming the privacy/security plan (Workstream K) is fully sourced.

---

## Summary table

| # | Source | Accessed | Blocks prototype? | Blocks production? |
|---|---|---|---|---|
| 1 | OCP Virtual Care Policy | ✅ | No — design accounts for it | Yes, until controls built |
| 2 | OCP Supplemental Guidance | ✅ | No | Yes |
| 3 | OCP Cross-Jurisdictional Policy | ✅ | No | Yes (permanently gated pending separate review) |
| 4 | OH Virtual Visits Verification Standard | ✅ (summary only) | No | Yes, for vendor selection |
| 5 | OH Verified Solutions list | ✅ | No | Feeds Workstream B |
| 6 | OH Accessibility Guidance | ✅ | No | No new gap found |
| 7 | PHIPA | Inherited from existing repo compliance docs | No | Ongoing |
| 8 | HCCA | Inherited from existing consent model | No | Ongoing |
| 9a | IPC PDF | ❌ 403 | No | Yes — blocks Workstream K sign-off |
| 9b | IPC webpage | ❌ 403 | No | Yes — blocks Workstream K sign-off |
