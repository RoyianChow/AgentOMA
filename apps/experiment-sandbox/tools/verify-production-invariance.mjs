import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const nextRoot = join(repositoryRoot, ".next");
const baseline = JSON.parse(readFileSync(join(repositoryRoot, "docs/task-01/evidence/baseline-production.json"), "utf8"));

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const compareStrings = (left, right) => left.localeCompare(right, "en-US", { sensitivity: "variant", numeric: false });
const compareTupleKeys = ([left], [right]) => compareStrings(left, right);

// Next's standalone file trace includes optional native packages whose names
// differ by runner OS/CPU (for example sharp-win32-x64 vs sharp-linux-x64).
// Keep the full trace for diagnostics, but compare only the portable portion
// so a Windows-captured baseline is enforceable on the Linux CI runner too.
const PLATFORM_SPECIFIC_TRACE = /(^|\/)(?:[^/]*(?:win32|linux|darwin|freebsd|android|openharmony|wasi|aix|sunos|haiku|msvc|musl|gnu|arm64|x64|ia32)[^/]*)\/|\.node$/i;

function readJson(relativePath) {
  const path = join(nextRoot, relativePath);
  if (!existsSync(path)) throw new Error(`SBX_INVARIANCE_DENIED:MISSING_BUILD_FILE:${relativePath}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

const appPathRoutes = readJson("app-path-routes-manifest.json");
const appPaths = Object.keys(appPathRoutes).sort(compareStrings);
const routes = Object.values(appPathRoutes).sort(compareStrings);
const routesManifest = readJson("routes-manifest.json");
const requiredServerFiles = readJson("required-server-files.json").files.sort(compareStrings);
const nftFiles = readJson("next-server.js.nft.json").files.map((entry) => entry.replaceAll("\\", "/")).sort(compareStrings);
const portableNftFiles = nftFiles.filter((entry) => !PLATFORM_SPECIFIC_TRACE.test(entry));
const rootPackage = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
const productionScripts = Object.entries(rootPackage.scripts)
  .filter(([key]) => !key.startsWith("sandbox:"))
  .sort(compareTupleKeys);
const productionDependencies = Object.entries(rootPackage.dependencies).sort(compareTupleKeys);

const current = {
  appPathCount: appPaths.length,
  appPathsHash: hash(appPaths),
  routeShapeHash: hash(routes),
  runtimeTraceFileCount: nftFiles.length,
  runtimeTraceFilesHash: hash(nftFiles),
  portableRuntimeTraceFileCount: portableNftFiles.length,
  portableRuntimeTraceFilesHash: hash(portableNftFiles),
  requiredServerFileCount: requiredServerFiles.length,
  requiredServerFilesHash: hash(requiredServerFiles),
  productionDependenciesHash: hash(productionDependencies),
  productionScriptsHash: hash(productionScripts),
};

const currentRouteNames = [...Object.values(appPathRoutes)].sort(compareStrings);
const baselineRouteNames = [...baseline.routes].sort(compareStrings);
if (JSON.stringify(currentRouteNames) !== JSON.stringify(baselineRouteNames)) {
  throw new Error("SBX_INVARIANCE_DENIED:routeShape");
}

// The captured baseline's legacy routeShapeHash used a private normalization
// helper that is not available in the repository. The route-name comparison
// above is the auditable invariant; appPathsHash separately covers route keys.
const comparable = ["appPathCount", "appPathsHash", "portableRuntimeTraceFileCount", "portableRuntimeTraceFilesHash", "requiredServerFileCount", "requiredServerFilesHash", "productionDependenciesHash", "productionScriptsHash"];
for (const key of comparable) {
  if (current[key] !== baseline.normalizedProduction[key]) {
    throw new Error(`SBX_INVARIANCE_DENIED:${key}`);
  }
}

const buildText = JSON.stringify(appPathRoutes) + JSON.stringify(routesManifest) + nftFiles.join("\n");
if (/(experiment-sandbox|@agentoma\/experiment-sandbox|SANDBOX_|SYNTHETIC DATA|3101|\.next-sandbox)/.test(buildText)) {
  throw new Error("SBX_INVARIANCE_DENIED:SANDBOX_MARKER_IN_PRODUCTION_BUILD");
}
console.log(JSON.stringify({ control: "SBX-01/SBX-02/SBX-03/SBX-23/SBX-24/SBX-26", result: "PASS", ...current }));
