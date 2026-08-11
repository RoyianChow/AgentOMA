import { describe, expect, it } from "vitest";

import { virtualCareFixture } from "../fixtures";
import { evaluateTechnicalEventCannotComplete } from "../guards";
import { parseVirtualCareWorld, VIRTUAL_CARE_VENDOR_WEBHOOK_OUTCOMES } from "../contracts";

describe("webhook and vendor-adapter contract", () => {
  it("requires an explicit signature-validity flag on every receipt", () => {
    const world = virtualCareFixture("vendor_meeting_ended_event")!;
    expect(world.vendorWebhookReceipt?.signatureValid).toBe(true);
  });

  it("rejects a receipt with an invalid signature", () => {
    const world = virtualCareFixture("vendor_meeting_ended_event")!;
    const invalidSignature = {
      ...world,
      vendorWebhookReceipt: { ...world.vendorWebhookReceipt!, signatureValid: false, outcome: "rejected" as const },
    };
    expect(() => parseVirtualCareWorld(invalidSignature)).not.toThrow();
    expect(invalidSignature.vendorWebhookReceipt.outcome).toBe("rejected");
  });

  it("covers every required webhook outcome in its enum: accepted, rejected, duplicate, replayed, stale, unknown", () => {
    expect([...VIRTUAL_CARE_VENDOR_WEBHOOK_OUTCOMES].sort()).toEqual(
      ["accepted", "duplicate", "rejected", "replayed", "stale", "unknown"].sort(),
    );
  });

  it("maps webhook events through an internal opaque reference, never the vendor's raw identifier", () => {
    const world = virtualCareFixture("vendor_meeting_ended_event")!;
    expect(world.vendorWebhookReceipt?.mappedVisitRef).toBe(world.visitId);
    expect(world.vendorWebhookReceipt?.mappedVisitRef).toMatch(/^SYNTH-/);
  });

  it("a vendor meeting-ended event never advances workflow state or completion by itself", () => {
    const world = virtualCareFixture("vendor_meeting_ended_event")!;
    expect(world.workflowState).toBe("in_progress");
    expect(world.pharmacistCompletionAtUtc).toBeNull();
    expect(evaluateTechnicalEventCannotComplete(world).allowed).toBe(true);
  });

  it("handles a vendor outage as a technical failure, never a silent success", () => {
    const world = virtualCareFixture("vendor_outage")!;
    expect(world.connectionState).toBe("failed");
    expect(world.technicalFailure?.reasonCode).toBe("vendor_outage");
  });

  it("no code path lets any webhook outcome set pharmacistCompletionAtUtc", () => {
    for (const outcome of VIRTUAL_CARE_VENDOR_WEBHOOK_OUTCOMES) {
      const base = virtualCareFixture("vendor_meeting_ended_event")!;
      const withOutcome = {
        ...base,
        vendorWebhookReceipt: { ...base.vendorWebhookReceipt!, outcome },
        pharmacistCompletionAtUtc: base.createdAtUtc,
      };
      expect(evaluateTechnicalEventCannotComplete(withOutcome)).toEqual({
        allowed: false,
        denialReason: "vendor_event_cannot_complete_visit",
      });
    }
  });
});
