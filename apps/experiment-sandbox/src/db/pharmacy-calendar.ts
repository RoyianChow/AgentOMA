import { task04CalendarDateSchema } from "../booking/availability-contracts";
import {
  task04IanaTimezoneIsValid,
  utcInstantSchema,
} from "../booking/contracts";

const OFFSET_SAMPLE_HOURS = [-36, -24, -12, 0, 12, 24, 36] as const;

type LocalDateTimeParts = Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}>;

export type Task04PharmacyCalendarWindow = Readonly<{
  startDate: string;
  endExclusiveDate: string;
  startUtc: string;
  endExclusiveUtc: string;
}>;

function calendarDenied(): never {
  throw new Error("TASK04_PHARMACY_CALENDAR_DENIED");
}

function validatedTimezone(timezone: string): string {
  if (
    timezone.length === 0 ||
    timezone.length > 64 ||
    !task04IanaTimezoneIsValid(timezone)
  ) {
    return calendarDenied();
  }
  return timezone;
}

function localParts(
  instant: Date,
  timezone: string,
): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  if (
    !Number.isSafeInteger(values.year) ||
    !Number.isSafeInteger(values.month) ||
    !Number.isSafeInteger(values.day) ||
    !Number.isSafeInteger(values.hour) ||
    !Number.isSafeInteger(values.minute) ||
    !Number.isSafeInteger(values.second)
  ) {
    return calendarDenied();
  }
  return {
    year: values.year!,
    month: values.month!,
    day: values.day!,
    hour: values.hour!,
    minute: values.minute!,
    second: values.second!,
  };
}

function offsetMilliseconds(instant: Date, timezone: string): number {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  })
    .formatToParts(instant)
    .find((candidate) => candidate.type === "timeZoneName")?.value;
  if (part === "GMT" || part === "UTC") return 0;
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(part ?? "");
  if (!match) return calendarDenied();
  const sign = match[1] === "+" ? 1 : -1;
  return (
    sign *
    (Number(match[2]) * 60 + Number(match[3])) *
    60_000
  );
}

function calendarDateComponents(value: string) {
  const parsed = task04CalendarDateSchema.safeParse(value);
  if (!parsed.success) return calendarDenied();
  const [year, month, day] = parsed.data.split("-").map(Number);
  return {
    value: parsed.data,
    year: year!,
    month: month!,
    day: day!,
  };
}

function utcMidnightMilliseconds(input: {
  year: number;
  month: number;
  day: number;
}): number {
  const result = new Date(0);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCFullYear(input.year, input.month - 1, input.day);
  return result.getTime();
}

export function task04AddCalendarDays(
  calendarDate: string,
  days: number,
): string {
  const date = calendarDateComponents(calendarDate);
  if (!Number.isSafeInteger(days) || days < 0 || days > 366) {
    return calendarDenied();
  }
  const result = new Date(utcMidnightMilliseconds(date));
  result.setUTCDate(result.getUTCDate() + days);
  const value = [
    result.getUTCFullYear().toString().padStart(4, "0"),
    (result.getUTCMonth() + 1).toString().padStart(2, "0"),
    result.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
  return task04CalendarDateSchema.parse(value);
}

export function task04PharmacyCalendarDate(
  trustedNowUtc: string,
  timezoneInput: string,
): string {
  const trustedNow = utcInstantSchema.safeParse(trustedNowUtc);
  const timezone = validatedTimezone(timezoneInput);
  if (!trustedNow.success) return calendarDenied();
  const parts = localParts(new Date(trustedNow.data), timezone);
  return [
    parts.year.toString().padStart(4, "0"),
    parts.month.toString().padStart(2, "0"),
    parts.day.toString().padStart(2, "0"),
  ].join("-");
}

export function task04CalendarDateStartUtc(
  calendarDate: string,
  timezoneInput: string,
): string {
  const date = calendarDateComponents(calendarDate);
  const timezone = validatedTimezone(timezoneInput);
  const naiveMidnight = utcMidnightMilliseconds(date);
  const offsets = new Set(
    OFFSET_SAMPLE_HOURS.map((hours) =>
      offsetMilliseconds(
        new Date(naiveMidnight + hours * 3_600_000),
        timezone,
      ),
    ),
  );
  const matchingInstants = [...offsets]
    .map((offset) => naiveMidnight - offset)
    .filter((milliseconds) => {
      const parts = localParts(new Date(milliseconds), timezone);
      return (
        parts.year === date.year &&
        parts.month === date.month &&
        parts.day === date.day &&
        parts.hour === 0 &&
        parts.minute === 0 &&
        parts.second === 0
      );
    });
  if (new Set(matchingInstants).size !== 1) {
    return calendarDenied();
  }
  return new Date(matchingInstants[0]!).toISOString();
}

export function task04CalendarDateRangeUtc(input: {
  startDate: string;
  endDate: string;
  timezone: string;
}): Task04PharmacyCalendarWindow {
  const startDate = calendarDateComponents(input.startDate).value;
  const endDate = calendarDateComponents(input.endDate).value;
  const endExclusiveDate = task04AddCalendarDays(endDate, 1);
  return Object.freeze({
    startDate,
    endExclusiveDate,
    startUtc: task04CalendarDateStartUtc(startDate, input.timezone),
    endExclusiveUtc: task04CalendarDateStartUtc(
      endExclusiveDate,
      input.timezone,
    ),
  });
}

export function task04PharmacyCalendarWindow(input: {
  trustedNowUtc: string;
  timezone: string;
  inclusiveDays: number;
}): Task04PharmacyCalendarWindow {
  if (
    !Number.isSafeInteger(input.inclusiveDays) ||
    input.inclusiveDays <= 0 ||
    input.inclusiveDays > 366
  ) {
    return calendarDenied();
  }
  const startDate = task04PharmacyCalendarDate(
    input.trustedNowUtc,
    input.timezone,
  );
  const endExclusiveDate = task04AddCalendarDays(
    startDate,
    input.inclusiveDays,
  );
  return Object.freeze({
    startDate,
    endExclusiveDate,
    startUtc: task04CalendarDateStartUtc(startDate, input.timezone),
    endExclusiveUtc: task04CalendarDateStartUtc(
      endExclusiveDate,
      input.timezone,
    ),
  });
}
