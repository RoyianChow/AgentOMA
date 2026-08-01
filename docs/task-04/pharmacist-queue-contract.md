# Task 04 — Pharmacist Booking Queue Contract

**Status:** Draft for review
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Production data:** Prohibited
**Database implementation:** Blocked pending revised Task 01 approval
**Task 11 Checkpoint 1:** Not yet reviewed

## 1. Purpose

This document defines the authorization, data-minimization, server-rendering,
filtering, ordering, interaction, accessibility, privacy, failure, and testing
contract for the synthetic Task 04 pharmacist booking queue.

The queue is an administrative scheduling interface.

It is intended to help an authorized synthetic pharmacist identify:

- Which synthetic appointments require administrative preparation.
- The appointment time and configured timezone.
- The service category and modality.
- The current administrative booking status.
- Whether a structured language or accessibility preparation indicator exists.
- Why the item appears in the queue.
- Whether a specific administrative action is currently permitted.

The queue must not:

- Perform clinical triage.
- Determine clinical urgency.
- Determine clinical eligibility.
- Rank patients using health information.
- Recommend treatment.
- Complete an assessment.
- Complete an appointment.
- Generate a prescription.
- Generate or submit a claim.
- Infer that a modality is clinically suitable.
- Expose a complete patient, caregiver, booking, or contact record.
- Connect to production identity, data, or infrastructure.

## 2. Governing boundary

Task 04 owns:

- Synthetic appointment queue projection.
- Queue authorization.
- Minimum necessary administrative fields.
- Booking-state and waitlist-state references.
- Safe queue reasons.
- Safe administrative action availability.
- Server-side filter validation.
- Server-side ordering.
- Pagination.
- Queue failure states.
- Client-boundary enforcement.
- Queue architecture and privacy tests.

Task 04 does not own:

- Clinical prioritization.
- Clinical notes.
- Assessment content.
- Prescription content.
- Billing or claim information.
- Production patient identity.
- Production caregiver authority.
- Production pharmacist permissions.
- Real notifications or reminders.
- Real contact information.
- Production retention policy.

Production identity and delegation remain owned by Task 05.

Future communication activity remains owned by Task 07.

## 3. Core invariants

### QUEUE-INV-01 — Authorized staff only

Only an authorized synthetic staff actor may access the pharmacist queue.

### QUEUE-INV-02 — Server-derived scope

Pharmacy, tenant, actor, and role scope must be derived from trusted server
context.

### QUEUE-INV-03 — Minimum necessary projection

The queue returns only the fields required for the approved administrative
purpose.

### QUEUE-INV-04 — Server rendering

Any production PHI-bearing queue must remain server-rendered.

The synthetic prototype must follow the same architectural boundary.

### QUEUE-INV-05 — No complete objects in the client

Complete booking, actor, subject, patient, delegate, caregiver, grant, or
contact objects must not cross into client components.

### QUEUE-INV-06 — No client authorization

A visible button, filter, query value, or client-provided role does not grant
authority.

### QUEUE-INV-07 — No clinical ranking

Queue order and reason codes must not use clinical information or automated
clinical inference.

### QUEUE-INV-08 — No hidden empty state

A failed or unavailable source must not be displayed as though the queue were
successfully empty.

### QUEUE-INV-09 — No sensitive browser persistence

Queue data must not enter browser storage, client caches, analytics, or unsafe
telemetry.

### QUEUE-INV-10 — No implied clinical meaning

No queue label may imply:

- Clinical approval.
- Clinical urgency.
- Clinical safety.
- Eligibility.
- Guaranteed appointment availability.
- Payment.
- Claim approval.
- Prescription status.

## 4. Authorized actors

### 4.1 Synthetic pharmacist actor

Access requires:

- Trusted synthetic staff identity.
- Explicit approved staff actor type.
- Active synthetic session.
- Server-derived pharmacy scope.
- Server-derived tenant scope.
- Explicit queue-read permission.
- Current Task 04 feature-gate approval.
- Current kill-switch state.
- Approved synthetic environment.

### 4.2 Administrative staff

The initial Task 04 contract is for an authorized synthetic pharmacist queue.

Any separate administrative-staff role requires:

- A separately approved role definition.
- Explicit permitted fields.
- Explicit permitted actions.
- Independent authorization tests.

The pharmacist role must not be reused as a generic staff role.

### 4.3 Patient and delegate actors

Patients and delegates must not access the pharmacist queue.

Patient booking-management access is a separate route and authorization
boundary.

### 4.4 System workers

A synthetic system worker may create or expire queue-relevant state through
approved domain transactions.

A worker does not receive interactive pharmacist-queue access.

## 5. Authorization sequence

Every queue request must:

1. Validate the strict queue-query Zod schema.
2. Reject unknown fields.
3. Load trusted environment classification.
4. Derive the actor from server context.
5. Verify the synthetic staff actor type.
6. Verify the active session.
7. Derive pharmacy scope.
8. Derive tenant scope.
9. Verify the queue-read permission.
10. Verify the Task 04 feature gate.
11. Verify the kill switch.
12. Apply only allowlisted filters.
13. Query only the authorized scope.
14. Create the minimum necessary projection.
15. Render the protected queue server-side.
16. Record safe payload-free operational evidence where required.

Failure of any required authorization condition denies access.

## 6. Queue-item purpose

A queue item represents one synthetic administrative appointment work item.

A queue item is not:

- The complete booking record.
- The complete patient record.
- A clinical chart.
- A clinical task.
- A diagnosis.
- A risk score.
- A triage result.
- A billing work item.
- A claim result.
- A prescription record.
- A communication thread.

## 7. Approved queue-item fields

A queue item may contain only the minimum necessary fields listed below.

### 7.1 Queue-item reference

An opaque, synthetic, server-issued queue-item reference.

It must not reveal:

- Booking sequence.
- Subject identity.
- Pharmacy identity.
- Appointment purpose.
- Internal database structure.

### 7.2 Synthetic subject display label

A clearly synthetic display label may be shown.

Examples:

- `Synthetic Subject 01`
- `Synthetic Subject 02`

The label must not be:

- A real name.
- An email address.
- A telephone number.
- A health-card number.
- A production patient identifier.

### 7.3 Appointment time

The item may show:

- Appointment start time.
- Appointment end time where needed.
- Explicit configured display timezone.

The stored authoritative instant must use UTC.

### 7.4 Service category

The item may show a safe administrative service-category label.

The category must not:

- Reveal a diagnosis.
- Reveal symptoms.
- Imply clinical eligibility.
- Imply treatment.
- Imply billing approval.

### 7.5 Modality

Allowlisted values:

- `in_person`
- `telephone`
- `video`

The modality does not prove clinical suitability.

### 7.6 Administrative booking status

Allowlisted administrative statuses may include:

- `pending_confirmation`
- `confirmed`
- `cancelled`
- `rescheduled`
- `expired`

Only statuses relevant to the queue should be included.

### 7.7 Structured language-preparation indicator

Where necessary for administrative preparation, the queue may display a
bounded structured indicator such as:

- `none_recorded`
- `english`
- `french`
- `interpreter_preparation_requested`
- `unknown`

The queue must not display unrestricted language notes.

### 7.8 Structured accessibility-preparation indicator

Where necessary for administrative preparation, the queue may display:

- `none_recorded`
- `preparation_requested`
- `contact_required`
- `unknown`

The queue must not reveal:

- Diagnosis.
- Disability details.
- Medical explanation.
- Unrestricted accommodation notes.

### 7.9 Source

The item may display a safe administrative source such as:

- `patient_booking`
- `authorized_delegate_booking`
- `staff_created_synthetic`
- `waitlist_offer_acceptance`
- `rescheduled_booking`

The source must not reveal caregiver identity or grant details.

### 7.10 Creation time

The item may show the administrative creation time and explicit timezone where
required.

### 7.11 Safe operational reason

The item may display one allowlisted reason describing why it appears.

Proposed reasons:

- `upcoming_confirmed_booking`
- `pending_administrative_confirmation`
- `language_preparation_requested`
- `accessibility_preparation_requested`
- `recently_rescheduled`
- `waitlist_offer_accepted`
- `administrative_review_required`
- `unknown_safe_state`

A reason code must not describe clinical urgency or patient health.

### 7.12 Action availability

The item may indicate whether an approved administrative action is currently:

- `permitted`
- `not_permitted`
- `blocked`
- `unknown`

This value must be computed server-side.

It is not authorization by itself.

## 8. Prohibited queue fields

The queue must not display or send to the client:

- Symptoms.
- Diagnoses.
- Medications.
- Allergies.
- Pregnancy information.
- Clinical notes.
- Reason-for-visit narratives.
- Assessment responses.
- Clinical risk.
- Triage status.
- Clinical urgency.
- Health-card information.
- Date of birth.
- Full patient record.
- Full booking record.
- Full caregiver record.
- Full delegation grant.
- Caregiver relationship details without a specific approved need.
- Unnecessary contact details.
- Email addresses.
- Telephone numbers.
- Mailing addresses.
- Management tokens.
- Raw database identifiers.
- Raw idempotency keys.
- Billing codes.
- Claim information.
- PINs.
- Fees.
- Payment information.
- Prescription information.
- Internal staffing schedules.
- Other patients’ appointment activity.
- Exact remaining slot capacity.
- Exact waitlist position.
- Unrestricted free text.

## 9. Queue projection contract

The server should compose a purpose-built queue projection.

Conceptual projection:

```text
queueItemRef
syntheticSubjectLabel
appointmentStart
appointmentEnd
displayTimezone
serviceCategoryLabel
modality
administrativeStatus
languagePreparation
accessibilityPreparation
sourceCode
createdAt
operationalReasonCode
actionAvailability
```

The projection must not be created by returning a complete booking object and
hiding fields in the browser.

Data minimization must happen before the server-to-client boundary.

## 10. Server-rendering contract

The protected queue route must:

- Authenticate and authorize on the server.
- Derive pharmacy and tenant scope on the server.
- Query the authorized scope on the server.
- Create the minimized projection on the server.
- Render sensitive queue content on the server.
- Avoid exposing the complete source records through hydration.

A client component may be used only for bounded non-sensitive interaction
where required.

## 11. Client-component contract

Approved client values may include:

- Allowlisted filter code.
- Allowlisted sort code.
- Page cursor or opaque pagination token.
- Display-density setting.
- Expanded or collapsed UI state.
- Focus state.
- Safe loading state.
- Safe action code.
- Opaque queue-item reference where required.

Client components must not receive:

- Complete queue records.
- Complete bookings.
- Complete subjects.
- Complete actors.
- Complete delegates.
- Complete caregiver grants.
- Complete contacts.
- Server authorization objects.
- Internal tenant configuration.
- Internal pharmacy configuration.

## 12. Hydration boundary

The final rendered page and hydration data must be inspected for:

- Complete booking serialization.
- Complete subject serialization.
- Contact details.
- Grant data.
- Management tokens.
- Internal identifiers.
- Hidden fields containing prohibited values.
- Framework route-state leakage.
- Error payload leakage.

An architecture test must fail when prohibited objects or markers enter the
client bundle or hydration payload.

## 13. Queue query contract

The queue query must use a strict Zod object.

Potential allowlisted fields:

- `status`
- `modality`
- `serviceCategory`
- `operationalReason`
- `dateFrom`
- `dateTo`
- `sort`
- `cursor`
- `pageSize`

The request must reject:

- Unknown fields.
- Client-supplied pharmacy ID.
- Client-supplied tenant ID.
- Client-supplied actor ID.
- Client-supplied staff role.
- Client-supplied patient ID.
- Client-supplied subject ID.
- Free-text search.
- Clinical filters.
- Exact contact searches.
- Oversized date ranges.
- Oversized page sizes.
- Invalid timezone values.
- Invalid sort codes.

## 14. Filter contract

Proposed safe filters:

- Administrative status.
- Modality.
- Service category.
- Safe operational reason.
- Bounded appointment-date range.

Filters must not:

- Change pharmacy or tenant scope.
- Search clinical information.
- Search names.
- Search contact information.
- Search health-card information.
- Search caregiver identity.
- Reveal whether an unrelated resource exists.

Unknown filter values fail closed.

## 15. Ordering contract

Queue ordering must be deterministic and server-owned.

Proposed synthetic order:

1. Appointment start time.
2. Safe operational-reason order where explicitly approved.
3. Opaque queue-item reference as a stable tie-breaker.

Ordering must not use:

- Symptoms.
- Diagnosis.
- Medications.
- Health status.
- Predicted urgency.
- AI scoring.
- Language-model output.
- Sentiment.
- Demographics.
- Free-text interpretation.
- Ability to pay.
- Claim status.

The order must not be described as clinical priority.

## 16. Pagination contract

The queue must use bounded pagination.

Requirements:

- Maximum page size.
- Opaque cursor where applicable.
- Stable deterministic ordering.
- Server-derived scope on every page.
- Cursor expiry where appropriate.
- No sequential patient or booking identifiers.
- No total count where it would expose sensitive operational information.
- Safe handling of deleted or changed items between pages.

A cursor must not grant authority.

## 17. Administrative actions

The initial queue may be read-only.

Any queue mutation requires a separately defined command and authorization
test.

Potential future administrative actions may include:

- Open an authorized booking-management view.
- Acknowledge preparation review.
- Begin an approved rescheduling workflow.
- Begin an approved cancellation workflow.

A queue button must never directly:

- Complete an assessment.
- Confirm clinical suitability.
- Prescribe.
- Bill.
- Submit a claim.
- Contact the patient.
- Alter caregiver authority.

## 18. Visible action versus authority

The interface may render an action as available only when the server indicates
that it may currently be offered.

The action must still be reauthorized when submitted.

The server must revalidate:

- Actor.
- Staff role.
- Pharmacy.
- Tenant.
- Resource.
- Current state.
- Requested action.
- Feature gate.
- Kill switch.
- Idempotency.
- Database constraints where applicable.

A stale visible button cannot force an invalid transition.

## 19. Queue states

The interface must provide usable states for:

- Loading.
- Default populated queue.
- Empty queue.
- Filtered empty queue.
- Refreshing.
- Stale data.
- Partial source failure.
- Total source failure.
- Temporarily unavailable.
- Authorization denied.
- Session expired.
- Feature blocked.
- Kill switch active.
- Unknown state.

A partial or total failure must not appear as an empty successful queue.

## 20. Empty state

A successful empty state must clearly state that no matching synthetic
administrative booking items were found.

It must not imply:

- No patients need care.
- No clinical work exists.
- All appointments are safe.
- All work is complete.
- No booking exists outside the current authorized scope.

## 21. Partial-failure state

When one approved source fails:

- Display the successfully loaded portion only when safe.
- Clearly qualify the view as partial.
- Identify the unavailable source by safe category only.
- Do not expose raw errors.
- Do not treat missing records as nonexistent.
- Provide an accessible retry action where appropriate.

## 22. Total-failure state

When the queue cannot be loaded safely:

- Display `TEMPORARILY_UNAVAILABLE`.
- Do not render stale sensitive data unless the approved cache policy permits
  it.
- Do not fall back to production or another pharmacy.
- Do not expose SQL, stack traces, or internal services.
- Preserve payload-free operational evidence.

## 23. Stale-state handling

Where freshness cannot be guaranteed, the queue must show:

- A visible stale qualifier.
- The last safe refresh time where approved.
- A safe retry action.
- No claim that displayed action availability remains current.

All mutations must revalidate authoritative state.

## 24. Timezone contract

Authoritative appointment instants must be stored in UTC.

The queue must render:

- The configured pharmacy timezone.
- A clear timezone label.
- Unambiguous appointment times.

The design must test:

- Ontario spring daylight-saving transition.
- Ontario fall daylight-saving transition.
- Ambiguous local times.
- Nonexistent local times.
- A viewer in another timezone.
- Rescheduling across a DST boundary.

The interface must not silently reinterpret an ambiguous time.

## 25. Accessibility contract

The queue must support:

- 375px layout without horizontal scrolling.
- Desktop layout.
- Keyboard-only operation.
- Logical focus order.
- Visible focus.
- Programmatic headings and landmarks.
- Accessible filter labels.
- Accessible table or list semantics.
- Screen-reader status announcements.
- Validation messages linked to controls.
- Status meaning not dependent on colour.
- 200% zoom.
- 400% zoom and reflow.
- Reduced motion.
- Long translated labels.
- No essential hover-only content.
- Frequent actions meeting the repository’s 56px target.
- Accessible loading, empty, denied, blocked, stale, partial, and error states.

## 26. Privacy contract

Queue information must not appear in:

- Query strings.
- Fragment identifiers.
- Page titles.
- Referrers.
- Browser storage.
- Service-worker caches.
- Client-side data caches.
- Analytics.
- Error-monitoring breadcrumbs.
- Client console output.
- Public filenames.
- Screenshots beyond approved synthetic evidence.
- Hydration payloads beyond the approved minimum.

## 27. Logging and observability

Allowed safe metadata may include:

- Queue route identifier.
- Synthetic environment marker.
- Safe outcome category.
- Filter category.
- Page-size bucket.
- Response-time bucket.
- Result-count bucket where approved.
- Partial-failure category.
- Authorization outcome category.

Logs must not contain:

- Queue contents.
- Subject labels where unnecessary.
- Appointment times where unnecessary.
- Raw queue-item references.
- Raw actor identifiers.
- Contact information.
- Booking records.
- Grant records.
- Request bodies.
- Query strings containing sensitive values.
- Clinical information.

## 28. Cache contract

Protected queue content must not be cached publicly.

Any permitted server-side caching requires review of:

- Authorization binding.
- Pharmacy and tenant binding.
- Cache key.
- Expiry.
- Invalidation.
- Stale-state display.
- Sensitive-data exposure.
- Shared-cache prevention.

Browser persistence is prohibited.

Unknown cache behavior fails closed.

## 29. Cross-pharmacy and cross-tenant isolation

Required controls:

- Server-derived pharmacy scope.
- Server-derived tenant scope.
- Scope predicates in every query.
- Scope-safe relationships in the database where applicable.
- No client-provided scope.
- No cross-scope cursor reuse.
- No cross-scope queue-item access.
- Denial tests.
- Database constraint tests where applicable.

A filter must never broaden scope.

## 30. Safe errors

Suggested safe errors:

- `ACCESS_DENIED`
- `SESSION_EXPIRED`
- `QUEUE_TEMPORARILY_UNAVAILABLE`
- `QUEUE_PARTIAL_RESULT`
- `QUEUE_QUERY_INVALID`
- `QUEUE_CURSOR_EXPIRED`
- `QUEUE_ITEM_NO_LONGER_AVAILABLE`
- `ACTION_NO_LONGER_PERMITTED`
- `FEATURE_DISABLED`
- `UNKNOWN_SAFE_STATE`

Errors must not reveal:

- Whether another patient exists.
- Whether another pharmacy has items.
- Exact queue counts.
- Staff identities.
- Internal services.
- Database details.
- Authorization rules.

## 31. Synthetic fixtures

Required queue fixtures include:

- Upcoming confirmed in-person booking.
- Upcoming confirmed telephone booking.
- Upcoming confirmed video booking.
- Pending administrative confirmation.
- Recently rescheduled booking.
- Waitlist-offer accepted booking.
- Language preparation requested.
- Accessibility preparation requested.
- Both structured preparation indicators absent.
- Action currently permitted.
- Action currently blocked.
- Unknown safe administrative state.
- Item in another synthetic pharmacy.
- Item in another synthetic tenant.
- Unauthorized staff actor.
- Expired staff session.
- Empty queue.
- Filtered empty queue.
- Partial failure.
- Total failure.
- Stale result.
- Long translated labels.
- Ontario DST boundary.
- Forbidden-marker fixture.

All fixtures must be deterministic and visibly synthetic.

## 32. Required authorization tests

### QUEUE-AUTH-01 — Authorized pharmacist

Prove that an authorized synthetic pharmacist may access only the derived
pharmacy and tenant scope.

### QUEUE-AUTH-02 — Unauthorized role

Prove that a patient, delegate, unknown role, or unauthorized staff actor is
denied.

### QUEUE-AUTH-03 — Client role injection

Prove that submitting a pharmacist role does not grant access.

### QUEUE-AUTH-04 — Client pharmacy injection

Prove that a client-supplied pharmacy or tenant cannot broaden scope.

### QUEUE-AUTH-05 — Cross-pharmacy item

Prove that an item in another scope is not returned or revealed.

### QUEUE-AUTH-06 — Expired session

Prove that an expired staff session is denied.

### QUEUE-AUTH-07 — Feature disabled

Prove that the server-owned feature gate denies access safely.

### QUEUE-AUTH-08 — Kill switch

Prove that the reviewed kill-switch behavior is enforced.

## 33. Required projection tests

### QUEUE-DATA-01 — Approved fields only

Prove each queue item contains only approved fields.

### QUEUE-DATA-02 — Clinical-field exclusion

Prove symptoms, diagnoses, medications, notes, and health-card information
cannot enter the projection.

### QUEUE-DATA-03 — Contact exclusion

Prove unnecessary contact information cannot enter the projection.

### QUEUE-DATA-04 — Caregiver exclusion

Prove caregiver identity and grant details remain absent.

### QUEUE-DATA-05 — Exact-capacity exclusion

Prove exact remaining capacity and waitlist position remain absent.

### QUEUE-DATA-06 — Complete-object exclusion

Prove complete booking, patient, caregiver, grant, and contact objects cannot
cross the client boundary.

## 34. Required query and filter tests

### QUEUE-FILTER-01 — Allowlisted filters

Prove approved filters work within the authorized scope.

### QUEUE-FILTER-02 — Unknown filter

Prove unknown filter values fail closed.

### QUEUE-FILTER-03 — Oversized date range

Prove oversized ranges are rejected.

### QUEUE-FILTER-04 — Oversized page size

Prove excessive page sizes are rejected.

### QUEUE-FILTER-05 — Free-text search denied

Prove free-text patient, contact, clinical, or caregiver searching is absent.

### QUEUE-FILTER-06 — Scope cannot change

Prove filters and cursors cannot select another pharmacy or tenant.

## 35. Required state tests

Cover:

- Loading.
- Populated.
- Empty.
- Filtered empty.
- Refreshing.
- Stale.
- Partial failure.
- Total failure.
- Temporarily unavailable.
- Denied.
- Session expired.
- Feature blocked.
- Unknown.

Every state must remain accessible and must not expose prohibited information.

## 36. Architecture tests

Architecture tests must fail when:

- A complete booking object enters a client component.
- A complete patient or subject object enters a client component.
- A complete caregiver or delegation object enters a client component.
- A complete contact object enters a client component.
- Production PHI-bearing queue content is fetched directly by the browser.
- A client component derives authorization.
- A client component derives pharmacy scope.
- A client component performs clinical ranking.
- Browser storage is used.
- A protected queue response is publicly cached.
- Queue data enters analytics.
- Queue data enters console logging.
- A production identity or data adapter becomes reachable from the synthetic
  sandbox.
- A raw database identifier is rendered.

## 37. Accessibility tests

Required checks include:

- Keyboard walkthrough.
- Focus order.
- Visible focus.
- Screen-reader names.
- Screen-reader status announcements.
- Filter error association.
- Table or list semantics.
- 375px layout.
- Desktop layout.
- 200% zoom.
- 400% zoom and reflow.
- Reduced motion.
- Long translated labels.
- No colour-only status.
- 56px frequent-action targets.
- Loading, empty, stale, partial, denied, and error states.

## 38. Privacy and leakage tests

Statically and dynamically scan:

- URLs.
- Query strings.
- Page titles.
- Referrers.
- HTML.
- Hydration data.
- Client bundles.
- Browser storage.
- Client caches.
- Analytics.
- Error breadcrumbs.
- Console output.
- Server logs.
- Screenshots.
- Evidence files.

Use a deterministic forbidden marker such as:

`SYNTHETIC_FORBIDDEN_MARKER_T04_QUEUE`

Any prohibited sink containing the marker fails the test.

## 39. Evidence requirements

Queue evidence should record:

- Test identifier.
- Source commit.
- Route or component under test.
- Fixture-set version.
- Synthetic environment.
- Fixed clock.
- Timezone.
- Viewport.
- Zoom level.
- Reduced-motion state.
- Expected result.
- Actual result.
- Pass, fail, or blocked status.
- Sanitized artifact reference.
- Artifact hash where applicable.
- Reviewer.
- Review state.

Evidence must not contain:

- Real information.
- Contact details.
- Health-card information.
- Production identifiers.
- Raw tokens.
- Raw request or response bodies.
- Full booking or identity records.

## 40. Production handoff requirements

Before connecting a production pharmacist queue, the future owner must define:

- Production pharmacist identity.
- Staff role vocabulary.
- Permission ownership.
- Pharmacy and tenant scope.
- Authoritative booking source.
- Data classification.
- Minimum required fields.
- Contact-access policy.
- Caregiver-display policy.
- Freshness and consistency.
- Pagination.
- Ordering.
- Caching.
- Audit.
- Retention.
- Downtime.
- Partial failure.
- Incident response.
- Accessibility evidence.
- Privacy review.
- Security review.
- Task 11 release approval.

Task 04 must not invent these production rules.

## 41. Production blockers

Production queue access remains blocked until:

- Task 05 production staff identity is approved.
- Pharmacy and tenant scope are approved.
- The production booking source is approved.
- Minimum necessary production fields are approved.
- Privacy review is complete.
- Security review is complete.
- Accessibility evidence is complete.
- Retention and cache policies are approved.
- Production authorization tests pass.
- Task 11 release approval is recorded.
- Production enablement is explicit.

## 42. Stop conditions

Stop the affected workstream when:

- The queue requires clinical information.
- The queue requires unrestricted notes.
- Clinical priority must be inferred.
- AI or language-model ranking is requested.
- Client input must determine role, pharmacy, tenant, or authorization.
- A complete booking or patient object must enter a client component.
- Caregiver details must be shown without a defined need.
- Contact details must be shown without approval.
- Protected queue data must enter browser storage, analytics, logs, or URLs.
- Failed sources must be displayed as successful emptiness.
- Production identity or data must be connected without approval.
- A mutation must be added without server authorization and state
  revalidation.
- Required architecture, authorization, privacy, or accessibility tests are
  skipped merely to obtain a pass.

Independent synthetic contract work may continue while production integration
is blocked.

## 43. Open decisions

The following remain unresolved:

- Final production staff roles.
- Final queue permissions.
- Final service-category labels.
- Final safe operational-reason vocabulary.
- Final permitted actions.
- Final queue ordering.
- Final pagination limit.
- Final server-cache policy.
- Final freshness requirement.
- Final administrative response-time wording.
- Final language-preparation workflow.
- Final accessibility-preparation workflow.
- Final production contact-access policy.
- Final retention policy.
- Final production support owner.

## 44. Current conclusion

The Task 04 pharmacist queue will use a server-rendered, minimum-necessary
synthetic projection for authorized staff.

The queue will keep pharmacy and tenant scope server-derived, exclude clinical
and unnecessary identity information, prevent complete booking or patient
objects from reaching client components, and present only safe administrative
status, preparation, source, timing, reason, and action information.

The queue has not been implemented.

Production queue access remains blocked until identity, authorization, privacy,
security, accessibility, data-source, retention, and Task 11 approvals are
complete.