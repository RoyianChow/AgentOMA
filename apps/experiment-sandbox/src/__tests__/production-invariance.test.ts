import { describe, expect, it } from "vitest";

import {
  assertNoSandboxFiles,
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
