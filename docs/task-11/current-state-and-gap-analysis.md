# Task 11 - Current State and Gap Analysis

**Reconciled:** 2026-08-26

**Observed HEAD:** `e1c7973086a0223e72ac90e01c33cd85fa407b67`

**Status:** `INCREMENTAL_CI_SLICE_MERGED / CONTROL_PLANE_INCOMPLETE`
**Production release authority:** not granted

## Authorization boundary

The recorded Task 11 decision authorizes bounded synthetic implementation. It
does not authorize production release, waive independent review, or allow the
control plane to approve its own work. See
[`decisions/implementation-approval-2026-08-02.md`](decisions/implementation-approval-2026-08-02.md).

## Merged CI slice

PR #31 added `.github/workflows/ci.yml`, and the later Task 11 slice added the
raw-environment policy job. It runs on pull requests and pushes to
`main`, uses read-only repository permissions, cancels superseded runs, pins
Node 22 through `actions/setup-node`, and uses `npm ci --ignore-scripts`.

Stable job IDs now present:

1. `quality-install`;
2. `quality-typescript`;
3. `quality-eslint`;
4. `quality-pure-tests`;
5. `quality-build`;
6. `database-fresh-migrations`; and
7. `database-constraints`; and
8. `security-policy` (PRV-01 raw-environment and BND-01 forbidden-import
   controls).

The dependency-remediation candidate adds the stable
`security-dependencies` job. It upgrades both Next.js workspaces to the patched
release, removes the observed advisories, and enforces exact advisory/exception
policy. It is not described as merged or promoted until its exact-candidate
review is recorded. See
[`dependency-security-policy.md`](dependency-security-policy.md).

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
| `npm run sandbox:verify` | PASS - 40 files / 614 tests plus boundary |
| `npm run sandbox:verify-evidence` | PASS |
| `npm run sandbox:verify-production` | PASS on Task 01 candidate `2358570a...` |
| PR #56 GitHub checks | PASS - quality, security-policy, database, sandbox boundary/invariance, GitGuardian, SonarCloud and Vercel checks reported success |

The earlier Task 02 fixture/assertion mismatch is corrected in the maintained
tree: the version-2 record test now expects the self-report status derived from
its fixture. This does not substitute for a fresh GitHub database run.

## Remaining Task 11 controls

| Gap | Required outcome |
|---|---|
| Secret scanning | Stable required job, safe findings and exact-candidate evidence |
| Dependency review | Candidate implemented; preserve audit evidence and obtain exact-candidate independent review before merge/promotion |
| Security policy | Raw-env, forbidden-import, PHI/secret leakage and unsafe-enable checks |
| Automated accessibility | Stable job plus manual-evidence contract where automation is insufficient |
| Release evidence validator | Machine validation of hashes, commands, statuses, reviewers and expiry |
| Aggregate release gate | Fail closed when any non-waivable control, approval or evidence is absent |
| Capability register | Every production/sandbox capability, owner, risk tier, lifecycle and kill switch |
| Control catalogue | Stable IDs, applicability, test/evidence mapping and non-waivable classification |
| Independent review | Quality, security, privacy, accessibility, operations and professional/legal roles as applicable |
| Branch protection | Verify the required job IDs against repository settings; do not infer from workflow presence |
| Production invariance review | Review candidate `2358570a...` and its SBX-04/SBX-13 evidence; merge and green CI do not replace independent promotion review |

## Known release blockers

- Task 01 technical remediation is merged and green, but exact-candidate Task
  11 promotion review remains unrecorded.
- Task 02 remains blocked before live migration `0018`.
- Task 04's v3 renewal is a draft and its prior runtime authority expired.
- Task 06 is merged as synthetic code but lacks renewed runtime authority and
  independent production prerequisites.
- No exact-candidate aggregate release evidence exists for the current merge
  batch.

## Next slice

1. Complete Task 11 review of Task 01 candidate `2358570a...` and its changed-control evidence.
2. Review and merge the dependency-remediation candidate without renaming
   existing stable job IDs, then add the remaining secret and PHI/logging
   policy jobs.
3. Add evidence-schema validation and the fail-closed aggregate release gate.
4. Configure the approved required status checks and admin enforcement for
   `main`, then capture payload-free evidence. The GitHub API currently shows
   one required approval but no required-check contexts and no admin enforcement.
5. Obtain independent review bound to the exact candidate before any promotion
   status changes.

Green automation is necessary evidence, not authorization. Task 11 records
human decisions and technical results; it cannot grant, infer, or self-approve
them.
