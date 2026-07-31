# Task 01 candidate evidence report

**Overall status:** BLOCKED — not eligible for merge or promotion

**Candidate commit:** `db880c926f169b14ab73892a7c2a02627c22c067`

**Candidate tag:** `task-01-candidate-db880c92`

**Branch:** `feat/moh-compliance-migration`

The candidate worktree was clean at evidence capture. Run metadata is stored in
[`runs/db880c92/`](runs/db880c92/). Each record contains the exact command,
UTC start/end timestamps, exit code, output byte count, output SHA-256, and a
safe summary. Raw command output is not retained.

## Gates

| Gate | Result | Evidence |
|---|---|---|
| Root TypeScript | PASS | `root-tsc.json` |
| Root lint | PASS | `root-lint.json` |
| Root pure suite | PASS — 10 files, 95 tests | `root-pure-tests.json` |
| Root all-tests command | BLOCKED — Docker unavailable; localhost:5433 refused; default Vitest include reported no test files | `root-all-tests.json` |
| Root production build | PASS | `root-production-build.json` |
| Production invariance | PASS | `production-invariance.json` |
| Sandbox TypeScript | PASS | `sandbox-typecheck.json` |
| Sandbox lint | PASS | `sandbox-lint.json` |
| Sandbox tests | PASS — 6 files, 17 tests, unfiltered | `sandbox-tests-unfiltered.json`, `sandbox-tests-verbose.json` |
| Sandbox boundary | PASS | `sandbox-boundary.json` |
| Sandbox build | PASS | `sandbox-build.json` |
| Artifact check | PASS | `sandbox-artifact.json` |
| Manifest schema check | PASS — schema is valid; overall manifest remains BLOCKED | `sandbox-manifest-schema-final.json` |

No test command used a test-name filter, file filter, skip flag, or focused-test
selector. The verbose sandbox run is retained as the no-filter evidence.

The final secret, PHI, fixture, bundle, log, URL, storage, and artifact scan
summary is [`final-scans.json`](final-scans.json).

## SBX-01–SBX-18 mapping

All 18 controls are present in [`evidence-manifest.json`](evidence-manifest.json).
Green evidence exists for the implemented checks, but the required standalone
controlled red-run records were not captured. Therefore every control remains
BLOCKED rather than being represented as a false PASS. SBX-17 is additionally
blocked because the candidate has no stale-action handler or dedicated test.

## Approval and release boundaries

- G1 product-lead and security/privacy approval is recorded verbatim in
  [`G1-design-approval.md`](../decisions/G1-design-approval.md).
- Final implementation sign-off from the product lead: **NOT OBTAINED**.
- Final implementation sign-off from the security/privacy reviewer: **NOT OBTAINED**.
- G2 hosted-preview approval: **NOT GRANTED**.
- G3 production-import allowlist: **empty**.
- Branch protection: **NOT VERIFIED**. GitHub returned `Branch not protected`
  for `main`; see `branch-protection.json`.

Task 01 must not be merged or promoted until the blocked evidence is completed,
the full root database-backed suite can run, branch protection is configured or
explicitly waived by the authorized owner, and both final reviewer decisions
are recorded.
