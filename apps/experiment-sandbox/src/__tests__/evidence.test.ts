import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { validateEvidenceManifest } from "../../tools/verify-evidence.mjs";

type TestManifest = {
  approval: { g2: string };
  hostedOrigin: string | null;
  controls: Array<{ id: string; status: string; redRun: Record<string, string>; greenRun: Record<string, string> }>;
  [key: string]: unknown;
};

const manifestPath = fileURLToPath(
  new URL("../../../../docs/task-01/evidence/evidence-manifest.json", import.meta.url),
);
const currentManifest = JSON.parse(readFileSync(manifestPath, "utf8")) as TestManifest;

function copyManifest(): TestManifest {
  return structuredClone(currentManifest);
}

describe("evidence manifest applicability", () => {
  it("allows SBX-14 to be NOT_APPLICABLE only when G2 is not requested and no hosted origin exists", () => {
    const manifest = copyManifest();

    expect(() => validateEvidenceManifest(manifest)).not.toThrow();
    expect(manifest.approval.g2).toBe("NOT_REQUESTED");
    expect(manifest.hostedOrigin).toBeNull();
    expect(manifest.controls.find((control) => control.id === "SBX-14")).toMatchObject({
      status: "NOT_APPLICABLE",
      redRun: { status: "NOT_RUN", reason: "G2_NOT_REQUESTED" },
      greenRun: { status: "NOT_RUN", reason: "G2_NOT_REQUESTED" },
    });
  });

  it("rejects NOT_APPLICABLE when G2 is not in the NOT_REQUESTED state", () => {
    const manifest = copyManifest();
    manifest.approval.g2 = "NOT_GRANTED";

    expect(() => validateEvidenceManifest(manifest)).toThrow(
      "SBX_EVIDENCE_DENIED:G2_REQUIRED_FOR_NOT_APPLICABLE",
    );
  });

  it("rejects NOT_APPLICABLE when a hosted origin exists", () => {
    const manifest = copyManifest();
    manifest.hostedOrigin = "https://preview.invalid";

    expect(() => validateEvidenceManifest(manifest)).toThrow(
      "SBX_EVIDENCE_DENIED:HOSTED_ORIGIN_FOR_NOT_APPLICABLE",
    );
  });

  it("does not allow other controls to become NOT_APPLICABLE", () => {
    const manifest = copyManifest();
    const control = manifest.controls.find((candidate) => candidate.id === "SBX-01");
    if (!control) throw new Error("SBX-01 fixture missing");
    control.status = "NOT_APPLICABLE";

    expect(() => validateEvidenceManifest(manifest)).toThrow(
      "SBX_EVIDENCE_DENIED:NOT_APPLICABLE_CONTROL",
    );
  });
});
