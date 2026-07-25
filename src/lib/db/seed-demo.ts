// Development fixture seed. Loads reference data, then creates the fixed demo
// pharmacy, patient, and assessment used by local development.
//
//   npm run db:seed:demo
//
// PIN/fee/max values are never hardcoded here — they come from
// src/lib/reference/minor-ailment-reference.ts (adversarially verified against
// the EO Notice PDF).
import "dotenv/config";

import { db } from "./index";
import { ailmentGroup, pin, claimRule, pharmacy, patient, assessment } from "./schema";
import { and, eq } from "drizzle-orm";
// Operational fixtures are always attached to the one server-configured
// pharmacy. The seed never introduces a second tenant.
import { computeRetainUntil } from "../retention";
import { requireConfiguredPharmacyId } from "../pharmacy-config";
import { seedReferenceData } from "./seed-reference";
import { EO_NOTICE_EFFECTIVE_DATE } from "../reference/minor-ailment-reference";

async function seed() {
  const pharmacyId = requireConfiguredPharmacyId();
  console.log(
    `Seeding reference data (effective ${EO_NOTICE_EFFECTIVE_DATE})...`,
  );

  // Shared with the test harness, so tests exercise this exact path. Reference
  // rows are seeded before operational rows that carry their foreign keys.
  await seedReferenceData(db);

  // Intake sessions and assessments FK to a pharmacy row; until onboarding
  // exists the app runs against this fixed placeholder pharmacy.
  await db
    .insert(pharmacy)
    .values({ id: pharmacyId, storeName: "Demo Pharmacy" })
    .onConflictDoNothing({ target: pharmacy.id });

  // Sam Child — a minor, seeded to exercise the age-18 retention branch (#7).
  // Born 2019, assessed 2026: retain_until must be 2047 (10 years after they
  // turn 18), NOT the flat service + 10 years of 2036.
  const samDob = "2019-03-15";
  const samService = new Date("2026-07-16");
  const samHealthNumber = "9999999999XZ";

  const insertedSam = await db
    .insert(patient)
    .values({
      pharmacyId,
      firstName: "Sam",
      lastName: "Child",
      dob: samDob,
      healthNumber: samHealthNumber,
      gender: "U",
    })
    .onConflictDoNothing()
    .returning({ id: patient.id });

  let samId = insertedSam[0]?.id;
  if (!samId) {
    const existing = await db.query.patient.findFirst({
      where: and(
        eq(patient.pharmacyId, pharmacyId),
        eq(patient.healthNumber, samHealthNumber),
      ),
    });
    samId = existing!.id;
  }

  await db
    .insert(assessment)
    .values({
      pharmacyId,
      patientId: samId,
      ailmentGroupCode: "RHINITIS",
      modality: "in_person",
      outcome: "no_rx_otc_or_nonpharm",
      serviceDate: samService,
      retainUntil: computeRetainUntil(samService, new Date(samDob)),
    })
    .onConflictDoNothing();

  const samAssessment = await db.query.assessment.findFirst({
    where: and(
      eq(assessment.patientId, samId),
      eq(assessment.ailmentGroupCode, "RHINITIS"),
    ),
  });
  const samRetainYear = samAssessment?.retainUntil
    ? new Date(samAssessment.retainUntil).getFullYear()
    : null;

  const [groups, pins, rules] = await Promise.all([
    db.select().from(ailmentGroup),
    db.select().from(pin),
    db.select().from(claimRule),
  ]);
  console.log(
    `Seed complete — ailment_group: ${groups.length}, pin: ${pins.length}, claim_rule: ${rules.length}`,
  );
  console.log(`Sam Child retain_until year: ${samRetainYear} (expect 2047)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
