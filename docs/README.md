# Documentation index

This is the map for every maintained Markdown instruction, decision record,
runbook, status page, and historical note in the repository. Use current
documents for implementation decisions; archived prompts and worklogs are
provenance only.

## Start here

| Document | Authority and purpose |
|---|---|
| [`../README.md`](../README.md) | Short project entry point, setup commands, and quality gates. |
| [`README.md`](README.md) | This complete documentation inventory. |
| [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) | Current architecture, routes, data model, security boundaries, and migration state. Read first for repository orientation. |
| [`COMPLETED_WORK.md`](COMPLETED_WORK.md) | Capabilities implemented and verified in the current tree. |
| [`NEXT_STEPS.md`](NEXT_STEPS.md) | Prioritized production blockers and remaining engineering work. |
| [`SESSION_HANDOFF.md`](SESSION_HANDOFF.md) | Current operational checkpoint, live database evidence, and next operator actions. |
| [`CODEBASE_COMMENTARY.md`](CODEBASE_COMMENTARY.md) | High-value trust-boundary commentary and maintenance map; current task status remains in the status file below. |
| [`tasks/autonomous-pharmacy/README.md`](tasks/autonomous-pharmacy/README.md) | Execution index for the autonomous-pharmacy task contracts, including current gates and dependencies. |
| [`tasks/autonomous-pharmacy/CURRENT-IMPLEMENTATION-STATUS.md`](tasks/autonomous-pharmacy/CURRENT-IMPLEMENTATION-STATUS.md) | Verified comparison of Tasks 01–14 with the current repository. |
| [`tasks/autonomous-pharmacy/NEXT-SPRINT-PLAN-2026-08-10.md`](tasks/autonomous-pharmacy/NEXT-SPRINT-PLAN-2026-08-10.md) | Current work sequencing and exit criteria; grants no implementation authority. |

## Compliance, decisions, and operations

| Document | Authority and purpose |
|---|---|
| [`COMPLIANCE.md`](COMPLIANCE.md) | Traceability from implemented controls and gaps to the Executive Officer Notice. |
| [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) | Unresolved clinical, billing, and policy decisions that agents must not answer. |
| [`CLINICAL_APPROVAL.md`](CLINICAL_APPROVAL.md) | Hash-bound P0-A approval record and clinical change-control boundary. |
| [`SELF_CHECK.md`](SELF_CHECK.md) | Approved zero-identifying-data boundary and production posture for public `/check`. |
| [`PRODUCT_PRINCIPLES.md`](PRODUCT_PRINCIPLES.md) | Product rationale behind refusal-first billing, privacy, and record-integrity choices. |
| [`EXPERIMENTAL_SANDBOX.md`](EXPERIMENTAL_SANDBOX.md) | Strictly isolated synthetic experimentation policy; it permits workflow simulation, not a legal or production bypass. |
| [`AUTONOMOUS_PHARMACY_ROADMAP.md`](AUTONOMOUS_PHARMACY_ROADMAP.md) | Staged roadmap for online access, dashboard automation, virtual care, fulfilment, interoperability, and bounded AI with pharmacist gates. |
| [`RESTORE_DRILL.md`](RESTORE_DRILL.md) | Canadian-region backup/restore evidence procedure; this is a runbook, not proof that the first drill has occurred. |
| [`regulatory/`](regulatory/) | Binding Ministry source PDF. Read only when a compliance question requires it. |

## Developer execution plans

| Folder | Purpose |
|---|---|
| [`tasks/autonomous-pharmacy/README.md`](tasks/autonomous-pharmacy/README.md) | Start here for the role-based task contracts, current allowed work, dependency order, evidence expectations, and promotion boundaries. The task files describe proposed work, not implemented status. |
| [`task-01/README.md`](task-01/README.md) | Task 01 G1 approval, local synthetic sandbox implementation, controls, runbook, and completed evidence manifest. |
| [`p0/task-02/current-state-and-gap-analysis.md`](p0/task-02/current-state-and-gap-analysis.md) | Task 02's bounded P0 readiness review, scoped defect remediation, gated database status, and safe next actions. |
| [`p0/task-02/evidence-index.md`](p0/task-02/evidence-index.md) | Task 02 control-by-control evidence map, exact executed commands, and explicit statuses for gated deliverables. |
| [`p0/task-02/production-handoff.md`](p0/task-02/production-handoff.md) | Task 02's non-promotable stopping point and ordered requirements for safe resumption. |
| [`p0/task-02/final-report.md`](p0/task-02/final-report.md) | Task 02 status: from-zero Docker suite PASS; predecessor/restart, live, recovery, Task 11, and promotion remain blocked. |
| [`p0/task-02/lead-remediation-authorization-2026-08-02.md`](p0/task-02/lead-remediation-authorization-2026-08-02.md) | Royian Chowdhury's narrow authorization for atomic assessment audit persistence and removal of the orientation override. |
| [`tasks/autonomous-pharmacy/TASK-12-operational-resilience.md`](tasks/autonomous-pharmacy/TASK-12-operational-resilience.md) | Design contract for downtime, payload-free observability, recovery, and resilience evidence. |
| [`tasks/autonomous-pharmacy/TASK-13-human-factors-pilot-readiness.md`](tasks/autonomous-pharmacy/TASK-13-human-factors-pilot-readiness.md) | Design contract for human factors, training, synthetic study evidence, and controlled-pilot gates. |
| [`tasks/autonomous-pharmacy/TASK-14-regulatory-change-governance.md`](tasks/autonomous-pharmacy/TASK-14-regulatory-change-governance.md) | Design contract for source provenance, regulatory impact, effective dates, approvals, and rollback. |

## Agent instructions

[`../AGENTS.md`](../AGENTS.md) is the only canonical agent-instruction file.
[`../CLAUDE.md`](../CLAUDE.md), [`../GEMINI.md`](../GEMINI.md),
[`../.cursor/rules/oma.mdc`](../.cursor/rules/oma.mdc), and
[`../.github/copilot-instructions.md`](../.github/copilot-instructions.md), and
[`../soul.md`](../soul.md) are pointer files and must not duplicate repository
rules.

## Historical material

| Document | Historical scope |
|---|---|
| [`archive/README.md`](archive/README.md) | Archive warning and pointer back to current documentation. |
| [`archive/initial-implementation-prompt.md`](archive/initial-implementation-prompt.md) | Superseded initial migration/feature brief; not current architecture or compliance guidance. |
| [`archive/oma-pilot-plan.md`](archive/oma-pilot-plan.md) | Superseded pilot plan retained for decision provenance. |
| [`worklogs/audit-clickable-task-4.md`](worklogs/audit-clickable-task-4.md) | Historical implementation evidence for the audit-record navigation slice. |
| [`worklogs/p1-7-usability-a11y-375px.md`](worklogs/p1-7-usability-a11y-375px.md) | 2026-07-28 375px usability evidence for `/check`, `/assessment`, and `/sign-in`, including open findings and untested authenticated routes. |
| [`worklogs/worklog-2026-08-10.md`](worklogs/worklog-2026-08-10.md) | High-level summary of the August 10 synthetic booking, policy, privacy, and documentation work. |

Never copy the PIN table or clinical rules into documentation. Billing values
belong in `src/config/ailment-reference.ts` and the seeded reference tables;
the approved clinical rules remain in `src/config/triage.ts` and are bound to
[`CLINICAL_APPROVAL.md`](CLINICAL_APPROVAL.md). Any content change requires a
new pharmacist review.
