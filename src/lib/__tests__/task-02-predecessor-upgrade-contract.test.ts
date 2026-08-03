import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  TASK02_UPGRADE_ACTIONS,
  TASK02_UPGRADE_CONTRACT,
  assertTask02UpgradeApproval,
  assertTask02UpgradeComposeConfig,
  assertTask02UpgradeDatabaseUrl,
  assertTask02UpgradePreStartSnapshot,
  assertTask02UpgradeResourcesAbsent,
  assertTask02UpgradeRuntimeSnapshot,
  assertTask02UpgradeTeardownOwnership,
  createPredecessorMigrationView,
  readMigrationChainIdentity,
  removeGeneratedMigrationView,
  type Task02UpgradeRuntimeSnapshot,
} from "../../../tools/task-02/predecessor-upgrade-contract";
import {
  assertTask02DatabaseIdentityShape,
  assertTask02DatabasePrincipal,
  assertTask02EmptyPublicDatabase,
  assertTask02MigrationHistory,
  waitForTask02LoopbackTcpReadiness,
} from "../../../tools/task-02/predecessor-upgrade-db";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const TASK_LABELS = {
  "com.agentoma.environment": "synthetic",
  "com.agentoma.task": "task-02",
  "com.agentoma.capability": "predecessor-upgrade",
};

const expectedMigrationEntry = {
  idx: 0,
  when: 1,
  tag: "0000_synthetic_task02",
  repositoryPath: "src/lib/db/migrations/0000_synthetic_task02.sql",
  sha256: HASH_A,
};

function validComposeConfig(): unknown {
  return {
    name: TASK02_UPGRADE_CONTRACT.composeProject,
    services: {
      [TASK02_UPGRADE_CONTRACT.composeService]: {
        image: TASK02_UPGRADE_CONTRACT.image,
        container_name: TASK02_UPGRADE_CONTRACT.containerName,
        restart: "no",
        labels: TASK_LABELS,
        environment: {
          POSTGRES_USER: TASK02_UPGRADE_CONTRACT.databaseUser,
          POSTGRES_HOST_AUTH_METHOD: "trust",
          POSTGRES_DB: TASK02_UPGRADE_CONTRACT.databaseName,
        },
        ports: [
          {
            target: 5432,
            published: TASK02_UPGRADE_CONTRACT.hostPort,
            protocol: "tcp",
            host_ip: TASK02_UPGRADE_CONTRACT.hostIp,
          },
        ],
        volumes: [
          {
            type: "volume",
            source: "task02_upgrade_data",
            target: TASK02_UPGRADE_CONTRACT.dataPath,
          },
        ],
        networks: { task02_upgrade_network: null },
      },
    },
    networks: {
      task02_upgrade_network: {
        name: TASK02_UPGRADE_CONTRACT.networkName,
        internal: true,
        labels: TASK_LABELS,
      },
    },
    volumes: {
      task02_upgrade_data: {
        name: TASK02_UPGRADE_CONTRACT.volumeName,
        labels: TASK_LABELS,
      },
    },
  };
}

function validRuntimeSnapshot(): Task02UpgradeRuntimeSnapshot {
  return {
    composeContainerId: "a".repeat(64),
    containerId: "a".repeat(64),
    status: "running",
    healthStatus: "healthy",
    restartCount: 0,
    image: TASK02_UPGRADE_CONTRACT.image,
    imageId: `sha256:${HASH_A}`,
    composeService: TASK02_UPGRADE_CONTRACT.composeService,
    composeProject: TASK02_UPGRADE_CONTRACT.composeProject,
    expectedConfigHash: HASH_A,
    actualConfigHash: HASH_A,
    labels: TASK_LABELS,
    portBindings: {
      [TASK02_UPGRADE_CONTRACT.containerPort]: [
        {
          HostIp: TASK02_UPGRADE_CONTRACT.hostIp,
          HostPort: TASK02_UPGRADE_CONTRACT.hostPort,
        },
      ],
    },
    mounts: [
      {
        Type: "volume",
        Name: TASK02_UPGRADE_CONTRACT.volumeName,
        Destination: TASK02_UPGRADE_CONTRACT.dataPath,
        RW: true,
      },
    ],
    networkNames: [TASK02_UPGRADE_CONTRACT.networkName],
    networkLabels: TASK_LABELS,
    volumeLabels: TASK_LABELS,
  };
}

function validApproval() {
  const migrationIdentity = readMigrationChainIdentity(process.cwd());
  return {
    schema_version: "1",
    gate: "G1-D",
    decision: "GRANTED",
    approver: "Synthetic Test Approver",
    approved_at_utc: "2026-08-02T00:00:00Z",
    expires_at_utc: "2026-08-03T00:00:00Z",
    candidate_sha: "a".repeat(40),
    migration_head: TASK02_UPGRADE_CONTRACT.headTag,
    migration_sha256: migrationIdentity.headSha256,
    migration_chain_digest: migrationIdentity.chainDigest,
    execution_authorized: true,
    live_access_authorized: false,
    phi_authorized: false,
    external_integrations_authorized: false,
    db_push_authorized: false,
    migration_edits_authorized: false,
    manual_history_edits_authorized: false,
    authorized_actions: [...TASK02_UPGRADE_ACTIONS],
    environment: {
      kind: "disposable_local_docker",
      identifier: "task02-predecessor-upgrade",
      compose_file: TASK02_UPGRADE_CONTRACT.composeFile,
      compose_project: TASK02_UPGRADE_CONTRACT.composeProject,
      service: TASK02_UPGRADE_CONTRACT.composeService,
      container: TASK02_UPGRADE_CONTRACT.containerName,
      network: TASK02_UPGRADE_CONTRACT.networkName,
      volume: TASK02_UPGRADE_CONTRACT.volumeName,
      image: TASK02_UPGRADE_CONTRACT.image,
      image_id: `sha256:${HASH_A}`,
      host_ip: TASK02_UPGRADE_CONTRACT.hostIp,
      host_port: 5434,
      database: TASK02_UPGRADE_CONTRACT.databaseName,
      synthetic_only: true,
    },
  };
}

function sourceFiles(folder: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) files.push(...sourceFiles(path));
    else files.push(path);
  }
  return files;
}

describe("Task 02 predecessor-upgrade migration contract", () => {
  it("locks the unmodified 0018 bytes and ordered chain", () => {
    const identity = readMigrationChainIdentity(process.cwd());
    expect(identity.migrationHead).toBe("0018_clever_mister_fear");
    expect(identity.predecessor).toBe("0017_tense_pandemic");
    expect(identity.headSha256).toBe(
      "33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c",
    );
    expect(identity.chainDigest).toBe(
      "ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb",
    );
  });

  it("builds an OS-temp, byte-identical view ending at 0017", () => {
    const generated = createPredecessorMigrationView(process.cwd());
    try {
      const journal = JSON.parse(
        readFileSync(join(generated.folder, "meta", "_journal.json"), "utf8"),
      ) as { entries: { tag: string }[] };
      expect(journal.entries).toHaveLength(18);
      expect(journal.entries.at(-1)?.tag).toBe(
        TASK02_UPGRADE_CONTRACT.predecessorTag,
      );
      expect(
        existsSync(
          join(generated.folder, `${TASK02_UPGRADE_CONTRACT.headTag}.sql`),
        ),
      ).toBe(false);
      expect(
        readFileSync(
          join(
            generated.folder,
            `${TASK02_UPGRADE_CONTRACT.predecessorTag}.sql`,
          ),
        ),
      ).toEqual(
        readFileSync(
          resolve(
            process.cwd(),
            TASK02_UPGRADE_CONTRACT.migrationFolder,
            `${TASK02_UPGRADE_CONTRACT.predecessorTag}.sql`,
          ),
        ),
      );
    } finally {
      removeGeneratedMigrationView(generated.folder);
    }
    expect(existsSync(generated.folder)).toBe(false);
  });

  it("refuses to recursively remove a path outside its generated temp scope", () => {
    expect(() => removeGeneratedMigrationView(process.cwd())).toThrow(
      "TASK02_UPGRADE_DENIED:MIGRATION_VIEW_DENIED",
    );
  });
});

describe("Task 02 database identity diagnostics", () => {
  it("uses granular safe reasons without emitting database values", () => {
    expect(() => assertTask02DatabaseIdentityShape([])).toThrow(
      "TASK02_UPGRADE_DENIED:DATABASE_IDENTITY_SHAPE_DENIED",
    );

    const identity = assertTask02DatabaseIdentityShape([
      {
        database_name: TASK02_UPGRADE_CONTRACT.databaseName,
        database_user: TASK02_UPGRADE_CONTRACT.databaseUser,
        version_num: "160010",
        version_text: "SYNTHETIC-VERSION-TEXT",
      },
    ]);
    expect(() => assertTask02DatabasePrincipal(identity)).not.toThrow();
    expect(() =>
      assertTask02DatabasePrincipal({
        ...identity,
        database_user: "unexpected-role",
      }),
    ).toThrow("TASK02_UPGRADE_DENIED:DATABASE_PRINCIPAL_DENIED");
    expect(() =>
      assertTask02DatabasePrincipal({ ...identity, version_num: "150099" }),
    ).toThrow("TASK02_UPGRADE_DENIED:POSTGRES_VERSION_DENIED");

    expect(() =>
      assertTask02MigrationHistory(
        [{ hash: HASH_A, created_at: 1 }],
        [expectedMigrationEntry],
      ),
    ).not.toThrow();
    expect(() => assertTask02MigrationHistory([], [expectedMigrationEntry])).toThrow(
      "TASK02_UPGRADE_DENIED:MIGRATION_HISTORY_DENIED",
    );
    expect(() => assertTask02EmptyPublicDatabase([{ table_count: 1 }])).toThrow(
      "TASK02_UPGRADE_DENIED:DATABASE_NONEMPTY_DENIED",
    );
  });

  it("retries a synthetic TCP failure and never exposes its raw error", async () => {
    let now = 0;
    let attempts = 0;
    await expect(
      waitForTask02LoopbackTcpReadiness({
        probe: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("SYNTHETIC-T02-private-error");
        },
        now: () => now,
        sleep: async () => {
          now += 500;
        },
      }),
    ).resolves.toBeUndefined();
    expect(attempts).toBe(2);

    now = 0;
    await expect(
      waitForTask02LoopbackTcpReadiness({
        probe: async () => {
          throw new Error("SYNTHETIC-T02-private-error");
        },
        now: () => now,
        sleep: async () => {
          now += 500;
        },
      }),
    ).rejects.toThrow("TASK02_UPGRADE_DENIED:LOOPBACK_TCP_DENIED");
  });

  it("keeps TCP and PostgreSQL readiness read-only and ahead of any migration write", () => {
    const databaseRunner = readFileSync(
      resolve(process.cwd(), "tools/task-02/predecessor-upgrade-db.ts"),
      "utf8",
    );
    const tcpProbe = databaseRunner.indexOf(
      "await waitForTask02LoopbackTcpReadiness();",
    );
    const readinessProbe = databaseRunner.indexOf(
      "await waitForDatabaseIdentity(client, []);",
    );
    const predecessorMigration = databaseRunner.indexOf(
      "migrateSafely(client, generatedView.folder)",
    );
    expect(tcpProbe).toBeGreaterThanOrEqual(0);
    expect(readinessProbe).toBeGreaterThan(tcpProbe);
    expect(readinessProbe).toBeLessThan(predecessorMigration);
    expect(databaseRunner).toContain("LOOPBACK_TCP_DENIED");
    expect(databaseRunner).toContain("DATABASE_PROTOCOL_DENIED");
    expect(databaseRunner).toContain("family: 4");
    expect(databaseRunner).toContain(
      "host: TASK02_UPGRADE_CONTRACT.hostIp",
    );
    expect(databaseRunner).toContain("connect_timeout: DATABASE_CONNECT_TIMEOUT_SECONDS");
    expect(databaseRunner).not.toMatch(/console\.(?:log|error|warn)/u);
  });
});

describe("Task 02 exact G1-D approval contract", () => {
  it("accepts only an unexpired exact-candidate execution approval", () => {
    const migrationIdentity = readMigrationChainIdentity(process.cwd());
    expect(() =>
      assertTask02UpgradeApproval(validApproval(), {
        candidateSha: "a".repeat(40),
        migrationIdentity,
        now: new Date("2026-08-02T12:00:00Z"),
      }),
    ).not.toThrow();
  });

  it("denies stale candidates, expired windows, or broader live authority", () => {
    const migrationIdentity = readMigrationChainIdentity(process.cwd());
    expect(() =>
      assertTask02UpgradeApproval(validApproval(), {
        candidateSha: "b".repeat(40),
        migrationIdentity,
        now: new Date("2026-08-02T12:00:00Z"),
      }),
    ).toThrow("TASK02_UPGRADE_DENIED:APPROVAL_DENIED");
    expect(() =>
      assertTask02UpgradeApproval(validApproval(), {
        candidateSha: "a".repeat(40),
        migrationIdentity,
        now: new Date("2026-08-03T00:00:00Z"),
      }),
    ).toThrow("TASK02_UPGRADE_DENIED:APPROVAL_EXPIRED");

    const broadened = { ...validApproval(), live_access_authorized: true };
    expect(() =>
      assertTask02UpgradeApproval(broadened, {
        candidateSha: "a".repeat(40),
        migrationIdentity,
        now: new Date("2026-08-02T12:00:00Z"),
      }),
    ).toThrow("TASK02_UPGRADE_DENIED:APPROVAL_DENIED");
  });
});

describe("Task 02 persistent Docker isolation contract", () => {
  it("accepts only the exact loopback, volume-backed, internal-network config", () => {
    expect(() => assertTask02UpgradeComposeConfig(validComposeConfig())).not.toThrow();
    expect(() =>
      assertTask02UpgradeDatabaseUrl(TASK02_UPGRADE_CONTRACT.databaseUrl),
    ).not.toThrow();
  });

  it("denies non-loopback ports, bind mounts, and external networks", () => {
    const exposed = validComposeConfig() as {
      services: Record<string, { ports: { host_ip: string }[] }>;
    };
    exposed.services[TASK02_UPGRADE_CONTRACT.composeService].ports[0].host_ip =
      "0.0.0.0";
    expect(() => assertTask02UpgradeComposeConfig(exposed)).toThrow(
      "TASK02_UPGRADE_DENIED:PORT_BINDING_DENIED",
    );

    const bindMounted = validComposeConfig() as {
      services: Record<string, { volumes: { type: string }[] }>;
    };
    bindMounted.services[TASK02_UPGRADE_CONTRACT.composeService].volumes[0].type =
      "bind";
    expect(() => assertTask02UpgradeComposeConfig(bindMounted)).toThrow(
      "TASK02_UPGRADE_DENIED:VOLUME_DENIED",
    );

    const routed = validComposeConfig() as {
      networks: { task02_upgrade_network: { internal: boolean } };
    };
    routed.networks.task02_upgrade_network.internal = false;
    expect(() => assertTask02UpgradeComposeConfig(routed)).toThrow(
      "TASK02_UPGRADE_DENIED:COMPOSE_CONFIG_DENIED",
    );
  });

  it("denies remote Docker endpoints and every stale named resource", () => {
    expect(() =>
      assertTask02UpgradePreStartSnapshot({
        serverVersion: "29.0.0",
        dockerEndpoint: "unix:///var/run/docker.sock",
        localImageId: `sha256:${HASH_A}`,
        existingContainerIds: [],
        existingNetworkIds: [],
        existingVolumeNames: [],
      }),
    ).not.toThrow();
    expect(() =>
      assertTask02UpgradePreStartSnapshot({
        serverVersion: "29.0.0",
        dockerEndpoint: "tcp://remote.invalid:2375",
        localImageId: `sha256:${HASH_A}`,
        existingContainerIds: [],
        existingNetworkIds: [],
        existingVolumeNames: [],
      }),
    ).toThrow("TASK02_UPGRADE_DENIED:DOCKER_ENDPOINT_DENIED");
    expect(() =>
      assertTask02UpgradePreStartSnapshot({
        serverVersion: "29.0.0",
        dockerEndpoint: "npipe:////./pipe/dockerDesktopLinuxEngine",
        localImageId: `sha256:${HASH_A}`,
        existingContainerIds: [],
        existingNetworkIds: [],
        existingVolumeNames: [TASK02_UPGRADE_CONTRACT.volumeName],
      }),
    ).toThrow("TASK02_UPGRADE_DENIED:STALE_RESOURCE_DENIED");
  });

  it("accepts the exact healthy runtime and rejects unsafe drift", () => {
    expect(() =>
      assertTask02UpgradeRuntimeSnapshot(validRuntimeSnapshot()),
    ).not.toThrow();

    const exposed = validRuntimeSnapshot();
    exposed.portBindings[TASK02_UPGRADE_CONTRACT.containerPort] = [
      { HostIp: "0.0.0.0", HostPort: TASK02_UPGRADE_CONTRACT.hostPort },
    ];
    expect(() => assertTask02UpgradeRuntimeSnapshot(exposed)).toThrow(
      "TASK02_UPGRADE_DENIED:PORT_BINDING_DENIED",
    );

    const wrongVolume = validRuntimeSnapshot();
    wrongVolume.mounts[0].Name = "unowned-volume";
    expect(() => assertTask02UpgradeRuntimeSnapshot(wrongVolume)).toThrow(
      "TASK02_UPGRADE_DENIED:COMPOSE_OWNERSHIP_DENIED",
    );

    const staleConfig = validRuntimeSnapshot();
    staleConfig.actualConfigHash = HASH_B;
    expect(() => assertTask02UpgradeRuntimeSnapshot(staleConfig)).toThrow(
      "TASK02_UPGRADE_DENIED:CONFIG_HASH_DENIED",
    );
  });

  it("requires proven ownership before teardown and proves exact absence after", () => {
    expect(() =>
      assertTask02UpgradeTeardownOwnership({
        container: {
          name: TASK02_UPGRADE_CONTRACT.containerName,
          labels: TASK_LABELS,
        },
        network: {
          name: TASK02_UPGRADE_CONTRACT.networkName,
          labels: TASK_LABELS,
        },
        volume: {
          name: TASK02_UPGRADE_CONTRACT.volumeName,
          labels: TASK_LABELS,
        },
      }),
    ).not.toThrow();
    expect(() =>
      assertTask02UpgradeResourcesAbsent({
        containerIds: [],
        networkIds: [],
        volumeNames: [],
      }),
    ).not.toThrow();
    expect(() =>
      assertTask02UpgradeResourcesAbsent({
        containerIds: [],
        networkIds: ["still-present"],
        volumeNames: [],
      }),
    ).toThrow("TASK02_UPGRADE_DENIED:TEARDOWN_INCOMPLETE");
  });

  it("never includes rejected values in safe errors", () => {
    try {
      assertTask02UpgradeDatabaseUrl(
        "postgres://forbidden-value@remote.invalid:5432/live",
      );
      throw new Error("Expected the target guard to deny the URL.");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toBe("TASK02_UPGRADE_DENIED:DATABASE_TARGET_DENIED");
      expect(message).not.toContain("forbidden-value");
      expect(message).not.toContain("remote.invalid");
    }
  });

  it("keeps the service synthetic-only and unreachable from production code", () => {
    const compose = readFileSync(
      resolve(process.cwd(), TASK02_UPGRADE_CONTRACT.composeFile),
      "utf8",
    );
    expect(compose).toContain('127.0.0.1:5434:5432');
    expect(compose).toContain("internal: true");
    expect(compose).not.toMatch(/env_file|supabase|DATABASE_URL|DIRECT_URL/iu);

    const productionSources = sourceFiles(resolve(process.cwd(), "src")).filter(
      (path) => !path.includes(`${join("src", "lib", "__tests__")}`),
    );
    for (const path of productionSources) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toContain("tools/task-02/predecessor-upgrade");
    }
  });

  it("keeps approval ahead of Docker and teardown in the orchestrator finally path", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts["test:db:upgrade"]).toBe(
      "tsx tools/task-02/run-predecessor-upgrade-harness.ts",
    );

    const runner = readFileSync(
      resolve(
        process.cwd(),
        "tools/task-02/run-predecessor-upgrade-harness.ts",
      ),
      "utf8",
    );
    expect(
      runner.indexOf("assertTask02UpgradeApproval(approvalInput"),
    ).toBeLessThan(
      runner.indexOf("const preStart = assertPreStart(cwd"),
    );
    expect(runner).toContain("finally {");
    expect(runner).toContain("teardownExactResources(cwd);");
    expect(runner).toContain('"--pull",');
    expect(runner).toContain('"never",');
    expect(runner).not.toContain("process.env");
    expect(runner).not.toMatch(/@supabase|db:push|DATABASE_URL|DIRECT_URL/iu);
  });

  it("uses Drizzle for both phases without touching migration history", () => {
    const databaseRunner = readFileSync(
      resolve(process.cwd(), "tools/task-02/predecessor-upgrade-db.ts"),
      "utf8",
    );
    const predecessorMigration = databaseRunner.indexOf(
      "migrateSafely(client, generatedView.folder)",
    );
    const syntheticSeed = databaseRunner.indexOf(
      "await seedSyntheticPredecessorRows(client)",
    );
    const headMigration = databaseRunner.indexOf(
      "resolve(repositoryRoot, TASK02_UPGRADE_CONTRACT.migrationFolder)",
    );
    expect(predecessorMigration).toBeGreaterThanOrEqual(0);
    expect(syntheticSeed).toBeGreaterThan(predecessorMigration);
    expect(headMigration).toBeGreaterThan(syntheticSeed);
    expect(databaseRunner).not.toMatch(
      /insert\s+into\s+drizzle\.__drizzle_migrations/iu,
    );
    expect(databaseRunner).not.toContain("process.env");
    expect(databaseRunner).not.toMatch(/supabase|db:push/iu);
    expect(databaseRunner).not.toMatch(/\b\d{10}\b/u);
  });
});
