import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

import { z } from "zod";

const compareStrings = (left: string, right: string): number =>
  left.localeCompare(right, "en-US", {
    sensitivity: "variant",
    numeric: false,
  });

export const TASK02_UPGRADE_CONTRACT = {
  composeFile: "docker-compose.task-02-upgrade.yml",
  composeProject: "agentoma-task02-upgrade",
  composeService: "task02-upgrade-db",
  containerName: "agentoma-task02-upgrade-db",
  networkName: "agentoma-task02-upgrade-network",
  volumeName: "agentoma-task02-upgrade-data",
  image: "postgres:16-alpine",
  hostIp: "127.0.0.1",
  hostPort: "5434",
  containerPort: "5432/tcp",
  databaseName: "agentoma_task02_upgrade",
  databaseUser: "postgres",
  databaseUrl:
    "postgres://postgres@127.0.0.1:5434/agentoma_task02_upgrade",
  dataPath: "/var/lib/postgresql/data",
  migrationFolder: "src/lib/db/migrations",
  predecessorTag: "0017_tense_pandemic",
  headTag: "0018_clever_mister_fear",
  evidenceRoot: "docs/p0/task-02/evidence/runs",
} as const;

const TASK_LABELS = {
  "com.agentoma.environment": "synthetic",
  "com.agentoma.task": "task-02",
  "com.agentoma.capability": "predecessor-upgrade",
} as const;

export const TASK02_UPGRADE_ACTIONS = [
  "migrate_through_0017",
  "seed_synthetic_rows",
  "apply_unmodified_0018",
  "verify_preservation_catalog_grants",
  "restart_and_verify_persistence",
  "destroy_exact_resources",
] as const;

export type Task02UpgradeReason =
  | "APPROVAL_DENIED"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_FILE_DENIED"
  | "CATALOG_DENIED"
  | "COMMAND_DENIED"
  | "COMPOSE_CONTAINER_MISSING"
  | "COMPOSE_CONFIG_DENIED"
  | "COMPOSE_OWNERSHIP_DENIED"
  | "CONFIG_HASH_DENIED"
  | "DATABASE_IDENTITY_DENIED"
  | "DATABASE_TARGET_DENIED"
  | "DOCKER_ENDPOINT_DENIED"
  | "DOCKER_UNAVAILABLE"
  | "EVIDENCE_WRITE_DENIED"
  | "GIT_IDENTITY_DENIED"
  | "GRANT_DENIED"
  | "IMAGE_DENIED"
  | "INSPECTION_DENIED"
  | "MALFORMED_INSPECTION"
  | "MIGRATION_CHAIN_DENIED"
  | "MIGRATION_EXECUTION_DENIED"
  | "MIGRATION_VIEW_DENIED"
  | "PORT_BINDING_DENIED"
  | "PRESERVATION_DENIED"
  | "RESOURCE_OWNERSHIP_DENIED"
  | "RESTART_PERSISTENCE_DENIED"
  | "STALE_RESOURCE_DENIED"
  | "STATE_DENIED"
  | "SYNTHETIC_SEED_DENIED"
  | "TEARDOWN_DENIED"
  | "TEARDOWN_INCOMPLETE"
  | "VOLUME_DENIED"
  | "WORKTREE_DENIED";

export class Task02UpgradeHarnessError extends Error {
  constructor(public readonly reason: Task02UpgradeReason) {
    super(`TASK02_UPGRADE_DENIED:${reason}`);
    this.name = "Task02UpgradeHarnessError";
  }
}

export function denyTask02Upgrade(reason: Task02UpgradeReason): never {
  throw new Task02UpgradeHarnessError(reason);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hasExactTaskLabels(labels: Record<string, string>): boolean {
  return Object.entries(TASK_LABELS).every(
    ([key, value]) => labels[key] === value,
  );
}

function sameContainerId(left: string, right: string): boolean {
  const normalizedLeft = left.trim().toLowerCase();
  const normalizedRight = right.trim().toLowerCase();
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.startsWith(normalizedRight) ||
    normalizedRight.startsWith(normalizedLeft)
  );
}

const journalSchema = z
  .object({
    version: z.string(),
    dialect: z.literal("postgresql"),
    entries: z.array(
      z
        .object({
          idx: z.number().int().nonnegative(),
          version: z.string(),
          when: z.number().int().positive(),
          tag: z.string().regex(/^\d{4}_[a-z0-9_]+$/u),
          breakpoints: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict();

export type MigrationChainEntry = {
  idx: number;
  when: number;
  tag: string;
  repositoryPath: string;
  sha256: string;
};

export type MigrationChainIdentity = {
  entries: MigrationChainEntry[];
  migrationHead: string;
  predecessor: string;
  headSha256: string;
  chainDigest: string;
};

function readJournal(migrationFolder: string): z.infer<typeof journalSchema> {
  try {
    return journalSchema.parse(
      JSON.parse(
        readFileSync(join(migrationFolder, "meta", "_journal.json"), "utf8"),
      ) as unknown,
    );
  } catch {
    denyTask02Upgrade("MIGRATION_CHAIN_DENIED");
  }
}

export function readMigrationChainIdentity(
  repositoryRoot: string,
): MigrationChainIdentity {
  const migrationFolder = resolve(
    repositoryRoot,
    TASK02_UPGRADE_CONTRACT.migrationFolder,
  );
  const journal = readJournal(migrationFolder);

  if (
    journal.entries.length !== 19 ||
    journal.entries[17]?.tag !== TASK02_UPGRADE_CONTRACT.predecessorTag ||
    journal.entries[18]?.tag !== TASK02_UPGRADE_CONTRACT.headTag ||
    journal.entries.some((entry, index) => entry.idx !== index)
  ) {
    denyTask02Upgrade("MIGRATION_CHAIN_DENIED");
  }

  const sqlFiles = readdirSync(migrationFolder)
    .filter((name) => name.endsWith(".sql"))
    .sort(compareStrings);
  const expectedSqlFiles = journal.entries
    .map((entry) => `${entry.tag}.sql`)
    .sort(compareStrings);
  if (JSON.stringify(sqlFiles) !== JSON.stringify(expectedSqlFiles)) {
    denyTask02Upgrade("MIGRATION_CHAIN_DENIED");
  }

  const entries = journal.entries.map((entry) => {
    const absolutePath = join(migrationFolder, `${entry.tag}.sql`);
    const repositoryPath = relative(repositoryRoot, absolutePath)
      .split(sep)
      .join("/");
    return {
      idx: entry.idx,
      when: entry.when,
      tag: entry.tag,
      repositoryPath,
      sha256: sha256(readFileSync(absolutePath)),
    };
  });
  const digestPayload =
    entries
      .map((entry) => `${entry.repositoryPath}\n${entry.sha256}`)
      .join("\n") + "\n";

  return {
    entries,
    migrationHead: entries[18].tag,
    predecessor: entries[17].tag,
    headSha256: entries[18].sha256,
    chainDigest: sha256(digestPayload),
  };
}

export type GeneratedMigrationView = {
  folder: string;
  sourceIdentity: MigrationChainIdentity;
};

export function createPredecessorMigrationView(
  repositoryRoot: string,
): GeneratedMigrationView {
  const sourceIdentity = readMigrationChainIdentity(repositoryRoot);
  const sourceFolder = resolve(
    repositoryRoot,
    TASK02_UPGRADE_CONTRACT.migrationFolder,
  );
  const folder = mkdtempSync(join(tmpdir(), "agentoma-task02-upgrade-"));
  const metaFolder = join(folder, "meta");
  mkdirSync(metaFolder);

  try {
    const sourceJournal = readJournal(sourceFolder);
    const predecessorEntries = sourceJournal.entries.slice(0, 18);
    writeFileSync(
      join(metaFolder, "_journal.json"),
      `${JSON.stringify(
        { ...sourceJournal, entries: predecessorEntries },
        null,
        2,
      )}\n`,
      "utf8",
    );

    for (const entry of sourceIdentity.entries.slice(0, 18)) {
      const sourcePath = join(sourceFolder, `${entry.tag}.sql`);
      const destinationPath = join(folder, `${entry.tag}.sql`);
      copyFileSync(sourcePath, destinationPath);
      if (sha256(readFileSync(destinationPath)) !== entry.sha256) {
        denyTask02Upgrade("MIGRATION_VIEW_DENIED");
      }
    }

    if (existsSync(join(folder, `${TASK02_UPGRADE_CONTRACT.headTag}.sql`))) {
      denyTask02Upgrade("MIGRATION_VIEW_DENIED");
    }
    const generatedJournal = readJournal(folder);
    if (
      generatedJournal.entries.length !== 18 ||
      generatedJournal.entries[17]?.tag !==
        TASK02_UPGRADE_CONTRACT.predecessorTag
    ) {
      denyTask02Upgrade("MIGRATION_VIEW_DENIED");
    }

    return { folder, sourceIdentity };
  } catch (error: unknown) {
    removeGeneratedMigrationView(folder);
    if (error instanceof Task02UpgradeHarnessError) throw error;
    denyTask02Upgrade("MIGRATION_VIEW_DENIED");
  }
}

export function removeGeneratedMigrationView(folder: string): void {
  const resolvedFolder = resolve(folder);
  const resolvedTmp = resolve(tmpdir());
  if (
    dirname(resolvedFolder) !== resolvedTmp ||
    !basename(resolvedFolder).startsWith("agentoma-task02-upgrade-")
  ) {
    denyTask02Upgrade("MIGRATION_VIEW_DENIED");
  }
  rmSync(resolvedFolder, { recursive: true, force: true });
}

const approvalSchema = z
  .object({
    schema_version: z.literal("1"),
    gate: z.literal("G1-D"),
    decision: z.literal("GRANTED"),
    approver: z.string().trim().min(1),
    approved_at_utc: z.iso.datetime({ offset: true }),
    expires_at_utc: z.iso.datetime({ offset: true }),
    candidate_sha: z.string().regex(/^[a-f0-9]{40}$/u),
    migration_head: z.literal(TASK02_UPGRADE_CONTRACT.headTag),
    migration_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    migration_chain_digest: z.string().regex(/^[a-f0-9]{64}$/u),
    execution_authorized: z.literal(true),
    live_access_authorized: z.literal(false),
    phi_authorized: z.literal(false),
    external_integrations_authorized: z.literal(false),
    db_push_authorized: z.literal(false),
    migration_edits_authorized: z.literal(false),
    manual_history_edits_authorized: z.literal(false),
    authorized_actions: z.array(z.string()),
    environment: z
      .object({
        kind: z.literal("disposable_local_docker"),
        identifier: z.literal("task02-predecessor-upgrade"),
        compose_file: z.literal(TASK02_UPGRADE_CONTRACT.composeFile),
        compose_project: z.literal(TASK02_UPGRADE_CONTRACT.composeProject),
        service: z.literal(TASK02_UPGRADE_CONTRACT.composeService),
        container: z.literal(TASK02_UPGRADE_CONTRACT.containerName),
        network: z.literal(TASK02_UPGRADE_CONTRACT.networkName),
        volume: z.literal(TASK02_UPGRADE_CONTRACT.volumeName),
        image: z.literal(TASK02_UPGRADE_CONTRACT.image),
        host_ip: z.literal(TASK02_UPGRADE_CONTRACT.hostIp),
        host_port: z.literal(5434),
        database: z.literal(TASK02_UPGRADE_CONTRACT.databaseName),
        synthetic_only: z.literal(true),
      })
      .strict(),
  })
  .strict();

export type Task02G1DApproval = z.infer<typeof approvalSchema>;

export function assertTask02UpgradeApproval(
  input: unknown,
  expected: {
    candidateSha: string;
    migrationIdentity: MigrationChainIdentity;
    now: Date;
  },
): Task02G1DApproval {
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) denyTask02Upgrade("APPROVAL_DENIED");
  const approval = parsed.data;
  const actualActions = [...approval.authorized_actions].sort(compareStrings);
  const expectedActions = [...TASK02_UPGRADE_ACTIONS].sort(compareStrings);

  if (
    approval.candidate_sha !== expected.candidateSha ||
    approval.migration_head !== expected.migrationIdentity.migrationHead ||
    approval.migration_sha256 !== expected.migrationIdentity.headSha256 ||
    approval.migration_chain_digest !== expected.migrationIdentity.chainDigest ||
    JSON.stringify(actualActions) !== JSON.stringify(expectedActions) ||
    new Date(approval.approved_at_utc).getTime() > expected.now.getTime()
  ) {
    denyTask02Upgrade("APPROVAL_DENIED");
  }
  if (new Date(approval.expires_at_utc).getTime() <= expected.now.getTime()) {
    denyTask02Upgrade("APPROVAL_EXPIRED");
  }
  return approval;
}

export function assertTask02UpgradeDatabaseUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    denyTask02Upgrade("DATABASE_TARGET_DENIED");
  }
  if (
    parsed.protocol !== "postgres:" ||
    parsed.hostname !== TASK02_UPGRADE_CONTRACT.hostIp ||
    parsed.port !== TASK02_UPGRADE_CONTRACT.hostPort ||
    parsed.pathname !== `/${TASK02_UPGRADE_CONTRACT.databaseName}` ||
    parsed.username !== TASK02_UPGRADE_CONTRACT.databaseUser ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    denyTask02Upgrade("DATABASE_TARGET_DENIED");
  }
}

const stringMapSchema = z.record(z.string(), z.string());

const composeConfigSchema = z
  .object({
    services: z.record(z.string(), z.unknown()),
    networks: z.record(z.string(), z.unknown()),
    volumes: z.record(z.string(), z.unknown()),
  })
  .passthrough();

const composeServiceSchema = z
  .object({
    image: z.string(),
    container_name: z.string(),
    restart: z.string(),
    labels: stringMapSchema,
    environment: stringMapSchema,
    ports: z.array(
      z
        .object({
          target: z.union([z.number(), z.string()]),
          published: z.union([z.number(), z.string()]),
          protocol: z.string(),
          host_ip: z.string(),
        })
        .passthrough(),
    ),
    volumes: z.array(
      z
        .object({
          type: z.string(),
          source: z.string(),
          target: z.string(),
        })
        .passthrough(),
    ),
    networks: z.record(z.string(), z.unknown()),
  })
  .passthrough();

const composeResourceSchema = z
  .object({
    name: z.string(),
    labels: stringMapSchema,
  })
  .passthrough();

export function assertTask02UpgradeComposeConfig(input: unknown): void {
  const config = composeConfigSchema.safeParse(input);
  if (!config.success) denyTask02Upgrade("COMPOSE_CONFIG_DENIED");
  if (
    Object.keys(config.data.services).length !== 1 ||
    Object.keys(config.data.networks).length !== 1 ||
    Object.keys(config.data.volumes).length !== 1
  ) {
    denyTask02Upgrade("COMPOSE_CONFIG_DENIED");
  }

  const service = composeServiceSchema.safeParse(
    config.data.services[TASK02_UPGRADE_CONTRACT.composeService],
  );
  const network = composeResourceSchema
    .extend({ internal: z.literal(true) })
    .safeParse(config.data.networks.task02_upgrade_network);
  const volume = composeResourceSchema.safeParse(
    config.data.volumes.task02_upgrade_data,
  );
  if (!service.success || !network.success || !volume.success) {
    denyTask02Upgrade("COMPOSE_CONFIG_DENIED");
  }

  const environment = service.data.environment;
  if (
    service.data.image !== TASK02_UPGRADE_CONTRACT.image ||
    service.data.container_name !== TASK02_UPGRADE_CONTRACT.containerName ||
    service.data.restart !== "no" ||
    !hasExactTaskLabels(service.data.labels) ||
    Object.keys(environment).length !== 3 ||
    environment.POSTGRES_USER !== TASK02_UPGRADE_CONTRACT.databaseUser ||
    environment.POSTGRES_HOST_AUTH_METHOD !== "trust" ||
    environment.POSTGRES_DB !== TASK02_UPGRADE_CONTRACT.databaseName
  ) {
    denyTask02Upgrade("COMPOSE_CONFIG_DENIED");
  }

  const port = service.data.ports[0];
  if (
    service.data.ports.length !== 1 ||
    String(port?.target) !== "5432" ||
    String(port?.published) !== TASK02_UPGRADE_CONTRACT.hostPort ||
    port?.host_ip !== TASK02_UPGRADE_CONTRACT.hostIp ||
    port?.protocol !== "tcp"
  ) {
    denyTask02Upgrade("PORT_BINDING_DENIED");
  }
  const mount = service.data.volumes[0];
  if (
    service.data.volumes.length !== 1 ||
    mount?.type !== "volume" ||
    mount?.source !== "task02_upgrade_data" ||
    mount?.target !== TASK02_UPGRADE_CONTRACT.dataPath ||
    Object.keys(service.data.networks).length !== 1 ||
    !("task02_upgrade_network" in service.data.networks)
  ) {
    denyTask02Upgrade("VOLUME_DENIED");
  }
  if (
    network.data.name !== TASK02_UPGRADE_CONTRACT.networkName ||
    volume.data.name !== TASK02_UPGRADE_CONTRACT.volumeName ||
    !hasExactTaskLabels(network.data.labels) ||
    !hasExactTaskLabels(volume.data.labels)
  ) {
    denyTask02Upgrade("COMPOSE_CONFIG_DENIED");
  }
}

export type Task02UpgradePreStartSnapshot = {
  serverVersion: string;
  dockerEndpoint: string;
  existingContainerIds: string[];
  existingNetworkIds: string[];
  existingVolumeNames: string[];
};

export function assertTask02UpgradePreStartSnapshot(
  snapshot: Task02UpgradePreStartSnapshot,
): void {
  if (!snapshot.serverVersion.trim()) denyTask02Upgrade("STATE_DENIED");
  if (!/^(?:npipe|unix):\/\//u.test(snapshot.dockerEndpoint)) {
    denyTask02Upgrade("DOCKER_ENDPOINT_DENIED");
  }
  if (
    snapshot.existingContainerIds.length !== 0 ||
    snapshot.existingNetworkIds.length !== 0 ||
    snapshot.existingVolumeNames.length !== 0
  ) {
    denyTask02Upgrade("STALE_RESOURCE_DENIED");
  }
}

const portBindingsSchema = z.record(
  z.string(),
  z
    .array(
      z
        .object({ HostIp: z.string(), HostPort: z.string() })
        .strict(),
    )
    .nullable(),
);

const mountSchema = z
  .object({
    Type: z.string(),
    Name: z.string().optional(),
    Destination: z.string(),
    RW: z.boolean(),
  })
  .passthrough();

const runtimeSnapshotSchema = z
  .object({
    composeContainerId: z.string().min(12),
    containerId: z.string().min(12),
    status: z.string(),
    healthStatus: z.string(),
    restartCount: z.number().int().nonnegative(),
    image: z.string(),
    imageId: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
    composeService: z.string(),
    composeProject: z.string(),
    expectedConfigHash: z.string().regex(/^[a-f0-9]{64}$/u),
    actualConfigHash: z.string().regex(/^[a-f0-9]{64}$/u),
    labels: stringMapSchema,
    portBindings: portBindingsSchema,
    mounts: z.array(mountSchema),
    networkNames: z.array(z.string()),
    networkLabels: stringMapSchema,
    volumeLabels: stringMapSchema,
  })
  .strict();

export type Task02UpgradeRuntimeSnapshot = z.infer<
  typeof runtimeSnapshotSchema
>;

function assertOwnedRuntimeResources(
  snapshot: Task02UpgradeRuntimeSnapshot,
): void {
  const mount = snapshot.mounts[0];
  if (
    !sameContainerId(snapshot.composeContainerId, snapshot.containerId) ||
    snapshot.composeService !== TASK02_UPGRADE_CONTRACT.composeService ||
    snapshot.composeProject !== TASK02_UPGRADE_CONTRACT.composeProject ||
    !hasExactTaskLabels(snapshot.labels) ||
    snapshot.mounts.length !== 1 ||
    mount?.Type !== "volume" ||
    mount.Name !== TASK02_UPGRADE_CONTRACT.volumeName ||
    mount.Destination !== TASK02_UPGRADE_CONTRACT.dataPath ||
    mount.RW !== true ||
    snapshot.networkNames.length !== 1 ||
    snapshot.networkNames[0] !== TASK02_UPGRADE_CONTRACT.networkName ||
    !hasExactTaskLabels(snapshot.networkLabels) ||
    !hasExactTaskLabels(snapshot.volumeLabels)
  ) {
    denyTask02Upgrade("COMPOSE_OWNERSHIP_DENIED");
  }
}

export function assertTask02UpgradeRuntimeSnapshot(input: unknown): void {
  const parsed = runtimeSnapshotSchema.safeParse(input);
  if (!parsed.success) denyTask02Upgrade("MALFORMED_INSPECTION");
  const snapshot = parsed.data;
  assertOwnedRuntimeResources(snapshot);

  if (snapshot.expectedConfigHash !== snapshot.actualConfigHash) {
    denyTask02Upgrade("CONFIG_HASH_DENIED");
  }
  if (snapshot.image !== TASK02_UPGRADE_CONTRACT.image) {
    denyTask02Upgrade("IMAGE_DENIED");
  }
  if (snapshot.status !== "running" || snapshot.healthStatus !== "healthy") {
    denyTask02Upgrade("STATE_DENIED");
  }
  const portKeys = Object.keys(snapshot.portBindings);
  const bindings = snapshot.portBindings[TASK02_UPGRADE_CONTRACT.containerPort];
  if (
    portKeys.length !== 1 ||
    portKeys[0] !== TASK02_UPGRADE_CONTRACT.containerPort ||
    !bindings ||
    bindings.length !== 1 ||
    bindings[0].HostIp !== TASK02_UPGRADE_CONTRACT.hostIp ||
    bindings[0].HostPort !== TASK02_UPGRADE_CONTRACT.hostPort
  ) {
    denyTask02Upgrade("PORT_BINDING_DENIED");
  }
}

const ownedResourceSchema = z
  .object({
    container: z
      .object({
        name: z.literal(TASK02_UPGRADE_CONTRACT.containerName),
        labels: stringMapSchema,
      })
      .strict()
      .nullable(),
    network: z
      .object({
        name: z.literal(TASK02_UPGRADE_CONTRACT.networkName),
        labels: stringMapSchema,
      })
      .strict()
      .nullable(),
    volume: z
      .object({
        name: z.literal(TASK02_UPGRADE_CONTRACT.volumeName),
        labels: stringMapSchema,
      })
      .strict()
      .nullable(),
  })
  .strict();

export function assertTask02UpgradeTeardownOwnership(input: unknown): void {
  const parsed = ownedResourceSchema.safeParse(input);
  if (!parsed.success) denyTask02Upgrade("RESOURCE_OWNERSHIP_DENIED");
  for (const resource of [
    parsed.data.container,
    parsed.data.network,
    parsed.data.volume,
  ]) {
    if (resource && !hasExactTaskLabels(resource.labels)) {
      denyTask02Upgrade("RESOURCE_OWNERSHIP_DENIED");
    }
  }
}

export function assertTask02UpgradeResourcesAbsent(snapshot: {
  containerIds: string[];
  networkIds: string[];
  volumeNames: string[];
}): void {
  if (
    snapshot.containerIds.length !== 0 ||
    snapshot.networkIds.length !== 0 ||
    snapshot.volumeNames.length !== 0
  ) {
    denyTask02Upgrade("TEARDOWN_INCOMPLETE");
  }
}
