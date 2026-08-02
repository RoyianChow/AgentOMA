import { spawnSync } from "node:child_process";

import { z } from "zod";

// These constants are the test-only trust boundary: loopback TCP, a fixed
// Postgres image, and disposable storage. A test must fail closed rather than
// silently connect to Supabase or reuse a container from another worktree.
const TEST_CONTAINER_NAME = "agentoma-test-db";
const TEST_COMPOSE_SERVICE = "test-db";
const TEST_IMAGE = "postgres:16-alpine";
const TEST_CONTAINER_PORT = "5432/tcp";
const TEST_HOST_IP = "127.0.0.1";
const TEST_HOST_PORT = "5433";
const TEST_DATA_PATH = "/var/lib/postgresql/data";

const stringMapSchema = z.record(z.string(), z.string());
const portBindingsSchema = z.record(
  z.string(),
  z
    .array(
      z
        .object({
          HostIp: z.string(),
          HostPort: z.string(),
        })
        .strict(),
    )
    .nullable(),
);

const runtimeSnapshotSchema = z
  .object({
    composeContainerId: z.string().min(12),
    containerId: z.string().min(12),
    status: z.string(),
    healthStatus: z.string(),
    image: z.string(),
    composeService: z.string(),
    composeProject: z.string().min(1),
    expectedConfigHash: z.string().regex(/^[a-f0-9]{64}$/),
    actualConfigHash: z.string().regex(/^[a-f0-9]{64}$/),
    portBindings: portBindingsSchema,
    tmpfs: stringMapSchema.nullable(),
  })
  .strict();

export type TestDbRuntimeSnapshot = z.infer<typeof runtimeSnapshotSchema>;

export type TestDbPreStartSnapshot = {
  serverVersion: string;
  services: string[];
  images: string[];
  existingContainerIds: string[];
};

export type TestDbEnvironmentReason =
  | "COMPOSE_CONFIG_DENIED"
  | "COMPOSE_CONTAINER_MISSING"
  | "COMPOSE_OWNERSHIP_DENIED"
  | "CONFIG_HASH_DENIED"
  | "DOCKER_UNAVAILABLE"
  | "IMAGE_DENIED"
  | "INSPECTION_DENIED"
  | "MALFORMED_INSPECTION"
  | "PORT_BINDING_DENIED"
  | "STALE_CONTAINER_DENIED"
  | "STATE_DENIED"
  | "TMPFS_REQUIRED";

export class TestDbEnvironmentError extends Error {
  constructor(public readonly reason: TestDbEnvironmentReason) {
    super(`TEST_DB_ENVIRONMENT_DENIED:${reason}`);
    this.name = "TestDbEnvironmentError";
  }
}

function deny(reason: TestDbEnvironmentReason): never {
  throw new TestDbEnvironmentError(reason);
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

/**
 * Pure pre-start contract. A named container must never be reused: it may have
 * been created by another worktree, an older Compose file, or an unsafe port or
 * storage configuration. The post-start contract separately proves the newly
 * created container matches the current Compose bytes.
 */
export function assertTestDbPreStartSnapshot(
  snapshot: TestDbPreStartSnapshot,
): void {
  if (!snapshot.serverVersion.trim()) deny("DOCKER_UNAVAILABLE");
  if (
    snapshot.services.length !== 1 ||
    snapshot.services[0] !== TEST_COMPOSE_SERVICE ||
    snapshot.images.length !== 1 ||
    snapshot.images[0] !== TEST_IMAGE
  ) {
    deny("COMPOSE_CONFIG_DENIED");
  }
  if (snapshot.existingContainerIds.length !== 0) {
    deny("STALE_CONTAINER_DENIED");
  }
}

/**
 * Pure running-container contract. No database connection is attempted until
 * this passes, so a stale Postgres listening on the expected port cannot be
 * mistaken for the approved disposable environment.
 */
export function assertTestDbRuntimeSnapshot(input: unknown): void {
  const parsed = runtimeSnapshotSchema.safeParse(input);
  if (!parsed.success) deny("MALFORMED_INSPECTION");
  const snapshot = parsed.data;

  if (!sameContainerId(snapshot.composeContainerId, snapshot.containerId)) {
    deny("COMPOSE_OWNERSHIP_DENIED");
  }
  if (
    snapshot.composeService !== TEST_COMPOSE_SERVICE ||
    !snapshot.composeProject.trim()
  ) {
    deny("COMPOSE_OWNERSHIP_DENIED");
  }
  if (snapshot.expectedConfigHash !== snapshot.actualConfigHash) {
    deny("CONFIG_HASH_DENIED");
  }
  if (snapshot.image !== TEST_IMAGE) deny("IMAGE_DENIED");
  if (snapshot.status !== "running" || snapshot.healthStatus !== "healthy") {
    deny("STATE_DENIED");
  }

  const portKeys = Object.keys(snapshot.portBindings);
  const bindings = snapshot.portBindings[TEST_CONTAINER_PORT];
  if (
    portKeys.length !== 1 ||
    portKeys[0] !== TEST_CONTAINER_PORT ||
    !bindings ||
    bindings.length !== 1 ||
    bindings[0].HostIp !== TEST_HOST_IP ||
    bindings[0].HostPort !== TEST_HOST_PORT
  ) {
    deny("PORT_BINDING_DENIED");
  }

  if (!snapshot.tmpfs) deny("TMPFS_REQUIRED");
  const tmpfsKeys = Object.keys(snapshot.tmpfs);
  if (
    tmpfsKeys.length !== 1 ||
    tmpfsKeys[0] !== TEST_DATA_PATH
  ) {
    deny("TMPFS_REQUIRED");
  }
}

type SafeCommandResult = {
  status: number | null;
  stdout: string;
};

function runDocker(args: string[], cwd: string): SafeCommandResult {
  const result = spawnSync("docker", args, {
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

function requireDockerOutput(
  args: string[],
  cwd: string,
  reason: TestDbEnvironmentReason,
): string {
  const result = runDocker(args, cwd);
  if (result.status !== 0 || !result.stdout) deny(reason);
  return result.stdout;
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    deny("MALFORMED_INSPECTION");
  }
}

function readExpectedConfigHash(cwd: string): string {
  const output = requireDockerOutput(
    ["compose", "config", "--hash", TEST_COMPOSE_SERVICE],
    cwd,
    "COMPOSE_CONFIG_DENIED",
  );
  const match = output.match(/^test-db\s+([a-f0-9]{64})$/u);
  if (!match) deny("COMPOSE_CONFIG_DENIED");
  return match[1];
}

function assertDockerServer(cwd: string): string {
  return requireDockerOutput(
    ["version", "--format", "{{.Server.Version}}"],
    cwd,
    "DOCKER_UNAVAILABLE",
  );
}

export function assertNoExistingTestDbContainer(cwd = process.cwd()): void {
  const serverVersion = assertDockerServer(cwd);
  const services = lines(
    requireDockerOutput(
      ["compose", "config", "--services"],
      cwd,
      "COMPOSE_CONFIG_DENIED",
    ),
  );
  const images = lines(
    requireDockerOutput(
      ["compose", "config", "--images"],
      cwd,
      "COMPOSE_CONFIG_DENIED",
    ),
  );
  // Read the hash before startup so malformed Compose configuration fails
  // before Docker is allowed to create anything.
  readExpectedConfigHash(cwd);

  const existing = runDocker(
    [
      "container",
      "ls",
      "--all",
      "--filter",
      `name=^/${TEST_CONTAINER_NAME}$`,
      "--format",
      "{{.ID}}",
    ],
    cwd,
  );
  if (existing.status !== 0) deny("INSPECTION_DENIED");

  assertTestDbPreStartSnapshot({
    serverVersion,
    services,
    images,
    existingContainerIds: lines(existing.stdout),
  });
}

export function assertRunningTestDbEnvironment(cwd = process.cwd()): void {
  assertDockerServer(cwd);
  const expectedConfigHash = readExpectedConfigHash(cwd);
  const composeContainerId = requireDockerOutput(
    ["compose", "ps", "--all", "--quiet", TEST_COMPOSE_SERVICE],
    cwd,
    "COMPOSE_CONTAINER_MISSING",
  );

  const inspect = (format: string): string =>
    requireDockerOutput(
      ["inspect", "--format", format, composeContainerId],
      cwd,
      "INSPECTION_DENIED",
    );

  assertTestDbRuntimeSnapshot({
    composeContainerId,
    containerId: inspect("{{.Id}}"),
    status: inspect("{{.State.Status}}"),
    healthStatus: inspect(
      "{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}",
    ),
    image: inspect("{{.Config.Image}}"),
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
    portBindings: parseJson(inspect("{{json .HostConfig.PortBindings}}")),
    tmpfs: parseJson(inspect("{{json .HostConfig.Tmpfs}}")),
  });
}
