import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";

/**
 * The completion action against REAL Postgres.
 *
 * Point the action's `db` at the throwaway test database. The action itself is
 * unchanged — this exercises the real insert path, the real triggers, and the
 * real constraints, not a mock of them.
 *
 * The auth GUARD is the one thing stubbed (there is no HTTP request, hence no
 * session, inside a unit test): requirePortalUser returns a fixed actor whose
 * user row exists in the test DB, so the action's prescriber-from-profile
 * lookup is still the real query. The guard's own logic is thin and its
 * refusal paths are covered by the slice-5 orientation tests.
 */
vi.mock("@/lib/db", async () => {
  const { makeTestDb } = await import("@/lib/db/test/harness");
  const { db } = makeTestDb();
  return { db };
});

const testAuth = vi.hoisted(() => ({
  actor: {
    userId: "",
    pharmacyId: "",
    role: "pharmacist" as
      | "pharmacy_admin"
      | "pharmacist"
      | "intern"
      | "student"
      | "technician",
    name: "Test Pharmacist",
    email: "pharmacist@test.local",
    supervisingPharmacistId: null as string | null,
  },
}));

vi.mock("@/lib/auth-guard", () => {
  class AuthorizationError extends Error {
    constructor(public readonly reason: string) {
      super(reason);
      this.name = "AuthorizationError";
    }
  }
  return {
    AuthorizationError,
    PORTAL_ROLES: ["pharmacy_admin", "pharmacist", "intern", "student", "technician"],
    ASSESSING_ROLES: ["pharmacy_admin", "pharmacist"],
    requirePortalUser: vi.fn(async () => ({ ...testAuth.actor })),
    requireSession: vi.fn(),
    requirePortalPage: vi.fn(),
  };
});

import { makeTestDb, resetOperationalTables, type TestDb } from "@/lib/db/test/harness";

const PHARMACY_ID = "00000000-0000-0000-0000-0000000000bb";
let db: TestDb;
let close: () => Promise<void>;
let patientId: string;

async function countClaimDrafts(): Promise<number> {
  const rows = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from claim_draft where superseded_by_id is null`,
  );
  return (rows as unknown as { n: number }[])[0].n;
}

beforeAll(() => {
  const t = makeTestDb();
  db = t.db;
  close = t.close;
});
afterAll(async () => {
  await close();
});

beforeEach(async () => {
  await resetOperationalTables(db);
  await db.execute(sql`
    insert into pharmacy (id, store_name, odb_fee_tier)
    values (${PHARMACY_ID}::uuid, 'Test Pharmacy', 'regular_8_83')
    on conflict (id) do nothing
  `);
  const rows = await db.execute<{ id: string }>(sql`
    insert into patient (pharmacy_id, first_name, last_name, dob, health_number, gender)
    values (${PHARMACY_ID}::uuid, 'Test', 'Patient', '1990-01-01', '5555555555AB', 'U')
    returning id
  `);
  patientId = (rows as unknown as { id: string }[])[0].id;

  // The signed-in pharmacist. The claim's prescriber_id must come from THIS
  // row's ocp_number — the action accepts no prescriber input. Attested
  // (orientation on file): every other test in this file doubles as the
  // "attested pharmacist proceeds" half of the orientation-gate pair.
  const userRows = await db.execute<{ id: string }>(sql`
    insert into "user" (name, email, role, pharmacy_id, ocp_number, orientation_completed_at)
    values ('Test Pharmacist', 'pharmacist@test.local', 'pharmacist'::user_role, ${PHARMACY_ID}::uuid, '123456', now())
    returning id
  `);
  testAuth.actor.userId = (userRows as unknown as { id: string }[])[0].id;
  testAuth.actor.pharmacyId = PHARMACY_ID;
  testAuth.actor.role = "pharmacist";
  testAuth.actor.supervisingPharmacistId = null;
});

async function countRows(table: "assessment" | "claim_draft"): Promise<number> {
  const rows = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from ${sql.raw(table)}`,
  );
  return (rows as unknown as { n: number }[])[0].n;
}

const baseInput = () => ({
  patientId,
  ailmentGroupCode: "RHINITIS",
  modality: "in_person",
  outcome: "rx_issued",
  serviceDate: new Date("2026-07-16"),
  isOdbRecipient: true,
});

describe("createAssessment → claim_draft", () => {
  it("billable: persists exactly one active draft, with derived fields", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment(baseInput());

    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(true);
    expect(await countClaimDrafts()).toBe(1);

    const rows = await db.execute<{
      pin_code: string;
      fee_cents: number;
      prescriber_id_reference: string;
      prescriber_id: string;
      quantity: number;
      ssc: number | null;
    }>(sql`select pin_code, fee_cents, prescriber_id_reference, prescriber_id, quantity, ssc from claim_draft`);
    const d = (rows as unknown as Record<string, unknown>[])[0];
    expect(d.pin_code).toBe("9858181"); // Rhinitis, in-person, Rx issued
    expect(d.fee_cents).toBe(1900);
    expect(d.prescriber_id_reference).toBe("09");
    expect(d.prescriber_id).toBe("123456");
    expect(d.quantity).toBe(1);
    expect(d.ssc).toBeNull();
  });

  it("completed-then-referral is billable with SSC 4", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({ ...baseInput(), outcome: "no_rx_referral" });
    expect(res.claim?.billable).toBe(true);
    expect(await countClaimDrafts()).toBe(1);
    const rows = await db.execute<{ ssc: number }>(sql`select ssc from claim_draft`);
    expect((rows as unknown as { ssc: number }[])[0].ssc).toBe(4);
  });

  it("NON-billable: persists zero drafts and surfaces the reason", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({
      ...baseInput(),
      ltc: { isResident: true, providerRole: "secondary", isEmergency: false },
    });

    // The assessment still happened and is recorded; the claim is not.
    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(false);
    if (res.claim && !res.claim.billable) {
      expect(res.claim.reason).toBe("LTC_SECONDARY_NON_EMERGENCY");
      expect(res.claim.message).toMatch(/verification/i);
    }
    expect(await countClaimDrafts()).toBe(0);
  });

  it("NON-billable: an unknown ailment group drafts nothing (never a default PIN)", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({ ...baseInput(), ailmentGroupCode: "NOT_A_REAL_AILMENT" });
    expect(res.claim?.billable).toBe(false);
    if (res.claim && !res.claim.billable) expect(res.claim.reason).toBe("UNKNOWN_PIN_LOOKUP");
    expect(await countClaimDrafts()).toBe(0);
  });

  it("ORIENTATION GATE: an un-attested pharmacist's completion refuses — no assessment row, no claim row", async () => {
    const { createAssessment } = await import("../actions");
    const rows = await db.execute<{ id: string }>(sql`
      insert into "user" (name, email, role, pharmacy_id, ocp_number)
      values ('No Orientation', 'nomodule@test.local', 'pharmacist'::user_role, ${PHARMACY_ID}::uuid, '654321')
      returning id
    `);
    testAuth.actor.userId = (rows as unknown as { id: string }[])[0].id;

    const res = await createAssessment(baseInput());

    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/Mandatory Orientation/i);
    // Refused BEFORE anything was written — not a recorded-but-unbillable
    // assessment, and deriveClaimDraft was never reached.
    expect(await countRows("assessment")).toBe(0);
    expect(await countRows("claim_draft")).toBe(0);
  });

  it("ORIENTATION GATE: the attested pharmacist's identical completion proceeds", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment(baseInput());
    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(true);
    expect(await countRows("assessment")).toBe(1);
  });

  it("ORIENTATION GATE: an intern's completion keys off the SUPERVISOR's orientation, and bills the supervisor's OCP", async () => {
    const { createAssessment } = await import("../actions");
    // Supervisor without orientation → the intern's completion refuses.
    const sup = await db.execute<{ id: string }>(sql`
      insert into "user" (name, email, role, pharmacy_id, ocp_number)
      values ('Supervisor', 'supervisor@test.local', 'pharmacist'::user_role, ${PHARMACY_ID}::uuid, '777777')
      returning id
    `);
    const supervisorId = (sup as unknown as { id: string }[])[0].id;
    const intern = await db.execute<{ id: string }>(sql`
      insert into "user" (name, email, role, pharmacy_id, supervising_pharmacist_id)
      values ('Ivy Intern', 'intern@test.local', 'intern'::user_role, ${PHARMACY_ID}::uuid, ${supervisorId}::uuid)
      returning id
    `);
    testAuth.actor.userId = (intern as unknown as { id: string }[])[0].id;
    testAuth.actor.role = "intern";
    testAuth.actor.supervisingPharmacistId = supervisorId;

    const refused = await createAssessment(baseInput());
    expect(refused.success).toBe(false);
    expect(await countRows("claim_draft")).toBe(0);

    // Record the supervisor's orientation → same completion now proceeds,
    // with the SUPERVISOR's OCP number on the draft (never the intern's).
    await db.execute(
      sql`update "user" set orientation_completed_at = now() where id = ${supervisorId}::uuid`,
    );
    const ok = await createAssessment(baseInput());
    expect(ok.success).toBe(true);
    expect(ok.claim?.billable).toBe(true);
    const drafts = await db.execute<{ prescriber_id: string }>(
      sql`select prescriber_id from claim_draft`,
    );
    expect((drafts as unknown as { prescriber_id: string }[])[0].prescriber_id).toBe("777777");
  });

  it("completion links the assessment to its intake_session and consumes it (single-use)", async () => {
    const { createAssessment, getIntakeSessionById } = await import("../actions");
    const intakeRows = await db.execute<{ id: string }>(sql`
      insert into intake_session (code, pharmacy_id, ailment_group_code, trail, consent_captured_at, expires_at)
      values ('QQTAB2', ${PHARMACY_ID}::uuid, 'RHINITIS', '[{"question":"Q","answer":"A"}]'::jsonb, now(), now() + interval '2 hours')
      returning id
    `);
    const intakeId = (intakeRows as unknown as { id: string }[])[0].id;

    // Loading it (the table click / typed code — same guarded action) works
    // while pending, and carries the consent timestamp.
    const loaded = await getIntakeSessionById(intakeId);
    expect(loaded.success).toBe(true);
    if (loaded.success) expect(loaded.session.consentCapturedAt).not.toBeNull();

    const res = await createAssessment({ ...baseInput(), intakeSessionId: intakeId });
    expect(res.success).toBe(true);

    const linked = (await db.execute<{ intake_session_id: string }>(
      sql`select intake_session_id from assessment`,
    )) as unknown as { intake_session_id: string }[];
    expect(linked[0].intake_session_id).toBe(intakeId);

    const consumed = (await db.execute<{ consumed_at: string; consumed_by_assessment_id: string }>(
      sql`select consumed_at, consumed_by_assessment_id from intake_session where id = ${intakeId}::uuid`,
    )) as unknown as { consumed_at: string; consumed_by_assessment_id: string }[];
    expect(consumed[0].consumed_at).not.toBeNull();
    expect(consumed[0].consumed_by_assessment_id).toBe(res.success ? res.assessmentId : null);

    // Single-use: the same intake can no longer be loaded.
    const reload = await getIntakeSessionById(intakeId);
    expect(reload.success).toBe(false);
  });

  it("another pharmacy's intake and an expired intake cannot be loaded", async () => {
    const { getIntakeSessionById } = await import("../actions");
    const OTHER = "00000000-0000-0000-0000-0000000000dd";
    await db.execute(sql`
      insert into pharmacy (id, store_name, odb_fee_tier)
      values (${OTHER}::uuid, 'Other Pharmacy', 'regular_8_83')
      on conflict (id) do nothing
    `);
    const rows = await db.execute<{ a: string; b: string }>(sql`
      with foreign_intake as (
        insert into intake_session (code, pharmacy_id, ailment_group_code, expires_at)
        values ('QQTAB3', ${OTHER}::uuid, 'RHINITIS', now() + interval '2 hours')
        returning id
      ), expired_intake as (
        insert into intake_session (code, pharmacy_id, ailment_group_code, expires_at)
        values ('QQTAB4', ${PHARMACY_ID}::uuid, 'RHINITIS', now() - interval '1 minute')
        returning id
      )
      select (select id from foreign_intake) as a, (select id from expired_intake) as b
    `);
    const { a: foreignId, b: expiredId } = (rows as unknown as { a: string; b: string }[])[0];

    // The mocked actor belongs to PHARMACY_ID — the foreign intake must not
    // resolve, and neither must the expired one.
    expect((await getIntakeSessionById(foreignId)).success).toBe(false);
    expect((await getIntakeSessionById(expiredId)).success).toBe(false);
  });

  it("a red-flag exit writes ZERO claim rows (the invariant)", async () => {
    const { logTriageExit } = await import("@/app/(intake)/assessment/actions");
    await logTriageExit({
      ailmentGroupCode: "UTI",
      reason: "Red flags selected: The person is male",
    });

    // It logs the exit and touches nothing billable. createAssessment is never
    // reached on this path — and deriveClaimDraft refuses RED_FLAG_EXIT anyway.
    const exits = await db.execute<{ n: number }>(sql`select count(*)::int as n from triage_exit`);
    expect((exits as unknown as { n: number }[])[0].n).toBe(1);

    const assessments = await db.execute<{ n: number }>(sql`select count(*)::int as n from assessment`);
    expect((assessments as unknown as { n: number }[])[0].n).toBe(0);
    expect(await countClaimDrafts()).toBe(0);
  });
});
