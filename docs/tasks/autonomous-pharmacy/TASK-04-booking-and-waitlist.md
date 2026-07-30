# Task 04 — online booking and waitlist

**Owner profile:** full-stack developer

**Priority:** P1

**Status:** synthetic prototype ready; PHI-bearing implementation gated

## Goal

Let Ontarians request, reschedule, or cancel in-person, telephone, or video
appointments without collecting clinical detail in an administrative booking
flow.

## Scope

- Build public slot discovery that exposes no patient or staff-private data.
- Design authenticated booking for production; use synthetic identity in the
  experiment.
- Capture service category, modality preference, accessibility/language needs,
  and minimal contact details. Do not collect symptom narratives or health-card
  numbers during booking.
- Add waitlist opt-in, cancellation, rescheduling, expiry, and capacity rules.
- Add clear emergency/non-monitoring language and expected response times.
- Design caregiver booking as a delegated-access flow, not an honor-system
  checkbox.
- Emit domain events for future consented reminders without sending messages in
  this task.
- Produce server-rendered pharmacist queue items with minimum necessary PHI.

## Dependencies

- Task 01 for synthetic work.
- Task 05 for production patient identity and delegated access.
- Task 07 for reminders.
- Task 11 for privacy, accessibility, abuse, and release testing.
- Mapping against current Ontario Health online-booking guidance before pilot.

## Deliverables

1. Slot/booking/waitlist domain model and state machine.
2. Synthetic public and pharmacist workflows.
3. Zod request/response boundaries and safe errors.
4. Abuse/rate-limit and race-condition design.
5. Production data-minimization and retention proposal.

## Acceptance criteria

- Two simultaneous requests cannot overbook the final slot.
- Cancellation and waitlist promotion are atomic and idempotent.
- No PHI appears in a URL, analytics event, email/SMS placeholder, or log.
- Administrative booking never represents a clinical assessment or eligibility
  determination.
- Patients can recover safely from expired links and partial failures.
- All external notification effects remain stubbed until Task 07.

## Tests

- Real-Postgres concurrency test for final-slot booking.
- Idempotency tests for create/cancel/reschedule.
- Authorization tests for patient, caregiver, staff, and expired access.
- 375px, keyboard, screen-reader, timezone, daylight-saving, and localization
  cases.
