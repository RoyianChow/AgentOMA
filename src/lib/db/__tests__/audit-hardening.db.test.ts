import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";

import { makeTestDb, resetOperationalTables, type TestDb } from "../test/harness";
import { computeRetainUntil } from "../../retention";

/**
 * Migration 0011 against REAL Postgres:
 *
 *  A) retain_until is computed by a BEFORE trigger — a direct insert cannot
 *     set the retention clock wrong, and the DB value matches
 *     computeRetainUntil exactly (app/DB parity).
 *  B) the agentoma_app role (which the live app runs as) cannot UPDATE or
 *     DELETE audit_log — the 0004 REVOKE finally binds because the app is no
 *     longer the table owner. The test connection is superuser, so SET ROLE
 *     impersonates the app role directly.
 */

const PHARMACY_ID = "00000000-0000-0000-0000-0000000000ee";
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
    insert into pharmacy (id, store_name, odb_fee_tier)
    values (${PHARMACY_ID}::uuid, 'Hardening Test Pharmacy', 'regular_8_83')
    on conflict (id) do nothing
  `);
});

async function insertPatient(dob: string): Promise<string> {
  const rows = await db.execute<{ id: string }>(sql`
    insert into patient (pharmacy_id, first_name, last_name, dob, health_number, gender)
    values (${PHARMACY_ID}::uuid, 'Retain', 'Case', ${dob}, ${"H" + dob.replace(/-/g, "")}, 'U')
    returning id
  `);
  return (rows as unknown as { id: string }[])[0].id;
}

async function insertAssessmentWithClaimedRetain(
  patientId: string,
  serviceDate: string,
  claimedRetainUntil: string,
): Promise<string> {
  const rows = await db.execute<{ retain_until: string }>(sql`
    insert into assessment (pharmacy_id, patient_id, ailment_group_code, modality, outcome, service_date, retain_until)
    values (${PHARMACY_ID}::uuid, ${patientId}::uuid, 'RHINITIS', 'in_person', 'rx_issued', ${serviceDate}::date, ${claimedRetainUntil}::date)
    returning retain_until::text
  `);
  return (rows as unknown as { retain_until: string }[])[0].retain_until;
}

describe("retain_until DB backstop (assessment_retain_until_trg)", () => {
  it("a minor: lowballed retain_until is overwritten with the age-18 branch (the Sam Child case)", async () => {
    const patientId = await insertPatient("2019-03-15");
    // Claim an absurdly short retention — the trigger must ignore it.
    const stored = await insertAssessmentWithClaimedRetain(patientId, "2026-07-16", "2027-01-01");
    expect(stored).toBe("2047-03-15"); // (dob + 18y) + 10y, NOT service + 10y

    // Parity with the app-side computation.
    const app = computeRetainUntil(new Date("2026-07-16"), new Date("2019-03-15"));
    expect(stored).toBe(app.toISOString().slice(0, 10));
  });

  it("an adult: service + 10 years wins, whatever the caller claimed", async () => {
    const patientId = await insertPatient("1980-05-02");
    const stored = await insertAssessmentWithClaimedRetain(patientId, "2026-07-16", "2099-01-01");
    expect(stored).toBe("2036-07-16");
  });

  it("an UPDATE cannot shorten the clock either", async () => {
    const patientId = await insertPatient("2019-03-15");
    await insertAssessmentWithClaimedRetain(patientId, "2026-07-16", "2047-03-15");
    const rows = await db.execute<{ retain_until: string }>(sql`
      update assessment set retain_until = '2027-01-01'::date
      returning retain_until::text
    `);
    expect((rows as unknown as { retain_until: string }[])[0].retain_until).toBe("2047-03-15");
  });
});

describe("agentoma_app role: audit_log is append-only AT THE GRANT LEVEL", () => {
  async function asAppRole(stmt: ReturnType<typeof sql.raw>): Promise<string | null> {
    // One transaction: impersonate the app role, attempt the statement,
    // report the SQLSTATE. Runs on the throwaway DB where migration 0011
    // created the same role + grants the live DB has.
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`set local role agentoma_app`);
        await tx.execute(stmt);
      });
      return null; // statement was allowed
    } catch (err) {
      let cursor: unknown = err;
      while (cursor && typeof cursor === "object") {
        const code = (cursor as { code?: unknown }).code;
        if (typeof code === "string") return code;
        cursor = (cursor as { cause?: unknown }).cause;
      }
      return "UNKNOWN";
    }
  }

  it("UPDATE and DELETE are denied (42501), INSERT is allowed", async () => {
    await db.execute(
      sql`insert into audit_log (action, entity_type) values ('hardening.fixture', 'system')`,
    );

    expect(await asAppRole(sql.raw(`update audit_log set action = 'tampered'`))).toBe("42501");
    expect(await asAppRole(sql.raw(`delete from audit_log`))).toBe("42501");
    expect(
      await asAppRole(
        sql.raw(`insert into audit_log (action, entity_type) values ('hardening.app-insert', 'system')`),
      ),
    ).toBeNull();
  });

  it("claim_draft: full-row UPDATE and DELETE denied; only superseded_by_id is updatable", async () => {
    expect(await asAppRole(sql.raw(`update claim_draft set fee_cents = 0`))).toBe("42501");
    expect(await asAppRole(sql.raw(`delete from claim_draft`))).toBe("42501");
    // Column-level grant: allowed by PRIVILEGES (no rows exist, so the 0006
    // trigger never fires — this asserts the grant boundary specifically).
    expect(
      await asAppRole(sql.raw(`update claim_draft set superseded_by_id = null where false`)),
    ).toBeNull();
  });
});
