// Connection smoke test — queries the reference tables and prints a summary.
//
//   npm run db:verify
import "dotenv/config";

import { db } from "./index";
import { ailmentGroup, pin, claimRule } from "./schema";

async function main() {
  const groups = await db.select().from(ailmentGroup);
  const pins = await db.select().from(pin);
  const rules = await db.select().from(claimRule);

  console.log("Connected to Supabase Postgres.");
  console.log(
    `  ailment_group: ${groups.length} rows (expected 23 after seed)`,
  );
  console.log(`  pin:           ${pins.length} rows (expected 92 after seed)`);
  console.log(`  claim_rule:    ${rules.length} rows (expected 2 after seed)`);

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
