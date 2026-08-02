# Task 02 P0 release-readiness checklist

**As of:** 2026-08-02
**Candidate:** `dcaab91f9adba7457a85214d51d1614c8560f404`
**Failed predecessor-harness candidate:** `dd503a14da24ea80a0f0e046e179f6b4b4e77b3c`
**Overall:** **BLOCKED — DO NOT PROMOTE**

| Control | Status | Evidence / blocker |
|---|---|---|
| T02-01 instructions/state recorded | PASS | Current-state analysis and evidence index |
| T02-02 commit/migration identity locked | PASS | Candidate, predecessor, migration and chain hashes |
| T02-03 approvals bind action/bytes/environment | BLOCKED | G1-D passed; G1-L/G4 absent |
| T02-04 environment identity fails closed | BLOCKED | Docker PASS; live NOT RUN |
| T02-05 disposable environment isolated | PASS | Loopback-only synthetic tmpfs environment removed |
| T02-06 full-chain replay | PASS | 19 migrations through `0018`, twice |
| T02-07 predecessor upgrade | FAIL | The approved `dd503a14…` run denied before migration or fixture writes; a remediated candidate needs a new G1-D. |
| T02-08 catalog/aggregate deltas | FAIL | The failed run did not reach catalog/aggregate verification; no passing proof exists. |
| T02-09 tenant/patient isolation | PASS | Real-PostgreSQL cross-scope denials |
| T02-10 evidence immutability as app role | PASS | Grant/trigger-backed denial tests |
| T02-11 audit immutability as app role | PASS | UPDATE/DELETE denied; INSERT allowed |
| T02-12 trigger/RLS/function/role bypass | BLOCKED | Partial runtime matrix only |
| T02-13 completion failure atomicity | PASS | Required-audit fault rolled back all effects |
| T02-14 idempotency/concurrency | PASS | Duplicate and race tests converge once |
| T02-15 red-flag zero rows | PASS | Zero claim rows proved |
| T02-16 completed referral separation | PASS | Billable SSC path distinct from red flag |
| T02-17 reference-derived billing | PASS | Seeded/unknown lookup persistence paths |
| T02-18 orientation hard gate | PASS | No bypass; role/supervisor cases pass |
| T02-19 LTC remains parked | PASS | Facts persist; billing path inert |
| T02-20 export auth/tenant pinning | PASS | Server/database negative cases |
| T02-21 PDF/export evidence projection | PASS | Persisted evidence/artifact cases |
| T02-22 deterministic/tamper-evident manifest | BLOCKED | S27: canonical repeat-export contract unresolved |
| T02-23 restore/retrieval tamper validation | BLOCKED | S27: reconstruction verifier unresolved |
| T02-24 live backup/restore precondition | NOT RUN | Recovery proof/G1-L absent |
| T02-25 one-time live apply | NOT RUN | G1-L absent |
| T02-26 live catalog/aggregate parity | NOT RUN | Live apply unauthorized |
| T02-27 evidence/CI leakage | PASS | Safe metadata only; no PHI/credentials |
| T02-28 test-only production isolation | PASS | Test-only fault hook; fail-closed Docker guard |
| T02-29 Task 11 manifest/review | BLOCKED | Independent exact-candidate review absent |
| T02-30 cross-task effect denial | NOT RUN | Integration evidence absent |

## Acceptance summary

| Criteria | Status |
|---|---|
| Baseline and candidate identity | PASS |
| Docker execution authorization | PASS |
| Protected defect remediation | PASS on real PostgreSQL |
| From-zero database/clinical matrix | PASS |
| Predecessor/restart persistence | FAIL before restart on `dd503a14…`; prior tmpfs attempt remains BLOCKED |
| Orientation hard gate + LTC parked | PASS |
| Export evidence projection | PASS |
| Canonical reconstruction/tamper contract | BLOCKED — S27 |
| Evidence hygiene | PASS |
| Task 11/recovery/live/promotion | BLOCKED |

Detailed machine-readable status:
`evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/control-map.json`.
