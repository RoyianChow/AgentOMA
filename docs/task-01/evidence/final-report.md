# Task 01 evidence report

**Overall status:** BLOCKED — SBX-14 is NOT_REQUESTED because G2 hosted-preview approval was not granted.

**Candidate commit:** `db880c926f169b14ab73892a7c2a02627c22c067` (`task-01-candidate-db880c92`)

**Tested implementation commit:** `225be71f99b9859aea8a9b088ea6a66ebcdd46cb`

**Reviewed evidence commit:** `abb72ec5dced5327b6351009270e72b1199046c8`

**Branch:** `feat/moh-compliance-migration`

## Root test evidence

The repository-bound root record is [`runs/225be71f/root-npm-test.json`](runs/225be71f/root-npm-test.json).
The exact command was `npm test`; it completed with exit code 0 on Docker test-db at
`localhost:5433`, using a synthetic throwaway database. It recorded 17 test files and
181 tests. The summary artifact is SHA-256 bound in the record and contains no raw output.

The final reruns also passed `npm run lint`, `npm run build`, `npm run sandbox:verify`,
`npm run sandbox:verify-production`, `npm run sandbox:verify-boundary`, and
`npm run sandbox:verify-artifact`. The sandbox build passed when run with the prohibited
host environment removed and the seven required synthetic variables supplied; an
un-scrubbed host run correctly failed closed on `OPENAI_API_KEY`.

## Controls

SBX-01 through SBX-13, SBX-15, and SBX-16 each have standalone red and green evidence
under [`SBX-01/`](SBX-01/) through [`SBX-16/`](SBX-16/). Red runs use isolated,
synthetic-only mutations and non-zero denial results; green runs use the identical
commands against the final implementation and exit 0.

SBX-17 is **evidence integrity** and has a current-commit manifest-corruption red/green
pair under [`SBX-17/`](SBX-17/). SBX-18 is **lifecycle races, including stale queued-action
cancellation** and has a current-commit final-lifecycle-recheck red/green pair under
[`SBX-18/`](SBX-18/).

SBX-14 remains explicitly `NOT_REQUESTED`: there is no hosted preview, no hosted access
test, and no G2 approval. The v2 manifest schema cannot express `NOT_APPLICABLE` as a
control status, so the control is recorded with `applicability: NOT_REQUESTED` and the
overall manifest remains BLOCKED. It is not being falsely marked PASS.

## Verification and approvals

- `npm run sandbox:verify-evidence` must validate the 18-control manifest.
- `npm run sandbox:verify` must pass the sandbox typecheck, lint, tests, and boundary checks.
- The final secret, PHI, fixture, bundle, log, URL, storage, and artifact scans are recorded in [`final-scans.json`](final-scans.json).
- Branch protection is **PASS** in [`runs/abb72ec5/branch-protection.json`](runs/abb72ec5/branch-protection.json).
- Product-lead and security/privacy final sign-off are **APPROVED** in [`../decisions/final-review-signoffs-2026-07-31.md`](../decisions/final-review-signoffs-2026-07-31.md).
- G2 hosted-preview approval is **NOT GRANTED** and the G3 production-import allowlist is empty.

No red mutation was committed, uploaded, or run with credentials, PHI, production URLs,
production identifiers, or live resources. No test command used a filter, skip flag, or
focused selector.
