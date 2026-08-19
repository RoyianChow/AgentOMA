# Task 02 scoped lead-remediation authorization

**Decision date:** 2026-08-02

**Approver:** Royian Chowdhury

**Role:** Lead approver

**Decision:** GRANTED FOR THE TWO ITEMS BELOW ONLY

Royian Chowdhury authorized all repository changes necessary to remediate:

1. Assessment/evidence/claim persistence not being transactionally atomic with
   its required assessment-created audit event.
2. A pharmacy-admin orientation override being able to permit billable
   completion while the orientation decision was unresolved.

## Authorized implementation outcome

- The required assessment-created audit insert must execute inside the same
  PostgreSQL transaction as assessment, billability evidence, claim draft,
  follow-up plan, and intake consumption. Audit failure must roll all of those
  writes back.
- Orientation completion is an unconditional server-side billability gate. No
  role, including `pharmacy_admin`, may override it. The override request field,
  UI, server branch, and override audit event are retired.
- G3 is therefore decided as **HARD GATE; NO ADMIN OVERRIDE** for this release
  scope.

## Explicitly not authorized

This decision does not authorize changing existing migrations, triage or
red-flag content, reference PIN/fee/maximum data, `deriveClaimDraft`, LTC
billing, authentication architecture, live data, or any other Task 02 finding.
It does not grant G1-D, G1-L, or G4 and does not authorize Docker database
execution, live migration, production deployment, claims, or external calls.

Database-backed proof remains subject to a separate G1-D approval bound to the
resulting clean commit and disposable environment.
