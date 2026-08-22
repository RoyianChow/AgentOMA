# Task 01 experimental sandbox

**Current phase:** Local synthetic boundary maintenance
**Overall status:** PASS for the recorded evidence candidate
**Production authorization:** none
**G2 hosted preview:** NOT REQUESTED; SBX-14 is NOT APPLICABLE
**G3 production-import allowlist:** empty

> **Current-candidate warning (2026-08-22):** the PASS below belongs only to
> its recorded historical candidate. CI remediation candidate
> `2358570aa9eae45b7b4403fe0a262f06c9dc36c0` passes the local sandbox build,
> production-invariance check, and changed-control SBX-04/SBX-13 red/green
> tests. Its promotion remains **BLOCKED** pending exact-candidate Task 11
> review. Do not apply the historical PASS to this candidate.

PR #56 merged the remediation as `e1c7973086a0223e72ac90e01c33cd85fa407b67`
on 2026-08-22. All reported PR checks passed, but no independent PR review was
recorded. Merge and CI success do not satisfy the required Task 11 promotion
review.

Start with:

1. [`current-state-and-gap-analysis.md`](current-state-and-gap-analysis.md)
2. [`experimental-sandbox-design.md`](experimental-sandbox-design.md)
3. [`experimental-sandbox-threat-model.md`](experimental-sandbox-threat-model.md)
4. [`experimental-sandbox-data-flow.md`](experimental-sandbox-data-flow.md)
5. [`decisions/G1-design-approval.md`](decisions/G1-design-approval.md)
6. [`runbook.md`](runbook.md)
7. [`evidence/evidence-manifest.json`](evidence/evidence-manifest.json)

The authoritative status is the
[`evidence manifest`](evidence/evidence-manifest.json) and
[`final report`](evidence/final-report.md). The report records candidate
`db880c926f169b14ab73892a7c2a02627c22c067`, tested implementation
`225be71f99b9859aea8a9b088ea6a66ebcdd46cb`, and reviewed evidence commit
`abb72ec5dced5327b6351009270e72b1199046c8`.

G1 was granted by Royian Chowdhury as Product Lead and Security/Privacy
Reviewer on 2026-07-31. The implementation is a separate
`apps/experiment-sandbox/` npm workspace with no production imports, database,
storage, credentials, hosted preview, or external destination. It has typed
synthetic configuration, loopback/lifecycle gates, server-owned fixtures and
identity, denied adapters and network transport, marked sample artifacts,
private/no-store headers, architecture scans, production invariance checks, and
isolated tests.

The manifest validates 17 applicable controls as PASS. SBX-14 is
`NOT_APPLICABLE` only because G2 was not requested and no hosted origin exists.
SBX-17 covers evidence integrity; SBX-18 covers lifecycle races and stale
queued-action cancellation. Required red/green artifacts, root test evidence,
final scans, branch-protection evidence, and final sign-offs are recorded in
the evidence tree.

That PASS does not transfer to later sandbox changes. Any changed source,
dependency, configuration, lifecycle control, evidence schema, build output,
or production baseline requires the affected verification and evidence to run
again against the new exact candidate.

This task does not authorize production deployment, production data, production
credentials, live integrations, hosted access, or any G3 import.
