# Task 06 - Synthetic Prototype Report

**Reconciled:** 2026-08-19  
**Merged candidate:** `87bdb1b99840f56a34046254065071c3d5a755c1`  
**Implementation status:** `MERGED_SYNTHETIC`  
**Runtime/promotion status:** `BLOCKED`  
**Production authorization:** none

## Result summary

The repository now contains the Task 06 deterministic virtual-care review
prototype inside the isolated experiment workspace. It provides pharmacist and
patient scenario views, server-owned authorization/guard decisions, waiting
room and participant controls, consent/location/suitability states,
disconnect/fallback behavior, secure-message stubs, and assessment/claim
separation.

It deliberately has no media transport, vendor SDK, camera/microphone access,
recording, transcription, model, external messaging, real identity, PHI,
production database, or claim effect.

## Automated evidence

| Check | Result |
|---|---|
| Sandbox TypeScript | PASS |
| Sandbox ESLint | PASS |
| Sandbox tests | PASS - 40 files / 606 tests across the workspace |
| Sandbox source boundary | PASS |
| Task 06 identity/consent/suitability tests | PASS |
| Task 06 join/participant tests | PASS |
| Task 06 disconnect/fallback tests | PASS |
| Task 06 secure-message boundary tests | PASS |
| Task 06 assessment/claim separation tests | PASS |
| Task 06 privacy/leakage tests | PASS |
| Task 06 webhook/vendor denial tests | PASS |
| Sandbox production build | BLOCKED by fail-closed environment/lifecycle state |
| Production invariance | FAIL - `SBX_INVARIANCE_DENIED:routeShape` |
| Manual browser/accessibility evidence | NOT RUN |

The aggregate 606-test count includes Task 01, Task 04, and Task 06 sandbox
tests; it is not represented as 606 Task 06 tests.

## Documentation package

The merged package includes standards mapping, build-versus-integrate and
vendor scorecards, trust boundaries/data flows, threat model, field-level
contracts, identity/location/consent/suitability controls, waiting-room and
participant design, device/fallback design, failure state machine, secure
messaging boundary, assessment/claim integration boundary, privacy/security/
retention plan, incident response, accessibility plan, and production handoff.

Those documents are design/review evidence, not legal, clinical, privacy,
vendor, procurement, or production approval.

## Open blockers

- Current exact sandbox authority is expired/incomplete.
- Production-invariance route-shape failure is unresolved.
- Manual browser, screen-reader, zoom/reflow, mobile and low-bandwidth evidence
  is missing.
- Task 05 patient identity/delegation is unavailable in the maintained tree.
- Task 07 has no approved provider or real delivery runtime.
- PIA, TRA, vendor, professional, privacy/security, accessibility, operations,
  and independent Task 11 approvals are missing.
- No G2 hosted preview or production integration is authorized.

## Final determination

The synthetic code and non-Postgres test slice are merged and green. Task 06
is **not complete for runtime, hosted preview, production integration, or
patient care**. Renew exact sandbox authority, resolve Task 01 invariance, run
manual evidence, and obtain the named independent reviews before changing this
status.
