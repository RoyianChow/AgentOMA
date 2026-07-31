import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { loadSandboxEnv, sandboxChildEnvironment } from "../src/env/server";

// Prefer the sandbox-local Next install so its framework singletons stay in
// one module graph. A clean npm workspace install falls back to the hoisted
// repository copy; CI installs this workspace locally before building.
const localRequire = createRequire(import.meta.url);
const workspaceRequire = createRequire(new URL("../../../package.json", import.meta.url));
const command = process.argv[2];
if (!command || !["dev", "build", "start"].includes(command)) {
  throw new Error("SANDBOX_COMMAND_DENIED:EXPECTED_NEXT_COMMAND");
}

const env = loadSandboxEnv({ phase: command === "build" ? "build" : "startup" });
const nextBin = (() => {
  try {
    return localRequire.resolve("next/dist/bin/next");
  } catch {
    return workspaceRequire.resolve("next/dist/bin/next");
  }
})();
const denialPreload = fileURLToPath(new URL("./deny-egress.cjs", import.meta.url));
const nextArguments = process.argv.slice(2);
if (command === "build") nextArguments.push("--webpack");
const result = spawnSync(
  process.execPath,
  ["--require", denialPreload, nextBin, ...nextArguments],
  {
    cwd: process.cwd(),
    env: sandboxChildEnvironment(env),
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
