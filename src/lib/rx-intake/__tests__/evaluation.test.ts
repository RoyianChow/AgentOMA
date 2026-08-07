import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { RX_CORPUS, findFixture } from "../corpus";
import { evaluateGate, formatGateResult, type StructuralMetrics } from "../evaluation/gates";
import { CRITICAL_FIELDS, buildScorecard, evaluateCase, scoreField } from "../evaluation/metrics";
import { formatScorecard, runEvaluation } from "../evaluation/run";
import { extractPrescription } from "../parser";
import { rxExtractionSchema } from "../contract";

/**
 * The AI-RX-06 evaluation gate.
 *
 * This is the enforcement half of the harness: `run.ts` computes a scorecard,
 * and these assertions fail the suite when a metric regresses below the frozen
 * MVP thresholds in §11.1 of the vendored
 * `docs/task-10/source-specs/EXTRACTION_ACCURACY_EVAL.md`.
 *
 * The scorecard measures internal consistency, not generalisation — see the
 * header of `run.ts`. That caveat does not weaken the gate's usefulness: its
 * job is to catch the parser silently getting worse, and it does that.
 */

const LIB_DIR = fileURLToPath(new URL("../", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      return entry === "__tests__" ? [] : sourceFiles(full);
    }
    return /\.(ts|tsx)$/.test(entry) && !entry.includes(".test.") ? [full] : [];
  });
}

/**
 * §11.1 requires a PHI log leakage rate of 0%. The capability handles synthetic
 * data, but the structural property is what the gate asserts: no logging path
 * exists, so there is nothing to leak through if the corpus is ever swapped for
 * something real.
 */
function measureStructural(): StructuralMetrics {
  const source = sourceFiles(LIB_DIR)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n")
    // Strip comments so prose about logging is not read as logging.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  const logs = /console\.\w+\s*\(|\blogger\b|process\.stdout\.write/.test(source);
  return { phiLogLeakageRate: logs ? 1 : 0 };
}

const scorecard = runEvaluation();
const structural = measureStructural();

describe("MVP gate (EXTRACTION_ACCURACY_EVAL §11.1)", () => {
  const result = evaluateGate(scorecard, structural, "mvp");

  it.each(result.items.map((item) => [item.id, item] as const))(
    "%s",
    (_id, item) => {
      expect(
        item.passed,
        `${item.id}: got ${item.actual}, need ${item.comparator} ${item.threshold} (${item.source})\n\n${formatScorecard(scorecard)}`,
      ).toBe(true);
    },
  );

  it("passes as a whole", () => {
    expect(result.passed, formatGateResult(result)).toBe(true);
  });
});

describe("safety metrics are absolute", () => {
  // §10 lists these as "0% required" rather than "0% target". A single
  // occurrence is a release blocker, so they get their own assertions rather
  // than riding on an accuracy average that could absorb one bad field.
  it("invents nothing — zero hallucinated fields anywhere", () => {
    const hallucinated = scorecard.cases
      .flatMap((result) => result.scores)
      .filter((score) => score.label === "hallucinated");
    expect(hallucinated, JSON.stringify(hallucinated, null, 2)).toEqual([]);
  });

  it("infers nothing — zero unsafe inferences anywhere", () => {
    const unsafe = scorecard.cases
      .flatMap((result) => result.scores)
      .filter((score) => score.label === "unsafe_inference");
    expect(unsafe, JSON.stringify(unsafe, null, 2)).toEqual([]);
  });

  it("every extracted value is traceable to its cited line", () => {
    expect(scorecard.groundednessRate).toBe(1);
  });

  it("routes 100% of cases to human review", () => {
    expect(scorecard.humanReviewEnforcement).toBe(1);
  });

  it("has no logging path in the capability source", () => {
    expect(structural.phiLogLeakageRate).toBe(0);
  });
});

describe("the harness detects the failures it exists to catch", () => {
  // A scorer that always returns "pass" would satisfy every assertion above.
  // These feed it deliberately broken output and require it to object.

  const fixture = findFixture("clean-001")!;

  it("labels an invented value as hallucinated", () => {
    const extraction = extractPrescription(fixture);
    const tampered = {
      ...extraction,
      fields: extraction.fields.map((field) =>
        field.key === "medicationName"
          ? { ...field, value: "Ciprofloxacin" } // not in the document
          : field,
      ),
    };
    const score = scoreField(fixture, tampered, "medicationName");
    expect(score.label).toBe("hallucinated");
    expect(score.grounded).toBe(false);
  });

  it("labels a value invented for a genuinely absent field", () => {
    const incomplete = findFixture("missing-003")!;
    const extraction = extractPrescription(incomplete);
    const tampered = {
      ...extraction,
      fields: extraction.fields.map((field) =>
        field.key === "quantity" ? { ...field, value: "30", sourceLine: 9 } : field,
      ),
    };
    expect(scoreField(incomplete, tampered, "quantity").label).toBe("hallucinated");
  });

  it("labels a dropped field as missing_incorrectly", () => {
    const extraction = extractPrescription(fixture);
    const tampered = {
      ...extraction,
      fields: extraction.fields.map((field) =>
        field.key === "directions" ? { ...field, value: null, sourceLine: null } : field,
      ),
    };
    expect(scoreField(fixture, tampered, "directions").label).toBe("missing_incorrectly");
  });

  it("fails the gate when a critical field is wrong", () => {
    const extraction = extractPrescription(fixture);
    const tampered = {
      ...extraction,
      fields: extraction.fields.map((field) =>
        field.key === "medicationName"
          ? { ...field, value: "Penicillin" }
          : field,
      ),
    };
    const broken = buildScorecard([evaluateCase(fixture, tampered, true)]);
    expect(evaluateGate(broken, structural, "mvp").passed).toBe(false);
  });

  it("fails the gate when a draft skips human review", () => {
    const extraction = extractPrescription(fixture);
    const tampered = {
      ...extraction,
      status: "verified" as const,
    };
    const broken = buildScorecard([evaluateCase(fixture, tampered, true)]);
    expect(broken.humanReviewEnforcement).toBe(0);
    expect(evaluateGate(broken, structural, "mvp").passed).toBe(false);
  });

  it("fails the gate on a schema violation", () => {
    const broken = buildScorecard([
      evaluateCase(fixture, extractPrescription(fixture), false),
    ]);
    expect(broken.schemaViolationRate).toBe(1);
    expect(evaluateGate(broken, structural, "mvp").passed).toBe(false);
  });

  it("fails the gate when PHI logging is present", () => {
    expect(evaluateGate(scorecard, { phiLogLeakageRate: 1 }, "mvp").passed).toBe(false);
  });
});

describe("normalisation does not paper over OCR misreads", () => {
  it("does not treat 5OO mg as equivalent to 500 mg", () => {
    // The whole point of the noisy fixture. If normalisation collapsed O to 0,
    // a misread strength would score as a normalized_match and the parser would
    // get full marks for a value a pharmacist must correct.
    const noisy = findFixture("noisy-002")!;
    const extraction = extractPrescription(noisy);
    const tampered = {
      ...extraction,
      fields: extraction.fields.map((field) =>
        field.key === "medicationStrength"
          ? { ...field, value: "500 mg" }
          : field,
      ),
    };
    // "500 mg" is not on the source line (which reads "5OO mg"), so this is
    // caught as ungrounded rather than waved through as a formatting variant.
    expect(scoreField(noisy, tampered, "medicationStrength").label).toBe("hallucinated");
  });

  it("does treat pure formatting differences as equivalent", () => {
    const clean = findFixture("clean-001")!;
    const extraction = extractPrescription(clean);
    const tampered = {
      ...extraction,
      fields: extraction.fields.map((field) =>
        field.key === "medicationStrength" ? { ...field, value: "500mg" } : field,
      ),
    };
    expect(scoreField(clean, tampered, "medicationStrength").label).toBe(
      "normalized_match",
    );
  });
});

describe("coverage of the corpus", () => {
  it("scores every fixture", () => {
    expect(scorecard.caseCount).toBe(RX_CORPUS.length);
  });

  it("scores every critical field on every fixture", () => {
    for (const result of scorecard.cases) {
      const scored = new Set(result.scores.map((score) => score.key));
      for (const key of CRITICAL_FIELDS) {
        expect(scored.has(key), `${result.fixtureId} missing ${key}`).toBe(true);
      }
    }
  });

  it("produces a schema-valid extraction for every fixture", () => {
    for (const corpusFixture of RX_CORPUS) {
      expect(
        rxExtractionSchema.safeParse(extractPrescription(corpusFixture)).success,
        corpusFixture.id,
      ).toBe(true);
    }
  });
});
