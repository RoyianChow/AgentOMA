import { describe, expect, it } from "vitest";

import {
  INTAKE_UNAVAILABLE_MESSAGE,
  parseIntakeSessionId,
} from "../intake-availability";

describe("intake availability boundary", () => {
  it("accepts only a canonical UUID for the server-owned intake identifier", () => {
    expect(parseIntakeSessionId("00000000-0000-4000-8000-000000000001")).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(parseIntakeSessionId("not-an-intake-id")).toBeNull();
    expect(parseIntakeSessionId("")).toBeNull();
  });

  it("uses one non-enumerating message for every unavailable handoff", () => {
    expect(INTAKE_UNAVAILABLE_MESSAGE).not.toMatch(
      /exists|not found|expired|consumed|completed|other pharmacy/i,
    );
  });
});
