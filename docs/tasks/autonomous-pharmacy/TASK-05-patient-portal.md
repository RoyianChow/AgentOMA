# Task 05 — Complete the Patient Identity and Portal Synthetic Prototype

## Sprint checkpoint — 2026-08-19

**Repository state:** no separate patient identity/session domain or patient
portal is merged; an unmerged local design branch exists.
**Sprint slice:** reconcile that branch, then continue discovery and
threat-model work only—identity separation,
proofing/recovery, delegation, finalized-record read models, and PHI boundary
contracts.
**Exit:** every unknown policy remains `BLOCKED`; pharmacist cookies, roles,
invitations, sessions, and TOTP are never reused. No patient runtime is
authorized by this checkpoint. See
[`NEXT-SPRINT-PLAN-2026-08-19.md`](NEXT-SPRINT-PLAN-2026-08-19.md).

## Role

Act as a senior identity, security, privacy, and full-stack engineer with experience in healthcare portals, OIDC/OAuth, session security, delegated authorization, PostgreSQL, accessibility, and privacy-by-design.

Your responsibility is to design and verify AgentRx’s patient identity boundary and build a deterministic synthetic patient-portal prototype. Do not activate production authentication, change the production schema, or connect real patient records until the required privacy and security approvals are complete.

## Objective

Provide secure patient access to authorized:

* Finalized health records.
* Appointments.
* Finalized follow-up plans.
* Consent history.
* Communication preferences.
* Record exports.
* Access requests.
* Correction requests and correction overlays.
* Delegated caregiver or substitute decision-maker access.
* Account, session, and device history.

The patient portal must remain cryptographically and logically separated from the pharmacist identity, session, role, invitation, and TOTP administration boundary.

## Current status

This task is limited to design, contracts, tests, and a synthetic prototype until the identity-proofing, recovery, delegated-access, retention, PIA, TRA, and privacy models receive approval.

### Authorized now

* Inspect the repository and existing identity architecture.
* Review the supplied AgentRx research report.
* Produce threat models, data-flow diagrams, decision records, state machines, and authorization matrices.
* Build an obviously synthetic patient portal.
* Use deterministic, server-owned patient, caregiver, session, consent, request, and record fixtures.
* Model separate synthetic patient and pharmacist session validators.
* Prototype read-only finalized-record views.
* Prototype access and correction request workflows without changing real records.
* Prototype delegated access using synthetic grants.
* Define server-only production contracts without connecting them.
* Add security, authorization, privacy-boundary, accessibility, and failure-state tests.
* Document production migrations and authentication changes that will eventually be required.

### Not authorized now

* Changing production authentication or identity-provider configuration.
* Applying a production database migration.
* Connecting real patient, appointment, assessment, consent, or pharmacy data.
* Processing real PHI or identity-proofing evidence.
* Enabling public self-registration.
* Activating a production access, correction, preference, export, recovery, or delegation mutation.
* Reusing pharmacist cookies, roles, sessions, invitations, TOTP configuration, or API tokens for patients.
* Treating an email address, telephone number, date of birth, health-card number, or security question as sufficient identity proof.
* Enabling external email, SMS, push, or breach notifications.
* Inventing legal authority, retention periods, access exceptions, correction outcomes, or consent requirements.

A synthetic prototype may pass independently. Production identity and PHI integration must remain blocked until every applicable gate passes.

## Required repository discovery

Before changing code:

1. Read every applicable `AGENTS.md` completely.
2. Inspect repository status and preserve unrelated user changes.
3. Locate the approved Task 01 synthetic environment.
4. Review Task 02’s complete-patient retrieval and finalized-record contracts.
5. Review Task 04’s appointment and delegated-booking boundary.
6. Review Task 07’s communication and notification boundary.
7. Review Task 11’s security, privacy, accessibility, abuse, and release gates.
8. Read the supplied deep-research report and treat it as background—not legal approval.
9. Inspect existing:

   * Authentication and session architecture.
   * Identity-provider configuration.
   * Patient, pharmacist, tenant, and pharmacy models.
   * Role and permission definitions.
   * Invitation, MFA, and TOTP flows.
   * Record finalization, correction, and supersession models.
   * Export manifests and artifact-storage controls.
   * Consent and communication-preference models.
   * Audit tables and application logging.
   * Analytics and error-monitoring behavior.
   * Server/client rendering boundaries.
   * Database and migration conventions.
   * Test and evidence conventions.
10. Determine whether any proposed production change requires explicit migration, security, privacy, or release approval.

Follow existing repository conventions. Do not introduce a new identity provider, authentication library, state framework, database abstraction, or component system without documenting why the existing approach cannot satisfy the requirements.

## Non-negotiable invariants

The design and prototype must preserve all of the following:

* The authenticated principal is always the actor, not automatically the patient whose records are being viewed.
* Actor identity and record-subject identity remain distinct.
* Patient and pharmacist security domains do not accept each other’s cookies, sessions, tokens, CSRF credentials, roles, or MFA state.
* Authentication alone does not grant access to a patient record.
* Every protected server request verifies:

  * Session validity.
  * Session audience and actor type.
  * Required assurance level.
  * Account status.
  * Patient-record relationship.
  * Custodian or pharmacy scope.
  * Delegation status and scope when applicable.
  * Resource state and authorization.
* Every export is authorized both when created and when downloaded.
* Revoked sessions and delegation grants stop working server-side immediately.
* A caregiver never becomes or impersonates the patient.
* Caregiver access is explicit, scoped, attributable, expiring, revocable, and audited.
* No caregiver or SDM authority is created through self-attestation.
* No health-card number is used as a password, recovery secret, public lookup value, or sole identity-proofing factor.
* Finalized clinical and billing records remain immutable.
* Corrections create requests, overlays, or superseding records; they never silently rewrite source records.
* Only finalized and authorized records appear in the patient portal.
* A portal record must not imply that every piece of custodian-held information is legally releasable.
* No complete patient record is placed in client state, client props, browser storage, service-worker caches, analytics, telemetry, URLs, or console output.
* Only fields actually required for the rendered page may reach the browser.
* Displaying an appointment or follow-up plan does not allow the patient to edit a pharmacist’s clinical or billing record.
* Consent history is append-only or superseding; past consent events are never rewritten.
* Communication preferences are not treated as identity proof, clinical consent, or a legal basis for disclosure.
* Audit records contain opaque references and safe metadata, not clinical contents, tokens, recovery answers, or exported files.
* Failed or unavailable data is never represented as an empty record set.
* The synthetic identity provider and fixtures must fail closed if a production environment attempts to enable them.

## Authority boundary

Do not:

* Create, change, or infer diagnosis, treatment, prescribing, triage, urgency, billing, claim, or reimbursement logic.
* Add a patient-facing editing path for finalized clinical or billing records.
* Accept `patientId`, `subjectId`, `caregiverId`, `grantId`, `pharmacyId`, `tenantId`, role, assurance level, or authorization outcome from untrusted client input.
* Derive access from an email address, telephone number, date of birth, address, family name, or knowledge of appointment details.
* Use a management link issued to one actor as authority for another actor.
* Allow caregivers to create sub-delegations.
* Allow a delegate to change identity factors, recover the patient’s account, create another delegate, or alter consent unless a separately approved authority model explicitly permits it.
* Use pharmacist “impersonation” as a substitute for patient identity.
* Create a universal support or administrative bypass.
* Expose whether an unrelated account, patient, record, appointment, or delegation exists.
* Include PHI or personal information in identifiers, filenames, query strings, referrers, analytics, logs, or correlation identifiers.
* Generate exports in the browser.
* Store access tokens in `localStorage` or `sessionStorage`.
* Trust a long-lived self-contained token as the only source of revocation state.
* Invent production identity-proofing, recovery, delegation, retention, breach-notification, or access-decision policies.
* Treat the synthetic prototype as evidence that production identity is approved.

If the current application requires any of these actions, document the conflict and stop that affected workstream.

## Execution order

Work in this order:

1. Complete repository and architecture discovery.
2. Produce a current-state and gap assessment.
3. Review current official Ontario patient-portal, digital-identity, privacy, access, and correction guidance.
4. Draw identity, data-flow, and trust-boundary diagrams.
5. Produce the identity threat model.
6. Define patient/pharmacist cryptographic and logical separation.
7. Define identity assurance, enrollment, account lifecycle, and recovery.
8. Define patient-record linking and server authorization.
9. Define caregiver and SDM delegation.
10. Define finalized-record, export, correction, consent, and preference contracts.
11. Define audit, suspicious-access, and incident-response behavior.
12. Define deterministic synthetic fixtures and failure states.
13. Implement the responsive synthetic portal.
14. Add architecture, security, authorization, privacy, accessibility, and route tests.
15. Capture mobile and desktop evidence.
16. Document production gates, unresolved policy decisions, and required migrations.

Continue safe synthetic work when only production implementation is blocked.

# Workstream A — Current-state and standards assessment

## Repository assessment

Document:

* Existing authentication providers and libraries.
* Existing patient and pharmacist account models.
* Token issuers, audiences, signing keys, encryption keys, session stores, cookie names, and cookie scopes.
* Existing MFA, invitation, account-recovery, and revocation behavior.
* Existing tenant, pharmacy, and patient-record relationship enforcement.
* Existing server-side authorization helpers.
* Existing record finalization and supersession behavior.
* Existing export implementation.
* Existing consent, preference, access-request, and correction-request models.
* Existing audit and incident-response behavior.
* Existing PHI exposure risks.
* Existing test coverage.
* Any architectural conflict with this task.

Do not print secrets, tokens, credentials, full environment variables, or real records during discovery.

## Ontario standards mapping

Use current first-party sources from Ontario Health, the Ontario government, the Information and Privacy Commissioner of Ontario, and other directly applicable authorities.

For every relevant source, record:

* Source title.
* Publishing authority.
* URL.
* Publication or revision date, if available.
* Date accessed.
* Applicable requirement or recommendation.
* Current repository evidence.
* Gap.
* Required action.
* Owner or future task.
* Whether the item blocks production or a pilot.

Cover at minimum:

* Patient identity and assurance.
* Portal authentication and recovery.
* PHIPA access and correction workflows.
* Consent and delegated authority.
* Auditability and breach response.
* Accessibility.
* Data minimization and retention.
* Patient access to finalized records.
* Export and secure-download expectations.

Do not describe this mapping as legal approval. Escalate ambiguous legal or privacy interpretations rather than silently deciding them.

## Deliverables

* `docs/task-05/current-state-and-gap-analysis.md`
* `docs/task-05/ontario-standards-mapping.md`

Use the repository’s established documentation location if different and report the final paths.

# Workstream B — Identity threat model and trust boundaries

Create a threat model covering the complete patient-portal lifecycle.

## Required actors

At minimum, model:

* Patient acting for themselves.
* Verified caregiver or delegate.
* Verified substitute decision-maker where legally applicable.
* Pharmacist.
* Pharmacy administrator.
* Technical support staff.
* Identity provider.
* Patient-portal server.
* Pharmacist application.
* Task 02 record service.
* Task 04 booking service.
* Export worker and object storage.
* Audit service.
* Malicious unauthenticated user.
* Malicious or compromised authenticated user.
* Compromised browser or device.
* Insider with excessive access.

Do not invent new production roles. Map these conceptual actors to existing roles or identify an approval blocker.

## Required assets

Include:

* Patient identity and record bindings.
* Authentication factors and passkeys.
* Sessions and refresh credentials.
* Recovery credentials.
* Delegation grants.
* Finalized records.
* Appointments and follow-up plans.
* Consent and communication preferences.
* Access and correction requests.
* Export files and manifests.
* Audit records.
* Security and device history.
* Identity-proofing evidence.

## Required threats

Assess at minimum:

* Account enumeration.
* Credential stuffing and password spraying.
* Phishing and factor interception.
* Session fixation, theft, replay, and confusion.
* Patient-token acceptance by pharmacist routes.
* Pharmacist-token acceptance by patient routes.
* OIDC issuer, audience, client, nonce, state, PKCE, or redirect confusion.
* Cross-patient and cross-pharmacy BOLA/IDOR.
* Client-supplied subject or tenant substitution.
* Recovery-based account takeover.
* SIM-swap or compromised-email recovery.
* Weak knowledge-based proofing.
* Delegation forgery, scope escalation, replay, or sub-delegation.
* Access after delegation expiry or revocation.
* Race conditions between revocation and record/export access.
* Consent-history rewriting.
* Correction requests that overwrite source records.
* Export leakage through URLs, caches, filenames, or object storage.
* Referrer, analytics, client-state, and logging leakage.
* Browser, CDN, service-worker, and back-forward cache leakage.
* Insider misuse and support-account overreach.
* Audit deletion or tampering.
* Suspicious-access false positives and denial-of-service abuse.
* Rate-limit bypass.
* XSS, CSRF, clickjacking, open redirects, and unsafe content rendering.
* Malicious or unsupported uploaded evidence if future correction attachments are proposed.
* Compromised recovery or export links.
* Record supersession confusion that causes obsolete data to appear current.

For every threat, document:

* Threat scenario.
* Entry point.
* Affected asset.
* Preconditions.
* Likelihood and impact.
* Preventive controls.
* Detective controls.
* Response controls.
* Test evidence.
* Residual risk.
* Approval owner.

## Deliverables

* `docs/task-05/identity-threat-model.md`
* `docs/task-05/trust-boundaries-and-data-flows.md`

# Workstream C — Patient and pharmacist identity separation

Define a security architecture in which a patient session cannot become a pharmacist session and a pharmacist session cannot become a patient session.

## Minimum separation requirements

The production design must use:

* Separate application registrations or clients.
* Separate token audiences.
* Separate application session namespaces.
* Separate cookie names.
* Separate session signing or encryption material.
* Separate CSRF state.
* Separate authorization policies.
* Explicit actor-type validation.
* Explicit route-level token validators.
* Independent logout and revocation behavior.
* No inheritance of pharmacist roles into the patient portal.
* No inheritance of patient-record access into the pharmacist application.

If the same underlying identity provider is proposed, it must still provide distinct client identifiers, audiences, redirect allowlists, validation policies, and application-session cryptographic material. Document residual risk associated with the shared provider.

The design should prefer host-only, `Secure`, `HttpOnly`, appropriately `SameSite` session cookies. Do not set a broad parent-domain cookie that can be consumed by both applications.

Bearer or refresh credentials must not be stored in browser storage.

## Dual-role individuals

If the same person is both a pharmacist and a patient:

* Treat the two identities or security contexts separately.
* Require an explicit transition into the other portal.
* Establish a new session for the new audience.
* Do not carry roles, assurance, selected subject, or authorization context across the transition.
* Audit both session contexts independently.
* Never use a “view as patient” shortcut from the pharmacist portal.

## Session lifecycle

Define:

* Session issuance.
* Rotation after authentication, recovery, and step-up.
* Idle and absolute expiry.
* Refresh behavior.
* Concurrent-session policy.
* Current-session identification.
* Individual-session revocation.
* Revoke-all behavior.
* Account suspension.
* Compromise response.
* Session termination after factor changes.
* Server-side revocation checks.
* Cache invalidation.
* Safe expired-session recovery.

Immediate revocation cannot depend only on waiting for a long-lived JWT to expire. Use a server-side session record, token version, introspection mechanism, or equivalent revocation source checked on protected operations.

## Deliverable

`docs/task-05/identity-and-session-separation.md`

# Workstream D — Identity proofing, account lifecycle, and recovery

## Identity proofing

Do not select or implement a production proofing method before approval. Produce an options analysis covering:

* In-person pharmacy-assisted proofing.
* An existing trusted patient identity.
* Verified digital identity providers.
* Invitation plus an independent proofing step.
* Manual exception handling.
* Accessibility and assisted-service requirements.

For each option, document:

* Assurance provided.
* Enrollment steps.
* False-match and false-rejection risks.
* Data collected.
* Proofing evidence retained.
* Recovery implications.
* Accessibility implications.
* Abuse risks.
* Required contracts or integrations.
* Privacy impact.
* Operational burden.
* Residual risk.

An invitation, email link, text message, date of birth, address, appointment detail, or health-card number alone is not sufficient proof.

If a health-card number is considered as a corroborating production attribute, it must remain inside an approved, server-side proofing workflow. It must never become an authenticator, public lookup key, URL value, log value, or recovery secret.

## Account lifecycle

Model at minimum:

* Enrollment initiated.
* Proofing pending.
* Proofing rejected or needs manual review.
* Active.
* Step-up required.
* Recovery restricted.
* Suspended.
* Suspected compromised.
* Recovered.
* Closed.

Do not turn conceptual states into a production schema before approval.

Document:

* Permitted transitions.
* Required actor.
* Evidence needed.
* Session effects.
* Factor effects.
* Delegation effects.
* Audit events.
* Safe user message.
* Invalid-transition behavior.

Closing a portal account must not delete or rewrite custodian-owned clinical records, audit history, or legally retained request records.

## Authentication factors

Evaluate current, accessible options such as passkeys and other approved MFA methods. Do not force a specific production factor until product, security, privacy, and accessibility review is complete.

Define assurance requirements for:

* Routine portal access.
* Viewing especially restricted content, if applicable.
* Creating or revoking delegation.
* Requesting an export.
* Downloading an export.
* Changing authentication factors.
* Account recovery.
* Changing communication preferences.
* Submitting access or correction requests.

If the required assurance level is undecided, record it as a blocking policy decision.

## Account recovery

Recovery must:

* Avoid revealing whether an account exists.
* Avoid security questions and health-information knowledge checks.
* Use one-time, short-lived, audience-bound recovery credentials.
* Store only hashed recovery tokens.
* Resist replay and concurrent completion.
* Revalidate the patient-record binding.
* Rotate the session after completion.
* Revoke prior sessions and refresh credentials.
* Record factor changes.
* Notify existing trusted channels only through a future approved communication workflow.
* Provide an accessible manual path for patients who lose all factors.
* Require stronger review for suspicious or high-risk recovery.
* Avoid disclosing PHI to support personnel.

If a post-recovery cooling-off period is proposed for delegation or exports, keep its duration configurable and mark it for approval.

## Device and session history

The portal may show:

* Current session.
* Coarse device or browser description.
* Session creation time.
* Last activity time.
* Authentication method or assurance indicator.
* Revocation status.

Do not claim exact device identity without evidence. Avoid covert fingerprinting and unnecessary location history. Full IP addresses, precise location, and unique tracking fingerprints require separate justification and approval.

## Deliverables

* `docs/task-05/identity-proofing-options.md`
* `docs/task-05/account-and-recovery-lifecycle.md`

# Workstream E — Patient, caregiver, and SDM authorization

Model authorization as a server decision over:

`actor + subject + custodian + resource + action + session assurance + relationship or grant + current policy`

None of these values may be trusted because the client supplied them.

## Patient access

A patient may access a record only when the server verifies:

* An active patient-portal session.
* Correct patient audience and actor type.
* An approved identity-to-subject binding.
* The requested record belongs to that subject.
* The record is within an authorized custodian context.
* The record is finalized.
* The record or requested field is authorized for portal disclosure.
* The account and session are not suspended or revoked.

Do not create an unapproved cross-custodian record aggregation feature. If a patient has relationships with multiple pharmacies, the server must return only approved contexts and must not accept a client-supplied tenant or pharmacy identifier as authority.

## Delegated access

A delegation grant must contain or reference:

* Opaque grant identifier.
* Verified actor.
* Verified subject.
* Custodian or pharmacy scope.
* Authority type.
* Permitted resource families.
* Permitted actions.
* Effective time.
* Expiry or mandatory review time.
* Current status.
* Creation and verification provenance.
* Revocation information.
* Policy version.
* Required assurance.
* Audit references.

Required states include:

* Proposed.
* Verification pending.
* Active.
* Declined.
* Expired.
* Revoked.
* Suspended.
* Superseded.

A production grant must not become active through caregiver self-attestation.

## Caregiver and SDM distinctions

Do not treat these as interchangeable:

* Informal caregiver.
* Authorized delegate.
* Parent or guardian.
* Attorney.
* Substitute decision-maker.
* Staff helper.

The legal basis and verification requirements for each must be approved. If current role definitions or Ontario authority requirements are ambiguous, build only synthetic variants and report production delegation as blocked.

## Delegation rules

Prove that:

* The actor and subject remain visible and distinct.
* Every delegated read and export identifies the grant used.
* Grant scope is evaluated on every request.
* Expiry and revocation are enforced server-side.
* Revocation invalidates outstanding export access where required.
* A grant for one subject cannot access another subject.
* A grant for one custodian cannot broaden into another custodian.
* A view-only grant cannot export.
* An appointment-only grant cannot read health records.
* A delegate cannot create another delegate.
* A delegate cannot recover or change the patient’s identity account.
* A revoked or expired grant cannot be restored by replaying an old link.
* Possession of a record or appointment identifier grants no authority.
* UI hiding is never treated as authorization.
* Delegated access is auditable to both actor and subject.

The portal must clearly display when the actor is viewing information on someone else’s behalf. Avoid ambiguous “switch user” or impersonation language.

## Authorization matrix

Create a matrix covering, at minimum:

* View finalized records.
* View correction overlays.
* Download records.
* View appointments.
* Request rescheduling or cancellation through Task 04.
* View finalized follow-up plans.
* View consent history.
* Change communication preferences.
* Submit an access request.
* Submit a correction request.
* View delegation history.
* Create, accept, revoke, or decline delegation.
* View and revoke sessions.
* Change factors.
* Recover an account.

For each action, show behavior for:

* Patient acting for themselves.
* Active caregiver with correct scope.
* Caregiver with insufficient scope.
* Expired grant.
* Revoked grant.
* Wrong subject.
* Wrong custodian.
* Suspended actor.
* Expired session.
* Unauthorized staff role.
* Unknown role or authority type.

Mark unresolved actions as `BLOCKED`, not implicitly allowed.

## Deliverables

* `docs/task-05/patient-caregiver-authorization-matrix.md`
* `docs/task-05/delegation-and-sdm-contract.md`

# Workstream F — Read-only portal and finalized records

Build a deterministic synthetic portal containing:

* Portal home.
* Finalized records.
* Record details.
* Appointments.
* Finalized follow-up plans.
* Consent history.
* Communication preferences.
* Access and correction requests.
* Delegation management.
* Account security.
* Session and device history.

## Record requirements

Every displayed record must include, where authorized:

* Record type.
* Finalized date and time.
* Custodian or source label.
* Finalization status.
* Correction or supersession status.
* Provenance.
* Export availability.
* Safe explanation if an action is unavailable.

Do not display:

* Draft records.
* In-progress pharmacist notes.
* Internal billing work.
* Internal audit notes.
* Excluded fields.
* Raw integration payloads.
* Unsupported attachments.
* Obsolete content as though it were current.
* A complete patient object when the page needs only a record projection.

When a record is corrected or superseded:

* Preserve the original.
* Clearly identify the current authoritative version.
* Show that an earlier version exists without presenting it as current.
* Display authorized correction overlays.
* Preserve provenance and timestamps.
* Avoid silently replacing historical content.

## Appointments and follow-up plans

Appointments must use Task 04’s administrative contract. Do not add clinical-detail fields or implement production rescheduling or cancellation from this task.

Follow-up plans must be:

* Finalized.
* Read-only.
* Clearly attributed.
* Displayed without adding new clinical interpretation.
* Hidden when the relationship or authorization is absent.

## Required portal states

Cover:

* Active patient with finalized records.
* No finalized records.
* Record superseded.
* Correction pending.
* Correction completed.
* Access request pending.
* Partial access request.
* Export available.
* Export expired.
* Export permission denied.
* Active caregiver.
* Caregiver with restricted scope.
* Expired delegation.
* Revoked delegation.
* Patient proofing pending.
* Recovery restricted.
* Account suspended.
* Session expired.
* Record source stale.
* Partial source failure.
* Complete portal failure.
* Unknown or unsupported status.
* Access denied.
* Task 02 unavailable.
* Task 04 unavailable.
* Consent history unavailable.
* Empty state distinct from failure.

Technical errors, internal identifiers, authorization rules, stack traces, and PHI must not appear in error messages.

# Workstream G — Access, correction, consent, and preferences

## Access requests

Model a patient-submitted request without automatically assuming every requested item is releasable.

Suggested conceptual states include:

* Submitted.
* Received.
* Under review.
* Clarification required.
* Partially completed.
* Completed.
* Denied.
* Withdrawn.

Do not hard-code statutory timelines, denial grounds, fees, or access exceptions until they are confirmed against current approved policy.

An access request must:

* Use the authenticated server context.
* Remain within the authorized subject and custodian relationship.
* Use structured request categories where possible.
* Bound and sanitize necessary free text.
* Avoid logging the request contents.
* Be idempotent.
* Provide a safe receipt.
* Never reveal excluded records through status or error text.

## Correction requests

A correction request must:

* Reference a finalized record through an opaque authorized resource identifier.
* Identify the requested correction without rewriting the source.
* Create a separate immutable request.
* Use bounded, sanitized input.
* Preserve the original record.
* Create an overlay or superseding record only through an approved staff workflow.
* Maintain a complete provenance chain.
* Show the patient whether the request is pending, completed, denied, or requires clarification.
* Avoid implying that submission guarantees acceptance.

Production correction attachments remain blocked until upload security, retention, malware handling, and privacy rules are approved.

## Consent history

Consent events must preserve:

* Consent or preference type.
* Scope and purpose.
* Policy or notice version.
* Actor and subject.
* Capture method.
* Effective time.
* Withdrawal or supersession time.
* Current status.
* Provenance.

Withdrawal must not erase prior history or audit evidence.

Do not treat every processing activity as consent-based if another approved legal authority applies. Clearly distinguish:

* Consent.
* Custodian-directed use.
* Delegated authority.
* Communication preference.
* Administrative acknowledgement.

## Communication preferences

Preferences may include approved channels, language, and accessible-format choices. They must not:

* Prove identity.
* Activate communications in this task.
* Override required clinical or legal notices.
* Be interpreted as consent to disclose PHI.
* Contain unrestricted clinical free text.

Any future notification effect belongs to Task 07 and must remain stubbed.

## Deliverables

* `docs/task-05/access-and-correction-workflows.md`
* `docs/task-05/consent-and-preference-model.md`

# Workstream H — Server/client boundary and exports

## Server/client data boundary

Use Server Components or the repository’s equivalent server-rendering mechanism for PHI-bearing portal content.

Client components may receive only minimum interaction values, such as:

* Non-PHI tab identifiers.
* Allowlisted filter or sort identifiers.
* Current UI selection.
* Boolean UI state.
* Safe pagination controls.
* Opaque action references that do not grant authority.

Do not pass the following into a client component:

* Complete patient object.
* Complete record object.
* Medication list.
* Allergy list.
* Clinical narrative.
* Health-card number.
* Address.
* Contact information.
* Delegation evidence.
* Consent evidence.
* Proofing evidence.
* Access or correction request body.
* Export contents.
* Server authorization context.
* Raw audit event.
* Hidden fields not displayed by the page.

Only PHI fields visibly required by the page may reach the final server-rendered response. Undisplayed fields must not appear in client props, hydration data, React Flight payloads, prefetched routes, browser caches, or debug output.

Do not place PHI in:

* URLs or query strings.
* `localStorage` or `sessionStorage`.
* Client caches.
* Service-worker caches.
* Analytics or telemetry.
* Error breadcrumbs.
* Console output.
* Referrer headers.
* DOM attributes.
* HTML comments.
* Test snapshots.
* Screenshots or evidence filenames.

Use no-store and private caching controls appropriate to the architecture. Prevent shared CDN caching and protected-route prefetching where it would expose unnecessary data.

## Production server contracts

Document server-only contracts for:

* Patient portal principal.
* Identity-to-subject binding.
* Custodian relationship.
* Delegation grant.
* Authorization decision.
* Finalized record projection.
* Record supersession and correction overlay.
* Appointment projection.
* Follow-up projection.
* Consent-history entry.
* Communication preference.
* Access request.
* Correction request.
* Export authorization.
* Session and device-history projection.
* Audit event.

For every field, document:

* Meaning.
* Data type.
* Nullable behavior.
* Whether it contains PHI or personal information.
* Source of truth.
* Trust boundary.
* Server-only or client-safe status.
* Staleness behavior.
* Authorization requirement.
* Retention owner.

Do not connect these contracts to production Task 02 data before approval.

## Export lifecycle

Model:

* Requested.
* Generating.
* Ready.
* Downloaded.
* Failed.
* Expired.
* Revoked.

A production export must:

1. Reverify session, assurance, subject, custodian, scope, record relationship, and grant at request time.
2. Generate server-side.
3. Include only authorized finalized records.
4. Include correction and supersession provenance.
5. Reverify authorization at download time.
6. Use a short-lived, unguessable, session- or actor-bound reference.
7. Store only hashed capability values where applicable.
8. Expire and remove temporary artifacts according to approved policy.
9. Use a generic filename without patient information.
10. Prevent shared caching.
11. Record request, generation, download, failure, expiry, and denial events.
12. Invalidate access after relevant session or grant revocation.

Do not put export files in public object storage or rely solely on a reusable presigned URL. Reuse Task 02’s approved export manifest and hashing design rather than creating a competing mechanism.

## Deliverable

`docs/task-05/server-data-export-and-client-boundary.md`

# Workstream I — Audit, suspicious access, and incident response

## Audit catalogue

Define append-only events for:

* Enrollment and proofing status changes.
* Authentication success and failure.
* Session creation, rotation, expiry, and revocation.
* Factor enrollment, removal, and change.
* Recovery request, failure, completion, and replay.
* Record view allowed or denied.
* Appointment or follow-up view.
* Export requested, generated, downloaded, expired, revoked, failed, or denied.
* Delegation proposed, verified, activated, used, expired, revoked, suspended, or denied.
* Consent captured, withdrawn, or superseded.
* Communication preference changed.
* Access request submitted or transitioned.
* Correction request submitted or transitioned.
* Correction overlay or superseding record created.
* Suspicious access detected or resolved.
* Account suspended, compromised, recovered, or closed.
* Cross-patient, cross-custodian, and audience-mismatch denial.
* Administrative support action.

Every event should contain only:

* Event identifier.
* Event type and schema version.
* Occurrence time.
* Opaque actor and subject references.
* Opaque custodian or pharmacy scope.
* Opaque resource reference.
* Session or assurance reference where needed.
* Action.
* Outcome.
* Safe reason code.
* Authorization policy version.
* Correlation identifier.
* Source service.

Never include passwords, tokens, recovery answers, health-card numbers, clinical text, contact details, exports, or proofing-document contents.

Application logs are not a substitute for audit records.

## Suspicious-access response

Model synthetic responses to:

* Repeated failed authentication.
* Token replay.
* Audience mismatch.
* Recovery followed by immediate high-risk activity.
* Concurrent incompatible sessions.
* Reported unknown session.
* Reported delegate misuse.
* Repeated cross-subject access attempts.
* Export attempts after revocation.

Possible controls may include step-up, session revocation, temporary restriction, manual review, or account suspension. Do not invent permanent lockout policy or disclose detection thresholds to users.

## Incident and breach response

The application may initiate an incident workflow, but it must not automatically make the legal determination that a reportable privacy breach occurred.

Document:

1. Detection.
2. Containment.
3. Session and grant revocation.
4. Export invalidation.
5. Evidence preservation.
6. Scope assessment.
7. Privacy and security escalation.
8. Patient-notification decision.
9. Recovery and monitoring.
10. Post-incident review.

External messages remain stubbed until approved through Task 07 and the privacy process.

## Deliverables

* `docs/task-05/audit-event-catalogue.md`
* `docs/task-05/suspicious-access-and-incident-response.md`

# Workstream J — Data minimization and retention proposal

Create a field-level inventory for:

* Patient accounts.
* Identity-to-subject bindings.
* Identity-proofing evidence.
* Authentication factors.
* Sessions and refresh credentials.
* Recovery attempts and tokens.
* Device and security history.
* Delegation grants and evidence.
* Finalized-record projections.
* Export manifests and artifacts.
* Consent history.
* Communication preferences.
* Access requests.
* Correction requests and overlays.
* Audit records.
* Rate-limit records.
* Application logs.
* Analytics.
* Backups and restored copies.

For every dataset, document:

* Purpose.
* Source of truth.
* PHI or personal-information classification.
* Collection necessity.
* Authorized roles.
* Client exposure.
* Encryption and key ownership.
* Retention trigger.
* Proposed retention period.
* Deletion, archival, or anonymization method.
* Legal-hold behavior.
* Backup-expiry behavior.
* Required approval.

Clearly distinguish:

* Technical recommendation.
* Product decision.
* Privacy/legal decision.
* Approved production policy.

Do not invent legally required retention periods.

Minimize identity-proofing artifacts. Do not retain identity-document images merely because they were used during proofing if the approved design can retain a verified outcome and provenance instead.

## Deliverable

`docs/task-05/data-minimization-and-retention-proposal.md`

# Workstream K — Synthetic portal implementation

Use deterministic, obviously synthetic, server-owned fixtures.

## Fixture requirements

Fixtures must:

* Use no real names, addresses, telephone numbers, emails, health-card numbers, records, pharmacies, or documents.
* Use unmistakable identifiers such as `SYNTHETIC-PATIENT-005`.
* Use a fixed clock.
* Use a fixed synthetic Ontario timezone.
* Remain server-only.
* Make no external network calls.
* Be visibly labelled as synthetic in development and test environments.
* Cause a hard failure if enabled in production.
* Avoid client-side fixture imports.
* Contain marker values for leakage tests.
* Cover all required roles, grants, records, sessions, failures, and lifecycle states.

## Required synthetic scenarios

Include:

* Patient viewing their own finalized record.
* Patient with no finalized records.
* Patient with superseded and corrected records.
* Patient with pending access and correction requests.
* Patient requesting and downloading a synthetic export.
* Active caregiver with view-only scope.
* Active caregiver with export scope.
* Caregiver with insufficient scope.
* Expired caregiver grant.
* Revoked caregiver grant.
* Wrong-subject grant.
* Wrong-custodian grant.
* Suspended account.
* Proofing-pending account.
* Recovery-restricted account.
* Expired patient session.
* Revoked patient session.
* Patient token presented to pharmacist boundary.
* Pharmacist token presented to patient boundary.
* Partial Task 02 failure.
* Complete record-source failure.
* Stale data.
* Consent history with supersession and withdrawal.
* Communication preferences without delivery.
* Unknown status and unknown authority type.
* Export revoked between generation and download.
* Delegation revoked while a record page is requested.

## Accessibility and responsive requirements

Verify:

* Usability at 375px without horizontal scrolling.
* Logical landmarks and headings.
* Keyboard access to every control.
* Visible focus.
* Screen-reader names and announcements.
* Statuses that do not depend on colour.
* Accessible session-expiry and reauthentication flows.
* Accessible error and recovery messages.
* No unexpected focus changes.
* No keyboard traps.
* No essential hover-only interaction.
* 56px targets for frequent mobile actions.
* 200% and 400% zoom/reflow.
* Reduced-motion support.
* Long translated text.
* Absolute timestamps.
* Clear actor-versus-subject context for delegated access.
* Clear current versus superseded record status.

Capture evidence rather than only asserting compliance.

## Deliverables

* Synthetic patient-portal implementation.
* `docs/task-05/accessibility-and-responsive-evidence.md`
* Mobile and desktop screenshots in the established evidence location.
* Keyboard walkthrough results.
* Semantic or screen-reader inspection results.
* Zoom, reflow, reduced-motion, and touch-target evidence.

# Required tests

Use the repository’s existing test tooling.

## Identity-separation tests

Prove:

* A patient cookie is rejected by pharmacist routes.
* A pharmacist cookie is rejected by patient routes.
* A patient token with the wrong audience is rejected.
* A pharmacist token with the wrong audience is rejected.
* Invalid issuer, signature, key, expiry, or not-before state fails safely.
* Patient and pharmacist CSRF credentials are not interchangeable.
* Logout from one security domain does not accidentally authenticate the other.
* Dual-role users receive independent sessions.
* Session fixation is prevented.
* Session identifiers rotate after authentication, recovery, and step-up.
* Revocation is checked server-side.
* Protected responses are not shared-cacheable.

Do not claim production cryptographic separation from mocked role checks. If production auth is not approved, test the synthetic validator and report production separation as `NOT VERIFIED`.

## Authorization tests

Cover:

* Patient accessing their own finalized record.
* Cross-patient record attempt.
* Cross-pharmacy or cross-custodian attempt.
* Client-supplied patient, tenant, pharmacy, role, or grant values.
* Draft or non-finalized record.
* Excluded or unauthorized record.
* Active caregiver with correct scope.
* Caregiver with insufficient scope.
* Expired, revoked, suspended, wrong-subject, and wrong-custodian grants.
* Delegate attempting sub-delegation.
* Delegate attempting account recovery or factor changes.
* Unknown role.
* Expired session.
* Suspended or compromised account.
* Authorization change between page request and export download.

Every protected route and server action must have a deny-by-default authorization test.

## Recovery and session tests

Cover:

* Unknown account with enumeration-neutral response.
* Expired recovery token.
* Replayed recovery token.
* Tampered recovery token.
* Concurrent completion.
* Recovery after account suspension.
* Session revocation after recovery.
* Factor replacement.
* Revoke-one and revoke-all.
* Recovery followed by high-risk export or delegation.
* Accessible manual-recovery status.
* Rate-limit behavior and safe recovery.

## Delegation tests

Cover:

* Grant creation contract.
* Grant activation.
* Scope evaluation.
* Expiry.
* Immediate revocation.
* Concurrent revocation and record access.
* Concurrent revocation and export download.
* Wrong actor.
* Wrong subject.
* Wrong custodian.
* Replay of a revoked or expired link.
* Sub-delegation attempt.
* Missing legal-authority provenance.
* Unknown authority type.
* Patient visibility into active and historical grants.
* Audit attribution to actor, subject, and grant.

## Record and export tests

Cover:

* Finalized records only.
* Current versus superseded versions.
* Correction overlay rendering.
* Record relationship enforcement.
* Export authorization at request time.
* Export authorization at download time.
* Export expiry.
* Export revocation.
* Generic filenames.
* No public object access.
* No unauthorized fields.
* Idempotent export requests.
* Safe partial and total failures.

## Access, correction, consent, and preference tests

Cover:

* Access-request submission and idempotency.
* Correction-request submission and idempotency.
* Source record remains unchanged.
* Overlay or supersession provenance.
* Unknown and invalid transitions.
* Consent supersession and withdrawal.
* Historical consent remains visible.
* Communication preferences do not activate messages.
* Delegates cannot change restricted consent or preferences without explicit scope.
* No legal outcome or completion deadline is invented.

## PHI architecture and leakage tests

Add enforceable tests that fail if:

* A complete patient or record object enters a client component.
* A server-only identity or authorization type is imported by client code.
* Prohibited fixture marker fields appear in client props, hydration data, bundles, or prefetched responses.
* Undisplayed PHI appears in rendered output.
* PHI appears in browser storage.
* PHI appears in service-worker caches.
* PHI appears in URLs or query strings.
* PHI appears in analytics or telemetry.
* PHI appears in client or server logs.
* PHI appears in error-monitoring breadcrumbs.
* PHI appears in filenames, referrers, test snapshots, or evidence filenames.
* Tokens or recovery credentials appear in audit records.
* Protected responses can be cached by a shared intermediary.

Distinguish necessary visible server-rendered fields from hidden serialization of the complete record.

## Audit and incident-response tests

Prove:

* Required successful and denied actions generate events.
* Audit events contain actor, subject, scope, action, outcome, and time.
* Audit events contain no clinical contents, tokens, or recovery answers.
* Events cannot be silently updated or deleted through application code.
* Failed operations do not generate misleading success events.
* Suspicious-access actions revoke or restrict the expected server state.
* Incident exercises preserve evidence and avoid external notification effects.
* Recovery from an incident does not restore revoked sessions or grants accidentally.

## Accessibility and UI tests

Cover:

* Portal home.
* Finalized record list and details.
* Superseded and corrected records.
* Appointments and follow-up plans.
* Consent and preference views.
* Access and correction requests.
* Delegation management.
* Sessions and device history.
* Loading, empty, stale, partial-failure, total-failure, and denied states.
* 375px and desktop layouts.
* Keyboard traversal.
* Screen-reader semantics.
* 56px touch targets.
* 200% and 400% zoom.
* Reduced motion.
* Long labels and translations.
* Session-expiry and reauthentication recovery.

# Mandatory stop conditions

Stop the affected workstream and report the blocker if:

* `AGENTS.md` conflicts with the requested operation.
* Task 01’s synthetic environment is missing or unsafe.
* Real PHI appears in fixtures, tests, screenshots, logs, or artifacts.
* Production Task 02 data would need to be connected before approval.
* A production schema or authentication change lacks approval.
* Patient and pharmacist sessions cannot be separated cryptographically and logically.
* A patient or staff token is accepted by the wrong application boundary.
* A patient-record relationship would need to be inferred or trusted from the client.
* Existing role definitions are ambiguous enough to create access risk.
* Identity-proofing policy would need to be invented.
* Recovery can rely on weak knowledge-based information.
* A caregiver can self-assert authority.
* Caregiver or SDM legal authority would need to be guessed.
* Revocation cannot take effect immediately server-side.
* A complete patient record must cross a client boundary.
* A record export cannot be reauthorized at download time.
* A finalized clinical or billing record would need to be mutated.
* Access or correction policy would need to be interpreted without approval.
* Consent, retention, breach-notification, or legal-hold policy would need to be invented.
* PHI appears in a URL, browser store, analytics event, log, cache, or unsafe client payload.
* A supposedly synthetic identity or fixture could operate in production.
* Existing tenant, authorization, audit, correction, or record-retention protections would need to be weakened.

Continue independent synthetic work when only production integration is blocked.

# Deliverables

1. Current-state and gap analysis.
2. Current Ontario standards mapping.
3. Identity threat model.
4. Trust-boundary and data-flow diagrams.
5. Patient/pharmacist identity and session-separation design.
6. Identity-proofing options and assurance matrix.
7. Account, factor, session, and recovery lifecycle.
8. Patient/caregiver authorization matrix.
9. Delegation and SDM contract.
10. Synthetic patient-portal implementation.
11. Deterministic server-owned fixtures.
12. Read-only finalized-record and supersession views.
13. Access and correction request prototype.
14. Consent and communication-preference model.
15. Server/client data-boundary contract.
16. Server-side export design.
17. Audit-event catalogue.
18. Suspicious-access and incident-response design.
19. Data-minimization and retention proposal.
20. Security, authorization, privacy, accessibility, and responsive tests.
21. Mobile and desktop evidence.
22. Production integration handoff.
23. Updated task status and repository documentation.

# Synthetic prototype acceptance criteria

The synthetic prototype is complete only when:

* Patient and pharmacist security contexts are demonstrably separate in the prototype architecture.
* Cross-audience cookies, sessions, tokens, CSRF credentials, and roles fail safely.
* Actor and record subject remain distinct.
* Every read and export verifies session, assurance, relationship, scope, grant, custodian, and record state server-side.
* Patient and caregiver authorization behavior is documented and tested.
* Delegated access is explicit, scoped, expiring, revocable, and audited.
* Revocation takes effect immediately in the synthetic server model.
* Caregiver self-attestation and sub-delegation are impossible.
* Only finalized and authorized records appear.
* Superseded and corrected records retain visible provenance.
* Patients cannot edit clinical or billing source records.
* Access and correction workflows create separate requests or overlays.
* Consent history remains immutable or superseding.
* Communication preferences do not send messages.
* Exports are server-generated, reauthorized, expiring, and audited.
* No complete record or prohibited field crosses the client boundary.
* No PHI appears in URLs, browser storage, analytics, telemetry, logs, caches, or evidence.
* Recovery is enumeration-resistant and invalidates prior sessions.
* Session and device history is usable without unnecessary surveillance.
* Loading, empty, stale, partial-failure, total-failure, denied, expired, revoked, and suspended states are usable.
* The portal works at 375px and desktop.
* Keyboard, screen-reader, zoom, reflow, reduced-motion, and 56px-target requirements pass.
* All evidence is reproducible and uses only deterministic synthetic data.
* Production authentication, schema changes, PHI integration, and external notifications remain disabled.

A prototype `PASS` does not approve the production identity model.

# Final report format

End the task with:

Task 05 synthetic prototype status: PASS | BLOCKED | FAIL

Task 01 synthetic environment: READY | BLOCKED
Task 02 finalized-record retrieval: PASSED | BLOCKED | NOT VERIFIED
Task 04 appointment integration: READY | BLOCKED | NOT VERIFIED
Task 07 communication integration: STUBBED
Task 11 security/release gate: PASSED | BLOCKED | NOT VERIFIED
PIA approval: APPROVED | BLOCKED | NOT VERIFIED
TRA approval: APPROVED | BLOCKED | NOT VERIFIED
Ontario standards mapping: PASS | BLOCKED | FAIL
Identity threat model: PASS | FAIL
Patient/pharmacist separation design: PASS | FAIL
Production cryptographic separation: VERIFIED | NOT VERIFIED
Identity-proofing model: PASS | BLOCKED | FAIL
Account and recovery lifecycle: PASS | FAIL
Patient/caregiver authorization matrix: PASS | FAIL
Delegation and SDM model: PASS | BLOCKED | FAIL
Synthetic portal implementation: PASS | FAIL
Finalized-record handling: PASS | FAIL
Access/correction workflows: PASS | FAIL
Consent/preferences: PASS | FAIL
Server/client PHI boundary: PASS | FAIL
Export controls: PASS | FAIL
Audit catalogue: PASS | FAIL
Suspicious-access/breach response: PASS | FAIL
Accessibility evidence: PASS | FAIL
One-handed 56px evidence: PASS | FAIL
Automated tests: PASS | FAIL
Real PHI used: NO
Production schema changed: NO
Production authentication changed: NO
Production portal enabled: NO
External messages sent: NO

Blocking issues:
Unresolved identity decisions:
Unresolved privacy/legal decisions:
Deferred production work:
Evidence locations:
Files changed:
Tests run and results:
Recommended next action:

Never report production readiness while identity proofing, recovery, delegated authority, retention, PIA, TRA, or release approval remains unresolved.

If the synthetic prototype passes while production dependencies remain blocked, report:

**Task 05 synthetic prototype: PASS — production identity, schema, and PHI integration remain gated.**
