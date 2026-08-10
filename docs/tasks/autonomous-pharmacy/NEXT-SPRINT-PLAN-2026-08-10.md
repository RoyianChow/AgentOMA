# Autonomous Pharmacy — Next Sprint Plan

**Planning checkpoint:** 2026-08-10
**Repository baseline:** `58fee60035988300909a158f3c91501faca89fa7` on
`task7`; worktree clean at capture
**Production authorization:** none
**Purpose:** coordinate the next sprint; this document is not an approval or
release decision

## Sprint objective

Close or accurately preserve the program's blocking gates before widening the
prototype surface. The sprint should produce independently reviewable evidence
for the P0 assessment baseline and release control plane, renew the exact Task
04 synthetic scope before any more booking work, and advance only bounded
documentation for capabilities that remain unapproved.

## Work lanes

| Order | Task | Current state | Next-sprint outcome | Hard boundary |
|---:|---|---|---|---|
| 1 | Task 02 | `BLOCKED` | Freeze an exact candidate; complete the approval-gated predecessor/restart proof, S27 decision, Task 11 review, and recovery package | No live migration or write without G1-L; never use `db:push` |
| 2 | Task 11 | `BLOCKED` for merge/promotion | Reconcile the external branch, land the reviewed CI/control-plane slice, and record independent quality/security review | Task 11 records approvals; it cannot grant or self-approve them |
| 3 | Task 04 | `BLOCKED_MISSING_RENEWAL_APPROVAL` | Commit the v3 renewal record with hashes, future dates, exact scope, and independent reviewers; only then resume the approved synthetic slice | The waitlist policy decision alone authorizes no code, migration, Docker run, evidence promotion, or merge |
| 4 | Task 01 | `PASS` for its recorded local candidate | Preserve the reconciled status and production-invariance/evidence checks when sandbox code changes | G2 remains not requested; G3 allowlist remains empty |
| 5 | Task 07 | Documentation through Workstream I | Complete Workstream J privacy/security/audit/retention design and prepare a scoped approval package | No recipient, provider, PHI, delivery, or runtime implementation |
| 6 | Task 03 | `NOT RUN` as a dedicated capability | Produce the current-state analysis, operational-axis contract, server-only projection contract, and synthetic test plan | No clinical ranking, triage, billability, or queue records sent to the client |
| 7 | Task 06 | External work reported; not verified in this checkout | Reconcile the external branch and decision/evidence records; avoid duplicate implementation | No recording, transcription, meeting AI, vendor connection, or real visit |
| 8 | Task 05 | `NOT RUN` | Discovery and identity-domain threat model only if capacity remains | Patient identity never reuses pharmacist auth |
| 9 | Task 08 | `NOT RUN` | Contracts and state-machine review only if upstream decisions are available | A request is never an order; payment/courier events never authorize release |
| 10 | Task 09 | `BLOCKED` from enablement | Keep `/api/fhir` disabled while drafting persisted-snapshot and consumer-governance contracts | No endpoint, consumer, credential, or external acknowledgement is authorized |
| 11 | Task 10 | Partial synthetic experiment; expansion blocked | Decide whether AI-RX-06 is retired or rebuilt inside the sandbox; freeze evaluation/approval requirements | No PHI/model call/tools/DB authority; no production-route expansion |
| 12 | Task 12 | `NOT RUN` | Inventory dependencies and design operational state, payload-free observability, downtime, backup/restore, and synthetic recovery evidence | No production access, live backup, monitoring vendor, alert delivery, or runtime without exact approval |
| 13 | Task 13 | `NOT RUN` | Build the role/task map, human-factors hazard register, training framework, synthetic scenario catalogue, and pilot-gate design | No participant study, recording, real patient, PHI, clinical/billing change, or pilot without exact approval |
| 14 | Task 14 | `NOT RUN` | Design the authoritative source register, change-intake and impact contracts, effective-date transition, approval matrix, and Task 11 evidence profile | No protected clinical/billing/migration change, automated interpretation, or production activation |

Tasks 04, 06, and 11 have been reported as assigned to other developers.
Before touching their files, inspect their branch/PR and decision records to
avoid parallel conflicting implementations.

## Task exit criteria for this sprint

### Task 01

- Task 01 README agrees with the PASS evidence manifest and final report.
- Any changed sandbox candidate reruns boundary, artifact, evidence, and
  production-invariance verification.
- SBX-14 remains `NOT_APPLICABLE` only while G2 is not requested and no hosted
  origin exists.

### Task 02

- Candidate, migration hash, migration-chain digest, environment, and approval
  are exact and unexpired.
- The predecessor/restart harness either passes with sanitized evidence or
  remains `BLOCKED` with the denial recorded.
- S27 export/reconstruction semantics and the independent Task 11 review are
  recorded before any live gate is requested.

### Task 03

- A dedicated status/gap record exists.
- Work-item axes remain operational and orthogonal; no clinical or billing
  inference is introduced.
- The proposed client model contains only the minimum display data and no
  source queue/work-item object.

### Task 04

- The repository contains the completed v3 renewal record bound to its exact
  candidate and configuration hashes.
- Independent Security/Privacy, Operations/SRE, Quality/Test, and Task 11
  reviews are present before status becomes `APPROVED_TO_IMPLEMENT_SYNTHETIC`.
- If renewal is granted, implementation remains local, synthetic, loopback
  only, bounded, and free of external delivery.

### Task 07

- Workstream J defines data classification, safe audit metadata, retention
  proposals, incident boundaries, deletion/hold conflicts, and approval owners
  without selecting unapproved policy values.
- A later runnable slice remains blocked on a Task 07 scope approval and Task
  11 Checkpoint 1.

### Tasks 05, 06, 08, 09, 10, 12, 13, and 14

- Discovery artifacts distinguish facts, proposals, approvals, and blockers.
- No production route, credential, data, integration, vendor, recipient, or
  autonomous effect is enabled.
- Missing identity, consent, retention, professional, vendor, or release
  authority remains `BLOCKED`, not guessed.
- Task 12 records RTO/RPO, incident severity, response-time, backup-retention,
  and escalation values only after named owners approve them.
- Task 13 keeps training separate from authorization and records study design,
  participant privacy, recording, pass thresholds, and pilot scope only after
  named owners and independent reviewers approve them.
- Task 14 keeps source text, human interpretation, implementation, evidence,
  and release authorization separate; unknown or conflicting authority remains
  blocked and no protected source is changed in the design slice.

### Task 11

- The exact implementation branch and PR are reconciled with this checkout.
- Required CI job identifiers, capability/control records, evidence schema,
  aggregate gate, and branch-protection expectations are documented and tested.
- Independent reviewers sign the exact candidate; green automation is not
  treated as substantive approval.

## Sprint-wide rules

- One task per branch/PR unless the lead explicitly approves a dependency-spanning change.
- Use only authored-synthetic data in `apps/experiment-sandbox/`.
- No production credentials, data, Supabase access, hosted preview, real
  recipient, or external integration.
- Do not modify triage, reference billing data, migrations, claim derivation,
  audit enforcement, LTC billing, or pharmacist auth/orientation without the
  exact protected-surface approval.
- Every database or concurrency claim uses fresh loopback PostgreSQL, not a
  mock or developer database.
- Every handoff records exact SHA, commands, results, skipped checks, evidence
  paths, reviewers, next owner, and active stop conditions.

## End-of-sprint documentation

Update, from verified evidence only:

1. [`CURRENT-IMPLEMENTATION-STATUS.md`](CURRENT-IMPLEMENTATION-STATUS.md);
2. [`../../PROJECT_OVERVIEW.md`](../../PROJECT_OVERVIEW.md);
3. [`../../COMPLETED_WORK.md`](../../COMPLETED_WORK.md);
4. [`../../NEXT_STEPS.md`](../../NEXT_STEPS.md);
5. task-specific decision, evidence, and handoff records.

Task briefs remain the binding contracts. This sprint plan only chooses the
next bounded slice and never turns implementation or a green test into
production authorization.
