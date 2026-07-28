import { describe, expect, it } from "vitest";
import {
  SELF_CHECK_PDF_HEADER,
  buildSelfCheckPdfContent,
  createAdvisorySummary,
  createPreVisitSummary,
} from "../model";

const NOW = new Date("2026-07-23T10:30:00.000Z");

describe("self-check document model", () => {
  it("builds a modern pre-visit report without repetitive answer labels or billing fields", () => {
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
    expect(content.generatedAt).toContain("July 23, 2026");
    expect(content.reportLabel).toBe("PRE-VISIT REPORT");
    expect(content.tone).toBe("green");
    expect(serialized).toContain("Runny or blocked nose");
    expect(serialized).toContain('"value":"No"');
    expect(serialized).not.toMatch(/self-reported/i);
    expect(serialized).not.toMatch(/\b\d{7}\b/);
    expect(serialized).not.toMatch(/candidate\s+pin/i);
    expect(serialized).not.toMatch(/claim\s+maximum/i);
    expect(content.finePrint).toEqual(
      expect.arrayContaining([
        expect.stringContaining("not been verified"),
        expect.stringContaining("Nothing has been billed or submitted"),
      ]),
    );
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
    expect(content.reportLabel).toBe("ADVISORY REPORT");
    expect(content.tone).toBe("amber");
    expect(serialized).not.toMatch(/self-reported/i);
  });

  it("keeps emergency guidance prominent instead of burying it in fine print", () => {
    const summary = createAdvisorySummary({
      reason: "emergency",
      answers: [],
      flaggedItems: ["An emergency warning sign"],
      now: NOW,
    });

    const content = buildSelfCheckPdfContent(summary);

    expect(content.tone).toBe("red");
    expect(content.highlight.value).toContain("Call 911");
    expect(content.finePrint.join(" ")).not.toContain("Call 911");
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
