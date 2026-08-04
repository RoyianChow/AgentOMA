import { randomBytes } from "node:crypto";

import {
  createTask04BookingExpiryWorkerSchemas,
  type Task04BookingExpiryWorkerControl,
  type Task04BookingExpiryWorkerResultData,
} from "../booking/booking-expiry-contracts";
import {
  task04CommandConfigurationFromEnvironment,
} from "../booking/config";
import {
  createTask04BookingSchemas,
  type Task04BookingExpireRequest,
  type Task04BookingExpireResponseData,
} from "../booking/contracts";
import {
  sha256Task04Value,
} from "../booking/idempotency";
import {
  parseTask04AuditInput,
  type Task04AuditInput,
} from "../booking/audit-contracts";
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
  classifyTask04DatabaseFailure,
  withTask04RuntimeTransaction,
  type Task04TransactionSql,
} from "./transaction";

const BOOKING_EXPIRY_IDEMPOTENCY_CONTRACT =
  "TASK04_SYNTHETIC_BOOKING_EXPIRY_V1";

export const TASK04_SYNTHETIC_BOOKING_EXPIRY_AUTHORITY =
  Object.freeze({
    actorType: "synthetic_system_worker" as const,
    actorReference: TASK04_SYNTHETIC_REFERENCES.systemWorker,
    subjectType: "synthetic_patient" as const,
  });

type ExpiryCandidate = Readonly<{
  booking_reference: string;
  aggregate_version: number;
}>;

type LockedBooking = Readonly<{
  booking_reference: string;
  slot_id: string;
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
}>;

type LockedHold = Readonly<{
  hold_id: string;
  slot_id: string;
  capacity_unit_id: string;
  state: "active" | "consumed" | "released" | "expired";
  expires_at_utc: Date;
  aggregate_version: number;
}>;

type LockedCapacityUnit = Readonly<{
  capacity_unit_id: string;
  slot_id: string;
  booking_id: string | null;
  capacity_hold_id: string | null;
}>;

type ExpiryTransitionEvidence = Readonly<{
  audit: Task04AuditInput;
  outbox: Task04OutboxEventInput;
}>;

export type Task04BookingExpiryEvidence = Readonly<{
  responseData: Task04BookingExpireResponseData;
  booking: ExpiryTransitionEvidence;
  hold: ExpiryTransitionEvidence;
}>;

export type Task04BookingExpiryWorkerSuccess = Readonly<{
  success: true;
  data: Task04BookingExpiryWorkerResultData;
}>;

export type Task04BookingExpiryWorkerResult =
  | Task04BookingExpiryWorkerSuccess
  | Task04SafeError;

class Task04ExpiryCandidateSkipped extends Error {
  constructor() {
    super("TASK04_EXPIRY_CANDIDATE_SKIPPED");
  }
}

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

function deterministicExpiryIdempotencyKey(
  candidate: ExpiryCandidate,
): string {
  const digest = sha256Task04Value(
    JSON.stringify([
      BOOKING_EXPIRY_IDEMPOTENCY_CONTRACT,
      TASK04_SYNTHETIC_BOOKING_EXPIRY_AUTHORITY.actorReference,
      candidate.booking_reference,
      candidate.aggregate_version,
    ]),
  );
  return `SYNTH-EXPIRE-${digest}`;
}

function expirationRequest(
  context: Task04AuthoritativeTransactionContext,
  candidate: ExpiryCandidate,
): Task04BookingExpireRequest {
  return schemasForContext(context).bookingExpireRequestSchema.parse({
    bookingReference: candidate.booking_reference,
    expectedAggregateVersion: candidate.aggregate_version,
    idempotencyKey: deterministicExpiryIdempotencyKey(candidate),
  });
}

export function buildTask04BookingExpiryEvidence(input: Readonly<{
  bookingReference: string;
  bookingVersion: number;
  holdReference: string;
  holdVersion: number;
  subjectReference: string;
  receiptId: string;
  bookingAuditId: string;
  bookingEventId: string;
  holdAuditId: string;
  holdEventId: string;
  maxAccessibilitySelections: number;
  maxPageSize: number;
  supportedDisplayTimezones: readonly string[];
}>): Task04BookingExpiryEvidence {
  const schemas = createTask04BookingSchemas({
    maxAccessibilitySelections: input.maxAccessibilitySelections,
    supportedDisplayTimezones: input.supportedDisplayTimezones,
  });
  const responseData =
    schemas.bookingExpireResponseDataSchema.parse({
      bookingReference: input.bookingReference,
      status: "expired",
      holdStatus: "expired",
    });
  const bookingOutbox = parseTask04OutboxEventInput(
    {
      eventId: input.bookingEventId,
      eventType: "booking.expired",
      eventSchemaVersion: 1,
      aggregateType: "booking",
      aggregateId: input.bookingReference,
      aggregateVersion: input.bookingVersion,
      actorType:
        TASK04_SYNTHETIC_BOOKING_EXPIRY_AUTHORITY.actorType,
      safeReasonCode: "CONFIRMATION_WINDOW_EXPIRED",
      payload: {
        previousState: "pending_confirmation",
        resultingState: "expired",
      },
    },
    input.maxPageSize,
  );
  const holdOutbox = parseTask04OutboxEventInput(
    {
      eventId: input.holdEventId,
      eventType: "capacity_hold.expired",
      eventSchemaVersion: 1,
      aggregateType: "capacity_hold",
      aggregateId: input.holdReference,
      aggregateVersion: input.holdVersion,
      actorType:
        TASK04_SYNTHETIC_BOOKING_EXPIRY_AUTHORITY.actorType,
      safeReasonCode: "HOLD_WINDOW_EXPIRED",
      payload: {
        ownerType: "pending_booking",
        resultingState: "expired",
      },
    },
    input.maxPageSize,
  );
  const bookingAudit = parseTask04AuditInput({
    operation: "booking:expire",
    auditId: input.bookingAuditId,
    aggregateType: "booking",
    aggregateId: input.bookingReference,
    aggregateVersion: input.bookingVersion,
    actorType:
      TASK04_SYNTHETIC_BOOKING_EXPIRY_AUTHORITY.actorType,
    subjectReference: input.subjectReference,
    subjectType:
      TASK04_SYNTHETIC_BOOKING_EXPIRY_AUTHORITY.subjectType,
    priorState: "pending_confirmation",
    resultingState: "expired",
    safeReasonCode: "CONFIRMATION_WINDOW_EXPIRED",
    idempotencyRecordId: input.receiptId,
    outboxRecordId: input.bookingEventId,
  });
  const holdAudit = parseTask04AuditInput({
    operation: "booking:expire",
    auditId: input.holdAuditId,
    aggregateType: "capacity_hold",
    aggregateId: input.holdReference,
    aggregateVersion: input.holdVersion,
    actorType:
      TASK04_SYNTHETIC_BOOKING_EXPIRY_AUTHORITY.actorType,
    subjectReference: input.subjectReference,
    subjectType:
      TASK04_SYNTHETIC_BOOKING_EXPIRY_AUTHORITY.subjectType,
    priorState: "active",
    resultingState: "expired",
    safeReasonCode: "HOLD_WINDOW_EXPIRED",
    idempotencyRecordId: input.receiptId,
    outboxRecordId: input.holdEventId,
  });
  return Object.freeze({
    responseData,
    booking: Object.freeze({
      audit: bookingAudit,
      outbox: bookingOutbox,
    }),
    hold: Object.freeze({
      audit: holdAudit,
      outbox: holdOutbox,
    }),
  });
}

async function selectExpiryCandidates(
  sql: Task04SandboxSql,
  environment: Task04SandboxEnv,
  control: Task04BookingExpiryWorkerControl,
): Promise<readonly ExpiryCandidate[]> {
  return withTask04RuntimeTransaction(
    sql,
    "read committed",
    async (transaction) => {
      const context =
        await createTask04AuthoritativeTransactionContext(
          transaction,
          environment,
          task04CommandConfigurationFromEnvironment(environment),
        );
      return transaction<ExpiryCandidate[]>`
        SELECT
          booking.id AS booking_reference,
          booking.aggregate_version
        FROM task04_synthetic.booking AS booking
        JOIN task04_synthetic.capacity_hold AS hold
          ON hold.pending_booking_id = booking.id
         AND hold.pharmacy_id = booking.pharmacy_id
        WHERE booking.pharmacy_id = ${context.pharmacyId}
          AND booking.state = 'pending_confirmation'
          AND booking.successor_booking_id IS NULL
          AND hold.purpose = 'pending_booking'
          AND hold.state = 'active'
          AND hold.expires_at_utc <= ${context.nowUtc}
        ORDER BY
          hold.expires_at_utc,
          booking.id COLLATE "C"
        LIMIT ${control.maxBatchSize}
      `;
    },
  );
}

async function lockAndValidateBooking(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  request: Task04BookingExpireRequest,
): Promise<LockedBooking> {
  const rows = await transaction<LockedBooking[]>`
    SELECT
      id AS booking_reference,
      slot_id,
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
  if (
    !booking ||
    rows.length !== 1 ||
    booking.state !== "pending_confirmation" ||
    booking.successor_booking_id !== null ||
    booking.confirmation_deadline_utc === null ||
    booking.confirmation_deadline_utc.toISOString() > context.nowUtc ||
    booking.aggregate_version !== request.expectedAggregateVersion
  ) {
    throw new Task04ExpiryCandidateSkipped();
  }
  return booking;
}

async function lockAndValidateHold(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  booking: LockedBooking,
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
    ORDER BY id COLLATE "C"
    FOR UPDATE
  `;
  const hold = rows[0];
  if (
    !hold ||
    rows.length !== 1 ||
    hold.state !== "active" ||
    hold.slot_id !== booking.slot_id ||
    hold.expires_at_utc.toISOString() > context.nowUtc ||
    hold.expires_at_utc.toISOString() !==
      booking.confirmation_deadline_utc?.toISOString()
  ) {
    throw new Task04ExpiryCandidateSkipped();
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
    throw new Task04ExpiryCandidateSkipped();
  }
  return unit;
}

async function expireCandidate(
  sql: Task04SandboxSql,
  environment: Task04SandboxEnv,
  candidate: ExpiryCandidate,
): Promise<boolean> {
  return withTask04RuntimeTransaction(
    sql,
    "read committed",
    async (transaction) => {
      const context =
        await createTask04AuthoritativeTransactionContext(
          transaction,
          environment,
          task04CommandConfigurationFromEnvironment(environment),
        );
      const request = expirationRequest(context, candidate);

      // Deterministic mutation lock order:
      // idempotency -> booking -> hold -> capacity unit.
      const idempotency = await beginTask04IdempotentCommand(
        transaction,
        context,
        {
          operation: "booking:expire",
          actorReference:
            TASK04_SYNTHETIC_BOOKING_EXPIRY_AUTHORITY.actorReference,
          resourceScopeReference: request.bookingReference,
          request,
        },
      );
      if (idempotency.disposition === "replay") return false;

      const booking = await lockAndValidateBooking(
        transaction,
        context,
        request,
      );
      const hold = await lockAndValidateHold(
        transaction,
        context,
        booking,
      );
      const unit = await lockAndValidateCapacityUnit(
        transaction,
        context,
        hold,
      );
      const nextBookingVersion = booking.aggregate_version + 1;
      const nextHoldVersion = hold.aggregate_version + 1;

      const updatedBookings = await transaction<{ id: string }[]>`
        UPDATE task04_synthetic.booking
        SET state = 'expired',
            confirmation_deadline_utc = null,
            safe_reason_code = 'CONFIRMATION_WINDOW_EXPIRED',
            aggregate_version = ${nextBookingVersion},
            transitioned_at_utc = ${context.nowUtc}
        WHERE id = ${booking.booking_reference}
          AND pharmacy_id = ${context.pharmacyId}
          AND state = 'pending_confirmation'
          AND aggregate_version = ${booking.aggregate_version}
        RETURNING id
      `;
      if (updatedBookings.length !== 1) {
        throw new Task04ExpiryCandidateSkipped();
      }

      const updatedHolds = await transaction<{ id: string }[]>`
        UPDATE task04_synthetic.capacity_hold
        SET state = 'expired',
            expired_at_utc = ${context.nowUtc},
            aggregate_version = ${nextHoldVersion},
            transitioned_at_utc = ${context.nowUtc}
        WHERE id = ${hold.hold_id}
          AND pharmacy_id = ${context.pharmacyId}
          AND state = 'active'
          AND aggregate_version = ${hold.aggregate_version}
        RETURNING id
      `;
      if (updatedHolds.length !== 1) {
        throw new Task04ExpiryCandidateSkipped();
      }

      const updatedUnits = await transaction<{ id: string }[]>`
        UPDATE task04_synthetic.capacity_unit
        SET capacity_hold_id = null,
            aggregate_version = aggregate_version + 1,
            transitioned_at_utc = ${context.nowUtc}
        WHERE id = ${unit.capacity_unit_id}
          AND pharmacy_id = ${context.pharmacyId}
          AND slot_id = ${unit.slot_id}
          AND booking_id IS NULL
          AND capacity_hold_id = ${hold.hold_id}
        RETURNING id
      `;
      if (updatedUnits.length !== 1) {
        throw new Task04ExpiryCandidateSkipped();
      }

      const evidence = buildTask04BookingExpiryEvidence({
        bookingReference: booking.booking_reference,
        bookingVersion: nextBookingVersion,
        holdReference: hold.hold_id,
        holdVersion: nextHoldVersion,
        subjectReference: booking.subject_reference,
        receiptId: idempotency.receiptId,
        bookingAuditId: createOpaqueReference("SYNTH-AUDIT"),
        bookingEventId: createOpaqueReference("SYNTH-EVENT"),
        holdAuditId: createOpaqueReference("SYNTH-AUDIT"),
        holdEventId: createOpaqueReference("SYNTH-EVENT"),
        maxAccessibilitySelections:
          context.maxAccessibilitySelections,
        maxPageSize: context.maxPageSize,
        supportedDisplayTimezones:
          context.supportedDisplayTimezones,
      });

      await completeTask04IdempotentCommand(
        transaction,
        context,
        idempotency.receiptId,
        "booking:expire",
        evidence.responseData,
      );
      await insertTask04OutboxEvent(
        transaction,
        context,
        evidence.booking.outbox,
      );
      await insertTask04OutboxEvent(
        transaction,
        context,
        evidence.hold.outbox,
      );
      await insertTask04SyntheticAudit(
        transaction,
        context,
        evidence.booking.audit,
      );
      await insertTask04SyntheticAudit(
        transaction,
        context,
        evidence.hold.audit,
      );
      return true;
    },
  );
}

function normalizeBookingExpiryFailure(failure: unknown): unknown {
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

export async function executeTask04ExpiredPendingBookingCleanup(
  sql: Task04SandboxSql,
  environment: Task04SandboxEnv,
  controlInput: unknown,
): Promise<Task04BookingExpiryWorkerResult> {
  try {
    const configuration =
      task04CommandConfigurationFromEnvironment(environment);
    const schemas = createTask04BookingExpiryWorkerSchemas({
      maxBatchSize: configuration.maxPageSize,
    });
    const control = schemas.workerControlSchema.parse(controlInput);
    const candidates = await selectExpiryCandidates(
      sql,
      environment,
      control,
    );
    let expired = 0;
    let skipped = 0;
    for (const candidate of candidates) {
      try {
        if (await expireCandidate(sql, environment, candidate)) {
          expired += 1;
        } else {
          skipped += 1;
        }
      } catch (failure) {
        if (failure instanceof Task04ExpiryCandidateSkipped) {
          skipped += 1;
          continue;
        }
        throw failure;
      }
    }
    return schemas.workerSuccessSchema.parse({
      success: true,
      data: {
        examined: candidates.length,
        expired,
        skipped,
      },
    });
  } catch (failure) {
    const normalized =
      failure instanceof Error &&
      failure.name === "ZodError"
        ? new Task04KnownFailure("REQUEST_INVALID")
        : normalizeBookingExpiryFailure(failure);
    return mapTask04SafeError("booking:expire", normalized);
  }
}
