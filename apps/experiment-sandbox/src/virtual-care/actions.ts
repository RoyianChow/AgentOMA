"use server";

import {
  evaluateVirtualCareScene,
  listVirtualCareQueueRows,
  listVirtualCareScenarios,
  type VirtualCareQueueRow,
  type VirtualCareSceneResult,
} from "./visit-server";

/**
 * Task 06 — synthetic virtual-care server actions.
 *
 * Thin "use server" boundary mirroring
 * src/app/pharmacist-queue/actions.ts: all authorization and
 * state-transition logic lives in visit-server.ts / guards.ts, never
 * here and never on the client. UI hiding alone is never the boundary —
 * this file is.
 */

export async function runVirtualCareSceneAction(
  scenarioInput: unknown,
  requestInput: unknown,
): Promise<VirtualCareSceneResult> {
  return evaluateVirtualCareScene(scenarioInput, requestInput);
}

export async function listVirtualCareScenariosAction(): Promise<readonly string[]> {
  return listVirtualCareScenarios();
}

export async function listVirtualCareQueueRowsAction(): Promise<readonly VirtualCareQueueRow[]> {
  return listVirtualCareQueueRows();
}
