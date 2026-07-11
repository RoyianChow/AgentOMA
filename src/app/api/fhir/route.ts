import { NextRequest, NextResponse } from "next/server";

// TODO: PHARMACIST REVIEW REQUIRED — these ICD-10 mappings are NOT sourced from
// the EO Notice (2026-07-01) and have not been clinically validated. They must be
// reviewed by a pharmacist before this export is used for anything real. Do not
// expand this map without that review.
const AILMENT_TO_ICD10: Record<string, { code: string; display: string }> = {
  URINARY_TRACT_INFECTION:       { code: "N39.0",  display: "Urinary tract infection, site not specified" },
  HERPES_LABIALIS:               { code: "B00.1",  display: "Herpesviral vesicular dermatitis (Cold Sores)" },
  TICK_BITES:                    { code: "Z20.89", display: "Contact with and (suspected) exposure to other communicable diseases (Tick Bite PEP)" },
  CONJUNCTIVITIS:                { code: "H10.9",  display: "Unspecified conjunctivitis" },
  CANDIDAL_STOMATITIS:           { code: "B37.0",  display: "Candidal stomatitis (Oral Thrush)" },
  DYSMENORRHEA:                  { code: "N94.6",  display: "Dysmenorrhoea, unspecified" },
  DERMATITIS:                    { code: "L30.9",  display: "Dermatitis, unspecified" },
  ACNE:                          { code: "L70.0",  display: "Acne vulgaris" },
  MUSCULOSKELETAL_SPRAINS_STRAINS: { code: "M79.9", display: "Soft tissue disorder, unspecified" },
  GERD:                          { code: "K21.0",  display: "Gastro-oesophageal reflux disease with oesophagitis" },
  HEMORRHOIDS:                   { code: "K64.9",  display: "Unspecified haemorrhoids" },
  VULVOVAGINAL_CANDIDIASIS:      { code: "B37.3",  display: "Candidiasis of vulva and vagina" },
  RHINITIS:                      { code: "J30.1",  display: "Allergic rhinitis due to pollen" },
  IMPETIGO:                      { code: "L01.0",  display: "Impetigo [any organism][any site]" },
  INSECT_BITES_URTICARIA:        { code: "L50.0",  display: "Allergic urticaria" },
  NAUSEA_VOMITING_PREGNANCY:     { code: "O21.0",  display: "Mild hyperemesis gravidarum" },
  PINWORMS_THREADWORMS:          { code: "B80",    display: "Enterobiasis (Pinworms)" },
  CALLUSES_CORNS_WARTS:          { code: "L84",    display: "Corns and callosities" },
  HEADACHE:                      { code: "G44.309", display: "Unspecified post-traumatic headache, not intractable" },
  PEDICULOSIS:                   { code: "B85.0",  display: "Pediculosis due to Pediculus humanus capitis" },
  TINEA_CORPORIS_CRURIS:         { code: "B35.4",  display: "Tinea corporis" },
  XEROPHTHALMIA:                 { code: "H11.14", display: "Conjunctival xerosis, unspecified" },
  CANKER_SORES:                  { code: "K12.0",  display: "Recurrent oral aphthae (Canker Sores)" },
};

export async function POST(): Promise<NextResponse> {
  // ── SECURITY GATE (Step 1) ────────────────────────────────────────────────
  // This route previously accepted PHI in the request body from ANY caller with
  // no authentication and returned a FHIR bundle. It is DISABLED until it sits
  // behind a verified better-auth pharmacist session (see the FHIR export step /
  // docs/COMPLIANCE.md). `buildFhirResponse` below is preserved unchanged for
  // that step. Do NOT re-enable without server-side session + role verification.
  return NextResponse.json(
    { error: "FHIR export is disabled pending an authenticated pharmacist session." },
    { status: 403 },
  );
}

// Preserved verbatim for the authenticated FHIR export step; intentionally not
// invoked yet (see the SECURITY GATE in POST above).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function buildFhirResponse(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { assessment } = body;

    if (!assessment) {
      return NextResponse.json({ error: "Missing assessment payload" }, { status: 400 });
    }

    const patientId = `urn:uuid:patient-${assessment.id || "unknown"}`;
    const encounterId = `urn:uuid:encounter-${assessment.id || "unknown"}`;
    const conditionId = `urn:uuid:condition-${assessment.id || "unknown"}`;
    const observationId = `urn:uuid:observation-${assessment.id || "unknown"}`;

    // Demographics extraction (supports both legacy and new Zod schema payload)
    const demographics = assessment.demographics || {};
    const firstName = demographics.firstName || assessment.firstName || "";
    const lastName = demographics.lastName || assessment.lastName || "";
    const dob = demographics.dateOfBirth || (assessment.dob?.replace(/-/g, "")) || "";
    const gender = (demographics.gender || assessment.gender || "U").toLowerCase();
    const genderFHIR = gender === "m" ? "male" : gender === "f" ? "female" : "unknown";
    const healthCard = demographics.healthCardNumber || assessment.healthNumber || "";
    const ailmentId = demographics.ailmentType || assessment.ailmentId || "";

    const icd10 = AILMENT_TO_ICD10[ailmentId] || { code: "Z99.9", display: "Unknown minor ailment" };

    // Format DOB: YYYYMMDD → YYYY-MM-DD
    const dobFormatted =
      dob.length === 8
        ? `${dob.slice(0, 4)}-${dob.slice(4, 6)}-${dob.slice(6, 8)}`
        : dob;

    const bundle = {
      resourceType: "Bundle",
      id: assessment.id,
      type: "transaction",
      timestamp: new Date().toISOString(),
      entry: [
        // ── Patient Resource ──────────────────────────────────────────────
        {
          fullUrl: patientId,
          resource: {
            resourceType: "Patient",
            id: `patient-${assessment.id}`,
            identifier: [
              {
                use: "official",
                system: "https://health.ontario.ca/OHIP",
                value: healthCard,
              },
            ],
            name: [
              {
                use: "official",
                family: lastName,
                given: [firstName],
              },
            ],
            gender: genderFHIR,
            birthDate: dobFormatted,
          },
          request: { method: "PUT", url: `Patient/patient-${assessment.id}` },
        },

        // ── Encounter Resource ────────────────────────────────────────────
        {
          fullUrl: encounterId,
          resource: {
            resourceType: "Encounter",
            id: `encounter-${assessment.id}`,
            status: "finished",
            class: {
              system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              code: "AMB",
              display: "ambulatory",
            },
            type: [
              {
                coding: [
                  {
                    system: "http://snomed.info/sct",
                    code: "11429006",
                    display: "Consultation (procedure) - Ontario Minor Ailments Pharmacist Assessment",
                  },
                ],
              },
            ],
            subject: { reference: patientId },
            period: {
              start: assessment.submittedAt || new Date().toISOString(),
              end: assessment.submittedAt || new Date().toISOString(),
            },
            serviceProvider: {
              display: assessment.pharmacyId || "PHARM-ONTARIO-1",
            },
          },
          request: { method: "PUT", url: `Encounter/encounter-${assessment.id}` },
        },

        // ── Condition Resource ────────────────────────────────────────────
        {
          fullUrl: conditionId,
          resource: {
            resourceType: "Condition",
            id: `condition-${assessment.id}`,
            clinicalStatus: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
                  code: "active",
                },
              ],
            },
            code: {
              coding: [
                {
                  system: "http://hl7.org/fhir/sid/icd-10",
                  code: icd10.code,
                  display: icd10.display,
                },
              ],
              text: assessment.ailmentName || ailmentId,
            },
            subject: { reference: patientId },
            encounter: { reference: encounterId },
          },
          request: { method: "PUT", url: `Condition/condition-${assessment.id}` },
        },

        // ── Observation Resource (clinical answers) ───────────────────────
        {
          fullUrl: observationId,
          resource: {
            resourceType: "Observation",
            id: `observation-${assessment.id}`,
            status: "final",
            category: [
              {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/observation-category",
                    code: "survey",
                    display: "Survey",
                  },
                ],
              },
            ],
            code: {
              coding: [
                {
                  system: "http://snomed.info/sct",
                  code: "386725007",
                  display: "Clinical Findings - Patient Symptom Survey",
                },
              ],
            },
            subject: { reference: patientId },
            encounter: { reference: encounterId },
            valueString: assessment.aiSuggestion || "Pharmacist assessment required",
            component: (assessment.symptoms || []).map((s: any) => ({
              code: {
                text: s.label || s.id,
              },
              valueBoolean: true,
              interpretation: s.isRedFlag
                ? [{ coding: [{ code: "HH", display: "Critical High" }] }]
                : undefined,
            })),
            note: [
              {
                text: assessment.additionalNotes || "No additional notes",
              },
            ],
          },
          request: { method: "PUT", url: `Observation/observation-${assessment.id}` },
        },
      ],
    };

    // Simulate Kroll PMS handshake response
    const krollSimulation = {
      status: "ACCEPTED",
      krollPatientRef: `KRL-${Date.now()}`,
      krollEncounterRef: `KRL-ENC-${assessment.id}`,
      pharmacyPIN: assessment.pharmacyId || "PHARM-ONTARIO-1",
      transmittedAt: new Date().toISOString(),
      message: "Patient profile created/matched successfully in Kroll PMS. Minor ailment encounter recorded.",
    };

    return NextResponse.json({
      success: true,
      fhirBundle: bundle,
      krollSimulation,
    });
  } catch (err) {
    console.error("FHIR route error:", err);
    return NextResponse.json({ error: "Internal server error generating FHIR bundle" }, { status: 500 });
  }
}
