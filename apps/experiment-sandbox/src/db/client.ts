import postgres from "postgres";

import {
  TASK04_SANDBOX_POSTGRES_URL,
  type Task04SandboxEnv,
} from "../env/server";

export type Task04SandboxSql = ReturnType<typeof postgres>;

export function createTask04SandboxSql(env: Task04SandboxEnv): Task04SandboxSql {
  if (
    env.mode !== "synthetic" ||
    env.postgresUrl !== TASK04_SANDBOX_POSTGRES_URL ||
    !env.pharmacyId.startsWith("SYNTH-PHARMACY-")
  ) {
    throw new Error("TASK04_DATABASE_CONFIG_DENIED");
  }

  return postgres(env.postgresUrl, {
    max: 5,
    connect_timeout: 5,
    idle_timeout: 5,
    connection: {
      application_name: "agentoma-task04-synthetic",
      search_path: "task04_synthetic, public",
    },
    onnotice: () => undefined,
  });
}
