import { createHash } from "node:crypto";

import {
  TASK04_AVAILABILITY_PROJECTION_VERSION,
  type Task04AvailabilityRequest,
} from "../booking/availability-contracts";
import { utcInstantSchema } from "../booking/contracts";
import type { SandboxPharmacyId } from "../env/server";

export type Task04AvailabilityCachePolicy = Readonly<{
  serverCache: "eligible" | "bypass";
  ttlSeconds: number;
  httpCacheControl: "no-store";
  cacheErrors: false;
  bookingRevalidationRequired: true;
}>;

export function createTask04AvailabilityCachePolicy(input: {
  configuredTtlSeconds?: number;
  trustedNowUtc: string;
  earliestSlotReferenceExpiresAtUtc?: string;
  resultKind: "success" | "error";
  containsCorrelationReference: boolean;
}): Task04AvailabilityCachePolicy {
  const now = utcInstantSchema.safeParse(input.trustedNowUtc);
  const expiry =
    input.earliestSlotReferenceExpiresAtUtc === undefined
      ? undefined
      : utcInstantSchema.safeParse(
          input.earliestSlotReferenceExpiresAtUtc,
        );
  const configuredTtlIsValid =
    input.configuredTtlSeconds === undefined ||
    (Number.isSafeInteger(input.configuredTtlSeconds) &&
      input.configuredTtlSeconds >= 1 &&
      input.configuredTtlSeconds <= 60);
  if (
    !now.success ||
    expiry?.success === false ||
    !configuredTtlIsValid
  ) {
    throw new Error("TASK04_AVAILABILITY_CACHE_CONFIG_DENIED");
  }

  let ttlSeconds = 0;
  if (
    input.resultKind === "success" &&
    !input.containsCorrelationReference &&
    input.configuredTtlSeconds !== undefined &&
    expiry?.success
  ) {
    const expiresInSeconds = Math.floor(
      (Date.parse(expiry.data) - Date.parse(now.data)) / 1_000,
    );
    ttlSeconds = Math.max(
      0,
      Math.min(input.configuredTtlSeconds, expiresInSeconds),
    );
  }

  return Object.freeze({
    serverCache: ttlSeconds > 0 ? "eligible" : "bypass",
    ttlSeconds,
    httpCacheControl: "no-store",
    cacheErrors: false,
    bookingRevalidationRequired: true,
  });
}

export function createTask04AvailabilityCacheKey(input: {
  pharmacyId: SandboxPharmacyId;
  request: Task04AvailabilityRequest;
  resolvedPageSize: number;
}): string {
  if (
    !Number.isSafeInteger(input.resolvedPageSize) ||
    input.resolvedPageSize <= 0
  ) {
    throw new Error("TASK04_AVAILABILITY_CACHE_CONFIG_DENIED");
  }
  const projection = {
    pharmacyId: input.pharmacyId,
    serviceCategoryRef:
      input.request.serviceCategoryRef ?? "all",
    modality: input.request.modality ?? "all",
    startDate: input.request.startDate,
    endDate: input.request.endDate,
    timezone: input.request.timezone,
    cursor: input.request.cursor ?? "first",
    pageSize: input.resolvedPageSize,
    projectionVersion: TASK04_AVAILABILITY_PROJECTION_VERSION,
  };
  return createHash("sha256")
    .update(JSON.stringify(projection), "utf8")
    .digest("hex");
}
