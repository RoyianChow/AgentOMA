import { describe, it, expect } from "vitest";
import { computeRetainUntil } from "../retention";

/**
 * Pure — no DB.
 *
 * EO Notice: keep records for the LONGER of 10 years from the last service, or
 * 10 years after the individual reached (or would have reached) 18.
 */
describe("computeRetainUntil", () => {
  it("uses the age-18 branch for a minor: born 2019, service 2026 → 2047", () => {
    // The branch everyone forgets. max(2036, 2047) = 2047, NOT service+10.
    const retain = computeRetainUntil(new Date("2026-07-16"), new Date("2019-03-15"));
    expect(retain.getFullYear()).toBe(2047);
  });

  it("uses the service+10 branch for an adult: born 1980, service 2026 → 2036", () => {
    const retain = computeRetainUntil(new Date("2026-07-16"), new Date("1980-01-01"));
    expect(retain.getFullYear()).toBe(2036);
  });

  it("takes whichever branch is longer, at the boundary", () => {
    // Turns 18 in 2036 → age-18 branch gives 2046; service+10 gives 2036.
    expect(
      computeRetainUntil(new Date("2026-01-01"), new Date("2018-01-01")).getFullYear(),
    ).toBe(2046);
  });
});
