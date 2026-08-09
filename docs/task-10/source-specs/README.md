# Vendored source specifications — AI-RX-06

These three files are **third-party source material, not repository policy.**
They are the specifications that
[`AI-RX-06`](../AI-RX-06-synthetic-prescription-extraction.md) was implemented
against, vendored here so its citations resolve and remain verifiable.

Nothing in this directory is authoritative for AgentOMA. Where it disagrees with
`AGENTS.md`, the Executive Officer Notice, or `docs/regulatory/*.pdf`, **those
win** — see the *Jurisdictional warning* below.

## Origin

Copied byte-identical (SHA-256 verified) on **2026-08-07** from the
`agentrx-ai-pharmacist-agents-main` drop, which has since been deleted. That
drop contained 193 files — 192 markdown and one `.gitignore`, **zero lines of
code**. Of those, 53 were empty and roughly 61 were truncated mid-word.

Only these three were kept, because only these three are cited by the
implementation:

| File | What it supplies | Cited by |
|---|---|---|
| `EXTRACTION_ACCURACY_EVAL.md` | §8 field labels, §9 metrics, §11 pass/fail gates | `metrics.ts`, `gates.ts`, `run.ts`, `evaluation.test.ts` |
| `HALLUCINATION_EVAL.md` | §11 hallucination, warning-coverage, and review-enforcement metrics | `metrics.ts` |
| `PRESCRIPTION_SCHEMA.md` | The extraction output contract | `contract.ts` |

## Integrity

| File | State |
|---|---|
| `EXTRACTION_ACCURACY_EVAL.md` | **Complete** — runs through §26 Change Log |
| `PRESCRIPTION_SCHEMA.md` | **Complete** — ends with its ownership block |
| `HALLUCINATION_EVAL.md` | **Truncated** mid-word inside §21 (an evaluation-directory-layout appendix) |

The truncation in `HALLUCINATION_EVAL.md` does not affect anything the
implementation relies on: every cited section (§11.1–§11.4) is present and
intact. It is recorded here so nobody later mistakes the cut-off for a missing
requirement — or assumes the rest of the document was ever written.

## Jurisdictional warning

**This material has no Ontario grounding.** Across the full 193-file drop:

```
PHIPA:                    0 files      HIPAA:  17 files
Ontario:                  0 files
minor ailments:           0 files
ODB / HNS / PIN codes:    0 files
```

These three files were kept because measurement methodology is
jurisdiction-neutral — a hallucination rate means the same thing in Ontario as in
Ohio. The rest of the drop was discarded largely *because* of the table above:
importing US-law compliance guidance into a PHIPA codebase is the exact
jurisdiction confusion
[`TASK-10-bounded-ai.md`](../../tasks/autonomous-pharmacy/TASK-10-bounded-ai.md)
warns against.

Do not extend this directory. If more source material is ever needed, justify
each file the same way: cited by the implementation, and jurisdiction-neutral.

## Why vendored rather than referenced

The original folder was untracked and not gitignored, so it would have vanished
on the next `git clean` and taken the provenance with it. Task 10 requires
thresholds to be traceable to a frozen source — a reviewer must be able to
confirm that `criticalFieldAccuracy >= 0.85` was **copied from §11.1**, not
invented to match what the parser happens to score. That check is only possible
if the source is version-controlled alongside the code.
