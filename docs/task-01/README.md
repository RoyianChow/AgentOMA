# Task 01 experimental sandbox

**Current phase:** Local implementation and evidence (P2–P8)
**Overall status:** G1 granted; synthetic-only workspace implemented
**Production authorization:** none
**G2 hosted preview:** NOT GRANTED
**G3 production-import allowlist:** empty

Start with:

1. [`current-state-and-gap-analysis.md`](current-state-and-gap-analysis.md)
2. [`experimental-sandbox-design.md`](experimental-sandbox-design.md)
3. [`experimental-sandbox-threat-model.md`](experimental-sandbox-threat-model.md)
4. [`experimental-sandbox-data-flow.md`](experimental-sandbox-data-flow.md)
5. [`decisions/G1-design-approval.md`](decisions/G1-design-approval.md)
6. [`runbook.md`](runbook.md)
7. [`evidence/evidence-manifest.json`](evidence/evidence-manifest.json)

The production baseline was captured at commit
`7737ef26f09fec858d23337885ca7d31e9ccbc64` with a clean worktree. TypeScript,
lint, 95 pure tests, and the production build passed. The Docker-backed suite
was not run because Docker was unavailable on the capture machine.

G1 was granted by Royian Chowdhury as Product Lead and Security/Privacy
Reviewer on 2026-07-31. The implementation is a separate
`apps/experiment-sandbox/` npm workspace with no production imports, database,
storage, credentials, hosted preview, or external destination. It has typed
synthetic configuration, loopback/lifecycle gates, server-owned fixtures and
identity, denied adapters and network transport, marked sample artifacts,
private/no-store headers, architecture scans, production invariance checks, and
isolated tests.

The checked-in evidence manifest is `BLOCKED` after candidate verification. The
latest implementation commit is
`0fc7c17deeac16cf99b7ae2780c6a833bd5e9cc7`; it adds server-owned queued-action
tickets bound to a persisted lifecycle epoch. SBX-17 is evidence integrity and
SBX-18 owns lifecycle races, including stale queued-action cancellation. Both
now have standalone red/green evidence. Final reviewer sign-offs and branch
protection are now recorded, but the remaining controls still lack the
complete red-run set and the repository-bound root database test evidence. See
[`evidence/final-report.md`](evidence/final-report.md).
This task does not authorize production deployment, production data, production
credentials, live integrations, hosted access, or any G3 import.
