import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";

/**
 * The patient-phone handoff against REAL Postgres: the pharmacy id arrives
 * from a user-controlled URL param, so the action must validate it against the
 * pharmacy table before writing — an unknown/garbage id creates NOTHING, and a
 * valid one creates an intake_session attributed to that pharmacy with a real
 * reference code.
 */
vi.mock("@/lib/db", async () => {
  const { makeTestDb } = await import("@/lib/db/test/harness");
  const { db } = makeTestDb();
  return { db };
});

import { makeTestDb, resetOperationalTables, type TestDb } from "@/lib/db/test/harness";

const PHARMACY_ID = "00000000-0000-0000-0000-0000000000cc";
let db: TestDb;
let close: () => Promise<void>;

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
    insert into pharmacy (id, store_name, odb_fee_tier_code)
    values (${PHARMACY_ID}::uuid, 'Intake Test Pharmacy', 'regular_8_83')
    on conflict (id) do nothing
  `);
});

const baseInput = (pharmacyId: string) => ({
  pharmacyId,
  ailmentGroupCode: "RHINITIS",
  trail: [{ question: "Where's the problem?", answer: "Nose" }],
  priorCountSelfReport: 0,
  existingRxSelfReport: null,
});

async function countIntakes(): Promise<number> {
  const rows = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from intake_session`,
  );
  return (rows as unknown as { n: number }[])[0].n;
}

describe("createIntakeSession (patient-phone handoff)", () => {
  it("valid pharmacy from the QR link: creates the session under that pharmacy with a real code", async () => {
    const { createIntakeSession } = await import("../actions");
    const res = await createIntakeSession(baseInput(PHARMACY_ID));

    expect(res.success).toBe(true);
    expect(res.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/); // 6 chars, no 0/O/1/I/L

    const rows = (await db.execute<{ pharmacy_id: string; code: string }>(
      sql`select pharmacy_id, code from intake_session`,
    )) as unknown as { pharmacy_id: string; code: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].pharmacy_id).toBe(PHARMACY_ID);
    expect(rows[0].code).toBe(res.code);
  });

  it("unknown pharmacy uuid: refuses and writes nothing", async () => {
    const { createIntakeSession } = await import("../actions");
    const res = await createIntakeSession(
      baseInput("11111111-2222-3333-4444-555555555555"),
    );
    expect(res.success).toBe(false);
    expect(res.code).toBeUndefined();
    expect(await countIntakes()).toBe(0);
  });

  it("garbage (non-uuid) pharmacy param: refuses cleanly and writes nothing", async () => {
    const { createIntakeSession } = await import("../actions");
    const res = await createIntakeSession(baseInput("'; drop table pharmacy;--"));
    expect(res.success).toBe(false);
    expect(await countIntakes()).toBe(0);
  });

  it("resolvePharmacy: known id resolves, unknown and malformed do not", async () => {
    const { resolvePharmacy } = await import("../actions");
    expect(await resolvePharmacy(PHARMACY_ID)).toMatchObject({
      id: PHARMACY_ID,
      storeName: "Intake Test Pharmacy",
    });
    expect(await resolvePharmacy("11111111-2222-3333-4444-555555555555")).toBeNull();
    expect(await resolvePharmacy("not-a-uuid")).toBeNull();
    expect(await resolvePharmacy(undefined)).toBeNull();
  });
});
