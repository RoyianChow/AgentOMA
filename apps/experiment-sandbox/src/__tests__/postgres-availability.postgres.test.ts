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
  queryTask04PublicAvailability,
  resolveTask04PublicSlotReference,
} from "../db/availability";
import { createTask04AuthoritativeTransactionContext } from "../db/authoritative-context";
import {
  createTask04SandboxSql,
  type Task04SandboxSql,
} from "../db/client";
import {
  TASK04_FOUNDATION_FIXTURES,
  seedTask04Foundation,
} from "../db/fixtures";
import {
  task04AddCalendarDays,
  task04PharmacyCalendarDate,
  task04PharmacyCalendarWindow,
} from "../db/pharmacy-calendar";
import { createTask04PublicSlotReferenceService } from "../db/public-slot-reference";
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
const FIXED_ENV_PARSE_TIME = "2026-08-02T00:00:00.000Z";
const PHARMACY_TIMEZONE = "America/Toronto";

let sql: Task04SandboxSql;
let adminSql: Task04SandboxSql;
let environment: Task04SandboxEnv;
let databaseNowUtc: string;
let fixtureSlotStartUtc: string;
let fixtureSlotEndUtc: string;
let secondSlotStartUtc: string;
let secondSlotEndUtc: string;
let activeHoldExpiresAtUtc: string;
let expiredHoldExpiresAtUtc: string;
let historicalCreatedAtUtc: string;
let historicalTransitionedAtUtc: string;
let terminalHoldExpiresAtUtc: string;
let availabilityRequest: Readonly<{
  modality: "in_person";
  startDate: string;
  endDate: string;
  timezone: string;
  pageSize: number;
}>;

function instantFromDatabaseNow(offsetMilliseconds: number): string {
  return new Date(
    Date.parse(databaseNowUtc) + offsetMilliseconds,
  ).toISOString();
}

function configuration() {
  return task04CommandConfigurationFromEnvironment(environment);
}

async function context(transaction: Task04TransactionSql) {
  return createTask04AuthoritativeTransactionContext(
    transaction,
    environment,
    configuration(),
  );
}

async function availability(
  input: unknown = availabilityRequest,
) {
  return withTask04RuntimeTransaction(
    sql,
    "read committed",
    async (transaction) => {
      const authoritativeContext = await context(transaction);
      return queryTask04PublicAvailability(
        transaction,
        authoritativeContext,
        environment,
        input,
      );
    },
  );
}

async function createConfirmedBooking(
  bookingId: string,
  capacityUnitId: string,
) {
  await withTask04RuntimeTransaction(
    sql,
    "serializable",
    async (transaction) => {
      await context(transaction);
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
          safe_reason_code
        )
        VALUES (
          ${bookingId},
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          'in_person',
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'confirmed',
          'SYNTHETIC_CONFIRMED_FIXTURE'
        )
      `;
      await transaction`
        UPDATE task04_synthetic.capacity_unit
        SET booking_id = ${bookingId},
            aggregate_version = aggregate_version + 1,
            transitioned_at_utc = statement_timestamp()
        WHERE id = ${capacityUnitId}
          AND pharmacy_id = ${PHARMACY_ID}
      `;
    },
  );
}

async function createActiveHold(
  suffix: string,
  capacityUnitId: string,
  expiresAtUtc: string,
) {
  const bookingId = `SYNTH-BOOKING-HOLD-${suffix}`;
  const holdId = `SYNTH-CAPACITY-HOLD-${suffix}`;
  await withTask04RuntimeTransaction(
    sql,
    "serializable",
    async (transaction) => {
      await context(transaction);
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
          confirmation_deadline_utc,
          safe_reason_code,
          created_at_utc,
          transitioned_at_utc
        )
        VALUES (
          ${bookingId},
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          'in_person',
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'pending_confirmation',
          ${expiresAtUtc},
          'SYNTHETIC_PENDING_FIXTURE',
          ${historicalCreatedAtUtc},
          ${historicalTransitionedAtUtc}
        )
      `;
      await transaction`
        INSERT INTO task04_synthetic.capacity_hold (
          id,
          pharmacy_id,
          slot_id,
          capacity_unit_id,
          purpose,
          pending_booking_id,
          state,
          expires_at_utc,
          created_at_utc,
          transitioned_at_utc
        )
        VALUES (
          ${holdId},
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          ${capacityUnitId},
          'pending_booking',
          ${bookingId},
          'active',
          ${expiresAtUtc},
          ${historicalCreatedAtUtc},
          ${historicalTransitionedAtUtc}
        )
      `;
      await transaction`
        UPDATE task04_synthetic.capacity_unit
        SET capacity_hold_id = ${holdId},
            aggregate_version = aggregate_version + 1,
            transitioned_at_utc = statement_timestamp()
        WHERE id = ${capacityUnitId}
          AND pharmacy_id = ${PHARMACY_ID}
      `;
    },
  );
}

beforeAll(async () => {
  environment = parseTask04SandboxEnv(
    task04SyntheticEnvironmentInput(),
    new Date(FIXED_ENV_PARSE_TIME),
  );
  adminSql = postgres(TASK04_SANDBOX_OWNER_POSTGRES_URL, {
    max: 2,
    connection: {
      application_name: "agentoma-task04-availability-owner",
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
  if (!clock) throw new Error("TASK04_TEST_DATABASE_TIME_MISSING");
  databaseNowUtc = clock.now_utc.toISOString();
  fixtureSlotStartUtc = instantFromDatabaseNow(2 * 60 * 60 * 1_000);
  fixtureSlotEndUtc = instantFromDatabaseNow(
    (2 * 60 + 30) * 60 * 1_000,
  );
  secondSlotStartUtc = instantFromDatabaseNow(
    3 * 60 * 60 * 1_000,
  );
  secondSlotEndUtc = instantFromDatabaseNow(
    (3 * 60 + 30) * 60 * 1_000,
  );
  activeHoldExpiresAtUtc = instantFromDatabaseNow(
    60 * 60 * 1_000,
  );
  expiredHoldExpiresAtUtc = instantFromDatabaseNow(-1_000);
  historicalCreatedAtUtc = instantFromDatabaseNow(
    -24 * 60 * 60 * 1_000,
  );
  historicalTransitionedAtUtc = instantFromDatabaseNow(
    -2 * 60 * 60 * 1_000,
  );
  terminalHoldExpiresAtUtc = instantFromDatabaseNow(
    -3 * 60 * 60 * 1_000,
  );
  availabilityRequest = Object.freeze({
    modality: "in_person",
    startDate: task04PharmacyCalendarDate(
      databaseNowUtc,
      PHARMACY_TIMEZONE,
    ),
    endDate: task04PharmacyCalendarDate(
      secondSlotStartUtc,
      PHARMACY_TIMEZONE,
    ),
    timezone: PHARMACY_TIMEZONE,
    pageSize: 10,
  });
  await adminSql`
    UPDATE task04_synthetic.booking_slot
    SET starts_at_utc = ${fixtureSlotStartUtc},
        ends_at_utc = ${fixtureSlotEndUtc},
        transitioned_at_utc = ${databaseNowUtc}
    WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
      AND pharmacy_id = ${PHARMACY_ID}
  `;
});

afterAll(async () => {
  await Promise.all([
    closeTask04SandboxSql(sql),
    closeTask04SandboxSql(adminSql),
  ]);
});

describe("Task 04 PostgreSQL public availability", () => {
  it("returns an enabled current slot as a minimized opaque projection", async () => {
    const result = await availability();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      serviceCategoryLabel: "Synthetic administrative service",
      modality: "in_person",
      publicLocationLabel: "Synthetic Pharmacy Location",
      availabilityState: "available",
      displayTimezone: "America/Toronto",
    });
    expect(result.items[0]?.slotReference).toMatch(
      /^[A-Za-z0-9_-]{16,160}$/,
    );
    expect(result.items[0]?.serviceCategoryRef).toMatch(
      /^[A-Za-z0-9_-]{16,160}$/,
    );
    expect(result.items[0]?.serviceCategoryRef).not.toBe(
      TASK04_FOUNDATION_FIXTURES.serviceCategoryId,
    );
    expect(JSON.stringify(result)).not.toMatch(
      /(?:slot_id|configured_capacity|remainingCapacity|bookingCount|waitlistCount|staffId|pharmacyId)/,
    );
  });

  it("uses deterministic scope-bound pagination without exposing offsets", async () => {
    await adminSql`
      INSERT INTO task04_synthetic.booking_slot (
        id,
        pharmacy_id,
        service_category_id,
        modality,
        starts_at_utc,
        ends_at_utc,
        display_timezone,
        configured_capacity,
        state
      )
      VALUES (
        'SYNTH-SLOT-PAGE-0002',
        ${PHARMACY_ID},
        ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
        'in_person',
        ${secondSlotStartUtc},
        ${secondSlotEndUtc},
        'America/Toronto',
        1,
        'active'
      )
    `;
    await adminSql`
      INSERT INTO task04_synthetic.capacity_unit (
        id,
        pharmacy_id,
        slot_id,
        unit_sequence
      )
      VALUES (
        'SYNTH-CAPACITY-PAGE-0002',
        ${PHARMACY_ID},
        'SYNTH-SLOT-PAGE-0002',
        1
      )
    `;

    const firstPage = await availability({
      ...availabilityRequest,
      pageSize: 1,
    });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).toMatch(
      /^[A-Za-z0-9_-]{16,160}$/,
    );
    expect(firstPage.nextCursor).not.toBe("1");
    expect(firstPage.nextCursor).not.toContain(
      TASK04_FOUNDATION_FIXTURES.slotId,
    );

    const secondPage = await availability({
      ...availabilityRequest,
      pageSize: 1,
      cursor: firstPage.nextCursor,
    });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.nextCursor).toBeUndefined();
    expect(secondPage.items[0]?.startTimeUtc).not.toBe(
      firstPage.items[0]?.startTimeUtc,
    );
  });

  it("excludes disabled, expired, and disabled-service inventory", async () => {
    await sql`
      UPDATE task04_synthetic.booking_slot
      SET state = 'unavailable'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
    `;
    expect((await availability()).items).toEqual([]);

    await sql`
      UPDATE task04_synthetic.booking_slot
      SET state = 'active',
          starts_at_utc = ${instantFromDatabaseNow(
            -60 * 60 * 1_000,
          )},
          ends_at_utc = ${instantFromDatabaseNow(
            -30 * 60 * 1_000,
          )}
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
    `;
    expect((await availability()).items).toEqual([]);

    await sql`
      UPDATE task04_synthetic.booking_slot
      SET starts_at_utc = ${fixtureSlotStartUtc},
          ends_at_utc = ${fixtureSlotEndUtc}
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
    `;
    await sql`
      UPDATE task04_synthetic.service_category
      SET state = 'unavailable'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId}
    `;
    expect((await availability()).items).toEqual([]);
  });

  it("excludes an uncommitted cross-pharmacy negative fixture", async () => {
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) => {
          const authoritativeContext = await context(transaction);
          await transaction`SET CONSTRAINTS ALL DEFERRED`;
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
              'SYNTH-SERVICE-CROSS-PHARMACY',
              ${OTHER_PHARMACY_ID},
              'Synthetic cross-scope service',
              ARRAY['in_person']
                ::task04_synthetic.appointment_modality[],
              false,
              false,
              'active'
            )
          `;
          await transaction`
            INSERT INTO task04_synthetic.booking_slot (
              id,
              pharmacy_id,
              service_category_id,
              modality,
              starts_at_utc,
              ends_at_utc,
              display_timezone,
              configured_capacity,
              state
            )
            VALUES (
              'SYNTH-SLOT-CROSS-PHARMACY',
              ${OTHER_PHARMACY_ID},
              'SYNTH-SERVICE-CROSS-PHARMACY',
              'in_person',
              ${secondSlotStartUtc},
              ${secondSlotEndUtc},
              'America/Toronto',
              1,
              'active'
            )
          `;
          await transaction`
            INSERT INTO task04_synthetic.capacity_unit (
              id,
              pharmacy_id,
              slot_id,
              unit_sequence
            )
            VALUES (
              'SYNTH-CAPACITY-CROSS-PHARMACY',
              ${OTHER_PHARMACY_ID},
              'SYNTH-SLOT-CROSS-PHARMACY',
              1
            )
          `;
          const result = await queryTask04PublicAvailability(
            transaction,
            authoritativeContext,
            environment,
            availabilityRequest,
          );
          expect(result.items).toHaveLength(1);
          expect(result.items[0]).toMatchObject({
            serviceCategoryLabel:
              "Synthetic administrative service",
            publicLocationLabel: "Synthetic Pharmacy Location",
            startTimeUtc: fixtureSlotStartUtc,
            endTimeUtc: fixtureSlotEndUtc,
          });
          expect(result.items[0]?.serviceCategoryLabel).not.toBe(
            "Synthetic cross-scope service",
          );
          throw new Error("TASK04_TEST_ROLLBACK");
        },
      ),
    ).rejects.toThrow("TASK04_TEST_ROLLBACK");
  });

  it("remains available with one confirmed unit and disappears when full", async () => {
    await createConfirmedBooking(
      "SYNTH-BOOKING-CONFIRMED-0001",
      TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0],
    );
    expect((await availability()).items).toHaveLength(1);
    await createConfirmedBooking(
      "SYNTH-BOOKING-CONFIRMED-0002",
      TASK04_FOUNDATION_FIXTURES.capacityUnitIds[1],
    );
    expect((await availability()).items).toEqual([]);
  });

  it("counts active non-expired holds until all capacity is held", async () => {
    await createActiveHold(
      "ACTIVE-0001",
      TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0],
      activeHoldExpiresAtUtc,
    );
    expect((await availability()).items).toHaveLength(1);
    await createActiveHold(
      "ACTIVE-0002",
      TASK04_FOUNDATION_FIXTURES.capacityUnitIds[1],
      activeHoldExpiresAtUtc,
    );
    expect((await availability()).items).toEqual([]);
  });

  it("ignores an active hold whose trusted expiry has elapsed", async () => {
    await createConfirmedBooking(
      "SYNTH-BOOKING-CONFIRMED-0001",
      TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0],
    );
    await createActiveHold(
      "EXPIRED-0001",
      TASK04_FOUNDATION_FIXTURES.capacityUnitIds[1],
      expiredHoldExpiresAtUtc,
    );
    expect((await availability()).items).toHaveLength(1);
  });

  it("treats released, consumed, and expired holds according to terminal schema semantics", async () => {
    await withTask04RuntimeTransaction(
      sql,
      "serializable",
      async (transaction) => {
        await context(transaction);
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
            safe_reason_code
          )
          VALUES
            (
              'SYNTH-BOOKING-RELEASED-HOLD',
              ${PHARMACY_ID},
              ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
              ${TASK04_FOUNDATION_FIXTURES.slotId},
              'in_person',
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              'cancelled',
              'SYNTHETIC_CANCELLED_FIXTURE'
            ),
            (
              'SYNTH-BOOKING-CONSUMED-HOLD',
              ${PHARMACY_ID},
              ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
              ${TASK04_FOUNDATION_FIXTURES.slotId},
              'in_person',
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              'confirmed',
              'SYNTHETIC_CONFIRMED_FIXTURE'
            ),
            (
              'SYNTH-BOOKING-EXPIRED-HOLD',
              ${PHARMACY_ID},
              ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
              ${TASK04_FOUNDATION_FIXTURES.slotId},
              'in_person',
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              'expired',
              'SYNTHETIC_EXPIRED_FIXTURE'
            )
        `;
        await transaction`
          INSERT INTO task04_synthetic.capacity_hold (
            id,
            pharmacy_id,
            slot_id,
            capacity_unit_id,
            purpose,
            pending_booking_id,
            state,
            expires_at_utc,
            consumed_at_utc,
            released_at_utc,
            expired_at_utc,
            created_at_utc,
            transitioned_at_utc
          )
          VALUES
            (
              'SYNTH-HOLD-RELEASED-0001',
              ${PHARMACY_ID},
              ${TASK04_FOUNDATION_FIXTURES.slotId},
              ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0]},
              'pending_booking',
              'SYNTH-BOOKING-RELEASED-HOLD',
              'released',
              ${terminalHoldExpiresAtUtc},
              NULL,
              ${historicalTransitionedAtUtc},
              NULL,
              ${historicalCreatedAtUtc},
              ${historicalTransitionedAtUtc}
            ),
            (
              'SYNTH-HOLD-CONSUMED-0001',
              ${PHARMACY_ID},
              ${TASK04_FOUNDATION_FIXTURES.slotId},
              ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[1]},
              'pending_booking',
              'SYNTH-BOOKING-CONSUMED-HOLD',
              'consumed',
              ${terminalHoldExpiresAtUtc},
              ${historicalTransitionedAtUtc},
              NULL,
              NULL,
              ${historicalCreatedAtUtc},
              ${historicalTransitionedAtUtc}
            ),
            (
              'SYNTH-HOLD-EXPIRED-0001',
              ${PHARMACY_ID},
              ${TASK04_FOUNDATION_FIXTURES.slotId},
              ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0]},
              'pending_booking',
              'SYNTH-BOOKING-EXPIRED-HOLD',
              'expired',
              ${terminalHoldExpiresAtUtc},
              NULL,
              NULL,
              ${historicalTransitionedAtUtc},
              ${historicalCreatedAtUtc},
              ${historicalTransitionedAtUtc}
            )
        `;
        await transaction`
          UPDATE task04_synthetic.capacity_unit
          SET booking_id = 'SYNTH-BOOKING-CONSUMED-HOLD'
          WHERE id = ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[1]}
        `;
      },
    );
    expect((await availability()).items).toHaveLength(1);
  });

  it("resolves the trailing slot in 31 pharmacy-calendar days and rejects the next instant", async () => {
    const window = task04PharmacyCalendarWindow({
      trustedNowUtc: databaseNowUtc,
      timezone: PHARMACY_TIMEZONE,
      inclusiveDays:
        configuration().maxAvailabilityWindowDays,
    });
    const trailingStartUtc = new Date(
      Date.parse(window.endExclusiveUtc) - 30 * 60 * 1_000,
    ).toISOString();
    const trailingEndUtc = new Date(
      Date.parse(window.endExclusiveUtc) - 1_000,
    ).toISOString();
    await adminSql`
      UPDATE task04_synthetic.booking_slot
      SET starts_at_utc = ${trailingStartUtc},
          ends_at_utc = ${trailingEndUtc}
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    const boundaryRequest = {
      ...availabilityRequest,
      startDate: window.startDate,
      endDate: task04AddCalendarDays(window.startDate, 30),
    };
    const item = (
      await availability(boundaryRequest)
    ).items[0]!;
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) => {
          const authoritativeContext = await context(transaction);
          return resolveTask04PublicSlotReference(
            transaction,
            authoritativeContext,
            environment,
            { slotReference: item.slotReference },
          );
        },
      ),
    ).resolves.toMatchObject({
      slotId: TASK04_FOUNDATION_FIXTURES.slotId,
    });

    await adminSql`
      UPDATE task04_synthetic.booking_slot
      SET starts_at_utc = ${window.endExclusiveUtc},
          ends_at_utc = ${new Date(
            Date.parse(window.endExclusiveUtc) + 30 * 60 * 1_000,
          ).toISOString()}
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) => {
          const authoritativeContext = await context(transaction);
          return resolveTask04PublicSlotReference(
            transaction,
            authoritativeContext,
            environment,
            { slotReference: item.slotReference },
          );
        },
      ),
    ).rejects.toMatchObject({
      code: "SLOT_NO_LONGER_AVAILABLE",
      message: "TASK04_COMMAND_FAILED",
    });
  });

  it("resolves the correct slot and denies stale, tampered, and expired references generically", async () => {
    const result = await availability();
    const item = result.items[0]!;
    const resolved = await withTask04RuntimeTransaction(
      sql,
      "read committed",
      async (transaction) => {
        const authoritativeContext = await context(transaction);
        return resolveTask04PublicSlotReference(
          transaction,
          authoritativeContext,
          environment,
          {
            slotReference: item.slotReference,
          },
        );
      },
    );
    expect(resolved).toEqual({
      slotId: TASK04_FOUNDATION_FIXTURES.slotId,
    });

    const lastCharacter = item.slotReference!.at(-1);
    const tampered = `${item.slotReference!.slice(0, -1)}${
      lastCharacter === "A" ? "B" : "A"
    }`;
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) => {
          const authoritativeContext = await context(transaction);
          return resolveTask04PublicSlotReference(
            transaction,
            authoritativeContext,
            environment,
            {
              slotReference: tampered,
            },
          );
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "SLOT_NO_LONGER_AVAILABLE",
      }),
    );

    await sql`
      UPDATE task04_synthetic.booking_slot
      SET state = 'unavailable'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
    `;
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) => {
          const authoritativeContext = await context(transaction);
          return resolveTask04PublicSlotReference(
            transaction,
            authoritativeContext,
            environment,
            {
              slotReference: item.slotReference,
            },
          );
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "SLOT_NO_LONGER_AVAILABLE",
      }),
    );

    await sql`
      UPDATE task04_synthetic.booking_slot
      SET state = 'active'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
    `;
    await withTask04RuntimeTransaction(
      sql,
      "read committed",
      async (transaction) => {
        const authoritativeContext = await context(transaction);
        const staleIssuer =
          createTask04PublicSlotReferenceService({
            pharmacyId: authoritativeContext.pharmacyId,
            secret: environment.publicSlotReferenceSecret,
            ttlSeconds:
              environment.publicSlotReferenceTtlSeconds,
            sandboxInstanceId: environment.instanceId,
            approvalDecisionVersion:
              environment.approvalDecisionVersion,
            lifecycleExpiresAtUtc:
              environment.expiresAt.toISOString(),
          });
        const staleReference = staleIssuer.issue(
          {
            slotId: TASK04_FOUNDATION_FIXTURES.slotId,
            serviceCategoryId:
              TASK04_FOUNDATION_FIXTURES.serviceCategoryId,
            modality: "in_person",
          },
          new Date(
            Date.parse(authoritativeContext.nowUtc) - 901_000,
          ).toISOString(),
          new Uint8Array(16).fill(9),
        );
        await expect(
          resolveTask04PublicSlotReference(
            transaction,
            authoritativeContext,
            environment,
            {
              slotReference: staleReference.slotReference,
            },
          ),
        ).rejects.toEqual(
          expect.objectContaining({
            code: "SLOT_NO_LONGER_AVAILABLE",
          }),
        );
      },
    );
  });

  it("fails closed on approval and rolls read transactions and connections back cleanly", async () => {
    const expiredEnvironment = parseTask04SandboxEnv(
      {
        ...task04SyntheticEnvironmentInput(),
        SANDBOX_BUILT_AT: "2026-07-31T00:00:00.000Z",
        SANDBOX_EXPIRES_AT: "2026-08-01T00:00:00.000Z",
      },
      new Date(FIXED_ENV_PARSE_TIME),
      { allowExpired: true },
    );
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) =>
          createTask04AuthoritativeTransactionContext(
            transaction,
            expiredEnvironment,
            task04CommandConfigurationFromEnvironment(
              expiredEnvironment,
            ),
          ),
      ),
    ).rejects.toThrow("TASK04_AUTHORITATIVE_CONTEXT_DENIED");

    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) => {
          const authoritativeContext = await context(transaction);
          await queryTask04PublicAvailability(
            transaction,
            authoritativeContext,
            environment,
            availabilityRequest,
          );
          throw new Error("TASK04_TEST_READ_ROLLBACK");
        },
      ),
    ).rejects.toThrow("TASK04_TEST_READ_ROLLBACK");

    const temporarySql = createTask04SandboxSql(environment);
    await temporarySql`SELECT 1`;
    await closeTask04SandboxSql(temporarySql);
    await expect(temporarySql`SELECT 1`).rejects.toBeDefined();
  });
});
