# Task 04 — Ontario Booking Guidance Mapping

**Status:** Draft documented; review/correction in progress; runtime not implemented
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Research date:** 2026-07-31
**Synthetic implementation:** Approved on 2026-08-02 through 2026-08-05
**Task 11 Checkpoint 1:** `APPROVED_TO_IMPLEMENT_SYNTHETIC`
**Risk/autonomy:** `R3`; `A3_BOUNDED_AUTOMATION`
**Expiry/review due:** 2026-08-05
**Governance roles:** Accountable owner, backup owner, and Operations/SRE
reviewer: Royian Chowdhury (consolidated, non-independent)

Production, G2, G3, live data, cloud databases, external effects, and
production imports remain prohibited. Royian Chowdhury holds the accountable
owner, backup owner, and Operations/SRE reviewer roles; this is consolidated,
non-independent coverage. Dates, classifications, and interpretations below
remain planning assertions until verified against the cited first-party source;
the 2026-08-02 approval does not approve their legal or policy substance.

## Canonical planning references

This mapping does not redefine Task 04 fields or transitions. Boundary
contracts are canonical in
[`api-and-zod-contracts.md`](api-and-zod-contracts.md), transitions in
[`state-machines.md`](state-machines.md), and evidence mapping in section 11.1
of [`pre-implementation-test-plan.md`](pre-implementation-test-plan.md).

## 1. Purpose

This document maps the proposed synthetic Task 04 booking and waitlist design
against current official Ontario sources relevant to:

- Patient-initiated online appointment booking.
- In-person, telephone, and video appointments.
- Caregiver or delegated booking.
- Privacy and data minimization.
- Virtual-care consent and suitability.
- Accessibility.
- Confirmation and reminder functionality.
- Reporting and operational administration.

This is a planning and gap-analysis document.

It is not:

- Legal advice.
- A completed privacy impact assessment.
- A production-readiness decision.
- Approval to connect to production identity, data, communications, or
  infrastructure.
- A substitute for review by privacy, security, accessibility, professional,
  product, and legal owners.

## 2. Scope of the mapping

The mapping covers the synthetic Task 04 prototype only.

The prototype is intended to support:

- Public-safe availability discovery.
- In-person, telephone, and video modality selection.
- Booking.
- Cancellation.
- Rescheduling.
- Waitlist entry and cancellation.
- Expiring waitlist offers.
- Authorized booking management.
- A minimum-necessary pharmacist administrative queue.

The prototype does not:

- Collect clinical reasons for the appointment.
- Determine whether a patient is clinically eligible for a service.
- Determine whether telephone or video care is professionally appropriate.
- Send real confirmations or reminders.
- Connect to a production patient identity.
- Treat caregiver self-attestation as authority.
- Collect real personal or personal health information.
- Complete an assessment, prescription, billing event, or claim.

## 3. Status legend

| Status | Meaning |
|---|---|
| `ALIGNED` | The current design directly addresses the source expectation |
| `PARTIAL` | The design addresses part of the expectation, but implementation or approval is missing |
| `DEFERRED` | The requirement belongs to another governed task or future production decision |
| `BLOCKED` | Work cannot safely continue without an approval or dependency |
| `NOT_APPLICABLE_SYNTHETIC` | The item is intentionally excluded from the synthetic prototype |
| `VERIFY_BEFORE_PILOT` | The exact current requirement or organizational applicability must be confirmed before a pilot |

## 4. Official source register

### OH-OAB-01 — Ontario Health Online Appointment Booking Standard page

**Issuing authority:** Ontario Health
**Title:** Online Appointment Booking Standard
**Page revision date:** Not independently confirmed; verify before pilot
**Accessed:** July 31, 2026
**Official page:**

https://www.ontariohealth.ca/digital/standards/online-appointment-booking

**Relevant points:**

- The standard contains mandatory and recommended functional and
  non-functional requirements.
- It supports patient-initiated online appointment booking.
- It is intended to assist Ontario Health Teams, providers, health care
  organizations, and vendors.
- Online booking may support in-person, video, and telephone appointments.
- The service may provide automated confirmations and reminders.
- Ontario Health identifies privacy, security, accessibility, administrative
  efficiency, and caregiver access as important benefits.

### OH-OAB-02 — Ontario Health Online Appointment Booking Solution Requirements

**Issuing authority:** Ontario Health
**Title:** Online Appointment Booking Solution Requirements
**Document version:** Version 2.0
**Document copyright:** 2024
**Publication/revision date:** Not recorded in repository material; copyright
2024 is not treated as a publication date
**Accessed:** July 31, 2026
**Official document:**

https://www.ontariohealth.ca/content/dam/ontariohealth/documents/online-appointment-booking-service-standard.pdf

**Relevant points identified in Version 2.0:**

- The standard includes mandatory and recommended requirements.
- Caregivers are included where patient booking is discussed.
- The solution must support a mobile and web interface that is device
  agnostic.
- Reporting on booking activity is identified as a requirement.
- Calendar download is identified as a recommended capability.
- English and French interfaces are identified as a recommended capability,
  with a notice that this may become mandatory in a future version.
- Privacy and security requirements were aligned with Ontario Health virtual
  visit standards.
- Some previous notification requirements, including a specific SMS
  requirement, were removed.

The repository summary directly records `recommended` for calendar download
and English/French interfaces. It does not preserve the source table’s exact
priority code for the other mapped statements. Those rows use
`PRIORITY_REQUIRES_FIRST_PARTY_REVERIFICATION` below rather than converting
words such as “must,” “should,” or “requirement” into an invented priority.
The source priority and the target organization’s applicability are separate
decisions and both must be checked before a future pilot or procurement
decision.

### OH-DS-01 — Ontario Health Digital Standards in Health Care

**Issuing authority:** Ontario Health
**Title:** Digital Standards in Health Care
**Page revision date:** Not independently confirmed; verify before pilot
**Accessed:** July 31, 2026
**Official page:**

https://www.ontariohealth.ca/digital/standards

**Relevant points:**

Ontario Health maintains provincial standards covering:

- Online appointment booking.
- Virtual visit solutions.
- Patient portals.
- Digital health information exchange.

Task 04 must not treat booking as isolated from the applicable identity,
privacy, virtual-care, portal, and information-exchange boundaries.

### IPC-VC-01 — Privacy and virtual health care

**Issuing authority:** Information and Privacy Commissioner of Ontario
**Title:** Privacy and Virtual Health Care
**Accessed:** July 31, 2026
**Official page:**

https://www.ipc.on.ca/en/covid-19-information-and-resources/privacy-and-virtual-health-care

**Relevant points:**

- PHIPA applies to virtual health care as it does to in-person care.
- Virtual care creates privacy and security risks, including eavesdropping,
  technical failures, software vulnerabilities, and configuration errors.
- A provider should determine whether a virtual visit is appropriate before
  the visit.
- Patients should receive plain-language information about virtual-care
  limitations and risks.
- Consent must be voluntary.
- Patients should be informed that they may withdraw consent.

### IPC-DM-01 — Collection, use, and disclosure of personal health information

**Issuing authority:** Information and Privacy Commissioner of Ontario
**Title:** Collection, Use and Disclosure of Personal Health Information
**Accessed:** July 31, 2026
**Official page:**

https://www.ipc.on.ca/en/health-organizations/collection-use-and-disclosure-of-personal-health-information

**Relevant points:**

- Personal health information should not be collected, used, or disclosed when
  other information will serve the purpose.
- No more personal health information should be collected, used, or disclosed
  than is reasonably necessary for the purpose.

### ON-PHIPA-01 — Personal Health Information Protection Act, 2004

**Issuing authority:** Government of Ontario
**Title:** Personal Health Information Protection Act, 2004
**Accessed:** July 31, 2026
**Official source:**

https://www.ontario.ca/laws/statute/04p03

**Relevant points:**

- Ontario establishes rules for collecting, using, and disclosing personal
  health information.
- Health information custodians must take reasonable steps to protect personal
  health information against theft, loss, and unauthorized use or disclosure.
- Records must be protected against unauthorized copying, modification, or
  disposal.
- The exact application of PHIPA to each production party and workflow must be
  determined by the responsible privacy and legal owners.

### ON-AODA-01 — Integrated Accessibility Standards

**Issuing authority:** Government of Ontario
**Title:** Ontario Regulation 191/11 — Integrated Accessibility Standards
**Accessed:** July 31, 2026
**Official source:**

https://www.ontario.ca/laws/regulation/110191

**Relevant points:**

Covered public websites and web content must meet the applicable WCAG 2.0
Level A and Level AA requirements, subject to the regulation’s scope,
deadlines, exceptions, and organizational classifications.

### ON-AODA-02 — How to make websites accessible

**Issuing authority:** Government of Ontario
**Title:** How to Make Websites Accessible
**Accessed:** July 31, 2026
**Official page:**

https://www.ontario.ca/page/how-make-websites-accessible

**Relevant points:**

- Accessibility obligations depend on the type and size of the organization.
- Designated public-sector organizations and qualifying large businesses or
  non-profits have public website accessibility obligations.
- Organizational applicability must be confirmed before production or pilot
  use.
- Task 04 will use WCAG 2.0 Level AA as a minimum design baseline even while
  exact legal applicability is being reviewed.

## 5. Requirement mapping

### 5.1 Source priority and organizational applicability

| Mapped source subject | Repository-supported source priority | Organizational applicability |
|---|---|---|
| Version 2.0 calendar download | `RECOMMENDED_IN_REPOSITORY_SUMMARY` | `TARGET_ORGANIZATION_APPLICABILITY_UNCONFIRMED` |
| Version 2.0 English/French interfaces | `RECOMMENDED_IN_REPOSITORY_SUMMARY`; repository summary also notes possible future mandatory status | `TARGET_ORGANIZATION_APPLICABILITY_UNCONFIRMED` |
| Other Version 2.0 booking, confirmation, caregiver, device, privacy/security, or reporting rows | `PRIORITY_REQUIRES_FIRST_PARTY_REVERIFICATION` | `TARGET_ORGANIZATION_APPLICABILITY_UNCONFIRMED` |
| IPC privacy guidance | `NOT_AN_OAB_MANDATORY_RECOMMENDED_CLASSIFICATION` | Privacy/legal owner must determine applicability |
| PHIPA source material | `NOT_AN_OAB_MANDATORY_RECOMMENDED_CLASSIFICATION` | Privacy/legal owner must determine the organization’s role and obligations |
| Ontario Regulation 191/11 and accessibility guidance | `NOT_AN_OAB_MANDATORY_RECOMMENDED_CLASSIFICATION` | Accessibility/legal owner must determine organization-specific applicability |

`ALIGNED`, `PARTIAL`, `DEFERRED`, `BLOCKED`, and
`VERIFY_BEFORE_PILOT` describe Task 04 design status only. They do not state
the source priority or decide legal/organizational applicability.

### 5.2 Design mapping

| ID | Repository summary/paraphrase (not priority language) | Current Task 04 design | Status | Required action | Future-pilot blocker |
|---|---|---|---|---|---|
| MAP-01 | Patients should be able to initiate an appointment booking online | Public availability and a create-booking command are included in the design | `PARTIAL` | Implement only inside the 2026-08-02 approved synthetic scope; produce Checkpoint 2 evidence | Yes |
| MAP-02 | Booking may support in-person, telephone, and video appointments | The modality allowlist contains `in_person`, `telephone`, and `video` | `ALIGNED` | Preserve strict allowlisting and avoid claiming clinical suitability | No for synthetic design |
| MAP-03 | A patient should be able to choose an available date and time | Public-safe availability projections and opaque slot references are designed | `PARTIAL` | Implement bounded queries, expiry, revalidation, and pagination | Yes |
| MAP-04 | A displayed appointment must be confirmed through a reliable booking process | Task 04 treats displayed availability as advisory and revalidates capacity transactionally | `PARTIAL` | Prove capacity and race behavior using real PostgreSQL | Yes |
| MAP-05 | Solutions should support automated appointment confirmation | The design returns a safe in-application result and writes an outbox event with `dispatch_status = not_dispatched` | `DEFERRED` | Task 07 must own real delivery policy and implementation | Yes for real confirmations |
| MAP-06 | Solutions may offer email, text, or voice reminders | No external delivery is permitted in the Task 01 sandbox | `DEFERRED` | Define minimum-necessary content, consent, opt-out, delivery, and failure handling under Task 07 | Yes for real reminders |
| MAP-07 | Designated caregivers may book for the people they care for | Actor and subject are separate; delegation requires a server-owned grant | `PARTIAL` | Task 05 must define production identity and delegation evidence | Yes |
| MAP-08 | Caregiver access must not expose unrelated patient information | Commands require subject, scope, pharmacy, resource, and action authorization | `PARTIAL` | Add denial and cross-subject tests after implementation approval | Yes |
| MAP-09 | The service should be available through mobile and web interfaces | Responsive mobile and desktop testing is included in the test plan | `PARTIAL` | Implement and test at 375px, desktop, zoom, and reflow | Yes |
| MAP-10 | The service should protect patient privacy | The prototype prohibits real data, clinical narratives, health-card data, URL leakage, browser persistence, and sensitive logs | `PARTIAL` | Complete privacy review and prohibited-sink tests | Yes |
| MAP-11 | Collect no more health information than reasonably necessary | The booking contract excludes symptoms, diagnoses, medications, health-card numbers, and reason-for-visit free text | `ALIGNED` | Preserve strict schemas and reject unknown fields | No for synthetic design |
| MAP-12 | Use non-health information when it can serve the purpose | Task 04 uses opaque references, service categories, modality, time, and structured administrative preferences | `ALIGNED` | Do not add clinical intake fields to booking | No |
| MAP-13 | Protect information from unauthorized access and modification | Server-derived authority, server-only `PHARMACY_ID`, state machines, append-only audit references, and database constraints are designed | `PARTIAL` | Implement and test authorization, audit, and database controls; independent production review remains separate | Yes |
| MAP-14 | Virtual-care privacy risks must be explained plainly | No production consent or risk notice has been approved | `BLOCKED` | Product, privacy, and professional owners must approve wording | Yes for video or telephone pilot |
| MAP-15 | Consent for virtual-care technology must be valid and voluntary | The current prototype does not collect production consent | `DEFERRED` | Define consent authority, evidence, withdrawal, and versioning before production | Yes |
| MAP-16 | Virtual-care appropriateness should be considered before the visit | Task 04 explicitly states that modality selection does not prove clinical suitability | `PARTIAL` | Define the professional review or confirmation boundary outside Task 04 | Yes for virtual-care production |
| MAP-17 | Patients should not be forced into virtual care | In-person remains an allowlisted modality and the design does not automatically convert appointments | `PARTIAL` | Confirm service-specific availability and alternative-access policy | Conditional |
| MAP-18 | Public websites should meet applicable Ontario accessibility requirements | The test plan includes keyboard, focus, screen reader, 200%/400% zoom, reduced motion, reflow, and long-label testing | `PARTIAL` | Implement UI and capture accessibility evidence | Yes |
| MAP-19 | Booking should be usable by people who cannot rely on telephone access | The proposed flow is self-service and keyboard accessible | `PARTIAL` | Test with assistive technology and provide a governed alternative-access path | Yes |
| MAP-20 | Calendar download may be offered | Calendar export is not included in the current synthetic scope | `DEFERRED` | Assess privacy-safe `.ics` content and ownership after the core workflow | No for synthetic prototype |
| MAP-21 | English and French interfaces are recommended in Version 2.0, with possible future mandatory status | The plan includes long translated-string testing but no completed bilingual interface | `VERIFY_BEFORE_PILOT` | Confirm the latest standard and implement governed translations | Conditional |
| MAP-22 | Booking-activity reporting is identified in Version 2.0 | No administrative reporting export is currently designed | `PARTIAL` | Define privacy-preserving aggregate reports without exposing patient data | Yes if mandatory for the target pilot |
| MAP-23 | Reports should support useful booking statistics and date ranges | The current design contains bounded date-range schemas but no reporting capability | `PARTIAL` | Add a separate reviewed reporting contract after requirement confirmation | Conditional |
| MAP-24 | Digital solutions should be safe and secure | Task 04 includes threat modelling, idempotency, authorization, rate limiting, rollback, recovery, and kill-switch planning | `PARTIAL` | Produce implementation-bound security evidence | Yes |
| MAP-25 | Booking should improve administration without exposing private schedules | Public availability excludes staff identities, staffing levels, exact capacity, and internal schedules | `ALIGNED` | Maintain minimized public projections | No |
| MAP-26 | The service should support reliable cancellation and rescheduling where offered | Booking state machines define cancellation and historical rescheduling relationships | `PARTIAL` | Implement atomic capacity release/acquisition and race tests | Yes |
| MAP-27 | Confirmations and reminders should contain useful appointment details | No real message content is approved | `DEFERRED` | Task 07 must define approved fields and prohibited content | Yes for delivery |
| MAP-28 | Systems should support operational accountability | Append-only audit references, events, idempotency results, evidence hashes, and test records are designed | `PARTIAL` | Implement without storing sensitive payloads | Yes |
| MAP-29 | Accessibility accommodations should have a usable contact or recovery path | A structured accessibility indicator and neutral contact request are proposed | `PARTIAL` | Approve the operational owner and response path | Yes |
| MAP-30 | Standards should be used with due diligence and applicable law | This document identifies unresolved privacy, legal, professional, accessibility, and production decisions | `ALIGNED` | Obtain independent review before pilot or production | Yes |

## 6. Design decisions supported by the mapping

### 6.1 Keep booking administrative

The booking flow must remain separate from clinical assessment.

Task 04 should collect enough information to schedule an administrative
appointment, but it should not collect:

- Symptoms.
- Diagnoses.
- Medication history.
- Clinical urgency.
- Reason-for-visit narratives.
- Health-card details.
- Billing eligibility.
- Prescription information.

This supports the minimum-necessary principle and prevents a scheduling tool
from silently becoming an unreviewed clinical intake system.

### 6.2 Treat modality as a preference, not a clinical decision

Selecting `telephone` or `video` means that the user requested that modality.

It does not mean:

- The modality is clinically appropriate.
- A pharmacist has reviewed the request.
- The service can safely be completed remotely.
- The patient is eligible for the service.
- The appointment is guaranteed.

A future production workflow must define where professional suitability is
reviewed and how a patient receives a safe alternative when virtual care is not
appropriate.

### 6.3 Keep actor and subject separate

Ontario Health identifies caregiver access as a benefit of online appointment
booking.

The implementation must therefore support delegated access without treating a
caregiver checkbox as proof of authority.

The server must verify:

- Actor identity.
- Subject identity.
- Relationship or grant.
- Allowed actions.
- Effective time.
- Expiry.
- Revocation.
- Server-only `PHARMACY_ID` scope.

Production delegation remains blocked on Task 05.

### 6.4 Do not expose exact capacity

The public availability response should expose only a coarse availability
state and an opaque slot reference.

It should not expose:

- The exact number of remaining appointments.
- The number of existing patients.
- The waitlist length.
- Staff names.
- Staff schedules.
- Operational staffing levels.
- Internal slot identifiers.

The server must revalidate capacity during the booking transaction.

### 6.5 Separate confirmation from notification delivery

A successful booking transaction may return an in-application confirmation.

A transactional outbox event may record that a confirmation would be required.

Task 04 must not independently activate:

- Email.
- SMS.
- Voice calls.
- Push notifications.
- Calendar invitations.
- Webhooks.

Real delivery, content, consent, opt-out, retries, and failure handling remain
owned by Task 07.

### 6.6 Apply privacy by design before real data exists

The synthetic prototype should prove the privacy architecture before any real
information is introduced.

Required controls include:

- Strict Zod objects.
- Unknown-field rejection.
- Opaque references.
- Server-derived authority.
- Minimum-necessary projections.
- No browser persistence.
- No personal information in URLs.
- No payload logging.
- No contact data in events.
- No raw token storage.
- Append-only audit references.
- Cross-subject and cross-pharmacy denial.
- Forbidden-marker leakage tests.

## 7. Accessibility mapping

The Task 04 interface will use WCAG 2.0 Level AA as the minimum design baseline
while exact organizational obligations are reviewed.

Planned evidence includes:

- Keyboard-only operation.
- Logical focus order.
- Visible focus.
- Programmatic labels.
- Error messages connected to fields.
- Screen-reader status announcements.
- No colour-only meaning.
- 200% zoom.
- 400% zoom and reflow.
- Reduced-motion support.
- 375px mobile layout.
- Desktop layout.
- Long English and translated labels.
- Accessible expired-link recovery.
- Accessible rate-limit recovery.
- No essential hover-only actions.
- Minimum touch-target testing for frequent actions.

The final production owner must also confirm:

- Whether the organization is a designated public-sector organization.
- Whether the organization has 50 or more employees.
- Which AODA reporting and website rules apply.
- Who owns accommodation requests.
- What non-digital booking alternative is provided.
- Whether English and French interfaces are required for the specific service.

## 8. Privacy mapping

### Data minimization

The current design supports:

- Opaque actor and subject references.
- Appointment service category.
- Modality.
- Start and end time.
- Structured language preference.
- Structured accessibility-preparation indicator.
- Server-owned `SyntheticContactReference`, never a raw contact destination.
- Booking and waitlist state.

The design excludes:

- Clinical narratives.
- Health numbers.
- Diagnoses.
- Medications.
- Allergies.
- Pregnancy information.
- Prescription details.
- Payment details.
- Claim information.
- Unrestricted accommodation narratives.

### Safeguards

Before any real information is permitted, the production design must define
and test:

- Authentication.
- Authorization.
- Delegation.
- Encryption in transit.
- Encryption at rest where applicable.
- Key and secret management.
- Audit access.
- Incident handling.
- Retention.
- Secure disposal.
- Vendor or service-provider obligations.
- Privacy breach detection and reporting.
- Disaster recovery.
- Data residency and hosting decisions.
- Privacy-impact assessment ownership.

These items are outside the current synthetic authorization.

## 9. Current gaps

### GAP-01 — No runnable booking implementation

The planning contracts exist, but no route, server action, UI, domain service,
or database schema has been implemented.

**Status:** Approved for synthetic implementation on 2026-08-02; runtime and
Checkpoint 2 evidence remain unimplemented.

### GAP-02 — Approved PostgreSQL extension is not implemented

Task 04 requires real PostgreSQL evidence for capacity and concurrency. The
approved loopback-only synthetic extension has not been implemented.

**Status:** Synthetic scope approved through 2026-08-05; implementation and
evidence pending. Cloud or production databases remain prohibited.

The database-extension authorization blocker is satisfied by the official
2026-08-02 approval. The remaining gap is implementation and Checkpoint 2
evidence, not permission to perform the approved loopback-only synthetic work.

### GAP-03 — No production identity or delegation

The synthetic design separates actor and subject, but no production identity
or caregiver-grant authority is connected.

**Status:** Deferred to Task 05.

### GAP-04 — No real confirmations or reminders

Only an internal outbox contract with `dispatch_status = not_dispatched`,
`synthetic_marker`, and `source_capability` is permitted.

**Status:** Deferred to Task 07.

### GAP-05 — No approved virtual-care consent wording

The system has no approved wording for virtual-care risks, consent,
withdrawal, or alternatives.

**Status:** Production blocker for telephone and video workflows.

### GAP-06 — No professional suitability workflow

The booking tool cannot decide that a telephone or video appointment is
professionally suitable.

**Status:** Production blocker until the responsible professional and product
owners define the boundary.

### GAP-07 — No bilingual interface

The design considers long translated strings but does not currently provide a
complete English and French interface.

**Status:** Verify the current Ontario Health standard and service-specific
obligations before pilot.

### GAP-08 — No reporting export

Version 2.0 identifies booking reporting as a requirement, but Task 04 has not
yet defined a reporting contract.

**Status:** Verify exact current priority and add a privacy-preserving design
before a target pilot where required.

### GAP-09 — No calendar export

Calendar download is not currently included.

**Status:** Non-blocking for the synthetic prototype; assess after core
booking safety is proven.

### GAP-10 — Accessibility evidence not yet produced

The test plan defines the required checks, but there is no implemented
interface to test.

**Status:** Implementation and pilot blocker.

## 10. Future-pilot blockers

The following must be resolved before Task 04 can be represented as ready for a
real pilot:

1. Task 11 Checkpoint 1 approval.
2. Approved Task 01 database extension.
3. Implemented PostgreSQL capacity controls.
4. Real-database concurrency evidence.
5. Identity and delegation integration through Task 05.
6. Privacy review and applicable privacy impact assessment.
7. Security review.
8. Accessibility implementation and evidence.
9. Approved virtual-care risk and consent wording.
10. Defined professional suitability and escalation boundary.
11. Task 07 confirmation and reminder design.
12. Bilingual requirement confirmation.
13. Reporting-requirement confirmation.
14. Retention and disposal decisions.
15. Production hosting, data-residency, and vendor review.
16. Kill-switch, rollback, recovery, and downtime evidence.
17. Exact commit-bound release evidence.
18. Explicit production authorization.

## 11. Items that do not block synthetic design work

The following can remain deferred while planning and synthetic-only work
continues:

- Live email, SMS, voice, or push delivery.
- Production caregiver identity.
- Production retention periods.
- Production calendar export.
- Production analytics.
- Production reporting export.
- Production response-time commitments.
- Production hosting.
- Real patient data.
- Real pharmacy data.
- Real staff data.
- Production assessment or claim integration.

These exclusions must remain visible and must not be silently replaced with
invented policy.

## 12. Required review questions

Reviewers should answer:

1. Is Ontario Health Online Appointment Booking Solution Requirements Version
   2.0 still the correct detailed standard for the intended pilot?
2. Have any requirements changed since Version 2.0?
3. Is English and French support mandatory for the intended organization or
   service?
4. Which booking reports are mandatory?
5. Is calendar export required?
6. What organization-specific AODA obligations apply?
7. Who owns virtual-care suitability?
8. Who approves virtual-care privacy and consent wording?
9. What evidence authorizes a caregiver or delegate?
10. Which confirmations and reminders are required?
11. What minimum appointment information may be included in a message?
12. What retention period applies to bookings, waitlists, tokens, audit
    evidence, idempotency records, and events?
13. What alternative booking method is provided when online booking is not
    accessible or appropriate?
14. What production privacy impact assessment is required?
15. What security, hosting, and vendor reviews are required?

Task 11 Checkpoint 1 and the loopback-only PostgreSQL extension authorization
are already satisfied by the 2026-08-02 approval. Review questions must not
reopen them as missing approvals. Checkpoint 2 evidence, current first-party
source verification, target-organization applicability, and every production
decision remain open.

## 13. Review and update rule

This mapping must be reviewed again:

- Before Task 11 Checkpoint 2.
- Before a pilot decision.
- Before production implementation.
- When Ontario Health updates the Online Appointment Booking Standard.
- When applicable privacy or accessibility requirements change.
- When Task 05 identity or delegation rules change.
- When Task 07 communication rules change.
- When the service adds a new modality, service category, or data field.

Each review should record:

- Review date.
- Reviewer.
- Source version.
- Changed requirements.
- Resulting design changes.
- New blockers.
- Resolved blockers.
- Approval status.

## 14. Current conclusion

The Task 04 design is directionally aligned with Ontario guidance in its use
of:

- Patient-initiated booking.
- In-person, telephone, and video modalities.
- Strict privacy minimization.
- Server-derived delegation.
- Public-safe availability.
- Mobile and accessible design goals.
- Transactional confirmation.
- Safe cancellation and rescheduling.
- Security, audit, recovery, and idempotency planning.

The prototype is approved for runnable local synthetic implementation through
2026-08-05, but no runtime implementation or verification is claimed.

It is not ready for a real pilot because identity, delegation, virtual-care
consent, professional suitability, communications, accessibility evidence,
reporting requirements, retention, security, privacy, and production release
authorization remain unresolved.
