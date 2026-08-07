import { rxExtractionSchema } from "../contract";
import { RX_CORPUS } from "../corpus";
import { extractPrescription } from "../parser";

import { buildScorecard, evaluateCase, type Scorecard } from "./metrics";

/**
 * Runs AI-RX-06 over the whole synthetic corpus and scores it.
 *
 * Pure and offline, matching §6 of the vendored
 * `docs/task-10/source-specs/EXTRACTION_ACCURACY_EVAL.md`, which requires
 * evaluation to run against a fixed dataset with no live dependency. Same
 * corpus in, same scorecard out — so a change in the numbers means a change in
 * the parser, never a flaky run.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS SCORE DOES AND DOES NOT MEAN
 *
 * The corpus ground truth and the parser were written together, in the same
 * change, by the same author. A high score here therefore measures INTERNAL
 * CONSISTENCY and protects against REGRESSION. It says nothing about how the
 * parser would handle a document it has never seen.
 *
 * Task 10 requires a corpus split and a held-out evaluation, and §6 of the
 * source spec requires an evaluation dataset the system was not built against.
 * Neither exists. Do not cite this scorecard as evidence that extraction works
 * — cite it as evidence that extraction has not changed.
 */

export function runEvaluation(): Scorecard {
  const cases = RX_CORPUS.map((fixture) => {
    const extraction = extractPrescription(fixture);
    const schemaValid = rxExtractionSchema.safeParse(extraction).success;
    return evaluateCase(fixture, extraction, schemaValid);
  });

  return buildScorecard(cases);
}

/** Human-readable metric block, for the CLI and evaluation records. */
export function formatScorecard(scorecard: Scorecard): string {
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

  return [
    `AI-RX-06 scorecard — ${scorecard.caseCount} cases, ${scorecard.fieldCount} scored fields`,
    "",
    `  exact match accuracy          ${pct(scorecard.exactMatchAccuracy)}   (§9.1, over present fields)`,
    `  normalized accuracy           ${pct(scorecard.normalizedAccuracy)}   (§9.2)`,
    `  critical field accuracy       ${pct(scorecard.criticalFieldAccuracy)}   (§9.3)`,
    `  missing field detection       ${pct(scorecard.missingFieldDetectionRate)}   (§9.4)`,
    `  hallucination rate            ${pct(scorecard.hallucinationRate)}   (§9.5)`,
    `  critical hallucination rate   ${pct(scorecard.criticalHallucinationRate)}   (HALLUCINATION §11.2)`,
    `  unsafe inference rate         ${pct(scorecard.unsafeInferenceRate)}   (§10)`,
    `  human review enforcement      ${pct(scorecard.humanReviewEnforcement)}   (§9.6)`,
    `  warning coverage              ${pct(scorecard.warningCoverage)}   (HALLUCINATION §11.4)`,
    `  schema violation rate         ${pct(scorecard.schemaViolationRate)}   (§10)`,
    `  source groundedness           ${pct(scorecard.groundednessRate)}`,
    "",
    "  Character/Word Error Rate (§9.7, §9.8): not applicable — no OCR stage.",
  ].join("\n");
}
