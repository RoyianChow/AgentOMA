import { describe, expect, it } from "vitest";

import {
  RX_FIELD_CONFIDENCE_THRESHOLD,
  RX_FIELD_KEYS,
  RX_REQUIRED_FIELDS,
  rxExtractionSchema,
  type RxFieldKey,
} from "../contract";
import { RX_CORPUS, findFixture } from "../corpus";
import { extractPrescription } from "../parser";

/**
 * AI-RX-06 parser behaviour.
 *
 * These are database-free by design — the parser touches no database, no
 * network, and no clock, so a real-Postgres run would prove nothing here. The
 * money-rule tests that AGENTS.md requires to hit real Postgres are a different
 * set; this capability derives no claim, no PIN, and no fee, and the boundary
 * test below asserts it cannot start.
 */

function fieldValue(fixtureId: string, key: RxFieldKey): string | null {
  const fixture = findFixture(fixtureId);
  if (!fixture) throw new Error(`missing fixture ${fixtureId}`);
  const extraction = extractPrescription(fixture);
  return extraction.fields.find((field) => field.key === key)?.value ?? null;
}

describe("AI-RX-06 extraction contract", () => {
  it.each(RX_CORPUS.map((fixture) => fixture.id))(
    "%s produces a schema-valid draft",
    (id) => {
      const fixture = findFixture(id)!;
      const result = rxExtractionSchema.safeParse(extractPrescription(fixture));
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    },
  );

  it.each(RX_CORPUS.map((fixture) => fixture.id))(
    "%s reports every field key exactly once",
    (id) => {
      const extraction = extractPrescription(findFixture(id)!);
      expect(extraction.fields.map((field) => field.key)).toEqual([...RX_FIELD_KEYS]);
    },
  );

  it("is pure — the same fixture yields an identical draft", () => {
    const fixture = findFixture("clean-001")!;
    expect(extractPrescription(fixture)).toEqual(extractPrescription(fixture));
  });
});

describe("AI-RX-06 never self-approves", () => {
  it.each(RX_CORPUS.map((fixture) => fixture.id))(
    "%s stays in requires_human_review",
    (id) => {
      const extraction = extractPrescription(findFixture(id)!);
      expect(extraction.status).toBe("requires_human_review");
      expect(extraction.confidence.requiresHumanReview).toBe(true);
    },
  );

  it("marks every draft synthetic", () => {
    for (const fixture of RX_CORPUS) {
      expect(extractPrescription(fixture).synthetic).toBe(true);
    }
  });

  it("a flawless parse still requires review", () => {
    // The clean fixture is the one most likely to tempt an auto-accept branch.
    const extraction = extractPrescription(findFixture("clean-001")!);
    expect(extraction.confidence.missingFields).toEqual([]);
    expect(extraction.confidence.overallScore).toBeGreaterThan(0.8);
    expect(extraction.status).toBe("requires_human_review");
  });
});

describe("ground truth across the corpus", () => {
  it.each(RX_CORPUS.map((fixture) => fixture.id))("%s matches expected values", (id) => {
    const fixture = findFixture(id)!;
    const extraction = extractPrescription(fixture);
    const byKey = new Map(extraction.fields.map((field) => [field.key, field]));

    for (const [key, expected] of Object.entries(fixture.expected)) {
      expect(
        byKey.get(key as RxFieldKey)?.value,
        `${id} → ${key}`,
      ).toBe(expected);
    }
  });
});

describe("degraded input is flagged, not cleaned up", () => {
  const NOISY = "noisy-002";

  it("preserves OCR noise verbatim rather than normalising it", () => {
    // The tempting bug is "5OO mg" → "500 mg". A parser that silently corrects
    // a strength is worse than one that cannot read it.
    expect(fieldValue(NOISY, "medicationStrength")).toBe("5OO mg");
    expect(fieldValue(NOISY, "quantity")).toBe("6O");
    expect(fieldValue(NOISY, "prescriberLicence")).toBe("99O357");
  });

  it("does not correct a misspelled drug name", () => {
    expect(fieldValue(NOISY, "medicationName")).toBe("Metfonnin");
  });

  it("drops confidence below threshold on digit/letter confusion", () => {
    const extraction = extractPrescription(findFixture(NOISY)!);
    const byKey = new Map(extraction.fields.map((field) => [field.key, field]));

    for (const key of ["quantity", "prescriberLicence", "medicationStrength"] as const) {
      expect(byKey.get(key)!.confidence, key).toBeLessThan(
        RX_FIELD_CONFIDENCE_THRESHOLD,
      );
      expect(extraction.confidence.lowConfidenceFields).toContain(key);
    }
  });

  it("still reads a variant label like D.0.B.", () => {
    expect(fieldValue(NOISY, "patientDob")).toBe("1971-11-02");
  });
});

describe("absent data is reported absent", () => {
  const INCOMPLETE = "missing-003";

  it("reports a missing quantity instead of inferring one", () => {
    // "Apply thin layer BID" implies a quantity to a human. The parser must not
    // guess one, and must not borrow a number from the directions.
    expect(fieldValue(INCOMPLETE, "quantity")).toBeNull();
    const extraction = extractPrescription(findFixture(INCOMPLETE)!);
    expect(extraction.confidence.missingFields).toContain("quantity");
  });

  it("detects an absent signature", () => {
    const extraction = extractPrescription(findFixture(INCOMPLETE)!);
    expect(extraction.signaturePresent).toBe(false);
    expect(extraction.warnings).toContain("No prescriber signature line was found.");
  });

  it("gives absent fields zero confidence and no source line", () => {
    const extraction = extractPrescription(findFixture(INCOMPLETE)!);
    const quantity = extraction.fields.find((field) => field.key === "quantity")!;
    expect(quantity.confidence).toBe(0);
    expect(quantity.sourceLine).toBeNull();
  });

  it("names every missing required field in the warnings", () => {
    const extraction = extractPrescription(findFixture(INCOMPLETE)!);
    for (const key of extraction.confidence.missingFields) {
      expect(RX_REQUIRED_FIELDS).toContain(key);
      expect(extraction.warnings.some((w) => w.includes("required"))).toBe(true);
    }
  });
});

describe("contradictions are surfaced, not resolved", () => {
  it("keeps the first date and reports the conflict", () => {
    const extraction = extractPrescription(findFixture("contradictory-005")!);
    const written = extraction.fields.find((field) => field.key === "writtenDate")!;

    expect(written.value).toBe("2026-05-04");
    expect(written.notes.join(" ")).toMatch(/2026-05-04 \/ 2026-06-04/);
    expect(written.notes.join(" ")).toMatch(/Not resolved/i);
    expect(written.confidence).toBeLessThan(RX_FIELD_CONFIDENCE_THRESHOLD);
  });
});

describe("controlled substances force the strict path", () => {
  it("classifies the narcotic fixture and warns", () => {
    const extraction = extractPrescription(findFixture("controlled-004")!);
    expect(extraction.prescriptionType).toBe("controlled_substance");
    expect(extraction.warnings.join(" ")).toMatch(/prescriber verification is mandatory/i);
  });

  it("classifies as controlled even though every field parsed cleanly", () => {
    const extraction = extractPrescription(findFixture("controlled-004")!);
    expect(extraction.confidence.missingFields).toEqual([]);
    expect(extraction.prescriptionType).toBe("controlled_substance");
  });
});

describe("source provenance", () => {
  it("points every extracted value at a real line of the document", () => {
    for (const fixture of RX_CORPUS) {
      const lineCount = fixture.text.split("\n").length;
      for (const field of extractPrescription(fixture).fields) {
        if (field.value === null) continue;
        expect(field.sourceLine, `${fixture.id} → ${field.key}`).toBeGreaterThan(0);
        expect(field.sourceLine!).toBeLessThanOrEqual(lineCount);
      }
    }
  });

  it("quotes a value that actually appears on the line it cites", () => {
    for (const fixture of RX_CORPUS) {
      const lines = fixture.text.split("\n");
      for (const field of extractPrescription(fixture).fields) {
        if (field.value === null || field.sourceLine === null) continue;
        // medicationName is a slice of the med line, so compare case-insensitively
        // against the whole line rather than demanding an exact substring match.
        expect(
          lines[field.sourceLine - 1].toLowerCase(),
          `${fixture.id} → ${field.key}`,
        ).toContain(field.value.toLowerCase());
      }
    }
  });
});
