import { describe, expect, it, vi } from "vitest";

import {
  TASK04_SAFE_ERROR_MESSAGES,
  Task04KnownFailure,
  mapTask04SafeError,
} from "../booking/safe-errors";
import {
  TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS,
  type Task04ServiceCatalogSuccess,
} from "../booking/service-catalog-contracts";
import { createTask04ServiceCatalogGetHandler } from "../app/api/service-catalog/route";
import {
  createTask04SyntheticServiceCatalogRateLimiter,
  type Task04ServiceCatalogResult,
} from "../db/service-catalog";
import {
  parseTask04SandboxEnv,
  task04SyntheticEnvironmentInput,
} from "../env/server";

const environment = parseTask04SandboxEnv(
  task04SyntheticEnvironmentInput(),
  new Date("2026-08-04T12:00:00.000Z"),
);
const successResult: Task04ServiceCatalogSuccess = {
  success: true,
  data: {
    items: [
      {
        serviceCategoryRef: "R".repeat(43),
        serviceCategoryLabel: "Synthetic administrative service",
        supportedModalities: ["in_person", "telephone", "video"],
      },
    ],
  },
};

function request(path = "/api/service-catalog") {
  return new Request(`${environment.origin}${path}`);
}

function handler(result: Task04ServiceCatalogResult) {
  const readCatalog = vi.fn(async () => result);
  return {
    readCatalog,
    GET: createTask04ServiceCatalogGetHandler({
      loadEnvironment: () => environment,
      readCatalog,
    }),
  };
}

describe("Task 04 public service-catalog endpoint", () => {
  it("returns the minimized catalog with no-store", async () => {
    const boundary = handler(successResult);
    const response = await boundary.GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(await response.json()).toEqual(successResult);
    expect(boundary.readCatalog).toHaveBeenCalledOnce();
    expect(boundary.readCatalog).toHaveBeenCalledWith(environment);
  });

  it.each([
    "?pharmacyId=SYNTH-PHARMACY-CALLER",
    "?pageSize=1",
    "?sort=label",
    "?actorId=SYNTH-ACTOR-CALLER",
  ])(
    "rejects unsupported request-controlled fields generically: %s",
    async (query) => {
      const boundary = handler(successResult);
      const response = await boundary.GET(
        request(`/api/service-catalog${query}`),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: {
          message: TASK04_SAFE_ERROR_MESSAGES.REQUEST_INVALID,
        },
      });
      expect(boundary.readCatalog).not.toHaveBeenCalled();
    },
  );

  it("rejects a non-sandbox origin without exposing scope details", async () => {
    const boundary = handler(successResult);
    const response = await boundary.GET(
      new Request("http://localhost:3101/api/service-catalog"),
    );
    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).toContain(
      TASK04_SAFE_ERROR_MESSAGES.REQUEST_INVALID,
    );
    expect(body).not.toMatch(/(?:origin|pharmacy|tenant|localhost)/i);
    expect(boundary.readCatalog).not.toHaveBeenCalled();
  });

  it("removes internal codes, correlations, stacks, and SQL details from failures", async () => {
    const boundary = handler(
      mapTask04SafeError(
        "availability:query",
        new Error("relation secret_table failed"),
        "SYNTH-CORR-REFERENCE-0001",
      ),
    );
    const response = await boundary.GET(request());
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({
      success: false,
      error: {
        message:
          TASK04_SAFE_ERROR_MESSAGES.TEMPORARILY_UNAVAILABLE,
      },
    });
    expect(body).not.toMatch(
      /(?:TEMPORARILY_UNAVAILABLE|correlation|stack|sql|relation|secret_table)/i,
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("enforces the process-local catalog read limit deterministically", async () => {
    const limiter =
      createTask04SyntheticServiceCatalogRateLimiter({
        maxReads: 2,
        windowMilliseconds: 1_000,
      });
    const scopeDigest = "a".repeat(64);
    limiter.consume(scopeDigest, "2026-08-04T12:00:00.000Z");
    limiter.consume(scopeDigest, "2026-08-04T12:00:00.500Z");
    let limitedFailure: unknown;
    try {
      limiter.consume(
        scopeDigest,
        "2026-08-04T12:00:00.999Z",
      );
    } catch (failure) {
      limitedFailure = failure;
    }
    expect(limitedFailure).toMatchObject({
      code: "RATE_LIMIT_REACHED",
      message: "TASK04_COMMAND_FAILED",
    });

    const boundary = handler(
      mapTask04SafeError(
        "availability:query",
        limitedFailure,
      ),
    );
    const response = await boundary.GET(request());
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        message: TASK04_SAFE_ERROR_MESSAGES.RATE_LIMIT_REACHED,
      },
    });

    expect(() =>
      limiter.consume(
        scopeDigest,
        "2026-08-04T12:00:01.000Z",
      ),
    ).not.toThrow();
  });

  it("fails a response-byte overflow closed at the endpoint", async () => {
    const oversizedResult: Task04ServiceCatalogSuccess = {
      success: true,
      data: {
        items: Array.from(
          {
            length:
              TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS,
          },
          (_, index) => ({
            serviceCategoryRef: `${String(index).padStart(3, "0")}${"R".repeat(157)}`,
            serviceCategoryLabel: "L".repeat(80),
            supportedModalities: [
              "in_person",
              "telephone",
              "video",
            ],
          }),
        ),
      },
    };
    const response = await handler(oversizedResult).GET(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        message:
          TASK04_SAFE_ERROR_MESSAGES.TEMPORARILY_UNAVAILABLE,
      },
    });
  });

  it("uses a generic safe response for an unexpected boundary failure", async () => {
    const GET = createTask04ServiceCatalogGetHandler({
      loadEnvironment: () => environment,
      readCatalog: async () => {
        throw new Task04KnownFailure("FEATURE_DISABLED");
      },
    });
    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        message:
          TASK04_SAFE_ERROR_MESSAGES.TEMPORARILY_UNAVAILABLE,
      },
    });
  });
});
