import { createHmac } from "node:crypto";
import { TextEncoder } from "node:util";

import {
  ACCESSIBILITY_PREFERENCES,
  createTask04BookingSchemas,
  idempotencyKeySchema,
} from "../../booking/contracts";
import {
  createTask04AvailabilitySchemas,
  type Task04AvailabilityResponseData,
} from "../../booking/availability-contracts";
import {
  task04CommandConfigurationFromEnvironment,
} from "../../booking/config";
import {
  mapTask04SafeError,
  Task04KnownFailure,
  TASK04_SAFE_ERROR_MESSAGES,
  type Task04SafeErrorBoundary,
} from "../../booking/safe-errors";
import {
  task04ServiceCatalogSuccessSchema,
} from "../../booking/service-catalog-contracts";
import {
  createTask04AuthoritativeTransactionContext,
} from "../../db/authoritative-context";
import { queryTask04PublicAvailability } from "../../db/availability";
import {
  executeTask04BookingCreate,
  type Task04BookingCreateCommandResult,
} from "../../db/booking-create";
import {
  createTask04SandboxSql,
  type Task04SandboxSql,
} from "../../db/client";
import {
  executeTask04PublicServiceCatalog,
  type Task04ServiceCatalogResult,
} from "../../db/service-catalog";
import {
  closeTask04SandboxSql,
  withTask04RuntimeTransaction,
} from "../../db/transaction";
import {
  loadTask04SandboxEnv,
  type Task04SandboxEnv,
} from "../../env/server";
import { TASK04_SYNTHETIC_REFERENCES } from "../../fixtures/synthetic";
import type {
  Task04BookAvailabilityActionInput,
  Task04BookAvailabilityActionResult,
  Task04BookAvailabilityItem,
  Task04BookCatalogResult,
  Task04BookCreateActionInput,
  Task04BookCreateActionResult,
  Task04BookResult,
} from "./book-ui-model";

const utf8Encoder = new TextEncoder();
const EMPTY_CATALOG_REQUEST = utf8Encoder.encode("{}");
const PUBLIC_BOOKING_IDEMPOTENCY_CONTRACT =
  "TASK04_PUBLIC_BOOKING_UI_IDEMPOTENCY_V1";
const PUBLIC_AVAILABILITY_UI_FIELDS = new Set([
  "serviceCategoryRef",
  "modality",
  "startDate",
  "endDate",
]);
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type Task04ZonedDateTimeParts = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}>;

type Task04PublicBookServerDependencies = Readonly<{
  loadEnvironment: () => Task04SandboxEnv;
  createSql: (environment: Task04SandboxEnv) => Task04SandboxSql;
  closeSql: (sql: Task04SandboxSql) => Promise<void>;
  readCatalog: (
    sql: Task04SandboxSql,
    environment: Task04SandboxEnv,
  ) => Promise<Task04ServiceCatalogResult>;
  readAvailability: (
    sql: Task04SandboxSql,
    environment: Task04SandboxEnv,
    input: unknown,
  ) => Promise<Task04AvailabilityResponseData>;
  createBooking: (
    sql: Task04SandboxSql,
    environment: Task04SandboxEnv,
    authoritativeRawRequest: Uint8Array,
  ) => Promise<Task04BookingCreateCommandResult>;
}>;

function numericDateTimePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const value = parts.find((part) => part.type === type)?.value;
  if (value === undefined || !/^\d+$/.test(value)) {
    throw new Error("TASK04_PUBLIC_BOOK_TIME_DISPLAY_DENIED");
  }
  return Number(value);
}

function task04ZonedDateTimeParts(
  instant: string,
  timezone: string,
): Task04ZonedDateTimeParts {
  const parsedInstant = new Date(instant);
  if (!Number.isFinite(parsedInstant.getTime())) {
    throw new Error("TASK04_PUBLIC_BOOK_TIME_DISPLAY_DENIED");
  }
  const parts = new Intl.DateTimeFormat("en-CA-u-nu-latn", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(parsedInstant);
  const zonedParts = {
    year: numericDateTimePart(parts, "year"),
    month: numericDateTimePart(parts, "month"),
    day: numericDateTimePart(parts, "day"),
    hour: numericDateTimePart(parts, "hour"),
    minute: numericDateTimePart(parts, "minute"),
  };
  if (
    zonedParts.year < 1 ||
    zonedParts.month < 1 ||
    zonedParts.month > 12 ||
    zonedParts.day < 1 ||
    zonedParts.day > 31 ||
    zonedParts.hour < 0 ||
    zonedParts.hour > 23 ||
    zonedParts.minute < 0 ||
    zonedParts.minute > 59
  ) {
    throw new Error("TASK04_PUBLIC_BOOK_TIME_DISPLAY_DENIED");
  }
  return zonedParts;
}

function task04DateLabel(value: Task04ZonedDateTimeParts): string {
  return `${MONTH_LABELS[value.month - 1]} ${value.day}, ${value.year}`;
}

function task04TimeLabel(value: Task04ZonedDateTimeParts): string {
  const period = value.hour < 12 ? "AM" : "PM";
  const hour = value.hour % 12 || 12;
  return `${hour}:${String(value.minute).padStart(2, "0")} ${period}`;
}

function sameTask04CalendarDate(
  left: Task04ZonedDateTimeParts,
  right: Task04ZonedDateTimeParts,
): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  );
}

export function task04PublicBookAppointmentLabels(
  startTimeUtc: string,
  endTimeUtc: string,
  timezone: string,
): Readonly<{
  appointmentDateLabel: string;
  appointmentTimeRangeLabel: string;
}> {
  const start = task04ZonedDateTimeParts(startTimeUtc, timezone);
  const end = task04ZonedDateTimeParts(endTimeUtc, timezone);
  const endLabel = sameTask04CalendarDate(start, end)
    ? task04TimeLabel(end)
    : `${task04DateLabel(end)} at ${task04TimeLabel(end)}`;
  return {
    appointmentDateLabel: task04DateLabel(start),
    appointmentTimeRangeLabel:
      `${task04TimeLabel(start)} to ${endLabel}`,
  };
}

export function task04PublicBookDeadlineLabel(
  instantUtc: string,
  timezone: string,
): string {
  const deadline = task04ZonedDateTimeParts(instantUtc, timezone);
  return `${task04DateLabel(deadline)} at ${task04TimeLabel(deadline)}`;
}

function genericUiFailure(
  kind: "validation" | "stale_availability" | "unavailable",
) {
  return {
    success: false as const,
    kind,
    message:
      kind === "validation"
        ? TASK04_SAFE_ERROR_MESSAGES.REQUEST_INVALID
        : kind === "stale_availability"
          ? TASK04_SAFE_ERROR_MESSAGES.SLOT_NO_LONGER_AVAILABLE
          : TASK04_SAFE_ERROR_MESSAGES.TEMPORARILY_UNAVAILABLE,
  };
}

function uiFailureFromBoundary(
  boundary: Task04SafeErrorBoundary,
  failure: unknown,
) {
  const safeFailure = mapTask04SafeError(boundary, failure);
  return safeFailure.error.code === "REQUEST_INVALID"
    ? genericUiFailure("validation")
    : safeFailure.error.code === "SLOT_NO_LONGER_AVAILABLE"
      ? genericUiFailure("stale_availability")
      : genericUiFailure("unavailable");
}

async function closeConnection(
  dependencies: Task04PublicBookServerDependencies,
  sql: Task04SandboxSql | undefined,
): Promise<unknown | undefined> {
  if (sql === undefined) return undefined;
  try {
    await dependencies.closeSql(sql);
    return undefined;
  } catch (failure) {
    return failure;
  }
}

async function withConnection<T>(
  dependencies: Task04PublicBookServerDependencies,
  environment: Task04SandboxEnv,
  operation: (sql: Task04SandboxSql) => Promise<T>,
): Promise<T> {
  let sql: Task04SandboxSql | undefined;
  let result: T | undefined;
  let failure: unknown;
  try {
    sql = dependencies.createSql(environment);
    result = await operation(sql);
  } catch (caughtFailure) {
    failure = caughtFailure;
  }
  const closeFailure = await closeConnection(dependencies, sql);
  if (
    failure !== undefined ||
    closeFailure !== undefined ||
    result === undefined
  ) {
    throw failure ?? closeFailure ??
      new Error("TASK04_PUBLIC_BOOK_RESULT_UNAVAILABLE");
  }
  return result;
}

function authoritativeTimezone(
  environment: Task04SandboxEnv,
): string {
  const timezone = environment.supportedDisplayTimezones[0];
  if (
    timezone === undefined ||
    environment.supportedDisplayTimezones.length !== 1
  ) {
    throw new Task04KnownFailure("FEATURE_DISABLED");
  }
  return timezone;
}

function parseAvailabilityUiRequest(
  environment: Task04SandboxEnv,
  input: unknown,
) {
  const schemas = createTask04AvailabilitySchemas({
    maxPageSize: environment.maxPageSize,
    maxAvailabilityWindowDays:
      environment.maxAvailabilityWindowDays,
    publicLocationLabel: environment.publicLocationLabel,
    supportedDisplayTimezones:
      environment.supportedDisplayTimezones,
  });
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).some(
      (key) => !PUBLIC_AVAILABILITY_UI_FIELDS.has(key),
    )
  ) {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
  const parsed = schemas.availabilityRequestSchema.safeParse({
    ...input,
    timezone: authoritativeTimezone(environment),
    pageSize: environment.maxPageSize,
  });
  if (
    !parsed.success ||
    parsed.data.serviceCategoryRef === undefined ||
    parsed.data.modality === undefined
  ) {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
  return parsed.data;
}

function availabilityUiItems(
  environment: Task04SandboxEnv,
  request: ReturnType<typeof parseAvailabilityUiRequest>,
  result: Task04AvailabilityResponseData,
): readonly Task04BookAvailabilityItem[] {
  const schemas = createTask04AvailabilitySchemas({
    maxPageSize: environment.maxPageSize,
    maxAvailabilityWindowDays:
      environment.maxAvailabilityWindowDays,
    publicLocationLabel: environment.publicLocationLabel,
    supportedDisplayTimezones:
      environment.supportedDisplayTimezones,
  });
  const parsed = schemas.availabilityResponseDataSchema.parse(result);
  return parsed.items.flatMap((item) => {
    const isBookable =
      item.availabilityState === "available" ||
      item.availabilityState === "limited";
    if (!isBookable) return [];
    if (
      item.slotReference === undefined ||
      item.serviceCategoryRef !== request.serviceCategoryRef ||
      item.modality !== request.modality
    ) {
      throw new Error("TASK04_PUBLIC_BOOK_PROJECTION_DENIED");
    }
    return [
      {
        ...task04PublicBookAppointmentLabels(
          item.startTimeUtc,
          item.endTimeUtc,
          item.displayTimezone,
        ),
        displayTimezone: item.displayTimezone,
        serviceCategoryLabel: item.serviceCategoryLabel,
        modality: item.modality,
        publicLocationLabel: environment.publicLocationLabel,
        slotReference: item.slotReference,
      },
    ];
  });
}

function parseBookingUiRequest(
  environment: Task04SandboxEnv,
  input: unknown,
) {
  const schemas = createTask04BookingSchemas({
    maxAccessibilitySelections:
      environment.maxAccessibilitySelections,
    supportedDisplayTimezones:
      environment.supportedDisplayTimezones,
  });
  const uiSchema = schemas.bookingCreateRequestSchema.omit({
    syntheticContactReference: true,
    idempotencyKey: true,
  });
  const parsed = uiSchema.safeParse(input);
  if (!parsed.success) {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
  const accessibilityPreferences =
    ACCESSIBILITY_PREFERENCES.filter((preference) =>
      parsed.data.accessibilityPreferences.includes(preference),
    );
  const authoritativeProjection = {
    ...parsed.data,
    accessibilityPreferences,
    syntheticContactReference:
      TASK04_SYNTHETIC_REFERENCES.contact,
  };
  const idempotencyKey = idempotencyKeySchema.parse(
    createHmac(
      "sha256",
      environment.publicSlotReferenceSecret,
    )
      .update(
        JSON.stringify([
          PUBLIC_BOOKING_IDEMPOTENCY_CONTRACT,
          environment.instanceId,
          environment.pharmacyId,
          authoritativeProjection,
        ]),
        "utf8",
      )
      .digest("base64url"),
  );
  const authoritativeRequest =
    schemas.bookingCreateRequestSchema.safeParse({
    ...authoritativeProjection,
    idempotencyKey,
  });
  if (!authoritativeRequest.success) {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
  return authoritativeRequest.data;
}

function bookingUiResult(
  environment: Task04SandboxEnv,
  result: Task04BookingCreateCommandResult,
): Task04BookCreateActionResult {
  if (!result.success) {
    return result.error.code === "SLOT_NO_LONGER_AVAILABLE"
      ? genericUiFailure("stale_availability")
      : result.error.code === "REQUEST_INVALID"
        ? genericUiFailure("validation")
        : genericUiFailure("unavailable");
  }
  const schemas = createTask04BookingSchemas({
    maxAccessibilitySelections:
      environment.maxAccessibilitySelections,
    supportedDisplayTimezones:
      environment.supportedDisplayTimezones,
  });
  const parsed = schemas.bookingCreateResponseSchema.parse(result);
  const data = parsed.data;
  const projected: Task04BookResult = {
    status: data.status,
    ...task04PublicBookAppointmentLabels(
      data.startTimeUtc,
      data.endTimeUtc,
      data.displayTimezone,
    ),
    displayTimezone: data.displayTimezone,
    serviceCategoryLabel: data.serviceCategoryLabel,
    modality: data.modality,
    publicLocationLabel: environment.publicLocationLabel,
    ...(data.confirmationExpiresAtUtc === undefined
      ? {}
      : {
          confirmationDeadlineLabel:
            task04PublicBookDeadlineLabel(
              data.confirmationExpiresAtUtc,
              data.displayTimezone,
            ),
        }),
  };
  return {
    success: true,
    data: projected,
  };
}

async function readAvailabilityFromPostgres(
  sql: Task04SandboxSql,
  environment: Task04SandboxEnv,
  input: unknown,
): Promise<Task04AvailabilityResponseData> {
  return withTask04RuntimeTransaction(
    sql,
    "repeatable read",
    async (transaction) => {
      await transaction.unsafe("SET TRANSACTION READ ONLY");
      const context =
        await createTask04AuthoritativeTransactionContext(
          transaction,
          environment,
          task04CommandConfigurationFromEnvironment(environment),
        );
      return queryTask04PublicAvailability(
        transaction,
        context,
        environment,
        input,
      );
    },
  );
}

const defaultDependencies: Task04PublicBookServerDependencies =
  Object.freeze({
    loadEnvironment: () => loadTask04SandboxEnv(),
    createSql: createTask04SandboxSql,
    closeSql: closeTask04SandboxSql,
    readCatalog: (sql, environment) =>
      executeTask04PublicServiceCatalog(
        sql,
        environment,
        EMPTY_CATALOG_REQUEST,
      ),
    readAvailability: readAvailabilityFromPostgres,
    createBooking: executeTask04BookingCreate,
  });

export function createTask04PublicBookServer(
  dependencies: Task04PublicBookServerDependencies =
    defaultDependencies,
) {
  return Object.freeze({
    async loadCatalog(): Promise<Task04BookCatalogResult> {
      try {
        const environment = dependencies.loadEnvironment();
        const result = await withConnection(
          dependencies,
          environment,
          (sql) => dependencies.readCatalog(sql, environment),
        );
        const parsed =
          task04ServiceCatalogSuccessSchema.safeParse(result);
        if (!parsed.success) {
          return {
            success: false,
            message:
              TASK04_SAFE_ERROR_MESSAGES.TEMPORARILY_UNAVAILABLE,
          };
        }
        return {
          success: true,
          items: parsed.data.data.items.map((item) => ({
            serviceCategoryRef: item.serviceCategoryRef,
            serviceCategoryLabel: item.serviceCategoryLabel,
            supportedModalities: [...item.supportedModalities],
          })),
        };
      } catch {
        return {
          success: false,
          message:
            TASK04_SAFE_ERROR_MESSAGES.TEMPORARILY_UNAVAILABLE,
        };
      }
    },

    async searchAvailability(
      input: unknown,
    ): Promise<Task04BookAvailabilityActionResult> {
      let environment: Task04SandboxEnv;
      let request: ReturnType<typeof parseAvailabilityUiRequest>;
      try {
        environment = dependencies.loadEnvironment();
        request = parseAvailabilityUiRequest(environment, input);
        const result = await withConnection(
          dependencies,
          environment,
          (sql) =>
            dependencies.readAvailability(
              sql,
              environment,
              request,
            ),
        );
        return {
          success: true,
          items: availabilityUiItems(
            environment,
            request,
            result,
          ),
        };
      } catch (failure) {
        return uiFailureFromBoundary(
          "availability:query",
          failure,
        );
      }
    },

    async createBooking(
      input: unknown,
    ): Promise<Task04BookCreateActionResult> {
      try {
        const environment = dependencies.loadEnvironment();
        const request = parseBookingUiRequest(environment, input);
        const result = await withConnection(
          dependencies,
          environment,
          (sql) =>
            dependencies.createBooking(
              sql,
              environment,
              utf8Encoder.encode(JSON.stringify(request)),
            ),
        );
        return bookingUiResult(environment, result);
      } catch (failure) {
        return uiFailureFromBoundary("booking:create", failure);
      }
    },
  });
}

const task04PublicBookServer = createTask04PublicBookServer();

export function loadTask04PublicBookCatalog(): Promise<Task04BookCatalogResult> {
  return task04PublicBookServer.loadCatalog();
}

export function searchTask04PublicBookAvailability(
  input: Task04BookAvailabilityActionInput,
): Promise<Task04BookAvailabilityActionResult> {
  return task04PublicBookServer.searchAvailability(input);
}

export function createTask04PublicBooking(
  input: Task04BookCreateActionInput,
): Promise<Task04BookCreateActionResult> {
  return task04PublicBookServer.createBooking(input);
}
