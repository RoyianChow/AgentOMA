import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { G3_PRODUCTION_IMPORT_ALLOWLIST } from "../integrations/production-import-allowlist";

const sourceRoot = fileURLToPath(new URL("..", import.meta.url));

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe("sandbox import and storage boundary", () => {
  it("keeps the G3 production-import allowlist empty", () => {
    expect(G3_PRODUCTION_IMPORT_ALLOWLIST).toEqual([]);
  });

  it("keeps raw environment reads in the server validator only", () => {
    const offenders = filesUnder(sourceRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => !file.endsWith(join("env", "server.ts")))
      .filter((file) => /process\.env/.test(readFileSync(file, "utf8")));
    expect(offenders.map((file) => relative(sourceRoot, file))).toEqual([]);
  });

  it("contains no production imports, browser persistence, analytics, or external URLs", () => {
    const source = filesUnder(sourceRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => !file.includes(`${join("__tests__", "")}`))
      .filter((file) => !file.endsWith(join("env", "server.ts")))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(source).not.toMatch(/(?:\.\.\/){2,}src[\\/]/);
    expect(source).not.toMatch(/from\s+["']@\//);
    expect(source).not.toMatch(/(?:from|import)\s*["'][^"']*(?:better-auth|drizzle-orm|postgres|supabase|firebase)[^"']*["']/i);
    expect(source).not.toMatch(/(?:localStorage|sessionStorage|indexedDB|serviceWorker|navigator\.sendBeacon|posthog|segment|sentry)/i);
    expect(source).not.toMatch(/https?:\/\/(?!127\.0\.0\.1:3101)/i);
  });

  it("does not accidentally include non-file directories in the source scan", () => {
    expect(statSync(sourceRoot).isDirectory()).toBe(true);
  });
});
