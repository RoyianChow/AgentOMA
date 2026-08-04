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

import { task04CommandConfigurationFromEnvironment } from "../booking/config";
import type { Task04BookingCreateRequest } from "../booking/contracts";
import {
  executeTask04BookingCreate,
  type Task04BookingCreateCommandResult,
} from "../db/booking-create";
import { queryTask04PublicAvailability } from "../db/availability";
import { createTask04AuthoritativeTransactionContext } from "../db/authoritative-context";
import {
  createTask04SandboxSql,
  type Task04SandboxSql,
} from "../db/client";
import {
  TASK04_FOUNDATION_FIXTURES,
  seedTask04Foundation,
} from "../db/fixtures";
import { task04PharmacyCalendarDate } from "../db/pharmacy-calendar";
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

const encoder = new TextEncoder();
const PHARMACY_ID = "SYNTH-PHARMACY-TASK04-LOCAL";
const OTHER_PHARMACY_ID = "SYNTH-PHARMACY-TASK04-OTHER";
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

function bookingRequest(
  slotReference: string,
  idempotencyKey: string,
  languagePreference:
    | "english"
    | "french"
    | "no_preference" = "english",
): Task04BookingCreateRequest {
  return {
    slotReference,
    languagePreference,
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

function rawRequest(
  request: Task04BookingCreateRequest,
): Uint8Array {
  return encoder.encode(JSON.stringify(request));
}

async function createBooking(
  connection: Task04SandboxSql,
  request: Task04BookingCreateRequest,
): Promise<Task04BookingCreateCommandResult> {
  return executeTask04BookingCreate(
    connection,
    environment,
    rawRequest(request),
  );
}

function requireSuccess(
  result: Task04BookingCreateCommandResult,
) {
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error("TASK04_TEST_EXPECTED_SUCCESS");
  }
  return result;
}

async function setServiceConfirmationPolicy(
  requiresStaffConfirmation: boolean,
): Promise<void> {
  await adminSql`
    UPDATE task04_synthetic.service_category
    SET requires_staff_confirmation =
      ${requiresStaffConfirmation}
    WHERE id = ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId}
      AND pharmacy_id = ${PHARMACY_ID}
  `;
}

async function setSlotCapacity(capacity: 1 | 2): Promise<void> {
  await adminSql.begin(async (transaction) => {
    await transaction`
      DELETE FROM task04_synthetic.capacity_unit
      WHERE pharmacy_id = ${PHARMACY_ID}
        AND slot_id = ${TASK04_FOUNDATION_FIXTURES.slotId}
        AND unit_sequence > ${capacity}
    `;
    await transaction`
      UPDATE task04_synthetic.booking_slot
      SET configured_capacity = ${capacity}
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
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
      application_name:
        "agentoma-task04-booking-create-owner",
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
  await adminSql`TRUNCATE task04_synthetic.sandbox_scope CASCADE`;
  await seedTask04Foundation(adminSql, environment);
  const [clock] = await adminSql<{ now_utc: Date }[]>`
    SELECT transaction_timestamp() AS now_utc
  `;
  if (!clock) throw new Error("TASK04_TEST_DATABASE_TIME_MISSING");
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
});

afterAll(async () => {
  await Promise.all([
    closeTask04SandboxSql(sql),
    closeTask04SandboxSql(secondSql),
    closeTask04SandboxSql(thirdSql),
    closeTask04SandboxSql(adminSql),
  ]);
});

describe("Task 04 PostgreSQL booking:create", () => {
  it("commits an immediate booking, one capacity owner, one event, and one audit", async () => {
    await setServiceConfirmationPolicy(false);
    const slotReference = await availableSlotReference();
    const result = requireSuccess(
      await createBooking(
        sql,
        bookingRequest(
          slotReference,
          "SYNTH-IDEMPOTENCY-IMMEDIATE-0001",
        ),
      ),
    );
    expect(result.data).toMatchObject({
      status: "confirmed",
      serviceCategoryLabel: "Synthetic administrative service",
      modality: "in_person",
      startTimeUtc: slotStartUtc,
      endTimeUtc: slotEndUtc,
      displayTimezone: PHARMACY_TIMEZONE,
      syntheticNotice: "SYNTHETIC_ONLY_NO_EXTERNAL_DELIVERY",
    });
    expect(result.data).not.toHaveProperty(
      "confirmationExpiresAtUtc",
    );

    const [persisted] = await adminSql<{
      booking_count: number;
      hold_count: number;
      owned_unit_count: number;
      event_count: number;
      audit_count: number;
      event_type: string;
      dispatch_status: string;
      aggregate_version_superseded: boolean;
      audit_time: Date;
      event_time: Date;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.booking) AS booking_count,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_hold) AS hold_count,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_unit
         WHERE booking_id = ${result.data.bookingReference})
          AS owned_unit_count,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record)
          AS event_count,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record)
          AS audit_count,
        outbox.event_type,
        outbox.dispatch_status,
        outbox.aggregate_version_superseded,
        audit.transitioned_at_utc AS audit_time,
        outbox.occurred_at_utc AS event_time
      FROM task04_synthetic.transactional_outbox_record AS outbox
      JOIN task04_synthetic.synthetic_audit_record AS audit
        ON audit.outbox_record_id = outbox.id
       AND audit.pharmacy_id = outbox.pharmacy_id
    `;
    expect(persisted).toMatchObject({
      booking_count: 1,
      hold_count: 0,
      owned_unit_count: 1,
      event_count: 1,
      audit_count: 1,
      event_type: "booking.confirmed",
      dispatch_status: "not_dispatched",
      aggregate_version_superseded: false,
    });
    expect(persisted?.audit_time.toISOString()).toBe(
      persisted?.event_time.toISOString(),
    );
  });

  it("commits a pending booking with one exact 15-minute active hold", async () => {
    const slotReference = await availableSlotReference();
    const result = requireSuccess(
      await createBooking(
        sql,
        bookingRequest(
          slotReference,
          "SYNTH-IDEMPOTENCY-PENDING-0001",
        ),
      ),
    );
    expect(result.data.status).toBe("pending_confirmation");
    expect(result.data.confirmationExpiresAtUtc).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );

    const [persisted] = await adminSql<{
      booking_state: string;
      actor_reference: string;
      subject_reference: string;
      delegation_grant_reference: string;
      created_at_utc: Date;
      confirmation_deadline_utc: Date;
      hold_state: string;
      hold_expires_at_utc: Date;
      unit_hold_id: string;
      event_type: string;
      event_count: number;
      audit_count: number;
      credential_digest: string | null;
      capability_reference: string;
      server_session_binding: string | null;
      permitted_actions: string[];
      contact_reference: string;
      acknowledgements_are_true: boolean;
      canonical_request_digest: string;
      safe_response_snapshot: string;
      outbox_payload: string;
    }[]>`
      SELECT
        booking.state AS booking_state,
        booking.actor_reference,
        booking.subject_reference,
        booking.delegation_grant_reference,
        booking.created_at_utc,
        booking.confirmation_deadline_utc,
        hold.state AS hold_state,
        hold.expires_at_utc AS hold_expires_at_utc,
        unit.capacity_hold_id AS unit_hold_id,
        outbox.event_type,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record)
          AS event_count,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record)
          AS audit_count,
        credential.credential_digest,
        credential.capability_reference,
        credential.server_session_binding,
        credential.permitted_actions,
        preference.synthetic_contact_reference
          AS contact_reference,
        idempotency.canonical_request_digest,
        idempotency.safe_response_snapshot::text
          AS safe_response_snapshot,
        outbox.payload::text AS outbox_payload,
        (
          acknowledgement.administrative_only
          AND acknowledgement.not_monitored
          AND acknowledgement.no_medical_details
          AND acknowledgement.not_clinical_assessment
          AND acknowledgement.status_controls_confirmation
        ) AS acknowledgements_are_true
      FROM task04_synthetic.booking AS booking
      JOIN task04_synthetic.capacity_hold AS hold
        ON hold.pending_booking_id = booking.id
       AND hold.pharmacy_id = booking.pharmacy_id
      JOIN task04_synthetic.capacity_unit AS unit
        ON unit.capacity_hold_id = hold.id
       AND unit.pharmacy_id = hold.pharmacy_id
      JOIN task04_synthetic.management_credential AS credential
        ON credential.booking_id = booking.id
       AND credential.pharmacy_id = booking.pharmacy_id
      JOIN task04_synthetic.administrative_preference_snapshot
        AS preference
        ON preference.booking_id = booking.id
       AND preference.pharmacy_id = booking.pharmacy_id
      JOIN task04_synthetic.administrative_acknowledgement_record
        AS acknowledgement
        ON acknowledgement.booking_id = booking.id
       AND acknowledgement.pharmacy_id = booking.pharmacy_id
      JOIN task04_synthetic.transactional_outbox_record AS outbox
        ON outbox.aggregate_id = booking.id
       AND outbox.pharmacy_id = booking.pharmacy_id
      JOIN task04_synthetic.idempotency_record AS idempotency
        ON idempotency.id = acknowledgement.command_receipt_id
       AND idempotency.pharmacy_id = acknowledgement.pharmacy_id
    `;
    expect(persisted).toMatchObject({
      booking_state: "pending_confirmation",
      actor_reference: TASK04_SYNTHETIC_REFERENCES.delegate,
      subject_reference: TASK04_SYNTHETIC_REFERENCES.patient,
      delegation_grant_reference:
        TASK04_SYNTHETIC_REFERENCES.delegationGrant,
      hold_state: "active",
      event_type: "booking.created",
      event_count: 1,
      audit_count: 1,
      credential_digest: null,
      capability_reference:
        result.data.managementCapability.capabilityReference,
      server_session_binding:
        "SYNTH-SESSION-TASK04-BOOKING-0001",
      permitted_actions: ["booking:view"],
      contact_reference: TASK04_SYNTHETIC_REFERENCES.contact,
      acknowledgements_are_true: true,
    });
    expect(persisted?.actor_reference).not.toBe(
      persisted?.subject_reference,
    );
    expect(
      persisted?.confirmation_deadline_utc.toISOString(),
    ).toBe(persisted?.hold_expires_at_utc.toISOString());
    expect(
      persisted!.hold_expires_at_utc.getTime() -
        persisted!.created_at_utc.getTime(),
    ).toBe(15 * 60 * 1_000);
    expect(result.data.confirmationExpiresAtUtc).toBe(
      persisted?.hold_expires_at_utc.toISOString(),
    );
    expect(persisted?.canonical_request_digest).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(persisted?.canonical_request_digest).not.toContain(
      TASK04_SYNTHETIC_REFERENCES.contact,
    );
    expect(persisted?.safe_response_snapshot).not.toContain(
      TASK04_SYNTHETIC_REFERENCES.contact,
    );
    expect(persisted?.outbox_payload).not.toContain(
      TASK04_SYNTHETIC_REFERENCES.contact,
    );
  });

  it("allows exactly one winner for the final unit under genuine concurrency", async () => {
    await setSlotCapacity(1);
    const slotReference = await availableSlotReference();
    const barrier = createBarrier(2);
    const run = async (
      connection: Task04SandboxSql,
      key: string,
    ) => {
      await barrier();
      return createBooking(
        connection,
        bookingRequest(slotReference, key),
      );
    };
    const results = await Promise.all([
      run(sql, "SYNTH-IDEMPOTENCY-FINAL-UNIT-0001"),
      run(secondSql, "SYNTH-IDEMPOTENCY-FINAL-UNIT-0002"),
    ]);
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(results.filter((result) => !result.success)).toEqual([
      {
        success: false,
        error: {
          code: "SLOT_NO_LONGER_AVAILABLE",
          message: "That appointment time is no longer available.",
        },
      },
    ]);
    const [counts] = await adminSql<{
      bookings: number;
      holds: number;
      events: number;
      audits: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.booking) AS bookings,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_hold
         WHERE state = 'active') AS holds,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record) AS events,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record) AS audits
    `;
    expect(counts).toEqual({
      bookings: 1,
      holds: 1,
      events: 1,
      audits: 1,
    });
  });

  it("supports configured capacity above one without exceeding it", async () => {
    const slotReference = await availableSlotReference();
    const barrier = createBarrier(3);
    const connections = [sql, secondSql, thirdSql];
    const results = await Promise.all(
      connections.map(async (connection, index) => {
        await barrier();
        return createBooking(
          connection,
          bookingRequest(
            slotReference,
            `SYNTH-IDEMPOTENCY-CAPACITY-TWO-000${index + 1}`,
          ),
        );
      }),
    );
    expect(results.filter((result) => result.success)).toHaveLength(2);
    expect(results.filter((result) => !result.success)).toHaveLength(1);
    const [counts] = await adminSql<{
      bookings: number;
      active_holds: number;
      occupied_units: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.booking) AS bookings,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_hold
         WHERE state = 'active') AS active_holds,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_unit
         WHERE booking_id IS NOT NULL
            OR capacity_hold_id IS NOT NULL) AS occupied_units
    `;
    expect(counts).toEqual({
      bookings: 2,
      active_holds: 2,
      occupied_units: 2,
    });
  });

  it("serializes concurrent same-key requests to one effect and one replay", async () => {
    const slotReference = await availableSlotReference();
    const request = bookingRequest(
      slotReference,
      "SYNTH-IDEMPOTENCY-CONCURRENT-REPLAY-0001",
    );
    const barrier = createBarrier(2);
    const run = async (connection: Task04SandboxSql) => {
      await barrier();
      return createBooking(connection, request);
    };
    const [first, second] = await Promise.all([
      run(sql),
      run(secondSql),
    ]);
    const firstSuccess = requireSuccess(first);
    const secondSuccess = requireSuccess(second);
    expect(secondSuccess).toEqual(firstSuccess);

    const replay = requireSuccess(
      await createBooking(thirdSql, request),
    );
    expect(replay).toEqual(firstSuccess);
    const [counts] = await adminSql<{
      bookings: number;
      receipts: number;
      audits: number;
      events: number;
      active_holds: number;
      preferences: number;
      acknowledgements: number;
      reusable_capabilities: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.booking
         WHERE id = ${firstSuccess.data.bookingReference}
           AND pharmacy_id = ${PHARMACY_ID}) AS bookings,
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record
         WHERE id = ${firstSuccess.receiptId}
           AND pharmacy_id = ${PHARMACY_ID}) AS receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record
         WHERE aggregate_id = ${firstSuccess.data.bookingReference}
           AND idempotency_record_id = ${firstSuccess.receiptId}
           AND pharmacy_id = ${PHARMACY_ID}) AS audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record
         WHERE aggregate_id = ${firstSuccess.data.bookingReference}
           AND pharmacy_id = ${PHARMACY_ID}) AS events,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_hold
         WHERE pending_booking_id =
             ${firstSuccess.data.bookingReference}
           AND pharmacy_id = ${PHARMACY_ID}
           AND state = 'active') AS active_holds,
        (SELECT count(*)::integer
         FROM task04_synthetic.administrative_preference_snapshot
         WHERE booking_id = ${firstSuccess.data.bookingReference}
           AND pharmacy_id = ${PHARMACY_ID}) AS preferences,
        (SELECT count(*)::integer
         FROM task04_synthetic.administrative_acknowledgement_record
         WHERE booking_id = ${firstSuccess.data.bookingReference}
           AND command_receipt_id = ${firstSuccess.receiptId}
           AND pharmacy_id = ${PHARMACY_ID}) AS acknowledgements,
        (SELECT count(*)::integer
         FROM task04_synthetic.management_credential
         WHERE booking_id = ${firstSuccess.data.bookingReference}
           AND pharmacy_id = ${PHARMACY_ID}
           AND usage_mode = 'reusable') AS reusable_capabilities
    `;
    expect(counts).toEqual({
      bookings: 1,
      receipts: 1,
      audits: 1,
      events: 1,
      active_holds: 1,
      preferences: 1,
      acknowledgements: 1,
      reusable_capabilities: 1,
    });
  });

  it("returns a safe conflict for concurrent changed-payload key reuse", async () => {
    const slotReference = await availableSlotReference();
    const key = "SYNTH-IDEMPOTENCY-CONCURRENT-CONFLICT-0001";
    const barrier = createBarrier(2);
    const run = async (
      connection: Task04SandboxSql,
      language: "english" | "french",
    ) => {
      await barrier();
      return createBooking(
        connection,
        bookingRequest(slotReference, key, language),
      );
    };
    const results = await Promise.all([
      run(sql, "english"),
      run(secondSql, "french"),
    ]);
    expect(results.filter((result) => result.success)).toHaveLength(1);
    expect(results.filter((result) => !result.success)).toEqual([
      {
        success: false,
        error: {
          code: "IDEMPOTENCY_KEY_CONFLICT",
          message: "This request key cannot be reused.",
        },
      },
    ]);
    const [counts] = await adminSql<{
      bookings: number;
      receipts: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.booking) AS bookings,
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record) AS receipts
    `;
    expect(counts).toEqual({ bookings: 1, receipts: 1 });
  });

  it("rolls every effect back when audit insertion fails after capacity acquisition", async () => {
    const slotReference = await availableSlotReference();
    await adminSql`
      CREATE FUNCTION task04_synthetic.fail_booking_create_audit()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'SYNTHETIC_TEST_AUDIT_FAILURE';
      END
      $$
    `;
    await adminSql`
      CREATE TRIGGER fail_booking_create_audit
      BEFORE INSERT ON task04_synthetic.synthetic_audit_record
      FOR EACH ROW
      EXECUTE FUNCTION task04_synthetic.fail_booking_create_audit()
    `;
    let result: Task04BookingCreateCommandResult;
    try {
      result = await createBooking(
        sql,
        bookingRequest(
          slotReference,
          "SYNTH-IDEMPOTENCY-ROLLBACK-0001",
        ),
      );
    } finally {
      await adminSql`
        DROP TRIGGER fail_booking_create_audit
        ON task04_synthetic.synthetic_audit_record
      `;
      await adminSql`
        DROP FUNCTION task04_synthetic.fail_booking_create_audit()
      `;
    }
    expect(result!).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
    const [counts] = await adminSql<{
      bookings: number;
      holds: number;
      receipts: number;
      preferences: number;
      acknowledgements: number;
      credentials: number;
      audits: number;
      events: number;
      occupied_units: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.booking) AS bookings,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_hold) AS holds,
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record) AS receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.administrative_preference_snapshot)
          AS preferences,
        (SELECT count(*)::integer
         FROM task04_synthetic.administrative_acknowledgement_record)
          AS acknowledgements,
        (SELECT count(*)::integer
         FROM task04_synthetic.management_credential) AS credentials,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record) AS audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record) AS events,
        (SELECT count(*)::integer
         FROM task04_synthetic.capacity_unit
         WHERE booking_id IS NOT NULL
            OR capacity_hold_id IS NOT NULL) AS occupied_units
    `;
    expect(counts).toEqual({
      bookings: 0,
      holds: 0,
      receipts: 0,
      preferences: 0,
      acknowledgements: 0,
      credentials: 0,
      audits: 0,
      events: 0,
      occupied_units: 0,
    });
  });

  it("fails expired, stale, full, and wrong-pharmacy references generically", async () => {
    const referenceService =
      createTask04PublicSlotReferenceService({
        pharmacyId: PHARMACY_ID,
        secret: environment.publicSlotReferenceSecret,
        ttlSeconds: environment.publicSlotReferenceTtlSeconds,
        sandboxInstanceId: environment.instanceId,
        approvalDecisionVersion:
          environment.approvalDecisionVersion,
        lifecycleExpiresAtUtc:
          environment.expiresAt.toISOString(),
      });
    const expiredReference = referenceService.issue(
      {
        slotId: TASK04_FOUNDATION_FIXTURES.slotId,
        serviceCategoryId:
          TASK04_FOUNDATION_FIXTURES.serviceCategoryId,
        modality: "in_person",
      },
      instantFromDatabaseNow(
        -(environment.publicSlotReferenceTtlSeconds + 1) *
          1_000,
      ),
    ).slotReference;
    const expired = await createBooking(
      sql,
      bookingRequest(
        expiredReference,
        "SYNTH-IDEMPOTENCY-EXPIRED-REFERENCE-0001",
      ),
    );

    const staleReference = await availableSlotReference();
    await adminSql`
      UPDATE task04_synthetic.booking_slot
      SET state = 'unavailable'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    const stale = await createBooking(
      sql,
      bookingRequest(
        staleReference,
        "SYNTH-IDEMPOTENCY-STALE-REFERENCE-0001",
      ),
    );
    await adminSql`
      UPDATE task04_synthetic.booking_slot
      SET state = 'active'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;

    const wrongPharmacyReference =
      createTask04PublicSlotReferenceService({
        pharmacyId: OTHER_PHARMACY_ID,
        secret: environment.publicSlotReferenceSecret,
        ttlSeconds: environment.publicSlotReferenceTtlSeconds,
        sandboxInstanceId: environment.instanceId,
        approvalDecisionVersion:
          environment.approvalDecisionVersion,
        lifecycleExpiresAtUtc:
          environment.expiresAt.toISOString(),
      }).issue(
        {
          slotId: TASK04_FOUNDATION_FIXTURES.slotId,
          serviceCategoryId:
            TASK04_FOUNDATION_FIXTURES.serviceCategoryId,
          modality: "in_person",
        },
        databaseNowUtc,
      ).slotReference;
    const wrongPharmacy = await createBooking(
      sql,
      bookingRequest(
        wrongPharmacyReference,
        "SYNTH-IDEMPOTENCY-WRONG-PHARMACY-0001",
      ),
    );

    const fullReference = await availableSlotReference();
    requireSuccess(
      await createBooking(
        sql,
        bookingRequest(
          fullReference,
          "SYNTH-IDEMPOTENCY-FULL-0001",
        ),
      ),
    );
    requireSuccess(
      await createBooking(
        sql,
        bookingRequest(
          fullReference,
          "SYNTH-IDEMPOTENCY-FULL-0002",
        ),
      ),
    );
    const full = await createBooking(
      sql,
      bookingRequest(
        fullReference,
        "SYNTH-IDEMPOTENCY-FULL-0003",
      ),
    );

    for (const failure of [
      expired,
      stale,
      full,
      wrongPharmacy,
    ]) {
      expect(failure).toEqual({
        success: false,
        error: {
          code: "SLOT_NO_LONGER_AVAILABLE",
          message: "That appointment time is no longer available.",
        },
      });
    }
  });

  it("fails closed when the service or slot is disabled after reference issuance", async () => {
    const serviceReference = await availableSlotReference();
    await adminSql`
      UPDATE task04_synthetic.service_category
      SET state = 'unavailable'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    expect(
      await createBooking(
        sql,
        bookingRequest(
          serviceReference,
          "SYNTH-IDEMPOTENCY-DISABLED-SERVICE-0001",
        ),
      ),
    ).toMatchObject({
      success: false,
      error: { code: "SLOT_NO_LONGER_AVAILABLE" },
    });
    await adminSql`
      UPDATE task04_synthetic.service_category
      SET state = 'active'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    const slotReference = await availableSlotReference();
    await adminSql`
      UPDATE task04_synthetic.booking_slot
      SET state = 'unavailable'
      WHERE id = ${TASK04_FOUNDATION_FIXTURES.slotId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    expect(
      await createBooking(
        sql,
        bookingRequest(
          slotReference,
          "SYNTH-IDEMPOTENCY-DISABLED-SLOT-0001",
        ),
      ),
    ).toMatchObject({
      success: false,
      error: { code: "SLOT_NO_LONGER_AVAILABLE" },
    });
  });

  it("fails malformed stored replay data closed without duplicating evidence", async () => {
    const slotReference = await availableSlotReference();
    const request = bookingRequest(
      slotReference,
      "SYNTH-IDEMPOTENCY-MALFORMED-REPLAY-0001",
    );
    const initial = requireSuccess(await createBooking(sql, request));
    await adminSql`
      UPDATE task04_synthetic.idempotency_record
      SET safe_response_snapshot =
        '{"status":"pending_confirmation"}'::jsonb
      WHERE id = ${initial.receiptId}
        AND pharmacy_id = ${PHARMACY_ID}
    `;
    expect(await createBooking(secondSql, request)).toEqual({
      success: false,
      error: {
        code: "TEMPORARILY_UNAVAILABLE",
        message: "This service is temporarily unavailable.",
      },
    });
    const [counts] = await adminSql<{
      bookings: number;
      audits: number;
      events: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.booking) AS bookings,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record) AS audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record) AS events
    `;
    expect(counts).toEqual({
      bookings: 1,
      audits: 1,
      events: 1,
    });
  });

  it("rolls back a classified serialization failure and permits one clean retry", async () => {
    const slotReference = await availableSlotReference();
    const request = bookingRequest(
      slotReference,
      "SYNTH-IDEMPOTENCY-SERIALIZATION-RETRY-0001",
    );
    await adminSql`
      CREATE FUNCTION task04_synthetic.fail_booking_create_serialization()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION USING
          ERRCODE = '40001',
          MESSAGE = 'SYNTHETIC_TEST_SERIALIZATION_FAILURE';
      END
      $$
    `;
    await adminSql`
      CREATE TRIGGER fail_booking_create_serialization
      BEFORE INSERT ON task04_synthetic.synthetic_audit_record
      FOR EACH ROW
      EXECUTE FUNCTION
        task04_synthetic.fail_booking_create_serialization()
    `;
    let failedAttempt: Task04BookingCreateCommandResult;
    try {
      failedAttempt = await createBooking(sql, request);
    } finally {
      await adminSql`
        DROP TRIGGER fail_booking_create_serialization
        ON task04_synthetic.synthetic_audit_record
      `;
      await adminSql`
        DROP FUNCTION
          task04_synthetic.fail_booking_create_serialization()
      `;
    }
    expect(failedAttempt!).toMatchObject({
      success: false,
      error: { code: "TEMPORARILY_UNAVAILABLE" },
    });
    requireSuccess(await createBooking(secondSql, request));
    const [counts] = await adminSql<{
      bookings: number;
      receipts: number;
      audits: number;
      events: number;
    }[]>`
      SELECT
        (SELECT count(*)::integer
         FROM task04_synthetic.booking) AS bookings,
        (SELECT count(*)::integer
         FROM task04_synthetic.idempotency_record) AS receipts,
        (SELECT count(*)::integer
         FROM task04_synthetic.synthetic_audit_record) AS audits,
        (SELECT count(*)::integer
         FROM task04_synthetic.transactional_outbox_record) AS events
    `;
    expect(counts).toEqual({
      bookings: 1,
      receipts: 1,
      audits: 1,
      events: 1,
    });
  });

  it("uses the runtime role and cannot bypass tenant or capacity constraints", async () => {
    const [identity] = await sql<{ current_user: string }[]>`
      SELECT current_user
    `;
    expect(identity?.current_user).toBe(
      "task04_synthetic_runtime",
    );
    await expect(
      sql.begin(async (transaction) => {
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
            'SYNTH-BOOKING-DIRECT-BYPASS-0001',
            ${PHARMACY_ID},
            ${TASK04_FOUNDATION_FIXTURES.serviceCategoryId},
            ${TASK04_FOUNDATION_FIXTURES.slotId},
            'in_person',
            ${TASK04_SYNTHETIC_REFERENCES.delegate},
            ${TASK04_SYNTHETIC_REFERENCES.patient},
            'confirmed',
            'DIRECT_BYPASS_ATTEMPT'
          )
        `;
      }),
    ).rejects.toBeDefined();
    await expect(
      sql`
        UPDATE task04_synthetic.sandbox_scope
        SET pharmacy_id = ${OTHER_PHARMACY_ID}
      `,
    ).rejects.toBeDefined();
    const [count] = await adminSql<{ count: number }[]>`
      SELECT count(*)::integer AS count
      FROM task04_synthetic.booking
    `;
    expect(count?.count).toBe(0);
  });
});
