import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(new URL("../src/evidence/sample-pdf.ts", import.meta.url));
const source = readFileSync(modulePath, "utf8");
if (!source.includes("EXPERIMENT - SYNTHETIC DATA - NOT FOR PATIENT CARE")) {
  throw new Error("SBX_ARTIFACT_DENIED:WATERMARK_SOURCE_MISSING");
}
console.log(JSON.stringify({ control: "SBX-08/SBX-09/SBX-14", result: "PASS", reasonCode: "MARKED_SAMPLE_SOURCE_PRESENT" }));
