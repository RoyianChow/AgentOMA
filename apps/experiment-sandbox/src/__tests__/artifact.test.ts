import { describe, expect, it } from "vitest";

import { buildSyntheticSamplePdf, verifySyntheticSamplePdf } from "../evidence/sample-pdf";

describe("synthetic artifact boundary", () => {
  it("creates exactly two visibly marked non-operational pages", () => {
    const artifact = buildSyntheticSamplePdf();
    expect(verifySyntheticSamplePdf(artifact)).toBe(true);
  });

  it("rejects a corrupted or unmarked artifact", () => {
    const artifact = buildSyntheticSamplePdf();
    artifact[0] = 0;
    expect(verifySyntheticSamplePdf(artifact)).toBe(false);
  });
});
