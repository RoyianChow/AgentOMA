export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

const ONTARIO_HEALTH_CARD_PATTERN = /^\d{10}[A-Z]{0,2}$/;
const NATIVE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Normalization is deliberately limited to comparison/storage hygiene. It is
 * not an eligibility decision and must never be used to invent a missing
 * health-card value or to emit the value in logs, URLs, or client telemetry.
 */
export function normalizeOntarioHealthCard(value: string): string {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

/**
 * The server boundary accepts only the public-service identifier shape the
 * workflow supports. Payment is still decided by HNS; local validation merely
 * prevents malformed evidence from reaching claim assembly.
 */
export function validateOntarioHealthCard(value: string): ValidationResult<string> {
  const normalized = normalizeOntarioHealthCard(value);

  if (!ONTARIO_HEALTH_CARD_PATTERN.test(normalized)) {
    return {
      success: false,
      error: "Enter 10 digits followed by an optional one- or two-letter version code.",
    };
  }

  return { success: true, value: normalized };
}

function utcCalendarDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

/**
 * Construct the date in UTC so a valid calendar date cannot shift across a
 * day boundary when the browser/server timezone differs from the patient card.
 */
export function validateDateOfBirth(
  value: string,
  today = new Date(),
): ValidationResult<Date> {
  if (!value) {
    return { success: false, error: "Date of birth is required." };
  }

  const match = NATIVE_DATE_PATTERN.exec(value);
  if (!match) {
    return { success: false, error: "Enter a valid date of birth." };
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = utcCalendarDate(year, month, day);

  const isValidCalendarDate =
    year >= 1 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValidCalendarDate) {
    return { success: false, error: "Enter a valid date of birth." };
  }

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const isFutureDate =
    year > todayYear ||
    (year === todayYear && month > todayMonth) ||
    (year === todayYear && month === todayMonth && day > todayDay);

  if (isFutureDate) {
    return { success: false, error: "Date of birth cannot be in the future." };
  }

  return { success: true, value: date };
}
