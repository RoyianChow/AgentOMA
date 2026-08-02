import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { z } from "zod";

import {
  TASK02_UPGRADE_CONTRACT,
  Task02UpgradeHarnessError,
  assertTask02UpgradeDatabaseUrl,
  createPredecessorMigrationView,
  denyTask02Upgrade,
  removeGeneratedMigrationView,
  type MigrationChainEntry,
  type MigrationChainIdentity,
} from "./predecessor-upgrade-contract";

const compareStrings = (left: string, right: string): number =>
  left.localeCompare(right, "en-US", {
    sensitivity: "variant",
    numeric: false,
  });

const fixtureCountsSchema = z
  .object({
    pharmacy_count: z.coerce.number().int().nonnegative(),
    patient_count: z.coerce.number().int().nonnegative(),
    assessment_count: z.coerce.number().int().nonnegative(),
    evidence_count: z.coerce.number().int().nonnegative(),
    evidence_table_exists: z.boolean(),
  })
  .strict();

export type Task02FixtureCounts = {
  pharmacy: number;
  patient: number;
  assessment: number;
  evidence: number;
};

export type Task02DatabaseSnapshot = {
  migrationCount: number;
  migrationHeadHash: string;
  fixtureCounts: Task02FixtureCounts;
  catalogFingerprint: string;
  catalogObjectCount: number;
};

export type Task02UpgradeDatabaseResult = {
  postgresVersion: string;
  before: Task02DatabaseSnapshot;
  after: Task02DatabaseSnapshot;
  checks: {
    sourceRowsPreserved: true;
    tenantRelationshipsPreserved: true;
    evidenceRowsRemainZero: true;
    expectedCatalogPresent: true;
    appRoleGrantContract: "INSERT_SELECT_ONLY";
  };
};

type DatabaseClient = postgres.Sql;

const identityRowSchema = z
  .object({
    database_name: z.string(),
    database_user: z.string(),
    version_num: z.string(),
    version_text: z.string(),
  })
  .strict();

const historyRowSchema = z
  .object({
    hash: z.string().regex(/^[a-f0-9]{64}$/u),
    created_at: z.coerce.number().int().positive(),
  })
  .strict();

const catalogRowSchema = z
  .object({
    kind: z.string(),
    object_name: z.string(),
    detail: z.string(),
  })
  .strict();

function hashCanonical(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

async function unsafeQuery(
  client: DatabaseClient,
  query: string,
  reason:
    | "CATALOG_DENIED"
    | "DATABASE_IDENTITY_DENIED"
    | "GRANT_DENIED"
    | "PRESERVATION_DENIED",
): Promise<unknown> {
  try {
    return await client.unsafe(query);
  } catch {
    denyTask02Upgrade(reason);
  }
}

async function readDatabaseIdentity(
  client: DatabaseClient,
): Promise<z.infer<typeof identityRowSchema>> {
  const result = await unsafeQuery(
    client,
    `select
       current_database()::text as database_name,
       current_user::text as database_user,
       current_setting('server_version_num')::text as version_num,
       version()::text as version_text`,
    "DATABASE_IDENTITY_DENIED",
  );
  const parsed = z.array(identityRowSchema).safeParse(result);
  if (!parsed.success || parsed.data.length !== 1) {
    denyTask02Upgrade("DATABASE_IDENTITY_DENIED");
  }
  return parsed.data[0];
}

async function readMigrationHistory(
  client: DatabaseClient,
): Promise<z.infer<typeof historyRowSchema>[]> {
  const existence = await unsafeQuery(
    client,
    `select to_regclass('drizzle.__drizzle_migrations')::text as relation_name`,
    "DATABASE_IDENTITY_DENIED",
  );
  const parsedExistence = z
    .array(z.object({ relation_name: z.string().nullable() }).strict())
    .safeParse(existence);
  if (!parsedExistence.success || parsedExistence.data.length !== 1) {
    denyTask02Upgrade("DATABASE_IDENTITY_DENIED");
  }
  if (parsedExistence.data[0].relation_name === null) return [];

  const result = await unsafeQuery(
    client,
    `select hash::text, created_at::text
       from drizzle.__drizzle_migrations
      order by created_at asc`,
    "DATABASE_IDENTITY_DENIED",
  );
  const parsed = z.array(historyRowSchema).safeParse(result);
  if (!parsed.success) denyTask02Upgrade("DATABASE_IDENTITY_DENIED");
  return parsed.data;
}

async function assertDatabaseIdentity(
  client: DatabaseClient,
  expectedEntries: MigrationChainEntry[],
): Promise<string> {
  const identity = await readDatabaseIdentity(client);
  if (
    identity.database_name !== TASK02_UPGRADE_CONTRACT.databaseName ||
    identity.database_user !== TASK02_UPGRADE_CONTRACT.databaseUser ||
    !identity.version_num.startsWith("16")
  ) {
    denyTask02Upgrade("DATABASE_IDENTITY_DENIED");
  }

  const history = await readMigrationHistory(client);
  if (
    history.length !== expectedEntries.length ||
    history.some(
      (row, index) =>
        row.hash !== expectedEntries[index]?.sha256 ||
        row.created_at !== expectedEntries[index]?.when,
    )
  ) {
    denyTask02Upgrade("DATABASE_IDENTITY_DENIED");
  }

  if (expectedEntries.length === 0) {
    const tables = await unsafeQuery(
      client,
      `select count(*)::int as table_count
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind in ('r', 'p')`,
      "DATABASE_IDENTITY_DENIED",
    );
    const parsedTables = z
      .array(z.object({ table_count: z.coerce.number().int() }).strict())
      .safeParse(tables);
    if (
      !parsedTables.success ||
      parsedTables.data.length !== 1 ||
      parsedTables.data[0].table_count !== 0
    ) {
      denyTask02Upgrade("DATABASE_IDENTITY_DENIED");
    }
  }

  return identity.version_text;
}

async function seedSyntheticPredecessorRows(client: DatabaseClient): Promise<void> {
  try {
    await client.begin(async (transaction) => {
      await transaction.unsafe(`
        insert into pharmacy (id, store_name)
        values (
          '02000000-0000-4000-8000-000000000001'::uuid,
          'SYNTHETIC-T02-PREDECESSOR-PHARMACY'
        )
      `);
      await transaction.unsafe(`
        insert into patient (
          id, pharmacy_id, first_name, last_name, dob, health_number, gender
        ) values (
          '02000000-0000-4000-8000-000000000002'::uuid,
          '02000000-0000-4000-8000-000000000001'::uuid,
          'SYNTHETIC-T02',
          'PREDECESSOR-ROW',
          '2000-01-01'::date,
          'SYNTHETIC-T02-NONIDENTIFIER',
          'SYNTHETIC'
        )
      `);
      await transaction.unsafe(`
        insert into assessment (
          id, pharmacy_id, patient_id, ailment_group_code, modality, outcome,
          service_date, retain_until
        ) values (
          '02000000-0000-4000-8000-000000000003'::uuid,
          '02000000-0000-4000-8000-000000000001'::uuid,
          '02000000-0000-4000-8000-000000000002'::uuid,
          'SYNTHETIC-T02-NONBILLING-GROUP',
          'SYNTHETIC-T02-NONBILLING-MODALITY',
          'SYNTHETIC-T02-NONBILLING-OUTCOME',
          '2026-07-01'::date,
          '2036-07-01'::date
        )
      `);
    });
  } catch {
    denyTask02Upgrade("SYNTHETIC_SEED_DENIED");
  }
}

async function readFixtureCounts(
  client: DatabaseClient,
  evidenceTableExpected: boolean,
): Promise<Task02FixtureCounts> {
  const evidenceExpression = evidenceTableExpected
    ? `(select count(*)::int from assessment_billability_evidence)`
    : `0`;
  const result = await unsafeQuery(
    client,
    `select
       (select count(*)::int from pharmacy) as pharmacy_count,
       (select count(*)::int from patient) as patient_count,
       (select count(*)::int from assessment) as assessment_count,
       ${evidenceExpression}::int as evidence_count,
       (to_regclass('public.assessment_billability_evidence') is not null)
         as evidence_table_exists`,
    "PRESERVATION_DENIED",
  );
  const parsed = z.array(fixtureCountsSchema).safeParse(result);
  if (!parsed.success || parsed.data.length !== 1) {
    denyTask02Upgrade("PRESERVATION_DENIED");
  }
  const row = parsed.data[0];
  if (row.evidence_table_exists !== evidenceTableExpected) {
    denyTask02Upgrade("PRESERVATION_DENIED");
  }
  return {
    pharmacy: row.pharmacy_count,
    patient: row.patient_count,
    assessment: row.assessment_count,
    evidence: row.evidence_count,
  };
}

async function readCatalogFingerprint(client: DatabaseClient): Promise<{
  fingerprint: string;
  objectCount: number;
}> {
  const result = await unsafeQuery(
    client,
    `with catalog_objects as (
       select 'relation'::text as kind, c.relname::text as object_name,
              c.relkind::text as detail
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'drizzle')
          and c.relkind in ('r', 'p', 'i', 'S', 'v', 'm')
       union all
       select 'constraint', con.conname::text, con.contype::text
         from pg_constraint con
         join pg_namespace n on n.oid = con.connamespace
        where n.nspname = 'public'
       union all
       select 'trigger', t.tgname::text, c.relname::text
         from pg_trigger t
         join pg_class c on c.oid = t.tgrelid
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and not t.tgisinternal
       union all
       select 'function', p.proname::text,
              pg_get_function_identity_arguments(p.oid)::text
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
       union all
       select 'grant', table_name::text,
              (grantee || ':' || privilege_type)::text
         from information_schema.role_table_grants
        where table_schema = 'public'
     )
     select kind, object_name, detail
       from catalog_objects
      order by kind, object_name, detail`,
    "CATALOG_DENIED",
  );
  const parsed = z.array(catalogRowSchema).safeParse(result);
  if (!parsed.success) denyTask02Upgrade("CATALOG_DENIED");
  return {
    fingerprint: hashCanonical(parsed.data),
    objectCount: parsed.data.length,
  };
}

async function readDatabaseSnapshot(
  client: DatabaseClient,
  expectedEntries: MigrationChainEntry[],
  evidenceTableExpected: boolean,
): Promise<Task02DatabaseSnapshot> {
  await assertDatabaseIdentity(client, expectedEntries);
  const [fixtureCounts, catalog] = await Promise.all([
    readFixtureCounts(client, evidenceTableExpected),
    readCatalogFingerprint(client),
  ]);
  return {
    migrationCount: expectedEntries.length,
    migrationHeadHash: expectedEntries.at(-1)?.sha256 ?? "NONE",
    fixtureCounts,
    catalogFingerprint: catalog.fingerprint,
    catalogObjectCount: catalog.objectCount,
  };
}

const expectedEvidenceConstraints = [
  "assessment_billability_evidence_displayed_name_check",
  "assessment_billability_evidence_document_check",
  "assessment_billability_evidence_gender_check",
  "assessment_billability_evidence_identifier_issuer_check",
  "assessment_billability_evidence_identifier_number_check",
  "assessment_billability_evidence_identifier_type_check",
  "assessment_billability_evidence_maximum_state_check",
  "assessment_billability_evidence_pharmacy_fk",
  "assessment_billability_evidence_platform_count_check",
  "assessment_billability_evidence_pkey",
  "assessment_billability_evidence_prescription_check",
  "assessment_billability_evidence_self_family_check",
  "assessment_billability_evidence_self_report_count_check",
  "assessment_billability_evidence_self_report_location_check",
  "assessment_billability_evidence_self_report_status_check",
  "assessment_billability_evidence_tenant_fk",
  "assessment_billability_evidence_verifying_pharmacist_id_user_id_fk",
  "assessment_billability_evidence_version_check",
  "assessment_billability_evidence_viewer_check",
  "assessment_billability_evidence_viewer_pharmacist_id_user_id_fk",
  "assessment_billability_evidence_window_check",
].sort(compareStrings);

async function assertExpectedHeadCatalog(client: DatabaseClient): Promise<void> {
  const result = await unsafeQuery(
    client,
    `select
       (to_regclass('public.assessment_billability_evidence') is not null) as evidence_table,
       (to_regclass('public.assessment_id_pharmacy_id_unique') is not null) as assessment_tenant_index,
       (to_regclass('public.assessment_billability_evidence_assessment_unique') is not null) as evidence_unique_index,
       exists (
         select 1 from pg_trigger
          where tgname = 'assessment_billability_evidence_no_mutate'
            and not tgisinternal
       ) as immutable_trigger,
       exists (
         select 1 from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            and p.proname = 'assessment_billability_evidence_immutable'
       ) as immutable_function`,
    "CATALOG_DENIED",
  );
  const checks = z
    .array(
      z
        .object({
          evidence_table: z.boolean(),
          assessment_tenant_index: z.boolean(),
          evidence_unique_index: z.boolean(),
          immutable_trigger: z.boolean(),
          immutable_function: z.boolean(),
        })
        .strict(),
    )
    .safeParse(result);
  if (
    !checks.success ||
    checks.data.length !== 1 ||
    Object.values(checks.data[0]).some((value) => value !== true)
  ) {
    denyTask02Upgrade("CATALOG_DENIED");
  }

  const constraints = await unsafeQuery(
    client,
    `select con.conname::text as constraint_name
       from pg_constraint con
       join pg_class c on c.oid = con.conrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'assessment_billability_evidence'
      order by con.conname`,
    "CATALOG_DENIED",
  );
  const parsedConstraints = z
    .array(z.object({ constraint_name: z.string() }).strict())
    .safeParse(constraints);
  if (
    !parsedConstraints.success ||
    JSON.stringify(
      parsedConstraints.data
        .map((row) => row.constraint_name)
        .sort(compareStrings),
    ) !== JSON.stringify(expectedEvidenceConstraints)
  ) {
    denyTask02Upgrade("CATALOG_DENIED");
  }

  const grants = await unsafeQuery(
    client,
    `select privilege_type::text
       from information_schema.role_table_grants
      where grantee = 'agentoma_app'
        and table_schema = 'public'
        and table_name = 'assessment_billability_evidence'
      order by privilege_type`,
    "GRANT_DENIED",
  );
  const parsedGrants = z
    .array(z.object({ privilege_type: z.string() }).strict())
    .safeParse(grants);
  if (
    !parsedGrants.success ||
    JSON.stringify(
      parsedGrants.data
        .map((row) => row.privilege_type)
        .sort(compareStrings),
    ) !== JSON.stringify(["INSERT", "SELECT"])
  ) {
    denyTask02Upgrade("GRANT_DENIED");
  }
}

async function assertPreservedRelationships(client: DatabaseClient): Promise<void> {
  const result = await unsafeQuery(
    client,
    `select
       count(*)::int as linked_count
       from assessment a
       join patient p
         on p.id = a.patient_id
        and p.pharmacy_id = a.pharmacy_id
       join pharmacy ph
         on ph.id = a.pharmacy_id`,
    "PRESERVATION_DENIED",
  );
  const parsed = z
    .array(z.object({ linked_count: z.coerce.number().int() }).strict())
    .safeParse(result);
  if (
    !parsed.success ||
    parsed.data.length !== 1 ||
    parsed.data[0].linked_count !== 1
  ) {
    denyTask02Upgrade("PRESERVATION_DENIED");
  }
}

async function migrateSafely(
  client: DatabaseClient,
  migrationsFolder: string,
): Promise<void> {
  try {
    const database = drizzle(client, { casing: "snake_case" });
    await migrate(database, { migrationsFolder });
  } catch {
    denyTask02Upgrade("MIGRATION_EXECUTION_DENIED");
  }
}

export async function runTask02PredecessorUpgrade(
  repositoryRoot: string,
  migrationIdentity: MigrationChainIdentity,
): Promise<Task02UpgradeDatabaseResult> {
  assertTask02UpgradeDatabaseUrl(TASK02_UPGRADE_CONTRACT.databaseUrl);
  const generatedView = createPredecessorMigrationView(repositoryRoot);
  const client = postgres(TASK02_UPGRADE_CONTRACT.databaseUrl, { max: 1 });

  try {
    const postgresVersion = await assertDatabaseIdentity(client, []);
    await migrateSafely(client, generatedView.folder);
    await assertDatabaseIdentity(client, migrationIdentity.entries.slice(0, 18));

    // Recheck the exact predecessor immediately before the only fixture write.
    await assertDatabaseIdentity(client, migrationIdentity.entries.slice(0, 18));
    await seedSyntheticPredecessorRows(client);
    const before = await readDatabaseSnapshot(
      client,
      migrationIdentity.entries.slice(0, 18),
      false,
    );

    // Recheck the exact predecessor again immediately before applying 0018.
    await assertDatabaseIdentity(client, migrationIdentity.entries.slice(0, 18));
    await migrateSafely(
      client,
      resolve(repositoryRoot, TASK02_UPGRADE_CONTRACT.migrationFolder),
    );

    const after = await readDatabaseSnapshot(
      client,
      migrationIdentity.entries,
      true,
    );
    await assertExpectedHeadCatalog(client);
    await assertPreservedRelationships(client);

    if (
      before.fixtureCounts.pharmacy !== 1 ||
      before.fixtureCounts.patient !== 1 ||
      before.fixtureCounts.assessment !== 1 ||
      before.fixtureCounts.evidence !== 0 ||
      JSON.stringify(after.fixtureCounts) !==
        JSON.stringify(before.fixtureCounts) ||
      after.fixtureCounts.evidence !== 0
    ) {
      denyTask02Upgrade("PRESERVATION_DENIED");
    }

    return {
      postgresVersion,
      before,
      after,
      checks: {
        sourceRowsPreserved: true,
        tenantRelationshipsPreserved: true,
        evidenceRowsRemainZero: true,
        expectedCatalogPresent: true,
        appRoleGrantContract: "INSERT_SELECT_ONLY",
      },
    };
  } catch (error: unknown) {
    if (error instanceof Task02UpgradeHarnessError) throw error;
    denyTask02Upgrade("MIGRATION_EXECUTION_DENIED");
  } finally {
    await client.end({ timeout: 5 }).catch(() => undefined);
    removeGeneratedMigrationView(generatedView.folder);
  }
}

export async function verifyTask02UpgradeAfterRestart(
  migrationIdentity: MigrationChainIdentity,
  expected: Task02DatabaseSnapshot,
): Promise<Task02DatabaseSnapshot> {
  assertTask02UpgradeDatabaseUrl(TASK02_UPGRADE_CONTRACT.databaseUrl);
  const client = postgres(TASK02_UPGRADE_CONTRACT.databaseUrl, { max: 1 });
  try {
    const afterRestart = await readDatabaseSnapshot(
      client,
      migrationIdentity.entries,
      true,
    );
    await assertExpectedHeadCatalog(client);
    await assertPreservedRelationships(client);
    if (JSON.stringify(afterRestart) !== JSON.stringify(expected)) {
      denyTask02Upgrade("RESTART_PERSISTENCE_DENIED");
    }
    return afterRestart;
  } catch (error: unknown) {
    if (error instanceof Task02UpgradeHarnessError) throw error;
    denyTask02Upgrade("RESTART_PERSISTENCE_DENIED");
  } finally {
    await client.end({ timeout: 5 }).catch(() => undefined);
  }
}
