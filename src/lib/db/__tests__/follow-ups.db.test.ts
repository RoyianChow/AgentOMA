import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

vi.mock("@/lib/db", async () => {
  const { makeTestDb } = await import("@/lib/db/test/harness");
  const { db } = makeTestDb();
  return { db };
});

import type { PortalUser } from "@/lib/auth-guard";
import {
  listFollowUps,
  recordFollowUpAttempt,
  supersedeFollowUp,
} from "@/lib/follow-ups";
import {
  makeTestDb,
  resetOperationalTables,
  type TestDb,
} from "../test/harness";

const PHARMACY_ID = "00000000-0000-0000-0000-000000000000";
let db: TestDb;
let close: () => Promise<void>;
let actor: PortalUser;
let assessmentId: string;
let patientId: string;
let planId: string;

function pgCode(error: unknown): string | undefined {
  let cursor: unknown = error;
  while (cursor && typeof cursor === "object") {
    const code = (cursor as { code?: unknown }).code;
    if (typeof code === "string") return code;
    cursor = (cursor as { cause?: unknown }).cause;
  }
  return undefined;
}

beforeAll(() => {
  const test = makeTestDb();
  db = test.db;
  close = test.close;
});

afterAll(async () => {
  await close();
});

beforeEach(async () => {
  await resetOperationalTables(db);
  await db.execute(sql`
    insert into pharmacy (id, store_name, odb_fee_tier_code)
    values (${PHARMACY_ID}::uuid, 'Follow-up Test Pharmacy', 'regular_8_83')
  `);
  const [user] = (await db.execute<{ id: string }>(sql`
    insert into "user" (
      name, email, role, pharmacy_id, ocp_number,
      two_factor_enabled, orientation_completed_at
    ) values (
      'Follow-up Pharmacist',
      'follow-up@example.test',
      'pharmacist',
      ${PHARMACY_ID}::uuid,
      '123456',
      true,
      now()
    )
    returning id
  `)) as unknown as { id: string }[];
  actor = {
    userId: user.id,
    pharmacyId: PHARMACY_ID,
    role: "pharmacist",
    name: "Follow-up Pharmacist",
    email: "follow-up@example.test",
    supervisingPharmacistId: null,
  };

  const [patient] = (await db.execute<{ id: string }>(sql`
    insert into patient (
      pharmacy_id, first_name, last_name, dob, health_number, gender
    ) values (
      ${PHARMACY_ID}::uuid,
      'Synthetic',
      'Follow-up',
      '1980-01-01',
      'FOLLOWUP0001',
      'U'
    )
    returning id
  `)) as unknown as { id: string }[];
  patientId = patient.id;

  const [assessment] = (await db.execute<{ id: string }>(sql`
    insert into assessment (
      pharmacy_id, pharmacist_user_id, patient_id, ailment_group_code,
      modality, outcome, service_date, retain_until
    ) values (
      ${PHARMACY_ID}::uuid,
      ${user.id}::uuid,
      ${patientId}::uuid,
      'RHINITIS',
      'in_person',
      'rx_issued',
      '2020-01-01',
      '2030-01-01'
    )
    returning id
  `)) as unknown as { id: string }[];
  assessmentId = assessment.id;

  const [plan] = (await db.execute<{ id: string }>(sql`
    insert into follow_up (
      assessment_id, due_date, method, monitoring_parameters,
      recorded_by_user_id, retain_until
    ) values (
      ${assessmentId}::uuid,
      '2020-01-03',
      'phone',
      'Monitor symptom response and treatment tolerance',
      ${user.id}::uuid,
      '2099-01-01'
    )
    returning id
  `)) as unknown as { id: string }[];
  planId = plan.id;
});

describe("migration 0017 self-sufficiency", () => {
  it("creates all follow-up triggers and the deferrable active-plan constraint from zero", async () => {
    const [state] = (await db.execute<{
      trigger_count: number;
      exclusion_deferrable: boolean;
    }>(sql`
      select
        (
          select count(*)::int
          from pg_trigger
          where tgrelid = 'follow_up'::regclass
            and not tgisinternal
            and tgname in (
              'follow_up_validate_links_trg',
              'follow_up_no_mutate',
              'follow_up_retain_until_trg'
            )
        ) as trigger_count,
        (
          select condeferrable
          from pg_constraint
          where conrelid = 'follow_up'::regclass
            and conname = 'follow_up_one_active_plan_per_assessment'
        ) as exclusion_deferrable
    `)) as unknown as {
      trigger_count: number;
      exclusion_deferrable: boolean;
    }[];
    expect(state).toEqual({
      trigger_count: 3,
      exclusion_deferrable: true,
    });
  });
});

describe("follow-up attempt recording", () => {
  it("records not-reached as a valid attempt and keeps the plan open", async () => {
    const attempt = await recordFollowUpAttempt(actor, {
      planId,
      attempt: {
        attemptedAt: new Date("2020-01-03T17:00:00.000Z"),
        reached: false,
        evaluation: "",
        nextStep: "continue",
        note: "No answer; another attempt is needed.",
      },
    });

    expect(attempt.reached).toBe(false);
    expect(attempt.completedAt).toBeNull();

    const worklist = await listFollowUps(actor);
    expect(worklist).toHaveLength(1);
    expect(worklist[0]).toMatchObject({
      id: planId,
      isOpen: true,
      isOverdue: true,
    });
    expect(worklist[0].attempts).toHaveLength(1);

    const [audit] = (await db.execute<{ count: number }>(sql`
      select count(*)::int
      from audit_log
      where action = 'follow_up.recorded'
        and patient_id = ${patientId}::uuid
    `)) as unknown as { count: number }[];
    expect(audit.count).toBe(1);
  });

  it("a reached attempt records the evaluation and closes the plan", async () => {
    await recordFollowUpAttempt(actor, {
      planId,
      attempt: {
        attemptedAt: new Date("2020-01-03T17:00:00.000Z"),
        reached: true,
        evaluation: "Symptoms improved; no adverse effects reported.",
        nextStep: "resolved",
        note: "Care plan complete.",
      },
    });

    const [item] = await listFollowUps(actor);
    expect(item.isOpen).toBe(false);
    expect(item.attempts[0]).toMatchObject({
      reached: true,
      nextStep: "resolved",
      evaluation: "Symptoms improved; no adverse effects reported.",
    });
    expect(item.attempts[0].completedAt).not.toBeNull();
  });

  it("serializes simultaneous reached submissions so exactly one closes the plan", async () => {
    const input = {
      planId,
      attempt: {
        attemptedAt: new Date("2020-01-03T17:00:00.000Z"),
        reached: true,
        evaluation: "Symptoms improved; no adverse effects reported.",
        nextStep: "resolved" as const,
        note: "Concurrent completion fixture.",
      },
    };
    const results = await Promise.allSettled([
      recordFollowUpAttempt(actor, input),
      recordFollowUpAttempt(actor, input),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const [count] = (await db.execute<{ completed: number }>(sql`
      select count(*) filter (where completed_at is not null)::int as completed
      from follow_up
      where plan_id = ${planId}::uuid
        and superseded_by_id is null
    `)) as unknown as { completed: number }[];
    expect(count.completed).toBe(1);
  });
});

describe("follow-up correction by supersession", () => {
  it("atomically inserts a replacement plan and makes the original immutable history", async () => {
    const replacement = await supersedeFollowUp(actor, {
      followUpId: planId,
      kind: "plan",
      correctionReason: "The patient requested an in-person follow-up.",
      plan: {
        dueDate: "2020-01-04",
        method: "in_person",
        monitoringParameters: "Recheck symptoms and inspect treatment response",
      },
    });

    const rows = (await db.execute<{
      id: string;
      superseded_by_id: string | null;
      method: string;
    }>(sql`
      select id, superseded_by_id, method
      from follow_up
      where assessment_id = ${assessmentId}::uuid
        and plan_id is null
      order by created_at, id
    `)) as unknown as {
      id: string;
      superseded_by_id: string | null;
      method: string;
    }[];
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === planId)?.superseded_by_id).toBe(
      replacement.id,
    );
    expect(
      rows.filter((row) => row.superseded_by_id === null),
    ).toEqual([
      expect.objectContaining({
        id: replacement.id,
        method: "in_person",
      }),
    ]);

    await expect(
      db.execute(sql`
        update follow_up
        set monitoring_parameters = 'Tampered'
        where id = ${planId}::uuid
      `),
    ).rejects.toSatisfy((error: unknown) => pgCode(error) === "0A000");
    await expect(
      db.execute(sql`delete from follow_up where id = ${planId}::uuid`),
    ).rejects.toSatisfy((error: unknown) => pgCode(error) === "0A000");

    const [audit] = (await db.execute<{ count: number }>(sql`
      select count(*)::int
      from audit_log
      where action = 'follow_up.superseded'
        and entity_id = ${replacement.id}::uuid
    `)) as unknown as { count: number }[];
    expect(audit.count).toBe(1);
  });

  it("rolls back both rows if the supersession transaction cannot finish", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sql`
          insert into follow_up (
            assessment_id, due_date, method, monitoring_parameters,
            recorded_by_user_id, retain_until
          ) values (
            ${assessmentId}::uuid,
            '2020-01-05',
            'phone',
            'Synthetic replacement that must roll back',
            ${actor.userId}::uuid,
            '2030-01-01'
          )
        `);
        throw new Error("synthetic transaction failure");
      }),
    ).rejects.toThrow(/synthetic transaction failure/);

    const [counts] = (await db.execute<{ total: number; active: number }>(sql`
      select
        count(*)::int as total,
        count(*) filter (where superseded_by_id is null)::int as active
      from follow_up
      where assessment_id = ${assessmentId}::uuid
        and plan_id is null
    `)) as unknown as { total: number; active: number }[];
    expect(counts).toEqual({ total: 1, active: 1 });
  });
});

describe("follow-up retention", () => {
  it("inherits the assessment horizon and extends with a later service", async () => {
    const [initial] = (await db.execute<{ retain_until: string }>(sql`
      select retain_until::text
      from follow_up
      where id = ${planId}::uuid
    `)) as unknown as { retain_until: string }[];
    expect(initial.retain_until).toBe("2030-01-01");

    await db.execute(sql`
      insert into assessment (
        pharmacy_id, pharmacist_user_id, patient_id, ailment_group_code,
        modality, outcome, service_date, retain_until
      ) values (
        ${PHARMACY_ID}::uuid,
        ${actor.userId}::uuid,
        ${patientId}::uuid,
        'GERD',
        'in_person',
        'no_rx_otc_or_nonpharm',
        '2026-07-25',
        '2036-07-25'
      )
    `);

    const [extended] = (await db.execute<{ retain_until: string }>(sql`
      select retain_until::text
      from follow_up
      where id = ${planId}::uuid
    `)) as unknown as { retain_until: string }[];
    expect(extended.retain_until).toBe("2036-07-25");
  });
});
