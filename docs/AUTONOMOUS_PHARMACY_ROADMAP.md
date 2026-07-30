# Autonomous online pharmacy roadmap

**Status:** product research roadmap; not authorization to deploy

**Team execution briefs:**
[`tasks/autonomous-pharmacy/`](tasks/autonomous-pharmacy/)

**North star:** automate coordination, documentation, and routine operations so
Ontario pharmacists can spend more time on accountable patient care. Under the
current product boundary, “autonomous” means bounded software execution around
a pharmacist—not unsupervised diagnosis, prescribing, dispensing, or claiming.

## How to execute this roadmap

This file defines product direction and sequence. The detailed contracts in
[`tasks/autonomous-pharmacy/`](tasks/autonomous-pharmacy/) define how individual
workstreams are investigated, built, evidenced, and reviewed. Updating a task
brief does not mean its capability exists; the live implementation is described
only in [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) and
[`COMPLETED_WORK.md`](COMPLETED_WORK.md).

The current execution order is:

1. **Task 01** creates a separately built, synthetic-only environment that
   cannot import or connect to the production application.
2. **Task 11** creates the quality, security, evidence, and promotion control
   plane. Its design can proceed in parallel with Task 01, but it cannot approve
   its own work or replace a named human approval.
3. **Task 02** closes the existing P0 production-readiness gaps. Bounded
   inspection/export work may proceed, while migrations and live writes remain
   separately approval-gated.
4. **Tasks 03–10** proceed only to the stage their own briefs permit. Runnable
   prototypes require Task 01; production promotion requires Task 11 evidence
   plus every task-specific privacy, security, clinical, vendor, and regulatory
   approval.

Use the [task execution index](tasks/autonomous-pharmacy/README.md) for the
current dependency map, allowed work, and handoff requirements. The task briefs
currently use **AgentRx** as a program label while this production repository is
named **AgentOMA**; no product rename is authorized by this roadmap.

## Regulatory reality

- An Ontario pharmacy internet site must be operated by an accredited Ontario
  pharmacy and remains subject to applicable pharmacy standards.
- Virtual care must meet the same standard as in-person care. The pharmacist
  determines whether the modality is appropriate and confirms identity,
  location, consent, privacy, and a technical-failure contingency.
- A pharmacy remains responsible for PHI handled by its agents. Automation and
  vendors do not transfer that accountability.
- Ontario Health publishes standards for virtual visits, online appointment
  booking, and patient portals. A production virtual-care product should map to
  those standards and pursue the applicable verification process.

These are design constraints, not legal conclusions. Every production phase
requires current OCP, privacy, payer, and legal review.

## Autonomy ladder

| Level | Software may | Human boundary |
|---|---|---|
| L0 — record | Display and store validated facts | Pharmacist performs the workflow |
| L1 — assist | Detect missing data, summarize, draft, rank non-clinical work | Pharmacist reviews every output |
| L2 — prepare | Assemble reversible tasks, documents, appointments, and messages | Human approves before external effect |
| L3 — execute operations | Perform pre-authorized, low-risk administrative actions with audit and rollback | Human monitors exceptions and can stop automation |
| L4 — clinical/fiscal finality | Not available in the current roadmap | Prescribing, dispensing release, claim submission, clinical referral decisions, and record sign-off remain pharmacist actions |

Progress is capability-by-capability. A feature does not inherit a higher level
because another feature passed review.

## Phase 0 — finish the defensible core

Before adding online autonomy:

1. Deploy and verify migration `0018` and complete the P0-C workflow.
2. Add billability evidence to complete-patient retrieval.
3. Resolve LTC billing and the orientation override.
4. Complete the first Canadian-region restore drill.
5. Finish authenticated mobile/accessibility testing and close the known
   emergency-screen issue.
6. Add CI for TypeScript, lint, pure tests, and fresh-Postgres integration tests.

This phase prevents new automation from being built on an incomplete clinical
record or an unverified migration chain.

## Phase 1 — digital front door

Build patient access without automating clinical judgment:

- Online appointment requests for in-person, telephone, or video care.
- An authenticated patient portal with identity proofing, delegated caregiver
  access, consent history, and access/correction requests.
- Secure two-way administrative messaging with explicit response-time and
  emergency-use warnings.
- Patient-controlled preferred language, accessibility needs, contact channel,
  and reminder consent.
- Digital waitlist, cancellation, rescheduling, and pharmacy-hours awareness.
- Read-only access to finalized records and follow-up plans, with plain-language
  explanations and no payment guarantees.

Use Ontario Health's appointment-booking and patient-portal standards as design
inputs. Do not put PHI in URLs, analytics, email subject lines, or push payloads.

## Phase 2 — pharmacist command centre

Evolve the current dashboard into five accountable work areas:

| Workspace | New capabilities |
|---|---|
| Today | Unified intake, appointment, follow-up, prescription-request, and exception queue; due/overdue state; staffing view |
| Patient care | Identity/consent status, structured assessment, longitudinal timeline, care plan, follow-up, and complete export |
| Review automation | Draft notes, missing-evidence checks, suggested next administrative action, source/provenance, accept/reject reason |
| Fulfilment | Prescription intake status, inventory confirmation, pharmacist verification, preparation, pickup/delivery handoff |
| Governance | Automation policy, kill switch, model/vendor inventory, audit anomalies, incidents, retention, holds, and restore evidence |

Dashboard rules:

- Every recommendation shows its source facts, age, and why it is being shown.
- “Needs pharmacist review” is a first-class queue, not a hidden warning.
- Automation never changes an immutable clinical/billing record; corrections
  supersede.
- Server components receive only the PHI needed for their page. Client
  components receive the minimum display data and never whole patient records.
- Actions are role-scoped and independently re-authorized on the server.
- Integration failures surface as work items; they never silently default.

## Phase 3 — virtual pharmacy care

- Add secure video and messaging through a platform mapped to Ontario Health's
  Virtual Visits Verification Standard.
- Capture patient and pharmacist physical location, modality consent, identity
  verification method, privacy confirmation, technical suitability, and
  fallback plan.
- Let the pharmacist switch to in-person/referral whenever virtual information
  is insufficient.
- Add pre-visit device/browser checks and an accessible low-bandwidth path.
- Keep the professional assessment, prescribing decision, record sign-off, and
  follow-up responsibility with the pharmacist.

Before a PHI-bearing pilot, complete PIA/TRA work, vendor due diligence,
contractual controls, incident handling, accessibility testing, and applicable
Ontario Health verification.

## Phase 4 — online fulfilment and delivery

- Prescription upload/request intake that creates a review task, not a valid
  prescription by assertion.
- Refill/renewal/transfer requests with status tracking and pharmacist review.
- Inventory reservation only after product, quantity, expiry, and substitution
  rules are verified by the pharmacy system of record.
- Transparent price/coverage estimates labelled as estimates until
  adjudication.
- Pickup and delivery selection, address verification, chain of custody,
  temperature/security exceptions, proof of handoff, and failed-delivery return.
- Patient choice of dispensing pharmacy remains explicit.

Internet-site operation, scheduled-drug sales, central fill, remote dispensing,
delivery, and cross-jurisdictional service each require separate current-policy
review. Do not infer permission from the existence of a website.

## Phase 5 — interoperability

1. Authenticate and pharmacy-scope `/api/fhir`; keep it disabled until the
   clinical mapping is pharmacist-reviewed.
2. Start read-only and validate every external response. Record provenance,
   consent, source time, and reconciliation status.
3. Add dispensing-software handoff with idempotency, acknowledgements,
   mismatch queues, and human reconciliation.
4. Consider payer/HNS connectivity only with Ministry/vendor specifications,
   certification, non-production conformance testing, and a pharmacist's final
   submit action.
5. Add patient-visible integration history and correction/reporting paths.

No integration response silently overwrites the clinical record or approved
reference data.

## Phase 6 — bounded intelligence

Good first AI/agent candidates:

- summarize a completed structured record for pharmacist review;
- draft patient-friendly follow-up instructions from an approved care plan;
- detect missing, contradictory, or stale evidence;
- prepare appointment and follow-up tasks from explicit rules;
- classify administrative inbox messages into queues;
- identify operational bottlenecks using aggregate, de-identified metrics;
- flag unusual access, export, or workflow patterns for privacy review.

Keep these pharmacist-gated:

- diagnosis or red-flag interpretation;
- virtual-care appropriateness;
- prescription selection, adaptation, renewal, or authorization;
- dispensing verification and release;
- referral urgency;
- final clinical documentation;
- billing eligibility, claim code, and claim submission.

Any AI touching PHI needs a documented purpose, minimum-data analysis,
vendor/model inventory, PIA/TRA, contractual controls, Canadian residency
evidence, access controls, prompt/output retention rules, human factors testing,
continuous monitoring, incident response, and a kill switch. Start in silent
mode and compare against pharmacist decisions before showing recommendations.

## Candidate backlog

| Idea | First autonomy level | Main prerequisite |
|---|---:|---|
| Appointment booking and waitlist | L3 | Identity, consent, scheduling policy, Ontario Health standard mapping |
| Consented reminders | L3 | Contact verification, message minimization, opt-out and failure handling |
| Patient portal and record access | L1 | Strong patient identity, delegated access, access/correction workflow |
| Secure virtual-care room | L1 | OCP virtual-care workflow, Ontario Health verification, PIA/TRA |
| Documentation draft assistant | L1 | Synthetic evaluation, pharmacist approval, IPC AI controls |
| Missing-evidence and contradiction detector | L1 | Stable structured schemas and explainable rules |
| Follow-up task automation | L2 | Consent, escalation policy, audited delivery outcomes |
| Prescription/refill request tracker | L2 | Accredited internet-site workflow and pharmacist review |
| Inventory and fulfilment orchestration | L2 | Pharmacy-system integration and exception reconciliation |
| Delivery coordination | L3 | Chain of custody, privacy-safe notifications, failed-delivery policy |
| Dispensing-software handoff | L2 | Vendor contract, idempotency, audit, reconciliation |
| HNS claim submission | L2 maximum | Ministry/vendor approval and pharmacist final submission |
| Quality/privacy anomaly detection | L1 | Governed aggregate data, validated thresholds, investigation workflow |

## Release gate for every capability

A capability moves beyond [`EXPERIMENTAL_SANDBOX.md`](EXPERIMENTAL_SANDBOX.md)
only when all applicable boxes are satisfied:

- accountable product and pharmacist owners;
- authoritative clinical/regulatory source and documented interpretation;
- PIA/TRA, data-flow map, Canadian residency, vendor and contract review;
- accessibility and one-handed/mobile evidence;
- threat model, least privilege, audit, retention, downtime, and incident plan;
- prospective test set with safety, false-positive, false-negative, bias, and
  failure-recovery measures;
- silent-mode comparison and limited pilot exit criteria;
- reversible rollout, kill switch, and post-release monitoring;
- current documentation and staff training.

## Official design inputs

- [OCP Virtual Care Policy](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/virtual-care-policy/)
- [OCP supplemental virtual-care guidance](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/virtual-care-policy/supplemental-guidance-to-the-virtual-care-policy/)
- [OCP community-pharmacy accreditation and internet-site resources](https://ocpinfo.com/practice_topic/community-pharmacy-accreditation-and-operation/)
- [Ontario Health Virtual Visits Verification Standard](https://www.ontariohealth.ca/digital/standards/virtual-visits)
- [Ontario Health Online Appointment Booking Standard](https://www.ontariohealth.ca/digital/standards/online-appointment-booking)
- [Ontario Health Patient Portals Standards](https://www.ontariohealth.ca/digital/standards/patient-portals)
- [IPC AI-scribe considerations for the health sector](https://www.ipc.on.ca/en/resources/ai-scribes-key-considerations-health-sector)
- [Ontario PHIPA](https://www.ontario.ca/laws/statute/04p03)

The Ministry notice in `docs/regulatory/` remains binding for the current
minor-ailment funding workflow. This roadmap deliberately contains no PINs,
fees, claim maximums, or invented clinical rules.
