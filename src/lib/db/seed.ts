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
import { ailmentGroup, pin, claimRule } from "./schema";
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

  const [groups, pins, rules] = await Promise.all([
    db.select().from(ailmentGroup),
    db.select().from(pin),
    db.select().from(claimRule),
  ]);
  console.log(
    `Seed complete — ailment_group: ${groups.length}, pin: ${pins.length}, claim_rule: ${rules.length}`,
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
