# Task 02 P0 release-readiness checklist

**As of:** 2026-08-02  
**Overall:** FAIL — protected production invariants are false; Docker/live work
is also gated and not run.

`PASS` below means the named control has sufficient evidence at its declared
scope. `NOT RUN` is never treated as green.

| Control | Status | Evidence / blocker |
|---|---|---|
| T02-01 instructions/state recorded | PASS | Current-state analysis + baseline artifact |
| T02-02 commit/migration identity locked | PASS | Baseline commit, migration SHA and ordered chain digest |
| T02-03 approvals bind action/bytes/environment | BLOCKED | G1-D, G1-L and G4 not granted |
| T02-04 environment identity fails closed | BLOCKED | Local URL/loopback pure checks pass; Docker/live identity not run |
| T02-05 disposable environment isolated | NOT RUN | G1-D absent; Docker daemon unavailable |
| T02-06 full-chain replay | NOT RUN | G1-D |
| T02-07 predecessor upgrade | NOT RUN | G1-D; independent runner/proof absent |
| T02-08 catalog/aggregate deltas | NOT RUN | G1-D/G1-L |
| T02-09 tenant/patient isolation | NOT RUN | Candidate real-Postgres matrix not run |
| T02-10 evidence immutability as app role | NOT RUN | Static SQL reviewed; runtime proof absent |
| T02-11 audit immutability as app role | NOT RUN | Prior 0017 evidence is not candidate 0018 evidence |
| T02-12 trigger/RLS/function/role bypass | NOT RUN | G1-D |
| T02-13 completion failure atomicity | **FAIL** | Required assessment-created audit is post-commit/best-effort |
| T02-14 idempotency/concurrency | NOT RUN | G1-D |
| T02-15 red-flag zero rows | NOT RUN | Existing tests not rerun on fresh 0018 PostgreSQL |
| T02-16 completed referral separation | NOT RUN | Pure coverage exists; full candidate DB proof absent |
| T02-17 reference-derived billing | NOT RUN | 110 pure tests pass; active-reference DB path not rerun |
| T02-18 orientation hard gate | **FAIL** | Undecided admin override creates a billable assessment |
| T02-19 LTC remains parked | PASS | Protected derivation unchanged; pure LTC refusal tests pass |
| T02-20 export auth/tenant pinning | BLOCKED | Static boundary + negative DB test added; integrated run absent |
| T02-21 PDF/export evidence projection | BLOCKED | Bounded implementation + pure projection pass; real DB/PDF matrix absent |
| T02-22 deterministic/tamper-evident manifest | BLOCKED(S27) | No approved repeat-export canonical contract |
| T02-23 restore/retrieval tamper validation | BLOCKED(S27) | No approved stored-bundle reconstruction verifier |
| T02-24 live backup/restore precondition | NOT RUN | No current evidence or recovery owner |
| T02-25 one-time live apply | NOT RUN | G1-L absent |
| T02-26 live catalog/aggregate parity | NOT RUN | G1-L absent |
| T02-27 evidence/CI leakage | PASS | Final repository scans are payload-free; no live evidence generated |
| T02-28 test-only code production-inaccessible | PASS | Exact local endpoint guard + loopback binding; pure negative tests |
| T02-29 Task 11 manifest/review | BLOCKED | Parallel Task 11 work has no Task 02 review record |
| T02-30 cross-task effect denial | NOT RUN | Task 11 integration evidence absent |

## Acceptance criteria

| Criteria | Status |
|---|---|
| AC1 baseline identity | PASS |
| AC2 explicit approvals | BLOCKED |
| AC3 no unresolved defect in scope | FAIL (GAP-01, GAP-02) |
| AC4–AC14 Docker migration/database/clinical proofs | NOT RUN |
| AC15 orientation blocked and LTC parked | FAIL (orientation); LTC PASS |
| AC16 PDF/export/retrieval/restore evidence | BLOCKED |
| AC17 deterministic tamper evidence | BLOCKED(S27) |
| AC18 evidence hygiene | PASS for repository/static artifacts; live not run |
| AC19 test-only production isolation | PASS_STATIC/PASS_UNIT |
| AC20 Task 11 promotion controls | BLOCKED |
| AC21–AC25 live criteria | NOT RUN |

## Required follow-up order

1. Obtain lead approval for separate protected fixes; restore audit atomicity
   and the orientation hard gate, then re-run pure/static gates.
2. Freeze a clean candidate and obtain exact G1-D.
3. Start Docker Desktop and run from-zero plus predecessor-upgrade evidence.
4. Resolve S27 with an approved governance/export contract.
5. Obtain Task 11 test-plan review.
6. Supply restorability evidence, project identity/window and exact G1-L.
7. Apply once, verify read-only, then obtain independent G4.
