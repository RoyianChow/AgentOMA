# Task 06 - Current State and Gap Analysis

**Reconciled:** 2026-08-20

**Observed HEAD:** `1ce2c9ace894f5c2a745f15fa901fe2fc6acc138`

**Status:** `SYNTHETIC_PROTOTYPE_MERGED / BLOCKED_FROM_RUNTIME_AND_PROMOTION`  
**Production authorization:** none

## What changed

PR #44 merged the Task 06 documentation, contracts, deterministic fixtures,
guard layer, server actions, synthetic UI routes, and tests into
`apps/experiment-sandbox/`. Earlier statements that no Task 06 route or code
exists are superseded by this file.

The implementation is a reviewable state/authorization simulator. It does not
create a real video visit, connect to a vendor, request camera/microphone
access, record, transcribe, invoke a model, contact a patient, or write to the
production application/database.

## Implemented synthetic surfaces

- `/virtual-care` scenario index.
- `/virtual-care/pharmacist` synthetic waiting-room queue.
- `/virtual-care/patient/[scenario]` and
  `/virtual-care/pharmacist/[scenario]` role-specific scenes.
- Strict contracts and deterministic authored-synthetic fixtures.
- Server-owned guard evaluation for join, interaction start, participant
  admission, pharmacist suitability, fallback approval, secure-message stub,
  assessment linking, and claim-action denial.
- Identity/location, consent, privacy, modality and cross-jurisdictional
  fail-closed states.
- Waiting-room, participant, disconnect, rejoin, telephone-fallback and
  contingency states.
- Safe scene projections that do not return raw fixture objects or message
  content to UI callers.
- Explicit invariant that technical/vendor events cannot complete a
  professional service or create claim effects.
- Documentation for standards mapping, threat model, vendor assessment,
  privacy/security/retention, incident response, accessibility, failure modes,
  secure messaging boundaries, and future production handoff.

## Verification at the merged candidate

`npm run sandbox:verify` passed again on 2026-08-20:

- sandbox TypeScript: PASS;
- sandbox ESLint: PASS;
- 40 test files / 606 non-Postgres tests: PASS; and
- Task 01 source-boundary verification: PASS.

The Task 06 test files cover fixtures, identity/consent/suitability, joining and
authorization, waiting room/participants, disconnect/contingency, secure
messaging stubs, assessment/claim separation, webhook/vendor denial, and
privacy/leakage checks.

Not verified in this pass:

- successful sandbox production build or live browser run;
- manual keyboard, screen-reader, zoom/reflow, mobile and low-bandwidth
  evidence;
- sandbox PostgreSQL tests (Task 06 currently uses no dedicated persistence);
- hosted preview; or
- any production integration.

The current sandbox lifecycle/Task 04 approval material is expired, and
`sandbox:build` fails closed without valid exact environment authority. The
current production-invariance check also fails on route shape. These are
blockers, not reasons to relax the controls.

## Remaining dependencies and approvals

| Dependency | Current status |
|---|---|
| Task 01 exact runnable sandbox authority | Expired/current candidate not fully evidenced |
| Task 05 patient identity/delegation | Not merged into the maintained checkout |
| Task 07 external notification boundary | Documentation only; no provider or delivery runtime |
| Vendor selection and Ontario Health verification | No vendor selected or approved |
| PIA / TRA | NOT VERIFIED |
| Professional virtual-care review | NOT VERIFIED |
| Privacy/security/operations/accessibility review | NOT VERIFIED |
| Task 11 exact-candidate review | NOT VERIFIED; first CI slice only |
| G2 hosted preview | Not requested |
| Production migration/deployment | Not authorized |

## Next authorized step

1. Obtain an exact, unexpired sandbox decision that expressly includes the
   Task 06 synthetic routes and tests.
2. Resolve the Task 01 production-invariance finding.
3. Run the sandbox build and browser-based accessibility/responsive plan under
   that decision.
4. Record independent privacy/security, accessibility, professional,
   operations and Task 11 review.
5. Keep production integration blocked until Task 05 identity, Task 07
   communications, vendor/PIA/TRA, and task-specific production approvals
   exist.

## Permanent prohibitions for this prototype

- no recording or transcription, regardless of consent;
- no AI meeting features or model calls;
- no real patient, pharmacist, account, PHI, contact endpoint or vendor;
- no production import, database, credential or external network effect;
- no technical, disconnect, timeout or vendor event completing a visit; and
- no claim, PIN, fee, billability or professional-finality effect.
