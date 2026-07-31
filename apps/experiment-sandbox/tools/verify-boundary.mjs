import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const sandboxRoot = resolve(toolDirectory, "..");
const repositoryRoot = resolve(sandboxRoot, "../..");
const safeFailure = (reason) => {
  throw new Error(`SBX_BOUNDARY_DENIED:${reason}`);
};

const requiredFiles = [
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "src/env/server.ts",
  "src/proxy.ts",
  "src/integrations/production-import-allowlist.ts",
  "tools/deny-egress.cjs",
  "tools/next-with-deny.ts",
];

for (const file of requiredFiles) {
  if (!existsSync(join(sandboxRoot, file))) safeFailure(`MISSING_FILE:${file}`);
}

const rootPackage = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
if (JSON.stringify(rootPackage.workspaces) !== JSON.stringify(["apps/experiment-sandbox"])) {
  safeFailure("WORKSPACE_REGISTRATION");
}
if (!rootPackage.scripts["sandbox:verify"] || !rootPackage.scripts["sandbox:build"]) {
  safeFailure("ROOT_SCRIPT_REGISTRATION");
}

const sandboxPackage = JSON.parse(readFileSync(join(sandboxRoot, "package.json"), "utf8"));
if (sandboxPackage.name !== "@agentoma/experiment-sandbox" || sandboxPackage.private !== true) {
  safeFailure("PACKAGE_IDENTITY");
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

const sandboxSourceFiles = sourceFiles(join(sandboxRoot, "src"))
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .filter((file) => !file.includes(`${join("__tests__", "")}`))
  .filter((file) => !file.endsWith(join("env", "server.ts")));
const sourceText = sandboxSourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");
const envReaders = sandboxSourceFiles.filter((file) => !file.endsWith(join("env", "server.ts")) && /process\.env/.test(readFileSync(file, "utf8")));
if (envReaders.length > 0) safeFailure("RAW_ENV_READ_OUTSIDE_VALIDATOR");
if (/(?:from|import)\s*["'][^"']*(?:better-auth|drizzle-orm|postgres|supabase|firebase)[^"']*["']/i.test(sourceText)) {
  safeFailure("PRODUCTION_IMPORT");
}
if (/(?:localStorage|sessionStorage|indexedDB|serviceWorker|sendBeacon|posthog|segment|sentry)/i.test(sourceText)) {
  safeFailure("BROWSER_PERSISTENCE_OR_ANALYTICS");
}
if (/from\s*["'](?:node:http|node:https|node:net|node:tls|node:dns|node:dgram)["']/.test(sourceText)) {
  safeFailure("RAW_NETWORK_IMPORT");
}

const productionSource = sourceFiles(join(repositoryRoot, "src"))
  .filter((file) => /\.(ts|tsx|mts|cts)$/.test(file))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
if (/experiment-sandbox|SANDBOX_|SYNTHETIC DATA/.test(productionSource)) safeFailure("PRODUCTION_IMPORTS_SANDBOX");

const allowlistText = readFileSync(join(sandboxRoot, "src/integrations/production-import-allowlist.ts"), "utf8");
if (!/G3_PRODUCTION_IMPORT_ALLOWLIST\s*=\s*\[\]\s+as\s+const/.test(allowlistText)) safeFailure("G3_ALLOWLIST_NOT_EMPTY");

const digest = createHash("sha256").update(sourceText).digest("hex");
console.log(JSON.stringify({
  control: "SBX-01/SBX-02/SBX-03/SBX-04/SBX-05/SBX-06/SBX-07/SBX-10/SBX-11/SBX-12/SBX-13/SBX-16/SBX-20",
  result: "PASS",
  sandboxSourceFiles: sandboxSourceFiles.length,
  sourceHash: digest,
  productionRoot: relative(process.cwd(), repositoryRoot),
}));
