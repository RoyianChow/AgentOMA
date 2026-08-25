#!/usr/bin/env node
// BND-01 CLI — walks the production (src/) and sandbox
// (apps/experiment-sandbox/src/) source trees and reports any import that
// crosses the isolation boundary between them. The actual AST-detection and
// boundary-checking logic lives in
// src/lib/security-policy/forbidden-imports.ts (real vitest coverage there);
// this script is just the filesystem walk + wiring for CI.
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
// Importing a .ts module directly requires tsx's loader — this script is
// invoked via `tsx tools/security-policy/check-forbidden-imports.mjs` (see
// the "security:forbidden-imports" npm script), the same pattern every other
// TS-importing script in this repo's package.json already uses.
import { findImportSpecifiers, checkImportBoundary } from "../../src/lib/security-policy/forbidden-imports.ts";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

const PRODUCTION_ROOT = "src";
const SANDBOX_ROOT = "apps/experiment-sandbox/src";
const SANDBOX_PACKAGE_NAME = "@agentoma/experiment-sandbox";
const EXCLUDED_DIR_NAMES = new Set(["node_modules", ".next", "dist", ".git", "coverage"]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);

function* walk(dir) {
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIR_NAMES.has(dirent.name)) continue;
    const full = join(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* walk(full);
    } else if (SOURCE_EXTENSIONS.has(extname(dirent.name))) {
      yield full;
    }
  }
}

function scanZone(root, zone) {
  const violations = [];
  const absoluteRoot = join(repoRoot, root);
  try {
    statSync(absoluteRoot);
  } catch {
    return violations; // root doesn't exist in this checkout; skip rather than fail
  }
  for (const filePath of walk(absoluteRoot)) {
    const relPath = relative(repoRoot, filePath).replaceAll("\\", "/");
    const text = readFileSync(filePath, "utf8");
    const hits = findImportSpecifiers(relPath, text);
    if (hits.length === 0) continue;
    violations.push(
      ...checkImportBoundary(relPath, hits, zone, PRODUCTION_ROOT, SANDBOX_ROOT, SANDBOX_PACKAGE_NAME),
    );
  }
  return violations;
}

const violations = [
  ...scanZone(PRODUCTION_ROOT, "production"),
  ...scanZone(SANDBOX_ROOT, "sandbox"),
];

if (violations.length > 0) {
  console.error(`BND-01 FAIL: ${violations.length} import(s) cross the production/sandbox isolation boundary:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  "${v.specifier}"  (${v.reason})`);
  }
  console.error(`\nAGENTS.md invariant: the app serves ONE pharmacy and Task 01's safety model depends on`);
  console.error(`apps/experiment-sandbox/ being unreachable from src/, and the sandbox never importing`);
  console.error(`unreviewed production code. There is no allowlist for this control — remove the import.`);
  process.exit(1);
}

console.log(JSON.stringify({ control: "BND-01", result: "PASS", scannedRoots: [PRODUCTION_ROOT, SANDBOX_ROOT] }));
