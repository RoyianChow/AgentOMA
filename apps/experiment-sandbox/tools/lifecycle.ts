import { loadSandboxEnv } from "../src/env/server";
import {
  disableSyntheticInstance,
  exactStateDirectory,
  lifecycleState,
  readLifecycleMarker,
  resetSyntheticInstance,
} from "../src/lifecycle/state";
import { rmSync } from "node:fs";

const operation = process.argv[2];
const env = loadSandboxEnv({ phase: "startup", allowExpired: true });
const target = exactStateDirectory(env.instanceId);

switch (operation) {
  case "inspect":
    console.log(JSON.stringify({
      instance: env.instanceId,
      state: lifecycleState(env),
      markerPresent: readLifecycleMarker(env) !== null,
    }));
    break;
  case "disable":
    disableSyntheticInstance(env);
    console.log(`SANDBOX_DISABLED:${env.instanceId}`);
    break;
  case "reset":
    resetSyntheticInstance(env);
    console.log(`SANDBOX_RESET:${env.instanceId}`);
    break;
  case "teardown":
    // exactStateDirectory has already validated the strict SYNTH-* target and
    // canonical containment before this exact directory is removed.
    rmSync(target, { recursive: true, force: true });
    console.log(`SANDBOX_TORN_DOWN:${env.instanceId}`);
    break;
  default:
    throw new Error("SANDBOX_OPERATION_DENIED:UNKNOWN_OPERATION");
}
