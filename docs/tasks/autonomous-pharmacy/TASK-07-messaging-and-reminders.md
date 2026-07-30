# Task 07 — consented messaging and reminders

**Owner profile:** backend/communications developer

**Priority:** P1/P2

**Status:** synthetic outbox may start; real delivery requires approval

## Goal

Provide reliable administrative reminders and secure patient-pharmacist
messaging without leaking PHI into SMS, email, push notifications, logs, or
vendor metadata.

## Scope

- Model per-channel consent, contact verification, purpose, expiry, revocation,
  quiet hours, language, and accessibility preference.
- Build an idempotent outbox with scheduled, sent, delivered, failed, cancelled,
  and reconciled states.
- Keep email/SMS/push content generic and direct the patient into the
  authenticated portal for sensitive details.
- Add appointment and follow-up reminder templates with human-approved wording.
- Add secure portal threads with participant authorization, retention,
  attachment policy, and response-time expectations.
- Route replies into administrative or pharmacist-review queues; do not let AI
  make clinical urgency decisions.
- Add opt-out, wrong-number, bounce, delivery failure, and vendor outage flows.
- Audit consent, send attempts, delivery status, thread access, and staff action.

## Out of scope

- Marketing communication.
- Clinical advice in unsecured channels.
- Automatic emergency triage or unattended clinical inbox promises.
- Patient notifications from the existing follow-up feature until this task's
  consent and delivery controls are complete.

## Dependencies

- Tasks 04, 05, and 11.
- Approved communication policy, vendor contract, residency/data-flow review,
  and message-template review.

## Deliverables

1. Consent and communication domain model.
2. Synthetic outbox/provider adapter and secure-thread prototype.
3. Minimal-payload template catalogue.
4. Retry, expiry, opt-out, outage, and reconciliation runbook.
5. Audit and retention mapping.

## Acceptance criteria

- Revoked or expired consent prevents future sends.
- Retries cannot create duplicate messages.
- Unsecured notifications contain no ailment, medication, appointment purpose,
  health number, or other PHI.
- Wrong-recipient and vendor-failure events create safe staff work items.
- Secure threads are server-authorized on every read/write.
- No delivery status is treated as proof the intended person read the message.

## Tests

- Idempotency, retry, ordering, cancellation, and race tests.
- Consent expiry/revocation and contact-change tests.
- Template scans for forbidden PHI.
- Vendor timeout/malformed webhook/signature/replay tests.
