import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertTestDbPreStartSnapshot,
  assertTestDbRuntimeSnapshot,
  type TestDbRuntimeSnapshot,
} from "@/lib/db/test/docker-environment";

const HASH = "a".repeat(64);

function validRuntimeSnapshot(): TestDbRuntimeSnapshot {
  return {
    composeContainerId: "a".repeat(64),
    containerId: "a".repeat(64),
    status: "running",
    healthStatus: "healthy",
    image: "postgres:16-alpine",
    composeService: "test-db",
    composeProject: "task-02-g1d",
    expectedConfigHash: HASH,
    actualConfigHash: HASH,
    portBindings: {
      "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "5433" }],
    },
    tmpfs: { "/var/lib/postgresql/data": "" },
  };
}

describe("Task 02 Docker database environment contract", () => {
  it("accepts only the current healthy Compose container contract", () => {
    expect(() => assertTestDbRuntimeSnapshot(validRuntimeSnapshot())).not.toThrow();
  });

  it("denies a stale named container before Compose starts", () => {
    expect(() =>
      assertTestDbPreStartSnapshot({
        serverVersion: "29.0.0",
        services: ["test-db"],
        images: ["postgres:16-alpine"],
        existingContainerIds: ["b".repeat(64)],
      }),
    ).toThrow("TEST_DB_ENVIRONMENT_DENIED:STALE_CONTAINER_DENIED");
  });

  it("denies an all-interface port binding", () => {
    const snapshot = validRuntimeSnapshot();
    snapshot.portBindings["5432/tcp"] = [
      { HostIp: "0.0.0.0", HostPort: "5433" },
    ];
    expect(() => assertTestDbRuntimeSnapshot(snapshot)).toThrow(
      "TEST_DB_ENVIRONMENT_DENIED:PORT_BINDING_DENIED",
    );
  });

  it("denies an additional IPv6 or external binding", () => {
    const snapshot = validRuntimeSnapshot();
    snapshot.portBindings["5432/tcp"] = [
      { HostIp: "127.0.0.1", HostPort: "5433" },
      { HostIp: "::", HostPort: "5433" },
    ];
    expect(() => assertTestDbRuntimeSnapshot(snapshot)).toThrow(
      "TEST_DB_ENVIRONMENT_DENIED:PORT_BINDING_DENIED",
    );
  });

  it("denies a container without disposable tmpfs storage", () => {
    const snapshot = validRuntimeSnapshot();
    snapshot.tmpfs = null;
    expect(() => assertTestDbRuntimeSnapshot(snapshot)).toThrow(
      "TEST_DB_ENVIRONMENT_DENIED:TMPFS_REQUIRED",
    );
  });

  it("denies a container owned by another Compose project", () => {
    const snapshot = validRuntimeSnapshot();
    snapshot.composeContainerId = "b".repeat(64);
    expect(() => assertTestDbRuntimeSnapshot(snapshot)).toThrow(
      "TEST_DB_ENVIRONMENT_DENIED:COMPOSE_OWNERSHIP_DENIED",
    );
  });

  it("denies a stale Compose configuration hash", () => {
    const snapshot = validRuntimeSnapshot();
    snapshot.actualConfigHash = "b".repeat(64);
    expect(() => assertTestDbRuntimeSnapshot(snapshot)).toThrow(
      "TEST_DB_ENVIRONMENT_DENIED:CONFIG_HASH_DENIED",
    );
  });

  it("denies a different image or unhealthy state", () => {
    const wrongImage = validRuntimeSnapshot();
    wrongImage.image = "postgres:latest";
    expect(() => assertTestDbRuntimeSnapshot(wrongImage)).toThrow(
      "TEST_DB_ENVIRONMENT_DENIED:IMAGE_DENIED",
    );

    const unhealthy = validRuntimeSnapshot();
    unhealthy.healthStatus = "unhealthy";
    expect(() => assertTestDbRuntimeSnapshot(unhealthy)).toThrow(
      "TEST_DB_ENVIRONMENT_DENIED:STATE_DENIED",
    );
  });

  it("never includes rejected inspection values in an error", () => {
    const snapshot = validRuntimeSnapshot();
    snapshot.composeProject = "SYNTHETIC-SENSITIVE-MARKER";
    snapshot.portBindings["5432/tcp"] = [
      { HostIp: "0.0.0.0", HostPort: "5433" },
    ];

    try {
      assertTestDbRuntimeSnapshot(snapshot);
      throw new Error("Expected the environment contract to refuse the snapshot.");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toBe("TEST_DB_ENVIRONMENT_DENIED:PORT_BINDING_DENIED");
      expect(message).not.toContain("SYNTHETIC-SENSITIVE-MARKER");
      expect(message).not.toContain("0.0.0.0");
    }
  });

  it("keeps both Docker checks ahead of database creation and connection", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    const startup = packageJson.scripts["test:db:up"];
    expect(startup.indexOf("test:db:preflight")).toBeGreaterThanOrEqual(0);
    expect(startup.indexOf("docker compose up")).toBeGreaterThan(
      startup.indexOf("test:db:preflight"),
    );
    expect(startup.indexOf("test:db:verify")).toBeGreaterThan(
      startup.indexOf("docker compose up"),
    );

    const globalSetup = readFileSync(
      resolve(process.cwd(), "src/lib/db/test/global-setup.ts"),
      "utf8",
    );
    expect(globalSetup.indexOf("assertRunningTestDbEnvironment();")).toBeGreaterThan(
      globalSetup.indexOf("assertLocalTestDb();"),
    );
    expect(globalSetup.indexOf("const client = postgres(TEST_DATABASE_URL")).toBeGreaterThan(
      globalSetup.indexOf("assertRunningTestDbEnvironment();"),
    );
  });
});
