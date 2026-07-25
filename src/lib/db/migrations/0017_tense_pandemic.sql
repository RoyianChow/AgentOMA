-- Follow-up tracking for completed minor-ailment assessments.
--
-- This migration is intentionally forward-only: existing assessments are not
-- backfilled with invented due dates, methods, or monitoring parameters.

CREATE TABLE "follow_up" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"plan_id" uuid,
	"due_date" date NOT NULL,
	"method" text NOT NULL,
	"monitoring_parameters" text NOT NULL,
	"attempted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"reached" boolean,
	"evaluation" text,
	"next_step" text,
	"note" text,
	"recorded_by_user_id" uuid NOT NULL,
	"retain_until" date NOT NULL,
	"correction_reason" text,
	"superseded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_up_method_valid" CHECK ("follow_up"."method" IN ('phone', 'in_person')),
	CONSTRAINT "follow_up_next_step_valid" CHECK ("follow_up"."next_step" IS NULL OR "follow_up"."next_step" IN (
      'resolved', 'continue', 'refer', 'new_assessment_needed'
    )),
	CONSTRAINT "follow_up_row_shape" CHECK ((
      "follow_up"."plan_id" IS NULL
      AND "follow_up"."attempted_at" IS NULL
      AND "follow_up"."completed_at" IS NULL
      AND "follow_up"."reached" IS NULL
      AND "follow_up"."evaluation" IS NULL
      AND "follow_up"."next_step" IS NULL
    ) OR (
      "follow_up"."plan_id" IS NOT NULL
      AND "follow_up"."attempted_at" IS NOT NULL
      AND "follow_up"."reached" IS NOT NULL
      AND "follow_up"."next_step" IS NOT NULL
      AND (
        ("follow_up"."reached" = true
          AND "follow_up"."completed_at" IS NOT NULL
          AND NULLIF(BTRIM("follow_up"."evaluation"), '') IS NOT NULL)
        OR
        ("follow_up"."reached" = false
          AND "follow_up"."completed_at" IS NULL
          AND "follow_up"."evaluation" IS NULL)
      )
    ))
);
--> statement-breakpoint
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_plan_id_follow_up_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."follow_up"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_recorded_by_user_id_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_superseded_by_id_follow_up_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."follow_up"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follow_up_assessment_idx" ON "follow_up" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "follow_up_plan_idx" ON "follow_up" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "follow_up_due_date_idx" ON "follow_up" USING btree ("due_date");
--> statement-breakpoint

-- One active plan per assessment. Genuine attempts are separate child rows and
-- are not constrained to one: a pharmacist may need several attempts before
-- reaching the patient. DEFERRABLE permits insert-replacement-then-supersede in
-- one transaction while preserving the invariant at every commit boundary.
ALTER TABLE follow_up
  ADD CONSTRAINT follow_up_one_active_plan_per_assessment
  EXCLUDE USING gist (assessment_id WITH =)
  WHERE (plan_id IS NULL AND superseded_by_id IS NULL)
  DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION follow_up_validate_links()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  parent_assessment_id uuid;
  replacement follow_up%ROWTYPE;
BEGIN
  IF NEW.plan_id IS NOT NULL THEN
    SELECT assessment_id
    INTO parent_assessment_id
    FROM follow_up
    WHERE id = NEW.plan_id
      AND plan_id IS NULL
      AND superseded_by_id IS NULL;

    IF parent_assessment_id IS NULL
       OR parent_assessment_id <> NEW.assessment_id THEN
      RAISE EXCEPTION
        'follow_up attempt must reference an active plan for the same assessment'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.superseded_by_id IS NOT NULL THEN
    IF NEW.superseded_by_id = NEW.id THEN
      RAISE EXCEPTION 'follow_up cannot supersede itself'
        USING ERRCODE = '0A000';
    END IF;

    SELECT *
    INTO replacement
    FROM follow_up
    WHERE id = NEW.superseded_by_id;

    IF NOT FOUND
       OR replacement.assessment_id <> NEW.assessment_id
       OR replacement.plan_id IS DISTINCT FROM NEW.plan_id
       OR replacement.superseded_by_id IS NOT NULL THEN
      RAISE EXCEPTION
        'follow_up replacement must be active and match the original record shape'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER follow_up_validate_links_trg
BEFORE INSERT OR UPDATE ON follow_up
FOR EACH ROW EXECUTE FUNCTION follow_up_validate_links();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION follow_up_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF current_setting('agentoma.authorized_destruction', true) = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION
      'follow_up is append-only; DELETE is not permitted'
      USING ERRCODE = '0A000';
  END IF;

  -- Patient-wide retention may extend after a later service. The app role has
  -- no UPDATE privilege for retain_until; only the SECURITY DEFINER retention
  -- function enters this narrowly scoped state.
  IF current_setting('agentoma.retention_recompute', true) = 'on' THEN
    IF (
      NEW.id, NEW.assessment_id, NEW.plan_id, NEW.due_date, NEW.method,
      NEW.monitoring_parameters, NEW.attempted_at, NEW.completed_at,
      NEW.reached, NEW.evaluation, NEW.next_step, NEW.note,
      NEW.recorded_by_user_id, NEW.correction_reason, NEW.superseded_by_id,
      NEW.created_at
    ) IS DISTINCT FROM (
      OLD.id, OLD.assessment_id, OLD.plan_id, OLD.due_date, OLD.method,
      OLD.monitoring_parameters, OLD.attempted_at, OLD.completed_at,
      OLD.reached, OLD.evaluation, OLD.next_step, OLD.note,
      OLD.recorded_by_user_id, OLD.correction_reason, OLD.superseded_by_id,
      OLD.created_at
    ) THEN
      RAISE EXCEPTION
        'follow_up retention recompute may change retain_until only'
        USING ERRCODE = '0A000';
    END IF;
    RETURN NEW;
  END IF;

  IF (
    NEW.id, NEW.assessment_id, NEW.plan_id, NEW.due_date, NEW.method,
    NEW.monitoring_parameters, NEW.attempted_at, NEW.completed_at,
    NEW.reached, NEW.evaluation, NEW.next_step, NEW.note,
    NEW.recorded_by_user_id, NEW.retain_until, NEW.correction_reason,
    NEW.created_at
  ) IS DISTINCT FROM (
    OLD.id, OLD.assessment_id, OLD.plan_id, OLD.due_date, OLD.method,
    OLD.monitoring_parameters, OLD.attempted_at, OLD.completed_at,
    OLD.reached, OLD.evaluation, OLD.next_step, OLD.note,
    OLD.recorded_by_user_id, OLD.retain_until, OLD.correction_reason,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION
      'follow_up is immutable; insert a correction and supersede instead'
      USING ERRCODE = '0A000';
  END IF;

  IF OLD.superseded_by_id IS NOT NULL
     AND NEW.superseded_by_id IS DISTINCT FROM OLD.superseded_by_id THEN
    RAISE EXCEPTION
      'follow_up supersession is final; it cannot be changed or cleared'
      USING ERRCODE = '0A000';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER follow_up_no_mutate
BEFORE UPDATE OR DELETE ON follow_up
FOR EACH ROW EXECUTE FUNCTION follow_up_immutable();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION follow_up_enforce_retain_until()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT retain_until
  INTO NEW.retain_until
  FROM assessment
  WHERE id = NEW.assessment_id;

  IF NEW.retain_until IS NULL THEN
    RAISE EXCEPTION
      'follow_up_enforce_retain_until: assessment % not found',
      NEW.assessment_id
      USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER follow_up_retain_until_trg
BEFORE INSERT ON follow_up
FOR EACH ROW EXECUTE FUNCTION follow_up_enforce_retain_until();
--> statement-breakpoint

-- Replace the live patient-wide recompute function so a returning service
-- extends follow-up records along with every prior assessment.
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

  UPDATE assessment
  SET retain_until = horizon
  WHERE patient_id = target_patient_id
    AND retain_until IS DISTINCT FROM horizon;

  PERFORM set_config('agentoma.retention_recompute', 'on', true);
  UPDATE follow_up f
  SET retain_until = horizon
  FROM assessment a
  WHERE f.assessment_id = a.id
    AND a.patient_id = target_patient_id
    AND f.retain_until IS DISTINCT FROM horizon;
  PERFORM set_config('agentoma.retention_recompute', 'off', true);
END;
$$;
--> statement-breakpoint

-- The runtime role may insert/read follow-up rows and may set only the final
-- supersession link. It cannot edit or delete the clinical record.
REVOKE UPDATE, DELETE ON follow_up FROM agentoma_app;
--> statement-breakpoint
GRANT UPDATE (superseded_by_id) ON follow_up TO agentoma_app;
