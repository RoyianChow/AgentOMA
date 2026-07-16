// Idempotent reference-data seed. Loads the single source-of-truth reference
// file and upserts it into the versioned reference tables. Safe to re-run.
//
//   npm run db:seed
//
// PIN/fee/max values are never hardcoded here — they come from
// src/lib/reference/minor-ailment-reference.ts (adversarially verified against
// the EO Notice PDF).
import "dotenv/config";

import { db } from "./index";
import { ailmentGroup, pin, claimRule, pharmacy, patient, assessment } from "./schema";
import { and, eq } from "drizzle-orm";
import { MOCK_PHARMACY_ID } from "../constants";
import { computeRetainUntil } from "../retention";
import {
  AILMENT_GROUPS,
  CLAIM_RULES,
  EO_NOTICE_EFFECTIVE_DATE,
  feeCentsForModality,
} from "../reference/minor-ailment-reference";

async function seed() {
  console.log(
    `Seeding reference data (effective ${EO_NOTICE_EFFECTIVE_DATE})...`,
  );

  // Intake sessions and assessments FK to a pharmacy row; until onboarding
  // exists the app runs against this fixed placeholder pharmacy.
  await db
    .insert(pharmacy)
    .values({ id: MOCK_PHARMACY_ID, storeName: "Demo Pharmacy" })
    .onConflictDoNothing({ target: pharmacy.id });

  for (const group of AILMENT_GROUPS) {
    const [row] = await db
      .insert(ailmentGroup)
      .values({
        code: group.code,
        displayName: group.displayName,
        maxClaimsPer365Days: group.maxClaimsPer365Days,
        effectiveDate: EO_NOTICE_EFFECTIVE_DATE,
      })
      .onConflictDoUpdate({
        target: [ailmentGroup.code, ailmentGroup.effectiveDate],
        set: {
          displayName: group.displayName,
          maxClaimsPer365Days: group.maxClaimsPer365Days,
        },
      })
      .returning({ id: ailmentGroup.id });

    const groupId = row.id;
    const pinRows = [
      { modality: "in_person" as const, rxIssued: true, pinCode: group.pins.inPersonRxIssued },
      { modality: "in_person" as const, rxIssued: false, pinCode: group.pins.inPersonNoRx },
      { modality: "virtual" as const, rxIssued: true, pinCode: group.pins.virtualRxIssued },
      { modality: "virtual" as const, rxIssued: false, pinCode: group.pins.virtualNoRx },
    ];

    for (const p of pinRows) {
      await db
        .insert(pin)
        .values({
          ailmentGroupId: groupId,
          modality: p.modality,
          rxIssued: p.rxIssued,
          pinCode: p.pinCode,
          feeCents: feeCentsForModality(p.modality),
          effectiveDate: EO_NOTICE_EFFECTIVE_DATE,
        })
        .onConflictDoUpdate({
          target: [pin.ailmentGroupId, pin.modality, pin.rxIssued, pin.effectiveDate],
          set: { pinCode: p.pinCode, feeCents: feeCentsForModality(p.modality) },
        });
    }
  }

  for (const rule of CLAIM_RULES) {
    await db
      .insert(claimRule)
      .values({
        code: rule.code,
        ruleType: rule.type === "SAME_DAY_MUTEX" ? "same_day_mutex" : "scope_exclusion",
        description: rule.description,
        ailmentCodes: rule.ailmentCodes ?? null,
        ailmentCode: rule.ailmentCode ?? null,
        params: rule.params ?? null,
        effectiveDate: EO_NOTICE_EFFECTIVE_DATE,
      })
      .onConflictDoUpdate({
        target: claimRule.code,
        set: { description: rule.description },
      });
  }

  // Sam Child — a minor, seeded to exercise the age-18 retention branch (#7).
  // Born 2019, assessed 2026: retain_until must be 2047 (10 years after they
  // turn 18), NOT the flat service + 10 years of 2036.
  const samDob = "2019-03-15";
  const samService = new Date("2026-07-16");
  const samHealthNumber = "9999999999XZ";

  const insertedSam = await db
    .insert(patient)
    .values({
      pharmacyId: MOCK_PHARMACY_ID,
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
        eq(patient.pharmacyId, MOCK_PHARMACY_ID),
        eq(patient.healthNumber, samHealthNumber),
      ),
    });
    samId = existing!.id;
  }

  await db
    .insert(assessment)
    .values({
      pharmacyId: MOCK_PHARMACY_ID,
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
