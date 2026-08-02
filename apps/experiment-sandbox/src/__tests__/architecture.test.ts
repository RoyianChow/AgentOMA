import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { G3_PRODUCTION_IMPORT_ALLOWLIST } from "../integrations/production-import-allowlist";

const sourceRoot = fileURLToPath(new URL("..", import.meta.url));
const toolsRoot = fileURLToPath(new URL("../../tools", import.meta.url));
const boundaryVerifier = join(toolsRoot, "verify-boundary.mjs");
const clientModuleDirective = /^\s*["']use client["'];/m;
const slotReferenceSecretName =
  /TASK04_PUBLIC_SLOT_REFERENCE_SECRET|publicSlotReferenceSecret/;

function importedModuleSpecifiers(source: string): string[] {
  return [
    ...source.matchAll(
      /(?:from\s+|import\s*\(\s*|import\s+)\s*["']([^"']+)["']/g,
    ),
  ].map((match) => match[1]!.replaceAll("\\", "/"));
}

function isServerOwnedModuleSpecifier(specifier: string): boolean {
  return (
    /(?:^|\/)env\/server(?:$|[./])/.test(specifier) ||
    /(?:^|\/)db(?:\/|$)/.test(specifier) ||
    /(?:^|\/)public-slot-reference(?:$|[./])/.test(specifier)
  );
}

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
    const offenders = [...filesUnder(sourceRoot), ...filesUnder(toolsRoot)]
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => !file.endsWith(join("env", "server.ts")))
      .filter((file) => /process\.env/.test(readFileSync(file, "utf8")));
    expect(offenders.map((file) => relative(sourceRoot, file))).toEqual([]);
  });

  it("keeps authoritative raw request sizing behind the server database boundary", () => {
    const guardName =
      "assertTask04AuthoritativeRawRequestWithinLimit";
    const serverBoundary = join(sourceRoot, "db", "transaction.ts");
    expect(readFileSync(serverBoundary, "utf8")).toContain(
      `export function ${guardName}`,
    );

    const sharedBookingOffenders = filesUnder(
      join(sourceRoot, "booking"),
    )
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        readFileSync(file, "utf8").includes(guardName),
      );
    expect(
      sharedBookingOffenders.map((file) =>
        relative(sourceRoot, file),
      ),
    ).toEqual([]);

    const clientOffenders = filesUnder(sourceRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return (
          clientModuleDirective.test(source) &&
          source.includes(guardName)
        );
      });
    expect(
      clientOffenders.map((file) => relative(sourceRoot, file)),
    ).toEqual([]);
  });

  it("keeps slot-reference secrets and services server-only", () => {
    const clientFiles = filesUnder(sourceRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        clientModuleDirective.test(readFileSync(file, "utf8")),
      );
    const clientOffenders = clientFiles.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return [
        ...(slotReferenceSecretName.test(source)
          ? [`${relative(sourceRoot, file)}:secret`]
          : []),
        ...importedModuleSpecifiers(source)
          .filter(isServerOwnedModuleSpecifier)
          .map(
            (specifier) =>
              `${relative(sourceRoot, file)}:${specifier}`,
          ),
      ];
    });
    expect(clientOffenders).toEqual([]);
    for (const forbiddenImport of [
      "../env/server",
      "../db/client",
      "../db/availability",
      "../db/public-slot-reference",
    ]) {
      expect(isServerOwnedModuleSpecifier(forbiddenImport)).toBe(true);
    }

    const sharedBookingSource = filesUnder(
      join(sourceRoot, "booking"),
    )
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(sharedBookingSource).not.toContain(
      "TASK04_PUBLIC_SLOT_REFERENCE_SECRET",
    );
    expect(sharedBookingSource).not.toContain(
      "publicSlotReferenceSecret",
    );
    expect(sharedBookingSource).not.toMatch(
      /from\s+["'][^"']*public-slot-reference[^"']*["']/,
    );
  });

  it("contains no production imports, browser persistence, analytics, or external URLs", () => {
    const sourceFiles = [...filesUnder(sourceRoot), ...filesUnder(toolsRoot)]
      .filter((file) => /\.(ts|tsx|mjs|cjs)$/.test(file))
      .filter((file) => !file.includes(`${join("__tests__", "")}`))
      .filter((file) => file !== boundaryVerifier)
      .filter((file) => !file.endsWith(join("env", "server.ts")));
    const source = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/(?:\.\.\/){2,}src[\\/]/);
    expect(source).not.toMatch(/from\s+["']@\//);
    expect(source).not.toMatch(
      /(?:from|import)\s*["'][^"']*(?:better-auth|drizzle-orm|supabase|firebase)[^"']*["']/i,
    );
    expect(source).not.toMatch(
      /(?:localStorage|sessionStorage|indexedDB|serviceWorker|navigator\.sendBeacon)/i,
    );
    expect(source).not.toMatch(
      /(?:from|import)\s*["'][^"']*(?:posthog|segment|sentry)[^"']*["']/i,
    );
    expect(source).not.toMatch(/https?:\/\/(?!127\.0\.0\.1:3101)/i);

    const postgresImportOffenders = sourceFiles
      .filter((file) => !file.includes(`${join("db", "")}`))
      .filter((file) =>
        /(?:from|import)\s*["'][^"']*postgres[^"']*["']/i.test(
          readFileSync(file, "utf8"),
        ),
      );
    expect(postgresImportOffenders.map((file) => relative(sourceRoot, file))).toEqual([]);
  });

  it("limits child-process launchers and requires explicit runner environment isolation", () => {
    const executableFiles = filesUnder(toolsRoot)
      .filter((file) => /\.(ts|mjs|cjs)$/.test(file));
    const launchers = executableFiles
      .filter((file) =>
        /["']node:child_process["']/.test(
          readFileSync(file, "utf8"),
        ),
      )
      .map((file) => relative(toolsRoot, file))
      .sort();
    expect(launchers).toEqual([
      "next-with-deny.ts",
      "run-postgres-tests.ts",
    ]);

    const runner = readFileSync(
      join(toolsRoot, "run-postgres-tests.ts"),
      "utf8",
    );
    expect(runner).toContain("loadTask04RunnerEnvironment");
    expect(runner).toContain("env,");
    expect(runner).toContain('"--context"');
    expect(runner).toContain('"default"');
    expect(runner).toContain("agentoma-task04-synthetic-tests");
    expect(runner).not.toMatch(/process\.env/);
  });

  it("does not accidentally include non-file directories in the source scan", () => {
    expect(statSync(sourceRoot).isDirectory()).toBe(true);
  });
});
