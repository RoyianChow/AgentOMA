import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import postgres from "postgres";

import {
  authorizeStaffBookingConfirmation,
  type Task04AuthorizationResult,
} from "../booking/authorization";
import { parseTask04CommandConfiguration } from "../booking/config";
import {
  digestTask04IdempotencyKey,
  type Task04SupportedIdempotencyInput,
} from "../booking/idempotency";
import {
  Task04KnownFailure,
  mapTask04SafeError,
} from "../booking/safe-errors";
import {
  createTask04AuthoritativeTransactionContext,
  type Task04AuthoritativeTransactionContext,
} from "../db/authoritative-context";
import { insertTask04SyntheticAudit } from "../db/audit";
import {
  createTask04SandboxSql,
  type Task04SandboxSql,
} from "../db/client";
import {
  TASK04_FOUNDATION_FIXTURES,
  seedTask04Foundation,
} from "../db/fixtures";
import {
  beginTask04IdempotentCommand,
  completeTask04IdempotentCommand,
} from "../db/idempotency";
import { authorizeReusableBookingCapability } from "../db/management-capability";
import { insertTask04OutboxEvent } from "../db/outbox";
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
import { TASK04_SYNTHETIC_REFERENCES } from "../fixtures/synthetic";

const PHARMACY_ID = "SYNTH-PHARMACY-TASK04-LOCAL";
const OTHER_PHARMACY_ID = "SYNTH-PHARMACY-TASK04-OTHER";
const FIXED_ENV_PARSE_TIME = "2026-08-04T12:00:00.000Z";

const COMMAND_CONFIGURATION = parseTask04CommandConfiguration({
  TASK04_PENDING_HOLD_MINUTES: 12,
  TASK04_PUBLIC_LOCATION_LABEL: "Synthetic local test location",
  TASK04_PUBLIC_SLOT_REFERENCE_TTL_SECONDS: 90,
  TASK04_MAX_REQUEST_BYTES: 4_096,
  TASK04_MAX_PAGE_SIZE: 10,
  TASK04_MAX_AVAILABILITY_WINDOW_DAYS: 14,
  TASK04_SUPPORTED_DISPLAY_TIMEZONES: ["America/Toronto"],
});

const ACKNOWLEDGEMENTS = Object.freeze({
  administrativeOnly: true,
  notMonitored: true,
  noMedicalDetails: true,
  notClinicalAssessment: true,
  statusControlsConfirmation: true,
});

const IDEMPOTENCY_INPUT = Object.freeze({
  actorReference: TASK04_SYNTHETIC_REFERENCES.patient,
  operation: "booking:create" as const,
  resourceScopeReference: "SYNTH-SLOT-PUBLIC-REF-0001",
  request: {
    slotReference: "SYNTH-SLOT-PUBLIC-REF-0001",
    languagePreference: "english" as const,
    accessibilityPreferences: ["none"] as ["none"],
    syntheticContactReference: TASK04_SYNTHETIC_REFERENCES.contact,
    administrativeAcknowledgements: ACKNOWLEDGEMENTS,
    idempotencyKey: "SYNTH-IDEMPOTENCY-KEY-0001",
  },
}) satisfies Task04SupportedIdempotencyInput;

const BOOKING_CREATE_RESPONSE = Object.freeze({
  bookingReference: "SYNTH-BOOKING-REFERENCE-0001",
  status: "confirmed" as const,
  serviceCategoryLabel: "Synthetic administrative service",
  modality: "in_person" as const,
  startTimeUtc: "2026-08-04T14:00:00.000Z",
  endTimeUtc: "2026-08-04T14:30:00.000Z",
  displayTimezone: "America/Toronto",
  managementCapability: {
    capabilityReference: "SYNTH-CAPABILITY-REFERENCE-0001",
    usageMode: "reusable" as const,
    permittedActions: ["booking:view" as const],
    expiresAtUtc: "2026-08-05T00:00:00.000Z",
  },
  syntheticNotice:
    "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY" as const,
});

const CONFIRM_IDEMPOTENCY_INPUT = Object.freeze({
  actorReference: TASK04_SYNTHETIC_REFERENCES.pharmacist,
  operation: "booking:confirm" as const,
  resourceScopeReference:
    "SYNTH-BOOKING-TASK04-CONFIRM-0001",
  request: {
    bookingReference: "SYNTH-BOOKING-TASK04-CONFIRM-0001",
    expectedAggregateVersion: 1,
    idempotencyKey: "SYNTH-IDEMPOTENCY-CONFIRM-0001",
  },
}) satisfies Task04SupportedIdempotencyInput;

const CONFIRM_RESPONSE = Object.freeze({
  bookingReference: "SYNTH-BOOKING-TASK04-CONFIRM-0001",
  status: "confirmed" as const,
  holdStatus: "consumed" as const,
});

let sql: Task04SandboxSql;
let secondSql: Task04SandboxSql;
let verificationSql: Task04SandboxSql;
let adminSql: Task04SandboxSql;
let environment: Task04SandboxEnv;

function task04Environment() {
  return parseTask04SandboxEnv(
    task04SyntheticEnvironmentInput(),
    new Date(FIXED_ENV_PARSE_TIME),
  );
}

async function authoritativeContext(
  transaction: Task04TransactionSql,
  selectedEnvironment = environment,
) {
  return createTask04AuthoritativeTransactionContext(
    transaction,
    selectedEnvironment,
    COMMAND_CONFIGURATION,
  );
}

function createBarrier(participantCount: number) {
  let arrivals = 0;
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    arrivals += 1;
    if (arrivals === participantCount) release();
    await released;
  };
}

async function waitForTask04BackendBlock(
  observer: Task04SandboxSql,
  backendPid: number,
): Promise<readonly number[]> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const [row] = await observer<{ blocking_pids: number[] }[]>`
      SELECT pg_blocking_pids(${backendPid}) AS blocking_pids
    `;
    if (row && row.blocking_pids.length > 0) {
      return row.blocking_pids;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });
  }
  throw new Error("TASK04_TEST_EXPECTED_DATABASE_LOCK");
}

beforeAll(async () => {
  environment = task04Environment();
  adminSql = postgres(TASK04_SANDBOX_OWNER_POSTGRES_URL, {
    max: 3,
    connect_timeout: 5,
    idle_timeout: 5,
    connection: {
      application_name:
        "agentoma-task04-booking-tests-owner",
      search_path: "task04_synthetic, public",
    },
    onnotice: () => undefined,
  });
  sql = createTask04SandboxSql(environment);
  secondSql = createTask04SandboxSql(environment);
  verificationSql = createTask04SandboxSql(environment);
  await Promise.all([
    adminSql`SELECT 1`,
    sql`SELECT 1`,
    secondSql`SELECT 1`,
    verificationSql`SELECT 1`,
  ]);
});

beforeEach(async () => {
  await adminSql`TRUNCATE task04_synthetic.sandbox_scope CASCADE`;
  await seedTask04Foundation(adminSql, environment);
});

afterAll(async () => {
  await Promise.all([
    closeTask04SandboxSql(sql),
    closeTask04SandboxSql(secondSql),
    closeTask04SandboxSql(verificationSql),
    closeTask04SandboxSql(adminSql),
  ]);
});

async function createConfirmedBookingWithCapabilities(): Promise<void> {
  await withTask04RuntimeTransaction(
    sql,
    "serializable",
    async (transaction) => {
      await authoritativeContext(transaction);
      await transaction`
        INSERT INTO task04_synthetic.booking (
          id,
          pharmacy_id,
          service_category_id,
          slot_id,
          modality,
          actor_reference,
          subject_reference,
          state,
          safe_reason_code,
          created_at_utc,
          transitioned_at_utc
        )
        VALUES (
          'SYNTH-BOOKING-TASK04-CAPABILITY',
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          'in_person',
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'confirmed',
          'IMMEDIATE_CONFIRMATION',
          '2026-08-01T12:00:00.000Z',
          '2026-08-01T12:00:00.000Z'
        )
      `;
      await transaction`
        UPDATE task04_synthetic.capacity_unit
        SET booking_id = 'SYNTH-BOOKING-TASK04-CAPABILITY',
            aggregate_version = aggregate_version + 1,
            transitioned_at_utc = transaction_timestamp()
        WHERE id = ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0]}
          AND pharmacy_id = ${PHARMACY_ID}
      `;
      await transaction`
        INSERT INTO task04_synthetic.management_credential (
          id,
          pharmacy_id,
          usage_mode,
          capability_reference,
          booking_id,
          permitted_actions,
          actor_reference,
          subject_reference,
          server_session_binding,
          state,
          issued_at_utc,
          expires_at_utc,
          revoked_at_utc,
          expired_at_utc
        )
        VALUES
          (
            'SYNTH-CREDENTIAL-TASK04-ACTIVE',
            ${PHARMACY_ID},
            'reusable',
            'SYNTH-CAPABILITY-REFERENCE-0001',
            'SYNTH-BOOKING-TASK04-CAPABILITY',
            ARRAY['booking:view', 'booking:cancel'],
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            'SYNTH-SESSION-TASK04-0001',
            'active',
            '2026-08-01T12:00:00.000Z',
            '2026-08-05T00:00:00.000Z',
            NULL,
            NULL
          ),
          (
            'SYNTH-CREDENTIAL-TASK04-EXPIRED',
            ${PHARMACY_ID},
            'reusable',
            'SYNTH-CAPABILITY-EXPIRED-0001',
            'SYNTH-BOOKING-TASK04-CAPABILITY',
            ARRAY['booking:view'],
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            'SYNTH-SESSION-TASK04-0001',
            'expired',
            '2026-07-31T12:00:00.000Z',
            '2026-08-01T12:00:00.000Z',
            NULL,
            '2026-08-01T12:00:00.000Z'
          ),
          (
            'SYNTH-CREDENTIAL-TASK04-REVOKED',
            ${PHARMACY_ID},
            'reusable',
            'SYNTH-CAPABILITY-REVOKED-0001',
            'SYNTH-BOOKING-TASK04-CAPABILITY',
            ARRAY['booking:view'],
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            'SYNTH-SESSION-TASK04-0001',
            'revoked',
            '2026-08-01T12:00:00.000Z',
            '2026-08-05T00:00:00.000Z',
            '2026-08-02T00:00:00.000Z',
            NULL
          ),
          (
            'SYNTH-CREDENTIAL-TASK04-HISTORY',
            ${PHARMACY_ID},
            'reusable',
            'SYNTH-CAPABILITY-AMBIGUOUS-0001',
            'SYNTH-BOOKING-TASK04-CAPABILITY',
            ARRAY['booking:view'],
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            'SYNTH-SESSION-TASK04-0001',
            'revoked',
            '2026-08-01T12:00:00.000Z',
            '2026-08-05T00:00:00.000Z',
            '2026-08-02T00:00:00.000Z',
            NULL
          ),
          (
            'SYNTH-CREDENTIAL-TASK04-CURRENT',
            ${PHARMACY_ID},
            'reusable',
            'SYNTH-CAPABILITY-AMBIGUOUS-0001',
            'SYNTH-BOOKING-TASK04-CAPABILITY',
            ARRAY['booking:view'],
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            'SYNTH-SESSION-TASK04-0001',
            'active',
            '2026-08-02T12:00:00.000Z',
            '2026-08-05T00:00:00.000Z',
            NULL,
            NULL
          )
      `;
    },
  );
}

function capabilityRequest(
  capabilityReference = "SYNTH-CAPABILITY-REFERENCE-0001",
) {
  return {
    capabilityReference,
    bookingReference: "SYNTH-BOOKING-TASK04-CAPABILITY",
    requiredAction: "booking:view",
    actorType: "synthetic_patient",
    actorReference: TASK04_SYNTHETIC_REFERENCES.patient,
    subjectReference: TASK04_SYNTHETIC_REFERENCES.patient,
    subjectType: "synthetic_patient",
    serverSessionBinding: "SYNTH-SESSION-TASK04-0001",
  };
}

function bookingCreatedOutboxInput(eventId: string) {
  return {
    eventId,
    eventType: "booking.created",
    eventSchemaVersion: 1,
    aggregateType: "booking",
    aggregateId: "SYNTH-BOOKING-TASK04-INFRA-0001",
    aggregateVersion: 1,
    actorType: "synthetic_patient",
    safeReasonCode: "BOOKING_REQUESTED",
    payload: {
      resultingState: "confirmed",
      modality: "in_person",
      startTimeUtc: "2026-08-04T14:00:00.000Z",
      endTimeUtc: "2026-08-04T14:30:00.000Z",
    },
  };
}

describe("Task 04 authoritative transaction context", () => {
  it("binds trusted database time, singleton scope, and serializable isolation", async () => {
    const result = await withTask04RuntimeTransaction(
      sql,
      "serializable",
      async (transaction) => {
        const context = await authoritativeContext(transaction);
        const [database] = await transaction<{
          now_utc: Date;
          transaction_isolation: string;
        }[]>`
          SELECT
            transaction_timestamp() AS now_utc,
            current_setting('transaction_isolation')
              AS transaction_isolation
        `;
        return {
          context,
          databaseNow: database!.now_utc.toISOString(),
          isolation: database!.transaction_isolation,
        };
      },
    );
    expect(result.context.nowUtc).toBe(result.databaseNow);
    expect(result.context.pharmacyId).toBe(PHARMACY_ID);
    expect(result.isolation).toBe("serializable");
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        (transaction) =>
          beginTask04IdempotentCommand(
            transaction,
            result.context,
            IDEMPOTENCY_INPUT,
          ),
      ),
    ).rejects.toThrow("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  });

  it("fails closed for expired approval, version mismatch, and pharmacy mismatch", async () => {
    const expiredInput = {
      ...task04SyntheticEnvironmentInput(),
      SANDBOX_BUILT_AT: "2026-07-30T00:00:00.000Z",
      SANDBOX_EXPIRES_AT: "2026-08-01T00:00:00.000Z",
    };
    const expiredEnvironment = parseTask04SandboxEnv(
      expiredInput,
      new Date(FIXED_ENV_PARSE_TIME),
      { allowExpired: true },
    );
    const otherPharmacyEnvironment = parseTask04SandboxEnv(
      {
        ...task04SyntheticEnvironmentInput(),
        TASK04_SANDBOX_PHARMACY_ID: OTHER_PHARMACY_ID,
      },
      new Date(FIXED_ENV_PARSE_TIME),
    );
    const wrongVersionEnvironment = {
      ...environment,
      approvalDecisionVersion: "UNAPPROVED_VERSION",
    } as unknown as Task04SandboxEnv;

    for (const deniedEnvironment of [
      expiredEnvironment,
      otherPharmacyEnvironment,
      wrongVersionEnvironment,
    ]) {
      await expect(
        withTask04RuntimeTransaction(
          sql,
          "read committed",
          (transaction) =>
            authoritativeContext(
              transaction,
              deniedEnvironment,
            ),
        ),
      ).rejects.toThrow("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
    }
  });

  it("requires the recognized context for every protected helper", async () => {
    const forged = {
      pharmacyId: PHARMACY_ID,
      nowUtc: "2026-08-06T00:00:00.000Z",
      approvalDecisionVersion: "Task 04 synthetic sandbox scope v1",
      maxAccessibilitySelections: 3,
      maxPageSize: 10,
      supportedDisplayTimezones: ["America/Toronto"],
    } as unknown as Task04AuthoritativeTransactionContext;

    await withTask04RuntimeTransaction(
      sql,
      "serializable",
      async (transaction) => {
        await expect(
          beginTask04IdempotentCommand(
            transaction,
            forged,
            IDEMPOTENCY_INPUT,
          ),
        ).rejects.toThrow("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
        await expect(
          completeTask04IdempotentCommand(
            transaction,
            forged,
            "SYNTH-IDEM-FORGED-CONTEXT-0001",
            "booking:confirm",
            CONFIRM_RESPONSE,
          ),
        ).rejects.toThrow("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
        await expect(
          insertTask04OutboxEvent(
            transaction,
            forged,
            bookingCreatedOutboxInput(
              "SYNTH-EVENT-FORGED-CONTEXT-0001",
            ),
          ),
        ).rejects.toThrow("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
        await expect(
          insertTask04SyntheticAudit(transaction, forged, {}),
        ).rejects.toThrow("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
        await expect(
          authorizeReusableBookingCapability(
            transaction,
            forged,
            capabilityRequest(),
            "read_only",
          ),
        ).rejects.toThrow("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
      },
    );
  });

  it("uses the shared connection cleanup helper", async () => {
    const disposable = createTask04SandboxSql(environment);
    await disposable`SELECT 1`;
    await closeTask04SandboxSql(disposable);
    await expect(disposable`SELECT 1`).rejects.toThrow();
  });
});

describe("Task 04 PostgreSQL idempotency", () => {
  it("stores and replays a complete validated operation response", async () => {
    const first = await withTask04RuntimeTransaction(
      sql,
      "serializable",
      async (transaction) => {
        const context = await authoritativeContext(transaction);
        const started = await beginTask04IdempotentCommand(
          transaction,
          context,
          IDEMPOTENCY_INPUT,
        );
        expect(started.disposition).toBe("execute");
        await completeTask04IdempotentCommand(
          transaction,
          context,
          started.receiptId,
          "booking:create",
          BOOKING_CREATE_RESPONSE,
        );
        return started;
      },
    );

    const replay = await withTask04RuntimeTransaction(
      sql,
      "serializable",
      async (transaction) => {
        const context = await authoritativeContext(transaction);
        return beginTask04IdempotentCommand(
          transaction,
          context,
          IDEMPOTENCY_INPUT,
        );
      },
    );
    expect(replay).toEqual({
      disposition: "replay",
      receiptId: first.receiptId,
      safeResult: BOOKING_CREATE_RESPONSE,
    });
  });

  it("rejects malformed and unsafe response snapshots before storage and after loading", async () => {
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "serializable",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          const started = await beginTask04IdempotentCommand(
            transaction,
            context,
            CONFIRM_IDEMPOTENCY_INPUT,
          );
          await completeTask04IdempotentCommand(
            transaction,
            context,
            started.receiptId,
            "booking:confirm",
            { ...CONFIRM_RESPONSE, internalId: "SYNTH-INTERNAL" },
          );
        },
      ),
    ).rejects.toMatchObject({
      code: "TEMPORARILY_UNAVAILABLE",
    });

    let receiptId = "";
    await withTask04RuntimeTransaction(
      sql,
      "serializable",
      async (transaction) => {
        const context = await authoritativeContext(transaction);
        const started = await beginTask04IdempotentCommand(
          transaction,
          context,
          CONFIRM_IDEMPOTENCY_INPUT,
        );
        receiptId = started.receiptId;
        await completeTask04IdempotentCommand(
          transaction,
          context,
          receiptId,
          "booking:confirm",
          CONFIRM_RESPONSE,
        );
      },
    );
    await adminSql`
      UPDATE task04_synthetic.idempotency_record
      SET safe_response_snapshot =
        '{"status":"confirmed"}'::jsonb
      WHERE id = ${receiptId}
    `;
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "serializable",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          return beginTask04IdempotentCommand(
            transaction,
            context,
            CONFIRM_IDEMPOTENCY_INPUT,
          );
        },
      ),
    ).rejects.toMatchObject({
      code: "TEMPORARILY_UNAVAILABLE",
    });
  });

  it("returns the canonical conflict for a changed command and rolls back acquisition", async () => {
    await withTask04RuntimeTransaction(
      sql,
      "serializable",
      async (transaction) => {
        const context = await authoritativeContext(transaction);
        const started = await beginTask04IdempotentCommand(
          transaction,
          context,
          IDEMPOTENCY_INPUT,
        );
        await completeTask04IdempotentCommand(
          transaction,
          context,
          started.receiptId,
          "booking:create",
          BOOKING_CREATE_RESPONSE,
        );
      },
    );

    const changedInput = {
      ...IDEMPOTENCY_INPUT,
      request: {
        ...IDEMPOTENCY_INPUT.request,
        languagePreference: "french" as const,
      },
    };
    let conflict: unknown;
    try {
      await withTask04RuntimeTransaction(
        sql,
        "serializable",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          return beginTask04IdempotentCommand(
            transaction,
            context,
            changedInput,
          );
        },
      );
    } catch (error) {
      conflict = error;
    }
    expect(
      mapTask04SafeError("booking:create", conflict),
    ).toEqual({
      success: false,
      error: {
        code: "IDEMPOTENCY_KEY_CONFLICT",
        message: "This request key cannot be reused.",
      },
    });

    await expect(
      withTask04RuntimeTransaction(
        sql,
        "serializable",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          await beginTask04IdempotentCommand(transaction, context, {
            ...IDEMPOTENCY_INPUT,
            request: {
              ...IDEMPOTENCY_INPUT.request,
              idempotencyKey:
                "SYNTH-IDEMPOTENCY-KEY-ROLLBACK",
            },
          });
          throw new Error("SYNTHETIC_TEST_ROLLBACK");
        },
      ),
    ).rejects.toThrow("SYNTHETIC_TEST_ROLLBACK");

    const [rollbackCount] = await sql<{ count: number }[]>`
      SELECT count(*)::integer AS count
      FROM task04_synthetic.idempotency_record
      WHERE idempotency_key_digest =
        ${digestTask04IdempotencyKey(
          "SYNTH-IDEMPOTENCY-KEY-ROLLBACK",
        )}
    `;
    expect(rollbackCount!.count).toBe(0);
  });

  it("returns REQUEST_IN_PROGRESS for an existing active execution", async () => {
    await withTask04RuntimeTransaction(
      sql,
      "serializable",
      async (transaction) => {
        const context = await authoritativeContext(transaction);
        await beginTask04IdempotentCommand(
          transaction,
          context,
          CONFIRM_IDEMPOTENCY_INPUT,
        );
      },
    );

    await expect(
      withTask04RuntimeTransaction(
        secondSql,
        "serializable",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          return beginTask04IdempotentCommand(
            transaction,
            context,
            CONFIRM_IDEMPOTENCY_INPUT,
          );
        },
      ),
    ).rejects.toMatchObject({ code: "REQUEST_IN_PROGRESS" });
  });

  it("serializes genuinely concurrent identical commands to one effect", async () => {
    const barrier = createBarrier(2);
    const run = async (connection: Task04SandboxSql) =>
      withTask04RuntimeTransaction(
        connection,
        "read committed",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          await barrier();
          const result = await beginTask04IdempotentCommand(
            transaction,
            context,
            CONFIRM_IDEMPOTENCY_INPUT,
          );
          if (result.disposition === "execute") {
            await completeTask04IdempotentCommand(
              transaction,
              context,
              result.receiptId,
              "booking:confirm",
              CONFIRM_RESPONSE,
            );
          }
          return result.disposition;
        },
      );

    const results = await Promise.all([run(sql), run(secondSql)]);
    expect(results.sort()).toEqual(["execute", "replay"]);
    const [count] = await verificationSql<{ count: number }[]>`
      SELECT count(*)::integer AS count
      FROM task04_synthetic.idempotency_record
    `;
    expect(count!.count).toBe(1);
  });

  it("allows one winner and one changed-payload conflict under genuine concurrency", async () => {
    const barrier = createBarrier(2);
    const run = async (
      connection: Task04SandboxSql,
      expectedAggregateVersion: number,
    ) =>
      withTask04RuntimeTransaction(
        connection,
        "read committed",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          await barrier();
          const input = {
            ...CONFIRM_IDEMPOTENCY_INPUT,
            request: {
              ...CONFIRM_IDEMPOTENCY_INPUT.request,
              expectedAggregateVersion,
            },
          };
          const result = await beginTask04IdempotentCommand(
            transaction,
            context,
            input,
          );
          if (result.disposition === "execute") {
            await completeTask04IdempotentCommand(
              transaction,
              context,
              result.receiptId,
              "booking:confirm",
              CONFIRM_RESPONSE,
            );
          }
          return result.disposition;
        },
      );

    const results = await Promise.allSettled([
      run(sql, 1),
      run(secondSql, 2),
    ]);
    expect(
      results.filter(({ status }) => status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find(
      ({ status }) => status === "rejected",
    ) as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({
      code: "IDEMPOTENCY_KEY_CONFLICT",
    });
  });
});

describe("Task 04 reusable capability authorization", () => {
  it("enforces active, expired, revoked, binding, scope, and ambiguity cases", async () => {
    await createConfirmedBookingWithCapabilities();
    const authorize = (
      request: Record<string, unknown>,
    ): Promise<Task04AuthorizationResult> =>
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          return authorizeReusableBookingCapability(
            transaction,
            context,
            request,
            "read_only",
          );
        },
      );

    expect(await authorize(capabilityRequest())).toEqual({
      authorized: true,
      reasonCode: "AUTHORIZED",
    });
    expect(
      await authorize(
        capabilityRequest("SYNTH-CAPABILITY-EXPIRED-0001"),
      ),
    ).toEqual({
      authorized: false,
      reasonCode: "LINK_EXPIRED",
    });

    const genericDenials = await Promise.all([
      authorize(
        capabilityRequest("SYNTH-CAPABILITY-REVOKED-0001"),
      ),
      authorize({
        ...capabilityRequest(),
        actorReference: "SYNTH-PATIENT-TASK04-OTHER",
      }),
      authorize({
        ...capabilityRequest(),
        subjectReference: "SYNTH-PATIENT-TASK04-OTHER",
      }),
      authorize({
        ...capabilityRequest(),
        requiredAction: "booking:reschedule",
      }),
      authorize({
        ...capabilityRequest(),
        serverSessionBinding: "SYNTH-SESSION-TASK04-OTHER",
      }),
      authorize(
        capabilityRequest("SYNTH-CAPABILITY-UNKNOWN-0001"),
      ),
      authorize(
        capabilityRequest("SYNTH-CAPABILITY-AMBIGUOUS-0001"),
      ),
    ]);
    expect(
      genericDenials.every(
        (result) =>
          !result.authorized &&
          result.reasonCode === "NOT_AUTHORIZED",
      ),
    ).toBe(true);
    const externalDenials = genericDenials.map((result) =>
      mapTask04SafeError(
        "booking:view",
        new Task04KnownFailure(
          result.authorized
            ? "TEMPORARILY_UNAVAILABLE"
            : result.reasonCode,
        ),
      ),
    );
    expect(
      new Set(externalDenials.map((result) => JSON.stringify(result)))
        .size,
    ).toBe(1);
  });

  it("fails authoritative context creation for a wrong-pharmacy environment", async () => {
    const wrongPharmacyEnvironment = parseTask04SandboxEnv(
      {
        ...task04SyntheticEnvironmentInput(),
        TASK04_SANDBOX_PHARMACY_ID: OTHER_PHARMACY_ID,
      },
      new Date(FIXED_ENV_PARSE_TIME),
    );
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        (transaction) =>
          authoritativeContext(
            transaction,
            wrongPharmacyEnvironment,
          ),
      ),
    ).rejects.toThrow("TASK04_AUTHORITATIVE_CONTEXT_DENIED");
  });

  it("keeps a mutation capability locked against concurrent revocation", async () => {
    await createConfirmedBookingWithCapabilities();
    let releaseLock!: () => void;
    let reportLocked!: () => void;
    let reportRevocationBackend!: (backendPid: number) => void;
    let abortRaceTransactions = false;
    const lockReleased = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const rowLocked = new Promise<void>((resolve) => {
      reportLocked = resolve;
    });
    const revocationBackendReady = new Promise<number>((resolve) => {
      reportRevocationBackend = resolve;
    });

    const protectedOperation = withTask04RuntimeTransaction(
      sql,
      "serializable",
      async (transaction) => {
        const context = await authoritativeContext(transaction);
        const result = await authorizeReusableBookingCapability(
          transaction,
          context,
          capabilityRequest(),
          "mutation",
        );
        reportLocked();
        await lockReleased;
        if (abortRaceTransactions) {
          throw new Error("TASK04_TEST_ABORTED");
        }
        return result;
      },
    );
    await rowLocked;

    const revocationOperation = withTask04RuntimeTransaction(
      secondSql,
      "serializable",
      async (transaction) => {
        const [backend] = await transaction<
          { backend_pid: number }[]
        >`
          SELECT pg_backend_pid() AS backend_pid
        `;
        if (!backend) {
          throw new Error("TASK04_TEST_BACKEND_PID_UNAVAILABLE");
        }
        reportRevocationBackend(backend.backend_pid);
        const updated = await transaction<{ state: string }[]>`
          UPDATE task04_synthetic.management_credential
          SET state = 'revoked',
              revoked_at_utc = statement_timestamp()
          WHERE id = 'SYNTH-CREDENTIAL-TASK04-ACTIVE'
            AND state = 'active'
          RETURNING state
        `;
        if (abortRaceTransactions) {
          throw new Error("TASK04_TEST_ABORTED");
        }
        if (updated.length !== 1 || updated[0]?.state !== "revoked") {
          throw new Error("TASK04_TEST_REVOCATION_FAILED");
        }
        return updated[0].state;
      },
    );

    let concurrencyFailure: unknown;
    try {
      const backendPid = await Promise.race([
        revocationBackendReady,
        revocationOperation.then(
          () => {
            throw new Error(
              "TASK04_TEST_REVOCATION_WAS_NOT_BLOCKED",
            );
          },
          (failure: unknown) => {
            throw failure;
          },
        ),
      ]);
      const blockingPids = await waitForTask04BackendBlock(
        adminSql,
        backendPid,
      );
      expect(blockingPids).not.toEqual([]);
    } catch (failure) {
      concurrencyFailure = failure;
      abortRaceTransactions = true;
    } finally {
      releaseLock();
    }

    const [protectedOutcome, revocationOutcome] =
      await Promise.allSettled([
        protectedOperation,
        revocationOperation,
      ]);
    if (concurrencyFailure !== undefined) {
      throw concurrencyFailure;
    }
    expect(protectedOutcome).toEqual({
      status: "fulfilled",
      value: {
        authorized: true,
        reasonCode: "AUTHORIZED",
      },
    });
    expect(revocationOutcome).toEqual({
      status: "fulfilled",
      value: "revoked",
    });

    const [persistedState] = await verificationSql<
      { state: string }[]
    >`
      SELECT state
      FROM task04_synthetic.management_credential
      WHERE id = 'SYNTH-CREDENTIAL-TASK04-ACTIVE'
    `;
    expect(persistedState?.state).toBe("revoked");

    const deniedAfterRevocation =
      await withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          return authorizeReusableBookingCapability(
            transaction,
            context,
            capabilityRequest(),
            "read_only",
          );
        },
      );
    expect(deniedAfterRevocation).toEqual({
      authorized: false,
      reasonCode: "NOT_AUTHORIZED",
    });
  });

  it("authorizes staff confirmation only from trusted context and exact facts", async () => {
    await withTask04RuntimeTransaction(
      sql,
      "read committed",
      async (transaction) => {
        const context = await authoritativeContext(transaction);
        expect(
          authorizeStaffBookingConfirmation(context, {
            actorType: "synthetic_staff",
            actorReference:
              TASK04_SYNTHETIC_REFERENCES.pharmacist,
            subjectType: "synthetic_patient",
            sessionReference:
              "SYNTH-STAFF-SESSION-TASK04-0001",
            sessionActive: true,
            permissions: ["booking:confirm"],
          }),
        ).toEqual({
          authorized: true,
          reasonCode: "AUTHORIZED",
        });
      },
    );
  });
});

describe("Task 04 transactional evidence", () => {
  it("derives outbox and audit server fields from one trusted context", async () => {
    let trustedNow = "";
    let receiptId = "";
    await withTask04RuntimeTransaction(
      sql,
      "serializable",
      async (transaction) => {
        const context = await authoritativeContext(transaction);
        trustedNow = context.nowUtc;
        const started = await beginTask04IdempotentCommand(
          transaction,
          context,
          IDEMPOTENCY_INPUT,
        );
        receiptId = started.receiptId;
        await completeTask04IdempotentCommand(
          transaction,
          context,
          receiptId,
          "booking:create",
          BOOKING_CREATE_RESPONSE,
        );
        const eventId = await insertTask04OutboxEvent(
          transaction,
          context,
          bookingCreatedOutboxInput(
            "SYNTH-EVENT-TASK04-INFRA-0001",
          ),
        );
        await insertTask04SyntheticAudit(transaction, context, {
          operation: "booking:create",
          auditId: "SYNTH-AUDIT-TASK04-INFRA-0001",
          aggregateType: "booking",
          aggregateId: "SYNTH-BOOKING-TASK04-INFRA-0001",
          aggregateVersion: 1,
          actorType: "synthetic_patient",
          subjectReference: TASK04_SYNTHETIC_REFERENCES.patient,
          subjectType: "synthetic_patient",
          priorState: "none",
          resultingState: "confirmed",
          safeReasonCode: "BOOKING_REQUESTED",
          idempotencyRecordId: receiptId,
          outboxRecordId: eventId,
        });
      },
    );

    const [evidence] = await verificationSql<{
      dispatch_status: string;
      aggregate_version_superseded: boolean;
      occurred_at_utc: Date;
      transitioned_at_utc: Date;
      payload_type: string;
      audit_count: number;
    }[]>`
      SELECT
        outbox.dispatch_status,
        outbox.aggregate_version_superseded,
        outbox.occurred_at_utc,
        audit.transitioned_at_utc,
        jsonb_typeof(outbox.payload) AS payload_type,
        count(audit.id)::integer AS audit_count
      FROM task04_synthetic.transactional_outbox_record AS outbox
      LEFT JOIN task04_synthetic.synthetic_audit_record AS audit
        ON audit.outbox_record_id = outbox.id
       AND audit.pharmacy_id = outbox.pharmacy_id
      WHERE outbox.id = 'SYNTH-EVENT-TASK04-INFRA-0001'
      GROUP BY outbox.id, audit.transitioned_at_utc
    `;
    expect(evidence!.dispatch_status).toBe("not_dispatched");
    expect(evidence!.aggregate_version_superseded).toBe(false);
    expect(evidence!.payload_type).toBe("object");
    expect(evidence!.audit_count).toBe(1);
    expect(evidence!.occurred_at_utc.toISOString()).toBe(trustedNow);
    expect(evidence!.transitioned_at_utc.toISOString()).toBe(
      trustedNow,
    );
  });

  it("rolls audit and outbox back together when the transaction fails", async () => {
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "serializable",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          const started = await beginTask04IdempotentCommand(
            transaction,
            context,
            IDEMPOTENCY_INPUT,
          );
          await completeTask04IdempotentCommand(
            transaction,
            context,
            started.receiptId,
            "booking:create",
            BOOKING_CREATE_RESPONSE,
          );
          const eventId = await insertTask04OutboxEvent(
            transaction,
            context,
            bookingCreatedOutboxInput(
              "SYNTH-EVENT-TASK04-ROLLBACK-0001",
            ),
          );
          await insertTask04SyntheticAudit(transaction, context, {
            operation: "booking:create",
            auditId: "SYNTH-AUDIT-TASK04-ROLLBACK-0001",
            aggregateType: "booking",
            aggregateId: "SYNTH-BOOKING-TASK04-INFRA-0001",
            aggregateVersion: 1,
            actorType: "synthetic_patient",
            subjectReference:
              TASK04_SYNTHETIC_REFERENCES.patient,
            subjectType: "synthetic_patient",
            priorState: "none",
            resultingState: "confirmed",
            safeReasonCode: "BOOKING_REQUESTED",
            idempotencyRecordId: started.receiptId,
            outboxRecordId: eventId,
          });
          throw new Error("SYNTHETIC_EVIDENCE_ROLLBACK");
        },
      ),
    ).rejects.toThrow("SYNTHETIC_EVIDENCE_ROLLBACK");

    const [counts] = await verificationSql<{
      outbox_count: number;
      audit_count: number;
      idempotency_count: number;
    }[]>`
      SELECT
        (
          SELECT count(*)::integer
          FROM task04_synthetic.transactional_outbox_record
        ) AS outbox_count,
        (
          SELECT count(*)::integer
          FROM task04_synthetic.synthetic_audit_record
        ) AS audit_count,
        (
          SELECT count(*)::integer
          FROM task04_synthetic.idempotency_record
        ) AS idempotency_count
    `;
    expect(counts).toEqual({
      outbox_count: 0,
      audit_count: 0,
      idempotency_count: 0,
    });
  });
});
