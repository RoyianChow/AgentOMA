import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, resolve } from "node:path";

import {
  TASK02_UPGRADE_CONTRACT,
  Task02UpgradeHarnessError,
  assertTask02UpgradeApproval,
  assertTask02UpgradeComposeConfig,
  assertTask02UpgradePreStartSnapshot,
  assertTask02UpgradeResourcesAbsent,
  assertTask02UpgradeRuntimeSnapshot,
  assertTask02UpgradeTeardownOwnership,
  denyTask02Upgrade,
  readMigrationChainIdentity,
  type Task02UpgradeReason,
  type Task02UpgradeRuntimeSnapshot,
} from "./predecessor-upgrade-contract";
import {
  runTask02PredecessorUpgrade,
  verifyTask02UpgradeAfterRestart,
  type Task02UpgradeDatabaseResult,
} from "./predecessor-upgrade-db";

const compareStrings = (left: string, right: string): number =>
  left.localeCompare(right, "en-US", {
    sensitivity: "variant",
    numeric: false,
  });

type SafeCommandResult = {
  status: number | null;
  stdout: string;
};

type ResourceSnapshot = {
  containerIds: string[];
  networkIds: string[];
  volumeNames: string[];
};

type HarnessState = {
  dockerServerVersion?: string;
  imageId?: string;
  configHash?: string;
  restartCountBefore?: number;
  restartCountAfter?: number;
  database?: Task02UpgradeDatabaseResult;
  afterRestartCatalogFingerprint?: string;
  teardown: "PASS" | "FAIL" | "NOT_RUN";
};

function lines(value: string): string[] {
  return value
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function runCommand(executable: string, args: string[], cwd: string): SafeCommandResult {
  const result = spawnSync(executable, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  return {
    status: result.status,
    stdout: typeof result.stdout === "string" ? result.stdout.trim() : "",
  };
}

function requireCommandOutput(
  executable: string,
  args: string[],
  cwd: string,
  reason: Task02UpgradeReason,
): string {
  const result = runCommand(executable, args, cwd);
  if (result.status !== 0 || !result.stdout) denyTask02Upgrade(reason);
  return result.stdout;
}

function requireCommandSuccess(
  executable: string,
  args: string[],
  cwd: string,
  reason: Task02UpgradeReason,
): void {
  const result = runCommand(executable, args, cwd);
  if (result.status !== 0) denyTask02Upgrade(reason);
}

function composeArgs(...args: string[]): string[] {
  return [
    "compose",
    "-f",
    TASK02_UPGRADE_CONTRACT.composeFile,
    "-p",
    TASK02_UPGRADE_CONTRACT.composeProject,
    ...args,
  ];
}

function requireDockerOutput(
  args: string[],
  cwd: string,
  reason: Task02UpgradeReason,
): string {
  return requireCommandOutput("docker", args, cwd, reason);
}

function requireDockerSuccess(
  args: string[],
  cwd: string,
  reason: Task02UpgradeReason,
): void {
  requireCommandSuccess("docker", args, cwd, reason);
}

function runDockerList(args: string[], cwd: string): string[] {
  const result = runCommand("docker", args, cwd);
  if (result.status !== 0) denyTask02Upgrade("INSPECTION_DENIED");
  return lines(result.stdout);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    denyTask02Upgrade("MALFORMED_INSPECTION");
  }
}

function readConfigHash(cwd: string): string {
  const output = requireDockerOutput(
    composeArgs("config", "--hash", TASK02_UPGRADE_CONTRACT.composeService),
    cwd,
    "COMPOSE_CONFIG_DENIED",
  );
  const escapedService = TASK02_UPGRADE_CONTRACT.composeService.replace(
    /[.*+?^${}()|[\]\\]/gu,
    "\\$&",
  );
  const match = output.match(
    new RegExp(`^${escapedService}\\s+([a-f0-9]{64})$`, "u"),
  );
  if (!match) denyTask02Upgrade("COMPOSE_CONFIG_DENIED");
  return match[1];
}

function listExactResources(cwd: string): ResourceSnapshot {
  const containerIds = runDockerList(
    [
      "container",
      "ls",
      "--all",
      "--filter",
      `name=^/${TASK02_UPGRADE_CONTRACT.containerName}$`,
      "--format",
      "{{.ID}}",
    ],
    cwd,
  );
  const networkIds = runDockerList(
    [
      "network",
      "ls",
      "--filter",
      `name=^${TASK02_UPGRADE_CONTRACT.networkName}$`,
      "--format",
      "{{.ID}}",
    ],
    cwd,
  );
  const volumeNames = runDockerList(
    [
      "volume",
      "ls",
      "--filter",
      `name=^${TASK02_UPGRADE_CONTRACT.volumeName}$`,
      "--format",
      "{{.Name}}",
    ],
    cwd,
  );
  return { containerIds, networkIds, volumeNames };
}

function assertPreStart(cwd: string): string {
  const serverVersion = requireDockerOutput(
    ["version", "--format", "{{.Server.Version}}"],
    cwd,
    "DOCKER_UNAVAILABLE",
  );
  const dockerEndpoint = requireDockerOutput(
    [
      "context",
      "inspect",
      "--format",
      '{{(index .Endpoints "docker").Host}}',
    ],
    cwd,
    "DOCKER_ENDPOINT_DENIED",
  );
  const composeConfig = parseJson(
    requireDockerOutput(
      composeArgs("config", "--format", "json"),
      cwd,
      "COMPOSE_CONFIG_DENIED",
    ),
  );
  assertTask02UpgradeComposeConfig(composeConfig);
  readConfigHash(cwd);
  const existing = listExactResources(cwd);
  assertTask02UpgradePreStartSnapshot({
    serverVersion,
    dockerEndpoint,
    existingContainerIds: existing.containerIds,
    existingNetworkIds: existing.networkIds,
    existingVolumeNames: existing.volumeNames,
  });
  return serverVersion;
}

function inspectRuntime(cwd: string): Task02UpgradeRuntimeSnapshot {
  const expectedConfigHash = readConfigHash(cwd);
  const composeContainerId = requireDockerOutput(
    composeArgs(
      "ps",
      "--all",
      "--quiet",
      TASK02_UPGRADE_CONTRACT.composeService,
    ),
    cwd,
    "COMPOSE_CONTAINER_MISSING",
  );
  const inspect = (format: string): string =>
    requireDockerOutput(
      ["inspect", "--format", format, composeContainerId],
      cwd,
      "INSPECTION_DENIED",
    );
  const networkState = parseJson(
    inspect("{{json .NetworkSettings.Networks}}"),
  ) as Record<string, unknown>;
  const snapshot: Task02UpgradeRuntimeSnapshot = {
    composeContainerId,
    containerId: inspect("{{.Id}}"),
    status: inspect("{{.State.Status}}"),
    healthStatus: inspect(
      "{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}",
    ),
    restartCount: Number(inspect("{{.RestartCount}}")),
    image: inspect("{{.Config.Image}}"),
    imageId: inspect("{{.Image}}"),
    composeService: inspect(
      '{{index .Config.Labels "com.docker.compose.service"}}',
    ),
    composeProject: inspect(
      '{{index .Config.Labels "com.docker.compose.project"}}',
    ),
    expectedConfigHash,
    actualConfigHash: inspect(
      '{{index .Config.Labels "com.docker.compose.config-hash"}}',
    ),
    labels: parseJson(inspect("{{json .Config.Labels}}")) as Record<
      string,
      string
    >,
    portBindings: parseJson(
      inspect("{{json .HostConfig.PortBindings}}"),
    ) as Task02UpgradeRuntimeSnapshot["portBindings"],
    mounts: parseJson(inspect("{{json .Mounts}}")) as Task02UpgradeRuntimeSnapshot["mounts"],
    networkNames: Object.keys(networkState).sort(compareStrings),
    networkLabels: parseJson(
      requireDockerOutput(
        [
          "network",
          "inspect",
          "--format",
          "{{json .Labels}}",
          TASK02_UPGRADE_CONTRACT.networkName,
        ],
        cwd,
        "INSPECTION_DENIED",
      ),
    ) as Record<string, string>,
    volumeLabels: parseJson(
      requireDockerOutput(
        [
          "volume",
          "inspect",
          "--format",
          "{{json .Labels}}",
          TASK02_UPGRADE_CONTRACT.volumeName,
        ],
        cwd,
        "INSPECTION_DENIED",
      ),
    ) as Record<string, string>,
  };
  assertTask02UpgradeRuntimeSnapshot(snapshot);
  return snapshot;
}

async function waitForHealthyRuntime(
  cwd: string,
): Promise<Task02UpgradeRuntimeSnapshot> {
  const deadline = Date.now() + 45_000;
  let lastReason: Task02UpgradeReason = "STATE_DENIED";
  while (Date.now() < deadline) {
    try {
      return inspectRuntime(cwd);
    } catch (error: unknown) {
      if (
        !(error instanceof Task02UpgradeHarnessError) ||
        !["STATE_DENIED", "COMPOSE_CONTAINER_MISSING"].includes(error.reason)
      ) {
        throw error;
      }
      lastReason = error.reason;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
    }
  }
  denyTask02Upgrade(lastReason);
}

function inspectTaskLabels(
  cwd: string,
  resourceType: "container" | "network" | "volume",
  identifier: string,
): Record<string, string> {
  return parseJson(
    requireDockerOutput(
      [resourceType, "inspect", "--format", "{{json .Config.Labels}}", identifier],
      cwd,
      "INSPECTION_DENIED",
    ),
  ) as Record<string, string>;
}

function inspectTeardownOwnership(cwd: string): void {
  const resources = listExactResources(cwd);
  if (
    resources.containerIds.length > 1 ||
    resources.networkIds.length > 1 ||
    resources.volumeNames.length > 1
  ) {
    denyTask02Upgrade("RESOURCE_OWNERSHIP_DENIED");
  }
  const container = resources.containerIds[0]
    ? {
        name: requireDockerOutput(
          ["inspect", "--format", "{{.Name}}", resources.containerIds[0]],
          cwd,
          "INSPECTION_DENIED",
        ).replace(/^\//u, ""),
        labels: inspectTaskLabels(
          cwd,
          "container",
          resources.containerIds[0],
        ),
      }
    : null;
  const network = resources.networkIds[0]
    ? {
        name: requireDockerOutput(
          [
            "network",
            "inspect",
            "--format",
            "{{.Name}}",
            resources.networkIds[0],
          ],
          cwd,
          "INSPECTION_DENIED",
        ),
        labels: parseJson(
          requireDockerOutput(
            [
              "network",
              "inspect",
              "--format",
              "{{json .Labels}}",
              resources.networkIds[0],
            ],
            cwd,
            "INSPECTION_DENIED",
          ),
        ) as Record<string, string>,
      }
    : null;
  const volume = resources.volumeNames[0]
    ? {
        name: resources.volumeNames[0],
        labels: parseJson(
          requireDockerOutput(
            [
              "volume",
              "inspect",
              "--format",
              "{{json .Labels}}",
              resources.volumeNames[0],
            ],
            cwd,
            "INSPECTION_DENIED",
          ),
        ) as Record<string, string>,
      }
    : null;
  assertTask02UpgradeTeardownOwnership({ container, network, volume });
}

function teardownExactResources(cwd: string): void {
  const before = listExactResources(cwd);
  if (
    before.containerIds.length === 0 &&
    before.networkIds.length === 0 &&
    before.volumeNames.length === 0
  ) {
    assertTask02UpgradeResourcesAbsent(before);
    return;
  }
  inspectTeardownOwnership(cwd);
  requireDockerSuccess(
    composeArgs(
      "down",
      "--volumes",
      "--remove-orphans",
      "--timeout",
      "30",
    ),
    cwd,
    "TEARDOWN_DENIED",
  );
  assertTask02UpgradeResourcesAbsent(listExactResources(cwd));
}

function parseApprovalPath(argv: string[], cwd: string): string {
  if (
    argv.length !== 2 ||
    argv[0] !== "--approval-file" ||
    !argv[1]?.trim()
  ) {
    denyTask02Upgrade("APPROVAL_FILE_DENIED");
  }
  return isAbsolute(argv[1]) ? resolve(argv[1]) : resolve(cwd, argv[1]);
}

function readCleanCandidateSha(cwd: string): string {
  const sha = requireCommandOutput(
    "git",
    ["rev-parse", "HEAD"],
    cwd,
    "GIT_IDENTITY_DENIED",
  );
  if (!/^[a-f0-9]{40}$/u.test(sha)) denyTask02Upgrade("GIT_IDENTITY_DENIED");
  const status = runCommand(
    "git",
    ["status", "--porcelain", "--untracked-files=normal"],
    cwd,
  );
  if (status.status !== 0) denyTask02Upgrade("GIT_IDENTITY_DENIED");
  if (status.stdout !== "") denyTask02Upgrade("WORKTREE_DENIED");
  return sha;
}

function safeReason(error: unknown): Task02UpgradeReason {
  return error instanceof Task02UpgradeHarnessError
    ? error.reason
    : "COMMAND_DENIED";
}

function writeEvidence(
  cwd: string,
  candidateSha: string,
  approvalHash: string,
  migrationIdentity: ReturnType<typeof readMigrationChainIdentity>,
  startedAtUtc: string,
  state: HarnessState,
  result: "PASS" | "FAIL",
  reason: Task02UpgradeReason | null,
): { repositoryPath: string; sha256: string } {
  const repositoryPath = `${TASK02_UPGRADE_CONTRACT.evidenceRoot}/${candidateSha}/predecessor-upgrade-run.json`;
  const absolutePath = resolve(cwd, repositoryPath);
  if (existsSync(absolutePath)) denyTask02Upgrade("EVIDENCE_WRITE_DENIED");
  mkdirSync(resolve(absolutePath, ".."), { recursive: true });
  const record = {
    schema_version: "1",
    task: "02",
    controls: ["T02-02", "T02-03", "T02-04", "T02-05", "T02-07", "T02-08"],
    result,
    safe_reason: reason,
    command_id: "npm:test:db:upgrade",
    exit_code: result === "PASS" ? 0 : 1,
    started_at_utc: startedAtUtc,
    completed_at_utc: new Date().toISOString(),
    source_commit_sha: candidateSha,
    working_tree_at_start: "clean",
    migration_head: migrationIdentity.migrationHead,
    migration_sha256: migrationIdentity.headSha256,
    migration_chain_digest: migrationIdentity.chainDigest,
    predecessor_migration: migrationIdentity.predecessor,
    approval_artifact_sha256: approvalHash,
    environment: {
      class: "disposable_local_docker",
      identifier: "task02-predecessor-upgrade",
      image: TASK02_UPGRADE_CONTRACT.image,
      image_id: state.imageId ?? "NOT_VERIFIED",
      docker_server_version: state.dockerServerVersion ?? "NOT_VERIFIED",
      postgres_version: state.database?.postgresVersion ?? "NOT_VERIFIED",
      loopback_binding_verified: state.imageId !== undefined,
      internal_network_verified: state.imageId !== undefined,
      named_disposable_volume_verified: state.imageId !== undefined,
      config_hash: state.configHash ?? "NOT_VERIFIED",
    },
    database: state.database ?? null,
    restart: {
      count_before: state.restartCountBefore ?? null,
      count_after: state.restartCountAfter ?? null,
      persisted_catalog_fingerprint:
        state.afterRestartCatalogFingerprint ?? null,
    },
    teardown: state.teardown,
    safety: {
      synthetic_only: true,
      real_phi_used: false,
      production_credentials_used: false,
      supabase_accessed: false,
      external_integrations_used: false,
      db_push_used: false,
      migration_history_manually_edited: false,
      existing_migration_changed: false,
    },
  };
  const bytes = `${JSON.stringify(record, null, 2)}\n`;
  try {
    writeFileSync(absolutePath, bytes, { encoding: "utf8", flag: "wx" });
  } catch {
    denyTask02Upgrade("EVIDENCE_WRITE_DENIED");
  }
  return { repositoryPath, sha256: sha256(bytes) };
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const approvalPath = parseApprovalPath(process.argv.slice(2), cwd);
  const candidateSha = readCleanCandidateSha(cwd);
  const migrationIdentity = readMigrationChainIdentity(cwd);
  let approvalBytes: string;
  try {
    approvalBytes = readFileSync(approvalPath, "utf8");
  } catch {
    denyTask02Upgrade("APPROVAL_FILE_DENIED");
  }
  let approvalInput: unknown;
  try {
    approvalInput = JSON.parse(approvalBytes) as unknown;
  } catch {
    denyTask02Upgrade("APPROVAL_FILE_DENIED");
  }
  assertTask02UpgradeApproval(approvalInput, {
    candidateSha,
    migrationIdentity,
    now: new Date(),
  });

  const evidencePath = resolve(
    cwd,
    TASK02_UPGRADE_CONTRACT.evidenceRoot,
    candidateSha,
    "predecessor-upgrade-run.json",
  );
  if (existsSync(evidencePath)) denyTask02Upgrade("EVIDENCE_WRITE_DENIED");

  const startedAtUtc = new Date().toISOString();
  const state: HarnessState = { teardown: "NOT_RUN" };
  let startupAttempted = false;
  let failureReason: Task02UpgradeReason | null = null;

  try {
    state.dockerServerVersion = assertPreStart(cwd);
    startupAttempted = true;
    requireDockerSuccess(
      composeArgs(
        "up",
        "-d",
        "--wait",
        "--wait-timeout",
        "60",
        "--force-recreate",
        TASK02_UPGRADE_CONTRACT.composeService,
      ),
      cwd,
      "COMMAND_DENIED",
    );
    const runtimeBefore = await waitForHealthyRuntime(cwd);
    state.imageId = runtimeBefore.imageId;
    state.configHash = runtimeBefore.actualConfigHash;
    state.restartCountBefore = runtimeBefore.restartCount;

    state.database = await runTask02PredecessorUpgrade(cwd, migrationIdentity);

    requireDockerSuccess(
      composeArgs(
        "restart",
        "--timeout",
        "30",
        TASK02_UPGRADE_CONTRACT.composeService,
      ),
      cwd,
      "RESTART_PERSISTENCE_DENIED",
    );
    const runtimeAfter = await waitForHealthyRuntime(cwd);
    if (
      runtimeAfter.containerId !== runtimeBefore.containerId ||
      runtimeAfter.restartCount <= runtimeBefore.restartCount
    ) {
      denyTask02Upgrade("RESTART_PERSISTENCE_DENIED");
    }
    state.restartCountAfter = runtimeAfter.restartCount;
    const afterRestart = await verifyTask02UpgradeAfterRestart(
      migrationIdentity,
      state.database.after,
    );
    state.afterRestartCatalogFingerprint = afterRestart.catalogFingerprint;
  } catch (error: unknown) {
    failureReason = safeReason(error);
  } finally {
    if (startupAttempted) {
      try {
        teardownExactResources(cwd);
        state.teardown = "PASS";
      } catch (error: unknown) {
        state.teardown = "FAIL";
        failureReason = safeReason(error);
      }
    }
  }

  const result = failureReason === null && state.teardown === "PASS" ? "PASS" : "FAIL";
  const evidence = writeEvidence(
    cwd,
    candidateSha,
    sha256(approvalBytes),
    migrationIdentity,
    startedAtUtc,
    state,
    result,
    failureReason,
  );
  const summary = {
    control: "T02-07/T02-08",
    result,
    reason: failureReason,
    evidence: evidence.repositoryPath,
    evidence_sha256: evidence.sha256,
  };
  if (result === "PASS") {
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } else {
    process.stderr.write(`${JSON.stringify(summary)}\n`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const reason = safeReason(error);
  process.stderr.write(`TASK02_UPGRADE_DENIED:${reason}\n`);
  process.exitCode = 1;
});
