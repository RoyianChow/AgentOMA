# Task 04 — Complete the Online Booking and Waitlist Prototype

## Sprint checkpoint — 2026-08-19

**Repository state:** `PARTIAL_IMPLEMENTATION_MERGED / BLOCKED_MISSING_RENEWAL_APPROVAL`.
The synthetic `/book` UI is now in the maintained checkout, but the v3 renewal
remains `DRAFT - NOT GRANTED`, refers to an older candidate, and has no
complete independent signatures.
**Sprint slice:** freeze the new exact candidate and finish a current renewal
package. The waitlist policy remains approved only as a policy sub-decision.
**Exit:** implementation may resume only after exact scope, hashes, future
dates, owners, independent reviews, and Task 11 Checkpoint 1 are recorded. No
code, migration, Docker, evidence promotion, or merge is authorized by this
checkpoint. See
[`NEXT-SPRINT-PLAN-2026-08-19.md`](NEXT-SPRINT-PLAN-2026-08-19.md).

## Role

Act as a senior full-stack engineer with strong PostgreSQL concurrency, privacy-by-design, identity, accessibility, and healthcare workflow experience.

Your responsibility is to verify and complete AgentRx’s synthetic appointment-booking and waitlist prototype while designing—but not activating—the PHI-bearing production implementation.

## Objective

Allow Ontarians to:

* Discover available appointment slots.
* Request an in-person, telephone, or video appointment.
* Reschedule or cancel an existing appointment.
* Join or leave a waitlist.
* Recover safely from expired links and interrupted operations.

The booking experience is strictly administrative. It must never collect clinical narratives, perform triage, determine eligibility, or imply that a pharmacist has reviewed the patient.

## Current status

The synthetic prototype is reported as ready but must be treated as unverified until its implementation, tests, privacy boundaries, and concurrency guarantees satisfy this task.

### Governance decision — 2026-08-02

Royian Chowdhury has approved the Task 04 synthetic design scope in the Product
Lead/Capability Owner, Security/Privacy, Operations/SRE, Quality/Test,
Accessibility, and Task 11 reviewer roles. The consolidated decisions and their
explicit non-independent-review disclosure are recorded in
[`../../task-04/decisions/synthetic-sandbox-scope-approval-2026-08-02.md`](../../task-04/decisions/synthetic-sandbox-scope-approval-2026-08-02.md).

Task 11 Checkpoint 1 is `APPROVED_TO_IMPLEMENT_SYNTHETIC` for risk tier R3 and
autonomy level `A3_BOUNDED_AUTOMATION`. Royian Chowdhury is recorded as the
accountable owner, backup owner, Operations/SRE reviewer, and consolidated
kill-switch operator. The experimental capability expires and is due for review
on 2026-08-05. Production, G2 hosted-preview, G3 production-import, live-data,
and external-effect authorization remain excluded.

### Authorized now

* Inspect and improve the existing synthetic prototype.
* Use deterministic synthetic identities and records.
* Build public slot discovery using synthetic availability.
* Implement synthetic booking, cancellation, rescheduling, and waitlist workflows.
* Define domain models, state machines, Zod boundaries, database constraints, and production contracts.
* Run local real-PostgreSQL concurrency tests.
* Create stubbed domain events and transactional outbox records.
* Build a synthetic pharmacist queue.
* Produce privacy, retention, accessibility, and production-integration proposals.

### Not authorized now

* Processing real patient or caregiver data.
* Connecting production identity before Task 05.
* Treating a caregiver checkbox as delegated authority.
* Sending email, SMS, push, or other external notifications.
* Connecting booking data to production assessment workflows while production-readiness gates remain unresolved.
* Applying an unapproved production migration or modifying live data.
* Collecting symptoms, health-card numbers, medications, diagnoses, or reasons for seeking care.
* Implementing clinical urgency, triage, diagnosis, prescribing, treatment, billing, or eligibility logic.

A synthetic prototype may pass independently. PHI-bearing production implementation remains gated by Tasks 02, 05, 07, and 11 and any applicable repository approval requirements.

## Required inputs

Before changing code:

1. Read every applicable `AGENTS.md` completely.
2. Inspect the repository status and preserve unrelated user changes.
3. Review Task 01 and confirm the approved synthetic environment.
4. Review the existing Task 04 prototype and its tests.
5. Review Task 02’s production-readiness status.
6. Review Task 05’s proposed patient identity and delegated-access model.
7. Review Task 07’s reminder and communication boundary.
8. Review Task 11’s privacy, accessibility, abuse, and release requirements.
9. Inspect current authentication, authorization, tenancy, database, audit, logging, analytics, server-rendering, and test conventions.
10. Identify whether schema or migration changes require separate approval.

Follow established repository conventions. Do not introduce a new framework, database abstraction, state library, component system, or authentication model without documenting why the existing approach is insufficient.

## Non-negotiable product invariants

The implementation must preserve these rules:

* Booking is an administrative workflow, not a clinical assessment.
* A displayed slot is not guaranteed until the server commits the booking.
* Capacity is enforced by PostgreSQL, not only by application code.
* Pharmacy scope is derived from trusted server context.
* Patient, caregiver, staff, tenant, pharmacy, capacity, waitlist rank, and authorization state are never trusted from client input.
* Clinical details and health-card numbers are never collected during booking.
* Accessibility and language needs use structured, minimized fields rather than unrestricted medical free text.
* A caregiver must possess an active, appropriately scoped delegation grant.
* Cancellation, rescheduling, waitlist promotion, and event creation are transactional.
* Retried operations are idempotent.
* Domain events do not send messages in this task.
* PHI never appears in URLs, analytics, logs, error text, notification placeholders, or client-side storage.
* Pharmacist queue items contain only the minimum information required for the authorized task.
* No status label implies clinical approval, eligibility, safety, guaranteed availability, or payment.

## Authority boundary

Do not:

* Modify triage, assessment, claim, billing, audit, or clinical-reference logic.
* Infer appointment eligibility from a service category or patient-provided field.
* Add a symptom, diagnosis, medication, pregnancy, allergy, health-card, or clinical-notes field.
* Add a generic “I am their caregiver” checkbox.
* Accept `patientId`, `subjectId`, `caregiverId`, `pharmacyId`, `tenantId`, role, capacity, waitlist position, or confirmed status from an untrusted request.
* Put identity or contact details inside a management URL or token.
* expose staff identities, staffing levels, internal schedules, appointment counts, exact remaining capacity, or other patients’ activity through public availability.
* Enable a production mutation without server authorization and real-PostgreSQL tests.
* Send or simulate delivery of external notifications.
* invent production response-time promises, retention periods, delegation rules, or waitlist-priority policy.
* Apply production schema changes without the required approval.

If an existing implementation violates one of these boundaries, contain the issue, document it, and stop the affected production workstream.

## Execution order

Work in this order:

1. Inspect the existing prototype and repository constraints.
2. Document gaps between the current implementation and this task.
3. Map the design against current official Ontario online-booking guidance.
4. Define the domain model, state machines, invariants, and commands.
5. Define Zod input/output boundaries and safe errors.
6. Implement or repair synthetic public booking workflows.
7. Implement transactional capacity, idempotency, and waitlist behavior.
8. Model synthetic delegated access and production Task 05 integration points.
9. Add stubbed domain events without external effects.
10. Implement the server-rendered synthetic pharmacist queue.
11. Add privacy, retention, accessibility, timezone, and localization coverage.
12. Run the complete test suite, including real-PostgreSQL concurrency tests.
13. Document production gates and handoff requirements.

Continue independent synthetic work when a production dependency is blocked.

# Workstream A — Ontario guidance and repository assessment

Before treating the prototype as pilot-ready, map it against the current official Ontario online-booking guidance applicable to the intended pharmacy workflow.

Use current first-party government or Ontario Health sources. Record:

* Source title.
* Publishing authority.
* URL.
* Publication or revision date, if available.
* Date accessed.
* Applicable requirement or recommendation.
* Current implementation evidence.
* Gap.
* Required action.
* Responsible future task.
* Whether the item blocks a pilot.

Do not treat this mapping as legal approval. Flag ambiguities for privacy, product, clinical, or legal review rather than interpreting them silently.

Also document:

* Existing routes and components.
* Existing domain entities and database objects.
* Current identity assumptions.
* Existing capacity and waitlist logic.
* Existing PHI-bearing fields.
* Current logging and analytics behavior.
* Current tests and missing evidence.
* Any conflict with `AGENTS.md` or approved architecture.

## Deliverables

* `docs/task-04/current-state-and-gap-analysis.md`
* `docs/task-04/ontario-booking-guidance-mapping.md`

Use established repository locations if they differ and report the final paths.

# Workstream B — Domain model and state machines

Define the model before changing workflow behavior.

At minimum, account for:

* Service category.
* Appointment modality.
* Public availability projection.
* Slot or capacity inventory.
* Temporary capacity hold, if used.
* Booking.
* Booking participant or subject reference.
* Actor reference.
* Delegation-grant reference.
* Waitlist entry.
* Waitlist offer or promotion hold.
* Management-access token.
* Idempotency record.
* Domain event or transactional outbox record.
* Audit record.

Use repository naming conventions, but keep the concepts separate.

## Required booking states

The model must distinguish at least:

* Pending confirmation, if the service requires staff confirmation.
* Confirmed.
* Cancelled.
* Rescheduled or superseded.
* Expired, where requests or holds can expire.

Do not represent rescheduling by silently deleting history. Preserve the relationship between the original and replacement booking through versioning, an immutable event history, or explicit predecessor/successor references.

## Required waitlist states

Distinguish at least:

* Active.
* Offered or promotion pending.
* Promoted or accepted.
* Cancelled.
* Expired.

If the approved product policy has not decided whether promotion is automatic or offer-based, do not guess. Use the safer prototype model of an expiring offer backed by a capacity hold and record the unresolved policy decision.

## Required invariants

Prove that:

* Confirmed bookings plus active capacity holds never exceed slot capacity.
* Capacity never becomes negative.
* Only one live promotion offer can exist for the same waitlist entry.
* A cancelled or expired waitlist entry cannot be promoted.
* A consumed, expired, or revoked access token cannot be reused.
* A failed reschedule leaves the original booking unchanged.
* A successful reschedule does not double-consume capacity.
* Cancellation releases capacity exactly once.
* Replaying the same command does not duplicate bookings, promotions, events, or audit rows.
* Every state change records the actor type, time, prior state, resulting state, and safe reason code.
* Historical records cannot be rewritten to hide prior state.

Produce state diagrams or transition tables showing:

* Permitted transitions.
* Required actor and authorization.
* Preconditions.
* Transactional side effects.
* Emitted domain event.
* Idempotent retry result.
* Invalid-transition behavior.

## Deliverables

* `docs/task-04/domain-model.md`
* `docs/task-04/state-machines.md`
* Any synthetic schema or migration permitted by repository policy.
* Database constraints and domain tests.

# Workstream C — Public availability and patient workflow

## Public availability

Public slot discovery must expose only information needed to choose a slot:

* Service category.
* Modality.
* Public location label where applicable.
* Start and end time.
* Display timezone.
* A coarse availability state.
* An opaque, short-lived server-issued slot reference where needed.

Do not expose:

* Staff names or identifiers.
* Private staff schedules.
* Internal database identifiers.
* Other patients’ appointments.
* Exact booking or waitlist counts.
* Exact remaining capacity.
* Sequential identifiers.
* Internal operational notes.
* Tenant or pharmacy configuration.
* Raw integration errors.

The server must revalidate the slot, service, modality, tenant scope, capacity, and booking policy at command time. Never trust a previously rendered availability response as proof of availability.

Add bounded pagination or date ranges, payload-size limits, caching rules, and enumeration protection.

## Booking fields

Booking may capture only:

* Service category.
* Modality preference.
* Structured language preference.
* Structured accessibility needs.
* Minimum necessary contact method and details.
* Waitlist opt-in where applicable.
* Required administrative acknowledgements.
* Trusted subject and actor references supplied by the authenticated server context in the production design.

Do not provide an unrestricted “reason for visit,” “notes,” “symptoms,” or “tell us more” field.

Where a need cannot be represented safely, offer a neutral option such as “Please contact me about an accommodation” without asking for a medical explanation.

## Emergency and non-monitoring language

Show clear language before submission and on confirmation explaining:

* The booking service is administrative.
* It is not monitored for symptoms or emergencies.
* Users must not enter medical details.
* Submitting a request is not a clinical assessment.
* A request is not confirmed until its displayed status says so.
* What the user should do in an emergency.
* When the user should expect an administrative response.

Use approved, configurable response-time language. If no response-time policy exists, use a clearly labelled synthetic placeholder and record a product decision blocker. Do not invent a production promise.

## Recovery behavior

Provide safe recovery for:

* Expired management links.
* Consumed or revoked links.
* Stale slot selections.
* Concurrent booking conflicts.
* Network interruption after submission.
* Partial rendering failures.
* Unknown final status after a timeout.
* Expired waitlist offers.
* Session expiry.

Recovery must not reveal whether an unrelated appointment or contact address exists. Allow the user to reauthenticate, request a fresh authorized access path, or safely check the result using an idempotency receipt.

# Workstream D — Zod boundaries, commands, and safe errors

Define strict Zod schemas for every request and response.

At minimum, cover:

* Public availability query.
* Booking creation.
* Booking retrieval.
* Cancellation.
* Rescheduling.
* Waitlist join.
* Waitlist cancellation.
* Waitlist-offer acceptance.
* Management-link recovery.
* Pharmacist queue query.
* Domain-event envelope.

## Validation requirements

* Use strict objects and reject unknown fields.
* Allowlist all enums.
* Bound every string, array, and date range.
* Validate dates and timezone identifiers on the server.
* Normalize contact details only after validation.
* Reject unexpected free text.
* Reject client-supplied authorization or scope fields.
* Reject stale or mismatched slot references.
* Apply request body and upload-size limits.
* Do not include raw input in validation logs.

## Idempotency contract

Create, cancel, reschedule, waitlist, promotion, and offer-acceptance commands must support idempotent retries.

Bind an idempotency key to:

* Trusted actor.
* Operation.
* Resource scope.
* Canonical request fingerprint.

Required behavior:

* Same key and same payload returns the original safe result.
* Same key with a different payload fails safely.
* Concurrent use of the same key produces one committed effect.
* Failed transactions do not persist a successful receipt.
* Idempotency records contain no unnecessary contact data or PHI.
* Retention and cleanup are defined in the retention proposal.

## Safe errors

Return stable codes and plain-language messages for conditions such as:

* Slot no longer available.
* Invalid transition.
* Booking not accessible.
* Link expired.
* Request already processed.
* Waitlist offer expired.
* Rate limit reached.
* Temporary service failure.

Errors must not reveal:

* Whether another patient occupies a slot.
* Internal identifiers.
* SQL details.
* Stack traces.
* Contact information.
* Tenant configuration.
* Authorization rules.
* Raw third-party responses.

Use an opaque correlation identifier where appropriate, but do not place PHI in it.

## Deliverable

`docs/task-04/api-and-zod-contracts.md`

# Workstream E — Capacity, concurrency, and waitlist promotion

Capacity enforcement must be database-backed and tested on real PostgreSQL.

Acceptable designs may use:

* Conditional atomic updates.
* Row locking.
* Serializable transactions with retry handling.
* Per-capacity-unit rows with uniqueness constraints.
* Another design that proves the same invariants.

Do not rely on an application-level read followed by an unprotected write.

## Booking transaction

A successful booking transaction must atomically:

1. Validate current slot and service policy.
2. Acquire capacity.
3. Create or transition the booking.
4. Persist idempotency outcome.
5. Record the audit event.
6. Add the domain event to the transactional outbox.

If any step fails, none of the effects may remain.

## Cancellation and promotion transaction

Cancellation and the corresponding waitlist promotion must be atomic and idempotent.

The transaction must:

1. Lock or conditionally update the booking.
2. Cancel it only if cancellation is still permitted.
3. Release capacity exactly once.
4. Select the next eligible waitlist entry according to the documented non-clinical policy.
5. Create one promotion offer or approved promotion state.
6. Reserve the relevant capacity when required.
7. Update the waitlist entry.
8. Write audit and outbox events.
9. Commit all effects together.

If no eligible entry exists, cancellation must still complete without leaking capacity.

Do not derive waitlist priority from symptoms, diagnosis, medical history, health status, or predicted clinical urgency.

## Rescheduling transaction

A reschedule must:

* Revalidate the target slot.
* Acquire locks in a deterministic order.
* Preserve the original appointment if the target cannot be secured.
* Acquire target capacity and release original capacity atomically.
* Preserve a complete history.
* Produce one final result under duplicate or concurrent requests.
* Avoid deadlocks or handle transaction retries safely.

## Offer expiry

Define and test what happens when:

* An offer expires before acceptance.
* Acceptance and expiry occur concurrently.
* Cancellation and promotion occur concurrently.
* Two slots become available at the same time.
* The selected waitlist entry is no longer eligible.
* Domain-event processing is retried.

## Deliverable

`docs/task-04/concurrency-and-capacity-design.md`

# Workstream F — Identity and delegated caregiver access

Production booking must use Task 05’s identity model.

For the synthetic prototype:

* Use deterministic synthetic actors and subjects.
* Keep actor and appointment subject distinct.
* Represent delegation with a synthetic grant reference.
* Cover active, expired, revoked, wrong-subject, and insufficient-scope grants.
* Make synthetic identity impossible to enable accidentally in production.

The production contract must require:

* Verified actor identity.
* Verified appointment subject.
* Active delegation when actor and subject differ.
* Explicit scopes for create, view, reschedule, cancel, and waitlist actions.
* Expiry and revocation enforcement.
* Server-side authorization on every action.
* Audit attribution to both actor and subject without exposing either in URLs.

A caregiver cannot gain access through:

* A checkbox.
* Knowledge of contact details.
* Possession of a predictable booking identifier.
* A client-supplied subject identifier.
* A management link issued to another actor.

If Task 05 has not finalized delegation semantics, implement only the synthetic contract and mark production caregiver functionality blocked.

## Deliverable

`docs/task-04/identity-and-delegation-contract.md`

# Workstream G — Domain events and Task 07 boundary

Create versioned domain events for future consented reminders, including as applicable:

* Booking requested.
* Booking confirmed.
* Booking rescheduled.
* Booking cancelled.
* Booking expired.
* Waitlist joined.
* Waitlist cancelled.
* Waitlist offer created.
* Waitlist offer accepted.
* Waitlist offer expired.

Each event should contain only:

* Event identifier.
* Event type and schema version.
* Opaque aggregate identifiers.
* Occurrence time.
* Tenant or pharmacy scope in a protected server-only representation.
* Minimum routing metadata required for a future authorized consumer.
* Consent or communication-policy reference where required.

Do not include:

* Name.
* Email address.
* Telephone number.
* Symptoms.
* Accessibility details.
* Language details unless Task 07 proves they are necessary.
* Health-card number.
* Appointment-management tokens.
* Message bodies.
* URLs containing identity or booking details.

Outbox records must be committed in the same transaction as the state change.

In this task:

* Do not connect an email, SMS, push, webhook, or calendar provider.
* Do not render production message templates.
* Do not make an external network call.
* Do not mark an event as delivered.
* Make the stubbed/no-delivery state explicit and testable.

## Deliverable

`docs/task-04/domain-events-and-task-07-handoff.md`

# Workstream H — Pharmacist booking queue

Produce a server-rendered synthetic pharmacist queue using minimum necessary fields.

A queue item may display only what an authorized pharmacist needs for appointment preparation, such as:

* Synthetic subject display label.
* Appointment time and timezone.
* Service category.
* Modality.
* Administrative booking status.
* Structured language or accessibility preparation indicator where necessary.
* Source and creation time.
* Safe operational reason for appearing.
* Whether an administrative action is currently permitted.

Do not display:

* Symptoms.
* Diagnoses.
* Medications.
* Clinical notes.
* Health-card numbers.
* Full patient records.
* Unnecessary contact details.
* Caregiver details without a specific authorized need.

PHI-bearing production content must remain server-rendered. Client components may receive only minimal non-PHI interaction values, such as allowlisted filter codes and UI state.

Do not place booking or identity information in:

* Query strings.
* Client caches.
* Browser storage.
* Analytics.
* Error-monitoring breadcrumbs.
* Console output.
* Hydration payloads beyond the explicitly approved minimum.

Add an architecture test that fails if a complete booking, patient, caregiver, or contact object crosses into a client component.

## Deliverable

`docs/task-04/pharmacist-queue-contract.md`

# Workstream I — Abuse prevention and privacy design

Document and prototype protections for:

* Availability scraping.
* Slot hoarding.
* Repeated booking creation.
* Waitlist flooding.
* Identifier enumeration.
* Token guessing.
* Reschedule or cancellation abuse.
* Oversized or malformed requests.
* Distributed requests.
* Replay attacks.
* Automated contact-detail testing.

Rate limits must:

* Apply at appropriate public, actor, session, and operation scopes.
* Use privacy-preserving keys.
* Avoid storing raw contact information as the limiter key.
* Fail safely when the limiter is unavailable.
* Avoid permanently blocking users behind shared networks.
* Support accessible recovery.
* Generate no PHI-bearing logs.

Do not treat rate limiting as the primary authorization or capacity control.

## Deliverable

`docs/task-04/abuse-and-rate-limit-design.md`

# Workstream J — Data minimization and retention proposal

Create a field-level data inventory covering:

* Public availability.
* Booking drafts.
* Confirmed bookings.
* Cancelled and rescheduled bookings.
* Waitlist entries and offers.
* Identity and delegation references.
* Contact details.
* Language and accessibility fields.
* Idempotency receipts.
* Management tokens.
* Domain events and outbox rows.
* Audit records.
* Rate-limit records.
* Server logs.
* Analytics.
* Backups and restored copies.

For each field or dataset, document:

* Purpose.
* Source of truth.
* Whether it contains PHI or personal information.
* Collection necessity.
* Who can access it.
* Whether it reaches the client.
* Retention trigger.
* Proposed retention period.
* Deletion, anonymization, or archival method.
* Legal-hold behavior.
* Backup-expiry behavior.
* Required privacy, compliance, or product approval.

Do not invent a legally required retention period. Clearly distinguish:

* Technical recommendation.
* Product decision.
* Privacy/legal decision.
* Approved production policy.

Include cleanup behavior for abandoned drafts, expired holds, expired links, cancelled waitlist entries, idempotency records, outbox records, and rate-limit keys.

## Deliverable

`docs/task-04/data-minimization-and-retention-proposal.md`

# Accessibility, timezone, and localization requirements

Verify:

* Usability at 375px without horizontal scrolling.
* Keyboard access to every action.
* Logical focus order and visible focus.
* Screen-reader labels and announcements.
* Statuses that do not rely on colour alone.
* Accessible validation and recovery messages.
* Large touch targets consistent with the product’s 56px one-handed standard.
* No essential hover-only interaction.
* 200% and 400% zoom/reflow.
* Reduced-motion behavior.
* Long translated strings.
* Plain-language emergency and non-monitoring copy.
* Language and accessibility choices without requiring medical disclosure.

Use IANA timezone identifiers. Store instants in UTC and render the pharmacy’s configured local timezone explicitly.

Test:

* Ontario spring daylight-saving transition.
* Ontario fall daylight-saving transition.
* Ambiguous local times.
* Nonexistent local times.
* A user viewing from a different timezone.
* Rescheduling across a DST boundary.
* Slot expiry across a DST boundary.

Do not silently reinterpret an ambiguous appointment time.

## Deliverable

`docs/task-04/accessibility-timezone-localization-evidence.md`

# Required tests

Use the repository’s existing test tools.

## Real-PostgreSQL concurrency tests

Prove:

* Two simultaneous requests for the final capacity unit produce exactly one successful booking.
* The losing request receives a safe, deterministic result.
* No partial booking, audit, event, or idempotency rows remain.
* Capacity greater than one cannot receive more bookings than configured.
* Concurrent duplicate idempotency keys create one effect.
* Concurrent cancellation and rescheduling produce one valid final state.
* Concurrent cancellation and waitlist promotion do not leak capacity.
* Concurrent offer acceptance and expiry produce one valid result.
* Rescheduling to a full slot leaves the original booking intact.
* Transaction retries do not duplicate events.

Use independent database connections and a synchronization barrier. Do not claim concurrency coverage from sequential promises, mocks, SQLite, or an in-memory database.

## Idempotency tests

Cover:

* Repeated booking creation.
* Repeated cancellation.
* Repeated rescheduling.
* Repeated waitlist join and leave.
* Repeated promotion.
* Repeated offer acceptance.
* Same key with a changed payload.
* Retry after a transaction failure.
* Retry after an unknown client-side outcome.

## Authorization tests

Cover:

* Patient managing their own booking.
* Caregiver with a valid grant and correct scope.
* Caregiver with an expired grant.
* Caregiver with a revoked grant.
* Caregiver with the wrong subject or insufficient scope.
* Authorized staff.
* Unauthorized staff role.
* Cross-pharmacy attempt.
* Expired session.
* Active, expired, consumed, and revoked management links.

## Privacy tests

Prove that PHI or personal contact information does not appear in:

* URLs or query strings.
* Analytics payloads.
* Client storage.
* Client logs.
* Server logs.
* Safe-error responses.
* Domain events.
* Notification placeholders.
* Test snapshots.
* Screenshots.
* Rate-limit keys.
* Hydration payloads beyond the approved server-rendering boundary.

Use synthetic marker values so leakage tests fail deterministically.

## Boundary and abuse tests

Cover:

* Unknown fields.
* Invalid enums.
* Excessive string lengths.
* Invalid timezone.
* Stale slot reference.
* Tampered opaque token.
* Invalid state transition.
* Oversized request.
* Slot enumeration attempts.
* Waitlist flooding.
* Rate-limit recovery.
* Limiter failure mode.

## UI and recovery tests

Cover:

* Public availability.
* Booking confirmation.
* Cancellation.
* Rescheduling.
* Waitlist opt-in and cancellation.
* Expired links.
* Partial failures.
* Unknown final status after timeout.
* 375px layout.
* Keyboard operation.
* Screen-reader semantics.
* Zoom and reflow.
* DST and localization cases.

# Mandatory stop conditions

Stop the affected workstream and report the blocker if:

* `AGENTS.md` conflicts with the requested change.
* Real PHI appears anywhere in the prototype or evidence.
* A production migration requires approval that has not been granted.
* Task 05 identity or delegation would need to be guessed.
* A caregiver can self-assert authority.
* Capacity cannot be enforced transactionally in PostgreSQL.
* A race permits overbooking, duplicate promotion, or capacity leakage.
* A rollback leaves partial booking, waitlist, audit, or outbox state.
* Clinical information is requested or inferred.
* A status implies clinical review, eligibility, safety, or guaranteed confirmation.
* A public endpoint exposes private staff, patient, capacity, or tenant information.
* PHI or contact data appears in a URL, event, analytics payload, log, or client store.
* External notification delivery occurs before Task 07.
* Production PHI integration begins before its project gates pass.
* Response-time, retention, waitlist-priority, or delegation policy would need to be invented.
* Existing tenancy, authorization, audit, or privacy controls would need to be weakened.

Continue safe, independent synthetic work when only production integration is blocked.

# Deliverables

1. Current-state and gap analysis.
2. Current Ontario online-booking guidance mapping.
3. Booking, slot, capacity, waitlist, token, and event domain model.
4. Booking and waitlist state machines.
5. Verified synthetic public workflow.
6. Verified synthetic pharmacist queue.
7. Strict Zod request and response contracts.
8. Safe-error and idempotency contract.
9. Real-PostgreSQL concurrency implementation and evidence.
10. Atomic cancellation, rescheduling, and waitlist-promotion behavior.
11. Identity and delegated-access production contract.
12. Stubbed domain events and Task 07 handoff.
13. Abuse and rate-limit design.
14. Data-minimization and retention proposal.
15. Accessibility, timezone, DST, and localization evidence.
16. Production integration handoff with unresolved approvals and dependencies.
17. Updated task status and repository documentation.

# Prototype acceptance criteria

The synthetic prototype is complete only when:

* Public availability exposes no patient or staff-private information.
* Booking collects no symptom narrative, health-card number, medication data, diagnosis, or clinical notes.
* Administrative booking never represents clinical assessment or eligibility.
* Two simultaneous requests cannot overbook the final slot.
* Cancellation and waitlist promotion are atomic and idempotent.
* Rescheduling cannot lose the original appointment when the target slot fails.
* Repeated commands do not duplicate state, events, or audit records.
* Waitlist expiry and capacity rules are explicit and tested.
* Caregiver access uses modeled delegated authority rather than self-attestation.
* Expired links and partial failures have safe recovery paths.
* Emergency, non-monitoring, confirmation, and response-time language is clear.
* Domain events are written transactionally and contain no unnecessary PHI.
* No external notification effect occurs.
* The pharmacist queue is server-rendered with minimum necessary information.
* No PHI appears in a URL, analytics event, notification placeholder, log, client store, or unsafe hydration payload.
* Rate-limit and abuse protections fail safely.
* 375px, keyboard, screen-reader, zoom, timezone, daylight-saving, and localization cases pass.
* All evidence uses deterministic synthetic data.
* Production PHI functionality remains disabled.

The Ontario guidance mapping must be complete before pilot approval, even if the synthetic prototype passes.

# Final report format

End with:

Task 04 synthetic prototype status: PASS | BLOCKED | FAIL

Task 01 synthetic environment: READY | BLOCKED
Task 02 production-readiness gate: PASSED | BLOCKED | NOT VERIFIED
Task 05 identity/delegation gate: READY | BLOCKED | NOT VERIFIED
Task 07 notification integration: STUBBED
Task 11 release gate: PASSED | BLOCKED | NOT VERIFIED
Ontario guidance mapping: PASS | BLOCKED | FAIL
Domain model/state machines: PASS | FAIL
Public availability privacy: PASS | FAIL
Booking workflow: PASS | FAIL
Cancellation/rescheduling: PASS | FAIL
Waitlist and promotion: PASS | FAIL
Real-PostgreSQL concurrency: PASS | FAIL
Idempotency: PASS | FAIL
Delegated-access design: PASS | FAIL
Zod and safe errors: PASS | FAIL
Server/client PHI boundary: PASS | FAIL
Privacy leakage tests: PASS | FAIL
Accessibility/timezone/localization: PASS | FAIL
External messages sent: NO
Real PHI used: NO
Production PHI integration enabled: NO

Blocking issues:
Unresolved policy decisions:
Production dependencies:
Evidence locations:
Files changed:
Tests run and results:
Recommended next action:

Never mark the production implementation ready while a production gate remains unresolved.

If the synthetic prototype passes while production dependencies remain blocked, report:

**Task 04 synthetic prototype: PASS — PHI-bearing production implementation remains gated.**
