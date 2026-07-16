import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import {
  makeTestDb,
  resetOperationalTables,
  TEST_DATABASE_URL,
  assertLocalTestDb,
  type TestDb,
} from "../test/harness";

/**
 * Constraint-backed money rules, against REAL Postgres.
 *
 * These rules are enforced by indexes and triggers. Mocking them tests the mock
 * — the previous suite asserted that a fake `throw { code: "23505" }` produced a
 * friendly message, which proves nothing about whether the database would ever
 * raise it. Everything here makes the database do the work.
 */

let db: TestDb;
let close: () => Promise<void>;

const PHARMACY_ID = "00000000-0000-0000-0000-0000000000aa";
let patientId: string;

/**
 * Drizzle wraps driver errors in DrizzleQueryError, so the Postgres SQLSTATE
 * lives on `.cause`. Unwrap it, and return undefined if the query SUCCEEDED —
 * so a rule that silently stopped firing fails the test loudly instead of
 * looking like a mismatched error.
 */
async function pgErrorCode(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    return err.code ?? err.cause?.code;
  }
}

async function insertAssessment(
  d: TestDb,
  opts: { ailment: string; date: string; patient?: string },
) {
  await d.execute(sql`
    insert into assessment
      (pharmacy_id, patient_id, ailment_group_code, modality, outcome, service_date, retain_until)
    values
      (${PHARMACY_ID}::uuid, ${opts.patient ?? patientId}::uuid, ${opts.ailment},
       'in_person', 'no_rx_otc_or_nonpharm', ${opts.date}::date, '2047-01-01'::date)
  `);
}

beforeAll(() => {
  assertLocalTestDb();
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
    values (${PHARMACY_ID}::uuid, 'Test', 'Patient', '1990-01-01', '1234567890AB', 'U')
    returning id
  `);
  patientId = (rows as unknown as { id: string }[])[0].id;
});

describe("migration chain self-sufficiency (fresh DB, migrated from zero)", () => {
  // globalSetup drops the schema and migrates from empty every run. If the
  // triggers only existed in the old out-of-band `db:harden` script, a fresh
  // database would silently have NO race guard. This asserts they arrive from
  // the migration files alone.
  it("installs every enforcement trigger from the migration files", async () => {
    const rows = await db.execute<{ tgname: string }>(sql`
      select t.tgname from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      where not t.tgisinternal
        and c.relname in ('assessment', 'audit_log', 'claim_draft')
    `);
    const names = (rows as unknown as { tgname: string }[]).map((r) => r.tgname);
    expect(names).toContain("assessment_same_day_mutex_trg");
    expect(names).toContain("audit_log_no_mutate");
    expect(names).toContain("claim_draft_no_mutate");
  });
});

describe("one claim per person / ailment / day", () => {
  it("the DB constraint fires on a duplicate (not app logic)", async () => {
    await insertAssessment(db, { ailment: "RHINITIS", date: "2026-07-16" });
    expect(
      await pgErrorCode(insertAssessment(db, { ailment: "RHINITIS", date: "2026-07-16" })),
    ).toBe("23505");
  });

  it("the same ailment on a different day is fine", async () => {
    await insertAssessment(db, { ailment: "RHINITIS", date: "2026-07-16" });
    expect(
      await pgErrorCode(insertAssessment(db, { ailment: "RHINITIS", date: "2026-07-17" })),
    ).toBeUndefined();
  });

  it("a different ailment on the same day is fine", async () => {
    await insertAssessment(db, { ailment: "RHINITIS", date: "2026-07-16" });
    expect(
      await pgErrorCode(insertAssessment(db, { ailment: "GERD", date: "2026-07-16" })),
    ).toBeUndefined();
  });
});

describe("insect/tick same-day mutex", () => {
  it("blocks the partner ailment on the same day", async () => {
    await insertAssessment(db, { ailment: "INSECT_BITES_URTICARIA", date: "2026-07-16" });
    expect(
      await pgErrorCode(insertAssessment(db, { ailment: "TICK_BITES", date: "2026-07-16" })),
    ).toBe("23P01");
  });

  it("allows the partner ailment on a different day", async () => {
    await insertAssessment(db, { ailment: "INSECT_BITES_URTICARIA", date: "2026-07-16" });
    expect(
      await pgErrorCode(insertAssessment(db, { ailment: "TICK_BITES", date: "2026-07-17" })),
    ).toBeUndefined();
  });

  // THE RACE. An application-level read-then-insert loses this: both
  // transactions read "no partner exists", both insert, both commit, and the
  // pharmacy has billed two mutually-exclusive PINs on one day. The trigger
  // takes a per-patient advisory lock, so the second transaction blocks until
  // the first commits and then sees its row.
  it("under concurrency, exactly one of insect/tick survives", async () => {
    assertLocalTestDb();
    const a = postgres(TEST_DATABASE_URL, { max: 1 });
    const b = postgres(TEST_DATABASE_URL, { max: 1 });
    const day = "2026-08-01";

    const attempt = (c: postgres.Sql, ailment: string) =>
      c.begin(async (tx) => {
        await tx`
          insert into assessment
            (pharmacy_id, patient_id, ailment_group_code, modality, outcome, service_date, retain_until)
          values
            (${PHARMACY_ID}::uuid, ${patientId}::uuid, ${ailment},
             'in_person', 'no_rx_otc_or_nonpharm', ${day}::date, '2047-01-01'::date)
        `;
      });

    try {
      // Fire both at once — no artificial ordering.
      const results = await Promise.allSettled([
        attempt(a, "INSECT_BITES_URTICARIA"),
        attempt(b, "TICK_BITES"),
      ]);

      const ok = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r) => r.status === "rejected");

      expect(ok).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect((failed[0] as PromiseRejectedResult).reason).toMatchObject({ code: "23P01" });

      // And the database agrees: one row, not two.
      const rows = await db.execute<{ n: number }>(sql`
        select count(*)::int as n from assessment
        where patient_id = ${patientId}::uuid and service_date = ${day}::date
      `);
      expect((rows as unknown as { n: number }[])[0].n).toBe(1);
    } finally {
      await a.end({ timeout: 5 });
      await b.end({ timeout: 5 });
    }
  });
});

describe("365-day lookback counting", () => {
  it("counts only assessments inside the trailing 365 days", async () => {
    const serviceDate = new Date("2026-07-16");
    // Inside the window.
    await insertAssessment(db, { ailment: "RHINITIS", date: "2026-07-01" });
    await insertAssessment(db, { ailment: "RHINITIS", date: "2026-01-01" });
    await insertAssessment(db, { ailment: "RHINITIS", date: "2025-07-20" });
    // Outside: more than 365 days before the date of service.
    await insertAssessment(db, { ailment: "RHINITIS", date: "2025-07-10" });
    // A different ailment must not be counted toward this one's maximum.
    await insertAssessment(db, { ailment: "GERD", date: "2026-07-01" });

    const rows = await db.execute<{ n: number }>(sql`
      select count(*)::int as n from assessment
      where patient_id = ${patientId}::uuid
        and ailment_group_code = 'RHINITIS'
        and service_date > (${serviceDate.toISOString().slice(0, 10)}::date - interval '365 days')
    `);
    expect((rows as unknown as { n: number }[])[0].n).toBe(3);
  });
});

describe("claim_draft immutability + supersession", () => {
  async function newAssessment(ailment = "RHINITIS", date = "2026-07-16") {
    const rows = await db.execute<{ id: string }>(sql`
      insert into assessment
        (pharmacy_id, patient_id, ailment_group_code, modality, outcome, service_date, retain_until)
      values
        (${PHARMACY_ID}::uuid, ${patientId}::uuid, ${ailment},
         'in_person', 'rx_issued', ${date}::date, '2047-01-01'::date)
      returning id
    `);
    return (rows as unknown as { id: string }[])[0].id;
  }

  async function newDraft(assessmentId: string, pinCode = "9858181", feeCents = 1900) {
    const rows = await db.execute<{ id: string }>(sql`
      insert into claim_draft
        (assessment_id, ailment_group_code, modality, billing_modality, rx_issued,
         pin_code, fee_cents, prescriber_id_reference, prescriber_id, intervention_codes,
         carrier_id, quantity, ssc)
      values
        (${assessmentId}::uuid, 'RHINITIS', 'in_person', 'in_person', true,
         ${pinCode}, ${feeCents}, '09', '123456', ${JSON.stringify(["PS"])}::jsonb,
         null, 1, null)
      returning id
    `);
    return (rows as unknown as { id: string }[])[0].id;
  }

  it("blocks DELETE", async () => {
    const a = await newAssessment();
    const d = await newDraft(a);
    expect(
      await pgErrorCode(db.execute(sql`delete from claim_draft where id = ${d}::uuid`)),
    ).toBe("0A000");
  });

  it("blocks UPDATE of a billing field", async () => {
    const a = await newAssessment();
    const d = await newDraft(a);
    expect(
      await pgErrorCode(
        db.execute(sql`update claim_draft set fee_cents = 999999 where id = ${d}::uuid`),
      ),
    ).toBe("0A000");
    expect(
      await pgErrorCode(
        db.execute(sql`update claim_draft set pin_code = '0000000' where id = ${d}::uuid`),
      ),
    ).toBe("0A000");
  });

  it("allows exactly one active draft per assessment", async () => {
    const a = await newAssessment();
    await newDraft(a);
    // A second ACTIVE draft violates the partial EXCLUDE constraint. It's
    // DEFERRABLE, so this surfaces at COMMIT (here, statement autocommit).
    expect(await pgErrorCode(newDraft(a))).toBe("23P01");
  });

  it("supersession: correcting a draft keeps both, and only the new one is active", async () => {
    const a = await newAssessment();
    const wrong = await newDraft(a, "9858181", 1900);

    // The correction: insert the replacement and mark the old one, atomically.
    const client = postgres(TEST_DATABASE_URL, { max: 1 });
    let right = "";
    try {
      await client.begin(async (tx) => {
        const [row] = await tx<{ id: string }[]>`
          insert into claim_draft
            (assessment_id, ailment_group_code, modality, billing_modality, rx_issued,
             pin_code, fee_cents, prescriber_id_reference, prescriber_id, intervention_codes,
             carrier_id, quantity, ssc)
          values
            (${a}::uuid, 'RHINITIS', 'virtual_from_pharmacy', 'virtual', true,
             '9858183', 1500, '09', '123456', ${JSON.stringify(["PS"])}::jsonb, null, 1, null)
          returning id
        `;
        await tx`update claim_draft set superseded_by_id = ${row.id}::uuid where id = ${wrong}::uuid`;
        right = row.id;
      });
    } finally {
      await client.end({ timeout: 5 });
    }

    // Both rows survive — the mistake AND the correction.
    const all = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from claim_draft where assessment_id = ${a}::uuid`,
    );
    expect((all as unknown as { n: number }[])[0].n).toBe(2);

    // Export/UI only ever surface the active one.
    const active = await db.execute<{ id: string; pin_code: string }>(sql`
      select id, pin_code from claim_draft
      where assessment_id = ${a}::uuid and superseded_by_id is null
    `);
    const activeRows = active as unknown as { id: string; pin_code: string }[];
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0].id).toBe(right);
    expect(activeRows[0].pin_code).toBe("9858183");
  });

  it("supersession is final — it cannot be cleared or repointed", async () => {
    const a = await newAssessment();
    const oldDraft = await newDraft(a);
    const a2 = await newAssessment("GERD", "2026-07-18");
    const replacement = await newDraft(a2);

    await db.execute(
      sql`update claim_draft set superseded_by_id = ${replacement}::uuid where id = ${oldDraft}::uuid`,
    );
    // Un-superseding would rewrite history just as effectively as an UPDATE.
    expect(
      await pgErrorCode(
        db.execute(sql`update claim_draft set superseded_by_id = null where id = ${oldDraft}::uuid`),
      ),
    ).toBe("0A000");
  });

  it("the supersede transaction is atomic — a failure leaves the original active", async () => {
    const a = await newAssessment();
    const original = await newDraft(a);

    const client = postgres(TEST_DATABASE_URL, { max: 1 });
    try {
      await expect(
        client.begin(async (tx) => {
          const [row] = await tx<{ id: string }[]>`
            insert into claim_draft
              (assessment_id, ailment_group_code, modality, billing_modality, rx_issued,
               pin_code, fee_cents, prescriber_id_reference, prescriber_id, intervention_codes,
               carrier_id, quantity, ssc)
            values
              (${a}::uuid, 'RHINITIS', 'virtual_from_pharmacy', 'virtual', true,
               '9858183', 1500, '09', '123456', ${JSON.stringify(["PS"])}::jsonb, null, 1, null)
            returning id
          `;
          await tx`update claim_draft set superseded_by_id = ${row.id}::uuid where id = ${original}::uuid`;
          throw new Error("boom — something failed after the supersede");
        }),
      ).rejects.toThrow("boom");
    } finally {
      await client.end({ timeout: 5 });
    }

    // Rolled back cleanly: the original is still the one and only active draft.
    const rows = await db.execute<{ id: string }>(sql`
      select id from claim_draft where assessment_id = ${a}::uuid and superseded_by_id is null
    `);
    const activeRows = rows as unknown as { id: string }[];
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0].id).toBe(original);
  });
});

describe("audit_log immutability (live, not just intended)", () => {
  it("blocks UPDATE and DELETE", async () => {
    const rows = await db.execute<{ id: string }>(sql`
      insert into audit_log (action, entity_type) values ('test.event', 'test') returning id
    `);
    const id = (rows as unknown as { id: string }[])[0].id;
    expect(
      await pgErrorCode(
        db.execute(sql`update audit_log set action = 'tampered' where id = ${id}::uuid`),
      ),
    ).toBe("0A000");
    expect(
      await pgErrorCode(db.execute(sql`delete from audit_log where id = ${id}::uuid`)),
    ).toBe("0A000");
  });
});
