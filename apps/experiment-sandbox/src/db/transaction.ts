import type postgres from "postgres";

import type { Task04SandboxSql } from "./client";

export type Task04TransactionSql = postgres.TransactionSql<Record<string, never>>;
export type Task04TransactionIsolation =
  | "read committed"
  | "repeatable read"
  | "serializable";

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
