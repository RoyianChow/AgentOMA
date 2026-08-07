import type { Scorecard } from "./metrics";

/**
 * Frozen pass/fail gates for AI-RX-06, from
 * `docs/task-10/source-specs/EXTRACTION_ACCURACY_EVAL.md` §11.1 (MVP) and
 * §11.2 (staging).
 *
 * Task 10 requires each candidate's thresholds to be frozen BEFORE held-out
 * results are opened, so these numbers are copied from the spec rather than
 * fitted to what this parser happens to score. If a threshold ever moves, it
 * moves in a commit that says why — never to make a failing run pass.
 *
 * The §11.3 production gate is deliberately absent. It requires completed
 * compliance and security reviews, approved validation datasets, and a rollback
 * plan — none of which exist for AI-RX-06, and none of which a test can assert.
 */

export type GateTier = "mvp" | "staging";

type Comparator = "eq" | "gte" | "lte";

type GateCheck = {
  id: string;
  /** Spec section the threshold comes from. */
  source: string;
  metric: keyof Scorecard | "phiLogLeakageRate";
  comparator: Comparator;
  threshold: number;
};

/** §11.1 — the tier AI-RX-06 is held to today. */
const MVP_CHECKS: readonly GateCheck[] = [
  { id: "schema-violation-rate", source: "§11.1", metric: "schemaViolationRate", comparator: "eq", threshold: 0 },
  { id: "pharmacist-review-required", source: "§11.1", metric: "humanReviewEnforcement", comparator: "eq", threshold: 1 },
  { id: "critical-field-hallucination-rate", source: "§11.1", metric: "criticalHallucinationRate", comparator: "eq", threshold: 0 },
  { id: "phi-log-leakage-rate", source: "§11.1", metric: "phiLogLeakageRate", comparator: "eq", threshold: 0 },
  { id: "critical-field-normalized-accuracy", source: "§11.1", metric: "criticalFieldAccuracy", comparator: "gte", threshold: 0.85 },
  { id: "missing-field-detection-rate", source: "§11.1", metric: "missingFieldDetectionRate", comparator: "gte", threshold: 0.9 },
  { id: "unsafe-inference-rate", source: "§11.1", metric: "unsafeInferenceRate", comparator: "eq", threshold: 0 },
];

/** §11.2 — reported for information. Nothing is staged; there is no charter. */
const STAGING_CHECKS: readonly GateCheck[] = [
  ...MVP_CHECKS.filter(
    (check) =>
      !["critical-field-normalized-accuracy", "missing-field-detection-rate"].includes(check.id),
  ),
  { id: "critical-field-normalized-accuracy", source: "§11.2", metric: "criticalFieldAccuracy", comparator: "gte", threshold: 0.9 },
  { id: "missing-field-detection-rate", source: "§11.2", metric: "missingFieldDetectionRate", comparator: "gte", threshold: 0.95 },
  { id: "review-warning-accuracy", source: "§11.2", metric: "warningCoverage", comparator: "gte", threshold: 0.9 },
  { id: "ocr-failure-safe-routing-rate", source: "§11.2", metric: "groundednessRate", comparator: "eq", threshold: 1 },
];

export const GATE_CHECKS: Record<GateTier, readonly GateCheck[]> = {
  mvp: MVP_CHECKS,
  staging: STAGING_CHECKS,
};

export type GateItemResult = {
  id: string;
  source: string;
  actual: number;
  threshold: number;
  comparator: Comparator;
  passed: boolean;
};

export type GateResult = {
  tier: GateTier;
  passed: boolean;
  items: GateItemResult[];
};

/**
 * Structural properties the scorecard cannot derive from extractions — they are
 * facts about the source, not about a run. Supplied by the caller so this
 * module stays pure and filesystem-free.
 */
export type StructuralMetrics = {
  /** §11.1 requires 0%. 1 means logging was found in the capability source. */
  phiLogLeakageRate: number;
};

function compare(actual: number, comparator: Comparator, threshold: number): boolean {
  if (comparator === "eq") return actual === threshold;
  if (comparator === "gte") return actual >= threshold;
  return actual <= threshold;
}

export function evaluateGate(
  scorecard: Scorecard,
  structural: StructuralMetrics,
  tier: GateTier,
): GateResult {
  const items = GATE_CHECKS[tier].map((check) => {
    const actual =
      check.metric === "phiLogLeakageRate"
        ? structural.phiLogLeakageRate
        : (scorecard[check.metric] as number);
    return {
      id: check.id,
      source: check.source,
      actual,
      threshold: check.threshold,
      comparator: check.comparator,
      passed: compare(actual, check.comparator, check.threshold),
    };
  });

  return { tier, passed: items.every((item) => item.passed), items };
}

/** Plain-text scorecard for the CLI and for pasting into an evaluation record. */
export function formatGateResult(result: GateResult): string {
  const symbol = (passed: boolean) => (passed ? "PASS" : "FAIL");
  const operator: Record<Comparator, string> = { eq: "=", gte: ">=", lte: "<=" };

  const rows = result.items.map((item) => {
    const target = `${operator[item.comparator]} ${item.threshold}`;
    return `  [${symbol(item.passed)}] ${item.id.padEnd(36)} ${String(item.actual).padStart(6)}  (${target}, ${item.source})`;
  });

  return [
    `${result.tier.toUpperCase()} gate: ${symbol(result.passed)}`,
    ...rows,
  ].join("\n");
}
