import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { G3_PRODUCTION_IMPORT_ALLOWLIST } from "../integrations/production-import-allowlist";

const sourceRoot = fileURLToPath(new URL("..", import.meta.url));
const toolsRoot = fileURLToPath(new URL("../../tools", import.meta.url));
const boundaryVerifier = join(toolsRoot, "verify-boundary.mjs");
const clientModuleDirective = /^\s*["']use client["'];/m;
const slotReferenceSecretName =
  /TASK04_PUBLIC_SLOT_REFERENCE_SECRET|publicSlotReferenceSecret/;
const protectedBookingBoundaryName =
  /capabilityReference|serverSessionBinding|credentialDigest|TASK04_SYNTHETIC_BOOKING_(?:CREATE|CONFIRM)_AUTHORITY|executeTask04Booking(?:Retrieve|Confirm)/;
const protectedQueueBoundaryName =
  /executeTask04PharmacistQueue|TASK04_SYNTHETIC_PHARMACIST_QUEUE_AUTHORITY|authorizeStaffPharmacistQueue|staffPharmacistQueueFactsSchema|publicSlotReferenceSecret|TASK04_PUBLIC_SLOT_REFERENCE_SECRET/;
const prohibitedQueueClientDataName =
  /(?:subjectReference|actorReference|caregiverReference|delegationGrant|syntheticContactReference|credentialDigest|confirmationDeadlineUtc|configuredCapacity|remainingCapacity)/;

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

function isQueueServerOwnedModuleSpecifier(
  specifier: string,
): boolean {
  return (
    isServerOwnedModuleSpecifier(specifier) ||
    /(?:^|\/)booking\/authorization(?:$|[./])/.test(
      specifier,
    ) ||
    /(?:^|\/)pharmacist-queue(?:$|[./])/.test(specifier)
  );
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

type Task04ClientGraphFileSystem = Readonly<{
  readSource: (file: string) => string;
  fileExists: (file: string) => boolean;
}>;

function resolveLocalTypeScriptModule(
  importer: string,
  specifier: string,
  fileSystem: Task04ClientGraphFileSystem,
): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const unresolvedPath = resolve(dirname(importer), specifier);
  const candidates = /\.(?:ts|tsx)$/.test(specifier)
    ? [unresolvedPath]
    : [
        `${unresolvedPath}.ts`,
        `${unresolvedPath}.tsx`,
        join(unresolvedPath, "index.ts"),
        join(unresolvedPath, "index.tsx"),
      ];
  return candidates.find(fileSystem.fileExists);
}

function pathIsWithin(root: string, candidate: string): boolean {
  const pathFromRoot = relative(resolve(root), resolve(candidate));
  return (
    pathFromRoot === "" ||
    (!isAbsolute(pathFromRoot) &&
      pathFromRoot !== ".." &&
      !pathFromRoot.startsWith(`..${sep}`))
  );
}

function task04QueueClientGraphViolations(
  entryModules: readonly string[],
  options: Readonly<{
    sourceRoot: string;
    fileSystem: Task04ClientGraphFileSystem;
    isForbiddenLocalModule: (file: string) => boolean;
  }>,
): string[] {
  const pending = [
    ...entryModules.map((entryModule) => resolve(entryModule)),
  ];
  const visited = new Set<string>();
  const violations: string[] = [];

  while (pending.length > 0) {
    const currentModule = pending.pop()!;
    if (visited.has(currentModule)) continue;
    visited.add(currentModule);
    const source = options.fileSystem.readSource(currentModule);
    const sourceLabel = relative(options.sourceRoot, currentModule);

    if (protectedQueueBoundaryName.test(source)) {
      violations.push(`${sourceLabel}:queue-authority`);
    }
    if (prohibitedQueueClientDataName.test(source)) {
      violations.push(`${sourceLabel}:complete-source-data`);
    }

    for (const specifier of importedModuleSpecifiers(source)) {
      const localModule = resolveLocalTypeScriptModule(
        currentModule,
        specifier,
        options.fileSystem,
      );
      if (localModule === undefined) {
        if (isQueueServerOwnedModuleSpecifier(specifier)) {
          violations.push(`${sourceLabel}:${specifier}`);
        }
        continue;
      }
      if (!pathIsWithin(options.sourceRoot, localModule)) {
        violations.push(`${sourceLabel}:production-local:${specifier}`);
        continue;
      }
      if (options.isForbiddenLocalModule(localModule)) {
        violations.push(`${sourceLabel}:forbidden-local:${specifier}`);
        continue;
      }
      pending.push(localModule);
    }
  }

  return violations.sort();
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

  it("keeps booking retrieval and confirmation authority server-only", () => {
    const commandModules = [
      join(sourceRoot, "db", "booking-retrieve.ts"),
      join(sourceRoot, "db", "booking-confirm.ts"),
    ];
    for (const commandModule of commandModules) {
      expect(statSync(commandModule).isFile()).toBe(true);
    }

    const clientOffenders = filesUnder(sourceRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        clientModuleDirective.test(readFileSync(file, "utf8")),
      )
      .filter((file) =>
        protectedBookingBoundaryName.test(
          readFileSync(file, "utf8"),
        ),
      );
    expect(
      clientOffenders.map((file) => relative(sourceRoot, file)),
    ).toEqual([]);
    for (const forbiddenImport of [
      "../db/booking-retrieve",
      "../db/booking-confirm",
    ]) {
      expect(isServerOwnedModuleSpecifier(forbiddenImport)).toBe(true);
    }
  });

  it("keeps the pharmacist queue implementation and sensitive source records server-only", () => {
    const queueModules = [
      join(
        sourceRoot,
        "db",
        "pharmacist-queue.ts",
      ),
      join(
        sourceRoot,
        "db",
        "pharmacist-queue-reference.ts",
      ),
      join(sourceRoot, "booking", "authorization.ts"),
    ];
    for (const queueModule of queueModules) {
      expect(statSync(queueModule).isFile()).toBe(true);
      expect(
        clientModuleDirective.test(
          readFileSync(queueModule, "utf8"),
        ),
      ).toBe(false);
    }

    const clientFiles = filesUnder(sourceRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        clientModuleDirective.test(readFileSync(file, "utf8")),
      );
    const offenders = clientFiles.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return [
        ...(protectedQueueBoundaryName.test(source)
          ? [`${relative(sourceRoot, file)}:queue-authority`]
          : []),
        ...(prohibitedQueueClientDataName.test(source)
          ? [`${relative(sourceRoot, file)}:complete-source-data`]
          : []),
        ...importedModuleSpecifiers(source)
          .filter(isQueueServerOwnedModuleSpecifier)
          .map(
            (specifier) =>
              `${relative(sourceRoot, file)}:${specifier}`,
          ),
      ];
    });
    expect(offenders).toEqual([]);

    const queueUiRoot = join(
      sourceRoot,
      "app",
      "pharmacist-queue",
    );
    const queueClientEntryModules = filesUnder(queueUiRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        clientModuleDirective.test(readFileSync(file, "utf8")),
      );
    const forbiddenQueueClientModules = new Set([
      join(sourceRoot, "booking", "authorization.ts"),
      join(sourceRoot, "booking", "config.ts"),
      join(queueUiRoot, "actions.ts"),
      join(queueUiRoot, "queue-server.ts"),
    ]);
    expect(
      task04QueueClientGraphViolations(
        queueClientEntryModules,
        {
          sourceRoot,
          fileSystem: {
            readSource: (file) => readFileSync(file, "utf8"),
            fileExists: existsSync,
          },
          isForbiddenLocalModule: (file) =>
            pathIsWithin(join(sourceRoot, "db"), file) ||
            file === join(sourceRoot, "env", "server.ts") ||
            forbiddenQueueClientModules.has(file),
        },
      ),
    ).toEqual([]);

    for (const forbiddenImport of [
      "../db/pharmacist-queue",
      "../db/pharmacist-queue-reference",
      "../booking/authorization",
      "../env/server",
    ]) {
      expect(
        isQueueServerOwnedModuleSpecifier(forbiddenImport),
      ).toBe(true);
    }

    const queueClient = join(
      queueUiRoot,
      "queue-workspace.tsx",
    );
    const queueAction = join(queueUiRoot, "actions.ts");
    const queuePage = join(queueUiRoot, "page.tsx");
    const queueServer = join(queueUiRoot, "queue-server.ts");
    for (const queueUiFile of [
      queueClient,
      queueAction,
      queuePage,
      queueServer,
    ]) {
      expect(statSync(queueUiFile).isFile()).toBe(true);
    }

    const clientSource = readFileSync(queueClient, "utf8");
    const actionSource = readFileSync(queueAction, "utf8");
    const pageSource = readFileSync(queuePage, "utf8");
    const serverSource = readFileSync(queueServer, "utf8");
    expect(clientModuleDirective.test(clientSource)).toBe(true);
    expect(actionSource).toMatch(
      /^\s*["']use server["'];/m,
    );
    expect(
      filesUnder(queueUiRoot)
        .filter((file) => /\.(ts|tsx)$/.test(file))
        .filter((file) =>
          /^\s*["']use server["'];/m.test(
            readFileSync(file, "utf8"),
          ),
        ),
    ).toEqual([queueAction]);
    expect(pageSource).toContain(
      'from "./actions"',
    );
    expect(pageSource).toContain(
      'from "./queue-server"',
    );
    expect(actionSource).toContain(
      'from "./queue-server"',
    );
    expect(serverSource).toContain(
      'from "../../db/pharmacist-queue"',
    );
    expect(
      importedModuleSpecifiers(clientSource),
    ).toEqual(["react", "./queue-ui-model"]);
    expect(clientSource).not.toMatch(
      /(?:fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|console\.)/,
    );
    expect(clientSource).not.toMatch(
      /(?:localStorage|sessionStorage|indexedDB|document\.cookie)/,
    );
    expect(clientSource).not.toMatch(
      /Intl\.DateTimeFormat|toLocale(?:Date|Time)?String/,
    );
  });

  it("rejects forbidden transitive queue-client imports while allowing safe helpers", () => {
    const fixtureRoot = resolve(
      sourceRoot,
      "__task04_queue_client_graph_fixture__",
    );
    const entryModule = join(fixtureRoot, "queue-client.tsx");
    const safeHelper = join(fixtureRoot, "safe-helper.ts");
    const forbiddenServer = join(fixtureRoot, "queue-server.ts");
    const sources = new Map<string, string>([
      [
        entryModule,
        '"use client"; import { safeValue } from "./safe-helper"; export const value = safeValue;',
      ],
      [safeHelper, 'export const safeValue = "safe";'],
      [forbiddenServer, 'export const serverValue = "server-only";'],
    ]);
    const fixtureFileSystem = {
      readSource: (file: string) => sources.get(file)!,
      fileExists: (file: string) => sources.has(file),
    };
    const fixtureOptions = {
      sourceRoot: fixtureRoot,
      fileSystem: fixtureFileSystem,
      isForbiddenLocalModule: (file: string) =>
        file === forbiddenServer,
    };

    expect(
      task04QueueClientGraphViolations(
        [entryModule],
        fixtureOptions,
      ),
    ).toEqual([]);

    sources.set(
      safeHelper,
      'import { serverValue } from "./queue-server"; export const safeValue = serverValue;',
    );
    expect(
      task04QueueClientGraphViolations(
        [entryModule],
        fixtureOptions,
      ),
    ).toEqual([
      "safe-helper.ts:forbidden-local:./queue-server",
    ]);
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
