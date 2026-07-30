CREATE TABLE "assessment_billability_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"evidence_version" integer DEFAULT 1 NOT NULL,
	"patient_self_report_status" text NOT NULL,
	"patient_self_report_approximate_count" integer,
	"patient_self_report_location" text,
	"platform_assessment_count" integer NOT NULL,
	"trailing_window_start" date NOT NULL,
	"trailing_window_end" date NOT NULL,
	"viewer_source" text NOT NULL,
	"viewer_attestation" boolean NOT NULL,
	"viewer_attested_at" timestamp with time zone NOT NULL,
	"viewer_pharmacist_id" uuid NOT NULL,
	"maximum_state" text NOT NULL,
	"self_or_family" text NOT NULL,
	"same_ailment_prescription" text NOT NULL,
	"verification_consultation" text NOT NULL,
	"identifier_type" text NOT NULL,
	"identifier_issuer" text NOT NULL,
	"identifier_number" text NOT NULL,
	"health_card_version_code" text,
	"name_exactly_as_displayed" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"document_inspected_attestation" boolean NOT NULL,
	"verifying_pharmacist_id" uuid NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"is_odb_recipient" boolean NOT NULL,
	"gender" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_billability_evidence_version_check" CHECK ("assessment_billability_evidence"."evidence_version" = 1),
	CONSTRAINT "assessment_billability_evidence_self_report_status_check" CHECK ("assessment_billability_evidence"."patient_self_report_status" IN ('no', 'yes', 'not_sure')),
	CONSTRAINT "assessment_billability_evidence_self_report_count_check" CHECK ("assessment_billability_evidence"."patient_self_report_approximate_count" IS NULL OR "assessment_billability_evidence"."patient_self_report_approximate_count" >= 0),
	CONSTRAINT "assessment_billability_evidence_self_report_location_check" CHECK ("assessment_billability_evidence"."patient_self_report_location" IS NULL OR (
        CHAR_LENGTH(BTRIM("assessment_billability_evidence"."patient_self_report_location")) BETWEEN 1 AND 200
        AND "assessment_billability_evidence"."patient_self_report_location" !~ '[[:cntrl:]]'
      )),
	CONSTRAINT "assessment_billability_evidence_platform_count_check" CHECK ("assessment_billability_evidence"."platform_assessment_count" >= 0),
	CONSTRAINT "assessment_billability_evidence_window_check" CHECK ("assessment_billability_evidence"."trailing_window_start" = ("assessment_billability_evidence"."trailing_window_end" - 365) AND "assessment_billability_evidence"."trailing_window_start" < "assessment_billability_evidence"."trailing_window_end"),
	CONSTRAINT "assessment_billability_evidence_viewer_check" CHECK ("assessment_billability_evidence"."viewer_source" IN ('ConnectingOntario', 'ClinicalConnect')
        AND "assessment_billability_evidence"."viewer_attestation" IS TRUE),
	CONSTRAINT "assessment_billability_evidence_maximum_state_check" CHECK ("assessment_billability_evidence"."maximum_state" IN ('not_confirmed_met', 'at_or_near', 'confirmed_met', 'unknown')),
	CONSTRAINT "assessment_billability_evidence_self_family_check" CHECK ("assessment_billability_evidence"."self_or_family" IN ('not_self_or_family', 'self', 'family')),
	CONSTRAINT "assessment_billability_evidence_prescription_check" CHECK ("assessment_billability_evidence"."same_ailment_prescription" IN ('none', 'fillable', 'adaptable', 'extendable', 'unresolved')
        AND "assessment_billability_evidence"."verification_consultation" IN (
          'not_required',
          'required_prescriber_reachable',
          'required_prescriber_unreachable',
          'unresolved'
        )),
	CONSTRAINT "assessment_billability_evidence_identifier_type_check" CHECK ("assessment_billability_evidence"."identifier_type" IN ('ohip_health_number', 'odb_mccss', 'odb_hccss')),
	CONSTRAINT "assessment_billability_evidence_identifier_issuer_check" CHECK (CHAR_LENGTH(BTRIM("assessment_billability_evidence"."identifier_issuer")) BETWEEN 1 AND 100
        AND "assessment_billability_evidence"."identifier_issuer" !~ '[[:cntrl:]]'),
	CONSTRAINT "assessment_billability_evidence_identifier_number_check" CHECK ((
        "assessment_billability_evidence"."identifier_type" = 'ohip_health_number'
        AND "assessment_billability_evidence"."identifier_number" ~ '^[0-9]{10}$'
        AND (
          "assessment_billability_evidence"."health_card_version_code" IS NULL
          OR "assessment_billability_evidence"."health_card_version_code" ~ '^[A-Z]{1,2}$'
        )
      ) OR (
        "assessment_billability_evidence"."identifier_type" IN ('odb_mccss', 'odb_hccss')
        AND CHAR_LENGTH(BTRIM("assessment_billability_evidence"."identifier_number")) BETWEEN 1 AND 64
        AND "assessment_billability_evidence"."identifier_number" !~ '[[:cntrl:]]'
        AND "assessment_billability_evidence"."health_card_version_code" IS NULL
      )),
	CONSTRAINT "assessment_billability_evidence_displayed_name_check" CHECK (CHAR_LENGTH(BTRIM("assessment_billability_evidence"."name_exactly_as_displayed")) BETWEEN 1 AND 200
        AND "assessment_billability_evidence"."name_exactly_as_displayed" !~ '[[:cntrl:]]'),
	CONSTRAINT "assessment_billability_evidence_document_check" CHECK ("assessment_billability_evidence"."document_inspected_attestation" IS TRUE),
	CONSTRAINT "assessment_billability_evidence_gender_check" CHECK (("assessment_billability_evidence"."gender" IS NULL OR "assessment_billability_evidence"."gender" IN ('F', 'M', 'U'))
        AND ("assessment_billability_evidence"."is_odb_recipient" OR "assessment_billability_evidence"."gender" IN ('F', 'M', 'U')))
);
--> statement-breakpoint
-- PostgreSQL requires the referenced composite key to exist before the
-- tenant-safe evidence foreign key is added below.
CREATE UNIQUE INDEX "assessment_id_pharmacy_id_unique" ON "assessment" USING btree ("id","pharmacy_id");--> statement-breakpoint
ALTER TABLE "assessment_billability_evidence" ADD CONSTRAINT "assessment_billability_evidence_viewer_pharmacist_id_user_id_fk" FOREIGN KEY ("viewer_pharmacist_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_billability_evidence" ADD CONSTRAINT "assessment_billability_evidence_verifying_pharmacist_id_user_id_fk" FOREIGN KEY ("verifying_pharmacist_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_billability_evidence" ADD CONSTRAINT "assessment_billability_evidence_tenant_fk" FOREIGN KEY ("assessment_id","pharmacy_id") REFERENCES "public"."assessment"("id","pharmacy_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_billability_evidence" ADD CONSTRAINT "assessment_billability_evidence_pharmacy_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_billability_evidence_assessment_unique" ON "assessment_billability_evidence" USING btree ("assessment_id");--> statement-breakpoint

-- Completion evidence is immutable. The only deletion path is the repository's
-- existing reviewed controlled-destruction transaction, where deleting the
-- parent assessment cascades to this one-to-one record.
CREATE OR REPLACE FUNCTION assessment_billability_evidence_immutable()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('agentoma.authorized_destruction', true) = 'on'
  THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION
    'assessment billability evidence is immutable'
    USING ERRCODE = '0A000';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER assessment_billability_evidence_no_mutate
BEFORE UPDATE OR DELETE ON assessment_billability_evidence
FOR EACH ROW EXECUTE FUNCTION assessment_billability_evidence_immutable();--> statement-breakpoint

-- Default privileges from 0011 grant future tables to the runtime role.
-- Evidence may be inserted and read, but never edited or directly deleted.
REVOKE UPDATE, DELETE
ON assessment_billability_evidence
FROM agentoma_app;
