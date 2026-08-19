import { describe, expect, it } from "vitest";

import { RX_CORPUS, findFixture } from "../corpus";
import { INTEGRITY_INDICATOR_IDS, type IntegrityIndicatorId } from "../integrity";
import { extractPrescription } from "../parser";

/**
 * Document-integrity indicators — SAFETY.md §6, from the recovered
 * prescription-intake agent specification.
 *
 * Two things are under test: that each indicator fires on the document it is
 * meant to catch, and — more importantly — that the whole mechanism can only
 * ever escalate. An integrity check that could clear a document would be far
 * more dangerous than one that never fired at all.
 */

function indicatorsFor(fixtureId: string): IntegrityIndicatorId[] {
  const fixture = findFixture(fixtureId);
  if (!fixture) throw new Error(`missing fixture ${fixtureId}`);
  return extractPrescription(fixture).integrityIndicators.map((i) => i.id);
}

describe("each indicator fires on its case", () => {
  it("flags a quantity whose figures and words disagree", () => {
    // "Qty: 90 (thirty)"
    expect(indicatorsFor("altered-006")).toContain("altered_quantity");
  });

  it("flags a repeat count whose figures and words disagree", () => {
    // "Repeats: 5 (one)"
    expect(indicatorsFor("altered-006")).toContain("altered_refills");
  });

  it("flags a signature that does not match the printed prescriber", () => {
    expect(indicatorsFor("mismatch-007")).toContain("prescriber_mismatch");
  });

  it("flags a document with no clinic name or contact number", () => {
    expect(indicatorsFor("unidentified-008")).toContain("missing_clinic_identifier");
  });

  it("flags mixed date formats as suspicious formatting", () => {
    expect(indicatorsFor("unidentified-008")).toContain("suspicious_formatting");
  });

  it("flags an absent signature", () => {
    expect(indicatorsFor("missing-003")).toContain("missing_signature");
  });

  it("flags contradictory written dates", () => {
    expect(indicatorsFor("contradictory-005")).toContain("inconsistent_dates");
  });
});

describe("indicators stay quiet on clean documents", () => {
  it("raises nothing on the clean fixture", () => {
    // The failure that matters most: an indicator that fires on everything is
    // noise, and noise trains a reviewer to click past it.
    expect(indicatorsFor("clean-001")).toEqual([]);
  });

  it("raises nothing on a merely noisy scan", () => {
    // OCR noise is a legibility problem, not an integrity one. It is already
    // reported through per-field confidence.
    expect(indicatorsFor("noisy-002")).toEqual([]);
  });

  it("does not flag a legitimate matching signature", () => {
    expect(indicatorsFor("clean-001")).not.toContain("prescriber_mismatch");
    expect(indicatorsFor("altered-006")).not.toContain("prescriber_mismatch");
  });

  it("does not flag agreeing figures and words", () => {
    // controlled-004 has a plain "Qty: 20" with no word form to disagree with.
    expect(indicatorsFor("controlled-004")).not.toContain("altered_quantity");
  });
});

describe("indicators can only escalate", () => {
  it("never clears a document — an empty list is not an all-clear", () => {
    // Asserted structurally: every draft still requires review regardless of
    // whether any indicator fired.
    for (const fixture of RX_CORPUS) {
      const extraction = extractPrescription(fixture);
      expect(extraction.status, fixture.id).toBe("requires_human_review");
      expect(extraction.confidence.requiresHumanReview, fixture.id).toBe(true);
    }
  });

  it("adds a warning for every indicator it raises", () => {
    for (const fixture of RX_CORPUS) {
      const extraction = extractPrescription(fixture);
      for (const indicator of extraction.integrityIndicators) {
        expect(extraction.warnings, `${fixture.id} → ${indicator.id}`).toContain(
          indicator.detail,
        );
      }
    }
  });

  it("does not alter field values or confidences", () => {
    // Integrity detection reads the parse; it must not write back into it. If
    // it ever did, a flagged document could end up scoring differently.
    const fixture = findFixture("altered-006")!;
    const extraction = extractPrescription(fixture);
    const quantity = extraction.fields.find((f) => f.key === "quantity")!;

    expect(quantity.value).toBe("90");
    expect(quantity.confidence).toBeGreaterThan(0.9);
  });
});

describe("it flags concerns without declaring fraud", () => {
  it("uses no accusatory language anywhere in the corpus", () => {
    // SAFETY.md §6: "The agent may flag concerns. The agent must not declare
    // fraud as fact." A parser is in no position to accuse anyone.
    const banned = /\bfraud|fraudulent|forged|forgery|altered\b|tampered|criminal|illegal/i;
    for (const fixture of RX_CORPUS) {
      for (const indicator of extractPrescription(fixture).integrityIndicators) {
        expect(indicator.detail, `${fixture.id} → ${indicator.id}`).not.toMatch(banned);
      }
    }
  });

  it("states what was observed and asks for confirmation", () => {
    const detail = extractPrescription(findFixture("altered-006")!)
      .integrityIndicators.find((i) => i.id === "altered_quantity")!.detail;

    expect(detail).toContain("90");
    expect(detail).toContain("thirty");
    expect(detail).toMatch(/confirm against the original/i);
  });
});

describe("contract", () => {
  it("emits only known indicator ids", () => {
    for (const fixture of RX_CORPUS) {
      for (const indicator of extractPrescription(fixture).integrityIndicators) {
        expect(INTEGRITY_INDICATOR_IDS).toContain(indicator.id);
      }
    }
  });

  it("points every line-anchored indicator at a real line", () => {
    for (const fixture of RX_CORPUS) {
      const lineCount = fixture.text.split("\n").length;
      for (const indicator of extractPrescription(fixture).integrityIndicators) {
        if (indicator.sourceLine === null) continue;
        expect(indicator.sourceLine, `${fixture.id} → ${indicator.id}`).toBeLessThanOrEqual(
          lineCount,
        );
      }
    }
  });

  it("stays deterministic", () => {
    const fixture = findFixture("altered-006")!;
    expect(extractPrescription(fixture).integrityIndicators).toEqual(
      extractPrescription(fixture).integrityIndicators,
    );
  });

  it("exercises every implemented indicator somewhere in the corpus", () => {
    // A detector with no fixture is an untested detector.
    const seen = new Set(
      RX_CORPUS.flatMap((fixture) =>
        extractPrescription(fixture).integrityIndicators.map((i) => i.id),
      ),
    );
    for (const id of INTEGRITY_INDICATOR_IDS) {
      expect(seen.has(id), `no fixture triggers ${id}`).toBe(true);
    }
  });
});
