# AI-RX-06 retirement decision

**Task:** Task 10A — Rx Intake Experiment Isolation and Safety Remediation
**Decision:** `RETIRE`
**Status:** `GRANTED`
**Approved candidate:** `a31c1143feaab6763e33e34c50b14fa5ae91c8ca`
**Worktree at approval:** clean
**Approval timestamp:** `2026-08-20T07:02:40.466Z`
**Expiry timestamp:** `2026-09-03T07:02:40.466Z`

## Product Lead decision

**Approver:** Royian Chowdhury
**Role:** Product Lead

> I, Royian Chowdhury, acting as Product Lead, approve the following decision:
>
> AI-RX-06 disposition: RETIRE
> Approved candidate SHA: a31c1143feaab6763e33e34c50b14fa5ae91c8ca
> Approved scope: Remove the complete AI-RX-06 production route, navigation,
> runtime code, configuration, and associated production tests. Do not create
> a replacement.
> Approval timestamp: 2026-08-20T07:02:40.466Z
> Expiry timestamp: 2026-09-03T07:02:40.466Z
> Approver: Royian Chowdhury

## Authorized work

- Remove `/pharmacist/rx-intake` from the production route graph.
- Remove its production navigation entry, server action, UI, parser, authored
  fixture corpus, scorecard tool, feature-only environment variables, and
  associated tests.
- Update active project and Task 10 status documentation to `RETIRED`.
- Run the existing production and Task 01 boundary checks without changing the
  approved production-invariance baseline.

## Explicit exclusions

This decision does not authorize a replacement under
`apps/experiment-sandbox/`, a model or vendor, PHI or prescription uploads,
production inference, G2 hosted access, a G3 production import, database or
audit writes, external effects, or changes to clinical, billing, migration,
claim, retention, or audit logic.

The historical AI-RX-06 design record and worklog may remain as clearly marked
retirement history. They do not authorize restoration of the retired code.
