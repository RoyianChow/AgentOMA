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
const clientDirective = /^\s*["']use client["'];/m;
const forbiddenServerModules = [
  join(sourceRoot, "db", "booking-expiry-worker.ts"),
  join(sourceRoot, "db", "authoritative-context.ts"),
  join(sourceRoot, "db", "idempotency.ts"),
  join(sourceRoot, "db", "audit.ts"),
  join(sourceRoot, "db", "outbox.ts"),
  join(sourceRoot, "db", "transaction.ts"),
  join(sourceRoot, "booking", "config.ts"),
  join(sourceRoot, "env", "server.ts"),
  join(sourceRoot, "lifecycle", "state.ts"),
] as const;

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
      default:
        return [base];
    }
  })();
  return candidates.find(access.fileExists);
}

function clientGraphViolations(
  entries: readonly string[],
  access: SourceAccess,
  forbiddenModules: ReadonlySet<string>,
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
      const relativeResolved = relative(sourceRoot, resolved);
      if (
        forbiddenModules.has(resolved) ||
        relativeResolved.startsWith("..") ||
        resolve(sourceRoot, relativeResolved) !== resolved
      ) {
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

describe("Task 04 booking expiry worker server-only architecture", () => {
  it("keeps the committed client graph outside every cleanup authority module", () => {
    const clientEntries = filesUnder(sourceRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        clientDirective.test(readFileSync(file, "utf8")),
      );
    expect(
      clientGraphViolations(
        clientEntries,
        {
          readSource: (file) => readFileSync(file, "utf8"),
          fileExists: existsSync,
        },
        new Set(forbiddenServerModules),
      ),
    ).toEqual([]);
  });

  it("rejects direct, re-exported, and transitive imports in every supported specifier form", () => {
    const root = join(
      sourceRoot,
      "__task04_booking_expiry_architecture_fixture__",
    );
    const worker = join(root, "booking-expiry-worker.ts");
    const direct = join(root, "direct.tsx");
    const explicitTs = join(root, "explicit-ts.tsx");
    const jsSpecifier = join(root, "js-specifier.tsx");
    const transitive = join(root, "transitive.tsx");
    const reexport = join(root, "reexport.tsx");
    const helper = join(root, "helper.ts");
    const barrel = join(root, "barrel.ts");
    const safe = join(root, "safe.tsx");
    const safeHelper = join(root, "safe-helper.ts");
    const sources = new Map<string, string>([
      [worker, 'export const cleanup = "server-only";'],
      [direct, '"use client"; import "./booking-expiry-worker";'],
      [
        explicitTs,
        '"use client"; import "./booking-expiry-worker.ts";',
      ],
      [
        jsSpecifier,
        '"use client"; import "./booking-expiry-worker.js";',
      ],
      [transitive, '"use client"; import "./helper.js";'],
      [helper, 'import "./booking-expiry-worker";'],
      [reexport, '"use client"; import "./barrel";'],
      [barrel, 'export * from "./booking-expiry-worker.js";'],
      [
        safe,
        '"use client"; import { label } from "./safe-helper"; export { label };',
      ],
      [safeHelper, 'export const label = "Synthetic cleanup";'],
    ]);
    const access = {
      readSource: (file: string) => sources.get(file)!,
      fileExists: (file: string) => sources.has(file),
    };
    const forbidden = new Set([worker]);

    expect(clientGraphViolations([direct], access, forbidden)).toEqual([
      "__task04_booking_expiry_architecture_fixture__/direct.tsx:./booking-expiry-worker",
    ]);
    expect(
      clientGraphViolations([explicitTs], access, forbidden),
    ).toEqual([
      "__task04_booking_expiry_architecture_fixture__/explicit-ts.tsx:./booking-expiry-worker.ts",
    ]);
    expect(
      clientGraphViolations([jsSpecifier], access, forbidden),
    ).toEqual([
      "__task04_booking_expiry_architecture_fixture__/js-specifier.tsx:./booking-expiry-worker.js",
    ]);
    expect(
      clientGraphViolations([transitive], access, forbidden),
    ).toEqual([
      "__task04_booking_expiry_architecture_fixture__/helper.ts:./booking-expiry-worker",
    ]);
    expect(
      clientGraphViolations([reexport], access, forbidden),
    ).toEqual([
      "__task04_booking_expiry_architecture_fixture__/barrel.ts:./booking-expiry-worker.js",
    ]);
    expect(clientGraphViolations([safe], access, forbidden)).toEqual(
      [],
    );
  });
});
