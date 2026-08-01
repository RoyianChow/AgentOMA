# Task 04 — API and Zod Contracts

**Status:** Draft for review
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Database implementation:** Blocked pending revised Task 01 approval

## 1. Purpose

This document defines the request, response, validation, idempotency, and safe
error contracts for the synthetic Task 04 booking and waitlist prototype.

Every external boundary must use a strict Zod object that:

- Rejects unknown fields.
- Allowlists every enum.
- Bounds every string, array, and date range.
- Validates dates and timezone identifiers server-side.
- Rejects unexpected free text.
- Rejects client-supplied authority and scope.
- Applies request-size limits.
- Returns stable, non-sensitive errors.
- Never logs raw input.

Zod validation confirms only that an input has an allowed shape. It does not
prove authorization, current capacity, current state, ownership, delegated
authority, or successful booking.

## 2. Shared conventions

### 2.1 Strict objects

Every schema must use strict-object behaviour.

Unexpected properties cause the entire request to fail rather than being
silently ignored.

Example forbidden properties include:

- `patientId`
- `subjectId`
- `caregiverId`
- `pharmacyId`
- `tenantId`
- `staffId`
- `role`
- `capacity`
- `remainingCapacity`
- `waitlistPosition`
- `confirmed`
- `authorizationResult`
- `delegationApproved`
- `createdBy`
- `internalStatus`

These values must be obtained from trusted server context or server-owned
records.

### 2.2 Opaque references

Client-visible references must:

- Be opaque.
- Be non-sequential.
- Have a bounded length.
- Contain no names, emails, telephone numbers, health numbers, dates of birth,
  pharmacy configuration, or clinical information.
- Be revalidated server-side before use.

A valid-looking reference does not prove that its resource exists or that the
actor may access it.

### 2.3 Date and timezone rules

- Stored timestamps are represented in UTC.
- Display timezone is an allowlisted IANA timezone.
- The initial synthetic Ontario timezone is `America/Toronto`.
- Date ranges must have an explicit maximum size.
- Start dates must not occur after end dates.
- Invalid, ambiguous, stale, or unsupported date values fail closed.
- Daylight-saving transitions must be handled explicitly during testing.

### 2.4 String and array limits

Every string and array must have an explicit maximum.

No command may accept:

- Unrestricted notes.
- Reason-for-visit text.
- Symptoms.
- Diagnoses.
- Medication details.
- Clinical history.
- Health-card information.
- Arbitrary metadata.
- Arbitrary URLs.
- Arbitrary event names.
- Arbitrary error or reason codes.

### 2.5 Contact normalization

Minimum necessary synthetic contact information may be normalized only after
the input passes initial validation.

Normalization must not:

- Convert invalid input into valid input.
- Change the intended destination.
- Print the original or normalized value to logs.
- Place contact information in a URL, token, event, audit reference, or
  idempotency key.

## 3. Shared enums

### Appointment modality

```text
in_person
telephone
video
```

### Language preference

Synthetic allowlisted examples:

```text
english
french
other_supported
contact_required
```

The production language catalogue remains a product decision.

### Accessibility preference

```text
none_selected
mobility_support
hearing_support
vision_support
communication_support
contact_about_accommodation
```

No medical explanation may be requested.

### Coarse availability state

```text
available
limited
waitlist_only
unavailable
```

The response must not expose exact remaining capacity.

### Booking state

```text
pending_confirmation
confirmed
cancelled
rescheduled
expired
```

### Waitlist state

```text
active
offered
promoted
cancelled
expired
```

### Waitlist-offer state

```text
pending
accepted
declined
expired
cancelled
```

### Safe error code

```text
REQUEST_INVALID
NOT_AUTHORIZED
RESOURCE_UNAVAILABLE
SLOT_NO_LONGER_AVAILABLE
INVALID_TRANSITION
LINK_EXPIRED
ACTION_ALREADY_COMPLETED
REQUEST_IN_PROGRESS
WAITLIST_OFFER_EXPIRED
RATE_LIMIT_REACHED
RECOVERY_REQUIRED
TEMPORARILY_UNAVAILABLE
```

Unknown enum values fail validation.

## 4. Standard response envelopes

### Successful response

```text
success: true
data: command-specific minimized response
receiptId: opaque idempotency receipt where applicable
```

### Failed response

```text
success: false
error:
  code: stable allowlisted safe error code
  message: plain-language safe message
  correlationId: optional opaque safe identifier
```

Responses must not contain:

- Stack traces.
- SQL details.
- Zod issue paths that expose internal structure.
- Raw request values.
- Internal table or column names.
- Internal identifiers.
- Exact capacity.
- Waitlist rank.
- Another actor’s resource existence.
- Authorization-policy details.

## 5. Public availability query

### Request fields

```text
serviceCategoryRef: optional opaque public service reference
modality: optional allowlisted appointment modality
startDate: ISO date
endDate: ISO date
timezone: allowlisted IANA timezone
cursor: optional opaque pagination cursor
pageSize: bounded integer
```

### Validation

- Reject unknown fields.
- Require a bounded date window.
- Reject unsupported timezone identifiers.
- Reject unbounded page sizes.
- Reject internal slot, pharmacy, tenant, staff, or capacity fields.
- Reject arbitrary sorting and filtering.
- Apply enumeration and request-rate protection.

### Response fields

```text
serviceCategory:
  ref
  label
modality
publicLocationLabel
startTimeUtc
endTimeUtc
displayTimezone
availabilityState
slotReference
slotReferenceExpiresAt
nextCursor
```

The response must not include exact capacity, staff identity, booking totals,
waitlist totals, or private schedules.

## 6. Booking creation

### Request fields

```text
slotReference
serviceCategoryRef
modality
languagePreference
accessibilityPreferences
contactMethod
contactValue
waitlistOptIn
administrativeAcknowledgements
idempotencyKey
```

### Administrative acknowledgements

The synthetic schema may require acknowledgement that:

- The service is administrative.
- It is not monitored for symptoms or emergencies.
- Medical details must not be entered.
- Submission is not a clinical assessment.
- A request is not confirmed until its status says so.

### Validation

- Require an unexpired opaque slot reference.
- Bound accessibility selections.
- Reject all unrestricted free text.
- Reject patient, subject, caregiver, pharmacy, tenant, role, state, capacity,
  and authorization fields.
- Validate contact method and contact value together.
- Require a bounded idempotency key.
- Reject unknown acknowledgement names.

### Server checks after Zod

The server must independently derive and verify:

- Actor.
- Subject.
- Pharmacy scope.
- Delegated authority, when applicable.
- Current slot.
- Service category.
- Modality.
- Current capacity.
- Booking policy.
- Idempotency ownership.

### Response fields

```text
bookingReference
status
serviceCategoryLabel
modality
startTimeUtc
endTimeUtc
displayTimezone
managementPathState
receiptId
syntheticNotice
```

The response must not claim clinical approval, eligibility, safety, payment, or
guaranteed service.

## 7. Booking retrieval

### Request fields

```text
bookingReference
managementCredential
```

The management credential is presented through an approved secure channel and
must not be placed in a query string.

### Validation and authorization

- Validate shape and bounds.
- Hash or digest the presented credential before comparison.
- Recheck expiry, revocation, scope, actor binding, subject binding, and current
  server authorization.
- Return the same safe denial shape whether the booking does not exist or is not
  accessible.

### Response fields

```text
bookingReference
status
serviceCategoryLabel
modality
startTimeUtc
endTimeUtc
displayTimezone
allowedActions
syntheticNotice
```

Only actions currently permitted by the server may appear.

## 8. Booking cancellation

### Request fields

```text
bookingReference
managementCredential
safeCancellationReasonCode
idempotencyKey
```

No unrestricted cancellation explanation is accepted.

### Server checks

- Current actor and subject authority.
- Booking is currently cancellable.
- Management credential remains valid.
- Idempotency key matches the canonical request.
- Capacity has not already been released.

### Response fields

```text
bookingReference
status: cancelled
capacityReleaseState
receiptId
```

The client receives no internal capacity value.

## 9. Booking rescheduling

### Request fields

```text
bookingReference
replacementSlotReference
managementCredential
idempotencyKey
```

### Validation

- Original and replacement references must be distinct.
- Reject client-supplied old/new capacity or booking states.
- Reject stale or malformed slot references.
- Reject all unrestricted free text.

### Transaction requirement

The server must preserve the original booking unless the complete replacement
transaction succeeds.

### Response fields

```text
originalBookingReference
originalStatus: rescheduled
replacementBookingReference
replacementStatus
startTimeUtc
endTimeUtc
displayTimezone
receiptId
```

## 10. Waitlist join

### Request fields

```text
serviceCategoryRef
modalityPreference
languagePreference
accessibilityPreferences
contactMethod
contactValue
administrativeAcknowledgements
idempotencyKey
```

### Validation and server checks

- Service category must permit waitlisting.
- Actor and subject are server-derived.
- A conflicting live entry must not already exist.
- No exact priority or rank may be client-supplied.
- No reason-for-visit or medical details may be accepted.

### Response fields

```text
waitlistReference
status: active
serviceCategoryLabel
modalityPreference
receiptId
syntheticNotice
```

Do not return exact waitlist position or estimated clinical priority.

## 11. Waitlist cancellation

### Request fields

```text
waitlistReference
managementCredential
idempotencyKey
```

### Response fields

```text
waitlistReference
status: cancelled
offerState
receiptId
```

Any active offer and hold must be cancelled transactionally by the service.

## 12. Waitlist-offer acceptance

### Request fields

```text
offerReference
managementCredential
idempotencyKey
```

### Server checks

- Offer is pending.
- Offer has not expired.
- Waitlist entry remains eligible.
- Capacity hold remains active.
- Actor and subject authorization remain current.
- Idempotency request matches any prior use.

### Response fields

```text
offerReference
offerStatus: accepted
waitlistReference
waitlistStatus: promoted
bookingReference
bookingStatus
receiptId
```

A retry must return the same booking reference.

## 13. Management-link recovery

### Request fields

```text
recoveryReference
recoveryAction
idempotencyReceipt
```

Allowlisted recovery actions may include:

```text
check_status
request_fresh_access
restart_booking
reauthenticate
```

### Behaviour

Recovery must support:

- Expired links.
- Consumed links.
- Revoked links.
- Unknown final status after timeout.
- Stale slot selection.
- Expired offers.
- Session expiry.

### Response fields

```text
recoveryState
allowedNextAction
safeMessage
receiptStatus
```

The response must not confirm whether an unrelated booking, account, contact
destination, or waitlist entry exists.

## 14. Pharmacist queue query

### Request fields

```text
statusFilter
serviceCategoryFilter
modalityFilter
dateStart
dateEnd
cursor
pageSize
```

The client must not provide:

- Pharmacy or tenant scope.
- Staff assignment authority.
- Patient or subject scope.
- Arbitrary sort expressions.
- Clinical priority.
- Billing eligibility.
- Exact capacity filters.

### Server authority

The server derives:

- Synthetic staff actor.
- Synthetic pharmacy scope.
- Permitted queue states.
- Safe display ordering.

### Response fields

Queue items may contain only:

```text
queueItemReference
bookingOrWaitlistReference
administrativeState
serviceCategoryLabel
modality
scheduledTimeUtc
displayTimezone
safeOperationalReason
allowedAdministrativeActions
```

Queue items must not contain clinical details, health-card information,
unnecessary contact information, or claims information.

## 15. Domain-event envelope

### Required fields

```text
eventId
eventType
eventVersion
aggregateType
aggregateReference
occurredAtUtc
actorType
safeReasonCode
syntheticMarker
dispatchState
```

### Validation

- Event type must be allowlisted.
- Event version must be supported.
- Aggregate type must be allowlisted.
- References must be opaque and bounded.
- Timestamps must be valid UTC values.
- `syntheticMarker` must prove the event belongs to the sandbox.
- Unknown event types fail closed.

### Prohibited fields

- Patient name.
- Email or telephone number.
- Health-card information.
- Symptoms or clinical details.
- Appointment purpose.
- Management tokens.
- Raw idempotency keys.
- External destinations.
- Notification message bodies.

Task 04 events never send messages.

## 16. Idempotency contract

The following commands require idempotency:

- Booking creation.
- Booking cancellation.
- Booking rescheduling.
- Waitlist joining.
- Waitlist cancellation.
- Promotion-offer creation.
- Offer acceptance.

The idempotency record is bound to:

- Trusted actor.
- Operation.
- Resource scope.
- Canonical request fingerprint.

Required results:

| Situation | Result |
|---|---|
| Same key and same request after completion | Return original safe result |
| Same key and different request | Reject safely |
| Same key during active execution | Return `REQUEST_IN_PROGRESS` |
| Concurrent identical requests | One committed domain effect |
| Transaction failure before commit | No successful receipt |
| Timeout after commit | Recover original result through receipt |

Idempotency records must not contain unnecessary contact information, clinical
information, raw credentials, or PHI.

Retention and cleanup remain blocked pending an approved retention policy.

## 17. Safe error contract

| Code | Safe message purpose |
|---|---|
| `REQUEST_INVALID` | The submitted request cannot be processed |
| `NOT_AUTHORIZED` | The action is unavailable for the current access path |
| `RESOURCE_UNAVAILABLE` | The requested resource is unavailable |
| `SLOT_NO_LONGER_AVAILABLE` | The selected time can no longer be booked |
| `INVALID_TRANSITION` | The requested action is unavailable in the current state |
| `LINK_EXPIRED` | The management access path has expired |
| `ACTION_ALREADY_COMPLETED` | The action was already completed |
| `REQUEST_IN_PROGRESS` | The request is still being processed |
| `WAITLIST_OFFER_EXPIRED` | The offer is no longer active |
| `RATE_LIMIT_REACHED` | Too many requests were submitted |
| `RECOVERY_REQUIRED` | A safe recovery step is required |
| `TEMPORARILY_UNAVAILABLE` | The service cannot complete the request now |

Errors must never expose:

- Another patient occupying a slot.
- Whether another person’s booking exists.
- Internal identifiers.
- SQL, Zod, stack, or filesystem details.
- Contact details.
- Exact capacity.
- Waitlist rank.
- Tenant configuration.
- Authorization-rule internals.
- Raw third-party responses.

## 18. Logging and evidence

Validation and command logs may contain only:

- Safe operation name.
- Safe result category.
- Synthetic actor type.
- Opaque correlation identifier.
- Duration category.
- Synthetic environment marker.

Logs must not contain:

- Request or response bodies.
- Raw validation input.
- Contact values.
- Management credentials.
- Slot tokens.
- Idempotency keys.
- Booking or waitlist details.
- Clinical information.

## 19. Request limits

The implementation must define and test:

- Maximum request-body size.
- Maximum page size.
- Maximum date range.
- Maximum number of accessibility selections.
- Maximum string lengths.
- Maximum retry rate.
- Maximum concurrent requests per synthetic actor.
- Safe behaviour when limits are exceeded.

No file uploads are required for Task 04. Unexpected multipart or upload
requests must be rejected.

## 20. Implementation boundary

This document defines contracts only.

No database schema, PostgreSQL dependency, Docker configuration, Drizzle
dependency, server action, route handler, or production integration will be
added until the applicable sandbox approval and Task 11 review are recorded.