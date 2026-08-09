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
