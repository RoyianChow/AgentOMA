-- Money-rule hardening. Idempotent, applied directly (npm run db:harden) because
-- the DB was built with `drizzle-kit push`, leaving drizzle's migrate tracking out
-- of sync (see the note in the PR / db-supabase-status memory). Safe to re-run.

-- ── #5  ODB fee tier + HNS account id ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'odb_fee_tier') THEN
    CREATE TYPE odb_fee_tier AS ENUM ('regular_8_83', 'rural_9_93', 'rural_12_14', 'rural_13_25');
  END IF;
END $$;

ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS hns_account_id text;
ALTER TABLE pharmacy ADD COLUMN IF NOT EXISTS odb_fee_tier odb_fee_tier NOT NULL DEFAULT 'regular_8_83';

-- ── #4  Append-only audit log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacy(id),
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Immutability as a PROPERTY, not a promise: a trigger blocks UPDATE/DELETE for
-- everyone (including the owner), and REVOKE removes the privilege from any
-- non-owner app role. Inserts remain allowed (append-only).
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only; % is not permitted', TG_OP
    USING ERRCODE = '0A000'; -- feature_not_supported
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_mutate ON audit_log;
CREATE TRIGGER audit_log_no_mutate
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;

-- ── #3  Same-day mutex (insect bites ⊕ tick bites), race-free at the DB ────────
-- The application-level check reads-then-inserts and loses a race: two
-- simultaneous inserts (insect + tick for the same patient/day) both pass.
-- This trigger takes a per-patient advisory lock for the duration of the
-- transaction, so concurrent inserts for the same patient are serialised and
-- the second one sees the first's committed row. Data-driven from claim_rule.
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
        USING ERRCODE = '23P01'; -- exclusion_violation
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assessment_same_day_mutex_trg ON assessment;
CREATE TRIGGER assessment_same_day_mutex_trg
  BEFORE INSERT ON assessment
  FOR EACH ROW EXECUTE FUNCTION assessment_same_day_mutex();
