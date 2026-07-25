CREATE TABLE "access_correction_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"request_kind" text NOT NULL,
	"requester_type" text NOT NULL,
	"requester_description" text,
	"identity_verification_method" text NOT NULL,
	"scope" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"decision" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"fulfilled_at" timestamp with time zone,
	"handled_by_user_id" uuid,
	CONSTRAINT "access_correction_request_kind" CHECK (
    "access_correction_request"."request_kind" IN ('access', 'correction')
  ),
	CONSTRAINT "access_correction_requester_type" CHECK (
    "access_correction_request"."requester_type" IN ('patient', 'substitute_decision_maker', 'legal_representative')
  ),
	CONSTRAINT "access_correction_request_status" CHECK (
    "access_correction_request"."status" IN ('received', 'in_review', 'approved', 'partially_approved', 'denied', 'fulfilled', 'withdrawn')
  )
);
--> statement-breakpoint
CREATE TABLE "audit_write_failure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid,
	"attempted_action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"failure_code" text NOT NULL,
	"source" text DEFAULT 'server' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "destruction_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" text DEFAULT 'dry_run' NOT NULL,
	"eligible_on" date NOT NULL,
	"artifacts" jsonb NOT NULL,
	"prepared_by_user_id" uuid NOT NULL,
	"executed_by_user_id" uuid,
	"prepared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"executed_at" timestamp with time zone,
	CONSTRAINT "destruction_run_status" CHECK (
    "destruction_run"."status" IN ('dry_run', 'blocked', 'executed')
  )
);
--> statement-breakpoint
CREATE TABLE "export_manifest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"generated_by_user_id" uuid NOT NULL,
	"delivery_method" text NOT NULL,
	"artifacts" jsonb NOT NULL,
	"bundle_sha256" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "export_manifest_delivery_method" CHECK (
    "export_manifest"."delivery_method" IN ('secure_download', 'printed', 'secure_transfer', 'other')
  )
);
--> statement-breakpoint
CREATE TABLE "patient_record_retention" (
	"patient_id" uuid PRIMARY KEY NOT NULL,
	"policy_id" text NOT NULL,
	"last_service_date" date NOT NULL,
	"retain_until" date NOT NULL,
	"recomputed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record_correction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"target_entity_type" text NOT NULL,
	"target_entity_id" uuid NOT NULL,
	"patch" jsonb NOT NULL,
	"reason" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"superseded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "record_correction_target_type" CHECK (
    "record_correction"."target_entity_type" IN ('patient', 'assessment', 'claim_draft', 'intake_session')
  )
);
--> statement-breakpoint
CREATE TABLE "record_hold" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"record_type" text,
	"record_id" uuid,
	"reason" text NOT NULL,
	"authorized_by_user_id" uuid NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	"released_by_user_id" uuid,
	"release_reason" text,
	CONSTRAINT "record_hold_scope_pair" CHECK (
    ("record_hold"."record_type" IS NULL AND "record_hold"."record_id" IS NULL)
    OR ("record_hold"."record_type" IS NOT NULL AND "record_hold"."record_id" IS NOT NULL)
  ),
	CONSTRAINT "record_hold_release_complete" CHECK (
    ("record_hold"."released_at" IS NULL AND "record_hold"."released_by_user_id" IS NULL AND "record_hold"."release_reason" IS NULL)
    OR (
      "record_hold"."released_at" IS NOT NULL
      AND "record_hold"."released_by_user_id" IS NOT NULL
      AND NULLIF(BTRIM("record_hold"."release_reason"), '') IS NOT NULL
    )
  )
);
--> statement-breakpoint
CREATE TABLE "restore_drill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"backup_identifier" text NOT NULL,
	"isolated_environment" text NOT NULL,
	"status" text NOT NULL,
	"row_counts" jsonb,
	"integrity_hashes" jsonb,
	"evidence_location" text,
	"performed_by_user_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restore_drill_status" CHECK (
    "restore_drill"."status" IN ('planned', 'running', 'passed', 'failed')
  )
);
--> statement-breakpoint
CREATE TABLE "retention_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"service_years" integer NOT NULL,
	"age_of_majority" integer NOT NULL,
	"post_majority_years" integer NOT NULL,
	"effective_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retention_policy_positive_durations" CHECK (
    "retention_policy"."service_years" > 0
    AND "retention_policy"."age_of_majority" > 0
    AND "retention_policy"."post_majority_years" > 0
  )
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "patient_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "source" text DEFAULT 'server' NOT NULL;--> statement-breakpoint
ALTER TABLE "access_correction_request" ADD CONSTRAINT "access_correction_request_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_correction_request" ADD CONSTRAINT "access_correction_request_handled_by_user_id_user_id_fk" FOREIGN KEY ("handled_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_write_failure" ADD CONSTRAINT "audit_write_failure_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_write_failure" ADD CONSTRAINT "audit_write_failure_acknowledged_by_user_id_user_id_fk" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destruction_run" ADD CONSTRAINT "destruction_run_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destruction_run" ADD CONSTRAINT "destruction_run_prepared_by_user_id_user_id_fk" FOREIGN KEY ("prepared_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destruction_run" ADD CONSTRAINT "destruction_run_executed_by_user_id_user_id_fk" FOREIGN KEY ("executed_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_manifest" ADD CONSTRAINT "export_manifest_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_manifest" ADD CONSTRAINT "export_manifest_generated_by_user_id_user_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_record_retention" ADD CONSTRAINT "patient_record_retention_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_record_retention" ADD CONSTRAINT "patient_record_retention_policy_id_retention_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."retention_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_correction" ADD CONSTRAINT "record_correction_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_correction" ADD CONSTRAINT "record_correction_request_id_access_correction_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."access_correction_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_correction" ADD CONSTRAINT "record_correction_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_correction" ADD CONSTRAINT "record_correction_superseded_by_id_record_correction_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."record_correction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_hold" ADD CONSTRAINT "record_hold_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_hold" ADD CONSTRAINT "record_hold_authorized_by_user_id_user_id_fk" FOREIGN KEY ("authorized_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_hold" ADD CONSTRAINT "record_hold_released_by_user_id_user_id_fk" FOREIGN KEY ("released_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restore_drill" ADD CONSTRAINT "restore_drill_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restore_drill" ADD CONSTRAINT "restore_drill_performed_by_user_id_user_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_correction_request_patient_idx" ON "access_correction_request" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "destruction_run_one_execution" ON "destruction_run" USING btree ("id","executed_at");--> statement-breakpoint
CREATE INDEX "export_manifest_patient_idx" ON "export_manifest" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "record_correction_patient_idx" ON "record_correction" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "record_hold_patient_idx" ON "record_hold" USING btree ("patient_id");--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- P1-B governance hardening. Drizzle models the tables above; functions,
-- triggers, grants, deferrable constraints, and backfills live here because
-- they cannot be expressed faithfully in the schema DSL.

INSERT INTO retention_policy (
  id, name, service_years, age_of_majority, post_majority_years, effective_date
) VALUES (
  'phipa_10y_last_service_or_age_28',
  '10 years from last service or through age 28, whichever is later',
  10, 18, 10, '2026-07-01'
) ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION governance_retention_horizon(
  target_patient_id uuid,
  candidate_service_date date DEFAULT NULL
) RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  patient_dob date;
  last_service date;
  policy retention_policy%ROWTYPE;
BEGIN
  SELECT dob INTO patient_dob
  FROM patient
  WHERE id = target_patient_id;

  IF patient_dob IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO policy
  FROM retention_policy
  WHERE id = 'phipa_10y_last_service_or_age_28';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'retention policy is not configured'
      USING ERRCODE = '23514';
  END IF;

  SELECT GREATEST(MAX(service_date), candidate_service_date)
  INTO last_service
  FROM assessment
  WHERE patient_id = target_patient_id;

  IF last_service IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN GREATEST(
    (last_service + make_interval(years => policy.service_years))::date,
    (
      patient_dob
      + make_interval(
          years => policy.age_of_majority + policy.post_majority_years
        )
    )::date
  );
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION governance_recompute_patient_retention(
  target_patient_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  last_service date;
  horizon date;
BEGIN
  SELECT MAX(service_date)
  INTO last_service
  FROM assessment
  WHERE patient_id = target_patient_id;

  IF last_service IS NULL THEN
    DELETE FROM patient_record_retention
    WHERE patient_id = target_patient_id;
    RETURN;
  END IF;

  horizon := governance_retention_horizon(target_patient_id, last_service);

  INSERT INTO patient_record_retention (
    patient_id, policy_id, last_service_date, retain_until, recomputed_at
  ) VALUES (
    target_patient_id,
    'phipa_10y_last_service_or_age_28',
    last_service,
    horizon,
    now()
  )
  ON CONFLICT (patient_id) DO UPDATE SET
    policy_id = EXCLUDED.policy_id,
    last_service_date = EXCLUDED.last_service_date,
    retain_until = EXCLUDED.retain_until,
    recomputed_at = now();

  -- A returning patient's newest service extends every prior assessment.
  UPDATE assessment
  SET retain_until = horizon
  WHERE patient_id = target_patient_id
    AND retain_until IS DISTINCT FROM horizon;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION assessment_enforce_retain_until()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  horizon date;
BEGIN
  horizon := governance_retention_horizon(NEW.patient_id, NEW.service_date);
  IF horizon IS NULL THEN
    RAISE EXCEPTION
      'assessment_enforce_retain_until: patient % not found',
      NEW.patient_id;
  END IF;
  NEW.retain_until := horizon;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION assessment_recompute_patient_retention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM governance_recompute_patient_retention(OLD.patient_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.patient_id IS DISTINCT FROM NEW.patient_id THEN
    PERFORM governance_recompute_patient_retention(OLD.patient_id);
  END IF;
  PERFORM governance_recompute_patient_retention(NEW.patient_id);
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS assessment_retention_recompute_trg ON assessment;
--> statement-breakpoint
CREATE TRIGGER assessment_retention_recompute_trg
AFTER INSERT OR DELETE OR UPDATE OF service_date, patient_id ON assessment
FOR EACH ROW EXECUTE FUNCTION assessment_recompute_patient_retention();
--> statement-breakpoint

DO $$
DECLARE
  patient_row record;
BEGIN
  FOR patient_row IN
    SELECT DISTINCT patient_id FROM assessment
  LOOP
    PERFORM governance_recompute_patient_retention(patient_row.patient_id);
  END LOOP;
END
$$;
--> statement-breakpoint

-- Link historical audit events to patients without altering event payloads.
ALTER TABLE audit_log DISABLE TRIGGER audit_log_no_mutate;
--> statement-breakpoint
UPDATE audit_log al
SET patient_id = a.patient_id
FROM assessment a
WHERE al.patient_id IS NULL
  AND al.entity_type = 'assessment'
  AND al.entity_id = a.id;
--> statement-breakpoint
UPDATE audit_log al
SET patient_id = a.patient_id
FROM claim_draft cd
JOIN assessment a ON a.id = cd.assessment_id
WHERE al.patient_id IS NULL
  AND al.entity_type = 'claim_draft'
  AND al.entity_id = cd.id;
--> statement-breakpoint
UPDATE audit_log al
SET patient_id = p.id
FROM patient p
WHERE al.patient_id IS NULL
  AND al.entity_type = 'patient'
  AND al.entity_id = p.id;
--> statement-breakpoint
ALTER TABLE audit_log ENABLE TRIGGER audit_log_no_mutate;
--> statement-breakpoint

-- Existing clinical records become immutable. Returning-patient retention may
-- update only retain_until; all clinical corrections are overlays.
CREATE OR REPLACE FUNCTION patient_record_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('agentoma.authorized_destruction', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'patient record is immutable; use a correction overlay'
    USING ERRCODE = '0A000';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS patient_no_mutate ON patient;
--> statement-breakpoint
CREATE TRIGGER patient_no_mutate
BEFORE UPDATE OR DELETE ON patient
FOR EACH ROW EXECUTE FUNCTION patient_record_immutable();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION assessment_record_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('agentoma.authorized_destruction', true) = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'assessment record is immutable; DELETE is not permitted'
      USING ERRCODE = '0A000';
  END IF;

  IF (to_jsonb(NEW) - 'retain_until')
     IS DISTINCT FROM (to_jsonb(OLD) - 'retain_until') THEN
    RAISE EXCEPTION
      'assessment record is immutable; use a correction overlay'
      USING ERRCODE = '0A000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS assessment_no_mutate ON assessment;
--> statement-breakpoint
CREATE TRIGGER assessment_no_mutate
BEFORE UPDATE OR DELETE ON assessment
FOR EACH ROW EXECUTE FUNCTION assessment_record_immutable();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION intake_record_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('agentoma.authorized_destruction', true) = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'intake record deletion requires authorized destruction'
      USING ERRCODE = '0A000';
  END IF;

  IF (to_jsonb(NEW) - ARRAY['consumed_at', 'consumed_by_assessment_id'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['consumed_at', 'consumed_by_assessment_id'])
     OR OLD.consumed_at IS NOT NULL
     OR OLD.consumed_by_assessment_id IS NOT NULL
     OR NEW.consumed_at IS NULL
     OR NEW.consumed_by_assessment_id IS NULL THEN
    RAISE EXCEPTION
      'intake record is immutable after its one-time consumption'
      USING ERRCODE = '0A000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS intake_no_mutate ON intake_session;
--> statement-breakpoint
CREATE TRIGGER intake_no_mutate
BEFORE UPDATE OR DELETE ON intake_session
FOR EACH ROW EXECUTE FUNCTION intake_record_immutable();
--> statement-breakpoint

-- Controlled destruction is the only exception to audit/claim DELETE
-- immutability. The app role still lacks DELETE privilege and can enter this
-- state only through the SECURITY DEFINER function below.
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('agentoma.authorized_destruction', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_log is append-only; % is not permitted', TG_OP
    USING ERRCODE = '0A000';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION claim_draft_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('agentoma.authorized_destruction', true) = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION
      'claim_draft is append-only; DELETE is not permitted (supersede instead)'
      USING ERRCODE = '0A000';
  END IF;

  IF (
    NEW.id, NEW.assessment_id, NEW.ailment_group_code, NEW.modality,
    NEW.billing_modality, NEW.rx_issued, NEW.pin_code, NEW.fee_cents,
    NEW.prescriber_id_reference, NEW.prescriber_id, NEW.intervention_codes,
    NEW.carrier_id, NEW.quantity, NEW.ssc, NEW.created_at
  ) IS DISTINCT FROM (
    OLD.id, OLD.assessment_id, OLD.ailment_group_code, OLD.modality,
    OLD.billing_modality, OLD.rx_issued, OLD.pin_code, OLD.fee_cents,
    OLD.prescriber_id_reference, OLD.prescriber_id, OLD.intervention_codes,
    OLD.carrier_id, OLD.quantity, OLD.ssc, OLD.created_at
  ) THEN
    RAISE EXCEPTION
      'claim_draft is immutable; only superseded_by_id may be set'
      USING ERRCODE = '0A000';
  END IF;

  IF OLD.superseded_by_id IS NOT NULL
     AND NEW.superseded_by_id IS DISTINCT FROM OLD.superseded_by_id THEN
    RAISE EXCEPTION
      'claim_draft supersession is final; it cannot be changed or cleared'
      USING ERRCODE = '0A000';
  END IF;

  IF NEW.superseded_by_id IS NOT NULL AND NEW.superseded_by_id = NEW.id THEN
    RAISE EXCEPTION 'claim_draft cannot supersede itself'
      USING ERRCODE = '0A000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION governance_assert_no_active_hold(
  target_patient_id uuid,
  target_record_type text DEFAULT NULL,
  target_record_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM record_hold h
    WHERE h.patient_id = target_patient_id
      AND h.released_at IS NULL
      AND (
        target_record_type IS NULL
        OR h.record_type IS NULL
        OR (
          h.record_type = target_record_type
          AND h.record_id = target_record_id
        )
      )
  ) THEN
    RAISE EXCEPTION
      'record destruction blocked by active hold for patient %',
      target_patient_id
      USING ERRCODE = '55000';
  END IF;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION governance_hold_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_patient_id uuid;
  target_record_type text := TG_TABLE_NAME;
BEGIN
  IF TG_TABLE_NAME = 'patient' THEN
    target_patient_id := OLD.id;
    target_record_type := 'patient';
  ELSIF TG_TABLE_NAME = 'assessment' THEN
    target_patient_id := OLD.patient_id;
  ELSIF TG_TABLE_NAME = 'claim_draft' THEN
    SELECT a.patient_id INTO target_patient_id
    FROM assessment a
    WHERE a.id = OLD.assessment_id;
  ELSIF TG_TABLE_NAME = 'intake_session' THEN
    SELECT a.patient_id INTO target_patient_id
    FROM assessment a
    WHERE a.intake_session_id = OLD.id;
  ELSIF TG_TABLE_NAME = 'audit_log' THEN
    target_patient_id := OLD.patient_id;
  END IF;

  IF target_patient_id IS NOT NULL THEN
    PERFORM governance_assert_no_active_hold(
      target_patient_id,
      target_record_type,
      OLD.id
    );
  END IF;
  RETURN OLD;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS patient_hold_delete_guard ON patient;
--> statement-breakpoint
CREATE TRIGGER patient_hold_delete_guard
BEFORE DELETE ON patient
FOR EACH ROW EXECUTE FUNCTION governance_hold_delete_guard();
--> statement-breakpoint
DROP TRIGGER IF EXISTS assessment_hold_delete_guard ON assessment;
--> statement-breakpoint
CREATE TRIGGER assessment_hold_delete_guard
BEFORE DELETE ON assessment
FOR EACH ROW EXECUTE FUNCTION governance_hold_delete_guard();
--> statement-breakpoint
DROP TRIGGER IF EXISTS claim_draft_hold_delete_guard ON claim_draft;
--> statement-breakpoint
CREATE TRIGGER claim_draft_hold_delete_guard
BEFORE DELETE ON claim_draft
FOR EACH ROW EXECUTE FUNCTION governance_hold_delete_guard();
--> statement-breakpoint
DROP TRIGGER IF EXISTS intake_hold_delete_guard ON intake_session;
--> statement-breakpoint
CREATE TRIGGER intake_hold_delete_guard
BEFORE DELETE ON intake_session
FOR EACH ROW EXECUTE FUNCTION governance_hold_delete_guard();
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_hold_delete_guard ON audit_log;
--> statement-breakpoint
CREATE TRIGGER audit_log_hold_delete_guard
BEFORE DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION governance_hold_delete_guard();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION record_hold_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'record holds cannot be deleted'
      USING ERRCODE = '0A000';
  END IF;

  IF (
    NEW.id, NEW.pharmacy_id, NEW.patient_id, NEW.record_type, NEW.record_id,
    NEW.reason, NEW.authorized_by_user_id, NEW.starts_at
  ) IS DISTINCT FROM (
    OLD.id, OLD.pharmacy_id, OLD.patient_id, OLD.record_type, OLD.record_id,
    OLD.reason, OLD.authorized_by_user_id, OLD.starts_at
  ) OR OLD.released_at IS NOT NULL THEN
    RAISE EXCEPTION 'record hold history is immutable; only one release is allowed'
      USING ERRCODE = '0A000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER record_hold_no_mutate
BEFORE UPDATE OR DELETE ON record_hold
FOR EACH ROW EXECUTE FUNCTION record_hold_immutable();
--> statement-breakpoint

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint

ALTER TABLE record_correction
  ADD CONSTRAINT record_correction_one_active_per_target
  EXCLUDE USING gist (
    target_entity_type WITH =,
    target_entity_id WITH =
  )
  WHERE (superseded_by_id IS NULL)
  DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION record_correction_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('agentoma.authorized_destruction', true) = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'record corrections cannot be deleted'
      USING ERRCODE = '0A000';
  END IF;

  IF (to_jsonb(NEW) - 'superseded_by_id')
     IS DISTINCT FROM (to_jsonb(OLD) - 'superseded_by_id')
     OR OLD.superseded_by_id IS NOT NULL
     OR NEW.superseded_by_id IS NULL
     OR NEW.superseded_by_id = NEW.id THEN
    RAISE EXCEPTION
      'record correction is immutable; only final supersession is allowed'
      USING ERRCODE = '0A000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER record_correction_no_mutate
BEFORE UPDATE OR DELETE ON record_correction
FOR EACH ROW EXECUTE FUNCTION record_correction_immutable();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION access_correction_request_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('agentoma.authorized_destruction', true) = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'access/correction requests cannot be deleted'
      USING ERRCODE = '0A000';
  END IF;

  IF (
    NEW.id, NEW.pharmacy_id, NEW.patient_id, NEW.request_kind,
    NEW.requester_type, NEW.requester_description,
    NEW.identity_verification_method, NEW.scope, NEW.requested_at
  ) IS DISTINCT FROM (
    OLD.id, OLD.pharmacy_id, OLD.patient_id, OLD.request_kind,
    OLD.requester_type, OLD.requester_description,
    OLD.identity_verification_method, OLD.scope, OLD.requested_at
  ) THEN
    RAISE EXCEPTION
      'request identity and scope are immutable; only workflow fields may change'
      USING ERRCODE = '0A000';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER access_correction_request_no_mutate
BEFORE UPDATE OR DELETE ON access_correction_request
FOR EACH ROW EXECUTE FUNCTION access_correction_request_immutable();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION governance_execute_destruction(
  target_run_id uuid,
  executing_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  run_row destruction_run%ROWTYPE;
  retention_row patient_record_retention%ROWTYPE;
  assessment_ids uuid[];
  intake_ids uuid[];
  claim_ids uuid[];
  destruction_audit_id uuid;
BEGIN
  SELECT * INTO run_row
  FROM destruction_run
  WHERE id = target_run_id
  FOR UPDATE;

  IF NOT FOUND OR run_row.status <> 'dry_run' THEN
    RAISE EXCEPTION 'destruction requires an unexecuted dry run'
      USING ERRCODE = '55000';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM "user" u
    WHERE u.id = run_row.prepared_by_user_id
      AND u.pharmacy_id = run_row.pharmacy_id
      AND u.role = 'pharmacy_admin'
  ) OR NOT EXISTS (
    SELECT 1
    FROM "user" u
    WHERE u.id = executing_user_id
      AND u.pharmacy_id = run_row.pharmacy_id
      AND u.role = 'pharmacy_admin'
  ) THEN
    RAISE EXCEPTION 'destruction requires two active pharmacy administrators'
      USING ERRCODE = '55000';
  END IF;
  IF run_row.prepared_by_user_id = executing_user_id THEN
    RAISE EXCEPTION 'destruction requires a second pharmacy administrator'
      USING ERRCODE = '55000';
  END IF;

  SELECT * INTO retention_row
  FROM patient_record_retention
  WHERE patient_id = run_row.patient_id;

  IF NOT FOUND OR retention_row.retain_until > current_date THEN
    UPDATE destruction_run SET status = 'blocked' WHERE id = target_run_id;
    RAISE EXCEPTION 'record is not eligible for destruction'
      USING ERRCODE = '55000';
  END IF;

  PERFORM governance_assert_no_active_hold(run_row.patient_id);

  SELECT
    COALESCE(array_agg(id), ARRAY[]::uuid[]),
    COALESCE(array_agg(intake_session_id) FILTER (WHERE intake_session_id IS NOT NULL), ARRAY[]::uuid[])
  INTO assessment_ids, intake_ids
  FROM assessment
  WHERE patient_id = run_row.patient_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO claim_ids
  FROM claim_draft
  WHERE assessment_id = ANY(assessment_ids);

  -- The destruction event is written first and deliberately has no patient_id
  -- FK, so it survives the record removal.
  INSERT INTO audit_log (
    pharmacy_id, actor_user_id, action, entity_type, entity_id, source, metadata
  ) VALUES (
    run_row.pharmacy_id,
    executing_user_id,
    'record.destruction.executed',
    'patient',
    run_row.patient_id,
    'governance_function',
    jsonb_build_object('destructionRunId', run_row.id)
  )
  RETURNING id INTO destruction_audit_id;

  PERFORM set_config('agentoma.authorized_destruction', 'on', true);

  DELETE FROM claim_draft
  WHERE assessment_id = ANY(assessment_ids);

  DELETE FROM audit_log
  WHERE id <> destruction_audit_id
    AND (
      patient_id = run_row.patient_id
      OR entity_id = run_row.patient_id
      OR entity_id = ANY(assessment_ids)
      OR entity_id = ANY(intake_ids)
      OR entity_id = ANY(claim_ids)
    );

  DELETE FROM record_correction
  WHERE patient_id = run_row.patient_id;

  DELETE FROM access_correction_request
  WHERE patient_id = run_row.patient_id;

  DELETE FROM assessment
  WHERE patient_id = run_row.patient_id;

  DELETE FROM intake_session
  WHERE id = ANY(intake_ids);

  DELETE FROM patient
  WHERE id = run_row.patient_id;

  UPDATE destruction_run
  SET status = 'executed',
      executed_by_user_id = executing_user_id,
      executed_at = now()
  WHERE id = target_run_id;
END;
$$;
--> statement-breakpoint

-- App-role least privilege. No ordinary query can erase a governed record.
REVOKE DELETE ON
  patient,
  assessment,
  intake_session,
  claim_draft,
  audit_log,
  patient_record_retention,
  record_hold,
  export_manifest,
  access_correction_request,
  record_correction,
  destruction_run
FROM agentoma_app;
--> statement-breakpoint
REVOKE UPDATE ON
  patient,
  export_manifest,
  patient_record_retention,
  access_correction_request,
  record_correction,
  destruction_run,
  restore_drill
FROM agentoma_app;
--> statement-breakpoint
GRANT UPDATE (status, decision, decided_at, fulfilled_at, handled_by_user_id)
  ON access_correction_request TO agentoma_app;
--> statement-breakpoint
GRANT UPDATE (superseded_by_id) ON record_correction TO agentoma_app;
--> statement-breakpoint
REVOKE UPDATE ON record_hold FROM agentoma_app;
--> statement-breakpoint
GRANT UPDATE (released_at, released_by_user_id, release_reason)
  ON record_hold TO agentoma_app;
--> statement-breakpoint
REVOKE DELETE ON restore_drill FROM agentoma_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION governance_execute_destruction(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION governance_execute_destruction(uuid, uuid)
  TO agentoma_app;
