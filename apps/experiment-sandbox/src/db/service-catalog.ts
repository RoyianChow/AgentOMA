import { createHmac } from "node:crypto";
import { TextDecoder } from "node:util";

import { z } from "zod";

import {
  APPOINTMENT_MODALITIES,
  appointmentModalitySchema,
  opaqueReferenceSchema,
} from "../booking/contracts";
import {
  serializeTask04ServiceCatalogSuccess,
  task04ServiceCatalogRequestSchema,
  task04ServiceCatalogResponseDataSchema,
  TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS,
  type Task04ServiceCatalogResponseData,
  type Task04ServiceCatalogSuccess,
} from "../booking/service-catalog-contracts";
import {
  mapTask04SafeError,
  Task04KnownFailure,
  type Task04SafeError,
} from "../booking/safe-errors";
import type { Task04SandboxEnv } from "../env/server";
import {
  assertTask04AuthoritativeTransactionContext,
  createTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "./authoritative-context";
import type { Task04SandboxSql } from "./client";
import { createTask04PublicSlotReferenceService } from "./public-slot-reference";
import {
  assertTask04AuthoritativeRawRequestWithinLimit,
  classifyTask04DatabaseFailure,
  withTask04RuntimeTransaction,
  type Task04TransactionSql,
} from "./transaction";
import { task04CommandConfigurationFromEnvironment } from "../booking/config";

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const SERVICE_CATALOG_RATE_SCOPE_CONTRACT =
  "TASK04_PUBLIC_SERVICE_CATALOG_RATE_SCOPE_V1";

// Synthetic, process-local abuse guards only. They are deliberately small and
// deterministic, are not shared across processes, and are not production
// rate-limit policy.
export const TASK04_SYNTHETIC_SERVICE_CATALOG_RATE_MAX_READS = 24 as const;
export const TASK04_SYNTHETIC_SERVICE_CATALOG_RATE_WINDOW_MS =
  60_000 as const;
const TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_RATE_SCOPES = 8;

const serviceCatalogRowSchema = z
  .object({
    service_category_id: opaqueReferenceSchema,
    service_category_label: z
      .string()
      .min(1)
      .max(80)
      .refine((value) => value === value.trim()),
    supported_modalities: z
      .array(appointmentModalitySchema)
      .min(1)
      .max(APPOINTMENT_MODALITIES.length)
      .refine((values) => new Set(values).size === values.length),
  })
  .strict();

type ServiceCatalogRow = z.infer<typeof serviceCatalogRowSchema>;

export type Task04ServiceCatalogResult =
  | Task04ServiceCatalogSuccess
  | Task04SafeError;

export type Task04ServiceCatalogRateLimiter = Readonly<{
  consume: (scopeDigest: string, trustedNowUtc: string) => void;
}>;

type RateBucket = {
  windowStartedAtMilliseconds: number;
  count: number;
};

export function createTask04SyntheticServiceCatalogRateLimiter(
  options: Readonly<{
    maxReads?: number;
    windowMilliseconds?: number;
  }> = {},
): Task04ServiceCatalogRateLimiter {
  const maxReads =
    options.maxReads ??
    TASK04_SYNTHETIC_SERVICE_CATALOG_RATE_MAX_READS;
  const windowMilliseconds =
    options.windowMilliseconds ??
    TASK04_SYNTHETIC_SERVICE_CATALOG_RATE_WINDOW_MS;
  if (
    !Number.isSafeInteger(maxReads) ||
    maxReads <= 0 ||
    !Number.isSafeInteger(windowMilliseconds) ||
    windowMilliseconds <= 0
  ) {
    throw new Error("TASK04_SERVICE_CATALOG_RATE_CONFIG_DENIED");
  }
  const buckets = new Map<string, RateBucket>();

  return Object.freeze({
    consume(scopeDigest: string, trustedNowUtc: string): void {
      const trustedNowMilliseconds = Date.parse(trustedNowUtc);
      if (
        !/^[a-f0-9]{64}$/.test(scopeDigest) ||
        !Number.isFinite(trustedNowMilliseconds)
      ) {
        throw new Task04KnownFailure("TEMPORARILY_UNAVAILABLE");
      }
      for (const [key, bucket] of buckets) {
        if (
          trustedNowMilliseconds >=
          bucket.windowStartedAtMilliseconds + windowMilliseconds
        ) {
          buckets.delete(key);
        }
      }
      const existing = buckets.get(scopeDigest);
      if (
        existing !== undefined &&
        trustedNowMilliseconds < existing.windowStartedAtMilliseconds
      ) {
        throw new Task04KnownFailure("TEMPORARILY_UNAVAILABLE");
      }
      if (
        existing === undefined &&
        buckets.size >=
          TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_RATE_SCOPES
      ) {
        throw new Task04KnownFailure("TEMPORARILY_UNAVAILABLE");
      }
      const bucket =
        existing ??
        {
          windowStartedAtMilliseconds: trustedNowMilliseconds,
          count: 0,
        };
      if (bucket.count >= maxReads) {
        throw new Task04KnownFailure("RATE_LIMIT_REACHED");
      }
      bucket.count += 1;
      buckets.set(scopeDigest, bucket);
    },
  });
}

const defaultServiceCatalogRateLimiter =
  createTask04SyntheticServiceCatalogRateLimiter();

function parseServiceCatalogRequest(
  authoritativeRawRequest: Uint8Array,
  environment: Task04SandboxEnv,
) {
  const configuration =
    task04CommandConfigurationFromEnvironment(environment);
  try {
    assertTask04AuthoritativeRawRequestWithinLimit(
      authoritativeRawRequest,
      configuration.maxRequestBytes,
    );
    return task04ServiceCatalogRequestSchema.parse(
      JSON.parse(utf8Decoder.decode(authoritativeRawRequest)),
    );
  } catch {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }
}

function serviceCatalogRateScopeDigest(
  context: Task04AuthoritativeTransactionContext,
  environment: Task04SandboxEnv,
): string {
  return createHmac(
    "sha256",
    environment.publicSlotReferenceSecret,
  )
    .update(
      JSON.stringify([
        SERVICE_CATALOG_RATE_SCOPE_CONTRACT,
        context.pharmacyId,
        environment.instanceId,
        environment.approvalDecisionVersion,
        environment.expiresAt.toISOString(),
      ]),
      "utf8",
    )
    .digest("hex");
}

function canonicalModalities(
  values: ServiceCatalogRow["supported_modalities"],
) {
  return APPOINTMENT_MODALITIES.filter((modality) =>
    values.includes(modality),
  );
}

export async function queryTask04PublicServiceCatalog(
  transaction: Task04TransactionSql,
  context: Task04AuthoritativeTransactionContext,
  environment: Task04SandboxEnv,
  input: unknown,
): Promise<Task04ServiceCatalogResponseData> {
  assertTask04AuthoritativeTransactionContext(transaction, context);
  if (
    environment.pharmacyId !== context.pharmacyId ||
    !task04ServiceCatalogRequestSchema.safeParse(input).success
  ) {
    throw new Task04KnownFailure("REQUEST_INVALID");
  }

  const rows = await transaction<ServiceCatalogRow[]>`
    SELECT
      id AS service_category_id,
      public_label AS service_category_label,
      supported_modalities
    FROM task04_synthetic.service_category
    WHERE pharmacy_id = ${context.pharmacyId}
      AND state = 'active'
    ORDER BY
      public_label COLLATE "C",
      id COLLATE "C"
    LIMIT ${TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS + 1}
  `;
  if (
    rows.length >
    TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS
  ) {
    throw new Task04KnownFailure("TEMPORARILY_UNAVAILABLE");
  }

  const referenceService =
    createTask04PublicSlotReferenceService({
      pharmacyId: context.pharmacyId,
      secret: environment.publicSlotReferenceSecret,
      ttlSeconds: environment.publicSlotReferenceTtlSeconds,
      sandboxInstanceId: environment.instanceId,
      approvalDecisionVersion:
        environment.approvalDecisionVersion,
      lifecycleExpiresAtUtc:
        environment.expiresAt.toISOString(),
    });
  const items = rows.map((rowInput) => {
    const row = serviceCatalogRowSchema.safeParse(rowInput);
    if (!row.success) {
      throw new Task04KnownFailure("TEMPORARILY_UNAVAILABLE");
    }
    const supportedModalities = canonicalModalities(
      row.data.supported_modalities,
    );
    if (
      supportedModalities.length !==
      row.data.supported_modalities.length
    ) {
      throw new Task04KnownFailure("TEMPORARILY_UNAVAILABLE");
    }
    return {
      serviceCategoryRef:
        referenceService.issueServiceCategoryReference(
          row.data.service_category_id,
          context.nowUtc,
        ),
      serviceCategoryLabel: row.data.service_category_label,
      supportedModalities,
    };
  });
  const data = task04ServiceCatalogResponseDataSchema.parse({
    items,
  });
  serializeTask04ServiceCatalogSuccess({
    success: true,
    data,
  });
  return data;
}

function normalizeServiceCatalogFailure(failure: unknown): unknown {
  if (failure instanceof Task04KnownFailure) return failure;
  if (
    failure instanceof Error &&
    failure.message === "TASK04_AUTHORITATIVE_CONTEXT_DENIED"
  ) {
    return new Task04KnownFailure("FEATURE_DISABLED");
  }
  const classification = classifyTask04DatabaseFailure(failure);
  if (
    classification === "retryable_serialization" ||
    classification === "retryable_deadlock"
  ) {
    return new Task04KnownFailure("TEMPORARILY_UNAVAILABLE");
  }
  return failure;
}

export async function executeTask04PublicServiceCatalog(
  sql: Task04SandboxSql,
  environment: Task04SandboxEnv,
  authoritativeRawRequest: Uint8Array,
  options: Readonly<{
    rateLimiter?: Task04ServiceCatalogRateLimiter;
  }> = {},
): Promise<Task04ServiceCatalogResult> {
  try {
    const request = parseServiceCatalogRequest(
      authoritativeRawRequest,
      environment,
    );
    return await withTask04RuntimeTransaction(
      sql,
      "repeatable read",
      async (transaction) => {
        await transaction.unsafe("SET TRANSACTION READ ONLY");
        const context =
          await createTask04AuthoritativeTransactionContext(
            transaction,
            environment,
            task04CommandConfigurationFromEnvironment(environment),
          );
        (
          options.rateLimiter ??
          defaultServiceCatalogRateLimiter
        ).consume(
          serviceCatalogRateScopeDigest(context, environment),
          context.nowUtc,
        );
        const data = await queryTask04PublicServiceCatalog(
          transaction,
          context,
          environment,
          request,
        );
        return serializeTask04ServiceCatalogSuccess({
          success: true,
          data,
        }).response;
      },
    );
  } catch (failure) {
    return mapTask04SafeError(
      "availability:query",
      normalizeServiceCatalogFailure(failure),
    );
  }
}
