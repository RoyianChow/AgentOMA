# Task 02 evidence index

**Recorded:** 2026-08-02
**Candidate:** `dcaab91f9adba7457a85214d51d1614c8560f404`
**Failed predecessor-harness candidate:** `dd503a14da24ea80a0f0e046e179f6b4b4e77b3c`
**Overall:** **BLOCKED — DO NOT PROMOTE**
**Docker:** **PASS for prior from-zero suite; predecessor/restart run FAIL (fail closed)**
**Live:** **NOT RUN**
**Production promotion:** **BLOCKED**

## Identity and approvals

| Item | Value |
|---|---|
| Initial baseline | `76098acad4afee5e80aa0dc71074d7ec97e14cf3` |
| Tested candidate | `dcaab91f9adba7457a85214d51d1614c8560f404` |
| G1-D approval record commit | `f82f0fec3bf9fe2ae42e1c9cf5ac54488e7eb5e9` |
| Migration head | `0018_clever_mister_fear` |
| Predecessor | `0017_tense_pandemic` |
| Migration SHA-256 | `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c` |
| Chain digest | `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb` |
| G1-D | GRANTED by Royian Chowdhury for `dd503a14…`; consumed by a failed closed run and cannot carry forward |
| G1-L | NOT GRANTED |
| G2 | PARKED |
| G3 | DECIDED — HARD GATE; NO ADMIN OVERRIDE |
| G4 | NOT GRANTED |
| Task 01 | PASS per committed Task 01 manifest |
| Task 11 | NOT VERIFIED for this candidate/evidence set |

## Exact-candidate commands

All timestamps are 2026-08-02 UTC.

| Command | UTC start → end | Result | Evidence |
|---|---|---|---|
| `npx tsc --noEmit` | 06:45:25.3340924Z → 06:45:39.3484457Z | PASS, exit 0 | `evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/quality-gates.json` |
| `npm run lint` | 06:45:39.3537850Z → 06:46:06.0562148Z | PASS, exit 0 | Same |
| `npm run test:pure` | 06:46:06.0562148Z → 06:46:19.8672585Z | PASS, 13 files/123 tests/0 skipped | Same |
| `npm run build` | 06:46:19.8796387Z → 06:47:12.7585175Z | PASS, exit 0, synthetic build-only env | Same |
| `npm run test:db:up` | Before 06:35:10Z | PASS, pre-start and running checks | `evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/from-zero-run.json` |
| `npm test` | 06:35:10.7509638Z → 06:36:04.7405376Z | PASS, 20 files/211 tests/0 skipped | Same |
| `npm test` confirmation | 06:38:05.0798340Z → 06:38:51.0933078Z | PASS, 20 files/211 tests/0 skipped | Same |
| Restart-persistence checks | After confirmation run | BLOCKED; both failed attempts retained | `evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/restart-persistence.json` |
| `npm run test:db:down` | After restart checks | PASS; container/network removed | From-zero record |
| `npm run test:db:upgrade` | 08:21:59.737Z → 08:23:04.134Z | FAIL, exit 1 — `DATABASE_IDENTITY_DENIED`; teardown PASS | `evidence/runs/dd503a14da24ea80a0f0e046e179f6b4b4e77b3c/predecessor-upgrade-run.json` |

The disposable environment used Docker 29.6.2, PostgreSQL 16.14,
`postgres:16-alpine`, loopback `127.0.0.1:5433`, and tmpfs storage. No live
database, production credential, PHI, or external route was accessed.

## Repository artifact hashes

| Artifact | SHA-256 |
|---|---|
| `evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/quality-gates.json` | `e5017961da9e56d1ebe4378c4bb6aad019cffecbdc4d1337ff63cf4b8b9f42b5` |
| `evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/from-zero-run.json` | `a730d9d8ba6ecfb12b81df3404a38374a6c55462e2b5cc3d22daed7e8e3613c4` |
| `evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/restart-persistence.json` | `036458bde8bddfd87d4d88924f8ce71d81cfbaeba0b3e169016fca39e1f49050` |
| `evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/control-map.json` | `af751c1ddee5cd434ba0ac090432be100d7968af30770c48fcfa0062e59e0035` |

## Controls

| Control | Status | Evidence / reason |
|---|---|---|
| T02-01 | PASS | Baseline and current-state analysis |
| T02-02 | PASS | Candidate, migration, predecessor, hashes, and chain digest locked |
| T02-03 | BLOCKED | The `dd503a14…` G1-D was exact but its execution failed; a new candidate requires a new approval. G1-L and G4 remain ungranted. |
| T02-04 | BLOCKED | Docker identity fails closed and passed; live identity NOT RUN |
| T02-05 | PASS | Synthetic loopback-only tmpfs environment verified and removed |
| T02-06 | PASS | Complete 19-migration chain replayed from zero twice |
| T02-07 | FAIL | The `dd503a14…` predecessor run denied before migration or fixture writes. It proves no upgrade path; remediation needs a new candidate and new G1-D. |
| T02-08 | FAIL | The same failed run never reached catalog/aggregate verification. No passing runtime proof exists. |
| T02-09 | PASS | Cross-pharmacy patient, assessment, evidence, intake, and export denials passed |
| T02-10 | PASS | App-role/trigger-backed evidence mutation denials passed |
| T02-11 | PASS | App-role audit UPDATE/DELETE denial and INSERT allowance passed |
| T02-12 | BLOCKED | Trigger/governance checks pass; complete RLS/function/role-escalation matrix absent |
| T02-13 | PASS | Required-audit fault rolled back every completion effect atomically |
| T02-14 | PASS | Real-PostgreSQL duplicate/retry/concurrency tests passed |
| T02-15 | PASS | Red-flag terminal exit wrote zero claim rows |
| T02-16 | PASS | Completed referral remained billable and distinct from red-flag exit |
| T02-17 | PASS | Seeded reference and unknown-lookup refusal paths passed |
| T02-18 | PASS | Orientation is a hard server gate with no admin override |
| T02-19 | PASS | LTC facts persist while the parked billing path remains inert |
| T02-20 | PASS | Server authorization and tenant-pinned database/export denials passed |
| T02-21 | PASS | Persisted evidence projection/artifact coverage passed without recomputation |
| T02-22 | BLOCKED | S27 canonical repeat-export contract unresolved |
| T02-23 | BLOCKED | S27 reconstruction/tamper-verification contract unresolved |
| T02-24 | NOT RUN | Recovery proof and G1-L absent |
| T02-25 | NOT RUN | Live apply not authorized |
| T02-26 | NOT RUN | Live parity not authorized |
| T02-27 | PASS | Repository evidence contains safe metadata only |
| T02-28 | PASS | Fault trigger is test-only; Docker URL/ownership/config guards fail closed |
| T02-29 | BLOCKED | Independent Task 11 exact-candidate review absent |
| T02-30 | NOT RUN | Cross-task integration effect-denial evidence absent |

The machine-readable control map is
`evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/control-map.json`.
Restart persistence is not silently waived: the prior tmpfs result remains
BLOCKED. The separate named-volume harness preserved a fail-closed runtime
record for `dd503a14…`; it will not be rerun on that candidate. Its remediation
adds only bounded read-only readiness and granular safe diagnostics. A new clean
candidate and new G1-D are required before another runtime proof. No old
evidence file or control status was relabelled.
