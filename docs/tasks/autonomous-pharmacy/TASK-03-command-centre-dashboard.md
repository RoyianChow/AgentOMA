# Task 03 — pharmacist command-centre dashboard

**Owner profile:** frontend/product developer

**Priority:** P1 prototype

**Status:** synthetic UI may start; production integration waits for Task 02

## Goal

Turn the pharmacist landing page into a calm, explainable command centre for
today's work without exposing unnecessary PHI or automating clinical judgment.

## User outcome

A pharmacist can see what needs attention, why it is in the queue, what is
overdue or blocked, and which action is permitted for their role.

## Scope

- Design a responsive “Today” workspace covering intake, booked visits,
  follow-ups, prescription requests, integration failures, and manual-review
  exceptions.
- Add separate Patient Care, Automation Review, Fulfilment, and Governance
  navigation destinations as unavailable/prototype states until their tasks
  land.
- Show source, timestamp, status, and reason for every ranked item.
- Make “needs pharmacist review” and “blocked” explicit states.
- Add workload filters that never change pharmacy scope.
- Preserve server rendering for PHI lists and send client components only the
  minimum interaction/display values they need.
- Provide role-appropriate empty, loading, stale, and failure states.
- Prototype first with static synthetic fixtures inside the sandbox.

## Out of scope

- New triage urgency, diagnosis, billing eligibility, or claim logic.
- Client-side patient records, cross-pharmacy views, or autonomous queue action.
- Real appointments, messages, fulfilment, or external integrations.

## Dependencies

- Task 01 for the prototype environment.
- Task 02 before production data is connected.
- Task 11 for accessibility and release evidence.

## Deliverables

1. Information architecture and annotated 375px/desktop wireframes.
2. Synthetic command-centre implementation.
3. Server data-contract proposal for each queue.
4. Role/action matrix and failure-state catalogue.
5. Accessibility and one-handed-use evidence.

## Acceptance criteria

- A pharmacist can identify the next safe action without opening every record.
- Queue reasons are explainable and no status implies guaranteed payment or a
  clinical conclusion.
- No whole patient object reaches a client component.
- All tap targets meet the product's 56px intake/counter standard where the
  workflow is expected to be used one-handed.
- Keyboard, screen-reader, zoom, reduced-motion, and 375px layouts are usable.
- Production action buttons remain absent or disabled until their server action
  and authorization tests exist.

## Tests

- Component/route tests for each state and role.
- Architecture test for forbidden PHI-rich client props.
- Server authorization tests for every connected action.
- Visual/manual evidence at 375px and desktop.
