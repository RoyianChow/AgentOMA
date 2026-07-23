// Connection smoke test — queries the reference tables and prints a summary.
//
//   npm run db:verify
import "dotenv/config";

import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  ailmentGroup,
  assessment,
  claimRule,
  odbFeeTier,
  pharmacy,
  pin,
} from "./schema";

async function main() {
  const [feeTiers, groups, pins, rules, pharmacies, assessments] =
    await Promise.all([
    db.select().from(odbFeeTier),
    db.select().from(ailmentGroup),
    db.select().from(pin),
    db.select().from(claimRule),
      db
        .select({
          id: pharmacy.id,
          odbFeeTierCode: pharmacy.odbFeeTierCode,
        })
        .from(pharmacy),
      db.select({ id: assessment.id }).from(assessment),
    ]);

  console.log("Connected to Supabase Postgres.");
  console.log(`  odb_fee_tier:  ${feeTiers.length} rows (expected 4 after seed)`);
  console.log(
    `  ailment_group: ${groups.length} rows (expected 23 after seed)`,
  );
  console.log(`  pin:           ${pins.length} rows (expected 92 after seed)`);
  console.log(`  claim_rule:    ${rules.length} rows (expected 2 after seed)`);
  console.log(`  pharmacy:      ${pharmacies.length} rows`);
  console.log(`  assessment:    ${assessments.length} rows`);
  const pharmacyTierCounts = [
    ...new Set(pharmacies.map((row) => row.odbFeeTierCode)),
  ]
    .map(
      (code) =>
        `${code}=${pharmacies.filter((row) => row.odbFeeTierCode === code).length}`,
    )
    .join(", ");
  console.log(`  pharmacy tiers: ${pharmacyTierCounts}`);

  const constraints = await db.execute<{ conname: string }>(sql`
    select conname
    from pg_constraint
    where conrelid = 'assessment'::regclass
      and conname in (
        'assessment_virtual_documentation_complete',
        'assessment_ltc_provider_role_valid',
        'assessment_non_ltc_facts_null'
      )
    order by conname
  `);
  console.log(
    `  P0-D checks:    ${constraints.map((row) => row.conname).join(", ")}`,
  );

  const acne = groups.find((g) => g.code === "ACNE");
  if (acne) {
    const acnePins = pins
      .filter((p) => p.ailmentGroupId === acne.id)
      .sort((a, b) => a.pinCode.localeCompare(b.pinCode))
      .map((p) => `${p.modality}/${p.rxIssued ? "rx" : "norx"}=${p.pinCode}($${p.feeCents / 100})`);
    console.log(`  ACNE (max ${acne.maxClaimsPer365Days}/yr): ${acnePins.join(", ")}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Verify failed:", err);
  process.exit(1);
});
