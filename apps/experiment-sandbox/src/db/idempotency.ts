import type postgres from "postgres";
import type { z } from "zod";

import {
  createTask04BookingSchemas,
  opaqueReferenceSchema,
  type Task04BookingConfirmResponseData,
  type Task04BookingCreateResponseData,
  type Task04BookingExpireResponseData,
} from "../booking/contracts";
import {
  createTask04ReceiptReference,
  createTask04SupportedCommandFingerprint,
  digestTask04IdempotencyKey,
  digestTask04ResourceScope,
  type Task04SupportedIdempotencyInput,
  type Task04SupportedIdempotentOperation,
} from "../booking/idempotency";
import { Task04KnownFailure } from "../booking/safe-errors";
import {
  assertTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "./authoritative-context";
import type { Task04TransactionSql } from "./transaction";

type IdempotencyRow = {
  id: string;
  canonical_request_digest: string;
  state:
    | "in_progress"
    | "completed"
    | "failed_retryable"
    | "failed_terminal";
  safe_response_snapshot: postgres.JSONValue;
};

export type BeginTask04IdempotencyInput =
  Task04SupportedIdempotencyInput;

export type Task04ValidatedReplayResponse =
  | Task04BookingCreateResponseData
  | Task04BookingConfirmResponseData
  | Task04BookingExpireResponseData;

export type BeginTask04IdempotencyResult =
  | { disposition: "execute"; receiptId: string }
  | {
      disposition: "replay";
      receiptId: string;
      safeResult: Task04ValidatedReplayResponse;
    };

function responseSchemaForOperation(
  context: Task04AuthoritativeTransactionContext,
  operation: Task04SupportedIdempotentOperation,
) {
  const schemas = createTask04BookingSchemas({
    maxAccessibilitySelections:
      context.maxAccessibilitySelections,
    supportedDisplayTimezones:
      context.supportedDisplayTimezones,
  });
  switch (operation) {
    case "booking:create":
      return schemas.bookingCreateResponseDataSchema;
    case "booking:confirm":
      return schemas.bookingConfirmResponseDataSchema;
    case "booking:expire":
      return schemas.bookingExpireResponseDataSchema;
  }
}

/**
 * Re-validates a stored snapshot on the way OUT, not just on the way in.
 *
 * A snapshot was written by an earlier deployment and is replayed by this one.
 * Trusting it because it was once valid would let a response that no longer
 * satisfies the current contract reach a caller. A snapshot that fails to parse
 * is reported as a generic unavailability rather than repaired or partially
 * returned — a half-understood past result is not a safe answer.
 */
function validateReplayResponse(
  context: Task04AuthoritativeTransactionContext,
  operation: Task04SupportedIdempotentOperation,
  value: unknown,
): Task04ValidatedReplayResponse {
  const schema = responseSchemaForOperation(context, operation);
  const parsed = (
    schema as z.ZodType<Task04ValidatedReplayResponse>
  ).safeParse(value);
  if (!parsed.success) {
    throw new Task04KnownFailure("TEMPORARILY_UNAVAILABLE");
  }
  return parsed.data;
}

/**
 * Claims the right to run a command exactly once, or reports what the previous
 * attempt did.
 *
 * The claim is an INSERT ... ON CONFLICT DO NOTHING rather than a "look up the
 * key, then insert if absent" pair. Two concurrent duplicates that both looked
 * first would both find nothing and both proceed; here the unique index decides
 * a single winner inside the database. A returned row means this caller owns
 * the command, and only then does any booking or capacity work happen.
 *
 * The loser re-reads the row FOR UPDATE so it queues behind the winner instead
 * of racing it to a verdict, then splits three ways:
 *
 *   - a different request digest under the same key is a CONFLICT. The key
 *     identifies one specific command; honouring a second, different body under
 *     it would hand back a result that belongs to another request.
 *   - anything not yet completed is reported as still in progress. An
 *     in-flight or failed attempt has no result to replay, and inventing one
 *     would report work as done that may never have committed.
 *   - only a completed row replays its stored response.
 */
export async function beginTask04IdempotentCommand(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  input: BeginTask04IdempotencyInput,
): Promise<BeginTask04IdempotencyResult> {
  assertTask04AuthoritativeTransactionContext(transaction, context);
  const actorReference = opaqueReferenceSchema.parse(
    input.actorReference,
  );
  const operation = input.operation;
  const idempotencyKey = input.request.idempotencyKey;
  const receiptId = createTask04ReceiptReference();
  const resourceScopeDigest = digestTask04ResourceScope(
    input.resourceScopeReference,
  );
  const keyDigest = digestTask04IdempotencyKey(idempotencyKey);
  const requestDigest =
    createTask04SupportedCommandFingerprint(input);

  const inserted = await transaction<{ id: string }[]>`
    INSERT INTO task04_synthetic.idempotency_record (
      id,
      pharmacy_id,
      actor_reference,
      operation,
      resource_scope_digest,
      idempotency_key_digest,
      canonical_request_digest,
      state
    )
    VALUES (
      ${receiptId},
      ${context.pharmacyId},
      ${actorReference},
      ${operation},
      ${resourceScopeDigest},
      ${keyDigest},
      ${requestDigest},
      'in_progress'
    )
    ON CONFLICT (
      pharmacy_id,
      actor_reference,
      operation,
      resource_scope_digest,
      idempotency_key_digest
    )
    DO NOTHING
    RETURNING id
  `;
  if (inserted[0]) return { disposition: "execute", receiptId };

  const rows = await transaction<IdempotencyRow[]>`
    SELECT
      id,
      canonical_request_digest,
      state,
      safe_response_snapshot
    FROM task04_synthetic.idempotency_record
    WHERE pharmacy_id = ${context.pharmacyId}
      AND actor_reference = ${actorReference}
      AND operation = ${operation}
      AND resource_scope_digest = ${resourceScopeDigest}
      AND idempotency_key_digest = ${keyDigest}
    FOR UPDATE
  `;
  const existing = rows[0];
  if (!existing) {
    throw new Task04KnownFailure("TEMPORARILY_UNAVAILABLE");
  }
  if (existing.canonical_request_digest !== requestDigest) {
    throw new Task04KnownFailure("IDEMPOTENCY_KEY_CONFLICT");
  }
  if (existing.state !== "completed") {
    throw new Task04KnownFailure("REQUEST_IN_PROGRESS");
  }

  return {
    disposition: "replay",
    receiptId: existing.id,
    safeResult: validateReplayResponse(
      context,
      operation,
      existing.safe_response_snapshot,
    ),
  };
}

/**
 * Records the result that future replays will return.
 *
 * The UPDATE requires state = 'in_progress', so completion can only ever move a
 * record forward once. A second completion — a retry, or two paths both
 * believing they own the command — matches no row and raises rather than
 * silently overwriting the stored result with a different one.
 *
 * This runs inside the caller's transaction, so the snapshot and the booking,
 * capacity, audit and outbox rows it describes commit together or not at all.
 * A snapshot that survived a rolled-back command would promise a booking that
 * does not exist.
 */
export async function completeTask04IdempotentCommand(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  receiptId: string,
  operation: Task04SupportedIdempotentOperation,
  safeResult: unknown,
): Promise<void> {
  assertTask04AuthoritativeTransactionContext(transaction, context);
  const parsedReceiptId = opaqueReferenceSchema.parse(receiptId);
  const parsedSafeResult = validateReplayResponse(
    context,
    operation,
    safeResult,
  );

  const updated = await transaction<{ id: string }[]>`
    UPDATE task04_synthetic.idempotency_record
    SET state = 'completed',
        safe_response_snapshot = ${transaction.json(
          parsedSafeResult as postgres.JSONValue,
        )},
        completed_at_utc = transaction_timestamp()
    WHERE id = ${parsedReceiptId}
      AND pharmacy_id = ${context.pharmacyId}
      AND operation = ${operation}
      AND state = 'in_progress'
    RETURNING id
  `;
  if (!updated[0]) {
    throw new Error("TASK04_IDEMPOTENCY_COMPLETION_DENIED");
  }
}
