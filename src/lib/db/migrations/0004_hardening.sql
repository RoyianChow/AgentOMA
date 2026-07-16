-- Money-rule hardening: audit-log immutability + the same-day mutex.
--
-- Drizzle does not model triggers/grants, so these live here as custom SQL.
-- Previously they were applied out-of-band by a `db:harden` script during the
-- push-era drift; folding them into the migration chain means a fresh database
-- gets them too. Idempotent, so re-running is safe.
--
-- The objects these depend on (audit_log, claim_rule, assessment) come from 0002/0003.

CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only; % is not permitted', TG_OP
    USING ERRCODE = '0A000';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_no_mutate ON audit_log;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_mutate
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
--> statement-breakpoint
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION assessment_same_day_mutex() RETURNS trigger AS $$
DECLARE
  partner text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.patient_id::text));

  FOR partner IN
    SELECT DISTINCT e.code
    FROM claim_rule r
    CROSS JOIN LATERAL jsonb_array_elements_text(r.ailment_codes) AS e(code)
    WHERE r.rule_type = 'same_day_mutex'
      AND r.ailment_codes ? NEW.ailment_group_code
      AND e.code <> NEW.ailment_group_code
  LOOP
    IF EXISTS (
      SELECT 1 FROM assessment a
      WHERE a.patient_id = NEW.patient_id
        AND a.ailment_group_code = partner
        AND a.service_date = NEW.service_date
    ) THEN
      RAISE EXCEPTION 'same_day_mutex: % conflicts with % for patient % on %',
        NEW.ailment_group_code, partner, NEW.patient_id, NEW.service_date
        USING ERRCODE = '23P01';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS assessment_same_day_mutex_trg ON assessment;
--> statement-breakpoint
CREATE TRIGGER assessment_same_day_mutex_trg
  BEFORE INSERT ON assessment
  FOR EACH ROW EXECUTE FUNCTION assessment_same_day_mutex();
