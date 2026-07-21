import { and, eq, gte, lte, or, ilike, sql, desc, count, isNull, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { assessment, patient, claimDraft } from "@/lib/db/schema";
import type { PortalUser } from "@/lib/auth-guard";

/**
 * Server-only audit queries. NOT a "use server" file on purpose: these return
 * PHI and must never be a callable endpoint. Both callers (the server-rendered
 * audit page and the export route handler) verify the session first and pass
 * the verified actor in — tenancy comes from the actor, never from input.
 */

export type AuditFilters = {
  q?: string;
  outcome?: string;
  ailment?: string;
  from?: string;
  to?: string;
};

export type AuditRecord = {
  id: string;
  patientName: string;
  dob: string;
  healthNumber: string;
  ailmentGroupCode: string;
  outcome: string;
  serviceDate: string;
  createdAt: string;
};

export const AUDIT_PAGE_SIZE = 15;

export const OUTCOME_LABELS: Record<string, string> = {
  rx_issued: "Rx Issued",
  no_rx_referral: "Referred",
  no_rx_otc_or_nonpharm: "No Rx (OTC)",
};

export const MODALITY_LABELS: Record<string, string> = {
  in_person: "In person",
  virtual_from_pharmacy: "Virtual (from pharmacy)",
  virtual_remote: "Virtual (remote)",
};

function parseDay(value: string | undefined, endOfDay: boolean): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(endOfDay ? `${value}T23:59:59.999` : `${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildWhere(pharmacyId: string, f: AuditFilters): SQL | undefined {
  const clauses: (SQL | undefined)[] = [eq(assessment.pharmacyId, pharmacyId)];

  const q = f.q?.trim();
  if (q) {
    clauses.push(
      or(
        ilike(sql`${patient.firstName} || ' ' || ${patient.lastName}`, `%${q}%`),
        ilike(patient.healthNumber, `%${q}%`)
      )
    );
  }
  if (f.outcome && f.outcome !== "ALL") clauses.push(eq(assessment.outcome, f.outcome));
  if (f.ailment && f.ailment !== "ALL") clauses.push(eq(assessment.ailmentGroupCode, f.ailment));

  const from = parseDay(f.from, false);
  if (from) clauses.push(gte(assessment.createdAt, from));
  const to = parseDay(f.to, true);
  if (to) clauses.push(lte(assessment.createdAt, to));

  return and(...clauses.filter((c): c is SQL => c !== undefined));
}

const recordSelection = {
  id: assessment.id,
  patientName: sql<string>`${patient.firstName} || ' ' || ${patient.lastName}`,
  dob: patient.dob,
  healthNumber: patient.healthNumber,
  ailmentGroupCode: assessment.ailmentGroupCode,
  outcome: assessment.outcome,
  serviceDate: assessment.serviceDate,
  createdAt: assessment.createdAt,
};

function toRecord(r: {
  id: string;
  patientName: string;
  dob: string;
  healthNumber: string;
  ailmentGroupCode: string;
  outcome: string;
  serviceDate: Date;
  createdAt: Date;
}): AuditRecord {
  return {
    ...r,
    serviceDate: r.serviceDate.toISOString().slice(0, 10),
    createdAt: r.createdAt.toISOString(),
  };
}

/** One page of matching records + the total match count. */
export async function queryAuditPage(
  actor: PortalUser,
  filters: AuditFilters,
  page: number
): Promise<{ rows: AuditRecord[]; total: number }> {
  const where = buildWhere(actor.pharmacyId, filters);
  const safePage = Math.max(1, Math.floor(page) || 1);

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select(recordSelection)
      .from(assessment)
      .innerJoin(patient, eq(assessment.patientId, patient.id))
      .where(where)
      .orderBy(desc(assessment.createdAt))
      .limit(AUDIT_PAGE_SIZE)
      .offset((safePage - 1) * AUDIT_PAGE_SIZE),
    db
      .select({ value: count() })
      .from(assessment)
      .innerJoin(patient, eq(assessment.patientId, patient.id))
      .where(where),
  ]);

  return { rows: rows.map(toRecord), total };
}

/** EVERY matching record — export only; never sent to a client component. */
export async function queryAuditRecordsForExport(
  actor: PortalUser,
  filters: AuditFilters
): Promise<AuditRecord[]> {
  const rows = await db
    .select(recordSelection)
    .from(assessment)
    .innerJoin(patient, eq(assessment.patientId, patient.id))
    .where(buildWhere(actor.pharmacyId, filters))
    .orderBy(desc(assessment.createdAt));
  return rows.map(toRecord);
}

/**
 * The full record behind one audit row: assessment + patient + the active
 * (non-superseded) claim draft, if any. PHI-bearing — server-only, and scoped
 * to the actor's pharmacy so another store's assessment id simply returns null.
 * The PIN is READ from the persisted claim draft; it is never derived or
 * hardcoded here.
 */
export type AuditRecordDetail = {
  id: string;
  serviceDate: string;
  createdAt: string;
  ailmentGroupCode: string;
  modality: string;
  outcome: string;
  virtualLocation: string | null;
  patient: {
    name: string;
    dob: string;
    healthNumber: string;
    gender: string;
  };
  clinical: {
    recordVersion: number;
    consentMethod: string;
    consentGivenBy: string;
    consentObtainedAt: string;
    sdmName: string | null;
    sdmRelationship: string | null;
    presentingComplaint: string;
    symptomOnset: string;
    symptomDuration: string;
    symptomCourse: string;
    associatedSymptoms: string;
    aggravatingFactors: string;
    relievingFactors: string;
    treatmentsTried: string;
    healthHistory: string;
    medicationHistory: string;
    allergies: string;
    assessmentFindings: string;
    sharedDecisionMaking: string;
    carePlan: string;
    followUpPlan: string;
    noRxRationaleCode: string | null;
    noRxRationaleNotes: string | null;
  } | null;
  prescription: {
    prescribedOn: string;
    patientAddress: string[];
    drugName: string;
    strength: string;
    quantity: string;
    dose: string;
    frequency: string;
    route: string;
    prescriberName: string;
    prescriberAddress: string[];
    prescriberPhone: string;
    prescriberOcpNumber: string | null;
    prescriberIsAsOfRight: boolean;
    pcpNotificationAt: string;
    pcpNotificationMethod: string;
    patientChoiceInformedAt: string;
  } | null;
  // Present only for a billable assessment; non-billable ones drafted no claim.
  claim: {
    pinCode: string;
    feeCents: number;
    billingModality: string;
    rxIssued: boolean;
    prescriberIdReference: string;
    prescriberId: string;
    interventionCodes: string[];
    carrierId: string | null;
    quantity: number;
    ssc: number | null;
  } | null;
};

export async function queryAuditRecordById(
  actor: PortalUser,
  id: string
): Promise<AuditRecordDetail | null> {
  const [row] = await db
    .select({
      id: assessment.id,
      serviceDate: assessment.serviceDate,
      createdAt: assessment.createdAt,
      ailmentGroupCode: assessment.ailmentGroupCode,
      modality: assessment.modality,
      outcome: assessment.outcome,
      virtualLocation: assessment.virtualLocation,
      recordVersion: assessment.recordVersion,
      consentMethod: assessment.consentMethod,
      consentGivenBy: assessment.consentGivenBy,
      consentObtainedAt: assessment.consentObtainedAt,
      sdmName: assessment.sdmName,
      sdmRelationship: assessment.sdmRelationship,
      presentingComplaint: assessment.presentingComplaint,
      symptomOnset: assessment.symptomOnset,
      symptomDuration: assessment.symptomDuration,
      symptomCourse: assessment.symptomCourse,
      associatedSymptoms: assessment.associatedSymptoms,
      aggravatingFactors: assessment.aggravatingFactors,
      relievingFactors: assessment.relievingFactors,
      treatmentsTried: assessment.treatmentsTried,
      healthHistory: assessment.healthHistory,
      medicationHistory: assessment.medicationHistory,
      allergies: assessment.allergies,
      assessmentFindings: assessment.assessmentFindings,
      sharedDecisionMaking: assessment.sharedDecisionMaking,
      carePlan: assessment.carePlan,
      followUpPlan: assessment.followUpPlan,
      noRxRationaleCode: assessment.noRxRationaleCode,
      noRxRationaleNotes: assessment.noRxRationaleNotes,
      prescribedOn: assessment.prescribedOn,
      prescriptionPatientAddressLine1: assessment.prescriptionPatientAddressLine1,
      prescriptionPatientAddressLine2: assessment.prescriptionPatientAddressLine2,
      prescriptionPatientCity: assessment.prescriptionPatientCity,
      prescriptionPatientProvince: assessment.prescriptionPatientProvince,
      prescriptionPatientPostalCode: assessment.prescriptionPatientPostalCode,
      prescriptionDrugName: assessment.prescriptionDrugName,
      prescriptionStrength: assessment.prescriptionStrength,
      prescriptionQuantity: assessment.prescriptionQuantity,
      prescriptionDose: assessment.prescriptionDose,
      prescriptionFrequency: assessment.prescriptionFrequency,
      prescriptionRoute: assessment.prescriptionRoute,
      prescriberName: assessment.prescriberName,
      prescriberAddressLine1: assessment.prescriberAddressLine1,
      prescriberAddressLine2: assessment.prescriberAddressLine2,
      prescriberCity: assessment.prescriberCity,
      prescriberProvince: assessment.prescriberProvince,
      prescriberPostalCode: assessment.prescriberPostalCode,
      prescriberPhone: assessment.prescriberPhone,
      prescriberOcpNumber: assessment.prescriberOcpNumber,
      prescriberIsAsOfRight: assessment.prescriberIsAsOfRight,
      pcpNotificationAt: assessment.pcpNotificationAt,
      pcpNotificationMethod: assessment.pcpNotificationMethod,
      patientChoiceInformedAt: assessment.patientChoiceInformedAt,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dob: patient.dob,
      healthNumber: patient.healthNumber,
      gender: patient.gender,
      pinCode: claimDraft.pinCode,
      feeCents: claimDraft.feeCents,
      billingModality: claimDraft.billingModality,
      rxIssued: claimDraft.rxIssued,
      prescriberIdReference: claimDraft.prescriberIdReference,
      prescriberId: claimDraft.prescriberId,
      interventionCodes: claimDraft.interventionCodes,
      carrierId: claimDraft.carrierId,
      quantity: claimDraft.quantity,
      ssc: claimDraft.ssc,
    })
    .from(assessment)
    .innerJoin(patient, eq(assessment.patientId, patient.id))
    .leftJoin(
      claimDraft,
      and(eq(claimDraft.assessmentId, assessment.id), isNull(claimDraft.supersededById))
    )
    .where(and(eq(assessment.id, id), eq(assessment.pharmacyId, actor.pharmacyId)))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    serviceDate: row.serviceDate.toISOString().slice(0, 10),
    createdAt: row.createdAt.toISOString(),
    ailmentGroupCode: row.ailmentGroupCode,
    modality: row.modality,
    outcome: row.outcome,
    virtualLocation: row.virtualLocation,
    patient: {
      name: `${row.firstName} ${row.lastName}`,
      dob: row.dob,
      healthNumber: row.healthNumber,
      gender: row.gender,
    },
    clinical:
      row.recordVersion >= 2 &&
      row.consentMethod &&
      row.consentGivenBy &&
      row.consentObtainedAt &&
      row.presentingComplaint &&
      row.symptomOnset &&
      row.symptomDuration &&
      row.symptomCourse &&
      row.associatedSymptoms &&
      row.aggravatingFactors &&
      row.relievingFactors &&
      row.treatmentsTried &&
      row.healthHistory &&
      row.medicationHistory &&
      row.allergies &&
      row.assessmentFindings &&
      row.sharedDecisionMaking &&
      row.carePlan &&
      row.followUpPlan
        ? {
            recordVersion: row.recordVersion,
            consentMethod: row.consentMethod,
            consentGivenBy: row.consentGivenBy,
            consentObtainedAt: row.consentObtainedAt.toISOString(),
            sdmName: row.sdmName,
            sdmRelationship: row.sdmRelationship,
            presentingComplaint: row.presentingComplaint,
            symptomOnset: row.symptomOnset,
            symptomDuration: row.symptomDuration,
            symptomCourse: row.symptomCourse,
            associatedSymptoms: row.associatedSymptoms,
            aggravatingFactors: row.aggravatingFactors,
            relievingFactors: row.relievingFactors,
            treatmentsTried: row.treatmentsTried,
            healthHistory: row.healthHistory,
            medicationHistory: row.medicationHistory,
            allergies: row.allergies,
            assessmentFindings: row.assessmentFindings,
            sharedDecisionMaking: row.sharedDecisionMaking,
            carePlan: row.carePlan,
            followUpPlan: row.followUpPlan,
            noRxRationaleCode: row.noRxRationaleCode,
            noRxRationaleNotes: row.noRxRationaleNotes,
          }
        : null,
    prescription:
      row.prescribedOn &&
      row.prescriptionPatientAddressLine1 &&
      row.prescriptionPatientCity &&
      row.prescriptionPatientProvince &&
      row.prescriptionPatientPostalCode &&
      row.prescriptionDrugName &&
      row.prescriptionStrength &&
      row.prescriptionQuantity &&
      row.prescriptionDose &&
      row.prescriptionFrequency &&
      row.prescriptionRoute &&
      row.prescriberName &&
      row.prescriberAddressLine1 &&
      row.prescriberCity &&
      row.prescriberProvince &&
      row.prescriberPostalCode &&
      row.prescriberPhone &&
      row.prescriberIsAsOfRight !== null &&
      row.pcpNotificationAt &&
      row.pcpNotificationMethod &&
      row.patientChoiceInformedAt
        ? {
            prescribedOn: row.prescribedOn,
            patientAddress: [
              row.prescriptionPatientAddressLine1,
              row.prescriptionPatientAddressLine2,
              `${row.prescriptionPatientCity}, ${row.prescriptionPatientProvince} ${row.prescriptionPatientPostalCode}`,
            ].filter((line): line is string => Boolean(line)),
            drugName: row.prescriptionDrugName,
            strength: row.prescriptionStrength,
            quantity: row.prescriptionQuantity,
            dose: row.prescriptionDose,
            frequency: row.prescriptionFrequency,
            route: row.prescriptionRoute,
            prescriberName: row.prescriberName,
            prescriberAddress: [
              row.prescriberAddressLine1,
              row.prescriberAddressLine2,
              `${row.prescriberCity}, ${row.prescriberProvince} ${row.prescriberPostalCode}`,
            ].filter((line): line is string => Boolean(line)),
            prescriberPhone: row.prescriberPhone,
            prescriberOcpNumber: row.prescriberOcpNumber,
            prescriberIsAsOfRight: row.prescriberIsAsOfRight,
            pcpNotificationAt: row.pcpNotificationAt.toISOString(),
            pcpNotificationMethod: row.pcpNotificationMethod,
            patientChoiceInformedAt: row.patientChoiceInformedAt.toISOString(),
          }
        : null,
    claim: row.pinCode
      ? {
          pinCode: row.pinCode,
          feeCents: row.feeCents!,
          billingModality: row.billingModality!,
          rxIssued: row.rxIssued!,
          prescriberIdReference: row.prescriberIdReference!,
          prescriberId: row.prescriberId!,
          interventionCodes: row.interventionCodes!,
          carrierId: row.carrierId,
          quantity: row.quantity!,
          ssc: row.ssc,
        }
      : null,
  };
}

/** Distinct ailment codes present in this pharmacy's records (filter dropdown). */
export async function listAuditAilments(actor: PortalUser): Promise<string[]> {
  const rows = await db
    .selectDistinct({ code: assessment.ailmentGroupCode })
    .from(assessment)
    .where(eq(assessment.pharmacyId, actor.pharmacyId))
    .orderBy(assessment.ailmentGroupCode);
  return rows.map((r) => r.code);
}
