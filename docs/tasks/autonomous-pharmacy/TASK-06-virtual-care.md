# Task 06 — Design and Prototype Secure Pharmacist-Led Virtual Care

## Role

Act as a senior virtual-care integration, healthcare security, privacy, accessibility, and full-stack engineer with experience in:

* Ontario pharmacy workflows.
* PHIPA-governed systems.
* Video, telephone, and secure-messaging platforms.
* Patient and provider identity.
* WebRTC and real-time session security.
* Vendor due diligence.
* Clinical documentation boundaries.
* Accessible virtual-care design.
* Healthcare audit and incident response.

Your responsibility is to design and verify AgentRx’s virtual-care boundary and build a deterministic synthetic prototype. You are not acting as a pharmacist and must not make clinical, prescribing, referral, modality-suitability, or billing decisions.

Do not connect a production virtual-care vendor, process real PHI, enable production visits, change production authentication, or apply a production schema migration until the required professional, privacy, security, vendor, and release approvals are complete.

## Owner profile

Virtual-care integration developer.

## Priority

P1/P2.

## Objective

Add secure pharmacist-led virtual-care support for:

* Telephone visits.
* Video visits.
* Secure asynchronous messaging.
* Safe switching between approved modalities.
* In-person or referral fallback.

The design must preserve:

* Pharmacist judgment.
* The same applicable standard of care as an in-person interaction.
* Patient choice.
* Identity and participant authorization.
* Privacy and confidentiality.
* Accessibility.
* Reliable documentation.
* Safe interruption and fallback.
* Existing assessment and claim protections.

AgentRx must remain a documentation, workflow, and communication platform. It must not become an automated diagnostic, triage, prescribing, treatment, or referral engine.

The system must allow the pharmacist to decide that virtual care is unsuitable before or during the encounter and move the patient to an approved alternative without forcing completion of the virtual visit, clinical assessment, or claim.

## Regulatory baseline

At the start of execution, verify the current versions of all applicable first-party sources. Record the title, authority, version, effective date, URL, access date, applicable requirement, repository evidence, gap, owner, and production-blocking effect.

The minimum source baseline includes:

* [OCP Virtual Care Policy](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/virtual-care-policy/), currently version 1.10 and effective September 30, 2025.
* [OCP Supplemental Guidance to the Virtual Care Policy](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/virtual-care-policy/supplemental-guidance-to-the-virtual-care-policy/).
* [OCP Cross-Jurisdictional Pharmacy Services Policy](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/cross-jurisdictional-pharmacy-services-policy/).
* [Ontario Health Virtual Visits Verification Standard](https://www.ontariohealth.ca/digital/standards/virtual-visits.html).
* [Ontario Health Verified Virtual Visit Solutions](https://www.ontariohealth.ca/digital/standards/virtual-visits/solutions-verified.html).
* [Ontario Health Accessibility Guidance for Virtual Visits](https://ontariohealth.ca/digital/standards/virtual-visits/accessibility.html).
* [IPC Privacy and Security Considerations for Virtual Health Care Visits](https://www.ipc.on.ca/sites/default/files/legacy/2021/02/virtual-health-care-visits.pdf).
* [IPC Privacy and Virtual Health Care](https://www.ipc.on.ca/en/covid-19-information-and-resources/privacy-and-virtual-health-care).
* PHIPA and its applicable regulations.
* The Health Care Consent Act where consent to treatment or a procedure is involved.
* Applicable AODA requirements and the accessibility baseline established by Task 11.

Do not treat:

* OCP as approving specific technologies.
* Ontario Health verification as legal approval.
* A verified solution as proof that the pharmacy has satisfied PHIPA.
* Canadian data residency as a substitute for privacy and security controls.
* Virtual-modality consent as consent to treatment.
* Patient authentication as proof that every person present in the session is authorized.

Document ambiguities for professional, privacy, security, or legal review rather than silently resolving them.

## Product context

The supplied AgentRx research positions the product as a pharmacist-first intake, documentation, and clinical-handoff layer—not an autonomous healthcare provider.

Preserve that boundary throughout this task:

* The patient may provide information.
* The platform may organize information and facilitate communication.
* The pharmacist determines whether virtual care is appropriate.
* The pharmacist performs the professional interaction.
* The pharmacist decides whether the encounter is complete.
* Existing authorized clinical workflows determine assessment and prescribing outcomes.
* Existing billing controls determine whether a claim may be created.
* AgentRx does not independently diagnose, prescribe, refer, or declare that a patient is safe to remain at home.

## Current status

This task is limited to:

* Repository discovery.
* Current-state assessment.
* Official standards mapping.
* Architecture and contracts.
* Vendor evaluation.
* Threat modelling.
* Deterministic synthetic fixtures.
* Synthetic user interfaces.
* State-machine prototypes.
* Adapter stubs.
* Automated tests.
* Accessibility and responsive evidence.
* Production-integration planning.

Production virtual care remains blocked until all applicable gates are approved.

### Authorized now

* Read applicable repository files and documentation.
* Review Tasks 01, 02, 05, and 11.
* Review Task 04 if appointments or visit scheduling are involved.
* Review Task 07 if external visit notifications are involved.
* Review the supplied AgentRx research report as background.
* Research current first-party Ontario requirements.
* Compare currently verified virtual-care solutions using public evidence.
* Produce a build-versus-integrate recommendation.
* Produce vendor and subprocessor assessment templates.
* Define server-only virtual-visit contracts.
* Define a proposed production schema without applying it.
* Build an obviously synthetic waiting room.
* Build synthetic patient preflight and pharmacist controls.
* Build deterministic disconnect, reconnect, expiry, fallback, and consent-withdrawal states.
* Build a vendor-neutral adapter interface with non-networked synthetic implementations.
* Add security, privacy, authorization, state-transition, accessibility, and leakage tests.
* Capture mobile and desktop synthetic evidence.
* Document production migrations, vendor configuration, and authentication changes that would eventually be required.

### Not authorized now

* Creating or purchasing a production vendor account.
* Accepting vendor terms or executing a contract.
* Contacting vendors on the user’s behalf.
* Connecting a vendor SDK, API, webhook, media server, SIP service, or PSTN provider to production.
* Applying for Ontario Health verification.
* Claiming that AgentRx meets the Ontario Health verification standard.
* Applying a production database migration.
* Changing production identity-provider configuration.
* Processing real patient or pharmacist data.
* Enabling public virtual-visit registration.
* Creating real appointment or visit invitations.
* Sending email, SMS, push, calendar, or secure-message notifications.
* Placing PHI in a calendar invitation.
* Capturing or retaining audio, video, screenshots, biometric templates, transcripts, or AI-generated meeting summaries.
* Enabling vendor recording, transcription, sentiment analysis, face recognition, meeting intelligence, or AI training.
* Activating production secure messaging.
* Adding production claim-generation logic.
* Making automated virtual-care suitability, diagnosis, treatment, prescribing, referral, or emergency decisions.
* Enabling cross-jurisdictional care before separate review.
* Treating caller ID, possession of a meeting link, video appearance, an email address, or a telephone number as sufficient identity verification.
* Weakening Task 02, Task 05, or Task 11 controls.

A synthetic prototype may pass independently. Production virtual care must remain blocked while applicable approvals or dependencies remain unresolved.

## Required repository discovery

Before changing code:

1. Read every applicable `AGENTS.md` completely.
2. Inspect repository status and preserve unrelated user changes.
3. Locate Task 01’s approved synthetic environment and confirm that it fails closed in production.
4. Review Task 02’s:

   * Patient and assessment retrieval.
   * Clinical record ownership.
   * Assessment state transitions.
   * Completion rules.
   * Finalization protections.
   * Claim-generation boundary.
5. Review Task 05’s:

   * Patient and pharmacist security-domain separation.
   * Patient identity and subject binding.
   * Session validation.
   * Delegated-access model.
   * Consent history.
   * Revocation behavior.
6. Review Task 11’s:

   * Security and privacy gates.
   * Logging and analytics restrictions.
   * Accessibility requirements.
   * Threat modelling.
   * Abuse controls.
   * Release requirements.
7. Review Task 04 if appointment scheduling, cancellation, rescheduling, or visit invitations are involved.
8. Review Task 07 if external visit notifications, reminders, or fallback communications are involved.
9. Read the supplied deep-research report and treat it as product background, not professional or legal approval.
10. Inspect existing:

    * Patient, pharmacist, delegate, tenant, pharmacy, appointment, assessment, and claim models.
    * Authentication issuers, audiences, sessions, cookies, roles, MFA, and CSRF protections.
    * Server-side authorization helpers.
    * Assessment and claim completion guards.
    * Consent capture.
    * Audit tables.
    * Application logs.
    * Analytics and error monitoring.
    * Notification and calendar systems.
    * WebSocket, server-sent event, or real-time infrastructure.
    * Existing vendor integrations.
    * Content Security Policy and browser security headers.
    * Database and migration conventions.
    * Server/client rendering boundaries.
    * Test and evidence conventions.
11. Determine whether the repository already contains a virtual-care, communications, or appointment abstraction.
12. Identify every proposed production change requiring migration, privacy, security, professional, vendor, accessibility, or release approval.

Do not print secrets, credentials, full environment variables, real patient records, vendor tokens, meeting links, signing keys, or connection strings during discovery.

Follow existing repository conventions. Do not introduce a new authentication system, state framework, database abstraction, UI system, real-time framework, or vendor SDK without documenting why the existing approach cannot satisfy the requirements.

## Non-negotiable invariants

The design and prototype must preserve all of the following:

* Only a pharmacist may determine and record whether a modality is clinically and professionally appropriate.
* Suitability must be reassessed when circumstances or modality change.
* The platform may collect information for the pharmacist’s decision but must not compute or recommend the decision.
* The patient must have a genuine choice and a usable alternative.
* Identity, subject, participant, and professional role remain distinct.
* Authentication alone does not authorize joining a visit.
* Possession of a room identifier, appointment link, telephone number, or invitation does not authorize participation.
* A patient session cannot become a pharmacist session.
* A pharmacist session cannot become a patient session.
* A caregiver or substitute decision-maker does not become the patient.
* Delegated access must use Task 05’s approved server-side relationship or grant.
* Every participant must be identified, authorized, visible to the pharmacist, and acknowledged by the patient where required.
* A participant cannot silently join or remain hidden.
* Other waiting patients must never see or hear one another.
* Identity, current location, virtual-modality consent, privacy confirmation, technology suitability, contingency plan, and pharmacist suitability must be complete before substantive clinical interaction begins.
* For secure messaging, these gates must be complete before the first substantive clinical message is released or reviewed as part of care.
* Consent to virtual care is not automatically consent to treatment.
* Consent to treatment is not automatically consent to recording.
* Consent withdrawal must prevent further virtual interaction unless another lawful and approved basis applies.
* Patient location must be confirmed for each encounter.
* The application must not infer jurisdiction from IP address, GPS, browser locale, or telephone number.
* Cross-jurisdictional care remains blocked unless separately reviewed and approved.
* The pharmacist may mark the modality unsuitable before or during the encounter.
* Unsuitability must not require completion of the virtual visit, assessment, or claim.
* A patient leaving or disconnecting is not pharmacist completion.
* A timeout is not pharmacist completion.
* A technical failure is not pharmacist completion.
* A vendor “meeting ended” webhook is not pharmacist completion.
* A patient may end their participation, but only an authorized pharmacist may formally mark the professional interaction complete.
* A technical-failure event must never directly produce a completed assessment or claim.
* An approved fallback may continue the encounter only after all applicable guards are rechecked and the pharmacist explicitly accepts the new modality.
* Assessment, visit, connection, suitability, and claim states must remain separate.
* No single `completed` boolean may represent all of those states.
* Existing assessment and claim guards must remain authoritative.
* No client value may be trusted for patient, subject, pharmacy, tenant, assessment, claim, participant, role, consent, location, suitability, or completion.
* All protected state transitions must be authorized and validated server-side.
* Join, admit, resume, fallback, message, assessment-linking, finalization, and claim actions must recheck current server state.
* Audio and video must not be recorded.
* The application must not produce transcripts, screenshots, thumbnails, biometric templates, emotion analysis, or AI summaries.
* Secure-message content is PHI-bearing clinical communication, not harmless telemetry.
* Secure-message content must not be copied into application logs or analytics.
* No PHI, personal information, token, room secret, raw SDP, ICE candidate, TURN credential, message body, consent response, or location detail may appear in logs, analytics, error breadcrumbs, URLs, referrers, unsecured notifications, or evidence filenames.
* Raw WebRTC statistics, device identifiers, IP addresses, browser fingerprints, and network details must not be retained without specific approval.
* No consumer meeting link may be reused for clinical care.
* No PHI may appear in a calendar invitation.
* A verified vendor does not remove the custodian’s PHIPA obligations.
* An unverified vendor must not be described as verified.
* A custom prototype must not be described as eligible for clinical use.
* Synthetic virtual-care code and fixtures must fail closed if enabled in production.
* Telephone fallback must remain accessible to patients who cannot use video or secure messaging.
* Accessibility must not depend on enabling an unreviewed third-party transcription service.

## Authority boundary

Do not:

* Diagnose a condition.
* Determine whether a patient requires emergency care.
* Generate autonomous red-flag, triage, urgency, treatment, prescribing, or referral logic.
* Select a modality on behalf of the pharmacist.
* Suggest that video is always superior to telephone.
* Require video when telephone or in-person care is the appropriate accessible option.
* Automatically downgrade video to telephone without patient and pharmacist confirmation.
* Automatically submit or prepare a claim because a virtual session ended.
* Create new billing eligibility rules.
* Change clinical assessment completion rules.
* Allow patients to complete pharmacist-owned clinical fields.
* Allow vendor events to write directly to clinical or billing records.
* Use caller ID as identity proof.
* Use a health-card image as a stored identity artifact.
* Record or screenshot identity documents.
* Retain exact location, GPS coordinates, full IP addresses, or device fingerprints without a documented approved need.
* Allow a delegate to join without an active, appropriately scoped Task 05 grant.
* Allow a support person to join without the patient’s awareness and pharmacist authorization.
* Allow a participant to invite another participant.
* Allow patients or delegates to assign host privileges.
* Expose waiting-room membership to other patients.
* Use reusable room IDs or permanent meeting links.
* Put reusable bearer credentials in query strings.
* Use third-party analytics, advertising, session-replay, or tracking scripts on protected virtual-care routes.
* Send PHI through email, SMS, push notifications, calendar descriptions, or consumer messaging services.
* Enable attachments in secure messaging unless the existing approved upload, malware, retention, and authorization controls explicitly support them.
* Invent consent language, retention periods, identity-verification methods, emergency procedures, or cross-jurisdictional policy.
* Treat a successful synthetic prototype as evidence of production readiness.

If existing architecture requires any prohibited action, document the conflict and stop that affected workstream.

## State-model requirement

Do not create one overloaded visit status.

Model the following as separate but coordinated state dimensions:

| State dimension           | Examples                                                                        | Authority                                           |
| ------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| Visit workflow            | Draft, scheduled, waiting, ready, in progress, interrupted, ended               | Visit service with pharmacist-controlled completion |
| Modality                  | Telephone, video, secure messaging, in-person fallback                          | Pharmacist decision plus patient choice             |
| Connection                | Offline, connecting, connected, degraded, disconnected, failed                  | Technical subsystem                                 |
| Identity/location         | Pending, confirmed, failed, expired                                             | Approved verification workflow                      |
| Consent                   | Pending, granted, withdrawn, superseded                                         | Patient or authorized agent                         |
| Suitability               | Pending, suitable, suitable with limitations, unsuitable, reassessment required | Pharmacist only                                     |
| Participant authorization | Invited, waiting, admitted, denied, removed, left                               | Server authorization plus pharmacist controls       |
| Clinical assessment       | Not linked, linked, in progress, completed, finalized                           | Existing Task 02 clinical workflow                  |
| Claim                     | Ineligible, pending existing guards, eligible, submitted, rejected              | Existing billing workflow only                      |

A transition in one dimension must not silently transition another.

Examples:

* `connection = disconnected` must not set `visit = completed`.
* `patient_participant = left` must not set `assessment = completed`.
* `visit = ended` must not set `claim = eligible`.
* `vendor_event = meeting_ended` must not finalize anything.
* `modality = telephone` must not imply that video failed.
* `technical_failure = true` must not prevent a pharmacist from beginning a separately approved fallback, but the fallback must be recorded as a new guarded transition.
* `consent = withdrawn` must block further interaction even if the connection remains technically active.

## Execution order

Work in this order:

1. Complete repository and dependency discovery.
2. Produce a current-state and gap assessment.
3. Review current official Ontario virtual-care requirements.
4. Produce the standards and obligations matrix.
5. Produce the build-versus-integrate assessment.
6. Produce the vendor evaluation and verification-gap scorecard.
7. Draw trust-boundary and data-flow diagrams.
8. Produce the virtual-care threat model.
9. Define the orthogonal state model.
10. Define identity, location, consent, privacy, suitability, and contingency contracts.
11. Define waiting-room, participant, join, expiry, and rejoin behavior.
12. Define telephone, video, and secure-messaging modality contracts.
13. Define preflight, low-bandwidth, device-failure, and accessible fallback behavior.
14. Define the assessment and claim integration boundary.
15. Define audit, privacy, security, retention, and incident behavior.
16. Define deterministic synthetic fixtures and failure states.
17. Build the synthetic prototype.
18. Add architecture, authorization, security, privacy, state-machine, leakage, and accessibility tests.
19. Capture mobile and desktop evidence.
20. Document production gates, unresolved decisions, and required migrations.

Continue safe synthetic work when only production integration is blocked.

# Workstream A — Current-state and standards assessment

## Repository assessment

Document:

* Existing appointment, patient, pharmacist, delegate, assessment, and claim relationships.
* Existing authentication and participant authorization.
* Existing patient and pharmacist session separation.
* Existing consent capture.
* Existing assessment completion and claim guards.
* Existing real-time, WebSocket, event, or notification infrastructure.
* Existing logging, analytics, error monitoring, and audit behavior.
* Existing vendor integrations and subprocessor assumptions.
* Existing Canadian-region or residency controls.
* Existing accessibility patterns.
* Existing mobile layouts.
* Existing synthetic environment.
* Existing failure and retry behavior.
* Existing PHI leakage risks.
* Existing tests.
* Architectural conflicts with this task.

## Ontario standards mapping

For every applicable source, record:

* Source title.
* Authority.
* URL.
* Version or revision date.
* Date accessed.
* Requirement or recommendation.
* Applicable modality.
* Current repository evidence.
* Gap.
* Required action.
* Approval owner.
* Whether it blocks a prototype, pilot, or production release.

Cover at minimum:

* Pharmacist modality appropriateness.
* Same standard of care.
* Patient choice.
* Virtual-modality consent.
* PHI collection, use, and disclosure.
* Treatment consent distinctions.
* Identity verification.
* Patient and pharmacist location.
* Authorized-agent identity.
* Participant disclosure and consent.
* Privacy of both physical environments.
* Technical suitability.
* Contingency planning.
* Documentation.
* Technology due diligence.
* Encryption.
* Access controls.
* Audit logging.
* Incident and breach response.
* Secure messaging.
* Telephone visits.
* Video visits.
* Recording.
* Accessibility.
* Cross-jurisdictional care.
* Vendor contracts.
* PIA and TRA expectations.
* Data residency and subprocessors.
* Retention and secure disposal.

Do not call the mapping legal or professional approval.

## Deliverables

* `docs/task-06/current-state-and-gap-analysis.md`
* `docs/task-06/ontario-virtual-care-standards-mapping.md`

Use the repository’s established documentation location if different and report the final paths.

# Workstream B — Build-versus-integrate decision

Evaluate three options:

1. Integrate a currently Ontario Health-verified solution.
2. Build a custom solution and pursue applicable verification.
3. Use a hybrid model with AgentRx controlling identity, consent, waiting-room workflow, and clinical integration while a verified vendor handles media or secure messaging.

Do not assume the same product is verified for both video and secure messaging. Confirm the specific:

* Vendor.
* Product.
* Product version.
* Modality.
* Verification status.
* Verification date.
* Verification scope.
* Any expiry, limitation, or disclaimer.
* Publicly available implementation evidence.

Telephone care must be assessed separately. Do not claim that Ontario Health video or secure-messaging verification covers ordinary audio-only telephone visits unless current official evidence explicitly says so.

## Evaluation criteria

Assess:

* Fit with OCP expectations.
* Current Ontario Health verification.
* Patient and pharmacist identity integration.
* Participant authorization.
* Waiting-room behavior.
* Host controls.
* Duplicate-tab and concurrent-session handling.
* Session expiry and rejoin.
* Telephone support.
* Secure messaging.
* Accessibility.
* Captions and their privacy implications.
* Screen-reader and keyboard support.
* Low-bandwidth behavior.
* Mobile browser support.
* Encryption in transit and at rest.
* Media-routing architecture.
* WebRTC, SFU, TURN, STUN, SIP, and PSTN dependencies.
* Recording and transcription defaults.
* AI and vendor-training defaults.
* Audit export.
* Data ownership.
* Data residency.
* Backup locations.
* Subprocessors.
* Vendor employee access.
* Support access.
* Incident-notification terms.
* Security audit rights.
* PIA and TRA evidence.
* Vulnerability and penetration-test evidence.
* Availability and disaster recovery.
* Service-level commitments.
* Retention and deletion.
* Legal hold.
* Data return at termination.
* SSO and authorization support.
* API and webhook security.
* Accessibility conformance evidence.
* Integration complexity.
* Vendor lock-in.
* Exit and portability.
* Cost and operational burden.
* Custom-verification cost and ongoing evidence burden.
* Time to pilot.
* Residual risks.

## Decision rules

The decision record must:

* State the recommended option.
* State why the alternatives were not selected.
* Separate verified facts from assumptions.
* Identify unavailable vendor evidence.
* Identify contract-dependent answers.
* Identify privacy, security, accessibility, and professional blockers.
* Identify the exact review needed before procurement.
* Define conditions that would cause the decision to be revisited.
* Avoid treating marketing statements as evidence.
* Avoid ranking vendors using unverified claims.
* Avoid initiating procurement.

## Deliverables

* `docs/task-06/build-vs-integrate-decision.md`
* `docs/task-06/vendor-assessment-scorecard.md`
* `docs/task-06/verification-and-procurement-gates.md`

# Workstream C — Threat model and data flows

Create a threat model covering telephone, video, secure messaging, fallback, and assessment integration.

## Required actors

Model at minimum:

* Patient.
* Verified caregiver or delegate.
* Substitute decision-maker where applicable.
* Pharmacist.
* Pharmacy administrator.
* Authorized support person or interpreter.
* Technical support staff.
* AgentRx patient application.
* AgentRx pharmacist application.
* Task 05 identity service.
* Virtual-visit orchestration service.
* Vendor media or messaging service.
* PSTN or SIP provider, if proposed.
* TURN/STUN/SFU services, if proposed.
* Webhook receiver.
* Task 02 assessment service.
* Existing claim service.
* Audit service.
* Notification service stub.
* Malicious unauthenticated user.
* Malicious or compromised participant.
* Compromised browser or device.
* Insider with excessive access.
* Compromised vendor or subprocessor.

Do not invent production roles. Map conceptual actors to existing roles or mark the mapping blocked.

## Required assets

Include:

* Patient and pharmacist identities.
* Actor-to-subject relationships.
* Visit assignments.
* Join and rejoin credentials.
* Waiting-room state.
* Consent events.
* Identity-verification results.
* Location confirmation.
* Suitability decisions.
* Contingency plans.
* Participant authorization.
* Secure-message content.
* Message delivery metadata.
* Media negotiation metadata.
* Vendor credentials.
* Webhook secrets.
* Assessment relationships.
* Technical-failure records.
* Audit records.
* Clinical documentation.
* Claim eligibility state.

## Required threats

Assess at minimum:

* Meeting or room enumeration.
* Forwarded or reused invitation.
* Invitation link preview or scanner consumption.
* Token theft, replay, or fixation.
* Wrong-patient join.
* Wrong-pharmacy or wrong-assessment join.
* Patient token accepted as pharmacist.
* Pharmacist token accepted as patient.
* Delegate joining after grant expiry or revocation.
* Unauthorized support person.
* Participant role escalation.
* Hidden or unannounced participant.
* Patient-to-patient waiting-room exposure.
* Waiting-room audio or video leakage.
* Host impersonation.
* Duplicate tabs.
* Concurrent join from multiple devices.
* Stale rejoin credential.
* Cross-tenant BOLA or IDOR.
* Client-supplied actor, subject, role, pharmacy, visit, or assessment substitution.
* CSRF and cross-origin WebSocket attacks.
* Webhook spoofing, replay, or reordering.
* Vendor event confusion.
* Vendor administrator overreach.
* Technical-support impersonation.
* WebRTC IP or network-metadata exposure.
* SDP, ICE, TURN, or media credentials leaking into logs.
* Unauthorized recording or transcription.
* Vendor use of session data for unrelated analytics or AI training.
* Secure message sent to the wrong patient or thread.
* Misdirected notification.
* PHI in notification previews.
* Message content in logs or error monitoring.
* Unsafe message attachment.
* Unread or delayed asynchronous message.
* Patient using messaging for an urgent issue.
* Automatic urgency classification drifting into clinical decision-making.
* Consent bypass or stale consent.
* Consent withdrawal race.
* Location falsification.
* Cross-jurisdictional care.
* Network degradation hiding clinically important cues.
* Microphone, camera, speaker, or permission failure.
* Disconnect during a clinically important interaction.
* Reconnect to a stale or completed visit.
* Fallback without renewed suitability or consent.
* Technical failure incorrectly completing an assessment.
* Session end incorrectly generating a claim.
* Assessment or authorization changing while the visit is active.
* Insider access to room metadata.
* Analytics, referrer, URL, browser-cache, screenshot, or evidence leakage.
* Denial-of-service against waiting rooms or secure messages.
* Accessibility failure that prevents the patient from understanding consent or using fallback.

For every threat, document:

* Scenario.
* Entry point.
* Asset.
* Preconditions.
* Likelihood.
* Impact.
* Preventive controls.
* Detective controls.
* Response controls.
* Test evidence.
* Residual risk.
* Approval owner.

## Deliverables

* `docs/task-06/virtual-care-threat-model.md`
* `docs/task-06/trust-boundaries-and-data-flows.md`

# Workstream D — Virtual-visit contracts and schema proposal

Do not apply a production migration.

Produce server-only conceptual contracts for:

* `VirtualVisit`
* `VisitModality`
* `VisitParticipant`
* `ParticipantAuthorization`
* `VirtualCareConsentEvent`
* `IdentityAndLocationCheck`
* `ModalitySuitabilityDecision`
* `TechnologyReadinessResult`
* `ContingencyPlan`
* `ConnectionEvent`
* `TechnicalFailureEvent`
* `VisitInterruption`
* `FallbackTransition`
* `SecureMessageThread`
* `SecureMessage`
* `VisitAssessmentLink`
* `VirtualVisitAuditEvent`
* `VendorSessionReference`
* `VendorWebhookReceipt`

## Minimum visit fields

The proposal should address:

* Opaque visit identifier.
* Opaque pharmacy or custodian reference.
* Opaque patient-subject reference.
* Opaque patient-actor reference.
* Opaque pharmacist-actor reference.
* Appointment reference, if applicable.
* Assessment reference, if applicable.
* Requested modality.
* Pharmacist-approved modality.
* Actual modality or modalities used.
* Workflow state.
* Connection state.
* Suitability state.
* Consent-event reference.
* Identity-and-location-check reference.
* Contingency-plan reference.
* Participant roster.
* Created, scheduled, started, interrupted, resumed, and ended times.
* Pharmacist-completion actor and time.
* Technical failure indicator and safe reason code.
* Fallback transition.
* Vendor and solution reference.
* Vendor verification evidence version.
* State version for concurrency control.
* Audit references.

For every field, document:

* Meaning.
* Type.
* Nullable behavior.
* Source of truth.
* Trusted actor.
* PHI or personal-information classification.
* Client-safe or server-only status.
* Authorization requirement.
* Retention owner.
* Staleness behavior.
* Whether production approval is required.

Do not place names, health-card numbers, addresses, clinical content, or contact information in technical identifiers.

## Deliverable

`docs/task-06/virtual-visit-contracts-and-schema-proposal.md`

# Workstream E — Identity, location, consent, privacy, and suitability gates

## Identity

The virtual-care layer must reuse Task 05’s approved patient and pharmacist boundaries.

Define how the server verifies:

* Patient session.
* Pharmacist session.
* Correct audience and actor type.
* Actor-to-subject binding.
* Custodian or pharmacy scope.
* Visit assignment.
* Delegate grant, scope, expiry, and revocation.
* Participant role.
* Required assurance.
* Current account and session status.

In-session identity confirmation must supplement, not weaken, Task 05 identity assurance.

Do not treat any of the following alone as sufficient:

* Meeting-link possession.
* Caller ID.
* Email address.
* Telephone number.
* Date of birth.
* Address.
* Health-card number.
* Video appearance.
* Knowledge of appointment details.

Do not retain identity-document images or video screenshots.

## Location

The pharmacist must be able to confirm the patient’s current location even when the patient is already known.

Produce options for the minimum location detail needed to:

* Determine jurisdiction.
* Apply the cross-jurisdictional policy.
* Execute an approved contingency or emergency process.
* Meet documentation requirements.

Do not automatically collect GPS coordinates or infer location from IP address.

Record:

* Confirmation method.
* Patient or authorized-agent statement.
* Required jurisdictional value.
* Confirmation time.
* Confirming pharmacist.
* Safe outcome.
* Whether the location created a cross-jurisdictional blocker.

Any exact-address requirement must be justified and approved separately.

## Consent

Distinguish:

* Choice to receive care virtually.
* Consent to collect, use, and disclose PHI through the selected technology.
* Consent to the selected modality.
* Consent to additional participants.
* Consent to treatment or a procedure.
* Consent to recording.

Recording remains disabled regardless of other consent.

The consent model must preserve:

* Actor.
* Subject.
* Authorized-agent relationship when applicable.
* Modality.
* Scope.
* Privacy notice or explanation version.
* Capture method.
* Effective time.
* Withdrawal time.
* Supersession.
* Pharmacist witness where applicable.
* Provenance.

The production team must decide whether AgentRx requires express modality consent in every workflow even where applicable OCP policy might permit implied consent in a patient-initiated interaction. Keep that decision configurable and blocked pending review.

## Privacy confirmation

Before clinical interaction, allow the pharmacist to confirm:

* The pharmacist is in an appropriate private environment.
* The patient has been advised to use a private environment.
* The patient understands that people nearby may hear or see PHI.
* Everyone present on both sides has been disclosed.
* The patient consents to additional authorized participants.
* The selected technology’s privacy limitations have been explained in approved language.

Do not promise absolute confidentiality or security.

## Suitability

Only the pharmacist may record:

* `PENDING`
* `SUITABLE`
* `SUITABLE_WITH_LIMITATIONS`
* `UNSUITABLE`
* `REASSESSMENT_REQUIRED`

The system may display incomplete prerequisites but must not recommend an outcome.

The pharmacist must be able to:

* Mark the modality unsuitable before the visit begins.
* Mark it unsuitable during the visit.
* Record an approved structured reason.
* Add clinically necessary rationale to the proper clinical record, not application logs.
* Select an approved in-person, telephone, or referral contingency.
* Stop without completing the assessment.
* Reassess after a modality change.
* Reassess after material connection degradation.
* Reassess after participant or location changes.

## Deliverable

`docs/task-06/identity-location-consent-privacy-and-suitability.md`

# Workstream F — Waiting room, join security, and participant controls

Build a deterministic synthetic waiting room.

## Patient behavior

The synthetic patient must be able to:

* Review a plain-language privacy notice.
* Complete a synthetic device check.
* View an accessible telephone fallback.
* Confirm current location.
* Review and provide synthetic consent.
* Enter the waiting room.
* See a non-PHI status.
* Leave voluntarily.
* Rejoin when permitted.
* Recover from expiry safely.
* Request technical help without sending PHI.
* See when the pharmacist determines that another modality is required.

## Pharmacist controls

The synthetic pharmacist must be able to:

* View only assigned visits.
* See minimum necessary waiting-room information.
* Admit or deny an authorized participant.
* Confirm patient identity.
* Confirm patient location.
* Confirm participant identities and roles.
* Record patient consent.
* Record privacy confirmation.
* Record modality suitability.
* Select an approved contingency.
* Remove an unauthorized participant.
* Lock the participant roster.
* Mark a technical interruption.
* Permit guarded rejoin.
* Resume through an approved fallback.
* End the professional interaction.
* Mark the visit unsuitable without completing the assessment.
* Navigate to the existing assessment only after server guards pass.

No recording or transcription control may be present.

## Waiting-room privacy

Prove that:

* Patients cannot see other patients.
* Patients cannot hear or view the clinical session before admission.
* Participant names are not exposed to unrelated users.
* Room IDs are opaque.
* A room ID does not grant access.
* Waiting-room metadata is minimized.
* No PHI appears in page titles, URLs, browser history, notifications, or logs.
* The waiting room expires.
* A stale room cannot be reopened.
* A forwarded link does not authorize a different actor.
* A duplicate tab cannot create a second authoritative participant.
* A removed participant cannot rejoin with a stale credential.
* Rejoin does not bypass consent, identity, location, or suitability checks.

## Session lifecycle

Define:

* Visit creation.
* Participant assignment.
* Join authorization.
* One-time bootstrap behavior, if needed.
* Waiting-room entry.
* Pharmacist admission.
* Session rotation.
* Idle expiry.
* Absolute expiry.
* Duplicate-tab handling.
* Concurrent-device handling.
* Disconnect grace period.
* Rejoin authorization.
* Rejoin credential rotation.
* Participant removal.
* Patient departure.
* Pharmacist completion.
* Visit cancellation.
* Visit expiry.
* Revocation.
* Vendor-session cleanup.
* Cache invalidation.

Do not place reusable bearer tokens in query strings or calendar invitations.

## Deliverable

`docs/task-06/waiting-room-and-participant-controls.md`

# Workstream G — Device, connectivity, accessibility, and telephone fallback

## Preflight checks

Design synthetic checks for:

* Supported browser.
* Secure browser context.
* Camera availability for video.
* Microphone availability.
* Speaker or audio-output confirmation.
* Permission denied.
* Device already in use.
* Device change.
* Network unavailable.
* Low bandwidth.
* High latency.
* Packet-loss or unstable-connection category.
* Vendor or service outage.
* Reduced-motion preference.
* Captioning or screen-reader need.
* Telephone fallback availability.

The production design must minimize telemetry.

Do not retain:

* Raw audio.
* Raw video.
* Device labels.
* Hardware serials.
* Full user-agent strings unless specifically justified.
* Raw SDP.
* ICE candidates.
* IP addresses.
* Persistent network fingerprints.
* Detailed WebRTC statistics.

The stored result should normally be limited to:

* Check performed.
* Safe result category.
* Time.
* Selected modality.
* Whether fallback was offered.
* Whether the patient requested help.

The default synthetic implementation must use deterministic test adapters and make no network calls.

If a local development-only `getUserMedia` test is implemented:

* It must require an explicit user action.
* It must never record or upload media.
* Tracks must stop immediately after the check.
* It must be disabled in CI and production.
* It must be covered by privacy tests.
* It must not be required for the synthetic prototype to pass.

## Telephone fallback

Telephone must be designed as a valid accessible modality, not merely an error message.

Define:

* How the pharmacist initiates or approves fallback.
* How identity is rechecked.
* How location is rechecked.
* How consent is updated for the new modality.
* How suitability is reassessed.
* How the patient receives non-PHI instructions.
* How a failed call is recorded.
* How the system distinguishes administrative calls from professional virtual care.
* How caller ID is prevented from becoming identity proof.
* How PSTN or SIP vendor metadata would be assessed.
* How the pharmacist continues documentation in the existing assessment.

Do not activate a telephone provider in this task.

## Accessibility

Verify:

* 375px operation without horizontal scrolling.
* Keyboard access to every control.
* Visible focus.
* Logical headings and landmarks.
* Screen-reader names and status announcements.
* Accessible consent.
* Accessible waiting-room status.
* Accessible reconnect and expiry handling.
* Accessible fallback.
* No essential hover-only behavior.
* No keyboard trap.
* Status that does not depend on colour.
* Reduced-motion support.
* 200% and 400% zoom and reflow.
* Long translated labels.
* Captions or communication alternatives that do not silently activate an unreviewed transcription vendor.
* 56px targets for frequent mobile actions.
* Clear absolute times.
* Plain-language technical errors.
* A way to complete the workflow without camera use.

## Deliverable

`docs/task-06/device-connectivity-accessibility-and-fallback.md`

# Workstream H — Failure and contingency state machine

Create an explicit state machine for:

* Scheduled.
* Preflight pending.
* Preflight failed.
* Waiting.
* Identity pending.
* Location pending.
* Consent pending.
* Suitability pending.
* Ready.
* In progress.
* Connection degraded.
* Interrupted.
* Reconnecting.
* Fallback pending.
* Resumed by video.
* Resumed by telephone.
* In-person required.
* Referred.
* Consent withdrawn.
* Patient left.
* Pharmacist ended.
* Pharmacist completed.
* Cancelled.
* No-show.
* Expired.
* Technical failure.
* Access denied.
* Unknown state.

For every transition, document:

* Source state.
* Destination state.
* Permitted actor.
* Server guards.
* Required evidence.
* Idempotency behavior.
* Concurrency behavior.
* Audit event.
* Patient message.
* Pharmacist message.
* Assessment effect.
* Claim effect.
* Invalid-transition behavior.

## Critical transition rules

Prove that:

* Patient departure cannot complete a visit.
* Disconnect cannot complete a visit.
* Timeout cannot complete a visit.
* Vendor meeting end cannot complete a visit.
* A technical failure cannot complete an assessment.
* A technical failure cannot trigger a claim.
* A patient cannot mark pharmacist suitability.
* A patient cannot select the clinical fallback outcome.
* The pharmacist may stop without finalizing the assessment.
* A modality switch requires rechecking applicable identity, location, consent, privacy, participant, and suitability guards.
* A fallback may preserve already documented clinical information without pretending the failed modality completed successfully.
* Reconnect after expiry is denied.
* Reconnect after consent withdrawal is denied.
* Reconnect after pharmacist-unsuitable is denied unless a new approved modality transition exists.
* Reconnect after delegate revocation is denied.
* A stale browser cannot overwrite a newer pharmacist decision.
* Unknown states fail closed.

## Deliverable

`docs/task-06/failure-and-contingency-state-machine.md`

# Workstream I — Secure messaging contract

Secure messaging is a professional virtual-care modality, not a generic chat feature.

Define:

* Patient enrollment and authentication.
* Pharmacist assignment.
* Actor-to-subject relationship.
* Thread-to-visit relationship.
* Custodian scope.
* Participant scope.
* Thread opening.
* First-message gate.
* Expected availability and response-time communication.
* Message delivery.
* Failed delivery.
* Read or acknowledgement behavior.
* Pharmacist closure.
* Patient withdrawal.
* Thread expiry.
* Reopening rules.
* Assessment documentation.
* Retention.
* Export or transfer to the clinical record.
* Audit behavior.
* External-notification stub.

The workflow must:

* Authenticate the patient before message access.
* Recheck authorization for every message.
* Keep message content out of audit and application logs.
* Use bounded and sanitized message input.
* Prevent cross-patient and cross-pharmacy thread access.
* Avoid PHI in external notification previews.
* Clearly state that the channel is not monitored continuously.
* Provide an approved alternative for urgent needs without automatically diagnosing urgency.
* Prevent a patient message from automatically completing an assessment.
* Prevent a delivery receipt from becoming clinical completion.
* Allow the pharmacist to determine that messaging is unsuitable.
* Preserve relevant clinical communications according to an approved record-retention workflow.

Attachments remain blocked unless the repository already has an approved, authorized, malware-scanned, retention-controlled upload boundary suitable for this purpose.

External email, SMS, push, and calendar notifications remain stubbed under Task 07.

## Deliverable

`docs/task-06/secure-messaging-contract.md`

# Workstream J — Assessment and claim integration boundary

The virtual-care layer may connect to an existing assessment only after every server guard passes.

## Required server guards

At minimum, recheck:

* Valid pharmacist session.
* Correct pharmacist audience and actor type.
* Active pharmacist account.
* Pharmacy and tenant scope.
* Pharmacist assignment to the visit.
* Valid patient session or approved telephone identity workflow.
* Patient actor-to-subject binding.
* Delegate grant where applicable.
* Visit-to-patient relationship.
* Visit-to-assessment relationship.
* Appointment relationship where applicable.
* Participant authorization.
* Identity confirmation.
* Patient location confirmation.
* Cross-jurisdictional approval.
* Current virtual-care consent.
* Current participant consent.
* Privacy confirmation.
* Current pharmacist suitability decision.
* Approved modality.
* Current visit state.
* Current connection or fallback state.
* Visit expiry.
* Session revocation.
* Delegation revocation.
* CSRF and origin protections.
* State version or concurrency token.
* Task 11 release or feature gate.

Recheck these guards:

* On waiting-room entry.
* On pharmacist admission.
* Before starting clinical interaction.
* Before secure-message release.
* After reconnect.
* After participant change.
* After location change.
* After modality change.
* Before loading assessment data.
* Before writing assessment data.
* Before assessment completion.
* Before claim generation or submission.

## Assessment boundary

The virtual-care layer may provide only a minimal server-side visit context to the assessment service, such as:

* Opaque visit reference.
* Approved modality.
* Pharmacist suitability decision reference.
* Consent reference.
* Identity and location confirmation references.
* Safe technical-failure status.
* Start and end times.
* Participant-provenance references.

Do not place PHI or clinical content in technical event payloads.

## Claim boundary

Do not create new claim rules.

The existing billing service must remain authoritative.

A virtual-care event must never itself:

* Create a claim.
* Mark a claim eligible.
* Set a billing code.
* Select a PIN.
* Submit a claim.
* Infer reimbursement eligibility.

A technical-failure event must explicitly fail any guard that requires successful pharmacist completion.

If an encounter safely continues through an approved fallback, only the pharmacist’s later explicit completion—after all existing clinical and billing guards pass—may allow the existing claim workflow to proceed.

## Deliverable

`docs/task-06/assessment-and-claim-integration-boundary.md`

# Workstream K — Privacy, security, audit, retention, and incident plan

## Privacy and security controls

Define:

* Encryption in transit and at rest.
* Vendor key ownership.
* AgentRx key ownership.
* Credential rotation.
* Webhook signature verification.
* Replay prevention.
* Network and origin controls.
* Participant authorization.
* Least-privilege vendor administration.
* Support access.
* Audit review.
* Vulnerability management.
* Dependency management.
* Availability monitoring.
* Incident containment.
* Vendor outage handling.
* Subprocessor change handling.
* Data return and deletion.
* Backup expiry.
* Canadian-residency evidence.
* Remote pharmacist workstation safeguards.
* Protected route cache controls.
* Referrer policy.
* Content Security Policy.
* Analytics prohibition.
* Session-replay prohibition.
* Browser-storage prohibition.

Do not claim that PHIPA universally mandates Canadian hosting. Treat residency as a project, procurement, contract, and risk gate that must be supported by evidence and approved policy.

## Media prohibition

Prove that the design does not create or retain:

* Audio recordings.
* Video recordings.
* Session screenshots.
* Video thumbnails.
* Transcripts.
* Closed-caption transcripts retained after the session.
* AI summaries.
* Biometric templates.
* Face recognition results.
* Emotion or sentiment analysis.
* Background-scene analysis.
* Raw media diagnostic captures.

Secure-message content must be handled separately as PHI-bearing clinical communication.

## Audit catalogue

Define append-only events for:

* Visit created.
* Visit scheduled.
* Join allowed or denied.
* Waiting-room entry.
* Pharmacist admission or denial.
* Identity confirmation.
* Location confirmation.
* Consent captured, withdrawn, or superseded.
* Privacy confirmation.
* Suitability decision and reassessment.
* Participant admitted, denied, removed, left, or revoked.
* Visit started.
* Modality changed.
* Connection degraded.
* Disconnect.
* Reconnect allowed or denied.
* Technical failure.
* Fallback selected.
* In-person path selected.
* Referral path selected.
* Patient left.
* Pharmacist ended.
* Pharmacist completed.
* Assessment link allowed or denied.
* Assessment completion denied because of visit state.
* Claim action denied because of visit state.
* Secure message sent, delivered, failed, acknowledged, or denied.
* Vendor webhook accepted, rejected, duplicated, or replayed.
* Session expired.
* Suspicious join or participant activity.
* Administrative support access.

Every audit event should contain only:

* Event ID.
* Event type and schema version.
* Time.
* Opaque actor reference.
* Opaque subject reference where necessary.
* Opaque pharmacy or custodian scope.
* Opaque visit or thread reference.
* Action.
* Outcome.
* Safe reason code.
* Policy version.
* Correlation reference.
* Source service.

Never include:

* Clinical content.
* Message bodies.
* Identity-verification answers.
* Exact patient location.
* Contact details.
* Tokens.
* Room secrets.
* Media.
* Transcripts.
* Raw SDP or ICE data.
* TURN credentials.
* Vendor webhook secrets.
* Full IP addresses.
* Device fingerprints.

## Retention proposal

Create a field-level inventory for:

* Visit metadata.
* Participant records.
* Consent events.
* Identity and location confirmation.
* Suitability decisions.
* Contingency plans.
* Technical-readiness results.
* Connection events.
* Technical failures.
* Secure-message content.
* Vendor metadata.
* Audit events.
* Application logs.
* Analytics.
* Backups.
* Synthetic evidence.

For every dataset, document:

* Purpose.
* Source of truth.
* PHI classification.
* Collection necessity.
* Authorized roles.
* Client exposure.
* Encryption.
* Retention trigger.
* Proposed retention period.
* Deletion or archival.
* Legal-hold behavior.
* Backup behavior.
* Required approval.

Do not invent legally required retention periods.

## Incident response

Model:

1. Detection.
2. Immediate denial or containment.
3. Participant removal.
4. Session and credential revocation.
5. Vendor-session termination.
6. Webhook disablement where necessary.
7. Evidence preservation.
8. Scope assessment.
9. Privacy and security escalation.
10. Vendor escalation.
11. Patient-notification decision.
12. Recovery.
13. Post-incident review.

The application must not automatically decide that an event is a legally reportable privacy breach.

## Deliverables

* `docs/task-06/privacy-security-and-retention-plan.md`
* `docs/task-06/audit-event-catalogue.md`
* `docs/task-06/virtual-care-incident-response.md`

# Workstream L — Synthetic prototype

Use deterministic, obviously synthetic, server-owned fixtures.

## Fixture requirements

Fixtures must:

* Use no real people, pharmacies, addresses, telephone numbers, emails, health-card numbers, meeting links, or clinical records.
* Use unmistakable identifiers such as `SYNTHETIC-VISIT-006`.
* Use a fixed clock.
* Use a fixed synthetic Ontario timezone.
* Use opaque synthetic visit and participant identifiers.
* Remain server-owned.
* Make no vendor or network calls.
* Contain no live SDK credentials.
* Be visibly labelled as synthetic.
* Fail hard if enabled in production.
* Avoid client-side fixture imports where prohibited.
* Include marker values for leakage tests.
* Use deterministic technical-check results.

## Required synthetic scenarios

Include:

* Authorized patient waiting for assigned pharmacist.
* Valid video visit.
* Valid telephone visit.
* Valid secure-message thread.
* Patient choosing telephone instead of video.
* Camera permission denied.
* Microphone unavailable.
* No speaker output.
* Unsupported browser.
* Low bandwidth.
* Video connection degraded.
* Disconnect before clinical interaction.
* Disconnect during clinical interaction.
* Successful guarded reconnect.
* Reconnect after expiry.
* Duplicate tab.
* Concurrent device.
* Wrong-patient join.
* Wrong-pharmacy join.
* Expired join.
* Replayed join.
* Forwarded join.
* Patient token at pharmacist boundary.
* Pharmacist token at patient boundary.
* Active delegate with correct scope.
* Expired delegate.
* Revoked delegate.
* Wrong-subject delegate.
* Unauthorized support person.
* Authorized interpreter or support person.
* Participant removed.
* Patient location outside approved jurisdiction.
* Consent pending.
* Consent withdrawn before the visit.
* Consent withdrawn during the visit.
* Privacy confirmation incomplete.
* Pharmacist marks video suitable.
* Pharmacist marks video suitable with limitations.
* Pharmacist marks video unsuitable.
* Pharmacist marks telephone unsuitable.
* Pharmacist selects in-person fallback.
* Pharmacist selects referral fallback.
* Technical failure followed by approved telephone fallback.
* Technical failure without fallback.
* Patient leaves voluntarily.
* Visit times out.
* Vendor meeting-ended event.
* Assessment guard failure.
* Claim guard failure.
* Unknown state.
* Vendor outage.
* Task 02 unavailable.
* Task 05 unavailable.
* Task 11 release gate blocked.

## Required interfaces

Build:

* Synthetic patient preflight page.
* Synthetic privacy and consent page.
* Synthetic waiting room.
* Synthetic patient reconnect and fallback states.
* Synthetic pharmacist waiting-room queue.
* Synthetic pharmacist participant controls.
* Synthetic identity/location/consent checklist.
* Synthetic modality-suitability control.
* Synthetic technical-failure control.
* Synthetic fallback selection.
* Synthetic secure-message thread.
* Synthetic assessment-link guard.
* Synthetic denied, expired, unavailable, and unknown states.

All controls must be backed by server-owned authorization and state-transition checks. UI hiding alone is insufficient.

## Evidence

Capture:

* 375px patient flow.
* 375px pharmacist controls.
* Desktop patient flow.
* Desktop pharmacist controls.
* Keyboard walkthrough.
* Screen-reader semantic inspection.
* 200% and 400% zoom/reflow.
* Reduced motion.
* Low-bandwidth state.
* Disconnect and reconnect.
* Telephone fallback.
* Consent withdrawal.
* Pharmacist-unsuitable path.
* Unauthorized participant path.
* 56px frequent-action targets.

Evidence must contain only synthetic information and must use generic filenames.

## Deliverables

* Synthetic virtual-care implementation.
* Deterministic synthetic fixtures.
* `docs/task-06/accessibility-and-responsive-evidence.md`
* Mobile and desktop evidence in the established repository location.

# Required tests

Use the repository’s existing test tooling.

## Join and authorization tests

Prove:

* An unauthenticated user cannot join.
* An expired session cannot join.
* A revoked session cannot join.
* A wrong-patient session cannot join.
* A wrong-pharmacy actor cannot join.
* A wrong-tenant actor cannot join.
* A patient session cannot act as pharmacist.
* A pharmacist session cannot act as patient.
* A forwarded link grants no authority.
* A room identifier grants no authority.
* A replayed join is denied.
* A stale rejoin is denied.
* A removed participant cannot rejoin.
* A delegate with expired or revoked scope cannot join.
* A client-supplied role, actor, patient, pharmacy, visit, or assessment value is ignored or denied.
* Unknown participant roles fail closed.
* Every protected route denies by default.

## Waiting-room and participant tests

Cover:

* Patient isolation.
* Pharmacist assignment.
* Admission.
* Denial.
* Participant roster.
* Additional-participant consent.
* Unauthorized participant removal.
* Duplicate tab.
* Concurrent device.
* Patient departure.
* Pharmacist completion.
* Waiting-room expiry.
* Visit cancellation.
* No pre-admission media.
* No hidden participants.
* No participant self-promotion.
* No patient-to-patient visibility.

## Consent, identity, location, and suitability tests

Cover:

* Identity pending.
* Identity failed.
* Location pending.
* Location outside approved jurisdiction.
* Consent pending.
* Consent granted.
* Consent withdrawn.
* Stale consent.
* Participant consent.
* Privacy confirmation incomplete.
* Suitability pending.
* Suitable.
* Suitable with limitations.
* Unsuitable.
* Reassessment required.
* Modality change.
* Unauthorized actor attempting to set suitability.
* Clinical interaction blocked until all gates pass.
* Secure-message release blocked until all gates pass.

## Disconnect and contingency tests

Cover:

* Permission failure.
* Device failure.
* Low bandwidth.
* Connection degradation.
* Disconnect before start.
* Disconnect during interaction.
* Reconnect within grace period.
* Reconnect after expiry.
* Duplicate reconnect.
* Vendor outage.
* Telephone fallback.
* In-person fallback.
* Referral fallback.
* Consent withdrawal during interruption.
* Delegate revocation during interruption.
* Pharmacist-unsuitable during interruption.
* Unknown failure code.
* Fallback concurrency race.

Prove that no failure, disconnect, timeout, patient departure, or vendor event can complete the assessment or generate a claim.

## Assessment and claim tests

Cover:

* Valid assessment link.
* Wrong patient.
* Wrong pharmacy.
* Wrong assessment.
* Missing consent.
* Missing location.
* Missing identity confirmation.
* Missing pharmacist suitability.
* Expired visit.
* Interrupted visit.
* Technical failure.
* Approved fallback.
* Consent withdrawal.
* Delegate revocation.
* Authorization change between visit start and assessment write.
* Authorization change before assessment completion.
* Authorization change before claim action.
* Vendor completion webhook.
* Patient-end event.
* Pharmacist explicit completion.

Prove that the existing assessment and claim services remain authoritative.

## Secure-messaging tests

Cover:

* Authorized message.
* Wrong-thread message.
* Cross-patient message.
* Cross-pharmacy message.
* Expired thread.
* Closed thread.
* Revoked patient session.
* Revoked delegate.
* Suitability withdrawn.
* Consent withdrawn.
* Delivery failure.
* Duplicate submission.
* Idempotency.
* Bounded input.
* Sanitization.
* Unsafe attachment denial.
* External notification contains no PHI.
* Message content absent from logs and audit.
* Message cannot complete assessment.
* Read receipt cannot complete assessment.
* Pharmacist can close or mark messaging unsuitable.

## Privacy and leakage tests

Add enforceable tests that fail if:

* PHI appears in URLs or query strings.
* A reusable token appears in a URL.
* PHI appears in page titles.
* PHI appears in browser storage.
* PHI appears in analytics.
* PHI appears in telemetry.
* PHI appears in error breadcrumbs.
* PHI appears in logs.
* Secure-message content appears in logs.
* Consent answers appear in logs.
* Exact location appears in technical logs.
* Raw SDP or ICE data appears in logs.
* TURN credentials appear in logs.
* Room secrets appear in logs.
* Vendor webhook secrets appear in logs.
* PHI appears in calendar or notification fixtures.
* PHI appears in referrers.
* PHI appears in screenshots or evidence filenames.
* Media recording or transcription code is enabled.
* Third-party session replay loads on protected routes.
* Protected responses are shared-cacheable.
* Synthetic code can be enabled in production.

## Webhook and vendor-adapter tests

Cover:

* Valid signature.
* Invalid signature.
* Expired timestamp.
* Replay.
* Duplicate event.
* Reordered event.
* Unknown event type.
* Wrong visit.
* Wrong tenant.
* Vendor meeting-ended event.
* Vendor participant-added event.
* Vendor outage.
* Adapter timeout.
* Safe retry.
* Idempotency.

No vendor event may directly update clinical completion or claim state.

## Accessibility and responsive tests

Cover:

* Preflight.
* Consent.
* Waiting room.
* Pharmacist controls.
* Participant management.
* Suitability.
* Disconnect.
* Reconnect.
* Telephone fallback.
* Secure messaging.
* Expiry.
* Denial.
* Unknown state.
* 375px.
* Desktop.
* Keyboard traversal.
* Screen-reader semantics.
* Visible focus.
* 56px frequent-action targets.
* 200% and 400% zoom.
* Reduced motion.
* Long translated text.
* Low bandwidth.
* Camera-free operation.

# Clinical and operational validation plan

Produce a synthetic validation plan reviewed by practising Ontario pharmacists before production.

Validate:

* Whether the suitability control supports rather than interferes with pharmacist judgment.
* Whether the pharmacist can stop at any time.
* Whether required documentation is complete.
* Whether identity and location checks are usable.
* Whether consent language is understandable.
* Whether additional participants are visible.
* Whether switching modality is clear.
* Whether technical failure is distinguishable from clinical completion.
* Whether fallback adds unnecessary delay.
* Whether telephone fallback is genuinely usable.
* Whether secure-message expectations are clear.
* Whether assessment linking saves time without weakening clinical controls.
* Whether the interface works in realistic pharmacy conditions.
* Whether a pharmacist can complete frequent actions one-handed on mobile where applicable.

Use only synthetic cases. Do not conduct a live patient pilot under this task.

## Deliverable

`docs/task-06/privacy-accessibility-security-and-clinical-validation-plan.md`

# Mandatory stop conditions

Stop the affected workstream and report the blocker if:

* `AGENTS.md` conflicts with the requested operation.
* Task 01’s synthetic environment is missing or unsafe.
* Task 02’s assessment or claim boundary cannot be preserved.
* Task 05’s patient and pharmacist identity domains are not separated.
* Task 11’s security or release gate is missing or bypassed.
* Real PHI appears in fixtures, tests, screenshots, logs, or artifacts.
* A production migration or authentication change lacks approval.
* A live vendor account or credential would be required.
* The requested vendor’s verification status cannot be confirmed.
* A vendor requires recording, unrelated data use, advertising, or AI training.
* A vendor cannot provide necessary privacy, security, accessibility, residency, or subprocessor evidence.
* Patient and pharmacist roles can be confused.
* Possession of a link is treated as authorization.
* Waiting patients can see or hear one another.
* A hidden or unauthorized participant can join.
* A delegate can join after revocation.
* Patient identity or location would need to be guessed.
* Cross-jurisdictional care would need to be enabled without review.
* Virtual-care consent policy would need to be invented.
* A pharmacist suitability decision would be automated.
* A patient could set or bypass pharmacist suitability.
* A disconnect, timeout, patient departure, or vendor event can complete an assessment.
* A virtual visit can directly create or submit a claim.
* Reconnect can bypass current authorization.
* A modality switch can bypass renewed safeguards.
* Audio or video must be recorded.
* Transcription, biometric identification, emotion analysis, or AI meeting summaries would be required.
* Secure-message content must enter logs or analytics.
* PHI or tokens appear in URLs, browser storage, analytics, logs, unsecured notifications, calendars, referrers, or evidence.
* Raw WebRTC or device data must be retained without approval.
* An accessible telephone or in-person fallback cannot be provided.
* The synthetic implementation could operate in production.
* Existing tenant, audit, privacy, assessment, billing, retention, or finalization controls would need to be weakened.

Continue independent synthetic work when only production integration is blocked.

# Deliverables

1. Current-state and gap analysis.
2. Current Ontario virtual-care standards mapping.
3. Build-versus-integrate decision.
4. Vendor assessment scorecard.
5. Verification and procurement gates.
6. Virtual-care threat model.
7. Trust-boundary and data-flow diagrams.
8. Orthogonal visit-state model.
9. Virtual-visit contracts and schema proposal.
10. Identity and location contract.
11. Consent and privacy-confirmation model.
12. Pharmacist suitability model.
13. Waiting-room design.
14. Participant-authorization model.
15. Join, expiry, disconnect, and rejoin design.
16. Device and connectivity preflight.
17. Accessible telephone fallback.
18. Failure and contingency state machine.
19. Secure-messaging contract.
20. Assessment and claim integration boundary.
21. Privacy, security, and retention plan.
22. Audit-event catalogue.
23. Incident-response design.
24. Synthetic virtual-care prototype.
25. Deterministic server-owned fixtures.
26. Security, authorization, privacy, leakage, state-transition, and accessibility tests.
27. Mobile and desktop evidence.
28. Clinical and operational validation plan.
29. Production integration handoff.
30. Updated task status and repository documentation.

# Synthetic prototype acceptance criteria

The synthetic prototype is complete only when:

* The pharmacist alone makes and records the modality-suitability decision.
* The pharmacist can mark virtual care unsuitable before or during the visit.
* Unsuitability does not force assessment or claim completion.
* Patient and pharmacist security contexts remain separate.
* Actor, subject, participant, and professional role remain distinct.
* Only authenticated and authorized participants can join.
* Link possession grants no authority.
* Other patients are invisible and inaudible in the waiting room.
* Identity, location, consent, privacy, technical readiness, contingency, and suitability are complete before clinical interaction.
* All protected transitions are verified server-side.
* Modality changes trigger applicable rechecks.
* Patient departure is not pharmacist completion.
* Disconnect is not pharmacist completion.
* Timeout is not pharmacist completion.
* Vendor meeting end is not pharmacist completion.
* Technical failure cannot complete an assessment or generate a claim.
* Approved fallback can proceed only through a new guarded transition.
* Existing assessment and claim services remain authoritative.
* Audio and video recording remain disabled.
* Transcription and AI meeting summaries remain disabled.
* Secure-message content is protected as PHI.
* No PHI, token, room secret, message body, exact location, or raw WebRTC data appears in logs, analytics, URLs, notifications, calendars, referrers, or evidence.
* Telephone fallback is usable without video capability.
* Cross-jurisdictional care remains blocked.
* Loading, waiting, denied, expired, degraded, disconnected, reconnecting, unsuitable, consent-withdrawn, fallback, and vendor-outage states are usable.
* The experience works at 375px and desktop.
* Keyboard, screen-reader, zoom, reflow, reduced-motion, low-bandwidth, and 56px-target requirements pass.
* Fixtures and evidence use only deterministic synthetic data.
* Production vendors, PHI, schema changes, authentication changes, communications, recording, and claims remain disabled.

A prototype `PASS` does not approve the production vendor, consent policy, technology, clinical workflow, or virtual-care service.

# Final report format

End the task with:

Task 06 synthetic prototype status: PASS | BLOCKED | FAIL

Task 01 synthetic environment: READY | BLOCKED
Task 02 assessment integration: PASSED | BLOCKED | NOT VERIFIED
Task 05 identity integration: PASSED | BLOCKED | NOT VERIFIED
Task 07 notifications: STUBBED | NOT APPLICABLE
Task 11 security/release gate: PASSED | BLOCKED | NOT VERIFIED
OCP standards mapping: PASS | BLOCKED | FAIL
Ontario Health standard mapping: PASS | BLOCKED | FAIL
Build-versus-integrate decision: PASS | BLOCKED | FAIL
Selected production approach: INTEGRATE | CUSTOM | HYBRID | UNDECIDED
Selected vendor: NONE | NAME | BLOCKED
Current verification evidence: VERIFIED | NOT VERIFIED | NOT APPLICABLE
Vendor review: PASSED | BLOCKED | NOT VERIFIED
Contract review: APPROVED | BLOCKED | NOT VERIFIED
Canadian-residency evidence: VERIFIED | BLOCKED | NOT VERIFIED
PIA approval: APPROVED | BLOCKED | NOT VERIFIED
TRA approval: APPROVED | BLOCKED | NOT VERIFIED
Professional review: APPROVED | BLOCKED | NOT VERIFIED
Cross-jurisdictional review: APPROVED | BLOCKED | NOT VERIFIED
Virtual-care threat model: PASS | FAIL
Identity and participant authorization: PASS | FAIL
Consent and privacy model: PASS | BLOCKED | FAIL
Location confirmation model: PASS | BLOCKED | FAIL
Pharmacist suitability control: PASS | FAIL
Waiting-room controls: PASS | FAIL
Disconnect and rejoin behavior: PASS | FAIL
Telephone fallback: PASS | FAIL
Secure-messaging prototype: PASS | FAIL
Assessment guard integration: PASS | FAIL
Claim boundary: PASS | FAIL
Recording disabled: PASS | FAIL
Transcription disabled: PASS | FAIL
PHI leakage tests: PASS | FAIL
Accessibility evidence: PASS | FAIL
Low-bandwidth evidence: PASS | FAIL
One-handed 56px evidence: PASS | FAIL
Automated tests: PASS | FAIL
Real PHI used: NO
Production schema changed: NO
Production authentication changed: NO
Production vendor connected: NO
Production visits enabled: NO
External messages sent: NO
Audio/video recorded: NO
Claims created or submitted: NO

Blocking issues:
Unresolved vendor decisions:
Unresolved professional decisions:
Unresolved privacy/legal decisions:
Unresolved accessibility decisions:
Deferred production work:
Evidence locations:
Files changed:
Tests run and results:
Recommended next action:

Never report production readiness while vendor review, professional review, consent policy, identity, cross-jurisdictional policy, PIA, TRA, accessibility, data residency, or Task 11 release approval remains unresolved.

If the synthetic prototype passes while production dependencies remain blocked, report:

**Task 06 synthetic prototype: PASS — production vendor integration, PHI processing, virtual visits, secure messaging, and claim effects remain gated.**
