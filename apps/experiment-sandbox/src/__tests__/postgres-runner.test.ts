import { describe, expect, it, vi } from "vitest";

import {
  parseTask04SandboxEnv,
  task04SyntheticEnvironmentInput,
  type Task04RunnerEnvironment,
} from "../env/server";
import {
  runTask04PostgresTests,
  type Task04CommandSpawner,
} from "../../tools/run-postgres-tests";

function runnerEnvironment(): Task04RunnerEnvironment {
  return {
    task04: parseTask04SandboxEnv(
      task04SyntheticEnvironmentInput(),
      new Date("2026-08-04T00:00:00.000Z"),
    ),
    child: {
      NODE_ENV: "test",
      PATH: "synthetic-path",
      TASK04_SANDBOX_PHARMACY_ID: "SYNTH-PHARMACY-TASK04-LOCAL",
    },
    npmExecPath: process.execPath,
  };
}

function spawnerWithStatuses(...statuses: number[]) {
  const spawn = vi.fn<Task04CommandSpawner>();
  for (const status of statuses) {
    spawn.mockReturnValueOnce({ status });
  }
  return spawn;
}

describe("Task 04 PostgreSQL runner", () => {
  it("denies a prohibited parent environment before invoking Docker", async () => {
    const spawn = spawnerWithStatuses();
    const exitCode = await runTask04PostgresTests({
      spawn,
      loadEnvironment: () => {
        throw new Error("SANDBOX_CONFIG_DENIED:PROHIBITED_VARIABLE:DATABASE_URL");
      },
      reportError: vi.fn(),
    });

    expect(exitCode).toBe(1);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("uses a fixed Compose project, fresh recreation, and allowlisted child environment", async () => {
    const spawn = spawnerWithStatuses(0, 0, 0, 0);
    const env = runnerEnvironment();
    const verifyDatabase = vi.fn().mockResolvedValue(undefined);

    const exitCode = await runTask04PostgresTests({
      spawn,
      loadEnvironment: () => env,
      verifyDatabase,
      reportError: vi.fn(),
    });

    expect(exitCode).toBe(0);
    expect(verifyDatabase).toHaveBeenCalledWith(env.task04);
    expect(spawn).toHaveBeenCalledTimes(4);

    const firstArgs = spawn.mock.calls[0]?.[1] ?? [];
    const startArgs = spawn.mock.calls[1]?.[1] ?? [];
    const vitestCall = spawn.mock.calls[2];
    const cleanupArgs = spawn.mock.calls[3]?.[1] ?? [];
    expect(firstArgs).toEqual(
      expect.arrayContaining([
        "--context",
        "default",
        "--project-name",
        "agentoma-task04-synthetic-tests",
        "down",
        "-v",
        "--remove-orphans",
      ]),
    );
    expect(startArgs).toEqual(
      expect.arrayContaining(["up", "--force-recreate"]),
    );
    expect(vitestCall?.[0]).toBe(process.execPath);
    expect(vitestCall?.[1]).toEqual([
      env.npmExecPath,
      "exec",
      "--",
      "vitest",
      "run",
      "--config",
      "vitest.postgres.config.ts",
      "--configLoader",
      "native",
      "--pool",
      "threads",
      "--maxWorkers",
      "1",
    ]);
    expect(
      vitestCall?.[1].some((argument) =>
        argument.includes('"npm exec -- vitest'),
      ),
    ).toBe(false);
    expect(vitestCall?.[2].shell).toBe(false);
    expect(cleanupArgs).toEqual(firstArgs);

    for (const call of spawn.mock.calls) {
      expect(call[2].env).toBe(env.child);
      expect(call[2].shell).toBe(false);
      expect(call[2].env).not.toHaveProperty("DATABASE_URL");
      expect(call[2].env).not.toHaveProperty("DOCKER_HOST");
    }
  });

  it("fails closed before Docker when npm_execpath is missing", async () => {
    const spawn = spawnerWithStatuses();
    const reportError = vi.fn();
    const env = runnerEnvironment();
    env.npmExecPath = "";

    const exitCode = await runTask04PostgresTests({
      spawn,
      loadEnvironment: () => env,
      reportError,
    });

    expect(exitCode).toBe(1);
    expect(spawn).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith(
      "TASK04_INFRASTRUCTURE_COMMAND_UNAVAILABLE:npm_execpath",
    );
  });

  it("cleans up after partial startup failure and preserves that exit code", async () => {
    const spawn = spawnerWithStatuses(0, 7, 0);
    const verifyDatabase = vi.fn().mockResolvedValue(undefined);

    const exitCode = await runTask04PostgresTests({
      spawn,
      loadEnvironment: runnerEnvironment,
      verifyDatabase,
      reportError: vi.fn(),
    });

    expect(exitCode).toBe(7);
    expect(verifyDatabase).not.toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(spawn.mock.calls[2]?.[1]).toContain("down");
  });

  it("preserves a meaningful test failure when cleanup also fails", async () => {
    const spawn = spawnerWithStatuses(0, 0, 5, 9);

    const exitCode = await runTask04PostgresTests({
      spawn,
      loadEnvironment: runnerEnvironment,
      verifyDatabase: vi.fn().mockResolvedValue(undefined),
      reportError: vi.fn(),
    });

    expect(exitCode).toBe(5);
    expect(spawn).toHaveBeenCalledTimes(4);
  });

  it("returns cleanup failure when all infrastructure tests passed", async () => {
    const spawn = spawnerWithStatuses(0, 0, 0, 9);

    const exitCode = await runTask04PostgresTests({
      spawn,
      loadEnvironment: runnerEnvironment,
      verifyDatabase: vi.fn().mockResolvedValue(undefined),
      reportError: vi.fn(),
    });

    expect(exitCode).toBe(9);
  });
});
