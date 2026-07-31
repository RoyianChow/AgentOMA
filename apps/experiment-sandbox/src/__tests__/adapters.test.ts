import { describe, expect, it } from "vitest";

import {
  denyExternalEffect,
  readSyntheticEvents,
  recordSyntheticEvent,
  resetSyntheticEvents,
} from "../integrations/adapters";

describe("sandbox adapter boundary", () => {
  it("denies represented external effects before a destination exists", () => {
    expect(() => denyExternalEffect("claims", "submit-draft")).toThrow(
      "SBX_EXTERNAL_EFFECT_DENIED:claims:submit-draft",
    );
  });

  it("records metadata only and never accepts an arbitrary payload", () => {
    resetSyntheticEvents();
    const event = recordSyntheticEvent("analytics", "view-synthetic", "LOCAL_ONLY");
    expect(event).toEqual({
      adapter: "analytics",
      eventType: "view-synthetic",
      outcome: "RECORDED_SYNTHETICALLY",
      reasonCode: "LOCAL_ONLY",
    });
    expect(readSyntheticEvents()).toHaveLength(1);
    expect(() => recordSyntheticEvent("analytics", "payload with spaces", "LOCAL_ONLY")).toThrow(
      "SBX_EXTERNAL_EFFECT_DENIED:INVALID_EVENT_TYPE",
    );
  });
});
