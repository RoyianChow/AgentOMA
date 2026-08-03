import { TextEncoder } from "node:util";

import postgres from "postgres";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { authorizeStaffPharmacistQueue } from "../booking/authorization";
import {
  task04CommandConfigurationFromEnvironment,
} from "../booking/config";
import type { Task04BookingConfirmRequest } from "../booking/contracts";
import { queryTask04PublicAvailability } from "../db/availability";
import { createTask04AuthoritativeTransactionContext } from "../db/authoritative-context";
import { executeTask04BookingConfirm } from "../db/booking-confirm";
import {
  executeTask04BookingCreate,
  type Task04BookingCreateCommandResult,
} from "../db/booking-create";
import {
  createTask04SandboxSql,
  type Task04SandboxSql,
} from "../db/client";
import {
  TASK04_FOUNDATION_FIXTURES,
  seedTask04Foundation,
} from "../db/fixtures";
import { task04PharmacyCalendarDate } from "../db/pharmacy-calendar";
import {
  executeTask04PharmacistQueue,
  queryTask04PharmacistQueue,
  type Task04PharmacistQueueResult,
} from "../db/pharmacist-queue";
import { createTask04PharmacistQueueReferenceService } from "../db/pharmacist-queue-reference";
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

const encoder = new TextEncoder();
const PHARMACY_ID = "SYNTH-PHARMACY-TASK04-LOCAL";
const OTHER_PHARMACY_ID = "SYNTH-PHARMACY-TASK04-OTHER";
const PHARMACY_TIMEZONE = "America/Toronto";
const FIXED_ENV_PARSE_TIME = "2026-08-02T00:00:00.000Z";

let sql: Task04SandboxSql;
let adminSql: Task04SandboxSql;
let environment: Task04SandboxEnv;
let databaseNowUtc: string;
let slotStartUtc: string;
let slotEndUtc: string;

function instantFromDatabaseNow(offsetMilliseconds: number): string {
  return new Date(
    Date.parse(databaseNowUtc) + offsetMilliseconds,
  ).toISOString();
}

function configuration() {
  return task04CommandConfigurationFromEnvironment(environment);
}

async function authoritativeContext(
  transaction: Task04TransactionSql,
) {
  return createTask04AuthoritativeTransactionContext(
    transaction,
    environment,
    configuration(),
  );
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
  slotStartUtc = instantFromDatabaseNow(2 * 60 * 60 * 1_000);
  slotEndUtc = instantFromDatabaseNow(
    (2 * 60 + 30) * 60 * 1_000,
  );
  await adminSql`
    UPDATE task04_synthetic.booking_slot
    SET starts_at_utc = ${slotStartUtc},
        ends_at_utc = ${slotEndUtc},
        state = 'active',
        transitioned_at_utc = ${databaseNowUtc}
    WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
      AND pharmacy_id = ${PHARMACY_ID}
  `;
}

function queueRequest(
  overrides: Record<string, unknown> = {},
) {
  return {
    pageSize: 10,
    ...overrides,
  };
}

async function queue(
  overrides: Record<string, unknown> = {},
): Promise<Task04PharmacistQueueResult> {
  return executeTask04PharmacistQueue(
    sql,
    environment,
    encoder.encode(JSON.stringify(queueRequest(overrides))),
  );
}

async function traverseQueueReferences(
  overrides: Record<string, unknown>,
  initialCursor?: string,
): Promise<string[]> {
  const references: string[] = [];
  let cursor = initialCursor;
  for (let pageNumber = 0; pageNumber < 1_000; pageNumber += 1) {
    const result = requireQueueSuccess(
      await queue({
        ...overrides,
        ...(cursor === undefined ? {} : { cursor }),
      }),
    );
    references.push(
      ...result.data.items.map(
        (item) => item.queueItemReference,
      ),
    );
    cursor = result.data.nextCursor;
    if (cursor === undefined) return references;
  }
  throw new Error("TASK04_TEST_QUEUE_PAGE_LIMIT_EXCEEDED");
}

function requireQueueSuccess(result: Task04PharmacistQueueResult) {
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error("TASK04_TEST_EXPECTED_QUEUE_SUCCESS");
  }
  return result;
}

function requireCreateSuccess(
  result: Task04BookingCreateCommandResult,
) {
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error("TASK04_TEST_EXPECTED_CREATE_SUCCESS");
  }
  return result;
}

async function availableReferences() {
  return withTask04RuntimeTransaction(
    sql,
    "read committed",
    async (transaction) => {
      const context = await authoritativeContext(transaction);
      const result = await queryTask04PublicAvailability(
        transaction,
        context,
        environment,
        {
          startDate: task04PharmacyCalendarDate(
            databaseNowUtc,
            PHARMACY_TIMEZONE,
          ),
          endDate: task04PharmacyCalendarDate(
            slotStartUtc,
            PHARMACY_TIMEZONE,
          ),
          timezone: PHARMACY_TIMEZONE,
          pageSize: 10,
        },
      );
      const item = result.items[0];
      if (!item?.slotReference) {
        throw new Error("TASK04_TEST_SLOT_REFERENCE_MISSING");
      }
      return {
        slotReference: item.slotReference,
        serviceCategoryRef: item.serviceCategoryRef,
      };
    },
  );
}

async function createPendingBooking(
  idempotencyKey = "SYNTH-IDEMPOTENCY-QUEUE-CREATE-0001",
) {
  const references = await availableReferences();
  const created = requireCreateSuccess(
    await executeTask04BookingCreate(
      sql,
      environment,
      encoder.encode(
        JSON.stringify({
          slotReference: references.slotReference,
          languagePreference: "english",
          accessibilityPreferences: ["none"],
          syntheticContactReference:
            TASK04_SYNTHETIC_REFERENCES.contact,
          administrativeAcknowledgements: {
            administrativeOnly: true,
            notMonitored: true,
            noMedicalDetails: true,
            notClinicalAssessment: true,
            statusControlsConfirmation: true,
          },
          idempotencyKey,
        }),
      ),
    ),
  );
  return {
    bookingReference: created.data.bookingReference,
    serviceCategoryRef: references.serviceCategoryRef,
  };
}

async function confirmBooking(bookingReference: string) {
  const request: Task04BookingConfirmRequest = {
    bookingReference,
    expectedAggregateVersion: 1,
    idempotencyKey:
      "SYNTH-IDEMPOTENCY-QUEUE-CONFIRM-0001",
  };
  const result = await executeTask04BookingConfirm(
    sql,
    environment,
    encoder.encode(JSON.stringify(request)),
  );
  expect(result.success).toBe(true);
}

async function insertTerminalBooking(
  bookingId: string,
  state: "cancelled" | "expired" | "rescheduled",
  createdAtUtc: string,
  options: Readonly<{
    linkRescheduled?: boolean;
    reciprocalSuccessorLink?: boolean;
    slotId?: string;
  }> = {},
): Promise<void> {
  const linkRescheduled =
    state === "rescheduled" &&
    options.linkRescheduled !== false;
  const successorBookingId = linkRescheduled
    ? `${bookingId}-SUCCESSOR`
    : null;
  const slotId =
    options.slotId ?? TASK04_FOUNDATION_FIXTURES.slotId;
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
        successor_booking_id,
        safe_reason_code,
        created_at_utc,
        transitioned_at_utc
      )
      VALUES (
        ${bookingId},
        ${PHARMACY_ID},
        ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
        ${slotId},
        'in_person',
        ${TASK04_SYNTHETIC_REFERENCES.patient},
        ${TASK04_SYNTHETIC_REFERENCES.patient},
        ${state},
        ${successorBookingId},
        'SYNTHETIC_QUEUE_FIXTURE',
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
          ${slotId},
          'in_person',
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'cancelled',
          ${
            options.reciprocalSuccessorLink === false
              ? null
              : bookingId
          },
          'SYNTHETIC_QUEUE_SUCCESSOR_FIXTURE',
          ${createdAtUtc},
          ${createdAtUtc}
        )
      `;
    }
    await transaction`
      INSERT INTO task04_synthetic.administrative_preference_snapshot (
        id,
        pharmacy_id,
        booking_id,
        language,
        accessibility_preferences,
        synthetic_contact_reference,
        created_at_utc
      )
      VALUES (
        ${`SYNTH-PREFERENCE-${bookingId}`},
        ${PHARMACY_ID},
        ${bookingId},
        'no_preference',
        ARRAY['none']::text[],
        ${TASK04_SYNTHETIC_REFERENCES.contact},
        ${createdAtUtc}
      )
    `;
    if (successorBookingId !== null) {
      await transaction`
        INSERT INTO task04_synthetic.administrative_preference_snapshot (
          id,
          pharmacy_id,
          booking_id,
          language,
          accessibility_preferences,
          synthetic_contact_reference,
          created_at_utc
        )
        VALUES (
          ${`SYNTH-PREFERENCE-${successorBookingId}`},
          ${PHARMACY_ID},
          ${successorBookingId},
          'no_preference',
          ARRAY['none']::text[],
          ${TASK04_SYNTHETIC_REFERENCES.contact},
          ${createdAtUtc}
        )
      `;
    }
  });
}

async function insertLargeLinkedRescheduledSet(
  count: number,
): Promise<string[]> {
  const bookingIds = Array.from(
    { length: count },
    (_, index) =>
      `SYNTH-BOOKING-QUEUE-LARGE-${String(index + 1).padStart(4, "0")}`,
  );
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
        successor_booking_id,
        safe_reason_code,
        created_at_utc,
        transitioned_at_utc
      )
      SELECT
        'SYNTH-BOOKING-QUEUE-LARGE-' ||
          lpad(series::text, 4, '0'),
        ${PHARMACY_ID},
        ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
        ${TASK04_FOUNDATION_FIXTURES.slotId},
        'in_person',
        ${TASK04_SYNTHETIC_REFERENCES.patient},
        ${TASK04_SYNTHETIC_REFERENCES.patient},
        'rescheduled',
        'SYNTH-BOOKING-QUEUE-LARGE-' ||
          lpad(series::text, 4, '0') || '-SUCCESSOR',
        'SYNTHETIC_QUEUE_LARGE',
        ${databaseNowUtc}::timestamptz +
          series * interval '1 millisecond',
        ${databaseNowUtc}::timestamptz +
          series * interval '1 millisecond'
      FROM generate_series(1, ${count}) AS generated(series)
    `;
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
      SELECT
        'SYNTH-BOOKING-QUEUE-LARGE-' ||
          lpad(series::text, 4, '0') || '-SUCCESSOR',
        ${PHARMACY_ID},
        ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
        ${TASK04_FOUNDATION_FIXTURES.slotId},
        'in_person',
        ${TASK04_SYNTHETIC_REFERENCES.patient},
        ${TASK04_SYNTHETIC_REFERENCES.patient},
        'cancelled',
        'SYNTH-BOOKING-QUEUE-LARGE-' ||
          lpad(series::text, 4, '0'),
        'SYNTHETIC_QUEUE_LARGE_SUCCESSOR',
        ${databaseNowUtc}::timestamptz +
          series * interval '1 millisecond',
        ${databaseNowUtc}::timestamptz +
          series * interval '1 millisecond'
      FROM generate_series(1, ${count}) AS generated(series)
    `;
    await transaction`
      INSERT INTO task04_synthetic.administrative_preference_snapshot (
        id,
        pharmacy_id,
        booking_id,
        language,
        accessibility_preferences,
        synthetic_contact_reference,
        created_at_utc
      )
      SELECT
        'SYNTH-PREFERENCE-' || booking.id,
        booking.pharmacy_id,
        booking.id,
        'no_preference',
        ARRAY['none']::text[],
        ${TASK04_SYNTHETIC_REFERENCES.contact},
        booking.created_at_utc
      FROM task04_synthetic.booking AS booking
      WHERE booking.pharmacy_id = ${PHARMACY_ID}
        AND booking.id LIKE 'SYNTH-BOOKING-QUEUE-LARGE-%'
    `;
  });
  return bookingIds;
}

async function insertStartTimeKeysetFixture() {
  const slots = [
    {
      slotId: "SYNTH-SLOT-QUEUE-START-0001",
      capacityUnitId: "SYNTH-UNIT-QUEUE-START-0001",
      startsAtUtc: instantFromDatabaseNow(
        3 * 60 * 60 * 1_000,
      ),
    },
    {
      slotId: "SYNTH-SLOT-QUEUE-START-0002",
      capacityUnitId: "SYNTH-UNIT-QUEUE-START-0002",
      startsAtUtc: instantFromDatabaseNow(
        4 * 60 * 60 * 1_000,
      ),
    },
    {
      slotId: "SYNTH-SLOT-QUEUE-START-0003",
      capacityUnitId: "SYNTH-UNIT-QUEUE-START-0003",
      startsAtUtc: instantFromDatabaseNow(
        5 * 60 * 60 * 1_000,
      ),
    },
    {
      slotId: "SYNTH-SLOT-QUEUE-START-0004",
      capacityUnitId: "SYNTH-UNIT-QUEUE-START-0004",
      startsAtUtc: instantFromDatabaseNow(
        6 * 60 * 60 * 1_000,
      ),
    },
  ] as const;
  await adminSql.begin(async (transaction) => {
    for (const slot of slots) {
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
          ${slot.slotId},
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
          'in_person',
          ${slot.startsAtUtc},
          ${
            new Date(
              Date.parse(slot.startsAtUtc) + 30 * 60 * 1_000,
            ).toISOString()
          },
          ${PHARMACY_TIMEZONE},
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
          ${slot.capacityUnitId},
          ${PHARMACY_ID},
          ${slot.slotId},
          1
        )
      `;
    }
  });

  const records = [
    {
      bookingId: "SYNTH-BOOKING-QUEUE-START-EARLY-0001",
      slotId: slots[0].slotId,
      startsAtUtc: slots[0].startsAtUtc,
    },
    {
      bookingId: "SYNTH-BOOKING-QUEUE-START-TIE-B-0001",
      slotId: slots[1].slotId,
      startsAtUtc: slots[1].startsAtUtc,
    },
    {
      bookingId: "SYNTH-BOOKING-QUEUE-START-TIE-A-0001",
      slotId: slots[1].slotId,
      startsAtUtc: slots[1].startsAtUtc,
    },
    {
      bookingId: "SYNTH-BOOKING-QUEUE-START-LATE-0001",
      slotId: slots[2].slotId,
      startsAtUtc: slots[2].startsAtUtc,
    },
    {
      bookingId: "SYNTH-BOOKING-QUEUE-START-LATEST-0001",
      slotId: slots[3].slotId,
      startsAtUtc: slots[3].startsAtUtc,
    },
  ];
  for (const [index, record] of records.entries()) {
    await insertTerminalBooking(
      record.bookingId,
      "rescheduled",
      instantFromDatabaseNow(index * 1_000),
      { slotId: record.slotId },
    );
  }
  return records;
}

function expectedQueueItemReferences(
  bookingIds: readonly string[],
): string[] {
  const referenceService =
    createTask04PharmacistQueueReferenceService({
      pharmacyId: PHARMACY_ID,
      secret: environment.publicSlotReferenceSecret,
    });
  return bookingIds.map((bookingId) =>
    referenceService.issueQueueItemReference(bookingId),
  );
}

async function expirePendingFixture(
  bookingId: string,
): Promise<void> {
  await adminSql.begin(async (transaction) => {
    await transaction`
      UPDATE task04_synthetic.capacity_unit
      SET capacity_hold_id = NULL,
          aggregate_version = aggregate_version + 1,
          transitioned_at_utc = transaction_timestamp()
      WHERE pharmacy_id = ${PHARMACY_ID}
        AND capacity_hold_id = (
          SELECT id
          FROM task04_synthetic.capacity_hold
          WHERE pharmacy_id = ${PHARMACY_ID}
            AND pending_booking_id = ${bookingId}
            AND state = 'active'
        )
    `;
    await transaction`
      UPDATE task04_synthetic.capacity_hold
      SET state = 'expired',
          consumed_at_utc = NULL,
          released_at_utc = NULL,
          expired_at_utc = transaction_timestamp(),
          aggregate_version = aggregate_version + 1,
          transitioned_at_utc = transaction_timestamp()
      WHERE pharmacy_id = ${PHARMACY_ID}
        AND pending_booking_id = ${bookingId}
        AND state = 'active'
    `;
    await transaction`
      UPDATE task04_synthetic.booking
      SET state = 'expired',
          confirmation_deadline_utc = NULL,
          safe_reason_code = 'HOLD_WINDOW_EXPIRED',
          aggregate_version = aggregate_version + 1,
          transitioned_at_utc = transaction_timestamp()
      WHERE id = ${bookingId}
        AND pharmacy_id = ${PHARMACY_ID}
        AND state = 'pending_confirmation'
    `;
  });
}

async function tableCounts() {
  const [counts] = await adminSql<{
    bookings: number;
    holds: number;
    capacity_units: number;
    receipts: number;
    audits: number;
    outbox: number;
    credentials: number;
    preferences: number;
    acknowledgements: number;
  }[]>`
    SELECT
      (SELECT count(*)::integer
       FROM task04_synthetic.booking) AS bookings,
      (SELECT count(*)::integer
       FROM task04_synthetic.capacity_hold) AS holds,
      (SELECT count(*)::integer
       FROM task04_synthetic.capacity_unit) AS capacity_units,
      (SELECT count(*)::integer
       FROM task04_synthetic.idempotency_record) AS receipts,
      (SELECT count(*)::integer
       FROM task04_synthetic.synthetic_audit_record) AS audits,
      (SELECT count(*)::integer
       FROM task04_synthetic.transactional_outbox_record) AS outbox,
      (SELECT count(*)::integer
       FROM task04_synthetic.management_credential) AS credentials,
      (SELECT count(*)::integer
       FROM task04_synthetic.administrative_preference_snapshot)
        AS preferences,
      (SELECT count(*)::integer
       FROM task04_synthetic.administrative_acknowledgement_record)
        AS acknowledgements
  `;
  return counts;
}

beforeAll(async () => {
  environment = parseTask04SandboxEnv(
    task04SyntheticEnvironmentInput(),
    new Date(FIXED_ENV_PARSE_TIME),
  );
  adminSql = postgres(TASK04_SANDBOX_OWNER_POSTGRES_URL, {
    max: 2,
    connection: {
      application_name:
        "agentoma-task04-pharmacist-queue-owner",
      search_path: "task04_synthetic, public",
    },
    onnotice: () => undefined,
  });
  sql = createTask04SandboxSql(environment);
  await Promise.all([adminSql`SELECT 1`, sql`SELECT 1`]);
});

beforeEach(async () => {
  await resetFoundation();
});

afterAll(async () => {
  await Promise.all([
    closeTask04SandboxSql(sql),
    closeTask04SandboxSql(adminSql),
  ]);
});

describe("Task 04 PostgreSQL pharmacist queue", () => {
  it("returns pending and confirmed bookings as minimized administrative items", async () => {
    const pending = await createPendingBooking();
    let result = requireQueueSuccess(await queue());
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0]).toMatchObject({
      administrativeStatus: "pending_confirmation",
      serviceCategoryLabel: "Synthetic administrative service",
      modality: "in_person",
      displayTimezone: PHARMACY_TIMEZONE,
      languagePreference: "english",
      accessibilityPreferences: ["none"],
      source: "booking",
      operationalReason: "confirmation_required",
      actionAvailability: "not_permitted",
    });
    expect(result.data.generatedAtUtc).not.toBe(databaseNowUtc);

    await confirmBooking(pending.bookingReference);
    result = requireQueueSuccess(await queue());
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0]).toMatchObject({
      administrativeStatus: "confirmed",
      operationalReason: "appointment_upcoming",
      actionAvailability: "not_permitted",
    });
  });

  it("excludes cancelled and expired bookings while including the documented rescheduled state", async () => {
    await insertTerminalBooking(
      "SYNTH-BOOKING-QUEUE-CANCELLED-0001",
      "cancelled",
      instantFromDatabaseNow(-3_000),
    );
    await insertTerminalBooking(
      "SYNTH-BOOKING-QUEUE-EXPIRED-0001",
      "expired",
      instantFromDatabaseNow(-2_000),
    );
    await insertTerminalBooking(
      "SYNTH-BOOKING-QUEUE-RESCHEDULED-0001",
      "rescheduled",
      instantFromDatabaseNow(-1_000),
    );
    const result = requireQueueSuccess(await queue());
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0]).toMatchObject({
      administrativeStatus: "rescheduled",
      operationalReason: "recently_rescheduled",
    });
  });

  it("fails an unlinked rescheduled booking closed", async () => {
    await insertTerminalBooking(
      "SYNTH-BOOKING-QUEUE-UNLINKED-0001",
      "rescheduled",
      instantFromDatabaseNow(-1_000),
      { linkRescheduled: false },
    );
    expect(await queue({ status: ["rescheduled"] })).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
  });

  it("fails contradictory successor linkage closed", async () => {
    await insertTerminalBooking(
      "SYNTH-BOOKING-QUEUE-CONTRADICTORY-0001",
      "rescheduled",
      instantFromDatabaseNow(-1_000),
      { reciprocalSuccessorLink: false },
    );
    expect(await queue({ status: ["rescheduled"] })).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
  });

  it("rejects missing and self-linked successor references at the schema boundary", async () => {
    const bookingId = "SYNTH-BOOKING-QUEUE-LINK-SCHEMA-0001";
    await insertTerminalBooking(
      bookingId,
      "rescheduled",
      instantFromDatabaseNow(-1_000),
    );
    await expect(
      adminSql.begin(async (transaction) => {
        await transaction`
          UPDATE task04_synthetic.booking
          SET successor_booking_id =
            'SYNTH-BOOKING-QUEUE-MISSING-SUCCESSOR'
          WHERE id = ${bookingId}
            AND pharmacy_id = ${PHARMACY_ID}
        `;
      }),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      adminSql`
        UPDATE task04_synthetic.booking
        SET successor_booking_id = id
        WHERE id = ${bookingId}
          AND pharmacy_id = ${PHARMACY_ID}
      `,
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("fails a cross-pharmacy successor closed before projection", async () => {
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
          const predecessorId =
            "SYNTH-BOOKING-QUEUE-CROSS-LINK-0001";
          const successorId =
            "SYNTH-BOOKING-QUEUE-CROSS-LINK-SUCCESSOR-0001";
          await transaction`SET CONSTRAINTS ALL DEFERRED`;
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
              successor_booking_id,
              safe_reason_code
            )
            VALUES (
              ${predecessorId},
              ${PHARMACY_ID},
              ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
              ${TASK04_FOUNDATION_FIXTURES.slotId},
              'in_person',
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              'rescheduled',
              ${successorId},
              'SYNTHETIC_QUEUE_CROSS_LINK'
            )
          `;
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
              safe_reason_code
            )
            VALUES (
              ${successorId},
              ${OTHER_PHARMACY_ID},
              ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
              ${TASK04_FOUNDATION_FIXTURES.slotId},
              'in_person',
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              'cancelled',
              ${predecessorId},
              'SYNTHETIC_QUEUE_CROSS_LINK_SUCCESSOR'
            )
          `;
          await transaction`
            INSERT INTO task04_synthetic.administrative_preference_snapshot (
              id,
              pharmacy_id,
              booking_id,
              language,
              accessibility_preferences,
              synthetic_contact_reference
            )
            VALUES (
              'SYNTH-PREFERENCE-QUEUE-CROSS-LINK-0001',
              ${PHARMACY_ID},
              ${predecessorId},
              'no_preference',
              ARRAY['none']::text[],
              ${TASK04_SYNTHETIC_REFERENCES.contact}
            )
          `;
          await queryTask04PharmacistQueue(
            transaction,
            context,
            environment,
            {
              status: ["rescheduled"],
              sort: "created_at_asc",
              pageSize: 10,
            },
          );
        },
      ),
    ).rejects.toThrow("TASK04_QUEUE_DATABASE_STATE_DENIED");
  });

  it("excludes a pending booking whose authoritative hold deadline elapsed", async () => {
    const pending = await createPendingBooking();
    const expiredAtUtc = instantFromDatabaseNow(-60_000);
    const createdAtUtc = instantFromDatabaseNow(-120_000);
    await adminSql.begin(async (transaction) => {
      await transaction`
        UPDATE task04_synthetic.booking
        SET confirmation_deadline_utc = ${expiredAtUtc}
        WHERE id = ${pending.bookingReference}
          AND pharmacy_id = ${PHARMACY_ID}
      `;
      await transaction`
        UPDATE task04_synthetic.capacity_hold
        SET created_at_utc = ${createdAtUtc},
            expires_at_utc = ${expiredAtUtc}
        WHERE pending_booking_id = ${pending.bookingReference}
          AND pharmacy_id = ${PHARMACY_ID}
          AND state = 'active'
      `;
    });
    expect(
      requireQueueSuccess(await queue()).data.items,
    ).toEqual([]);
  });

  it("projects waitlist-promotion source only from the immutable snapshot chain", async () => {
    const createdAtUtc = instantFromDatabaseNow(-60_000);
    const expiresAtUtc = instantFromDatabaseNow(
      24 * 60 * 60 * 1_000,
    );
    await adminSql.begin(async (transaction) => {
      await transaction`
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
          'SYNTH-WAITLIST-QUEUE-PROMOTED-0001',
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
          'in_person',
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'promoted',
          ${expiresAtUtc},
          'SYNTHETIC_QUEUE_PROMOTED',
          ${createdAtUtc},
          ${createdAtUtc}
        )
      `;
      await transaction`
        INSERT INTO task04_synthetic.administrative_preference_snapshot (
          id,
          pharmacy_id,
          waitlist_entry_id,
          language,
          accessibility_preferences,
          synthetic_contact_reference,
          created_at_utc
        )
        VALUES (
          'SYNTH-PREFERENCE-QUEUE-WAITLIST-0001',
          ${PHARMACY_ID},
          'SYNTH-WAITLIST-QUEUE-PROMOTED-0001',
          'french',
          ARRAY['mobility_preparation']::text[],
          ${TASK04_SYNTHETIC_REFERENCES.contact},
          ${createdAtUtc}
        )
      `;
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
          'SYNTH-BOOKING-QUEUE-PROMOTED-0001',
          ${PHARMACY_ID},
          ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
          ${TASK04_FOUNDATION_FIXTURES.slotId},
          'in_person',
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'confirmed',
          'SYNTHETIC_QUEUE_PROMOTED',
          ${createdAtUtc},
          ${createdAtUtc}
        )
      `;
      await transaction`
        INSERT INTO task04_synthetic.administrative_preference_snapshot (
          id,
          pharmacy_id,
          booking_id,
          language,
          accessibility_preferences,
          synthetic_contact_reference,
          source_snapshot_id,
          created_at_utc
        )
        VALUES (
          'SYNTH-PREFERENCE-QUEUE-PROMOTED-0001',
          ${PHARMACY_ID},
          'SYNTH-BOOKING-QUEUE-PROMOTED-0001',
          'french',
          ARRAY['mobility_preparation']::text[],
          ${TASK04_SYNTHETIC_REFERENCES.contact},
          'SYNTH-PREFERENCE-QUEUE-WAITLIST-0001',
          ${createdAtUtc}
        )
      `;
      await transaction`
        UPDATE task04_synthetic.capacity_unit
        SET booking_id = 'SYNTH-BOOKING-QUEUE-PROMOTED-0001'
        WHERE id = ${TASK04_FOUNDATION_FIXTURES.capacityUnitIds[0]}
          AND pharmacy_id = ${PHARMACY_ID}
      `;
    });
    expect(
      requireQueueSuccess(await queue()).data.items[0],
    ).toMatchObject({
      source: "waitlist_promotion",
      languagePreference: "french",
      accessibilityPreferences: ["mobility_preparation"],
    });
  });

  it("applies status, modality, service, and inclusive date filters", async () => {
    const pending = await createPendingBooking();
    const appointmentDate = task04PharmacyCalendarDate(
      slotStartUtc,
      PHARMACY_TIMEZONE,
    );
    expect(
      requireQueueSuccess(
        await queue({
          status: ["pending_confirmation"],
          modality: "in_person",
          serviceCategoryRef: pending.serviceCategoryRef,
          startDate: appointmentDate,
          endDate: appointmentDate,
        }),
      ).data.items,
    ).toHaveLength(1);
    expect(
      requireQueueSuccess(
        await queue({ status: ["confirmed"] }),
      ).data.items,
    ).toEqual([]);
    expect(
      requireQueueSuccess(
        await queue({ modality: "video" }),
      ).data.items,
    ).toEqual([]);
    const followingDate = task04PharmacyCalendarDate(
      instantFromDatabaseNow(26 * 60 * 60 * 1_000),
      PHARMACY_TIMEZONE,
    );
    expect(
      requireQueueSuccess(
        await queue({
          startDate: followingDate,
          endDate: followingDate,
        }),
      ).data.items,
    ).toEqual([]);
  });

  it("uses deterministic opaque pagination without duplicates or gaps", async () => {
    for (let index = 1; index <= 3; index += 1) {
      await insertTerminalBooking(
        `SYNTH-BOOKING-QUEUE-PAGE-000${index}`,
        "rescheduled",
        instantFromDatabaseNow(index * 1_000),
      );
    }
    const references: string[] = [];
    let cursor: string | undefined;
    do {
      const result = requireQueueSuccess(
        await queue({
          pageSize: 1,
          sort: "created_at_asc",
          ...(cursor === undefined ? {} : { cursor }),
        }),
      );
      expect(result.data.items).toHaveLength(1);
      references.push(
        result.data.items[0]!.queueItemReference,
      );
      cursor = result.data.nextCursor;
    } while (cursor !== undefined);
    expect(references).toHaveLength(3);
    expect(new Set(references).size).toBe(3);
    expect(
      references.some((reference) =>
        reference.includes("BOOKING"),
      ),
    ).toBe(false);
  });

  it("traverses default start-time keysets with the booking-id tie-breaker", async () => {
    const records = await insertStartTimeKeysetFixture();
    const orderedRecords = [...records].sort((left, right) => {
      const timeOrder =
        Date.parse(left.startsAtUtc) -
        Date.parse(right.startsAtUtc);
      if (timeOrder !== 0) return timeOrder;
      return left.bookingId < right.bookingId ? -1 : 1;
    });
    const orderedReferences = expectedQueueItemReferences(
      orderedRecords.map((record) => record.bookingId),
    );
    const expectedItems = orderedRecords.map((record, index) => ({
      queueItemReference: orderedReferences[index]!,
      appointmentStartUtc: record.startsAtUtc,
    }));

    const returnedItems: Array<{
      queueItemReference: string;
      appointmentStartUtc: string;
    }> = [];
    const seenCursors = new Set<string>();
    const pageSizes: number[] = [];
    let cursor: string | undefined;
    do {
      const result = requireQueueSuccess(
        await queue({
          pageSize: 2,
          ...(cursor === undefined ? {} : { cursor }),
        }),
      );
      pageSizes.push(result.data.items.length);
      expect(result.data.items.length).toBeLessThanOrEqual(2);
      returnedItems.push(
        ...result.data.items.map((item) => ({
          queueItemReference: item.queueItemReference,
          appointmentStartUtc: item.appointmentStartUtc,
        })),
      );

      const nextCursor = result.data.nextCursor;
      if (nextCursor !== undefined) {
        expect(seenCursors.has(nextCursor)).toBe(false);
        seenCursors.add(nextCursor);
        const decodedCursor = Buffer.from(
          nextCursor,
          "base64url",
        ).toString("utf8");
        for (const internalReference of [
          ...records.map((record) => record.bookingId),
          ...records.map((record) => record.slotId),
        ]) {
          expect(nextCursor).not.toContain(internalReference);
          expect(decodedCursor).not.toContain(internalReference);
        }
        expect(decodedCursor).not.toMatch(
          /SYNTH-(?:BOOKING|SLOT)/,
        );
      }
      cursor = nextCursor;
    } while (cursor !== undefined);

    expect(pageSizes).toEqual([2, 2, 1]);
    expect(cursor).toBeUndefined();
    expect(returnedItems).toEqual(expectedItems);
    expect(returnedItems).toHaveLength(records.length);
    expect(
      new Set(
        returnedItems.map((item) => item.queueItemReference),
      ).size,
    ).toBe(records.length);
  });

  it("continues after the keyset when an earlier booking is inserted between pages", async () => {
    const bookingIds = [
      "SYNTH-BOOKING-QUEUE-INSERT-A-0001",
      "SYNTH-BOOKING-QUEUE-INSERT-B-0001",
      "SYNTH-BOOKING-QUEUE-INSERT-C-0001",
    ];
    for (const [index, bookingId] of bookingIds.entries()) {
      await insertTerminalBooking(
        bookingId,
        "rescheduled",
        instantFromDatabaseNow((index + 1) * 1_000),
      );
    }
    const first = requireQueueSuccess(
      await queue({
        pageSize: 1,
        sort: "created_at_asc",
      }),
    );
    expect(first.data.items.map((item) => item.queueItemReference)).toEqual(
      expectedQueueItemReferences([bookingIds[0]!]),
    );

    await insertTerminalBooking(
      "SYNTH-BOOKING-QUEUE-INSERT-EARLIER-0001",
      "rescheduled",
      instantFromDatabaseNow(-1_000),
    );
    const traversed = [
      first.data.items[0]!.queueItemReference,
      ...(await traverseQueueReferences(
        {
          pageSize: 1,
          sort: "created_at_asc",
        },
        first.data.nextCursor,
      )),
    ];
    expect(traversed).toEqual(
      expectedQueueItemReferences(bookingIds),
    );
    expect(new Set(traversed).size).toBe(traversed.length);
  });

  it("continues after an earlier page item becomes excluded", async () => {
    const pending = await createPendingBooking();
    const laterBookingIds = [
      "SYNTH-BOOKING-QUEUE-EXCLUDE-B-0001",
      "SYNTH-BOOKING-QUEUE-EXCLUDE-C-0001",
    ];
    for (const [index, bookingId] of laterBookingIds.entries()) {
      await insertTerminalBooking(
        bookingId,
        "rescheduled",
        instantFromDatabaseNow(60_000 + index * 1_000),
      );
    }
    const first = requireQueueSuccess(
      await queue({
        pageSize: 1,
        sort: "created_at_asc",
      }),
    );
    expect(first.data.items.map((item) => item.queueItemReference)).toEqual(
      expectedQueueItemReferences([pending.bookingReference]),
    );

    await expirePendingFixture(pending.bookingReference);
    const afterExclusion = requireQueueSuccess(
      await queue({
        pageSize: 10,
        sort: "created_at_asc",
      }),
    );
    expect(
      afterExclusion.data.items.map(
        (item) => item.queueItemReference,
      ),
    ).not.toContain(first.data.items[0]!.queueItemReference);
    const remaining = await traverseQueueReferences(
      {
        pageSize: 1,
        sort: "created_at_asc",
      },
      first.data.nextCursor,
    );
    const traversed = [
      first.data.items[0]!.queueItemReference,
      ...remaining,
    ];
    expect(remaining).toEqual(
      expectedQueueItemReferences(laterBookingIds),
    );
    expect(traversed).toEqual(
      expectedQueueItemReferences([
        pending.bookingReference,
        ...laterBookingIds,
      ]),
    );
    expect(
      remaining.includes(
        first.data.items[0]!.queueItemReference,
      ),
    ).toBe(false);
    expect(new Set(traversed).size).toBe(traversed.length);
  });

  it("continues without repetition when an earlier item changes administrative state", async () => {
    const pending = await createPendingBooking();
    const laterBookingIds = [
      "SYNTH-BOOKING-QUEUE-STATE-B-0001",
      "SYNTH-BOOKING-QUEUE-STATE-C-0001",
    ];
    for (const [index, bookingId] of laterBookingIds.entries()) {
      await insertTerminalBooking(
        bookingId,
        "rescheduled",
        instantFromDatabaseNow(60_000 + index * 1_000),
      );
    }
    const first = requireQueueSuccess(
      await queue({
        pageSize: 1,
        sort: "created_at_asc",
      }),
    );
    expect(first.data.items[0]).toMatchObject({
      administrativeStatus: "pending_confirmation",
    });

    await confirmBooking(pending.bookingReference);
    const remaining = await traverseQueueReferences(
      {
        pageSize: 1,
        sort: "created_at_asc",
      },
      first.data.nextCursor,
    );
    const traversed = [
      first.data.items[0]!.queueItemReference,
      ...remaining,
    ];
    expect(remaining).toEqual(
      expectedQueueItemReferences(laterBookingIds),
    );
    expect(traversed).toEqual(
      expectedQueueItemReferences([
        pending.bookingReference,
        ...laterBookingIds,
      ]),
    );
    expect(
      remaining.includes(
        first.data.items[0]!.queueItemReference,
      ),
    ).toBe(false);
    expect(new Set(traversed).size).toBe(traversed.length);
  });

  it("traverses more than the former squared page-size cap", async () => {
    const bookingIds = await insertLargeLinkedRescheduledSet(105);
    const traversed = await traverseQueueReferences({
      pageSize: 10,
      sort: "created_at_asc",
    });
    expect(traversed).toEqual(
      expectedQueueItemReferences(bookingIds),
    );
    expect(traversed).toHaveLength(105);
    expect(new Set(traversed).size).toBe(105);
  });

  it("rejects tampered and filter-mismatched cursors generically", async () => {
    for (let index = 1; index <= 2; index += 1) {
      await insertTerminalBooking(
        `SYNTH-BOOKING-QUEUE-CURSOR-000${index}`,
        "rescheduled",
        instantFromDatabaseNow(index * 1_000),
      );
    }
    const first = requireQueueSuccess(
      await queue({ pageSize: 1 }),
    );
    const cursor = first.data.nextCursor!;
    const last = cursor.at(-1);
    const tampered = `${cursor.slice(0, -1)}${
      last === "A" ? "B" : "A"
    }`;
    for (const request of [
      { pageSize: 1, cursor: tampered },
      {
        pageSize: 1,
        cursor,
        status: ["rescheduled"],
      },
      {
        pageSize: 1,
        cursor,
        sort: "created_at_asc",
      },
      {
        pageSize: 2,
        cursor,
      },
    ]) {
      expect(await queue(request)).toEqual({
        success: false,
        error: {
          code: "REQUEST_INVALID",
          message: "We could not process that request.",
        },
      });
    }
  });

  it("returns no internal, identity, contact, credential, or capacity fields", async () => {
    const pending = await createPendingBooking();
    const result = requireQueueSuccess(await queue());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(pending.bookingReference);
    expect(serialized).not.toContain(
      TASK04_SYNTHETIC_REFERENCES.patient,
    );
    expect(serialized).not.toContain(
      TASK04_SYNTHETIC_REFERENCES.contact,
    );
    expect(serialized).not.toMatch(
      /(?:bookingId|slotId|holdId|capacity|pharmacyId|tenantId|subject|actor|caregiver|credential|session|email|phone|healthCard|symptom|diagnos|medication|notes|metadata)/i,
    );
  });

  it("is read-only across all Task 04 booking evidence tables", async () => {
    await createPendingBooking();
    const before = await tableCounts();
    requireQueueSuccess(await queue());
    const after = await tableCounts();
    expect(after).toEqual(before);
  });

  it("fails disabled services and contradictory related data safely", async () => {
    const pending = await createPendingBooking();
    await adminSql`
      UPDATE task04_synthetic.service_category
      SET state = 'unavailable'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    expect(await queue()).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });

    await adminSql`
      UPDATE task04_synthetic.service_category
      SET state = 'active'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    await adminSql`
      UPDATE task04_synthetic.booking
      SET modality = 'telephone'
      WHERE id = ${pending.bookingReference}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    expect(await queue()).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
  });

  it("denies unauthorized and cross-pharmacy staff against trusted database context", async () => {
    await withTask04RuntimeTransaction(
      sql,
      "read committed",
      async (transaction) => {
        const context = await authoritativeContext(transaction);
        const base = {
          actorType: "synthetic_staff",
          actorReference:
            TASK04_SYNTHETIC_REFERENCES.pharmacist,
          sessionReference:
            "SYNTH-STAFF-SESSION-TASK04-QUEUE-0001",
          sessionActive: true,
          pharmacyId: PHARMACY_ID,
          permissions: ["queue:read"],
        } as const;
        expect(
          authorizeStaffPharmacistQueue(context, {
            ...base,
            permissions: [],
          }),
        ).toEqual({
          authorized: false,
          reasonCode: "NOT_AUTHORIZED",
        });
        expect(
          authorizeStaffPharmacistQueue(context, {
            ...base,
            pharmacyId: OTHER_PHARMACY_ID,
          }),
        ).toEqual({
          authorized: false,
          reasonCode: "NOT_AUTHORIZED",
        });
      },
    );
  });

  it("excludes an uncommitted cross-pharmacy negative fixture under the runtime role", async () => {
    await createPendingBooking();
    await expect(
      withTask04RuntimeTransaction(
        sql,
        "read committed",
        async (transaction) => {
          const context = await authoritativeContext(transaction);
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
              'SYNTH-SERVICE-QUEUE-CROSS-0001',
              ${OTHER_PHARMACY_ID},
              'Synthetic cross-scope queue service',
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
              'SYNTH-SLOT-QUEUE-CROSS-0001',
              ${OTHER_PHARMACY_ID},
              'SYNTH-SERVICE-QUEUE-CROSS-0001',
              'in_person',
              ${slotStartUtc},
              ${slotEndUtc},
              'America/Toronto',
              1,
              'active'
            )
          `;
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
              'SYNTH-BOOKING-QUEUE-CROSS-0001',
              ${OTHER_PHARMACY_ID},
              'SYNTH-SERVICE-QUEUE-CROSS-0001',
              'SYNTH-SLOT-QUEUE-CROSS-0001',
              'in_person',
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              ${TASK04_SYNTHETIC_REFERENCES.patient},
              'rescheduled',
              'SYNTHETIC_QUEUE_CROSS'
            )
          `;
          await transaction`
            INSERT INTO task04_synthetic.administrative_preference_snapshot (
              id,
              pharmacy_id,
              booking_id,
              language,
              accessibility_preferences,
              synthetic_contact_reference
            )
            VALUES (
              'SYNTH-PREFERENCE-QUEUE-CROSS-0001',
              ${OTHER_PHARMACY_ID},
              'SYNTH-BOOKING-QUEUE-CROSS-0001',
              'english',
              ARRAY['none']::text[],
              ${TASK04_SYNTHETIC_REFERENCES.contact}
            )
          `;
          const result = await queryTask04PharmacistQueue(
            transaction,
            context,
            environment,
            {
              sort: "start_time_asc",
              pageSize: 10,
            },
          );
          expect(result.data.items).toHaveLength(1);
          expect(JSON.stringify(result)).not.toContain(
            "Synthetic cross-scope queue service",
          );
          throw new Error("TASK04_TEST_QUEUE_ROLLBACK");
        },
      ),
    ).rejects.toThrow("TASK04_TEST_QUEUE_ROLLBACK");
  });

  it("fails approval expiry closed with the canonical feature error", async () => {
    const expiredEnvironment = {
      ...environment,
      expiresAt: new Date(
        Date.parse(databaseNowUtc) - 60_000,
      ),
    };
    expect(
      await executeTask04PharmacistQueue(
        sql,
        expiredEnvironment,
        encoder.encode(JSON.stringify(queueRequest())),
      ),
    ).toEqual({
      success: false,
      error: {
        code: "FEATURE_DISABLED",
        message: "This service is currently unavailable.",
      },
    });
  });
});
