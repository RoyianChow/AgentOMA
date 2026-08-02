import {
  sandboxPharmacyIdSchema,
  task04IanaTimezoneIsValid,
  utcInstantSchema,
} from "../booking/contracts";
import type { Task04CommandConfiguration } from "../booking/config";
import {
  SANDBOX_G1_DECISION_ID,
  TASK04_APPROVAL_DECISION_VERSION,
  TASK04_SANDBOX_EXPIRES_AT,
  type SandboxPharmacyId,
  type Task04SandboxEnv,
} from "../env/server";
import type { Task04TransactionSql } from "./transaction";
import { readTask04DatabaseTimeUtc } from "./transaction";

const recognizedContexts = new WeakMap<
  object,
  Task04TransactionSql
>();

export type Task04AuthoritativeTransactionContext = Readonly<{
  pharmacyId: SandboxPharmacyId;
  nowUtc: string;
  approvalDecisionVersion: typeof TASK04_APPROVAL_DECISION_VERSION;
  maxAccessibilitySelections: number;
  maxPageSize: number;
  supportedDisplayTimezones: readonly string[];
}>;

type SandboxScopeRow = {
  pharmacy_id: string;
  environment: string;
  max_accessibility_selections: number;
  max_page_size: number;
};

function approvalIsActive(
  environment: Task04SandboxEnv,
  nowUtc: string,
): boolean {
  const parsedNow = utcInstantSchema.safeParse(nowUtc);
  if (!parsedNow.success) return false;
  const now = Date.parse(parsedNow.data);
  return (
    environment.mode === "synthetic" &&
    environment.disabled === false &&
    environment.g1DecisionId === SANDBOX_G1_DECISION_ID &&
    environment.approvalDecisionVersion ===
      TASK04_APPROVAL_DECISION_VERSION &&
    sandboxPharmacyIdSchema.safeParse(environment.pharmacyId).success &&
    now < environment.expiresAt.getTime() &&
    now < Date.parse(TASK04_SANDBOX_EXPIRES_AT)
  );
}

function validateSupportedDisplayTimezones(
  values: readonly string[],
): readonly string[] {
  if (
    values.length === 0 ||
    values.length > 16 ||
    new Set(values).size !== values.length ||
    values.some(
      (value) =>
        value.length === 0 ||
        value.length > 64 ||
        !task04IanaTimezoneIsValid(value),
    )
  ) {
    throw new Error("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  }
  return Object.freeze([...values]);
}

export async function createTask04AuthoritativeTransactionContext(
  transaction: Task04TransactionSql,
  environment: Task04SandboxEnv,
  commandConfiguration: Task04CommandConfiguration,
): Promise<Task04AuthoritativeTransactionContext> {
  let nowUtc: string;
  try {
    nowUtc = await readTask04DatabaseTimeUtc(transaction);
  } catch {
    throw new Error("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  }
  if (!approvalIsActive(environment, nowUtc)) {
    throw new Error("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  }

  const rows = await transaction<SandboxScopeRow[]>`
    SELECT
      pharmacy_id,
      environment,
      max_accessibility_selections,
      max_page_size
    FROM task04_synthetic.sandbox_scope
    ORDER BY pharmacy_id
  `;
  if (
    rows.length !== 1 ||
    rows[0]?.pharmacy_id !== environment.pharmacyId ||
    rows[0].environment !== "synthetic" ||
    rows[0].max_accessibility_selections !==
      environment.maxAccessibilitySelections ||
    rows[0].max_page_size !== environment.maxPageSize ||
    rows[0].max_page_size !== commandConfiguration.maxPageSize
  ) {
    throw new Error("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  }

  const context = Object.freeze({
    pharmacyId: environment.pharmacyId,
    nowUtc,
    approvalDecisionVersion: TASK04_APPROVAL_DECISION_VERSION,
    maxAccessibilitySelections:
      rows[0].max_accessibility_selections,
    maxPageSize: rows[0].max_page_size,
    supportedDisplayTimezones:
      validateSupportedDisplayTimezones(
        commandConfiguration.supportedDisplayTimezones,
      ),
  });
  recognizedContexts.set(context, transaction);
  return context;
}

export function assertTask04AuthoritativeContext(
  context: Task04AuthoritativeTransactionContext,
): void {
  if (
    typeof context !== "object" ||
    context === null ||
    !recognizedContexts.has(context)
  ) {
    throw new Error("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  }
}

export function assertTask04AuthoritativeTransactionContext(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
): void {
  assertTask04AuthoritativeContext(context);
  if (recognizedContexts.get(context) !== transaction) {
    throw new Error("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  }
}
