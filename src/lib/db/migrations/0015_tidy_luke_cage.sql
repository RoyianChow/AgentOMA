-- P1-A: collapse the operational database to the configured Demo Pharmacy,
-- then make a second pharmacy row impossible.
--
-- This migration is also fresh-database safe: when pharmacy is empty (the
-- Docker from-zero path), cleanup is a no-op and the seed inserts the sole row
-- after migrations complete.

DO $$
DECLARE
  keep_pharmacy_id constant uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF EXISTS (SELECT 1 FROM pharmacy)
     AND NOT EXISTS (SELECT 1 FROM pharmacy WHERE id = keep_pharmacy_id) THEN
    RAISE EXCEPTION
      'single-tenant migration refused: Demo Pharmacy % is missing',
      keep_pharmacy_id;
  END IF;

  -- Demo users include enrolled TOTP accounts. Refuse instead of deleting or
  -- reassigning any unexpected account.
  IF EXISTS (
    SELECT 1
    FROM "user"
    WHERE pharmacy_id IS DISTINCT FROM keep_pharmacy_id
  ) THEN
    RAISE EXCEPTION
      'single-tenant migration refused: a user is not assigned to Demo Pharmacy';
  END IF;

  IF EXISTS (SELECT 1 FROM pharmacy WHERE id = keep_pharmacy_id) THEN
    -- These two records are normally immutable. The lead explicitly approved
    -- deletion of disposable TEST-tenant data; disable only their row triggers
    -- inside this migration transaction and only for the bounded rows below.
    ALTER TABLE claim_draft DISABLE TRIGGER claim_draft_no_mutate;
    ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_mutate;

    DELETE FROM claim_draft cd
    USING assessment a, patient p
    WHERE cd.assessment_id = a.id
      AND a.patient_id = p.id
      AND (
        a.pharmacy_id <> keep_pharmacy_id
        OR p.pharmacy_id <> keep_pharmacy_id
      );

    DELETE FROM audit_log al
    WHERE al.pharmacy_id <> keep_pharmacy_id
       OR (
         al.entity_type = 'assessment'
         AND EXISTS (
           SELECT 1
           FROM assessment a
           JOIN patient p ON p.id = a.patient_id
           WHERE a.id = al.entity_id
             AND (
               a.pharmacy_id <> keep_pharmacy_id
               OR p.pharmacy_id <> keep_pharmacy_id
             )
         )
       );

    DELETE FROM assessment a
    USING patient p
    WHERE a.patient_id = p.id
      AND (
        a.pharmacy_id <> keep_pharmacy_id
        OR p.pharmacy_id <> keep_pharmacy_id
      );

    DELETE FROM intake_session
    WHERE pharmacy_id <> keep_pharmacy_id;

    DELETE FROM invitation
    WHERE pharmacy_id <> keep_pharmacy_id;

    DELETE FROM patient
    WHERE pharmacy_id <> keep_pharmacy_id;

    DELETE FROM pharmacy
    WHERE id <> keep_pharmacy_id;

    ALTER TABLE claim_draft ENABLE TRIGGER claim_draft_no_mutate;
    ALTER TABLE audit_log ENABLE TRIGGER audit_log_no_mutate;
  END IF;
END
$$;
--> statement-breakpoint

ALTER TABLE "pharmacy"
  ADD COLUMN "singleton_key" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX "pharmacy_singleton_key_unique"
  ON "pharmacy" USING btree ("singleton_key");
--> statement-breakpoint

ALTER TABLE "pharmacy"
  ADD CONSTRAINT "pharmacy_singleton_key_is_one"
  CHECK ("pharmacy"."singleton_key" = 1);
