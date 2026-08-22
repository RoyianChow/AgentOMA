#!/usr/bin/env node
// PRV-01 CLI — walks the repository's source trees and reports any raw
// process.env access outside tools/security-policy/raw-env-access-allowlist.json.
// The actual AST-detection and allowlist-matching logic lives in
// src/lib/security-policy/raw-env-access.ts (real vitest coverage there);
// this script is just the filesystem walk + wiring for CI.
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
// Importing a .ts module directly requires tsx's loader — this script is
// invoked via `tsx tools/security-policy/check-raw-env-access.mjs` (see the
// "security-policy" npm script), the same pattern every other TS-importing
// script in this repo's package.json already uses.
import { findRawEnvAccess, checkFileAgainstAllowlist } from "../../src/lib/security-policy/raw-env-access.ts";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const allowlistPath = join(repoRoot, "tools/security-policy/raw-env-access-allowlist.json");
const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));

const SCAN_ROOTS = ["src", "tools", "apps/experiment-sandbox/src"];
const EXCLUDED_DIR_NAMES = new Set(["node_modules", ".next", "dist", ".git", "coverage"]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);

/** Fail closed: an allowlist entry pointing at a file that no longer exists
 * silently stops protecting anything, which is worse than no entry at all. */
for (const entry of allowlist.entries) {
  try {
    statSync(join(repoRoot, entry.file));
  } catch {
    console.error(`PRV-01 FAIL: allowlist entry references a file that no longer exists: ${entry.file}`);
    process.exit(1);
  }
}

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

let violations = [];

for (const root of SCAN_ROOTS) {
  const absoluteRoot = join(repoRoot, root);
  try {
    statSync(absoluteRoot);
  } catch {
    continue; // root doesn't exist in this checkout; skip rather than fail
  }
  for (const filePath of walk(absoluteRoot)) {
    const relPath = relative(repoRoot, filePath).replaceAll("\\", "/");
    const text = readFileSync(filePath, "utf8");
    const hits = findRawEnvAccess(relPath, text);
    if (hits.length === 0) continue;
    violations.push(...checkFileAgainstAllowlist(relPath, hits, allowlist));
  }
}

if (violations.length > 0) {
  console.error(`PRV-01 FAIL: ${violations.length} raw process.env access(es) outside the approved allowlist:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  process.env.${v.key}  (${v.reason})`);
  }
  console.error(`\nAllowlist: tools/security-policy/raw-env-access-allowlist.json`);
  console.error(`Fix: read this value through src/env.ts instead, or add a reviewed, owned, dated allowlist entry if this genuinely needs a direct exception.`);
  process.exit(1);
}

console.log(JSON.stringify({ control: "PRV-01", result: "PASS", scannedRoots: SCAN_ROOTS }));
