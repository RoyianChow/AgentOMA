import {
  task04CommandConfigurationFromEnvironment,
} from "../booking/config";
import {
  createTask04BookingSchemas,
  type Task04BookingRetrieveRequest,
  type Task04BookingRetrieveResponseData,
} from "../booking/contracts";
import {
  mapTask04SafeError,
  Task04KnownFailure,
  type Task04SafeError,
} from "../booking/safe-errors";
import type { Task04SandboxEnv } from "../env/server";
import {
  TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY,
} from "./booking-create";
import {
  createTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "./authoritative-context";
import type { Task04SandboxSql } from "./client";
import { authorizeReusableBookingCapability } from "./management-capability";
import {
  withTask04RuntimeTransaction,
  type Task04TransactionSql,
} from "./transaction";

type RetrievedBookingRow = {
  booking_reference: string;
  state:
    | "pending_confirmation"
    | "confirmed"
    | "cancelled"
    | "rescheduled"
    | "expired";
  service_category_label: string;
  modality: "in_person" | "telephone" | "video";
  starts_at_utc: Date;
  ends_at_utc: Date;
  display_timezone: string;
};

type Task04BookingRetrieveSuccess = Readonly<{
  success: true;
  data: Task04BookingRetrieveResponseData;
}>;

export type Task04BookingRetrieveCommandResult =
  | Task04BookingRetrieveSuccess
  | Task04SafeError;

function schemasForContext(
  context: Task04AuthoritativeTransactionContext,
) {
  return createTask04BookingSchemas({
    maxAccessibilitySelections:
      context.maxAccessibilitySelections,
    supportedDisplayTimezones:
      context.supportedDisplayTimezones,
  });
}

function parseBookingRetrieveRequest(
  input: unknown,
  environment: Task04SandboxEnv,
): Task04BookingRetrieveRequest {
  try {
    const schemas = createTask04BookingSchemas({
      maxAccessibilitySelections:
        environment.maxAccessibilitySelections,
      supportedDisplayTimezones:
        environment.supportedDisplayTimezones,
    });
    return schemas.bookingRetrieveRequestSchema.parse(input);
  } catch {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
}

async function executeBookingRetrieveTransaction(
  transaction: Task04TransactionSql,
  environment: Task04SandboxEnv,
  request: Task04BookingRetrieveRequest,
): Promise<Task04BookingRetrieveSuccess> {
  const configuration =
    task04CommandConfigurationFromEnvironment(environment);
  const context =
    await createTask04AuthoritativeTransactionContext(
      transaction,
      environment,
      configuration,
    );

  if (
    request.managementAuthorization.channel !==
    "server_session_bound"
  ) {
    throw new Task04KnownFailure("NOT_AUTHORIZED");
  }

  const authorization =
    await authorizeReusableBookingCapability(
      transaction,
      context,
      {
        capabilityReference:
          request.managementAuthorization.capabilityReference,
        bookingReference: request.bookingReference,
        requiredAction: "booking:view",
        actorType:
          TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorType,
        actorReference:
          TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorReference,
        subjectReference:
          TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.subjectReference,
        subjectType:
          TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.subjectType,
        serverSessionBinding:
          TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY
            .serverSessionBinding,
      },
      "read_only",
    );
  if (!authorization.authorized) {
    throw new Task04KnownFailure(authorization.reasonCode);
  }

  const rows = await transaction<RetrievedBookingRow[]>`
    SELECT
      booking.id AS booking_reference,
      booking.state,
      service.public_label AS service_category_label,
      booking.modality,
      slot.starts_at_utc,
      slot.ends_at_utc,
      slot.display_timezone
    FROM task04_synthetic.booking AS booking
    JOIN task04_synthetic.service_category AS service
      ON service.id = booking.service_category_id
     AND service.pharmacy_id = booking.pharmacy_id
    JOIN task04_synthetic.booking_slot AS slot
      ON slot.id = booking.slot_id
     AND slot.pharmacy_id = booking.pharmacy_id
    WHERE booking.id = ${request.bookingReference}
      AND booking.pharmacy_id = ${context.pharmacyId}
  `;
  const row = rows[0];
  if (rows.length !== 1 || !row) {
    throw new Task04KnownFailure("NOT_AUTHORIZED");
  }

  const data = schemasForContext(
    context,
  ).bookingRetrieveResponseDataSchema.parse({
    bookingReference: row.booking_reference,
    status: row.state,
    serviceCategoryLabel: row.service_category_label,
    modality: row.modality,
    startTimeUtc: row.starts_at_utc.toISOString(),
    endTimeUtc: row.ends_at_utc.toISOString(),
    displayTimezone: row.display_timezone,
    allowedActions: ["none"],
    syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
  });
  return schemasForContext(
    context,
  ).bookingRetrieveResponseSchema.parse({
    success: true,
    data,
  });
}

function normalizeBookingRetrieveFailure(
  failure: unknown,
): unknown {
  if (failure instanceof Task04KnownFailure) return failure;
  if (
    failure instanceof Error &&
    failure.message === "TASK04_AUTHORITATIVE_CONTEXT_DENIED"
  ) {
    return new Task04KnownFailure("FEATURE_DISABLED");
  }
  return failure;
}

export async function executeTask04BookingRetrieve(
  sql: Task04SandboxSql,
  environment: Task04SandboxEnv,
  input: unknown,
): Promise<Task04BookingRetrieveCommandResult> {
  try {
    const request = parseBookingRetrieveRequest(
      input,
      environment,
    );
    return await withTask04RuntimeTransaction(
      sql,
      "read committed",
      (transaction) =>
        executeBookingRetrieveTransaction(
          transaction,
          environment,
          request,
        ),
    );
  } catch (failure) {
    return mapTask04SafeError(
      "booking:view",
      normalizeBookingRetrieveFailure(failure),
    );
  }
}
