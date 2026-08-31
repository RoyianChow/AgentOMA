# ADR-001 — Data platform

**Status:** Proposed (not decided — this review has no authority to approve it; see "Approval"
below)
**Date:** 2026-08-27
**Deciders:** Product Lead, Security/Privacy lead (named, not yet recorded as having reviewed
this)

## Context

AgentOMA handles PHI under Ontario's PHIPA for a single-pharmacy pilot. The current data
platform is Supabase PostgreSQL in `ca-central-1`, accessed via Drizzle ORM over a pooled
connection at runtime and a direct connection for migrations, with better-auth's session/account/
TOTP schema in the same database as clinical data. Full current-state detail is in
[`../SYSTEM-DESIGN-REVIEW.md`](../SYSTEM-DESIGN-REVIEW.md) §4.

A system architecture review was commissioned to determine whether this remains the best fit,
comparing it against Google Cloud SQL for PostgreSQL, Azure Database for PostgreSQL Flexible
Server, and AWS RDS for PostgreSQL (`ca-central-1`), plus an explicit evaluation of NoSQL
alternatives. Full comparison, scoring, and sourcing:
[`../DATABASE-AND-HOSTING-COMPARISON.md`](../DATABASE-AND-HOSTING-COMPARISON.md) Part A.

## Decision drivers

- Canadian data residency (PHIPA requirement).
- Database-enforced immutability, foreign keys, deferrable constraints, and race-free same-day
  exclusion — all currently implemented as Postgres triggers/constraints/revoked privileges.
- Ten-year clinical-record retention.
- Compatibility with Drizzle ORM and better-auth without architectural rework.
- Migration effort and risk versus any proven benefit, at current single-pharmacy pilot scale.

## Options considered

1. **Supabase PostgreSQL (current)** — retain.
2. Google Cloud SQL for PostgreSQL.
3. Azure Database for PostgreSQL Flexible Server.
4. AWS RDS for PostgreSQL (`ca-central-1`).
5. A NoSQL document database (Firestore/DynamoDB) — evaluated per the task's explicit
   instruction, not dismissed for convenience.

All four relational options are standard PostgreSQL and equally capable of meeting the
transactional/immutability requirements above (verified — none restrict `CREATE TRIGGER` or
`REVOKE` on application-owned tables). The differentiators found were: Azure's native 10-year
Long-Term Retention (a direct match for the retention requirement, unique among the four),
customer-managed-key (CMK) availability (GCP and Azure offer it natively; Supabase does not
outside enterprise sales; AWS offers KMS-based CMK), and operational burden (Supabase lowest,
since its pooling/migration path is already solved and working in production).

The NoSQL options were found technically capable of the raw write-atomicity requirement, but at
the cost of losing database-enforced immutability, foreign keys, deferrable constraints, and
race-free exclusion as first-class guarantees — each would need to be reimplemented in
application code with materially weaker enforcement (see comparison doc for the specific
technical limits of Firestore transactions and DynamoDB `TransactWriteItems`).

## Decision

**Retain Supabase PostgreSQL.** No migration is recommended at this time.

## Rationale

No proven capacity, compliance, or reliability pressure justifies migration cost/risk at current
pilot scale. Supabase meets every hard requirement (residency, immutability, constraints,
retention feasibility, Drizzle/better-auth compatibility) today, in production, with a working
migration discipline already in place. The two areas where an alternative would score higher
(native long-term retention on Azure; CMK availability on GCP/Azure/AWS) are real but not urgent
— they become materially more relevant at multi-tenant production scale, not before.

This decision explicitly does **not** mean "no action." Two concrete, low-cost items are
recommended regardless of vendor:

1. **Confirm whether Supabase PITR is currently enabled**, and enable it if not — the repository
   gives no evidence either way, PITR is separately billed on Supabase, and this is directly
   relevant to the stated ten-year retention requirement. This is an operational confirmation,
   not part of this ADR's decision scope, since it requires access to Supabase project
   billing/configuration this review does not have.
2. **Execute the backup/restore drill at least once** (`docs/RESTORE_DRILL.md`) — unrelated to
   which vendor is chosen, and the single clearest gap this whole review found.

## Consequences

- **Positive:** zero migration risk, zero new vendor relationship, zero change to the
  application's data-access code, ORM, or migration tooling.
- **Negative:** does not gain CMK/customer-managed encryption keys or native long-term retention
  today — both remain open for reconsideration (see "Revisit trigger").
- **Neutral:** better-auth's tables remain in the same database/schema as PHI (a tight-coupling
  risk noted in the system review, §11) — unaffected by this decision either way; separating them
  would be an independent architectural question regardless of vendor.

## Revisit trigger

Re-open this decision if any of the following occurs: (a) AgentOMA moves toward multi-tenant or
multi-pharmacy production scale, (b) a security/privacy review specifically requires
customer-managed encryption keys, (c) Supabase's PITR pricing or terms change materially, or (d)
a documented capacity or reliability incident occurs that a different platform's architecture
would have prevented.

## Approval

**Not yet approved.** This ADR records the evidence-based recommendation of a documentation-only
architecture review. Per the task's own authority boundary, no database provider may be changed,
and no migration may be planned or executed, without separate, explicit approval from the Product
Lead and Security/Privacy lead. This document does not constitute that approval.
