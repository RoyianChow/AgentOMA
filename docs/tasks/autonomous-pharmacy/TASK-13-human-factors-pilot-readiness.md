# Task 13 — Human Factors, Training, and Controlled Pilot Readiness

## Sprint checkpoint — 2026-08-20

**Repository state:** `NOT RUN`; no cross-capability human-factors safety case,
role-based training package, synthetic simulation programme, or controlled-pilot
readiness record exists.
**Sprint slice:** discovery, role/task analysis, hazard register, competency
framework, synthetic scenario catalogue, and pilot-gate design only.
**Exit:** no real patient, PHI, production account, live workflow, clinical
content change, billing change, training claim, or pilot launch. Runnable
studies require an exact Task 13 approval and Task 11 Checkpoint 1. See
[`CURRENT-IMPLEMENTATION-STATUS.md`](CURRENT-IMPLEMENTATION-STATUS.md).

## Role

Human-factors/product-safety lead working with practising Ontario pharmacists,
pharmacy technicians, accessibility specialists, Security/Privacy, Quality/Test,
Operations/SRE, product leadership, and Task 11 reviewers.

## Priority

P1 before any controlled pilot. Documentation and synthetic planning may begin;
participant studies and runnable prototypes are approval-gated.

## Status and authority

**Status:** discovery and design only.
**Production authorization:** none.
**Pilot authorization:** none.

This task does not create a pharmacist credential, replace the OCP Mandatory
Orientation for Minor Ailments Module, approve professional competence, or
authorize patient care. It cannot grant release, privacy, legal, clinical,
security, accessibility, or operational approval.

## Why this task exists

Automated tests can prove schemas, permissions, constraints, and deterministic
rules. They cannot prove that a pharmacist notices a red-flag exit, understands
that a claim draft is not submitted to HNS, distinguishes “completed then
referred” from “red flag—no claim,” recovers safely after interruption, or can
operate the interface one-handed on a small screen.

Task 13 owns the evidence that the human workflow is understandable and safe.
Task 11 validates the evidence format; it does not replace pharmacist,
accessibility, privacy, or product review.

## Objective

Create a defensible, synthetic-only human-factors and pilot-readiness programme
that:

- identifies use-related hazards across the pharmacist, technician, intern,
  student, administrator, patient, caregiver, and operator journeys;
- defines role-specific training and competency evidence without inventing
  professional scope or certification;
- tests critical distinctions, warnings, handoffs, and error recovery using
  authored-synthetic scenarios;
- measures whether users can complete bounded tasks without unsafe shortcuts,
  hidden state, ambiguous status, or accidental clinical/billing finality;
- includes accessibility, mobile, interruption, fatigue, language, and downtime
  conditions;
- defines a controlled-pilot gate, support model, observation plan, stop rules,
  and rollback criteria for future approval;
- produces exact-candidate evidence consumable by Task 11.

## Dependencies and boundaries

| Dependency | Task 13 may evaluate | Task 13 must not own or change |
|---|---|---|
| Task 01 | Synthetic environment, fixtures, artifact controls | Sandbox approvals or production imports |
| Task 02 | Approved P0 assessment workflow and evidence | Triage, claim derivation, migrations, auth, audit, LTC, or orientation policy |
| Task 03 | Operational command-centre interaction | Clinical ranking or urgency |
| Tasks 04–10 | Approved synthetic user journeys | Domain policy, external effects, or substantive approvals |
| Task 11 | Evidence schema and release gates | Approval granting or self-review |
| Task 12 | Downtime, recovery, and operator-control contracts | Production operations or restore authority |

Testing a workflow does not authorize changing its protected logic. If a study
reveals a clinical, billing, migration, auth, audit, retention, LTC, or
professional-scope defect, document the evidence and stop that workstream for
the responsible task and approver.

## Non-negotiable invariants

1. **Synthetic only.** No real patient, PHI, production-derived case, real
   prescription, real health number, production account, live session, or live
   integration is used in planning, studies, screenshots, recordings, or
   evidence.
2. **No recording by default.** Screen/audio/video recording, transcription,
   eye tracking, biometric measurement, or session replay requires a separate
   explicit participant/privacy decision. It is not authorized by this brief.
3. **Professional authority remains human.** Training and usability results do
   not authorize prescribing, dispensing, referral, assessment completion,
   billing, claim submission, or patient care.
4. **Clinical and billing sources remain authoritative.** Task 13 never writes,
   rewrites, summarizes from memory, or “improves” triage content, PINs, fees,
   claim maximums, intervention codes, or `deriveClaimDraft`.
5. **Critical distinctions stay visible.** Red-flag exit means zero claim;
   completed-then-referred is a separate billable outcome; the 365-day count is
   advisory; a claim draft is for hand-entry and is not an HNS submission.
6. **No unsafe speed target.** Completion time, click count, throughput, or
   conversion cannot override accuracy, comprehension, accessibility, privacy,
   or professional review.
7. **No coercive UX.** Acceptance, consent, AI draft acceptance, billable
   completion, remote modality, communication opt-in, and external handoff are
   never preselected or made easier than refusal, correction, or escalation.
8. **Role separation.** A participant may only exercise the synthetic role and
   action set defined for the scenario. Training never becomes authorization.
9. **Evidence is payload-free.** Reports use synthetic scenario IDs, task IDs,
   aggregate findings, safe reason codes, and approved quotations—not patient
   data, credentials, tokens, or participant-sensitive notes.
10. **Unknown policy blocks the scenario.** Missing consent wording, scope,
    response-time promise, escalation rule, clinical source, or approval is
    recorded as `BLOCKED`, not filled in by the researcher or agent.

## Workstream A — Role, task, and environment analysis

Map each authorized role to:

- intended tasks and prohibited tasks;
- source of authority and required session state;
- information displayed and information deliberately hidden;
- interruption points and safe resume behavior;
- high-consequence errors and recovery paths;
- device, viewport, input, language, accessibility, and environmental needs;
- dependency and downtime states;
- training prerequisites and unresolved policy.

Deliver:

- `docs/task-13/current-state-and-gap-analysis.md`;
- `docs/task-13/role-task-and-environment-map.md`;
- a role/action/authority matrix.

## Workstream B — Human-factors hazard and safety case

Create a versioned hazard register covering at least:

- wrong person, pharmacy, role, assessment, or booking context;
- stale or hidden state;
- interruption and accidental continuation;
- confusing red-flag/referral outcomes;
- mistaken payment or claim-finality assumptions;
- unnoticed orientation, modality, eligibility, consent, prescription, or
  follow-up gates;
- inaccessible warnings or status conveyed only by colour;
- small-screen mis-taps and destructive adjacent actions;
- duplicate submission, retry, timeout, and uncertain outcome;
- overtrust in AI, automation, vendor, or integration status;
- unsafe downtime workarounds;
- privacy exposure through screens, printouts, downloads, URLs, or support.

For each hazard, record initiating condition, affected role, possible harm,
existing control, evidence, residual risk, required action, owner, reviewer,
expiry/change trigger, and blocking stage. Do not invent a risk-acceptance
threshold.

Deliver:

- `docs/task-13/human-factors-hazard-register.md`;
- `docs/task-13/safety-case-claim-evidence-map.md`.

## Workstream C — Training and competency framework

Define separate learning objectives and evidence for:

- pharmacy administrators;
- pharmacists;
- interns and students under supervision;
- technicians;
- synthetic patient/caregiver participants where applicable;
- operators supporting Task 12 controls.

The framework must distinguish:

- product navigation;
- privacy/security responsibilities;
- professional-scope prerequisites;
- OCP orientation attestation;
- scenario practice;
- competency observation;
- remediation and re-evaluation;
- release-specific change training.

Do not create clinical education, dosing guidance, treatment algorithms, or
claims-training content from memory. Any regulated or clinical module must cite
its approved source and receive the responsible pharmacist review.

Deliver:

- `docs/task-13/role-based-training-framework.md`;
- competency observation rubrics;
- retraining/change-trigger proposal.

## Workstream D — Synthetic scenario catalogue

Create authored-synthetic scenarios that exercise:

- successful and blocked authentication/session paths;
- intake handoff with zero PHI in public intake;
- red-flag exit with zero claim rows;
- completed assessment with prescription;
- completed assessment without prescription;
- completed assessment followed by referral;
- eligibility, self/family, existing-prescription, claim-history, modality,
  consent, orientation, and follow-up gates;
- claim-draft review and hand-entry boundary;
- correction through supersession rather than mutation;
- follow-up due, reached, not reached, and escalation paths;
- booking/waitlist, portal, virtual-care, messaging, fulfilment, interoperability,
  and bounded-AI scenarios only when their task approvals exist;
- dependency degradation, downtime, kill switch, recovery, and safe resume.

Scenarios contain no real clinical narrative or invented red-flag content.
They import or reference approved fixtures and source data rather than copying
clinical or billing rules into the catalogue.

Deliver:

- `docs/task-13/synthetic-scenario-catalogue.md`;
- scenario/version/expected-outcome manifest;
- forbidden-data and provenance checks.

## Workstream E — Usability and accessibility study design

Define, without running an unapproved study:

- participant roles, independence, inclusion/exclusion, and conflicts;
- informed-participation and privacy materials;
- synthetic environment and fixed scenario versions;
- 375px mobile, desktop, keyboard-only, screen-reader, zoom/reflow, reduced-
  motion, long-label, language, one-handed, interruption, and low-connectivity
  conditions;
- task-success and comprehension measures;
- critical-error, near-miss, recovery, and assistance measures;
- observation and note-minimization rules;
- safe stop criteria;
- finding severity/disposition process owned by named reviewers;
- retest requirements after material changes.

Do not select participant compensation, recording, retention, sample size,
pass threshold, or demographic collection without explicit decisions.

Deliver:

- `docs/task-13/usability-accessibility-study-plan.md`;
- finding and remediation template;
- independent-review checklist.

## Workstream F — Controlled-pilot governance

Design a future pilot gate that records:

- exact candidate and environment;
- pilot purpose and excluded capabilities;
- accountable owner, backup, pharmacist lead, privacy, security,
  accessibility, quality, operations, support, and Task 11 reviewers;
- approved users, pharmacy, dates, hours, and cohort;
- training and competency prerequisites;
- PHI/data classification and minimum-necessary access;
- support and escalation paths;
- kill switches and manual fallback;
- monitoring and payload-free evidence;
- stop, rollback, suspension, and exit criteria;
- incident and complaint handling;
- post-pilot review and data disposition.

This workstream creates a template only. It cannot authorize a pilot.

Deliver:

- `docs/task-13/controlled-pilot-approval-template.md`;
- `docs/task-13/pilot-readiness-checklist.md`;
- decision and reviewer matrix.

## Workstream G — Support, escalation, and learning loop

Define how a future pilot would handle:

- product questions versus professional questions;
- access/session problems;
- suspected privacy/security events;
- incorrect, stale, duplicate, or partial records;
- downtime and recovery;
- accessibility barriers;
- clinical/billing questions routed to the responsible approved owner;
- finding intake, triage by non-clinical severity only, remediation, retest,
  closure, and change control.

Do not invent response-time promises, emergency procedures, legal reporting,
professional escalation, or on-call staffing. Record each as a named decision.

Deliver:

- `docs/task-13/support-and-escalation-contract.md`;
- safe issue taxonomy;
- change/retraining trigger matrix.

## Workstream H — Task 11 evidence and independent review

Register Task 13 with Task 11 and define evidence for:

- exact scenario and candidate versions;
- participant/reviewer roles without unnecessary personal data;
- completed training prerequisites;
- accessibility conditions exercised;
- critical errors, near misses, assistance, recovery, and unresolved findings;
- protected-surface defects handed back to the owning task;
- approval separation and expiry;
- pilot status using only `PASS`, `FAIL`, `BLOCKED`, and `NOT RUN`.

Task 11 validates completeness and integrity. It does not grant pharmacist,
privacy, accessibility, legal, security, product, or pilot approval.

## Required tests and evidence

### Documentation and contract checks

- every scenario references an approved source or synthetic contract;
- no copied PIN, fee, maximum, intervention code, or red-flag content;
- no real or production-derived identifiers or narratives;
- no ambiguous use of “eligible,” “submitted,” “paid,” “urgent,” “complete,”
  “prescription,” “order,” or “ready” outside its approved domain meaning;
- every unresolved policy has an owner and blocking state;
- every approval binds an exact candidate, scope, environment, and expiry.

### Synthetic workflow evidence after approval

- critical outcome distinctions are understood and completed correctly;
- server-side authorization still denies wrong role, scope, state, or session;
- sensitive transient form state clears on all required exits;
- no PHI/credential/token appears in browser persistence, URLs, logs, analytics,
  caches, screenshots, recordings, or evidence;
- mobile, keyboard, screen-reader, zoom, reflow, reduced-motion, interruption,
  and downtime conditions are exercised;
- failed, blocked, skipped, filtered, or unavailable checks are never PASS;
- remediation changes trigger the required retest and retraining review.

## Mandatory stop conditions

Stop and record `BLOCKED` if:

- a study, participant interaction, recording, pilot, or runtime change lacks
  exact written approval;
- the candidate, scope, environment, owner, reviewer, expiry, scenario version,
  or evidence plan is missing or contradictory;
- a real patient, PHI, production account, live record, production-derived case,
  or real external integration could be used;
- a scenario requires invented clinical, billing, consent, retention,
  escalation, response-time, training, or professional-scope content;
- a protected-surface defect would need an in-task fix;
- participant privacy, accessibility, conflicts, consent, compensation,
  recording, or retention is unresolved;
- an independent reviewer is missing;
- the interface could imply payment, claim submission, clinical approval,
  professional completion, or autonomous authority incorrectly;
- a required check is skipped, filtered, flaky, or unavailable.

## Deliverables

1. Current-state/gap and role/task/environment analysis.
2. Human-factors hazard register and safety case.
3. Role-based training and competency framework.
4. Synthetic scenario catalogue and provenance manifest.
5. Usability/accessibility study plan.
6. Controlled-pilot approval template and readiness checklist.
7. Support/escalation and learning-loop contract.
8. Task 11 registration and evidence profile.
9. Final report with unresolved findings and next owner.

## Definition of done

- The design package is internally consistent and references approved sources.
- No clinical, billing, professional, legal, privacy, accessibility, retention,
  or operational policy was invented.
- No participant study or pilot begins without exact approval.
- Any approved synthetic study uses only authored-synthetic data and accounts.
- Critical workflow distinctions, accessibility, interruption, recovery, and
  privacy boundaries have evidence against the exact candidate.
- Every critical finding is fixed and retested or remains release-blocking.
- Training completion is never treated as authorization or professional
  competence by itself.
- Independent pharmacist, accessibility, Security/Privacy, Quality/Test,
  Operations/SRE, product, and Task 11 reviews are recorded where applicable.
- Production and patient care remain not authorized.

## Final report format

The final report must state:

- exact candidate, scenario package, environment, and worktree state;
- approval scope, owners, reviewers, timestamps, expiry, and decision records;
- participant roles and conditions without unnecessary personal information;
- commands/checks, results, counts, evidence paths, and artifact hashes;
- critical errors, near misses, assistance, recovery, and unresolved findings;
- accessibility and interruption conditions tested;
- protected defects handed to another task;
- confirmation that no real patient, PHI, production account, live workflow,
  external effect, or unapproved recording was used;
- next owner and next authorized action;
- final status using only `PASS`, `FAIL`, `BLOCKED`, and `NOT RUN`.

Task 13 completion is not pilot or production authorization. Any pilot requires
a separate named, exact, expiring approval and Task 11 evidence review.
