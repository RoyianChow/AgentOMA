import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = [
  join(process.cwd(), "src", "app", "(self-check)"),
  join(process.cwd(), "src", "lib", "self-check"),
];

function sourceFiles(path: string): string[] {
  return readdirSync(path).flatMap((entry) => {
    const fullPath = join(path, entry);
    if (statSync(fullPath).isDirectory()) {
      return entry === "__tests__" ? [] : sourceFiles(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

describe("public self-check architecture", () => {
  it("has no persistence, browser storage, PHI logging, or billing authority", () => {
    const source = ROOTS.flatMap(sourceFiles)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/@\/lib\/db|drizzle-orm|server-only/);
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    expect(source).not.toMatch(/console\.(log|warn|error|debug)/);
    expect(source).not.toMatch(/deriveClaimDraft|ailment-reference/);
    expect(source).not.toMatch(/healthNumber|healthCard|dateOfBirth|\bdob\b/);
  });

  it("imports the frozen triage source rather than copying it", () => {
    const flow = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "(self-check)",
        "check",
        "SelfCheckFlow.tsx",
      ),
      "utf8",
    );

    expect(flow).toContain('from "@/config/triage"');
    expect(flow).not.toMatch(/const\s+(NODES|RED_FLAGS|EMERGENCY_SIGNS)\s*=/);
  });

  it("keeps the route unreachable in production pending P0-A sign-off", () => {
    const page = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "(self-check)",
        "check",
        "page.tsx",
      ),
      "utf8",
    );

    expect(page).toContain('env.NODE_ENV === "production"');
    expect(page).toContain("notFound()");
  });
});
