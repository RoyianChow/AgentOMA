# AI-RX-06 — synthetic prescription extraction

**Status:** **RETIRED** under Task 10A Slice A · **not approved for any real document**
**Former route:** `/pharmacist/rx-intake` · **Current runtime:** removed
**Added:** 2026-08-07

---

## Retirement notice

The production route, modules, synthetic fixtures and tests, evaluator tooling,
navigation, and feature-specific configuration described below have been
removed. No sandbox replacement was created. The remainder of this document is
preserved as a historical account of the retired candidate and must not be read
as an active product surface, current command reference, or implementation
authority. See
[`TASK-10A-rx-intake-sandbox-remediation.md`](../tasks/autonomous-pharmacy/TASK-10A-rx-intake-sandbox-remediation.md).

## What this is

A deterministic parser that reads a fixed corpus of **invented** prescription
documents and produces a structured, field-level draft for a pharmacist to
accept, edit, or reject. It exists to evaluate whether structured extraction is
worth pursuing at all, and to give reviewers something concrete to react to.

## Provenance — read this before assuming there was a parser to port

This was **not** ported from `AgentRx-master`. That drop contained no OCR
implementation. Its only two occurrences of "OCR" were a placeholder card in
`app/(protected)/dashboard/prescriptions/[prescriptionId]/page.tsx` —

> Prescription document
> *Connect this card to your upload/OCR workflow later.*

— and the bare string `"OCR"` in a marketing feature list in `constants/app.ts`.
It had no OCR dependency in `package.json`, no upload handling, no
`features/prescriptions` module, and no extraction route.

> **That folder no longer exists.** It was deleted on 2026-08-07 after the survey
> below. Its one Ontario-grounded artifact was preserved at
> [`docs/research/`](../research/); nothing else in it was used here. The two
> snippets above are quoted in full so this claim stays checkable.

The companion `agentrx-ai-pharmacist-agents-main` drop was specification prose.
Its three OCR-specific files — `tools/OCR_TOOL.md`,
`skills/prescription-ocr-extraction/SKILL.md`, and
`workflows/PRESCRIPTION_INTAKE_WORKFLOW.md` — were **empty (0 bytes)**. What did
have content was `schemas/PRESCRIPTION_SCHEMA.md` and the
`agents/prescription-intake-agent/` document set, which describe a desired output
contract without implementing it.

### Survey of the `agentrx-ai-pharmacist-agents-main` drop (2026-08-07)

> **That folder no longer exists.** It was assessed in full, three files were
> vendored into [`source-specs/`](source-specs/), and the remaining 190 were
> deleted on 2026-08-07. The survey below is retained as the record of what was
> there and why almost none of it was kept.

193 files: **192 markdown + 1 `.gitignore`. Zero lines of code.**

| | Count |
|---|---|
| Empty (0 bytes) | **53** — including every file in `tools/` (11) and `workflows/` (9), and every top-level policy doc (`RULES.md`, `SAFETY.md`, `SECURITY.md`, `PRIVACY.md`, `COMPLIANCE.md`, `AGENT.md`, …) |
| Truncated mid-word | **~61** — `SYSTEM_ARCHITECTURE.md` ends `- API`; `DATA_ACCESS_POLICY.md` ends `revoca` |
| Complete and coherent | `schemas/` (10) and `evaluations/` (9) |

Jurisdictional fit, by grep across the whole corpus:

```
PHIPA:                    0 files      HIPAA:  17 files
Ontario:                  0 files
minor ailments:           0 files
ODB / HNS / PIN codes:    0 files
```

**Only `evaluations/` was integrated, and this is why.** The corpus has no
Ontario grounding, and 17 files build compliance guidance on US federal law.
Importing it wholesale would break the `AGENTS.md` maintenance rule that it is
"the only agent doc with content" — a rule that exists because "a stale copy
still describing a long-dead column or config would walk an agent straight back
into a billing bug we already killed" — and would seed HIPAA-based rules into a
PHIPA codebase, the exact jurisdiction confusion
[`TASK-10-bounded-ai.md`](../tasks/autonomous-pharmacy/TASK-10-bounded-ai.md)
warns against.

`evaluations/` is the exception because measurement methodology is
jurisdiction-neutral: a hallucination rate means the same thing in Ontario as in
Ohio. `schemas/` is complete but mostly describes entities AgentOMA does not
have (`medication`, `prescriber`, `review_task`, `agent_run`); the two with real
counterparts, `patient` and `audit_event`, sit behind the `AGENTS.md` sign-off
list.

### Output contract

Adapted from `schemas/PRESCRIPTION_SCHEMA.md`. Two deliberate departures:

- The `patient_id` / `prescriber_id` / `medication_id` record links are dropped.
  This capability resolves nothing against the database, so it cannot populate
  them honestly.
- The status enum is narrowed to the four states it can actually reach. The
  omitted states (`received`, `processing`, `cancelled`, `expired`, `completed`)
  all imply a persisted lifecycle, and this capability persists nothing.

## Why it is not an AI feature

[`TASK-10-bounded-ai.md`](../tasks/autonomous-pharmacy/TASK-10-bounded-ai.md)
states that a no-AI result is valid where deterministic parsing is safer and
equally useful. That is the case here, so there is **no model, no vendor, no
inference call, and no network access** anywhere in this capability. Prescription
documents are structured and label-driven; regex over labelled lines handles them
without introducing a vendor, a PHI-processing agreement, or a hallucination
surface.

This leaves a clean seam. If a model is ever chartered for this, it slots in
behind the same contract, the same gate, and the same human-disposition
requirement.

## Relationship to the chartered candidates

AI-RX-06 is **not** one of the five candidates in the Task 10 boundary matrix
(AI-DQ-01, AI-FU-02, AI-AS-03, AI-AQ-04, AI-OB-05). It is closest in spirit to
AI-DQ-01 — detecting missing or contradictory fields in a structured record — but
it operates on a document rather than a structured record, so it is not covered
by that candidate's scope.

Before this capability may process a real prescription it needs, at minimum:

- [ ] An intended-use and prohibited-use statement
- [ ] A risk classification, including a documented medical-device review
- [ ] An immutable experiment charter with frozen thresholds and corpus split
- [ ] A held-out evaluation with a practising pharmacist as evaluator
- [ ] Privacy, security, and clinical-safety reviewer sign-off
- [ ] A decision on document storage (Supabase Storage is planned, not built)
- [ ] Product-lead approval to move it off the synthetic corpus

None of these exist today.

## Invariants

Enforced by `src/lib/rx-intake/__tests__/boundary.test.ts`, not by convention:

| Invariant | Enforcement |
|---|---|
| No PHI — input is a fixture id, never a document | No upload control, no `FormData`, no free-text field; the action refuses any id not in the corpus |
| No model, no network | No `fetch`, no vendor SDK import |
| No persistence | No `@/lib/db` import, no `insert`/`update`/`delete`, no audit writer |
| No billing | No `deriveClaimDraft`, no `@/lib/claims`, no PIN/fee literal |
| No autonomous disposition | `status` can only ever be `requires_human_review`; `requiresHumanReview` and `synthetic` are pinned as `z.literal(true)` |
| Flag state stays server-side | No `"use client"` file may import the gate or `@/env` |
| Corpus stays synthetic | Phone numbers restricted to reserved `555-01xx`; CPSO numbers to the unissued `99xxxx` range |

The `z.literal(true)` pinning is load-bearing: a `z.boolean()` there would let a
future edit ship an auto-accept path that still type-checks.

## Document-integrity indicators

Implements §6 of the prescription-intake agent's `SAFETY.md`, recovered from the
`agentrx-ai-pharmacist-agents-main` drop. That section lists eight signals a
document may have been altered, and sets the posture:

> The agent may flag concerns. The agent must not declare fraud as fact.

Seven are implemented in `src/lib/rx-intake/integrity.ts`:

| Indicator | Detected by |
|---|---|
| Missing signatures | no signature line |
| Inconsistent dates | two distinct written dates |
| Altered quantities | figures and written words disagree — `Qty: 90 (thirty)` |
| Altered refill counts | same check on repeats |
| Suspicious formatting | digits split by internal spacing; mixed date formats |
| Mismatched prescriber information | signature surname ≠ printed prescriber surname |
| Missing clinic identifiers | no letterhead and no contact number |

**"Unusual controlled substance requests" is deliberately not implemented.**
Judging a request unusual requires reasoning about dose, indication, and patient
context — clinical interpretation, which Task 10 prohibits. Controlled substances
already force mandatory review through `classifyType`, so the safety outcome is
unchanged.

Two properties are enforced by test rather than convention:

- **Indicators only escalate.** None can clear a document, lower a confidence, or
  relax a control. An empty list is not an all-clear, and every draft still
  requires human disposition regardless.
- **No accusatory language.** A test greps every emitted string for
  *fraud / forged / tampered / altered / criminal / illegal* and fails on a hit.
  Each indicator states what was observed and asks for confirmation; a parser is
  in no position to accuse anyone, and every one of these signals has an ordinary
  explanation as well as a concerning one.

Adding the `altered-006` fixture exposed a real parser bug: `Qty: 90 (thirty)`
did not parse at all, because the quantity pattern anchored to end-of-line and
the parenthesised word form broke the match. An anti-alteration device printed on
the form was causing the field it protects to read as absent. Fixed — the numeral
is captured and the word form is compared against it.

## Parser behaviour

Three rules define what makes this parser safe, each with a test:

1. **Never normalise.** `5OO mg` stays `5OO mg`. Silently correcting a strength
   to `500 mg` replaces "I could not read this" with a confident wrong answer.
2. **Never infer.** A missing quantity is reported missing, even when the
   directions imply one.
3. **Never resolve a contradiction.** Two written dates are both reported with
   the conflict flagged. Deciding which is true is a human judgement, and Task 10
   prohibits delegating it.

The percentage shown in the UI is a **derived parse signal** — how cleanly a
pattern matched its line — not a model probability and not a measure of clinical
correctness. It gates nothing.

## Configuration

All default-off. Precedence is strictest-first: kill switch, then expiry, then flag.

| Variable | Purpose |
|---|---|
| `AI_KILL_SWITCH` | Global. Disables every bounded capability regardless of its own flag or expiry. |
| `RX_INTAKE_SYNTHETIC_ENABLED` | Per-capability flag for AI-RX-06. |
| `RX_INTAKE_EXPIRES_ON` | Hard expiry, `YYYY-MM-DD`. Compared against the Toronto civil date, so the capability stays live through the end of the stated day. |

The page checks the gate for UX; the server action re-checks it independently,
**before** the auth guard — a switched-off capability should not confirm its own
existence, and the kill switch should not depend on a session lookup succeeding.

## Corpus

Five fixtures in `src/lib/rx-intake/corpus.ts`, each exercising one failure mode:

| Id | Case |
|---|---|
| `clean-001` | Baseline — every required field legible |
| `noisy-002` | Character-level OCR noise (`5OO mg`, `6l3-555-0177`, `Metfonnin`) |
| `missing-003` | Absent quantity and absent signature |
| `controlled-004` | Narcotic — forces the mandatory-review path |
| `contradictory-005` | Two conflicting written dates |

Every name, CPSO number, phone number, and date is invented. **Nothing in this
file may ever be replaced with a transcription of a real document** — that would
put PHI in the repository, in git history, and in every developer's checkout at
once.

## Evaluation harness

```bash
npm run eval:rx-intake     # prints the scorecard
npm run test:pure          # enforces the gate
```

Implemented in `src/lib/rx-intake/evaluation/` against the vendored specs in
[`source-specs/`](source-specs/) — `EXTRACTION_ACCURACY_EVAL.md` (§8 field
labels, §9 metrics, §11 gates) and `HALLUCINATION_EVAL.md` (§11). Those two are
jurisdiction-neutral measurement methodology, which is why they port cleanly
where the rest of that drop did not (see *Provenance* below).

Current scorecard — 5 cases, 60 scored fields:

| Metric | Value | Source |
|---|---|---|
| Exact match accuracy | 100% | §9.1 |
| Normalized accuracy | 100% | §9.2 |
| Critical field accuracy | 100% | §9.3 |
| Missing field detection | 100% | §9.4 |
| Hallucination rate | 0% | §9.5 |
| Critical hallucination rate | 0% | HALLUCINATION §11.2 |
| Unsafe inference rate | 0% | §10 |
| Human review enforcement | 100% | §9.6 |
| Warning coverage | 100% | HALLUCINATION §11.4 |
| Schema violation rate | 0% | §10 |
| Source groundedness | 100% | — |

**What this score does not mean.** The corpus ground truth and the parser were
written together, in the same change, by the same author. These numbers measure
*internal consistency* and protect against *regression*. They say nothing about
how the parser would handle a document it has never seen. A held-out corpus
authored independently — required by Task 10 and by `EXTRACTION_ACCURACY_EVAL.md`
§6 — does not exist. Do not cite this scorecard as evidence that extraction
works; cite it as evidence that extraction has not changed.

### Deviations from the source spec

Three, each deliberate:

- **CER/WER (§9.7, §9.8) are not implemented.** They measure a raw OCR layer
  against reference text. This capability has no OCR stage — the fixtures *are*
  the text — so reporting a CER of 0 would claim a result for a stage that
  doesn't exist.
- **Exact match accuracy is measured over fields that have a ground-truth
  value**, not all evaluated fields. A correctly-absent field can never be an
  `exact_match`, so the spec's literal denominator reports 96.7% for a run in
  which every field was handled correctly. Correct absences are already measured
  by §9.4.
- **The §11.3 production gate is not encoded.** It requires completed compliance
  and security reviews and a rollback plan — none of which a test can assert.

### Gate tiers

The **MVP gate (§11.1)** is enforced by the test suite and fails the build on
regression. The **staging gate (§11.2)** is computed and printed for information
only; nothing is staged, because AI-RX-06 has no charter.

Thresholds are copied from the spec, not fitted to what this parser scores. If
one moves, it moves in a commit that says why — never to make a failing run pass.

## Tests

```bash
npm run test:pure
```

91 database-free tests across `parser.test.ts`, `gate.test.ts`,
`boundary.test.ts`, and `evaluation.test.ts`. These are correctly database-free:
the capability derives no claim, so the real-Postgres requirement in `AGENTS.md`
for money rules does not apply — and the boundary test asserts it cannot start
deriving one.

`evaluation.test.ts` includes negative tests that feed the scorer deliberately
broken output (an invented medication name, a dropped field, a draft that skips
review) and require it to object. Without those, a scorer that always returned
"pass" would satisfy every other assertion in the file.
