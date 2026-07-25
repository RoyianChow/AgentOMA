import "dotenv/config";

import { sql } from "drizzle-orm";

import { db } from "./index";
import { getConfiguredPharmacyId } from "../pharmacy-config";

/**
 * Read-only single-tenant preflight.
 *
 * Reports pharmacy identity plus aggregate dependent-row counts only. It does
 * not read or print patient identity, health numbers, or clinical content.
 */
async function main() {
  const configuredPharmacyId = getConfiguredPharmacyId();
  const rows = await db.execute<{
    id: string;
    store_name: string;
    patient_count: number;
    intake_count: number;
    assessment_count: number;
    audit_count: number;
    user_count: number;
    invitation_count: number;
  }>(sql`
    select
      p.id::text,
      p.store_name,
      (select count(*)::int from patient x where x.pharmacy_id = p.id)
        as patient_count,
      (select count(*)::int from intake_session x where x.pharmacy_id = p.id)
        as intake_count,
      (select count(*)::int from assessment x where x.pharmacy_id = p.id)
        as assessment_count,
      (select count(*)::int from audit_log x where x.pharmacy_id = p.id)
        as audit_count,
      (select count(*)::int from "user" x where x.pharmacy_id = p.id)
        as user_count,
      (select count(*)::int from invitation x where x.pharmacy_id = p.id)
        as invitation_count
    from pharmacy p
    order by p.created_at, p.id
  `);

  const [collisionSummary] = await db.execute<{
    repeated_health_numbers_across_pharmacies: number;
    patient_rows_in_repeated_groups: number;
  }>(sql`
    select
      count(*)::int as repeated_health_numbers_across_pharmacies,
      coalesce(sum(row_count), 0)::int as patient_rows_in_repeated_groups
    from (
      select health_number, count(*)::int as row_count
      from patient
      group by health_number
      having count(distinct pharmacy_id) > 1
    ) duplicates
  `);

  const assessmentTenantMismatches = await db.execute<{
    assessment_id: string;
    assessment_pharmacy_id: string;
    patient_pharmacy_id: string;
  }>(sql`
    select
      a.id::text as assessment_id,
      a.pharmacy_id::text as assessment_pharmacy_id,
      p.pharmacy_id::text as patient_pharmacy_id
    from assessment a
    join patient p on p.id = a.patient_id
    where a.pharmacy_id <> p.pharmacy_id
    order by a.id
  `);

  const [userBoundary] = await db.execute<{
    configured_users: number;
    foreign_or_unassigned_users: number;
  }>(sql`
    select
      count(*) filter (
        where pharmacy_id = ${configuredPharmacyId}::uuid
      )::int as configured_users,
      count(*) filter (
        where pharmacy_id is distinct from ${configuredPharmacyId}::uuid
      )::int as foreign_or_unassigned_users
    from "user"
  `);

  const clean =
    configuredPharmacyId !== null &&
    rows.length === 1 &&
    rows[0]?.id === configuredPharmacyId &&
    collisionSummary.repeated_health_numbers_across_pharmacies === 0 &&
    assessmentTenantMismatches.length === 0 &&
    userBoundary.foreign_or_unassigned_users === 0;

  console.log(
    JSON.stringify(
      {
        configuredPharmacyId,
        clean,
        pharmacies: rows,
        collisionSummary,
        assessmentTenantMismatches,
        userBoundary,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(
    "Tenancy inspection failed:",
    error instanceof Error ? error.message : "unknown database error",
  );
  process.exit(1);
});
