import {
  RX_FIELD_CONFIDENCE_THRESHOLD,
  RX_REQUIRED_FIELDS,
  type RxExtraction,
  type RxFieldKey,
} from "../contract";
import type { RxCorpusFixture } from "../corpus";

/**
 * Field-level scoring for AI-RX-06, implementing the metric definitions in
 * `docs/task-10/source-specs/EXTRACTION_ACCURACY_EVAL.md` (§8 field labels,
 * §9 metrics) and `HALLUCINATION_EVAL.md` (§11). Those specs are vendored
 * third-party source material, not repository policy — see the README beside
 * them for their origin and jurisdictional limits.
 *
 * Two adaptations, both because the source spec assumes a system we did not
 * build:
 *
 *   - Field names are mapped from the spec's dotted paths to this capability's
 *     flat keys (`medication.name` → `medicationName`). The mapping is in
 *     CRITICAL_FIELDS below and is the spec's §9.3 list verbatim.
 *   - Character and Word Error Rate (§9.7, §9.8) are NOT implemented. They
 *     measure a raw OCR layer against reference text, and this capability has
 *     no OCR step — the fixtures *are* the text. Reporting a CER of 0 would be
 *     claiming a result for a stage that does not exist.
 */

/** §8.2 field scoring labels, verbatim. */
export type FieldLabel =
  | "exact_match"
  | "normalized_match"
  | "partial_match"
  | "incorrect"
  | "missing_correctly"
  | "missing_incorrectly"
  | "hallucinated"
  | "unsafe_inference";

/** §9.3 critical fields, mapped to this capability's keys. */
export const CRITICAL_FIELDS: readonly RxFieldKey[] = [
  "medicationName",
  "medicationStrength",
  "quantity",
  "directions",
  "patientName",
  "patientDob",
  "prescriberName",
  "writtenDate",
];

export type FieldScore = {
  key: RxFieldKey;
  label: FieldLabel;
  expected: string | null;
  actual: string | null;
  critical: boolean;
  /** False when the extracted value cannot be found in the source document. */
  grounded: boolean;
};

/**
 * §9.2 normalisation — "500 mg" and "500mg" are the same reading.
 *
 * Deliberately narrow: case, whitespace, and separator punctuation only. It
 * does NOT repair OCR confusion, because `5OO mg` and `500 mg` are genuinely
 * different readings and collapsing them would let the parser score full marks
 * for a misread strength. That distinction is the whole point of the metric.
 */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s\-().,/]/g, "");
}

/**
 * §9.5 / HALLUCINATION_EVAL §11.1 groundedness. A value is grounded when it
 * actually appears in the source document, on the line the parser cited.
 *
 * Checking the cited line rather than the whole document is the stricter test:
 * a value that appears somewhere else in the document but not where the parser
 * says it came from is a provenance failure, and provenance is what makes the
 * draft checkable by a reviewer.
 */
function isGrounded(fixture: RxCorpusFixture, value: string, sourceLine: number | null): boolean {
  if (sourceLine === null) return false;
  const lines = fixture.text.split("\n");
  const line = lines[sourceLine - 1];
  if (!line) return false;
  // Compare normalised, so a rejoined phone ("416-555-0142" assembled from
  // three capture groups) still matches the line it came from.
  return normalize(line).includes(normalize(value));
}

export function scoreField(
  fixture: RxCorpusFixture,
  extraction: RxExtraction,
  key: RxFieldKey,
): FieldScore {
  const field = extraction.fields.find((candidate) => candidate.key === key)!;
  const expected = fixture.expected[key] ?? null;
  const actual = field.value;
  const critical = CRITICAL_FIELDS.includes(key);
  const grounded = actual === null ? true : isGrounded(fixture, actual, field.sourceLine);

  const base = { key, expected, actual, critical, grounded };

  // Ground truth says the field is absent from the document.
  if (expected === null) {
    if (actual === null) return { ...base, label: "missing_correctly" };
    // A value where there should be none. Ungrounded means invented outright;
    // grounded means it was lifted from the wrong place — the spec calls the
    // latter an unsafe inference, and both are gate failures.
    return { ...base, label: grounded ? "unsafe_inference" : "hallucinated" };
  }

  if (actual === null) return { ...base, label: "missing_incorrectly" };
  if (!grounded) return { ...base, label: "hallucinated" };
  if (actual === expected) return { ...base, label: "exact_match" };
  if (normalize(actual) === normalize(expected)) return { ...base, label: "normalized_match" };

  const a = normalize(actual);
  const b = normalize(expected);
  if (a.includes(b) || b.includes(a)) return { ...base, label: "partial_match" };
  return { ...base, label: "incorrect" };
}

const CORRECT_LABELS: readonly FieldLabel[] = [
  "exact_match",
  "normalized_match",
  "missing_correctly",
];

export type CaseResult = {
  fixtureId: string;
  scores: FieldScore[];
  /** §9.6 — did this case route to human review? Must always be true. */
  routedToReview: boolean;
  /** Warning triggers this case should have produced, and whether it did. */
  warningTriggers: Array<{ trigger: string; covered: boolean }>;
  schemaValid: boolean;
};

/**
 * HALLUCINATION_EVAL §11.4 warning coverage. Enumerates what this fixture
 * *should* have warned about, then checks the extraction actually said so —
 * a draft that is quietly wrong is the failure mode the spec cares about most.
 */
function warningTriggers(
  fixture: RxCorpusFixture,
  extraction: RxExtraction,
): Array<{ trigger: string; covered: boolean }> {
  const triggers: Array<{ trigger: string; covered: boolean }> = [];
  const warnings = extraction.warnings.join(" ").toLowerCase();

  for (const key of RX_REQUIRED_FIELDS) {
    if ((fixture.expected[key] ?? null) === null) {
      triggers.push({
        trigger: `missing:${key}`,
        covered: extraction.confidence.missingFields.includes(key),
      });
    }
  }

  for (const field of extraction.fields) {
    if (field.value !== null && field.confidence < RX_FIELD_CONFIDENCE_THRESHOLD) {
      triggers.push({
        trigger: `low-confidence:${field.key}`,
        covered: extraction.confidence.lowConfidenceFields.includes(field.key),
      });
    }
  }

  if (!extraction.signaturePresent) {
    triggers.push({ trigger: "no-signature", covered: warnings.includes("signature") });
  }

  if (extraction.prescriptionType === "controlled_substance") {
    triggers.push({
      trigger: "controlled-substance",
      covered: warnings.includes("controlled substance"),
    });
  }

  return triggers;
}

export function evaluateCase(
  fixture: RxCorpusFixture,
  extraction: RxExtraction,
  schemaValid: boolean,
): CaseResult {
  return {
    fixtureId: fixture.id,
    scores: Object.keys(fixture.expected).map((key) =>
      scoreField(fixture, extraction, key as RxFieldKey),
    ),
    routedToReview:
      extraction.status === "requires_human_review" &&
      extraction.confidence.requiresHumanReview,
    warningTriggers: warningTriggers(fixture, extraction),
    schemaValid,
  };
}

export type Scorecard = {
  caseCount: number;
  fieldCount: number;
  /**
   * §9.1, over fields that HAVE a ground-truth value.
   *
   * The spec writes the denominator as `total_evaluated_fields`, which reads
   * naturally but scores badly: a field that is correctly absent can never be
   * an `exact_match`, so including it caps the metric below 100% whenever the
   * corpus contains a missing-field case — reporting "96.7%" for a run in which
   * every single field was handled correctly. Correct absences are already
   * measured by §9.4 missing-field detection, so counting them here would be
   * double-counting as well as misleading.
   */
  exactMatchAccuracy: number;
  /** §9.2 */ normalizedAccuracy: number;
  /** §9.3 */ criticalFieldAccuracy: number;
  /** §9.4 */ missingFieldDetectionRate: number;
  /** §9.5 */ hallucinationRate: number;
  /** HALLUCINATION_EVAL §11.2 */ criticalHallucinationRate: number;
  /** §10 */ unsafeInferenceRate: number;
  /** §9.6 / §11.5 */ humanReviewEnforcement: number;
  /** §11.4 */ warningCoverage: number;
  /** §10 */ schemaViolationRate: number;
  /** Every extracted value traced to its cited source line. */
  groundednessRate: number;
  cases: CaseResult[];
};

/** Guards against 0/0 reporting as NaN and silently failing a `>=` gate. */
function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : Number((numerator / denominator).toFixed(4));
}

export function buildScorecard(cases: CaseResult[]): Scorecard {
  const scores = cases.flatMap((result) => result.scores);
  const criticalScores = scores.filter((score) => score.critical);
  const triggers = cases.flatMap((result) => result.warningTriggers);
  const actuallyMissing = scores.filter((score) => score.expected === null);
  const extracted = scores.filter((score) => score.actual !== null);

  const correct = (subset: FieldScore[]) =>
    subset.filter((score) => CORRECT_LABELS.includes(score.label)).length;

  return {
    caseCount: cases.length,
    fieldCount: scores.length,
    exactMatchAccuracy: ratio(
      scores.filter((score) => score.label === "exact_match").length,
      scores.filter((score) => score.expected !== null).length,
    ),
    normalizedAccuracy: ratio(correct(scores), scores.length),
    criticalFieldAccuracy: ratio(correct(criticalScores), criticalScores.length),
    missingFieldDetectionRate: ratio(
      actuallyMissing.filter((score) => score.label === "missing_correctly").length,
      actuallyMissing.length,
    ),
    hallucinationRate: ratio(
      scores.filter((score) => score.label === "hallucinated").length,
      scores.length,
    ),
    criticalHallucinationRate: ratio(
      criticalScores.filter((score) => score.label === "hallucinated").length,
      criticalScores.length,
    ),
    unsafeInferenceRate: ratio(
      scores.filter((score) => score.label === "unsafe_inference").length,
      scores.length,
    ),
    humanReviewEnforcement: ratio(
      cases.filter((result) => result.routedToReview).length,
      cases.length,
    ),
    warningCoverage: ratio(triggers.filter((t) => t.covered).length, triggers.length),
    schemaViolationRate: ratio(
      cases.filter((result) => !result.schemaValid).length,
      cases.length,
    ),
    groundednessRate: ratio(
      extracted.filter((score) => score.grounded).length,
      extracted.length,
    ),
    cases,
  };
}
