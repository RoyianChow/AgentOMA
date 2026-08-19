import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { evaluateGate, formatGateResult } from "../src/lib/rx-intake/evaluation/gates";
import { formatScorecard, runEvaluation } from "../src/lib/rx-intake/evaluation/run";

/**
 * Prints the AI-RX-06 evaluation scorecard.
 *
 *   npm run eval:rx-intake
 *
 * The same numbers are asserted as a hard gate by
 * `src/lib/rx-intake/__tests__/evaluation.test.ts`. This CLI exists to produce a
 * readable artifact for an evaluation record — running it changes nothing and
 * touches only synthetic fixtures.
 *
 * The MVP gate is enforced. The staging gate is printed for information only:
 * nothing is staged, because AI-RX-06 has no experiment charter.
 */

const LIB_DIR = fileURLToPath(new URL("../src/lib/rx-intake/", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      return entry === "__tests__" ? [] : sourceFiles(full);
    }
    return /\.ts$/.test(entry) && !entry.includes(".test.") ? [full] : [];
  });
}

function measurePhiLogLeakage(): number {
  const source = sourceFiles(LIB_DIR)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return /console\.\w+\s*\(|\blogger\b|process\.stdout\.write/.test(source) ? 1 : 0;
}

const scorecard = runEvaluation();
const structural = { phiLogLeakageRate: measurePhiLogLeakage() };

const mvp = evaluateGate(scorecard, structural, "mvp");
const staging = evaluateGate(scorecard, structural, "staging");

process.stdout.write(
  [
    formatScorecard(scorecard),
    "",
    formatGateResult(mvp),
    "",
    formatGateResult(staging),
    "",
    "NOTE: corpus ground truth and parser were authored together, so this",
    "measures internal consistency and regression safety — not generalisation.",
    "A held-out corpus and a pharmacist evaluator are still required before",
    "any of this counts as evidence that extraction works.",
    "",
  ].join("\n"),
);

// The MVP gate is advisory here — the suite is what fails a build. Exiting
// non-zero as well keeps this usable as a standalone CI step later.
process.exit(mvp.passed ? 0 : 1);
