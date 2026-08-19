import type postgres from "postgres";

import type { Task04SandboxSql } from "./client";

export type Task04TransactionSql = postgres.TransactionSql<Record<string, never>>;
export type Task04TransactionIsolation =
  | "read committed"
  | "repeatable read"
  | "serializable";

// Isolation is looked up from a frozen table rather than interpolated, so the
// level can only ever be one of three known strings. Nothing caller-supplied
// reaches the BEGIN statement.
const ISOLATION_OPTIONS: Readonly<
  Record<Task04TransactionIsolation, string>
> = Object.freeze({
  "read committed": "isolation level read committed",
  "repeatable read": "isolation level repeatable read",
  serializable: "isolation level serializable",
});

export type Task04DatabaseFailureClassification =
  | "retryable_serialization"
  | "retryable_deadlock"
  | "not_retryable";

export type Task04AuthoritativeRawRequestSize =
  | Uint8Array
  | number;

/**
 * Bounds a command by its RAW byte length, before anything is decoded or
 * parsed. Checking after JSON.parse would mean the parse work — and its memory
 * — has already happened, so an oversized body would be rejected only once it
 * had cost what the limit exists to prevent.
 *
 * A malformed limit throws a distinct error from an oversized request: bad
 * configuration is an operator problem and must not be reported to a caller as
 * if they had sent something invalid.
 */
export function assertTask04AuthoritativeRawRequestWithinLimit(
  authoritativeRawRequest: Task04AuthoritativeRawRequestSize,
  maxRequestBytes: number,
): void {
  if (
    !Number.isSafeInteger(maxRequestBytes) ||
    maxRequestBytes <= 0
  ) {
    throw new Error("TASK04_REQUEST_CONFIG_DENIED");
  }

  const rawByteLength =
    authoritativeRawRequest instanceof Uint8Array
      ? authoritativeRawRequest.byteLength
      : authoritativeRawRequest;
  if (
    !Number.isSafeInteger(rawByteLength) ||
    rawByteLength < 0 ||
    rawByteLength > maxRequestBytes
  ) {
    throw new Error("TASK04_INVALID_REQUEST");
  }
}

/**
 * Splits database failures into "the transaction lost a race and never
 * committed" versus everything else.
 *
 * 40001 (serialization failure) and 40P01 (deadlock detected) both mean the
 * whole transaction rolled back, so no booking, hold, audit or outbox row
 * survived — retrying cannot double-apply anything. Every other code is
 * treated as not retryable, because a failure whose commit state is unknown
 * must never be retried: that is how one request becomes two bookings.
 *
 * Defaulting to not_retryable also means an unrecognised code fails safe.
 */
export function classifyTask04DatabaseFailure(
  failure: unknown,
): Task04DatabaseFailureClassification {
  if (typeof failure !== "object" || failure === null) {
    return "not_retryable";
  }
  const code = Reflect.get(failure, "code");
  if (code === "40001") return "retryable_serialization";
  if (code === "40P01") return "retryable_deadlock";
  return "not_retryable";
}

/**
 * The single source of "now" for command logic. Every expiry, hold deadline and
 * lifecycle comparison is measured against this, never against the caller's
 * clock — a client-supplied time would let a caller decide its own booking had
 * not expired yet.
 *
 * transaction_timestamp() (not clock_timestamp()) is deliberate: it is fixed
 * for the life of the transaction, so a command that reads the time twice
 * cannot see it move underneath itself and reach two different verdicts about
 * the same deadline.
 */
export async function readTask04DatabaseTimeUtc(
  transaction: Task04TransactionSql,
): Promise<string> {
  const [row] = await transaction<{ now_utc: Date }[]>`
    SELECT transaction_timestamp() AS now_utc
  `;
  if (!(row?.now_utc instanceof Date)) {
    throw new Error("TASK04_DATABASE_TIME_UNAVAILABLE");
  }
  return row.now_utc.toISOString();
}

export async function withTask04RuntimeTransaction<T>(
  sql: Task04SandboxSql,
  isolation: Task04TransactionIsolation,
  work: (transaction: Task04TransactionSql) => Promise<T>,
): Promise<T> {
  const option = ISOLATION_OPTIONS[isolation];
  const result = await sql.begin<T>(
    option,
    async (transaction) => work(transaction),
  );
  return result as T;
}

export async function closeTask04SandboxSql(
  sql: Task04SandboxSql,
): Promise<void> {
  await sql.end({ timeout: 5 });
}
