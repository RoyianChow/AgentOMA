import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const manifestPath = join(repositoryRoot, "docs/task-01/evidence/evidence-manifest.json");

function deny(reason) {
  throw new Error(`SBX_EVIDENCE_DENIED:${reason}`);
}

function assertManifestVersion(manifest) {
  if (![1, 2].includes(manifest.schemaVersion)) deny("UNSUPPORTED_MANIFEST_SCHEMA");
  if (manifest.schemaVersion === 1 && manifest.status !== "PENDING") {
    deny("LEGACY_MANIFEST_MUST_BE_PENDING");
  }
  if (manifest.schemaVersion === 2 && !["PENDING", "BLOCKED", "PASS"].includes(manifest.status)) {
    deny("INVALID_FINAL_STATUS");
  }
}

function assertControlCatalog(manifest) {
  const controls = manifest.controls;
  const hasExpectedCatalog = Array.isArray(controls) &&
    controls.length === 18 &&
    new Set(controls.map((control) => control.id)).size === 18;
  if (!hasExpectedCatalog) deny("CONTROL_CATALOG_INCOMPLETE");
}

function assertLegacyControl(control) {
  if (control.redExpectedExitCode !== "nonzero" || control.greenExpectedExitCode !== 0) {
    deny("CONTROL_SCHEMA");
  }
}

function assertNotApplicableControl(manifest, control) {
  if (control.id !== "SBX-14") deny("NOT_APPLICABLE_CONTROL");
  if (manifest.approval?.g2 !== "NOT_REQUESTED") deny("G2_REQUIRED_FOR_NOT_APPLICABLE");
  if (manifest.hostedOrigin !== null) deny("HOSTED_ORIGIN_FOR_NOT_APPLICABLE");
  for (const run of [control.redRun, control.greenRun]) {
    if (run?.status !== "NOT_RUN" || run?.reason !== "G2_NOT_REQUESTED") {
      deny("NOT_APPLICABLE_EVIDENCE");
    }
  }
}

function assertEvidenceRun(root, run) {
  if (!["PASS", "NOT_RUN"].includes(run.status)) deny("FINAL_RUN_SCHEMA");
  if (run.status === "PASS" && (!run.evidence || !existsSync(join(root, run.evidence)))) {
    deny("EVIDENCE_PATH_MISSING");
  }
}

function assertFinalControl(root, manifest, control) {
  if (control.status === "NOT_APPLICABLE") {
    assertNotApplicableControl(manifest, control);
    return;
  }
  if (!["PASS", "BLOCKED"].includes(control.status) || !control.redRun || !control.greenRun) {
    deny("FINAL_CONTROL_SCHEMA");
  }
  assertEvidenceRun(root, control.redRun);
  assertEvidenceRun(root, control.greenRun);
}

function assertControl(root, manifest, control) {
  if (!/^SBX-(0[1-9]|1[0-8])$/.test(control.id)) deny("CONTROL_SCHEMA");
  if (manifest.schemaVersion === 1) {
    assertLegacyControl(control);
    return;
  }
  assertFinalControl(root, manifest, control);
}

export function validateEvidenceManifest(manifest, options = {}) {
  const root = options.repositoryRoot ?? repositoryRoot;
  assertManifestVersion(manifest);
  assertControlCatalog(manifest);
  for (const control of manifest.controls) assertControl(root, manifest, control);
  return {
    control: "SBX-21/SBX-22/SBX-25/SBX-30",
    result: "PASS",
    status: manifest.status,
    controls: manifest.controls.length,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  if (!existsSync(manifestPath)) throw new Error("SBX_EVIDENCE_DENIED:MANIFEST_MISSING");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  console.log(JSON.stringify(validateEvidenceManifest(manifest)));
}
