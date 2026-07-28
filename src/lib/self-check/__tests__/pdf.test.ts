import { afterEach, describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import {
  buildSelfCheckPdfContent,
  createAdvisorySummary,
  createPreVisitSummary,
} from "../model";
import { renderSelfCheckPdf, safelyDownloadSelfCheckPdf } from "../pdf";

describe("self-check PDF failure handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a generic failure without logging the payload or thrown error", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const summary = createAdvisorySummary({
      reason: "red_flag",
      answers: [
        {
          question: "Sensitive symptom answer",
          answer: "Yes",
        },
      ],
      flaggedItems: ["Sensitive symptom answer"],
    });

    const result = await safelyDownloadSelfCheckPdf(summary, async () => {
      throw new Error("Sensitive symptom answer");
    });

    expect(result).toEqual({ ok: false });
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("renders a long report across pages without failing", () => {
    const summary = createPreVisitSummary({
      ailmentId: "rhinitis",
      ailmentLabel: "Runny or blocked nose",
      answers: Array.from({ length: 12 }, (_, index) => ({
        question: `Question ${index + 1} with enough detail to exercise wrapped report rows`,
        answer: "A longer response that remains readable in the structured report layout",
      })),
      redFlagQuestions: Array.from(
        { length: 12 },
        (_, index) => `Safety question ${index + 1} with a wrapped description`,
      ),
      now: new Date("2026-07-23T10:30:00.000Z"),
    });
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    renderSelfCheckPdf(doc, buildSelfCheckPdfContent(summary), null);

    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1_000);
  });
});
