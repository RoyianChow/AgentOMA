# Task 04 — Pre-Implementation Test Plan

**Capability:** Synthetic Online Booking and Waitlist
**Capability ID:** `TASK04_BOOKING_WAITLIST_SYNTHETIC`
**Status:** Approved for synthetic implementation; evidence not yet produced
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Release stage:** `APPROVED_TO_IMPLEMENT_SYNTHETIC`
**Production authorization:** None
**Task 01 database extension:** Approved for the exact loopback-only synthetic scope
**Task 11 Checkpoint 1:** `APPROVED_TO_IMPLEMENT_SYNTHETIC`
**Synthetic approval recorded:** 2026-08-02
**Risk tier:** `R3`
**Autonomy:** `A3_BOUNDED_AUTOMATION`
**Accountable owner:** Royian Chowdhury
**Backup owner:** Royian Chowdhury
**Operations/SRE reviewer:** Royian Chowdhury
**Expiry/review due:** 2026-08-05

These roles are consolidated and non-independent, as disclosed in the
append-only approval record. Production, G2 hosted preview, G3 production
imports, live or production-derived data, cloud databases, external effects,
and production deployment remain prohibited.

## Canonical planning references

Boundary fields/enums/errors are canonical in
[`api-and-zod-contracts.md`](api-and-zod-contracts.md); transitions are
canonical in [`state-machines.md`](state-machines.md); section 11.1 of this
document is the single control-to-evidence matrix.

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
- Transactional outbox event with `dispatch_status = not_dispatched`.

### T04-C — Waitlist and promotion offers

Purpose:

- Join or cancel a synthetic waitlist entry.
- Create, expire, decline, and accept capacity-backed promotion offers.

Effects:

- Mutable waitlist, offer, and capacity-hold state.
- Booking creation after valid offer acceptance.
- Idempotency result.
- Audit reference.
- Transactional outbox event with `dispatch_status = not_dispatched`.

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

- Expire synthetic offers, holds, pending requests, and management credentials using a
  deterministic clock.

Effects:

- Bounded automated state transition.
- No external delivery or clinical effect.

## 4. Risk tier and autonomy level

### Approved risk tier

`R3`

Reason:

The capability creates mutable non-clinical administrative state and requires
authorization, server-only `PHARMACY_ID` pinning, audit evidence, idempotency,
accessibility,
rollback, and real-database constraint testing.

Task 11 approved this tier on 2026-08-02. It must not be lowered without a new
authorized review.

### Approved autonomy level

The capability-level registration is `A3_BOUNDED_AUTOMATION`. Individual
human-triggered commands remain human-triggered behavior inside that exact
registered capability; they are not separate capability registrations.

| Capability behavior | Execution mode | Reason |
|---|---|---|
| Public availability | Read-only within `A3_BOUNDED_AUTOMATION` | No mutation |
| Booking, cancellation, rescheduling | Human-triggered within `A3_BOUNDED_AUTOMATION` | Authorized actor starts bounded command |
| `waitlist:join`, `waitlist:leave`, `waitlist:offer:accept`, and `waitlist:offer:decline` | Human-triggered within `A3_BOUNDED_AUTOMATION` | Authorized actor starts bounded command |
| Staff administrative actions | Human-triggered within `A3_BOUNDED_AUTOMATION` | Authorized staff starts bounded command |
| Offer, hold, pending-booking, and credential expiry | Automated within `A3_BOUNDED_AUTOMATION` | Trusted-time worker executes bounded terminal transition |
| Promotion-offer creation | Automated within `A3_BOUNDED_AUTOMATION` | Server applies the exact non-clinical `promotion_candidate` predicate |

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

### Pharmacy scope

Every tenant-scoped read/write is pinned to server-only `PHARMACY_ID`, derived
only from sandbox-owned `TASK04_SANDBOX_PHARMACY_ID`. Task 04 adds no pharmacy
selector, tenant selector, or
multi-pharmacy runtime. Cross-pharmacy records are database-level negative-test
fixtures only and can never select or broaden runtime scope.

### Staff authority

Staff actions require a server-owned synthetic staff role. Pharmacist queue
reads require the exact `queue:read` permission.

Displaying an action in the interface does not grant server authorization.

## 6. Authoritative systems

| Concern | Synthetic authority |
|---|---|
| Actor identity | Task 01 server-owned synthetic identity |
| Subject relationship | Server-owned synthetic fixture |
| Delegation | Server-owned synthetic grant fixture |
| Pharmacy scope | Existing server-only `PHARMACY_ID` |
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
3. Server binds scope to server-only `PHARMACY_ID`.
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
   - Outbox event with `dispatch_status = not_dispatched`.
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

1. Server derives synthetic staff identity and binds server-only
   `PHARMACY_ID`.
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
- Outbox records with `dispatch_status = not_dispatched`,
  `synthetic_marker`, and `source_capability`.
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
- Server-only `PHARMACY_ID` isolation.
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
- `waitlist:leave`.
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

### 11.1 Canonical control-to-evidence matrix

This is the single Task 04 requirement-to-evidence matrix. Other Task 04
documents reference these rows rather than creating conflicting matrices.
“Registered reviewer” means Royian Chowdhury acting in the named consolidated
role; the resulting review is explicitly non-independent.

| Control/requirement ID | Requirement/invariant | Test IDs | Environment | Expected evidence | Required reviewer | Pass semantics | Checkpoint | Current blocker/approval state |
|---|---|---|---|---|---|---|---|---|
| `T04-GOV-01` | Exact scope, `R3`, `A3_BOUNDED_AUTOMATION`, owner/reviewer, expiry, and fail-closed gate | `T04-DRILL-AUTOMATION-DISABLE` | Pure plus sandbox lifecycle | Decision hash, gate tests, trusted expiry evidence | Task 11/Operations registered reviewer | Exact metadata matches; execution denied after expiry | CP1 and CP2 | CP1 approved through 2026-08-05; runtime evidence pending |
| `T04-SCOPE-01` | No production, G2/G3, live data, cloud DB, external effect, or production import | `T04-ARCH-TASK01-BOUNDARY` | Pure/architecture | Import/network/env scans and production-invariance artifact | Security/Privacy registered reviewer | Every prohibited path unreachable; any unknown is fail | CP2 | Synthetic scope approved; evidence pending |
| `T04-PHARMACY-01` | Sandbox loader derives server-only `PHARMACY_ID` only from `TASK04_SANDBOX_PHARMACY_ID`; no production inheritance, selector, or runtime switching | `T04-ARCH-TASK01-BOUNDARY`, `T04-DB`, `T04-QUEUE` | Pure plus real PostgreSQL | Startup validation, injection denials, and cross-pharmacy negative-fixture results | Security/Privacy registered reviewer | Missing/malformed/non-synthetic config fails closed; no fixture outside `PHARMACY_ID` can be read, related, or mutated | CP2 | Design approved; evidence pending |
| `T04-ADMIN-01` | Administrative-only; no clinical/eligibility/billing behavior or unrestricted clinical text | `T04-ZOD`, `T04-PRIV`, `T04-UI` | Pure/UI | Schema rejection, content scan, UI evidence | Quality/Security registered reviewer | All prohibited fields/claims absent | CP2 | Design approved; evidence pending |
| `T04-CAP-01` | Confirmed bookings plus active holds never exceed capacity | `T04-DB`, `T04-RACE` (`RACE-01`-`RACE-19`) | Real PostgreSQL | Constraint and synchronized race results | Quality/Operations registered reviewer | Invariant holds after every commit/rollback | CP2 | Database scope approved; implementation/evidence pending |
| `T04-HOLD-01` | Pending booking/offer hold is atomic and counted; confirm/accept consumes, clock expires, early exit releases once | `T04-BOOK`, `T04-WAIT`, `T04-DB`, `T04-RACE` | Pure plus real PostgreSQL | State assertions, row ownership, event/audit evidence | Quality/Operations registered reviewer | Exactly one terminal state/effect under all races | CP2 | Design approved; implementation/evidence pending |
| `T04-IDEM-01` | Same request returns original; changed payload conflicts; one concurrent effect | `T04-IDEM`, `T04-RACE` | Pure plus real PostgreSQL | Receipt/fingerprint/race evidence | Quality registered reviewer | One effect/receipt; no success after rollback | CP2 | Design approved; evidence pending |
| `T04-WAIT-01` | Exact non-clinical `promotion_candidate`, `PROPOSED_SYNTHETIC_ORDERING_PENDING_PRODUCT_CONFIRMATION`, and live duplicate scope | `T04-WAIT`, `T04-DB`, `T04-RACE` | Pure plus real PostgreSQL | Predicate cases, ordering-label assertion, partial unique constraint, worker races | Quality registered reviewer | Only matching candidate selected under the proposed synthetic order; one live scoped entry/offer | CP2 | Synthetic predicate implementation approved; ordering remains pending product confirmation and production priority remains blocked |
| `T04-AUTH-01` | Server-derived actor/subject/grant/current authority for every command | `T04-AUTH` | Pure plus real PostgreSQL where relationship constrained | Authorization matrix and denial equivalence | Security/Privacy registered reviewer | All negative cases denied without existence leak | CP2 | Synthetic fixture contract approved; production Task 05 blocked |
| `T04-CRED-01` | Reusable/session-bound and one-time credential issuance, digest/scope/expiry/revocation/atomic consumption enforced | `T04-CREDENTIAL-LIFECYCLE` | Pure plus real PostgreSQL | Issuance, replay, failed-mutation, success-consumption, revocation-race, generic recovery evidence | Security registered reviewer | Raw secret returned once; failures do not consume; terminal/wrong-scope authority never authorizes | CP2 | Design approved; evidence pending |
| `T04-ZOD-01` | Every request/response/event uses exact strict canonical schema and bounds | `T04-REGISTRY-COMMAND`, `T04-EVENT-ENVELOPE` | Pure | Positive/negative parse cases and response-shape snapshots | Quality registered reviewer | Unknown/invalid/out-of-bound data rejected; normalized outputs exact | CP2 | Canonical contract documented; runtime evidence pending |
| `T04-ERROR-01` | Canonical generic error registry and endpoint subsets | `T04-ZOD`, `T04-PRIV`, `T04-UI` | Pure/UI | Error mapping and forbidden-marker scans | Security/Accessibility registered reviewer | Only allowed code/message emitted; no raw detail | CP2 | Canonical contract documented; evidence pending |
| `T04-EVENT-01` | Canonical versioned discriminated union, exact payload/reason, aggregate version/protected scope, no external delivery | `T04-EVENT-ENVELOPE` | Pure plus real PostgreSQL/architecture | Atomic outbox rows, every union member parses, wrong payload/reason rejects, network denial | Security/Quality registered reviewer | One committed event; `dispatch_status=not_dispatched`; no forbidden field or dispatch state | CP2 | Synthetic outbox approved; Task 07 delivery blocked |
| `T04-AUDIT-01` | Every successful transition has append-only synthetic audit evidence; audit failure rolls back | `T04-DB`, `T04-RACE`, `T04-EVENT` | Real PostgreSQL | Append-only/rollback/concurrency results | Quality registered reviewer | No domain success without one matching safe audit effect | CP2 | Synthetic audit model approved; production audit implementation excluded |
| `T04-PRIV-01` | No PHI/contact/credentials in URLs, logs, storage, analytics, events, screenshots, hydration | `T04-PRIV`, `T04-BOUNDARY` | Pure/architecture/UI | Deterministic forbidden-marker scans | Security/Privacy registered reviewer | Zero forbidden-marker sink findings | CP2 | Design approved; evidence pending |
| `T04-QUEUE-01` | Server-rendered minimized queue; `queue:read`; canonical query/item; strict complete/partial/stale response; no aggregate ref | `T04-QUEUE-PARTIAL` | Pure/UI plus real PostgreSQL scope test | Projection allowlist, response-state parses, bundle/hydration scans, permission denials | Security/Accessibility registered reviewer | Exact fields only; partial/stale is truthful; unauthorized/cross-scope reads denied | CP2 | Design documented; runtime evidence pending |
| `T04-ABUSE-01` | Privacy-preserving bounded rate/size/enumeration/replay controls and safe public-availability cache | `T04-ABUSE`, `T04-ZOD`, `T04-CACHE-AVAILABILITY` | Pure/integration | Limit, cache, recovery, and failure-mode evidence | Security/Accessibility registered reviewer | Cache hits cannot bypass controls/auth/capacity; protected data never cached; recovery remains accessible | CP2 | Synthetic configuration bounds remain implementation inputs, not production policy |
| `T04-A11Y-01` | Keyboard, screen reader, reflow, touch, status, automated/manual contrast | `T04-A11Y`, `T04-UI` | UI automated plus manual | Reports, notes, screenshots, measured contrast ratios | Accessibility registered reviewer | No blocking finding; every listed category evidenced | CP2 | Evidence deliverable planned |
| `T04-TIME-01` | UTC instants, explicit IANA timezone, calendar/DST ambiguity handled | `T04-TIME`, `T04-ZOD`, `T04-RACE` | Pure/UI plus real PostgreSQL time races | DST cases, render evidence, trusted-time race result | Quality/Accessibility registered reviewer | No silent reinterpretation; database time decides expiry | CP2 | Design documented; evidence pending |
| `T04-A3-01` | Promotion breaker/kill switch stops new automation but preserves bounded safety cleanup | `T04-DRILL-AUTOMATION-DISABLE` | Pure plus real PostgreSQL/drill | Queued/in-flight/acceptance/expiry/reconciliation artifacts | Operations/Task 11 registered reviewer | No new offer after disable; cleanup completes; reset is authorized/evidenced | CP2 | Behavior documented; drill pending |
| `T04-REC-01` | Unknown outcome, rollback, downtime, restore, and reconciliation are safe | `T04-DRILL-RECOVERY` | Real PostgreSQL/drill | Reconciliation report and rollback/restore evidence | Operations/Quality registered reviewer | No partial state; every mismatch blocked or owned | CP2 | Design documented; evidence pending |
| `T04-VERIFY-01` | Root and sandbox sanctioned commands pass at exact source commit | `T04-BOUNDARY` plus command manifests | Root and sandbox | Command outputs, hashes, evidence manifest | Quality/Task 11 registered reviewer | Every command exits zero; skipped/stale result is fail | CP2 | Planned; no verification claimed |

### 11.2 Stable planned evidence/test contracts

These identifiers are canonical and must be used unchanged in test names,
artifact manifests, and the matrix above.

#### T04-DRILL-AUTOMATION-DISABLE

- Planned test: disable `A3_BOUNDED_AUTOMATION` with queued and
  barrier-paused promotion work, then exercise acceptance, expiry,
  cancellation, reconciliation, and authorized reset.
- Pass: no new offer commits after disable; blocked acceptance has no mutation;
  bounded safety cleanup completes; reset evidence identifies the authorized
  actor and control version.
- Evidence: sanitized run manifest, barrier trace categories, invariant query
  results, and hashes.

#### T04-DRILL-RECOVERY

- Planned test: exercise unknown committed/uncommitted outcomes, expired and
  revoked access, database interruption, restart, and reconciliation.
- Pass: no duplicate effect or unsafe existence disclosure; committed results
  are recovered; uncommitted work leaves no partial state.
- Evidence: sanitized recovery matrix, reconciliation report, invariant query
  results, and hashes.

#### T04-ARCH-TASK01-BOUNDARY

- Planned test: prove Task 04 imports and runtime reachability remain inside
  `apps/experiment-sandbox/` and cannot reach production adapters, hosts,
  environment, storage, authentication, or data.
- Pass: every prohibited import/network/environment path fails closed; only
  deterministic synthetic fixtures and loopback database are reachable.
- Evidence: boundary scan, production-invariance artifact, and hashes.

#### T04-REGISTRY-COMMAND

- Planned test: table-drive every section 4B command through its exact actor,
  permission/credential, strict request/response, idempotency, error subset,
  event, audit, and boundary contract.
- Pass: missing/unknown fields, wrong actors/permissions, aliases, and wrong
  response shapes reject; every authorized success has only its registered
  effects.
- Evidence: command registry coverage report and snapshots.

#### T04-CREDENTIAL-LIFECYCLE

- Planned test: cover reusable server-session capability issuance/use,
  one-time credential issuance, non-replay of the raw secret, failed-mutation
  non-consumption, successful atomic consumption, expiry, revocation,
  predecessor/successor rotation, and offer-to-booking transfer.
- Pass: possession alone never authorizes; raw secret appears only once;
  terminal/wrong-scope credentials fail generically; one protected commit
  consumes once.
- Evidence: lifecycle transition matrix, race results, prohibited-sink scan,
  and hashes.

#### T04-QUEUE-PARTIAL

- Planned test: exercise complete/fresh, one-source partial, stale,
  total-failure, denied, and reauthentication states against the exact strict
  queue response.
- Pass: empty success is never used for partial/total failure; unavailable
  source categories, freshness, generated time, and refresh guidance are
  truthful and accessible.
- Evidence: schema snapshots, server-rendered UI results, hydration scan, and
  accessibility notes.

#### T04-EVENT-ENVELOPE

- Planned test: parse every event union member and reject mismatched
  `eventType`, `aggregateType`, payload, safe reason code, scope, version,
  dispatch status, cleanup metadata, and forbidden field.
- Pass: event and domain mutation commit or roll back together;
  `dispatch_status` remains only `not_dispatched`; payloads are minimized; no
  external effect occurs.
- Evidence: union coverage report, transaction results, forbidden-marker
  scan, network-denial artifact, and hashes.

#### T04-CACHE-AVAILABILITY

- Planned test: cover complete cache-key isolation, configured TTL expiry,
  hit/miss equivalence for rate/enumeration controls, post-commit
  invalidation, bypass on absent TTL/unknown freshness, startup failure for
  malformed TTL, request failure for unknown controls, and transactional
  booking revalidation after a stale displayed result.
- Pass: HTTP response is always `Cache-Control: no-store`; only strict public
  availability response data enters the server cache; protected responses and
  browser storage remain empty; cache state never authorizes capacity.
- Evidence: sanitized cache trace categories, response-header assertions,
  protected-cache scan, transaction result, and hashes.

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
- Booking in a cross-pharmacy database negative-test fixture.

#### Waitlist entries

- Active entry.
- Offered entry.
- Promoted entry.
- Cancelled entry.
- Expired entry.
- Entry with no live offer.
- Entry with one live offer.
- Entry that fails one `promotion_candidate` criterion.

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
- Pending confirmation and its active expiring hold are created atomically.
- The pending hold counts against capacity.
- Confirmation consumes the hold; cancellation releases it; trusted-time
  expiry expires it, each exactly once.
- Cancellation transitions once.
- Rescheduling creates a successor and preserves history.
- Invalid state transitions fail closed.
- Unknown references and unauthorized references return the same safe denial
  shape.

### T04-WAIT — Waitlist lifecycle

Prove:

- Valid join creates one active entry.
- Duplicate active entry is prevented.
- `waitlist:leave` is idempotent, results in `cancelled`, and emits
  `waitlist.cancelled`.
- Cancelled or expired entries cannot be promoted.
- Promotion uses only the exact non-clinical `promotion_candidate` predicate.
- The live-entry duplicate scope is `(PHARMACY_ID, subject_reference,
  service_category_reference, modality_preference)` for `active` or `offered`.
- Only one live offer exists per entry.
- Offer clock expiry changes its hold to `expired`; early decline,
  cancellation, or withdrawal changes it to `released`.
- Acceptance creates one booking.
- Retry returns the same booking.
- Exact waitlist position is never exposed.

### T04-IDEM — Idempotency

Cover:

- Repeated booking creation.
- Repeated cancellation.
- Repeated rescheduling.
- Repeated waitlist join.
- Repeated `waitlist:leave`.
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
- Cross-pharmacy database negative-test fixture attempt.
- Expired session.
- Active management credential.
- Expired management credential.
- Consumed management credential.
- Revoked management credential.
- Wrong-resource credential.
- Client-supplied role or subject ignored or denied.

### T04-DB — PostgreSQL constraints

Run only inside the exact Task 01 database scope approved on 2026-08-02.

Prove at the database layer:

- Confirmed bookings plus active holds cannot exceed capacity.
- Capacity cannot become negative.
- One live offer per waitlist entry.
- One active booking effect per idempotent command.
- Terminal states cannot become active again.
- Cancelled or expired entries cannot be promoted.
- Historical predecessor and successor relationships remain valid.
- Cross-pharmacy negative-test fixtures cannot satisfy a scoped relationship,
  query, capacity mutation, or command.
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
- Pending confirmation racing confirmation.
- Pending confirmation racing cancellation.
- Pending confirmation racing trusted-time expiry.
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
- Explicit `waitlist:join` choice; booking creation contains no
  `waitlistOptIn` field.
- `waitlist:leave`.
- `waitlist:offer:accept` and `waitlist:offer:decline`.
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
- Automated contrast checks for text, controls, status indicators, errors,
  focus indicators, and non-text UI.
- Manual contrast measurements for those same categories in default, hover,
  focus, disabled, error, and high-zoom states.

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
- Every event has `dispatch_status = not_dispatched`; synthetic stub identity
  uses `synthetic_marker` and `source_capability`.
- No event can complete an assessment or create a claim.

### T04-QUEUE — Pharmacist queue

Prove:

- Queue is server-rendered.
- Staff authority includes `queue:read` and scope is server-only
  `PHARMACY_ID`.
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
- Automated contrast reports covering text, controls, status indicators,
  errors, focus indicators, and non-text UI.
- Manual contrast measurements and screenshots for the same categories,
  including interaction states that automated tools cannot establish.

Screenshots must contain only unmistakably synthetic data.

Every accessibility finding must have:

- Finding ID.
- Severity.
- Affected route or component.
- Remediation owner.
- Regression test.
- Review status.

## 14A. Administrative copy contract

The copy below is a synthetic planning contract, not approved production
wording. It contains no production response-time promise.

| Copy ID | Required synthetic meaning | Placement | Owner/status |
|---|---|---|---|
| `COPY-EMERGENCY` | “Synthetic prototype: If this were an emergency, do not use this booking form. Use the emergency service appropriate to your location.” | Visibly before submission and repeated on confirmation/recovery | Product/copy owner Royian Chowdhury; `DRAFT_SYNTHETIC_COPY`, human copy/accessibility approval required before implementation |
| `COPY-NOT-MONITORED` | “This booking service is not monitored for symptoms or emergencies. Do not enter medical details.” | Before the first data entry, immediately before submission, and on confirmation | Same owner/status |
| `COPY-CONFIRMATION` | “Your request is confirmed only when the displayed status is Confirmed. Pending confirmation is a temporary administrative hold, not a confirmed appointment.” | Immediately before submission and adjacent to the resulting status | Same owner/status |
| `COPY-ADMIN-RESPONSE` | “This synthetic prototype sends no messages. Check the displayed administrative status. No production response time has been approved.” | Before submission, on confirmation, and in recovery | Same owner/status |

Production copy, jurisdiction-specific emergency wording, and response times
require separate product, accessibility, privacy/legal, and operations approval.
Implementation must source copy from a versioned synthetic configuration
object owned by the capability owner; components must not create variants.

Accessibility tests must prove the copy is visible (not only ARIA text), precedes
the submit control in reading/focus order, remains present at 375px and 400%
zoom, has appropriate live-region behavior for changed confirmation status,
uses plain language, does not rely on colour, and passes the automated/manual
contrast evidence requirements above.

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

Within the approved synthetic database scope:

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
- Current unexpired 2026-08-02 synthetic database approval.
- Current expiry.
- Current dependency state.
- Kill-switch state.

The safe default is OFF.

A browser flag is not authorization.

### Kill switch

The canonical `A3_BOUNDED_AUTOMATION` breaker/kill-switch behavior is defined
in section 33 of
[`concurrency-and-capacity-design.md`](concurrency-and-capacity-design.md).
In summary:

- new promotion creation stops immediately;
- unclaimed queued promotion work is rejected;
- in-flight promotion transactions recheck immediately before commit and roll
  back when disabled;
- the capability kill switch denies new booking, reschedule, waitlist join,
  confirmation, promotion, and offer acceptance with `FEATURE_DISABLED`;
- cancellation, `waitlist:leave`, expiry, hold cleanup, read-only queue access,
  and reconciliation continue as bounded safety cleanup;
- already-issued offers cannot be accepted while the capability kill switch is
  active and instead cancel or expire through trusted-time cleanup;
- no production or external fallback exists; and
- safe signals, registered owner/reset authority, evidence fields, and the
  automation-disable drill are mandatory.

Unknown, unavailable, malformed, stale, or expired gate state denies execution.

## 22. Required approvals

### Before database-backed or runnable synthetic implementation

Satisfied on 2026-08-02 for the exact approved scope:

- Task 11 Checkpoint 1 `APPROVED_TO_IMPLEMENT_SYNTHETIC`.
- Loopback-only Task 01 PostgreSQL/database boundary.
- `R3` and `A3_BOUNDED_AUTOMATION`.
- Capability-owner, Quality, Security/Privacy, Operations/SRE, Accessibility,
  and Task 11 review by Royian Chowdhury.
- Expiry and review due 2026-08-05.

The role consolidation is non-independent. Any later production or promotion
stage requiring independent coverage remains blocked until an eligible
independent person supplies it.

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
- The synthetic approval is expired, missing, contradictory, or exceeded.
- The recorded Task 11 Checkpoint 1 decision becomes missing, superseded,
  contradictory, or expired for runnable implementation. The current
  2026-08-02 Checkpoint 1 is satisfied through 2026-08-05.
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
production path is blocked.

## 24. Planned implementation areas

These paths are proposed under the 2026-08-02 synthetic approval and remain
subject to repository conventions and approval expiry:

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

Root:

```text
npm exec -- tsc --noEmit --incremental false
npm run lint
npm run test
npm run build
```

Sandbox:

```text
npm run sandbox:verify
npm run sandbox:verify-artifact
npm run sandbox:verify-evidence
npm run sandbox:verify-production
npm run sandbox:build
```

This planning correction adds no package scripts or database commands.

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

## 27. Review status

Task 11 Checkpoint 1 is `APPROVED_TO_IMPLEMENT_SYNTHETIC`. The approval
record's later registration block resolves the fields that its earlier
narrative called unresolved: `R3`, `A3_BOUNDED_AUTOMATION`, Royian Chowdhury as
accountable owner/backup/Operations-SRE reviewer, and 2026-08-05 for expiry and
review due. The append-only approval record is not edited.

Runtime implementation and Checkpoint 2 evidence are not claimed. Production,
G2, G3, live data, cloud databases, external effects, production imports, and
production deployment remain blocked. The implementer does not self-approve
promotion.
