-- P0-B: defensible clinical record and informed-consent capture.
--
-- Ownership boundary: this migration owns assessment record_version=2,
-- clinical/consent/prescription snapshots, and pharmacy practice contact.
-- P0-C owns later eligibility/completion gates and must not weaken these checks.
-- Existing records stay at version 1; version-2 writes must be complete.

ALTER TABLE "assessment" ADD COLUMN "no_rx_rationale_notes" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "record_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "consent_method" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "consent_given_by" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "consent_obtained_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "sdm_name" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "sdm_relationship" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "presenting_complaint" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "symptom_onset" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "symptom_duration" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "symptom_course" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "associated_symptoms" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "aggravating_factors" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "relieving_factors" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "treatments_tried" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "health_history" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "medication_history" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "allergies" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "assessment_findings" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "shared_decision_making" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "care_plan" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "follow_up_plan" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescribed_on" date;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_patient_address_line1" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_patient_address_line2" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_patient_city" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_patient_province" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_patient_postal_code" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_drug_name" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_strength" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_quantity" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_dose" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_frequency" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescription_route" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescriber_name" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescriber_address_line1" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescriber_address_line2" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescriber_city" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescriber_province" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescriber_postal_code" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescriber_phone" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescriber_ocp_number" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "prescriber_is_as_of_right" boolean;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "pcp_notification_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "pcp_notification_method" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "patient_choice_informed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pharmacy" ADD COLUMN "address_line1" text;--> statement-breakpoint
ALTER TABLE "pharmacy" ADD COLUMN "address_line2" text;--> statement-breakpoint
ALTER TABLE "pharmacy" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "pharmacy" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "pharmacy" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "pharmacy" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_v2_clinical_record_complete" CHECK ("assessment"."record_version" < 2 OR (
      "assessment"."consent_method" IN ('verbal', 'written')
      AND "assessment"."consent_given_by" IN ('patient', 'substitute_decision_maker')
      AND "assessment"."consent_obtained_at" IS NOT NULL
      AND ("assessment"."consent_given_by" <> 'substitute_decision_maker' OR (
        NULLIF(BTRIM("assessment"."sdm_name"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."sdm_relationship"), '') IS NOT NULL
      ))
      AND NULLIF(BTRIM("assessment"."presenting_complaint"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."symptom_onset"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."symptom_duration"), '') IS NOT NULL
      AND "assessment"."symptom_course" IN ('acute_new', 'recurrent', 'improving', 'unchanged', 'worsening', 'intermittent')
      AND NULLIF(BTRIM("assessment"."associated_symptoms"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."aggravating_factors"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."relieving_factors"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."treatments_tried"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."health_history"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."medication_history"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."allergies"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."assessment_findings"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."shared_decision_making"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."care_plan"), '') IS NOT NULL
      AND NULLIF(BTRIM("assessment"."follow_up_plan"), '') IS NOT NULL
    ));--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_v2_outcome_record_complete" CHECK ("assessment"."record_version" < 2 OR (
      ("assessment"."outcome" = 'rx_issued'
        AND "assessment"."no_rx_rationale_code" IS NULL
        AND "assessment"."prescribed_on" IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescription_patient_address_line1"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescription_patient_city"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescription_patient_province"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescription_patient_postal_code"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescription_drug_name"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescription_strength"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescription_quantity"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescription_dose"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescription_frequency"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescription_route"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescriber_name"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescriber_address_line1"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescriber_city"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescriber_province"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescriber_postal_code"), '') IS NOT NULL
        AND NULLIF(BTRIM("assessment"."prescriber_phone"), '') IS NOT NULL
        AND "assessment"."prescriber_is_as_of_right" IS NOT NULL
        AND ("assessment"."prescriber_is_as_of_right" OR NULLIF(BTRIM("assessment"."prescriber_ocp_number"), '') IS NOT NULL)
        AND "assessment"."pcp_notification_at" IS NOT NULL
        AND "assessment"."pcp_notification_method" IN ('fax', 'phone', 'secure_electronic', 'mail', 'other')
        AND "assessment"."patient_choice_informed_at" IS NOT NULL)
      OR ("assessment"."outcome" = 'no_rx_referral'
        AND "assessment"."no_rx_rationale_code" = 'referral_to_other_provider'
        AND "assessment"."prescribed_on" IS NULL)
      OR ("assessment"."outcome" = 'no_rx_otc_or_nonpharm'
        AND "assessment"."no_rx_rationale_code" IN ('otc_recommended', 'non_pharmacologic_recommended', 'otc_and_non_pharmacologic')
        AND "assessment"."prescribed_on" IS NULL)
    ));
