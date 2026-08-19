# Task 02 orientation decision note

**Status:** DECIDED — HARD GATE; NO ADMIN OVERRIDE

**Decision date:** 2026-08-02

**Approver:** Royian Chowdhury, lead approver

**Implementation commit:** `813e360546f6dc1b4c03ead5de7d22002f063759`

## Decision

The prescribing pharmacist—or the supervising pharmacist for an
intern/student—must have a recorded completion of the OCP Mandatory
Orientation for Minor Ailments Module before a billable assessment can be
completed or claim derivation reached.

No role, including `pharmacy_admin`, may override this requirement. A claim of
recent completion, a pending upload, or a free-text explanation does not replace
the recorded profile fact. A pharmacy admin must record completion on the
prescriber's profile before the assessment can proceed.

The exact scoped authorization is recorded in
`lead-remediation-authorization-2026-08-02.md`.

## Implemented boundary

- `createAssessment()` checks the resolved prescriber before its transaction,
  row insertion, or `deriveClaimDraft()` call.
- The request schema is strict and no longer accepts
  `orientationOverrideReason`.
- The pharmacist workspace and page no longer expose an override prop, state,
  reason field, or resubmission button.
- The retired `assessment.orientation_override` completion event is no longer
  emitted because the bypass no longer exists.
- Pure regressions prove the client/server override symbols are absent and the
  strict boundary rejects the retired input.
- Real-PostgreSQL tests for pharmacist, admin, and supervising-pharmacist
  behavior passed on exact candidate `dcaab91…` under G1-D.

## Release disposition

G3 is **DECIDED** and T02-18 is PASS at static, pure, and real-PostgreSQL
boundaries. Full Task 02 remains blocked on predecessor/restart-persistence,
S27, Task 11, recovery, live verification, and G4. This decision grants no live
or production-deployment authority.
