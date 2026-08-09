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
const authoritativeServerConfigurationModules = new Set([
  join(sourceRoot, "booking", "config.ts"),
  join(sourceRoot, "env", "server.ts"),
]);
const clientModuleDirective = /^\s*["']use client["'];/m;
const slotReferenceSecretName =
  /TASK04_PUBLIC_SLOT_REFERENCE_SECRET|publicSlotReferenceSecret/;
const protectedBookingBoundaryName =
  /capabilityReference|serverSessionBinding|credentialDigest|TASK04_SYNTHETIC_BOOKING_(?:CREATE|CONFIRM)_AUTHORITY|executeTask04Booking(?:Retrieve|Confirm)/;
const protectedQueueBoundaryName =
  /executeTask04PharmacistQueue|TASK04_SYNTHETIC_PHARMACIST_QUEUE_AUTHORITY|authorizeStaffPharmacistQueue|staffPharmacistQueueFactsSchema|publicSlotReferenceSecret|TASK04_PUBLIC_SLOT_REFERENCE_SECRET/;
const prohibitedQueueClientDataName =
  /(?:subjectReference|actorReference|caregiverReference|delegationGrant|syntheticContactReference|credentialDigest|confirmationDeadlineUtc|configuredCapacity|remainingCapacity)/;
const protectedCatalogBoundaryName =
  /(?:execute|query)Task04PublicServiceCatalog|createTask04PublicSlotReferenceService|publicSlotReferenceSecret|TASK04_PUBLIC_SLOT_REFERENCE_SECRET|service_category_id|supported_modalities/;
const protectedPublicBookingBoundaryName =
  /(?:executeTask04BookingCreate|queryTask04PublicAvailability|loadTask04SandboxEnv|createTask04PublicSlotReferenceService|idempotencyKey|syntheticContactReference|managementCapability|capabilityReference|credentialDigest|bookingReference|receiptId)/;

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
    /(?:^|\/)booking\/config(?:$|[./])/.test(specifier) ||
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

function isCatalogServerOwnedModuleSpecifier(
  specifier: string,
): boolean {
  return (
    isServerOwnedModuleSpecifier(specifier) ||
    /(?:^|\/)app\/api\/service-catalog(?:\/|$)/.test(
      specifier,
    ) ||
    /(?:^|\/)service-catalog(?:$|[./])/.test(specifier) &&
      /(?:^|\/)db\//.test(specifier)
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

function isPublicBookingServerOwnedModuleSpecifier(
  specifier: string,
): boolean {
  return (
    isCatalogServerOwnedModuleSpecifier(specifier) ||
    /(?:^|\/)booking\/authorization(?:$|[./])/.test(
      specifier,
    ) ||
    /(?:^|\/)book-server(?:$|[./])/.test(specifier) ||
    /^(?:\.\/)?page(?:$|[.])/.test(specifier) ||
    /(?:^|\/)app\/book\/(?:book-server|page)(?:$|[./])/.test(
      specifier,
    )
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
      "../booking/config",
      "../booking/config.ts",
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
      join(queueUiRoot, "actions.ts"),
      join(queueUiRoot, "queue-server.ts"),
      ...authoritativeServerConfigurationModules,
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
      "../booking/config",
      "../booking/config.ts",
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

  it("keeps the public service-catalog implementation, references, and source records server-only", () => {
    const catalogModules = [
      join(sourceRoot, "booking", "config.ts"),
      join(sourceRoot, "db", "service-catalog.ts"),
      join(sourceRoot, "db", "public-slot-reference.ts"),
      join(
        sourceRoot,
        "app",
        "api",
        "service-catalog",
        "route.ts",
      ),
    ];
    for (const catalogModule of catalogModules) {
      expect(statSync(catalogModule).isFile()).toBe(true);
      expect(
        clientModuleDirective.test(
          readFileSync(catalogModule, "utf8"),
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
        ...(protectedCatalogBoundaryName.test(source)
          ? [`${relative(sourceRoot, file)}:catalog-authority`]
          : []),
        ...importedModuleSpecifiers(source)
          .filter(isCatalogServerOwnedModuleSpecifier)
          .map(
            (specifier) =>
              `${relative(sourceRoot, file)}:${specifier}`,
          ),
      ];
    });
    expect(offenders).toEqual([]);
    const catalogRoute = join(
      sourceRoot,
      "app",
      "api",
      "service-catalog",
      "route.ts",
    );
    expect(
      task04QueueClientGraphViolations(clientFiles, {
        sourceRoot,
        fileSystem: {
          readSource: (file) => readFileSync(file, "utf8"),
          fileExists: existsSync,
        },
        isForbiddenLocalModule: (file) =>
          pathIsWithin(join(sourceRoot, "db"), file) ||
          authoritativeServerConfigurationModules.has(file) ||
          file === catalogRoute,
      }),
    ).toEqual([]);

    for (const forbiddenImport of [
      "../db/service-catalog",
      "../db/public-slot-reference",
      "../booking/config",
      "../booking/config.ts",
      "../env/server",
      "../app/api/service-catalog/route",
    ]) {
      expect(
        isCatalogServerOwnedModuleSpecifier(forbiddenImport),
      ).toBe(true);
    }
    expect(
      isCatalogServerOwnedModuleSpecifier(
        "../booking/service-catalog-contracts",
      ),
    ).toBe(false);
  });

  it("keeps the public booking client graph inside the minimized UI and server-action boundary", () => {
    const publicBookingRoot = join(sourceRoot, "app", "book");
    const publicBookingClientEntries = filesUnder(publicBookingRoot)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) =>
        clientModuleDirective.test(readFileSync(file, "utf8")),
      );
    const publicBookingServerModules = new Set([
      join(publicBookingRoot, "book-server.ts"),
      join(publicBookingRoot, "page.tsx"),
      join(sourceRoot, "booking", "authorization.ts"),
      ...authoritativeServerConfigurationModules,
    ]);
    expect(
      task04QueueClientGraphViolations(
        publicBookingClientEntries,
        {
          sourceRoot,
          fileSystem: {
            readSource: (file) => readFileSync(file, "utf8"),
            fileExists: existsSync,
          },
          isForbiddenLocalModule: (file) =>
            pathIsWithin(join(sourceRoot, "db"), file) ||
            publicBookingServerModules.has(file),
        },
      ),
    ).toEqual([]);

    const clientOffenders = publicBookingClientEntries.flatMap(
      (file) => {
        const source = readFileSync(file, "utf8");
        return [
          ...(protectedPublicBookingBoundaryName.test(source)
            ? [
                `${relative(sourceRoot, file)}:booking-authority`,
              ]
            : []),
          ...importedModuleSpecifiers(source)
            .filter(isPublicBookingServerOwnedModuleSpecifier)
            .map(
              (specifier) =>
                `${relative(sourceRoot, file)}:${specifier}`,
            ),
        ];
      },
    );
    expect(clientOffenders).toEqual([]);

    for (const forbiddenImport of [
      "../../db/service-catalog",
      "../../db/availability",
      "../../db/booking-create",
      "../../db/public-slot-reference",
      "../../booking/authorization",
      "../../booking/config",
      "../../env/server",
      "./book-server",
      "./page",
    ]) {
      expect(
        isPublicBookingServerOwnedModuleSpecifier(
          forbiddenImport,
        ),
      ).toBe(true);
    }

    const clientSource = publicBookingClientEntries
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(clientSource).not.toMatch(
      /Intl\.DateTimeFormat|toLocale(?:Date|Time)?String/,
    );
    expect(clientSource).not.toMatch(
      /(?:localStorage|sessionStorage|indexedDB|document\.cookie|console\.)/,
    );
  });

  it("rejects direct and transitive public-booking client imports of server implementation modules", () => {
    const fixtureRoot = resolve(
      sourceRoot,
      "__task04_public_booking_graph_fixture__",
    );
    const directClient = join(fixtureRoot, "direct-client.tsx");
    const transitiveClient = join(
      fixtureRoot,
      "transitive-client.tsx",
    );
    const localHelper = join(fixtureRoot, "booking-helper.ts");
    const serverModule = join(fixtureRoot, "book-server.ts");
    const safeClient = join(fixtureRoot, "safe-client.tsx");
    const safeUi = join(fixtureRoot, "book-ui-model.ts");
    const sources = new Map<string, string>([
      [
        directClient,
        '"use client"; import { execute } from "./book-server"; export const value = execute;',
      ],
      [
        transitiveClient,
        '"use client"; import { helper } from "./booking-helper"; export const value = helper;',
      ],
      [
        localHelper,
        'export { execute as helper } from "./book-server.ts";',
      ],
      [
        serverModule,
        'export const execute = "server-only";',
      ],
      [
        safeClient,
        '"use client"; import { safeValue } from "./book-ui-model"; export const value = safeValue;',
      ],
      [safeUi, 'export const safeValue = "safe-ui";'],
    ]);
    const fixtureOptions = {
      sourceRoot: fixtureRoot,
      fileSystem: {
        readSource: (file: string) => sources.get(file)!,
        fileExists: (file: string) => sources.has(file),
      },
      isForbiddenLocalModule: (file: string) =>
        file === serverModule,
    };

    expect(
      task04QueueClientGraphViolations(
        [directClient],
        fixtureOptions,
      ),
    ).toEqual([
      "direct-client.tsx:forbidden-local:./book-server",
    ]);
    expect(
      task04QueueClientGraphViolations(
        [transitiveClient],
        fixtureOptions,
      ),
    ).toEqual([
      "booking-helper.ts:forbidden-local:./book-server.ts",
    ]);
    expect(
      task04QueueClientGraphViolations(
        [safeClient],
        fixtureOptions,
      ),
    ).toEqual([]);
  });

  it("rejects direct client imports of authoritative booking configuration with or without an extension", () => {
    const fixtureRoot = resolve(
      sourceRoot,
      "__task04_direct_config_import_fixture__",
    );
    const configurationModule = join(
      fixtureRoot,
      "booking",
      "config.ts",
    );
    const extensionlessClient = join(
      fixtureRoot,
      "extensionless-client.tsx",
    );
    const explicitExtensionClient = join(
      fixtureRoot,
      "explicit-extension-client.tsx",
    );
    const sources = new Map<string, string>([
      [
        configurationModule,
        'export const syntheticConfiguration = "server-only";',
      ],
      [
        extensionlessClient,
        '"use client"; import { syntheticConfiguration } from "./booking/config"; export const value = syntheticConfiguration;',
      ],
      [
        explicitExtensionClient,
        '"use client"; import { syntheticConfiguration } from "./booking/config.ts"; export const value = syntheticConfiguration;',
      ],
    ]);
    const fixtureOptions = {
      sourceRoot: fixtureRoot,
      fileSystem: {
        readSource: (file: string) => sources.get(file)!,
        fileExists: (file: string) => sources.has(file),
      },
      isForbiddenLocalModule: (file: string) =>
        file === configurationModule,
    };

    expect(
      task04QueueClientGraphViolations(
        [extensionlessClient],
        fixtureOptions,
      ),
    ).toEqual([
      "extensionless-client.tsx:forbidden-local:./booking/config",
    ]);
    expect(
      task04QueueClientGraphViolations(
        [explicitExtensionClient],
        fixtureOptions,
      ),
    ).toEqual([
      "explicit-extension-client.tsx:forbidden-local:./booking/config.ts",
    ]);
  });

  it("rejects transitive client imports of authoritative booking configuration", () => {
    const fixtureRoot = resolve(
      sourceRoot,
      "__task04_transitive_config_import_fixture__",
    );
    const configurationModule = join(
      fixtureRoot,
      "booking",
      "config.ts",
    );
    const entryModule = join(fixtureRoot, "catalog-client.tsx");
    const localHelper = join(fixtureRoot, "catalog-helper.ts");
    const sources = new Map<string, string>([
      [
        entryModule,
        '"use client"; import { catalogValue } from "./catalog-helper"; export const value = catalogValue;',
      ],
      [
        localHelper,
        'import { syntheticConfiguration } from "./booking/config.ts"; export const catalogValue = syntheticConfiguration;',
      ],
      [
        configurationModule,
        'export const syntheticConfiguration = "server-only";',
      ],
    ]);

    expect(
      task04QueueClientGraphViolations([entryModule], {
        sourceRoot: fixtureRoot,
        fileSystem: {
          readSource: (file) => sources.get(file)!,
          fileExists: (file) => sources.has(file),
        },
        isForbiddenLocalModule: (file) =>
          file === configurationModule,
      }),
    ).toEqual([
      "catalog-helper.ts:forbidden-local:./booking/config.ts",
    ]);
  });

  it("accepts client import graphs containing only safe UI modules", () => {
    const fixtureRoot = resolve(
      sourceRoot,
      "__task04_safe_ui_import_fixture__",
    );
    const entryModule = join(fixtureRoot, "catalog-client.tsx");
    const safeUiModule = join(fixtureRoot, "catalog-ui.tsx");
    const sources = new Map<string, string>([
      [
        entryModule,
        '"use client"; import { CatalogUi } from "./catalog-ui"; export const value = CatalogUi;',
      ],
      [
        safeUiModule,
        'export const CatalogUi = "safe-ui";',
      ],
    ]);

    expect(
      task04QueueClientGraphViolations([entryModule], {
        sourceRoot: fixtureRoot,
        fileSystem: {
          readSource: (file) => sources.get(file)!,
          fileExists: (file) => sources.has(file),
        },
        isForbiddenLocalModule: () => false,
      }),
    ).toEqual([]);
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
