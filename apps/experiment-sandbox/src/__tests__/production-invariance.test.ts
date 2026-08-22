import { describe, expect, it } from "vitest";

import {
  assertNoSandboxFiles,
  canonicalizeProductionRuntimeScripts,
  canonicalizeRepositoryPaths,
  hash,
} from "../../tools/production-invariance.mjs";

describe("production required-server-files canonicalization", () => {
  it("produces the same entries and hash for Windows and Linux paths", () => {
    const windows = canonicalizeRepositoryPaths(
      [
        "C:\\runner\\work\\AgentOMA\\AgentOMA\\.next\\server\\pages-manifest.json",
        "C:\\runner\\work\\AgentOMA\\AgentOMA\\.next\\package.json",
      ],
      "C:\\runner\\work\\AgentOMA\\AgentOMA",
    );
    const linux = canonicalizeRepositoryPaths(
      [
        "/home/runner/work/AgentOMA/AgentOMA/.next/server/pages-manifest.json",
        "/home/runner/work/AgentOMA/AgentOMA/.next/package.json",
      ],
      "/home/runner/work/AgentOMA/AgentOMA",
    );

    expect(windows).toEqual(linux);
    expect(hash(windows)).toBe(hash(linux));
  });

  it("keeps sandbox files in the comparison input and fails closed", () => {
    const canonical = canonicalizeRepositoryPaths(
      ["/repo/.next/server/experiment-sandbox/route.js"],
      "/repo",
    );

    expect(canonical).toEqual([".next/server/experiment-sandbox/route.js"]);
    expect(() => assertNoSandboxFiles(canonical)).toThrow(
      "SBX_INVARIANCE_DENIED:SANDBOX_FILE_IN_REQUIRED_SERVER_FILES",
    );
  });
});

describe("production runtime script canonicalization", () => {
  const originalScripts = {
    dev: "next dev",
    build: "next build",
    start: "next start",
    lint: "eslint",
    test: "vitest run",
    "db:migrate": "drizzle-kit migrate",
  };

  it("ignores non-runtime CI, test, database, and sandbox commands", () => {
    const baseline = canonicalizeProductionRuntimeScripts(originalScripts);
    const current = canonicalizeProductionRuntimeScripts({
      ...originalScripts,
      typecheck: "tsc --noEmit",
      "security:raw-env-access": "tsx tools/check.ts",
      "test:db:up": "docker compose up",
      "sandbox:build": "npm run build --workspace sandbox",
    });

    expect(current).toEqual(baseline);
    expect(hash(current)).toBe(hash(baseline));
  });

  it.each([
    ["build", "next build --unsafe-change"],
    ["start", "next start --unsafe-change"],
    ["prebuild", "node tools/change-production-build.mjs"],
    ["postinstall", "node tools/change-installed-runtime.mjs"],
    ["vercel-build", "next build --hosting-override"],
  ])("detects a production-impacting %s script", (name, command) => {
    const baseline = canonicalizeProductionRuntimeScripts(originalScripts);
    const mutated = canonicalizeProductionRuntimeScripts({
      ...originalScripts,
      [name]: command,
    });

    expect(hash(mutated)).not.toBe(hash(baseline));
  });
});
