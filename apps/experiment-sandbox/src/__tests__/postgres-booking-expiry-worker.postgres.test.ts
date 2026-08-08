import { TextEncoder } from "node:util";

import { sha256Task04Value } from "../booking/idempotency";

import postgres from "postgres";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  executeTask04ExpiredPendingBookingCleanup,
  type Task04BookingExpiryWorkerResult,
} from "../db/booking-expiry-worker";
import { executeTask04BookingConfirm } from "../db/booking-confirm";
import {
  createTask04SandboxSql,
  type Task04SandboxSql,
} from "../db/client";
import {
  TASK04_FOUNDATION_FIXTURES,
  seedTask04Foundation,
} from "../db/fixtures";
import { closeTask04SandboxSql } from "../db/transaction";
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
const encoder = new TextEncoder();

let sql: Task04SandboxSql;
let secondSql: Task04SandboxSql;
let adminSql: Task04SandboxSql;
let environment: Task04SandboxEnv;
let databaseNowUtc: string;

type FixtureState =
  | "active"
  | "consumed"
  | "released"
  | "expired";

type ExpiryFixture = Readonly<{
  bookingId: string;
  holdId: string;
  capacityUnitId: string;
}>;

type PersistedSnapshot = Readonly<{
  booking_state: string;
  booking_version: number;
  confirmation_deadline_utc: Date | null;
  hold_state: string;
  hold_version: number;
  expired_at_utc: Date | null;
  capacity_hold_id: string | null;
  capacity_booking_id: string | null;
  capacity_version: number;
  receipts: number;
  audits: number;
  events: number;
}>;

function instantFromDatabaseNow(offsetMilliseconds: number): string {
  return new Date(
    Date.parse(databaseNowUtc) + offsetMilliseconds,
  ).toISOString();
}

function requireSuccess(
  result: Task04BookingExpiryWorkerResult,
) {
  if (!result.success) {
    throw new Error(
      `TASK04_EXPECTED_EXPIRY_SUCCESS:${result.error.code}`,
    );
  }
  return result;
}

async function resetFoundation(): Promise<void> {
  await adminSql`TRUNCATE task04_synthetic.sandbox_scope CASCADE`;
  await seedTask04Foundation(adminSql, environment);
  const [clock] = await adminSql<{ now_utc: Date }[]>`
    SELECT transaction_timestamp() AS now_utc
  `;
  if (!clock) {
    throw new Error("TASK04_TEST_DATABASE_TIME_MISSING");
  }
  databaseNowUtc = clock.now_utc.toISOString();
  await adminSql`
    UPDATE task04_synthetic.booking_slot
    SET starts_at_utc =
          ${databaseNowUtc}::timestamptz + interval '2 hours',
        ends_at_utc =
          ${databaseNowUtc}::timestamptz +
            interval '2 hours 30 minutes',
        state = 'active',
        transitioned_at_utc = ${databaseNowUtc}
    WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
      AND pharmacy_id = ${PHARMACY_ID}
  `;
}

async function insertExpiryFixture(
  suffix: string,
  expiryOffsetMilliseconds: number,
  state: FixtureState = "active",
  bookingStateOverride?:
    | "pending_confirmation"
    | "confirmed"
    | "cancelled"
    | "rescheduled"
    | "expired",
): Promise<ExpiryFixture> {
  const bookingId = `SYNTH-BOOKING-EXPIRY-${suffix}`;
  const holdId = `SYNTH-HOLD-EXPIRY-${suffix}`;
  const capacityUnitId =
    suffix.endsWith("B")
      ? TASK04_FOUNDATION_FIXTURES.capacityUnitIds[1]
      : TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0];
  const expiresAtUtc = instantFromDatabaseNow(
    expiryOffsetMilliseconds,
  );
  const createdAtUtc = instantFromDatabaseNow(-2 * 60 * 60 * 1_000);
  const terminalAtUtc =
    state === "active" ? null : databaseNowUtc;
  const bookingState =
    bookingStateOverride ??
    (state === "active"
      ? "pending_confirmation"
      : state === "consumed"
        ? "confirmed"
        : state === "released"
          ? "cancelled"
          : "expired");
  const bookingDeadline =
    bookingState === "pending_confirmation" ? expiresAtUtc : null;
  const successorBookingId =
    bookingState === "rescheduled"
      ? `${bookingId}-SUCCESSOR`
      : null;

  await adminSql.begin(async (transaction) => {
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
        successor_booking_id,
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
        ${bookingState},
        ${bookingDeadline},
        ${successorBookingId},
        'SYNTHETIC_EXPIRY_FIXTURE',
        ${createdAtUtc},
        ${createdAtUtc}
      )
    `;
    if (successorBookingId !== null) {
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
          predecessor_booking_id,
          safe_reason_code,
          created_at_utc,
          transitioned_at_utc
        )
        VALUES (
          ${successorBookingId},
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          'in_person',
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'cancelled',
          ${bookingId},
          'SYNTHETIC_EXPIRY_SUCCESSOR_FIXTURE',
          ${createdAtUtc},
          ${createdAtUtc}
        )
      `;
    }
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
      VALUES (
        ${holdId},
        ${PHARMACY_ID},
        ${TASK04_FOUNDATION_FIXTURES.slotId},
        ${capacityUnitId},
        'pending_booking',
        ${bookingId},
        ${state},
        ${expiresAtUtc},
        ${state === "consumed" ? terminalAtUtc : null},
        ${state === "released" ? terminalAtUtc : null},
        ${state === "expired" ? terminalAtUtc : null},
        ${createdAtUtc},
        ${createdAtUtc}
      )
    `;
    await transaction`
      UPDATE task04_synthetic.capacity_unit
      SET booking_id =
            ${state === "consumed" ? bookingId : null},
          capacity_hold_id =
            ${state === "active" ? holdId : null},
          transitioned_at_utc = ${createdAtUtc}
      WHERE id = ${capacityUnitId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
  });
  return { bookingId, holdId, capacityUnitId };
}

async function persistedSnapshot(
  fixture: ExpiryFixture,
): Promise<PersistedSnapshot> {
  const [snapshot] = await adminSql<PersistedSnapshot[]>`
    SELECT
      booking.state::text AS booking_state,
      booking.aggregate_version AS booking_version,
      booking.confirmation_deadline_utc,
      hold.state::text AS hold_state,
      hold.aggregate_version AS hold_version,
      hold.expired_at_utc,
      unit.capacity_hold_id,
      unit.booking_id AS capacity_booking_id,
      unit.aggregate_version AS capacity_version,
      (
        SELECT count(*)::integer
        FROM task04_synthetic.idempotency_record
        WHERE resource_scope_digest =
          ${sha256Task04Value(fixture.bookingId)}
      ) AS receipts,
      (
        SELECT count(*)::integer
        FROM task04_synthetic.synthetic_audit_record
        WHERE aggregate_id IN (
          ${fixture.bookingId},
          ${fixture.holdId}
        )
      ) AS audits,
      (
        SELECT count(*)::integer
        FROM task04_synthetic.transactional_outbox_record
        WHERE aggregate_id IN (
          ${fixture.bookingId},
          ${fixture.holdId}
        )
      ) AS events
    FROM task04_synthetic.booking AS booking
    JOIN task04_synthetic.capacity_hold AS hold
      ON hold.pending_booking_id = booking.id
     AND hold.pharmacy_id = booking.pharmacy_id
    JOIN task04_synthetic.capacity_unit AS unit
      ON unit.id = hold.capacity_unit_id
     AND unit.pharmacy_id = hold.pharmacy_id
    WHERE booking.id = ${fixture.bookingId}
      AND booking.pharmacy_id = ${PHARMACY_ID}
  `;
  if (!snapshot) {
    throw new Error("TASK04_EXPIRY_FIXTURE_MISSING");
  }
  return snapshot;
}

async function installAtomicFailure(
  point: "booking" | "hold" | "capacity" | "audit" | "outbox",
): Promise<void> {
  if (point === "booking") {
    await adminSql`
      CREATE FUNCTION task04_synthetic.fail_expiry_booking()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION USING ERRCODE = '23514',
          MESSAGE = 'SYNTHETIC_EXPIRY_BOOKING_FAILURE';
      END
      $$
    `;
    await adminSql`
      CREATE TRIGGER fail_expiry_booking
      BEFORE UPDATE ON task04_synthetic.booking
      FOR EACH ROW
      WHEN (NEW.state = 'expired')
      EXECUTE FUNCTION task04_synthetic.fail_expiry_booking()
    `;
    return;
  }
  if (point === "hold") {
    await adminSql`
      CREATE FUNCTION task04_synthetic.fail_expiry_hold()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION USING ERRCODE = '23514',
          MESSAGE = 'SYNTHETIC_EXPIRY_HOLD_FAILURE';
      END
      $$
    `;
    await adminSql`
      CREATE TRIGGER fail_expiry_hold
      BEFORE UPDATE ON task04_synthetic.capacity_hold
      FOR EACH ROW
      WHEN (NEW.state = 'expired')
      EXECUTE FUNCTION task04_synthetic.fail_expiry_hold()
    `;
    return;
  }
  if (point === "capacity") {
    await adminSql`
      CREATE FUNCTION task04_synthetic.fail_expiry_capacity()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION USING ERRCODE = '23514',
          MESSAGE = 'SYNTHETIC_EXPIRY_CAPACITY_FAILURE';
      END
      $$
    `;
    await adminSql`
      CREATE TRIGGER fail_expiry_capacity
      BEFORE UPDATE ON task04_synthetic.capacity_unit
      FOR EACH ROW
      WHEN (
        OLD.capacity_hold_id IS NOT NULL
        AND NEW.capacity_hold_id IS NULL
      )
      EXECUTE FUNCTION task04_synthetic.fail_expiry_capacity()
    `;
    return;
  }
  if (point === "audit") {
    await adminSql`
      CREATE FUNCTION task04_synthetic.fail_expiry_audit()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION USING ERRCODE = '23514',
          MESSAGE = 'SYNTHETIC_EXPIRY_AUDIT_FAILURE';
      END
      $$
    `;
    await adminSql`
      CREATE TRIGGER fail_expiry_audit
      BEFORE INSERT ON task04_synthetic.synthetic_audit_record
      FOR EACH ROW
      WHEN (NEW.safe_action_code = 'BOOKING_EXPIRE')
      EXECUTE FUNCTION task04_synthetic.fail_expiry_audit()
    `;
    return;
  }
  await adminSql`
    CREATE FUNCTION task04_synthetic.fail_expiry_outbox()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'SYNTHETIC_EXPIRY_OUTBOX_FAILURE';
    END
    $$
  `;
  await adminSql`
    CREATE TRIGGER fail_expiry_outbox
    BEFORE INSERT ON task04_synthetic.transactional_outbox_record
    FOR EACH ROW
    WHEN (
      NEW.event_type IN (
        'booking.expired',
        'capacity_hold.expired'
      )
    )
    EXECUTE FUNCTION task04_synthetic.fail_expiry_outbox()
  `;
}

async function removeAtomicFailure(
  point: "booking" | "hold" | "capacity" | "audit" | "outbox",
): Promise<void> {
  const table =
    point === "booking"
      ? "booking"
      : point === "hold"
        ? "capacity_hold"
        : point === "capacity"
          ? "capacity_unit"
          : point === "audit"
            ? "synthetic_audit_record"
            : "transactional_outbox_record";
  await adminSql.unsafe(
    `DROP TRIGGER fail_expiry_${point} ` +
      `ON task04_synthetic.${table}`,
  );
  await adminSql.unsafe(
    `DROP FUNCTION task04_synthetic.fail_expiry_${point}()`,
  );
}

beforeAll(async () => {
  environment = parseTask04SandboxEnv(
    task04SyntheticEnvironmentInput(),
    new Date(FIXED_ENV_PARSE_TIME),
  );
  sql = createTask04SandboxSql(environment);
  secondSql = createTask04SandboxSql(environment);
  adminSql = postgres(TASK04_SANDBOX_OWNER_POSTGRES_URL, {
    max: 1,
    onnotice: () => undefined,
  });
});

beforeEach(resetFoundation);

afterAll(async () => {
  await Promise.all([
    closeTask04SandboxSql(sql),
    closeTask04SandboxSql(secondSql),
    adminSql.end({ timeout: 5 }),
  ]);
});

describe("Task 04 expired pending-booking cleanup worker", () => {
  it("expires eligible bookings and holds at the trusted-time boundary", async () => {
    const expired = await insertExpiryFixture("BOUNDARY-A", -1);
    const future = await insertExpiryFixture(
      "BOUNDARY-B",
      60 * 60 * 1_000,
    );

    const result = requireSuccess(
      await executeTask04ExpiredPendingBookingCleanup(
        sql,
        environment,
        { maxBatchSize: 2 },
      ),
    );

    expect(result).toEqual({
      success: true,
      data: { examined: 1, expired: 1, skipped: 0 },
    });
    expect(await persistedSnapshot(expired)).toMatchObject({
      booking_state: "expired",
      booking_version: 2,
      confirmation_deadline_utc: null,
      hold_state: "expired",
      hold_version: 2,
      capacity_hold_id: null,
      capacity_booking_id: null,
      capacity_version: 2,
      receipts: 1,
      audits: 2,
      events: 2,
    });
    expect(await persistedSnapshot(future)).toMatchObject({
      booking_state: "pending_confirmation",
      booking_version: 1,
      hold_state: "active",
      hold_version: 1,
      capacity_hold_id: future.holdId,
      receipts: 0,
      audits: 0,
      events: 0,
    });
  });

  it("writes exact minimized audit and outbox evidence atomically", async () => {
    const fixture = await insertExpiryFixture("EVIDENCE-A", -1_000);
    requireSuccess(
      await executeTask04ExpiredPendingBookingCleanup(
        sql,
        environment,
        { maxBatchSize: 1 },
      ),
    );

    const audits = await adminSql<{
      aggregate_type: string;
      prior_state: string;
      resulting_state: string;
      safe_reason_code: string;
      safe_action_code: string;
    }[]>`
      SELECT
        aggregate_type::text,
        prior_state,
        resulting_state,
        safe_reason_code,
        safe_action_code
      FROM task04_synthetic.synthetic_audit_record
      WHERE aggregate_id IN (${fixture.bookingId}, ${fixture.holdId})
      ORDER BY aggregate_type::text COLLATE "C"
    `;
    expect(audits).toEqual([
      {
        aggregate_type: "booking",
        prior_state: "pending_confirmation",
        resulting_state: "expired",
        safe_reason_code: "CONFIRMATION_WINDOW_EXPIRED",
        safe_action_code: "BOOKING_EXPIRE",
      },
      {
        aggregate_type: "capacity_hold",
        prior_state: "active",
        resulting_state: "expired",
        safe_reason_code: "HOLD_WINDOW_EXPIRED",
        safe_action_code: "BOOKING_EXPIRE",
      },
    ]);

    const events = await adminSql<{
      event_type: string;
      payload: Record<string, unknown>;
      dispatch_status: string;
      aggregate_version_superseded: boolean;
    }[]>`
      SELECT
        event_type,
        payload,
        dispatch_status::text,
        aggregate_version_superseded
      FROM task04_synthetic.transactional_outbox_record
      WHERE aggregate_id IN (${fixture.bookingId}, ${fixture.holdId})
      ORDER BY event_type COLLATE "C"
    `;
    expect(events).toEqual([
      {
        event_type: "booking.expired",
        payload: {
          previousState: "pending_confirmation",
          resultingState: "expired",
        },
        dispatch_status: "not_dispatched",
        aggregate_version_superseded: false,
      },
      {
        event_type: "capacity_hold.expired",
        payload: {
          ownerType: "pending_booking",
          resultingState: "expired",
        },
        dispatch_status: "not_dispatched",
        aggregate_version_superseded: false,
      },
    ]);
    expect(JSON.stringify({ audits, events })).not.toMatch(
      /contact|credential|token|message|patient|subject/i,
    );
  });

  it.each([
    ["confirmed", "consumed"],
    ["cancelled", "released"],
    ["rescheduled", "released"],
    ["expired", "expired"],
  ] as const)(
    "skips %s bookings with %s holds",
    async (bookingState, holdState) => {
      await insertExpiryFixture(
        `TERMINAL-${bookingState.toUpperCase()}`,
        -1_000,
        holdState,
        bookingState,
      );

      expect(
        requireSuccess(
          await executeTask04ExpiredPendingBookingCleanup(
            sql,
            environment,
            { maxBatchSize: 1 },
          ),
        ),
      ).toEqual({
        success: true,
        data: { examined: 0, expired: 0, skipped: 0 },
      });
    },
  );

  it("honours the bounded deterministic expiry and identity order", async () => {
    const first = await insertExpiryFixture("ORDER-A", -1_000);
    const second = await insertExpiryFixture("ORDER-B", -1_000);

    expect(
      requireSuccess(
        await executeTask04ExpiredPendingBookingCleanup(
          sql,
          environment,
          { maxBatchSize: 1 },
        ),
      ).data,
    ).toEqual({ examined: 1, expired: 1, skipped: 0 });
    expect((await persistedSnapshot(first)).booking_state).toBe(
      "expired",
    );
    expect((await persistedSnapshot(second)).booking_state).toBe(
      "pending_confirmation",
    );

    expect(
      requireSuccess(
        await executeTask04ExpiredPendingBookingCleanup(
          sql,
          environment,
          { maxBatchSize: 1 },
        ),
      ).data,
    ).toEqual({ examined: 1, expired: 1, skipped: 0 });
    expect((await persistedSnapshot(second)).booking_state).toBe(
      "expired",
    );
  });

  it("is idempotent across repeated cleanup runs", async () => {
    const fixture = await insertExpiryFixture("REPLAY-A", -1_000);
    const first = requireSuccess(
      await executeTask04ExpiredPendingBookingCleanup(
        sql,
        environment,
        { maxBatchSize: 1 },
      ),
    );
    const persisted = await persistedSnapshot(fixture);
    const second = requireSuccess(
      await executeTask04ExpiredPendingBookingCleanup(
        sql,
        environment,
        { maxBatchSize: 1 },
      ),
    );

    expect(first.data).toEqual({
      examined: 1,
      expired: 1,
      skipped: 0,
    });
    expect(second.data).toEqual({
      examined: 0,
      expired: 0,
      skipped: 0,
    });
    expect(await persistedSnapshot(fixture)).toEqual(persisted);
  });

  it("serializes two workers to one transition and one evidence set", async () => {
    const fixture = await insertExpiryFixture("CONCURRENT-A", -1);
    const [first, second] = await Promise.all([
      executeTask04ExpiredPendingBookingCleanup(
        sql,
        environment,
        { maxBatchSize: 1 },
      ),
      executeTask04ExpiredPendingBookingCleanup(
        secondSql,
        environment,
        { maxBatchSize: 1 },
      ),
    ]);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    const expiredCount = [first, second].reduce(
      (count, result) =>
        result.success ? count + result.data.expired : count,
      0,
    );
    expect(expiredCount).toBe(1);
    expect(await persistedSnapshot(fixture)).toMatchObject({
      booking_state: "expired",
      booking_version: 2,
      hold_state: "expired",
      hold_version: 2,
      capacity_hold_id: null,
      capacity_version: 2,
      receipts: 1,
      audits: 2,
      events: 2,
    });
  });

  it("cannot contradict a confirmation racing across the expiry boundary", async () => {
    const fixture = await insertExpiryFixture(
      "CONFIRM-RACE-A",
      3_000,
    );
    await adminSql`
      CREATE FUNCTION task04_synthetic.delay_racing_confirmation()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_sleep(
          GREATEST(
            EXTRACT(
              EPOCH FROM (
                OLD.confirmation_deadline_utc +
                  interval '500 milliseconds' -
                  clock_timestamp()
              )
            ),
            0
          )
        );
        RETURN NEW;
      END
      $$
    `;
    await adminSql`
      CREATE TRIGGER delay_racing_confirmation
      BEFORE UPDATE ON task04_synthetic.booking
      FOR EACH ROW
      WHEN (
        OLD.state = 'pending_confirmation'
        AND NEW.state = 'confirmed'
      )
      EXECUTE FUNCTION
        task04_synthetic.delay_racing_confirmation()
    `;

    const confirmation = executeTask04BookingConfirm(
      sql,
      environment,
      encoder.encode(
        JSON.stringify({
          bookingReference: fixture.bookingId,
          expectedAggregateVersion: 1,
          idempotencyKey:
            "SYNTH-IDEMPOTENCY-EXPIRY-CONFIRM-RACE-0001",
        }),
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 3_100));
    const cleanup = executeTask04ExpiredPendingBookingCleanup(
      secondSql,
      environment,
      { maxBatchSize: 1 },
    );
    let results;
    try {
      results = await Promise.all([confirmation, cleanup]);
    } finally {
      await adminSql`
        DROP TRIGGER delay_racing_confirmation
        ON task04_synthetic.booking
      `;
      await adminSql`
        DROP FUNCTION
          task04_synthetic.delay_racing_confirmation()
      `;
    }

    expect(results[0]).toMatchObject({
      success: true,
      data: {
        bookingReference: fixture.bookingId,
        status: "confirmed",
        holdStatus: "consumed",
      },
    });
    expect(results[1]).toEqual({
      success: true,
      data: { examined: 1, expired: 0, skipped: 1 },
    });
    const [persisted] = await adminSql<{
      booking_state: string;
      hold_state: string;
      unit_booking_id: string | null;
      unit_hold_id: string | null;
      confirm_receipts: number;
      expiry_receipts: number;
      confirm_audits: number;
      expiry_audits: number;
      confirm_events: number;
      expiry_events: number;
    }[]>`
      SELECT
        booking.state::text AS booking_state,
        hold.state::text AS hold_state,
        unit.booking_id AS unit_booking_id,
        unit.capacity_hold_id AS unit_hold_id,
        (
          SELECT count(*)::integer
          FROM task04_synthetic.idempotency_record
          WHERE operation = 'booking:confirm'
        ) AS confirm_receipts,
        (
          SELECT count(*)::integer
          FROM task04_synthetic.idempotency_record
          WHERE operation = 'booking:expire'
        ) AS expiry_receipts,
        (
          SELECT count(*)::integer
          FROM task04_synthetic.synthetic_audit_record
          WHERE safe_action_code = 'BOOKING_CONFIRM'
        ) AS confirm_audits,
        (
          SELECT count(*)::integer
          FROM task04_synthetic.synthetic_audit_record
          WHERE safe_action_code = 'BOOKING_EXPIRE'
        ) AS expiry_audits,
        (
          SELECT count(*)::integer
          FROM task04_synthetic.transactional_outbox_record
          WHERE event_type = 'booking.confirmed'
        ) AS confirm_events,
        (
          SELECT count(*)::integer
          FROM task04_synthetic.transactional_outbox_record
          WHERE event_type IN (
            'booking.expired',
            'capacity_hold.expired'
          )
        ) AS expiry_events
      FROM task04_synthetic.booking AS booking
      JOIN task04_synthetic.capacity_hold AS hold
        ON hold.pending_booking_id = booking.id
       AND hold.pharmacy_id = booking.pharmacy_id
      JOIN task04_synthetic.capacity_unit AS unit
        ON unit.id = hold.capacity_unit_id
       AND unit.pharmacy_id = hold.pharmacy_id
      WHERE booking.id = ${fixture.bookingId}
        AND booking.pharmacy_id = ${PHARMACY_ID}
    `;
    expect(persisted).toEqual({
      booking_state: "confirmed",
      hold_state: "consumed",
      unit_booking_id: fixture.bookingId,
      unit_hold_id: null,
      confirm_receipts: 1,
      expiry_receipts: 0,
      confirm_audits: 1,
      expiry_audits: 0,
      confirm_events: 1,
      expiry_events: 0,
    });
  });

  it("fails closed outside active approval without mutating candidates", async () => {
    const fixture = await insertExpiryFixture("LIFECYCLE-A", -1_000);
    const before = await persistedSnapshot(fixture);
    const expiredEnvironment = {
      ...environment,
      expiresAt: new Date(instantFromDatabaseNow(-1)),
    } as Task04SandboxEnv;

    expect(
      await executeTask04ExpiredPendingBookingCleanup(
        sql,
        expiredEnvironment,
        { maxBatchSize: 1 },
      ),
    ).toEqual({
      success: false,
      error: {
        code: "FEATURE_DISABLED",
        message: "This service is currently unavailable.",
      },
    });
    expect(await persistedSnapshot(fixture)).toEqual(before);
  });

  it("fails wrong pharmacy scope closed with zero mutation", async () => {
    const fixture = await insertExpiryFixture("SCOPE-A", -1_000);
    const before = await persistedSnapshot(fixture);
    const wrongScope = {
      ...environment,
      pharmacyId: OTHER_PHARMACY_ID,
    } as Task04SandboxEnv;

    expect(
      await executeTask04ExpiredPendingBookingCleanup(
        sql,
        wrongScope,
        { maxBatchSize: 1 },
      ),
    ).toMatchObject({
      success: false,
      error: { code: "FEATURE_DISABLED" },
    });
    expect(await persistedSnapshot(fixture)).toEqual(before);
  });

  it("fails a disabled sandbox closed with zero mutation", async () => {
    const fixture = await insertExpiryFixture("DISABLED-A", -1_000);
    const before = await persistedSnapshot(fixture);
    const disabledEnvironment = {
      ...environment,
      disabled: true,
    } as Task04SandboxEnv;

    expect(
      await executeTask04ExpiredPendingBookingCleanup(
        sql,
        disabledEnvironment,
        { maxBatchSize: 1 },
      ),
    ).toMatchObject({
      success: false,
      error: { code: "FEATURE_DISABLED" },
    });
    expect(await persistedSnapshot(fixture)).toEqual(before);
  });

  it.each([
    "booking",
    "hold",
    "capacity",
    "audit",
    "outbox",
  ] as const)(
    "rolls back every effect when %s persistence fails",
    async (point) => {
      const fixture = await insertExpiryFixture(
        `ROLLBACK-${point.toUpperCase()}`,
        -1_000,
      );
      const before = await persistedSnapshot(fixture);
      await installAtomicFailure(point);
      let result: Task04BookingExpiryWorkerResult;
      try {
        result =
          await executeTask04ExpiredPendingBookingCleanup(
            sql,
            environment,
            { maxBatchSize: 1 },
          );
      } finally {
        await removeAtomicFailure(point);
      }

      expect(result!).toEqual({
        success: false,
        error: {
          code: "TEMPORARILY_UNAVAILABLE",
          message: "This service is temporarily unavailable.",
        },
      });
      expect(await persistedSnapshot(fixture)).toEqual(before);
    },
  );
});
