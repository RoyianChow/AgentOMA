# Task 04 — API and Zod Contracts

**Status:** Draft documented; review/correction in progress; runtime not implemented
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Synthetic implementation:** Approved on 2026-08-02 through 2026-08-05
**Task 11 Checkpoint 1:** `APPROVED_TO_IMPLEMENT_SYNTHETIC`
**Risk/autonomy:** `R3`; `A3_BOUNDED_AUTOMATION`
**Expiry/review due:** 2026-08-05
**Governance roles:** Accountable owner, backup owner, and Operations/SRE
reviewer: Royian Chowdhury (consolidated, non-independent)

Production, G2, G3, live data, cloud databases, external effects, and
production imports remain prohibited. Royian Chowdhury holds the accountable
owner, backup owner, and Operations/SRE reviewer roles; this consolidated
coverage is non-independent. Every server boundary binds tenancy to server-only
`PHARMACY_ID`, derived only from sandbox-owned
`TASK04_SANDBOX_PHARMACY_ID`; requests contain no pharmacy or tenant selector.

## Canonical planning references

This file is canonical for shared boundary fields, enums, synthetic contact,
the command/action/permission/boundary registry, queue projection/query, event
discriminated union, error registry/subsets, and `queue:read`. Transitions are canonical in
[`state-machines.md`](state-machines.md); evidence mapping is canonical in
section 11.1 of
[`pre-implementation-test-plan.md`](pre-implementation-test-plan.md).

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

Every request, response, nested object, and event object uses Zod
strict-object behaviour. Unknown properties fail the whole parse.

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

Canonical scalar schemas are:

| Schema | Exact type and bound | Normalized output |
|---|---|---|
| `OpaqueReference` | String, 16-160 characters, base64url alphabet `[A-Za-z0-9_-]` | Unchanged; surrounding whitespace is invalid |
| `SyntheticContactReference` | String, 16-96 characters, pattern `SYNTH-CONTACT-[A-Z0-9_-]+` | Uppercase; must resolve to a deterministic server-owned fixture |
| `ManagementCredential` | String, 32-256 characters, base64url alphabet | Unchanged; immediately digested server-side |
| `SandboxPharmacyId` | String, 16-96 characters, pattern `SYNTH-PHARMACY-[A-Z0-9_-]+` | Uppercase; loaded only from the sandbox-owned server configuration described below |
| `IdempotencyKey` | String, 16-128 characters, alphabet `[A-Za-z0-9_-]` | Unchanged; stored only as a digest |
| `Cursor` | String, 16-256 characters, base64url alphabet | Unchanged; signed and scope-bound |
| `CalendarDate` | String exactly `YYYY-MM-DD`, then Gregorian round-trip validation | Same calendar date |
| `UtcInstant` | RFC 3339 string with a literal `Z` and millisecond precision | Canonical UTC ISO string |
| `IanaTimezone` | String, 1-64 characters, valid through the runtime IANA database and present in `TASK04_SUPPORTED_DISPLAY_TIMEZONES` | Canonical allowlisted identifier |
| `CorrelationId` | Server-generated opaque string, 16-80 characters | Never accepted from a request |

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
- Display timezone is an `IanaTimezone`.
- The pharmacy calendar timezone comes from trusted configuration; the initial
  synthetic value is `America/Toronto`.
- Availability ranges are inclusive calendar dates. `startDate` must be on or
  after the current pharmacy-calendar date, `endDate >= startDate`, and the
  inclusive span must not exceed `TASK04_MAX_AVAILABILITY_WINDOW_DAYS`.
- Start dates must not occur after end dates.
- Invalid, ambiguous, stale, or unsupported date values fail closed.
- Commands use opaque slot references and do not accept local appointment
  timestamps, avoiding client-side resolution of ambiguous/nonexistent times.
- Daylight-saving transitions must be handled explicitly during testing.

### 2.4 String and array limits

Every string and array must have an explicit maximum. The synthetic
implementation must define positive integer configuration values for:

- `TASK04_MAX_REQUEST_BYTES`
- `TASK04_MAX_PAGE_SIZE`
- `TASK04_MAX_AVAILABILITY_WINDOW_DAYS`
- `TASK04_MAX_ACCESSIBILITY_SELECTIONS`

Those four required values are validated at startup and fail closed when
absent or invalid. `TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS` is
optional: absence disables caching; when present it must be an integer from 1
through 60, and a malformed value fails startup closed.

The synthetic implementation obtains its one pharmacy scope from the
sandbox-owned server configuration key `TASK04_SANDBOX_PHARMACY_ID`. The
sandbox loader validates it as `SandboxPharmacyId` and exposes it to Task 04
domain services as the canonical server-only `PHARMACY_ID`. It must not inherit
or read a production pharmacy identifier, and it must never accept pharmacy
scope from a browser, URL, session claim, credential, QR code, or request. A
missing, malformed, expired-scope, or non-synthetic value prevents Task 04
startup. Additional pharmacy identifiers exist only inside isolated database
negative-test fixtures.

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

### 2.5 Synthetic contact reference

The synthetic boundary accepts only `SyntheticContactReference`, never an
email address or telephone number. Parsing uppercases the reference, validates
the exact pattern and bound, and then requires a server-side match to a
deterministic Task 01 fixture. An unknown reference returns `REQUEST_INVALID`.
No external delivery occurs. Production contact capture, verification,
normalization, consent, and delivery remain Task 07 decisions.

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
no_preference
english
french
interpretation_coordination_requested
```

The production language catalogue remains a product decision.

### Accessibility preference

```text
none
mobility_preparation
hearing_preparation
vision_preparation
communication_preparation
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
IDEMPOTENCY_KEY_CONFLICT
WAITLIST_OFFER_EXPIRED
RATE_LIMIT_REACHED
RECOVERY_REQUIRED
TEMPORARILY_UNAVAILABLE
FEATURE_DISABLED
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

## 4A. Canonical field-level schema catalogue

This section is the implementable source of truth for Task 04 boundary shapes.
The endpoint narratives that follow explain behavior but do not add fields or
enums. All object shapes below are strict, including nested objects. Every
successful endpoint response is:

| Field | Required | Schema | Rule |
|---|---|---|---|
| `success` | Yes | Literal `true` | Discriminator |
| `data` | Yes | Endpoint response-data schema | Strict object |
| `receiptId` | Command endpoints only | `OpaqueReference` | Server-generated idempotency receipt; absent for read-only endpoints |

Every failed response is:

| Field | Required | Schema | Rule |
|---|---|---|---|
| `success` | Yes | Literal `false` | Discriminator |
| `error` | Yes | Strict object | Contains only the three fields below |
| `error.code` | Yes | `SafeErrorCode` | Must be in the endpoint subset |
| `error.message` | Yes | String, 1-160 characters | Exact generic registry text in section 17 |
| `error.correlationId` | No | `CorrelationId` | Generated by the server; contains no input |

### 4A.1 Shared strict objects

`AdministrativeAcknowledgements` requires every literal boolean below. False,
missing, or additional properties fail validation:

| Field | Required value |
|---|---|
| `administrativeOnly` | `true` |
| `notMonitored` | `true` |
| `noMedicalDetails` | `true` |
| `notClinicalAssessment` | `true` |
| `statusControlsConfirmation` | `true` |

`AccessibilityPreferences` is a required array of unique
`AccessibilityPreference` values with 1 to
`TASK04_MAX_ACCESSIBILITY_SELECTIONS` entries. If `none` is selected, it must
be the only entry.

`ManagementAuthorization` is the following strict discriminated union and is
accepted only in an HTTPS POST body:

| `channel` discriminator | Required second field | Meaning |
|---|---|---|
| `server_session_bound` | `capabilityReference: OpaqueReference` | Reusable capability bound to the current independently authenticated synthetic session |
| `presented_credential` | `credential: ManagementCredential` | One-time bearer credential returned once through the issuance response and immediately digested before comparison |

No request may contain both fields. A capability reference is not authority by
itself: every protected boundary independently verifies the current session,
actor, subject/delegation authority, action permission, pharmacy scope, expiry,
revocation, and resource binding.

`CommandAuthorization` is the strict outer union used only by commands that
permit either management or staff:

| `actorBoundary` discriminator | Additional field | Required trusted actor |
|---|---|---|
| `management` | `managementAuthorization: ManagementAuthorization` | Current synthetic patient/delegate session |
| `staff_session` | None | Current synthetic staff session with the command’s exact permission |

The discriminator selects a parser and is not a role claim. The server rejects
it unless it matches the independently authenticated actor. No request accepts
a role, actor, subject, pharmacy, or permission field.

`ManagementCapabilitySummary` is a strict response object containing exactly:

| Field | Schema |
|---|---|
| `capabilityReference` | `OpaqueReference` |
| `usageMode` | Literal `reusable` |
| `permittedActions` | Unique array of 1 to 8 values from `booking:view`, `booking:cancel`, `booking:reschedule`, `waitlist:view`, `waitlist:leave`, `waitlist:offer:accept`, `waitlist:offer:decline`, `management:recover` |
| `expiresAtUtc` | `UtcInstant` |

The initial booking or waitlist command creates and binds this reusable
server-session capability in the same transaction. Its opaque reference may be
returned in the command response, but neither the reference nor any bearer
credential may be written to browser persistence, a URL, logs, analytics, or a
hydrated long-lived client prop.

### 4A.2 Public availability

Request:

| Field | Required | Schema | Refinement/normalization |
|---|---|---|---|
| `serviceCategoryRef` | No | `OpaqueReference` | Must resolve within server `PHARMACY_ID` |
| `modality` | No | `AppointmentModality` | Unchanged |
| `startDate` | Yes | `CalendarDate` | At/after current pharmacy-calendar date |
| `endDate` | Yes | `CalendarDate` | At/after `startDate`; inclusive configured range bound |
| `timezone` | Yes | `IanaTimezone` | Canonical allowlisted identifier |
| `cursor` | No | `Cursor` | Must match the canonical query fingerprint |
| `pageSize` | No | Integer 1 to `TASK04_MAX_PAGE_SIZE` | Defaults to configured server page size |

Response data:

| Field | Required | Schema | Bound |
|---|---|---|---|
| `items` | Yes | Array of strict `AvailabilityItem` | 0 to resolved page size |
| `nextCursor` | No | `Cursor` | Scope/query-bound |

`AvailabilityItem` contains exactly:

| Field | Required | Schema |
|---|---|---|
| `serviceCategoryRef` | Yes | `OpaqueReference` |
| `serviceCategoryLabel` | Yes | Server-owned string, 1-80 characters |
| `modality` | Yes | `AppointmentModality` |
| `publicLocationLabel` | Only for `in_person` | Server-owned string, 1-80 characters |
| `startTimeUtc` | Yes | `UtcInstant` |
| `endTimeUtc` | Yes | `UtcInstant`, later than start |
| `displayTimezone` | Yes | `IanaTimezone` |
| `availabilityState` | Yes | `CoarseAvailabilityState` |
| `slotReference` | Only for `available` or `limited` | `OpaqueReference` |
| `slotReferenceExpiresAtUtc` | When `slotReference` exists | `UtcInstant`, after response generation |

No exact capacity, staff identity, tenant data, or internal identifier is
returned.

### 4A.3 Booking creation

Request:

| Field | Required | Schema | Refinement/normalization |
|---|---|---|---|
| `slotReference` | Yes | `OpaqueReference` | Server resolves slot, service, modality, scope, policy, and current capacity |
| `languagePreference` | Yes | `LanguagePreference` | Unchanged |
| `accessibilityPreferences` | Yes | `AccessibilityPreferences` | Unique; `none` exclusive |
| `syntheticContactReference` | Yes | `SyntheticContactReference` | Uppercase fixture reference; no raw contact |
| `administrativeAcknowledgements` | Yes | `AdministrativeAcknowledgements` | All literal `true` |
| `idempotencyKey` | Yes | `IdempotencyKey` | Bound to actor, command, scope, and canonical fingerprint |

Response data:

| Field | Required | Schema |
|---|---|---|
| `bookingReference` | Yes | `OpaqueReference` |
| `status` | Yes | `pending_confirmation` or `confirmed` |
| `serviceCategoryLabel` | Yes | Server-owned string, 1-80 characters |
| `modality` | Yes | `AppointmentModality` |
| `startTimeUtc` | Yes | `UtcInstant` |
| `endTimeUtc` | Yes | `UtcInstant` |
| `displayTimezone` | Yes | `IanaTimezone` |
| `confirmationExpiresAtUtc` | Only for `pending_confirmation` | `UtcInstant` from the associated active hold |
| `managementCapability` | Yes | `ManagementCapabilitySummary` |
| `syntheticNotice` | Yes | Literal `SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY` |

`pending_confirmation` creation and its expiring active capacity hold are one
transaction. The hold counts against capacity; confirmation consumes it;
early cancellation releases it; clock expiry expires it.

### 4A.4 Booking retrieval

`BookingViewRequest` contains:

| Field | Required | Schema |
|---|---|---|
| `bookingReference` | Yes | `OpaqueReference` |
| `managementAuthorization` | Yes | `ManagementAuthorization` |

Response data:

| Field | Required | Schema |
|---|---|---|
| `bookingReference` | Yes | `OpaqueReference` |
| `status` | Yes | `BookingState` |
| `serviceCategoryLabel` | Yes | Server-owned string, 1-80 characters |
| `modality` | Yes | `AppointmentModality` |
| `startTimeUtc` | Yes | `UtcInstant` |
| `endTimeUtc` | Yes | `UtcInstant` |
| `displayTimezone` | Yes | `IanaTimezone` |
| `allowedActions` | Yes | Unique array of 1 to 2 values from `booking:cancel`, `booking:reschedule`, or the one-element literal array `["none"]` |
| `syntheticNotice` | Yes | Literal `SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY` |

### 4A.5 Booking cancellation

Request:

| Field | Required | Schema |
|---|---|---|
| `bookingReference` | Yes | `OpaqueReference` |
| `commandAuthorization` | Yes | `CommandAuthorization` |
| `idempotencyKey` | Yes | `IdempotencyKey` |

Response data contains exactly `bookingReference: OpaqueReference` and
`status: "cancelled"`.

### 4A.6 Booking rescheduling

Request:

| Field | Required | Schema | Refinement |
|---|---|---|---|
| `bookingReference` | Yes | `OpaqueReference` | Must differ from replacement slot reference |
| `replacementSlotReference` | Yes | `OpaqueReference` | Server revalidates all slot and scope facts |
| `commandAuthorization` | Yes | `CommandAuthorization` | Current scoped management or staff authority required |
| `administrativeAcknowledgements` | Yes | `AdministrativeAcknowledgements` | All literal `true` |
| `idempotencyKey` | Yes | `IdempotencyKey` | Canonical fingerprint includes both references |

Response data:

| Field | Required | Schema |
|---|---|---|
| `originalBookingReference` | Yes | `OpaqueReference` |
| `originalStatus` | Yes | Literal `rescheduled` |
| `replacementBookingReference` | Yes | `OpaqueReference` |
| `replacementStatus` | Yes | `pending_confirmation` or `confirmed` |
| `startTimeUtc` | Yes | `UtcInstant` |
| `endTimeUtc` | Yes | `UtcInstant` |
| `displayTimezone` | Yes | `IanaTimezone` |
| `confirmationExpiresAtUtc` | Only for `pending_confirmation` | `UtcInstant` |
| `managementCapability` | Yes | `ManagementCapabilitySummary` bound to the successor booking |

### 4A.7 Waitlist join

Request:

| Field | Required | Schema | Refinement/normalization |
|---|---|---|---|
| `serviceCategoryRef` | Yes | `OpaqueReference` | Service must currently permit waitlisting |
| `modalityPreference` | Yes | `AppointmentModality` | Exact modality used by `promotion_candidate` |
| `languagePreference` | Yes | `LanguagePreference` | Unchanged |
| `accessibilityPreferences` | Yes | `AccessibilityPreferences` | Unique; `none` exclusive |
| `syntheticContactReference` | Yes | `SyntheticContactReference` | Uppercase fixture reference |
| `administrativeAcknowledgements` | Yes | `AdministrativeAcknowledgements` | All literal `true` |
| `idempotencyKey` | Yes | `IdempotencyKey` | Bound to trusted scope |

Response data contains exactly `waitlistReference: OpaqueReference`,
`status: "active"`, `serviceCategoryLabel: string(1..80)`,
`modalityPreference: AppointmentModality`,
`managementCapability: ManagementCapabilitySummary`, and
`syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY"`.

Duplicate prevention permits one `active` or `offered` entry per
`(PHARMACY_ID, subject_reference, service_category_reference,
modality_preference)`.

### 4A.8 Waitlist leave

The command name is `waitlist:leave`.

Request:

| Field | Required | Schema |
|---|---|---|
| `waitlistReference` | Yes | `OpaqueReference` |
| `commandAuthorization` | Yes | `CommandAuthorization` |
| `idempotencyKey` | Yes | `IdempotencyKey` |

Response data contains exactly `waitlistReference: OpaqueReference`,
`status: "cancelled"`, and `offerState: "cancelled" | "not_applicable"`.
The transaction emits `waitlist.cancelled`; any early offer withdrawal changes
its active hold to `released`.

### 4A.9 Waitlist-offer acceptance

Request:

| Field | Required | Schema |
|---|---|---|
| `offerReference` | Yes | `OpaqueReference` |
| `managementAuthorization` | Yes | `ManagementAuthorization` |
| `administrativeAcknowledgements` | Yes | `AdministrativeAcknowledgements` |
| `idempotencyKey` | Yes | `IdempotencyKey` |

Response data contains exactly `offerReference: OpaqueReference`,
`offerStatus: "accepted"`, `waitlistReference: OpaqueReference`,
`waitlistStatus: "promoted"`, `bookingReference: OpaqueReference`, and
`bookingStatus: "confirmed"`, and
`managementCapability: ManagementCapabilitySummary` bound to the booking.
Acceptance atomically consumes the active hold.

### 4A.10 Management recovery

Request:

| Field | Required | Schema | Refinement |
|---|---|---|---|
| `managementAuthorization` | Yes | `ManagementAuthorization` | Never accepted in URL/query data |
| `recoveryAction` | Yes | `check_status`, `request_fresh_access`, `restart_booking`, or `reauthenticate` | Allowlisted |
| `idempotencyKey` | For `request_fresh_access` or `restart_booking` | `IdempotencyKey` | Forbidden for read-only actions |

Response data contains exactly `recoveryState:
"available" | "expired" | "consumed" | "revoked" | "unknown"`,
`allowedNextAction:
"check_status" | "request_fresh_access" | "restart_booking" |
"reauthenticate" | "none"`, and `messageCode:
"RECOVERY_CHECK_STATUS" | "RECOVERY_REQUEST_FRESH_ACCESS" |
"RECOVERY_RESTART_BOOKING" | "RECOVERY_REAUTHENTICATE" | "RECOVERY_NONE"`.
The client maps the code to the exact generic message registry below; the
server does not return free-form recovery text.
The shape and message do not disclose whether an unrelated record exists.

### 4A.11 Pharmacist queue

The exact staff permission is `queue:read`. It is derived from the authenticated
server actor and rechecked for every render and pagination request.

Request:

| Field | Required | Schema | Refinement |
|---|---|---|---|
| `status` | No | Unique array of `pending_confirmation`, `confirmed`, or `rescheduled`, minimum 1 and maximum 3 | No clinical states |
| `serviceCategoryRef` | No | `OpaqueReference` | Server `PHARMACY_ID` scope |
| `modality` | No | `AppointmentModality` | Unchanged |
| `startDate` | With `endDate` | `CalendarDate` | Both dates present or both absent |
| `endDate` | With `startDate` | `CalendarDate` | Inclusive configured range bound |
| `sort` | No | `start_time_asc` or `created_at_asc` | Defaults to `start_time_asc` |
| `cursor` | No | `Cursor` | Query/scope-bound |
| `pageSize` | No | Integer 1 to `TASK04_MAX_PAGE_SIZE` | Server default |

Response data contains `items` (0 to resolved page size), optional
`nextCursor`, `resultCompleteness`, `unavailableSourceCategories`,
`freshnessState`, `generatedAtUtc`, and `refreshGuidance`.

The strict response-level fields are:

| Field | Required | Schema | Rule |
|---|---|---|---|
| `resultCompleteness` | Yes | `complete` or `partial` | `complete` only when both projections were read successfully |
| `unavailableSourceCategories` | Yes | Unique array of `booking_projection` or `waitlist_promotion_projection`, maximum 2 | Empty only for `complete`; 1 to 2 entries for `partial` |
| `freshnessState` | Yes | `fresh` or `stale` | `stale` when any included projection exceeds its configured freshness bound |
| `generatedAtUtc` | Yes | `UtcInstant` | Trusted server time |
| `refreshGuidance` | Yes | `none`, `refresh_available`, `retry_later`, or `reauthenticate` | Server-derived; `none` only for complete/fresh results |

Each strict queue item contains exactly:

| Field | Required | Schema |
|---|---|---|
| `queueItemReference` | Yes | `OpaqueReference` |
| `syntheticSubjectLabel` | Yes | Server-owned synthetic string, 1-48 characters |
| `appointmentStartUtc` | Yes | `UtcInstant` |
| `appointmentEndUtc` | Yes | `UtcInstant` |
| `displayTimezone` | Yes | `IanaTimezone` |
| `serviceCategoryLabel` | Yes | Server-owned string, 1-80 characters |
| `modality` | Yes | `AppointmentModality` |
| `administrativeStatus` | Yes | `pending_confirmation`, `confirmed`, or `rescheduled` |
| `languagePreference` | Yes | `LanguagePreference` |
| `accessibilityPreferences` | Yes | `AccessibilityPreferences` |
| `source` | Yes | `booking` or `waitlist_promotion` |
| `createdAtUtc` | Yes | `UtcInstant` |
| `operationalReason` | Yes | `confirmation_required`, `appointment_upcoming`, or `recently_rescheduled` |
| `actionAvailability` | Yes | `permitted`, `not_permitted`, or `temporarily_blocked` |

No booking/waitlist aggregate reference, contact value, delegate detail,
clinical data, exact capacity, or pharmacy selector is projected.

### 4A.12 Additional strict command schemas

The following strict request/response-data schemas close the staff, management,
and worker boundaries. `expectedAggregateVersion` and `expectedSlotVersion`
are positive integers. Worker references are resolved again inside the
transaction and never select pharmacy scope.

| Schema | Exact request fields | Exact response-data fields |
|---|---|---|
| `BookingConfirmRequest` / `BookingConfirmResponse` | `bookingReference: OpaqueReference`; `expectedAggregateVersion: positive integer`; `idempotencyKey: IdempotencyKey` | `bookingReference: OpaqueReference`; `status: "confirmed"`; `holdStatus: "consumed"` |
| `BookingExpireRequest` / `BookingExpireResponse` | `bookingReference: OpaqueReference`; `expectedAggregateVersion: positive integer`; `idempotencyKey: IdempotencyKey` | `bookingReference: OpaqueReference`; `status: "expired"`; `holdStatus: "expired"` |
| `WaitlistViewRequest` / `WaitlistViewResponse` | `waitlistReference: OpaqueReference`; `managementAuthorization: ManagementAuthorization` | `waitlistReference: OpaqueReference`; `status: WaitlistState`; `modalityPreference: AppointmentModality`; `allowedActions: unique array of 1 to 3 values from "waitlist:leave", "waitlist:offer:accept", "waitlist:offer:decline", or the one-element literal array ["none"]`; optional `offerReference: OpaqueReference`; optional `offerExpiresAtUtc: UtcInstant`; `syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY"` |
| `WaitlistExpireRequest` / `WaitlistExpireResponse` | `waitlistReference: OpaqueReference`; `expectedAggregateVersion: positive integer`; `idempotencyKey: IdempotencyKey` | `waitlistReference: OpaqueReference`; `status: "expired"`; `offerStatus` is `cancelled` or `not_applicable` |
| `WaitlistPromoteRequest` / `WaitlistPromoteResponse` | `slotReference: OpaqueReference`; `expectedSlotVersion: positive integer`; `idempotencyKey: IdempotencyKey` | `promotionState` is `offered` or `no_eligible_entry`; optional `waitlistReference: OpaqueReference`; optional `offerReference: OpaqueReference`; optional `offerExpiresAtUtc: UtcInstant` |
| `WaitlistOfferCreateRequest` / `WaitlistOfferCreateResponse` | `waitlistReference: OpaqueReference`; `slotReference: OpaqueReference`; `expectedWaitlistVersion: positive integer`; `expectedSlotVersion: positive integer`; `idempotencyKey: IdempotencyKey` | `waitlistReference: OpaqueReference`; `waitlistStatus: "offered"`; `offerReference: OpaqueReference`; `offerStatus: "pending"`; `offerExpiresAtUtc: UtcInstant` |
| `WaitlistOfferDeclineRequest` / `WaitlistOfferDeclineResponse` | `offerReference: OpaqueReference`; `managementAuthorization: ManagementAuthorization`; `idempotencyKey: IdempotencyKey` | `offerReference: OpaqueReference`; `offerStatus: "declined"`; `waitlistReference: OpaqueReference`; `waitlistStatus: "cancelled"`; `holdStatus: "released"` |
| `WaitlistOfferWithdrawRequest` / `WaitlistOfferWithdrawResponse` | `offerReference: OpaqueReference`; `expectedAggregateVersion: positive integer`; `idempotencyKey: IdempotencyKey` | `offerReference: OpaqueReference`; `offerStatus: "cancelled"`; `waitlistReference: OpaqueReference`; `waitlistStatus` is `active`, `cancelled`, or `expired`; `holdStatus: "released"` |
| `ManagementCredentialIssueRequest` / `ManagementCredentialIssueResponse` | `capabilityReference: OpaqueReference`; `permittedAction: one of "booking:cancel", "booking:reschedule", "waitlist:leave", "waitlist:offer:accept", "waitlist:offer:decline"` | `credential: ManagementCredential`; `credentialReference: OpaqueReference`; `usageMode: "one_time"`; `permittedAction: same requested action`; `expiresAtUtc: UtcInstant` |
| `ManagementCredentialConsumeRequest` / `ManagementCredentialConsumeResponse` | `credentialReference: OpaqueReference`; `protectedAction: same one-time action enum`; `resourceReference: OpaqueReference`; `expectedAggregateVersion: positive integer`; `idempotencyKey: IdempotencyKey` | `credentialReference: OpaqueReference`; `status: "consumed"`; `consumedByAction: protectedAction` |
| `ManagementCredentialRevokeRequest` / `ManagementCredentialRevokeResponse` | Strict union: `{ revocationBoundary: "management"; capabilityReference: OpaqueReference; managementAuthorization: ManagementAuthorization; idempotencyKey: IdempotencyKey }`, `{ revocationBoundary: "staff_session"; capabilityReference: OpaqueReference; expectedAggregateVersion: positive integer; idempotencyKey: IdempotencyKey }`, or `{ revocationBoundary: "server_controlled"; capabilityReference: OpaqueReference; expectedAggregateVersion: positive integer; reason: "resource_terminal", "authority_revoked", or "successor_rotated"; idempotencyKey: IdempotencyKey }` | `capabilityReference: OpaqueReference`; `status: "revoked"` |
| `AutomationReconcileRequest` / `AutomationReconcileResponse` | `reconciliationRunReference: OpaqueReference`; `idempotencyKey: IdempotencyKey` | `reconciliationRunReference: OpaqueReference`; `status` is `completed` or `no_changes`; `processedCount: integer 0..TASK04_MAX_PAGE_SIZE` |
| `AutomationControlRequest` / `AutomationControlResponse` | `expectedControlVersion: positive integer`; `idempotencyKey: IdempotencyKey` | `automationState` is `enabled` or `disabled`; `controlVersion: positive integer` |

Issuance is the only boundary that returns a raw management credential. It
requires a current authenticated synthetic session already bound to the
capability and action. The raw value is returned exactly once through the
successful HTTPS POST response, is never stored server-side, and is never
included in an idempotency result. A lost response must use authenticated
`management:recover`; retrying issuance returns
`ACTION_ALREADY_COMPLETED` or `RECOVERY_REQUIRED`.

Issuance locks the reusable capability and enforces at most one active
one-time credential per `(capabilityReference, permittedAction)`. Concurrent
requests therefore produce one credential and one
`management_credential.issued` event; every loser receives the generic
duplicate/recovery result without another secret.

A one-time credential is consumed atomically only when its protected mutation
commits. Shape, authorization, state, concurrency, or transaction failures do
not consume it. A reusable server-session capability is never consumed by use;
it remains subject to action scope, expiry, revocation, and current session
authority. Rescheduling revokes the predecessor capability and creates a
successor-bound capability. Offer acceptance revokes the waitlist capability
and creates a booking-bound capability.

### 4A.13 Domain-event discriminated union

The internal event boundary is a strict discriminated union on `eventType`.
Every member contains this exact common envelope:

| Field | Required | Schema |
|---|---|---|
| `eventId` | Yes | `OpaqueReference` |
| `eventType` | Yes | Exact literal selecting one payload member below |
| `eventSchemaVersion` | Yes | Literal `1` for every currently planned synthetic union member; another value requires a new documented union member |
| `aggregateType` | Yes | `booking`, `waitlist_entry`, `waitlist_offer`, `capacity_hold`, `management_credential`, or `automation_control` |
| `aggregateId` | Yes | `OpaqueReference` |
| `aggregateVersion` | Yes | Positive integer equal to the committed aggregate version |
| `occurredAtUtc` | Yes | `UtcInstant` from trusted database time |
| `protectedScope` | Yes | Strict server-only object described below |
| `actorType` | Yes | `synthetic_patient`, `synthetic_delegate`, `synthetic_staff`, or `synthetic_system_worker` |
| `safeReasonCode` | Yes | Allowlisted server-derived code, 1-64 characters |
| `syntheticMarker` | Yes | Literal `SYNTHETIC_TASK_04_EVENT` |
| `sourceCapability` | Yes | Literal `TASK04_BOOKING_WAITLIST_SYNTHETIC` |
| `dispatchStatus` | Yes | Literal `not_dispatched` |
| `usefulnessExpiresAtUtc` | No | `UtcInstant`, later than occurrence |
| `aggregateVersionSuperseded` | Yes | Boolean; cleanup metadata only, initially `false` |
| `cleanupEligibleAtUtc` | No | `UtcInstant`; cleanup metadata only and never a dispatch instruction |
| `payload` | Yes | Exact strict payload selected by `eventType` |

`protectedScope` contains exactly
`pharmacyId: SandboxPharmacyId` equal to server-derived `PHARMACY_ID` and
`environment: "synthetic"`.
It is stored server-side, never accepted from a request, never used to switch
scope, and never returned by public or queue responses. Cross-pharmacy event
rows are permitted only as database negative-test fixtures.

The exact event members and payloads are:

| `eventType` (`aggregateType`) | Exact strict payload |
|---|---|
| `booking.created` (`booking`) | `resultingState` is `pending_confirmation` or `confirmed`; `modality: AppointmentModality`; `startTimeUtc: UtcInstant`; `endTimeUtc: UtcInstant` |
| `booking.confirmed` (`booking`) | `previousState` is `pending_confirmation` or `none`; `resultingState: "confirmed"`; `capacityOwner: "booking"` |
| `booking.cancelled` (`booking`) | `previousState` is `pending_confirmation` or `confirmed`; `resultingState: "cancelled"` |
| `booking.rescheduled` (`booking`) | `predecessorBookingReference: OpaqueReference`; `successorBookingReference: OpaqueReference`; `successorState` is `pending_confirmation` or `confirmed` |
| `booking.expired` (`booking`) | `previousState: "pending_confirmation"`; `resultingState: "expired"` |
| `waitlist.joined` (`waitlist_entry`) | `resultingState: "active"`; `modalityPreference: AppointmentModality` |
| `waitlist.cancelled` (`waitlist_entry`) | `previousState` is `active` or `offered`; `resultingState: "cancelled"` |
| `waitlist.reactivated` (`waitlist_entry`) | `previousState: "offered"`; `resultingState: "active"` |
| `waitlist.expired` (`waitlist_entry`) | `previousState` is `active` or `offered`; `resultingState: "expired"` |
| `waitlist.offer_created` (`waitlist_offer`) | `waitlistReference: OpaqueReference`; `capacityHoldReference: OpaqueReference`; `resultingState: "pending"`; `expiresAtUtc: UtcInstant` |
| `waitlist.offer_accepted` (`waitlist_offer`) | `waitlistReference: OpaqueReference`; `bookingReference: OpaqueReference`; `resultingOfferState: "accepted"`; `resultingEntryState: "promoted"` |
| `waitlist.offer_declined` (`waitlist_offer`) | `waitlistReference: OpaqueReference`; `resultingOfferState: "declined"`; `resultingEntryState: "cancelled"` |
| `waitlist.offer_withdrawn` (`waitlist_offer`) | `waitlistReference: OpaqueReference`; `resultingOfferState: "cancelled"`; `resultingEntryState` is `active`, `cancelled`, or `expired` |
| `waitlist.offer_expired` (`waitlist_offer`) | `waitlistReference: OpaqueReference`; `resultingOfferState: "expired"`; `resultingEntryState` is `active` or `expired` |
| `capacity_hold.created` (`capacity_hold`) | `ownerType` is `pending_booking` or `waitlist_offer`; `ownerReference: OpaqueReference`; `resultingState: "active"`; `expiresAtUtc: UtcInstant` |
| `capacity_hold.consumed` (`capacity_hold`) | `ownerType` is `pending_booking` or `waitlist_offer`; `bookingReference: OpaqueReference`; `resultingState: "consumed"` |
| `capacity_hold.released` (`capacity_hold`) | `ownerType` is `pending_booking` or `waitlist_offer`; `releaseCause` is `early_booking_cancellation`, `reschedule_replacement`, `offer_decline`, `offer_withdrawal`, or `waitlist_leave`; `resultingState: "released"` |
| `capacity_hold.expired` (`capacity_hold`) | `ownerType` is `pending_booking` or `waitlist_offer`; `resultingState: "expired"` |
| `management_credential.issued` (`management_credential`) | `credentialReference: OpaqueReference`; `usageMode` is `one_time` or `reusable`; `permittedActions` is a unique non-empty array of canonical management actions; `channel` is `server_session_bound` or `one_time_response`; `expiresAtUtc: UtcInstant` |
| `management_credential.consumed` (`management_credential`) | `credentialReference: OpaqueReference`; `consumedByAction: canonical one-time management action`; `resultingState: "consumed"` |
| `management_credential.revoked` (`management_credential`) | `credentialReference: OpaqueReference`; `resultingState: "revoked"` |
| `management_credential.expired` (`management_credential`) | `credentialReference: OpaqueReference`; `resultingState: "expired"` |
| `automation.reconciled` (`automation_control`) | `reconciliationRunReference: OpaqueReference`; `resultingState` is `completed` or `no_changes`; `processedCount: integer 0..TASK04_MAX_PAGE_SIZE` |
| `automation.disabled` (`automation_control`) | `previousState: "enabled"`; `resultingState: "disabled"`; `controlVersion: positive integer` |
| `automation.enabled` (`automation_control`) | `previousState: "disabled"`; `resultingState: "enabled"`; `controlVersion: positive integer` |

For `management_credential.issued`, `usageMode = one_time` requires
`channel = one_time_response` and exactly one permitted action from
`booking:cancel`, `booking:reschedule`, `waitlist:leave`,
`waitlist:offer:accept`, or `waitlist:offer:decline`.
`usageMode = reusable` requires `channel = server_session_bound` and 1 to 8
unique actions from `ManagementCapabilitySummary`. Cross-field refinements
reject every other pairing.

`safeReasonCode` is also discriminated by event:

| `eventType` | Exact allowed code/refinement |
|---|---|
| `booking.created` | `BOOKING_REQUESTED` |
| `booking.confirmed` | `IMMEDIATE_CONFIRMATION` when `previousState = "none"`; `STAFF_CONFIRMED` when `previousState = "pending_confirmation"` |
| `booking.cancelled` | `ACTOR_CANCELLED` |
| `booking.rescheduled` | `REPLACEMENT_COMMITTED` |
| `booking.expired` | `CONFIRMATION_WINDOW_EXPIRED` |
| `waitlist.joined` | `WAITLIST_REQUESTED` |
| `waitlist.cancelled` | `ACTOR_LEFT_WAITLIST`, `ACTOR_DECLINED_OFFER`, or `AUTHORITY_REVOKED` |
| `waitlist.reactivated` | `OFFER_WINDOW_EXPIRED_ENTRY_ELIGIBLE` or `OFFER_WITHDRAWN_ENTRY_ELIGIBLE` |
| `waitlist.expired` | `ENTRY_WINDOW_EXPIRED` |
| `waitlist.offer_created` | `CAPACITY_BECAME_AVAILABLE` |
| `waitlist.offer_accepted` | `ACTOR_ACCEPTED_OFFER` |
| `waitlist.offer_declined` | `ACTOR_DECLINED_OFFER` |
| `waitlist.offer_withdrawn` | `SLOT_INVALIDATED`, `ENTRY_LEFT`, `AUTHORITY_REVOKED`, or `ENTRY_WINDOW_EXPIRED` matching `resultingEntryState` |
| `waitlist.offer_expired` | `OFFER_WINDOW_EXPIRED` |
| `capacity_hold.created` | `PENDING_CONFIRMATION_RESERVED` for `pending_booking`; `WAITLIST_OFFER_RESERVED` for `waitlist_offer` |
| `capacity_hold.consumed` | `CONFIRMATION_COMMITTED` for `pending_booking`; `OFFER_ACCEPTANCE_COMMITTED` for `waitlist_offer` |
| `capacity_hold.released` | `EARLY_CANCELLATION`, `RESCHEDULE_REPLACEMENT`, `OFFER_DECLINED`, `OFFER_WITHDRAWN`, or `WAITLIST_LEFT`, exactly matching `releaseCause` |
| `capacity_hold.expired` | `HOLD_WINDOW_EXPIRED` |
| `management_credential.issued` | `SERVER_SESSION_CAPABILITY_CREATED` for `server_session_bound`; `ONE_TIME_ACCESS_ISSUED` for `one_time_response` |
| `management_credential.consumed` | `PROTECTED_ACTION_COMMITTED` |
| `management_credential.revoked` | `AUTHORITY_REVOKED`, `RESOURCE_TERMINAL`, or `SUCCESSOR_ROTATED` |
| `management_credential.expired` | `CREDENTIAL_WINDOW_EXPIRED` |
| `automation.reconciled` | `RECONCILIATION_COMPLETED` |
| `automation.disabled` | `AUTHORIZED_DISABLE` |
| `automation.enabled` | `AUTHORIZED_ENABLE` |

No arbitrary reason or payload metadata is permitted. Where the table requires
a match to payload state, a cross-field refinement enforces it.

### 4A.14 Endpoint error subsets

| Boundary | Allowed error codes |
|---|---|
| Availability | `REQUEST_INVALID`, `RATE_LIMIT_REACHED`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Booking create | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `SLOT_NO_LONGER_AVAILABLE`, `REQUEST_IN_PROGRESS`, `IDEMPOTENCY_KEY_CONFLICT`, `RATE_LIMIT_REACHED`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Booking/waitlist view | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `LINK_EXPIRED`, `RESOURCE_UNAVAILABLE`, `RATE_LIMIT_REACHED`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Booking confirm/expire | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `INVALID_TRANSITION`, `ACTION_ALREADY_COMPLETED`, `REQUEST_IN_PROGRESS`, `IDEMPOTENCY_KEY_CONFLICT`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Booking cancel/reschedule | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `LINK_EXPIRED`, `INVALID_TRANSITION`, `SLOT_NO_LONGER_AVAILABLE`, `ACTION_ALREADY_COMPLETED`, `REQUEST_IN_PROGRESS`, `IDEMPOTENCY_KEY_CONFLICT`, `RATE_LIMIT_REACHED`, `RECOVERY_REQUIRED`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Waitlist join | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `INVALID_TRANSITION`, `ACTION_ALREADY_COMPLETED`, `REQUEST_IN_PROGRESS`, `IDEMPOTENCY_KEY_CONFLICT`, `RATE_LIMIT_REACHED`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Waitlist leave | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `LINK_EXPIRED`, `INVALID_TRANSITION`, `ACTION_ALREADY_COMPLETED`, `REQUEST_IN_PROGRESS`, `IDEMPOTENCY_KEY_CONFLICT`, `RATE_LIMIT_REACHED`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Waitlist promote/create/expire/withdraw | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `INVALID_TRANSITION`, `ACTION_ALREADY_COMPLETED`, `REQUEST_IN_PROGRESS`, `IDEMPOTENCY_KEY_CONFLICT`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Offer acceptance/decline | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `LINK_EXPIRED`, `WAITLIST_OFFER_EXPIRED`, `INVALID_TRANSITION`, `ACTION_ALREADY_COMPLETED`, `REQUEST_IN_PROGRESS`, `IDEMPOTENCY_KEY_CONFLICT`, `RATE_LIMIT_REACHED`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Management credential issue/consume/revoke | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `LINK_EXPIRED`, `ACTION_ALREADY_COMPLETED`, `REQUEST_IN_PROGRESS`, `IDEMPOTENCY_KEY_CONFLICT`, `RECOVERY_REQUIRED`, `RATE_LIMIT_REACHED`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Recovery | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `LINK_EXPIRED`, `RECOVERY_REQUIRED`, `REQUEST_IN_PROGRESS`, `IDEMPOTENCY_KEY_CONFLICT`, `RATE_LIMIT_REACHED`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Queue | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `RATE_LIMIT_REACHED`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Automation control/reconcile | `REQUEST_INVALID`, `NOT_AUTHORIZED`, `INVALID_TRANSITION`, `ACTION_ALREADY_COMPLETED`, `REQUEST_IN_PROGRESS`, `IDEMPOTENCY_KEY_CONFLICT`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |
| Internal event parse | `REQUEST_INVALID`, `TEMPORARILY_UNAVAILABLE`, `FEATURE_DISABLED` |

## 4B. Canonical command, action, permission, and boundary registry

This registry is authoritative. A name not present here is not a Task 04
command. Every boundary parses its listed strict request, independently
derives `PHARMACY_ID`, rechecks current authority, and returns only the listed
strict response envelope. `Patient/delegate authority` means a current
authenticated synthetic session with self authority or an active delegation
grant containing the exact command. `Staff permission` and `worker permission`
are independently rechecked server-side on every call.

| Command | Actor and exact permission/credential | Request → response schema | Idempotency | Allowed error subset | Committed domain events | Audit evidence | Boundary |
|---|---|---|---|---|---|---|---|
| `availability:query` | Public; no credential; enumeration controls | Public availability request → response | None; read only | Availability | None | Rate-limit/security evidence only | Public HTTPS GET with strict query parsing |
| `booking:create` | Synthetic patient/delegate; `booking:create` | Section 4A.3 request → response | Required | Booking create | `booking.created`; plus `booking.confirmed` or `capacity_hold.created`; `management_credential.issued` | One safe booking-create transition and capability issue | Authenticated synthetic HTTPS POST |
| `booking:view` | Synthetic patient/delegate; `ManagementAuthorization` permitting `booking:view` | `BookingViewRequest` → section 4A.4 response | None; read only | Booking/waitlist view | None | Safe protected-resource access | Authenticated synthetic HTTPS POST |
| `booking:confirm` | Synthetic staff; `booking:confirm` | `BookingConfirmRequest` → `BookingConfirmResponse` | Required | Booking confirm/expire | `capacity_hold.consumed`, `booking.confirmed` | Hold and booking transitions | Authenticated staff server action |
| `booking:cancel` | Synthetic patient/delegate with `ManagementAuthorization` permitting `booking:cancel`, or staff with `booking:cancel` | Section 4A.5 `CommandAuthorization` request → response | Required | Booking cancel/reschedule | `capacity_hold.released` when pending; `booking.cancelled`; `management_credential.revoked`; plus one-time `management_credential.consumed` when that channel is used | Hold/booking/credential transitions as applicable | Authenticated synthetic or staff HTTPS POST/server action |
| `booking:reschedule` | Synthetic patient/delegate with `ManagementAuthorization` permitting `booking:reschedule`, or staff with `booking:reschedule` | Section 4A.6 `CommandAuthorization` request → response | Required | Booking cancel/reschedule | Exact predecessor/successor events in section 3.5 of `state-machines.md`; predecessor `management_credential.revoked`; successor `management_credential.issued`; one-time consumption when used | All hold, booking, and credential transitions | Authenticated synthetic or staff HTTPS POST/server action |
| `booking:expire` | Synthetic system worker; `booking:expire` | `BookingExpireRequest` → `BookingExpireResponse` | Required | Booking confirm/expire | `capacity_hold.expired`, `booking.expired`, `management_credential.revoked` | Worker run plus hold/booking/credential transitions | Internal worker boundary; not routable publicly |
| `waitlist:join` | Synthetic patient/delegate; `waitlist:join` | Section 4A.7 request → response | Required | Waitlist join | `waitlist.joined`, `management_credential.issued` | Waitlist-create and capability-issue transitions | Authenticated synthetic HTTPS POST |
| `waitlist:view` | Synthetic patient/delegate; `ManagementAuthorization` permitting `waitlist:view` | `WaitlistViewRequest` → `WaitlistViewResponse` | None; read only | Booking/waitlist view | None | Safe protected-resource access | Authenticated synthetic HTTPS POST |
| `waitlist:leave` | Synthetic patient/delegate with `ManagementAuthorization` permitting `waitlist:leave`, or staff with `waitlist:leave` | Section 4A.8 `CommandAuthorization` request → response | Required | Waitlist leave | Optional `capacity_hold.released`, optional `waitlist.offer_withdrawn`, `waitlist.cancelled`, `management_credential.revoked`; plus one-time `management_credential.consumed` when used | Every changed hold/offer/entry/credential transition | Authenticated synthetic or staff HTTPS POST/server action |
| `waitlist:promote` | Synthetic system worker; `waitlist:promote` | `WaitlistPromoteRequest` → `WaitlistPromoteResponse` | Required | Waitlist promote/create/expire/withdraw | On selection, delegates atomically to `waitlist:offer:create`; otherwise none | Worker selection result and delegated transitions | Internal worker boundary; not routable publicly |
| `waitlist:expire` | Synthetic system worker; `waitlist:expire` | `WaitlistExpireRequest` → `WaitlistExpireResponse` | Required | Waitlist promote/create/expire/withdraw | When offered: `capacity_hold.released`, `waitlist.offer_withdrawn`; always `waitlist.expired`, `management_credential.revoked` | Every changed aggregate transition | Internal worker boundary; not routable publicly |
| `waitlist:offer:create` | Synthetic system worker; `waitlist:offer:create`; callable only from `waitlist:promote` transaction | `WaitlistOfferCreateRequest` → `WaitlistOfferCreateResponse` | Required | Waitlist promote/create/expire/withdraw | `capacity_hold.created`, `waitlist.offer_created` | Entry, hold, and offer transitions | Internal domain-service boundary only |
| `waitlist:offer:accept` | Synthetic patient/delegate; `ManagementAuthorization` permitting `waitlist:offer:accept` | Section 4A.9 request → response | Required | Offer acceptance/decline | `capacity_hold.consumed`, `waitlist.offer_accepted`, `booking.created`, `booking.confirmed`, waitlist `management_credential.revoked`, booking `management_credential.issued`; plus one-time `management_credential.consumed` when used | Every affected aggregate and credential transition | Authenticated synthetic HTTPS POST |
| `waitlist:offer:decline` | Synthetic patient/delegate; `ManagementAuthorization` permitting `waitlist:offer:decline` | `WaitlistOfferDeclineRequest` → `WaitlistOfferDeclineResponse` | Required | Offer acceptance/decline | `capacity_hold.released`, `waitlist.offer_declined`, `waitlist.cancelled`, `management_credential.revoked`; plus one-time `management_credential.consumed` when used | Every affected hold/offer/entry/credential transition | Authenticated synthetic HTTPS POST |
| `waitlist:offer:withdraw` | Synthetic staff with `waitlist:offer:withdraw`, or worker with the same exact permission | `WaitlistOfferWithdrawRequest` → `WaitlistOfferWithdrawResponse` | Required | Waitlist promote/create/expire/withdraw | `capacity_hold.released`, `waitlist.offer_withdrawn`; plus `waitlist.reactivated`, `waitlist.cancelled`, or `waitlist.expired` | Every affected hold/offer/entry transition | Authenticated staff server action or internal worker boundary |
| `management-credential:issue` | Current bound synthetic session; `management-credential:issue`; requested action must already be permitted by the reusable capability | `ManagementCredentialIssueRequest` → `ManagementCredentialIssueResponse` | No replay: duplicate denied because a raw secret cannot be replayed | Management credential issue/consume/revoke | `management_credential.issued` | Issuance metadata only; never raw secret | Authenticated synthetic HTTPS POST response only |
| `management-credential:consume` | Internal protected-mutation service; `management-credential:consume` | `ManagementCredentialConsumeRequest` → `ManagementCredentialConsumeResponse` | Same transaction/key as protected mutation | Management credential issue/consume/revoke | `management_credential.consumed` | Consumption transition | Internal domain-service boundary only |
| `management-credential:revoke` | Synthetic patient/delegate through current `ManagementAuthorization`, staff with `management-credential:revoke`, or worker on authority expiry | `ManagementCredentialRevokeRequest` → `ManagementCredentialRevokeResponse` | Required | Management credential issue/consume/revoke | `management_credential.revoked` | Revocation transition | Authenticated synthetic/staff or internal worker boundary |
| `management:recover` | Current synthetic session or still-presentable `ManagementAuthorization`; `management:recover` | Section 4A.10 request → response | Required only for mutating recovery actions | Recovery | Any resulting issue/revoke event; none for status-only recovery | Safe recovery result; no resource-existence detail | Authenticated synthetic HTTPS POST |
| `queue:read` | Synthetic staff; `queue:read` | Section 4A.11 request → response | None; read only | Queue | None | Safe queue-access evidence including completeness/freshness categories | Authenticated staff server boundary |
| `automation:reconcile` | Synthetic system worker; `automation:reconcile` | `AutomationReconcileRequest` → `AutomationReconcileResponse` | Required | Automation control/reconcile | `automation.reconciled`; plus exact domain events for each reconciled transition | Reconciliation run and each committed transition | Internal worker boundary only |
| `automation:disable` | Synthetic staff or synthetic system control; `automation:disable` | `AutomationControlRequest` → `AutomationControlResponse` | Required | Automation control/reconcile | `automation.disabled` | Control transition and actor | Authenticated staff server action or internal control boundary |
| `automation:enable` | Synthetic staff; `automation:enable` | `AutomationControlRequest` → `AutomationControlResponse` | Required | Automation control/reconcile | `automation.enabled` | Control transition and actor | Authenticated staff server action |

The `booking:confirm` schema, command, permission, idempotency scope, and events
are therefore fully defined here; no endpoint may infer confirmation from a
generic update action. Worker commands accept only their exact internal
schemas, execute with least privilege, and cannot be invoked by a public or
management boundary.

## 5. Public availability query

### Request fields

Use exactly the strict request in section 4A.2.

### Validation

- Reject unknown fields.
- Require a bounded date window.
- Reject unsupported timezone identifiers.
- Reject unbounded page sizes.
- Reject internal slot, pharmacy, tenant, staff, or capacity fields.
- Reject arbitrary sorting and filtering.
- Apply enumeration and request-rate protection.

### Response fields

Use exactly the strict response envelope and `AvailabilityItem` in section
4A.2.

The response must not include exact capacity, staff identity, booking totals,
waitlist totals, or private schedules.

### Synthetic public-availability cache contract

Only the public availability projection may use the optional named synthetic
server cache. `TASK04_SYNTHETIC_AVAILABILITY_CACHE_TTL_SECONDS` is a startup-
validated integer from 1 through 60. It is a sandbox test bound, not a
production policy.

The canonical cache key contains exactly:

- Server-only `PHARMACY_ID`.
- `serviceCategoryRef` or the literal `all`.
- `modality` or the literal `all`.
- `startDate`, `endDate`, and `timezone`.
- `cursor` or the literal `first`.
- Resolved `pageSize`.
- The server-owned availability-projection version.

The cached value is the strict section 4A.2 response data only. HTTP responses
always use `Cache-Control: no-store`; browsers, service workers, shared
proxies, and client storage must not retain it. Enumeration and rate-limit
controls run on cache hits and misses. A cache hit never authorizes a booking:
`booking:create` revalidates slot reference, scope, policy, time, and capacity
transactionally.

The server invalidates affected entries only after a capacity-changing
transaction commits. It bypasses the cache when the optional TTL configuration
is absent or projection freshness is unknown, computing a fresh response
instead. A malformed TTL fails startup. Unknown feature/automation state or a
response-generation failure returns its canonical safe error and does not
serve cached data. Protected booking, waitlist, queue, identity, authorization,
management, credential, and recovery responses are never cached.

## 6. Booking creation

### Request fields

Use exactly the strict request in section 4A.3.

### Administrative acknowledgements

The strict `AdministrativeAcknowledgements` schema requires every literal
`true` field listed in section 4A.1, covering:

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
- Resolve the normalized synthetic contact reference to a server-owned fixture.
- Require a bounded idempotency key.
- Reject unknown acknowledgement names.

### Server checks after Zod

The server must independently derive and verify:

- Actor.
- Subject.
- Server-only `PHARMACY_ID`.
- Delegated authority, when applicable.
- Current slot.
- Service category.
- Modality.
- Current capacity.
- Booking policy.
- Idempotency ownership.

### Response fields

Use exactly the strict response envelope in section 4A.3.

The response must not claim clinical approval, eligibility, safety, payment, or
guaranteed service.

## 7. Booking retrieval

### Request fields

Use exactly the strict request in section 4A.4.

The management authorization is presented through the exact channel in section
4A.1 and must not be placed in a query string.

### Validation and authorization

- Validate shape and bounds.
- Digest a presented one-time credential before comparison; resolve a
  server-session capability by its opaque reference.
- Recheck expiry, revocation, scope, actor binding, subject binding, and current
  server authorization.
- Return the same safe denial shape whether the booking does not exist or is not
  accessible.

### Response fields

Use exactly the strict response envelope in section 4A.4.

Only actions currently permitted by the server may appear.

## 8. Booking cancellation

### Request fields

Use exactly the strict request in section 4A.5.

No unrestricted cancellation explanation is accepted.

### Server checks

- Current actor and subject authority.
- Booking is currently cancellable.
- Management authorization remains valid for the exact action.
- Idempotency key matches the canonical request.
- Capacity has not already been released.

### Response fields

Use exactly the strict response envelope in section 4A.5.

The client receives no internal capacity value.

## 9. Booking rescheduling

### Request fields

Use exactly the strict request in section 4A.6.

### Validation

- Original and replacement references must be distinct.
- Reject client-supplied old/new capacity or booking states.
- Reject stale or malformed slot references.
- Reject all unrestricted free text.

### Transaction requirement

The server must preserve the original booking unless the complete replacement
transaction succeeds.

### Response fields

Use exactly the strict response envelope in section 4A.6.

## 10. Waitlist join

### Request fields

Use exactly the strict request in section 4A.7.

### Validation and server checks

- Service category must permit waitlisting.
- Actor and subject are server-derived.
- A conflicting live entry must not already exist.
- No exact priority or rank may be client-supplied.
- No reason-for-visit or medical details may be accepted.

### Response fields

Use exactly the strict response envelope in section 4A.7.

Do not return exact waitlist position or estimated clinical priority.

## 11. Waitlist leave

The canonical command is `waitlist:leave`; successful completion results in
`cancelled` and emits `waitlist.cancelled`.

### Request fields

Use exactly the strict request in section 4A.8.

### Response fields

Use exactly the strict response envelope in section 4A.8.

Any active offer must become `cancelled` through
`waitlist:offer:withdraw`, and its active hold must become `released`,
transactionally with the entry cancellation.

## 12. Waitlist-offer acceptance

### Request fields

Use exactly the strict request in section 4A.9.

### Server checks

- Offer is pending.
- Offer has not expired.
- Waitlist entry still satisfies the non-clinical `promotion_candidate`
  requirements applicable at acceptance.
- Capacity hold remains active.
- Actor and subject authorization remain current.
- Idempotency request matches any prior use.

### Response fields

Use exactly the strict response envelope in section 4A.9.

A retry must return the same booking reference.

## 13. Management-authorization recovery

### Request fields

Use exactly the strict request and allowlisted actions in section 4A.10.

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

Use exactly the strict response envelope in section 4A.10.

The response must not confirm whether an unrelated booking, account, contact
destination, or waitlist entry exists.

## 14. Pharmacist queue query

### Request fields

Use exactly the strict request in section 4A.11.

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
- Server-only `PHARMACY_ID`.
- Exact `queue:read` permission.
- Permitted queue states.
- Safe display ordering.

### Response fields

Use exactly the strict response and queue item projection in section 4A.11.

Queue items must not contain clinical details, health-card information,
unnecessary contact information, or claims information.

## 15. Domain-event envelope

### Required fields

Use exactly the strict discriminated union in section 4A.13.

### Validation

- Event type must be allowlisted.
- Event version must be supported.
- Aggregate type must be allowlisted.
- Aggregate version must be a positive committed version.
- `aggregateId` and payload references must be opaque and bounded.
- Timestamps must be valid UTC values.
- `syntheticMarker` must prove the event belongs to the sandbox.
- `protectedScope.pharmacyId` must be derived from server-only `PHARMACY_ID`.
- `dispatchStatus` must be the literal `not_dispatched`.
- Unknown event types fail closed.

### Prohibited fields

- Patient name.
- Email or telephone number.
- Health-card information.
- Symptoms or clinical details.
- Appointment purpose.
- Management credentials.
- Raw idempotency keys.
- External destinations.
- Notification message bodies.

Task 04 events never send messages.

## 16. Idempotency contract

The command registry in section 4B is authoritative. Idempotency is required
for `booking:create`, `booking:confirm`, `booking:cancel`,
`booking:reschedule`, `booking:expire`, `waitlist:join`, `waitlist:leave`,
`waitlist:promote`, `waitlist:expire`, `waitlist:offer:create`,
`waitlist:offer:accept`, `waitlist:offer:decline`,
`waitlist:offer:withdraw`, `management-credential:consume`,
`management-credential:revoke`, mutating `management:recover`,
`automation:reconcile`, `automation:disable`, and `automation:enable`.

`management-credential:issue` deliberately does not replay an idempotent
response because that would replay a bearer secret. A duplicate issuance
attempt is denied and routed through authenticated recovery. Read-only
availability, booking/waitlist views, status-only recovery, and `queue:read`
do not create idempotency records.

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

Synthetic cleanup is authorized within the bounded sandbox and must use the
approved capability expiry and lifecycle controls. Production retention
remains an unresolved privacy/legal/product decision.

## 17. Safe error contract

| Code | Exact generic message |
|---|---|
| `REQUEST_INVALID` | We could not process that request. |
| `NOT_AUTHORIZED` | This action is not available. |
| `RESOURCE_UNAVAILABLE` | The requested item is unavailable. |
| `SLOT_NO_LONGER_AVAILABLE` | That appointment time is no longer available. |
| `INVALID_TRANSITION` | This action is not available in the current state. |
| `LINK_EXPIRED` | This access path is no longer active. |
| `ACTION_ALREADY_COMPLETED` | This action was already completed. |
| `REQUEST_IN_PROGRESS` | This request is still being processed. |
| `IDEMPOTENCY_KEY_CONFLICT` | This request key cannot be reused. |
| `WAITLIST_OFFER_EXPIRED` | This offer is no longer active. |
| `RATE_LIMIT_REACHED` | Too many requests were made. Please try again later. |
| `RECOVERY_REQUIRED` | Use the available recovery option to continue. |
| `TEMPORARILY_UNAVAILABLE` | This service is temporarily unavailable. |
| `FEATURE_DISABLED` | This service is currently unavailable. |

Recovery message codes map to these exact client-owned generic strings:

| Code | Exact generic message |
|---|---|
| `RECOVERY_CHECK_STATUS` | Check the current status before trying again. |
| `RECOVERY_REQUEST_FRESH_ACCESS` | Request a new access path to continue. |
| `RECOVERY_RESTART_BOOKING` | Start a new booking request to continue. |
| `RECOVERY_REAUTHENTICATE` | Sign in again to continue. |
| `RECOVERY_NONE` | No recovery action is currently available. |

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

This document defines contracts only. The exact loopback-only synthetic scope
and Task 11 Checkpoint 1 were approved on 2026-08-02. This documentation pass
does not add runtime code. Future synthetic implementation must remain inside
the approved Task 01 sandbox and fail closed after 2026-08-05 unless review
extends it. Production integration, G2, G3, live data, cloud databases,
external effects, and production imports remain prohibited.
