import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import postgres from "postgres";

import { task04CommandConfigurationFromEnvironment } from "../booking/config";
import {
  TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS,
} from "../booking/service-catalog-contracts";
import { queryTask04PublicAvailability } from "../db/availability";
import {
  createTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "../db/authoritative-context";
import {
  createTask04SandboxSql,
  type Task04SandboxSql,
} from "../db/client";
import {
  seedTask04Foundation,
} from "../db/fixtures";
import {
  task04PharmacyCalendarDate,
} from "../db/pharmacy-calendar";
import { createTask04PublicSlotReferenceService } from "../db/public-slot-reference";
import { TASK04_TABLES } from "../db/schema";
import {
  createTask04SyntheticServiceCatalogRateLimiter,
  executeTask04PublicServiceCatalog,
  queryTask04PublicServiceCatalog,
} from "../db/service-catalog";
import {
  closeTask04SandboxSql,
  withTask04RuntimeTransaction,
  type Task04TransactionSql,
} from "../db/transaction";
import {
  TASK04_SANDBOX_OWNER_POSTGRES_URL,
  parseTask04SandboxEnv,
  task04SyntheticEnvironmentInput,
  type Task04SandboxEnv,
} from "../env/server";

const PHARMACY_ID = "SYNTH-PHARMACY-TASK04-LOCAL";
const OTHER_PHARMACY_ID = "SYNTH-PHARMACY-TASK04-OTHER";
const FIXED_ENV_PARSE_TIME = "2026-08-04T00:00:00.000Z";
const PHARMACY_TIMEZONE = "America/Toronto";
const EMPTY_REQUEST = new TextEncoder().encode("{}");

let sql: Task04SandboxSql;
let adminSql: Task04SandboxSql;
let environment: Task04SandboxEnv;
let databaseNowUtc: string;

function configuration(
  selectedEnvironment = environment,
) {
  return task04CommandConfigurationFromEnvironment(
    selectedEnvironment,
  );
}

async function context(
  transaction: Task04TransactionSql,
  selectedEnvironment = environment,
): Promise<Task04AuthoritativeTransactionContext> {
  return createTask04AuthoritativeTransactionContext(
    transaction,
    selectedEnvironment,
    configuration(selectedEnvironment),
  );
}

async function catalog() {
  return withTask04RuntimeTransaction(
    sql,
    "repeatable read",
    async (transaction) => {
      await transaction.unsafe("SET TRANSACTION READ ONLY");
      const authoritativeContext = await context(transaction);
      return queryTask04PublicServiceCatalog(
        transaction,
        authoritativeContext,
        environment,
        {},
      );
    },
  );
}

async function executeCatalog(
  selectedEnvironment = environment,
  rateLimiter =
    createTask04SyntheticServiceCatalogRateLimiter({
      maxReads: 100,
      windowMilliseconds: 60_000,
    }),
) {
  return executeTask04PublicServiceCatalog(
    sql,
    selectedEnvironment,
    EMPTY_REQUEST,
    { rateLimiter },
  );
}

async function insertService(
  id: string,
  label: string,
  state: "active" | "unavailable" = "active",
) {
  await adminSql`
    INSERT INTO task04_synthetic.service_category (
      id,
      pharmacy_id,
      public_label,
      supported_modalities,
      requires_staff_confirmation,
      waitlist_enabled,
      state
    )
    VALUES (
      ${id},
      ${PHARMACY_ID},
      ${label},
      ARRAY['in_person', 'telephone', 'video']
        ::task04_synthetic.appointment_modality[],
      true,
      false,
      ${state}
    )
  `;
}

async function tableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of TASK04_TABLES) {
    const [row] = await adminSql.unsafe<{ count: number }[]>(
      `SELECT count(*)::integer AS count FROM task04_synthetic.${table}`,
    );
    if (row === undefined) {
      throw new Error("TASK04_TEST_TABLE_COUNT_MISSING");
    }
    counts[table] = row.count;
  }
  return counts;
}

function referenceService(
  pharmacyId = PHARMACY_ID,
  overrides: Readonly<{
    sandboxInstanceId?: string;
    lifecycleExpiresAtUtc?: string;
  }> = {},
) {
  return createTask04PublicSlotReferenceService({
    pharmacyId,
    secret: environment.publicSlotReferenceSecret,
    ttlSeconds: environment.publicSlotReferenceTtlSeconds,
    sandboxInstanceId:
      overrides.sandboxInstanceId ?? environment.instanceId,
    approvalDecisionVersion:
      environment.approvalDecisionVersion,
    lifecycleExpiresAtUtc:
      overrides.lifecycleExpiresAtUtc ??
      environment.expiresAt.toISOString(),
  });
}

beforeAll(async () => {
  environment = parseTask04SandboxEnv(
    task04SyntheticEnvironmentInput(),
    new Date(FIXED_ENV_PARSE_TIME),
  );
  adminSql = postgres(TASK04_SANDBOX_OWNER_POSTGRES_URL, {
    max: 2,
    connection: {
      application_name: "agentoma-task04-service-catalog-owner",
      search_path: "task04_synthetic, public",
    },
    onnotice: () => undefined,
  });
  sql = createTask04SandboxSql(environment);
  await Promise.all([adminSql`SELECT 1`, sql`SELECT 1`]);
});

beforeEach(async () => {
  await adminSql`TRUNCATE task04_synthetic.sandbox_scope CASCADE`;
  await seedTask04Foundation(adminSql, environment);
  const [clock] = await adminSql<{ now_utc: Date }[]>`
    SELECT transaction_timestamp() AS now_utc
  `;
  if (clock === undefined) {
    throw new Error("TASK04_TEST_DATABASE_TIME_MISSING");
  }
  databaseNowUtc = clock.now_utc.toISOString();
});

afterAll(async () => {
  await Promise.all([
    closeTask04SandboxSql(sql),
    closeTask04SandboxSql(adminSql),
  ]);
});

describe("Task 04 PostgreSQL public service catalog", () => {
  it("returns active local services in fixed label and ID order while excluding unavailable services", async () => {
    await insertService(
      "SYNTH-SERVICE-CATALOG-ALPHA-0002",
      "Alpha synthetic service",
    );
    await insertService(
      "SYNTH-SERVICE-CATALOG-ALPHA-0001",
      "Alpha synthetic service",
    );
    await insertService(
      "SYNTH-SERVICE-CATALOG-BETA-0001",
      "Beta synthetic service",
    );
    await insertService(
      "SYNTH-SERVICE-CATALOG-DISABLED-01",
      "Aardvark disabled service",
      "unavailable",
    );

    const result = await catalog();
    expect(
      result.items.map((item) => item.serviceCategoryLabel),
    ).toEqual([
      "Alpha synthetic service",
      "Alpha synthetic service",
      "Beta synthetic service",
      "Synthetic administrative service",
    ]);
    const expectedEqualLabelReferences = [
      "SYNTH-SERVICE-CATALOG-ALPHA-0001",
      "SYNTH-SERVICE-CATALOG-ALPHA-0002",
    ].map((id) =>
      referenceService().issueServiceCategoryReference(
        id,
        databaseNowUtc,
      ),
    );
    expect(
      result.items.slice(0, 2).map(
        (item) => item.serviceCategoryRef,
      ),
    ).toEqual(expectedEqualLabelReferences);
    expect(
      result.items.every(
        (item) =>
          Object.keys(item).sort().join(",") ===
          [
            "serviceCategoryLabel",
            "serviceCategoryRef",
            "supportedModalities",
          ]
            .sort()
            .join(","),
      ),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(
      /(?:SYNTH-SERVICE-CATALOG-(?:ALPHA|BETA|DISABLED)|pharmacy_id|remaining_capacity|slot_id)/i,
    );
  });

  it("excludes an uncommitted cross-pharmacy negative fixture", async () => {
    await expect(
      adminSql.begin(async (transaction) => {
        await transaction`SET CONSTRAINTS ALL DEFERRED`;
        const authoritativeContext = await context(transaction);
        await transaction`
          INSERT INTO task04_synthetic.service_category (
            id,
            pharmacy_id,
            public_label,
            supported_modalities,
            requires_staff_confirmation,
            waitlist_enabled,
            state
          )
          VALUES (
            'SYNTH-SERVICE-CATALOG-CROSS-SCOPE',
            ${OTHER_PHARMACY_ID},
            'Cross-scope synthetic service',
            ARRAY['telephone']
              ::task04_synthetic.appointment_modality[],
            false,
            false,
            'active'
          )
        `;
        const result = await queryTask04PublicServiceCatalog(
          transaction,
          authoritativeContext,
          environment,
          {},
        );
        expect(
          result.items.map(
            (item) => item.serviceCategoryLabel,
          ),
        ).not.toContain("Cross-scope synthetic service");
        throw new Error("TASK04_TEST_ROLLBACK_CROSS_SCOPE");
      }),
    ).rejects.toThrow("TASK04_TEST_ROLLBACK_CROSS_SCOPE");
  });

  it("keeps a service with no slots visible and returns empty availability for its reference", async () => {
    const serviceId = "SYNTH-SERVICE-CATALOG-NO-SLOTS-01";
    await insertService(
      serviceId,
      "Synthetic service without slots",
    );
    const catalogResult = await catalog();
    const catalogItem = catalogResult.items.find(
      (item) =>
        item.serviceCategoryLabel ===
        "Synthetic service without slots",
    );
    expect(catalogItem).toBeDefined();

    const availabilityResult =
      await withTask04RuntimeTransaction(
        sql,
        "repeatable read",
        async (transaction) => {
          await transaction.unsafe("SET TRANSACTION READ ONLY");
          const authoritativeContext = await context(transaction);
          const date = task04PharmacyCalendarDate(
            authoritativeContext.nowUtc,
            PHARMACY_TIMEZONE,
          );
          return queryTask04PublicAvailability(
            transaction,
            authoritativeContext,
            environment,
            {
              serviceCategoryRef:
                catalogItem!.serviceCategoryRef,
              modality: "telephone",
              startDate: date,
              endDate: date,
              timezone: PHARMACY_TIMEZONE,
              pageSize: 10,
            },
          );
        },
      );
    expect(availabilityResult).toEqual({ items: [] });
  });

  it("rejects tampered, cross-pharmacy, and prior-lifecycle service references generically in availability", async () => {
    const item = (await catalog()).items[0]!;
    const lastCharacter = item.serviceCategoryRef.at(-1);
    const tampered = `${item.serviceCategoryRef.slice(0, -1)}${
      lastCharacter === "A" ? "B" : "A"
    }`;
    const crossPharmacy =
      referenceService(OTHER_PHARMACY_ID)
        .issueServiceCategoryReference(
          "SYNTH-SERVICE-TASK04-0001",
          databaseNowUtc,
        );
    const priorLifecycle =
      referenceService(PHARMACY_ID, {
        sandboxInstanceId: "SYNTH-TASK04-PRIOR",
      }).issueServiceCategoryReference(
        "SYNTH-SERVICE-TASK04-0001",
        databaseNowUtc,
      );

    for (const serviceCategoryRef of [
      tampered,
      crossPharmacy,
      priorLifecycle,
    ]) {
      await expect(
        withTask04RuntimeTransaction(
          sql,
          "repeatable read",
          async (transaction) => {
            await transaction.unsafe(
              "SET TRANSACTION READ ONLY",
            );
            const authoritativeContext = await context(transaction);
            const date = task04PharmacyCalendarDate(
              authoritativeContext.nowUtc,
              PHARMACY_TIMEZONE,
            );
            return queryTask04PublicAvailability(
              transaction,
              authoritativeContext,
              environment,
              {
                serviceCategoryRef,
                startDate: date,
                endDate: date,
                timezone: PHARMACY_TIMEZONE,
                pageSize: 10,
              },
            );
          },
        ),
      ).rejects.toMatchObject({
        code: "REQUEST_INVALID",
        message: "TASK04_COMMAND_FAILED",
      });
    }
  });

  it("performs no mutation across Task 04 runtime or evidence tables", async () => {
    const before = await tableCounts();
    const result = await executeCatalog();
    const after = await tableCounts();

    expect(result.success).toBe(true);
    expect(after).toEqual(before);
  });

  it("fails approval and lifecycle expiry closed", async () => {
    expect(() =>
      parseTask04SandboxEnv(
        task04SyntheticEnvironmentInput(),
        new Date("2026-08-06T00:00:00.000Z"),
        { allowExpired: true },
      ),
    ).toThrow(
      "SANDBOX_CONFIG_DENIED:TASK04_APPROVAL_EXPIRED",
    );

    const expiredEnvironment: Task04SandboxEnv = {
      ...environment,
      expiresAt: new Date(
        Date.parse(databaseNowUtc) - 1,
      ),
    };
    await expect(executeCatalog(expiredEnvironment)).resolves.toEqual({
      success: false,
      error: {
        code: "FEATURE_DISABLED",
        message: "This service is currently unavailable.",
      },
    });
  });

  it("fails contradictory active service data closed", async () => {
    await adminSql`
      UPDATE task04_synthetic.service_category
      SET public_label = '   '
      WHERE pharmacy_id = ${PHARMACY_ID}
    `;
    await expect(executeCatalog()).resolves.toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
  });

  it("fails safely instead of truncating more than the bounded maximum", async () => {
    for (
      let index = 0;
      index < TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS;
      index += 1
    ) {
      await insertService(
        `SYNTH-SERVICE-CATALOG-OVERFLOW-${String(index).padStart(2, "0")}`,
        `Overflow synthetic service ${String(index).padStart(2, "0")}`,
      );
    }
    const result = await executeCatalog();

    expect(result).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
    if (result.success) {
      expect(result.data.items).not.toHaveLength(
        TASK04_SYNTHETIC_SERVICE_CATALOG_MAX_ITEMS,
      );
    }
  });

  it("enforces the server-owned process-local rate guard using trusted database time", async () => {
    const limiter =
      createTask04SyntheticServiceCatalogRateLimiter({
        maxReads: 1,
        windowMilliseconds: 60_000,
      });
    const first = await executeCatalog(environment, limiter);
    const second = await executeCatalog(environment, limiter);

    expect(first.success).toBe(true);
    expect(second).toEqual({
      success: false,
      error: {
        code: "RATE_LIMIT_REACHED",
        message:
          "Too many requests were made. Please try again later.",
      },
    });
  });
});
