export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; error: string };

const ONTARIO_HEALTH_CARD_PATTERN = /^\d{10}[A-Z]{0,2}$/;
const NATIVE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function normalizeOntarioHealthCard(value: string): string {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

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
