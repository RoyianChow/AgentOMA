Task 07 — Consented Messaging, Administrative Reminders, and Secure Portal Communication

Owner profile: backend/communications developerSupporting reviewers: privacy, security, accessibility, clinical/professional, operationsPriority: P1 for consent, secure messaging, and synthetic delivery controls; P2 for approved production-provider integrationStatus: synthetic implementation may proceed; real recipients, live providers, production delivery, and PHI processing remain blocked pending the gates belowUpdated: 2026-07-30

Outcome

Build a fail-closed communications control plane for AgentRx that:

Sends only generic administrative notices through email, SMS, or push.

Keeps clinical and other sensitive content inside the authenticated portal.

Proves current channel-specific consent and verified contact ownership immediately before every external send.

Prevents duplicate delivery across retries, crashes, delayed webhooks, and reconciliation.

Gives patients clear control over consent, language, accessibility preferences, quiet hours, and opt-out.

Gives authorized staff a secure, auditable portal thread and review queue.

Never treats provider acceptance, delivery, opening, or acknowledgement as proof that the intended patient read or understood a message.

Never uses AI to decide clinical urgency, disposition, escalation, or response priority.

This task is communications infrastructure, not a marketing system, diagnosis tool, emergency service, or autonomous clinical inbox.

Evidence basis and interpretation

Use deep-research-report.md as project-planning context. Its central product boundary applies here: AgentRx should remain a documentation, workflow, and clinician-handoff system with explicit consent, human accountability, conservative safety controls, and strong privacy boundaries.

The research report is not legal, privacy, security, accessibility, or professional approval. Before production:

Reconfirm every applicable requirement against current official sources.

Record the source title, authority, URL, revision date, access date, relevant requirement, current repository evidence, gap, required action, and approval owner.

Separate Ontario requirements from assumptions about other Canadian provinces, the United States, or Bangladesh.

Do not claim that PHIPA universally requires Canadian hosting.

Do not process Bangladesh patient data unless current local data-location requirements and the proposed infrastructure are independently reviewed and approved.

Do not rely on a vendor marketing page as evidence of contractual, residency, security, accessibility, or subprocessor controls.

Non-negotiable design principles

A verified contact is not a verified patient. Email or telephone control proves only that the current actor can access that destination.

Consent is not inferred from contact verification, portal enrollment, appointment creation, prior delivery, or lack of opt-out.

Consent is channel-, destination-, purpose-, custodian-, and time-bound.

Consent is rechecked at dispatch. Eligibility when a reminder is scheduled does not authorize a later send.

Unsecured notifications are generic. Clinical content and identifying appointment details remain in the authenticated portal.

A link grants no authority. External messages may contain only a generic portal entry URL without reusable credentials, patient identifiers, thread identifiers, or PHI.

Delivery is not readership. Provider acceptance, delivery, open tracking, link access, and portal acknowledgement are separate facts.

Secure messaging is professional communication. It uses the Task 05 identity boundary and, where applicable, Task 06 virtual-care consent and suitability controls.

No AI urgency decisions. AI, NLP, keyword models, sentiment analysis, or risk scoring must not decide whether a reply is urgent or which clinical queue receives it.

No silent channel fallback. Failure on one channel does not authorize use of another.

No emergency override is invented. Quiet-hours or consent bypass for “urgent” messages remains unavailable unless an approved policy defines a human-controlled workflow.

Unknown or contradictory state fails closed.

Terminology

External or unsecured channel: email, SMS, or push notification visible outside the authenticated AgentRx portal.

Secure portal message: PHI-capable message stored and displayed only inside an authenticated, server-authorized AgentRx thread.

Administrative reminder: a generic notice that an appointment, follow-up item, account action, or secure portal message requires attention.

Purpose: the approved reason for communication, independently evaluated from channel and content.

Contact point: a versioned email address, telephone destination, or push subscription.

Consent grant: an immutable, scoped record permitting a defined communication purpose through one contact-point version and channel.

Suppression: a fail-closed prohibition on sending to a contact point.

Logical message: the one business communication AgentRx intends to send.

Delivery attempt: one provider interaction for a logical message.

Acknowledgement: an authenticated portal action by an authorized actor; it is not proof of comprehension or clinical completion.

Reconciliation: a controlled process that resolves uncertain provider state without creating another logical message.

Channel and content boundary

Channel

Permitted default content

Prohibited content

Required access control

Email

Generic administrative notice and generic portal sign-in URL

Ailment, symptom, medication, allergy, assessment result, appointment purpose, health number, message excerpt, patient name in subject, clinical urgency, or bearer token

Current verified email plus active purpose-specific consent

SMS

Generic administrative notice and generic portal sign-in URL

Same prohibited content as email; no clinical reply workflow

Current verified telephone contact plus active purpose-specific consent

Push

Generic lock-screen-safe notice

PHI, message preview, assessment state, medication, ailment, participant identity, or sensitive deep-link data

Current registered subscription plus active purpose-specific consent

Secure portal

Authorized administrative or professional content

Cross-subject, cross-custodian, or unauthorized content; unsafe attachments

Authenticated session and server authorization on every read and write

The default synthetic templates must omit appointment date, time, pharmacy name, clinician name, and location. A production policy may approve a narrowly different minimum payload, but that decision must be explicit, documented, and covered by leakage tests.

Scope

P1 scope

Current-state and gap assessment.

Applicable Ontario communications, privacy, professional, consent, accessibility, record, and vendor-control mapping.

Per-channel and per-purpose consent model.

Contact verification and contact-version lifecycle.

Language, timezone, quiet-hours, accessibility, and channel preferences.

Transactional, idempotent synthetic outbox.

Separate logical-message, attempt, delivery, and reconciliation state.

Minimal-payload, versioned template catalogue.

Synthetic provider adapters and deterministic webhook fixtures.

Secure patient-pharmacist portal threads.

Administrative and pharmacist-review queues selected by explicit workflow state, not message-content AI.

Appointment and follow-up reminder orchestration.

Opt-out, wrong-number, hard-bounce, soft-failure, stale-contact, complaint, delayed-delivery, provider-outage, and uncertain-send flows.

Append-only audit events and field-level retention mapping.

Security, authorization, privacy, leakage, state-machine, retry, accessibility, and responsive tests.

Mobile and desktop synthetic evidence.

Production handoff and unresolved-decision register.

P2 scope after approval

Selection and integration of approved email, SMS, or push providers.

Live provider credentials.

Real webhook endpoints.

Production delivery and reconciliation.

Contractually approved vendor monitoring and operational dashboards.

Carefully approved use of provider cancellation, suppression, or status APIs.

P2 remains blocked until every applicable production gate is approved.

Out of scope

Marketing, newsletters, promotions, referral campaigns, or behavioural engagement messaging.

Patient acquisition or advertising audiences.

Clinical advice, diagnosis, triage, medication instructions, test results, or care plans in email, SMS, push, calendar entries, or lock-screen previews.

Automatic emergency triage, urgency classification, sentiment analysis, or unattended clinical-inbox promises.

AI-generated patient or pharmacist replies.

Automatic translation of clinical content.

Recording, transcription, summarization, or training on secure-message content.

Automatic channel fallback.

Password-reset, MFA, or authentication redesign unless separately approved under Task 05.

Calendar invitations containing patient, appointment, assessment, or clinical information.

Attachments unless an approved malware-scanned, authorization-controlled, retention-controlled upload boundary already exists.

Production schema migration or authentication change.

Production notification from the existing follow-up feature until this task’s controls pass and are approved.

New clinical, assessment-completion, billing, or claim rules.

A live patient pilot.

Dependencies and integration boundaries

Required dependencies

Task 01: safe synthetic environment and deterministic fixture boundary.

Task 04: authoritative appointment, follow-up, retention, and deliberate-destruction boundaries, as applicable.

Task 05: separated patient, delegate, pharmacist, administrator, tenant, actor, and subject identity domains.

Task 06: secure-messaging modality, participant authorization, response expectations, virtual-care consent, and assessment boundary where Task 06 is used.

Task 11: security, feature-gate, production-release, and protected-route requirements.

Do not assume these tasks are complete. Inspect and cite repository evidence. If a dependency is unavailable, continue independent synthetic design work and mark the affected integration BLOCKED or NOT VERIFIED.

Authoritative systems

The appointment service remains authoritative for appointment state.

The follow-up service remains authoritative for follow-up state.

Task 05 remains authoritative for identity, session, role, actor-to-subject, delegate, tenant, and revocation state.

Task 06 remains authoritative for virtual-care and secure-messaging consent and pharmacist suitability where applicable.

The assessment service remains authoritative for clinical documentation and completion.

The existing billing service remains authoritative for claim eligibility, code selection, generation, and submission.

The communication service may report notification metadata but may not complete appointments, assessments, visits, follow-ups, or claims.

Execution instructions

Read repository instructions, including every applicable AGENTS.md.

Inspect the current implementation before proposing a schema or endpoint.

Preserve existing patient, pharmacist, delegate, tenant, audit, retention, assessment, and claim boundaries.

Use only deterministic synthetic data.

Do not apply a production migration.

Do not add a live SDK, credential, recipient, sending domain, telephone number, push certificate, or webhook secret.

Implement server-owned authorization and transitions; UI hiding is never an authorization control.

Add safe feature gates that fail hard if synthetic adapters are enabled in production.

Continue synthetic work when only production policy, vendor, contract, or approval is blocked.

End with the required status report.

Workstream A — Current-state and standards assessment

Repository assessment

Document:

Current appointment and follow-up models, states, event sources, cancellation behavior, and ownership.

Existing communication, notification, email, SMS, push, WebSocket, real-time, queue, worker, cron, or event infrastructure.

Existing retry, idempotency, scheduling, locking, concurrency, and dead-letter behavior.

Existing patient, subject, actor, delegate, pharmacist, administrator, support, pharmacy, and tenant relationships.

Existing session separation, audience checks, revocation, and protected-route behavior.

Existing contact storage, normalization, verification, change, and recovery.

Existing consent capture, privacy notices, versions, expiry, revocation, and audit.

Existing language, accessibility, timezone, and quiet-hours preferences.

Existing portal message or thread functionality.

Existing follow-up notification behavior and why it must remain disabled.

Existing logs, error monitoring, analytics, traces, session replay, browser storage, caching, and audit behavior.

Existing vendor SDKs, credentials, webhooks, subprocessors, residency, and metadata assumptions.

Existing content-security, CSRF, origin, rate-limit, and abuse controls.

Existing retention, deletion, legal-hold, export, and backup behavior.

Existing mobile and accessibility patterns.

Existing synthetic fixtures and production feature gates.

Existing tests and evidence.

PHI, personal-information, token, content, and vendor-metadata leakage risks.

Architectural conflicts with this task.

Standards and policy mapping

For each applicable source, record:

Source title.

Authority.

URL.

Version, revision, or effective date.

Date accessed.

Requirement or recommendation.

Applicable jurisdiction and channel.

Current repository evidence.

Gap.

Required action.

Approval owner.

Whether it blocks prototype, pilot, or production.

At minimum, assess current official requirements or guidance relevant to:

Ontario PHI collection, use, disclosure, safeguards, agents, service providers, and breach response.

Meaningful and express consent where applicable.

Custodian-directed use and circle-of-care limits.

Patient choice and withdrawal.

Professional expectations for pharmacist-patient communication and records.

Secure messaging as a professional virtual-care modality where applicable.

Electronic-message and telecommunications obligations, including opt-out and sender-identification rules where applicable.

Contact verification and recycled or shared destinations.

Accessibility, language, plain-language, and alternative-channel accommodation.

Data location, cross-border processing, vendor access, subprocessors, and support access.

Vendor agreements, privacy impact assessment, threat/risk assessment, and procurement evidence.

Retention, legal hold, export, and secure disposal.

Incident, privacy-breach, and wrong-recipient response.

Do not label the mapping legal, privacy, security, accessibility, or professional approval.

Deliverables

docs/task-07/current-state-and-gap-analysis.md

docs/task-07/communications-standards-and-policy-mapping.md

docs/task-07/production-dependency-register.md

Workstream B — Threat model, trust boundaries, and data flows

Create a communications threat model covering message creation, scheduling, rendering, dispatch, provider handling, webhook receipt, reconciliation, portal access, staff queues, audit, and retention.

Required actors

Model at minimum:

Patient actor.

Patient subject.

Verified caregiver, delegate, or authorized agent.

Pharmacist.

Pharmacy administrator.

Authorized administrative staff member.

Technical support staff.

AgentRx patient application.

AgentRx pharmacist application.

Task 05 identity service.

Appointment and follow-up services.

Communication orchestration service.

Scheduler and outbox worker.

Template registry.

Synthetic provider adapter.

Proposed production email, SMS, or push provider.

Provider employee or support operator.

Webhook receiver.

Secure-message service.

Staff work-item queue.

Audit service.

Error monitoring and telemetry services.

Compromised patient device.

Malicious unauthenticated user.

Cross-tenant authenticated user.

Insider with excessive access.

Compromised provider or subprocessor.

Map conceptual actors to existing roles. Do not invent production roles silently.

Required assets

Include:

Actor-to-subject and delegate relationships.

Contact values and normalized matching values.

Contact-verification challenge and status.

Push subscription or device token.

Consent events and notice versions.

Communication preferences and quiet hours.

Message intent.

Template and translation versions.

Safe rendering data.

Logical-message identifiers and idempotency keys.

Delivery-attempt and provider references.

Provider credentials and webhook secrets.

Webhook receipts and reconciliation evidence.

Suppression records.

Appointment and follow-up references.

Secure-message content.

Thread participant and assignment records.

Queue work items.

Audit records.

Retention and deletion state.

Required threats

Assess at minimum:

Sending without consent.

Sending after consent expiry, revocation, or supersession.

Revocation racing with worker claim or provider acceptance.

Contact changed after scheduling.

Recycled, shared, mistyped, or reassigned telephone number or email.

Contact verification being mistaken for patient identity.

Wrong patient, subject, pharmacy, tenant, appointment, follow-up, or thread.

Client-supplied recipient, channel, purpose, template, actor, subject, or tenant substitution.

BOLA or IDOR on message, thread, queue, or preference endpoints.

Patient token accepted at a pharmacist boundary or the reverse.

Expired or revoked delegate access.

Unauthorized staff or support access.

Duplicate message creation.

Worker crash before send, during send, after provider acceptance, or before commit.

Provider timeout with unknown send outcome.

Retry against a provider without idempotency.

Delayed delivery after cancellation, consent withdrawal, appointment change, or expiry.

Out-of-order, duplicate, malformed, oversized, spoofed, or replayed webhook.

Provider event for the wrong tenant or logical message.

Provider status regression.

Provider outage, rate limit, partial outage, or stale status API.

Hard bounce, soft bounce, complaint, wrong-number response, or carrier filtering.

Automatic fallback to an unconsented channel.

PHI in subject lines, SMS bodies, push previews, message excerpts, links, URLs, calendar data, tags, custom metadata, provider dashboards, support tickets, or delivery reports.

Patient identity or health relationship exposed by pharmacy, clinician, ailment, medication, or appointment-purpose wording.

Template injection or unapproved placeholder introduction.

Translation changing meaning or adding clinical content.

Reusable credential, verification code, or token leaking into logs.

Link scanner, preview bot, referrer, browser history, or analytics consuming a sensitive URL.

External reply containing PHI.

Opt-out text being misclassified or ignored.

Free-text reply being routed by AI urgency classification.

Secure message sent to the wrong thread.

Message body in logs, audit, traces, analytics, exception reports, search indexes, or session replay.

Unsafe HTML, script injection, oversized input, or malicious links in secure messages.

Unsafe attachment or malware.

Misleading “read,” “seen,” “delivered,” or response-time claims.

Patient using messaging for an urgent concern when the channel is not continuously monitored.

Staff queue abandonment or response-time breach.

Secure-message delivery or acknowledgement completing an assessment, follow-up, visit, or claim.

Consent, authorization, suitability, or assignment changing while a thread is open.

Denial-of-service, spam, recipient enumeration, or notification flooding.

Quiet-hours, daylight-saving, timezone, language, or accessibility failure.

Retention deletion racing with legal hold or unresolved incident.

Vendor data use for advertising, unrelated analytics, model training, or profiling.

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

Deliverables

docs/task-07/communications-threat-model.md

docs/task-07/trust-boundaries-and-data-flows.md

Workstream C — Domain contracts and schema proposal

Do not apply a production migration.

Produce server-only conceptual contracts for:

CommunicationChannel

CommunicationPurpose

ContactPoint

ContactVerificationChallenge

ContactVerificationEvent

CommunicationConsentEvent

CommunicationConsentGrant

CommunicationPreferenceProfile

QuietHoursPolicy

CommunicationTemplate

CommunicationTemplateVersion

TemplateTranslationVersion

MessageIntent

OutboxMessage

DeliveryAttempt

ProviderMessageReference

ProviderWebhookReceipt

SuppressionEntry

ReconciliationCase

CommunicationWorkItem

SecureMessageThread

SecureThreadParticipant

SecureMessage

SecureMessageAcknowledgement

SecureMessageQueueItem

CommunicationAuditEvent

Minimum field requirements

The proposal must address:

Contact point

Opaque contact-point identifier.

Opaque custodian, patient-subject, and patient-actor references.

Channel.

Encrypted contact value.

Normalized keyed-match value where justified.

Contact-point version.

Verification state, method, time, challenge reference, and verifier.

Active, superseded, disputed, or suppressed state.

Source and last-confirmed time.

Created, changed, and invalidated times.

Never place raw contact details in logs, URLs, idempotency keys, audit events, or provider metadata fields.

Consent

Opaque consent-event and grant identifiers.

Patient subject and acting patient or authorized-agent reference.

Authorized-agent relationship and grant reference where applicable.

Custodian scope.

Contact-point version.

Channel.

Purpose.

Notice and wording version.

Capture method and provenance.

Language.

Effective time.

Expiry time or approved no-fixed-expiry policy reference.

Withdrawal time.

Revocation reason code.

Superseded-by reference.

Staff witness where required.

Policy version and jurisdiction.

Preference profile

Preferred permitted channels.

No-assumed-fallback rule.

Language and human-approved translation availability.

IANA timezone and provenance.

Quiet-hours start, end, and applicable days.

Accessibility and communication accommodation preferences.

Alternative-format preference.

Effective and superseded times.

Preferences do not create consent. A preferred channel without active consent remains unusable.

Logical message and outbox

Opaque logical-message and outbox identifiers.

Opaque tenant or custodian scope.

Purpose.

Authoritative source-event reference and source-event version.

Patient-subject reference.

Contact-point-version reference.

Consent-grant reference used at scheduling.

Template and translation version.

Safe structured render parameters.

Server-generated idempotency key.

Scheduled-at, not-before, expires-at, cancelled-at, and completed-at times.

Intent, dispatch, delivery, and reconciliation states.

State version or concurrency token.

Attempt count and next-attempt time.

Lease owner and lease expiry.

Safe failure and cancellation reason codes.

Latest provider reference through a protected mapping.

Consent, contact, source event, and policy versions rechecked at dispatch.

Delivery attempt and webhook

Opaque attempt identifier.

Logical-message reference.

Attempt number.

Provider adapter and approved configuration version.

Provider idempotency reference.

Attempt start and finish times.

Safe outcome and reason code.

Provider acceptance state.

Provider-message-reference mapping.

Webhook event identifier or keyed digest.

Signature-validation outcome.

Event timestamp, received timestamp, and processed timestamp.

Replay, duplicate, reordering, and reconciliation outcome.

Do not retain raw provider payloads by default. If evidence requires temporary raw payload retention, it must be encrypted, access-controlled, time-limited, content-reviewed, and separately approved.

Secure thread

Opaque thread identifier.

Custodian and tenant scope.

Patient-subject reference.

Patient-actor or authorized-agent reference.

Assigned pharmacist reference.

Appointment, follow-up, visit, or assessment reference where applicable.

Thread purpose.

Professional-modality and consent references where Task 06 applies.

Participant roster and authorization references.

Response-expectation wording version and patient acknowledgement.

State, opened, last-activity, closes, expires, withdrawn, and closed times.

Assignment and state version.

Retention classification.

Secure message

Opaque message identifier.

Thread reference.

Author actor and authorized participant role.

Encrypted, bounded, sanitized body.

Server receipt time.

Client idempotency token scoped to the author and thread.

Immutable correction or supersession reference.

Queue-routing state selected from trusted workflow data.

Acknowledgement metadata separated from delivery and clinical completion.

Attachment state fixed to BLOCKED unless the approved boundary exists.

For every field in every contract, document:

Meaning.

Type.

Nullable behavior.

Source of truth.

Trusted actor.

PHI or personal-information classification.

Client-safe or server-only status.

Authorization requirement.

Encryption requirement.

Retention owner.

Staleness and supersession behavior.

Whether production approval is required.

Deliverable

docs/task-07/communication-contracts-and-schema-proposal.md

Workstream D — Consent, contact verification, preferences, and suppression

Consent rules

The service must:

Require an active consent grant for the exact contact-point version, channel, purpose, custodian, and current time.

Treat PENDING, EXPIRED, REVOKED, SUPERSEDED, DISPUTED, UNKNOWN, and malformed states as ineligible.

Recheck consent when the message is created, when it is claimed, immediately before adapter dispatch, and before any manual resend.

Tie consent to a versioned notice and capture provenance.

Allow patient or valid authorized-agent withdrawal through an authenticated, accessible workflow.

Preserve the immutable consent history while making the current effective state unambiguous.

Cancel or suppress every unsent message affected by withdrawal.

Attempt provider cancellation only where approved and supported, while clearly recording that cancellation may not prevent already accepted delivery.

Prevent late delivery events from restoring consent or scheduling another message.

Avoid using consent to one purpose as consent to another.

Keep secure-messaging modality consent separate from external-notification consent.

Keep treatment consent separate from communication consent.

Keep marketing consent entirely out of scope.

Contact verification

The synthetic design must:

Verify each contact point before it becomes eligible.

Use short-lived, one-time challenges.

Store only a secure digest of verification codes.

Rate-limit challenge creation and attempts.

Prevent destination or account enumeration.

Expire and revoke challenges.

Never log or audit the raw challenge.

Never treat successful contact verification as sufficient patient identity.

Require Task 05 authorization before adding or changing a contact.

Create a new contact-point version for every material change.

Re-evaluate or invalidate consent tied to a superseded destination.

Suppress the old destination until an approved policy explicitly permits otherwise.

Provide a shared-contact warning in approved language.

Do not implement a production verification provider or change authentication in this task.

Quiet hours and timezone

The service must:

Use an explicitly selected or account-approved IANA timezone.

Never infer timezone or location from IP address.

Apply quiet hours at dispatch, not only at scheduling.

Handle daylight-saving changes and ambiguous or skipped local times deterministically.

Move a permitted reminder to the next allowed time only if it remains useful and has not expired.

Expire rather than send when the useful window has passed.

Avoid inventing a clinical or emergency override.

Recalculate pending messages after a preference or timezone change.

Language and accessibility preferences

Use only human-reviewed external templates and translations.

Fall back to an approved default template, not machine translation.

Never machine-translate secure clinical content under this task.

Preserve the template and translation version used.

Support long labels and Bangla-script rendering in synthetic accessibility tests, without assuming that Bangla is approved for every Ontario workflow.

Ensure an accessible portal path exists when a patient cannot use a given external channel.

Suppression

Create suppression reasons for at minimum:

Patient opt-out.

Consent revoked.

Consent expired.

Wrong number or wrong recipient.

Hard bounce.

Spam complaint.

Contact disputed.

Contact superseded.

Security or privacy incident.

Administrative hold.

Provider or policy block.

Suppression must override channel preference, schedule, retry, and staff resend. Unsuppression requires an authorized, audited process and new evidence; it must never occur automatically from a provider delivery event.

Deliverables

docs/task-07/consent-contact-and-preference-model.md

docs/task-07/suppression-and-contact-change-policy.md

Workstream E — Transactional outbox and state machine

Use a transactional outbox. Exactly-once external delivery cannot be guaranteed across an unreliable network, so the design must state its real guarantees and prove duplicate resistance at every boundary.

Orthogonal state

Do not overload one field with unrelated facts. Model at least:

Intent state

SCHEDULED

HELD

SUPPRESSED

CANCELLED

EXPIRED

COMPLETED

UNKNOWN

Dispatch state

PENDING

CLAIMED

DISPATCHING

SENT

FAILED_RETRYABLE

FAILED_FINAL

UNCERTAIN

Delivery state

NOT_APPLICABLE

UNKNOWN

PROVIDER_ACCEPTED

DELIVERED

BOUNCED

UNDELIVERABLE

COMPLAINT

Reconciliation state

NOT_REQUIRED

REQUIRED

IN_PROGRESS

RECONCILED_SENT

RECONCILED_NOT_SENT

RECONCILED_UNRESOLVED

The user-facing and operational model must still expose the required scheduled, sent, delivered, failed, cancelled, and reconciled concepts without pretending they are equivalent.

Required transition documentation

For every transition, document:

Source state.

Destination state.

Permitted server actor.

Required authorization and policy guards.

Current consent and contact checks.

Quiet-hours and expiry checks.

Source-event validity check.

Idempotency behavior.

Lease and concurrency behavior.

Provider behavior.

Audit event.

Staff work-item effect.

Invalid-transition behavior.

Idempotency and concurrency

The implementation must:

Generate the logical idempotency key server-side from non-PHI stable references.

Enforce uniqueness within the intended scope.

Treat repeated source events as the same logical message when policy says they are equivalent.

Use a new logical message only when the authoritative source event or approved purpose materially changes.

Use transactional insertion with the source-domain change where the repository architecture permits.

Use a bounded worker lease or equivalent safe claim mechanism.

Prevent two workers from dispatching the same attempt.

Pass a provider idempotency key where supported.

Preserve the provider reference before allowing an ordinary retry.

Enter UNCERTAIN and reconcile before retry when the provider outcome is unknown.

Never “retry blind” after a timeout if doing so could duplicate the message.

Make cancellation, revocation, expiry, contact change, and dispatch races deterministic.

Use optimistic concurrency or equivalent state-version checks.

Make webhook processing idempotent.

Prevent stale events from moving state backward.

Scheduling rules

Compute schedule from an authoritative event and approved cadence.

Do not invent reminder cadence.

Store absolute UTC instants plus the decision timezone and policy version.

Cancel stale reminders after appointment cancellation, rescheduling, follow-up closure, consent withdrawal, or contact supersession.

Supersede rather than mutate historical logical messages when an authoritative event changes.

Enforce a usefulness expiry.

Do not send an overdue reminder merely because the worker recovered.

Do not send a message whose source event can no longer be verified.

Critical invariants

Prove that:

Revoked, expired, superseded, or missing consent blocks dispatch.

Unverified, disputed, superseded, or suppressed contact blocks dispatch.

A worker crash cannot create two logical messages.

A provider timeout cannot trigger an unsafe duplicate.

A duplicate or replayed webhook cannot create a message.

A late delivered event cannot revive a cancelled message.

A cancellation does not claim to retract a message already delivered.

Provider delivery does not mark a message read.

Provider opening or link tracking is disabled by default and never treated as patient identity.

No delivery event changes an appointment, follow-up, secure thread, assessment, virtual visit, or claim to a completed state.

UNKNOWN fails closed and creates a safe reconciliation work item.

Deliverable

docs/task-07/outbox-and-delivery-state-machine.md

Workstream F — Minimal-payload template catalogue

Create a versioned, allowlist-driven template registry.

Required synthetic template classes

Appointment reminder.

Appointment changed.

Appointment cancelled.

Follow-up item available.

New secure portal message.

Contact verification challenge.

Consent or preference change confirmation, if approved.

Generic delivery-problem instruction shown inside the portal.

Generic opt-out acknowledgement, subject to provider and policy review.

Default synthetic wording

The following examples are placeholders for testing only and are not approved production wording:

Appointment reminder: “You have an upcoming AgentRx appointment. Sign in to the secure portal for details.”

Appointment changed: “An AgentRx appointment was updated. Sign in to the secure portal for details.”

Appointment cancelled: “An AgentRx appointment was cancelled. Sign in to the secure portal for details.”

Follow-up: “A follow-up item is available in AgentRx. Sign in to the secure portal for details.”

New portal message: “A new message is available in AgentRx. Sign in to view it securely.”

Verification: “Your AgentRx verification code is {code}. It expires soon. Do not share it.”

Use a generic portal entry URL. It must not contain:

Patient, appointment, follow-up, assessment, visit, pharmacy, clinician, or thread identifiers.

Email address or telephone number.

A bearer token, magic link, reusable session, or verification answer.

Ailment, medication, allergy, symptom, red-flag, referral, or claim information.

Template controls

The registry must:

Use stable template and version identifiers.

Define channel and purpose allowlists.

Define allowed placeholders and placeholder types.

Reject unknown placeholders.

Render on the server.

Escape and sanitize output by channel.

Enforce length limits.

Store the exact version and safe render-data classification.

Require named human approval before production activation.

Preserve prior versions for audit.

Support an effective and retirement date.

Fail closed when a requested language or approved version is unavailable.

Keep email subjects, preheaders, sender display names, push titles, push bodies, and provider tags within the same review boundary.

Forbidden template data

Automated tests must reject:

Patient name or initials.

Date of birth, age, sex, address, or exact location.

Health-card, prescription, claim, appointment, assessment, or record number.

Pharmacy or clinician name when it would reveal a care relationship.

Appointment purpose, service type, ailment, symptom, diagnosis, medication, allergy, lab, red flag, referral, or clinical outcome.

Secure-message excerpt or participant name.

Staff-authored free text.

Raw vendor metadata.

URL query parameters or fragments.

Any proposal to include appointment date or time in an unsecured notification requires explicit privacy and professional approval, a documented minimum-necessary analysis, and updated leakage tests. It is not part of the default prototype.

Deliverable

docs/task-07/minimal-payload-template-catalogue.md

Workstream G — Provider adapter, webhook security, and reconciliation

Synthetic adapter

Build a deterministic provider interface with no network calls. It should support:

send

cancel

fetch_status

verify_webhook

normalize_webhook

health

The adapter must return deterministic synthetic outcomes for success, accepted-but-unknown, timeout-before-acceptance, timeout-after-acceptance, rate limit, temporary failure, permanent failure, hard bounce, wrong number, complaint, delayed delivery, duplicate webhook, reordered webhook, malformed webhook, invalid signature, replay, and outage.

Synthetic destinations must be non-deliverable opaque values. Do not place a real-format recipient into fixtures merely for realism.

Production adapter requirements

Do not implement or activate a live adapter in this task. The production design must require:

Approved vendor, product, service region, and account configuration.

Contract and privacy terms.

Data-flow and subprocessor evidence.

Residency and support-access evidence.

Incident-notification obligations.

Retention and deletion behavior.

Advertising, analytics, and AI-training prohibitions.

Encryption and credential-management evidence.

Sender registration and applicable telecommunications compliance.

Provider idempotency and reconciliation capabilities.

Signed webhook support or an approved alternative.

Rate-limit, outage, and disaster-recovery behavior.

Export and data-return terms.

Accessibility implications for opt-out and support.

Vendor payload minimization

The adapter may send only:

The encrypted or protected destination required for delivery.

The approved generic rendered template.

A provider idempotency value.

The minimum provider configuration required to route the message.

Do not include patient, subject, tenant, pharmacy, appointment, follow-up, assessment, visit, thread, or clinician identifiers in provider tags, metadata, URLs, filenames, or custom fields. Keep the internal-to-provider reference mapping inside AgentRx.

Disable provider SDK debug logging, body logging, link tracking, open pixels, contact enrichment, advertising, profiling, and unrelated analytics by default.

Webhook processing

The receiver must:

Enforce HTTPS in production design.

Limit request size and supported content type.

Verify the signature over the exact raw bytes.

Enforce an allowed timestamp window.

Deduplicate event identifiers.

Prevent replay.

Validate the provider account and configuration version.

Resolve the provider reference through an internal protected mapping.

Recheck tenant and logical-message scope.

Validate event schema and type.

Apply monotonic state rules.

Record unknown, duplicate, stale, and reordered events safely.

Return a generic response without exposing internal state.

Keep raw bodies and secrets out of application logs.

Prevent provider events from changing clinical, assessment, appointment, visit, follow-up, or claim completion.

Reconciliation

Define:

When reconciliation is required.

Who or what may initiate it.

Provider lookup behavior.

Backoff and rate limits.

How uncertain messages remain blocked from ordinary retry.

How provider evidence is mapped to safe internal status.

When a case becomes manually reviewable.

How a manual decision is authorized and audited.

How unresolved state expires.

How consent revocation or contact suppression affects reconciliation.

Deliverables

docs/task-07/provider-adapter-contract.md

docs/task-07/webhook-and-reconciliation-design.md

docs/task-07/vendor-review-scorecard.md

Workstream H — Secure portal messaging and reply queues

Secure portal messaging may contain PHI and must be treated as a professional communication modality, not consumer chat.

Thread eligibility

Before opening a thread or releasing its first message, the server must verify:

Valid authenticated session.

Correct audience and actor type.

Active, non-revoked account and session.

Actor-to-subject relationship.

Current delegate grant, scope, expiry, and revocation where applicable.

Custodian, pharmacy, and tenant scope.

Thread assignment and participant authorization.

Appointment, follow-up, visit, or assessment relationship where applicable.

Current secure-messaging consent and policy version.

Current Task 06 modality and suitability state where applicable.

Current thread state and expiry.

Current response-expectation wording version.

Task 11 feature and release gate.

State version or concurrency token.

Recheck authorization on every:

Thread-list request.

Thread read.

Message read.

Message send.

Acknowledgement.

Queue action.

Participant change.

Assignment change.

Close, withdraw, expire, or reopen action.

Export or transfer to the clinical record.

Thread lifecycle

Define at minimum:

DRAFT

PENDING_FIRST_MESSAGE_GATES

OPEN

WAITING_FOR_PHARMACIST_REVIEW

WAITING_FOR_PATIENT

PAUSED_AUTHORIZATION_CHANGED

PAUSED_CONSENT_WITHDRAWN

MARKED_UNSUITABLE

CLOSED

WITHDRAWN

EXPIRED

ACCESS_DENIED

UNKNOWN

For every transition, document actor, server guards, evidence, idempotency, concurrency, audit, queue effect, response-expectation effect, assessment effect, and invalid-transition behavior.

Patient experience

The patient must:

See that the channel is not monitored continuously.

See an approved alternative for urgent needs without the application diagnosing urgency.

See an absolute response expectation or service window in plain language.

Know which pharmacy or care team owns the secure thread after authentication.

Be able to send a bounded, sanitized message.

Be able to withdraw from messaging.

Be able to access an alternative format or channel without automatically granting new channel consent.

Never be told that “delivered” means a pharmacist read the message.

Do not present an emergency promise, live-chat indicator, typing indicator, or response countdown unless the approved operating model genuinely supports it.

Pharmacist and staff experience

Authorized pharmacists must be able to:

View only assigned and authorized threads.

Review patient replies in a protected queue.

Take ownership through a concurrency-safe assignment action.

Record an administrative or pharmacist-review classification.

Mark messaging unsuitable.

Close the thread with an approved reason.

Transfer relevant information to the authoritative clinical record through an approved workflow.

Leave application logs free of message content.

Administrative staff must see only the minimum information required for their approved role. Technical support must not receive message-body access by default.

Queue routing

Route portal replies from trusted thread type, participant role, assignment, and explicit staff action.

Do not use AI, NLP, keyword scoring, sentiment analysis, or diagnostic rules to decide urgency or clinical priority.

A patient-selected administrative category may inform routing but cannot override pharmacist review where policy requires it.

Ambiguous messages must enter a protected unclassified queue for authorized human review.

Queue metadata must not include the message body, ailment, medication, or clinical summary.

Queue notifications outside the portal must remain generic.

External replies

Templates must instruct recipients not to reply with health information and to use the secure portal.

Process exact approved opt-out commands deterministically.

Do not run AI classification on inbound email or SMS.

Do not forward an external reply into ordinary email, Slack, Teams, ticketing, logs, or analytics.

If production policy permits inbound free text, isolate it as PHI-capable content and create a body-free protected work item for authorized human review.

If secure inbound storage and review are not approved, disable inbound free-text handling and support provider-managed opt-out events only.

Never confirm a patient relationship to a wrong-number reporter.

Message integrity

Bound message length and submission frequency.

Normalize text safely without altering clinical meaning.

Escape output and prevent stored XSS.

Block executable content, tracking content, remote images, unsafe links, and attachments.

Use per-author, per-thread idempotency.

Preserve immutable originals and use corrections or supersession rather than silent edits.

Keep content out of audit events and general-purpose logs.

Encrypt content at rest and in transit.

Prevent third-party indexing, analytics, or model training.

Clinical boundary

A message, delivery event, read event, acknowledgement, thread closure, provider webhook, or queue action must never:

Complete an assessment.

Complete a virtual visit.

Complete a follow-up.

Generate or submit a claim.

Select a medication, treatment, diagnosis, referral, billing code, or PIN.

Infer that messaging is clinically suitable.

Only an authorized pharmacist may determine that messaging is suitable or unsuitable where that professional decision is required.

Attachments

Attachments remain BLOCKED unless the repository already has an approved boundary that proves:

Server authorization.

Tenant and subject isolation.

File-type and size allowlists.

Malware scanning.

Content-disposition safety.

Encrypted storage.

Short-lived access.

No public URLs.

Retention and legal hold.

Audit without filenames or content leakage.

Safe preview behavior.

Deliverables

docs/task-07/secure-portal-messaging-contract.md

docs/task-07/reply-and-review-queue-design.md

docs/task-07/secure-message-authorization-matrix.md

Workstream I — Appointment, follow-up, and Task 06 integration

Appointment reminders

Consume only authoritative appointment events.

Verify the current appointment version before dispatch.

Do not infer cadence or timing; use an approved policy.

Cancel and supersede reminders after reschedule or cancellation.

Never include the appointment purpose in an unsecured channel.

Do not allow an unsecured reply to confirm, cancel, or alter an appointment.

Direct the patient to the authenticated portal for details or action.

Do not expose another participant, pharmacist, pharmacy, assessment, or clinical service before authentication.

Follow-up reminders

Keep the existing production follow-up notification feature disabled.

Use only synthetic follow-up events until consent, template, provider, privacy, professional, and release gates pass.

Do not include the ailment, medication, treatment, red-flag, assessment result, or reason for follow-up externally.

Recheck that the follow-up is still open and belongs to the same subject and custodian.

Expire or cancel obsolete reminders.

Do not use reminder delivery as evidence that follow-up occurred.

Do not allow AI to decide that a missed or unanswered reminder is clinically urgent.

Create a safe staff work item when approved policy requires human follow-up.

Task 06 secure messaging

Where a Task 06 virtual-care or secure-message thread is involved:

Reuse Task 06’s professional-modality consent and suitability decision.

Preserve patient, subject, delegate, participant, pharmacist, custodian, visit, and assessment distinctions.

Recheck participant authorization before every message.

Keep Task 07 external notifications as generic stubs until production approval.

Do not claim that an external delivery receipt satisfies Task 06 message delivery, acknowledgement, documentation, or completion.

Do not permit a Task 07 event to bypass Task 06 identity, location, consent, participant, privacy, suitability, expiry, or release gates.

Keep assessment and claim services authoritative.

Deliverable

docs/task-07/appointment-follow-up-and-task-06-integration.md

Workstream J — Privacy, security, audit, and retention

Privacy and security controls

Define and test:

Encryption in transit and at rest.

Field protection for contact values, push tokens, secure messages, provider references, and credentials.

Key ownership and rotation.

Least privilege and separation of patient, pharmacist, administrator, and support access.

Tenant and custodian isolation.

Protected-route no-store and private-cache behavior.

CSRF and origin protection.

Rate limits and abuse controls.

Generic authorization failures that resist enumeration.

Server-side rendering and template validation.

Webhook signature verification and replay prevention.

Provider credential isolation.

Vendor employee and support access.

Referrer policy.

Content Security Policy.

Browser-storage prohibition for PHI, contact values, message bodies, and reusable credentials.

Analytics and session-replay prohibition on protected routes.

Error-reporting and trace redaction.

Link tracking and open-pixel disablement.

Secure operational access to reconciliation and work-item queues.

Vulnerability, dependency, incident, and subprocessor-change management.

Vendor data return, deletion, and backup expiry.

Audit catalogue

Define append-only events for:

Contact added, verification challenged, verified, failed, superseded, disputed, and suppressed.

Consent captured, expired, revoked, withdrawn, superseded, and denied.

Preference or quiet-hours version changed.

Message intent created, deduplicated, held, scheduled, rescheduled, suppressed, cancelled, expired, claimed, sent, failed, and reconciled.

Delivery accepted, delivered, bounced, undeliverable, complained, unknown, or denied.

Provider webhook accepted, rejected, duplicated, replayed, stale, reordered, or unknown.

Provider outage and recovery.

Wrong-number or wrong-recipient event.

Work item created, assigned, reviewed, resolved, or escalated.

Thread opened, denied, paused, closed, withdrawn, expired, or marked unsuitable.

Thread access allowed or denied.

Secure message sent, denied, acknowledged, or superseded.

Participant or assignment changed.

Secure-message export or clinical-record transfer allowed or denied.

Administrative support access.

Retention, legal-hold, export, and deletion action.

Every audit event should contain only:

Event ID.

Event type and schema version.

Time.

Opaque actor reference.

Opaque subject reference only where necessary.

Opaque custodian or tenant scope.

Opaque message, contact, consent, thread, or work-item reference.

Action.

Outcome.

Safe reason code.

Policy or template version.

Correlation reference.

Source service.

Never include:

Contact value.

Verification code.

Consent answer text.

Appointment or follow-up details.

Clinical content.

Secure-message body.

Attachment name or content.

Patient name or health number.

Exact location.

Template rendered body.

Provider raw payload.

Provider or webhook secret.

Push token.

Bearer token.

Full IP address or device fingerprint.

Application logs and telemetry

Use structured allowlist logging. Add tests that fail if logs, traces, metrics, analytics, breadcrumbs, alerts, or support events include:

PHI marker values.

Contact details.

Secure-message content.

Verification codes.

Rendered notification content.

Consent answers.

URL tokens.

Provider payloads.

Appointment, follow-up, assessment, or thread details.

Metrics should use safe aggregates such as counts by channel, purpose, state, safe failure category, and age bucket. Do not label metrics with patient, contact, provider-message, appointment, thread, or message identifiers.

Retention mapping

Create a field-level inventory for:

Contact points and versions.

Contact-verification challenges and events.

Consent events and current grants.

Preferences and quiet hours.

Templates and translations.

Logical messages and render parameters.

Delivery attempts and provider references.

Webhook receipts.

Suppression records.

Reconciliation cases.

Work items.

Secure threads, participants, messages, and acknowledgements.

Audit events.

Application logs, metrics, traces, and alerts.

Provider-held data.

Backups.

Synthetic fixtures and evidence.

For every dataset, document:

Purpose.

Source of truth.

PHI or personal-information classification.

Collection necessity.

Authorized roles.

Client exposure.

Vendor exposure.

Encryption.

Retention trigger.

Proposed retention period or unresolved policy decision.

Deletion, archival, or de-identification behavior.

Legal-hold behavior.

Backup behavior.

Data-return behavior.

Required approval.

Do not invent legally required retention periods. Secure-message content may form part of the clinical record; obtain approved professional and retention guidance before deletion or export behavior is activated.

Deliverables

docs/task-07/privacy-security-and-retention-plan.md

docs/task-07/communication-audit-event-catalogue.md

docs/task-07/logging-and-leakage-control.md

Workstream K — Accessibility, language, and user experience

Patient controls

Build synthetic interfaces for:

Viewing verified contact points without exposing full values unnecessarily.

Adding and verifying a synthetic contact.

Granting channel- and purpose-specific synthetic consent.

Reviewing active consent and expiry.

Revoking consent.

Selecting language, timezone, quiet hours, and accessibility preferences.

Understanding that preferences do not create consent.

Seeing delivery limitations.

Opening the authenticated secure-message inbox.

Reading response expectations.

Sending a secure message.

Withdrawing from a thread.

Handling expired, denied, unavailable, and unknown states.

Staff controls

Build synthetic interfaces for:

Viewing safe message-state summaries.

Viewing reconciliation and failure work items without body or contact leakage.

Reviewing wrong-recipient and vendor-failure events.

Managing authorized thread queues.

Assigning a pharmacist.

Recording administrative versus pharmacist-review disposition.

Marking secure messaging unsuitable.

Closing a thread.

Inspecting safe audit metadata.

Accessibility requirements

Verify:

375px operation without horizontal scrolling.

Desktop operation.

Keyboard access to every control.

Visible focus.

Logical headings, landmarks, labels, descriptions, and error associations.

Screen-reader names and live status announcements.

Accessible consent and revocation.

Accessible contact verification.

Accessible quiet-hours and timezone inputs.

Accessible secure-message composition and history.

Accessible delivery, failure, expiry, opt-out, and unknown states.

No essential hover-only behavior.

No keyboard trap.

Status that does not depend on colour.

Reduced-motion support.

200% and 400% zoom and reflow.

Long translated labels and Bangla-script rendering.

Clear absolute times with timezone.

Plain-language errors.

56px targets for frequent mobile actions.

An accessible non-digital or alternate-channel support path defined by approved operations policy.

Do not use delivery colour, check marks, or “seen” labels as the only explanation of state.

Deliverable

docs/task-07/accessibility-language-and-responsive-design.md

Workstream L — Operational runbook and incident handling

Create deterministic procedures for:

Opt-out

Authenticate portal opt-out or validate an approved provider opt-out event.

Record an immutable consent withdrawal or suppression.

Cancel affected unsent logical messages.

Prevent new messages for the same scope.

Attempt provider cancellation only if supported and approved.

Explain that an already accepted message may still arrive.

Audit without storing the contact or message body.

Require new affirmative evidence before future re-enrollment.

Wrong number or wrong recipient

Do not confirm a patient relationship.

Suppress the destination immediately.

Cancel affected unsent messages.

Lock ordinary resend.

Create a body-free protected staff work item.

Assess whether other messages were sent to the destination.

Escalate to privacy and security review under approved policy.

Preserve necessary evidence.

Do not let the application decide whether the event is legally reportable.

Require authenticated contact correction and fresh verification.

Bounce, complaint, and delivery failure

Distinguish retryable and final categories.

Limit retries and use backoff.

Do not change channels automatically.

Suppress on hard bounce or complaint as policy requires.

Create a safe work item when human action is required.

Keep clinical content and patient identity out of provider support tickets.

Do not equate a failed reminder with clinical deterioration.

Provider timeout or uncertain send

Enter UNCERTAIN.

Block ordinary retry.

Reconcile through the approved status path.

Require authorized manual review if unresolved.

Preserve idempotency.

Do not claim delivery.

Provider outage

Stop new dispatch safely.

Keep messages scheduled only while still useful.

Expire obsolete reminders.

Expose a safe staff operational state.

Avoid flooding on recovery.

Recheck consent, contact, source state, quiet hours, and expiry before resumed dispatch.

Do not infer clinical urgency or auto-select another channel.

Secure-message response delay

Use the approved response-expectation policy.

Create a safe, body-free queue alert when a service window is breached.

Require human review.

Do not have AI inspect content for urgency.

Do not promise an emergency response.

Do not automatically complete or close the thread.

Incident response

Model:

Detection.

Immediate containment or suppression.

Worker, credential, webhook, or provider disablement.

Session and authorization review.

Evidence preservation.

Scope assessment.

Privacy and security escalation.

Vendor escalation.

Patient-notification decision by authorized humans.

Recovery.

Reconciliation.

Post-incident review.

The application must not decide that an event is a legally reportable privacy breach.

Deliverables

docs/task-07/retry-opt-out-outage-and-reconciliation-runbook.md

docs/task-07/communications-incident-response.md

Workstream M — Synthetic prototype

Use deterministic, obviously synthetic, server-owned fixtures.

Fixture requirements

Fixtures must:

Use no real people, pharmacies, email addresses, telephone numbers, push tokens, appointments, follow-ups, assessments, threads, or clinical records.

Use unmistakable identifiers such as SYNTHETIC-MESSAGE-007.

Use non-deliverable opaque contact destinations.

Use a fixed clock.

Use a fixed synthetic Ontario timezone.

Remain server-owned.

Make no network or DNS calls.

Contain no live SDK, credentials, provider account, signing secret, or production URL.

Be visibly labelled synthetic.

Fail hard if enabled outside the approved synthetic environment.

Include marker values that leakage tests must detect.

Produce deterministic provider and webhook outcomes.

Avoid client-side fixture imports where server ownership is required.

Required synthetic scenarios

Include:

Verified email with active appointment-reminder consent.

Verified SMS with active follow-up-reminder consent.

Registered push subscription with new-portal-message consent.

Preferred channel without consent.

Consent pending.

Consent expired.

Consent revoked before scheduling.

Consent revoked after scheduling.

Consent revoked while a worker holds a lease.

Consent revoked after provider acceptance.

Consent superseded.

Contact unverified.

Contact changed after scheduling.

Contact disputed.

Wrong number.

Recycled-contact simulation.

Hard bounce.

Soft bounce.

Complaint.

Quiet hours.

Daylight-saving boundary.

Message expires during quiet hours.

Appointment rescheduled.

Appointment cancelled.

Follow-up closed.

Duplicate source event.

Duplicate worker.

Worker crash before provider call.

Worker crash after provider acceptance.

Provider timeout before acceptance.

Provider timeout after acceptance.

Provider rate limit.

Provider outage.

Recovery without message flood.

Valid webhook.

Invalid signature.

Expired timestamp.

Replay.

Duplicate event.

Reordered event.

Unknown event.

Wrong-tenant provider event.

Late delivered event after cancellation.

Reconciliation confirms sent.

Reconciliation confirms not sent.

Reconciliation remains unresolved.

Template with forbidden placeholder.

Template-injection attempt.

Missing approved translation.

Generic email, SMS, and push payload.

External reply containing an opt-out command.

External free-text reply containing a leakage marker.

Authorized secure portal thread.

Wrong-patient thread access.

Cross-pharmacy thread access.

Cross-tenant thread access.

Revoked delegate.

Thread consent withdrawn.

Thread expired.

Messaging marked unsuitable by pharmacist.

Duplicate secure-message submission.

Stored-XSS message.

Oversized message.

Unsafe attachment denial.

Administrative queue route.

Pharmacist-review queue route.

Ambiguous protected queue route.

Response-time breach without AI classification.

Task 04 unavailable.

Task 05 unavailable.

Task 06 integration unavailable.

Task 11 release gate blocked.

Unknown state.

Required interfaces

Build:

Synthetic patient communication-preference page.

Synthetic contact-verification flow.

Synthetic channel- and purpose-specific consent flow.

Synthetic consent revocation flow.

Synthetic quiet-hours, timezone, language, and accessibility controls.

Synthetic secure-message inbox and thread.

Synthetic pharmacist-review queue.

Synthetic administrative queue.

Synthetic safe outbox status view for authorized staff.

Synthetic reconciliation work-item view.

Synthetic opt-out, wrong-recipient, bounce, outage, expired, denied, unavailable, and unknown states.

All controls must use server-owned authorization and state transitions.

Evidence

Capture:

375px patient preference and consent flow.

375px secure-message flow.

375px pharmacist queue.

Desktop patient and pharmacist flows.

Keyboard walkthrough.

Screen-reader semantic inspection.

200% and 400% zoom and reflow.

Reduced motion.

Long translated labels and Bangla script.

Quiet-hours and timezone state.

Consent withdrawal.

Wrong-recipient work item.

Provider outage and reconciliation.

Secure-message unsuitable and expired states.

56px frequent-action targets.

Evidence must contain only synthetic information and use generic filenames.

Deliverables

Synthetic communication implementation.

Deterministic fixtures and provider adapter.

docs/task-07/accessibility-and-responsive-evidence.md

Mobile and desktop evidence in the repository’s established evidence location.

Required tests

Use the repository’s existing test tooling.

Consent, contact, and preference tests

Cover:

Channel-specific consent.

Purpose-specific consent.

Custodian and contact-version scope.

Effective time and expiry.

Revocation and supersession.

Authorized-agent capture.

Expired or revoked delegate.

Contact verification success, failure, rate limit, replay, and expiry.

Contact change and old-destination suppression.

Shared-contact warning.

Preference without consent.

Language without approved template.

Quiet hours.

Timezone change.

Daylight-saving transition.

Message expiry during quiet hours.

Concurrent consent withdrawal and dispatch.

Unknown consent state.

Outbox, scheduling, and race tests

Cover:

Transactional message creation.

Duplicate source event.

Logical idempotency uniqueness.

Two workers claiming concurrently.

Lease expiry.

Worker crash at every dispatch boundary.

Cancellation before claim, after claim, during send, and after acceptance.

Appointment reschedule and cancellation.

Follow-up closure.

Source-event version change.

Retryable and final failure.

Exponential backoff and retry cap.

Unknown provider outcome.

Reconciliation before retry.

Delayed delivery.

Late webhook after cancellation.

Stale status regression.

Expiry and obsolete-message suppression.

Prove that retries cannot create a second logical message or unsafe provider duplicate.

Template and leakage tests

Statically and dynamically scan:

Template source.

Rendered email subject, preheader, body, and headers.

Rendered SMS.

Rendered push title, body, metadata, and deep link.

Provider tags and custom metadata.

Calendar fixtures.

URLs and query strings.

Logs, traces, analytics, metrics labels, breadcrumbs, alerts, and support events.

Browser storage, history, titles, and referrers.

Screenshots and evidence filenames.

Fail if any contains:

Ailment, symptom, diagnosis, medication, allergy, lab, red flag, referral, assessment, claim, health number, appointment purpose, or secure-message excerpt.

Patient, clinician, pharmacist, pharmacy, participant, appointment, follow-up, assessment, visit, or thread identifier.

Contact value.

Reusable token, magic link, verification code, push token, provider secret, or webhook secret.

Synthetic PHI leakage marker.

Provider and webhook tests

Cover:

Valid signature.

Invalid signature.

Expired timestamp.

Replay.

Duplicate event.

Reordered event.

Unknown event.

Malformed or oversized body.

Wrong provider account.

Wrong tenant.

Wrong logical message.

Provider timeout before and after acceptance.

Rate limit.

Outage.

Safe recovery.

Cancellation.

Hard bounce.

Wrong number.

Complaint.

Safe status lookup.

Reconciliation outcomes.

Idempotency.

No provider event may directly change clinical, assessment, appointment, follow-up, virtual-visit, or claim completion.

Secure-messaging authorization tests

Prove:

Unauthenticated access is denied.

Expired or revoked session is denied.

Wrong patient, subject, pharmacy, tenant, appointment, follow-up, visit, assessment, or thread is denied.

Patient and pharmacist boundaries cannot be swapped.

Client-supplied role, actor, subject, participant, tenant, or assignment is ignored or denied.

Expired or revoked delegate is denied.

Every read and write rechecks authorization.

Participant or assignment changes take effect immediately.

Consent withdrawal pauses or closes access according to approved policy.

Unknown roles and states fail closed.

Protected responses are not shared-cacheable.

Secure-message content and queue tests

Cover:

Authorized send.

Duplicate submission.

Idempotency.

Bounded input.

Sanitization.

Stored XSS.

Unsafe link and remote-content handling.

Unsafe attachment denial.

Immutable correction or supersession.

Administrative routing.

Pharmacist-review routing.

Ambiguous protected routing.

No AI urgency classification.

Response-expectation display.

Response-time breach.

Pharmacist marks messaging unsuitable.

Pharmacist closes thread.

Patient withdraws.

Thread expiry and reopening rules.

Message body absent from logs and audit.

Queue metadata contains no message body.

External notification contains no PHI.

Message, delivery, acknowledgement, or closure cannot complete an assessment, visit, follow-up, or claim.

Opt-out and failure-flow tests

Cover:

Portal opt-out.

Approved provider opt-out command.

Wrong-number report.

Hard bounce.

Complaint.

Contact dispute.

Suppression precedence.

Cancellation of pending messages.

Already-accepted message caveat.

No automatic unsuppression.

No automatic alternate channel.

Body-free work item.

External PHI reply isolation.

Provider support artifacts contain no patient or clinical details.

Unknown failure reason fails closed.

Privacy and security tests

Fail if:

PHI or personal information appears in URLs, titles, browser storage, caches, referrers, analytics, logs, traces, alerts, or evidence.

Secure-message content appears in logs, audit, metrics, queue metadata, or provider payloads.

Contact values, verification codes, push tokens, provider credentials, or webhook secrets appear in logs.

A generic external portal link grants authority.

Provider link tracking, open pixels, profiling, advertising, or unrelated analytics are enabled.

Session replay loads on protected routes.

A protected route permits shared caching.

A production configuration can use the synthetic adapter.

A live provider can activate without all required gates.

Accessibility and responsive tests

Cover:

Contact verification.

Consent capture and withdrawal.

Preference and quiet-hours controls.

Appointment and follow-up notice explanations.

Secure inbox and thread.

Pharmacist and administrative queues.

Failure, wrong-recipient, outage, reconciliation, denied, expired, and unknown states.

375px and desktop.

Keyboard traversal.

Screen-reader semantics and live announcements.

Visible focus.

56px frequent-action targets.

200% and 400% zoom.

Reflow.

Reduced motion.

Long translated labels.

Bangla-script rendering.

Status independent of colour.

Clinical, privacy, accessibility, and operational validation plan

Use only synthetic cases and obtain review from practising Ontario pharmacists plus privacy, security, accessibility, and operations owners before production.

Validate:

Whether each external message is useful despite containing no clinical detail.

Whether appointment and follow-up reminders avoid revealing a health relationship unnecessarily.

Whether consent choices are specific and understandable.

Whether contact verification is clearly distinguished from patient identity.

Whether revocation is easy and takes effect safely.

Whether quiet hours and timezone behavior match patient expectations.

Whether shared or recycled contacts are handled safely.

Whether response expectations are honest and operationally achievable.

Whether pharmacists can find and own review work efficiently.

Whether administrative staff see only minimum-necessary data.

Whether ambiguous replies reach an authorized human without AI triage.

Whether secure messaging supports professional judgment without implying continuous monitoring.

Whether a pharmacist can mark messaging unsuitable.

Whether failure, bounce, wrong-recipient, and outage workflows are usable.

Whether reconciliation prevents duplicates.

Whether relevant secure communications enter the approved clinical-record workflow.

Whether the system works under realistic pharmacy workload and mobile conditions.

Whether frequent actions are usable one-handed where applicable.

Deliverable

docs/task-07/privacy-accessibility-security-and-operational-validation-plan.md

Mandatory stop conditions

Stop the affected workstream and report the blocker if:

AGENTS.md conflicts with the requested operation.

Task 01’s synthetic environment is missing or unsafe.

Task 04’s authoritative appointment, follow-up, retention, or destruction boundary would be bypassed.

Task 05 does not separate patient, subject, delegate, pharmacist, administrator, support, tenant, and session boundaries.

Task 06 professional secure-messaging controls would be weakened or bypassed.

Task 11’s protected-route or release gate is missing or bypassed.

Real PHI, personal contact data, live recipients, or live provider credentials appear.

A production schema migration or authentication change lacks approval.

A live network call, sending domain, telephone sender, push certificate, webhook, or vendor account is required.

Contact possession would be treated as patient identity.

Contact verification, consent, preference, and authorization cannot remain distinct.

Consent scope, wording, expiry, withdrawal, or authorized-agent policy would need to be invented.

A revoked, expired, superseded, disputed, or unknown consent state can send.

Contact change cannot invalidate or safely re-evaluate pending messages.

A retry or uncertain provider outcome can create an unsafe duplicate.

A vendor cannot support safe idempotency, reconciliation, or an approved alternative.

A vendor requires message content in logs, advertising, unrelated analytics, profiling, or AI training.

A vendor’s contract, data flow, residency, support access, subprocessors, retention, deletion, or incident terms cannot be verified.

PHI, contact values, tokens, message bodies, appointment purpose, medication, ailment, or health numbers enter an unsecured channel, calendar, URL, provider metadata, log, analytic, trace, support ticket, browser store, referrer, or evidence file.

External replies containing PHI cannot be isolated safely.

An external reply must be routed through AI urgency classification.

A patient can access another patient’s thread.

A patient can act as pharmacist or a pharmacist can act as patient.

A delegate can access a thread after expiry or revocation.

Secure-message content must enter audit logs, application logs, or general queue metadata.

A delivery, read, acknowledgement, provider, patient, timeout, or thread event can complete an assessment, follow-up, visit, or claim.

A pharmacist suitability decision would be automated.

Attachment safety and retention controls are absent.

Response-time wording would create an unattended emergency-inbox promise.

An inaccessible opt-out, consent, fallback, or secure-message path would be required.

Cross-jurisdictional delivery or data processing would need to be enabled without review.

The synthetic implementation could operate in production.

Existing privacy, audit, tenant, identity, retention, assessment, billing, or finalization controls would need to be weakened.

Continue independent synthetic work when only production provider integration, policy approval, contract review, or live delivery is blocked.

Deliverables

Current-state and gap analysis.

Communications standards and policy mapping.

Production dependency register.

Communications threat model.

Trust-boundary and data-flow diagrams.

Consent, contact, preference, and suppression model.

Communication contracts and schema proposal.

Orthogonal outbox and delivery state machine.

Minimal-payload template catalogue.

Synthetic provider-adapter contract and implementation.

Webhook security and reconciliation design.

Vendor assessment scorecard.

Secure portal messaging contract and prototype.

Reply and review queue design.

Secure-message authorization matrix.

Appointment, follow-up, and Task 06 integration boundary.

Privacy, security, and retention plan.

Audit-event catalogue.

Logging and leakage controls.

Accessibility, language, and responsive design.

Retry, opt-out, outage, and reconciliation runbook.

Communications incident-response plan.

Deterministic synthetic fixtures.

Security, authorization, privacy, leakage, state-transition, race, and accessibility tests.

Mobile and desktop evidence.

Clinical, privacy, accessibility, and operational validation plan.

Production integration handoff.

Updated task status and repository documentation.

Synthetic prototype acceptance criteria

The synthetic prototype is complete only when:

Consent, contact verification, channel preference, patient identity, and authorization remain separate.

Consent is scoped to contact-point version, channel, purpose, custodian, and time.

Revoked, expired, superseded, disputed, or unknown consent blocks dispatch.

Unverified, changed, disputed, or suppressed contact blocks dispatch.

Consent and contact are rechecked immediately before send.

Quiet hours, timezone, expiry, and source-event state are enforced at dispatch.

Retries, crashes, duplicate workers, duplicate source events, and webhooks cannot create unsafe duplicate messages.

Unknown provider outcomes enter reconciliation before retry.

Late or reordered provider events cannot reverse authoritative state.

Unsecured templates contain no ailment, symptom, medication, allergy, appointment purpose, health number, message excerpt, clinical result, patient identifier, or bearer token.

Provider metadata contains no internal patient, appointment, follow-up, assessment, visit, or thread identifier.

External links are generic and grant no authority.

Wrong-recipient, wrong-number, bounce, complaint, and vendor-failure events create safe, body-free work items.

Opt-out takes effect safely and cannot be undone automatically.

Failure on one channel does not authorize another.

Secure threads are server-authorized on every read and write.

Patient, subject, delegate, pharmacist, administrator, participant, and tenant remain distinct.

Cross-patient and cross-pharmacy thread access is denied.

Message bodies are encrypted and absent from logs, audit, metrics, analytics, traces, and queue metadata.

External free-text replies are not classified by AI and cannot leak into ordinary tooling.

The patient sees truthful response expectations and an approved urgent alternative.

Only an authorized pharmacist can mark professional messaging suitable or unsuitable where required.

No message, delivery, read, acknowledgement, provider webhook, thread closure, disconnect, or timeout completes an assessment, follow-up, visit, or claim.

Delivery status is never presented as proof that the intended person read or understood the message.

Attachments remain blocked unless the approved boundary is proven.

The experience works at 375px and desktop.

Keyboard, screen-reader, zoom, reflow, reduced-motion, long-label, Bangla-script, and 56px-target requirements pass.

Fixtures and evidence contain only deterministic synthetic data.

Synthetic adapters fail hard outside the synthetic environment.

Production providers, recipients, communications, PHI, schema changes, authentication changes, and claim effects remain disabled.

A prototype PASS does not approve a production vendor, consent policy, message cadence, template, data flow, secure-messaging service, retention policy, live patient workflow, or external delivery.

Production gates

Real delivery remains blocked until all applicable items are approved or verified:

Communication policy and purpose/channel matrix.

Consent wording, scope, expiry, withdrawal, and authorized-agent policy.

Contact-verification and contact-change policy.

Quiet-hours, timezone, cadence, usefulness-expiry, and escalation policy.

Human-reviewed templates, subjects, sender names, translations, and opt-out language.

Pharmacist professional review.

Privacy review.

Security review and threat/risk assessment.

Accessibility review.

Legal and applicable electronic-message/telecommunications review.

Vendor selection and technical due diligence.

Contract, data-processing, confidentiality, incident, audit, retention, deletion, and exit terms.

Subprocessor and support-access review.

Residency and cross-border data-flow evidence.

PIA approval.

TRA approval.

Incident and wrong-recipient runbook approval.

Operations staffing and response-time commitment.

Task 04 integration verification.

Task 05 identity and delegate verification.

Task 06 secure-messaging integration verification where applicable.

Task 11 production release approval.

Production schema migration approval.

Production secrets and key-management approval.

Sender, domain, telephone, and push configuration approval.

Staged non-PHI integration test.

Explicit go-live authorization.

Final report format

End the task with:

Task 07 synthetic prototype status: PASS | BLOCKED | FAIL

Task 01 synthetic environment: READY | BLOCKEDTask 04 appointment/follow-up integration: PASSED | BLOCKED | NOT VERIFIEDTask 05 identity integration: PASSED | BLOCKED | NOT VERIFIEDTask 06 secure-messaging integration: PASSED | BLOCKED | NOT VERIFIED | NOT APPLICABLETask 11 security/release gate: PASSED | BLOCKED | NOT VERIFIEDCurrent-state assessment: PASS | BLOCKED | FAILStandards and policy mapping: PASS | BLOCKED | FAILCommunications threat model: PASS | FAILConsent model: PASS | BLOCKED | FAILContact verification model: PASS | BLOCKED | FAILPreference and quiet-hours model: PASS | BLOCKED | FAILSuppression and opt-out: PASS | FAILOutbox idempotency: PASS | FAILDispatch race handling: PASS | FAILProvider uncertainty and reconciliation: PASS | FAILMinimal-payload templates: PASS | BLOCKED | FAILPHI leakage tests: PASS | FAILWebhook security: PASS | FAILWrong-recipient workflow: PASS | FAILVendor-outage workflow: PASS | FAILSecure-thread authorization: PASS | FAILSecure-message content controls: PASS | FAILAdministrative queue: PASS | FAILPharmacist-review queue: PASS | FAILAI urgency classification: DISABLED | FAILAssessment boundary: PASS | FAILClaim boundary: PASS | FAILAudit mapping: PASS | FAILRetention mapping: PASS | BLOCKED | FAILAccessibility evidence: PASS | FAILLanguage evidence: PASS | FAIL375px and desktop evidence: PASS | FAILKeyboard and screen-reader evidence: PASS | FAIL200% and 400% zoom/reflow: PASS | FAIL56px frequent-action targets: PASS | FAILAutomated tests: PASS | FAILCommunication policy: APPROVED | BLOCKED | NOT VERIFIEDTemplate review: APPROVED | BLOCKED | NOT VERIFIEDProfessional review: APPROVED | BLOCKED | NOT VERIFIEDPrivacy review: APPROVED | BLOCKED | NOT VERIFIEDSecurity review: APPROVED | BLOCKED | NOT VERIFIEDAccessibility review: APPROVED | BLOCKED | NOT VERIFIEDVendor selected: NONE | NAME | BLOCKEDVendor review: PASSED | BLOCKED | NOT VERIFIEDContract review: APPROVED | BLOCKED | NOT VERIFIEDCanadian-residency evidence: VERIFIED | BLOCKED | NOT VERIFIED | NOT APPLICABLECross-border data-flow review: APPROVED | BLOCKED | NOT VERIFIEDPIA approval: APPROVED | BLOCKED | NOT VERIFIEDTRA approval: APPROVED | BLOCKED | NOT VERIFIEDOperations response-time approval: APPROVED | BLOCKED | NOT VERIFIEDReal PHI used: NOReal contact data used: NOProduction schema changed: NOProduction authentication changed: NOProduction vendor connected: NOExternal messages sent: NOMarketing enabled: NOAI urgency decisions enabled: NOAttachments enabled: NOAssessments completed by communications: NOClaims created or submitted: NO

Blocking issues:Unresolved policy decisions:Unresolved professional decisions:Unresolved privacy/legal decisions:Unresolved security decisions:Unresolved accessibility decisions:Unresolved vendor and contract decisions:Deferred production work:Evidence locations:Files changed:Tests run and results:Recommended next action:

Never report production readiness while consent policy, contact verification, template review, professional review, privacy, security, accessibility, vendor due diligence, contract terms, data flows, residency, PIA, TRA, operations coverage, or Task 11 release approval remains unresolved.

If the synthetic prototype passes while production dependencies remain blocked, report:

Task 07 synthetic prototype: PASS — real recipients, live providers, PHI-bearing production messaging, production reminders, and clinical or claim effects remain gated.