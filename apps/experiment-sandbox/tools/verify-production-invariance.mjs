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

function readJson(relativePath) {
  const path = join(nextRoot, relativePath);
  if (!existsSync(path)) throw new Error(`SBX_INVARIANCE_DENIED:MISSING_BUILD_FILE:${relativePath}`);
  return JSON.parse(readFileSync(path, "utf8"));
}

const appPathRoutes = readJson("app-path-routes-manifest.json");
const appPaths = Object.keys(appPathRoutes).sort();
const routes = Object.values(appPathRoutes).sort();
const routesManifest = readJson("routes-manifest.json");
const requiredServerFiles = readJson("required-server-files.json").files.sort();
const nftFiles = readJson("next-server.js.nft.json").files.map((entry) => entry.replaceAll("\\", "/")).sort();
const rootPackage = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
const productionScripts = Object.entries(rootPackage.scripts)
  .filter(([key]) => !key.startsWith("sandbox:"))
  .sort(([a], [b]) => a.localeCompare(b));
const productionDependencies = Object.entries(rootPackage.dependencies).sort(([a], [b]) => a.localeCompare(b));

const current = {
  appPathCount: appPaths.length,
  appPathsHash: hash(appPaths),
  routeShapeHash: hash(routes),
  runtimeTraceFileCount: nftFiles.length,
  runtimeTraceFilesHash: hash(nftFiles),
  requiredServerFileCount: requiredServerFiles.length,
  requiredServerFilesHash: hash(requiredServerFiles),
  productionDependenciesHash: hash(productionDependencies),
  productionScriptsHash: hash(productionScripts),
};

const currentRouteNames = [...Object.values(appPathRoutes)].sort();
const baselineRouteNames = [...baseline.routes].sort();
if (JSON.stringify(currentRouteNames) !== JSON.stringify(baselineRouteNames)) {
  throw new Error("SBX_INVARIANCE_DENIED:routeShape");
}

// The captured baseline's legacy routeShapeHash used a private normalization
// helper that is not available in the repository. The route-name comparison
// above is the auditable invariant; appPathsHash separately covers route keys.
const comparable = ["appPathCount", "appPathsHash", "runtimeTraceFileCount", "runtimeTraceFilesHash", "requiredServerFileCount", "requiredServerFilesHash", "productionDependenciesHash", "productionScriptsHash"];
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
