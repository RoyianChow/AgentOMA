# Task 04 — Abuse and Rate-Limit Design

**Status:** Draft for review
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Implementation:** Blocked pending Task 11 review and applicable Task 01 approval

## 1. Purpose

This document defines the abuse-prevention and rate-limit design for the
synthetic Task 04 booking and waitlist prototype.

The design addresses:

- Availability scraping.
- Slot enumeration and hoarding.
- Repeated booking attempts.
- Waitlist flooding.
- Identifier and token guessing.
- Replay attacks.
- Cancellation and rescheduling abuse.
- Oversized or malformed requests.
- Distributed requests.
- Automated contact-detail testing.

Rate limiting supports abuse prevention, but it is not the authoritative
control for:

- Authentication.
- Authorization.
- Pharmacy or tenant isolation.
- Booking capacity.
- Idempotency.
- Booking or waitlist state transitions.

Those controls must continue to be enforced independently.

## 2. Core invariants

### ABUSE-INV-01 — Server-owned enforcement

Limits are enforced by trusted server code.

A client cannot disable or increase a limit.

### ABUSE-INV-02 — Privacy-preserving keys

Rate-limit keys must not contain raw:

- Names.
- Email addresses.
- Telephone numbers.
- Health-card information.
- Actor or subject identifiers.
- Booking references.
- Management tokens.
- Idempotency keys.
- Clinical information.

### ABUSE-INV-03 — No authorization through rate limits

Passing a rate limit does not grant access.

Every protected request still requires server authorization.

### ABUSE-INV-04 — No capacity enforcement through rate limits

PostgreSQL remains responsible for preventing overbooking.

A successful rate-limit check does not reserve capacity.

### ABUSE-INV-05 — Safe limiter failure

A required mutable operation must not bypass abuse controls when the limiter is
unavailable.

### ABUSE-INV-06 — Shared-network recovery

Users sharing a school, workplace, pharmacy, library, family, or mobile network
must not be permanently blocked because another user generated traffic.

### ABUSE-INV-07 — Accessible recovery

A limited user must receive a clear, keyboard-accessible, screen-reader
compatible recovery message.

### ABUSE-INV-08 — No sensitive logging

Rate-limit decisions must not place personal information or request payloads in
logs, metrics, analytics, or evidence.

## 3. Protected operations

Separate limits should exist for:

- Public availability queries.
- Booking creation.
- Booking retrieval.
- Booking cancellation.
- Booking rescheduling.
- Waitlist join.
- Waitlist leave.
- Waitlist-offer acceptance.
- Management-access recovery.
- Management-token verification.
- Pharmacist queue access.
- Expiry and promotion workers where applicable.

One general limit must not replace operation-specific controls.

## 4. Rate-limit scopes

Different operations may require combinations of:

### Public network scope

Used only for unauthenticated public endpoints.

The server may derive a privacy-preserving network key.

The raw network address must not be stored in ordinary application logs or
evidence.

### Session scope

Limits repeated activity within one trusted synthetic session.

### Actor scope

Limits actions associated with one server-derived actor.

The client cannot choose the actor used for the limit.

### Subject scope

May be used when repeated actions affect one authorized appointment subject.

The subject is derived server-side.

### Resource scope

May protect one booking, waitlist entry, offer, or management path.

Raw resource identifiers must not be used directly as stored limiter keys.

### Operation scope

Each command uses an allowlisted operation code such as:

- `availability:query`
- `booking:create`
- `booking:cancel`
- `booking:reschedule`
- `waitlist:join`
- `waitlist:leave`
- `offer:accept`
- `management:verify`

### Pharmacy or tenant scope

Where applicable, the server-derived pharmacy or tenant scope prevents one
scope’s traffic from consuming another scope’s complete allowance.

The client cannot provide this value authoritatively.

## 5. Privacy-preserving key construction

A limiter key should be derived using a server-owned keyed digest.

Conceptual form:

```text
HMAC(
  server-owned limiter secret,
  environment
  + operation
  + trusted scope category
  + normalized trusted scope value
)
```

The limiter store receives only the resulting digest and required expiry
metadata.

The implementation must not expose:

- The raw input.
- The secret.
- A reversible encoded identifier.
- A predictable identifier.
- Contact information.
- Booking or management tokens.

Limiter secrets must be managed through the approved server-secret mechanism
and must never enter browser code.

## 6. Public availability protection

Public availability is vulnerable to:

- High-volume scraping.
- Slot enumeration.
- Date-range expansion.
- Pagination abuse.
- Attempts to infer staff schedules or exact capacity.

Required controls:

- Bounded date ranges.
- Bounded page sizes.
- Opaque slot references.
- Slot-reference expiry.
- Coarse availability states.
- No exact capacity.
- No total booking or waitlist counts.
- Request-size limits.
- Privacy-preserving network and operation limits.
- Safe caching only where separately approved.
- Constant safe error shapes.

Rate limiting must not reveal whether a particular slot, staff member, or
appointment exists.

## 7. Slot-hoarding protection

Rate limiting alone cannot prevent slot hoarding.

Required controls include:

- PostgreSQL-backed capacity.
- Short-lived holds only where approved.
- Hold expiry.
- Idempotency.
- Actor and subject authorization.
- Limits on repeated booking creation.
- Limits on simultaneous active holds where policy permits.
- No client-controlled hold duration.
- No capacity reservation from public slot discovery.

An expired or abandoned hold must release capacity transactionally.

## 8. Booking and rescheduling protection

Booking and rescheduling commands require:

- Strict Zod validation.
- Trusted actor and subject scope.
- Server-derived pharmacy scope.
- Idempotency.
- Resource-state validation.
- PostgreSQL capacity enforcement.
- Operation-specific rate limits.
- Bounded request sizes.

Repeated attempts must not:

- Duplicate bookings.
- Reserve multiple capacity units.
- Release source capacity before a reschedule succeeds.
- Produce duplicate audit or outbox records.

## 9. Cancellation protection

Cancellation abuse may include:

- Repeated cancellation requests.
- Cancellation of another subject’s booking.
- Token replay.
- Attempts to trigger repeated capacity release or promotion.

Required controls:

- Server authorization.
- Booking-state validation.
- Idempotency.
- Management-token expiry and revocation.
- Operation-specific rate limits.
- Transactional capacity release.
- One authoritative cancellation transition.

Rate limiting is not the control that prevents repeated capacity release.

The database and state machine must prevent that effect.

## 10. Waitlist protection

Waitlist abuse may include:

- Repeated joins.
- Duplicate active entries.
- Flooding one service or modality.
- Repeated leave and rejoin activity.
- Offer-token guessing.
- Repeated offer acceptance.

Required controls:

- One active entry per approved subject and service scope where policy applies.
- Strict actor and subject authorization.
- Idempotent join and leave.
- Operation-specific limits.
- Database uniqueness constraints.
- Opaque offer references.
- Offer expiry.
- One live offer per entry.
- Transactional offer acceptance.
- Safe non-enumerating errors.

Exact waitlist position and length must not be exposed.

## 11. Identifier and token guessing

Protected references must be:

- Opaque.
- High entropy.
- Short lived where appropriate.
- Scoped to one resource and action.
- Revocable where applicable.
- Stored as a digest when they function as secrets.

Verification endpoints require stricter limits than ordinary page viewing.

Unknown, expired, revoked, consumed, tampered, and unauthorized references
should use a consistent safe denial response where enumeration could occur.

A token must not appear in:

- Application logs.
- Analytics.
- Error breadcrumbs.
- Screenshots.
- Evidence.
- Page titles.
- Referrers.
- Browser storage.

## 12. Replay protection

Replay protection requires:

- Idempotency for mutable commands.
- Token status and expiry checks.
- Current authorization checks.
- Current resource-state checks.
- Canonical request fingerprints.
- Database uniqueness constraints.
- Operation-specific limits.

A previously valid request must not automatically remain authorized after:

- Grant revocation.
- Session expiry.
- Token consumption.
- Booking cancellation.
- Booking rescheduling.
- Offer expiry.
- Feature-gate shutdown.

## 13. Oversized and malformed requests

Every endpoint must enforce:

- Request-body size limits.
- String-length limits.
- Array-size limits.
- Date-range limits.
- Pagination limits.
- Strict enums.
- Strict Zod objects.
- Unknown-field rejection.
- Valid timezone identifiers.
- Safe normalization after validation.

Malformed input must not be copied into:

- Logs.
- Errors.
- Audit records.
- Rate-limit keys.
- Analytics.
- Evidence.

## 14. Limiter-unavailable behaviour

When a required limiter is unavailable:

### Mutable public or patient command

Return:

`TEMPORARILY_UNAVAILABLE`

The command must not bypass the limiter.

This applies to:

- Booking creation.
- Cancellation.
- Rescheduling.
- Waitlist changes.
- Offer acceptance.
- Management-token verification.

### Public availability

Until a safe degraded-read policy is approved, public availability should also
fail safely rather than bypassing a required anti-scraping control.

### Staff queue

Authorization remains mandatory.

The queue must not bypass a required limiter merely because the actor is staff.

Limiter failure must not cause fallback to:

- Production.
- Another pharmacy.
- Browser-only enforcement.
- An in-memory authoritative booking state.
- An external service.

## 15. Shared-network and recovery design

A single network signal must not permanently block every user behind that
network.

The design should combine server-derived signals such as:

- Operation.
- Trusted session.
- Trusted actor.
- Trusted resource.
- Privacy-preserving network category.

Recovery may include:

- A bounded retry period.
- A clear retry time.
- Reauthentication.
- A fresh authorized management path.
- Contacting the pharmacy through an approved alternative route.
- Human review where approved.

The interface must not require:

- A mouse.
- A visual CAPTCHA as the only recovery mechanism.
- Medical disclosure.
- Contact details inside a URL.
- Repeated submission of the same mutation.

The exact production challenge or recovery mechanism requires accessibility,
privacy, security, and product approval.

## 16. Safe response contract

Suggested safe codes:

- `RATE_LIMIT_REACHED`
- `TEMPORARILY_UNAVAILABLE`
- `REQUEST_ALREADY_PROCESSED`
- `ACCESS_DENIED`
- `ACCESS_PATH_EXPIRED`
- `SLOT_NO_LONGER_AVAILABLE`
- `OFFER_NO_LONGER_AVAILABLE`

A limited response may include:

- A plain-language explanation.
- A safe retry time or `Retry-After` value.
- An accessible recovery action.
- An opaque correlation reference.

It must not reveal:

- Exact limiter thresholds.
- Other users’ activity.
- Whether another booking exists.
- Exact capacity.
- Waitlist length.
- Internal limiter keys.
- Network-address details.
- Authorization rules.

## 17. Storage, expiry, and cleanup

Limiter records should contain only:

- Keyed digest.
- Operation category.
- Counter or bounded state.
- Window or expiry time.
- Safe environment marker.
- Safe scope category where necessary.

They must not contain raw identity or contact information.

Limiter records must expire automatically.

The exact production retention duration remains a privacy, security, product,
and operational decision and must not be invented by Task 04.

## 18. Logging and metrics

Allowed payload-free metrics may include:

- Operation category.
- Safe result category.
- Limited-request count.
- Limiter-unavailable count.
- Recovery-success count.
- Synthetic environment marker.
- Response-time bucket.

Logs and metrics must not include:

- Raw limiter key inputs.
- Raw limiter digests where unnecessary.
- IP addresses.
- Names.
- Contact details.
- Booking references.
- Subject or caregiver details.
- Management tokens.
- Request bodies.
- Clinical information.

## 19. Required tests

### ABUSE-01 — Availability scraping

Prove repeated public queries are limited without revealing exact capacity or
private schedules.

### ABUSE-02 — Oversized date range

Prove an excessive range is rejected before expensive processing.

### ABUSE-03 — Excessive page size

Prove oversized pagination is rejected.

### ABUSE-04 — Repeated booking creation

Prove repeated requests are limited and idempotency prevents duplicate effects.

### ABUSE-05 — Slot hoarding

Prove repeated attempts cannot exceed PostgreSQL capacity or create unlimited
holds.

### ABUSE-06 — Waitlist flooding

Prove repeated joins cannot create duplicate active entries.

### ABUSE-07 — Token guessing

Prove repeated invalid references are limited and use a non-enumerating denial.

### ABUSE-08 — Token replay

Prove expired, revoked, or consumed tokens cannot be reused.

### ABUSE-09 — Cancellation abuse

Prove repeated cancellation releases capacity once.

### ABUSE-10 — Rescheduling abuse

Prove failed or repeated rescheduling preserves valid booking state.

### ABUSE-11 — Malformed request

Prove unknown fields, invalid enums, excessive strings, and malformed dates are
rejected.

### ABUSE-12 — Distributed-signal simulation

Prove operation, session, actor, and resource limits work independently of one
network key.

### ABUSE-13 — Shared-network recovery

Prove one limited synthetic actor does not permanently block an unrelated
authorized synthetic actor.

### ABUSE-14 — Limiter failure

Prove required mutable commands fail safely when the limiter is unavailable.

### ABUSE-15 — Privacy leakage

Prove forbidden synthetic markers do not enter limiter keys, logs, metrics,
analytics, errors, screenshots, or evidence.

### ABUSE-16 — Client bypass

Prove headers, hidden fields, query values, or browser state cannot disable or
increase server-owned limits.

## 20. Stop conditions

Stop the affected workstream when:

- A raw contact value is required as a limiter key.
- PHI enters a limiter record, log, metric, or error.
- Rate limiting is being used instead of authorization.
- Rate limiting is being used instead of PostgreSQL capacity enforcement.
- A limiter outage causes mutable commands to bypass protection.
- Shared-network users cannot recover.
- A token-verification endpoint permits practical enumeration.
- A rate-limit response reveals another user’s activity.
- Required abuse tests are disabled merely to obtain a pass.
- Production infrastructure or data is required without approval.

## 21. Open decisions

The following remain unresolved:

- Final production thresholds.
- Final time windows.
- Final limiter storage technology.
- Final network-address handling.
- Final challenge mechanism.
- Final shared-network recovery process.
- Final staff exemptions, if any.
- Final degraded-read policy.
- Final retention period.
- Final operational owner.
- Final alert thresholds.

Synthetic test thresholds must be deterministic and clearly labelled as
non-production values.

## 22. Current conclusion

Task 04 will use layered, privacy-preserving abuse controls across public,
session, actor, resource, operation, pharmacy, and tenant scopes.

Rate limiting will support—but never replace—authorization, idempotency,
PostgreSQL capacity enforcement, state-machine checks, token security, and
database constraints.

The design has not been implemented or tested.

Production thresholds, infrastructure, recovery policy, and retention remain
blocked pending the required approvals.