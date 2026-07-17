import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";

/**
 * The completion action against REAL Postgres.
 *
 * Point the action's `db` at the throwaway test database. The action itself is
 * unchanged — this exercises the real insert path, the real triggers, and the
 * real constraints, not a mock of them.
 */
vi.mock("@/lib/db", async () => {
  const { makeTestDb } = await import("@/lib/db/test/harness");
  const { db } = makeTestDb();
  return { db };
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
});

const baseInput = () => ({
  pharmacyId: PHARMACY_ID,
  patientId,
  ailmentGroupCode: "RHINITIS",
  modality: "in_person",
  outcome: "rx_issued",
  serviceDate: new Date("2026-07-16"),
  prescriberOcpNumber: "123456",
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
