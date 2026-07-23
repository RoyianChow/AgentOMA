import { describe, expect, it } from "vitest";
import {
  SELF_CHECK_PDF_HEADER,
  buildSelfCheckPdfContent,
  createAdvisorySummary,
  createPreVisitSummary,
} from "../model";

const NOW = new Date("2026-07-23T10:30:00.000Z");

describe("self-check document model", () => {
  it("builds a pre-visit summary with self-reported answers and no billing fields", () => {
    const summary = createPreVisitSummary({
      ailmentId: "rhinitis",
      ailmentLabel: "Runny or blocked nose",
      answers: [
        {
          question: "Where is the problem?",
          answer: "Nose or sinuses",
        },
      ],
      redFlagQuestions: ["A safety question"],
      now: NOW,
    });

    const content = buildSelfCheckPdfContent(summary);
    const serialized = JSON.stringify({ summary, content });

    expect(content.header).toBe(SELF_CHECK_PDF_HEADER);
    expect(content.generatedAt).toBe(NOW.toISOString());
    expect(serialized).toContain("Runny or blocked nose");
    expect(serialized).toContain("No (self-reported)");
    expect(serialized).not.toMatch(/\b\d{7}\b/);
    expect(serialized).not.toMatch(/candidate\s+pin/i);
    expect(serialized).not.toMatch(/claim\s+maximum/i);
  });

  it("makes the advisory branch structurally incapable of carrying an ailment", () => {
    const summary = createAdvisorySummary({
      reason: "red_flag",
      answers: [
        {
          question: "A safety question",
          answer: "Yes",
        },
      ],
      flaggedItems: ["A safety question"],
      now: NOW,
    });

    const content = buildSelfCheckPdfContent(summary);
    const serialized = JSON.stringify({ summary, content });

    expect("suspectedAilment" in summary).toBe(false);
    expect(serialized).not.toContain("Runny or blocked nose");
    expect(serialized).toContain("Please be seen by a pharmacist in person");
    expect(serialized).toContain("Nothing has been billed or submitted");
  });

  it("keeps identifying demographics out of both summary shapes", () => {
    const summary = createAdvisorySummary({
      reason: "unsure",
      answers: [],
      flaggedItems: ["The self-check could not narrow the path."],
      now: NOW,
    });
    const keys = JSON.stringify(summary);

    expect(keys).not.toMatch(/health.?card|health.?number|date.?of.?birth|\bdob\b/i);
    expect(keys).not.toMatch(/\bgender\b|\bsex\b|\bage\b/i);
  });
});
