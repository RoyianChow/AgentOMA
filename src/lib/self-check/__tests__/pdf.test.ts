import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdvisorySummary } from "../model";
import { safelyDownloadSelfCheckPdf } from "../pdf";

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
});
