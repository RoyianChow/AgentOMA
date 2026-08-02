# Task 02 evidence index

**Recorded:** 2026-08-02

**Candidate:** `813e360546f6dc1b4c03ead5de7d22002f063759`

**Overall:** **BLOCKED**

**Docker/live:** **NOT RUN**

**Production promotion:** **BLOCKED**

## Identity and approvals

| Item | Value |
|---|---|
| Initial baseline | `76098acad4afee5e80aa0dc71074d7ec97e14cf3` |
| Current candidate | `813e360546f6dc1b4c03ead5de7d22002f063759` |
| Migration head | `0018_clever_mister_fear` |
| Migration SHA-256 | `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c` |
| Chain digest | `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb` |
| Scoped remediation | GRANTED by Royian Chowdhury; two items only |
| G1-D | NOT GRANTED |
| G1-L | NOT GRANTED |
| G2 | PARKED |
| G3 | DECIDED — HARD GATE; NO ADMIN OVERRIDE |
| G4 | NOT GRANTED |
| Task 01 | PASS per committed Task 01 manifest |
| Task 11 | NOT VERIFIED for this candidate |

## Candidate commands

| Command | UTC start → end | Result | Evidence |
|---|---|---|---|
| `npx tsc --noEmit` | 03:19:17.6106520Z → 03:19:22.0735238Z | PASS, exit 0 | `runs/813e3605…/quality-gates.json` |
| `npm run lint` | 03:19:17.5917018Z → 03:19:29.5927213Z | PASS, exit 0 | Same |
| `npm run test:pure` | 03:19:17.6274617Z → 03:19:22.1885719Z | PASS, 12 files/113 tests/0 skipped | Same |
| `npm run build` | 03:19:52.4257873Z → 03:20:14.5561923Z | PASS, exit 0 | Same |
| `docker version --format '{{json .}}'` | 03:20:20.5739322Z → 03:20:20.7335896Z | NOT AVAILABLE, exit 1 | `runs/813e3605…/docker-availability.json` |

All timestamps are on 2026-08-02 UTC. The abbreviated paths above expand under
`artifacts/p0/task-02/runs/813e360546f6dc1b4c03ead5de7d22002f063759/`.
No database command ran.

## Controls

| Control | Status | Evidence / reason |
|---|---|---|
| T02-01 | PASS | Baseline and current-state analysis |
| T02-02 | PASS | Candidate, migration hash, predecessor, chain digest locked |
| T02-03 | BLOCKED | G1-D/G1-L/G4 absent; scoped remediation approval recorded |
| T02-04 | BLOCKED | Local guard passes; Docker/live identity not executed |
| T02-05 | NOT RUN | No authorized disposable database |
| T02-06 | NOT RUN | G1-D |
| T02-07 | NOT RUN | G1-D |
| T02-08 | NOT RUN | G1-D/G1-L |
| T02-09 | NOT RUN | Candidate DB matrix not run |
| T02-10 | NOT RUN | App-role evidence immutability not run |
| T02-11 | NOT RUN | App-role audit immutability not run |
| T02-12 | NOT RUN | Trigger/RLS/function/role bypass suite not run |
| T02-13 | BLOCKED | Required audit moved into transaction; real-PostgreSQL failure injection added but not run |
| T02-14 | NOT RUN | G1-D concurrency suite |
| T02-15 | NOT RUN | Fresh red-flag zero-row proof absent |
| T02-16 | NOT RUN | Fresh referral-separation proof absent |
| T02-17 | NOT RUN | Pure tests pass; active-reference DB path not run |
| T02-18 | PASS | G3 decided; all override paths removed; strict/source pure regressions pass |
| T02-19 | PASS | LTC remains parked and unchanged |
| T02-20 | BLOCKED | Static tenant/auth boundary; DB test not run |
| T02-21 | BLOCKED | Pure export projection; integrated DB/PDF test not run |
| T02-22 | BLOCKED | S27 canonical-hash contract unresolved |
| T02-23 | BLOCKED | Reconstruction/tamper verifier unresolved |
| T02-24 | NOT RUN | Recovery proof/G1-L absent |
| T02-25 | NOT RUN | Live apply not authorized |
| T02-26 | NOT RUN | Live parity not authorized |
| T02-27 | PASS | Repository evidence scans contain no PHI/secret pattern matches |
| T02-28 | PASS | Test trigger exists only in `.db.test.ts`; exact local DB guard retained |
| T02-29 | BLOCKED | Task 11 exact-candidate review absent |
| T02-30 | NOT RUN | Cross-task integration evidence absent |

## Conditional deliverables

The following remain deliberately absent rather than empty placeholders:

| Deliverable | Status |
|---|---|
| Docker migration/database/synthetic reports and fingerprints | NOT RUN (G1-D) |
| Live preflight/verification/catalog fingerprint | NOT RUN (G1-L) |
| Task 11 release-register review | BLOCKED (S25) |

The historical Workstream F red/green evidence remains under the prior candidate
run directory. The current candidate did not change that serializer/projection;
its current pure suite rerun is bound above.
