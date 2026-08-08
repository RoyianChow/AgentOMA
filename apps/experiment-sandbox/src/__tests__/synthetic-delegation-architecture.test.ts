import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
} from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(import.meta.dirname, "..");
const delegationModule = join(
  sourceRoot,
  "booking",
  "synthetic-delegation-fixtures.ts",
);
const clientDirective = /^\s*["']use client["'];/m;

type SourceAccess = Readonly<{
  readSource: (file: string) => string;
  fileExists: (file: string) => boolean;
}>;

function filesUnder(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const candidate = join(root, entry);
    return statSync(candidate).isDirectory()
      ? filesUnder(candidate)
      : [candidate];
  });
}

function importedModuleSpecifiers(source: string): string[] {
  return [
    ...source.matchAll(
      /(?:import|export)\s+(?:type\s+)?(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g,
    ),
    ...source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
  ].map((match) => match[1]!);
}

function resolveLocalModule(
  importer: string,
  specifier: string,
  access: SourceAccess,
): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const base = resolve(dirname(importer), specifier);
  const extension = extname(base).toLowerCase();
  const sourceBase =
    extension === "" ? base : base.slice(0, -extension.length);
  const candidates = (() => {
    switch (extension) {
      case "":
        return [
          `${base}.ts`,
          `${base}.tsx`,
          join(base, "index.ts"),
          join(base, "index.tsx"),
        ];
      case ".js":
        return [`${sourceBase}.ts`, `${sourceBase}.tsx`, base];
      case ".jsx":
        return [`${sourceBase}.tsx`, `${sourceBase}.ts`, base];
      case ".mjs":
        return [
          `${sourceBase}.mts`,
          `${sourceBase}.ts`,
          `${sourceBase}.tsx`,
          base,
        ];
      case ".cjs":
        return [
          `${sourceBase}.cts`,
          `${sourceBase}.ts`,
          `${sourceBase}.tsx`,
          base,
        ];
      default:
        return [base];
    }
  })();
  return candidates.find(access.fileExists);
}

function delegationClientGraphViolations(
  entries: readonly string[],
  access: SourceAccess,
  forbiddenModule: string,
): string[] {
  const visited = new Set<string>();
  const violations: string[] = [];
  const visit = (file: string): void => {
    if (visited.has(file)) return;
    visited.add(file);
    for (const specifier of importedModuleSpecifiers(
      access.readSource(file),
    )) {
      const resolved = resolveLocalModule(file, specifier, access);
      if (resolved === undefined) continue;
      if (resolved === forbiddenModule) {
        violations.push(
          `${relative(sourceRoot, file).replaceAll("\\", "/")}:${specifier}`,
        );
        continue;
      }
      visit(resolved);
    }
  };
  for (const entry of entries) visit(entry);
  return violations.sort();
}

describe("Task 04 synthetic delegation server-only architecture", () => {
  it("keeps the committed client graph outside the delegation fixture module", () => {
    const clientEntries = filesUnder(sourceRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        clientDirective.test(readFileSync(file, "utf8")),
      );
    expect(
      delegationClientGraphViolations(
        clientEntries,
        {
          readSource: (file) => readFileSync(file, "utf8"),
          fileExists: existsSync,
        },
        delegationModule,
      ),
    ).toEqual([]);

    const imports = importedModuleSpecifiers(
      readFileSync(delegationModule, "utf8"),
    );
    const access = {
      readSource: (file: string) => readFileSync(file, "utf8"),
      fileExists: existsSync,
    };
    for (const specifier of imports) {
      if (specifier === "zod") continue;
      const resolved = resolveLocalModule(
        delegationModule,
        specifier,
        access,
      );
      expect(resolved).toBeDefined();
      expect(relative(sourceRoot, resolved!)).not.toMatch(
        /^\.\.(?:[\\/]|$)/,
      );
    }
  });

  it("rejects direct and transitive client imports while accepting a safe UI helper", () => {
    const fixtureRoot = join(
      sourceRoot,
      "__task04_delegation_architecture_fixture__",
    );
    const directClient = join(fixtureRoot, "direct-client.tsx");
    const transitiveClient = join(
      fixtureRoot,
      "transitive-client.tsx",
    );
    const reexportClient = join(fixtureRoot, "reexport-client.tsx");
    const explicitTsClient = join(
      fixtureRoot,
      "explicit-ts-client.tsx",
    );
    const directJsClient = join(fixtureRoot, "direct-js-client.tsx");
    const unsafeImportHelper = join(
      fixtureRoot,
      "unsafe-import-helper.ts",
    );
    const unsafeReexportHelper = join(
      fixtureRoot,
      "unsafe-reexport-helper.ts",
    );
    const safeClient = join(fixtureRoot, "safe-client.tsx");
    const safeHelper = join(fixtureRoot, "safe-helper.ts");
    const virtualDelegationModule = join(
      fixtureRoot,
      "synthetic-delegation-fixtures.ts",
    );
    const sources = new Map<string, string>([
      [
        directClient,
        '"use client"; import "./synthetic-delegation-fixtures";',
      ],
      [
        transitiveClient,
        '"use client"; import "./unsafe-import-helper.js";',
      ],
      [
        reexportClient,
        '"use client"; import "./unsafe-reexport-helper";',
      ],
      [
        explicitTsClient,
        '"use client"; import "./synthetic-delegation-fixtures.ts";',
      ],
      [
        directJsClient,
        '"use client"; import "./synthetic-delegation-fixtures.js";',
      ],
      [
        unsafeImportHelper,
        'import { fixture } from "./synthetic-delegation-fixtures.js"; export const helper = fixture;',
      ],
      [
        unsafeReexportHelper,
        'export * from "./synthetic-delegation-fixtures.js";',
      ],
      [
        safeClient,
        '"use client"; import { label } from "./safe-helper"; export { label };',
      ],
      [safeHelper, 'export const label = "Synthetic booking";'],
      [
        virtualDelegationModule,
        'export const fixture = "server-owned";',
      ],
    ]);
    const access = {
      readSource: (file: string) => sources.get(file)!,
      fileExists: (file: string) => sources.has(file),
    };

    expect(
      delegationClientGraphViolations(
        [directClient],
        access,
        virtualDelegationModule,
      ),
    ).toEqual([
      "__task04_delegation_architecture_fixture__/direct-client.tsx:./synthetic-delegation-fixtures",
    ]);
    expect(
      delegationClientGraphViolations(
        [directJsClient],
        access,
        virtualDelegationModule,
      ),
    ).toEqual([
      "__task04_delegation_architecture_fixture__/direct-js-client.tsx:./synthetic-delegation-fixtures.js",
    ]);
    expect(
      delegationClientGraphViolations(
        [explicitTsClient],
        access,
        virtualDelegationModule,
      ),
    ).toEqual([
      "__task04_delegation_architecture_fixture__/explicit-ts-client.tsx:./synthetic-delegation-fixtures.ts",
    ]);
    expect(
      delegationClientGraphViolations(
        [transitiveClient],
        access,
        virtualDelegationModule,
      ),
    ).toEqual([
      "__task04_delegation_architecture_fixture__/unsafe-import-helper.ts:./synthetic-delegation-fixtures.js",
    ]);
    expect(
      delegationClientGraphViolations(
        [reexportClient],
        access,
        virtualDelegationModule,
      ),
    ).toEqual([
      "__task04_delegation_architecture_fixture__/unsafe-reexport-helper.ts:./synthetic-delegation-fixtures.js",
    ]);
    expect(
      delegationClientGraphViolations(
        [safeClient],
        access,
        virtualDelegationModule,
      ),
    ).toEqual([]);
  });
});
