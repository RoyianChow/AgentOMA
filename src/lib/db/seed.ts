// Idempotent reference-data seed. Loads only the single-source reference rows.
// It deliberately creates no pharmacy, patient, assessment, or other
// operational record, so it is safe to run after a reviewed production
// migration.
//
//   npm run db:seed
import "dotenv/config";

import { db } from "./index";
import { seedReferenceData } from "./seed-reference";
import { EO_NOTICE_EFFECTIVE_DATE } from "../reference/minor-ailment-reference";

async function seed() {
  console.log(
    `Seeding reference data (effective ${EO_NOTICE_EFFECTIVE_DATE})...`,
  );

  const result = await seedReferenceData(db);
  console.log(
    `Seed complete — odb_fee_tier: ${result.feeTiers}, ailment_group: ${result.groups}, pin: ${result.pins}, claim_rule: ${result.rules}`,
  );
  process.exit(0);
}

seed().catch((error) => {
  console.error("Reference seed failed:", error);
  process.exit(1);
});
