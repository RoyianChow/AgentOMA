import { describe, expect, it } from "vitest";

import {
  normalizeOntarioHealthCard,
  validateDateOfBirth,
  validateOntarioHealthCard,
} from "../patient-identity-validation";

describe("Ontario health-card validation", () => {
  it.each([
    ["1234567890", "1234567890"],
    ["1234567890a", "1234567890A"],
    ["1234567890ab", "1234567890AB"],
    ["1234 567 890 ab", "1234567890AB"],
    ["12345-67890-xy", "1234567890XY"],
  ])("accepts and normalizes %s", (input, expected) => {
    expect(validateOntarioHealthCard(input)).toEqual({ success: true, value: expected });
  });

  it("normalizes only harmless spaces, hyphens, and letter casing", () => {
    expect(normalizeOntarioHealthCard("1234 567-890 aB")).toBe("1234567890AB");
  });

  it.each([
    "AB1234567890",
    "123456789",
    "12345678901",
    "1234567890ABC",
    "1234567890A1",
    "1234567890_A",
    "",
  ])("rejects invalid value %j", (input) => {
    expect(validateOntarioHealthCard(input).success).toBe(false);
  });
});

describe("date-of-birth validation", () => {
  const today = new Date(2026, 6, 21, 12, 0, 0);

  it("accepts the native date-picker format", () => {
    const result = validateDateOfBirth("1990-05-14", today);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.toISOString()).toBe("1990-05-14T00:00:00.000Z");
    }
  });

  it("accepts a real leap day and today's date", () => {
    expect(validateDateOfBirth("2024-02-29", today).success).toBe(true);
    expect(validateDateOfBirth("2026-07-21", today).success).toBe(true);
  });

  it("applies Gregorian century leap-year rules", () => {
    expect(validateDateOfBirth("1900-02-29", today).success).toBe(false);
    expect(validateDateOfBirth("2000-02-29", today).success).toBe(true);
  });

  it("handles the calendar year boundary", () => {
    const december31 = new Date(2026, 11, 31, 12, 0, 0);

    expect(validateDateOfBirth("2026-12-31", december31).success).toBe(true);
    expect(validateDateOfBirth("2027-01-01", december31)).toEqual({
      success: false,
      error: "Date of birth cannot be in the future.",
    });
  });

  it.each(["", "19900514", "1990-5-14", "1990/05/14", "not-a-date"])(
    "rejects missing or malformed value %j",
    (input) => {
      expect(validateDateOfBirth(input, today).success).toBe(false);
    },
  );

  it.each(["2023-02-29", "2026-04-31", "2026-00-10", "0000-01-01"])(
    "rejects impossible calendar date %s",
    (input) => {
      expect(validateDateOfBirth(input, today).success).toBe(false);
    },
  );

  it("rejects a future calendar date", () => {
    expect(validateDateOfBirth("2026-07-22", today)).toEqual({
      success: false,
      error: "Date of birth cannot be in the future.",
    });
  });
});
