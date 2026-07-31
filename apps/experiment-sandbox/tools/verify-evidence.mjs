import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const manifestPath = join(repositoryRoot, "docs/task-01/evidence/evidence-manifest.json");
if (!existsSync(manifestPath)) throw new Error("SBX_EVIDENCE_DENIED:MANIFEST_MISSING");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.schemaVersion !== 1 || manifest.status !== "PENDING") {
  throw new Error("SBX_EVIDENCE_DENIED:CHECKED_IN_MANIFEST_MUST_BE_PENDING");
}
if (manifest.controls.length !== 18 || new Set(manifest.controls.map((control) => control.id)).size !== 18) {
  throw new Error("SBX_EVIDENCE_DENIED:CONTROL_CATALOG_INCOMPLETE");
}
for (const control of manifest.controls) {
  if (!/^SBX-(0[1-9]|1[0-8])$/.test(control.id) || control.redExpectedExitCode !== "nonzero" || control.greenExpectedExitCode !== 0) {
    throw new Error("SBX_EVIDENCE_DENIED:CONTROL_SCHEMA");
  }
}
console.log(JSON.stringify({ control: "SBX-21/SBX-22/SBX-25/SBX-30", result: "PASS", status: manifest.status, controls: manifest.controls.length }));
