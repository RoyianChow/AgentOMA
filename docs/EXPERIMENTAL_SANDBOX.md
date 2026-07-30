# Experimental sandbox policy

**Status:** internal research policy; non-production only

**Owner:** product lead

**Applies to:** prototypes, usability studies, agent experiments, and simulated
pharmacy workflows built from this repository

**Implementation task:**
[`tasks/autonomous-pharmacy/TASK-01-sandbox-enforcement.md`](tasks/autonomous-pharmacy/TASK-01-sandbox-enforcement.md)

## No legal or regulatory waiver

This document does **not** authorize anyone to bypass Ontario law, OCP
requirements, PHIPA, Ministry billing rules, clinical approval, or the safety
invariants in [`../AGENTS.md`](../AGENTS.md). A repository document cannot grant
that authority.

It authorizes a narrower thing: isolated experiments may simulate a workflow
that is not yet approved for real-world use, provided the experiment cannot
reach a patient, pharmacist production account, PHI, a real pharmacy system, or
a public payer. A simulated exception is test data and UI state, not a waiver.

## Non-negotiable invariants

These remain true in every sandbox:

1. A red-flag exit writes zero claim rows.
2. Public intake and self-check collect zero PHI.
3. A platform claim-history count is advisory and never promises payment.
4. No client, QR code, or session selects a pharmacy.
5. PINs, fees, maximums, and intervention codes come only from approved seeded
   reference data; there are no experimental billing defaults.
6. Clinical content is imported from the approved artifact, never copied or
   invented. Changed content requires a new pharmacist review.
7. `deriveClaimDraft`, audit integrity, retention controls, and migration
   history are not weakened for an experiment.

## Permitted experiment classes

| Class | Examples | Conditions |
|---|---|---|
| Green — presentation | Dashboard layouts, navigation, empty states, accessibility, synthetic reports, queue visualizations | Static or in-memory synthetic data; no clinical or billing claims |
| Green — operations | Mock appointment booking, staffing views, inventory simulations, delivery-route mockups | No real orders, medications, addresses, messages, or external systems |
| Amber — workflow simulation | Synthetic virtual visit, pharmacist review queue, AI-generated draft note, simulated claim handoff | Lead approval; isolated local database; human-review step remains visible; outputs watermarked and non-exportable |
| Amber — approved-rule replay | Exercising current triage or claim logic with synthetic fixtures | Exact approved source and seeded references only; existing tests remain green; no new clinical/billing rule |
| Red — prohibited | Real patient care, real health numbers, unsupervised diagnosis/prescribing, production claim submission, real dispensing, production secrets, or production data copies | Not permitted under this policy |

An amber experiment must have a short written experiment record containing its
owner, hypothesis, synthetic dataset, simulated exceptions, expiry date, and
success/failure measures.

## Required isolation

An experimental build must satisfy all of the following:

- Run locally or in a separately approved preview environment. It must not use
  the production domain, production Supabase project, or production credentials.
- Use a fresh Docker Postgres database with unmistakably synthetic fixtures.
  Do not use realistic health-card numbers or copy production rows.
- Have no HNS, dispensing-software, clinical-viewer, FHIR, email, SMS, payment,
  courier, e-prescribing, or object-storage connection.
- Accept no production authentication cookie and contain no real pharmacist
  account or TOTP seed.
- Display a persistent **EXPERIMENT — SYNTHETIC DATA — NOT FOR PATIENT CARE**
  banner on every screen and watermark every generated artifact.
- Be absent from marketing navigation, blocked from indexing, and shared only
  with named reviewers.
- Emit no submitted form payloads in logs, traces, analytics, screenshots, or
  error reports. Aggregate experiment counters are allowed only when they
  contain no answers or identifiers.
- Have a kill switch and an expiry date. Expired previews are removed rather
  than left online.

A runtime flag or route group inside the production app is not adequate
isolation. Task 01 must place experimental code in a separate npm workspace
with its own build entry point and artifact. The production application must
not import, package, or expose that workspace. The experiment must fail closed
when its synthetic environment is absent, and repository checks must prove the
dependency direction rather than relying on reviewer memory.

## Simulated exceptions

An experiment may represent an otherwise blocked state so reviewers can study
the UI—for example, a fake integration outage or a synthetic eligibility
failure. It must not disable the production guard to reach that state.

Use a test fixture, dependency stub, or dedicated demo model. Never add a
`bypass=true` request parameter, hidden keyboard shortcut, universal password,
admin override, fallback PIN, permissive server action, or database grant that
could survive into production.

## AI and automation experiments

AI output is untrusted draft material. In the sandbox:

- use synthetic prompts only;
- do not send PHI to a model or vendor;
- record model/version/prompt provenance without recording patient content;
- show source evidence and uncertainty;
- require a pharmacist reviewer for any clinical interpretation;
- measure omissions, unsafe recommendations, hallucinations, bias,
  accessibility, and failure recovery—not just speed;
- never let a model create a claim, prescription, referral urgency, or final
  clinical record without an explicit human decision.

The IPC's current health-sector AI guidance emphasizes vendor assessment,
contractual safeguards, ongoing monitoring, governance, and accountability.
Those controls become mandatory before any PHI-bearing AI pilot.

## Promotion to real-world use

There is no “turn the sandbox flag on in production” path. Promotion is a new
implementation decision and requires:

- product-lead scope approval;
- pharmacist clinical review where clinical behaviour is involved;
- regulatory/legal review where scope, prescribing, dispensing, internet-site
  operation, funding, or cross-jurisdictional care is involved;
- a Privacy Impact Assessment and Threat Risk Assessment for PHI-bearing work;
- Canadian data-residency and vendor-contract evidence;
- production authentication, authorization, consent, audit, retention,
  accessibility, incident response, and downtime procedures;
- reviewed file-based migrations and real-Postgres tests;
- a silent-mode or limited pilot with human verification and rollback criteria.

Production code is rebuilt to the normal repository standard. Experimental
shortcuts are deleted, not grandfathered.

## Official context

- [OCP Virtual Care Policy](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/virtual-care-policy/)
- [OCP supplemental virtual-care guidance](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/virtual-care-policy/supplemental-guidance-to-the-virtual-care-policy/)
- [OCP community-pharmacy accreditation and internet-site resources](https://ocpinfo.com/practice_topic/community-pharmacy-accreditation-and-operation/)
- [Ontario PHIPA](https://www.ontario.ca/laws/statute/04p03)
- [IPC AI-scribe considerations for the health sector](https://www.ipc.on.ca/en/resources/ai-scribes-key-considerations-health-sector)

This file is subordinate to the binding sources above, the Ministry notice in
`docs/regulatory/`, and the repository invariants in `AGENTS.md`.
