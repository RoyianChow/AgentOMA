# Task 05 — patient identity and portal

**Owner profile:** identity/full-stack developer

**Priority:** P1 foundation

**Status:** design and synthetic prototype only until privacy approval

## Goal

Provide secure patient access to finalized records, appointments, follow-up
plans, consent history, and access/correction workflows without weakening the
separate pharmacist identity boundary.

## Scope

- Design a patient authentication/session audience separate from pharmacist
  users, roles, invitations, and TOTP administration.
- Define strong identity proofing, account recovery, session revocation, device
  history, and suspicious-access response.
- Implement delegated caregiver/SDM access with scope, expiry, revocation, and
  visible provenance.
- Show finalized records read-only, including corrections/supersession and
  downloadable export where authorized.
- Add patient-submitted access/correction requests; never mutate source records.
- Expose consent history and communication preferences.
- Audit access, export, delegation, recovery, and correction activity.

## Out of scope

- Using a health-card number as a password or public account lookup key.
- Public self-signup without identity proofing.
- Allowing patients to edit the pharmacist's clinical or billing record.
- Reusing pharmacist session cookies or roles for patients.

## Dependencies

- Task 02 complete-patient retrieval.
- Approved privacy/data-flow design and PIA/TRA.
- Task 11 security and release gates.
- Ontario Health patient-portal standards review.

## Deliverables

1. Identity threat model and account lifecycle.
2. Patient/caregiver authorization matrix.
3. Synthetic portal prototype with read-only records.
4. Server-side access/export design and audit-event catalogue.
5. Recovery, delegation, and breach-response tests.

## Acceptance criteria

- Patient and pharmacist sessions are cryptographically and logically separated.
- Every read/export re-verifies patient identity, grant scope, and record
  relationship server-side.
- Delegated access is explicit, time-bounded, revocable, and audited.
- Revocation takes effect server-side immediately.
- No complete record is serialized into an unnecessary client component or
  browser store.
- Corrections create requests/overlays; immutable source records remain intact.

## Stop conditions

Stop before schema or production auth changes until the identity-proofing,
recovery, delegated-access, retention, and privacy model is approved.
