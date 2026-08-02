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
import type { ClinicalRecordInput } from "@/lib/clinical-record-types";

const PHARMACY_ID = "00000000-0000-0000-0000-000000000000";
let db: TestDb;
let close: () => Promise<void>;
let patientId: string;
let intakeSessionId: string;

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
    insert into pharmacy (
      id, store_name, odb_fee_tier_code, address_line1, city, province, postal_code, phone
    )
    values (
      ${PHARMACY_ID}::uuid, 'Test Pharmacy', 'regular_8_83',
      '100 Test Street', 'Toronto', 'ON', 'M5V 1A1', '416-555-0100'
    )
    on conflict (id) do nothing
  `);
  const rows = await db.execute<{ id: string }>(sql`
    insert into patient (pharmacy_id, first_name, last_name, dob, health_number, gender)
    values (${PHARMACY_ID}::uuid, 'Test', 'Patient', '1990-01-01', '5555555555AB', 'U')
    returning id
  `);
  patientId = (rows as unknown as { id: string }[])[0].id;

  const intakeRows = await db.execute<{ id: string }>(sql`
    insert into intake_session (
      code, pharmacy_id, ailment_group_code, prior_count_self_report,
      existing_rx_self_report, expires_at
    )
    values (
      'BASE01', ${PHARMACY_ID}::uuid, 'RHINITIS', 1, 'none',
      now() + interval '2 hours'
    )
    returning id
  `);
  intakeSessionId = (intakeRows as unknown as { id: string }[])[0].id;

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

async function countRows(
  table:
    | "assessment"
    | "assessment_billability_evidence"
    | "claim_draft"
    | "follow_up",
): Promise<number> {
  const rows = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from ${sql.raw(table)}`,
  );
  return (rows as unknown as { n: number }[])[0].n;
}

function clinicalRecordFor(
  outcome: "rx_issued" | "no_rx_referral" | "no_rx_otc_or_nonpharm" = "rx_issued",
): ClinicalRecordInput {
  return {
    consent: {
      method: "verbal",
      givenBy: "patient",
      obtainedAt: "2026-07-16T14:00:00.000Z",
    },
    presentingComplaint: {
      primaryConcern: "Synthetic rhinitis symptoms for integration testing",
      onset: "Two days ago",
      duration: "Two days",
      course: "unchanged",
      associatedSymptoms: "Synthetic sneezing and watery eyes",
      aggravatingFactors: "Synthetic outdoor exposure",
      relievingFactors: "None reported",
      treatmentsTried: "None reported",
    },
    healthHistory: "No relevant synthetic history",
    medicationHistory: "No current synthetic medications",
    allergies: "No known synthetic allergies",
    assessmentFindings: "Synthetic findings consistent with the documented complaint",
    sharedDecisionMaking: "Options, benefits, and risks discussed in this synthetic record",
    carePlan: "Synthetic care plan",
    followUpPlan: "Synthetic monitoring and follow-up plan",
    noRxRationaleCode:
      outcome === "no_rx_referral"
        ? "referral_to_other_provider"
        : outcome === "no_rx_otc_or_nonpharm"
          ? "otc_recommended"
          : undefined,
    prescription:
      outcome === "rx_issued"
        ? {
            prescribedOn: "2026-07-16",
            patientAddressLine1: "200 Synthetic Avenue",
            patientCity: "Toronto",
            patientProvince: "ON",
            patientPostalCode: "M5V 2T6",
            drugName: "Synthetic Drug",
            strength: "1 unit",
            quantity: "10 units",
            directionsDose: "1 unit",
            directionsFrequency: "Once daily",
            directionsRoute: "Topical",
            pcpNotificationAt: "2026-07-16T14:15:00.000Z",
            pcpNotificationMethod: "fax",
            patientChoiceInformedAt: "2026-07-16T14:10:00.000Z",
          }
        : undefined,
  };
}

const baseInput = (
  overrides: Partial<{
    outcome: "rx_issued" | "no_rx_referral" | "no_rx_otc_or_nonpharm";
  }> = {},
) => {
  const outcome = overrides.outcome ?? "rx_issued";
  return {
    patientId,
    intakeSessionId,
    modality: "in_person" as const,
    outcome,
    serviceDate: new Date("2026-07-16"),
    clinicalRecord: clinicalRecordFor(outcome),
    followUpPlan: {
      dueDate: "2026-07-18",
      method: "phone" as const,
      monitoringParameters:
        "Synthetic safety, symptom response, and treatment-tolerance checks",
    },
    isOdbRecipient: true,
    eligibilityDocument: {
      identifierType: "ohip_health_number" as const,
      identifierIssuer: "Ontario",
      documentInspectedAttestation: true as const,
    },
    selfOrFamily: "not_self_or_family" as const,
    sameAilmentPrescription: "none" as const,
    verificationConsultation: "not_required" as const,
    patientSelfReportLocation: "Synthetic pharmacy",
    clinicalViewer: {
      source: "ConnectingOntario" as const,
      attestation: true as const,
      maximumState: "not_confirmed_met" as const,
    },
  };
};

describe("createAssessment → claim_draft", () => {
  it("revalidates and normalizes patient identity at the protected server boundary", async () => {
    const { upsertPatient } = await import("../actions");
    const created = await upsertPatient({
      firstName: "Synthetic",
      lastName: "Identity",
      dob: "2000-02-29",
      identifierType: "ohip_health_number",
      healthNumber: "4444-444-444 ab",
      gender: "U",
    });
    expect(created.success).toBe(true);

    const rows = (await db.execute<{ health_number: string }>(sql`
      select health_number
      from patient
      where health_number = '4444444444AB'
    `)) as unknown as { health_number: string }[];
    expect(rows).toEqual([{ health_number: "4444444444AB" }]);

    const invalidValue = "AB4444444444";
    const refused = await upsertPatient({
      firstName: "Synthetic",
      lastName: "Identity",
      dob: "2000-02-29",
      identifierType: "ohip_health_number",
      healthNumber: invalidValue,
      gender: "U",
    });
    expect(refused.success).toBe(false);
    if (!refused.success) {
      expect(refused.error).not.toContain(invalidValue);
    }
  });

  it.each([
    ["odb_mccss", "MCCSS / Recipient 42-A"],
    ["odb_hccss", "HCCSS / Recipient 42-B"],
  ] as const)(
    "persists a bounded %s identifier without claiming an official regex",
    async (identifierType, displayedIdentifier) => {
      const { createAssessment, upsertPatient } = await import("../actions");
      const patientResult = await upsertPatient({
        firstName: "Synthetic",
        lastName: "Recipient",
        dob: "1990-01-01",
        identifierType,
        healthNumber: displayedIdentifier,
        gender: "U",
      });
      expect(patientResult.success).toBe(true);
      if (!patientResult.success) return;

      const res = await createAssessment({
        ...baseInput(),
        patientId: patientResult.patientId,
        eligibilityDocument: {
          identifierType,
          identifierIssuer:
            identifierType === "odb_mccss" ? "MCCSS" : "HCCSS",
          documentInspectedAttestation: true,
        },
      });
      expect(res.success).toBe(true);
      if (!res.success) return;

      const rows = (await db.execute<{
        identifier_number: string;
        health_card_version_code: string | null;
      }>(sql`
        select identifier_number, health_card_version_code
        from assessment_billability_evidence
        where assessment_id = ${res.assessmentId}::uuid
      `)) as unknown as {
        identifier_number: string;
        health_card_version_code: string | null;
      }[];
      expect(rows).toEqual([
        {
          identifier_number: displayedIdentifier,
          health_card_version_code: null,
        },
      ]);
    },
  );

  it("billable: persists exactly one active draft, with derived fields", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment(await baseInput());

    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(true);
    expect(await countClaimDrafts()).toBe(1);
    expect(await countRows("follow_up")).toBe(1);
    expect(await countRows("assessment_billability_evidence")).toBe(1);

    const rows = await db.execute<{
      pin_code: string;
      fee_cents: number;
      prescriber_id_reference: string;
      prescriber_id: string;
      quantity: number;
      ssc: number | null;
    }>(sql`select pin_code, fee_cents, prescriber_id_reference, prescriber_id, quantity, ssc from claim_draft`);
    const d = (rows as unknown as Record<string, unknown>[])[0];
    const [referencePin] = (await db.execute<{
      pin_code: string;
      fee_cents: number;
    }>(sql`
      select p.pin_code, p.fee_cents
      from pin p
      join ailment_group ag on ag.id = p.ailment_group_id
      where ag.code = 'RHINITIS'
        and ag.end_date is null
        and p.end_date is null
        and p.modality = 'in_person'
        and p.rx_issued = true
      order by ag.effective_date desc, p.effective_date desc
      limit 1
    `)) as unknown as { pin_code: string; fee_cents: number }[];
    expect(d.pin_code).toBe(referencePin.pin_code);
    expect(d.fee_cents).toBe(referencePin.fee_cents);
    expect(d.prescriber_id_reference).toBe("09");
    expect(d.prescriber_id).toBe("123456");
    expect(d.quantity).toBe(1);
    expect(d.ssc).toBeNull();

    const plans = (await db.execute<{
      assessment_id: string;
      due_date: string;
      method: string;
      monitoring_parameters: string;
    }>(sql`
      select assessment_id, due_date::text, method, monitoring_parameters
      from follow_up
      where plan_id is null and superseded_by_id is null
    `)) as unknown as {
      assessment_id: string;
      due_date: string;
      method: string;
      monitoring_parameters: string;
    }[];
    expect(plans).toEqual([
      {
        assessment_id: res.success ? res.assessmentId : "",
        due_date: "2026-07-18",
        method: "phone",
        monitoring_parameters:
          "Synthetic safety, symptom response, and treatment-tolerance checks",
      },
    ]);
    const followUpAudit = (await db.execute<{ count: number }>(sql`
      select count(*)::int
      from audit_log
      where action = 'follow_up.created'
        and entity_id = (
          select id from follow_up
          where assessment_id = ${res.success ? res.assessmentId : ""}::uuid
        )
    `)) as unknown as { count: number }[];
    expect(followUpAudit[0].count).toBe(1);
    const consumed = (await db.execute<{
      consumed_at: Date | null;
      consumed_by_assessment_id: string | null;
    }>(sql`
      select consumed_at, consumed_by_assessment_id
      from intake_session
      where id = ${intakeSessionId}::uuid
    `)) as unknown as {
      consumed_at: Date | null;
      consumed_by_assessment_id: string | null;
    }[];
    expect(consumed[0].consumed_at).not.toBeNull();
    expect(consumed[0].consumed_by_assessment_id).toBe(
      res.success ? res.assessmentId : null,
    );
  });

  it("persists the complete P0-C evidence snapshot beside the P0-B record", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment(baseInput());
    expect(res.success).toBe(true);
    if (!res.success) return;

    const rows = (await db.execute<{
      evidence_version: number;
      patient_self_report_status: string;
      patient_self_report_approximate_count: number;
      patient_self_report_location: string;
      platform_assessment_count: number;
      trailing_window_start: string;
      trailing_window_end: string;
      viewer_source: string;
      viewer_attestation: boolean;
      maximum_state: string;
      self_or_family: string;
      same_ailment_prescription: string;
      verification_consultation: string;
      identifier_type: string;
      identifier_number: string;
      health_card_version_code: string;
      document_inspected_attestation: boolean;
    }>(sql`
      select
        evidence_version, patient_self_report_status,
        patient_self_report_approximate_count, patient_self_report_location,
        platform_assessment_count, trailing_window_start::text,
        trailing_window_end::text, viewer_source, viewer_attestation,
        maximum_state, self_or_family, same_ailment_prescription,
        verification_consultation, identifier_type, identifier_number,
        health_card_version_code, document_inspected_attestation
      from assessment_billability_evidence
      where assessment_id = ${res.assessmentId}::uuid
    `)) as unknown as {
      evidence_version: number;
      patient_self_report_status: string;
      patient_self_report_approximate_count: number;
      patient_self_report_location: string;
      platform_assessment_count: number;
      trailing_window_start: string;
      trailing_window_end: string;
      viewer_source: string;
      viewer_attestation: boolean;
      maximum_state: string;
      self_or_family: string;
      same_ailment_prescription: string;
      verification_consultation: string;
      identifier_type: string;
      identifier_number: string;
      health_card_version_code: string;
      document_inspected_attestation: boolean;
    }[];

    expect(rows[0]).toMatchObject({
      evidence_version: 1,
      patient_self_report_status: "yes",
      patient_self_report_approximate_count: 1,
      patient_self_report_location: "Synthetic pharmacy",
      platform_assessment_count: 0,
      trailing_window_start: "2025-07-16",
      trailing_window_end: "2026-07-16",
      viewer_source: "ConnectingOntario",
      viewer_attestation: true,
      maximum_state: "not_confirmed_met",
      self_or_family: "not_self_or_family",
      same_ailment_prescription: "none",
      verification_consultation: "not_required",
      identifier_type: "ohip_health_number",
      identifier_number: "5555555555",
      health_card_version_code: "AB",
      document_inspected_attestation: true,
    });
  });

  it("reports prior assessments using the requested service date and excludes future assessments", async () => {
    const { createAssessment, getPatientHistoryCount } = await import("../actions");
    const created = await createAssessment(baseInput());
    expect(created.success).toBe(true);

    const nextIntake = (await db.execute<{ id: string }>(sql`
      insert into intake_session (
        code, pharmacy_id, ailment_group_code, prior_count_self_report,
        existing_rx_self_report, expires_at
      ) values (
        'NEXT01', ${PHARMACY_ID}::uuid, 'RHINITIS', 1, 'none',
        now() + interval '2 hours'
      )
      returning id
    `)) as unknown as { id: string }[];
    await db.execute(sql`
      insert into assessment (
        pharmacy_id, patient_id, ailment_group_code, modality, outcome,
        service_date, retain_until
      ) values (
        ${PHARMACY_ID}::uuid, ${patientId}::uuid, 'RHINITIS',
        'in_person', 'no_rx_referral', '2026-07-15', '2036-07-15'
      )
    `);
    await db.execute(sql`
      insert into assessment (
        pharmacy_id, patient_id, ailment_group_code, modality, outcome,
        service_date, retain_until
      ) values (
        ${PHARMACY_ID}::uuid, ${patientId}::uuid, 'RHINITIS',
        'in_person', 'rx_issued', '2026-07-18', '2036-07-18'
      )
    `);
    const result = await getPatientHistoryCount(
      patientId,
      nextIntake[0].id,
      new Date("2026-07-17T00:00:00.000Z"),
    );
    const [reference] = (await db.execute<{ maximum: number }>(sql`
      select max_claims_per365_days as maximum
      from ailment_group
      where code = 'RHINITIS' and end_date is null
      order by effective_date desc
      limit 1
    `)) as unknown as { maximum: number }[];

    expect(result).toEqual({
      success: true,
      count: 2,
      maximum: reference.maximum,
      trailingWindowStart: "2025-07-17",
      trailingWindowEnd: "2026-07-17",
    });
  });

  it("hard-blocks completion without document inspection and writes nothing", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment(
      {
        ...baseInput(),
        eligibilityDocument: {
          ...baseInput().eligibilityDocument,
          documentInspectedAttestation: false,
        },
      } as unknown as Parameters<typeof createAssessment>[0],
    );

    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/eligibility/i);
    expect(await countRows("assessment")).toBe(0);
    expect(await countRows("claim_draft")).toBe(0);
    const intakeRows = (await db.execute<{ consumed_at: Date | null }>(sql`
      select consumed_at
      from intake_session
      where id = ${intakeSessionId}::uuid
    `)) as unknown as { consumed_at: Date | null }[];
    expect(intakeRows[0].consumed_at).toBeNull();
  });

  it("fails closed for a patient outside the authenticated pharmacy boundary", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({
      ...baseInput(),
      patientId: "10000000-0000-4000-8000-000000000099",
    });

    expect(res.success).toBe(false);
    expect(await countRows("assessment")).toBe(0);
    expect(await countRows("assessment_billability_evidence")).toBe(0);
    expect(await countRows("claim_draft")).toBe(0);
  });

  it("passes the self/family fact authoritatively and persists no claim draft", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({
      ...baseInput(),
      selfOrFamily: "family",
    });

    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(false);
    if (res.claim && !res.claim.billable) {
      expect(res.claim.reason).toBe("SELF_OR_FAMILY");
    }
    expect(await countRows("assessment")).toBe(1);
    expect(await countRows("claim_draft")).toBe(0);
  });

  it("passes the pharmacist's existing-prescription gate authoritatively", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({
      ...baseInput(),
      sameAilmentPrescription: "adaptable",
    });

    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(false);
    if (res.claim && !res.claim.billable) {
      expect(res.claim.reason).toBe("EXISTING_RX_BLOCKS_CLAIM");
    }
    expect(await countRows("assessment")).toBe(1);
    expect(await countRows("claim_draft")).toBe(0);
  });

  it("keeps the persisted self-report and platform count advisory", async () => {
    const { createAssessment } = await import("../actions");
    const [reference] = (await db.execute<{ maximum: number }>(sql`
      select max_claims_per365_days as maximum
      from ailment_group
      where code = 'RHINITIS' and end_date is null
      order by effective_date desc
      limit 1
    `)) as unknown as { maximum: number }[];
    const advisoryIntake = (await db.execute<{ id: string }>(sql`
      insert into intake_session (
        code, pharmacy_id, ailment_group_code, prior_count_self_report,
        existing_rx_self_report, expires_at
      ) values (
        'ADV001', ${PHARMACY_ID}::uuid, 'RHINITIS', ${reference.maximum},
        'none', now() + interval '2 hours'
      )
      returning id
    `)) as unknown as { id: string }[];

    const res = await createAssessment({
      ...baseInput(),
      intakeSessionId: advisoryIntake[0].id,
    });
    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(true);
    expect(await countRows("claim_draft")).toBe(1);
  });

  it("only a confirmed-met maximum state blocks the claim draft", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({
      ...baseInput(),
      clinicalViewer: {
        ...baseInput().clinicalViewer,
        maximumState: "confirmed_met",
      },
    });
    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(false);
    if (res.claim && !res.claim.billable) {
      expect(res.claim.reason).toBe("CLAIM_MAXIMUM_REACHED");
    }
    expect(await countRows("assessment_billability_evidence")).toBe(1);
    expect(await countRows("claim_draft")).toBe(0);
  });

  it.each(["unknown", "at_or_near"] as const)(
    "requires viewer verification for %s while allowing an advisory draft",
    async (maximumState) => {
      const { createAssessment } = await import("../actions");
      const missingViewer = await createAssessment(
        {
          ...baseInput(),
          clinicalViewer: {
            ...baseInput().clinicalViewer,
            maximumState,
            attestation: false,
          },
        } as unknown as Parameters<typeof createAssessment>[0],
      );
      expect(missingViewer.success).toBe(false);
      expect(await countRows("assessment")).toBe(0);

      const completed = await createAssessment({
        ...baseInput(),
        clinicalViewer: {
          ...baseInput().clinicalViewer,
          maximumState,
        },
      });
      expect(completed.success).toBe(true);
      expect(completed.claim?.billable).toBe(true);
    },
  );

  it("blocks unresolved prescription facts without calling them a confirmed exclusion", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({
      ...baseInput(),
      sameAilmentPrescription: "unresolved",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toMatch(/resolve/i);
      expect(res.error).not.toMatch(/exclusion/i);
    }
    expect(await countRows("assessment")).toBe(0);
    expect(await countRows("claim_draft")).toBe(0);
  });

  it("serializes concurrent completion at the seeded boundary with one evidence snapshot", async () => {
    const { createAssessment } = await import("../actions");
    const [reference] = (await db.execute<{
      group_id: string;
      maximum: number;
      pin_code: string;
      fee_cents: number;
    }>(sql`
      select
        ag.id as group_id,
        ag.max_claims_per365_days as maximum,
        p.pin_code,
        p.fee_cents
      from ailment_group ag
      join pin p on p.ailment_group_id = ag.id
      where ag.code = 'RHINITIS'
        and ag.end_date is null
        and p.end_date is null
        and p.modality = 'in_person'
        and p.rx_issued = true
      order by ag.effective_date desc, p.effective_date desc
      limit 1
    `)) as unknown as {
      group_id: string;
      maximum: number;
      pin_code: string;
      fee_cents: number;
    }[];

    for (let index = 1; index < reference.maximum; index += 1) {
      const historicalDate = `2026-07-${String(16 - index).padStart(2, "0")}`;
      const inserted = (await db.execute<{ id: string }>(sql`
        insert into assessment (
          pharmacy_id, patient_id, ailment_group_code, modality, outcome,
          service_date, retain_until
        ) values (
          ${PHARMACY_ID}::uuid, ${patientId}::uuid, 'RHINITIS',
          'in_person', 'rx_issued', ${historicalDate}::date, '2036-07-16'
        )
        returning id
      `)) as unknown as { id: string }[];
      await db.execute(sql`
        insert into claim_draft (
          assessment_id, ailment_group_code, modality, billing_modality,
          rx_issued, pin_code, fee_cents, prescriber_id_reference,
          prescriber_id, intervention_codes, quantity
        ) values (
          ${inserted[0].id}::uuid, 'RHINITIS', 'in_person', 'in_person',
          true, ${reference.pin_code}, ${reference.fee_cents}, '09',
          '123456', '["PS"]'::jsonb, 1
        )
      `);
    }

    const secondIntake = (await db.execute<{ id: string }>(sql`
      insert into intake_session (
        code, pharmacy_id, ailment_group_code, prior_count_self_report,
        existing_rx_self_report, expires_at
      ) values (
        'RACE01', ${PHARMACY_ID}::uuid, 'RHINITIS', 0, 'none',
        now() + interval '2 hours'
      )
      returning id
    `)) as unknown as { id: string }[];
    const results = await Promise.all([
      createAssessment(baseInput()),
      createAssessment({
        ...baseInput(),
        intakeSessionId: secondIntake[0].id,
      }),
    ]);
    const billable = results.filter(
      (result) => result.success && result.claim?.billable,
    );
    expect(billable).toHaveLength(1);
    expect(await countClaimDrafts()).toBe(reference.maximum);
    expect(await countRows("assessment_billability_evidence")).toBe(1);
    const evidence = (await db.execute<{
      platform_assessment_count: number;
    }>(sql`
      select platform_assessment_count
      from assessment_billability_evidence
    `)) as unknown as { platform_assessment_count: number }[];
    expect(evidence).toEqual([
      { platform_assessment_count: reference.maximum - 1 },
    ]);
  });

  it("refuses a billable completion without a structured follow-up plan before any write", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({
      ...baseInput(),
      followUpPlan: undefined,
    });

    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/follow-up/i);
    expect(await countRows("assessment")).toBe(0);
    expect(await countRows("claim_draft")).toBe(0);
    expect(await countRows("follow_up")).toBe(0);

    const intake = (await db.execute<{ consumed_at: string | null }>(sql`
      select consumed_at from intake_session where id = ${intakeSessionId}::uuid
    `)) as unknown as { consumed_at: string | null }[];
    expect(intake[0].consumed_at).toBeNull();
  });

  it("rolls back assessment, evidence, claim, follow-up, and intake consumption together", async () => {
    const { createAssessment } = await import("../actions");
    await db.execute(sql`
      create or replace function p0_c_test_reject_evidence()
      returns trigger
      language plpgsql
      as $$
      begin
        raise exception 'synthetic evidence failure';
      end
      $$
    `);
    await db.execute(sql`
      create trigger p0_c_test_reject_evidence_trg
      before insert on assessment_billability_evidence
      for each row execute function p0_c_test_reject_evidence()
    `);
    try {
      const res = await createAssessment(baseInput());
      expect(res.success).toBe(false);
      expect(await countRows("assessment")).toBe(0);
      expect(await countRows("assessment_billability_evidence")).toBe(0);
      expect(await countRows("claim_draft")).toBe(0);
      expect(await countRows("follow_up")).toBe(0);
      const intake = (await db.execute<{ consumed_at: string | null }>(sql`
        select consumed_at
        from intake_session
        where id = ${intakeSessionId}::uuid
      `)) as unknown as { consumed_at: string | null }[];
      expect(intake[0].consumed_at).toBeNull();
    } finally {
      await db.execute(sql`
        drop trigger p0_c_test_reject_evidence_trg
        on assessment_billability_evidence
      `);
      await db.execute(sql`drop function p0_c_test_reject_evidence()`);
    }
  });

  it("preserves the P0-B version-2 clinical, consent, prescription, and PCP record", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment(baseInput());
    expect(res.success).toBe(true);
    if (!res.success) return;

    const rows = (await db.execute<{
      record_version: number;
      consent_method: string;
      presenting_complaint: string;
      care_plan: string;
      prescription_drug_name: string;
      prescriber_name: string;
      prescriber_address_line1: string;
      prescriber_phone: string;
      pcp_notification_method: string;
    }>(sql`
      select record_version, consent_method, presenting_complaint, care_plan,
             prescription_drug_name, prescriber_name, prescriber_address_line1,
             prescriber_phone, pcp_notification_method
      from assessment where id = ${res.assessmentId}::uuid
    `)) as unknown as {
      record_version: number;
      consent_method: string;
      presenting_complaint: string;
      care_plan: string;
      prescription_drug_name: string;
      prescriber_name: string;
      prescriber_address_line1: string;
      prescriber_phone: string;
      pcp_notification_method: string;
    }[];

    expect(rows[0]).toMatchObject({
      record_version: 2,
      consent_method: "verbal",
      care_plan: "Synthetic care plan",
      prescription_drug_name: "Synthetic Drug",
      prescriber_name: "Test Pharmacist",
      prescriber_address_line1: "100 Test Street",
      prescriber_phone: "416-555-0100",
      pcp_notification_method: "fax",
    });
    expect(rows[0].presenting_complaint).toMatch(/Synthetic rhinitis/);

    // The authenticated, pharmacy-scoped SERVER query exposes the complete
    // record to the server-rendered audit view; no PHI client endpoint is used.
    const { queryAuditRecordById } = await import("../audit/query");
    expect(res.assessmentId).toBeTruthy();
    if (!res.assessmentId) return;
    const detail = await queryAuditRecordById({ ...testAuth.actor }, res.assessmentId);
    expect(detail?.clinical?.followUpPlan).toBe("Synthetic monitoring and follow-up plan");
    expect(detail?.billabilityEvidence).toMatchObject({
      assessmentId: res.assessmentId,
      pharmacyId: PHARMACY_ID,
      evidenceVersion: 1,
      patientSelfReportStatus: "no",
      platformAssessmentCount: 0,
      maximumState: "not_confirmed_met",
      documentInspectedAttestation: true,
    });
    expect(detail?.followUps).toHaveLength(1);
    expect(detail?.followUps[0]).toMatchObject({
      dueDate: "2026-07-18",
      method: "phone",
      reached: null,
    });
    expect(detail?.prescription?.patientAddress).toContain("200 Synthetic Avenue");
    expect(detail?.prescription?.prescriberAddress).toContain("100 Test Street");
  });

  it("persists SDM consent and a structured no-Rx code without prescription fields", async () => {
    const { createAssessment } = await import("../actions");
    const input = baseInput({ outcome: "no_rx_otc_or_nonpharm" });
    input.clinicalRecord.consent = {
      method: "written",
      givenBy: "substitute_decision_maker",
      obtainedAt: "2026-07-16T14:00:00.000Z",
      substituteDecisionMakerName: "Synthetic SDM",
      substituteDecisionMakerRelationship: "Parent",
    };
    const res = await createAssessment(input);
    expect(res.success).toBe(true);

    const rows = (await db.execute<{
      consent_given_by: string;
      sdm_name: string;
      sdm_relationship: string;
      no_rx_rationale_code: string;
      prescribed_on: string | null;
    }>(sql`
      select consent_given_by, sdm_name, sdm_relationship,
             no_rx_rationale_code, prescribed_on from assessment
    `)) as unknown as {
      consent_given_by: string;
      sdm_name: string;
      sdm_relationship: string;
      no_rx_rationale_code: string;
      prescribed_on: string | null;
    }[];
    expect(rows[0]).toEqual({
      consent_given_by: "substitute_decision_maker",
      sdm_name: "Synthetic SDM",
      sdm_relationship: "Parent",
      no_rx_rationale_code: "otc_recommended",
      prescribed_on: null,
    });
  });

  it("refuses an incomplete clinical record before writing assessment or claim rows", async () => {
    const { createAssessment } = await import("../actions");
    const input = baseInput();
    input.clinicalRecord.carePlan = "";

    const res = await createAssessment(input);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/clinical-record field/i);
    expect(await countRows("assessment")).toBe(0);
    expect(await countRows("claim_draft")).toBe(0);
  });

  it("database rejects a direct incomplete record_version=2 insert", async () => {
    let code: string | undefined;
    try {
      await db.execute(sql`
        insert into assessment (
          pharmacy_id, pharmacist_user_id, patient_id, ailment_group_code,
          modality, outcome, service_date, retain_until, record_version
        ) values (
          ${PHARMACY_ID}::uuid, ${testAuth.actor.userId}::uuid, ${patientId}::uuid,
          'RHINITIS', 'in_person', 'rx_issued', '2026-07-16', '2036-07-16', 2
        )
      `);
    } catch (err) {
      code = (err as { cause?: { code?: string } }).cause?.code;
    }
    expect(code).toBe("23514");
    expect(await countRows("assessment")).toBe(0);
  });

  it("database enforces one immutable evidence record per assessment", async () => {
    const { createAssessment } = await import("../actions");
    const created = await createAssessment(baseInput());
    expect(created.success).toBe(true);
    if (!created.success) return;

    const [evidence] = (await db.execute<{ id: string }>(sql`
      select id
      from assessment_billability_evidence
      where assessment_id = ${created.assessmentId}::uuid
    `)) as unknown as { id: string }[];

    let mutationCode: string | undefined;
    try {
      await db.execute(sql`
        update assessment_billability_evidence
        set maximum_state = 'unknown'
        where id = ${evidence.id}::uuid
      `);
    } catch (err) {
      mutationCode = (err as { cause?: { code?: string } }).cause?.code;
    }
    expect(mutationCode).toBe("0A000");

    let duplicateCode: string | undefined;
    try {
      await db.execute(sql`
        insert into assessment_billability_evidence
        select gen_random_uuid(), assessment_id, pharmacy_id, evidence_version,
          patient_self_report_status, patient_self_report_approximate_count,
          patient_self_report_location, platform_assessment_count,
          trailing_window_start, trailing_window_end, viewer_source,
          viewer_attestation, viewer_attested_at, viewer_pharmacist_id,
          maximum_state, self_or_family, same_ailment_prescription,
          verification_consultation, identifier_type, identifier_issuer,
          identifier_number, health_card_version_code,
          name_exactly_as_displayed, date_of_birth,
          document_inspected_attestation, verifying_pharmacist_id, verified_at,
          is_odb_recipient, gender, now()
        from assessment_billability_evidence
        where id = ${evidence.id}::uuid
      `);
    } catch (err) {
      duplicateCode = (err as { cause?: { code?: string } }).cause?.code;
    }
    expect(duplicateCode).toBe("23505");
    expect(await countRows("assessment_billability_evidence")).toBe(1);
  });

  it("allows only authorized governed destruction to delete billability evidence", async () => {
    const [governedPatient] = (await db.execute<{ id: string }>(sql`
      insert into patient (
        pharmacy_id, first_name, last_name, dob, health_number, gender
      ) values (
        ${PHARMACY_ID}::uuid, 'Synthetic', 'Destruction', '1970-01-01',
        '7777777777', 'U'
      )
      returning id
    `)) as unknown as { id: string }[];
    const [governedAssessment] = (await db.execute<{ id: string }>(sql`
      insert into assessment (
        pharmacy_id, pharmacist_user_id, patient_id, ailment_group_code,
        modality, outcome, service_date, retain_until
      ) values (
        ${PHARMACY_ID}::uuid, ${testAuth.actor.userId}::uuid,
        ${governedPatient.id}::uuid, 'RHINITIS', 'in_person', 'rx_issued',
        '2000-01-02', '2010-01-02'
      )
      returning id
    `)) as unknown as { id: string }[];
    const [evidence] = (await db.execute<{ id: string }>(sql`
      insert into assessment_billability_evidence (
        assessment_id, pharmacy_id,
        patient_self_report_status, patient_self_report_approximate_count,
        platform_assessment_count, trailing_window_start, trailing_window_end,
        viewer_source, viewer_attestation, viewer_attested_at,
        viewer_pharmacist_id, maximum_state, self_or_family,
        same_ailment_prescription, verification_consultation,
        identifier_type, identifier_issuer, identifier_number,
        name_exactly_as_displayed, date_of_birth,
        document_inspected_attestation, verifying_pharmacist_id, verified_at,
        is_odb_recipient
      ) values (
        ${governedAssessment.id}::uuid, ${PHARMACY_ID}::uuid,
        'no', 0, 0, '1999-01-02', '2000-01-02',
        'ConnectingOntario', true, now(), ${testAuth.actor.userId}::uuid,
        'not_confirmed_met', 'not_self_or_family', 'none', 'not_required',
        'ohip_health_number', 'Ontario', '7777777777',
        'Synthetic Destruction', '1970-01-01', true,
        ${testAuth.actor.userId}::uuid, now(), true
      )
      returning id
    `)) as unknown as { id: string }[];

    let updateCode: string | undefined;
    try {
      await db.execute(sql`
        update assessment_billability_evidence
        set maximum_state = 'unknown'
        where id = ${evidence.id}::uuid
      `);
    } catch (err) {
      updateCode = (err as { cause?: { code?: string } }).cause?.code;
    }
    expect(updateCode).toBe("0A000");

    let deleteCode: string | undefined;
    try {
      await db.execute(sql`
        delete from assessment_billability_evidence
        where id = ${evidence.id}::uuid
      `);
    } catch (err) {
      deleteCode = (err as { cause?: { code?: string } }).cause?.code;
    }
    expect(deleteCode).toBe("0A000");

    const admins = (await db.execute<{ id: string; email: string }>(sql`
      insert into "user" (name, email, role, pharmacy_id)
      values
        (
          'Preparing Admin', 'preparing-destruction@test.local',
          'pharmacy_admin'::user_role, ${PHARMACY_ID}::uuid
        ),
        (
          'Executing Admin', 'executing-destruction@test.local',
          'pharmacy_admin'::user_role, ${PHARMACY_ID}::uuid
        )
      returning id, email
    `)) as unknown as { id: string; email: string }[];
    const preparingAdmin = admins.find(
      (row) => row.email === "preparing-destruction@test.local",
    );
    const executingAdmin = admins.find(
      (row) => row.email === "executing-destruction@test.local",
    );
    expect(preparingAdmin).toBeDefined();
    expect(executingAdmin).toBeDefined();
    if (!preparingAdmin || !executingAdmin) return;

    const [run] = (await db.execute<{ id: string }>(sql`
      insert into destruction_run (
        pharmacy_id, patient_id, status, eligible_on, artifacts,
        prepared_by_user_id
      ) values (
        ${PHARMACY_ID}::uuid, ${governedPatient.id}::uuid, 'dry_run',
        '2010-01-02', '[]'::jsonb, ${preparingAdmin.id}::uuid
      )
      returning id
    `)) as unknown as { id: string }[];

    await db.execute(
      sql`select governance_execute_destruction(
        ${run.id}::uuid,
        ${executingAdmin.id}::uuid
      )`,
    );

    const [result] = (await db.execute<{
      patients: number;
      assessments: number;
      evidence: number;
      status: string;
    }>(sql`
      select
        (
          select count(*)::int from patient
          where id = ${governedPatient.id}::uuid
        ) as patients,
        (
          select count(*)::int from assessment
          where id = ${governedAssessment.id}::uuid
        ) as assessments,
        (
          select count(*)::int from assessment_billability_evidence
          where id = ${evidence.id}::uuid
        ) as evidence,
        (
          select status from destruction_run where id = ${run.id}::uuid
        ) as status
    `)) as unknown as {
      patients: number;
      assessments: number;
      evidence: number;
      status: string;
    }[];
    expect(result).toEqual({
      patients: 0,
      assessments: 0,
      evidence: 0,
      status: "executed",
    });
  });

  it("database rejects evidence whose pharmacy does not match its assessment", async () => {
    const { createAssessment } = await import("../actions");
    const created = await createAssessment(baseInput());
    expect(created.success).toBe(true);
    if (!created.success) return;

    const [otherAssessment] = (await db.execute<{ id: string }>(sql`
      insert into assessment (
        pharmacy_id, patient_id, ailment_group_code, modality, outcome,
        service_date, retain_until
      ) values (
        ${PHARMACY_ID}::uuid, ${patientId}::uuid, 'RHINITIS',
        'in_person', 'rx_issued', '2026-07-15', '2036-07-15'
      )
      returning id
    `)) as unknown as { id: string }[];

    let code: string | undefined;
    try {
      await db.execute(sql`
        insert into assessment_billability_evidence
        select gen_random_uuid(), ${otherAssessment.id}::uuid,
          '10000000-0000-4000-8000-000000000099'::uuid, evidence_version,
          patient_self_report_status, patient_self_report_approximate_count,
          patient_self_report_location, platform_assessment_count,
          trailing_window_start, trailing_window_end, viewer_source,
          viewer_attestation, viewer_attested_at, viewer_pharmacist_id,
          maximum_state, self_or_family, same_ailment_prescription,
          verification_consultation, identifier_type, identifier_issuer,
          identifier_number, health_card_version_code,
          name_exactly_as_displayed, date_of_birth,
          document_inspected_attestation, verifying_pharmacist_id, verified_at,
          is_odb_recipient, gender, now()
        from assessment_billability_evidence
        where assessment_id = ${created.assessmentId}::uuid
      `);
    } catch (err) {
      code = (err as { cause?: { code?: string } }).cause?.code;
    }
    expect(code).toBe("23503");
  });

  it("database rejects LTC provider facts on a non-LTC assessment", async () => {
    let code: string | undefined;
    try {
      await db.execute(sql`
        insert into assessment (
          pharmacy_id, patient_id, ailment_group_code, modality, outcome,
          ltc_resident, ltc_provider_role, service_date, retain_until
        ) values (
          ${PHARMACY_ID}::uuid, ${patientId}::uuid, 'RHINITIS', 'in_person',
          'no_rx_otc_or_nonpharm', false, 'primary', '2026-07-16', '2036-07-16'
        )
      `);
    } catch (err) {
      code = (err as { cause?: { code?: string } }).cause?.code;
    }
    expect(code).toBe("23514");
    expect(await countRows("assessment")).toBe(0);
  });

  it("database rejects virtual assessments without required documentation", async () => {
    let code: string | undefined;
    try {
      await db.execute(sql`
        insert into assessment (
          pharmacy_id, patient_id, ailment_group_code, modality, outcome,
          service_date, retain_until
        ) values (
          ${PHARMACY_ID}::uuid, ${patientId}::uuid, 'RHINITIS',
          'virtual_from_pharmacy', 'no_rx_otc_or_nonpharm',
          '2026-07-16', '2036-07-16'
        )
      `);
    } catch (err) {
      code = (err as { cause?: { code?: string } }).cause?.code;
    }
    expect(code).toBe("23514");
    expect(await countRows("assessment")).toBe(0);
  });

  it("completed-then-referral is billable with SSC 4", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment(baseInput({ outcome: "no_rx_referral" }));
    expect(res.claim?.billable).toBe(true);
    expect(await countClaimDrafts()).toBe(1);
    const rows = await db.execute<{ ssc: number }>(sql`select ssc from claim_draft`);
    expect((rows as unknown as { ssc: number }[])[0].ssc).toBe(4);
  });

  it("LTC facts persist but billing remains inert pending ministry clarification", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({
      ...(await baseInput()),
      ltc: { isResident: true, providerRole: "primary" },
    });

    // The assessment still happened and is recorded; the claim is not.
    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(false);
    if (res.claim && !res.claim.billable) {
      expect(res.claim.reason).toBe("LTC_PENDING_MINISTRY_CLARIFICATION");
      expect(res.claim.message).toMatch(/recorded.*no claim.*pending/i);
    }
    expect(await countClaimDrafts()).toBe(0);

    const facts = (await db.execute<{
      ltc_resident: boolean;
      ltc_provider_role: string | null;
      ltc_is_emergency: boolean | null;
    }>(sql`
      select ltc_resident, ltc_provider_role, ltc_is_emergency
      from assessment
    `)) as unknown as {
      ltc_resident: boolean;
      ltc_provider_role: string | null;
      ltc_is_emergency: boolean | null;
    }[];
    expect(facts[0]).toEqual({
      ltc_resident: true,
      ltc_provider_role: "primary",
      ltc_is_emergency: null,
    });
  });

  it("regular fee-tier data blocks remote virtual before any assessment is written", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment({
      ...(await baseInput()),
      modality: "virtual_remote",
      virtualLocation: "Home office, Toronto",
      remoteReason: "On-site staff cannot meet current virtual demand",
    });

    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/not eligible/i);
    expect(await countRows("assessment")).toBe(0);
    expect(await countClaimDrafts()).toBe(0);
  });

  it("remote eligibility is data-driven: flipping the seeded row changes behaviour", async () => {
    const { createAssessment } = await import("../actions");
    await db.execute(sql`
      update odb_fee_tier
      set remote_virtual_eligible = true
      where code = 'regular_8_83'
    `);

    try {
      const res = await createAssessment({
        ...(await baseInput()),
        modality: "virtual_remote",
        virtualLocation: "Home office, Toronto",
        remoteReason: "On-site staff cannot meet current virtual demand",
      });

      expect(res.success).toBe(true);
      expect(res.claim?.billable).toBe(true);
      const rows = (await db.execute<{
        virtual_location: string;
        remote_reason: string;
      }>(sql`
        select virtual_location, remote_reason
        from assessment
      `)) as unknown as {
        virtual_location: string;
        remote_reason: string;
      }[];
      expect(rows[0].virtual_location).toBe("Home office, Toronto");
      expect(rows[0].remote_reason).toMatch(/on-site staff/i);
    } finally {
      await db.execute(sql`
        update odb_fee_tier
        set remote_virtual_eligible = false
        where code = 'regular_8_83'
      `);
    }
  });

  it("NON-billable: an unknown ailment group drafts nothing (never a default PIN)", async () => {
    const { createAssessment } = await import("../actions");
    const unknownIntake = (await db.execute<{ id: string }>(sql`
      insert into intake_session (
        code, pharmacy_id, ailment_group_code, prior_count_self_report,
        existing_rx_self_report, expires_at
      ) values (
        'UNK001', ${PHARMACY_ID}::uuid, 'NOT_A_REAL_AILMENT', 0, 'none',
        now() + interval '2 hours'
      )
      returning id
    `)) as unknown as { id: string }[];
    const res = await createAssessment({
      ...baseInput(),
      intakeSessionId: unknownIntake[0].id,
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/reference/i);
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

    const res = await createAssessment(await baseInput());

    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/Mandatory Orientation/i);
    // Refused BEFORE anything was written — not a recorded-but-unbillable
    // assessment, and deriveClaimDraft was never reached.
    expect(await countRows("assessment")).toBe(0);
    expect(await countRows("claim_draft")).toBe(0);
  });

  it("ORIENTATION GATE: the attested pharmacist's identical completion proceeds", async () => {
    const { createAssessment } = await import("../actions");
    const res = await createAssessment(await baseInput());
    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(true);
    expect(await countRows("assessment")).toBe(1);
  });

  it("preserves the as-of-right PHR888 prescriber path through completion", async () => {
    const { createAssessment } = await import("../actions");
    await db.execute(sql`
      update "user"
      set ocp_number = null, is_as_of_right = true
      where id = ${testAuth.actor.userId}::uuid
    `);

    const res = await createAssessment(baseInput());
    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(true);
    const drafts = (await db.execute<{ prescriber_id: string }>(sql`
      select prescriber_id
      from claim_draft
    `)) as unknown as { prescriber_id: string }[];
    expect(drafts).toEqual([{ prescriber_id: "PHR888" }]);
  });

  it("ADMIN OVERRIDE: an admin with no orientation completes WITH a reason, and it is audited", async () => {
    const { createAssessment } = await import("../actions");
    const rows = await db.execute<{ id: string }>(sql`
      insert into "user" (name, email, role, pharmacy_id, ocp_number)
      values ('Admin NoOrient', 'admin-noorient@test.local', 'pharmacy_admin'::user_role, ${PHARMACY_ID}::uuid, '777001')
      returning id
    `);
    testAuth.actor.userId = (rows as unknown as { id: string }[])[0].id;
    testAuth.actor.role = "pharmacy_admin";

    const res = await createAssessment({
      ...baseInput(),
      orientationOverrideReason: "Module done 2026-07-20, OCP upload pending",
    });
    expect(res.success).toBe(true);
    expect(res.claim?.billable).toBe(true);
    expect(await countRows("assessment")).toBe(1);
    // The break-glass is recorded as its own audited statement, with the reason.
    const audit = (await db.execute<{ metadata: { reason: string } }>(
      sql`select metadata from audit_log where action = 'assessment.orientation_override'`,
    )) as unknown as { metadata: { reason: string } }[];
    expect(audit).toHaveLength(1);
    expect(audit[0].metadata.reason).toMatch(/OCP upload pending/);
  });

  it("ADMIN OVERRIDE: an admin with no orientation and NO reason is refused, with the override signal", async () => {
    const { createAssessment } = await import("../actions");
    const rows = await db.execute<{ id: string }>(sql`
      insert into "user" (name, email, role, pharmacy_id, ocp_number)
      values ('Admin NoReason', 'admin-noreason@test.local', 'pharmacy_admin'::user_role, ${PHARMACY_ID}::uuid, '777002')
      returning id
    `);
    testAuth.actor.userId = (rows as unknown as { id: string }[])[0].id;
    testAuth.actor.role = "pharmacy_admin";

    const res = await createAssessment(baseInput());
    expect(res.success).toBe(false);
    if (!res.success) {
      expect("orientationRequired" in res && res.orientationRequired).toBe(true);
      expect("canOverride" in res && res.canOverride).toBe(true);
    }
    expect(await countRows("assessment")).toBe(0);
  });

  it("ADMIN OVERRIDE is admin-only: a non-admin passing a reason is STILL refused and writes nothing", async () => {
    const { createAssessment } = await import("../actions");
    const rows = await db.execute<{ id: string }>(sql`
      insert into "user" (name, email, role, pharmacy_id, ocp_number)
      values ('Pharm NoOrient', 'pharm-noorient@test.local', 'pharmacist'::user_role, ${PHARMACY_ID}::uuid, '777003')
      returning id
    `);
    testAuth.actor.userId = (rows as unknown as { id: string }[])[0].id;
    testAuth.actor.role = "pharmacist";

    const res = await createAssessment({
      ...baseInput(),
      orientationOverrideReason: "let me through",
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect("canOverride" in res && res.canOverride).toBe(false);
    }
    expect(await countRows("assessment")).toBe(0);
    expect(await countRows("claim_draft")).toBe(0);
    const overrideEvents = (await db.execute<{ n: number }>(
      sql`select count(*)::int as n from audit_log where action = 'assessment.orientation_override'`,
    )) as unknown as { n: number }[];
    expect(overrideEvents[0].n).toBe(0);
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

    const refused = await createAssessment(await baseInput());
    expect(refused.success).toBe(false);
    expect(await countRows("claim_draft")).toBe(0);

    // Record the supervisor's orientation → same completion now proceeds,
    // with the SUPERVISOR's OCP number on the draft (never the intern's).
    await db.execute(
      sql`update "user" set orientation_completed_at = now() where id = ${supervisorId}::uuid`,
    );
    const ok = await createAssessment(await baseInput());
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

    const res = await createAssessment({ ...(await baseInput()), intakeSessionId: intakeId });
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

  it("the database rejects a second pharmacy and expired intakes cannot be loaded", async () => {
    const { createAssessment, getIntakeSessionById } = await import("../actions");
    const OTHER = "00000000-0000-0000-0000-0000000000dd";
    await expect(
      db.execute(sql`
        insert into pharmacy (id, store_name, odb_fee_tier_code)
        values (${OTHER}::uuid, 'Other Pharmacy', 'regular_8_83')
      `),
    ).rejects.toThrow();

    const rows = await db.execute<{ id: string }>(sql`
      insert into intake_session (code, pharmacy_id, ailment_group_code, expires_at)
      values ('QQTAB4', ${PHARMACY_ID}::uuid, 'RHINITIS', now() - interval '1 minute')
      returning id
    `);
    const expiredId = (rows as unknown as { id: string }[])[0].id;
    expect((await getIntakeSessionById(expiredId)).success).toBe(false);
    const completion = await createAssessment({
      ...baseInput(),
      intakeSessionId: expiredId,
    });
    expect(completion.success).toBe(false);
    expect(await countRows("assessment")).toBe(0);
    expect(await countRows("claim_draft")).toBe(0);
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
    expect(await countRows("follow_up")).toBe(0);
  });
});
