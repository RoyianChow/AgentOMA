# Task 02 P0 release-readiness checklist

**As of:** 2026-08-02

**Candidate:** `813e360546f6dc1b4c03ead5de7d22002f063759`

**Overall:** BLOCKED — the two prior code defects are remediated, but mandatory
real-PostgreSQL and release evidence remains NOT RUN or BLOCKED.

| Control | Status | Evidence / blocker |
|---|---|---|
| T02-01 instructions/state recorded | PASS | Baseline + current-state analysis |
| T02-02 commit/migration identity locked | PASS | Candidate, migration SHA, predecessor, chain digest |
| T02-03 approvals bind action/bytes/environment | BLOCKED | G1-D, G1-L, G4 not granted |
| T02-04 environment identity fails closed | BLOCKED | Local guard pure tests pass; Docker/live identity not run |
| T02-05 disposable environment isolated | NOT RUN | G1-D absent; Docker unavailable |
| T02-06 full-chain replay | NOT RUN | G1-D |
| T02-07 predecessor upgrade | NOT RUN | G1-D |
| T02-08 catalog/aggregate deltas | NOT RUN | G1-D/G1-L |
| T02-09 tenant/patient isolation | NOT RUN | Candidate DB matrix not run |
| T02-10 evidence immutability as app role | NOT RUN | Runtime proof absent |
| T02-11 audit immutability as app role | NOT RUN | Runtime proof absent |
| T02-12 trigger/RLS/function/role bypass | NOT RUN | G1-D |
| T02-13 completion failure atomicity | BLOCKED | Code fixed + fault test added; real PostgreSQL execution pending G1-D |
| T02-14 idempotency/concurrency | NOT RUN | G1-D |
| T02-15 red-flag zero rows | NOT RUN | Fresh candidate DB proof absent |
| T02-16 completed referral separation | NOT RUN | Fresh candidate DB proof absent |
| T02-17 reference-derived billing | NOT RUN | 113 pure tests pass; active-reference DB proof absent |
| T02-18 orientation hard gate | PASS | G3 decided; bypass removed; strict-boundary and source regressions pass |
| T02-19 LTC remains parked | PASS | LTC derivation and policy untouched |
| T02-20 export auth/tenant pinning | BLOCKED | Static boundary exists; DB test not run |
| T02-21 PDF/export evidence projection | BLOCKED | Pure projection passes; integrated DB/PDF matrix absent |
| T02-22 deterministic/tamper-evident manifest | BLOCKED(S27) | Canonical repeat-export contract unresolved |
| T02-23 restore/retrieval tamper validation | BLOCKED(S27) | Reconstruction verifier unresolved |
| T02-24 live backup/restore precondition | NOT RUN | G1-L/recovery proof absent |
| T02-25 one-time live apply | NOT RUN | G1-L absent |
| T02-26 live catalog/aggregate parity | NOT RUN | G1-L absent |
| T02-27 evidence/CI leakage | PASS | Repository evidence scans are payload-free |
| T02-28 test-only code production-inaccessible | PASS | Fault trigger lives only in `.db.test.ts`; local DB guard remains exact |
| T02-29 Task 11 manifest/review | BLOCKED | Exact-candidate review not verified |
| T02-30 cross-task effect denial | NOT RUN | Task 11 integration evidence absent |

## Acceptance summary

| Criteria | Status |
|---|---|
| AC1 baseline identity | PASS |
| AC2 explicit approvals | BLOCKED |
| AC3 protected defects remediated | BLOCKED pending PostgreSQL fault proof |
| AC4–AC14 database/clinical proofs | NOT RUN |
| AC15 orientation hard gate + LTC parked | PASS |
| AC16 PDF/export/retrieval/restore | BLOCKED |
| AC17 deterministic tamper evidence | BLOCKED(S27) |
| AC18 evidence hygiene | PASS for repository artifacts; live NOT RUN |
| AC19 test-only production isolation | PASS |
| AC20 Task 11 promotion controls | BLOCKED |
| AC21–AC25 live criteria | NOT RUN |

## Required next order

1. Obtain exact G1-D for candidate `813e3605…` and a named disposable local
   PostgreSQL environment.
2. Start Docker Desktop and run from-zero, predecessor-upgrade, atomicity,
   concurrency, role, clinical, red-flag, referral, and export suites.
3. Resolve S27 through an approved export/reconstruction contract.
4. Obtain Task 11 review of the exact candidate and evidence.
5. Establish recovery proof, then separately obtain G1-L and G4.
