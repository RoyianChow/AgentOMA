import {
  parseTask04AuditInput,
  task04AuditActionCode,
} from "../booking/audit-contracts";
import {
  assertTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "./authoritative-context";
import type { Task04TransactionSql } from "./transaction";

export async function insertTask04SyntheticAudit(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  input: unknown,
): Promise<string> {
  assertTask04AuthoritativeTransactionContext(transaction, context);
  const audit = parseTask04AuditInput(input);

  // subjectReference and subjectType are required authorization context. The
  // committed minimized audit table intentionally does not persist them.
  await transaction`
    INSERT INTO task04_synthetic.synthetic_audit_record (
      id,
      pharmacy_id,
      aggregate_type,
      aggregate_id,
      aggregate_version,
      prior_state,
      resulting_state,
      actor_type,
      transitioned_at_utc,
      safe_action_code,
      safe_reason_code,
      idempotency_record_id,
      outbox_record_id,
      synthetic_marker
    )
    VALUES (
      ${audit.auditId},
      ${context.pharmacyId},
      ${audit.aggregateType},
      ${audit.aggregateId},
      ${audit.aggregateVersion},
      ${audit.priorState},
      ${audit.resultingState},
      ${audit.actorType},
      ${context.nowUtc},
      ${task04AuditActionCode(audit.operation)},
      ${audit.safeReasonCode},
      ${audit.idempotencyRecordId},
      ${audit.outboxRecordId},
      'SYNTHETIC_TASK_04_RECORD'
    )
  `;
  return audit.auditId;
}
