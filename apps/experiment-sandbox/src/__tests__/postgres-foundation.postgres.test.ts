import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import postgres from "postgres";

import {
  TASK04_SANDBOX_OWNER_POSTGRES_URL,
  TASK04_SANDBOX_POSTGRES_URL,
  parseTask04SandboxEnv,
  task04SyntheticEnvironmentInput,
} from "../env/server";
import { TASK04_SYNTHETIC_REFERENCES } from "../fixtures/synthetic";
import {
  createTask04SandboxSql,
  type Task04SandboxSql,
} from "../db/client";
import {
  TASK04_FOUNDATION_FIXTURES,
  seedTask04Foundation,
} from "../db/fixtures";
import { TASK04_TABLES } from "../db/schema";

const PHARMACY_ID = "SYNTH-PHARMACY-TASK04-LOCAL";
const OTHER_PHARMACY_ID = "SYNTH-PHARMACY-TASK04-OTHER";
const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);
const DIGEST_D = "d".repeat(64);

let sql: Task04SandboxSql;
let adminSql: Task04SandboxSql;
let task04Env: ReturnType<typeof sandboxDatabaseEnv>;

function sandboxDatabaseEnv() {
  return parseTask04SandboxEnv(
    task04SyntheticEnvironmentInput(),
    new Date("2026-08-04T00:00:00.000Z"),
  );
}

type ExpectedPostgresError = {
  code: string;
  constraint?: string;
  safeIdentifier?: string;
};

async function expectPostgresError(
  action: () => Promise<unknown>,
  expected: ExpectedPostgresError,
): Promise<void> {
  let thrown: unknown;
  try {
    await action();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeTruthy();
  const postgresError = thrown as {
    code?: string;
    constraint_name?: string;
    message?: string;
  };
  expect(postgresError.code).toBe(expected.code);
  if (expected.constraint) {
    expect(postgresError.constraint_name).toBe(expected.constraint);
  }
  if (expected.safeIdentifier) {
    expect(postgresError.message).toContain(expected.safeIdentifier);
  }
}

async function insertWaitlistEntry(
  id: string,
  subjectReference: string,
): Promise<void> {
  await sql`
    INSERT INTO task04_synthetic.waitlist_entry (
      id,
      pharmacy_id,
      service_category_id,
      modality_preference,
      actor_reference,
      subject_reference,
      state,
      expires_at_utc,
      safe_reason_code,
      created_at_utc,
      transitioned_at_utc
    )
    VALUES (
      ${id},
      ${PHARMACY_ID},
      ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
      'in_person',
      ${TASK04_SYNTHETIC_REFERENCES.patient},
      ${subjectReference},
      'active',
      '2026-08-05T00:00:00.000Z',
      'WAITLIST_REQUESTED',
      '2026-08-01T12:00:00.000Z',
      '2026-08-01T12:00:00.000Z'
    )
  `;
}

async function createPendingBookingWithHold(
  holdExpiresAt = "2026-08-04T13:55:00.000Z",
): Promise<{
  bookingId: string;
  holdId: string;
}> {
  const bookingId = "SYNTH-BOOKING-TASK04-0001";
  const holdId = "SYNTH-HOLD-TASK04-0001";
  await sql.begin(async (transaction) => {
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
        '2026-08-04T13:55:00.000Z',
        'BOOKING_REQUESTED',
        '2026-08-01T12:00:00.000Z',
        '2026-08-01T12:00:00.000Z'
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
        ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0]},
        'pending_booking',
        ${bookingId},
        'active',
        ${holdExpiresAt},
        '2026-08-01T12:00:00.000Z',
        '2026-08-01T12:00:00.000Z'
      )
    `;
    await transaction`
      UPDATE task04_synthetic.capacity_unit
      SET capacity_hold_id = ${holdId},
          aggregate_version = aggregate_version + 1,
          transitioned_at_utc = statement_timestamp()
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0]}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
  });
  return { bookingId, holdId };
}

async function createPendingOfferWithHold(
  holdExpiresAt = "2026-08-04T13:50:00.000Z",
): Promise<{
  waitlistId: string;
  offerId: string;
  holdId: string;
}> {
  const waitlistId = "SYNTH-WAITLIST-TASK04-OFFER-0001";
  const offerId = "SYNTH-OFFER-TASK04-0001";
  const holdId = "SYNTH-HOLD-TASK04-OFFER-0001";
  await insertWaitlistEntry(
    waitlistId,
    "SYNTH-PATIENT-TASK04-OFFER-0001",
  );
  await sql.begin(async (transaction) => {
    await transaction`
      UPDATE task04_synthetic.waitlist_entry
      SET state = 'offered',
          aggregate_version = aggregate_version + 1,
          transitioned_at_utc = '2026-08-01T12:00:00.000Z'
      WHERE id = ${waitlistId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    await transaction`
      INSERT INTO task04_synthetic.waitlist_offer (
        id,
        pharmacy_id,
        waitlist_entry_id,
        slot_id,
        state,
        expires_at_utc,
        safe_reason_code,
        created_at_utc,
        transitioned_at_utc
      )
      VALUES (
        ${offerId},
        ${PHARMACY_ID},
        ${waitlistId},
        ${TASK04_FOUNDATION_FIXTURES.slotId},
        'pending',
        '2026-08-04T13:50:00.000Z',
        'CAPACITY_BECAME_AVAILABLE',
        '2026-08-01T12:00:00.000Z',
        '2026-08-01T12:00:00.000Z'
      )
    `;
    await transaction`
      INSERT INTO task04_synthetic.capacity_hold (
        id,
        pharmacy_id,
        slot_id,
        capacity_unit_id,
        purpose,
        waitlist_offer_id,
        state,
        expires_at_utc,
        created_at_utc,
        transitioned_at_utc
      )
      VALUES (
        ${holdId},
        ${PHARMACY_ID},
        ${TASK04_FOUNDATION_FIXTURES.slotId},
        ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0]},
        'waitlist_offer',
        ${offerId},
        'active',
        ${holdExpiresAt},
        '2026-08-01T12:00:00.000Z',
        '2026-08-01T12:00:00.000Z'
      )
    `;
    await transaction`
      UPDATE task04_synthetic.capacity_unit
      SET capacity_hold_id = ${holdId},
          aggregate_version = aggregate_version + 1,
          transitioned_at_utc = '2026-08-01T12:00:00.000Z'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0]}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
  });
  return { waitlistId, offerId, holdId };
}

async function insertReusableCredential(
  bookingId: string,
  id = "SYNTH-CREDENTIAL-REUSABLE-0001",
  capabilityReference = "SYNTH-CAPABILITY-TASK04-0001",
): Promise<void> {
  await sql`
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
      expires_at_utc
    )
    VALUES (
      ${id},
      ${PHARMACY_ID},
      'reusable',
      ${capabilityReference},
      ${bookingId},
      ARRAY['booking:view', 'booking:cancel'],
      ${TASK04_SYNTHETIC_REFERENCES.patient},
      ${TASK04_SYNTHETIC_REFERENCES.patient},
      'SYNTH-SESSION-TASK04-0001',
      'active',
      '2026-08-01T12:00:00.000Z',
      '2026-08-05T00:00:00.000Z'
    )
  `;
}

async function insertOneTimeCredential(
  bookingId: string,
  sourceCredentialId: string,
  id = "SYNTH-CREDENTIAL-ONETIME-0001",
  action = "booking:cancel",
  digest = DIGEST_A,
  capabilityReference = "SYNTH-CAPABILITY-TASK04-0001",
): Promise<void> {
  await sql`
    INSERT INTO task04_synthetic.management_credential (
      id,
      pharmacy_id,
      usage_mode,
      credential_digest,
      capability_reference,
      source_credential_id,
      booking_id,
      permitted_actions,
      actor_reference,
      subject_reference,
      state,
      issued_at_utc,
      expires_at_utc
    )
    VALUES (
      ${id},
      ${PHARMACY_ID},
      'one_time',
      ${digest},
      ${capabilityReference},
      ${sourceCredentialId},
      ${bookingId},
      ARRAY[${action}],
      ${TASK04_SYNTHETIC_REFERENCES.patient},
      ${TASK04_SYNTHETIC_REFERENCES.patient},
      'active',
      '2026-08-01T12:00:00.000Z',
      '2026-08-05T00:00:00.000Z'
    )
  `;
}

async function insertOutboxEvent(input: {
  id: string;
  eventType: string;
  aggregateType:
    | "booking"
    | "waitlist_entry"
    | "waitlist_offer"
    | "capacity_hold"
    | "management_credential"
    | "automation_control";
  aggregateId: string;
  safeReasonCode: string;
  payload: postgres.JSONValue;
  actorType?:
    | "synthetic_patient"
    | "synthetic_delegate"
    | "synthetic_staff"
    | "synthetic_system_worker";
}): Promise<void> {
  await sql`
    INSERT INTO task04_synthetic.transactional_outbox_record (
      id,
      pharmacy_id,
      event_type,
      aggregate_type,
      aggregate_id,
      aggregate_version,
      actor_type,
      safe_reason_code,
      payload
    )
    VALUES (
      ${input.id},
      ${PHARMACY_ID},
      ${input.eventType},
      ${input.aggregateType},
      ${input.aggregateId},
      1,
      ${input.actorType ?? "synthetic_patient"},
      ${input.safeReasonCode},
      ${sql.json(input.payload)}
    )
  `;
}

async function insertValidOutboxEvent(
  label: string,
  input: Parameters<typeof insertOutboxEvent>[0],
): Promise<void> {
  try {
    await insertOutboxEvent(input);
  } catch (error) {
    const postgresError = error as {
      code?: string;
      constraint_name?: string;
    };
    throw new Error(
      [
        "TASK04_VALID_OUTBOX_FIXTURE_REJECTED",
        label,
        input.eventType,
        postgresError.code ?? "UNKNOWN_SQLSTATE",
        postgresError.constraint_name ?? "UNKNOWN_CONSTRAINT",
      ].join(":"),
      { cause: error },
    );
  }
}

beforeAll(async () => {
  task04Env = sandboxDatabaseEnv();
  adminSql = postgres(TASK04_SANDBOX_OWNER_POSTGRES_URL, {
    max: 5,
    connect_timeout: 5,
    idle_timeout: 5,
    connection: {
      application_name: "agentoma-task04-synthetic-tests-owner",
      search_path: "task04_synthetic, public",
    },
    onnotice: () => undefined,
  });
  sql = createTask04SandboxSql(task04Env);
  await Promise.all([adminSql`SELECT 1`, sql`SELECT 1`]);
});

beforeEach(async () => {
  await adminSql`TRUNCATE task04_synthetic.sandbox_scope CASCADE`;
  await seedTask04Foundation(adminSql, task04Env);
});

afterAll(async () => {
  await Promise.all([
    sql.end({ timeout: 5 }),
    adminSql.end({ timeout: 5 }),
  ]);
});

describe("Task 04 PostgreSQL foundation", () => {
  it("uses the isolated synthetic database and installs every Slice 1 table", async () => {
    const [identity] = await sql<{
      database_name: string;
      schema_name: string;
      user_name: string;
    }[]>`
      SELECT
        current_database() AS database_name,
        current_schema() AS schema_name,
        current_user AS user_name
    `;
    expect(identity).toEqual({
      database_name: "task04_synthetic_db",
      schema_name: "task04_synthetic",
      user_name: "task04_synthetic_runtime",
    });

    await expect(
      sql`SELECT id FROM booking_slot LIMIT 0`,
    ).resolves.toBeDefined();

    const tables = await sql<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'task04_synthetic'
      ORDER BY tablename
    `;
    expect(tables.map(({ tablename }) => tablename).sort()).toEqual(
      [...TASK04_TABLES].sort(),
    );

    const publicTables = await sql<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `;
    const publicTableNames = publicTables.map(({ tablename }) => tablename);
    for (const task04Table of TASK04_TABLES) {
      expect(publicTableNames).not.toContain(task04Table);
    }

    await expectPostgresError(
      () => sql`SET ROLE task04_synthetic_owner`,
      {
        code: "42501",
        safeIdentifier: "permission denied to set role",
      },
    );
    await expectPostgresError(
      () => sql`CREATE TABLE public.task04_forbidden_runtime_object (id integer)`,
      {
        code: "42501",
        safeIdentifier: "permission denied for schema public",
      },
    );
  });

  it("pins every runtime row to the singleton server-owned pharmacy scope", async () => {
    await expectPostgresError(
      () => sql`
        INSERT INTO task04_synthetic.sandbox_scope (pharmacy_id)
        VALUES (${OTHER_PHARMACY_ID})
      `,
      {
        code: "42501",
        safeIdentifier: "permission denied for table sandbox_scope",
      },
    );

    await expectPostgresError(
      () => sql`
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
          'SYNTH-SERVICE-TASK04-X001',
          ${OTHER_PHARMACY_ID},
          'Synthetic alternate service',
          ARRAY['in_person']::task04_synthetic.appointment_modality[],
          false,
          false,
          'active'
        )
      `,
      {
        code: "23503",
        constraint: "service_category_pharmacy_id_fkey",
      },
    );
  });

  it("enforces valid states, synthetic markers, and a permanently local outbox", async () => {
    await expectPostgresError(
      () => sql`
        INSERT INTO task04_synthetic.waitlist_entry (
          id,
          pharmacy_id,
          service_category_id,
          modality_preference,
          actor_reference,
          subject_reference,
          state,
          expires_at_utc,
          safe_reason_code
        )
        VALUES (
          'SYNTH-WAITLIST-TASK04-X001',
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
          'in_person',
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'unknown_state',
          '2026-08-05T00:00:00.000Z',
          'WAITLIST_REQUESTED'
        )
      `,
      { code: "22P02", safeIdentifier: "invalid input value for enum" },
    );

    await expectPostgresError(
      () => sql`
        INSERT INTO task04_synthetic.transactional_outbox_record (
          id,
          pharmacy_id,
          event_type,
          aggregate_type,
          aggregate_id,
          aggregate_version,
          actor_type,
          safe_reason_code,
          dispatch_status,
          payload
        )
        VALUES (
          'SYNTH-EVENT-TASK04-X001',
          ${PHARMACY_ID},
          'booking.created',
          'booking',
          'SYNTH-BOOKING-TASK04-X001',
          1,
          'synthetic_patient',
          'BOOKING_REQUESTED',
          'dispatched',
          '{
            "resultingState":"confirmed",
            "modality":"in_person",
            "startTimeUtc":"2026-08-04T14:00:00.000Z",
            "endTimeUtc":"2026-08-04T14:30:00.000Z"
          }'::jsonb
        )
      `,
      {
        code: "23514",
        constraint: "transactional_outbox_dispatch_status_check",
      },
    );

    await expectPostgresError(
      () => sql`
        INSERT INTO task04_synthetic.service_category (
          id,
          pharmacy_id,
          public_label,
          supported_modalities,
          requires_staff_confirmation,
          waitlist_enabled,
          state,
          synthetic_marker
        )
        VALUES (
          'SYNTH-SERVICE-TASK04-X002',
          ${PHARMACY_ID},
          'Synthetic marked service',
          ARRAY['in_person']::task04_synthetic.appointment_modality[],
          false,
          false,
          'active',
          'NOT_SYNTHETIC'
        )
      `,
      {
        code: "23514",
        constraint: "service_category_synthetic_marker_check",
      },
    );
  });

  it("prevents duplicate active waitlist entries in the approved live scope", async () => {
    await insertWaitlistEntry(
      "SYNTH-WAITLIST-TASK04-0001",
      TASK04_SYNTHETIC_REFERENCES.patient,
    );
    await expectPostgresError(
      () =>
        insertWaitlistEntry(
          "SYNTH-WAITLIST-TASK04-0002",
          TASK04_SYNTHETIC_REFERENCES.patient,
        ),
      { code: "23505", constraint: "waitlist_entry_one_live_scope" },
    );
  });

  it("requires pending-confirmation bookings to own one active hold and one unit", async () => {
    await expectPostgresError(
      () => sql`
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
          safe_reason_code
        )
        VALUES (
          'SYNTH-BOOKING-TASK04-NOHOLD',
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          'in_person',
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'pending_confirmation',
          '2026-08-04T13:55:00.000Z',
          'BOOKING_REQUESTED'
        )
      `,
      {
        code: "23514",
        safeIdentifier: "TASK04_PENDING_BOOKING_HOLD_REQUIRED",
      },
    );

    const { bookingId, holdId } = await createPendingBookingWithHold();
    const [ownership] = await sql<{
      booking_state: string;
      hold_state: string;
      capacity_hold_id: string;
    }[]>`
      SELECT
        booking.state::text AS booking_state,
        hold.state::text AS hold_state,
        unit.capacity_hold_id::text AS capacity_hold_id
      FROM task04_synthetic.booking AS booking
      JOIN task04_synthetic.capacity_hold AS hold
        ON hold.pending_booking_id = booking.id
       AND hold.pharmacy_id = booking.pharmacy_id
      JOIN task04_synthetic.capacity_unit AS unit
        ON unit.capacity_hold_id = hold.id
       AND unit.pharmacy_id = hold.pharmacy_id
      WHERE booking.id = ${bookingId}
        AND hold.id = ${holdId}
    `;
    expect(ownership).toEqual({
      booking_state: "pending_confirmation",
      hold_state: "active",
      capacity_hold_id: holdId,
    });
  });

  it("rejects duplicate active booking holds and mismatched booking deadlines", async () => {
    const { bookingId } = await createPendingBookingWithHold();
    await expectPostgresError(
      () => sql`
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
          'SYNTH-HOLD-TASK04-DUPLICATE',
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[1]},
          'pending_booking',
          ${bookingId},
          'active',
          '2026-08-04T13:55:00.000Z',
          '2026-08-01T12:00:00.000Z',
          '2026-08-01T12:00:00.000Z'
        )
      `,
      {
        code: "23505",
        constraint: "capacity_hold_one_active_booking",
      },
    );

    await adminSql`TRUNCATE task04_synthetic.sandbox_scope CASCADE`;
    await seedTask04Foundation(adminSql, task04Env);
    await expectPostgresError(
      () => createPendingBookingWithHold("2026-08-04T13:54:00.000Z"),
      {
        code: "23514",
        safeIdentifier: "TASK04_PENDING_BOOKING_HOLD_DEADLINE_MISMATCH",
      },
    );
  });

  it("requires pending waitlist offers and active holds to share one deadline", async () => {
    const valid = await createPendingOfferWithHold();
    const [agreement] = await sql<{
      offer_expires_at: string;
      hold_expires_at: string;
    }[]>`
      SELECT
        offer.expires_at_utc::text AS offer_expires_at,
        hold.expires_at_utc::text AS hold_expires_at
      FROM task04_synthetic.waitlist_offer AS offer
      JOIN task04_synthetic.capacity_hold AS hold
        ON hold.waitlist_offer_id = offer.id
       AND hold.pharmacy_id = offer.pharmacy_id
      WHERE offer.id = ${valid.offerId}
    `;
    expect(agreement.offer_expires_at).toBe(agreement.hold_expires_at);

    await adminSql`TRUNCATE task04_synthetic.sandbox_scope CASCADE`;
    await seedTask04Foundation(adminSql, task04Env);
    await expectPostgresError(
      () => createPendingOfferWithHold("2026-08-04T13:49:00.000Z"),
      {
        code: "23514",
        safeIdentifier: "TASK04_PENDING_OFFER_HOLD_DEADLINE_MISMATCH",
      },
    );
  });

  it("releases an active hold exactly once and blocks terminal reactivation", async () => {
    const { bookingId, holdId } = await createPendingBookingWithHold();
    await sql.begin(async (transaction) => {
      await transaction`
        UPDATE task04_synthetic.capacity_unit
        SET capacity_hold_id = NULL,
            aggregate_version = aggregate_version + 1,
            transitioned_at_utc = statement_timestamp()
        WHERE capacity_hold_id = ${holdId}
          AND pharmacy_id = ${PHARMACY_ID}
      `;
      await transaction`
        UPDATE task04_synthetic.capacity_hold
        SET state = 'released',
            released_at_utc = statement_timestamp(),
            aggregate_version = aggregate_version + 1,
            transitioned_at_utc = statement_timestamp()
        WHERE id = ${holdId}
          AND pharmacy_id = ${PHARMACY_ID}
          AND state = 'active'
      `;
      await transaction`
        UPDATE task04_synthetic.booking
        SET state = 'cancelled',
            confirmation_deadline_utc = NULL,
            safe_reason_code = 'ACTOR_CANCELLED',
            aggregate_version = aggregate_version + 1,
            transitioned_at_utc = statement_timestamp()
        WHERE id = ${bookingId}
          AND pharmacy_id = ${PHARMACY_ID}
          AND state = 'pending_confirmation'
      `;
    });

    await expectPostgresError(
      () => sql`
        UPDATE task04_synthetic.capacity_hold
        SET state = 'active',
            released_at_utc = NULL
        WHERE id = ${holdId}
          AND pharmacy_id = ${PHARMACY_ID}
      `,
      {
        code: "23514",
        safeIdentifier: "TASK04_TERMINAL_HOLD_IMMUTABLE",
      },
    );
  });

  it("cannot create more capacity-unit rows than the configured slot capacity", async () => {
    await expectPostgresError(
      () => sql`
        INSERT INTO task04_synthetic.capacity_unit (
          id,
          pharmacy_id,
          slot_id,
          unit_sequence
        )
        VALUES (
          'SYNTH-CAPACITY-TASK04-0003',
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          3
        )
      `,
      {
        code: "23514",
        safeIdentifier: "TASK04_CAPACITY_UNIT_CEILING",
      },
    );
  });

  it("pins invariant functions to the synthetic schema under a hostile session search path", async () => {
    await expectPostgresError(
      () =>
        sql.begin(async (transaction) => {
          await transaction`SET LOCAL search_path TO public`;
          await transaction`
            INSERT INTO task04_synthetic.capacity_unit (
              id,
              pharmacy_id,
              slot_id,
              unit_sequence
            )
            VALUES (
              'SYNTH-CAPACITY-TASK04-0003',
              ${PHARMACY_ID},
              ${TASK04_FOUNDATION_FIXTURES.slotId},
              3
            )
          `;
        }),
      {
        code: "23514",
        safeIdentifier: "TASK04_CAPACITY_UNIT_CEILING",
      },
    );
  });

  it("serializes competing capacity-unit inserts so only configured capacity commits", async () => {
    const slotId = "SYNTH-SLOT-TASK04-CONCURRENCY";
    await sql`
      INSERT INTO task04_synthetic.booking_slot (
        id,
        pharmacy_id,
        service_category_id,
        modality,
        starts_at_utc,
        ends_at_utc,
        display_timezone,
        configured_capacity,
        state,
        created_at_utc,
        transitioned_at_utc
      )
      VALUES (
        ${slotId},
        ${PHARMACY_ID},
        ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
        'in_person',
        '2026-08-04T16:00:00.000Z',
        '2026-08-04T16:30:00.000Z',
        'America/Toronto',
        1,
        'active',
        '2026-08-01T12:00:00.000Z',
        '2026-08-01T12:00:00.000Z'
      )
    `;

    const connectionA = postgres(TASK04_SANDBOX_POSTGRES_URL, {
      max: 1,
      connection: {
        application_name: "agentoma-task04-capacity-a",
        search_path: "task04_synthetic, public",
      },
    });
    const connectionB = postgres(TASK04_SANDBOX_POSTGRES_URL, {
      max: 1,
      connection: {
        application_name: "agentoma-task04-capacity-b",
        search_path: "task04_synthetic, public",
      },
    });

    let releaseConnectionA: () => void = () => undefined;
    const holdConnectionA = new Promise<void>((resolve) => {
      releaseConnectionA = resolve;
    });
    let markConnectionAReady: () => void = () => undefined;
    const connectionAReady = new Promise<void>((resolve) => {
      markConnectionAReady = resolve;
    });
    let markConnectionBStarted: () => void = () => undefined;
    const connectionBStarted = new Promise<void>((resolve) => {
      markConnectionBStarted = resolve;
    });

    try {
      const transactionA = connectionA.begin(async (transaction) => {
        await transaction`
          INSERT INTO task04_synthetic.capacity_unit (
            id,
            pharmacy_id,
            slot_id,
            unit_sequence
          )
          VALUES (
            'SYNTH-CAPACITY-CONCURRENT-A',
            ${PHARMACY_ID},
            ${slotId},
            1
          )
        `;
        markConnectionAReady();
        await holdConnectionA;
      });
      await connectionAReady;

      const transactionB = connectionB.begin(async (transaction) => {
        markConnectionBStarted();
        await transaction`
          INSERT INTO task04_synthetic.capacity_unit (
            id,
            pharmacy_id,
            slot_id,
            unit_sequence
          )
          VALUES (
            'SYNTH-CAPACITY-CONCURRENT-B',
            ${PHARMACY_ID},
            ${slotId},
            2
          )
        `;
      });
      const transactionBOutcome = transactionB.then(
        () => ({ error: undefined }),
        (error: unknown) => ({ error }),
      );
      await connectionBStarted;

      let connectionBIsWaiting = false;
      for (let attempt = 0; attempt < 100 && !connectionBIsWaiting; attempt += 1) {
        const [waiting] = await adminSql<{ is_waiting: boolean }[]>`
          SELECT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_stat_activity
            WHERE application_name = 'agentoma-task04-capacity-b'
              AND wait_event_type = 'Lock'
          ) AS is_waiting
        `;
        connectionBIsWaiting = waiting?.is_waiting === true;
        if (!connectionBIsWaiting) {
          await adminSql`SELECT pg_catalog.pg_sleep(0.01)`;
        }
      }
      expect(connectionBIsWaiting).toBe(true);

      releaseConnectionA();
      await transactionA;
      await expectPostgresError(
        async () => {
          const outcome = await transactionBOutcome;
          if (outcome.error) throw outcome.error;
        },
        {
          code: "23514",
          safeIdentifier: "TASK04_CAPACITY_UNIT_CEILING",
        },
      );

      const [count] = await sql<{ unit_count: number }[]>`
        SELECT count(*)::integer AS unit_count
        FROM task04_synthetic.capacity_unit
        WHERE pharmacy_id = ${PHARMACY_ID}
          AND slot_id = ${slotId}
      `;
      expect(count.unit_count).toBe(1);
    } finally {
      releaseConnectionA();
      await Promise.all([
        connectionA.end({ timeout: 5 }),
        connectionB.end({ timeout: 5 }),
      ]);
    }
  });

  it("stores a reusable capability beside a derived digest-only one-time credential", async () => {
    const credentialColumns = await sql<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'task04_synthetic'
        AND table_name = 'management_credential'
    `;
    const names = credentialColumns.map(({ column_name }) => column_name);
    expect(names).toContain("credential_digest");
    expect(names).not.toEqual(
      expect.arrayContaining(["credential", "raw_token", "token", "secret"]),
    );

    const { bookingId } = await createPendingBookingWithHold();
    const reusableId = "SYNTH-CREDENTIAL-REUSABLE-0001";
    await insertReusableCredential(bookingId, reusableId);
    await insertOneTimeCredential(bookingId, reusableId);

    const credentials = await sql<{
      id: string;
      usage_mode: string;
      credential_digest: string | null;
      source_credential_id: string | null;
      capability_reference: string;
    }[]>`
      SELECT
        id,
        usage_mode::text,
        credential_digest::text,
        source_credential_id::text,
        capability_reference::text
      FROM task04_synthetic.management_credential
      ORDER BY usage_mode
    `;
    expect(credentials).toEqual([
      {
        id: "SYNTH-CREDENTIAL-ONETIME-0001",
        usage_mode: "one_time",
        credential_digest: DIGEST_A,
        source_credential_id: reusableId,
        capability_reference: "SYNTH-CAPABILITY-TASK04-0001",
      },
      {
        id: reusableId,
        usage_mode: "reusable",
        credential_digest: null,
        source_credential_id: null,
        capability_reference: "SYNTH-CAPABILITY-TASK04-0001",
      },
    ]);
  });

  it("rejects duplicate active one-time actions and prohibited one-time view actions", async () => {
    const { bookingId } = await createPendingBookingWithHold();
    const reusableId = "SYNTH-CREDENTIAL-REUSABLE-0001";
    await insertReusableCredential(bookingId, reusableId);
    await insertOneTimeCredential(bookingId, reusableId);

    await expectPostgresError(
      () =>
        insertOneTimeCredential(
          bookingId,
          reusableId,
          "SYNTH-CREDENTIAL-ONETIME-0002",
          "booking:cancel",
          DIGEST_B,
        ),
      {
        code: "23505",
        constraint: "management_credential_one_active_one_time_action",
      },
    );

    await expectPostgresError(
      () =>
        insertOneTimeCredential(
          bookingId,
          reusableId,
          "SYNTH-CREDENTIAL-ONETIME-0003",
          "booking:view",
          DIGEST_C,
        ),
      {
        code: "23514",
        constraint: "management_credential_usage_contract",
      },
    );
  });

  it("prevents a terminal management credential from becoming active again", async () => {
    const { bookingId } = await createPendingBookingWithHold();
    const reusableId = "SYNTH-CREDENTIAL-REUSABLE-0001";
    const oneTimeId = "SYNTH-CREDENTIAL-ONETIME-0001";
    await insertReusableCredential(bookingId, reusableId);
    await insertOneTimeCredential(bookingId, reusableId, oneTimeId);
    await sql`
      UPDATE task04_synthetic.management_credential
      SET state = 'consumed',
          consumed_at_utc = '2026-08-02T00:00:00.000Z'
      WHERE id = ${oneTimeId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;

    await expectPostgresError(
      () => sql`
        UPDATE task04_synthetic.management_credential
        SET state = 'active',
            consumed_at_utc = NULL
        WHERE id = ${oneTimeId}
          AND pharmacy_id = ${PHARMACY_ID}
      `,
      {
        code: "23514",
        safeIdentifier: "TASK04_TERMINAL_CREDENTIAL_IMMUTABLE",
      },
    );
  });

  it("enforces preference shape and the configured synthetic limits independently", async () => {
    const { bookingId } = await createPendingBookingWithHold();

    await expectPostgresError(
      () => sql`
        INSERT INTO task04_synthetic.administrative_preference_snapshot (
          id,
          pharmacy_id,
          booking_id,
          language,
          accessibility_preferences,
          synthetic_contact_reference
        )
        VALUES (
          'SYNTH-PREFERENCE-TASK04-X001',
          ${PHARMACY_ID},
          ${bookingId},
          'english',
          ARRAY['none', 'mobility_preparation'],
          ${TASK04_SYNTHETIC_REFERENCES.contact}
        )
      `,
      {
        code: "23514",
        constraint: "administrative_preference_selection_contract",
      },
    );

    await expectPostgresError(
      () => sql`
        INSERT INTO task04_synthetic.administrative_preference_snapshot (
          id,
          pharmacy_id,
          booking_id,
          language,
          accessibility_preferences,
          synthetic_contact_reference
        )
        VALUES (
          'SYNTH-PREFERENCE-TASK04-X002',
          ${PHARMACY_ID},
          ${bookingId},
          'english',
          ARRAY[
            'mobility_preparation',
            'hearing_preparation',
            'vision_preparation',
            'communication_preparation'
          ],
          ${TASK04_SYNTHETIC_REFERENCES.contact}
        )
      `,
      {
        code: "23514",
        safeIdentifier: "TASK04_ACCESSIBILITY_CONFIG_LIMIT",
      },
    );

    await expectPostgresError(
      () => sql`
        INSERT INTO task04_synthetic.booking_slot (
          id,
          pharmacy_id,
          service_category_id,
          modality,
          starts_at_utc,
          ends_at_utc,
          display_timezone,
          configured_capacity,
          state,
          created_at_utc,
          transitioned_at_utc
        )
        VALUES (
          'SYNTH-SLOT-TASK04-OVER-LIMIT',
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
          'in_person',
          '2026-08-04T15:00:00.000Z',
          '2026-08-04T15:30:00.000Z',
          'America/Toronto',
          ${task04Env.maxSlotCapacity + 1},
          'active',
          '2026-08-01T12:00:00.000Z',
          '2026-08-01T12:00:00.000Z'
        )
      `,
      {
        code: "23514",
        safeIdentifier: "TASK04_SLOT_CAPACITY_CONFIG_LIMIT",
      },
    );
  });

  it("enforces idempotency uniqueness in trusted actor, operation, and resource scope", async () => {
    await sql`
      INSERT INTO task04_synthetic.idempotency_record (
        id,
        pharmacy_id,
        actor_reference,
        operation,
        resource_scope_digest,
        idempotency_key_digest,
        canonical_request_digest,
        state
      )
      VALUES (
        'SYNTH-IDEMPOTENCY-TASK04-0001',
        ${PHARMACY_ID},
        ${TASK04_SYNTHETIC_REFERENCES.patient},
        'booking:create',
        ${DIGEST_A},
        ${DIGEST_B},
        ${DIGEST_C},
        'in_progress'
      )
    `;

    await expectPostgresError(
      () => sql`
        INSERT INTO task04_synthetic.idempotency_record (
          id,
          pharmacy_id,
          actor_reference,
          operation,
          resource_scope_digest,
          idempotency_key_digest,
          canonical_request_digest,
          state
        )
        VALUES (
          'SYNTH-IDEMPOTENCY-TASK04-0002',
          ${PHARMACY_ID},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'booking:create',
          ${DIGEST_A},
          ${DIGEST_B},
          ${DIGEST_D},
          'in_progress'
        )
      `,
      { code: "23505", constraint: "idempotency_record_scope_key" },
    );
  });

  it("accepts only canonical outbox events with exact minimized payloads", async () => {
    await insertValidOutboxEvent("booking-created-pending", {
      id: "SYNTH-EVENT-TASK04-BOOKING",
      eventType: "booking.created",
      aggregateType: "booking",
      aggregateId: "SYNTH-BOOKING-TASK04-EVENT",
      safeReasonCode: "BOOKING_REQUESTED",
      payload: {
        resultingState: "pending_confirmation",
        modality: "in_person",
        startTimeUtc: "2026-08-04T14:00:00.000Z",
        endTimeUtc: "2026-08-04T14:30:00.000Z",
      },
    });
    await insertValidOutboxEvent("capacity-hold-released-offer-decline", {
      id: "SYNTH-EVENT-TASK04-HOLD",
      eventType: "capacity_hold.released",
      aggregateType: "capacity_hold",
      aggregateId: "SYNTH-HOLD-TASK04-EVENT",
      safeReasonCode: "OFFER_DECLINED",
      payload: {
        ownerType: "waitlist_offer",
        releaseCause: "offer_decline",
        resultingState: "released",
      },
    });
    await insertValidOutboxEvent("automation-reconciled-completed", {
      id: "SYNTH-EVENT-TASK04-RECONCILE",
      eventType: "automation.reconciled",
      aggregateType: "automation_control",
      aggregateId: "SYNTH-AUTOMATION-TASK04-RUN",
      safeReasonCode: "RECONCILIATION_COMPLETED",
      actorType: "synthetic_system_worker",
      payload: {
        reconciliationRunReference: "SYNTH-RECONCILIATION-TASK04-RUN",
        resultingState: "completed",
        processedCount: task04Env.maxPageSize,
      },
    });

    const validPayloadTypes = await sql<{
      id: string;
      payload_type: string;
    }[]>`
      SELECT id, jsonb_typeof(payload) AS payload_type
      FROM task04_synthetic.transactional_outbox_record
      WHERE id IN (
        'SYNTH-EVENT-TASK04-BOOKING',
        'SYNTH-EVENT-TASK04-HOLD',
        'SYNTH-EVENT-TASK04-RECONCILE'
      )
      ORDER BY id
    `;
    expect(validPayloadTypes).toHaveLength(3);
    expect(
      validPayloadTypes.every(({ payload_type }) => payload_type === "object"),
    ).toBe(true);

    const invalidEvents = [
      {
        id: "SYNTH-EVENT-TASK04-UNKNOWN",
        eventType: "booking.unknown",
        aggregateType: "booking" as const,
        aggregateId: "SYNTH-BOOKING-TASK04-UNKNOWN",
        safeReasonCode: "BOOKING_REQUESTED",
        payload: {},
      },
      {
        id: "SYNTH-EVENT-TASK04-CONTACT",
        eventType: "booking.created",
        aggregateType: "booking" as const,
        aggregateId: "SYNTH-BOOKING-TASK04-CONTACT",
        safeReasonCode: "BOOKING_REQUESTED",
        payload: {
          resultingState: "confirmed",
          modality: "telephone",
          startTimeUtc: "2026-08-04T14:00:00.000Z",
          endTimeUtc: "2026-08-04T14:30:00.000Z",
          email: "SYNTHETIC-NON-DELIVERABLE",
        },
      },
      {
        id: "SYNTH-EVENT-TASK04-TOKEN",
        eventType: "management_credential.issued",
        aggregateType: "management_credential" as const,
        aggregateId: "SYNTH-CREDENTIAL-TASK04-EVENT",
        safeReasonCode: "ONE_TIME_ACCESS_ISSUED",
        payload: {
          credentialReference: "SYNTH-CREDENTIAL-TASK04-REF",
          usageMode: "one_time",
          permittedActions: ["booking:cancel"],
          channel: "one_time_response",
          expiresAtUtc: "2026-08-05T00:00:00.000Z",
          rawToken: "forbidden-synthetic-token",
        },
      },
      {
        id: "SYNTH-EVENT-TASK04-MISSING",
        eventType: "booking.created",
        aggregateType: "booking" as const,
        aggregateId: "SYNTH-BOOKING-TASK04-MISSING",
        safeReasonCode: "BOOKING_REQUESTED",
        payload: {
          resultingState: "confirmed",
          modality: "in_person",
          startTimeUtc: "2026-08-04T14:00:00.000Z",
        },
      },
      {
        id: "SYNTH-EVENT-TASK04-WRONGTYPE",
        eventType: "waitlist.offer_declined",
        aggregateType: "waitlist_offer" as const,
        aggregateId: "SYNTH-OFFER-TASK04-WRONGTYPE",
        safeReasonCode: "ACTOR_DECLINED_OFFER",
        payload: {
          waitlistReference: 1234567890123456,
          resultingOfferState: "declined",
          resultingEntryState: "cancelled",
        },
      },
      {
        id: "SYNTH-EVENT-TASK04-NONOBJECT",
        eventType: "booking.created",
        aggregateType: "booking" as const,
        aggregateId: "SYNTH-BOOKING-TASK04-NONOBJECT",
        safeReasonCode: "BOOKING_REQUESTED",
        payload: [],
      },
    ];

    for (const invalidEvent of invalidEvents) {
      await expectPostgresError(
        () => insertOutboxEvent(invalidEvent),
        {
          code: "23514",
          constraint: "transactional_outbox_event_contract",
        },
      );
    }

    await expectPostgresError(
      () =>
        insertOutboxEvent({
          id: "SYNTH-EVENT-TASK04-OVERPAGE",
          eventType: "automation.reconciled",
          aggregateType: "automation_control",
          aggregateId: "SYNTH-AUTOMATION-TASK04-OVERPAGE",
          safeReasonCode: "RECONCILIATION_COMPLETED",
          payload: {
            reconciliationRunReference:
              "SYNTH-RECONCILIATION-TASK04-OVERPAGE",
            resultingState: "completed",
            processedCount: task04Env.maxPageSize + 1,
          },
        }),
      {
        code: "23514",
        safeIdentifier: "TASK04_OUTBOX_PAGE_SIZE_CONFIG_LIMIT",
      },
    );
  });

  it("keeps synthetic audit evidence append-only under the runtime role", async () => {
    await sql.begin(async (transaction) => {
      await transaction`
        INSERT INTO task04_synthetic.transactional_outbox_record (
          id,
          pharmacy_id,
          event_type,
          aggregate_type,
          aggregate_id,
          aggregate_version,
          actor_type,
          safe_reason_code,
          payload
        )
        VALUES (
          'SYNTH-EVENT-TASK04-0001',
          ${PHARMACY_ID},
          'booking.created',
          'booking',
          'SYNTH-BOOKING-TASK04-0001',
          1,
          'synthetic_patient',
          'BOOKING_REQUESTED',
          '{
            "resultingState":"pending_confirmation",
            "modality":"in_person",
            "startTimeUtc":"2026-08-04T14:00:00.000Z",
            "endTimeUtc":"2026-08-04T14:30:00.000Z"
          }'::jsonb
        )
      `;
      await transaction`
        INSERT INTO task04_synthetic.synthetic_audit_record (
          id,
          pharmacy_id,
          aggregate_type,
          aggregate_id,
          aggregate_version,
          resulting_state,
          actor_type,
          safe_action_code,
          safe_reason_code,
          outbox_record_id
        )
        VALUES (
          'SYNTH-AUDIT-TASK04-0001',
          ${PHARMACY_ID},
          'booking',
          'SYNTH-BOOKING-TASK04-0001',
          1,
          'pending_confirmation',
          'synthetic_patient',
          'BOOKING_CREATE',
          'BOOKING_REQUESTED',
          'SYNTH-EVENT-TASK04-0001'
        )
      `;
    });

    await expectPostgresError(
      () => sql`
        UPDATE task04_synthetic.synthetic_audit_record
        SET resulting_state = 'confirmed'
        WHERE id = 'SYNTH-AUDIT-TASK04-0001'
      `,
      {
        code: "42501",
        safeIdentifier: "permission denied for table synthetic_audit_record",
      },
    );
    await expectPostgresError(
      () => sql`
        DELETE FROM task04_synthetic.synthetic_audit_record
        WHERE id = 'SYNTH-AUDIT-TASK04-0001'
      `,
      {
        code: "42501",
        safeIdentifier: "permission denied for table synthetic_audit_record",
      },
    );
    await expectPostgresError(
      () => sql`TRUNCATE task04_synthetic.synthetic_audit_record`,
      {
        code: "42501",
        safeIdentifier: "permission denied for table synthetic_audit_record",
      },
    );
    await expectPostgresError(
      () => sql`
        ALTER TABLE task04_synthetic.synthetic_audit_record
        DISABLE TRIGGER synthetic_audit_append_only
      `,
      {
        code: "42501",
        safeIdentifier: "must be owner of table synthetic_audit_record",
      },
    );
    await expectPostgresError(
      () => adminSql`
        UPDATE task04_synthetic.synthetic_audit_record
        SET resulting_state = 'confirmed'
        WHERE id = 'SYNTH-AUDIT-TASK04-0001'
      `,
      {
        code: "55000",
        safeIdentifier: "TASK04_SYNTHETIC_AUDIT_APPEND_ONLY",
      },
    );

    const [remaining] = await sql<{ audit_count: number }[]>`
      SELECT count(*)::integer AS audit_count
      FROM task04_synthetic.synthetic_audit_record
      WHERE id = 'SYNTH-AUDIT-TASK04-0001'
    `;
    expect(remaining.audit_count).toBe(1);
  });
});
