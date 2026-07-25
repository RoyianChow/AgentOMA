# Backup and restore drill

**Owner:** Pharmacy privacy/security lead  
**Frequency:** At least annually and after a material backup, region, or schema change  
**Evidence table:** `restore_drill`

This drill proves that production data can be recovered without restoring into
production or moving PHI outside Canada. It is not the Docker migration test:
Docker proves schema rebuilds; this procedure proves a real backup's data,
roles, triggers, and hashes recover.

Supabase's current documentation says database backups do not include Storage
objects, custom-role passwords are not present in daily backup files, and a
restore-to-new-project copy needs manual configuration for Storage, Auth
settings/API keys, Realtime, extensions, and related project settings:

- [Database backups](https://supabase.com/docs/guides/platform/backups)
- [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project)

## Preconditions

1. Name an operator and a separate reviewer.
2. Select a backup or PITR point and record its immutable identifier/time.
3. Create an isolated Supabase project in Canadian region `ca-central-1`.
4. Deny public/network access except from the operators' approved addresses.
5. Do not connect the isolated project to production application instances,
   email delivery, webhooks, analytics, or third-party services.
6. Use fresh credentials. Never copy production `.env` files into the drill.
7. Prepare an evidence location approved for PHI. Evidence files must contain
   counts and hashes only, not rows, names, health numbers, or screenshots of
   clinical content.

## Restore

Prefer Supabase's **Restore to a New Project** workflow for physical backups or
PITR. It keeps the new project in the source region, but verify the displayed
region before continuing.

If the selected backup is a downloaded logical dump, follow Supabase's current
official restore procedure for a new isolated project. Do not invent flags from
an old runbook. Record the CLI and Postgres versions used.

Do not restore over production for a drill.

## Integrity verification

Run all checks against the isolated project through a migration-owner/direct
connection. Store only outputs that contain counts, object names, and hashes.

1. Confirm `__drizzle_migrations` reaches the same migration as production.
2. Confirm exactly one `pharmacy` row and run `npm run db:inspect-tenancy`.
3. Compare row counts for:
   `patient`, `intake_session`, `assessment`, `claim_draft`, `follow_up`,
   `audit_log`, `patient_record_retention`, `record_hold`,
   `export_manifest`, `access_correction_request`, and `record_correction`.
4. Compare deterministic aggregate hashes generated from stable identifiers
   and timestamps. Do not export clinical payloads into the evidence file.
5. Confirm these triggers exist and are enabled:
   `assessment_same_day_mutex_trg`, `audit_log_no_mutate`,
   `claim_draft_no_mutate`, `assessment_retention_recompute_trg`,
   all `*_hold_delete_guard` triggers, and the patient/assessment/intake
   immutability triggers. Also confirm `follow_up_validate_links_trg`,
   `follow_up_no_mutate`, and `follow_up_retain_until_trg`, plus the
   deferrable `follow_up_one_active_plan_per_assessment` constraint.
6. `SET ROLE agentoma_app` and verify:
   - audit UPDATE/DELETE is denied;
   - claim field mutation/DELETE is denied;
   - patient/assessment/intake/follow-up DELETE is denied;
   - ordinary follow-up field updates are denied while the final
     `superseded_by_id` correction link remains permitted;
   - authorized governance functions remain executable.
7. Verify the three preserved Demo auth users, their account/session relations,
   and TOTP rows by aggregate count only. Do not display secrets or backup
   codes.
8. Run the application smoke test against the isolated project without email,
   webhooks, or production integrations.

## Record the drill

In `/pharmacist/governance`, record:

- backup identifier;
- isolated environment identifier;
- start and completion times;
- status (`passed` or `failed`);
- aggregate row counts and integrity hashes;
- the approved evidence location.

The action writes an append-only audit event. A failed drill remains a record;
do not delete or overwrite it.

## Teardown

1. Reviewer confirms the evidence record is complete.
2. Revoke drill credentials.
3. Delete the isolated project using the provider's reviewed project-deletion
   workflow.
4. Confirm the project and temporary operator access no longer exist.
5. Record teardown confirmation in the approved evidence location.

Storage objects are outside this drill until clinical-document storage is
implemented. At that point this runbook must gain a separate Canadian-region
object inventory, restore, and hash-verification section because database
backups cover Storage metadata, not the objects themselves.
