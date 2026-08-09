import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";

import {
  authorizeStaffPharmacistQueue,
} from "../booking/authorization";
import {
  task04CommandConfigurationFromEnvironment,
} from "../booking/config";
import {
  createTask04PharmacistQueueSchemas,
  type Task04PharmacistQueueItem,
  type Task04PharmacistQueueRequest,
  type Task04PharmacistQueueResponseData,
} from "../booking/pharmacist-queue-contracts";
import {
  mapTask04SafeError,
  Task04KnownFailure,
  type Task04SafeError,
} from "../booking/safe-errors";
import type { Task04SandboxEnv } from "../env/server";
import { TASK04_SYNTHETIC_REFERENCES } from "../fixtures/synthetic";
import {
  createTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "./authoritative-context";
import type { Task04SandboxSql } from "./client";
import { task04CalendarDateRangeUtc } from "./pharmacy-calendar";
import {
  createTask04PharmacistQueueReferenceService,
  type Task04PharmacistQueueCursorBoundary,
} from "./pharmacist-queue-reference";
import { createTask04PublicSlotReferenceService } from "./public-slot-reference";
import {
  assertTask04AuthoritativeRawRequestWithinLimit,
  classifyTask04DatabaseFailure,
  withTask04RuntimeTransaction,
  type Task04TransactionSql,
} from "./transaction";

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

export const TASK04_SYNTHETIC_PHARMACIST_QUEUE_AUTHORITY =
  Object.freeze({
    actorType: "synthetic_staff" as const,
    actorReference: TASK04_SYNTHETIC_REFERENCES.pharmacist,
    sessionReference:
      "SYNTH-STAFF-SESSION-TASK04-QUEUE-0001",
    sessionActive: true,
    permissions: ["queue:read"] as const,
  });

type QueueBookingState =
  | "pending_confirmation"
  | "confirmed"
  | "rescheduled";

type QueueCandidateRow = {
  booking_id: string;
  booking_state: QueueBookingState;
  booking_service_category_id: string;
  booking_slot_id: string;
  booking_modality: "in_person" | "telephone" | "video";
  booking_created_at_utc: Date;
  confirmation_deadline_utc: Date | null;
  successor_booking_id: string | null;
  service_category_label: string;
  service_state: "active" | "unavailable";
  slot_service_category_id: string;
  slot_modality: "in_person" | "telephone" | "video";
  slot_state: "active" | "unavailable" | "cancelled";
  starts_at_utc: Date;
  ends_at_utc: Date;
  display_timezone: string;
  language_preference:
    | "no_preference"
    | "english"
    | "french"
    | "interpretation_coordination_requested";
  accessibility_preferences: string[];
  source_snapshot_id: string | null;
  source_booking_id: string | null;
  source_waitlist_entry_id: string | null;
  linked_successor_booking_id: string | null;
  successor_predecessor_booking_id: string | null;
  ordering_instant_utc: string;
};

type ServiceCategoryRow = {
  service_category_id: string;
};

type Task04PharmacistQueueSuccess = Readonly<{
  success: true;
  data: Task04PharmacistQueueResponseData;
}>;

export type Task04PharmacistQueueResult =
  | Task04PharmacistQueueSuccess
  | Task04SafeError;

function schemasForContext(
  context: Task04AuthoritativeTransactionContext,
  environment: Task04SandboxEnv,
) {
  const configuration =
    task04CommandConfigurationFromEnvironment(environment);
  return createTask04PharmacistQueueSchemas({
    maxAccessibilitySelections:
      context.maxAccessibilitySelections,
    maxAvailabilityWindowDays:
      configuration.maxAvailabilityWindowDays,
    maxPageSize: context.maxPageSize,
    supportedDisplayTimezones:
      context.supportedDisplayTimezones,
  });
}

function parseAuthoritativeQueueRequest(
  authoritativeRawRequest: Uint8Array,
  environment: Task04SandboxEnv,
): Task04PharmacistQueueRequest {
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
    return createTask04PharmacistQueueSchemas({
      maxAccessibilitySelections:
        environment.maxAccessibilitySelections,
      maxAvailabilityWindowDays:
        configuration.maxAvailabilityWindowDays,
      maxPageSize: environment.maxPageSize,
      supportedDisplayTimezones:
        environment.supportedDisplayTimezones,
    }).pharmacistQueueRequestSchema.parse(input);
  } catch {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
}

function queueFingerprint(
  context: Task04AuthoritativeTransactionContext,
  request: Task04PharmacistQueueRequest,
  pageSize: number,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        "TASK04_PHARMACIST_QUEUE_QUERY_V1",
        context.pharmacyId,
        request.status === undefined
          ? null
          : [...request.status].sort(),
        request.serviceCategoryRef ?? null,
        request.modality ?? null,
        request.startDate ?? null,
        request.endDate ?? null,
        request.sort,
        pageSize,
      ]),
      "utf8",
    )
    .digest("hex");
}

function operationalReason(
  state: QueueBookingState,
): Task04PharmacistQueueItem["operationalReason"] {
  if (state === "pending_confirmation") {
    return "confirmation_required";
  }
  if (state === "confirmed") {
    return "appointment_upcoming";
  }
  return "recently_rescheduled";
}

function assertCandidateIsSafe(
  row: QueueCandidateRow,
  context: Task04AuthoritativeTransactionContext,
): void {
  const sourceIsValid =
    row.source_snapshot_id === null
      ? row.source_booking_id === null &&
        row.source_waitlist_entry_id === null
      : (row.source_booking_id === null) !==
        (row.source_waitlist_entry_id === null);
  if (
    row.service_state !== "active" ||
    row.slot_state !== "active" ||
    row.booking_service_category_id !==
      row.slot_service_category_id ||
    row.booking_modality !== row.slot_modality ||
    row.ends_at_utc <= row.starts_at_utc ||
    !context.supportedDisplayTimezones.includes(
      row.display_timezone,
    ) ||
    !sourceIsValid ||
    (row.booking_state !== "rescheduled" &&
      row.successor_booking_id !== null) ||
    (row.booking_state === "rescheduled" &&
      (row.successor_booking_id === null ||
        row.successor_booking_id === row.booking_id ||
        row.linked_successor_booking_id !==
          row.successor_booking_id ||
        row.successor_predecessor_booking_id !==
          row.booking_id)) ||
    (row.booking_state === "pending_confirmation" &&
      row.confirmation_deadline_utc === null)
  ) {
    throw new Error("TASK04_QUEUE_DATABASE_STATE_DENIED");
  }
}

async function resolveServiceCategoryId(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  environment: Task04SandboxEnv,
  serviceCategoryReference: string,
): Promise<string> {
  const candidates = await transaction<ServiceCategoryRow[]>`
    SELECT id AS service_category_id
    FROM task04_synthetic.service_category
    WHERE pharmacy_id = ${context.pharmacyId}
      AND state = 'active'
    ORDER BY id
  `;
  const configuration =
    task04CommandConfigurationFromEnvironment(environment);
  const referenceService =
    createTask04PublicSlotReferenceService({
      pharmacyId: context.pharmacyId,
      secret: environment.publicSlotReferenceSecret,
      ttlSeconds:
        configuration.publicSlotReferenceTtlSeconds,
      sandboxInstanceId: environment.instanceId,
      approvalDecisionVersion:
        environment.approvalDecisionVersion,
      lifecycleExpiresAtUtc:
        environment.expiresAt.toISOString(),
    });
  try {
    return referenceService.resolveServiceCategoryReference(
      serviceCategoryReference,
      candidates.map(
        (candidate) => candidate.service_category_id,
      ),
      context.nowUtc,
    );
  } catch {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
}

async function loadQueueCandidates(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  environment: Task04SandboxEnv,
  request: Task04PharmacistQueueRequest,
  cursorBoundary:
    | Task04PharmacistQueueCursorBoundary
    | undefined,
  pageSize: number,
): Promise<QueueCandidateRow[]> {
  const internalServiceCategoryId =
    request.serviceCategoryRef === undefined
      ? undefined
      : await resolveServiceCategoryId(
          transaction,
          context,
          environment,
          request.serviceCategoryRef,
        );
  const statusFilter =
    request.status === undefined
      ? transaction`
          AND booking.state = ANY(
            ARRAY[
              'pending_confirmation',
              'confirmed',
              'rescheduled'
            ]::task04_synthetic.booking_state[]
          )
        `
      : transaction`
          AND booking.state = ANY(
            ${transaction.array(request.status)}
              ::task04_synthetic.booking_state[]
          )
        `;
  const serviceFilter =
    internalServiceCategoryId === undefined
      ? transaction``
      : transaction`
          AND booking.service_category_id =
            ${internalServiceCategoryId}
        `;
  const modalityFilter =
    request.modality === undefined
      ? transaction``
      : transaction`
          AND booking.modality = ${request.modality}
        `;
  const pharmacyTimezone =
    context.supportedDisplayTimezones[0];
  if (pharmacyTimezone === undefined) {
    throw new Error("TASK04_QUEUE_TIMEZONE_DENIED");
  }
  const dateWindow =
    request.startDate === undefined ||
    request.endDate === undefined
      ? undefined
      : task04CalendarDateRangeUtc({
          startDate: request.startDate,
          endDate: request.endDate,
          timezone: pharmacyTimezone,
        });
  const dateFilter =
    dateWindow === undefined
      ? transaction``
      : transaction`
          AND slot.starts_at_utc >=
            ${dateWindow.startUtc}::timestamptz
          AND slot.starts_at_utc <
            ${dateWindow.endExclusiveUtc}::timestamptz
        `;
  /*
   * Canonical keyset tuples:
   * - start_time_asc: (slot.starts_at_utc ASC, booking.id ASC)
   * - created_at_asc: (booking.created_at_utc ASC, booking.id ASC)
   *
   * booking.id is the stable globally unique final tie-breaker. It is
   * carried to the client only inside the AES-256-GCM encrypted cursor.
   */
  const orderingExpression =
    request.sort === "created_at_asc"
      ? transaction`booking.created_at_utc`
      : transaction`slot.starts_at_utc`;
  const cursorFilter =
    cursorBoundary === undefined
      ? transaction``
      : transaction`
          AND (${orderingExpression}, booking.id) >
            (
              ${cursorBoundary.orderingInstantUtc}::timestamptz,
              ${cursorBoundary.bookingId}
            )
        `;

  const rows = await transaction<QueueCandidateRow[]>`
    SELECT
      booking.id AS booking_id,
      booking.state AS booking_state,
      booking.service_category_id
        AS booking_service_category_id,
      booking.slot_id AS booking_slot_id,
      booking.modality AS booking_modality,
      booking.created_at_utc AS booking_created_at_utc,
      booking.confirmation_deadline_utc,
      booking.successor_booking_id,
      service.public_label AS service_category_label,
      service.state AS service_state,
      slot.service_category_id AS slot_service_category_id,
      slot.modality AS slot_modality,
      slot.state AS slot_state,
      slot.starts_at_utc,
      slot.ends_at_utc,
      slot.display_timezone,
      preference.language AS language_preference,
      preference.accessibility_preferences,
      preference.source_snapshot_id,
      source_preference.booking_id AS source_booking_id,
      source_preference.waitlist_entry_id
        AS source_waitlist_entry_id,
      successor.id AS linked_successor_booking_id,
      successor.predecessor_booking_id
        AS successor_predecessor_booking_id,
      to_char(
        ${orderingExpression} AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
      ) AS ordering_instant_utc
    FROM task04_synthetic.booking AS booking
    JOIN task04_synthetic.service_category AS service
      ON service.id = booking.service_category_id
     AND service.pharmacy_id = booking.pharmacy_id
    JOIN task04_synthetic.booking_slot AS slot
      ON slot.id = booking.slot_id
     AND slot.pharmacy_id = booking.pharmacy_id
    JOIN task04_synthetic.administrative_preference_snapshot
      AS preference
      ON preference.booking_id = booking.id
     AND preference.pharmacy_id = booking.pharmacy_id
    LEFT JOIN task04_synthetic.administrative_preference_snapshot
      AS source_preference
      ON source_preference.id = preference.source_snapshot_id
     AND source_preference.pharmacy_id = preference.pharmacy_id
    LEFT JOIN task04_synthetic.booking AS successor
      ON successor.id = booking.successor_booking_id
     AND successor.pharmacy_id = booking.pharmacy_id
    WHERE booking.pharmacy_id = ${context.pharmacyId}
      ${statusFilter}
      ${serviceFilter}
      ${modalityFilter}
      ${dateFilter}
      AND (
        booking.state <> 'pending_confirmation'
        OR booking.confirmation_deadline_utc >
          ${context.nowUtc}::timestamptz
      )
      ${cursorFilter}
    ORDER BY ${orderingExpression} ASC, booking.id ASC
    LIMIT ${pageSize + 1}
  `;
  return rows;
}

export async function queryTask04PharmacistQueue(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  environment: Task04SandboxEnv,
  request: Task04PharmacistQueueRequest,
): Promise<Task04PharmacistQueueSuccess> {
  const authorization = authorizeStaffPharmacistQueue(context, {
    ...TASK04_SYNTHETIC_PHARMACIST_QUEUE_AUTHORITY,
    pharmacyId: environment.pharmacyId,
  });
  if (!authorization.authorized) {
    throw new Task04KnownFailure("NOT_AUTHORIZED");
  }

  const schemas = schemasForContext(context, environment);
  const pageSize = request.pageSize ?? context.maxPageSize;
  const fingerprint = queueFingerprint(
    context,
    request,
    pageSize,
  );
  const referenceService =
    createTask04PharmacistQueueReferenceService({
      pharmacyId: context.pharmacyId,
      secret: environment.publicSlotReferenceSecret,
    });
  let cursorBoundary:
    | Task04PharmacistQueueCursorBoundary
    | undefined;
  if (request.cursor !== undefined) {
    try {
      cursorBoundary = referenceService.resolveCursor(
        request.cursor,
        fingerprint,
      );
    } catch {
      throw new Task04KnownFailure("REQUEST_INVALID");
    }
  }

  const rows = await loadQueueCandidates(
    transaction,
    context,
    environment,
    request,
    cursorBoundary,
    pageSize,
  );
  const page = rows.slice(0, pageSize);
  const candidates = page.map((row) => {
    assertCandidateIsSafe(row, context);
    return {
      row,
      queueItemReference:
        referenceService.issueQueueItemReference(row.booking_id),
    };
  });
  const items = candidates.map(({ row, queueItemReference }) =>
    schemas.pharmacistQueueItemSchema.parse({
      queueItemReference,
      appointmentStartUtc: row.starts_at_utc.toISOString(),
      appointmentEndUtc: row.ends_at_utc.toISOString(),
      displayTimezone: row.display_timezone,
      serviceCategoryLabel: row.service_category_label,
      modality: row.booking_modality,
      administrativeStatus: row.booking_state,
      languagePreference: row.language_preference,
      accessibilityPreferences:
        row.accessibility_preferences,
      source:
        row.source_waitlist_entry_id === null
          ? "booking"
          : "waitlist_promotion",
      createdAtUtc: row.booking_created_at_utc.toISOString(),
      operationalReason: operationalReason(row.booking_state),
      actionAvailability: "not_permitted",
    }),
  );
  const finalRow = page.at(-1);
  const data = schemas.pharmacistQueueResponseDataSchema.parse({
    items,
    ...(rows.length > pageSize && finalRow !== undefined
      ? {
          nextCursor: referenceService.issueCursor(
            fingerprint,
            {
              orderingInstantUtc:
                finalRow.ordering_instant_utc,
              bookingId: finalRow.booking_id,
            },
          ),
        }
      : {}),
    resultCompleteness: "complete",
    unavailableSourceCategories: [],
    freshnessState: "fresh",
    generatedAtUtc: context.nowUtc,
    refreshGuidance: "none",
  });
  return schemas.pharmacistQueueResponseSchema.parse({
    success: true,
    data,
  });
}

function normalizeQueueFailure(failure: unknown): unknown {
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

export async function executeTask04PharmacistQueue(
  sql: Task04SandboxSql,
  environment: Task04SandboxEnv,
  authoritativeRawRequest: Uint8Array,
): Promise<Task04PharmacistQueueResult> {
  try {
    const request = parseAuthoritativeQueueRequest(
      authoritativeRawRequest,
      environment,
    );
    return await withTask04RuntimeTransaction(
      sql,
      "repeatable read",
      async (transaction) => {
        await transaction.unsafe("SET TRANSACTION READ ONLY");
        const configuration =
          task04CommandConfigurationFromEnvironment(environment);
        const context =
          await createTask04AuthoritativeTransactionContext(
            transaction,
            environment,
            configuration,
          );
        return queryTask04PharmacistQueue(
          transaction,
          context,
          environment,
          request,
        );
      },
    );
  } catch (failure) {
    return mapTask04SafeError(
      "queue:read",
      normalizeQueueFailure(failure),
    );
  }
}
