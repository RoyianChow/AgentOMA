# Task 11 - Current State and Gap Analysis

**Reconciled:** 2026-08-20

**Observed HEAD:** `1ce2c9ace894f5c2a745f15fa901fe2fc6acc138`

**Status:** `FIRST_CI_SLICE_MERGED / CONTROL_PLANE_INCOMPLETE`  
**Production release authority:** not granted

## Authorization boundary

The recorded Task 11 decision authorizes bounded synthetic implementation. It
does not authorize production release, waive independent review, or allow the
control plane to approve its own work. See
[`decisions/implementation-approval-2026-08-02.md`](decisions/implementation-approval-2026-08-02.md).

## Merged CI slice

PR #31 added `.github/workflows/ci.yml`. It runs on pull requests and pushes to
`main`, uses read-only repository permissions, cancels superseded runs, pins
Node 22 through `actions/setup-node`, and uses `npm ci --ignore-scripts`.

Stable job IDs now present:

1. `quality-install`;
2. `quality-typescript`;
3. `quality-eslint`;
4. `quality-pure-tests`;
5. `quality-build`;
6. `database-fresh-migrations`; and
7. `database-constraints`.

Both database jobs use the disposable loopback Docker PostgreSQL suite and run
cleanup with `if: always()`. The two jobs currently execute the same full test
command under different stable required-check identities; that is deliberate
until the migration and constraint suites are separated.

## Merge-review verification

Local checks at the observed HEAD:

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:pure` | PASS - 22 files / 306 tests |
| `npm run build` | PASS |
| `npm run sandbox:verify` | PASS - 40 files / 606 tests plus boundary |
| `npm run sandbox:verify-evidence` | PASS |
| `npm run sandbox:verify-production` | FAIL - `SBX_INVARIANCE_DENIED:routeShape` |
| Root/database CI jobs on GitHub | NOT VERIFIED in this local documentation pass |

The earlier Task 02 fixture/assertion mismatch is corrected in the maintained
tree: the version-2 record test now expects the self-report status derived from
its fixture. This does not substitute for a fresh GitHub database run.

## Remaining Task 11 controls

| Gap | Required outcome |
|---|---|
| Secret scanning | Stable required job, safe findings and exact-candidate evidence |
| Dependency review | Lockfile/dependency risk job with owned triage |
| Security policy | Raw-env, forbidden-import, PHI/secret leakage and unsafe-enable checks |
| Automated accessibility | Stable job plus manual-evidence contract where automation is insufficient |
| Release evidence validator | Machine validation of hashes, commands, statuses, reviewers and expiry |
| Aggregate release gate | Fail closed when any non-waivable control, approval or evidence is absent |
| Capability register | Every production/sandbox capability, owner, risk tier, lifecycle and kill switch |
| Control catalogue | Stable IDs, applicability, test/evidence mapping and non-waivable classification |
| Independent review | Quality, security, privacy, accessibility, operations and professional/legal roles as applicable |
| Branch protection | Verify the required job IDs against repository settings; do not infer from workflow presence |
| Production invariance | Resolve current route-shape failure without weakening or casual rebaseline |

## Known release blockers

- Task 01 production-invariance currently fails for the merged candidate.
- Task 02 remains blocked before live migration `0018`.
- Task 04's v3 renewal is a draft and its prior runtime authority expired.
- Task 06 is merged as synthetic code but lacks renewed runtime authority and
  independent production prerequisites.
- No exact-candidate aggregate release evidence exists for the current merge
  batch.

## Next slice

1. Triage the production-route shape delta with Task 01.
2. Add the missing security and policy jobs without renaming existing stable
   job IDs.
3. Add evidence-schema validation and the fail-closed aggregate release gate.
4. Verify GitHub branch-protection required checks through an authorized repo
   administrator and capture payload-free evidence.
5. Obtain independent review bound to the exact candidate before any promotion
   status changes.

Green automation is necessary evidence, not authorization. Task 11 records
human decisions and technical results; it cannot grant, infer, or self-approve
them.
