# Autonomous Pharmacy - Sprint Plan (2026-08-19)

**Observed candidate:** `87bdb1b99840f56a34046254065071c3d5a755c1`  
**Production authorization:** none  
**Purpose:** sequence bounded work after the 2026-08-19 merge batch. This file
is not an approval or release decision.

## Sprint objective

Re-establish trustworthy sandbox/release evidence after the merged Task 04,
Task 06, and Task 11 changes, then close the P0 release gates without widening
production scope.

## Ordered lanes

| Order | Lane | Required outcome | Hard boundary |
|---:|---|---|---|
| 1 | Task 01 | Explain and resolve `SBX_INVARIANCE_DENIED:routeShape`; renew exact sandbox scope and evidence | Do not weaken the verifier or regenerate the baseline from an unapproved current commit |
| 2 | Task 02 | New G1-D candidate, predecessor/restart proof, S27, independent Task 11 review, recovery, G1-L, live parity and G4 | No live `0018` or `db:push` |
| 3 | Task 11 | Finish security/policy/accessibility/evidence/aggregate-gate controls and verify branch protection | CI records evidence; it cannot grant approval |
| 4 | Task 04 | Complete signed v3 renewal, then finish only its selected synthetic scope | Merged `/book` code must remain fail-closed until authority is exact and unexpired |
| 5 | Task 06 | Renew sandbox authority and complete manual browser/accessibility, privacy/security and independent review evidence | No recording, transcription, vendor, real identity, PHI, or live visit |
| 6 | Task 10A | Record and execute the exact retire-or-rebuild disposition for AI-RX-06 | No expansion in the production tree |
| 7 | Task 03 / 05 | Reconcile existing unmerged branches before assigning duplicate implementation | No assumption that branch work is merged or approved |
| 8 | Task 07 | Complete Workstream J design and prepare a scoped review package | No provider, recipient, PHI delivery or runtime |
| 9 | Tasks 08, 09, 12-14 | Continue only the design/test-plan work their briefs allow | No external effect, participant study, automated regulatory interpretation or production enablement |

## Sprint exit criteria

- The Task 01 production-invariance result is PASS for an approved exact
  candidate, or remains honestly BLOCKED with an owned finding.
- Task 02 has an exact next operator step and no evidence-bound candidate is
  rerun.
- Task 04's v3 record is either explicitly granted with complete independent
  review and future dates, or remains blocked; no ambiguous middle state.
- Task 06's merged synthetic implementation has current test, browser,
  accessibility, privacy/security and approval status recorded separately.
- Task 11's implemented CI jobs and still-missing controls are distinguishable.
- `CURRENT-IMPLEMENTATION-STATUS.md`, `PROJECT_OVERVIEW.md`, `NEXT_STEPS.md`,
  `COMPLETED_WORK.md`, and task-specific status records agree.

## Evidence rules

- Bind evidence to the exact full SHA and environment.
- Use authored-synthetic data only for sandbox work.
- Real concurrency claims require fresh loopback PostgreSQL.
- Report unavailable, skipped, expired and failed checks as `NOT RUN`,
  `BLOCKED`, or `FAIL`; never reinterpret them as PASS.
- Preserve historical approvals and evidence, but remove superseded planning
  drafts that have no decision or provenance value.

## End-of-sprint update

Update the maintained current-status file first, then the project overview,
completed-work record, next steps, session handoff, and the affected task's
decision/evidence package. Task briefs remain contracts and are not status.
