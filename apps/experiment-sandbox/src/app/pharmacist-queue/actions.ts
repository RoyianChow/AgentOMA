"use server";

import { executeTask04QueueUiRequest } from "./queue-server";
import type { Task04QueueUiResult } from "./queue-ui-model";

export async function runTask04PharmacistQueueUiAction(
  input: unknown,
): Promise<Task04QueueUiResult> {
  return executeTask04QueueUiRequest(input);
}
