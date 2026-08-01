# Task 04 — Pre-Implementation Test Plan

**Capability:** Synthetic Online Booking and Waitlist
**Capability ID:** `TASK04_BOOKING_WAITLIST_SYNTHETIC`
**Status:** Draft for Task 11 Checkpoint 1 review
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Release stage:** `DESIGN_REVIEW`
**Production authorization:** None
**Task 01 database extension:** Pending approval
**Task 11 Checkpoint 1:** Not yet reviewed
**Requested decision:** `APPROVED_TO_IMPLEMENT_SYNTHETIC`

## 1. Bounded purpose

Task 04 will create a deterministic synthetic prototype that allows an
authorized synthetic actor to:

- Discover coarse appointment availability.
- Request an in-person, telephone, or video appointment.
- View an authorized booking.
- Cancel an appointment.
- Reschedule an appointment.
- Join or leave a waitlist.
- Receive and accept an expiring synthetic waitlist offer.
- Recover safely from stale slots, expired access paths, retries, timeouts, and
  interrupted operations.
- View a minimum-necessary server-rendered pharmacist booking queue.

This is an administrative scheduling capability only.

It does not:

- Diagnose.
- Perform triage.
- Determine clinical urgency.
- Determine appointment eligibility.
- Prescribe or recommend treatment.
- Complete a pharmacist assessment.
- Generate or submit a claim.
- Send an email, SMS, push notification, calendar invitation, or webhook.
- Process real patient, caregiver, pharmacist, or pharmacy data.
- Connect to production identity, databases, storage, or integrations.

## 2. Explicit exclusions

The implementation must not:

- Collect symptoms, medical history, medications, diagnoses, allergies,
  pregnancy information, health-card details, or reasons for seeking care.
- Add unrestricted clinical or administrative free-text fields.
- Treat a displayed slot as confirmed availability.
- Accept authoritative actor, subject, caregiver, role, pharmacy, tenant,
  capacity, waitlist-position, or authorization fields from the client.
- Allow caregiver authority through a checkbox or self-attestation.
- Expose exact remaining capacity, appointment counts, waitlist counts, staff
  identities, or private staff schedules.
- Connect to production assessment, billing, claim, audit, or clinical logic.
- Apply a production migration.
- Use production or production-derived data.
- Claim that the synthetic prototype is production-ready.

## 3. Capability split

### T04-A — Public availability

Purpose:

- Display minimum necessary synthetic slot information.
- Issue opaque, short-lived slot references.
- Provide bounded date filtering and pagination.

Effects:

- Read-only.
- No booking is created.
- No capacity is reserved.

### T04-B — Booking lifecycle

Purpose:

- Create, retrieve, cancel, and reschedule synthetic bookings.

Effects:

- Mutable synthetic booking state.
- Capacity acquisition or release.
- Idempotency result.
- Audit reference.
- Stubbed transactional outbox event.

### T04-C — Waitlist and promotion offers

Purpose:

- Join or cancel a synthetic waitlist entry.
- Create, expire, decline, and accept capacity-backed promotion offers.

Effects:

- Mutable waitlist, offer, and capacity-hold state.
- Booking creation after valid offer acceptance.
- Idempotency result.
- Audit reference.
- Stubbed transactional outbox event.

### T04-D — Management and recovery

Purpose:

- Permit a narrowly authorized actor to manage a booking or waitlist entry.
- Recover from expired links, unknown outcomes, stale slots, and interrupted
  requests.

Effects:

- Read or bounded mutation only after server authorization.
- No authority is granted by link possession alone.

### T04-E — Pharmacist booking queue

Purpose:

- Show minimum necessary synthetic administrative work to an authorized
  synthetic staff actor.

Effects:

- Server-rendered read-only queue by default.
- Any future mutation requires a separately tested command.

### T04-F — Expiry worker

Purpose:

- Expire synthetic offers, holds, pending requests, and access tokens using a
  deterministic clock.

Effects:

- Bounded automated state transition.
- No external delivery or clinical effect.

## 4. Risk tier and autonomy level

### Proposed risk tier

`R2`

Reason:

The capability creates mutable non-clinical administrative state and requires
authorization, tenant pinning, audit evidence, idempotency, accessibility,
rollback, and real-database constraint testing.

Task 11 reviewers must confirm or raise the tier. The implementer must not lower
an approved tier without independent review.

### Proposed autonomy levels

| Capability | Proposed level | Reason |
|---|---|---|
| Public availability | `A0_INERT` | Read-only display |
| Patient booking, cancellation, and rescheduling | `A2_HUMAN_TRIGGERED` | Authorized actor triggers a bounded action |
| Waitlist join, leave, and offer acceptance | `A2_HUMAN_TRIGGERED` | Authorized actor triggers a bounded action |
| Staff administrative actions | `A2_HUMAN_TRIGGERED` | Authorized staff explicitly triggers action |
| Offer and hold expiry | `A3_BOUNDED_AUTOMATION` | Deterministic worker acts after a configured deadline |
| Promotion-offer creation, if automated | `A3_BOUNDED_AUTOMATION` | Server performs a preapproved non-clinical transition |

No `A4_PROHIBITED_AUTONOMY` is permitted.

The system must never autonomously make a clinical, prescribing, eligibility,
billing, claim, or emergency decision.

## 5. Actors, subjects, and authority

### Synthetic actors

- `synthetic_patient`
- `synthetic_delegate`
- `synthetic_staff`
- `synthetic_system_worker`

### Appointment subject

The appointment subject is distinct from the actor.

The server derives the subject relationship. A client-supplied subject
identifier is not authoritative.

### Delegated access

A synthetic delegate may act only when a server-owned synthetic grant is:

- Active.
- Unexpired.
- Unrevoked.
- Bound to the correct actor.
- Bound to the correct subject.
- Scoped for the requested action.

The production delegation policy remains owned by Task 05.

### Pharmacy and tenant scope

Pharmacy and tenant scope are always server-derived.

The client cannot select or switch pharmacy or tenant scope.

### Staff authority

Staff actions require a server-owned synthetic staff role.

Displaying an action in the interface does not grant server authorization.

## 6. Authoritative systems

| Concern | Synthetic authority |
|---|---|
| Actor identity | Task 01 server-owned synthetic identity |
| Subject relationship | Server-owned synthetic fixture |
| Delegation | Server-owned synthetic grant fixture |
| Pharmacy scope | Task 01 trusted server context |
| Service and slot configuration | Task 04 server-owned synthetic configuration |
| Booking state | Task 04 booking domain service |
| Capacity | Approved Task 04 PostgreSQL capacity model |
| Waitlist and offer state | Task 04 waitlist domain service |
| Idempotency | Task 04 database-backed idempotency records |
| Event state | Task 04 transactional outbox |
| Audit evidence | Task 04 append-only synthetic audit records |
| Release state | Task 11 release register and server-owned gate |
| Production identity | Task 05, not connected |
| External communications | Task 07, not connected |

Task 04 must not duplicate or override the existing assessment, billing, claim,
clinical, production identity, audit, or retention authorities.

## 7. Data classification

### Allowed synthetic data

- Opaque synthetic actor reference.
- Opaque synthetic subject reference.
- Opaque service-category reference.
- Appointment modality.
- Synthetic slot time.
- Structured language preference.
- Structured accessibility-preparation indicator.
- Synthetic contact destination specifically created for testing.
- Opaque booking, waitlist, offer, hold, receipt, event, and audit references.
- Explicit `SIMULATION ONLY` markers.

### Prohibited data

- Real or production-derived personal information.
- Patient or caregiver names.
- Real email addresses or telephone numbers.
- Health-card information.
- Symptoms or clinical details.
- Medication or diagnosis information.
- Production pharmacy identifiers.
- Production credentials or tokens.
- Production database copies.
- Redacted, masked, pseudonymized, or de-identified production records.

### Data classifications used

- `PUBLIC`
- `INTERNAL`
- `SECURITY_SENSITIVE`
- `SYNTHETIC`
- `SYNTHETIC_FORBIDDEN_MARKER`

Forbidden-marker fixtures will contain unmistakable strings such as:

`SYNTHETIC_FORBIDDEN_MARKER_T04`

These markers must cause deterministic leakage tests to fail if they enter a
prohibited sink.

## 8. Data flow

### Public availability

1. Browser sends a bounded availability query.
2. Server validates the query with strict Zod.
3. Server derives pharmacy scope.
4. Server reads synthetic availability.
5. Server returns only a minimized public projection.
6. No exact capacity, staff, patient, or private schedule data reaches the
   browser.

### Booking command

1. Browser submits an allowlisted command with an idempotency key.
2. Server validates the strict Zod boundary.
3. Server derives actor, subject, authorization, and pharmacy.
4. Server revalidates the slot and capacity.
5. PostgreSQL transaction acquires capacity and creates the booking.
6. The same transaction stores:
   - Idempotency result.
   - Audit record.
   - Stubbed outbox event.
7. Server returns a minimized safe response.
8. No external notification occurs.

### Waitlist-offer acceptance

1. Authorized actor submits the offer reference and idempotency key.
2. Server derives current authorization.
3. Server verifies offer, entry, hold, slot, and expiry.
4. One PostgreSQL transaction:
   - Creates the booking.
   - Consumes the hold.
   - Marks the offer accepted.
   - Marks the entry promoted.
   - Stores idempotency result.
   - Writes audit and outbox records.
5. Retry returns the same booking result.

### Pharmacist queue

1. Server derives synthetic staff identity and pharmacy scope.
2. Server composes minimum necessary queue items.
3. Server renders the queue.
4. Client components receive only approved filter and interaction values.
5. Complete booking, subject, delegate, or contact objects do not cross into
   client props or hydration.

## 9. External and immutable effects

### Permitted synthetic effects

- Booking state changes.
- Waitlist state changes.
- Capacity changes.
- Capacity-hold changes.
- Idempotency records.
- Append-only audit records.
- Stubbed outbox records.
- Lifecycle expiry transitions.

### Prohibited effects

- External messages.
- Calendar events.
- Webhooks.
- Vendor calls.
- Production writes.
- Assessment completion.
- Clinical decisions.
- Claim creation.
- Billing outcomes.
- Prescription activity.
- Production authentication changes.

### Historical integrity

Booking and waitlist history must not be silently rewritten.

Rescheduling must preserve predecessor and successor relationships.

Audit and event records must be append-only.

## 10. Threat model

### Protected assets

- Capacity integrity.
- Booking and waitlist state integrity.
- Actor-subject authorization.
- Pharmacy and tenant isolation.
- Management credentials.
- Idempotency results.
- Audit and event history.
- Minimum necessary contact information.
- Synthetic-environment isolation.
- Production invariance.

### Entry points

- Public availability query.
- Booking creation.
- Booking retrieval.
- Cancellation.
- Rescheduling.
- Waitlist join.
- Waitlist cancellation.
- Offer acceptance.
- Management recovery.
- Pharmacist queue filters and actions.
- Expiry worker.
- Database setup and test harness.

### Threats and required controls

| Threat | Required control |
|---|---|
| Slot enumeration | Opaque references, bounded queries, rate limits |
| Slot hoarding | Transactional holds, expiry, rate limits, idempotency |
| Overbooking race | PostgreSQL constraints and transaction locking |
| Duplicate booking | Database-backed idempotency |
| Duplicate cancellation | State guard and idempotent stored result |
| Duplicate promotion | Unique live-offer constraint and transaction |
| Capacity leakage | Atomic release/consume and rollback tests |
| Cross-pharmacy access | Server-derived scope and database constraints |
| Wrong-subject access | Server-derived actor-subject relationship |
| Caregiver self-assertion | Server-owned grant only |
| Link guessing or replay | Opaque token, digest storage, expiry, revocation, scope |
| Idempotency-key conflict | Canonical request digest comparison |
| Client role escalation | Ignore or reject client authority fields |
| PHI/contact leakage | Static and runtime prohibited-sink tests |
| Waitlist flooding | Privacy-preserving rate limits |
| Oversized request | Body-size and field-length limits |
| Malformed enum or state | Strict Zod and fail-closed transitions |
| Unknown transaction result | Idempotency receipt and recovery query |
| Deadlock | Deterministic lock ordering and bounded retry |
| Expiry race | Single valid final state under concurrent execution |
| External-effect activation | Denied adapters and architecture tests |
| Production import | Existing Task 01 import-denial tests |
| Sandbox database escape | Loopback-only Docker configuration and safe env checks |
| Kill-switch bypass | Server-owned release gate and negative tests |

## 11. Required controls and evidence profile

Each implemented control must have:

- Stable control ID.
- Exact capability version.
- Exact source commit.
- Environment classification.
- Fixture-set version.
- Test ID.
- Expected safe outcome.
- Actual safe outcome.
- Pass, fail, or blocked status.
- Sanitized artifact reference.
- Artifact hash where applicable.
- Evidence producer.
- Required reviewer.
- Review or expiry date.

A skipped, cancelled, timed-out, flaky, missing, stale, or unavailable test is
not a pass.

## 12. Synthetic fixture plan

### Fixture-set version

Proposed:

`T04-SYNTH-FIXTURES-V1`

### Required fixtures

#### Actors

- Own-subject synthetic patient.
- Authorized synthetic delegate.
- Delegate with expired grant.
- Delegate with revoked grant.
- Delegate with wrong subject.
- Delegate with insufficient scope.
- Authorized synthetic staff.
- Unauthorized synthetic staff role.
- Synthetic expiry worker.

#### Services and slots

- In-person service.
- Telephone service.
- Video service.
- Available slot with capacity greater than one.
- Available slot with capacity one.
- Full slot.
- Cancelled slot.
- Expired slot reference.
- Stale slot reference.
- Slot crossing spring DST.
- Slot crossing fall DST.
- Slot viewed from another timezone.

#### Bookings

- Pending booking.
- Confirmed booking.
- Cancelled booking.
- Rescheduled booking with successor.
- Expired request.
- Booking owned by another subject.
- Booking in another synthetic pharmacy scope.

#### Waitlist entries

- Active entry.
- Offered entry.
- Promoted entry.
- Cancelled entry.
- Expired entry.
- Entry with no live offer.
- Entry with one live offer.
- Ineligible entry.

#### Offers and holds

- Pending valid offer with active hold.
- Accepted offer.
- Declined offer.
- Expired offer.
- Cancelled offer.
- Active hold.
- Consumed hold.
- Released hold.
- Expired hold.

#### Management access

- Active valid credential.
- Expired credential.
- Consumed credential.
- Revoked credential.
- Wrong-resource credential.
- Tampered credential.

#### Idempotency

- Completed same-request record.
- In-progress record.
- Conflicting-request record.
- Retryable failure record.
- Unknown-client-outcome scenario.

### Fixture rules

- Every fixture is visibly synthetic.
- IDs are deterministic and non-production-like.
- Fixed clocks are used.
- No production-derived data is permitted.
- No fixture contains a realistic health number.
- No fixture is copied from production logs, exports, screenshots, or database
  rows.

## 13. Test matrix

### T04-ZOD — Boundary validation

Prove:

- Unknown fields are rejected.
- Invalid enums are rejected.
- Excessively long strings are rejected.
- Excessively large arrays are rejected.
- Invalid timezone identifiers are rejected.
- Reversed date ranges are rejected.
- Oversized requests are rejected.
- Unrestricted notes and reason-for-visit fields are rejected.
- Client-supplied actor, subject, caregiver, pharmacy, tenant, role, capacity,
  rank, state, and authorization fields are rejected.
- Raw input does not appear in validation logs.

### T04-AVAIL — Public availability

Prove:

- Only approved fields are returned.
- Exact remaining capacity is not returned.
- Staff identities and schedules are not returned.
- Internal IDs are not returned.
- Slot references are opaque and expire.
- Stale references are rejected at booking time.
- Bounded pagination and date ranges work.
- Enumeration attempts are limited.
- Errors do not reveal another person’s booking activity.

### T04-BOOK — Booking lifecycle

Prove:

- Valid booking succeeds when capacity exists.
- Full slot returns `SLOT_NO_LONGER_AVAILABLE`.
- Displayed availability is revalidated.
- Pending confirmation is used only where configured.
- Cancellation transitions once.
- Rescheduling creates a successor and preserves history.
- Invalid state transitions fail closed.
- Unknown references and unauthorized references return the same safe denial
  shape.

### T04-WAIT — Waitlist lifecycle

Prove:

- Valid join creates one active entry.
- Duplicate active entry is prevented.
- Cancellation is idempotent.
- Cancelled or expired entries cannot be promoted.
- Only one live offer exists per entry.
- Offer expiry releases its hold.
- Acceptance creates one booking.
- Retry returns the same booking.
- Exact waitlist position is never exposed.

### T04-IDEM — Idempotency

Cover:

- Repeated booking creation.
- Repeated cancellation.
- Repeated rescheduling.
- Repeated waitlist join.
- Repeated waitlist cancellation.
- Repeated offer creation.
- Repeated offer acceptance.
- Same key with changed payload.
- Concurrent use of the same key.
- Retry after transaction failure.
- Retry after unknown client-side outcome.
- Timeout after commit.
- No successful receipt after rollback.

### T04-AUTH — Authorization

Cover:

- Patient managing own booking.
- Valid delegate with correct scope.
- Expired delegate grant.
- Revoked delegate grant.
- Wrong-subject delegate.
- Insufficient-scope delegate.
- Authorized staff.
- Unauthorized staff role.
- Cross-pharmacy attempt.
- Expired session.
- Active management credential.
- Expired management credential.
- Consumed management credential.
- Revoked management credential.
- Wrong-resource credential.
- Client-supplied role or subject ignored or denied.

### T04-DB — PostgreSQL constraints

Run only after the Task 01 database extension is approved.

Prove at the database layer:

- Confirmed bookings plus active holds cannot exceed capacity.
- Capacity cannot become negative.
- One live offer per waitlist entry.
- One active booking effect per idempotent command.
- Terminal states cannot become active again.
- Cancelled or expired entries cannot be promoted.
- Historical predecessor and successor relationships remain valid.
- Cross-pharmacy relationships are rejected.
- Audit records cannot be silently altered.
- Outbox records commit with domain state.

### T04-RACE — Concurrency

Use real isolated PostgreSQL, independent connections, and a synchronization
barrier.

Do not claim concurrency coverage using mocks, SQLite, in-memory storage,
sequential promises, or one reused connection.

Cover:

- Two booking requests for the last capacity unit.
- Multiple requests exceeding slot capacity.
- Two simultaneous cancellations.
- Cancellation racing rescheduling.
- Two simultaneous reschedules.
- Rescheduling into the same last-capacity slot.
- Two promotion workers selecting one entry.
- Cancellation racing offer creation.
- Offer acceptance racing expiry.
- Offer acceptance racing cancellation.
- Two slots becoming available simultaneously.
- Concurrent identical idempotency keys.
- Concurrent conflicting payloads using one key.
- Transaction deadlock or serialization retry.
- Rollback after audit or outbox failure.

Expected result:

Every race ends in one valid state without overbooking, duplicate promotion,
duplicate event, duplicate audit row, or capacity leakage.

### T04-PRIV — Privacy and prohibited sinks

Prove synthetic forbidden markers do not appear in:

- URLs.
- Query strings.
- Page titles.
- Referrers.
- Browser storage.
- Client caches.
- Analytics.
- Error-monitoring breadcrumbs.
- Client console output.
- Server logs.
- Safe errors.
- Domain events.
- Notification placeholders.
- Rate-limit keys.
- Test snapshots.
- Screenshots.
- Evidence manifests.
- Hydration payloads beyond the approved minimum.

Add an architecture test that fails if a complete booking, subject, caregiver,
delegate, or contact object crosses into a client component.

### T04-ABUSE — Abuse prevention

Cover:

- Availability scraping.
- Slot enumeration.
- Slot hoarding.
- Repeated booking creation.
- Waitlist flooding.
- Token guessing.
- Token replay.
- Reschedule abuse.
- Cancellation abuse.
- Oversized requests.
- Malformed requests.
- Automated contact testing.
- Privacy-preserving limiter keys.
- Rate-limit recovery.
- Limiter unavailable.
- Shared-network recovery.

Rate limiting is not authorization and is not the primary capacity control.

### T04-UI — User interface and recovery

Cover:

- Public availability.
- Booking submission.
- Booking confirmation.
- Cancellation.
- Rescheduling.
- Waitlist opt-in.
- Waitlist cancellation.
- Offer acceptance.
- Expired access.
- Expired offer.
- Stale slot.
- Partial rendering failure.
- Unknown final status after timeout.
- Session expiry.
- Safe reauthentication or fresh-access path.
- No unrelated-resource enumeration.

### T04-A11Y — Accessibility

Cover:

- 375px layout without horizontal scrolling.
- Desktop layout.
- Keyboard-only operation.
- Logical focus order.
- Visible focus.
- Screen-reader names and status announcements.
- Validation errors linked to fields.
- Status not dependent on colour.
- 200% zoom.
- 400% zoom and reflow.
- Reduced motion.
- Long translated strings.
- No essential hover-only action.
- Frequent one-handed actions meeting the repository’s 56px target.
- Accessible recovery after rate limiting or expiry.

### T04-TIME — Timezone and localization

Cover:

- UTC persistence.
- Explicit `America/Toronto` rendering.
- Ontario spring DST transition.
- Ontario fall DST transition.
- Nonexistent local time.
- Ambiguous local time.
- User viewing from another timezone.
- Rescheduling across a DST boundary.
- Slot-reference expiry across a DST boundary.
- Offer expiry across a DST boundary.
- Long localized labels.

Ambiguous appointment times must not be silently reinterpreted.

### T04-EVENT — Event and external-effect boundary

Prove:

- Events contain only approved opaque metadata.
- Events contain no contact or clinical content.
- Outbox rows commit with domain changes.
- Failed transactions leave no outbox row.
- No email, SMS, push, webhook, or calendar adapter is contacted.
- Events remain explicitly `stubbed` or `not_dispatched`.
- No event can complete an assessment or create a claim.

### T04-QUEUE — Pharmacist queue

Prove:

- Queue is server-rendered.
- Staff and pharmacy scope are server-derived.
- Only minimum necessary administrative fields are shown.
- Complete booking and contact objects do not reach client components.
- Cross-pharmacy items are denied.
- Filter values are allowlisted.
- A visible action does not grant server authorization.
- Empty, loading, partial-failure, blocked, denied, and unknown states remain
  usable.

### T04-BOUNDARY — Sandbox and production invariance

Prove:

- No production import is introduced.
- No production route changes.
- No production authentication change.
- No production migration change.
- No production database connection.
- No external network destination.
- No production credential.
- No live data.
- Existing sandbox network denial remains active.
- Existing Task 01 lifecycle and production-invariance tests pass.
- Root production build and required tests remain unchanged where required.

## 14. Accessibility evidence plan

Evidence will include:

- Automated accessibility checks where supported by current tooling.
- Keyboard test results.
- Screen-reader test notes.
- 375px screenshots.
- Desktop screenshots.
- 200% and 400% zoom evidence.
- Reflow evidence.
- Reduced-motion evidence.
- Long-label evidence.
- Focus-order and visible-focus evidence.
- 56px frequent-action evidence.

Screenshots must contain only unmistakably synthetic data.

Every accessibility finding must have:

- Finding ID.
- Severity.
- Affected route or component.
- Remediation owner.
- Regression test.
- Review status.

## 15. Failure plan

Required failure scenarios:

- Invalid request.
- Unauthorized actor.
- Wrong subject.
- Wrong pharmacy.
- Stale slot.
- Full slot.
- Database unavailable.
- Transaction serialization failure.
- Deadlock.
- Audit insertion failure.
- Outbox insertion failure.
- Idempotency persistence failure.
- Timeout before commit.
- Timeout after commit.
- Partial page rendering failure.
- Expired offer.
- Expired management credential.
- Expired session.
- Rate limiter unavailable.
- Kill switch activated during operation.

Failure rules:

- Unknown state fails closed.
- No forbidden partial state remains.
- Errors are stable and non-sensitive.
- The original booking survives failed rescheduling.
- Capacity is not leaked.
- Idempotency recovery does not duplicate effects.
- Production or external fallback is never attempted.

## 16. Idempotency plan

Each mutable command receives:

- Trusted actor binding.
- Operation name.
- Resource scope.
- Canonical request fingerprint.
- Bounded idempotency key digest.

The service must prove:

- Same key and same request returns the original result.
- Same key and changed request fails.
- Concurrent same-key requests create one effect.
- Failed transactions do not persist successful receipts.
- Unknown outcomes can be queried safely.
- Stored results contain no unnecessary contact information.
- Idempotency keys do not contain PHI or contact data.

## 17. Concurrency plan

After database approval:

- Use a fresh loopback-only Docker PostgreSQL instance.
- Use a synthetic database and schema.
- Use the approved PostgreSQL major version.
- Use independent database connections.
- Use a deterministic synchronization barrier.
- Record container tag and PostgreSQL version.
- Start from a clean database.
- Use deterministic fixture IDs and clocks.
- Record retry counts without payloads.
- Test lock ordering.
- Test serialization retry.
- Test rollback.
- Destroy the disposable database after evidence is captured.

No production database or migration chain may be used unless separately
authorized.

## 18. Rollback and forward-fix plan

### Before database implementation

Rollback consists of removing Task 04 sandbox-only files and restoring the
previous approved Task 01 sandbox state.

### After approved database implementation

The Task 04 synthetic database is disposable.

Rollback must:

- Disable Task 04 through the server-owned kill switch.
- Stop new booking and waitlist commands.
- Define handling for in-flight commands.
- Preserve evidence needed to diagnose an incomplete run.
- Tear down the disposable Docker database.
- Recreate the database from the reviewed synthetic schema.
- Re-run invariant and production-invariance tests.

A database change must not be labelled reversible when it requires destructive
down migration. Use a reviewed forward fix where appropriate.

Production rollback is outside this synthetic task.

## 19. Downtime and recovery plan

When the booking database is unavailable:

- Public availability must show a qualified unavailable state.
- New bookings must be denied safely.
- Cancellation and rescheduling must not claim success.
- Waitlist actions must not claim success.
- No in-memory fallback may create authoritative state.
- No external or production system may be used as fallback.
- Recovery must permit safe status checking through an idempotency receipt.
- Logs remain payload-free.

After recovery:

- Reconcile in-progress idempotency records.
- Expire stale holds and offers using deterministic rules.
- Verify capacity invariants.
- Verify no duplicate events or audits.
- Re-run focused database checks.

## 20. Reconciliation plan

Reconciliation compares:

- Command intent.
- Idempotency state.
- Booking or waitlist state.
- Capacity or hold state.
- Audit state.
- Outbox state.

The system must identify:

- Committed booking with unknown client outcome.
- Receipt without corresponding domain state.
- Domain state without audit or outbox record.
- Active hold past expiry.
- Accepted offer without booking.
- Booking exceeding capacity.
- Duplicate live offers.
- In-progress command past its allowed lifetime.

The synthetic reconciliation process may report and safely block. It must not
invent a clinical, communication, or production correction.

## 21. Feature gate and kill switch

### Gate

Task 04 is enabled only when the trusted server confirms:

- Capability ID and version.
- Synthetic environment.
- Task 01-approved sandbox state.
- Required Task 11 checkpoint decision.
- Database approval where the database path is used.
- Current expiry.
- Current dependency state.
- Kill-switch state.

The safe default is OFF.

A browser flag is not authorization.

### Kill switch

The kill switch must:

- Be server-owned.
- Deny new booking, waitlist, offer, and worker commands.
- Remain usable when Task 04 components are unhealthy.
- Define whether in-flight transactions finish or roll back.
- Stop automated expiry or promotion work safely.
- Preserve read-only recovery where safe.
- Produce payload-free audit evidence.
- Be tested through an automation-disable drill.

Unknown, unavailable, malformed, stale, or expired gate state denies execution.

## 22. Required approvals

### Before database-backed implementation

Required:

- Revised Task 01 approval for the loopback-only synthetic PostgreSQL
  extension.
- Exact approved database boundary.
- Confirmation that no production imports, data, credentials, or migrations
  are involved.

### Before runnable Task 04 implementation

Required:

- Task 11 Checkpoint 1 decision.
- Quality review.
- Security review.
- Privacy review.
- Accessibility review.
- Capability-owner approval.
- Confirmation of the synthetic scope.

### Before synthetic promotion

Required:

- Task 11 Checkpoint 2 evidence review.
- Exact commit-bound evidence.
- Database and concurrency evidence.
- Authorization and privacy evidence.
- Accessibility evidence.
- Kill-switch and rollback evidence.
- All blocking findings resolved.

### Before production

Not authorized under this plan.

Future production use requires the applicable Task 02, Task 05, Task 07, Task
11, privacy, security, accessibility, product, professional, and release
approvals.

## 23. Stop conditions

Stop the affected workstream when:

- Repository instructions conflict with the proposed change.
- Database approval has not been granted for database work.
- Task 11 Checkpoint 1 is missing for runnable implementation.
- Real or production-derived data appears.
- A production credential, host, route, database, storage system, or integration
  becomes reachable.
- Capacity cannot be enforced transactionally in PostgreSQL.
- A race permits overbooking, duplicate promotion, or capacity leakage.
- A rollback leaves partial booking, waitlist, audit, idempotency, or outbox
  state.
- Client input can select actor, subject, caregiver, role, pharmacy, tenant,
  capacity, rank, or authorization.
- Caregiver authority must be guessed or self-asserted.
- Clinical information is requested, stored, inferred, or displayed.
- A status implies clinical review, eligibility, safety, payment, or guaranteed
  confirmation.
- Public availability exposes private staff, patient, capacity, or tenant data.
- Contact or forbidden synthetic markers appear in a URL, log, event,
  analytics payload, browser store, screenshot, or evidence artifact.
- External notification delivery occurs.
- A production response time, retention period, delegation rule, or waitlist
  priority would need to be invented.
- Existing Task 01, tenant, authorization, privacy, audit, or production
  invariance controls must be weakened.
- Any required test is skipped or made unconditional merely to obtain a pass.

Safe independent documentation and design work may continue when only the
database or production path is blocked.

## 24. Planned implementation areas

These paths are proposed and remain subject to approval and repository
conventions:

```text
apps/experiment-sandbox/src/booking/
apps/experiment-sandbox/src/booking/contracts/
apps/experiment-sandbox/src/booking/domain/
apps/experiment-sandbox/src/booking/services/
apps/experiment-sandbox/src/booking/fixtures/
apps/experiment-sandbox/src/booking/db/
apps/experiment-sandbox/src/app/booking/
apps/experiment-sandbox/src/app/pharmacist/bookings/
apps/experiment-sandbox/src/__tests__/booking/
docs/task-04/
```

No production route or module will be imported.

## 25. Planned verification commands

Final commands will use existing repository scripts and the approved database
runbook.

At minimum:

```text
npm run typecheck
npm run lint
npm run test
npm run verify-boundary
npm run verify-production
npm run build
```

Database commands will be added only after approval and must use the approved
loopback-only Docker PostgreSQL workflow.

Required checks must not be skipped, renamed to unconditional success, or run
against an already contaminated database.

## 26. Evidence outputs

Planned evidence:

- Requirement-to-test matrix.
- TypeScript result.
- ESLint result.
- Pure unit-test result.
- Architecture and boundary-test result.
- Production-invariance result.
- Fresh synthetic PostgreSQL setup evidence.
- Database constraint evidence.
- Concurrency evidence.
- Idempotency evidence.
- Authorization and cross-pharmacy denial evidence.
- Privacy and forbidden-marker scans.
- Accessibility evidence.
- 375px and desktop screenshots.
- Kill-switch drill.
- Downtime and recovery drill.
- Rollback or forward-fix evidence.
- Current findings register.
- Exact commit and dependency-lock identity.
- Sanitized evidence manifest and artifact hashes.

No evidence artifact may contain PHI, secrets, contact information, management
tokens, raw payloads, or reusable identifiers.

## 27. Review request

Requested Task 11 Checkpoint 1 decision:

`APPROVED_TO_IMPLEMENT_SYNTHETIC`

Known blocking condition:

The PostgreSQL-backed work remains blocked until the revised Task 01 database
extension receives explicit approval.

Permitted work while blocked:

- Documentation.
- Threat modelling.
- Zod contract design.
- Pure state-transition logic.
- Deterministic synthetic fixture design.
- UI wireframes and non-persistent components, where Task 11 reviewers permit.
- Accessibility planning.
- Test skeleton design without bypassing required database evidence.

The implementer does not self-approve this plan.