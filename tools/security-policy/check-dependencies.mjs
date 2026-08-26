import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  evaluateDependencyPolicy,
  extractDependencyFindings,
} from "../../src/lib/security-policy/dependency-audit.ts";

const toolRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(toolRoot, "../..");

function readPolicy(name) {
  try {
    return JSON.parse(readFileSync(join(toolRoot, name), "utf8"));
  } catch {
    throw new Error(`DEPENDENCY_AUDIT_DENIED:INVALID_POLICY_FILE:${name}`);
  }
}

const npmCli = process.env.npm_execpath;
if (!npmCli || !/npm-cli\.(?:c?js)$/i.test(npmCli)) {
  throw new Error("DEPENDENCY_AUDIT_DENIED:NPM_CLI_UNAVAILABLE");
}
const audit = spawnSync(process.execPath, [npmCli, "audit", "--json"], {
  cwd: repositoryRoot,
  encoding: "utf8",
  windowsHide: true,
  env: process.env,
});
if (
  audit.error ||
  (audit.status !== 0 && audit.status !== 1) ||
  typeof audit.stdout !== "string" ||
  audit.stdout.length === 0
) {
  throw new Error("DEPENDENCY_AUDIT_DENIED:AUDIT_COMMAND_FAILED");
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  throw new Error("DEPENDENCY_AUDIT_DENIED:MALFORMED_AUDIT_OUTPUT");
}

const register = readPolicy("dependency-findings.json");
const exceptions = readPolicy("dependency-exceptions.json");
if (
  register.schemaVersion !== 1 ||
  !Array.isArray(register.findings) ||
  exceptions.schemaVersion !== 1 ||
  !Array.isArray(exceptions.exceptions)
) {
  throw new Error("DEPENDENCY_AUDIT_DENIED:UNSUPPORTED_POLICY_SCHEMA");
}

const findings = extractDependencyFindings(report);
const result = evaluateDependencyPolicy({
  findings,
  registered: register.findings,
  exceptions: exceptions.exceptions,
});

if (result.violations.length > 0) {
  console.error(
    JSON.stringify({
      control: "SEC-DEPENDENCIES",
      result: "FAIL",
      findingCount: result.activeFindings.length,
      violations: result.violations,
    }),
  );
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify({
      control: "SEC-DEPENDENCIES",
      result: "PASS",
      openRegisteredFindings: result.activeFindings,
      resolvedRegisteredFindings: result.resolvedRegisteredFindings,
      exceptionCount: exceptions.exceptions.length,
    }),
  );
}
