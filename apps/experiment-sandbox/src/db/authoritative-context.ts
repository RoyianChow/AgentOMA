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
import { requireLocalActive } from "../lifecycle/state";
import type { Task04TransactionSql } from "./transaction";
import { readTask04DatabaseTimeUtc } from "./transaction";

// Every authorization decision in Task 04 takes a context carrying the pharmacy
// scope and the trusted clock. A plain object would make that trivially
// forgeable — any caller could pass { pharmacyId, nowUtc } shaped values and be
// believed.
//
// Registering each context here on creation makes the type unforgeable in
// practice: only an object this module built appears in the map, so a
// look-alike fails assertTask04AuthoritativeContext no matter how correct its
// fields look. The value stored is the transaction the context was created
// for, which is what lets the stricter assertion below also reject a context
// that is real but belongs to a DIFFERENT transaction.
//
// A WeakMap rather than a Set or an id field: entries disappear with the
// context, so nothing accumulates per request and no identifier has to be
// invented, compared, or kept secret.
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

/**
 * The approval gate, evaluated against trusted time.
 *
 * Note the two independent expiry comparisons. The configured expiry can be
 * shortened by an operator, but TASK04_SANDBOX_EXPIRES_AT is compiled in from
 * the decision record, so the approval window can never be extended by changing
 * configuration — only by a code change that a reviewer sees. Whichever is
 * earlier wins.
 *
 * Every clause is required rather than merely preferred, so an environment that
 * is half-configured is inactive rather than partially trusted.
 */
export function task04ApprovalAndLifecycleAreActive(
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
    requireLocalActive(environment, new Date(nowUtc));
  } catch {
    throw new Error("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  }
  if (!task04ApprovalAndLifecycleAreActive(environment, nowUtc)) {
    throw new Error("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  }

  // The scope row is read back and cross-checked rather than assumed. The
  // database, not configuration, is the authority on which pharmacy this data
  // belongs to and what the bounds are.
  //
  // Requiring exactly one row is the single-pharmacy invariant enforced here as
  // well as in the schema: a second row would mean tenancy had become a choice,
  // so it fails closed instead of picking one. Every configured bound must also
  // agree with the stored bound, because a command validating against limits
  // the stored data was never written under is a silent boundary change.
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

/**
 * The stricter assertion: this context must be genuine AND belong to this
 * transaction.
 *
 * Use it for anything that WRITES. A context proves the approval gate passed at
 * the moment it was built, inside one transaction; reusing it against a
 * different transaction would carry that proof somewhere it was never
 * established, letting work commit under a scope and clock that were checked
 * elsewhere.
 */
export function assertTask04AuthoritativeTransactionContext(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
): void {
  assertTask04AuthoritativeContext(context);
  if (recognizedContexts.get(context) !== transaction) {
    throw new Error("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  }
}
