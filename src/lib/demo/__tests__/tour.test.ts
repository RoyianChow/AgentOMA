import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEMO_BOUNDARY, DEMO_STAGES } from "../tour";

const ROOTS = [
  join(process.cwd(), "src", "app", "(site)", "demo"),
  join(process.cwd(), "src", "lib", "demo"),
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

describe("public guided demo", () => {
  it("covers the product loop with unique, synthetic stages", () => {
    expect(DEMO_STAGES).toHaveLength(5);
    expect(new Set(DEMO_STAGES.map((stage) => stage.id)).size).toBe(5);
    expect(DEMO_STAGES.every((stage) => stage.fields.length >= 4)).toBe(true);
    expect(
      DEMO_BOUNDARY.some((item) => item.toLowerCase().includes("synthetic")),
    ).toBe(true);
    expect(
      DEMO_BOUNDARY.some((item) => item.startsWith("Nothing is saved")),
    ).toBe(true);
  });

  it("cannot persist data, bypass auth, or expose billing and clinical authority", () => {
    const source = ROOTS.flatMap(sourceFiles)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(source).not.toMatch(
      /@\/lib\/db|drizzle-orm|better-auth|@\/lib\/auth|["']use server["']/,
    );
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    expect(source).not.toMatch(/console\.(log|warn|error|debug)/);
    expect(source).not.toMatch(/deriveClaimDraft|ailment-reference/);

    const triageImport = source.match(
      /import\s*\{([^}]+)\}\s*from\s*["']@\/config\/triage["']/,
    );
    const importedNames = triageImport?.[1]
      .split(",")
      .map((name) => name.trim())
      .sort((left, right) => left.localeCompare(right, "en-US", { sensitivity: "variant", numeric: false }));

    expect(importedNames).toEqual(["AILMENT_LABELS", "ALL_AILMENT_IDS"]);
    expect(source).not.toMatch(
      /\b(?:ASSESSMENT_POLICY|EMERGENCY_SIGNS|NODES|RED_FLAGS|TRIAGE_ROOT|UTI_PRESENTATION_CRITERIA|validateTriageDefinition)\b/,
    );
    expect(source).not.toMatch(/healthNumber|healthCard|dateOfBirth|\bdob\b/);
    expect(source).not.toMatch(/<input|<textarea|contentEditable/);
    expect(source).not.toMatch(/\b98\d{5}\b/);
  });
});
