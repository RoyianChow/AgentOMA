import {
  evaluateReusableManagementCapability,
  reusableCapabilityRequestSchema,
  type Task04AuthorizationResult,
} from "../booking/authorization";
import {
  assertTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "./authoritative-context";
import type { Task04TransactionSql } from "./transaction";

type ReusableCapabilityRow = {
  usage_mode: "reusable";
  capability_reference: string;
  booking_id: string;
  permitted_actions: string[];
  actor_reference: string;
  subject_reference: string;
  server_session_binding: string | null;
  pharmacy_id: string;
  state: "active" | "expired" | "revoked";
  expires_at_utc: Date;
};

export type Task04CapabilityLockMode =
  | "read_only"
  | "mutation";

const genericDenial = (): Task04AuthorizationResult => ({
  authorized: false,
  reasonCode: "NOT_AUTHORIZED",
});

export async function authorizeReusableBookingCapability(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  requestInput: unknown,
  lockMode: Task04CapabilityLockMode,
): Promise<Task04AuthorizationResult> {
  assertTask04AuthoritativeTransactionContext(transaction, context);
  const request =
    reusableCapabilityRequestSchema.safeParse(requestInput);
  if (!request.success) return genericDenial();

  const rows =
    lockMode === "mutation"
      ? await transaction<ReusableCapabilityRow[]>`
          SELECT
            usage_mode,
            capability_reference,
            booking_id,
            permitted_actions,
            actor_reference,
            subject_reference,
            server_session_binding,
            pharmacy_id,
            state,
            expires_at_utc
          FROM task04_synthetic.management_credential
          WHERE pharmacy_id = ${context.pharmacyId}
            AND usage_mode = 'reusable'
            AND capability_reference =
              ${request.data.capabilityReference}
          ORDER BY issued_at_utc, id
          FOR UPDATE
        `
      : await transaction<ReusableCapabilityRow[]>`
          SELECT
            usage_mode,
            capability_reference,
            booking_id,
            permitted_actions,
            actor_reference,
            subject_reference,
            server_session_binding,
            pharmacy_id,
            state,
            expires_at_utc
          FROM task04_synthetic.management_credential
          WHERE pharmacy_id = ${context.pharmacyId}
            AND usage_mode = 'reusable'
            AND capability_reference =
              ${request.data.capabilityReference}
          ORDER BY issued_at_utc, id
        `;

  if (rows.length !== 1) return genericDenial();
  const row = rows[0];
  if (!row || row.server_session_binding === null) {
    return genericDenial();
  }

  return evaluateReusableManagementCapability(
    {
      usageMode: row.usage_mode,
      capabilityReference: row.capability_reference,
      bookingReference: row.booking_id,
      permittedActions: row.permitted_actions,
      actorReference: row.actor_reference,
      subjectReference: row.subject_reference,
      subjectType: "synthetic_patient",
      serverSessionBinding: row.server_session_binding,
      pharmacyId: row.pharmacy_id,
      state: row.state,
      expiresAtUtc: row.expires_at_utc.toISOString(),
    },
    request.data,
    context,
  );
}
