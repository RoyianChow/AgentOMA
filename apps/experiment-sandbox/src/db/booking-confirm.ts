import { randomBytes } from "node:crypto";
import { TextDecoder } from "node:util";

import {
  authorizeStaffBookingConfirmation,
} from "../booking/authorization";
import {
  parseTask04AuditInput,
  type Task04AuditInput,
} from "../booking/audit-contracts";
import {
  task04CommandConfigurationFromEnvironment,
} from "../booking/config";
import {
  createTask04BookingSchemas,
  type Task04BookingConfirmRequest,
  type Task04BookingConfirmResponseData,
} from "../booking/contracts";
import {
  parseTask04OutboxEventInput,
  type Task04OutboxEventInput,
} from "../booking/outbox-contracts";
import {
  mapTask04SafeError,
  Task04KnownFailure,
  type Task04SafeError,
} from "../booking/safe-errors";
import type { Task04SandboxEnv } from "../env/server";
import { TASK04_SYNTHETIC_REFERENCES } from "../fixtures/synthetic";
import { insertTask04SyntheticAudit } from "./audit";
import {
  createTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "./authoritative-context";
import type { Task04SandboxSql } from "./client";
import {
  beginTask04IdempotentCommand,
  completeTask04IdempotentCommand,
} from "./idempotency";
import { insertTask04OutboxEvent } from "./outbox";
import {
  assertTask04AuthoritativeRawRequestWithinLimit,
  classifyTask04DatabaseFailure,
  withTask04RuntimeTransaction,
  type Task04TransactionSql,
} from "./transaction";

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export const TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY =
  Object.freeze({
    actorType: "synthetic_staff" as const,
    actorReference: TASK04_SYNTHETIC_REFERENCES.pharmacist,
    subjectType: "synthetic_patient" as const,
    sessionReference:
      "SYNTH-STAFF-SESSION-TASK04-0001",
    sessionActive: true,
    permissions: ["booking:confirm"] as const,
  });

type LockedBooking = {
  booking_reference: string;
  service_category_id: string;
  slot_id: string;
  modality: "in_person" | "telephone" | "video";
  subject_reference: string;
  state:
    | "pending_confirmation"
    | "confirmed"
    | "cancelled"
    | "rescheduled"
    | "expired";
  confirmation_deadline_utc: Date | null;
  successor_booking_id: string | null;
  aggregate_version: number;
};

type LockedSlot = {
  slot_id: string;
  service_category_id: string;
  modality: "in_person" | "telephone" | "video";
  starts_at_utc: Date;
  ends_at_utc: Date;
  slot_state: "active" | "unavailable" | "cancelled";
  service_state: "active" | "unavailable";
  requires_staff_confirmation: boolean;
  modality_is_supported: boolean;
};

type LockedHold = {
  hold_id: string;
  slot_id: string;
  capacity_unit_id: string;
  state: "active" | "consumed" | "released" | "expired";
  expires_at_utc: Date;
  aggregate_version: number;
};

type LockedCapacityUnit = {
  capacity_unit_id: string;
  slot_id: string;
  booking_id: string | null;
  capacity_hold_id: string | null;
};

type Task04BookingConfirmSuccess = Readonly<{
  success: true;
  data: Task04BookingConfirmResponseData;
  receiptId: string;
}>;

export type Task04BookingConfirmCommandResult =
  | Task04BookingConfirmSuccess
  | Task04SafeError;

export type Task04BookingConfirmEvidence = Readonly<{
  responseData: Task04BookingConfirmResponseData;
  audit: Task04AuditInput;
  outbox: Task04OutboxEventInput;
}>;

type BookingConfirmEvidenceInput = Readonly<{
  bookingReference: string;
  subjectReference: string;
  aggregateVersion: number;
  receiptId: string;
  auditId: string;
  eventId: string;
  maxAccessibilitySelections: number;
  maxPageSize: number;
  supportedDisplayTimezones: readonly string[];
}>;

function createOpaqueReference(prefix: string): string {
  return `${prefix}-${randomBytes(18).toString("base64url")}`;
}

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

function validateBookingConfirmSuccess(
  context: Task04AuthoritativeTransactionContext,
  data: unknown,
  receiptId: string,
): Task04BookingConfirmSuccess {
  return schemasForContext(
    context,
  ).bookingConfirmResponseSchema.parse({
    success: true,
    data,
    receiptId,
  });
}

function parseAuthoritativeBookingConfirmRequest(
  authoritativeRawRequest: Uint8Array,
  environment: Task04SandboxEnv,
): Task04BookingConfirmRequest {
  const configuration =
    task04CommandConfigurationFromEnvironment(environment);
  try {
    assertTask04AuthoritativeRawRequestWithinLimit(
      authoritativeRawRequest,
      configuration.maxRequestBytes,
    );
    const input: unknown = JSON.parse(
      utf8Decoder.decode(authoritativeRawRequest),
    );
    const schemas = createTask04BookingSchemas({
      maxAccessibilitySelections:
        environment.maxAccessibilitySelections,
      supportedDisplayTimezones:
        environment.supportedDisplayTimezones,
    });
    return schemas.bookingConfirmRequestSchema.parse(input);
  } catch {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
}

export function buildTask04BookingConfirmEvidence(
  input: BookingConfirmEvidenceInput,
): Task04BookingConfirmEvidence {
  const schemas = createTask04BookingSchemas({
    maxAccessibilitySelections: input.maxAccessibilitySelections,
    supportedDisplayTimezones: input.supportedDisplayTimezones,
  });
  const responseData =
    schemas.bookingConfirmResponseDataSchema.parse({
      bookingReference: input.bookingReference,
      status: "confirmed",
      holdStatus: "consumed",
    });
  const outbox = parseTask04OutboxEventInput(
    {
      eventId: input.eventId,
      eventType: "booking.confirmed",
      eventSchemaVersion: 1,
      aggregateType: "booking",
      aggregateId: input.bookingReference,
      aggregateVersion: input.aggregateVersion,
      actorType:
        TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY.actorType,
      safeReasonCode: "STAFF_CONFIRMED",
      payload: {
        previousState: "pending_confirmation",
        resultingState: "confirmed",
        capacityOwner: "booking",
      },
    },
    input.maxPageSize,
  );
  const audit = parseTask04AuditInput({
    operation: "booking:confirm",
    auditId: input.auditId,
    aggregateType: "booking",
    aggregateId: input.bookingReference,
    aggregateVersion: input.aggregateVersion,
    actorType:
      TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY.actorType,
    subjectReference: input.subjectReference,
    subjectType:
      TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY.subjectType,
    priorState: "pending_confirmation",
    resultingState: "confirmed",
    safeReasonCode: "STAFF_CONFIRMED",
    idempotencyRecordId: input.receiptId,
    outboxRecordId: input.eventId,
  });
  return Object.freeze({ responseData, audit, outbox });
}

async function lockBooking(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  request: Task04BookingConfirmRequest,
): Promise<LockedBooking> {
  const rows = await transaction<LockedBooking[]>`
    SELECT
      id AS booking_reference,
      service_category_id,
      slot_id,
      modality,
      subject_reference,
      state,
      confirmation_deadline_utc,
      successor_booking_id,
      aggregate_version
    FROM task04_synthetic.booking
    WHERE id = ${request.bookingReference}
      AND pharmacy_id = ${context.pharmacyId}
    FOR UPDATE
  `;
  const booking = rows[0];
  if (!booking || rows.length !== 1) {
    throw new Task04KnownFailure("NOT_AUTHORIZED");
  }
  if (booking.state === "confirmed") {
    throw new Task04KnownFailure("ACTION_ALREADY_COMPLETED");
  }
  if (
    booking.state !== "pending_confirmation" ||
    booking.successor_booking_id !== null ||
    booking.aggregate_version !==
      request.expectedAggregateVersion ||
    booking.confirmation_deadline_utc === null ||
    booking.confirmation_deadline_utc.toISOString() <=
      context.nowUtc
  ) {
    throw new Task04KnownFailure("INVALID_TRANSITION");
  }
  return booking;
}

async function lockAndValidateSlot(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  booking: LockedBooking,
): Promise<LockedSlot> {
  const rows = await transaction<LockedSlot[]>`
    SELECT
      slot.id AS slot_id,
      slot.service_category_id,
      slot.modality,
      slot.starts_at_utc,
      slot.ends_at_utc,
      slot.state AS slot_state,
      service.state AS service_state,
      service.requires_staff_confirmation,
      slot.modality = ANY(service.supported_modalities)
        AS modality_is_supported
    FROM task04_synthetic.booking_slot AS slot
    JOIN task04_synthetic.service_category AS service
      ON service.id = slot.service_category_id
     AND service.pharmacy_id = slot.pharmacy_id
    WHERE slot.id = ${booking.slot_id}
      AND slot.pharmacy_id = ${context.pharmacyId}
    FOR UPDATE OF slot, service
  `;
  const slot = rows[0];
  if (
    !slot ||
    rows.length !== 1 ||
    slot.service_category_id !== booking.service_category_id ||
    slot.modality !== booking.modality ||
    slot.slot_state !== "active" ||
    slot.service_state !== "active" ||
    !slot.requires_staff_confirmation ||
    !slot.modality_is_supported ||
    slot.starts_at_utc.toISOString() <= context.nowUtc ||
    slot.ends_at_utc <= slot.starts_at_utc
  ) {
    throw new Task04KnownFailure("INVALID_TRANSITION");
  }
  return slot;
}

async function lockAndValidateHold(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  booking: LockedBooking,
  slot: LockedSlot,
): Promise<LockedHold> {
  const rows = await transaction<LockedHold[]>`
    SELECT
      id AS hold_id,
      slot_id,
      capacity_unit_id,
      state,
      expires_at_utc,
      aggregate_version
    FROM task04_synthetic.capacity_hold
    WHERE pharmacy_id = ${context.pharmacyId}
      AND pending_booking_id = ${booking.booking_reference}
      AND purpose = 'pending_booking'
      AND state = 'active'
    ORDER BY id
    FOR UPDATE
  `;
  // An already-expired hold is refused even though it is still marked active.
  //
  // The expiry worker may not have reached it yet, but the deadline is what
  // decides — not whether a background job has caught up. Confirming against a
  // lapsed hold would let staff reinstate a seat the patient had already lost,
  // and would race the worker for the same capacity unit.
  //
  // The hold's expiry must also equal the booking's deadline exactly, for the
  // same reason the expiry worker requires it: if the two records disagree,
  // neither is trustworthy enough to move capacity on.
  const hold = rows[0];
  if (
    !hold ||
    rows.length !== 1 ||
    hold.slot_id !== slot.slot_id ||
    hold.expires_at_utc.toISOString() <= context.nowUtc ||
    hold.expires_at_utc.toISOString() !==
      booking.confirmation_deadline_utc?.toISOString()
  ) {
    throw new Task04KnownFailure("INVALID_TRANSITION");
  }
  return hold;
}

async function lockAndValidateCapacityUnit(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  hold: LockedHold,
): Promise<LockedCapacityUnit> {
  const rows = await transaction<LockedCapacityUnit[]>`
    SELECT
      id AS capacity_unit_id,
      slot_id,
      booking_id,
      capacity_hold_id
    FROM task04_synthetic.capacity_unit
    WHERE id = ${hold.capacity_unit_id}
      AND pharmacy_id = ${context.pharmacyId}
      AND slot_id = ${hold.slot_id}
    FOR UPDATE
  `;
  const unit = rows[0];
  if (
    !unit ||
    rows.length !== 1 ||
    unit.booking_id !== null ||
    unit.capacity_hold_id !== hold.hold_id
  ) {
    throw new Task04KnownFailure("INVALID_TRANSITION");
  }
  return unit;
}

async function executeBookingConfirmTransaction(
  transaction: Task04TransactionSql,
  environment: Task04SandboxEnv,
  request: Task04BookingConfirmRequest,
): Promise<Task04BookingConfirmSuccess> {
  const configuration =
    task04CommandConfigurationFromEnvironment(environment);
  const context =
    await createTask04AuthoritativeTransactionContext(
      transaction,
      environment,
      configuration,
    );
  const authorization = authorizeStaffBookingConfirmation(
    context,
    TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY,
  );
  if (!authorization.authorized) {
    throw new Task04KnownFailure("NOT_AUTHORIZED");
  }

  // Deterministic mutation lock order:
  // idempotency record -> booking -> service/slot -> hold -> capacity unit.
  const idempotency = await beginTask04IdempotentCommand(
    transaction,
    context,
    {
      operation: "booking:confirm",
      actorReference:
        TASK04_SYNTHETIC_BOOKING_CONFIRM_AUTHORITY.actorReference,
      resourceScopeReference: request.bookingReference,
      request,
    },
  );
  if (idempotency.disposition === "replay") {
    return validateBookingConfirmSuccess(
      context,
      idempotency.safeResult,
      idempotency.receiptId,
    );
  }

  const booking = await lockBooking(
    transaction,
    context,
    request,
  );
  const slot = await lockAndValidateSlot(
    transaction,
    context,
    booking,
  );
  const hold = await lockAndValidateHold(
    transaction,
    context,
    booking,
    slot,
  );
  const unit = await lockAndValidateCapacityUnit(
    transaction,
    context,
    hold,
  );

  // The capacity handover is three writes in one transaction:
  //
  //   booking -> confirmed
  //   hold    -> consumed
  //   unit    -> hold detached, booking attached
  //
  // They commit together or not at all, and the unit is never released before
  // being re-attached. Doing it as a release followed by a claim would leave a
  // moment where the seat looks free, and a concurrent booking could take the
  // seat this patient is in the middle of having confirmed.
  //
  // Each write re-asserts the exact revision it validated (state plus
  // aggregate_version, and for the unit, that it is still held by THIS hold).
  // Anything else means the row moved after validation, so the confirmation is
  // refused as an invalid transition rather than forced through.
  const nextBookingVersion = booking.aggregate_version + 1;
  const updatedBookings = await transaction<{ id: string }[]>`
    UPDATE task04_synthetic.booking
    SET state = 'confirmed',
        confirmation_deadline_utc = null,
        safe_reason_code = 'STAFF_CONFIRMED',
        aggregate_version = ${nextBookingVersion},
        transitioned_at_utc = ${context.nowUtc}
    WHERE id = ${booking.booking_reference}
      AND pharmacy_id = ${context.pharmacyId}
      AND state = 'pending_confirmation'
      AND aggregate_version = ${booking.aggregate_version}
    RETURNING id
  `;
  if (updatedBookings.length !== 1) {
    throw new Task04KnownFailure("INVALID_TRANSITION");
  }

  const updatedHolds = await transaction<{ id: string }[]>`
    UPDATE task04_synthetic.capacity_hold
    SET state = 'consumed',
        consumed_at_utc = ${context.nowUtc},
        aggregate_version = ${hold.aggregate_version + 1},
        transitioned_at_utc = ${context.nowUtc}
    WHERE id = ${hold.hold_id}
      AND pharmacy_id = ${context.pharmacyId}
      AND state = 'active'
      AND aggregate_version = ${hold.aggregate_version}
    RETURNING id
  `;
  if (updatedHolds.length !== 1) {
    throw new Task04KnownFailure("INVALID_TRANSITION");
  }

  const updatedUnits = await transaction<{ id: string }[]>`
    UPDATE task04_synthetic.capacity_unit
    SET capacity_hold_id = null,
        booking_id = ${booking.booking_reference},
        aggregate_version = aggregate_version + 1,
        transitioned_at_utc = ${context.nowUtc}
    WHERE id = ${unit.capacity_unit_id}
      AND pharmacy_id = ${context.pharmacyId}
      AND slot_id = ${slot.slot_id}
      AND booking_id IS NULL
      AND capacity_hold_id = ${hold.hold_id}
    RETURNING id
  `;
  if (updatedUnits.length !== 1) {
    throw new Task04KnownFailure("INVALID_TRANSITION");
  }

  const receiptId = idempotency.receiptId;
  const evidence = buildTask04BookingConfirmEvidence({
    bookingReference: booking.booking_reference,
    subjectReference: booking.subject_reference,
    aggregateVersion: nextBookingVersion,
    receiptId,
    auditId: createOpaqueReference("SYNTH-AUDIT"),
    eventId: createOpaqueReference("SYNTH-EVENT"),
    maxAccessibilitySelections:
      context.maxAccessibilitySelections,
    maxPageSize: context.maxPageSize,
    supportedDisplayTimezones:
      context.supportedDisplayTimezones,
  });
  await completeTask04IdempotentCommand(
    transaction,
    context,
    receiptId,
    "booking:confirm",
    evidence.responseData,
  );
  await insertTask04OutboxEvent(
    transaction,
    context,
    evidence.outbox,
  );
  await insertTask04SyntheticAudit(
    transaction,
    context,
    evidence.audit,
  );

  return validateBookingConfirmSuccess(
    context,
    evidence.responseData,
    receiptId,
  );
}

function normalizeBookingConfirmFailure(
  failure: unknown,
): unknown {
  if (failure instanceof Task04KnownFailure) return failure;
  if (
    failure instanceof Error &&
    failure.message === "TASK04_AUTHORITATIVE_CONTEXT_DENIED"
  ) {
    return new Task04KnownFailure("FEATURE_DISABLED");
  }
  const classification = classifyTask04DatabaseFailure(failure);
  if (
    classification === "retryable_serialization" ||
    classification === "retryable_deadlock"
  ) {
    return new Task04KnownFailure("TEMPORARILY_UNAVAILABLE");
  }
  return failure;
}

export async function executeTask04BookingConfirm(
  sql: Task04SandboxSql,
  environment: Task04SandboxEnv,
  authoritativeRawRequest: Uint8Array,
): Promise<Task04BookingConfirmCommandResult> {
  try {
    const request = parseAuthoritativeBookingConfirmRequest(
      authoritativeRawRequest,
      environment,
    );
    return await withTask04RuntimeTransaction(
      sql,
      "read committed",
      (transaction) =>
        executeBookingConfirmTransaction(
          transaction,
          environment,
          request,
        ),
    );
  } catch (failure) {
    return mapTask04SafeError(
      "booking:confirm",
      normalizeBookingConfirmFailure(failure),
    );
  }
}
