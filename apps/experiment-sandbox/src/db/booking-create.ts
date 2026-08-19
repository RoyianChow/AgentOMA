import { randomBytes } from "node:crypto";
import { TextDecoder } from "node:util";

import {
  parseTask04AuditInput,
  type Task04AuditInput,
} from "../booking/audit-contracts";
import {
  task04CommandConfigurationFromEnvironment,
} from "../booking/config";
import {
  createTask04BookingSchemas,
  type Task04BookingCreateRequest,
  type Task04BookingCreateResponseData,
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
import { resolveTask04PublicSlotReference } from "./availability";
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

const TASK04_BOOKING_ACKNOWLEDGEMENT_VERSION =
  "SYNTH-BOOKING-ACK-V1" as const;
const TASK04_BOOKING_MANAGEMENT_ACTIONS = [
  "booking:view",
] as const;

// Who the booking is for is decided by the server, not by the request body.
//
// Taking actor, subject or delegation from the caller would let one person book
// as another simply by naming them. Until the identity work in Task 05 exists,
// this prototype pins them to fixed synthetic references — which also keeps the
// surface strictly administrative: there is no field here, and none in the
// request schema, that could carry a symptom, health number or reason for the
// visit.
export const TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY =
  Object.freeze({
    actorType: "synthetic_delegate" as const,
    actorReference: TASK04_SYNTHETIC_REFERENCES.delegate,
    subjectType: "synthetic_patient" as const,
    subjectReference: TASK04_SYNTHETIC_REFERENCES.patient,
    delegationGrantReference:
      TASK04_SYNTHETIC_REFERENCES.delegationGrant,
    serverSessionBinding:
      "SYNTH-SESSION-TASK04-BOOKING-0001",
  });

type LockedBookingSlot = {
  slot_id: string;
  service_category_id: string;
  service_category_label: string;
  modality: "in_person" | "telephone" | "video";
  starts_at_utc: Date;
  ends_at_utc: Date;
  display_timezone: string;
  configured_capacity: number;
  slot_state: "active" | "unavailable" | "cancelled";
  service_state: "active" | "unavailable";
  requires_staff_confirmation: boolean;
  modality_is_supported: boolean;
};

type CapacityUnit = {
  capacity_unit_id: string;
};

type Task04BookingCreateSuccess = Readonly<{
  success: true;
  data: Task04BookingCreateResponseData;
  receiptId: string;
}>;

export type Task04BookingCreateCommandResult =
  | Task04BookingCreateSuccess
  | Task04SafeError;

type BookingCreateEvidenceInput = Readonly<{
  status: "pending_confirmation" | "confirmed";
  bookingReference: string;
  receiptId: string;
  auditId: string;
  eventId: string;
  serviceCategoryLabel: string;
  modality: "in_person" | "telephone" | "video";
  startTimeUtc: string;
  endTimeUtc: string;
  displayTimezone: string;
  confirmationExpiresAtUtc?: string;
  capabilityReference: string;
  capabilityExpiresAtUtc: string;
  maxAccessibilitySelections: number;
  maxPageSize: number;
  supportedDisplayTimezones: readonly string[];
}>;

export type Task04BookingCreateEvidence = Readonly<{
  responseData: Task04BookingCreateResponseData;
  audit: Task04AuditInput;
  outbox: Task04OutboxEventInput;
}>;

// Identifiers are random and opaque, never sequential and never a database key.
// A guessable or countable reference would let a caller enumerate other
// people's bookings, and a leaked primary key would tie a public value to
// internal storage. The prefix is for human recognition in logs only and
// carries no authority — possessing a reference never authorizes anything on
// its own.
function createOpaqueReference(prefix: string): string {
  return `${prefix}-${randomBytes(18).toString("base64url")}`;
}

function validateBookingCreateSuccess(
  context: Task04AuthoritativeTransactionContext,
  data: unknown,
  receiptId: string,
): Task04BookingCreateSuccess {
  const schemas = createTask04BookingSchemas({
    maxAccessibilitySelections:
      context.maxAccessibilitySelections,
    supportedDisplayTimezones:
      context.supportedDisplayTimezones,
  });
  return schemas.bookingCreateResponseSchema.parse({
    success: true,
    data,
    receiptId,
  });
}

function parseAuthoritativeBookingCreateRequest(
  authoritativeRawRequest: Uint8Array,
  environment: Task04SandboxEnv,
): Task04BookingCreateRequest {
  const configuration =
    task04CommandConfigurationFromEnvironment(environment);
  try {
    assertTask04AuthoritativeRawRequestWithinLimit(
      authoritativeRawRequest,
      configuration.maxRequestBytes,
    );
    const decoded = utf8Decoder.decode(authoritativeRawRequest);
    const input: unknown = JSON.parse(decoded);
    const schemas = createTask04BookingSchemas({
      maxAccessibilitySelections:
        environment.maxAccessibilitySelections,
      supportedDisplayTimezones:
        environment.supportedDisplayTimezones,
    });
    const parsed = schemas.bookingCreateRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error("TASK04_INVALID_REQUEST");
    }
    return parsed.data;
  } catch {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
}

export function buildTask04BookingCreateEvidence(
  input: BookingCreateEvidenceInput,
): Task04BookingCreateEvidence {
  const schemas = createTask04BookingSchemas({
    maxAccessibilitySelections: input.maxAccessibilitySelections,
    supportedDisplayTimezones: input.supportedDisplayTimezones,
  });
  const responseData = schemas.bookingCreateResponseDataSchema.parse({
    bookingReference: input.bookingReference,
    status: input.status,
    serviceCategoryLabel: input.serviceCategoryLabel,
    modality: input.modality,
    startTimeUtc: input.startTimeUtc,
    endTimeUtc: input.endTimeUtc,
    displayTimezone: input.displayTimezone,
    ...(input.status === "pending_confirmation"
      ? {
          confirmationExpiresAtUtc:
            input.confirmationExpiresAtUtc,
        }
      : {}),
    managementCapability: {
      capabilityReference: input.capabilityReference,
      usageMode: "reusable",
      permittedActions: [...TASK04_BOOKING_MANAGEMENT_ACTIONS],
      expiresAtUtc: input.capabilityExpiresAtUtc,
    },
    syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
  });
  const outbox = parseTask04OutboxEventInput(
    input.status === "confirmed"
      ? {
          eventId: input.eventId,
          eventType: "booking.confirmed",
          eventSchemaVersion: 1,
          aggregateType: "booking",
          aggregateId: input.bookingReference,
          aggregateVersion: 1,
          actorType:
            TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorType,
          safeReasonCode: "IMMEDIATE_CONFIRMATION",
          payload: {
            previousState: "none",
            resultingState: "confirmed",
            capacityOwner: "booking",
          },
        }
      : {
          eventId: input.eventId,
          eventType: "booking.created",
          eventSchemaVersion: 1,
          aggregateType: "booking",
          aggregateId: input.bookingReference,
          aggregateVersion: 1,
          actorType:
            TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorType,
          safeReasonCode: "BOOKING_REQUESTED",
          payload: {
            resultingState: "pending_confirmation",
            modality: input.modality,
            startTimeUtc: input.startTimeUtc,
            endTimeUtc: input.endTimeUtc,
          },
        },
    input.maxPageSize,
  );
  const audit = parseTask04AuditInput({
    operation: "booking:create",
    auditId: input.auditId,
    aggregateType: "booking",
    aggregateId: input.bookingReference,
    aggregateVersion: 1,
    actorType:
      TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorType,
    subjectReference:
      TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.subjectReference,
    subjectType:
      TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.subjectType,
    priorState: "none",
    resultingState: input.status,
    safeReasonCode: "BOOKING_REQUESTED",
    idempotencyRecordId: input.receiptId,
    outboxRecordId: input.eventId,
  });

  return Object.freeze({ responseData, audit, outbox });
}

/**
 * Takes the row lock and re-checks every condition while holding it.
 *
 * Whatever availability showed the caller is advisory by the time it gets here:
 * the slot may have been cancelled, its service deactivated, its modality
 * withdrawn, or the start time may now be in the past. Validating before the
 * lock would read state that another transaction can still change; the checks
 * below run after FOR UPDATE, so what is verified is what gets booked.
 *
 * The lock covers slot AND service because the decision depends on both — a
 * service deactivated concurrently would otherwise slip past a slot-only lock.
 *
 * Every failure collapses to one SLOT_NO_LONGER_AVAILABLE. Distinguishing
 * "cancelled" from "service withdrawn" from "capacity gone" would tell an
 * unauthenticated caller about pharmacy operations they have no business
 * seeing, and none of the distinctions change what they can do next.
 */
async function lockAndRevalidateBookingSlot(
  transaction: Task04TransactionSql,
  pharmacyId: string,
  slotId: string,
  trustedNowUtc: string,
  supportedDisplayTimezones: readonly string[],
): Promise<LockedBookingSlot> {
  const rows = await transaction<LockedBookingSlot[]>`
    SELECT
      slot.id AS slot_id,
      service.id AS service_category_id,
      service.public_label AS service_category_label,
      slot.modality,
      slot.starts_at_utc,
      slot.ends_at_utc,
      slot.display_timezone,
      slot.configured_capacity,
      slot.state AS slot_state,
      service.state AS service_state,
      service.requires_staff_confirmation,
      slot.modality = ANY(service.supported_modalities)
        AS modality_is_supported
    FROM task04_synthetic.booking_slot AS slot
    JOIN task04_synthetic.service_category AS service
      ON service.id = slot.service_category_id
     AND service.pharmacy_id = slot.pharmacy_id
    WHERE slot.id = ${slotId}
      AND slot.pharmacy_id = ${pharmacyId}
    FOR UPDATE OF slot, service
  `;
  const row = rows[0];
  if (
    rows.length !== 1 ||
    !row ||
    row.slot_state !== "active" ||
    row.service_state !== "active" ||
    !row.modality_is_supported ||
    row.starts_at_utc.toISOString() <= trustedNowUtc ||
    row.ends_at_utc <= row.starts_at_utc ||
    !supportedDisplayTimezones.includes(row.display_timezone) ||
    !Number.isSafeInteger(row.configured_capacity) ||
    row.configured_capacity <= 0
  ) {
    throw new Task04KnownFailure("SLOT_NO_LONGER_AVAILABLE");
  }
  return row;
}

/**
 * Takes one unit of capacity, or fails.
 *
 * Capacity is not a number that gets counted and compared. Each unit of a
 * slot's capacity exists as its own row, and taking capacity means claiming one
 * of those rows. That is what makes overbooking unrepresentable rather than
 * merely unlikely: the classic "count bookings, compare to limit, insert" shape
 * is a read-then-write, and two concurrent callers both read the same count
 * before either writes.
 *
 * Here concurrency is settled by the row lock. FOR UPDATE on the first free
 * unit means a second caller blocks and then re-evaluates against the state the
 * first one left, so it sees the unit taken instead of re-deriving a stale
 * total. Ordering by unit_sequence keeps that deterministic and reproducible in
 * tests rather than dependent on scan order.
 *
 * "No free unit" is deliberately the same SLOT_NO_LONGER_AVAILABLE the caller
 * would get for a withdrawn slot — a full slot and an unavailable one are the
 * same fact to whoever is booking, and telling them apart would leak how busy
 * the pharmacy is.
 */
async function acquireCapacityUnit(
  transaction: Task04TransactionSql,
  pharmacyId: string,
  slotId: string,
): Promise<CapacityUnit> {
  const rows = await transaction<CapacityUnit[]>`
    SELECT unit.id AS capacity_unit_id
    FROM task04_synthetic.capacity_unit AS unit
    WHERE unit.pharmacy_id = ${pharmacyId}
      AND unit.slot_id = ${slotId}
      AND unit.booking_id IS NULL
      AND unit.capacity_hold_id IS NULL
    ORDER BY unit.unit_sequence, unit.id
    LIMIT 1
    FOR UPDATE OF unit
  `;
  const unit = rows[0];
  if (rows.length !== 1 || !unit) {
    throw new Task04KnownFailure("SLOT_NO_LONGER_AVAILABLE");
  }
  return unit;
}

async function executeBookingCreateTransaction(
  transaction: Task04TransactionSql,
  environment: Task04SandboxEnv,
  request: Task04BookingCreateRequest,
): Promise<Task04BookingCreateSuccess> {
  const configuration =
    task04CommandConfigurationFromEnvironment(environment);
  const context =
    await createTask04AuthoritativeTransactionContext(
      transaction,
      environment,
      configuration,
    );
  const idempotency = await beginTask04IdempotentCommand(
    transaction,
    context,
    {
      operation: "booking:create",
      actorReference:
        TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorReference,
      resourceScopeReference: request.slotReference,
      request,
    },
  );
  if (idempotency.disposition === "replay") {
    return validateBookingCreateSuccess(
      context,
      idempotency.safeResult,
      idempotency.receiptId,
    );
  }

  // The public reference is resolved twice on purpose, once to find the row to
  // lock and once after the lock is held.
  //
  // The first resolution happens against unlocked state, so between it and the
  // lock the reference could stop pointing where it did — it is short-lived and
  // server-issued, and expiry or reissue is exactly the kind of thing that can
  // land in that window. Locking a row identified by a since-changed reference
  // would book a slot the caller never chose.
  //
  // Re-resolving under the lock and requiring the same slot closes that gap: it
  // confirms the row now held is still the one the reference denotes.
  const initialResolution =
    await resolveTask04PublicSlotReference(
      transaction,
      context,
      environment,
      { slotReference: request.slotReference },
    );
  const slot = await lockAndRevalidateBookingSlot(
    transaction,
    context.pharmacyId,
    initialResolution.slotId,
    context.nowUtc,
    context.supportedDisplayTimezones,
  );
  const lockedResolution =
    await resolveTask04PublicSlotReference(
      transaction,
      context,
      environment,
      { slotReference: request.slotReference },
    );
  if (lockedResolution.slotId !== slot.slot_id) {
    throw new Task04KnownFailure("SLOT_NO_LONGER_AVAILABLE");
  }
  const unit = await acquireCapacityUnit(
    transaction,
    context.pharmacyId,
    slot.slot_id,
  );

  // Whether staff must confirm is the SLOT's property, read from the row just
  // locked — never anything the request asked for. A caller cannot elect to
  // skip confirmation for a service that requires it.
  //
  // The deadline is computed by the database from transaction_timestamp()
  // rather than in application code, so it is anchored to the same trusted
  // clock every expiry check later uses. A deadline derived from process time
  // would drift against the worker that enforces it, and a booking could expire
  // early or outlive its hold.
  const status = slot.requires_staff_confirmation
    ? "pending_confirmation"
    : "confirmed";
  const [deadlineRow] = slot.requires_staff_confirmation
    ? await transaction<{ deadline_utc: Date }[]>`
        SELECT
          transaction_timestamp()
            + ${configuration.pendingHoldMinutes}
              * INTERVAL '1 minute'
            AS deadline_utc
      `
    : [];
  const confirmationExpiresAtUtc =
    deadlineRow?.deadline_utc.toISOString();
  if (
    status === "pending_confirmation" &&
    confirmationExpiresAtUtc === undefined
  ) {
    throw new Error("TASK04_BOOKING_DEADLINE_UNAVAILABLE");
  }

  const bookingReference =
    createOpaqueReference("SYNTH-BOOKING");
  const capabilityReference =
    createOpaqueReference("SYNTH-CAPABILITY");
  const credentialId =
    createOpaqueReference("SYNTH-CREDENTIAL");
  const preferenceId =
    createOpaqueReference("SYNTH-PREFERENCE");
  const acknowledgementId =
    createOpaqueReference("SYNTH-ACKNOWLEDGEMENT");
  const holdId =
    status === "pending_confirmation"
      ? createOpaqueReference("SYNTH-HOLD")
      : undefined;
  const auditId = createOpaqueReference("SYNTH-AUDIT");
  const eventId = createOpaqueReference("SYNTH-EVENT");

  await transaction`
    INSERT INTO task04_synthetic.booking (
      id,
      pharmacy_id,
      service_category_id,
      slot_id,
      modality,
      actor_reference,
      subject_reference,
      delegation_grant_reference,
      state,
      confirmation_deadline_utc,
      safe_reason_code,
      aggregate_version,
      created_at_utc,
      transitioned_at_utc
    )
    VALUES (
      ${bookingReference},
      ${context.pharmacyId},
      ${slot.service_category_id},
      ${slot.slot_id},
      ${slot.modality},
      ${TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorReference},
      ${TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.subjectReference},
      ${TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.delegationGrantReference},
      ${status},
      ${confirmationExpiresAtUtc ?? null},
      'BOOKING_REQUESTED',
      1,
      ${context.nowUtc},
      ${context.nowUtc}
    )
  `;

  // Capacity is attached one of two ways, and never both — the schema's
  // num_nonnulls(booking_id, capacity_hold_id) <= 1 check makes a unit that is
  // simultaneously held and booked impossible to store.
  //
  //   pending_confirmation -> a hold owns the unit until staff confirm or it
  //                           expires, so the seat is genuinely reserved rather
  //                           than optimistically assumed;
  //   confirmed            -> the booking owns the unit outright.
  //
  // Both writes re-assert booking_id IS NULL AND capacity_hold_id IS NULL in
  // the WHERE clause and require exactly one row back. The unit was already
  // locked above, so this cannot normally fail — which is the point: if it ever
  // does, something claimed the unit through a path that bypassed the lock, and
  // refusing loudly is better than overwriting another caller's claim and
  // double-booking the seat.
  if (
    status === "pending_confirmation" &&
    holdId !== undefined &&
    confirmationExpiresAtUtc !== undefined
  ) {
    await transaction`
      INSERT INTO task04_synthetic.capacity_hold (
        id,
        pharmacy_id,
        slot_id,
        capacity_unit_id,
        purpose,
        pending_booking_id,
        state,
        expires_at_utc,
        aggregate_version,
        created_at_utc,
        transitioned_at_utc
      )
      VALUES (
        ${holdId},
        ${context.pharmacyId},
        ${slot.slot_id},
        ${unit.capacity_unit_id},
        'pending_booking',
        ${bookingReference},
        'active',
        ${confirmationExpiresAtUtc},
        1,
        ${context.nowUtc},
        ${context.nowUtc}
      )
    `;
    const updatedUnits = await transaction<{ id: string }[]>`
      UPDATE task04_synthetic.capacity_unit
      SET capacity_hold_id = ${holdId},
          aggregate_version = aggregate_version + 1,
          transitioned_at_utc = ${context.nowUtc}
      WHERE id = ${unit.capacity_unit_id}
        AND pharmacy_id = ${context.pharmacyId}
        AND slot_id = ${slot.slot_id}
        AND booking_id IS NULL
        AND capacity_hold_id IS NULL
      RETURNING id
    `;
    if (updatedUnits.length !== 1) {
      throw new Task04KnownFailure("SLOT_NO_LONGER_AVAILABLE");
    }
  } else {
    const updatedUnits = await transaction<{ id: string }[]>`
      UPDATE task04_synthetic.capacity_unit
      SET booking_id = ${bookingReference},
          aggregate_version = aggregate_version + 1,
          transitioned_at_utc = ${context.nowUtc}
      WHERE id = ${unit.capacity_unit_id}
        AND pharmacy_id = ${context.pharmacyId}
        AND slot_id = ${slot.slot_id}
        AND booking_id IS NULL
        AND capacity_hold_id IS NULL
      RETURNING id
    `;
    if (updatedUnits.length !== 1) {
      throw new Task04KnownFailure("SLOT_NO_LONGER_AVAILABLE");
    }
  }

  await transaction`
    INSERT INTO task04_synthetic.administrative_preference_snapshot (
      id,
      pharmacy_id,
      booking_id,
      language,
      accessibility_preferences,
      synthetic_contact_reference,
      created_at_utc
    )
    VALUES (
      ${preferenceId},
      ${context.pharmacyId},
      ${bookingReference},
      ${request.languagePreference},
      ${transaction.array(request.accessibilityPreferences)}::text[],
      ${request.syntheticContactReference},
      ${context.nowUtc}
    )
  `;
  await transaction`
    INSERT INTO task04_synthetic.administrative_acknowledgement_record (
      id,
      pharmacy_id,
      booking_id,
      acknowledgement_version,
      administrative_only,
      not_monitored,
      no_medical_details,
      not_clinical_assessment,
      status_controls_confirmation,
      accepted_at_utc,
      actor_type,
      delegation_grant_reference,
      command_receipt_id
    )
    VALUES (
      ${acknowledgementId},
      ${context.pharmacyId},
      ${bookingReference},
      ${TASK04_BOOKING_ACKNOWLEDGEMENT_VERSION},
      ${request.administrativeAcknowledgements.administrativeOnly},
      ${request.administrativeAcknowledgements.notMonitored},
      ${request.administrativeAcknowledgements.noMedicalDetails},
      ${request.administrativeAcknowledgements.notClinicalAssessment},
      ${request.administrativeAcknowledgements.statusControlsConfirmation},
      ${context.nowUtc},
      ${TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorType},
      ${TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.delegationGrantReference},
      ${idempotency.receiptId}
    )
  `;
  await transaction`
    INSERT INTO task04_synthetic.management_credential (
      id,
      pharmacy_id,
      usage_mode,
      credential_digest,
      capability_reference,
      source_credential_id,
      booking_id,
      waitlist_entry_id,
      permitted_actions,
      actor_reference,
      subject_reference,
      server_session_binding,
      state,
      expires_at_utc,
      issued_at_utc
    )
    VALUES (
      ${credentialId},
      ${context.pharmacyId},
      'reusable',
      null,
      ${capabilityReference},
      null,
      ${bookingReference},
      null,
      ${transaction.array([...TASK04_BOOKING_MANAGEMENT_ACTIONS])}::text[],
      ${TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.actorReference},
      ${TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.subjectReference},
      ${TASK04_SYNTHETIC_BOOKING_CREATE_AUTHORITY.serverSessionBinding},
      'active',
      ${environment.expiresAt.toISOString()},
      ${context.nowUtc}
    )
  `;

  const evidence = buildTask04BookingCreateEvidence({
    status,
    bookingReference,
    receiptId: idempotency.receiptId,
    auditId,
    eventId,
    serviceCategoryLabel: slot.service_category_label,
    modality: slot.modality,
    startTimeUtc: slot.starts_at_utc.toISOString(),
    endTimeUtc: slot.ends_at_utc.toISOString(),
    displayTimezone: slot.display_timezone,
    ...(confirmationExpiresAtUtc === undefined
      ? {}
      : { confirmationExpiresAtUtc }),
    capabilityReference,
    capabilityExpiresAtUtc:
      environment.expiresAt.toISOString(),
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
    "booking:create",
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

  return validateBookingCreateSuccess(
    context,
    evidence.responseData,
    idempotency.receiptId,
  );
}

/**
 * Translates internal failures into the vocabulary the caller is allowed to
 * hear, before mapTask04SafeError picks the message.
 *
 * An expired approval or a denied context is reported as FEATURE_DISABLED
 * rather than as an error: a booking surface that is switched off should look
 * switched off, not broken, and the reason it is off is nobody's business
 * outside the pharmacy.
 *
 * Serialization and deadlock failures become TEMPORARILY_UNAVAILABLE because
 * the transaction rolled back cleanly — nothing was written, and trying again
 * is genuinely the right advice. Everything else is left alone to be mapped
 * generically; guessing at an unrecognised failure risks telling a caller their
 * booking failed when it may have committed.
 */
function normalizeBookingCreateFailure(
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

export async function executeTask04BookingCreate(
  sql: Task04SandboxSql,
  environment: Task04SandboxEnv,
  authoritativeRawRequest: Uint8Array,
): Promise<Task04BookingCreateCommandResult> {
  try {
    const request = parseAuthoritativeBookingCreateRequest(
      authoritativeRawRequest,
      environment,
    );
    return await withTask04RuntimeTransaction(
      sql,
      "read committed",
      (transaction) =>
        executeBookingCreateTransaction(
          transaction,
          environment,
          request,
        ),
    );
  } catch (failure) {
    return mapTask04SafeError(
      "booking:create",
      normalizeBookingCreateFailure(failure),
    );
  }
}
