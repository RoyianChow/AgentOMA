import { TextEncoder } from "node:util";

import type { Task04PharmacistQueueResult } from "../../db/pharmacist-queue";
import {
  executeTask04PharmacistQueue,
} from "../../db/pharmacist-queue";
import {
  createTask04SandboxSql,
  type Task04SandboxSql,
} from "../../db/client";
import { closeTask04SandboxSql } from "../../db/transaction";
import { loadTask04SandboxEnv } from "../../env/server";
import {
  mapTask04SafeError,
} from "../../booking/safe-errors";
import type {
  Task04QueueUiItem,
  Task04QueueUiResult,
} from "./queue-ui-model";

const utf8Encoder = new TextEncoder();
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

function numericDateTimePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const value = parts.find((part) => part.type === type)?.value;
  if (value === undefined || !/^\d+$/.test(value)) {
    throw new Error("TASK04_QUEUE_TIME_DISPLAY_DENIED");
  }
  return Number(value);
}

function task04ZonedDateTimeParts(
  instant: string,
  timezone: string,
): Task04ZonedDateTimeParts {
  const parsedInstant = new Date(instant);
  if (!Number.isFinite(parsedInstant.getTime())) {
    throw new Error("TASK04_QUEUE_TIME_DISPLAY_DENIED");
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
    throw new Error("TASK04_QUEUE_TIME_DISPLAY_DENIED");
  }
  return zonedParts;
}

function task04DateLabel(
  value: Task04ZonedDateTimeParts,
): string {
  return `${MONTH_LABELS[value.month - 1]} ${value.day}, ${value.year}`;
}

function task04TimeLabel(
  value: Task04ZonedDateTimeParts,
): string {
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

function task04QueueUiItem(
  item: Extract<
    Task04PharmacistQueueResult,
    { success: true }
  >["data"]["items"][number],
): Task04QueueUiItem {
  const appointmentStart = task04ZonedDateTimeParts(
    item.appointmentStartUtc,
    item.displayTimezone,
  );
  const appointmentEnd = task04ZonedDateTimeParts(
    item.appointmentEndUtc,
    item.displayTimezone,
  );
  const created = task04ZonedDateTimeParts(
    item.createdAtUtc,
    item.displayTimezone,
  );
  const appointmentEndLabel = sameTask04CalendarDate(
    appointmentStart,
    appointmentEnd,
  )
    ? task04TimeLabel(appointmentEnd)
    : `${task04DateLabel(appointmentEnd)} at ${task04TimeLabel(appointmentEnd)}`;
  return {
    appointmentDateLabel:
      task04DateLabel(appointmentStart),
    appointmentTimeRangeLabel:
      `${task04TimeLabel(appointmentStart)} to ${appointmentEndLabel}`,
    displayTimezone: item.displayTimezone,
    serviceCategoryLabel: item.serviceCategoryLabel,
    modality: item.modality,
    administrativeStatus: item.administrativeStatus,
    languagePreference: item.languagePreference,
    accessibilityPreferences: [
      ...item.accessibilityPreferences,
    ],
    source: item.source,
    createdLabel:
      `${task04DateLabel(created)} at ${task04TimeLabel(created)}`,
    operationalReason: item.operationalReason,
    actionAvailability: item.actionAvailability,
  };
}

export function task04QueueUiResult(
  result: Task04PharmacistQueueResult,
): Task04QueueUiResult {
  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message,
      },
    };
  }

  return {
    success: true,
    data: {
      items: result.data.items.map(task04QueueUiItem),
      ...(result.data.nextCursor === undefined
        ? {}
        : { nextCursor: result.data.nextCursor }),
      resultCompleteness: result.data.resultCompleteness,
      unavailableSourceCategories: [
        ...result.data.unavailableSourceCategories,
      ],
      freshnessState: result.data.freshnessState,
      generatedAtUtc: result.data.generatedAtUtc,
      refreshGuidance: result.data.refreshGuidance,
    },
  };
}

async function closeTask04QueueConnection(
  sql: Task04SandboxSql | undefined,
): Promise<unknown | undefined> {
  if (sql === undefined) return undefined;
  try {
    await closeTask04SandboxSql(sql);
    return undefined;
  } catch (failure) {
    return failure;
  }
}

export async function executeTask04QueueUiRequest(
  input: unknown,
): Promise<Task04QueueUiResult> {
  let sql: Task04SandboxSql | undefined;
  let result: Task04PharmacistQueueResult | undefined;
  let failure: unknown;

  try {
    const environment = loadTask04SandboxEnv();
    sql = createTask04SandboxSql(environment);
    const serializedRequest = JSON.stringify(input);
    if (serializedRequest === undefined) {
      throw new Error("TASK04_QUEUE_UI_REQUEST_DENIED");
    }
    result = await executeTask04PharmacistQueue(
      sql,
      environment,
      utf8Encoder.encode(serializedRequest),
    );
  } catch (caughtFailure) {
    failure = caughtFailure;
  }

  const closeFailure = await closeTask04QueueConnection(sql);
  if (failure !== undefined || closeFailure !== undefined) {
    return task04QueueUiResult(
      mapTask04SafeError(
        "queue:read",
        failure ?? closeFailure,
      ),
    );
  }
  if (result === undefined) {
    return task04QueueUiResult(
      mapTask04SafeError("queue:read", undefined),
    );
  }
  try {
    return task04QueueUiResult(result);
  } catch (formattingFailure) {
    return task04QueueUiResult(
      mapTask04SafeError(
        "queue:read",
        formattingFailure,
      ),
    );
  }
}
