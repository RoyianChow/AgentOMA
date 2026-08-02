# Task 02 static SQL review — migration 0018

**Review class:** read-only static review  
**Reviewed source commit:** `76098acad4afee5e80aa0dc71074d7ec97e14cf3`  
**Migration:** `src/lib/db/migrations/0018_clever_mister_fear.sql`  
**Migration SHA-256:** `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c`  
**Ordered chain digest:** `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb`  
**G1-D:** NOT GRANTED  
**G1-L:** NOT GRANTED

This review does not claim migration replay, live parity, privilege behavior,
concurrency, trigger execution, lock duration, or rollback behavior. Those need
real PostgreSQL under the applicable gate.

## DDL/DML inventory

| Change | Object | Static effect |
|---|---|---|
| CREATE TABLE | `assessment_billability_evidence` | Adds immutable one-to-one P0-C completion evidence; no existing-row backfill |
| CREATE UNIQUE INDEX | `assessment_id_pharmacy_id_unique` on `assessment(id, pharmacy_id)` | Supplies the referenced composite tenant key; `assessment.id` is already a PK, so duplicate pairs should be impossible |
| ALTER TABLE / FK | viewer and verifying pharmacist → `user(id)` | `NO ACTION` on delete/update |
| ALTER TABLE / composite FK | evidence `(assessment_id, pharmacy_id)` → assessment `(id, pharmacy_id)` | `ON DELETE CASCADE`; prevents cross-pharmacy pairing |
| ALTER TABLE / FK | evidence `pharmacy_id` → `pharmacy(id)` | `NO ACTION` |
| CREATE UNIQUE INDEX | evidence `assessment_id` | Enforces at most one evidence row per assessment |
| CREATE FUNCTION | `assessment_billability_evidence_immutable()` | Trigger function; permits DELETE only with transaction-local `agentoma.authorized_destruction=on`, rejects other UPDATE/DELETE with `0A000` |
| CREATE TRIGGER | `assessment_billability_evidence_no_mutate` | BEFORE UPDATE OR DELETE, row level |
| REVOKE | evidence UPDATE, DELETE from `agentoma_app` | Retains default SELECT/INSERT while removing mutation privileges |

There is no INSERT/UPDATE/DELETE data migration, backfill, table/column drop,
rename, re-ownership, extension creation, policy creation, or role creation.
Expected evidence-row count immediately after applying 0018 is therefore zero.

## Constraints

The table has one primary key, four foreign keys, two unique indexes, and 16
checks. The checks constrain evidence version, self-report status/count/text,
non-negative platform count, the exact exclusive 365-day window, approved
viewer sources and attestation, maximum state, self/family state,
prescription/consultation states, identifier types/formats, issuer/name text,
document inspection, and gender when required for non-ODB evidence.

The tenant-safe composite FK is correctly sequenced after creation of the
referenced assessment composite unique index. A client cannot pair an
assessment ID from one pharmacy with another pharmacy ID. The independent
pharmacy FK prevents an orphan pharmacy value.

## Transaction and migration-runner behavior

`npm run db:migrate` runs `drizzle-kit migrate` with the direct connection from
`drizzle.config.ts`. Drizzle ORM 0.45.2's PostgreSQL dialect creates the
`drizzle` schema/migration table if absent, reads the latest migration, then
executes every pending statement and migration-history insert inside one
database transaction (`node_modules/drizzle-orm/pg-core/dialect.js:44–71`).

Therefore, 0018's DDL and its migration-history row are expected to commit or
roll back together when it is the pending migration. Static source inspection
cannot prove the installed driver/database behaves as expected under failure;
G1-D must test a confirmed rollback and restart.

The SQL is intentionally non-idempotent. The migration runner, not raw SQL
reruns, provides already-applied behavior. Never execute 0018 manually or a
second time to test idempotency.

## Lock and operational-risk assessment

| Operation | Likely concern | Required runtime/preflight evidence |
|---|---|---|
| New table/indexes | New empty-table work should be brief | Confirm server version and execution duration in Docker |
| Unique index on `assessment(id, pharmacy_id)` | Non-concurrent index build scans existing assessment rows and takes locks that can delay writes | Record safe aggregate assessment count, representative Docker timing, change window, and application write plan |
| Four validated FKs | Catalog/validation locks; new evidence table is empty | Confirm no unexpected blocking in predecessor-upgrade test |
| Function/trigger/revoke | Catalog locks expected to be brief | Confirm object/privilege state after restart |

No production lock-duration estimate is asserted because live volume and
database load were not authorized for inspection. G1-L requires an approved
window after Docker evidence and safe aggregate preflight.

## Trigger, function, cascade, and privilege analysis

The immutability function is PL/pgSQL, not `SECURITY DEFINER`, has no declared
volatility, no fixed `search_path`, and performs no object lookup or dynamic
SQL. It only inspects `TG_OP` and a transaction-local custom setting. Runtime
tests must still prove:

- direct app-role UPDATE/DELETE/TRUNCATE are denied;
- the app role cannot disable the trigger, alter the function, set role, or
  invoke an unintended bypass;
- owner-role behavior is distinct and the production runtime is not owner;
- an ordinary parent delete cannot bypass the trigger;
- the reviewed `governance_execute_destruction` path can set the transaction
  marker and cascade exactly once when all governance checks pass; and
- rollback clears the transaction-local marker.

Migration 0011 grants future-table SELECT/INSERT/UPDATE/DELETE to
`agentoma_app`, so 0018's explicit revoke is necessary and correctly placed
after table creation. TRUNCATE was never granted by the default privilege
statement. Static SQL does not prove the role/grants actually exist on Docker
or live.

0018 adds no RLS policy and does not enable or force RLS. Current isolation is
the server-side pharmacy boundary plus composite database keys. That is a
known architecture fact, not an RLS claim.

## Expected pre/post deltas

| Aggregate/catalog item | Expected delta |
|---|---:|
| Tables | +1 |
| Evidence rows | 0 immediately after migration |
| Assessment rows | 0 |
| Patient rows | 0 |
| Claim-draft rows | 0 |
| Audit rows | 0 |
| Unique indexes | +2 (one assessment composite, one evidence assessment) |
| Trigger functions | +1 |
| Triggers | +1 |
| RLS policies | 0 |
| Extensions | 0 |

No deletion, reassignment, clinical-data transformation, claim change, or
reference-data change is expected.

## Static conclusion by invariant

| Invariant | Conclusion | Reason |
|---|---|---|
| Exact bytes, ordering and registry | PASS_STATIC | File, journal order and SHA-256 are consistent |
| Additive/non-destructive change | PASS_STATIC | No DML/drop/rename/backfill/re-owner found |
| Tenant-safe evidence FK | PASS_STATIC | Composite FK targets assessment ID plus pharmacy ID |
| One evidence row per assessment | PASS_STATIC | Unique assessment index exists |
| Domain validation | PASS_STATIC | Required checks exist in SQL |
| App-role UPDATE/DELETE revoke | PASS_STATIC | Explicit revoke follows default future-table grant |
| Trigger immutability | RUNTIME_PROOF_REQUIRED | Trigger/function bytes exist; execution and role behavior untested |
| Controlled cascade | RUNTIME_PROOF_REQUIRED | Relies on earlier governance function and transaction marker |
| Full-chain replay/history | RUNTIME_PROOF_REQUIRED | G1-D absent and Docker daemon unavailable |
| Predecessor upgrade/preserved rows | RUNTIME_PROOF_REQUIRED | Requires synthetic existing rows under G1-D |
| Failure rollback/restart | RUNTIME_PROOF_REQUIRED | Static runner source is not execution evidence |
| Live parity/grants/role | BLOCKED | G1-L, project identity and safe preflight package absent |

## Open questions and stop conditions

- **S01/S02:** G1-D and G1-L are not granted for these exact bytes and a frozen
  candidate commit.
- **S09/S17:** no current live migration-history, backup/restore, recovery
  owner, or change-window evidence was authorized.
- **S24:** final evidence cannot be commit-bound until a clean candidate commit
  is frozen.
- Docker Desktop was not running during this review.

No migration was edited or executed, no database was started, and no live data
or credentials were accessed.
