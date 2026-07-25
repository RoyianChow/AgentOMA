import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

vi.mock("@/lib/db", async () => {
  const { makeTestDb } = await import("@/lib/db/test/harness");
  const { db } = makeTestDb();
  return { db };
});

import type { PortalUser } from "@/lib/auth-guard";
import { makeTestDb, resetOperationalTables, type TestDb } from "../test/harness";

const PHARMACY_ID = "00000000-0000-0000-0000-000000000000";
let db: TestDb;
let close: () => Promise<void>;
let firstAdmin: string;
let secondAdmin: string;

const actor = (userId: string): PortalUser => ({
  userId,
  pharmacyId: PHARMACY_ID,
  role: "pharmacy_admin",
  name: "Synthetic Admin",
  email: "synthetic@example.test",
  supervisingPharmacistId: null,
});

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
    values (${PHARMACY_ID}::uuid, 'Governance Test Pharmacy', 'regular_8_83')
  `);
  const users = await db.execute<{ id: string }>(sql`
    insert into "user" (
      name, email, role, pharmacy_id, two_factor_enabled, orientation_completed_at
    ) values
      (
        'First Admin',
        'first-admin@example.test',
        'pharmacy_admin',
        ${PHARMACY_ID}::uuid,
        true,
        now()
      ),
      (
        'Second Admin',
        'second-admin@example.test',
        'pharmacy_admin',
        ${PHARMACY_ID}::uuid,
        true,
        now()
      )
    returning id;
  `);
  [firstAdmin, secondAdmin] = (users as unknown as { id: string }[]).map(
    (row) => row.id,
  );
});

async function seedPatient(
  serviceDate = "2010-01-01",
): Promise<{ patientId: string; assessmentId: string }> {
  const [patientRow] = (await db.execute<{ id: string }>(sql`
    insert into patient (
      pharmacy_id, first_name, last_name, dob, health_number, gender
    ) values (
      ${PHARMACY_ID}::uuid,
      'Synthetic',
      'Patient',
      '1980-01-01',
      ${`999${serviceDate.replaceAll("-", "")}`} ,
      'U'
    )
    returning id
  `)) as unknown as { id: string }[];
  const [assessmentRow] = (await db.execute<{ id: string }>(sql`
    insert into assessment (
      pharmacy_id, patient_id, ailment_group_code, modality, outcome,
      service_date, retain_until
    ) values (
      ${PHARMACY_ID}::uuid,
      ${patientRow.id}::uuid,
      'RHINITIS',
      'in_person',
      'no_rx_otc_or_nonpharm',
      ${serviceDate}::date,
      '2099-01-01'
    )
    returning id
  `)) as unknown as { id: string }[];
  return { patientId: patientRow.id, assessmentId: assessmentRow.id };
}

describe("patient-wide retention", () => {
  it("a returning patient extends every prior assessment to the newest horizon", async () => {
    const { patientId } = await seedPatient("2020-01-01");
    await db.execute(sql`
      insert into assessment (
        pharmacy_id, patient_id, ailment_group_code, modality, outcome,
        service_date, retain_until
      ) values (
        ${PHARMACY_ID}::uuid,
        ${patientId}::uuid,
        'GERD',
        'in_person',
        'no_rx_otc_or_nonpharm',
        '2026-07-25',
        '2027-01-01'
      )
    `);

    const assessments = (await db.execute<{ retain_until: string }>(sql`
      select retain_until::text
      from assessment
      where patient_id = ${patientId}::uuid
      order by service_date
    `)) as unknown as { retain_until: string }[];
    expect(assessments.map((row) => row.retain_until)).toEqual([
      "2036-07-25",
      "2036-07-25",
    ]);

    const [retention] = (await db.execute<{
      last_service_date: string;
      retain_until: string;
    }>(sql`
      select last_service_date::text, retain_until::text
      from patient_record_retention
      where patient_id = ${patientId}::uuid
    `)) as unknown as { last_service_date: string; retain_until: string }[];
    expect(retention).toEqual({
      last_service_date: "2026-07-25",
      retain_until: "2036-07-25",
    });
  });
});

describe("holds and deliberate destruction", () => {
  it("requires dry-run, a second admin, elapsed retention, and no active hold", async () => {
    const { patientId, assessmentId } = await seedPatient();
    await db.execute(sql`
      insert into claim_draft (
        assessment_id, ailment_group_code, modality, billing_modality,
        rx_issued, pin_code, fee_cents, prescriber_id_reference, prescriber_id,
        intervention_codes, quantity
      ) values (
        ${assessmentId}::uuid, 'RHINITIS', 'in_person', 'in_person',
        false, 'SYNTHETIC_PIN', 0, '09', 'SYNTHETIC', '["PS"]'::jsonb, 1
      )
    `);
    await db.execute(sql`
      insert into follow_up (
        assessment_id, due_date, method, monitoring_parameters,
        recorded_by_user_id, retain_until
      ) values (
        ${assessmentId}::uuid,
        '2010-01-03',
        'phone',
        'Synthetic destruction fixture',
        ${firstAdmin}::uuid,
        '2099-01-01'
      )
    `);
    await db.execute(sql`
      insert into audit_log (
        pharmacy_id, patient_id, actor_user_id, action, entity_type, entity_id
      ) values (
        ${PHARMACY_ID}::uuid,
        ${patientId}::uuid,
        ${firstAdmin}::uuid,
        'synthetic.fixture',
        'assessment',
        ${assessmentId}::uuid
      );
    `);
    const [hold] = (await db.execute<{ id: string }>(sql`
      insert into record_hold (
        pharmacy_id, patient_id, record_type, record_id, reason,
        authorized_by_user_id
      ) values (
        ${PHARMACY_ID}::uuid,
        ${patientId}::uuid,
        'assessment',
        ${assessmentId}::uuid,
        'Synthetic legal hold',
        ${firstAdmin}::uuid
      )
      returning id
    `)) as unknown as { id: string }[];
    const [run] = (await db.execute<{ id: string }>(sql`
      insert into destruction_run (
        pharmacy_id, patient_id, status, eligible_on, artifacts,
        prepared_by_user_id
      ) values (
        ${PHARMACY_ID}::uuid,
        ${patientId}::uuid,
        'dry_run',
        '2020-01-01',
        '[]'::jsonb,
        ${firstAdmin}::uuid
      )
      returning id
    `)) as unknown as { id: string }[];

    await expect(
      db.execute(
        sql`select governance_execute_destruction(${run.id}::uuid, ${firstAdmin}::uuid)`,
      ),
    ).rejects.toSatisfy((error: unknown) => pgCode(error) === "55000");

    await expect(
      db.execute(
        sql`select governance_execute_destruction(${run.id}::uuid, ${secondAdmin}::uuid)`,
      ),
    ).rejects.toSatisfy((error: unknown) => pgCode(error) === "55000");

    await db.execute(sql`
      update record_hold
      set released_at = now(),
          released_by_user_id = ${secondAdmin}::uuid,
          release_reason = 'Synthetic hold released'
      where id = ${hold.id}::uuid
    `);
    await db.execute(
      sql`select governance_execute_destruction(${run.id}::uuid, ${secondAdmin}::uuid)`,
    );

    const [counts] = (await db.execute<{
      patients: number;
      assessments: number;
      claims: number;
      follow_ups: number;
      linked_audits: number;
      destruction_events: number;
    }>(sql`
      select
        (select count(*)::int from patient where id = ${patientId}::uuid) as patients,
        (select count(*)::int from assessment where patient_id = ${patientId}::uuid) as assessments,
        (select count(*)::int from claim_draft where assessment_id = ${assessmentId}::uuid) as claims,
        (select count(*)::int from follow_up where assessment_id = ${assessmentId}::uuid) as follow_ups,
        (select count(*)::int from audit_log where patient_id = ${patientId}::uuid) as linked_audits,
        (
          select count(*)::int
          from audit_log
          where action = 'record.destruction.executed'
            and entity_id = ${patientId}::uuid
        ) as destruction_events
    `)) as unknown as {
      patients: number;
      assessments: number;
      claims: number;
      follow_ups: number;
      linked_audits: number;
      destruction_events: number;
    }[];
    expect(counts).toEqual({
      patients: 0,
      assessments: 0,
      claims: 0,
      follow_ups: 0,
      linked_audits: 0,
      destruction_events: 1,
    });
  });
});

describe("correction overlays", () => {
  it("supersedes atomically and preserves the original source record", async () => {
    const { patientId, assessmentId } = await seedPatient();
    const [request] = (await db.execute<{ id: string }>(sql`
      insert into access_correction_request (
        pharmacy_id, patient_id, request_kind, requester_type,
        identity_verification_method, scope
      ) values (
        ${PHARMACY_ID}::uuid,
        ${patientId}::uuid,
        'correction',
        'patient',
        'Synthetic identity check',
        'Synthetic assessment field'
      )
      returning id
    `)) as unknown as { id: string }[];

    const [first] = (await db.execute<{ id: string }>(sql`
      insert into record_correction (
        pharmacy_id, patient_id, request_id, target_entity_type,
        target_entity_id, patch, reason, created_by_user_id
      ) values (
        ${PHARMACY_ID}::uuid,
        ${patientId}::uuid,
        ${request.id}::uuid,
        'assessment',
        ${assessmentId}::uuid,
        '{"carePlan":"Synthetic correction one"}'::jsonb,
        'Synthetic correction',
        ${firstAdmin}::uuid
      )
      returning id
    `)) as unknown as { id: string }[];

    await db.transaction(async (tx) => {
      const [replacement] = (await tx.execute<{ id: string }>(sql`
        insert into record_correction (
          pharmacy_id, patient_id, request_id, target_entity_type,
          target_entity_id, patch, reason, created_by_user_id
        ) values (
          ${PHARMACY_ID}::uuid,
          ${patientId}::uuid,
          ${request.id}::uuid,
          'assessment',
          ${assessmentId}::uuid,
          '{"carePlan":"Synthetic correction two"}'::jsonb,
          'Synthetic replacement',
          ${secondAdmin}::uuid
        )
        returning id
      `)) as unknown as { id: string }[];
      await tx.execute(sql`
        update record_correction
        set superseded_by_id = ${replacement.id}::uuid
        where id = ${first.id}::uuid
      `);
    });

    const [state] = (await db.execute<{
      total: number;
      active: number;
      original_assessment: number;
    }>(sql`
      select
        (select count(*)::int from record_correction where target_entity_id = ${assessmentId}::uuid) as total,
        (
          select count(*)::int
          from record_correction
          where target_entity_id = ${assessmentId}::uuid
            and superseded_by_id is null
        ) as active,
        (select count(*)::int from assessment where id = ${assessmentId}::uuid) as original_assessment
    `)) as unknown as {
      total: number;
      active: number;
      original_assessment: number;
    }[];
    expect(state).toEqual({ total: 2, active: 1, original_assessment: 1 });

    await expect(
      db.execute(sql`
        update record_correction
        set patch = '{"carePlan":"tampered"}'::jsonb
        where id = ${first.id}::uuid
      `),
    ).rejects.toSatisfy((error: unknown) => pgCode(error) === "0A000");
  });
});

describe("patient export", () => {
  it("stores a manifest with hashes and a patient-linked access audit event", async () => {
    const { patientId, assessmentId } = await seedPatient("2026-01-01");
    await db.execute(sql`
      insert into follow_up (
        assessment_id, due_date, method, monitoring_parameters,
        recorded_by_user_id, retain_until
      ) values (
        ${assessmentId}::uuid,
        '2026-01-03',
        'phone',
        'Synthetic export fixture',
        ${firstAdmin}::uuid,
        '2099-01-01'
      )
    `);
    const { assemblePatientExport } = await import("@/lib/governance");
    const exported = await assemblePatientExport(
      actor(firstAdmin),
      patientId,
      "secure_download",
    );

    expect(exported.manifest.artifacts.length).toBeGreaterThan(1);
    expect(exported.bundle.schemaVersion).toBe(2);
    expect(exported.bundle.record.followUps).toHaveLength(1);
    expect(
      exported.manifest.artifacts.some(
        (artifact) => artifact.recordType === "follow_up",
      ),
    ).toBe(true);
    expect(exported.manifest.bundleSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(
      exported.manifest.artifacts.every((artifact) =>
        /^[a-f0-9]{64}$/.test(artifact.sha256),
      ),
    ).toBe(true);

    const [counts] = (await db.execute<{
      manifests: number;
      export_events: number;
    }>(sql`
      select
        (
          select count(*)::int
          from export_manifest
          where patient_id = ${patientId}::uuid
        ) as manifests,
        (
          select count(*)::int
          from audit_log
          where patient_id = ${patientId}::uuid
            and action = 'record.exported'
        ) as export_events
    `)) as unknown as { manifests: number; export_events: number }[];
    expect(counts).toEqual({ manifests: 1, export_events: 1 });
  });
});
