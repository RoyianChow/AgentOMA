# Task 10 — bounded AI assistance

**Owner profile:** applied-AI developer with pharmacist evaluator

**Priority:** P2 research

**Status:** synthetic evaluation only

## Goal

Evaluate AI for low-risk drafting and operational assistance while ensuring
that no model makes a final clinical, prescribing, dispensing, billing, or
referral decision.

## First candidate experiments

Implement separately, in this order:

1. Detect missing or contradictory fields in a synthetic structured record.
2. Draft a plain-language follow-up summary from an approved synthetic care
   plan.
3. Summarize a completed synthetic assessment for pharmacist review.
4. Classify synthetic administrative inbox messages into non-clinical queues.
5. Identify aggregate operational bottlenecks without patient-level output.

Each candidate has its own dataset, evaluation, approval, and kill switch. Do
not combine them into a general agent.

## Scope

- Create a synthetic, versioned evaluation corpus with expected outputs and
  unsafe counterexamples.
- Build a provider-agnostic adapter with model/version/prompt provenance,
  timeout, refusal, and schema validation.
- Show model output only as an untrusted draft with source facts and uncertainty.
- Require explicit pharmacist accept/edit/reject and capture a reason without
  placing PHI in model telemetry.
- Measure omissions, unsupported statements, unsafe additions, bias,
  accessibility/readability, latency, and failure recovery.
- Add shadow-mode evaluation before any user-visible production recommendation.
- Add model/vendor inventory, prompt change control, incident response, and
  global/per-capability kill switches.

## Prohibited behaviour

- Sending PHI to any model during the experimental phase.
- Training or fine-tuning on production records.
- Generating or selecting a PIN, fee, maximum, intervention code, prescription,
  diagnosis, red-flag result, referral urgency, or claim outcome.
- Writing directly to immutable clinical, claim, follow-up, or audit records.
- Autonomous messages, external actions, or silent fallback to free text.

## Dependencies

- Tasks 01 and 11.
- Pharmacist-authored evaluation criteria and review capacity.
- Before any PHI pilot: approved purpose, PIA/TRA, vendor/contract and Canadian
  residency evidence, minimum-data analysis, retention rules, and incident plan.

## Deliverables

1. Candidate-specific evaluation datasets and scorecards.
2. Model adapter and structured-output validation.
3. Pharmacist review UI with accept/edit/reject provenance.
4. Shadow-mode and rollback design.
5. Model card covering intended use, exclusions, failure modes, monitoring, and
   expiry/review date.

## Acceptance criteria

- Synthetic-only tests prove no production data source is reachable.
- Unsupported output is rejected rather than displayed or persisted.
- Every displayed draft identifies model/prompt version and source facts.
- Rejection, timeout, and provider outage leave the normal pharmacist workflow
  usable.
- No output can cause an external or immutable-record effect without a separate
  authorized human action.
- Safety thresholds and unacceptable-failure criteria are set before testing,
  not after results are seen.

## Stop conditions

Stop if meaningful evaluation requires real PHI, if the model cannot provide a
bounded structured output, if reviewers cannot identify source support, or if a
candidate begins to substitute for pharmacist judgment.
