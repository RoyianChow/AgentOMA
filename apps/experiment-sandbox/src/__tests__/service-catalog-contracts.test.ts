import { describe, expect, it } from "vitest";

import {
  serializeTask04ServiceCatalogSuccess,
  task04ServiceCatalogRequestSchema,
  task04ServiceCatalogSuccessSchema,
  TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS,
  type Task04ServiceCatalogSuccess,
} from "../booking/service-catalog-contracts";

const SERVICE_REFERENCE = "S".repeat(43);

function validResponse(): Task04ServiceCatalogSuccess {
  return {
    success: true,
    data: {
      items: [
        {
          serviceCategoryRef: SERVICE_REFERENCE,
          serviceCategoryLabel:
            "Synthetic administrative service",
          supportedModalities: [
            "in_person",
            "telephone",
            "video",
          ],
        },
      ],
    },
  };
}

describe("Task 04 public service-catalog contract", () => {
  it("accepts only an empty strict request", () => {
    expect(task04ServiceCatalogRequestSchema.parse({})).toEqual(
      {},
    );
    expect(
      task04ServiceCatalogRequestSchema.safeParse({
        pharmacyId: "SYNTH-PHARMACY-CALLER-CONTROLLED",
      }).success,
    ).toBe(false);
    expect(
      task04ServiceCatalogRequestSchema.safeParse({
        pageSize: 1,
      }).success,
    ).toBe(false);
  });

  it("accepts the exact minimized response", () => {
    const response = validResponse();
    expect(task04ServiceCatalogSuccessSchema.parse(response)).toEqual(
      response,
    );
    expect(
      serializeTask04ServiceCatalogSuccess(response).response,
    ).toEqual(response);
  });

  it.each([
    ["database ID", { serviceCategoryId: "SYNTH-INTERNAL-ID" }],
    ["pharmacy scope", { pharmacyId: "SYNTH-PHARMACY-INTERNAL" }],
    ["capacity", { remainingCapacity: 2 }],
    ["slot data", { slotReference: "R".repeat(43) }],
    ["internal timestamp", { transitionedAtUtc: "2026-08-04T00:00:00.000Z" }],
  ])("rejects an internal %s response field", (_label, field) => {
    const response = validResponse();
    expect(
      task04ServiceCatalogSuccessSchema.safeParse({
        ...response,
        data: {
          items: [
            {
              ...response.data.items[0],
              ...field,
            },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it("rejects invalid, duplicate, or noncanonical modalities", () => {
    for (const supportedModalities of [
      ["mail"],
      ["telephone", "telephone"],
      ["video", "in_person"],
    ]) {
      expect(
        task04ServiceCatalogSuccessSchema.safeParse({
          success: true,
          data: {
            items: [
              {
                serviceCategoryRef: SERVICE_REFERENCE,
                serviceCategoryLabel: "Synthetic service",
                supportedModalities,
              },
            ],
          },
        }).success,
      ).toBe(false);
    }
  });

  it("rejects an oversized serialized response without truncation", () => {
    const items = Array.from(
      { length: TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS },
      (_, index) => ({
        serviceCategoryRef: `${String(index).padStart(3, "0")}${"R".repeat(157)}`,
        serviceCategoryLabel: "L".repeat(80),
        supportedModalities: [
          "in_person",
          "telephone",
          "video",
        ] as const,
      }),
    );
    expect(
      task04ServiceCatalogSuccessSchema.safeParse({
        success: true,
        data: { items },
      }).success,
    ).toBe(true);
    expect(() =>
      serializeTask04ServiceCatalogSuccess({
        success: true,
        data: { items },
      }),
    ).toThrow("TASK04_SERVICE_CATALOG_RESPONSE_DENIED");
  });
});
