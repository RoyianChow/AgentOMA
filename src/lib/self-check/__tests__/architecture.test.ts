import { createHash } from "node:crypto";
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

  it("uses the company logo in the browser-generated report", () => {
    const pdf = readFileSync(
      join(process.cwd(), "src", "lib", "self-check", "pdf.ts"),
      "utf8",
    );

    expect(pdf).toContain('fetch("/logo.png"');
    expect(pdf).toContain("doc.addImage(");
    expect(pdf).toContain("drawFinePrintFooter");
  });

  it("releases the route only against the recorded P0-A-approved source", () => {
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
    const triage = readFileSync(
      join(process.cwd(), "src", "config", "triage.ts"),
      "utf8",
    );
    const approval = readFileSync(
      join(process.cwd(), "docs", "CLINICAL_APPROVAL.md"),
      "utf8",
    );
    const approvedHash = createHash("sha256")
      .update(triage.replace(/\r\n/g, "\n"))
      .digest("hex");

    expect(page).not.toContain("notFound()");
    expect(page).not.toContain("env.NODE_ENV");
    expect(triage).toContain('clinicalApprovalStatus: "approved"');
    expect(approval).toContain(`\`${approvedHash}\``);
  });
});
