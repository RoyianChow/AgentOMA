# Task 08 — online fulfilment, pickup, and delivery

**Owner profile:** pharmacy-operations developer

**Priority:** P2

**Status:** research and synthetic workflow only

## Goal

Coordinate prescription requests, inventory confirmation, preparation,
pharmacist verification, pickup, and delivery while keeping dispensing release
and professional judgment with accredited pharmacy personnel.

## Scope

- Accept a prescription/refill/renewal/transfer **request** and create a review
  task; never assert that an upload is a valid prescription.
- Model request, verification, clarification, inventory, preparation,
  pharmacist-check, ready, handed-off, failed, returned, and cancelled states.
- Add patient choice of pickup/delivery and dispensing pharmacy.
- Integrate inventory as an estimate until the pharmacy system confirms product,
  quantity, expiry, storage, and substitution facts.
- Design price/coverage estimates that remain estimates until adjudication.
- Model delivery address verification, authorized recipient, chain of custody,
  temperature/security exceptions, proof of handoff, failure, and return.
- Add role separation and audit at every transition.

## Out of scope

- Automated prescription validation, substitution, therapeutic decision,
  dispensing verification, release, or claim submission.
- Controlled/scheduled drugs, central fill, remote dispensing, or
  cross-jurisdictional service in v1.
- Real inventory, payment, courier, or dispensing integration before separate
  policy/vendor approval.

## Dependencies

- Tasks 03, 05, 07, 09, and 11.
- OCP internet-site/accreditation, delivery, scheduled-drug, central-fill,
  remote-dispensing, and patient-choice review as applicable.
- Pharmacy system, payment, and courier specifications/contracts.

## Deliverables

1. State machine and professional-responsibility matrix.
2. Synthetic pharmacist/patient workflow.
3. Integration contracts with idempotency and reconciliation.
4. Chain-of-custody and exception model.
5. Privacy, security, accessibility, and operational runbooks.

## Acceptance criteria

- Only an authorized pharmacy professional can approve clinical/dispensing
  transitions.
- Every external transition is acknowledged, idempotent, audited, and
  reconcilable.
- Delivery failure cannot mark medication received or silently discard stock.
- Patient choice is recorded and no UI implies mandatory use of AgentOMA's
  pharmacy.
- No PHI is exposed in tracking URLs, notifications, courier labels beyond
  approved necessity, analytics, or logs.
- The prototype cannot create a real order, payment, shipment, or claim.

## Stop conditions

Stop on unclear professional responsibility, scheduled-drug scope, storage or
chain-of-custody requirement, patient-choice conflict, or missing vendor system
specification.
