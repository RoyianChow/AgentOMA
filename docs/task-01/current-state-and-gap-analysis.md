# Task 01 current-state and gap analysis

**Reconciled:** 2026-08-26
**Observed main:** `02b0a5cf08a56714a2d175556557a49f8813b77f`
**Status:** `TECHNICAL_CONTROLS_PASS / PROMOTION_REVIEW_BLOCKED`
**Production authorization:** none
**G2 hosted preview:** not requested
**G3 production-import allowlist:** empty

## Authority and evidence boundary

The recorded Task 01 manifest and final report are immutable historical
evidence for their exact candidate only. They validate 17 applicable controls;
SBX-14 is `NOT_APPLICABLE` because G2 was not requested and no hosted origin
exists. That PASS does not transfer to later source, dependency, configuration,
build, or baseline changes.

Authoritative historical records:

- [`evidence/evidence-manifest.json`](evidence/evidence-manifest.json);
- [`evidence/final-report.md`](evidence/final-report.md);
- [`decisions/G1-design-approval.md`](decisions/G1-design-approval.md); and
- [`runbook.md`](runbook.md).

## Current implementation

`apps/experiment-sandbox/` is a separate npm workspace with synthetic-only
configuration, lifecycle and loopback gates, server-owned fixtures and
identity, denied external transports, marked artifacts, private/no-store
headers, production-source boundary scans, stale-action cancellation, evidence
validation, and production-invariance verification.

The current sandbox contains partial Task 04 booking and Task 06 virtual-care
prototypes. Their presence does not grant runnable or production authority.
Task 04's renewal remains ungranted, Task 06 lacks renewed authority and
production prerequisites, and neither may access production data, credentials,
accounts, services, or external destinations.

## Changed candidates after the historical PASS

| Change | Candidate / merge | Technical result | Promotion status |
|---|---|---|---|
| Build-phase `NODE_ENV` and production-runtime-script invariance remediation | `2358570a...` / PR #56 merge `e1c79730...` | Sandbox build, invariance, and SBX-04/SBX-13 red/green evidence PASS | BLOCKED - no independent exact-candidate Task 11 review recorded |
| Next.js 16.3.3 and dependency/invariance amendment | `72b3ed6218bd2a06b03a99a7eac0d2753fe774b9` / PR #64 merge `02b0a5cf...` | Quality, database, sandbox, audit, dependency, GitGuardian, SonarCloud, and Vercel checks reported PASS | BLOCKED - no independent exact-candidate review recorded |

The framework amendment derived its production invariance from the original
pre-sandbox baseline rather than accepting the changed candidate as its own
baseline. Current route shape, required server files, production runtime
scripts, and production/sandbox import separation pass the verifier.

## Verification at the observed main

| Check | Result |
|---|---|
| Production typecheck and lint | PASS |
| Production pure tests | PASS - 20 files / 180 tests |
| Production build | PASS - Next.js 16.3.3 |
| Sandbox typecheck/lint/tests/boundary | PASS - 40 files / 614 tests |
| Sandbox build | PASS |
| Evidence validator | PASS |
| Production invariance | PASS |
| Dependency security and both npm audit modes | PASS - zero current findings |
| Root from-zero real-PostgreSQL suite | PASS - 27 files / 269 tests through `0018` |
| Sandbox Task 04 PostgreSQL suite | NOT RUN - task-specific authority remains expired/ungranted |

Technical verification does not override lifecycle expiry, task-specific
authority, independent review, or production gates.

The local documentation audit also exercised the environment boundary: an
inherited `OPENAI_API_KEY` was rejected with a safe reason and no value output.
The sandbox build passed after removing that variable only from the child
process and supplying the approved synthetic build variables.

## Remaining Task 01 work

1. Obtain independent Task 11 review bound to each changed candidate and its
   affected-control evidence.
2. Keep G2 `NOT REQUESTED` and SBX-14 `NOT_APPLICABLE` unless a separately
   approved hosted preview is requested.
3. Keep G3 empty unless a specific production import receives a separate,
   exact approval and evidence package.
4. Renew Task 04/06 runtime authority independently before running those
   capabilities or promoting their evidence.
5. Preserve fail-closed lifecycle, network, credential, artifact, log, URL,
   storage, stale-action, and production-invariance controls.
6. Re-run affected red/green evidence whenever an applicable source,
   dependency, configuration, build, evidence schema, or baseline changes.

## Non-authority statement

This implementation and its green checks do not authorize production
deployment, production data or credentials, Supabase access, hosted sandbox
access, external integrations, clinical or billing behavior, G2, or G3. Task
11 records independent evidence; it cannot self-approve a Task 01 promotion.
