import { z } from "zod";

import {
  createTask04AvailabilitySchemas,
  sortTask04AvailabilityItems,
  type Task04AvailabilityItem,
  type Task04AvailabilityResponseData,
} from "../booking/availability-contracts";
import { task04CommandConfigurationFromEnvironment } from "../booking/config";
import {
  opaqueReferenceSchema,
} from "../booking/contracts";
import { Task04KnownFailure } from "../booking/safe-errors";
import type { Task04SandboxEnv } from "../env/server";
import { createTask04AvailabilityCacheKey } from "./availability-cache";
import {
  task04CalendarDateRangeUtc,
  task04PharmacyCalendarDate,
  task04PharmacyCalendarWindow,
} from "./pharmacy-calendar";
import {
  assertTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "./authoritative-context";
import { createTask04PublicSlotReferenceService } from "./public-slot-reference";
import type { Task04TransactionSql } from "./transaction";

export const TASK04_AVAILABILITY_PAGINATION_POLICY =
  "BOUNDED_SCOPE_BOUND_OPAQUE_CURSOR" as const;

type AvailabilityRow = {
  slot_id: string;
  service_category_id: string;
  service_category_label: string;
  modality: "in_person" | "telephone" | "video";
  starts_at_utc: Date;
  ends_at_utc: Date;
};

type SlotResolutionRow = {
  slot_id: string;
  service_category_id: string;
  modality: "in_person" | "telephone" | "video";
};

type ServiceCategoryRow = {
  service_category_id: string;
};

const publicSlotResolutionInputSchema = z
  .object({
    slotReference: opaqueReferenceSchema,
  })
  .strict();

function approvedEnvironmentConfiguration(
  context: Task04AuthoritativeTransactionContext,
  environment: Task04SandboxEnv,
) {
  if (environment.pharmacyId !== context.pharmacyId) {
    throw new Error("TASK04_AVAILABILITY_CONTEXT_DENIED");
  }
  return task04CommandConfigurationFromEnvironment(environment);
}

export async function queryTask04PublicAvailability(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  environment: Task04SandboxEnv,
  input: unknown,
): Promise<Task04AvailabilityResponseData> {
  assertTask04AuthoritativeTransactionContext(transaction, context);
  const configuration = approvedEnvironmentConfiguration(
    context,
    environment,
  );
  const schemas = createTask04AvailabilitySchemas({
    maxPageSize: context.maxPageSize,
    maxAvailabilityWindowDays:
      configuration.maxAvailabilityWindowDays,
    publicLocationLabel: configuration.publicLocationLabel,
    supportedDisplayTimezones:
      context.supportedDisplayTimezones,
  });
  const request = schemas.availabilityRequestSchema.safeParse(input);
  if (!request.success) {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
  if (
    request.data.startDate <
    task04PharmacyCalendarDate(
      context.nowUtc,
      request.data.timezone,
    )
  ) {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
  const requestWindow = task04CalendarDateRangeUtc({
    startDate: request.data.startDate,
    endDate: request.data.endDate,
    timezone: request.data.timezone,
  });

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
  const resolvedPageSize =
    request.data.pageSize ?? context.maxPageSize;
  const cursorFingerprint = createTask04AvailabilityCacheKey({
    pharmacyId: context.pharmacyId,
    request: {
      ...request.data,
      cursor: undefined,
    },
    resolvedPageSize,
  });
  let offset = 0;
  if (request.data.cursor !== undefined) {
    try {
      offset = referenceService.resolveAvailabilityCursor(
        request.data.cursor,
        cursorFingerprint,
      );
    } catch {
      throw new Task04KnownFailure("REQUEST_INVALID");
    }
  }
  let internalServiceCategoryId: string | undefined;
  if (request.data.serviceCategoryRef !== undefined) {
    const serviceCandidates =
      await transaction<ServiceCategoryRow[]>`
      SELECT id AS service_category_id
      FROM task04_synthetic.service_category
      WHERE pharmacy_id = ${context.pharmacyId}
        AND state = 'active'
        AND (
          ${request.data.modality ?? null}::text IS NULL
          OR ${request.data.modality ?? null}
            ::task04_synthetic.appointment_modality
            = ANY(supported_modalities)
        )
      ORDER BY id
    `;
    try {
      internalServiceCategoryId =
        referenceService.resolveServiceCategoryReference(
          request.data.serviceCategoryRef,
          serviceCandidates.map(
            (candidate) => candidate.service_category_id,
          ),
          context.nowUtc,
        );
    } catch {
      throw new Task04KnownFailure("REQUEST_INVALID");
    }
  }

  const serviceFilter =
    internalServiceCategoryId === undefined
      ? transaction``
      : transaction`
          AND service.id = ${internalServiceCategoryId}
        `;
  const modalityFilter =
    request.data.modality === undefined
      ? transaction``
      : transaction`
          AND slot.modality = ${request.data.modality}
        `;
  const candidateRows = await transaction<AvailabilityRow[]>`
    SELECT
      slot.id AS slot_id,
      service.id AS service_category_id,
      service.public_label AS service_category_label,
      slot.modality,
      slot.starts_at_utc,
      slot.ends_at_utc
    FROM task04_synthetic.booking_slot AS slot
    JOIN task04_synthetic.service_category AS service
      ON service.id = slot.service_category_id
     AND service.pharmacy_id = slot.pharmacy_id
    WHERE slot.pharmacy_id = ${context.pharmacyId}
      AND service.state = 'active'
      AND slot.state = 'active'
      AND slot.modality = ANY(service.supported_modalities)
      AND slot.starts_at_utc > ${context.nowUtc}::timestamptz
      AND slot.starts_at_utc >=
        ${requestWindow.startUtc}::timestamptz
      AND slot.starts_at_utc <
        ${requestWindow.endExclusiveUtc}::timestamptz
      ${serviceFilter}
      ${modalityFilter}
      AND EXISTS (
        SELECT 1
        FROM task04_synthetic.capacity_unit AS unit
        LEFT JOIN task04_synthetic.capacity_hold AS hold
          ON hold.id = unit.capacity_hold_id
         AND hold.pharmacy_id = unit.pharmacy_id
         AND hold.slot_id = unit.slot_id
        WHERE unit.pharmacy_id = slot.pharmacy_id
          AND unit.slot_id = slot.id
          AND unit.booking_id IS NULL
          AND NOT (
            unit.capacity_hold_id IS NOT NULL
            AND hold.state = 'active'
            AND hold.expires_at_utc >
              ${context.nowUtc}::timestamptz
          )
      )
    ORDER BY
      slot.starts_at_utc,
      slot.ends_at_utc,
      service.id,
      slot.modality,
      slot.id
    LIMIT ${resolvedPageSize + 1}
    OFFSET ${offset}
  `;

  const hasNextPage = candidateRows.length > resolvedPageSize;
  const rows = candidateRows.slice(0, resolvedPageSize);
  const items: Task04AvailabilityItem[] = rows.map((row) => {
    const reference = referenceService.issue(
      {
        slotId: row.slot_id,
        serviceCategoryId: row.service_category_id,
        modality: row.modality,
      },
      context.nowUtc,
    );
    return {
      serviceCategoryRef:
        referenceService.issueServiceCategoryReference(
          row.service_category_id,
          context.nowUtc,
        ),
      serviceCategoryLabel: row.service_category_label,
      modality: row.modality,
      ...(row.modality === "in_person"
        ? {
            publicLocationLabel:
              configuration.publicLocationLabel,
          }
        : {}),
      startTimeUtc: row.starts_at_utc.toISOString(),
      endTimeUtc: row.ends_at_utc.toISOString(),
      displayTimezone: request.data.timezone,
      availabilityState: "available",
      slotReference: reference.slotReference,
      slotReferenceExpiresAtUtc: reference.expiresAtUtc,
    };
  });
  return schemas.availabilityResponseDataSchema.parse({
    items: sortTask04AvailabilityItems(items),
    ...(hasNextPage
      ? {
          nextCursor: referenceService.issueAvailabilityCursor(
            cursorFingerprint,
            offset + resolvedPageSize,
          ),
        }
      : {}),
  });
}

export async function resolveTask04PublicSlotReference(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  environment: Task04SandboxEnv,
  input: unknown,
): Promise<Readonly<{ slotId: string }>> {
  assertTask04AuthoritativeTransactionContext(transaction, context);
  const configuration = approvedEnvironmentConfiguration(
    context,
    environment,
  );
  const request = publicSlotResolutionInputSchema.safeParse(input);
  if (!request.success) {
    throw new Task04KnownFailure("SLOT_NO_LONGER_AVAILABLE");
  }
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
  const pharmacyTimezone =
    configuration.supportedDisplayTimezones[0];
  if (
    pharmacyTimezone === undefined ||
    configuration.supportedDisplayTimezones.length !== 1 ||
    context.supportedDisplayTimezones.length !== 1 ||
    context.supportedDisplayTimezones[0] !== pharmacyTimezone
  ) {
    throw new Task04KnownFailure("SLOT_NO_LONGER_AVAILABLE");
  }
  const resolutionWindow = task04PharmacyCalendarWindow({
    trustedNowUtc: context.nowUtc,
    timezone: pharmacyTimezone,
    inclusiveDays: configuration.maxAvailabilityWindowDays,
  });
  const rows = await transaction<SlotResolutionRow[]>`
    SELECT
      slot.id AS slot_id,
      slot.service_category_id,
      slot.modality
    FROM task04_synthetic.booking_slot AS slot
    JOIN task04_synthetic.service_category AS service
      ON service.id = slot.service_category_id
     AND service.pharmacy_id = slot.pharmacy_id
    WHERE slot.pharmacy_id = ${context.pharmacyId}
      AND service.state = 'active'
      AND slot.state = 'active'
      AND slot.modality = ANY(service.supported_modalities)
      AND slot.starts_at_utc > ${context.nowUtc}::timestamptz
      AND slot.starts_at_utc <
        ${resolutionWindow.endExclusiveUtc}::timestamptz
      AND EXISTS (
        SELECT 1
        FROM task04_synthetic.capacity_unit AS unit
        LEFT JOIN task04_synthetic.capacity_hold AS hold
          ON hold.id = unit.capacity_hold_id
         AND hold.pharmacy_id = unit.pharmacy_id
         AND hold.slot_id = unit.slot_id
        WHERE unit.pharmacy_id = slot.pharmacy_id
          AND unit.slot_id = slot.id
          AND unit.booking_id IS NULL
          AND NOT (
            unit.capacity_hold_id IS NOT NULL
            AND hold.state = 'active'
            AND hold.expires_at_utc >
              ${context.nowUtc}::timestamptz
          )
      )
    ORDER BY
      slot.starts_at_utc,
      slot.ends_at_utc,
      slot.id
  `;
  // Resolution is O(n) only across active candidates constrained by the
  // authoritative pharmacy and approved pharmacy-calendar window. Candidate
  // service and modality are part of the HMAC; no reversible database
  // identifier is placed in the public token.
  try {
    const resolved = referenceService.resolve(
      request.data,
      rows.map((row) => ({
        slotId: row.slot_id,
        serviceCategoryId: row.service_category_id,
        modality: row.modality,
      })),
      context.nowUtc,
    );
    return Object.freeze({ slotId: resolved.slotId });
  } catch {
    throw new Task04KnownFailure("SLOT_NO_LONGER_AVAILABLE");
  }
}
