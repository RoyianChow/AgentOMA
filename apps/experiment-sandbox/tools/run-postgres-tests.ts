import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createTask04SandboxSql } from "../src/db/client";
import {
  loadTask04RunnerEnvironment,
  type Task04RunnerEnvironment,
  type Task04SandboxEnv,
} from "../src/env/server";

const sandboxRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const composeProject = "agentoma-task04-synthetic-tests";
const composePrefix = [
  "--context",
  "default",
  "compose",
  "--project-name",
  composeProject,
  "-f",
  "docker-compose.yml",
] as const;
const composeDownArguments = [
  ...composePrefix,
  "down",
  "-v",
  "--remove-orphans",
] as const;
const composeUpArguments = [
  ...composePrefix,
  "up",
  "-d",
  "--wait",
  "--force-recreate",
  "task04-sandbox-db",
] as const;
const vitestArguments = [
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
] as const;
const npmExecPathError =
  "TASK04_INFRASTRUCTURE_COMMAND_UNAVAILABLE:npm_execpath";

type SpawnResult = {
  status: number | null;
  error?: Error;
};

export type Task04CommandSpawner = (
  command: string,
  args: readonly string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    shell: false;
    stdio: "inherit";
  },
) => SpawnResult;

export type Task04PostgresRunnerDependencies = {
  spawn?: Task04CommandSpawner;
  loadEnvironment?: () => Task04RunnerEnvironment;
  verifyDatabase?: (env: Task04SandboxEnv) => Promise<void>;
  reportError?: (message: string) => void;
};

function run(
  command: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  spawn: Task04CommandSpawner,
  reportError: (message: string) => void,
): number {
  const result = spawn(command, args, {
    cwd: sandboxRoot,
    env,
    shell: false,
    stdio: "inherit",
  });
  if (result.error) {
    reportError(`TASK04_INFRASTRUCTURE_COMMAND_UNAVAILABLE:${command}`);
    return 1;
  }
  return result.status ?? 1;
}

function runVitest(
  runnerEnvironment: Task04RunnerEnvironment,
  spawn: Task04CommandSpawner,
  reportError: (message: string) => void,
): number {
  return run(
    process.execPath,
    [runnerEnvironment.npmExecPath, ...vitestArguments],
    runnerEnvironment.child,
    spawn,
    reportError,
  );
}

function isAbsoluteLocalPath(candidate: string): boolean {
  return (
    isAbsolute(candidate) &&
    !candidate.includes("\0") &&
    !candidate.startsWith("\\\\") &&
    !candidate.startsWith("//")
  );
}

export async function verifyLocalSyntheticDatabase(
  env: Task04SandboxEnv,
): Promise<void> {
  const sql = createTask04SandboxSql(env);
  try {
    const [identity] = await sql<{
      database_name: string;
      user_name: string;
    }[]>`
      SELECT current_database() AS database_name, current_user AS user_name
    `;
    if (
      identity?.database_name !== "task04_synthetic_db" ||
      identity.user_name !== "task04_synthetic_runtime"
    ) {
      throw new Error("TASK04_DATABASE_IDENTITY_DENIED");
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function runTask04PostgresTests(
  dependencies: Task04PostgresRunnerDependencies = {},
): Promise<number> {
  const spawn =
    dependencies.spawn ??
    (spawnSync as unknown as Task04CommandSpawner);
  const loadEnvironment =
    dependencies.loadEnvironment ?? loadTask04RunnerEnvironment;
  const verifyDatabase =
    dependencies.verifyDatabase ?? verifyLocalSyntheticDatabase;
  const reportError = dependencies.reportError ?? console.error;

  let runnerEnvironment: Task04RunnerEnvironment;
  try {
    runnerEnvironment = loadEnvironment();
  } catch (error) {
    reportError(
      error instanceof Error && error.message === npmExecPathError
        ? npmExecPathError
        : "TASK04_PARENT_ENVIRONMENT_DENIED",
    );
    return 1;
  }
  if (!isAbsoluteLocalPath(runnerEnvironment.npmExecPath)) {
    reportError(npmExecPathError);
    return 1;
  }

  let composeAttempted = false;
  let exitCode = 1;

  try {
    composeAttempted = true;
    const precleanExitCode = run(
      "docker",
      composeDownArguments,
      runnerEnvironment.child,
      spawn,
      reportError,
    );
    if (precleanExitCode !== 0) {
      exitCode = precleanExitCode;
    } else {
      const startExitCode = run(
        "docker",
        composeUpArguments,
        runnerEnvironment.child,
        spawn,
        reportError,
      );
      if (startExitCode !== 0) {
        exitCode = startExitCode;
      } else {
        await verifyDatabase(runnerEnvironment.task04);
        exitCode = runVitest(
          runnerEnvironment,
          spawn,
          reportError,
        );
      }
    }
  } catch {
    reportError("TASK04_DATABASE_PREFLIGHT_DENIED");
    exitCode = 1;
  } finally {
    if (composeAttempted) {
      const cleanupExitCode = run(
        "docker",
        composeDownArguments,
        runnerEnvironment.child,
        spawn,
        reportError,
      );
      if (exitCode === 0 && cleanupExitCode !== 0) {
        exitCode = cleanupExitCode;
      }
    }
  }

  return exitCode;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = await runTask04PostgresTests();
}
