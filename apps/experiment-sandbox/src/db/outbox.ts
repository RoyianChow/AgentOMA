import type postgres from "postgres";

import { parseTask04OutboxEventInput } from "../booking/outbox-contracts";
import {
  assertTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "./authoritative-context";
import type { Task04TransactionSql } from "./transaction";

export async function insertTask04OutboxEvent(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  input: unknown,
): Promise<string> {
  assertTask04AuthoritativeTransactionContext(transaction, context);
  const event = parseTask04OutboxEventInput(
    input,
    context.maxPageSize,
  );
  if (
    event.usefulnessExpiresAtUtc !== undefined &&
    Date.parse(event.usefulnessExpiresAtUtc) <=
      Date.parse(context.nowUtc)
  ) {
    throw new Error("TASK04_EVENT_CONTRACT_DENIED");
  }

  await transaction`
    INSERT INTO task04_synthetic.transactional_outbox_record (
      id,
      pharmacy_id,
      event_type,
      event_schema_version,
      aggregate_type,
      aggregate_id,
      aggregate_version,
      occurred_at_utc,
      protected_environment,
      actor_type,
      safe_reason_code,
      synthetic_marker,
      source_capability,
      dispatch_status,
      usefulness_expires_at_utc,
      aggregate_version_superseded,
      cleanup_eligible_at_utc,
      payload
    )
    VALUES (
      ${event.eventId},
      ${context.pharmacyId},
      ${event.eventType},
      ${event.eventSchemaVersion},
      ${event.aggregateType},
      ${event.aggregateId},
      ${event.aggregateVersion},
      ${context.nowUtc},
      'synthetic',
      ${event.actorType},
      ${event.safeReasonCode},
      'SYNTHETIC_TASK_04_EVENT',
      'TASK04_BOOKING_WAITLIST_SYNTHETIC',
      'not_dispatched',
      ${event.usefulnessExpiresAtUtc ?? null},
      false,
      null,
      ${transaction.json(event.payload as postgres.JSONValue)}
    )
  `;
  return event.eventId;
}
