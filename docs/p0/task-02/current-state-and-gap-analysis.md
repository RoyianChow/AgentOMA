# Task 02 current-state and gap analysis

**Recorded:** 2026-08-02

**Initial baseline:** `76098acad4afee5e80aa0dc71074d7ec97e14cf3`

**Current candidate:** `813e360546f6dc1b4c03ead5de7d22002f063759`

**Branch:** `feat/moh-compliance-migration`

**Assessment:** the two proven protected defects are remediated in code under
scoped lead approval. Task 02 is now **BLOCKED**, not FAIL and not PASS, because
real-PostgreSQL, live, recovery, export-integrity, and Task 11 proofs remain
unavailable.

## Locked repository and migration identity

| Fact | Value |
|---|---|
| Runtime | Node v24.18.0; npm 11.16.0; Windows PowerShell |
| Framework | Next.js 16.2.10 (`src/proxy.ts` is UX only) |
| Database | Supabase PostgreSQL in Canada; Drizzle ORM + postgres.js |
| Migration workflow | `db:generate` → SQL review → `db:migrate`; `db:push` banned |
| Migration head | `0018_clever_mister_fear` |
| Predecessor | `0017_tense_pandemic` |
| Migration SHA-256 | `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c` |
| Ordered chain digest | `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb` |

No existing migration, triage rule, reference PIN/fee/maximum, claim derivation,
LTC behavior, auth architecture, or live database state changed.

## Completion and evidence flow

| Step | Current behavior | Verification state |
|---|---|---|
| Request authorization | Server action rechecks session, TOTP, role, configured pharmacy, patient tenancy, and prescriber identity. | Existing tests; candidate DB run NOT RUN. |
| Orientation | Resolved prescriber must have recorded module completion. No role or input can override it. | Static + pure PASS; DB cases added but NOT RUN. |
| Red-flag exit | Separate terminal path; completion is never called and no evidence/claim rows should exist. | Candidate DB proof NOT RUN. |
| Assessment/evidence/claim/follow-up | Persisted through one `db.transaction()` using seeded reference lookup and unchanged `deriveClaimDraft()`. | Static path reviewed; DB proof NOT RUN. |
| Required assessment audit | `writeAuditWith(tx)` now inserts the assessment-created event before transaction commit. Failure propagates and rolls back every completion write. | Static + pure structure PASS; deterministic PostgreSQL fault test added, NOT RUN. |
| PDF/export | Reads persisted evidence and active claim; no clinical/billing recomputation. | Pure projection PASS; integrated DB proof NOT RUN. |
| Manifest/reconstruction | Existing hashes include changing generation/history state; no approved reconstruction verifier exists. | BLOCKED(S27). |

## Scoped remediation details

### T02-13 — completion/audit atomicity

At baseline, the completion transaction returned before `writeAudit()` and the
post-commit audit failure was swallowed. Commit `813e3605…` moved the required
`assessment.created.claim_drafted` / `assessment.created.no_claim` insert into
the same transaction as:

- assessment;
- `assessment_billability_evidence`;
- claim draft when billable;
- follow-up plan and its audit when billable; and
- intake consumption.

The database test installs a synthetic test-only trigger that rejects the
required assessment audit insert, then asserts all of those rows remain zero
and the intake remains unconsumed. The hook exists only in a `.db.test.ts` file.
G1-D and Docker are still required to execute this proof, so T02-13 is
**BLOCKED (RUNTIME_PROOF_REQUIRED)** rather than PASS.

### T02-18 — orientation hard gate

Royian Chowdhury decided G3 as **HARD GATE; NO ADMIN OVERRIDE**. Commit
`813e3605…` removed the request field, admin role branch, client override UI,
and override event. The strict request schema rejects the retired field. Pure
tests pass, so T02-18 is PASS for the current code boundary.

## Remaining gap register

| ID | Status | Gap and safe next action |
|---|---|---|
| GAP-01 | BLOCKED (G1-D/S11) | Execute the new audit-failure rollback test and the complete migration/database suite on exact candidate `813e3605…`. |
| GAP-02 | RESOLVED IN CODE | G3 decided; orientation override removed. Preserve the hard gate. |
| GAP-03 | BLOCKED (G1-D) | Full-chain and 0017→0018 replay, role, trigger, tenant, concurrency, clinical, red-flag, referral, and export tests not run. |
| GAP-04 | BLOCKED (S27) | Obtain an approved canonical export-hash/reconstruction contract; do not invent one. |
| GAP-05 | BLOCKED (G1-L/S17) | Recovery proof, exact live target, preflight, one-time apply, catalog/grant, and aggregate parity are absent. |
| GAP-06 | BLOCKED (S25) | Task 11 has not reviewed this exact candidate and evidence manifest. |
| GAP-07 | BLOCKED | Docker CLI exists but Docker Desktop is not running. |

## Conclusion

No mandatory invariant is currently proven false in the candidate. The correct
overall status is **BLOCKED** because the transaction claim has not yet been
proven on real PostgreSQL and the remaining release gates are incomplete. No
database or production action is authorized by this document.
