import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const manifestPath = join(repositoryRoot, "docs/task-01/evidence/evidence-manifest.json");
if (!existsSync(manifestPath)) throw new Error("SBX_EVIDENCE_DENIED:MANIFEST_MISSING");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (![1, 2].includes(manifest.schemaVersion)) {
  throw new Error("SBX_EVIDENCE_DENIED:UNSUPPORTED_MANIFEST_SCHEMA");
}
if (manifest.schemaVersion === 1 && manifest.status !== "PENDING") {
  throw new Error("SBX_EVIDENCE_DENIED:LEGACY_MANIFEST_MUST_BE_PENDING");
}
if (manifest.schemaVersion === 2 && !["PENDING", "BLOCKED", "PASS"].includes(manifest.status)) {
  throw new Error("SBX_EVIDENCE_DENIED:INVALID_FINAL_STATUS");
}
if (manifest.controls.length !== 18 || new Set(manifest.controls.map((control) => control.id)).size !== 18) {
  throw new Error("SBX_EVIDENCE_DENIED:CONTROL_CATALOG_INCOMPLETE");
}
for (const control of manifest.controls) {
  if (!/^SBX-(0[1-9]|1[0-8])$/.test(control.id)) throw new Error("SBX_EVIDENCE_DENIED:CONTROL_SCHEMA");
  if (manifest.schemaVersion === 1 && (control.redExpectedExitCode !== "nonzero" || control.greenExpectedExitCode !== 0)) {
    throw new Error("SBX_EVIDENCE_DENIED:CONTROL_SCHEMA");
  }
  if (manifest.schemaVersion === 2) {
    if (!["PASS", "BLOCKED"].includes(control.status) || !control.redRun || !control.greenRun) {
      throw new Error("SBX_EVIDENCE_DENIED:FINAL_CONTROL_SCHEMA");
    }
    for (const run of [control.redRun, control.greenRun]) {
      if (!["PASS", "NOT_RUN"].includes(run.status)) {
        throw new Error("SBX_EVIDENCE_DENIED:FINAL_RUN_SCHEMA");
      }
      if (run.status === "PASS" && (!run.evidence || !existsSync(join(repositoryRoot, run.evidence)))) {
        throw new Error("SBX_EVIDENCE_DENIED:EVIDENCE_PATH_MISSING");
      }
    }
  }
}
console.log(JSON.stringify({ control: "SBX-21/SBX-22/SBX-25/SBX-30", result: "PASS", status: manifest.status, controls: manifest.controls.length }));
