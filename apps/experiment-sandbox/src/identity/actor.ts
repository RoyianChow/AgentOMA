import type { SandboxEnv } from "../env/server";

export type SyntheticActor = {
  id: string;
  role: "reviewer";
  displayName: "SYNTHETIC REVIEWER";
};

export function getSyntheticActor(env: SandboxEnv): SyntheticActor {
  return {
    id: `${env.instanceId}-REVIEWER`,
    role: "reviewer",
    displayName: "SYNTHETIC REVIEWER",
  };
}

export function clientAuthorityIsIgnored(): true {
  return true;
}
