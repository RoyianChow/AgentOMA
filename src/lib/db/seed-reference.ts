import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { ailmentGroup, pin, claimRule } from "./schema";
import * as schema from "./schema";
import {
  AILMENT_GROUPS,
  CLAIM_RULES,
  EO_NOTICE_EFFECTIVE_DATE,
  feeCentsForModality,
} from "../reference/minor-ailment-reference";

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Upserts the versioned reference tables from the single source-of-truth file.
 * Idempotent. Shared by `npm run db:seed` and the test harness, so the tests
 * exercise the real seeding path rather than a parallel copy that could drift.
 *
 * PIN / fee / claim-maximum values are never written by hand here — they come
 * from src/lib/reference/minor-ailment-reference.ts, which was verified against
 * the EO Notice PDF.
 */
export async function seedReferenceData(db: Db): Promise<{
  groups: number;
  pins: number;
  rules: number;
}> {
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
          ailmentGroupId: row.id,
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
  return { groups: groups.length, pins: pins.length, rules: rules.length };
}
