# Autonomous pharmacy task execution index

**Program status:** detailed implementation contracts are drafted; most capabilities remain research or synthetic-only work.

**Production authorization:** none is granted by this folder.

This folder is the execution map for the autonomous-pharmacy program. Each
`TASK-*.md` file is an authoritative, long-form contract for one workstream:
scope, dependencies, stop conditions, evidence, and review gates. A task file
describes work to do; it does **not** prove that the work is implemented.

## Start an assigned task

1. Read [`../../../AGENTS.md`](../../../AGENTS.md). It is the only canonical
   agent instruction file.
2. Read [`../../PROJECT_OVERVIEW.md`](../../PROJECT_OVERVIEW.md) for the live
   system. Do not infer current implementation status from a future task.
3. Read this index, then read the assigned task **in full**. The briefs are
   intentionally detailed and later sections can narrow earlier language.
4. Read [`../../COMPLIANCE.md`](../../COMPLIANCE.md) only when the work touches
   a regulated boundary, and consult `docs/regulatory/` only when the task
   actually raises a source question.
5. Check [`../../OPEN_QUESTIONS.md`](../../OPEN_QUESTIONS.md),
   [`../../NEXT_STEPS.md`](../../NEXT_STEPS.md), and the assigned task's
   dependencies before changing code.
6. Write a bounded plan that names the files, database effects, tests, evidence,
   reviewers, and stop conditions. Obtain every approval required by the task.
7. Work in a separate branch and keep one task per pull request unless the lead
   explicitly approves a dependency-spanning change.

Proposed paths inside a task, such as `docs/task-08/...`, are deliverables to
create during that task. Their absence does not mean this index has a broken
link. Do not create empty placeholders before the corresponding work begins.

## Current program gate

Task 01 establishes the isolated synthetic runtime. Task 11 establishes the
quality, security, evidence, and promotion control plane. They are parallel
foundations, not substitutes for one another:

```text
Task 01: runnable synthetic boundary ─┐
                                     ├─> task-specific prototype and evidence
Task 11: review/release controls ─────┘                │
                                                       └─> explicit promotion review
```

- Task 01 repository discovery may start, but implementation is approval-gated.
- Task 11 documentation and control design may proceed before Task 01; runnable
  synthetic checks use the Task 01 environment once it exists.
- Task 02 may perform bounded inspection, export work, and the authorized
  test-only predecessor-harness implementation. Running that harness still
  requires a new exact-candidate G1-D; live writes remain separately G1-L-gated.
- Tasks 03–10 may perform the discovery, design, contracts, and other work each
  brief explicitly permits. Runnable synthetic prototypes require Task 01.
- No task may connect an experiment to production merely because its tests pass.
  Promotion requires its own task-specific approvals and Task 11 evidence.

## Task matrix

| Task | Owner and outcome | Work allowed now | Key dependencies and promotion gate |
|---|---|---|---|
| [`01 — Sandbox enforcement`](TASK-01-sandbox-enforcement.md) | Platform/security; create the isolated synthetic execution boundary | [G1 granted; local implementation and tests](../../task-01/README.md); CI evidence still pending | Bootstrap task. Must establish a separate workspace/build with no production imports, data, secrets, accounts, or integrations. G2/G3 remain unapproved. |
| [`02 — P0 production readiness`](TASK-02-p0-production-readiness.md) | Senior backend/database; close assessment completion, evidence, export, and deployment gaps | Inspection and bounded export work; no unapproved migration execution or live writes | Reusable synthetic evidence should run under Task 01. Production promotion requires Task 11 review and all explicit P0 approvals. |
| [`03 — Command centre`](TASK-03-command-centre-dashboard.md) | Frontend/product; prototype an accountable pharmacist work surface | Repository discovery and design | Runnable prototype needs Task 01. Production data needs Task 02. Task 11 reviews the test plan and evidence. |
| [`04 — Booking and waitlist`](TASK-04-booking-and-waitlist.md) | Full-stack; synthetic scheduling, capacity, waitlist, and cancellation workflow | Design and synthetic implementation only within Task 01 | Production use depends on Task 02 readiness, Task 05 identity/delegation, Task 07 communications, and Task 11. |
| [`05 — Patient portal`](TASK-05-patient-portal.md) | Identity/full-stack; synthetic patient identity, delegated access, and read-only records | Threat modelling, design, and Task-01-contained prototype | Production requires approved identity proofing, finalized Task 02 retrieval, Task 04 delegation boundaries, Task 07 communications, privacy/security review, and Task 11. |
| [`06 — Virtual care`](TASK-06-virtual-care.md) | Virtual-care integration; synthetic pharmacist-led visit workflow | Standards assessment, contracts, threat model, and Task-01-contained prototype | Production requires Task 02 assessment integration, Task 05 identity, Task 07 communication boundary, vendor/PIA/TRA approvals, and Task 11. |
| [`07 — Messaging and reminders`](TASK-07-messaging-and-reminders.md) ([status](../../task-07/README.md)) | Backend/communications; consented communication contracts and synthetic delivery states | Workstreams A–C complete; consent/contact/policy design only until Task 07 scope + Task 11 Checkpoint 1 | No real recipient, PHI, or live provider. Depends on Task 01 and producing workflows; production requires identity, consent/contact policy, vendor, privacy/security/professional/accessibility/legal/operations, incident, and Task 11 approval. |
| [`08 — Fulfilment and delivery`](TASK-08-fulfilment-and-delivery.md) | Pharmacy operations; synthetic request, fulfilment, pickup, and delivery orchestration | Contracts, state machines, and synthetic tests only | No medication, payment, payer, courier, claim, or dispensing effect. Depends on Tasks 01, 03, 05, 07, 09, and 11 as specified in the brief. |
| [`09 — Interoperability`](TASK-09-interoperability.md) | Integration/platform; fail-closed interfaces and synthetic conformance | Discovery, standards analysis, schemas, and synthetic conformance | Production routes, including `/api/fhir`, remain disabled. Live integration requires supplied specifications, authentication, privacy/security review, and Task 11. |
| [`10 — Bounded AI`](TASK-10-bounded-ai.md) | Applied AI; synthetic evaluation of pharmacist-reviewed assistance | Research and synthetic evaluation only | No PHI, production inference, user-visible clinical recommendation, or autonomous effect. Requires Task 01 and Task 11; producing workflows remain authoritative. |
| [`11 — Quality, security, release`](TASK-11-quality-security-release.md) | QA/security; continuous controls, evidence, and release review | Documentation/control design now; runnable controls under Task 01 | Reviews plans and promotion evidence for Tasks 02–10. It records approvals but cannot grant or self-approve them. |

## Dependency rules

- A downstream task may define an interface before its upstream dependency is
  implemented, but it must use synthetic fixtures or a fail-closed stub.
- Do not combine schemas across tasks by assumption. Shared schema ownership,
  migration ordering, and the responsible task must be agreed before editing.
- A task may depend on an approval, standard, vendor contract, specification, or
  report that is not in the repository. Missing authority is a stop condition,
  not permission to invent an answer.
- Several briefs mention a deep-research report that is not currently checked
  into the repository. Treat the task brief as the current work contract and
  request the reviewed report if a decision materially depends on it.
- The briefs use **AgentRx** while the live repository and maintained product
  docs use **AgentOMA**. Until the product lead records a rename decision,
  interpret AgentRx as the autonomous-program label only. Do not rename the
  production app, routes, packages, or environment variables.

## Evidence and handoff

Each task defines its own deliverables and acceptance evidence. At minimum, a
handoff should state:

- what was inspected, changed, and deliberately left unchanged;
- approvals received and unresolved decisions;
- exact migration/runtime/external effects, including proof that blocked paths
  remained blocked;
- commands run and results, with skipped checks explained;
- synthetic fixtures used and confirmation that no production data was used;
- screenshots or accessibility evidence when the task requires UI review;
- security/privacy/failure-path evidence required by the task;
- next owner, next executable step, and any stop condition still active.

Update maintained status docs only with verified facts. Put implemented
capabilities in [`../../COMPLETED_WORK.md`](../../COMPLETED_WORK.md), current
operators' actions in [`../../SESSION_HANDOFF.md`](../../SESSION_HANDOFF.md),
ordered remaining work in [`../../NEXT_STEPS.md`](../../NEXT_STEPS.md), and
human decisions in [`../../OPEN_QUESTIONS.md`](../../OPEN_QUESTIONS.md).

## Change control

- Edit a task brief when its scope, authority, dependency, or acceptance
  contract changes; record the version/date inside that task.
- Edit this index when task status, ordering, ownership, or cross-task
  dependencies change.
- Edit [`../../AUTONOMOUS_PHARMACY_ROADMAP.md`](../../AUTONOMOUS_PHARMACY_ROADMAP.md)
  when the product sequence or autonomy boundary changes.
- Edit [`../../EXPERIMENTAL_SANDBOX.md`](../../EXPERIMENTAL_SANDBOX.md) when the
  shared experiment boundary changes.
- Never turn a task completion checkbox into production authorization. Record
  promotion as a separate, named, reviewed decision with Task 11 evidence.
