CREATE TABLE "assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"pharmacist_user_id" uuid,
	"patient_id" uuid NOT NULL,
	"ailment_group_code" text NOT NULL,
	"modality" text NOT NULL,
	"virtual_location" text,
	"remote_reason" text,
	"intake_session_id" uuid,
	"outcome" text NOT NULL,
	"no_rx_rationale_code" text,
	"service_date" date NOT NULL,
	"retain_until" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"ailment_group_code" text NOT NULL,
	"trail" jsonb,
	"prior_count_self_report" integer,
	"existing_rx_self_report" text,
	"consent_captured_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"consumed_by_assessment_id" uuid,
	CONSTRAINT "intake_session_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "patient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"dob" date NOT NULL,
	"health_number" text NOT NULL,
	"gender" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_health_number_unique" UNIQUE("health_number")
);
--> statement-breakpoint
CREATE TABLE "pharmacy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triage_exit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ailment_group_code" text NOT NULL,
	"reason" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "assessments" CASCADE;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_intake_session_id_intake_session_id_fk" FOREIGN KEY ("intake_session_id") REFERENCES "public"."intake_session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_session" ADD CONSTRAINT "intake_session_pharmacy_id_pharmacy_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_one_per_day" ON "assessment" USING btree ("patient_id","ailment_group_code","service_date");