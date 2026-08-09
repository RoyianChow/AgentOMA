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

import {
  task04CommandConfigurationFromEnvironment,
} from "../booking/config";
import type {
  Task04BookingConfirmRequest,
  Task04BookingCreateRequest,
} from "../booking/contracts";
import { queryTask04PublicAvailability } from "../db/availability";
import { createTask04AuthoritativeTransactionContext } from "../db/authoritative-context";
import {
  executeTask04BookingConfirm,
  type Task04BookingConfirmCommandResult,
} from "../db/booking-confirm";
import {
  executeTask04BookingCreate,
  type Task04BookingCreateCommandResult,
} from "../db/booking-create";
import {
  executeTask04BookingRetrieve,
  type Task04BookingRetrieveCommandResult,
} from "../db/booking-retrieve";
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
const PHARMACY_TIMEZONE = "America/Toronto";
const FIXED_ENV_PARSE_TIME = "2026-08-02T00:00:00.000Z";

let sql: Task04SandboxSql;
let secondSql: Task04SandboxSql;
let thirdSql: Task04SandboxSql;
let adminSql: Task04SandboxSql;
let environment: Task04SandboxEnv;
let databaseNowUtc: string;
let slotStartUtc: string;
let slotEndUtc: string;

type PendingBooking = Readonly<{
  bookingReference: string;
  capabilityReference: string;
}>;

function createBarrier(parties: number): () => Promise<void> {
  let arrivals = 0;
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    arrivals += 1;
    if (arrivals === parties) release();
    await released;
  };
}

function instantFromDatabaseNow(offsetMilliseconds: number): string {
  return new Date(
    Date.parse(databaseNowUtc) + offsetMilliseconds,
  ).toISOString();
}

function commandConfiguration() {
  return task04CommandConfigurationFromEnvironment(environment);
}

async function authoritativeContext(
  transaction: Task04TransactionSql,
) {
  return createTask04AuthoritativeTransactionContext(
    transaction,
    environment,
    commandConfiguration(),
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

async function availableSlotReference(): Promise<string> {
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
      const reference = result.items[0]?.slotReference;
      if (!reference) {
        throw new Error("TASK04_TEST_SLOT_REFERENCE_MISSING");
      }
      return reference;
    },
  );
}

function bookingCreateRequest(
  slotReference: string,
  idempotencyKey: string,
): Task04BookingCreateRequest {
  return {
    slotReference,
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
  };
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

function requireRetrieveSuccess(
  result: Task04BookingRetrieveCommandResult,
) {
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error("TASK04_TEST_EXPECTED_RETRIEVE_SUCCESS");
  }
  return result;
}

function requireConfirmSuccess(
  result: Task04BookingConfirmCommandResult,
) {
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error("TASK04_TEST_EXPECTED_CONFIRM_SUCCESS");
  }
  return result;
}

async function createPendingBooking(
  idempotencyKey = "SYNTH-IDEMPOTENCY-CREATE-PENDING-0001",
): Promise<PendingBooking> {
  const slotReference = await availableSlotReference();
  const created = requireCreateSuccess(
    await executeTask04BookingCreate(
      sql,
      environment,
      encoder.encode(
        JSON.stringify(
          bookingCreateRequest(slotReference, idempotencyKey),
        ),
      ),
    ),
  );
  expect(created.data.status).toBe("pending_confirmation");
  return {
    bookingReference: created.data.bookingReference,
    capabilityReference:
      created.data.managementCapability.capabilityReference,
  };
}

function retrieveRequest(
  booking: PendingBooking,
  overrides: Record<string, unknown> = {},
) {
  return {
    bookingReference: booking.bookingReference,
    managementAuthorization: {
      channel: "server_session_bound",
      capabilityReference: booking.capabilityReference,
    },
    ...overrides,
  };
}

function confirmRequest(
  bookingReference: string,
  idempotencyKey: string,
  expectedAggregateVersion = 1,
): Task04BookingConfirmRequest {
  return {
    bookingReference,
    expectedAggregateVersion,
    idempotencyKey,
  };
}

async function confirmBooking(
  connection: Task04SandboxSql,
  request: Task04BookingConfirmRequest,
): Promise<Task04BookingConfirmCommandResult> {
  return executeTask04BookingConfirm(
    connection,
    environment,
    encoder.encode(JSON.stringify(request)),
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
      application_name:
        "agentoma-task04-retrieve-confirm-owner",
      search_path: "task04_synthetic, public",
    },
    onnotice: () => undefined,
  });
  sql = createTask04SandboxSql(environment);
  secondSql = createTask04SandboxSql(environment);
  thirdSql = createTask04SandboxSql(environment);
  await Promise.all([
    adminSql`SELECT 1`,
    sql`SELECT 1`,
    secondSql`SELECT 1`,
    thirdSql`SELECT 1`,
  ]);
});

beforeEach(async () => {
  await resetFoundation();
});

afterAll(async () => {
  await Promise.all([
    closeTask04SandboxSql(sql),
    closeTask04SandboxSql(secondSql),
    closeTask04SandboxSql(thirdSql),
    closeTask04SandboxSql(adminSql),
  ]);
});

describe("Task 04 PostgreSQL booking:retrieve", () => {
  it("returns the minimized booking through an active capability without mutating state", async () => {
    const booking = await createPendingBooking();
    const before = await adminSql<{
      bookings: number;
      holds: number;
      receipts: number;
      audits: number;
      events: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.booking) AS bookings,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_hold) AS holds,
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record) AS receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record) AS audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record) AS events
    `;
    const retrieved = requireRetrieveSuccess(
      await executeTask04BookingRetrieve(
        sql,
        environment,
        retrieveRequest(booking),
      ),
    );
    expect(retrieved).toEqual({
      success: true,
      data: {
        bookingReference: booking.bookingReference,
        status: "pending_confirmation",
        serviceCategoryLabel:
          "Synthetic administrative service",
        modality: "in_person",
        startTimeUtc: slotStartUtc,
        endTimeUtc: slotEndUtc,
        displayTimezone: PHARMACY_TIMEZONE,
        allowedActions: ["none"],
        syntheticNotice:
          "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
      },
    });
    expect(Object.keys(retrieved.data).sort()).toEqual(
      [
        "allowedActions",
        "bookingReference",
        "displayTimezone",
        "endTimeUtc",
        "modality",
        "serviceCategoryLabel",
        "startTimeUtc",
        "status",
        "syntheticNotice",
      ].sort(),
    );
    const after = await adminSql<{
      bookings: number;
      holds: number;
      receipts: number;
      audits: number;
      events: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.booking) AS bookings,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_hold) AS holds,
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record) AS receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record) AS audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record) AS events
    `;
    expect(after).toEqual(before);
  });

  it("keeps inaccessible capability and booking cases externally indistinguishable", async () => {
    const denials: Task04BookingRetrieveCommandResult[] = [];

    let booking = await createPendingBooking();
    denials.push(
      await executeTask04BookingRetrieve(sql, environment, {
        ...retrieveRequest(booking),
        managementAuthorization: {
          channel: "server_session_bound",
          capabilityReference:
            "SYNTH-CAPABILITY-TASK04-UNKNOWN-0001",
        },
      }),
    );
    denials.push(
      await executeTask04BookingRetrieve(sql, environment, {
        bookingReference: booking.bookingReference,
        managementAuthorization: {
          channel: "presented_credential",
          credential:
            "SYNTHETIC_PRESENTED_CREDENTIAL_NOT_FOR_RETRIEVAL",
        },
      }),
    );

    for (const mutation of [
      {
        column: "server_session_binding",
        value: "SYNTH-SESSION-TASK04-WRONG-0001",
      },
      {
        column: "actor_reference",
        value: "SYNTH-DELEGATE-TASK04-WRONG-0001",
      },
      {
        column: "subject_reference",
        value: "SYNTH-PATIENT-TASK04-WRONG-0001",
      },
    ] as const) {
      await resetFoundation();
      booking = await createPendingBooking(
        `SYNTH-IDEMPOTENCY-${mutation.column.toUpperCase()}-0001`,
      );
      await adminSql.unsafe(
        `UPDATE task04_synthetic.management_credential
         SET ${mutation.column} = $1
         WHERE pharmacy_id = $2
           AND capability_reference = $3`,
        [mutation.value, PHARMACY_ID, booking.capabilityReference],
      );
      denials.push(
        await executeTask04BookingRetrieve(
          sql,
          environment,
          retrieveRequest(booking),
        ),
      );
    }

    await resetFoundation();
    booking = await createPendingBooking(
      "SYNTH-IDEMPOTENCY-WRONG-ACTION-0001",
    );
    await adminSql`
      UPDATE task04_synthetic.management_credential
      SET permitted_actions = ARRAY['booking:cancel']::text[]
      WHERE pharmacy_id = ${PHARMACY_ID}
        AND capability_reference = ${booking.capabilityReference}
    `;
    denials.push(
      await executeTask04BookingRetrieve(
        sql,
        environment,
        retrieveRequest(booking),
      ),
    );

    denials.push(
      await executeTask04BookingRetrieve(sql, environment, {
        ...retrieveRequest(booking),
        bookingReference:
          "SYNTH-BOOKING-TASK04-INACCESSIBLE-0001",
      }),
    );

    await resetFoundation();
    booking = await createPendingBooking(
      "SYNTH-IDEMPOTENCY-REVOKED-0001",
    );
    await adminSql`
      UPDATE task04_synthetic.management_credential
      SET state = 'revoked',
          revoked_at_utc = transaction_timestamp()
      WHERE pharmacy_id = ${PHARMACY_ID}
        AND capability_reference = ${booking.capabilityReference}
    `;
    denials.push(
      await executeTask04BookingRetrieve(
        sql,
        environment,
        retrieveRequest(booking),
      ),
    );

    await resetFoundation();
    booking = await createPendingBooking(
      "SYNTH-IDEMPOTENCY-AMBIGUOUS-0001",
    );
    await adminSql.begin(async (transaction) => {
      await transaction`
        UPDATE task04_synthetic.management_credential
        SET state = 'revoked',
            revoked_at_utc = transaction_timestamp()
        WHERE pharmacy_id = ${PHARMACY_ID}
          AND capability_reference = ${booking.capabilityReference}
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
          expires_at_utc,
          revoked_at_utc
        )
        VALUES (
          'SYNTH-CREDENTIAL-TASK04-AMBIGUOUS-0002',
          ${PHARMACY_ID},
          'reusable',
          ${booking.capabilityReference},
          ${booking.bookingReference},
          ARRAY['booking:view']::text[],
          ${TASK04_SYNTHETIC_REFERENCES.delegate},
          ${TASK04_SYNTHETIC_REFERENCES.patient},
          'SYNTH-SESSION-TASK04-BOOKING-0001',
          'revoked',
          ${environment.expiresAt.toISOString()},
          transaction_timestamp()
        )
      `;
    });
    denials.push(
      await executeTask04BookingRetrieve(
        sql,
        environment,
        retrieveRequest(booking),
      ),
    );

    expect(
      new Set(denials.map((result) => JSON.stringify(result))),
    ).toEqual(
      new Set([
        JSON.stringify({
          success: false,
          error: {
            code: "NOT_AUTHORIZED",
            message: "This action is not available.",
          },
        }),
      ]),
    );
  });

  it("uses the distinct canonical expired-link result only for expiry", async () => {
    const booking = await createPendingBooking();
    await adminSql`
      UPDATE task04_synthetic.management_credential
      SET state = 'expired',
          issued_at_utc =
            transaction_timestamp() - INTERVAL '2 minutes',
          expires_at_utc =
            transaction_timestamp() - INTERVAL '1 minute',
          expired_at_utc = transaction_timestamp()
      WHERE pharmacy_id = ${PHARMACY_ID}
        AND capability_reference = ${booking.capabilityReference}
    `;
    expect(
      await executeTask04BookingRetrieve(
        sql,
        environment,
        retrieveRequest(booking),
      ),
    ).toEqual({
      success: false,
      error: {
        code: "LINK_EXPIRED",
        message: "This access path is no longer active.",
      },
    });
  });
});

describe("Task 04 PostgreSQL booking:confirm", () => {
  it("atomically confirms, consumes the hold, transfers capacity ownership, and replays exactly", async () => {
    const booking = await createPendingBooking();
    const request = confirmRequest(
      booking.bookingReference,
      "SYNTH-IDEMPOTENCY-CONFIRM-REPLAY-0001",
    );
    const confirmed = requireConfirmSuccess(
      await confirmBooking(sql, request),
    );
    expect(confirmed.data).toEqual({
      bookingReference: booking.bookingReference,
      status: "confirmed",
      holdStatus: "consumed",
    });

    const replayed = requireConfirmSuccess(
      await confirmBooking(secondSql, request),
    );
    expect(replayed).toEqual(confirmed);

    const [state] = await adminSql<{
      booking_state: string;
      booking_version: number;
      confirmation_deadline_utc: Date | null;
      booking_reason: string;
      hold_state: string;
      hold_version: number;
      consumed_at_utc: Date | null;
      unit_booking_id: string | null;
      unit_hold_id: string | null;
      confirm_receipts: number;
      confirm_audits: number;
      confirm_events: number;
    }[]>`
      SELECT
        booking.state AS booking_state,
        booking.aggregate_version AS booking_version,
        booking.confirmation_deadline_utc,
        booking.safe_reason_code AS booking_reason,
        hold.state AS hold_state,
        hold.aggregate_version AS hold_version,
        hold.consumed_at_utc,
        unit.booking_id AS unit_booking_id,
        unit.capacity_hold_id AS unit_hold_id,
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record
         WHERE operation = 'booking:confirm') AS confirm_receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record
         WHERE safe_action_code = 'BOOKING_CONFIRM')
          AS confirm_audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record
         WHERE event_type = 'booking.confirmed'
           AND safe_reason_code = 'STAFF_CONFIRMED')
          AS confirm_events
      FROM task04_synthetic.booking AS booking
      JOIN task04_synthetic.capacity_hold AS hold
        ON hold.pending_booking_id = booking.id
       AND hold.pharmacy_id = booking.pharmacy_id
      JOIN task04_synthetic.capacity_unit AS unit
        ON unit.booking_id = booking.id
       AND unit.pharmacy_id = booking.pharmacy_id
      WHERE booking.id = ${booking.bookingReference}
        AND booking.pharmacy_id = ${PHARMACY_ID}
    `;
    expect(state).toMatchObject({
      booking_state: "confirmed",
      booking_version: 2,
      confirmation_deadline_utc: null,
      booking_reason: "STAFF_CONFIRMED",
      hold_state: "consumed",
      hold_version: 2,
      unit_booking_id: booking.bookingReference,
      unit_hold_id: null,
      confirm_receipts: 1,
      confirm_audits: 1,
      confirm_events: 1,
    });
    expect(state?.consumed_at_utc?.toISOString()).toBeDefined();

    const [event] = await adminSql<{
      aggregate_version: number;
      actor_type: string;
      dispatch_status: string;
      aggregate_version_superseded: boolean;
      payload: Record<string, unknown>;
    }[]>`
      SELECT
        aggregate_version,
        actor_type,
        dispatch_status,
        aggregate_version_superseded,
        payload
      FROM task04_synthetic.transactional_outbox_record
      WHERE aggregate_id = ${booking.bookingReference}
        AND event_type = 'booking.confirmed'
        AND safe_reason_code = 'STAFF_CONFIRMED'
    `;
    expect(event).toEqual({
      aggregate_version: 2,
      actor_type: "synthetic_staff",
      dispatch_status: "not_dispatched",
      aggregate_version_superseded: false,
      payload: {
        previousState: "pending_confirmation",
        resultingState: "confirmed",
        capacityOwner: "booking",
      },
    });
  });

  it("returns canonical conflict, stale, and already-completed results without extra evidence", async () => {
    let booking = await createPendingBooking();
    const request = confirmRequest(
      booking.bookingReference,
      "SYNTH-IDEMPOTENCY-CONFIRM-CONFLICT-0001",
    );
    requireConfirmSuccess(await confirmBooking(sql, request));
    expect(
      await confirmBooking(secondSql, {
        ...request,
        expectedAggregateVersion: 2,
      }),
    ).toMatchObject({
      success: false,
      error: { code: "IDEMPOTENCY_KEY_CONFLICT" },
    });
    expect(
      await confirmBooking(
        secondSql,
        confirmRequest(
          booking.bookingReference,
          "SYNTH-IDEMPOTENCY-CONFIRM-SECOND-0001",
        ),
      ),
    ).toMatchObject({
      success: false,
      error: { code: "ACTION_ALREADY_COMPLETED" },
    });

    await resetFoundation();
    booking = await createPendingBooking(
      "SYNTH-IDEMPOTENCY-CREATE-STALE-0001",
    );
    expect(
      await confirmBooking(
        sql,
        confirmRequest(
          booking.bookingReference,
          "SYNTH-IDEMPOTENCY-CONFIRM-STALE-0001",
          2,
        ),
      ),
    ).toMatchObject({
      success: false,
      error: { code: "INVALID_TRANSITION" },
    });
    const [counts] = await adminSql<{
      confirm_receipts: number;
      confirm_audits: number;
      confirm_events: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record
         WHERE operation = 'booking:confirm') AS confirm_receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record
         WHERE safe_action_code = 'BOOKING_CONFIRM')
          AS confirm_audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record
         WHERE event_type = 'booking.confirmed'
           AND safe_reason_code = 'STAFF_CONFIRMED')
          AS confirm_events
    `;
    expect(counts).toEqual({
      confirm_receipts: 0,
      confirm_audits: 0,
      confirm_events: 0,
    });
  });

  it("fails malformed stored replay data closed without duplicating confirmation evidence", async () => {
    const booking = await createPendingBooking();
    const request = confirmRequest(
      booking.bookingReference,
      "SYNTH-IDEMPOTENCY-CONFIRM-MALFORMED-REPLAY-0001",
    );
    requireConfirmSuccess(await confirmBooking(sql, request));
    await adminSql`
      UPDATE task04_synthetic.idempotency_record
      SET safe_response_snapshot = ${adminSql.json({
        bookingReference: booking.bookingReference,
        status: "confirmed",
        holdStatus: "consumed",
        internalCapacityUnitId:
          "SYNTH-CAPACITY-TASK04-FORBIDDEN-0001",
      })}::jsonb
      WHERE operation = 'booking:confirm'
    `;
    expect(
      await confirmBooking(secondSql, request),
    ).toMatchObject({
      success: false,
      error: { code: "TEMPORARILY_UNAVAILABLE" },
    });
    const [counts] = await adminSql<{
      booking_version: number;
      hold_version: number;
      confirm_receipts: number;
      confirm_audits: number;
      confirm_events: number;
    }[]>`
      SELECT
        booking.aggregate_version AS booking_version,
        hold.aggregate_version AS hold_version,
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record
         WHERE operation = 'booking:confirm') AS confirm_receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record
         WHERE safe_action_code = 'BOOKING_CONFIRM')
          AS confirm_audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record
         WHERE event_type = 'booking.confirmed'
           AND safe_reason_code = 'STAFF_CONFIRMED')
          AS confirm_events
      FROM task04_synthetic.booking AS booking
      JOIN task04_synthetic.capacity_hold AS hold
        ON hold.pending_booking_id = booking.id
       AND hold.pharmacy_id = booking.pharmacy_id
      WHERE booking.id = ${booking.bookingReference}
    `;
    expect(counts).toEqual({
      booking_version: 2,
      hold_version: 2,
      confirm_receipts: 1,
      confirm_audits: 1,
      confirm_events: 1,
    });
  });

  it("rejects an expired hold using trusted database time without changing it", async () => {
    const booking = await createPendingBooking();
    await adminSql.begin(async (transaction) => {
      const expiredAt = instantFromDatabaseNow(-60 * 60 * 1_000);
      const createdAt = instantFromDatabaseNow(
        -2 * 60 * 60 * 1_000,
      );
      await transaction`
        UPDATE task04_synthetic.booking
        SET confirmation_deadline_utc = ${expiredAt}
        WHERE id = ${booking.bookingReference}
          AND pharmacy_id = ${PHARMACY_ID}
      `;
      await transaction`
        UPDATE task04_synthetic.capacity_hold
        SET created_at_utc = ${createdAt},
            expires_at_utc = ${expiredAt}
        WHERE pending_booking_id = ${booking.bookingReference}
          AND pharmacy_id = ${PHARMACY_ID}
          AND state = 'active'
      `;
    });
    expect(
      await confirmBooking(
        sql,
        confirmRequest(
          booking.bookingReference,
          "SYNTH-IDEMPOTENCY-CONFIRM-EXPIRED-HOLD-0001",
        ),
      ),
    ).toMatchObject({
      success: false,
      error: { code: "INVALID_TRANSITION" },
    });
    const [state] = await adminSql<{
      booking_state: string;
      hold_state: string;
      confirm_receipts: number;
    }[]>`
      SELECT
        booking.state AS booking_state,
        hold.state AS hold_state,
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record
         WHERE operation = 'booking:confirm') AS confirm_receipts
      FROM task04_synthetic.booking AS booking
      JOIN task04_synthetic.capacity_hold AS hold
        ON hold.pending_booking_id = booking.id
       AND hold.pharmacy_id = booking.pharmacy_id
      WHERE booking.id = ${booking.bookingReference}
    `;
    expect(state).toEqual({
      booking_state: "pending_confirmation",
      hold_state: "active",
      confirm_receipts: 0,
    });
  });

  it("fails closed when the related service or slot is no longer valid", async () => {
    for (const target of ["service", "slot"] as const) {
      await resetFoundation();
      const booking = await createPendingBooking(
        `SYNTH-IDEMPOTENCY-CREATE-DISABLED-${target.toUpperCase()}-0001`,
      );
      if (target === "service") {
        await adminSql`
          UPDATE task04_synthetic.service_category
          SET state = 'unavailable'
          WHERE id = ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId}
            AND pharmacy_id = ${PHARMACY_ID}
        `;
      } else {
        await adminSql`
          UPDATE task04_synthetic.booking_slot
          SET state = 'unavailable'
          WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
            AND pharmacy_id = ${PHARMACY_ID}
        `;
      }
      expect(
        await confirmBooking(
          sql,
          confirmRequest(
            booking.bookingReference,
            `SYNTH-IDEMPOTENCY-CONFIRM-DISABLED-${target.toUpperCase()}-0001`,
          ),
        ),
      ).toMatchObject({
        success: false,
        error: { code: "INVALID_TRANSITION" },
      });
    }
  });

  it("allows one transition for simultaneous different-key confirmations", async () => {
    const booking = await createPendingBooking();
    const barrier = createBarrier(2);
    const run = async (
      connection: Task04SandboxSql,
      key: string,
    ) => {
      await barrier();
      return confirmBooking(
        connection,
        confirmRequest(booking.bookingReference, key),
      );
    };
    const results = await Promise.all([
      run(
        sql,
        "SYNTH-IDEMPOTENCY-CONFIRM-RACE-DIFFERENT-0001",
      ),
      run(
        secondSql,
        "SYNTH-IDEMPOTENCY-CONFIRM-RACE-DIFFERENT-0002",
      ),
    ]);
    expect(
      results.filter((result) => result.success),
    ).toHaveLength(1);
    expect(
      results.filter(
        (result) =>
          !result.success &&
          result.error.code === "ACTION_ALREADY_COMPLETED",
      ),
    ).toHaveLength(1);
    const [counts] = await adminSql<{
      confirm_receipts: number;
      confirm_audits: number;
      confirm_events: number;
      booking_units: number;
      active_holds: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record
         WHERE operation = 'booking:confirm') AS confirm_receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record
         WHERE safe_action_code = 'BOOKING_CONFIRM')
          AS confirm_audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record
         WHERE event_type = 'booking.confirmed'
           AND safe_reason_code = 'STAFF_CONFIRMED')
          AS confirm_events,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_unit
         WHERE booking_id = ${booking.bookingReference})
          AS booking_units,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_hold
         WHERE pending_booking_id = ${booking.bookingReference}
           AND state = 'active') AS active_holds
    `;
    expect(counts).toEqual({
      confirm_receipts: 1,
      confirm_audits: 1,
      confirm_events: 1,
      booking_units: 1,
      active_holds: 0,
    });
  });

  it("serializes simultaneous same-key confirmations to one effect and one validated replay", async () => {
    const booking = await createPendingBooking();
    const request = confirmRequest(
      booking.bookingReference,
      "SYNTH-IDEMPOTENCY-CONFIRM-RACE-SAME-0001",
    );
    const barrier = createBarrier(2);
    const run = async (connection: Task04SandboxSql) => {
      await barrier();
      return confirmBooking(connection, request);
    };
    const results = await Promise.all([
      run(sql),
      run(secondSql),
    ]);
    expect(results.every((result) => result.success)).toBe(true);
    expect(results[0]).toEqual(results[1]);
    const [counts] = await adminSql<{
      confirm_receipts: number;
      confirm_audits: number;
      confirm_events: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record
         WHERE operation = 'booking:confirm') AS confirm_receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record
         WHERE safe_action_code = 'BOOKING_CONFIRM')
          AS confirm_audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record
         WHERE event_type = 'booking.confirmed'
           AND safe_reason_code = 'STAFF_CONFIRMED')
          AS confirm_events
    `;
    expect(counts).toEqual({
      confirm_receipts: 1,
      confirm_audits: 1,
      confirm_events: 1,
    });
  });

  it("rolls back a post-transition serialization failure and permits one clean retry", async () => {
    const booking = await createPendingBooking();
    const request = confirmRequest(
      booking.bookingReference,
      "SYNTH-IDEMPOTENCY-CONFIRM-ROLLBACK-0001",
    );
    await adminSql`
      CREATE FUNCTION task04_synthetic.fail_booking_confirm_audit()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NEW.safe_action_code = 'BOOKING_CONFIRM' THEN
          RAISE EXCEPTION USING
            ERRCODE = '40001',
            MESSAGE = 'SYNTHETIC_TEST_CONFIRM_SERIALIZATION';
        END IF;
        RETURN NEW;
      END
      $$
    `;
    await adminSql`
      CREATE TRIGGER fail_booking_confirm_audit
      BEFORE INSERT ON task04_synthetic.synthetic_audit_record
      FOR EACH ROW
      EXECUTE FUNCTION
        task04_synthetic.fail_booking_confirm_audit()
    `;
    let failed: Task04BookingConfirmCommandResult;
    try {
      failed = await confirmBooking(sql, request);
    } finally {
      await adminSql`
        DROP TRIGGER fail_booking_confirm_audit
        ON task04_synthetic.synthetic_audit_record
      `;
      await adminSql`
        DROP FUNCTION
          task04_synthetic.fail_booking_confirm_audit()
      `;
    }
    expect(failed!).toMatchObject({
      success: false,
      error: { code: "TEMPORARILY_UNAVAILABLE" },
    });
    const [rolledBack] = await adminSql<{
      booking_state: string;
      hold_state: string;
      unit_booking_id: string | null;
      unit_hold_id: string | null;
      confirm_receipts: number;
      confirm_audits: number;
      confirm_events: number;
    }[]>`
      SELECT
        booking.state AS booking_state,
        hold.state AS hold_state,
        unit.booking_id AS unit_booking_id,
        unit.capacity_hold_id AS unit_hold_id,
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record
         WHERE operation = 'booking:confirm') AS confirm_receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record
         WHERE safe_action_code = 'BOOKING_CONFIRM')
          AS confirm_audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record
         WHERE event_type = 'booking.confirmed'
           AND safe_reason_code = 'STAFF_CONFIRMED')
          AS confirm_events
      FROM task04_synthetic.booking AS booking
      JOIN task04_synthetic.capacity_hold AS hold
        ON hold.pending_booking_id = booking.id
       AND hold.pharmacy_id = booking.pharmacy_id
      JOIN task04_synthetic.capacity_unit AS unit
        ON unit.capacity_hold_id = hold.id
       AND unit.pharmacy_id = booking.pharmacy_id
      WHERE booking.id = ${booking.bookingReference}
    `;
    expect(rolledBack).toMatchObject({
      booking_state: "pending_confirmation",
      hold_state: "active",
      unit_booking_id: null,
      confirm_receipts: 0,
      confirm_audits: 0,
      confirm_events: 0,
    });
    expect(rolledBack?.unit_hold_id).toMatch(/^SYNTH-HOLD-/);

    requireConfirmSuccess(await confirmBooking(secondSql, request));
    const [committed] = await adminSql<{
      confirm_receipts: number;
      confirm_audits: number;
      confirm_events: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record
         WHERE operation = 'booking:confirm') AS confirm_receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record
         WHERE safe_action_code = 'BOOKING_CONFIRM')
          AS confirm_audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record
         WHERE event_type = 'booking.confirmed'
           AND safe_reason_code = 'STAFF_CONFIRMED')
          AS confirm_events
    `;
    expect(committed).toEqual({
      confirm_receipts: 1,
      confirm_audits: 1,
      confirm_events: 1,
    });
  });

  it("fails approval lifecycle closed before creating a confirmation receipt", async () => {
    const booking = await createPendingBooking();
    const expiredEnvironment = {
      ...environment,
      expiresAt: new Date(
        Date.parse(databaseNowUtc) - 60 * 1_000,
      ),
    };
    const result = await executeTask04BookingConfirm(
      sql,
      expiredEnvironment,
      encoder.encode(
        JSON.stringify(
          confirmRequest(
            booking.bookingReference,
            "SYNTH-IDEMPOTENCY-CONFIRM-APPROVAL-EXPIRED-0001",
          ),
        ),
      ),
    );
    expect(result).toMatchObject({
      success: false,
      error: { code: "FEATURE_DISABLED" },
    });
    const [count] = await adminSql<{ count: number }[]>`
      SELECT count(*)::integer AS count
      FROM task04_synthetic.idempotency_record
      WHERE operation = 'booking:confirm'
    `;
    expect(count?.count).toBe(0);
  });
});
