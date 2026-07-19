-- 0011 — audit hardening (custom migration; drizzle cannot model roles/triggers)
--
-- A) retain_until backstop: the retention clock is computed IN THE DATABASE on
--    every assessment write, so a direct insert can no longer set it wrong.
--    Rule (EO Notice / PHIPA): 10 years from service, or 10 years after the
--    patient turns 18 — whichever is longer. Must match
--    src/lib/retention.ts computeRetainUntil exactly.
--
-- B) dedicated non-owner application role. The 0004 REVOKE on audit_log only
--    means something if the app does NOT connect as the table owner (owners
--    bypass their own REVOKEs). The app's runtime DATABASE_URL switches to
--    this role; migrations keep running as the owner via DIRECT_URL.

-- ─── A: retain_until enforcement ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION assessment_enforce_retain_until()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  patient_dob date;
BEGIN
  SELECT dob INTO patient_dob FROM patient WHERE id = NEW.patient_id;
  IF patient_dob IS NULL THEN
    RAISE EXCEPTION 'assessment_enforce_retain_until: patient % not found', NEW.patient_id;
  END IF;
  -- max(service + 10y, (dob + 18y) + 10y) — the age-18 branch is why a
  -- child's record outlives the flat 10-year clock.
  NEW.retain_until := GREATEST(
    (NEW.service_date + INTERVAL '10 years')::date,
    (patient_dob + INTERVAL '28 years')::date
  );
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS assessment_retain_until_trg ON assessment;
--> statement-breakpoint

CREATE TRIGGER assessment_retain_until_trg
BEFORE INSERT OR UPDATE OF service_date, patient_id, retain_until ON assessment
FOR EACH ROW EXECUTE FUNCTION assessment_enforce_retain_until();
--> statement-breakpoint

-- ─── B: non-owner application role ──────────────────────────────────────────

-- Roles are cluster-wide; the test database is rebuilt from zero each run, so
-- creation must be idempotent. No password here — passwords never belong in a
-- migration file; the operator sets it out-of-band (ALTER ROLE ... PASSWORD).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'agentoma_app') THEN
    CREATE ROLE agentoma_app LOGIN;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO agentoma_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO agentoma_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO agentoma_app;
--> statement-breakpoint

-- The property that makes the audit log an audit log: the role the app runs
-- as CANNOT modify it. (Belt: this revoke. Braces: the 0004 trigger raising
-- 0A000 for anyone who somehow can.)
REVOKE UPDATE, DELETE ON audit_log FROM agentoma_app;
--> statement-breakpoint

-- claim_draft is immutable-with-supersession: the app may flip ONLY
-- superseded_by_id, never edit or delete a draft. Column-level grant mirrors
-- the 0006 trigger at the privilege level.
REVOKE UPDATE, DELETE ON claim_draft FROM agentoma_app;
--> statement-breakpoint
GRANT UPDATE (superseded_by_id) ON claim_draft TO agentoma_app;
--> statement-breakpoint

-- Tables created by FUTURE owner-run migrations default to app access.
-- ⚠ Restrictions are opt-in: a new sensitive table must get its own REVOKEs
-- in the migration that creates it.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agentoma_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO agentoma_app;
