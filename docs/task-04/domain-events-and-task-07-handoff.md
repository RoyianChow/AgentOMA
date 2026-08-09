# Task 04 — Domain Events and Task 07 Handoff

**Status:** Draft documented; review/correction in progress; runtime not implemented
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**External notification delivery:** Prohibited
**Task 07 integration:** Contract only; not connected
**Synthetic implementation:** Approved on 2026-08-02 through 2026-08-05
**Task 11 Checkpoint 1:** `APPROVED_TO_IMPLEMENT_SYNTHETIC`
**Risk/autonomy:** `R3`; `A3_BOUNDED_AUTOMATION`
**Expiry/review due:** 2026-08-05
**Governance roles:** Accountable owner, backup owner, and Operations/SRE
reviewer: Royian Chowdhury (consolidated, non-independent)

Production, G2, G3, live data, cloud databases, external effects, and
production imports remain prohibited. Royian Chowdhury holds the accountable
owner, backup owner, and Operations/SRE reviewer roles; this is consolidated,
non-independent coverage. Protected event scope comes only from server-only
`PHARMACY_ID`; no event consumer selects pharmacy or tenant scope.

## Canonical planning references

The event envelope and error vocabulary are canonical in
[`api-and-zod-contracts.md`](api-and-zod-contracts.md); emitted transition
events are canonical in [`state-machines.md`](state-machines.md); evidence
mapping is canonical in section 11.1 of
[`pre-implementation-test-plan.md`](pre-implementation-test-plan.md).

## 1. Purpose

This document defines the proposed domain-event, transactional-outbox,
notification-handoff, privacy, retry, reconciliation, and ownership boundaries
between:

- Task 04 booking and waitlist workflows.
- Task 07 messaging and reminder workflows.

Task 04 records administrative facts such as:

- A booking was created.
- A booking was confirmed.
- A booking was cancelled.
- A booking was rescheduled.
- A waitlist entry was created.
- A waitlist offer was created.
- A waitlist offer expired.
- A waitlist offer was accepted.

Task 04 does not:

- Compose a production message.
- Select an external communication channel.
- Decide reminder cadence.
- Determine communication consent.
- Verify a real contact destination.
- Send email.
- Send SMS.
- Send push notifications.
- Place voice calls.
- Create calendar invitations.
- Call a webhook.
- Mark an external message delivered.
- Treat delivery as proof that the intended recipient read or understood it.

Task 07 remains responsible for any future authorized communication policy,
consent, contact verification, templates, scheduling, provider integration,
delivery, reconciliation, opt-out, and incident handling.

## 2. Governing boundary

### Task 04 owns

- Authoritative booking and waitlist state.
- Booking and waitlist state transitions.
- Capacity and temporary holds.
- Idempotency for booking commands.
- Creation of minimum-necessary domain events.
- Transactional insertion of outbox records.
- Event schema versions.
- Aggregate versions.
- Cancellation and rescheduling supersession facts.
- Explicit synthetic and no-delivery status.
- Task 04 event tests.
- Prevention of contact or clinical data in Task 04 events.

### Task 07 owns

- Production communication policy.
- Purpose and channel allowlists.
- Communication consent.
- Consent expiry and withdrawal.
- Contact-point verification.
- Contact-point versioning.
- Channel preferences.
- Quiet hours.
- Timezone-based dispatch scheduling.
- Reminder cadence.
- Message usefulness expiry.
- Human-reviewed templates.
- Sender identity.
- Translations.
- Opt-out language and processing.
- Provider selection.
- Vendor integration.
- Dispatch retries.
- Delivery-state reconciliation.
- Provider webhook handling.
- Wrong-recipient and wrong-number handling.
- Bounce, complaint, and suppression handling.
- Communication incident response.
- Message-content retention.
- Production delivery authorization.

### Shared boundary

Task 04 and Task 07 must agree on:

- Event names.
- Event schema versions.
- Event identifiers.
- Aggregate identifiers.
- Aggregate versions.
- Cancellation and supersession semantics.
- Minimum routing metadata.
- Consumer idempotency.
- Event usefulness and expiry.
- Reconciliation behavior.
- Privacy classifications.
- Production-enablement gates.

Neither task may silently redefine the other task’s authoritative state.

## 3. Non-negotiable invariants

### EVT-INV-01 — No direct delivery

Task 04 must never contact an external communication or calendar provider.

### EVT-INV-02 — Transactional event creation

A successful event must be inserted in the same PostgreSQL transaction as the
authoritative booking or waitlist state transition.

### EVT-INV-03 — No event after rollback

When the domain transaction rolls back, no successful outbox event may remain.

### EVT-INV-04 — No state change from message delivery

A Task 07 delivery, failure, acknowledgement, webhook, read receipt, or reply
must not independently:

- Confirm a booking.
- Cancel a booking.
- Reschedule a booking.
- Accept a waitlist offer.
- Extend a waitlist offer.
- Complete an assessment.
- Generate or submit a claim.

### EVT-INV-05 — Minimum necessary payload

Task 04 events contain only the minimum metadata required for a future
authorized consumer.

### EVT-INV-06 — No contact data

Task 04 events must not contain:

- Email addresses.
- Telephone numbers.
- Mailing addresses.
- Device tokens.
- Provider recipient identifiers.

### EVT-INV-07 — No clinical data

Task 04 events must not contain:

- Symptoms.
- Diagnoses.
- Medications.
- Allergies.
- Pregnancy information.
- Health-card information.
- Appointment purpose.
- Clinical notes.
- Clinical eligibility.
- Triage or urgency information.

### EVT-INV-08 — No authority through an event

An event identifier, aggregate identifier, link, or notification cannot grant
booking-management authority.

### EVT-INV-09 — Version-aware consumption

A future consumer must verify the current authoritative appointment version
before dispatch.

### EVT-INV-10 — Cancellation and rescheduling supersede stale work

Cancellation and rescheduling events must allow Task 07 to cancel or supersede
obsolete pending reminders.

### EVT-INV-11 — Duplicate-safe consumption

Repeated publication or consumption of the same event must not create unsafe
duplicate messages.

### EVT-INV-12 — Explicit no-delivery state

Every Task 04 outbox event remains explicitly synthetic and not dispatched.

## 4. Domain event versus outbox record

A domain event represents an authoritative fact that occurred.

Examples:

- `booking.confirmed`
- `booking.cancelled`
- `waitlist.offer_created`

An outbox record is the durable database representation used to make that fact
available to a future authorized consumer.

For the synthetic prototype, the event and outbox record may share one
database structure, provided the distinction remains clear:

```text
Domain fact
    -> stored transactionally in outbox
        -> dispatch_status remains not_dispatched
            -> future Task 07 consumer, only after approval
```

The outbox is not:

- A message queue provider.
- A delivery receipt.
- An email record.
- An SMS record.
- A notification template.
- A patient communication record.
- Proof of recipient consent.
- Proof of recipient identity.
- Proof of delivery.

## 5. Proposed event envelope

Every Task 04 event uses the canonical strict discriminated union in section
4A.13 of
[`api-and-zod-contracts.md`](api-and-zod-contracts.md). The conceptual
database-column mapping is:

```text
event_id
event_type
event_schema_version
aggregate_type
aggregate_id
aggregate_version
occurred_at_utc
protected_scope
actor_type
synthetic_marker
source_capability
safe_reason_code
event_usefulness_expires_at_utc
dispatch_status
aggregate_version_superseded
cleanup_eligible_at_utc
payload
```

`protected_scope` contains server-only `PHARMACY_ID`, derived only from
sandbox-owned `TASK04_SANDBOX_PHARMACY_ID`, and the literal synthetic
environment marker. It is never accepted from a request or
returned through a public/queue boundary. There is no tenant or pharmacy
selector and no multi-pharmacy runtime.

### 5.1 Event identifier

`event_id` must be:

- Opaque.
- Unique.
- Stable across retry.
- Safe for internal deduplication.
- Unrelated to a person’s identity or contact details.

### 5.2 Event type

`event_type` must be selected from an allowlisted event catalogue.

### 5.3 Event schema version

`event_schema_version` identifies the exact event contract. Every currently
planned synthetic union member uses literal version `1`; a later version
requires a separately documented union member and consumer review.

A consumer must not guess how to process an unknown version.

### 5.4 Aggregate type

Canonical aggregate types are:

- `booking`
- `waitlist_entry`
- `waitlist_offer`
- `capacity_hold`
- `management_credential`
- `automation_control`

### 5.5 Aggregate identifier

`aggregate_id` is the persistence form of the API field `aggregateId` and is
an opaque internal identifier. The event contract does not use
`aggregateReference` or `aggregate_reference`.

It must not contain:

- A patient identifier.
- A contact destination.
- A health number.
- A management credential.
- A readable appointment purpose.

### 5.6 Aggregate version

`aggregate_version` identifies the version of the authoritative booking or
waitlist state that produced the event.

A future Task 07 consumer must compare this with the current authoritative
version before dispatch.

### 5.7 Occurrence time

`occurred_at_utc` records when the authoritative transition occurred.

It must be stored as a UTC instant.

### 5.8 Protected pharmacy scope

Scope must use server-only `PHARMACY_ID` derived only from
`TASK04_SANDBOX_PHARMACY_ID`.

Scope must not be:

- Accepted from an untrusted client.
- Placed in an unsecured URL.
- Used as a recipient address.
- Exposed through public events.

### 5.9 Synthetic marker

Every prototype event must contain the exact synthetic marker:

`SYNTHETIC_TASK_04_EVENT`

### 5.10 Source capability

Proposed value:

`TASK04_BOOKING_WAITLIST_SYNTHETIC`

### 5.11 Safe reason code

A bounded safe reason code explains the administrative transition. It must be
the exact event-specific value in the section 4A.13 discriminated union; it is
not a free-form string and consumers must reject a code that is valid only for
another event member.

### 5.12 Communication-policy reference

No communication-policy reference is a Task 04 event field. Task 07 is not
connected, and the absence of that field cannot authorize dispatch. A future
approved Task 07 design must add its own versioned consumer contract rather
than extending a Task 04 event with ad hoc metadata.

### 5.13 Event usefulness expiry

Where a future message would become useless after a time, the event may include
a bounded usefulness expiry.

The exact production expiry policy remains owned by Task 07.

Task 04 must not invent reminder timing.

### 5.14 Dispatch status

The only Task 04 value is:

- `not_dispatched`

The synthetic stub is represented through `synthetic_marker` and
`source_capability`, not through a second dispatch status. Cancellation,
supersession, and usefulness expiry are authoritative aggregate/version fields
or events; they do not mutate `dispatch_status`.

`aggregate_version_superseded` and `cleanup_eligible_at_utc` are cleanup
metadata only. They do not mean dispatched, cancelled delivery, expired
delivery, acknowledged, or externally processed. The former becomes true only
after a newer committed aggregate version makes the event obsolete for a
future consumer. The latter is set only by the reviewed synthetic cleanup
policy after both usefulness and evidence requirements are satisfied.

The synthetic prototype must never use:

- `sent`
- `delivered`
- `read`
- `acknowledged`

## 6. Prohibited event fields

Task 04 events and outbox records must not contain:

- Patient name.
- Caregiver name.
- Pharmacist name.
- Email address.
- Telephone number.
- Mailing address.
- Device token.
- Provider recipient identifier.
- Health-card number.
- Date of birth.
- Symptoms.
- Diagnosis.
- Medication information.
- Allergy information.
- Pregnancy information.
- Clinical notes.
- Reason for appointment.
- Service description that reveals a diagnosis.
- Accessibility details.
- Language preference unless Task 07 proves it is required.
- Message subject.
- Message body.
- Message preview.
- Appointment-management credential.
- Booking-management URL.
- Password-reset or authentication token.
- Session identifier.
- Raw idempotency key.
- Raw request body.
- Production identity identifier.
- Full booking object.
- Full patient object.
- Full delegate object.
- Full contact object.

## 7. Event catalogue

### 7.1 `booking.created`

Meaning:

A new administrative booking record was created.

This event does not necessarily mean:

- Capacity is confirmed.
- A pharmacist reviewed the booking.
- The appointment is clinically suitable.
- The patient is eligible.
- A notification should be sent.

The exact payload contains `resultingState`, `modality`, `startTimeUtc`, and
`endTimeUtc`. The common envelope contains the booking `aggregateId`, version,
scope, actor type, and exact `BOOKING_REQUESTED` reason. No timezone,
communication, contact, or additional source field is permitted.

Current dispatch state:

`not_dispatched`

### 7.2 `booking.confirmed`

Meaning:

The authoritative booking transaction committed in the confirmed
administrative state.

This does not mean:

- Clinical assessment occurred.
- Clinical eligibility was established.
- The appointment purpose may be disclosed.
- The intended recipient was notified.

Potential future Task 07 use:

- Booking confirmation.
- Creation of approved reminder work.

Current dispatch state:

`not_dispatched`

### 7.3 `booking.cancelled`

Meaning:

The authoritative booking was cancelled and capacity was released or
transactionally transferred according to the booking policy.

Potential future Task 07 use:

- Cancel pending confirmation or reminder work.
- Send an approved generic cancellation message where authorized.

Required consumer behavior:

- Verify the current booking version.
- Cancel stale reminder work.
- Do not disclose appointment purpose.
- Do not treat an unsecured reply as authority to reverse the cancellation.

Current dispatch state:

`not_dispatched`

### 7.4 `booking.rescheduled`

Meaning:

The original booking was superseded by a successor booking.

The exact payload contains
`predecessorBookingReference`, `successorBookingReference`, and
`successorState`. The common envelope contains the predecessor booking’s
`aggregateId`, committed `aggregateVersion`, and exact
`REPLACEMENT_COMMITTED` reason code. It contains no unregistered metadata.

Potential future Task 07 use:

- Cancel reminders for the predecessor.
- Create confirmation or reminder work for the successor.
- Prevent both appointment times from being presented as current.

Current dispatch state:

`not_dispatched`

### 7.5 `booking.expired`

Meaning:

A pending administrative booking request expired before confirmation.

Potential future Task 07 use:

- Cancel pending communication work.
- Send a generic recovery message only where policy permits.

Current dispatch state:

`not_dispatched`

### 7.6 `waitlist.joined`

Meaning:

An authorized subject entered the administrative waitlist.

This event must not expose:

- Exact waitlist position.
- Number of other entries.
- Clinical priority.
- Predicted wait time.

Potential future Task 07 use:

- Generic waitlist acknowledgement where approved.

Current dispatch state:

`not_dispatched`

### 7.7 `waitlist.cancelled`

Meaning:

The waitlist entry was cancelled.

Potential future Task 07 use:

- Cancel stale waitlist communication work.
- Send a generic acknowledgement where approved.

Current dispatch state:

`not_dispatched`

### 7.8 `waitlist.offer_created`

Meaning:

A temporary administrative offer and capacity hold were created.

Its exact section 4A.13 payload contains the opaque waitlist-entry and
capacity-hold references, resulting `pending` state, and offer expiry instant.
The common envelope carries the offer `aggregateId` and version.

The event must not contain the raw management credential or direct booking URL.

Potential future Task 07 use:

- Create time-limited generic offer communication.
- Direct an authorized person to an authenticated or otherwise approved
  management path.

Current dispatch state:

`not_dispatched`

### 7.9 `waitlist.offer_accepted`

Meaning:

The offer was accepted and the authoritative booking transaction committed.

Potential future Task 07 use:

- Cancel pending offer-expiry communication work.
- Create approved booking confirmation or reminder work.

Current dispatch state:

`not_dispatched`

### 7.10 `waitlist.offer_declined`

Meaning:

The offer was declined.

Potential future Task 07 use:

- Cancel pending offer communication work.
- Send no further offer reminders unless policy explicitly permits.

Current dispatch state:

`not_dispatched`

### 7.11 `waitlist.offer_expired`

Meaning:

The offer expired by trusted database time and the temporary hold became
`expired`.

Potential future Task 07 use:

- Cancel stale offer communication work.
- Send an approved generic expiry notice where permitted.

Current dispatch state:

`not_dispatched`

### 7.12 `waitlist.offer_withdrawn`

Meaning:

The offer was administratively withdrawn before acceptance. Its exact payload
also records whether the linked entry became `active`, `cancelled`, or
`expired`.

Potential future Task 07 use:

- Cancel pending communication work.

Current dispatch state:

`not_dispatched`

### 7.13 `waitlist.reactivated`

Meaning:

An offered waitlist entry returned to `active` because its offer expired or was
withdrawn while the entry lifetime and authority remained current.

Current dispatch state:

`not_dispatched`

### 7.14 Internal lifecycle events

The state-machine contract also emits the following internal, non-delivery
events:

- `waitlist.expired`
- `capacity_hold.created`
- `capacity_hold.consumed`
- `capacity_hold.released`
- `capacity_hold.expired`
- `management_credential.issued`
- `management_credential.consumed`
- `management_credential.expired`
- `management_credential.revoked`
- `booking.expired`
- `automation.reconciled`
- `automation.disabled`
- `automation.enabled`

These use the same canonical envelope and
`dispatch_status = not_dispatched`. They support transactional evidence and
reconciliation only;
they are not Task 07 message requests. Hold terminal meanings are exact:
confirmation/acceptance is `consumed`, clock expiry is `expired`, and early
cancellation/decline/withdrawal is `released`.

## 8. Event schema versioning

Each event type must have an explicit schema version.

Example:

```text
booking.confirmed
schema version: 1
```

A schema version changes when a consumer-visible contract changes, including:

- Field addition where consumers require awareness.
- Field removal.
- Field meaning change.
- Identifier semantics change.
- Scope semantics change.
- Timestamp semantics change.
- Aggregate-version behavior change.
- Supersession behavior change.
- Privacy classification change.

A documentation correction that does not alter the machine contract may not
require a schema version change.

### 8.1 Unknown versions

A future Task 07 consumer must fail safely when it receives an unsupported
version.

It must not:

- Guess field meaning.
- Dispatch from a partial payload.
- Fall back to a less restrictive template.
- Expose the event in an ordinary log.
- Mark it delivered.

### 8.2 Backward compatibility

Compatibility must be explicitly reviewed.

Task 04 must not promise backward compatibility without:

- Contract tests.
- Consumer review.
- Migration strategy.
- Deprecation plan.
- Replay and reconciliation testing.

## 9. Transactional outbox behavior

A successful state transition must insert the corresponding outbox record in
the same PostgreSQL transaction.

Conceptual transaction:

```text
BEGIN

validate current state
lock authoritative records
apply booking or waitlist transition
write idempotency result
write audit record
write outbox event

COMMIT
```

When any required write fails:

```text
ROLLBACK
```

After rollback:

- No successful booking or waitlist mutation remains.
- No completed idempotency result remains.
- No successful audit record remains.
- No successful outbox event remains.

## 10. Outbox dispatch status

Task 04 has one state: `dispatch_status = not_dispatched`. No delivery attempt
has occurred. The row also carries `synthetic_marker` and `source_capability`
to prove its synthetic stub boundary. A future Task 07 design may define its
own delivery work state after separate authorization, but Task 04 never writes
provider-facing or delivered states.

## 11. Outbox worker boundary

The current Task 04 prototype may include only a no-delivery synthetic worker
or test harness.

The worker may:

- Read a bounded set of synthetic outbox records.
- Validate event schemas.
- Validate synthetic markers.
- Verify that production delivery is disabled.
- Set `aggregate_version_superseded` or `cleanup_eligible_at_utc` only under
  the reviewed synthetic cleanup rules, without changing `dispatch_status`.
- Produce payload-free test evidence.

The worker must not:

- Resolve a real recipient.
- Read production contact data.
- Render a production template.
- Call a provider.
- Make an external network request.
- Generate a calendar file.
- Mark a message sent or delivered.
- Accept an unsecured reply.
- Alter authoritative booking state.

## 12. Task 07 consumer preconditions

Before Task 07 may consume a Task 04 event for production delivery, Task 07
must verify:

1. Production delivery is explicitly authorized.
2. The event type and schema version are supported.
3. The event is from an approved environment.
4. The event is not synthetic.
5. The event identifier has not already produced the same communication
   effect.
6. The aggregate still exists.
7. The current aggregate version matches the event’s required state.
8. The event has not been superseded.
9. The event has not expired.
10. The booking or waitlist state still permits communication.
11. The communication purpose is approved.
12. The channel is approved.
13. The contact point is verified.
14. The contact-point version is current.
15. Consent is valid for the exact purpose, channel, custodian, and time.
16. Consent has not been withdrawn, revoked, expired, or superseded.
17. The contact is not suppressed, disputed, or changed.
18. Quiet hours are satisfied.
19. The message template and translation are approved.
20. The minimum necessary data contract is satisfied.
21. The kill switch is inactive.
22. Vendor and release gates are active.

Failure of any required condition blocks dispatch.

## 13. Appointment-version verification

Task 07 must verify the current authoritative booking version immediately
before dispatch.

Example:

```text
event:
booking.confirmed
aggregate_version: 4

current booking:
aggregate_version: 6
state: rescheduled
```

The original confirmation event is stale and must not be sent as though
version 4 were current.

The future consumer must identify whether the event is:

- Current.
- Superseded.
- Cancelled.
- Expired.
- Unknown.
- Requiring reconciliation.

## 14. Cancellation behavior

After a booking cancellation commits:

- Pending confirmation work for that booking version becomes stale.
- Pending reminders become stale.
- Future reminders for the cancelled booking must not be created.
- A cancellation acknowledgement may be considered only under an approved
  Task 07 policy.
- An unsecured reply cannot restore the booking.
- Delivery failure cannot restore the booking.

Task 04 remains authoritative for the cancelled state.

## 15. Rescheduling behavior

After rescheduling commits:

- The predecessor booking is no longer the active appointment.
- Pending reminders for the predecessor must be cancelled or superseded.
- The successor booking becomes the authoritative active appointment.
- A future confirmation or reminder must reference only the approved
  minimum details for the successor.
- Both appointment times must not be presented as simultaneously current.

Task 04 must emit enough opaque relationship metadata for Task 07 to reconcile
the predecessor and successor without including patient identity or message
content.

## 16. Waitlist-offer expiry behavior

A waitlist offer has a bounded acceptance window.

Task 07 must not dispatch or retry an offer message after:

- The offer was accepted.
- The offer was declined.
- The offer expired.
- The offer was cancelled.
- The capacity hold was released.
- The entry stopped satisfying the administrative `promotion_candidate`
  predicate.
- The event usefulness expiry passed.

A delayed provider result must not extend an offer.

Only Task 04 may determine the authoritative offer state.

## 17. Idempotency and duplicate handling

### 17.1 Producer idempotency

Task 04 command idempotency must prevent duplicate authoritative transitions
and duplicate event creation.

The same successful command retry must return the original result and event
reference.

### 17.2 Consumer idempotency

A future Task 07 consumer must deduplicate using:

- Event identifier.
- Communication purpose.
- Channel.
- Template version.
- Contact-point version.
- Other reviewed consumer scope.

The exact consumer key remains owned by Task 07.

### 17.3 Duplicate publication

The same outbox event may be observed more than once.

Repeated observation must not automatically create repeated delivery.

### 17.4 Duplicate source transitions

A database constraint and producer idempotency must prevent one authoritative
transition from generating multiple equivalent events.

## 18. Retry boundary

Task 04 may retry only the database transaction under its reviewed
idempotency and PostgreSQL rules.

Task 04 must not retry an external communication because it performs no
external communication.

Task 07 owns future dispatch retries.

Task 07 retries must not:

- Ignore current booking state.
- Ignore changed consent.
- Ignore changed contact.
- Ignore usefulness expiry.
- Switch to another channel without authorization.
- Create multiple unsafe messages.
- Treat an unknown provider outcome as a definite failure.

## 19. Unknown outcomes and reconciliation

### 19.1 Task 04 unknown database outcome

When a Task 04 client loses the response after a transaction may have
committed:

- Retry uses the same idempotency key.
- Task 04 returns the stored result.
- No duplicate event is created.

### 19.2 Future Task 07 unknown provider outcome

When a provider call has an unknown result:

- Task 07 must enter reconciliation.
- It must not immediately retry as though failure were proven.
- Task 04 booking state remains unchanged.
- Provider uncertainty must not alter appointment state.

### 19.3 Required reconciliation comparisons

A future integration must compare:

- Event identifier.
- Aggregate identifier.
- Aggregate version.
- Current authoritative state.
- Outbox state.
- Task 07 work-item state.
- Provider-attempt state.
- Contact-point version.
- Consent-policy version.
- Usefulness expiry.

## 20. Reordering behavior

Events may be observed out of order.

Example:

1. `booking.confirmed`
2. `booking.rescheduled`
3. The consumer receives the rescheduled event first.
4. The older confirmed event arrives later.

The consumer must use:

- Aggregate version.
- Event occurrence time.
- Current authoritative booking state.
- Supersession relationships.

The late older event must not cause an obsolete confirmation or reminder.

## 21. Event usefulness and expiry

Not every event remains useful forever.

Examples:

- A confirmation may become obsolete after cancellation.
- A reminder becomes useless after the appointment time.
- A waitlist offer becomes useless after offer expiry.
- A predecessor booking event becomes obsolete after rescheduling.

The production usefulness policy is owned by Task 07.

Task 04 may provide authoritative times required to evaluate usefulness but
must not invent:

- Reminder cadence.
- Quiet hours.
- Maximum retry duration.
- Contact timing.
- Escalation timing.
- Operational response promises.

## 22. Communication content boundary

Task 04 must not render message content.

A future Task 07 template must be separately reviewed.

Unsecured communication must never include:

- Appointment purpose.
- Symptoms.
- Diagnosis.
- Medication.
- Allergy.
- Pregnancy information.
- Health number.
- Internal patient identifier.
- Internal booking identifier.
- Internal assessment identifier.
- Caregiver identity.
- Pharmacist identity.
- Message excerpts.
- Bearer tokens.
- Management authority.
- Sensitive accessibility information.

External links must be generic or use an approved authority-preserving access
pattern.

A link itself must not disclose booking or identity information.

## 23. External replies

Task 04 does not accept email or SMS replies.

A future Task 07 unsecured reply must not directly:

- Confirm an appointment.
- Cancel an appointment.
- Reschedule an appointment.
- Accept a waitlist offer.
- Change a patient contact.
- Grant caregiver authority.

Recipients must be directed to an authenticated or otherwise approved booking
management path.

Inbound free text must remain disabled unless Task 07 provides an approved
PHI-capable storage and human-review boundary.

## 24. Consent boundary

Task 04 events do not prove consent.

An event means only that an administrative booking fact occurred.

It does not prove:

- Communication consent.
- Consent for a specific channel.
- Consent for a specific contact point.
- Consent for reminders.
- Consent for caregiver delivery.
- Consent for message content.
- Consent remains current.

Task 07 must re-evaluate consent immediately before dispatch.

## 25. Contact-verification boundary

Task 04 events do not prove that a contact destination is:

- Correct.
- Current.
- Verified.
- Owned by the intended recipient.
- Safe for the selected channel.
- Free from dispute or suppression.

Task 04 should not place a raw contact destination in the event.

Task 07 must obtain contact details through its approved authoritative
boundary.

## 26. Delegation boundary

A Task 04 delegated booking event may identify only that an authorized
delegated action occurred using opaque references where required.

It must not contain:

- Caregiver name.
- Relationship description.
- Legal documents.
- Grant evidence.
- Grant notes.
- Full grant object.

Task 07 must independently determine whether communication to a delegate is
authorized for:

- The specific subject.
- The specific purpose.
- The specific channel.
- The specific time.
- The current grant state.

An old Task 04 event does not preserve delegate authority after revocation or
expiry.

## 27. Calendar boundary

Task 04 does not generate `.ics` files or calendar invitations.

A future calendar handoff requires separate review of:

- Minimum appointment details.
- Calendar title.
- Location data.
- Description content.
- Alarm content.
- Organizer identity.
- Recipient authority.
- Update and cancellation semantics.
- Token and URL safety.
- Calendar-provider privacy.
- Rescheduling supersession.
- Timezone and DST behavior.

Calendar creation remains blocked until explicitly approved.

## 28. Provider boundary

Task 04 must not include provider-specific fields such as:

- Provider message ID.
- Provider recipient ID.
- Provider template ID.
- Provider routing key.
- Vendor account identifier.
- Vendor delivery status.
- Vendor webhook secret.

Provider integration belongs entirely to Task 07.

## 29. Privacy classification

### Task 04 event envelope

Proposed classification:

- `INTERNAL`
- `SECURITY_SENSITIVE`
- `SYNTHETIC` in the current environment

### Production event data

A future production event may still be personal-information-bearing even when
it contains only opaque identifiers.

Privacy owners must approve:

- Purpose.
- Data minimum.
- Access.
- Retention.
- Consumer.
- Residency.
- Backup handling.
- Deletion.
- Incident response.

Opaque does not automatically mean anonymous.

## 30. Logging and observability

Allowed payload-free operational metadata may include:

- Event type.
- Event schema version.
- Safe environment marker.
- Safe outcome category.
- Outbox-state category.
- Aggregate-type category.
- Transaction-duration bucket.
- Retry count.
- Reconciliation-finding category.
- Synthetic marker.

Logs must not include:

- Event payload dumps.
- Contact information.
- Raw aggregate identifiers where unnecessary.
- Raw event identifiers where unnecessary.
- Booking details.
- Appointment purpose.
- Message bodies.
- URLs containing references.
- Tokens.
- Consent documents.
- Provider payloads.
- SQL parameter values containing personal information.

## 31. Audit behavior

Task 04 audit records must remain distinct from communication content.

A Task 04 audit record may contain:

- Opaque audit identifier.
- Event type.
- Event schema version.
- Opaque aggregate reference.
- Opaque actor reference.
- Safe actor type.
- Prior state.
- Resulting state.
- Safe reason code.
- Occurrence time.
- Idempotency-record reference.
- Outbox-event reference.
- Synthetic marker.

It must not contain:

- Message body.
- Message subject.
- Recipient contact.
- Provider response.
- Patient name.
- Caregiver name.
- Clinical information.

Future Task 07 communication audit must reference the Task 04 event using
minimum necessary opaque linkage.

## 32. Retention boundary

Task 04 must not invent a production retention period for:

- Domain events.
- Outbox records.
- Consumer receipts.
- Message records.
- Provider responses.
- Webhook records.
- Reconciliation records.

The Task 04 retention proposal must distinguish:

- Technical recommendation.
- Product decision.
- Privacy or legal decision.
- Approved production policy.

Task 07 remains responsible for communication-record retention proposals.

Task 04 remains responsible for booking-domain event retention proposals.

Cross-task deletion must preserve required referential and audit integrity.

## 33. Kill-switch behavior

### Task 04 kill switch

When Task 04 is disabled:

- New booking and waitlist transitions are denied according to the reviewed
  shutdown policy.
- No new Task 04 events are created for denied transitions.
- Existing committed outbox records remain preserved.
- No external fallback occurs.

### Task 07 kill switch

When Task 07 delivery is disabled:

- No external message is dispatched.
- Existing Task 04 events remain unchanged.
- Booking and waitlist state remain authoritative.
- Task 07 work may remain blocked, expired, cancelled, or pending
  reconciliation according to approved policy.
- Delivery must not automatically resume without current authorization checks.

### Independent operation

Disabling Task 07 must not corrupt booking state.

Disabling Task 04 must not authorize Task 07 to invent or modify booking state.

## 34. Failure behavior

| Failure | Required result |
|---|---|
| Booking transaction fails | No successful event remains |
| Audit insertion fails | Booking transaction rolls back |
| Outbox insertion fails | Booking transaction rolls back |
| Idempotency completion fails | Booking transaction rolls back |
| Synthetic worker fails | No delivery occurs |
| Unsupported event version | Consumer blocks and reconciles |
| Event is stale | No obsolete message is sent |
| Consent is missing | Dispatch blocked |
| Contact is unverified | Dispatch blocked |
| Offer expired | No offer message retry |
| Booking cancelled | Reminder work cancelled or superseded |
| Booking rescheduled | Predecessor work cancelled; successor re-evaluated |
| Provider outcome unknown | Task 07 reconciliation; no booking change |
| Provider unavailable | No alternate channel without approval |
| Kill switch active | No dispatch |
| Task 07 unavailable | Booking transaction may commit with `dispatch_status = not_dispatched`; no delivery is attempted |

## 35. Required Task 04 tests

### EVT-T04-01 — Event written with booking

Prove a successful booking state transition and event commit together.

### EVT-T04-02 — No event after rollback

Force a transaction failure and prove no successful event remains.

### EVT-T04-03 — Audit failure rollback

Force audit insertion failure and prove booking and outbox changes roll back.

### EVT-T04-04 — Outbox failure rollback

Force outbox insertion failure and prove booking and audit changes roll back.

### EVT-T04-05 — Command retry

Repeat one idempotent command and prove no duplicate event is created.

### EVT-T04-06 — Event payload minimum

Prove only approved fields are present.

### EVT-T04-07 — Forbidden-field rejection

Prove contact, clinical, token, and message fields cannot enter the event.

### EVT-T04-08 — Synthetic marker

Prove every prototype event is unmistakably synthetic.

### EVT-T04-09 — No external network

Prove event creation performs no external network call.

### EVT-T04-10 — No delivered state

Prove Task 04 cannot mark an event sent, delivered, read, or acknowledged.

### EVT-T04-11 — Cancellation event

Prove cancellation creates the correct versioned event once.

### EVT-T04-12 — Rescheduling relationship

Prove rescheduling records predecessor and successor references without
exposing identity information.

### EVT-T04-13 — Offer acceptance

Prove booking creation, hold consumption, offer acceptance, audit, idempotency,
and event records commit atomically.

### EVT-T04-14 — Offer expiry

Prove expiry releases capacity and creates only the reviewed event state.

### EVT-T04-15 — Concurrent command

Prove concurrent identical commands create one authoritative transition and
one event.

### EVT-T04-16 — Client injection

Prove a client cannot submit event type, scope, dispatch state, recipient, or
message content as authoritative values.

### EVT-T04-17 — Logging leakage

Prove forbidden markers do not appear in logs, errors, analytics, or evidence.

### EVT-T04-18 — Production denial

Prove synthetic event processing fails outside the approved synthetic
environment.

## 36. Future Task 07 integration tests

These tests belong to Task 07 or a separately approved cross-task integration
suite.

### EVT-T07-01 — Current-version verification

A stale event must not produce an obsolete message.

### EVT-T07-02 — Cancellation supersession

Cancellation must cancel pending reminders.

### EVT-T07-03 — Reschedule supersession

The predecessor reminder must be cancelled and the successor re-evaluated.

### EVT-T07-04 — Duplicate consumption

Repeated event consumption must not duplicate delivery.

### EVT-T07-05 — Consent recheck

Consent withdrawn after event creation must block dispatch.

### EVT-T07-06 — Contact-version recheck

A changed or disputed contact must block dispatch to the old destination.

### EVT-T07-07 — Offer expiry

A waitlist-offer event must not dispatch after the offer expires.

### EVT-T07-08 — Quiet hours

Dispatch must follow the approved timezone and quiet-hours policy.

### EVT-T07-09 — Provider unknown outcome

The consumer must enter reconciliation rather than unsafe immediate retry.

### EVT-T07-10 — Kill switch

The communication kill switch must prevent dispatch without changing booking
state.

### EVT-T07-11 — Wrong-recipient protection

A wrong-number or wrong-recipient report must not confirm a patient
relationship.

### EVT-T07-12 — Unsecured reply boundary

An email or SMS reply must not alter an appointment.

### EVT-T07-13 — Content minimum

Unsecured templates must contain no prohibited booking or clinical detail.

### EVT-T07-14 — Cross-subject isolation

One subject’s event must never resolve another subject’s contact.

### EVT-T07-15 — Delegation revocation

A delegate whose authority was revoked after event creation must not
automatically receive a message.

## 37. Synthetic fixtures

Required Task 04 event fixtures include:

- Booking-created event.
- Booking-confirmed event.
- Booking-cancelled event.
- Booking-rescheduled event.
- Waitlist-joined event.
- Waitlist-cancelled event.
- Offer-created event.
- Offer-accepted event.
- Offer-expired event.
- Superseded event.
- Expired-before-dispatch event.
- Unsupported-schema-version event.
- Duplicate event identifier.
- Duplicate aggregate transition.
- Cross-pharmacy database negative-test event fixture.
- Event containing a forbidden marker.
- Event missing a synthetic marker.
- Event incorrectly marked delivered.
- Stale aggregate-version event.

Fixtures must use deterministic synthetic identifiers.

## 38. Architecture tests

Architecture tests must fail when:

- Task 04 imports an email provider.
- Task 04 imports an SMS provider.
- Task 04 imports a push provider.
- Task 04 imports a calendar provider.
- Task 04 imports a webhook-delivery client.
- Task 04 performs an external network request.
- Task 04 renders a production communication template.
- Task 04 stores a message body in the outbox.
- Task 04 stores contact data in the outbox.
- Task 04 accepts dispatch status from a client.
- Task 04 marks an event delivered.
- A complete booking, patient, caregiver, contact, or identity object enters an
  event.
- A production Task 07 adapter becomes reachable from the synthetic sandbox.

## 39. Evidence requirements

Evidence should record:

- Test identifier.
- Source commit.
- Event catalogue version.
- Event schema version.
- Fixture-set version.
- PostgreSQL version where applicable.
- Expected result.
- Actual result.
- Pass, fail, or blocked status.
- Sanitized artifact reference.
- Artifact hash where applicable.
- Reviewer.
- Review date.

Evidence must not contain:

- Event payloads with personal information.
- Contact destinations.
- Management credentials.
- Raw idempotency keys.
- Production identifiers.
- Provider credentials.
- Message bodies.
- URLs containing booking references.

## 40. Task 07 handoff package

Before production integration, Task 04 must provide Task 07 with:

1. Approved event catalogue.
2. Exact event schema versions.
3. Event JSON schemas or strict Zod equivalents.
4. Aggregate-version semantics.
5. Current-state query contract.
6. Cancellation semantics.
7. Rescheduling predecessor/successor semantics.
8. Waitlist-offer expiry semantics.
9. Event usefulness fields.
10. Producer idempotency guarantees.
11. Duplicate-publication expectations.
12. Protected server-only `PHARMACY_ID` scope contract.
13. Privacy classification.
14. Prohibited-field list.
15. Test fixtures.
16. Contract-test suite.
17. Kill-switch behavior.
18. Reconciliation expectations.
19. Retention dependencies.
20. Exact unresolved approvals.

Task 07 must not infer missing semantics.

## 41. Task 07 decisions still required

Task 07 must define and obtain approval for:

- Communication purposes.
- Permitted channels.
- Consent wording.
- Consent scope.
- Consent expiry.
- Withdrawal behavior.
- Authorized-agent communication rules.
- Contact-verification process.
- Contact-change process.
- Channel preferences.
- Quiet hours.
- Timezone policy.
- Reminder cadence.
- Message usefulness expiry.
- Retry behavior.
- Unknown-provider-outcome reconciliation.
- Approved message templates.
- Approved subject lines.
- Approved sender names.
- Approved translations.
- Opt-out language.
- Wrong-recipient handling.
- Bounce and complaint handling.
- Vendor selection.
- Vendor contracts.
- Data residency.
- Subprocessors.
- Provider security.
- Provider webhook verification.
- Communication retention.
- Incident response.
- Operational support.
- Production kill switch.
- Production release authorization.

Task 04 must not invent these decisions.

## 42. Production blockers

Production event consumption and delivery remain blocked until:

- Task 04 synthetic event contract passes.
- Task 04 database and concurrency evidence passes.
- Task 05 production identity and delegation are approved.
- Task 07 communication policy is approved.
- Task 07 consent model is approved.
- Task 07 contact verification is approved.
- Task 07 templates are approved.
- Privacy review is complete.
- Security review is complete.
- Accessibility review is complete.
- Professional review is complete where required.
- Vendor due diligence is complete.
- Applicable legal review is complete.
- Task 11 release approval is recorded.
- Production configuration is explicitly authorized.
- Production kill, rollback, reconciliation, and incident plans are approved.

## 43. Stop conditions

Stop the affected workstream when:

- Task 04 must send a message directly.
- Task 04 must resolve a real recipient.
- Contact information must enter a Task 04 event.
- Clinical information must enter an event.
- A raw management credential must enter an event.
- A message body must enter the outbox.
- An event must grant booking authority.
- Task 07 requires an unsupported or ambiguous event version.
- Cancellation or rescheduling cannot supersede pending communication work.
- Duplicate events can create duplicate external effects.
- A rollback leaves a successful event.
- An outbox failure leaves committed booking state.
- A delivery result would modify authoritative booking state.
- An unsecured reply would modify a booking.
- A production provider or external network call becomes reachable.
- Consent, contact, cadence, template, retention, or vendor policy would need
  to be guessed.
- Required tests are skipped or converted into non-blocking checks merely to
  obtain a pass.

Independent synthetic contract work may continue while production delivery is
blocked.

## 44. Open decisions

The following remain unresolved:

- Final event serialization format.
- Final outbox table structure.
- Final event retention.
- Final outbox retention.
- Final event usefulness fields.
- Final aggregate-version query contract.
- Final Task 07 consumer identity.
- Final delivery-purpose vocabulary.
- Final communication-policy reference format.
- Final production event transport.
- Final consumer acknowledgement model.
- Final dead-letter and reconciliation workflow.
- Final provider integration.
- Final reminder cadence.
- Final message templates.
- Final consent rules.
- Final contact rules.
- Final production support owner.

## 45. Current conclusion

Task 04 will create only minimal, versioned, synthetic domain events and
transactional outbox records.

The events will commit atomically with booking and waitlist state, contain no
contact or clinical information, and remain explicitly not dispatched.

Task 07 owns all future communication consent, contact verification, templates,
scheduling, provider integration, delivery, retries, reconciliation, opt-out,
and incident handling.

No external notification delivery is authorized or implemented by Task 04.
